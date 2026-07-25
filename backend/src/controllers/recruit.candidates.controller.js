/**
 * recruit/candidates.controller.js
 *
 * Handles CRUD for candidates, CV upload tracking, notes, and the
 * hiring flow that inserts into credenciales.users.
 *
 * AI / rule-based resume scoring:
 *   scoreCandidate() computes a 0–100 fit score by comparing the words
 *   in the candidate's notes/resume fields against the vacancy.requirements
 *   text. This is keyword/TF-IDF-style matching — no external API needed.
 *   HR can always override: the score is shown as decision support only.
 *   To improve this in the future, replace scoreCandidate() with a call to
 *   an external LLM API (e.g. OpenAI) using the stored resume_path + requirements.
 */

const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const { trainingPool, credPool } = require('../config/db');

const BASE_SELECT = `
  SELECT c.id, c.candidate_name, c.email, c.phone, c.applied_date,
         c.recruitment_phase, c.final_decision, c.decision_comment,
         c.resume_path, c.resume_original, c.ai_score, c.ai_summary, c.ai_scored_at,
         c.notes, c.hired_user_id, c.created_by, c.created_at, c.updated_at,
         v.id AS vacancy_id, v.job_id, v.job_title, v.status AS vacancy_status,
         d.name AS department, d.id AS department_id,
         s.name AS source, s.id AS source_id
  FROM candidates c
  JOIN vacancies       v ON c.vacancy_id   = v.id
  JOIN recruit_departments d ON v.department_id = d.id
  JOIN recruit_sources    s ON c.source_id    = s.id
`;

// ── Rule-based resume scoring ─────────────────────────────
// Compares tokenized vacancy requirements vs candidate notes/name.
// Improves naturally when HR fills in the requirements field on vacancies.
// Replace body with external AI call for production-grade analysis.
function scoreCandidate(requirements, candidateText) {
  if (!requirements || !candidateText) return null;

  const tokenize = str =>
    str.toLowerCase()
       .replace(/[^\w\s]/g, ' ')
       .split(/\s+/)
       .filter(w => w.length > 3);

  const reqTokens  = new Set(tokenize(requirements));
  const candTokens = tokenize(candidateText);

  if (!reqTokens.size) return null;

  let matched = 0;
  candTokens.forEach(t => { if (reqTokens.has(t)) matched++; });

  // score: matched / total_requirements capped at 100
  const raw = Math.min(100, Math.round((matched / reqTokens.size) * 100));
  return raw;
}

// ── GET /api/recruit/candidates ───────────────────────────
async function list(req, res, next) {
  try {
    const conditions = [];
    const values     = [];

    if (req.query.search) {
      conditions.push('(c.candidate_name LIKE ? OR v.job_title LIKE ? OR v.job_id LIKE ? OR c.email LIKE ?)');
      values.push(...Array(4).fill(`%${req.query.search}%`));
    }
    if (req.query.phase)         { conditions.push('c.recruitment_phase = ?'); values.push(req.query.phase); }
    if (req.query.decision)      { conditions.push('c.final_decision = ?');    values.push(req.query.decision); }
    if (req.query.vacancy_id)    { conditions.push('c.vacancy_id = ?');        values.push(req.query.vacancy_id); }
    if (req.query.department_id) { conditions.push('v.department_id = ?');     values.push(req.query.department_id); }
    if (req.query.source_id)     { conditions.push('c.source_id = ?');         values.push(req.query.source_id); }

    const where   = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const validSorts = ['id','candidate_name','applied_date','recruitment_phase','final_decision','ai_score'];
    const sortBy  = validSorts.includes(req.query.sort_by) ? `c.${req.query.sort_by}` : 'c.id';
    const orderBy = `ORDER BY ${sortBy} ${req.query.order === 'asc' ? 'ASC' : 'DESC'}`;
    const page    = Math.max(1, parseInt(req.query.page  || '1'));
    const limit   = Math.min(100, parseInt(req.query.limit || '25'));
    const offset  = (page - 1) * limit;

    const [[{ total }]] = await trainingPool.query(
      `SELECT COUNT(*) AS total FROM candidates c
       JOIN vacancies v ON c.vacancy_id=v.id
       JOIN recruit_departments d ON v.department_id=d.id
       JOIN recruit_sources s ON c.source_id=s.id ${where}`,
      values
    );

    const [rows] = await trainingPool.query(
      `${BASE_SELECT} ${where} ${orderBy} LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    res.json({ total, page, limit, rows });
  } catch (e) { next(e); }
}

// ── GET /api/recruit/candidates/:id ──────────────────────
async function getOne(req, res, next) {
  try {
    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE c.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidato no encontrado.' });

    const [notes] = await trainingPool.query(
      `SELECT cn.*, cn.user_id FROM candidate_notes cn WHERE cn.candidate_id = ? ORDER BY cn.created_at DESC`,
      [req.params.id]
    );

    // Resolve note author names from credenciales
    if (notes.length) {
      const ids = [...new Set(notes.map(n => n.user_id))];
      const [users] = await credPool.query(
        `SELECT id, nombre FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids
      );
      const userMap = Object.fromEntries(users.map(u => [u.id, u.nombre]));
      notes.forEach(n => { n.author = userMap[n.user_id] || '—'; });
    }

    res.json({ ...rows[0], notes });
  } catch (e) { next(e); }
}

