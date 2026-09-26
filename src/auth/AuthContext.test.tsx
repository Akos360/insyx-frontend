import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import * as authApi from "../api/auth";

vi.mock("../api/auth");

function Consumer() {
  const { user, loading, login, register, logout, loginWithGoogle, resetPassword } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => login({ email: "a@b.com", password: "pw" })}>login</button>
      <button onClick={() => register({ email: "a@b.com", password: "pw" })}>register</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => loginWithGoogle("a-google-id-token")}>google</button>
      <button onClick={() => resetPassword("a-reset-token", "new-password")}>reset</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts loading, then hydrates the user from /auth/me on mount", async () => {
    vi.mocked(authApi.me).mockResolvedValue({ id: "1", email: "person@example.com" });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("person@example.com");
  });

  it("stays logged out when /auth/me rejects (no session cookie)", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error("401"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login() sets the user from the response", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error("401"));
    vi.mocked(authApi.login).mockResolvedValue({ id: "2", email: "logged-in@example.com" });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("logged-in@example.com"));
  });

  it("register() sets the user from the response", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error("401"));
    vi.mocked(authApi.register).mockResolvedValue({ id: "3", email: "new@example.com" });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("register"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("new@example.com"));
  });

  it("logout() clears the user", async () => {
    vi.mocked(authApi.me).mockResolvedValue({ id: "1", email: "person@example.com" });
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("person@example.com"));

    await user.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });

  it("loginWithGoogle() sets the user from the response", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error("401"));
    vi.mocked(authApi.googleLogin).mockResolvedValue({ id: "4", email: "google-user@example.com" });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("google"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("google-user@example.com"));
    expect(authApi.googleLogin).toHaveBeenCalledWith("a-google-id-token");
  });

  it("resetPassword() sets the user from the response", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error("401"));
    vi.mocked(authApi.resetPassword).mockResolvedValue({ id: "5", email: "reset-user@example.com" });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("reset"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("reset-user@example.com"));
    expect(authApi.resetPassword).toHaveBeenCalledWith("a-reset-token", "new-password");
  });
});
