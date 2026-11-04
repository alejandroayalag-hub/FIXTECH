const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../src/db/pool');

jest.mock('../../src/db/pool');
process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/movil', require('../../src/routes/movil'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const tok = jwt.sign({ role: 'empleado', empleado_id: 7 }, 'test-secret');
const auth = (r) => r.set('Authorization', `Bearer ${tok}`);
const CID = '3f2b8c1e-6a4d-4e5f-9b7a-1c2d3e4f5a6b';
const body = { client_id: CID, tipo: 'entrada', timestamp_dispositivo: new Date().toISOString() };

describe('POST /api/movil/checadas', () => {
  beforeEach(() => jest.resetAllMocks());
  const post = (b) => auth(request(app).post('/api/movil/checadas')).send(b);

  it('201 con origen app en el INSERT y nulls sin geo', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ estado: 'activo', estatus: 'activo' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, tipo: 'entrada' }] });
    const r = await post(body);
    expect(r.status).toBe(201);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/'app'/);
    expect(sql).toMatch(/ON CONFLICT \(client_id\) DO NOTHING/);
    expect(params).toEqual(expect.arrayContaining([7, CID, 'entrada']));
    expect(params.filter((p) => p === null).length).toBeGreaterThanOrEqual(3);
  });
  it('segundo POST mismo client_id -> 200 existente', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ estado: 'activo', estatus: 'activo' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, tipo: 'entrada' }] });
    const r = await post(body);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(1);
    expect(pool.query.mock.calls[2][0]).toMatch(/SELECT/);
  });
  it('tipo comida -> 400', async () => {
    expect((await post({ ...body, tipo: 'comida' })).status).toBe(400);
  });
  it('client_id no UUID -> 400', async () => {
    expect((await post({ ...body, client_id: 'abc' })).status).toBe(400);
  });
  it('inactivo -> 403', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ estado: 'activo', estatus: 'baja' }] });
    expect((await post(body)).status).toBe(403);
  });
  it('token de panel -> 401', async () => {
    const t = jwt.sign({ id: 1, role: 'admin' }, 'test-secret');
    const r = await request(app).post('/api/movil/checadas').set('Authorization', `Bearer ${t}`).send(body);
    expect(r.status).toBe(401);
  });
});

describe('GET /api/movil/yo', () => {
  beforeEach(() => jest.resetAllMocks());
  it('horario HH:MM y ultima_hoy', async () => {
    const ts = new Date('2026-11-04T14:00:00Z');
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: '09:00:00', hora_salida: '18:30:00', dias: [1, 2, 3] }] })
      .mockResolvedValueOnce({ rows: [{ tipo: 'entrada', timestamp: ts }] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: 7, nombre: 'Ana Lopez', hora_entrada: '09:00', hora_salida: '18:30', dias: [1, 2, 3] });
    expect(r.body.ultima_hoy.tipo).toBe('entrada');
  });
  it('sin checadas -> ultima_hoy null', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: null, hora_salida: null, dias: null }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.body.ultima_hoy).toBeNull();
    expect(r.body.hora_entrada).toBeNull();
    expect(r.body.dias).toEqual([]);
  });
});

describe('GET /api/movil/avisos', () => {
  it('filtra por fecha MX', async () => {
    jest.resetAllMocks();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const r = await auth(request(app).get('/api/movil/avisos'));
    expect(r.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toMatch(/ORDER BY created_at DESC/);
    expect(pool.query.mock.calls[0][1][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
