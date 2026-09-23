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
