import { expect, test } from "@playwright/test";
import { installClsProbe, readCls } from "./polish/clsProbe";

// Regression specs for slice E1 (content routes): states that used to lie to
// the reader or dead-end. Each test names the ledger row it guards.

test.describe("content route states", () => {
  // F183: the codex copy-link control said "Copied" even when the clipboard
  // write was refused, so a reader pasted nothing and had no idea why.
  test("codex copy link reports a failed clipboard write", async ({ page }) => {
    await page.addInitScript(`
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
      document.execCommand = () => false;
    `);
    await page.goto("/codex");
    const copy = page.getByRole("button", { name: /^Copy link to / }).first();
    await expect(copy).toBeVisible({ timeout: 60_000 });
    await copy.click();
    // Read the label straight after the click: the old code flashed "Copied"
    // for 1.6s and then reverted, so a retrying not-assertion would pass late.
    await page.waitForTimeout(300);
    expect(await copy.textContent()).not.toContain("Copied");
    await expect(copy).toContainText("Copy failed");
    await expect(page.getByRole("status").filter({ hasText: "Could not copy the link" })).toHaveCount(1);
  });

  test("codex copy link confirms a successful clipboard write", async ({ page }) => {
    await page.addInitScript(`
      window.__copied = null;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
      });
    `);
    await page.goto("/codex");
    const copy = page.getByRole("button", { name: /^Copy link to / }).first();
    await expect(copy).toBeVisible({ timeout: 60_000 });
    await copy.click();
    await expect(copy).toContainText("Copied");
    const copied = await page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);
    expect(copied).toMatch(/^http:\/\/localhost:3000\/codex\/(buff|nerf|hex|boon)\//);
  });
});

test.describe("suggest form errors", () => {
  // F184: a non-JSON error response (a proxy page, a 502) surfaced as a raw
  // "SyntaxError: Unexpected token" line, and the line had no role=alert.
  test("a non-JSON error response shows a plain message in an alert", async ({ page }) => {
    await page.route("**/api/suggest", (route) =>
      route.fulfill({ status: 502, contentType: "text/html", body: "<html><body>Bad gateway</body></html>" }),
    );
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    const alert = page.getByRole("alert").filter({ hasText: "suggestion" });
    await expect(alert).toHaveText("Could not send your suggestion. Try again in a moment.");
    await expect(page.locator("main")).not.toContainText(/SyntaxError|Unexpected token|JSON/);
  });

  test("a dropped connection shows a plain message in an alert", async ({ page }) => {
    await page.route("**/api/suggest", (route) => route.abort("internetdisconnected"));
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "connection" })).toHaveText(
      "Could not reach the server. Check your connection and try again.",
    );
    await expect(page.locator("main")).not.toContainText(/Failed to fetch|TypeError/);
  });

  test("a JSON error from the route is shown as written", async ({ page }) => {
    await page.route("**/api/suggest", (route) =>
      route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Description is too short." }) }),
    );
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "too short" })).toHaveText("Description is too short.");
  });
});

// Layout stability on the content routes: rows that used to mount after
// hydration and push the board down. The ceiling sits well under the measured
// before values (docs/polish-pass/evidence/E1/baseline-before.json) and above
// the after values, so a regression of the class fails and dev-server noise
// does not.
const CLS_CEILING = 0.015;
const PUZZLE_ID = "cc-1tpxut9";

test.describe("content route layout stability (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // F015: the day strip mounted with the client-only date (0.043 before).
  test("/puzzles keeps the board still while the date and corpus arrive", async ({ page }) => {
    await installClsProbe(page);
    await page.goto("/puzzles");
    const report = await readCls(page);
    expect(report.cls, JSON.stringify(report.offenders.slice(0, 3))).toBeLessThan(CLS_CEILING);
  });

  // F015: the tag and difficulty line mounted with the corpus (0.024 before).
  test("/puzzles/[id] keeps the board still while the corpus arrives", async ({ page }) => {
    await installClsProbe(page);
    await page.goto(`/puzzles/${PUZZLE_ID}`);
    const report = await readCls(page);
    expect(report.cls, JSON.stringify(report.offenders.slice(0, 3))).toBeLessThan(CLS_CEILING);
  });
});

test.describe("achievements states", () => {
  // A /me request that fails in transit (undefined) used to be read as signed
  // out, so a signed-in player on a flaky connection was told to sign in.
  test("a failed session check offers Retry, not sign in", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.abort("internetdisconnected"));
    await page.goto("/achievements");
    await expect(page.getByText("Your progress could not load")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true }).and(page.locator("main section a"))).toHaveCount(0);
  });

  // F152: every progress bar on the wall has an accessible name.
  test("every progress bar is named", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 30_000 });
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('[role="progressbar"]')].filter(
        (el) => !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")),
      ).length,
    );
    expect(unnamed).toBe(0);
  });
});

test.describe("stats redirect", () => {
  // /stats read a failed session check (undefined) as signed out and sent the
  // player to /login.
  test("a failed session check stays put and offers Retry", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.abort("internetdisconnected"));
    await page.goto("/stats");
    await expect(page.getByRole("alert").filter({ hasText: "Could not check your account" })).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe("/stats");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});

