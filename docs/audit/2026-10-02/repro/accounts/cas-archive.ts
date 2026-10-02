// Audit scratch: after a lost rating CAS is retried, does the archived row
// (D1 fallback path) carry the before/after that was actually applied?
import { D1Shim } from "./d1shim";
import { ensureSchema } from "../../../../../src/lib/server/schema";
import { recordFinishedGame, type FinishedGameRecord } from "../../../../../src/lib/server/games";
const g = (id: string, w: string, b: string, winner: "w" | "b"): FinishedGameRecord => ({
  id, whiteUserId: w, blackUserId: b, whiteName: w, blackName: b, whiteNerfId: "x", blackNerfId: "x",
  seed: 1, timeSec: 180, incrementSec: 0, moves: ["e2e4"], winner, reason: "checkmate", rated: true,
  ruleset: "draft", ratingCategory: "nerf", startedAt: 1, completedAt: Date.now(),
});
(async () => {
  const db = new D1Shim();
  await ensureSchema(db as any);
  for (const id of ["u1", "u2", "u3"]) db.db.prepare(`INSERT INTO users (id, username, username_lower, password_hash, created_at) VALUES (?, ?, ?, 'x', 0)`).run(id, id, id);
  const seq: number[] = [];
  const read = () => (db.db.prepare(`SELECT rating FROM user_ratings WHERE user_id='u1' AND category='nerf'`).get() as any)?.rating ?? 1500;
  const [a, b] = await Promise.all([recordFinishedGame(db as any, g("C1", "u1", "u2", "w")), recordFinishedGame(db as any, g("C2", "u1", "u3", "w"))]);
  const rows = db.db.prepare(`SELECT id, white_rating_before wb, white_rating_after wa FROM games ORDER BY id`).all() as any[];
  console.log("reported C1", a.white, "\nreported C2", b.white);
  console.log("archived", rows.map((r) => `${r.id}: ${r.wb.toFixed(1)} -> ${r.wa.toFixed(1)}`).join("; "));
  console.log("stored u1 rating", read().toFixed(1));
  const chainOk = Math.abs(rows[0].wa - rows[1].wb) < 1e-6 || Math.abs(rows[1].wa - rows[0].wb) < 1e-6;
  const endOk = Math.abs(Math.max(rows[0].wa, rows[1].wa) - read()) < 1e-6;
  console.log(chainOk && endOk ? "PASS archive rows chain to the stored rating" : "FAIL archive rows do not chain: one game's before/after is the pre-CAS snapshot, not what was applied");
  void seq;
})();
