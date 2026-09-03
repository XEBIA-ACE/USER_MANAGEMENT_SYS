# Spec: Change Password

## Story Reference
**Story:** Change Password  
**Repository:** `183f8218-bb77-4465-919a-6921d025e446/84814e78-c374-4631-88dc-24fcc52f1423`  
**Primary Focus Symbol:** `PasswordPolicy` (9894b91099bef75c) — Interface, `BACKEND/src/types/registration.types.ts` lines 49–56

---

## 1. Executive Summary

The repository already implements a **password-recovery reset flow** (request token → email delivery → reset with new password) but does **not** contain an authenticated "Change Password" feature, where a logged-in user provides their *current* password and a *new* password to update their credential in-place.

The graph confirms that:
- `PasswordController` (479e608c8456cd2b) exposes only `requestRecovery` (a52ebacb39c6a0ab) and `resetPassword` (1b4da33bc2466c8f), not a `changePassword` endpoint.
- `find_symbol` for `changePassword` returned **empty**.
- Session-based protection middleware (`createSessionValidationMiddleware` 1059263947d46148) exists and is already applied to `user-profile` and `deletion` routes — it must be applied to the new change-password route.
- `updatePasswordHash` (9cf6175131304446) already exists in `UserRepository` (8030f2e23dc77b07) and performs the SQL update for the users table.
- `DefaultPasswordPolicyEvaluator.evaluate` (40a5208083952355) already validates new passwords against `PasswordPolicy` (9894b91099bef75c) rules.
- `BcryptPasswordHasher.compare` (ed1f022ade782723) already supports current-password verification.

This story therefore requires **adding** a new HTTP endpoint, service method, controller method, and frontend page — reusing all existing security infrastructure.

---

## 2. Acceptance Criteria (Verified Against Graph)

| # | Criterion | Supporting Symbols |
|---|-----------|-------------------|
| AC-1 | Authenticated user submits correct current password + valid new password → password updated in DB | `BcryptPasswordHasher.compare` (ed1f022ade782723), `updatePasswordHash` (9cf6175131304446), `createSessionValidationMiddleware` (1059263947d46148) |
| AC-2 | New password fails `PasswordPolicy` (9894b91099bef75c) rules → `PasswordPolicyViolationException` (de2a634cb8e9de62) thrown and appropriate error returned | `DefaultPasswordPolicyEvaluator.evaluate` (40a5208083952355) |
| AC-3 | Incorrect current password → authentication error returned; no password change made | `BcryptPasswordHasher.compare` (ed1f022ade782723) |
| AC-4 | Frontend displays real-time `PasswordStrengthBar` (3a0d7960af5478d7) feedback during new-password entry | `PasswordStrengthBar` (3a0d7960af5478d7), `PasswordInput` (bc12da11e1a186f7) |
| AC-5 | Request rejected if no valid session token is present | `createSessionValidationMiddleware` (1059263947d46148) |

---

## 3. Scope of Change

### 3.1 New Symbols to Create

| Layer | Symbol Name | File | Rationale |
|-------|-------------|------|-----------|
| BACKEND — Service Interface | `ChangePasswordService` interface | `BACKEND/src/services/change-password.service.ts` (new) | Mirrors pattern of `PasswordRecoveryService` (bfc80d9d6d35767f) |
| BACKEND — Service Impl | `DefaultChangePasswordService` class | same file | Depends on `BcryptPasswordHasher` (28edeae7c394e78a), `DefaultPasswordPolicyEvaluator` (3b5783d0a76e5126), `UserRepository` (8030f2e23dc77b07) |
| BACKEND — Controller Method | `changePassword` method | `BACKEND/src/controllers/password.controller.ts` (modify) | Added to existing `PasswordController` (479e608c8456cd2b) |
| BACKEND — Route | `POST /password/change` | `BACKEND/src/routes/password.routes.ts` (modify) | Added to `createPasswordRouter` (0df584efe8a1987c); must apply `createSessionValidationMiddleware` (1059263947d46148) |
| BACKEND — Types | `ChangePasswordRequestDto` interface | `BACKEND/src/types/login.types.ts` (or new file) | Contains `currentPassword: string`, `newPassword: string` |
| BACKEND — Error | `IncorrectCurrentPasswordException` class | `BACKEND/src/errors/login.errors.ts` (modify) | Peer to `PasswordPolicyViolationException` (de2a634cb8e9de62) |
| FRONTEND — Page Component | `ChangePasswordTemplate` function | `FRONTEND/src/app/components/templates/ChangePasswordTemplate.tsx` (new) | Uses `PasswordInput` (bc12da11e1a186f7) and `PasswordStrengthBar` (3a0d7960af5478d7) |
| FRONTEND — API Client | `changePassword` API caller | `FRONTEND/src/app/lib/api-client.ts` (modify) | Peer to `authRequest` (737ac5f48a41f5ba) |

