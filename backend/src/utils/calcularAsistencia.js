const { fechaMx, horaMx } = require('./horaMexico');

const TOLERANCIA_RETARDO_MIN = 10;
const TIPOS_ENTRADA = new Set(['entrada', 'desconocido']);
const DIA_MS = 24 * 60 * 60 * 1000;

const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Aritmética de calendario pura en UTC: la zona del servidor nunca recorre días.
const aUtc = (fecha) => { const [y, m, d] = fecha.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diaIso = (ms) => new Date(ms).getUTCDay() || 7;

// fechas 'YYYY-MM-DD' de desde a min(hasta, hoy), con su día ISO
function diasDelRango(desde, hasta, hoy) {
  const fin = aUtc(hasta < hoy ? hasta : hoy);
  const dias = [];
  for (let ms = aUtc(desde); ms <= fin; ms += DIA_MS) {
    dias.push({ fecha: new Date(ms).toISOString().slice(0, 10), iso: diaIso(ms) });
  }
  return dias;
}

function calcularAsistencia({ empleados, checadas, desde, hasta, hoy }) {
  // primera entrada por empleado y día México: Map<empleado_id, Map<fecha, Date>>
  const entradas = new Map();
  for (const c of checadas) {
    if (!TIPOS_ENTRADA.has(c.tipo)) continue;
    const ts = new Date(c.timestamp);
    if (!entradas.has(c.empleado_id)) entradas.set(c.empleado_id, new Map());
    const porDia = entradas.get(c.empleado_id);
    const fecha = fechaMx(ts);
    if (!porDia.has(fecha) || ts < porDia.get(fecha)) porDia.set(fecha, ts);
  }

  const rango = diasDelRango(desde, hasta, hoy);

  return empleados.map((e) => {
    const laborables = new Set(e.dias || []);
    const porDia = entradas.get(e.id) || new Map();
    const limite = e.hora_entrada ? minutos(e.hora_entrada) + TOLERANCIA_RETARDO_MIN : null;
    let dias_trabajados = 0, retardos = 0, faltas = 0;

    for (const { fecha, iso } of rango) {
      if (!laborables.has(iso)) continue;
      const entrada = porDia.get(fecha);
      if (!entrada) { faltas++; continue; }
      dias_trabajados++;
      if (limite !== null && minutos(horaMx(entrada)) > limite) retardos++;
    }
    return { empleado_id: e.id, nombre: e.nombre, dias_trabajados, retardos, faltas };
  });
}

module.exports = { calcularAsistencia, TOLERANCIA_RETARDO_MIN };
