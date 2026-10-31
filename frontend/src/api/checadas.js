import api from './client';

export const getChecadas = (empleadoId, params = {}) =>
  api.get(`/checadas/empleado/${empleadoId}`, { params }).then(r => r.data);

export const getMappings = () =>
  api.get('/checadas/mappings').then(r => r.data);

export const upsertMapping = (data) =>
  api.post('/checadas/mappings', data).then(r => r.data);

export const deleteMapping = (id) =>
  api.delete(`/checadas/mappings/${id}`);

export const getDispositivos = () =>
  api.get('/checadas/dispositivos').then(r => r.data);
