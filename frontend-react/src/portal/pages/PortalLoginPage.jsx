import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, User, Lock, Eye, EyeOff } from "lucide-react";
import { usePortalAuth } from "../auth/usePortalAuth";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

export default function PortalLoginPage() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ username: username.trim(), password });
      navigate(location.state?.from || "/portal/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="auth-mark">
          <GraduationCap size={22} />
        </span>
        <h1>Student &amp; Family Portal</h1>
        <p>Sign in to view attendance, assignments, and report cards.</p>
        {error && <div className="inline-error">{error}</div>}
        {!error && location.state?.passwordChanged && (
          <p className="page-note">Password changed. Please sign in again.</p>
        )}
        <label>
          <span>Student ID or parent username</span>
          <div className="input-icon-field">
            <User size={16} aria-hidden="true" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="STU-000123"
              autoComplete="username"
              required
            />
          </div>
        </label>
        <label>
          <span>Password</span>
          <div className="input-icon-field auth-password-field">
            <Lock size={16} aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="portal-login-hint">
          A parent or guardian signs in with the student ID plus{" "}
          <code>-parent</code> (e.g. <code>STU-000123-parent</code>).
        </p>
      </form>
    </main>
  );
}
