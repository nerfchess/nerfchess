// Slice G: the human-count SQL in src/lib/server/metrics.ts against local D1.
//
//   ./node_modules/.bin/tsx scripts/polish/metrics-sql-test.ts [--out FILE]
//
// 1. F117 regression: inserts three archived games finished now (house vs
//    house, human vs house, human vs a test account) and counts distinct
//    active accounts with the analytics query as it was (every non-NULL seat)
//    and with the shared human-seat predicate. The old query counts the house
//    bots and the test account; the new one counts only the human.
// 2. Query plans: EXPLAIN QUERY PLAN for every metrics and queue-health query,
//    so "indexed" is evidence, not a claim.
// Fixture rows carry a per-run id and are deleted at the end. Local only.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HUMAN_USER_SQL, humanSeatSql } from "../../src/lib/server/metrics";

const ROOT = path.resolve(__dirname, "..", "..");
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;

function d1<T = Record<string, unknown>>(sql: string): T[] {
  const out = execFileSync(
    path.join(ROOT, "node_modules", ".bin", "wrangler"),
    ["d1", "execute", "nerfchess", "--local", "--json", "--command", sql],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 },
  ).toString();
  const parsed = JSON.parse(out) as { results: T[] }[];
  return parsed[parsed.length - 1]?.results ?? [];
}

/** Inline `?` params (fixture values only; this never sees user input). */
function inline(sql: string, params: (string | number)[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const v = params[i++];
    return typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  });
}

