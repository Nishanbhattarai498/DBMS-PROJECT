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

module.exports = { login };
