// ---------------------------------------------------------------------------
// card-strip: one small frame strip per card play (Tier C, docs/polish-pass
// F228). Opens the single-card stage of the dev gallery (/dev/plays?id=...,
// see src/app/dev/plays/stageParams.ts for the URL contract), plays the card
// on the real Board, records a CDP screencast, and writes per card:
//
//   <out>/<name>.png    N frames spread over the play, clipped to the board
//                       and downscaled (default 8 tiles at 160px), palette
//                       compressed so a strip stays well under 150 KB
//   <out>/<name>.json   the stage's own report (drive, art, anchor, source,
//                       cast square, targets), the measured duration, rAF
//                       intervals, dropped frames and every long animation
//                       frame inside the window, plus the page URL to replay
//                       it by hand
//
// Usage (always through heavy.sh: this is a Playwright run):
//
//   scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/card-strip.ts \
//     --ids fm_eclipse_crown,world_lock --out docs/polish-pass/evidence/TC-god/before
//
// Cards
//   --ids a,b,c          card ids (required unless --spec or --ids-file)
//   --ids-file FILE      one id per line (# comments allowed)
//   --module godPlays    every live card whose art is in these play modules
//                        (comma list; "core" = the SIGNATURES table), tier 10
//                        first; narrow with --tier 8,7 and page with
//                        --limit N --offset N
//   --list               print the selected ids (id, tier, kind, category,
//                        module) and exit without capturing
//   --spec FILE          JSON array of per-card objects: { "id", "sq", "target",
//                        "side", "view", "drive", "event", "pos", "place", "n",
//                        "live", "inplace", "name" }; each overrides the flags
// Stage (same meaning as the URL parameters; applied to every card)
//   --sq e4              cast square (default: the engine's first pick, or
//                        none for a card with no targets, as live surfaces do)
//   --target e7,d7       target squares, preferred picks in order
//   --side w|b           caster (default w)     --view w|b  bottom colour
//   --drive auto|engine|stage   (default auto: engine when the card can be
//                        used here, else a synthetic diff; the JSON says which)
//   --event play|grant   grant: the card is acquired instead of used (the
//                        draft-pick entrance beat; an instant also plays)
//   --pos PRESET         opening | sparse-midgame | bare-kings | promotion-race
//                        (unset: opening, and an activated card with no use
//                        there tries the other presets before a synthetic diff)
//   --place wQd4,-e2     piece edits after the preset
//   --n 3                synthetic drive: default victim count
//   --live               send what live surfaces send today (no sq, no caster)
//   --inplace            update the sandbox in place, as the local bot game
//                        does, instead of cloning it as an online update does
//   --level 0..4         effects dial (default leaves it at Normal)
// Speed (lists run every combination; names get a suffix when there is more
// than one, e.g. world_lock.fast-fx0.5.png)
//   --anim full,fast     html[data-anim] (default full)
//   --fx 0.5,1,2         --fx-dur multiplier (default 1)
// Capture
//   --frames 8           tiles per strip        --tile 160  tile width in px
//   --window MS          capture window after the play (default 3600 x fx, at
//                        least 2000); the strip spans the measured duration
//   --size 480           board width in px on the page
//   --out DIR            default e2e/__screens__/polish/card-strips (gitignored)
//   --auth guest         session for the page (default guest when seeded, so a
//                        run does not mint a new guest per card)
//   --off                also verify data-anim off: plays the card again with
//                        animations off and writes <name>.off.png with four
//                        tiles (full end, off +400ms, off +3000ms, off end;
//                        changed regions outlined) and an "off" block in the
//                        JSON. Pass means off reaches its end state at once
//                        (+400ms vs +3000ms under 1% changed: nothing pops in
//                        late or sits hidden in a delay) and the resting board
//                        matches the full run's (under 2%; the regions say
//                        what differs). The anim-off text fallback is up in
//                        both early samples and gone by the end, by design
//   --off-only           run only the off check
//   --sheet NAME         also write <out>/NAME.sheet.png: one tile per card
//                        of this run, six to a row, each at its most
//                        card-specific moment (of the tiles where the card
//                        draws at least half its peak, the one furthest from
//                        what the other cards show then). Two cards whose
//                        tiles read the same are the generic pairs the owner
//                        directive asks to split. Also writes
//                        NAME.similar.json: every pair of cards ranked by how
//                        alike their strips look, and a genericness ranking
//                        (a triage heuristic, the strips decide)
//                        Per card it also leaves <name>.strike.png,
//                        <name>.tiles.png and <name>.look.json (with per-tile
//                        energy), so batches can be ranked together:
//   --sheet-from A,B --sheet NAME --out DIR   rebuild the sheet and ranking
//                        over every card with sidecars in those folders (no
//                        dev server needed)
// Compare (no browser, no server)
//   --compare A,B --out DIR   for every strip in both folders, write
//                        DIR/<name>.vs.png with A's strip above B's (before
//                        above after)
//
// Duration: "visualMs" is the time from the play commit until the board last
// changed with respect to its settled end state (sampled screencast frames,
// clipped to the board). "cssEndMs" is the latest end of any finite CSS
// animation the play started; when it runs past the window the window is
// stretched to cover it (up to twice). The strip spans visualMs when the
// board settled inside the window, else the window, with tiles spaced denser
// at the start so the tell gets its own tile.
//
// Needs the shared dev server on http://localhost:3000 (POLISH_BASE to
// override). It never starts one.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import { argNum, argStr, launch, parseArgs, rel, round, SCRATCH_DIR, waitForServer, warmRoutes, writeJson } from "./lib/common";
import { composeStrip, diffImages, type DiffRegion } from "./lib/compose";
import { readProbe, type Rect } from "./lib/probe";
import { frameAt, startScreencast, type Frame } from "./lib/screencast";
import { authFile, navTimeout, openCell, type Auth, type State } from "./lib/states";
import { parsePlace, sqFromName, stageQuery, type StageParams } from "../../src/app/dev/plays/stageParams";
import { BUFF_BY_ID } from "../../src/engine/buffs/library";
import { isRetired } from "../../src/engine/retired";
import { CARD_TO_MODULE } from "../../src/components/effects/sigPlugins";

