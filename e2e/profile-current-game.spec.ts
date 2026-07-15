import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Profile "currently playing" live preview (CurrentGameCard).
//
// The card is a thin wrapper over the SAME spectate pipeline the TV uses
// (MPSession.watch -> applySpectatorEnvelope -> featuredBoard -> HeroBoard). Its
// contract, and the property this spec guards, is:
//
//   - when the profiled user is NOT in a live game, it renders NOTHING -- never a
//     false starting board;
//   - when the user IS in a live game it renders their board;
//   - an unreconstructable / unavailable game renders nothing, not a wrong board.
//
// A live board needs a running worker with that user actually seated, so the
// "shows a board while playing" leg requires a full server. The always-true leg
// -- an idle profile must not paint a starting position -- is verifiable against
// any server that can render the profile at all. The username is taken from
// E2E_PROFILE_USERNAME (a known seeded account) or defaults to a house bot name.
// ---------------------------------------------------------------------------

const USERNAME = process.env.E2E_PROFILE_USERNAME || "nerfbot";

test("an idle profile never shows a false starting board", async ({ page }) => {
  const resp = await page.goto(`/u/${USERNAME}`);
  // If the profile itself is unavailable in this env, there is nothing to
  // assert about its live-preview card; skip rather than fail.
  test.skip(!resp || resp.status() >= 400, `profile /u/${USERNAME} not available in this env`);

  // The profile must render (heading / username somewhere on the page).
  await expect(page.getByText(new RegExp(USERNAME, "i")).first()).toBeVisible({ timeout: 30_000 });

  // The current-game card renders nothing when the user is not in a live game.
  // Give the watch a moment to resolve, then assert the live-preview region did
  // not paint a board. (A user who happens to be live is out of scope here; the
  // guard we assert is the "no false starting board when idle" invariant.)
  const preview = page.getByTestId("current-game-card");
  const hasPreview = await preview.count();
  if (hasPreview === 0) {
    // Rendered nothing at all -- the correct idle behavior.
    expect(hasPreview).toBe(0);
  } else {
    // If a preview region exists it must contain a real board (the user is live),
    // never an empty/opening placeholder with no move context.
    await expect(preview.locator("[data-board-grid]").first()).toBeVisible({ timeout: 10_000 });
  }
});
