const { trainingPool, credPool } = require('../config/db');
const notificationService = require('../services/notification.service');
const skillsService       = require('../services/skills.service');

async function listMy(req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT ta.*, t.title, t.description, t.delivery_mode, t.duration_minutes,
              t.content_url, t.material_path, c.name AS category_name
       FROM training_assignments ta
       JOIN trainings t ON t.id = ta.training_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ta.user_id = ?
       ORDER BY FIELD(ta.status,'overdue','pending','in_progress','completed','expired'), ta.due_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[ASSIGNMENTS] listMy:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function list(req, res) {
  try {
    const { status, training_id, user_id, area } = req.query;
    let sql = `SELECT ta.*, t.title AS training_title, t.delivery_mode
               FROM training_assignments ta
               JOIN trainings t ON t.id = ta.training_id
               WHERE 1=1`;
    const params = [];

    if (status)      { sql += ' AND ta.status = ?';      params.push(status); }
    if (training_id) { sql += ' AND ta.training_id = ?'; params.push(training_id); }
    if (user_id)     { sql += ' AND ta.user_id = ?';     params.push(user_id); }

    // Filter by area requires cross-DB lookup
    if (area) {
      const [users] = await credPool.query('SELECT id FROM users WHERE area = ?', [area]);
      const ids = users.map(u => u.id);
      if (ids.length) {
        sql += ` AND ta.user_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      } else {
        return res.json([]);
      }
    }

    // Manager: restrict to own area
    if (req.user.platformRole === 'manager') {
      const [areaUsers] = await credPool.query('SELECT id FROM users WHERE area = ?', [req.user.area]);
      const ids = areaUsers.map(u => u.id);
      if (ids.length) {
        sql += ` AND ta.user_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      } else {
        return res.json([]);
      }
    }

    sql += ' ORDER BY ta.created_at DESC';
    const [rows] = await trainingPool.query(sql, params);

    // Enrich with employee names
    if (rows.length) {
      const userIds = [...new Set(rows.map(r => r.user_id))];
      const [users] = await credPool.query(
        `SELECT id, nombre, num_empleado, rol, area FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      );
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      rows.forEach(r => {
        const u = userMap[r.user_id];
        if (u) { r.employee_name = u.nombre; r.employee_num = u.num_empleado; r.employee_area = u.area; r.employee_rol = u.rol; }
      });
    }

    res.json(rows);
  } catch (err) {
    console.error('[ASSIGNMENTS] list:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function assign(req, res) {
  const { training_id, user_ids, scheduled_date, due_date, notes, package_id } = req.body;
  if (!training_id || !user_ids || !user_ids.length) {
    return res.status(400).json({ message: 'training_id y user_ids requeridos.' });
  }
  try {
    const values = user_ids.map(uid => [training_id, uid, req.user.id, 'pending',
      scheduled_date || null, due_date || null, package_id || null, notes || null]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await trainingPool.query(
      `INSERT INTO training_assignments (training_id, user_id, assigned_by, status, scheduled_date, due_date, package_id, notes)
       VALUES ${placeholders}`,
      values.flat()
    );

    // Send notifications
    for (const uid of user_ids) {
      await notificationService.create(uid, 'assignment', 'Nueva capacitación asignada',
        `Se te ha asignado una nueva capacitación.`, 'training_assignment', training_id);
    }

    res.status(201).json({ message: `${user_ids.length} asignaciones creadas.` });
  } catch (err) {
    console.error('[ASSIGNMENTS] assign:', err);
    res.status(500).json({ message: 'Error al asignar.' });
  }
}

async function bulkAssign(req, res) {
  const { training_id, roles, areas, due_date, notes } = req.body;
  if (!training_id) return res.status(400).json({ message: 'training_id requerido.' });

  try {
    let sql = 'SELECT id FROM users WHERE 1=1';
    const params = [];
    if (roles && roles.length) {
      sql += ` AND rol IN (${roles.map(() => '?').join(',')})`;
      params.push(...roles);
    }
    if (areas && areas.length) {
      sql += ` AND area IN (${areas.map(() => '?').join(',')})`;
      params.push(...areas);
    }

    const [users] = await credPool.query(sql, params);
    if (!users.length) return res.json({ message: 'No se encontraron empleados con los filtros dados.', count: 0 });

    const userIds = users.map(u => u.id);

    // Avoid duplicate assignments
    const [existing] = await trainingPool.query(
      `SELECT user_id FROM training_assignments WHERE training_id = ? AND user_id IN (${userIds.map(() => '?').join(',')}) AND status NOT IN ('expired')`,
      [training_id, ...userIds]
    );
    const existingSet = new Set(existing.map(e => e.user_id));
    const newIds = userIds.filter(id => !existingSet.has(id));

    if (!newIds.length) return res.json({ message: 'Todos los empleados ya tienen esta asignación.', count: 0 });

    const values = newIds.map(uid => [training_id, uid, req.user.id, 'pending', due_date || null, null, notes || null]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    await trainingPool.query(
      `INSERT INTO training_assignments (training_id, user_id, assigned_by, status, due_date, package_id, notes)
       VALUES ${placeholders}`,
      values.flat()
    );

    for (const uid of newIds) {
      await notificationService.create(uid, 'assignment', 'Nueva capacitación asignada',
        'Se te ha asignado una nueva capacitación.', 'training_assignment', training_id);
    }

    res.status(201).json({ message: `${newIds.length} asignaciones creadas.`, count: newIds.length });
  } catch (err) {
    console.error('[ASSIGNMENTS] bulkAssign:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const completedAt = status === 'completed' ? new Date() : null;
    await trainingPool.execute(
      'UPDATE training_assignments SET status = ?, completed_at = ? WHERE id = ?',
      [status, completedAt, id]
    );

    if (status === 'completed') {
      // Trigger skill updates
      const [assignments] = await trainingPool.query('SELECT * FROM training_assignments WHERE id = ?', [id]);
      if (assignments.length) {
        await skillsService.onTrainingCompleted(assignments[0]);
      }
    }

    res.json({ message: 'Estado actualizado.' });
  } catch (err) {
    console.error('[ASSIGNMENTS] updateStatus:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { scheduled_date, due_date, notes, status } = req.body;
  try {
    await trainingPool.execute(
      'UPDATE training_assignments SET scheduled_date=?, due_date=?, notes=?, status=? WHERE id=?',
      [scheduled_date || null, due_date || null, notes || null, status || 'pending', id]
    );
    res.json({ message: 'Asignación actualizada.' });
  } catch (err) {
    console.error('[ASSIGNMENTS] update:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('DELETE FROM training_assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Asignación eliminada.' });
  } catch (err) {
    console.error('[ASSIGNMENTS] remove:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

module.exports = { listMy, list, assign, bulkAssign, updateStatus, update, remove };
