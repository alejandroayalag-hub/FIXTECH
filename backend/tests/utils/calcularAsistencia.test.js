const { calcularAsistencia, TOLERANCIA_RETARDO_MIN } = require('../../src/utils/calcularAsistencia');

// Horario 09:00 L–V. Noviembre 2026: México está en UTC-6 todo el mes (sin horario de verano).
const EMP = { id: 1, nombre: 'Ana López', hora_entrada: '09:00', dias: [1, 2, 3, 4, 5] };
const mx = (fecha, hora) => new Date(`${fecha}T${hora}:00-06:00`);
const ch = (fecha, hora, tipo = 'entrada', empleado_id = 1) => ({ empleado_id, timestamp: mx(fecha, hora), tipo });

const calc = (checadas, { desde = '2026-11-02', hasta = '2026-11-02', hoy = '2026-11-30', empleados = [EMP] } = {}) =>
  calcularAsistencia({ empleados, checadas, desde, hasta, hoy });

describe('calcularAsistencia', () => {
  it('exporta TOLERANCIA_RETARDO_MIN = 10', () => {
    expect(TOLERANCIA_RETARDO_MIN).toBe(10);
  });

  it('entrada lunes 09:10 México -> trabajado, sin retardo', () => {
    expect(calc([ch('2026-11-02', '09:10')])).toEqual([
      { empleado_id: 1, nombre: 'Ana López', dias_trabajados: 1, retardos: 0, faltas: 0, checadas_dudosas: 0 },
    ]);
  });

  it('entrada 09:11 -> retardo 1 (y cuenta como trabajado)', () => {
    const [r] = calc([ch('2026-11-02', '09:11')]);
    expect(r).toMatchObject({ dias_trabajados: 1, retardos: 1, faltas: 0 });
  });

  it('semana 2–6 nov con entradas lun–jue -> 4 trabajados, 1 falta; sáb/dom no cuentan', () => {
    const checadas = ['02', '03', '04', '05'].map((d) => ch(`2026-11-${d}`, '08:55'));
    const [r] = calc(checadas, { desde: '2026-11-02', hasta: '2026-11-08' });
    expect(r).toMatchObject({ dias_trabajados: 4, retardos: 0, faltas: 1 });
  });

  it('checada 2026-11-04T01:00:00Z (= martes 3 nov 19:00 México) cuenta para el 3, no para el 4', () => {
    const checadas = [{ empleado_id: 1, timestamp: new Date('2026-11-04T01:00:00Z'), tipo: 'entrada' }];
    const [r3] = calc(checadas, { desde: '2026-11-03', hasta: '2026-11-03' });
    expect(r3).toMatchObject({ dias_trabajados: 1, retardos: 1, faltas: 0 });
    const [r4] = calc(checadas, { desde: '2026-11-04', hasta: '2026-11-04' });
    expect(r4).toMatchObject({ dias_trabajados: 0, faltas: 1 });
  });

  it("tipo 'desconocido' del reloj a las 08:50 cuenta como entrada", () => {
    const [r] = calc([ch('2026-11-02', '08:50', 'desconocido')]);
    expect(r).toMatchObject({ dias_trabajados: 1, retardos: 0, faltas: 0 });
  });

  it('salida sin entrada ese día -> falta', () => {
    const [r] = calc([ch('2026-11-02', '18:00', 'salida')]);
    expect(r).toMatchObject({ dias_trabajados: 0, retardos: 0, faltas: 1 });
  });

  it('la primera entrada del día decide el retardo aunque lleguen desordenadas', () => {
    const [r] = calc([ch('2026-11-02', '13:00'), ch('2026-11-02', '18:00', 'salida'), ch('2026-11-02', '09:05')]);
    expect(r).toMatchObject({ dias_trabajados: 1, retardos: 0 });
  });

  it('hasta futuro (hoy=2026-11-04, rango 2–6) -> no cuenta 5 y 6 como faltas', () => {
    const [r] = calc([ch('2026-11-02', '09:00')], { desde: '2026-11-02', hasta: '2026-11-06', hoy: '2026-11-04' });
    expect(r).toMatchObject({ dias_trabajados: 1, faltas: 2 }); // faltas 3 y 4
  });

  it('desde posterior a hoy -> sin días evaluados', () => {
    const [r] = calc([], { desde: '2026-11-10', hasta: '2026-11-12', hoy: '2026-11-04' });
    expect(r).toMatchObject({ dias_trabajados: 0, retardos: 0, faltas: 0 });
  });

  it('cruza fin de mes con aritmética de calendario (30 nov lun – 1 dic mar)', () => {
    const [r] = calc([ch('2026-12-01', '09:00')], { desde: '2026-11-30', hasta: '2026-12-01', hoy: '2026-12-31' });
    expect(r).toMatchObject({ dias_trabajados: 1, faltas: 1 });
  });

  it('separa las checadas por empleado', () => {
    const otro = { id: 2, nombre: 'Luis Pérez', hora_entrada: '07:00', dias: [1] };
    const res = calc([ch('2026-11-02', '07:30', 'entrada', 2)], { empleados: [EMP, otro] });
    expect(res).toEqual([
      { empleado_id: 1, nombre: 'Ana López', dias_trabajados: 0, retardos: 0, faltas: 1, checadas_dudosas: 0 },
      { empleado_id: 2, nombre: 'Luis Pérez', dias_trabajados: 1, retardos: 1, faltas: 0, checadas_dudosas: 0 },
    ]);
  });

  it('dias null -> ningún día programado', () => {
    const [r] = calc([], { empleados: [{ ...EMP, dias: null }] });
    expect(r).toMatchObject({ dias_trabajados: 0, retardos: 0, faltas: 0 });
  });

  it('hora_entrada null -> cuenta trabajado pero nunca retardo', () => {
    const [r] = calc([ch('2026-11-02', '11:00')], { empleados: [{ ...EMP, hora_entrada: null }] });
    expect(r).toMatchObject({ dias_trabajados: 1, retardos: 0 });
  });

  describe('rango por empleado (desde_efectivo)', () => {
    const semana = { desde: '2026-11-02', hasta: '2026-11-06', hoy: '2026-11-30' };

    it('días anteriores a desde_efectivo no son faltas', () => {
      const [r] = calc([ch('2026-11-04', '09:00')], { ...semana, empleados: [{ ...EMP, desde_efectivo: '2026-11-04' }] });
      expect(r).toMatchObject({ dias_trabajados: 1, faltas: 2 }); // solo 5 y 6
    });
    it('entradas anteriores a desde_efectivo sí cuentan (solo se suprimen faltas)', () => {
      const [r] = calc([ch('2026-11-02', '09:00')], { ...semana, empleados: [{ ...EMP, desde_efectivo: '2026-11-04' }] });
      expect(r).toMatchObject({ dias_trabajados: 1, faltas: 3 });
    });
    it('PIN regenerado el 20: lo trabajado antes sigue contando (trabajados, retardos, dudosas), sin faltas previas', () => {
      const checadas = [ch('2026-11-02', '09:00'), { ...ch('2026-11-03', '09:20'), hora_dudosa: true }];
      const [r] = calc(checadas, { desde: '2026-11-01', hasta: '2026-11-30', hoy: '2026-11-30',
        empleados: [{ ...EMP, desde_efectivo: '2026-11-20' }] });
      // L–V del 20 al 30: 20, 23, 24, 25, 26, 27, 30 = 7 faltas
      expect(r).toMatchObject({ dias_trabajados: 2, retardos: 1, faltas: 7, checadas_dudosas: 1 });
    });
    it('sin desde_efectivo usa desde', () => {
      const [r] = calc([], semana);
      expect(r).toMatchObject({ faltas: 5 });
    });
  });

  describe('checadas_dudosas', () => {
    const dud = (fecha, hora, tipo = 'entrada') => ({ ...ch(fecha, hora, tipo), hora_dudosa: true });

    it('cuenta las dudosas del rango (cualquier tipo) y siguen contando como entrada', () => {
      const [r] = calc([dud('2026-11-02', '09:30'), dud('2026-11-02', '18:00', 'salida'), ch('2026-11-03', '09:00')],
        { desde: '2026-11-02', hasta: '2026-11-03' });
      expect(r).toMatchObject({ dias_trabajados: 2, retardos: 1, faltas: 0, checadas_dudosas: 2 });
    });
    it('cuenta dudosas de todo el rango aunque sean anteriores a desde_efectivo', () => {
      const [r] = calc([dud('2026-11-02', '09:00'), dud('2026-11-03', '09:00')],
        { desde: '2026-11-02', hasta: '2026-11-03', empleados: [{ ...EMP, desde_efectivo: '2026-11-03' }] });
      expect(r).toMatchObject({ dias_trabajados: 2, faltas: 0, checadas_dudosas: 2 });
    });
    it('separa dudosas por empleado', () => {
      const otro = { id: 2, nombre: 'Luis', hora_entrada: '09:00', dias: [1] };
      const res = calc([{ ...dud('2026-11-02', '09:00'), empleado_id: 2 }], { empleados: [EMP, otro] });
      expect(res.map((x) => x.checadas_dudosas)).toEqual([0, 1]);
    });
  });
});
