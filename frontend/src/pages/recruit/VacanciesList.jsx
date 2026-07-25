import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Users, Eye } from 'lucide-react';
import { listVacancies, deleteVacancy, getDepartments, getRecruiters } from '../../api/recruit';

const STATUS_BADGE = {
  'Vacant':    'badge-info',
  'Filled':    'badge-success',
  'Suspended': 'badge-warning',
  'Cancelled': 'badge-danger',
};

const STATUS_ES = {
  'Vacant':    'Vacante',
  'Filled':    'Cubierta',
  'Suspended': 'Suspendida',
  'Cancelled': 'Cancelada',
};

export default function VacanciesList() {
  const navigate   = useNavigate();
  const [rows,     setRows]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [deptId,   setDeptId]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [departments, setDepartments] = useState([]);

  // Load filter options once
  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (deptId) params.department_id = deptId;
    listVacancies(params)
      .then(r => { setRows(r.data.rows); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, status, deptId]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleDelete(id, title) {
    if (!window.confirm(`¿Cancelar la vacante "${title}"?`)) return;
    try {
      await deleteVacancy(id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar vacante.');
    }
  }

  const pages = Math.ceil(total / 25);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="page-title">Vacantes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {total} vacante{total !== 1 ? 's' : ''} registrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/recruit/vacancies/new')}>
          <Plus size={15} /> Nueva Vacante
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 220px', minWidth: 180 }}>
          <Search />
          <input className="form-input" placeholder="Buscar vacante o ID..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }}
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          <option value="Vacant">Vacante</option>
          <option value="Filled">Cubierta</option>
          <option value="Suspended">Suspendida</option>
          <option value="Cancelled">Cancelada</option>
        </select>
        <select className="form-select" style={{ width: 180 }}
          value={deptId} onChange={e => { setDeptId(e.target.value); setPage(1); }}>
          <option value="">Todos los departamentos</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Puesto</th>
              <th>Departamento</th>
              <th>Reclutador</th>
              <th>Apertura</th>
              <th>Estado</th>
              <th>Costo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <Users size={36} />
                  <p>No se encontraron vacantes</p>
                </div>
              </td></tr>
            ) : rows.map(v => (
              <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/recruit/vacancies/${v.id}`)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{v.job_id}</td>
                <td className="primary-col">{v.job_title}</td>
                <td>{v.department}</td>
                <td>{v.recruiter || '—'}</td>
                <td>{v.opening_date?.slice(0, 10) || '—'}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[v.status] || 'badge-neutral'}`}>
                    {STATUS_ES[v.status] || v.status}
                  </span>
                </td>
                <td>{v.hiring_cost ? `$${Number(v.hiring_cost).toLocaleString()}` : '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      title="Ver candidatos"
                      onClick={() => navigate(`/recruit/candidates?vacancy_id=${v.id}`)}>
                      <Users size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      title="Editar"
                      onClick={() => navigate(`/recruit/vacancies/${v.id}/edit`)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      title="Cancelar"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleDelete(v.id, v.job_title)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1}
            onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '5px 8px' }}>
            {page} / {pages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
