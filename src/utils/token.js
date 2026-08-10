```javascript
const jwt = require('jsonwebtoken');

// Generate a secure token for password recovery
const generateRecoveryToken = (user) => {
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    return token;
};

module.exports = { generateRecoveryToken };
```