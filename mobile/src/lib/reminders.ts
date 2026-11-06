import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type Horario = { hora_entrada: string; hora_salida: string; dias: number[] };
export type Reminder = { weekday: number; hour: number; minute: number; title: string; body: string };

const AVISO_MIN = 5;

// dias are ISO (1=lunes..7=domingo); expo weekday is 1=domingo..7=sábado.
export function buildReminders({ hora_entrada, hora_salida, dias }: Horario): Reminder[] {
  const out: Reminder[] = [];
  for (const [hora, tipo] of [[hora_entrada, 'entrada'], [hora_salida, 'salida']] as const) {
    const [h, m] = hora.split(':').map(Number);
    let mins = h * 60 + m - AVISO_MIN;
    const prevDay = mins < 0; // e.g. 00:03 → 23:58 the day before
    if (prevDay) mins += 24 * 60;
    for (const dia of dias) {
      const iso = prevDay ? ((dia + 5) % 7) + 1 : dia;
      out.push({
        weekday: (iso % 7) + 1,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        title: `Checa tu ${tipo}`,
        body: `Tu ${tipo} es a las ${hora}, no olvides checar.`,
      });
    }
  }
  return out;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Best-effort: a failure here must never block checking in.
export async function syncReminders(horario: Horario): Promise<void> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recordatorios', {
        name: 'Recordatorios de checada',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of buildReminders(horario)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: 'recordatorios',
          weekday: r.weekday,
          hour: r.hour,
          minute: r.minute,
        },
      });
    }
  } catch (err) {
    console.warn('Fix Tech Checador: no se pudieron programar los recordatorios', err);
  }
}
