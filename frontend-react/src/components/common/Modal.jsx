import { useEffect, useId, useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  busy = false,
}) {
  const titleId = useId();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (!busy) {
      closeButtonRef.current?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, busy, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropMouseDown = () => {
    if (!busy) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>

          <button
            ref={closeButtonRef}
            type="button"
            className="modal-close"
            onClick={() => {
              if (!busy) {
                onClose();
              }
            }}
            disabled={busy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
