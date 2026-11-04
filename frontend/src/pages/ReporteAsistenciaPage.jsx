import { useState } from 'react';
import { getReporteAsistencia, descargarReporteXlsx } from '../api/reportes';

const msgError = async (e) => {
  let d = e.response?.data;
  if (d instanceof Blob) { try { d = JSON.parse(await d.text()); } catch { d = null; } }
  return d?.error || 'Error de conexión';
};

function quincenaActual() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })
    .format(new Date()).split('-').map(Number);
  const p = (n) => String(n).padStart(2, '0');
  if (d <= 15) return { desde: `${y}-${p(m)}-01`, hasta: `${y}-${p(m)}-15` };
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${y}-${p(m)}-16`, hasta: `${y}-${p(m)}-${p(ultimo)}` };
}

export default function ReporteAsistenciaPage() {
  const [rango, setRango] = useState(quincenaActual);
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const consultar = async () => {
    setError(''); setCargando(true);
    try { setFilas(await getReporteAsistencia(rango.desde, rango.hasta)); }
    catch (e) { setError(await msgError(e)); }
    setCargando(false);
  };

  const descargar = async () => {
    setError('');
    try { await descargarReporteXlsx(rango.desde, rango.hasta); }
    catch (e) { setError(await msgError(e)); }
  };

  const inp = 'border border-gray-300 rounded px-3 py-2 text-sm';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Reporte de asistencia</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

      <div className="flex gap-3 items-end flex-wrap mb-6">
        <label className="text-sm text-gray-600 flex flex-col">Desde
          <input type="date" className={inp} value={rango.desde} onChange={e => setRango({ ...rango, desde: e.target.value })} />
        </label>
        <label className="text-sm text-gray-600 flex flex-col">Hasta
          <input type="date" className={inp} value={rango.hasta} onChange={e => setRango({ ...rango, hasta: e.target.value })} />
        </label>
        <button onClick={consultar} disabled={cargando || !rango.desde || !rango.hasta}
          className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50">
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
        <button onClick={descargar} disabled={!rango.desde || !rango.hasta}
          className="border border-gray-300 text-sm px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50">
          Descargar Excel
        </button>
      </div>

      {filas && (
        <table className="w-full bg-white border border-gray-200 rounded-lg text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="p-3">Empleado</th>
              <th className="p-3 text-right">Días trabajados</th>
              <th className="p-3 text-right">Retardos</th>
              <th className="p-3 text-right">Faltas</th>
              <th className="p-3 text-right" title="Checadas con hora dudosa (reloj del celular desfasado o fuera de rango)">Dudosas</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={5} className="p-3 text-gray-500">Sin datos en el periodo.</td></tr>}
            {filas.map(f => (
              <tr key={f.empleado_id} className="border-t border-gray-100">
                <td className="p-3">{f.nombre}</td>
                <td className="p-3 text-right">{f.dias_trabajados}</td>
                <td className="p-3 text-right">{f.retardos}</td>
                <td className="p-3 text-right">{f.faltas}</td>
                <td className={`p-3 text-right ${f.checadas_dudosas > 0 ? 'text-amber-700 font-medium' : ''}`}>{f.checadas_dudosas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
