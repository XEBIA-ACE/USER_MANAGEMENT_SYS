# Constitution: Quality Principles & Architecture Guardrails

## Security Standards
- CSRF tokens must be cryptographically random (minimum 32 bytes, generated via `crypto.randomBytes` or equivalent).
- Tokens must be bound to the user's session — a token from one session must never be accepted for another.
- Token comparison must use a constant-time comparison function to prevent timing attacks.
- CSRF tokens must NEVER be logged, stored in plaintext beyond their session lifecycle, or exposed in API responses other than the dedicated token-generation endpoint.
- All CSRF secrets and configuration values must follow the existing `requireEnvString` / fail-fast pattern established in `app.config.ts`.

## Architecture Guardrails
- Follow the existing layered architecture: config → middleware → routes → controllers → services.
- New middleware must be registered in `BACKEND/src/app.ts` using the same Express middleware chain pattern already present.
- No new top-level dependencies may be introduced without justification; prefer the existing `express` ecosystem (`csurf` is deprecated — implement a custom double-submit cookie or synchronizer token pattern using Node `crypto`).
- All new files must use TypeScript with strict mode enabled (`tsconfig.json` already enforces this).
- Error handling must integrate with the existing `createAppErrorHandler` in `app.ts`.

## Coding Standards
- TypeScript strict mode: no `any` types, no non-null assertions without justification.
- Every new source file must include a JSDoc header with Requirements reference (e.g., `Requirements: US-002`).
- Unit tests live in `BACKEND/src/**/__tests__/*.test.ts` or alongside source as `*.test.ts`.
- Test files must set required `process.env` variables before any imports, following the pattern in `email-otp-delivery.adapter.test.ts`.
- Minimum test coverage: happy path, missing token (403), invalid/tampered token (403), expired token (403).

## Non-Functional Requirements
- CSRF middleware must add negligible latency (<5 ms overhead per request).
- The middleware must be idempotent — safe methods (GET, HEAD, OPTIONS) must be exempt from CSRF validation.
- The solution must not break existing routes; all existing integration and unit tests must continue to pass.
- Configuration must be environment-variable driven, consistent with all other config modules.

## Frontend Standards
- The CSRF token must be fetched once per page load and attached to all state-changing requests via a request header (e.g., `X-CSRF-Token`) or form field.
- The frontend API client must be updated to automatically include the CSRF token on POST/PUT/PATCH/DELETE requests.
- React components must not store CSRF tokens in `localStorage` or `sessionStorage` — use an in-memory variable or HTTP-only cookie approach.