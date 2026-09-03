# Engineering Tasks: Change Password

## Task Breakdown

---

### T-1 · BACKEND: Add `IncorrectCurrentPasswordException`
**File:** `BACKEND/src/errors/login.errors.ts`  
**Type:** Modify  
**Effort:** XS (30 min)

- Add class `IncorrectCurrentPasswordException` after `PasswordPolicyViolationException` (de2a634cb8e9de62, lines 129–138)
- HTTP status: 400
- Message: `"Current password is incorrect"`
- **Acceptance:** Class exported; unit test in service layer catches it

---

### T-2 · BACKEND: Add `ChangePasswordRequestDto`
**File:** `BACKEND/src/types/login.types.ts`  
**Type:** Modify  
**Effort:** XS (20 min)

- Add interface `ChangePasswordRequestDto` with fields `currentPassword: string` and `newPassword: string`
- Follows existing `PasswordRecoveryRequestEntity` (e8e3190aa1c7083c, lines 79–87) pattern in same file

---

### T-3 · BACKEND: Create `change-password.service.ts`
**File:** `BACKEND/src/services/change-password.service.ts` (new)  
**Type:** Create  
**Effort:** M (2–3 h)

- Export `ChangePasswordService` interface with single method signature
- Export `DefaultChangePasswordService` class
- Constructor injects:
  - `IUserRepository` (5dc0c9164294a9a4)
  - `PasswordHasher` (5aacd11fac25f96e) → impl: `BcryptPasswordHasher` (28edeae7c394e78a)
  - `PasswordPolicyEvaluator` (8f436233c39b9a04) → impl: `DefaultPasswordPolicyEvaluator` (3b5783d0a76e5126)
- Implementation steps:
  1. `UserRepository.findById` (25ac13796847ce72) → throw `UserNotFoundException` (b108791803cc10c0) if not found
  2. `BcryptPasswordHasher.compare` (ed1f022ade782723) → throw `IncorrectCurrentPasswordException` if false
  3. `DefaultPasswordPolicyEvaluator.evaluate` (40a5208083952355) → throw `PasswordPolicyViolationException` (de2a634cb8e9de62) if invalid
  4. `BcryptPasswordHasher.hash` (8fb558192be2aad3)
  5. `withTransaction` (843dc4a386232260) → `UserRepository.updatePasswordHash` (9cf6175131304446)

---

### T-4 · BACKEND: Unit tests for `DefaultChangePasswordService`
**File:** `BACKEND/src/services/change-password.service.test.ts` (new)  
**Type:** Create  
**Effort:** M (2 h)

- 6 test cases:
  1. Success: updates password hash
  2. User not found: throws `UserNotFoundException`
  3. Wrong current password: throws `IncorrectCurrentPasswordException`
  4. Policy violation: throws `PasswordPolicyViolationException`
  5. Hashes new password before storing
  6. Uses transaction wrapper

---

### T-5 · BACKEND: Add `changePassword` to `PasswordController`
**File:** `BACKEND/src/controllers/password.controller.ts`  
**Type:** Modify  
**Effort:** S (1 h)

- Extend `PasswordController` (479e608c8456cd2b, lines 30–101)
- Add constructor param for `ChangePasswordService`
- Add `changePassword(req, res, next)` method:
  - Extract `userId` from validated session
  - Extract `currentPassword`, `newPassword` from `req.body`
  - Call `ChangePasswordService.changePassword`
  - Return `200 { message: "Password updated successfully" }` on success
  - Pass errors to `next()` for existing error-handler middleware

---

### T-6 · BACKEND: Register `POST /password/change` in router
**File:** `BACKEND/src/routes/password.routes.ts`  
**Type:** Modify  
**Effort:** S (45 min)

- In `createPasswordRouter` (0df584efe8a1987c, lines 27–48):
  - Instantiate `DefaultChangePasswordService` (inject `UserRepository`, `BcryptPasswordHasher`, `DefaultPasswordPolicyEvaluator`)
  - Register: `router.post('/change', createSessionValidationMiddleware(sessionRepository, userRepository), passwordController.changePassword)`
  - `createSessionValidationMiddleware` (1059263947d46148) — same pattern as `createUserProfileRouter` (366b27e2b7466ba3) and `createDeletionRouter` (d1f3840f73d7602a)

