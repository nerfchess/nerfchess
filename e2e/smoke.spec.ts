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
  await expect(page.getByRole("link", { name: /open lobby/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: /^play a friend$/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^play a bot$/i }),
  ).toBeVisible();
});

test("lobby page renders", async ({ page }) => {
  await page.goto("/lobby");
  await expect(
    page.getByRole("heading", { name: /the lobby/i }),
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

test("buff-mode bot game: moves, draft pick, card in dock", async ({ page }) => {
  // Premoves off (stored settings) so no click during the bot's turn can
  // ever queue a move; every move this test plays happens on our turn.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "dc:settings-v1",
        JSON.stringify({ premovesEnabled: false }),
      );
    } catch {
      // localStorage unavailable: defaults still work, just less hermetic.
    }
  });

  // Local (casual) Buff-mode game vs the easy bot, playing white, no clock —
  // the exact game /play's "Start game" launches for a signed-out visitor.
  await page.goto("/game?mode=buff&difficulty=easy&color=w&t=0&inc=0&rated=0");

  const grid = page.locator("[data-board-grid]");
  await expect(grid).toBeVisible({ timeout: 60_000 });

  // The command rail's buff dock is visible at desktop width and carries the
  // draft countdown chip ("Next draft in N moves"). A second dock lives in
  // the (hidden) mobile drawer, so scope to the desktop rail's <aside>.
  const dock = page.locator("aside [data-buff-dock]");
  await expect(dock).toBeVisible({ timeout: 30_000 });

  // Five own moves. The countdown chip ("Next draft in N moves") appears
  // with the first move and decrements exactly when the bot's reply lands,
  // so waiting for "Next draft in <5-k> moves" after our k-th move both
  // confirms the bot moved and that it is our turn again.
  const used = new Set<string>();
  for (let k = 1; k <= 5; k++) {
    await playOneMove(page, used);
    if (k < 5) {
      const left = 5 - k;
      await expect(
        dock.getByText(`Next draft in ${left} move${left === 1 ? "" : "s"}`),
      ).toBeVisible({ timeout: 45_000 });
    }
  }

  // After the fifth own move (and the bot's reply) the shared draft fires:
  // the overlay deals an offer of buff cards. Generous timeout: the bot's AI
  // search runs in-page and a cold first run (dev server + JIT warmup) can be
  // slow to reach the draft, so give it margin before the CI retry kicks in.
  await expect(
    page.getByRole("heading", { name: /choose a buff/i }),
  ).toBeVisible({ timeout: 75_000 });

  // Pick the first card: one click selects it, the explicit "Confirm pick"
  // button locks it in (exempt from the double-click guard).
  const dealGrid = page.locator(".draft-deal-grid");
  await expect(dealGrid).toBeVisible();
  const firstCard = dealGrid.locator(".draft-card-front > button").first();
  await expect(firstCard).toBeVisible();
  const cardName = (
    await firstCard.locator(".font-display").first().innerText()
  ).trim();
  expect(cardName.length).toBeGreaterThan(0);

  await firstCard.click();
  const confirm = page.getByRole("button", { name: "Confirm pick" });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // The overlay resolves and the picked card lands in the buff dock (both
  // the "Latest" pocket and the "Your buffs" arsenal name it).
  await expect(dealGrid).toBeHidden({ timeout: 15_000 });
  await expect(dock).toContainText(cardName, { timeout: 15_000 });
  await expect(dock.getByText("Next draft in 5 moves")).toBeVisible({
    timeout: 15_000,
  });
});
