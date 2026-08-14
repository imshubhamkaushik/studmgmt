import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function LoginPage() {
  const { login }=useAuth(); const navigate=useNavigate(); const location=useLocation();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e){ e.preventDefault(); setBusy(true); setError(""); try { await login({email,password}); navigate(location.state?.from || "/dashboard",{replace:true}); } catch(err){setError(getApiErrorMessage(err));} finally{setBusy(false);} }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><h1>StudentHub</h1><p>Sign in to continue.</p>{error&&<div className="inline-error">{error}</div>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label><button disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></main>;
}
