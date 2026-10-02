import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { acquireBuff, enableDraftMode, legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
const cands = ALL_BUFFS.filter((b: any) => b.augmentMoves && !isRetired(b.id));
const seqs = [["e2e4","e7e5","g1f3","b8c6","f1c4","g8f6"],["d2d4","d7d5","c2c4","e7e6","b1c3","g8f6"]];
const hits = new Map<string,string>();
for (const b of cands) for (const seq of seqs) for (let k = 0; k <= seq.length; k += 2) {
  try {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
    enableDraftMode(g, 3, { mode: "buff" });
    const clr = () => { for (const c of ["w","b"] as const) g.buffs!.players[c].offer = null; };
    clr(); acquireBuff(g, "w", b.id, (b as any).tier);
    for (let i = 0; i < k; i++) { clr(); const m = legalMoves(g).find(x => moveToUCI(x) === seq[i]); if (!m) break; playMove(g, m); }
    clr();
    const lm = legalMoves(g); const seen = new Map<string, any>();
    for (const m of lm) { const u = moveToUCI(m); if (seen.has(u) && (seen.get(u).via ?? null) !== (m.via ?? null)) hits.set(b.id, `${u} via ${seen.get(u).via} / ${m.via}`); seen.set(u, m); }
  } catch {}
}
console.log("cards with same-UCI moves differing in via:", hits.size); for (const [k,v] of hits) console.log(k, v);
