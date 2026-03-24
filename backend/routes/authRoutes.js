const express = require('express');
const { login, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// AUTH ROUTER
// Maps incoming HTTP requests to their controller logic
// ==========================================

// POST /api/auth/login - Public endpoint for logging in (both Admin and Student)
router.post('/login', login);

// POST /api/auth/change-password - Protected endpoint (requires JWT) for students to update password
router.post('/change-password', verifyToken, changePassword);

module.exports = router;
