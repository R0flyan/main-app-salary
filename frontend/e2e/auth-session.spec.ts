import { expect, test } from "@playwright/test";

test("вход, выход и восстановление сессии после перезагрузки", async ({ page }) => {
  let isAuthenticated = false;

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
      body: JSON.stringify({
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
      }),
    });
  });

  await page.route("**/auth/logout", async (route) => {
    isAuthenticated = false;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Logged out" }),
    });
  });

  await page.route("**/vacancies**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 5, pages: 1 }),
    });
  });

  await page.goto("/login");

  await page.locator('input[type="email"]').fill("user@example.com");
  await page.locator('input[type="password"]').fill("password123");
  await page.getByRole("button").last().click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: /Выйти|Р’С‹Р№С‚Рё/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});
