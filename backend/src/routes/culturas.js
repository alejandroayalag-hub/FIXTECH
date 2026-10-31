const router = require('express').Router();
const ctrl = require('../controllers/culturasController');
const upload = require('../middleware/upload');
const requireRole = require('../middleware/requireRole');

// GET /api/culturas/empresa/:empresaId
router.get('/empresa/:empresaId', ctrl.getCulturasByEmpresa);

// POST /api/culturas
router.post('/', requireRole('admin'), ctrl.createCultura);

// GET /api/culturas/:culturaId
router.get('/:culturaId', ctrl.getCulturaById);

// PUT /api/culturas/:culturaId
router.put('/:culturaId', requireRole('admin'), ctrl.updateCultura);

// DELETE /api/culturas/:culturaId
router.delete('/:culturaId', requireRole('admin'), ctrl.deleteCultura);

// POST /api/culturas/:culturaId/archivos
router.post('/:culturaId/archivos', requireRole('admin'), upload.single('archivo'), ctrl.subirArchivo);

// DELETE /api/culturas/:culturaId/archivos/:archivoId
router.delete('/:culturaId/archivos/:archivoId', requireRole('admin'), ctrl.eliminarArchivo);

module.exports = router;
