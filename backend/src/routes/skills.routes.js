const router = require('express').Router();
const ctrl   = require('../controllers/skills.controller');
const { verifyToken }   = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/rbac');

router.get('/',                     verifyToken, ctrl.list);
router.post('/',                    verifyToken, requireAdmin, ctrl.create);
router.put('/:id',                  verifyToken, requireAdmin, ctrl.update);
router.delete('/:id',               verifyToken, requireAdmin, ctrl.remove);
router.get('/matrix',               verifyToken, requireManager, ctrl.getMatrix);
router.get('/matrix/employee/:userId', verifyToken, ctrl.getEmployeeSkills);
router.get('/matrix/me',            verifyToken, ctrl.getEmployeeSkills);
router.post('/manual',              verifyToken, requireAdmin, ctrl.setManualSkill);
router.get('/gaps',                 verifyToken, requireManager, ctrl.getGaps);
router.post('/required',            verifyToken, requireAdmin, ctrl.setRequiredSkills);

module.exports = router;
