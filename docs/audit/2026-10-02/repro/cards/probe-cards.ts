// Per-card attribution probe: each live buff alone (no nerfs), acquired through
// the REAL draft path (pickDraftCard on the draft round, white to move) by either
// colour, then random play with random activations. Any invariant break is
// attributed to that single card.
import { RNG } from "../../../../../src/engine/rng";
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, pickDraftCard, buffNextTarget, activateBuff, NerfGame } from "../../../../../src/engine/game";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { Color, RANK } from "../../../../../src/engine/types";
import fs from "node:fs";
const SEEDS = Number(process.argv[2] ?? 6);
const PLIES = Number(process.argv[3] ?? 36);
const LIVE = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && !b.opener);
const res: Record<string, Record<string, string>> = {};
const add = (id: string, kind: string, detail: string) => { (res[id] ??= {}); if (!res[id][kind]) res[id][kind] = detail; };
function inv(g: NerfGame, id: string, ctx: string, maxK: number) {
  const b = g.board; const k = { w: 0, b: 0 } as Record<Color, number>;
  for (let sq = 0; sq < 64; sq++) { const p = b.pieces[sq]; if (!p) continue; if (p.type === "k") k[p.color]++; if (p.type === "p" && (RANK(sq) === 0 || RANK(sq) === 7)) add(id, "PAWN_BACK_RANK", `${ctx}: ${p.color} pawn on sq ${sq}`); }
  for (const c of ["w", "b"] as Color[]) { if (k[c] > maxK) add(id, "EXTRA_KING", `${ctx}: ${c} has ${k[c]} kings`); if (k[c] === 0 && !g.result) add(id, "NO_KING_NO_RESULT", ctx); }
  for (const e of g.buffs?.effects ?? []) if ((e.kind === "freeze" || e.kind === "walnut") && !g.result) { const p = b.pieces[e.sq]; if (!p || p.color !== e.owner) add(id, "ORPHAN_EFFECT", `${ctx}: ${e.kind} on ${e.sq}`); else if (p.type === "k" && (e.turns as number) > 0) add(id, "KING_FROZEN", `${ctx}: ${e.kind} on king ${e.sq}`); }
  if (g.result) return;
  const lm = legalMoves(g);
  if (lm.length === 0) add(id, "NO_MOVES_NO_RESULT", `${ctx}: ${b.turn} has 0 legal moves, no result`);
  for (const m of lm) {
    if (m.drop) continue;
    const p = b.pieces[m.from]; if (!p) { add(id, "MOVE_FROM_EMPTY", `${ctx}: ${JSON.stringify(m)}`); continue; }
    if (p.color !== b.turn) add(id, "MOVE_ENEMY_PIECE", `${ctx}: ${JSON.stringify(m)}`);
    if (p.type !== m.piece) add(id, "MOVE_PIECE_MISLABEL", `${ctx}: actual ${p.type} labelled ${m.piece} via ${m.via ?? "-"}`);
    const at = b.pieces[m.to]; const capSq = m.capturedSquare ?? m.to; const tgt = b.pieces[capSq];
    if (at && at.color === p.color && !m.castle) add(id, "OWN_CAPTURE", `${ctx}: ${JSON.stringify(m)}`);
    if (!m.captured && at && at.color !== p.color) add(id, "UNLABELED_CAPTURE", `${ctx}: ${m.from}->${m.to} onto ${at.type} via ${m.via ?? "-"}`);
    if (m.captured && (!tgt || tgt.color === p.color)) add(id, "PHANTOM_CAPTURE", `${ctx}: ${JSON.stringify(m)}`);
    if (m.captured && tgt && tgt.type !== m.captured) add(id, "CAPTURE_MISLABEL", `${ctx}: labelled ${m.captured} actual ${tgt.type}`);
    if (p.type === "p" && !m.promotion && (RANK(m.to) === 0 || RANK(m.to) === 7)) add(id, "PAWN_NO_PROMO", `${ctx}: ${m.from}->${m.to} via ${m.via ?? "-"}`);
  }
}
function picksFor(g: NerfGame, c: Color, idx: number, rng: RNG) {
  const picks: any[] = [];
  for (let s = 0; s < 20; s++) { const t = buffNextTarget(g, c, idx, picks); if (!t) return picks;
    if (t.kind === "square") { if (!t.squares.length) return t.finishable && picks.length ? picks : null; picks.push({ square: rng.pick(t.squares) }); }
    else { if (!t.options.length) return picks.length ? picks : null; picks.push({ buffIndex: rng.pick(t.options).index }); } }
  return picks;
}
const t0 = Date.now();
let n = 0;
for (const def of LIVE) {
  const mode = def.category === "hex" || def.category === "nerf" ? "nerf" : "buff";
  const maxK = def.id === "second_king" ? 2 : 1;
  for (let s = 0; s < SEEDS; s++) {
    const rng = new RNG(1000 + s * 7919 + n);
    const owner: Color = s % 2 === 0 ? "b" : "w";
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 50 + s);
    enableDraftMode(g, 99 + s, { mode, cadence: 1 + (s % 3) * 2 });
    g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
    let acquired = false; let ctx = "";
    try {
      for (let ply = 0; ply < PLIES + 12 && !g.result; ply++) {
        // resolve offers: owner takes the card under test at the first draft round; otherwise first card
        for (const c of ["w", "b"] as Color[]) {
          const ps = g.buffs!.players[c];
          if (!ps.offer) continue;
          if (c === owner && !acquired) { ps.offer = { ...ps.offer, cards: [{ id: def.id, tier: def.tier }] }; pickDraftCard(g, c, 0); acquired = true; ctx = `seed${s} owner ${owner} acquired at ply ${g.board.history.length}`; inv(g, def.id, ctx + " (right after pick)", maxK); }
          else { ps.offer = null; }
        }
        if (g.result) break;
        const me = g.board.turn;
        if (acquired && rng.next() < 0.5) {
          const list = g.buffs!.players[me].buffs;
          const i = list.findIndex((x) => x.id === def.id && !x.spent && !x.nullified && !x.usedActivation);
          if (i >= 0 && def.kind === "activated") { const p = picksFor(g, me, i, rng); if (p) { activateBuff(g, me, i, p); inv(g, def.id, ctx + ` after activation ply ${g.board.history.length}`, maxK); if (g.result) break; } }
        }
        if (g.result) break;
        if (g.buffs!.players.w.offer || g.buffs!.players.b.offer) continue;
        const lm = legalMoves(g); if (!lm.length) { if (acquired) add(def.id, "NO_MOVES_NO_RESULT", ctx + ` before move ply ${g.board.history.length}`); break; }
        const caps = lm.filter((m) => m.captured);
        const m = caps.length && rng.next() < 0.3 ? rng.pick(caps) : rng.pick(lm);
        g = playMove(g, m);
        if (acquired) inv(g, def.id, ctx + ` after move ply ${g.board.history.length} ${m.from}->${m.to}${m.via ? " via " + m.via : ""}`, maxK);
      }
    } catch (e: any) { add(def.id, "THROW", `${ctx}: ${e?.message} ${(e?.stack ?? "").split("\n")[1] ?? ""}`); }
  }
  n++;
}
const kinds: Record<string, string[]> = {};
for (const [id, ks] of Object.entries(res)) for (const k of Object.keys(ks)) (kinds[k] ??= []).push(id);
fs.writeFileSync(__dirname + "/probe-out.json", JSON.stringify({ cards: LIVE.length, seeds: SEEDS, secs: (Date.now() - t0) / 1000, kinds, res }, null, 1));
console.log("cards", LIVE.length, "secs", (Date.now() - t0) / 1000);
for (const [k, ids] of Object.entries(kinds)) console.log(k, ids.length, ids.slice(0, 40).join(", "));
