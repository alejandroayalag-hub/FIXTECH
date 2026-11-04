-- App Checador Móvil (ajustes)

-- Fecha de generación del PIN: inicio de registro del empleado en el reporte de asistencia y versión
-- del PIN (pv) en el token de la app; regenerar el PIN invalida las sesiones anteriores.
-- Los PIN ya existentes quedan en NULL (tokens legados siguen válidos; sin restricción en el reporte).
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS pin_generado_en TIMESTAMPTZ;

-- Alta del empleado en el reloj: inicio de registro en el reporte de asistencia.
-- Los mapeos previos no tienen fecha real; se usa el alta del empleado en el sistema (una checada
-- del reloj nunca puede ser anterior), así el reporte no restringe más que antes.
ALTER TABLE checador_empleados
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE checador_empleados ce
   SET created_at = e.created_at
  FROM empleados e
 WHERE e.id = ce.empleado_id AND ce.created_at IS NULL;

ALTER TABLE checador_empleados ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE checador_empleados ALTER COLUMN created_at SET NOT NULL;
