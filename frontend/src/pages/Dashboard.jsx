import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, FileQuestion, Target } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [myAssignments, setMyAssignments] = useState([]);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.platformRole || 'user';
  const isManager = role === 'admin' || role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    if (isManager) {
      api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
    }
    api.get('/assignments/my').then(r => setMyAssignments(r.data)).catch(() => {});
  }, []);

  const pending = myAssignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const overdue = myAssignments.filter(a => a.status === 'overdue');

  const statusBadge = (s) => {
    const map = {
      pending: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success',
      overdue: 'badge-danger', expired: 'badge-neutral',
    };
    const labels = {
      pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada',
      overdue: 'Vencida', expired: 'Expirada',
    };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Bienvenido, {user.nombre?.split(' ')[0] || 'Usuario'}</h2>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>{user.area} · {user.rol}</p>
        </div>
      </div>

      {/* KPIs for managers */}
      {isManager && stats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-label">Tasa de Completado</span>
            <span className="kpi-value" style={{ color: 'var(--success)' }}>{stats.completion_rate}%</span>
            <span className="kpi-change positive">{stats.recent_completions} esta semana</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Pendientes</span>
            <span className="kpi-value">{stats.pending}</span>
            <span className="text-sm text-muted">de {stats.total_assignments} asignadas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Vencidas</span>
            <span className="kpi-value" style={{ color: stats.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {stats.overdue}
            </span>
            <span className="text-sm text-muted">requieren atención</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Promedio Exámenes</span>
            <span className="kpi-value">{stats.exam_avg_score}</span>
            <span className="text-sm text-muted">{stats.exam_pass_rate}% aprobación</span>
          </div>
        </div>
      )}

      {/* My pending trainings */}
      <div className="card mb-24">
        <div className="card-header">
          <div>
            <div className="card-title">Mis Capacitaciones Pendientes</div>
            <div className="card-subtitle">{pending.length} pendiente{pending.length !== 1 ? 's' : ''}{overdue.length > 0 ? ` · ${overdue.length} vencida${overdue.length !== 1 ? 's' : ''}` : ''}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-trainings')}>Ver Todas</button>
        </div>

        {pending.length === 0 && overdue.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 />
            <p>No tienes capacitaciones pendientes. ¡Buen trabajo!</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Capacitación</th>
                  <th>Modo</th>
                  <th>Fecha Límite</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...overdue, ...pending].slice(0, 8).map(a => (
                  <tr key={a.id}>
                    <td className="primary-col">{a.title}</td>
                    <td>{a.delivery_mode === 'synchronous' ? 'Presencial' : 'En línea'}</td>
                    <td>{a.due_date ? new Date(a.due_date).toLocaleDateString('es-MX') : '—'}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/trainings/${a.training_id}`)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
