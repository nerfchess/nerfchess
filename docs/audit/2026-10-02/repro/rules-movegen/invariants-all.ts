// Move-list invariant fuzz across every buff augmentMoves generator and every
// nerf filterMoves, through the REAL legalMoves pipeline.
//
// For each card x position x colour: build a game, hand the card to the side to
// move (buff) or make it that side's nerf, try to activate (first candidate per
// step), then check every legal move for:
//   OFFBOARD     from/to not an integer in 0..63
//   NO_PIECE     non-drop move from an empty square / enemy piece / wrong type
//   OWN_CAPTURE  destination (or capturedSquare) holds the mover's own piece
//   CAP_MISMATCH captured/capturedSquare disagrees with the board
//   PAWN_BACK    pawn lands on rank 1/8 with no promotion
//   BAD_PROMO    promotion to p/k, or a non-pawn promoting
//   UCI_DUP      two moves share a UCI string but differ in semantics (the
//                wire protocol keys moves by UCI: moveByUci picks the first)
//   UCI_FALLBACK moveFromUCI (client raw fallback) infers different semantics
//   NOOP         playMove leaves the board unchanged (makeMove refusal)
//   NERF_ADDS    a nerf filter returned a move that was not in its input
// usage: tsx invariants.ts [buffs|nerfs|all] [--play]
import {
  newGame, enableDraftMode, acquireBuff, activateBuff, makeBuffApi, legalMoves, playMove,
  UNRESTRICTED_NERF, serializeGame, deserializeGame, makeContext,
} from "../../../../../src/engine/game";
import { moveFromUCI, moveToUCI, generateMoves } from "../../../../../src/engine/board";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { Buff, BuffInstance, BuffPick } from "../../../../../src/engine/buff";
import type { Color, Move } from "../../../../../src/engine/types";

const which = process.argv[2] ?? "all";
const PLAY = process.argv.includes("--play");

type PosSpec = { name: string; moves?: string[]; fen?: string };
const POS: PosSpec[] = [
  { name: "start", moves: [] },
  { name: "middlegame", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "d2d3", "f8c5", "b1c3", "d7d6"] },
  { name: "open", moves: ["e2e4", "e7e5", "d2d4", "e5d4", "d1d4", "b8c6", "d4e3", "g8f6", "b1c3", "f8b4", "c1d2", "e8g8", "e1c1", "d7d5", "e4d5", "f6d5", "c3d5", "d8d5", "e3d5", "b4d2"] },
  { name: "ep", moves: ["e2e4", "a7a6", "e4e5", "d7d5"] },
  { name: "castle", fen: "r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1" },
  { name: "promo", fen: "r1n1k2r/1P4P1/8/3p4/8/8/1p4p1/R1N1K2R w KQkq - 0 1" },
  { name: "edge", fen: "7k/P6p/1p4P1/p6P/P6p/1P4p1/p6P/K7 w - - 0 1" },
];

function build(spec: PosSpec, color: Color, nerfId?: string) {
  const nerf = nerfId ? ALL_NERFS.find((n) => n.id === nerfId)! : UNRESTRICTED_NERF;
  const g = newGame(color === "w" ? nerf : UNRESTRICTED_NERF, color === "b" ? nerf : UNRESTRICTED_NERF, 7);
  if (!nerfId) enableDraftMode(g, 7, { mode: "buff" });
  if (spec.fen) {
    g.board = fenToBoard(spec.fen)!;
  } else {
    for (const uci of spec.moves!) {
      const m = legalMoves(g).find((x) => moveToUCI(x) === uci) ?? moveFromUCI(g.board, uci)!;
      playMove(g, m);
    }
  }
  if (g.board.turn !== color) {
    // hand the move to `color` without changing the position
    g.board.turn = color;
    g.board.epTarget = null;
  }
  // a buff-mode game rolls an opener offer; clear offers so nothing blocks
  if (g.buffs) for (const c of ["w", "b"] as Color[]) g.buffs.players[c].offer = null;
  return g;
}

