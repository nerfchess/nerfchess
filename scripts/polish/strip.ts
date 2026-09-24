// ---------------------------------------------------------------------------
// polish:strip: frame strip capture for one animation (brief section 3.3).
//
//   npm run polish:strip -- --route /lobby --click "text=Create a game" --clip "[role=dialog]" --name lobby-create
//   npm run polish:strip -- --route /play --hover "a[href='/lobby']" --duration 300 --interval 25
//   npm run polish:strip -- --route game --trigger scripts/polish/triggers/example.ts --name draft-open
//
// Trigger (exactly one):
//   --click SEL     click a selector (Playwright selector syntax)
//   --hover SEL     hover a selector
//   --press KEY     press a key (e.g. Escape)
//   --trigger FILE  a module whose default export is `async (page) => void`
// Setup:
//   --wait-for SEL  wait for this selector before triggering
//   --setup FILE    a module whose default export runs before the trigger
// Capture:
//   --duration MS   how long after the trigger to capture (default 600)
//   --interval MS   strip spacing (default 50: frames at 0, 50, 100 ... ms)
//   --clip SEL|x,y,w,h   crop every frame to this box (element box is taken
//                   before the trigger; --pad adds room around it, default 16)
//   --columns N     tiles per row (default: all in one row, up to 13)
//   --scale F       tile scale (default 1 when clipped, else 0.5)
// State (one value each): --viewport 1280x800 --theme dark --anim full
//   --auth signed-out --net normal
// Output: --name NAME (default strip); PNG + JSON go to
//   e2e/__screens__/polish/strips/ (gitignored), or with --evidence DIR to
//   docs/polish-pass/evidence/DIR/ (keep those few and small).
//
// Frames come from a CDP screencast, which emits one frame per compositor
// frame that changed, stamped with wall-clock time; each strip tile is the
// frame that was on screen at that tick. The JSON also carries every
// long-animation-frame entry inside the window and the rAF interval record
// (dropped frames = intervals over 1.5x a 60Hz frame).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { argNum, argStr, EVIDENCE_DIR, launch, parseArgs, rel, round, SCRATCH_DIR, waitForServer, warmRoutes, writeJson } from "./lib/common";
import { composeStrip } from "./lib/compose";
import { readProbe, settle, type Rect } from "./lib/probe";
import { resolveRoutes } from "./lib/routes";
import { frameAt, startScreencast } from "./lib/screencast";
import { ANIMS, AUTHS, authFile, navTimeout, NETS, openCell, stateLabel, THEMES, VIEWPORTS, type State } from "./lib/states";
import { seedAll } from "./seed";

type Hook = (page: Page) => Promise<void>;

async function loadHook(file: string): Promise<Hook> {
  const mod = (await import(path.resolve(file))) as { default?: Hook | { default?: Hook } };
  const fn = typeof mod.default === "function" ? mod.default : (mod.default as { default?: Hook } | undefined)?.default;
  if (typeof fn !== "function") throw new Error(`${file} has no default export function`);
  return fn;
}

function one<T extends string>(v: string, all: readonly T[], name: string): T {
  if (!all.includes(v as T)) throw new Error(`--${name} ${v}: expected one of ${all.join(", ")}`);
  return v as T;
}

