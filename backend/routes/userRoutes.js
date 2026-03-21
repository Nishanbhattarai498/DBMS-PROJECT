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

const isSelfOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.id == req.params.id)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied' });
  }
};

router.get('/', verifyToken, isAdmin, getAllUsers);
router.get('/:id', verifyToken, isSelfOrAdmin, getUserById);
router.post('/', verifyToken, isAdmin, addUser);
router.put('/:id', verifyToken, isSelfOrAdmin, updateUser);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;
