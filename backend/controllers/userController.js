const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { search, department, batch_year, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE 1=1
    `;
    
    let params = [];

    if (search) {
      baseQuery += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR sp.student_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (department) {
      baseQuery += ' AND sp.department LIKE ?';
      params.push(`%${department}%`);
    }

    if (batch_year) {
      baseQuery += ' AND sp.batch_year = ?';
      params.push(batch_year);
    }

    let query = `SELECT u.*, sp.student_id, sp.semester, sp.department, sp.batch_year` + baseQuery + ` LIMIT ? OFFSET ?`;
    let countQuery = `SELECT COUNT(*) as total` + baseQuery;

    const connection = await pool.getConnection();

    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    let queryParams = [...params, parseInt(limit), offset];
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


// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [user] = await connection.query(`
      SELECT u.*, sp.student_id, sp.semester, sp.department, sp.batch_year
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [id]);
    connection.release();

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new user
const addUser = async (req, res) => {
  try {
    const { name, email, phone, address, password, role = 'student', student_id, semester, department, batch_year } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const username = email;
    const defaultPassword = password || (role === 'admin' ? 'admin123' : 'student123');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (role === 'admin') {
        await connection.query(
          'INSERT INTO admin (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword]
        );
        await connection.query(
          'INSERT INTO users (name, email, phone, address, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, email, phone || null, address || null, username, hashedPassword, 'admin']
        );
      } else {
        const [userResult] = await connection.query(
          'INSERT INTO users (name, email, phone, address, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, email, phone || null, address || null, username, hashedPassword, 'student']
        );
        
        const newUserId = userResult.insertId;
        
        await connection.query(
          'INSERT INTO student_profiles (user_id, student_id, semester, department, batch_year) VALUES (?, ?, ?, ?, ?)',
          [newUserId, student_id || null, semester || null, department || null, batch_year || null]
        );
      }

      await connection.commit();
      res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email, Username, or Student ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, email, phone, address, student_id, semester, department, batch_year } = req.body;

    // Restrict what students can update: only non-sensitive profile fields
    if (req.user && req.user.role === 'student') {
      // Ignore attempts to change fundamental identity fields
      name = undefined;
      email = undefined;
      student_id = undefined;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
      if (user.length === 0) {
        connection.release();
        return res.status(404).json({ message: 'User not found' });
      }

      await connection.query(
        'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
        [
          name !== undefined ? name : user[0].name, 
          email !== undefined ? email : user[0].email, 
          phone !== undefined ? phone : user[0].phone, 
          address !== undefined ? address : user[0].address, 
          id
        ]
      );

      if (user[0].role === 'student') {
        const [profile] = await connection.query('SELECT * FROM student_profiles WHERE user_id = ?', [id]);
        
        if (profile.length > 0) {
          await connection.query(
            'UPDATE student_profiles SET student_id = ?, semester = ?, department = ?, batch_year = ? WHERE user_id = ?',
            [
              student_id !== undefined ? student_id : profile[0].student_id,
              semester !== undefined ? semester : profile[0].semester,
              department !== undefined ? department : profile[0].department,
              batch_year !== undefined ? batch_year : profile[0].batch_year,
              id
            ]
          );
        } else {
          await connection.query(
            'INSERT INTO student_profiles (user_id, student_id, semester, department, batch_year) VALUES (?, ?, ?, ?, ?)',
            [id, student_id || null, semester || null, department || null, batch_year || null]
          );
        }
      }

      await connection.commit();
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email or Student ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};


// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
      if (user.length === 0) {
        connection.release();
        return res.status(404).json({ message: 'User not found' });
      }

      const [issued] = await connection.query(
        'SELECT COUNT(*) as count FROM issued_books WHERE user_id = ? AND status = "issued"',
        [id]
      );

      if (issued[0].count > 0) {
        connection.release();
        return res.status(400).json({ message: 'Cannot delete user with issued books' });
      }

      await connection.query('DELETE FROM issued_books WHERE user_id = ?', [id]);
      await connection.query('DELETE FROM student_profiles WHERE user_id = ?', [id]);
      await connection.query('DELETE FROM users WHERE id = ?', [id]);
      
      await connection.commit();
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers, getUserById, addUser, updateUser, deleteUser };


