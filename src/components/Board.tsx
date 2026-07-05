"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Piece } from "./Pieces";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square } from "@/engine/types";
import { playSelect } from "@/lib/sounds";

interface Visual {
  fogged?: boolean;
  waterRank?: number;
  duckSquare?: number;
  bannedSquares?: number[];
  highlightSquares?: number[];
  // Draft-mode zone effects (all public information):
  /** Squares holding a frozen piece (icy tint + snowflake). */
  frozenSquares?: number[];
  /** Shielded / sanctuary squares — pieces there can't be captured. */
  shieldedSquares?: number[];
  /** Squares your buffs bar the opponent from entering. */
  wardSquares?: number[];
  /** Squares just hit by Lightning Strike: a brief one-shot flash. */
  strikeSquares?: number[];
}

export interface QueuedPremove {
  from: Square;
  to: Square;
  promotion?: PieceType;
  // True if the user picked a square that had a piece (opponent OR friendly).
  // The premove only fires if the matching legal move when our turn comes is
  // also a capture. A planned Nxe5 won't silently downgrade to a quiet Ne5
  // when the e5 target ran away, and a friendly-target premove fires only if
  // the opponent captures our piece first.
  capture?: boolean;
}

export type MoveRisk = "check" | "nerf" | null;

interface Props {
  board: BoardState;
  legalMoves: Move[];
  orientation: Color;
  onMove: (m: Move) => void;
  myColor: Color;
  visual?: Visual;
  disabled?: boolean;
  lastMove?: Move | null;
  premoveMode?: boolean;
  premoves?: QueuedPremove[];
  onCancelPremove?: () => void;
  // Keyed by `${from}-${to}-${promotion ?? ""}` (see engine/moveSafety.ts).
  // Tints a destination's move dot yellow (self-inflicted nerf loss) or red
  // (moves into check) as a warning before the player commits to the move.
  moveRisks?: Map<string, MoveRisk>;
  // Skip the promotion picker and always promote to queen (Settings).
  autoQueen?: boolean;
  // File/rank labels on the board edge (Settings).
  showCoordinates?: boolean;
  // Tint the from/to squares of the last played move (Settings).
  highlightLastMove?: boolean;
  // Dots/rings on the squares a selected piece can move to (Settings). Moves
  // stay playable when off; only the hints are hidden.
  showLegalMoves?: boolean;
  // The checked king's square, tinted red when the check-highlight setting is
  // on (pages pass null/undefined when disabled or not in check).
  checkSquare?: Square | null;
  // Buff targeting mode: while set, the board is a square picker. Candidate
  // squares glow and clicking one calls onPickSquare; every other pointer
  // interaction (moves, selection, premoves) is suspended.
  pickSquares?: number[];
  onPickSquare?: (sq: Square) => void;
}

function riskOf(moves: Move[], moveRisks: Map<string, MoveRisk> | undefined): MoveRisk {
  if (!moveRisks) return null;
  let worst: MoveRisk = null;
  for (const m of moves) {
    const r = moveRisks.get(`${m.from}-${m.to}-${m.promotion ?? ""}`);
    if (r === "check") return "check";
    if (r === "nerf") worst = "nerf";
  }
  return worst;
}

function castleRookSquare(color: Color, side: "k" | "q"): Square {
  if (side === "k") return color === "w" ? 7 : 63;
  return color === "w" ? 0 : 56;
}

interface DragState {
  from: Square;
  pointerId: number;
  cell: number; // pixel size of one square
}

type RightClickMark = 1 | 2 | 3 | 4;

// Drawn annotations, lichess-style: right-click drag for an arrow, plain
// right-click for a square mark. Modifier keys pick the colour.
type BoardArrow = { from: Square; to: Square; mark: RightClickMark };

const MARK_COLORS: Record<RightClickMark, string> = {
  1: "rgb(216,181,110)",
  2: "rgb(90,155,122)",
  3: "rgb(124,122,163)",
  4: "rgb(181,70,65)",
};

