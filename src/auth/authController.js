/**
 * authController.js
 * Handles HTTP request/response for authentication endpoints.
 * Integrates with authService for credential validation logic.
 */

const authService = require('./authService');
const { validationResult } = require('express-validator');

/**
 * POST /api/auth/login
 * Authenticates a user with email + password credentials.
 * Returns a signed JWT on success.
 */
async function login(req, res) {
  // Validate incoming request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await authService.authenticateUser(email, password);
    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    // Log the attempt (error path) — detailed logging is in authService
    if (err.name === 'AuthenticationError') {
      return res.status(401).json({ success: false, message: err.message });
    }
    // Unexpected server error — do not leak internals
    console.error('[authController] Unexpected error during login:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/auth/logout
 * Invalidates the current session / token (stateless JWT: client discards token).
 * For stateful sessions, the token would be added to a denylist here.
 */
async function logout(req, res) {
  // TODO: If using a token denylist / Redis store, add token invalidation here.
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
}

module.exports = { login, logout };
