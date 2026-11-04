const resolverTimestamp = require('../../src/utils/resolverTimestamp');
const { fechaMx, horaMx, diaIsoMx } = require('../../src/utils/horaMexico');

const ahora = new Date('2026-11-04T15:00:00Z');

describe('resolverTimestamp', () => {
  it('dentro de rango -> la del dispositivo', () => {
    const r = resolverTimestamp('2026-11-04T14:58:00Z', ahora);
    expect(r.timestamp).toEqual(new Date('2026-11-04T14:58:00Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it('ayer 08:58 -> la del dispositivo', () => {
    const r = resolverTimestamp('2026-11-03T14:58:00Z', ahora);
    expect(r.timestamp).toEqual(new Date('2026-11-03T14:58:00Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it.each(['2020-01-01T00:00:00Z', '2026-11-04T16:00:00Z', undefined, 'basura'])('%s -> ahora dudosa', (v) => {
    const r = resolverTimestamp(v, ahora);
    expect(r.timestamp).toEqual(ahora);
    expect(r.hora_dudosa).toBe(true);
  });
});

describe('horaMexico', () => {
  const d = new Date('2026-11-04T01:00:00Z');
  it('fechaMx', () => expect(fechaMx(d)).toBe('2026-11-03'));
  it('horaMx', () => expect(horaMx(d)).toBe('19:00'));
  it('diaIsoMx martes', () => expect(diaIsoMx(d)).toBe(2));
  it('domingo = 7', () => expect(diaIsoMx(new Date('2026-11-08T18:00:00Z'))).toBe(7));
});
