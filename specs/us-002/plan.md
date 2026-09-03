# Plan: US-002 — CSRF Token Validation

## Architecture Decision

### Pattern: Synchronizer Token Pattern (Server-Side)
We will implement the **Synchronizer Token Pattern** rather than the Double-Submit Cookie pattern. This is because the application already maintains server-side sessions (`SessionRepository`, `DefaultSessionService`), making it natural to store and validate CSRF tokens server-side, bound to the session. This is the more secure of the two approaches as it does not rely on cookie integrity.

The `csurf` npm package is deprecated and will **not** be used. Instead, a lightweight custom middleware will be built using Node's built-in `crypto` module (`crypto.randomBytes`, `crypto.timingSafeEqual`).

### Token Lifecycle
1. Client calls `GET /api/v1/csrf-token` (authenticated).
2. Server generates a 32-byte random token, stores it hashed (HMAC-SHA256 with `CSRF_SECRET`) alongside the session ID in a Redis key with TTL matching session expiry.
3. Server returns the plaintext token to the client.
4. Client stores the token in memory and sends it as `X-CSRF-Token` header on all subsequent state-changing requests.
5. On each state-changing request, the CSRF middleware: (a) reads `X-CSRF-Token` header, (b) computes HMAC of the provided value, (c) fetches the stored hash for the current session from Redis, (d) compares using `crypto.timingSafeEqual`, (e) rejects with 403 if mismatch or absent.

### Redis Usage
The existing `ioredis` Redis client (already used for OTP, passed into `createApp`) will be reused. CSRF token hashes will be stored under the key `csrf:{sessionId}` with TTL equal to the session expiry.

---

## API Contract

### New Endpoint
```
GET /api/v1/csrf-token
Authorization: Required (active session cookie)
Response 200:
{
  "csrfToken": "<hex string, 64 chars>"
}
Response 401: { "errorCode": "UNAUTHORIZED", "message": "..." }
```

### Modified Endpoints (all state-changing routes)
All POST/PUT/PATCH/DELETE routes now require header:
```
X-CSRF-Token: <token obtained from GET /api/v1/csrf-token>
```
Failure: HTTP 403 `{ "errorCode": "CSRF_TOKEN_MISSING" | "CSRF_TOKEN_INVALID", "message": "..." }`

---

## Files to Create / Modify

### BACKEND
| File | Change |
|------|--------|
| `BACKEND/src/middleware/csrf.middleware.ts` | **New** — implements `generateCsrfToken(session, redis)` and `validateCsrfToken` Express middleware |
| `BACKEND/src/middleware/csrf.middleware.test.ts` | **New** — unit tests for CSRF middleware |
| `BACKEND/src/routes/csrf.routes.ts` | **New** — `GET /api/v1/csrf-token` route handler |
| `BACKEND/src/config/csrf.config.ts` | **New** — loads `CSRF_SECRET` env var using `requireEnvString` pattern |
| `BACKEND/src/app.ts` | **Modify** — register CSRF middleware and csrf route; import new modules |
| `BACKEND/src/errors/csrf.errors.ts` | **New** — `CsrfTokenMissingError`, `CsrfTokenInvalidError` |
| `BACKEND/.env.example` | **Modify** — add `CSRF_SECRET=<32+ char random string>` |

### FRONTEND
| File | Change |
|------|--------|
| `FRONTEND/src/lib/api-client.ts` (or equivalent) | **Modify** — fetch CSRF token on init, attach `X-CSRF-Token` header to all mutating requests |

### DOCS
| File | Change |
|------|--------|
| `DOCS/API_REFERENCE.md` | **Modify** — document `GET /api/v1/csrf-token`, `X-CSRF-Token` header requirement, 403 error codes |

---

## Data Model Changes
No database schema changes required. CSRF token hashes are stored in Redis only (ephemeral, session-scoped).

Redis key format: `csrf:{sessionId}` → `<hmac-sha256 hex of token>`  
TTL: matches `SESSION_EXPIRY_SECONDS` from `session.config.ts`

---

## Integration with Existing Error Handler
Two new error classes (`CsrfTokenMissingError`, `CsrfTokenInvalidError`) will be added and handled in `createAppErrorHandler` in `app.ts`, returning HTTP 403 with the appropriate `errorCode`.