const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ==========================================
// AUTOMATED DATABASE BOOTSTRAPPER
// ==========================================
// This script runs automatically before the Node server starts listening for traffic.
// It verifies the database exists and automatically creates the tables based on 'database.sql'.

const bootstrapSchema = async () => {
  let connection;
  try {
    // Stage 1: Connect to MySQL WITHOUT a specific database first!
    // This allows us to create the "library_management" database if the user hasn't made it manually yet.
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true, // Crucial: Allows us to execute dozens of SQL commands in a single payload
    });

    // Extract desired DB name
    const dbName = process.env.DB_NAME || 'library_management';

    // Verify system admin password is changed from defaults 
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ WARNING: ADMIN_USERNAME or ADMIN_PASSWORD not found in environment variables. Default admin may not be created.');
    }

    // Attempt to construct the Database container securely
    console.log(`Checking database '${dbName}' status...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    
    // Switch the active connection's scope to that database
    await connection.query(`USE \`${dbName}\`;`);

    // Load the massive SQL script containing all TABLE mapping from the root backend/ folder
    const schemaPath = path.join(__dirname, '../database.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute the raw script building all tables natively into MySQL
    console.log('Running schema update...');
    await connection.query(schemaSQL);

    // ==========================================
    // AUTO-GENERATE INITIAL ADMINISTRATOR
    // ==========================================
    // Once tables are confirmed to exist, inject the default admin so someone can actually log in on first-launch.
    const bcrypt = require('bcryptjs');
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@library.com';

    // Verify if an admin already exists to prevent duplicate insertion
    const [existingAdmins] = await connection.query('SELECT username FROM admin WHERE username = ?', [adminUser]);

    if (existingAdmins.length === 0) {
      console.log(`Creating default admin user: '${adminUser}'`);
      
      // Hash password
      const hashedPass = await bcrypt.hash(adminPass, 10);
      
      // Insert
      await connection.query(
        'INSERT INTO admin (username, email, password) VALUES (?, ?, ?)',
        [adminUser, adminEmail, hashedPass]
      );
      console.log('✅ Default admin installed successfully');
    } else {
      console.log('ℹ️ Admin user already exists, skipping creation.');
    }

    console.log('✅ Database bootstrap completed successfully!');
  } catch (error) {
    console.error('❌ Database bootstrap totally failed:', error);
    throw error; // Bubble error back up to server.js so it can gracefully crash
  } finally {
    if (connection) {
      // Must sever raw connection to clear memory
      await connection.end();
    }
  }
};

module.exports = { bootstrapSchema };
