-- BERNAUNG: Pretty public invitation URLs
-- Run this once AFTER the original supabase-schema.sql.

-- 1) Helper for converting couple names into a URL-safe slug.
create or replace function public.bernaung_slugify(p_groom text, p_bride text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(coalesce(p_groom,'') || '-' || coalesce(p_bride,''));
  v := regexp_replace(v, '[^a-zA-Z0-9]+', '-', 'g');
  v := regexp_replace(v, '(^-+|-+$)', '', 'g');
  return coalesce(nullif(v,''),'undangan');
end;
$$;

-- 2) Re-slug existing orders without breaking the unique constraint.
do $$
declare
  r record;
  base_slug text;
  candidate text;
  n integer;
begin
  for r in select id, groom, bride from public.orders order by created_at asc, id asc loop
    base_slug := public.bernaung_slugify(r.groom, r.bride);
    candidate := base_slug;
    n := 2;
    while exists (select 1 from public.orders x where x.invite_slug = candidate and x.id <> r.id) loop
      candidate := base_slug || '-' || n;
      n := n + 1;
    end loop;
    update public.orders set invite_slug = candidate where id = r.id;
  end loop;
end;
$$;

-- 3) Public/customer links now use /nama-mempelai instead of /templates/...?...slug=.
create or replace function public.get_order_status(p_customer_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'price', o.price,
    'groom', o.groom,
    'bride', o.bride,
    'template_name', o.template_name,
    'payment_reject_reason', o.payment_reject_reason,
    'manage_url', case when o.manage_id is not null then '/m/' || o.manage_id else null end,
    'secret_code', case when o.status = 'approved' then o.secret_code_plain else null end,
    'invite_slug', o.invite_slug,
    'invite_url', case when o.invite_slug is not null then '/' || o.invite_slug else null end,
    'approved_at', o.approved_at,
    'rejected_at', o.rejected_at
  )
  from public.orders o
  where o.customer_token = p_customer_token
  limit 1;
$$;

create or replace function public.get_manage_invitation(p_manage_id text, p_secret_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'groom', o.groom,
    'bride', o.bride,
    'groomFather', o.groom_father,
    'groomMother', o.groom_mother,
    'brideFather', o.bride_father,
    'brideMother', o.bride_mother,
    'eventType', o.event_type,
    'date', o.event_date,
    'time', o.event_time,
    'venue', o.venue,
    'address', o.address,
    'maps', o.maps_url,
    'whatsapp', o.whatsapp,
    'music', o.music_url,
    'gift', o.gift,
    'photos', o.photos,
    'templateId', o.template_id,
    'templateName', o.template_name,
    'templateCategory', o.template_category,
    'templateUrl', o.template_url,
    'inviteUrl', case when o.invite_slug is not null then '/' || o.invite_slug else null end,
    'manageUrl', '/m/' || o.manage_id
  )
  from public.orders o
  where o.manage_id = p_manage_id
    and o.status = 'approved'
    and o.secret_code_plain = upper(trim(p_secret_code))
  limit 1;
$$;

create or replace function public.update_manage_invitation(
  p_manage_id text,
  p_secret_code text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.orders;
begin
  update public.orders
  set
    groom = coalesce(p_data->>'groom', groom),
    bride = coalesce(p_data->>'bride', bride),
    groom_father = coalesce(p_data->>'groomFather', groom_father),
    groom_mother = coalesce(p_data->>'groomMother', groom_mother),
    bride_father = coalesce(p_data->>'brideFather', bride_father),
    bride_mother = coalesce(p_data->>'brideMother', bride_mother),
    event_type = coalesce(p_data->>'eventType', event_type),
    event_date = case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
    event_time = coalesce(p_data->>'time', event_time),
    venue = coalesce(p_data->>'venue', venue),
    address = coalesce(p_data->>'address', address),
    maps_url = coalesce(p_data->>'maps', maps_url),
    whatsapp = coalesce(p_data->>'whatsapp', whatsapp),
    music_url = coalesce(p_data->>'music', music_url),
    gift = coalesce(p_data->>'gift', gift),
    photos = case when p_data ? 'photos' then p_data->'photos' else photos end,
    template_id = case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
    template_name = coalesce(p_data->>'templateName', template_name),
    template_category = coalesce(p_data->>'templateCategory', template_category),
    template_url = coalesce(p_data->>'templateUrl', template_url)
  where manage_id = p_manage_id
    and status = 'approved'
    and secret_code_plain = upper(trim(p_secret_code))
  returning * into updated;

  if updated.id is null then
    raise exception 'Manage access denied';
  end if;

  return jsonb_build_object('ok', true, 'manageUrl', '/m/' || updated.manage_id, 'inviteUrl', case when updated.invite_slug is not null then '/' || updated.invite_slug else null end);
end;
$$;

-- Permissions for the public RPCs remain as defined by the original schema.
