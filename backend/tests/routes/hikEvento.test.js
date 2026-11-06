jest.mock('../../src/models/checada', () => ({
  getDispositivo: jest.fn(async (k) => (k === 'llave-ok' ? { id: 3 } : null)),
  syncBatch: jest.fn(async () => []),
}));
const express = require('express');
const request = require('supertest');
const Checada = require('../../src/models/checada');

const app = express();
app.use(express.json());
app.use('/api/checadas', require('../../src/routes/checadas'));

const evento = JSON.stringify({
  dateTime: '2026-11-05T09:03:10-06:00', eventType: 'AccessControllerEvent',
  AccessControllerEvent: { majorEventType: 5, subEventType: 75, employeeNoString: '7', attendanceStatus: 'checkIn' },
});

beforeEach(() => jest.clearAllMocks());

describe('POST /api/checadas/hik/:apiKey', () => {
  it('multipart con JSON y foto -> guarda la checada', async () => {
    const r = await request(app).post('/api/checadas/hik/llave-ok')
      .field('event_log', evento)
      .attach('Picture', Buffer.from('jpg'), 'cara.jpg');
    expect(r.status).toBe(200);
    expect(Checada.syncBatch).toHaveBeenCalledWith(3, [
      { uid_checador: 7, timestamp: new Date('2026-11-05T15:03:10Z'), tipo: 'entrada' },
    ]);
  });

  it('heartbeat -> 200 sin guardar', async () => {
    const r = await request(app).post('/api/checadas/hik/llave-ok').send({ eventType: 'heartBeat' });
    expect(r.status).toBe(200);
    expect(Checada.syncBatch).not.toHaveBeenCalled();
  });

  it('llave inválida -> 401', async () => {
    const r = await request(app).post('/api/checadas/hik/otra').field('event_log', evento);
    expect(r.status).toBe(401);
    expect(Checada.syncBatch).not.toHaveBeenCalled();
  });
});
