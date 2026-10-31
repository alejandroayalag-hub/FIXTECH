const pool = require('../../src/db/pool');
const DocumentoSalida = require('../../src/models/documentoSalida');

// Mock the pool
jest.mock('../../src/db/pool');

describe('Modelo DocumentoSalida', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un documento de salida con los campos requeridos', async () => {
      const mockDocumento = {
        id: 1,
        salida_id: 100,
        tipo_documento: 'finiquito',
        template_contenido: null,
        template_fecha_generacion: null,
        template_url: null,
        documento_url: null,
        documento_nombre: null,
        documento_fecha_carga: null,
        documento_tamano: null,
        documento_tiene_huella: null,
        documento_tiene_firma: null,
        estado: 'template_generado',
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockDocumento] });

      const documento = await DocumentoSalida.create({
        salidaId: 100,
        tipoDocumento: 'finiquito',
        createdBy: 5,
      });

      expect(documento.id).toBe(1);
      expect(documento.salida_id).toBe(100);
      expect(documento.tipo_documento).toBe('finiquito');
      expect(documento.estado).toBe('template_generado');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('debe crear un documento con template generado', async () => {
      const mockDocumento = {
        id: 1,
        salida_id: 100,
        tipo_documento: 'finiquito',
        template_contenido: '<html>Finiquito...</html>',
        template_fecha_generacion: new Date('2024-06-18'),
        template_url: 'https://storage.example.com/finiquito_100.pdf',
        documento_url: null,
        documento_nombre: null,
        documento_fecha_carga: null,
        documento_tamano: null,
        documento_tiene_huella: null,
        documento_tiene_firma: null,
        estado: 'template_generado',
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockDocumento] });

      const documento = await DocumentoSalida.create({
        salidaId: 100,
        tipoDocumento: 'finiquito',
        templateContenido: '<html>Finiquito...</html>',
        templateFechaGeneracion: new Date('2024-06-18'),
        templateUrl: 'https://storage.example.com/finiquito_100.pdf',
        createdBy: 5,
      });

      expect(documento.template_contenido).toBe('<html>Finiquito...</html>');
      expect(documento.template_url).toBe('https://storage.example.com/finiquito_100.pdf');
    });

    it('debe crear un documento con documento escaneado', async () => {
      const mockDocumento = {
        id: 2,
        salida_id: 100,
        tipo_documento: 'finiquito',
        template_contenido: null,
        template_fecha_generacion: null,
        template_url: null,
        documento_url: 'https://storage.example.com/firmado_100.pdf',
        documento_nombre: 'finiquito_firmado.pdf',
        documento_fecha_carga: new Date('2024-06-19'),
        documento_tamano: 245678,
        documento_tiene_huella: true,
        documento_tiene_firma: true,
        estado: 'completado',
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockDocumento] });

      const documento = await DocumentoSalida.create({
        salidaId: 100,
        tipoDocumento: 'finiquito',
        documentoUrl: 'https://storage.example.com/firmado_100.pdf',
        documentoNombre: 'finiquito_firmado.pdf',
        documentoFechaCarga: new Date('2024-06-19'),
        documentoTamano: 245678,
        documentoTieneHuella: true,
        documentoTieneFirma: true,
        estado: 'completado',
        createdBy: 5,
      });

      expect(documento.documento_url).toBe('https://storage.example.com/firmado_100.pdf');
      expect(documento.documento_nombre).toBe('finiquito_firmado.pdf');
      expect(documento.documento_tiene_huella).toBe(true);
      expect(documento.documento_tiene_firma).toBe(true);
      expect(documento.estado).toBe('completado');
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los documentos sin filtros', async () => {
      const mockDocumentos = [
        {
          id: 1,
          salida_id: 100,
          tipo_documento: 'finiquito',
          estado: 'template_generado',
        },
        {
          id: 2,
          salida_id: 101,
          tipo_documento: 'renuncia',
          estado: 'completado',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findAll();

      expect(documentos).toHaveLength(2);
      expect(documentos[0].id).toBe(1);
      expect(pool.query).toHaveBeenCalled();
    });

    it('debe filtrar por salidaId', async () => {
      const mockDocumento = [
        {
          id: 1,
          salida_id: 100,
          tipo_documento: 'finiquito',
          estado: 'template_generado',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumento });

      const documentos = await DocumentoSalida.findAll({ salidaId: 100 });

      expect(documentos).toHaveLength(1);
      expect(documentos[0].salida_id).toBe(100);
    });

    it('debe filtrar por tipoDocumento', async () => {
      const mockDocumentos = [
        { id: 1, tipo_documento: 'finiquito' },
        { id: 2, tipo_documento: 'finiquito' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findAll({ tipoDocumento: 'finiquito' });

      expect(documentos).toHaveLength(2);
      expect(documentos.every((d) => d.tipo_documento === 'finiquito')).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const mockDocumentos = [
        { id: 1, estado: 'template_generado' },
        { id: 2, estado: 'template_generado' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findAll({ estado: 'template_generado' });

      expect(documentos).toHaveLength(2);
      expect(documentos.every((d) => d.estado === 'template_generado')).toBe(true);
    });

    it('debe filtrar con múltiples criterios', async () => {
      const mockDocumento = [
        {
          id: 1,
          salida_id: 100,
          tipo_documento: 'finiquito',
          estado: 'template_generado',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumento });

      const documentos = await DocumentoSalida.findAll({
        salidaId: 100,
        tipoDocumento: 'finiquito',
        estado: 'template_generado',
      });

      expect(documentos).toHaveLength(1);
      expect(documentos[0].salida_id).toBe(100);
      expect(documentos[0].tipo_documento).toBe('finiquito');
    });
  });

  describe('findById', () => {
    it('debe retornar un documento por ID', async () => {
      const mockDocumento = {
        id: 1,
        salida_id: 100,
        tipo_documento: 'finiquito',
        estado: 'template_generado',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockDocumento] });

      const documento = await DocumentoSalida.findById(1);

      expect(documento).toBeDefined();
      expect(documento.id).toBe(1);
    });

    it('debe retornar null si no existe el documento', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const documento = await DocumentoSalida.findById(999);

      expect(documento).toBeNull();
    });
  });

  describe('update', () => {
    it('debe actualizar campos editables', async () => {
      const mockUpdated = {
        id: 1,
        documento_url: 'https://storage.example.com/firmado.pdf',
        estado: 'completado',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const documento = await DocumentoSalida.update(1, {
        documentoUrl: 'https://storage.example.com/firmado.pdf',
        estado: 'completado',
      });

      expect(documento.documento_url).toBe('https://storage.example.com/firmado.pdf');
      expect(documento.estado).toBe('completado');
    });

    it('no debe actualizar salida_id (campo no editable)', async () => {
      const mockDocumento = { id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [mockDocumento] });

      await DocumentoSalida.update(1, { salidaId: 999 });

      // Verificar que salida_id no esté en la lista de editables
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).not.toContain('salida_id');
    });

    it('debe actualizar documento escaneado completo', async () => {
      const mockUpdated = {
        id: 1,
        documento_url: 'https://storage.example.com/firmado.pdf',
        documento_nombre: 'finiquito_firmado.pdf',
        documento_fecha_carga: new Date('2024-06-19'),
        documento_tamano: 245678,
        documento_tiene_huella: true,
        documento_tiene_firma: true,
        estado: 'completado',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const documento = await DocumentoSalida.update(1, {
        documentoUrl: 'https://storage.example.com/firmado.pdf',
        documentoNombre: 'finiquito_firmado.pdf',
        documentoFechaCarga: new Date('2024-06-19'),
        documentoTamano: 245678,
        documentoTieneHuella: true,
        documentoTieneFirma: true,
        estado: 'completado',
      });

      expect(documento.documento_url).toBe('https://storage.example.com/firmado.pdf');
      expect(documento.documento_tiene_huella).toBe(true);
      expect(documento.estado).toBe('completado');
    });
  });

  describe('delete', () => {
    it('debe eliminar un documento por ID', async () => {
      pool.query.mockResolvedValueOnce({});

      await DocumentoSalida.delete(1);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM documentos_salida WHERE id = $1',
        [1]
      );
    });
  });

  describe('findBySalidaId', () => {
    it('debe retornar todos los documentos de una salida', async () => {
      const mockDocumentos = [
        { id: 1, salida_id: 100, tipo_documento: 'finiquito' },
        { id: 2, salida_id: 100, tipo_documento: 'renuncia' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findBySalidaId(100);

      expect(documentos).toHaveLength(2);
      expect(documentos.every((d) => d.salida_id === 100)).toBe(true);
    });
  });

  describe('findByTipoDocumento', () => {
    it('debe retornar todos los documentos de un tipo específico', async () => {
      const mockDocumentos = [
        { id: 1, tipo_documento: 'finiquito' },
        { id: 2, tipo_documento: 'finiquito' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findByTipoDocumento('finiquito');

      expect(documentos).toHaveLength(2);
      expect(documentos.every((d) => d.tipo_documento === 'finiquito')).toBe(true);
    });
  });

  describe('findByEstado', () => {
    it('debe retornar todos los documentos con un estado específico', async () => {
      const mockDocumentos = [
        { id: 1, estado: 'template_generado' },
        { id: 2, estado: 'template_generado' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockDocumentos });

      const documentos = await DocumentoSalida.findByEstado('template_generado');

      expect(documentos).toHaveLength(2);
      expect(documentos.every((d) => d.estado === 'template_generado')).toBe(true);
    });
  });
});
