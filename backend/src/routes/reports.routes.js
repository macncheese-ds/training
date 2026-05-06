const router = require('express').Router();
const ctrl   = require('../controllers/reports.controller');
const { verifyToken }   = require('../middleware/auth');
const { requireManager } = require('../middleware/rbac');

router.get('/dashboard',        verifyToken, requireManager, ctrl.dashboard);
router.get('/export/trainings', verifyToken, requireManager, ctrl.exportTrainings);
router.get('/export/skills',    verifyToken, requireManager, ctrl.exportSkills);

module.exports = router;
