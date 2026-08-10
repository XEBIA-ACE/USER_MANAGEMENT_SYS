/**
 * userRepository.js
 * Data-access layer for user records.
 *
 * In production, replace the in-memory store with a real DB query
 * (e.g., Sequelize / Mongoose / pg).
 *
 * Passwords stored here MUST already be bcrypt-hashed.
 * Plain-text passwords must NEVER be persisted.
 */

// TODO: Replace with real ORM/DB calls (e.g., User.findOne({ where: { email } }))
// In-memory store is provided solely for unit-testing without a live database.
const _users = new Map();

/**
 * Finds a user record by email address (case-insensitive lookup).
 *
 * @param {string} email - Normalised (lowercase) email address
 * @returns {object|null} User record or null if not found
 */
async function findByEmail(email) {
  return _users.get(email) || null;
}

/**
 * Finds a user record by primary key.
 *
 * @param {string|number} id - User primary key
 * @returns {object|null} User record or null if not found
 */
async function findById(id) {
  for (const user of _users.values()) {
    if (String(user.id) === String(id)) return user;
  }
  return null;
}

/**
 * Persists a new user record (used by registration flow).
 * The caller is responsible for hashing the password before calling this.
 *
 * @param {object} userData - { id, email, passwordHash, role, ... }
 * @returns {object} The saved user record
 */
async function save(userData) {
  _users.set(userData.email.toLowerCase(), userData);
  return userData;
}

// Expose the internal store only for test seeding — not for production use.
function _seedForTests(users) {
  users.forEach((u) => _users.set(u.email.toLowerCase(), u));
}

module.exports = { findByEmail, findById, save, _seedForTests };
