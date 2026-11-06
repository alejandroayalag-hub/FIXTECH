const hikEvento = require('../../src/utils/hikEvento');

const evento = (ace, extra = {}) => ({
  ipAddress: '192.168.1.64', dateTime: '2026-11-05T09:03:10-06:00', eventType: 'AccessControllerEvent',
  AccessControllerEvent: { majorEventType: 5, subEventType: 75, employeeNoString: '7', attendanceStatus: 'checkIn', ...ace },
  ...extra,
});

describe('hikEvento', () => {
  it('multipart: campo event_log con JSON -> entrada', () => {
    const r = hikEvento({ event_log: JSON.stringify(evento()) });
    expect(r).toEqual({ uid_checador: 7, timestamp: new Date('2026-11-05T15:03:10Z'), tipo: 'entrada' });
  });

  it('JSON directo y checkOut -> salida', () => {
    expect(hikEvento(evento({ attendanceStatus: 'checkOut' })).tipo).toBe('salida');
  });

  it('sin estado de asistencia -> desconocido', () => {
    expect(hikEvento(evento({ attendanceStatus: 'undefined' })).tipo).toBe('desconocido');
  });

  it('rostro desconocido (sin número de empleado) -> null', () => {
    expect(hikEvento(evento({ employeeNoString: undefined, subEventType: 76 }))).toBeNull();
  });

  it('evento que no es de acceso (puerta, alarma) -> null', () => {
    expect(hikEvento(evento({ majorEventType: 3 }))).toBeNull();
  });

  it('heartbeat / basura -> null', () => {
    expect(hikEvento({ event_log: '{"eventType":"heartBeat"}' })).toBeNull();
    expect(hikEvento({ x: 'no json AccessControllerEvent' })).toBeNull();
    expect(hikEvento(undefined)).toBeNull();
  });
});
