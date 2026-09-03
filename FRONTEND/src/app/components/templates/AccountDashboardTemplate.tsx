```tsx
import React, { useState } from "react";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { updateUserName } from "../../lib/api-client";
import { ProfileErrorResponse } from "../../types/profile.types";

const NAME_MAX_LENGTH = 100;
// Unicode letters, marks, apostrophes, hyphens, and spaces
const NAME_PATTERN = /^[\p{L}\p{M}'\- ]+$/u;

function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Name cannot be empty.";
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!NAME_PATTERN.test(name)) {
    return "Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.";
  }
  return null;
}

export function AccountDashboardTemplate(): JSX.Element {
  const { user, loading, error, refetch } = useCurrentUser();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (): void => {
    setNameInput(user?.name ?? "");
    setValidationError(null);
    setServerError(null);
    setIsEditing(true);
  };

  const handleCancelClick = (): void => {
    setIsEditing(false);
    setNameInput("");
    setValidationError(null);
    setServerError(null);
  };

  const handleSaveClick = async (): Promise<void> => {
    setValidationError(null);
    setServerError(null);

    const clientError = validateName(nameInput);
    if (clientError !== null) {
      setValidationError(clientError);
      return;
    }

    setIsSaving(true);
    try {
      await updateUserName(nameInput);
      await refetch();
      setIsEditing(false);
      setNameInput("");
    } catch (err) {
      const profileError = err as ProfileErrorResponse;
      if (profileError && typeof profileError.message === "string") {
        setServerError(profileError.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inlineError = validationError ?? serverError;

  if (loading) {
    return (
      <div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p>Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Account Dashboard</h1>

      <section>
        <h2>Profile</h2>

        <div>
          <label htmlFor="account-email">Email</label>
          <p id="account-email">{user?.email}</p>
        </div>

        <div>
          <label>Name</label>
          {isEditing ? (
            <div>
              <label htmlFor="account-name-input" className="sr-only">
                Name
              </label>
              <input
                id="account-name-input"
                type="text"
                aria-label="Name"
                aria-describedby={inlineError ? "name-edit-error" : undefined}
                value={nameInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setNameInput(e.target.value)
                }
                disabled={isSaving}
                maxLength={NAME_MAX_LENGTH + 1}
              />
              {inlineError !== null && (
                <p
                  id="name-edit-error"
                  role="alert"
                  aria-live="polite"
                >
                  {inlineError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <span>{user?.name}</span>
              <button type="button" onClick={handleEditClick}>
                Edit
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AccountDashboardTemplate;
```