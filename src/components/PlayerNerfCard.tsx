"use client";

import type { ReactNode } from "react";
import { Nerf } from "@/engine/nerf";
import { BoardState, Color } from "@/engine/types";
import { Piece } from "@/components/Pieces";
import { capturedPiecesFor, capturedValue, opponentOf } from "@/lib/material";

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

interface Props {
  board: BoardState;
  playerColor: Color;
  myColor: Color;
  name: string;
  elo?: number | null;
  nerf: Nerf;
  revealed?: boolean;
  ownerLabel: string;
  progress?: { value: number; max: number; label: string } | null;
  action?: ReactNode;
}

export function PlayerNerfCard({
  board,
  playerColor,
  myColor,
  name,
  elo,
  nerf,
  revealed = true,
  ownerLabel,
  progress,
  action,
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
        (revealed ? `tier-bg-${nerf.tier}` : "border-white/10 bg-ink-900/45")
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
              <div className={`font-display text-2xl leading-tight tier-${nerf.tier}`}>
                {nerf.name}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 font-display text-sm font-bold tier-bg-${nerf.tier} tier-${nerf.tier}`}
              title={`Tier ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
            >
              {TIER_ROMAN[nerf.tier]}
            </span>
          </div>
          <div className="rule-ornament my-3 text-[10px]">
            <span className="font-display">{TIER_LABEL[nerf.tier]}</span>
          </div>
          <p className="text-[15px] leading-relaxed text-parchment/95">{nerf.description}</p>
          {progress && progress.max > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="smallcaps text-[10px] text-parchment-400">Progress</span>
                <span className="font-mono text-[10px] text-parchment-300">{progress.label}</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/5">
                <div
                  className={`h-full tier-bg-${nerf.tier}`}
                  style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {nerf.flavor && (
            <p className="mt-3 border-l-2 border-white/15 pl-3 font-display text-[13px] text-parchment-300/85">
              &ldquo;{nerf.flavor}&rdquo;
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
            You&apos;ll see their rule when the game ends.
          </p>
        </>
      )}

      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