function tryActivate(game: any, def: Buff, inst: BuffInstance, color: Color): string {
  if (def.kind !== "activated") return "n/a";
  const idx = game.buffs.players[color].buffs.indexOf(inst);
  const picks: BuffPick[] = [];
  for (let step = 0; step < 6; step++) {
    let t;
    try { t = def.targets?.(inst, makeBuffApi(game, color), picks) ?? null; } catch { return "targets threw"; }
    if (!t) break;
    if (t.kind === "square") { if (!t.squares.length) return "no candidates"; picks.push({ square: t.squares[0] }); }
    else { if (!t.options.length) return "no candidates"; picks.push({ buffIndex: t.options[0].index }); }
  }
  try { return activateBuff(game, color, idx, picks) ? "activated" : "refused"; } catch (e) { return "threw"; }
}

type Finding = { card: string; pos: string; color: Color; kind: string; detail: string };
const findings: Finding[] = [];
const seen = new Set<string>();
function report(f: Finding) {
  const k = `${f.card}|${f.kind}`;
  if (seen.has(k)) return; // one example per card per kind
  seen.add(k);
  findings.push(f);
}

const sem = (m: Move) => JSON.stringify([m.castle ?? null, !!m.isEnPassant, !!m.isDoublePawn, m.captured ?? null, m.capturedSquare ?? null, m.drop ?? null]);

function check(card: string, spec: PosSpec, color: Color, game: any, moves: Move[]) {
  const b = game.board;
  const byUci = new Map<string, Move>();
  for (const m of moves) {
    const u = moveToUCI(m);
    const ok = (s: number) => Number.isInteger(s) && s >= 0 && s < 64;
    if (!ok(m.from) || !ok(m.to)) { report({ card, pos: spec.name, color, kind: "OFFBOARD", detail: JSON.stringify(m) }); continue; }
    if (!m.drop) {
      const p = b.pieces[m.from];
      if (!p || p.color !== color || p.type !== m.piece) report({ card, pos: spec.name, color, kind: "NO_PIECE", detail: `${u} piece=${m.piece} board=${JSON.stringify(p)}` });
    }
    const t = b.pieces[m.to];
    if (t && t.color === color && !m.drop && m.from !== m.to) report({ card, pos: spec.name, color, kind: "OWN_CAPTURE", detail: `${u} lands on own ${t.type} (via=${m.via ?? "-"})` });
    if (m.from === m.to && !m.drop) report({ card, pos: spec.name, color, kind: "NULL_MOVE", detail: `${u} via=${m.via ?? "-"}` });
    const capSq = m.capturedSquare ?? (m.captured ? m.to : null);
    if (capSq != null) {
      const c = b.pieces[capSq];
      if (!c || c.color === color || c.type !== m.captured) report({ card, pos: spec.name, color, kind: "CAP_MISMATCH", detail: `${u} captured=${m.captured} at ${capSq} board=${JSON.stringify(c)} via=${m.via ?? "-"}` });
    } else if (t && t.color !== color && !m.drop) {
      report({ card, pos: spec.name, color, kind: "CAP_MISMATCH", detail: `${u} lands on enemy ${t.type} but captured unset (via=${m.via ?? "-"})` });
    }
    const lastRank = m.to >> 3 === 7 || m.to >> 3 === 0;
    const pieceAfter = m.promotion ?? m.piece;
    if (m.piece === "p" && !m.drop && lastRank && !m.promotion) report({ card, pos: spec.name, color, kind: "PAWN_BACK", detail: `${u} pawn lands on rank ${(m.to >> 3) + 1} unpromoted (via=${m.via ?? "-"})` });
    if (m.promotion && (m.piece !== "p" || m.promotion === "p" || m.promotion === "k")) report({ card, pos: spec.name, color, kind: "BAD_PROMO", detail: `${u} piece=${m.piece} promo=${m.promotion}` });
    void pieceAfter;
    const prev = byUci.get(u);
    if (prev && sem(prev) !== sem(m)) report({ card, pos: spec.name, color, kind: "UCI_DUP", detail: `${u}: first=${sem(prev)} via=${prev.via ?? "-"} second=${sem(m)} via=${m.via ?? "-"}` });
    if (!prev) byUci.set(u, m);
    // the client raw fallback (moveFromUCI) must infer the same semantics
    if (!m.drop) {
      const raw = moveFromUCI(b, u);
      const first = byUci.get(u)!;
      if (raw && first === m && sem(raw) !== sem(m)) report({ card, pos: spec.name, color, kind: "UCI_FALLBACK", detail: `${u} engine=${sem(m)} moveFromUCI=${sem(raw)} via=${m.via ?? "-"}` });
    }
  }
  if (PLAY) {
    const snap = serializeGame(game);
    for (const m of moves) {
      const g2 = deserializeGame(JSON.parse(JSON.stringify(snap)));
      if (!g2) { report({ card, pos: spec.name, color, kind: "SNAPSHOT", detail: "deserialize failed" }); break; }
      const before = JSON.stringify(g2.board.pieces);
      const hist = g2.board.history.length;
      try { playMove(g2, m); } catch (e) { report({ card, pos: spec.name, color, kind: "PLAY_THREW", detail: `${moveToUCI(m)} ${(e as Error).message}` }); continue; }
      if (JSON.stringify(g2.board.pieces) === before && g2.board.history.length === hist) report({ card, pos: spec.name, color, kind: "NOOP", detail: `${moveToUCI(m)} via=${m.via ?? "-"}` });
      for (let sq = 0; sq < 64; sq++) {
        const p = g2.board.pieces[sq];
        if (p && p.type === "p" && (sq >> 3 === 0 || sq >> 3 === 7)) { report({ card, pos: spec.name, color, kind: "PAWN_ON_BACKRANK_AFTER", detail: `${moveToUCI(m)} via=${m.via ?? "-"} pawn on ${sq}` }); break; }
      }
    }
  }
}

