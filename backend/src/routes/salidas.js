const router = require('express').Router();
const ctrl = require('../controllers/salidasController');
const requireRole = require('../middleware/requireRole');

// GET /api/salidas?estado=&empresaId=&empleadoId=
router.get('/', ctrl.getAllSalidas);

// GET /api/salidas/empleado/:empleadoId
router.get('/empleado/:empleadoId', ctrl.getSalidasByEmpleado);

// GET /api/salidas/estado/:estado
router.get('/estado/:estado', ctrl.getSalidasByEstado);

// POST /api/salidas
router.post('/', requireRole('admin', 'rh'), ctrl.createSalida);

// GET /api/salidas/:salidaId
router.get('/:salidaId', ctrl.getSalidaById);

// PUT /api/salidas/:salidaId
router.put('/:salidaId', requireRole('admin', 'rh'), ctrl.updateSalida);

// DELETE /api/salidas/:salidaId
router.delete('/:salidaId', requireRole('admin', 'rh'), ctrl.deleteSalida);

module.exports = router;
