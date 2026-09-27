import {supabase, ensureSupabaseSession, getSupabaseUserId} from './supabaseClient';
import {getProfile, saveProfile} from './StorageService';

// Code d'invitation lisible à voix haute, sans caractères ambigus (pas de 0/O, 1/I).
const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateInviteCode = () => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
};

// --- Profil (créé à la demande, pas au premier lancement) -----------------

export const hasProfile = async () => {
  const profile = await getProfile();
  return !!(profile && profile.name);
};

// Upload une photo de profil vers le bucket Supabase Storage "avatars".
// Si le bucket n'existe pas encore côté projet, on n'échoue pas tout le
// profil pour ça : on log et on renvoie null (le nom seul reste valide).
export const uploadAvatarPhoto = async (localUri) => {
  try {
    const userId = await getSupabaseUserId();
    const response = await fetch(localUri);
    const blob = await response.blob();
    const path = `${userId}/avatar.jpg`;

    const {error} = await supabase.storage
      .from('avatars')
      .upload(path, blob, {contentType: 'image/jpeg', upsert: true});
    if (error) throw error;

    const {data} = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error('Avatar upload failed (le profil sera enregistré sans photo):', e);
    return null;
  }
};

export const createOrUpdateProfile = async ({name, photoUrl}) => {
  const userId = await getSupabaseUserId();

  const {data, error} = await supabase
    .from('profiles')
    .upsert({id: userId, name, photo_url: photoUrl || null})
    .select()
    .single();
  if (error) throw error;

  await saveProfile({id: userId, name, photoUrl: photoUrl || null});
  return data;
};

// --- Groupes ---------------------------------------------------------------

export const createGroup = async ({name}) => {
  await ensureSupabaseSession();
  const userId = await getSupabaseUserId();

  const {data: group, error} = await supabase
    .from('groups')
    .insert({name, created_by: userId})
    .select()
    .single();
  if (error) throw error;

  // Le créateur devient admin, membre approuvé automatiquement.
  const {error: memberError} = await supabase.from('group_members').insert({
    group_id: group.id,
    profile_id: userId,
    role: 'admin',
    status: 'approved',
  });
  if (memberError) throw memberError;

  return group;
};

export const listMyGroups = async () => {
  const userId = await getSupabaseUserId();
  const {data, error} = await supabase
    .from('group_members')
    .select('role, status, groups(id, name, created_by)')
    .eq('profile_id', userId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
};

// --- Invitations (usage unique, expirent, approbation manuelle) -----------

export const createInvite = async (groupId, {expiresInHours = 48} = {}) => {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

  const {data, error} = await supabase
    .from('group_invites')
    .insert({group_id: groupId, code, expires_at: expiresAt})
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const joinGroupWithCode = async (code) => {
  await ensureSupabaseSession();
  const userId = await getSupabaseUserId();

  const {data: invite, error: inviteError} = await supabase
    .from('group_invites')
    .select('*')
    .eq('code', code.toUpperCase())
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (inviteError) throw inviteError;
  if (!invite) {
    throw new Error('Code invalide ou expiré');
  }

  // Rejoint en statut "pending" — un admin doit approuver manuellement
  // (vérification visuelle via la photo de profil, décidée plus tôt).
  const {error: memberError} = await supabase.from('group_members').insert({
    group_id: invite.group_id,
    profile_id: userId,
    role: 'member',
    status: 'pending',
  });
  if (memberError) throw memberError;

  // Le code devient inutilisable — usage unique, ne peut pas être transféré après coup.
  await supabase
    .from('group_invites')
    .update({used_at: new Date().toISOString(), used_by: userId})
    .eq('id', invite.id);

  return invite.group_id;
};

// --- Membres et rôle admin (façon WhatsApp : multi-admin possible) --------

export const listPendingMembers = async (groupId) => {
  const {data, error} = await supabase
    .from('group_members')
    .select('profile_id, status, role, profiles(name, photo_url)')
    .eq('group_id', groupId)
    .eq('status', 'pending');
  if (error) throw error;
  return data;
};

export const listGroupMembers = async (groupId) => {
  const {data, error} = await supabase
    .from('group_members')
    .select('profile_id, role, status, profiles(name, photo_url)')
    .eq('group_id', groupId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
};

export const approveMember = async (groupId, profileId) => {
  const {error} = await supabase
    .from('group_members')
    .update({status: 'approved'})
    .eq('group_id', groupId)
    .eq('profile_id', profileId);
  if (error) throw error;
};

export const removeMember = async (groupId, profileId) => {
  const {error} = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', profileId);
  if (error) throw error;
};

export const leaveGroup = async (groupId) => {
  const userId = await getSupabaseUserId();
  await removeMember(groupId, userId);
};

export const promoteToAdmin = async (groupId, profileId) => {
  const {error} = await supabase
    .from('group_members')
    .update({role: 'admin'})
    .eq('group_id', groupId)
    .eq('profile_id', profileId);
  if (error) throw error;
};

// --- Alarmes de groupe (défi optionnel, 2 modes de fuseau horaire) --------

export const createGroupAlarm = async (groupId, {
  time, days, challenge = null, timezoneMode = 'same_instant', note = '',
}) => {
  const userId = await getSupabaseUserId();
  const {data, error} = await supabase
    .from('group_alarms')
    .insert({
      group_id: groupId,
      time,
      days,
      challenge, // null = pas de défi, comme décidé
      timezone_mode: timezoneMode, // 'same_instant' | 'local'
      note,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const listGroupAlarms = async (groupId) => {
  const {data, error} = await supabase
    .from('group_alarms')
    .select('*')
    .eq('group_id', groupId);
  if (error) throw error;
  return data;
};

// --- Visibilité passive : qui a réussi son défi, et quand -----------------

export const markAlarmComplete = async (alarmId) => {
  const userId = await getSupabaseUserId();
  const today = new Date().toISOString().slice(0, 10);

  const {error} = await supabase.from('alarm_completions').upsert({
    alarm_id: alarmId,
    profile_id: userId,
    date: today,
    completed_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const listTodayCompletions = async (alarmId) => {
  const today = new Date().toISOString().slice(0, 10);
  const {data, error} = await supabase
    .from('alarm_completions')
    .select('profile_id, completed_at, profiles(name, photo_url)')
    .eq('alarm_id', alarmId)
    .eq('date', today);
  if (error) throw error;
  return data;
};
