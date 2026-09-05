import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// End-to-end smoke test.
//
// Covers the fully client-side bot game (no worker backend needed): start a
// local Buff-mode game against the easy bot, play five own moves (the bot
// replies automatically), resolve the draft that fires after the fifth move,
// and check the picked card lands in the buff dock. Plus quick render checks
// of the home page and the lobby.
// ---------------------------------------------------------------------------

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nerf Chess/i);
  // One dominant CTA into the lobby, plus the two secondary ways in.
  await expect(page.getByRole("link", { name: /^create a game$/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: /^play with a friend$/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^play with the computer$/i }),
  ).toBeVisible();
});

test("lobby page renders", async ({ page }) => {
  await page.goto("/lobby");
  await expect(
    page.getByRole("heading", { name: /^lobby$/i }),
  ).toBeVisible({ timeout: 30_000 });
});

/**
 * Play one legal move as the human side. Clicking one of our pieces paints
 * legal-move dots (`.dot-target` for quiet moves, `.dot-capture` for
 * captures) on the destination squares inside the [data-board-grid] grid;
 * clicking a dotted square plays the move.
 *
 * Quiet moves only, and a fresh source piece each time: that makes captures,
 * promotions, and repetition impossible within the five moves this test
 * needs, whatever the bot replies.
 */
async function playOneMove(page: Page, used: Set<string>): Promise<void> {
  // Pawn single/double advances and knight hops from the initial setup; the
  // bot cannot block them all within five moves.
  const candidates = ["e2", "d2", "b1", "g1", "c2", "f2", "a2", "h2", "b2", "g2"];
  const grid = page.locator("[data-board-grid]");
  for (const sq of candidates) {
    if (used.has(sq)) continue;
    await grid.locator(`[role="gridcell"][aria-label="square ${sq}"]`).click();
    const quietTarget = grid.locator('[role="gridcell"]:has(.dot-target)').first();
    try {
      await quietTarget.waitFor({ state: "visible", timeout: 2_000 });
    } catch {
      // No quiet move from this piece right now (blocked or not ours to
      // move); try the next candidate. The stray selection is harmless —
      // clicking the next piece just re-selects.
      continue;
    }
    await quietTarget.click();
    used.add(sq);
    return;
  }
  throw new Error("no movable piece found among candidate squares");
}

/**
 * Resolve a pending buff draft offer by taking its first card, and return that
 * card's name (or "" if the offer resolved without a clean confirm). Used for
 * both the game-start "opening pick" (a buff pair dealt to each side, mirroring
 * the opening nerf) and the ply-5 cadence draft.
 *
 * Two states must be handled. Fresh, the offer shows its deal grid. After a ~20s
 * lock-in it does NOT auto-resolve; it MINIMIZES to a "Draft open" chip and
 * keeps the offer open (the clock resumes), and until the player acts the board
 * stays blocked. So this reopens the minimized panel when needed, takes the
 * first card, and only concludes success once neither the cards nor the reopen
 * chip remain. It never clicks the board (the offer's full-screen scrim would
 * swallow the click and hang), and every click carries a short timeout so a
 * transient non-actionable state can never stall the whole test.
 */
async function takeFirstCard(page: Page): Promise<string> {
  const grid = page.locator(".draft-deal-grid");
  const reopen = page.getByRole("button", { name: "Show the draft" });
  // The offer must be present first (dealt, or minimized to its chip) — else an
  // empty board would look "resolved" before the cards even arrive.
  await expect(grid.or(reopen)).toBeVisible({ timeout: 20_000 });

  let picked = "";
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    // Minimized to the "Draft open" chip (lock-in expired): reopen it.
    if (await reopen.isVisible().catch(() => false)) {
      await reopen.click({ timeout: 3_000 }).catch(() => {});
      await grid.waitFor({ state: "visible", timeout: 3_000 }).catch(() => {});
    }
    if (await grid.isVisible().catch(() => false)) {
      const card = grid.locator(".draft-card-front > button").first();
      const name = (
        await card.locator(".font-display").first().innerText().catch(() => "")
      ).trim();
      if (name) {
        await card.click({ timeout: 3_000 }).catch(() => {});
        const confirm = page.getByRole("button", { name: `Confirm ${name}` });
        if (await confirm.isVisible().catch(() => false)) {
          await confirm.click({ timeout: 3_000 }).catch(() => {});
          picked = name;
          await grid.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
        }
      }
    }
    // Resolved once neither the cards nor the reopen chip remain.
    const gridUp = await grid.isVisible().catch(() => false);
    const chipUp = await reopen.isVisible().catch(() => false);
    if (!gridUp && !chipUp) return picked;
    await page.waitForTimeout(300);
  }
  throw new Error("could not resolve the draft offer");
}

