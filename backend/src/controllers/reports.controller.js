const { trainingPool, credPool } = require('../config/db');
const XLSX = require('xlsx');

async function dashboard(req, res) {
  try {
    let areaFilter = '';
    const params = [];
    if (req.user.platformRole === 'manager') {
      const [areaUsers] = await credPool.query('SELECT id FROM users WHERE area = ?', [req.user.area]);
      const ids = areaUsers.map(u => u.id);
      if (ids.length) {
        areaFilter = ` AND ta.user_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      } else {
        return res.json({ total_assignments: 0, completed: 0, pending: 0, overdue: 0, completion_rate: 0, skill_gaps: 0 });
      }
    }

    const [[totals]] = await trainingPool.query(
      `SELECT
         COUNT(*) AS total_assignments,
         SUM(status = 'completed') AS completed,
         SUM(status = 'pending' OR status = 'in_progress') AS pending,
         SUM(status = 'overdue') AS overdue
       FROM training_assignments ta WHERE 1=1${areaFilter}`, params
    );

    const completionRate = totals.total_assignments > 0
      ? ((totals.completed / totals.total_assignments) * 100).toFixed(1) : 0;

    // Skill gaps count
    const [gaps] = await trainingPool.query('SELECT COUNT(*) AS cnt FROM role_required_skills');
    const gapCount = gaps[0]?.cnt || 0;

    // Recent completions (last 7 days)
    const [recent] = await trainingPool.query(
      `SELECT COUNT(*) AS cnt FROM training_assignments ta
       WHERE status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)${areaFilter}`, params
    );

    // Exams stats
    const [examStats] = await trainingPool.query(
      `SELECT COUNT(*) AS total_attempts, AVG(score) AS avg_score,
              SUM(passed = 1) AS passed_count
       FROM exam_attempts WHERE completed_at IS NOT NULL`
    );

    res.json({
      total_assignments: totals.total_assignments || 0,
      completed: totals.completed || 0,
      pending: totals.pending || 0,
      overdue: totals.overdue || 0,
      completion_rate: parseFloat(completionRate),
      recent_completions: recent[0]?.cnt || 0,
      exam_total_attempts: examStats[0]?.total_attempts || 0,
      exam_avg_score: examStats[0]?.avg_score ? parseFloat(examStats[0].avg_score).toFixed(1) : 0,
      exam_pass_rate: examStats[0]?.total_attempts > 0
        ? ((examStats[0].passed_count / examStats[0].total_attempts) * 100).toFixed(1) : 0,
      skill_gaps: gapCount,
    });
  } catch (err) {
    console.error('[REPORTS] dashboard:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function exportTrainings(req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT ta.id, ta.status, ta.due_date, ta.completed_at,
              t.title AS training, t.delivery_mode, t.is_mandatory
       FROM training_assignments ta
       JOIN trainings t ON t.id = ta.training_id
       ORDER BY ta.created_at DESC`
    );

    // Enrich with employee data
    if (rows.length) {
      const [assignments] = await trainingPool.query('SELECT id, user_id FROM training_assignments');
      const uidMap = Object.fromEntries(assignments.map(a => [a.id, a.user_id]));
      const allUids = [...new Set(Object.values(uidMap))];
      if (allUids.length) {
        const [users] = await credPool.query(
          `SELECT id, nombre, num_empleado, rol, area FROM users WHERE id IN (${allUids.map(() => '?').join(',')})`, allUids
        );
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));
        rows.forEach(r => {
          const uid = uidMap[r.id];
          const u = userMap[uid];
          if (u) { r.empleado = u.nombre; r.num_empleado = u.num_empleado; r.area = u.area; r.rol = u.rol; }
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Empleado': r.empleado || '', 'Num Empleado': r.num_empleado || '',
      'Área': r.area || '', 'Rol': r.rol || '', 'Capacitación': r.training,
      'Modo': r.delivery_mode, 'Obligatoria': r.is_mandatory ? 'Sí' : 'No',
      'Estado': r.status, 'Fecha Límite': r.due_date || '', 'Completada': r.completed_at || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capacitaciones');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-capacitaciones.xlsx"');
    res.send(buf);
  } catch (err) {
    console.error('[REPORTS] exportTrainings:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function exportSkills(req, res) {
  try {
    const [users] = await credPool.query('SELECT id, nombre, num_empleado, rol, area FROM users ORDER BY area, nombre');
    const [skills] = await trainingPool.query('SELECT * FROM skills ORDER BY name');
    const [empSkills] = await trainingPool.query('SELECT * FROM employee_skills');

    const matrix = {};
    empSkills.forEach(es => {
      if (!matrix[es.user_id]) matrix[es.user_id] = {};
      matrix[es.user_id][es.skill_id] = es.current_level;
    });

    const data = users.map(u => {
      const row = { 'Empleado': u.nombre, 'Num': u.num_empleado, 'Rol': u.rol, 'Área': u.area };
      skills.forEach(s => { row[s.name] = matrix[u.id]?.[s.id] || 0; });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="matriz-competencias.xlsx"');
    res.send(buf);
  } catch (err) {
    console.error('[REPORTS] exportSkills:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

module.exports = { dashboard, exportTrainings, exportSkills };
