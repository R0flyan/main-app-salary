import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../AuthContext";


function mockFetchResponse(ok: boolean, body: unknown, status = ok ? 200 : 401) {
  return Promise.resolve({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}


function AuthProbe() {
  const { isLoading, isAuthenticated, user, hasRole, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email ?? "none"}</div>
      <div data-testid="is-admin">{String(hasRole("admin"))}</div>
      <button
        onClick={async () => {
          await login("user@example.com", "password123");
        }}
      >
        login
      </button>
      <button onClick={logout}>logout</button>
    </div>
  );
}


describe("AuthContext", () => {
  it("restores session via refresh when /auth/me returns unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => mockFetchResponse(false, { detail: "unauthorized" }, 401))
        .mockImplementationOnce(() => mockFetchResponse(true, {}))
        .mockImplementationOnce(() =>
          mockFetchResponse(true, {
            id: 1,
            email: "restored@example.com",
            role: "admin",
            created_at: "2026-01-01T00:00:00",
          })
        )
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("email")).toHaveTextContent("restored@example.com");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
  });

  it("clears user on logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() =>
          mockFetchResponse(true, {
            id: 2,
            email: "user@example.com",
            role: "user",
            created_at: "2026-01-01T00:00:00",
          })
        )
        .mockImplementationOnce(() => mockFetchResponse(true, {}))
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
      expect(screen.getByTestId("email")).toHaveTextContent("none");
    });
  });
});
