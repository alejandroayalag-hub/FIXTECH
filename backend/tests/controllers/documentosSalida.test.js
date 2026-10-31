const fs = require('fs');
const DocumentoSalidaModel = require('../../src/models/documentoSalida');
const SalidaModel = require('../../src/models/salida');
const EmpleadoModel = require('../../src/models/empleado');
const ctrl = require('../../src/controllers/documentosSalidaController');

jest.mock('../../src/models/documentoSalida');
jest.mock('../../src/models/salida');
jest.mock('../../src/models/empleado');
jest.mock('fs');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    download: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

describe('Controller: documentosSalidaController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, user: { id: 5 } };
    res = mockRes();
    next = jest.fn();
  });

  describe('obtenerDocumentos', () => {
    it('debe retornar los documentos de una salida existente', async () => {
      req.params.salidaId = '1';
      const salida = { id: 1, estado: 'pendiente' };
      const documentos = [
        { id: 10, tipo_documento: 'finiquito' },
        { id: 11, tipo_documento: 'renuncia' },
        { id: 12, tipo_documento: 'entrega_materiales' },
        { id: 13, tipo_documento: 'encuesta_salida' },
      ];
      SalidaModel.findById.mockResolvedValueOnce(salida);
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce(documentos);

      await ctrl.obtenerDocumentos(req, res, next);

      expect(SalidaModel.findById).toHaveBeenCalledWith('1');
      expect(DocumentoSalidaModel.findBySalidaId).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(documentos);
      expect(res.json.mock.calls[0][0].length).toBe(4);
    });

    it('debe retornar 404 si la salida no existe', async () => {
      req.params.salidaId = '999';
      SalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.obtenerDocumentos(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Salida no encontrada' });
      expect(DocumentoSalidaModel.findBySalidaId).not.toHaveBeenCalled();
    });
  });

  describe('obtenerDocumentoPorId', () => {
    it('debe retornar el documento solicitado', async () => {
      req.params.documentoId = '10';
      const documento = { id: 10, tipo_documento: 'finiquito' };
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documento);

      await ctrl.obtenerDocumentoPorId(req, res, next);

      expect(DocumentoSalidaModel.findById).toHaveBeenCalledWith('10');
      expect(res.json).toHaveBeenCalledWith(documento);
    });

    it('debe retornar 404 si el documento no existe', async () => {
      req.params.documentoId = '999';
      DocumentoSalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.obtenerDocumentoPorId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Documento no encontrado' });
    });
  });

  describe('getAllDocumentos', () => {
    it('debe retornar todos los documentos sin filtros', async () => {
      const documentos = [{ id: 1 }, { id: 2 }];
      DocumentoSalidaModel.findAll.mockResolvedValueOnce(documentos);

      await ctrl.getAllDocumentos(req, res, next);

      expect(DocumentoSalidaModel.findAll).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(documentos);
    });

    it('debe aplicar filtros de estado, tipoDocumento y salidaId', async () => {
      req.query = { estado: 'completado', tipoDocumento: 'finiquito', salidaId: '1' };
      DocumentoSalidaModel.findAll.mockResolvedValueOnce([]);

      await ctrl.getAllDocumentos(req, res, next);

      expect(DocumentoSalidaModel.findAll).toHaveBeenCalledWith({
        estado: 'completado',
        tipoDocumento: 'finiquito',
        salidaId: '1',
      });
    });

    it('debe retornar 400 si el estado es inválido', async () => {
      req.query = { estado: 'invalido' };

      await ctrl.getAllDocumentos(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(DocumentoSalidaModel.findAll).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si el tipoDocumento es inválido', async () => {
      req.query = { tipoDocumento: 'invalido' };

      await ctrl.getAllDocumentos(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(DocumentoSalidaModel.findAll).not.toHaveBeenCalled();
    });
  });

  describe('generarTemplate', () => {
    const empleado = { id: 100, nombre: 'Juan', apellido_paterno: 'Pérez', email: 'juan@test.com' };
    const salida = {
      id: 1,
      empleado_id: 100,
      fecha_salida: '2026-06-01',
      salario_pendiente: 5000,
      razon_salida: 'Búsqueda de nuevas oportunidades',
    };
    const documentoFiniquito = { id: 10, salida_id: 1, tipo_documento: 'finiquito', estado: 'template_generado' };

    it('debe generar el template y actualizar el documento', async () => {
      req.params = { salidaId: '1', tipo: 'finiquito' };
      SalidaModel.findById.mockResolvedValueOnce(salida);
      EmpleadoModel.findById.mockResolvedValueOnce(empleado);
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([documentoFiniquito]);
      const actualizado = { ...documentoFiniquito, template_contenido: 'FINIQUITO...' };
      DocumentoSalidaModel.update.mockResolvedValueOnce(actualizado);

      await ctrl.generarTemplate(req, res, next);

      expect(EmpleadoModel.findById).toHaveBeenCalledWith(100);
      expect(DocumentoSalidaModel.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          templateContenido: expect.stringContaining('FINIQUITO'),
          estado: 'template_generado',
        })
      );
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debe retornar 400 si el tipo es inválido', async () => {
      req.params = { salidaId: '1', tipo: 'invalido' };

      await ctrl.generarTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SalidaModel.findById).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si la salida no existe', async () => {
      req.params = { salidaId: '999', tipo: 'finiquito' };
      SalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.generarTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Salida no encontrada' });
      expect(EmpleadoModel.findById).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el empleado no existe', async () => {
      req.params = { salidaId: '1', tipo: 'finiquito' };
      SalidaModel.findById.mockResolvedValueOnce(salida);
      EmpleadoModel.findById.mockResolvedValueOnce(null);

      await ctrl.generarTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Empleado no encontrado' });
      expect(DocumentoSalidaModel.update).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si no existe un documento de ese tipo para la salida', async () => {
      req.params = { salidaId: '1', tipo: 'renuncia' };
      SalidaModel.findById.mockResolvedValueOnce(salida);
      EmpleadoModel.findById.mockResolvedValueOnce(empleado);
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([documentoFiniquito]); // sólo finiquito

      await ctrl.generarTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Documento de salida no encontrado para este tipo' });
      expect(DocumentoSalidaModel.update).not.toHaveBeenCalled();
    });

    it('debe generar contenido distinto para cada tipo de documento válido', async () => {
      const tipos = ['renuncia', 'entrega_materiales', 'encuesta_salida'];
      for (const tipo of tipos) {
        jest.clearAllMocks();
        req.params = { salidaId: '1', tipo };
        const doc = { id: 20, salida_id: 1, tipo_documento: tipo, estado: 'template_generado' };
        SalidaModel.findById.mockResolvedValueOnce(salida);
        EmpleadoModel.findById.mockResolvedValueOnce(empleado);
        DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([doc]);
        DocumentoSalidaModel.update.mockResolvedValueOnce({ ...doc, template_contenido: 'x' });

        await ctrl.generarTemplate(req, res, next);

        expect(DocumentoSalidaModel.update).toHaveBeenCalledWith(
          20,
          expect.objectContaining({ templateContenido: expect.any(String) })
        );
        expect(next).not.toHaveBeenCalled();
      }
    });
  });

  describe('subirEscaneado', () => {
    const documentoConTemplate = {
      id: 10,
      salida_id: 1,
      tipo_documento: 'finiquito',
      template_contenido: 'FINIQUITO...',
      estado: 'template_generado',
    };

    beforeEach(() => {
      req.params.documentoId = '10';
      req.file = { path: '/uploads/escaneado.pdf', originalname: 'escaneado.pdf', size: 1024 };
      req.body = { tieneHuella: 'true', tieneFirma: 'true' };
    });

    it('debe retornar 400 si no se envía archivo', async () => {
      req.file = undefined;

      await ctrl.subirEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se recibió archivo' });
      expect(DocumentoSalidaModel.findById).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si el documento no existe', async () => {
      DocumentoSalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.subirEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Documento no encontrado' });
    });

    it('debe retornar 400 si el template no fue generado', async () => {
      DocumentoSalidaModel.findById.mockResolvedValueOnce({ ...documentoConTemplate, template_contenido: null, template_url: null });

      await ctrl.subirEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Debe generar el template primero' });
      expect(DocumentoSalidaModel.update).not.toHaveBeenCalled();
    });

    it('debe subir el escaneado y marcar el documento como completado', async () => {
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documentoConTemplate);
      const actualizado = { ...documentoConTemplate, estado: 'completado', documento_url: '/uploads/escaneado.pdf' };
      DocumentoSalidaModel.update.mockResolvedValueOnce(actualizado);
      // Sólo este documento existe para la salida -> no todos completados (estado seguirá template_generado en otros)
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([
        { ...actualizado },
        { id: 11, estado: 'template_generado' },
      ]);
      SalidaModel.update.mockResolvedValueOnce({ id: 1, estado: 'en_proceso' });

      await ctrl.subirEscaneado(req, res, next);

      expect(DocumentoSalidaModel.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          documentoUrl: '/uploads/escaneado.pdf',
          documentoNombre: 'escaneado.pdf',
          documentoTamano: 1024,
          documentoTieneHuella: true,
          documentoTieneFirma: true,
          estado: 'completado',
        })
      );
      expect(SalidaModel.update).toHaveBeenCalledWith(1, { estado: 'en_proceso' });
      expect(EmpleadoModel.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debe marcar la salida como completada y al empleado inactivo cuando todos los documentos están completados', async () => {
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documentoConTemplate);
      const actualizado = { ...documentoConTemplate, estado: 'completado', documento_url: '/uploads/escaneado.pdf' };
      DocumentoSalidaModel.update.mockResolvedValueOnce(actualizado);
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([
        { id: 10, estado: 'completado' },
        { id: 11, estado: 'completado' },
        { id: 12, estado: 'completado' },
        { id: 13, estado: 'completado' },
      ]);
      SalidaModel.update.mockResolvedValueOnce({ id: 1, empleado_id: 100, estado: 'completado' });

      await ctrl.subirEscaneado(req, res, next);

      expect(SalidaModel.update).toHaveBeenCalledWith(1, { estado: 'completado', documentosFirmados: true });
      expect(EmpleadoModel.update).toHaveBeenCalledWith(100, { estado: 'inactivo' });
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debe interpretar tieneHuella/tieneFirma ausentes como false', async () => {
      req.body = {};
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documentoConTemplate);
      DocumentoSalidaModel.update.mockResolvedValueOnce({ ...documentoConTemplate, estado: 'completado' });
      DocumentoSalidaModel.findBySalidaId.mockResolvedValueOnce([{ id: 10, estado: 'completado' }]);
      SalidaModel.update.mockResolvedValueOnce({ id: 1, empleado_id: 100, estado: 'completado' });

      await ctrl.subirEscaneado(req, res, next);

      expect(DocumentoSalidaModel.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ documentoTieneHuella: false, documentoTieneFirma: false })
      );
    });
  });

  describe('descargarEscaneado', () => {
    it('debe retornar 404 si el documento no tiene escaneado', async () => {
      req.params.documentoId = '10';
      DocumentoSalidaModel.findById.mockResolvedValueOnce({ id: 10, documento_url: null });

      await ctrl.descargarEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Escaneado no encontrado' });
    });

    it('debe retornar 404 si el documento no existe', async () => {
      req.params.documentoId = '999';
      DocumentoSalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.descargarEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe retornar 404 si el archivo ya no existe en disco', async () => {
      req.params.documentoId = '10';
      DocumentoSalidaModel.findById.mockResolvedValueOnce({ id: 10, documento_url: '/uploads/x.pdf', documento_nombre: 'x.pdf' });
      fs.existsSync.mockReturnValueOnce(false);

      await ctrl.descargarEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'El archivo ya no existe en el servidor. Por favor vuelve a subirlo.' });
    });

    it('debe descargar el archivo si existe', async () => {
      req.params.documentoId = '10';
      DocumentoSalidaModel.findById.mockResolvedValueOnce({ id: 10, documento_url: '/uploads/x.pdf', documento_nombre: 'x.pdf' });
      fs.existsSync.mockReturnValueOnce(true);

      await ctrl.descargarEscaneado(req, res, next);

      expect(res.download).toHaveBeenCalledWith(expect.stringContaining('x.pdf'), 'x.pdf');
    });
  });

  describe('eliminarEscaneado', () => {
    it('debe retornar 404 si el documento no existe', async () => {
      req.params.documentoId = '999';
      DocumentoSalidaModel.findById.mockResolvedValueOnce(null);

      await ctrl.eliminarEscaneado(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe eliminar el archivo físico y limpiar los campos del documento', async () => {
      req.params.documentoId = '10';
      const documento = { id: 10, salida_id: 1, documento_url: '/uploads/x.pdf' };
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documento);
      fs.existsSync.mockReturnValueOnce(true);
      const actualizado = { id: 10, estado: 'template_generado', documento_url: null };
      DocumentoSalidaModel.update.mockResolvedValueOnce(actualizado);
      SalidaModel.update.mockResolvedValueOnce({ id: 1, estado: 'en_proceso' });

      await ctrl.eliminarEscaneado(req, res, next);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/x.pdf');
      expect(DocumentoSalidaModel.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ documentoUrl: null, estado: 'template_generado' })
      );
      expect(SalidaModel.update).toHaveBeenCalledWith(1, { estado: 'en_proceso' });
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('no debe intentar borrar el archivo si no existe en disco', async () => {
      req.params.documentoId = '10';
      const documento = { id: 10, salida_id: 1, documento_url: '/uploads/x.pdf' };
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documento);
      fs.existsSync.mockReturnValueOnce(false);
      DocumentoSalidaModel.update.mockResolvedValueOnce({ id: 10 });
      SalidaModel.update.mockResolvedValueOnce({ id: 1 });

      await ctrl.eliminarEscaneado(req, res, next);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('no debe fallar si el documento no tenía escaneado', async () => {
      req.params.documentoId = '10';
      const documento = { id: 10, salida_id: 1, documento_url: null };
      DocumentoSalidaModel.findById.mockResolvedValueOnce(documento);
      DocumentoSalidaModel.update.mockResolvedValueOnce({ id: 10 });
      SalidaModel.update.mockResolvedValueOnce({ id: 1 });

      await ctrl.eliminarEscaneado(req, res, next);

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ id: 10 });
    });
  });

  describe('manejo de errores', () => {
    it('debe llamar a next(err) si el modelo lanza una excepción en obtenerDocumentos', async () => {
      const error = new Error('DB error');
      req.params.salidaId = '1';
      SalidaModel.findById.mockRejectedValueOnce(error);

      await ctrl.obtenerDocumentos(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('debe llamar a next(err) si el modelo lanza una excepción en generarTemplate', async () => {
      const error = new Error('DB error');
      req.params = { salidaId: '1', tipo: 'finiquito' };
      SalidaModel.findById.mockRejectedValueOnce(error);

      await ctrl.generarTemplate(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('debe llamar a next(err) si el modelo lanza una excepción en subirEscaneado', async () => {
      const error = new Error('DB error');
      req.params.documentoId = '10';
      req.file = { path: '/x', originalname: 'x.pdf', size: 1 };
      DocumentoSalidaModel.findById.mockRejectedValueOnce(error);

      await ctrl.subirEscaneado(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
