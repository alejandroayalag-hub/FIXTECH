CREATE TABLE IF NOT EXISTS semanas_pago (
  id              SERIAL PRIMARY KEY,
  semana          INTEGER NOT NULL,
  anio            INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  filename        VARCHAR(255) NOT NULL,
  ruta            VARCHAR(500) NOT NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(semana, anio)
);

CREATE TABLE IF NOT EXISTS pagos (
  id              SERIAL PRIMARY KEY,
  semana_pago_id  INTEGER NOT NULL REFERENCES semanas_pago(id) ON DELETE CASCADE,
  empleado_id     INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  nombre_pdf      VARCHAR(200) NOT NULL,
  cuenta          VARCHAR(50),
  monto           DECIMAL(12,2),
  autorizado      VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
