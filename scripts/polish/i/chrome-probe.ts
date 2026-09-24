// Slice I regression probe for the Tier A chrome motion on /dev/motion, at
// Animations normal and off. Each check is a property the pre-fix code broke:
//
//   F194  a newly landed dock card runs ONE entrance on the row element
//         (before: a framer slide written as an inline transform plus
//         .dock-arrive plus .dock-pocket-flash, the last dropped by the cascade)
//   F191  the tour spotlight hole does not tween its geometry
//         (before: transition-all over top/left/width/height)
//   F190  the searching presence dot follows data-anim, not the OS flag
//         (before: animate-pulse motion-reduce:animate-none)
//   F195  a board notice is fully visible on its first frame with motion off
//         and uses the shared toast motion otherwise
//   F191  the eval fill moves by transform, and lands at once with motion off
//         (before: height / width transitions)
//   F009  html reserves the scrollbar gutter
//   F199  the settings picker chevron turns on the shared .m-chevron
//
//   scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/i/chrome-probe.ts [label]
//
// With a label it writes docs/polish-pass/evidence/I/<label>/chrome-probe.json.
import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
const label = process.argv[2];

type Check = { id: string; mode: string; ok: boolean; got: unknown };

async function open(mode: "normal" | "off"): Promise<{ page: Page; close: () => Promise<void> }> {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((s: string) => {
    try {
      localStorage.setItem("dc:settings-v1", JSON.stringify({ animationSpeed: s }));
    } catch {}
  }, mode);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/motion`, { timeout: 300_000 });
  await page.locator("[data-testid=dock-add]").waitFor({ timeout: 300_000 });
  await page.waitForFunction(
    `document.documentElement.getAttribute("data-anim") === ${JSON.stringify(mode)} || ${JSON.stringify(mode)} === "normal"`,
    null,
    { timeout: 30_000 },
  );
  return { page, close: () => browser.close() };
}

async function probe(mode: "normal" | "off"): Promise<Check[]> {
  const { page, close } = await open(mode);
  const out: Check[] = [];
  const push = (id: string, ok: boolean, got: unknown) => out.push({ id, mode, ok, got });

  // F009
  const gutter = await page.evaluate(`getComputedStyle(document.documentElement).scrollbarGutter`);
  push("F009 scrollbar-gutter stable", gutter === "stable", gutter);

  // F194: land a card, read the row's own animations on the next frame.
  await page.click("[data-testid=dock-add]");
  const dock = (await page.evaluate(`new Promise((res) => requestAnimationFrame(() => {
    const rows = [...document.querySelectorAll("[data-clip=dock] .dock-card")];
    const el = rows[rows.length - 1];
    res({
      names: el.getAnimations().map((a) => a.animationName || a.constructor.name),
      inlineTransform: el.style.transform || "",
      opacity: getComputedStyle(el).opacity,
    });
  }))`)) as { names: string[]; inlineTransform: string; opacity: string };
  if (mode === "normal") {
    push("F194 one dock entrance", dock.names.length === 1 && dock.names[0] === "dock-arrive" && !dock.inlineTransform, dock);
  } else {
    push("F194 dock row settled with motion off", dock.opacity === "1" && !dock.inlineTransform, dock);
  }

  // F190 / F197: the searching dot.
  const dot = (await page.evaluate(`(() => {
    const el = document.querySelector("[data-clip=presence] .dot-live");
    if (!el) return null;
    return { cls: el.className, after: getComputedStyle(el, "::after").animationName };
  })()`)) as { cls: string; after: string } | null;
  push(
    "F190 presence dot on the data-anim gate",
    !!dot && !/animate-pulse|motion-reduce|motion-safe/.test(dot.cls) && (mode === "off" ? dot.after === "none" : dot.after === "dot-ping"),
    dot,
  );

  // F195: a board notice.
  await page.click("[data-testid=god-notice]");
  const toast = (await page.evaluate(`new Promise((res) => requestAnimationFrame(() => {
    const el = document.querySelector("[data-clip=notices] .m-toast");
    res(el ? { opacity: getComputedStyle(el).opacity, anim: getComputedStyle(el).animationName } : null);
  }))`)) as { opacity: string; anim: string } | null;
  push(
    "F195 notice on the shared toast motion",
    !!toast && (mode === "off" ? toast.opacity === "1" && toast.anim === "none" : toast.anim === "m-toast-in"),
    toast,
  );

  // F191: eval fill by transform.
  await page.click("[data-testid=eval-swing]");
  const evalFill = (await page.evaluate(`new Promise((res) => requestAnimationFrame(() => {
    const fills = [...document.querySelectorAll("[data-clip=eval] [role=img] > div")].slice(0, 2);
    res(fills.map((el) => { const cs = getComputedStyle(el); return { prop: cs.transitionProperty, transform: cs.transform, dur: cs.transitionDuration }; }));
  }))`)) as { prop: string; transform: string; dur: string }[];
  const layoutProp = evalFill.some((f) => /\b(width|height|all)\b/.test(f.prop) && !/^0s/.test(f.dur));
  push(
    "F191 eval fill moves by transform",
    evalFill.length > 0 && !layoutProp && evalFill.every((f) => f.transform !== "none"),
    evalFill,
  );

  // F191 / F192: tour spotlight.
  await page.click("[data-testid=tour-start]");
  await page.locator("[role=dialog]").first().waitFor();
  const hole = (await page.evaluate(`(() => {
    const ring = document.querySelector(".m-scrim .m-pop");
    const el = ring && ring.parentElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { prop: cs.transitionProperty, dur: cs.transitionDuration, cls: el.className };
  })()`)) as { prop: string; dur: string; cls: string } | null;
  push(
    "F191 spotlight geometry does not tween",
    !!hole && !/transition-all|motion-safe/.test(hole.cls) && hole.dur.split(",").every((d) => parseFloat(d) === 0 || /e-/.test(d)),
    hole,
  );

  // F199: the settings picker chevron on the shared .m-chevron.
  await page.goto(`${BASE}/settings`, { timeout: 300_000 });
  const trigger = page.locator("button[aria-expanded]:has(svg.m-chevron)").first();
  await trigger.waitFor({ timeout: 300_000 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.waitForTimeout(400);
  const chev = (await page.evaluate(`(() => {
    const svg = document.querySelector("button[aria-expanded]:has(svg.m-chevron) svg.m-chevron");
    return svg ? { open: svg.getAttribute("data-open"), rotate: getComputedStyle(svg).rotate, prop: getComputedStyle(svg).transitionProperty } : null;
  })()`)) as { open: string; rotate: string; prop: string } | null;
  push("F199 settings chevron on .m-chevron", !!chev && chev.open === "true" && chev.rotate === "180deg", chev);

  await close();
  return out;
}

(async () => {
  const checks = [...(await probe("normal")), ...(await probe("off"))];
  for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} [${c.mode}] ${c.id}  ${JSON.stringify(c.got)}`);
  if (label) {
    const dir = path.join("docs/polish-pass/evidence/I", label);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "chrome-probe.json"), JSON.stringify(checks, null, 1) + "\n");
  }
  if (checks.some((c) => !c.ok)) process.exit(1);
  console.log(`chrome-probe: ${checks.length} checks passed`);
})();
