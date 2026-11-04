const request = require('supertest');
const express = require('express');
const pool = require('../../src/db/pool');

jest.mock('../../src/db/pool');

const app = express();
app.use(express.json());
app.use('/api/empleados', require('../../src/routes/empleados'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

describe('PIN de empleado (panel)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST /:id/pin -> 200, guarda solo hash bcrypt', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const r = await request(app).post('/api/empleados/5/pin');
    expect(r.status).toBe(200);
    expect(r.body.pin).toMatch(/^\d{6}$/);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE empleados SET pin_hash/);
    expect(sql).toMatch(/pin_generado_en = NOW\(\)/);
    expect(params[0]).toMatch(/^\$2[aby]\$/);
    expect(params).not.toContain(r.body.pin);
    expect(params[1]).toBe('5');
  });
  it('id inexistente -> 404', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    expect((await request(app).post('/api/empleados/99/pin')).status).toBe(404);
  });
  it('GET lista y detalle no devuelven pin_hash', async () => {
    const row = { id: 1, nombre: 'A', pin_hash: '$2a$x' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const l = await request(app).get('/api/empleados');
    expect(l.body[0].pin_hash).toBeUndefined();
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const o = await request(app).get('/api/empleados/1');
    expect(o.body.id).toBe(1);
    expect(o.body.pin_hash).toBeUndefined();
  });
});
