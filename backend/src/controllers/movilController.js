const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

exports.login = async (req, res, next) => {
  try {
    const { empleado, pin } = req.body || {};
    if (empleado === undefined || empleado === null || empleado === '' || !pin) {
      return res.status(400).json({ error: 'Empleado y PIN son obligatorios' });
    }
    const id = Number(empleado);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const { rows } = await pool.query(
      'SELECT id, nombre, apellido_paterno, estado, estatus, pin_hash FROM empleados WHERE id = $1',
      [id]
    );
    const emp = rows[0];
    if (!emp || !emp.pin_hash || !(await bcrypt.compare(String(pin), emp.pin_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    if (emp.estado !== 'activo' || emp.estatus !== 'activo') {
      return res.status(403).json({ error: 'Empleado inactivo' });
    }
    const token = jwt.sign({ role: 'empleado', empleado_id: emp.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, nombre: `${emp.nombre} ${emp.apellido_paterno}` });
  } catch (err) { next(err); }
};

const esUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const resolverTimestamp = require('../utils/resolverTimestamp');
const { fechaMx } = require('../utils/horaMexico');

const hhmm = (t) => (t ? String(t).slice(0, 5) : null);
const numOrNull = (v) => (v === undefined || v === null || v === '' || !isFinite(Number(v)) ? null : Number(v));

exports.yo = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, apellido_paterno, hora_entrada, hora_salida, dias FROM empleados WHERE id = $1',
      [req.empleado.id]
    );
    const e = rows[0];
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    const ult = await pool.query(
      `SELECT tipo, timestamp FROM checadas
       WHERE empleado_id = $1 AND (timestamp AT TIME ZONE 'America/Mexico_City')::date = $2::date
       ORDER BY timestamp DESC LIMIT 1`,
      [e.id, fechaMx(new Date())]
    );
    res.json({
      id: e.id,
      nombre: `${e.nombre} ${e.apellido_paterno}`,
      hora_entrada: hhmm(e.hora_entrada),
      hora_salida: hhmm(e.hora_salida),
      dias: e.dias || [],
      ultima_hoy: ult.rows[0] || null,
    });
  } catch (err) { next(err); }
};

exports.crearChecada = async (req, res, next) => {
  try {
    const { client_id, tipo, timestamp_dispositivo, lat, lng, precision_m } = req.body || {};
    if (!esUuid(String(client_id))) return res.status(400).json({ error: 'client_id inválido' });
    if (tipo !== 'entrada' && tipo !== 'salida') return res.status(400).json({ error: 'Tipo inválido' });

    const emp = await pool.query('SELECT estado, estatus FROM empleados WHERE id = $1', [req.empleado.id]);
    const e = emp.rows[0];
    if (!e || e.estado !== 'activo' || e.estatus !== 'activo') {
      return res.status(403).json({ error: 'Empleado inactivo' });
    }

    const { timestamp, hora_dudosa } = resolverTimestamp(timestamp_dispositivo, new Date());
    const dev = typeof timestamp_dispositivo === 'string' && !isNaN(new Date(timestamp_dispositivo))
      ? new Date(timestamp_dispositivo) : null;
    const ins = await pool.query(
      `INSERT INTO checadas (empleado_id, timestamp, tipo, origen, lat, lng, precision_m, timestamp_dispositivo, client_id, hora_dudosa)
       VALUES ($1, $2, $3, 'app', $4, $5, $6, $7, $8, $9)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING *`,
      [req.empleado.id, timestamp, tipo, numOrNull(lat), numOrNull(lng), numOrNull(precision_m), dev, client_id, hora_dudosa]
    );
    if (ins.rows[0]) return res.status(201).json(ins.rows[0]);
    const ex = await pool.query('SELECT * FROM checadas WHERE client_id = $1 AND empleado_id = $2', [client_id, req.empleado.id]);
    if (!ex.rows[0]) return res.status(409).json({ error: 'client_id en uso' });
    res.status(200).json(ex.rows[0]);
  } catch (err) { next(err); }
};

exports.avisos = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, titulo, mensaje, vigente_desde, vigente_hasta FROM avisos_gerencia
       WHERE activo AND vigente_desde <= $1::date AND (vigente_hasta IS NULL OR vigente_hasta >= $1::date)
       ORDER BY created_at DESC`,
      [fechaMx(new Date())]
    );
    res.json(rows);
  } catch (err) { next(err); }
};
