const pool = require('../db/pool');

const DocumentoModel = {
  async findByEmpleado(empleadoId) {
    const { rows } = await pool.query(
      `SELECT d.*, td.nombre AS tipo_nombre
       FROM documentos d
       JOIN tipos_documento td ON td.id = d.tipo_documento_id
       WHERE d.empleado_id = $1
       ORDER BY td.nombre`,
      [empleadoId]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT d.*, td.nombre AS tipo_nombre
       FROM documentos d
       JOIN tipos_documento td ON td.id = d.tipo_documento_id
       WHERE d.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async upsert({ empleado_id, tipo_documento_id, filename, ruta, estatus }) {
    const { rows } = await pool.query(
      `INSERT INTO documentos (empleado_id, tipo_documento_id, filename, ruta, estatus)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (empleado_id, tipo_documento_id)
       DO UPDATE SET filename = EXCLUDED.filename, ruta = EXCLUDED.ruta,
                     estatus = EXCLUDED.estatus, updated_at = NOW()
       RETURNING *`,
      [empleado_id, tipo_documento_id, filename, ruta, estatus || 'completo']
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM documentos WHERE id = $1 RETURNING ruta',
      [id]
    );
    return rows[0] || null;
  },

  async findTipos() {
    const { rows } = await pool.query('SELECT * FROM tipos_documento ORDER BY nombre');
    return rows;
  },
};

module.exports = DocumentoModel;
