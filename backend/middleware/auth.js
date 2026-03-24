const jwt = require('jsonwebtoken');

// ==========================================
// 1. VERIFY TOKEN MIDDLEWARE (Authentication Base Layer)
// ==========================================
const verifyToken = (req, res, next) => {
  // Extract token from standard HTTP Header format: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Invalid token format' });

  // Use jwt.verify to decode the token. If corrupted, modified, or expired, it throws an error.
  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_change_this', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    
    // ATTACHMENT: If valid, grab the identity attached to the token (id, username, role) 
    // and physically tape it to the `req` object so subsequent controllers can use it.
    req.user = decoded;
    
    // Jump to the actual Route function that requested the check
    next();
  });
};

// ==========================================
// 2. IS ADMIN MIDDLEWARE (Authorization Guard)
// MUST be called directly AFTER verifyToken in the router
// ==========================================
const isAdmin = (req, res, next) => {
  // If the `verifyToken` step didn't attach a valid user, kill request 
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // If the user's role payload generated at Login says "student", kick them out.
  // 403 Forbidden is used here specifically to mean "I know who you are, but you aren't allowed to do this."
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Require Admin Role' });
  }

  // Admin verified. Jump to the corresponding controller function.
  next();
};

module.exports = { verifyToken, isAdmin };
