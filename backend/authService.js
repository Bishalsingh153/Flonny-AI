const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// A secure local secret key for JWT (can be configured in .env, default provided)
const JWT_SECRET = process.env.JWT_SECRET || 'floony_amethyst_slate_secret_2026';

// PBKDF2 configuration
const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Hash a password using Node's native crypto (PBKDF2)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a salt and hash
 */
function verifyPassword(password, storedValue) {
  const [salt, originalHash] = storedValue.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return hash === originalHash;
}

/**
 * Generate a JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' } // Long-lived session for ease of use
  );
}

/**
 * Middleware to authenticate API requests via JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken
};
