import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getEmpleados } from '../api/empleados';
import SalidasPage from './SalidasPage';

const ESTATUS_COLOR = {
  activo: 'bg-green-100 text-green-800',
  inactivo: 'bg-yellow-100 text-yellow-800',
  baja: 'bg-red-100 text-red-800',
};

const TABS = [
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'salidas', label: 'Salidas' },
];

export default function EmpleadosPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'activo');
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (tab === 'salidas') return;
    let cancelado = false;
    setLoading(true);
    setError('');
    getEmpleados(tab)
      .then(data => { if (!cancelado) setEmpleados(data); })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar los empleados. Intente de nuevo.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [tab]);

  const filtrados = empleados.filter(e =>
    `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Empleados</h1>
        {tab !== 'salidas' && (
          <Link to="/empleados/nuevo"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm">
            + Nuevo empleado
          </Link>
        )}
      </div>

      <div className="flex border-b mb-4">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'salidas' ? (
        <SalidasPage />
      ) : (
        <>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="border rounded px-3 py-2 w-full mb-4 text-sm"
          />

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {loading ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {tab === 'activo' ? 'No hay empleados activos.' : 'No hay empleados inactivos.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded shadow bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Puesto</th>
                    <th className="px-4 py-3 text-left">Departamento</th>
                    <th className="px-4 py-3 text-left">Estatus</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrados.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {e.apellido_paterno} {e.apellido_materno}, {e.nombre}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.puesto || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{e.departamento || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTATUS_COLOR[e.estatus]}`}>
                          {e.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/empleados/${e.id}`} className="text-blue-700 hover:underline">
                          Ver expediente
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
