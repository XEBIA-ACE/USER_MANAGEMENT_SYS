/**
 * activityLogger.js
 * Records login attempts (success and failure) for auditing purposes.
 *
 * Each entry captures: userId (if known), email, success flag, reason, and timestamp.
 *
 * TODO: Replace console output with a persistent store (DB table, file, or
 *       a structured logging service such as Winston + a transport).
 */

/**
 * Logs a single login attempt.
 *
 * @param {object} entry
 * @param {string}  entry.email     - Email used in the attempt
 * @param {boolean} entry.success   - Whether authentication succeeded
 * @param {string}  [entry.userId]  - User ID (only present on success)
 * @param {string}  [entry.reason]  - Failure reason (only present on failure)
 * @param {string}  entry.timestamp - ISO-8601 timestamp
 */
async function logLoginAttempt(entry) {
  // Structured log line — replace with a proper logger in production
  const level = entry.success ? 'INFO' : 'WARN';
  console.log(
    JSON.stringify({
      level,
      event: 'LOGIN_ATTEMPT',
      ...entry,
    })
  );

  // TODO: Persist to an audit_log table or append to a secure log file.
  // Example (Sequelize):
  //   await AuditLog.create({ event: 'LOGIN_ATTEMPT', ...entry });
}

module.exports = { logLoginAttempt };
