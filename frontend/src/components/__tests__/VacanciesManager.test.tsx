import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import VacanciesManager from "../VacanciesManager";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function mockFetchResponse(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  return Promise.resolve({
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response);
}

function getUrl(input: FetchInput) {
  return typeof input === "string" ? input : input.url;
}

function getMethod(input: FetchInput, init?: FetchInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof input !== "string" && input.method) return String(input.method).toUpperCase();
  return "GET";
}

function renderManager(initialUrl = "/dashboard") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/dashboard" element={<VacanciesManager />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

function sampleVacancy(id = 1) {
  return {
    id,
    title: "Python Developer",
    company: "Acme",
    salary: 200000,
    description: "Backend",
    status: "draft",
    employment_type: "full",
    work_format: "remote",
    owner_id: 1,
    created_at: "2026-01-01T00:00:00",
    updated_at: null,
  };
}

function sampleFile(id = 10, name = "cv.pdf") {
  return {
    id,
    vacancy_id: 1,
    owner_id: 1,
    original_name: name,
    mime_type: "application/pdf",
    size: 1024,
    created_at: "2026-01-01T00:00:00",
  };
}

describe("VacanciesManager", () => {
  it("loads vacancies and renders list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        mockFetchResponse(true, {
          items: [sampleVacancy()],
          total: 1,
          page: 1,
          page_size: 5,
          pages: 1,
        })
      )
    );

    renderManager();

    expect(await screen.findByText("Python Developer")).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });

  it("shows API error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(false, "Server error", 500)));
    renderManager();

    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });

  it("updates query params for search and pagination", async () => {
    const fetchMock = vi.fn(() =>
      mockFetchResponse(true, {
        items: [],
        total: 8,
        page: 1,
        page_size: 5,
        pages: 2,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderManager("/dashboard?page=1&page_size=5");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "python" } });

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calls.some((url) => url.includes("search=python"))).toBe(true);
    });

    const allButtons = screen.getAllByRole("button");
    fireEvent.click(allButtons[allButtons.length - 1]);

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calls.some((url) => url.includes("page=2"))).toBe(true);
    });
  });

  it("validates form and prevents create request", async () => {
    const fetchMock = vi.fn(() =>
      mockFetchResponse(true, { items: [], total: 0, page: 1, page_size: 5, pages: 1 })
    );
    vi.stubGlobal("fetch", fetchMock);

    renderManager();
    await screen.findByText(/0/);

    fireEvent.click(screen.getByRole("button", { name: /Создать/ }));

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates vacancy successfully and refetches list", async () => {
    const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) => {
      const url = getUrl(input);
      const method = getMethod(input, init);

      if (method === "GET" && url.includes("/vacancies/?")) {
        return mockFetchResponse(true, { items: [], total: 0, page: 1, page_size: 5, pages: 1 });
      }

      if (method === "POST" && url.endsWith("/vacancies/")) {
        return mockFetchResponse(true, sampleVacancy(2), 201);
      }

      return mockFetchResponse(true, { items: [], total: 0, page: 1, page_size: 5, pages: 1 });
    });

    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderManager();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[3], { target: { value: "  QA Engineer  " } });
    fireEvent.change(inputs[4], { target: { value: "  Acme Inc  " } });
    fireEvent.change(inputs[5], { target: { value: "250000" } });

    fireEvent.click(screen.getByRole("button", { name: /Создать/ }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([input, init]) => {
        const url = getUrl(input as FetchInput);
        const method = getMethod(input as FetchInput, init as FetchInit);
        return method === "POST" && url.endsWith("/vacancies/");
      });
      expect(postCall).toBeTruthy();
    });

    const latestInputs = container.querySelectorAll("input");
    expect((latestInputs[3] as HTMLInputElement).value).toBe("");
    expect((latestInputs[4] as HTMLInputElement).value).toBe("");
    expect((latestInputs[5] as HTMLInputElement).value).toBe("");
  });

  it("supports edit mode cancel and handles save error", async () => {
    const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) => {
      const url = getUrl(input);
      const method = getMethod(input, init);

      if (method === "GET" && url.includes("/vacancies/?")) {
        return mockFetchResponse(true, { items: [sampleVacancy()], total: 1, page: 1, page_size: 5, pages: 1 });
      }

      if (method === "PUT" && url.includes("/vacancies/1")) {
        return mockFetchResponse(false, "Save failed", 400);
      }

      return mockFetchResponse(true, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderManager();
    await screen.findByText("Python Developer");

    fireEvent.click(screen.getByRole("button", { name: /Редактировать/ }));
    expect(screen.getByRole("button", { name: /Отмена/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Отмена/ }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Отмена/ })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Редактировать/ }));
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[3], { target: { value: "Updated title" } });
    fireEvent.change(inputs[4], { target: { value: "Updated company" } });
    fireEvent.change(inputs[5], { target: { value: "210000" } });

    fireEvent.click(screen.getByRole("button", { name: /Сохранить/ }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Save failed");
    });
  });

  it("handles vacancy deletion with confirm and error", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) => {
      const url = getUrl(input);
      const method = getMethod(input, init);

      if (method === "GET" && url.includes("/vacancies/?")) {
        return mockFetchResponse(true, { items: [sampleVacancy()], total: 1, page: 1, page_size: 5, pages: 1 });
      }

      if (method === "DELETE" && url.includes("/vacancies/1")) {
        return mockFetchResponse(false, "Delete failed", 500);
      }

      return mockFetchResponse(true, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    renderManager();
    await screen.findByText("Python Developer");

    const deleteButtons = screen.getAllByRole("button", { name: /Удалить/ });
    fireEvent.click(deleteButtons[0]);
    expect(fetchMock.mock.calls.some(([input, init]) => getMethod(input as FetchInput, init as FetchInit) === "DELETE")).toBe(false);

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("opens files panel, opens file url and deletes file", async () => {
    let files = [sampleFile(10, "cv.pdf")];

    const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) => {
      const url = getUrl(input);
      const method = getMethod(input, init);

      if (method === "GET" && url.includes("/vacancies/?")) {
        return mockFetchResponse(true, { items: [sampleVacancy()], total: 1, page: 1, page_size: 5, pages: 1 });
      }

      if (method === "GET" && url.includes("/vacancies/1/files")) {
        return mockFetchResponse(true, files);
      }

      if (method === "GET" && url.includes("/vacancies/files/10/download-url")) {
        return mockFetchResponse(true, { url: "https://files.example/cv.pdf" });
      }

      if (method === "DELETE" && url.includes("/vacancies/files/10")) {
        files = [];
        return mockFetchResponse(true, {}, 204);
      }

      return mockFetchResponse(true, {});
    });

    vi.stubGlobal("fetch", fetchMock);
    renderManager();
    await screen.findByText("Python Developer");

    fireEvent.click(screen.getByRole("button", { name: /Файлы/ }));
    expect(await screen.findByText("cv.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Открыть/ }));
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith("https://files.example/cv.pdf", "_blank");
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Удалить/ }).at(-1)!);
    await waitFor(() => {
      expect(screen.queryByText("cv.pdf")).not.toBeInTheDocument();
    });
  });

  it("validates upload type and size, then uploads valid file", async () => {
    let files: ReturnType<typeof sampleFile>[] = [];

    const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) => {
      const url = getUrl(input);
      const method = getMethod(input, init);

      if (method === "GET" && url.includes("/vacancies/?")) {
        return mockFetchResponse(true, { items: [sampleVacancy()], total: 1, page: 1, page_size: 5, pages: 1 });
      }

      if (method === "GET" && url.includes("/vacancies/1/files")) {
        return mockFetchResponse(true, files);
      }

      if (method === "POST" && url.includes("/vacancies/1/files")) {
        files = [sampleFile(20, "new.pdf")];
        return mockFetchResponse(true, files[0], 201);
      }

      return mockFetchResponse(true, {});
    });

    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderManager();
    await screen.findByText("Python Developer");

    fireEvent.click(screen.getByRole("button", { name: /Файлы/ }));
    await waitFor(() => {
      expect(screen.getByText(/Файлы не прикреплены/)).toBeInTheDocument();
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidType = new File(["hello"], "hello.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidType] } });
    expect(window.alert).toHaveBeenCalled();

    const hugeFile = new File([new Uint8Array(5 * 1024 * 1024 + 10)], "huge.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [hugeFile] } });
    expect(window.alert).toHaveBeenCalled();

    const validFile = new File(["pdf-bytes"], "new.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("new.pdf")).toBeInTheDocument();
    });
  });
});
