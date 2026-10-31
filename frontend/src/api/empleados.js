import api from './client';

export const getEmpleados = (estado) => api.get('/empleados', { params: estado ? { estado } : {} }).then(r => r.data);
export const getEmpleado = (id) => api.get(`/empleados/${id}`).then(r => r.data);
export const createEmpleado = (data) => api.post('/empleados', data).then(r => r.data);
export const updateEmpleado = (id, data) => api.put(`/empleados/${id}`, data).then(r => r.data);
export const deleteEmpleado = (id) => api.delete(`/empleados/${id}`);
export const uploadFoto = (id, formData) => api.post(`/empleados/${id}/foto`, formData).then(r => r.data);
