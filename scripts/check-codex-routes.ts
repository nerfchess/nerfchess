/**
 * Guard for F028: Next 16 hands `params` and `searchParams` to pages, layouts,
 * generateMetadata, route handlers and image routes as a Promise. A file that
 * still types them as a plain object reads `params.id` as undefined, so every
 * dynamic page calls notFound() (every /codex/hex/[id] and /codex/boon/[id]
 * page 404ed this way).
 *
 * Two checks:
 *  1. Static (always): no file under src/app types `params` or `searchParams`
 *     as a plain object. The one exception is generateImageMetadata, which
 *     Next 16 still calls with synchronous params (upgrading/version-16.md,
 *     "generateImageMetadata continues to receive synchronous params").
 *  2. Live (skipped with --static-only): fetch two ids from every codex family
 *     on the dev server and assert each renders the card (no 404 fallback,
 *     an h1 with the card name), and that an unknown id still 404s.
 *
 * Run: ./node_modules/.bin/tsx scripts/check-codex-routes.ts [--static-only]
 * Base URL: POLISH_BASE (default http://localhost:3000).
 */
import fs from "node:fs";
import path from "node:path";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { buffType, cardPath, nerfPath } from "@/lib/cardCodex";

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "src", "app");
const BASE = (process.env.POLISH_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const staticOnly = process.argv.includes("--static-only");

const failures: string[] = [];

// ---- 1. static scan ---------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// `params: { id: string }` or `searchParams: { q?: string }` in a type
// position. The Promise form (`params: Promise<{ ... }>`) does not match.
const SYNC_PROP = /\b(params|searchParams)\s*\??\s*:\s*\{/;

let scanned = 0;
for (const file of walk(APP)) {
  scanned++;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    // generateImageMetadata keeps sync params in Next 16; its signature may
    // wrap, so look at this line and the two above it.
    if (lines.slice(Math.max(0, i - 2), i + 1).some((l) => l.includes("generateImageMetadata("))) return;
    if (SYNC_PROP.test(line)) {
      failures.push(`${path.relative(ROOT, file)}:${i + 1} types params/searchParams as a plain object (Next 16 passes a Promise): ${line.trim()}`);
    }
  });
}
console.log(`static: scanned ${scanned} files under src/app`);

// ---- 2. live fetch ----------------------------------------------------------

interface Sample {
  path: string;
  name: string | null; // null = expect a 404
}

function samples(): Sample[] {
  const out: Sample[] = [];
  for (const family of ["Hex", "Boon", "Buff", "Item"] as const) {
    const cards = ALL_BUFFS.filter((b) => buffType(b) === family).slice(0, 2);
    if (cards.length === 0) failures.push(`no ${family} cards in the library to sample`);
    for (const b of cards) out.push({ path: cardPath(b), name: b.name });
  }
  for (const n of ALL_NERFS.slice(0, 2)) out.push({ path: nerfPath(n.id), name: n.name });
  out.push({ path: "/codex/hex/not_a_real_card_id", name: null });
  out.push({ path: "/codex/boon/not_a_real_card_id", name: null });
  return out;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function checkLive(): Promise<void> {
  for (const s of samples()) {
    let status = 0;
    let html = "";
    try {
      const res = await fetch(BASE + s.path, { redirect: "manual", signal: AbortSignal.timeout(180_000) });
      status = res.status;
      html = await res.text();
    } catch (err) {
      failures.push(`${s.path}: fetch failed (${(err as Error).message}); is the dev server up at ${BASE}?`);
      continue;
    }
    // next dev streams notFound() inside a 200 once a loading boundary has
    // flushed, so the 404 marker in the payload is the reliable signal.
    const is404 = status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    if (s.name === null) {
      const ok = is404;
      console.log(`${ok ? "ok  " : "FAIL"} ${s.path} status=${status} expect 404`);
      if (!ok) failures.push(`${s.path}: unknown id rendered instead of 404`);
      continue;
    }
    const ok = status === 200 && !is404 && decode(h1) === s.name;
    console.log(`${ok ? "ok  " : "FAIL"} ${s.path} status=${status} 404marker=${is404} h1=${JSON.stringify(decode(h1))}`);
    if (!ok) failures.push(`${s.path}: expected 200 with h1 "${s.name}", got status ${status}, 404 marker ${is404}, h1 ${JSON.stringify(h1)}`);
  }
}

(async () => {
  if (!staticOnly) await checkLive();
  if (failures.length) {
    console.error(`\ncheck-codex-routes: ${failures.length} failure(s)`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log("\ncheck-codex-routes: ok");
})();
