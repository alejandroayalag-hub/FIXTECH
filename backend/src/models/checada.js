const pool = require('../db/pool');

const CheckadaModel = {
  async findByEmpleado(empleadoId, { desde, hasta } = {}) {
    let query = `
      SELECT c.*, d.nombre AS dispositivo_nombre, d.ubicacion
      FROM checadas c
      JOIN checador_dispositivos d ON d.id = c.dispositivo_id
      WHERE c.empleado_id = $1
    `;
    const params = [empleadoId];
    if (desde) { params.push(desde); query += ` AND c.timestamp >= $${params.length}`; }
    if (hasta) { params.push(hasta); query += ` AND c.timestamp <= $${params.length}`; }
    query += ' ORDER BY c.timestamp DESC';
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async syncBatch(dispositivoId, registros) {
    // registros: [{ uid_checador, timestamp, tipo }]
    const insertadas = [];
    for (const r of registros) {
      // Buscar empleado mapeado
      const { rows: [mapa] } = await pool.query(
        'SELECT empleado_id FROM checador_empleados WHERE dispositivo_id=$1 AND uid_checador=$2',
        [dispositivoId, r.uid_checador]
      );
      if (!mapa) continue;

      try {
        const { rows: [checada] } = await pool.query(
          `INSERT INTO checadas (empleado_id, dispositivo_id, timestamp, tipo, uid_checador)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (dispositivo_id, uid_checador, timestamp) DO NOTHING
           RETURNING *`,
          [mapa.empleado_id, dispositivoId, r.timestamp, r.tipo || 'desconocido', r.uid_checador]
        );
        if (checada) insertadas.push(checada);
      } catch (_) { /* ignorar duplicados */ }
    }
    return insertadas;
  },

  async getDispositivo(apiKey) {
    const { rows: [d] } = await pool.query(
      'SELECT * FROM checador_dispositivos WHERE api_key=$1 AND activo=true',
      [apiKey]
    );
    return d || null;
  },

  async getMappings(dispositivoId) {
    const { rows } = await pool.query(
      `SELECT ce.uid_checador, e.id, e.nombre, e.apellido_paterno, e.apellido_materno
       FROM checador_empleados ce
       JOIN empleados e ON e.id = ce.empleado_id
       WHERE ce.dispositivo_id = $1`,
      [dispositivoId]
    );
    return rows;
  },

  async upsertMapping(dispositivoId, empleadoId, uidChecador) {
    const { rows: [r] } = await pool.query(
      `INSERT INTO checador_empleados (dispositivo_id, empleado_id, uid_checador)
       VALUES ($1,$2,$3)
       ON CONFLICT (dispositivo_id, uid_checador) DO UPDATE SET empleado_id=EXCLUDED.empleado_id
       RETURNING *`,
      [dispositivoId, empleadoId, uidChecador]
    );
    return r;
  },

  async deleteMapping(id) {
    await pool.query('DELETE FROM checador_empleados WHERE id=$1', [id]);
  },

  async getAllMappings() {
    const { rows } = await pool.query(
      `SELECT ce.id, ce.uid_checador,
              e.id AS empleado_id, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto,
              d.id AS dispositivo_id, d.nombre AS dispositivo_nombre, d.ubicacion
       FROM checador_empleados ce
       JOIN empleados e ON e.id = ce.empleado_id
       JOIN checador_dispositivos d ON d.id = ce.dispositivo_id
       ORDER BY d.nombre, ce.uid_checador`
    );
    return rows;
  },

  async getAllDispositivos() {
    const { rows } = await pool.query(
      'SELECT id, nombre, ubicacion, ip, activo FROM checador_dispositivos ORDER BY nombre'
    );
    return rows;
  },
};

module.exports = CheckadaModel;
