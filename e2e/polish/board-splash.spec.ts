import { test, expect } from "@playwright/test";

// F207 regression: splash keys used to be `${title}:${queue length}`, so the
// same constraint arriving while an equal key was current queued a duplicate
// key, BoardSplash's expiry timer (keyed on event.key) never re-armed, and the
// splash stood over the board for the rest of the game with every later
// announcement stuck behind it. Also pins the motion-off state (globals.css
// parks both layers, whose last keyframe is transparent) and the assertive
// live region.

const settings = (animationSpeed: string) => ({
  cookies: [],
  origins: [
    {
      origin: "http://localhost:3000",
      localStorage: [{ name: "dc:settings-v1", value: JSON.stringify({ animationSpeed }) }],
    },
  ],
});

test.describe("full motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" }, storageState: settings("normal") });

  test("a repeated constraint never stalls the splash queue", async ({ page }) => {
    await page.goto("/dev/splash");
    const freeze = page.getByRole("button", { name: "Freeze one" });
    const splash = page.locator(".board-splash");
    await freeze.click();
    await expect(splash).toBeVisible();
    await page.waitForTimeout(500);
    await freeze.click(); // queued behind the first
    await expect(splash).toBeVisible();
    await page.waitForTimeout(2_200); // first expired, second is current
    await freeze.click(); // used to reuse the current key
    // Three splashes of about 2s each, one after another: all gone well
    // inside 8s. Before the fix the queue stalled here for good.
    await expect(splash).toHaveCount(0, { timeout: 8_000 });
  });
});

test.describe("animations off", () => {
  test.use({ storageState: settings("off") });

  test("the splash is shown still, then goes", async ({ page }) => {
    await page.goto("/dev/splash");
    await page.getByRole("button", { name: "Skip turn" }).click();
    const card = page.locator(".board-splash-card");
    await expect(card).toBeVisible();
    await page.waitForTimeout(400);
    // Both layers carry keyframes whose last frame is transparent.
    const opacities = await page.evaluate(() =>
      [".board-splash", ".board-splash-card"].map((s) => {
        const el = document.querySelector(s);
        return el ? getComputedStyle(el).opacity : "missing";
      }),
    );
    expect(opacities).toEqual(["1", "1"]);
    await expect(page.locator('.board-splash[role="alert"]')).toContainText("Turn skipped");
    await expect(card).toHaveCount(0, { timeout: 4_000 });
  });
});
