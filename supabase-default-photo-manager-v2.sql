-- BERNAUNG / DEFAULT PHOTO MANAGER V2
-- Jalankan setelah supabase-media-manager.sql.
-- 1 paket default = 8 foto: 1 pria + 1 wanita + 6 foto bersama.

create table if not exists public.default_photo_sets (
  id uuid primary key default gen_random_uuid(),
  set_key text unique,
  name text not null,
  active boolean not null default true,
  cover_photo_index integer not null default 2 check (cover_photo_index between -1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.default_photo_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.default_photo_sets(id) on delete cascade,
  slot_index integer not null check (slot_index between 0 and 7),
  image_url text,
  storage_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(set_id, slot_index)
);

insert into public.default_photo_sets(set_key,name)
values ('default1','DEFAULT'),('default2','DEFAULT ISLAMIC')
on conflict (set_key) do update set name=excluded.name, updated_at=now();

insert into public.default_photo_items(set_id,slot_index)
select s.id, gs
from public.default_photo_sets s
cross join generate_series(0,7) gs
on conflict (set_id,slot_index) do nothing;

-- Migrasikan foto tunggal dari tabel V1 bila ada. Foto lama ditempatkan ke slot 0.
update public.default_photo_items i
set image_url=p.image_url, storage_path=p.storage_path, updated_at=now()
from public.default_photos p
join public.default_photo_sets s on s.set_key=p.theme_key
where i.set_id=s.id and i.slot_index=0 and i.image_url is null and p.image_url is not null;

alter table public.orders drop constraint if exists orders_photo_mode_check;
alter table public.orders drop constraint if exists photo_mode_check;
-- Konversi nilai lama V1 ke UUID paket default baru sebelum constraint baru dipasang.
update public.orders o set photo_mode=s.id::text
from public.default_photo_sets s
where o.photo_mode='default1' and s.set_key='default1';
update public.orders o set photo_mode=s.id::text
from public.default_photo_sets s
where o.photo_mode='default2' and s.set_key='default2';
-- Nilai photo_mode sekarang menyimpan UUID set default atau 'own'.
alter table public.orders add constraint orders_photo_mode_format_check
  check (photo_mode = 'own' or photo_mode ~ '^[0-9a-fA-F-]{36}$');

alter table public.default_photo_sets enable row level security;
alter table public.default_photo_items enable row level security;

drop policy if exists default_photo_sets_public_select on public.default_photo_sets;
create policy default_photo_sets_public_select on public.default_photo_sets
for select to anon,authenticated using (active = true);

drop policy if exists default_photo_sets_admin_all on public.default_photo_sets;
create policy default_photo_sets_admin_all on public.default_photo_sets
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists default_photo_items_public_select on public.default_photo_items;
create policy default_photo_items_public_select on public.default_photo_items
for select to anon,authenticated using (active = true);

drop policy if exists default_photo_items_admin_all on public.default_photo_items;
create policy default_photo_items_admin_all on public.default_photo_items
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.default_photo_sets, public.default_photo_items to anon,authenticated;
grant all on public.default_photo_sets, public.default_photo_items to authenticated;

-- Admin membaca seluruh koleksi, termasuk slot yang belum diisi.
create or replace function public.get_default_photo_manager()
returns jsonb language sql stable security definer set search_path=public as $$
select case when public.is_admin() then coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,
  'setKey',s.set_key,
  'name',s.name,
  'active',s.active,
  'coverPhotoIndex',s.cover_photo_index,
  'items',(select coalesce(jsonb_agg(jsonb_build_object('slotIndex',i.slot_index,'imageUrl',i.image_url,'storagePath',i.storage_path,'active',i.active) order by i.slot_index),'[]'::jsonb) from public.default_photo_items i where i.set_id=s.id)
) order by s.created_at),'[]'::jsonb)
from public.default_photo_sets s) else '[]'::jsonb end;
$$;
grant execute on function public.get_default_photo_manager() to authenticated;

-- Public/manage data hanya perlu paket aktif yang memiliki foto.
create or replace function public.get_default_photo_sets_public()
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,
  'setKey',s.set_key,
  'name',s.name,
  'coverPhotoIndex',s.cover_photo_index,
  'items',(select coalesce(jsonb_agg(jsonb_build_object('slotIndex',i.slot_index,'imageUrl',i.image_url) order by i.slot_index),'[]'::jsonb) from public.default_photo_items i where i.set_id=s.id and i.active and i.image_url is not null)
) order by s.created_at),'[]'::jsonb)
from public.default_photo_sets s where s.active;
$$;
grant execute on function public.get_default_photo_sets_public() to anon,authenticated;

-- Replace invitation RPCs so default photo packages travel with the invitation data.
create or replace function public.get_public_invitation(p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'id',o.id,'groom',o.groom,'bride',o.bride,'groomNickname',o.groom_nickname,'brideNickname',o.bride_nickname,'groomInstagram',o.groom_instagram,'brideInstagram',o.bride_instagram,'groomFather',o.groom_father,'groomMother',o.groom_mother,
 'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
 'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
 'photos',o.photos,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
 'photoMode',o.photo_mode,'coverPhotoIndex',o.cover_photo_index,
 'defaultPhotos',public.get_default_photo_sets_public(),
 'templateId',o.template_id,'templateName',o.template_name,'templateCategory',o.template_category,'templateUrl',o.template_url
)
from public.orders o where o.invite_slug=p_slug and o.status='approved' limit 1;
$$;
grant execute on function public.get_public_invitation(text) to anon,authenticated;

