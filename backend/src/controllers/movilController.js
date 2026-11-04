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
