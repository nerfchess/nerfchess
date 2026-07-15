import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mode-selection defaults and shared state.
//
// Buff is the universal NerfChess default: /lobby and /play open with Buff
// preselected and the matchmaking button naming the exact game it will find
// ("Find a 3+2 Buff game"). An explicit ?mode= query param overrides both the
// default and the remembered last choice, and every selector on /play drives
// the ONE shared mode. All client-side: no worker backend needed.
// ---------------------------------------------------------------------------

const findButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /find a .* game/i });

test("lobby defaults to a 3+2 Buff game", async ({ page }) => {
  await page.goto("/lobby");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff game", { timeout: 30_000 });
  // The Buff mode card is selected (and marked recommended); Nerf is not.
  const buffCard = page.getByRole("button", { name: /buff.*recommended.*start with normal chess/is });
  await expect(buffCard).toHaveAttribute("aria-pressed", "true");
  const nerfCard = page.getByRole("button", { name: /start with a secret handicap/i });
  await expect(nerfCard).toHaveAttribute("aria-pressed", "false");
  // 3+2 is the selected time control.
  await expect(page.getByRole("button", { name: /^3\+2 blitz$/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("?mode=nerf overrides the default and stored preference", async ({ page }) => {
  // A stored Buff preference must lose to the explicit URL.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("dc:last-mode", "buff");
    } catch {}
  });
  await page.goto("/lobby?mode=nerf");
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf game", { timeout: 30_000 });
});

test("?mode=buff selects Buff explicitly", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("dc:last-mode", "nerf");
    } catch {}
  });
  await page.goto("/lobby?mode=buff");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff game", { timeout: 30_000 });
});

test("switching mode updates the matchmaking button and is remembered", async ({ page }) => {
  await page.goto("/lobby");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff game", { timeout: 30_000 });
  await page.getByRole("button", { name: /start with a secret handicap/i }).click();
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf game");
  // Switching the time control keeps the mode and renames the button.
  await page.getByRole("button", { name: /^5\+0 blitz$/i }).click();
  await expect(findButton(page)).toHaveText("Find a 5+0 Nerf game");
  const saved = await page.evaluate(() => window.localStorage.getItem("dc:last-mode"));
  expect(saved).toBe("nerf");
});

test("/play is bot practice only: one shared mode, no online queue", async ({ page }) => {
  await page.goto("/play");
  // Bot practice only: Buff is preselected on the top mode cards, and there is
  // NO online matchmaking button anywhere on this page.
  const topBuff = page.getByRole("button", { name: /buff mode/i });
  await expect(topBuff).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
  await expect(findButton(page)).toHaveCount(0);
  // A prominent door back to online play points at the lobby, so nobody who
  // wanted a real opponent gets stuck here.
  await expect(page.getByRole("link", { name: /play online/i })).toHaveAttribute("href", "/lobby");

  // Switching the top mode drives the bot game-type pills: the two selectors
  // share one mode and can't disagree.
  await page.getByRole("button", { name: /nerf mode/i }).click();
  await expect(page.getByRole("button", { name: /^nerf$/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("A secret nerf, revealed when the game ends.")).toBeVisible();

  // Plain chess is a deliberate bot-only override.
  await page.getByRole("button", { name: /plain chess/i }).click();
  await expect(page.getByText("Ordinary chess. No cards.")).toBeVisible();

  // Picking Buff at the top clears the Plain override and restores Buff.
  await page.getByRole("button", { name: /buff mode/i }).click();
  await expect(topBuff).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Draft buffs to outbuild the bot.")).toBeVisible();
});

test("lobby tabs: Quick Play default, Watch and Friends switch panels", async ({ page }) => {
  await page.goto("/lobby");
  const quickTab = page.getByRole("tab", { name: /quick play/i });
  await expect(quickTab).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await expect(findButton(page)).toBeVisible();

  await page.getByRole("tab", { name: /watch/i }).click();
  await expect(page.getByText("Live games")).toBeVisible();
  await expect(findButton(page)).toBeHidden();

  await page.getByRole("tab", { name: /friends/i }).click();
  await expect(page.getByLabel("Friend game code")).toBeVisible();

  await page.getByRole("tab", { name: /challenges/i }).click();
  await expect(page.getByText("Open challenges")).toBeVisible();

  // Deep link straight into a tab.
  await page.goto("/lobby?tab=watch");
  await expect(page.getByRole("tab", { name: /watch/i })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 30_000 },
  );
});

test("friend-code entry rejects an unjoinable code and stays on the lobby", async ({ page }) => {
  await page.goto("/lobby?tab=friends");
  const input = page.getByLabel("Friend game code");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill("A!");
  await input.press("Enter");
  // A code that matches no live challenge is refused (the challenge lookup
  // fails, and with no reachable game server the join can't complete) — the
  // viewer never drops into a game and the friend-code entry stays available
  // to try again. This smoke env has no game-server backend, so the exact
  // refusal text varies; the durable guarantee is that a bad code never
  // navigates away from the lobby.
  await expect(page).toHaveURL(/\/lobby/);
  await expect(input).toBeVisible();
});
