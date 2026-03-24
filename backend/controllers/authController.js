const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const connection = await pool.getConnection();
    
    // Check admin table first
    const [admins] = await connection.query('SELECT * FROM admin WHERE username = ?', [username]);
    
    if (admins.length > 0) {
      const admin = admins[0];
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (isPasswordValid) {
        const token = jwt.sign(
          { id: admin.id, username: admin.username, role: 'admin' },
          process.env.JWT_SECRET || 'your_secret_key_change_this',
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        
        connection.release();
        return res.json({
          message: 'Login successful',
          token,
          user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin' },
        });
      }
    }

    // If not admin, check users table
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    connection.release();

    if (users.length > 0) {
      const user = users[0];
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (isPasswordValid) {
          const token = jwt.sign(
            { id: user.id, username: user.username, role: 'student' },
            process.env.JWT_SECRET || 'your_secret_key_change_this',
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
          );
          
          return res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: 'student' },
          });
        }
      }
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can change password here' });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [req.user.id]);

      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = users[0];
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password || '');

      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      const isSamePassword = await bcrypt.compare(new_password, user.password || '');
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }

      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);

      return res.json({ message: 'Password changed successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, changePassword };
