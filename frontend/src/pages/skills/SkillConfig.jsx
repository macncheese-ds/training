import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Settings, Tag } from 'lucide-react';
import api from '../../api/axios';

export default function SkillConfig() {
  const [tab, setTab] = useState('skills');
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);

  // Skill form
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: '', description: '', max_level: 3, category_id: '' });
  const [editSkillId, setEditSkillId] = useState(null);

  // Category form
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [editCatId, setEditCatId] = useState(null);

  // Role requirements
  const [selectedRole, setSelectedRole] = useState('');
  const [roleSkills, setRoleSkills] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    api.get('/skills').then(r => setSkills(r.data)).catch(() => {});
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/employees/roles').then(r => setRoles(r.data)).catch(() => {});
  };

  // ── Skills CRUD ──────────────────────────
  const openSkillForm = (skill = null) => {
    if (skill) {
      setSkillForm({ name: skill.name, description: skill.description || '', max_level: skill.max_level, category_id: skill.category_id || '' });
      setEditSkillId(skill.id);
    } else {
      setSkillForm({ name: '', description: '', max_level: 3, category_id: '' });
      setEditSkillId(null);
    }
    setShowSkillModal(true);
  };

  const saveSkill = async () => {
    try {
      if (editSkillId) await api.put(`/skills/${editSkillId}`, skillForm);
      else await api.post('/skills', skillForm);
      setShowSkillModal(false);
      loadAll();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const deleteSkill = async (id) => {
    if (!confirm('¿Eliminar esta competencia?')) return;
    await api.delete(`/skills/${id}`);
    loadAll();
  };

  // ── Categories CRUD ──────────────────────
  const openCatForm = (cat = null) => {
    if (cat) { setCatForm({ name: cat.name, description: cat.description || '' }); setEditCatId(cat.id); }
    else { setCatForm({ name: '', description: '' }); setEditCatId(null); }
    setShowCatModal(true);
  };

  const saveCat = async () => {
    try {
      if (editCatId) await api.put(`/categories/${editCatId}`, catForm);
      else await api.post('/categories', catForm);
      setShowCatModal(false);
      loadAll();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const deleteCat = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await api.delete(`/categories/${id}`);
    loadAll();
  };

  // ── Role requirements ────────────────────
  useEffect(() => {
    if (selectedRole) {
      api.get('/skills/gaps', { params: { role: selectedRole } }).catch(() => {});
      // Load current requirements — we need to build this from gaps endpoint or a separate one
      setRoleSkills(skills.map(s => ({ skill_id: s.id, skill_name: s.name, required_level: 0 })));
    }
  }, [selectedRole, skills]);

  const updateRoleSkill = (skillId, level) => {
    setRoleSkills(prev => prev.map(rs => rs.skill_id === skillId ? { ...rs, required_level: parseInt(level) || 0 } : rs));
  };

  const saveRoleRequirements = async () => {
    const active = roleSkills.filter(rs => rs.required_level > 0);
    try {
      await api.post('/skills/required', { role_name: selectedRole, skills: active });
      alert('Requisitos guardados.');
    } catch (err) { alert('Error'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Configuración</h2>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'skills' ? ' active' : ''}`} onClick={() => setTab('skills')}>Competencias</button>
        <button className={`tab${tab === 'categories' ? ' active' : ''}`} onClick={() => setTab('categories')}>Categorías</button>
        <button className={`tab${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>Requisitos por Rol</button>
      </div>

      {/* ── Skills tab ── */}
      {tab === 'skills' && (
        <div>
          <div className="flex justify-between items-center mb-16">
            <span className="text-muted text-sm">{skills.length} competencias</span>
            <button className="btn btn-primary" onClick={() => openSkillForm()}><Plus /> Nueva Competencia</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Nombre</th><th>Categoría</th><th>Niveles</th><th>Acciones</th></tr></thead>
              <tbody>
                {skills.map(s => (
                  <tr key={s.id}>
                    <td className="primary-col">{s.name}</td>
                    <td>{s.category_name || '—'}</td>
                    <td>0–{s.max_level}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => openSkillForm(s)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSkill(s.id)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Categories tab ── */}
      {tab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-16">
            <span className="text-muted text-sm">{categories.length} categorías</span>
            <button className="btn btn-primary" onClick={() => openCatForm()}><Plus /> Nueva Categoría</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td className="primary-col">{c.name}</td>
                    <td>{c.description || '—'}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => openCatForm(c)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCat(c.id)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Role requirements tab ── */}
      {tab === 'roles' && (
        <div>
          <div className="filter-bar">
            <select className="form-select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              <option value="">Seleccionar rol...</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {selectedRole && (
              <button className="btn btn-primary" onClick={saveRoleRequirements}><Save /> Guardar</button>
            )}
          </div>
          {selectedRole && roleSkills.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Competencia</th><th>Nivel Requerido</th></tr></thead>
                <tbody>
                  {roleSkills.map(rs => (
                    <tr key={rs.skill_id}>
                      <td className="primary-col">{rs.skill_name}</td>
                      <td>
                        <select className="form-select" value={rs.required_level} onChange={e => updateRoleSkill(rs.skill_id, e.target.value)} style={{ width: 120 }}>
                          <option value="0">No requerido</option>
                          <option value="1">Nivel 1</option>
                          <option value="2">Nivel 2</option>
                          <option value="3">Nivel 3</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Skill modal ── */}
      {showSkillModal && (
        <div className="modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editSkillId ? 'Editar Competencia' : 'Nueva Competencia'}</div>
              <button className="modal-close" onClick={() => setShowSkillModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={skillForm.name} onChange={e => setSkillForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={skillForm.description} onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Niveles Máximo</label>
                <input className="form-input" type="number" min="1" max="5" value={skillForm.max_level} onChange={e => setSkillForm(p => ({ ...p, max_level: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={skillForm.category_id} onChange={e => setSkillForm(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSkillModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveSkill}><Save /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category modal ── */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editCatId ? 'Editar Categoría' : 'Nueva Categoría'}</div>
              <button className="modal-close" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveCat}><Save /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
