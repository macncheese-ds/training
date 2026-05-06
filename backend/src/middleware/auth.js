const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'TrainingPlatformSecret2026';

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  const token  = header && header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
}

module.exports = { verifyToken, JWT_SECRET };
