import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

export default function TrainingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', delivery_mode: 'asynchronous',
    is_mandatory: false, duration_minutes: '', recurrence_months: '',
    target_roles: [], target_areas: [], content_url: '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/employees/roles').then(r => setRoles(r.data)).catch(() => {});
    api.get('/employees/areas').then(r => setAreas(r.data)).catch(() => {});
    if (isEdit) {
      api.get(`/trainings/${id}`).then(r => {
        const t = r.data;
        setForm({
          title: t.title, description: t.description || '', category_id: t.category_id || '',
          delivery_mode: t.delivery_mode, is_mandatory: !!t.is_mandatory,
          duration_minutes: t.duration_minutes || '', recurrence_months: t.recurrence_months || '',
          target_roles: t.target_roles || [], target_areas: t.target_areas || [],
          content_url: t.content_url || '',
        });
      }).catch(() => {});
    }
  }, [id]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field, item) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) formData.append(k, JSON.stringify(v));
        else formData.append(k, v);
      });
      if (file) formData.append('material', file);

      if (isEdit) {
        await api.put(`/trainings/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/trainings', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      navigate('/trainings');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/trainings')}><ArrowLeft /> Volver</button>
        <h2>{isEdit ? 'Editar Capacitación' : 'Nueva Capacitación'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input className="form-input" value={form.title} onChange={e => handleChange('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-textarea" value={form.description} onChange={e => handleChange('description', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={form.category_id} onChange={e => handleChange('category_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Modo de Entrega</label>
            <select className="form-select" value={form.delivery_mode} onChange={e => handleChange('delivery_mode', e.target.value)}>
              <option value="asynchronous">En línea (asíncrono)</option>
              <option value="synchronous">Presencial (síncrono)</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Duración (minutos)</label>
            <input className="form-input" type="number" value={form.duration_minutes} onChange={e => handleChange('duration_minutes', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Recurrencia (meses)</label>
            <input className="form-input" type="number" placeholder="Vacío = una vez" value={form.recurrence_months} onChange={e => handleChange('recurrence_months', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-check">
            <input type="checkbox" checked={form.is_mandatory} onChange={e => handleChange('is_mandatory', e.target.checked)} />
            Capacitación obligatoria
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">URL de Contenido</label>
          <input className="form-input" type="url" placeholder="https://..." value={form.content_url} onChange={e => handleChange('content_url', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Material (PDF, video, etc.)</label>
          <input className="form-input" type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.png,.jpg" />
        </div>
        <div className="form-group">
          <label className="form-label">Roles Objetivo</label>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {roles.map(r => (
              <label key={r} className="form-check" style={{ fontSize: 12 }}>
                <input type="checkbox" checked={form.target_roles.includes(r)} onChange={() => toggleArrayItem('target_roles', r)} />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Áreas Objetivo</label>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {areas.map(a => (
              <label key={a} className="form-check" style={{ fontSize: 12 }}>
                <input type="checkbox" checked={form.target_areas.includes(a)} onChange={() => toggleArrayItem('target_areas', a)} />
                {a}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/trainings')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}><Save /> {saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
