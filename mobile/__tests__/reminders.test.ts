import { buildReminders } from '../src/lib/reminders';

jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

test('9-17 L-V gives 10 reminders at 8:55 and 16:55, Mon-Fri in expo weekdays', () => {
  const r = buildReminders({ hora_entrada: '09:00', hora_salida: '17:00', dias: [1, 2, 3, 4, 5] });
  expect(r).toHaveLength(10);
  expect(r[0]).toMatchObject({ weekday: 2, hour: 8, minute: 55, title: 'Checa tu entrada' });
  expect(r[9]).toMatchObject({ weekday: 6, hour: 16, minute: 55, title: 'Checa tu salida' });
});

test('entry right after midnight rolls back to the previous day', () => {
  const [lunes, domingo] = buildReminders({ hora_entrada: '00:03', hora_salida: '08:00', dias: [1, 7] });
  expect(lunes).toMatchObject({ weekday: 1, hour: 23, minute: 58 }); // domingo noche
  expect(domingo).toMatchObject({ weekday: 7, hour: 23, minute: 58 }); // sábado noche
});