type CardSpec = {
  id: string;
  name?: string;
  sq?: string;
  target?: string;
  side?: "w" | "b";
  view?: "w" | "b";
  drive?: "auto" | "engine" | "stage";
  event?: "play" | "grant";
  pos?: string;
  place?: string;
  n?: number;
  live?: boolean;
  inplace?: boolean;
};

type Combo = { anim: "full" | "fast" | "off"; fx: number };

type StageInfo = Record<string, unknown> & { tier?: number; drive?: string; castSq?: string | null; targets?: string[] };

type Capture = {
  ok: boolean;
  error?: string;
  url: string;
  info: StageInfo | null;
  clip?: Rect;
  t0?: number;
  frames?: Frame[];
  endFrame?: Frame;
  json?: Record<string, unknown>;
};

// ---------- in-page sources (plain strings: see lib/common.ts) ----------

/** Track every finite CSS animation the play starts, anywhere in the page. */
const TRACK_START = String.raw`(() => {
  var T = { maxEnd: 0, infinite: 0, seen: 0, from: performance.now() - 30 };
  var seen = new WeakSet();
  function scan() {
    var list = document.getAnimations();
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (a.startTime == null || a.startTime < T.from) continue;
      var t = a.effect ? a.effect.getComputedTiming() : null;
      if (!t) continue;
      if (!seen.has(a)) {
        seen.add(a);
        T.seen++;
        if (t.endTime === Infinity) T.infinite++;
      }
      if (t.endTime !== Infinity) {
        var end = a.startTime + t.endTime;
        if (end > T.maxEnd) T.maxEnd = end;
      }
    }
  }
  T.timer = setInterval(scan, 40);
  T.stop = function () {
    clearInterval(T.timer);
    scan();
    return {
      maxEndEpoch: T.maxEnd ? performance.timeOrigin + T.maxEnd : null,
      infinite: T.infinite,
      seen: T.seen,
    };
  };
  window.__cardTrack = T;
})()`;

/** Decode frames, crop to the clip, reduce each to a 48x48 grey thumbnail. */
const THUMBS = String.raw`async (o) => {
  function load(d) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error("decode failed")); };
      img.src = "data:image/jpeg;base64," + d;
    });
  }
  var S = o.size || 48;
  var c = document.createElement("canvas");
  c.width = S; c.height = S;
  var g = c.getContext("2d", { willReadFrequently: true });
  var out = [];
  for (var i = 0; i < o.frames.length; i++) {
    var img = await load(o.frames[i]);
    g.drawImage(img, o.clip.x, o.clip.y, o.clip.w, o.clip.h, 0, 0, S, S);
    var px = g.getImageData(0, 0, S, S).data;
    var grey = new Array(S * S);
    for (var k = 0; k < S * S; k++) grey[k] = (px[k * 4] * 3 + px[k * 4 + 1] * 6 + px[k * 4 + 2]) / 10;
    out.push(grey);
  }
  return out;
}`;

/** Crop one JPEG frame to the clip, returned as PNG base64. */
const CROP = String.raw`async (o) => {
  var img = await new Promise(function (res, rej) {
    var im = new Image();
    im.onload = function () { res(im); };
    im.onerror = function () { rej(new Error("decode failed")); };
    im.src = "data:image/jpeg;base64," + o.data;
  });
  var c = document.createElement("canvas");
  c.width = o.clip.w; c.height = o.clip.h;
  c.getContext("2d").drawImage(img, o.clip.x, o.clip.y, o.clip.w, o.clip.h, 0, 0, o.clip.w, o.clip.h);
  return c.toDataURL("image/png").split(",")[1];
}`;

// ---------- helpers ----------

function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Core SIGNATURES ids, read from the source (BoardEffects pulls in React and
 *  CSS, which a Node script cannot import). */
function coreSignatureIds(): string[] {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "src", "components", "effects", "BoardEffects.tsx"), "utf8");
  const start = src.indexOf("export const SIGNATURES");
  const end = src.indexOf("\n};", start);
  const body = src.slice(start, end);
  const ids: string[] = [];
  for (const m of body.matchAll(/^\s{2}"?([a-z0-9_]+)"?\s*:\s*\{/gm)) ids.push(m[1]);
  return ids;
}

function moduleOf(id: string, core: Set<string>): string {
  return core.has(id) ? "core" : (CARD_TO_MODULE[id] ?? "gen");
}

/** --module / --tier / --limit / --offset: live cards of the named modules,
 *  highest tier first (the draft offers a T8 card about 20 times as often as a
 *  T3 one, so this is the frequency order the Tier C lane works in). */
function selectByModule(args: ReturnType<typeof parseArgs>): CardSpec[] {
  const mods = new Set(list(args.values.get("module")));
  if (!mods.size) return [];
  const core = new Set(coreSignatureIds());
  const tiers = new Set(list(args.values.get("tier")).map(Number));
  const ids = [...new Set([...Object.keys(CARD_TO_MODULE), ...core])].filter((id) => {
    const def = BUFF_BY_ID[id];
    if (!def || !def.implemented || isRetired(id)) return false;
    if (tiers.size && !tiers.has(def.tier)) return false;
    return mods.has(moduleOf(id, core));
  });
  ids.sort((a, b) => BUFF_BY_ID[b].tier - BUFF_BY_ID[a].tier || a.localeCompare(b));
  const offset = argNum(args, "offset", 0);
  const limit = argNum(args, "limit", ids.length);
  return ids.slice(offset, offset + limit).map((id) => ({ id }));
}

