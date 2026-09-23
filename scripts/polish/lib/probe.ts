// ---------------------------------------------------------------------------
// Layout shift probe, Node side.
//
//   await installProbe(context);        // before the first navigation
//   await page.goto(url);
//   const raw = await readProbe(page);
//   const report = summarizeCls(raw);
//
// summarizeCls() reports the numbers the brief asks for:
//   cls           the web-vitals CLS: the largest session window (shifts less
//                 than 1s apart, window capped at 5s), ignoring shifts with
//                 hadRecentInput
//   total         the plain sum of every non-input shift (what a user sees
//                 over the whole load, not just the worst burst)
//   findings      every single non-input shift above FINDING_THRESHOLD (0.01)
//   offenders     top source nodes by attributed score, with the largest
//                 movement each one made
// ---------------------------------------------------------------------------

import type { BrowserContext, Page } from "@playwright/test";
import { PROBE_INIT, PROBE_READ } from "./inpage";
import { round } from "./common";

export const FINDING_THRESHOLD = 0.01;

export type Rect = { x: number; y: number; w: number; h: number };
export type ShiftSource = {
  selector: string;
  text: string;
  prev: Rect | null;
  curr: Rect | null;
  dx: number | null;
  dy: number | null;
  dw: number | null;
  dh: number | null;
};
export type Shift = { t: number; value: number; hadRecentInput: boolean; sources: ShiftSource[] };
export type Loaf = {
  t: number;
  duration: number;
  blocking: number;
  renderStart: number;
  scripts: { duration: number; invoker: string; source: string }[];
};
export type ProbeRaw = {
  url: string;
  timeOrigin: number;
  now: number;
  marks: Partial<Record<"firstPaint" | "fcp" | "dcl" | "load" | "hydrated" | "ttfb", number>>;
  shifts: Shift[];
  loaf: Loaf[];
  input: { type: string; t: number }[];
  /** Box watch changes (only when window.__polishWatch was set); box is "x,y,w,h" (y page-absolute) or "gone". */
  boxes: { t: number; sel: string; i: number; desc: string; text: string; box: string; was: string | null }[];
  api: { url: string; start: number; end: number }[];
  errors: string[];
  html: { theme: string | null; anim: string | null };
};

export type Offender = {
  selector: string;
  text: string;
  score: number;
  count: number;
  maxDy: number;
  maxDx: number;
  maxDh: number;
  maxDw: number;
};

export type ClsReport = {
  cls: number;
  total: number;
  shiftCount: number;
  inputShiftCount: number;
  findings: Shift[];
  offenders: Offender[];
  marks: ProbeRaw["marks"];
  /** /api/* calls with their end times, to line up with shift times. */
  api: ProbeRaw["api"];
  longFrames: { count: number; worst: number; totalBlocking: number };
  probeErrors: string[];
};

export async function installProbe(target: BrowserContext | Page): Promise<void> {
  await target.addInitScript(PROBE_INIT);
}

/** Watch these selectors' boxes every frame (install before navigation). */
export async function watchBoxes(target: BrowserContext | Page, selectors: string[]): Promise<void> {
  await target.addInitScript(`window.__polishWatch = ${JSON.stringify(selectors)};`);
}

export async function readProbe(page: Page): Promise<ProbeRaw | null> {
  return (await page.evaluate(PROBE_READ)) as ProbeRaw | null;
}

/** Evaluate a function source string with one JSON argument. */
export async function callIn<T>(page: Page, fnSource: string, arg: unknown): Promise<T> {
  return (await page.evaluate(`(${fnSource})(${JSON.stringify(arg)})`)) as T;
}

/** web-vitals session windowing: gap < 1000ms, window length <= 5000ms. */
export function sessionWindowCls(shifts: Shift[]): number {
  let best = 0;
  let cur = 0;
  let first = -Infinity;
  let prev = -Infinity;
  for (const s of shifts) {
    if (s.hadRecentInput) continue;
    if (s.t - prev < 1000 && s.t - first < 5000) {
      cur += s.value;
    } else {
      cur = s.value;
      first = s.t;
    }
    prev = s.t;
    best = Math.max(best, cur);
  }
  return best;
}

export function offenders(shifts: Shift[], limit = 8): Offender[] {
  const by = new Map<string, Offender>();
  for (const s of shifts) {
    if (s.hadRecentInput || !s.sources.length) continue;
    // A layout-shift entry's value is not split per source by the browser;
    // attribute it evenly so a node that shifts in many entries ranks high.
    const share = s.value / s.sources.length;
    for (const src of s.sources) {
      const o =
        by.get(src.selector) ??
        ({ selector: src.selector, text: src.text, score: 0, count: 0, maxDy: 0, maxDx: 0, maxDh: 0, maxDw: 0 } as Offender);
      o.score += share;
      o.count += 1;
      const pick = (a: number, b: number | null) => (b !== null && Math.abs(b) > Math.abs(a) ? b : a);
      o.maxDy = pick(o.maxDy, src.dy);
      o.maxDx = pick(o.maxDx, src.dx);
      o.maxDh = pick(o.maxDh, src.dh);
      o.maxDw = pick(o.maxDw, src.dw);
      if (!o.text && src.text) o.text = src.text;
      by.set(src.selector, o);
    }
  }
  return [...by.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((o) => ({ ...o, score: round(o.score) }));
}

export function summarizeCls(raw: ProbeRaw | null): ClsReport {
  if (!raw) {
    return {
      cls: NaN,
      total: NaN,
      shiftCount: 0,
      inputShiftCount: 0,
      findings: [],
      offenders: [],
      marks: {},
      api: [],
      longFrames: { count: 0, worst: 0, totalBlocking: 0 },
      probeErrors: ["probe not installed (did the page navigate before installProbe?)"],
    };
  }
  const nonInput = raw.shifts.filter((s) => !s.hadRecentInput);
  return {
    cls: round(sessionWindowCls(raw.shifts)),
    total: round(nonInput.reduce((a, s) => a + s.value, 0)),
    shiftCount: nonInput.length,
    inputShiftCount: raw.shifts.length - nonInput.length,
    findings: nonInput.filter((s) => s.value > FINDING_THRESHOLD).map((s) => ({ ...s, value: round(s.value) })),
    offenders: offenders(raw.shifts),
    marks: raw.marks,
    api: raw.api,
    longFrames: {
      count: raw.loaf.length,
      worst: raw.loaf.reduce((a, l) => Math.max(a, l.duration), 0),
      totalBlocking: raw.loaf.reduce((a, l) => a + l.blocking, 0),
    },
    probeErrors: raw.errors,
  };
}

/**
 * Let a loaded page settle: wait for network idle (capped, because a page with
 * a live socket or polling never goes idle), then a quiet period so late
 * shifts land in the buffer.
 */
export async function settle(page: Page, opts: { idleMs?: number; quietMs?: number } = {}): Promise<void> {
  await page.waitForLoadState("load", { timeout: opts.idleMs ?? 60_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: opts.idleMs ?? 20_000 }).catch(() => {});
  await page.waitForTimeout(opts.quietMs ?? 1500);
}
