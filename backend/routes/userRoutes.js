const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', verifyToken, isAdmin, getAllUsers);
router.get('/:id', verifyToken, isAdmin, getUserById); // Or self
router.post('/', verifyToken, isAdmin, addUser);
router.put('/:id', verifyToken, isAdmin, updateUser);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;
