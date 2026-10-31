import api from './client';

export const getDocumentosSalida = (salidaId) => api.get(`/documentosSalida/${salidaId}`).then(r => r.data);
export const getDocumentoSalida = (documentoId) => api.get(`/documentosSalida/documento/${documentoId}`).then(r => r.data);

export const generarTemplate = (salidaId, tipo) =>
  api.post(`/documentosSalida/${salidaId}/${tipo}/generar-template`).then(r => r.data);

export const subirEscaneado = (documentoId, formData) =>
  api.post(`/documentosSalida/${documentoId}/subir-escaneado`, formData).then(r => r.data);

export const eliminarEscaneado = (documentoId) =>
  api.delete(`/documentosSalida/${documentoId}/escaneado`).then(r => r.data);

export const descargarEscaneado = async (documentoId, filename) => {
  const res = await api.get(`/documentosSalida/${documentoId}/descargar-escaneado`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'documento';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
