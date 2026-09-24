// Wave 2 chrome probe: the live checks behind docs/polish-pass/slices/wave2-chrome.md.
//
//   scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/chrome-w2-probe.ts [out.json]
//
// Against the shared dev server (POLISH_BASE, default :3000). Each check reads
// the property the wave 2 finding said was wrong:
//   account-trigger   the account menu button's disclosure attributes
//   popovers          enter animations on every header popover, and that each
//                     one is still mounted with data-leaving just after a close
//   quick-switch      the Quick settings switch's hit area (elementFromPoint)
//   mobile-nav        panel and scrim animations at 360, and their exit
//   btn-leaf          the primary fill and its contrast against the label
//   framer-gate       a framer fade on /dev/motion, 300ms in, at Animations
//                     normal (control) and off
//   skeleton          the show-delay on a .skeleton block
import { chromium, type Browser, type Page } from "playwright";
import fs from "node:fs";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
const OUT = process.argv[2];
const EXE = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

type Result = Record<string, unknown>;
const results: Result = {};

async function page(b: Browser, width: number, anim: "normal" | "off" = "normal"): Promise<Page> {
  const ctx = await b.newContext({ viewport: { width, height: width < 600 ? 800 : 800 } });
  // tsx keeps function names by wrapping them in __name(), which does not
  // exist in the page; evaluated callbacks with inner functions need it.
  await ctx.addInitScript("window.__name = (f) => f;");
  await ctx.addInitScript((s: string) => {
    try {
      const k = "dc:settings-v1";
      const cur = JSON.parse(localStorage.getItem(k) || "{}");
      localStorage.setItem(k, JSON.stringify({ ...cur, animationSpeed: s }));
    } catch {}
  }, anim);
  return ctx.newPage();
}

async function go(p: Page, path: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await p.goto(BASE + path, { waitUntil: "load", timeout: 240_000 });
      await p.waitForTimeout(2500);
      return;
    } catch (e) {
      if (i === 2) throw e;
      await p.waitForTimeout(15_000);
    }
  }
}

// Names of the animations running on the element matching `sel`.
const anims = (p: Page, sel: string) =>
  p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    return el.getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.constructor.name);
  }, sel);

// Close via `close`, then report whether `sel` is present (and leaving) after
// 30ms, and whether it is gone after 500ms.
async function exitCheck(p: Page, sel: string, close: () => Promise<void>) {
  await close();
  await p.waitForTimeout(30);
  const at30 = await p.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? { present: true, leaving: el.hasAttribute("data-leaving"), anims: el.getAnimations().map((a) => (a as CSSAnimation).animationName) } : { present: false };
  }, sel);
  await p.waitForTimeout(500);
  const at500 = await p.evaluate((s) => !!document.querySelector(s), sel);
  return { at30ms: at30, presentAt500ms: at500 };
}

function lum(rgb: number[]) {
  const c = rgb.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(parse(a)), lum(parse(b))].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

