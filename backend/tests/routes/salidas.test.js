process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const ctrl = require('../../src/controllers/salidasController');
const authMiddleware = require('../../src/middleware/auth');
const errorHandler = require('../../src/middleware/errorHandler');

jest.mock('../../src/controllers/salidasController', () => ({
  getAllSalidas: jest.fn((req, res) => res.json({ called: 'getAllSalidas' })),
  getSalidaById: jest.fn((req, res) => res.json({ called: 'getSalidaById', params: req.params })),
  getSalidasByEmpleado: jest.fn((req, res) => res.json({ called: 'getSalidasByEmpleado', params: req.params })),
  getSalidasByEstado: jest.fn((req, res) => res.json({ called: 'getSalidasByEstado', params: req.params })),
  createSalida: jest.fn((req, res) => res.status(201).json({ called: 'createSalida', body: req.body })),
  updateSalida: jest.fn((req, res) => res.json({ called: 'updateSalida', params: req.params })),
  deleteSalida: jest.fn((req, res) => res.status(204).end()),
}));

const salidasRouter = require('../../src/routes/salidas');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/salidas', authMiddleware, salidasRouter);
  app.use(errorHandler);
  return app;
}

function token() {
  return jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
}

describe('Routes: /api/salidas', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const res = await request(app).get('/api/salidas');
    expect(res.status).toBe(401);
    expect(ctrl.getAllSalidas).not.toHaveBeenCalled();
  });

  it('GET / invoca getAllSalidas cuando hay token válido', async () => {
    const res = await request(app).get('/api/salidas').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getAllSalidas).toHaveBeenCalledTimes(1);
  });

  it('GET /empleado/:empleadoId invoca getSalidasByEmpleado con el param correcto', async () => {
    const res = await request(app)
      .get('/api/salidas/empleado/42')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getSalidasByEmpleado).toHaveBeenCalledTimes(1);
    expect(res.body.params.empleadoId).toBe('42');
  });

  it('GET /estado/:estado invoca getSalidasByEstado', async () => {
    const res = await request(app)
      .get('/api/salidas/estado/pendiente')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getSalidasByEstado).toHaveBeenCalledTimes(1);
    expect(res.body.params.estado).toBe('pendiente');
  });

  it('POST / invoca createSalida con el body recibido', async () => {
    const res = await request(app)
      .post('/api/salidas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleadoId: 1, empresaId: 1, fechaSalida: '2026-01-01', tipoSalida: 'renuncia', razonSalida: 'x' });
    expect(res.status).toBe(201);
    expect(ctrl.createSalida).toHaveBeenCalledTimes(1);
  });

  it('GET /:salidaId invoca getSalidaById', async () => {
    const res = await request(app).get('/api/salidas/7').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getSalidaById).toHaveBeenCalledTimes(1);
    expect(res.body.params.salidaId).toBe('7');
  });

  it('PUT /:salidaId invoca updateSalida', async () => {
    const res = await request(app)
      .put('/api/salidas/7')
      .set('Authorization', `Bearer ${token()}`)
      .send({ estado: 'en_proceso' });
    expect(res.status).toBe(200);
    expect(ctrl.updateSalida).toHaveBeenCalledTimes(1);
  });

  it('DELETE /:salidaId invoca deleteSalida y responde 204', async () => {
    const res = await request(app).delete('/api/salidas/7').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(204);
    expect(ctrl.deleteSalida).toHaveBeenCalledTimes(1);
  });

  it('POST / rechaza con 403 cuando el rol no es admin ni rh', async () => {
    const viewerToken = jwt.sign({ id: 1, role: 'viewer' }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/salidas')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ empleadoId: 1, empresaId: 1, fechaSalida: '2026-01-01', tipoSalida: 'renuncia', razonSalida: 'x' });
    expect(res.status).toBe(403);
    expect(ctrl.createSalida).not.toHaveBeenCalled();
  });
});