function ArrowShape({
  from,
  to,
  mark,
  orientation,
  preview = false,
}: BoardArrow & { orientation: Color; preview?: boolean }) {
  const center = (sq: Square) =>
    orientation === "w"
      ? { x: FILE(sq) + 0.5, y: 7.5 - RANK(sq) }
      : { x: 7.5 - FILE(sq), y: RANK(sq) + 0.5 };
  const a = center(from);
  const b = center(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const headLen = 0.42;
  const headW = 0.24;
  const start = { x: a.x + ux * 0.34, y: a.y + uy * 0.34 };
  const base = { x: b.x - ux * headLen, y: b.y - uy * headLen };
  const color = MARK_COLORS[mark];
  return (
    <g opacity={preview ? 0.5 : 0.8}>
      <line
        x1={start.x}
        y1={start.y}
        x2={base.x}
        y2={base.y}
        stroke={color}
        strokeWidth={0.18}
        strokeLinecap="round"
      />
      <polygon
        points={`${b.x},${b.y} ${base.x + px * headW},${base.y + py * headW} ${base.x - px * headW},${base.y - py * headW}`}
        fill={color}
      />
    </g>
  );
}

// --- Move animation (chessground/lichess technique) ---
// When the position changes, each piece that "appeared" on a square is
// matched to the nearest vanished piece of the same type and colour. It is
// rendered on its destination square pre-translated back to its origin, then
// eased to identity — so pieces glide instead of teleporting. Castling
// animates both king and rook for free.

interface PieceAnim {
  dxCells: number;
  dyCells: number;
}

function animDurationMs(): number {
  if (typeof document === "undefined") return 0;
  const mode = document.documentElement.dataset.anim;
  if (mode === "off") return 0;
  if (mode === "fast") return 120;
  return 220;
}

// Pending animation cleanups, per piece element: starting a new slide on an
// element cancels the old cleanup so back-to-back moves (premove chains)
// don't get clipped mid-flight.
const animCleanups = new WeakMap<HTMLElement, number>();

function computeAnims(
  prev: BoardState["pieces"],
  next: BoardState["pieces"],
  orientation: Color,
  skipSquare: Square | null,
): Map<Square, PieceAnim> {
  const anims = new Map<Square, PieceAnim>();
  const vanished: Square[] = [];
  const appeared: Square[] = [];
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (a && (!b || a.type !== b.type || a.color !== b.color)) vanished.push(sq);
    if (b && (!a || a.type !== b.type || a.color !== b.color)) appeared.push(sq);
  }
  // A flood of changes is a reset (new game, history jump), not a move.
  if (appeared.length === 0 || appeared.length > 6) return anims;
  const used = new Set<Square>();
  for (const to of appeared) {
    if (to === skipSquare) continue; // drag drops land instantly
    const piece = next[to]!;
    let best: Square | null = null;
    let bestDist = Infinity;
    for (const from of vanished) {
      if (used.has(from)) continue;
      const q = prev[from]!;
      if (q.type !== piece.type || q.color !== piece.color) continue;
      const d = (FILE(from) - FILE(to)) ** 2 + (RANK(from) - RANK(to)) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = from;
      }
    }
    if (best == null) continue;
    used.add(best);
    let dxCells = FILE(best) - FILE(to);
    let dyCells = RANK(to) - RANK(best);
    if (orientation === "b") {
      dxCells = -dxCells;
      dyCells = -dyCells;
    }
    anims.set(to, { dxCells, dyCells });
  }
  return anims;
}

const ORDERED_SQUARES_WHITE: Square[] = [];
for (let r = 7; r >= 0; r--) {
  for (let f = 0; f < 8; f++) {
    ORDERED_SQUARES_WHITE.push(SQ(f, r));
  }
}
const ORDERED_SQUARES_BLACK = [...ORDERED_SQUARES_WHITE].reverse();

