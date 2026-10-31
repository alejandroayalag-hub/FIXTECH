const fs = require('fs');
const path = require('path');
const DocumentoSalidaModel = require('../models/documentoSalida');
const SalidaModel = require('../models/salida');
const EmpleadoModel = require('../models/empleado');
const { TIPOS_DOCUMENTO_SALIDA: TIPOS_DOCUMENTO } = require('../constants/documentosSalida');

const ESTADOS_DOCUMENTO = ['template_generado', 'completado'];

// Genera el contenido de texto del template según el tipo de documento
function construirTemplate(tipo, empleado, salida) {
  const nombreEmpleado = [empleado.nombre, empleado.apellido_paterno, empleado.apellido_materno]
    .filter(Boolean)
    .join(' ');
  const fechaSalida = salida.fecha_salida ? new Date(salida.fecha_salida).toLocaleDateString() : '';
  const fechaGeneracion = new Date().toLocaleDateString();

  switch (tipo) {
    case 'finiquito':
      return [
        'FINIQUITO',
        'Documento Oficial de Finiquito',
        '',
        'DATOS DEL EMPLEADO',
        `Nombre: ${nombreEmpleado}`,
        `Email: ${empleado.email || ''}`,
        `Fecha de Salida: ${fechaSalida}`,
        '',
        'DETALLES DEL FINIQUITO',
        `Salario Pendiente: $${salida.salario_pendiente || 0}`,
        'Concepto: Terminación de relación laboral',
        `Fecha de Generación: ${fechaGeneracion}`,
        '',
        'FIRMAS Y SELLOS',
        'Empleado: ________________',
        'Empresa: ________________',
        'Huella: _________________',
      ].join('\n');
    case 'renuncia':
      return [
        'CARTA DE RENUNCIA',
        '',
        `Nombre: ${nombreEmpleado}`,
        `Fecha de Salida: ${fechaSalida}`,
        `Razón: ${salida.razon_salida || ''}`,
        '',
        'Firma del empleado: ________________',
      ].join('\n');
    case 'aviso_rescisorio':
      return [
        'AVISO RESCISORIO',
        '',
        `Nombre: ${nombreEmpleado}`,
        `Fecha de Salida: ${fechaSalida}`,
        `Razón: ${salida.razon_salida || ''}`,
        '',
        'Notificación de rescisión de la relación laboral sin responsabilidad para el trabajador / patrón,',
        'conforme a los artículos aplicables de la Ley Federal del Trabajo.',
        '',
        'Firma del patrón: ________________',
        'Firma del trabajador (de recibido): ________________',
      ].join('\n');
    case 'baja_imss':
      return [
        'AVISO DE BAJA ANTE EL IMSS',
        '',
        `Nombre: ${nombreEmpleado}`,
        `Fecha de Salida: ${fechaSalida}`,
        '',
        'Movimiento afiliatorio: Baja',
        'Folio IDSE: ________________',
        'Fecha de presentación ante el IMSS: ________________',
        '',
        'Firma responsable: ________________',
      ].join('\n');
    case 'entrega_materiales':
      return [
        'ENTREGA DE MATERIALES',
        '',
        `Nombre: ${nombreEmpleado}`,
        `Fecha de Salida: ${fechaSalida}`,
        '',
        'Materiales entregados: ________________',
        'Firma de recepción: ________________',
      ].join('\n');
    case 'encuesta_salida':
      return [
        'ENCUESTA DE SALIDA',
        '',
        `Nombre: ${nombreEmpleado}`,
        `Fecha de Salida: ${fechaSalida}`,
        '',
        'Motivo principal de salida: ________________',
        'Comentarios: ________________',
      ].join('\n');
    default:
      return '';
  }
}

// GET /api/documentosSalida/:salidaId
exports.obtenerDocumentos = async (req, res, next) => {
  try {
    const { salidaId } = req.params;

    const salida = await SalidaModel.findById(salidaId);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    const documentos = await DocumentoSalidaModel.findBySalidaId(salidaId);
    res.json(documentos);
  } catch (err) { next(err); }
};

// GET /api/documentosSalida/documento/:documentoId
exports.obtenerDocumentoPorId = async (req, res, next) => {
  try {
    const documento = await DocumentoSalidaModel.findById(req.params.documentoId);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(documento);
  } catch (err) { next(err); }
};

