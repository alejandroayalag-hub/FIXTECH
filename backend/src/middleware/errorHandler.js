function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  // No filtrar detalle interno en 500; los errores de negocio traen status<500 + mensaje seguro.
  const message = status >= 500 ? 'Error interno del servidor' : (err.message || 'Error');
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
