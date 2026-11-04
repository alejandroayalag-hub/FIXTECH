import api from './client';

export const getAvisos = () => api.get('/avisos').then(r => r.data);
export const crearAviso = (d) => api.post('/avisos', d).then(r => r.data);
export const actualizarAviso = (id, d) => api.put(`/avisos/${id}`, d).then(r => r.data);
export const borrarAviso = (id) => api.delete(`/avisos/${id}`);
