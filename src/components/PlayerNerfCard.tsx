"use client";

import { Drawback } from "@/engine/drawback";
import { BoardState, Color, PieceType } from "@/engine/types";
import { Piece } from "@/components/Pieces";

const PIECE_ORDER: PieceType[] = ["p", "n", "b", "r", "q", "k"];
const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNTS: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const TIER_LABEL = ["", "Trivial", "Easy", "Common", "Severe", "Brutal"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];

interface Props {
  board: BoardState;
  playerColor: Color;
  myColor: Color;
  name: string;
  elo?: number | null;
  drawback: Drawback;
  revealed?: boolean;
  ownerLabel: string;
  progress?: { value: number; max: number; label: string } | null;
}

function opponentOf(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function capturedPiecesFor(board: BoardState, capturer: Color): PieceType[] {
  const opponent = opponentOf(capturer);
  const remaining: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const piece of board.pieces) {
    if (piece?.color === opponent) remaining[piece.type]++;
  }

  const captured: PieceType[] = [];
  for (const type of PIECE_ORDER) {
    const missing = Math.max(0, START_COUNTS[type] - remaining[type]);
    for (let i = 0; i < missing; i++) captured.push(type);
  }
  return captured;
}

function capturedValue(pieces: PieceType[]): number {
  return pieces.reduce((total, piece) => total + PIECE_VALUES[piece], 0);
}

export function PlayerNerfCard({
  board,
  playerColor,
  myColor,
  name,
  elo,
  drawback,
  revealed = true,
  ownerLabel,
  progress,
}: Props) {
  const pieces = capturedPiecesFor(board, playerColor);
  const mineValue = capturedValue(capturedPiecesFor(board, myColor));
  const opponentValue = capturedValue(capturedPiecesFor(board, opponentOf(myColor)));
  const playerValue = playerColor === myColor ? mineValue : opponentValue;
  const otherValue = playerColor === myColor ? opponentValue : mineValue;
  const delta = playerValue - otherValue;
  const isMe = playerColor === myColor;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <section
      className={
        "relative plate overflow-hidden border p-4 " +
        (revealed ? `tier-bg-${drawback.tier}` : "border-white/10 bg-ink-900/45")
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "grid h-9 w-9 shrink-0 place-items-center rounded-md border font-display text-xs font-semibold " +
            (isMe
              ? "border-gold/60 bg-gold/20 text-gold-leaf"
              : "border-bruise/60 bg-bruise/20 text-bruise-glow")
          }
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold leading-tight text-parchment">
            {name}
            {typeof elo === "number" && (
              <span className="text-parchment-400"> ({Math.round(elo)})</span>
            )}
          </div>
          <div className="mt-1 flex min-h-[1.4rem] min-w-0 items-center gap-1">
            <div className="flex min-w-0 flex-wrap items-center">
              {pieces.map((piece, index) => (
                <div
                  key={`${piece}-${index}`}
                  className={index > 0 && pieces[index - 1] === piece ? "-ml-[15px]" : ""}
                >
                  <Piece
                    type={piece}
                    color={opponentOf(playerColor)}
                    size={22}
                    className="opacity-90"
                  />
                </div>
              ))}
            </div>
            {delta > 0 && (
              <span className="shrink-0 font-mono text-sm font-semibold text-white">
                +{delta}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="my-4 h-px bg-white/10" />

      {revealed ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {ownerLabel && (
                <div className="smallcaps text-[10px] text-parchment-400">{ownerLabel}</div>
              )}
              <div className={`font-display text-2xl leading-tight tier-${drawback.tier}`}>
                {drawback.name}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 font-display text-sm font-bold tier-bg-${drawback.tier} tier-${drawback.tier}`}
              title={`Tier ${drawback.tier}: ${TIER_LABEL[drawback.tier]}`}
            >
              {TIER_ROMAN[drawback.tier]}
            </span>
          </div>
          <div className="rule-ornament my-3 text-[10px]">
            <span className="font-display">{TIER_LABEL[drawback.tier]}</span>
          </div>
          <p className="text-[15px] leading-relaxed text-parchment/95">{drawback.description}</p>
          {progress && progress.max > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="smallcaps text-[10px] text-parchment-400">Progress</span>
                <span className="font-mono text-[10px] text-parchment-300">{progress.label}</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/5">
                <div
                  className={`h-full tier-bg-${drawback.tier}`}
                  style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {drawback.flavor && (
            <p className="mt-3 border-l-2 border-white/15 pl-3 font-display text-[13px] text-parchment-300/85">
              &ldquo;{drawback.flavor}&rdquo;
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-2xl font-bold text-gold/80">
              ?
            </div>
            <div className="min-w-0">
              <div className="smallcaps text-[10px] text-parchment-400">{ownerLabel}</div>
              <div className="font-display text-xl text-parchment/85">Hidden rule</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-parchment-300/80">
            You'll see their rule when the game ends.
          </p>
        </>
      )}
    </section>
  );
}