### 3.2 Existing Symbols to Reuse (No Modification)

| Symbol | ID | Role |
|--------|-----|------|
| `PasswordPolicy` (Interface) | 9894b91099bef75c | Policy shape used by evaluator |
| `PasswordValidationResult` (Interface) | 118961189d270be2 | Return type from evaluator |
| `DefaultPasswordPolicyEvaluator` (Class) | 3b5783d0a76e5126 | Validates new password |
| `evaluate` (Function) | 40a5208083952355 | Policy evaluation entry point |
| `BcryptPasswordHasher` (Class) | 28edeae7c394e78a | Hash new password; compare current |
| `PasswordHasher` (Interface) | 5aacd11fac25f96e | DI contract for hasher |
| `updatePasswordHash` (Function) | 9cf6175131304446 | Repository write |
| `UserRepository` (Class) | 8030f2e23dc77b07 | User data access |
| `IUserRepository` (Interface) | 5dc0c9164294a9a4 | DI contract for repository |
| `createSessionValidationMiddleware` (Function) | 1059263947d46148 | Session auth middleware |
| `PasswordPolicyViolationException` (Class) | de2a634cb8e9de62 | Policy violation error |
| `PasswordController` (Class) | 479e608c8456cd2b | Existing controller — extend with `changePassword` |
| `createPasswordRouter` (Function) | 0df584efe8a1987c | Existing router — add new route |
| `PasswordInput` (Function) | bc12da11e1a186f7 | Frontend password input molecule |
| `PasswordStrengthBar` (Function) | 3a0d7960af5478d7 | Frontend strength indicator |
| `passwordPolicyConfig` (Variable) | afbe6832e4d3c0bc | Password policy configuration |
| `PasswordRecoveryService` (Interface) | bfc80d9d6d35767f | Implementation pattern reference |
| `withTransaction` (Function) | 843dc4a386232260 | DB transaction wrapper |

---

## 4. API Contract

### POST `/password/change`

**Authentication:** Session cookie (enforced by `createSessionValidationMiddleware` 1059263947d46148)

**Request body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required)"
}
```

**Success (200):**
```json
{ "message": "Password updated successfully" }
```

**Error responses:**

| HTTP Status | Condition | Error Class |
|-------------|-----------|-------------|
| 400 | New password violates policy | `PasswordPolicyViolationException` (de2a634cb8e9de62) |
| 400 | Current password incorrect | `IncorrectCurrentPasswordException` (new) |
| 401 | No valid session | `createSessionValidationMiddleware` (1059263947d46148) rejection |
| 404 | User not found | `UserNotFoundException` (b108791803cc10c0) |

---

## 5. Service Logic: `DefaultChangePasswordService`

```
changePassword(userId, currentPassword, newPassword):
  1. Load user by userId via UserRepository.findById (25ac13796847ce72)
  2. Compare currentPassword with user.passwordHash using BcryptPasswordHasher.compare (ed1f022ade782723)
     → If mismatch: throw IncorrectCurrentPasswordException
  3. Evaluate newPassword via DefaultPasswordPolicyEvaluator.evaluate (40a5208083952355) with passwordPolicyConfig (afbe6832e4d3c0bc)
     → If invalid: throw PasswordPolicyViolationException (de2a634cb8e9de62)
  4. Hash newPassword with BcryptPasswordHasher.hash (8fb558192be2aad3)
  5. Persist new hash via UserRepository.updatePasswordHash (9cf6175131304446)
     (wrapped in withTransaction 843dc4a386232260)
  6. Return success
