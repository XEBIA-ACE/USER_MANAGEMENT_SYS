# Spec: Edit User Name

## Story Summary
Allow a user to update their display name from their profile page. The updated name must be validated (character limits, allowed characters) before being persisted. On success the UI reflects the new name; on failure a descriptive error message is displayed.

---

## 1. Scope & Context

### Repository
`183f8218-bb77-4465-919a-6921d025e446/84814e78-c374-4631-88dc-24fcc52f1423`

Two top-level packages were confirmed by `architecture_overview`:
- **BACKEND** — TypeScript Express API (98 modules)
- **FRONTEND** — TypeScript React SPA (101 modules)

### Current State of the User-Profile Feature

The codebase already contains a complete **read** path for the user profile:

| Layer | Symbol | File | Symbol ID |
|-------|--------|------|-----------|
| Route | `createUserProfileRouter` (Function) | `BACKEND/src/routes/user-profile.routes.ts` | `366b27e2b7466ba3` |
| Middleware | `createSessionValidationMiddleware` (Function) | `BACKEND/src/middleware/session-validation.middleware.ts` | `1059263947d46148` |
| Controller | `UserProfileController` (Class) | `BACKEND/src/controllers/user-profile.controller.ts` | `ba3e7896c2cc3cf7` |
| Controller method | `getMe` (Function) | `BACKEND/src/controllers/user-profile.controller.ts` | `f9bc92fbe5ce96a2` |
| Service interface | `UserProfileService` (Interface) | `BACKEND/src/services/user-profile.service.ts` | `2b3db1f0bd46decb` |
| Service class | `DefaultUserProfileService` (Class) | `BACKEND/src/services/user-profile.service.ts` | `e69bdf959fae27f6` |
| Service method | `getProfile` (Function) | `BACKEND/src/services/user-profile.service.ts` | `d42c127ef389d178` |
| Repository class | `UserRepository` (Class) | `BACKEND/src/repositories/user.repository.ts` | `8030f2e23dc77b07` |
| Repository interface | `IUserRepository` (Interface) | `BACKEND/src/repositories/user.repository.ts` | `5dc0c9164294a9a4` |
| Repository method | `findById` (Function) | `BACKEND/src/repositories/user.repository.ts` | `25ac13796847ce72` |
| Repository entity mapper | `rowToEntity` (Function) | `BACKEND/src/repositories/user.repository.ts` | `16422075f5aedea8` |
| Domain entity | `UserEntity` (Interface) | `BACKEND/src/types/registration.types.ts` | `39187f6dc36d1422` |
| Backend result type | `UserProfileResult` (Interface) | `BACKEND/src/types/user-profile.types.ts` | `980c3c8434d3b498` |
| Error class | `UserNotFoundException` (Class) | `BACKEND/src/errors/registration.errors.ts` | `b108791803cc10c0` |
| Error class | `ValidationError` (Class) | `BACKEND/src/errors/registration.errors.ts` | `29d29dbcef350ea0` |
| Frontend response type | `UserProfileResponse` (Interface) | `FRONTEND/src/app/types/profile.types.ts` | `e01aca1387f463fe` |
| Frontend error type | `ProfileErrorResponse` (Interface) | `FRONTEND/src/app/types/profile.types.ts` | `c2ce62588cf5d2f6` |
| Frontend hook | `useCurrentUser` (Function) | `FRONTEND/src/app/lib/useCurrentUser.ts` | `1c9988910bdacb63` |
| Frontend profile page | `AccountDashboardTemplate` (Function) | `FRONTEND/src/app/components/templates/AccountDashboardTemplate.tsx` | `7711e26c059cb4be` |

**No `updateName` / `PATCH` / `PUT` handler exists anywhere in the codebase** — confirmed by `find_symbol` queries for `updateName`, `updateUser`, `updateProfile`, `PATCH`, and route-level `PUT` in `BACKEND/src/routes/**`. The "Edit User Name" feature must be built **net-new**.

---

## 2. Acceptance Criteria (restated with technical precision)

