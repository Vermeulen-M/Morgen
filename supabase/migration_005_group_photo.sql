alter table groups add column if not exists photo_url text;

drop policy if exists "groups: admin update" on groups;
create policy "groups: admin update" on groups
  for update using (is_group_admin(id) or created_by = auth.uid());

drop policy if exists "avatars: group admin insert" on storage.objects;
drop policy if exists "avatars: group admin update" on storage.objects;

create policy "avatars: group admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = 'groups'
    and is_group_admin(((storage.foldername(name))[2])::uuid));

create policy "avatars: group admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = 'groups'
    and is_group_admin(((storage.foldername(name))[2])::uuid));
