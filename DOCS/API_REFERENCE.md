# API Reference

**Base URL:** `/api/v1`

All request and response bodies use `application/json` unless otherwise noted.

---

## Table of Contents

1. [Authentication](#authentication)
2. [CSRF Protection](#csrf-protection)
3. [Endpoints](#endpoints)
   - [Health](#health)
   - [Registration](#registration)
   - [Activation](#activation)
   - [Authentication](#authentication-endpoints)
   - [CSRF Token](#csrf-token)
   - [User Profile](#user-profile)
   - [Password Management](#password-management)
   - [Account Deletion](#account-deletion)
   - [OTP](#otp)
   - [Admin](#admin)
4. [Error Codes](#error-codes)

---

## Authentication

Most endpoints require an active session. Sessions are established via `POST /api/v1/auth/login` and maintained through an HTTP-only session cookie (`connect.sid` or equivalent) set by the server.

Protected endpoints return **401 Unauthorized** when no valid session cookie is present.

---

## CSRF Protection

### Overview

All **state-changing requests** (POST, PUT, PATCH, DELETE) must include a valid CSRF token to protect against Cross-Site Request Forgery attacks. The server validates this token against the one bound to your current session.

Safe methods (GET, HEAD, OPTIONS) are **exempt** from CSRF validation.

### Request Header Requirement

Include the following header on every POST, PUT, PATCH, and DELETE request:

```
X-CSRF-Token: <token>
```

Where `<token>` is the value obtained from `GET /api/v1/csrf-token`.

**Example:**

```http
POST /api/v1/user/profile HTTP/1.1
Content-Type: application/json
X-CSRF-Token: a3f9c2e1b4d78056a3f9c2e1b4d78056a3f9c2e1b4d78056a3f9c2e1b4d78056

{ "displayName": "Jane Doe" }
```

### Usage Flow

1. **Fetch the token** — On page load (or after login), call `GET /api/v1/csrf-token` with your session cookie. The server generates a cryptographically random token, binds it to your session, and returns it.
2. **Store in memory** — Keep the token in a JavaScript variable. Do **not** persist it to `localStorage` or `sessionStorage`.
3. **Attach the header** — Include `X-CSRF-Token: <token>` on every POST, PUT, PATCH, and DELETE request.
4. **Refresh on 403** — If a state-changing request returns HTTP 403 with error code `CSRF_TOKEN_MISSING` or `CSRF_TOKEN_INVALID`, re-fetch a fresh token from `GET /api/v1/csrf-token` and retry the original request once.

**Sequence:**

```
Client                          Server
  |                               |
  |-- GET /api/v1/csrf-token ---->|
  |<-- 200 { csrfToken: "..." } --|
  |                               |
  | (store token in memory)       |
  |                               |
  |-- POST /api/v1/... ---------->|
  |   X-CSRF-Token: <token>       |
  |<-- 200 OK --------------------|
  |                               |
  | (if 403 CSRF error received)  |
  |-- GET /api/v1/csrf-token ---->|  ← refresh
  |<-- 200 { csrfToken: "..." } --|
  |-- POST /api/v1/... (retry) -->|
  |   X-CSRF-Token: <new token>   |
  |<-- 200 OK --------------------|
```

---

## Endpoints

### Health

#### `GET /api/v1/health`

Returns the operational status of the service.

**Authentication:** Not required

**Response 200:**

```json
{
  "status": "ok"
}
```

---

### Registration

#### `POST /api/v1/auth/register`

Registers a new user account. Sends an activation email upon success.

**Authentication:** Not required

**Request Body:**

```json
{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "S3cure!Pass"
}
```

**Response 201:**

```json
{
  "message": "Registration successful. Please check your email to activate your account."
}
```

**Response 409 — `USERNAME_CONFLICT`:**

```json
{
  "errorCode": "USERNAME_CONFLICT",
  "message": "A user with that username already exists."
}
```

**Response 422 — `VALIDATION_ERROR`:**

```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "Password must be at least 8 characters."
}
```

---

### Activation

#### `GET /api/v1/auth/activate`

Activates a registered account using a token sent via email.

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| `token`   | string | Yes      | Activation token from email |

**Response 200:**

```json
{
  "message": "Account activated successfully."
}
```

**Response 404 — `TOKEN_NOT_FOUND`:**

```json
{
  "errorCode": "TOKEN_NOT_FOUND",
  "message": "Activation token not found."
}
```

**Response 410 — `TOKEN_EXPIRED`:**

```json
{
  "errorCode": "TOKEN_EXPIRED",
  "message": "Activation token has expired."
}
```

**Response 410 — `TOKEN_CONSUMED`:**

```json
{
  "errorCode": "TOKEN_CONSUMED",
  "message": "Activation token has already been used."
}
```

---

### Authentication Endpoints

#### `POST /api/v1/auth/login`

Authenticates a user and creates a session.

**Authentication:** Not required

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "email": "jane@example.com",
  "password": "S3cure!Pass"
}
```

**Response 200:**

```json
{
  "message": "Login successful."
}
```

Sets an HTTP-only session cookie on success.

**Response 401 — `INVALID_CREDENTIALS`:**

```json
{
  "errorCode": "INVALID_CREDENTIALS",
  "message": "Invalid email or password."
}
```

**Response 403 — `ACCOUNT_NOT_ACTIVE`:**

```json
{
  "errorCode": "ACCOUNT_NOT_ACTIVE",
  "message": "Account is not active (current status: 'pending')."
}
```

**Response 429 — `ACCOUNT_LOCKED`:**

```json
{
  "errorCode": "ACCOUNT_LOCKED",
  "message": "Too many failed login attempts. Try again later."
}
```

---

#### `POST /api/v1/auth/logout`

Invalidates the current session.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Response 200:**

```json
{
  "message": "Logged out successfully."
}
```

**Response 401 — `UNAUTHORIZED`:**

```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "No active session found."
}
```

---

### CSRF Token

#### `GET /api/v1/csrf-token`

Generates and returns a fresh CSRF token bound to the current session. The returned token must be included as the `X-CSRF-Token` header on all subsequent state-changing requests (POST, PUT, PATCH, DELETE).

**Authentication:** Required (active session cookie)

**Request Headers:**

| Header        | Required | Description                        |
|---------------|----------|------------------------------------|
| `Cookie`      | Yes      | Active session cookie              |

**Request Body:** None

**Response Schema:**

```json
{
  "csrfToken": "<hex string, 64 characters>"
}
```

| Field       | Type   | Description                                                    |
|-------------|--------|----------------------------------------------------------------|
| `csrfToken` | string | Cryptographically random 64-character hex string (32 bytes).  |

**Response 200 — Success:**

```json
{
  "csrfToken": "a3f9c2e1b4d78056a3f9c2e1b4d78056a3f9c2e1b4d78056a3f9c2e1b4d78056"
}
```

**Response 401 — `UNAUTHORIZED`:**

Returned when no valid session cookie is present.

```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "Authentication required. Please log in."
}
```

**Notes:**

- This endpoint is exempt from CSRF validation (it is a GET request).
- Each call generates a new token and replaces any previously issued token for the session. Store only the most recent token.
- Tokens are cryptographically random, at least 32 bytes in length, and are bound to the authenticated session identifier. A token from one session is never accepted for another session.
- Tokens are never written to server-side logs.

---

### User Profile

#### `GET /api/v1/user/profile`

Returns the profile information for the authenticated user.

**Authentication:** Required (active session cookie)

**Response 200:**

```json
{
  "id": "usr_01HZ3K2X",
  "username": "jane_doe",
  "email": "jane@example.com",
  "displayName": "Jane Doe",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Response 401 — `UNAUTHORIZED`:**

```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "Authentication required. Please log in."
}
```

---

#### `PUT /api/v1/user/profile`

Updates the profile information for the authenticated user.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "displayName": "Jane Doe"
}
```

**Response 200:**

```json
{
  "message": "Profile updated successfully."
}
```

**Response 401 — `UNAUTHORIZED`:**

```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "Authentication required. Please log in."
}
```

**Response 403 — `CSRF_TOKEN_MISSING`:**

```json
{
  "errorCode": "CSRF_TOKEN_MISSING",
  "message": "CSRF token is missing. Include the X-CSRF-Token header."
}
```

---

### Password Management

#### `POST /api/v1/password/change`

Changes the password for the authenticated user.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "currentPassword": "S3cure!Pass",
  "newPassword": "N3wS3cure!Pass"
}
```

**Response 200:**

```json
{
  "message": "Password changed successfully."
}
```

**Response 401 — `INVALID_CREDENTIALS`:**

```json
{
  "errorCode": "INVALID_CREDENTIALS",
  "message": "Current password is incorrect."
}
```

**Response 422 — `VALIDATION_ERROR`:**

```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "New password does not meet policy requirements."
}
```

---

#### `POST /api/v1/password/recovery/request`

Initiates the password recovery flow by sending a recovery email.

**Authentication:** Not required

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "email": "jane@example.com"
}
```

**Response 200:**

```json
{
  "message": "If an account exists for that email address, a recovery link has been sent."
}
```

---

#### `POST /api/v1/password/recovery/reset`

Resets the password using a token received via email.

**Authentication:** Not required

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "token": "<recovery-token>",
  "newPassword": "N3wS3cure!Pass"
}
```

**Response 200:**

```json
{
  "message": "Password reset successfully."
}
```

**Response 410 — `TOKEN_EXPIRED`:**

```json
{
  "errorCode": "TOKEN_EXPIRED",
  "message": "Password recovery token has expired."
}
```

---

### Account Deletion

#### `POST /api/v1/account/deletion/request`

Submits a request to delete the authenticated user's account.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Response 200:**

```json
{
  "message": "Account deletion request submitted. You will receive a confirmation email."
}
```

**Response 409 — `DELETION_REQUEST_ALREADY_PENDING`:**

```json
{
  "errorCode": "DELETION_REQUEST_ALREADY_PENDING",
  "message": "An account deletion request is already pending."
}
```

---

#### `DELETE /api/v1/account`

Permanently deletes the authenticated user's account.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Response 200:**

```json
{
  "message": "Account deleted successfully."
}
```

---

### OTP

#### `POST /api/v1/otp/send`

Sends a one-time password to the authenticated user's registered email address.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Response 200:**

```json
{
  "message": "OTP sent successfully."
}
```

**Response 429 — `OTP_RATE_LIMIT_EXCEEDED`:**

```json
{
  "errorCode": "OTP_RATE_LIMIT_EXCEEDED",
  "message": "Too many OTP requests. Please wait before requesting another."
}
```

---

#### `POST /api/v1/otp/verify`

Verifies a one-time password submitted by the authenticated user.

**Authentication:** Required (active session cookie)

**CSRF Token:** Required (`X-CSRF-Token` header)

**Request Body:**

```json
{
  "otp": "123456"
}
```

**Response 200:**

```json
{
  "message": "OTP verified successfully."
}
```

**Response 401 — `OTP_INVALID`:**

```json
{
  "errorCode": "OTP_INVALID",
  "message": "The submitted OTP is incorrect."
}
```

**Response 410 — `OTP_EXPIRED`:**

```json
{
  "errorCode": "OTP_EXPIRED",
  "message": "The OTP has expired. Please request a new one."
}
```

---

### Admin

#### `GET /api/v1/admin/users`

Returns a paginated list of all registered users.

**Authentication:** Required (Bearer token — `Authorization: Bearer <ADMIN_BEARER_TOKEN>`)

**Response 200:**

```json
{
  "users": [
    {
      "id": "usr_01HZ3K2X",
      "username": "jane_doe",
      "email": "jane@example.com",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

**Response 401 — `UNAUTHORIZED`:**

```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "Valid admin bearer token required."
}
```

---

## Error Codes

The following table lists all error codes returned by the API, the HTTP status code associated with each, and a description of when it is returned.

| Error Code                            | HTTP Status | Description                                                                                                        |
|---------------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------|
| `VALIDATION_ERROR`                    | 422         | The request body failed validation (missing required field, invalid format, value out of range, etc.).             |
| `USERNAME_CONFLICT`                   | 409         | A user with the given username already exists.                                                                     |
| `TOKEN_NOT_FOUND`                     | 404         | The supplied token (activation, recovery, etc.) does not exist.                                                    |
| `TOKEN_EXPIRED`                       | 410         | The supplied token exists but has passed its expiry time.                                                          |
| `TOKEN_CONSUMED`                      | 410         | The supplied token has already been used and cannot be reused.                                                     |
| `ACCOUNT_NOT_PENDING`                 | 409         | An activation was attempted for an account that is no longer in `pending` state.                                   |
| `DUPLICATE_DISPATCH`                  | 409         | A duplicate email dispatch was attempted within the debounce window.                                               |
| `INVALID_CREDENTIALS`                 | 401         | The supplied email/password combination is incorrect, or the current password provided during a change is wrong.   |
| `ACCOUNT_NOT_ACTIVE`                  | 403         | Login was attempted against an account that is not in `active` state.                                              |
| `ACCOUNT_LOCKED`                      | 429         | The account has been temporarily locked after too many consecutive failed login attempts.                          |
| `SESSION_NOT_FOUND`                   | 401         | The session referenced by the cookie does not exist or has been invalidated.                                       |
| `SESSION_EXPIRED`                     | 401         | The session exists but has passed its expiry time.                                                                 |
| `UNAUTHORIZED`                        | 401         | No valid session or bearer token was present on a request that requires authentication.                            |
| `CSRF_TOKEN_MISSING`                  | 403         | A state-changing request (POST, PUT, PATCH, or DELETE) was received without an `X-CSRF-Token` header.             |
| `CSRF_TOKEN_INVALID`                  | 403         | The `X-CSRF-Token` header was present but the value does not match the token bound to the current session, or the token has been tampered with. |
| `OTP_RATE_LIMIT_EXCEEDED`             | 429         | The user has requested too many OTPs within the configured rate-limit window.                                      |
| `OTP_NOT_FOUND`                       | 404         | No active OTP request was found for the user.                                                                      |
| `OTP_EXPIRED`                         | 410         | The OTP exists but has passed its TTL.                                                                             |
| `OTP_INVALID`                         | 401         | The submitted OTP value does not match the stored value.                                                           |
| `DELETION_REQUEST_ALREADY_PENDING`    | 409         | An account deletion request is already pending for this user.                                                      |
| `DELETION_REQUEST_NOT_FOUND`          | 404         | No pending deletion request was found for this user.                                                               |
| `PASSWORD_POLICY_VIOLATION`           | 422         | The new password does not satisfy the password policy (length, complexity, etc.).                                  |
| `USER_NOT_FOUND`                      | 404         | The referenced user account could not be found.                                                                    |

### CSRF Error Response Examples

**`CSRF_TOKEN_MISSING` (HTTP 403):**

Returned when a POST, PUT, PATCH, or DELETE request is made without the `X-CSRF-Token` header.

```json
{
  "errorCode": "CSRF_TOKEN_MISSING",
  "message": "CSRF token is missing. Include the X-CSRF-Token header."
}
```

**`CSRF_TOKEN_INVALID` (HTTP 403):**

Returned when the `X-CSRF-Token` header is present but the value is incorrect, expired, or has been tampered with.

```json
{
  "errorCode": "CSRF_TOKEN_INVALID",
  "message": "CSRF token is invalid or does not match the current session."
}
```

---

## General Notes

### Response Format

All API responses use `application/json`. Successful responses include the relevant data or a `message` field. Error responses always include:

```json
{
  "errorCode": "<ERROR_CODE>",
  "message": "<Human-readable description>"
}
```

### Date/Time Format

All timestamps are returned as ISO 8601 strings in UTC: `"2024-01-15T10:30:00.000Z"`.

### Versioning

All endpoints are prefixed with `/api/v1`. Breaking changes will be introduced under a new version prefix (e.g., `/api/v2`).