
import { FILE, RANK, type BoardState, type Color, type Square } from "../../../../../src/engine/types.ts";
type PieceAnim = { dxCells: number; dyCells: number };
interface BoardFx { kind: "morph" | "summon" | "detonate"; crown?: boolean; key: number; sig?: string; sigOrder?: number; sigRole?: "lead" | "target"; sigGeo?: unknown }
const resolveSignature = (_id: string): any => undefined;
function orderSignature(..._a: any[]): any { return { targets: [], leadSq: null, legs: [], casterColor: null }; }
export function computeAnims(
  prev: BoardState["pieces"],
  next: BoardState["pieces"],
  orientation: Color,
  skipSquare: Square | null,
): { anims: Map<Square, PieceAnim>; movedFrom: Set<Square> } {
  const anims = new Map<Square, PieceAnim>();
  // Every vanished square matched to an arrival: these pieces MOVED (slide,
  // castle, drag drop), so the detonation pass below must never mistake
  // their empty origin squares for card removals.
  const movedFrom = new Set<Square>();
  const vanished: Square[] = [];
  const appeared: Square[] = [];
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (a && (!b || a.type !== b.type || a.color !== b.color)) vanished.push(sq);
    if (b && (!a || a.type !== b.type || a.color !== b.color)) appeared.push(sq);
  }
  // A flood of changes is a reset (new game, history jump), not a move.
  if (appeared.length === 0 || appeared.length > 6) return { anims, movedFrom };
  for (const to of appeared) {
    const piece = next[to]!;
    let best: Square | null = null;
    let bestDist = Infinity;
    for (const from of vanished) {
      if (movedFrom.has(from)) continue;
      const q = prev[from]!;
      if (q.type !== piece.type || q.color !== piece.color) continue;
      const d = (FILE(from) - FILE(to)) ** 2 + (RANK(from) - RANK(to)) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = from;
      }
    }
    if (best == null) continue;
    movedFrom.add(best);
    if (to === skipSquare) continue; // drag drops land instantly (still a move)
    let dxCells = FILE(best) - FILE(to);
    let dyCells = RANK(to) - RANK(best);
    if (orientation === "b") {
      dxCells = -dxCells;
      dyCells = -dyCells;
    }
    anims.set(to, { dxCells, dyCells });
  }
  return { anims, movedFrom };
}
export function computeBoardFx(
  prev: BoardState["pieces"],
  next: BoardState["pieces"],
  anims: Map<Square, PieceAnim>,
  movedFrom: Set<Square>,
  skipSquare: Square | null,
  capturedSquare: Square | null,
  seq: { current: number },
  signatureId: string | null,
  orientation: Color,
  casterHint: Color | null,
): Map<Square, BoardFx> {
  const fx = new Map<Square, BoardFx>();
  const sig = signatureId ? resolveSignature(signatureId) ?? null : null;
  let appeared = 0;
  let vanishedCount = 0;
  const lostColor: Record<Color, boolean> = { w: false, b: false };
  for (let sq = 0; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (b && (!a || a.type !== b.type || a.color !== b.color)) appeared++;
    if (a && (!b || a.type !== b.type || a.color !== b.color)) {
      lostColor[a.color] = true;
      vanishedCount++;
    }
  }
  // Same reset guard as computeAnims: a flood of changes is a new game or a
  // history jump, not a move, so play nothing. Unlike the slide matcher,
  // appeared can be zero here: an attack card can clear pieces without
  // anything arriving (that is exactly the detonation case). A signature
  // spectacle (Extinction, Cataclysm) can legitimately clear a whole rank of
  // pieces at once, so the vanished cap is relaxed while one is known.
  if (appeared > 6 || vanishedCount > (sig ? 20 : 10)) return fx;
  // Unexplained arrivals per color: a piece that appeared without a matched
  // slide is a transform-in-motion (promotion) or a summon; either way its
  // color's unmatched DEPARTURE is that same piece changing form, never a
  // detonation.
  const gainedColor: Record<Color, boolean> = { w: false, b: false };
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (b && (!a || a.type !== b.type || a.color !== b.color) && !anims.has(sq) && sq !== skipSquare) {
      gainedColor[b.color] = true;
    }
  }
  // An enemy pawn that just landed directly beside the file-forward edge of
  // a vanished pawn is an en-passant-style capture, not a card removal.
  // Real games already exclude these via capturedSquare; this covers the
  // premove preview boards, whose lastMove is still the opponent's.
  const epStyleCapture = (sq: Square, victimColor: Color): boolean => {
    for (const d of [-8, 8]) {
      const n = sq + d;
      if (n < 0 || n > 63) continue;
      const q = next[n];
      if (q && q.type === "p" && q.color !== victimColor && prev[n]?.type !== "p") return true;
    }
    return false;
  };
  let morphUsed = false; // one transform flourish per move, max
  let summons = 0;
  // Detonation squares collected first, then either dressed as a signature
  // sequence (when the played card id is known) or emitted as plain bursts.
  const detSquares: Square[] = [];
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (!b) {
      // Detonation: a piece vanished with nothing landing on its square, no
      // matched move away (movedFrom), no capture recorded there (en
      // passant and skid captures clear a square besides the destination),
      // and no unexplained same-color arrival elsewhere (promotion-style
      // form changes): an attack card removed it outright, so it goes out
      // with a bang instead of silently blinking away.
      if (
        a &&
        !movedFrom.has(sq) &&
        sq !== capturedSquare &&
        !gainedColor[a.color] &&
        !(a.type === "p" && epStyleCapture(sq, a.color))
      ) {
        detSquares.push(sq);
      }
      continue;
    }
    if (a && a.color === b.color && a.type !== b.type) {
      // In-place type change (setPieceType buffs: Amazon-style upgrades).
      if (!morphUsed) {
        fx.set(sq, { kind: "morph", crown: b.type === "q", key: ++seq.current });
        morphUsed = true;
      }
    } else if (a && a.color !== b.color && !anims.has(sq) && sq !== skipSquare) {
      // In-place COLOUR change (setPieceColor buffs: conversion / mind-control):
      // the piece stayed put but switched sides without any slide landing on
      // it. Left alone this is a silent ownership flip; dress it with the same
      // transform flourish + piece pop so the board never quietly re-colours a
      // piece. Guarded by !anims.has(sq): an ordinary capture lands via a slide
      // (that square is in anims), so this never misfires on a normal take. No
      // crown: a conversion is not a promotion.
      if (!morphUsed) {
        fx.set(sq, { kind: "morph", crown: false, key: ++seq.current });
        morphUsed = true;
      }
    } else if (!a && !anims.has(sq) && sq !== skipSquare) {
      if (lostColor[b.color]) {
        // A same-colour piece vanished elsewhere: this is a piece that moved
        // while changing type (promotion-style), not a summon.
        if (!morphUsed) {
          fx.set(sq, { kind: "morph", crown: b.type === "q", key: ++seq.current });
          morphUsed = true;
        }
      } else if (summons < 4) {
        // Nothing of this colour left the board: a genuine summon.
        fx.set(sq, { kind: "summon", key: ++seq.current });
        summons++;
      }
    }
  }
  // Dress the detonations. When the played card's id is a known signature, its
  // owned victim squares roll out as a staggered choreography (with an
  // optional lead flourish); any leftover cleared squares, plus the whole set
  // when no signature is known, fall back to the generic burst (capped so a
  // freak clear never floods the board).
  const claimed = new Set<Square>();
  if (sig) {
    const { targets, leadSq, legs, casterColor } = orderSignature(
      signatureId!,
      detSquares,
      prev,
      movedFrom,
      capturedSquare,
      orientation,
      casterHint,
    );
    for (const t of targets) {
      claimed.add(t.sq);
      fx.set(t.sq, {
        kind: "detonate",
        key: ++seq.current,
        sig: signatureId!,
        sigOrder: t.order,
        sigRole: t.role,
        sigGeo: geoForSquare(t.sq, legs, targets.length, t.order, orientation, casterColor),
      });
    }
    if (leadSq != null && !fx.has(leadSq)) {
      fx.set(leadSq, {
        kind: "detonate",
        key: ++seq.current,
        sig: signatureId!,
        sigOrder: 0,
        sigRole: "lead",
        sigGeo: geoForSquare(leadSq, legs, targets.length, 0, orientation, casterColor),
      });
    }
  }
  let plain = 0;
  for (const sq of detSquares) {
    if (claimed.has(sq)) continue;
    if (plain >= 6) break;
    fx.set(sq, { kind: "detonate", key: ++seq.current });
    plain++;
  }
  return fx;
}
