import { test, expect } from "@playwright/test";

// F218 regression: the game-over chime is voiced once per finished game. The
// ledger of voiced games lived in a module Set only, so a hard reload of a
// finished game's page rang the ending again.
//
// Counts oscillators created by the page (every synthesized cue is built from
// them) from load until the reloaded result panel has been up for a second.

const GAME_URL = "/game?mode=plain&difficulty=easy&color=w&t=0&inc=0&rated=0";

test.use({
  contextOptions: { reducedMotion: "no-preference" },
  storageState: {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "dc:settings-v1",
            value: JSON.stringify({ premovesEnabled: false, confirmResign: false }),
          },
        ],
      },
    ],
  },
});

test("a reloaded finished game does not ring the ending again", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __osc: number };
    w.__osc = 0;
    const proto = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext).prototype;
    const orig = proto.createOscillator;
    proto.createOscillator = function (this: AudioContext) {
      w.__osc += 1;
      return orig.call(this);
    };
  });
  await page.goto(GAME_URL);
  await page.getByRole("button", { name: "Resign the game" }).first().click({ timeout: 120_000 });
  const dialog = page.locator('[data-dialog="game-over"]');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  // The live ending is voiced.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __osc: number }).__osc)).toBeGreaterThan(0);

  await page.reload();
  await expect(dialog).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(1_000);
  const oscAfterReload = await page.evaluate(() => (window as unknown as { __osc: number }).__osc);
  expect(oscAfterReload).toBe(0);
});
