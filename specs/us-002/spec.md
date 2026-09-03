# Spec: US-002 — CSRF Token Validation

## User Story
**As** an authenticated user interacting with the profile page,  
**I want** all state-changing form submissions and API requests to include a valid CSRF token,  
**So that** the platform is protected against Cross-Site Request Forgery attacks where a malicious third-party site could trigger unintended actions on my behalf.

---

## Background & Motivation
Cross-Site Request Forgery (CSRF) is an attack where a malicious website causes a user's browser to make an authenticated request to the target application without the user's knowledge. Because browsers automatically attach session cookies to cross-origin requests, any state-changing endpoint that relies solely on cookie-based authentication is vulnerable. A CSRF token — an unpredictable value tied to the user's session — breaks this attack by requiring knowledge the attacker cannot obtain.

The existing application uses session-based authentication (see `SessionRepository`, `DefaultSessionService`). All POST endpoints (profile updates, password changes, account deletion requests, etc.) are therefore potentially vulnerable without CSRF protection.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Given an authenticated user, when a POST request is made **with** a valid, unexpired CSRF token (matching the session), then the server processes the request normally and returns the expected success response. |
| AC-2 | Given an authenticated user, when a POST request is made **without** a CSRF token header/field, then the server returns HTTP **403 Forbidden** with error code `CSRF_TOKEN_MISSING`. |
| AC-3 | Given an authenticated user, when a POST request is made with an **invalid or tampered** CSRF token, then the server returns HTTP **403 Forbidden** with error code `CSRF_TOKEN_INVALID`. |
| AC-4 | Given any user (authenticated or not), when a GET, HEAD, or OPTIONS request is made, then CSRF validation is **not** performed and the request proceeds normally. |
| AC-5 | Given an authenticated user, when a PUT, PATCH, or DELETE request is made without a valid CSRF token, then the server returns HTTP **403 Forbidden**. |
| AC-6 | A dedicated endpoint `GET /api/v1/csrf-token` exists that returns a fresh CSRF token for the current session, and this token is accepted on subsequent state-changing requests. |
| AC-7 | CSRF tokens are cryptographically random, at least 32 bytes in length, and are bound to the user's session identifier. |
| AC-8 | The frontend automatically attaches the CSRF token as the `X-CSRF-Token` request header on all POST, PUT, PATCH, and DELETE requests. |
| AC-9 | CSRF tokens are never included in server-side logs. |

---

## Out of Scope
- Replacing or modifying the existing session management system beyond what is needed to bind CSRF tokens to sessions.
- CSRF protection for third-party OAuth flows or webhook endpoints (these use separate authentication mechanisms).
- Mobile/native app clients (CSRF is a browser-specific attack vector; API key or JWT bearer clients are excluded).
- Rate-limiting of the `GET /api/v1/csrf-token` endpoint (addressed in a separate rate-limiting story).
- Changes to the registration or activation flows (pre-authentication endpoints do not require CSRF protection).

---

## Cross-Service Dependencies
| Dependency | Nature |
|------------|--------|
| `DefaultSessionService` / `SessionRepository` | CSRF tokens must be looked up against the active session; session must be valid before CSRF is checked. |
| `BACKEND/src/app.ts` | Middleware registration point for the CSRF validation middleware. |
| `BACKEND/src/routes/*` | All state-changing routes must be protected; no route-level bypass is permitted except those explicitly listed as safe methods. |
| `FRONTEND/src/` API client | Must be updated to fetch and attach the CSRF token on state-changing requests. |
| `BACKEND/.env.example` | New `CSRF_SECRET` environment variable must be documented. |
| `DOCS/API_REFERENCE.md` | New endpoint and error codes must be documented. |

---

## Error Response Contract
All CSRF failures return:
```json
{
  "errorCode": "CSRF_TOKEN_MISSING" | "CSRF_TOKEN_INVALID",
  "message": "<human-readable description>"
}
```
HTTP status: **403 Forbidden**