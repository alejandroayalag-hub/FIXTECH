import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSalida } from '../api/salidas';
import { getEmpleado } from '../api/empleados';
import {
  getDocumentosSalida,
  generarTemplate,
  subirEscaneado,
  eliminarEscaneado,
  descargarEscaneado,
} from '../api/documentosSalida';

const TIPO_SALIDA_LABEL = {
  renuncia: 'Renuncia',
  despido: 'Despido',
  jubilacion: 'Jubilación',
  otro: 'Otro',
};

const ESTADO_SALIDA_COLOR = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
};

const ORDEN_TIPOS_DOCUMENTO = ['finiquito', 'renuncia', 'aviso_rescisorio', 'entrega_materiales', 'baja_imss', 'encuesta_salida'];

const TIPO_DOCUMENTO_LABEL = {
  finiquito: 'Finiquito',
  renuncia: 'Carta de renuncia',
  aviso_rescisorio: 'Aviso rescisorio',
  entrega_materiales: 'Entrega de materiales',
  baja_imss: 'Baja del IMSS',
  encuesta_salida: 'Encuesta de salida',
};

const ESTADO_DOC_COLOR = {
  template_generado: 'bg-yellow-100 text-yellow-800',
  completado: 'bg-green-100 text-green-800',
};

const ESTADO_DOC_LABEL = {
  template_generado: 'Pendiente',
  completado: 'Completado',
};

