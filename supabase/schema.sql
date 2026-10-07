-- Morgen — schéma Supabase pour les alarmes de groupe
-- À exécuter dans le Dashboard Supabase > SQL Editor, sur un projet neuf.

-- Profils : un par appareil (auth anonyme Supabase), pas de compte complet.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references profiles(id)
);

create table if not exists group_alarms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  time text not null, -- "HH:MM"
  days jsonb not null default '[]', -- ex: ["mon","tue",...]
  challenge text, -- null = pas de défi (optionnel, décision produit)
  timezone_mode text not null default 'same_instant' check (timezone_mode in ('same_instant', 'local')),
  note text default '',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists alarm_completions (
  alarm_id uuid not null references group_alarms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  primary key (alarm_id, profile_id, date)
);

-- Row Level Security ---------------------------------------------------

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_invites enable row level security;
alter table group_alarms enable row level security;
alter table alarm_completions enable row level security;

-- Profils : chacun lit/modifie le sien, et peut lire ceux de ses co-membres
-- de groupe (nécessaire pour afficher noms/photos dans les listes de membres).
create policy "profiles: self read/write" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles: readable by group co-members" on profiles
  for select using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.profile_id = auth.uid() and gm2.profile_id = profiles.id
    )
  );

-- Groupes : lisibles par leurs membres, créables par tout utilisateur authentifié.
create policy "groups: readable by members" on groups
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id and group_members.profile_id = auth.uid()
    )
  );

create policy "groups: creatable by authenticated users" on groups
  for insert with check (auth.uid() = created_by);

-- group_members : visibles par les co-membres. Un admin gère (approuve /
-- promeut / retire), un membre normal peut seulement se retirer lui-même.
create policy "group_members: readable by co-members" on group_members
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id and gm.profile_id = auth.uid()
    )
  );

create policy "group_members: self join" on group_members
  for insert with check (auth.uid() = profile_id);

create policy "group_members: admin manages, self leaves (update)" on group_members
  for update using (
    auth.uid() = profile_id
    or exists (
      select 1 from group_members admin_check
      where admin_check.group_id = group_members.group_id
        and admin_check.profile_id = auth.uid()
        and admin_check.role = 'admin'
        and admin_check.status = 'approved'
    )
  );

create policy "group_members: admin removes, self leaves (delete)" on group_members
  for delete using (
    auth.uid() = profile_id
    or exists (
      select 1 from group_members admin_check
      where admin_check.group_id = group_members.group_id
        and admin_check.profile_id = auth.uid()
        and admin_check.role = 'admin'
        and admin_check.status = 'approved'
    )
  );

-- group_invites : un membre approuvé crée une invitation pour son groupe ;
-- n'importe qui d'authentifié peut lire un code pour vérifier sa validité
-- et le marquer comme utilisé au moment de rejoindre (usage unique).
create policy "group_invites: members create for their group" on group_invites
  for insert with check (
    exists (
      select 1 from group_members
      where group_members.group_id = group_invites.group_id
        and group_members.profile_id = auth.uid()
        and group_members.status = 'approved'
    )
  );

create policy "group_invites: readable to check a code" on group_invites
  for select using (true);

create policy "group_invites: markable as used by joiner" on group_invites
  for update using (true);

-- group_alarms : lisibles par les membres approuvés ; seul un admin peut
-- créer/modifier/supprimer (le rôle admin façon WhatsApp décidé plus tôt).
create policy "group_alarms: readable by members" on group_alarms
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = group_alarms.group_id
        and group_members.profile_id = auth.uid()
        and group_members.status = 'approved'
    )
  );

create policy "group_alarms: admin manages" on group_alarms
  for all using (
    exists (
      select 1 from group_members
      where group_members.group_id = group_alarms.group_id
        and group_members.profile_id = auth.uid()
        and group_members.role = 'admin'
        and group_members.status = 'approved'
    )
  );

-- alarm_completions : chacun écrit sa propre complétion ; tout le monde dans
-- le groupe peut voir qui a réussi (visibilité passive, pas de notification intrusive).
create policy "alarm_completions: self write" on alarm_completions
  for insert with check (auth.uid() = profile_id);

create policy "alarm_completions: readable by group co-members" on alarm_completions
  for select using (
    exists (
      select 1 from group_alarms
      join group_members on group_members.group_id = group_alarms.group_id
      where group_alarms.id = alarm_completions.alarm_id
        and group_members.profile_id = auth.uid()
        and group_members.status = 'approved'
    )
  );

-- NB : les comptes ID + mot de passe et les policies RLS corrigées sont dans
-- supabase/migration_002_accounts_and_rls.sql (à exécuter APRÈS ce fichier).
