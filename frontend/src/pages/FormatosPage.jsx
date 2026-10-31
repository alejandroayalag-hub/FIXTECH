import { useEffect, useRef, useState } from 'react';
import { getTiposConFormato, subirFormato, eliminarFormato, descargarFormato } from '../api/formatos';

// Tipos que tienen formato descargable
const TIPOS_CON_FORMATO = [
  'Adhesión al sindicato',
  'Aviso de privacidad',
  'Convenio de horario',
  'Convenio de pago electrónico',
  'Reglamento interior',
  'Resguardos por parte de la empresa',
];

export default function FormatosPage() {
  const [tipos, setTipos]       = useState([]);
  const [uploading, setUploading] = useState(null); // tipoId en carga
  const [descargando, setDescargando] = useState(null);
  const inputRefs = useRef({});

  const cargar = () => getTiposConFormato().then(r => setTipos(r.data));
  useEffect(() => { cargar(); }, []);

  const handleUpload = async (tipoId, file) => {
    if (!file) return;
    setUploading(tipoId);
    try {
      await subirFormato(tipoId, file);
      cargar();
    } catch (err) {
      alert('Error al subir el archivo: ' + (err.response?.data?.error || err.message));
    } finally { setUploading(null); }
  };

  const handleEliminar = async (tipoId) => {
    if (!confirm('¿Quitar este formato del sistema?')) return;
    await eliminarFormato(tipoId);
    cargar();
  };

  const handleDescargar = async (tipoId, nombre) => {
    setDescargando(tipoId);
    try { await descargarFormato(tipoId, nombre); }
    catch { alert('No se pudo descargar el archivo.'); }
    finally { setDescargando(null); }
  };

  // Solo mostrar los tipos que aplican
  const tiposFiltrados = tipos.filter(t => TIPOS_CON_FORMATO.includes(t.nombre));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Formatos descargables</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sube el PDF de cada formato para que los usuarios puedan descargarlo desde el expediente del empleado.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {tiposFiltrados.map(tipo => (
          <div key={tipo.id} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{tipo.nombre}</p>
              {tipo.formato_ruta
                ? <p className="text-xs text-green-600 mt-0.5">PDF cargado ✓</p>
                : <p className="text-xs text-gray-400 mt-0.5">Sin formato cargado</p>
              }
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tipo.formato_ruta && (
                <>
                  <button
                    onClick={() => handleDescargar(tipo.id, tipo.nombre)}
                    disabled={descargando === tipo.id}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 disabled:opacity-50">
                    {descargando === tipo.id ? 'Descargando...' : '⬇ Ver PDF'}
                  </button>
                  <button
                    onClick={() => handleEliminar(tipo.id)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
                    Quitar
                  </button>
                </>
              )}

              {/* Botón para subir / reemplazar */}
              <label className={`cursor-pointer text-xs font-medium rounded px-3 py-1.5 border transition-colors ${
                tipo.formato_ruta
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'border-blue-500 text-blue-600 hover:bg-blue-50'
              } ${uploading === tipo.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading === tipo.id
                  ? 'Subiendo...'
                  : tipo.formato_ruta ? 'Reemplazar PDF' : '+ Subir PDF'}
                <input
                  ref={el => inputRefs.current[tipo.id] = el}
                  type="file"
                  accept=".pdf"
                  disabled={uploading === tipo.id}
                  className="hidden"
                  onChange={e => {
                    handleUpload(tipo.id, e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        {tiposFiltrados.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Cargando tipos de documento...</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Solo se aceptan archivos PDF. El formato queda disponible inmediatamente en el expediente de todos los empleados.
      </p>
    </div>
  );
}