function loadSpecs(args: ReturnType<typeof parseArgs>): CardSpec[] {
  const specs: CardSpec[] = [...selectByModule(args)];
  for (const id of list(args.values.get("ids"))) specs.push({ id });
  const idsFile = args.values.get("ids-file");
  if (idsFile) {
    for (const line of fs.readFileSync(idsFile, "utf8").split("\n")) {
      const id = line.replace(/#.*/, "").trim();
      if (id) specs.push({ id });
    }
  }
  const specFile = args.values.get("spec");
  if (specFile) specs.push(...(JSON.parse(fs.readFileSync(specFile, "utf8")) as CardSpec[]));
  return specs;
}

let benchPage: Promise<Page> | null = null;
function bench(browser: Browser): Promise<Page> {
  benchPage ??= browser.newPage().then(async (p) => {
    await p.setContent("<!doctype html><title>card-strip bench</title>");
    return p;
  });
  return benchPage;
}

async function thumbs(browser: Browser, frames: Frame[], clip: Rect, size = 48): Promise<number[][]> {
  const page = await bench(browser);
  return (await page.evaluate(`(${THUMBS})(${JSON.stringify({ frames: frames.map((f) => f.data), clip, size })})`)) as number[][];
}

async function crop(browser: Browser, frame: Frame, clip: Rect): Promise<string> {
  const page = await bench(browser);
  return (await page.evaluate(`(${CROP})(${JSON.stringify({ data: frame.data, clip })})`)) as string;
}

function meanDiff(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

/** Palette-compress a strip PNG (sharp ships with Next); raw PNG if absent. */
async function shrink(png: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(png).png({ palette: true, colours: 96, effort: 8, compressionLevel: 9 }).toBuffer();
  } catch {
    return png;
  }
}

function stageParams(spec: CardSpec, combo: Combo, size: number, level: number | null): Partial<StageParams> & { id: string } {
  const side = spec.side ?? "w";
  return {
    id: spec.id,
    sq: sqFromName(spec.sq),
    targets: list(spec.target)
      .map((s) => sqFromName(s))
      .filter((s): s is number => s != null),
    side,
    view: spec.view ?? side,
    anim: combo.anim === "full" ? "normal" : combo.anim,
    fx: combo.fx,
    level,
    drive: spec.drive ?? "auto",
    event: spec.event ?? "play",
    pos: spec.pos ?? null,
    place: parsePlace(spec.place),
    n: spec.n ?? 3,
    live: !!spec.live,
    inplace: !!spec.inplace,
    size,
    bare: true,
  };
}

// ---------- one capture ----------

async function capture(
  browser: Browser,
  spec: CardSpec,
  combo: Combo,
  opt: { size: number; level: number | null; windowMs: number; auth: Auth },
): Promise<Capture> {
  const params = stageParams(spec, combo, opt.size, opt.level);
  const url = `/dev/plays?${stageQuery(params)}`;
  const s: State = { viewport: "1280x800", theme: "dark", anim: combo.anim, auth: opt.auth, net: "normal" };
  const { ctx, page } = await openCell(browser, s, { probe: true });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeout("normal") * 2 });
    await page.waitForFunction("window.__cardStage && (window.__cardStage.ready || !!window.__cardStage.error)", null, {
      timeout: 240_000,
      polling: 250,
    });
    const info = (await page.evaluate("window.__cardStage.info")) as StageInfo | null;
    const err = (await page.evaluate("window.__cardStage.error")) as string | null;
    if (err) return { ok: false, error: err, url, info };
    // Let the first board paint, fonts and piece sprites settle.
    await page.waitForTimeout(800);
    const box = await page.locator("[data-card-stage]").first().boundingBox();
    if (!box) return { ok: false, error: "stage not visible", url, info };
    const vp = page.viewportSize()!;
    const pad = 2;
    const x = Math.max(0, Math.floor(box.x - pad));
    const y = Math.max(0, Math.floor(box.y - pad));
    const clip: Rect = {
      x,
      y,
      w: Math.min(vp.width - x, Math.ceil(box.width + pad * 2)),
      h: Math.min(vp.height - y, Math.ceil(box.height + pad * 2)),
    };

    const rec = await startScreencast(page);
    await page.waitForTimeout(200);
    await page.evaluate("window.__polish && window.__polish.startRaf()");
    await page.evaluate(TRACK_START);
    // play() resolves with the commit time, or rejects with the stage's error;
    // the race keeps a stage that never commits from hanging the run.
    const t0 = (await page.evaluate(
      "Promise.race([window.__cardStage.play(), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('play() did not commit within 20s')); }, 20000); })])",
    )) as number;
    await page.waitForTimeout(opt.windowMs);
    // A play whose finite CSS runs past the window gets the window stretched
    // to cover it (capped at twice the window), so a strip never cuts off a
    // settle that is still on screen.
    let windowMs = opt.windowMs;
    const pending = (await page.evaluate(
      "(() => { var T = window.__cardTrack; return T && T.maxEnd ? performance.timeOrigin + T.maxEnd : 0; })()",
    )) as number;
    if (pending > t0 + windowMs) {
      const extra = Math.min(opt.windowMs, Math.ceil(pending - (t0 + windowMs)) + 250);
      await page.waitForTimeout(extra);
      windowMs += extra;
    }
    await page.evaluate("window.__polish && (window.__polish.rafOn = false)");
    const track = (await page.evaluate("window.__cardTrack.stop()")) as { maxEndEpoch: number | null; infinite: number; seen: number };
    const frames = await rec.stop();
    const raw = await readProbe(page);
    const rafs = (await page.evaluate("window.__polish ? window.__polish.raf.slice() : []")) as number[];
    const lateErr = (await page.evaluate("window.__cardStage && window.__cardStage.error")) as string | null;

    // Frames from the one on screen at t0 to the end of the window.
    const startFrame = frameAt(frames, t0) ?? frames[0];
    const inWindow = frames.filter((f) => f.ts >= startFrame.ts && f.ts <= t0 + windowMs);
    const endFrame = inWindow[inWindow.length - 1] ?? startFrame;

    // Visual duration: last frame that still differs from the settled end.
    let visualMs = 0;
    let settled = true;
    if (inWindow.length > 1) {
      const th = await thumbs(browser, inWindow, clip);
      const end = th[th.length - 1];
      let last = -1;
      for (let i = 0; i < th.length - 1; i++) if (meanDiff(th[i], end) > 1.2) last = i;
      visualMs = last >= 0 ? Math.max(0, inWindow[last + 1].ts - t0) : 0;
      // Still changing in the last 10% of the window: the board never settled
      // (an ambient loop, or a play longer than the window).
      const tailFrom = t0 + windowMs * 0.9;
      const tail = inWindow.map((f, i) => ({ f, i })).filter((e) => e.f.ts >= tailFrom);
      if (tail.length > 1 && tail.some((e) => meanDiff(th[e.i], end) > 1.2)) settled = false;
    }
    const cssEndMs = track.maxEndEpoch ? Math.max(0, Math.round(track.maxEndEpoch - t0)) : null;

    const loaf = raw
      ? raw.loaf.filter((l) => raw.timeOrigin + l.t + l.duration >= t0 && raw.timeOrigin + l.t <= t0 + windowMs)
      : [];
    const dropped = rafs.reduce((a, d) => a + (d > 25 ? Math.round(d / 16.7) - 1 : 0), 0);
    const sorted = [...rafs].sort((a, b) => a - b);

    return {
      ok: true,
      error: lateErr ?? undefined,
      url,
      info,
      clip,
      t0,
      frames: inWindow,
      endFrame,
      json: {
        durationMs: {
          visualMs: Math.round(visualMs),
          cssEndMs,
          settled,
          windowMs,
          cssAnimations: track.seen,
          infiniteAnimations: track.infinite,
        },
        screencast: {
          framesInWindow: inWindow.length,
          maxGapMs: round(Math.max(0, ...inWindow.slice(1).map((f, i) => f.ts - inWindow[i].ts)), 1),
        },
        raf: {
          frames: rafs.length,
          medianMs: sorted.length ? round(sorted[Math.floor(sorted.length / 2)], 1) : null,
          maxMs: sorted.length ? round(sorted[sorted.length - 1], 1) : null,
          dropped,
        },
        longAnimationFrames: {
          count: loaf.length,
          worstMs: loaf.length ? Math.max(...loaf.map((l) => l.duration)) : 0,
          totalBlockingMs: loaf.reduce((a, l) => a + l.blocking, 0),
          entries: loaf.map((l) => ({
            atMs: Math.round((raw?.timeOrigin ?? 0) + l.t - t0),
            duration: l.duration,
            blocking: l.blocking,
            scripts: l.scripts.slice(0, 3),
          })),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message.split("\n")[0], url, info: null };
  } finally {
    await ctx.close();
  }
}

