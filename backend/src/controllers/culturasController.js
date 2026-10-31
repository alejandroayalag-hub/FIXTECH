const fs = require('fs');
const { randomUUID } = require('crypto');
const CulturaEmpresaModel = require('../models/culturaEmpresa');

const TIPOS_CULTURA = ['mision', 'vision', 'valores', 'codigo_conducta', 'politicas', 'otro'];

// GET /api/culturas/empresa/:empresaId
exports.getCulturasByEmpresa = async (req, res, next) => {
  try {
    const { empresaId } = req.params;

    const culturas = await CulturaEmpresaModel.findActiveByEmpresaId(empresaId);
    res.json(culturas);
  } catch (err) { next(err); }
};

// GET /api/culturas/:culturaId
exports.getCulturaById = async (req, res, next) => {
  try {
    const cultura = await CulturaEmpresaModel.findById(req.params.culturaId);
    if (!cultura) return res.status(404).json({ error: 'Cultura no encontrada' });

    res.json(cultura);
  } catch (err) { next(err); }
};

// POST /api/culturas
exports.createCultura = async (req, res, next) => {
  try {
    const { empresaId, tipo, titulo, descripcion } = req.body;

    if (!empresaId || !tipo || !titulo) {
      return res.status(400).json({ error: 'Campos requeridos: empresaId, tipo, titulo' });
    }

    if (!TIPOS_CULTURA.includes(tipo)) {
      return res.status(400).json({ error: `tipo inválido. Valores permitidos: ${TIPOS_CULTURA.join(', ')}` });
    }

    const existe = await CulturaEmpresaModel.findByEmpresaIdAndTipo(empresaId, tipo);
    if (existe) {
      return res.status(400).json({ error: `Ya existe un elemento de tipo ${tipo} para esta empresa` });
    }

    const culturasEmpresa = await CulturaEmpresaModel.findByEmpresaId(empresaId);
    const maxOrden = culturasEmpresa.reduce((max, c) => Math.max(max, c.orden || 0), 0);

    const cultura = await CulturaEmpresaModel.create({
      empresaId,
      tipo,
      titulo,
      descripcion: descripcion || '',
      orden: maxOrden + 1,
      createdBy: req.user?.id,
    });

    res.status(201).json(cultura);
  } catch (err) { next(err); }
};

// PUT /api/culturas/:culturaId
exports.updateCultura = async (req, res, next) => {
  try {
    const { tipo } = req.body;

    if (tipo && !TIPOS_CULTURA.includes(tipo)) {
      return res.status(400).json({ error: `tipo inválido. Valores permitidos: ${TIPOS_CULTURA.join(', ')}` });
    }

    const cultura = await CulturaEmpresaModel.update(req.params.culturaId, req.body);
    if (!cultura) return res.status(404).json({ error: 'Cultura no encontrada' });

    res.json(cultura);
  } catch (err) { next(err); }
};

// DELETE /api/culturas/:culturaId
exports.deleteCultura = async (req, res, next) => {
  try {
    const cultura = await CulturaEmpresaModel.findById(req.params.culturaId);
    if (!cultura) return res.status(404).json({ error: 'Cultura no encontrada' });

    await CulturaEmpresaModel.delete(req.params.culturaId);

    res.status(204).end();
  } catch (err) { next(err); }
};

// POST /api/culturas/:culturaId/archivos
exports.subirArchivo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const cultura = await CulturaEmpresaModel.findById(req.params.culturaId);
    if (!cultura) return res.status(404).json({ error: 'Cultura no encontrada' });

    const archivo = {
      id: randomUUID(),
      nombre: req.file.originalname,
      url: req.file.path,
      tipo: req.file.mimetype,
      tamano: req.file.size,
    };

    const actualizado = await CulturaEmpresaModel.addArchivo(req.params.culturaId, archivo);

    res.status(201).json(actualizado);
  } catch (err) { next(err); }
};

// DELETE /api/culturas/:culturaId/archivos/:archivoId
exports.eliminarArchivo = async (req, res, next) => {
  try {
    const { culturaId, archivoId } = req.params;

    const cultura = await CulturaEmpresaModel.findById(culturaId);
    if (!cultura) return res.status(404).json({ error: 'Cultura no encontrada' });

    const archivos = Array.isArray(cultura.archivos)
      ? cultura.archivos
      : JSON.parse(cultura.archivos || '[]');
    const archivo = archivos.find((a) => String(a.id) === String(archivoId));
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' });

    if (archivo.url && fs.existsSync(archivo.url)) {
      fs.unlinkSync(archivo.url);
    }

    const actualizado = await CulturaEmpresaModel.removeArchivo(culturaId, archivoId);

    res.json(actualizado);
  } catch (err) { next(err); }
};
