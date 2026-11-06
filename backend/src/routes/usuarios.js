const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireRole = require('../middleware/requireRole');

const ROLES = ['admin', 'rh'];
const COLS = 'id, email, nombre, role, created_at';

router.use(requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${COLS} FROM usuarios ORDER BY nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, nombre, password, role } = req.body;
    if (!email?.trim() || !nombre?.trim()) return res.status(400).json({ error: 'Nombre y email requeridos' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (email, nombre, password, role) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [email.trim().toLowerCase(), nombre.trim(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, role, password } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    if (id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'No puedes quitarte el rol de admin' });
    if (password && password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre = $1, role = $2, password = COALESCE($3, password) WHERE id = $4 RETURNING ${COLS}`,
      [nombre.trim(), role, hash, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'No puedes borrar tu propio usuario' });
    const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
