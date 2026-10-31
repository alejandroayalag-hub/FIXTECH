const router = require('express').Router();
const ctrl = require('../controllers/checadasController');
const auth = require('../middleware/auth');

// Rutas para el agente local (autenticadas por x-api-key)
router.post('/sync', ctrl.sync);
router.get('/mappings/agente', ctrl.getMappings);

// Rutas protegidas por JWT (panel web admin)
router.get('/dispositivos', auth, ctrl.getDispositivos);
router.get('/mappings', auth, ctrl.getAllMappings);
router.post('/mappings', auth, ctrl.upsertMapping);
router.delete('/mappings/:id', auth, ctrl.deleteMapping);
router.get('/empleado/:empleadoId', auth, ctrl.getByEmpleado);

module.exports = router;
