import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, ExternalLink, FileText, Play } from 'lucide-react';
import api from '../../api/axios';

export default function TrainingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.platformRole === 'admin';

  useEffect(() => {
    api.get(`/trainings/${id}`).then(r => setTraining(r.data)).catch(() => {});
    if (isAdmin || user.platformRole === 'manager') {
      api.get('/assignments', { params: { training_id: id } }).then(r => setAssignments(r.data)).catch(() => {});
    }
  }, [id]);

  const handleAssign = async () => {
    if (!selectedUsers.length) return;
    try {
      await api.post('/assignments', { training_id: parseInt(id), user_ids: selectedUsers, due_date: dueDate || null });
      setShowAssign(false);
      setSelectedUsers([]);
      api.get('/assignments', { params: { training_id: id } }).then(r => setAssignments(r.data));
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const searchEmployees = (val) => {
    setEmpSearch(val);
    if (val.length >= 2) {
      api.get('/employees', { params: { search: val } }).then(r => setEmployees(r.data)).catch(() => {});
    }
  };

  const statusBadge = (s) => {
    const map = { pending: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success', overdue: 'badge-danger', expired: 'badge-neutral' };
    const labels = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', overdue: 'Vencida', expired: 'Expirada' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  if (!training) return <div className="empty-state"><p>Cargando...</p></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}><ArrowLeft /> Volver</button>
        {isAdmin && (
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => navigate(`/trainings/${id}/edit`)}>Editar</button>
            <button className="btn btn-primary" onClick={() => setShowAssign(true)}><UserPlus /> Asignar</button>
          </div>
        )}
      </div>

      <div className="card mb-24">
        <div className="flex justify-between items-center mb-16">
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{training.title}</h2>
          <div className="flex gap-8">
            {training.is_mandatory ? <span className="badge badge-warning">Obligatoria</span> : <span className="badge badge-neutral">Opcional</span>}
            <span className="badge badge-info">{training.delivery_mode === 'synchronous' ? 'Presencial' : 'En línea'}</span>
          </div>
        </div>
        {training.description && <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{training.description}</p>}
        <div className="flex gap-24" style={{ flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Categoría: <strong style={{ color: 'var(--text-secondary)' }}>{training.category_name || '—'}</strong></span>
          <span>Duración: <strong style={{ color: 'var(--text-secondary)' }}>{training.duration_minutes ? `${training.duration_minutes} min` : '—'}</strong></span>
          <span>Recurrencia: <strong style={{ color: 'var(--text-secondary)' }}>{training.recurrence_months ? `Cada ${training.recurrence_months} meses` : 'Una vez'}</strong></span>
        </div>
        {(training.content_url || training.material_path) && (
          <div className="flex gap-12 mt-16">
            {training.content_url && (
              <a href={training.content_url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><ExternalLink /> Ver Contenido</a>
            )}
            {training.material_path && (
              <a href={`/uploads/${training.material_path}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><FileText /> Descargar Material</a>
            )}
          </div>
        )}
        {training.exams && training.exams.length > 0 && (
          <div className="mt-16">
            <div className="text-sm text-muted mb-8">Exámenes vinculados:</div>
            {training.exams.map(e => (
              <div key={e.id} className="flex items-center gap-8 mb-8">
                <span className="badge badge-info">{e.title}</span>
                <span className="text-sm text-muted">Aprobación: {e.passing_score}%</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/exams/${e.id}/take`)}>
                  <Play /> Tomar Examen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignments table */}
      {(isAdmin || user.platformRole === 'manager') && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Asignaciones ({assignments.length})</div>
          </div>
          {assignments.length === 0 ? (
            <div className="empty-state"><Users /><p>Sin asignaciones aún.</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="table">
                <thead><tr><th>Empleado</th><th>Área</th><th>Fecha Límite</th><th>Estado</th></tr></thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td className="primary-col">{a.employee_name || a.user_id}</td>
                      <td>{a.employee_area || '—'}</td>
                      <td>{a.due_date ? new Date(a.due_date).toLocaleDateString('es-MX') : '—'}</td>
                      <td>{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Asignar Capacitación</div>
              <button className="modal-close" onClick={() => setShowAssign(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Buscar empleados</label>
              <input className="form-input" placeholder="Nombre o número..." value={empSearch} onChange={e => searchEmployees(e.target.value)} />
            </div>
            {employees.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
                {employees.map(emp => (
                  <label key={emp.id} className="form-check" style={{ padding: '6px 0' }}>
                    <input type="checkbox" checked={selectedUsers.includes(emp.id)} onChange={() => {
                      setSelectedUsers(prev => prev.includes(emp.id) ? prev.filter(i => i !== emp.id) : [...prev, emp.id]);
                    }} />
                    <span style={{ fontSize: 13 }}>{emp.nombre} — {emp.num_empleado} ({emp.area})</span>
                  </label>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && <p className="text-sm mb-8" style={{ color: 'var(--accent)' }}>{selectedUsers.length} seleccionado(s)</p>}
            <div className="form-group">
              <label className="form-label">Fecha límite (opcional)</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedUsers.length}>
                <UserPlus /> Asignar ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
