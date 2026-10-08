import {
  supabase, ensureSupabaseSession, getSupabaseUserId, setSupabaseSession,
} from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getProfile, saveProfile} from './StorageService';
import {
  scheduleGroupAlarm, cancelGroupAlarm, getDeviceTimeZone, GROUP_MAX_SLOTS,
} from './NotificationService';

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

// --- Comptes ID + mot de passe ---------------------------------------------
// Remplace l'auth anonyme (bug RLS 42501 jamais élucidé sur "groups") par un
// vrai compte dès la création du profil : un ID unique généré + un mot de
// passe choisi par l'utilisateur. Email interne synthétique "<ID>@morgen.local"
// — Supabase a besoin d'un format email pour signUp/signInWithPassword, mais
// personne n'a besoin de connaître ni de voir cette adresse.
// Important côté Dashboard Supabase : Authentication > Providers > Email >
// "Confirm email" doit être désactivé (cette adresse ne peut jamais recevoir
// de lien de confirmation).

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus
const generateLoginId = (length = 8) => {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return id;
};

const generateRecoveryCode = () => {
  const block = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    }
    return s;
  };
  return `${block()}-${block()}-${block()}`;
};

const loginIdToEmail = (loginId) => `${loginId.trim().toUpperCase()}@morgen.local`;

// Crée un nouveau compte (ID généré + mot de passe choisi), son profil, et
// un code de secours à usage unique. Réessaie avec un nouvel ID en cas de
// collision improbable (email déjà pris). Renvoie {loginId, recoveryCode} —
// à afficher une seule fois à l'utilisateur, qui doit les noter lui-même.
export const normalizePseudo = (p) => (p || '').trim().toUpperCase();
export const isValidPseudo = (p) => /^[A-Z0-9_]{3,20}$/.test(normalizePseudo(p));

export const createAccountWithId = async ({name, photoUrl, password, pseudo, email}) => {
  const loginId = normalizePseudo(pseudo);
  if (!isValidPseudo(loginId)) {
    throw new Error('Pseudo: 3 to 20 characters, letters, digits or _ only.');
  }
  {
    const authEmail = loginIdToEmail(loginId);
    const {data, error} = await supabase.auth.signUp({email: authEmail, password});

    if (error) {
      if (/registered|already/i.test(error.message || '')) {
        throw new Error('This pseudo is already taken. Choose another one.');
      }
      throw error;
    }
    {
      setSupabaseSession(data.session);
      const userId = data.user.id;

      const {error: profileError} = await supabase
        .from('profiles')
        .upsert({id: userId, name, photo_url: photoUrl || null});
      if (profileError) throw profileError;

      // L'ID de connexion vit dans une table privée (profile_secrets), pas
      // sur profiles : les co-membres d'un groupe lisent profiles.
      const {error: secretError} = await supabase
        .from('profile_secrets')
        .insert({profile_id: userId, login_id: loginId});
      if (secretError) throw secretError;

      const recoveryCode = generateRecoveryCode();
      const {error: recoveryError} = await supabase.rpc('set_recovery_code', {
        p_recovery_code: recoveryCode,
      });
      if (recoveryError) throw recoveryError;

      await saveProfile({id: userId, name, photoUrl: photoUrl || null, loginId});

      // Email optionnel : permet de se connecter avec lui aussi.
      let emailLinked = false;
      if (email && email.trim()) {
        try {
          await supabase.auth.updateUser({email: email.trim()});
          emailLinked = true;
        } catch (e) {
          console.warn('Link email failed:', e);
        }
      }
      return {loginId, recoveryCode, emailLinked};
    }
  }
};

// Récupère l'ID de connexion du compte connecté (table privée).
const fetchOwnLoginId = async (userId) => {
  const {data} = await supabase
    .from('profile_secrets')
    .select('login_id')
    .eq('profile_id', userId)
    .maybeSingle();
  return data?.login_id ?? null;
};

export const loginWithId = async (loginId, password) => {
  const email = loginIdToEmail(loginId);
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error) throw error;
  setSupabaseSession(data.session);

  const {data: profileRow, error: profileError} = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  if (profileRow) {
    await saveProfile({
      id: profileRow.id,
      name: profileRow.name,
      photoUrl: profileRow.photo_url,
      loginId: await fetchOwnLoginId(profileRow.id),
    });
  }
  return profileRow;
};

// Mot de passe oublié : vérifie l'ID + le code de secours côté serveur (RPC
// SECURITY DEFINER, voir schema.sql) et change le mot de passe sans jamais
// nécessiter de session active. Le code est à usage unique — une fois
// consommé, pense à en régénérer un (regenerateRecoveryCode, une fois
// reconnecté) sinon un nouvel oubli de mot de passe sera impossible à
// résoudre depuis l'app.
export const resetPasswordWithRecoveryCode = async (loginId, recoveryCode, newPassword) => {
  const {data, error} = await supabase.rpc('reset_password_with_recovery_code', {
    p_login_id: loginId,
    p_recovery_code: recoveryCode,
    p_new_password: newPassword,
  });
  if (error) throw error;
  if (!data) throw new Error('ID ou code de secours incorrect.');
  return true;
};

