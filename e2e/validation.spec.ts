import { expect, test } from "@playwright/test";
import { createAssignment, requireMongoUri } from "./test-helpers";

test.describe("esituse valideerimine", () => {
  test.beforeAll(() => {
    requireMongoUri();
  });

  test("näitab Estonian valideerimisteateid puuduva sisendi korral", async ({ page, request }) => {
    const assignmentId = await createAssignment(request, { title: "Valideerimise test" });

    await page.goto(`/submit/${assignmentId}`);

    await page.getByRole("button", { name: "Saada lahendus" }).click();
    await expect(page.getByText("Palun sisesta õpilase nimi.")).toBeVisible();

    await page.getByLabel("Õpilase nimi / Student name").fill("Jaan Tamm");
    await page.getByRole("button", { name: "Foto / kaamera" }).click();
    await page.getByRole("button", { name: "Saada lahendus" }).click();

    await expect(page.getByText("Palun lisa foto lahendusest.")).toBeVisible();
  });
});
