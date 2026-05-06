const { trainingPool } = require('../config/db');

async function list(_req, res) {
  try {
    const [rows] = await trainingPool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('[CATEGORIES] list:', err);
    res.status(500).json({ message: 'Error al obtener categorías.' });
  }
}

async function create(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre requerido.' });
  try {
    const [result] = await trainingPool.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    res.status(201).json({ id: result.insertId, name, description });
  } catch (err) {
    console.error('[CATEGORIES] create:', err);
    res.status(500).json({ message: 'Error al crear categoría.' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await trainingPool.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    res.json({ message: 'Categoría actualizada.' });
  } catch (err) {
    console.error('[CATEGORIES] update:', err);
    res.status(500).json({ message: 'Error al actualizar.' });
  }
}

async function remove(req, res) {
  try {
    await trainingPool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Categoría eliminada.' });
  } catch (err) {
    console.error('[CATEGORIES] remove:', err);
    res.status(500).json({ message: 'Error al eliminar.' });
  }
}

module.exports = { list, create, update, remove };
