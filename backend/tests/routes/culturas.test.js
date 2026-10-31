process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const ctrl = require('../../src/controllers/culturasController');
const authMiddleware = require('../../src/middleware/auth');
const errorHandler = require('../../src/middleware/errorHandler');

jest.mock('../../src/controllers/culturasController', () => ({
  getCulturasByEmpresa: jest.fn((req, res) => res.json({ called: 'getCulturasByEmpresa', params: req.params })),
  getCulturaById: jest.fn((req, res) => res.json({ called: 'getCulturaById', params: req.params })),
  createCultura: jest.fn((req, res) => res.status(201).json({ called: 'createCultura', body: req.body })),
  updateCultura: jest.fn((req, res) => res.json({ called: 'updateCultura', params: req.params })),
  deleteCultura: jest.fn((req, res) => res.status(204).end()),
  subirArchivo: jest.fn((req, res) => res.status(201).json({ called: 'subirArchivo', hasFile: !!req.file, params: req.params })),
  eliminarArchivo: jest.fn((req, res) => res.json({ called: 'eliminarArchivo', params: req.params })),
}));

const culturasRouter = require('../../src/routes/culturas');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/culturas', authMiddleware, culturasRouter);
  app.use(errorHandler);
  return app;
}

function token() {
  return jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
}

describe('Routes: /api/culturas', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const res = await request(app).get('/api/culturas/empresa/1');
    expect(res.status).toBe(401);
    expect(ctrl.getCulturasByEmpresa).not.toHaveBeenCalled();
  });

  it('GET /empresa/:empresaId invoca getCulturasByEmpresa', async () => {
    const res = await request(app)
      .get('/api/culturas/empresa/1')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getCulturasByEmpresa).toHaveBeenCalledTimes(1);
    expect(res.body.params.empresaId).toBe('1');
  });

  it('POST / invoca createCultura con el body recibido', async () => {
    const res = await request(app)
      .post('/api/culturas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empresaId: 1, tipo: 'mision', titulo: 'Misión' });
    expect(res.status).toBe(201);
    expect(ctrl.createCultura).toHaveBeenCalledTimes(1);
  });

  it('GET /:culturaId invoca getCulturaById', async () => {
    const res = await request(app)
      .get('/api/culturas/5')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getCulturaById).toHaveBeenCalledTimes(1);
    expect(res.body.params.culturaId).toBe('5');
  });

  it('PUT /:culturaId invoca updateCultura', async () => {
    const res = await request(app)
      .put('/api/culturas/5')
      .set('Authorization', `Bearer ${token()}`)
      .send({ titulo: 'Nueva misión' });
    expect(res.status).toBe(200);
    expect(ctrl.updateCultura).toHaveBeenCalledTimes(1);
  });

  it('DELETE /:culturaId invoca deleteCultura y responde 204', async () => {
    const res = await request(app)
      .delete('/api/culturas/5')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(204);
    expect(ctrl.deleteCultura).toHaveBeenCalledTimes(1);
  });

  it('POST /:culturaId/archivos pasa por multer e invoca subirArchivo con req.file', async () => {
    const res = await request(app)
      .post('/api/culturas/5/archivos')
      .set('Authorization', `Bearer ${token()}`)
      .attach('archivo', Buffer.from('contenido-imagen'), { filename: 'logo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(ctrl.subirArchivo).toHaveBeenCalledTimes(1);
    expect(res.body.hasFile).toBe(true);
  });

  it('DELETE /:culturaId/archivos/:archivoId invoca eliminarArchivo con ambos params', async () => {
    const res = await request(app)
      .delete('/api/culturas/5/archivos/abc-123')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.eliminarArchivo).toHaveBeenCalledTimes(1);
    expect(res.body.params).toMatchObject({ culturaId: '5', archivoId: 'abc-123' });
  });

  it('POST / rechaza con 403 cuando el rol no es admin (rh no puede editar culturas)', async () => {
    const rhToken = jwt.sign({ id: 1, role: 'rh' }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/culturas')
      .set('Authorization', `Bearer ${rhToken}`)
      .send({ empresaId: 1, tipo: 'mision', titulo: 'Misión' });
    expect(res.status).toBe(403);
    expect(ctrl.createCultura).not.toHaveBeenCalled();
  });
});
