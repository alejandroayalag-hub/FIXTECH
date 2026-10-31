import api from './client';

export const getSalidas = (estado) => api.get('/salidas', { params: estado ? { estado } : {} }).then(r => r.data);
export const getSalida = (id) => api.get(`/salidas/${id}`).then(r => r.data);
export const getSalidasByEmpleado = (empleadoId) => api.get(`/salidas/empleado/${empleadoId}`).then(r => r.data);
export const createSalida = (data) => api.post('/salidas', data).then(r => r.data);
export const updateSalida = (id, data) => api.put(`/salidas/${id}`, data).then(r => r.data);
export const deleteSalida = (id) => api.delete(`/salidas/${id}`);
