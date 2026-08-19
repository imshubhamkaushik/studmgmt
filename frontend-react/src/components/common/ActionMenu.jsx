import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ActionMenu({ items, label = "More actions" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="action-menu" ref={containerRef}>
      <button
        type="button"
        className="action-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="action-menu-list" role="menu">
          {items.map((item) =>
            item.divider ? (
              <hr
                className="action-menu-divider"
                key={item.key || item.label}
              />
            ) : (
              <button
                key={item.key || item.label}
                type="button"
                role="menuitem"
                className={`action-menu-item${
                  item.danger ? " action-menu-item-danger" : ""
                }`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon && <item.icon size={14} aria-hidden="true" />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
