const mysql = require('mysql2/promise'); // Using /promise allows us to use modern await/async pattern for SQL
require('dotenv').config(); // Load environment variables from .env file securely

// ==========================================
// DATABASE CONNECTION POOL
// ==========================================
// A "Pool" is better than a standard connection because it keeps multiple connections 
// alive simultaneously. It prevents the app from crashing if 100 users hit it at the same time.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password', // Ensure '.env' handles this normally!
  database: process.env.DB_NAME || 'library_management',
  
  // Wait for connections if they are all currently being used
  waitForConnections: true,
  // Max number of active queries happening at the exact same physical millisecond
  connectionLimit: 10,
  // Max wait line size
  queueLimit: 0,
});

module.exports = pool;
