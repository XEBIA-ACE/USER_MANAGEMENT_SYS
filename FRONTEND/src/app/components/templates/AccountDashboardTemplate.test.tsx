```tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDashboardTemplate } from "./AccountDashboardTemplate";
import { useCurrentUser } from "../../lib/useCurrentUser";
import * as apiClient from "../../lib/api-client";
import { UserProfileResponse, ProfileErrorResponse } from "../../types/profile.types";

// Mock the useCurrentUser hook
jest.mock("../../lib/useCurrentUser");

// Mock the api-client module
jest.mock("../../lib/api-client", () => ({
  ...jest.requireActual("../../lib/api-client"),
  updateUserName: jest.fn(),
}));

// Mock getSessionEmail if used by AccountDashboardTemplate
jest.mock("../../lib/getSessionEmail", () => ({
  getSessionEmail: jest.fn(() => "test@example.com"),
}));

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUpdateUserName = apiClient.updateUserName as jest.MockedFunction<typeof apiClient.updateUserName>;

const buildUserProfile = (overrides?: Partial<UserProfileResponse>): UserProfileResponse => ({
  id: "user-123",
  name: "Jane Doe",
  email: "jane.doe@example.com",
  ...overrides,
});

describe("AccountDashboardTemplate — name-editing functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders current name
  it("renders the current user name from useCurrentUser", () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AccountDashboardTemplate />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  // Test 2: Edit mode toggle
  it("enters edit mode when the Edit button is clicked, showing an input pre-filled with the current name and Save/Cancel buttons", async () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AccountDashboardTemplate />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    const input = screen.getByRole("textbox", { name: /name/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Jane Doe");

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  // Test 3: Client-side validation — over-length input
  it("shows an inline error and does NOT call updateUserName when the name exceeds 100 characters", async () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AccountDashboardTemplate />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    const input = screen.getByRole("textbox", { name: /name/i });
    const longName = "A".repeat(101);
    await userEvent.clear(input);
    await userEvent.type(input, longName);

    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    expect(mockUpdateUserName).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Assert that an inline error message related to name length is shown
    expect(
      screen.getByText(/100 characters|too long|maximum/i)
    ).toBeInTheDocument();
  });

  // Test 4: Client-side validation — invalid characters
  it("shows an inline error and does NOT call updateUserName when the name contains invalid characters", async () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AccountDashboardTemplate />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    const input = screen.getByRole("textbox", { name: /name/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Jane<script>alert(1)</script>");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    expect(mockUpdateUserName).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/invalid characters|only letters|allowed characters/i)
    ).toBeInTheDocument();
  });

  // Test 5: API error display
  it("displays the server error message inline when updateUserName rejects with a ProfileErrorResponse", async () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    const refetchMock = jest.fn();
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: refetchMock,
    });

    const profileError: ProfileErrorResponse = {
      message: "Name update failed due to a server error.",
      code: "UPDATE_FAILED",
    };
    mockUpdateUserName.mockRejectedValueOnce(profileError);

    render(<AccountDashboardTemplate />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    const input = screen.getByRole("textbox", { name: /name/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Valid Name");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Name update failed due to a server error.")).toBeInTheDocument();
    });

    expect(mockUpdateUserName).toHaveBeenCalledWith("Valid Name");
    expect(refetchMock).not.toHaveBeenCalled();
  });

  // Test 6: Successful update
  it("reflects the new name in the component and exits edit mode after a successful update", async () => {
    const originalUser = buildUserProfile({ name: "Jane Doe" });
    const updatedUser = buildUserProfile({ name: "Jane Smith" });
    const refetchMock = jest.fn();

    mockUseCurrentUser.mockReturnValue({
      user: originalUser,
      loading: false,
      error: null,
      refetch: refetchMock,
    });

    mockUpdateUserName.mockResolvedValueOnce(updatedUser);

    // After refetch, the hook returns the updated user
    mockUseCurrentUser.mockImplementation(() => {
      // On re-render after refetch, return the updated user
      return {
        user: updatedUser,
        loading: false,
        error: null,
        refetch: refetchMock,
      };
    });

    render(<AccountDashboardTemplate />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    const input = screen.getByRole("textbox", { name: /name/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Jane Smith");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUserName).toHaveBeenCalledWith("Jane Smith");
    });

    // Edit mode should be exited — Save/Cancel buttons should be gone
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });

    // The new name should be visible
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  // Test 7: Cancel button
  it("exits edit mode and shows the original name when Cancel is clicked", async () => {
    const user = buildUserProfile({ name: "Jane Doe" });
    mockUseCurrentUser.mockReturnValue({
      user,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<AccountDashboardTemplate />);

    // Enter edit mode
    const editButton = screen.getByRole("button", { name: /edit/i });
    await userEvent.click(editButton);

    // Modify the input
    const input = screen.getByRole("textbox", { name: /name/i });
    await userEvent.clear(input);
    await userEvent.type(input, "Some Other Name");
    expect(input).toHaveValue("Some Other Name");

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    // Edit mode should be exited
    expect(screen.queryByRole("textbox", { name: /name/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();

    // Original name should still be displayed
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();

    // updateUserName should not have been called
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });
});
```