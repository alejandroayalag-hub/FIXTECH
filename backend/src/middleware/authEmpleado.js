const jwt = require('jsonwebtoken');

module.exports = function authEmpleado(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'empleado' || !payload.empleado_id) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    req.empleado = { id: payload.empleado_id };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
