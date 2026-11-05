-- Número de empleado visible (login de la app). Existentes: orden de llegada
-- (fecha_ingreso, luego id). Nuevos: siguiente número de la secuencia.
-- Una vez asignado no cambia (es su usuario en la app).
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS numero_empleado INTEGER;

UPDATE empleados e SET numero_empleado = n.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY fecha_ingreso, id) AS rn FROM empleados) n
WHERE e.id = n.id AND e.numero_empleado IS NULL;

CREATE SEQUENCE IF NOT EXISTS empleados_numero_empleado_seq OWNED BY empleados.numero_empleado;
SELECT setval('empleados_numero_empleado_seq', COALESCE((SELECT MAX(numero_empleado) FROM empleados), 0) + 1, false);
ALTER TABLE empleados ALTER COLUMN numero_empleado SET DEFAULT nextval('empleados_numero_empleado_seq');
ALTER TABLE empleados ALTER COLUMN numero_empleado SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_numero_empleado ON empleados(numero_empleado);
