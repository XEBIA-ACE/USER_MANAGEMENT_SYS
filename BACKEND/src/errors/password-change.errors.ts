```typescript
/**
 * password-change.errors.ts
 *
 * Domain error classes for the password-change rate-limiting feature.
 *
 * Story reference: US-003
 * Requirements: AC-3
 */

/**
 * Thrown by the password-change rate-limit middleware when an authenticated
 * user has exceeded the maximum number of allowed password-change attempts
 * within the current sliding window.
 *
 * Callers should map this to HTTP 429 with a `Retry-After` header.
 */
export class PasswordChangeRateLimitExceededException extends Error {
  public readonly code = 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED' as const;
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Too many password change attempts. Please try again later.');
    this.name = 'PasswordChangeRateLimitExceededException';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, PasswordChangeRateLimitExceededException.prototype);
  }
}
```