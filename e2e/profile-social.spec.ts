import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Profile / social redesign smoke (spec sections 2, 3, 6, 7, 9).
//
// Everything here runs against the real local backend: `next dev` serves the
// route handlers over a workerd context with a working D1 database, so a guest
// account auto-mints and the profile / search / friends / settings endpoints
// all answer for real. The PG archive is absent locally, so archive-backed
// sections (games history) must render their EMPTY states cleanly rather than
// hang or error — that is exactly what these tests assert.
//
// Each test mints its own guest up front (setting the session cookie in the
// browser context) so the SiteHeader's own ensureAccount() reuses it and the
// page loads signed-in as a known username.
// ---------------------------------------------------------------------------

// Mint a guest account and return its (randomly generated) username. page.request
// shares the BrowserContext cookie jar, so the cookie it sets authenticates the
// subsequent page navigations too.
async function mintGuest(page: Page): Promise<string> {
  const res = await page.request.post("/api/auth/guest");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { username: string };
  expect(body.username).toBeTruthy();
  return body.username;
}

test("public profile: header, tabs switch and drive ?tab=, clean empty states", async ({
  page,
}) => {
  const name = await mintGuest(page);
  await page.goto(`/u/${name}`);

  // Header renders: the username heading and (own profile) the avatar edit link
  // that wraps the avatar image, plus the Edit profile action.
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Edit your profile picture" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();

  // A brand-new account is never "in-game", so no live-game module or its
  // "Playing right now" shell should ever render.
  await expect(page.getByText("Playing right now")).toHaveCount(0);
  // Instead the own-profile empty state invites a first game.
  await expect(page.getByText(/have not played online yet/i)).toBeVisible();

  // Tabs default to Activity; the URL carries no ?tab= yet.
  const activityTab = page.getByRole("tab", { name: "Activity" });
  const gamesTab = page.getByRole("tab", { name: "Games" });
  await expect(activityTab).toHaveAttribute("aria-selected", "true");
  expect(new URL(page.url()).searchParams.get("tab")).toBeNull();

  // Switch to Games: URL updates to ?tab=games and the archive-empty state shows
  // cleanly (PG absent locally).
  await gamesTab.click();
  await expect(gamesTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\?tab=games$/);
  await expect(page.getByText("No games yet.")).toBeVisible();

  // Switch back to Activity: ?tab= is dropped again.
  await activityTab.click();
  await expect(activityTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(new RegExp(`/u/${name}$`));
});

test("/profile redirects a signed-in session to /u/<name>; /profile/edit renders the editors", async ({
  page,
}) => {
  const name = await mintGuest(page);

  // /profile is a thin redirect to the viewer's own /u page.
  await page.goto("/profile");
  await expect(page).toHaveURL(new RegExp(`/u/${name}(\\?|$)`), { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // /profile/edit: avatar picker, flair picker, and both privacy toggles.
  await page.goto("/profile/edit");
  await expect(page.getByRole("heading", { name: "Edit profile" })).toBeVisible({ timeout: 30_000 });
  // Avatar picker: preset avatar buttons carry "Avatar <id>" labels.
  await expect(page.getByRole("button", { name: /^Avatar / }).first()).toBeVisible();
  // Flair picker: the explicit "No flair" option plus emoji flair buttons.
  await expect(page.getByRole("button", { name: "No flair" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Flair / }).first()).toBeVisible();
  // Both privacy switches (friends-list visibility + online/last-seen).
  await expect(page.getByRole("switch")).toHaveCount(2);
});

test("header search: typing opens the dropdown, empty state shows, Escape closes", async ({
  page,
}) => {
  await mintGuest(page);
  await page.goto("/lobby");
  await expect(page.getByRole("button", { name: "Search players" })).toBeVisible({ timeout: 30_000 });

  // Open the search panel; its input is a combobox that autofocuses.
  await page.getByRole("button", { name: "Search players" }).click();
  const input = page.getByRole("combobox", { name: "Search players" });
  await expect(input).toBeVisible();

  // A query with no matches still opens the dropdown, showing the distinct
  // "no players" empty state (result rows may legitimately be empty locally).
  await input.fill("zzqxzz");
  await expect(page.getByText(/No players match/i)).toBeVisible();

  // Escape closes the dropdown.
  await input.press("Escape");
  await expect(page.getByText(/No players match/i)).toHaveCount(0);
});

test("desktop navigation: sections present, History/Achievements only in the account menu", async ({
  page,
}) => {
  await mintGuest(page);
  await page.goto("/lobby");
  const nav = page.locator("nav.site-nav");
  await expect(nav).toBeVisible({ timeout: 30_000 });

  // The five top-level sections.
  for (const label of ["Play", "Watch", "Community", "Leaderboard", "Rules"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  // History and Achievements are NOT top-level nav links.
  await expect(nav.getByRole("link", { name: "History", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Achievements", exact: true })).toHaveCount(0);

  // They live in the account menu instead (rendered as menu buttons).
  await nav.locator('button[aria-haspopup="menu"]').click();
  await expect(nav.getByRole("button", { name: "Game history" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Achievements" })).toBeVisible();
});

test("mobile navigation (375px): hamburger opens grouped Play/Watch/Community/You menu", async ({
  page,
}) => {
  await mintGuest(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/lobby");

  const openBtn = page.getByRole("button", { name: "Open menu" });
  await expect(openBtn).toBeVisible({ timeout: 30_000 });
  await openBtn.click();

  // Scope to the opened mobile panel (uniquely identified by its "New game"
  // entry) so the desktop nav's hidden-but-present links can't be matched.
  const panel = page.locator(".dropdown").filter({ hasText: "New game" });
  await expect(panel).toBeVisible();
  for (const header of ["Play", "Watch", "Community", "You"]) {
    await expect(panel.getByText(header, { exact: true })).toBeVisible();
  }
  // A representative destination from each of two groups is reachable.
  await expect(panel.getByRole("link", { name: "Practice vs computer" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Profile" })).toBeVisible();
});

test("/play is bot practice with a Play online door and no online queue; homepage links to practice", async ({
  page,
}) => {
  await mintGuest(page);

  // /play: no online matchmaking button, and a prominent link back to the lobby.
  await page.goto("/play");
  await expect(page.getByRole("link", { name: /play online/i })).toHaveAttribute(
    "href",
    "/lobby",
    { timeout: 30_000 },
  );
  await expect(page.getByRole("button", { name: /find a .* game/i })).toHaveCount(0);

  // Homepage: a visible practice-against-the-computer entry into /play.
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /practice against the computer/i }),
  ).toHaveAttribute("href", "/play", { timeout: 30_000 });
});

test("responsive: no horizontal overflow at 320px on the profile and lobby pages", async ({
  page,
}) => {
  const name = await mintGuest(page);
  await page.setViewportSize({ width: 320, height: 800 });

  const noHorizontalScroll = async () =>
    page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollWidth <= el.clientWidth + 1;
    });

  await page.goto(`/u/${name}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({ timeout: 30_000 });
  expect(await noHorizontalScroll()).toBeTruthy();

  await page.goto("/lobby");
  await expect(page.getByRole("button", { name: /find a .* game/i })).toBeVisible({
    timeout: 30_000,
  });
  expect(await noHorizontalScroll()).toBeTruthy();
});
