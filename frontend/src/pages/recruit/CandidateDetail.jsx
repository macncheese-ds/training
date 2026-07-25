import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getVacancy, getCandidate,
  uploadCV, addCandidateNote, rescoreCandidate, hireCandidate,
  getSources, updateCandidate,
} from '../../api/recruit';
import {
  ArrowLeft, Upload, MessageSquare, Star, UserCheck,
  FileText, RefreshCw, X, Check, AlertTriangle,
} from 'lucide-react';

const PHASES = ['Received Application', 'Sent to Manager', 'Interviews', 'Tests', 'Job Offer', 'Hired'];
const PHASE_ES = {
  'Received Application': 'Solicitud Recibida',
  'Sent to Manager':      'Enviado al Manager',
  'Interviews':           'Entrevistas',
  'Tests':                'Pruebas',
  'Job Offer':            'Oferta de Trabajo',
  'Hired':                'Contratado',
};
const DECISIONS = ['Hired', 'Candidate in Process', 'Candidate Refusal', 'Not Hired'];
const DECISION_ES = {
  'Hired':                'Contratado',
  'Candidate in Process': 'En Proceso',
  'Candidate Refusal':    'Declinó Candidato',
  'Not Hired':            'No Contratado',
};
const NOTE_TYPES = { general: 'General', interview: 'Entrevista', test: 'Prueba', decision: 'Decisión', system: 'Sistema' };
const NOTE_TYPE_COLOR = { general: 'badge-neutral', interview: 'badge-info', test: 'badge-warning', decision: 'badge-success', system: 'badge-neutral' };

function ScoreBar({ score }) {
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>Ajuste de Perfil (IA)</span>
        <span style={{ color, fontWeight: 700 }}>{score?.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 600ms ease' }} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Puntaje calculado automáticamente por coincidencia de palabras clave. Solo es una referencia — RH decide.
      </p>
    </div>
  );
}

