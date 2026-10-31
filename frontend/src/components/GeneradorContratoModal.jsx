import { useState } from 'react';
import CampoLista from './CampoLista';
import { generarContrato } from '../api/documentos';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const TIPOS_CONTRATO = [
  { id: 'individual',   icono: '📄', titulo: 'Individual',             subtitulo: 'Tiempo indeterminado',              color: '#1a2a5e', descripcion: 'Para cubrir una posición fija dentro de la empresa. No tiene fecha de término; la relación laboral continúa indefinidamente hasta que alguna de las partes decida terminarla conforme a la ley.' },
  { id: 'obra',         icono: '🏗️', titulo: 'Por obra determinada',   subtitulo: 'Servicio específico',               color: '#059669', descripcion: 'Se utiliza cuando se va a realizar un servicio o trabajo específico. El contrato concluye automáticamente cuando se termina la obra o servicio.' },
  { id: 'capacitacion', icono: '🎓', titulo: 'De capacitación',        subtitulo: 'Adquisición de habilidades',        color: '#7c3aed', descripcion: 'Se requiere cuando el trabajador necesita adquirir habilidades o conocimientos específicos antes de asumir sus funciones definitivas.' },
  { id: 'prueba',       icono: '🔍', titulo: 'A prueba',               subtitulo: 'Máx. 30 días (180 puestos directivos)', color: '#d97706', descripcion: 'Duración máxima de 30 días para puestos operativos, y hasta 180 días para puestos de dirección, gerencia o administración.' },
];

const PASOS = [
  { numero: 1, titulo: 'Trabajador',    icono: '👤', color: '#1a2a5e' },
  { numero: 2, titulo: 'Patrón',        icono: '🏢', color: '#7c3aed' },
  { numero: 3, titulo: 'Condiciones',   icono: '⚙️',  color: '#059669' },
  { numero: 4, titulo: 'Obligaciones',  icono: '📋', color: '#d97706' },
  { numero: 5, titulo: 'Prohibiciones', icono: '🚫', color: '#dc2626' },
  { numero: 6, titulo: 'Firma',         icono: '✍️',  color: '#0369a1' },
];

const REQUERIDOS_BASE = {
  1: ['nombre_trabajador','estado_civil','sabe_leer_escribir','edad','lugar_origen','curp','profesion','domicilio_trabajador','colonia','codigo_postal','telefono','nss'],
  2: ['nombre_patron','razon_social','direccion_empresa','colonia_empresa','cp_empresa','ciudad','giro_empresa'],
  3: ['puesto','dir_trabajo','colonia_trabajo','cp_trabajo','hora_entrada','hora_salida','descanso_inicio','descanso_fin','salario_diario','lugar_pago','nombre_capacitador'],
  4: [],
  5: [],
  6: ['nombre_beneficiario','fecha_inicio_dia','fecha_inicio_mes','fecha_inicio_anio','lugar_firma','fecha_firma_dia','fecha_firma_mes','fecha_firma_anio'],
};

const CAMPOS_EXTRA = {
  obra:         ['descripcion_obra'],
  capacitacion: ['habilidades_desarrollar','metodo_evaluacion'],
  prueba:       ['duracion_prueba'],
  individual:   [],
};

const LABELS = {
  nombre_trabajador: 'Nombre completo', estado_civil: 'Estado civil',
  sabe_leer_escribir: 'Sabe leer y escribir', edad: 'Edad',
  lugar_origen: 'Lugar de origen', curp: 'CURP', profesion: 'Profesión',
  domicilio_trabajador: 'Calle y número', colonia: 'Colonia', codigo_postal: 'Código postal',
  telefono: 'Teléfono', email: 'Correo electrónico', nss: 'NSS (IMSS)',
  nombre_patron: 'Representante legal', razon_social: 'Razón social',
  direccion_empresa: 'Calle y número', colonia_empresa: 'Colonia', cp_empresa: 'Código postal',
  ciudad: 'Ciudad', giro_empresa: 'Giro / actividad',
  puesto: 'Puesto', dir_trabajo: 'Calle y número', colonia_trabajo: 'Colonia', cp_trabajo: 'Código postal',
  hora_entrada: 'Hora de entrada', hora_salida: 'Hora de salida',
  descanso_inicio: 'Descanso inicio', descanso_fin: 'Descanso fin',
  salario_diario: 'Salario diario', lugar_pago: 'Lugar de pago',
  nombre_capacitador: 'Nombre del capacitador',
  descripcion_obra: 'Descripción de la obra o servicio',
  habilidades_desarrollar: 'Habilidades y conocimientos a desarrollar',
  metodo_evaluacion: 'Método de evaluación al término del contrato',
  duracion_prueba: 'Duración del período de prueba (días)',
  nombre_beneficiario: 'Nombre del beneficiario',
  fecha_inicio_dia: 'Día de inicio', fecha_inicio_mes: 'Mes de inicio', fecha_inicio_anio: 'Año de inicio',
  lugar_firma: 'Lugar de firma',
  fecha_firma_dia: 'Día de firma', fecha_firma_mes: 'Mes de firma', fecha_firma_anio: 'Año de firma',
};

