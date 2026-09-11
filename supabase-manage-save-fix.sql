-- BERNAUNG — MANAGE SAVE FIX
-- Jalankan setelah tabel orders + default_photo_sets/default_photo_items tersedia.
-- Tidak menggunakan tabel legacy default_photos.

alter table public.orders add column if not exists love_story jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists schedules jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists accounts jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists photo_mode text;
alter table public.orders add column if not exists cover_photo_index integer;
alter table public.orders add column if not exists template_change_count integer not null default 0;

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

      if next_photo_mode is null then
        raise exception 'Paket foto default tidak tersedia';
      end if;
    elsif next_photo_mode <> 'own' then
      if next_photo_mode !~ '^[0-9a-fA-F-]{36}$'
         or not exists(
           select 1 from public.default_photo_sets
           where id=next_photo_mode::uuid and active
         ) then
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

  if updated.id is null then
    raise exception 'Manage access denied';
  end if;

  return jsonb_build_object(
    'ok',true,
    'manageUrl','/m/'||updated.manage_id,
    'inviteUrl','/'||updated.invite_slug,
    'templateChangeCount',updated.template_change_count
  );
end; $$;

grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;
