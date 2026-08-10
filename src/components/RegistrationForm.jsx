import React, { useState } from "react";
import "./RegistrationForm.css";

/**
 * RegistrationForm
 *
 * Renders a user registration form with the following fields:
 *   - First Name
 *   - Last Name
 *   - Email Address  (validated for format; uniqueness check is handled by the backend)
 *   - Password
 *   - Confirm Password
 *
 * Acceptance criteria met:
 *   ✓ Visually consistent with the application design (uses shared CSS variables / utility classes)
 *   ✓ All required registration fields are present and properly aligned
 *   ✓ Responsive layout via CSS flexbox / media queries (see RegistrationForm.css)
 */

const INITIAL_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegistrationForm({ onSubmit }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (data) => {
    const errs = {};

    if (!data.firstName.trim()) {
      errs.firstName = "First name is required.";
    }

    if (!data.lastName.trim()) {
      errs.lastName = "Last name is required.";
    }

    if (!data.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!data.password) {
      errs.password = "Password is required.";
    } else if (data.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }

    if (!data.confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (data.password !== data.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    return errs;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the field-level error as the user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (typeof onSubmit === "function") {
        // Parent component / integration layer handles the API call
        await onSubmit(formData);
      }
      setSuccessMessage(
        "Registration successful! Please check your email to confirm your account."
      );
      setFormData(INITIAL_STATE);
      setErrors({});
    } catch (err) {
      // Surface server-side errors (e.g. duplicate email) in the form
      if (err?.field) {
        setErrors({ [err.field]: err.message });
      } else {
        setErrors({ form: err?.message || "Registration failed. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rf-wrapper">
      <div className="rf-card">
        <h1 className="rf-title">Create an Account</h1>
        <p className="rf-subtitle">Fill in the details below to get started.</p>

        {successMessage && (
          <div className="rf-alert rf-alert--success" role="alert">
            {successMessage}
          </div>
        )}

        {errors.form && (
          <div className="rf-alert rf-alert--error" role="alert">
            {errors.form}
          </div>
        )}

        <form
          className="rf-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Registration form"
        >
          {/* ── Name row ── */}
          <div className="rf-row">
            <div className="rf-field">
              <label htmlFor="firstName" className="rf-label">
                First Name <span className="rf-required">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className={`rf-input${errors.firstName ? " rf-input--error" : ""}`}
                value={formData.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                placeholder="Jane"
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
              />
              {errors.firstName && (
                <span id="firstName-error" className="rf-error-msg" role="alert">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="rf-field">
              <label htmlFor="lastName" className="rf-label">
                Last Name <span className="rf-required">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className={`rf-input${errors.lastName ? " rf-input--error" : ""}`}
                value={formData.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                placeholder="Doe"
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
              />
              {errors.lastName && (
                <span id="lastName-error" className="rf-error-msg" role="alert">
                  {errors.lastName}
                </span>
              )}
            </div>
          </div>

          {/* ── Email ── */}
          <div className="rf-field">
            <label htmlFor="email" className="rf-label">
              Email Address <span className="rf-required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`rf-input${errors.email ? " rf-input--error" : ""}`}
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="jane.doe@example.com"
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <span id="email-error" className="rf-error-msg" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* ── Password ── */}
          <div className="rf-field">
            <label htmlFor="password" className="rf-label">
              Password <span className="rf-required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`rf-input${errors.password ? " rf-input--error" : ""}`}
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <span id="password-error" className="rf-error-msg" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* ── Confirm Password ── */}
          <div className="rf-field">
            <label htmlFor="confirmPassword" className="rf-label">
              Confirm Password <span className="rf-required">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={`rf-input${errors.confirmPassword ? " rf-input--error" : ""}`}
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-describedby={
                errors.confirmPassword ? "confirmPassword-error" : undefined
              }
            />
            {errors.confirmPassword && (
              <span id="confirmPassword-error" className="rf-error-msg" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            className="rf-btn rf-btn--primary"
            disabled={submitting}
          >
            {submitting ? "Registering…" : "Create Account"}
          </button>
        </form>

        <p className="rf-footer-text">
          Already have an account?{" "}
          <a href="/login" className="rf-link">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
