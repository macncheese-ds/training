const router = require('express').Router();
const ctrl   = require('../controllers/assignments.controller');
const { verifyToken }   = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/rbac');

router.get('/my',          verifyToken, ctrl.listMy);
router.get('/',            verifyToken, requireManager, ctrl.list);
router.post('/',           verifyToken, requireAdmin, ctrl.assign);
router.post('/bulk',       verifyToken, requireAdmin, ctrl.bulkAssign);
router.put('/:id/status',  verifyToken, ctrl.updateStatus);
router.put('/:id',         verifyToken, requireAdmin, ctrl.update);
router.delete('/:id',      verifyToken, requireAdmin, ctrl.remove);

module.exports = router;
