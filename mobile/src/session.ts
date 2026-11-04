import * as SecureStore from 'expo-secure-store';

const KEY = 'ata_checador_session';

export type Session = { token: string; nombre: string; empleadoId?: number };

/** empleado_id claim of the login JWT (base64url payload); undefined if it cannot be read. */
export function empleadoIdDeToken(token: string): number | undefined {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))).empleado_id;
    return typeof id === 'number' ? id : undefined;
  } catch {
    return undefined;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && typeof s.token === 'string' && typeof s.nombre === 'string' ? s : null;
  } catch {
    return null;
  }
}

/** After /yo: store the renewed token (if any) and backfill empleadoId; nombre is kept. */
export async function renovarSesion(yo: { id: number; token?: string }): Promise<void> {
  const s = await getSession();
  if (!s) return;
  await saveSession({ token: yo.token ?? s.token, nombre: s.nombre, empleadoId: yo.id });
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
