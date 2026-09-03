```typescript
/**
 * password-rate-limit.integration.test.ts
 *
 * Integration test for the password-change rate-limiting feature (US-003).
 *
 * Mounts the full Express application with:
 *   - An in-memory mock Redis client (no real Redis required)
 *   - A real in-memory SQLite database (via createTestDb)
 *   - A pre-seeded active user account
 *   - A valid session token injected via the Authorization header
 *
 * Verifies:
 *   - Requests 1–5 from the same user return HTTP 2xx
 *   - Request 6 from the same user returns HTTP 429
 *   - The 429 body contains errorCode, message, and retryAfterSeconds
 *   - The Retry-After header is present and is a positive integer string
 *   - A second distinct user is not affected by the first user hitting the limit
 */

import request from 'supertest';
import type { Express } from 'express';
import type { Database } from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { createApp } from '../../app';
import { createTestDb, closeTestDb, type TestDb } from '../../integration/test-db';

// ---------------------------------------------------------------------------
// In-memory Redis mock
// ---------------------------------------------------------------------------

/**
 * A minimal in-memory Redis mock that implements the subset of ioredis used
 * by the password-change rate-limit middleware (INCR, EXPIRE, TTL, quit).
 */
class InMemoryRedisMock {
  private store: Map<string, { value: number; expiresAt: number | null }> = new Map();

  private getEntry(key: string): { value: number; expiresAt: number | null } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string): Promise<number> {
    const entry = this.getEntry(key);
    if (entry) {
      entry.value += 1;
      return entry.value;
    }
    this.store.set(key, { value: 1, expiresAt: null });
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.getEntry(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.getEntry(key);
    if (!entry) return null;
    return String(entry.value);
  }

  async set(
    key: string,
    value: string | number,
    ...args: (string | number)[]
  ): Promise<string> {
    let expiresAt: number | null = null;
    const argList = args.map(String);
    const exIdx = argList.findIndex((a) => a.toUpperCase() === 'EX');
    if (exIdx !== -1 && argList[exIdx + 1]) {
      expiresAt = Date.now() + parseInt(argList[exIdx + 1], 10) * 1000;
    }
    this.store.set(key, { value: Number(value), expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async quit(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  /** Helper for tests — clears all keys */
  flushAll(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports that trigger
// config loading, since config modules call requireEnvString at load time.
// ---------------------------------------------------------------------------

jest.mock('../../config/app.config', () => ({
  appConfig: {
    outboxPollIntervalMs: 30000,
    outboxMaxRetries: 1,
    tokenExpiryHours: 24,
    bcryptCostFactor: 12,
    activationBaseUrl: 'http://localhost:3000/activate',
    adminBearerToken: 'test-admin-token',
    sendgridApiKey: 'SG.test',
    sendgridTemplateId: 'test-template-id',
    fromEmail: 'test@example.com',
    fromName: 'Test',
    passwordRecoveryTokenExpiryHours: 1,
    passwordRecoveryBaseUrl: 'http://localhost:3000/reset-password',
    passwordRecoveryEmailTemplateId: 'test-recovery-template',
  },
}));

jest.mock('../../config/otp.config', () => ({
  otpConfig: {
    otpLength: 6,
    otpTtlMinutes: 10,
    otpMaxAttemptsPerWindow: 5,
    otpRateLimitWindowMinutes: 15,
    otpHashAlgorithm: 'sha256',
    otpHashSecret: 'test-secret',
    otpDeliveryEnabled: false,
    redisUrl: 'redis://localhost:6379',
    otpEmailTemplateId: 'test-otp-template',
  },
}));

jest.mock('../../config/lockout.config', () => ({
  lockoutConfig: {
    loginLockoutThreshold: 5,
    loginLockoutDurationMinutes: 15,
  },
}));

jest.mock('../../config/password-change-rate-limit.config', () => ({
  passwordChangeRateLimitConfig: {
    maxAttempts: 5,
    windowSeconds: 900,
  },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'OldPassword123!';
const TEST_NEW_PASSWORD = 'NewPassword456!';

interface SeedResult {
  userId: string;
  sessionToken: string;
}

async function seedActiveUserWithSession(
  db: Database,
  email: string,
  username: string,
): Promise<SeedResult> {
  const userId = `user-${Math.random().toString(36).slice(2)}`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
  ).run(userId, email, username, passwordHash);

  const sessionToken = `session-token-${Math.random().toString(36).slice(2)}`;
  const sessionId = `session-${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at, created_at, invalidated)
     VALUES (?, ?, ?, ?, datetime('now'), 0)`,
  ).run(sessionId, userId, sessionToken, expiresAt);

  return { userId, sessionToken };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Password Change Rate Limiting (US-003 Integration)', () => {
  let testDb: TestDb;
  let app: Express;
  let redisMock: InMemoryRedisMock;

  // Stub out delivery ports — we don't want real email/OTP in tests
  const mockOtpDeliveryPort = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };
  const mockEmailDeliveryPort = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    testDb = createTestDb();
    redisMock = new InMemoryRedisMock();
    app = createApp(
      testDb.db,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redisMock as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOtpDeliveryPort as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailDeliveryPort as any,
    );
  });

  afterEach(() => {
    closeTestDb(testDb);
    redisMock.flushAll();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC-1 / AC-2: Requests 1–5 should succeed (2xx)
  // -------------------------------------------------------------------------

  it('allows the first 5 password-change requests from the same user (2xx each)', async () => {
    const { sessionToken } = await seedActiveUserWithSession(
      testDb.db,
      'user1@example.com',
      'user1',
    );

    for (let i = 1; i <= 5; i++) {
      const response = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Re-hash after each change so subsequent requests pass auth check
      // (update the DB with the new password so the next request succeeds)
      const newHash = await bcrypt.hash(TEST_NEW_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, sessionToken);

      // For simplicity, keep using TEST_PASSWORD as the "current" by resetting it
      const oldHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(oldHash, sessionToken);
    }
  });

  // -------------------------------------------------------------------------
  // AC-3: Request 6 should return HTTP 429
  // -------------------------------------------------------------------------

  it('returns HTTP 429 on the 6th password-change request from the same user', async () => {
    const { sessionToken } = await seedActiveUserWithSession(
      testDb.db,
      'ratelimit@example.com',
      'ratelimituser',
    );

    // Exhaust the limit (requests 1–5)
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      // Accept any 2xx or password-related 4xx (wrong password after first
      // change is fine — what matters is the rate-limit counter is incremented)
      expect(res.status).not.toBe(429);

      // Reset password hash for next iteration
      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, sessionToken);
    }

    // 6th request — must be rate-limited
    const response = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

    expect(response.status).toBe(429);
  });

  // -------------------------------------------------------------------------
  // AC-3: 429 body contains required fields
  // -------------------------------------------------------------------------

  it('returns the correct 429 response body on the 6th request', async () => {
    const { sessionToken } = await seedActiveUserWithSession(
      testDb.db,
      'bodycheck@example.com',
      'bodycheckuser',
    );

    // Exhaust the limit
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, sessionToken);
    }

    const response = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      errorCode: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED',
      message: expect.any(String),
      retryAfterSeconds: expect.any(Number),
    });
    expect(typeof response.body.retryAfterSeconds).toBe('number');
    expect(response.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // AC-3: Retry-After header present and positive integer string
  // -------------------------------------------------------------------------

  it('includes a positive integer Retry-After header on the 429 response', async () => {
    const { sessionToken } = await seedActiveUserWithSession(
      testDb.db,
      'retryafter@example.com',
      'retryafteruser',
    );

    for (let i = 1; i <= 5; i++) {
      await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, sessionToken);
    }

    const response = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

    expect(response.status).toBe(429);

    const retryAfterHeader = response.headers['retry-after'];
    expect(retryAfterHeader).toBeDefined();
    expect(typeof retryAfterHeader).toBe('string');

    const retryAfterValue = parseInt(retryAfterHeader as string, 10);
    expect(isNaN(retryAfterValue)).toBe(false);
    expect(retryAfterValue).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // AC-6: A second user is unaffected when the first user hits the limit
  // -------------------------------------------------------------------------

  it('does not rate-limit a second user when the first user has hit the limit', async () => {
    const user1 = await seedActiveUserWithSession(
      testDb.db,
      'user-a@example.com',
      'usera',
    );
    const user2 = await seedActiveUserWithSession(
      testDb.db,
      'user-b@example.com',
      'userb',
    );

    // Exhaust the limit for user1
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${user1.sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, user1.sessionToken);
    }

    // Confirm user1 is now rate-limited
    const user1Response = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${user1.sessionToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });
    expect(user1Response.status).toBe(429);

    // User2 should NOT be rate-limited — their first request should not be 429
    const user2Response = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${user2.sessionToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_NEW_PASSWORD,
      });

    expect(user2Response.status).not.toBe(429);
    expect(user2Response.status).toBeGreaterThanOrEqual(200);
    expect(user2Response.status).toBeLessThan(500);
  });

  // -------------------------------------------------------------------------
  // Additional: Verify the rate-limit counter increments correctly
  // -------------------------------------------------------------------------

  it('does not return 429 on exactly the 5th request (limit is inclusive)', async () => {
    const { sessionToken } = await seedActiveUserWithSession(
      testDb.db,
      'exact5@example.com',
      'exact5user',
    );

    let fifthResponse!: request.Response;

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_NEW_PASSWORD,
        });

      if (i === 5) {
        fifthResponse = res;
      }

      const newHash = await bcrypt.hash(TEST_PASSWORD, 10);
      testDb.db
        .prepare(`UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM sessions WHERE token = ?)`)
        .run(newHash, sessionToken);
    }

    // The 5th request must NOT be rate-limited
    expect(fifthResponse.status).not.toBe(429);
  });
});
```