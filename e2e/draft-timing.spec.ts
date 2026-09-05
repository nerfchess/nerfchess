import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Draft decision timing end-to-end.
//
// The contract under test (docs/draft-sequence.md): the decision countdown
// must never run while the chest opening or card dealing plays; it appears
// only once both cards are dealt and interactive, carrying the (nearly) full
// window; reduced motion follows the same sequence without deadlocking; and
// an expired window resolves the draft DETERMINISTICALLY — a selected card is
// auto-confirmed, otherwise one of the offered cards is taken — so the match
// never lands in a "Draft pending" recovery state the player must clear by
// hand. The precise "the selected card is the one confirmed" guarantee is
// pinned by the deterministic unit tests (npm run test:draft-timeout); this
// browser flow proves the draft actually resolves and play resumes.
//
// Uses the fully client-side bot game (no worker backend needed) and its
// game-start opening pick, so every test reaches a draft within seconds.
// ---------------------------------------------------------------------------

const GAME_URL = "/game?mode=buff&difficulty=easy&color=w&t=0&inc=0&rated=0";

async function freshGameSetup(page: Page) {
  // Premoves off; wipe any persisted local game so each test seeds a fresh
  // one with a fresh opening pick (same hermetic setup as smoke.spec.ts).
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
}

const decisionTimer = (page: Page) =>
  page.getByRole("timer", { name: "Draft decision timer" });

test.describe("draft decision timing (full motion)", () => {
  // The global e2e config forces reduced motion for determinism; this block
  // deliberately restores full motion so the chest + deal sequence really
  // plays and the countdown-after-animations contract is exercised for real.
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("countdown stays hidden through chest and deal, then grants the full window", async ({
    page,
  }) => {
    await freshGameSetup(page);
    await page.goto(GAME_URL);

    // The opening pick arrives as a sealed chest: the preparation label is
    // up and there is NO decision countdown anywhere on the page.
    await expect(page.getByText("Opening your draft")).toBeVisible({ timeout: 60_000 });
    // The countdown is identified by its role, not by wording: the "Choose
    // within" label was dropped when the timer moved inline into the panel
    // header, and the role assertion was always the stronger check anyway.
    await expect(decisionTimer(page)).toHaveCount(0);
    await expect(
      page.getByText("Your timer starts when the cards are ready"),
    ).toBeVisible();

    // The chest opens and the cards deal in...
    await expect(page.locator(".draft-deal-grid")).toBeVisible({ timeout: 20_000 });

    // ...and only then does the countdown appear, with the whole window
    // intact: at least 18 of the 20 seconds must still be on it when it
    // first shows (dealing consumed none of the decision time).
    await expect(decisionTimer(page)).toBeVisible({ timeout: 10_000 });
    // The reassurance line goes away with the preparation phase.
    await expect(
      page.getByText("Your timer starts when the cards are ready"),
    ).toHaveCount(0);
    const secs = parseInt(await decisionTimer(page).locator(".font-mono").innerText(), 10);
    expect(secs).toBeGreaterThanOrEqual(18);
  });
});

test.describe("draft decision timing (reduced motion)", () => {
  test("reduced motion arms the countdown immediately and never deadlocks", async ({
    page,
  }) => {
    await freshGameSetup(page);
    await page.goto(GAME_URL);

    // Under reduced motion the chest and deal collapse, but the SAME
    // sequence runs: cards first, then the countdown, still a full window.
    await expect(page.locator(".draft-deal-grid")).toBeVisible({ timeout: 60_000 });
    await expect(decisionTimer(page)).toBeVisible({ timeout: 10_000 });
    const secs = parseInt(await decisionTimer(page).locator(".font-mono").innerText(), 10);
    expect(secs).toBeGreaterThanOrEqual(18);
  });

  test("an expired window minimizes the draft to the corner and keeps it open", async ({
    page,
  }) => {
    // Sits through the full 20s window on purpose.
    test.slow();
    await freshGameSetup(page);
    await page.goto(GAME_URL);

    // Cards are dealt and the decision countdown is armed.
    await expect(page.locator(".draft-deal-grid")).toBeVisible({ timeout: 60_000 });
    await expect(decisionTimer(page)).toBeVisible({ timeout: 10_000 });

    // Tentatively select the first card, then walk away — never press Confirm.
    await page.locator(".draft-deal-grid button").first().click();

    // The window runs out. Nothing is picked for the player: the full overlay
    // steps aside into the compact corner panel, the cards stay one tap away,
    // and the board is playable again with the clock running.
    await expect(page.locator("[data-draft-compact-cards]")).toBeVisible({ timeout: 40_000 });
    await expect(page.locator(".draft-deal-grid")).toHaveCount(0);
    await expect(page.getByText("Draft pending.")).toHaveCount(0);
    await expect(page.getByRole("gridcell").first()).toBeVisible();

    // The corner panel never tucks itself away: it is still there well after
    // the old auto-tuck fuse would have fired, and resolving it works from
    // there.
    await page.waitForTimeout(13_000);
    const compact = page.locator("[data-draft-compact-cards]");
    await expect(compact).toBeVisible();
    await compact.locator("button").first().click();
    await page.getByRole("button", { name: /^confirm/i }).click();
    await expect(compact).toHaveCount(0, { timeout: 10_000 });
  });
});
