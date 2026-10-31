const pool = require('../db/pool');

const EmpleadoModel = {
  async findAll(filters = {}) {
    const { estado } = filters;
    let query = 'SELECT * FROM empleados';
    const params = [];

    if (estado) {
      params.push(estado);
      query += ` WHERE estado = $${params.length}`;
    }

    query += ' ORDER BY apellido_paterno, nombre';

    const { rows } = await pool.query(query, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      nombre, apellido_paterno, apellido_materno, curp, rfc,
      fecha_nacimiento, fecha_ingreso, puesto, departamento,
      telefono, email, direccion, nombre_beneficiario, observaciones, estatus, estado,
    } = data;
    const { rows } = await pool.query(
      `INSERT INTO empleados
        (nombre, apellido_paterno, apellido_materno, curp, rfc,
         fecha_nacimiento, fecha_ingreso, puesto, departamento,
         telefono, email, direccion, nombre_beneficiario, observaciones, estatus, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, curp || null, rfc || null,
       fecha_nacimiento || null, fecha_ingreso, puesto || null, departamento || null,
       telefono || null, email, direccion || null,
       nombre_beneficiario || null, observaciones || null, estatus || 'activo', estado || 'activo']
    );
    return rows[0];
  },

  async update(id, data) {
    // Lista explícita de campos editables — evita inyectar updated_at, id, created_at, etc.
    const EDITABLES = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'curp', 'rfc',
      'fecha_nacimiento', 'fecha_ingreso', 'puesto', 'departamento',
      'telefono', 'email', 'direccion', 'nombre_beneficiario', 'observaciones',
      'estatus', 'estado', 'foto',
      'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
    ];
    const fields = Object.keys(data).filter(k => EDITABLES.includes(k));
    if (!fields.length) return this.findById(id);
    const values = fields.map(f => data[f] || null);
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE empleados SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    await pool.query('DELETE FROM empleados WHERE id = $1', [id]);
  },
};

module.exports = EmpleadoModel;
