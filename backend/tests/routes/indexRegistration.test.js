const fs = require('fs');
const path = require('path');

const indexSrc = fs.readFileSync(path.join(__dirname, '../../src/index.js'), 'utf8');

describe('index.js: registro de rutas de Salidas, DocumentosSalida y Culturas', () => {
  it('registra /api/salidas apuntando a routes/salidas con authMiddleware', () => {
    expect(indexSrc).toMatch(/app\.use\(\s*['"]\/api\/salidas['"]\s*,\s*authMiddleware\s*,\s*require\(['"]\.\/routes\/salidas['"]\)\s*\)/);
  });

  it('registra /api/documentosSalida apuntando a routes/documentosSalida con authMiddleware', () => {
    expect(indexSrc).toMatch(/app\.use\(\s*['"]\/api\/documentosSalida['"]\s*,\s*authMiddleware\s*,\s*require\(['"]\.\/routes\/documentosSalida['"]\)\s*\)/);
  });

  it('registra /api/culturas apuntando a routes/culturas con authMiddleware', () => {
    expect(indexSrc).toMatch(/app\.use\(\s*['"]\/api\/culturas['"]\s*,\s*authMiddleware\s*,\s*require\(['"]\.\/routes\/culturas['"]\)\s*\)/);
  });

  it('los tres archivos de rutas existen y exportan un router de Express', () => {
    const salidas = require('../../src/routes/salidas');
    const documentosSalida = require('../../src/routes/documentosSalida');
    const culturas = require('../../src/routes/culturas');

    [salidas, documentosSalida, culturas].forEach((router) => {
      expect(typeof router).toBe('function');
      expect(typeof router.use).toBe('function');
      expect(Array.isArray(router.stack)).toBe(true);
      expect(router.stack.length).toBeGreaterThan(0);
    });
  });
});
