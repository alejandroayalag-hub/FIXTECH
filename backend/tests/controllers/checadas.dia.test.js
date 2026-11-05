const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../src/db/pool');

jest.mock('../../src/db/pool');
process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/checadas', require('../../src/routes/checadas'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const panel = jwt.sign({ id: 1, role: 'admin' }, 'test-secret');
const get = (q, tok = panel) => request(app).get(`/api/checadas/dia${q}`).set('Authorization', `Bearer ${tok}`);

describe('GET /api/checadas/dia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sin token -> 401', async () => {
    expect((await request(app).get('/api/checadas/dia?fecha=2026-11-05')).status).toBe(401);
  });
  it.each(['', '?fecha=05-11-2026', '?fecha=2026-13-45', '?fecha=x'])('fecha inválida %s -> 400', async (q) => {
    expect((await get(q)).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
  it('devuelve las checadas del día México de todos los empleados', async () => {
    const fila = { id: 1, numero_empleado: 1, nombre: 'Alejandro', tipo: 'entrada', origen: 'app' };
    pool.query.mockResolvedValueOnce({ rows: [fila] });
    const r = await get('?fecha=2026-11-05');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([fila]);
    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['2026-11-05']);
    expect(sql).toMatch(/AT TIME ZONE 'America\/Mexico_City'/);
    expect(sql).toMatch(/numero_empleado/);
  });
});
