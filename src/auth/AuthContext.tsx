import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import * as authApi from "../api/auth";
import type { AuthUser, Credentials } from "../api/auth";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // True until the initial /auth/me check resolves — the JWT lives in an
  // httpOnly cookie we can't read directly, so this is the only way to know
  // whether a session already exists (e.g. after a page refresh).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const loggedInUser = await authApi.login(credentials);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (credentials: Credentials) => {
    const registeredUser = await authApi.register(credentials);
    setUser(registeredUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const loggedInUser = await authApi.googleLogin(idToken);
    setUser(loggedInUser);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const resetUser = await authApi.resetPassword(token, newPassword);
    setUser(resetUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, loginWithGoogle, resetPassword }),
    [user, loading, login, register, logout, loginWithGoogle, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
