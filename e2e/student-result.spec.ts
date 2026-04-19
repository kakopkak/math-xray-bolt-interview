import { expect, test } from "@playwright/test";
import { getFirstSubmissionId, requireMongoUri, seedDemoAssignment } from "./test-helpers";

test.describe("õpilase tulemuse vaade", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("kuvab tulemuse kokkuvõtte, sammud ja harjutused", async ({ page, request }) => {
    const assignmentId = await seedDemoAssignment(request);
    const submissionId = await getFirstSubmissionId(request, assignmentId);

    await page.goto(`/student/result/${submissionId}`);

    await expect(page.getByRole("heading", { name: "Analüüsi tulemus" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kokkuvõte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Samm-sammuline tagasiside" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sihitud harjutused" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kopeeri link" })).toBeVisible();
  });
});
