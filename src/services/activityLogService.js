/**
 * activityLogService
 *
 * Provides a secure, centralised interface for recording login-attempt
 * activity logs.  All writes go through this service so that:
 *   - Callers never touch the model directly (enforces access restriction).
 *   - Log entries are always complete and consistently structured.
 *   - Errors in logging never propagate to the caller (fire-and-forget with
 *     internal error reporting).
 */

const ActivityLog = require('../models/ActivityLog');

/**
 * Record a login attempt.
 *
 * @param {object} params
 * @param {string}  params.identifier    - Username or email used in the attempt.
 * @param {'SUCCESS'|'FAILURE'} params.status - Outcome of the attempt.
 * @param {string}  [params.failureReason]   - Why the attempt failed (optional).
 * @param {string}  [params.ipAddress]       - Client IP address (optional).
 * @param {string}  [params.userAgent]       - Client User-Agent string (optional).
 * @returns {Promise<void>}
 */
async function recordLoginAttempt({ identifier, status, failureReason = null, ipAddress = null, userAgent = null }) {
  try {
    if (!identifier || !status) {
      throw new Error('activityLogService.recordLoginAttempt: identifier and status are required.');
    }

    const entry = new ActivityLog({
      identifier,
      status,
      failureReason: status === 'FAILURE' ? failureReason : null,
      ipAddress,
      userAgent,
    });

    await entry.save();
  } catch (err) {
    // Logging must never crash the authentication flow.
    // Emit to stderr so infrastructure log aggregators (e.g. CloudWatch, Datadog)
    // can alert on persistent logging failures without surfacing them to users.
    console.error('[activityLogService] Failed to persist login activity log:', err.message);
  }
}

/**
 * Retrieve paginated login-attempt logs for a given identifier.
 * Intended for admin / audit use only — enforce RBAC at the route level.
 *
 * @param {string} identifier - The username or email to query.
 * @param {object} [options]
 * @param {number} [options.page=1]   - 1-based page number.
 * @param {number} [options.limit=50] - Records per page (max 200).
 * @returns {Promise<{logs: object[], total: number, page: number, limit: number}>}
 */
async function getLoginLogs(identifier, { page = 1, limit = 50 } = {}) {
  const safeLimit = Math.min(limit, 200);
  const skip = (page - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    ActivityLog.find({ identifier })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    ActivityLog.countDocuments({ identifier }),
  ]);

  return { logs, total, page, limit: safeLimit };
}

module.exports = { recordLoginAttempt, getLoginLogs };
