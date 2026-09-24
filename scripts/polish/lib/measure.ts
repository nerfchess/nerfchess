// ---------------------------------------------------------------------------
// Measure one (route, state) cell: the unit every polish tool is built from.
//
// Probes, all optional:
//   cls      layout shift probe (./probe.ts), summarized
//   console  hygiene collector (./hygiene.ts)
//   flash    hydration and flash detector: a CDP screencast runs across the
//            whole load, and the frames on screen at first contentful paint,
//            DOMContentLoaded and hydration are pixel-diffed against the
//            settled page (after network idle). Changed regions are labelled
//            with the element now occupying them. A changed region that is not
//            content arriving in an already-reserved box is a finding.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import { composeStrip, diffImages, type DiffResult, type Tile } from "./compose";
import { round } from "./common";
import { attachHygiene, type HygieneReport } from "./hygiene";
import { ELEMENTS_AT } from "./inpage";
import { callIn, readProbe, settle, summarizeCls, type ClsReport, type ProbeRaw } from "./probe";
import { frameAt, startScreencast, type Frame } from "./screencast";
import { navTimeout, openCell, stateLabel, type State } from "./states";

export type FlashStep = {
  from: string;
  to: string;
  diff: Omit<DiffResult, "width" | "height">;
};
export type FlashReport = {
  frames: number;
  moments: Record<string, number | null>;
  /** each key moment vs the settled page */
  vsFinal: FlashStep[];
  /** consecutive key moments */
  steps: FlashStep[];
  png?: string;
};

export type CellResult = {
  route: string;
  state: string;
  status: number | null;
  error?: string;
  loadMs: number;
  cls?: ClsReport;
  console?: HygieneReport;
  flash?: FlashReport;
  html?: ProbeRaw["html"];
  screenshot?: string;
};

export type MeasureOpts = {
  cls?: boolean;
  console?: boolean;
  flash?: boolean;
  /** write a flash strip PNG here (key moments with changed regions outlined) */
  flashPng?: string;
  /** write a viewport screenshot here once settled */
  screenshot?: string;
  quietMs?: number;
  /** runs after load and before settle, e.g. to start a game */
  after?: (page: Page) => Promise<void>;
};

async function labelRegions(page: Page, diff: DiffResult): Promise<DiffResult> {
  if (!diff.regions.length) return diff;
  const pts = diff.regions.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 }));
  const labels = await callIn<(string | null)[]>(page, ELEMENTS_AT, pts).catch(() => pts.map(() => null));
  return { ...diff, regions: diff.regions.map((r, i) => ({ ...r, element: labels[i] })) };
}

function trimDiff(d: DiffResult): FlashStep["diff"] {
  return { changedFraction: round(d.changedFraction), regions: d.regions };
}

export async function measureCell(browser: Browser, route: string, s: State, opts: MeasureOpts): Promise<CellResult> {
  const { ctx, page } = await openCell(browser, s, { probe: true });
  const hygiene = opts.console ? attachHygiene(page) : null;
  const rec = opts.flash ? await startScreencast(page) : null;
  const t0 = Date.now();
  const out: CellResult = { route, state: stateLabel(s), status: null, loadMs: 0 };
  try {
    const res = await page.goto(route, { waitUntil: "domcontentloaded", timeout: navTimeout(s.net) });
    out.status = res?.status() ?? null;
    if (opts.after) await opts.after(page);
    await settle(page, { idleMs: navTimeout(s.net) / 3, quietMs: opts.quietMs ?? 1500 });
    out.loadMs = Date.now() - t0;
    const raw = await readProbe(page);
    out.html = raw?.html;
    if (opts.cls) out.cls = summarizeCls(raw);
    if (opts.screenshot) {
      fs.mkdirSync(path.dirname(opts.screenshot), { recursive: true });
      await page.screenshot({ path: opts.screenshot });
      out.screenshot = opts.screenshot;
    }
    if (rec && raw) {
      const finalPng = (await page.screenshot()).toString("base64");
      const frames = await rec.stop();
      out.flash = await flashFrom(browser, page, raw, frames, finalPng, opts.flashPng, `${route}  ${stateLabel(s)}`);
    }
  } catch (e) {
    out.error = (e as Error).message.split("\n")[0];
    out.loadMs = Date.now() - t0;
  } finally {
    if (rec) await rec.stop().catch(() => []);
    if (hygiene) out.console = hygiene.report();
    await ctx.close().catch(() => {});
  }
  return out;
}

