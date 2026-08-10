/**
 * authController.js
 *
 * HTTP layer for authentication endpoints.
 * Delegates all business logic to userService and maps service errors to
 * appropriate HTTP responses so the UI receives actionable error messages.
 */

'use strict';

const {
  registerUser,
  DuplicateEmailError,
  ValidationError,
} = require('../services/userService');

/**
 * POST /auth/register
 *
 * Request body: { name, email, password }
 *
 * Success  → 201 Created  + { message, user }
 * Duplicate email → 409 Conflict + { error }   (shown on UI as "Email already in use")
 * Validation fail → 400 Bad Request + { error }
 * Server error    → 500 Internal Server Error + { error }
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const user = await registerUser({ name, email, password });

    return res.status(201).json({
      message: 'Registration successful. Please check your email for a confirmation link.',
      user,
    });
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      // 409 Conflict — the UI should display this message near the email field
      return res.status(409).json({
        error: err.message, // "The email address "..." is already registered."
      });
    }

    if (err instanceof ValidationError) {
      // 400 Bad Request — field-level validation failure
      return res.status(400).json({
        error: err.message,
      });
    }

    // Unexpected server error — do not leak internals
    console.error('[authController.register] Unexpected error:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again later.',
    });
  }
}

module.exports = { register };