// GET /api/documentosSalida?estado=&tipoDocumento=&salidaId=
exports.getAllDocumentos = async (req, res, next) => {
  try {
    const { estado, tipoDocumento, salidaId } = req.query;

    if (estado && !ESTADOS_DOCUMENTO.includes(estado)) {
      return res.status(400).json({ error: `estado inválido. Valores permitidos: ${ESTADOS_DOCUMENTO.join(', ')}` });
    }
    if (tipoDocumento && !TIPOS_DOCUMENTO.includes(tipoDocumento)) {
      return res.status(400).json({ error: `tipoDocumento inválido. Valores permitidos: ${TIPOS_DOCUMENTO.join(', ')}` });
    }

    const filters = {};
    if (estado) filters.estado = estado;
    if (tipoDocumento) filters.tipoDocumento = tipoDocumento;
    if (salidaId) filters.salidaId = salidaId;

    const documentos = await DocumentoSalidaModel.findAll(filters);
    res.json(documentos);
  } catch (err) { next(err); }
};

// POST /api/documentosSalida/:salidaId/:tipo/generar-template
exports.generarTemplate = async (req, res, next) => {
  try {
    const { salidaId, tipo } = req.params;

    if (!TIPOS_DOCUMENTO.includes(tipo)) {
      return res.status(400).json({ error: `tipo inválido. Valores permitidos: ${TIPOS_DOCUMENTO.join(', ')}` });
    }

    const salida = await SalidaModel.findById(salidaId);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    const empleado = await EmpleadoModel.findById(salida.empleado_id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    const documentos = await DocumentoSalidaModel.findBySalidaId(salidaId);
    const documento = documentos.find((d) => d.tipo_documento === tipo);
    if (!documento) return res.status(404).json({ error: 'Documento de salida no encontrado para este tipo' });

    const templateContenido = construirTemplate(tipo, empleado, salida);

    const actualizado = await DocumentoSalidaModel.update(documento.id, {
      templateContenido,
      templateFechaGeneracion: new Date(),
      estado: 'template_generado',
    });

    res.json(actualizado);
  } catch (err) { next(err); }
};

// POST /api/documentosSalida/:documentoId/subir-escaneado
exports.subirEscaneado = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const documento = await DocumentoSalidaModel.findById(req.params.documentoId);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    if (!documento.template_contenido && !documento.template_url) {
      return res.status(400).json({ error: 'Debe generar el template primero' });
    }

    const actualizado = await DocumentoSalidaModel.update(documento.id, {
      documentoUrl: req.file.path,
      documentoNombre: req.file.originalname,
      documentoFechaCarga: new Date(),
      documentoTamano: req.file.size,
      documentoTieneHuella: req.body.tieneHuella === 'true' || req.body.tieneHuella === true,
      documentoTieneFirma: req.body.tieneFirma === 'true' || req.body.tieneFirma === true,
      estado: 'completado',
    });

    // Si todos los documentos de la salida quedaron completados, marcar la salida y al empleado
    const documentosSalida = await DocumentoSalidaModel.findBySalidaId(documento.salida_id);
    const todosCompletados = documentosSalida.length > 0 && documentosSalida.every((d) => d.estado === 'completado');

    if (todosCompletados) {
      const salidaActualizada = await SalidaModel.update(documento.salida_id, {
        estado: 'completado',
        documentosFirmados: true,
      });
      if (salidaActualizada) {
        await EmpleadoModel.update(salidaActualizada.empleado_id, { estado: 'inactivo' });
      }
    } else {
      await SalidaModel.update(documento.salida_id, { estado: 'en_proceso' });
    }

    res.json(actualizado);
  } catch (err) { next(err); }
};

// GET /api/documentosSalida/:documentoId/descargar-escaneado
exports.descargarEscaneado = async (req, res, next) => {
  try {
    const documento = await DocumentoSalidaModel.findById(req.params.documentoId);
    if (!documento || !documento.documento_url) {
      return res.status(404).json({ error: 'Escaneado no encontrado' });
    }
    if (!fs.existsSync(documento.documento_url)) {
      return res.status(404).json({ error: 'El archivo ya no existe en el servidor. Por favor vuelve a subirlo.' });
    }

    const safeName = documento.documento_nombre
      ? documento.documento_nombre.replace(/[^\w.\- ]/g, '_')
      : undefined;
    res.download(path.resolve(documento.documento_url), safeName);
  } catch (err) { next(err); }
};

// DELETE /api/documentosSalida/:documentoId/escaneado
exports.eliminarEscaneado = async (req, res, next) => {
  try {
    const documento = await DocumentoSalidaModel.findById(req.params.documentoId);
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    if (documento.documento_url && fs.existsSync(documento.documento_url)) {
      fs.unlinkSync(documento.documento_url);
    }

    const actualizado = await DocumentoSalidaModel.update(documento.id, {
      documentoUrl: null,
      documentoNombre: null,
      documentoFechaCarga: null,
      documentoTamano: null,
      documentoTieneHuella: null,
      documentoTieneFirma: null,
      estado: 'template_generado',
    });

    await SalidaModel.update(documento.salida_id, { estado: 'en_proceso' });

    res.json(actualizado);
  } catch (err) { next(err); }
};
