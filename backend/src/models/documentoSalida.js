const pool = require('../db/pool');

const DocumentoSalidaModel = {
  async findAll(filters = {}) {
    let query = 'SELECT * FROM documentos_salida';
    const params = [];
    const conditions = [];

    if (filters.salidaId) {
      conditions.push(`salida_id = $${conditions.length + 1}`);
      params.push(filters.salidaId);
    }
    if (filters.tipoDocumento) {
      conditions.push(`tipo_documento = $${conditions.length + 1}`);
      params.push(filters.tipoDocumento);
    }
    if (filters.estado) {
      conditions.push(`estado = $${conditions.length + 1}`);
      params.push(filters.estado);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM documentos_salida WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      salidaId,
      tipoDocumento,
      templateContenido,
      templateFechaGeneracion,
      templateUrl,
      documentoUrl,
      documentoNombre,
      documentoFechaCarga,
      documentoTamano,
      documentoTieneHuella,
      documentoTieneFirma,
      estado = 'template_generado',
      createdBy,
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO documentos_salida
        (salida_id, tipo_documento, template_contenido, template_fecha_generacion, template_url,
         documento_url, documento_nombre, documento_fecha_carga, documento_tamano,
         documento_tiene_huella, documento_tiene_firma, estado, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        salidaId,
        tipoDocumento,
        templateContenido || null,
        templateFechaGeneracion || null,
        templateUrl || null,
        documentoUrl || null,
        documentoNombre || null,
        documentoFechaCarga || null,
        documentoTamano || null,
        documentoTieneHuella !== undefined ? documentoTieneHuella : null,
        documentoTieneFirma !== undefined ? documentoTieneFirma : null,
        estado,
        createdBy || null,
      ]
    );
    return rows[0];
  },

  async update(id, data) {
    // Lista explícita de campos editables
    const EDITABLES = [
      'template_contenido',
      'template_fecha_generacion',
      'template_url',
      'documento_url',
      'documento_nombre',
      'documento_fecha_carga',
      'documento_tamano',
      'documento_tiene_huella',
      'documento_tiene_firma',
      'estado',
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
      `UPDATE documentos_salida SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    await pool.query('DELETE FROM documentos_salida WHERE id = $1', [id]);
  },

  async findBySalidaId(salidaId) {
    const { rows } = await pool.query(
      'SELECT * FROM documentos_salida WHERE salida_id = $1 ORDER BY created_at DESC',
      [salidaId]
    );
    return rows;
  },

  async findByTipoDocumento(tipoDocumento) {
    const { rows } = await pool.query(
      'SELECT * FROM documentos_salida WHERE tipo_documento = $1 ORDER BY created_at DESC',
      [tipoDocumento]
    );
    return rows;
  },

  async findByEstado(estado) {
    const { rows } = await pool.query(
      'SELECT * FROM documentos_salida WHERE estado = $1 ORDER BY created_at DESC',
      [estado]
    );
    return rows;
  },
};

module.exports = DocumentoSalidaModel;
