import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Award, FileQuestion, User } from 'lucide-react';
import api from '../../api/axios';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const profileId = id || user.id;
  const isSelf = !id || String(id) === String(user.id);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('trainings');

  useEffect(() => {
    const endpoint = isSelf ? '/employees/me' : `/employees/${profileId}`;
    api.get(endpoint).then(r => setProfile(r.data)).catch(() => {});
  }, [profileId]);

  if (!profile) return <div className="empty-state"><p>Cargando perfil...</p></div>;

  const statusBadge = (s) => {
    const map = { pending: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success', overdue: 'badge-danger', expired: 'badge-neutral' };
    const labels = { pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completada', overdue: 'Vencida', expired: 'Expirada' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  const initials = (profile.nombre || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const completedCount = profile.assignments?.filter(a => a.status === 'completed').length || 0;
  const totalCount = profile.assignments?.length || 0;

  return (
    <div className="fade-in">
      {!isSelf && (
        <button className="btn btn-ghost mb-16" onClick={() => navigate(-1)}><ArrowLeft /> Volver</button>
      )}

      {/* Profile header */}
      <div className="card mb-24">
        <div className="flex gap-16 items-center">
          <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{profile.nombre}</h2>
            <div className="flex gap-16 text-sm text-muted">
              <span>#{profile.num_empleado}</span>
              <span>{profile.rol}</span>
              <span>{profile.area}</span>
            </div>
          </div>
          <div className="flex gap-16" style={{ textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{completedCount}</div>
              <div className="text-sm text-muted">Completadas</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{profile.skills?.length || 0}</div>
              <div className="text-sm text-muted">Competencias</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{profile.exam_attempts?.filter(a => a.passed)?.length || 0}</div>
              <div className="text-sm text-muted">Exámenes Aprobados</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'trainings' ? ' active' : ''}`} onClick={() => setTab('trainings')}>
          <BookOpen size={14} style={{ marginRight: 4 }} /> Capacitaciones ({totalCount})
        </button>
        <button className={`tab${tab === 'skills' ? ' active' : ''}`} onClick={() => setTab('skills')}>
          <Award size={14} style={{ marginRight: 4 }} /> Competencias ({profile.skills?.length || 0})
        </button>
        <button className={`tab${tab === 'exams' ? ' active' : ''}`} onClick={() => setTab('exams')}>
          <FileQuestion size={14} style={{ marginRight: 4 }} /> Exámenes ({profile.exam_attempts?.length || 0})
        </button>
      </div>

      {/* Trainings tab */}
      {tab === 'trainings' && (
        <div className="table-wrapper">
          {profile.assignments?.length === 0 ? (
            <div className="empty-state"><BookOpen /><p>Sin capacitaciones asignadas.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Capacitación</th><th>Categoría</th><th>Modo</th><th>Fecha Límite</th><th>Completada</th><th>Estado</th></tr></thead>
              <tbody>
                {profile.assignments?.map(a => (
                  <tr key={a.id}>
                    <td className="primary-col" style={{ cursor: 'pointer' }} onClick={() => navigate(`/trainings/${a.training_id}`)}>{a.title}</td>
                    <td>{a.category_name || '—'}</td>
                    <td>{a.delivery_mode === 'synchronous' ? 'Presencial' : 'En línea'}</td>
                    <td>{a.due_date ? new Date(a.due_date).toLocaleDateString('es-MX') : '—'}</td>
                    <td>{a.completed_at ? new Date(a.completed_at).toLocaleDateString('es-MX') : '—'}</td>
                    <td>{statusBadge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Skills tab */}
      {tab === 'skills' && (
        <div className="table-wrapper">
          {profile.skills?.length === 0 ? (
            <div className="empty-state"><Award /><p>Sin competencias registradas.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Competencia</th><th>Categoría</th><th>Nivel Actual</th><th>Máximo</th><th>Obtenida Via</th><th>Fecha</th></tr></thead>
              <tbody>
                {profile.skills?.map((s, i) => {
                  let levelLabels;
                  try { levelLabels = typeof s.level_labels === 'string' ? JSON.parse(s.level_labels) : s.level_labels; } catch { levelLabels = []; }
                  const levelName = levelLabels?.[s.current_level] || `Nivel ${s.current_level}`;
                  return (
                    <tr key={i}>
                      <td className="primary-col">{s.skill_name}</td>
                      <td>{s.category_name || '—'}</td>
                      <td>
                        <div className="flex items-center gap-8">
                          <span className={`badge badge-${s.current_level >= s.max_level ? 'success' : s.current_level > 0 ? 'info' : 'neutral'}`}>
                            {levelName}
                          </span>
                          <span className="text-sm text-muted">({s.current_level}/{s.max_level})</span>
                        </div>
                      </td>
                      <td>{s.max_level}</td>
                      <td>{s.achieved_via === 'training' ? 'Capacitación' : s.achieved_via === 'exam' ? 'Examen' : s.achieved_via === 'manual' ? 'Manual' : s.achieved_via}</td>
                      <td>{s.achieved_at ? new Date(s.achieved_at).toLocaleDateString('es-MX') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Exams tab */}
      {tab === 'exams' && (
        <div className="table-wrapper">
          {profile.exam_attempts?.length === 0 ? (
            <div className="empty-state"><FileQuestion /><p>Sin intentos de examen.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Examen</th><th>Puntaje</th><th>Resultado</th><th>Duración</th><th>Fecha</th></tr></thead>
              <tbody>
                {profile.exam_attempts?.map((a, i) => (
                  <tr key={i}>
                    <td className="primary-col">{a.exam_title}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{a.score ? `${parseFloat(a.score).toFixed(1)}%` : '—'}</td>
                    <td>{a.passed ? <span className="badge badge-success">Aprobado</span> : a.completed_at ? <span className="badge badge-danger">No Aprobado</span> : <span className="badge badge-warning">En Curso</span>}</td>
                    <td>{a.duration_seconds ? `${Math.floor(a.duration_seconds / 60)}m ${a.duration_seconds % 60}s` : '—'}</td>
                    <td>{a.started_at ? new Date(a.started_at).toLocaleDateString('es-MX') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
