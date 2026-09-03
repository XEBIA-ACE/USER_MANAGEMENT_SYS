```typescript
/**
 * password-change-rate-limit.config.ts
 *
 * Loads password-change rate-limit configuration from environment variables
 * and exports a strongly-typed `passwordChangeRateLimitConfig` object.
 *
 * Follows the exact pattern established by `lockout.config.ts`.
 *
 * Story reference: US-003
 * Requirements: AC-1, AC-2, AC-3, AC-4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PasswordChangeRateLimitConfig {
  /** Maximum number of password-change attempts allowed within the window. */
  maxAttempts: number;
  /** Sliding-window duration in seconds. */
  windowSeconds: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(envKey: string, defaultValue: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Configuration error: ${envKey} must be an integer, got '${raw}'.`,
    );
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Load and validate
// ---------------------------------------------------------------------------

const maxAttempts = parsePositiveInt('PASSWORD_CHANGE_RATE_LIMIT_MAX', 5);
const windowSeconds = parsePositiveInt('PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS', 900);

if (maxAttempts < 1) {
  throw new Error(
    `Configuration error: PASSWORD_CHANGE_RATE_LIMIT_MAX must be >= 1, got ${maxAttempts}.`,
  );
}

if (windowSeconds < 1) {
  throw new Error(
    `Configuration error: PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS must be >= 1, got ${windowSeconds}.`,
  );
}

// ---------------------------------------------------------------------------
// Exported config object
// ---------------------------------------------------------------------------

export const passwordChangeRateLimitConfig: PasswordChangeRateLimitConfig = Object.freeze({
  maxAttempts,
  windowSeconds,
});
```