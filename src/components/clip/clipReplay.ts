// Pure data for the clip renderer: rebuild the boards for the last N plies
// and describe each ply as a piece diff the canvas can animate.
//
// The clip is a STYLIZED replay, not a recording of the live DOM: it reuses
// the same per-ply board snapshots history review trusts (which include any
// buff mutations — summons, removals, teleports), and where a snapshot is
// missing it bridges by replaying recorded moves onto the nearest earlier
// snapshot, exactly like the game page's review logic. Because each segment is
// derived by DIFFING two known-good boards (the move object is only a pairing
// hint), a ply whose move cannot be mechanically replayed still animates: the
// diff shows up as slides, spawns, and removals.

import { sanLabels } from "@/engine/board";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { boardAtPly, replayBoardSpan } from "@/lib/gameReview";
import type { BoardState, Move, Piece, Square } from "@/engine/types";
import { FILE, RANK } from "@/engine/types";

export type ClipPieces = (Piece | null)[];

/** A piece that slides from one square to another during a segment. */
export interface ClipPair {
  from: Square;
  to: Square;
  /** Piece as it looked before the ply (drawn while sliding). */
  before: Piece;
  /** Piece as it looks after (differs on promotion / transform buffs). */
  after: Piece;
  /** Enemy piece that stood on `to` and gets flashed away. */
  captured: Piece | null;
  /** True for the pairing derived from the recorded move itself. */
  primary: boolean;
}

/** One animated ply: the transition between two consecutive board states. */
export interface ClipSegment {
  /** 0-based index into the move history (the move that caused A -> B). */
  ply: number;
  /** "12. Qxf7" style label, or null when the ply had no recorded move. */
  label: string | null;
  pairs: ClipPair[];
  /** Pieces that appear from nowhere (drops, summons, revives). */
  spawns: { sq: Square; piece: Piece }[];
  /** Pieces that vanish without a mover landing on them (removals, en
   *  passant victims, buff deletions). */
  vanishes: { sq: Square; piece: Piece }[];
  /** Squares unchanged across the segment, drawn statically (from B). */
  statics: { sq: Square; piece: Piece }[];
  /** Card name to splash as a big banner over this segment, when known. */
  sigName: string | null;
}

export interface ClipTimeline {
  /** Ply the clip starts from (board state index, 0 = initial position). */
  startPly: number;
  initial: ClipPieces;
  final: ClipPieces;
  segments: ClipSegment[];
}

function samePiece(a: Piece | null, b: Piece | null): boolean {
  return !!a && !!b && a.type === b.type && a.color === b.color;
}

function clonePieces(pieces: (Piece | null)[]): ClipPieces {
  return pieces.map((p) => (p ? { ...p } : null));
}

/** Board pieces at `ply`, or null when the position cannot be reconstructed
 *  faithfully. Mirrors the game page's history-review derivation: exact
 *  snapshot first, then a bridge from the nearest earlier snapshot, then a
 *  clean replay from the start (only while no card rewrote the board). */
function piecesAtPly(
  ply: number,
  moves: Move[],
  snapshots: ReadonlyMap<number, BoardState>,
  historyDiverged: boolean,
): ClipPieces | null {
  const snap = snapshots.get(ply);
  if (snap) return clonePieces(snap.pieces);
  let baseKey = -1;
  for (const key of snapshots.keys()) {
    if (key < ply && key > baseKey) baseKey = key;
  }
  if (baseKey >= 0) {
    const bridged = replayBoardSpan(snapshots.get(baseKey)!, moves, baseKey, ply);
    // replayBoardSpan stops early (returning the last clean position) when a
    // move can't be reproduced; only trust a bridge that reached the target.
    if (bridged.history.length === ply) return clonePieces(bridged.pieces);
    return null;
  }
  if (historyDiverged) return null;
  const replayed = boardAtPly(moves, ply);
  if (replayed.history.length !== ply) return null;
  return clonePieces(replayed.pieces);
}

/** Diff two boards into an animatable segment. The move is only a hint used
 *  to pair the primary slide; everything else is matched heuristically so
 *  buff-mutated transitions still read sensibly. */
