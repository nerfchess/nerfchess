import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const route = "/faq";
for (const mode of (process.env.MODES||"strip,strip+second").split(",")) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  if (mode.startsWith("strip")) await page.route((u) => u.pathname === route, async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace(/(\.woff2)\?v=\d+/g, "$1") }); });
  if (mode.includes("second")) { await page.goto("http://localhost:3000/about", { waitUntil: "load", timeout: 300000 }); await page.waitForTimeout(2000); }
  await page.goto("http://localhost:3000" + route, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({ fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime), css: performance.getEntriesByType("resource").filter((e) => /\.css|woff2/.test(e.name)).map((e) => e.name.split("/").pop().slice(0, 24) + " " + e.initiatorType + " " + Math.round(e.startTime) + "-" + Math.round(e.responseEnd)), noto: [...document.fonts].filter((f) => f.family === "Noto Sans" && f.status !== "unloaded").map((f) => f.weight + f.status) }));
  const cdp = await ctx.newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument"); const q = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "main p" });
  const pf = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId: q.nodeId })).fonts.map((f) => f.familyName).join(",");
  console.log(mode, pf, JSON.stringify(r));
  await ctx.close();
}
await b.close();