const SUGERENCIAS_PROHIBICIONES = [
  'I. Ejecutar cualquier acto que pueda poner en peligro su propia seguridad, la de sus compañeros de trabajo o la de terceras personas, así como la de los establecimientos o lugares en que el trabajo se desempeñe.',
  'II. Faltar al trabajo sin causa justificada o sin permiso del patrón.',
  'III. Sustraer de la empresa o establecimiento útiles de trabajo o materia prima o elaborada.',
  'IV. Presentarse al trabajo en estado de embriaguez.',
  'V. Presentarse al trabajo bajo la influencia de algún narcótico o droga enervante, salvo que exista prescripción médica.',
  'VI. Portar armas de cualquier clase durante las horas de trabajo, salvo que la naturaleza de éste lo exija.',
  'VII. Suspender las labores sin autorización del patrón.',
  'VIII. Hacer colectas en el establecimiento o lugar de trabajo.',
  'IX. Usar los útiles y herramientas suministrados por el patrón para objeto distinto de aquél a que están destinados.',
  'X. Hacer cualquier clase de propaganda en las horas de trabajo, dentro del establecimiento.',
  'XI. Acosar sexualmente a cualquier persona o realizar actos inmorales en los lugares de trabajo.',
  'El uso del teléfono celular personal durante el horario laboral.',
  'El mal uso de las herramientas, mobiliario, activos y bienes generales de la empresa.',
  'Consumir alimentos fuera de las áreas designadas para ello.',
  'Recibir regalos, comisiones o cualquier beneficio personal a nombre de la empresa o en razón de su trabajo.',
];

const SUGERENCIAS_OBLIGACIONES = [
  'Presentarse con 10 minutos de antelación al inicio del turno.',
  'Presentarse limpio y presentable a la hora de entrada.',
  'Mantener limpio y ordenado su lugar de trabajo.',
  'I. Cumplir las disposiciones de las normas de trabajo que les sean aplicables.',
  'II. Observar las disposiciones contenidas en el reglamento y las normas oficiales mexicanas en materia de seguridad, salud y medio ambiente de trabajo.',
  'III. Desempeñar el servicio bajo la dirección del patrón o de su representante, a cuya autoridad estarán subordinados en todo lo concerniente al trabajo.',
  'IV. Ejecutar el trabajo con la intensidad, cuidado y esmero apropiados y en la forma, tiempo y lugar convenidos.',
  'V. Dar aviso inmediato al patrón, salvo caso fortuito o de fuerza mayor, de las causas justificadas que le impidan concurrir a su trabajo.',
  'VI. Restituir al patrón los materiales no usados y conservar en buen estado los instrumentos y útiles que les haya dado para el trabajo.',
  'VII. Observar buenas costumbres durante el servicio.',
  'VIII. Prestar auxilios en cualquier tiempo que se necesiten, cuando por siniestro o riesgo inminente peligren las personas o los intereses del patrón o de sus compañeros de trabajo.',
  'IX. Integrar los organismos que establece esta Ley.',
  'X. Someterse a los reconocimientos médicos previstos en el reglamento interior y demás normas vigentes en la empresa.',
  'XI. Poner en conocimiento del patrón las enfermedades contagiosas que padezcan, tan pronto como tengan conocimiento de las mismas.',
  'XII. Comunicar al patrón o a su representante las deficiencias que adviertan, a fin de evitar daños o perjuicios.',
  'XIII. Guardar escrupulosamente los secretos técnicos, comerciales y de fabricación de los productos a cuya elaboración concurran directa o indirectamente.',
];

