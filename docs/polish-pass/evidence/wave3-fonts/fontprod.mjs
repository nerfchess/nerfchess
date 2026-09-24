import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const strip = process.env.STRIP === "1";
for (const route of process.argv.slice(2)) for (const w of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  const warns = [];
  page.on("console", (m) => { if (/preloaded/.test(m.text())) warns.push(m.text().slice(40, 90)); });
  if (strip) await page.route((u) => u.pathname === route, async (r) => {
    const res = await r.fetch(); let body = await res.text();
    body = body.replace(/(\.woff2)\?v=\d+/g, "$1");
    await r.fulfill({ response: res, body });
  });
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto("http://localhost:3000" + route, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(3500);
  const cdp = await ctx.newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument"); const q = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "main p" });
  const pf = q.nodeId ? (await cdp.send("CSS.getPlatformFontsForNode", { nodeId: q.nodeId })).fonts.map((f) => f.familyName).join(",") : "-";
  const cls = await page.evaluate(() => +window.__cls.toFixed(4));
  console.log(route, w, "strip=" + strip, "font=" + pf, "clsSum=" + cls, "preloadWarn=" + warns.length);
  await ctx.close();
}
await b.close();