/** Latest of the first response end for each pattern (null if none fired). */
function firstApiEnd(raw: ProbeRaw, patterns: RegExp[]): number | null {
  let latest: number | null = null;
  for (const re of patterns) {
    const hit = raw.api.filter((a) => re.test(a.url)).sort((a, b) => a.end - b.end)[0];
    if (hit) latest = Math.max(latest ?? 0, hit.end);
  }
  return latest;
}

async function flashFrom(
  browser: Browser,
  page: Page,
  raw: ProbeRaw,
  frames: Frame[],
  finalPng: string,
  pngPath: string | undefined,
  title: string,
): Promise<FlashReport> {
  const at = (ms: number | undefined) => (ms === undefined ? null : raw.timeOrigin + ms);
  const moments: Record<string, number | null> = {
    fcp: raw.marks.fcp ?? raw.marks.firstPaint ?? null,
    dcl: raw.marks.dcl ?? null,
    hydrated: raw.marks.hydrated ?? null,
    // The first answers to "who am I" and "what are my settings": the moment
    // the header and the board/theme preferences can first be right.
    authSettled: firstApiEnd(raw, [/^\/api\/auth\/me/, /^\/api\/users\/settings/]),
  };
  // Frames stamped before this navigation's timeOrigin belong to about:blank.
  const own = frames.filter((f) => f.ts >= raw.timeOrigin);
  const picked: { name: string; frame: Frame }[] = [];
  // Nothing is on screen before first paint, so a moment that precedes it
  // (DOMContentLoaded often does) is shown as of first paint, not as the
  // blank frame before it. Moments are compared in time order.
  const paint = moments.fcp ?? 0;
  const ordered = Object.entries(moments)
    .filter(([, ms]) => ms !== null)
    .sort((a, b) => (a[1] as number) - (b[1] as number));
  for (const [name, ms] of ordered) {
    const t = at(Math.max(ms as number, paint));
    if (t === null) continue;
    // A paint mark fires as the frame is produced; allow one frame of lag.
    const f = frameAt(own, t + 20) ?? own[0];
    if (f) picked.push({ name, frame: f });
  }
  const final = { data: finalPng, mime: "image/png" as const };
  const vsFinal: FlashStep[] = [];
  const steps: FlashStep[] = [];
  for (const p of picked) {
    const d = await labelRegions(page, await diffImages(browser, { data: p.frame.data }, final));
    vsFinal.push({ from: p.name, to: "settled", diff: trimDiff(d) });
  }
  for (let i = 1; i < picked.length; i++) {
    const d = await labelRegions(page, await diffImages(browser, { data: picked[i - 1].frame.data }, { data: picked[i].frame.data }));
    steps.push({ from: picked[i - 1].name, to: picked[i].name, diff: trimDiff(d) });
  }
  const report: FlashReport = { frames: own.length, moments, vsFinal, steps };
  if (pngPath) {
    const tiles: Tile[] = picked.map((p) => {
      const v = vsFinal.find((x) => x.from === p.name);
      const ms = moments[p.name];
      return {
        data: p.frame.data,
        label: `${p.name} @${ms ?? "?"}ms  changed ${v ? (v.diff.changedFraction * 100).toFixed(1) : "?"}%`,
        rects: (v?.diff.regions ?? []).map((r) => ({ ...r, color: "#ff3b30" })),
      };
    });
    tiles.push({ data: finalPng, mime: "image/png", label: "settled" });
    const vp = page.viewportSize();
    const scale = vp && vp.width > 800 ? 0.5 : 0.75;
    const png = await composeStrip(browser, tiles, { columns: tiles.length, scale, title });
    fs.mkdirSync(path.dirname(pngPath), { recursive: true });
    fs.writeFileSync(pngPath, png);
    report.png = pngPath;
  }
  return report;
}
