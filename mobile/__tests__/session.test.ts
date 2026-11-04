import * as SecureStore from 'expo-secure-store';
import { empleadoIdDeToken, getSession, renovarSesion, saveSession } from '../src/session';

jest.mock('expo-secure-store');

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (o: object) => `h.${b64url(o)}.s`;

describe('empleadoIdDeToken', () => {
  test('reads empleado_id', () => {
    expect(empleadoIdDeToken(token({ role: 'empleado', empleado_id: 7 }))).toBe(7);
  });

  test('pads base64url before atob (strict decoders reject unpadded input)', () => {
    const payload = { role: 'empleado', empleado_id: 12345, pv: 1 };
    expect(b64url(payload).length % 4).not.toBe(0); // the case under test
    const spy = jest.spyOn(globalThis, 'atob');
    try {
      expect(empleadoIdDeToken(token(payload))).toBe(12345);
      const arg = spy.mock.calls[0][0] as string;
      expect(arg.length % 4).toBe(0);
      expect(arg).not.toMatch(/[-_]/);
    } finally {
      spy.mockRestore();
    }
  });

  test('garbage -> undefined', () => {
    expect(empleadoIdDeToken('nope')).toBeUndefined();
  });
});

describe('renovarSesion', () => {
  let store: Record<string, string> = {};
  beforeEach(() => {
    store = {};
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
    (SecureStore.setItemAsync as jest.Mock).mockReset().mockImplementation((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    });
  });

  test('saves the fresh token and backfills empleadoId, keeping nombre', async () => {
    await saveSession({ token: 'viejo', nombre: 'Ana López' });
    await renovarSesion({ id: 7, token: 'nuevo' });
    expect(await getSession()).toEqual({ token: 'nuevo', nombre: 'Ana López', empleadoId: 7 });
  });

  test('without a token in /yo keeps the current one', async () => {
    await saveSession({ token: 'viejo', nombre: 'Ana', empleadoId: 7 });
    await renovarSesion({ id: 7 });
    expect(await getSession()).toEqual({ token: 'viejo', nombre: 'Ana', empleadoId: 7 });
  });

  test('no session -> nothing saved', async () => {
    await renovarSesion({ id: 7, token: 'nuevo' });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
