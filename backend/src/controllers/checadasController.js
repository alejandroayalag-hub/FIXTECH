const CheckadaModel = require('../models/checada');
const hikEvento = require('../utils/hikEvento');

// Llamado por el agente local con su api_key
exports.sync = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Falta x-api-key' });

    const dispositivo = await CheckadaModel.getDispositivo(apiKey);
    if (!dispositivo) return res.status(401).json({ error: 'Dispositivo no autorizado' });

    const { registros } = req.body;
    if (!Array.isArray(registros) || registros.length === 0)
      return res.status(400).json({ error: 'Sin registros' });

    const insertadas = await CheckadaModel.syncBatch(dispositivo.id, registros);
    res.json({ ok: true, insertadas: insertadas.length });
  } catch (err) { next(err); }
};

// Checadas de un empleado (panel web)
exports.getByEmpleado = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const checadas = await CheckadaModel.findByEmpleado(req.params.empleadoId, { desde, hasta });
    res.json(checadas);
  } catch (err) { next(err); }
};

exports.getByDia = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || isNaN(Date.parse(fecha))) {
      return res.status(400).json({ error: 'Fecha inválida (YYYY-MM-DD)' });
    }
    res.json(await CheckadaModel.findByDia(fecha));
  } catch (err) { next(err); }
};

// Mapeos uid_checador → empleado
exports.getMappings = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Falta x-api-key' });
    const dispositivo = await CheckadaModel.getDispositivo(apiKey);
    if (!dispositivo) return res.status(401).json({ error: 'Dispositivo no autorizado' });
    const mappings = await CheckadaModel.getMappings(dispositivo.id);
    res.json(mappings);
  } catch (err) { next(err); }
};

// Crear/actualizar mapeo (admin)
exports.upsertMapping = async (req, res, next) => {
  try {
    const { dispositivo_id, empleado_id, uid_checador } = req.body;
    if (!dispositivo_id || !empleado_id || uid_checador == null)
      return res.status(400).json({ error: 'Faltan campos: dispositivo_id, empleado_id, uid_checador' });
    const r = await CheckadaModel.upsertMapping(dispositivo_id, empleado_id, uid_checador);
    res.status(201).json(r);
  } catch (err) { next(err); }
};

// Todos los mapeos (admin)
exports.getAllMappings = async (req, res, next) => {
  try {
    const mappings = await CheckadaModel.getAllMappings();
    res.json(mappings);
  } catch (err) { next(err); }
};

// Eliminar mapeo (admin)
exports.deleteMapping = async (req, res, next) => {
  try {
    await CheckadaModel.deleteMapping(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

// Listar dispositivos (admin)
exports.getDispositivos = async (req, res, next) => {
  try {
    const dispositivos = await CheckadaModel.getAllDispositivos();
    res.json(dispositivos);
  } catch (err) { next(err); }
};

// Reloj Hikvision (HTTP Listening). La llave va en la URL porque el reloj no manda encabezados propios.
// Siempre responde 200 a eventos que no son checada para que el reloj no los reintente.
exports.hikEvento = async (req, res, next) => {
  try {
    const dispositivo = await CheckadaModel.getDispositivo(req.params.apiKey);
    if (!dispositivo) return res.status(401).json({ error: 'Dispositivo no autorizado' });
    const registro = hikEvento(req.body);
    if (registro) await CheckadaModel.syncBatch(dispositivo.id, [registro]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
