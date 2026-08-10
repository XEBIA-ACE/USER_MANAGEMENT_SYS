/**
 * activityLogRouter
 *
 * Exposes read-only audit endpoints for login-attempt logs.
 * All routes are protected — apply your authentication + admin-role
 * middleware before mounting this router.
 *
 * Example mount (app.js):
 *   const activityLogRouter = require('./routes/activityLogRoutes');
 *   app.use('/admin/activity-logs', requireAuth, requireAdminRole, activityLogRouter);
 */

const express = require('express');
const { getLoginLogs } = require('../services/activityLogService');

const router = express.Router();

/**
 * GET /admin/activity-logs/login?identifier=<value>&page=1&limit=50
 *
 * Returns paginated login-attempt logs for the given identifier.
 * Access is restricted to authenticated admin users (enforced by the
 * middleware applied when mounting this router).
 */
router.get('/login', async (req, res) => {
  const { identifier, page = '1', limit = '50' } = req.query;

  if (!identifier) {
    return res.status(400).json({ message: 'Query parameter "identifier" is required.' });
  }

  try {
    const result = await getLoginLogs(identifier, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[activityLogRoutes] Error fetching logs:', err);
    return res.status(500).json({ message: 'Failed to retrieve activity logs.' });
  }
});

module.exports = router;
