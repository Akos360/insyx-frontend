import { createContext } from "react";
import type { AuthUser, Credentials } from "../api/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
