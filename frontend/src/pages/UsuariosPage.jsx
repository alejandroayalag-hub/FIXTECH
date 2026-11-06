import { useEffect, useState } from 'react';
import { getUsuarios, crearUsuario, actualizarUsuario, borrarUsuario, sesion } from '../api/usuarios';

const msgError = (e) => e.response?.data?.error || 'Error de conexión';
const VACIO = { nombre: '', email: '', password: '', role: 'rh' };
const ROLES = {
  admin: 'Administrador — todo, incluye usuarios y cultura',
  rh: 'Recursos Humanos — empleados, pagos, checador, reportes (sin usuarios ni editar cultura)',
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const yo = sesion().id;

  const cargar = async () => {
    try { setUsuarios(await getUsuarios()); } catch (e) { setError(msgError(e)); }
  };
  useEffect(() => { cargar(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cancelar = () => { setEditando(null); setForm(VACIO); setError(''); };
  const editar = (u) => { setError(''); setEditando(u); setForm({ nombre: u.nombre, email: u.email, password: '', role: u.role }); };

  const guardar = async (e) => {
    e.preventDefault();
    setError(''); setGuardando(true);
    try {
      if (editando) await actualizarUsuario(editando.id, { nombre: form.nombre, role: form.role, password: form.password || undefined });
      else await crearUsuario(form);
      cancelar();
      await cargar();
    } catch (err) { setError(msgError(err)); }
    setGuardando(false);
  };

  const borrar = async (u) => {
    if (!window.confirm(`¿Borrar al usuario ${u.nombre} (${u.email})?`)) return;
    setError('');
    try { await borrarUsuario(u.id); if (editando?.id === u.id) cancelar(); await cargar(); }
    catch (err) { setError(msgError(err)); }
  };

  const inp = 'border border-gray-300 rounded px-3 py-2 text-sm w-full';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Usuarios del panel</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

      <form onSubmit={guardar} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid gap-3 sm:grid-cols-2">
        {editando && <p className="sm:col-span-2 text-sm font-medium text-blue-700">Editando: {editando.email}</p>}
        <input className={inp} placeholder="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <input className={inp} type="email" placeholder="Email" value={form.email} onChange={set('email')} required disabled={!!editando} />
        <input className={inp} type="password" autoComplete="new-password" minLength={8}
          placeholder={editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña (mín. 8)'}
          value={form.password} onChange={set('password')} required={!editando} />
        <select className={inp} value={form.role} onChange={set('role')} disabled={editando?.id === yo}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="sm:col-span-2 flex gap-2">
          <button disabled={guardando} className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50">
            {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          {editando && <button type="button" onClick={cancelar} className="border border-gray-300 text-sm px-4 py-2 rounded hover:bg-gray-50">Cancelar</button>}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr><th className="px-4 py-2">Nombre</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Rol</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{u.nombre}{u.id === yo && <span className="text-xs text-gray-400"> (tú)</span>}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'RH'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => editar(u)} className="text-blue-700 hover:underline text-xs mr-3">Editar</button>
                  {u.id !== yo && <button onClick={() => borrar(u)} className="text-red-600 hover:underline text-xs">Borrar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
