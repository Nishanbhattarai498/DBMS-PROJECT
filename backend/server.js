// Import standard modules
const express = require('express');
const cors = require('cors'); // Prevents Cross-Origin Resource Sharing blocks
const bodyParser = require('body-parser'); // Auto-deserializes JSON payloads in HTTP posts
require('dotenv').config(); // Automatically ingest variables from `.env` into `process.env`

// Import specific Router structures
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const issueRoutes = require('./routes/issueRoutes');
// Import startup database verifier script
const { bootstrapSchema } = require('./utils/schemaBootstrap');

// Initialize the core Express app object
const app = express();

// =======================
// GLOBAL MIDDLEWARE PIPELINE
// =======================
app.use(cors()); // Allow requests from any frontend port (like localhost:3000)
app.use(bodyParser.json()); // Tells express to automatically parse incoming req.body into JSON objects
app.use(bodyParser.urlencoded({ extended: true }));

// =======================
// GLOBAL CONTROLLER PATHS
// =======================
app.use('/api/auth', authRoutes);     // Ex: login
app.use('/api/books', bookRoutes);    // Ex: search library
app.use('/api/users', userRoutes);    // Ex: manage students
app.use('/api/issues', issueRoutes);  // Ex: checkout/return

// =======================
// HEALTH CHECK ENDPOINT
// Good practice to provide a simple /api/health to confirm if the server process is alive at all
// =======================
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// =======================
// GLOBAL ERROR HANDLER
// =======================
// In Express, any middleware/function containing 4 parameters is uniquely treated as a global catch-error net
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// Grab designated port or fallback to standard 5000
const PORT = process.env.PORT || 5000;

// =======================
// SYSTEM BOOTSTRAP PROTOCOL
// =======================
const startServer = async () => {
  try {
    // Stage 1: Connect to database and fire raw schema creation script to ensure tables exist
    await bootstrapSchema();
    
    // Stage 2: Actually start accepting traffic HTTP requests on the specified port
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    // If the database refuses connection, crash intentionally. The app cannot function without a DB.
    console.error('Unable to start server due to database initialization error.');
    process.exit(1); 
  }
};

startServer();
