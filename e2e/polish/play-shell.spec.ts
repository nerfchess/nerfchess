// F019 and F006 on /play, F019 on /lobby.
//
// F019: the pages wrapped everything in a Suspense boundary whose fallback was
// an empty <main>, so the HTML a visitor sees before the JavaScript runs had
// no header and no content. With JavaScript off, the visible page is exactly
// that pre-hydration paint (in a production build the boundary is the
// prerendered fallback; in dev the streamed content never gets swapped in),
// so these checks run with JavaScript disabled.
//
// F006: the "New here? Take the tour" note appeared a frame after hydration
// and pushed the Play online door and the setup card down 58px. The door's
// position is now sampled every frame from the first paint; it must never
// move, for a first-time visitor (note shown) or a returning one (no note).

import { expect, test, type Page } from "@playwright/test";

// The header band at the top of the paint: the real SiteHeader (a production
// hard load, where the Suspense fallback prerenders under it) or the route's
// header skeleton (next dev, where loading.tsx is what paints before the
// streamed page is swapped in). Either way a full-height bar at the top.
async function paintsHeaderBand(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const first = main && Array.from(main.children).find((el) => el.getBoundingClientRect().height > 0);
    if (!first) return false;
    const r = first.getBoundingClientRect();
    return r.top === 0 && r.height >= 48 && r.width === document.documentElement.clientWidth;
  });
}

test.describe("pre-hydration paint", () => {
  test.use({ javaScriptEnabled: false });

  test("/play paints the header, the intro and the card skeleton", async ({ page }) => {
    await page.goto("/play");
    expect(await paintsHeaderBand(page)).toBe(true);
    await expect(page.getByRole("heading", { level: 1, name: "Play the computer" })).toBeVisible();
    await expect(page.getByText("Play online", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByLabel("Loading bot setup").filter({ visible: true }).first()).toBeVisible();
  });

  test("/lobby paints the header, the title and the lobby skeleton", async ({ page }) => {
    await page.goto("/lobby");
    expect(await paintsHeaderBand(page)).toBe(true);
    await expect(page.getByRole("heading", { level: 1, name: "Lobby" })).toBeVisible();
    await expect(page.getByLabel("Loading the lobby").filter({ visible: true }).first()).toBeVisible();
  });
});

// Records the Play online door's top edge on every animation frame from the
// moment it exists, so a move between any two frames is caught.
const SAMPLE_DOOR = `(() => {
  window.__doorYs = [];
  const tick = () => {
    const el = document.querySelector('main a.plate[href="/lobby"]');
    if (el) window.__doorYs.push(Math.round(el.getBoundingClientRect().top));
    if (window.__doorYs.length < 400) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

async function doorTrack(page: Page): Promise<number[]> {
  await page.waitForFunction(() => (window as unknown as { __doorYs: number[] }).__doorYs.length >= 120);
  return page.evaluate(() => (window as unknown as { __doorYs: number[] }).__doorYs);
}

test.describe("tour note", () => {
  test("a first-time visitor sees the note from the first paint and nothing moves", async ({ page }) => {
    await page.addInitScript(SAMPLE_DOOR);
    await page.goto("/play");
    await expect(page.getByRole("note")).toBeVisible();
    const ys = await doorTrack(page);
    expect(new Set(ys).size, `door tops: ${[...new Set(ys)].join(", ")}`).toBe(1);
  });

  test("a returning visitor never sees the note and nothing moves", async ({ page }) => {
    await page.addInitScript(`try { localStorage.setItem("nerf.tutorialNudgeDismissed", "1"); } catch (e) {}`);
    await page.addInitScript(SAMPLE_DOOR);
    await page.goto("/play");
    const ys = await doorTrack(page);
    await expect(page.getByRole("note")).toHaveCount(0);
    expect(new Set(ys).size, `door tops: ${[...new Set(ys)].join(", ")}`).toBe(1);
  });

  test("dismissing the note hides it and it stays hidden", async ({ page }) => {
    await page.goto("/play");
    await page.getByRole("button", { name: "Dismiss tour suggestion" }).click();
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Play the computer" })).toBeVisible();
    await expect(page.getByRole("note")).toHaveCount(0);
  });
});

// axe on /play: the selected option pills drew the accent on a 20% accent
// wash, 4.17:1 in the dark scheme, and the bot Elo inside them was dimmed to
// 70% on top of that. Every pressed pill's text, the Elo included, must reach
// the 4.5:1 AA floor in both schemes.
const PRESSED_CONTRAST = `(() => {
  const nums = (c) => c.match(/[\\d.]+/g).map(Number);
  const lum = (rgb) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const ground = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = nums(getComputedStyle(e).backgroundColor);
      const a = c.length > 3 ? c[3] : 1;
      if (a > 0) { layers.push([c[0], c[1], c[2], a]); if (a >= 1) break; }
    }
    let base = [0, 0, 0];
    for (const [r, g, b, a] of layers.reverse()) base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)];
    return base;
  };
  const els = Array.from(document.querySelectorAll('button[aria-pressed="true"], button[aria-pressed="true"] *'));
  return els.filter((el) => el.textContent.trim()).map((el) => {
    let opacity = 1;
    for (let e = el; e && e.tagName !== "BUTTON"; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
    const bg = ground(el.closest("button"));
    const c = nums(getComputedStyle(el).color);
    const a = (c.length > 3 ? c[3] : 1) * opacity;
    const fg = [0, 1, 2].map((i) => c[i] * a + bg[i] * (1 - a));
    const l1 = lum(fg), l2 = lum(bg);
    return { text: el.textContent.trim(), ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) };
  });
})()`;

for (const scheme of ["dark", "light"] as const) {
  test(`pressed option pills clear AA, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.addInitScript((s) => {
      try {
        localStorage.setItem("dc:settings-v1", JSON.stringify({ siteTheme: s }));
      } catch {}
    }, scheme);
    await page.goto("/play");
    await expect(page.locator('button[aria-pressed="true"]').first()).toBeVisible({ timeout: 90_000 });
    const rows = (await page.evaluate(PRESSED_CONTRAST)) as { text: string; ratio: number }[];
    console.log(scheme, JSON.stringify(rows.map((r) => `${r.text} ${r.ratio.toFixed(2)}`)));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.ratio, r.text).toBeGreaterThanOrEqual(4.5);
  });
}
