"use client";

import { BuffPick, BuffTarget } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { NerfGame, activateBuff, buffNextTarget } from "@/engine/game";
import { Color, FILE, RANK, SQ } from "@/engine/types";
import { useState } from "react";
import { BuffCard } from "./BuffCard";

const GLYPH: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

interface Props {
  game: NerfGame;
  myColor: Color;
  /** Activation is only allowed on your turn while the game is live. */
  canAct: boolean;
  onChanged: () => void;
  /** Online games: send the activation to the server instead of applying it
   * locally. Targets are still computed from the local replica (held buffs
   * and board effects are public state kept in sync by the server). */
  onUse?: (buffIndex: number, picks: BuffPick[]) => void;
}

interface Targeting {
  buffIndex: number;
  picks: BuffPick[];
  target: BuffTarget;
}

export function BuffDock({ game, myColor, canAct, onChanged, onUse }: Props) {
  const [targeting, setTargeting] = useState<Targeting | null>(null);
  const bs = game.buffs;
  if (!bs) return null;
  const mine = bs.players[myColor].buffs;
  const theirs = bs.players[myColor === "w" ? "b" : "w"].buffs;

  const startUse = (index: number) => {
    const target = buffNextTarget(game, myColor, index, []);
    if (!target) {
      // No targeting needed: fire immediately.
      if (onUse) onUse(index, []);
      else if (activateBuff(game, myColor, index, [])) onChanged();
      return;
    }
    setTargeting({ buffIndex: index, picks: [], target });
  };

  const applyPick = (pick: BuffPick) => {
    if (!targeting) return;
    const picks = [...targeting.picks, pick];
    const next = buffNextTarget(game, myColor, targeting.buffIndex, picks);
    if (!next) {
      if (onUse) onUse(targeting.buffIndex, picks);
      else activateBuff(game, myColor, targeting.buffIndex, picks);
      setTargeting(null);
      if (!onUse) onChanged();
    } else {
      setTargeting({ ...targeting, picks, target: next });
    }
  };

  return (
    <div className="plate p-3 space-y-2 overflow-y-auto">
      <div className="smallcaps text-[10px] text-parchment-400">Your buffs</div>
      {mine.length === 0 && (
        <p className="text-[11px] text-parchment-400">
          None yet. Your first draft arrives after {bs.players[myColor].nextDraftAt} moves.
        </p>
      )}
      {mine.map((inst, i) => {
        const def = BUFF_BY_ID[inst.id];
        if (!def) return null;
        const usable = canAct && def.kind === "activated" && !inst.spent && !inst.nullified;
        return (
          <div key={i}>
            <BuffCard
              buff={def}
              tier={inst.tier}
              compact
              spent={inst.spent}
              nullified={inst.nullified}
              status={def.status?.(inst) ?? null}
            />
            {def.kind === "activated" && !inst.spent && !inst.nullified && (
              <button
                onClick={() => startUse(i)}
                disabled={!usable}
                className="mt-1 w-full px-2 py-1.5 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 transition text-[11px] font-display font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use{!canAct ? " (your turn only)" : ""}
              </button>
            )}
          </div>
        );
      })}
      {theirs.length > 0 && (
        <>
          <div className="smallcaps text-[10px] text-parchment-400 pt-1 border-t border-white/10">
            Opponent&apos;s buffs
          </div>
          {theirs.map((inst, i) => {
            const def = BUFF_BY_ID[inst.id];
            if (!def) return null;
            return (
              <BuffCard
                key={i}
                buff={def}
                tier={inst.tier}
                compact
                spent={inst.spent}
                nullified={inst.nullified}
              />
            );
          })}
        </>
      )}

      {targeting && (
        <TargetModal
          game={game}
          myColor={myColor}
          targeting={targeting}
          onPick={applyPick}
          onCancel={() => setTargeting(null)}
        />
      )}
    </div>
  );
}

function TargetModal({
  game,
  myColor,
  targeting,
  onPick,
  onCancel,
}: {
  game: NerfGame;
  myColor: Color;
  targeting: Targeting;
  onPick: (pick: BuffPick) => void;
  onCancel: () => void;
}) {
  const { target } = targeting;
  const buffName = BUFF_BY_ID[game.buffs!.players[myColor].buffs[targeting.buffIndex].id]?.name;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="plate w-full max-w-md p-5">
        <div className="smallcaps text-[11px] text-parchment-400">{buffName}</div>
        <div className="font-display text-lg text-parchment mt-0.5">{target.label}</div>

        {target.kind === "square" ? (
          target.squares.length === 0 ? (
            <p className="mt-3 text-sm text-parchment-300">No valid targets right now.</p>
          ) : (
            <SquareGrid
              game={game}
              myColor={myColor}
              candidates={target.squares}
              onPick={(sq) => onPick({ square: sq })}
            />
          )
        ) : target.options.length === 0 ? (
          <p className="mt-3 text-sm text-parchment-300">No valid targets right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {target.options.map((opt) => {
              const def = BUFF_BY_ID[opt.name];
              return (
                <button
                  key={opt.index}
                  onClick={() => onPick({ buffIndex: opt.index })}
                  className="block w-full text-left"
                >
                  {def ? (
                    <BuffCard buff={def} tier={opt.tier as 1} compact />
                  ) : (
                    <span className="text-sm text-parchment">{opt.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={onCancel}
          className="mt-4 w-full px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SquareGrid({
  game,
  myColor,
  candidates,
  onPick,
}: {
  game: NerfGame;
  myColor: Color;
  candidates: number[];
  onPick: (sq: number) => void;
}) {
  const set = new Set(candidates);
  const ranks = myColor === "w" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = myColor === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  return (
    <div className="mt-3 grid grid-cols-8 gap-px bg-white/10 border border-white/10 select-none">
      {ranks.map((r) =>
        files.map((f) => {
          const sq = SQ(f, r);
          const p = game.board.pieces[sq];
          const candidate = set.has(sq);
          const dark = (FILE(sq) + RANK(sq)) % 2 === 0;
          return (
            <button
              key={sq}
              disabled={!candidate}
              onClick={() => onPick(sq)}
              title={"abcdefgh"[f] + (r + 1)}
              className={
                "aspect-square flex items-center justify-center text-lg leading-none " +
                (dark ? "bg-black/40 " : "bg-white/[0.06] ") +
                (candidate
                  ? "ring-1 ring-inset ring-gold/70 bg-gold/20 hover:bg-gold/40 cursor-pointer"
                  : "opacity-40 cursor-default")
              }
            >
              {p ? GLYPH[p.color + p.type] : ""}
            </button>
          );
        }),
      )}
    </div>
  );
}
