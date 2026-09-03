<full file content>
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordTemplate } from './ChangePasswordTemplate';
import * as apiClient from '../../lib/api-client';

jest.mock('../../lib/api-client', () => ({
  changePassword: jest.fn(),
}));

jest.mock('../../molecules/PasswordStrengthBar', () => ({
  PasswordStrengthBar: ({ password }: { password: string }) =>
    password ? <div data-testid="password-strength-bar" /> : null,
}));

const mockChangePassword = apiClient.changePassword as jest.MockedFunction<
  typeof apiClient.changePassword
>;

describe('ChangePasswordTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Render test — component renders all three password fields and the submit button
  it('renders all three password fields and the submit button', () => {
    render(<ChangePasswordTemplate />);

    expect(
      screen.getByLabelText(/current password/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/new password/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/confirm.*password/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /change password/i })
    ).toBeInTheDocument();
  });

  // Test Case 2: Password strength bar — PasswordStrengthBar renders when new password field has a value
  it('renders PasswordStrengthBar when new password field has a value', async () => {
    render(<ChangePasswordTemplate />);

    expect(screen.queryByTestId('password-strength-bar')).not.toBeInTheDocument();

    const newPasswordInput = screen.getByLabelText(/new password/i);
    await userEvent.type(newPasswordInput, 'MyNewPassword1!');

    expect(screen.getByTestId('password-strength-bar')).toBeInTheDocument();
  });

  // Test Case 3: Confirm mismatch validation — error message shown when confirm password does not match new password
  it('shows an error message when confirm password does not match new password', async () => {
    render(<ChangePasswordTemplate />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'OldPassword1!');
    await userEvent.type(newPasswordInput, 'NewPassword1!');
    await userEvent.type(confirmPasswordInput, 'DifferentPassword1!');
    await userEvent.click(submitButton);

    expect(
      screen.getByText(/passwords do not match/i)
    ).toBeInTheDocument();

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  // Test Case 4: New equals current validation — error message shown when new password equals current password
  it('shows an error message when new password equals current password', async () => {
    render(<ChangePasswordTemplate />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'SamePassword1!');
    await userEvent.type(newPasswordInput, 'SamePassword1!');
    await userEvent.type(confirmPasswordInput, 'SamePassword1!');
    await userEvent.click(submitButton);

    expect(
      screen.getByText(/new password must be different from your current password/i)
    ).toBeInTheDocument();

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  // Test Case 5: Server error display — API error response (e.g., policy violation) is displayed to the user
  it('displays the error message from the API when the server returns an error', async () => {
    const apiErrorMessage = 'Password does not meet policy requirements';
    mockChangePassword.mockRejectedValueOnce(new Error(apiErrorMessage));

    render(<ChangePasswordTemplate />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'OldPassword1!');
    await userEvent.type(newPasswordInput, 'NewPassword1!');
    await userEvent.type(confirmPasswordInput, 'NewPassword1!');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(apiErrorMessage)).toBeInTheDocument();
    });

    expect(mockChangePassword).toHaveBeenCalledWith('OldPassword1!', 'NewPassword1!');
  });

  // Test Case 6: Successful submission — success confirmation is displayed after a successful API call
  it('displays a success confirmation message after a successful API call', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);

    render(<ChangePasswordTemplate />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'OldPassword1!');
    await userEvent.type(newPasswordInput, 'NewPassword1!');
    await userEvent.type(confirmPasswordInput, 'NewPassword1!');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/password updated successfully/i)
      ).toBeInTheDocument();
    });

    expect(mockChangePassword).toHaveBeenCalledWith('OldPassword1!', 'NewPassword1!');
  });
});