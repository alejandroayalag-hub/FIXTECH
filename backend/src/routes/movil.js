const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/movilController');
const authEmpleado = require('../middleware/authEmpleado');

// Solo /login lleva límite (20 por 15 min, igual que el login del panel)
const movilLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/login', movilLimiter, ctrl.login);

// Todas las rutas siguientes requieren token de empleado
router.use(authEmpleado);

module.exports = router;