| # | Criterion |
|---|-----------|
| AC-1 | A logged-in user can submit a new name from the profile page; the system persists it and returns HTTP 200 with the updated `UserProfileResponse`. |
| AC-2 | If the submitted name exceeds the defined maximum character count, the API returns HTTP 422 with a `ValidationError` body; the UI renders the error message inline. |
| AC-3 | If the submitted name contains disallowed characters, the API returns HTTP 422 with a `ValidationError` body; the UI renders the error message inline. |
| AC-4 | Requests to the update endpoint without a valid session are rejected with HTTP 401 by the existing `createSessionValidationMiddleware`. |
| AC-5 | The name update is reflected immediately in all components that consume `useCurrentUser`: `AccountDashboardTemplate`, `DashboardTemplate`, and `AccountDeletionTemplate`. |

---

## 3. Detailed Design

### 3.1 Backend — New Endpoint

**Route:** `PATCH /users/me/name` (registered inside `createUserProfileRouter`)

**Middleware chain (existing):** `createSessionValidationMiddleware` (symbol `1059263947d46148`) → `UserProfileController.updateName` (new)

#### 3.1.1 Request DTO — new type in `BACKEND/src/types/user-profile.types.ts`
```typescript
export interface UpdateNameRequestDto {
  name: string;
}
```

#### 3.1.2 Validation Rules (to be enforced in a new `NameValidator` or inline in the service)
- `name` must be a non-empty string.
- `name` must not exceed **100 characters** (to be confirmed by product; default recommendation based on `UserEntity` field analysis).
- `name` must match the pattern `^[\p{L}\p{M}'\- ]+$` (Unicode letters, marks, apostrophes, hyphens, spaces) — no injection vectors.
- On failure: throw `ValidationError` (symbol `29d29dbcef350ea0`, `BACKEND/src/errors/registration.errors.ts`).

#### 3.1.3 Repository — New method on `UserRepository` / `IUserRepository`

Add `updateName(userId: string, name: string): Promise<void>` to:
- `IUserRepository` interface (symbol `5dc0c9164294a9a4`, `BACKEND/src/repositories/user.repository.ts`, line 19–42)
- `UserRepository` class (symbol `8030f2e23dc77b07`, `BACKEND/src/repositories/user.repository.ts`, line 88–254)

Pattern mirrors existing `updatePasswordHash` (symbol `9cf6175131304446`, line 217–219) and `updateLastLoginAt` (symbol `62b2f5fb22a8d2ce`, line 207–211).

#### 3.1.4 Service — New method on `DefaultUserProfileService`

Add `updateName(userId: string, name: string): Promise<void>` to:
- `UserProfileService` interface (symbol `2b3db1f0bd46decb`)
- `DefaultUserProfileService` class (symbol `e69bdf959fae27f6`)

Logic:
1. Validate the `name` input; throw `ValidationError` on failure.
2. Call `this.userRepository.findById(userId)` (symbol `25ac13796847ce72`) to confirm user exists; throw `UserNotFoundException` (symbol `b108791803cc10c0`) if absent.
3. Call `this.userRepository.updateName(userId, name)`.
4. Return void (caller fetches updated profile separately, or service returns the updated `UserProfileResult`).

#### 3.1.5 Controller — New method on `UserProfileController`

Add `updateName(req, res)` to `UserProfileController` (symbol `ba3e7896c2cc3cf7`):
- Parse `UpdateNameRequestDto` from `req.body`.
- Call `this.userProfileService.updateName(userId, dto.name)`.
- On success: respond HTTP 200 with the result of `getProfile(userId)` (symbol `d42c127ef389d178`) so the frontend receives the full updated profile.
- On `ValidationError`: HTTP 422.
- On `UserNotFoundException`: HTTP 404.

#### 3.1.6 Route Registration — `createUserProfileRouter`
Inside `createUserProfileRouter` (symbol `366b27e2b7466ba3`):
```typescript
router.patch(
  '/me/name',
  sessionValidationMiddleware,
  (req, res) => controller.updateName(req, res)
);
```

---

### 3.2 Frontend — Profile Page Edit Form

**Component:** `AccountDashboardTemplate` (symbol `7711e26c059cb4be`, `FRONTEND/src/app/components/templates/AccountDashboardTemplate.tsx`, lines 22–83)

`AccountDashboardTemplate` currently calls:
- `getSessionEmail` (symbol `f69cec6751693efe`) — session hook
- `useCurrentUser` (symbol `1c9988910bdacb63`) — fetches profile data via the existing GET endpoint

