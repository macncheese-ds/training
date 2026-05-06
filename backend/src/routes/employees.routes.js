const router = require('express').Router();
const ctrl   = require('../controllers/employees.controller');
const { verifyToken }   = require('../middleware/auth');
const { requireManager } = require('../middleware/rbac');

router.get('/',          verifyToken, requireManager, ctrl.list);
router.get('/roles',     verifyToken, ctrl.getRoles);
router.get('/areas',     verifyToken, ctrl.getAreas);
router.get('/me',        verifyToken, ctrl.getProfile);
router.get('/:id',       verifyToken, requireManager, ctrl.getProfile);

module.exports = router;
