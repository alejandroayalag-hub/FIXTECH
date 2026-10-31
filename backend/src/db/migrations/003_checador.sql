-- Dispositivos checadores registrados
CREATE TABLE IF NOT EXISTS checador_dispositivos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  ubicacion   VARCHAR(150),
  ip          VARCHAR(45),
  api_key     VARCHAR(64) NOT NULL UNIQUE,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mapeo: número de empleado en el checador → empleado en el sistema
CREATE TABLE IF NOT EXISTS checador_empleados (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  dispositivo_id   INTEGER NOT NULL REFERENCES checador_dispositivos(id) ON DELETE CASCADE,
  uid_checador     INTEGER NOT NULL,
  UNIQUE (dispositivo_id, uid_checador)
);

-- Registros de checadas
CREATE TABLE IF NOT EXISTS checadas (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  dispositivo_id   INTEGER NOT NULL REFERENCES checador_dispositivos(id),
  timestamp        TIMESTAMPTZ NOT NULL,
  tipo             VARCHAR(10) NOT NULL DEFAULT 'entrada'
                   CHECK (tipo IN ('entrada','salida','desconocido')),
  uid_checador     INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dispositivo_id, uid_checador, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_checadas_empleado ON checadas(empleado_id);
CREATE INDEX IF NOT EXISTS idx_checadas_timestamp ON checadas(timestamp);
