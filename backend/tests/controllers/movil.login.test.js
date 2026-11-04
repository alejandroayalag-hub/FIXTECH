const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../src/db/pool');

jest.mock('../../src/db/pool');
process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/movil', require('../../src/routes/movil'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const base = { id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', estado: 'activo', estatus: 'activo' };

describe('POST /api/movil/login', () => {
  let hash;
  beforeAll(async () => { hash = await bcrypt.hash('123456', 4); });
  beforeEach(() => jest.clearAllMocks());

  const login = (b) => request(app).post('/api/movil/login').send(b);

  it('sin pin -> 400', async () => {
    expect((await login({ empleado: 7 })).status).toBe(400);
  });
  it('empleado inexistente -> 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect((await login({ empleado: 7, pin: '123456' })).status).toBe(401);
  });
  it('pin_hash null -> 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...base, pin_hash: null }] });
    expect((await login({ empleado: 7, pin: '123456' })).status).toBe(401);
  });
  it('PIN incorrecto -> 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...base, pin_hash: hash }] });
    const r = await login({ empleado: 7, pin: '000000' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('Credenciales incorrectas');
  });
  it.each([{ estatus: 'baja' }, { estado: 'inactivo' }])('inactivo %j -> 403', async (o) => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...base, ...o, pin_hash: hash }] });
    const r = await login({ empleado: 7, pin: '123456' });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Empleado inactivo');
  });
  it('correcto -> 200 con token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...base, pin_hash: hash }] });
    const r = await login({ empleado: '7', pin: '123456' });
    expect(r.status).toBe(200);
    const p = jwt.verify(r.body.token, 'test-secret');
    expect(p.role).toBe('empleado');
    expect(p.empleado_id).toBe(7);
    expect(r.body.nombre).toBe('Ana Lopez');
  });
});
