-- App Checador Móvil: PIN, horario y datos de checadas desde la app
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS pin_hash     TEXT,
  ADD COLUMN IF NOT EXISTS hora_entrada TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS hora_salida  TIME NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS dias         SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}';

ALTER TABLE checadas
  ADD COLUMN IF NOT EXISTS origen                VARCHAR(10) NOT NULL DEFAULT 'reloj',
  ADD COLUMN IF NOT EXISTS lat                   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng                   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS precision_m           REAL,
  ADD COLUMN IF NOT EXISTS timestamp_dispositivo TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_id             UUID,
  ADD COLUMN IF NOT EXISTS hora_dudosa           BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checadas_origen_check') THEN
    ALTER TABLE checadas ADD CONSTRAINT checadas_origen_check CHECK (origen IN ('reloj','app'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_checadas_client_id ON checadas(client_id);

-- Las checadas de la app no tienen dispositivo ni uid
ALTER TABLE checadas ALTER COLUMN dispositivo_id DROP NOT NULL;
ALTER TABLE checadas ALTER COLUMN uid_checador DROP NOT NULL;

CREATE TABLE IF NOT EXISTS avisos_gerencia (
  id             SERIAL PRIMARY KEY,
  titulo         VARCHAR(150) NOT NULL,
  mensaje        TEXT NOT NULL,
  vigente_desde  DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta  DATE,
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_by     INTEGER REFERENCES usuarios(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
