import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mode-selection defaults and shared state.
//
// Buff is the universal NerfChess default: /lobby and /play open with Buff
// preselected and the matchmaking button naming the exact game it will find
// ("Find a 3+2 Buff Game"). An explicit ?mode= query param overrides both the
// default and the remembered last choice, and every selector on /play drives
// the ONE shared mode. All client-side: no worker backend needed.
// ---------------------------------------------------------------------------

const findButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /find a .* game/i });

test("lobby defaults to a 3+2 Buff game", async ({ page }) => {
  await page.goto("/lobby");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff Game", { timeout: 30_000 });
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
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf Game", { timeout: 30_000 });
});

test("?mode=buff selects Buff explicitly", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("dc:last-mode", "nerf");
    } catch {}
  });
  await page.goto("/lobby?mode=buff");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff Game", { timeout: 30_000 });
});

test("switching mode updates the matchmaking button and is remembered", async ({ page }) => {
  await page.goto("/lobby");
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff Game", { timeout: 30_000 });
  await page.getByRole("button", { name: /start with a secret handicap/i }).click();
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf Game");
  // Switching the time control keeps the mode and renames the button.
  await page.getByRole("button", { name: /^5\+0 blitz$/i }).click();
  await expect(findButton(page)).toHaveText("Find a 5+0 Nerf Game");
  const saved = await page.evaluate(() => window.localStorage.getItem("dc:last-mode"));
  expect(saved).toBe("nerf");
});

test("/play shares one mode across the top selector, queue, bot setup, and friend link", async ({
  page,
}) => {
  await page.goto("/play");
  // Default state: Buff everywhere, no duplicate mode cards inside the
  // online section (exactly one Buff-mode selector card on the page).
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff Game", { timeout: 30_000 });
  const topBuff = page.getByRole("button", { name: /buff mode/i });
  await expect(topBuff).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /play a friend/i })).toHaveAttribute(
    "href",
    "/friend?mode=buff",
  );

  // Switching at the top drives the queue button, the bot pills, and the
  // friend link together: no section can disagree.
  await page.getByRole("button", { name: /nerf mode/i }).click();
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf Game");
  await expect(page.getByRole("button", { name: /^nerf$/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: /play a friend/i })).toHaveAttribute(
    "href",
    "/friend?mode=nerf",
  );

  // Plain chess is a deliberate bot-only override; the shared mode (and the
  // online queue) stays Nerf.
  await page.getByRole("button", { name: /plain chess/i }).click();
  await expect(page.getByText("Ordinary chess. No cards.")).toBeVisible();
  await expect(findButton(page)).toHaveText("Find a 3+2 Nerf Game");

  // Picking Buff at the top clears the Plain override.
  await page.getByRole("button", { name: /buff mode/i }).click();
  await expect(findButton(page)).toHaveText("Find a 3+2 Buff Game");
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

test("friend-code entry rejects a malformed code with a visible error", async ({ page }) => {
  await page.goto("/lobby?tab=friends");
  const input = page.getByLabel("Friend game code");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill("A!");
  await input.press("Enter");
  await expect(page.getByText(/doesn't look like a game code/i)).toBeVisible();
  // Still on the lobby: a bad code never navigates.
  await expect(page).toHaveURL(/\/lobby/);
});
