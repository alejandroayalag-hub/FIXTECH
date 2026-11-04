import * as SecureStore from 'expo-secure-store';
import type { Horario } from './reminders';

const TZ = 'America/Mexico_City';
const YO_KEY = 'ata_checador_yo';

export type Tipo = 'entrada' | 'salida';
export type Ultima = { tipo: Tipo; timestamp: string };
export type Yo = Horario & { id: number; nombre: string; ultima_hoy: Ultima | null };

/** Calendar day (YYYY-MM-DD) in Mexico City. */
export function diaMx(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * Next checada type. The latest of ultima_hoy and today's queued checadas (by timestamp) decides:
 * entrada -> 'salida'; salida or nothing -> 'entrada'.
 */
export function siguienteTipo(
  ultimaHoy: Ultima | null,
  cola: { tipo: Tipo; timestamp_dispositivo: string; empleado_id?: number }[],
  ahora: Date = new Date(),
  empleadoId?: number,
): { tipo: Tipo; ultima: Ultima | null } {
  const hoy = diaMx(ahora);
  const candidatas: Ultima[] = [];
  if (ultimaHoy) candidatas.push(ultimaHoy);
  for (const c of cola) {
    if (empleadoId !== undefined && c.empleado_id !== undefined && c.empleado_id !== empleadoId) continue;
    candidatas.push({ tipo: c.tipo, timestamp: c.timestamp_dispositivo });
  }
  let ultima: Ultima | null = null;
  let t = -Infinity;
  for (const c of candidatas) {
    const ms = new Date(c.timestamp).getTime();
    if (isNaN(ms) || diaMx(new Date(ms)) !== hoy) continue;
    if (ms >= t) {
      t = ms;
      ultima = c;
    }
  }
  return { tipo: ultima?.tipo === 'entrada' ? 'salida' : 'entrada', ultima };
}

export async function guardarYo(yo: Yo): Promise<void> {
  await SecureStore.setItemAsync(YO_KEY, JSON.stringify(yo));
}

export async function leerYo(): Promise<Yo | null> {
  try {
    const raw = await SecureStore.getItemAsync(YO_KEY);
    const y = raw ? JSON.parse(raw) : null;
    return y && typeof y.nombre === 'string' ? y : null;
  } catch {
    return null;
  }
}

export async function borrarYo(): Promise<void> {
  await SecureStore.deleteItemAsync(YO_KEY);
}
