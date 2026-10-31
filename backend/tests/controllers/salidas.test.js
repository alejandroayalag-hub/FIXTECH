const SalidaModel = require('../../src/models/salida');
const EmpleadoModel = require('../../src/models/empleado');
const DocumentoSalidaModel = require('../../src/models/documentoSalida');
const ctrl = require('../../src/controllers/salidasController');

jest.mock('../../src/models/salida');
jest.mock('../../src/models/empleado');
jest.mock('../../src/models/documentoSalida');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

describe('Controller: salidasController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: { id: 5 } };
    res = mockRes();
    next = jest.fn();
  });

  describe('getAllSalidas', () => {
    it('debe retornar todas las salidas sin filtros', async () => {
      const salidas = [{ id: 1 }, { id: 2 }];
      SalidaModel.findAll.mockResolvedValueOnce(salidas);

      await ctrl.getAllSalidas(req, res, next);

      expect(SalidaModel.findAll).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(salidas);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe aplicar filtros de estado, empresaId y empleadoId', async () => {
      req.query = { estado: 'pendiente', empresaId: '1', empleadoId: '100' };
      SalidaModel.findAll.mockResolvedValueOnce([]);

      await ctrl.getAllSalidas(req, res, next);

      expect(SalidaModel.findAll).toHaveBeenCalledWith({
        estado: 'pendiente',
        empresaId: '1',
        empleadoId: '100',
      });
    });

    it('debe retornar 400 si el estado es inválido', async () => {
      req.query = { estado: 'invalido' };

      await ctrl.getAllSalidas(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getSalidaById', () => {
    it('debe retornar la salida con sus documentos', async () => {
      req.params.salidaId = '1';
      const salida = { id: 1, estado: 'pendiente' };
      const documentos = [{ id: 10, tipo_documento: 'finiquito' }];
      SalidaModel.findById.mockResolvedValueOnce(salida);
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce(documentos);

      await ctrl.getSalidaById(req, res, next);

      expect(DocumentoSalidaModel.findBySalidaId).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ ...salida, documentos });
    });

    it('debe retornar 404 si la salida no existe', async () => {
      req.params.salidaId = '999';
      SalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.getSalidaById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Salida no encontrada' });
      expect(DocumentoSalidaModel.findBySalidaId).not.toHaveBeenCalled();
    });
  });

  describe('getSalidasByEmpleado', () => {
    it('debe retornar las salidas de un empleado', async () => {
      req.params.empleadoId = '100';
      const salidas = [{ id: 1, empleado_id: 100 }];
      SalidaModel.findByEmpleadoId.mockResolvedValueOnce(salidas);

      await ctrl.getSalidasByEmpleado(req, res, next);

      expect(SalidaModel.findByEmpleadoId).toHaveBeenCalledWith('100');
      expect(res.json).toHaveBeenCalledWith(salidas);
    });
  });

  describe('createSalida', () => {
    const validBody = {
      empleadoId: 100,
      empresaId: 1,
      fechaSalida: '2026-06-18',
      tipoSalida: 'renuncia',
      razonSalida: 'Búsqueda de nuevas oportunidades',
    };

    it('debe crear una salida y 5 documentos de salida (renuncia -> carta de renuncia)', async () => {
      req.body = validBody;
      EmpleadoModel.findById.mockResolvedValueOnce({ id: 100, estado: 'activo' });
      const salidaCreada = { id: 1, ...validBody, estado: 'pendiente' };
      SalidaModel.create.mockResolvedValueOnce(salidaCreada);
      DocumentoSalidaModel.create.mockResolvedValue({ id: 1 });

      await ctrl.createSalida(req, res, next);

      expect(SalidaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          empleadoId: 100,
          tipoSalida: 'renuncia',
          razonSalida: validBody.razonSalida,
          salarioPendiente: 0,
          createdBy: 5,
        })
      );
      expect(DocumentoSalidaModel.create).toHaveBeenCalledTimes(5);
      const tiposCreados = DocumentoSalidaModel.create.mock.calls.map((c) => c[0].tipoDocumento);
      expect(tiposCreados.sort()).toEqual(
        ['finiquito', 'renuncia', 'entrega_materiales', 'baja_imss', 'encuesta_salida'].sort()
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(salidaCreada);
    });

    it('debe generar aviso_rescisorio en vez de renuncia cuando tipoSalida es despido', async () => {
      req.body = { ...validBody, tipoSalida: 'despido' };
      EmpleadoModel.findById.mockResolvedValueOnce({ id: 100, estado: 'activo' });
      const salidaCreada = { id: 2, ...req.body, estado: 'pendiente' };
      SalidaModel.create.mockResolvedValueOnce(salidaCreada);
      DocumentoSalidaModel.create.mockResolvedValue({ id: 1 });

      await ctrl.createSalida(req, res, next);

      const tiposCreados = DocumentoSalidaModel.create.mock.calls.map((c) => c[0].tipoDocumento);
      expect(tiposCreados).toContain('aviso_rescisorio');
      expect(tiposCreados).not.toContain('renuncia');
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      req.body = { empleadoId: 100 };

      await ctrl.createSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(EmpleadoModel.findById).not.toHaveBeenCalled();
      expect(SalidaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si empresaId está faltando', async () => {
      req.body = {
        empleadoId: 100,
        fechaSalida: '2026-06-18',
        tipoSalida: 'renuncia',
        razonSalida: 'Búsqueda de nuevas oportunidades',
      };

      await ctrl.createSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('empresaId'),
        })
      );
      expect(EmpleadoModel.findById).not.toHaveBeenCalled();
      expect(SalidaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si tipoSalida no es válido', async () => {
      req.body = { ...validBody, tipoSalida: 'vacaciones' };

      await ctrl.createSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el empleado no existe', async () => {
      req.body = validBody;
      EmpleadoModel.findById.mockResolvedValueOnce(null);

      await ctrl.createSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(SalidaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si el empleado está inactivo', async () => {
      req.body = validBody;
      EmpleadoModel.findById.mockResolvedValueOnce({ id: 100, estado: 'inactivo' });

      await ctrl.createSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede crear salida de empleado inactivo' });
      expect(SalidaModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSalida', () => {
    it('debe actualizar la salida', async () => {
      req.params.salidaId = '1';
      req.body = { estado: 'en_proceso' };
      const updated = { id: 1, estado: 'en_proceso' };
      SalidaModel.update.mockResolvedValueOnce(updated);

      await ctrl.updateSalida(req, res, next);

      expect(SalidaModel.update).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('debe retornar 400 si estado es inválido', async () => {
      req.params.salidaId = '1';
      req.body = { estado: 'cancelado' };

      await ctrl.updateSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.update).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si tipoSalida es inválido', async () => {
      req.params.salidaId = '1';
      req.body = { tipoSalida: 'invalido' };

      await ctrl.updateSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.update).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si la salida no existe', async () => {
      req.params.salidaId = '999';
      req.body = { estado: 'completado' };
      SalidaModel.update.mockResolvedValueOnce(null);

      await ctrl.updateSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteSalida', () => {
    it('debe eliminar la salida y sus documentos si está pendiente', async () => {
      req.params.salidaId = '1';
      SalidaModel.findById.mockResolvedValueOnce({ id: 1, estado: 'pendiente' });
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([{ id: 10 }, { id: 11 }]);

      await ctrl.deleteSalida(req, res, next);

      expect(DocumentoSalidaModel.delete).toHaveBeenCalledWith(10);
      expect(DocumentoSalidaModel.delete).toHaveBeenCalledWith(11);
      expect(SalidaModel.delete).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('debe retornar 404 si la salida no existe', async () => {
      req.params.salidaId = '999';
      SalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.deleteSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(SalidaModel.delete).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si la salida no está pendiente', async () => {
      req.params.salidaId = '1';
      SalidaModel.findById.mockResolvedValueOnce({ id: 1, estado: 'completado' });

      await ctrl.deleteSalida(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Solo se pueden eliminar salidas en estado pendiente' });
      expect(SalidaModel.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSalidasByEstado', () => {
    it('debe retornar salidas filtradas por estado', async () => {
      req.params.estado = 'pendiente';
      const salidas = [{ id: 1, estado: 'pendiente' }];
      SalidaModel.findByEstado.mockResolvedValueOnce(salidas);

      await ctrl.getSalidasByEstado(req, res, next);

      expect(SalidaModel.findByEstado).toHaveBeenCalledWith('pendiente');
      expect(res.json).toHaveBeenCalledWith(salidas);
    });

    it('debe retornar 400 si el estado es inválido', async () => {
      req.params.estado = 'invalido';

      await ctrl.getSalidasByEstado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.findByEstado).not.toHaveBeenCalled();
    });
  });

  describe('manejo de errores', () => {
    it('debe llamar a next(err) si el modelo lanza una excepción', async () => {
      const error = new Error('DB error');
      SalidaModel.findAll.mockRejectedValueOnce(error);

      await ctrl.getAllSalidas(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
