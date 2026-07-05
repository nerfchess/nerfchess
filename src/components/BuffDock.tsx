"use client";

import { BuffPick, BuffTarget, draftCardNoun } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { NerfGame, activateBuff, buffNextTarget } from "@/engine/game";
import { Color } from "@/engine/types";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BuffCard } from "./BuffCard";

// ---------------------------------------------------------------------------
// Buff dock and targeting.
//
// Activated buffs target on the REAL board: useBuffTargeting owns the pick
// chain, the page paints targeting.target.squares through the Board's
// pickSquares prop, and clicking a highlighted square advances the chain.
// Only enemy-buff-list targets (which have no board representation) fall
// back to the EnemyBuffModal.
//
// Held-buff visibility: your cards render as compact rows; the opponent's
// render as face-down minis (tier numeral only) whenever their identity is
// hidden. Online the server already masks identities (placeholder instances
// with an empty id); bot games pass hideOpponentCards to apply the same rule
// locally.
// ---------------------------------------------------------------------------

export interface BuffTargeting {
  buffIndex: number;
  picks: BuffPick[];
  target: BuffTarget;
}

export function useBuffTargeting({
  game,
  myColor,
  active,
  onChanged,
  onUse,
}: {
  game: NerfGame | null;
  myColor: Color;
  /** Targeting cancels itself the moment acting stops being legal. */
  active: boolean;
  onChanged?: () => void;
  /** Online games: send the activation to the server instead of applying it
   * locally. Targets are still computed from the local replica. */
  onUse?: (buffIndex: number, picks: BuffPick[]) => void;
}) {
  const [targeting, setTargeting] = useState<BuffTargeting | null>(null);

  useEffect(() => {
    if (!active && targeting) setTargeting(null);
  }, [active, targeting]);

  useEffect(() => {
    if (!targeting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTargeting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targeting]);

  const start = (index: number) => {
    if (!game) return;
    const target = buffNextTarget(game, myColor, index, []);
    if (!target) {
      // No targeting needed: fire immediately.
      if (onUse) onUse(index, []);
      else if (activateBuff(game, myColor, index, [])) onChanged?.();
      return;
    }
    setTargeting({ buffIndex: index, picks: [], target });
  };

  const pick = (p: BuffPick) => {
    if (!targeting || !game) return;
    const picks = [...targeting.picks, p];
    const next = buffNextTarget(game, myColor, targeting.buffIndex, picks);
    if (!next) {
      if (onUse) onUse(targeting.buffIndex, picks);
      else {
        activateBuff(game, myColor, targeting.buffIndex, picks);
        onChanged?.();
      }
      setTargeting(null);
    } else {
      setTargeting({ ...targeting, picks, target: next });
    }
  };

  /** Stop early on a finishable step (Warp Sovereign and friends): the picks
   * so far already form a complete effect, so fire with what we have. */
  const finish = () => {
    if (!targeting || !game) return;
    if (targeting.target.kind !== "square" || !targeting.target.finishable) return;
    if (onUse) onUse(targeting.buffIndex, targeting.picks);
    else {
      activateBuff(game, myColor, targeting.buffIndex, targeting.picks);
      onChanged?.();
    }
    setTargeting(null);
  };

  const cancel = () => setTargeting(null);

  return { targeting, start, pick, cancel, finish };
}

/** Floating chip over the board while a buff is picking its square targets:
 * names the buff and step, offers cancel (Escape works too). */
export function TargetingBanner({
  game,
  myColor,
  targeting,
  onCancel,
  onFinish,
}: {
  game: NerfGame;
  myColor: Color;
  targeting: BuffTargeting;
  onCancel: () => void;
  /** Finishable steps (the picks so far are a complete effect) show a Done
   * button that fires the buff early instead of picking further targets. */
  onFinish?: () => void;
}) {
  const inst = game.buffs?.players[myColor].buffs[targeting.buffIndex];
  const name = (inst && BUFF_BY_ID[inst.id]?.name) ?? "Buff";
  const empty = targeting.target.kind === "square" && targeting.target.squares.length === 0;
  const finishable = targeting.target.kind === "square" && !!targeting.target.finishable;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-2">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 border border-gold/50 bg-ink-900/95 px-3 py-1.5 shadow-plate backdrop-blur-sm">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-gold-leaf animate-flicker" />
        <span className="min-w-0 truncate font-display text-xs font-semibold text-parchment">
          {name}: {empty ? "no valid targets right now" : targeting.target.label}
        </span>
        {finishable && onFinish && (
          <button
            onClick={onFinish}
            className="btn-leaf shadow-leaf shrink-0 px-2 py-0.5 font-display text-[10px] font-semibold tracking-wide"
          >
            Done
          </button>
        )}
        <button
          onClick={onCancel}
          className="btn-ghost shrink-0 px-2 py-0.5 font-display text-[10px] tracking-wide"
        >
          Cancel · Esc
        </button>
      </div>
    </div>
  );
}

