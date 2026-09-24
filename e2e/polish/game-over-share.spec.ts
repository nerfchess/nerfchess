import { test, expect } from "@playwright/test";

// F240 regression: Share on an online result copied the site root, so a
// shared result never unfurled the game's own card. It now carries
// /game/{id}. Clipboard path (no Web Share in headless Chromium).

test("sharing an online result links the game page", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: string[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (t: string) => void w.__shared.push(t) },
      configurable: true,
    });
  });
  await page.goto("/dev/splash");
  await page.getByRole("button", { name: "Online game over" }).click();
  const dialog = page.locator('[data-dialog="game-over"]');
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  await dialog.getByRole("button", { name: /^Share/ }).first().click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared: string[] }).__shared.join("\n")))
    .toContain("/game/devSplash01");
});
