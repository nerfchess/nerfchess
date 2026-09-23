// Slice J probe (F205): how long the final position holds before the result
// panel arrives, for an on-board ending (flag) and an off-board one (resign),
// in the local bot game. Prints JSON; pass a label to save it under
// docs/polish-pass/evidence/J/.
//
//   ./node_modules/.bin/tsx scripts/polish/j/settle-probe.ts before
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
const label = process.argv[2] ?? "run";
const speed = process.argv[3] ?? "normal";

async function run(kind: "flag" | "resign") {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((s: string) => {
    try {
      localStorage.setItem(
        "dc:settings-v1",
        JSON.stringify({ animationSpeed: s, premovesEnabled: false, confirmResign: false }),
      );
      localStorage.removeItem("dc:active-ai-game");
    } catch {}
  }, speed);
  const page = await ctx.newPage();
  const t = kind === "flag" ? 4 : 60;
  await page.goto(`${BASE}/game?mode=plain&difficulty=easy&color=w&t=${t}&inc=0&rated=0`, {
    timeout: 300_000,
  });
  await page.getByRole("button", { name: "Resign the game" }).first().waitFor({ timeout: 300_000 });
  // Watch: the moment the game ends and the moment the dialog is attached,
  // on one clock.
  // Plain string: tsx keepNames would inject __name into a function body.
  await page.evaluate(`(() => {
    window.__j = {};
    const tick = () => {
      const now = performance.now();
      // Flag: the first frame a clock pill reads zero. Resign: the click.
      const zero = [...document.querySelectorAll("[data-clock-seat]")].some((el) => /^0[:.]0+(\.0)?$/.test((el.textContent || "").trim()));
      if (window.__j.end == null && zero) window.__j.end = now;
      if (window.__j.dialog == null && document.querySelector('[data-dialog="game-over"]')) window.__j.dialog = now;
      if (window.__j.dialog == null) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.addEventListener("click", (e) => {
      if (e.target.closest('button[aria-label="Resign the game"]') && window.__j.end == null) window.__j.end = performance.now();
    }, true);
  })()`);
  if (kind === "resign") await page.getByRole("button", { name: "Resign the game" }).first().click();
  await page.locator('[data-dialog="game-over"]').waitFor({ timeout: 60_000 });
  const j = (await page.evaluate("window.__j")) as Record<string, number>;
  await browser.close();
  return { kind, speed, endToDialogMs: Math.round(j.dialog - j.end) };
}

(async () => {
  const out = [await run("flag"), await run("resign")];
  console.log(JSON.stringify(out));
  const dir = path.join("docs", "polish-pass", "evidence", "J");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `f205-settle-${label}-${speed}.json`), JSON.stringify(out, null, 1));
})();
