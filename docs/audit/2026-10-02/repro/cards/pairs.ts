// Pairwise interaction matrix over N sampled live cards: white holds A, black B
// (both acquired through the real draft pick), random play + random activations.
import { RNG } from "../../../../../src/engine/rng";
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, buffNextTarget, activateBuff, NerfGame } from "../../../../../src/engine/game";
import { ALL_BUFFS, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { Color, RANK } from "../../../../../src/engine/types";
const N = Number(process.argv[2] ?? 50);
const live = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && !b.opener && b.category !== "hex" && b.category !== "nerf");
const rs = new RNG(424242); const sample: typeof live = [];
while (sample.length < N) { const c = rs.pick(live); if (!sample.includes(c)) sample.push(c); }
const issues: Record<string, string[]> = {};
const note = (k: string, s: string) => { (issues[k] ??= []); if (issues[k].length < 12) issues[k].push(s); };
const t0 = Date.now(); let pairs = 0, plies = 0, throws = 0;
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  if (i === j) continue;
  const A = sample[i], B = sample[j]; pairs++;
  const rng = new RNG(i * 1000 + j + 7);
  let g: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, i * 31 + j);
  enableDraftMode(g, i * 17 + j + 1, { mode: "buff", cadence: 1 });
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  let got = false;
  try {
    for (let ply = 0; ply < 34 && !g.result; ply++) {
      for (const c of ["w", "b"] as Color[]) { const ps = g.buffs!.players[c]; if (!ps.offer) continue; if (!got) { const d = c === "w" ? A : B; ps.offer = { ...ps.offer, cards: [{ id: d.id, tier: d.tier }] }; pickDraftCard(g, c, 0); } else ps.offer = null; }
      got = true;
      if (g.result) break;
      const me = g.board.turn;
      if (rng.next() < 0.5) { const list = g.buffs!.players[me].buffs; const k = list.findIndex((x) => !x.spent && !x.nullified && !x.usedActivation && BUFF_BY_ID[x.id]?.kind === "activated");
        if (k >= 0) { const picks: any[] = []; for (let s = 0; s < 12; s++) { const t = buffNextTarget(g, me, k, picks); if (!t) break; if (t.kind === "square") { if (!t.squares.length) break; picks.push({ square: rng.pick(t.squares) }); } else { if (!t.options.length) break; picks.push({ buffIndex: rng.pick(t.options).index }); } }
          if (picks.length || !BUFF_BY_ID[list[k].id].targets) activateBuff(g, me, k, picks); } }
      if (g.result) break;
      const lm = legalMoves(g);
      if (!lm.length) { note("NO_MOVES_NO_RESULT", `${A.id} x ${B.id}`); break; }
      g = playMove(g, rng.pick(lm)); plies++;
      for (let sq = 0; sq < 64; sq++) { const p = g.board.pieces[sq]; if (p?.type === "p" && (RANK(sq) === 0 || RANK(sq) === 7)) { note("PAWN_BACK_RANK", `${A.id} x ${B.id}`); break; } }
      const kc = { w: 0, b: 0 } as Record<Color, number>; for (const p of g.board.pieces) if (p?.type === "k") kc[p.color]++;
      for (const c of ["w", "b"] as Color[]) if (kc[c] > 1 && !g.buffs!.players[c].buffs.some((x) => x.id === "second_king")) note("EXTRA_KING", `${A.id} x ${B.id}`);
      if (!g.result && (kc.w === 0 || kc.b === 0)) note("NO_KING_NO_RESULT", `${A.id} x ${B.id}`);
    }
  } catch (e: any) { throws++; note("THROW", `${A.id} x ${B.id}: ${e?.message}`); }
}
console.log(JSON.stringify({ cards: N, orderedPairs: pairs, plies, throws, secs: (Date.now() - t0) / 1000, issues }, null, 1));
