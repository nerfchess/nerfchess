// The worker resolves client moves with replay.ts moveByUci (worker.ts:4039).
// Show it accepts a bare, unpromoted pawn arrival on the 8th rank when a
// move-granting card is held (Warp Step, tier 3, in the draft pool).
import { newGame, enableDraftMode, acquireBuff, playMove, UNRESTRICTED_NERF, legalMoves } from "../../../../../src/engine/game";
import { moveByUci } from "../../../../../src/engine/replay";
import { moveToUCI } from "../../../../../src/engine/board";
import { fenToBoard, boardToFen } from "../../../../../src/lib/fen";
for (const [card, fen, uci] of [
  ["warp_step", "4k3/8/1P6/8/8/8/8/4K3 w - - 0 1", "b6b8"],
  ["overclock_major", "4k3/1P6/8/8/8/8/8/4K3 w - - 0 1", "b7a8"],
  ["full_planche", "1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1", ""],
] as const) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 2);
  enableDraftMode(g, 2, { mode: "buff" });
  g.board = fenToBoard(fen)!;
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  acquireBuff(g, "w", card, 3 as any);
  const lm = legalMoves(g);
  const pick = uci || moveToUCI(lm.find((m) => m.piece === "p" && !m.promotion && m.to >> 3 === 7) ?? lm[0]);
  const m = moveByUci(g, pick);
  console.log(`${card}: moveByUci("${pick}") -> ${m ? `accepted via=${m.via} promotion=${m.promotion}` : "rejected"}; same-square promo options: ${lm.filter((x) => moveToUCI(x).startsWith(pick) && x.promotion).map(moveToUCI).join(",") || "none"}`);
  if (m) { playMove(g, m); console.log(`   after: ${boardToFen(g.board)}`); }
}
