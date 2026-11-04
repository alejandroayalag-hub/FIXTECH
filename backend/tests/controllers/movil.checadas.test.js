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
const ACTIVO = { estado: 'activo', estatus: 'activo' };
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
      .mockResolvedValueOnce({ rows: [{ ...ACTIVO, id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: '09:00:00', hora_salida: '18:30:00', dias: [1, 2, 3] }] })
      .mockResolvedValueOnce({ rows: [{ tipo: 'entrada', timestamp: ts }] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: 7, nombre: 'Ana Lopez', hora_entrada: '09:00', hora_salida: '18:30', dias: [1, 2, 3] });
    expect(r.body.ultima_hoy.tipo).toBe('entrada');
  });
  it('sin checadas -> ultima_hoy null', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...ACTIVO, id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: null, hora_salida: null, dias: null }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.body.ultima_hoy).toBeNull();
    expect(r.body.hora_entrada).toBeNull();
    expect(r.body.dias).toEqual([]);
  });
});

describe('GET /api/movil/avisos', () => {
  beforeEach(() => jest.resetAllMocks());
  it('filtra por fecha MX', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [ACTIVO] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const r = await auth(request(app).get('/api/movil/avisos'));
    expect(r.status).toBe(200);
    expect(pool.query.mock.calls[1][0]).toMatch(/ORDER BY created_at DESC/);
    expect(pool.query.mock.calls[1][1][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it.each([{ estatus: 'baja' }, { estado: 'inactivo' }])('inactivo %j -> 403 sin consultar avisos', async (o) => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...ACTIVO, ...o }] });
    const r = await auth(request(app).get('/api/movil/avisos'));
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: 'Empleado inactivo' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/movil/yo — inactivo y renovación de token', () => {
  beforeEach(() => jest.resetAllMocks());
  const EMP = { ...ACTIVO, id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: '09:00:00', hora_salida: '18:00:00', dias: [1] };

  it.each([{ estatus: 'baja' }, { estado: 'inactivo' }])('inactivo %j -> 403', async (o) => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...EMP, ...o }] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: 'Empleado inactivo' });
  });
  it('devuelve token nuevo de 30 días con el mismo payload (incl. pv)', async () => {
    const pinEn = new Date('2026-11-04T10:00:00.123Z');
    const pv = Math.floor(pinEn.getTime() / 1000);
    const t = jwt.sign({ role: 'empleado', empleado_id: 7, pv }, 'test-secret');
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...EMP, pin_generado_en: pinEn }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await request(app).get('/api/movil/yo').set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(200);
    const p = jwt.verify(r.body.token, 'test-secret');
    expect(p).toMatchObject({ role: 'empleado', empleado_id: 7, pv });
    expect(p.exp - p.iat).toBe(30 * 24 * 3600);
  });
  it('token legado sin pv y PIN sin fecha -> 200 y token sin pv', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...EMP, pin_generado_en: null }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/movil/yo'));
    expect(r.status).toBe(200);
    expect(jwt.verify(r.body.token, 'test-secret').pv).toBeUndefined();
  });
});

describe('PIN regenerado revoca sesiones (pv)', () => {
  beforeEach(() => jest.resetAllMocks());
  const pinEn = new Date('2026-11-04T10:00:00Z');
  const pv = Math.floor(pinEn.getTime() / 1000);
  const con = (payload) => jwt.sign({ role: 'empleado', empleado_id: 7, ...payload }, 'test-secret');
  const EMP = { ...ACTIVO, id: 7, nombre: 'Ana', apellido_paterno: 'Lopez', hora_entrada: '09:00:00', hora_salida: '18:00:00', dias: [1], pin_generado_en: pinEn };

  it.each([['pv viejo', { pv: pv - 3600 }], ['sin pv', {}]])('%s -> 401 en /yo', async (_, payload) => {
    pool.query.mockResolvedValueOnce({ rows: [EMP] });
    const r = await request(app).get('/api/movil/yo').set('Authorization', `Bearer ${con(payload)}`);
    expect(r.status).toBe(401);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
  it.each([['pv viejo', { pv: pv - 3600 }], ['sin pv', {}]])('%s -> 401 en /checadas sin insertar', async (_, payload) => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...ACTIVO, pin_generado_en: pinEn }] });
    const r = await request(app).post('/api/movil/checadas').set('Authorization', `Bearer ${con(payload)}`).send(body);
    expect(r.status).toBe(401);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/pin_generado_en/);
  });
  it('pv vigente -> 200 en /yo', async () => {
    pool.query.mockResolvedValueOnce({ rows: [EMP] }).mockResolvedValueOnce({ rows: [] });
    const r = await request(app).get('/api/movil/yo').set('Authorization', `Bearer ${con({ pv })}`);
    expect(r.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toMatch(/pin_generado_en/);
  });
  it('pv vigente -> 201 en /checadas', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...ACTIVO, pin_generado_en: pinEn }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const r = await request(app).post('/api/movil/checadas').set('Authorization', `Bearer ${con({ pv })}`).send(body);
    expect(r.status).toBe(201);
  });
});

describe('POST /api/movil/checadas — hora y geo', () => {
  beforeEach(() => jest.resetAllMocks());
  const post = (b) => auth(request(app).post('/api/movil/checadas')).send(b);
  const insertParams = () => pool.query.mock.calls[1][1];
  const ok = () => pool.query
    .mockResolvedValueOnce({ rows: [ACTIVO] })
    .mockResolvedValueOnce({ rows: [{ id: 1 }] });

  it('corrige con enviado_en: reloj 35 min atrasado -> hora del servidor, dudosa, raw guardado', async () => {
    ok();
    const atras = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const antes = Date.now();
    await post({ ...body, timestamp_dispositivo: atras, enviado_en: atras });
    const p = insertParams();
    expect(Math.abs(new Date(p[1]).getTime() - antes)).toBeLessThan(5000);
    expect(p[6]).toEqual(new Date(atras));
    expect(p[8]).toBe(true);
  });
  it('sin enviado_en -> comportamiento anterior (hora del dispositivo)', async () => {
    ok();
    const hace = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    await post({ ...body, timestamp_dispositivo: hace });
    expect(insertParams()[1]).toEqual(new Date(hace));
    expect(insertParams()[8]).toBe(false);
  });
  it.each([
    [{ lat: 91, lng: 10, precision_m: 5 }, [null, 10, 5]],
    [{ lat: -90.5, lng: 181, precision_m: -1 }, [null, null, null]],
    [{ lat: 90, lng: -180, precision_m: 100000 }, [90, -180, 100000]],
    [{ lat: 19.4, lng: -99.1, precision_m: 100001 }, [19.4, -99.1, null]],
  ])('geo fuera de rango -> null (%j)', async (geo, esperado) => {
    ok();
    const r = await post({ ...body, ...geo });
    expect(r.status).toBe(201);
    expect(insertParams().slice(3, 6)).toEqual(esperado);
  });
});
