-- BERNAUNG DEVELOPER SETTINGS / V8+ MIGRATION
-- Run after the existing Bernaung schema + v6/manage migrations.

alter table public.site_settings
  add column if not exists payment_methods jsonb not null default '[]'::jsonb,
  add column if not exists admin_whatsapp text not null default '',
  add column if not exists qris_url text not null default '',
  add column if not exists maintenance boolean not null default false,
  add column if not exists reminder_enabled boolean not null default true,
  add column if not exists reminder_days integer not null default 14,
  add column if not exists maintenance_message text not null default 'Bernaung sedang melakukan pemeliharaan. Silakan kembali beberapa saat lagi.';

update public.site_settings
set payment_methods = '[{"name":"BCA","number":"1234567890","holder":"Bernaung"},{"name":"DANA","number":"08xxxxxxxxxx","holder":"Bernaung"}]'::jsonb
where key='general' and coalesce(jsonb_array_length(payment_methods),0)=0;

alter table public.orders
  add column if not exists photo_source text not null default 'default';

-- Batas penggantian tema Developer dibatalkan. Sistem Manage tetap memakai batas bawaan 2x.
drop trigger if exists orders_apply_developer_defaults on public.orders;
drop function if exists public.apply_order_developer_defaults();

create or replace function public.get_developer_settings()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'invitation_price', invitation_price,
  'payment_methods', payment_methods,
  'admin_whatsapp', admin_whatsapp,
  'qris_url', qris_url,
  'maintenance', maintenance,
  'reminder_enabled', reminder_enabled,
  'reminder_days', reminder_days,
  'maintenance_message',maintenance_message
)
from public.site_settings where key='general' and public.is_admin() limit 1;
$$;
grant execute on function public.get_developer_settings() to authenticated;

