import { siguienteTipo } from '../src/lib/jornada';

jest.mock('expo-secure-store', () => ({}));

const ahora = new Date('2026-11-04T20:00:00Z'); // 14:00 Mexico City
const ent = { tipo: 'entrada' as const, timestamp: '2026-11-04T14:00:00Z' };

describe('siguienteTipo', () => {
  it('sin checadas hoy -> entrada', () => {
    expect(siguienteTipo(null, [], ahora).tipo).toBe('entrada');
  });
  it('ultima entrada -> salida', () => {
    expect(siguienteTipo(ent, [], ahora).tipo).toBe('salida');
  });
  it('una salida en cola posterior manda sobre la entrada del servidor', () => {
    const cola = [{ tipo: 'salida' as const, timestamp_dispositivo: '2026-11-04T19:00:00Z' }];
    expect(siguienteTipo(ent, cola, ahora).tipo).toBe('entrada');
  });
  it('cola de ayer no cuenta', () => {
    const cola = [{ tipo: 'entrada' as const, timestamp_dispositivo: '2026-11-03T15:00:00Z' }];
    expect(siguienteTipo(null, cola, ahora).tipo).toBe('entrada');
  });
  it('usa el día de México, no UTC (02:00Z del 5 sigue siendo el 4)', () => {
    const tarde = new Date('2026-11-05T02:00:00Z');
    expect(siguienteTipo(ent, [], tarde).tipo).toBe('salida');
  });
});
