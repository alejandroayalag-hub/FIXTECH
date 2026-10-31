-- Tipos de documento que puede tener un empleado
CREATE TABLE IF NOT EXISTS tipos_documento (
  id   SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  requerido BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO tipos_documento (nombre, requerido) VALUES
  ('Contrato de trabajo',                                                             true),
  ('Solicitud de empleo con fotografía',                                              true),
  ('Copia de acta de nacimiento',                                                     true),
  ('Copia de identificación',                                                         true),
  ('Copia de comprobante de domicilio (menor a 90 días de la contratación)',          true),
  ('Número de seguridad social',                                                      true),
  ('Constancia de RFC reciente',                                                      true),
  ('Certificado médico (sin enfermedad contagiosa ni padecimientos de columna)',      true),
  ('Comprobante de estudios',                                                         false),
  ('Tarjeta de nómina BBVA',                                                         true),
  ('Convenio de horario',                                                             true),
  ('Convenio de pago electrónico',                                                    true),
  ('Resguardos por parte de la empresa',                                              false),
  ('Aviso de privacidad',                                                             true),
  ('Adhesión al sindicato',                                                           true),
  ('Reglamento interior',                                                             true),
  ('Aviso de crédito al Infonavit',                                                  false)
ON CONFLICT DO NOTHING;

-- Empleados
CREATE TABLE IF NOT EXISTS empleados (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(100) NOT NULL,
  apellido_paterno   VARCHAR(100) NOT NULL,
  apellido_materno   VARCHAR(100),
  curp               CHAR(18) UNIQUE,
  rfc                VARCHAR(13) UNIQUE,
  fecha_nacimiento   DATE,
  fecha_ingreso      DATE NOT NULL DEFAULT CURRENT_DATE,
  puesto             VARCHAR(100),
  departamento       VARCHAR(100),
  telefono           VARCHAR(20),
  email              VARCHAR(150),
  direccion          TEXT,
  nombre_beneficiario VARCHAR(200),
  foto               VARCHAR(500),
  observaciones      TEXT,
  estatus            VARCHAR(20) NOT NULL DEFAULT 'activo'
                     CHECK (estatus IN ('activo','inactivo','baja')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documentos por empleado (un tipo por empleado)
CREATE TABLE IF NOT EXISTS documentos (
  id                SERIAL PRIMARY KEY,
  empleado_id       INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_documento_id INTEGER NOT NULL REFERENCES tipos_documento(id),
  filename          VARCHAR(255) NOT NULL,
  ruta              VARCHAR(500) NOT NULL,
  estatus           VARCHAR(20) NOT NULL DEFAULT 'completo'
                    CHECK (estatus IN ('completo','pendiente','vencido')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empleado_id, tipo_documento_id)
);
