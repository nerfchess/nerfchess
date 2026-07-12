/// <reference types="@cloudflare/workers-types" />

// Postgres access for Next route handlers. The large, append-only `games`
// archive lives on the OCI Postgres (not D1) and is reached from Cloudflare
// Workers through Hyperdrive. This mirrors db.ts (which serves the hot D1
// tables) but for the latency-tolerant archive reads. The Durable Object in
// worker.ts writes the archive directly with its own env binding.

import postgres, { type Sql } from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";

// Every int8 column we store is either an epoch-ms timestamp or an RNG seed —
// all well under 2^53 — so decode int8 to a plain JS number, matching what
// D1/SQLite returned. Without this, postgres.js yields strings for bigint and
// COUNT()/SUM() and the callers' arithmetic breaks.
const bigintAsNumber = {
  to: 20,
  from: [20],
  serialize: (value: number) => String(value),
  parse: (value: string) => Number(value),
};

// IMPORTANT: do NOT cache the postgres client across requests. Cloudflare
// Workers forbid using a socket opened in one request's I/O context from a
// different request — a reused client manifests as the Worker "hanging" and the
// runtime cancelling the request. Hyperdrive already pools the *origin*
// connections, so opening a fresh client per query is cheap (the Worker↔
// Hyperdrive hop is local) and is the pattern Cloudflare documents.
function hyperdriveBinding(): Hyperdrive | null {
  const { env } = getCloudflareContext();
  return (env as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE ?? null;
}

function makeClient(hyperdrive: Hyperdrive): Sql {
  return postgres(hyperdrive.connectionString, {
    max: 1,
    fetch_types: false,
    // Bound the worst case: postgres.js defaults to a 30s connect timeout, so
    // a sick tunnel/origin used to hang every archive read for up to 30s
    // before the D1 fallback below kicked in. Hyperdrive is a local hop; if it
    // can't produce a connection in 5s it isn't going to.
    connect_timeout: 5,
    types: { bigint: bigintAsNumber },
  });
}

// Close the per-request client after the response is sent (waitUntil) so socket
// teardown never adds latency to the request; fall back to awaiting if no ctx.
function closeSoon(sql: Sql): void {
  const closing = sql.end({ timeout: 5 });
  try {
    getCloudflareContext().ctx.waitUntil(closing);
  } catch {
    void closing;
  }
}

// Run a D1-style query (with `?` placeholders) against Postgres and return the
// row array — the shape D1's `.all().results` produced, so route code ports
// with minimal churn. When no Hyperdrive binding is configured (the OCI
// archive is disabled in wrangler.jsonc), the same query runs against the D1
// games table instead: these queries were originally written for D1 and the
// archive writer dual-falls-back to D1 too, so D1 stays complete and correct
// while Hyperdrive is off.
export async function pgAll<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const hyperdrive = hyperdriveBinding();
  if (!hyperdrive) return d1Fallback<T>(text, params);
  const sql = makeClient(hyperdrive);
  try {
    const rows = await sql.unsafe(toPositional(text), params as never[]);
    return rows as unknown as T[];
  } catch (err) {
    // Binding present but the origin (OCI Postgres via the Cloudflare Tunnel)
    // was unreachable: serve the D1 games table rather than 500 the caller.
    // D1 may be stale once writes have cut over to Postgres, so surface the
    // error for observability instead of failing silently.
    console.error("Hyperdrive read failed; falling back to D1", err);
    return d1Fallback<T>(text, params);
  } finally {
    closeSoon(sql);
  }
}

// Run a D1-style `?`-placeholder query against the D1 games table. Postgres
// `::type` casts exist only to coerce int8/numeric to JS numbers; SQLite
// already returns plain numbers, so strip them here.
async function d1Fallback<T>(text: string, params: unknown[]): Promise<T[]> {
  const db = await getDb();
  const d1Text = text.replace(/::[a-z0-9_]+/gi, "");
  const res = await db
    .prepare(d1Text)
    .bind(...(params as (string | number | null)[]))
    .all<T>();
  return res.results;
}

// Single-row helper mirroring D1's `.first()`.
export async function pgFirst<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await pgAll<T>(text, params);
  return rows[0] ?? null;
}

// D1 uses `?` placeholders; Postgres uses `$1..$n`. Rewrite in order.
function toPositional(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}
