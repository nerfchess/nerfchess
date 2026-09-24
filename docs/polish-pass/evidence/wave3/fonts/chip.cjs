const { chromium } = require("playwright");
const routes = process.argv.slice(3);
const [vw, vh] = (process.argv[2]).split("x").map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  for (const r of routes) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, storageState: "/home/user/nerfchess/.polish-auth/user.json" });
    const cookies = (await ctx.cookies()).map(c => c.name);
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      window.__boxes = []; window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__boxes.push(`  shift t=${Math.round(e.startTime)} ${e.value.toFixed(4)}`); } }).observe({ type: "layout-shift", buffered: true });
      let last = "";
      const tick = () => {
        const el = document.querySelector("nav.site-nav > div.relative.flex.items-center");
        if (el) { const q = el.getBoundingClientRect(); const s = `x=${Math.round(q.x)} w=${Math.round(q.width)} kids=${el.children.length}`; if (s !== last) { window.__boxes.push(`  t=${Math.round(performance.now())} cluster ${s}`); last = s; } }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await p.goto("http://localhost:3000" + r, { waitUntil: "load", timeout: 240000 });
    await p.waitForTimeout(6000);
    const out = await p.evaluate(() => [...window.__boxes, `  cls=${window.__cls.toFixed(4)}`]);
    console.log("==", r, vw, "cookies:", cookies.join(",")); console.log(out.join("\n"));
    await ctx.close();
  }
  await b.close();
})();