/** Tile times over the span, denser at the start (exponent 1.35) so the tell
 *  (the first 300ms, per the animation brief) always gets a tile of its own:
 *  with 8 tiles over 2.8s the first two land near 200ms and 500ms. */
/** Off check samples: an early frame, a held frame while the anim-off text
 *  fallback is still up, and the resting end after it has gone. The early
 *  sample sits a few frames in rather than at 0 because a dev build under load
 *  can take a couple of hundred ms to commit the play. */
const OFF_EARLY_MS = 400;
const OFF_HELD_MS = 3000;
const OFF_WINDOW_MS = 4400;

/** The shared dev server restarts now and then (the supervisor revives it),
 *  and another agent's edit can hot-reload the page mid-capture. Either way
 *  the capture waits for the server and tries once more. */
async function captureRetry(...a: Parameters<typeof capture>): Promise<Capture> {
  const first = await capture(...a);
  if (first.ok || !/net::ERR_|Target closed|ECONNREFUSED|Navigation timeout|Execution context was destroyed|waitForFunction: Timeout/i.test(first.error ?? "")) return first;
  console.log(`[card-strip] ${a[1].id}: ${first.error}; waiting for the dev server and retrying once`);
  await waitForServer();
  await warmRoutes(["/dev/plays"]);
  return capture(...a);
}

function tileTimes(frames: number, spanMs: number): number[] {
  if (frames <= 1) return [0];
  return Array.from({ length: frames }, (_, i) => Math.round(spanMs * Math.pow(i / (frames - 1), 1.35)));
}

function title(spec: CardSpec, info: StageInfo | null, combo: Combo): string {
  const tier = info?.tier != null ? ` T${info.tier}` : "";
  const drive = info?.drive ? ` ${info.drive}` : "";
  const sq = info?.castSq ? ` @${info.castSq}` : "";
  const tg = info?.targets && info.targets.length ? ` > ${info.targets.join(" ")}` : "";
  return `${spec.id}${tier}${drive}${sq}${tg} ${spec.side ?? "w"} ${combo.anim} fx${combo.fx}`;
}

// ---------- compare and sheet ----------

/** Stack before-over-after for every strip name present in both folders. */
async function compareDirs(a: string, b: string, out: string): Promise<void> {
  const sharp = (await import("sharp")).default;
  fs.mkdirSync(out, { recursive: true });
  const strips = (d: string) =>
    new Set(fs.readdirSync(d).filter((f) => f.endsWith(".png") && !/\.(off|vs|sheet)\.png$/.test(f)));
  const inB = strips(b);
  let n = 0;
  for (const f of strips(a)) {
    if (!inB.has(f)) continue;
    const top = await sharp(path.join(a, f)).png().toBuffer({ resolveWithObject: true });
    const bot = await sharp(path.join(b, f)).png().toBuffer({ resolveWithObject: true });
    const width = Math.max(top.info.width, bot.info.width);
    const gap = 6;
    const png = await sharp({
      create: { width, height: top.info.height + gap + bot.info.height, channels: 4, background: "#15171a" },
    })
      .composite([
        { input: top.data, top: 0, left: 0 },
        { input: bot.data, top: top.info.height + gap, left: 0 },
      ])
      .png({ palette: true, colours: 96, effort: 8, compressionLevel: 9 })
      .toBuffer();
    const outPath = path.join(out, f.replace(/\.png$/, ".vs.png"));
    fs.writeFileSync(outPath, png);
    n++;
    console.log(`[card-strip] ${rel(outPath)} (${Math.round(png.length / 1024)} KB)`);
  }
  console.log(`[card-strip] ${n} comparison(s) written`);
}

/** Zero mean, unit spread: a board-wide dim (the tell) scales every pixel
 *  alike and mostly cancels out, while scene art that draws shapes does not. */
