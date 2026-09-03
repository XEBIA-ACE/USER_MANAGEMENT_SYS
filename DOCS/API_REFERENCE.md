# API Reference — User Management System

> **Base URL:** `/api/v1`
> All requests and responses use `Content-Type: application/json` unless otherwise stated.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Registration](#registration)
3. [Account Activation](#account-activation)
4. [Login](#login)
5. [OTP (One-Time Password)](#otp-one-time-password)
6. [Password Management](#password-management)
   - [Change Password](#change-password)
   - [Request Password Recovery](#request-password-recovery)
   - [Reset Password](#reset-password)
7. [User Profile](#user-profile)
8. [Account Deletion](#account-deletion)
9. [Admin](#admin)
10. [Health](#health)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Error Codes Reference](#error-codes-reference)

---

## Authentication

Most endpoints require a valid session token provided as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <session-token>
```

---

## Registration

### `POST /users/register`

Registers a new user account. Sends an activation email upon success.

**Request Body:**

| Field      | Type   | Required | Description                        |
|------------|--------|----------|------------------------------------|
| `email`    | string | Yes      | User's email address               |
| `username` | string | Yes      | Desired username (3–30 characters) |
| `password` | string | Yes      | Password meeting the policy rules  |

**Responses:**

| Status | Error Code          | Description                                             |
|--------|---------------------|---------------------------------------------------------|
| 201    | —                   | Account created; activation email dispatched            |
| 409    | `USERNAME_CONFLICT` | Username is already taken                               |
| 422    | `VALIDATION_ERROR`  | One or more fields failed validation                    |

---

## Account Activation

### `GET /users/activate`

Activates a newly registered account using the token from the activation email.

**Query Parameters:**

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `token`   | string | Yes      | Activation token value |

**Responses:**

| Status | Error Code             | Description                         |
|--------|------------------------|-------------------------------------|
| 200    | —                      | Account activated successfully      |
| 404    | `TOKEN_NOT_FOUND`      | Token does not exist                |
| 409    | `ACCOUNT_NOT_PENDING`  | Account is not in a pending state   |
| 410    | `TOKEN_EXPIRED`        | Token has expired                   |
| 410    | `TOKEN_CONSUMED`       | Token has already been used         |

---

## Login

### `POST /auth/login`

Authenticates a user and creates a session.

**Request Body:**

| Field      | Type   | Required | Description             |
|------------|--------|----------|-------------------------|
| `email`    | string | Yes      | Registered email address|
| `password` | string | Yes      | Account password        |

**Responses:**

| Status | Error Code                  | Description                                               |
|--------|-----------------------------|-----------------------------------------------------------|
| 200    | —                           | Login successful; session token returned                  |
| 401    | `INVALID_CREDENTIALS`       | Email or password is incorrect                            |
| 403    | `ACCOUNT_NOT_ACTIVE`        | Account is not yet activated or has been suspended        |
| 423    | `ACCOUNT_LOCKED`            | Account is temporarily locked due to failed login attempts|
| 500    | `SESSION_CREATION_FAILED`   | Internal error creating the session                       |

---

## OTP (One-Time Password)

### `POST /otp/dispatch`

Dispatches a one-time password to the authenticated user's registered email.

**Headers:** `Authorization: Bearer <session-token>`

**Responses:**

| Status | Error Code                   | Description                                     |
|--------|------------------------------|-------------------------------------------------|
| 200    | —                            | OTP dispatched successfully                     |
| 409    | `DUPLICATE_DISPATCH`         | An OTP was recently dispatched; cooldown active |
| 429    | `OTP_RATE_LIMIT_EXCEEDED`    | Too many OTP requests in the current window     |
| 403    | `OTP_FORBIDDEN`              | Account state does not permit OTP dispatch      |

### `POST /otp/verify`

Verifies a submitted OTP code.

**Headers:** `Authorization: Bearer <session-token>`

**Request Body:**

| Field  | Type   | Required | Description               |
|--------|--------|----------|---------------------------|
| `code` | string | Yes      | The OTP code to verify    |

**Responses:**

| Status | Error Code        | Description                         |
|--------|-------------------|-------------------------------------|
| 200    | —                 | OTP verified successfully           |
| 404    | `OTP_NOT_FOUND`   | No active OTP found for this user   |
| 410    | `OTP_EXPIRED`     | OTP has expired                     |
| 422    | `OTP_INVALID`     | OTP code is incorrect               |

---

## Password Management

### Change Password

#### `PATCH /users/me/password`

Changes the authenticated user's password. Requires the current password to be provided for verification.

> **Rate limit:** Maximum **5 attempts per 15-minute window** per authenticated user.  
> Exceeding this limit returns `429 Too Many Requests`. See [Rate Limiting](#rate-limiting-behaviour) below.

**Headers:** `Authorization: Bearer <session-token>`

**Request Body:**

| Field           | Type   | Required | Description                         |
|-----------------|--------|----------|-------------------------------------|
| `currentPassword` | string | Yes    | The user's existing password        |
| `newPassword`   | string | Yes      | The desired new password            |

**Responses:**

| Status | Error Code                               | Description                                                                                  |
|--------|------------------------------------------|----------------------------------------------------------------------------------------------|
| 200    | —                                        | Password changed successfully                                                                |
| 401    | `INVALID_CREDENTIALS`                    | Current password is incorrect                                                                |
| 422    | `PASSWORD_POLICY_VIOLATION`              | New password does not meet the password policy                                               |
| 429    | `PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED`    | Too many password change attempts in the current window. See rate-limiting details below.    |

**429 Response Body:**

```json
{
  "errorCode": "PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED",
  "message": "Too many password change attempts. Please try again later.",
  "retryAfterSeconds": 743
}
```

| Field               | Type    | Description                                                       |
|---------------------|---------|-------------------------------------------------------------------|
| `errorCode`         | string  | Machine-readable error identifier: `PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED` |
| `message`           | string  | Human-readable explanation                                        |
| `retryAfterSeconds` | integer | Number of seconds until the current rate-limit window expires     |

**429 Response Headers:**

| Header        | Type    | Description                                                                           |
|---------------|---------|---------------------------------------------------------------------------------------|
| `Retry-After` | integer | The number of seconds the client should wait before retrying. This is the remaining time (in whole seconds) until the current 15-minute rate-limit window resets for the authenticated user. For example, a value of `743` means the client may retry in 12 minutes and 23 seconds. |

> **Note on `Retry-After` semantics:** The `Retry-After` header value is an integer representing the number of seconds until the current rate-limit window expires for the specific authenticated user. It is not a fixed backoff — it reflects the actual remaining TTL of the Redis counter associated with the user's session. Once this duration has elapsed, the user's attempt counter resets and they may submit a new change-password request.

#### Rate-Limiting Behaviour

The change-password endpoint enforces a **per-user** sliding-window rate limit:

- **Scope:** Counters are tracked individually per authenticated user ID. One user reaching their limit does not affect any other user's quota.
- **Window:** Each window is **15 minutes** (900 seconds) from the first attempt within that window.
- **Limit:** Up to **5 attempts** are allowed within a single window (inclusive). The 5th attempt is processed normally; only the 6th and subsequent attempts within the same window are rejected.
- **Reset:** After the window duration has elapsed since the first attempt, the counter automatically resets and the user may make further attempts.
- **Fail-open:** If the rate-limit backing store (Redis) is temporarily unavailable, requests are processed normally rather than being blocked. This is logged as an infrastructure error.

---

### Request Password Recovery

#### `POST /users/password-recovery`

Initiates the forgotten-password recovery flow by dispatching a recovery email.

**Request Body:**

| Field   | Type   | Required | Description                              |
|---------|--------|----------|------------------------------------------|
| `email` | string | Yes      | Email address associated with the account|

**Responses:**

| Status | Description                                                                                   |
|--------|-----------------------------------------------------------------------------------------------|
| 200    | Recovery email dispatched (response is identical whether the email exists or not, to prevent account enumeration) |

---

### Reset Password

#### `POST /users/password-reset`

Resets the user's password using a valid recovery token.

**Request Body:**

| Field         | Type   | Required | Description                         |
|---------------|--------|----------|-------------------------------------|
| `token`       | string | Yes      | Password recovery token from email  |
| `newPassword` | string | Yes      | The desired new password            |

**Responses:**

| Status | Error Code                  | Description                              |
|--------|-----------------------------|------------------------------------------|
| 200    | —                           | Password reset successfully              |
| 404    | `TOKEN_NOT_FOUND`           | Recovery token does not exist            |
| 410    | `TOKEN_EXPIRED`             | Recovery token has expired               |
| 410    | `TOKEN_CONSUMED`            | Recovery token has already been used     |
| 422    | `PASSWORD_POLICY_VIOLATION` | New password does not meet policy rules  |

---

## User Profile

### `GET /users/me`

Returns the authenticated user's profile.

**Headers:** `Authorization: Bearer <session-token>`

**Responses:**

| Status | Description                    |
|--------|--------------------------------|
| 200    | User profile returned          |
| 401    | Missing or invalid session     |

---

## Account Deletion

### `POST /users/me/deletion-request`

Requests deletion of the authenticated user's account.

**Headers:** `Authorization: Bearer <session-token>`

**Responses:**

| Status | Error Code                                  | Description                                           |
|--------|---------------------------------------------|-------------------------------------------------------|
| 200    | —                                           | Deletion request submitted                            |
| 409    | `DELETION_REQUEST_ALREADY_PENDING`          | A deletion request is already pending for this account|

### `DELETE /users/me/deletion-request`

Cancels a pending account deletion request.

**Headers:** `Authorization: Bearer <session-token>`

**Responses:**

| Status | Error Code                        | Description                              |
|--------|-----------------------------------|------------------------------------------|
| 200    | —                                 | Deletion request cancelled               |
| 404    | `DELETION_REQUEST_NOT_FOUND`      | No pending deletion request found        |

---

## Admin

Admin endpoints require a static Bearer token configured via `ADMIN_BEARER_TOKEN`.

### `GET /admin/users`

Returns a paginated list of all registered users.

**Headers:** `Authorization: Bearer <admin-token>`

**Responses:**

| Status | Description                         |
|--------|-------------------------------------|
| 200    | User list returned                  |
| 401    | Missing or invalid admin token      |

---

## Health

### `GET /health`

Returns the operational status of the service.

**Responses:**

| Status | Description                       |
|--------|-----------------------------------|
| 200    | Service is healthy                |

---

## Environment Variables Reference

The following environment variables configure the behaviour of the User Management System backend.

### Core Application

| Variable                  | Type    | Default | Description                                                             |
|---------------------------|---------|---------|-------------------------------------------------------------------------|
| `PORT`                    | integer | `3000`  | TCP port the HTTP server listens on                                     |
| `DATABASE_PATH`           | string  | `./data/app.db` | Path to the SQLite database file                              |
| `BCRYPT_COST_FACTOR`      | integer | `12`    | bcrypt cost factor for password hashing; must be >= 12                  |
| `ACTIVATION_BASE_URL`     | string  | —       | **Required.** Base URL used to construct account activation links       |
| `ADMIN_BEARER_TOKEN`      | string  | —       | **Required.** Static token for admin API access                         |
| `TOKEN_EXPIRY_HOURS`      | integer | `24`    | Lifetime of account activation tokens in hours                          |

### Email / SendGrid

| Variable                          | Type   | Default | Description                                                   |
|-----------------------------------|--------|---------|---------------------------------------------------------------|
| `SENDGRID_API_KEY`                | string | —       | **Required.** SendGrid API key (never logged)                 |
| `SENDGRID_TEMPLATE_ID`            | string | —       | **Required.** Dynamic template ID for activation emails       |
| `FROM_EMAIL`                      | string | —       | **Required.** Verified sender email address                   |
| `FROM_NAME`                       | string | —       | Display name accompanying `FROM_EMAIL`                        |

### OTP (One-Time Password)

| Variable                        | Type    | Default             | Description                                                    |
|---------------------------------|---------|---------------------|----------------------------------------------------------------|
| `OTP_LENGTH`                    | integer | `6`                 | Number of digits in each generated OTP                         |
| `OTP_TTL_MINUTES`               | integer | `10`                | OTP validity duration in minutes                               |
| `OTP_MAX_ATTEMPTS_PER_WINDOW`   | integer | `5`                 | Maximum OTP verify attempts before the code is invalidated     |
| `OTP_RATE_LIMIT_WINDOW_MINUTES` | integer | `15`                | Rate-limit window for OTP dispatch requests (in minutes)       |
| `OTP_HASH_ALGORITHM`            | string  | `sha256`            | Hash algorithm used to store OTP codes                         |
| `OTP_HASH_SECRET`               | string  | —                   | **Required.** HMAC secret for OTP hashing (never logged)       |
| `OTP_EMAIL_TEMPLATE_ID`         | string  | —                   | **Required.** SendGrid template ID for OTP delivery emails     |

### Session & Account Lockout

| Variable                          | Type    | Default | Description                                                             |
|-----------------------------------|---------|---------|-------------------------------------------------------------------------|
| `LOGIN_LOCKOUT_THRESHOLD`         | integer | `5`     | Number of consecutive failed logins before an account is locked         |
| `LOGIN_LOCKOUT_DURATION_MINUTES`  | integer | `15`    | Duration in minutes that an account lockout remains active              |

### Password Change Rate Limiting

These variables control the rate limit applied to the [Change Password](#change-password) endpoint (`PATCH /users/me/password`). Counters are scoped per authenticated user ID and stored in Redis with automatic TTL-based expiry.

| Variable                                | Type    | Default | Description                                                                                                                                                    |
|-----------------------------------------|---------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PASSWORD_CHANGE_RATE_LIMIT_MAX`        | integer | `5`     | Maximum number of password change attempts permitted within a single rate-limit window. The limit is inclusive: the Nth request is allowed; the (N+1)th is rejected with HTTP 429. |
| `PASSWORD_CHANGE_RATE_LIMIT_WINDOW_SECONDS` | integer | `900`   | Duration of the rate-limit window in seconds (default: 900 seconds = 15 minutes). After this period elapses from the first attempt, the counter resets automatically via Redis TTL expiry. |

### Redis

| Variable    | Type   | Default                   | Description                              |
|-------------|--------|---------------------------|------------------------------------------|
| `REDIS_URL` | string | `redis://localhost:6379`  | Connection URL for the Redis instance used for OTP rate limiting, session management, and password-change rate limiting |

### Password Recovery

| Variable                                | Type    | Default | Description                                                        |
|-----------------------------------------|---------|---------|--------------------------------------------------------------------|
| `PASSWORD_RECOVERY_TOKEN_EXPIRY_HOURS`  | integer | `24`    | Lifetime of password recovery tokens in hours                      |
| `PASSWORD_RECOVERY_BASE_URL`            | string  | —       | **Required.** Base URL for constructing password-reset links       |
| `PASSWORD_RECOVERY_EMAIL_TEMPLATE_ID`   | string  | —       | **Required.** SendGrid template ID for password-recovery emails    |

---

## Error Codes Reference

| HTTP Status | Error Code                               | Endpoint(s)                                    | Description                                                                 |
|-------------|------------------------------------------|------------------------------------------------|-----------------------------------------------------------------------------|
| 409         | `USERNAME_CONFLICT`                      | `POST /users/register`                         | Username is already registered                                              |
| 422         | `VALIDATION_ERROR`                       | Various                                        | Request body failed schema or business-rule validation                      |
| 404         | `TOKEN_NOT_FOUND`                        | `GET /users/activate`, `POST /users/password-reset` | Supplied token does not exist                                          |
| 410         | `TOKEN_EXPIRED`                          | `GET /users/activate`, `POST /users/password-reset` | Supplied token has passed its expiry time                              |
| 410         | `TOKEN_CONSUMED`                         | `GET /users/activate`, `POST /users/password-reset` | Supplied token has already been used                                   |
| 409         | `ACCOUNT_NOT_PENDING`                    | `GET /users/activate`                          | Account is not in a state that permits activation                           |
| 409         | `DUPLICATE_DISPATCH`                     | `POST /otp/dispatch`                           | An OTP was recently sent; the dispatch cooldown has not elapsed             |
| 401         | `INVALID_CREDENTIALS`                    | `POST /auth/login`, `PATCH /users/me/password` | Email/password combination is incorrect, or current password is wrong       |
| 403         | `ACCOUNT_NOT_ACTIVE`                     | `POST /auth/login`                             | Account has not been activated or has been suspended                        |
| 423         | `ACCOUNT_LOCKED`                         | `POST /auth/login`                             | Account is temporarily locked after too many failed login attempts          |
| 429         | `OTP_RATE_LIMIT_EXCEEDED`                | `POST /otp/dispatch`                           | OTP dispatch rate limit exceeded for the current window                     |
| 422         | `PASSWORD_POLICY_VIOLATION`              | `PATCH /users/me/password`, `POST /users/password-reset` | New password does not satisfy the password policy                  |
| 429         | `PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED`    | `PATCH /users/me/password`                     | More than 5 password change attempts made within the 15-minute window. Includes `Retry-After` header. |
| 409         | `DELETION_REQUEST_ALREADY_PENDING`       | `POST /users/me/deletion-request`              | A deletion request already exists for this account                          |
| 404         | `DELETION_REQUEST_NOT_FOUND`             | `DELETE /users/me/deletion-request`            | No pending deletion request found to cancel                                 |