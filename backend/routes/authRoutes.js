const express = require('express');
const { login, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;