function zscore(a: number[]): number[] {
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length) || 1;
  return a.map((v) => ((v - mean) / sd) * 32);
}

/** The tile whose STRUCTURE differs most from the first one: the play at its
 *  strike rather than at its dim. */
async function peakTile(browser: Browser, tiles: { data: string; label: string }[], clip: Rect): Promise<number> {
  const th = (
    await thumbs(
      browser,
      tiles.map((t) => ({ data: t.data, ts: 0, width: 0, height: 0 })),
      clip,
    )
  ).map(zscore);
  let best = 0;
  let bestD = -1;
  for (let i = 1; i < th.length; i++) {
    const d = meanDiff(th[i], th[0]);
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * A card's look as one vector: for every tile after the first, what the play
 * drew on top of the resting board (tile minus the pre-play tile, 24x24 grey,
 * standardised so a board-wide dim cancels), concatenated in time order. Two
 * cards on the same template produce near-parallel vectors. `energy` is the
 * raw (un-standardised) mean absolute difference of each of those tiles:
 * standardising scales a near-empty tile (the first one after the reference,
 * the settled tail) up to full-size noise, so every consumer weights a tile by
 * how much the card actually drew there (see weighted()).
 */
async function lookVector(browser: Browser, tiles: { data: string }[], clip: Rect): Promise<{ v: number[]; energy: number[] }> {
  const th = await thumbs(
    browser,
    tiles.map((t) => ({ data: t.data, ts: 0, width: 0, height: 0 })),
    clip,
    24,
  );
  const v: number[] = [];
  const energy: number[] = [];
  for (let i = 1; i < th.length; i++) {
    const d = th[i].map((x, k) => x - th[0][k]);
    energy.push(d.reduce((a, x) => a + Math.abs(x), 0) / d.length);
    v.push(...zscore(d));
  }
  return { v, energy };
}

/** Pixels per look-vector tile (24x24 grey). */
const LOOK_PER = 24 * 24;

/** Per-tile energy recomputed from a tiles sprite, for sidecars written
 *  before look.json carried `energy`. Same measure as lookVector on the
 *  board crop the sprite already holds. */
async function spriteEnergy(sprite: string, nTiles: number): Promise<number[] | null> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(sprite).metadata();
  const h = meta.height ?? 0;
  if (!h || (meta.width ?? 0) < (nTiles + 1) * SHEET_TILE) return null;
  const grey = async (i: number) =>
    Array.from(
      await sharp(sprite)
        .extract({ left: i * SHEET_TILE, top: 0, width: SHEET_TILE, height: h })
        .greyscale()
        .resize(24, 24, { fit: "fill" })
        .raw()
        .toBuffer(),
    );
  const ref = await grey(0);
  const out: number[] = [];
  for (let i = 1; i <= nTiles; i++) {
    const g = await grey(i);
    out.push(g.reduce((a, x, k) => a + Math.abs(x - ref[k]), 0) / g.length);
  }
  return out;
}

/** A look vector with each tile scaled by its energy relative to the card's
 *  own peak, so tiles where the card drew almost nothing contribute almost
 *  nothing (instead of standardised noise) to the sheet pick, the look-alike
 *  pairs and the genericness ranking. */
function weighted(v: number[], energy: number[]): number[] {
  const peak = Math.max(...energy) || 1;
  return v.map((x, i) => x * ((energy[Math.floor(i / LOOK_PER)] ?? 0) / peak));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Per-card sheet sidecars: the strike tile (board crop, 200px wide), every
 *  tile as one sprite, and the look vector with its per-tile energy, so a
 *  sheet can be rebuilt across several runs (--sheet-from) and cards captured
 *  in separate batches can still be ranked together. */
async function writeLook(
  browser: Browser,
  dir: string,
  l: {
    name: string;
    id: string;
    tier: number;
    label: string;
    strike: number;
    clip: Rect;
    v: number[];
    energy: number[];
    tiles: { data: string; label: string }[];
  },
): Promise<void> {
  const sharp = (await import("sharp")).default;
  const small = async (data: string) =>
    sharp(Buffer.from(await crop(browser, { data, ts: 0, width: 0, height: 0 }, l.clip), "base64"))
      .resize({ width: SHEET_TILE })
      .png()
      .toBuffer({ resolveWithObject: true });
  // Every tile side by side, so a sheet built later can pick the moment where
  // this card differs most from all the others (see writeSheet).
  const row = await Promise.all(l.tiles.map((t) => small(t.data)));
  fs.writeFileSync(
    path.join(dir, `${l.name}.strike.png`),
    await sharp(row[l.strike].data).png({ palette: true, colours: 96, effort: 8 }).toBuffer(),
  );
  const h = row[0].info.height;
  const sprite = await sharp({ create: { width: SHEET_TILE * row.length, height: h, channels: 4, background: "#15171a" } })
    .composite(row.map((r, i) => ({ input: r.data, top: 0, left: i * SHEET_TILE })))
    .png({ palette: true, colours: 96, effort: 8 })
    .toBuffer();
  fs.writeFileSync(path.join(dir, `${l.name}.tiles.png`), sprite);
  writeJson(path.join(dir, `${l.name}.look.json`), {
    name: l.name,
    id: l.id,
    tier: l.tier,
    label: l.label,
    tileLabels: l.tiles.map((t) => t.label),
    energy: l.energy.map((x) => Math.round(x * 100) / 100),
    v: l.v.map((x) => Math.round(x * 10) / 10),
  });
}

/** Sheet tile width in px. */
const SHEET_TILE = 200;

/** A tile is a sheet candidate only when the card drew at least this share of
 *  its own peak energy there (below it the standardised diff is mostly noise). */
const SHEET_MIN_ENERGY = 0.5;

/** Contact sheet plus look-alike ranking over every card with sidecars in
 *  `dirs` (only the names in `only` when given), highest tier first. */
async function writeSheet(browser: Browser, name: string, dirs: string[], out: string, only?: Set<string>): Promise<void> {
  type Look = {
    name: string;
    tier: number;
    label: string;
    tileLabels?: string[];
    v: number[];
    energy?: number[];
    w: number[];
    png: Buffer;
    sprite: string | null;
    pick: string;
  };
  const looks: Look[] = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".look.json"))) {
      const l = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")) as Omit<Look, "png" | "sprite" | "w" | "pick">;
      if (only && !only.has(l.name)) continue;
      const strike = path.join(d, `${l.name}.strike.png`);
      if (!fs.existsSync(strike)) continue;
      const sprite = path.join(d, `${l.name}.tiles.png`);
      const hasSprite = fs.existsSync(sprite);
      const nTiles = l.v.length / LOOK_PER;
      const energy = l.energy ?? (hasSprite ? await spriteEnergy(sprite, nTiles) : null) ?? undefined;
      looks.push({
        ...l,
        energy,
        // No energy at all (an old sidecar without a sprite): unweighted.
        w: energy ? weighted(l.v, energy) : l.v,
        png: fs.readFileSync(strike),
        sprite: hasSprite ? sprite : null,
        pick: "strike (peakTile)",
      });
    }
  }
  if (!looks.length) {
    console.log(`[card-strip] no sheet sidecars (*.look.json) in ${dirs.map(rel).join(", ")}`);
    return;
  }
  looks.sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
  // The sheet shows each card at its most card-specific moment that the card
  // actually draws: among the tiles where its own energy reaches
  // SHEET_MIN_ENERGY of its peak, the one whose energy-weighted look is
  // furthest from the average of the OTHER cards at the same tile. What every
  // card shares (the wrapper's dim, ring and beam) cancels out; near-empty
  // tiles (just after the reference, the settled tail) cannot win, because
  // their weight is small and they fail the energy gate. A card with no
  // energy data keeps its strike tile.
  const nTiles = looks[0].v.length / LOOK_PER;
  const sameLen = looks.filter((l) => l.v.length === looks[0].v.length);
  const sum = Array.from({ length: nTiles * LOOK_PER }, (_, k) => sameLen.reduce((a, l) => a + l.w[k], 0));
  const sharp = (await import("sharp")).default;
  for (const l of looks) {
    if (!l.sprite || !l.energy || l.v.length !== looks[0].v.length || !l.tileLabels) continue;
    const peak = Math.max(...l.energy);
    const others = sameLen.length - 1;
    let best = l.energy.indexOf(peak);
    let bestE = -1;
    for (let t = 0; t < nTiles; t++) {
      if (l.energy[t] < SHEET_MIN_ENERGY * peak) continue;
      let e = 0;
      for (let k = t * LOOK_PER; k < (t + 1) * LOOK_PER; k++) {
        const mean = others ? (sum[k] - l.w[k]) / others : 0;
        e += (l.w[k] - mean) ** 2;
      }
      if (e > bestE) {
        bestE = e;
        best = t;
      }
    }
    // Look vectors start at the second tile (the first is the reference).
    const tileIndex = best + 1;
    const meta = await sharp(l.sprite).metadata();
    if ((meta.width ?? 0) < (tileIndex + 1) * SHEET_TILE) continue;
    l.png = await sharp(l.sprite).extract({ left: tileIndex * SHEET_TILE, top: 0, width: SHEET_TILE, height: meta.height ?? SHEET_TILE }).png().toBuffer();
    l.label = `${l.name} T${l.tier} ${l.tileLabels[tileIndex] ?? ""}`;
    l.pick = `${l.tileLabels[tileIndex] ?? tileIndex} (energy ${round(l.energy[best] / (peak || 1), 2)} of peak)`;
  }
  // composeStrip sizes every tile from the first, so a batch captured at
  // another --size or board clip is letterboxed to that size, not stretched.
  const first = await sharp(looks[0].png).metadata();
  const tw = first.width ?? SHEET_TILE;
  const tht = first.height ?? SHEET_TILE;
  for (const l of looks) {
    const m = await sharp(l.png).metadata();
    if (m.width === tw && m.height === tht) continue;
    console.log(`[card-strip] ${l.name}: tile ${m.width}x${m.height} letterboxed to ${tw}x${tht}`);
    l.png = await sharp(l.png).resize(tw, tht, { fit: "contain", background: "#15171a" }).png().toBuffer();
  }
  fs.mkdirSync(out, { recursive: true });
  const png = await shrink(
    await composeStrip(
      browser,
      looks.map((l) => ({ data: l.png.toString("base64"), mime: "image/png" as const, label: l.label })),
      {
        columns: Math.min(6, looks.length),
        title: `${name}: each card at its most card-specific moment (of the tiles where it draws at least half its peak, the one furthest from what the other cards show then)`,
      },
    ),
  );
  const sheetPath = path.join(out, `${name}.sheet.png`);
  fs.writeFileSync(sheetPath, png);
  console.log(`[card-strip] ${rel(sheetPath)} (${looks.length} cards, ${Math.round(png.length / 1024)} KB)`);
  // Look-alike triage: every pair by how parallel their energy-weighted look
  // vectors are. A heuristic for where to look first, not a verdict: the
  // strips decide.
  const pairs: { a: string; b: string; similarity: number }[] = [];
  for (let i = 0; i < looks.length; i++)
    for (let j = i + 1; j < looks.length; j++)
      pairs.push({ a: looks[i].name, b: looks[j].name, similarity: round(cosine(looks[i].w, looks[j].w), 3) });
  pairs.sort((x, y) => y.similarity - x.similarity);
  const nearest = Object.fromEntries(
    looks.map((l) => {
      const best = pairs.find((q) => q.a === l.name || q.b === l.name);
      return [l.name, best ? { card: best.a === l.name ? best.b : best.a, similarity: best.similarity } : null];
    }),
  );
  // Genericness: how close each card's look is to the average look of every
  // OTHER card in the sheet (leave-one-out, so a card is not compared with
  // itself). What all cards share (the cast wrapper's dim, ring and beam, the
  // name banner) dominates that average, so a card whose own art adds little
  // sits near it: "could belong to another card".
  const dim = Math.min(...looks.map((l) => l.w.length));
  const total = Array.from({ length: dim }, (_, k) => looks.reduce((a, l) => a + l.w[k], 0));
  const generic = looks
    .map((l) => {
      const rest = total.map((x, k) => (looks.length > 1 ? (x - l.w[k]) / (looks.length - 1) : 0));
      return { card: l.name, tier: l.tier, closeness: round(cosine(l.w, rest), 3) };
    })
    .sort((a, b) => b.closeness - a.closeness);
  const simPath = writeJson(path.join(out, `${name}.similar.json`), {
    method:
      "cosine similarity of per-tile (tile minus pre-play tile) 24x24 grey thumbnails, standardised per tile and then weighted by the tile's raw energy over the card's peak (so near-empty tiles count for little); 1 = same look, near 0 = unrelated. Every tier 6+ bespoke card shares the cast wrapper's ring and beam (TC0-f), so expect a floor well above 0",
    cards: looks.length,
    sheetPicks: Object.fromEntries(looks.map((l) => [l.name, l.pick])),
    generic: {
      method: "cosine similarity of the card's weighted look vector to the mean weighted look of the other cards in this sheet (leave-one-out); highest = least card-specific",
      ranking: generic,
    },
    pairs: pairs.slice(0, 80),
    nearest,
  });
  console.log(`[card-strip] ${rel(simPath)}; most alike: ${pairs.slice(0, 5).map((q) => `${q.a}~${q.b} ${q.similarity}`).join(", ")}`);
  console.log(`[card-strip] least card-specific: ${generic.slice(0, 6).map((g) => `${g.card} ${g.closeness}`).join(", ")}`);
}

