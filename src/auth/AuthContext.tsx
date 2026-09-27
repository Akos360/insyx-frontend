import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import * as authApi from "../api/auth";
import type { AuthUser, Credentials } from "../api/auth";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // True until /auth/me resolves — httpOnly cookie can't be read directly, so
  // this is the only way to know a session already exists.
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

  const updateProfile = useCallback(async (update: authApi.ProfileUpdate) => {
    const updatedUser = await authApi.updateProfile(update);
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, loginWithGoogle, resetPassword, updateProfile }),
    [user, loading, login, register, logout, loginWithGoogle, resetPassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
