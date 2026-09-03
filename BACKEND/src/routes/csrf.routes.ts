```typescript
/**
 * csrf.routes.ts
 *
 * Provides the `GET /csrf-token` endpoint (mounted under `/api/v1` in app.ts,
 * making the full path `GET /api/v1/csrf-token`).
 *
 * This route MUST be registered BEFORE the `validateCsrfMiddleware` so that
 * clients can obtain their first token without needing a pre-existing one.
 *
 * Requirements: US-002 AC-6, AC-7
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { generateCsrfToken } from '../middleware/csrf.middleware';
import {
  SessionNotFoundException,
} from '../errors/login.errors';

// Default TTL — 1 hour; override via SESSION_EXPIRY_SECONDS if needed.
const DEFAULT_TTL_SECONDS = parseInt(process.env.SESSION_EXPIRY_SECONDS ?? '3600', 10);

/**
 * Factory that creates the CSRF token router, wiring in the Redis client.
 */
export function createCsrfRouter(redis: Redis): Router {
  const router = Router();

  /**
   * GET /api/v1/csrf-token
   *
   * Returns a fresh CSRF token for the current authenticated session.
   * Requires the user to have an active session (session middleware must run
   * before this handler).
   */
  router.get('/csrf-token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId: string | undefined =
        (req as Request & { session?: { id?: string } }).session?.id;

      if (!sessionId) {
        return next(new SessionNotFoundException());
      }

      const ttl = isNaN(DEFAULT_TTL_SECONDS) ? 3600 : DEFAULT_TTL_SECONDS;
      const csrfToken = await generateCsrfToken(sessionId, redis, ttl);

      res.status(200).json({ csrfToken });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```