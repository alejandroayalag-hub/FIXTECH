const router = require('express').Router();
const ctrl = require('../controllers/avisosController');

// GET /api/avisos
router.get('/', ctrl.getAllAvisos);

// POST /api/avisos
router.post('/', ctrl.createAviso);

// PUT /api/avisos/:id
router.put('/:id', ctrl.updateAviso);

// DELETE /api/avisos/:id
router.delete('/:id', ctrl.deleteAviso);

module.exports = router;
