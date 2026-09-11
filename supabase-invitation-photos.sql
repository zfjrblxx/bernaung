-- Bernaung — storage foto undangan
-- Jalankan sekali di Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('invitation-photos', 'invitation-photos', true)
on conflict (id) do update set public = true;

drop policy if exists invitation_photos_anon_insert on storage.objects;
create policy invitation_photos_anon_insert
on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'invitation-photos');

drop policy if exists invitation_photos_anon_update on storage.objects;
create policy invitation_photos_anon_update
on storage.objects
for update to anon, authenticated
using (bucket_id = 'invitation-photos')
with check (bucket_id = 'invitation-photos');

drop policy if exists invitation_photos_anon_delete on storage.objects;
create policy invitation_photos_anon_delete
on storage.objects
for delete to anon, authenticated
using (bucket_id = 'invitation-photos');
