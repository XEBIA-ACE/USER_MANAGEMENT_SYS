/**
 * userService.js
 *
 * Business-logic layer for user management.
 *
 * Responsibilities
 * ─────────────────
 * 1. Check email uniqueness before attempting to persist a new user.
 * 2. Securely store user details (password hashed via bcrypt inside the
 *    User model's pre-save hook).
 * 3. Return structured error objects so the calling layer (controller /
 *    route handler) can forward the right HTTP status and message to the UI.
 */

'use strict';

const User = require('../models/User');

// ─── Custom error types ───────────────────────────────────────────────────────

/**
 * Thrown when a caller tries to register an email that already exists.
 * The controller should map this to HTTP 409 Conflict.
 */
class DuplicateEmailError extends Error {
  constructor(email) {
    super(`The email address "${email}" is already registered.`);
    this.name = 'DuplicateEmailError';
    this.statusCode = 409;
  }
}

/**
 * Thrown when required registration fields are missing or malformed.
 * The controller should map this to HTTP 400 Bad Request.
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise an email address: lowercase + trim.
 * @param {string} email
 * @returns {string}
 */
function normaliseEmail(email) {
  return email.toLowerCase().trim();
}

/**
 * Basic structural validation of required registration fields.
 * Throws ValidationError if any field is missing or empty.
 *
 * @param {{ name: string, email: string, password: string }} fields
 */
function validateRegistrationInput({ name, email, password }) {
  if (!name || !name.trim()) {
    throw new ValidationError('Name is required.');
  }
  if (!email || !email.trim()) {
    throw new ValidationError('Email address is required.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new ValidationError('Please provide a valid email address.');
  }
  if (!password) {
    throw new ValidationError('Password is required.');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Check whether an email address is already registered.
 *
 * @param {string} email - Raw email string from the request.
 * @returns {Promise<boolean>} Resolves to `true` if the email exists.
 */
async function isEmailTaken(email) {
  const normalised = normaliseEmail(email);
  // Use lean() for a lightweight read — we only need existence, not a full doc.
  const existing = await User.findOne({ email: normalised }).lean();
  return existing !== null;
}

/**
 * Register a new user.
 *
 * Steps:
 *  1. Validate input fields.
 *  2. Check email uniqueness (explicit query before insert to give a clear
 *     error message; the DB unique index is a safety net, not the primary guard).
 *  3. Create and persist the user — the model's pre-save hook hashes the password.
 *  4. Return the saved user document (passwordHash is stripped by toJSON).
 *
 * @param {{ name: string, email: string, password: string }} registrationData
 * @returns {Promise<import('../models/User')>} The newly created user document.
 * @throws {ValidationError}    If required fields are missing / invalid.
 * @throws {DuplicateEmailError} If the email is already registered.
 */
async function registerUser({ name, email, password }) {
  // 1. Validate input
  validateRegistrationInput({ name, email, password });

  const normalisedEmail = normaliseEmail(email);

  // 2. Email uniqueness check
  const emailTaken = await isEmailTaken(normalisedEmail);
  if (emailTaken) {
    throw new DuplicateEmailError(normalisedEmail);
  }

  // 3. Persist the user
  //    setPassword() assigns the plain-text value to passwordHash so the
  //    pre-save hook can detect the change and hash it before writing to DB.
  const user = new User({ name: name.trim(), email: normalisedEmail });
  user.setPassword(password);

  try {
    await user.save();
  } catch (err) {
    // Handle race-condition duplicate (two concurrent requests with the same
    // email both pass the uniqueness check above before either saves).
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      throw new DuplicateEmailError(normalisedEmail);
    }
    throw err;
  }

  // 4. Return the saved document (passwordHash removed by toJSON transform)
  return user;
}

/**
 * Find a user by their email address.
 *
 * @param {string} email
 * @returns {Promise<import('../models/User') | null>}
 */
async function findUserByEmail(email) {
  return User.findOne({ email: normaliseEmail(email) });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  registerUser,
  isEmailTaken,
  findUserByEmail,
  // Export error classes so controllers can do `instanceof` checks
  DuplicateEmailError,
  ValidationError,
};
