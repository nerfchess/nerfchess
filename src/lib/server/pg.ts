/// <reference types="@cloudflare/workers-types" />

// Postgres access for Next route handlers. The large, append-only `games`
// archive lives on the OCI Postgres (not D1) and is reached from Cloudflare
// Workers through Hyperdrive. This mirrors db.ts (which serves the hot D1
// tables) but for the latency-tolerant archive reads. The Durable Object in
// worker.ts writes the archive directly with its own env binding.

import postgres, { type Sql } from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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

let client: Sql | null = null;

export function getPg(): Sql {
  if (client) return client;
  const { env } = getCloudflareContext();
  const hyperdrive = (env as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE;
  if (!hyperdrive) {
    throw new Error(
      "Hyperdrive binding `HYPERDRIVE` is not configured. Check wrangler.jsonc `hyperdrive` and, for local dev, set WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE.",
    );
  }
  client = postgres(hyperdrive.connectionString, {
    max: 5,
    fetch_types: false,
    types: { bigint: bigintAsNumber },
  });
  return client;
}

// Run a D1-style query (with `?` placeholders) against Postgres and return the
// row array — the shape D1's `.all().results` produced, so route code ports
// with minimal churn.
export async function pgAll<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sql = getPg();
  const rows = await sql.unsafe(toPositional(text), params as never[]);
  return rows as unknown as T[];
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
