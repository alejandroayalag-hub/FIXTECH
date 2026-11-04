import * as SecureStore from 'expo-secure-store';
import { enqueueChecada, flushQueue } from '../src/lib/offlineQueue';
import { apiClient } from '../src/api/client';

jest.mock('expo-secure-store');
jest.mock('../src/api/client');
jest.mock('../src/session', () => ({ getSession: () => Promise.resolve({ token: 'fake-token', nombre: 'Ana' }) }));

const payload = {
  client_id: '11111111-1111-4111-8111-111111111111',
  tipo: 'entrada' as const,
  timestamp_dispositivo: '2026-11-04T14:00:00.000Z',
  lat: 19.4 as number | null,
  lng: -99.1 as number | null,
  precision_m: 12 as number | null,
};
const KEY = 'ata_checada_queue';
const rechazo = (status: number) => Object.assign(new Error(`status ${status}`), { status });

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
  (SecureStore.setItemAsync as jest.Mock).mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
  (apiClient.post as jest.Mock).mockReset();
});

test('enqueueChecada persists the payload for later retry', async () => {
  await enqueueChecada(payload);
  expect(JSON.parse(store[KEY])).toEqual([payload]);
});

test('flushQueue sends every queued item to /api/movil/checadas and empties the queue', async () => {
  await enqueueChecada(payload);
  (apiClient.post as jest.Mock).mockResolvedValue({});

  const result = await flushQueue();

  expect(result).toEqual({ sentAny: true, remaining: 0, droppedCount: 0 });
  expect(apiClient.post).toHaveBeenCalledWith('/api/movil/checadas', payload, 'fake-token');
  expect(JSON.parse(store[KEY])).toEqual([]);
});

test('flushQueue keeps an item queued on network error', async () => {
  await enqueueChecada(payload);
  (apiClient.post as jest.Mock).mockRejectedValue(new TypeError('network error'));

  expect(await flushQueue()).toEqual({ sentAny: false, remaining: 1, droppedCount: 0 });
  expect(JSON.parse(store[KEY])).toEqual([payload]);
});

test('flushQueue keeps an item queued on 5xx', async () => {
  await enqueueChecada(payload);
  (apiClient.post as jest.Mock).mockRejectedValue(rechazo(503));

  expect(await flushQueue()).toEqual({ sentAny: false, remaining: 1, droppedCount: 0 });
  expect(JSON.parse(store[KEY])).toEqual([payload]);
});

test('flushQueue drops an item rejected with 4xx instead of retrying it forever', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await enqueueChecada(payload);
  (apiClient.post as jest.Mock).mockRejectedValue(rechazo(422));

  expect(await flushQueue()).toEqual({ sentAny: false, remaining: 0, droppedCount: 1 });
  expect(JSON.parse(store[KEY])).toEqual([]);
  expect(warn).toHaveBeenCalled();

  (apiClient.post as jest.Mock).mockClear();
  expect(await flushQueue()).toEqual({ sentAny: false, remaining: 0, droppedCount: 0 });
  expect(apiClient.post).not.toHaveBeenCalled();
  warn.mockRestore();
});

test('flushQueue drops only the rejected item and keeps the network-failed one', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const other = { ...payload, client_id: '22222222-2222-4222-8222-222222222222', tipo: 'salida' as const };
  await enqueueChecada(payload);
  await enqueueChecada(other);
  (apiClient.post as jest.Mock).mockRejectedValueOnce(rechazo(400)).mockRejectedValueOnce(new TypeError('network error'));

  expect(await flushQueue()).toEqual({ sentAny: false, remaining: 1, droppedCount: 1 });
  expect(JSON.parse(store[KEY])).toEqual([other]);
  warn.mockRestore();
});

test('flushQueue treats a corrupted stored queue as empty instead of throwing', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  store[KEY] = '{not json';

  await expect(flushQueue()).resolves.toEqual({ sentAny: false, remaining: 0, droppedCount: 0 });
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test('flushQueue keeps an item rejected with 401/403/408/429 (token may be renewed later)', async () => {
  for (const status of [401, 403, 408, 429]) {
    store = {};
    await enqueueChecada(payload);
    (apiClient.post as jest.Mock).mockRejectedValue(rechazo(status));
    expect(await flushQueue()).toEqual({ sentAny: false, remaining: 1, droppedCount: 0 });
    expect(JSON.parse(store[KEY])).toEqual([payload]);
  }
});

test('an enqueue made while a flush POST is pending is not lost', async () => {
  await enqueueChecada(payload);
  let release!: () => void;
  (apiClient.post as jest.Mock).mockReturnValue(new Promise<void>((r) => (release = () => r())));
  const other = { ...payload, client_id: '33333333-3333-4333-8333-333333333333' };

  const flushing = flushQueue();
  await new Promise((r) => setImmediate(r)); // let the flush reach the pending POST
  const enqueuing = enqueueChecada(other);
  release();
  await Promise.all([flushing, enqueuing]);

  expect(JSON.parse(store[KEY])).toEqual([other]);
});
