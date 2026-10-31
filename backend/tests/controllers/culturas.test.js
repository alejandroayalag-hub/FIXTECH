const CulturaEmpresaModel = require('../../src/models/culturaEmpresa');
const ctrl = require('../../src/controllers/culturasController');
const fs = require('fs');
const crypto = require('crypto');

jest.mock('../../src/models/culturaEmpresa');
jest.mock('fs');
jest.mock('crypto');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

describe('Controller: culturasController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: { id: 5 } };
    res = mockRes();
    next = jest.fn();
  });

  describe('getCulturasByEmpresa', () => {
    it('debe retornar las culturas activas de una empresa', async () => {
      req.params.empresaId = '1';
      const culturas = [{ id: 1, tipo: 'mision' }, { id: 2, tipo: 'vision' }];
      CulturaEmpresaModel.findActiveByEmpresaId.mockResolvedValueOnce(culturas);

      await ctrl.getCulturasByEmpresa(req, res, next);

      expect(CulturaEmpresaModel.findActiveByEmpresaId).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(culturas);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe retornar lista vacía si la empresa no tiene culturas', async () => {
      req.params.empresaId = '999';
      CulturaEmpresaModel.findActiveByEmpresaId.mockResolvedValueOnce([]);

      await ctrl.getCulturasByEmpresa(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getCulturaById', () => {
    it('debe retornar la cultura encontrada', async () => {
      req.params.culturaId = '1';
      const cultura = { id: 1, tipo: 'mision' };
      CulturaEmpresaModel.findById.mockResolvedValueOnce(cultura);

      await ctrl.getCulturaById(req, res, next);

      expect(CulturaEmpresaModel.findById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(cultura);
    });

    it('debe retornar 404 si la cultura no existe', async () => {
      req.params.culturaId = '999';
      CulturaEmpresaModel.findById.mockResolvedValueOnce(null);

      await ctrl.getCulturaById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cultura no encontrada' });
    });
  });

  describe('createCultura', () => {
    const validBody = {
      empresaId: 1,
      tipo: 'mision',
      titulo: 'Nuestra Misión',
      descripcion: 'Servir con excelencia',
    };

    it('debe crear una cultura con el siguiente orden disponible', async () => {
      req.body = validBody;
      CulturaEmpresaModel.findByEmpresaIdAndTipo.mockResolvedValueOnce(null);
      CulturaEmpresaModel.findByEmpresaId.mockResolvedValueOnce([{ id: 1, orden: 2 }, { id: 2, orden: 5 }]);
      const culturaCreada = { id: 3, ...validBody, orden: 6 };
      CulturaEmpresaModel.create.mockResolvedValueOnce(culturaCreada);

      await ctrl.createCultura(req, res, next);

      expect(CulturaEmpresaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: 1,
          tipo: 'mision',
          titulo: 'Nuestra Misión',
          descripcion: 'Servir con excelencia',
          orden: 6,
          createdBy: 5,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(culturaCreada);
    });

    it('debe usar orden 1 si la empresa no tiene culturas previas', async () => {
      req.body = validBody;
      CulturaEmpresaModel.findByEmpresaIdAndTipo.mockResolvedValueOnce(null);
      CulturaEmpresaModel.findByEmpresaId.mockResolvedValueOnce([]);
      CulturaEmpresaModel.create.mockResolvedValueOnce({ id: 1, ...validBody, orden: 1 });

      await ctrl.createCultura(req, res, next);

      expect(CulturaEmpresaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ orden: 1 })
      );
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      req.body = { empresaId: 1 };

      await ctrl.createCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CulturaEmpresaModel.findByEmpresaIdAndTipo).not.toHaveBeenCalled();
      expect(CulturaEmpresaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si tipo no es válido', async () => {
      req.body = { ...validBody, tipo: 'invalido' };

      await ctrl.createCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CulturaEmpresaModel.create).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si ya existe un elemento del mismo tipo para la empresa', async () => {
      req.body = validBody;
      CulturaEmpresaModel.findByEmpresaIdAndTipo.mockResolvedValueOnce({ id: 1, tipo: 'mision' });

      await ctrl.createCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe un elemento de tipo mision para esta empresa' });
      expect(CulturaEmpresaModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCultura', () => {
    it('debe actualizar la cultura', async () => {
      req.params.culturaId = '1';
      req.body = { titulo: 'Nueva Misión' };
      const updated = { id: 1, titulo: 'Nueva Misión' };
      CulturaEmpresaModel.update.mockResolvedValueOnce(updated);

      await ctrl.updateCultura(req, res, next);

      expect(CulturaEmpresaModel.update).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('debe retornar 400 si tipo es inválido', async () => {
      req.params.culturaId = '1';
      req.body = { tipo: 'invalido' };

      await ctrl.updateCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CulturaEmpresaModel.update).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si la cultura no existe', async () => {
      req.params.culturaId = '999';
      req.body = { titulo: 'X' };
      CulturaEmpresaModel.update.mockResolvedValueOnce(null);

      await ctrl.updateCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cultura no encontrada' });
    });
  });

  describe('deleteCultura', () => {
    it('debe eliminar la cultura existente', async () => {
      req.params.culturaId = '1';
      CulturaEmpresaModel.findById.mockResolvedValueOnce({ id: 1, tipo: 'mision' });

      await ctrl.deleteCultura(req, res, next);

      expect(CulturaEmpresaModel.delete).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('debe retornar 404 si la cultura no existe', async () => {
      req.params.culturaId = '999';
      CulturaEmpresaModel.findById.mockResolvedValueOnce(null);

      await ctrl.deleteCultura(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(CulturaEmpresaModel.delete).not.toHaveBeenCalled();
    });
  });

  describe('subirArchivo', () => {
    it('debe agregar el archivo a la cultura existente', async () => {
      req.params.culturaId = '1';
      req.file = { originalname: 'manual.pdf', path: '/uploads/manual.pdf', mimetype: 'application/pdf', size: 2048 };
      const mockUuid = 'uuid-1234-5678';
      crypto.randomUUID.mockReturnValueOnce(mockUuid);
      CulturaEmpresaModel.findById.mockResolvedValueOnce({ id: 1, archivos: [] });
      const actualizado = { id: 1, archivos: [{ id: mockUuid, nombre: 'manual.pdf' }] };
      CulturaEmpresaModel.addArchivo.mockResolvedValueOnce(actualizado);

      await ctrl.subirArchivo(req, res, next);

      expect(CulturaEmpresaModel.addArchivo).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          id: mockUuid,
          nombre: 'manual.pdf',
          url: '/uploads/manual.pdf',
          tipo: 'application/pdf',
          tamano: 2048,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debe generar un id único para cada archivo subido', async () => {
      req.params.culturaId = '1';
      req.file = { originalname: 'test.pdf', path: '/uploads/test.pdf', mimetype: 'application/pdf', size: 1024 };
      const mockUuid = 'unique-uuid-12345';
      crypto.randomUUID.mockReturnValueOnce(mockUuid);
      CulturaEmpresaModel.findById.mockResolvedValueOnce({ id: 1, archivos: [] });
      CulturaEmpresaModel.addArchivo.mockResolvedValueOnce({ id: 1, archivos: [{ id: mockUuid, nombre: 'test.pdf' }] });

      await ctrl.subirArchivo(req, res, next);

      expect(crypto.randomUUID).toHaveBeenCalled();
      expect(CulturaEmpresaModel.addArchivo).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ id: mockUuid })
      );
    });

    it('debe retornar 400 si no se envía archivo', async () => {
      req.params.culturaId = '1';
      req.file = undefined;

      await ctrl.subirArchivo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se recibió archivo' });
      expect(CulturaEmpresaModel.findById).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si la cultura no existe', async () => {
      req.params.culturaId = '999';
      req.file = { originalname: 'manual.pdf', path: '/uploads/manual.pdf', mimetype: 'application/pdf', size: 2048 };
      CulturaEmpresaModel.findById.mockResolvedValueOnce(null);

      await ctrl.subirArchivo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(CulturaEmpresaModel.addArchivo).not.toHaveBeenCalled();
    });
  });

  describe('eliminarArchivo', () => {
    it('debe eliminar el archivo existente de la cultura', async () => {
      req.params.culturaId = '1';
      req.params.archivoId = 'a1';
      CulturaEmpresaModel.findById.mockResolvedValueOnce({
        id: 1,
        archivos: [{ id: 'a1', nombre: 'manual.pdf', url: '/uploads/manual.pdf' }],
      });
      fs.existsSync.mockReturnValueOnce(true);
      const actualizado = { id: 1, archivos: [] };
      CulturaEmpresaModel.removeArchivo.mockResolvedValueOnce(actualizado);

      await ctrl.eliminarArchivo(req, res, next);

      expect(fs.existsSync).toHaveBeenCalledWith('/uploads/manual.pdf');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/manual.pdf');
      expect(CulturaEmpresaModel.removeArchivo).toHaveBeenCalledWith('1', 'a1');
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debe eliminar el archivo físico del disco cuando se elimina un archivo', async () => {
      req.params.culturaId = '1';
      req.params.archivoId = 'file-uuid-123';
      const fileUrl = '/uploads/test-file.pdf';
      CulturaEmpresaModel.findById.mockResolvedValueOnce({
        id: 1,
        archivos: [{ id: 'file-uuid-123', nombre: 'test-file.pdf', url: fileUrl }],
      });
      fs.existsSync.mockReturnValueOnce(true);
      CulturaEmpresaModel.removeArchivo.mockResolvedValueOnce({ id: 1, archivos: [] });

      await ctrl.eliminarArchivo(req, res, next);

      expect(fs.unlinkSync).toHaveBeenCalledWith(fileUrl);
      expect(CulturaEmpresaModel.removeArchivo).toHaveBeenCalledWith('1', 'file-uuid-123');
    });

    it('debe retornar 404 si la cultura no existe', async () => {
      req.params.culturaId = '999';
      req.params.archivoId = 'a1';
      CulturaEmpresaModel.findById.mockResolvedValueOnce(null);

      await ctrl.eliminarArchivo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(CulturaEmpresaModel.removeArchivo).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el archivo no existe en la cultura', async () => {
      req.params.culturaId = '1';
      req.params.archivoId = 'no-existe';
      CulturaEmpresaModel.findById.mockResolvedValueOnce({
        id: 1,
        archivos: [{ id: 'a1', nombre: 'manual.pdf' }],
      });

      await ctrl.eliminarArchivo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Archivo no encontrado' });
      expect(CulturaEmpresaModel.removeArchivo).not.toHaveBeenCalled();
    });

    it('debe parsear archivos almacenados como string JSON', async () => {
      req.params.culturaId = '1';
      req.params.archivoId = 'a1';
      CulturaEmpresaModel.findById.mockResolvedValueOnce({
        id: 1,
        archivos: JSON.stringify([{ id: 'a1', nombre: 'manual.pdf', url: '/uploads/manual.pdf' }]),
      });
      fs.existsSync.mockReturnValueOnce(true);
      CulturaEmpresaModel.removeArchivo.mockResolvedValueOnce({ id: 1, archivos: [] });

      await ctrl.eliminarArchivo(req, res, next);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/manual.pdf');
      expect(CulturaEmpresaModel.removeArchivo).toHaveBeenCalledWith('1', 'a1');
      expect(res.status).not.toHaveBeenCalledWith(404);
    });
  });

  describe('manejo de errores', () => {
    it('debe llamar a next(err) si el modelo lanza una excepción', async () => {
      const error = new Error('DB error');
      CulturaEmpresaModel.findActiveByEmpresaId.mockRejectedValueOnce(error);
      req.params.empresaId = '1';

      await ctrl.getCulturasByEmpresa(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
