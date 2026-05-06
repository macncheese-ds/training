const { trainingPool, credPool } = require('../config/db');
const notificationService = require('./notification.service');

/**
 * Mark assignments as overdue when due_date has passed.
 * Runs hourly via cron.
 */
async function markOverdueAssignments() {
  try {
    const [result] = await trainingPool.execute(
      `UPDATE training_assignments
       SET status = 'overdue'
       WHERE status IN ('pending', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW()`
    );
    if (result.affectedRows > 0) {
      console.log(`[AUTOMATION] Marked ${result.affectedRows} assignments as overdue`);
      // Notify affected users
      const [overdue] = await trainingPool.query(
        `SELECT ta.user_id, t.title FROM training_assignments ta
         JOIN trainings t ON t.id = ta.training_id
         WHERE ta.status = 'overdue' AND ta.updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`
      );
      for (const o of overdue) {
        await notificationService.create(o.user_id, 'overdue', 'Capacitación vencida',
          `La capacitación "${o.title}" ha vencido.`, 'training_assignment', null);
      }
    }
  } catch (err) {
    console.error('[AUTOMATION] markOverdueAssignments:', err);
  }
}

/**
 * Process recurring trainings: re-assign trainings that have recurrence_months
 * set and were last completed more than N months ago.
 * Runs daily via cron.
 */
async function processRecurringTrainings() {
  try {
    const [trainings] = await trainingPool.query(
      'SELECT * FROM trainings WHERE recurrence_months IS NOT NULL AND recurrence_months > 0 AND is_active = 1'
    );

    for (const t of trainings) {
      // Find users who completed this training and whose recurrence period has elapsed
      const [completed] = await trainingPool.query(
        `SELECT user_id, MAX(completed_at) AS last_completed
         FROM training_assignments
         WHERE training_id = ? AND status = 'completed'
         GROUP BY user_id
         HAVING last_completed < DATE_SUB(NOW(), INTERVAL ? MONTH)`,
        [t.id, t.recurrence_months]
      );

      for (const c of completed) {
        // Check if already has a pending re-assignment
        const [existing] = await trainingPool.query(
          `SELECT id FROM training_assignments
           WHERE training_id = ? AND user_id = ? AND status IN ('pending', 'in_progress')`,
          [t.id, c.user_id]
        );
        if (!existing.length) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          await trainingPool.execute(
            `INSERT INTO training_assignments (training_id, user_id, assigned_by, status, due_date, notes)
             VALUES (?, ?, 0, 'pending', ?, 'Recertificación automática')`,
            [t.id, c.user_id, dueDate]
          );
          await notificationService.create(c.user_id, 'assignment', 'Recertificación requerida',
            `La capacitación "${t.title}" requiere recertificación.`, 'training_assignment', t.id);
        }
      }
    }
  } catch (err) {
    console.error('[AUTOMATION] processRecurringTrainings:', err);
  }
}

/**
 * Sync new users: auto-assign mandatory trainings matching their role/area.
 * Can be called manually or via cron.
 */
async function syncNewUsers() {
  try {
    const [users] = await credPool.query('SELECT id, rol, area FROM users');
    const [trainings] = await trainingPool.query(
      'SELECT * FROM trainings WHERE is_mandatory = 1 AND is_active = 1'
    );

    let assignCount = 0;
    for (const user of users) {
      for (const t of trainings) {
        const roles = t.target_roles ? (typeof t.target_roles === 'string' ? JSON.parse(t.target_roles) : t.target_roles) : [];
        const areas = t.target_areas ? (typeof t.target_areas === 'string' ? JSON.parse(t.target_areas) : t.target_areas) : [];

        const roleMatch = !roles.length || roles.includes(user.rol);
        const areaMatch = !areas.length || areas.includes(user.area);

        if (roleMatch && areaMatch) {
          const [existing] = await trainingPool.query(
            `SELECT id FROM training_assignments
             WHERE training_id = ? AND user_id = ? AND status NOT IN ('expired')`,
            [t.id, user.id]
          );
          if (!existing.length) {
            await trainingPool.execute(
              `INSERT INTO training_assignments (training_id, user_id, assigned_by, status, notes)
               VALUES (?, ?, 0, 'pending', 'Auto-asignado por rol/área')`,
              [t.id, user.id]
            );
            assignCount++;
          }
        }
      }
    }
    console.log(`[AUTOMATION] syncNewUsers: ${assignCount} new assignments created`);
    return assignCount;
  } catch (err) {
    console.error('[AUTOMATION] syncNewUsers:', err);
    return 0;
  }
}

module.exports = { markOverdueAssignments, processRecurringTrainings, syncNewUsers };
