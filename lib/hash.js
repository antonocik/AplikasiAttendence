const crypto = require('crypto');

const ITERATIONS = 20000;
const SALT_BYTES = 8;

function pbkdf2Hex(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex');
}

function hashPassword(password, salt = crypto.randomBytes(SALT_BYTES).toString('hex')) {
  return `pbkdf2-sha256$${ITERATIONS}$${salt}$${pbkdf2Hex(password, salt)}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const [, iters, salt, hash] = parts;
  if (!salt || !hash) return false;
  const expected = crypto.pbkdf2Sync(password, salt, Number(iters), 32, 'sha256');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword, ITERATIONS, SALT_BYTES };
