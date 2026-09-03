# Tasks: US-003 — Rate Limiting for Password Changes

## BACKEND — Configuration & Domain Errors

- [ ] Create `BACKEND/src/config/password-change-rate-limit.config.ts`: implement `PasswordChangeRateLimitConfig` interface with `maxAttempts` (env: `PASSWORD_CHANGE_RATE_LIMIT_MAX`, default `5`) and `windowSeconds` (env: `PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS`, default `900`), following the `lockout.config.ts` `parsePositiveInt` + `Object.freeze` pattern
- [ ] Create `BACKEND/src/errors/password-change.errors.ts`: add `PasswordChangeRateLimitExceededException` class extending `Error` with a `retryAfterSeconds` property and `code = 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED'`

## BACKEND — Middleware Implementation

- [ ] Create `BACKEND/src/middleware/password-change-rate-limit.middleware.ts`: implement `createPasswordChangeRateLimitMiddleware(redis: Redis)` factory that returns an Express `RequestHandler`; on each call it increments `password_change_rate_limit:{userId}` in Redis, sets TTL on first increment, and throws `PasswordChangeRateLimitExceededException` (with computed `retryAfterSeconds`) when the counter exceeds `maxAttempts`; implement fail-open on Redis errors
- [ ] Create `BACKEND/src/middleware/password-change-rate-limit.middleware.test.ts`: write unit tests covering (a) request under the limit passes through, (b) request at the limit (5th) passes through, (c) request over the limit returns 429 with correct error code and `Retry-After`, (d) Redis failure allows request through (fail-open), (e) counters are isolated per user ID

## BACKEND — Route Wiring

- [ ] Modify `BACKEND/src/routes/password.routes.ts`: import and apply `createPasswordChangeRateLimitMiddleware` to the change-password route handler (confirm the exact route path from the existing file before applying); pass the shared Redis client instance received via the router factory
- [ ] Modify `BACKEND/src/app.ts`: add an error-handler branch for `PasswordChangeRateLimitExceededException` that responds with HTTP 429, JSON body `{ errorCode, message, retryAfterSeconds }`, and sets the `Retry-After` response header to `err.retryAfterSeconds`

## BACKEND — Environment & Documentation

- [ ] Modify `BACKEND/.env.example`: add commented entries for `PASSWORD_CHANGE_RATE_LIMIT_MAX=5` and `PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS=900` with a brief description of each
- [ ] Modify `BACKEND/openapi.yaml`: add a `429` response object to the change-password endpoint definition, including `errorCode`, `message`, `retryAfterSeconds` in the schema and a `Retry-After` header entry
- [ ] Modify `DOCS/openapi.yaml`: mirror the same `429` response addition made to `BACKEND/openapi.yaml`
- [ ] Modify `DOCS/API_REFERENCE.md`: document the `429 PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED` response, the `Retry-After` header semantics, and the two new environment variables

## BACKEND — Integration Test

- [ ] Create `BACKEND/src/routes/__tests__/password-rate-limit.integration.test.ts`: write an integration test that mounts the Express app with a mock/test Redis, sends 6 sequential change-password requests as the same authenticated user, and asserts the first 5 return 2xx and the 6th returns 429 with the expected body and `Retry-After` header