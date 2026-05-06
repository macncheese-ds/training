import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileQuestion } from 'lucide-react';
import api from '../../api/axios';

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/exams').then(r => setExams(r.data)).catch(() => {});
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Exámenes</h2>
        <button className="btn btn-primary" onClick={() => navigate('/exams/new')}><Plus /> Nuevo Examen</button>
      </div>

      {exams.length === 0 ? (
        <div className="empty-state"><FileQuestion /><p>No hay exámenes creados.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Título</th><th>Preguntas</th><th>Aprobación</th><th>Límite Tiempo</th><th>Intentos</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {exams.map(e => (
                <tr key={e.id} onClick={() => navigate(`/exams/${e.id}/edit`)} style={{ cursor: 'pointer' }}>
                  <td className="primary-col">{e.title}</td>
                  <td>{e.question_count}</td>
                  <td>{e.passing_score}%</td>
                  <td>{e.time_limit_minutes ? `${e.time_limit_minutes} min` : 'Sin límite'}</td>
                  <td>{e.max_attempts}</td>
                  <td>{e.is_active ? <span className="badge badge-success">Activo</span> : <span className="badge badge-neutral">Inactivo</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
