# App Checador Móvil (RH ATA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trabajadores de ATA checan entrada/salida desde su celular (huella + GPS) contra RH ATA, y RH obtiene un reporte de días trabajados/retardos/faltas en Excel.

**Architecture:** Backend RH ATA (Express 5 CommonJS + `pg`) gana un namespace `/api/movil/*` con JWT de rol `empleado` separado del JWT de panel; las checadas de app van a la tabla `checadas` existente con `origen='app'`. Panel React gana PIN/horario, avisos de gerencia y reporte. App Expo nueva en `~/rhata/mobile/` reusa `reminders.ts` y `offlineQueue.ts` de BioChek.

**Tech Stack:** Node 22, Express 5, pg, jest+supertest (tests con `pool` mockeado, patrón existente), `exceljs` (nueva), React 19 + Vite, Expo SDK 57 + `expo-local-authentication`, `expo-location`, `expo-notifications`, `expo-secure-store`, EAS (cuenta `alxpho`).

**Spec:** `docs/superpowers/specs/2026-11-04-app-checador-movil-design.md`

## Global Constraints

- API pública: `https://rh.serviciosata.com`; la app compila con `EXPO_PUBLIC_API_BASE_URL=https://rh.serviciosata.com`. Acceso por IP `http://62.238.3.136` se mantiene.
- Horario por defecto: `hora_entrada '09:00'`, `hora_salida '17:00'`, `dias '{1,2,3,4,5}'` (ISO, 1 = lunes).
- Zona horaria de todo cálculo de día/hora: `America/Mexico_City`.
- Tolerancia de retardo: **10 minutos**, constante única `TOLERANCIA_RETARDO_MIN`.
- Activo = `estado = 'activo' AND estatus = 'activo'`.
- PIN: 6 dígitos, bcrypt, se muestra una sola vez.
- JWT de empleado: `{ empleado_id, role: 'empleado' }`, `expiresIn: '30d'`. JWT de panel nunca entra a `/api/movil/*`; JWT de empleado nunca entra a rutas de panel.
- Checar nunca se bloquea por red, GPS o notificaciones; el servidor nunca rechaza por desfase de hora.
- Migraciones corren solas al arrancar (`src/db/migrate.js`); nueva = `013_checador_movil.sql`.
- Deploy solo con `~/rhata/deploy.sh` desde árbol limpio (nunca rsync suelto, nunca sin excluir `uploads/`).
- Baseline backend: `cd backend && npx jest` → 183 passing. Ningún task lo baja.
- Textos al usuario en español.

## Review Focus

1. **Token de empleado contra rutas de panel** (p.ej. `GET /api/empleados` con JWT `role:'empleado'`) → 401. Test en Task 1.
2. **Reintento de la misma checada** (mismo `client_id` dos veces, cola sin conexión) → una sola fila, segunda respuesta 200 con la existente. Test en Task 3.
3. **Checada enviada horas después desde la cola** (`timestamp_dispositivo` de ayer 08:58) → se guarda con la hora del dispositivo y cuenta en el día correcto del reporte; una con hora absurda (año 2020 o +1 h en el futuro) se guarda con hora del servidor y `hora_dudosa=true`. Tests en Task 3.
4. **Entrada a las 18:30 UTC-6 vs día UTC** (checada 2026-11-03 19:00 México = 2026-11-04 01:00 UTC) → cuenta para el 3 de noviembre. Test en Task 5.
5. **GPS sin respuesta o permiso negado** → la checada se envía con `lat/lng/precision_m = null` y se acepta (backend 201). Tests en Task 3 (backend) y Task 8 (app).

---

### Task 0: HTTPS en rh.serviciosata.com (operación, la ejecuta el controller con el usuario)

**Files:** ninguno en repo (nginx del servidor).

