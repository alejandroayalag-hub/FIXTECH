import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChecadasDia } from '../api/checadas';

const TIPO_COLOR = {
  entrada: 'bg-green-100 text-green-800',
  salida: 'bg-blue-100 text-blue-800',
  desconocido: 'bg-gray-100 text-gray-600',
};

// en-CA da YYYY-MM-DD; hoy en México, no en la zona del navegador
const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

export default function RegistrosChecadorPage() {
  const [fecha, setFecha] = useState(hoyMx);
  const [checadas, setChecadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fecha) return;
    setCargando(true);
    setError('');
    getChecadasDia(fecha)
      .then(setChecadas)
      .catch(err => setError(err.response?.data?.error || 'Error al cargar los registros'))
      .finally(() => setCargando(false));
  }, [fecha]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Checador — Registros</h1>
        <Link to="/checador/mapeo" className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-100">
          Mapeo de relojes
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Día</label>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="border rounded px-2 py-1 text-sm" />
        <button onClick={() => setFecha(hoyMx())} className="text-xs text-blue-600 hover:underline">Hoy</button>
        {!cargando && !error && <span className="text-xs text-gray-400">{checadas.length} registro{checadas.length !== 1 ? 's' : ''}</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-gray-400">Cargando registros...</p>}

      {!cargando && !error && checadas.length === 0 && (
        <div className="bg-white rounded shadow p-8 text-center text-gray-400 text-sm">Sin registros este día</div>
      )}

      {!cargando && !error && checadas.length > 0 && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="p-3">Hora</th>
                <th className="p-3">No.</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {checadas.map(c => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium text-gray-800">
                    {new Date(c.timestamp).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })}
                    {c.hora_dudosa && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Hora dudosa</span>
                    )}
                  </td>
                  <td className="p-3 font-mono">{c.numero_empleado}</td>
                  <td className="p-3">
                    <Link to={`/empleados/${c.empleado_id}`} className="text-blue-700 hover:underline">
                      {c.nombre} {c.apellido_paterno}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[c.tipo] || TIPO_COLOR.desconocido}`}>{c.tipo}</span>
                  </td>
                  <td className="p-3">{c.origen === 'app' ? 'App' : 'Reloj'}</td>
                  <td className="p-3 text-xs text-gray-500">
                    {c.dispositivo_nombre}{c.ubicacion ? ` — ${c.ubicacion}` : ''}
                    {c.lat != null && c.lng != null && (
                      <a href={`https://maps.google.com/?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer"
                        className={`${c.dispositivo_nombre || c.ubicacion ? 'ml-2 ' : ''}text-blue-600 hover:underline`}>Ver mapa</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
