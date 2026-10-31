const SalidaModel = require('../models/salida');
const EmpleadoModel = require('../models/empleado');
const DocumentoSalidaModel = require('../models/documentoSalida');
const { tiposDocumentoParaSalida } = require('../constants/documentosSalida');

const TIPOS_SALIDA = ['renuncia', 'despido', 'jubilacion', 'otro'];
const ESTADOS_SALIDA = ['pendiente', 'en_proceso', 'completado'];

// GET /api/salidas
exports.getAllSalidas = async (req, res, next) => {
  try {
    const { estado, empresaId, empleadoId } = req.query;

    if (estado && !ESTADOS_SALIDA.includes(estado)) {
      return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS_SALIDA.join(', ')}` });
    }

    const filters = {};
    if (estado) filters.estado = estado;
    if (empresaId) filters.empresaId = empresaId;
    if (empleadoId) filters.empleadoId = empleadoId;

    const salidas = await SalidaModel.findAll(filters);
    res.json(salidas);
  } catch (err) { next(err); }
};

// GET /api/salidas/:salidaId
exports.getSalidaById = async (req, res, next) => {
  try {
    const salida = await SalidaModel.findById(req.params.salidaId);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    const documentos = await DocumentoSalidaModel.findBySalidaId(salida.id);
    res.json({ ...salida, documentos });
  } catch (err) { next(err); }
};

// GET /api/salidas/empleado/:empleadoId
exports.getSalidasByEmpleado = async (req, res, next) => {
  try {
    const salidas = await SalidaModel.findByEmpleadoId(req.params.empleadoId);
    res.json(salidas);
  } catch (err) { next(err); }
};

// POST /api/salidas
exports.createSalida = async (req, res, next) => {
  try {
    const { empleadoId, empresaId, fechaSalida, tipoSalida, razonSalida, salarioPendiente } = req.body;

    if (!empleadoId || !empresaId || !fechaSalida || !tipoSalida || !razonSalida) {
      return res.status(400).json({ error: 'Campos requeridos: empleadoId, empresaId, fechaSalida, tipoSalida, razonSalida' });
    }

    if (!TIPOS_SALIDA.includes(tipoSalida)) {
      return res.status(400).json({ error: `tipoSalida inválido. Valores permitidos: ${TIPOS_SALIDA.join(', ')}` });
    }

    const empleado = await EmpleadoModel.findById(empleadoId);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    if (empleado.estado === 'inactivo') {
      return res.status(400).json({ error: 'No se puede crear salida de empleado inactivo' });
    }

    const salida = await SalidaModel.create({
      empleadoId,
      empresaId,
      fechaSalida,
      tipoSalida,
      razonSalida,
      salarioPendiente: salarioPendiente || 0,
      createdBy: req.user?.id,
    });

    // Crear documentos de salida vacíos (uno por cada tipo requerido; renuncia
    // vs aviso rescisorio depende del tipoSalida)
    await Promise.all(
      tiposDocumentoParaSalida(tipoSalida).map((tipoDocumento) =>
        DocumentoSalidaModel.create({
          salidaId: salida.id,
          tipoDocumento,
          createdBy: req.user?.id,
        })
      )
    );

    res.status(201).json(salida);
  } catch (err) { next(err); }
};

// PUT /api/salidas/:salidaId
exports.updateSalida = async (req, res, next) => {
  try {
    const { tipoSalida, estado } = req.body;

    if (tipoSalida && !TIPOS_SALIDA.includes(tipoSalida)) {
      return res.status(400).json({ error: `tipoSalida inválido. Valores permitidos: ${TIPOS_SALIDA.join(', ')}` });
    }
    if (estado && !ESTADOS_SALIDA.includes(estado)) {
      return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS_SALIDA.join(', ')}` });
    }

    const salida = await SalidaModel.update(req.params.salidaId, req.body);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    res.json(salida);
  } catch (err) { next(err); }
};

// DELETE /api/salidas/:salidaId
exports.deleteSalida = async (req, res, next) => {
  try {
    const salida = await SalidaModel.findById(req.params.salidaId);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    if (salida.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden eliminar salidas en estado pendiente' });
    }

    const documentos = await DocumentoSalidaModel.findBySalidaId(salida.id);
    await Promise.all(documentos.map((doc) => DocumentoSalidaModel.delete(doc.id)));

    await SalidaModel.delete(req.params.salidaId);

    res.status(204).end();
  } catch (err) { next(err); }
};

// GET /api/salidas/estado/:estado
exports.getSalidasByEstado = async (req, res, next) => {
  try {
    const { estado } = req.params;
    if (!ESTADOS_SALIDA.includes(estado)) {
      return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS_SALIDA.join(', ')}` });
    }

    const salidas = await SalidaModel.findByEstado(estado);
    res.json(salidas);
  } catch (err) { next(err); }
};
