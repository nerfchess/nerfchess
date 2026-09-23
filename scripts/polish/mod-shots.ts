// Screenshots and a text-size floor check for the moderator panel (slice G).
//
//   ./node_modules/.bin/tsx scripts/polish/mod-shots.ts [--out FILE]
//
// For /mod/stats and the audit log with a Change disclosure open, plus the
// dashboard, card editor, house page and both stats scopes (390 and 1280): full-page PNGs under evidence/G, horizontal overflow,
// and the smallest computed font-size of any visible text in <main>, which
// must be at least 13px (brief section 0, design-system.md).

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { launch, BASE, AUTH_DIR, EVIDENCE_DIR } from "./lib/common";

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
const DIR = path.join(EVIDENCE_DIR, "G");

async function measure(page: Page): Promise<{ minFontPx: number; below13: string[]; overflowX: number }> {
  // A dev-server hot reload can replace the page mid-read; read again.
  for (let i = 0; ; i++) {
    try {
      return await measureOnce(page);
    } catch (err) {
      if (i >= 3) throw err;
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
    }
  }
}

async function measureOnce(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body;
    let min = Infinity;
    const small: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || el.closest("[aria-hidden='true'] svg")) continue;
      const size = parseFloat(cs.fontSize);
      if (size < min) min = size;
      if (size < 13 && small.length < 10) small.push(`${size}px ${el.tagName.toLowerCase()}: ${text.slice(0, 40)}`);
    }
    return {
      minFontPx: min,
      below13: small,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

// The shared dev server restarts now and then; retry a navigation that is cut.
async function go(page: Page, url: string) {
  for (let i = 0; ; i++) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded", timeout: 300_000 });
    } catch (err) {
      if (i >= 5) throw err;
      await page.waitForTimeout(10_000);
    }
  }
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const browser = await launch();
  const results: Record<string, unknown>[] = [];
  const errors: string[] = [];
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ storageState: path.join(AUTH_DIR, "mod.json"), viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`${width} ${m.text().slice(0, 200)}`);
      });

      await go(page, `${BASE}/mod/stats`);
      await page.getByText("Sign-ups per day", { exact: false }).first().waitFor({ timeout: 300_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      const statsShot = path.join(DIR, `stats-metrics-${width}.png`);
      await page.screenshot({ path: statsShot, fullPage: true });
      results.push({ route: "/mod/stats", width, shot: path.relative(DIR, statsShot), ...(await measure(page)) });

      await go(page, `${BASE}/mod#log`);
      const change = page.locator("details").filter({ hasText: "Change" }).first();
      await change.waitFor({ timeout: 300_000 });
      await change.locator("summary").click();
      await change.scrollIntoViewIfNeeded();
      const logShot = path.join(DIR, `audit-change-open-${width}.png`);
      await page.screenshot({ path: logShot, fullPage: false });
      results.push({ route: "/mod#log (Change open)", width, shot: path.relative(DIR, logShot), changeOpen: await change.evaluate((d) => (d as HTMLDetailsElement).open), ...(await measure(page)) });
      // The rest of the panel, after the 13px sweep over every mod file.
      for (const route of ["/mod", "/mod/cards", "/mod/house", "/mod/stats/all", "/mod/stats/humans"]) {
        await go(page, `${BASE}${route}`);
        await page.locator("main").first().waitFor({ timeout: 300_000 });
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.getByText(/^Loading/).first().waitFor({ state: "detached", timeout: 180_000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const shot = path.join(DIR, `sweep-${route.replace(/\//g, "_").replace(/^_/, "")}-${width}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        results.push({ route, width, shot: path.relative(DIR, shot), ...(await measure(page)) });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => (r.minFontPx as number) < 13 || (r.overflowX as number) > 0);
  const summary = { at: new Date().toISOString(), base: BASE, results, consoleErrors: errors, pass: failed.length === 0 };
  console.log(JSON.stringify(summary, null, 2));
  if (OUT) writeFileSync(OUT, JSON.stringify(summary, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
