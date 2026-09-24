// ---------------------------------------------------------------------------
// Wave 3 contrast probe: the live .btn-leaf fill at rest and on hover in each
// site scheme (dark, midnight, light), and the paper mode label colours
// (text-mode-nerfGlow / buffGlow) against white. Prints the WCAG ratio of the
// white label on the painted fill (brightness filter applied).
//
//   ./node_modules/.bin/tsx scripts/polish/contrast-w3-probe.ts [--out NAME]
// ---------------------------------------------------------------------------
import path from "node:path";
import { EVIDENCE_DIR, launch, parseArgs, rel, writeJson } from "./lib/common";
import { BASE } from "./lib/common";

const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const rgbOf = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const bright = (f: string) => { const m = f.match(/brightness\(([\d.]+)\)/); return m ? +m[1] : 1; };

async function main() {
  const args = parseArgs();
  const browser = await launch();
  const out: Record<string, unknown>[] = [];
  try {
    for (const theme of ["dark", "midnight", "light"]) {
      const ctx = await browser.newContext({
        baseURL: BASE,
        viewport: { width: 1280, height: 800 },
        colorScheme: theme === "light" ? "light" : "dark",
        storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "dc:settings-v1", value: JSON.stringify({ siteTheme: theme }) }] }] },
      });
      const page = await ctx.newPage();
      await page.goto("/contact", { waitUntil: "networkidle", timeout: 180_000 });
      const btn = page.locator(".btn-leaf").first();
      await btn.waitFor({ timeout: 30_000 });
      const read = () => btn.evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, filter: cs.filter }; });
      const rest = await read();
      await btn.hover();
      await page.waitForTimeout(600);
      const hover = await read();
      const fill = (r: { bg: string; filter: string }) => rgbOf(r.bg).map((c) => Math.min(255, c * bright(r.filter)));
      // A string body: tsx would wrap a named inner function in __name, which
      // does not exist in the page.
      const labels = (await page.evaluate(`(() => {
        const probe = (cls) => { const s = document.createElement("span"); s.className = cls; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
        return { nerfGlow: probe("text-mode-nerfGlow"), buffGlow: probe("text-mode-buffGlow"), themeAttr: document.documentElement.getAttribute("data-theme") };
      })()`)) as { nerfGlow: string; buffGlow: string; themeAttr: string | null };
      const row = {
        theme,
        themeAttr: labels.themeAttr,
        rest: { ...rest, ratio: ratio(rgbOf(rest.color), fill(rest)) },
        hover: { ...hover, ratio: ratio(rgbOf(hover.color), fill(hover)) },
        nerfGlow: { color: labels.nerfGlow, onWhite: ratio(rgbOf(labels.nerfGlow), [255, 255, 255]) },
        buffGlow: { color: labels.buffGlow, onWhite: ratio(rgbOf(labels.buffGlow), [255, 255, 255]) },
      };
      console.log(JSON.stringify(row));
      out.push(row);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  const name = args.values.get("out") ?? "contrast-probe";
  console.log(`wrote ${rel(writeJson(path.join(EVIDENCE_DIR, "wave3", `${name}.json`), { generatedAt: new Date().toISOString(), rows: out }))}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
