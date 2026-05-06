const { trainingPool } = require('../config/db');

async function list(req, res) {
  try {
    const { category_id, is_active, delivery_mode, search } = req.query;
    let sql = `SELECT t.*, c.name AS category_name
               FROM trainings t
               LEFT JOIN categories c ON c.id = t.category_id
               WHERE 1=1`;
    const params = [];

    if (category_id)   { sql += ' AND t.category_id = ?';   params.push(category_id); }
    if (is_active !== undefined) { sql += ' AND t.is_active = ?'; params.push(is_active); }
    if (delivery_mode) { sql += ' AND t.delivery_mode = ?';  params.push(delivery_mode); }
    if (search)        { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY t.created_at DESC';
    const [rows] = await trainingPool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[TRAININGS] list:', err);
    res.status(500).json({ message: 'Error al obtener capacitaciones.' });
  }
}

async function getById(req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT t.*, c.name AS category_name
       FROM trainings t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'No encontrada.' });

    const training = rows[0];

    // Get linked exams
    const [exams] = await trainingPool.query(
      `SELECT e.*, te.is_required
       FROM training_exams te
       JOIN exams e ON e.id = te.exam_id
       WHERE te.training_id = ?`, [training.id]
    );
    training.exams = exams;

    // Get linked skills
    const [skills] = await trainingPool.query(
      `SELECT s.*, ts.grants_level, ts.min_exam_score
       FROM training_skills ts
       JOIN skills s ON s.id = ts.skill_id
       WHERE ts.training_id = ?`, [training.id]
    );
    training.skills = skills;

    res.json(training);
  } catch (err) {
    console.error('[TRAININGS] getById:', err);
    res.status(500).json({ message: 'Error al obtener capacitación.' });
  }
}

async function create(req, res) {
  const { title, description, category_id, delivery_mode, is_mandatory,
          duration_minutes, recurrence_months, target_roles, target_areas, content_url } = req.body;
  if (!title) return res.status(400).json({ message: 'Título requerido.' });

  try {
    const materialPath = req.file ? req.file.filename : null;
    const [result] = await trainingPool.execute(
      `INSERT INTO trainings (title, description, category_id, delivery_mode, is_mandatory,
        duration_minutes, recurrence_months, target_roles, target_areas, content_url, material_path, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, category_id || null, delivery_mode || 'asynchronous',
       is_mandatory ? 1 : 0, duration_minutes || null, recurrence_months || null,
       target_roles ? JSON.stringify(typeof target_roles === 'string' ? JSON.parse(target_roles) : target_roles) : null,
       target_areas ? JSON.stringify(typeof target_areas === 'string' ? JSON.parse(target_areas) : target_areas) : null,
       content_url || null, materialPath, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Capacitación creada.' });
  } catch (err) {
    console.error('[TRAININGS] create:', err);
    res.status(500).json({ message: 'Error al crear capacitación.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { title, description, category_id, delivery_mode, is_mandatory,
          duration_minutes, recurrence_months, target_roles, target_areas, content_url, is_active } = req.body;
  try {
    const materialPath = req.file ? req.file.filename : undefined;
    let sql = `UPDATE trainings SET title=?, description=?, category_id=?, delivery_mode=?,
               is_mandatory=?, duration_minutes=?, recurrence_months=?, target_roles=?,
               target_areas=?, content_url=?, is_active=?`;
    const params = [
      title, description || null, category_id || null, delivery_mode || 'asynchronous',
      is_mandatory ? 1 : 0, duration_minutes || null, recurrence_months || null,
      target_roles ? JSON.stringify(typeof target_roles === 'string' ? JSON.parse(target_roles) : target_roles) : null,
      target_areas ? JSON.stringify(typeof target_areas === 'string' ? JSON.parse(target_areas) : target_areas) : null,
      content_url || null, is_active !== undefined ? is_active : 1,
    ];
    if (materialPath) { sql += ', material_path=?'; params.push(materialPath); }
    sql += ' WHERE id=?';
    params.push(id);

    await trainingPool.execute(sql, params);
    res.json({ message: 'Capacitación actualizada.' });
  } catch (err) {
    console.error('[TRAININGS] update:', err);
    res.status(500).json({ message: 'Error al actualizar.' });
  }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('UPDATE trainings SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Capacitación desactivada.' });
  } catch (err) {
    console.error('[TRAININGS] remove:', err);
    res.status(500).json({ message: 'Error al eliminar.' });
  }
}

async function linkExam(req, res) {
  const { exam_id, is_required } = req.body;
  try {
    await trainingPool.execute(
      'INSERT INTO training_exams (training_id, exam_id, is_required) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_required = VALUES(is_required)',
      [req.params.id, exam_id, is_required !== undefined ? is_required : 1]
    );
    res.json({ message: 'Examen vinculado.' });
  } catch (err) {
    console.error('[TRAININGS] linkExam:', err);
    res.status(500).json({ message: 'Error al vincular examen.' });
  }
}

async function unlinkExam(req, res) {
  try {
    await trainingPool.execute(
      'DELETE FROM training_exams WHERE training_id = ? AND exam_id = ?',
      [req.params.id, req.params.examId]
    );
    res.json({ message: 'Examen desvinculado.' });
  } catch (err) {
    console.error('[TRAININGS] unlinkExam:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function linkSkill(req, res) {
  const { skill_id, grants_level, min_exam_score } = req.body;
  try {
    await trainingPool.execute(
      `INSERT INTO training_skills (training_id, skill_id, grants_level, min_exam_score)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grants_level = VALUES(grants_level), min_exam_score = VALUES(min_exam_score)`,
      [req.params.id, skill_id, grants_level || 1, min_exam_score || null]
    );
    res.json({ message: 'Competencia vinculada.' });
  } catch (err) {
    console.error('[TRAININGS] linkSkill:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function unlinkSkill(req, res) {
  try {
    await trainingPool.execute(
      'DELETE FROM training_skills WHERE training_id = ? AND skill_id = ?',
      [req.params.id, req.params.skillId]
    );
    res.json({ message: 'Competencia desvinculada.' });
  } catch (err) {
    console.error('[TRAININGS] unlinkSkill:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

module.exports = { list, getById, create, update, remove, linkExam, unlinkExam, linkSkill, unlinkSkill };
