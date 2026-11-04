const pool = require('../../src/db/pool');
const Checada = require('../../src/models/checada');

jest.mock('../../src/db/pool');

describe('Modelo Checada.findByEmpleado', () => {
  beforeEach(() => jest.clearAllMocks());
  test('usa LEFT JOIN a dispositivos y selecciona campos de app', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await Checada.findByEmpleado(1);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/LEFT JOIN checador_dispositivos/);
    expect(sql).toMatch(/c\.origen, c\.lat, c\.lng, c\.hora_dudosa/);
  });
  test('desde/hasta son días de México semiabiertos', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await Checada.findByEmpleado(1, { desde: '2026-11-02', hasta: '2026-11-06' });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/c\.timestamp >= \(\$2::date::timestamp AT TIME ZONE 'America\/Mexico_City'\)/);
    expect(sql).toMatch(/c\.timestamp < \(\(\$3::date \+ 1\)::timestamp AT TIME ZONE 'America\/Mexico_City'\)/);
    expect(params).toEqual([1, '2026-11-02', '2026-11-06']);
  });
});

describe('Modelo Checada.upsertMapping', () => {
  beforeEach(() => jest.clearAllMocks());
  test('reasignar el uid a otro empleado reinicia created_at (inicio de registro del nuevo)', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1 }] });
    await Checada.upsertMapping(1, 5, 12);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/ON CONFLICT \(dispositivo_id, uid_checador\) DO UPDATE/);
    expect(sql).toMatch(/created_at = CASE WHEN checador_empleados\.empleado_id = EXCLUDED\.empleado_id\s+THEN checador_empleados\.created_at ELSE NOW\(\) END/);
  });
});
