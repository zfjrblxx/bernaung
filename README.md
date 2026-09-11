# BERNAUNG

**Bernaung** adalah platform undangan pernikahan digital dengan tampilan modern, sederhana, dan personal. Customer dapat membuat undangan, memilih tema, melakukan pembayaran manual, lalu mengelola undangan setelah pembayaran disetujui.

## Fitur Utama

- Pembuatan undangan tanpa akun customer.
- Alur: isi data → pilih tema → preview → recheck → pembayaran → kirim bukti → menunggu persetujuan admin.
- Pembayaran manual dengan harga undangan yang dapat diatur dari Admin.
- Admin login menggunakan Google OAuth.
- Admin dapat memeriksa bukti pembayaran dan menyetujui atau menolak pesanan.
- Setelah disetujui, sistem membuat akses Manage, secret code, dan URL undangan.
- Halaman Manage sebagai pusat pengelolaan undangan.
- RSVP dan ucapan tamu.
- Google Maps untuk lokasi acara.
- Galeri foto yang dapat dikelola melalui Manage.
- Musik undangan yang dapat dikelola melalui Manage.
- Rekening / gift dan susunan acara bersifat opsional.
- Love Story bersifat opsional.
- Link Tamu untuk membuat link personal berdasarkan nama tamu.
- Generator Link Tamu dapat memproses hingga 50 nama sekaligus.
- Hasil Link Tamu dapat disalin semua atau diekspor menjadi TXT.
- Pergantian tema di Manage dibatasi maksimal 2 kali untuk setiap undangan.
- URL publik undangan menggunakan format yang bersih tanpa `.html`.

## Struktur Manage

Halaman Manage memiliki empat tab utama:

### Overview

Digunakan untuk memantau undangan, antara lain:

- Jumlah undangan dibuka.
- Pengunjung unik.
- Terakhir dibuka.
- RSVP hadir.
- RSVP tidak hadir.
- Belum RSVP.
- Daftar tamu dan informasi RSVP.
- Ucapan dari tamu.
- Informasi acara dan status undangan.
- Aksi cepat untuk membuka atau menyalin link.

### Edit Undangan

Semua bagian pengaturan undangan ditampilkan dalam satu halaman dan dapat diperiksa dengan scroll manual.

Urutan bagian:

`Mempelai → Orang Tua → Acara → Love Story → Susunan Acara → Rekening / Gift → Galeri → Musik → Kontak → Template → Catatan`

### Link Tamu

Digunakan untuk membuat link personal berdasarkan nama tamu.

Contoh:

```text
https://bernaung.vercel.app/fajar-euis?to=Budi
```

Nama dapat dimasukkan satu per baris hingga 50 nama sekaligus. Setelah generate, setiap nama mendapatkan link personal yang dapat disalin. Semua hasil juga dapat diekspor menjadi file TXT.

### Akses

Berisi:

- Link Undangan.
- Link Manage.
- Kode Rahasia.
- Tombol salin dan buka.
- Berbagi melalui WhatsApp.

Kode rahasia tidak dimasukkan ke dalam URL.

## URL

URL publik undangan menggunakan slug berdasarkan nama pasangan.

Contoh:

```text
https://bernaung.vercel.app/fajar-euis
```

Untuk personalisasi nama tamu:

```text
https://bernaung.vercel.app/fajar-euis?to=Budi
```

Jika slug pasangan sudah digunakan, sistem membuat variasi unik seperti:

```text
fajar-euis-2
```

URL Manage menggunakan `manageId` random 16 karakter yang terdiri dari huruf besar, huruf kecil, dan angka.

Contoh:

```text
https://bernaung.vercel.app/m/B7xKp92QaL5mRt8Z
```

## Clean URL

Routing Vercel digunakan agar halaman utama dapat diakses tanpa ekstensi `.html`.

Contoh:

```text
/buat-undangan
/pilih-template
/preview
/recheck
/pembayaran
/status
/admin
/admin-dashboard
/manage
```

URL undangan publik menggunakan:

```text
/{invite_slug}
```

Konfigurasi routing tersedia di:

`vercel.json`

## Harga Undangan

Harga undangan dikelola dari **Pengaturan Admin** dan dapat diubah untuk pesanan baru.

Harga yang tersimpan di Settings digunakan untuk **pesanan baru**.

Harga pada order yang sudah dibuat tetap menggunakan harga saat order tersebut dibuat, sehingga perubahan harga tidak mengubah tagihan order lama.

## Tema

Bernaung memiliki katalog tema dengan beberapa kategori desain. Pada versi saat ini, template yang sudah diimplementasikan dan dapat digunakan adalah:

