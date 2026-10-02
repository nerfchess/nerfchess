// Chess Diff (standard-rules sub-game) with bare kings: no insufficient-material
// draw, so a 1+0 flag hands the other side the diff and its apex prize.
import { UNRESTRICTED_NERF, acquireBuff, enableDraftMode, legalMoves, newGame, playMove, resolveDiffFlag } from "../../../../../src/engine/game";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import type { Color } from "../../../../../src/engine/types";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
enableDraftMode(g, 3, { mode: "buff" });
for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null as never;
g.buffs!.nextDraftAtPly = 1e9;
acquireBuff(g, "w", "chess_diff", 6 as never);
console.log("diff running:", !!g.buffs!.diff);
const b = g.board;
for (let sq = 0; sq < 64; sq++) b.pieces[sq] = null;
b.castling = { wk: false, wq: false, bk: false, bq: false };
b.epTarget = null;
b.pieces[4] = { type: "k", color: "w" }; b.pieces[60] = { type: "k", color: "b" };
b.turn = "w";
// play a few king moves: nothing ends the dead position
for (let i = 0; i < 6 && !g.result && g.buffs!.diff; i++) { const ms = legalMoves(g); g = playMove(g, ms[0]); }
console.log("after 6 plies of bare kings, diff still running:", !!g.buffs!.diff, "result:", JSON.stringify(g.result));
const bHeldBefore = g.buffs!.players.b.buffs.length;
resolveDiffFlag(g, "w"); // white flags the 1+0 diff clock
const got = g.buffs!.players.b.buffs.slice(bHeldBefore).map((x) => `${x.id} (tier ${BUFF_BY_ID[x.id]?.tier})`);
console.log("diff over:", !g.buffs!.diff, "black gained:", got.join(", ") || "nothing");
