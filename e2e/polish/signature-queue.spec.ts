import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// F208 regression: the signature queue held the board 2.6s per play and
// reported busy (deferring the draft overlay) even with animations off, where
// no spectacle plays. Busy now follows --fx-dur and the tempo, so it is never
// set with animations off. The step between queued plays keeps the reading
// hold with animations off (review round 1): CastTextFallback is the only
// card-play feedback there and is keyed to the one play slot, so a burst
// stepped out 16ms apart left only its last announcement readable.

const settings = (animationSpeed: string) => ({
  cookies: [],
  origins: [
    {
      origin: "http://localhost:3000",
      localStorage: [{ name: "dc:settings-v1", value: JSON.stringify({ animationSpeed }) }],
    },
  ],
});

async function timeline(page: Page, settleMs = 400) {
  await page.goto("/dev/splash");
  // Stamp every slot change and busy flip on one clock (plain string: no
  // compiled helpers inside the page).
  await page.evaluate(`(() => {
    window.__sig = [];
    const t0 = performance.now();
    const el = document.querySelector("[data-sig-slot]");
    new MutationObserver(() => window.__sig.push({ t: Math.round(performance.now() - t0), slot: el.dataset.sigSlot, busy: el.dataset.sigBusy }))
      .observe(el, { attributes: true });
    // Sample which fallback chip is actually visible, every frame.
    window.__fb = [];
    const host = document.querySelector("[data-sig-fallback-host]");
    let last = null;
    const tick = () => {
      const chip = host.querySelector(".fx-cast-fallback");
      const text = chip && getComputedStyle(chip).display !== "none" ? chip.textContent : "";
      if (text !== last) { window.__fb.push({ t: Math.round(performance.now() - t0), text }); last = text; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })()`);
  await page.getByRole("button", { name: "Fire three plays" }).click();
  await expect(page.locator('[data-sig-slot="three"]')).toHaveCount(1, { timeout: 15_000 });
  await page.waitForTimeout(settleMs);
  return (await page.evaluate("({ sig: window.__sig, fb: window.__fb })")) as {
    sig: { t: number; slot: string; busy: string }[];
    fb: { t: number; text: string }[];
  };
}

/** How long each fallback text stayed on screen, in the order shown. */
function holds(fb: { t: number; text: string }[]) {
  return fb
    .map((e, i) => ({ text: e.text, ms: (fb[i + 1]?.t ?? Infinity) - e.t }))
    .filter((e) => e.text);
}

// Evidence only when asked for (F208_LABEL=before|after).
const save = (name: string, data: unknown) => {
  if (!process.env.F208_LABEL) return;
  const dir = path.join("docs", "polish-pass", "evidence", "J");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `f208-${process.env.F208_LABEL}-${name}.json`), JSON.stringify(data, null, 1));
};

test.describe("animations off", () => {
  test.use({ storageState: settings("off") });
  test("never reports busy, and every queued play's announcement is readable", async ({ page }) => {
    const { sig, fb } = await timeline(page, 2_400);
    save("off", { sig, fb });
    expect(sig.some((e) => e.busy === "1")).toBe(false);
    const shown = holds(fb);
    // Each play's chip appears, in order, and holds long enough to read.
    expect(shown.map((e) => e.text)).toEqual(["Play one", "Play two", "Play three"]);
    for (const e of shown.slice(0, 2)) expect(e.ms).toBeGreaterThan(2_000);
    // The last one is still up 2.4s after it arrived.
    expect(fb[fb.length - 1].text).toBe("Play three");
  });
});

test.describe("full motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" }, storageState: settings("normal") });
  test("queued plays keep their spacing", async ({ page }) => {
    const { sig: tl, fb } = await timeline(page);
    save("normal", { sig: tl, fb });
    expect(tl.some((e) => e.busy === "1")).toBe(true);
    const first = tl.find((e) => e.slot === "one")!;
    const second = tl.find((e) => e.slot === "two")!;
    expect(second.t - first.t).toBeGreaterThan(2_000);
  });
});