- **Adat Nusantara**
- **Playful Ceria**

Pergantian tema melalui Manage dibatasi maksimal **2 kali per undangan**.

## FAQ

Homepage menampilkan FAQ secara ringkas.

- 7 FAQ ditampilkan terlebih dahulu.
- Tombol **Lihat selengkapnya →** menambahkan FAQ berikutnya.
- FAQ tambahan dimuat 7 item per klik.
- Setelah seluruh FAQ tampil, tombol berubah menjadi **Tampilkan lebih sedikit ↑**.
- Tidak menggunakan popup.

## Responsive & Mobile

Bernaung menggunakan pendekatan mobile-first dengan navigasi hamburger pada tampilan mobile.

Admin Dashboard juga memiliki navigasi sidebar pada desktop dan menu yang dapat dibuka pada perangkat mobile.

## Teknologi

Frontend:

- HTML
- CSS
- Vanilla JavaScript

Backend dan layanan:

- Supabase Database
- Supabase Authentication
- Supabase Storage
- Google OAuth
- Vercel

Tidak menggunakan framework frontend.

## Supabase Setup

Buat project baru di Supabase, lalu jalankan SQL yang diperlukan dari repository.

File utama:

```text
supabase-schema.sql
supabase-pretty-url.sql
supabase-manage-editor.sql
supabase-manage-v3.sql
supabase-invitation-photos.sql
supabase-admin-bootstrap.sql
supabase-v6-upgrade.sql
```

Setelah project dibuat, isi koneksi frontend di:

```text
js/supabase.js
```

Gunakan:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Gunakan publishable/anon key pada browser. Jangan menaruh `service_role` key di frontend.

## Google Login Admin

Aktifkan Google Provider pada:

**Supabase → Authentication → Providers**

Setelah login Google pertama kali, user admin perlu dimasukkan ke tabel `admin_users` sesuai konfigurasi database.

## Storage

Bukti pembayaran menggunakan bucket:

```text
payment-proofs
```

Foto undangan menggunakan bucket:

```text
invitation-photos
```

## Deployment

Project disiapkan untuk deployment menggunakan **Vercel**.

Pastikan:

1. Project Supabase sudah dikonfigurasi.
2. SQL yang diperlukan sudah dijalankan.
3. `js/supabase.js` berisi konfigurasi Supabase yang benar.
4. Google OAuth sudah dikonfigurasi.
5. Domain deployment Vercel sudah masuk ke konfigurasi redirect/origin yang diperlukan.
6. `vercel.json` ikut dideploy agar clean URL dan routing berjalan.

## Catatan Keamanan

Implementasi saat ini merupakan fondasi MVP.

Secret code masih disimpan pada database untuk mendukung flow pengembangan dan pengujian. Untuk production yang lebih ketat, pengelolaan secret sebaiknya dipindahkan ke server-side/Edge Function dan menggunakan hash atau mekanisme perlindungan yang sesuai.

Policy Storage dan akses data juga sebaiknya diperketat sebelum aplikasi digunakan pada skala production.

## Struktur Project

```text
bernaung-main/
├── index.html
├── buat-undangan.html
├── pilih-template.html
├── preview.html
├── recheck.html
├── pembayaran.html
├── status.html
├── berhasil.html
├── undangan.html
├── manage.html
├── admin.html
├── admin-dashboard.html
├── bantuan-mp3.html
├── vercel.json
├── README.md
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── form.js
│   ├── invite.js
│   ├── manage.js
│   ├── payment.js
│   ├── preview.js
│   ├── public-invitation.js
│   ├── recheck.js
│   ├── status.js
│   ├── success.js
│   ├── supabase.js
│   └── template.js
│
├── templates/
│   ├── adat-nusantara.html
│   └── playful-ceria.html
│
└── *.sql
```

## Status

Bernaung saat ini memiliki fondasi utama untuk:

- Customer flow.
- Manual payment.
- Admin approval.
- Manage invitation.
- Public invitation.
- RSVP.
- Guest greetings.
- Guest personalization.
- Photo management.
- Music management.
- Template management.
- Admin settings.
- Clean public URLs.

README ini mengikuti kondisi project pada baseline `bernaung-main-v6-gas`.


## Developer

Developer workspace saat ini mencakup Harga Undangan, Pembayaran, WhatsApp, Notif Sudah 14 Hari Setelah Acara, dan Maintenance Web.

### Manage music RPC fix
Jika halaman Manage menampilkan error `column "music" does not exist`, jalankan `supabase-manage-music-fix.sql` sekali di Supabase. Migration ini memastikan RPC membaca kolom `orders.music_url` dan mengembalikannya sebagai field JSON `music`.
