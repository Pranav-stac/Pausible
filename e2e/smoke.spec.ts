import { expect, test } from "@playwright/test";

test.describe("Pausible website smoke", () => {
  test("landing page loads with brand and start CTA", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    // Brand should be a hero-level signal on the landing page.
    await expect(page.getByText(/pausibl/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("/test assessment page renders personality + wellness sections", async ({ page }) => {
    const res = await page.goto("/test", { waitUntil: "domcontentloaded" });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();

    await expect(page.getByText(/personality/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/wellness context/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
    await expect(page.getByDisplayValue("Test User")).toBeVisible();
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
