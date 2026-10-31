const router = require('express').Router();
const ctrl = require('../controllers/documentosSalidaController');
const upload = require('../middleware/upload');
const requireRole = require('../middleware/requireRole');

// GET /api/documentosSalida?estado=&tipoDocumento=&salidaId=
router.get('/', ctrl.getAllDocumentos);

// GET /api/documentosSalida/documento/:documentoId
router.get('/documento/:documentoId', ctrl.obtenerDocumentoPorId);

// GET /api/documentosSalida/:documentoId/descargar-escaneado
router.get('/:documentoId/descargar-escaneado', ctrl.descargarEscaneado);

// DELETE /api/documentosSalida/:documentoId/escaneado
router.delete('/:documentoId/escaneado', requireRole('admin', 'rh'), ctrl.eliminarEscaneado);

// POST /api/documentosSalida/:documentoId/subir-escaneado
router.post('/:documentoId/subir-escaneado', requireRole('admin', 'rh'), upload.single('archivo'), ctrl.subirEscaneado);

// POST /api/documentosSalida/:salidaId/:tipo/generar-template
router.post('/:salidaId/:tipo/generar-template', requireRole('admin', 'rh'), ctrl.generarTemplate);

// GET /api/documentosSalida/:salidaId
router.get('/:salidaId', ctrl.obtenerDocumentos);

module.exports = router;
