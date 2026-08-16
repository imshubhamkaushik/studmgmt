import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { School, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ email, password });
      navigate(location.state?.from || "/dashboard", { replace: true });
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
          <School size={22} />
        </span>
        <h1>StudentHub</h1>
        <p>Sign in to continue to your workspace.</p>
        {error && <div className="inline-error">{error}</div>}
        <label>
          <span>Email</span>
          <div className="input-icon-field">
            <Mail size={16} aria-hidden="true" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
      </form>
    </main>
  );
}
