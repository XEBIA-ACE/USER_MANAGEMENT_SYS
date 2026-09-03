```typescript
/**
 * csrf.middleware.test.ts
 *
 * Unit tests for generateCsrfToken and validateCsrfMiddleware.
 *
 * All Redis interactions are mocked — no real network connections are made.
 * The crypto module's randomBytes is mocked where deterministic output is
 * required to verify token generation behaviour.
 *
 * Requirements: US-002 AC-1 through AC-7
 */

// ---------------------------------------------------------------------------
// Set required environment variables BEFORE any imports that load config
// ---------------------------------------------------------------------------
process.env.CSRF_SECRET = 'test-csrf-secret-value-at-least-32-chars!!';
process.env.SESSION_EXPIRY_SECONDS = '3600';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { generateCsrfToken, validateCsrfMiddleware } from './csrf.middleware';
import { CsrfTokenMissingError } from '../errors/csrf.errors';
import { CsrfTokenInvalidError } from '../errors/csrf.errors';

// ---------------------------------------------------------------------------
// Mock Redis client factory
// ---------------------------------------------------------------------------

function makeMockRedis(getReturnValue: string | null = null) {
  return {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(getReturnValue),
  };
}

// ---------------------------------------------------------------------------
// Mock Express objects
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<Request> & Record<string, unknown> = {}): Request {
  return {
    method: 'POST',
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

function makeNext(): jest.Mock<void, [unknown?]> {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// Helper: compute the real HMAC the same way the middleware does, so tests
// can pre-populate Redis with the correct stored value.
// ---------------------------------------------------------------------------

function computeExpectedHmac(token: string): string {
  return crypto
    .createHmac('sha256', process.env.CSRF_SECRET as string)
    .update(token)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// 1. generateCsrfToken
// ---------------------------------------------------------------------------

describe('generateCsrfToken', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a 64-character hex string', async () => {
    const redis = makeMockRedis();
    const token = await generateCsrfToken('session-abc', redis as never);

    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('calls Redis set with key csrf:{sessionId}, an HMAC hex value, and the configured TTL', async () => {
    const redis = makeMockRedis();
    const sessionId = 'session-xyz';

    const token = await generateCsrfToken(sessionId, redis as never);

    expect(redis.set).toHaveBeenCalledTimes(1);

    const [redisKey, storedValue, exFlag, ttl] = redis.set.mock.calls[0] as [
      string,
      string,
      string,
      number,
    ];

    // Key format
    expect(redisKey).toBe(`csrf:${sessionId}`);

    // Stored value is the HMAC of the returned token (not the token itself)
    const expectedHmac = computeExpectedHmac(token);
    expect(storedValue).toBe(expectedHmac);
    expect(storedValue).toMatch(/^[0-9a-f]{64}$/);

    // EX flag + TTL
    expect(exFlag).toBe('EX');
    expect(ttl).toBe(3600);
  });

  it('produces different tokens on two successive calls', async () => {
    const redis = makeMockRedis();

    const token1 = await generateCsrfToken('session-1', redis as never);
    const token2 = await generateCsrfToken('session-2', redis as never);

    expect(token1).not.toBe(token2);
  });

  it('stores the HMAC of the token, not the token itself', async () => {
    const redis = makeMockRedis();
    const token = await generateCsrfToken('session-store-check', redis as never);

    const storedValue = redis.set.mock.calls[0][1] as string;
    // The stored value must NOT equal the raw token
    expect(storedValue).not.toBe(token);
    // But it must equal the expected HMAC
    expect(storedValue).toBe(computeExpectedHmac(token));
  });

  it('uses crypto.randomBytes to generate the token bytes', async () => {
    const fixedBytes = Buffer.alloc(32, 0xab);
    const randomBytesSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(fixedBytes as never);

    const redis = makeMockRedis();
    const token = await generateCsrfToken('session-deterministic', redis as never);

    expect(randomBytesSpy).toHaveBeenCalledWith(32);
    expect(token).toBe(fixedBytes.toString('hex'));
  });
});

// ---------------------------------------------------------------------------
// 2. validateCsrfMiddleware — safe methods
// ---------------------------------------------------------------------------

describe('validateCsrfMiddleware — safe methods', () => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  it.each(safeMethods)(
    '%s: calls next() with no error regardless of whether X-CSRF-Token is absent',
    async (method) => {
      const redis = makeMockRedis();
      const middleware = validateCsrfMiddleware(redis as never);
      const req = makeReq({ method });
      const res = makeRes();
      const next = makeNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(/* no argument */);
      expect(redis.get).not.toHaveBeenCalled();
    },
  );

  it.each(safeMethods)(
    '%s: calls next() with no error even when X-CSRF-Token header is present',
    async (method) => {
      const redis = makeMockRedis();
      const middleware = validateCsrfMiddleware(redis as never);
      const req = makeReq({
        method,
        headers: { 'x-csrf-token': 'some-token-value' },
      });
      const res = makeRes();
      const next = makeNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    },
  );
});

// ---------------------------------------------------------------------------
// 3. validateCsrfMiddleware — missing token
// ---------------------------------------------------------------------------

describe('validateCsrfMiddleware — missing token', () => {
  it('POST without X-CSRF-Token header: calls next with CsrfTokenMissingError', async () => {
    const redis = makeMockRedis();
    const middleware = validateCsrfMiddleware(redis as never);
    const req = makeReq({ method: 'POST', headers: {} });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const arg = next.mock.calls[0][0];
    expect(arg).toBeInstanceOf(CsrfTokenMissingError);
    expect((arg as CsrfTokenMissingError).code).toBe('CSRF_TOKEN_MISSING');
  });

  it('POST with empty X-CSRF-Token header: calls next with CsrfTokenMissingError', async () => {
    const redis = makeMockRedis();
    const middleware = validateCsrfMiddleware(redis as never);
    const req = makeReq({ method: 'POST', headers: { 'x-csrf-token': '   ' } });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenMissingError);
  });

  it('PUT without X-CSRF-Token header: calls next with CsrfTokenMissingError', async () => {
    const redis = makeMockRedis();
    const middleware = validateCsrfMiddleware(redis as never);
    const req = makeReq({ method: 'PUT', headers: {} });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenMissingError);
  });

  it('DELETE without X-CSRF-Token header: calls next with CsrfTokenMissingError', async () => {
    const redis = makeMockRedis();
    const middleware = validateCsrfMiddleware(redis as never);
    const req = makeReq({ method: 'DELETE', headers: {} });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenMissingError);
  });

  it('PATCH without X-CSRF-Token header: calls next with CsrfTokenMissingError', async () => {
    const redis = makeMockRedis();
    const middleware = validateCsrfMiddleware(redis as never);
    const req = makeReq({ method: 'PATCH', headers: {} });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenMissingError);
  });
});

// ---------------------------------------------------------------------------
// 4. validateCsrfMiddleware — invalid token
// ---------------------------------------------------------------------------

describe('validateCsrfMiddleware — invalid token', () => {
  it('POST with tampered token: calls next with CsrfTokenInvalidError', async () => {
    const sessionId = 'session-tamper';
    // Generate a legitimate token and store its HMAC
    const legitimateToken = crypto.randomBytes(32).toString('hex');
    const legitimateHmac = computeExpectedHmac(legitimateToken);

    const redis = makeMockRedis(legitimateHmac);
    const middleware = validateCsrfMiddleware(redis as never);

    // Submit a tampered token (flip one character)
    const tamperedToken = legitimateToken.slice(0, -1) + (legitimateToken.endsWith('a') ? 'b' : 'a');

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': tamperedToken },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const arg = next.mock.calls[0][0];
    expect(arg).toBeInstanceOf(CsrfTokenInvalidError);
    expect((arg as CsrfTokenInvalidError).code).toBe('CSRF_TOKEN_INVALID');
  });

  it('POST with token for a different session: calls next with CsrfTokenInvalidError', async () => {
    const sessionIdA = 'session-A';
    const sessionIdB = 'session-B';

    // Token generated for session A
    const tokenForSessionA = crypto.randomBytes(32).toString('hex');
    const hmacForSessionA = computeExpectedHmac(tokenForSessionA);

    // Redis for session B returns the HMAC for session A's token — mismatch
    // (In practice Redis would have a different key, but here we simulate
    //  submitting session A's token against session B's stored HMAC.)
    const tokenForSessionB = crypto.randomBytes(32).toString('hex');
    const hmacForSessionB = computeExpectedHmac(tokenForSessionB);

    const redis = makeMockRedis(hmacForSessionB);
    const middleware = validateCsrfMiddleware(redis as never);

    // Submit session A's token but request is for session B
    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': tokenForSessionA },
      sessionId: sessionIdB,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(redis.get).toHaveBeenCalledWith(`csrf:${sessionIdB}`);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenInvalidError);

    // Silence unused variable warning — hmacForSessionA is intentionally unused
    void hmacForSessionA;
    void sessionIdA;
  });

  it('POST when Redis returns null (key expired/missing): calls next with CsrfTokenInvalidError', async () => {
    const redis = makeMockRedis(null); // null = key not found
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': 'some-valid-looking-token' },
      sessionId: 'session-expired',
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenInvalidError);
  });

  it('POST when no session ID is available: calls next with CsrfTokenInvalidError', async () => {
    const redis = makeMockRedis('some-hmac');
    const middleware = validateCsrfMiddleware(redis as never);

    // Request has no sessionId property and no session.id
    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': 'some-token' },
      // no sessionId, no session
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenInvalidError);
  });

  it('POST when Redis throws: calls next with CsrfTokenInvalidError', async () => {
    const redis = {
      set: jest.fn(),
      get: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
    };
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': 'some-token' },
      sessionId: 'session-redis-error',
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenInvalidError);
  });

  it('POST with a completely random garbage token: calls next with CsrfTokenInvalidError', async () => {
    const legitimateToken = crypto.randomBytes(32).toString('hex');
    const legitimateHmac = computeExpectedHmac(legitimateToken);

    const redis = makeMockRedis(legitimateHmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': 'totally-wrong-garbage-value' },
      sessionId: 'session-garbage',
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(CsrfTokenInvalidError);
  });
});

// ---------------------------------------------------------------------------
// 5. validateCsrfMiddleware — valid token
// ---------------------------------------------------------------------------

describe('validateCsrfMiddleware — valid token', () => {
  it('POST with correct token matching the stored HMAC: calls next() with no argument', async () => {
    const sessionId = 'session-valid';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': token },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(redis.get).toHaveBeenCalledWith(`csrf:${sessionId}`);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(/* no argument */);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('PUT with correct token: calls next() with no argument', async () => {
    const sessionId = 'session-put';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'PUT',
      headers: { 'x-csrf-token': token },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('PATCH with correct token: calls next() with no argument', async () => {
    const sessionId = 'session-patch';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'PATCH',
      headers: { 'x-csrf-token': token },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('DELETE with correct token: calls next() with no argument', async () => {
    const sessionId = 'session-delete';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'DELETE',
      headers: { 'x-csrf-token': token },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('valid token supplied via session.id (express-session style): calls next() with no argument', async () => {
    const sessionId = 'express-session-id-123';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    // Express-session attaches session as req.session with an id property
    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': token },
      session: { id: sessionId },
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(redis.get).toHaveBeenCalledWith(`csrf:${sessionId}`);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('token with surrounding whitespace is trimmed before comparison', async () => {
    const sessionId = 'session-trim';
    const token = crypto.randomBytes(32).toString('hex');
    const hmac = computeExpectedHmac(token);

    const redis = makeMockRedis(hmac);
    const middleware = validateCsrfMiddleware(redis as never);

    const req = makeReq({
      method: 'POST',
      headers: { 'x-csrf-token': `  ${token}  ` },
      sessionId,
    });
    const res = makeRes();
    const next = makeNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toHaveLength(0);
  });
});
```