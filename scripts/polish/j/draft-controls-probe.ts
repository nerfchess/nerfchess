// Slice J probe (F157): font size and box height of every control in the
// draft overlay (/dev/draft), on a phone with a coarse pointer and on a
// desktop, plus the hidden-draft chip and its accessible name. Prints JSON and
// saves it under docs/polish-pass/evidence/J/f157-<label>.json.
//
//   ./node_modules/.bin/tsx scripts/polish/j/draft-controls-probe.ts before
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
const label = process.argv[2] ?? "run";

const MEASURE = `(() => [...document.querySelectorAll('[role="dialog"] button, [role="dialog"] [role="button"], button[aria-label="Show the draft"], button[data-draft-chip]')]
  .filter((b) => b.offsetParent)
  .map((b) => {
    const r = b.getBoundingClientRect();
    const texts = [...b.querySelectorAll("*")].concat([b]).filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
    const sizes = texts.map((n) => parseFloat(getComputedStyle(n).fontSize));
    return {
      text: (b.textContent || "").trim().slice(0, 40),
      name: b.getAttribute("aria-label") ?? (b.hasAttribute("data-draft-chip") ? (b.textContent || "").trim() : null),
      h: Math.round(r.height),
      w: Math.round(r.width),
      minFont: sizes.length ? Math.min(...sizes) : null,
    };
  }))()`;

async function run(viewport: { width: number; height: number }, touch: boolean) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("dc:settings-v1", JSON.stringify({ animationSpeed: "off" }));
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/draft`, { timeout: 300_000 });
  await page.getByRole("button", { name: "Open", exact: true }).first().click({ timeout: 300_000 });
  await page.locator('[role="dialog"]').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(800);
  // Select a card so Confirm names it.
  await page.locator('[role="dialog"] [aria-pressed]').first().click().catch(() => {});
  const open = await page.evaluate(MEASURE);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const hidden = await page.evaluate(MEASURE);
  await browser.close();
  return { viewport: `${viewport.width}x${viewport.height}`, touch, open, hidden };
}

(async () => {
  const out = [await run({ width: 390, height: 844 }, true), await run({ width: 1280, height: 800 }, false)];
  const dir = path.join("docs", "polish-pass", "evidence", "J");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `f157-${label}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
})();