- [ ] **Step 1:** Usuario crea registro A `rh` → `62.238.3.136` en DNS de serviciosata.com (Enom vía admin.google.com → Dominios). Verificar: `dig +short rh.serviciosata.com` → `62.238.3.136`.
- [ ] **Step 2:** En el servidor, localizar el server block de RH ATA (`grep -l rhata /etc/nginx/sites-enabled/*`), agregar `rh.serviciosata.com` a `server_name` sin quitar el acceso por IP; `nginx -t && systemctl reload nginx`.
- [ ] **Step 3:** `certbot --nginx -d rh.serviciosata.com` (sin forzar redirect del bloque por IP). Verificar: `curl -s https://rh.serviciosata.com/api/health` → `{"ok":true}` y `curl -s http://62.238.3.136/api/health` → `{"ok":true}`.

---

### Task 1: Migración 013 + separación de roles de JWT

**Files:**
- Create: `backend/src/db/migrations/013_checador_movil.sql`
- Modify: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/authEmpleado.js`
- Modify: `backend/src/models/checada.js` (`findByEmpleado`)
- Test: `backend/tests/middleware/roles.test.js`, `backend/tests/models/checada.test.js`

**Interfaces:**
- Produces: `authEmpleado` middleware (CommonJS default export) que deja `req.empleado = { id }`; `auth` (panel) ahora rechaza `role === 'empleado'`.
- Produces (schema): `empleados.pin_hash TEXT`, `hora_entrada TIME NOT NULL DEFAULT '09:00'`, `hora_salida TIME NOT NULL DEFAULT '17:00'`, `dias SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}'`; `checadas.origen VARCHAR(10) NOT NULL DEFAULT 'reloj' CHECK (origen IN ('reloj','app'))`, `lat DOUBLE PRECISION`, `lng DOUBLE PRECISION`, `precision_m REAL`, `timestamp_dispositivo TIMESTAMPTZ`, `client_id UUID UNIQUE`, `hora_dudosa BOOLEAN NOT NULL DEFAULT false`; `checadas.dispositivo_id` y `uid_checador` pasan a NULL-able (la UNIQUE existente sigue válida para reloj); tabla `avisos_gerencia (id SERIAL PK, titulo VARCHAR(150) NOT NULL, mensaje TEXT NOT NULL, vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE, vigente_hasta DATE, activo BOOLEAN NOT NULL DEFAULT true, created_by INTEGER REFERENCES usuarios(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.

- [ ] **Step 1: Tests que fallan** en `tests/middleware/roles.test.js`:

```js
test('panel auth rechaza token de empleado', async () => {
  // app con GET /x protegido por auth
  const t = jwt.sign({ empleado_id: 7, role: 'empleado' }, process.env.JWT_SECRET);
  expect((await request(app).get('/x').set('Authorization', `Bearer ${t}`)).status).toBe(401);
});
test('panel auth acepta admin y rh', /* role 'admin' y 'rh' → 200 */);
test('authEmpleado rechaza token de panel', /* {id:1, role:'admin'} → 401 */);
test('authEmpleado acepta empleado y expone req.empleado.id', /* responde req.empleado → {id:7} */);
test('authEmpleado sin header → 401');
```

y en `tests/models/checada.test.js`: `findByEmpleado` usa `LEFT JOIN checador_dispositivos` (asertar sobre el SQL pasado al `pool.query` mockeado) y selecciona `c.origen, c.lat, c.lng, c.hora_dudosa`.

- [ ] **Step 2:** `cd backend && npx jest tests/middleware tests/models/checada.test.js` → FAIL.
- [ ] **Step 3:** Escribir la migración (idempotente con `IF NOT EXISTS` como las demás), los dos middlewares y el `LEFT JOIN`.
- [ ] **Step 4:** `npx jest` → todo verde (183 + nuevos).
- [ ] **Step 5:** Commit `feat(checador-movil): migración 013 y separación de roles JWT`.

---

### Task 2: Login móvil + generar PIN

