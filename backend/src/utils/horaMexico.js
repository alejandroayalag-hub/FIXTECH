const TZ = 'America/Mexico_City';

function partes(date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  });
  return Object.fromEntries(f.formatToParts(date).map((p) => [p.type, p.value]));
}

const fechaMx = (date) => { const p = partes(date); return `${p.year}-${p.month}-${p.day}`; };
const horaMx = (date) => { const p = partes(date); return `${p.hour}:${p.minute}`; };
const diaIsoMx = (date) => ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 })[partes(date).weekday];

module.exports = { fechaMx, horaMx, diaIsoMx };
