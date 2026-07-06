"use client";

import { BuffPick, BuffTarget, draftCardNoun, turnCost } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { TurnCostBadge } from "./TurnCostBadge";
import { NerfGame, activateBuff, buffNextTarget } from "@/engine/game";
import { Color } from "@/engine/types";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";
import { motion, useReducedMotion } from "framer-motion";
import { Ban, EyeOff, Hourglass, Inbox, Layers, ShieldAlert, Swords, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { BuffCard } from "./BuffCard";
import { OppPlaysDockSection, type OppPlay } from "./OppPlaysLog";
// Shares the dock pocket flash keyframes (and nothing else) with the overlay.
import "./DraftOverlay.css";

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

/** Dock section header: a small icon, the section label, and a count chip
 * pushed to the right edge. One shared shape so every section reads alike. */
function DockSectionHeader({ icon: Icon, label, count }: { icon: LucideIcon; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon aria-hidden size={12} strokeWidth={2.2} className="shrink-0 text-parchment-400" />
      <span className="smallcaps min-w-0 truncate text-[10px] text-parchment-400">{label}</span>
      <span className="ml-auto shrink-0 rounded-[1px] border border-white/15 bg-white/[0.05] px-1.5 py-px font-mono text-[9px] tabular-nums text-parchment-300">
        {count}
      </span>
    </div>
  );
}

// --- "Against you" transparency section -------------------------------------
// Every constraint currently limiting YOUR play, with its remaining duration,
// derived from public state only: board effects whose owner/against side is
// you (frozen or walnutted pieces, barred squares, king-only and pawn-halt
// shackles, pending turn skips) plus the opponent's face-up timed curses
// (identity already public: they appear in the plays ledger; def.status
// supplies the "N turns left" line). Answers "if I have blinkered bishops it
// needs to show them" from the affected side.

interface AgainstRow {
  key: string;
  name: string;
  detail: string;
  left: string;
}

const sqName = (sq: number) => "abcdefgh"[sq % 8] + (Math.floor(sq / 8) + 1);
const turnsLeft = (turns: number | null) =>
  turns == null ? "Until it ends" : `${turns} turn${turns === 1 ? "" : "s"} left`;

function againstYouRows(game: NerfGame, myColor: Color): AgainstRow[] {
  const bs = game.buffs;
  if (!bs || game.result) return [];
  const rows: AgainstRow[] = [];
  bs.effects.forEach((e, idx) => {
    if (e.turns != null && e.turns <= 0) return;
    if (e.kind === "freeze" && e.owner === myColor) {
      rows.push({
        key: `fx-freeze-${e.sq}-${idx}`,
        name: "Frozen piece",
        detail: `Your piece on ${sqName(e.sq)} cannot move.`,
        left: turnsLeft(e.turns),
      });
    } else if (e.kind === "walnut" && e.owner === myColor) {
      rows.push({
        key: `fx-walnut-${e.sq}-${idx}`,
        name: "Walnut hex",
        detail: `Your piece on ${sqName(e.sq)} is a walnut and cannot move.`,
        left: turnsLeft(e.turns),
      });
    } else if (e.kind === "barred" && e.against === myColor) {
      rows.push({
        key: `fx-barred-${idx}`,
        name: "Barred squares",
        detail: `You cannot move onto ${e.squares.map(sqName).join(", ")}.`,
        left: turnsLeft(e.turns),
      });
    } else if (e.kind === "no_pawn_advance" && e.against === myColor) {
      rows.push({
        key: `fx-pawns-${idx}`,
        name: "Pawns halted",
        detail: "Your pawns cannot advance.",
        left: turnsLeft(e.turns),
      });
    } else if (e.kind === "king_only" && e.against === myColor) {
      rows.push({
        key: `fx-kingonly-${idx}`,
        name: "King only",
        detail: "Only your king may move.",
        left: turnsLeft(e.turns),
      });
    }
  });
  const skips = bs.skips[myColor];
  if (skips > 0) {
    rows.push({
      key: "fx-skips",
      name: skips === 1 ? "Turn skip" : "Turn skips",
      detail: skips === 1 ? "Your next turn is skipped." : `Your next ${skips} turns are skipped.`,
      left: "Pending",
    });
  }
  // Opponent-held curses running against you: only face-up cards (masked
  // instances have no def, so nothing hidden can surface here) that expose a
  // live status line. Category "hex" is the curse pool; everything else in
  // their hand either targets themselves or already shows as a board effect.
  const oppColor: Color = myColor === "w" ? "b" : "w";
  bs.players[oppColor].buffs.forEach((inst, i) => {
    if (inst.spent || inst.nullified) return;
    const def = BUFF_BY_ID[inst.id];
    if (!def || def.category !== "hex") return;
    const status = def.status?.(inst);
    if (!status) return;
    rows.push({ key: `hex-${inst.id}-${i}`, name: def.name, detail: def.description, left: status });
  });
  return rows;
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
  /** Everything the opponent has played this game: after each play's 5-minute
   * stay in the top-right feed, this dock section is its permanent home. */
  plays?: OppPlay[];
}

export function BuffDock({ game, myColor, canAct, onStartUse, hideOpponentCards, plays }: Props) {
  const [showUsed, setShowUsed] = useState(false);
  const reduceMotion = useReducedMotion();

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

  // Hidden opponent cards no longer render as face-down tier minis (owner
  // call: the little tier tiles were noise). Revealed cards keep their full
  // rows; everything hidden collapses into one small "N hidden" sign.
  const isHiddenOpp = (inst: (typeof theirs)[number]) =>
    !BUFF_BY_ID[inst.id] || (hideOpponentCards && !inst.spent && !inst.nullified);
  const theirsShown = theirsActive.filter(({ inst }) => !isHiddenOpp(inst));
  const theirsHiddenCount = theirsActive.length - theirsShown.length;
  const theirsUsedShown = theirsUsed.filter(({ inst }) => !isHiddenOpp(inst));
  const theirsUsedHiddenCount = theirsUsed.length - theirsUsedShown.length;

  const lastMine = mine[mine.length - 1] ?? null;
  const lastMineDef = lastMine ? BUFF_BY_ID[lastMine.id] : undefined;
  const lastTheirs = theirs[theirs.length - 1] ?? null;
  const lastTheirsHidden =
    !!lastTheirs && (!BUFF_BY_ID[lastTheirs.id] || (hideOpponentCards && !lastTheirs.spent && !lastTheirs.nullified));

  // Next shared draft: total plies until both players draft again. Older
  // saves predate nextDraftAtPly; the chip simply hides then.
  const ply = game.board.history.length;
  const nextDraftPly = bs.nextDraftAtPly;
  const draftMovesLeft =
    nextDraftPly != null && !game.result ? Math.max(0, Math.ceil((nextDraftPly - ply) / 2)) : null;
  const draftFrac =
    nextDraftPly != null
      ? Math.max(0, Math.min(1, 1 - (nextDraftPly - ply) / Math.max(1, bs.cadence * 2)))
      : 0;
  const myDraftBlocked = (bs.players[myColor].flags.blockedDrafts ?? 0) > 0;
  const oppDraftBlocked = bs.players[oppColor].flags.blockedDrafts ?? 0;

  // Constraints currently running against me (see againstYouRows above).
  const againstRows = againstYouRows(game, myColor);

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
          "dock-card relative overflow-hidden rounded-[1px] border px-2 py-1.5 transition-transform duration-100 " +
          (dead ? "opacity-45 " : "") +
          (usable
            ? "border-verdigris-glow/40 bg-verdigris/[0.06] pl-3 active:translate-y-px "
            : "border-white/10 bg-white/[0.02] ")
        }
      >
        {/* Usable accent: a solid left edge marks the rows you can act on
            right now (edge, not glow). */}
        {usable && (
          <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-verdigris-glow/80" />
        )}
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
          <TurnCostBadge cost={turnCost(def)} short />
          {usable && (
            <span className="smallcaps shrink-0 rounded-[1px] border border-verdigris-glow/50 bg-verdigris/15 px-1 py-px text-[8px] font-semibold text-verdigris-glow">
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
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
          >
            {TIER_ROMAN[inst.tier]}
          </span>
          {activatable &&
            (usable ? (
              <button
                onClick={() => onStartUse(i)}
                className="btn-glass btn-glass--primary shrink-0 px-2.5 py-1 font-display text-[10px] font-semibold tracking-wide"
              >
                Use
              </button>
            ) : (
              <button
                disabled
                title="Your turn only"
                className="shrink-0 cursor-not-allowed rounded-[1px] border border-white/10 bg-white/[0.03] px-2.5 py-1 font-display text-[10px] tracking-wide text-parchment-400"
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
    // Hidden identities render nothing here; the aggregate "N hidden" sign
    // below the revealed rows carries them.
    if (!def || (hideOpponentCards && !dead)) return null;
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={
          "dock-card w-full rounded-[1px] border border-white/10 bg-white/[0.02] px-2 py-1 " +
          (dead ? "opacity-45" : "")
        }
      >
        <div className="flex items-center gap-1.5">
          <span className={`min-w-0 flex-1 truncate font-display text-[11px] font-semibold tier-${inst.tier}`}>
            {def.name}
          </span>
          <TurnCostBadge cost={turnCost(def)} short />
          {inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-oxblood-glow">Nullified</span>}
          {inst.spent && !inst.nullified && <span className="smallcaps shrink-0 text-[8px] text-parchment-400">Used</span>}
          <span
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
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
    <div data-buff-dock className="plate flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-inherit px-3 pb-2">
        {/* Next-draft indicator: how many of your moves until the shared
            draft fires, with a small bar filling toward it. Hidden for older
            saves without nextDraftAtPly and once the game ends. Blocked
            drafts (opponent hexes) take over the chip in alert colors. */}
        {draftMovesLeft != null && (
          <div
            role="status"
            className={
              "mt-2 flex items-center gap-2 rounded-[1px] border px-2 py-1.5 " +
              (myDraftBlocked
                ? "border-oxblood-glow/40 bg-oxblood/10"
                : draftMovesLeft === 0
                ? "border-gold/50 bg-gold/10"
                : "border-white/10 bg-white/[0.03]")
            }
          >
            <Hourglass
              aria-hidden
              size={11}
              strokeWidth={2.2}
              className={"shrink-0 " + (myDraftBlocked ? "text-oxblood-glow" : "text-parchment-400")}
            />
            <span
              className={
                "smallcaps min-w-0 truncate text-[9px] " +
                (myDraftBlocked
                  ? "text-oxblood-glow"
                  : draftMovesLeft === 0
                  ? "text-gold-leaf"
                  : "text-parchment-400")
              }
            >
              {myDraftBlocked
                ? "Next draft blocked"
                : draftMovesLeft === 0
                ? "Draft now"
                : `Next draft in ${draftMovesLeft} move${draftMovesLeft === 1 ? "" : "s"}`}
            </span>
            <span className="ml-auto h-1 w-14 shrink-0 overflow-hidden rounded-[1px] bg-white/10">
              <span
                className={
                  "block h-full transition-[width] duration-300 " +
                  (myDraftBlocked ? "bg-oxblood-glow/70" : "bg-gold-leaf/80")
                }
                style={{ width: `${draftFrac * 100}%` }}
              />
            </span>
          </div>
        )}

        {/* Latest pick slot: your newest card stays visible here; the
            opponent's side shows a face-down card while hidden. */}
        {(lastMine || lastTheirs) && (
          <div className="sticky top-0 z-10 -mx-3 border-b border-white/10 bg-inherit px-3 pb-2 pt-2">
            {/* The pocket: a rounded slot that flashes a brief mint/sun glow
                whenever a fresh card lands (keying by the card counts remounts
                it, replaying the one-shot CSS animation). */}
            <div
              key={`pocket-${mine.length}-${theirs.length}`}
              className="dock-pocket-flash flex items-center gap-2 rounded-[1px] border border-white/10 bg-white/[0.03] px-2 py-1.5"
            >
              <Inbox aria-hidden size={12} strokeWidth={2.2} className="shrink-0 text-parchment-400" />
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  title={`Opponent's latest draft (hidden, tier ${TIER_ROMAN[lastTheirs.tier]})`}
                  className="flex shrink-0 items-center gap-1 smallcaps text-[9px] text-parchment-400"
                >
                  <EyeOff aria-hidden size={10} strokeWidth={2.2} />
                  hidden
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
          </div>
        )}

        {/* Pending take-both: the next offer is taken whole, and the player
            should know before the draft opens, not discover it inside. */}
        {(bs.players[myColor].flags.takeBoth ?? 0) > 0 && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[1px] border border-gold/50 bg-gold/10 px-2 py-1.5"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-gold-leaf animate-flicker" />
            <span className="font-display text-[11px] font-semibold text-gold-leaf">
              Next draft: you take BOTH cards
            </span>
          </div>
        )}

        {/* "Against you": every constraint currently limiting your play, with
            remaining duration. New rows flash in once when a constraint
            lands (row keys are stable while an effect holds). */}
        {againstRows.length > 0 && (
          <>
            <DockSectionHeader icon={ShieldAlert} label="Against you" count={againstRows.length} />
            <div className="space-y-1">
              {againstRows.map((row) => (
                <motion.div
                  key={row.key}
                  initial={reduceMotion ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="dock-card dock-pocket-flash rounded-[1px] border border-oxblood-glow/35 bg-oxblood/[0.07] px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate font-display text-[12px] font-semibold leading-tight text-oxblood-glow">
                      {row.name}
                    </span>
                    <span className="smallcaps shrink-0 rounded-[1px] border border-oxblood-glow/40 bg-oxblood/15 px-1.5 py-px text-[8px] font-semibold text-oxblood-glow">
                      {row.left}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-parchment-300">{row.detail}</p>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <DockSectionHeader
          icon={Layers}
          label={`Your ${nounPlural}`}
          count={mine.length}
        />
        {mine.length === 0 && (
          <p className="text-[11px] text-parchment-400">
            None yet. Your first draft arrives after {bs.players[myColor].nextDraftAt} moves.
          </p>
        )}
        <div className="space-y-1">{mineActive.map(myRow)}</div>

        {theirs.length > 0 && (
          <>
            <div className="border-t border-white/10 pt-2">
              <DockSectionHeader
                icon={Swords}
                label={`Opponent's ${nounPlural}`}
                count={theirs.length}
              />
            </div>
            <div className="flex flex-wrap items-start gap-1">{theirsShown.map(oppEntry)}</div>
            {theirsHiddenCount > 0 && (
              <div
                className="flex items-center gap-1.5 rounded-[1px] border border-white/10 bg-white/[0.02] px-2 py-1"
                title={`Tiers: ${theirsActive
                  .filter(({ inst }) => isHiddenOpp(inst))
                  .map(({ inst }) => TIER_ROMAN[inst.tier])
                  .join(", ")}`}
              >
                <EyeOff aria-hidden size={11} strokeWidth={2.2} className="shrink-0 text-parchment-400" />
                <span className="smallcaps text-[9px] text-parchment-400">
                  {theirsHiddenCount} hidden card{theirsHiddenCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </>
        )}

        {/* Blocked-draft moment: your hex sealed the opponent's next draft(s).
            Reads as an event: face-down minis with a bar across flip in.
            Keyed by the count so stacking another block replays it. */}
        {oppDraftBlocked > 0 && !game.result && (
          <motion.div
            key={`opp-blocked-${oppDraftBlocked}`}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-2 rounded-[1px] border border-oxblood-glow/40 bg-oxblood/10 px-2 py-1.5"
          >
            <Ban aria-hidden size={11} strokeWidth={2.2} className="shrink-0 text-oxblood-glow" />
            <span className="smallcaps min-w-0 flex-1 truncate text-[9px] text-oxblood-glow">
              {oppDraftBlocked === 1
                ? "Opponent's next draft blocked"
                : `Opponent's next ${oppDraftBlocked} drafts blocked`}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {Array.from({ length: Math.min(oppDraftBlocked, 3) }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="relative flex h-6 w-[18px] items-center justify-center rounded-[1px] border border-oxblood-glow/40 bg-ink-950"
                >
                  <span className="absolute inset-[2px] rounded-[1px] border border-white/10" />
                  <span className="absolute inset-x-[2px] top-1/2 h-px bg-oxblood-glow/80" />
                </span>
              ))}
            </span>
          </motion.div>
        )}

        {plays && plays.length > 0 && <OppPlaysDockSection plays={plays} />}

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
                <div className="flex flex-wrap items-start gap-1">{theirsUsedShown.map(oppEntry)}</div>
                {theirsUsedHiddenCount > 0 && (
                  <p className="smallcaps text-[9px] text-parchment-400">
                    +{theirsUsedHiddenCount} hidden used
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
