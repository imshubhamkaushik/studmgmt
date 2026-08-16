import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentForm from "../StudentForm";

// Native <input type="date"> exposes a segmented (day/month/year) UI in
// real browsers rather than accepting a plain typed string, so we set its
// value directly via a change event instead of userEvent.type — this is
// the standard, reliable way to fill date inputs in RTL/jsdom.
const setDob = (value) =>
  fireEvent.change(screen.getByLabelText(/date of birth/i), {
    target: { value },
  });

describe("StudentForm", () => {
  it("shows validation errors and does not call onSubmit when required fields are empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<StudentForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(
      await screen.findByText(/name must contain at least 2 characters/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/roll number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/class is required/i)).toBeInTheDocument();
    expect(screen.getByText(/section is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a decimal roll number", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<StudentForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/full name/i), "Amelia Rao");
    await user.type(screen.getByLabelText(/roll number/i), "1.5");
    await user.type(screen.getByLabelText(/^class$/i), "10");
    await user.type(screen.getByLabelText(/section/i), "A");
    setDob("2012-05-01");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(
      await screen.findByText(/roll number must be a whole number/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits cleaned, correctly-typed values once every field is valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<StudentForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/full name/i), "Amelia Rao");
    await user.type(screen.getByLabelText(/roll number/i), "12");
    await user.type(screen.getByLabelText(/^class$/i), "10");
    await user.type(screen.getByLabelText(/section/i), "A");
    setDob("2012-05-01");
    await user.click(screen.getByRole("button", { name: /save student/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Amelia Rao");
    expect(submitted.rollNo).toBe(12);
    expect(typeof submitted.rollNo).toBe("number");
    expect(submitted.class).toBe("10");
    expect(submitted.section).toBe("A");
  });
});
