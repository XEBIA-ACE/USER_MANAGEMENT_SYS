# Implementation Plan

## Phased Delivery

### Phase 1 — Backend Data Layer (Sprint task P1)

**File:** `BACKEND/src/repositories/user.repository.ts`
- `IUserRepository` interface (symbol `5dc0c9164294a9a4`, lines 19–42): add `updateName(userId: string, name: string): Promise<void>` method signature.
- `UserRepository` class (symbol `8030f2e23dc77b07`, lines 88–254): implement `updateName` following the pattern of `updatePasswordHash` (symbol `9cf6175131304446`, lines 217–219).

**Blast-radius evidence:** modifying `user.repository.ts` carries a score of **7 (LOW)** but impacts 32 symbols across 25 files. The `IUserRepository` interface change is an additive extension; no existing implementation is changed. Integration tests `buildProtectedTestApp` (symbols `5582b468742f337d`, `6a527d7d4ea7861f`) are inside the impacted test list and will catch regressions.

---

### Phase 2 — Backend Service Layer (Sprint task P2)

**File:** `BACKEND/src/services/user-profile.service.ts`
- `UserProfileService` interface (symbol `2b3db1f0bd46decb`): add `updateName(userId: string, name: string): Promise<void>`.
- `DefaultUserProfileService` class (symbol `e69bdf959fae27f6`): implement, calling `findById` (symbol `25ac13796847ce72`) + `updateName` (new).
- Input validation inline or via a new `NameValidator` class; reuse `ValidationError` (symbol `29d29dbcef350ea0`) throw pattern.

**Blast-radius evidence:** `user-profile.service.ts` has score **11 (LOW)**, 3 impacted symbols. No downstream services depend on this service.

---

### Phase 3 — Backend Controller & Route (Sprint task P3)

**File:** `BACKEND/src/controllers/user-profile.controller.ts`
- `UserProfileController` class (symbol `ba3e7896c2cc3cf7`, lines 16–41): add `updateName(req, res)` method.

**File:** `BACKEND/src/routes/user-profile.routes.ts`
- `createUserProfileRouter` (symbol `366b27e2b7466ba3`, lines 24–39): register `PATCH /me/name` route with `createSessionValidationMiddleware`.

**File:** `BACKEND/src/types/user-profile.types.ts`
- Add `UpdateNameRequestDto` interface (new type alongside `UserProfileResult` symbol `980c3c8434d3b498`).

**Blast-radius evidence:** `user-profile.controller.ts` file has score **10 (LOW)**, 2 impacted symbols. Route change is additive only.

---

### Phase 4 — Backend Tests (Sprint task P4)

- Extend `BACKEND/src/services/user-profile.service.test.ts` (existing `service` variable `5fdcfe40eda91b1a`): add test cases for `updateName`.
- Extend `BACKEND/src/controllers/user-profile.controller.test.ts` (existing `controller` variable `4dd574400a3f0fbb`): add `updateName` handler tests.
- Add integration test block in a new `BACKEND/src/integration/user-profile.integration.spec.ts` mirroring the `login.integration.spec.ts` / `buildProtectedTestApp` pattern (symbols `5582b468742f337d`, `6a527d7d4ea7861f`).

---

### Phase 5 — Frontend API Client (Sprint task P5)

**File:** `FRONTEND/src/app/lib/api-client.ts`
- Add `updateUserName(name: string): Promise<UserProfileResponse>` function.
- Handles `ProfileErrorResponse` (symbol `c2ce62588cf5d2f6`) from the server.

---

### Phase 6 — Frontend UI (Sprint task P6)

**File:** `FRONTEND/src/app/components/templates/AccountDashboardTemplate.tsx`
- `AccountDashboardTemplate` (symbol `7711e26c059cb4be`, lines 22–83): add inline name-edit form.
- Wires `updateUserName` from the new API client.
- On success: refresh state from `useCurrentUser` (symbol `1c9988910bdacb63`); the three consuming templates (`AccountDashboardTemplate`, `DashboardTemplate` symbol `0f81f555d59a3890`, `AccountDeletionTemplate` symbol `b986af725df941d7`) will automatically reflect the updated name.
- On error: display `ProfileErrorResponse.message` inline.
- Client-side pre-validation (max 100 chars, character allowlist) for UX performance.

---

### Phase 7 — Frontend Tests (Sprint task P7)

- Unit test for `AccountDashboardTemplate` covering success and error paths.
- Optionally add E2E test for the full edit-name flow.

---

## Dependency Order

```
P1 (repository) → P2 (service) → P3 (controller/route) → P4 (backend tests)
                                                          → P5 (frontend API) → P6 (frontend UI) → P7 (frontend tests)
```

P5/P6/P7 can proceed in parallel with P3/P4 once P2's contract is agreed.
