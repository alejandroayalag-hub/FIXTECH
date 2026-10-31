import { useEffect, useState } from 'react';
import { getMappings, upsertMapping, deleteMapping, getDispositivos } from '../api/checadas';
import { getEmpleados } from '../api/empleados';
import { Link } from 'react-router-dom';

export default function MapeoChecadorPage() {
  const [mappings, setMappings]         = useState([]);
  const [empleados, setEmpleados]       = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState('');

  const [form, setForm] = useState({
    dispositivo_id: '',
    empleado_id: '',
    uid_checador: '',
  });

  useEffect(() => {
    Promise.all([getMappings(), getEmpleados(), getDispositivos()])
      .then(([m, e, d]) => { setMappings(m); setEmpleados(e); setDispositivos(d); })
      .finally(() => setCargando(false));
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.dispositivo_id || !form.empleado_id || form.uid_checador === '') {
      setError('Completa todos los campos');
      return;
    }
    setGuardando(true);
    try {
      await upsertMapping({
        dispositivo_id: parseInt(form.dispositivo_id),
        empleado_id: parseInt(form.empleado_id),
        uid_checador: parseInt(form.uid_checador),
      });
      const updated = await getMappings();
      setMappings(updated);
      setForm({ dispositivo_id: form.dispositivo_id, empleado_id: '', uid_checador: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este mapeo?')) return;
    await deleteMapping(id);
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  const nombreEmpleado = (e) =>
    `${e.apellido_paterno} ${e.apellido_materno || ''}, ${e.nombre}`.trim();

  // Agrupar mappings por dispositivo
  const porDispositivo = mappings.reduce((acc, m) => {
    const key = m.dispositivo_nombre;
    if (!acc[key]) acc[key] = { ubicacion: m.ubicacion, items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Mapeo de Checador</h1>
          <p className="text-sm text-gray-500 mt-1">
            Asigna el número de usuario del reloj a cada empleado del sistema
          </p>
        </div>
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Volver</Link>
      </div>

      {/* Formulario nuevo mapeo */}
      <div className="bg-white rounded shadow p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Agregar mapeo</h2>
        <form onSubmit={handleGuardar} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dispositivo</label>
            <select value={form.dispositivo_id}
              onChange={e => setForm(f => ({ ...f, dispositivo_id: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {dispositivos.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre}{d.ubicacion ? ` — ${d.ubicacion}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Empleado</label>
            <select value={form.empleado_id}
              onChange={e => setForm(f => ({ ...f, empleado_id: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {empleados
                .filter(e => e.estatus === 'activo')
                .sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno))
                .map(e => (
                  <option key={e.id} value={e.id}>{nombreEmpleado(e)}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              UID en el reloj
              <span className="ml-1 text-gray-400">(número del empleado en el K30)</span>
            </label>
            <input type="number" min="1" value={form.uid_checador}
              onChange={e => setForm(f => ({ ...f, uid_checador: e.target.value }))}
              placeholder="Ej. 1"
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div className="flex items-end">
            <button type="submit" disabled={guardando}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Tabla de mapeos */}
      {cargando && <p className="text-sm text-gray-400">Cargando...</p>}

      {!cargando && mappings.length === 0 && (
        <div className="bg-white rounded shadow p-8 text-center text-gray-400 text-sm">
          Sin mapeos registrados. Agrega el primero arriba.
        </div>
      )}

      {!cargando && Object.entries(porDispositivo).map(([nombre, { ubicacion, items }]) => (
        <div key={nombre} className="bg-white rounded shadow overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">{nombre}</span>
            {ubicacion && <span className="text-xs text-gray-400">{ubicacion}</span>}
            <span className="text-xs text-gray-400 ml-auto">{items.length} empleado{items.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">UID Reloj</th>
                <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Empleado</th>
                <th className="px-5 py-2 text-left text-xs text-gray-500 font-medium">Puesto</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-700">{m.uid_checador}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {m.apellido_paterno} {m.apellido_materno || ''}, {m.nombre}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{m.puesto || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleEliminar(m.id)}
                      className="text-red-500 text-xs hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
