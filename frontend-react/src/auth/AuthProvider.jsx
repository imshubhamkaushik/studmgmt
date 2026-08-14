import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

  const clear = useCallback(() => {
    const next = {
      user: null,
      token: null,
    };

    setState(next);
    localStorage.removeItem(KEY);
  }, []);

  useEffect(() => {
    const onExpired = () => clear();

    window.addEventListener("auth:expired", onExpired);

    return () => {
      window.removeEventListener("auth:expired", onExpired);
    };
  }, [clear]);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    const initializeAuth = async () => {
      try {
        const storedAuth = JSON.parse(localStorage.getItem(KEY) || "null");

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
  }, [clear]);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);

    const next = {
      user: response.data.user,
      token: response.data.accessToken,
    };

    setState(next);
    localStorage.setItem(KEY, JSON.stringify(next));

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
      ...state,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(state.token),
      hasRole: (...roles) => roles.includes(state.user?.role),
    }),
    [state, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
