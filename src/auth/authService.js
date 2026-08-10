/**
 * authService.js
 * Core backend authentication logic.
 *
 * Responsibilities:
 *  - Retrieve user record by email
 *  - Verify the supplied password against the stored bcrypt hash
 *  - Issue a signed JWT on success
 *  - Log every login attempt (success and failure) for auditing
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../users/userRepository');
const activityLogger = require('../logging/activityLogger');

// Custom error class so controllers can distinguish auth failures from 500s
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authenticates a user by email and plaintext password.
 *
 * @param {string} email      - The user's email address
 * @param {string} password   - The plaintext password supplied by the user
 * @returns {{ token: string, user: object }} JWT and sanitised user object
 * @throws {AuthenticationError} When credentials are invalid
 */
async function authenticateUser(email, password) {
  if (!email || !password) {
    throw new AuthenticationError('Email and password are required');
  }

  // 1. Look up the user record
  const user = await userRepository.findByEmail(email.toLowerCase().trim());

  // Use a constant-time comparison path even when user is not found
  // to prevent user-enumeration via timing attacks.
  const dummyHash = '$2b$12$invalidhashusedfortimingprotection000000000000000000000';
  const hashToCompare = user ? user.passwordHash : dummyHash;

  // 2. Verify password against stored hash (bcrypt is constant-time)
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    // Log failed attempt before throwing
    await activityLogger.logLoginAttempt({
      email,
      success: false,
      reason: !user ? 'user_not_found' : 'invalid_password',
      timestamp: new Date().toISOString(),
    });
    throw new AuthenticationError('Invalid email or password');
  }

  // 3. Build JWT payload — never include sensitive fields
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    algorithm: 'HS256',
  });

  // 4. Log successful attempt
  await activityLogger.logLoginAttempt({
    userId: user.id,
    email: user.email,
    success: true,
    timestamp: new Date().toISOString(),
  });

  // 5. Return token and a sanitised user object (no password hash)
  const { passwordHash, ...safeUser } = user;
  return { token, user: safeUser };
}

module.exports = { authenticateUser, AuthenticationError };
