import { expect, test } from "@playwright/test";
import { seedDemoAssignment } from "./test-helpers";

test.describe("design system rollout regressions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("landing demo CTA triggers seeding request and navigates to assignment detail", async ({ page }) => {
    const mockedAssignmentId = "507f1f77bcf86cd799439011";
    const assignmentPath = `/teacher/assignment/${mockedAssignmentId}`;
    const assignmentRoutePattern = new RegExp(`${assignmentPath}(\\?.*)?$`);
    let seedRequestCount = 0;

    await page.route("**/api/assignments/seed", async (route) => {
      seedRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ assignmentId: mockedAssignmentId }),
      });
    });
    await page.route(assignmentRoutePattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>Mock assignment page</body></html>",
      });
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Tuvasta matemaatilised väärarusaamad enne, kui neist saavad klassi püsiharjumused.",
      })
    ).toBeVisible();

    await page.getByRole("button", { name: "Ava navigeerimismenüü" }).click();
    await expect(page.getByRole("navigation", { name: "Lehe navigeerimine" })).toBeVisible();

    const navPanel = page.getByRole("navigation", { name: "Lehe navigeerimine" });
    await navPanel.getByRole("button", { name: "Proovi demot" }).click();
    const demoCta = page.locator("section#cta").getByRole("button", { name: "Proovi demot" });
    await expect(demoCta).toBeVisible();

    const [seedRequest] = await Promise.all([
      page.waitForRequest(
        (request) => request.url().endsWith("/api/assignments/seed") && request.method() === "POST"
      ),
      page.waitForURL(new RegExp(`${assignmentPath}$`)),
      demoCta.click(),
    ]);

    expect(seedRequest.method()).toBe("POST");
    expect(seedRequestCount).toBe(1);
    await expect(page).toHaveURL(new RegExp(`${assignmentPath}$`));
  });

  test("landing progress stays neutral on intro and activates when workflow content is in view", async ({
    page,
  }) => {
    await page.goto("/");

    const progressNav = page.getByRole("navigation", {
      name: "Koosraja sammude navigeerimine",
    });
    const captureStep = progressNav.getByRole("button", { name: /Kaardista/ });

    await expect(captureStep).not.toHaveAttribute("aria-current", "step");

    await page.getByRole("button", { name: "Ava navigeerimismenüü" }).click();
    await page
      .getByRole("navigation", { name: "Lehe navigeerimine" })
      .getByRole("button", { name: "Töövoog" })
      .click();

    await expect(captureStep).toHaveAttribute("aria-current", "step");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(captureStep).not.toHaveAttribute("aria-current", "step");
  });

  test("teacher shell exposes theme toggle and applies dark mode", async ({ page }) => {
    await page.goto("/teacher/new");

    const themeToggle = page.getByLabel("Värviteema");
    await expect(themeToggle).toBeVisible();

    await themeToggle.selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("submit page uses segmented control and stays usable in dark mode", async ({
    page,
    request,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("math-xray-theme", "dark");
    });

    let assignmentId = "";
    try {
      assignmentId = await seedDemoAssignment(request);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      test.skip(true, `Submit-lehe e2e vajab töötavat demoandmestiku külvi: ${message}`);
    }

    await page.goto(`/submit/${assignmentId}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const textSegment = page.getByRole("radio", { name: "Tekst" });
    const photoSegment = page.getByRole("radio", { name: "Foto" });
    await expect(textSegment).toBeVisible();
    await expect(photoSegment).toBeVisible();
    await expect(textSegment).toHaveAttribute("aria-checked", "true");

    await photoSegment.click();
    await expect(photoSegment).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Vali fail" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kasuta kaamerat" })).toBeVisible();

    await textSegment.click();
    await expect(textSegment).toHaveAttribute("aria-checked", "true");
    await expect(page.getByPlaceholder("Kirjuta sammud...")).toBeVisible();
  });
});

test.describe("design system rollout regressions on desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("desktop rail stays neutral on intro and activates the workflow only after entering it", async ({
    page,
  }) => {
    await page.goto("/");

    const progressNav = page.getByRole("navigation", { name: "Koosraja edenemine" });
    const captureStep = progressNav.getByRole("button", { name: /Kaardista/ });

    await expect(captureStep).not.toHaveAttribute("aria-current", "step");

    await page.getByRole("button", { name: "Ava navigeerimismenüü" }).click();
    await page
      .getByRole("navigation", { name: "Lehe navigeerimine" })
      .getByRole("button", { name: "Töövoog" })
      .click();

    await expect(captureStep).toHaveAttribute("aria-current", "step");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(captureStep).not.toHaveAttribute("aria-current", "step");
  });
});
