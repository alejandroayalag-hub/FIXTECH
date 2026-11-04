const pool = require('../db/pool');
const { fechaMx } = require('../utils/horaMexico');

const MAX_TITULO = 150;
const MAX_INT4 = 2147483647;

const esFecha = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
};

// Valida y normaliza el body. PUT y POST usan los mismos campos; los omitidos toman el default.
function normalizar(body) {
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
  const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
  if (!titulo) return { error: 'titulo es requerido' };
  if (titulo.length > MAX_TITULO) return { error: `titulo no puede exceder ${MAX_TITULO} caracteres` };
  if (!mensaje) return { error: 'mensaje es requerido' };

  const desde = body.vigente_desde ?? fechaMx(new Date());
  const hasta = body.vigente_hasta ?? null;
  if (!esFecha(desde)) return { error: 'vigente_desde inválida (formato YYYY-MM-DD)' };
  if (hasta !== null && !esFecha(hasta)) return { error: 'vigente_hasta inválida (formato YYYY-MM-DD)' };
  if (hasta !== null && hasta < desde) return { error: 'vigente_hasta no puede ser anterior a vigente_desde' };

  const activo = body.activo ?? true;
  if (typeof activo !== 'boolean') return { error: 'activo debe ser booleano' };

  return { titulo, mensaje, desde, hasta, activo };
}

// Devuelve el id como entero positivo o null si no es válido.
function parseId(raw) {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_INT4 ? id : null;
}

const COLUMNAS = 'id, titulo, mensaje, vigente_desde, vigente_hasta, activo, created_by, created_at';

// GET /api/avisos
exports.getAllAvisos = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNAS} FROM avisos_gerencia ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /api/avisos
exports.createAviso = async (req, res, next) => {
  try {
    const datos = normalizar(req.body || {});
    if (datos.error) return res.status(400).json({ error: datos.error });

    const { rows } = await pool.query(
      `INSERT INTO avisos_gerencia (titulo, mensaje, vigente_desde, vigente_hasta, activo, created_by)
       VALUES ($1, $2, $3::date, $4::date, $5, $6)
       RETURNING ${COLUMNAS}`,
      [datos.titulo, datos.mensaje, datos.desde, datos.hasta, datos.activo, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PUT /api/avisos/:id
exports.updateAviso = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const datos = normalizar(req.body || {});
    if (datos.error) return res.status(400).json({ error: datos.error });

    const { rows } = await pool.query(
      `UPDATE avisos_gerencia
       SET titulo = $1, mensaje = $2, vigente_desde = $3::date, vigente_hasta = $4::date, activo = $5
       WHERE id = $6
       RETURNING ${COLUMNAS}`,
      [datos.titulo, datos.mensaje, datos.desde, datos.hasta, datos.activo, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Aviso no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /api/avisos/:id
exports.deleteAviso = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const { rowCount } = await pool.query('DELETE FROM avisos_gerencia WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Aviso no encontrado' });
    res.status(204).end();
  } catch (err) { next(err); }
};
