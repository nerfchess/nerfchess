import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const route = process.argv[2] || "/faq";
for (const w of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto("http://localhost:3000" + route, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => ({
    faces: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`),
    bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 120),
    res: performance.getEntriesByType("resource").filter((e) => e.name.includes("woff2")).map((e) => e.name.split("/").pop().slice(0, 30) + " " + Math.round(e.startTime) + "-" + Math.round(e.responseEnd)),
    fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
  }));
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument");
  const out = {};
  for (const sel of ["p", "nav.site-nav a", "h1", ".font-mono"]) {
    const q = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) continue;
    const pf = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: q.nodeId });
    out[sel] = pf.fonts.map((f) => `${f.familyName}${f.isCustomFont ? "*" : ""}:${f.glyphCount}`).join(",");
  }
  console.log(w, JSON.stringify({ ...r, platform: out }));
  await ctx.close();
}
await b.close();
