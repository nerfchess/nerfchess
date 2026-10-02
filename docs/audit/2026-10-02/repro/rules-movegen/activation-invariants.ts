// Board invariants after every card's activation / instant effect / deferred
// hook, across a few positions. Checks:
//   KING_GONE     a king vanished without a king-capture move
//   PAWN_RANK     a pawn stands on rank 1 or 8 (the engine's stated invariant:
//                 helpers.ts pawnRankOk / relocate "Pawns can never stand on rank 1 or rank 8")
//   STALE_RIGHTS  a castling right is still set although its king left e1/e8 or
//                 its corner rook is gone (a later rook on that corner could castle)
// For activated cards every candidate at the FIRST pick step is tried (later
// steps take the first candidate). After the effect two quiet plies are played
// so deferred effects (swap after the opponent's reply...) fire.
import { newGame, enableDraftMode, acquireBuff, activateBuff, makeBuffApi, legalMoves, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { Color } from "../../../../../src/engine/types";

const FENS: Record<string, string> = {
  start: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  castleReady: "r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1",
  sparse: "r3k2r/1p4p1/8/8/8/8/1P4P1/R3K2R w KQkq - 0 1",
};
type F = { card: string; pos: string; kind: string; detail: string };
const out: F[] = [];
const seen = new Set<string>();
const rep = (f: F) => { const k = f.card + f.kind; if (!seen.has(k)) { seen.add(k); out.push(f); } };

function fresh(fen: string) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 9);
  enableDraftMode(g, 9, { mode: "buff" });
  g.board = fenToBoard(fen)!;
  for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null;
  return g;
}
function inspect(card: string, pos: string, g: any, kingCaptureSeen: boolean) {
  const b = g.board;
  const kings = { w: 0, b: 0 } as Record<Color, number>;
  for (let sq = 0; sq < 64; sq++) {
    const p = b.pieces[sq];
    if (!p) continue;
    if (p.type === "k") kings[p.color as Color]++;
    if (p.type === "p" && (sq >> 3 === 0 || sq >> 3 === 7)) rep({ card, pos, kind: "PAWN_RANK", detail: `${p.color} pawn on ${"abcdefgh"[sq & 7]}${(sq >> 3) + 1}` });
  }
  if ((kings.w === 0 || kings.b === 0) && !kingCaptureSeen) rep({ card, pos, kind: "KING_GONE", detail: `kings w=${kings.w} b=${kings.b} result=${JSON.stringify(g.result)}` });
  const c = b.castling;
  const at = (s: number, t: string, col: string) => b.pieces[s]?.type === t && b.pieces[s]?.color === col;
  const stale: string[] = [];
  if (c.wk && !(at(4, "k", "w") && at(7, "r", "w"))) stale.push("K");
  if (c.wq && !(at(4, "k", "w") && at(0, "r", "w"))) stale.push("Q");
  if (c.bk && !(at(60, "k", "b") && at(63, "r", "b"))) stale.push("k");
  if (c.bq && !(at(60, "k", "b") && at(56, "r", "b"))) stale.push("q");
  if (stale.length) rep({ card, pos, kind: "STALE_RIGHTS", detail: stale.join("") });
}

let runs = 0;
for (const def of ALL_BUFFS) {
  if (!def.implemented) continue;
  for (const [pos, fen] of Object.entries(FENS)) {
    const color: Color = "w";
    // enumerate first-step candidates for activated cards
    let firstCands: (number | null)[] = [null];
    if (def.kind === "activated") {
      const g0 = fresh(fen);
      acquireBuff(g0, color, def.id, def.tier);
      const inst0 = g0.buffs!.players[color].buffs.find((x) => x.id === def.id);
      if (!inst0) continue;
      try {
        const t = def.targets?.(inst0, makeBuffApi(g0, color), []) ?? null;
        if (t && t.kind === "square") firstCands = t.squares.length ? t.squares.slice(0, 64) : [null];
        else if (t) firstCands = t.options.length ? t.options.map((o) => o.index) : [null];
      } catch { continue; }
    }
    for (const first of firstCands) {
      runs++;
      try {
        const g = fresh(fen);
        acquireBuff(g, color, def.id, def.tier);
        const inst = g.buffs!.players[color].buffs.find((x) => x.id === def.id);
        if (!inst) break;
        if (def.kind === "activated") {
          const picks: any[] = [];
          for (let s = 0; s < 6; s++) {
            const t = def.targets?.(inst, makeBuffApi(g, color), picks) ?? null;
            if (!t) break;
            if (t.kind === "square") {
              const sq = s === 0 && first != null ? first : t.squares[0];
              if (sq == null) break;
              picks.push({ square: sq });
            } else {
              const ix = s === 0 && first != null ? first : t.options[0]?.index;
              if (ix == null) break;
              picks.push({ buffIndex: ix });
            }
          }
          activateBuff(g, color, g.buffs!.players[color].buffs.indexOf(inst), picks);
        }
        inspect(def.id, pos, g, false);
        // two quiet plies (non-capturing) so deferred hooks fire
        let kingCap = false;
        for (let i = 0; i < 2 && !g.result; i++) {
          for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null;
          const ms = legalMoves(g);
          const m = ms.find((x) => !x.captured && x.piece !== "k" && !x.via) ?? ms.find((x) => !x.captured) ?? ms[0];
          if (!m) break;
          if (m.captured === "k") kingCap = true;
          playMove(g, m);
        }
        inspect(def.id, pos, g, kingCap);
      } catch (e) {
        rep({ card: def.id, pos, kind: "THREW", detail: (e as Error).message.slice(0, 80) });
      }
    }
  }
}
console.log(`cards ${ALL_BUFFS.length}, runs ${runs}, findings ${out.length}`);
const by = new Map<string, F[]>();
for (const f of out) by.set(f.kind, [...(by.get(f.kind) ?? []), f]);
for (const [k, fs] of by) {
  const active = fs.filter((f) => !isRetired(f.card));
  console.log(`\n== ${k}: ${fs.length} cards (${active.length} not retired)`);
  for (const f of active.slice(0, 60)) console.log(`  ${f.card} [${f.pos}] ${f.detail}`);
}
