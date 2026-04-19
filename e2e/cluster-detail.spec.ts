import { expect, test } from "@playwright/test";
import { getFirstClusterId, requireMongoUri, seedDemoAssignment } from "./test-helpers";

test.describe("klastri detail", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("õpetaja näeb klastri õpilasi ja parandusharjutusi", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);
    const clusterId = await getFirstClusterId(request, assignmentId);

    await page.goto(`/teacher/cluster/${clusterId}`);

    await expect(page.getByRole("heading", { name: "Õpilased" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Harjutused" })).toBeVisible();
    await expect(page.getByText(/Harjutused: (valmis|töös|viga)/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Näita" }).first()).toBeVisible();
  });
});
