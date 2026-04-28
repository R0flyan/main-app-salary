import { expect, test } from "@playwright/test";

test("фильтрация, сортировка и пагинация вакансий", async ({ page }) => {
  let isAuthenticated = false;
  const requestedQueries: string[] = [];

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
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, "");

    if (request.method() === "GET" && path === "/vacancies") {
      requestedQueries.push(url.search);
      const pageNumber = Number(url.searchParams.get("page") ?? "1");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: pageNumber,
              title: `Vacancy ${pageNumber}`,
              company: "Acme",
              salary: 150000 + pageNumber * 1000,
              description: "desc",
              status: "draft",
              employment_type: "full",
              work_format: "remote",
              owner_id: 1,
              created_at: "2026-01-01T00:00:00",
              updated_at: null,
            },
          ],
          total: 7,
          page: pageNumber,
          page_size: Number(url.searchParams.get("page_size") ?? "5"),
          pages: 2,
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("user@example.com");
  await page.locator('input[type="password"]').fill("password123");
  await page.getByRole("button").last().click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByPlaceholder(/Поиск|РџРѕРёСЃРє/i).fill("python");
  const selects = page.locator("select");
  await selects.nth(1).selectOption("salary");
  await page.getByRole("button", { name: /Впер|Р’РїРµ/i }).click();

  await expect(page.getByText("Vacancy 2")).toBeVisible();
  expect(requestedQueries.some((query) => query.includes("search=python"))).toBeTruthy();
  expect(requestedQueries.some((query) => query.includes("sort_by=salary"))).toBeTruthy();
  expect(requestedQueries.some((query) => query.includes("page=2"))).toBeTruthy();
});
