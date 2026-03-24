const pool = require('../config/database'); // Import DB connection
const bcrypt = require('bcryptjs'); // For potentially hashing passwords during user creation

// ==========================================
// 1. GET ALL STUDENTS (With pagination and search)
// ==========================================
const getAllStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Join the main `users` table with the `student_profiles` detail table
    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.address, u.username, u.role, u.created_at,
             sp.student_id, sp.semester, sp.department, sp.batch_year
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'student'
    `;
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'student'`;
    let params = [];

    // Apply search filters if an admin is looking for a specific student
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR sp.student_id LIKE ?)`;
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR username LIKE ? OR id IN (SELECT user_id FROM student_profiles WHERE student_id LIKE ?))`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    
    // Warning: params array is cloned and modified separately for query vs countQuery 
    // because countQuery doesn't need LIMIT and OFFSET
    const queryParams = [...params, parseInt(limit), offset];

    const connection = await pool.getConnection();
    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    // Fetch the actual student data
    const [users] = await connection.query(query, queryParams);
    connection.release();

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// 2. ADD A NEW STUDENT
// ==========================================
const addStudent = async (req, res) => {
  try {
    const { name, email, phone, address, username, password, student_id, semester, department, batch_year } = req.body;

    // Validate fundamental fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); // Wrap in transaction because we are inserting into two distinct tables

      // Hash the provided password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Step 1: Insert core user credentials into primary 'users' table
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, phone, address, username, password, role) VALUES (?, ?, ?, ?, ?, ?, "student")',
        [name, email, phone || null, address || null, username, hashedPassword]
      );

      const userId = userResult.insertId;

      // Step 2: Insert student-specific academic details into 'student_profiles' linking back via 'userId'
      if (student_id || semester || department || batch_year) {
         await connection.query(
          'INSERT INTO student_profiles (user_id, student_id, semester, department, batch_year) VALUES (?, ?, ?, ?, ?)',
          [userId, student_id || null, semester || null, department || null, batch_year || null]
         );
      }

      await connection.commit(); // Save changes
      res.status(201).json({ message: 'Student added successfully', userId });
    } catch (err) {
      await connection.rollback(); // Undo if failure
      
      // Handle known MySQL constraint violation errors nicely
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('email')) return res.status(400).json({ message: 'Email already exists' });
        if (err.message.includes('username')) return res.status(400).json({ message: 'Username already exists' });
        if (err.message.includes('student_id')) return res.status(400).json({ message: 'Student ID already exists' });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// 3. EDIT EXISTING STUDENT
// ==========================================
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, student_id, semester, department, batch_year } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); // Wrap in a transaction

      // Ensure the user being updated actually exists
      const [existingUser] = await connection.query('SELECT * FROM users WHERE id = ? AND role = "student"', [id]);
      if (existingUser.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Student not found' });
      }

      // Update core tracking variables in 'users' table
      await connection.query(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
        [name, email, phone, address, id]
      );

      // Check if this student already has a profile in 'student_profiles'
      const [existingProfile] = await connection.query('SELECT * FROM student_profiles WHERE user_id = ?', [id]);
      
      if (existingProfile.length > 0) {
        // Update existing profile details
        await connection.query(
          'UPDATE student_profiles SET student_id = COALESCE(?, student_id), semester = COALESCE(?, semester), department = COALESCE(?, department), batch_year = COALESCE(?, batch_year) WHERE user_id = ?',
          [student_id, semester, department, batch_year, id]
        );
      } else if (student_id || semester || department || batch_year) {
        // Or create an entry if one for some reason didn't exist
        await connection.query(
          'INSERT INTO student_profiles (user_id, student_id, semester, department, batch_year) VALUES (?, ?, ?, ?, ?)',
          [id, student_id, semester, department, batch_year]
        );
      }

      await connection.commit();
      res.json({ message: 'Student updated successfully' });
    } catch (err) {
      await connection.rollback();
      if (err.code === 'ER_DUP_ENTRY') {
         if (err.message.includes('email')) return res.status(400).json({ message: 'Email belongs to another user' });
         if (err.message.includes('student_id')) return res.status(400).json({ message: 'Student ID belongs to another user' });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// 4. DELETE A STUDENT
// ==========================================
const deleteStudent = async (req, res) => {
   try {
     const { id } = req.params;
     const connection = await pool.getConnection();
     
     // Cannot delete a student if they still have unreturned books
     const [activeIssues] = await connection.query(
       'SELECT count(*) as count FROM issued_books WHERE user_id = ? AND status = "issued"',
       [id]
     );

     if (activeIssues[0].count > 0) {
        connection.release();
        return res.status(400).json({ message: 'Cannot delete student. They have unreturned books.' });
     }

     // Due to ON DELETE CASCADE constraints configured in database.sql,
     // deleting from the 'users' table will automatically wipe their 'student_profiles'
     // and their returned 'issued_books' history.
     await connection.query('DELETE FROM users WHERE id = ? AND role = "student"', [id]);
     
     connection.release();
     res.json({ message: 'Student deleted successfully' });
   } catch (error) {
     console.error(error);
     res.status(500).json({ message: 'Server error' });
   }
};

module.exports = { getAllStudents, addStudent, updateStudent, deleteStudent };
