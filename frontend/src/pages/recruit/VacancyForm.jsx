import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartments, getRecruiters, getVacancy, createVacancy, updateVacancy } from '../../api/recruit';
import { ArrowLeft, Save } from 'lucide-react';

const STATUS_OPTIONS = ['Vacant', 'Filled', 'Suspended', 'Cancelled'];
const STATUS_ES      = { Vacant: 'Vacante', Filled: 'Cubierta', Suspended: 'Suspendida', Cancelled: 'Cancelada' };

const EMPTY = {
  job_title: '', department_id: '', recruiter_id: '', opening_date: '',
  status: 'Vacant', hire_start_date: '', hiring_cost: '',
  description: '', requirements: '', notes: '',
};

export default function VacancyForm() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const isEdit     = Boolean(id && id !== 'new');

  const [form,        setForm]        = useState(EMPTY);
  const [departments, setDepartments] = useState([]);
  const [recruiters,  setRecruiters]  = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    Promise.all([getDepartments(), getRecruiters()])
      .then(([d, r]) => { setDepartments(d.data); setRecruiters(r.data); })
      .catch(() => {});

    if (isEdit) {
      getVacancy(id)
        .then(r => {
          const v = r.data;
          setForm({
            job_title:       v.job_title       || '',
            department_id:   v.department_id   || '',
            recruiter_id:    v.recruiter_id    || '',
            opening_date:    v.opening_date?.slice(0, 10) || '',
            status:          v.status          || 'Vacant',
            hire_start_date: v.hire_start_date?.slice(0, 10) || '',
            hiring_cost:     v.hiring_cost     || '',
            description:     v.description     || '',
            requirements:    v.requirements    || '',
            notes:           v.notes           || '',
          });
        })
        .catch(() => setError('No se pudo cargar la vacante.'));
    }
  }, [id, isEdit]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        hiring_cost:     form.hiring_cost    ? parseFloat(form.hiring_cost) : null,
        hire_start_date: form.hire_start_date || null,
      };
      if (isEdit) {
        await updateVacancy(id, payload);
      } else {
        const res = await createVacancy(payload);
        navigate(`/recruit/vacancies/${res.data.id}`);
        return;
      }
      navigate(`/recruit/vacancies/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar. Verifica los campos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <div style={{ maxWidth: 680 }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate('/recruit/vacancies')}>
              <ArrowLeft size={18} />
            </button>
            <h2 className="page-title">{isEdit ? 'Editar Vacante' : 'Nueva Vacante'}</h2>
          </div>
        </div>

        <form onSubmit={handleSave} className="card">
          {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Puesto / Cargo *</label>
              <input className="form-input" value={form.job_title} required
                onChange={e => set('job_title', e.target.value)} placeholder="Ej. Operador CNC" />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento *</label>
              <select className="form-select" value={form.department_id} required
                onChange={e => set('department_id', e.target.value)}>
                <option value="">Seleccionar...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reclutador responsable *</label>
              <select className="form-select" value={form.recruiter_id} required
                onChange={e => set('recruiter_id', e.target.value)}>
                <option value="">Seleccionar...</option>
                {recruiters.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.status}
                onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_ES[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha de apertura *</label>
              <input className="form-input" type="date" value={form.opening_date} required
                onChange={e => set('opening_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de contratación</label>
              <input className="form-input" type="date" value={form.hire_start_date}
                onChange={e => set('hire_start_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Costo de reclutamiento estimado ($)</label>
            <input className="form-input" type="number" step="0.01" min="0" value={form.hiring_cost}
              onChange={e => set('hiring_cost', e.target.value)} placeholder="0.00" />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción del puesto</label>
            <textarea className="form-textarea" rows={3} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Resumen del rol, responsabilidades, etc." />
          </div>

          <div className="form-group">
            <label className="form-label">Requisitos y habilidades buscadas</label>
            <textarea className="form-textarea" rows={4} value={form.requirements}
              onChange={e => set('requirements', e.target.value)}
              placeholder="Lista de requisitos, habilidades técnicas, experiencia, etc. Estos se usan para el análisis automático de candidatos." />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              El sistema compara automáticamente estos requisitos contra el perfil de cada candidato para generar un puntaje de ajuste.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Notas internas</label>
            <textarea className="form-textarea" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Notas solo visibles para el equipo de RH..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate('/recruit/vacancies')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Vacante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
