import { chromium } from "playwright";
import fs from "node:fs";
const st = JSON.parse(fs.readFileSync("/home/user/nerfchess/.polish-auth/user.json", "utf8"));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, storageState: { cookies: st.cookies, origins: [] } });
  const page = await ctx.newPage();
  const msgs = [];
  page.on("console", (m) => { if (/preload/i.test(m.text())) msgs.push(m.text().slice(0, 160)); });
  await page.addInitScript(() => {
    window.__s = []; window.__cls = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: e.sources.map((s) => (s.node?.className || s.node?.nodeName || "").toString().slice(0, 50)) }); }).observe({ type: "layout-shift", buffered: true });
    let n = 0; const tick = () => { const nav = document.querySelector("nav.site-nav"); if (nav) { const kids = [...nav.querySelectorAll(":scope > div")].map((d) => Math.round(d.getBoundingClientRect().width)); const last = nav.lastElementChild; window.__s.push({ t: Math.round(performance.now()), k: JSON.stringify(kids), right: last ? Math.round(last.getBoundingClientRect().left) : null }); } if (++n < 600) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  });
  await page.goto("http://localhost:3000/faq", { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => ({ cls: window.__cls, s: window.__s, who: document.cookie.includes("nc_who") }));
  let prev = ""; const changes = [];
  for (const s of r.s) { const k = s.k + "|" + s.right; if (k !== prev) { changes.push(s); prev = k; } }
  console.log(JSON.stringify({ w, cls: r.cls, changes, who: r.who, preloadWarnings: msgs }, null, 0));
  await ctx.close();
}
await b.close();
