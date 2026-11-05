const ExcelJS = require('exceljs');
const pool = require('../db/pool');
const { fechaMx } = require('../utils/horaMexico');
const { calcularAsistencia } = require('../utils/calcularAsistencia');

const esFecha = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
};

function validarRango({ desde, hasta }) {
  if (!esFecha(desde) || !esFecha(hasta)) return 'desde y hasta son requeridas (formato YYYY-MM-DD)';
  if (desde > hasta) return 'desde no puede ser posterior a hasta';
  return null;
}

// Primer día en que una ausencia es falta: max(desde, fecha de ingreso, inicio de registro), donde el
// inicio de registro es el día México del primer medio para checar (PIN generado o alta en el reloj).
// Sin ninguno de los dos (PIN legado sin fecha) no se restringe por registro.
function desdeEfectivo(desde, e) {
  const registros = [e.pin_generado_en, e.reloj_desde].filter(Boolean).map((d) => new Date(d));
  const inicioRegistro = registros.length ? fechaMx(new Date(Math.min(...registros))) : null;
  return [desde, e.fecha_ingreso ? String(e.fecha_ingreso).slice(0, 10) : null, inicioRegistro]
    .filter(Boolean)
    .reduce((a, b) => (b > a ? b : a));
}

async function obtenerReporte(desde, hasta) {
  const { rows: empleados } = await pool.query(
    `SELECT e.id, e.numero_empleado, e.nombre, e.apellido_paterno, e.hora_entrada, e.dias,
            e.fecha_ingreso::text AS fecha_ingreso, e.pin_generado_en,
            (SELECT MIN(ce.created_at) FROM checador_empleados ce WHERE ce.empleado_id = e.id) AS reloj_desde
       FROM empleados e
      WHERE e.estado = 'activo' AND e.estatus = 'activo'
        AND (e.pin_hash IS NOT NULL
             OR EXISTS (SELECT 1 FROM checador_empleados ce WHERE ce.empleado_id = e.id))
      ORDER BY e.nombre, e.apellido_paterno, e.id`
  );
  if (empleados.length === 0) return [];

  // ::timestamp explícito: "date AT TIME ZONE" a secas convierte el date a timestamptz con la zona de la
  // sesión, lo pasa a hora de pared de México (timestamp sin zona) y al compararlo con la columna vuelve a
  // leerse en la zona de la sesión; con la sesión en UTC la ventana quedaba 12 h antes (00:00 UTC ->
  // 18:00 del día anterior). date::timestamp AT TIME ZONE 'America/Mexico_City' es la medianoche de
  // México como instante (timestamptz), sin depender de la zona de la sesión.
  const { rows: checadas } = await pool.query(
    `SELECT empleado_id, timestamp, tipo, hora_dudosa
       FROM checadas
      WHERE empleado_id = ANY($3)
        AND timestamp >= ($1::date::timestamp AT TIME ZONE 'America/Mexico_City')
        AND timestamp < (($2::date + 1)::timestamp AT TIME ZONE 'America/Mexico_City')`,
    [desde, hasta, empleados.map((e) => e.id)]
  );

  const numero = new Map(empleados.map((e) => [e.id, e.numero_empleado]));
  const filas = calcularAsistencia({
    empleados: empleados.map((e) => ({
      id: e.id,
      nombre: [e.nombre, e.apellido_paterno].filter(Boolean).join(' '),
      hora_entrada: e.hora_entrada ? String(e.hora_entrada).slice(0, 5) : null,
      dias: e.dias,
      desde_efectivo: desdeEfectivo(desde, e),
    })),
    checadas,
    desde,
    hasta,
    hoy: fechaMx(new Date()),
  });
  return filas.map((f) => ({ numero_empleado: numero.get(f.empleado_id), ...f }));
}

async function asistencia(req, res, next) {
  try {
    const error = validarRango(req.query);
    if (error) return res.status(400).json({ error });
    res.json(await obtenerReporte(req.query.desde, req.query.hasta));
  } catch (err) { next(err); }
}

async function asistenciaXlsx(req, res, next) {
  try {
    const error = validarRango(req.query);
    if (error) return res.status(400).json({ error });
    const { desde, hasta } = req.query;
    const filas = await obtenerReporte(desde, hasta);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Asistencia');
    ws.columns = [
      { header: 'empleado', key: 'numero_empleado', width: 10 },
      { header: 'nombre', key: 'nombre', width: 36 },
      { header: 'dias_trabajados', key: 'dias_trabajados', width: 16 },
      { header: 'retardos', key: 'retardos', width: 10 },
      { header: 'faltas', key: 'faltas', width: 10 },
      { header: 'checadas_dudosas', key: 'checadas_dudosas', width: 18 },
    ];
    ws.addRows(filas);
    const buffer = await wb.xlsx.writeBuffer();

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="asistencia_${desde}_${hasta}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) { next(err); }
}

module.exports = { asistencia, asistenciaXlsx };
