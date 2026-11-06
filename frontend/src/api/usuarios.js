import api from './client';

export const getUsuarios = () => api.get('/usuarios').then(r => r.data);
export const crearUsuario = (d) => api.post('/usuarios', d).then(r => r.data);
export const actualizarUsuario = (id, d) => api.put(`/usuarios/${id}`, d).then(r => r.data);
export const borrarUsuario = (id) => api.delete(`/usuarios/${id}`);

// ponytail: rol leído del JWT sin verificar, solo para mostrar/ocultar menú; el backend sí valida
export function sesion() {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
}
