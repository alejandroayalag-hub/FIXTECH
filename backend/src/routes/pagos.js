const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const pool = require('../db/pool');
const PagoModel = require('../models/pago');

const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads', 'pagos') });

function normalizarNombre(str) {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsearLineas(texto) {
  const registros = [];

  // Formato BBVA comprobantes: cada pago empieza con "Resultado del traspaso"
  const secciones = texto.split('Resultado del traspaso').slice(1);

  if (secciones.length > 0) {
    for (const seccion of secciones) {
      const lineas = seccion.split('\n').map(l => l.trim()).filter(Boolean);
      let nombre_pdf = null, cuenta = null, monto = null, autorizado = null;

      for (const linea of lineas) {
        // Nombre del beneficiario (no "Nombre corto:")
        if (/^Nombre:\s+/i.test(linea)) {
          nombre_pdf = linea.replace(/^Nombre:\s+/i, '').trim();
        }
        // Cuenta de depósito
        if (/^Cuenta de dep[oó]sito:\s+/i.test(linea)) {
          cuenta = linea.replace(/^Cuenta de dep[oó]sito:\s+/i, '').trim().replace(/\s+/g, '');
        }
        // Importe
        if (/^Importe:/i.test(linea)) {
          const m = linea.match(/([\d,]+\.\d{2})/);
          if (m) monto = parseFloat(m[1].replace(/,/g, ''));
        }
        // Estatus
        if (/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i.test(linea)) {
          autorizado = linea.match(/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i)[0].toUpperCase();
        }
      }

      if (nombre_pdf && monto) {
        registros.push({ nombre_pdf, cuenta, monto, autorizado });
      }
    }
    return registros;
  }

  // Fallback: formato de lista en una línea por registro
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  for (const linea of lineas) {
    const montoMatch = linea.match(/\$?\s*([\d,]+\.\d{2})/);
    if (!montoMatch) continue;
    const monto = parseFloat(montoMatch[1].replace(/,/g, ''));
    if (isNaN(monto) || monto <= 0) continue;
    const cuentaMatch = linea.match(/\b(\d{10,18})\b/);
    const cuenta = cuentaMatch ? cuentaMatch[1] : null;
    const autorizado = /AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i.test(linea)
      ? linea.match(/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i)[0].toUpperCase() : null;
    let resto = linea
      .replace(cuentaMatch ? cuentaMatch[0] : '', '')
      .replace(montoMatch[0], '')
      .replace(/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/gi, '')
      .replace(/\$/g, '').replace(/[0-9,.]/g, ' ').replace(/\s+/g, ' ').trim();
    const nombreMatch = resto.match(/[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})+/);
    if (!nombreMatch || nombreMatch[0].length < 5) continue;
    registros.push({ nombre_pdf: nombreMatch[0].trim(), cuenta, monto, autorizado });
  }
  return registros;
}

async function buscarEmpleados() {
  const { rows } = await pool.query(
    `SELECT id, nombre, apellido_paterno, apellido_materno FROM empleados WHERE estatus = 'activo'`
  );
  return rows.map(e => ({
    id: e.id,
    nombreNormalizado: normalizarNombre(
      `${e.apellido_paterno} ${e.apellido_materno || ''} ${e.nombre}`
    ),
    display: `${e.apellido_paterno} ${e.apellido_materno || ''}, ${e.nombre}`.trim(),
  }));
}

function matchEmpleado(nombrePdf, empleados) {
  const normalizado = normalizarNombre(nombrePdf);
  // Exacto
  const exacto = empleados.find(e => e.nombreNormalizado === normalizado);
  if (exacto) return exacto;
  // Parcial: el nombre del PDF contiene el apellido paterno y materno del empleado
  const parcial = empleados.find(e => {
    const partes = e.nombreNormalizado.split(' ').filter(Boolean);
    return partes.length >= 2 && partes.every(p => normalizado.includes(p));
  });
  return parcial || null;
}

// POST /api/pagos/parsear — sube PDF y devuelve preview sin guardar
router.post('/parsear', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo PDF' });

    const buf = fs.readFileSync(req.file.path);
    const data = await pdfParse(buf);
    fs.unlinkSync(req.file.path);

    const registros = parsearLineas(data.text);
    const empleados = await buscarEmpleados();

    const preview = registros.map(r => {
      const match = matchEmpleado(r.nombre_pdf, empleados);
      return {
        ...r,
        empleado_id: match?.id || null,
        empleado_display: match?.display || null,
      };
    });

    res.json({ texto_raw: data.text, preview });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// POST /api/pagos/importar — guarda semana + pagos definitivamente
router.post('/importar', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo PDF' });

    const { semana, anio, registros: registrosJson } = req.body;
    if (!semana || !anio) return res.status(400).json({ error: 'Semana y año son requeridos' });

    const existe = await PagoModel.semanaExiste(semana, anio);
    if (existe) return res.status(409).json({ error: `La semana ${semana}/${anio} ya fue importada` });

    const registros = JSON.parse(registrosJson);

    // Mover PDF a carpeta definitiva
    const pagosDir = path.join(__dirname, '..', '..', 'uploads', 'pagos');
    if (!fs.existsSync(pagosDir)) fs.mkdirSync(pagosDir, { recursive: true });
    const filename = `pagos_s${semana}_${anio}_${Date.now()}.pdf`;
    const ruta = path.join(pagosDir, filename);
    fs.renameSync(req.file.path, ruta);

    const semanaRecord = await PagoModel.crearSemana({
      semana: parseInt(semana),
      anio: parseInt(anio),
      filename,
      ruta,
      total_registros: registros.length,
    });

    const pagosAInsertar = registros.map(r => ({
      semana_pago_id: semanaRecord.id,
      empleado_id: r.empleado_id || null,
      nombre_pdf: r.nombre_pdf,
      cuenta: r.cuenta || null,
      monto: r.monto || null,
      autorizado: r.autorizado || null,
    }));

    await PagoModel.insertarPagos(pagosAInsertar);

    res.status(201).json(semanaRecord);
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// GET /api/pagos/semanas
router.get('/semanas', async (req, res, next) => {
  try {
    const semanas = await PagoModel.findSemanas();
    res.json(semanas);
  } catch (err) { next(err); }
});

// GET /api/pagos/semana/:id
router.get('/semana/:id', async (req, res, next) => {
  try {
    const pagos = await PagoModel.findBySemana(req.params.id);
    res.json(pagos);
  } catch (err) { next(err); }
});

// GET /api/pagos/semana/:id/descargar
router.get('/semana/:id/descargar', async (req, res, next) => {
  try {
    const semana = await PagoModel.findSemanaById(req.params.id);
    if (!semana) return res.status(404).json({ error: 'No encontrado' });
    res.download(path.resolve(semana.ruta), semana.filename);
  } catch (err) { next(err); }
});

// GET /api/pagos/empleado/:id
router.get('/empleado/:id', async (req, res, next) => {
  try {
    const pagos = await PagoModel.findByEmpleado(req.params.id);
    res.json(pagos);
  } catch (err) { next(err); }
});

// DELETE /api/pagos/semana/:id
router.delete('/semana/:id', async (req, res, next) => {
  try {
    const semana = await PagoModel.findSemanaById(req.params.id);
    if (!semana) return res.status(404).json({ error: 'No encontrado' });
    if (fs.existsSync(semana.ruta)) fs.unlinkSync(semana.ruta);
    await PagoModel.deleteSemana(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
