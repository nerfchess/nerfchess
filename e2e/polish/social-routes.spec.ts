// Slice D: the social routes (/tv, /tournaments, /clubs, /inbox, /community,
// /leaderboard, /friend).
//
// Each test is the regression check for one ledger row. They were run against
// the tree before the fix and failed there (docs/polish-pass/evidence/D/
// spec-before.txt), and pass after it (spec-after.txt).
//
//   scripts/polish/heavy.sh ./node_modules/.bin/playwright test e2e/polish/social-routes.spec.ts
//
// Needs the seeded local accounts (npm run polish:seed) and the shared dev
// server on :3000. The local dev server has no Durable Object, so the TV tests
// stub the lobby and the archive with page.route.

import { expect, test, type Page } from "@playwright/test";
import { polishAuthState } from "./clsProbe";

function lobbyGame(i: number) {
  return {
    id: `tvtest${i}`,
    mode: i % 2 ? "nerf" : "buff",
    players: {
      w: { name: `white_${i}`, rating: 1500 + i, avatar: null, provisional: false },
      b: { name: `black_${i}`, rating: 1400 + i, avatar: null, provisional: i === 1 },
    },
    timeSec: 180,
    incrementSec: 2,
    rated: true,
    moves: 12,
    watchers: 3 - (i % 3),
  };
}

const ARCHIVED = {
  id: "tvarchive1",
  moves: "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6",
  white_name: "archive_white",
  black_name: "archive_black",
  white_rating_before: 1510,
  black_rating_before: 1490,
  white_avatar: null,
  black_avatar: null,
  category: "nerf",
};

async function stubTv(page: Page, games: number) {
  await page.route("**/api/lobby?**", (route) =>
    route.fulfill({
      json: {
        players: [],
        anonymous: 0,
        games: Array.from({ length: games }, (_, i) => lobbyGame(i)),
        challenges: [],
        seeks: [],
      },
    }),
  );
  await page.route("**/api/games/recent?**", (route) =>
    route.fulfill({ json: { game: ARCHIVED, games: [ARCHIVED] } }),
  );
}

test.describe("/tv", () => {
  // F019: the whole view sat in <Suspense fallback={null}>, so the server HTML
  // had no header and no page at all.
  test("the server HTML carries the header and the page heading", async ({ request }) => {
    const res = await request.get("/tv?mode=nerf");
    const html = await res.text();
    expect(html).toContain("<h1");
    expect(html).toMatch(/Nerf TV/);
    expect(html).toMatch(/<nav|<header/);
  });

  // F130: the only h1 was dropped as soon as a game was on the board.
  test("keeps exactly one h1 once a game is on the board", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    await expect(page.getByText("archive_white").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/TV/);
  });

  // F133: player profile links sat inside the row's <button>.
  test("live rows do not nest links inside the row button", async ({ page }) => {
    await stubTv(page, 3);
    await page.goto("/tv");
    await expect(page.getByText("white_0").first()).toBeVisible({ timeout: 60_000 });
    const nested = await page.locator("button a, a button, button button, a a").count();
    expect(nested).toBe(0);
    // The row is still one control that picks the game, and the names still
    // open profiles.
    await expect(page.getByRole("button", { name: /white_1 vs black_1/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /black_1/ }).first()).toHaveAttribute("href", "/u/black_1");
  });

  // F159: prev, next and fullscreen were 36px on touch.
  test("board controls are 44px on a coarse pointer", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await stubTv(page, 3);
    await page.goto("/tv");
    await expect(page.getByRole("button", { name: "Watch fullscreen" })).toBeVisible({ timeout: 60_000 });
    for (const name of ["Previous live game", "Next live game", "Watch fullscreen"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      expect(b, name).not.toBeNull();
      expect(Math.round(b!.height), name).toBeGreaterThanOrEqual(44);
      expect(Math.round(b!.width), name).toBeGreaterThanOrEqual(44);
    }
    await ctx.close();
  });

  // F139: the fullscreen overlay was not a dialog and left focus behind it.
  test("fullscreen is a modal dialog that takes and returns focus", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    const open = page.getByRole("button", { name: "Watch fullscreen" });
    await expect(open).toBeVisible({ timeout: 60_000 });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    // Focus is inside, and Tab stays inside.
    for (let i = 0; i < 12; i++) {
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Tab");
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  });

  // F162: Final and Replay were uppercase tracked chips.
  test("status chips are sentence case", async ({ page }) => {
    await stubTv(page, 0);
    await page.goto("/tv");
    const chip = page.getByText("Replay", { exact: true }).first();
    await expect(chip).toBeVisible({ timeout: 60_000 });
    const style = await chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return { transform: s.textTransform, spacing: s.letterSpacing };
    });
    expect(style.transform).toBe("none");
    expect(["normal", "0px"]).toContain(style.spacing);
  });
});

// ---------------------------------------------------------------------------
// /tournaments/[id]. The detail API is stubbed so each state is exact.

