// Interaction probe: does a card that "removes"/"destroys" enemy pieces respect an
// enemy "cannot be captured" shield? Black gets a whole-army shield; white plays
// each live activated/instant attack card aimed at black pieces.
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff, buffNextTarget, activateBuff, NerfGame } from "../../../../../src/engine/game";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { RNG } from "../../../../../src/engine/rng";
const cards = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && b.category === "attack" && b.kind !== "passive" && b.tier <= 10);
const respects: string[] = [], ignores: string[] = [];
for (const def of cards) {
  let g: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
  enableDraftMode(g, 4, { mode: "buff" });
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  const rng = new RNG(5);
  for (const u of [12, 52, 11, 51]) { /* open a bit */ }
  for (let i = 0; i < 6; i++) g = playMove(g, rng.pick(legalMoves(g)));
  if (g.board.turn !== "w") continue;
  g.buffs!.effects.push({ kind: "shield", owner: "b", squares: null, turns: 5 });
  const before = g.board.pieces.filter((p) => p && p.color === "b").length;
  acquireBuff(g, "w", def.id, def.tier);
  const idx = g.buffs!.players.w.buffs.length - 1;
  if (def.kind === "activated") {
    const picks: any[] = [];
    for (let k = 0; k < 10; k++) { const t = buffNextTarget(g, "w", idx, picks); if (!t) break; if (t.kind !== "square" || !t.squares.length) break; const enemy = t.squares.filter((q) => g.board.pieces[q]?.color === "b" && g.board.pieces[q]?.type !== "k"); picks.push({ square: (enemy.length ? enemy : t.squares)[0] }); }
    if (!picks.length) continue;
    activateBuff(g, "w", idx, picks);
  }
  const after = g.board.pieces.filter((p) => p && p.color === "b").length;
  (after < before ? ignores : respects).push(def.id);
}
console.log(`attack cards probed: ${cards.length}; removed a SHIELDED enemy piece: ${ignores.length}; did not: ${respects.length}`);
console.log("ignores shield, e.g.:", ignores.slice(0, 20).join(", "));
