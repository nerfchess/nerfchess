// Slice D: the social routes (/tv, /tournaments, /clubs, /inbox, /community,
// /leaderboard, /friend).
//
// Each test is the regression check for one ledger row. They were run against
// the tree before the fix and failed there (docs/polish-pass/evidence/D/
// spec-before.txt), and pass after it (spec-after.txt).
//
//   scripts/polish/heavy.sh ./node_modules/.bin/playwright test e2e/polish/social-routes.spec.ts
//
// Needs the seeded local accounts (npm run polish:seed) and the shared dev
// server on :3000. The local dev server has no Durable Object, so the TV tests
// stub the lobby and the archive with page.route.

import { expect, test, type Page } from "@playwright/test";
import { polishAuthState } from "./clsProbe";

function lobbyGame(i: number) {
  return {
    id: `tvtest${i}`,
    mode: i % 2 ? "nerf" : "buff",
    players: {
      w: { name: `white_${i}`, rating: 1500 + i, avatar: null, provisional: false },
      b: { name: `black_${i}`, rating: 1400 + i, avatar: null, provisional: i === 1 },
    },
    timeSec: 180,
    incrementSec: 2,
    rated: true,
    moves: 12,
    watchers: 3 - (i % 3),
  };
}

const ARCHIVED = {
  id: "tvarchive1",
  moves: "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6",
  white_name: "archive_white",
  black_name: "archive_black",
  white_rating_before: 1510,
  black_rating_before: 1490,
  white_avatar: null,
  black_avatar: null,
  category: "nerf",
};

async function stubTv(page: Page, games: number) {
  await page.route("**/api/lobby?**", (route) =>
    route.fulfill({
      json: {
        players: [],
        anonymous: 0,
        games: Array.from({ length: games }, (_, i) => lobbyGame(i)),
        challenges: [],
        seeks: [],
      },
    }),
  );
  await page.route("**/api/games/recent?**", (route) =>
    route.fulfill({ json: { game: ARCHIVED, games: [ARCHIVED] } }),
  );
}

test.describe("/tv", () => {
  // F019: the whole view sat in <Suspense fallback={null}>, so the server HTML
  // had no header and no page at all.
  test("the server HTML carries the header and the page heading", async ({ request }) => {
    const res = await request.get("/tv?mode=nerf");
    const html = await res.text();
    expect(html).toContain("<h1");
    expect(html).toMatch(/Nerf TV/);
    expect(html).toMatch(/<nav|<header/);
  });

  // F130: the only h1 was dropped as soon as a game was on the board.
  test("keeps exactly one h1 once a game is on the board", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    await expect(page.getByText("archive_white").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/TV/);
  });

  // F133: player profile links sat inside the row's <button>.
  test("live rows do not nest links inside the row button", async ({ page }) => {
    await stubTv(page, 3);
    await page.goto("/tv");
    await expect(page.getByText("white_0").first()).toBeVisible({ timeout: 60_000 });
    const nested = await page.locator("button a, a button, button button, a a").count();
    expect(nested).toBe(0);
    // The row is still one control that picks the game, and the names still
    // open profiles.
    await expect(page.getByRole("button", { name: /white_1 vs black_1/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /black_1/ }).first()).toHaveAttribute("href", "/u/black_1");
  });

  // F159: prev, next and fullscreen were 36px on touch.
  test("board controls are 44px on a coarse pointer", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await stubTv(page, 3);
    await page.goto("/tv");
    await expect(page.getByRole("button", { name: "Watch fullscreen" })).toBeVisible({ timeout: 60_000 });
    for (const name of ["Previous live game", "Next live game", "Watch fullscreen"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      expect(b, name).not.toBeNull();
      expect(Math.round(b!.height), name).toBeGreaterThanOrEqual(44);
      expect(Math.round(b!.width), name).toBeGreaterThanOrEqual(44);
    }
    await ctx.close();
  });

  // F139: the fullscreen overlay was not a dialog and left focus behind it.
  test("fullscreen is a modal dialog that takes and returns focus", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    const open = page.getByRole("button", { name: "Watch fullscreen" });
    await expect(open).toBeVisible({ timeout: 60_000 });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    // Focus is inside, and Tab stays inside.
    for (let i = 0; i < 12; i++) {
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Tab");
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  });

  // F162: Final and Replay were uppercase tracked chips.
  test("status chips are sentence case", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    const chip = page.getByText("Replay", { exact: true }).first();
    await expect(chip).toBeVisible({ timeout: 60_000 });
    const style = await chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return { transform: s.textTransform, spacing: s.letterSpacing };
    });
    expect(style.transform).toBe("none");
    expect(["normal", "0px"]).toContain(style.spacing);
  });
});