export default function SalidaDetailPage() {
  const { id } = useParams();
  const [salida, setSalida] = useState(null);
  const [empleado, setEmpleado] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [generandoTipo, setGenerandoTipo] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null); // documento siendo subido (objeto)
  const [tieneFirma, setTieneFirma] = useState(false);
  const [tieneHuella, setTieneHuella] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    getSalida(id)
      .then(async (salidaData) => {
        if (cancelado) return;
        setSalida(salidaData);
        const [empleadoData, documentosData] = await Promise.all([
          getEmpleado(salidaData.empleado_id).catch(() => null),
          getDocumentosSalida(id).catch(() => []),
        ]);
        if (cancelado) return;
        setEmpleado(empleadoData);
        setDocumentos(documentosData);
      })
      .catch(() => { if (!cancelado) setError('No se pudo cargar la salida. Intente de nuevo.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [id]);

  const refrescarDocumentos = async () => {
    const [salidaData, documentosData] = await Promise.all([
      getSalida(id),
      getDocumentosSalida(id),
    ]);
    setSalida(salidaData);
    setDocumentos(documentosData);
  };

  const handleGenerarTemplate = async (tipo) => {
    setActionError('');
    setGenerandoTipo(tipo);
    try {
      await generarTemplate(id, tipo);
      await refrescarDocumentos();
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo generar el template.');
    } finally {
      setGenerandoTipo(null);
    }
  };

  const abrirModalSubida = (documento) => {
    setUploadTarget(documento);
    setTieneFirma(false);
    setTieneHuella(false);
    setActionError('');
  };

  const handleSubirEscaneado = async (file) => {
    if (!file || !uploadTarget) return;
    setActionError('');
    setSubiendoId(uploadTarget.id);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('tieneFirma', tieneFirma);
      formData.append('tieneHuella', tieneHuella);
      await subirEscaneado(uploadTarget.id, formData);
      await refrescarDocumentos();
      setUploadTarget(null);
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo subir el documento.');
    } finally {
      setSubiendoId(null);
    }
  };

  const handleDescargar = (documento) => {
    descargarEscaneado(documento.id, documento.documento_nombre).catch(() => {
      setActionError('No se pudo descargar el documento.');
    });
  };

  const handleEliminarEscaneado = async (documento) => {
    if (!confirm('¿Eliminar el documento escaneado? El documento volverá a estado pendiente.')) return;
    setActionError('');
    try {
      await eliminarEscaneado(documento.id);
      await refrescarDocumentos();
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo eliminar el documento.');
    }
  };

  const nombreEmpleado = empleado
    ? `${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}, ${empleado.nombre || ''}`.trim()
    : null;

  const completados = documentos.filter(d => d.estado === 'completado').length;

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!salida) return <p className="text-gray-500 text-sm">Salida no encontrada.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/?tab=salidas" className="text-sm text-gray-500 hover:underline">← Volver a salidas</Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {nombreEmpleado || `Empleado #${salida.empleado_id}`}
          </h1>
          <p className="text-gray-500 text-sm">
            {TIPO_SALIDA_LABEL[salida.tipo_salida] || salida.tipo_salida} — {new Date(salida.fecha_salida).toLocaleDateString('es-MX')}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_SALIDA_COLOR[salida.estado]}`}>
          {salida.estado}
        </span>
      </div>

      <div className="bg-white rounded shadow p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Razón de salida</dt>
          <dd className="font-medium text-gray-800">{salida.razon_salida || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Salario pendiente</dt>
          <dd className="font-medium text-gray-800">
            ${Number(salida.salario_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Documentos firmados</dt>
          <dd className="font-medium text-gray-800">{salida.documentos_firmados ? 'Sí' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Progreso de documentos</dt>
          <dd className="font-medium text-gray-800">{completados}/{documentos.length} completados</dd>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-700">Progreso</h2>
          <span className="text-sm font-semibold text-gray-700">{completados}/{documentos.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-600 h-2.5 rounded-full transition-all"
            style={{ width: `${documentos.length ? (completados / documentos.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}

      <div>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Documentos requeridos</h2>
        <div className="space-y-3">
          {documentos
            .slice()
            .sort((a, b) => ORDEN_TIPOS_DOCUMENTO.indexOf(a.tipo_documento) - ORDEN_TIPOS_DOCUMENTO.indexOf(b.tipo_documento))
            .map((doc) => {
            const tipo = doc.tipo_documento;
            const tieneTemplate = !!doc?.template_contenido;
            const tieneEscaneado = !!doc?.documento_url;
            const estado = doc?.estado || 'template_generado';

            return (
              <div key={tipo} className="bg-white rounded shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">{TIPO_DOCUMENTO_LABEL[tipo]}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_DOC_COLOR[estado]}`}>
                    {ESTADO_DOC_LABEL[estado]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => handleGenerarTemplate(tipo)}
                    disabled={generandoTipo === tipo}
                    className="text-xs border border-blue-300 text-blue-700 rounded px-2 py-1 hover:bg-blue-50 disabled:opacity-50">
                    {generandoTipo === tipo ? 'Generando...' : tieneTemplate ? 'Regenerar template' : 'Generar template'}
                  </button>

                  {tieneEscaneado ? (
                    <>
                      <button
                        onClick={() => handleDescargar(doc)}
                        className="text-xs border border-emerald-300 text-emerald-700 rounded px-2 py-1 hover:bg-emerald-50">
                        ⬇ Descargar escaneado
                      </button>
                      <button
                        onClick={() => handleEliminarEscaneado(doc)}
                        className="text-xs border border-red-300 text-red-600 rounded px-2 py-1 hover:bg-red-50">
                        Eliminar escaneado
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => abrirModalSubida(doc)}
                      disabled={!tieneTemplate}
                      title={!tieneTemplate ? 'Genere el template primero' : ''}
                      className="text-xs border border-gray-300 text-gray-700 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50">
                      Subir escaneado
                    </button>
                  )}
                </div>

                {tieneTemplate && (
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer text-blue-700 hover:underline">Ver contenido del template</summary>
                    <pre className="whitespace-pre-wrap bg-gray-50 rounded p-3 mt-2 border border-gray-100">{doc.template_contenido}</pre>
                  </details>
                )}

                {tieneEscaneado && (
                  <p className="text-xs text-gray-500 mt-2">
                    Archivo: {doc.documento_nombre} ·{' '}
                    Firma: {doc.documento_tiene_firma ? 'Sí' : 'No'} ·{' '}
                    Huella: {doc.documento_tiene_huella ? 'Sí' : 'No'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {uploadTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Subir escaneado — {TIPO_DOCUMENTO_LABEL[uploadTarget.tipo_documento]}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Sube el documento escaneado con firma y huella del empleado.
            </p>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              id="documento-escaneado-input"
              className="block w-full text-sm mb-3"
            />

            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={tieneFirma} onChange={e => setTieneFirma(e.target.checked)} />
              Contiene firma
            </label>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={tieneHuella} onChange={e => setTieneHuella(e.target.checked)} />
              Contiene huella
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUploadTarget(null)}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('documento-escaneado-input');
                  const file = input?.files?.[0];
                  if (!file) {
                    setActionError('Seleccione un archivo para subir.');
                    return;
                  }
                  handleSubirEscaneado(file);
                }}
                disabled={subiendoId === uploadTarget.id}
                className="text-sm bg-blue-700 text-white rounded px-3 py-1.5 hover:bg-blue-800 disabled:opacity-50">
                {subiendoId === uploadTarget.id ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
