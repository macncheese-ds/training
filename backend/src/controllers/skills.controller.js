const { trainingPool, credPool } = require('../config/db');

const DEFAULT_LEVEL_LABELS = '["Ninguno","Básico","Competente","Experto"]';

async function list(_req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT s.*, c.name AS category_name FROM skills s
       LEFT JOIN categories c ON c.id = s.category_id ORDER BY s.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function create(req, res) {
  const { name, description, max_level, level_labels, category_id } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre requerido.' });
  try {
    const [result] = await trainingPool.execute(
      'INSERT INTO skills (name, description, max_level, level_labels, category_id) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, max_level || 3,
       level_labels ? JSON.stringify(level_labels) : DEFAULT_LEVEL_LABELS,
       category_id || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Competencia creada.' });
  } catch (err) {
    console.error('[SKILLS] create:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function update(req, res) {
  const { name, description, max_level, level_labels, category_id } = req.body;
  try {
    await trainingPool.execute(
      'UPDATE skills SET name=?, description=?, max_level=?, level_labels=?, category_id=? WHERE id=?',
      [name, description || null, max_level || 3,
       level_labels ? JSON.stringify(level_labels) : null,
       category_id || null, req.params.id]
    );
    res.json({ message: 'Competencia actualizada.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('DELETE FROM skills WHERE id = ?', [req.params.id]);
    res.json({ message: 'Competencia eliminada.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function getMatrix(req, res) {
  const { area, role, skill_ids } = req.query;
  try {
    // Get employees
    let userSql = 'SELECT id, nombre, num_empleado, rol, area FROM users WHERE 1=1';
    const userParams = [];
    if (area) { userSql += ' AND area = ?'; userParams.push(area); }
    if (role) { userSql += ' AND rol = ?'; userParams.push(role); }
    if (req.user.platformRole === 'manager') {
      userSql += ' AND area = ?'; userParams.push(req.user.area);
    }
    userSql += ' ORDER BY area, nombre';
    const [users] = await credPool.query(userSql, userParams);

    // Get skills
    let skillSql = 'SELECT * FROM skills ORDER BY name';
    const skillParams = [];
    if (skill_ids) {
      const ids = skill_ids.split(',').map(Number);
      skillSql = `SELECT * FROM skills WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name`;
      skillParams.push(...ids);
    }
    const [skills] = await trainingPool.query(skillSql, skillParams);

    if (!users.length || !skills.length) return res.json({ users: [], skills: [], matrix: {} });

    // Get all employee_skills for these users
    const userIds = users.map(u => u.id);
    const [empSkills] = await trainingPool.query(
      `SELECT * FROM employee_skills WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );

    // Build matrix: { userId: { skillId: level } }
    const matrix = {};
    for (const u of users) matrix[u.id] = {};
    for (const es of empSkills) {
      if (matrix[es.user_id]) {
        // Keep highest level
        if (!matrix[es.user_id][es.skill_id] || es.current_level > matrix[es.user_id][es.skill_id]) {
          matrix[es.user_id][es.skill_id] = es.current_level;
        }
      }
    }

    res.json({ users, skills, matrix });
  } catch (err) {
    console.error('[SKILLS] getMatrix:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function getEmployeeSkills(req, res) {
  const userId = req.params.userId || req.user.id;
  try {
    const [skills] = await trainingPool.query(
      `SELECT es.*, s.name AS skill_name, s.max_level, s.level_labels, c.name AS category_name
       FROM employee_skills es
       JOIN skills s ON s.id = es.skill_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE es.user_id = ?
       ORDER BY s.name`,
      [userId]
    );
    res.json(skills);
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function setManualSkill(req, res) {
  const { user_id, skill_id, level } = req.body;
  try {
    await trainingPool.execute(
      `INSERT INTO employee_skills (user_id, skill_id, current_level, achieved_via, achieved_at)
       VALUES (?, ?, ?, 'manual', NOW())
       ON DUPLICATE KEY UPDATE current_level = VALUES(current_level), achieved_via = 'manual', achieved_at = NOW()`,
      [user_id, skill_id, level]
    );
    res.json({ message: 'Nivel actualizado.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function getGaps(req, res) {
  const { role, area } = req.query;
  try {
    // Get required skills per role
    let reqSql = 'SELECT * FROM role_required_skills';
    const reqParams = [];
    if (role) { reqSql += ' WHERE role_name = ?'; reqParams.push(role); }
    const [required] = await trainingPool.query(reqSql, reqParams);

    if (!required.length) return res.json([]);

    // Group by role
    const roleReqs = {};
    for (const r of required) {
      if (!roleReqs[r.role_name]) roleReqs[r.role_name] = [];
      roleReqs[r.role_name].push(r);
    }

    // Get employees
    let userSql = 'SELECT id, nombre, num_empleado, rol, area FROM users WHERE rol IN (?)';
    const roles = Object.keys(roleReqs);
    const [users] = await credPool.query(
      `SELECT id, nombre, num_empleado, rol, area FROM users WHERE rol IN (${roles.map(() => '?').join(',')})${area ? ' AND area = ?' : ''}`,
      area ? [...roles, area] : roles
    );

    const gaps = [];
    for (const user of users) {
      const reqs = roleReqs[user.rol] || [];
      for (const req of reqs) {
        const [es] = await trainingPool.query(
          'SELECT current_level FROM employee_skills WHERE user_id = ? AND skill_id = ? ORDER BY current_level DESC LIMIT 1',
          [user.id, req.skill_id]
        );
        const currentLevel = es.length ? es[0].current_level : 0;
        if (currentLevel < req.required_level) {
          gaps.push({
            user_id: user.id, nombre: user.nombre, num_empleado: user.num_empleado,
            rol: user.rol, area: user.area, skill_id: req.skill_id,
            required_level: req.required_level, current_level: currentLevel,
            gap: req.required_level - currentLevel,
          });
        }
      }
    }

    res.json(gaps);
  } catch (err) {
    console.error('[SKILLS] getGaps:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function setRequiredSkills(req, res) {
  const { role_name, skills: skillsList } = req.body;
  // skillsList: [{ skill_id, required_level }]
  try {
    await trainingPool.execute('DELETE FROM role_required_skills WHERE role_name = ?', [role_name]);
    if (skillsList && skillsList.length) {
      for (const s of skillsList) {
        await trainingPool.execute(
          'INSERT INTO role_required_skills (role_name, skill_id, required_level) VALUES (?, ?, ?)',
          [role_name, s.skill_id, s.required_level || 1]
        );
      }
    }
    res.json({ message: 'Requisitos actualizados.' });
  } catch (err) {
    console.error('[SKILLS] setRequiredSkills:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

module.exports = { list, create, update, remove, getMatrix, getEmployeeSkills, setManualSkill, getGaps, setRequiredSkills };
