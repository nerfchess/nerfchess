// ---------------------------------------------------------------------------
// Brief section 4: the post-sign-in bump must never come back.
//
// Signs in through the real /login form (so the browser carries exactly the
// cookies a player has: the httpOnly session and the nc_who display hint),
// then reloads each section 4 route under Fast 3G + 4x CPU and asserts:
//
//   1. the site header never changes shape after the first frame: its height,
//      and the left edge and width of the right-hand cluster (search,
//      challenges, bell, settings, account chip). The Layout Instability API
//      barely scores the chip swap (0.0014), so this box watch is the real
//      guard for F001, not CLS alone;
//   2. CLS (web-vitals session window) stays under 0.01, or under the known
//      page-content debt for that route recorded in PAGE_DEBT below.
//
//   npx playwright test e2e/polish/signin-bump.spec.ts
//   (through scripts/polish/heavy.sh on the shared box)
//
// Before the fix the header chip grew from 175 to 310px and moved 135px left
// 4 to 6s after hydration on every one of these routes
// (docs/polish-pass/evidence/section4-before/).
// ---------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";
import { installClsProbe, readCls, throttle } from "./clsProbe";
import { seedAll } from "../../scripts/polish/seed";
import { GAME, SECTION4 } from "../../scripts/polish/lib/routes";

const USERNAME = "polish_user";
const PASSWORD = process.env.POLISH_SEED_PASSWORD || "polish-local-only-7";

// Layout shift that is page content, not the session, measured throttled and
// signed in on 2026-09-23 (docs/polish-pass/evidence/A/). Each entry belongs
// to a route slice; it may only go down, and the entry is deleted when that
// slice's fix lands, which puts the route under the 0.01 target.
const PAGE_DEBT: Record<string, number> = {
  // Slice B, F006: the tour note shrinks and moves the practice doors.
  "/play|390x844": 0.06,
  "/play|1280x800": 0.02,
  // Slice B, F005: live counter and "Games to watch" resize.
  "/lobby|1280x800": 0.02,
  // Slice C, F021/F027: profile skeleton header and activity panel swap.
  "/profile|390x844": 0.085,
  "/profile|1280x800": 0.035,
  // Slice B, F004: home right column inserts rows after mount.
  "/|390x844": 0.015,
  // Slices B and J: when the opening draft resolves on a slow load, the rail
  // content drops about 110px (measured 0.0134 once, 0 when the watch ends
  // before the lock-in timer).
  [`${GAME}|1280x800`]: 0.02,
  [`${GAME}|390x844`]: 0.02,
};
const TARGET = 0.01;

// Every change to the header's shape, one entry per distinct shape, from the
// moment the server HTML is fully parsed (on Fast 3G the parser can paint a
// header whose right half has not arrived yet; that is the network, not a
// state change). The old bump landed seconds after that, once /me answered.
// Plain JS string: it runs in the page before any bundle.
const HEADER_WATCH = `(() => {
  const log = [];
  window.__headerShapes = log;
  let last = null;
  const tick = () => {
    // The first header actually on screen: a streamed Suspense segment sits
    // in a hidden container (0x0) until React reveals it, and that is
    // construction, not a visible header changing shape.
    let nav = null;
    if (document.readyState !== "loading") {
      for (const el of document.querySelectorAll("nav.site-nav")) {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) { nav = el; break; }
      }
    }
    if (nav) {
      const r = nav.getBoundingClientRect();
      const right = nav.querySelector("[data-header-right]");
      const rr = right ? right.getBoundingClientRect() : null;
      const shape = {
        h: Math.round(r.height),
        left: rr ? Math.round(rr.left) : null,
        w: rr ? Math.round(rr.width) : null,
      };
      const key = JSON.stringify(shape);
      if (key !== last) {
        log.push({ t: Math.round(performance.now()), ...shape });
        last = key;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

type Shape = { t: number; h: number; left: number | null; w: number | null };

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(USERNAME);
  await page.getByLabel("Password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 60_000 }),
    page.getByRole("button", { name: "Sign in", exact: true }).last().click(),
  ]);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === "dc_session"), "session cookie after sign-in").toBe(true);
  expect(
    cookies.find((c) => c.name === "nc_who")?.value ?? "",
    "display cookie after sign-in",
  ).toContain(USERNAME);
}

for (const vp of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  const vpLabel = `${vp.width}x${vp.height}`;
  test.describe(`section 4 sign-in bump at ${vpLabel}`, () => {
    test.use({ viewport: vp });

    test.beforeAll(async () => {
      await seedAll(() => {});
    });

    for (const route of SECTION4) {
      const label = route === GAME ? "bot game" : route;
      test(`${label}: header keeps its first-paint shape and CLS stays low`, async ({ page }) => {
        test.setTimeout(240_000);
        await signIn(page);
        await page.addInitScript(HEADER_WATCH);
        await installClsProbe(page);
        await throttle(page, "throttled");
        // The bump used to land 50 to 80ms after /api/auth/me answered, so
        // the watch runs until that answer is in and the page has settled.
        const me = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/me", { timeout: 180_000 });
        await page.goto(route, { waitUntil: "load", timeout: 180_000 });
        await me;
        const cls = await readCls(page, { quietMs: 2500 });
        const shapes = (await page.evaluate("window.__headerShapes || []")) as Shape[];

        // The bot game opens on the draft overlay, which replaces the page
        // (header included) until a card is picked, so there may be no header
        // to watch there. Everywhere else the header must be present.
        if (route !== GAME) expect(shapes.length, "the site header rendered").toBeGreaterThan(0);
        // A header that only ever had one shape did not bump.
        expect(shapes.length, `header changed shape after the first frame at ${vpLabel}: ${JSON.stringify(shapes)}`).toBeLessThanOrEqual(1);

        const debt = PAGE_DEBT[`${route}|${vpLabel}`];
        const ceiling = debt ?? TARGET;
        expect(cls.cls, JSON.stringify(cls.offenders?.slice(0, 3) ?? [], null, 1)).toBeLessThan(ceiling);
      });
    }
  });
}
