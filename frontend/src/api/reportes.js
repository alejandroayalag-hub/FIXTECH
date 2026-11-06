import api from './client';

export const getReporteAsistencia = (desde, hasta) =>
  api.get('/reportes/asistencia', { params: { desde, hasta } }).then(r => r.data);

export const descargarReporteXlsx = (desde, hasta) =>
  descargar('/reportes/asistencia.xlsx', { desde, hasta }, `asistencia_${desde}_${hasta}.xlsx`);

export const descargarNomipaqDyh = (desde) =>
  descargar('/reportes/nomipaq-dyh.xlsx', { desde }, `nomipaq_dyh_${desde}.xlsx`);

async function descargar(ruta, params, nombre) {
  const res = await api.get(ruta, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
