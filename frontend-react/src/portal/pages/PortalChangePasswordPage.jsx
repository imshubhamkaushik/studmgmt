import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import * as portalAuthApi from "../api/portalAuth";
import { usePortalAuth } from "../auth/usePortalAuth";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

export default function PortalChangePasswordPage() {
  const { logout } = usePortalAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setBusy(true);
    try {
      await portalAuthApi.changePassword({ currentPassword, newPassword });
      // A password change revokes every other session server-side (see
      // portal-auth.service.js), so this one needs to sign in again too
      // rather than silently carrying on with a now-stale refresh cookie.
      await logout();
      navigate("/portal/login", { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to change password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-page portal-page-narrow">
      <div className="page-heading">
        <p className="eyebrow">Account</p>
        <h1>Change password</h1>
        <p>Changing your password signs you out of every other device.</p>
      </div>

      <form className="form-card" onSubmit={submit}>
        {error && <div className="inline-error">{error}</div>}
        <label>
          <span>Current password</span>
          <div className="input-icon-field">
            <Lock size={16} aria-hidden="true" />
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </label>
        <label>
          <span>New password</span>
          <div className="input-icon-field">
            <Lock size={16} aria-hidden="true" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </label>
        <label>
          <span>Confirm new password</span>
          <div className="input-icon-field">
            <Lock size={16} aria-hidden="true" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </label>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Updating…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
