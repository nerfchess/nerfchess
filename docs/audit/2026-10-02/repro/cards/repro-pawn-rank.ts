// Repro: move-granting cards let a pawn reach the 8th rank without promoting
// (or step back onto its own 1st rank); it stays a pawn there for good.
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
for (const id of ["berserker", "overclock_major"]) {
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  enableDraftMode(g, 2, { mode: "buff" });
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  for (let s = 0; s < 64; s++) g.board.pieces[s] = null;
  g.board.pieces[4] = { type: "k", color: "w" }; g.board.pieces[63] = { type: "k", color: "b" };
  g.board.pieces[40] = { type: "p", color: "w" }; // a6
  g.board.pieces[9] = { type: "p", color: "w" };  // b2
  g.board.castling = { wk: false, wq: false, bk: false, bq: false };
  acquireBuff(g, "w", id, BUFF_BY_ID[id].tier);
  const lm = legalMoves(g);
  const bad = lm.filter((m) => m.piece === "p" && !m.promotion && (m.to >> 3 === 7 || m.to >> 3 === 0));
  console.log(`${id}: pawn moves onto rank 1/8 without promotion: ${bad.map(moveToUCI).join(", ") || "none"}`);
  const m = bad.find((x) => x.to >> 3 === 7);
  if (m) {
    g = playMove(g, m);
    console.log(`  played ${moveToUCI(m)} -> a8 holds ${JSON.stringify(g.board.pieces[m.to])}`);
  }
}
