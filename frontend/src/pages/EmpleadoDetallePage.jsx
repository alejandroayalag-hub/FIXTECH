import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEmpleado, deleteEmpleado, uploadFoto } from '../api/empleados';
import { getDocumentos, getTipos, uploadDocumento, deleteDocumento, abrirDocumento } from '../api/documentos';
import { getPagosEmpleado } from '../api/pagos';
import { descargarFormato } from '../api/formatos';
import { getSalidasByEmpleado, createSalida } from '../api/salidas';
import TabAsistencia from '../components/TabAsistencia';

const CONTRATOS_URL = import.meta.env.VITE_CONTRATOS_URL || 'http://62.238.3.136:4001';
const EMPRESA_ID = 1;

const ESTATUS_DOC_COLOR = {
  completo: 'bg-green-100 text-green-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  vencido: 'bg-red-100 text-red-800',
};

const TIPOS_SALIDA = [
  { value: 'renuncia', label: 'Renuncia' },
  { value: 'despido', label: 'Despido' },
  { value: 'jubilacion', label: 'Jubilación' },
  { value: 'otro', label: 'Otro' },
];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function EmpleadoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('documentos');
  const [pagos, setPagos] = useState([]);
  const [salidaActiva, setSalidaActiva] = useState(null);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [bajaForm, setBajaForm] = useState({ tipoSalida: 'renuncia', fechaSalida: hoyISO(), razonSalida: '', salarioPendiente: '' });
  const [bajaError, setBajaError] = useState('');
  const [creandoBaja, setCreandoBaja] = useState(false);

  useEffect(() => {
    getEmpleado(id).then(setEmpleado);
    getDocumentos(id).then(setDocumentos);
    getTipos().then(setTipos);
    getPagosEmpleado(id).then(setPagos);
    getSalidasByEmpleado(id).then(salidas => {
      setSalidaActiva(salidas.find(s => s.estado !== 'completado') || null);
    });
  }, [id]);

  const handleAbrirBaja = () => {
    setBajaForm({ tipoSalida: 'renuncia', fechaSalida: hoyISO(), razonSalida: '', salarioPendiente: '' });
    setBajaError('');
    if (!confirm('¿Confirma que desea dar de baja a este colaborador? Se iniciará el proceso de salida y se generarán los documentos requeridos (finiquito, renuncia/aviso rescisorio, entrega de materiales, baja del IMSS y encuesta de salida).')) return;
    setShowBajaModal(true);
  };

  const handleSubmitBaja = async () => {
    if (!bajaForm.fechaSalida || !bajaForm.razonSalida.trim()) {
      setBajaError('Fecha de salida y razón de salida son obligatorias.');
      return;
    }
    setBajaError('');
    setCreandoBaja(true);
    try {
      const nuevaSalida = await createSalida({
        empleadoId: id,
        empresaId: EMPRESA_ID,
        tipoSalida: bajaForm.tipoSalida,
        fechaSalida: bajaForm.fechaSalida,
        razonSalida: bajaForm.razonSalida.trim(),
        salarioPendiente: Number(bajaForm.salarioPendiente) || 0,
      });
      navigate(`/salidas/${nuevaSalida.id}`);
    } catch (err) {
      setBajaError(err.response?.data?.error || 'No se pudo iniciar la baja.');
    } finally {
      setCreandoBaja(false);
    }
  };

  const handleFoto = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('foto', file);
    const updated = await uploadFoto(id, fd);
    setEmpleado(updated);
  };

  const handleEliminar = async () => {
    if (!confirm('¿Eliminar este empleado?')) return;
    await deleteEmpleado(id);
    navigate('/');
  };

  const handleUpload = async (tipoId, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('empleado_id', id);
      fd.append('tipo_documento_id', tipoId);
      await uploadDocumento(fd);
      const docs = await getDocumentos(id);
      setDocumentos(docs);
    } catch (err) {
      alert('Error al subir: ' + (err.response?.data?.error || err.message || 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await deleteDocumento(docId);
    setDocumentos(prev => prev.filter(d => d.id !== docId));
  };


  if (!empleado) return <p className="text-gray-500">Cargando...</p>;

  const docsMap = Object.fromEntries(documentos.map(d => [d.tipo_documento_id, d]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer group relative">
            {empleado.foto ? (
              <img
                src={`/uploads/${empleado.foto.split('/').pop()}`}
                alt="Foto"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 group-hover:opacity-75 transition"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm group-hover:bg-gray-300 transition">
                Foto
              </div>
            )}
            <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
              onChange={e => handleFoto(e.target.files[0])} />
          </label>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {empleado.apellido_paterno} {empleado.apellido_materno}, {empleado.nombre}
            </h1>
            <p className="text-gray-500 text-sm">{empleado.puesto} — {empleado.departamento}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={CONTRATOS_URL} target="_blank" rel="noreferrer"
            className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800 flex items-center gap-1">
            📄 Generar contrato
          </a>
          <Link to={`/empleados/${id}/editar`}
            className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-100">
            Editar
          </Link>
          <button onClick={handleEliminar}
            className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
            Eliminar
          </button>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded shadow p-5 grid grid-cols-2 gap-4 text-sm">
        {[
          ['CURP', empleado.curp],
          ['RFC', empleado.rfc],
          ['Fecha nacimiento', empleado.fecha_nacimiento?.slice(0, 10)],
          ['Fecha ingreso', empleado.fecha_ingreso?.slice(0, 10)],
          ['Teléfono', empleado.telefono],
          ['Email', empleado.email],
          ['Dirección', empleado.direccion],
          ['Beneficiario', empleado.nombre_beneficiario],
          ['Contacto emergencia', empleado.contacto_emergencia_nombre],
          ['Tel. emergencia',     empleado.contacto_emergencia_telefono],
        ].map(([label, val]) => val ? (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-800">{val}</dd>
          </div>
        ) : null)}
      </div>

      {/* Observaciones */}
      {empleado.observaciones && (
        <div className="bg-white rounded shadow p-5 text-sm">
          <dt className="text-gray-500 mb-1">Observaciones generales</dt>
          <dd className="text-gray-800 whitespace-pre-wrap">{empleado.observaciones}</dd>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex border-b mb-4">
          {['documentos', 'pagos', 'asistencia'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'documentos' && (
          <>
            {uploading && <p className="text-sm text-blue-600 mb-2">Subiendo archivo...</p>}
            <div className="bg-white rounded shadow divide-y">
              {tipos.map(tipo => {
                const doc = docsMap[tipo.id];
                return (
                  <div key={tipo.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{tipo.nombre}</span>
                      {tipo.requerido && <span className="text-xs text-gray-400">Requerido</span>}
                      {doc && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_DOC_COLOR[doc.estatus]}`}>
                          {doc.estatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Botón de formato descargable (plantilla) */}
                      {tipo.formato_ruta && (
                        <button
                          onClick={() => descargarFormato(tipo.id, tipo.nombre)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-300 rounded px-2 py-0.5">
                          ⬇ Descargar formato
                        </button>
                      )}

                      {doc ? (
                        <>
                          <button onClick={() => abrirDocumento(doc.id, doc.filename)}
                            className="text-blue-700 text-sm hover:underline">
                            {doc.filename}
                          </button>
                          {tipo.nombre === 'Contrato de trabajo' && (
                            <a href={CONTRATOS_URL} target="_blank" rel="noreferrer"
                              className="text-purple-600 text-xs hover:underline border border-purple-300 rounded px-2 py-0.5">
                              Re-generar
                            </a>
                          )}
                          <button onClick={() => handleDeleteDoc(doc.id)}
                            className="text-red-500 text-xs hover:underline">
                            Eliminar
                          </button>
                        </>
                      ) : tipo.nombre === 'Contrato de trabajo' ? (
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer text-sm text-blue-700 hover:underline">
                            Subir archivo
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden"
                              onChange={e => handleUpload(tipo.id, e.target.files[0])} />
                          </label>
                          <span className="text-gray-300">|</span>
                          <a href={CONTRATOS_URL} target="_blank" rel="noreferrer"
                            className="text-sm text-purple-700 hover:underline font-medium">
                            Generar contrato
                          </a>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-sm text-blue-700 hover:underline">
                          Subir archivo
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc" className="hidden"
                            onChange={e => handleUpload(tipo.id, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'pagos' && (
          <div className="bg-white rounded shadow">
            {pagos.length === 0 ? (
              <p className="text-sm text-gray-400 p-5">Sin registros de pago aún. Importe un PDF desde la sección <strong>Pagos</strong>.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="px-5 py-3">Semana</th>
                    <th className="px-5 py-3">Año</th>
                    <th className="px-5 py-3">Monto</th>
                    <th className="px-5 py-3">Cuenta</th>
                    <th className="px-5 py-3">Autorizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pagos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">Semana {p.semana}</td>
                      <td className="px-5 py-3 text-gray-500">{p.anio}</td>
                      <td className="px-5 py-3 font-semibold text-green-700">
                        ${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{p.cuenta || '—'}</td>
                      <td className="px-5 py-3 text-xs">{p.autorizado || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
                    <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700">Total acumulado</td>
                    <td className="px-5 py-3 font-bold text-green-700">
                      ${pagos.reduce((s, p) => s + Number(p.monto || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {tab === 'asistencia' && <TabAsistencia empleadoId={id} />}
      </div>

      {empleado.estado !== 'inactivo' && (
        <div className="bg-white rounded shadow p-5 border border-red-100">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Baja del colaborador</h2>
          {salidaActiva ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Ya hay un proceso de salida en curso ({salidaActiva.estado}).</p>
              <Link to={`/salidas/${salidaActiva.id}`} className="text-sm text-blue-700 hover:underline">
                Ver proceso de salida →
              </Link>
            </div>
          ) : (
            <button onClick={handleAbrirBaja}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
              Dar de baja colaborador
            </button>
          )}
        </div>
      )}

      <Link to="/" className="text-sm text-gray-500 hover:underline">← Volver a empleados</Link>

      {showBajaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Dar de baja colaborador</h3>

            {bajaError && <p className="text-red-600 text-sm mb-3">{bajaError}</p>}

            <label className="block text-sm text-gray-600 mb-1">Tipo de salida</label>
            <select
              value={bajaForm.tipoSalida}
              onChange={e => setBajaForm({ ...bajaForm, tipoSalida: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-3 text-sm">
              {TIPOS_SALIDA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <label className="block text-sm text-gray-600 mb-1">Fecha de salida</label>
            <input
              type="date"
              value={bajaForm.fechaSalida}
              onChange={e => setBajaForm({ ...bajaForm, fechaSalida: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-3 text-sm" />

            <label className="block text-sm text-gray-600 mb-1">Razón de salida</label>
            <textarea
              value={bajaForm.razonSalida}
              onChange={e => setBajaForm({ ...bajaForm, razonSalida: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-3 text-sm" rows={3} />

            <label className="block text-sm text-gray-600 mb-1">Salario pendiente (opcional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bajaForm.salarioPendiente}
              onChange={e => setBajaForm({ ...bajaForm, salarioPendiente: e.target.value })}
              className="border rounded px-3 py-2 w-full mb-4 text-sm" />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBajaModal(false)}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSubmitBaja}
                disabled={creandoBaja}
                className="text-sm bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 disabled:opacity-50">
                {creandoBaja ? 'Iniciando...' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
