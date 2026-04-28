import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubGlobal("alert", vi.fn());
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("open", vi.fn());
});
