const { trainingPool } = require('../config/db');

async function list(_req, res) {
  try {
    const [rows] = await trainingPool.query(
      `SELECT p.*, (SELECT COUNT(*) FROM package_items pi WHERE pi.package_id = p.id) AS item_count
       FROM training_packages p ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[PACKAGES] list:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function getById(req, res) {
  try {
    const [rows] = await trainingPool.query('SELECT * FROM training_packages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'No encontrado.' });
    const pkg = rows[0];
    const [items] = await trainingPool.query(
      `SELECT pi.*, t.title AS training_title, t.duration_minutes, t.delivery_mode
       FROM package_items pi JOIN trainings t ON t.id = pi.training_id
       WHERE pi.package_id = ? ORDER BY pi.sort_order`, [pkg.id]
    );
    pkg.items = items;
    res.json(pkg);
  } catch (err) {
    console.error('[PACKAGES] getById:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function create(req, res) {
  const { name, description, package_type, deadline_days, target_roles, target_areas, items } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre requerido.' });
  try {
    const [result] = await trainingPool.execute(
      `INSERT INTO training_packages (name, description, package_type, deadline_days, target_roles, target_areas, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, package_type || 'custom', deadline_days || 30,
       target_roles ? JSON.stringify(target_roles) : null, target_areas ? JSON.stringify(target_areas) : null, req.user.id]
    );
    const pkgId = result.insertId;
    if (items && items.length) {
      const vals = items.map((it, i) => [pkgId, it.training_id, i]);
      const ph = vals.map(() => '(?, ?, ?)').join(', ');
      await trainingPool.query(`INSERT INTO package_items (package_id, training_id, sort_order) VALUES ${ph}`, vals.flat());
    }
    res.status(201).json({ id: pkgId, message: 'Paquete creado.' });
  } catch (err) {
    console.error('[PACKAGES] create:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, description, package_type, deadline_days, target_roles, target_areas, is_active, items } = req.body;
  try {
    await trainingPool.execute(
      `UPDATE training_packages SET name=?, description=?, package_type=?, deadline_days=?,
       target_roles=?, target_areas=?, is_active=? WHERE id=?`,
      [name, description || null, package_type || 'custom', deadline_days || 30,
       target_roles ? JSON.stringify(target_roles) : null, target_areas ? JSON.stringify(target_areas) : null,
       is_active !== undefined ? is_active : 1, id]
    );
    if (items) {
      await trainingPool.execute('DELETE FROM package_items WHERE package_id = ?', [id]);
      if (items.length) {
        const vals = items.map((it, i) => [id, it.training_id, i]);
        const ph = vals.map(() => '(?, ?, ?)').join(', ');
        await trainingPool.query(`INSERT INTO package_items (package_id, training_id, sort_order) VALUES ${ph}`, vals.flat());
      }
    }
    res.json({ message: 'Paquete actualizado.' });
  } catch (err) {
    console.error('[PACKAGES] update:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('DELETE FROM training_packages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Paquete eliminado.' });
  } catch (err) {
    console.error('[PACKAGES] remove:', err);
    res.status(500).json({ message: 'Error.' });
  }
}

module.exports = { list, getById, create, update, remove };
