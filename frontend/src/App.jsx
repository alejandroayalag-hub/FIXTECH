import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import MapeoChecadorPage from './pages/MapeoChecadorPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import SalidaDetailPage from './pages/SalidaDetailPage';
import CulturePage from './pages/CulturePage';
import CultureElementDetailPage from './pages/CultureElementDetailPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function Layout() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-4 shadow-sm">
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-gray-800 text-base tracking-wide">Fix Tech Support</span>
          <span className="text-xs text-gray-500 uppercase tracking-widest">Recursos Humanos</span>
        </div>
        <div className="ml-6 flex gap-4 flex-1">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Empleados
          </NavLink>
          <NavLink to="/pagos" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Pagos
          </NavLink>
          <NavLink to="/checador/mapeo" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Checador
          </NavLink>
          <NavLink to="/formatos" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Formatos
          </NavLink>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/cultura" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Cultura
          </NavLink>
          <span className="text-sm text-gray-500">{nombre}</span>
          <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<EmpleadosPage />} />
          <Route path="/empleados/nuevo" element={<EmpleadoFormPage />} />
          <Route path="/empleados/:id" element={<EmpleadoDetallePage />} />
          <Route path="/empleados/:id/editar" element={<EmpleadoFormPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/checador/mapeo" element={<MapeoChecadorPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          <Route path="/salidas/:id" element={<SalidaDetailPage />} />
          <Route path="/cultura" element={<CulturePage />} />
          <Route path="/cultura/:culturaId" element={<CultureElementDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
