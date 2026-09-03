"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/app/components/molecules/PasswordInput";
import PasswordStrengthBar from "@/app/components/molecules/PasswordStrengthBar";
import { changePassword } from "@/app/lib/api-client";

interface PasswordPolicyViolation {
  field: string;
  message: string;
}

interface RegisterUserPasswordPolicyErrorResponse {
  message: string;
  violations?: PasswordPolicyViolation[];
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

function mapServerError(error: unknown): FormErrors {
  if (error instanceof Error) {
    const message = error.message;

    // Map known server-side error messages to user-facing errors
    if (
      message.toLowerCase().includes("current password") ||
      message.toLowerCase().includes("incorrect")
    ) {
      return { currentPassword: "The current password you entered is incorrect." };
    }

    // Attempt to parse as RegisterUserPasswordPolicyErrorResponse shape
    try {
      const parsed: RegisterUserPasswordPolicyErrorResponse = JSON.parse(message);
      if (parsed.violations && parsed.violations.length > 0) {
        return {
          newPassword: parsed.violations.map((v) => v.message).join(" "),
        };
      }
      if (parsed.message) {
        return { newPassword: parsed.message };
      }
    } catch {
      // Not JSON — use raw message
    }

    if (
      message.toLowerCase().includes("password policy") ||
      message.toLowerCase().includes("policy") ||
      message.toLowerCase().includes("too short") ||
      message.toLowerCase().includes("too weak") ||
      message.toLowerCase().includes("uppercase") ||
      message.toLowerCase().includes("lowercase") ||
      message.toLowerCase().includes("digit") ||
      message.toLowerCase().includes("special")
    ) {
      return { newPassword: message };
    }

    return { general: message };
  }

  return { general: "An unexpected error occurred. Please try again." };
}

export default function ChangePasswordTemplate() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  function validateForm(): FormErrors {
    const validationErrors: FormErrors = {};

    if (!currentPassword) {
      validationErrors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      validationErrors.newPassword = "New password is required.";
    } else if (newPassword === currentPassword) {
      validationErrors.newPassword =
        "New password must be different from your current password.";
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = "Please confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      validationErrors.confirmPassword = "Passwords do not match.";
    }

    return validationErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrors({});
    setSuccessMessage("");

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage("Your password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to Account Dashboard after a short delay
      setTimeout(() => {
        router.push("/account");
      }, 2000);
    } catch (error: unknown) {
      const serverErrors = mapServerError(error);
      setErrors(serverErrors);
    } finally {
      setIsLoading(false);
    }
  }

  const isFormDisabled = isLoading;

  return (
    <div className="change-password-template">
      <div className="change-password-template__container">
        <h1 className="change-password-template__title">Change Password</h1>

        {successMessage && (
          <div
            className="change-password-template__success"
            role="alert"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div
            className="change-password-template__error change-password-template__error--general"
            role="alert"
            aria-live="polite"
          >
            {errors.general}
          </div>
        )}

        <form
          className="change-password-template__form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Change password form"
        >
          {/* Current Password Field */}
          <div className="change-password-template__field">
            <PasswordInput
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={(value: string) => {
                setCurrentPassword(value);
                if (errors.currentPassword) {
                  setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                }
              }}
              disabled={isFormDisabled}
              error={errors.currentPassword}
              autoComplete="current-password"
            />
            {errors.currentPassword && (
              <span
                className="change-password-template__field-error"
                role="alert"
                id="current-password-error"
              >
                {errors.currentPassword}
              </span>
            )}
          </div>

          {/* New Password Field */}
          <div className="change-password-template__field">
            <PasswordInput
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={(value: string) => {
                setNewPassword(value);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              disabled={isFormDisabled}
              error={errors.newPassword}
              autoComplete="new-password"
            />
            <PasswordStrengthBar password={newPassword} />
            {errors.newPassword && (
              <span
                className="change-password-template__field-error"
                role="alert"
                id="new-password-error"
              >
                {errors.newPassword}
              </span>
            )}
          </div>

          {/* Confirm New Password Field */}
          <div className="change-password-template__field">
            <PasswordInput
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(value: string) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              disabled={isFormDisabled}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span
                className="change-password-template__field-error"
                role="alert"
                id="confirm-password-error"
              >
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <div className="change-password-template__actions">
            <button
              type="submit"
              className="change-password-template__submit-button"
              disabled={isFormDisabled}
              aria-busy={isLoading}
            >
              {isLoading ? "Updating Password…" : "Update Password"}
            </button>

            <button
              type="button"
              className="change-password-template__cancel-button"
              disabled={isFormDisabled}
              onClick={() => router.push("/account")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}