async function desktop(b: Browser) {
  const p = await page(b, 1280);
  await go(p, "/faq");
  const nav = "nav.site-nav";
  results["account-trigger"] = await p.evaluate(() => {
    const t = document.querySelector('[data-menu-trigger="profile"]');
    return t && {
      label: t.getAttribute("aria-label"),
      haspopup: t.getAttribute("aria-haspopup"),
      expanded: t.getAttribute("aria-expanded"),
      controls: t.getAttribute("aria-controls"),
    };
  });

  const pop: Result = {};
  // Search.
  await p.click('[data-menu-trigger="search"]');
  await p.waitForTimeout(40);
  pop.search = { enter: await anims(p, ".header-search-panel"), ...(await exitCheck(p, ".header-search-panel", () => p.keyboard.press("Escape"))) };
  // Account menu.
  await p.click('[data-menu-trigger="profile"]');
  await p.waitForTimeout(40);
  pop.account = { enter: await anims(p, "#site-account-menu"), ...(await exitCheck(p, "#site-account-menu", () => p.keyboard.press("Escape"))) };
  // Bell, when the visitor has one.
  if (await p.locator('[data-menu-trigger="bell"]').count()) {
    await p.click('[data-menu-trigger="bell"]');
    await p.waitForTimeout(40);
    const sel = `${nav} [data-header-right] .site-nav-pop.m-pop--end`;
    pop.bell = { enter: await anims(p, sel), ...(await exitCheck(p, sel, () => p.keyboard.press("Escape"))) };
  }
  // Quick settings.
  await p.click('button[aria-label="Quick settings"]');
  await p.waitForTimeout(40);
  const qs = 'div[role="dialog"][aria-label="Quick settings"]';
  pop.quickSettings = { enter: await anims(p, qs) };
  results["quick-switch"] = await p.evaluate((q) => {
    const sw = document.querySelector(`${q} button[role="switch"]`) as HTMLElement | null;
    if (!sw) return null;
    const r = sw.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const hit = (y: number) => {
      const el = document.elementFromPoint(cx, y);
      return !!el && (el === sw || sw.contains(el));
    };
    let top = r.top, bottom = r.bottom;
    while (hit(top - 1) && top > r.top - 30) top--;
    while (hit(bottom + 1) && bottom < r.bottom + 30) bottom++;
    return { className: sw.className, visual: { w: Math.round(r.width), h: Math.round(r.height) }, hitHeight: Math.round(bottom - top) };
  }, qs);
  pop.quickSettings = { ...(pop.quickSettings as Result), ...(await exitCheck(p, qs, () => p.keyboard.press("Escape"))) };
  // Nav hover dropdown (Play).
  await p.hover(`${nav} .group > a.site-nav-link >> nth=0`);
  await p.waitForTimeout(40);
  pop.navHover = await p.evaluate(() => {
    const d = document.querySelector("nav.site-nav .group .site-nav-pop") as HTMLElement | null;
    return d && { visible: d.getBoundingClientRect().height > 0, anims: d.getAnimations().map((a) => (a as CSSAnimation).animationName) };
  });
  await p.mouse.move(640, 700);
  results.popovers = pop;

  // Primary button fill and contrast.
  results["btn-leaf"] = await p.evaluate(() => {
    const out: unknown[] = [];
    for (const el of Array.from(document.querySelectorAll(".btn-leaf")).slice(0, 3)) {
      const cs = getComputedStyle(el);
      out.push({ text: (el.textContent || "").trim().slice(0, 30), bg: cs.backgroundColor, color: cs.color, size: cs.fontSize });
    }
    return out;
  });
  for (const r of results["btn-leaf"] as { bg: string; color: string; ratio?: number }[]) r.ratio = ratio(r.bg, r.color);
  await p.context().close();
}

async function mobile(b: Browser) {
  const p = await page(b, 360);
  await go(p, "/faq");
  await p.click('button[aria-label="Open menu"]');
  await p.waitForTimeout(40);
  const panel = "[data-testid=mobile-nav-panel]";
  const r: Result = {
    panelEnter: await anims(p, panel),
    scrimEnter: await p.evaluate(() => {
      const s = document.querySelector("body > button.m-scrim, button.m-scrim");
      return s ? s.getAnimations().map((a) => (a as CSSAnimation).animationName) : null;
    }),
  };
  Object.assign(r, await exitCheck(p, panel, () => p.keyboard.press("Escape")));
  results["mobile-nav"] = r;
  await p.context().close();
}

async function framer(b: Browser, anim: "normal" | "off") {
  // /dev/motion carries a one second linear framer fade (framer-probe) that
  // replays on each click. Read its opacity 300ms in: about 0.3 when framer
  // runs, 1 when the gate makes it land on the end state.
  const p = await page(b, 1280, anim);
  await go(p, "/dev/motion");
  await p.locator("[data-testid=framer-replay]").waitFor({ timeout: 240_000 });
  const samples: number[] = [];
  for (let i = 0; i < 3; i++) {
    await p.click("[data-testid=framer-replay]");
    await p.waitForTimeout(300);
    samples.push(await p.evaluate(() => Number(getComputedStyle(document.querySelector("[data-testid=framer-probe]")!).opacity)));
    await p.waitForTimeout(1200);
  }
  const r = { anim: await p.evaluate(() => document.documentElement.getAttribute("data-anim")), opacityAt300ms: samples };
  await p.context().close();
  return r;
}

async function skeleton(b: Browser) {
  const p = await page(b, 1280);
  await go(p, "/faq");
  const r = await p.evaluate(async () => {
    const el = document.createElement("div");
    el.className = "skeleton";
    el.style.cssText = "width:50px;height:20px";
    document.body.appendChild(el);
    const at = (ms: number) => new Promise<number>((res) => setTimeout(() => res(parseFloat(getComputedStyle(el).opacity)), ms));
    const o50 = await at(50);
    const o400 = await at(350);
    const a = el.getAnimations().map((x) => ({ name: (x as CSSAnimation).animationName, delay: x.effect?.getTiming().delay }));
    el.remove();
    return { opacityAt50ms: o50, opacityAt400ms: o400, animations: a };
  });
  results.skeleton = r;
  await p.context().close();
}

async function main() {
  const b = await chromium.launch({ executablePath: EXE });
  try {
    await desktop(b);
    await mobile(b);
    await skeleton(b);
    results["framer-gate"] = { normal: await framer(b, "normal"), off: await framer(b, "off") };
  } finally {
    await b.close();
  }
  const json = JSON.stringify(results, null, 2);
  if (OUT) fs.writeFileSync(OUT, json + "\n");
  console.log(json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
