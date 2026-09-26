import { api } from "./client";

export type AuthUser = {
  id: string;
  email: string;
};

export type Credentials = {
  email: string;
  password: string;
  // Honeypot — always empty for real users, see HomePage's hidden field.
  website?: string;
};

export async function register(credentials: Credentials): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/register", credentials);
  return data;
}

export async function login(credentials: Credentials): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/login", credentials);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function forgotPassword(email: string, website?: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email, website });
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/reset-password", { token, newPassword });
  return data;
}

export async function googleLogin(idToken: string): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>("/auth/google", { idToken });
  return data;
}
