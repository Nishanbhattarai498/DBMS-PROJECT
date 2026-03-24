const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getAllStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/userController');

const router = express.Router();

// ==========================================
// USER ROUTER
// Manages API endpoints for student profile management
// ==========================================

// GET /api/users - Admin ONLY: Search and list all active students
router.get('/', verifyToken, isAdmin, getAllStudents);

// POST /api/users - Admin ONLY: Register a brand new student 
router.post('/', verifyToken, isAdmin, addStudent);

// PUT /api/users/:id - Admin ONLY: Update a student's contact or academic details
router.put('/:id', verifyToken, isAdmin, updateStudent);

// DELETE /api/users/:id - Admin ONLY: Archive/kick a student from the system completely
router.delete('/:id', verifyToken, isAdmin, deleteStudent);

module.exports = router;
