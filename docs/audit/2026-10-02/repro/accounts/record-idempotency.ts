// Audit scratch: drives the REAL recordFinishedGame (src/lib/server/games.ts)
// against an in-memory SQLite D1 shim built from the REAL runtime schema.
// Checks: exactly-once on replay, aborted/unrated games untouched, concurrent
// results for one account (CAS retry), and what the archive row would hold on
// a retry after the Postgres write failed post-D1-commit.
import { D1Shim } from "./d1shim";
import { ensureSchema } from "../../../../../src/lib/server/schema";
import { recordFinishedGame, type FinishedGameRecord } from "../../../../../src/lib/server/games";

let fails = 0;
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fails++;
}

async function freshDb() {
  const db = new D1Shim();
  await ensureSchema(db as unknown as D1Database);
  const now = Date.now();
  for (const [id, name] of [["u1", "alice"], ["u2", "bob"], ["u3", "carol"]]) {
    db.db.prepare(`INSERT INTO users (id, username, username_lower, password_hash, created_at) VALUES (?, ?, ?, 'x', ?)`).run(id, name, name, now);
  }
  return db;
}

function game(id: string, w: string, b: string, winner: "w" | "b" | "draw" | null, extra: Partial<FinishedGameRecord> = {}): FinishedGameRecord {
  return {
    id, whiteUserId: w, blackUserId: b, whiteName: w, blackName: b,
    whiteNerfId: "none", blackNerfId: "none", seed: 1, timeSec: 180, incrementSec: 0,
    moves: ["e2e4", "e7e5"], winner, reason: winner === null ? "aborted" : "checkmate",
    rated: true, ruleset: "draft", ratingCategory: "nerf",
    startedAt: Date.now() - 1000, completedAt: Date.now(), ...extra,
  };
}

function bucket(db: D1Shim, uid: string, cat = "nerf") {
  return db.db.prepare(`SELECT rating, rd, vol, games, wins, losses, draws FROM user_ratings WHERE user_id = ? AND category = ?`).get(uid, cat) as any;
}
function userRow(db: D1Shim, uid: string) {
  return db.db.prepare(`SELECT games, wins, losses, draws, recent_aborts FROM users WHERE id = ?`).get(uid) as any;
}

async function main() {
  // 1. Exactly once on replay.
  {
    const db = await freshDb();
    const g = game("G1", "u1", "u2", "w");
    const r1 = await recordFinishedGame(db as any, g);
    const after1 = bucket(db, "u1");
    const r2 = await recordFinishedGame(db as any, g);
    const r3 = await recordFinishedGame(db as any, g);
    const after3 = bucket(db, "u1");
    check(!!r1.white && r1.white.after > r1.white.before, `first call moves white rating (${r1.white?.before} -> ${r1.white?.after?.toFixed(1)})`);
    check(after1.rating === after3.rating && after1.games === 1 && after3.games === 1, `replays x2 do not move rating/games (rating ${after3.rating.toFixed(1)}, games ${after3.games})`);
    check(r2.white === null && r3.white === null, "replays report no rating change");
    check(userRow(db, "u1").games === 1, `users.games incremented once (${userRow(db, "u1").games})`);
    check(userRow(db, "u1").recent_aborts === "0", `recent_aborts appended once ('${userRow(db, "u1").recent_aborts}')`);
  }
  // 2. Aborted (winner null) game: archived, no rating movement, abort flag appended.
  {
    const db = await freshDb();
    const g = game("G2", "u1", "u2", null, { abortedBy: "w" });
    const r = await recordFinishedGame(db as any, g);
    const b1 = bucket(db, "u1");
    const row = db.db.prepare(`SELECT rated FROM games WHERE id = 'G2'`).get() as any;
    check(r.white === null && r.black === null, "aborted game reports no rating change");
    check(!b1 || (b1.games === 0 && b1.rating === 1500), `aborted game leaves bucket untouched (${JSON.stringify(b1)})`);
    check(row?.rated === 0, `aborted game archived as unrated (rated=${row?.rated})`);
    check(userRow(db, "u1").recent_aborts === "1" && userRow(db, "u2").recent_aborts === "0", `abort ring buffer: aborter '1', other '0'`);
  }
  // 3. Same account on both seats is never rated.
  {
    const db = await freshDb();
    const r = await recordFinishedGame(db as any, game("G3", "u1", "u1", "w"));
    check(r.white === null, "self-play not rated");
  }
  // 4. Concurrent results for one account computed from the same snapshot.
  {
    const db = await freshDb();
    // Settle ratings a bit so the CAS values are non-trivial.
    await recordFinishedGame(db as any, game("S1", "u1", "u2", "w"));
    await recordFinishedGame(db as any, game("S2", "u1", "u3", "b"));
    const before = bucket(db, "u1");
    const [ra, rb] = await Promise.all([
      recordFinishedGame(db as any, game("C1", "u1", "u2", "w")),
      recordFinishedGame(db as any, game("C2", "u1", "u3", "w")),
    ]);
    const after = bucket(db, "u1");
    check(after.games === before.games + 2, `both concurrent games counted (${before.games} -> ${after.games})`);
    const moved = after.rating - before.rating;
    const naiveA = ra.white!.after - ra.white!.before;
    check(moved > naiveA + 1, `second concurrent win stacks on the first, not clobbered (total +${moved.toFixed(1)}, single +${naiveA.toFixed(1)})`);
    // Is the reported after equal to what is stored?
    const lastReported = Math.max(ra.white!.after, rb.white!.after);
    check(Math.abs(lastReported - after.rating) < 1e-6, `reported 'after' of the later write equals stored rating (${lastReported.toFixed(2)} vs ${after.rating.toFixed(2)})`);
  }
  // 5. Archive retry after the Postgres write failed AFTER the D1 batch committed.
  //    endMatch (worker.ts) sets match.recorded=false on any throw so a later
  //    end-path replay calls recordFinishedGame again; the archive row of that
  //    retry is built from ratings re-read AFTER the first commit.
  {
    const db = await freshDb();
    const g = game("A1", "u1", "u2", "w");
    let threw = false;
    try {
      // Local closed port: connection refused, never leaves the box.
      await recordFinishedGame(db as any, g, "postgres://u:p@127.0.0.1:1/x");
    } catch (e) {
      threw = true;
    }
    const committed = bucket(db, "u1");
    check(threw, "first call throws when the archive write fails");
    check(committed.games === 1, `...but its D1 rating batch already committed (u1 rating ${committed.rating.toFixed(1)}, games ${committed.games})`);
    // Retry: use the D1 fallback archive so we can read the row it would write.
    const r = await recordFinishedGame(db as any, g);
    const row = db.db.prepare(`SELECT white_rating_before wb, white_rating_after wa, black_rating_before bb, black_rating_after ba FROM games WHERE id = 'A1'`).get() as any;
    check(r.white === null, "retry reports no rating change (claim lost)");
    const ok = Math.abs(row.wb - 1500) < 1e-6;
    check(ok, `archived white_rating_before should be the pre-game 1500, got ${row.wb?.toFixed(1)}; after ${row.wa?.toFixed(1)} (true after ${committed.rating.toFixed(1)})`);
    check(Math.abs(row.wa - committed.rating) < 1e-6, `archived white_rating_after should equal the applied rating ${committed.rating.toFixed(1)}, got ${row.wa?.toFixed(1)}`);
  }
  console.log(fails ? `\n${fails} check(s) FAILED` : "\nall checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
