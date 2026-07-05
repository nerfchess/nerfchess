// One-time backfill: copy the existing D1 `games` archive into OCI Postgres.
//
// Reads D1 (remote) in pages via `wrangler d1 execute --json` and bulk-inserts
// into Postgres with ON CONFLICT (id) DO NOTHING, so it is safe to re-run and
// safe to run while new games are still being dual-written. Rows are mapped by
// COLUMN NAME (not dump order) — D1 appends category/ruleset at the end while
// PG has them mid-table, so positional copy would corrupt data.
//
// Usage (two terminals):
//   1) open an SSH tunnel to the box's Postgres:
//        ssh -i "C:\Users\boda\Downloads\ssh-key-2026-07-04.key" -N \
//            -L 15432:127.0.0.1:5432 ubuntu@64.181.205.2
//   2) run this from the repo root (needs `postgres` from node_modules + wrangler auth):
//        PGPASSWORD='<nerfchess_app password>' node scripts/backfill-games.mjs
//      Never hardcode the password here — pass it via the environment only.
//
// Env (all optional except PGPASSWORD):
//   PGPASSWORD  required — nerfchess_app password
//   PG_HOST=127.0.0.1  PG_PORT=15432  PG_DB=nerfchess  PG_USER=nerfchess_app
//   D1_NAME=nerfchess  PAGE=500

import { execFileSync } from "node:child_process";
import postgres from "postgres";

const D1_NAME = process.env.D1_NAME ?? "nerfchess";
const PAGE = Number(process.env.PAGE ?? 500);

const password = process.env.PGPASSWORD;
if (!password) {
  console.error("Set PGPASSWORD to the nerfchess_app password. Aborting.");
  process.exit(1);
}

// Explicit column list — the intersection of the D1 and PG `games` schemas.
const COLUMNS = [
  "id", "white_user_id", "black_user_id", "white_name", "black_name",
  "white_nerf_id", "black_nerf_id", "seed", "time_sec", "increment_sec",
  "moves", "winner", "reason", "rated", "category", "ruleset",
  "white_rating_before", "white_rating_after", "black_rating_before",
  "black_rating_after", "started_at", "completed_at",
];

// Plaintext is fine here: the SSH tunnel already encrypts the hop to the box.
const sql = postgres({
  host: process.env.PG_HOST ?? "127.0.0.1",
  port: Number(process.env.PG_PORT ?? 15432),
  database: process.env.PG_DB ?? "nerfchess",
  username: process.env.PG_USER ?? "nerfchess_app",
  password,
  ssl: false,
  max: 1,
  // int8 columns are epoch-ms / seeds, all < 2^53 — decode to plain numbers.
  types: {
    bigint: {
      to: 20, from: [20],
      serialize: (v) => String(v),
      parse: (v) => Number(v),
    },
  },
});

// Query D1 (remote) and return the row array. `--json` prints clean JSON to
// stdout; slice from the first bracket in case a banner sneaks in.
function d1Query(command) {
  // Invoke wrangler's JS entry directly with `node` and shell:false so the SQL
  // (which contains spaces) is passed as one argv element — a Windows shell
  // would otherwise re-split it into separate arguments.
  const out = execFileSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", D1_NAME,
      "--remote", "--json", "--command", command],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, shell: false },
  );
  const json = out.slice(out.indexOf("["));
  const parsed = JSON.parse(json);
  return parsed[0]?.results ?? [];
}

// Keep only the mapped columns, coercing undefined -> null so postgres.js binds
// a SQL NULL rather than throwing on a missing key.
function project(row) {
  const out = {};
  for (const c of COLUMNS) out[c] = row[c] ?? null;
  return out;
}

async function main() {
  const [{ n: d1Total }] = d1Query("SELECT COUNT(*) AS n FROM games");
  console.log(`D1 games: ${d1Total}`);
  const [{ count: pgBefore }] = await sql`SELECT count(*)::int AS count FROM games`;
  console.log(`PG games before: ${pgBefore}`);

  let offset = 0;
  let inserted = 0;
  for (;;) {
    const rows = d1Query(
      `SELECT * FROM games ORDER BY completed_at, id LIMIT ${PAGE} OFFSET ${offset}`,
    );
    if (rows.length === 0) break;
    const mapped = rows.map(project);
    const res = await sql`
      INSERT INTO games ${sql(mapped, ...COLUMNS)}
      ON CONFLICT (id) DO NOTHING
    `;
    inserted += res.count;
    offset += rows.length;
    console.log(`  page @${offset - rows.length}: read ${rows.length}, new ${res.count} (total new ${inserted})`);
    if (rows.length < PAGE) break;
  }

  const [{ count: pgAfter }] = await sql`SELECT count(*)::int AS count FROM games`;
  console.log(`\nPG games after: ${pgAfter}  (inserted ${inserted}, skipped existing ${offset - inserted})`);
  if (pgAfter >= d1Total) {
    console.log("✅ PG now holds at least every D1 game.");
  } else {
    console.log(`⚠️  PG (${pgAfter}) < D1 (${d1Total}). Re-run, or investigate.`);
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
