import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, FileQuestion, Target, Briefcase } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const [stats,         setStats]         = useState(null);
  const [myAssignments, setMyAssignments] = useState([]);
  const [myExams,       setMyExams]       = useState([]);
  const [recruitKpis,   setRecruitKpis]   = useState(null);
  const user    = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role    = user.platformRole || 'user';
  const isAdmin = role === 'admin';
  const isManager = role === 'admin' || role === 'manager';
  const navigate = useNavigate();

  useEffect(() => {
    if (isManager) {
      api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
    }
    if (isAdmin) {
      api.get('/recruit/dashboard/kpis').then(r => setRecruitKpis(r.data)).catch(() => {});
    }
    api.get('/assignments/my').then(r => setMyAssignments(r.data)).catch(() => {});
    // Fetch pending exam assignments (assignments with linked exams not yet completed)
    api.get('/assignments/my').then(r => {
      // Filter assignments that have an exam component and are not completed
      const withExams = r.data.filter(a =>
        a.status !== 'completed' && a.status !== 'expired'
      );
      setMyExams(withExams);
    }).catch(() => {});
  }, []);

  const pending = myAssignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const overdue = myAssignments.filter(a => a.status === 'overdue');

  const statusBadge = (s) => {
    const map    = { pending: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success', overdue: 'badge-danger', expired: 'badge-neutral' };
    const labels = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', overdue: 'Vencida', expired: 'Expirada' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="fade-in page-content">
      <div className="page-header">
        <div>
          <h2>Bienvenido, {user.nombre?.split(' ')[0] || 'Usuario'}</h2>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>{user.area} · {user.rol}</p>
        </div>
      </div>

      {/* ── Pending exams banner (all roles) ─────────────────────────── */}
      {overdue.length > 0 && (
        <div style={{
          background: 'var(--danger-dim)', border: '1px solid var(--danger)',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>
            Tienes {overdue.length} capacitación{overdue.length !== 1 ? 'es' : ''} vencida{overdue.length !== 1 ? 's' : ''}. Por favor complétala{overdue.length !== 1 ? 's' : ''} a la brevedad.
          </span>
        </div>
      )}

      {/* ── KPIs for managers ─────────────────────────────────────────── */}
      {isManager && stats && (
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <div className="kpi-card">
            <span className="kpi-label">Tasa de Completado</span>
            <span className="kpi-value" style={{ color: 'var(--success)' }}>{stats.completion_rate}%</span>
            <span className="kpi-change positive">{stats.recent_completions} esta semana</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Pendientes</span>
            <span className="kpi-value">{stats.pending}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>de {stats.total_assignments} asignadas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Vencidas</span>
            <span className="kpi-value" style={{ color: stats.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {stats.overdue}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>requieren atención</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Promedio Exámenes</span>
            <span className="kpi-value">{stats.exam_avg_score}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.exam_pass_rate}% aprobación</span>
          </div>
          {/* Recruitment KPI for admins */}
          {isAdmin && recruitKpis && (
            <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/recruit')}>
              <span className="kpi-label">Vacantes Activas</span>
              <span className="kpi-value" style={{ color: 'var(--accent)' }}>{recruitKpis.active_vac}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {recruitKpis.pending_review} pendientes revisión
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── My pending trainings ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Mis Capacitaciones Pendientes</div>
            <div className="card-subtitle">
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
              {overdue.length > 0 ? ` · ${overdue.length} vencida${overdue.length !== 1 ? 's' : ''}` : ''}
            </div>
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

      {/* ── Recruitment summary for admins ───────────────────────────── */}
      {isAdmin && recruitKpis && (
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/recruit')}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Briefcase size={15} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
                Resumen de Reclutamiento
              </div>
              <div className="card-subtitle">Haz clic para ir al módulo completo</div>
            </div>
            <span className="btn btn-ghost btn-sm">Ver módulo →</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Vacantes abiertas', value: recruitKpis.active_vac, color: 'var(--accent)' },
              { label: 'Contratados',       value: recruitKpis.hired_count, color: 'var(--success)' },
              { label: 'Pend. revisión',    value: recruitKpis.pending_review, color: recruitKpis.pending_review > 0 ? 'var(--warning)' : 'var(--text-muted)' },
              { label: 'Tasa de llenado',   value: `${recruitKpis.fill_rate}%`, color: 'var(--text-primary)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ minWidth: 100 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


