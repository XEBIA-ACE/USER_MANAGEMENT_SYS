```javascript
const { generateToken, verifyToken } = require('../src/utils/tokenService');

describe('Token Service', () => {
  it('should generate a token of correct length', () => {
    const token = generateToken();
    expect(token).toHaveLength(64); // 32 bytes * 2 hex digits
  });

  it('should verify a correct token', () => {
    const token = generateToken();
    const isValid = verifyToken(token, token);
    expect(isValid).toBe(true);
  });

  it('should not verify an incorrect token', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    const isValid = verifyToken(token1, token2);
    expect(isValid).toBe(false);
  });
});
```