**Files:**
- Create: `backend/src/routes/movil.js`, `backend/src/controllers/movilController.js`
- Modify: `backend/src/routes/empleados.js`, `backend/src/controllers/empleadosController.js` (o el que atiende `/api/empleados`), `backend/src/index.js`
- Test: `backend/tests/controllers/movil.login.test.js`, `backend/tests/controllers/empleados.pin.test.js`

**Interfaces:**
- Consumes: `authEmpleado` (Task 1).
- Produces: `POST /api/movil/login` body `{ empleado: number|string, pin: string }` → `200 { token, nombre }` | `400` faltan datos | `401 { error: 'Credenciales incorrectas' }` | `403 { error: 'Empleado inactivo' }`. `POST /api/empleados/:id/pin` (panel) → `200 { pin }` (6 dígitos, `crypto.randomInt(0, 1e6)` con padStart). En `index.js`: `app.use('/api/movil', movilLimiter, require('./routes/movil'))` donde `movilLimiter` limita solo `/login` (20 por 15 min, igual que panel); el resto de `routes/movil.js` usa `authEmpleado`.

- [ ] **Step 1: Tests que fallan** (pool mockeado):
  - login sin `pin` → 400.
  - empleado inexistente → 401; `pin_hash` null → 401; PIN incorrecto → 401.
  - empleado con `estatus='baja'` o `estado='inactivo'` y PIN correcto → 403.
  - correcto → 200, `jwt.verify(token).role === 'empleado'`, `empleado_id` correcto, `nombre` = `nombre + ' ' + apellido_paterno`.
  - `POST /api/empleados/:id/pin` → 200 con `pin` que cumple `/^\d{6}$/` y el `UPDATE` recibió un hash bcrypt (`/^\$2[aby]\$/`), nunca el PIN plano; id inexistente → 404.
- [ ] **Step 2:** `npx jest tests/controllers/movil.login.test.js tests/controllers/empleados.pin.test.js` → FAIL.
- [ ] **Step 3:** Implementar. Asegurar que `GET /api/empleados` y `GET /api/empleados/:id` **no** devuelven `pin_hash` (agregar test de eso al mismo archivo).
- [ ] **Step 4:** `npx jest` → verde.
- [ ] **Step 5:** Commit `feat(checador-movil): login móvil con PIN y generación de PIN en panel`.

---

### Task 3: Endpoints móviles `/yo`, `/checadas`, `/avisos`

**Files:**
- Create: `backend/src/utils/horaMexico.js`, `backend/src/utils/resolverTimestamp.js`
- Modify: `backend/src/routes/movil.js`, `backend/src/controllers/movilController.js`
- Test: `backend/tests/utils/resolverTimestamp.test.js`, `backend/tests/controllers/movil.checadas.test.js`

**Interfaces:**
- Produces: `horaMexico.js` → `fechaMx(date: Date): 'YYYY-MM-DD'`, `horaMx(date: Date): 'HH:MM'`, `diaIsoMx(date: Date): 1..7` (vía `Intl.DateTimeFormat` con `timeZone: 'America/Mexico_City'`). Reusado por Task 5.
- Produces: `resolverTimestamp(dispositivoIso: string|undefined, ahora: Date): { timestamp: Date, hora_dudosa: boolean }` — usa la del dispositivo si es fecha válida, `>= ahora - 72h` y `<= ahora + 5min`; si no, `ahora` con `hora_dudosa: true`.
- Produces: `GET /api/movil/yo` → `{ id, nombre, hora_entrada:'HH:MM', hora_salida:'HH:MM', dias:number[], ultima_hoy: { tipo, timestamp } | null }` (última checada de hoy en día México). `POST /api/movil/checadas` body `{ client_id: uuid, tipo:'entrada'|'salida', timestamp_dispositivo, lat?, lng?, precision_m? }` → `201` checada nueva | `200` existente (mismo `client_id`, vía `ON CONFLICT (client_id) DO NOTHING` + SELECT) | `400` tipo inválido o `client_id` no UUID | `403` empleado no activo. Inserta `origen='app'`. `GET /api/movil/avisos` → avisos con `activo AND vigente_desde <= hoyMx AND (vigente_hasta IS NULL OR vigente_hasta >= hoyMx)`, orden `created_at DESC`.

