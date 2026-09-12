-- BERNAUNG — PITA KERTAS
-- Patch public invitation payload so the Pita Kertas template can render
-- the current Manage fields plus guest greetings from the existing rsvps table.

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
  'loveStory',coalesce(o.love_story,'[]'::jsonb),
  'schedules',coalesce(o.schedules,'[]'::jsonb),
  'accounts',coalesce(o.accounts,'[]'::jsonb),
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
  'greetings',coalesce((
    select jsonb_agg(jsonb_build_object(
      'guest_name',r.guest_name,
      'message',r.message,
      'attendance',r.attendance,
      'guest_count',r.guest_count,
      'created_at',r.created_at
    ) order by r.created_at desc)
    from public.rsvps r
    where r.order_id=o.id
      and nullif(trim(r.message),'') is not null
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
