```markdown
# Secure Token Service

This module provides methods for generating and verifying cryptographically secure tokens. These are used primarily for password recovery processes.

### Methods

- `generateToken()`: Generates a cryptographically secure token using Node.js `crypto` module. The token is a 64 character hexadecimal string.
- `verifyToken(token, storedToken)`: Basic token validation method that can be extended to include additional checks such as expiration.

### Usage

```javascript
const { generateToken, verifyToken } = require('./src/utils/tokenService');

// Generate a token
const token = generateToken();

// Store the token securely (e.g., in a database linked to the user record)

// Verify the token when received back from the user
const isValid = verifyToken(receivedToken, storedToken);
```

### Tests

Tests are included to verify that tokens are of the correct length, and that verification functions correctly for both matching and non-matching tokens.

```sh
# Run tests
npm test
```

### Security Considerations

- Ensure tokens are stored securely and transmitted over encrypted channels.
- Implement additional checks like token expiration for enhanced security.
```