- [ ] **Step 1: Tests que fallan**
  - `resolverTimestamp`: dentro de rango → la del dispositivo, `false`; ayer 08:58 → la del dispositivo; `'2020-01-01T00:00:00Z'` → `ahora`, `true`; `ahora + 1h` → `ahora`, `true`; `undefined`/`'basura'` → `ahora`, `true`.
  - `fechaMx(new Date('2026-11-04T01:00:00Z')) === '2026-11-03'`; `horaMx(...)==='19:00'`; `diaIsoMx` de ese instante `=== 2` (martes).
  - checadas: 201 con `origen='app'` en el INSERT; segundo POST mismo `client_id` → 200 y una sola inserción efectiva; `lat/lng/precision_m` ausentes → 201 con nulls; `tipo:'comida'` → 400; token de panel → 401.
  - `/yo` devuelve horario formateado `HH:MM` y `ultima_hoy`.
- [ ] **Step 2:** `npx jest tests/utils tests/controllers/movil.checadas.test.js` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest` → verde.
- [ ] **Step 5:** Commit `feat(checador-movil): endpoints de checada, perfil y avisos para la app`.

---

### Task 4: Avisos de gerencia (CRUD panel)

**Files:**
- Create: `backend/src/routes/avisos.js`, `backend/src/controllers/avisosController.js`
- Modify: `backend/src/index.js` (`app.use('/api/avisos', authMiddleware, require('./routes/avisos'))`)
- Test: `backend/tests/controllers/avisos.test.js`

**Interfaces:**
- Produces: `GET /api/avisos` (todos, `created_at DESC`), `POST /api/avisos` `{ titulo, mensaje, vigente_desde?, vigente_hasta? }` → 201 (`created_by = req.user.id`), `PUT /api/avisos/:id` (mismos campos + `activo`) → 200 | 404, `DELETE /api/avisos/:id` → 204 | 404.

- [ ] **Step 1: Tests que fallan:** POST sin `titulo` o sin `mensaje` → 400; `vigente_hasta < vigente_desde` → 400; POST válido → 201 y `created_by` del token; PUT inexistente → 404; token de empleado → 401.
- [ ] **Step 2:** `npx jest tests/controllers/avisos.test.js` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest` → verde.
- [ ] **Step 5:** Commit `feat(checador-movil): CRUD de avisos de gerencia`.

---

### Task 5: Reporte de asistencia + Excel

**Files:**
- Create: `backend/src/utils/calcularAsistencia.js`, `backend/src/routes/reportes.js`, `backend/src/controllers/reportesController.js`
- Modify: `backend/src/index.js` (`app.use('/api/reportes', authMiddleware, require('./routes/reportes'))`), `backend/package.json` (+`exceljs`)
- Test: `backend/tests/utils/calcularAsistencia.test.js`, `backend/tests/controllers/reportes.test.js`

**Interfaces:**
- Consumes: `fechaMx`, `horaMx`, `diaIsoMx` (Task 3).
- Produces: `TOLERANCIA_RETARDO_MIN = 10` (exportada). `calcularAsistencia({ empleados, checadas, desde, hasta, hoy }) → Array<{ empleado_id, nombre, dias_trabajados, retardos, faltas }>` — `empleados: [{id, nombre, hora_entrada:'HH:MM', dias:number[]}]`, `checadas: [{empleado_id, timestamp: Date, tipo}]`, fechas `'YYYY-MM-DD'`; recorre días de `desde` a `min(hasta, hoy)`; solo días cuyo ISO esté en `dias`; primera checada del día con `tipo IN ('entrada','desconocido')` = entrada; retardo si `horaMx(entrada) > hora_entrada + 10 min`; falta si no hay entrada. Días se agrupan con `fechaMx`.
- Produces: `GET /api/reportes/asistencia?desde&hasta` → JSON de arriba; `GET /api/reportes/asistencia.xlsx?desde&hasta` → xlsx, columnas `empleado, nombre, dias_trabajados, retardos, faltas`, `Content-Disposition: attachment; filename="asistencia_<desde>_<hasta>.xlsx"`. Empleados incluidos: activos (constraint global) **y** (`pin_hash IS NOT NULL` o existe en `checador_empleados`). Checadas consultadas con límites de día México semiabiertos: `timestamp >= (desde::date AT TIME ZONE 'America/Mexico_City') AND timestamp < ((hasta::date + 1) AT TIME ZONE 'America/Mexico_City')`.

