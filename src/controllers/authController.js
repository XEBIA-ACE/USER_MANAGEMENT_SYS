/**
 * authController
 *
 * Handles user login with credential validation and activity logging.
 * Activity logging is performed for EVERY attempt (success and failure)
 * to satisfy the audit requirement in spec.md.
 */

const bcrypt = require('bcrypt');
const { recordLoginAttempt } = require('../services/activityLogService');

// ---------------------------------------------------------------------------
// Helper – extract client metadata from an Express request object
// ---------------------------------------------------------------------------
function extractClientMeta(req) {
  // Support proxies that set X-Forwarded-For
  const ipAddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;

  const userAgent = req.headers['user-agent'] || null;

  return { ipAddress, userAgent };
}

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
/**
 * Login handler.
 *
 * Expects `req.body` to contain:
 *   - identifier {string} – username or email
 *   - password   {string} – plain-text password
 *
 * `req.userRepository` must be injected by the calling router / middleware
 * (or replace with your actual User model import).
 */
async function login(req, res) {
  const { identifier, password } = req.body || {};
  const { ipAddress, userAgent } = extractClientMeta(req);

  // --- Basic input validation ---
  if (!identifier || !password) {
    await recordLoginAttempt({
      identifier: identifier || '<missing>',
      status: 'FAILURE',
      failureReason: 'Missing identifier or password in request body.',
      ipAddress,
      userAgent,
    });

    return res.status(400).json({ message: 'identifier and password are required.' });
  }

  try {
    // --- Fetch user from the data store ---
    // Replace `req.userRepository` with your actual User model / service.
    const user = await req.userRepository.findByIdentifier(identifier);

    if (!user) {
      await recordLoginAttempt({
        identifier,
        status: 'FAILURE',
        failureReason: 'User not found.',
        ipAddress,
        userAgent,
      });

      // Return a generic message to avoid user-enumeration attacks
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // --- Verify password (bcrypt) ---
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      await recordLoginAttempt({
        identifier,
        status: 'FAILURE',
        failureReason: 'Incorrect password.',
        ipAddress,
        userAgent,
      });

      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // --- Successful login ---
    await recordLoginAttempt({
      identifier,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    // TODO: generate and return a JWT / session token here
    return res.status(200).json({ message: 'Login successful.' });
  } catch (err) {
    // Log the failed attempt even when an unexpected error occurs
    await recordLoginAttempt({
      identifier,
      status: 'FAILURE',
      failureReason: `Internal error: ${err.message}`,
      ipAddress,
      userAgent,
    });

    console.error('[authController.login] Unexpected error:', err);
    return res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
  }
}

module.exports = { login };
