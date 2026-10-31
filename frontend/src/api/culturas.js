import api from './client';

export const getCulturasByEmpresa = (empresaId) => api.get(`/culturas/empresa/${empresaId}`).then(r => r.data);
export const getCultura = (culturaId) => api.get(`/culturas/${culturaId}`).then(r => r.data);
export const createCultura = (data) => api.post('/culturas', data).then(r => r.data);
export const updateCultura = (culturaId, data) => api.put(`/culturas/${culturaId}`, data).then(r => r.data);
export const deleteCultura = (culturaId) => api.delete(`/culturas/${culturaId}`);

export const subirArchivoCultura = (culturaId, formData) =>
  api.post(`/culturas/${culturaId}/archivos`, formData).then(r => r.data);

export const eliminarArchivoCultura = (culturaId, archivoId) =>
  api.delete(`/culturas/${culturaId}/archivos/${archivoId}`).then(r => r.data);
