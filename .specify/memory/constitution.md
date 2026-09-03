# Constitution: Non-Functional Requirements & Constraints

All facts below are derived exclusively from code-insights tool results (CI-GR-01).

---

## 1. Security Constraints

### SC-1 · Session Authentication Mandatory
**Source:** `createSessionValidationMiddleware` (1059263947d46148) — callers found via `get_call_graph`; applied to `createUserProfileRouter` (366b27e2b7466ba3) and `createDeletionRouter` (d1f3840f73d7602a).  
**Constraint:** The `POST /password/change` route MUST apply `createSessionValidationMiddleware` before the controller handler. No unauthenticated requests must reach the controller.

### SC-2 · Password Hashing via Bcrypt Only
**Source:** `BcryptPasswordHasher` (28edeae7c394e78a), `PasswordHasher` interface (5aacd11fac25f96e) — found via `find_symbol` and `get_call_graph`.  
**Constraint:** All password hashing and comparison MUST go through `PasswordHasher` (5aacd11fac25f96e). Direct use of bcrypt outside this class is prohibited.

### SC-3 · Policy Evaluation via Existing Evaluator
**Source:** `DefaultPasswordPolicyEvaluator.evaluate` (40a5208083952355) — confirmed callers: `registerUser` (3cbeebe10d6ab2c7) and `resetPassword` (ed2ed6ac080f8231). Policy config: `passwordPolicyConfig` (afbe6832e4d3c0bc).  
**Constraint:** New password MUST be evaluated against `PasswordPolicy` (9894b91099bef75c) via `evaluate` (40a5208083952355) before hashing or persisting. No bypass permitted.

### SC-4 · Atomic Database Write
**Source:** `withTransaction` (843dc4a386232260) — fan-in: 5; used by `resetPassword` (ed2ed6ac080f8231).  
**Constraint:** The call to `updatePasswordHash` (9cf6175131304446) MUST be wrapped in `withTransaction` (843dc4a386232260) to prevent partial writes.

### SC-5 · No Information Leakage
**Source:** `PasswordPolicyViolationException` (de2a634cb8e9de62) in `login.errors.ts` lines 129–138.  
**Constraint:** Error responses for incorrect current password and policy violation MUST use distinct but non-descriptive messages. Do not reveal whether a user account exists.

---

## 2. Architecture Constraints

### AC-1 · Community Membership
**Source:** `detect_communities` — `PasswordController` and `createPasswordRouter` are in Community 0 (size: 22), along with `password-recovery.service.ts`, `password-policy.evaluator.ts`, `registration.service.ts`, `rate-limit.guard.ts`, and frontend `PasswordStrengthBar.tsx`.  
**Constraint:** The new service and controller method MUST reside within Community 0's file boundaries. New files in `BACKEND/src/services/` and `BACKEND/src/controllers/` comply.

### AC-2 · Service Boundary Separation
**Source:** `architecture_overview` — BACKEND cohesion = 0.9930; FRONTEND cohesion = 0.9962.  
**Constraint:** No BACKEND logic may be imported into FRONTEND. The API boundary is the HTTP endpoint.

### AC-3 · DI-Based Construction
**Source:** `createPasswordRouter` (0df584efe8a1987c) — manually instantiates `BcryptPasswordHasher`, `PasswordRecoveryRequestRepository`, `UserRepository`, `DefaultPasswordPolicyEvaluator`, `PasswordController`. No IoC container detected.  
**Constraint:** `DefaultChangePasswordService` MUST be instantiated with explicit constructor injection inside `createPasswordRouter` (0df584efe8a1987c), following the existing manual DI pattern.

### AC-4 · Layering
**Source:** `trace_transaction` on `createPasswordRouter` — layers touched: `service`, `util`, `controller`, `repository`.  
**Constraint:** The call chain MUST respect the detected layer order: `controller → service → repository`. No controller may directly call a repository method.

### AC-5 · No New HTTP Routes Outside Router Factory
**Source:** `createApp` (591fa6260f974777) — single assembly point for all routers.  
**Constraint:** The new route MUST be registered inside `createPasswordRouter` (0df584efe8a1987c), not directly in `createApp`.

---

## 3. Performance Constraints

### PC-1 · Bcrypt Cost Factor
**Source:** `BcryptPasswordHasher` (28edeae7c394e78a), lines 30–44.  
**Constraint:** The bcrypt cost factor used in `hash` (8fb558192be2aad3) MUST match the existing application configuration for consistent timing. No new cost factor parameter.

### PC-2 · Single DB Round-trip for Hash Update
**Source:** `updatePasswordHash` (9cf6175131304446), lines 217–219 — single-statement function confirmed by blast-radius scope.  
**Constraint:** The password update MUST be a single parameterised SQL statement. No additional SELECT after the UPDATE in the same operation.

---

## 4. Test Coverage Constraints

### TC-1 · Test Gap Flag
**Source:** All blast-radius results returned `test_gap: 1.0` for `PasswordController` (479e608c8456cd2b) and `DefaultPasswordPolicyEvaluator` (3b5783d0a76e5126).  
**Constraint:** New service and controller code MUST achieve unit-test coverage for all three outcome branches (success, wrong current password, policy violation) before merge.

### TC-2 · Integration Test Pattern
**Source:** Existing integration specs: `login.integration.spec.ts`, `deletion.integration.spec.ts`.  
**Constraint:** An integration test verifying actual DB state change MUST be included. The test MUST read the updated hash from the DB using `UserRepository.findById` (25ac13796847ce72) post-change.

---

## 5. Dependency Constraints

### DC-1 · No New High-Severity CVEs
**Source:** `get_dependency_report` — 0 CVEs at HIGH+ severity across both `BACKEND/package.json` and `FRONTEND/package.json`.  
**Constraint:** No new npm dependencies with known HIGH or CRITICAL CVEs may be introduced for this story.

### DC-2 · No New Infrastructure
**Source:** `iac_index` returned 502 (query failed — not confirmed absent); existing architecture uses Postgres (inferred from `BACKEND/src/db/connection.ts` and migration files in `BACKEND/db/migrations/`).  
**Constraint:** No new database tables or migrations are required. `updatePasswordHash` (9cf6175131304446) operates on the existing users table.

---

## 6. Observability Constraints

### OC-1 · Error Propagation to Express Handler
**Source:** Existing `PasswordController.resetPassword` (1b4da33bc2466c8f) pattern — errors passed to `next()`.  
**Constraint:** The new `changePassword` controller method MUST pass all thrown exceptions to Express `next()`, preserving the existing error-handling middleware chain.
