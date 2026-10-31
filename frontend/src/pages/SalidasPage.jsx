import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSalidas } from '../api/salidas';
import { getEmpleados } from '../api/empleados';

const ESTADO_COLOR = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
};

const TIPO_LABEL = {
  renuncia: 'Renuncia',
  despido: 'Despido',
  jubilacion: 'Jubilación',
  otro: 'Otro',
};

const TABS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completado', label: 'Completadas' },
];

export default function SalidasPage() {
  const [tab, setTab] = useState('');
  const [salidas, setSalidas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    Promise.all([getSalidas(tab || undefined), getEmpleados()])
      .then(([salidasData, empleadosData]) => {
        if (cancelado) return;
        setSalidas(salidasData);
        setEmpleados(empleadosData);
      })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar las salidas. Intente de nuevo.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [tab]);

  const nombreEmpleado = (empleadoId) => {
    const emp = empleados.find(e => e.id === empleadoId);
    return emp ? `${emp.apellido_paterno} ${emp.apellido_materno || ''}, ${emp.nombre}`.trim() : 'Desconocido';
  };

  return (
    <div>
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

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : salidas.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay salidas registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded shadow bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Tipo de salida</th>
                <th className="px-4 py-3 text-left">Fecha de salida</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salidas.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{nombreEmpleado(s.empleado_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{TIPO_LABEL[s.tipo_salida] || s.tipo_salida}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(s.fecha_salida).toLocaleDateString('es-MX')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[s.estado]}`}>
                      {s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/salidas/${s.id}`} className="text-blue-700 hover:underline">
                      Ver detalle
                    </Link>
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