test("buff-mode bot game: moves, draft pick, card in dock", async ({ page }) => {
  // Several fresh-game retries guard the rare bot king-hunt; give the run room
  // so the retry loop, not the clock, is what determines the outcome.
  test.slow();

  // Premoves off (stored settings) so no click during the bot's turn can
  // ever queue a move; every move this test plays happens on our turn. Also
  // wipe any persisted local game on every navigation (runs before the page's
  // bootstrap, which would otherwise resume it): each retry below must re-roll
  // a genuinely fresh game — new RNG seed, new opening pick — not reload the
  // same (possibly lost) one.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "dc:settings-v1",
        JSON.stringify({ premovesEnabled: false }),
      );
      window.localStorage.removeItem("dc:active-ai-game");
    } catch {
      // localStorage unavailable: defaults still work, just less hermetic.
    }
  });

  // Local (casual) Buff-mode game vs the easy bot, playing white, no clock —
  // the exact game /play's "Start game" launches for a signed-out visitor.
  const gameUrl = "/game?mode=buff&difficulty=easy&color=w&t=0&inc=0&rated=0";

  // The command rail's buff dock is visible at desktop width and carries the
  // draft countdown chip ("Next draft in N moves"). A second dock lives in the
  // (hidden) mobile drawer, so scope to the desktop rail's <aside>.
  const grid = page.locator("[data-board-grid]");
  const dock = page.locator("aside [data-buff-dock]");
  const heading = page.getByRole("heading", { name: /choose a buff/i });
  const gameOver = page.getByRole("dialog").getByText("Game over");

  // Load a brand-new game and clear its game-start opening pick — buff mode now
  // deals a game-start buff pair (mirroring the opening nerf) that blocks the
  // board until resolved. A fresh navigation remounts the page, so each call
  // seeds a new game with a fresh opening offer.
  async function startFreshGame(): Promise<void> {
    await page.goto(gameUrl);
    await expect(grid).toBeVisible({ timeout: 60_000 });
    await expect(dock).toBeVisible({ timeout: 30_000 });
    // Clear the game-start opening pick (never auto-resolves) so the board
    // starts accepting moves; the opener it yields does not matter here.
    await takeFirstCard(page);
  }

  // Five own moves, retried across fresh games. NerfChess allows king capture
  // (no check enforcement) and the easy bot plays with heavy random noise, so an
  // unlucky king-hunt can end the game before the ply-10 draft ever fires; this
  // helper deliberately plays quiet moves that ignore threats, so it is a real
  // if rare possibility. On a game-over, reload a brand-new game (fresh RNG seed
  // and a fresh opening pick) and try again — a genuinely broken draft would
  // instead fail every attempt.
  const MAX_ATTEMPTS = 6;
  attempts: for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await startFreshGame();
    const used = new Set<string>();
    for (let k = 1; k <= 5; k++) {
      await playOneMove(page, used);
      if (k < 5) {
        const left = 5 - k;
        // The countdown chip ("Next draft in N moves") appears with the first
        // move and decrements exactly when the bot's reply lands, so waiting
        // for it both confirms the bot moved and that it is our turn again.
        // A game-over dialog instead means the bot captured our king.
        await expect(
          dock
            .getByText(`Next draft in ${left} move${left === 1 ? "" : "s"}`)
            .or(gameOver),
        ).toBeVisible({ timeout: 45_000 });
        if (await gameOver.isVisible()) {
          expect(attempt, "bot ended the game before the draft on every attempt").toBeLessThan(MAX_ATTEMPTS);
          continue attempts;
        }
      }
    }

    // After the fifth own move (and the bot's reply) the shared draft fires:
    // the overlay deals an offer of buff cards. Generous timeout: the bot's AI
    // search runs in-page and a cold first run (dev server + JIT warmup) can
    // be slow to reach the draft, so give it margin before the CI retry kicks
    // in. Same king-capture caveat as above on this final bot reply.
    await expect(heading.or(gameOver)).toBeVisible({ timeout: 75_000 });
    if (await gameOver.isVisible()) {
      expect(attempt, "bot ended the game before the draft on every attempt").toBeLessThan(MAX_ATTEMPTS);
      continue attempts;
    }
    break;
  }
  await expect(heading).toBeVisible();

  // Resolve the ply-5 draft the same way as the opening pick: take its first
  // card, reopening the panel if its lock-in has minimized it.
  const cardName = await takeFirstCard(page);

  // The overlay is gone and a drafted card sits in the buff dock, with the next
  // cadence draft five moves out. When we locked the card in ourselves, assert
  // that exact card is docked; either way the draft fired and play continued.
  await expect(page.locator(".draft-deal-grid")).toBeHidden({ timeout: 20_000 });
  if (cardName) {
    await expect(dock).toContainText(cardName, { timeout: 15_000 });
  }
  await expect(dock.getByText("Next draft in 5 moves")).toBeVisible({
    timeout: 15_000,
  });
});
