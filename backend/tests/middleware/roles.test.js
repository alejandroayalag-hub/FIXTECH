const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const auth = require('../../src/middleware/auth');
const authEmpleado = require('../../src/middleware/authEmpleado');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = express();
app.get('/x', auth, (req, res) => res.json({ ok: true }));
app.get('/e', authEmpleado, (req, res) => res.json(req.empleado));

const sign = (p) => jwt.sign(p, process.env.JWT_SECRET);
const get = (path, t) => request(app).get(path).set('Authorization', `Bearer ${t}`);

test('panel auth rechaza token de empleado', async () => {
  expect((await get('/x', sign({ empleado_id: 7, role: 'empleado' }))).status).toBe(401);
});
test('panel auth acepta admin y rh', async () => {
  expect((await get('/x', sign({ id: 1, role: 'admin' }))).status).toBe(200);
  expect((await get('/x', sign({ id: 2, role: 'rh' }))).status).toBe(200);
});
test('authEmpleado rechaza token de panel', async () => {
  expect((await get('/e', sign({ id: 1, role: 'admin' }))).status).toBe(401);
});
test('authEmpleado acepta empleado y expone req.empleado.id', async () => {
  const r = await get('/e', sign({ empleado_id: 7, role: 'empleado' }));
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ id: 7 });
});
test('authEmpleado sin header → 401', async () => {
  expect((await request(app).get('/e')).status).toBe(401);
});
