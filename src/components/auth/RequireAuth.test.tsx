import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import RequireAuth from "./RequireAuth";
import { useAuth } from "../../auth/useAuth";
import type { AuthContextValue } from "../../auth/auth-context";

vi.mock("../../auth/useAuth");

function mockAuthValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/settings" element={<div>settings page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders nothing while the initial auth check is loading", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ loading: true }));

    const { container } = renderAt("/settings");
    expect(container).toBeEmptyDOMElement();
  });

  it("redirects to / when not logged in", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({}));

    renderAt("/settings");
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("renders the protected route when logged in", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: { id: "1", email: "a@b.com" } }));

    renderAt("/settings");
    expect(screen.getByText("settings page")).toBeInTheDocument();
  });
});
