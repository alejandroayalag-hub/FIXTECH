-- Add estado field to empleados table
-- estado: 'activo' | 'inactivo', default 'activo'
-- This is a new field separate from the existing estatus field
ALTER TABLE empleados
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo'
  CHECK (estado IN ('activo', 'inactivo'));

-- Create index for faster queries by estado
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado);
