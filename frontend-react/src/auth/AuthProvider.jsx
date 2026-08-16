import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as authApi from "../api/auth.js";
import { refreshAccessToken } from "../api/client.js";
import { getAccessToken, setAccessToken } from "./tokenStore";
import AuthContext from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onExpired = () => clear();

    window.addEventListener("auth:expired", onExpired);

    return () => {
      window.removeEventListener("auth:expired", onExpired);
    };
  }, [clear]);

  // The access token is never persisted (see ./tokenStore), so every fresh
  // page load starts with none in memory. We silently exchange the
  // HttpOnly refresh-token cookie for a new access token here; if that
  // fails, the user was never logged in or their session truly expired.
  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    Promise.resolve().then(async () => {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          clear();
          return;
        }
        setAccessToken(token);
        const response = await authApi.getMe();
        setUser(response.data);
      } catch {
        clear();
      } finally {
        setLoading(false);
      }
    });
  }, [clear]);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local authentication state even if the server session
      // has already expired or is unavailable.
    }
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user && getAccessToken()),
      hasRole: (...roles) => roles.includes(user?.role),
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
