```typescript
/**
 * csrf.errors.ts
 *
 * Custom domain error classes for CSRF Token Validation (US-002).
 * All errors extend the built-in Error class so they are instanceof-compatible
 * with standard JS error handling, matching the convention established in
 * registration.errors.ts and login.errors.ts.
 *
 * Requirements: US-002 AC-2, AC-3
 */

/**
 * Thrown when a state-changing request arrives without an X-CSRF-Token header.
 */
export class CsrfTokenMissingError extends Error {
  public readonly errorCode = 'CSRF_TOKEN_MISSING' as const;

  constructor() {
    super('CSRF token is missing. Please include the X-CSRF-Token header.');
    this.name = 'CsrfTokenMissingError';
    Object.setPrototypeOf(this, CsrfTokenMissingError.prototype);
  }
}

/**
 * Thrown when a state-changing request arrives with an X-CSRF-Token header
 * that does not match the stored token for the current session (invalid,
 * tampered, or expired).
 */
export class CsrfTokenInvalidError extends Error {
  public readonly errorCode = 'CSRF_TOKEN_INVALID' as const;

  constructor() {
    super('CSRF token is invalid or has expired. Please request a new token.');
    this.name = 'CsrfTokenInvalidError';
    Object.setPrototypeOf(this, CsrfTokenInvalidError.prototype);
  }
}
```