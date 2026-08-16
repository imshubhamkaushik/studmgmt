import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../ToastProvider";
import { useToast } from "../../../hooks/useToast";

function TriggerButtons() {
  const { show } = useToast();
  return (
    <>
      <button onClick={() => show("Saved successfully.")}>Show success</button>
      <button onClick={() => show("Something broke.", "error")}>Show error</button>
    </>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TriggerButtons />
    </ToastProvider>,
  );
}

describe("ToastProvider / useToast", () => {
  it("renders a success toast with the given message", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText("Show success"));
    expect(screen.getByText("Saved successfully.")).toBeInTheDocument();
  });

  it("applies the error styling class for error-type toasts", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText("Show error"));
    const toast = screen.getByText("Something broke.").closest(".toast");
    expect(toast).toHaveClass("toast-error");
  });

  it("dismisses a toast when its close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText("Show success"));
    expect(screen.getByText("Saved successfully.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Saved successfully.")).not.toBeInTheDocument();
  });

  it("can show more than one toast at a time", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByText("Show success"));
    await user.click(screen.getByText("Show error"));
    expect(screen.getByText("Saved successfully.")).toBeInTheDocument();
    expect(screen.getByText("Something broke.")).toBeInTheDocument();
  });
});
