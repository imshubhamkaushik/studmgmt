import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Avatar from "../Avatar";

describe("Avatar", () => {
  it("renders the first and last initials for a full name", () => {
    render(<Avatar name="Priya Sharma" />);
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("renders two letters of a single-word name", () => {
    render(<Avatar name="Madonna" />);
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("falls back to a placeholder for an empty name", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("assigns the same background color to the same name every time", () => {
    const { container: first } = render(<Avatar name="Amelia Rao" />);
    const { container: second } = render(<Avatar name="Amelia Rao" />);
    const firstColor = first.querySelector(".avatar").style.background;
    const secondColor = second.querySelector(".avatar").style.background;
    expect(firstColor).toBe(secondColor);
  });

  it("applies the requested size class", () => {
    const { container } = render(<Avatar name="Test User" size="lg" />);
    expect(container.querySelector(".avatar-lg")).toBeInTheDocument();
  });
});
