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

router.get('/', verifyToken, getAllBooks);
router.get('/:id', verifyToken, getBookById);
router.post('/', verifyToken, isAdmin, addBook);
router.put('/:id', verifyToken, isAdmin, updateBook);
router.delete('/:id', verifyToken, isAdmin, deleteBook);

module.exports = router;
