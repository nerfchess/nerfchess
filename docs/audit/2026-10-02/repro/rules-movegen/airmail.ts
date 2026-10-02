import { newGame, enableDraftMode, acquireBuff, playMove, UNRESTRICTED_NERF, legalMoves } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { fenToBoard, boardToFen } from "../../../../../src/lib/fen";
for (const card of ["op_airmail", "ov_backwards_hat"]) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 2);
  enableDraftMode(g, 2, { mode: "buff" });
  g.board = fenToBoard("rn2k3/PP6/8/8/8/8/8/4K3 w - - 0 1")!;
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  acquireBuff(g, "w", card, 1 as any);
  const via = legalMoves(g).filter((m) => m.via);
  console.log(card, via.map((m) => `${moveToUCI(m)}(cap=${m.captured},promo=${m.promotion})`).join(" "));
  const m = via.find((x) => !x.promotion);
  if (m) { playMove(g, m); console.log("  after", boardToFen(g.board)); }
}
