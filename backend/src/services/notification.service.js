const { trainingPool } = require('../config/db');

async function create(userId, type, title, message, refType, refId) {
  try {
    await trainingPool.execute(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message || null, refType || null, refId || null]
    );
  } catch (err) {
    console.error('[NOTIFICATION] create error:', err);
  }
}

module.exports = { create };
