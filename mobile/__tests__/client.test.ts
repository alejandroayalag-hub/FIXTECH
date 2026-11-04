import { apiClient } from '../src/api/client';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

// Response whose body never arrives until the request signal aborts.
function respuestaColgada(signal: AbortSignal) {
  return {
    ok: true,
    status: 200,
    json: () =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
  };
}

test('a body that stalls after the headers is aborted at 15 s and rejects (not an empty success)', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url: string, init: RequestInit) => Promise.resolve(respuestaColgada(init.signal!)));
  const p = apiClient.get('/api/movil/yo', 'tok');
  const resultado = p.then(() => 'ok', (e: Error) => e.name);
  await jest.advanceTimersByTimeAsync(15000);
  expect(await resultado).toBe('AbortError');
});

test('non-JSON error body still yields ApiError with status', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('bad json')) });
  await expect(apiClient.get('/x')).rejects.toMatchObject({ status: 502 });
});
