const EmpleadoModel = require('../../src/models/empleado');
const ctrl = require('../../src/controllers/empleadosController');

jest.mock('../../src/models/empleado');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

describe('Controller: empleadosController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {} };
    res = mockRes();
    next = jest.fn();
  });

  describe('getAll', () => {
    it('debe retornar todos los empleados sin filtro de estado', async () => {
      const empleados = [{ id: 1, estado: 'activo' }, { id: 2, estado: 'inactivo' }];
      EmpleadoModel.findAll.mockResolvedValueOnce(empleados);

      await ctrl.getAll(req, res, next);

      expect(EmpleadoModel.findAll).toHaveBeenCalledWith({ estado: undefined });
      expect(res.json).toHaveBeenCalledWith(empleados);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe filtrar por estado=activo', async () => {
      const empleados = [{ id: 1, estado: 'activo' }];
      req.query.estado = 'activo';
      EmpleadoModel.findAll.mockResolvedValueOnce(empleados);

      await ctrl.getAll(req, res, next);

      expect(EmpleadoModel.findAll).toHaveBeenCalledWith({ estado: 'activo' });
      expect(res.json).toHaveBeenCalledWith(empleados);
    });

    it('debe filtrar por estado=inactivo', async () => {
      const empleados = [{ id: 2, estado: 'inactivo' }];
      req.query.estado = 'inactivo';
      EmpleadoModel.findAll.mockResolvedValueOnce(empleados);

      await ctrl.getAll(req, res, next);

      expect(EmpleadoModel.findAll).toHaveBeenCalledWith({ estado: 'inactivo' });
      expect(res.json).toHaveBeenCalledWith(empleados);
    });

    it('debe rechazar un estado inválido con 400', async () => {
      req.query.estado = 'baja';

      await ctrl.getAll(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "estado debe ser 'activo' o 'inactivo'" });
      expect(EmpleadoModel.findAll).not.toHaveBeenCalled();
    });

    it('debe llamar a next en caso de error', async () => {
      const err = new Error('db error');
      EmpleadoModel.findAll.mockRejectedValueOnce(err);

      await ctrl.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
