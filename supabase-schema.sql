-- BERNAUNG / SUPABASE FOUNDATION
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_token text not null unique,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  price integer not null default 58000,

  groom text,
  bride text,
  groom_father text,
  groom_mother text,
  bride_father text,
  bride_mother text,
  event_type text,
  event_date date,
  event_time text,
  venue text,
  address text,
  maps_url text,
  whatsapp text,
  music_url text,
  gift text,
  photos jsonb not null default '[]'::jsonb,

  template_id integer,
  template_name text,
  template_category text,
  template_url text,

  buyer_name text,
  payment_method text,
  payment_amount integer,
  payment_proof_path text,
  payment_note text,
  payment_submitted_at timestamptz,
  payment_reject_reason text,

  manage_id text unique,
  secret_code_hash text,
  invite_slug text unique,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  guest_name text not null,
  attendance text not null check (attendance in ('hadir','tidak_hadir')),
  guest_count integer not null default 1 check (guest_count between 1 and 20),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_token_idx on public.orders(customer_token);
create index if not exists orders_manage_id_idx on public.orders(manage_id);
create index if not exists orders_invite_slug_idx on public.orders(invite_slug);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists rsvps_order_id_idx on public.rsvps(order_id);

alter table public.orders add column if not exists secret_code_plain text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- Customer status lookup. customer_token is intentionally long/random.
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
    'invite_url', case when o.invite_slug is not null then coalesce(o.template_url, '/undangan.html') || '?slug=' || o.invite_slug else null end,
    'approved_at', o.approved_at,
    'rejected_at', o.rejected_at
  )
  from public.orders o
  where o.customer_token = p_customer_token
  limit 1;
$$;

-- Replace the above helper with a safe plain-code column for this browser-only MVP.
-- The code is never exposed by the public table API because direct table SELECT is denied.
-- If you want stronger secret storage later, move approval into an Edge Function.

create or replace function public.get_public_invitation(p_slug text)
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
    'templateUrl', o.template_url
  )
  from public.orders o
  where o.invite_slug = p_slug
    and o.status = 'approved'
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
    'inviteUrl', case when o.invite_slug is not null then coalesce(o.template_url, '/undangan.html') || '?slug=' || o.invite_slug else null end,
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

  return jsonb_build_object('ok', true, 'manageUrl', '/m/' || updated.manage_id, 'inviteUrl', coalesce(updated.template_url, '/undangan.html') || '?slug=' || updated.invite_slug);
end;
$$;

create or replace function public.create_rsvp(
  p_invite_slug text,
  p_guest_name text,
  p_attendance text,
  p_guest_count integer,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  new_id uuid;
begin
  select id into target_id from public.orders where invite_slug = p_invite_slug and status = 'approved' limit 1;
  if target_id is null then raise exception 'Invitation not found'; end if;
  insert into public.rsvps(order_id, guest_name, attendance, guest_count, message)
  values(target_id, trim(p_guest_name), p_attendance, greatest(1, least(20, p_guest_count)), nullif(trim(p_message),''))
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

-- Table API: anonymous users can create orders only. Admins can manage all orders.
alter table public.orders enable row level security;
alter table public.rsvps enable row level security;
alter table public.admin_users enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.rsvps from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

grant insert on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;
grant execute on function public.get_order_status(text) to anon, authenticated;
grant execute on function public.get_public_invitation(text) to anon, authenticated;
grant execute on function public.get_manage_invitation(text,text) to anon, authenticated;
grant execute on function public.update_manage_invitation(text,text,jsonb) to anon, authenticated;
grant execute on function public.create_rsvp(text,text,text,integer,text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists orders_anon_insert on public.orders;
create policy orders_anon_insert on public.orders
for insert to anon
with check (status = 'pending' and price = 58000);

drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
for select to authenticated
using ((select public.is_admin()));

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders
for delete to authenticated
using ((select public.is_admin()));

-- RSVPs are written through the function only.

-- Storage bucket for payment proof. Keep it private.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

revoke all on table storage.objects from anon, authenticated;
grant insert on table storage.objects to anon;
grant select on table storage.objects to authenticated;

drop policy if exists payment_proof_anon_upload on storage.objects;
create policy payment_proof_anon_upload on storage.objects
for insert to anon
with check (bucket_id = 'payment-proofs');

drop policy if exists payment_proof_admin_read on storage.objects;
create policy payment_proof_admin_read on storage.objects
for select to authenticated
using (bucket_id = 'payment-proofs' and (select public.is_admin()));

-- IMPORTANT: The following column stores the secret in this browser-MVP foundation.
-- It is not exposed through direct table SELECT. For stronger protection, replace
-- approval/manage RPCs with an Edge Function and store only a hash.

-- Data API grants for the functions.
grant usage on schema public to anon, authenticated;

-- Seed nothing. After your first Google login, insert the admin account manually:
-- insert into public.admin_users(user_id, email) values ('YOUR_AUTH_USER_UUID', 'YOUR_EMAIL');
