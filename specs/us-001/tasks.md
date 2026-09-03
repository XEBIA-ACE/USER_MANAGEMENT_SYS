# Engineering Tasks

## Backend Tasks

### B-1 — Extend `IUserRepository` with `updateName`
- **File:** `BACKEND/src/repositories/user.repository.ts`
- **Symbol:** `IUserRepository` (`5dc0c9164294a9a4`, line 19–42)
- **Change:** Add `updateName(userId: string, name: string): Promise<void>` to the interface.
- **Pattern reference:** `updatePasswordHash` (`9cf6175131304446`) at line 217.
- **DoD:** TypeScript compiles; `UserRepository` class must also be updated (B-2).

### B-2 — Implement `UserRepository.updateName`
- **File:** `BACKEND/src/repositories/user.repository.ts`
- **Symbol:** `UserRepository` (`8030f2e23dc77b07`, lines 88–254)
- **Change:** Implement `updateName` as a parameterised SQL UPDATE on the users table scoped to the given `userId`.
- **DoD:** Existing unit tests pass; new unit test added (B-4).

### B-3 — Add `UpdateNameRequestDto` type
- **File:** `BACKEND/src/types/user-profile.types.ts`
- **Symbol:** new (alongside `UserProfileResult` `980c3c8434d3b498`)
- **Change:** Add `interface UpdateNameRequestDto { name: string; }`.
- **DoD:** TypeScript compiles; imported by controller.

### B-4 — Extend `UserProfileService` with `updateName`
- **File:** `BACKEND/src/services/user-profile.service.ts`
- **Symbols:** `UserProfileService` (`2b3db1f0bd46decb`), `DefaultUserProfileService` (`e69bdf959fae27f6`)
- **Change:**
  - Add `updateName` to the interface.
  - Implement in `DefaultUserProfileService`:
    1. Validate name (length ≤ 100, allowed characters pattern).
    2. Throw `ValidationError` (`29d29dbcef350ea0`) on invalid input.
    3. Call `findById` (`25ac13796847ce72`) to assert user exists; throw `UserNotFoundException` (`b108791803cc10c0`) if not.
    4. Call `userRepository.updateName(userId, name)`.
- **DoD:** Service unit tests pass; new cases added (B-5).

### B-5 — Service unit tests for `updateName`
- **File:** `BACKEND/src/services/user-profile.service.test.ts`
- **Existing variable:** `service` (`5fdcfe40eda91b1a`, line 28)
- **Cases:**
  - Empty name → `ValidationError`
  - Name exceeds 100 chars → `ValidationError`
  - Invalid characters → `ValidationError`
  - Unknown userId → `UserNotFoundException`
  - Valid name → resolves (no error)
- **DoD:** All new test cases pass.

### B-6 — Add `UserProfileController.updateName`
- **File:** `BACKEND/src/controllers/user-profile.controller.ts`
- **Symbol:** `UserProfileController` (`ba3e7896c2cc3cf7`, lines 16–41)
- **Change:** Add `async updateName(req, res)`:
  - Parse `UpdateNameRequestDto` from `req.body`.
  - Call `this.userProfileService.updateName(userId, dto.name)`.
  - Return HTTP 200 + `getProfile(userId)` result on success.
  - HTTP 422 on `ValidationError`.
  - HTTP 404 on `UserNotFoundException`.
- **DoD:** Controller test cases pass (B-7).

### B-7 — Controller unit tests for `updateName`
- **File:** `BACKEND/src/controllers/user-profile.controller.test.ts`
- **Existing variable:** `controller` (`4dd574400a3f0fbb`, line 19)
- **Cases:**
  - Service throws `ValidationError` → 422 response
  - Service throws `UserNotFoundException` → 404 response
  - Service resolves → 200 response with updated profile body
- **DoD:** All new test cases pass.

### B-8 — Register `PATCH /me/name` route
- **File:** `BACKEND/src/routes/user-profile.routes.ts`
- **Symbol:** `createUserProfileRouter` (`366b27e2b7466ba3`, lines 24–39)
- **Change:** Register `router.patch('/me/name', sessionValidationMiddleware, controller.updateName)`.
- **DoD:** Integration test passes (B-9); existing GET `/me` route unaffected.

### B-9 — Integration test for edit-name flow
- **File:** `BACKEND/src/integration/user-profile.integration.spec.ts` (new file)
- **Pattern:** Mirror `buildProtectedTestApp` in `login.integration.spec.ts` (symbol `5582b468742f337d`).
- **Scenarios:**
  - Unauthenticated PATCH → 401
  - PATCH with invalid name → 422
  - PATCH with valid name + GET → 200, name updated

---

## Frontend Tasks

### F-1 — Add `updateUserName` to API client
- **File:** `FRONTEND/src/app/lib/api-client.ts`
- **Change:** `export async function updateUserName(name: string): Promise<UserProfileResponse>` — issues `PATCH /users/me/name`.
- Uses `UserProfileResponse` (`e01aca1387f463fe`) and `ProfileErrorResponse` (`c2ce62588cf5d2f6`).
- **DoD:** TypeScript compiles; used by F-2.

### F-2 — Add inline edit form to `AccountDashboardTemplate`
- **File:** `FRONTEND/src/app/components/templates/AccountDashboardTemplate.tsx`
- **Symbol:** `AccountDashboardTemplate` (`7711e26c059cb4be`, lines 22–83)
- **Change:**
  - Add controlled `<input>` for name, Edit/Save/Cancel buttons.
  - Client-side validation: max 100 chars, character allowlist.
  - Call `updateUserName` on save.
  - On success: refresh `useCurrentUser` (`1c9988910bdacb63`) state.
  - On error: render `ProfileErrorResponse.message` inline.
- **DoD:** User can edit and save name; UI reflects new name in all three consuming templates; error message shown on invalid input.

### F-3 — Frontend unit tests for edit-name UI
- **File:** New test file for `AccountDashboardTemplate`.
- **Cases:**
  - Renders current name from `useCurrentUser`.
  - Edit mode toggled by Edit button.
  - Inline validation error on over-length input (pre-submit).
  - API error message displayed on server rejection.
  - Name updated in UI on success.
- **DoD:** All test cases pass.

### F-4 — Accessibility review
- Ensure the edit input has a proper `aria-label`.
- Keyboard navigation: Enter → Save, Escape → Cancel.
- Error messages linked via `aria-describedby`.

---

## Cross-Cutting Tasks

### X-1 — Design Review
- Confirm max character limit (default: 100).
- Confirm allowed character set.
- UX mockup for inline edit vs modal.

### X-2 — Security Review
- Confirm name output is HTML-encoded in all render locations.
- Confirm `createSessionValidationMiddleware` is sufficient (no RBAC change needed).

### X-3 — Database Migration (if applicable)
- Confirm the `name` column already exists in the `users` table (verify by checking `rowToEntity` symbol `16422075f5aedea8` and `UserEntity` symbol `39187f6dc36d1422`).
- If not present: create a migration in `BACKEND/db/migrations/`.
