// Convierte un evento de reloj Hikvision (ISAPI "HTTP Listening") en un registro para syncBatch.
// El reloj manda multipart/form-data con un campo JSON (event_log / AccessControllerEvent) o JSON directo.
// Devuelve { uid_checador, timestamp, tipo } o null si no es una checada válida (heartbeat, rostro
// desconocido, puerta, etc.).
// ponytail: solo majorEventType 5 (control de acceso) con número de empleado = verificación exitosa;
// si algún firmware manda fallas con employeeNo, filtrar también por subEventType (1 tarjeta, 38 huella, 75 rostro).
const TIPOS = { checkIn: 'entrada', breakIn: 'entrada', overtimeIn: 'entrada',
                checkOut: 'salida', breakOut: 'salida', overtimeOut: 'salida' };

function extraerJson(body) {
  if (!body) return null;
  if (body.AccessControllerEvent && typeof body.AccessControllerEvent === 'object') return body;
  for (const v of Object.values(body)) {
    if (typeof v !== 'string' || !v.includes('AccessControllerEvent')) continue;
    try { return JSON.parse(v); } catch { /* sigue buscando */ }
  }
  return null;
}

module.exports = function hikEvento(body) {
  const ev = extraerJson(body);
  const ace = ev && ev.AccessControllerEvent;
  if (!ace || ace.majorEventType !== 5) return null;

  const uid = parseInt(ace.employeeNoString ?? ace.employeeNo, 10);
  if (!Number.isInteger(uid) || uid <= 0) return null;

  const timestamp = new Date(ev.dateTime);
  if (isNaN(timestamp)) return null;

  return { uid_checador: uid, timestamp, tipo: TIPOS[ace.attendanceStatus] || 'desconocido' };
};
