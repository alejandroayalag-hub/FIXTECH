process.env.JWT_SECRET = 'test-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../../src/db/pool');
const authMiddleware = require('../../src/middleware/auth');

jest.mock('../../src/db/pool');

const app = express();
app.use(express.json());
app.use('/api/avisos', authMiddleware, require('../../src/routes/avisos'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const panel = jwt.sign({ id: 9, email: 'admin@rhata.mx', nombre: 'Ana', role: 'admin' }, 'test-secret');
const empleado = jwt.sign({ role: 'empleado', empleado_id: 7 }, 'test-secret');
const auth = (r, tok = panel) => r.set('Authorization', `Bearer ${tok}`);

const VALIDO = { titulo: 'Cierre de nómina', mensaje: 'La nómina cierra el viernes' };
const FILA = { id: 3, titulo: 'Cierre de nómina', mensaje: 'La nómina cierra el viernes', vigente_desde: '2026-11-04', vigente_hasta: null, activo: true };

describe('/api/avisos (panel)', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('autenticación', () => {
    it('sin token -> 401', async () => {
      const r = await request(app).get('/api/avisos');
      expect(r.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('token de empleado -> 401', async () => {
      const r = await auth(request(app).get('/api/avisos'), empleado);
      expect(r.status).toBe(401);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/avisos', () => {
    it('lista todos los avisos ordenados por created_at DESC', async () => {
      pool.query.mockResolvedValueOnce({ rows: [FILA] });
      const r = await auth(request(app).get('/api/avisos'));
      expect(r.status).toBe(200);
      expect(r.body).toEqual([FILA]);
      expect(pool.query.mock.calls[0][0]).toMatch(/ORDER BY created_at DESC/);
    });
  });

  describe('POST /api/avisos', () => {
    it('sin titulo -> 400 y no toca la BD', async () => {
      const r = await auth(request(app).post('/api/avisos')).send({ mensaje: 'x' });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('sin mensaje -> 400', async () => {
      const r = await auth(request(app).post('/api/avisos')).send({ titulo: 'x' });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('titulo mayor a 150 caracteres -> 400', async () => {
      const r = await auth(request(app).post('/api/avisos')).send({ ...VALIDO, titulo: 'a'.repeat(151) });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('fecha con formato inválido -> 400', async () => {
      const r = await auth(request(app).post('/api/avisos')).send({ ...VALIDO, vigente_desde: '04/11/2026' });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('vigente_hasta anterior a vigente_desde -> 400', async () => {
      const r = await auth(request(app).post('/api/avisos')).send({
        ...VALIDO, vigente_desde: '2026-11-10', vigente_hasta: '2026-11-05',
      });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('válido -> 201 con created_by del token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [FILA] });
      const r = await auth(request(app).post('/api/avisos')).send(VALIDO);
      expect(r.status).toBe(201);
      expect(r.body).toEqual(FILA);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toMatch(/INSERT INTO avisos_gerencia/);
      expect(params).toContain(9);
      expect(params).toContain(VALIDO.titulo);
    });
  });

  describe('PUT /api/avisos/:id', () => {
    it('id inexistente -> 404', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const r = await auth(request(app).put('/api/avisos/999')).send(VALIDO);
      expect(r.status).toBe(404);
    });

    it('válido -> 200 con la fila actualizada', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...FILA, activo: false }] });
      const r = await auth(request(app).put('/api/avisos/3')).send({ ...VALIDO, activo: false });
      expect(r.status).toBe(200);
      expect(r.body.activo).toBe(false);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toMatch(/UPDATE avisos_gerencia/);
      expect(params).toContain(3);
    });

    it('sin mensaje -> 400', async () => {
      const r = await auth(request(app).put('/api/avisos/3')).send({ titulo: 'x' });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('vigente_hasta < vigente_desde -> 400', async () => {
      const r = await auth(request(app).put('/api/avisos/3')).send({
        ...VALIDO, vigente_desde: '2026-11-10', vigente_hasta: '2026-11-01',
      });
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/avisos/:id', () => {
    it('id inexistente -> 404', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const r = await auth(request(app).delete('/api/avisos/999'));
      expect(r.status).toBe(404);
    });

    it('existente -> 204', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 3 }], rowCount: 1 });
      const r = await auth(request(app).delete('/api/avisos/3'));
      expect(r.status).toBe(204);
      expect(pool.query.mock.calls[0][0]).toMatch(/DELETE FROM avisos_gerencia/);
    });
  });

  describe(':id no entero positivo -> 400 (sin consultar la BD)', () => {
    it.each(['abc', '0', '-1', '1.5', '1e3'])('PUT /%s', async (id) => {
      const r = await auth(request(app).put(`/api/avisos/${id}`)).send(VALIDO);
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it.each(['abc', '0', '-1', '1.5'])('DELETE /%s', async (id) => {
      const r = await auth(request(app).delete(`/api/avisos/${id}`));
      expect(r.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
