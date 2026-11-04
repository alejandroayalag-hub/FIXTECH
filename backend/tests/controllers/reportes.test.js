process.env.JWT_SECRET = 'test-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const pool = require('../../src/db/pool');
const authMiddleware = require('../../src/middleware/auth');

jest.mock('../../src/db/pool');

const app = express();
app.use(express.json());
app.use('/api/reportes', authMiddleware, require('../../src/routes/reportes'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const panel = jwt.sign({ id: 9, email: 'admin@rhata.mx', nombre: 'Ana', role: 'admin' }, 'test-secret');
const empleado = jwt.sign({ role: 'empleado', empleado_id: 7 }, 'test-secret');
const auth = (r, tok = panel) => r.set('Authorization', `Bearer ${tok}`);

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EMPLEADOS = [{ id: 1, nombre: 'Ana', apellido_paterno: 'López', hora_entrada: '09:00:00', dias: [1, 2, 3, 4, 5] }];
const CHECADAS = [{ empleado_id: 1, timestamp: new Date('2026-11-02T15:20:00Z'), tipo: 'entrada' }]; // 09:20 México

const mockConsultas = () => {
  pool.query
    .mockResolvedValueOnce({ rows: EMPLEADOS })
    .mockResolvedValueOnce({ rows: CHECADAS });
};

const binario = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('/api/reportes/asistencia', () => {
  beforeEach(() => jest.resetAllMocks());

  it('sin token -> 401', async () => {
    const r = await request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02');
    expect(r.status).toBe(401);
  });

  it('token de empleado -> 401', async () => {
    const r = await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02'), empleado);
    expect(r.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    ['falta desde', '?hasta=2026-11-02'],
    ['falta hasta', '?desde=2026-11-02'],
    ['formato malo', '?desde=02-11-2026&hasta=2026-11-02'],
    ['fecha imposible', '?desde=2026-02-30&hasta=2026-03-01'],
    ['desde > hasta', '?desde=2026-11-05&hasta=2026-11-02'],
  ])('%s -> 400 sin tocar la BD', async (_, qs) => {
    for (const ruta of ['/api/reportes/asistencia', '/api/reportes/asistencia.xlsx']) {
      const r = await auth(request(app).get(ruta + qs));
      expect(r.status).toBe(400);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('JSON: calcula por empleado con nombre + apellido y hora_entrada normalizada', async () => {
    mockConsultas();
    const r = await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02'));
    expect(r.status).toBe(200);
    expect(r.body).toEqual([
      { empleado_id: 1, nombre: 'Ana López', dias_trabajados: 1, retardos: 1, faltas: 0 },
    ]);
  });

  it('consulta empleados activos con PIN o en el reloj', async () => {
    mockConsultas();
    await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02'));
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/estado\s*=\s*'activo'/);
    expect(sql).toMatch(/estatus\s*=\s*'activo'/);
    expect(sql).toMatch(/pin_hash IS NOT NULL/);
    expect(sql).toMatch(/checador_empleados/);
  });

  it('consulta checadas con límites de día México semiabiertos', async () => {
    mockConsultas();
    await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-06'));
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/timestamp >= \(\$1::date::timestamp AT TIME ZONE 'America\/Mexico_City'\)/);
    expect(sql).toMatch(/timestamp < \(\(\$2::date \+ 1\)::timestamp AT TIME ZONE 'America\/Mexico_City'\)/);
    expect(params.slice(0, 2)).toEqual(['2026-11-02', '2026-11-06']);
    expect(params[2]).toEqual([1]);
  });

  it('sin empleados -> [] y no consulta checadas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02'));
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('.xlsx no queda sombreado por /asistencia y entrega el archivo', async () => {
    mockConsultas();
    const r = await auth(request(app).get('/api/reportes/asistencia.xlsx?desde=2026-11-02&hasta=2026-11-02'))
      .buffer(true).parse(binario);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe(XLSX_TYPE);
    expect(r.headers['content-disposition']).toBe('attachment; filename="asistencia_2026-11-02_2026-11-02.xlsx"');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.body);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).values.slice(1)).toEqual(['empleado', 'nombre', 'dias_trabajados', 'retardos', 'faltas']);
    expect(ws.getRow(2).values.slice(1)).toEqual([1, 'Ana López', 1, 1, 0]);
  });
});
