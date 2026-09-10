import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as portalAuthApi from "../api/portalAuth";
import { refreshPortalAccessToken } from "../api/portalClient";
import { getPortalAccessToken, setPortalAccessToken } from "./tokenStore";
import PortalAuthContext from "./PortalAuthContext";

export function PortalAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const clear = useCallback(() => {
    setPortalAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onExpired = () => clear();
    window.addEventListener("portal-auth:expired", onExpired);
    return () => window.removeEventListener("portal-auth:expired", onExpired);
  }, [clear]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    Promise.resolve().then(async () => {
      try {
        const token = await refreshPortalAccessToken();
        if (!token) {
          clear();
          return;
        }
        setPortalAccessToken(token);
        const response = await portalAuthApi.getMe();
        // /auth/me returns req.portalUser as-is: {sub, actorType, studentId, name}.
        setUser(response.data);
      } catch {
        clear();
      } finally {
        setLoading(false);
      }
    });
  }, [clear]);

  const login = useCallback(async (credentials) => {
    const response = await portalAuthApi.login(credentials);
    setPortalAccessToken(response.data.accessToken);
    // Login's actor shape is richer than /me (includes usingDefaultPassword
    // and, for a guardian, studentName) — normalized to the same
    // actorType/studentId/name fields /me returns, plus the extras.
    const { actor } = response.data;
    setUser({
      sub: actor.id,
      actorType: actor.type,
      studentId: actor.studentId,
      name: actor.name,
      studentName: actor.studentName,
      usingDefaultPassword: actor.usingDefaultPassword,
    });
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await portalAuthApi.logout();
    } catch {
      // Clear local state regardless — the server session may already be gone.
    }
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user && getPortalAccessToken()),
      isGuardian: user?.actorType === "guardian",
    }),
    [user, loading, login, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}
