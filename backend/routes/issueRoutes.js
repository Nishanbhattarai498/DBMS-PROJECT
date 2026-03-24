const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getAllIssuedBooks,
  issueBook,
  returnBook,
  getUserIssuedBooks,
  getDashboardStats,
} = require('../controllers/issueController');

const router = express.Router();

// ==========================================
// ISSUES ROUTER
// Manages the checkout, return, and analytics of book lending
// ==========================================

// GET /api/issues/ - Admin ONLY: Returns history of all books ever issued to anyone
router.get('/', verifyToken, isAdmin, getAllIssuedBooks);

// POST /api/issues/issue - Admin ONLY: Assign a specific physical book copy to a student
router.post('/issue', verifyToken, isAdmin, issueBook);

// POST /api/issues/return - Admin ONLY: Mark an active issue as returned & process late fines
router.post('/return', verifyToken, isAdmin, returnBook);

// GET /api/issues/user/:user_id - Public/Protected: Students can use this to see only their own borrowing history
router.get('/user/:user_id', verifyToken, getUserIssuedBooks); 

// GET /api/issues/stats/dashboard - Admin ONLY: Generates the four big aggregate numbers for the homepage
router.get('/stats/dashboard', verifyToken, isAdmin, getDashboardStats);

module.exports = router;
