const pool = require('../../src/db/pool');
const Empleado = require('../../src/models/empleado');

// Mock the pool
jest.mock('../../src/db/pool');

describe('Modelo Empleado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un empleado con estado activo por defecto', async () => {
      const mockEmpleado = {
        id: 1,
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: 'García',
        email: 'juan@example.com',
        fecha_ingreso: new Date('2024-06-18'),
        estatus: 'activo',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      const empleado = await Empleado.create({
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: 'García',
        email: 'juan@example.com',
        fecha_ingreso: new Date('2024-06-18'),
      });

      expect(empleado.estado).toBe('activo');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('debe permitir crear un empleado con estado inactivo', async () => {
      const mockEmpleado = {
        id: 2,
        nombre: 'María',
        apellido_paterno: 'López',
        email: 'maria@example.com',
        estado: 'inactivo',
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      const empleado = await Empleado.create({
        nombre: 'María',
        apellido_paterno: 'López',
        email: 'maria@example.com',
        estado: 'inactivo',
      });

      expect(empleado.estado).toBe('inactivo');
    });

    it('debe incluir estado en la query INSERT', async () => {
      const mockEmpleado = {
        id: 3,
        nombre: 'Carlos',
        apellido_paterno: 'Rodríguez',
        email: 'carlos@example.com',
        estado: 'activo',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      await Empleado.create({
        nombre: 'Carlos',
        apellido_paterno: 'Rodríguez',
        email: 'carlos@example.com',
      });

      // Verify the query includes estado column
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).toContain('estado');
      // 16 campos + numero_empleado (null = siguiente número libre)
      expect(callArgs[1].length).toBe(17);
      expect(callArgs[1][16]).toBeNull();
      expect(callArgs[0]).toContain('COALESCE($17::int, (SELECT COALESCE(MAX(numero_empleado), 0) + 1 FROM empleados))');
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los empleados', async () => {
      const mockEmpleados = [
        { id: 1, nombre: 'Juan', estado: 'activo' },
        { id: 2, nombre: 'María', estado: 'inactivo' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockEmpleados });

      const empleados = await Empleado.findAll();

      expect(empleados).toHaveLength(2);
      expect(pool.query).toHaveBeenCalled();
    });

    it('no debe agregar WHERE cuando no se pasa estado', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await Empleado.findAll();

      const [query, params] = pool.query.mock.calls[0];
      expect(query).not.toContain('WHERE');
      expect(params).toEqual([]);
    });

    it('debe filtrar por estado activo', async () => {
      const mockEmpleados = [{ id: 1, nombre: 'Juan', estado: 'activo' }];
      pool.query.mockResolvedValueOnce({ rows: mockEmpleados });

      const empleados = await Empleado.findAll({ estado: 'activo' });

      const [query, params] = pool.query.mock.calls[0];
      expect(query).toContain('WHERE estado = $1');
      expect(params).toEqual(['activo']);
      expect(empleados).toEqual(mockEmpleados);
    });

    it('debe filtrar por estado inactivo', async () => {
      const mockEmpleados = [{ id: 2, nombre: 'María', estado: 'inactivo' }];
      pool.query.mockResolvedValueOnce({ rows: mockEmpleados });

      await Empleado.findAll({ estado: 'inactivo' });

      const [query, params] = pool.query.mock.calls[0];
      expect(query).toContain('WHERE estado = $1');
      expect(params).toEqual(['inactivo']);
    });
  });

  describe('findById', () => {
    it('debe retornar un empleado por ID', async () => {
      const mockEmpleado = {
        id: 1,
        nombre: 'Juan',
        estado: 'activo',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      const empleado = await Empleado.findById(1);

      expect(empleado).toBeDefined();
      expect(empleado.id).toBe(1);
      expect(empleado.estado).toBe('activo');
    });

    it('debe retornar null si no existe el empleado', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const empleado = await Empleado.findById(999);

      expect(empleado).toBeNull();
    });
  });

  describe('create horario', () => {
    const base = { nombre: 'A', apellido_paterno: 'B', apellido_materno: 'C', fecha_ingreso: '2026-01-01', email: 'a@b.c' };

    it('persiste hora_entrada valida en el INSERT', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.create({ ...base, hora_entrada: '08:30' });
      const [query, params] = pool.query.mock.calls[0];
      expect(query).toContain('hora_entrada');
      expect(params[params.length - 2]).toBe('08:30'); // el último es numero_empleado
    });

    it('con hora vacia no la incluye (aplica el default de la BD)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.create({ ...base, hora_entrada: '', hora_salida: '' });
      const [query, params] = pool.query.mock.calls[0];
      expect(query).not.toContain('hora_');
      expect(params).not.toContain('');
      expect(params.length).toBe(17);
    });
  });

  describe('numero_empleado (código NOMIPAQ)', () => {
    const base = { nombre: 'A', apellido_paterno: 'B', fecha_ingreso: '2026-01-01', email: 'a@b.c' };

    it('alta con número capturado lo usa', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.create({ ...base, numero_empleado: ' 25 ' });
      const [, params] = pool.query.mock.calls[0];
      expect(params[params.length - 1]).toBe(25);
    });

    it.each(['0', '-3', 'A12', '1.5', '1234567890'])('número inválido %s -> 400 sin tocar la BD', async (n) => {
      await expect(Empleado.create({ ...base, numero_empleado: n })).rejects.toMatchObject({ status: 400 });
      await expect(Empleado.update(1, { numero_empleado: n })).rejects.toMatchObject({ status: 400 });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('update con número lo actualiza; vacío no lo toca', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.update(1, { nombre: 'X', numero_empleado: '7' });
      const [query, params] = pool.query.mock.calls[0];
      expect(query).toContain('numero_empleado = $2');
      expect(params).toEqual(['X', 7, 1]);

      pool.query.mockClear();
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.update(1, { nombre: 'X', numero_empleado: '' });
      expect(pool.query.mock.calls[0][0]).not.toContain('numero_empleado');
    });

    it('número repetido -> 409 con mensaje claro', async () => {
      pool.query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505', constraint: 'idx_empleados_numero_empleado' }));
      await expect(Empleado.update(1, { numero_empleado: '2' }))
        .rejects.toMatchObject({ status: 409, message: 'Ese número de empleado ya lo tiene otro empleado' });
    });
  });

  describe('update', () => {
    it('debe permitir actualizar el campo estado', async () => {
      const mockUpdated = {
        id: 1,
        nombre: 'Juan',
        estado: 'inactivo',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const empleado = await Empleado.update(1, { estado: 'inactivo' });

      expect(empleado.estado).toBe('inactivo');
    });

    it('debe incluir estado en la lista EDITABLES', async () => {
      const mockEmpleado = { id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      await Empleado.update(1, { estado: 'activo' });

      // Verify that estado was included in the UPDATE query
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).toContain('estado');
    });

    it('incluye hora_entrada y hora_salida en el UPDATE', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.update(1, { hora_entrada: '08:30', hora_salida: '17:00:00' });
      const [query, params] = pool.query.mock.calls[0];
      expect(query.split('WHERE')[0]).toContain('hora_entrada =');
      expect(query.split('WHERE')[0]).toContain('hora_salida =');
      expect(params).toEqual(['08:30', '17:00:00', 1]);
    });

    it('ignora hora_entrada vacia o con formato invalido (no borra la columna)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await Empleado.update(1, { hora_entrada: '', hora_salida: 'abc', estado: 'activo' });
      const [query, params] = pool.query.mock.calls[0];
      expect(query).not.toContain('hora_entrada');
      expect(query).not.toContain('hora_salida');
      expect(params).toEqual(['activo', 1]);
    });

    it('no debe actualizar id, created_at o updated_at', async () => {
      const mockEmpleado = { id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [mockEmpleado] });

      await Empleado.update(1, {
        id: 999,
        created_at: new Date(),
        updated_at: new Date(),
        estado: 'inactivo',
      });

      const callArgs = pool.query.mock.calls[0];
      const query = callArgs[0];
      const params = callArgs[1];

      // Verify that protected fields are not in the SET clause
      // Extract SET portion (before WHERE)
      const setPortion = query.split('WHERE')[0];
      expect(setPortion).not.toContain('id =');
      expect(setPortion).not.toContain('created_at =');
      // updated_at is set by the query itself with NOW()
      expect(setPortion).toContain('updated_at = NOW()');
      expect(setPortion).toContain('estado =');
      // Verify only one parameter for estado (not the injected id, created_at, updated_at)
      expect(params.length).toBe(2); // estado value + id for WHERE
    });
  });

  describe('delete', () => {
    it('debe eliminar un empleado por ID', async () => {
      pool.query.mockResolvedValueOnce({});

      await Empleado.delete(1);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM empleados WHERE id = $1',
        [1]
      );
    });
  });
});
