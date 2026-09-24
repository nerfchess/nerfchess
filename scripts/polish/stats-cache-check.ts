// F102 measurement: the public /api/stats payload is computed once per minute
// per server instance, with the same keys and numbers.
//
//   ./node_modules/.bin/tsx scripts/polish/stats-cache-check.ts [--out FILE] [--label before|after] [--compare FILE]
//
// Times five back-to-back GETs (the first may compile or compute), records the
// cache-control header and the payload. With --compare, the payload's key set
// and every value are compared with an earlier run's payload.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.POLISH_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error(`refuses a non-local base: ${BASE}`);
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};

function keyPaths(v: unknown, prefix = ""): string[] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keyPaths(x, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

async function main() {
  // Warm once so a first compile does not count as a request timing.
  await fetch(`${BASE}/api/stats`);
  const timings: number[] = [];
  let payload: unknown = null;
  let cacheControl: string | null = null;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE}/api/stats`);
    payload = await res.json();
    timings.push(Math.round((performance.now() - t0) * 10) / 10);
    cacheControl = res.headers.get("cache-control");
  }
  const sorted = [...timings].sort((a, b) => a - b);
  const result: Record<string, unknown> = {
    at: new Date().toISOString(),
    label: arg("--label"),
    timingsMs: timings,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    cacheControl,
    keys: keyPaths(payload).sort(),
    payload,
  };
  const cmp = arg("--compare");
  if (cmp) {
    const prev = JSON.parse(readFileSync(cmp, "utf8")) as { keys: string[]; payload: unknown };
    const sameKeys = JSON.stringify(prev.keys) === JSON.stringify(result.keys);
    const diffs = (result.keys as string[]).filter((k) => {
      const get = (o: unknown) => k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], o);
      return JSON.stringify(get(prev.payload)) !== JSON.stringify(get(payload));
    });
    result.compare = { against: cmp, sameKeys, differingValues: diffs };
  }
  console.log(JSON.stringify({ ...result, payload: undefined }, null, 2));
  const out = arg("--out");
  if (out) {
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