const cs = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  label: { fontSize: 15, fontWeight: 700, color: '#374151', letterSpacing: '0.01em' },
  input: (error) => ({
    border: `2px solid ${error ? '#f87171' : '#d1d5db'}`,
    borderRadius: 12, padding: '14px 18px', fontSize: 17,
    background: error ? '#fff5f5' : '#f9fafb', outline: 'none',
    transition: 'border-color 0.2s, background 0.2s', width: '100%', boxSizing: 'border-box',
  }),
  error: { fontSize: 14, color: '#ef4444', fontWeight: 600, marginTop: 2 },
};

const Input = ({ label, name, value, onChange, placeholder = '', error }) => (
  <div style={cs.wrapper}>
    <label style={cs.label}>{label}</label>
    <input type="text" name={name} value={value} onChange={onChange} placeholder={placeholder}
      style={cs.input(error)}
      onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#f87171' : '#d1d5db'; e.target.style.background = error ? '#fff5f5' : '#f9fafb'; }}
    />
    {error && <span style={cs.error}>{error}</span>}
  </div>
);

const Textarea = ({ label, name, value, onChange, placeholder = '', error }) => (
  <div style={cs.wrapper}>
    <label style={cs.label}>{label}</label>
    <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={4}
      style={{ ...cs.input(error), resize: 'vertical', fontFamily: 'inherit' }}
      onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#f87171' : '#d1d5db'; e.target.style.background = error ? '#fff5f5' : '#f9fafb'; }}
    />
    {error && <span style={cs.error}>{error}</span>}
  </div>
);

const Select = ({ label, name, value, onChange, options, error }) => (
  <div style={cs.wrapper}>
    <label style={cs.label}>{label}</label>
    <select name={name} value={value} onChange={onChange} style={cs.input(error)}>
      <option value="">Seleccionar...</option>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
    {error && <span style={cs.error}>{error}</span>}
  </div>
);