let probed = 0;
if (which === "buffs" || which === "all") {
  const defs = ALL_BUFFS.filter((d) => d.augmentMoves && d.implemented !== false);
  console.log(`buffs with augmentMoves: ${defs.length}`);
  for (const def of defs) {
    for (const spec of POS) for (const color of ["w", "b"] as Color[]) {
      try {
        const g = build(spec, color);
        acquireBuff(g, color, def.id, def.tier);
        const inst = g.buffs!.players[color].buffs.find((x) => x.id === def.id);
        if (!inst) continue;
        tryActivate(g, def, inst, color);
        if (g.result) continue;
        g.board.turn = color;
        for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null;
        const moves = legalMoves(g);
        probed++;
        check(def.id, spec, color, g, moves);
      } catch (e) {
        report({ card: def.id, pos: spec.name, color, kind: "THREW", detail: (e as Error).message.slice(0, 80) });
      }
    }
  }
}
if (which === "nerfs" || which === "all") {
  const nerfs = ALL_NERFS.filter((n) => n.filterMoves && n.implemented);
  console.log(`nerfs with filterMoves: ${nerfs.length}`);
  for (const n of nerfs) {
    for (const spec of POS) for (const color of ["w", "b"] as Color[]) {
      try {
        const g = build(spec, color, n.id);
        const slot = color === "w" ? g.white : g.black;
        // the raw filter must only remove moves
        const input = generateMoves(g.board);
        const out = n.filterMoves!(input.slice(), slot.state, makeContext(g, color));
        for (const m of out) if (!input.includes(m)) { report({ card: n.id, pos: spec.name, color, kind: "NERF_ADDS", detail: moveToUCI(m) }); break; }
        const moves = legalMoves(g);
        probed++;
        check(n.id, spec, color, g, moves);
      } catch (e) {
        report({ card: n.id, pos: spec.name, color, kind: "THREW", detail: (e as Error).message.slice(0, 80) });
      }
    }
  }
}
console.log(`probed ${probed} card/position/colour cases; findings ${findings.length}`);
const byKind = new Map<string, Finding[]>();
for (const f of findings) byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), f]);
for (const [k, fs] of byKind) {
  console.log(`\n== ${k}: ${fs.length} cards`);
  for (const f of fs) console.log(`  ${f.card} [${f.pos}/${f.color}] ${f.detail}`);
}
