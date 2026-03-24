const pool = require('../config/database'); // Import database connection pool
const bcrypt = require('bcryptjs'); // Library for hashing and comparing passwords securely
const jwt = require('jsonwebtoken'); // Library for creating session tokens

// ==========================================
// 1. USER & ADMIN LOGIN
// ==========================================
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate that the user provided both fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const connection = await pool.getConnection();
    
    // STEP 1: Check admin table first
    // Note: Admins and Students are kept in separate tables for security/structural reasons
    const [admins] = await connection.query('SELECT * FROM admin WHERE username = ?', [username]);
    
    if (admins.length > 0) {
      const admin = admins[0];
      
      // Compare the plain text password from the request to the hashed password in the DB
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (isPasswordValid) {
        // Generate a JSON Web Token holding the admin's identity and role
        const token = jwt.sign(
          { id: admin.id, username: admin.username, role: 'admin' },
          process.env.JWT_SECRET || 'your_secret_key_change_this',
          { expiresIn: process.env.JWT_EXPIRE || '7d' } // Token expires in 7 days
        );
        
        connection.release();
        
        // Return the token to the frontend so it can be saved in local storage
        return res.json({
          message: 'Login successful',
          token,
          user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin' },
        });
      }
    }

    // STEP 2: If the user wasn't found in the admin table, check the students/users table
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    connection.release(); // Free connection after queries are done

    if (users.length > 0) {
      const user = users[0];
      
      // If the user has a registered password
      if (user.password) {
        // Validate password hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (isPasswordValid) {
          // Generate student token
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

    // If we reach here, neither the admin nor student login matched the password
    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// 2. CHANGE PASSWORD (Student Only)
// ==========================================
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Security check: Ensure the request came through the 'auth' middleware and attached a user object
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Explicitly restrict this specific endpoint to students only
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can change password here' });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    // Enforce basic password strength requirement
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const connection = await pool.getConnection();

    try {
      // Fetch the user's current password hash from the database
      const [users] = await connection.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [req.user.id]);

      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = users[0];
      
      // Verify that they actually know their current password before allowing the change
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password || '');

      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Check to prevent them from changing their password to the exact same current password
      const isSamePassword = await bcrypt.compare(new_password, user.password || '');
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }

      // Hash the new password with a salt round of 10
      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      
      // Update the database record with the new hash
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
