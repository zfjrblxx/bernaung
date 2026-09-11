-- BERNAUNG / MANAGE EDITOR
-- Run this AFTER supabase-schema.sql and supabase-pretty-url.sql.

create or replace function public.get_manage_rsvps(
  p_manage_id text,
  p_secret_code text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'guest_name', r.guest_name,
    'attendance', r.attendance,
    'guest_count', r.guest_count,
    'message', r.message,
    'created_at', r.created_at
    ) order by r.created_at desc), '[]'::jsonb)
  from public.rsvps r
  join public.orders o on o.id = r.order_id
  where o.manage_id = p_manage_id
    and o.status = 'approved'
    and o.secret_code_plain = upper(trim(p_secret_code));
$$;

grant execute on function public.get_manage_rsvps(text,text) to anon, authenticated;
