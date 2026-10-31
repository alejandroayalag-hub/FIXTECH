const pool = require('../../src/db/pool');
const CulturaEmpresa = require('../../src/models/culturaEmpresa');

// Mock the pool
jest.mock('../../src/db/pool');

describe('Modelo CulturaEmpresa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un elemento de cultura con campos requeridos', async () => {
      const mockCultura = {
        id: 1,
        empresa_id: 100,
        tipo: 'mision',
        titulo: 'Nuestra Misión',
        descripcion: 'Servir con excelencia',
        archivos: '[]',
        orden: 0,
        activo: true,
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.create({
        empresaId: 100,
        tipo: 'mision',
        titulo: 'Nuestra Misión',
        descripcion: 'Servir con excelencia',
        createdBy: 5,
      });

      expect(cultura.id).toBe(1);
      expect(cultura.tipo).toBe('mision');
      expect(cultura.activo).toBe(true);
      expect(cultura.orden).toBe(0);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('debe crear un elemento con archivos', async () => {
      const archivos = [
        {
          id: 'arch1',
          tipoArchivo: 'imagen',
          url: 'https://example.com/imagen.jpg',
          nombre: 'imagen.jpg',
          extension: 'jpg',
          tamano: 5000,
        },
      ];

      const mockCultura = {
        id: 2,
        empresa_id: 100,
        tipo: 'vision',
        titulo: 'Nuestra Visión',
        descripcion: 'Ser líderes',
        archivos: JSON.stringify(archivos),
        orden: 1,
        activo: true,
        created_by: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.create({
        empresaId: 100,
        tipo: 'vision',
        titulo: 'Nuestra Visión',
        descripcion: 'Ser líderes',
        archivos,
        orden: 1,
        createdBy: 5,
      });

      expect(cultura.id).toBe(2);
      expect(cultura.archivos).toBeDefined();
      expect(JSON.parse(cultura.archivos)).toHaveLength(1);
    });

    it('debe usar valores por defecto para campos opcionales', async () => {
      const mockCultura = {
        id: 3,
        empresa_id: 100,
        tipo: 'valores',
        titulo: 'Nuestros Valores',
        descripcion: '',
        archivos: '[]',
        orden: 0,
        activo: true,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.create({
        empresaId: 100,
        tipo: 'valores',
        titulo: 'Nuestros Valores',
      });

      expect(cultura.descripcion).toBe('');
      expect(cultura.orden).toBe(0);
      expect(cultura.activo).toBe(true);
    });

    it('debe validar tipos de cultura permitidos', async () => {
      const validTypes = ['mision', 'vision', 'valores', 'codigo_conducta', 'politicas', 'otro'];

      for (const tipo of validTypes) {
        pool.query.mockResolvedValueOnce({
          rows: [{
            id: Math.random(),
            empresa_id: 100,
            tipo,
            titulo: `Elemento ${tipo}`,
            descripcion: '',
            archivos: '[]',
            orden: 0,
            activo: true,
            created_by: 5,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

        const cultura = await CulturaEmpresa.create({
          empresaId: 100,
          tipo,
          titulo: `Elemento ${tipo}`,
          createdBy: 5,
        });

        expect(cultura.tipo).toBe(tipo);
      }

      expect(pool.query).toHaveBeenCalledTimes(validTypes.length);
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los elementos sin filtros', async () => {
      const mockCulturas = [
        {
          id: 1,
          empresa_id: 100,
          tipo: 'mision',
          titulo: 'Misión',
          activo: true,
        },
        {
          id: 2,
          empresa_id: 100,
          tipo: 'vision',
          titulo: 'Visión',
          activo: true,
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findAll();

      expect(culturas).toHaveLength(2);
      expect(culturas[0].id).toBe(1);
      expect(pool.query).toHaveBeenCalled();
    });

    it('debe filtrar por empresaId', async () => {
      const mockCultura = [
        {
          id: 1,
          empresa_id: 100,
          tipo: 'mision',
          titulo: 'Misión',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCultura });

      const culturas = await CulturaEmpresa.findAll({ empresaId: 100 });

      expect(culturas).toHaveLength(1);
      expect(culturas[0].empresa_id).toBe(100);
    });

    it('debe filtrar por tipo', async () => {
      const mockCulturas = [
        { id: 1, tipo: 'mision' },
        { id: 3, tipo: 'mision' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findAll({ tipo: 'mision' });

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.tipo === 'mision')).toBe(true);
    });

    it('debe filtrar por activo', async () => {
      const mockCulturas = [
        { id: 1, activo: true },
        { id: 2, activo: true },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findAll({ activo: true });

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.activo === true)).toBe(true);
    });

    it('debe permitir múltiples filtros simultáneamente', async () => {
      const mockCultura = [
        {
          id: 1,
          empresa_id: 100,
          tipo: 'mision',
          activo: true,
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCultura });

      const culturas = await CulturaEmpresa.findAll({
        empresaId: 100,
        tipo: 'mision',
        activo: true,
      });

      expect(culturas).toHaveLength(1);
      expect(culturas[0].empresa_id).toBe(100);
      expect(culturas[0].tipo).toBe('mision');
      expect(culturas[0].activo).toBe(true);
    });
  });

  describe('findById', () => {
    it('debe retornar un elemento por ID', async () => {
      const mockCultura = {
        id: 1,
        empresa_id: 100,
        tipo: 'mision',
        titulo: 'Misión',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.findById(1);

      expect(cultura).toBeDefined();
      expect(cultura.id).toBe(1);
    });

    it('debe retornar null si no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const cultura = await CulturaEmpresa.findById(999);

      expect(cultura).toBeNull();
    });
  });

  describe('update', () => {
    it('debe actualizar campos editables', async () => {
      const mockUpdated = {
        id: 1,
        titulo: 'Nueva Misión',
        descripcion: 'Nueva descripción',
        orden: 2,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const cultura = await CulturaEmpresa.update(1, {
        titulo: 'Nueva Misión',
        descripcion: 'Nueva descripción',
        orden: 2,
      });

      expect(cultura.titulo).toBe('Nueva Misión');
      expect(cultura.descripcion).toBe('Nueva descripción');
      expect(cultura.orden).toBe(2);
    });

    it('debe actualizar el estado activo', async () => {
      const mockUpdated = {
        id: 1,
        activo: false,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const cultura = await CulturaEmpresa.update(1, { activo: false });

      expect(cultura.activo).toBe(false);
    });

    it('no debe actualizar empresa_id ni tipo (campos no editables)', async () => {
      const mockCultura = { id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      await CulturaEmpresa.update(1, { empresaId: 999, tipo: 'vision' });

      // Verificar que no estén en la lista de editables
      const callArgs = pool.query.mock.calls[0];
      expect(callArgs[0]).not.toContain('empresa_id');
      expect(callArgs[0]).not.toContain('tipo');
    });

    it('debe retornar el registro sin cambios si no hay campos editables', async () => {
      const mockCultura = { id: 1, titulo: 'Original' };
      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.update(1, {
        empresaId: 999, // no editable
      });

      expect(cultura.id).toBe(1);
    });
  });

  describe('delete', () => {
    it('debe eliminar un elemento por ID', async () => {
      pool.query.mockResolvedValueOnce({});

      await CulturaEmpresa.delete(1);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM cultura_empresa WHERE id = $1',
        [1]
      );
    });
  });

  describe('findByEmpresaId', () => {
    it('debe retornar todos los elementos de una empresa', async () => {
      const mockCulturas = [
        { id: 1, empresa_id: 100, orden: 0 },
        { id: 2, empresa_id: 100, orden: 1 },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findByEmpresaId(100);

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.empresa_id === 100)).toBe(true);
    });
  });

  describe('findByTipo', () => {
    it('debe retornar todos los elementos de un tipo específico', async () => {
      const mockCulturas = [
        { id: 1, tipo: 'mision' },
        { id: 5, tipo: 'mision' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findByTipo('mision');

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.tipo === 'mision')).toBe(true);
    });
  });

  describe('findByEmpresaIdAndTipo', () => {
    it('debe retornar el elemento específico por empresa y tipo', async () => {
      const mockCultura = {
        id: 1,
        empresa_id: 100,
        tipo: 'mision',
        titulo: 'Misión',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockCultura] });

      const cultura = await CulturaEmpresa.findByEmpresaIdAndTipo(100, 'mision');

      expect(cultura).toBeDefined();
      expect(cultura.empresa_id).toBe(100);
      expect(cultura.tipo).toBe('mision');
    });

    it('debe retornar null si no existe la combinación', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const cultura = await CulturaEmpresa.findByEmpresaIdAndTipo(999, 'mision');

      expect(cultura).toBeNull();
    });
  });

  describe('findActiveByEmpresaId', () => {
    it('debe retornar solo elementos activos de una empresa', async () => {
      const mockCulturas = [
        { id: 1, empresa_id: 100, activo: true },
        { id: 2, empresa_id: 100, activo: true },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findActiveByEmpresaId(100);

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.activo === true)).toBe(true);
    });
  });

  describe('findByActivo', () => {
    it('debe retornar elementos según su estado activo', async () => {
      const mockCulturas = [
        { id: 1, activo: true },
        { id: 2, activo: true },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockCulturas });

      const culturas = await CulturaEmpresa.findByActivo(true);

      expect(culturas).toHaveLength(2);
      expect(culturas.every((c) => c.activo === true)).toBe(true);
    });
  });

  describe('archivos - addArchivo', () => {
    it('debe agregar un archivo a un elemento existente', async () => {
      const archivoExistente = {
        id: 'arch1',
        tipoArchivo: 'imagen',
        url: 'https://example.com/imagen.jpg',
        nombre: 'imagen.jpg',
      };

      const nuevoArchivo = {
        id: 'arch2',
        tipoArchivo: 'documento',
        url: 'https://example.com/documento.pdf',
        nombre: 'documento.pdf',
      };

      const culturaConArchivo = {
        id: 1,
        empresa_id: 100,
        archivos: JSON.stringify([archivoExistente, nuevoArchivo]),
      };

      // Mock findById
      pool.query.mockResolvedValueOnce({ rows: [{ archivos: JSON.stringify([archivoExistente]) }] });

      // Mock update
      pool.query.mockResolvedValueOnce({ rows: [culturaConArchivo] });

      const cultura = await CulturaEmpresa.addArchivo(1, nuevoArchivo);

      expect(cultura.id).toBe(1);
      expect(JSON.parse(cultura.archivos)).toHaveLength(2);
    });

    it('debe retornar null si el elemento no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const cultura = await CulturaEmpresa.addArchivo(999, {});

      expect(cultura).toBeNull();
    });
  });

  describe('archivos - removeArchivo', () => {
    it('debe remover un archivo de un elemento', async () => {
      const archivoParaRemover = {
        id: 'arch1',
        tipoArchivo: 'imagen',
        url: 'https://example.com/imagen.jpg',
      };

      const archivoRestante = {
        id: 'arch2',
        tipoArchivo: 'documento',
        url: 'https://example.com/documento.pdf',
      };

      const culturaSinArchivo = {
        id: 1,
        empresa_id: 100,
        archivos: JSON.stringify([archivoRestante]),
      };

      // Mock findById
      pool.query.mockResolvedValueOnce({
        rows: [{ archivos: JSON.stringify([archivoParaRemover, archivoRestante]) }],
      });

      // Mock update
      pool.query.mockResolvedValueOnce({ rows: [culturaSinArchivo] });

      const cultura = await CulturaEmpresa.removeArchivo(1, 'arch1');

      expect(cultura.id).toBe(1);
      expect(JSON.parse(cultura.archivos)).toHaveLength(1);
    });

    it('debe retornar null si el elemento no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const cultura = await CulturaEmpresa.removeArchivo(999, 'arch1');

      expect(cultura).toBeNull();
    });
  });

  describe('constraint único - empresaId + tipo', () => {
    it('debe validar constraint en la base de datos', async () => {
      // Este test verifica que el modelo prepara correctamente la query
      // que la BD rechazará si se viola el constraint

      const mockError = new Error('duplicate key value violates unique constraint "uk_cultura_empresa_tipo"');
      pool.query.mockRejectedValueOnce(mockError);

      // En un test real con BD, esto lanzaría error
      await expect(
        CulturaEmpresa.create({
          empresaId: 100,
          tipo: 'mision',
          titulo: 'Misión 2',
          createdBy: 5,
        })
      ).rejects.toThrow('duplicate key');
    });
  });
});