- [ ] **Step 1: Tests que fallan** (`calcularAsistencia`, horario 09:00 L–V, `hoy='2026-11-30'`):
  - entrada lunes 2026-11-02 09:10 México → trabajado, sin retardo.
  - entrada 09:11 → retardo 1.
  - semana 2–6 nov con entradas lun–jue → `dias_trabajados 4, faltas 1`; sábado/domingo no cuentan.
  - checada `2026-11-04T01:00:00Z` (= martes 3 nov 19:00 México) cuenta para el 3, no para el 4.
  - `tipo:'desconocido'` del reloj a las 08:50 cuenta como entrada.
  - salida sin entrada ese día → falta.
  - `hasta` futuro (`hoy='2026-11-04'`, rango 2–6) → no cuenta 5 y 6 como faltas.
  - Endpoint: `desde > hasta` o fechas mal formadas → 400; `.xlsx` responde con content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- [ ] **Step 2:** `npx jest tests/utils/calcularAsistencia.test.js tests/controllers/reportes.test.js` → FAIL.
- [ ] **Step 3:** `npm i exceljs` e implementar.
- [ ] **Step 4:** `npx jest` → verde.
- [ ] **Step 5:** Commit `feat(checador-movil): reporte de asistencia con descarga Excel`.

---

### Task 6: Panel — ficha del empleado y Asistencia

**Files:**
- Modify: `frontend/src/pages/EmpleadoDetallePage.jsx` (botón Generar PIN), `frontend/src/pages/EmpleadoFormPage.jsx` (campos `hora_entrada`/`hora_salida`, `<input type="time">`), `frontend/src/components/TabAsistencia.jsx`, `frontend/src/api/empleados.js`
- Modify (backend, si el update de empleado usa lista blanca de campos): permitir `hora_entrada`, `hora_salida` en el modelo `empleado.js` + test en `tests/models/empleado.test.js`.

**Interfaces:**
- Consumes: `POST /api/empleados/:id/pin` (Task 2), columnas de Task 1.
- Produces: `generarPin(id) → Promise<{pin}>` en `api/empleados.js`.

- [ ] **Step 1:** Test backend (si aplica): update con `hora_entrada:'08:30'` lo incluye en el UPDATE.
- [ ] **Step 2:** Implementar UI: "Generar PIN" con `confirm` previo; el PIN se muestra en un aviso "anótalo, no se vuelve a mostrar" junto al número de empleado (`id`). En Asistencia: columna Origen (Reloj/App), enlace "Ver mapa" a `https://maps.google.com/?q=<lat>,<lng>` cuando hay lat/lng, y etiqueta "Hora dudosa" cuando `hora_dudosa`.
- [ ] **Step 3:** `cd frontend && npm run build` → sin errores; `cd backend && npx jest` → verde.
- [ ] **Step 4:** QA en navegador (dev server + backend local): generar PIN, cambiar horario, ver checada de app en Asistencia.
- [ ] **Step 5:** Commit `feat(checador-movil): PIN, horario y checadas de app en la ficha`.

---

### Task 7: Panel — Avisos de gerencia y Reporte de asistencia

