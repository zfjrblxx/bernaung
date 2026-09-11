-- BERNAUNG — PUBLIC PHOTO FIX V1
-- Jalankan sekali di Supabase SQL Editor.
-- Memastikan data foto Manage benar-benar tersedia untuk undangan publik.

alter table public.orders add column if not exists photo_mode text;
alter table public.orders add column if not exists cover_photo_index integer;

create or replace function public.get_public_invitation(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'id',o.id,
  'groom',o.groom,
  'bride',o.bride,
  'groomNickname',o.groom_nickname,
  'brideNickname',o.bride_nickname,
  'groomInstagram',o.groom_instagram,
  'brideInstagram',o.bride_instagram,
  'groomFather',o.groom_father,
  'groomMother',o.groom_mother,
  'brideFather',o.bride_father,
  'brideMother',o.bride_mother,
  'eventType',o.event_type,
  'date',o.event_date,
  'time',o.event_time,
  'venue',o.venue,
  'address',o.address,
  'maps',o.maps_url,
  'whatsapp',o.whatsapp,
  'music',o.music_url,
  'gift',o.gift,
  'photos',coalesce(o.photos,'[]'::jsonb),
  'loveStory',o.love_story,
  'schedules',o.schedules,
  'accounts',o.accounts,
  'notes',o.notes,
  'photoMode',coalesce(o.photo_mode,'own'),
  'coverPhotoIndex',coalesce(o.cover_photo_index,-1),
  'defaultPhotos',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',s.id,
      'setKey',s.set_key,
      'name',s.name,
      'coverPhotoIndex',s.cover_photo_index,
      'items',coalesce((
        select jsonb_agg(jsonb_build_object(
          'slotIndex',i.slot_index,
          'imageUrl',i.image_url
        ) order by i.slot_index)
        from public.default_photo_items i
        where i.set_id=s.id and i.active=true and i.image_url is not null
      ),'[]'::jsonb)
    ) order by s.created_at)
    from public.default_photo_sets s
    where s.active=true
  ),'[]'::jsonb),
  'templateId',o.template_id,
  'templateName',o.template_name,
  'templateCategory',o.template_category,
  'templateUrl',o.template_url
)
from public.orders o
where o.invite_slug=p_slug
  and o.status='approved'
limit 1;
$$;

grant execute on function public.get_public_invitation(text) to anon,authenticated;

-- Pastikan Manage menyimpan mode 'own' ketika upload foto dilakukan.
create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  updated public.orders;
  changing_template boolean := false;
  next_photo_mode text;
begin
  select exists(
    select 1 from public.orders
    where manage_id=p_manage_id
      and status='approved'
      and secret_code_plain=upper(trim(p_secret_code))
      and p_data ? 'templateId'
      and (p_data->>'templateId')::integer is distinct from template_id
  ) into changing_template;

  if changing_template and (select template_change_count from public.orders where manage_id=p_manage_id) >= 2 then
    raise exception 'Kesempatan penggantian tema sudah habis';
  end if;

  if p_data ? 'photoMode' then
    next_photo_mode:=trim(p_data->>'photoMode');
    if next_photo_mode in ('default1','default2') then
      select id::text into next_photo_mode
      from public.default_photo_sets
      where set_key=next_photo_mode and active=true
      limit 1;
      if next_photo_mode is null then raise exception 'Paket foto default tidak tersedia'; end if;
    elsif next_photo_mode <> 'own' then
      if next_photo_mode !~ '^[0-9a-fA-F-]{36}$'
         or not exists(select 1 from public.default_photo_sets where id=next_photo_mode::uuid and active=true) then
        raise exception 'Paket foto default tidak tersedia';
      end if;
    end if;
  end if;

  update public.orders set
    groom=coalesce(p_data->>'groom',groom),
    bride=coalesce(p_data->>'bride',bride),
    groom_nickname=coalesce(p_data->>'groomNickname',groom_nickname),
    bride_nickname=coalesce(p_data->>'brideNickname',bride_nickname),
    groom_instagram=coalesce(p_data->>'groomInstagram',groom_instagram),
    bride_instagram=coalesce(p_data->>'brideInstagram',bride_instagram),
    groom_father=coalesce(p_data->>'groomFather',groom_father),
    groom_mother=coalesce(p_data->>'groomMother',groom_mother),
    bride_father=coalesce(p_data->>'brideFather',bride_father),
    bride_mother=coalesce(p_data->>'brideMother',bride_mother),
    event_type=coalesce(p_data->>'eventType',event_type),
    event_date=case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
    event_time=coalesce(p_data->>'time',event_time),
    venue=coalesce(p_data->>'venue',venue),
    address=coalesce(p_data->>'address',address),
    maps_url=coalesce(p_data->>'maps',maps_url),
    whatsapp=coalesce(p_data->>'whatsapp',whatsapp),
    music_url=coalesce(p_data->>'music',music_url),
    gift=coalesce(p_data->>'gift',gift),
    photos=case when p_data ? 'photos' then p_data->'photos' else photos end,
    love_story=case when p_data ? 'loveStory' then p_data->'loveStory' else love_story end,
    schedules=case when p_data ? 'schedules' then p_data->'schedules' else schedules end,
    accounts=case when p_data ? 'accounts' then p_data->'accounts' else accounts end,
    notes=case when p_data ? 'notes' then p_data->>'notes' else notes end,
    photo_mode=case when p_data ? 'photoMode' then next_photo_mode else photo_mode end,
    cover_photo_index=case when p_data ? 'coverPhotoIndex' then (p_data->>'coverPhotoIndex')::integer else cover_photo_index end,
    template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
    template_name=coalesce(p_data->>'templateName',template_name),
    template_category=coalesce(p_data->>'templateCategory',template_category),
    template_url=coalesce(p_data->>'templateUrl',template_url),
    template_change_count=template_change_count+case when changing_template then 1 else 0 end
  where manage_id=p_manage_id
    and status='approved'
    and secret_code_plain=upper(trim(p_secret_code))
  returning * into updated;

  if updated.id is null then raise exception 'Manage access denied'; end if;

  return jsonb_build_object(
    'ok',true,
    'manageUrl','/m/'||updated.manage_id,
    'inviteUrl','/'||updated.invite_slug,
    'templateChangeCount',updated.template_change_count
  );
end; $$;

grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;
