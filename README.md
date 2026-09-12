# Bernaung

**Bernaung** adalah platform undangan pernikahan digital yang dirancang untuk menyediakan alur pembuatan, pembayaran, persetujuan admin, pengelolaan, dan publikasi undangan dalam satu sistem.

Project ini menggunakan frontend tanpa framework dengan **HTML, CSS, dan Vanilla JavaScript**, sementara data, autentikasi, storage, dan fungsi database menggunakan **Supabase**. Deployment disiapkan untuk **Vercel**.

---

## Daftar Isi

- [Fitur](#fitur)
- [Alur Sistem](#alur-sistem)
- [Admin](#admin)
- [Manage Invitation](#manage-invitation)
- [URL dan Routing](#url-dan-routing)
- [Template](#template)
- [Developer Settings](#developer-settings)
- [Teknologi](#teknologi)
- [Struktur Project](#struktur-project)
- [Supabase](#supabase)
- [Google OAuth](#google-oauth)
- [Storage](#storage)
- [Deployment](#deployment)
- [Catatan Keamanan](#catatan-keamanan)
- [Status Project](#status-project)

---

## Fitur

### Customer

- Membuat undangan tanpa akun customer.
- Mengisi data pasangan, keluarga, acara, dan konten undangan.
- Memilih template.
- Melihat preview dan melakukan recheck sebelum pembayaran.
- Melakukan pembayaran secara manual.
- Mengunggah bukti pembayaran.
- Melihat status pesanan.

### Public Invitation

- URL publik menggunakan slug yang bersih.
- Personalisasi nama tamu melalui query `?to=`.
- RSVP.
- Ucapan tamu.
- Informasi acara dan lokasi.
- Google Maps.
- Galeri foto.
- Musik undangan.
- Rekening / gift.
- Susunan acara.
- Love Story yang bersifat opsional.

### Admin

- Login admin menggunakan Google OAuth.
- Dashboard untuk memantau pesanan.
- Pemeriksaan bukti pembayaran.
- Persetujuan atau penolakan pesanan.
- Pengelolaan undangan melalui halaman Manage.
- Pengaturan harga undangan.
- Pengaturan pembayaran.
- Pengaturan WhatsApp.
- Pengaturan maintenance website.
- Notifikasi untuk undangan yang telah melewati 14 hari setelah acara.

---

## Alur Sistem

Alur utama customer:

```text
Isi Data
   ↓
Pilih Template
   ↓
Preview
   ↓
Recheck
   ↓
Pembayaran
   ↓
Upload Bukti
   ↓
Menunggu Persetujuan Admin
   ↓
Approved
   ↓
Manage Invitation + Public Invitation
```

Setelah pesanan disetujui, sistem menyediakan akses Manage, kode rahasia, dan URL publik undangan sesuai data pesanan.

---

## Admin

Admin Dashboard menjadi pusat pemeriksaan dan pengelolaan pesanan.

Pada bagian **Pembayaran terbaru**, informasi ringkas menampilkan pasangan dan status. Detail aksi dapat dibuka secara inline untuk menjalankan tindakan seperti:

- **Periksa**
- **Kelola**
- **Hapus**

Aksi tersebut ditampilkan langsung pada area pesanan dan tidak menggunakan popup sebagai pola utama.

---

## Manage Invitation

Halaman Manage merupakan pusat pengelolaan undangan setelah pesanan disetujui.

### Overview

Menampilkan informasi dan statistik undangan, antara lain:

- Jumlah undangan dibuka.
- Pengunjung unik.
- Waktu terakhir dibuka.
- RSVP hadir.
- RSVP tidak hadir.
- Belum RSVP.
- Daftar tamu dan informasi RSVP.
- Ucapan tamu.
- Informasi acara.
- Status undangan.
- Aksi cepat untuk membuka atau menyalin link.

### Edit Undangan

Bagian pengeditan mencakup:

```text
Mempelai
→ Orang Tua
→ Acara
→ Love Story
→ Susunan Acara
→ Rekening / Gift
→ Galeri
→ Musik
→ Kontak
→ Template
→ Catatan
```

### Link Tamu

Digunakan untuk membuat link personal berdasarkan nama tamu.

Contoh:

```text
https://bernaung.vercel.app/fajar-euis?to=Budi
```

Nama dapat dimasukkan satu per baris hingga 50 nama sekaligus. Link yang dihasilkan dapat disalin dan diekspor sebagai file TXT.

### Akses

Menampilkan:

- Link undangan.
- Link Manage.
- Kode rahasia.
- Tombol salin dan buka.
- Berbagi melalui WhatsApp.

Kode rahasia tidak dimasukkan ke dalam URL.

---

## URL dan Routing

Bernaung menggunakan clean URL agar alamat publik tidak menampilkan ekstensi `.html`.

### Public Invitation

Format dasar:

```text
https://bernaung.vercel.app/{slug}
```

Contoh:

```text
https://bernaung.vercel.app/fajar-euis
```

Untuk link personal tamu:

```text
https://bernaung.vercel.app/fajar-euis?to=Budi
```

Jika slug sudah digunakan, sistem dapat membuat variasi unik, misalnya:

```text
fajar-euis-2
```

### Manage

Format:

```text
https://bernaung.vercel.app/m/{manageId}
```

`manageId` menggunakan ID acak untuk akses Manage.

### Vercel Routing

Konfigurasi clean URL dan rewrite berada di:

```text
vercel.json
```

Routing digunakan untuk halaman utama aplikasi dan public invitation tanpa perlu menampilkan nama file HTML pada URL.

---

## Template

Template yang tersedia pada repository saat ini:

- **Adat Nusantara**
- **Playful Ceria**

Template berada di:

```text
/templates/
```

Public invitation menggunakan template yang dipilih berdasarkan data undangan.

---

## Developer Settings

Developer workspace digunakan untuk konfigurasi sistem yang bersifat global.

Menu yang tersedia saat ini:

1. **Harga Undangan**
2. **Pembayaran**
3. **WhatsApp**
4. **Notifikasi Sudah 14 Hari Setelah Acara**
5. **Maintenance Web**

### Harga Undangan

Harga yang tersimpan di Developer digunakan sebagai harga untuk pesanan baru.

Perubahan harga tidak mengubah nominal pada order yang sudah dibuat karena order menyimpan harga pada saat order tersebut dibuat.

### Pembayaran

Konfigurasi pembayaran digunakan untuk menentukan informasi pembayaran yang ditampilkan kepada customer, termasuk metode pembayaran dan QRIS admin.

### WhatsApp

Menyimpan nomor WhatsApp yang digunakan untuk kebutuhan kontak dan komunikasi admin.

### Notifikasi 14 Hari

Digunakan untuk membantu admin memantau undangan yang sudah melewati **14 hari setelah tanggal acara**.

### Maintenance Web

Digunakan untuk mengaktifkan atau menonaktifkan mode maintenance pada area publik website. Area admin tetap digunakan untuk pengelolaan sistem.

---

## Teknologi

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

### Backend & Services

- Supabase Database
- Supabase Authentication
- Supabase Storage
- Google OAuth
- Vercel

Project tidak menggunakan framework frontend.

---

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
│   ├── admin-media.js
│   ├── admin.js
│   ├── app.js
│   ├── form.js
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

---

## Supabase

Project menggunakan Supabase untuk database, authentication, storage, dan RPC/database functions.

Repository menyediakan beberapa SQL migration dan konfigurasi untuk bagian-bagian berikut:

```text
supabase-schema.sql
supabase-pretty-url.sql
supabase-manage-editor.sql
supabase-manage-v3.sql
supabase-manage-save-fix.sql
supabase-invitation-photos.sql
supabase-default-photo-manager-v2.sql
supabase-media-manager.sql
supabase-admin-bootstrap.sql
supabase-v6-upgrade.sql
supabase-developer.sql
supabase-public-photo-fix-v1.sql
```

> **Catatan:** file SQL merupakan migration/patch untuk kondisi schema dan fitur yang berbeda. Jangan menjalankan semua file secara membabi buta pada database yang sudah berjalan. Gunakan migration yang sesuai dengan kondisi database dan versi project yang digunakan.

Setelah project Supabase tersedia, konfigurasi koneksi frontend berada di:

```text
js/supabase.js
```

Gunakan:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Jangan menaruh `service_role` key di frontend.

### Fix Music RPC

Jika Manage menampilkan error:

```text
column "music" does not exist
```

gunakan migration:

```text
supabase-manage-music-fix-v3.sql
```

File tersebut memperbaiki RPC yang menggunakan kolom database `orders.music_url`, sementara key JSON publik tetap dapat menggunakan nama `music`.

---

## Google OAuth

Admin menggunakan Google OAuth melalui Supabase Authentication.

Konfigurasi dilakukan melalui:

```text
Supabase
→ Authentication
→ Providers
→ Google
```

User admin perlu memiliki akses yang sesuai pada konfigurasi `admin_users`.

Pastikan URL redirect/origin untuk deployment juga sudah dikonfigurasi sesuai domain yang digunakan.

---

## Storage

Bucket yang digunakan project antara lain:

```text
payment-proofs
invitation-photos
```

`payment-proofs` digunakan untuk bukti pembayaran, sedangkan `invitation-photos` digunakan untuk media foto undangan.

---

## Deployment

Project disiapkan untuk deployment menggunakan **Vercel**.

Checklist dasar:

1. Project Supabase sudah dibuat.
2. Schema dan migration yang diperlukan sudah diterapkan.
3. `js/supabase.js` berisi konfigurasi Supabase yang benar.
4. Google OAuth sudah dikonfigurasi.
5. Storage bucket yang diperlukan tersedia.
6. Domain deployment sudah masuk ke konfigurasi redirect/origin yang diperlukan.
7. `vercel.json` ikut dideploy.

Setelah deployment, lakukan pengujian minimal pada:

- Customer flow.
- Upload bukti pembayaran.
- Admin login.
- Approval order.
- Manage invitation.
- Public invitation.
- Link tamu.
- Media/foto.
- Musik.
- Pembayaran.
- Maintenance mode.

---

## Catatan Keamanan

Project saat ini merupakan fondasi aplikasi MVP dan masih memiliki beberapa area yang perlu diperketat sebelum penggunaan production berskala besar.

Hal yang perlu diperhatikan:

- Secret code masih digunakan untuk mendukung flow akses Manage.
- Kebijakan Storage dan akses database perlu disesuaikan dengan kebutuhan production.
- Credential sensitif tidak boleh disimpan di frontend.
- `service_role` key Supabase tidak boleh digunakan pada browser.
- Policy RLS Supabase perlu ditinjau sebelum deployment production.

---

## Status Project

Bernaung saat ini memiliki fondasi untuk:

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
- Developer settings.
- Clean public URLs.
- Maintenance mode.

README ini disusun berdasarkan struktur dan fitur pada baseline project yang sedang digunakan.

## AI Theme Director

Bernaung now includes an AI-assisted Theme Director for generating original visual concepts before a template is coded.

### Flow
1. Admin opens **AI Theme Director**.
2. Select one of the 8 customer categories: Minimal, Elegant, Romantic, Modern, Artistic, Nature, Playful, Islamic.
3. Optionally provide a theme name.
4. AI returns exactly 3 materially different art directions.
5. Select one concept to generate the fixed Bernaung master prompt.
6. Use that prompt as the source brief for building the actual HTML template.

### OpenAI setup
The AI call is server-side through `/api/theme-suggest.js`. Do **not** put the API key in frontend JavaScript.

Set these Vercel environment variables:

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional, defaults to `gpt-5.6-luna`
- `SUPABASE_URL` — required for admin-session verification
- `SUPABASE_ANON_KEY` — required for admin-session verification

The endpoint verifies the logged-in Supabase admin session before calling OpenAI.

The fixed Bernaung system prompt locks invitation structure, database/runtime concepts, the exact 6-photo gallery rule, RSVP, Maps, schedules, accounts, greetings, music, and other existing functionality. AI is only responsible for creative direction and does not get permission to invent replacement database fields.