**Files:**
- Create: `frontend/src/pages/AvisosPage.jsx`, `frontend/src/pages/ReporteAsistenciaPage.jsx`, `frontend/src/api/avisos.js`, `frontend/src/api/reportes.js`
- Modify: `frontend/src/App.jsx` (rutas `/avisos`, `/reportes/asistencia` + entradas en la navegación)

**Interfaces:**
- Consumes: endpoints de Task 4 y Task 5.

- [ ] **Step 1:** Avisos: lista + formulario (título, mensaje, vigente desde/hasta) + activar/desactivar + borrar con confirmación.
- [ ] **Step 2:** Reporte: dos `<input type="date">` con default quincena actual (1–15 o 16–fin de mes), botón Consultar → tabla; botón Descargar Excel que baja el blob de `/reportes/asistencia.xlsx` con el token (no `<a href>` plano).
- [ ] **Step 3:** `npm run build` limpio; QA en navegador: crear aviso, consultar reporte, abrir el xlsx descargado.
- [ ] **Step 4:** Commit `feat(checador-movil): páginas de avisos y reporte de asistencia`.

---

### Task 8: App móvil — proyecto y lógica (sin pantallas)

**Files:**
- Create: `mobile/` (Expo SDK 57, TypeScript; `npx create-expo-app mobile --template blank-typescript`), `mobile/app.json`, `mobile/eas.json`
- Create: `mobile/src/api/client.ts`, `mobile/src/session.ts`, `mobile/src/lib/reminders.ts`, `mobile/src/lib/offlineQueue.ts`, `mobile/src/lib/checar.ts`, `mobile/src/lib/frases.ts`
- Test: `mobile/__tests__/reminders.test.ts`, `mobile/__tests__/offlineQueue.test.ts`, `mobile/__tests__/checar.test.ts`, `mobile/__tests__/frases.test.ts`

**Interfaces:**
- Produces:
  - `session.ts`: `saveSession({token, nombre})`, `getSession(): Promise<{token, nombre} | null>`, `clearSession()` (expo-secure-store).
  - `reminders.ts`: copiar de `~/biochek/biochek/mobile/src/lib/reminders.ts` (y su test) cambiando la fuente a `GET /api/movil/yo` y el texto a "…no olvides checar." (sin "en BioChek"). `syncReminders(horario: Horario)` recibe el horario en vez de pedirlo.
  - `offlineQueue.ts`: adaptar de BioChek (`~/biochek/biochek/mobile/src/lib/offlineQueue.ts` + test) al payload `{ client_id, tipo, timestamp_dispositivo, lat, lng, precision_m }` y a `POST /api/movil/checadas`; un 4xx descarta la entrada, red/5xx la conserva.
  - `checar.ts`: `checar(tipo: 'entrada'|'salida'): Promise<{ enviada: boolean }>` — genera `client_id` (`expo-crypto` `randomUUID`), toma `timestamp_dispositivo = new Date().toISOString()`, pide ubicación con `expo-location` (`Accuracy.High`, timeout 8 s; permiso negado o timeout → nulls), intenta POST; si falla por red/5xx encola y devuelve `{enviada:false}`. **No** pide la huella (eso es de la pantalla).
  - `frases.ts`: `FRASES_ENTRADA: string[]` y `FRASES_SALIDA: string[]` (≥15 cada una), `fraseAlAzar(tipo, rnd = Math.random): string`.
  - `eas.json`: perfil `preview` con `distribution: internal`, `android.buildType: apk`, `env.EXPO_PUBLIC_API_BASE_URL = https://rh.serviciosata.com`.
  - `app.json`: nombre "ATA Checador", `android.package: mx.serviciosata.checador`, permisos `ACCESS_FINE_LOCATION`, `USE_BIOMETRIC`, `POST_NOTIFICATIONS`; plugins `expo-secure-store`, `expo-notifications`, `expo-location`, `expo-local-authentication`.
