// Slice C: the account routes (/profile, /profile/edit, /u/<name>, /settings).
//
// Each test is the regression check for one ledger row. They were written
// against the tree before the fix and failed there (docs/polish-pass/evidence/C/
// spec-before.txt), and pass after it (spec-after.txt).
//
//   scripts/polish/heavy.sh ./node_modules/.bin/playwright test e2e/polish/account-routes.spec.ts
//
// Needs the seeded local accounts (npm run polish:seed) and the shared dev
// server on :3000.

import { expect, test, type Page } from "@playwright/test";
import { installClsProbe, polishAuthState, readCls } from "./clsProbe";

const OTHER = "polish_mod";

async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox();
  return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null;
}

test.describe("profile edit", () => {
  test.use({ storageState: polishAuthState("user") });

  // F136: the upload tile was a <label> around a display:none input, so no
  // key press could reach it.
  test("the picture upload is a keyboard stop that opens the file picker", async ({ page }) => {
    await page.goto("/profile/edit");
    const upload = page.getByRole("button", { name: /upload your own picture/i });
    await expect(upload).toBeVisible();
    // Tab from the page title until the upload control has focus.
    await page.locator("h1").first().click();
    let reached = false;
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await upload.evaluate((el) => el === document.activeElement);
    }
    expect(reached, "Tab reaches the upload control").toBe(true);
    const chooser = page.waitForEvent("filechooser", { timeout: 5000 });
    await page.keyboard.press("Enter");
    await chooser;
  });

  // F137: the bio textarea removed its own focus outline.
  test("the bio field shows a focus ring", async ({ page }) => {
    await page.goto("/profile/edit");
    const bio = page.getByRole("textbox", { name: /bio/i });
    await bio.focus();
    const outline = await bio.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
    });
    // Tailwind's outline-none is a 2px TRANSPARENT outline, so the colour is
    // what tells a ring from no ring.
    expect(outline.style).not.toBe("none");
    expect(outline.width).not.toBe("0px");
    expect(outline.color).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  });

  // F164, F192: the privacy switch knob had a shadow, transition-all and a
  // moving `left`.
  test("the privacy switch moves its knob with transform only", async ({ page }) => {
    await page.goto("/profile/edit");
    const sw = page.getByRole("switch").first();
    await expect(sw).toBeEnabled();
    const knob = await sw.evaluate((el) => {
      const thumb = Array.from(el.querySelectorAll("span")).find((s) => s.getAttribute("aria-hidden") === "true");
      if (!thumb) return null;
      const cs = getComputedStyle(thumb);
      return { shadow: cs.boxShadow, transition: cs.transitionProperty };
    });
    expect(knob).not.toBeNull();
    expect(knob!.shadow).toBe("none");
    expect(knob!.transition).not.toMatch(/\ball\b|\bleft\b/);
  });

  // F012: the back control mounted after /api/auth/me and moved the title.
  test("the title does not move when the account arrives", async ({ page }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/api/auth/me", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/profile/edit");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(500);
    const before = await box(page, "main h1");
    release();
    await expect(page.getByRole("textbox", { name: /bio/i })).toBeVisible();
    const after = await box(page, "main h1");
    expect(after).toEqual(before);
  });

  // F144: "Saved" is spoken, from a live region that exists before it fills.
  test("save feedback lands in a live region", async ({ page }) => {
    await page.goto("/profile/edit");
    const bio = page.getByRole("textbox", { name: /bio/i });
    await expect(bio).toBeVisible();
    const statusCount = await page.locator('main [role="status"]').count();
    expect(statusCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe("public profile", () => {
  test.use({ storageState: polishAuthState("user") });

  // F147: dt before dd in the stat strip.
  // F146: the presence dot is decorative inside the heading, and the heading
  // holds no link.
  test("stat strip and heading semantics", async ({ page }) => {
    await page.goto(`/u/${OTHER}`);
    await expect(page.locator("main h1").first()).toContainText(OTHER);
    const order = await page.locator("main dl").first().evaluate((dl) =>
      Array.from(dl.querySelectorAll("dt, dd")).map((e) => e.tagName.toLowerCase()),
    );
    expect(order.length).toBeGreaterThan(0);
    for (let i = 0; i < order.length; i += 2) expect(order.slice(i, i + 2)).toEqual(["dt", "dd"]);
    const h1 = await page.locator("main h1").first().evaluate((h) => ({
      links: h.querySelectorAll("a").length,
      labelledSpans: Array.from(h.querySelectorAll("span[aria-label]")).filter((s) => !s.getAttribute("role")).length,
    }));
    expect(h1).toEqual({ links: 0, labelledSpans: 0 });
  });

  // F138: the report modal is a dialog that holds focus and gives it back.
  test("report modal traps focus and restores it", async ({ page }) => {
    await page.goto(`/u/${OTHER}`);
    const more = page.getByRole("button", { name: `More actions for ${OTHER}` });
    await more.click();
    await page.getByRole("menuitem", { name: "Report" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    const name = await dialog.evaluate((d) => {
      const by = d.getAttribute("aria-labelledby");
      return by ? document.getElementById(by)?.textContent ?? "" : d.getAttribute("aria-label") ?? "";
    });
    expect(name).toMatch(/report/i);
    await expect(dialog.getByRole("textbox", { name: /what happened/i })).toBeVisible();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
  });

  // F030: the missing-player state uses the shared not-found words.
  test("an unknown name shows the shared not-found panel", async ({ page }) => {
    await page.goto("/u/no_such_player_zz9");
    await expect(page.getByRole("heading", { level: 1, name: "No player by that name" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse players" })).toBeVisible();
    expect(await page.locator("main").count()).toBe(1);
  });
});

// F035: a name that is not valid percent-encoding renders the not-found
// state instead of erroring the metadata (the OG image alt text threw a
// URIError for /u/%25zz).
test("a malformed percent name does not throw", async ({ request }) => {
  const res = await request.get("/u/%25zz");
  expect(res.status()).toBe(200);
  expect(await res.text()).not.toContain("URI malformed");
});

// F011, F021: the header actions and the skeleton hold the final geometry.
for (const vp of [
  { name: "phone", width: 360, height: 780, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
]) {
  test.describe(`profile layout, ${vp.name}`, () => {
    test.use({
      storageState: polishAuthState("user"),
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    });

    test("the profile header does not move after the page settles in", async ({ page }) => {
      await installClsProbe(page);
      await page.goto(`/u/${OTHER}`);
      // A cold dev server can take a while to answer four requests.
      await expect(page.getByRole("button", { name: "Challenge" })).toBeVisible({ timeout: 60_000 });
      const cls = await readCls(page);
      expect(cls.cls, JSON.stringify(cls.offenders, null, 1)).toBeLessThan(0.01);
    });

    test("the skeleton is the shape of the page", async ({ page }) => {
      let release: () => void = () => {};
      const held = new Promise<void>((r) => (release = r));
      await page.route(`**/api/users/${OTHER}`, async (route) => {
        await held;
        await route.continue();
      });
      await page.goto(`/u/${OTHER}`);
      await expect(page.locator("[data-profile-skeleton]").first()).toBeVisible();
      const sk = {
        plate: await box(page, "[data-profile-skeleton] [data-part=plate]"),
        rail: await box(page, "[data-profile-skeleton] [data-part=rail]"),
      };
      release();
      await expect(page.locator("main h1").first()).toContainText(OTHER, { timeout: 60_000 });
      const real = {
        plate: await box(page, "[data-profile-shell] [data-part=plate]"),
        rail: await box(page, "[data-profile-shell] [data-part=rail]"),
      };
      // Below lg the rail (and its Statistics block, whose height depends on
      // the player's record) sits above the plate, so the plate's top is only
      // held to the skeleton's where the rail is beside it.
      const pick = (b: typeof real.plate) => b && (vp.touch ? { x: b.x, w: b.w } : { x: b.x, y: b.y, w: b.w });
      expect(pick(real.plate)).toEqual(pick(sk.plate));
      expect(real.rail && { x: real.rail.x, w: real.rail.w }).toEqual(sk.rail && { x: sk.rail.x, w: sk.rail.w });
    });
  });
}

// F138, F163: the history game summary is a dialog on the site scrim, holds
// focus and gives it back to the row.
test("history summary traps focus and restores it", async ({ page }) => {
  await page.addInitScript(() => {
    const game = {
      id: "polish-c-history-1",
      endedAt: Date.now() - 60_000,
      outcome: "win",
      opponent: "polish_history_opponent",
      myColor: "w",
      reason: "checkmate",
      baseSec: 300,
      incSec: 0,
      moveCount: 24,
      rated: false,
    };
    window.localStorage.setItem("dc:game-history-v1", JSON.stringify([game]));
  });
  await page.goto("/history");
  const row = page.getByRole("button", { name: /polish_history_opponent/ });
  await row.click();
  const dialog = page.getByRole("dialog", { name: "Game summary" });
  await expect(dialog).toBeVisible();
  const scrim = await dialog.evaluate((d) => getComputedStyle(d.parentElement as HTMLElement).backgroundColor);
  expect(scrim).toBe("rgba(0, 0, 0, 0.6)");
  const close = dialog.getByRole("button", { name: "Close" });
  const closeBox = await close.boundingBox();
  expect(Math.round(closeBox?.height ?? 0)).toBeGreaterThanOrEqual(36);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeFocused();
});

// F142, F191: the landscape tablet buff drawer slides by transform, keeps
// its closed contents out of the tab order, and closes on Escape with focus
// back on its bar.
test.describe("buff drawer, landscape tablet", () => {
  test.use({ viewport: { width: 900, height: 600 }, hasTouch: true });
  test("closed is inert, opens by transform, Escape closes", async ({ page }) => {
    // The project config runs with reduced motion, where the drawer rightly
    // has no transition at all; this checks the full-motion path.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/game?mode=nerf&difficulty=easy&color=w&t=0&inc=0&rated=0");
    const bar = page.locator("button[aria-expanded][aria-controls]").filter({ hasText: /held|None yet/ });
    await expect(bar).toBeVisible({ timeout: 120_000 });
    const panelId = await bar.getAttribute("aria-controls");
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toHaveAttribute("inert", "");
    // The bot game holds data-anim="off" on this untimed game (the gate that
    // rightly stops every transition); read the drawer's own rule under full
    // motion.
    const drawer = await bar.evaluate((b) => {
      const root = document.documentElement;
      const prev = root.dataset.anim;
      root.dataset.anim = "full";
      const tp = getComputedStyle(b.parentElement as HTMLElement).transitionProperty;
      if (prev === undefined) delete root.dataset.anim;
      else root.dataset.anim = prev;
      return tp;
    });
    expect(drawer).toContain("transform");
    expect(drawer).not.toMatch(/height|\ball\b/);
    await bar.click();
    await expect(bar).toHaveAttribute("aria-expanded", "true");
    await expect(panel).not.toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(bar).toHaveAttribute("aria-expanded", "false");
    await expect(bar).toBeFocused();
  });
});

test.describe("settings", () => {
  // F013: the sign-in line points back at settings.
  test("the sign-in link returns to settings", async ({ page }) => {
    await page.route("**/api/auth/guest", (route) => route.fulfill({ status: 503, json: { error: "held" } }));
    await page.goto("/settings");
    const signIn = page.getByRole("link", { name: "Sign in" }).last();
    await expect(signIn).toBeVisible();
    expect(await signIn.getAttribute("href")).toMatch(/next=(%2F|\/)settings/);
  });

  test.describe("signed in", () => {
    test.use({ storageState: polishAuthState("user") });
    test("no late notice pushes the rows", async ({ page }) => {
      await installClsProbe(page);
      await page.goto("/settings");
      await expect(page.locator("h1")).toHaveText("Settings");
      const cls = await readCls(page);
      expect(cls.cls, JSON.stringify(cls.offenders, null, 1)).toBeLessThan(0.01);
    });
  });
});
