/**
 * recruit/settings.controller.js
 * CRUD for recruit_departments, recruit_sources, and recruiters list.
 * Uses trainingPool for recruit tables, credPool for HR user lookups.
 */
const { trainingPool, credPool } = require('../config/db');

// ── Departments ──────────────────────────────────────────
async function getDepartments(_req, res, next) {
  try {
    const [rows] = await trainingPool.query('SELECT * FROM recruit_departments ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
}

async function createDepartment(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido.' });
    const [r] = await trainingPool.query('INSERT INTO recruit_departments (name) VALUES (?)', [name]);
    const [rows] = await trainingPool.query('SELECT * FROM recruit_departments WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

async function updateDepartment(req, res, next) {
  try {
    const { name, active } = req.body;
    await trainingPool.query('UPDATE recruit_departments SET name=?, active=? WHERE id=?',
      [name, active ? 1 : 0, req.params.id]);
    const [rows] = await trainingPool.query('SELECT * FROM recruit_departments WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function deleteDepartment(req, res, next) {
  try {
    await trainingPool.query('UPDATE recruit_departments SET active=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── Sources ──────────────────────────────────────────────
async function getSources(_req, res, next) {
  try {
    const [rows] = await trainingPool.query('SELECT * FROM recruit_sources ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
}

async function createSource(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido.' });
    const [r] = await trainingPool.query('INSERT INTO recruit_sources (name) VALUES (?)', [name]);
    const [rows] = await trainingPool.query('SELECT * FROM recruit_sources WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
}

async function updateSource(req, res, next) {
  try {
    const { name, active } = req.body;
    await trainingPool.query('UPDATE recruit_sources SET name=?, active=? WHERE id=?',
      [name, active ? 1 : 0, req.params.id]);
    const [rows] = await trainingPool.query('SELECT * FROM recruit_sources WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { next(e); }
}

async function deleteSource(req, res, next) {
  try {
    await trainingPool.query('UPDATE recruit_sources SET active=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ── Recruiters (from credenciales.users where rol is HR) ─
// Returns HR-role users to populate recruiter dropdowns
async function getRecruiters(_req, res, next) {
  try {
    const [rows] = await credPool.query(
      `SELECT id, nombre, num_empleado, rol, area FROM users
       WHERE rol IN ('Recursos Humanos','Administrador','Reclutador')
          OR editor = 1
       ORDER BY nombre`
    );
    res.json(rows);
  } catch (e) { next(e); }
}

module.exports = {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getSources, createSource, updateSource, deleteSource,
  getRecruiters,
};
