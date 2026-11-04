# App Checador Móvil para RH ATA — Diseño

Fecha: 2026-11-04 · Estado: borrador para aprobación

## 1. Intención y por qué

La reforma a la Ley Federal del Trabajo va a exigir un **registro electrónico de entradas y salidas**. Grupo ATA tiene personal remoto que no pasa por un reloj checador físico, y hoy RH ATA no tiene app móvil. ATA será el piloto ("conejillo de prueba") de este registro.

Se construye una app Android que el trabajador instala en **su propio celular**. Con ella inicia y termina su jornada confirmando con la **huella del teléfono**, y la checada queda registrada con **hora y ubicación GPS** en la plataforma RH ATA. Ahí RH obtiene un reporte por periodo con **días trabajados, retardos y faltas** y lo descarga en Excel para pasarlo a nómina (NOMIPAQ).

BioChek (el otro proyecto, con reconocimiento facial) **no se usa aquí**. Cuando BioChek tenga clientes, cada cliente tendrá su propia plataforma; ATA vive en RH ATA.

## 2. Experiencia del trabajador (el día típico)

1. **Primera vez:** instala la app y entra con su **número de empleado + PIN** que le da RH. La sesión queda abierta; no vuelve a teclear nada.
2. **8:55:** notificación local: "Tu entrada es a las 9:00, no olvides checar."
3. **9:00:** pica **"Iniciar jornada"** → diálogo del sistema pidiendo **huella** → OK → la app toma la ubicación GPS y registra la entrada.
4. Pantalla de bienvenida: **"¡Buenos días, [nombre]!"** + una **frase motivadora** al azar + los **avisos de gerencia** vigentes (si hay).
5. **16:55:** notificación: "Tu salida es a las 17:00, no olvides checar."
6. **17:00:** pica **"Terminar jornada"** → huella → OK → GPS → registra la salida.
7. Pantalla: **"¡Buen descanso, [nombre]!"**

El botón alterna entre "Iniciar jornada" y "Terminar jornada" según la última checada del día.

## 3. Metas

- Registro de entrada/salida desde el celular con huella + GPS + hora, guardado en RH ATA.
- Avisos 5 minutos antes de la hora de entrada y de salida (notificaciones locales, funcionan sin internet).
- Saludo + frase motivadora al checar.
- Avisos de gerencia: RH los publica en el panel, el trabajador los ve al iniciar jornada.
- Reporte por periodo para nómina (días trabajados, retardos, faltas) con descarga Excel.
- Las checadas del reloj físico existente también cuentan en el reporte.

## 4. No-metas (por ahora)

- iOS (solo Android en el piloto).
- Festivos, vacaciones, incapacidades, permisos, horas extra: el reporte no los conoce; RH los corrige en su Excel.
- Geocerca / bloquear la checada por ubicación. El GPS **solo se registra**.
- Push desde el servidor. Los avisos de gerencia se consultan cuando la app los pide.
- Formato exacto de NOMIPAQ. Va columna genérica hasta recibir la hoja real (ver §9).
- Biometría propia (rostro/huella guardada en servidor). No se guarda ningún dato biométrico.

## 5. Anti-metas (sería un fracaso aunque "funcione")

- Que el trabajador no pueda checar por un problema de red, de GPS lento o de notificaciones. Checar **nunca** se bloquea por esas cosas; se guarda y se envía después.
- Que un token de trabajador sirva para entrar a las rutas del panel de RH (ver §7.4).
- Que las checadas del reloj físico dejen de funcionar o se rompa la pestaña Asistencia actual.
- Que PIN y ubicación viajen sin cifrar (HTTP plano).

## 6. Restricciones

