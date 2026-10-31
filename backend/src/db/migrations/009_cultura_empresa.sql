-- Tabla de cultura empresarial (misión, visión, valores, etc.)
CREATE TABLE IF NOT EXISTS cultura_empresa (
  id                    SERIAL PRIMARY KEY,
  empresa_id            INTEGER NOT NULL,
  tipo                  VARCHAR(50) NOT NULL
                        CHECK (tipo IN ('mision', 'vision', 'valores', 'codigo_conducta', 'politicas', 'otro')),
  titulo                VARCHAR(255) NOT NULL,
  descripcion           TEXT DEFAULT '',

  -- Archivos relacionados
  archivos              JSONB DEFAULT '[]',

  orden                 INTEGER DEFAULT 0,
  activo                BOOLEAN DEFAULT TRUE,

  created_by            INTEGER REFERENCES usuarios(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint único: una empresa no puede tener dos elementos del mismo tipo
  CONSTRAINT uk_cultura_empresa_tipo UNIQUE (empresa_id, tipo)
);

-- Índices para optimizar queries
CREATE INDEX idx_cultura_empresa_empresa_id ON cultura_empresa(empresa_id);
CREATE INDEX idx_cultura_empresa_tipo ON cultura_empresa(tipo);
CREATE INDEX idx_cultura_empresa_activo ON cultura_empresa(activo);
CREATE INDEX idx_cultura_empresa_empresa_activo ON cultura_empresa(empresa_id, activo);
