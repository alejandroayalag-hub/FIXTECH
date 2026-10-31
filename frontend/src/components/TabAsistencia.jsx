import { useEffect, useState } from 'react';
import { getChecadas } from '../api/checadas';

const TIPO_COLOR = {
  entrada: 'bg-green-100 text-green-800',
  salida: 'bg-blue-100 text-blue-800',
  desconocido: 'bg-gray-100 text-gray-600',
};

function semanaActual() {
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);
  return {
    desde: lunes.toISOString().slice(0, 10),
    hasta: domingo.toISOString().slice(0, 10),
  };
}

export default function TabAsistencia({ empleadoId }) {
  const [checadas, setChecadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState(semanaActual);

  useEffect(() => {
    setCargando(true);
    getChecadas(empleadoId, filtro)
      .then(setChecadas)
      .finally(() => setCargando(false));
  }, [empleadoId, filtro.desde, filtro.hasta]);

  // Agrupar por fecha
  const porFecha = checadas.reduce((acc, c) => {
    const fecha = new Date(c.timestamp).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Filtro de fechas */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Desde</label>
          <input type="date" value={filtro.desde}
            onChange={e => setFiltro(f => ({ ...f, desde: e.target.value }))}
            className="border rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Hasta</label>
          <input type="date" value={filtro.hasta}
            onChange={e => setFiltro(f => ({ ...f, hasta: e.target.value }))}
            className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={() => setFiltro(semanaActual())}
          className="text-xs text-blue-600 hover:underline">
          Esta semana
        </button>
        <button onClick={() => {
          const hoy = new Date();
          setFiltro({
            desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
            hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10),
          });
        }} className="text-xs text-blue-600 hover:underline">
          Este mes
        </button>
      </div>

      {cargando && <p className="text-sm text-gray-400">Cargando registros...</p>}

      {!cargando && checadas.length === 0 && (
        <div className="bg-white rounded shadow p-8 text-center text-gray-400 text-sm">
          Sin registros en el período seleccionado
        </div>
      )}

      {!cargando && Object.entries(porFecha).map(([fecha, registros]) => (
        <div key={fecha} className="bg-white rounded shadow overflow-hidden">
          <div className="bg-gray-50 px-5 py-2 border-b">
            <span className="text-sm font-medium text-gray-700 capitalize">{fecha}</span>
            <span className="ml-3 text-xs text-gray-400">{registros.length} registro{registros.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y">
            {registros.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[c.tipo]}`}>
                    {c.tipo}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {new Date(c.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {c.dispositivo_nombre}{c.ubicacion ? ` — ${c.ubicacion}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
