import api from './client';

export const getReporteAsistencia = (desde, hasta) =>
  api.get('/reportes/asistencia', { params: { desde, hasta } }).then(r => r.data);

export async function descargarReporteXlsx(desde, hasta) {
  const res = await api.get('/reportes/asistencia.xlsx', { params: { desde, hasta }, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_${desde}_${hasta}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
