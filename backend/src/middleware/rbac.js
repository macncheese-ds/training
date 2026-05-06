/**
 * Role-Based Access Control middleware.
 *
 * Maps credenciales.users.rol → platform role:
 *   ADMIN   → Administrador, Recursos Humanos
 *   MANAGER → Supervisor, Lider, Ingeniero  (or editor=1)
 *   USER    → everyone else
 */

const ADMIN_ROLES   = ['Administrador', 'Recursos Humanos'];
const MANAGER_ROLES = ['Supervisor', 'Lider', 'Ingeniero'];

function mapRole(credRole, editor) {
  if (ADMIN_ROLES.includes(credRole))   return 'admin';
  if (MANAGER_ROLES.includes(credRole)) return 'manager';
  if (editor === 1)                     return 'manager';
  return 'user';
}

/** Require at least one of the given platform roles */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const role = req.user.platformRole;
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción.' });
    }
    next();
  };
}

const requireAdmin   = requireRole('admin');
const requireManager = requireRole('admin', 'manager');
const requireAny     = (_req, _res, next) => next(); // just needs valid token

module.exports = { mapRole, requireRole, requireAdmin, requireManager, requireAny };