// Génère et enregistre un nouveau code de secours pour l'utilisateur
// actuellement connecté (ex: juste après un reset, ou depuis les réglages).
export const regenerateRecoveryCode = async () => {
  const recoveryCode = generateRecoveryCode();
  const {error} = await supabase.rpc('set_recovery_code', {p_recovery_code: recoveryCode});
  if (error) throw error;
  return recoveryCode;
};

// --- Ajouter un vrai email (optionnel, en secours du couple ID+mot de passe) -
// Ne change pas l'id (auth.uid()), donc tout ce qui est déjà lié au profil
// (groupes, wellness) reste accessible. Se reconnecter ailleurs avec cet
// email restaure ce même compte — utile si la personne préfère un vrai email
// à son ID généré.

export const linkEmailToProfile = async (email, password) => {
  const {data, error} = await supabase.auth.updateUser({email, password});
  if (error) throw error;
  return data;
};

export const loginWithEmail = async (email, password) => {
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error) throw error;

  // Le cache de session doit refléter ce nouveau compte immédiatement,
  // sinon getSupabaseUserId() continuerait de renvoyer l'ancienne session
  // anonyme mise en cache sur cet appareil.
  setSupabaseSession(data.session);

  const {data: profileRow, error: profileError} = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  if (profileRow) {
    await saveProfile({
      id: profileRow.id,
      name: profileRow.name,
      photoUrl: profileRow.photo_url,
      loginId: await fetchOwnLoginId(profileRow.id),
    });
  }
  return profileRow;
};

