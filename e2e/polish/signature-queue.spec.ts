import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// F208 regression: the signature queue held the board 2.6s per play and
// reported busy (deferring the draft overlay) even with animations off, where
// no spectacle plays. The spacing now follows --fx-dur and the tempo.

const settings = (animationSpeed: string) => ({
  cookies: [],
  origins: [
    {
      origin: "http://localhost:3000",
      localStorage: [{ name: "dc:settings-v1", value: JSON.stringify({ animationSpeed }) }],
    },
  ],
});

async function timeline(page: Page) {
  await page.goto("/dev/splash");
  // Stamp every slot change and busy flip on one clock (plain string: no
  // compiled helpers inside the page).
  await page.evaluate(`(() => {
    window.__sig = [];
    const t0 = performance.now();
    const el = document.querySelector("[data-sig-slot]");
    new MutationObserver(() => window.__sig.push({ t: Math.round(performance.now() - t0), slot: el.dataset.sigSlot, busy: el.dataset.sigBusy }))
      .observe(el, { attributes: true });
  })()`);
  await page.getByRole("button", { name: "Fire three plays" }).click();
  await expect(page.locator('[data-sig-slot="three"]')).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(400);
  return (await page.evaluate("window.__sig")) as { t: number; slot: string; busy: string }[];
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
  test("queued plays step out at once and never report busy", async ({ page }) => {
    const tl = await timeline(page);
    save("off", tl);
    const first = tl.find((e) => e.slot === "one")!;
    const last = tl.find((e) => e.slot === "three")!;
    expect(last.t - first.t).toBeLessThan(300);
    expect(tl.some((e) => e.busy === "1")).toBe(false);
  });
});

test.describe("full motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" }, storageState: settings("normal") });
  test("queued plays keep their spacing", async ({ page }) => {
    const tl = await timeline(page);
    save("normal", tl);
    const first = tl.find((e) => e.slot === "one")!;
    const second = tl.find((e) => e.slot === "two")!;
    expect(second.t - first.t).toBeGreaterThan(2_000);
  });
});