```

---

## 6. Frontend Change

- New `ChangePasswordTemplate` component at `FRONTEND/src/app/components/templates/ChangePasswordTemplate.tsx`
- Contains a form with:
  - `PasswordInput` (bc12da11e1a186f7) for **current password** (no strength bar)
  - `PasswordInput` (bc12da11e1a186f7) + `PasswordStrengthBar` (3a0d7960af5478d7) for **new password**
  - `PasswordInput` (bc12da11e1a186f7) for **confirm new password** (client-side match validation)
- `AccountDashboardTemplate` (7711e26c059cb4be) must link/route to the new page
- API call added to `api-client.ts` via authenticated request pattern used by `authRequest` (737ac5f48a41f5ba)

---

## 7. Security Requirements

1. **Session guard mandatory**: The route MUST be mounted with `createSessionValidationMiddleware` (1059263947d46148), consistent with how `createUserProfileRouter` (366b27e2b7466ba3) and `createDeletionRouter` (d1f3840f73d7602a) apply it.
2. **No information leakage**: HTTP 400 for both "wrong current password" and "policy violation" to avoid username enumeration.
3. **Bcrypt comparison** via `BcryptPasswordHasher.compare` (ed1f022ade782723) — no plain-text comparison.
4. **Atomic write**: `withTransaction` (843dc4a386232260) must wrap the `updatePasswordHash` call, matching the pattern in `resetPassword` (ed2ed6ac080f8231).
5. **Rate limiting**: `RateLimitGuard` (BACKEND/src/services/rate-limit.guard.ts, community 0) should be applied to this route as it is authentication-adjacent.

---

## 8. Risk Assessment

| Symbol Changed | Blast Radius Score | Band | Interpretation |
|---------------|-------------------|------|----------------|
| `PasswordController` (479e608c8456cd2b) | 10 / 100 | LOW | Impacts `createPasswordRouter` + `createApp` only |
| `DefaultPasswordPolicyEvaluator` (3b5783d0a76e5126) | 11 / 100 | LOW | Also impacts `createRegistrationRouter` |
| `updatePasswordHash` (9cf6175131304446) | 14 / 100 | LOW | Scoped to `user.repository.ts` module |
| `PasswordPolicy` (9894b91099bef75c) | 12 / 100 | LOW | Scoped to `registration.types.ts` module |
| `resetPassword` service (ed2ed6ac080f8231) | 1 / 100 | LOW | Minimal impact |

**Overall story risk: LOW.** All changes either add new symbols or extend existing low-blast-radius symbols. No high-fan-in hotspots (`UserRepository` fan-in=11 is the highest touched) are modified in a breaking way.

**Measured blast-radius count:** 3 impacted symbols (direct callers of `PasswordController`), spanning 2 impacted files (`password.routes.ts`, `app.ts`), plus 22 symbols in `user.repository.ts` module at depth ≤1 (none breaking). Zero impacted tests detected by blast-radius tool — a test gap exists (test_gap factor = 1.0) and new tests MUST be added.

---

## 9. Test Requirements

| Test | Type | Covers |
|------|------|--------|
| `DefaultChangePasswordService` correct flow | Unit | AC-1 |
| `DefaultChangePasswordService` wrong current password | Unit | AC-3 |
| `DefaultChangePasswordService` policy violation | Unit | AC-2 |
| `POST /password/change` unauthenticated | Integration | AC-5 |
| `POST /password/change` success | Integration | AC-1 |
| `ChangePasswordTemplate` form validation display | Frontend unit | AC-4 |

Pattern mirrors existing `BACKEND/src/services/password-recovery.service.test.ts` and `BACKEND/src/controllers/password.controller.test.ts`.
