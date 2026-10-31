# Agente Checador Fix Tech Support

## Requisitos
- Node.js 18+ instalado en la PC (https://nodejs.org)
- PC con acceso a la misma red del reloj ZKTeco K30

## Instalación

1. Copiar esta carpeta a la PC de la oficina (ej. `C:\fixtech-agente\`)

2. Copiar `.env.example` a `.env` y editar:
   - `CHECADOR_IP` — IP del K30 (ver en la pantalla del reloj: Menú > Comm > IP)
   - Las demás ya están configuradas

3. Abrir una terminal como **Administrador** en la carpeta y ejecutar:
```
npm install
```

4. Probar que funciona:
```
node index.js
```
Deberías ver "Conectando al K30..." y luego los registros.

5. Instalar como servicio de Windows (corre automático al iniciar la PC):
```
node servicio.js instalar
```

## Ver IP del K30 en el reloj
Menú → Comm → Ethernet → IP Address

## Desinstalar servicio
```
node servicio.js desinstalar
```
