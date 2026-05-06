const router = require('express').Router();
const ctrl   = require('../controllers/notifications.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/',           verifyToken, ctrl.list);
router.put('/:id/read',   verifyToken, ctrl.markRead);
router.put('/read-all',   verifyToken, ctrl.markAllRead);

module.exports = router;
