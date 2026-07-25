import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Briefcase, Users, TrendingUp, Clock, DollarSign,
  CheckCircle, AlertCircle, ChevronRight, Plus,
} from 'lucide-react';
import {
  getDashboardKpis, getDashboardPipeline,
  getDashboardByMonth, getDashboardDecisions, getDashboardSources,
  getDepartments, getRecruiters,
} from '../../api/recruit';

const PHASE_COLORS = {
  'Received Application': '#5c5c66',
  'Sent to Manager':      '#6e8efb',
  'Interviews':           '#a78bfa',
  'Tests':                '#f0b429',
  'Job Offer':            '#42a5f5',
  'Hired':                '#3dd68c',
};

const DECISION_COLORS = {
  'Hired':                '#3dd68c',
  'Candidate in Process': '#6e8efb',
  'Candidate Refusal':    '#f0b429',
  'Not Hired':            '#ef5350',
};

const fmt = n =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : n !== undefined ? String(n) : '—';

export default function RecruitDashboard() {
  const navigate = useNavigate();
  const [kpis,      setKpis]      = useState(null);
  const [pipeline,  setPipeline]  = useState([]);
  const [byMonth,   setByMonth]   = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [sources,   setSources]   = useState([]);
  const [filters,   setFilters]   = useState({ recruiter_id: '', department_id: '' });
  const [recruiters, setRecruiters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getRecruiters(), getDepartments()])
      .then(([r, d]) => { setRecruiters(r.data); setDepartments(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    Promise.all([
      getDashboardKpis(p),
      getDashboardPipeline(p),
      getDashboardByMonth(p),
      getDashboardDecisions(p),
      getDashboardSources(p),
    ]).then(([k, pipe, mon, dec, src]) => {
      setKpis(k.data);
      setPipeline(pipe.data);
      setByMonth(mon.data);
      setDecisions(dec.data);
      setSources(src.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="page-title">Reclutamiento</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Resumen del proceso de selección y contratación
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/recruit/vacancies')}>
            <Briefcase size={15} /> Vacantes
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/recruit/vacancies/new')}>
            <Plus size={15} /> Nueva Vacante
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select className="form-select" style={{ maxWidth: 200 }}
          value={filters.recruiter_id} onChange={e => setFilter('recruiter_id', e.target.value)}>
          <option value="">Todos los reclutadores</option>
          {recruiters.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 200 }}
          value={filters.department_id} onChange={e => setFilter('department_id', e.target.value)}>
          <option value="">Todos los departamentos</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', marginBottom: 24 }}>
          <div className="kpi-card">
            <span className="kpi-label">Vacantes Activas</span>
            <span className="kpi-value" style={{ color: 'var(--accent)' }}>{kpis.active_vac}</span>
            <span className="kpi-change neutral">{kpis.total_vac} total</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Tasa de Llenado</span>
            <span className="kpi-value" style={{ color: kpis.fill_rate >= 60 ? 'var(--success)' : 'var(--warning)' }}>
              {kpis.fill_rate}%
            </span>
            <span className="kpi-change neutral">{kpis.filled_vac} llenadas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Contratados</span>
            <span className="kpi-value" style={{ color: 'var(--success)' }}>{kpis.hired_count}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Días Promedio Contratación</span>
            <span className="kpi-value" style={{ color: 'var(--text-primary)' }}>{kpis.avg_days || '—'}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Costo por Contratación</span>
            <span className="kpi-value" style={{ fontSize: 22, color: 'var(--text-primary)' }}>{fmt(kpis.cost_per_hire)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Pendientes de Revisión</span>
            <span className="kpi-value" style={{ color: kpis.pending_review > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {kpis.pending_review}
            </span>
            <span className="kpi-change neutral">entrevistas / pruebas</span>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Pipeline funnel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pipeline de Candidatos</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recruit/candidates')}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          {pipeline.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Users size={32} style={{ opacity: 0.2 }} />
              <p>Sin datos de pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pipeline.map(row => {
                const total = pipeline.reduce((s, r) => s + r.count, 0);
                const pct   = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={row.phase}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.phase}</span>
                      <span style={{ color: PHASE_COLORS[row.phase] || 'var(--accent)', fontWeight: 600 }}>
                        {row.count}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: PHASE_COLORS[row.phase] || 'var(--accent)',
                        borderRadius: 3, transition: 'width 600ms ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Decisions pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Decisiones Finales</span>
          </div>
          {decisions.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <CheckCircle size={32} style={{ opacity: 0.2 }} />
              <p>Sin datos de decisiones</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={decisions} dataKey="count" nameKey="decision" cx="50%" cy="50%" outerRadius={70} label={({ decision, percent }) => `${decision}: ${(percent * 100).toFixed(0)}%`}>
                  {decisions.map((d, i) => (
                    <Cell key={i} fill={DECISION_COLORS[d.decision] || '#6e8efb'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Candidatos']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Monthly trend */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Candidatos por Mes</span>
          </div>
          {byMonth.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <TrendingUp size={32} style={{ opacity: 0.2 }} />
              <p>Sin datos históricos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={byMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)' }} name="Candidatos" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sources */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Fuentes de Candidatos</span>
          </div>
          {sources.length === 0 ? (
            <div className="empty-state" style={{ padding: 16 }}>
              <p style={{ fontSize: 12 }}>Sin datos</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.slice(0, 6).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.source}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
