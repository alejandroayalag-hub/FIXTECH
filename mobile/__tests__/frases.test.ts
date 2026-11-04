import { FRASES_ENTRADA, FRASES_SALIDA, fraseAlAzar } from '../src/lib/frases';

test('each list has at least 15 phrases', () => {
  expect(FRASES_ENTRADA.length).toBeGreaterThanOrEqual(15);
  expect(FRASES_SALIDA.length).toBeGreaterThanOrEqual(15);
});

test('fraseAlAzar picks from the list of its tipo', () => {
  expect(fraseAlAzar('entrada', () => 0)).toBe(FRASES_ENTRADA[0]);
  expect(fraseAlAzar('salida', () => 0)).toBe(FRASES_SALIDA[0]);
  expect(fraseAlAzar('salida', () => 0.999999)).toBe(FRASES_SALIDA[FRASES_SALIDA.length - 1]);
});
