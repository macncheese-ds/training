const router = require('express').Router();
const ctrl   = require('../controllers/trainings.controller');
const { verifyToken }  = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { upload }       = require('../middleware/upload');

router.get('/',     verifyToken, ctrl.list);
router.get('/:id',  verifyToken, ctrl.getById);
router.post('/',    verifyToken, requireAdmin, upload.single('material'), ctrl.create);
router.put('/:id',  verifyToken, requireAdmin, upload.single('material'), ctrl.update);
router.delete('/:id', verifyToken, requireAdmin, ctrl.remove);

// Exam / Skill linking
router.post('/:id/exams',               verifyToken, requireAdmin, ctrl.linkExam);
router.delete('/:id/exams/:examId',      verifyToken, requireAdmin, ctrl.unlinkExam);
router.post('/:id/skills',              verifyToken, requireAdmin, ctrl.linkSkill);
router.delete('/:id/skills/:skillId',   verifyToken, requireAdmin, ctrl.unlinkSkill);

module.exports = router;
