import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// The command rail.
//
// The rail existed as two near-identical copies of ~100 lines of JSX — one in
// OnlineMatch, one in the bot game — that had drifted apart in both directions.
// Collapsing them into one <CommandRail> is a refactor with no test coverage of
// its own, so this spec pins the parts that differ BETWEEN the two callers,
// since those are what a slot API is most likely to lose:
//
//   - the mode header, including "Plain chess", which only the bot game has
//   - the four-row shape: header, opponent, middle, you — in that order
//   - the middle slot holding its row when there is no dock (plain chess), so
//     your card stays pinned to the foot instead of floating up
//   - the collapse control being present only where a caller passed a handler
//
// Everything here runs against the fully client-side bot game, so it needs no
// worker backend. The online rail's own extras (rating stakes, the charged
// halo) need a live two-player match and are not covered here.
// ---------------------------------------------------------------------------

/** The desktop rail. A second dock lives in the hidden mobile drawer, so every
 *  assertion scopes to this <aside> rather than to the page. */
const rail = (page: Page) => page.locator("aside.rail-panel");

async function openBotGame(page: Page, query: string): Promise<void> {
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/game?${query}`);
  await expect(rail(page)).toBeVisible({ timeout: 30_000 });
}

test("bot rail: buff mode header, and the four rows in order", async ({ page }) => {
  await openBotGame(page, "mode=buff&difficulty=easy&color=w&t=0&inc=0&rated=0");

  await expect(rail(page).getByText("Buff mode", { exact: true })).toBeVisible();
  await expect(rail(page).getByText("Casual · vs bot")).toBeVisible();

  // Opponent above, you below — the rail's whole spatial convention. If the
  // slots were ever swapped this is the assertion that catches it.
  await expect(rail(page).getByText(/Easy Bot/i).first()).toBeVisible();
  await expect(rail(page).getByText(/^You\b/).first()).toBeVisible();

  const oppBox = await rail(page).locator(".rail-glow-wrap").first().boundingBox();
  const selfBox = await rail(page).locator(".rail-glow-wrap").last().boundingBox();
  expect(oppBox).not.toBeNull();
  expect(selfBox).not.toBeNull();
  expect(oppBox!.y).toBeLessThan(selfBox!.y);
});

test("bot rail: nerf mode shows the reveal control in the header slot", async ({ page }) => {
  await openBotGame(page, "difficulty=easy&color=w&t=0&inc=0&rated=0");

  await expect(rail(page).getByText("Nerf mode", { exact: true })).toBeVisible();
  // A nerf game offers to reveal your own rule; a buff game has no rule to
  // reveal. This rides on the player card's `action` slot, which the port
  // moved through CommandRail's `self` slot.
  await expect(
    rail(page).getByRole("button", { name: /Reveal my rule to opponent/i }),
  ).toBeVisible();
});

test("bot rail: plain chess keeps its shape with no dock", async ({ page }) => {
  await openBotGame(page, "mode=plain&difficulty=easy&color=w&t=0&inc=0&rated=0");

  // "Plain chess" exists only in the bot game. It was the single hardest thing
  // for a shared component to keep, since the online rail has no such mode.
  await expect(rail(page).getByText("Plain chess", { exact: true })).toBeVisible();

  // No cards, so no dock and no rule to reveal.
  await expect(rail(page).locator(".buff-dock")).toHaveCount(0);
  await expect(
    rail(page).getByRole("button", { name: /Reveal my rule to opponent/i }),
  ).toHaveCount(0);

  // The empty middle still holds its grid row, so your card stays at the foot
  // of the rail rather than riding up under the opponent's.
  const railBox = await rail(page).boundingBox();
  const selfBox = await rail(page).locator(".rail-glow-wrap").last().boundingBox();
  expect(railBox).not.toBeNull();
  expect(selfBox).not.toBeNull();
  const gapBelow = railBox!.y + railBox!.height - (selfBox!.y + selfBox!.height);
  expect(gapBelow).toBeLessThan(80);
});

test("bot rail: no collapse control (the bot game has no collapsed state)", async ({ page }) => {
  await openBotGame(page, "mode=buff&difficulty=easy&color=w&t=0&inc=0&rated=0");

  // The bot caller passes no onToggleCollapse, so the control must not render.
  // A shared component that rendered it anyway would ship a dead button that
  // does nothing — the classic failure of merging two variants into one.
  await expect(
    rail(page).getByRole("button", { name: /Collapse side panel/i }),
  ).toHaveCount(0);
});
