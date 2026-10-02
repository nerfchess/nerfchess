// Repro: pocket drops are appended after the nerf filter, so they ignore the
// holder's nerf; Own Half Only promises "spawned pieces ... can't bypass".
import { newGame, enableDraftMode, legalMoves, acquireBuff, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { IMPLEMENTED_BY_ID } from "../../../../../src/engine/nerfs/library";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
const n = IMPLEMENTED_BY_ID["own_half_only"];
console.log("nerf text:", n.description);
const g = newGame(n, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 2, { mode: "nerf" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
acquireBuff(g, "w", "bn4_spare_button", BUFF_BY_ID.bn4_spare_button.tier);
const lm = legalMoves(g);
const pieceMovesPast = lm.filter((m) => !m.drop && (m.to >> 3) >= 4).length;
const dropsPast = lm.filter((m) => m.drop && (m.to >> 3) >= 4).map((m) => "abcdefgh"[m.to & 7] + ((m.to >> 3) + 1));
console.log(`white (own_half_only) holds Spare Button: board moves past rank 4: ${pieceMovesPast}; pawn drops into the enemy half: ${dropsPast.length} e.g. ${dropsPast.slice(0, 6).join(" ")}`);
