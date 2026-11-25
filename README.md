# Absensi AdminLTE4

Aplikasi absensi berbasis web dengan dashboard admin ber-UI **AdminLTE 4**, halaman pegawai, login session, status hadir / izin / alpa / terlambat, rekap bulanan, dan export CSV. Stack: Node.js + Express, **MySQL**.

## Instalasi

1. Install dependensi:

   ```bash
   npm install
   ```

2. Salin `.env.example` ke `.env` lalu sesuaikan:

   ```bash
   copy .env.example .env
   ```

   Isi minimal: `DB_HOST=localhost`, `DB_USER=root`, `DB_PASSWORD` (kosong default), `DB_NAME=absensi_db`.

3. Buat skema + seed admin (butuh MySQL server di `localhost:3306`):

   ```bash
   npm run db:init
   ```

   Akan membuat database `absensi_db` dengan tabel `users`, `pegawai`, `absen`, dan seed user `admin` dengan password default **`admin123`** (ubah setelah login pertama).

4. Jalan server:

   ```bash
   npm start
   # atau: node server.js
   ```

   Buka: **http://localhost:3000/admin** (login admin) atau **http://localhost:3000/pegawai** (login pegawai / isi absen).

## Fitur

- **Admin:** ringkasan bulan ini (hadir/izin/alpa/terlambat), CRUD pegawai, rekap absen bulanan, export CSV (`/api/export`), logout.
- **Pegawai:** login, rekap absen bulan ini, isi absen harian (status: hadir/izin/alpa/terlambat + keterangan).
- Setiap pegawai satu baris absen per hari (unik per `pegawai_id + tanggal`).

## Catatan

- Aplikasi ini dirancang untuk lokal; hosting bisa dipasangi nanti.
- Status login disimpan di memory session Express (restart server mereset login).

## Screenshot

Tidak ada screenshot di repositori ini (generate screenshot tidak tersedia: kredit image kosong). Jalankan aplikasi lokal:

```bash
npm start
```

Buka halaman terkait untuk melihat layar aslinya:
- Dashboard admin: **http://localhost:3000/admin** (login admin)
- Rekap absen pegawai: **http://localhost:3000/pegawai** (login pegawai / isi absen)

## Troubleshooting

- `ECONNREFUSED` → MySQL belum jalan: mulai layanan MySQL (port 3306) sebelum `npm run db:init` / `npm start`.
- Login gagal → cek kredensial, atau jalankan ulang `npm run db:init` (memastikan tabel ada).
