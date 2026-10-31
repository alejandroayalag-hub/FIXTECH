const fs = require('fs');
const EmpleadoModel = require('../models/empleado');

exports.getAll = async (req, res, next) => {
  try {
    const { estado } = req.query;
    if (estado && !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ error: "estado debe ser 'activo' o 'inactivo'" });
    }
    const empleados = await EmpleadoModel.findAll({ estado });
    res.json(empleados);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const empleado = await EmpleadoModel.findById(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { curp, rfc, fecha_ingreso, email } = req.body;
    if (!curp || !rfc || !fecha_ingreso || !email)
      return res.status(400).json({ error: 'CURP, RFC, Fecha de ingreso y Email son obligatorios' });
    const empleado = await EmpleadoModel.create(req.body);
    res.status(201).json(empleado);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const empleado = await EmpleadoModel.update(req.params.id, req.body);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await EmpleadoModel.delete(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

exports.uploadFoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const empleado = await EmpleadoModel.findById(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    if (empleado.foto && fs.existsSync(empleado.foto)) fs.unlinkSync(empleado.foto);
    const updated = await EmpleadoModel.update(req.params.id, { foto: req.file.path });
    res.json(updated);
  } catch (err) { next(err); }
};
