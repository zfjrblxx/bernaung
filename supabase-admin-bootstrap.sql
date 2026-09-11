-- Setelah login Google pertama kali, ambil UUID user dari
-- Supabase Dashboard > Authentication > Users.
-- Ganti dua nilai di bawah ini lalu jalankan.

insert into public.admin_users(user_id, email)
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'PASTE_ADMIN_GOOGLE_EMAIL_HERE'
)
on conflict (user_id) do update set email = excluded.email;
