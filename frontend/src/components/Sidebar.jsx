import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardCheck, FileQuestion, Grid3X3,
         Users, BarChart3, Settings, LogOut, GraduationCap, Bell,
         Briefcase, UserSearch } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.platformRole || 'user';
  const isAdmin = role === 'admin';
  const isManager = role === 'admin' || role === 'manager';
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/notifications').then(r => setUnread(r.data.unread_count)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/notifications').then(r => setUnread(r.data.unread_count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const initials = (user.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">H</div>
        <h1>HR Platform</h1>
      </div>

      <nav className="sidebar-nav">
        {/* General — all users */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">General</div>
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard /> Dashboard
          </NavLink>
          <NavLink to="/my-trainings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <GraduationCap /> Mis Capacitaciones
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <Users /> Mi Perfil
          </NavLink>
        </div>

        {/* Gestión — manager and above */}
        {isManager && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Gestión</div>
            <NavLink to="/trainings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <BookOpen /> Capacitaciones
            </NavLink>
            <NavLink to="/employees" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Users /> Empleados
            </NavLink>
            <NavLink to="/skills" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Grid3X3 /> Matriz de Habilidades
            </NavLink>
          </div>
        )}

        {/* Administración — admin only */}
        {isAdmin && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Administración</div>
            <NavLink to="/exams" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <FileQuestion /> Exámenes
            </NavLink>
            <NavLink to="/skills/config" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Settings /> Configuración
            </NavLink>
          </div>
        )}

        {/* Reclutamiento — admin only */}
        {isAdmin && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Reclutamiento</div>
            <NavLink to="/recruit" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <Briefcase /> Resumen
            </NavLink>
            <NavLink to="/recruit/vacancies" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <BarChart3 /> Vacantes
            </NavLink>
            <NavLink to="/recruit/candidates" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <UserSearch /> Candidatos
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.nombre || 'Usuario'}</div>
            <div className="sidebar-user-role">{user.rol || role}</div>
          </div>
        </div>
        <button className="sidebar-link" onClick={handleLogout} style={{ marginTop: 4 }}>
          <LogOut /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

