import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { AccountDeletionTemplate } from "./AccountDeletionTemplate";
import * as apiClient from "../../lib/api-client";
import * as session from "../../lib/session";
import { setSession } from "../../lib/session";

vi.mock("../../lib/api-client", () => ({
  requestAccountDeletion: vi.fn(),
  confirmAccountDeletion: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("../../lib/useCurrentUser", () => ({
  useCurrentUser: () => ({
    profile: { id: "user-1", username: "jane", email: "jane@example.com" },
    loading: false,
  }),
}));

vi.mock("../organisms/IdentityVerificationCard", () => ({
  IdentityVerificationCard: ({ onVerified }: { onVerified: () => void }) => (
    <button type="button" onClick={onVerified}>Verify identity (stub)</button>
  ),
}));

const requestAccountDeletion = vi.mocked(apiClient.requestAccountDeletion);
const confirmAccountDeletion = vi.mocked(apiClient.confirmAccountDeletion);

const TOKEN = "session-token-123";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/delete-account"]}>
      <Routes>
        <Route path="/delete-account" element={<AccountDeletionTemplate />} />
        <Route path="/login" element={<h1>Login page</h1>} />
        <Route path="/" element={<h1>Landing page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openConfirmationDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Verify identity (stub)" }));
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Delete my account permanently" }));
  return screen.getByRole("dialog");
}

async function reachOtpStep(user: ReturnType<typeof userEvent.setup>) {
  requestAccountDeletion.mockResolvedValue({ ok: true, data: { message: "sent" } });
  await openConfirmationDialog(user);
  await user.click(screen.getByRole("button", { name: /yes, permanently delete my account/i }));
  await screen.findByRole("heading", { name: "Enter Confirmation Code" });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession(TOKEN, "2099-01-01T00:00:00.000Z", "jane@example.com");
});

describe("AccountDeletionTemplate — confirmation dialog (AC-1)", () => {
  test("shows the confirmation dialog when the user initiates deletion", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openConfirmationDialog(user);

    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Are you sure?" })).toBeInTheDocument();
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  test("cancelling the dialog closes it without requesting deletion", async () => {
    const user = userEvent.setup();
    renderPage();
    await openConfirmationDialog(user);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  test("confirming the dialog requests deletion and advances to the OTP step", async () => {
    const user = userEvent.setup();
    renderPage();

    await reachOtpStep(user);

    expect(requestAccountDeletion).toHaveBeenCalledWith(TOKEN);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "6-digit verification code" })).toBeInTheDocument();
  });

  test("shows a friendly error inside the dialog when the request is rejected", async () => {
    const user = userEvent.setup();
    requestAccountDeletion.mockResolvedValue({
      ok: false,
      status: 409,
      body: { error_code: "DELETION_REQUEST_ALREADY_PENDING" },
    });
    renderPage();
    const dialog = await openConfirmationDialog(user);

    await user.click(screen.getByRole("button", { name: /yes, permanently delete my account/i }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/already have a pending deletion request/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("AccountDeletionTemplate — OTP confirmation & goodbye (AC-2, AC-4)", () => {
  test("a valid code confirms deletion, clears the session and shows the goodbye screen", async () => {
    const user = userEvent.setup();
    const clearSessionSpy = vi.spyOn(session, "clearSession");
    confirmAccountDeletion.mockResolvedValue({
      ok: true,
      data: { userId: "user-1", deletedAt: "2026-01-01T00:00:00.000Z" },
    });
    renderPage();
    await reachOtpStep(user);

    await user.keyboard("123456");

    await waitFor(() => expect(confirmAccountDeletion).toHaveBeenCalledWith(TOKEN, "123456"));
    expect(await screen.findByRole("heading", { name: "Account Deleted" })).toBeInTheDocument();
    expect(screen.getByText(/we're sorry to see you go/i)).toBeInTheDocument();
    expect(clearSessionSpy).toHaveBeenCalledTimes(1);
    expect(session.getSessionToken()).toBeNull();
    expect(session.getSessionEmail()).toBeNull();
    expect(screen.queryByRole("group", { name: "6-digit verification code" })).not.toBeInTheDocument();
  });

  test("the goodbye screen offers a way back to the landing page", async () => {
    const user = userEvent.setup();
    confirmAccountDeletion.mockResolvedValue({
      ok: true,
      data: { userId: "user-1", deletedAt: "2026-01-01T00:00:00.000Z" },
    });
    renderPage();
    await reachOtpStep(user);
    await user.keyboard("123456");
    await screen.findByRole("heading", { name: "Account Deleted" });

    await user.click(screen.getByRole("button", { name: "Return to Home" }));

    expect(screen.getByRole("heading", { name: "Landing page" })).toBeInTheDocument();
  });

  test("redirects to login when no session token is present at confirmation time", async () => {
    const user = userEvent.setup();
    renderPage();
    await reachOtpStep(user);
    session.clearSession();

    await user.keyboard("123456");

    expect(await screen.findByRole("heading", { name: "Login page" })).toBeInTheDocument();
    expect(confirmAccountDeletion).not.toHaveBeenCalled();
  });
});

describe("AccountDeletionTemplate — OTP error handling (AC-3)", () => {
  test.each([
    ["DELETION_OTP_INVALID", 422, /that code isn't correct/i],
    ["DELETION_OTP_EXPIRED", 410, /this code has expired/i],
    ["DELETION_REQUEST_NOT_FOUND", 404, /no longer pending/i],
  ] as const)("%s maps to a user-friendly message and keeps the session", async (errorCode, status, expected) => {
    const user = userEvent.setup();
    confirmAccountDeletion.mockResolvedValue({
      ok: false,
      status,
      body: { error_code: errorCode, error: "internal: stack trace details" },
    });
    renderPage();
    await reachOtpStep(user);

    await user.keyboard("000000");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(expected);
    expect(alert).not.toHaveTextContent(/stack trace/i);
    expect(screen.queryByRole("heading", { name: "Account Deleted" })).not.toBeInTheDocument();
    expect(session.getSessionToken()).toBe(TOKEN);
  });

  test("clears the entered code after a rejected attempt so the user can retry", async () => {
    const user = userEvent.setup();
    confirmAccountDeletion
      .mockResolvedValueOnce({ ok: false, status: 422, body: { error_code: "DELETION_OTP_INVALID" } })
      .mockResolvedValueOnce({ ok: true, data: { userId: "user-1", deletedAt: "2026-01-01T00:00:00.000Z" } });
    renderPage();
    await reachOtpStep(user);

    await user.keyboard("000000");
    await screen.findByRole("alert");

    await user.keyboard("123456");

    await waitFor(() => expect(confirmAccountDeletion).toHaveBeenLastCalledWith(TOKEN, "123456"));
    expect(await screen.findByRole("heading", { name: "Account Deleted" })).toBeInTheDocument();
  });
});
