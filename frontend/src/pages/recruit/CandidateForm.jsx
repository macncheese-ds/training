import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSources, listVacancies, createCandidate } from '../../api/recruit';
import { ArrowLeft, Save } from 'lucide-react';

const PHASES = ['Received Application', 'Sent to Manager', 'Interviews', 'Tests', 'Job Offer', 'Hired'];
const PHASE_ES = {
  'Received Application': 'Solicitud Recibida', 'Sent to Manager': 'Enviado al Manager',
  'Interviews': 'Entrevistas', 'Tests': 'Pruebas', 'Job Offer': 'Oferta', 'Hired': 'Contratado',
};

const EMPTY = {
  vacancy_id: '', source_id: '', candidate_name: '', email: '', phone: '',
  applied_date: new Date().toISOString().slice(0, 10),
  recruitment_phase: 'Received Application', notes: '',
};

export default function CandidateForm() {
  const navigate  = useNavigate();
  const [form,      setForm]      = useState(EMPTY);
  const [vacancies, setVacancies] = useState([]);
  const [sources,   setSources]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([
      listVacancies({ status: 'Vacant', limit: 100 }),
      getSources(),
    ]).then(([v, s]) => { setVacancies(v.data.rows); setSources(s.data); })
      .catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await createCandidate(form);
      navigate(`/recruit/candidates/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar candidato.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <div style={{ maxWidth: 620 }}>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate('/recruit/candidates')}>
              <ArrowLeft size={18} />
            </button>
            <h2 className="page-title">Nuevo Candidato</h2>
          </div>
        </div>

        <form onSubmit={handleSave} className="card">
          {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-group">
            <label className="form-label">Nombre completo del candidato *</label>
            <input className="form-input" required value={form.candidate_name}
              onChange={e => set('candidate_name', e.target.value)} placeholder="Nombre y apellidos" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vacante *</label>
              <select className="form-select" required value={form.vacancy_id}
                onChange={e => set('vacancy_id', e.target.value)}>
                <option value="">Seleccionar vacante...</option>
                {vacancies.map(v => <option key={v.id} value={v.id}>{v.job_id} — {v.job_title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fuente de captación *</label>
              <select className="form-select" required value={form.source_id}
                onChange={e => set('source_id', e.target.value)}>
                <option value="">Seleccionar fuente...</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="+52 ..." />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha de solicitud *</label>
              <input className="form-input" type="date" required value={form.applied_date}
                onChange={e => set('applied_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Etapa inicial</label>
              <select className="form-select" value={form.recruitment_phase}
                onChange={e => set('recruitment_phase', e.target.value)}>
                {PHASES.map(p => <option key={p} value={p}>{PHASE_ES[p]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas iniciales</label>
            <textarea className="form-textarea" value={form.notes} rows={3}
              onChange={e => set('notes', e.target.value)}
              placeholder="Cualquier información relevante del candidato..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate('/recruit/candidates')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Guardando...' : 'Crear Candidato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
