const pool = require('../db/pool');

const SalidaModel = {
  async findAll(filters = {}) {
    let query = 'SELECT * FROM salidas';
    const params = [];
    const conditions = [];

    if (filters.empleadoId) {
      conditions.push(`empleado_id = $${conditions.length + 1}`);
      params.push(filters.empleadoId);
    }
    if (filters.empresaId) {
      conditions.push(`empresa_id = $${conditions.length + 1}`);
      params.push(filters.empresaId);
    }
    if (filters.estado) {
      conditions.push(`estado = $${conditions.length + 1}`);
      params.push(filters.estado);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha_salida DESC';

    const { rows } = await pool.query(query, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM salidas WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      empleadoId,
      empresaId,
      fechaSalida,
      tipoSalida,
      razonSalida,
      salarioPendiente = 0,
      estado = 'pendiente',
      documentosFirmados = false,
      createdBy,
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO salidas
        (empleado_id, empresa_id, fecha_salida, tipo_salida, razon_salida,
         salario_pendiente, estado, documentos_firmados, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        empleadoId,
        empresaId || null,
        fechaSalida,
        tipoSalida,
        razonSalida,
        salarioPendiente,
        estado,
        documentosFirmados,
        createdBy,
      ]
    );
    return rows[0];
  },

  async update(id, data) {
    // Lista explícita de campos editables
    const EDITABLES = [
      'fecha_salida',
      'tipo_salida',
      'razon_salida',
      'salario_pendiente',
      'estado',
      'documentos_firmados',
    ];

    const updates = {};
    Object.keys(data).forEach((key) => {
      // Convertir camelCase a snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (EDITABLES.includes(snakeKey)) {
        updates[snakeKey] = data[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const fields = Object.keys(updates);
    const values = fields.map((f) => updates[f]);
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `UPDATE salidas SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    await pool.query('DELETE FROM salidas WHERE id = $1', [id]);
  },

  async findByEmpleadoId(empleadoId) {
    const { rows } = await pool.query(
      'SELECT * FROM salidas WHERE empleado_id = $1 ORDER BY fecha_salida DESC',
      [empleadoId]
    );
    return rows;
  },

  async findByEstado(estado) {
    const { rows } = await pool.query(
      'SELECT * FROM salidas WHERE estado = $1 ORDER BY fecha_salida DESC',
      [estado]
    );
    return rows;
  },
};

module.exports = SalidaModel;