const checks: { id: string; pass: boolean; detail: unknown }[] = [];
function check(id: string, pass: boolean, detail: unknown) {
  checks.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${JSON.stringify(detail)}`);
}

function main() {
  const nonce = Date.now().toString(36);
  const now = Date.now();
  const human = `mfx_human_${nonce}`;
  const testUser = d1<{ id: string }>(`SELECT id FROM users WHERE username_lower LIKE 'polish\\_%' ESCAPE '\\' LIMIT 1`)[0]?.id;
  if (!testUser) throw new Error("no polish_ account; run npm run polish:seed");
  const games = [
    [`mfx_g1_${nonce}`, "hp_fixture_a", "hp_fixture_b"],
    [`mfx_g2_${nonce}`, human, "hp_fixture_a"],
    [`mfx_g3_${nonce}`, human, testUser],
  ];
  d1(
    games
      .map(
        ([id, w, b]) =>
          `INSERT INTO games (id, white_user_id, black_user_id, white_name, black_name, white_nerf_id, black_nerf_id, seed, time_sec, increment_sec, moves, winner, reason, rated, started_at, completed_at)
           VALUES ('${id}', '${w}', '${b}', 'w', 'b', 'none', 'none', 1, 180, 0, 'e2e4 e7e5', 'w', 'checkmate', 0, ${now - 60000}, ${now})`,
      )
      .join("; "),
  );
  try {
    const since = now - 5000;
    const idList = games.map((g) => `'${g[0]}'`).join(",");
    // The analytics DAU query as it was before F117 (any non-NULL seat).
    const before = d1<{ n: number }>(
      `SELECT COUNT(DISTINCT uid) AS n FROM (
         SELECT white_user_id AS uid FROM games WHERE completed_at >= ${since} AND id IN (${idList}) AND white_user_id IS NOT NULL
         UNION ALL
         SELECT black_user_id AS uid FROM games WHERE completed_at >= ${since} AND id IN (${idList}) AND black_user_id IS NOT NULL
       ) s`,
    )[0]?.n;
    const tests = [testUser];
    const after = d1<{ n: number }>(
      inline(
        `SELECT COUNT(DISTINCT uid) AS n FROM (
           SELECT white_user_id AS uid FROM games WHERE completed_at >= ? AND id IN (${idList}) AND ${humanSeatSql("white_user_id", tests)}
           UNION ALL
           SELECT black_user_id AS uid FROM games WHERE completed_at >= ? AND id IN (${idList}) AND ${humanSeatSql("black_user_id", tests)}
         ) s`,
        [since, ...tests, since, ...tests],
      ),
    )[0]?.n;
    check("F117 old analytics query counts bots and test accounts (expected 4 seats: 2 house, 1 human, 1 test)", before === 4, { before });
    check("F117 human-seat predicate counts only the human account", after === 1, { after });
  } finally {
    d1(`DELETE FROM games WHERE id LIKE 'mfx\\_%' ESCAPE '\\'`);
  }

  // ---- Query plans ------------------------------------------------------
  const day = 86_400_000;
  const plans: Record<string, string[]> = {};
  const plan = (name: string, sql: string) => {
    plans[name] = d1<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`).map((r) => r.detail);
  };
  plan(
    "signups per day (users, idx_users_guest_created)",
    `SELECT created_at / 86400000 AS day, COUNT(*) FROM users WHERE is_guest = 0 AND created_at >= ${now - 365 * day} AND ${HUMAN_USER_SQL} GROUP BY 1`,
  );
  plan(
    "active accounts (games, idx_games_completed)",
    inline(
      `SELECT uid, day, MAX(completed_at) FROM (
         SELECT white_user_id AS uid, completed_at / 86400000 AS day, completed_at FROM games WHERE completed_at >= ? AND ${humanSeatSql("white_user_id", [testUser])}
         UNION ALL
         SELECT black_user_id AS uid, completed_at / 86400000 AS day, completed_at FROM games WHERE completed_at >= ? AND ${humanSeatSql("black_user_id", [testUser])}
       ) s GROUP BY uid, day`,
      [now - 30 * day, testUser, now - 30 * day, testUser],
    ),
  );
  plan(
    "games per day by mode and seats (games, idx_games_completed)",
    `SELECT completed_at / 86400000, CASE WHEN category = 'buff' THEN 'buff' ELSE 'nerf' END, COUNT(*) FROM games WHERE completed_at >= ${now - 30 * day} GROUP BY 1, 2`,
  );
  plan("account totals (users, one pass)", `SELECT is_guest, COUNT(*) FROM users WHERE ${HUMAN_USER_SQL} GROUP BY is_guest`);
  plan("oldest open report (idx_reports_status)", `SELECT MIN(created_at) FROM reports WHERE status = 'open'`);
  plan("oldest unreviewed flag (idx_chat_flags_created)", `SELECT MIN(created_at) FROM chat_flags WHERE reviewed = 0`);
  plan(
    "handled per day (mod_actions, idx_mod_actions_kind)",
    `SELECT created_at / 86400000, target_kind, COUNT(*) FROM mod_actions WHERE target_kind IN ('report','chat_flag','user') AND created_at >= ${now - 7 * day} GROUP BY 1, 2`,
  );
  plan("reports filed by a player (idx_reports_reporter)", `SELECT id FROM reports WHERE reporter_user_id = 'x' ORDER BY created_at DESC LIMIT 20`);
  plan("audit log by kind (idx_mod_actions_kind)", `SELECT * FROM mod_actions WHERE target_kind = 'card' ORDER BY created_at DESC LIMIT 200`);
  for (const [name, rows] of Object.entries(plans)) console.log(`\n${name}\n  ${rows.join("\n  ")}`);
  const indexed = (name: string, idx: string) => (plans[name] ?? []).some((r) => r.includes(idx));
  check("signups use idx_users_guest_created", indexed("signups per day (users, idx_users_guest_created)", "idx_users_guest_created"), plans["signups per day (users, idx_users_guest_created)"]);
  check("reports-by uses idx_reports_reporter", indexed("reports filed by a player (idx_reports_reporter)", "idx_reports_reporter"), null);
  check("handled per day uses idx_mod_actions_kind", indexed("handled per day (mod_actions, idx_mod_actions_kind)", "idx_mod_actions_kind"), null);

  const failed = checks.filter((c) => !c.pass).length;
  if (OUT) {
    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), checks, plans }, null, 2));
  }
  console.log(`\n${checks.length - failed} of ${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