create or replace function public.get_manage_invitation(p_manage_id text,p_secret_code text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
'id',o.id,'groom',o.groom,'bride',o.bride,'groomNickname',o.groom_nickname,'brideNickname',o.bride_nickname,'groomInstagram',o.groom_instagram,'brideInstagram',o.bride_instagram,'groomFather',o.groom_father,'groomMother',o.groom_mother,
'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
'photos',o.photos,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
'photoMode',o.photo_mode,'coverPhotoIndex',o.cover_photo_index,'defaultPhotos',public.get_default_photo_sets_public(),'templateId',o.template_id,'templateName',o.template_name,
'templateCategory',o.template_category,'templateUrl',o.template_url,'templateChangeCount',o.template_change_count,
'inviteUrl',case when o.invite_slug is not null then '/'||o.invite_slug else null end,'manageUrl','/m/'||o.manage_id)
from public.orders o where o.manage_id=p_manage_id and o.status='approved' and o.secret_code_plain=upper(trim(p_secret_code)) limit 1;
$$;
grant execute on function public.get_manage_invitation(text,text) to anon,authenticated;

-- User may choose a default set UUID as photo_mode.
create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare updated public.orders; changing_template boolean := false; next_photo_mode text;
begin
 select exists(select 1 from public.orders where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) and p_data ? 'templateId' and (p_data->>'templateId')::integer is distinct from template_id) into changing_template;
 if changing_template and (select template_change_count from public.orders where manage_id=p_manage_id) >= 2 then raise exception 'Kesempatan penggantian tema sudah habis'; end if;
 if p_data ? 'photoMode' then
   next_photo_mode:=trim(p_data->>'photoMode');
   -- UI boleh mengirim set_key (default1/default2) maupun UUID paket.
   if next_photo_mode in ('default1','default2') then
     select id::text into next_photo_mode from public.default_photo_sets where set_key=next_photo_mode and active=true limit 1;
     if next_photo_mode is null then raise exception 'Paket foto default tidak tersedia'; end if;
   elsif next_photo_mode <> 'own' then
     if next_photo_mode !~ '^[0-9a-fA-F-]{36}$' or not exists(select 1 from public.default_photo_sets where id=next_photo_mode::uuid and active) then raise exception 'Paket foto default tidak tersedia'; end if;
   end if;
 end if;
 update public.orders set
 groom=coalesce(p_data->>'groom',groom), bride=coalesce(p_data->>'bride',bride), groom_nickname=coalesce(p_data->>'groomNickname',groom_nickname), bride_nickname=coalesce(p_data->>'brideNickname',bride_nickname), groom_instagram=coalesce(p_data->>'groomInstagram',groom_instagram), bride_instagram=coalesce(p_data->>'brideInstagram',bride_instagram),
 groom_father=coalesce(p_data->>'groomFather',groom_father), groom_mother=coalesce(p_data->>'groomMother',groom_mother),
 bride_father=coalesce(p_data->>'brideFather',bride_father), bride_mother=coalesce(p_data->>'brideMother',bride_mother),
 event_type=coalesce(p_data->>'eventType',event_type), event_date=case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
 event_time=coalesce(p_data->>'time',event_time),venue=coalesce(p_data->>'venue',venue),address=coalesce(p_data->>'address',address),maps_url=coalesce(p_data->>'maps',maps_url),
 whatsapp=coalesce(p_data->>'whatsapp',whatsapp),music_url=coalesce(p_data->>'music',music_url),gift=coalesce(p_data->>'gift',gift),
 photos=case when p_data ? 'photos' then p_data->'photos' else photos end,love_story=case when p_data ? 'loveStory' then p_data->'loveStory' else love_story end,
 schedules=case when p_data ? 'schedules' then p_data->'schedules' else schedules end,accounts=case when p_data ? 'accounts' then p_data->'accounts' else accounts end,
 notes=case when p_data ? 'notes' then p_data->>'notes' else notes end,
 photo_mode=case when p_data ? 'photoMode' then next_photo_mode else photo_mode end,
 cover_photo_index=case when p_data ? 'coverPhotoIndex' then (p_data->>'coverPhotoIndex')::integer else cover_photo_index end,
 template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
 template_name=coalesce(p_data->>'templateName',template_name),template_category=coalesce(p_data->>'templateCategory',template_category),template_url=coalesce(p_data->>'templateUrl',template_url),
 template_change_count=template_change_count+case when changing_template then 1 else 0 end
 where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) returning * into updated;
 if updated.id is null then raise exception 'Manage access denied'; end if;
 return jsonb_build_object('ok',true,'manageUrl','/m/'||updated.manage_id,'inviteUrl','/'||updated.invite_slug,'templateChangeCount',updated.template_change_count);
end; $$;
grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;