const Seccion = ({ titulo }) => (
  <div style={{ borderTop: '2px solid #e5e7eb', marginTop: 8, marginBottom: 28, paddingTop: 24 }}>
    <p style={{ fontSize: 13, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{titulo}</p>
  </div>
);

export default function GeneradorContratoModal({ empleado, onClose, onSuccess }) {
  const nombreCompleto = [empleado.nombre, empleado.apellido_paterno, empleado.apellido_materno]
    .filter(Boolean).join(' ');

  const fechaIngreso = empleado.fecha_ingreso
    ? new Date(empleado.fecha_ingreso.slice(0, 10) + 'T12:00:00')
    : new Date();

  const hoy = new Date();

  const [tipoContrato, setTipoContrato] = useState(null);
  const [tipoSeleccionando, setTipoSeleccionando] = useState(null);
  const [paso, setPaso] = useState(1);
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [enviado, setEnviado] = useState(false);

  const [form, setForm] = useState({
    nombre_trabajador:    nombreCompleto,
    estado_civil:         '',
    sabe_leer_escribir:   '',
    edad:                 '',
    lugar_origen:         '',
    curp:                 empleado.curp     || '',
    profesion:            '',
    domicilio_trabajador: empleado.direccion || '',
    colonia:              '',
    codigo_postal:        '',
    telefono:             empleado.telefono || '',
    email:                empleado.email    || '',
    nss:                  '',
    nombre_patron:        '',
    razon_social:         '',
    direccion_empresa:    '',
    colonia_empresa:      '',
    cp_empresa:           '',
    ciudad:               '',
    giro_empresa:         '',
    puesto:               empleado.puesto   || '',
    dir_trabajo:          '',
    colonia_trabajo:      '',
    cp_trabajo:           '',
    hora_entrada:         '',
    hora_salida:          '',
    descanso_inicio:      '',
    descanso_fin:         '',
    salario_diario:       '',
    lugar_pago:           '',
    nombre_capacitador:   '',
    descripcion_obra:     '',
    habilidades_desarrollar: '',
    metodo_evaluacion:    '',
    duracion_prueba:      '',
    nombre_beneficiario:  empleado.nombre_beneficiario || '',
    fecha_inicio_dia:     String(fechaIngreso.getDate()),
    fecha_inicio_mes:     MESES[fechaIngreso.getMonth()],
    fecha_inicio_anio:    String(fechaIngreso.getFullYear()),
    lugar_firma:          '',
    fecha_firma_dia:      String(hoy.getDate()),
    fecha_firma_mes:      MESES[hoy.getMonth()],
    fecha_firma_anio:     String(hoy.getFullYear()),
  });

  const [obligaciones, setObligaciones] = useState(['']);
  const [prohibiciones, setProhibiciones] = useState(['']);
  const [sugerenciasObl, setSugerenciasObl] = useState(new Set());
  const [sugerenciasProh, setSugerenciasProh] = useState(new Set());

  const toggleSugerenciaObl  = t => setSugerenciasObl(prev  => { const s = new Set(prev);  s.has(t) ? s.delete(t) : s.add(t); return s; });
  const toggleSugerenciaProh = t => setSugerenciasProh(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });

  const agregarSugerenciasObl = () => {
    if (!sugerenciasObl.size) return;
    const base = obligaciones.filter(o => o.trim());
    setObligaciones([...base, ...[...sugerenciasObl].filter(s => !base.includes(s)), '']);
    setSugerenciasObl(new Set());
  };

  const agregarSugerenciasProh = () => {
    if (!sugerenciasProh.size) return;
    const base = prohibiciones.filter(p => p.trim());
    setProhibiciones([...base, ...[...sugerenciasProh].filter(s => !base.includes(s)), '']);
    setSugerenciasProh(new Set());
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const requeridos = (num) => {
    const base = [...(REQUERIDOS_BASE[num] || [])];
    if (num === 3) base.push(...(CAMPOS_EXTRA[tipoContrato] || []));
    return base;
  };

  const validarPaso = (num) => {
    const nuevosErrores = {};
    requeridos(num).forEach(campo => {
      if (!form[campo] || !form[campo].trim())
        nuevosErrores[campo] = `${LABELS[campo]} es requerido`;
    });
    if (num === 1 && form.curp && form.curp.trim().length !== 18)
      nuevosErrores['curp'] = 'La CURP debe tener 18 caracteres';
    if (num === 1 && form.nss && !/^\d{11}$/.test(form.nss.trim()))
      nuevosErrores['nss'] = 'El NSS debe tener exactamente 11 dígitos numéricos';
    if (num === 3 && form.salario_diario) {
      const sal = parseFloat(form.salario_diario);
      if (isNaN(sal) || sal < 315.04)
        nuevosErrores['salario_diario'] = 'El salario no puede ser menor al mínimo vigente ($315.04)';
    }
    if (num === 3 && tipoContrato === 'prueba' && form.duracion_prueba) {
      const dias = parseInt(form.duracion_prueba);
      if (isNaN(dias) || dias < 1 || dias > 180)
        nuevosErrores['duracion_prueba'] = 'La duración debe ser entre 1 y 180 días';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const siguiente = () => { if (validarPaso(paso)) setPaso(p => Math.min(p + 1, 6)); };
  const anterior  = () => { setErrores({}); setPaso(p => Math.max(p - 1, 1)); };

  const handleSubmit = async () => {
    if (!validarPaso(6)) return;
    setErrorGlobal('');
    setLoading(true);
    try {
      const docRecord = await generarContrato(empleado.id, {
        ...form,
        tipo_contrato: tipoContrato,
        obligaciones:  obligaciones.filter(o => o.trim()),
        prohibiciones: prohibiciones.filter(p => p.trim()),
      });
      setEnviado(true);
      onSuccess(docRecord);
    } catch (err) {
      setErrorGlobal(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const tipoInfo    = TIPOS_CONTRATO.find(t => t.id === tipoContrato);
  const pasoActual  = PASOS[paso - 1];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, overflowY: 'auto', padding: '24px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', paddingBottom: 32 }}>

        {/* Botón cerrar */}
        <button onClick={onClose}
          style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, background: 'white', border: 'none',
            borderRadius: '50%', width: 36, height: 36, fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontWeight: 700 }}>
          ×
        </button>

        {/* ── SELECCIÓN DE TIPO ─────────────────────────────────── */}
        {!tipoContrato && (
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', overflow: 'hidden', marginTop: 40 }}>
            <div style={{ background: '#1a2a5e', color: 'white', padding: '28px 36px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📑</div>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Generar contrato — {nombreCompleto}</h2>
              <p style={{ fontSize: 15, opacity: 0.85, marginTop: 6 }}>Seleccione el tipo de contrato a generar</p>
            </div>

            <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TIPOS_CONTRATO.map(tipo => {
                const sel = tipoSeleccionando === tipo.id;
                return (
                  <div key={tipo.id} onClick={() => setTipoSeleccionando(tipo.id)}
                    style={{ border: `2px solid ${sel ? tipo.color : '#e5e7eb'}`, borderRadius: 14,
                      padding: '18px 22px', cursor: 'pointer', background: sel ? `${tipo.color}08` : 'white',
                      transition: 'all 0.2s', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: sel ? tipo.color : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {tipo.icono}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: sel ? tipo.color : '#1e293b' }}>{tipo.titulo}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sel ? tipo.color : '#94a3b8',
                          background: sel ? `${tipo.color}18` : '#f1f5f9', borderRadius: 20, padding: '2px 8px' }}>
                          {tipo.subtitulo}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{tipo.descripcion}</p>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: `2px solid ${sel ? tipo.color : '#d1d5db'}`,
                      background: sel ? tipo.color : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '0 36px 28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => tipoSeleccionando && setTipoContrato(tipoSeleccionando)}
                disabled={!tipoSeleccionando}
                style={{ padding: '14px 42px', borderRadius: 14, border: 'none', fontWeight: 800, fontSize: 15,
                  background: tipoSeleccionando ? TIPOS_CONTRATO.find(t => t.id === tipoSeleccionando)?.color : '#e2e8f0',
                  color: tipoSeleccionando ? 'white' : '#94a3b8',
                  cursor: tipoSeleccionando ? 'pointer' : 'not-allowed',
                  boxShadow: tipoSeleccionando ? '0 4px 14px rgba(0,0,0,0.2)' : 'none' }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── WIZARD 6 PASOS ─────────────────────────────────────── */}
        {tipoContrato && (
          <>
            {/* Badge tipo + cambiar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 44, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: `${tipoInfo.color}15`, border: `1.5px solid ${tipoInfo.color}40`,
                borderRadius: 20, padding: '6px 14px' }}>
                <span style={{ fontSize: 15 }}>{tipoInfo.icono}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: tipoInfo.color }}>{tipoInfo.titulo}</span>
              </div>
              <button type="button" onClick={() => { setTipoContrato(null); setTipoSeleccionando(null); setPaso(1); setErrores({}); }}
                style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Cambiar tipo
              </button>
            </div>

            {/* Indicador de pasos */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 0 }}>
              {PASOS.map((p, i) => {
                const completado = p.numero < paso;
                const activo = p.numero === paso;
                return (
                  <div key={p.numero} style={{ display: 'flex', alignItems: 'center', flex: i < PASOS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: completado ? '#22c55e' : activo ? p.color : '#e2e8f0',
                        color: completado || activo ? 'white' : '#94a3b8',
                        fontSize: completado ? 16 : 14, fontWeight: 700,
                        boxShadow: activo ? `0 0 0 4px ${p.color}33` : 'none' }}>
                        {completado ? '✓' : p.numero}
                      </div>
                      <span style={{ fontSize: 10, color: activo ? p.color : '#94a3b8', fontWeight: activo ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {p.titulo}
                      </span>
                    </div>
                    {i < PASOS.length - 1 && (
                      <div style={{ flex: 1, height: 3, background: completado ? '#22c55e' : '#e2e8f0',
                        margin: '0 4px', marginBottom: 18, borderRadius: 2 }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tarjeta del paso */}
            <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: pasoActual.color, color: 'white', padding: '22px 32px' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{pasoActual.icono}</div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Paso {paso} de 6 — {pasoActual.titulo}</h2>
                <p style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                  {paso === 1 && 'Datos personales del trabajador'}
                  {paso === 2 && 'Datos de la empresa o patrón'}
                  {paso === 3 && 'Condiciones de trabajo'}
                  {paso === 4 && 'Obligaciones específicas del trabajador'}
                  {paso === 5 && 'Actividades prohibidas por el patrón'}
                  {paso === 6 && 'Beneficiario y fechas de firma'}
                </p>
              </div>

              <div style={{ padding: '32px 36px' }}>

                {paso === 1 && (<>
                  <Input label="Nombre completo" name="nombre_trabajador" value={form.nombre_trabajador} onChange={handleChange} error={errores.nombre_trabajador} />
                  <Select label="Estado civil" name="estado_civil" value={form.estado_civil} onChange={handleChange} error={errores.estado_civil}
                    options={['Soltero(a)','Casado(a)','Unión libre','Divorciado(a)','Viudo(a)']} />
                  <Select label="Sabe leer y escribir" name="sabe_leer_escribir" value={form.sabe_leer_escribir} onChange={handleChange} error={errores.sabe_leer_escribir}
                    options={[{value:'Sí',label:'Sí'},{value:'No',label:'No'}]} />
                  <Input label="Edad" name="edad" value={form.edad} onChange={handleChange} error={errores.edad} placeholder="ej. 25" />
                  <Input label="Lugar de origen" name="lugar_origen" value={form.lugar_origen} onChange={handleChange} error={errores.lugar_origen} />
                  <Input label="CURP (18 caracteres)" name="curp" value={form.curp} onChange={handleChange} error={errores.curp} placeholder="XXXX000000XXXXXX00" />
                  <Input label="Profesión" name="profesion" value={form.profesion} onChange={handleChange} error={errores.profesion} />
                  <Input label="Calle y número" name="domicilio_trabajador" value={form.domicilio_trabajador} onChange={handleChange} error={errores.domicilio_trabajador} />
                  <Input label="Colonia" name="colonia" value={form.colonia} onChange={handleChange} error={errores.colonia} />
                  <Input label="Código postal" name="codigo_postal" value={form.codigo_postal} onChange={handleChange} error={errores.codigo_postal} placeholder="ej. 06600" />
                  <Input label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} error={errores.telefono} />
                  <Input label="Correo electrónico" name="email" value={form.email} onChange={handleChange} placeholder="ej. nombre@correo.com" />
                  <Input label="NSS (IMSS)" name="nss" value={form.nss} onChange={handleChange} error={errores.nss} />
                </>)}

                {paso === 2 && (<>
                  <Input label="Representante legal de la empresa" name="nombre_patron" value={form.nombre_patron} onChange={handleChange} error={errores.nombre_patron} />
                  <Input label="Razón social" name="razon_social" value={form.razon_social} onChange={handleChange} error={errores.razon_social} />
                  <Input label="Giro / actividad" name="giro_empresa" value={form.giro_empresa} onChange={handleChange} error={errores.giro_empresa} />
                  <Seccion titulo="Domicilio de la empresa" />
                  <Input label="Calle y número" name="direccion_empresa" value={form.direccion_empresa} onChange={handleChange} error={errores.direccion_empresa} />
                  <Input label="Colonia" name="colonia_empresa" value={form.colonia_empresa} onChange={handleChange} error={errores.colonia_empresa} />
                  <Input label="Código postal" name="cp_empresa" value={form.cp_empresa} onChange={handleChange} error={errores.cp_empresa} placeholder="ej. 06600" />
                  <Input label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} error={errores.ciudad} />
                </>)}

                {paso === 3 && (<>
                  <Input label="Puesto" name="puesto" value={form.puesto} onChange={handleChange} error={errores.puesto} />
                  <Seccion titulo="Lugar donde se prestará el servicio" />
                  <Input label="Calle y número" name="dir_trabajo" value={form.dir_trabajo} onChange={handleChange} error={errores.dir_trabajo} />
                  <Input label="Colonia" name="colonia_trabajo" value={form.colonia_trabajo} onChange={handleChange} error={errores.colonia_trabajo} />
                  <Input label="Código postal" name="cp_trabajo" value={form.cp_trabajo} onChange={handleChange} error={errores.cp_trabajo} placeholder="ej. 06600" />
                  <Seccion titulo="Horario de trabajo" />
                  <Input label="Hora de entrada" name="hora_entrada" value={form.hora_entrada} onChange={handleChange} error={errores.hora_entrada} placeholder="ej. 08:00" />
                  <Input label="Hora de salida" name="hora_salida" value={form.hora_salida} onChange={handleChange} error={errores.hora_salida} placeholder="ej. 17:00" />
                  <Input label="Descanso inicio" name="descanso_inicio" value={form.descanso_inicio} onChange={handleChange} error={errores.descanso_inicio} placeholder="ej. 14:00" />
                  <Input label="Descanso fin" name="descanso_fin" value={form.descanso_fin} onChange={handleChange} error={errores.descanso_fin} placeholder="ej. 15:00" />
                  <Input label="Salario diario ($)" name="salario_diario" value={form.salario_diario} onChange={handleChange} error={errores.salario_diario} placeholder="ej. 315.04" />
                  <Input label="Lugar de pago" name="lugar_pago" value={form.lugar_pago} onChange={handleChange} error={errores.lugar_pago} />
                  <Input label="Nombre del capacitador" name="nombre_capacitador" value={form.nombre_capacitador} onChange={handleChange} error={errores.nombre_capacitador} />
                  {tipoContrato === 'obra' && (<>
                    <Seccion titulo="Datos específicos — Obra o servicio determinado" />
                    <Textarea label="Descripción de la obra o servicio" name="descripcion_obra" value={form.descripcion_obra} onChange={handleChange} error={errores.descripcion_obra}
                      placeholder="Describa el trabajo o servicio específico..." />
                  </>)}
                  {tipoContrato === 'capacitacion' && (<>
                    <Seccion titulo="Datos específicos — Contrato de capacitación" />
                    <Textarea label="Habilidades y conocimientos a desarrollar" name="habilidades_desarrollar" value={form.habilidades_desarrollar} onChange={handleChange} error={errores.habilidades_desarrollar} placeholder="Habilidades a adquirir..." />
                    <Textarea label="Método de evaluación al término del contrato" name="metodo_evaluacion" value={form.metodo_evaluacion} onChange={handleChange} error={errores.metodo_evaluacion} placeholder="¿Cómo será evaluado el trabajador?" />
                  </>)}
                  {tipoContrato === 'prueba' && (<>
                    <Seccion titulo="Datos específicos — Período de prueba" />
                    <Input label="Duración del período de prueba (días)" name="duracion_prueba" value={form.duracion_prueba} onChange={handleChange} error={errores.duracion_prueba} placeholder="Máx. 30 días (operativo) o 180 días (directivo)" />
                    <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 28 }}>
                      <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6, margin: 0 }}>
                        <strong>Recuerde:</strong> Si al vencimiento del período no se notifica la terminación, el contrato se convierte automáticamente en indefinido.
                      </p>
                    </div>
                  </>)}
                </>)}

                {paso === 4 && (
                  <div>
                    <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 20, lineHeight: 1.7, fontWeight: 600 }}>
                      Enumere lo que requiera que haga el trabajador. Si no está en el contrato, el trabajador no está obligado a hacerlo.
                    </p>
                    <div style={{ background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Sugerencias
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="button" onClick={() => setSugerenciasObl(new Set(SUGERENCIAS_OBLIGACIONES))}
                            style={{ fontSize: 12, color: '#d97706', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            Seleccionar todas
                          </button>
                          <button type="button" onClick={() => setSugerenciasObl(new Set())}
                            style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {SUGERENCIAS_OBLIGACIONES.map((s, i) => (
                          <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input type="checkbox" checked={sugerenciasObl.has(s)} onChange={() => toggleSugerenciaObl(s)}
                              style={{ marginTop: 3, width: 16, height: 16, accentColor: '#d97706', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>{s}</span>
                          </label>
                        ))}
                      </div>
                      <button type="button" onClick={agregarSugerenciasObl} disabled={sugerenciasObl.size === 0}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: sugerenciasObl.size === 0 ? 'not-allowed' : 'pointer',
                          background: sugerenciasObl.size === 0 ? '#e5e7eb' : '#d97706',
                          color: sugerenciasObl.size === 0 ? '#9ca3af' : 'white', fontWeight: 700, fontSize: 14 }}>
                        Agregar {sugerenciasObl.size > 0 ? `${sugerenciasObl.size} sugerencia${sugerenciasObl.size > 1 ? 's' : ''}` : 'sugerencias'}
                      </button>
                    </div>
                    <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, fontWeight: 600 }}>Obligaciones del contrato:</p>
                    <CampoLista items={obligaciones} onChange={setObligaciones} />
                  </div>
                )}

                {paso === 5 && (
                  <div>
                    <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 20, lineHeight: 1.7, fontWeight: 600 }}>
                      Enumere las actividades prohibidas para el trabajador (Art. 135 LFT).
                    </p>
                    <div style={{ background: '#fff1f2', border: '2px solid #fca5a5', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Sugerencias — Art. 135 LFT y adicionales
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="button" onClick={() => setSugerenciasProh(new Set(SUGERENCIAS_PROHIBICIONES))}
                            style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            Seleccionar todas
                          </button>
                          <button type="button" onClick={() => setSugerenciasProh(new Set())}
                            style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {SUGERENCIAS_PROHIBICIONES.map((s, i) => (
                          <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input type="checkbox" checked={sugerenciasProh.has(s)} onChange={() => toggleSugerenciaProh(s)}
                              style={{ marginTop: 3, width: 16, height: 16, accentColor: '#dc2626', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{s}</span>
                          </label>
                        ))}
                      </div>
                      <button type="button" onClick={agregarSugerenciasProh} disabled={sugerenciasProh.size === 0}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: sugerenciasProh.size === 0 ? 'not-allowed' : 'pointer',
                          background: sugerenciasProh.size === 0 ? '#e5e7eb' : '#dc2626',
                          color: sugerenciasProh.size === 0 ? '#9ca3af' : 'white', fontWeight: 700, fontSize: 14 }}>
                        Agregar {sugerenciasProh.size > 0 ? `${sugerenciasProh.size} prohibición${sugerenciasProh.size > 1 ? 'es' : ''}` : 'prohibiciones'}
                      </button>
                    </div>
                    <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, fontWeight: 600 }}>Prohibiciones del contrato:</p>
                    <CampoLista items={prohibiciones} onChange={setProhibiciones} />
                  </div>
                )}

                {paso === 6 && (<>
                  <Input label="Nombre del beneficiario (Art. 501 LFT)" name="nombre_beneficiario" value={form.nombre_beneficiario} onChange={handleChange} error={errores.nombre_beneficiario} />
                  <Seccion titulo="Fecha de inicio de relación laboral" />
                  <Input label="Día" name="fecha_inicio_dia" value={form.fecha_inicio_dia} onChange={handleChange} error={errores.fecha_inicio_dia} />
                  <Select label="Mes" name="fecha_inicio_mes" value={form.fecha_inicio_mes} onChange={handleChange} options={MESES} error={errores.fecha_inicio_mes} />
                  <Input label="Año" name="fecha_inicio_anio" value={form.fecha_inicio_anio} onChange={handleChange} error={errores.fecha_inicio_anio} />
                  <Seccion titulo="Lugar y fecha de firma" />
                  <Input label="Lugar de firma" name="lugar_firma" value={form.lugar_firma} onChange={handleChange} error={errores.lugar_firma} />
                  <Input label="Día" name="fecha_firma_dia" value={form.fecha_firma_dia} onChange={handleChange} error={errores.fecha_firma_dia} />
                  <Select label="Mes" name="fecha_firma_mes" value={form.fecha_firma_mes} onChange={handleChange} options={MESES} error={errores.fecha_firma_mes} />
                  <Input label="Año" name="fecha_firma_anio" value={form.fecha_firma_anio} onChange={handleChange} error={errores.fecha_firma_anio} />
                </>)}

              </div>
            </div>

            {enviado && (
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: '24px 28px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>✅</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#166534', marginBottom: 6 }}>¡Contrato generado y guardado!</h3>
                <p style={{ fontSize: 14, color: '#15803d', lineHeight: 1.7, marginBottom: 18 }}>
                  El contrato de <strong>{form.nombre_trabajador}</strong> fue generado y guardado en el expediente.
                </p>
                <button type="button" onClick={onClose}
                  style={{ padding: '12px 28px', borderRadius: 12, background: '#16a34a', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                  Cerrar
                </button>
              </div>
            )}

            {!enviado && (<>
              {errorGlobal && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 20px', marginBottom: 14, color: '#dc2626', fontSize: 14 }}>
                  {errorGlobal}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                <button type="button" onClick={anterior} disabled={paso === 1}
                  style={{ padding: '14px 30px', borderRadius: 14, border: '2px solid #e2e8f0', background: 'white',
                    color: paso === 1 ? '#cbd5e1' : '#475569', fontWeight: 700, fontSize: 15, cursor: paso === 1 ? 'not-allowed' : 'pointer' }}>
                  ← Anterior
                </button>
                {paso < 6 ? (
                  <button type="button" onClick={siguiente}
                    style={{ padding: '14px 40px', borderRadius: 14, background: pasoActual.color, color: 'white',
                      fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                      boxShadow: `0 4px 14px ${pasoActual.color}55` }}>
                    Siguiente →
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={loading}
                    style={{ padding: '14px 40px', borderRadius: 14, background: loading ? '#94a3b8' : '#1a2a5e', color: 'white',
                      fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 14px rgba(26,42,94,0.4)' }}>
                    {loading ? 'Generando...' : '📄 Generar y guardar contrato'}
                  </button>
                )}
              </div>
            </>)}
          </>
        )}

      </div>
    </div>
  );
}
