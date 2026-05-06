import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import api from '../../api/axios';

export default function ExamBuilder() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', passing_score: 70, time_limit_minutes: '',
    max_attempts: 3, cooldown_hours: 24, randomize_questions: true, randomize_answers: true,
  });
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/exams/${id}`).then(r => {
        const e = r.data;
        setForm({
          title: e.title, description: e.description || '', passing_score: e.passing_score,
          time_limit_minutes: e.time_limit_minutes || '', max_attempts: e.max_attempts,
          cooldown_hours: e.cooldown_hours, randomize_questions: !!e.randomize_questions,
          randomize_answers: !!e.randomize_answers,
        });
        setQuestions(e.questions.map(q => ({
          ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
        })));
      }).catch(() => {});
    }
  }, [id]);

  const addQuestion = (type) => {
    setQuestions(prev => [...prev, {
      question_type: type, question_text: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : [],
      correct_answer: type === 'true_false' ? 'true' : '', points: 1,
    }]);
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const addOption = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || questions.length === 0) { alert('Título y al menos una pregunta requeridos.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, questions };
      if (isEdit) await api.put(`/exams/${id}`, payload);
      else await api.post('/exams', payload);
      navigate('/exams');
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/exams')}><ArrowLeft /> Volver</button>
        <h2>{isEdit ? 'Editar Examen' : 'Nuevo Examen'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card mb-16">
          <div className="card-title mb-16">Configuración General</div>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Puntaje para Aprobar (%)</label>
              <input className="form-input" type="number" value={form.passing_score} onChange={e => setForm(p => ({ ...p, passing_score: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tiempo Límite (min)</label>
              <input className="form-input" type="number" placeholder="Sin límite" value={form.time_limit_minutes} onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Máx. Intentos</label>
              <input className="form-input" type="number" value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Enfriamiento (horas)</label>
              <input className="form-input" type="number" value={form.cooldown_hours} onChange={e => setForm(p => ({ ...p, cooldown_hours: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-16">
            <label className="form-check"><input type="checkbox" checked={form.randomize_questions} onChange={e => setForm(p => ({ ...p, randomize_questions: e.target.checked }))} /> Orden aleatorio de preguntas</label>
            <label className="form-check"><input type="checkbox" checked={form.randomize_answers} onChange={e => setForm(p => ({ ...p, randomize_answers: e.target.checked }))} /> Orden aleatorio de respuestas</label>
          </div>
        </div>

        {/* Questions */}
        <div className="card-title mb-16">Preguntas ({questions.length})</div>
        {questions.map((q, qi) => (
          <div key={qi} className="card mb-16 slide-up">
            <div className="flex justify-between items-center mb-16">
              <span className="question-number">Pregunta {qi + 1} — {q.question_type === 'multiple_choice' ? 'Opción Múltiple' : q.question_type === 'true_false' ? 'Verdadero/Falso' : 'Respuesta Corta'}</span>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeQuestion(qi)}><Trash2 /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Pregunta</label>
              <textarea className="form-textarea" value={q.question_text} onChange={e => updateQuestion(qi, 'question_text', e.target.value)} style={{ minHeight: 60 }} />
            </div>
            {q.question_type === 'multiple_choice' && (
              <>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex gap-8 items-center mb-8">
                    <input className="form-input" placeholder={`Opción ${oi + 1}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} style={{ flex: 1 }} />
                    <label className="form-check">
                      <input type="radio" name={`correct_${qi}`} checked={q.correct_answer === String(oi)} onChange={() => updateQuestion(qi, 'correct_answer', String(oi))} />
                      Correcta
                    </label>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => addOption(qi)}>+ Agregar opción</button>
              </>
            )}
            {q.question_type === 'true_false' && (
              <div className="flex gap-16">
                <label className="form-check"><input type="radio" name={`tf_${qi}`} checked={q.correct_answer === 'true'} onChange={() => updateQuestion(qi, 'correct_answer', 'true')} /> Verdadero</label>
                <label className="form-check"><input type="radio" name={`tf_${qi}`} checked={q.correct_answer === 'false'} onChange={() => updateQuestion(qi, 'correct_answer', 'false')} /> Falso</label>
              </div>
            )}
            {q.question_type === 'short_answer' && (
              <div className="form-group">
                <label className="form-label">Respuesta Correcta</label>
                <input className="form-input" value={q.correct_answer} onChange={e => updateQuestion(qi, 'correct_answer', e.target.value)} />
              </div>
            )}
            <div className="form-group mt-8">
              <label className="form-label">Puntos</label>
              <input className="form-input" type="number" value={q.points} onChange={e => updateQuestion(qi, 'points', e.target.value)} style={{ width: 100 }} />
            </div>
          </div>
        ))}

        <div className="flex gap-8 mb-24">
          <button type="button" className="btn btn-secondary" onClick={() => addQuestion('multiple_choice')}><Plus /> Opción Múltiple</button>
          <button type="button" className="btn btn-secondary" onClick={() => addQuestion('true_false')}><Plus /> V/F</button>
          <button type="button" className="btn btn-secondary" onClick={() => addQuestion('short_answer')}><Plus /> Respuesta Corta</button>
        </div>

        <div className="flex justify-between">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/exams')}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}><Save /> {saving ? 'Guardando...' : 'Guardar Examen'}</button>
        </div>
      </form>
    </div>
  );
}