const base64ToBytes = (b64) => {
  const binary = global.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Envoie la photo dans le bucket "avatars" (dossier = id de l'utilisateur).
// On envoie des octets (base64 fourni par le sélecteur d'images) plutôt qu'un
// blob : fetch(file://).blob() produit souvent un fichier vide en React Native.
// Lance une erreur lisible en cas d'échec (l'écran l'affiche).
export const uploadAvatarPhoto = async (localUri, base64 = null) => {
  const userId = await getSupabaseUserId();
  const path = `${userId}/avatar.jpg`;

  let body;
  if (base64) {
    body = base64ToBytes(base64);
  } else {
    const response = await fetch(localUri);
    body = await response.arrayBuffer();
  }
  if (!body || body.byteLength === 0) {
    throw new Error('The selected photo is empty — pick another one.');
  }

  const {error} = await supabase.storage
    .from('avatars')
    .upload(path, body, {contentType: 'image/jpeg', upsert: true});
  if (error) {
    throw new Error(
      error.message?.includes('Bucket not found')
        ? 'Photo storage is not set up yet (bucket "avatars" missing).'
        : error.message || 'Upload failed.',
    );
  }

  const {data} = supabase.storage.from('avatars').getPublicUrl(path);
  // Même chemin à chaque envoi : on change l'URL pour contourner le cache.
  return data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
};

export const createOrUpdateProfile = async ({name, photoUrl}) => {
  const userId = await getSupabaseUserId();

  const {data, error} = await supabase
    .from('profiles')
    .upsert({id: userId, name, photo_url: photoUrl || null})
    .select()
    .single();
  if (error) throw error;

  // On conserve le loginId local : il ne vient pas de ce formulaire et ne
  // doit pas disparaître quand on édite le nom ou la photo.
  const existing = await getProfile();
  await saveProfile({
    id: userId,
    name,
    photoUrl: photoUrl || null,
    loginId: existing?.loginId ?? null,
  });
  return data;
};

// --- Wellness profile (objectif, activité, nutrition) ---------------------
// Suit le profil (stocké sur profiles.wellness dans Supabase) plutôt que
// l'appareil, pour que quelqu'un qui a un profil retrouve ses réglages.

export const getWellnessProfile = async () => {
  const userId = await getSupabaseUserId();
  const {data, error} = await supabase
    .from('profiles')
    .select('wellness')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.wellness || {};
};

export const updateWellnessProfile = async (field, value) => {
  const current = await getWellnessProfile();
  const updated = {...current, [field]: value};
  const userId = await getSupabaseUserId();
  const {error} = await supabase
    .from('profiles')
    .update({wellness: updated})
    .eq('id', userId);
  if (error) throw error;
  return updated;
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

export const uploadGroupPhoto = async (groupId, base64) => {
  if (!base64) throw new Error('The selected photo is empty — pick another one.');
  await ensureSupabaseSession();
  const path = `groups/${groupId}/avatar.jpg`;
  const {error} = await supabase.storage
    .from('avatars')
    .upload(path, base64ToBytes(base64), {contentType: 'image/jpeg', upsert: true});
  if (error) throw new Error(error.message || 'Upload failed.');
  const {data} = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
  const {data: updated, error: updError} = await supabase
    .from('groups').update({photo_url: url}).eq('id', groupId).select('id');
  if (updError) throw updError;
  if (!updated || updated.length === 0) {
    throw new Error('Photo uploaded but not saved to the group (permission). Tell Claude.');
  }
  return url;
};

export const getGroupPhoto = async groupId => {
  const {data} = await supabase
    .from('groups').select('photo_url').eq('id', groupId).maybeSingle();
  return data?.photo_url || null;
};

export const listMyGroups = async () => {
  const userId = await getSupabaseUserId();
  const {data, error} = await supabase
    .from('group_members')
    .select('role, status, groups(id, name, created_by, photo_url)')
    .eq('profile_id', userId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
};

// Demandes envoyées, en attente d'approbation par un admin.
export const listMyPendingGroups = async () => {
  const userId = await getSupabaseUserId();
  const {data, error} = await supabase
    .from('group_members')
    .select('role, status, groups(id, name, created_by, photo_url)')
    .eq('profile_id', userId)
    .eq('status', 'pending');
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

// Rejoint en statut "pending" — un admin doit approuver manuellement
// (vérification visuelle via la photo de profil, décidée plus tôt). Tout se
// passe côté serveur (fonction join_group_with_code, voir migration_002) :
// vérification du code, usage unique et insertion sont atomiques, et personne
// ne peut s'insérer directement dans group_members.
export const joinGroupWithCode = async (code) => {
  await ensureSupabaseSession();
  const {data, error} = await supabase.rpc('join_group_with_code', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data;
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
  time, days, challenge = null, timezoneMode = 'local', timezone = null, date = null, note = '', link = null,
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
      date, // 'YYYY-MM-DD' pour une alarme unique, null = récurrente
      timezone, // fuseau IANA de l'admin (utile pour 'same_instant')
      note,
      link, // lien de réunion https:// optionnel
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


export const deleteGroupAlarm = async (alarmId) => {
  const {error} = await supabase.from('group_alarms').delete().eq('id', alarmId);
  if (error) throw error;
  await cancelGroupAlarm(alarmId);
};

// --- Synchronisation locale ------------------------------------------------
// Récupère les alarmes de tous mes groupes, reprogramme les notifications
// locales (prochaine occurrence) et annule celles qui n'existent plus.

const SYNCED_KEY = 'ac_synced_group_alarms';
const SCHEDULE_KEY = 'ac_group_alarm_schedule';

// Reprogramme uniquement ce qui a changé (alarme modifiée, fuseau de
// l'appareil changé) ou dont la fenêtre programmée est à moitié écoulée.
export const syncGroupAlarms = async () => {
  try {
    const profile = await getProfile();
    if (!profile?.id) return;
    await ensureSupabaseSession();

    const memberships = await listMyGroups();
    const all = [];
    for (const m of memberships) {
      const group = m.groups;
      if (!group) continue;
      const alarms = await listGroupAlarms(group.id);
      for (const a of alarms) all.push({alarm: a, groupName: group.name});
    }

    // Budget Android partagé entre toutes les alarmes de groupe.
    const recurring = all.filter(x => !x.alarm.date).length || 1;
    const cap = Math.max(30, Math.floor(GROUP_MAX_SLOTS / recurring));

    const deviceZone = getDeviceTimeZone();
    const stored = JSON.parse((await AsyncStorage.getItem(SCHEDULE_KEY)) || '{}');
    const next = {};
    const now = Date.now();

    for (const {alarm, groupName} of all) {
      const sig = JSON.stringify([
        alarm.time, alarm.days, alarm.date, alarm.timezone_mode, alarm.timezone,
        alarm.challenge, alarm.note, alarm.link, groupName, deviceZone, cap,
      ]);
      const prev = stored[alarm.id];
      const fresh = prev && prev.sig === sig && prev.until - now > prev.span / 2;
      if (fresh) {
        next[alarm.id] = prev;
        continue;
      }
      const {count, until} = await scheduleGroupAlarm(alarm, groupName, cap);
      next[alarm.id] = {sig, until, span: Math.max(until - now, 0), count};
    }

    for (const id of Object.keys(stored)) {
      if (!next[id]) await cancelGroupAlarm(id);
    }
    await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
    await AsyncStorage.removeItem(SYNCED_KEY);
  } catch (e) {
    // Pas de réseau / pas de session : on garde ce qui est déjà programmé.
    console.log('syncGroupAlarms skipped:', e?.message);
  }
};
