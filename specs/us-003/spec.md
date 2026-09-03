# Spec: US-003 — Rate Limiting for Password Changes

## Story Narrative

As an authenticated user of the User Management System,  
I want the system to enforce a rate limit on password change requests,  
So that brute-force credential-stuffing and automated abuse of the change-password endpoint are prevented.

## Background

The existing system already uses Redis-backed rate limiting for OTP dispatch (see `otp.config.ts`) and Redis-backed account lockout for login (see `lockout.config.ts`). This story extends the same pattern to the password-change flow, ensuring consistency across all sensitive mutation endpoints.

## Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | An authenticated user has made **fewer than 5** password change attempts within the current 15-minute window | They submit a valid change-password request | The request is processed normally (password updated, 200 OK returned) |
| AC-2 | An authenticated user has made **exactly 5** password change attempts within the current 15-minute window | They submit a 5th valid change-password request | The 5th request is processed normally (password updated, 200 OK returned) — the limit is inclusive |
| AC-3 | An authenticated user has already made **5** password change attempts within the current 15-minute window | They submit a 6th (or subsequent) change-password request | The system returns **HTTP 429** with `errorCode: PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED`, a human-readable `message`, and a `Retry-After` header indicating seconds until the window resets |
| AC-4 | 15 minutes have elapsed since the user's first password change attempt | The user submits another change-password request | The counter resets and the request is processed normally |
| AC-5 | A Redis connectivity failure occurs during the rate-limit check | The user submits a change-password request | The system logs the error and processes the request normally (fail-open — availability over strict enforcement during infra failure) |
| AC-6 | Two different authenticated users each make 5 password change attempts | One user's limit is reached | The other user's quota is unaffected (counters are scoped per user ID) |

## Rate-Limit Parameters

| Parameter | Value | Environment Variable | Default |
|-----------|-------|---------------------|---------|
| Maximum attempts | 5 | `PASSWORD_CHANGE_RATE_LIMIT_MAX` | `5` |
| Window duration | 15 minutes (900 seconds) | `PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS` | `900` |

## Out of Scope

- Rate limiting on **password reset** (forgotten-password flow) — covered separately
- IP-based rate limiting — this story scopes to per-user-ID only
- Persisting rate-limit events to SQLite — Redis TTL-expiry is sufficient
- UI/frontend changes to display the 429 error — the frontend already handles API error codes generically; a dedicated UX story can follow
- Sending email notification on rate limit hit — out of scope for this story
- Admin override/unlock endpoint — out of scope

## Cross-Service Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| Redis (`ioredis`) | Runtime | Already provisioned in `server.ts`; the same `otpRedisClient` instance or a dedicated client may be used |
| Password change route/controller | Internal | The existing `BACKEND/src/routes/password.routes.ts` and its controller must be identified and modified |
| Session/auth middleware | Internal | The authenticated user's ID must be extractable from `req` (already established by existing auth middleware) |
| `app.ts` error handler | Internal | Must be extended to map `PasswordChangeRateLimitExceededException` → 429 |