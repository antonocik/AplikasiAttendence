require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../lib/hash');
const pool = require('../db');

const DEFAULT_ADMIN_PASSWORD = 'admin123';

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);

  const [users] = await pool.query('SELECT 1 FROM `users` WHERE `username` = ?', ['admin']);
  if (!users.length) {
    await pool.query(
      'INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES (?, ?, ?)',
      ['admin', hashPassword(DEFAULT_ADMIN_PASSWORD), 'admin'],
    );
    console.log('db:init selesai. admin di-seed dengan password default: admin123');
  } else {
    console.log('db:init selesai. admin sudah ada.');
  }
  await pool.end();
})().catch((e) => {
  console.error('db:init gagal:', e.message);
  process.exit(1);
});
