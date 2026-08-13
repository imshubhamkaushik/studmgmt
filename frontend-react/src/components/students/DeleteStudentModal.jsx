import Modal from "../common/Modal";
import Button from "../common/Button";

export default function DeleteStudentModal({
  student,
  isDeleting,
  onConfirm,
  onClose,
  errorMessage,
}) {
  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={onClose}
      busy={isDeleting}
      title="Delete Student"
    >
      <div className="delete-modal-content">
        <p>
          Are you sure you want to delete <strong>{student?.name}</strong>?
        </p>

        <p className="warning-text">This action cannot be undone.</p>

        {errorMessage && (
          <div className="mutation-error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>

          <Button variant="danger" loading={isDeleting} onClick={onConfirm}>
            Delete Student
          </Button>
        </div>
      </div>
    </Modal>
  );
}
