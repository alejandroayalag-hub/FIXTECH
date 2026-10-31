import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCulturasByEmpresa, createCultura, deleteCultura } from '../api/culturas';

const EMPRESA_ID = 1;

const TIPOS_CULTURA = ['mision', 'vision', 'valores', 'codigo_conducta', 'politicas', 'otro'];

const TIPO_LABEL = {
  mision: 'Misión',
  vision: 'Visión',
  valores: 'Valores',
  codigo_conducta: 'Código de conducta',
  politicas: 'Políticas',
  otro: 'Otro',
};

const TIPO_ICON = {
  mision: '🎯',
  vision: '👁️',
  valores: '⭐',
  codigo_conducta: '📋',
  politicas: '📜',
  otro: '📝',
};

const FORM_INICIAL = { tipo: 'mision', titulo: '', descripcion: '' };

export default function CulturePage() {
  const [culturas, setCulturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    getCulturasByEmpresa(EMPRESA_ID)
      .then(data => { if (!cancelado) setCulturas(data); })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar los elementos de cultura. Intente de nuevo.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const abrirForm = () => {
    setForm(FORM_INICIAL);
    setFormError('');
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.titulo.trim()) {
      setFormError('El título es requerido.');
      return;
    }
    setFormError('');
    setCreando(true);
    try {
      const nueva = await createCultura({ empresaId: EMPRESA_ID, ...form });
      setCulturas(prev => [...prev, nueva]);
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'No se pudo crear el elemento.');
    } finally {
      setCreando(false);
    }
  };

  const handleDelete = async (cultura) => {
    if (!confirm(`¿Eliminar "${cultura.titulo}"?`)) return;
    try {
      await deleteCultura(cultura.id);
      setCulturas(prev => prev.filter(c => c.id !== cultura.id));
    } catch {
      setError('No se pudo eliminar el elemento.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Cultura corporativa</h1>
        <button
          onClick={abrirForm}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm">
          + Agregar elemento
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : culturas.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay elementos de cultura registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {culturas.map(c => (
            <div key={c.id} className="bg-white rounded shadow p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{TIPO_ICON[c.tipo] || '📄'}</span>
                <h3 className="font-medium text-gray-800">{c.titulo}</h3>
              </div>
              <span className="text-xs text-gray-500 mb-2">{TIPO_LABEL[c.tipo] || c.tipo}</span>
              <p className="text-sm text-gray-600 flex-1 mb-2">
                {c.descripcion ? `${c.descripcion.slice(0, 100)}${c.descripcion.length > 100 ? '…' : ''}` : 'Sin descripción.'}
              </p>
              <p className="text-xs text-gray-400 mb-3">{(c.archivos || []).length} archivo(s)</p>
              <div className="flex items-center justify-between">
                <Link to={`/cultura/${c.id}`} className="text-blue-700 hover:underline text-sm">
                  Ver detalle
                </Link>
                <button
                  onClick={() => handleDelete(c)}
                  className="text-xs border border-red-300 text-red-600 rounded px-2 py-1 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Agregar elemento de cultura</h3>

            {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}

            <label className="block text-sm text-gray-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-3 text-sm">
              {TIPOS_CULTURA.map(t => (
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-3 text-sm"
            />

            <label className="block text-sm text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              rows={4}
              className="border rounded px-3 py-2 w-full mb-4 text-sm"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creando}
                className="text-sm bg-blue-700 text-white rounded px-3 py-1.5 hover:bg-blue-800 disabled:opacity-50">
                {creando ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
