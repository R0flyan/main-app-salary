import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "../ProtectedRoute";
import { useAuth } from "../../contexts/auth.hook";

vi.mock("../../contexts/auth.hook", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderWithRoutes(requiredRole?: "user" | "admin") {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/"
          element={<div>Home page</div>}
        />
        <Route
          path="/login"
          element={<div>Login page</div>}
        />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute requiredRole={requiredRole}>
              <div>Private page</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows loading state", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      hasRole: () => false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText(/Загр/i)).toBeInTheDocument();
  });

  it("redirects to login when unauthenticated", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      hasRole: () => false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to home when role is insufficient", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => false,
    } as never);

    renderWithRoutes("admin");
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("renders children for allowed users", () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => true,
    } as never);

    renderWithRoutes("user");
    expect(screen.getByText("Private page")).toBeInTheDocument();
  });
});