create or replace function public.set_developer_setting(p_key text,p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access denied'; end if;
  case p_key
    when 'invitation_price' then update public.site_settings set invitation_price=(p_value #>> '{}')::integer where key='general';
    when 'payment_methods' then update public.site_settings set payment_methods=coalesce(p_value,'[]'::jsonb) where key='general';
    when 'admin_whatsapp' then update public.site_settings set admin_whatsapp=coalesce(p_value #>> '{}','') where key='general';
    when 'qris_url' then update public.site_settings set qris_url=coalesce(p_value #>> '{}','') where key='general';
    when 'maintenance' then update public.site_settings set maintenance=coalesce((p_value->>'enabled')::boolean,false),maintenance_message=coalesce(p_value->>'message','') where key='general';
    when 'reminder_enabled' then update public.site_settings set reminder_enabled=coalesce((p_value #>> '{}')::boolean,true),reminder_days=14 where key='general';
    when 'reminder_days' then update public.site_settings set reminder_days=14 where key='general';
    when 'reminder' then update public.site_settings set reminder_enabled=coalesce((p_value->>'enabled')::boolean,true),reminder_days=14 where key='general';
    else raise exception 'Developer setting tidak dikenal';
  end case;
  return public.get_developer_settings();
end;
$$;
grant execute on function public.set_developer_setting(text,jsonb) to authenticated;

create or replace function public.get_checkout_settings()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object('payment_methods',payment_methods,'qris_url',qris_url,'admin_whatsapp',admin_whatsapp)
from public.site_settings where key='general' limit 1;
$$;
grant execute on function public.get_checkout_settings() to anon,authenticated;

create or replace function public.get_manage_invitation(p_manage_id text,p_secret_code text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
'id',o.id,'groom',o.groom,'bride',o.bride,'groomFather',o.groom_father,'groomMother',o.groom_mother,
'brideFather',o.bride_father,'brideMother',o.bride_mother,'eventType',o.event_type,'date',o.event_date,'time',o.event_time,
'venue',o.venue,'address',o.address,'maps',o.maps_url,'whatsapp',o.whatsapp,'music',o.music_url,'gift',o.gift,
'photos',o.photos,'photoSource',o.photo_source,'loveStory',o.love_story,'schedules',o.schedules,'accounts',o.accounts,'notes',o.notes,
'templateId',o.template_id,'templateName',o.template_name,'templateCategory',o.template_category,'templateUrl',o.template_url,
'templateChangeCount',o.template_change_count,'reminderEnabled',(select reminder_enabled from public.site_settings where key='general' limit 1),'reminderDays',(select reminder_days from public.site_settings where key='general' limit 1),
'inviteUrl',case when o.invite_slug is not null then '/'||o.invite_slug else null end,'manageUrl','/m/'||o.manage_id)
from public.orders o where o.manage_id=p_manage_id and o.status='approved' and o.secret_code_plain=upper(trim(p_secret_code)) limit 1;
$$;
grant execute on function public.get_manage_invitation(text,text) to anon,authenticated;

create or replace function public.update_manage_invitation(p_manage_id text,p_secret_code text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare updated public.orders; changing_template boolean := false;
begin
  select exists(select 1 from public.orders where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) and p_data ? 'templateId' and (p_data->>'templateId')::integer is distinct from template_id) into changing_template;
  if changing_template and (select template_change_count from public.orders where manage_id=p_manage_id) >= 2 then
    raise exception 'Kesempatan penggantian tema sudah habis';
  end if;
  update public.orders set
    groom=coalesce(p_data->>'groom',groom), bride=coalesce(p_data->>'bride',bride),
    groom_father=coalesce(p_data->>'groomFather',groom_father), groom_mother=coalesce(p_data->>'groomMother',groom_mother),
    bride_father=coalesce(p_data->>'brideFather',bride_father), bride_mother=coalesce(p_data->>'brideMother',bride_mother),
    event_type=coalesce(p_data->>'eventType',event_type), event_date=case when p_data ? 'date' then nullif(p_data->>'date','')::date else event_date end,
    event_time=coalesce(p_data->>'time',event_time), venue=coalesce(p_data->>'venue',venue), address=coalesce(p_data->>'address',address),
    maps_url=coalesce(p_data->>'maps',maps_url), whatsapp=coalesce(p_data->>'whatsapp',whatsapp), music_url=coalesce(p_data->>'music',music_url),
    gift=coalesce(p_data->>'gift',gift), photos=case when p_data ? 'photos' then p_data->'photos' else photos end,
    photo_source=case when p_data ? 'photoSource' then coalesce(nullif(p_data->>'photoSource',''),'default') else photo_source end,
    love_story=case when p_data ? 'loveStory' then p_data->'loveStory' else love_story end,
    schedules=case when p_data ? 'schedules' then p_data->'schedules' else schedules end,
    accounts=case when p_data ? 'accounts' then p_data->'accounts' else accounts end,
    notes=case when p_data ? 'notes' then p_data->>'notes' else notes end,
    template_id=case when p_data ? 'templateId' then (p_data->>'templateId')::integer else template_id end,
    template_name=coalesce(p_data->>'templateName',template_name), template_category=coalesce(p_data->>'templateCategory',template_category),
    template_url=coalesce(p_data->>'templateUrl',template_url),
    template_change_count=template_change_count + case when changing_template then 1 else 0 end
  where manage_id=p_manage_id and status='approved' and secret_code_plain=upper(trim(p_secret_code)) returning * into updated;
  if updated.id is null then raise exception 'Manage access denied'; end if;
  return jsonb_build_object('ok',true,'manageUrl','/m/'||updated.manage_id,'inviteUrl','/'||updated.invite_slug,'templateChangeCount',updated.template_change_count);
end; $$;
grant execute on function public.update_manage_invitation(text,text,jsonb) to anon,authenticated;

-- Public QRIS image upload bucket; only admins may upload/update/delete, anyone may read the public image.
insert into storage.buckets(id,name,public) values('admin-assets','admin-assets',true) on conflict(id) do update set public=true;
drop policy if exists admin_assets_public_read on storage.objects;
create policy admin_assets_public_read on storage.objects for select to public using(bucket_id='admin-assets');
drop policy if exists admin_assets_admin_insert on storage.objects;
create policy admin_assets_admin_insert on storage.objects for insert to authenticated with check(bucket_id='admin-assets' and public.is_admin());
drop policy if exists admin_assets_admin_update on storage.objects;
create policy admin_assets_admin_update on storage.objects for update to authenticated using(bucket_id='admin-assets' and public.is_admin()) with check(bucket_id='admin-assets' and public.is_admin());
drop policy if exists admin_assets_admin_delete on storage.objects;
create policy admin_assets_admin_delete on storage.objects for delete to authenticated using(bucket_id='admin-assets' and public.is_admin());


create or replace function public.get_public_site_status()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('maintenance',maintenance,'message',maintenance_message)
from public.site_settings where key='general' limit 1;
$$;
grant execute on function public.get_public_site_status() to anon,authenticated;
