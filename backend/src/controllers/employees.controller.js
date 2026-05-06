const { credPool, trainingPool } = require('../config/db');

async function list(req, res) {
  const { search, role, area } = req.query;
  try {
    let sql = 'SELECT id, nombre, num_empleado, rol, area FROM users WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (nombre LIKE ? OR num_empleado LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (role)   { sql += ' AND rol = ?'; params.push(role); }
    if (area)   { sql += ' AND area = ?'; params.push(area); }
    if (req.user.platformRole === 'manager') { sql += ' AND area = ?'; params.push(req.user.area); }
    sql += ' ORDER BY nombre LIMIT 200';
    const [users] = await credPool.query(sql, params);
    res.json(users);
  } catch (err) {
    console.error('[EMPLOYEES] list:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function getProfile(req, res) {
  const userId = req.params.id || req.user.id;
  try {
    const [users] = await credPool.query(
      'SELECT id, nombre, num_empleado, rol, area FROM users WHERE id = ?', [userId]
    );
    if (!users.length) return res.status(404).json({ message: 'Empleado no encontrado.' });
    const user = users[0];

    // Assignments
    const [assignments] = await trainingPool.query(
      `SELECT ta.*, t.title, t.delivery_mode, t.duration_minutes, c.name AS category_name
       FROM training_assignments ta
       JOIN trainings t ON t.id = ta.training_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ta.user_id = ?
       ORDER BY ta.created_at DESC`, [userId]
    );

    // Skills
    const [skills] = await trainingPool.query(
      `SELECT es.*, s.name AS skill_name, s.max_level, s.level_labels
       FROM employee_skills es JOIN skills s ON s.id = es.skill_id
       WHERE es.user_id = ? ORDER BY s.name`, [userId]
    );

    // Exam attempts
    const [attempts] = await trainingPool.query(
      `SELECT ea.*, e.title AS exam_title
       FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.user_id = ? ORDER BY ea.started_at DESC LIMIT 20`, [userId]
    );

    res.json({ ...user, assignments, skills, exam_attempts: attempts });
  } catch (err) {
    console.error('[EMPLOYEES] getProfile:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function getRoles(_req, res) {
  try {
    const [rows] = await credPool.query('SELECT DISTINCT rol FROM users WHERE rol IS NOT NULL ORDER BY rol');
    res.json(rows.map(r => r.rol));
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function getAreas(_req, res) {
  try {
    const [rows] = await credPool.query('SELECT DISTINCT area FROM users WHERE area IS NOT NULL AND area != "" ORDER BY area');
    res.json(rows.map(r => r.area));
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

module.exports = { list, getProfile, getRoles, getAreas };