#### 3.2.1 New API client function in `FRONTEND/src/app/lib/api-client.ts`
```typescript
export async function updateUserName(name: string): Promise<UserProfileResponse>
```
- Issues `PATCH /users/me/name` with `{ name }` body.
- Returns a `UserProfileResponse` on success (symbol `e01aca1387f463fe`).
- Throws/returns a `ProfileErrorResponse` (symbol `c2ce62588cf5d2f6`) on error.

#### 3.2.2 UI changes in `AccountDashboardTemplate`
1. Add an **"Edit"** button beside the displayed name.
2. Clicking Edit reveals an inline `<input>` pre-filled with the current name and a **"Save"** button.
3. On Save: call `updateUserName(newName)`.
4. On success: invalidate/refresh the `useCurrentUser` hook state so all three consuming templates (`AccountDashboardTemplate`, `DashboardTemplate` (symbol `0f81f555d59a3890`), `AccountDeletionTemplate` (symbol `b986af725df941d7`)) reflect the new name.
5. On error: display the server-side `ProfileErrorResponse.message` inline beneath the input field.
6. Client-side validation mirrors the backend rules (max 100 chars, character pattern) to give fast feedback before the network call.

---

## 4. Data Model

The `UserEntity` interface (symbol `39187f6dc36d1422`, `BACKEND/src/types/registration.types.ts`, lines 83–96) is the authoritative domain model. The story requires that the `name` field stored in the `UserEntity` be mutable via the new `updateName` repository method, consistent with how `updatePasswordHash` mutates the `passwordHash` field.

The `UserProfileResult` interface (symbol `980c3c8434d3b498`, `BACKEND/src/types/user-profile.types.ts`, lines 8–15) is what the service returns; it must expose the `name` field so the frontend's `UserProfileResponse` (symbol `e01aca1387f463fe`) can reflect it.

---

## 5. Error Handling Matrix

| Scenario | Backend response | HTTP code | Frontend display |
|----------|-----------------|-----------|-----------------|
| Name too long (>100 chars) | `ValidationError` body | 422 | Inline error below input |
| Invalid characters | `ValidationError` body | 422 | Inline error below input |
| Empty string | `ValidationError` body | 422 | Inline error below input |
| User not found (edge case) | `UserNotFoundException` body | 404 | Toast / error banner |
| Not authenticated | `createSessionValidationMiddleware` rejects | 401 | Redirect to login |
| Server error | Generic 500 | 500 | Toast / error banner |

---

## 6. Security Considerations

- The endpoint sits behind `createSessionValidationMiddleware` (symbol `1059263947d46148`) — authentication is enforced.
- Input is validated server-side via `ValidationError` pattern used throughout the codebase.
- No `UserRepository` mutation is permitted without session validation: matches the existing security posture of `createUserProfileRouter`.
- The name field should be stored and rendered HTML-encoded to prevent XSS.

---

## 7. Testing Requirements

- **Unit test:** `DefaultUserProfileService.updateName` — mock `IUserRepository`; assert `ValidationError` on bad input, `UserNotFoundException` on missing user, success path.
- **Unit test:** `UserProfileController.updateName` — mock service; assert HTTP 422 on validation failure, 200 on success.
- **Integration test:** Extend the existing `login.integration.spec.ts` pattern: register → login → PATCH `/users/me/name` → GET `/users/me` → assert new name.
- **Frontend unit test:** `AccountDashboardTemplate` — mock `updateUserName`; assert error message on rejection, updated name on resolution.

---

## 8. Blast Radius (CI-GR-12)

| Target | Blast Radius Score | Band | Impacted Symbols | Impacted Files |
|--------|--------------------|------|-----------------|----------------|
| `UserProfileController` file | 10 | LOW | 2 (`createUserProfileRouter`, `createApp`) | 2 |
| `user-profile.service.ts` file | 11 | LOW | 3 (`createUserProfileRouter`, `getMe`, `createApp`) | 3 |
| `user.repository.ts` file | 7 | LOW | 32 (wide — repository is shared across all routes) | 25 |

The repository modification has the widest transitive footprint (32 symbols, 25 files including workers and integration tests). All changes to `IUserRepository` / `UserRepository` must be reviewed carefully against the 11 callers confirmed in the call graph.

Measured blast-radius count (direct callers + graph nodes + transactions for `user-profile.service.ts` scope): **3 impacted symbols, 3 impacted files, 0 impacted tests** — LOW risk, score 11/100.
