// Regression check for slice K (plugin scene text drawn off the board).
//
// Plays each card on the /dev/plays single-card stage and samples every SVG
// <text> inside a gambling scene (.gsp) while the scene runs. A text that is
// visible (opacity above 0.5 up its ancestor chain) must sit inside the board
// box: before the fix the 58 outcome tags were authored at y 90 to 94 of a
// 14-cell canvas, i.e. below the board, and never on screen.
//
//   scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/k/gsp-tag-bounds.ts gm_the_house,gm_martingale
//
// Exit 1 when any visible text leaves the board by more than 2px.
import { chromium } from "@playwright/test";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
const ids = (process.argv[2] ?? "gm_the_house,gm_martingale,gm_the_last_bet,gm_gacha_banner").split(",");

// Scene roots of the plugin modules that share the 14-cell Wide/Framed canvas.
const SEL = process.env.SCENE_TEXT ?? ".gsp text, .csp text, .fnp text, .mnp text, .prk text, .pnp text";

const PROBE = `(() => {
  const SEL = ${JSON.stringify(SEL)};
  const board = document.querySelector("[data-card-stage]").getBoundingClientRect();
  const out = [];
  for (const t of document.querySelectorAll(SEL)) {
    let el = t, op = 1;
    while (el && el !== document.body) { op *= Number(getComputedStyle(el).opacity || 1); el = el.parentElement; }
    if (op < 0.5) continue;
    if (t.closest("[clip-path]")) continue; // reel symbols scroll inside a clipped window
    const r = t.getBoundingClientRect();
    if (!r.width) continue;
    const over = Math.max(board.left - r.left, r.right - board.right, board.top - r.top, r.bottom - board.bottom);
    out.push({ text: t.textContent, over: Math.round(over) });
  }
  return out;
})()`;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  let bad = 0;
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/dev/plays?id=${id}&bare=1`, { timeout: 300000 });
    for (let i = 0; i < 5; i++) {
      try {
        await page.waitForTimeout(2500);
        await page.waitForFunction("window.__cardStage && typeof window.__cardStage.play === 'function'", null, { timeout: 300000 });
        await page.evaluate("window.__cardStage.play()");
        break;
      } catch {
        /* dev server reloaded the page; try again */
      }
    }
    const worst = new Map<string, number>();
    for (let t = 0; t < 3200; t += 200) {
      await page.waitForTimeout(200);
      for (const s of (await page.evaluate(PROBE)) as { text: string; over: number }[])
        worst.set(s.text, Math.max(worst.get(s.text) ?? -Infinity, s.over));
    }
    const off = [...worst].filter(([, o]) => o > 2);
    bad += off.length;
    console.log(`${off.length ? "FAIL" : "ok  "} ${id}: ${worst.size} visible texts${off.map(([t, o]) => `\n     "${t}" leaves the board by ${o}px`).join("")}`);
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
