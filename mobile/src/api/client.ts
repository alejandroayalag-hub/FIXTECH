const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://rh.serviciosata.com';

// Server answered with a non-2xx status. Network failures surface as TypeError from fetch.
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  // 200 (duplicate client_id) and 201 (new) are both success.
  if (!res.ok) throw new ApiError(body.error || `request failed with status ${res.status}`, res.status);
  return body as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
};