function diffSegment(
  a: ClipPieces,
  b: ClipPieces,
  ply: number,
  move: Move | null,
  label: string | null,
  sigName: string | null,
): ClipSegment {
  const departures = new Map<Square, Piece>();
  const arrivals = new Map<Square, Piece>();
  const statics: { sq: Square; piece: Piece }[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const pa = a[sq];
    const pb = b[sq];
    if (samePiece(pa, pb)) {
      if (pb) statics.push({ sq, piece: pb });
      continue;
    }
    if (pa) departures.set(sq, pa);
    if (pb) arrivals.set(sq, pb);
  }

  const pairs: ClipPair[] = [];
  const takePair = (from: Square, to: Square, primary: boolean) => {
    const before = departures.get(from)!;
    const after = arrivals.get(to)!;
    // The piece standing on the destination beforehand is the capture victim
    // (only when it actually left — a same-piece destination never diffs).
    const victim = a[to] && !samePiece(a[to], after) ? a[to] : null;
    pairs.push({ from, to, before, after, captured: victim, primary });
    departures.delete(from);
    arrivals.delete(to);
    // The victim was recorded as a departure of its own square; consume it so
    // it doesn't double as a vanish.
    if (victim) departures.delete(to);
  };

  // 1) The recorded move, when both ends line up with the diff.
  if (move && !move.drop && departures.has(move.from) && arrivals.has(move.to)) {
    takePair(move.from, move.to, true);
  }
  // 2) Same color + type, nearest first (castling rooks, extra moves).
  const dist = (x: Square, y: Square) =>
    Math.max(Math.abs(FILE(x) - FILE(y)), Math.abs(RANK(x) - RANK(y)));
  const matchRemaining = (sameType: boolean) => {
    for (const [to, after] of [...arrivals]) {
      let best: Square | null = null;
      for (const [from, before] of departures) {
        if (before.color !== after.color) continue;
        if (sameType !== (before.type === after.type)) continue;
        if (best === null || dist(from, to) < dist(best, to)) best = from;
      }
      if (best !== null) takePair(best, to, false);
    }
  };
  matchRemaining(true);
  // 3) Same color, different type (promotions, transform buffs).
  matchRemaining(false);

  return {
    ply,
    label,
    pairs,
    spawns: [...arrivals].map(([sq, piece]) => ({ sq, piece })),
    vanishes: [...departures].map(([sq, piece]) => ({ sq, piece })),
    statics,
    sigName,
  };
}

export interface BuildClipOptions {
  moves: Move[];
  snapshots: ReadonlyMap<number, BoardState>;
  historyDiverged: boolean;
  /** How many plies (counted back from the head) the clip should cover. */
  plies: number;
  /** Buff ids of signature plays, keyed by the history length at fire time
   *  (i.e. the ply AFTER the move that carried the play). */
  signatureIds?: ReadonlyMap<number, string>;
}

/** Build the clip timeline for the last N plies. Returns null when fewer than
 *  two consecutive positions can be reconstructed (nothing to animate). The
 *  window shrinks from the requested length rather than failing outright when
 *  older positions are unreachable (e.g. a restored game that diverged before
 *  this session began). */
export function buildClipTimeline(opts: BuildClipOptions): ClipTimeline | null {
  const { moves, snapshots, historyDiverged, signatureIds } = opts;
  const head = moves.length;
  const want = Math.max(1, Math.min(opts.plies, head));
  if (head < 1) return null;

  // Collect boards from the head backwards until one is unreachable.
  const boards: ClipPieces[] = [];
  let startPly = head;
  for (let p = head; p >= head - want; p--) {
    const pieces = piecesAtPly(p, moves, snapshots, historyDiverged);
    if (!pieces) break;
    boards.unshift(pieces);
    startPly = p;
  }
  if (boards.length < 2) return null;

  const labels = sanLabels(moves);
  const sigNameAt = (afterPly: number, move: Move | null): string | null => {
    const fired = signatureIds?.get(afterPly);
    const id = fired ?? move?.via ?? null;
    return id ? BUFF_BY_ID[id]?.name ?? null : null;
  };

  const segments: ClipSegment[] = [];
  for (let i = 0; i < boards.length - 1; i++) {
    const ply = startPly + i;
    const move = moves[ply] ?? null;
    segments.push(
      diffSegment(
        boards[i],
        boards[i + 1],
        ply,
        move,
        labels[ply] ?? null,
        sigNameAt(ply + 1, move),
      ),
    );
  }
  return {
    startPly,
    initial: boards[0],
    final: boards[boards.length - 1],
    segments,
  };
}

/** How many plies (ending at the head) a clip could cover right now. Used to
 *  enable/disable the entry buttons without building the full timeline. */
export function clipPliesAvailable(
  moves: Move[],
  snapshots: ReadonlyMap<number, BoardState>,
  historyDiverged: boolean,
  maxPlies = 10,
): number {
  const timeline = buildClipTimeline({ moves, snapshots, historyDiverged, plies: maxPlies });
  return timeline ? timeline.segments.length : 0;
}
