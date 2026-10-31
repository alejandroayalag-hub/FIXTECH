const path = require('path');
const fs = require('fs');
const DocumentoModel = require('../models/documento');

exports.getTipos = async (req, res, next) => {
  try {
    const tipos = await DocumentoModel.findTipos();
    res.json(tipos);
  } catch (err) { next(err); }
};

exports.getByEmpleado = async (req, res, next) => {
  try {
    const docs = await DocumentoModel.findByEmpleado(req.params.empleadoId);
    res.json(docs);
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const { empleado_id, tipo_documento_id, estatus } = req.body;
    const doc = await DocumentoModel.upsert({
      empleado_id,
      tipo_documento_id,
      filename: req.file.originalname,
      ruta: req.file.path,
      estatus,
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await DocumentoModel.delete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    if (fs.existsSync(doc.ruta)) fs.unlinkSync(doc.ruta);
    res.status(204).end();
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const doc = await DocumentoModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    if (!fs.existsSync(doc.ruta)) return res.status(404).json({ error: 'El archivo ya no existe en el servidor. Por favor vuelve a subirlo.' });
    res.download(path.resolve(doc.ruta), doc.filename);
  } catch (err) { next(err); }
};
