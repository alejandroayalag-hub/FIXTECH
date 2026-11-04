import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { getSession } from '../session';

const QUEUE_KEY = 'ata_checada_queue';

export type ChecadaPayload = {
  client_id: string;
  tipo: 'entrada' | 'salida';
  timestamp_dispositivo: string;
  lat: number | null;
  lng: number | null;
  precision_m: number | null;
};

/** Stored entry: the payload plus the owner (never sent to the server). Legacy entries lack it. */
type Entrada = ChecadaPayload & { empleado_id?: number };

export type FlushResult = {
  sentAny: boolean;
  remaining: number;
  /** Items rejected with a 4xx and dropped from the queue. */
  droppedCount: number;
};

async function readQueue(): Promise<Entrada[]> {
  const raw = await SecureStore.getItemAsync(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('ATA Checador: la cola de checadas está corrupta, se descarta', error);
    return [];
  }
}

async function writeQueue(queue: Entrada[]): Promise<void> {
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
}

// Serializes every read-modify-write of the queue so an enqueue during a flush is never lost.
let lock: Promise<unknown> = Promise.resolve();
function conLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}

const esDe = (e: Entrada, id?: number) => id === undefined || e.empleado_id === undefined || e.empleado_id === id;

/** Checadas of the current employee still waiting to be sent (read-only snapshot). */
export function checadasEnCola(): Promise<ChecadaPayload[]> {
  return conLock(async () => {
    const id = (await getSession())?.empleadoId;
    return (await readQueue()).filter((e) => esDe(e, id));
  });
}

export function enqueueChecada(payload: ChecadaPayload): Promise<void> {
  return conLock(async () => {
    const empleado_id = (await getSession())?.empleadoId;
    const queue = await readQueue();
    queue.push(empleado_id === undefined ? payload : { ...payload, empleado_id });
    await writeQueue(queue);
  });
}

// Statuses that may succeed later (expired token, timeout, throttling) are kept, not dropped.
const REINTENTABLES = [401, 403, 408, 429];

/** Network errors, 5xx and 401/403/408/429 are retryable; any other 4xx is final. */
export function esReintentable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  return typeof status !== 'number' || status >= 500 || REINTENTABLES.includes(status);
}

export function flushQueue(): Promise<FlushResult> {
  return conLock(flushQueueSinLock);
}

async function flushQueueSinLock(): Promise<FlushResult> {
  const all = await readQueue();
  const session = await getSession();
  const token = session?.token;
  // Entries of other employees stay untouched: they must never go out under this token.
  const queue = all.filter((e) => esDe(e, session?.empleadoId));
  const ajenas = all.filter((e) => !queue.includes(e));
  if (queue.length === 0) return { sentAny: false, remaining: 0, droppedCount: 0 };

  const stillQueued: Entrada[] = [];
  let sentAny = false;
  let droppedCount = 0;

  for (const entrada of queue) {
    const { empleado_id: _owner, ...payload } = entrada;
    try {
      await apiClient.post('/api/movil/checadas', payload, token);
      sentAny = true;
    } catch (err) {
      if (esReintentable(err)) {
        stillQueued.push(entrada);
      } else {
        droppedCount += 1;
        console.warn('ATA Checador: descartando checada rechazada por el servidor', {
          client_id: payload.client_id,
          tipo: payload.tipo,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await writeQueue([...ajenas, ...stillQueued]);
  return { sentAny, remaining: stillQueued.length, droppedCount };
}
