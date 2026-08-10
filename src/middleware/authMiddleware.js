/**
 * authMiddleware.js
 * JWT verification middleware.
 * Attaches the decoded payload to req.user for downstream handlers.
 */

const jwt = require('jsonwebtoken');

/**
 * Express middleware that validates the Authorization: Bearer <token> header.
 * Rejects requests with missing, malformed, or expired tokens.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded; // { sub, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { verifyToken };
