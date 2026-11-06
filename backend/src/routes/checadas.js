const router = require('express').Router();
const ctrl = require('../controllers/checadasController');
const auth = require('../middleware/auth');

// Rutas para el agente local (autenticadas por x-api-key)
router.post('/sync', ctrl.sync);
router.get('/mappings/agente', ctrl.getMappings);
// Reloj Hikvision: multipart (JSON + foto); la foto se descarta. ponytail: memoria con tope de 2 MB.
const hikMultipart = require('multer')({ limits: { fileSize: 2 * 1024 * 1024, files: 2 } }).any();
router.post('/hik/:apiKey', hikMultipart, ctrl.hikEvento);

// Rutas protegidas por JWT (panel web admin)
router.get('/dispositivos', auth, ctrl.getDispositivos);
router.get('/mappings', auth, ctrl.getAllMappings);
router.post('/mappings', auth, ctrl.upsertMapping);
router.delete('/mappings/:id', auth, ctrl.deleteMapping);
router.get('/dia', auth, ctrl.getByDia);
router.get('/empleado/:empleadoId', auth, ctrl.getByEmpleado);

module.exports = router;
