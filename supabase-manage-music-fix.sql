-- BERNAUNG MANAGE MUSIC COLUMN FIX
-- Run this once in Supabase when Manage shows:
--   column "music" does not exist
-- The orders table uses music_url, while the Manage RPC must expose it as JSON key "music".

create or replace function public.get_manage_invitation(p_manage_id text,p_secret_code text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
'id',o.id,'groom',o.groom,'bride',o.bride,'groomFather',o.groom_father,'groomMother',o.groom_mother,
'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
'photos',o.photos,'photoSource',o.photo_source,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
'templateId',o.template_id,'templateName',o.template_name,'templateCategory',o.template_category,'templateUrl',o.template_url,
'templateChangeCount',o.template_change_count,
'reminderEnabled',(select reminder_enabled from public.site_settings where key='general' limit 1),
'reminderDays',(select reminder_days from public.site_settings where key='general' limit 1),
'inviteUrl',case when o.invite_slug is not null then '/'||o.invite_slug else null end,
'manageUrl','/m/'||o.manage_id)
from public.orders o
where o.manage_id=p_manage_id
  and o.status='approved'
  and o.secret_code_plain=upper(trim(p_secret_code))
limit 1;
$$;
grant execute on function public.get_manage_invitation(text,text) to anon,authenticated;

create or replace function public.get_public_invitation(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
'id',o.id,'groom',o.groom,'bride',o.bride,'groomFather',o.groom_father,'groomMother',o.groom_mother,
'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
'photos',o.photos,'photoSource',o.photo_source,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
'templateId',o.template_id,'templateName',o.template_name,'templateCategory',o.template_category,'templateUrl',o.template_url)
from public.orders o
where o.invite_slug=p_slug and o.status='approved'
limit 1;
$$;
grant execute on function public.get_public_invitation(text) to anon,authenticated;
