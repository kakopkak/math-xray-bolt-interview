import { expect, test } from "@playwright/test";
import { createAssignment, requireMongoUri, waitForSubmissionComplete } from "./test-helpers";

test.describe("lahenduse esitamine", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("õpilane saab trükitud lahenduse saata ja tulemuse avada", async ({ page, request }) => {
    const assignmentId = await createAssignment(request, {
      title: "E2E esituse voog",
      description: "Sisesta lahendus sammudena.",
    });

    await page.goto(`/submit/${assignmentId}`);

    await expect(page.getByRole("heading", { name: "E2E esituse voog" })).toBeVisible();
    await page.getByLabel("Õpilase nimi / Student name").fill("Mari Maasikas");
    await page.getByLabel("Lahenduskäik").fill("x² + 5x + 6 = 0\n(x+2)(x+3)=0\nx=-2 või x=-3");

    await page.getByRole("button", { name: "Saada lahendus" }).click();

    await expect(page).toHaveURL(/\/student\/result\/[a-f0-9]{24}$/);
    const submissionId = page.url().split("/").pop();
    expect(submissionId).toBeTruthy();

    const settledSubmission = await waitForSubmissionComplete(request, submissionId!);
    expect(settledSubmission.processingStatus).toBe("complete");
    expect(settledSubmission.processingError).toBeFalsy();
    await page.reload();

    await expect(page.getByRole("heading", { name: "Analüüsi tulemus" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kokkuvõte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Samm-sammuline tagasiside" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sihitud harjutused" })).toBeVisible();
    await expect(page.getByText("Valmis", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Proovi uuesti" })).toHaveCount(0);
  });
});