function tournamentDetail(over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    tournament: {
      id: "ttest",
      name: "Polish test cup",
      description: "",
      creator_user_id: "host1",
      creator_name: "polish_mod",
      club_id: "c1",
      club_name: "Polish club",
      club_slug: "polish-club",
      format: "arena",
      mode: "nerf",
      rated: 1,
      clock_time_sec: 180,
      clock_increment_sec: 2,
      duration_min: 60,
      starts_at: now - 5 * 60_000,
      max_players: 16,
      created_at: now - 86_400_000,
      status: "ongoing",
      rounds_total: 5,
      current_round: 1,
      players: 2,
      phase: "ongoing",
      ...over,
    },
    standings: [],
    entered: false,
    rounds: [
      { round: 1, board: 1, game_id: "g1", white_user_id: "u1", white_username: "polish_mod", black_user_id: "u2", black_username: "polish_admin", result: "draw" },
      { round: 1, board: 2, game_id: null, white_user_id: "u3", white_username: "polish_user", black_user_id: null, black_username: null, result: "bye" },
    ],
    myGame: null,
    ...extra,
  };
}

async function stubTournament(page: Page, body: unknown, status = 200, delayMs = 0) {
  await page.route("**/api/tournaments/ttest", async (route) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status, json: body });
  });
}

