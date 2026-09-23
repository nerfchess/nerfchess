// ---------------------------------------------------------------------------
// Shared plumbing for the polish-pass measurement harness (scripts/polish/).
//
// Everything here is Node-side: argument parsing, paths, launching the
// preinstalled Chromium, waiting for the shared dev server. The in-page probe
// sources live in ./inpage.ts as plain strings on purpose: tsx runs esbuild
// with keepNames, which wraps inner functions in a `__name(...)` helper that
// does not exist in the page, so a TypeScript function handed to
// page.evaluate() or addInitScript() can throw there. Strings are immune.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "@playwright/test";

export const ROOT = path.resolve(__dirname, "..", "..", "..");
/**
 * The card-effect strip tool talks to a second dev server (POLISH_FX_BASE,
 * default :3100) that only ever compiles /dev/plays: every edit to a play
 * module recompiles the whole effects graph, and doing that on the shared
 * :3000 server pushed it past 10 GB and into an OOM kill every few minutes
 * while the Tier C lane worked (2026-09-23). Everything else uses :3000.
 */
const IS_FX_TOOL = /card-strip/.test(process.argv[1] ?? "");
export const BASE = (
  process.env.POLISH_BASE ||
  (IS_FX_TOOL ? process.env.POLISH_FX_BASE || "http://localhost:3100" : "http://localhost:3000")
).replace(/\/$/, "");
/** Committed evidence (small JSON and PNG strips only). */
export const EVIDENCE_DIR = path.join(ROOT, "docs", "polish-pass", "evidence");
/** Gitignored scratch output (full screenshots, raw frames). */
export const SCRATCH_DIR = path.join(ROOT, "e2e", "__screens__", "polish");
/** Gitignored Playwright storageState files for the seeded accounts. */
export const AUTH_DIR = path.join(ROOT, ".polish-auth");

// ---------- args ----------

export type Args = { flags: Set<string>; values: Map<string, string>; rest: string[] };

/** `--name value`, `--name=value` and bare `--flag`. */
export function parseArgs(argv = process.argv.slice(2)): Args {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      rest.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq > 0) {
      values.set(a.slice(2, eq), a.slice(eq + 1));
      continue;
    }
    const name = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(name, next);
      i++;
    } else {
      flags.add(name);
    }
  }
  return { flags, values, rest };
}

export function argStr(args: Args, name: string, dflt: string): string {
  return args.values.get(name) ?? dflt;
}

export function argNum(args: Args, name: string, dflt: number): number {
  const v = args.values.get(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : dflt;
}

/** Comma list; `all` expands to `all`, empty falls back. */
export function argList<T extends string>(args: Args, name: string, all: readonly T[], dflt: readonly T[]): T[] {
  const raw = args.values.get(name);
  if (!raw) return [...dflt];
  if (raw === "all") return [...all];
  const picked = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as T[];
  const bad = picked.filter((p) => !all.includes(p));
  if (bad.length) throw new Error(`--${name}: unknown value(s) ${bad.join(", ")}; expected ${all.join(", ")} or all`);
  return picked;
}

// ---------- browser ----------

export function chromiumPath(): string | undefined {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean) as string[];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const d of dirs) {
      const exe = path.join(root, d, "chrome-linux", "chrome");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined;
}

export async function launch(): Promise<Browser> {
  const executablePath = chromiumPath();
  return chromium.launch({ ...(executablePath ? { executablePath } : {}) });
}

// ---------- server ----------

/** Poll the dev server until it answers, up to `timeoutMs`. */
export async function waitForServer(timeoutMs = 300_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  let lastErr = "";
  while (Date.now() < until) {
    try {
      const res = await fetch(BASE + "/", { signal: AbortSignal.timeout(15_000) });
      if (res.status < 500) return;
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message;
    }
    await sleep(3000);
  }
  throw new Error(`dev server at ${BASE} did not answer within ${timeoutMs}ms (${lastErr})`);
}

/**
 * Hit each route once so `next dev` compiles it before anything is timed.
 * Without this the first measured load of a route includes a multi-second
 * compile, which is a dev-server artefact, not something a visitor sees.
 */
export async function warmRoutes(routes: string[], cookie?: string): Promise<void> {
  for (const r of routes) {
    try {
      await fetch(BASE + r, {
        headers: cookie ? { cookie } : {},
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      // A route that fails to warm is measured anyway and fails loudly there.
    }
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- output ----------

export function writeJson(file: string, data: unknown): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
  return file;
}

export function rel(file: string): string {
  return path.relative(ROOT, file);
}

/** A filesystem-safe slug for a route or state label. */
export function slug(s: string): string {
  const out = s
    .replace(/^\/+/, "")
    .replace(/[?&=]+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "root";
}

export const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
