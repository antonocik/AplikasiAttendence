require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const { verifyPassword } = require('./lib/hash');

const PORT = Number(process.env.PORT || 3000);
const VIEWS_DIR = path.join(__dirname, 'views');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'absensi-dev-secret',
    resave: false,
    saveUninitialized: false,
  }),
);

function sendJson(res, code, body) {
  res.status(code).json(body);
}

// ---- autentikasi ----
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || typeof password !== 'string' || password === '') {
    return sendJson(res, 400, { error: 'Username dan password wajib diisi' });
  }
  const [rows] = await db.query(
    'SELECT id, username, password_hash, role FROM `users` WHERE `username` = ? LIMIT 1',
    [username],
  );
  const u = rows[0];
  if (!u || !verifyPassword(password, u.password_hash)) {
    return sendJson(res, 401, { error: 'Username atau password salah' });
  }
  req.session.user_id = u.id;
  req.session.username = u.username;
  req.session.role = u.role;
  res.json({ ok: true, role: u.role });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

function requireAdmin(req, res, next) {
  if (!req.session.user_id || req.session.role !== 'admin') {
    return res.redirect('/pegawai');
  }
  next();
}

// ---- halaman ----
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'admin.html'));
});
app.get('/pegawai', (req, res) => {
  if (req.session && req.session.user_id) {
    return res.sendFile(path.join(VIEWS_DIR, 'pegawai.html'));
  }
  res.redirect('/login-pegawai'); // Ruling: tidak login → login pegawai
});
app.get('/login-pegawai', (req, res) => {
  if (req.session && req.session.user_id) return res.redirect('/pegawai');
  res.sendFile(path.join(VIEWS_DIR, 'pegawai.html'));
});

// ---- ringkasan bulan ini (admin) ----
app.get('/api/ringkasan', requireAdmin, async (req, res) => {
  const { dari, sampai } = req.query;
  const [rows] = await db.query(
    'SELECT status, COUNT(*) AS jumlah FROM absen WHERE tanggal BETWEEN ? AND ? GROUP BY status',
    [dari, sampai],
  );
  const map = { hadir: 0, izin: 0, alpa: 0, terlambat: 0 };
  rows.forEach((r) => { map[r.status] = r.jumlah; });
  res.json({
    items: [
      { label: 'Hadir', jumlah: map.hadir },
      { label: 'Izin', jumlah: map.izin },
      { label: 'Alpa', jumlah: map.alpa },
      { label: 'Terlambat', jumlah: map.terlambat },
    ],
  });
});

// ---- pegawai CRUD ----
app.get('/api/pegawai', requireAdmin, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, nama_lengkap, nip, departemen, status_aktif FROM pegawai ORDER BY id',
  );
  res.json(rows);
});

app.post('/api/pegawai/tambah', requireAdmin, async (req, res) => {
  const { nama_lengkap, nip, departemen } = req.body || {};
  if (!nama_lengkap || String(nama_lengkap).trim() === '') {
    return sendJson(res, 400, { error: 'Nama lengkap wajib diisi' });
  }
  const [r] = await db.query(
    'INSERT INTO pegawai (nama_lengkap, nip, departemen) VALUES (?, ?, ?)',
    [nama_lengkap, nip || null, departemen || null],
  );
  res.json({ ok: true, id: r.insertId });
});

app.post('/api/pegawai/edit/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [exists] = await db.query('SELECT id FROM pegawai WHERE id = ?', [id]);
  if (!exists.length) return sendJson(res, 404, { error: 'Pegawai tidak ditemukan' });
  const { nama_lengkap, nip, departemen } = req.body || {};
  await db.query('UPDATE pegawai SET nama_lengkap = ?, nip = ?, departemen = ? WHERE id = ?', [
    nama_lengkap || null, nip || null, departemen || null, id,
  ]);
  res.json({ ok: true });
});

