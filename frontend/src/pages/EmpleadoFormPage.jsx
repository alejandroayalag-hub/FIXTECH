import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmpleado, createEmpleado, updateEmpleado } from '../api/empleados';

const CAMPOS = [
  { name: 'nombre',           label: 'Nombre',             required: true },
  { name: 'apellido_paterno', label: 'Apellido paterno',    required: true },
  { name: 'apellido_materno', label: 'Apellido materno' },
  { name: 'curp',             label: 'CURP',                required: true, maxLength: 18 },
  { name: 'rfc',              label: 'RFC',                 required: true, maxLength: 13 },
  { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
  { name: 'fecha_ingreso',    label: 'Fecha de ingreso',    required: true, type: 'date' },
  { name: 'puesto',           label: 'Puesto' },
  { name: 'departamento',     label: 'Departamento' },
  { name: 'telefono',         label: 'Teléfono' },
  { name: 'email',            label: 'Email',               required: true, type: 'email' },
  { name: 'direccion',           label: 'Dirección',              multiline: true },
  { name: 'nombre_beneficiario',          label: 'Nombre del beneficiario' },
  { name: 'contacto_emergencia_nombre',   label: 'Contacto de emergencia — Nombre' },
  { name: 'contacto_emergencia_telefono', label: 'Contacto de emergencia — Teléfono' },
  { name: 'observaciones',                label: 'Observaciones generales', multiline: true },
];

export default function EmpleadoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  const [form, setForm] = useState({});
  const [estatus, setEstatus] = useState('activo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (esEdicion) {
      getEmpleado(id).then(e => {
        const { estatus: est, ...rest } = e;
        const parsed = {};
        for (const k in rest) parsed[k] = rest[k] ?? '';
        if (parsed.fecha_nacimiento) parsed.fecha_nacimiento = parsed.fecha_nacimiento.slice(0, 10);
        if (parsed.fecha_ingreso)    parsed.fecha_ingreso    = parsed.fecha_ingreso.slice(0, 10);
        setForm(parsed);
        setEstatus(est);
      });
    }
  }, [id]);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, estatus };
      if (esEdicion) {
        await updateEmpleado(id, payload);
        navigate(`/empleados/${id}`);
      } else {
        const nuevo = await createEmpleado(payload);
        navigate(`/empleados/${nuevo.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        {esEdicion ? 'Editar empleado' : 'Nuevo empleado'}
      </h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-4">
        {CAMPOS.map(c => (
          <div key={c.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {c.label} {c.required && <span className="text-red-500">*</span>}
            </label>
            {c.multiline ? (
              <textarea
                name={c.name}
                value={form[c.name] || ''}
                onChange={handleChange}
                rows={2}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            ) : (
              <input
                type={c.type || 'text'}
                name={c.name}
                value={form[c.name] || ''}
                onChange={handleChange}
                required={c.required}
                maxLength={c.maxLength}
                className="border rounded px-3 py-2 w-full text-sm"
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
          <select value={estatus} onChange={e => setEstatus(e.target.value)}
            className="border rounded px-3 py-2 text-sm">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={esEdicion ? `/empleados/${id}` : '/'} className="px-5 py-2 text-sm text-gray-600 hover:underline">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