// ── POST /api/recruit/candidates ─────────────────────────
async function create(req, res, next) {
  try {
    const {
      vacancy_id, source_id, candidate_name, applied_date,
      recruitment_phase = 'Received Application', final_decision,
      decision_comment, email, phone, notes,
    } = req.body;

    if (!vacancy_id || !source_id || !candidate_name || !applied_date) {
      return res.status(400).json({ error: 'vacancy_id, source_id, candidate_name, applied_date son requeridos.' });
    }

    const [r] = await trainingPool.query(
      `INSERT INTO candidates (vacancy_id,source_id,candidate_name,applied_date,recruitment_phase,
                               final_decision,decision_comment,email,phone,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [vacancy_id, source_id, candidate_name, applied_date, recruitment_phase,
       final_decision || null, decision_comment || null, email || null, phone || null,
       notes || null, req.user.id]
    );

    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE c.id = ?`, [r.insertId]);
    res.status(201).json({ ...rows[0], notes: [] });
  } catch (e) { next(e); }
}

// ── PUT /api/recruit/candidates/:id ──────────────────────
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      vacancy_id, source_id, candidate_name, applied_date,
      recruitment_phase, final_decision, decision_comment,
      email, phone, notes,
    } = req.body;

    await trainingPool.query(
      `UPDATE candidates SET vacancy_id=?,source_id=?,candidate_name=?,applied_date=?,
       recruitment_phase=?,final_decision=?,decision_comment=?,email=?,phone=?,notes=?,updated_at=NOW()
       WHERE id=?`,
      [vacancy_id, source_id, candidate_name, applied_date, recruitment_phase,
       final_decision || null, decision_comment || null, email || null, phone || null, notes || null, id]
    );

    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidato no encontrado.' });

    const [noteRows] = await trainingPool.query(
      `SELECT * FROM candidate_notes WHERE candidate_id = ? ORDER BY created_at DESC`, [id]
    );
    res.json({ ...rows[0], notes: noteRows });
  } catch (e) { next(e); }
}

