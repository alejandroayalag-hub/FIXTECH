// Da de alta un reloj checador y muestra la URL para configurarlo.
// Uso: node scripts/alta-reloj.js "Recepción" "Oficina Uruapan" [URL_BASE]
require('dotenv').config();
const crypto = require('crypto');
const pool = require('../src/db/pool');

async function main() {
  const [nombre, ubicacion = null, base = process.env.PUBLIC_URL || 'http://62.238.3.136:8105'] = process.argv.slice(2);
  if (!nombre) throw new Error('Falta el nombre del reloj');
  const apiKey = crypto.randomBytes(16).toString('hex');
  const { rows: [d] } = await pool.query(
    'INSERT INTO checador_dispositivos (nombre, ubicacion, api_key) VALUES ($1,$2,$3) RETURNING id',
    [nombre, ubicacion, apiKey]
  );
  const url = new URL(`/api/checadas/hik/${apiKey}`, base);
  console.log(`Reloj #${d.id} "${nombre}" dado de alta.`);
  console.log('En el reloj: Configuración → Red → Avanzado → HTTP Listening');
  console.log(`  Protocolo: ${url.protocol.replace(':', '').toUpperCase()}  IP/dominio: ${url.hostname}  Puerto: ${url.port || (url.protocol === 'https:' ? 443 : 80)}`);
  console.log(`  URL: ${url.pathname}`);
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
