const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');

const router = express.Router();

// ==========================================
// BOOK ROUTER
// Manages API endpoints for the library catalog
// ==========================================

// GET /api/books - Public/Protected endpoint to fetch the catalog (Students and Admins can view)
router.get('/', verifyToken, getAllBooks);

// GET /api/books/:id - Fetch a single specific book
router.get('/:id', verifyToken, getBookById);

// POST /api/books - Admin ONLY endpoint to add a new book to the database
router.post('/', verifyToken, isAdmin, addBook);

// PUT /api/books/:id - Admin ONLY endpoint to update an existing book's details or quantity
router.put('/:id', verifyToken, isAdmin, updateBook);

// DELETE /api/books/:id - Admin ONLY endpoint to remove a book completely
router.delete('/:id', verifyToken, isAdmin, deleteBook);

module.exports = router;
