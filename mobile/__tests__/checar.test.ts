import * as Location from 'expo-location';
import { checar } from '../src/lib/checar';
import { apiClient } from '../src/api/client';
import { enqueueChecada } from '../src/lib/offlineQueue';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
let mockN = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockN}` }));
jest.mock('../src/api/client');
jest.mock('../src/lib/offlineQueue', () => ({
  ...jest.requireActual('../src/lib/offlineQueue'),
  enqueueChecada: jest.fn(),
}));
jest.mock('../src/session', () => ({ getSession: () => Promise.resolve({ token: 'tok', nombre: 'Ana' }) }));

const post = apiClient.post as jest.Mock;
const loc = Location as unknown as {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};

beforeEach(() => {
  post.mockReset().mockResolvedValue({});
  (enqueueChecada as jest.Mock).mockReset();
  loc.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  loc.getCurrentPositionAsync.mockReset().mockResolvedValue({ coords: { latitude: 19.4, longitude: -99.1, accuracy: 7.5 } });
});

test('201 -> enviada true, posts coords with token, nothing queued', async () => {
  const r = await checar('entrada');
  expect(r).toEqual({ enviada: true });
  expect(post).toHaveBeenCalledWith(
    '/api/movil/checadas',
    expect.objectContaining({ client_id: expect.any(String), tipo: 'entrada', lat: 19.4, lng: -99.1, precision_m: 7.5 }),
    'tok'
  );
  expect(typeof post.mock.calls[0][1].timestamp_dispositivo).toBe('string');
  expect(enqueueChecada).not.toHaveBeenCalled();
});

test('location rejecting -> nulls', async () => {
  loc.getCurrentPositionAsync.mockRejectedValue(new Error('no gps'));
  await checar('salida');
  expect(post.mock.calls[0][1]).toMatchObject({ tipo: 'salida', lat: null, lng: null, precision_m: null });
});

test('permission denied -> nulls without asking for position', async () => {
  loc.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
  await checar('entrada');
  expect(loc.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(post.mock.calls[0][1]).toMatchObject({ lat: null, lng: null, precision_m: null });
});

test('location timeout (8 s) -> nulls', async () => {
  jest.useFakeTimers();
  loc.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
  const p = checar('entrada');
  await jest.advanceTimersByTimeAsync(8000);
  await p;
  jest.useRealTimers();
  expect(post.mock.calls[0][1]).toMatchObject({ lat: null, lng: null, precision_m: null });
});

test('network error -> queued, enviada false', async () => {
  post.mockRejectedValue(new TypeError('Network request failed'));
  expect(await checar('entrada')).toEqual({ enviada: false });
  expect(enqueueChecada).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'entrada', client_id: expect.any(String) }));
});

test('5xx -> queued, enviada false', async () => {
  post.mockRejectedValue(Object.assign(new Error('boom'), { status: 502 }));
  expect(await checar('salida')).toEqual({ enviada: false });
  expect(enqueueChecada).toHaveBeenCalledTimes(1);
});

test('4xx -> rethrown, not queued', async () => {
  post.mockRejectedValue(Object.assign(new Error('ya checaste'), { status: 409 }));
  await expect(checar('entrada')).rejects.toThrow('ya checaste');
  expect(enqueueChecada).not.toHaveBeenCalled();
});

test('each call generates a distinct client_id', async () => {
  await checar('entrada');
  await checar('entrada');
  expect(post.mock.calls[0][1].client_id).not.toBe(post.mock.calls[1][1].client_id);
});

test('401 -> queued, enviada false (token may be renewed later)', async () => {
  post.mockRejectedValue(Object.assign(new Error('no autorizado'), { status: 401 }));
  expect(await checar('entrada')).toEqual({ enviada: false });
  expect(enqueueChecada).toHaveBeenCalledTimes(1);
});

test('422 -> rethrown, not queued', async () => {
  post.mockRejectedValue(Object.assign(new Error('inválida'), { status: 422 }));
  await expect(checar('entrada')).rejects.toThrow('inválida');
  expect(enqueueChecada).not.toHaveBeenCalled();
});

test('sends enviado_en (phone clock at POST time) but never queues it', async () => {
  const antes = Date.now();
  await checar('entrada');
  const enviado = post.mock.calls[0][1].enviado_en;
  expect(typeof enviado).toBe('string');
  expect(new Date(enviado).getTime()).toBeGreaterThanOrEqual(antes);

  post.mockRejectedValue(new TypeError('Network request failed'));
  await checar('salida');
  expect((enqueueChecada as jest.Mock).mock.calls[0][0]).not.toHaveProperty('enviado_en');
});
