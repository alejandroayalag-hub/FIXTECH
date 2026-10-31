const router = require('express').Router();
const ctrl = require('../controllers/documentosController');
const upload = require('../middleware/upload');

router.get('/tipos', ctrl.getTipos);
router.get('/empleado/:empleadoId', ctrl.getByEmpleado);
router.post('/upload', upload.single('archivo'), ctrl.upload);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

module.exports = router;
