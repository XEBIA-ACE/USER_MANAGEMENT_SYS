import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof DeleteConfirmationModal>> = {}) {
  const props = {
    isOpen: true,
    loading: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const utils = render(<DeleteConfirmationModal {...props} />);
  return { ...utils, props };
}

describe("DeleteConfirmationModal", () => {
  test("renders nothing when closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders an accessible modal dialog with warning copy when open", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    expect(screen.getByRole("heading", { name: "Are you sure?" })).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  test("moves focus into the dialog on open and restores it on close", () => {
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    outside.focus();

    const { rerender, props } = renderModal();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    rerender(<DeleteConfirmationModal {...props} isOpen={false} />);
    expect(outside).toHaveFocus();
    outside.remove();
  });

  test("calls onConfirm when the destructive button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole("button", { name: /yes, permanently delete my account/i }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  test("is dismissible via Cancel, the close [X] button, and the backdrop", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await user.click(screen.getByRole("dialog").firstElementChild as HTMLElement);

    expect(props.onCancel).toHaveBeenCalledTimes(3);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  test("is dismissible via the Escape key", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.keyboard("{Escape}");

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  test("traps Tab focus within the dialog", async () => {
    const user = userEvent.setup();
    renderModal();

    const closeButton   = screen.getByRole("button", { name: "Close dialog" });
    const confirmButton = screen.getByRole("button", { name: /yes, permanently delete my account/i });
    const cancelButton  = screen.getByRole("button", { name: "Cancel" });

    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  test("shows the error message as an alert", () => {
    renderModal({ error: "You already have a pending deletion request." });
    expect(screen.getByRole("alert")).toHaveTextContent("You already have a pending deletion request.");
  });

  test("disables all actions and ignores Escape while loading", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ loading: true });

    expect(screen.getByRole("button", { name: /deleting account/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
