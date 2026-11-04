const resolverTimestamp = require('../../src/utils/resolverTimestamp');
const { fechaMx, horaMx, diaIsoMx } = require('../../src/utils/horaMexico');

const ahora = new Date('2026-11-04T15:00:00Z');

describe('resolverTimestamp', () => {
  it('dentro de rango -> la del dispositivo', () => {
    const r = resolverTimestamp('2026-11-04T14:58:00Z', undefined, ahora);
    expect(r.timestamp).toEqual(new Date('2026-11-04T14:58:00Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it('ayer 08:58 -> la del dispositivo', () => {
    const r = resolverTimestamp('2026-11-03T14:58:00Z', undefined, ahora);
    expect(r.timestamp).toEqual(new Date('2026-11-03T14:58:00Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it.each(['2020-01-01T00:00:00Z', '2026-11-04T16:00:00Z', undefined, 'basura'])('%s -> ahora dudosa', (v) => {
    const r = resolverTimestamp(v, undefined, ahora);
    expect(r.timestamp).toEqual(ahora);
    expect(r.hora_dudosa).toBe(true);
  });
});

describe('resolverTimestamp con enviado_en (corrección de reloj)', () => {
  // ahora = 09:40 México real
  const real = new Date('2026-11-04T15:40:00Z');

  it('reloj 35 min atrasado, checada a las 9:40 real enviada al momento -> 9:40, dudosa', () => {
    const r = resolverTimestamp('2026-11-04T15:05:00Z', '2026-11-04T15:05:00Z', real);
    expect(r.timestamp).toEqual(real);
    expect(r.hora_dudosa).toBe(true);
  });
  it('reloj correcto -> la del dispositivo, no dudosa', () => {
    const r = resolverTimestamp('2026-11-04T15:39:58Z', '2026-11-04T15:39:59Z', real);
    expect(r.timestamp).toEqual(new Date('2026-11-04T15:39:59Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it('encolada 2 h antes con reloj correcto -> hora del dispositivo, no dudosa', () => {
    const r = resolverTimestamp('2026-11-04T13:40:00Z', '2026-11-04T15:40:00Z', real);
    expect(r.timestamp).toEqual(new Date('2026-11-04T13:40:00Z'));
    expect(r.hora_dudosa).toBe(false);
  });
  it('reloj adelantado 1 h y encolada 2 h antes -> corregida, dudosa', () => {
    const r = resolverTimestamp('2026-11-04T14:40:00Z', '2026-11-04T16:40:00Z', real);
    expect(r.timestamp).toEqual(new Date('2026-11-04T13:40:00Z'));
    expect(r.hora_dudosa).toBe(true);
  });
  it('corregida fuera de la ventana de 72 h -> ahora, dudosa', () => {
    const r = resolverTimestamp('2026-11-01T10:00:00Z', '2026-11-04T15:40:00Z', real);
    expect(r.timestamp).toEqual(real);
    expect(r.hora_dudosa).toBe(true);
  });
  it.each([undefined, 'basura', 42])('enviado_en %p -> comportamiento anterior', (env) => {
    expect(resolverTimestamp('2026-11-04T15:05:00Z', env, real))
      .toEqual({ timestamp: new Date('2026-11-04T15:05:00Z'), hora_dudosa: false });
    expect(resolverTimestamp('2020-01-01T00:00:00Z', env, real)).toEqual({ timestamp: real, hora_dudosa: true });
  });
});

describe('horaMexico', () => {
  const d = new Date('2026-11-04T01:00:00Z');
  it('fechaMx', () => expect(fechaMx(d)).toBe('2026-11-03'));
  it('horaMx', () => expect(horaMx(d)).toBe('19:00'));
  it('diaIsoMx martes', () => expect(diaIsoMx(d)).toBe(2));
  it('domingo = 7', () => expect(diaIsoMx(new Date('2026-11-08T18:00:00Z'))).toBe(7));
});
