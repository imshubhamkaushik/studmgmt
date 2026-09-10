import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PortalLoginPage from "../PortalLoginPage";
import { usePortalAuth } from "../../auth/usePortalAuth";

vi.mock("../../auth/usePortalAuth", () => ({ usePortalAuth: vi.fn() }));

function renderPortalLoginPage() {
  return render(
    <MemoryRouter>
      <PortalLoginPage />
    </MemoryRouter>,
  );
}

describe("PortalLoginPage", () => {
  beforeEach(() => {
    usePortalAuth.mockReset();
  });

  it("calls login with the entered username and password on submit", async () => {
    const login = vi.fn().mockResolvedValue({});
    usePortalAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderPortalLoginPage();

    await user.type(screen.getByLabelText(/student id or parent username/i), "STU-000123");
    await user.type(screen.getByLabelText(/^password$/i), "some-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith({ username: "STU-000123", password: "some-password" });
  });

  it("shows a server error message when login fails and does not crash", async () => {
    const login = vi.fn().mockRejectedValue({ status: 401, message: "Invalid credentials." });
    usePortalAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderPortalLoginPage();

    await user.type(screen.getByLabelText(/student id or parent username/i), "STU-000123");
    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("mentions the -parent username convention for guardians", () => {
    usePortalAuth.mockReturnValue({ login: vi.fn() });
    renderPortalLoginPage();

    expect(screen.getByText(/STU-000123-parent/)).toBeInTheDocument();
  });
});
