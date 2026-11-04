import { useEffect, useState } from 'react';
import { getAvisos, crearAviso, actualizarAviso, borrarAviso } from '../api/avisos';

const msgError = (e) => e.response?.data?.error || 'Error de conexión';
const d10 = (v) => (v ? String(v).slice(0, 10) : '');
const VACIO = { titulo: '', mensaje: '', vigente_desde: '', vigente_hasta: '' };

export default function AvisosPage() {
  const [avisos, setAvisos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try { setAvisos(await getAvisos()); } catch (e) { setError(msgError(e)); }
  };
  useEffect(() => { cargar(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    setError(''); setGuardando(true);
    try {
      const body = { titulo: form.titulo, mensaje: form.mensaje };
      if (form.vigente_desde) body.vigente_desde = form.vigente_desde;
      if (form.vigente_hasta) body.vigente_hasta = form.vigente_hasta;
      await crearAviso(body);
      setForm(VACIO);
      await cargar();
    } catch (err) { setError(msgError(err)); }
    setGuardando(false);
  };

  const alternar = async (a) => {
    setError('');
    try {
      await actualizarAviso(a.id, {
        titulo: a.titulo,
        mensaje: a.mensaje,
        vigente_desde: d10(a.vigente_desde),
        vigente_hasta: d10(a.vigente_hasta) || null,
        activo: !a.activo,
      });
      await cargar();
    } catch (err) { setError(msgError(err)); }
  };

  const borrar = async (a) => {
    if (!window.confirm(`¿Borrar el aviso "${a.titulo}"?`)) return;
    setError('');
    try { await borrarAviso(a.id); await cargar(); } catch (err) { setError(msgError(err)); }
  };

  const inp = 'border border-gray-300 rounded px-3 py-2 text-sm w-full';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Avisos de gerencia</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

      <form onSubmit={crear} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid gap-3">
        <input className={inp} placeholder="Título" value={form.titulo} onChange={set('titulo')} required />
        <textarea className={inp} rows={3} placeholder="Mensaje" value={form.mensaje} onChange={set('mensaje')} required />
        <div className="flex gap-4 flex-wrap">
          <label className="text-sm text-gray-600">Vigente desde
            <input type="date" className={inp} value={form.vigente_desde} onChange={set('vigente_desde')} />
          </label>
          <label className="text-sm text-gray-600">Vigente hasta
            <input type="date" className={inp} value={form.vigente_hasta} onChange={set('vigente_hasta')} />
          </label>
        </div>
        <div>
          <button disabled={guardando} className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Crear aviso'}
          </button>
        </div>
      </form>

      <div className="grid gap-3">
        {avisos.length === 0 && <p className="text-sm text-gray-500">No hay avisos.</p>}
        {avisos.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">{a.titulo}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${a.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {a.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line mt-1">{a.mensaje}</p>
              <p className="text-xs text-gray-400 mt-1">
                Vigencia: {d10(a.vigente_desde)} a {d10(a.vigente_hasta) || 'sin fin'}
              </p>
            </div>
            <button onClick={() => alternar(a)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
              {a.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button onClick={() => borrar(a)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:text-red-700">
              Borrar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
