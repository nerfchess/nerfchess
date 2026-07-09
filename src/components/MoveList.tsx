"use client";

import { moveToSAN } from "@/engine/board";
import { Move } from "@/engine/types";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useRef } from "react";

export function MoveList({
  moves,
  currentPly = moves.length,
  onPlyChange,
  compact = false,
  showHeader = true,
  footer,
}: {
  moves: Move[];
  currentPly?: number;
  onPlyChange?: (ply: number) => void;
  compact?: boolean;
  showHeader?: boolean;
  footer?: ReactNode;
}) {
  // Build rows by ACTUAL move color, not index parity. This variant lets a
  // player move twice in a row (extra-move buffs like Onslaught), so pairing
  // moves[i]/moves[i+1] as white/black shifts every later move into the wrong
  // column and desyncs the numbers. Rule: a black move always closes its row;
  // a second white move opens a new one. Consecutive same-color moves each get
  // their own row, and a row holding only a black move shows "..." where white
  // would be. Plies are the real 1-based indices so navigation stays correct.
  type Cell = { san: string; ply: number } | null;
  const rows: { num: number; w: Cell; b: Cell }[] = [];
  {
    let num = 1;
    let cur: { num: number; w: Cell; b: Cell } = { num, w: null, b: null };
    for (let i = 0; i < moves.length; i++) {
      const cell: Cell = { san: moveToSAN(moves[i]), ply: i + 1 };
      if (moves[i].color === "w") {
        if (cur.w) {
          rows.push(cur);
          cur = { num: ++num, w: null, b: null };
        }
        cur.w = cell;
      } else {
        cur.b = cell;
        rows.push(cur);
        cur = { num: ++num, w: null, b: null };
      }
    }
    if (cur.w || cur.b) rows.push(cur);
  }
  const canBack = currentPly > 0;
  const canForward = currentPly < moves.length;
  const maxPly = moves.length;
  const jumpTo = useCallback(
    (ply: number) => onPlyChange?.(Math.max(0, Math.min(ply, maxPly))),
    [onPlyChange, maxPly],
  );
  const rootClass = compact ? "plate p-2 min-h-0 h-full flex flex-col" : "plate p-4";
  const titleClass = compact
    ? "smallcaps text-[9px] text-parchment-400 truncate"
    : "smallcaps text-[10px] text-parchment-400";
  const selectedMoveRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedMoveRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  useEffect(() => {
    if (!onPlyChange) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;
      if (event.key === "ArrowLeft" && canBack) {
        event.preventDefault();
        jumpTo(currentPly - 1);
      } else if (event.key === "ArrowRight" && canForward) {
        event.preventDefault();
        jumpTo(currentPly + 1);
      } else if (event.key === "ArrowUp" && canBack) {
        event.preventDefault();
        jumpTo(0);
      } else if (event.key === "ArrowDown" && canForward) {
        event.preventDefault();
        jumpTo(maxPly);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canBack, canForward, currentPly, jumpTo, maxPly, onPlyChange]);

  return (
    <div className={rootClass + (compact ? " overflow-hidden" : "")}>
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between gap-2 mb-2">
          <div className={titleClass}>{compact ? "History" : "Move history"}</div>
          <div className="font-mono text-[11px] text-parchment-400 tabular-nums">
            {currentPly}/{moves.length}
          </div>
        </div>
      )}
      <div className="grid shrink-0 grid-cols-4 gap-1 mb-2">
        <HistoryButton label="To start" disabled={!canBack} onClick={() => jumpTo(0)}>
          <ChevronsLeft size={15} />
        </HistoryButton>
        <HistoryButton label="Previous move" disabled={!canBack} onClick={() => jumpTo(currentPly - 1)}>
          <ChevronLeft size={15} />
        </HistoryButton>
        <HistoryButton label="Next move" disabled={!canForward} onClick={() => jumpTo(currentPly + 1)}>
          <ChevronRight size={15} />
        </HistoryButton>
        <HistoryButton label="To latest" disabled={!canForward} onClick={() => jumpTo(moves.length)}>
          <ChevronsRight size={15} />
        </HistoryButton>
      </div>
      {rows.length === 0 && (
        <div className="min-h-0 text-parchment-300/60 text-sm">No moves yet.</div>
      )}
      <div
        className={
          "font-mono space-y-0.5 overflow-y-auto pr-1 " +
          (compact ? "min-h-0 flex-1 text-[11px]" : "max-h-72 text-[13px]")
        }
      >
        {rows.map((row, i) => (
          <div
            key={i}
            className={
              "grid gap-1 " +
              (compact ? "grid-cols-[1.35rem_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[2.2rem_1fr_1fr]")
            }
          >
            <span className="text-parchment-400/70">{row.num}.</span>
            {row.w ? (
              <MoveCell
                ply={row.w.ply}
                selected={currentPly === row.w.ply}
                onSelect={onPlyChange}
                selectedRef={selectedMoveRef}
              >
                {row.w.san}
              </MoveCell>
            ) : (
              <span className="px-1 py-0.5 text-parchment-400/50 select-none">...</span>
            )}
            {row.b ? (
              <MoveCell
                ply={row.b.ply}
                selected={currentPly === row.b.ply}
                onSelect={onPlyChange}
                selectedRef={selectedMoveRef}
              >
                {row.b.san}
              </MoveCell>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
      {footer && <div className="shrink-0 mt-3 pt-3 border-t border-parchment-300/10">{footer}</div>}
    </div>
  );
}

function HistoryButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-11 sm:h-7 inline-flex items-center justify-center border border-parchment-300/10 bg-white/[0.03] text-parchment-200 hover:border-gold/50 hover:text-gold-leaf disabled:opacity-35 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function MoveCell({
  ply,
  selected,
  onSelect,
  selectedRef,
  children,
}: {
  ply: number;
  selected: boolean;
  onSelect?: (ply: number) => void;
  selectedRef?: MutableRefObject<HTMLButtonElement | null>;
  children: string;
}) {
  if (!children) return <span />;
  return (
    <button
      ref={selected ? selectedRef : undefined}
      type="button"
      onClick={() => onSelect?.(ply)}
      className={
        "min-w-0 text-left px-1 py-0.5 truncate transition " +
        (selected
          ? "bg-gold/15 text-gold-leaf"
          : "text-parchment hover:bg-white/[0.04]")
      }
    >
      {children}
    </button>
  );
}
