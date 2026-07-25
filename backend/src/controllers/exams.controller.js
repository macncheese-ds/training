const { trainingPool } = require('../config/db');
const skillsService = require('../services/skills.service');

/* ── CRUD ─────────────────────────────────────────────── */
async function list(_req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM exam_questions q WHERE q.exam_id = e.id) AS question_count,
              s.name AS linked_skill_name
       FROM exams e
       LEFT JOIN skills s ON s.id = e.linked_skill_id
       ORDER BY e.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function getById(req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT e.*, s.name AS linked_skill_name
       FROM exams e LEFT JOIN skills s ON s.id = e.linked_skill_id
       WHERE e.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'No encontrado.' });
    const exam = rows[0];
    const [questions] = await trainingPool.query(
      'SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order', [exam.id]
    );
    exam.questions = questions;
    res.json(exam);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function create(req, res) {
  const { title, description, passing_score, time_limit_minutes, max_attempts,
          cooldown_hours, randomize_questions, randomize_answers,
          affects_skill_matrix, linked_skill_id, skill_level_granted,
          questions } = req.body;
  if (!title) return res.status(400).json({ message: 'Título requerido.' });
  try {
    const [result] = await trainingPool.execute(
      `INSERT INTO exams (title, description, passing_score, time_limit_minutes, max_attempts,
        cooldown_hours, randomize_questions, randomize_answers,
        affects_skill_matrix, linked_skill_id, skill_level_granted, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, passing_score || 70, time_limit_minutes || null,
       max_attempts || 3, cooldown_hours || 24, randomize_questions ? 1 : 0,
       randomize_answers ? 1 : 0,
       affects_skill_matrix ? 1 : 0, linked_skill_id || null,
       skill_level_granted || 1, req.user.id]
    );
    const examId = result.insertId;
    if (questions && questions.length) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await trainingPool.execute(
          `INSERT INTO exam_questions (exam_id, question_type, question_text, options, correct_answer, points, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [examId, q.question_type, q.question_text,
           q.options ? JSON.stringify(q.options) : null,
           q.correct_answer, q.points || 1, i]
        );
      }
    }
    res.status(201).json({ id: examId, message: 'Examen creado.' });
  } catch (err) {
    console.error('[EXAMS] create:', err);
    res.status(500).json({ message: 'Error al crear examen.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { title, description, passing_score, time_limit_minutes, max_attempts,
          cooldown_hours, randomize_questions, randomize_answers, is_active,
          affects_skill_matrix, linked_skill_id, skill_level_granted,
          questions } = req.body;
  try {
    await trainingPool.execute(
      `UPDATE exams SET title=?, description=?, passing_score=?, time_limit_minutes=?,
       max_attempts=?, cooldown_hours=?, randomize_questions=?, randomize_answers=?, is_active=?,
       affects_skill_matrix=?, linked_skill_id=?, skill_level_granted=?
       WHERE id=?`,
      [title, description || null, passing_score || 70, time_limit_minutes || null,
       max_attempts || 3, cooldown_hours || 24, randomize_questions ? 1 : 0,
       randomize_answers ? 1 : 0, is_active !== undefined ? is_active : 1,
       affects_skill_matrix ? 1 : 0, linked_skill_id || null,
       skill_level_granted || 1, id]
    );
    if (questions) {
      await trainingPool.execute('DELETE FROM exam_questions WHERE exam_id = ?', [id]);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await trainingPool.execute(
          `INSERT INTO exam_questions (exam_id, question_type, question_text, options, correct_answer, points, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, q.question_type, q.question_text,
           q.options ? JSON.stringify(q.options) : null,
           q.correct_answer, q.points || 1, i]
        );
      }
    }
    res.json({ message: 'Examen actualizado.' });
  } catch (err) {
    console.error('[EXAMS] update:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('UPDATE exams SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Examen desactivado.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

/* ── Attempt flow ────────────────────────────────────── */
async function startAttempt(req, res) {
  const examId = req.params.id;
  const userId = req.user.id;
  const assignmentId = req.body.assignment_id || null;
  try {
    const [exams] = await trainingPool.query('SELECT * FROM exams WHERE id = ? AND is_active = 1', [examId]);
    if (!exams.length) return res.status(404).json({ message: 'Examen no encontrado.' });
    const exam = exams[0];

    // Check attempts limit
    const [attempts] = await trainingPool.query(
      'SELECT * FROM exam_attempts WHERE exam_id = ? AND user_id = ? ORDER BY started_at DESC',
      [examId, userId]
    );
    if (attempts.length >= exam.max_attempts) {
      return res.status(403).json({ message: `Límite de intentos alcanzado (${exam.max_attempts}).` });
    }

    // Check cooldown
    if (attempts.length > 0) {
      const last = attempts[0];
      if (last.completed_at) {
        const cooldownMs = (exam.cooldown_hours || 0) * 60 * 60 * 1000;
        const elapsed = Date.now() - new Date(last.completed_at).getTime();
        if (elapsed < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - elapsed) / 3600000);
          return res.status(403).json({ message: `Debes esperar ${remaining}h antes del siguiente intento.` });
        }
      }
    }

    // Get questions
    let [questions] = await trainingPool.query(
      'SELECT id, question_type, question_text, options, points, sort_order FROM exam_questions WHERE exam_id = ? ORDER BY sort_order',
      [examId]
    );

    // Randomize if configured
    if (exam.randomize_questions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    if (exam.randomize_answers) {
      questions = questions.map(q => {
        if (q.question_type === 'multiple_choice' && q.options) {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          q.options = opts.sort(() => Math.random() - 0.5);
        }
        return q;
      });
    }

    // Create attempt record
    const [result] = await trainingPool.execute(
      'INSERT INTO exam_attempts (exam_id, user_id, assignment_id, started_at) VALUES (?, ?, ?, NOW())',
      [examId, userId, assignmentId]
    );

    res.json({
      attempt_id: result.insertId,
      exam: { id: exam.id, title: exam.title, time_limit_minutes: exam.time_limit_minutes, passing_score: exam.passing_score },
      questions: questions.map(q => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options })),
      attempt_number: attempts.length + 1,
      max_attempts: exam.max_attempts,
    });
  } catch (err) {
    console.error('[EXAMS] startAttempt:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function submitAttempt(req, res) {
  const examId = req.params.id;
  const { attempt_id, answers } = req.body;
  // answers: [{ question_id, user_answer }]
  try {
    const [attemptRows] = await trainingPool.query(
      'SELECT * FROM exam_attempts WHERE id = ? AND exam_id = ? AND user_id = ?',
      [attempt_id, examId, req.user.id]
    );
    if (!attemptRows.length) return res.status(404).json({ message: 'Intento no encontrado.' });
    const attempt = attemptRows[0];
    if (attempt.completed_at) return res.status(400).json({ message: 'Este intento ya fue completado.' });

    const [exams] = await trainingPool.query('SELECT * FROM exams WHERE id = ?', [examId]);
    const exam = exams[0];

    const [questions] = await trainingPool.query('SELECT * FROM exam_questions WHERE exam_id = ?', [examId]);
    const qMap = Object.fromEntries(questions.map(q => [q.id, q]));

    let totalPoints = 0;
    let earnedPoints = 0;
    const graded = (answers || []).map(a => {
      const q = qMap[a.question_id];
      if (!q) return { ...a, is_correct: false, points_earned: 0 };
      totalPoints += parseFloat(q.points);
      let correct = false;
      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        correct = String(a.user_answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      } else {
        correct = String(a.user_answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      }
      const pts = correct ? parseFloat(q.points) : 0;
      earnedPoints += pts;
      return { question_id: a.question_id, user_answer: a.user_answer, is_correct: correct, points_earned: pts };
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= parseFloat(exam.passing_score);
    const duration = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    await trainingPool.execute(
      'UPDATE exam_attempts SET score=?, passed=?, answers=?, completed_at=NOW(), duration_seconds=? WHERE id=?',
      [score.toFixed(2), passed ? 1 : 0, JSON.stringify(graded), duration, attempt_id]
    );

    // If passed: trigger skill matrix update when affects_skill_matrix=1
    // This runs regardless of whether there is an assignment_id
    if (passed) {
      await skillsService.onExamPassed(attempt.assignment_id, examId, req.user.id, score);
    }

    res.json({
      score: parseFloat(score.toFixed(2)),
      passed,
      earned_points: earnedPoints,
      total_points: totalPoints,
      duration_seconds: duration,
      answers: graded,
    });
  } catch (err) {
    console.error('[EXAMS] submitAttempt:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function getAttempts(req, res) {
  try {
    const [rows] = await trainingPool.query(
      'SELECT * FROM exam_attempts WHERE exam_id = ? ORDER BY started_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function getMyAttempts(req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT ea.*, e.title AS exam_title
       FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.user_id = ? ORDER BY ea.started_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

module.exports = { list, getById, create, update, remove, startAttempt, submitAttempt, getAttempts, getMyAttempts };
