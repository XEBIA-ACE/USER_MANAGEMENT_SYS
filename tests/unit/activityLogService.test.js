/**
 * activityLogService.test.js
 *
 * Unit tests for the activity logging service.
 * Uses Jest + mongodb-memory-server for an isolated, in-memory MongoDB instance
 * so no real database credentials are required.
 *
 * Install dev dependencies:
 *   npm install --save-dev jest @shelf/jest-mongodb mongodb-memory-server
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { recordLoginAttempt, getLoginLogs } = require('../../src/services/activityLogService');
const ActivityLog = require('../../src/models/ActivityLog');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await ActivityLog.deleteMany({});
});

// ---------------------------------------------------------------------------
// recordLoginAttempt
// ---------------------------------------------------------------------------
describe('recordLoginAttempt', () => {
  test('persists a SUCCESS log entry', async () => {
    await recordLoginAttempt({
      identifier: 'alice@example.com',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest/1.0',
    });

    const logs = await ActivityLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].identifier).toBe('alice@example.com');
    expect(logs[0].status).toBe('SUCCESS');
    expect(logs[0].failureReason).toBeNull();
    expect(logs[0].ipAddress).toBe('127.0.0.1');
    expect(logs[0].createdAt).toBeDefined();
  });

  test('persists a FAILURE log entry with a reason', async () => {
    await recordLoginAttempt({
      identifier: 'bob@example.com',
      status: 'FAILURE',
      failureReason: 'Incorrect password.',
      ipAddress: '10.0.0.1',
    });

    const logs = await ActivityLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('FAILURE');
    expect(logs[0].failureReason).toBe('Incorrect password.');
  });

  test('does not throw when called with missing optional fields', async () => {
    await expect(
      recordLoginAttempt({ identifier: 'charlie', status: 'SUCCESS' })
    ).resolves.toBeUndefined();
  });

  test('does not throw (fire-and-forget) when identifier is missing', async () => {
    // Should swallow the error internally
    await expect(
      recordLoginAttempt({ status: 'FAILURE' })
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getLoginLogs
// ---------------------------------------------------------------------------
describe('getLoginLogs', () => {
  beforeEach(async () => {
    // Seed 5 log entries for 'dave' and 2 for 'eve'
    const entries = [
      ...Array.from({ length: 5 }, (_, i) => ({
        identifier: 'dave@example.com',
        status: i % 2 === 0 ? 'SUCCESS' : 'FAILURE',
        failureReason: i % 2 !== 0 ? 'Bad password' : null,
        ipAddress: '192.168.1.1',
      })),
      { identifier: 'eve@example.com', status: 'SUCCESS', ipAddress: '192.168.1.2' },
      { identifier: 'eve@example.com', status: 'FAILURE', failureReason: 'Not found', ipAddress: '192.168.1.2' },
    ];

    for (const e of entries) {
      await recordLoginAttempt(e);
    }
  });

  test('returns only logs for the requested identifier', async () => {
    const result = await getLoginLogs('dave@example.com');
    expect(result.total).toBe(5);
    result.logs.forEach((log) => expect(log.identifier).toBe('dave@example.com'));
  });

  test('returns correct total for a different identifier', async () => {
    const result = await getLoginLogs('eve@example.com');
    expect(result.total).toBe(2);
  });

  test('respects pagination (limit)', async () => {
    const result = await getLoginLogs('dave@example.com', { page: 1, limit: 2 });
    expect(result.logs).toHaveLength(2);
    expect(result.limit).toBe(2);
  });

  test('caps limit at 200', async () => {
    const result = await getLoginLogs('dave@example.com', { page: 1, limit: 9999 });
    expect(result.limit).toBe(200);
  });

  test('returns empty array for unknown identifier', async () => {
    const result = await getLoginLogs('unknown@example.com');
    expect(result.logs).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
