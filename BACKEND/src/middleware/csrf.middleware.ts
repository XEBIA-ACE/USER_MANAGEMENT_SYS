```typescript
/**
 * csrf.middleware.ts
 *
 * Implements CSRF token generation and validation using the Synchronizer Token
 * Pattern. Tokens are 32-byte cryptographically random values stored as
 * HMAC-SHA256 hashes in Redis, keyed by session ID.
 *
 * Safe HTTP methods (GET, HEAD, OPTIONS) are exempt from validation per
 * AC-4 of the specification.
 *
 * Requirements: US-002 AC-1 through AC-7
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { csrfConfig } from '../config/csrf.config';
import { CsrfTokenMissingError } from '../errors/csrf.errors';
import { CsrfTokenInvalidError } from '../errors/csrf.errors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CSRF_TOKEN_BYTE_LENGTH = 32;
const CSRF_KEY_PREFIX = 'csrf:';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the Redis key for the CSRF hash associated with a session.
 */
function csrfRedisKey(sessionId: string): string {
  return `${CSRF_KEY_PREFIX}${sessionId}`;
}

/**
 * Computes the HMAC-SHA256 of the given token using the configured secret.
 * Returns a hex string. The plaintext token is never stored.
 */
function hmacToken(token: string): string {
  return crypto
    .createHmac('sha256', csrfConfig.csrfSecret)
    .update(token)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a new CSRF token, stores its HMAC in Redis under `csrf:{sessionId}`,
 * and returns the plaintext hex token to be sent to the client.
 *
 * The TTL is set to `ttlSeconds` which should match the session expiry.
 */
export async function generateCsrfToken(
  sessionId: string,
  redis: Redis,
  ttlSeconds: number = 3600,
): Promise<string> {
  const rawBytes = crypto.randomBytes(CSRF_TOKEN_BYTE_LENGTH);
  const token = rawBytes.toString('hex');
  const hash = hmacToken(token);

  await redis.setex(csrfRedisKey(sessionId), ttlSeconds, hash);

  return token;
}

/**
 * Express middleware factory that validates the `X-CSRF-Token` header on all
 * state-changing (non-safe) HTTP methods.
 *
 * Prerequisites:
 *  - A session middleware must have already run and attached `req.session` or
 *    similar. This middleware reads the session ID from `req.sessionId` or
 *    falls back to `(req as any).session?.id`.
 *
 * Throws `CsrfTokenMissingError` or `CsrfTokenInvalidError` which are handled
 * by `createAppErrorHandler` in app.ts.
 */
export function validateCsrfMiddleware(redis: Redis) {
  return async function csrfValidation(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Safe methods are exempt from CSRF validation (AC-4)
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    // Resolve the session ID from the request. The session middleware attaches
    // it to req.session.id (express-session convention).
    const sessionId: string | undefined =
      (req as Request & { session?: { id?: string } }).session?.id;

    if (!sessionId) {
      // No session means no token can be valid; treat as missing token.
      return next(new CsrfTokenMissingError());
    }

    const providedToken = req.headers['x-csrf-token'];

    if (!providedToken || typeof providedToken !== 'string' || providedToken.trim() === '') {
      return next(new CsrfTokenMissingError());
    }

    // Fetch stored hash from Redis
    let storedHash: string | null;
    try {
      storedHash = await redis.get(csrfRedisKey(sessionId));
    } catch {
      // Redis error — fail closed (secure default)
      return next(new CsrfTokenInvalidError());
    }

    if (!storedHash) {
      // No token stored for this session (never generated or expired)
      return next(new CsrfTokenInvalidError());
    }

    // Constant-time comparison to prevent timing attacks (AC-7)
    const expectedHash = hmacToken(providedToken.trim());

    let tokenMatches: boolean;
    try {
      const expectedBuf = Buffer.from(expectedHash, 'hex');
      const storedBuf = Buffer.from(storedHash, 'hex');

      if (expectedBuf.length !== storedBuf.length) {
        tokenMatches = false;
      } else {
        tokenMatches = crypto.timingSafeEqual(expectedBuf, storedBuf);
      }
    } catch {
      tokenMatches = false;
    }

    if (!tokenMatches) {
      return next(new CsrfTokenInvalidError());
    }

    return next();
  };
}
```