- Se construye **dentro de RH ATA** (repo `~/rhata`): backend Express 5 + `pg` (CommonJS, sin ORM), frontend React 19 + Vite, Postgres. Servidor Hetzner 62.238.3.136, PM2 `rhata-backend` puerto 3001, deploy con `~/rhata/deploy.sh` (nunca rsync sin excluir `uploads/`).
- Migraciones nuevas siguen la numeración existente (`013_...`).
- La app móvil es Expo (mismo stack que BioChek: `expo-secure-store`, `expo-location`, `expo-notifications`, `@react-navigation/native-stack`), con build por EAS en la cuenta `alxpho`. Huella con `expo-local-authentication`.
- La huella es la del sistema operativo: solo responde "sí/no". Confirma que alguien con huella registrada en ese teléfono la puso. Es aceptable porque el celular es del trabajador.
- **Turnos:** el usuario confirmó que en ATA todos entran de 9:00 a 17:00, lunes a viernes. No hay turnos nocturnos ni rotativos en el alcance; si aparecen, el modelo de horario y el reporte se rediseñan.
- Hora de México (`America/Mexico_City`) para todo cálculo de día, retardo y falta. Ojo con comparar `TIMESTAMPTZ` contra fechas planas: en BioChek ya mordió este bug (rangos por día deben usar límites de día de México, intervalo semiabierto).

## 7. Lo decidido sobre el cómo

### 7.0 HTTPS (paso previo, decidido por el usuario)
- RH ATA se publica en **`https://rh.serviciosata.com`** (panel y API). La app usa esa URL, fija en el build de EAS. Android bloquea HTTP plano, y además PIN, token y ubicación no deben viajar en claro.
- Pasos: registro A `rh` → `62.238.3.136` en el DNS de serviciosata.com (Enom, vía admin.google.com → Dominios; lo hace el usuario) → `server_name rh.serviciosata.com` en el nginx de RH ATA → `certbot --nginx`. Se mantiene el acceso actual por IP hasta que el panel se haya probado por el dominio.
- Va primero en el plan: sin esto no hay APK utilizable.

### 7.1 Ubicación del código
- App: carpeta nueva `~/rhata/mobile/` (mismo repo).
- Backend y panel: dentro de `backend/` y `frontend/` existentes.

### 7.2 Datos (migración nueva)
- `empleados`: agregar `pin_hash` (bcrypt), `hora_entrada TIME DEFAULT '09:00'`, `hora_salida TIME DEFAULT '17:00'`, `dias SMALLINT[] DEFAULT '{1,2,3,4,5}'` (ISO, 1 = lunes). Todos los empleados quedan 9–17 L–V sin capturar nada.
- `checadas`: se reusa la misma tabla para que todo se vea en un solo lugar.
  - Agregar `origen` (`'reloj'` | `'app'`, default `'reloj'`), `lat`, `lng`, `precision_m`, `timestamp_dispositivo`, `client_id UUID`, `hora_dudosa BOOLEAN DEFAULT false`.
  - Hoy `dispositivo_id` y `uid_checador` son `NOT NULL` y la unicidad es `(dispositivo_id, uid_checador, timestamp)`. Para checadas de app se quitan esos `NOT NULL` y se agrega un índice único sobre `client_id` (nulo para el reloj) que evite duplicados por reintentos.
  - Las consultas existentes que hacen `JOIN checador_dispositivos` deben pasar a `LEFT JOIN` para no esconder las checadas de app.
- `avisos_gerencia`: `id, titulo, mensaje, vigente_desde DATE, vigente_hasta DATE, activo, created_by → usuarios, created_at`. Aplican a todos los empleados.

### 7.3 Identificador de empleado para login
"Número de empleado" = `empleados.id`: la base no tiene un número de nómina propio (verificado en migraciones). RH le da al trabajador su número junto con el PIN. *(Decisión del diseñador.)* El PIN es de 6 dígitos, lo genera RH desde la ficha del empleado ("Generar PIN"), se muestra una sola vez y se guarda solo el hash.

### 7.4 Autenticación
- `POST /api/movil/login` con `{ empleado, pin }` → JWT con `{ empleado_id, role: 'empleado' }`, larga duración (30 días).
- Límite de intentos en el login móvil (el login de panel ya tiene limitador; aplicar lo mismo).
- El middleware `auth` actual acepta **cualquier** JWT válido. Se debe impedir que un token `role: 'empleado'` entre a rutas del panel, y que un token de panel entre a `/api/movil/*`. Es requisito, no opcional.
- "Activo" = `estado = 'activo'` **y** `estatus = 'activo'` (la tabla tiene ambas columnas: `estatus` de la 001 con baja, `estado` de la 010 que usa el filtro del panel). Empleado no activo no puede iniciar sesión, checar ni aparecer en el reporte. *(Decisión del diseñador.)*

