import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as authApi from "../api/auth.js";

const AuthContext = createContext(null);

const KEY = "studenthub.auth";

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(KEY)) || {
          user: null,
          token: null,
        }
      );
    } catch {
      return {
        user: null,
        token: null,
      };
    }
  });

  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const clear = () => {
    const next = {
      user: null,
      token: null,
    };

    setState(next);
    localStorage.removeItem(KEY);
  };

  useEffect(() => {
    const onExpired = () => clear();

    window.addEventListener("auth:expired", onExpired);

    return () => {
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode.
    if (initialized.current) return;

    initialized.current = true;

    const initializeAuth = async () => {
      try {
        const storedAuth = JSON.parse(localStorage.getItem(KEY) || "null");

        // No access token means there is no existing browser session
        // we can restore without first performing a login.
        if (!storedAuth?.token) {
          clear();
          return;
        }

        const response = await authApi.getMe();

        const next = {
          ...storedAuth,
          user: response.data,
        };

        setState(next);
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        clear();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  async function login(credentials) {
    const response = await authApi.login(credentials);

    const next = {
      user: response.data.user,
      token: response.data.accessToken,
    };

    setState(next);
    localStorage.setItem(KEY, JSON.stringify(next));

    return response.data;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Clear local authentication state even if the server session
      // has already expired or is unavailable.
    }

    clear();
  }

  const value = {
    ...state,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(state.token),
    hasRole: (...roles) => roles.includes(state.user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
