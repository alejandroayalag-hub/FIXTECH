-- Agregar columna para ruta del PDF de formato por tipo de documento
ALTER TABLE tipos_documento ADD COLUMN IF NOT EXISTS formato_ruta TEXT;
