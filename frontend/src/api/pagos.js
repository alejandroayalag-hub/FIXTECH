import api from './client';

export const parsearPdf = (formData) =>
  api.post('/pagos/parsear', formData).then(r => r.data);

export const importarPagos = (formData) =>
  api.post('/pagos/importar', formData).then(r => r.data);

export const getSemanas = () => api.get('/pagos/semanas').then(r => r.data);

export const getPagosSemana = (id) => api.get(`/pagos/semana/${id}`).then(r => r.data);

export const getPagosEmpleado = (id) => api.get(`/pagos/empleado/${id}`).then(r => r.data);

export const deleteSemana = (id) => api.delete(`/pagos/semana/${id}`);

export const descargarPdf = async (id, filename) => {
  const res = await api.get(`/pagos/semana/${id}/descargar`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