- [ ] **Step 1: Tests que fallan** (copiados/adaptados + nuevos):
  - reminders: los 2 tests de BioChek.
  - offlineQueue: los de BioChek adaptados al nuevo payload.
  - checar: con `expo-location` mockeado que rechaza → POST con `lat:null,lng:null,precision_m:null`; fetch que lanza error de red → encola y `{enviada:false}`; 201 → `{enviada:true}` y no encola; cada llamada genera `client_id` distinto.
  - frases: `fraseAlAzar('entrada', () => 0) === FRASES_ENTRADA[0]`; `'salida'` usa su lista.
- [ ] **Step 2:** `cd mobile && npx jest` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npx jest` → verde; `npx tsc --noEmit` sin errores en `src/`.
- [ ] **Step 5:** Commit `feat(checador-movil): app Expo — sesión, checada, cola offline, recordatorios`.

---

### Task 9: App móvil — pantallas

**Files:**
- Create: `mobile/src/screens/LoginScreen.tsx`, `mobile/src/screens/InicioScreen.tsx`, `mobile/src/screens/ConfirmacionScreen.tsx`
- Modify: `mobile/App.tsx` (navegación: si hay sesión → Inicio, si no → Login)

**Interfaces:**
- Consumes: todo lo de Task 8; `GET /api/movil/yo`, `GET /api/movil/avisos`.

- [ ] **Step 1:** Login: número de empleado + PIN (teclado numérico, PIN oculto), `POST /api/movil/login`, guarda sesión. Error 401/403 muestra el mensaje del servidor.
- [ ] **Step 2:** Inicio: al montar y al volver a primer plano → `GET /yo` → `syncReminders(horario)` → `flushQueue()`. Muestra nombre, estado del día y botón grande "Iniciar jornada" si `ultima_hoy` es null o salida, "Terminar jornada" si es entrada (con checadas encoladas locales consideradas como la última). Al pulsar: `LocalAuthentication.authenticateAsync({ promptMessage: 'Confirma con tu huella' })`; cancelado → no hace nada; éxito → `checar(tipo)` → Confirmación. Un 401 de `/yo` → `clearSession()` y vuelve a Login. Sin red en `/yo` → usa el último `yo` guardado y deja checar.
- [ ] **Step 3:** Confirmación: entrada → "¡Buenos días, {nombre}!" + `fraseAlAzar('entrada')` + avisos de `GET /avisos` (si falla, no muestra avisos); salida → "¡Buen descanso, {nombre}!" + `fraseAlAzar('salida')`. Si `{enviada:false}`: leyenda "Sin conexión: tu checada se enviará en cuanto haya señal." Botón OK → Inicio.
- [ ] **Step 4:** `npx tsc --noEmit` y `npx jest` limpios.
- [ ] **Step 5:** Commit `feat(checador-movil): pantallas login, inicio y confirmación`.

---

### Task 10: Deploy, APK y prueba de punta a punta (controller con el usuario)

- [ ] **Step 1:** Árbol limpio en `~/rhata`; `cd backend && npx jest` verde; `./deploy.sh`. Verificar: `pm2 logs rhata-backend --lines 20` muestra `013_checador_movil.sql` aplicada; `curl -s https://rh.serviciosata.com/api/health` → ok; checadas del reloj existentes siguen visibles en Asistencia.
- [ ] **Step 2:** Usuario inicia sesión en EAS (`! npx eas-cli login`, cuenta `alxpho`); `cd mobile && npx eas-cli build --profile preview --platform android` → link del APK.
- [ ] **Step 3:** En el panel por `https://rh.serviciosata.com`: generar PIN a un empleado de prueba. Usuario instala APK, entra, acepta permisos de ubicación y notificaciones, inicia jornada con huella → ve saludo + frase + aviso de prueba; checada aparece en Asistencia con origen App y mapa; modo avión → checar → se envía al volver la red; termina jornada.
- [ ] **Step 4:** Reporte de la quincena incluye al empleado de prueba; Excel abre.
- [ ] **Step 5:** Actualizar memoria del proyecto y commit final.
