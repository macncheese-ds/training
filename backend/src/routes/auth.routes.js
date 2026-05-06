const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.get('/me', verifyToken, ctrl.me);

module.exports = router;
