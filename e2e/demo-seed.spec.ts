import { expect, test } from "@playwright/test";
import { requireMongoUri } from "./test-helpers";

test.describe("demo andmestik", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("demo CTA loob andmestiku ja avab õpetaja detailvaate", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Proovi demot" }).click();

    await expect(page).toHaveURL(/\/teacher\/assignment\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { name: /\[DEMO\] Ruutvõrrandid/ })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Demo juhend" })).toBeVisible();
    await expect(page.getByText("Samm 1/3")).toBeVisible();

    await page.getByRole("button", { name: "Sulge" }).click();
    await expect(page.getByRole("dialog", { name: "Demo juhend" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Väärarusaamade kaardistus" })).toBeVisible();
  });
});
