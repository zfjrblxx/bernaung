-- BERNAUNG MANAGE MUSIC COLUMN FIX V3
-- Run this AFTER the existing Bernaung migrations.
-- Fixes every Manage/public RPC that could reference the old `music` column.
-- The actual orders column is `music_url`; the JSON API key remains `music`.

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

create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare updated public.orders;
begin
  update public.orders set
    groom=coalesce(p_data->>'groom',groom), bride=coalesce(p_data->>'bride',bride),
    groom_father=coalesce(p_data->>'groomFather',groom_father), groom_mother=coalesce(p_data->>'groomMother',groom_mother),
    bride_father=coalesce(p_data->>'brideFather',bride_father), bride_mother=coalesce(p_data->>'brideMother',bride_mother),
    event_type=coalesce(p_data->>'eventType',event_type),
    event_date=case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
    event_time=coalesce(p_data->>'time',event_time), venue=coalesce(p_data->>'venue',venue),
    address=coalesce(p_data->>'address',address), maps_url=coalesce(p_data->>'maps',maps_url),
    whatsapp=coalesce(p_data->>'whatsapp',whatsapp), music_url=coalesce(p_data->>'music',music_url),
    gift=coalesce(p_data->>'gift',gift), photos=case when p_data ? 'photos' then p_data->'photos' else photos end,
    photo_source=case when p_data ? 'photoSource' then coalesce(nullif(p_data->>'photoSource',''),'default') else photo_source end,
    love_story=case when p_data ? 'loveStory' then p_data->'loveStory' else love_story end,
    schedules=case when p_data ? 'schedules' then p_data->'schedules' else schedules end,
    accounts=case when p_data ? 'accounts' then p_data->'accounts' else accounts end,
    notes=case when p_data ? 'notes' then p_data->>'notes' else notes end,
    template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
    template_name=coalesce(p_data->>'templateName',template_name),
    template_category=coalesce(p_data->>'templateCategory',template_category),
    template_url=coalesce(p_data->>'templateUrl',template_url)
  where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code))
  returning * into updated;

  if updated.id is null then raise exception 'Manage access denied'; end if;
  return jsonb_build_object('ok',true,'manageUrl','/m/'||updated.manage_id,'inviteUrl','/'||updated.invite_slug);
end;
$$;
grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;
