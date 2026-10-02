import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { acquireBuff, enableDraftMode, gameInCheck, legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
const cands = ALL_BUFFS.filter((b: any) => b.augmentMoves && !isRetired(b.id));
console.log("active cards with augmentMoves:", cands.length);
const lines = [["d2d3","d7d6"],["e2e4","e7e5","g1f3","b8c6"],["d2d4","d7d5","c2c4","e7e6","b1c3","g8f6"]];
const mutating = new Set<string>(); let errs = 0;
for (const b of cands) {
  for (const seq of lines) {
    for (let k = 0; k <= seq.length; k++) {
      try {
        const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 7);
        enableDraftMode(g, 7, { mode: "buff" });
        const clr = () => { for (const c of ["w","b"] as const) g.buffs!.players[c].offer = null; };
        clr(); acquireBuff(g, "w", b.id, (b as any).tier);
        for (let i = 0; i < k; i++) { clr(); const m = legalMoves(g).find(x => moveToUCI(x) === seq[i]); if (!m) break; playMove(g, m); }
        const snap = JSON.stringify(g.buffs!.players.w.buffs);
        gameInCheck(g, "b"); gameInCheck(g, "w");
        if (JSON.stringify(g.buffs!.players.w.buffs) !== snap) mutating.add(b.id);
      } catch (e) { errs++; }
    }
  }
}
console.log("mutating:", [...mutating].join(", ") || "none", "errs", errs);
