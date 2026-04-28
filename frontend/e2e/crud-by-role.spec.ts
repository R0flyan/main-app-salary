import { expect, test } from "@playwright/test";

test("CRUD вакансии в кабинете пользователя", async ({ page }) => {
  test.setTimeout(60_000);
  let isAuthenticated = false;
  let seq = 2;
  const vacancies = [
    {
      id: 1,
      title: "Existing Vacancy",
      company: "Start Corp",
      salary: 150000,
      description: "Existing",
      status: "draft",
      employment_type: "full",
      work_format: "office",
      owner_id: 1,
      created_at: "2026-01-01T00:00:00",
      updated_at: null,
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
    const path = url.pathname.replace(/\/$/, "");

    if (method === "GET" && path === "/vacancies") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: vacancies,
          total: vacancies.length,
          page: Number(url.searchParams.get("page") ?? "1"),
          page_size: Number(url.searchParams.get("page_size") ?? "5"),
          pages: 1,
        }),
      });
      return;
    }

    if (method === "POST" && path === "/vacancies") {
      const body = JSON.parse(request.postData() ?? "{}");
      const created = {
        ...body,
        id: seq++,
        owner_id: 1,
        created_at: "2026-01-01T00:00:00",
        updated_at: null,
      };
      vacancies.unshift(created);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
      return;
    }

    if (method === "PUT" && path.startsWith("/vacancies/")) {
      const id = Number(path.split("/").pop());
      const body = JSON.parse(request.postData() ?? "{}");
      const item = vacancies.find((vacancy) => vacancy.id === id);
      if (!item) {
        await route.fulfill({ status: 404, body: JSON.stringify({ detail: "Not found" }) });
        return;
      }
      Object.assign(item, body, { updated_at: "2026-01-02T00:00:00" });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(item) });
      return;
    }

    if (method === "DELETE" && path.startsWith("/vacancies/")) {
      const id = Number(path.split("/").pop());
      const index = vacancies.findIndex((vacancy) => vacancy.id === id);
      if (index >= 0) vacancies.splice(index, 1);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (path.endsWith("/files")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("user@example.com");
  await page.locator('input[type="password"]').fill("password123");
  await page.getByRole("button").last().click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const inputs = page.locator("input");
  await inputs.nth(3).fill("QA Engineer");
  await inputs.nth(4).fill("Acme");
  await inputs.nth(5).fill("180000");
  await page.getByRole("button", { name: /Созд|РЎРѕР·/i }).first().click();

  await expect(page.getByText("QA Engineer")).toBeVisible();

  await page.getByRole("button", { name: /Редакт|Р РµРґР°Рє/i }).first().click();
  await inputs.nth(5).fill("200000");
  await page.getByRole("button", { name: /Сохран|РЎРѕС…Р|Созд|РЎРѕР·/i }).first().click();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Удал|РЈРґР°Р»/i }).first().click();
  await expect(page.getByText("QA Engineer")).toHaveCount(0);
});
