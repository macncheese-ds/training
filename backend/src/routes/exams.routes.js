const router = require('express').Router();
const ctrl   = require('../controllers/exams.controller');
const { verifyToken }  = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.get('/',            verifyToken, requireAdmin, ctrl.list);
router.get('/my/attempts', verifyToken, ctrl.getMyAttempts);
router.get('/:id',         verifyToken, requireAdmin, ctrl.getById);
router.post('/',           verifyToken, requireAdmin, ctrl.create);
router.put('/:id',         verifyToken, requireAdmin, ctrl.update);
router.delete('/:id',      verifyToken, requireAdmin, ctrl.remove);

// Attempt flow
router.post('/:id/start',    verifyToken, ctrl.startAttempt);
router.post('/:id/submit',   verifyToken, ctrl.submitAttempt);
router.get('/:id/attempts',  verifyToken, requireAdmin, ctrl.getAttempts);

module.exports = router;
