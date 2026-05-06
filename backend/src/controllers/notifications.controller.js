const { trainingPool } = require('../config/db');

async function list(req, res) {
  try {
    const [rows] = await trainingPool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [[{ cnt }]] = await trainingPool.query(
      'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]
    );
    res.json({ notifications: rows, unread_count: cnt });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function markRead(req, res) {
  try {
    await trainingPool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]);
    res.json({ message: 'Leída.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

async function markAllRead(req, res) {
  try {
    await trainingPool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Todas leídas.' });
  } catch (err) { res.status(500).json({ message: 'Error.' }); }
}

module.exports = { list, markRead, markAllRead };
