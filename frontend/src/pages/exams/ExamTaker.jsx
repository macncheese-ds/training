import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../api/axios';

export default function ExamTaker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('intro'); // intro | taking | results
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  // Start attempt
  const startExam = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/exams/${id}/start`, {});
      setExam(data.exam);
      setQuestions(data.questions);
      setAttemptId(data.attempt_id);
      setAnswers({});
      setCurrentQ(0);
      if (data.exam.time_limit_minutes) {
        setTimeLeft(data.exam.time_limit_minutes * 60);
      }
      setStep('taking');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar examen.');
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (step !== 'taking' || timeLeft === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step, timeLeft !== null]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerClass = () => {
    if (!timeLeft) return 'exam-timer';
    if (timeLeft < 60) return 'exam-timer danger';
    if (timeLeft < 300) return 'exam-timer warning';
    return 'exam-timer';
  };

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    try {
      const answerList = questions.map(q => ({
        question_id: q.id,
        user_answer: answers[q.id] !== undefined ? String(answers[q.id]) : '',
      }));
      const { data } = await api.post(`/exams/${id}/submit`, { attempt_id: attemptId, answers: answerList });
      setResults(data);
      setStep('results');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar examen.');
    } finally {
      setLoading(false);
    }
  };

  // ── Intro screen ──────────────────────────
  if (step === 'intro') {
    return (
      <div className="fade-in exam-container">
        <button className="btn btn-ghost mb-24" onClick={() => navigate(-1)}><ArrowLeft /> Volver</button>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Examen</h2>
          <p className="text-muted mb-24">Asegúrate de estar listo antes de comenzar.</p>
          {error && <div className="login-error mb-16">{error}</div>}
          <button className="btn btn-primary btn-lg" onClick={startExam} disabled={loading}>
            {loading ? 'Cargando...' : 'Comenzar Examen'}
          </button>
        </div>
      </div>
    );
  }

  // ── Results screen ────────────────────────
  if (step === 'results' && results) {
    return (
      <div className="fade-in exam-container">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          {results.passed ? (
            <CheckCircle2 size={56} style={{ color: 'var(--success)', marginBottom: 16 }} />
          ) : (
            <XCircle size={56} style={{ color: 'var(--danger)', marginBottom: 16 }} />
          )}
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>{results.passed ? '¡Aprobado!' : 'No Aprobado'}</h2>
          <p className="text-muted mb-24">Tu puntaje: {results.score.toFixed(1)}% — Mínimo: {exam?.passing_score}%</p>

          <div className="kpi-grid" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
            <div className="kpi-card">
              <span className="kpi-label">Puntaje</span>
              <span className="kpi-value" style={{ color: results.passed ? 'var(--success)' : 'var(--danger)' }}>
                {results.score.toFixed(1)}%
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Puntos</span>
              <span className="kpi-value">{results.earned_points}/{results.total_points}</span>
            </div>
          </div>

          {/* Review answers */}
          <div style={{ textAlign: 'left' }}>
            {questions.map((q, qi) => {
              const ans = results.answers?.find(a => a.question_id === q.id);
              return (
                <div key={q.id} className="question-card">
                  <div className="question-number">Pregunta {qi + 1}</div>
                  <div className="question-text">{q.question_text}</div>
                  {q.question_type === 'multiple_choice' && q.options && (
                    <div className="option-list">
                      {q.options.map((opt, oi) => {
                        const isUserAnswer = String(answers[q.id]) === String(oi);
                        const isCorrect = ans?.is_correct && isUserAnswer;
                        const isWrong = !ans?.is_correct && isUserAnswer;
                        return (
                          <div key={oi} className={`option-item${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}`}>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.question_type !== 'multiple_choice' && (
                    <div className={`option-item ${ans?.is_correct ? 'correct' : 'incorrect'}`}>
                      Tu respuesta: {answers[q.id] || '(vacía)'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate(-1)}>Regresar</button>
        </div>
      </div>
    );
  }

  // ── Taking exam ───────────────────────────
  const q = questions[currentQ];
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="fade-in exam-container">
      {/* Timer */}
      {timeLeft !== null && (
        <div className={timerClass()}>
          <Clock size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          {formatTime(timeLeft)}
        </div>
      )}

      {/* Progress */}
      <div className="exam-progress">
        <div className="exam-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex justify-between items-center mb-16">
        <span className="text-sm text-muted">Pregunta {currentQ + 1} de {questions.length}</span>
        <span className="text-sm text-muted">{answeredCount} respondidas</span>
      </div>

      {q && (
        <div className="question-card slide-up" key={currentQ}>
          <div className="question-number">Pregunta {currentQ + 1}</div>
          <div className="question-text">{q.question_text}</div>

          {q.question_type === 'multiple_choice' && q.options && (
            <div className="option-list">
              {q.options.map((opt, oi) => (
                <div
                  key={oi}
                  className={`option-item${answers[q.id] === String(oi) ? ' selected' : ''}`}
                  onClick={() => setAnswer(q.id, String(oi))}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {q.question_type === 'true_false' && (
            <div className="option-list">
              {['Verdadero', 'Falso'].map((label, i) => (
                <div
                  key={i}
                  className={`option-item${answers[q.id] === (i === 0 ? 'true' : 'false') ? ' selected' : ''}`}
                  onClick={() => setAnswer(q.id, i === 0 ? 'true' : 'false')}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {q.question_type === 'short_answer' && (
            <input
              className="form-input"
              placeholder="Tu respuesta..."
              value={answers[q.id] || ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              autoFocus
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-24">
        <button className="btn btn-secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)}>
          <ArrowLeft /> Anterior
        </button>
        {currentQ < questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrentQ(p => p + 1)}>
            Siguiente <ArrowRight />
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={submitExam} disabled={loading}>
            <Send /> {loading ? 'Enviando...' : 'Enviar Examen'}
          </button>
        )}
      </div>
    </div>
  );
}
