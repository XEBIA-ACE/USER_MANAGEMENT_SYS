/**
 * RegistrationForm.test.js
 *
 * Tests for the User Registration with Email Validation feature.
 * Covers:
 *   - Unit tests: form rendering, field validation, email uniqueness check,
 *     secure storage, confirmation email dispatch
 *   - Integration tests: UI → backend → email system flow
 *   - Edge cases: duplicate email, empty fields, malformed email, long inputs
 *
 * Stack assumptions (adjust imports if your project differs):
 *   - React + React Testing Library for UI
 *   - Jest as the test runner
 *   - axios (or fetch) for HTTP calls — mocked via jest.mock
 *   - A RegistrationForm component at src/components/RegistrationForm
 *   - A registrationService module at src/services/registrationService
 *   - An emailService module at src/services/emailService
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ── Component & service imports ──────────────────────────────────────────────
// Adjust these paths to match your actual project layout.
import RegistrationForm from './src/components/RegistrationForm';
import * as registrationService from './src/services/registrationService';
import * as emailService from './src/services/emailService';

// ── Mock external dependencies ───────────────────────────────────────────────
jest.mock('./src/services/registrationService');
jest.mock('./src/services/emailService');

// ── Helpers ──────────────────────────────────────────────────────────────────
const fillForm = async (overrides = {}) => {
  const defaults = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'SecureP@ss1',
    confirmPassword: 'SecureP@ss1',
  };
  const values = { ...defaults, ...overrides };

  if (values.name !== undefined) {
    await userEvent.type(screen.getByLabelText(/name/i), values.name);
  }
  if (values.email !== undefined) {
    await userEvent.type(screen.getByLabelText(/email/i), values.email);
  }
  if (values.password !== undefined) {
    await userEvent.type(screen.getByLabelText(/^password/i), values.password);
  }
  if (values.confirmPassword !== undefined) {
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      values.confirmPassword
    );
  }
};

// ── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // Default happy-path mocks
  registrationService.checkEmailUniqueness.mockResolvedValue({ unique: true });
  registrationService.registerUser.mockResolvedValue({ success: true, userId: 'u-001' });
  emailService.sendConfirmationEmail.mockResolvedValue({ sent: true });
});

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — Form Rendering
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — rendering', () => {
  test('renders all required form fields', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('renders with empty fields by default', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('');
  });

  test('password fields are of type "password" (not plain text)', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — Field-level Validation
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — field validation', () => {
  test('shows error when name is empty on submit', async () => {
    render(<RegistrationForm />);
    await fillForm({ name: '' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  test('shows error when email is empty on submit', async () => {
    render(<RegistrationForm />);
    await fillForm({ email: '' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  test('shows error for malformed email address', async () => {
    render(<RegistrationForm />);
    await fillForm({ email: 'not-an-email' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  test('shows error when password is empty on submit', async () => {
    render(<RegistrationForm />);
    await fillForm({ password: '', confirmPassword: '' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('shows error when passwords do not match', async () => {
    render(<RegistrationForm />);
    await fillForm({ password: 'SecureP@ss1', confirmPassword: 'DifferentP@ss2' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('shows error for password that is too short (< 8 chars)', async () => {
    render(<RegistrationForm />);
    await fillForm({ password: 'short', confirmPassword: 'short' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('does not submit when validation errors are present', async () => {
    render(<RegistrationForm />);
    // Submit with all empty fields
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.registerUser).not.toHaveBeenCalled();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — Email Uniqueness Check
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — email uniqueness', () => {
  test('calls checkEmailUniqueness with the entered email on submit', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.checkEmailUniqueness).toHaveBeenCalledWith(
        'jane.doe@example.com'
      );
    });
  });

  test('shows duplicate-email error when email is already registered', async () => {
    registrationService.checkEmailUniqueness.mockResolvedValue({ unique: false });

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is already registered/i)).toBeInTheDocument();
    });
  });

  test('does not call registerUser when email is not unique', async () => {
    registrationService.checkEmailUniqueness.mockResolvedValue({ unique: false });

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.registerUser).not.toHaveBeenCalled();
    });
  });

  test('proceeds to registration when email is unique', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.registerUser).toHaveBeenCalledTimes(1);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — User Storage
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — user storage', () => {
  test('calls registerUser with correct payload', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          // password should be present but we do NOT assert its plain-text value
          // to allow hashing before the call
        })
      );
    });
  });

  test('does NOT send plain-text password in the registration payload', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      const [payload] = registrationService.registerUser.mock.calls[0];
      // The raw password string must not appear as a top-level plain-text field
      expect(payload.password).not.toBe('SecureP@ss1');
    });
  });

  test('shows success message after successful registration', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/registration successful/i)
      ).toBeInTheDocument();
    });
  });

  test('shows error message when registerUser call fails', async () => {
    registrationService.registerUser.mockRejectedValue(new Error('Server error'));

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — Confirmation Email Dispatch
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — confirmation email', () => {
  test('calls sendConfirmationEmail after successful registration', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    });
  });

  test('sends confirmation email to the registered email address', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'jane.doe@example.com' })
      );
    });
  });

  test('does NOT send confirmation email when registration fails', async () => {
    registrationService.registerUser.mockRejectedValue(new Error('DB error'));

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  test('shows email-sent notice to the user after confirmation email is dispatched', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/confirmation email sent/i)
      ).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — edge cases', () => {
  test('trims whitespace from email before submission', async () => {
    render(<RegistrationForm />);
    await fillForm({ email: '  jane.doe@example.com  ' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.checkEmailUniqueness).toHaveBeenCalledWith(
        'jane.doe@example.com'
      );
    });
  });

  test('handles very long name input gracefully (≤ 255 chars)', async () => {
    const longName = 'A'.repeat(255);
    render(<RegistrationForm />);
    await fillForm({ name: longName });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // Should still attempt registration without crashing
    await waitFor(() => {
      expect(registrationService.registerUser).toHaveBeenCalledTimes(1);
    });
  });

  test('shows error for name exceeding maximum length (> 255 chars)', async () => {
    const tooLongName = 'A'.repeat(256);
    render(<RegistrationForm />);
    await fillForm({ name: tooLongName });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is too long/i)).toBeInTheDocument();
    });
  });

  test('disables the submit button while a submission is in progress', async () => {
    // Make registerUser hang so we can inspect the in-flight state
    registrationService.registerUser.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
    });
  });

  test('handles network error from checkEmailUniqueness gracefully', async () => {
    registrationService.checkEmailUniqueness.mockRejectedValue(
      new Error('Network error')
    );

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  test('handles email with subaddress (plus addressing) as valid', async () => {
    render(<RegistrationForm />);
    await fillForm({ email: 'jane+test@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // Should NOT show an invalid-email error
    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });

  test('handles email with subdomain as valid', async () => {
    render(<RegistrationForm />);
    await fillForm({ email: 'jane@mail.example.co.uk' });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — UI ↔ Backend ↔ Email System
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — integration', () => {
  test('full happy-path: form submit → uniqueness check → store user → send email → success UI', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // 1. Email uniqueness checked first
    await waitFor(() => {
      expect(registrationService.checkEmailUniqueness).toHaveBeenCalledWith(
        'jane.doe@example.com'
      );
    });

    // 2. User stored in backend
    await waitFor(() => {
      expect(registrationService.registerUser).toHaveBeenCalledTimes(1);
    });

    // 3. Confirmation email dispatched
    await waitFor(() => {
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    });

    // 4. Success feedback shown in UI
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      expect(screen.getByText(/confirmation email sent/i)).toBeInTheDocument();
    });
  });

  test('duplicate-email path: uniqueness check fails → no storage → no email → error UI', async () => {
    registrationService.checkEmailUniqueness.mockResolvedValue({ unique: false });

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(registrationService.registerUser).not.toHaveBeenCalled();
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/email is already registered/i)).toBeInTheDocument();
    });
  });

  test('storage failure path: uniqueness passes → storage fails → no email → error UI', async () => {
    registrationService.registerUser.mockRejectedValue(new Error('DB unavailable'));

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  test('email dispatch failure: registration succeeds but email fails → partial-success UI', async () => {
    emailService.sendConfirmationEmail.mockRejectedValue(new Error('SMTP error'));

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    // Registration itself succeeded
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });

    // But email failure is surfaced to the user
    await waitFor(() => {
      expect(
        screen.getByText(/confirmation email could not be sent/i)
      ).toBeInTheDocument();
    });
  });

  test('operations are called in the correct order (uniqueness → register → email)', async () => {
    const callOrder = [];
    registrationService.checkEmailUniqueness.mockImplementation(async () => {
      callOrder.push('checkEmailUniqueness');
      return { unique: true };
    });
    registrationService.registerUser.mockImplementation(async () => {
      callOrder.push('registerUser');
      return { success: true, userId: 'u-001' };
    });
    emailService.sendConfirmationEmail.mockImplementation(async () => {
      callOrder.push('sendConfirmationEmail');
      return { sent: true };
    });

    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(callOrder).toEqual([
        'checkEmailUniqueness',
        'registerUser',
        'sendConfirmationEmail',
      ]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UX / UI MANUAL-EQUIVALENT TESTS
// (Automated proxies for the manual UX checks listed in the acceptance criteria)
// ════════════════════════════════════════════════════════════════════════════
describe('RegistrationForm — UX/UI requirements', () => {
  test('form resets after successful registration', async () => {
    render(<RegistrationForm />);
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });

    // Fields should be cleared
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('');
  });

  test('inline validation errors are cleared when the user corrects the field', async () => {
    render(<RegistrationForm />);

    // Trigger email error
    await userEvent.type(screen.getByLabelText(/email/i), 'bad-email');
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    // Correct the email
    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'good@example.com');
    fireEvent.blur(screen.getByLabelText(/email/i));

    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });

  test('submit button is accessible and has a descriptive label', () => {
    render(<RegistrationForm />);
    const btn = screen.getByRole('button', { name: /register/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  test('all form fields have associated labels (accessibility)', () => {
    render(<RegistrationForm />);
    // getByLabelText throws if no matching label exists — this doubles as an a11y check
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });
});
