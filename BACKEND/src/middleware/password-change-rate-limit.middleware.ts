```typescript
/**
 * password-change-rate-limit.middleware.ts
 *
 * Express middleware factory that enforces a per-user rate limit on
 * password-change requests using a Redis INCR + EXPIRE sliding-window counter.
 *
 * Story reference: US-003
 * Requirements: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { passwordChangeRateLimitConfig } from '../config/password-change-rate-limit.config';
import { PasswordChangeRateLimitExceededException } from '../errors/password-change.errors';

/**
 * Builds the Redis key for a given authenticated user.
 * Key schema: `password_change_rate_limit:{userId}`
 */
function buildRedisKey(userId: string): string {
  return `password_change_rate_limit:${userId}`;
}

/**
 * Factory that returns an Express `RequestHandler` which rate-limits
 * password-change requests per authenticated user.
 *
 * Fail-open: if Redis is unavailable the request is allowed through and
 * the error is logged via `console.error`.
 */
export function createPasswordChangeRateLimitMiddleware(redis: Redis): RequestHandler {
  const { maxAttempts, windowSeconds } = passwordChangeRateLimitConfig;

  return async function passwordChangeRateLimitMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Extract authenticated user ID — provided by upstream auth middleware
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      // No authenticated user — let downstream auth middleware handle it
      next();
      return;
    }

    const key = buildRedisKey(userId);

    try {
      const count = await redis.incr(key);

      // Set TTL only on the very first increment to avoid resetting the window
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > maxAttempts) {
        // Retrieve remaining TTL so we can populate Retry-After
        let retryAfterSeconds = 0;
        try {
          const ttl = await redis.ttl(key);
          retryAfterSeconds = ttl > 0 ? ttl : 0;
        } catch (ttlErr) {
          console.error('[PasswordChangeRateLimit] Failed to retrieve TTL from Redis:', ttlErr);
        }

        next(new PasswordChangeRateLimitExceededException(retryAfterSeconds));
        return;
      }

      next();
    } catch (err) {
      // Fail-open: log the error but allow the request through
      console.error('[PasswordChangeRateLimit] Redis error — allowing request through (fail-open):', err);
      next();
    }
  };
}
```