require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@fixtechsupport.com';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO usuarios (email, password, nombre) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
    [email, hash, 'Administrador']
  );
  console.log(`Usuario admin creado: ${email} / ${password}`);
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