### 7.5 Endpoints móviles (`/api/movil/*`, solo rol empleado)
- `GET /yo` → nombre, horario (`hora_entrada`, `hora_salida`, `dias`), última checada de hoy.
- `POST /checadas` → `{ tipo: 'entrada'|'salida', timestamp_dispositivo, lat, lng, precision_m }`. Incluye además `client_id` (UUID generado en el teléfono al momento de checar).
  - **Nunca se rechaza** por desfase de hora (a diferencia de BioChek, que responde 422).
  - Si `timestamp_dispositivo` está dentro de las últimas 72 h y no es más de 5 min en el futuro respecto al servidor, `timestamp = timestamp_dispositivo` (cubre envíos diferidos de la cola).
  - Si no, `timestamp` = hora del servidor y la checada se marca `hora_dudosa = true` para que RH la revise (se muestra en Asistencia).
  - Deduplicación por índice único sobre `client_id`: un reintento devuelve 200 con la checada existente. *(Decisión del diseñador.)*
- `GET /avisos` → avisos activos y vigentes hoy.

### 7.6 App
- Pantallas: Login → Inicio (botón grande Iniciar/Terminar jornada, nombre, estado del día) → Confirmación (saludo + frase + avisos).
- Huella vía `expo-local-authentication`. Si el teléfono no tiene huella configurada, se permite el PIN/patrón del teléfono (el mismo diálogo del sistema lo ofrece).
- GPS con `expo-location`, precisión alta, con tiempo límite corto. Si no hay ubicación a tiempo, se checa igual con lat/lng nulos.
- Cola sin conexión: si el envío falla, se guarda la checada local y se reintenta. Se puede tomar como base `offlineQueue.ts` de BioChek.
- Notificaciones: tomar `reminders.ts` de BioChek (commit `06d51cc` en `~/biochek`), que ya programa 10 avisos semanales 5 min antes según el horario y maneja el cruce de medianoche, con su test. Se reprograman cada vez que la app abre y obtiene `/yo`.
- Frases motivadoras: lista fija dentro de la app (unas 30), una al azar por checada; distintas para entrada ("excelente jornada…") y salida ("buen descanso…").

### 7.7 Panel RH ATA
- Ficha del empleado: botón **Generar PIN** y dos campos de hora (entrada/salida).
- Pestaña **Asistencia** existente: muestra también checadas de app, con origen y un enlace a Google Maps cuando hay lat/lng.
- Página nueva **Avisos de gerencia**: alta, edición, activar/desactivar.
- Página nueva **Reporte de asistencia**: rango de fechas → tabla por empleado activo con días trabajados, retardos y faltas → botón **Descargar Excel**.

### 7.8 Reglas del reporte
Incluye solo empleados activos que **registran asistencia**: tienen PIN generado o mapeo en el reloj físico. Así quien no usa ni app ni reloj no sale con faltas todos los días. *(Decisión del diseñador.)*

Por cada empleado y cada día del rango que esté en sus `dias` laborales (y no sea futuro):
- **Día trabajado:** existe al menos una checada de entrada ese día (app o reloj).
- **Retardo:** la primera entrada del día es posterior a `hora_entrada + tolerancia`. Tolerancia = **10 minutos**, constante en un solo lugar.
- **Falta:** no existe ninguna entrada ese día.

Checadas del reloj con `tipo = 'desconocido'`: la primera del día cuenta como entrada.

## 8. Lo que queda a criterio del constructor

- Librería para generar el Excel (preferir una sola dependencia; puede ser en backend o frontend).
- Diseño visual de la app y pantallas del panel, siguiendo el estilo actual de RH ATA.
- Texto exacto de las frases motivadoras.
- Nombre del paquete Android y del proyecto EAS.
- Estructura interna de la app (pocos archivos; no se pidió arquitectura elaborada).
- Las pruebas: una prueba ejecutable por lógica no trivial (cálculo del reporte, reglas de auth por rol, cálculo de avisos).

## 9. Preguntas abiertas

- **Formato NOMIPAQ:** el cliente va a pasar la hoja. Hasta entonces, columnas genéricas (`empleado, nombre, dias_trabajados, retardos, faltas`). Ajustar cuando llegue.
