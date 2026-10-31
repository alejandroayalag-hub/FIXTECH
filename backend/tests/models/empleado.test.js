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
      // Verify 16 parameters (added estado as 16th param)
      expect(callArgs[1].length).toBe(16);
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
