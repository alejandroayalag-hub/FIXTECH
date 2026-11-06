const router = require('express').Router();
const ctrl = require('../controllers/reportesController');

// GET /api/reportes/asistencia.xlsx?desde&hasta (antes que /asistencia por claridad)
router.get('/asistencia.xlsx', ctrl.asistenciaXlsx);

// GET /api/reportes/nomipaq-dyh.xlsx?desde — semana de 7 días para la prenómina DYH de NOMIPAQ
router.get('/nomipaq-dyh.xlsx', ctrl.nomipaqDyhXlsx);

// GET /api/reportes/asistencia?desde&hasta
router.get('/asistencia', ctrl.asistencia);

module.exports = router;
