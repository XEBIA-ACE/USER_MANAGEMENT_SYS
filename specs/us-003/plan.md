# Plan: US-003 — Rate Limiting for Password Changes

## Architecture Decision

The rate-limiting mechanism will follow the **sliding-window counter** pattern already used by the OTP feature, implemented via Redis `INCR` + `EXPIRE`. The implementation is structured as:

1. **Config module** — `BACKEND/src/config/password-change-rate-limit.config.ts` — following the exact pattern of `lockout.config.ts`
2. **Domain error** — `BACKEND/src/errors/password-change.errors.ts` — a new `PasswordChangeRateLimitExceededException` class
3. **Rate-limit service/middleware** — `BACKEND/src/middleware/password-change-rate-limit.middleware.ts` — an Express middleware that reads the authenticated user's ID from the request, checks/increments the Redis counter, and either calls `next()` or throws/responds with 429
4. **Route wiring** — the middleware is applied to the change-password route in `BACKEND/src/routes/password.routes.ts`
5. **Error handler extension** — `BACKEND/src/app.ts` is updated to map `PasswordChangeRateLimitExceededException` to a 429 response with `Retry-After`

## Redis Key Schema

```
password_change_rate_limit:{userId}
```

- Type: integer counter (via `INCR`)
- TTL: set on first increment only (`SET … NX EX <window_seconds>`) or via `EXPIRE` after `INCR` if key is new
- Preferred atomic approach: Lua script or `INCR` followed by conditional `EXPIRE` (check if value === 1)

## API Contract Change

**Endpoint:** `PATCH /api/v1/users/me/password` (or the existing change-password path — to be confirmed from `password.routes.ts`)

**New response — 429 Too Many Requests:**
```json
{
  "errorCode": "PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED",
  "message": "Too many password change attempts. Please try again later.",
  "retryAfterSeconds": 743
}
```

**New response header:**
```
Retry-After: 743
```

## Configuration

New environment variables added to `BACKEND/.env.example`:
```
PASSWORD_CHANGE_RATE_LIMIT_MAX=5
PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS=900
```

## Data Model Changes

No SQLite schema changes required. The rate-limit state is held entirely in Redis with automatic TTL-based expiry.

## Files Changed Per Repository

### `XEBIA-ACE/USER_MANAGEMENT_SYS`

| File | Change Type | Description |
|------|-------------|-------------|
| `BACKEND/src/config/password-change-rate-limit.config.ts` | **Create** | New config module for rate-limit parameters |
| `BACKEND/src/errors/password-change.errors.ts` | **Create** | `PasswordChangeRateLimitExceededException` domain error |
| `BACKEND/src/middleware/password-change-rate-limit.middleware.ts` | **Create** | Express middleware implementing the Redis counter check |
| `BACKEND/src/middleware/password-change-rate-limit.middleware.test.ts` | **Create** | Unit tests for the middleware |
| `BACKEND/src/routes/password.routes.ts` | **Modify** | Wire the rate-limit middleware onto the change-password route |
| `BACKEND/src/app.ts` | **Modify** | Add 429 error mapping for `PasswordChangeRateLimitExceededException` |
| `BACKEND/openapi.yaml` | **Modify** | Add `429` response schema to the change-password endpoint |
| `DOCS/openapi.yaml` | **Modify** | Mirror the same 429 response addition |
| `DOCS/API_REFERENCE.md` | **Modify** | Document the 429 response and `Retry-After` header |
| `BACKEND/.env.example` | **Modify** | Add the two new env vars with defaults and comments |

## Fail-Open Strategy

If `redis.incr()` throws (Redis unavailable), the middleware catches the error, emits a structured `console.error` log, and calls `next()` without blocking the request. This mirrors the OTP delivery fail-open pattern in `EmailOtpDeliveryAdapter`.