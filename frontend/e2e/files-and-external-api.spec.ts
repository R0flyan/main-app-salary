import { expect, test } from "@playwright/test";

test("загрузка, получение и удаление файлов вакансии", async ({ page }) => {
  let isAuthenticated = false;
  let downloadUrlRequested = false;
  let files = [
    {
      id: 1,
      vacancy_id: 1,
      owner_id: 1,
      original_name: "old.pdf",
      mime_type: "application/pdf",
      size: 1000,
      created_at: "2026-01-01T00:00:00",
    },
  ];

  await page.route("**/auth/me", async (route) => {
    if (!isAuthenticated) {
      await route.fulfill({ status: 401, body: JSON.stringify({ detail: "Not authenticated" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        email: "user@example.com",
        role: "user",
        created_at: "2026-01-01T00:00:00",
      }),
    });
  });

  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({ status: 401, body: JSON.stringify({ detail: "Invalid refresh token" }) });
  });

  await page.route("**/auth/login", async (route) => {
    isAuthenticated = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "token", refresh_token: "refresh", token_type: "bearer" }),
    });
  });

  await page.route("**/vacancies**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === "GET" && path === "/vacancies") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: "File Vacancy",
              company: "Acme",
              salary: 200000,
              description: "desc",
              status: "draft",
              employment_type: "full",
              work_format: "remote",
              owner_id: 1,
              created_at: "2026-01-01T00:00:00",
              updated_at: null,
            },
          ],
          total: 1,
          page: 1,
          page_size: 5,
          pages: 1,
        }),
      });
      return;
    }

    if (method === "GET" && path === "/vacancies/1/files") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(files) });
      return;
    }

    if (method === "POST" && path === "/vacancies/1/files") {
      files = [
        ...files,
        {
          id: 2,
          vacancy_id: 1,
          owner_id: 1,
          original_name: "cv.pdf",
          mime_type: "application/pdf",
          size: 1500,
          created_at: "2026-01-02T00:00:00",
        },
      ];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(files[1]) });
      return;
    }

    if (method === "GET" && path === "/vacancies/files/2/download-url") {
      downloadUrlRequested = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://files.example/cv.pdf", expires_in: 300 }),
      });
      return;
    }

    if (method === "DELETE" && path === "/vacancies/files/2") {
      files = files.filter((file) => file.id !== 2);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("user@example.com");
  await page.locator('input[type="password"]').fill("password123");
  await page.getByRole("button").last().click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: /Файл|Р¤Р°Р№Р»/i }).click();
  await expect(page.getByText("old.pdf")).toBeVisible();

  const chooser = page.locator('input[type="file"]');
  await chooser.setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("pdf-content"),
  });
  await expect(page.getByText("cv.pdf")).toBeVisible();

  await page.getByRole("button", { name: /Открыт|РћС‚РєСЂС‹С‚СЊ/i }).last().click();
  await expect.poll(() => downloadUrlRequested).toBeTruthy();

  await page.getByRole("button", { name: /Удал|РЈРґР°Р»/i }).last().click();
  await expect(page.getByText("cv.pdf")).toHaveCount(0);
});

test("внешний API: успешный ответ и отказ", async ({ page }) => {
  let failMode = false;

  await page.route("**/external/hh/vacancies**", async (route) => {
    if (!failMode) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: 1,
              title: "Python Developer",
              company: "Acme",
              salary: 210000,
              salaryTo: 260000,
              currency: "RUR",
              url: "https://hh.example/1",
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Ошибка обращения к hh.ru" }),
    });
  });

  await page.goto("/");
  await expect(page.getByText("Python Developer")).toBeVisible();

  failMode = true;
  await page.getByRole("button", { name: /Найт|РќР°Р№С‚Рё/i }).click();
  await expect(page.getByText(/Не удалось|РќРµ СѓРґР°Р»РѕСЃСЊ/i)).toBeVisible();
});
