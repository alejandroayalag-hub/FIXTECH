const HORAS_72 = 72 * 3600 * 1000;
const CINCO_MIN = 5 * 60 * 1000;

// Usa la hora del dispositivo si es plausible; si no, la del servidor y se marca dudosa.
module.exports = function resolverTimestamp(dispositivoIso, ahora) {
  const d = typeof dispositivoIso === 'string' ? new Date(dispositivoIso) : null;
  if (d && !isNaN(d) && d >= new Date(ahora.getTime() - HORAS_72) && d <= new Date(ahora.getTime() + CINCO_MIN)) {
    return { timestamp: d, hora_dudosa: false };
  }
  return { timestamp: ahora, hora_dudosa: true };
};
