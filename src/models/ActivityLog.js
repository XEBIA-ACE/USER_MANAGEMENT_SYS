/**
 * ActivityLog Model
 *
 * Represents a persisted record of a login attempt.
 * Uses Mongoose (MongoDB ODM) to store logs securely.
 * Access to the underlying collection should be restricted
 * to admin/audit roles at the database level.
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    // The username or email used in the login attempt
    identifier: {
      type: String,
      required: true,
      trim: true,
    },

    // Outcome of the login attempt
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      required: true,
    },

    // Human-readable reason for failure (omitted on success)
    failureReason: {
      type: String,
      default: null,
    },

    // IP address of the client making the request
    ipAddress: {
      type: String,
      default: null,
    },

    // User-Agent header from the request
    userAgent: {
      type: String,
      default: null,
    },

    // Timestamp is automatically managed by Mongoose via `timestamps`
  },
  {
    // Adds `createdAt` and `updatedAt` fields automatically
    timestamps: true,

    // Prevent accidental schema drift
    strict: true,
  }
);

// Index on identifier + createdAt to support efficient audit queries
activityLogSchema.index({ identifier: 1, createdAt: -1 });

// Index on status to allow quick filtering of failures
activityLogSchema.index({ status: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
