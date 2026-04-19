import { expect, test } from "@playwright/test";
import { requireMongoUri, seedDemoAssignment } from "./test-helpers";

test.describe("analüütika vaade", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("analüütikas kuvatakse jaotus ning sorteeritav tabel", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);

    await page.goto(`/teacher/assignment/${assignmentId}/analytics`);

    await expect(page.getByRole("heading", { name: "Klassi analüütika" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keda vaadata enne järgmist sammu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Milline viga hoiab klassi kinni" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kes vajab tagasisidet või kinnitust" })).toBeVisible();

    const applyBulkReview = page.getByRole("button", { name: "Rakenda valikule" });
    await expect(applyBulkReview).toBeDisabled();

    await page.getByLabel("Märgi").first().check();
    await expect(applyBulkReview).toBeEnabled();
  });
});
