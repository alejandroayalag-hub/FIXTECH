-- Tabla de documentos de salida
CREATE TABLE IF NOT EXISTS documentos_salida (
  id                    SERIAL PRIMARY KEY,
  salida_id             INTEGER NOT NULL REFERENCES salidas(id) ON DELETE CASCADE,
  tipo_documento        VARCHAR(50) NOT NULL
                        CHECK (tipo_documento IN ('finiquito', 'renuncia', 'entrega_materiales', 'encuesta_salida')),

  -- Template generado
  template_contenido    TEXT,
  template_fecha_generacion TIMESTAMPTZ,
  template_url          VARCHAR(500),

  -- Documento escaneado
  documento_url         VARCHAR(500),
  documento_nombre      VARCHAR(255),
  documento_fecha_carga TIMESTAMPTZ,
  documento_tamano      INTEGER,
  documento_tiene_huella BOOLEAN,
  documento_tiene_firma BOOLEAN,

  estado                VARCHAR(50) NOT NULL DEFAULT 'template_generado'
                        CHECK (estado IN ('template_generado', 'completado')),

  created_by            INTEGER REFERENCES usuarios(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar queries
CREATE INDEX idx_documentos_salida_salida_id ON documentos_salida(salida_id);
CREATE INDEX idx_documentos_salida_tipo ON documentos_salida(tipo_documento);
CREATE INDEX idx_documentos_salida_estado ON documentos_salida(estado);
