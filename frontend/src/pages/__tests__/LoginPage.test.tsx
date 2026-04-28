import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "../LoginPage";


describe("LoginPage", () => {
  it("renders form and calls callbacks", () => {
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    const setMode = vi.fn();
    const handleAuth = vi.fn();

    render(
      <HelmetProvider>
        <LoginPage
          email=""
          password=""
          mode="login"
          setEmail={setEmail}
          setPassword={setPassword}
          setMode={setMode}
          handleAuth={handleAuth}
        />
      </HelmetProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Парол|password/i), { target: { value: "secret" } });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    expect(setEmail).toHaveBeenCalledWith("test@example.com");
    expect(setPassword).toHaveBeenCalledWith("secret");
    expect(setMode).toHaveBeenCalledWith("register");
    expect(handleAuth).toHaveBeenCalledTimes(1);
  });
});
