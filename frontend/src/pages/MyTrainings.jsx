import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import api from '../api/axios';

export default function MyTrainings() {
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/assignments/my').then(r => { setAssignments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

  const handleComplete = async (id) => {
    try {
      await api.put(`/assignments/${id}/status`, { status: 'completed' });
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', completed_at: new Date().toISOString() } : a));
    } catch (err) { /* handle */ }
  };

  const statusBadge = (s) => {
    const map = { pending: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success', overdue: 'badge-danger', expired: 'badge-neutral' };
    const labels = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', overdue: 'Vencida', expired: 'Expirada' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  const counts = {
    all: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => a.status === 'overdue').length,
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Mis Capacitaciones</h2>
      </div>

      <div className="tabs">
        {[['all', 'Todas'], ['pending', 'Pendientes'], ['in_progress', 'En Progreso'], ['completed', 'Completadas'], ['overdue', 'Vencidas']].map(([key, label]) => (
          <button key={key} className={`tab${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><p>Cargando...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><CheckCircle2 /><p>No hay capacitaciones en esta categoría.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Capacitación</th>
                <th>Categoría</th>
                <th>Modo</th>
                <th>Fecha Límite</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td className="primary-col">{a.title}</td>
                  <td>{a.category_name || '—'}</td>
                  <td>{a.delivery_mode === 'synchronous' ? 'Presencial' : 'En línea'}</td>
                  <td>{a.due_date ? new Date(a.due_date).toLocaleDateString('es-MX') : '—'}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/trainings/${a.training_id}`)}>
                        <ExternalLink /> Ver
                      </button>
                      {(a.status === 'pending' || a.status === 'in_progress' || a.status === 'overdue') && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleComplete(a.id)}>
                          <CheckCircle2 /> Completar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
