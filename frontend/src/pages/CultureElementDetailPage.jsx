import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCultura, updateCultura, subirArchivoCultura, eliminarArchivoCultura } from '../api/culturas';

const TIPO_LABEL = {
  mision: 'Misión',
  vision: 'Visión',
  valores: 'Valores',
  codigo_conducta: 'Código de conducta',
  politicas: 'Políticas',
  otro: 'Otro',
};

const urlArchivo = (archivo) => `/uploads/${archivo.url.split('/').pop()}`;

const categoriaArchivo = (tipo) => {
  if (tipo?.startsWith('image/')) return { label: 'Imagen', icon: '🖼️' };
  return { label: 'Documento', icon: '📄' };
};

export default function CultureElementDetailPage() {
  const { culturaId } = useParams();
  const [cultura, setCultura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ titulo: '', descripcion: '', orden: 0 });
  const [guardando, setGuardando] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const aplicarCultura = (data) => {
    setCultura(data);
    setForm({ titulo: data.titulo, descripcion: data.descripcion || '', orden: data.orden || 0 });
  };

  const recargar = () => getCultura(culturaId).then(aplicarCultura);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    getCultura(culturaId)
      .then(data => { if (!cancelado) aplicarCultura(data); })
      .catch(() => { if (!cancelado) setError('No se pudo cargar el elemento. Intente de nuevo.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [culturaId]);

  const handleSave = async () => {
    setActionError('');
    setActionMsg('');
    setGuardando(true);
    try {
      await updateCultura(culturaId, form);
      await recargar();
      setActionMsg('Cambios guardados.');
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError('');
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      await subirArchivoCultura(culturaId, formData);
      await recargar();
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const handleDeleteArchivo = async (archivo) => {
    if (!confirm(`¿Eliminar "${archivo.nombre}"?`)) return;
    setActionError('');
    setEliminandoId(archivo.id);
    try {
      await eliminarArchivoCultura(culturaId, archivo.id);
      await recargar();
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo eliminar el archivo.');
    } finally {
      setEliminandoId(null);
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!cultura) return <p className="text-gray-500 text-sm">Elemento no encontrado.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cultura" className="text-sm text-gray-500 hover:underline">← Volver a cultura corporativa</Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{cultura.titulo}</h1>
        <p className="text-gray-500 text-sm">{TIPO_LABEL[cultura.tipo] || cultura.tipo}</p>
      </div>

      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
      {actionMsg && <p className="text-green-700 text-sm">{actionMsg}</p>}

      <div className="bg-white rounded shadow p-5 space-y-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Título</label>
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm({ ...form, titulo: e.target.value })}
            className="border rounded px-3 py-2 w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            rows={5}
            className="border rounded px-3 py-2 w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Orden</label>
          <input
            type="number"
            value={form.orden}
            onChange={e => setForm({ ...form, orden: parseInt(e.target.value, 10) || 0 })}
            className="border rounded px-3 py-2 w-32 text-sm"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={guardando}
          className="text-sm bg-blue-700 text-white rounded px-3 py-1.5 hover:bg-blue-800 disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Archivos</h2>

        <div className="bg-white rounded shadow p-4 mb-3 border-2 border-dashed border-gray-200 text-center">
          <input
            type="file"
            id="cultura-archivo-input"
            onChange={handleUpload}
            disabled={subiendo}
            className="hidden"
          />
          <label
            htmlFor="cultura-archivo-input"
            className={`inline-block text-sm border border-gray-300 rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${subiendo ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {subiendo ? 'Subiendo...' : 'Seleccionar archivo'}
          </label>
          <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG, DOC o DOCX · Máximo 20MB</p>
        </div>

        {(cultura.archivos || []).length === 0 ? (
          <p className="text-gray-500 text-sm">No hay archivos cargados.</p>
        ) : (
          <div className="bg-white rounded shadow divide-y divide-gray-100">
            {cultura.archivos.map(archivo => {
              const cat = categoriaArchivo(archivo.tipo);
              return (
                <div key={archivo.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{archivo.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {cat.label} · {(archivo.tamano / 1024 / 1024).toFixed(2)}MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={urlArchivo(archivo)}
                      download={archivo.nombre}
                      className="text-xs border border-emerald-300 text-emerald-700 rounded px-2 py-1 hover:bg-emerald-50">
                      ⬇ Descargar
                    </a>
                    <button
                      onClick={() => handleDeleteArchivo(archivo)}
                      disabled={eliminandoId === archivo.id}
                      className="text-xs border border-red-300 text-red-600 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50">
                      {eliminandoId === archivo.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
