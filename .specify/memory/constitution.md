# Constitution: Quality Principles & Architecture Guardrails

## Coding Standards

### Language & Runtime
- TypeScript (strict mode) throughout the backend; no `any` types unless unavoidable and explicitly justified
- All new files must have a JSDoc header block citing the story reference (US-003) and relevant functional requirements
- ESLint config (`eslint.config.mjs`) must pass with zero new violations
- All imports use the project's established path aliases and module resolution patterns

### Architecture Principles
- **Hexagonal / Ports-and-Adapters**: rate-limiting logic lives in a service or middleware layer — never in controllers directly
- **Config-driven**: all thresholds (max attempts, window duration) are environment-variable-backed with sensible defaults, following the exact pattern of `lockout.config.ts` and `otp.config.ts`
- **Never throws across boundaries**: service methods return typed results or throw domain errors that are caught and mapped to HTTP status codes in the app-level error handler (`app.ts`)
- **Redis for distributed state**: rate-limit counters must use the existing `ioredis` Redis client (already wired in `server.ts` and `app.ts`) — no in-memory counters allowed in production paths
- **Zero new runtime dependencies** unless Redis sliding-window primitives are insufficient (justify in PR)

### Error Handling
- Introduce a new domain error class `PasswordChangeRateLimitExceededException` in the existing errors directory
- Map this error to HTTP **429 Too Many Requests** with `errorCode: PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED` in `app.ts`
- Include a `Retry-After` header (seconds until window resets) on 429 responses

### Testing
- Unit tests must cover: under limit (allowed), at limit boundary (allowed), over limit (rejected), window expiry (counter resets)
- Integration tests must cover the full HTTP path using a real or mock Redis instance
- Tests co-located with source (`*.test.ts`) following `jest.config.ts` conventions
- Coverage gate: new code must not decrease overall coverage

### Security
- Rate-limit key is scoped per authenticated user ID — never per IP alone, to avoid collateral blocking
- The user ID used as the key must come from the verified session/JWT, not from the request body
- Redis keys must expire automatically (TTL set equal to the window) to prevent unbounded key growth

### Non-Functional Requirements
- P99 latency overhead of rate-limit check must be < 5 ms (Redis INCR + EXPIRE is O(1))
- Redis connection failures must be handled gracefully: log the error and **allow** the request through (fail-open) rather than blocking all password changes
- No sensitive data (passwords, tokens) in Redis keys or log output

### Documentation
- Update `DOCS/API_REFERENCE.md` and `BACKEND/openapi.yaml` / `DOCS/openapi.yaml` with the 429 response for the change-password endpoint
- Update `BACKEND/.env.example` with the two new env vars