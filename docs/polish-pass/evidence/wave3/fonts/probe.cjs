const { chromium } = require("playwright");
const [vw, vh] = (process.argv[2] || "390x844").split("x").map(Number);
const routes = process.argv.slice(3);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  for (const r of routes) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh } });
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      window.__log = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__log.push(`shift t=${Math.round(e.startTime)} v=${e.value.toFixed(4)} ` + e.sources.map(s => (s.node && s.node.nodeName) + ":" + (s.node && s.node.textContent || "").slice(0, 25).replace(/\s+/g, " ")).join(" | ")); }).observe({ type: "layout-shift", buffered: true });
      document.fonts && document.fonts.addEventListener("loadingdone", ev => window.__log.push(`fontsdone t=${Math.round(performance.now())} ` + ev.fontfaces.map(f => f.family + ":" + f.weight).join(",")));
    });
    const fontReq = [];
    p.on("requestfinished", async req => { if (/woff2/.test(req.url())) { const t = req.timing(); fontReq.push(`${req.url().split("/").pop().slice(0, 30)} end=${Math.round(t.responseEnd)}`); } });
    await p.goto("http://localhost:3000" + r, { waitUntil: "load", timeout: 240000 });
    await p.waitForTimeout(4000); const used = await p.evaluate(() => [...document.fonts].filter(f=>f.status==="loaded").map(f=>f.family+":"+f.weight).join(",") + " | brand=" + getComputedStyle(document.querySelector("main p, p")).fontFamily + " | check=" + document.fonts.check("16px \"Noto Sans\"")); console.log("  loaded:", used);
    const log = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return [`fcp=${Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime)} dcl=${Math.round(n.domContentLoadedEventEnd)}`, ...window.__log]; });
    console.log("==", r, vw); for (const l of log) console.log(" ", l); for (const f of fontReq) console.log("  req", f);
    await ctx.close();
  }
  await b.close();
})();
