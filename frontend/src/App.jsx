import logo from './assets/fixtech-logo.png';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import MapeoChecadorPage from './pages/MapeoChecadorPage';
import RegistrosChecadorPage from './pages/RegistrosChecadorPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import SalidaDetailPage from './pages/SalidaDetailPage';
import CulturePage from './pages/CulturePage';
import CultureElementDetailPage from './pages/CultureElementDetailPage';
import AvisosPage from './pages/AvisosPage';
import ReporteAsistenciaPage from './pages/ReporteAsistenciaPage';
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
    <div className="min-h-screen fondo-libreta">
      <nav className="bg-white border-b-4 border-fix-naranja px-6 py-2 flex items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Fix Tech Support" className="h-10" />
          <span className="text-xs text-fix-azul font-semibold uppercase tracking-widest border-l border-gray-200 pl-3">Recursos Humanos</span>
        </div>
        <div className="ml-6 flex gap-4 flex-1">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Empleados
          </NavLink>
          <NavLink to="/pagos" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Pagos
          </NavLink>
          <NavLink to="/checador" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Checador
          </NavLink>
          <NavLink to="/formatos" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Formatos
          </NavLink>
          <NavLink to="/reportes/asistencia" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Reporte asistencia
          </NavLink>
          <NavLink to="/avisos" className={({ isActive }) => isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'}>
            Avisos
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
          <Route path="/checador" element={<RegistrosChecadorPage />} />
          <Route path="/checador/mapeo" element={<MapeoChecadorPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          <Route path="/salidas/:id" element={<SalidaDetailPage />} />
          <Route path="/avisos" element={<AvisosPage />} />
          <Route path="/reportes/asistencia" element={<ReporteAsistenciaPage />} />
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
