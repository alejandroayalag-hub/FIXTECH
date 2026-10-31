import { useEffect, useState } from 'react';
import { parsearPdf, importarPagos, getSemanas, getPagosSemana, deleteSemana, descargarPdf } from '../api/pagos';

function semanaISO(fecha = new Date()) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { semana: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), anio: d.getUTCFullYear() };
}

export default function PagosPage() {
  const { semana: semanaActual, anio: anioActual } = semanaISO();

  const [semanas, setSemanas] = useState([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(null);
  const [pagosSemana, setPagosSemana] = useState([]);

  // Importación
  const [archivo, setArchivo] = useState(null);
  const [semana, setSemana] = useState(String(semanaActual));
  const [anio, setAnio] = useState(String(anioActual));
  const [preview, setPreview] = useState(null);
  const [textoRaw, setTextoRaw] = useState('');
  const [verRaw, setVerRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => { cargarSemanas(); }, []);

  const cargarSemanas = async () => {
    const data = await getSemanas();
    setSemanas(data);
  };

  const handleParsear = async () => {
    if (!archivo || !semana) { setError('Seleccione el archivo PDF y el número de semana'); return; }
    setError(''); setExito(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf', archivo);
      const data = await parsearPdf(fd);
      setPreview(data.preview);
      setTextoRaw(data.texto_raw);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al leer el PDF');
    } finally { setLoading(false); }
  };

  const handleImportar = async () => {
    if (!preview || !archivo) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('pdf', archivo);
      fd.append('semana', semana);
      fd.append('anio', anio);
      fd.append('registros', JSON.stringify(preview));
      await importarPagos(fd);
      setExito(`Semana ${semana}/${anio} importada — ${preview.length} registros guardados`);
      setPreview(null); setArchivo(null); setSemana(String(semanaISO().semana)); setTextoRaw('');
      cargarSemanas();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al importar');
    } finally { setLoading(false); }
  };

  const handleEliminarSemana = async (id) => {
    if (!confirm('¿Eliminar esta semana y todos sus pagos?')) return;
    await deleteSemana(id);
    if (semanaSeleccionada?.id === id) { setSemanaSeleccionada(null); setPagosSemana([]); }
    cargarSemanas();
  };

  const handleVerSemana = async (sem) => {
    setSemanaSeleccionada(sem);
    const pagos = await getPagosSemana(sem.id);
    setPagosSemana(pagos);
  };

  const matchColor = (r) => {
    if (r.empleado_id) return 'bg-green-50';
    return 'bg-yellow-50';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Comprobantes de pago — Banco Bajío</h1>

      {/* Formulario de importación */}
      <div className="bg-white rounded shadow p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-700">Importar nómina semanal</h2>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Semana</label>
            <input type="number" min="1" max="53" value={semana} onChange={e => setSemana(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24" placeholder="Ej: 16" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Año</label>
            <input type="number" value={anio} onChange={e => setAnio(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Archivo PDF</label>
            <input type="file" accept=".pdf" onChange={e => { setArchivo(e.target.files[0]); setPreview(null); setTextoRaw(''); }}
              className="text-sm" />
          </div>
          <button onClick={handleParsear} disabled={loading || !archivo}
            className="bg-blue-700 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-800 disabled:opacity-50">
            {loading ? 'Leyendo...' : 'Leer PDF'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {exito && <p className="text-green-600 text-sm font-medium">{exito}</p>}
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">
              Vista previa — {preview.length} registros detectados
            </h2>
            <div className="flex gap-3 items-center">
              <button onClick={() => setVerRaw(!verRaw)}
                className="text-xs text-gray-500 hover:underline">
                {verRaw ? 'Ocultar texto raw' : 'Ver texto extraído'}
              </button>
              <button onClick={handleImportar} disabled={loading}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Guardando...' : `✓ Confirmar importación`}
              </button>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> Empleado encontrado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span> Sin coincidencia</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Nombre en PDF</th>
                  <th className="pb-2 pr-4">Cuenta</th>
                  <th className="pb-2 pr-4">Monto</th>
                  <th className="pb-2 pr-4">Autorizado</th>
                  <th className="pb-2">Empleado en sistema</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((r, i) => (
                  <tr key={i} className={matchColor(r)}>
                    <td className="py-2 pr-4 font-medium">{r.nombre_pdf}</td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{r.cuenta || '—'}</td>
                    <td className="py-2 pr-4 font-medium">${Number(r.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 pr-4 text-xs">{r.autorizado || '—'}</td>
                    <td className="py-2 text-xs">
                      {r.empleado_id
                        ? <span className="text-green-700 font-medium">{r.empleado_display}</span>
                        : <span className="text-yellow-600">Sin coincidencia</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verRaw && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Texto extraído del PDF:</p>
              <pre className="bg-gray-50 border rounded p-3 text-xs text-gray-600 overflow-auto max-h-60 whitespace-pre-wrap">{textoRaw}</pre>
            </div>
          )}
        </div>
      )}

      {/* Semanas importadas */}
      <div className="bg-white rounded shadow p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Semanas importadas</h2>
        {semanas.length === 0 ? (
          <p className="text-sm text-gray-400">Sin importaciones aún</p>
        ) : (
          <div className="divide-y">
            {semanas.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium text-gray-800">Semana {s.semana} / {s.anio}</span>
                  <span className="ml-3 text-xs text-gray-400">{s.total_registros} registros</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleVerSemana(s)}
                    className="text-sm text-blue-600 hover:underline">
                    Ver detalle
                  </button>
                  <button onClick={() => descargarPdf(s.id, s.filename)}
                    className="text-sm text-gray-500 hover:underline">
                    Descargar PDF
                  </button>
                  <button onClick={() => handleEliminarSemana(s.id)}
                    className="text-sm text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detalle de semana */}
      {semanaSeleccionada && (
        <div className="bg-white rounded shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">
              Semana {semanaSeleccionada.semana} / {semanaSeleccionada.anio} — {pagosSemana.length} registros
            </h2>
            <button onClick={() => setSemanaSeleccionada(null)} className="text-xs text-gray-400 hover:underline">Cerrar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Nombre en PDF</th>
                  <th className="pb-2 pr-4">Empleado en sistema</th>
                  <th className="pb-2 pr-4">Cuenta</th>
                  <th className="pb-2 pr-4">Monto</th>
                  <th className="pb-2">Autorizado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagosSemana.map(p => (
                  <tr key={p.id} className={p.empleado_id ? 'bg-green-50' : 'bg-yellow-50'}>
                    <td className="py-2 pr-4">{p.nombre_pdf}</td>
                    <td className="py-2 pr-4 text-xs">
                      {p.empleado_id
                        ? <span className="text-green-700 font-medium">{p.apellido_paterno} {p.apellido_materno || ''}, {p.nombre}</span>
                        : <span className="text-gray-700">{p.nombre_pdf}</span>}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{p.cuenta || '—'}</td>
                    <td className="py-2 pr-4 font-medium">${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-xs">{p.autorizado || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
