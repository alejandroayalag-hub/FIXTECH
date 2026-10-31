// Instala/desinstala el agente como servicio de Windows
// Uso: node servicio.js instalar | desinstalar
const path = require('path');
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Fix Tech Support Checador',
  description: 'Sincroniza asistencia del reloj ZKTeco con Fix Tech Support',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  env: { name: 'NODE_ENV', value: 'production' },
});

const accion = process.argv[2];

if (accion === 'instalar') {
  svc.on('install', () => {
    svc.start();
    console.log('Servicio instalado e iniciado.');
  });
  svc.install();
} else if (accion === 'desinstalar') {
  svc.on('uninstall', () => console.log('Servicio desinstalado.'));
  svc.uninstall();
} else {
  console.log('Uso: node servicio.js instalar | desinstalar');
}
