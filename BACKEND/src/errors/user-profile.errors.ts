/**
 * user-profile.errors.ts
 *
 * Custom domain error classes for the User Profile feature.
 * All errors extend the built-in Error class so they are instanceof-compatible
 * with standard JS error handling, matching the convention established in
 * registration.errors.ts.
 */

// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the submitted user profile data fails schema validation.
 */
export class UserProfileValidationError extends Error {
  public readonly code: string;
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'UserProfileValidationError';
    this.code = 'USER_PROFILE_VALIDATION_ERROR';
    this.field = field;
    Object.setPrototypeOf(this, UserProfileValidationError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Not found errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a user profile cannot be found for the given user ID.
 */
export class UserProfileNotFoundException extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`User profile not found for user '${userId}'.`);
    this.name = 'UserProfileNotFoundException';
    this.userId = userId;
    Object.setPrototypeOf(this, UserProfileNotFoundException.prototype);
  }
}

// ---------------------------------------------------------------------------
// Conflict errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a user profile already exists for the given user ID.
 */
export class UserProfileAlreadyExistsException extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`A profile already exists for user '${userId}'.`);
    this.name = 'UserProfileAlreadyExistsException';
    this.userId = userId;
    Object.setPrototypeOf(this, UserProfileAlreadyExistsException.prototype);
  }
}
