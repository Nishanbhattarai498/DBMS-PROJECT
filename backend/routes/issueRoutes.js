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

router.get('/', verifyToken, isAdmin, getAllIssuedBooks);
router.post('/issue', verifyToken, isAdmin, issueBook);
router.post('/return', verifyToken, isAdmin, returnBook);
router.get('/user/:user_id', verifyToken, getUserIssuedBooks); // Students can see their own
router.get('/stats/dashboard', verifyToken, isAdmin, getDashboardStats);

module.exports = router;
