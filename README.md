# Media Monitoring

Aplikasi monitoring sederhana berbasis Next.js 16 untuk:
- login 1 akun internal via backend
- input target akun `YouTube`, `Instagram`, dan `TikTok`
- menampilkan total views, views per konten, foto profil, dan nama akun
- refresh data otomatis tanpa reload halaman

Saat ini koneksi sosial media memakai API lokal di `localhost:8000`.

## Requirements

- Node.js 20+ disarankan
- npm

## Setup

1. Install dependency:

```bash
npm install
```

2. Copy environment file:

```bash
copy .env.example .env.local
```

3. Generate hash password untuk login:

```bash
node scripts/hash-password.mjs password-kamu
```

4. Isi `.env.local` dengan value yang sesuai:

```env
APP_LOGIN_USERNAME=admin
APP_LOGIN_PASSWORD_HASH=hasil-hash-dari-script
APP_SESSION_SECRET=isi-dengan-random-secret-yang-panjang
SOCIAL_API_BASE_URL=http://127.0.0.1:8000
```

Catatan:
- `APP_LOGIN_USERNAME` adalah username untuk 1 akun internal.
- `APP_LOGIN_PASSWORD_HASH` wajib berupa hash hasil script, bukan plain password.
- `APP_SESSION_SECRET` dipakai untuk sign cookie session.
- `SOCIAL_API_BASE_URL` adalah base URL backend scraper lokal.

## Menjalankan App

Jalankan development server:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

Flow penggunaan:
1. Buka app, lalu login memakai username dan password yang sudah dikonfigurasi di backend.
2. Setelah login, masuk ke dashboard.
3. Isi target akun:
   - YouTube di baris paling atas
   - Instagram di baris kedua
   - TikTok di baris paling bawah
4. Klik `Simpan akun dan refresh data`.
5. Dashboard akan menampilkan:
   - foto profil akun
   - nama akun
   - total keseluruhan views
   - daftar sampai 7 konten terakhir
   - views per konten
6. Data akan refresh otomatis tanpa reload halaman.

## Auto Refresh

Di dashboard ada input `Auto-refresh (detik)`.

## Login dan Session

Autentikasi dibuat sederhana tanpa database:
- login diverifikasi di backend
- session disimpan di cookie `httpOnly`
- route `/dashboard` diproteksi oleh `proxy.ts`

Penyimpanan target akun bersifat `in-memory` per session:
- tidak memakai database
- target akun hilang jika server restart

## API Internal

Route internal yang tersedia:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/monitoring`
- `POST /api/monitoring/targets`

Route ini dipakai langsung oleh frontend dashboard.

## Struktur Penting

- `app/login/page.tsx`: halaman login
- `app/dashboard/page.tsx`: entry dashboard
- `components/login-form.tsx`: form login client-side
- `components/dashboard-client.tsx`: form target akun, polling, dan tampilan data
- `app/api/auth/*`: auth backend
- `app/api/monitoring/*`: API monitoring
- `lib/auth.ts`: hashing password dan signed session cookie
- `lib/session-store.ts`: penyimpanan session dan target akun di memory
- `lib/social/*`: adapter sosial media
- `scripts/hash-password.mjs`: generator hash password

## Mode Data Sosial Media

Implementasi saat ini default ke API lokal `POST /scrape/profile`.

Yang sudah disiapkan:
- contract data backend untuk dashboard
- provider wrapper per platform
- service penggabung data YouTube, Instagram, TikTok

Body request ke scraper:

```json
{
  "platform": "tiktok",
  "username": "ayoindonesiacom",
  "recent_limit": 5
}
```