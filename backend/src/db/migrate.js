const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  // Tabla de control de migraciones aplicadas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE filename=$1', [file]);
    if (rows.length) continue; // ya aplicada

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`Migración aplicada: ${file}`);
  }
}

module.exports = runMigrations;
