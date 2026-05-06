const router = require('express').Router();
const ctrl   = require('../controllers/categories.controller');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.get('/',       verifyToken, ctrl.list);
router.post('/',      verifyToken, requireAdmin, ctrl.create);
router.put('/:id',    verifyToken, requireAdmin, ctrl.update);
router.delete('/:id', verifyToken, requireAdmin, ctrl.remove);

module.exports = router;