async function main() {
  const args = parseArgs();
  const route = resolveRoutes(argStr(args, "route", "/"))[0];
  const s: State = {
    viewport: one(argStr(args, "viewport", "1280x800"), VIEWPORTS, "viewport"),
    theme: one(argStr(args, "theme", "dark"), THEMES, "theme"),
    anim: one(argStr(args, "anim", "full"), ANIMS, "anim"),
    auth: one(argStr(args, "auth", "signed-out"), AUTHS, "auth"),
    net: one(argStr(args, "net", "normal"), NETS, "net"),
  };
  const duration = argNum(args, "duration", 600);
  const interval = argNum(args, "interval", 50);
  const name = argStr(args, "name", "strip");
  const evDir = args.values.get("evidence");
  const outDir = evDir ? path.join(EVIDENCE_DIR, evDir) : path.join(SCRATCH_DIR, "strips");

  let trigger: Hook;
  const click = args.values.get("click");
  const hover = args.values.get("hover");
  const press = args.values.get("press");
  const trigFile = args.values.get("trigger");
  if (click) trigger = async (p) => p.click(click);
  else if (hover) trigger = async (p) => p.hover(hover);
  else if (press) trigger = async (p) => p.keyboard.press(press);
  else if (trigFile) trigger = await loadHook(trigFile);
  else throw new Error("give a trigger: --click, --hover, --press or --trigger FILE");

  await waitForServer();
  if (s.auth !== "signed-out" && !fs.existsSync(authFile(s.auth))) await seedAll();
  await warmRoutes([route]);

  const browser = await launch();
  try {
    const { ctx, page } = await openCell(browser, s, { probe: true });
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: navTimeout(s.net) });
    await settle(page, { quietMs: 1000 });
    const waitFor = args.values.get("wait-for");
    if (waitFor) await page.waitForSelector(waitFor, { timeout: 30_000 });
    const setup = args.values.get("setup");
    if (setup) await (await loadHook(setup))(page);

    let clip: Rect | undefined;
    const clipArg = args.values.get("clip");
    const pad = argNum(args, "pad", 16);
    if (clipArg && /^\d+,\d+,\d+,\d+$/.test(clipArg)) {
      const [x, y, w, h] = clipArg.split(",").map(Number);
      clip = { x, y, w, h };
    } else if (clipArg) {
      const box = await page.locator(clipArg).first().boundingBox();
      if (!box) throw new Error(`--clip ${clipArg}: not visible before the trigger`);
      const vp = page.viewportSize()!;
      const x = Math.max(0, Math.floor(box.x - pad));
      const y = Math.max(0, Math.floor(box.y - pad));
      clip = { x, y, w: Math.min(vp.width - x, Math.ceil(box.width + pad * 2)), h: Math.min(vp.height - y, Math.ceil(box.height + pad * 2)) };
    }

    const rec = await startScreencast(page);
    await page.waitForTimeout(150);
    const before = await readProbe(page);
    await page.evaluate("window.__polish && window.__polish.startRaf()");
    const nodeT0 = Date.now();
    await trigger(page);
    await page.waitForTimeout(duration + 100);
    await page.evaluate("window.__polish && (window.__polish.rafOn = false)");
    const frames = await rec.stop();
    const raw = await readProbe(page);
    if (!raw || !before) throw new Error("probe missing; the trigger navigated away? Strips need a same-document trigger.");

    // t0: the trigger's own input event if it made one, else the Node clock.
    const newInput = raw.input.slice(before.input.length).find((i) => i.type === "pointerdown" || i.type === "keydown");
    const t0 = newInput ? raw.timeOrigin + newInput.t : nodeT0;
    const ticks: number[] = [];
    for (let t = 0; t <= duration; t += interval) ticks.push(t);
    const tiles = ticks.map((t) => {
      const f = frameAt(frames, t0 + t) ?? frames[0];
      return { data: f.data, label: `+${t}ms` };
    });
    const scale = argNum(args, "scale", clip ? 1 : 0.5);
    const columns = argNum(args, "columns", Math.min(13, tiles.length));
    const png = await composeStrip(browser, tiles, {
      columns,
      clip,
      scale,
      title: `${name}  ${route}  ${stateLabel(s)}  every ${interval}ms`,
    });

    const winStart = t0 - raw.timeOrigin;
    const loaf = raw.loaf.filter((l) => l.t + l.duration >= winStart && l.t <= winStart + duration);
    const rafs = (await page.evaluate("window.__polish ? window.__polish.raf.slice() : []")) as number[];
    const dropped = rafs.reduce((a, d) => a + (d > 25 ? Math.round(d / 16.7) - 1 : 0), 0);
    const inWindow = frames.filter((f) => f.ts >= t0 && f.ts <= t0 + duration);
    const shifts = raw.shifts.filter((x) => x.t >= winStart && x.t <= winStart + duration);

    fs.mkdirSync(outDir, { recursive: true });
    const pngPath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(pngPath, png);
    const jsonPath = writeJson(path.join(outDir, `${name}.json`), {
      route,
      state: stateLabel(s),
      trigger: click ? `click ${click}` : hover ? `hover ${hover}` : press ? `press ${press}` : `module ${trigFile}`,
      t0Source: newInput ? newInput.type : "node-clock",
      duration,
      interval,
      clip,
      screencast: {
        framesInWindow: inWindow.length,
        maxGapMs: round(Math.max(0, ...inWindow.slice(1).map((f, i) => f.ts - inWindow[i].ts)), 1),
      },
      raf: {
        frames: rafs.length,
        medianMs: rafs.length ? [...rafs].sort((a, b) => a - b)[Math.floor(rafs.length / 2)] : null,
        maxMs: rafs.length ? Math.max(...rafs) : null,
        dropped,
      },
      longAnimationFrames: loaf,
      layoutShifts: shifts,
      png: rel(pngPath),
    });
    console.log(`[strip] ${rel(pngPath)}  (${ticks.length} tiles, ${inWindow.length} frames in window, ${dropped} dropped, ${loaf.length} long frames)`);
    console.log(`[strip] ${rel(jsonPath)}`);
    await ctx.close();
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
