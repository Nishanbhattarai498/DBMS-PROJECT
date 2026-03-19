const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      countQuery += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    const connection = await pool.getConnection();
    
    const [countResult] = await connection.query(countQuery, params);
    const total = countResult[0].total;

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await connection.query(query, params);
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
    const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
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
    const { name, email, phone, address, password, role = 'student' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const username = email;
    const defaultPassword = password || (role === 'admin' ? 'admin123' : 'student123');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const connection = await pool.getConnection();

    if (role === 'admin') {
      // Create admin in admin table
      await connection.query(
        'INSERT INTO admin (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      // Also sync to users table with admin role for unified UI display
      await connection.query(
        'INSERT INTO users (name, email, phone, address, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone || null, address || null, username, hashedPassword, 'admin']
      );
    } else {
      // Create regular student
      await connection.query(
        'INSERT INTO users (name, email, phone, address, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone || null, address || null, username, hashedPassword, 'student']
      );
    }
    
    connection.release();
    res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully` });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email or Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;

    const connection = await pool.getConnection();
    
    const [user] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'User not found' });
    }

    await connection.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [name || user[0].name, email || user[0].email, phone || user[0].phone, address || user[0].address, id]
    );
    connection.release();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
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
    await connection.query('DELETE FROM users WHERE id = ?', [id]);
    connection.release();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers, getUserById, addUser, updateUser, deleteUser };
