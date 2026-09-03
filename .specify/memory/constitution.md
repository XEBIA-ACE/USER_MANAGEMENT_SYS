# Non-Functional Requirements & Constraints

## Derived from Code-Insights Structural Facts

### 1. Authentication (Mandatory)
- **Source:** `createSessionValidationMiddleware` (symbol `1059263947d46148`, `BACKEND/src/middleware/session-validation.middleware.ts`, lines 32–78) is applied to every route in `createUserProfileRouter` (symbol `366b27e2b7466ba3`).
- **Constraint:** The new `PATCH /me/name` endpoint **must** be gated by `createSessionValidationMiddleware`. No unauthenticated mutation is permitted.

### 2. Input Validation (Mandatory)
- **Source:** `ValidationError` (symbol `29d29dbcef350ea0`) is the project-standard error class for input violations. `DefaultRegistrationValidator` (symbol `6e79b25107bf1a07`) and its `validate` method (symbol `2feb6cee27b4c937`) demonstrate the established validation pattern.
- **Constraint:** All input validation must throw `ValidationError`; the controller maps this to HTTP 422. Client-side validation must mirror server rules.

### 3. Error Hierarchy (Mandatory)
- **Source:** The codebase has a typed error class hierarchy in `BACKEND/src/errors/registration.errors.ts`: `ValidationError` (`29d29dbcef350ea0`), `UsernameConflictError` (`a5004681e301e16d`), `UserNotFoundException` (`b108791803cc10c0`).
- **Constraint:** New error conditions for the name update feature must reuse existing error classes where semantically appropriate. A new `NameValidationError` subclass of `ValidationError` is acceptable; introducing an entirely parallel hierarchy is not.

### 4. Repository Interface Integrity (Mandatory)
- **Source:** `IUserRepository` (symbol `5dc0c9164294a9a4`) defines the repository contract; `UserRepository` (symbol `8030f2e23dc77b07`) is the sole confirmed concrete implementation (fan-in 11 across the codebase).
- **Constraint:** Any new repository method **must** be declared in `IUserRepository` first. Breaking the interface without updating the concrete class will cause TypeScript build failures.

### 5. Service Interface Integrity (Mandatory)
- **Source:** `UserProfileService` interface (symbol `2b3db1f0bd46decb`) defines the service contract.
- **Constraint:** New service methods must be declared in the interface before implementation in `DefaultUserProfileService` (symbol `e69bdf959fae27f6`).

### 6. Blast-Radius Budget (Advisory)
- **Source:** Blast-radius analysis returned score 11 (LOW) for `user-profile.service.ts`. Repository-level changes (score 7 LOW, but 32 impacted symbols) are wider-blast.
- **Constraint:** Changes to `user.repository.ts` must be additive only (new method; no change to existing method signatures). Run full integration tests after any repository change.

### 7. Test Gap (Critical)
- **Source:** `get_risk_score` on `user-profile.service.ts` returned `test_gap: 1.0`, meaning the blast-radius analysis found **zero impacted tests** for the user-profile service path.
- **Constraint:** The feature may not be merged without at minimum: (a) a service unit test, (b) a controller unit test, (c) an integration test for the PATCH route. This is a hard DoD gate.

### 8. Frontend State Propagation (Mandatory)
- **Source:** `useCurrentUser` (symbol `1c9988910bdacb63`, fan-in 3) is consumed by `AccountDashboardTemplate` (`7711e26c059cb4be`), `DashboardTemplate` (`0f81f555d59a3890`), and `AccountDeletionTemplate` (`b986af725df941d7`).
- **Constraint:** Any successful name update must invalidate / refresh the `useCurrentUser` hook state. The updated name must be visible across all three consuming templates without a full page reload.

### 9. TypeScript Strict Mode (Mandatory)
- **Source:** All 187 source files are TypeScript. Project uses strict TypeScript throughout.
- **Constraint:** No `any` types in new code. All DTOs and return types must be explicitly typed against existing interfaces (`UpdateNameRequestDto`, `UserProfileResult`, `UserProfileResponse`).

### 10. No CVEs Introduced (Mandatory)
- **Source:** `get_dependency_report` returned 0 CVEs across all dependencies (`BACKEND/package.json`, `FRONTEND/package.json`).
- **Constraint:** No new third-party packages may be introduced for name validation; use built-in TypeScript/JavaScript string validation only.

### 11. Architectural Layer Discipline (Mandatory)
- **Source:** `architecture_overview` identifies layers: services → controllers → routes. `trace_transaction` on `getMe` confirmed the flow: controller → service → repository.
- **Constraint:** Business logic (character limits, pattern matching) must live in the service layer, not the controller or route layer. Controllers only translate between HTTP and service calls.

### 12. No Architecture Decision Records (Advisory)
- **Source:** `adr_list` returned empty — no existing ADRs.
- **Constraint:** If this feature introduces a pattern that deviates from existing conventions (e.g., a new error class, a new DTO pattern), create an ADR via `adr_create` before merging.
