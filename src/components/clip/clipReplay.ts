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
import type { BuffCategory, CardFx } from "@/engine/buff";
import { boardAtPly, replayBoardSpan } from "@/lib/gameReview";
import type { BoardState, Move, Piece, PieceType, Square } from "@/engine/types";
import { FILE, PIECE_VALUE, RANK } from "@/engine/types";

export type ClipPieces = (Piece | null)[];

/** Card metadata attached to a signature-play segment: everything the energy
 *  renderer needs to pick a scene (motif polarity + category) and scale it
 *  (tier). Pulled from BUFF_BY_ID at build time so the canvas layer never
 *  touches the buff library. */
export interface ClipSigMeta {
  id: string;
  name: string;
  tier: number;
  category: BuffCategory;
  motif: CardFx["motif"] | null;
  /** The card's rule text, shown by the explainer rule panel so a stranger
   *  watching the reel learns what just fired. */
  description: string;
}

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
  /** Full card metadata for the energy renderer (null when no card fired). */
  sig: ClipSigMeta | null;
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
  sig: ClipSigMeta | null,
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
    sigName: sig?.name ?? null,
    sig,
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
  const sigAt = (afterPly: number, move: Move | null): ClipSigMeta | null => {
    const fired = signatureIds?.get(afterPly);
    const id = fired ?? move?.via ?? null;
    if (!id) return null;
    const buff = BUFF_BY_ID[id];
    if (!buff) return null;
    return {
      id,
      name: buff.name,
      tier: buff.tier,
      category: buff.category,
      motif: buff.fx?.motif ?? null,
      description: buff.description,
    };
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
        sigAt(ply + 1, move),
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

// --- Auto-director -----------------------------------------------------------

/** What the auto-director decided the clip is ABOUT. */
export type ClipPayoffKind = "card" | "capture" | "finish";

export interface ClipAutoPlan {
  /** Window length (last N plies) the director chose. */
  plies: number;
  /** Absolute ply index of the payoff segment, or null for a plain finish. */
  payoffPly: number | null;
  kind: ClipPayoffKind;
  /** The payoff card, when the payoff is a card play. */
  card: ClipSigMeta | null;
  /** Highest-value piece taken in the payoff, when it is a capture swing. */
  captured: PieceType | null;
}

/** How far back the director scans for a payoff, and the setup lead it keeps
 *  in front of one. Both in plies. */
const AUTO_SCAN = 14;
const AUTO_LEAD = 3;
const AUTO_FALLBACK = 8;

/** Scan the reconstructable tail of the game for the best payoff and choose
 *  the clip window around it: the highest-tier card play in the last ~14
 *  plies, else the biggest capture swing, else the final 8 plies. The window
 *  always ends at the head (the reveal is the finish), so "around" means
 *  keeping a few plies of setup in front of the payoff. */
export function planAutoClip(
  opts: Omit<BuildClipOptions, "plies">,
): ClipAutoPlan | null {
  const probe = buildClipTimeline({ ...opts, plies: AUTO_SCAN });
  if (!probe) return null;
  const segs = probe.segments;
  const head = probe.startPly + segs.length;

  // Highest-tier card play; ties go to the LATER play (closer to the finish).
  let cardIdx = -1;
  for (let i = 0; i < segs.length; i++) {
    const sig = segs[i].sig;
    if (sig && (cardIdx < 0 || sig.tier >= segs[cardIdx].sig!.tier)) cardIdx = i;
  }

  // Biggest capture swing: total point value removed in one segment.
  let capIdx = -1;
  let capBest = 0;
  let capPiece: PieceType | null = null;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    let value = 0;
    let top: PieceType | null = null;
    const count = (p: Piece) => {
      value += p.type === "k" ? 12 : PIECE_VALUE[p.type];
      if (!top || PIECE_VALUE[p.type] >= PIECE_VALUE[top]) top = p.type;
    };
    for (const pr of seg.pairs) if (pr.captured) count(pr.captured);
    for (const v of seg.vanishes) count(v.piece);
    if (value > 0 && value >= capBest) {
      capBest = value;
      capIdx = i;
      capPiece = top;
    }
  }

  const windowFor = (idx: number) =>
    Math.max(4, Math.min(segs.length, head - (probe.startPly + idx) + AUTO_LEAD));

  if (cardIdx >= 0) {
    return {
      plies: windowFor(cardIdx),
      payoffPly: segs[cardIdx].ply,
      kind: "card",
      card: segs[cardIdx].sig,
      captured: null,
    };
  }
  if (capIdx >= 0) {
    return {
      plies: windowFor(capIdx),
      payoffPly: segs[capIdx].ply,
      kind: "capture",
      card: null,
      captured: capPiece,
    };
  }
  return {
    plies: Math.min(AUTO_FALLBACK, segs.length),
    payoffPly: null,
    kind: "finish",
    card: null,
    captured: null,
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