test.describe("history", () => {
  const GAME = {
    id: "e1-replay",
    endedAt: 1_700_000_000_000,
    mode: "ai",
    opponent: "Bot",
    myColor: "w",
    outcome: "win",
    reason: "king captured",
    rated: false,
    moveCount: 4,
    baseSec: 0,
    incSec: 0,
    ratingChange: null,
    myNerf: { name: "Lucky", description: "A test rule line.", tier: 1 },
    opponentNerf: null,
    moves: ["e2e4", "e7e5", "g1f3", "b8c6"],
  };
  const OLD = { ...GAME, id: "e1-old", moves: undefined };

  async function seed(page: import("@playwright/test").Page) {
    await page.addInitScript(
      `localStorage.setItem("dc:game-history-v1", ${JSON.stringify(JSON.stringify([GAME, OLD]))});`,
    );
  }

  // F040: a missing entry was a hand-rolled page; it is the shared 404 panel.
  test("a replay id not saved on this device uses the shared not-found panel", async ({ page }) => {
    await page.goto("/history/not-a-saved-game");
    await expect(page.getByRole("heading", { level: 1, name: "No saved game with that id" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Back to history" })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("a saved game without moves explains why and links back", async ({ page }) => {
    await seed(page);
    await page.goto("/history/e1-old");
    await expect(page.getByRole("heading", { level: 1, name: "No moves recorded" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Replay unavailable")).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);
  });

  // F132: the replay had no h1.
  test("the replay has exactly one h1", async ({ page }) => {
    await seed(page);
    await page.goto("/history/e1-replay");
    await expect(page.getByRole("button", { name: /Copy PGN/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Replay: You won against Bot");
  });

  // F024 and F177: counts are real once shown, CTAs are sentence case.
  test("the empty list offers sentence-case actions", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("link", { name: "Play a friend" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Play the bot" })).toBeVisible();
    await expect(page.getByText("Loading…")).toHaveCount(0);
  });
});

test.describe("puzzle by id", () => {
  // F040: an unknown puzzle id used EmptyState with copy that differed from
  // NOT_FOUND_COPY.puzzle; it is the shared not-found panel now.
  test("an unknown puzzle id uses the shared not-found panel", async ({ page }) => {
    await page.goto("/puzzles/not-a-real-puzzle");
    await expect(page.getByRole("heading", { level: 1, name: "No puzzle with that id" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: "Today's puzzles" })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
  });
});

test.describe("analysis deep links", () => {
  // F017: ?fen= and ?moves= were applied in a post-mount microtask, so the
  // first render (the server HTML, and the first client paint) was the start
  // position. The deep link is now the initial state.
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

  function renderedHtml(html: string): string {
    // Drop scripts (the RSC payload carries the URL, and with it the FEN).
    return html.replace(/<script[\s\S]*?<\/script>/g, "");
  }

  test("?fen= is the first rendered position", async ({ request }) => {
    const res = await request.get(`/analysis?fen=${encodeURIComponent(FEN)}`);
    const html = renderedHtml(await res.text());
    expect({ deepLink: html.includes(FEN), start: html.includes(START) }).toEqual({ deepLink: true, start: false });
  });

  test("?moves= is the first rendered line", async ({ request }) => {
    const res = await request.get("/analysis?moves=e2e4,e7e5");
    const html = renderedHtml(await res.text());
    const afterLine = /rnbqkbnr\/pppp1ppp\/8\/4p3\/4P3\/8\/PPPP1PPP\/RNBQKBNR w KQkq/.test(html);
    expect({ afterLine, start: html.includes(START) }).toEqual({ afterLine: true, start: false });
  });
});

test.describe("tutorial", () => {
  // F245: the HowTo JSON-LD step URLs pointed at #modes, #rules, #cards and
  // #win, none of which existed on the page.
  test("every HowTo step fragment resolves to an element on the page", async ({ request }) => {
    const html = await (await request.get("/tutorial")).text();
    const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const fragments: string[] = [];
    for (const raw of blocks) {
      const data = JSON.parse(raw) as { "@type"?: string; step?: { url?: string }[] };
      if (data["@type"] !== "HowTo") continue;
      for (const step of data.step ?? []) {
        const hash = step.url?.split("#")[1];
        if (hash) fragments.push(hash);
      }
    }
    expect(fragments.length).toBeGreaterThan(0);
    const missing = fragments.filter((f) => !new RegExp(`\\sid="${f}"`).test(html));
    expect(missing).toEqual([]);
  });

  // F172: the tutorial said five house rules; the guide (the source of truth)
  // lists six.
  test("the tutorial and the guide agree on the number of house rules", async ({ request }) => {
    const tutorial = await (await request.get("/tutorial")).text();
    const guide = await (await request.get("/guide/how-to-play")).text();
    const guideRules = (guide.match(/<strong>\d+\. /g) ?? []).length;
    expect(guideRules).toBe(6);
    expect({ six: tutorial.includes("Six house rules"), five: /[Ff]ive house rules are/.test(tutorial) }).toEqual({
      six: true,
      five: false,
    });
  });
});

test.describe("codex tabs", () => {
  // F145: role=tab buttons with no roving tabindex, no arrow keys and no
  // tabpanel for aria-controls to point at.
  test("tabs follow the WAI-ARIA pattern", async ({ page }) => {
    await page.goto("/codex");
    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 60_000 });
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);
    // One tab stop.
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    // aria-controls points at a real tabpanel.
    const controls = await tabs.first().getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(page.locator(`#${controls}[role="tabpanel"]`)).toHaveCount(1);
    // Arrow keys move selection and focus.
    const selected = page.locator('[role="tab"][aria-selected="true"]');
    const before = await selected.textContent();
    await selected.focus();
    await page.keyboard.press("ArrowRight");
    await expect(selected).not.toHaveText(before ?? "");
    const focusedIsSelected = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-selected") === "true",
    );
    expect(focusedIsSelected).toBe(true);
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  });
});

// Every E1 content route at a 360px phone: no horizontal page scroll and
// exactly one h1 (brief 5.5 and 5.6). /codex/build is left out: it only
// redirects to /codex/suggest, which is in the list.
const CONTENT_ROUTES = [
  "/codex",
  "/codex/buff/pawn_push",
  "/codex/nerf/lucky",
  "/codex/hex/heavy_boots",
  "/codex/boon/extra_glance",
  "/codex/suggest",
  "/guide",
  "/guide/how-to-play",
  "/guide/nerf-mode",
  "/guide/buff-mode",
  "/guide/chess-with-power-ups",
  "/guide/capture-the-king",
  "/guide/chess-roguelike",
  "/guide/chess-variants",
  "/guide/glossary",
  "/tutorial",
  "/tutorial/walkthrough",
  "/puzzles",
  `/puzzles/${PUZZLE_ID}`,
  "/analysis",
  "/history",
  "/updates",
  "/about",
  "/faq",
  "/contact",
  "/guidelines",
  "/terms-of-service",
  "/achievements",
];

test.describe("content routes at 360px", () => {
  test.use({ viewport: { width: 360, height: 780 } });
  for (const route of CONTENT_ROUTES) {
    test(`${route} has no horizontal scroll and one h1`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      const shape = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        const wide = [...document.querySelectorAll("body *")]
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(n).position !== "fixed";
          })
          .slice(0, 3)
          .map((n) => `${n.tagName.toLowerCase()}.${String((n as HTMLElement).className).split(" ").slice(0, 3).join(".")}`);
        return { scrollWidth: el.scrollWidth, h1: document.querySelectorAll("h1").length, wide };
      });
      expect(shape.scrollWidth, JSON.stringify(shape.wide)).toBeLessThanOrEqual(360);
      expect(shape.h1).toBe(1);
    });
  }
});

test.describe("suggest form focus", () => {
  // F137: `focus:outline-none` on the three suggest fields beat the global
  // :focus-visible ring, so a keyboard reader only saw a faint border change.
  test("every field shows the focus ring when reached by keyboard", async ({ page }) => {
    await page.goto("/codex/suggest");
    const name = page.locator("#rule-name");
    await expect(name).toBeVisible({ timeout: 60_000 });
    for (const id of ["rule-name", "rule-desc", "rule-contact"]) {
      await page.locator(`#${id}`).focus();
      const ring = await page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        // Tailwind's outline-none is a 2px transparent outline, so the colour
        // is what tells a visible ring from a hidden one.
        const m = s.outlineColor.match(/rgba?\(([^)]+)\)/);
        const alpha = m ? Number(m[1].split(",")[3] ?? 1) : 1;
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, alpha };
      });
      expect(ring.style, id).not.toBe("none");
      expect(ring.alpha, `${id} ${ring.color}`).toBeGreaterThan(0.5);
      expect(ring.width, id).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("disclosure focus", () => {
  // F137 sibling check: the glossary and card detail disclosures carry
  // outline-none, which the global :focus-visible ring outranks today (same
  // specificity, later in the cascade). This holds that order in place.
  for (const route of ["/guide/glossary", "/codex/buff/pawn_push"]) {
    test(`${route} disclosure summary shows the focus ring`, async ({ page }) => {
      await page.goto(route);
      const summary = page.locator("details > summary").first();
      await expect(summary).toBeVisible({ timeout: 60_000 });
      await page.keyboard.press("Tab");
      await summary.focus();
      const ring = await summary.evaluate((el) => {
        const s = getComputedStyle(el);
        const m = s.outlineColor.match(/rgba?\(([^)]+)\)/);
        return { style: s.outlineStyle, alpha: m ? Number(m[1].split(",")[3] ?? 1) : 1, color: s.outlineColor };
      });
      expect(ring.style).not.toBe("none");
      expect(ring.alpha, ring.color).toBeGreaterThan(0.5);
    });
  }
});
