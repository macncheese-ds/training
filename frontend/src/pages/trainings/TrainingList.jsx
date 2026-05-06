import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, BookOpen } from 'lucide-react';
import api from '../../api/axios';

export default function TrainingList() {
  const [trainings, setTrainings] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.platformRole === 'admin';

  useEffect(() => {
    loadTrainings();
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const loadTrainings = () => {
    const params = {};
    if (search) params.search = search;
    if (catFilter) params.category_id = catFilter;
    api.get('/trainings', { params }).then(r => setTrainings(r.data)).catch(() => {});
  };

  useEffect(() => { loadTrainings(); }, [search, catFilter]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Capacitaciones</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => navigate('/trainings/new')}>
            <Plus /> Nueva Capacitación
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search />
          <input className="form-input" placeholder="Buscar capacitación..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {trainings.length === 0 ? (
        <div className="empty-state"><BookOpen /><p>No se encontraron capacitaciones.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th>Modo</th>
                <th>Obligatoria</th>
                <th>Duración</th>
                <th>Recurrencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map(t => (
                <tr key={t.id} onClick={() => navigate(`/trainings/${t.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="primary-col">{t.title}</td>
                  <td>{t.category_name || '—'}</td>
                  <td>{t.delivery_mode === 'synchronous' ? 'Presencial' : 'En línea'}</td>
                  <td>{t.is_mandatory ? <span className="badge badge-warning">Obligatoria</span> : <span className="badge badge-neutral">Opcional</span>}</td>
                  <td>{t.duration_minutes ? `${t.duration_minutes} min` : '—'}</td>
                  <td>{t.recurrence_months ? `Cada ${t.recurrence_months} meses` : '—'}</td>
                  <td>{t.is_active ? <span className="badge badge-success">Activa</span> : <span className="badge badge-neutral">Inactiva</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
