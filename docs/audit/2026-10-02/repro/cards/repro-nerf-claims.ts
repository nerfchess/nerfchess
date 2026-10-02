// Do nerf-mode boons/items honour the text of own_half_only ("Spawned pieces and
// teleports can't bypass the boundary") and total_pacifism ("No card effect can
// capture on your behalf")? Grant every nerf-mode card to the nerfed side, aim
// its picks at the enemy half / enemy pieces, and see what happens.
import { newGame, enableDraftMode, legalMoves, playMove, acquireBuff, buffNextTarget, activateBuff, NerfGame } from "../../../../../src/engine/game";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { IMPLEMENTED_BY_ID } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
import { RNG } from "../../../../../src/engine/rng";
const pool = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && (isBoon(b) || b.category === "item") && !b.opener && b.tier <= 8);
console.log("nerf-mode boon/item pool:", pool.length);
for (const nerfId of ["own_half_only", "total_pacifism"]) {
  const viol: string[] = [];
  for (const def of pool) {
    for (let s = 0; s < 3; s++) {
      const rng = new RNG(31 + s);
      let g: NerfGame = newGame(IMPLEMENTED_BY_ID[nerfId], IMPLEMENTED_BY_ID["heavy_boots"], 5 + s);
      enableDraftMode(g, 9 + s, { mode: "nerf" });
      g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
      // a few plies so pieces are developed
      for (let i = 0; i < 6 && !g.result; i++) { const lm = legalMoves(g); g = playMove(g, rng.pick(lm)); }
      if (g.result || g.board.turn !== "w") continue;
      const capBefore = Object.values(g.captured.w).reduce((a, b) => a + b, 0);
      acquireBuff(g, "w", def.id, def.tier);
      const idx = g.buffs!.players.w.buffs.length - 1;
      if (def.kind === "activated" && !g.result) {
        const picks: any[] = [];
        for (let k = 0; k < 12; k++) {
          const t = buffNextTarget(g, "w", idx, picks); if (!t) break;
          if (t.kind === "square") { if (!t.squares.length) break; const far = t.squares.filter((q) => (q >> 3) >= 4); const enemy = t.squares.filter((q) => g.board.pieces[q]?.color === "b"); picks.push({ square: rng.pick(far.length ? far : enemy.length ? enemy : t.squares) }); }
          else { if (!t.options.length) break; picks.push({ buffIndex: t.options[0].index }); }
        }
        if (picks.length) activateBuff(g, "w", idx, picks);
      }
      for (let i = 0; i < 4 && !g.result; i++) { const lm = legalMoves(g); if (!lm.length) break; g = playMove(g, rng.pick(lm)); }
      if (nerfId === "own_half_only") {
        const over = g.board.pieces.map((p, q) => (p && p.color === "w" && (q >> 3) >= 4 ? q : -1)).filter((q) => q >= 0);
        if (over.length) { viol.push(`${def.id}(${def.category} t${def.tier})`); break; }
      } else {
        const capAfter = Object.values(g.captured.w).reduce((a, b) => a + b, 0);
        const moveCaps = g.board.history.filter((m) => m.color === "w" && m.captured).length;
        if (capAfter - capBefore > moveCaps - 0) { viol.push(`${def.id}(${def.category} t${def.tier})`); break; }
      }
    }
  }
  console.log(`${nerfId}: ${viol.length} cards break the text: ${viol.join(", ")}`);
}
