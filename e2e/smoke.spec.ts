import { expect, test } from "@playwright/test";

test("avaleht ja õpetaja ülesandevorm töötavad", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Tuvasta matemaatilised väärarusaamad enne kui need süvenevad.",
    })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Käivita demo" })).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("home-core.png");

  await page.goto("/teacher/new");

  await expect(page.getByRole("heading", { name: "Loo uus ülesanne" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Loo ülesanne" })).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("teacher-new-core.png");
});
