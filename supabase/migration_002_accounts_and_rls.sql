-- Migration 002 — comptes ID + mot de passe, et correction des policies RLS.
-- À exécuter dans Dashboard > SQL Editor, APRÈS schema.sql. Idempotente :
-- on peut la rejouer sans danger.
--
-- Réglage Dashboard à faire en plus : Authentication > Providers > Email >
-- désactiver "Confirm email" (l'email interne <ID>@morgen.local ne peut
-- jamais recevoir de lien de confirmation).
--
-- Ce que corrige cette migration :
--  1. INSERT sur groups échouait en 42501 : un INSERT ... RETURNING exige
--     aussi la policy SELECT, or le créateur n'est pas encore membre au
--     moment de l'insert. (Cause probable du bug d'origine — l'auth
--     anonyme n'y était pour rien.)
--  2. Les policies de group_members se référençaient elles-mêmes
--     ("infinite recursion detected in policy"). On passe par des fonctions
--     SECURITY DEFINER qui contournent la RLS.
--  3. Un membre "pending" pouvait s'auto-approuver / se promouvoir admin, et
--     n'importe qui pouvait s'insérer admin dans un groupe. Rejoindre passe
--     maintenant par la fonction join_group_with_code().
--  4. group_invites était lisible et modifiable par tous.
--  5. alarm_completions faisait un upsert sans policy UPDATE.
--  6. L'ID de connexion et le hash du code de secours étaient exposés aux
--     co-membres : ils vivent maintenant dans une table privée.

create extension if not exists pgcrypto;

-- --- Secrets de compte (privés : visibles uniquement par leur propriétaire) -

alter table profiles drop column if exists login_id;
alter table profiles drop column if exists recovery_code_hash;

create table if not exists profile_secrets (
  profile_id uuid primary key references profiles(id) on delete cascade,
  login_id text not null unique,
  recovery_code_hash text
);

alter table profile_secrets enable row level security;

drop policy if exists "profile_secrets: self" on profile_secrets;
create policy "profile_secrets: self" on profile_secrets
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- --- Fonctions d'aide RLS (SECURITY DEFINER = pas de récursion) ------------

create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function is_group_admin(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = auth.uid()
      and role = 'admin' and status = 'approved'
  );
$$;

-- Membre en attente OU approuvé (pour qu'un candidat voie le nom du groupe).
create or replace function is_group_participant(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and profile_id = auth.uid()
  );
$$;

create or replace function shares_group_with(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from group_members me
    join group_members other on other.group_id = me.group_id
    where me.profile_id = auth.uid() and me.status = 'approved'
      and other.profile_id = pid
  );
$$;

revoke all on function is_group_member(uuid) from public;
revoke all on function is_group_admin(uuid) from public;
revoke all on function is_group_participant(uuid) from public;
revoke all on function shares_group_with(uuid) from public;
grant execute on function is_group_member(uuid) to authenticated;
grant execute on function is_group_admin(uuid) to authenticated;
grant execute on function is_group_participant(uuid) to authenticated;
grant execute on function shares_group_with(uuid) to authenticated;

-- --- Remplacement des policies ---------------------------------------------

-- profiles
drop policy if exists "profiles: readable by group co-members" on profiles;
create policy "profiles: readable by group co-members" on profiles
  for select using (shares_group_with(id));

-- groups
drop policy if exists "groups: readable by members" on groups;
drop policy if exists "groups: readable by creator or participants" on groups;
create policy "groups: readable by creator or participants" on groups
  for select using (created_by = auth.uid() or is_group_participant(id));

-- group_members
drop policy if exists "group_members: readable by co-members" on group_members;
drop policy if exists "group_members: self join" on group_members;
drop policy if exists "group_members: admin manages, self leaves (update)" on group_members;
drop policy if exists "group_members: admin removes, self leaves (delete)" on group_members;
drop policy if exists "group_members: readable by self or members" on group_members;
drop policy if exists "group_members: creator bootstraps as admin" on group_members;
drop policy if exists "group_members: admin updates" on group_members;
drop policy if exists "group_members: admin removes or self leaves" on group_members;

create policy "group_members: readable by self or members" on group_members
  for select using (profile_id = auth.uid() or is_group_member(group_id));

-- Seul le créateur du groupe peut s'insérer lui-même, en admin approuvé.
-- Tous les autres rejoignent via join_group_with_code().
create policy "group_members: creator bootstraps as admin" on group_members
  for insert with check (
    profile_id = auth.uid()
    and role = 'admin' and status = 'approved'
    and exists (
      select 1 from groups g where g.id = group_id and g.created_by = auth.uid()
    )
  );

create policy "group_members: admin updates" on group_members
  for update using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "group_members: admin removes or self leaves" on group_members
  for delete using (profile_id = auth.uid() or is_group_admin(group_id));

-- group_invites
drop policy if exists "group_invites: members create for their group" on group_invites;
drop policy if exists "group_invites: readable to check a code" on group_invites;
drop policy if exists "group_invites: markable as used by joiner" on group_invites;
drop policy if exists "group_invites: members read" on group_invites;
drop policy if exists "group_invites: members create" on group_invites;

create policy "group_invites: members read" on group_invites
  for select using (is_group_member(group_id));
create policy "group_invites: members create" on group_invites
  for insert with check (is_group_member(group_id));

-- group_alarms
drop policy if exists "group_alarms: readable by members" on group_alarms;
drop policy if exists "group_alarms: admin manages" on group_alarms;
drop policy if exists "group_alarms: members read" on group_alarms;
drop policy if exists "group_alarms: admins manage" on group_alarms;

create policy "group_alarms: members read" on group_alarms
  for select using (is_group_member(group_id));
create policy "group_alarms: admins manage" on group_alarms
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- alarm_completions
drop policy if exists "alarm_completions: self write" on alarm_completions;
drop policy if exists "alarm_completions: readable by group co-members" on alarm_completions;
drop policy if exists "alarm_completions: self insert" on alarm_completions;
drop policy if exists "alarm_completions: self update" on alarm_completions;
drop policy if exists "alarm_completions: members read" on alarm_completions;

create policy "alarm_completions: self insert" on alarm_completions
  for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1 from group_alarms a
      where a.id = alarm_id and is_group_member(a.group_id)
    )
  );