function HireModal({ candidate, onClose, onSuccess }) {
  const [form, setForm] = useState({ num_empleado: '', password: '', nombre_override: '', rol: 'Operador', area: candidate.department || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleHire(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await hireCandidate(candidate.id, form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al dar de alta al empleado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ color: 'var(--success)' }}>
              <UserCheck size={18} style={{ display: 'inline', marginRight: 6 }} />
              Alta de Empleado
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Se creará el acceso al sistema para <strong>{candidate.candidate_name}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--warning)', marginBottom: 16, display: 'flex', gap: 8 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Esta acción creará el empleado en <strong>credenciales</strong>. Verifica el número de empleado antes de continuar.</span>
        </div>

        <form onSubmit={handleHire}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número de empleado *</label>
              <input className="form-input" required value={form.num_empleado}
                onChange={e => setForm(f => ({ ...f, num_empleado: e.target.value }))}
                placeholder="Ej. 12345A" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña temporal *</label>
              <input className="form-input" type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre en sistema (dejar en blanco para usar nombre del candidato)</label>
            <input className="form-input" value={form.nombre_override}
              onChange={e => setForm(f => ({ ...f, nombre_override: e.target.value }))}
              placeholder={candidate.candidate_name} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rol en sistema</label>
              <input className="form-input" value={form.rol}
                onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                placeholder="Operador" />
            </div>
            <div className="form-group">
              <label className="form-label">Área</label>
              <input className="form-input" value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                placeholder="Ej. Manufacturing" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
              <UserCheck size={15} /> {saving ? 'Procesando...' : 'Dar de Alta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CandidateDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const fileRef   = useRef();

  const [cand,      setCand]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [noteText,  setNoteText]  = useState('');
  const [noteType,  setNoteType]  = useState('general');
  const [addingNote, setAddingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [hireModal, setHireModal] = useState(false);
  const [tab,       setTab]       = useState('overview');

  const load = () => {
    setLoading(true);
    getCandidate(id)
      .then(r => setCand(r.data))
      .catch(() => navigate('/recruit/candidates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  async function changePhase(phase) {
    try {
      await updateCandidate(id, { ...cand, recruitment_phase: phase, vacancy_id: cand.vacancy_id, source_id: cand.source_id, applied_date: cand.applied_date?.slice(0, 10) });
      setCand(c => ({ ...c, recruitment_phase: phase }));
    } catch { /* ignore */ }
  }

  async function changeDecision(decision) {
    try {
      await updateCandidate(id, { ...cand, final_decision: decision, vacancy_id: cand.vacancy_id, source_id: cand.source_id, applied_date: cand.applied_date?.slice(0, 10) });
      setCand(c => ({ ...c, final_decision: decision }));
    } catch { /* ignore */ }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadCV(id, file);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al subir CV.');
    } finally {
      setUploading(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await addCandidateNote(id, { note: noteText, note_type: noteType });
      setCand(c => ({ ...c, notes: [res.data, ...(c.notes || [])] }));
      setNoteText('');
    } catch { /* ignore */ }
    finally { setAddingNote(false); }
  }

  async function handleRescore() {
    setRescoring(true);
    try {
      const res = await rescoreCandidate(id);
      if (res.data.ok) {
        setCand(c => ({ ...c, ai_score: res.data.ai_score, ai_summary: res.data.ai_summary }));
      }
    } catch { /* ignore */ }
    finally { setRescoring(false); }
  }

  if (loading || !cand) return <div className="page-content" style={{ color: 'var(--text-muted)' }}>Cargando...</div>;

  const phaseIdx = PHASES.indexOf(cand.recruitment_phase);

  return (
    <div className="page-content">
      {hireModal && (
        <HireModal candidate={cand} onClose={() => setHireModal(false)} onSuccess={() => { setHireModal(false); load(); }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/recruit/candidates')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="page-title">{cand.candidate_name}</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {cand.job_title} — {cand.department}
            </span>
            {cand.email && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cand.email}</span>}
            {cand.phone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cand.phone}</span>}
          </div>
        </div>

        {/* Hire button (only if not already hired) */}
        {cand.final_decision !== 'Hired' && (
          <button className="btn btn-primary" onClick={() => setHireModal(true)}
            style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
            <UserCheck size={15} /> Contratar
          </button>
        )}
        {cand.final_decision === 'Hired' && (
          <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 12 }}>
            <Check size={12} style={{ marginRight: 4 }} /> Contratado
          </span>
        )}
      </div>

      {/* Phase tracker */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Etapa del Proceso</span>
          <select className="form-select" style={{ width: 220 }}
            value={cand.final_decision || ''}
            onChange={e => changeDecision(e.target.value || null)}>
            <option value="">Decisión final...</option>
            {DECISIONS.map(d => <option key={d} value={d}>{DECISION_ES[d]}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {PHASES.map((phase, i) => {
            const done    = i <= phaseIdx;
            const current = i === phaseIdx;
            return (
              <button key={phase} onClick={() => changePhase(phase)} style={{
                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: current ? 700 : 500,
                textAlign: 'center', cursor: 'pointer', border: 'none',
                borderBottom: current ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: current ? 'var(--accent-subtle)' : done ? 'var(--bg-hover)' : 'transparent',
                color: current ? 'var(--accent)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 180ms',
              }}>
                {PHASE_ES[phase]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'cv', 'notes'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ overview: 'Resumen', cv: 'CV / Análisis', notes: `Notas (${cand.notes?.length || 0})` }[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Info card */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Información del Candidato</div>
            {[
              ['Vacante', `${cand.job_id} — ${cand.job_title}`],
              ['Departamento', cand.department],
              ['Fuente', cand.source],
              ['Fecha de Aplicación', cand.applied_date?.slice(0, 10)],
              ['Correo', cand.email || '—'],
              ['Teléfono', cand.phone || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* AI score */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Análisis de Perfil</span>
              <button className="btn btn-ghost btn-sm" onClick={handleRescore} disabled={rescoring}>
                <RefreshCw size={13} style={{ animation: rescoring ? 'spin 1s linear infinite' : 'none' }} />
                {rescoring ? 'Analizando...' : 'Re-analizar'}
              </button>
            </div>
            {cand.ai_score != null ? (
              <div>
                <ScoreBar score={parseFloat(cand.ai_score)} />
                {cand.ai_summary && (
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {cand.ai_summary}
                  </p>
                )}
                {cand.ai_scored_at && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Analizado: {new Date(cand.ai_scored_at).toLocaleString('es-MX')}
                  </p>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>
                <Star size={28} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: 12 }}>Sube el CV del candidato para generar el análisis automático de ajuste.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'cv' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Curriculum Vitae</span>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleUpload} />
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={14} /> {uploading ? 'Subiendo...' : 'Subir CV'}
            </button>
          </div>

          {cand.resume_path ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{cand.resume_original || 'CV adjunto'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cand.resume_path}</div>
                </div>
                <a href={`/uploads/${cand.resume_path}`} target="_blank" rel="noreferrer"
                  className="btn btn-secondary btn-sm">
                  Ver / Descargar
                </a>
              </div>

              {cand.ai_score != null && (
                <div>
                  <div className="card-title" style={{ marginBottom: 12 }}>Resultado del Análisis Automático</div>
                  <ScoreBar score={parseFloat(cand.ai_score)} />
                  {cand.ai_summary && (
                    <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>{cand.ai_summary}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Upload size={40} />
              <p>Aún no hay CV adjunto.<br />Sube un archivo PDF, DOC o DOCX (máx. 10 MB).</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>
                Subir CV
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Add note */}
          <form className="card" onSubmit={handleAddNote}>
            <div className="card-title" style={{ marginBottom: 12 }}>Agregar Nota</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {Object.entries(NOTE_TYPES).filter(([k]) => k !== 'system').map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => setNoteType(k)}
                  className={`btn btn-sm ${noteType === k ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}>
                  {v}
                </button>
              ))}
            </div>
            <textarea className="form-textarea" value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Escribe tu nota aquí..." rows={3} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote || !noteText.trim()}>
                <MessageSquare size={14} /> {addingNote ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>
          </form>

          {/* Note list */}
          {(cand.notes || []).length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={36} />
              <p>Sin notas aún</p>
            </div>
          ) : (cand.notes || []).map(n => (
            <div key={n.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${NOTE_TYPE_COLOR[n.note_type] || 'badge-neutral'}`}>
                    {NOTE_TYPES[n.note_type] || n.note_type}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.author || '—'}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(n.created_at).toLocaleString('es-MX')}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
