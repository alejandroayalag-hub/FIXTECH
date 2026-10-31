-- Amplía tipo_documento para incluir aviso rescisorio (despido) y baja del IMSS
ALTER TABLE documentos_salida DROP CONSTRAINT IF EXISTS documentos_salida_tipo_documento_check;
ALTER TABLE documentos_salida
  ADD CONSTRAINT documentos_salida_tipo_documento_check
  CHECK (tipo_documento IN ('finiquito', 'renuncia', 'aviso_rescisorio', 'entrega_materiales', 'baja_imss', 'encuesta_salida'));