// ── DELETE /api/recruit/candidates/:id ───────────────────
async function remove(req, res, next) {
  try {
    // Remove uploaded CV file if present
    const [rows] = await trainingPool.query('SELECT resume_path FROM candidates WHERE id=?', [req.params.id]);
    if (rows[0]?.resume_path) {
      const filePath = path.join(__dirname, '../../uploads', rows[0].resume_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await trainingPool.query('DELETE FROM candidates WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── POST /api/recruit/candidates/:id/upload-cv ──────────
// Handled by multer middleware in the route, this controller reads req.file
async function uploadCV(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const relativePath = `resumes/${req.file.filename}`;
    await trainingPool.query(
      'UPDATE candidates SET resume_path=?, resume_original=?, updated_at=NOW() WHERE id=?',
      [relativePath, req.file.originalname, req.params.id]
    );

    // Trigger AI scoring after upload
    const [rows] = await trainingPool.query(
      `SELECT c.notes, v.requirements FROM candidates c
       JOIN vacancies v ON c.vacancy_id = v.id WHERE c.id = ?`,
      [req.params.id]
    );

    if (rows.length && rows[0].requirements) {
      const candidateText = [rows[0].notes || ''].join(' ');
      const score = scoreCandidate(rows[0].requirements, candidateText);
      if (score !== null) {
        const summary = score >= 70
          ? 'El perfil del candidato coincide bien con los requisitos de la vacante.'
          : score >= 40
            ? 'Coincidencia parcial con los requisitos de la vacante.'
            : 'Coincidencia baja con los requisitos de la vacante.';
        await trainingPool.query(
          'UPDATE candidates SET ai_score=?, ai_summary=?, ai_scored_at=NOW() WHERE id=?',
          [score, summary, req.params.id]
        );
      }
    }

    res.json({ ok: true, path: relativePath, original: req.file.originalname });
  } catch (e) { next(e); }
}

// ── POST /api/recruit/candidates/:id/notes ───────────────
async function addNote(req, res, next) {
  try {
    const { note, note_type = 'general' } = req.body;
    if (!note) return res.status(400).json({ error: 'La nota no puede estar vacía.' });

    const [r] = await trainingPool.query(
      'INSERT INTO candidate_notes (candidate_id, user_id, note, note_type) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, note, note_type]
    );

    const [rows] = await trainingPool.query('SELECT * FROM candidate_notes WHERE id=?', [r.insertId]);
    const n = rows[0];
    const [u] = await credPool.query('SELECT nombre FROM users WHERE id=?', [req.user.id]);
    n.author = u[0]?.nombre || '—';
    res.status(201).json(n);
  } catch (e) { next(e); }
}

// ── POST /api/recruit/candidates/:id/rescore ─────────────
// Manually trigger AI scoring (useful when requirements are updated after candidate creation)
async function rescore(req, res, next) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT c.notes, c.candidate_name, v.requirements FROM candidates c
       JOIN vacancies v ON c.vacancy_id = v.id WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Candidato no encontrado.' });

    const { requirements, notes, candidate_name } = rows[0];
    const candidateText = [candidate_name, notes || ''].join(' ');
    const score = scoreCandidate(requirements, candidateText);

    if (score === null) {
      return res.json({ ok: false, reason: 'Vacante sin requisitos definidos.' });
    }

    const summary = score >= 70
      ? 'El perfil del candidato coincide bien con los requisitos de la vacante.'
      : score >= 40
        ? 'Coincidencia parcial con los requisitos de la vacante.'
        : 'Coincidencia baja con los requisitos de la vacante.';

    await trainingPool.query(
      'UPDATE candidates SET ai_score=?, ai_summary=?, ai_scored_at=NOW() WHERE id=?',
      [score, summary, req.params.id]
    );

    res.json({ ok: true, ai_score: score, ai_summary: summary });
  } catch (e) { next(e); }
}

// ── POST /api/recruit/candidates/:id/hire ────────────────
// Onboarding: creates the employee record in credenciales.users
// and marks candidate as Hired. Requires HR admin role.
async function hire(req, res, next) {
  try {
    const { num_empleado, password, nombre_override, rol = 'Operador', area } = req.body;

    if (!num_empleado || !password) {
      return res.status(400).json({ error: 'num_empleado y password son requeridos para el alta.' });
    }

    // Check candidate exists
    const [cands] = await trainingPool.query(
      `SELECT c.*, v.job_title FROM candidates c JOIN vacancies v ON c.vacancy_id=v.id WHERE c.id=?`,
      [req.params.id]
    );
    if (!cands.length) return res.status(404).json({ error: 'Candidato no encontrado.' });
    const candidate = cands[0];

    if (candidate.final_decision === 'Hired') {
      return res.status(400).json({ error: 'Este candidato ya fue dado de alta.' });
    }

    // Validate employee number is not already used
    const normalized = num_empleado.toString().trim();
    const [existing] = await credPool.query(
      'SELECT id FROM users WHERE num_empleado = ?', [normalized]
    );
    if (existing.length) {
      return res.status(409).json({ error: `El número de empleado ${normalized} ya existe en credenciales.` });
    }

    // Hash password with bcryptjs (same as existing auth flow)
    const pass_hash = await bcrypt.hash(password, 12);

    // Insert into credenciales.users
    const nombre = nombre_override || candidate.candidate_name;
    const [ins] = await credPool.query(
      `INSERT INTO users (nombre, num_empleado, pass_hash, rol, area, editor)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [nombre, normalized, pass_hash, rol, area || candidate.department || '']
    );
    const newUserId = ins.insertId;

    // Mark candidate as hired + store link to new user
    await trainingPool.query(
      `UPDATE candidates
       SET recruitment_phase='Hired', final_decision='Hired', hired_user_id=?, updated_at=NOW()
       WHERE id=?`,
      [newUserId, req.params.id]
    );

    // Update vacancy status to Filled
    await trainingPool.query(
      "UPDATE vacancies SET status='Filled', hire_start_date=CURDATE(), updated_at=NOW() WHERE id=?",
      [candidate.vacancy_id]
    );

    // Add system note
    await trainingPool.query(
      `INSERT INTO candidate_notes (candidate_id, user_id, note, note_type) VALUES (?,?,?,?)`,
      [req.params.id, req.user.id,
       `Candidato contratado. Número de empleado: ${normalized}. Dado de alta en sistema credenciales.`,
       'system']
    );

    res.json({ ok: true, user_id: newUserId, num_empleado: normalized, nombre });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, create, update, remove, uploadCV, addNote, rescore, hire };
