```typescript
/**
 * password-change-rate-limit.middleware.test.ts
 *
 * Unit tests for the password-change rate-limit middleware.
 * Story reference: US-003
 * Requirements: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
 */

import type { Request, Response, NextFunction } from 'express';
import { createPasswordChangeRateLimitMiddleware } from './password-change-rate-limit.middleware';
import { PasswordChangeRateLimitExceededException } from '../errors/password-change.errors';

// ---------------------------------------------------------------------------
// Mock Redis client
// ---------------------------------------------------------------------------

interface MockRedis {
  incr: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
}

function createMockRedis(): MockRedis {
  return {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(userId: string): Partial<Request> {
  return {
    user: { id: userId } as Express.User,
  };
}

function buildResponse(): Partial<Response> {
  return {};
}

function buildNext(): jest.Mock {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('createPasswordChangeRateLimitMiddleware', () => {
  let mockRedis: MockRedis;
  let next: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    next = buildNext();
    res = buildResponse();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // (a) Counter below the limit — next() called without error
  // -------------------------------------------------------------------------
  it('(a) calls next() with no arguments when counter is below the limit (3rd attempt)', async () => {
    // INCR returns 3 — below maxAttempts (5)
    mockRedis.incr.mockResolvedValue(3);
    mockRedis.expire.mockResolvedValue(1);

    const req = buildRequest('user-001');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(/* no args */);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // (b) Counter AT the limit — 5th attempt passes through
  // -------------------------------------------------------------------------
  it('(b) calls next() with no arguments when counter equals maxAttempts (5th attempt)', async () => {
    // INCR returns 5 — exactly at maxAttempts (inclusive per AC-2)
    mockRedis.incr.mockResolvedValue(5);
    mockRedis.expire.mockResolvedValue(1);

    const req = buildRequest('user-002');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // (c) Counter OVER the limit — 6th attempt rejected with correct error
  // -------------------------------------------------------------------------
  it('(c) calls next() with PasswordChangeRateLimitExceededException on 6th attempt', async () => {
    const mockedTtl = 743;
    // INCR returns 6 — over maxAttempts
    mockRedis.incr.mockResolvedValue(6);
    mockRedis.ttl.mockResolvedValue(mockedTtl);

    const req = buildRequest('user-003');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);

    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(PasswordChangeRateLimitExceededException);
    expect((errorArg as PasswordChangeRateLimitExceededException).code).toBe(
      'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED',
    );
    expect((errorArg as PasswordChangeRateLimitExceededException).retryAfterSeconds).toBe(
      mockedTtl,
    );
  });

  // -------------------------------------------------------------------------
  // (d) First increment (value === 1) — EXPIRE is called with windowSeconds
  // -------------------------------------------------------------------------
  it('(d) calls EXPIRE with windowSeconds when INCR result is 1 (first attempt)', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const req = buildRequest('user-004');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    // Default windowSeconds is 900 (15 minutes)
    expect(mockRedis.expire).toHaveBeenCalledTimes(1);
    const expireArgs = mockRedis.expire.mock.calls[0];
    // Second argument must be the window duration (900 seconds by default)
    expect(expireArgs[1]).toBe(900);

    // next() should still be called with no error
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // (e) Redis INCR throws — fail-open, console.error called
  // -------------------------------------------------------------------------
  it('(e) calls next() without error and logs when Redis INCR throws (fail-open)', async () => {
    const redisError = new Error('ECONNREFUSED');
    mockRedis.incr.mockRejectedValue(redisError);

    const req = buildRequest('user-005');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    // Fail-open: request is allowed through
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);

    // Error must be logged
    expect(console.error).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // (f) Two different user IDs — each uses its own Redis key (counter isolation)
  // -------------------------------------------------------------------------
  it('(f) uses separate Redis keys for different user IDs, keeping counters independent', async () => {
    // User A has hit the limit (counter = 6), user B is below it (counter = 2)
    const mockedTtl = 500;
    mockRedis.incr
      .mockResolvedValueOnce(6) // user A → over limit
      .mockResolvedValueOnce(2); // user B → under limit
    mockRedis.ttl.mockResolvedValue(mockedTtl);

    const reqA = buildRequest('user-A');
    const reqB = buildRequest('user-B');
    const nextA = buildNext();
    const nextB = buildNext();

    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(reqA as Request, res as Response, nextA as NextFunction);
    await middleware(reqB as Request, res as Response, nextB as NextFunction);

    // Verify the Redis keys used are distinct and scoped to userId
    const incrCalls = mockRedis.incr.mock.calls;
    expect(incrCalls).toHaveLength(2);
    const keyA = incrCalls[0][0] as string;
    const keyB = incrCalls[1][0] as string;

    expect(keyA).toContain('user-A');
    expect(keyB).toContain('user-B');
    expect(keyA).not.toBe(keyB);

    // User A is blocked
    expect(nextA).toHaveBeenCalledTimes(1);
    const errorArgA = nextA.mock.calls[0][0];
    expect(errorArgA).toBeInstanceOf(PasswordChangeRateLimitExceededException);

    // User B passes through
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(nextB.mock.calls[0]).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Additional: Redis TTL throws after INCR over limit — still calls next with error
  // -------------------------------------------------------------------------
  it('calls next() with error even when TTL lookup fails (uses 0 as fallback)', async () => {
    mockRedis.incr.mockResolvedValue(6);
    // TTL call fails
    mockRedis.ttl.mockRejectedValue(new Error('TTL lookup failed'));

    const req = buildRequest('user-006');
    const middleware = createPasswordChangeRateLimitMiddleware(mockRedis as never);

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(PasswordChangeRateLimitExceededException);
  });
});
```