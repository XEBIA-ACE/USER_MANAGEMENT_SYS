/**
 * authService.test.js
 * Unit tests for the backend authentication service.
 *
 * Verifies:
 *  - Successful login returns a JWT and sanitised user object
 *  - Invalid password throws AuthenticationError
 *  - Unknown email throws AuthenticationError (no user enumeration)
 *  - Missing credentials throw AuthenticationError
 *  - Returned user object never contains the password hash
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Set env vars before requiring modules that read them at load time
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.JWT_EXPIRES_IN = '1h';

const { authenticateUser, AuthenticationError } = require('../../src/auth/authService');
const userRepository = require('../../src/users/userRepository');

// ── Test fixtures ────────────────────────────────────────────────────────────

const PLAIN_PASSWORD = 'SecurePass123!';
let hashedPassword;

beforeAll(async () => {
  hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, 12);

  // Seed the in-memory repository with a test user
  userRepository._seedForTests([
    {
      id: 'user-001',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      role: 'user',
    },
  ]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('authenticateUser', () => {
  test('returns a valid JWT and sanitised user on correct credentials', async () => {
    const result = await authenticateUser('alice@example.com', PLAIN_PASSWORD);

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');

    // Token must be verifiable
    const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe('user-001');
    expect(decoded.email).toBe('alice@example.com');
    expect(decoded.role).toBe('user');
  });

  test('returned user object does NOT contain passwordHash', async () => {
    const { user } = await authenticateUser('alice@example.com', PLAIN_PASSWORD);
    expect(user).not.toHaveProperty('passwordHash');
    expect(user.id).toBe('user-001');
    expect(user.email).toBe('alice@example.com');
  });

  test('throws AuthenticationError for wrong password', async () => {
    await expect(
      authenticateUser('alice@example.com', 'WrongPassword!')
    ).rejects.toThrow(AuthenticationError);

    await expect(
      authenticateUser('alice@example.com', 'WrongPassword!')
    ).rejects.toThrow('Invalid email or password');
  });

  test('throws AuthenticationError for unknown email', async () => {
    await expect(
      authenticateUser('unknown@example.com', PLAIN_PASSWORD)
    ).rejects.toThrow(AuthenticationError);
  });

  test('throws AuthenticationError when email is missing', async () => {
    await expect(
      authenticateUser('', PLAIN_PASSWORD)
    ).rejects.toThrow(AuthenticationError);
  });

  test('throws AuthenticationError when password is missing', async () => {
    await expect(
      authenticateUser('alice@example.com', '')
    ).rejects.toThrow(AuthenticationError);
  });

  test('is case-insensitive for email lookup', async () => {
    const result = await authenticateUser('ALICE@EXAMPLE.COM', PLAIN_PASSWORD);
    expect(result.user.email).toBe('alice@example.com');
  });
});
