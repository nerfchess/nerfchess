import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// F204 regression: the game-over choreography must play when the game ends
// with a clock under the low-time line (every flag, most bullet endings).
//
// While either clock reads under 20s the low-time hold stamps
// html[data-anim="off"] (src/lib/lowTimeMotion.ts). The game ending releases
// it, but the result panel used to mount while the attribute still read "off"
// and useReducedMotion never re-read after subscribing, so the panel stayed in
// its motion-off branch (--beat 0, no seam, no spring, no victory burst) for
// the whole ending.
//
// The bot game at 15 seconds a side sits under the line from the first frame,
// so a resign reproduces the exact state a flag leaves behind without waiting
// for a clock to run out.

const EVIDENCE = path.join("docs", "polish-pass", "evidence", "J");
const GAME_URL = "/game?mode=plain&difficulty=easy&color=w&t=15&inc=0&rated=0";

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
            value: JSON.stringify({
              animationSpeed: "normal",
              followSystemMotion: false,
              premovesEnabled: false,
              confirmResign: false,
            }),
          },
        ],
      },
    ],
  },
});

test("game over under the low-time hold still choreographs the ending", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("dc:active-ai-game");
    } catch {
      // storage blocked: the game still starts fresh from the URL
    }
  });
  await page.goto(GAME_URL);

  // The hold engages on the first clock report (15s is under the 20s line).
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.anim), { timeout: 120_000 })
    .toBe("off");

  const resign = page.getByRole("button", { name: "Resign the game" }).first();
  const dialog = page.locator('[data-dialog="game-over"]');

  // First ending: loads the result panel's lazy chunk. The panel of a later
  // game in the same session then mounts in the very commit that ends the
  // game, before the clock pills release the hold, which is the case that
  // used to stick (a rematch, or any ending once the chunk is cached).
  await resign.click({ timeout: 60_000 });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.anim), { timeout: 60_000 })
    .toBe("off");

  await resign.click({ timeout: 60_000 });
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  // Sample the panel's tempo on its first frames and after it settles.
  const beats = await page.evaluate(async () => {
    const out: { t: number; beat: string; anim: string | undefined }[] = [];
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      const el = document.querySelector<HTMLElement>('[data-dialog="game-over"]');
      out.push({
        t: Math.round(performance.now() - t0),
        beat: el?.style.getPropertyValue("--beat") ?? "",
        anim: document.documentElement.dataset.anim,
      });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    return out;
  });
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(
    path.join(EVIDENCE, `f204-${process.env.F204_LABEL ?? "run"}.json`),
    JSON.stringify(beats, null, 1),
  );

  // The hold is gone once the game is over.
  expect(await page.evaluate(() => document.documentElement.dataset.anim)).toBe("normal");
  // And the panel choreographs at the player's tempo, from its first frame.
  expect(beats[0].beat).toBe("1");
  expect(beats[beats.length - 1].beat).toBe("1");
});

test.describe("player chose animations off", () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3000",
          localStorage: [
            {
              name: "dc:settings-v1",
              value: JSON.stringify({
                animationSpeed: "off",
                premovesEnabled: false,
                confirmResign: false,
              }),
            },
          ],
        },
      ],
    },
  });

  test("looking through the hold keeps the player's own off", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("dc:active-ai-game");
      } catch {
        // storage blocked
      }
    });
    await page.goto(GAME_URL);
    const resign = page.getByRole("button", { name: "Resign the game" }).first();
    await resign.click({ timeout: 120_000 });
    const dialog = page.locator('[data-dialog="game-over"]');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => document.documentElement.dataset.anim)).toBe("off");
    await expect(dialog).toHaveAttribute("style", /--beat:\s*0/);
    // The panel reached its end state at once: fully opaque, nothing parked.
    await expect
      .poll(() => dialog.evaluate((el) => getComputedStyle(el).opacity), { timeout: 2_000 })
      .toBe("1");
  });
});