create policy "alarm_completions: self update" on alarm_completions
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "alarm_completions: members read" on alarm_completions
  for select using (
    exists (
      select 1 from group_alarms a
      where a.id = alarm_id and is_group_member(a.group_id)
    )
  );

-- --- Rejoindre un groupe avec un code (atomique, usage unique) -------------

create or replace function join_group_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite group_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into v_invite
  from group_invites
  where code = upper(p_code) and used_at is null and expires_at > now()
  for update;

  if not found then
    raise exception 'Code invalide ou expiré';
  end if;

  if exists (
    select 1 from group_members
    where group_id = v_invite.group_id and profile_id = auth.uid()
  ) then
    raise exception 'Tu fais déjà partie de ce groupe';
  end if;

  insert into group_members (group_id, profile_id, role, status)
  values (v_invite.group_id, auth.uid(), 'member', 'pending');

  update group_invites
  set used_at = now(), used_by = auth.uid()
  where id = v_invite.id;

  return v_invite.group_id;
end;
$$;

revoke all on function join_group_with_code(text) from public;
grant execute on function join_group_with_code(text) to authenticated;

-- --- Code de secours (mot de passe oublié sans vrai email) -----------------

-- Enregistre (ou remplace) le code de secours de l'utilisateur courant.
-- SECURITY INVOKER : la policy "profile_secrets: self" limite à sa propre ligne.
create or replace function set_recovery_code(p_recovery_code text)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  update profile_secrets
  set recovery_code_hash = crypt(p_recovery_code, gen_salt('bf'))
  where profile_id = auth.uid();
end;
$$;

revoke all on function set_recovery_code(text) from public;
grant execute on function set_recovery_code(text) to authenticated;

-- Réinitialise le mot de passe à partir de l'ID + du code de secours, sans
-- session active. SECURITY DEFINER volontaire : seule fonction autorisée à
-- écrire dans auth.users, et seulement après vérification du hash. Renvoie
-- un simple booléen (aucun détail sur ce qui a échoué). Le code est à usage
-- unique : effacé après un reset réussi.
create or replace function reset_password_with_recovery_code(
  p_login_id text, p_recovery_code text, p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_profile_id uuid;
  v_hash text;
begin
  select profile_id, recovery_code_hash into v_profile_id, v_hash
  from profile_secrets
  where login_id = upper(trim(p_login_id));

  if v_profile_id is null or v_hash is null then
    return false;
  end if;

  if crypt(upper(trim(p_recovery_code)), v_hash) <> v_hash then
    return false;
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  where id = v_profile_id;

  update profile_secrets set recovery_code_hash = null where profile_id = v_profile_id;

  return true;
end;
$$;

revoke all on function reset_password_with_recovery_code(text, text, text) from public;
grant execute on function reset_password_with_recovery_code(text, text, text) to anon, authenticated;

-- --- Photos de profil (bucket "avatars") -----------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: owner insert" on storage.objects;
drop policy if exists "avatars: owner update" on storage.objects;

create policy "avatars: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
