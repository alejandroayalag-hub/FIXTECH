const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const pool = require('../db/pool');
const DocumentoModel = require('../models/documento');

router.post('/generar/:empleadoId', async (req, res, next) => {
  try {
    const { empleadoId } = req.params;
    const datos = req.body;

    const templatePath = path.join(__dirname, '..', 'templates', 'contrato_individual.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const doc = new Docxtemplater(new PizZip(content), { paragraphLoop: true, linebreaks: true });

    doc.render({
      nombre_trabajador:    datos.nombre_trabajador    || '',
      estado_civil:         datos.estado_civil         || '',
      sabe_leer_escribir:   datos.sabe_leer_escribir   || '',
      edad:                 datos.edad                 || '',
      lugar_origen:         datos.lugar_origen         || '',
      curp:                 datos.curp                 || '',
      profesion:            datos.profesion            || '',
      domicilio_trabajador: datos.domicilio_trabajador || '',
      colonia:              datos.colonia              || '',
      codigo_postal:        datos.codigo_postal        || '',
      telefono:             datos.telefono             || '',
      email:                datos.email                || '',
      nss:                  datos.nss                  || '',
      nombre_patron:        datos.nombre_patron        || '',
      razon_social:         datos.razon_social         || '',
      direccion_empresa:    datos.direccion_empresa    || '',
      colonia_empresa:      datos.colonia_empresa      || '',
      cp_empresa:           datos.cp_empresa           || '',
      ciudad:               datos.ciudad               || '',
      giro_empresa:         datos.giro_empresa         || '',
      puesto:               datos.puesto               || '',
      dir_trabajo:          datos.dir_trabajo          || '',
      colonia_trabajo:      datos.colonia_trabajo      || '',
      cp_trabajo:           datos.cp_trabajo           || '',
      hora_entrada:         datos.hora_entrada         || '',
      hora_salida:          datos.hora_salida          || '',
      descanso_inicio:      datos.descanso_inicio      || '',
      descanso_fin:         datos.descanso_fin         || '',
      salario_diario:       datos.salario_diario       || '',
      lugar_pago:           datos.lugar_pago           || '',
      nombre_capacitador:   datos.nombre_capacitador   || '',
      descripcion_obra:     datos.descripcion_obra     || '',
      habilidades_desarrollar: datos.habilidades_desarrollar || '',
      metodo_evaluacion:    datos.metodo_evaluacion    || '',
      duracion_prueba:      datos.duracion_prueba      || '',
      obligaciones:  (datos.obligaciones  || []).map(o => ({ texto: o })),
      prohibiciones: (datos.prohibiciones || []).map(p => ({ texto: p })),
      nombre_beneficiario:  datos.nombre_beneficiario  || '',
      fecha_inicio_dia:     datos.fecha_inicio_dia     || '',
      fecha_inicio_mes:     datos.fecha_inicio_mes     || '',
      fecha_inicio_anio:    datos.fecha_inicio_anio    || '',
      lugar_firma:          datos.lugar_firma          || '',
      fecha_firma_dia:      datos.fecha_firma_dia      || '',
      fecha_firma_mes:      datos.fecha_firma_mes      || '',
      fecha_firma_anio:     datos.fecha_firma_anio     || '',
    });

    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'contratos');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const nombreArchivo = `contrato_${(datos.nombre_trabajador || 'trabajador').replace(/\s+/g, '_')}.docx`;
    const ruta = path.join(uploadsDir, nombreArchivo);
    fs.writeFileSync(ruta, buf);

    const { rows: tipoRows } = await pool.query(
      "SELECT id FROM tipos_documento WHERE nombre = 'Contrato de trabajo'"
    );
    const tipo_documento_id = tipoRows[0]?.id;
    if (!tipo_documento_id) {
      return res.status(500).json({ error: 'Tipo "Contrato de trabajo" no encontrado en la base de datos' });
    }

    const docRecord = await DocumentoModel.upsert({
      empleado_id: empleadoId,
      tipo_documento_id,
      filename: nombreArchivo,
      ruta,
      estatus: 'completo',
    });

    res.status(201).json(docRecord);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
