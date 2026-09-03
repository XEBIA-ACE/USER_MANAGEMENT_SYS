```typescript
/**
 * password.routes.ts
 *
 * Defines routes for password-related operations:
 *   - PATCH /me/password  — change password for the authenticated user
 *
 * The rate-limit middleware (US-003) is applied before the controller handler
 * to prevent brute-force credential-stuffing on the change-password endpoint.
 *
 * Requirements: US-003 AC-1 through AC-6
 */

import { Router } from 'express';
import { Redis } from 'ioredis';
import { createPasswordChangeRateLimitMiddleware } from '../middleware/password-change-rate-limit.middleware';
import { PasswordController } from '../controllers/password.controller';
import { PasswordService } from '../services/password.service';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { requireAuth } from '../middleware/auth.middleware';
import type { Database } from 'better-sqlite3';

/**
 * Creates the password router with all password-related routes.
 *
 * @param db    - The shared SQLite database instance
 * @param redis - The shared Redis client instance used for rate limiting
 * @returns     Configured Express Router
 */
export function createPasswordRouter(db: Database, redis: Redis): Router {
  const router = Router();

  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(db);
  const passwordService = new PasswordService(userRepository, sessionRepository);
  const passwordController = new PasswordController(passwordService);

  const passwordChangeRateLimit = createPasswordChangeRateLimitMiddleware(redis);

  // PATCH /api/v1/users/me/password — change authenticated user's password
  router.patch(
    '/me/password',
    requireAuth,
    passwordChangeRateLimit,
    passwordController.changePassword.bind(passwordController),
  );

  return router;
}
```

> **Note:** The exact internal imports (`PasswordController`, `PasswordService`, `UserRepository`, `SessionRepository`, `requireAuth`) are inferred from the project's established patterns. If the existing `password.routes.ts` uses different controller/service names or constructor signatures, those references should be updated to match the actual file. The critical changes for this task are:
> 1. The `redis: Redis` parameter added to `createPasswordRouter`
> 2. The `createPasswordChangeRateLimitMiddleware` import and instantiation
> 3. The `passwordChangeRateLimit` middleware inserted before the controller handler in the route chain