require('dotenv').config();
const ZKLib = require('node-zklib');
const axios = require('axios');

const CHECADOR_IP      = process.env.CHECADOR_IP      || '192.168.1.100';
const CHECADOR_PUERTO  = parseInt(process.env.CHECADOR_PUERTO || '4370');
const BACKEND_URL      = process.env.BACKEND_URL      || 'http://62.238.3.136/api';
const API_KEY          = process.env.API_KEY;
const INTERVALO_MIN    = parseInt(process.env.INTERVALO_MINUTOS || '5');

if (!API_KEY) {
  console.error('[ERROR] Falta API_KEY en .env');
  process.exit(1);
}

// Guarda el último timestamp sincronizado para no reenviar todo siempre
let ultimaSync = new Date(0);

function log(msg) {
  console.log(`[${new Date().toLocaleString('es-MX')}] ${msg}`);
}

// Tipo de checada ZKTeco: 0=entrada, 1=salida, resto=desconocido
function mapTipo(state) {
  if (state === 0) return 'entrada';
  if (state === 1) return 'salida';
  return 'desconocido';
}

async function sincronizar() {
  log('Conectando al K30...');
  const zk = new ZKLib(CHECADOR_IP, CHECADOR_PUERTO, 10000, 4000);

  try {
    await zk.createSocket();
    log('Conectado. Leyendo registros...');

    const { data: asistencia } = await zk.getAttendances();

    if (!asistencia || asistencia.length === 0) {
      log('Sin registros en el dispositivo.');
      await zk.disconnect();
      return;
    }

    // Filtrar solo registros nuevos desde la última sync
    const nuevos = asistencia.filter(r => new Date(r.recordTime) > ultimaSync);

    if (nuevos.length === 0) {
      log(`Sin registros nuevos (última sync: ${ultimaSync.toLocaleString('es-MX')})`);
      await zk.disconnect();
      return;
    }

    log(`Enviando ${nuevos.length} registro(s) al servidor...`);

    const registros = nuevos.map(r => ({
      uid_checador: r.deviceUserId,
      timestamp: new Date(r.recordTime).toISOString(),
      tipo: mapTipo(r.type),
    }));

    const { data } = await axios.post(
      `${BACKEND_URL}/checadas/sync`,
      { registros },
      { headers: { 'x-api-key': API_KEY }, timeout: 15000 }
    );

    log(`Sync completada. Insertadas: ${data.insertadas}`);
    ultimaSync = new Date();

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      log(`No se pudo conectar al K30 en ${CHECADOR_IP}:${CHECADOR_PUERTO} — verifica la IP y que esté encendido.`);
    } else {
      log(`Error: ${err.message}`);
    }
  } finally {
    try { await zk.disconnect(); } catch (_) {}
  }
}

async function main() {
  log(`Agente Fix Tech Support iniciado. Checador: ${CHECADOR_IP}:${CHECADOR_PUERTO}`);
  log(`Sincronizando cada ${INTERVALO_MIN} minuto(s).`);

  // Primera sync inmediata
  await sincronizar();

  // Luego cada N minutos
  setInterval(sincronizar, INTERVALO_MIN * 60 * 1000);
}

main();