test.describe("/tournaments/[id]", () => {
  // F134: the countdown was aria-live and changed every second.
  test("the countdown is not a live region; only the phase is announced", async ({ page }) => {
    await stubTournament(page, tournamentDetail());
    await page.goto("/tournaments/ttest");
    await expect(page.getByRole("heading", { level: 1, name: "Polish test cup" })).toBeVisible({ timeout: 60_000 });
    const live = page.locator('[aria-live]:has-text("left")');
    await expect(live).toHaveCount(0);
    const status = page.getByRole("status").filter({ hasText: /in progress/i });
    await expect(status).toHaveCount(1);
    const before = await status.innerText();
    await page.waitForTimeout(2200);
    expect(await status.innerText()).toBe(before);
  });

  // F031: a 404 showed a bare line; other failures had no h1 and no Retry.
  test("a missing event shows the shared 404 copy", async ({ page }) => {
    await stubTournament(page, { error: "Not found" }, 404);
    await page.goto("/tournaments/ttest");
    await expect(page.getByRole("heading", { level: 1, name: "No tournament with that id" })).toBeVisible({ timeout: 60_000 });
  });

  test("a failed load has an h1 and a Retry that loads the event", async ({ page }) => {
    let fail = true;
    await page.route("**/api/tournaments/ttest", (route) =>
      fail ? route.fulfill({ status: 500, json: { error: "boom" } }) : route.fulfill({ json: tournamentDetail() }),
    );
    await page.goto("/tournaments/ttest");
    await expect(page.getByRole("heading", { level: 1, name: /could not load/i })).toBeVisible({ timeout: 60_000 });
    fail = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Polish test cup" })).toBeVisible();
  });

  // F022: the in-flight branch was a "Loading..." line, not the skeleton.
  test("the in-flight state is the route skeleton", async ({ page }) => {
    await stubTournament(page, tournamentDetail(), 200, 4000);
    await page.goto("/tournaments/ttest");
    await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Loading...")).toHaveCount(0);
  });

  // F167, F168, F171: format-keyed footnote, club chip, linked pairings, one
  // draw notation.
  test("arena footnote, club chip and pairing links", async ({ page }) => {
    await stubTournament(page, tournamentDetail());
    await page.goto("/tournaments/ttest");
    await expect(page.getByRole("heading", { level: 1, name: "Polish test cup" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Swiss pairing/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Polish club" })).toHaveAttribute("href", "/clubs/polish-club");
    const pairings = page.locator("ul").filter({ hasText: "has a bye" });
    await expect(pairings.getByRole("link", { name: "polish_admin" })).toHaveAttribute("href", "/u/polish_admin");
    await expect(pairings.getByRole("link", { name: "polish_user" })).toBeVisible();
    await expect(page.getByText("½-½")).toBeVisible();
    await expect(page.getByText("1/2-1/2")).toHaveCount(0);
  });
});

test.describe("/tournaments/[id] signed in", () => {
  test.use({ storageState: polishAuthState("user") });

  // F014: the join column waited for the page's own /me call.
  test("the join control does not wait for /api/auth/me", async ({ page }) => {
    await stubTournament(page, tournamentDetail({ starts_at: Date.now() + 3_600_000, status: "upcoming", phase: "upcoming" }));
    // A real visitor carries the nc_who display cookie (slice A); a seeded
    // storageState may predate it, and one /me call stamps it.
    await page.request.get("/api/auth/me");
    expect((await page.context().cookies()).some((c) => c.name === "nc_who")).toBe(true);
    await page.route("**/api/auth/me", async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.continue();
    });
    await page.goto("/tournaments/ttest");
    await expect(page.getByRole("heading", { level: 1, name: "Polish test cup" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /^Join$/ })).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// /clubs/[slug]. The club API is stubbed so each state is exact.

function clubDetail(myRole: string | null) {
  const now = Date.now();
  return {
    club: {
      id: "c1",
      slug: "testclub",
      name: "Test club",
      description: "",
      icon: "",
      owner_user_id: "o1",
      owner_name: "polish_mod",
      created_at: now - 86_400_000,
    },
    members: [{ user_id: "o1", username: "polish_mod", avatar: null, rating: 1500, games: 3, role: "owner", joined_at: now }],
    memberCount: 1,
    posts: [{ id: "p1", user_id: "o1", username: "polish_mod", avatar: null, text: "Hello club", created_at: now - 60_000 }],
    tournaments: [
      { id: "tt1", name: "Club cup", status: "ongoing", starts_at: now - 60_000, duration_min: 60, players: 2, max_players: 8 },
    ],
    myRole,
  };
}

async function stubClub(page: Page, body: unknown, status = 200, delayMs = 0) {
  await page.route("**/api/clubs/testclub", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status, json: body });
  });
}

test.describe("/clubs/[slug] signed out", () => {
  test("a missing club shows the shared 404 copy", async ({ page }) => {
    await stubClub(page, { error: "Club not found." }, 404);
    await page.goto("/clubs/testclub");
    await expect(page.getByRole("heading", { level: 1, name: "No club at that address" })).toBeVisible({ timeout: 60_000 });
  });

  test("a failed load has an h1 and a Retry", async ({ page }) => {
    let fail = true;
    await page.route("**/api/clubs/testclub", (route) =>
      fail ? route.fulfill({ status: 500, json: { error: "boom" } }) : route.fulfill({ json: clubDetail(null) }),
    );
    await page.goto("/clubs/testclub");
    await expect(page.getByRole("heading", { level: 1, name: /could not load/i })).toBeVisible({ timeout: 60_000 });
    fail = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Test club" })).toBeVisible();
  });

  test("the in-flight state is the route skeleton", async ({ page }) => {
    await stubClub(page, clubDetail(null), 200, 4000);
    await page.goto("/clubs/testclub");
    await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
  });

  // F036: a signed-out visitor had no way to join.
  test("a signed-out visitor gets a sign-in link back to the club", async ({ page }) => {
    await stubClub(page, clubDetail(null));
    await page.goto("/clubs/testclub");
    await expect(page.getByRole("heading", { level: 1, name: "Test club" })).toBeVisible({ timeout: 60_000 });
    const join = page.getByRole("link", { name: /sign in to join/i });
    await expect(join).toBeVisible();
    expect(decodeURIComponent((await join.getAttribute("href")) ?? "")).toContain("next=/clubs/testclub");
  });

  // F170: event rows were plain text with a raw lowercase phase.
  test("club events are links with sentence-case phases", async ({ page }) => {
    await stubClub(page, clubDetail(null));
    await page.goto("/clubs/testclub");
    const row = page.getByRole("link", { name: /Club cup/ });
    await expect(row).toHaveAttribute("href", "/tournaments/tt1", { timeout: 60_000 });
    await expect(row).toContainText("In progress");
  });
});

test.describe("/clubs/[slug] member", () => {
  test.use({ storageState: polishAuthState("user") });

  // F179: two quick submits posted twice.
  test("a double submit posts once", async ({ page }) => {
    await stubClub(page, clubDetail("member"));
    let posts = 0;
    await page.route("**/api/clubs/testclub/posts", async (route) => {
      posts++;
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        json: { post: { id: `n${posts}`, user_id: "me", username: "polish_user", avatar: null, text: "hi", created_at: Date.now() } },
      });
    });
    await page.goto("/clubs/testclub");
    const box = page.locator("form textarea");
    await expect(box).toBeVisible({ timeout: 60_000 });
    await box.fill("hi");
    await box.evaluate((el) => {
      const form = (el as HTMLTextAreaElement).form!;
      form.requestSubmit();
      form.requestSubmit();
    });
    await page.waitForTimeout(2500);
    expect(posts).toBe(1);
  });

  // F155: the board field was below 16px on a phone.
  test("the board field is 16px on a phone", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: polishAuthState("user") });
    const page = await ctx.newPage();
    await stubClub(page, clubDetail("member"));
    await page.goto("/clubs/testclub");
    const box = page.locator("form textarea");
    await expect(box).toBeVisible({ timeout: 60_000 });
    expect(await box.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
    await ctx.close();
  });
});

test.describe("/clubs/[slug] owner on touch", () => {
  test.use({ storageState: polishAuthState("user"), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // F180: delete was hover-only, 13px, unconfirmed and silent on failure.
  test("delete is visible on touch, 44px, asks first and reports a failure", async ({ page }) => {
    await stubClub(page, clubDetail("owner"));
    await page.route("**/api/clubs/testclub/posts?**", (route) =>
      route.fulfill({ status: 500, json: { error: "Could not delete the post." } }),
    );
    await page.goto("/clubs/testclub");
    const del = page.getByRole("button", { name: "Delete post" });
    await expect(del).toBeVisible({ timeout: 60_000 });
    expect(await del.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const b = await del.boundingBox();
    expect(Math.round(b!.height)).toBeGreaterThanOrEqual(44);
    await del.click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not delete the post." })).toBeVisible();
    await expect(page.getByText("Hello club")).toBeVisible();
  });
});
