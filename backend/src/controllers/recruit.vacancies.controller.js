/**
 * recruit/vacancies.controller.js
 * All queries use trainingPool (training DB has vacancies table after migration).
 * recruiter_id maps to credenciales.users.id — name is joined via credPool.
 */
const { trainingPool, credPool } = require('../config/db');

const BASE_SELECT = `
  SELECT v.id, v.job_id, v.job_title, v.opening_date, v.status,
         v.hire_start_date, v.hiring_cost, v.description, v.requirements,
         v.notes, v.recruiter_id, v.created_by, v.created_at, v.updated_at,
         d.name AS department, d.id AS department_id
  FROM vacancies v
  JOIN recruit_departments d ON v.department_id = d.id
`;

// ── GET /api/recruit/vacancies ────────────────────────────
async function list(req, res, next) {
  try {
    const conditions = [];
    const values     = [];

    if (req.query.search) {
      conditions.push('(v.job_title LIKE ? OR v.job_id LIKE ?)');
      values.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }
    if (req.query.status)        { conditions.push('v.status = ?');         values.push(req.query.status); }
    if (req.query.department_id) { conditions.push('v.department_id = ?');  values.push(req.query.department_id); }
    if (req.query.recruiter_id)  { conditions.push('v.recruiter_id = ?');   values.push(req.query.recruiter_id); }

    const where   = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const validSorts = ['id','job_id','job_title','opening_date','status'];
    const sortBy  = validSorts.includes(req.query.sort_by) ? req.query.sort_by : 'id';
    const orderBy = `ORDER BY v.${sortBy} ${req.query.order === 'asc' ? 'ASC' : 'DESC'}`;
    const page    = Math.max(1, parseInt(req.query.page  || '1'));
    const limit   = Math.min(100, parseInt(req.query.limit || '25'));
    const offset  = (page - 1) * limit;

    const [[{ total }]] = await trainingPool.query(
      `SELECT COUNT(*) AS total FROM vacancies v JOIN recruit_departments d ON v.department_id=d.id ${where}`,
      values
    );

    const [rows] = await trainingPool.query(
      `${BASE_SELECT} ${where} ${orderBy} LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    // Attach recruiter names from credenciales
    if (rows.length) {
      const ids = [...new Set(rows.map(r => r.recruiter_id).filter(Boolean))];
      const [users] = await credPool.query(
        `SELECT id, nombre FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const userMap = Object.fromEntries(users.map(u => [u.id, u.nombre]));
      rows.forEach(r => { r.recruiter = userMap[r.recruiter_id] || '—'; });
    }

    res.json({ total, page, limit, rows });
  } catch (e) { next(e); }
}

// ── GET /api/recruit/vacancies/:id ───────────────────────
async function getOne(req, res, next) {
  try {
    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE v.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Vacante no encontrada.' });
    const v = rows[0];

    // recruiter name
    if (v.recruiter_id) {
      const [u] = await credPool.query('SELECT nombre FROM users WHERE id = ?', [v.recruiter_id]);
      v.recruiter = u[0]?.nombre || '—';
    }

    // candidate count per phase
    const [phases] = await trainingPool.query(
      `SELECT recruitment_phase AS phase, COUNT(*) AS count FROM candidates WHERE vacancy_id = ? GROUP BY recruitment_phase`,
      [req.params.id]
    );
    v.pipeline = phases;

    res.json(v);
  } catch (e) { next(e); }
}

// ── POST /api/recruit/vacancies ──────────────────────────
async function create(req, res, next) {
  try {
    const { department_id, job_title, opening_date, recruiter_id,
            status = 'Vacant', hire_start_date, hiring_cost, description, requirements, notes } = req.body;

    if (!department_id || !job_title || !opening_date || !recruiter_id) {
      return res.status(400).json({ error: 'department_id, job_title, opening_date, recruiter_id son requeridos.' });
    }

    // Generate next job_id
    const [[{ maxId }]] = await trainingPool.query(
      "SELECT MAX(CAST(SUBSTRING(job_id,4) AS UNSIGNED)) AS maxId FROM vacancies WHERE job_id LIKE 'HR-%'"
    );
    const job_id = `HR-${String((maxId || 0) + 1).padStart(4, '0')}`;

    const [r] = await trainingPool.query(
      `INSERT INTO vacancies (job_id,department_id,job_title,opening_date,recruiter_id,status,
                              hire_start_date,hiring_cost,description,requirements,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_id, department_id, job_title, opening_date, recruiter_id, status,
       hire_start_date || null, hiring_cost || null, description || null,
       requirements || null, notes || null, req.user.id]
    );

    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE v.id = ?`, [r.insertId]);
    const v = rows[0];
    const [u] = await credPool.query('SELECT nombre FROM users WHERE id = ?', [recruiter_id]);
    v.recruiter = u[0]?.nombre || '—';
    res.status(201).json(v);
  } catch (e) { next(e); }
}

// ── PUT /api/recruit/vacancies/:id ───────────────────────
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { department_id, job_title, opening_date, recruiter_id,
            status, hire_start_date, hiring_cost, description, requirements, notes } = req.body;

    await trainingPool.query(
      `UPDATE vacancies SET department_id=?,job_title=?,opening_date=?,recruiter_id=?,status=?,
                            hire_start_date=?,hiring_cost=?,description=?,requirements=?,notes=?,updated_at=NOW()
       WHERE id=?`,
      [department_id, job_title, opening_date, recruiter_id, status,
       hire_start_date || null, hiring_cost || null, description || null,
       requirements || null, notes || null, id]
    );

    const [rows] = await trainingPool.query(`${BASE_SELECT} WHERE v.id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Vacante no encontrada.' });
    const v = rows[0];
    const [u] = await credPool.query('SELECT nombre FROM users WHERE id = ?', [v.recruiter_id]);
    v.recruiter = u[0]?.nombre || '—';
    res.json(v);
  } catch (e) { next(e); }
}

// ── DELETE /api/recruit/vacancies/:id (soft → Cancelled) ─
async function remove(req, res, next) {
  try {
    await trainingPool.query(
      "UPDATE vacancies SET status='Cancelled', updated_at=NOW() WHERE id=?",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, create, update, remove };
