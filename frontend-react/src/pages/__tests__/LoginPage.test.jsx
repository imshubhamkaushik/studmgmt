import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { useAuth } from "../../auth/useAuth";

vi.mock("../../auth/useAuth", () => ({ useAuth: vi.fn() }));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it("calls login with the entered credentials on submit", async () => {
    const login = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "admin@studenthub.test");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPassword123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith({
      email: "admin@studenthub.test",
      password: "StrongPassword123!",
    });
  });

  it("shows a server error message when login fails and does not crash", async () => {
    const login = vi
      .fn()
      .mockRejectedValue({ status: 423, message: "Account is temporarily locked." });
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "locked@studenthub.test");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPassword123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/account is temporarily locked/i),
    ).toBeInTheDocument();
  });

  it("toggles the password field between hidden and visible text", async () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
