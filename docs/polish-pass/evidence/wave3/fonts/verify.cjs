// For each route: every leaf-ish text element, width in Noto Sans vs in the
// metric fallback alone (same weight/size/tracking), plus how many wrapped
// blocks change line count. Reports per-weight error.
const { chromium } = require("playwright");
const routes = process.argv.slice(3);
const vw = Number(process.argv[2] || 1280);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const out = {};
  for (const r of routes) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 } });
    await p.goto("http://localhost:3000" + r, { waitUntil: "load", timeout: 240000 });
    await p.waitForFunction(() => [...document.fonts].some(f => f.family.includes("Noto Sans") && f.status === "loaded"), null, { timeout: 120000 });
    out[r] = await p.evaluate(async () => {
      const fam = "NotoSansMetricFallback";
      for (const w of [400, 500, 600, 700]) await document.fonts.load(`${w} 16px ${fam}`);
      const els = [...document.querySelectorAll("header a, header span, main p, main li, main h1, main h2, main h3, main a, main button, main td")]
        .filter(e => e.offsetParent && e.textContent.trim() && getComputedStyle(e).fontFamily.includes("Noto"));
      const byW = {}; let rewrap = 0, blocks = 0; const worst = [];
      for (const e of els) {
        const cs = getComputedStyle(e);
        const w = cs.fontWeight;
        const measure = (f, wrap) => {
          const c = e.cloneNode(true);
          c.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;font-family:${f};` + (wrap ? `width:${e.getBoundingClientRect().width}px;white-space:${cs.whiteSpace}` : "white-space:nowrap;width:auto");
          c.style.fontWeight = w; c.style.fontSize = cs.fontSize; c.style.letterSpacing = cs.letterSpacing; c.style.lineHeight = cs.lineHeight;
          c.style.padding = cs.padding; c.style.boxSizing = cs.boxSizing;
          document.body.appendChild(c); const rect = c.getBoundingClientRect(); c.remove(); return rect;
        };
        const a = measure('"Noto Sans"', false).width, f = measure(fam, false).width;
        if (a < 4) continue;
        (byW[w] ??= []).push(f / a);
        if (/^(P|LI|H1|H2|H3)$/.test(e.tagName)) {
          blocks++;
          const ha = measure('"Noto Sans"', true).height, hf = measure(fam, true).height;
          if (Math.abs(ha - hf) > 1) { rewrap++; worst.push(`${e.tagName} w${w} ${Math.round(ha)}->${Math.round(hf)} "${e.textContent.trim().slice(0, 40)}"`); }
        }
      }
      const stat = {};
      for (const [w, v] of Object.entries(byW)) { v.sort((x, y) => x - y); const mean = v.reduce((s, x) => s + x, 0) / v.length; stat[w] = { n: v.length, mean: +mean.toFixed(4), p10: +v[Math.floor(v.length * 0.1)].toFixed(3), p90: +v[Math.floor(v.length * 0.9)].toFixed(3) }; }
      const brand = [...document.querySelectorAll("header span")].find(s => s.textContent.trim() === "nerfchess");
      return { stat, blocks, rewrap, worst: worst.slice(0, 6), brandFallbackOverNoto: brand ? byW : undefined && 0 };
    });
    delete out[r].brandFallbackOverNoto;
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