export function Board({
  board,
  legalMoves,
  orientation,
  onMove,
  myColor,
  visual,
  disabled,
  lastMove,
  premoveMode = false,
  premoves,
  onCancelPremove,
  moveRisks,
  autoQueen,
  showCoordinates = true,
  highlightLastMove = true,
  showLegalMoves = true,
  checkSquare = null,
  pickSquares,
  onPickSquare,
}: Props) {
  const pickSquareSet = useMemo(() => new Set(pickSquares ?? []), [pickSquares]);
  const pickingSquares = !!onPickSquare;
  const premoveSquares = useMemo(() => {
    const s = new Set<Square>();
    for (const pm of premoves ?? []) {
      s.add(pm.from);
      s.add(pm.to);
    }
    return s;
  }, [premoves]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotionMove, setPromotionMove] = useState<Move[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverSq, setHoverSq] = useState<Square | null>(null);
  const [rightClickMarks, setRightClickMarks] = useState<Record<number, RightClickMark>>({});
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [rightDrag, setRightDrag] = useState<{ from: Square; mark: RightClickMark; hover: Square } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const gridRectRef = useRef<DOMRect | null>(null);
  const lastHoverRef = useRef<Square | null>(null);
  // Remembers what was under the pointer when a press began, so releasing on
  // the same square can toggle the selection off (lichess click behaviour).
  const pressRef = useRef<{ sq: Square; wasSelected: boolean } | null>(null);
  // The destination of a just-dropped drag: that piece must not animate.
  const dropSkipRef = useRef<Square | null>(null);
  const prevPiecesRef = useRef<BoardState["pieces"] | null>(null);
  const animsRef = useRef<Map<Square, PieceAnim>>(new Map());

  // Diff against the previous position during render (reference equality
  // guards against re-runs) so animated squares can be tagged in this pass.
  if (prevPiecesRef.current && prevPiecesRef.current !== board.pieces) {
    animsRef.current = computeAnims(
      prevPiecesRef.current,
      board.pieces,
      orientation,
      dropSkipRef.current,
    );
    dropSkipRef.current = null;
  }
  prevPiecesRef.current = board.pieces;

  // Start the animations before paint: place each tagged piece on its origin
  // square via transform, force a reflow, then transition to rest. All
  // imperative — React never renders the transform, so unrelated re-renders
  // (hover, selection) can't snap a piece mid-flight.
  useLayoutEffect(() => {
    const anims = animsRef.current;
    if (anims.size === 0) return;
    animsRef.current = new Map();
    const dur = animDurationMs();
    if (dur === 0) return;
    const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
    if (!grid) return;
    const cell = grid.getBoundingClientRect().width / 8;
    for (const el of Array.from(grid.querySelectorAll<HTMLElement>("[data-anim-piece]"))) {
      const sq = Number(el.dataset.animPiece) as Square;
      const anim = anims.get(sq);
      if (!anim) continue;
      const pendingCleanup = animCleanups.get(el);
      if (pendingCleanup !== undefined) window.clearTimeout(pendingCleanup);
      el.style.transition = "none";
      el.style.transform = `translate(${anim.dxCells * cell}px, ${anim.dyCells * cell}px)`;
      el.style.position = "relative";
      el.style.zIndex = "5";
      el.getBoundingClientRect(); // commit the starting transform
      el.style.transition = `transform ${dur}ms ease-out`;
      el.style.transform = "translate(0, 0)";
      animCleanups.set(
        el,
        window.setTimeout(() => {
          el.style.transition = "";
          el.style.zIndex = "";
          el.style.position = "";
          animCleanups.delete(el);
        }, dur + 50),
      );
    }
  }, [board.pieces, orientation]);

  const movesFrom = useMemo(() => {
    const m = new Map<Square, Move[]>();
    for (const mv of legalMoves) {
      let list = m.get(mv.from);
      if (!list) {
        list = [];
        m.set(mv.from, list);
      }
      list.push(mv);
    }
    return m;
  }, [legalMoves]);

  const targets: Record<Square, Move[]> = useMemo(() => {
    const t: Record<Square, Move[]> = {};
    if (selected != null) {
      for (const m of movesFrom.get(selected) ?? []) {
        if (!t[m.to]) t[m.to] = [];
        t[m.to].push(m);
        if (m.castle) {
          const rookSq = castleRookSquare(m.color, m.castle);
          if (!t[rookSq]) t[rookSq] = [];
          t[rookSq].push(m);
        }
      }
    }
    return t;
  }, [selected, movesFrom]);

  const castleHintSquares = useMemo(() => {
    const set = new Set<Square>();
    if (selected != null) {
      for (const m of movesFrom.get(selected) ?? []) {
        if (!m.castle) continue;
        set.add(castleRookSquare(m.color, m.castle));
      }
    }
    return set;
  }, [selected, movesFrom]);

  const orderedSquares = orientation === "w" ? ORDERED_SQUARES_WHITE : ORDERED_SQUARES_BLACK;
  const bannedSquares = useMemo(() => new Set(visual?.bannedSquares ?? []), [visual?.bannedSquares]);
  const frozenSquares = useMemo(() => new Set(visual?.frozenSquares ?? []), [visual?.frozenSquares]);
  const shieldedSquares = useMemo(() => new Set(visual?.shieldedSquares ?? []), [visual?.shieldedSquares]);
  const wardSquares = useMemo(() => new Set(visual?.wardSquares ?? []), [visual?.wardSquares]);
  const strikeSquares = useMemo(() => new Set(visual?.strikeSquares ?? []), [visual?.strikeSquares]);
  const highlightSquares = useMemo(
    () => new Set(visual?.highlightSquares ?? []),
    [visual?.highlightSquares],
  );

  const squareAtClient = (clientX: number, clientY: number): Square | null => {
    const rect = gridRectRef.current ?? (() => {
      const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
      return grid?.getBoundingClientRect() ?? null;
    })();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const col = Math.min(7, Math.max(0, Math.floor((x / rect.width) * 8)));
    const row = Math.min(7, Math.max(0, Math.floor((y / rect.height) * 8)));
    const file = orientation === "w" ? col : 7 - col;
    const rank = orientation === "w" ? 7 - row : row;
    return SQ(file, rank);
  };

  const tryPlay = (sq: Square): boolean => {
    if (selected != null && targets[sq]) {
      const candidates = targets[sq];
      if (candidates.length > 1 && candidates[0].promotion) {
        // premoves always auto-queen (the user can't be asked mid-opponent-turn);
        // the Settings auto-queen toggle does the same for normal moves.
        if (premoveMode || autoQueen) {
          const q = candidates.find((c) => c.promotion === "q") ?? candidates[0];
          onMove(q);
          setSelected(null);
          return true;
        }
        setPromotionMove(candidates);
        return true;
      }
      onMove(candidates[0]);
      setSelected(null);
      return true;
    }
    return false;
  };

  // Latest-value mirrors for the drag listeners. The drag effect only re-runs
  // when the drag starts, so without these its handlers would keep validating
  // drops against the move list from that moment — if the opponent moved (or
  // a premove fired) mid-drag, a perfectly good drop would silently die.
  const tryPlayRef = useRef(tryPlay);
  tryPlayRef.current = tryPlay;
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  // Everything happens on pointer *down*, lichess-style: pressing a legal
  // destination plays the move immediately (no waiting for the release —
  // that saves the whole press-to-release delay on every move, which adds up
  // fast in bullet), pressing a movable piece selects it and arms a drag, and
  // pressing anything else clears the selection. Releasing on the same
  // already-selected piece toggles it off (handled in the drag-up listener).
  const handleSquarePointerDown = (e: React.PointerEvent, sq: Square) => {
    if (e.button === 2) {
      startRightDrag(e, sq);
      return;
    }
    if (e.button !== undefined && e.button !== 0) return;
    // Drawn arrows and marks survive left clicks (including rejected/illegal
    // move attempts); they are wiped only when a move actually lands on the
    // board (the board.pieces effect below).
    // Targeting mode swallows the pointer entirely: a candidate square picks,
    // anything else is a no-op (Escape or the cancel chip exits the mode).
    if (pickingSquares) {
      if (pickSquareSet.has(sq)) onPickSquare?.(sq);
      return;
    }
    if (disabled) return;
    if (tryPlay(sq)) return;
    const piece = board.pieces[sq];
    if (piece && piece.color === myColor && movesFrom.has(sq)) {
      pressRef.current = { sq, wasSelected: selected === sq };
      onPointerDownPiece(e, sq);
    } else if (selected != null) {
      setSelected(null);
    }
  };

  // Clicking anywhere outside the board also clears the selection.
  useEffect(() => {
    if (selected == null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (boardRef.current && !boardRef.current.contains(e.target)) {
        setSelected(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selected]);

  // --- Drag & drop via pointer events ---
  const onPointerDownPiece = (e: React.PointerEvent, sq: Square) => {
    const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    gridRectRef.current = rect;
    const cell = rect.width / 8;

    setSelected(sq);
    if (selected !== sq) playSelect();
    setDrag({ from: sq, pointerId: e.pointerId, cell });
    setHoverSq(sq);
    lastHoverRef.current = sq;
    // Pre-position the ghost so the first frame is right
    requestAnimationFrame(() => {
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${e.clientX - cell / 2}px, ${e.clientY - cell / 2}px, 0)`;
      }
    });
    e.preventDefault();
  };

  useEffect(() => {
    if (!drag) return;
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let pending = false;

    const flush = () => {
      pending = false;
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${pendingX - drag.cell / 2}px, ${pendingY - drag.cell / 2}px, 0)`;
      }
      const sq = squareAtClient(pendingX, pendingY);
      if (sq !== lastHoverRef.current) {
        lastHoverRef.current = sq;
        setHoverSq(sq);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!pending) {
        pending = true;
        rafId = requestAnimationFrame(flush);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const sq = squareAtClient(e.clientX, e.clientY);
      // Validate the drop against the *current* move list (via refs), not the
      // one captured when the drag began — the position may have changed.
      if (sq != null && sq !== drag.from && targetsRef.current[sq]) {
        dropSkipRef.current = sq;
        tryPlayRef.current(sq);
      } else if (sq != null && sq !== drag.from) {
        setSelected(null);
      } else if (sq === drag.from && pressRef.current?.sq === sq && pressRef.current.wasSelected) {
        // Releasing on an already-selected piece deselects it (click toggle).
        setSelected(null);
      }
      pressRef.current = null;
      setDrag(null);
      setHoverSq(null);
      lastHoverRef.current = null;
      gridRectRef.current = null;
    };
    const onCancel = () => {
      setDrag(null);
      setHoverSq(null);
      lastHoverRef.current = null;
      gridRectRef.current = null;
    };
    const onScroll = () => {
      // Re-measure if the page scrolls during a drag.
      const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
      if (grid) gridRectRef.current = grid.getBoundingClientRect();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  const draggedPiece = drag ? board.pieces[drag.from] : null;

  // Any move wipes the scratchpad, like Lichess.
  useEffect(() => {
    setRightClickMarks((marks) => (Object.keys(marks).length ? {} : marks));
    setArrows((current) => (current.length ? [] : current));
  }, [board.pieces]);

  // Right-click drag: drop on another square to toggle an arrow, release on
  // the starting square to toggle its mark instead.
  useEffect(() => {
    if (!rightDrag) return;
    const onMovePointer = (e: PointerEvent) => {
      const sq = squareAtClient(e.clientX, e.clientY);
      if (sq != null) setRightDrag((d) => (d && d.hover !== sq ? { ...d, hover: sq } : d));
    };
    const onUp = (e: PointerEvent) => {
      if (e.button !== 2) return;
      const drop = squareAtClient(e.clientX, e.clientY) ?? rightDrag.hover;
      const { from, mark } = rightDrag;
      setRightDrag(null);
      if (drop === from) {
        setRightClickMarks((marks) => {
          const next = { ...marks };
          if (next[from] === mark) delete next[from];
          else next[from] = mark;
          return next;
        });
        return;
      }
      setArrows((current) => {
        const existing = current.find((a) => a.from === from && a.to === drop);
        const rest = current.filter((a) => !(a.from === from && a.to === drop));
        if (existing && existing.mark === mark) return rest;
        return [...rest, { from, to: drop, mark }];
      });
    };
    const onCancel = () => setRightDrag(null);
    window.addEventListener("pointermove", onMovePointer);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMovePointer);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightDrag]);

  const markFromModifiers = (e: React.MouseEvent): RightClickMark => {
    if (e.altKey) return 2;
    if (e.ctrlKey) return 3;
    if (e.shiftKey) return 4;
    return 1;
  };

  const handleSquareContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // right-click cancels the whole premove queue (chess.com convention)
    if (premoves && premoves.length > 0 && onCancelPremove) {
      onCancelPremove();
      setSelected(null);
    }
  };

  const startRightDrag = (e: React.PointerEvent, sq: Square) => {
    e.preventDefault();
    setRightDrag({ from: sq, mark: markFromModifiers(e), hover: sq });
  };

  return (
    <div ref={boardRef} className="relative w-full max-w-[min(92vw,720px)] aspect-square mx-auto">
      <div className="absolute inset-2 sm:inset-3 rounded-sm overflow-hidden border border-black/40">
        <div
          data-board-grid
          // touch-action: none is what makes drag work on mobile — without it
          // the browser claims the touch for scrolling and fires pointercancel
          // mid-drag. Tap-to-move keeps working either way.
          className="grid grid-cols-8 grid-rows-8 w-full h-full select-none [touch-action:none]"
          onContextMenu={(e) => e.preventDefault()}
        >
          {orderedSquares.map((sq) => {
            const f = FILE(sq), r = RANK(sq);
            const isLight = (f + r) % 2 === 1;
            const piece = board.pieces[sq];
            const isSelected = selected === sq;
            const isCastleHint = castleHintSquares.has(sq);
            const isTarget = !!targets[sq] && !isCastleHint;
            const isCapture = isTarget && targets[sq].some((m) => !!m.captured);
            const targetRisk = isTarget ? riskOf(targets[sq], moveRisks) : null;
            const banned = bannedSquares.has(sq);
            const isDuck = visual?.duckSquare === sq;
            const underwater = visual?.waterRank ? RANK(sq) < visual.waterRank : false;
            const lastFrom = lastMove?.from === sq;
            const lastTo = lastMove?.to === sq;
            const isHover = hoverSq === sq && drag != null;
            const isDragging = drag?.from === sq;
            const isForced = highlightSquares.has(sq);
            const isPickTarget = pickingSquares && pickSquareSet.has(sq);
            const isPremoveSquare = premoveSquares.has(sq);
            const rightClickMark = rightClickMarks[sq];

            const fogHide =
              !!visual?.fogged && piece && piece.color !== myColor && !lastTo;

            const classes = [
              "relative flex items-center justify-center",
              isLight ? "sq-light" : "sq-dark",
              isSelected ? "sq-sel" : "",
              highlightLastMove && (lastFrom || lastTo) ? "sq-last" : "",
              checkSquare === sq ? "sq-check" : "",
              isHover && (isTarget || isCastleHint) ? "sq-hover" : "",
            ].join(" ");

            return (
              <div
                key={sq}
                onContextMenu={handleSquareContextMenu}
                onPointerDown={(e) => handleSquarePointerDown(e, sq)}
                className={classes}
                style={{
                  cursor: pickingSquares
                    ? isPickTarget
                      ? "pointer"
                      : "default"
                    : piece && piece.color === myColor && !disabled
                    ? "grab"
                    : "default",
                }}
                role="gridcell"
                aria-label={`square ${"abcdefgh"[f]}${r + 1}`}
              >
                {underwater && (
                  <div className="absolute inset-0 bg-cyan-500/25 mix-blend-screen pointer-events-none" />
                )}
                {banned && (
                  <div className="absolute inset-0 bg-red-900/45 pointer-events-none" />
                )}
                {wardSquares.has(sq) && (
                  <div className="absolute inset-0 bg-verdigris/20 pointer-events-none" />
                )}
                {frozenSquares.has(sq) && (
                  <>
                    {/* One-shot icy flash when the freeze lands, then a calm
                        persistent tint while it holds. */}
                    <div className="absolute inset-0 bg-cyan-300/25 pointer-events-none sq-freeze" />
                    <span className="absolute top-0.5 right-0.5 z-10 text-[11px] leading-none pointer-events-none drop-shadow sq-freeze-flake">
                      ❄
                    </span>
                  </>
                )}
                {shieldedSquares.has(sq) && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-verdigris-glow/80 shadow-[inset_0_0_18px_-4px_rgba(123,181,47,0.6)] sq-shield-in" />
                )}
                {strikeSquares.has(sq) && (
                  <div className="absolute inset-0 pointer-events-none z-10 sq-strike">
                    <span className="absolute inset-0 flex items-center justify-center text-2xl drop-shadow">
                      ⚡
                    </span>
                  </div>
                )}
                {rightClickMark && (
                  <div className={`absolute inset-0 pointer-events-none sq-rmb-mark sq-rmb-mark-${rightClickMark}`} />
                )}
                {isDuck && (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl pointer-events-none">🦆</div>
                )}
                {isForced && !isDragging && (
                  <div className="absolute inset-0 pointer-events-none rounded-sm ring-2 ring-inset ring-gold-leaf/80 shadow-[inset_0_0_24px_-4px_rgba(230,191,106,0.55)] animate-flicker" />
                )}
                {isPickTarget && (
                  <div className="absolute inset-0 pointer-events-none rounded-sm bg-gold/15 ring-2 ring-inset ring-gold-leaf/90 animate-flicker" />
                )}
                {fogHide ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-700/85 to-stone-900/95 backdrop-blur-sm pointer-events-none" />
                ) : piece ? (
                  <div
                    className={"pointer-events-none " + (isDragging ? "opacity-30" : "")}
                    data-anim-piece={animsRef.current.has(sq) ? sq : undefined}
                    style={{ width: "var(--piece-fit, 88%)", height: "var(--piece-fit, 88%)" }}
                  >
                    <Piece type={piece.type} color={piece.color} size="100%" />
                  </div>
                ) : null}

                {showLegalMoves && isTarget && (
                  isCapture ? (
                    <div
                      className={
                        "dot-capture pointer-events-none " +
                        (targetRisk === "check" ? "dot-capture-red" : targetRisk === "nerf" ? "dot-capture-yellow" : "")
                      }
                    />
                  ) : (
                    <div
                      className={
                        "dot-target pointer-events-none " +
                        (targetRisk === "check" ? "dot-target-red" : targetRisk === "nerf" ? "dot-target-yellow" : "")
                      }
                    />
                  )
                )}
                {isCastleHint && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-gold/70 rounded-sm" />
                )}
                {isPremoveSquare && (
                  <div className="absolute inset-0 pointer-events-none bg-oxblood/45" />
                )}

                {showCoordinates && f === (orientation === "w" ? 0 : 7) && (
                  <span
                    className={
                      "absolute top-0.5 left-1 text-[10px] font-mono font-semibold pointer-events-none " +
                      (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85")
                    }
                  >
                    {r + 1}
                  </span>
                )}
                {showCoordinates && r === (orientation === "w" ? 0 : 7) && (
                  <span
                    className={
                      "absolute bottom-0.5 right-1 text-[10px] font-mono font-semibold pointer-events-none " +
                      (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85")
                    }
                  >
                    {"abcdefgh"[f]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawn annotations: arrows above the pieces, clicks pass through. */}
        {(arrows.length > 0 || (rightDrag && rightDrag.hover !== rightDrag.from)) && (
          <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 z-10 h-full w-full">
            {arrows.map((arrow) => (
              <ArrowShape key={`${arrow.from}-${arrow.to}`} {...arrow} orientation={orientation} />
            ))}
            {rightDrag && rightDrag.hover !== rightDrag.from && (
              <ArrowShape
                from={rightDrag.from}
                to={rightDrag.hover}
                mark={rightDrag.mark}
                orientation={orientation}
                preview
              />
            )}
          </svg>
        )}
      </div>

      {/* Floating drag ghost — position is written directly via ref to avoid React re-renders */}
      {drag && draggedPiece && (
        <div
          ref={ghostRef}
          className="drag-ghost"
          style={{
            left: 0,
            top: 0,
            width: drag.cell,
            height: drag.cell,
            willChange: "transform",
          }}
        >
          <Piece type={draggedPiece.type} color={draggedPiece.color} size="100%" />
        </div>
      )}

      <AnimatePresence>
        {promotionMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md z-20"
          >
            <div className="plate gilt p-4 flex gap-2">
              {promotionMove.map((m) => (
                <button
                  key={m.promotion}
                  onClick={() => {
                    onMove(m);
                    setPromotionMove(null);
                    setSelected(null);
                  }}
                  className="w-16 h-16 rounded-sm bg-ink-800 hover:bg-ink-700 flex items-center justify-center border border-gold/30"
                >
                  <Piece type={m.promotion!} color={m.color} size={56} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
