import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Draft decision timing end-to-end.
//
// The contract under test (docs/draft-sequence.md): the decision countdown
// must never run while the chest opening or card dealing plays; it appears
// only once both cards are dealt and interactive, carrying the (nearly) full
// window; reduced motion follows the same sequence without deadlocking; and
// an expired window moves the draft, unresolved and with all its state, to
// the compact pending panel, from which it can still be resolved.
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
    await expect(decisionTimer(page)).toHaveCount(0);
    await expect(page.getByText("Choose within")).toHaveCount(0);
    await expect(
      page.getByText("Your timer starts when the cards are ready"),
    ).toBeVisible();

    // The chest opens and the cards deal in...
    await expect(page.locator(".draft-deal-grid")).toBeVisible({ timeout: 20_000 });

    // ...and only then does the countdown appear, with the whole window
    // intact: at least 18 of the 20 seconds must still be on it when it
    // first shows (dealing consumed none of the decision time).
    await expect(decisionTimer(page)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Choose within")).toBeVisible();
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

  test("an expired window moves the draft, unresolved, to the pending panel", async ({
    page,
  }) => {
    // Sits through the full 20s window on purpose.
    test.slow();
    await freshGameSetup(page);
    await page.goto(GAME_URL);
    await expect(decisionTimer(page)).toBeVisible({ timeout: 60_000 });

    // Let the window run out without acting. The draft must survive: the
    // compact "Draft pending" panel (or its tucked Resolve chip) appears,
    // and since this game has NO clock, no clock warning is shown.
    const pendingText = page.getByText("Draft pending.").first();
    const resolveChip = page.getByRole("button", { name: /resolve your buff draft/i });
    await expect(pendingText.or(resolveChip)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("Your game clock is running")).toHaveCount(0);

    // Reopen from the tucked chip when needed, then resolve from the compact
    // panel: select the first card, then confirm it by name.
    if (await resolveChip.isVisible().catch(() => false)) {
      await resolveChip.click();
    }
    const cards = page.locator("[data-draft-compact-cards] button");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await cards.first().click();
    const confirm = page.getByRole("button", { name: /^confirm /i });
    await expect(confirm).toBeVisible({ timeout: 5_000 });
    // The confirm control names the selected card; that exact card must land
    // in the dock, proving the selection survived the compact-panel expiry.
    const pickedName = (await confirm.innerText()).replace(/^confirm\s*/i, "").trim();
    await confirm.click();

    // Resolved: the pending panel is gone, play continues, and the picked
    // card sits in the buff dock (this is the game-start opening pick, so no
    // "next draft" chip exists yet; it appears with the first move).
    await expect(page.getByText("Draft pending.")).toHaveCount(0);
    await expect(resolveChip).toHaveCount(0);
    if (pickedName) {
      await expect(page.locator("aside [data-buff-dock]")).toContainText(pickedName, {
        timeout: 15_000,
      });
    }
  });
});
