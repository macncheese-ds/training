import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, User } from 'lucide-react';
import { listCandidates, getDepartments, getSources, listVacancies } from '../../api/recruit';

const PHASES = ['Received Application', 'Sent to Manager', 'Interviews', 'Tests', 'Job Offer', 'Hired'];
const PHASE_ES = {
  'Received Application': 'Solicitud Recibida',
  'Sent to Manager':      'Enviado al Manager',
  'Interviews':           'Entrevistas',
  'Tests':                'Pruebas',
  'Job Offer':            'Oferta',
  'Hired':                'Contratado',
};
const PHASE_BADGE = {
  'Received Application': 'badge-neutral',
  'Sent to Manager':      'badge-info',
  'Interviews':           'badge-info',
  'Tests':                'badge-warning',
  'Job Offer':            'badge-info',
  'Hired':                'badge-success',
};
const DECISION_ES = {
  'Hired':                'Contratado',
  'Candidate in Process': 'En Proceso',
  'Candidate Refusal':    'Declinó',
  'Not Hired':            'No Contratado',
};
const DECISION_BADGE = {
  'Hired':                'badge-success',
  'Candidate in Process': 'badge-info',
  'Candidate Refusal':    'badge-warning',
  'Not Hired':            'badge-danger',
};

export default function CandidatesList() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const [rows,        setRows]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [phase,       setPhase]       = useState('');
  const [deptId,      setDeptId]      = useState('');
  const [vacancyId,   setVacancyId]   = useState(params.get('vacancy_id') || '');
  const [loading,     setLoading]     = useState(true);
  const [departments, setDepartments] = useState([]);
  const [vacancies,   setVacancies]   = useState([]);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data)).catch(() => {});
    listVacancies({ limit: 100 }).then(r => setVacancies(r.data.rows)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const p = { page, limit: 30 };
    if (search)    p.search      = search;
    if (phase)     p.phase       = phase;
    if (deptId)    p.department_id = deptId;
    if (vacancyId) p.vacancy_id  = vacancyId;
    listCandidates(p)
      .then(r => { setRows(r.data.rows); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, phase, deptId, vacancyId]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 30);

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="page-title">Candidatos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {total} candidato{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/recruit/candidates/new')}>
          <Plus size={15} /> Nuevo Candidato
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Search />
          <input className="form-input" placeholder="Buscar candidato, puesto, ID..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 180 }}
          value={phase} onChange={e => { setPhase(e.target.value); setPage(1); }}>
          <option value="">Todas las etapas</option>
          {PHASES.map(p => <option key={p} value={p}>{PHASE_ES[p]}</option>)}
        </select>
        <select className="form-select" style={{ width: 180 }}
          value={vacancyId} onChange={e => { setVacancyId(e.target.value); setPage(1); }}>
          <option value="">Todas las vacantes</option>
          {vacancies.map(v => <option key={v.id} value={v.id}>{v.job_id} — {v.job_title}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }}
          value={deptId} onChange={e => { setDeptId(e.target.value); setPage(1); }}>
          <option value="">Todos los depts.</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Vacante</th>
              <th>Departamento</th>
              <th>Fuente</th>
              <th>Aplicó</th>
              <th>Etapa</th>
              <th>Decisión</th>
              <th>Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <User size={36} />
                  <p>No se encontraron candidatos</p>
                </div>
              </td></tr>
            ) : rows.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/recruit/candidates/${c.id}`)}>
                <td className="primary-col">{c.candidate_name}</td>
                <td style={{ fontSize: 12 }}>{c.job_title}</td>
                <td style={{ fontSize: 12 }}>{c.department}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.source}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.applied_date?.slice(0, 10)}</td>
                <td>
                  <span className={`badge ${PHASE_BADGE[c.recruitment_phase] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                    {PHASE_ES[c.recruitment_phase] || c.recruitment_phase}
                  </span>
                </td>
                <td>
                  {c.final_decision ? (
                    <span className={`badge ${DECISION_BADGE[c.final_decision] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                      {DECISION_ES[c.final_decision]}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                </td>
                <td>
                  {c.ai_score != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 40, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${c.ai_score}%`,
                          background: c.ai_score >= 70 ? 'var(--success)' : c.ai_score >= 40 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {parseFloat(c.ai_score).toFixed(0)}%
                      </span>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '5px 8px' }}>{page} / {pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
