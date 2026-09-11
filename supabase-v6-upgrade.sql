-- BERNAUNG V6 UPGRADE
-- Run this once after the existing Bernaung schema + manage migrations.

-- 1) Central price setting
create table if not exists public.site_settings (
  key text primary key,
  invitation_price integer not null default 58000 check (invitation_price > 0)
);
insert into public.site_settings(key, invitation_price)
values ('general', 58000)
on conflict (key) do nothing;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

drop policy if exists site_settings_admin_select on public.site_settings;
create policy site_settings_admin_select on public.site_settings
for select to authenticated using ((select public.is_admin()));
drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, update on public.site_settings to authenticated;

create or replace function public.get_invitation_price()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select invitation_price from public.site_settings where key='general' limit 1;
$$;
grant execute on function public.get_invitation_price() to anon, authenticated;

create or replace function public.set_invitation_price(p_price integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access denied'; end if;
  if p_price is null or p_price < 1000 then raise exception 'Harga tidak valid'; end if;
  update public.site_settings set invitation_price=p_price where key='general';
  return p_price;
end;
$$;
grant execute on function public.set_invitation_price(integer) to authenticated;

-- Keep anonymous checkout locked to the price currently configured by admin.
drop policy if exists orders_anon_insert on public.orders;
create policy orders_anon_insert on public.orders
for insert to anon
with check (
  status = 'pending'
  and price = public.get_invitation_price()
  and payment_amount = public.get_invitation_price()
);

-- 2) Manage theme-change limit
alter table public.orders
  add column if not exists template_change_count integer not null default 0;

create or replace function public.get_manage_invitation(p_manage_id text,p_secret_code text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
'id',o.id,'groom',o.groom,'bride',o.bride,'groomFather',o.groom_father,'groomMother',o.groom_mother,
'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
'photos',o.photos,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
'templateId',o.template_id,'templateName',o.template_name,'templateCategory',o.template_category,'templateUrl',o.template_url,
'templateChangeCount',o.template_change_count,
'inviteUrl',case when o.invite_slug is not null then '/'||o.invite_slug else null end,'manageUrl','/m/'||o.manage_id)
from public.orders o where o.manage_id=p_manage_id and o.status='approved' and o.secret_code_plain=upper(trim(p_secret_code)) limit 1;
$$;

grant execute on function public.get_manage_invitation(text,text) to anon,authenticated;

create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare updated public.orders; changing_template boolean := false;
begin
  select exists(
    select 1 from public.orders
    where manage_id=p_manage_id and status='approved'
      and secret_code_plain=upper(trim(p_secret_code))
      and p_data ? 'templateId'
      and (p_data->>'templateId')::integer is distinct from template_id
  ) into changing_template;

  if changing_template and (select template_change_count from public.orders where manage_id=p_manage_id) >= 2 then
    raise exception 'Kesempatan penggantian tema sudah habis';
  end if;

  update public.orders set
    groom=coalesce(p_data->>'groom',groom), bride=coalesce(p_data->>'bride',bride),
    groom_father=coalesce(p_data->>'groomFather',groom_father), groom_mother=coalesce(p_data->>'groomMother',groom_mother),
    bride_father=coalesce(p_data->>'brideFather',bride_father), bride_mother=coalesce(p_data->>'brideMother',bride_mother),
    event_type=coalesce(p_data->>'eventType',event_type),
    event_date=case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
    event_time=coalesce(p_data->>'time',event_time), venue=coalesce(p_data->>'venue',venue), address=coalesce(p_data->>'address',address),
    maps_url=coalesce(p_data->>'maps',maps_url), whatsapp=coalesce(p_data->>'whatsapp',whatsapp), music_url=coalesce(p_data->>'music',music_url),
    gift=coalesce(p_data->>'gift',gift), photos=case when p_data ? 'photos' then p_data->'photos' else photos end,
    love_story=case when p_data ? 'loveStory' then p_data->'loveStory' else love_story end,
    schedules=case when p_data ? 'schedules' then p_data->'schedules' else schedules end,
    accounts=case when p_data ? 'accounts' then p_data->'accounts' else accounts end,
    notes=case when p_data ? 'notes' then p_data->>'notes' else notes end,
    template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
    template_name=coalesce(p_data->>'templateName',template_name), template_category=coalesce(p_data->>'templateCategory',template_category),
    template_url=coalesce(p_data->>'templateUrl',template_url),
    template_change_count=template_change_count + case when changing_template then 1 else 0 end
  where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code))
  returning * into updated;

  if updated.id is null then raise exception 'Manage access denied'; end if;
  return jsonb_build_object('ok',true,'manageUrl','/m/'||updated.manage_id,'inviteUrl','/'||updated.invite_slug,'templateChangeCount',updated.template_change_count);
end; $$;

grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;

-- 3) Invitation-open tracking for Manage Overview
create table if not exists public.invitation_views (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  guest_name text,
  visitor_key text,
  created_at timestamptz not null default now()
);
create index if not exists invitation_views_order_id_idx on public.invitation_views(order_id);
create index if not exists invitation_views_created_at_idx on public.invitation_views(created_at desc);
alter table public.invitation_views enable row level security;
revoke all on public.invitation_views from anon, authenticated;

create or replace function public.track_invitation_view(p_slug text,p_guest_name text,p_visitor_key text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare target_id uuid;
begin
  select id into target_id from public.orders where invite_slug=trim(p_slug) and status='approved' limit 1;
  if target_id is null then return false; end if;
  insert into public.invitation_views(order_id,guest_name,visitor_key)
  values(target_id,nullif(trim(p_guest_name),''),nullif(left(trim(p_visitor_key),128),''));
  return true;
end;
$$;
grant execute on function public.track_invitation_view(text,text,text) to anon,authenticated;

create or replace function public.get_manage_overview(p_manage_id text,p_secret_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare target_id uuid; total_opens bigint; unique_visitors bigint; last_opened timestamptz; rsvp_count bigint;
begin
  select id into target_id from public.orders where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) limit 1;
  if target_id is null then raise exception 'Manage access denied'; end if;
  select count(*),count(distinct visitor_key),max(created_at) into total_opens,unique_visitors,last_opened from public.invitation_views where order_id=target_id;
  select count(distinct lower(trim(guest_name))) into rsvp_count from public.rsvps where order_id=target_id;
  return jsonb_build_object(
    'stats',jsonb_build_object('totalOpens',coalesce(total_opens,0),'uniqueVisitors',coalesce(unique_visitors,0),'lastOpened',last_opened,'uniqueRsvpGuests',coalesce(rsvp_count,0)),
    'rsvps',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'guest_name',r.guest_name,'attendance',r.attendance,'guest_count',r.guest_count,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.rsvps r where r.order_id=target_id),'[]'::jsonb),
    'greetings',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'guest_name',r.guest_name,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.rsvps r where r.order_id=target_id and nullif(trim(r.message),'') is not null),'[]'::jsonb)
  );
end;
$$;
grant execute on function public.get_manage_overview(text,text) to anon,authenticated;

-- Also keep the authenticated checkout path aligned with the central price.
drop policy if exists orders_authenticated_insert on public.orders;
create policy orders_authenticated_insert on public.orders
for insert to authenticated
with check (
  status = 'pending'
  and price = public.get_invitation_price()
  and payment_amount = public.get_invitation_price()
);
grant insert on public.orders to authenticated;
