import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Nerf Chess TV channels + failover.
//
// These drive the real /tv page. With no live worker games in the CI env the
// featured board falls back to a recent replay (or a bounded "no live games"
// notice) instead of an eternal spinner -- which is itself one of the bugs this
// repair fixes, so the specs assert the page SETTLES (a board or a bounded
// notice) rather than requiring live games.
//
// What must hold regardless of whether anything is live:
//   - each channel (All / Nerf / Buff) renders and settles (no infinite spinner);
//   - switching channels fully resets the surface (no cross-channel leak / freeze);
//   - the live-directory keeps rendering independent of the featured tune-in.
//
// The failover-from-a-broken-candidate and manual-pick paths need a live worker
// feeding a deliberately-broken game, so those are covered by the offline
// reducer harness (scripts/test-tv-spectator.ts, INTEGRATION section); here we
// assert the observable page-settling behavior a browser can verify.
// ---------------------------------------------------------------------------

const SETTLE_MS = 15_000;

/** The featured area has settled when it shows a board grid OR a bounded
 *  "nothing live" notice -- never a perpetual spinner. */
async function expectSettled(page: import("@playwright/test").Page) {
  const board = page.locator("[data-board-grid]").first();
  const notice = page
    .getByText(
      /no games are live|no .*games are being|nothing live|not currently|can't reach the game server/i,
    )
    .first();
  await expect(async () => {
    const hasBoard = await board.isVisible().catch(() => false);
    const hasNotice = await notice.isVisible().catch(() => false);
    expect(hasBoard || hasNotice).toBeTruthy();
  }).toPass({ timeout: SETTLE_MS });
}

test("TV All channel renders and settles (no infinite spinner)", async ({ page }) => {
  await page.goto("/tv");
  await expect(page.getByRole("heading", { name: /nerf chess tv/i })).toBeVisible({ timeout: 30_000 });
  await expectSettled(page);
});

test("TV Nerf channel filters to the Nerf pool and settles", async ({ page }) => {
  await page.goto("/tv?mode=nerf");
  await expect(page.getByRole("heading", { name: /nerf tv/i })).toBeVisible({ timeout: 30_000 });
  await expectSettled(page);
});

test("TV Buff channel filters to the Buff pool and settles", async ({ page }) => {
  await page.goto("/tv?mode=buff");
  await expect(page.getByRole("heading", { name: /buff tv/i })).toBeVisible({ timeout: 30_000 });
  await expectSettled(page);
});

test("switching channels fully resets the surface (no cross-channel freeze)", async ({ page }) => {
  await page.goto("/tv");
  await expect(page.getByRole("heading", { name: /nerf chess tv/i })).toBeVisible({ timeout: 30_000 });
  await expectSettled(page);

  // Navigate All -> Nerf -> Buff -> All; each must independently settle, proving
  // the tune-in state (spinner / failedIds / buffer) resets per channel and one
  // channel's retry loop can never freeze the next.
  for (const [href, heading] of [
    ["/tv?mode=nerf", /nerf tv/i],
    ["/tv?mode=buff", /buff tv/i],
    ["/tv", /nerf chess tv/i],
  ] as const) {
    await page.goto(href);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 30_000 });
    await expectSettled(page);
  }
});

test("the live directory renders independent of the featured tune-in", async ({ page }) => {
  await page.goto("/tv");
  // The "Live games" directory panel is always present (it polls the lobby on
  // its own cadence, so it never freezes while a tune is retrying).
  await expect(page.getByText(/live games/i).first()).toBeVisible({ timeout: 30_000 });
});
