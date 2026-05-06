import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Grid3X3 } from 'lucide-react';
import api from '../../api/axios';

export default function SkillMatrix() {
  const [data, setData] = useState({ users: [], skills: [], matrix: {} });
  const [areas, setAreas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filterArea, setFilterArea] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/employees/areas').then(r => setAreas(r.data)).catch(() => {});
    api.get('/employees/roles').then(r => setRoles(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filterArea) params.area = filterArea;
    if (filterRole) params.role = filterRole;
    api.get('/skills/matrix', { params }).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterArea, filterRole]);

  const getLevelLabel = (skill, level) => {
    if (level === 0) return '—';
    try {
      const labels = typeof skill.level_labels === 'string' ? JSON.parse(skill.level_labels) : skill.level_labels;
      return labels?.[level] || `L${level}`;
    } catch { return `L${level}`; }
  };

  const handleExport = () => {
    window.open('/api/reports/export/skills', '_blank');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Matriz de Competencias</h2>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={handleExport}><Download /> Exportar Excel</button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><p>Cargando matriz...</p></div>
      ) : data.users.length === 0 || data.skills.length === 0 ? (
        <div className="empty-state"><Grid3X3 /><p>No hay datos suficientes para mostrar la matriz. Agrega competencias y empleados.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="matrix-grid" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180, textAlign: 'left' }}>Empleado</th>
                  <th style={{ minWidth: 80 }}>Área</th>
                  {data.skills.map(s => (
                    <th key={s.id} title={s.description || s.name} style={{ writingMode: 'vertical-lr', minWidth: 40, padding: '10px 6px', fontSize: 11 }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id}>
                    <td style={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/${u.id}`)}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.num_empleado}</div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{u.area}</td>
                    {data.skills.map(s => {
                      const level = data.matrix[u.id]?.[s.id] || 0;
                      return (
                        <td key={s.id} className={`skill-level-${Math.min(level, 3)}`} title={getLevelLabel(s, level)}>
                          {level}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