// ---------- main ----------

async function main() {
  const args = parseArgs();
  const cmp = list(args.values.get("compare"));
  if (cmp.length) {
    if (cmp.length !== 2) throw new Error("--compare takes two folders: --compare before,after --out DIR");
    await compareDirs(path.resolve(cmp[0]), path.resolve(cmp[1]), path.resolve(argStr(args, "out", cmp[1])));
    return;
  }
  const from = list(args.values.get("sheet-from"));
  if (from.length) {
    const name = args.values.get("sheet");
    if (!name) throw new Error("--sheet-from needs --sheet NAME");
    const browser = await launch();
    try {
      await writeSheet(browser, name, from.map((d) => path.resolve(d)), path.resolve(argStr(args, "out", from[0])));
    } finally {
      await browser.close();
    }
    return;
  }
  const specsIn = loadSpecs(args);
  if (!specsIn.length) throw new Error("give card ids: --ids a,b,c (or --module / --ids-file / --spec)");
  if (args.flags.has("list")) {
    const core = new Set(coreSignatureIds());
    for (const s of specsIn) {
      const d = BUFF_BY_ID[s.id];
      const tag = !d ? "UNKNOWN" : isRetired(s.id) ? "RETIRED" : "";
      console.log([s.id, d ? `T${d.tier}` : "", d?.kind ?? "", d?.category ?? "", moduleOf(s.id, core), tag].join("\t"));
    }
    return;
  }
  const shared: Omit<CardSpec, "id"> = {
    sq: args.values.get("sq"),
    target: args.values.get("target"),
    side: args.values.get("side") === "b" ? "b" : undefined,
    view: (["w", "b"] as const).find((c) => c === args.values.get("view")),
    drive: (["auto", "engine", "stage"] as const).find((d) => d === args.values.get("drive")),
    event: args.values.get("event") === "grant" ? "grant" : undefined,
    pos: args.values.get("pos"),
    place: args.values.get("place"),
    n: args.values.has("n") ? argNum(args, "n", 3) : undefined,
    live: args.flags.has("live") || undefined,
    inplace: args.flags.has("inplace") || undefined,
  };
  const specs = specsIn.map((s) => ({ ...shared, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) }) as CardSpec);
  const anims = list(argStr(args, "anim", "full")).map((a) => {
    if (a !== "full" && a !== "fast") throw new Error(`--anim ${a}: expected full or fast (use --off for the off check)`);
    return a as Combo["anim"];
  });
  const fxs = list(argStr(args, "fx", "1")).map((f) => Math.max(0.5, Math.min(2, Number(f) || 1)));
  const combos: Combo[] = anims.flatMap((anim) => fxs.map((fx) => ({ anim, fx })));
  const nFrames = Math.max(2, Math.min(16, argNum(args, "frames", 8)));
  const tile = Math.max(64, Math.min(480, argNum(args, "tile", 160)));
  const size = argNum(args, "size", 480);
  const levelArg = args.values.get("level");
  const level = levelArg != null && /^[0-4]$/.test(levelArg) ? Number(levelArg) : null;
  const offOnly = args.flags.has("off-only");
  const off = offOnly || args.flags.has("off");
  const outDir = path.resolve(argStr(args, "out", path.join(SCRATCH_DIR, "card-strips")));
  const authArg = argStr(args, "auth", fs.existsSync(authFile("guest")) ? "guest" : "signed-out") as Auth;
  const winFor = (fx: number) => Math.max(2000, argNum(args, "window", Math.round(3600 * fx)));
  const multi = combos.length > 1;

  await waitForServer();
  await warmRoutes(["/dev/plays"]);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  const sheetName = args.values.get("sheet");
  const sheetNames = new Set<string>();
  const summary: { id: string; png?: string; visualMs?: number; longFrames?: number; drive?: string; off?: string; error?: string }[] = [];
  try {
    for (const spec of specs) {
      const base = spec.name ?? `${spec.id}${spec.side === "b" ? ".b" : ""}`;
      let fullEnd: { frame: Frame; clip: Rect } | null = null;
      const row: (typeof summary)[number] = { id: spec.id };
      for (const combo of offOnly ? [{ anim: "full" as const, fx: fxs[0] }] : combos) {
        const cap = await captureRetry(browser, spec, combo, { size, level, windowMs: winFor(combo.fx), auth: authArg });
        const name = multi && !offOnly ? `${base}.${combo.anim}-fx${combo.fx}` : base;
        if (!cap.ok || !cap.frames || !cap.clip || cap.t0 == null) {
          writeJson(path.join(outDir, `${name}.json`), { id: spec.id, url: cap.url, error: cap.error, info: cap.info });
          console.log(`[card-strip] ${spec.id}: FAILED ${cap.error}`);
          row.error = cap.error;
          continue;
        }
        if (combo.anim === "full" && !fullEnd && cap.endFrame) fullEnd = { frame: cap.endFrame, clip: cap.clip };
        if (offOnly) continue;
        const dur = cap.json!.durationMs as { visualMs: number; settled: boolean; windowMs: number };
        const span = Math.max(600, dur.settled ? Math.min(dur.windowMs, dur.visualMs + 150) : dur.windowMs);
        const times = tileTimes(nFrames, span);
        const tiles = times.map((t) => ({ data: (frameAt(cap.frames!, cap.t0! + t) ?? cap.frames![0]).data, label: `+${t}ms` }));
        const png = await shrink(
          await composeStrip(browser, tiles, {
            columns: tiles.length,
            clip: cap.clip,
            scale: tile / cap.clip.w,
            title: title(spec, cap.info, combo),
          }),
        );
        const pngPath = path.join(outDir, `${name}.png`);
        fs.writeFileSync(pngPath, png);
        if (sheetName && combo === combos[0]) {
          const k = await peakTile(browser, tiles, cap.clip);
          const look = await lookVector(browser, tiles, cap.clip);
          await writeLook(browser, outDir, {
            name,
            id: spec.id,
            tier: Number(cap.info?.tier ?? 0),
            label: `${name} T${cap.info?.tier ?? "?"} ${tiles[k].label}`,
            strike: k,
            clip: cap.clip,
            ...look,
            tiles,
          });
          sheetNames.add(name);
        }
        writeJson(path.join(outDir, `${name}.json`), {
          id: spec.id,
          url: cap.url,
          anim: combo.anim,
          fx: combo.fx,
          info: cap.info,
          stageError: cap.error ?? null,
          ...cap.json,
          tiles: times,
          png: rel(pngPath),
          pngBytes: png.length,
        });
        const lf = cap.json!.longAnimationFrames as { count: number; worstMs: number };
        row.png = rel(pngPath);
        row.visualMs = dur.visualMs;
        row.longFrames = lf.count;
        row.drive = String(cap.info?.drive ?? "");
        console.log(
          `[card-strip] ${rel(pngPath)} (${Math.round(png.length / 1024)} KB) ${cap.info?.drive} visual ${dur.visualMs}ms${dur.settled ? "" : " (not settled)"}, ${lf.count} long frames (worst ${lf.worstMs}ms)`,
        );
      }

      if (off && fullEnd) {
        const combo: Combo = { anim: "off", fx: fxs[0] };
        // Long enough for the anim-off text fallback (CastTextFallback, a fixed
        // 3.6s) to leave, so the end frame is the true resting board.
        const cap = await captureRetry(browser, spec, combo, { size, level, windowMs: Math.max(OFF_WINDOW_MS, winFor(combo.fx)), auth: authArg });
        if (!cap.ok || !cap.frames || !cap.clip || cap.t0 == null) {
          console.log(`[card-strip] ${spec.id} off: FAILED ${cap.error}`);
          row.off = `error: ${cap.error}`;
        } else {
          const early = frameAt(cap.frames, cap.t0 + OFF_EARLY_MS) ?? cap.frames[0];
          const held = frameAt(cap.frames, cap.t0 + OFF_HELD_MS) ?? early;
          const offEnd = cap.endFrame!;
          const [a, b, c, d] = await Promise.all([
            crop(browser, fullEnd.frame, fullEnd.clip),
            crop(browser, early, cap.clip),
            crop(browser, held, cap.clip),
            crop(browser, offEnd, cap.clip),
          ]);
          // instant: nothing may still be arriving after the first moments
          // (a delayed layer popping in, a scene stuck in its before-phase);
          // both samples carry the text fallback, so it cancels out.
          const instant = await diffImages(browser, { data: b, mime: "image/png" }, { data: c, mime: "image/png" });
          // end: the resting board with animations off matches the full run's.
          const end = await diffImages(browser, { data: a, mime: "image/png" }, { data: d, mime: "image/png" });
          const pass = instant.changedFraction < 0.01 && end.changedFraction < 0.02;
          const outline = (rs: DiffRegion[]) => rs.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, color: "#e0a39a" }));
          const png = await shrink(
            await composeStrip(
              browser,
              [
                { data: a, mime: "image/png", label: "full, end" },
                { data: b, mime: "image/png", label: `off, +${OFF_EARLY_MS}ms` },
                { data: c, mime: "image/png", label: `off, +${OFF_HELD_MS}ms`, rects: outline(instant.regions) },
                { data: d, mime: "image/png", label: "off, end", rects: outline(end.regions) },
              ],
              { columns: 4, scale: (tile * 1.25) / cap.clip.w, title: `${spec.id} data-anim off check: ${pass ? "PASS" : "CHECK"}` },
            ),
          );
          const pngPath = path.join(outDir, `${base}.off.png`);
          fs.writeFileSync(pngPath, png);
          const jsonPath = path.join(outDir, `${base}.json`);
          const prev = fs.existsSync(jsonPath) ? (JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, unknown>) : { id: spec.id };
          writeJson(jsonPath, {
            ...prev,
            off: {
              url: cap.url,
              pass,
              instantChanged: round(instant.changedFraction, 4),
              instantRegions: instant.regions,
              endChanged: round(end.changedFraction, 4),
              endRegions: end.regions,
              png: rel(pngPath),
            },
          });
          row.off = pass ? "pass" : `check (instant ${round(instant.changedFraction * 100, 2)}%, end ${round(end.changedFraction * 100, 2)}%)`;
          console.log(`[card-strip] ${rel(pngPath)} off ${row.off}`);
        }
      }
      summary.push(row);
    }
    // Only this run's cards: stale sidecars from earlier runs in --out stay out.
    if (sheetName) await writeSheet(browser, sheetName, [outDir], outDir, sheetNames);
  } finally {
    await browser.close();
  }
  const bad = summary.filter((r) => r.error);
  console.log(`[card-strip] ${summary.length - bad.length}/${summary.length} cards captured into ${rel(outDir)}`);
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
