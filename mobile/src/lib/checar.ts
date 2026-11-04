import * as Location from 'expo-location';
import { randomUUID } from 'expo-crypto';
import { apiClient } from '../api/client';
import { getSession } from '../session';
import { enqueueChecada, esReintentable, type ChecadaPayload } from './offlineQueue';

const GPS_TIMEOUT_MS = 8000;

type Ubicacion = Pick<ChecadaPayload, 'lat' | 'lng' | 'precision_m'>;
const SIN_UBICACION: Ubicacion = { lat: null, lng: null, precision_m: null };

async function ubicacion(): Promise<Ubicacion> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return SIN_UBICACION;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), GPS_TIMEOUT_MS);
      }),
    ]);
    if (!pos) return SIN_UBICACION;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, precision_m: pos.coords.accuracy };
  } catch {
    return SIN_UBICACION;
  } finally {
    clearTimeout(timer);
  }
}

// Does NOT ask for the fingerprint: that is the screen's job.
// Network/5xx failures are queued; a 4xx is rethrown so the screen can show the server's message.
export async function checar(tipo: 'entrada' | 'salida'): Promise<{ enviada: boolean }> {
  const payload: ChecadaPayload = {
    client_id: randomUUID(),
    tipo,
    timestamp_dispositivo: new Date().toISOString(),
    ...(await ubicacion()),
  };
  try {
    await apiClient.post('/api/movil/checadas', payload, (await getSession())?.token);
    return { enviada: true };
  } catch (err) {
    if (!esReintentable(err)) throw err;
    await enqueueChecada(payload);
    return { enviada: false };
  }
}
