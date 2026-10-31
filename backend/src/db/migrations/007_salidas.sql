-- Tabla de salidas de empleados
CREATE TABLE IF NOT EXISTS salidas (
  id                 SERIAL PRIMARY KEY,
  empleado_id        INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  empresa_id         INTEGER,
  fecha_salida       DATE NOT NULL,
  tipo_salida        VARCHAR(50) NOT NULL
                     CHECK (tipo_salida IN ('renuncia', 'despido', 'jubilacion', 'otro')),
  razon_salida       TEXT NOT NULL,
  salario_pendiente  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estado             VARCHAR(50) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'en_proceso', 'completado')),
  documentos_firmados BOOLEAN NOT NULL DEFAULT false,
  created_by         INTEGER REFERENCES usuarios(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar queries
CREATE INDEX idx_salidas_empleado_id ON salidas(empleado_id);
CREATE INDEX idx_salidas_empresa_id ON salidas(empresa_id);
CREATE INDEX idx_salidas_estado ON salidas(estado);
