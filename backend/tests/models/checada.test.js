const pool = require('../../src/db/pool');
const Checada = require('../../src/models/checada');

jest.mock('../../src/db/pool');

describe('Modelo Checada.findByEmpleado', () => {
  test('usa LEFT JOIN a dispositivos y selecciona campos de app', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await Checada.findByEmpleado(1);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/LEFT JOIN checador_dispositivos/);
    expect(sql).toMatch(/c\.origen, c\.lat, c\.lng, c\.hora_dudosa/);
  });
});
