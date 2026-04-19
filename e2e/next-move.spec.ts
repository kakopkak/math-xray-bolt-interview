import { expect, test } from "@playwright/test";
import { requireMongoUri, seedDemoAssignment } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("järgmine samm", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("analüütikas kuvatakse järgmine samm narratiivse kaardina", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);

    await page.goto(`/teacher/assignment/${assignmentId}/analytics`);
    await page.getByRole("button", { name: "Soovita järgmine samm" }).click();

    await page.waitForSelector('[data-testid="next-move-card"]', { timeout: 20_000 });
    const card = page.getByTestId("next-move-card");
    await expect(card).toBeVisible();
    await expect(card.getByTestId("next-move-problem")).toHaveText(/\S+/);
    await expect(card.getByText(/Homme hommikuks soovitan/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Loo see ülesanne" })).toBeVisible();
  });

  test("kuvab veateate kui next-move API tagastab 500", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);
    await page.route(`**/api/assignments/${assignmentId}/next-move`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "boom" }),
      });
    });

    await page.goto(`/teacher/assignment/${assignmentId}/analytics`);
    await page.getByRole("button", { name: "Soovita järgmine samm" }).click();
    await expect(page.getByText("boom")).toBeVisible();
  });

  test("teksti-sisu on eesti keeles", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);
    await page.goto(`/teacher/assignment/${assignmentId}/analytics`);
    await expect(page.getByRole("button", { name: "Soovita järgmine samm" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Järgmine samm klassi jaoks" })).toBeVisible();
  });

  test('nupp "Loo see ülesanne" avab uue ülesande mustandi', async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);
    await page.goto(`/teacher/assignment/${assignmentId}/analytics`);
    await page.getByRole("button", { name: "Soovita järgmine samm" }).click();
    await page.waitForSelector('[data-testid="next-move-card"]', { timeout: 20_000 });

    await page.getByRole("button", { name: "Loo see ülesanne" }).click();
    await page.waitForURL(/\/teacher\/assignment\/[a-f0-9]{24}$/i, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/teacher\/assignment\/[a-f0-9]{24}$/i);
  });
});
