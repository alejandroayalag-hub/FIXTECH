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

export type FlushResult = {
  sentAny: boolean;
  remaining: number;
  /** Items rejected with a 4xx and dropped from the queue. */
  droppedCount: number;
};

async function readQueue(): Promise<ChecadaPayload[]> {
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

async function writeQueue(queue: ChecadaPayload[]): Promise<void> {
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueChecada(payload: ChecadaPayload): Promise<void> {
  const queue = await readQueue();
  queue.push(payload);
  await writeQueue(queue);
}

/** Network errors (TypeError) and 5xx are retryable; any 4xx is final. */
export function esReintentable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  return typeof status !== 'number' || status >= 500;
}

export async function flushQueue(): Promise<FlushResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { sentAny: false, remaining: 0, droppedCount: 0 };

  const token = (await getSession())?.token;
  const stillQueued: ChecadaPayload[] = [];
  let sentAny = false;
  let droppedCount = 0;

  for (const payload of queue) {
    try {
      await apiClient.post('/api/movil/checadas', payload, token);
      sentAny = true;
    } catch (err) {
      if (esReintentable(err)) {
        stillQueued.push(payload);
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

  await writeQueue(stillQueued);
  return { sentAny, remaining: stillQueued.length, droppedCount };
}