/** Fallback picker for enemy-buff-list targets only: those have no board
 * representation, so the modal list remains. Masked cards show as hidden. */
export function EnemyBuffModal({
  game,
  myColor,
  targeting,
  onPick,
  onCancel,
}: {
  game: NerfGame;
  myColor: Color;
  targeting: BuffTargeting;
  onPick: (pick: BuffPick) => void;
  onCancel: () => void;
}) {
  const { target } = targeting;
  if (target.kind !== "enemy-buff") return null;
  const inst = game.buffs?.players[myColor].buffs[targeting.buffIndex];
  const buffName = (inst && BUFF_BY_ID[inst.id]?.name) ?? "Buff";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="plate w-full max-w-md p-5">
        <div className="smallcaps text-[11px] text-parchment-400">{buffName}</div>
        <div className="font-display text-lg text-parchment mt-0.5">{target.label}</div>

        {target.options.length === 0 ? (
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
                    <span className="flex items-center justify-between border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-parchment">
                      Hidden buff
                      <span className="font-display text-xs text-parchment-400">
                        Tier {TIER_ROMAN[opt.tier as Tier]}
                      </span>
                    </span>
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

/** Face-down mini card: all the opponent shows for a hidden buff is its
 * tier. Spent/nullified minis dim like used cards do. */
function FaceDownMini({ tier, dead }: { tier: Tier; dead?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      title={`Hidden buff · tier ${tier}`}
      className={
        "relative flex h-11 w-8 shrink-0 items-center justify-center rounded-[3px] border border-gold/35 " +
        "bg-[linear-gradient(135deg,rgba(216,181,110,0.14),rgba(14,12,9,0.95)_45%,rgba(216,181,110,0.05))] " +
        (dead ? "opacity-40" : "")
      }
    >
      <span aria-hidden className="absolute inset-[3px] rounded-[2px] border border-gold/20" />
      <span className={`font-display text-[11px] font-bold tier-${tier}`}>{TIER_ROMAN[tier]}</span>
      {dead && <span aria-hidden className="absolute inset-x-1 top-1/2 h-px bg-parchment-400/60" />}
    </motion.div>
  );
}

interface Props {
  game: NerfGame;
  myColor: Color;
  /** Activation is only allowed on your turn while the game is live. */
  canAct: boolean;
  /** Use clicked: the page starts on-board targeting (useBuffTargeting). */
  onStartUse: (index: number) => void;
  /** Bot games: mask the opponent's held cards locally (the online server
   * already sends them masked). Revealed instances still show face-up. */
  hideOpponentCards?: boolean;
}

export function BuffDock({ game, myColor, canAct, onStartUse, hideOpponentCards }: Props) {
  const [showUsed, setShowUsed] = useState(false);

  const bs = game.buffs;
  if (!bs) return null;
  const noun = draftCardNoun(bs.mode);
  // Nerf mode's dock holds a mix (hexes, boons, items); "hexes" is the
  // umbrella noun the mode drafts under.
  const nounPlural = noun === "hex" ? "hexes" : `${noun}s`;
  const oppColor: Color = myColor === "w" ? "b" : "w";
  const mine = bs.players[myColor].buffs;
  const theirs = bs.players[oppColor].buffs;

  const mineActive = mine.map((inst, i) => ({ inst, i })).filter(({ inst }) => !inst.spent && !inst.nullified);
  const mineUsed = mine.map((inst, i) => ({ inst, i })).filter(({ inst }) => inst.spent || inst.nullified);
  const theirsActive = theirs.map((inst, i) => ({ inst, i })).filter(({ inst }) => !inst.spent && !inst.nullified);
  const theirsUsed = theirs.map((inst, i) => ({ inst, i })).filter(({ inst }) => inst.spent || inst.nullified);
  const usedCount = mineUsed.length + theirsUsed.length;

  const lastMine = mine[mine.length - 1] ?? null;
  const lastMineDef = lastMine ? BUFF_BY_ID[lastMine.id] : undefined;
  const lastTheirs = theirs[theirs.length - 1] ?? null;
  const lastTheirsHidden =
    !!lastTheirs && (!BUFF_BY_ID[lastTheirs.id] || (hideOpponentCards && !lastTheirs.spent && !lastTheirs.nullified));

  const myRow = ({ inst, i }: { inst: (typeof mine)[number]; i: number }) => {
    const def = BUFF_BY_ID[inst.id];
    if (!def) return null;
    const dead = inst.spent || inst.nullified;
    const activatable = def.kind === "activated" && !dead;
    const usable = canAct && activatable;
    const status = dead ? null : def.status?.(inst) ?? null;
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={
          "border border-white/10 bg-white/[0.02] px-2 py-1.5 " +
          (dead ? "opacity-45 " : "") +
          (usable ? "border-gold/30 " : "")
        }
      >
        <div
          // Second input path (additive): drag the usable chip onto a
          // highlighted board square to pick it. Native HTML5 drag is separate
          // from the board's pointer-drag, so the click flow is untouched. The
          // custom dataTransfer type lets the Board react to card drags only.
          draggable={usable || undefined}
          onDragStart={
            usable
              ? (e) => {
                  e.dataTransfer.setData("application/x-nerf-card", String(i));
                  e.dataTransfer.effectAllowed = "move";
                  // Same handler the Use button calls: engage target-select
                  // mode so candidate squares light up as drop targets.
                  onStartUse(i);
                }
              : undefined
          }
          className={"flex items-center gap-1.5 " + (usable ? "cursor-grab active:cursor-grabbing" : "")}
        >
          <span className={`min-w-0 flex-1 truncate font-display text-[12px] font-semibold leading-tight tier-${inst.tier}`}>
            {def.name}
          </span>
          {usable && (
            <span className="smallcaps shrink-0 rounded-sm border border-verdigris-glow/50 bg-verdigris/15 px-1 py-px text-[8px] font-semibold text-verdigris-glow">
              Usable
            </span>
          )}
          {status && (
            <span className="smallcaps hidden max-w-[7rem] shrink-0 truncate text-[8px] text-gold/80 lg:inline">
              {status}
            </span>
          )}
          {inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-oxblood-glow">Nullified</span>}
          {inst.spent && !inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-parchment-400">Used</span>}
          <span
            className={`shrink-0 rounded-full border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
          >
            {TIER_ROMAN[inst.tier]}
          </span>
          {activatable &&
            (usable ? (
              <button
                onClick={() => onStartUse(i)}
                className="btn-leaf shadow-leaf shrink-0 px-2 py-1 font-display text-[10px] font-semibold tracking-wide"
              >
                Use
              </button>
            ) : (
              <button
                disabled
                title="Your turn only"
                className="shrink-0 cursor-not-allowed border border-white/10 bg-white/[0.03] px-2 py-1 font-display text-[10px] tracking-wide text-parchment-400"
              >
                Use
              </button>
            ))}
        </div>
        {/* Full description, always readable without hovering. */}
        <p className="mt-1 text-[10px] leading-snug text-parchment-300">{def.description}</p>
      </motion.div>
    );
  };

  const oppEntry = ({ inst, i }: { inst: (typeof theirs)[number]; i: number }) => {
    const def = BUFF_BY_ID[inst.id];
    const dead = inst.spent || inst.nullified;
    // Face-down whenever the identity is hidden: masked placeholder online,
    // or the bot-game blanket rule (revealed cards still show face-up).
    if (!def || (hideOpponentCards && !dead)) {
      return <FaceDownMini key={i} tier={inst.tier} dead={dead} />;
    }
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={
          "w-full border border-white/10 bg-white/[0.02] px-2 py-1 " +
          (dead ? "opacity-45" : "")
        }
      >
        <div className="flex items-center gap-1.5">
          <span className={`min-w-0 flex-1 truncate font-display text-[11px] font-semibold tier-${inst.tier}`}>
            {def.name}
          </span>
          {inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-oxblood-glow">Nullified</span>}
          {inst.spent && !inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-parchment-400">Used</span>}
          <span
            className={`shrink-0 rounded-full border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
          >
            {TIER_ROMAN[inst.tier]}
          </span>
        </div>
        {/* Rule text always visible, matching your own rows: what a revealed
            card does must never require a hover. */}
        <p className="mt-0.5 text-[10px] leading-snug text-parchment-300">{def.description}</p>
      </motion.div>
    );
  };

  return (
    <div className="plate flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-inherit px-3 pb-2">
        {/* Latest pick slot: your newest card stays visible here; the
            opponent's side shows a face-down card while hidden. */}
        {(lastMine || lastTheirs) && (
          <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 border-b border-white/10 bg-inherit px-3 pb-1.5 pt-2.5">
            <span className="smallcaps shrink-0 text-[9px] text-parchment-400">Latest</span>
            {lastMine && (
              <motion.span
                key={`m${mine.length}`}
                initial={{ opacity: 0, x: -18, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`min-w-0 flex-1 truncate font-display text-[11px] font-semibold tier-${lastMine.tier}`}
              >
                {lastMineDef?.name ?? "Banked"}
              </motion.span>
            )}
            {!lastMine && <span className="min-w-0 flex-1" />}
            {lastTheirs &&
              (lastTheirsHidden ? (
                <motion.span
                  key={`t${theirs.length}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  title="Opponent's latest draft (hidden)"
                  className={`flex h-6 w-[18px] shrink-0 items-center justify-center rounded-[2px] border border-gold/35 bg-[linear-gradient(135deg,rgba(216,181,110,0.14),rgba(14,12,9,0.95))] font-display text-[8px] font-bold tier-${lastTheirs.tier}`}
                >
                  {TIER_ROMAN[lastTheirs.tier]}
                </motion.span>
              ) : (
                <motion.span
                  key={`t${theirs.length}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`max-w-[45%] shrink-0 truncate font-display text-[11px] tier-${lastTheirs.tier}`}
                >
                  {BUFF_BY_ID[lastTheirs.id]?.name}
                </motion.span>
              ))}
          </div>
        )}

        {/* Pending take-both: the next offer is taken whole, and the player
            should know before the draft opens, not discover it inside. */}
        {(bs.players[myColor].flags.takeBoth ?? 0) > 0 && (
          <div
            role="status"
            className="flex items-center gap-2 border border-gold/50 bg-gold/10 px-2 py-1.5"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-gold-leaf animate-flicker" />
            <span className="font-display text-[11px] font-semibold text-gold-leaf">
              Next draft: you take BOTH cards
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-2">
          <span className="smallcaps text-[10px] text-parchment-400">Your {nounPlural}</span>
          <span className="font-mono text-[10px] tabular-nums text-parchment-400">{mine.length}</span>
        </div>
        {mine.length === 0 && (
          <p className="text-[11px] text-parchment-400">
            None yet. Your first draft arrives after {bs.players[myColor].nextDraftAt} moves.
          </p>
        )}
        <div className="space-y-1">{mineActive.map(myRow)}</div>

        {theirs.length > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-2 border-t border-white/10 pt-2">
              <span className="smallcaps text-[10px] text-parchment-400">Opponent&apos;s {nounPlural}</span>
              <span className="font-mono text-[10px] tabular-nums text-parchment-400">{theirs.length}</span>
            </div>
            <div className="flex flex-wrap items-start gap-1">{theirsActive.map(oppEntry)}</div>
          </>
        )}

        {usedCount > 0 && (
          <div className="border-t border-white/10 pt-1.5">
            <button
              onClick={() => setShowUsed((v) => !v)}
              className="smallcaps w-full text-left text-[9px] text-parchment-400 transition hover:text-parchment-200"
            >
              {showUsed ? "Hide used" : `Show used (${usedCount})`}
            </button>
            {showUsed && (
              <div className="mt-1.5 space-y-1">
                {mineUsed.map(myRow)}
                <div className="flex flex-wrap items-start gap-1">{theirsUsed.map(oppEntry)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
