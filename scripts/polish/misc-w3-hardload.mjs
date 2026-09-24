// Hard-load probe for useSkeletonHold (wave 3 misc, review finding 3).
//
// A fresh context loads /leaderboard with the /api/leaderboard answer held for
// each delay. The skeleton on a hard load comes from the server HTML, so its
// CSS show-delay runs from first paint, not from hydration. The probe records
// when the skeleton became visible, when the answer was released and when the
// skeleton left. contentAfterAnswer is the time-to-content cost of the hold.
//
//   scripts/polish/heavy.sh node scripts/polish/misc-w3-hardload.mjs out.json
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const out = process.argv[2];
const b = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const rows = [];
for (const round of [1, 2]) {
  for (const delay of [0, 100, 200, 300, 600]) {
    const c = await b.newContext();
    const p = await c.newPage();
    let answeredAt = null;
    await c.route((u) => u.pathname === "/api/leaderboard", async (r) => {
      const resp = await r.fetch();
      const body = await resp.body();
      await new Promise((s) => setTimeout(s, delay));
      answeredAt = await p.evaluate(() => performance.now()).catch(() => null);
      await r.fulfill({ response: resp, body });
    });
    await p.addInitScript(() => {
      window.__t = { vis: null, gone: null };
      const tick = () => {
        const el = document.querySelector("main .skeleton");
        if (el && window.__t.vis === null && parseFloat(getComputedStyle(el).opacity) > 0.05) window.__t.vis = performance.now();
        if (!el && window.__t.vis !== null && window.__t.gone === null) window.__t.gone = performance.now();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await p.goto(`${BASE}/leaderboard`, { timeout: 240000 });
    await p.waitForFunction(() => window.__t.gone !== null, null, { timeout: 240000 });
    const t = await p.evaluate(() => window.__t);
    const row = {
      round,
      delay,
      skeletonVisibleAt: Math.round(t.vis),
      answeredAt: answeredAt === null ? null : Math.round(answeredAt),
      gone: Math.round(t.gone),
      skeletonOnScreenBeforeAnswer: Math.round(answeredAt - t.vis),
      contentAfterAnswer: Math.round(t.gone - answeredAt),
    };
    console.log(JSON.stringify(row));
    rows.push(row);
    await c.close();
  }
}
await b.close();
if (out) writeFileSync(out, JSON.stringify(rows, null, 2) + "\n");
