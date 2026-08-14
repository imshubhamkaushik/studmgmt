import { useEffect, useId, useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  busy = false,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }

    if (isOpen && !busy) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen, busy]);

  const handleClose = () => {
    if (!busy) {
      onClose();
    }
  };

  const handleCancel = (event) => {
    if (busy) {
      event.preventDefault();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onClose={handleClose}
      onCancel={handleCancel}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>

        <button
          ref={closeButtonRef}
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>

      {children}
    </dialog>
  );
}
