import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import api from '../../api/axios';

export default function EmployeeSearch() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/employees/roles').then(r => setRoles(r.data)).catch(() => {});
    api.get('/employees/areas').then(r => setAreas(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (filterRole) params.role = filterRole;
    if (filterArea) params.area = filterArea;
    api.get('/employees', { params }).then(r => setEmployees(r.data)).catch(() => {});
  }, [search, filterRole, filterArea]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Empleados</h2>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search />
          <input className="form-input" placeholder="Buscar por nombre o número..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-select" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {employees.length === 0 ? (
        <div className="empty-state"><Users /><p>No se encontraron empleados.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Num. Empleado</th><th>Rol</th><th>Área</th></tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} onClick={() => navigate(`/employees/${e.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="primary-col">{e.nombre}</td>
                  <td>{e.num_empleado}</td>
                  <td><span className="badge badge-neutral">{e.rol}</span></td>
                  <td>{e.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
