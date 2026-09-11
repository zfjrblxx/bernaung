-- BERNAUNG / MEDIA MANAGERS + PHOTO PREFERENCES
-- Run after supabase-v6-upgrade.sql and existing manage SQL.

create table if not exists public.music_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Romantic','Elegant','Warm','Nusantara','Modern')),
  file_url text not null,
  storage_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.default_photos (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null unique check (theme_key in ('default1','default2')),
  theme_name text not null,
  image_url text,
  storage_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.default_photos(theme_key,theme_name) values
 ('default1','Default 1'),('default2','Default 2 — Islami')
on conflict (theme_key) do nothing;

alter table public.orders add column if not exists groom_nickname text;
alter table public.orders add column if not exists bride_nickname text;
alter table public.orders add column if not exists groom_instagram text;
alter table public.orders add column if not exists bride_instagram text;

alter table public.orders add column if not exists photo_mode text not null default 'own' check (photo_mode in ('own','default1','default2'));
alter table public.orders add column if not exists cover_photo_index integer not null default -1;

alter table public.music_library enable row level security;
alter table public.default_photos enable row level security;

drop policy if exists music_public_select on public.music_library;
create policy music_public_select on public.music_library for select to anon,authenticated using (active = true);
drop policy if exists music_admin_all on public.music_library;
create policy music_admin_all on public.music_library for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists default_photos_public_select on public.default_photos;
create policy default_photos_public_select on public.default_photos for select to anon,authenticated using (active = true);
drop policy if exists default_photos_admin_all on public.default_photos;
create policy default_photos_admin_all on public.default_photos for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.music_library, public.default_photos to anon, authenticated;
grant all on public.music_library, public.default_photos to authenticated;

-- Storage bucket for admin-managed media.
insert into storage.buckets (id,name,public)
values ('bernaung-media','bernaung-media',true)
on conflict (id) do update set public=true;

drop policy if exists bernaung_media_public_read on storage.objects;
create policy bernaung_media_public_read on storage.objects for select to anon,authenticated using (bucket_id='bernaung-media');
drop policy if exists bernaung_media_admin_insert on storage.objects;
create policy bernaung_media_admin_insert on storage.objects for insert to authenticated with check (bucket_id='bernaung-media' and (select public.is_admin()));
drop policy if exists bernaung_media_admin_update on storage.objects;
create policy bernaung_media_admin_update on storage.objects for update to authenticated using (bucket_id='bernaung-media' and (select public.is_admin())) with check (bucket_id='bernaung-media' and (select public.is_admin()));
drop policy if exists bernaung_media_admin_delete on storage.objects;
create policy bernaung_media_admin_delete on storage.objects for delete to authenticated using (bucket_id='bernaung-media' and (select public.is_admin()));

create or replace function public.get_public_invitation(p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'id',o.id,'groom',o.groom,'bride',o.bride,'groomNickname',o.groom_nickname,'brideNickname',o.bride_nickname,'groomInstagram',o.groom_instagram,'brideInstagram',o.bride_instagram,'groomFather',o.groom_father,'groomMother',o.groom_mother,
 'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
 'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
 'photos',o.photos,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
 'photoMode',o.photo_mode,'coverPhotoIndex',o.cover_photo_index,
 'defaultPhotos',coalesce((select jsonb_object_agg(theme_key,image_url) from public.default_photos where active and image_url is not null),'{}'::jsonb),
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
'photoMode',o.photo_mode,'coverPhotoIndex',o.cover_photo_index,'templateId',o.template_id,'templateName',o.template_name,
'templateCategory',o.template_category,'templateUrl',o.template_url,'templateChangeCount',o.template_change_count,
'inviteUrl',case when o.invite_slug is not null then '/'||o.invite_slug else null end,'manageUrl','/m/'||o.manage_id)
from public.orders o where o.manage_id=p_manage_id and o.status='approved' and o.secret_code_plain=upper(trim(p_secret_code)) limit 1;
$$;
grant execute on function public.get_manage_invitation(text,text) to anon,authenticated;

create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare updated public.orders; changing_template boolean := false;
begin
 select exists(select 1 from public.orders where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) and p_data ? 'templateId' and (p_data->>'templateId')::integer is distinct from template_id) into changing_template;
 if changing_template and (select template_change_count from public.orders where manage_id=p_manage_id) >= 2 then raise exception 'Kesempatan penggantian tema sudah habis'; end if;
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
 photo_mode=case when p_data ? 'photoMode' then p_data->>'photoMode' else photo_mode end,
 cover_photo_index=case when p_data ? 'coverPhotoIndex' then (p_data->>'coverPhotoIndex')::integer else cover_photo_index end,
 template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
 template_name=coalesce(p_data->>'templateName',template_name),template_category=coalesce(p_data->>'templateCategory',template_category),template_url=coalesce(p_data->>'templateUrl',template_url),
 template_change_count=template_change_count+case when changing_template then 1 else 0 end
 where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) returning * into updated;
 if updated.id is null then raise exception 'Manage access denied'; end if;
 return jsonb_build_object('ok',true,'manageUrl','/m/'||updated.manage_id,'inviteUrl','/'||updated.invite_slug,'templateChangeCount',updated.template_change_count);
end; $$;
grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;