app.post('/api/pegawai/hapus/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.query('DELETE FROM pegawai WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ---- rekap ----
app.get('/api/rekap', requireAdmin, async (req, res) => {
  const { dari, sampai, pegawai_id } = req.query;
  const sqlParts = [
    'SELECT a.id, a.tanggal, a.jam_masuk, a.jam_pulang, a.status, a.menit_terlambat, a.keterangan, p.nama_lengkap',
    'FROM absen a LEFT JOIN pegawai p ON p.id = a.pegawai_id',
    'WHERE a.tanggal BETWEEN ? AND ?',
  ];
  const binds = [dari, sampai];
  if (pegawai_id && String(pegawai_id) !== '') {
    sqlParts.push('AND a.pegawai_id = ?');
    binds.push(pegawai_id);
  }
  sqlParts.push('ORDER BY a.tanggal, p.nama_lengkap');
  const [rows] = await db.query(sqlParts.join(' '), binds);
  res.json(rows);
});

app.get('/api/rekap-pegawai', (req, res) => {
  const s = req.session || {};
  if (!s.user_id) return sendJson(res, 401, { error: 'Login dulu' });
  const bulan = (req.query.bulan || '').slice(0, 7);
  db.query(
    'SELECT tanggal, jam_masuk, jam_pulang, status, menit_terlambat, keterangan FROM absen WHERE pegawai_id = ? AND DATE_FORMAT(tanggal, ? ) = ? ORDER BY tanggal DESC',
    [s.user_id, '%Y-%m', bulan],
  )
    .then(([rows]) => res.json(rows))
    .catch((e) => sendJson(res, 500, { error: e.message }));
});

// ---- export CSV ----
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return String(v);
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

app.get('/api/export', requireAdmin, async (req, res) => {
  const { dari, sampai } = req.query;
  const [rows] = await db.query(
    'SELECT a.tanggal, p.nama_lengkap, a.jam_masuk, a.jam_pulang, a.status, a.menit_terlambat, a.keterangan FROM absen a LEFT JOIN pegawai p ON p.id = a.pegawai_id WHERE a.tanggal BETWEEN ? AND ? ORDER BY a.tanggal, p.nama_lengkap',
    [dari, sampai],
  );
  const lines = rows.map(
    (r) =>
      [r.tanggal, r.nama_lengkap || '', r.jam_masuk || '', r.jam_pulang || '', r.status, r.menit_terlambat || 0, r.keterangan || '']
        .map(csvEscape)
        .join(','),
  );
  const csv = 'tanggal,pegawai,jam_masuk,jam_pulang,status,menit_terlambat,keterangan\n' + lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=absensi_${String(dari).replace(/-/g, '')}_${String(sampai).replace(/-/g, '')}.csv`,
  );
  res.send(csv);
});

// ---- absen pegawai (input manual) ----
app.post('/api/absen', (req, res) => {
  const s = req.session || {};
  if (!s.user_id) return sendJson(res, 401, { error: 'Login dulu' });
  const { tanggal, status, jam_masuk, jam_pulang, keterangan } = req.body || {};
  if (!tanggal) return sendJson(res, 400, { error: 'Tanggal wajib diisi' });
  if (!['hadir', 'izin', 'alpa', 'terlambat'].includes(status)) {
    return sendJson(res, 400, { error: 'Status tidak valid' });
  }
  db.query('SELECT id FROM absen WHERE pegawai_id = ? AND tanggal = ?', [s.user_id, tanggal])
    .then(async ([rows]) => {
      if (rows.length) {
        await db.query(
          'UPDATE absen SET status = ?, jam_masuk = ?, jam_pulang = ?, keterangan = ? WHERE id = ?',
          [status, jam_masuk || null, jam_pulang || null, keterangan || null, rows[0].id],
        );
      } else {
        await db.query(
          'INSERT INTO absen (pegawai_id, tanggal, status, jam_masuk, jam_pulang, keterangan, admin_id) VALUES (?, ?, ?, ?, ?, ?, NULL)',
          [s.user_id, tanggal, status, jam_masuk || null, jam_pulang || null, keterangan || null],
        );
      }
      res.json({ ok: true });
    })
    .catch((e) => sendJson(res, 500, { error: e.message }));
});

app.get('/', (req, res) => {
  res.send('server jalan di http://localhost:' + PORT);
});

app.listen(PORT, () => {
  console.log('server jalan di http://localhost:' + PORT);
});
