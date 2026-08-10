```javascript
const crypto = require('crypto');

// Generate a secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify token (could include expiration or other checks)
function verifyToken(token, storedToken) {
  // In a real application, you could also check for token expiration or match against a database
  return token === storedToken;
}

module.exports = {
  generateToken,
  verifyToken,
};
```