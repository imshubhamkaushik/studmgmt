import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionMenu from "../ActionMenu";

function renderMenu(overrides = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <ActionMenu
      label="More actions"
      items={[
        { key: "edit", label: "Edit", onClick: onEdit },
        { key: "divider", divider: true },
        { key: "delete", label: "Delete", danger: true, onClick: onDelete, ...overrides.deleteItem },
      ]}
    />,
  );
  return { onEdit, onDelete };
}

describe("ActionMenu", () => {
  it("does not show menu items until the trigger is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("shows menu items after clicking the trigger", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls the item's onClick and closes the menu when an item is clicked", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("closes when clicking outside the menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside</button>
        <ActionMenu label="More actions" items={[{ key: "a", label: "Action", onClick: vi.fn() }]} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Action" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menuitem", { name: "Action" })).not.toBeInTheDocument();
  });

  it("does not call onClick for a disabled item", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderMenu({ deleteItem: { disabled: true } });
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
