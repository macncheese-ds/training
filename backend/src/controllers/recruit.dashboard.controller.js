/**
 * recruit/dashboard.controller.js
 * KPIs, pipeline funnel, monthly trend, decision breakdown, and source stats.
 * All data from trainingPool (recruit tables merged into training DB).
 */
const { trainingPool } = require('../config/db');

function buildFilters(query) {
  const conditions = [];
  const values     = [];

  if (query.recruiter_id)  { conditions.push('v.recruiter_id = ?');  values.push(query.recruiter_id); }
  if (query.department_id) { conditions.push('v.department_id = ?'); values.push(query.department_id); }
  if (query.vacancy_id)    { conditions.push('v.id = ?');            values.push(query.vacancy_id); }
  if (query.date_from)     { conditions.push('c.applied_date >= ?'); values.push(query.date_from); }
  if (query.date_to)       { conditions.push('c.applied_date <= ?'); values.push(query.date_to); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : 'WHERE 1=1';
  return { where, values };
}

// ── GET /api/recruit/dashboard/kpis ──────────────────────
async function getKpis(req, res, next) {
  try {
    const { where, values } = buildFilters(req.query);

    const [costRows]       = await trainingPool.query(
      `SELECT COALESCE(SUM(v.hiring_cost),0) AS total_cost
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id=v.id ${where}`, values);

    const [hiredRows]      = await trainingPool.query(
      `SELECT COUNT(DISTINCT c.id) AS hired_count FROM vacancies v
       JOIN candidates c ON c.vacancy_id=v.id ${where} AND c.final_decision='Hired'`, values);

    const [activeRows]     = await trainingPool.query(
      `SELECT COUNT(DISTINCT v.id) AS active_count FROM vacancies v
       LEFT JOIN candidates c ON c.vacancy_id=v.id ${where} AND v.status='Vacant'`, values);

    const [totalVacRows]   = await trainingPool.query(
      `SELECT COUNT(DISTINCT v.id) AS total_vac,
              SUM(CASE WHEN v.status='Filled' THEN 1 ELSE 0 END) AS filled_vac
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id=v.id ${where}`, values);

    const [avgDaysRows]    = await trainingPool.query(
      `SELECT ROUND(AVG(DATEDIFF(v.hire_start_date,v.opening_date)),1) AS avg_days
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id=v.id
       ${where} AND v.status='Filled' AND v.hire_start_date IS NOT NULL`, values);

    const [pendingReview]  = await trainingPool.query(
      `SELECT COUNT(*) AS cnt FROM candidates c
       JOIN vacancies v ON c.vacancy_id=v.id ${where}
       AND c.recruitment_phase IN ('Interviews','Tests','Job Offer')
       AND c.final_decision IS NULL`, values);

    const totalCost    = parseFloat(costRows[0].total_cost) || 0;
    const hiredCount   = parseInt(hiredRows[0].hired_count) || 0;
    const totalVac     = parseInt(totalVacRows[0].total_vac) || 0;
    const filledVac    = parseInt(totalVacRows[0].filled_vac) || 0;
    const activeVac    = parseInt(activeRows[0].active_count) || 0;
    const avgDays      = parseFloat(avgDaysRows[0].avg_days) || 0;
    const costPerHire  = hiredCount > 0 ? Math.round(totalCost / hiredCount) : 0;
    const fillRate     = totalVac > 0 ? Math.round((filledVac / totalVac) * 100) : 0;
    const pendingCount = parseInt(pendingReview[0].cnt) || 0;

    res.json({ total_cost: totalCost, cost_per_hire: costPerHire, avg_days: avgDays,
               active_vac: activeVac, fill_rate: fillRate, total_vac: totalVac,
               filled_vac: filledVac, hired_count: hiredCount, pending_review: pendingCount });
  } catch (e) { next(e); }
}

// ── GET /api/recruit/dashboard/pipeline ──────────────────
async function getPipeline(req, res, next) {
  try {
    const { where, values } = buildFilters(req.query);
    const [rows] = await trainingPool.query(
      `SELECT c.recruitment_phase AS phase, COUNT(c.id) AS count
       FROM candidates c JOIN vacancies v ON c.vacancy_id=v.id ${where}
       GROUP BY c.recruitment_phase
       ORDER BY FIELD(c.recruitment_phase,
         'Received Application','Sent to Manager','Interviews','Tests','Job Offer','Hired')`,
      values
    );
    res.json(rows);
  } catch (e) { next(e); }
}

// ── GET /api/recruit/dashboard/by-month ──────────────────
async function getByMonth(req, res, next) {
  try {
    const { where, values } = buildFilters(req.query);
    const [rows] = await trainingPool.query(
      `SELECT DATE_FORMAT(c.applied_date,'%Y-%m') AS month, COUNT(c.id) AS count
       FROM candidates c JOIN vacancies v ON c.vacancy_id=v.id ${where}
       GROUP BY month ORDER BY month`,
      values
    );
    res.json(rows);
  } catch (e) { next(e); }
}

// ── GET /api/recruit/dashboard/decisions ─────────────────
async function getDecisions(req, res, next) {
  try {
    const { where, values } = buildFilters(req.query);
    const [rows] = await trainingPool.query(
      `SELECT c.final_decision AS decision, COUNT(c.id) AS count
       FROM candidates c JOIN vacancies v ON c.vacancy_id=v.id ${where}
       AND c.final_decision IS NOT NULL GROUP BY c.final_decision`,
      values
    );
    res.json(rows);
  } catch (e) { next(e); }
}

// ── GET /api/recruit/dashboard/sources ───────────────────
async function getSources(req, res, next) {
  try {
    const { where, values } = buildFilters(req.query);
    const [rows] = await trainingPool.query(
      `SELECT s.name AS source, COUNT(c.id) AS count
       FROM candidates c
       JOIN vacancies v ON c.vacancy_id=v.id
       JOIN recruit_sources s ON c.source_id=s.id ${where}
       GROUP BY s.name ORDER BY count DESC`,
      values
    );
    res.json(rows);
  } catch (e) { next(e); }
}

module.exports = { getKpis, getPipeline, getByMonth, getDecisions, getSources };
