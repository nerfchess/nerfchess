// Audit scratch: casual games are archived but never counted in users.games,
// which the profile shows as the "N Games" tab label and Games/Record tiles.
import { D1Shim } from "./d1shim";
import { ensureSchema } from "../../../../../src/lib/server/schema";
import { recordFinishedGame } from "../../../../../src/lib/server/games";
(async () => {
  const db = new D1Shim();
  await ensureSchema(db as any);
  for (const id of ["u1", "u2"]) db.db.prepare(`INSERT INTO users (id, username, username_lower, password_hash, created_at) VALUES (?, ?, ?, 'x', 0)`).run(id, id, id);
  for (let i = 0; i < 3; i++) {
    await recordFinishedGame(db as any, { id: "K" + i, whiteUserId: "u1", blackUserId: "u2", whiteName: "u1", blackName: "u2", whiteNerfId: "x", blackNerfId: "x", seed: 1, timeSec: 300, incrementSec: 0, moves: ["e2e4"], winner: "w", reason: "checkmate", rated: false, ruleset: "draft", ratingCategory: "buff", startedAt: 1, completedAt: Date.now() + i });
  }
  const u = db.db.prepare(`SELECT games, wins FROM users WHERE id='u1'`).get() as any;
  const n = (db.db.prepare(`SELECT COUNT(*) n FROM games WHERE white_user_id='u1' OR black_user_id='u1'`).get() as any).n;
  console.log(`archived games for u1: ${n}; users.games (profile "N Games" label): ${u.games}; users.wins: ${u.wins}`);
})();