---

### T-7 · BACKEND: Controller & route integration tests
**File:** `BACKEND/src/controllers/password.controller.test.ts`  
**Type:** Modify  
**Effort:** S (1.5 h)

- Test `POST /password/change`:
  1. Unauthenticated → 401
  2. Wrong current password → 400 with error body
  3. Policy violation → 400 with policy error body
  4. Valid request → 200

---

### T-8 · BACKEND: Integration spec
**File:** `BACKEND/src/integration/password.change.integration.spec.ts` (new)  
**Type:** Create  
**Effort:** M (2 h)

- Full integration test against a test database
- Pattern mirrors `BACKEND/src/integration/login.integration.spec.ts`
- Verify hash in DB has changed after successful call via `UserRepository.findById` (25ac13796847ce72)

---

### T-9 · FRONTEND: Add `changePassword` to `api-client.ts`
**File:** `FRONTEND/src/app/lib/api-client.ts`  
**Type:** Modify  
**Effort:** XS (30 min)

- Add exported `changePassword(currentPassword: string, newPassword: string): Promise<void>`
- Uses `authRequest` (737ac5f48a41f5ba) pattern (authenticated POST)
- Target URL: `/password/change`

---

### T-10 · FRONTEND: Create `ChangePasswordTemplate`
**File:** `FRONTEND/src/app/components/templates/ChangePasswordTemplate.tsx` (new)  
**Type:** Create  
**Effort:** M (2–3 h)

- Three `PasswordInput` (bc12da11e1a186f7) fields: current, new, confirm
- `PasswordStrengthBar` (3a0d7960af5478d7) bound to new-password field value
- Client-side validation: new ≠ current; confirm matches new
- Server-side errors mapped to `RegisterUserPasswordPolicyErrorResponse` (01139223b27c56a5) shape
- Calls `api-client.changePassword` on submit
- Success: display confirmation message; optionally redirect to `AccountDashboardTemplate` (7711e26c059cb4be)

---

### T-11 · FRONTEND: Link from `AccountDashboardTemplate`
**File:** `FRONTEND/src/app/components/templates/AccountDashboardTemplate.tsx`  
**Type:** Modify  
**Effort:** XS (30 min)

- Add navigation link/button to `ChangePasswordTemplate` page
- `AccountDashboardTemplate` (7711e26c059cb4be, lines 22–83) already contains profile navigation

---

### T-12 · FRONTEND: Unit tests for `ChangePasswordTemplate`
**File:** `FRONTEND/src/app/components/templates/ChangePasswordTemplate.test.tsx` (new)  
**Type:** Create  
**Effort:** S (1.5 h)

- Render test
- Validation error display
- Password strength bar renders on new-password input
- Successful submission state

---

## Task Summary Table

| Task | Layer | Type | Effort | Dependencies |
|------|-------|------|--------|--------------|
| T-1 | BACKEND Error | Modify | XS | — |
| T-2 | BACKEND Types | Modify | XS | — |
| T-3 | BACKEND Service | Create | M | T-1, T-2 |
| T-4 | BACKEND Service Tests | Create | M | T-3 |
| T-5 | BACKEND Controller | Modify | S | T-3 |
| T-6 | BACKEND Route | Modify | S | T-5 |
| T-7 | BACKEND Controller Tests | Modify | S | T-5, T-6 |
| T-8 | BACKEND Integration | Create | M | T-6 |
| T-9 | FRONTEND API | Modify | XS | — |
| T-10 | FRONTEND Template | Create | M | T-9 |
| T-11 | FRONTEND Dashboard | Modify | XS | T-10 |
| T-12 | FRONTEND Tests | Create | S | T-10 |

**Total effort estimate:** ~3–4 engineer-days  
**Critical path:** T-1 → T-3 → T-5 → T-6 → T-8
