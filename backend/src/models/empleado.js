const pool = require('../db/pool');

// Horas: solo HH:MM[:SS]; vacío/inválido se ignora (la columna es NOT NULL con default)
const HORAS = ['hora_entrada', 'hora_salida'];
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const sinPin = ({ pin_hash, ...resto }) => resto;

// numero_empleado = código del empleado en NOMIPAQ y usuario de la app. Vacío = no se toca
// (en alta: siguiente número libre). Inválido o repetido = 400/409.
const NUMERO_RE = /^[1-9]\d{0,8}$/;
function numeroEmpleado(data) {
  const v = data.numero_empleado;
  if (v === undefined || v === null || String(v).trim() === '') return null;
  if (!NUMERO_RE.test(String(v).trim())) {
    throw Object.assign(new Error('El número de empleado debe ser un entero positivo'), { status: 400 });
  }
  return Number(String(v).trim());
}
async function conNumeroUnico(promesa) {
  try { return await promesa; } catch (err) {
    if (err.code === '23505' && /numero_empleado/.test(err.constraint || err.detail || '')) {
      throw Object.assign(new Error('Ese número de empleado ya lo tiene otro empleado'), { status: 409 });
    }
    throw err;
  }
}

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
    return rows.map(sinPin);
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);
    return rows[0] ? sinPin(rows[0]) : null;
  },

  async create(data) {
    const {
      nombre, apellido_paterno, apellido_materno, curp, rfc,
      fecha_nacimiento, fecha_ingreso, puesto, departamento,
      telefono, email, direccion, nombre_beneficiario, observaciones, estatus, estado,
    } = data;
    const cols = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'curp', 'rfc',
      'fecha_nacimiento', 'fecha_ingreso', 'puesto', 'departamento',
      'telefono', 'email', 'direccion', 'nombre_beneficiario', 'observaciones', 'estatus', 'estado',
    ];
    const vals = [nombre, apellido_paterno, apellido_materno, curp || null, rfc || null,
      fecha_nacimiento || null, fecha_ingreso, puesto || null, departamento || null,
      telefono || null, email, direccion || null,
      nombre_beneficiario || null, observaciones || null, estatus || 'activo', estado || 'activo'];
    for (const h of HORAS) {
      if (HORA_RE.test(data[h] || '')) { cols.push(h); vals.push(data[h]); }
    }
    const ph = cols.map((_, i) => `$${i + 1}`);
    // Sin número capturado: max+1 (no la secuencia, para no chocar con números capturados a mano).
    // ponytail: dos altas simultáneas → el índice único rechaza una (409) y basta reintentar.
    cols.push('numero_empleado'); vals.push(numeroEmpleado(data));
    ph.push(`COALESCE($${vals.length}::int, (SELECT COALESCE(MAX(numero_empleado), 0) + 1 FROM empleados))`);
    const { rows } = await conNumeroUnico(pool.query(
      `INSERT INTO empleados (${cols.join(', ')})
       VALUES (${ph.join(',')})
       RETURNING *`,
      vals
    ));
    return sinPin(rows[0]);
  },

  async update(id, data) {
    // Lista explícita de campos editables — evita inyectar updated_at, id, created_at, etc.
    const EDITABLES = [
      'nombre', 'apellido_paterno', 'apellido_materno', 'curp', 'rfc',
      'fecha_nacimiento', 'fecha_ingreso', 'puesto', 'departamento',
      'telefono', 'email', 'direccion', 'nombre_beneficiario', 'observaciones',
      'estatus', 'estado', 'foto',
      'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
      'hora_entrada', 'hora_salida',
    ];
    const fields = Object.keys(data).filter(k =>
      EDITABLES.includes(k) && (!HORAS.includes(k) || HORA_RE.test(data[k] || '')));
    const values = fields.map(f => data[f] || null);
    const numero = numeroEmpleado(data);
    if (numero !== null) { fields.push('numero_empleado'); values.push(numero); }
    if (!fields.length) return this.findById(id);
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await conNumeroUnico(pool.query(
      `UPDATE empleados SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    ));
    return rows[0] ? sinPin(rows[0]) : null;
  },

  async setPin(id, pinHash) {
    const { rowCount } = await pool.query(
      'UPDATE empleados SET pin_hash = $1, pin_generado_en = NOW(), updated_at = NOW() WHERE id = $2',
      [pinHash, id]
    );
    return rowCount > 0;
  },

  async delete(id) {
    await pool.query('DELETE FROM empleados WHERE id = $1', [id]);
  },
};

module.exports = EmpleadoModel;
