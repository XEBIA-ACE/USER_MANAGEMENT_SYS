# Implementation Plan: Change Password

## Ground-Truth Evidence (CI-GR-12)

| Metric | Value |
|--------|-------|
| `PasswordController` blast-radius score | 10 / 100 — LOW |
| Impacted symbols (PasswordController change) | 2 (`createPasswordRouter`, `createApp`) |
| Impacted files (PasswordController change) | 2 (`password.routes.ts`, `app.ts`) |
| `updatePasswordHash` blast-radius score | 14 / 100 — LOW |
| `DefaultPasswordPolicyEvaluator` blast-radius score | 11 / 100 — LOW |
| `PasswordPolicy` blast-radius score | 12 / 100 — LOW |
| Dead code found | 0 candidates |
| CVEs found (HIGH+) | 0 |
| Total impacted transactions | 0 (no new HTTP route exists yet) |

**Blast-radius summary:** Modifying `PasswordController` (479e608c8456cd2b) propagates to exactly **2 symbols** across **2 files**. Adding the new `POST /password/change` route inside the existing `createPasswordRouter` (0df584efe8a1987c) means `createApp` (591fa6260f974777) is the sole upstream assembler affected. Risk is LOW.

---

## Phase 1 — Backend Service Layer (Day 1)

**Goal:** Implement `DefaultChangePasswordService` with full unit-test coverage.

### Steps
1. Create `BACKEND/src/services/change-password.service.ts`
   - Export `ChangePasswordService` interface: `changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>`
   - Export `DefaultChangePasswordService` class implementing the interface
   - Inject: `IUserRepository` (5dc0c9164294a9a4), `PasswordHasher` (5aacd11fac25f96e), `PasswordPolicyEvaluator` (8f436233c39b9a04)
   - Logic sequence (see Spec §5)

2. Add `IncorrectCurrentPasswordException` to `BACKEND/src/errors/login.errors.ts`
   - Peer of `PasswordPolicyViolationException` (de2a634cb8e9de62, lines 129–138)

3. Add `ChangePasswordRequestDto` interface to `BACKEND/src/types/login.types.ts`
   - Fields: `currentPassword: string`, `newPassword: string`

4. Write `BACKEND/src/services/change-password.service.test.ts` (unit tests — 6 test cases)

**Dependency:** Reuses `updatePasswordHash` (9cf6175131304446) — verified present at `user.repository.ts` lines 217–219, no modification required.

---

## Phase 2 — Backend Controller & Route (Day 1–2)

**Goal:** Expose `POST /password/change` with session protection.

### Steps
1. Add `changePassword` method to `PasswordController` (479e608c8456cd2b) in `BACKEND/src/controllers/password.controller.ts`
   - Lines 30–101 (class body, currently ends at line 101)
   - Accepts `ChangePasswordRequestDto`, extracts `userId` from session
   - Returns 200 on success; delegates errors to existing Express error handler

2. Extend `createPasswordRouter` (0df584efe8a1987c) in `BACKEND/src/routes/password.routes.ts`
   - Register `POST /change`
   - Apply `createSessionValidationMiddleware` (1059263947d46148) — same pattern as `createUserProfileRouter` (366b27e2b7466ba3) and `createDeletionRouter` (d1f3840f73d7602a)
   - Inject `DefaultChangePasswordService`

3. Add integration test cases to `BACKEND/src/controllers/password.controller.test.ts`

**Impact:** Only `createPasswordRouter` (0df584efe8a1987c) and transitively `createApp` (591fa6260f974777) are affected — confirmed by blast-radius result (2 symbols, 2 files).

---

## Phase 3 — Frontend Component (Day 2–3)

**Goal:** Add a change-password page that satisfies AC-4.

### Steps
1. Create `FRONTEND/src/app/components/templates/ChangePasswordTemplate.tsx`
   - Reuse `PasswordInput` (bc12da11e1a186f7, `PasswordInput.tsx` lines 15–64) for all three fields
   - Attach `PasswordStrengthBar` (3a0d7960af5478d7, `PasswordStrengthBar.tsx` lines 21–56) to the new-password field
   - Client-side confirm-password match validation
   - `RegisterUserPasswordPolicyErrorResponse` (01139223b27c56a5) shape for API error display

2. Add `changePassword(currentPassword, newPassword)` function to `FRONTEND/src/app/lib/api-client.ts`
   - Use `authRequest` (737ac5f48a41f5ba) pattern for authenticated call
   - Target: `POST /password/change`

3. Link the new template from `AccountDashboardTemplate` (7711e26c059cb4be)

4. Write `ChangePasswordTemplate` frontend unit tests

---

## Phase 4 — Integration Test (Day 3)

1. Add integration spec covering unauthenticated access (expect 401) and successful update
   - Pattern mirrors `BACKEND/src/integration/login.integration.spec.ts`
   - Use `UserRepository.findById` (25ac13796847ce72) to verify hash changed post-call

---

## Phase 5 — Security Review (Day 3–4)

1. Confirm `createSessionValidationMiddleware` applied in route
2. Confirm bcrypt compare (not plain-text) via `BcryptPasswordHasher.compare` (ed1f022ade782723)
3. Confirm `withTransaction` wrapping around `updatePasswordHash`
4. Review error messages for information leakage
5. Add `RateLimitGuard` if not already applied to password routes (BACKEND/src/services/rate-limit.guard.ts — community 0)

---

## Rollback Plan

All changes are additive:
- New service file → delete to rollback
- New route on existing router → remove the `router.post('/change', ...)` line
- New controller method → remove method body
- Frontend template → delete file and remove link from dashboard

`createApp` (591fa6260f974777) wires the router at startup; no database schema changes are needed (reuses `updatePasswordHash` which issues `UPDATE users SET password_hash = ...`).
