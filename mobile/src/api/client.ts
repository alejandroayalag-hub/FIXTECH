const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://fixtech.havocdev.mx';

const TIMEOUT_MS = 15000;

// Server answered with a non-2xx status. Network failures surface as TypeError from fetch.
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  // A hung connection aborts and surfaces as a network error (so the checada is queued).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  let body: { error?: string };
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
    // The timeout also covers reading the body: a stalled body is aborted and surfaces as a
    // network error (never as an empty success); a non-JSON body is just empty.
    body = await res.json().catch((err: unknown) => {
      if (ctrl.signal.aborted) throw err;
      return {};
    });
  } finally {
    clearTimeout(timer);
  }
  // 200 (duplicate client_id) and 201 (new) are both success.
  if (!res.ok) throw new ApiError(body.error || `request failed with status ${res.status}`, res.status);
  return body as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
};
