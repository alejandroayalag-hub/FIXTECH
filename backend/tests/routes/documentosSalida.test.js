process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const ctrl = require('../../src/controllers/documentosSalidaController');
const authMiddleware = require('../../src/middleware/auth');
const errorHandler = require('../../src/middleware/errorHandler');

jest.mock('../../src/controllers/documentosSalidaController', () => ({
  obtenerDocumentos: jest.fn((req, res) => res.json({ called: 'obtenerDocumentos', params: req.params })),
  obtenerDocumentoPorId: jest.fn((req, res) => res.json({ called: 'obtenerDocumentoPorId', params: req.params })),
  getAllDocumentos: jest.fn((req, res) => res.json({ called: 'getAllDocumentos' })),
  generarTemplate: jest.fn((req, res) => res.json({ called: 'generarTemplate', params: req.params })),
  subirEscaneado: jest.fn((req, res) => res.json({ called: 'subirEscaneado', hasFile: !!req.file, params: req.params })),
  descargarEscaneado: jest.fn((req, res) => res.json({ called: 'descargarEscaneado', params: req.params })),
  eliminarEscaneado: jest.fn((req, res) => res.json({ called: 'eliminarEscaneado', params: req.params })),
}));

const documentosSalidaRouter = require('../../src/routes/documentosSalida');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/documentosSalida', authMiddleware, documentosSalidaRouter);
  app.use(errorHandler);
  return app;
}

function token() {
  return jwt.sign({ id: 1, role: 'rh' }, process.env.JWT_SECRET);
}

describe('Routes: /api/documentosSalida', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const res = await request(app).get('/api/documentosSalida');
    expect(res.status).toBe(401);
    expect(ctrl.getAllDocumentos).not.toHaveBeenCalled();
  });

  it('GET / invoca getAllDocumentos', async () => {
    const res = await request(app)
      .get('/api/documentosSalida')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.getAllDocumentos).toHaveBeenCalledTimes(1);
  });

  it('GET /documento/:documentoId invoca obtenerDocumentoPorId', async () => {
    const res = await request(app)
      .get('/api/documentosSalida/documento/9')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.obtenerDocumentoPorId).toHaveBeenCalledTimes(1);
    expect(res.body.params.documentoId).toBe('9');
  });

  it('GET /:documentoId/descargar-escaneado invoca descargarEscaneado', async () => {
    const res = await request(app)
      .get('/api/documentosSalida/9/descargar-escaneado')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.descargarEscaneado).toHaveBeenCalledTimes(1);
  });

  it('DELETE /:documentoId/escaneado invoca eliminarEscaneado', async () => {
    const res = await request(app)
      .delete('/api/documentosSalida/9/escaneado')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.eliminarEscaneado).toHaveBeenCalledTimes(1);
  });

  it('POST /:documentoId/subir-escaneado pasa por multer e invoca subirEscaneado con req.file', async () => {
    const res = await request(app)
      .post('/api/documentosSalida/9/subir-escaneado')
      .set('Authorization', `Bearer ${token()}`)
      .attach('archivo', Buffer.from('contenido-pdf'), { filename: 'finiquito.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(ctrl.subirEscaneado).toHaveBeenCalledTimes(1);
    expect(res.body.hasFile).toBe(true);
  });

  it('POST /:salidaId/:tipo/generar-template invoca generarTemplate con ambos params', async () => {
    const res = await request(app)
      .post('/api/documentosSalida/3/finiquito/generar-template')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.generarTemplate).toHaveBeenCalledTimes(1);
    expect(res.body.params).toMatchObject({ salidaId: '3', tipo: 'finiquito' });
  });

  it('GET /:salidaId invoca obtenerDocumentos', async () => {
    const res = await request(app)
      .get('/api/documentosSalida/3')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(ctrl.obtenerDocumentos).toHaveBeenCalledTimes(1);
    expect(res.body.params.salidaId).toBe('3');
  });

  it('POST /:documentoId/subir-escaneado rechaza con 403 cuando el rol no es admin ni rh', async () => {
    const viewerToken = jwt.sign({ id: 1, role: 'viewer' }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/documentosSalida/9/subir-escaneado')
      .set('Authorization', `Bearer ${viewerToken}`)
      .attach('archivo', Buffer.from('contenido-pdf'), { filename: 'finiquito.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(403);
    expect(ctrl.subirEscaneado).not.toHaveBeenCalled();
  });
});
