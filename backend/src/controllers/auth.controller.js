const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { credPool } = require('../config/db');
const { mapRole }  = require('../middleware/rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'TrainingPlatformSecret2026';

function normalizeInput(input) {
  let n = String(input).trim();
  const m = n.match(/^0*(\d+)([A-Za-z])?$/);
  if (m) n = m[1] + (m[2] || 'A');
  else   n = n.replace(/^0+/, '') + 'A';
  return n;
}

async function login(req, res) {
  const { employee_input, password } = req.body;
  if (!employee_input || !password) {
    return res.status(400).json({ message: 'Número de empleado y contraseña son requeridos.' });
  }

  try {
    const normalized = normalizeInput(employee_input);
    const [rows] = await credPool.execute(
      'SELECT id, nombre, num_empleado, pass_hash, rol, area, editor FROM users WHERE num_empleado = ? OR num_empleado = ? LIMIT 1',
      [normalized, employee_input]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    const user = rows[0];
    const hash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString() : user.pass_hash;
    const ok   = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta.' });

    const platformRole = mapRole(user.rol, user.editor);

    const token = jwt.sign(
      {
        id:           user.id,
        num_empleado: user.num_empleado,
        nombre:       user.nombre,
        rol:          user.rol,
        area:         user.area,
        editor:       user.editor,
        platformRole,
      },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    res.json({
      token,
      user: {
        id:           user.id,
        num_empleado: user.num_empleado,
        nombre:       user.nombre,
        rol:          user.rol,
        area:         user.area,
        platformRole,
      },
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

async function me(req, res) {
  try {
    const [rows] = await credPool.execute(
      'SELECT id, nombre, num_empleado, rol, area, editor FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado.' });
    const u = rows[0];
    res.json({ ...u, platformRole: mapRole(u.rol, u.editor) });
  } catch (err) {
    console.error('[AUTH] me error:', err);
    res.status(500).json({ message: 'Error interno.' });
  }
}

module.exports = { login, me };
