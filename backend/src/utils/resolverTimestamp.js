const HORAS_72 = 72 * 3600 * 1000;
const CINCO_MIN = 5 * 60 * 1000;
const DOS_MIN = 2 * 60 * 1000;

const fecha = (iso) => {
  if (typeof iso !== 'string') return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d;
};

// Hora de la checada. Si el celular manda enviado_en (su reloj al momento del POST), se corrige el
// desfase de su reloj: offset = ahora − enviado_en; la checada queda en timestamp_dispositivo + offset.
// Un desfase > 2 min marca la checada dudosa. Si la hora (corregida) no es plausible
// (más de 72 h atrás o más de 5 min adelante) se usa la del servidor y se marca dudosa.
module.exports = function resolverTimestamp(dispositivoIso, enviadoIso, ahora) {
  const d = fecha(dispositivoIso);
  if (!d) return { timestamp: ahora, hora_dudosa: true };

  const enviado = fecha(enviadoIso);
  const offset = enviado ? ahora.getTime() - enviado.getTime() : 0;
  const corregido = new Date(d.getTime() + offset);

  if (corregido < new Date(ahora.getTime() - HORAS_72) || corregido > new Date(ahora.getTime() + CINCO_MIN)) {
    return { timestamp: ahora, hora_dudosa: true };
  }
  return { timestamp: corregido, hora_dudosa: Math.abs(offset) > DOS_MIN };
};
