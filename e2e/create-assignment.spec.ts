import { expect, test } from "@playwright/test";
import { requireMongoUri, uniqueName } from "./test-helpers";

test.describe("ülesande loomine", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("õpetaja saab uue ülesande luua", async ({ page }) => {
    const title = uniqueName("Kontrolltöö");

    await page.goto("/teacher/new");
    await page.getByLabel("Pealkiri / Title").fill(title);
    await page.getByLabel("Klass / Grade").fill("8");
    await page
      .getByLabel("Kirjeldus / Description")
      .fill("Lahenda ruutvõrrandid samm-sammult ja näita arvutuskäiku.");
    await page
      .getByLabel("Vastuse võti / Correct approach")
      .fill("x² + 5x + 6 = 0 -> (x+2)(x+3)=0 -> x=-2, x=-3");

    await page.getByRole("button", { name: "Loo ülesanne" }).click();

    await expect(page).toHaveURL(/\/teacher\/assignment\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kopeeri õpilase link" })).toBeVisible();
    await expect(page.getByText("Klasterdamine avaneb")).toBeVisible();
  });
});
