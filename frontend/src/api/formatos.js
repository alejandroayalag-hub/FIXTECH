import api from './client';

export const getTiposConFormato = () => api.get('/formatos');

export const subirFormato = (tipoId, archivo) => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return api.post(`/formatos/${tipoId}`, fd);
};

export const eliminarFormato = (tipoId) => api.delete(`/formatos/${tipoId}`);

export const descargarFormato = (tipoId, nombre) => {
  return api.get(`/formatos/${tipoId}/descargar`, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  });
};
