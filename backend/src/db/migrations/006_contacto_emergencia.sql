ALTER TABLE empleados ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono VARCHAR(20);
