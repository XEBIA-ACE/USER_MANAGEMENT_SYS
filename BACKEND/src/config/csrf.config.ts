```typescript
/**
 * csrf.config.ts
 *
 * Loads CSRF-feature configuration from environment variables and exports a
 * strongly-typed `csrfConfig` object.
 *
 * Fail-fast: CSRF_SECRET must be present and non-empty — the application
 * will not start without it. This follows the `requireEnvString` pattern
 * established in app.config.ts.
 *
 * Requirements: US-002
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsrfConfig {
  /** HMAC-SHA256 secret used to hash CSRF tokens before storage. Never log. */
  csrfSecret: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnvString(envKey: string): string {
  const value = process.env[envKey];
  if (!value || value.trim() === '') {
    throw new Error(
      `Configuration error: required environment variable '${envKey}' is absent or empty.`,
    );
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Load values
// ---------------------------------------------------------------------------

const csrfSecret = requireEnvString('CSRF_SECRET');

// ---------------------------------------------------------------------------
// Exported config object
// ---------------------------------------------------------------------------

export const csrfConfig: CsrfConfig = Object.freeze({
  csrfSecret,
});
```