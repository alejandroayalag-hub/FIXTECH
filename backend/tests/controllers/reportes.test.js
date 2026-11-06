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
const EMPLEADOS = [{ id: 1, numero_empleado: 12, nombre: 'Ana', apellido_paterno: 'López', hora_entrada: '09:00:00', dias: [1, 2, 3, 4, 5] }];
const CHECADAS = [{ empleado_id: 1, timestamp: new Date('2026-11-02T15:20:00Z'), tipo: 'entrada', hora_dudosa: false }]; // 09:20 México

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
      { numero_empleado: 12, empleado_id: 1, nombre: 'Ana López', dias_trabajados: 1, retardos: 1, faltas: 0, checadas_dudosas: 0 },
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
    expect(sql).toMatch(/hora_dudosa/);
  });

  it('sin empleados -> [] y no consulta checadas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-02&hasta=2026-11-02'));
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('.xlsx no queda sombreado por /asistencia y entrega el archivo (con checadas_dudosas)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: EMPLEADOS })
      .mockResolvedValueOnce({ rows: [{ ...CHECADAS[0], hora_dudosa: true }] });
    const r = await auth(request(app).get('/api/reportes/asistencia.xlsx?desde=2026-11-02&hasta=2026-11-02'))
      .buffer(true).parse(binario);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe(XLSX_TYPE);
    expect(r.headers['content-disposition']).toBe('attachment; filename="asistencia_2026-11-02_2026-11-02.xlsx"');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.body);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).values.slice(1)).toEqual(['empleado', 'nombre', 'dias_trabajados', 'retardos', 'faltas', 'checadas_dudosas']);
    expect(ws.getRow(2).values.slice(1)).toEqual([12, 'Ana López', 1, 1, 0, 1]);

  });
});

describe('rango por empleado: ingreso y alta en el checador', () => {
  // Rango dom 1 – vie 6 nov 2026 (L–V: 2..6). "Hoy" fijo después del rango.
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: new Date('2026-11-30T18:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  const BASE = { id: 1, nombre: 'Ana', apellido_paterno: 'López', hora_entrada: '09:00:00', dias: [1, 2, 3, 4, 5],
    fecha_ingreso: '2020-01-01', pin_generado_en: new Date('2026-01-01T15:00:00Z'), reloj_desde: null };
  const reporte = async (emp) => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...BASE, ...emp }] }).mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/reportes/asistencia?desde=2026-11-01&hasta=2026-11-06'));
    expect(r.status).toBe(200);
    return r.body[0];
  };

  it('consulta ingreso como texto, fecha del PIN y primer mapeo del reloj', async () => {
    await reporte({});
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/fecha_ingreso::text/);
    expect(sql).toMatch(/pin_generado_en/);
    expect(sql).toMatch(/MIN\(ce\.created_at\)/);
  });
  it('sin restricciones previas -> 5 faltas', async () => {
    expect((await reporte({})).faltas).toBe(5);
  });
  it('ingresó el 2026-11-03 -> el 2 no es falta', async () => {
    expect((await reporte({ fecha_ingreso: '2026-11-03' })).faltas).toBe(4);
  });
  it('PIN generado el 4 (21:00 México = 5 UTC) -> 2 y 3 no son faltas', async () => {
    expect((await reporte({ pin_generado_en: new Date('2026-11-05T03:00:00Z') })).faltas).toBe(3);
  });
  it('mapeo del reloj anterior al PIN -> gana la fecha del reloj', async () => {
    const r = await reporte({ pin_generado_en: new Date('2026-11-05T16:00:00Z'), reloj_desde: new Date('2026-11-03T16:00:00Z') });
    expect(r.faltas).toBe(4);
  });
  it('solo reloj (sin PIN) -> desde el mapeo', async () => {
    const r = await reporte({ pin_generado_en: null, reloj_desde: new Date('2026-11-06T16:00:00Z') });
    expect(r.faltas).toBe(1);
  });
  it('PIN legado sin fecha y sin reloj -> sin restricción', async () => {
    expect((await reporte({ pin_generado_en: null, reloj_desde: null })).faltas).toBe(5);
  });
});

describe('/api/reportes/nomipaq-dyh.xlsx', () => {
  // Semana jue 5 – mié 11 nov 2026; "hoy" fijo después.
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: new Date('2026-11-30T18:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  const leer = async (r) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(r.body); return wb; };

  it('desde inválida -> 400', async () => {
    for (const q of ['', '?desde=2026-02-30', '?desde=x']) {
      expect((await auth(request(app).get(`/api/reportes/nomipaq-dyh.xlsx${q}`))).status).toBe(400);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('cuadrícula DYH: código, 7 fechas y TRAB solo en laborables con entrada, ordenado por código', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [
        { id: 1, numero_empleado: 20, nombre: 'Ana', apellido_paterno: 'López', dias: [1, 2, 3, 4, 5] },
        { id: 2, numero_empleado: 3, nombre: 'Beto', apellido_paterno: 'Ruiz', dias: [1, 2, 3, 4, 5] },
      ] })
      .mockResolvedValueOnce({ rows: [
        { empleado_id: 1, timestamp: new Date('2026-11-05T15:00:00Z'), tipo: 'entrada', hora_dudosa: false }, // jue
        { empleado_id: 1, timestamp: new Date('2026-11-05T23:00:00Z'), tipo: 'salida', hora_dudosa: false },
        { empleado_id: 1, timestamp: new Date('2026-11-07T15:00:00Z'), tipo: 'entrada', hora_dudosa: false }, // sáb: no laborable
        { empleado_id: 2, timestamp: new Date('2026-11-10T05:30:00Z'), tipo: 'entrada', hora_dudosa: false }, // 23:30 lun 9 México
      ] });
    const r = await auth(request(app).get('/api/reportes/nomipaq-dyh.xlsx?desde=2026-11-05')).buffer(true).parse(binario);
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toBe('attachment; filename="nomipaq_dyh_2026-11-05_2026-11-11.xlsx"');
    expect(pool.query.mock.calls[1][1].slice(0, 2)).toEqual(['2026-11-05', '2026-11-11']);

    const wb = await leer(r);
    const ws = wb.getWorksheet('ExportarDYH');
    expect(ws.getCell('B4').value).toBe('Semanal');
    expect(ws.getCell('B5').value).toBe(2026);
    expect(ws.getCell('A9').value).toBe('Código Empleado');
    const fechas = ws.getRow(9).values.slice(2, 9).map((d) => d.toISOString().slice(0, 10));
    expect(fechas).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']);
    const fila = (n) => Array.from({ length: 8 }, (_, i) => ws.getRow(n).getCell(i + 1).value ?? null);
    expect(fila(10)).toEqual([3, null, null, null, null, 'TRAB', null, null]);
    expect(fila(11)).toEqual([20, 'TRAB', null, null, null, null, null, null]);
    expect(ws.getRow(12).getCell(1).value).toBeNull();

    const ref = wb.getWorksheet('Empleados');
    expect(ref.getRow(2).values.slice(1)).toEqual([3, 'Beto Ruiz', 1]);
    expect(ref.getRow(3).values.slice(1)).toEqual([20, 'Ana López', 1]);
  });

  it('sin empleados con checador -> solo encabezados', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const r = await auth(request(app).get('/api/reportes/nomipaq-dyh.xlsx?desde=2026-11-05')).buffer(true).parse(binario);
    expect(r.status).toBe(200);
    const ws = (await leer(r)).getWorksheet('ExportarDYH');
    expect(ws.getCell('A9').value).toBe('Código Empleado');
    expect(ws.getRow(10).getCell(1).value).toBeNull();
  });
});
