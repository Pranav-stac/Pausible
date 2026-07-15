import { expect, test } from "@playwright/test";

test.describe("Pausible website smoke", () => {
  test("landing page loads with brand and start CTA", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/pausibl/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("/test assessment page renders personality + wellness sections", async ({ page }) => {
    const res = await page.goto("/test", { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();

    // Session bootstrap can wait on Firebase; fail clearly if it never leaves the spinner.
    await expect(page.getByText("Preparing session…")).toBeHidden({ timeout: 45_000 });

    await expect(page.getByRole("heading", { name: /automated test assessment/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/personality/i).first()).toBeVisible();
    await expect(page.getByText(/wellness context/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
    await expect(page.getByTestId("test-name")).toHaveValue("Test User");
    await expect(page.getByTestId("test-fill-random")).toBeVisible();
  });

  test("privacy and terms pages load", async ({ page }) => {
    for (const path of ["/privacy", "/terms"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok() || res?.status() === 304).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("intro route is reachable", async ({ page }) => {
    const res = await page.goto("/intro", { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Production smoke", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL?.includes("vercel.app"),
    "Set PLAYWRIGHT_BASE_URL to production",
  );

  test("production home responds", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByText(/pausibl/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
