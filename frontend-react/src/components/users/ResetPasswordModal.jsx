import { useState } from "react";
import { Eye, EyeOff, Dices, Copy, Check } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";

function generateStrongPassword(length = 16) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join("");
}

export default function ResetPasswordModal({
  user,
  isSubmitting,
  onConfirm,
  onClose,
  errorMessage,
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  const generate = () => {
    setPassword(generateStrongPassword());
    setShowPassword(true);
    setCopied(false);
  };

  const copy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={handleClose}
      busy={isSubmitting}
      title="Reset Password"
    >
      <div className="delete-modal-content">
        <p>
          Set a new password for <strong>{user?.name}</strong>. They'll need
          to sign in with it directly — there's no email reset flow, so
          you'll need to share it with them yourself.
        </p>

        <label htmlFor="reset-password-input" className="form-field-label">
          New password
        </label>
        <div className="input-icon-field auth-password-field">
          <input
            id="reset-password-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCopied(false);
            }}
            minLength={12}
            placeholder="Min 12 characters"
            style={{ paddingLeft: 12, paddingRight: 76 }}
          />
          <button
            type="button"
            className="auth-password-toggle"
            style={{ right: 38 }}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            type="button"
            className="auth-password-toggle"
            onClick={copy}
            disabled={!password}
            aria-label="Copy password"
            title="Copy password"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={generate}
          style={{ marginTop: 10 }}
        >
          <Dices size={14} aria-hidden="true" />
          Generate a strong password
        </button>

        {errorMessage && (
          <div className="mutation-error" role="alert" style={{ marginTop: 12 }}>
            {errorMessage}
          </div>
        )}

        <div className="modal-actions">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={password.length < 12}
            onClick={() => onConfirm(password)}
          >
            Reset Password
          </Button>
        </div>
      </div>
    </Modal>
  );
}
