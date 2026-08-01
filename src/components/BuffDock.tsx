"use client";

import { BuffPick, BuffTarget, draftCardNoun, turnCost } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { TurnCostBadge } from "./TurnCostBadge";
import { NerfGame, activateBuff, buffNextTarget } from "@/engine/game";
import { Color } from "@/engine/types";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";
import { playCardUse } from "@/lib/sounds";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useModalChrome } from "@/lib/useModalChrome";
import { motion } from "framer-motion";
import { Ban, ChevronRight, Clock, Hourglass, Inbox, Layers, ShieldAlert, Swords, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BuffCard } from "./BuffCard";
import { OppPlaysDockSection, type OppPlay } from "./OppPlaysLog";
// Shares the dock pocket flash keyframes (and nothing else) with the overlay.
import "./DraftOverlay.css";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Buff dock and targeting.
//
// Activated buffs target on the REAL board: useBuffTargeting owns the pick
// chain, the page paints targeting.target.squares through the Board's
// pickSquares prop, and clicking a highlighted square advances the chain.
// Only enemy-buff-list targets (which have no board representation) fall
// back to the EnemyBuffModal.
//
// Held-buff visibility: FULLY PUBLIC HANDS (owner rule). Online the server
// sends both sides' held cards face-up and bot games no longer pass
// hideOpponentCards, so the opponent's whole inventory renders as real rows.
// The hidden-card machinery below (empty-id placeholder instances, the
// hideOpponentCards prop, the "N hidden" sign) is kept working rather than
// deleted so an old server frame or a future hidden mode degrades gracefully.
// ---------------------------------------------------------------------------

export interface BuffTargeting {
  buffIndex: number;
  picks: BuffPick[];
  target: BuffTarget;
}

/** True on hover-capable fine-pointer devices (mouse/trackpad). SSR-safe:
 * false until mounted. Used to gate the Use button's HTML5 draggable: on
 * touch browsers a draggable element inside the scrollable drawer swallows
 * taps (the touch is held as a potential drag and click never fires), which
 * blocked the Use button on mobile. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
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
  const finishRef = useRef<(() => void) | null>(null);

  // Deactivating cancels any in-progress targeting; adjust during render rather
  // than in an effect so the panel never shows a stale targeting frame.
  if (!active && targeting) setTargeting(null);

  useEffect(() => {
    if (!targeting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTargeting(null);
      // Enter mirrors the Done button on a finishable step (keyboard parity
      // with the banner controls; ignored while typing in an input).
      if (
        e.key === "Enter" &&
        targeting.target.kind === "square" &&
        targeting.target.finishable &&
        !(e.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(e.target.tagName))
      ) {
        finishRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targeting]);

  const start = (index: number) => {
    if (!game) return;
    const target = buffNextTarget(game, myColor, index, []);
    if (!target) {
      // No targeting needed: fire immediately. The card-used voice marks the
      // activation itself; the effect's own voice (shield, freeze, explosion...)
      // follows separately when it lands.
      const usedId = game.buffs?.players[myColor]?.buffs[index]?.id;
      if (onUse) {
        onUse(index, []);
        playCardUse(usedId);
      } else if (activateBuff(game, myColor, index, [])) {
        onChanged?.();
        playCardUse(usedId);
      }
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
      // Last target picked: the card is now cast. One card-used voice per use.
      playCardUse(game.buffs?.players[myColor]?.buffs[targeting.buffIndex]?.id);
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
    // Finished early on a finishable step: the picks so far are cast now.
    playCardUse(game.buffs?.players[myColor]?.buffs[targeting.buffIndex]?.id);
    setTargeting(null);
  };

  const cancel = () => setTargeting(null);

  // Keep the keydown handler's Enter shortcut pointed at the CURRENT finish
  // closure without re-subscribing the listener on every pick. Written from
  // an effect (never during render) per the react-hooks refs rule.
  useEffect(() => {
    finishRef.current = finish;
  });

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
  invalidKey,
}: {
  game: NerfGame;
  myColor: Color;
  targeting: BuffTargeting;
  onCancel: () => void;
  /** Finishable steps (the picks so far are a complete effect) show a Done
   * button that fires the buff early instead of picking further targets. */
  onFinish?: () => void;
  /** Bumped by the host whenever a tap lands on a NON-eligible square
   * (Board.onInvalidPick). Each bump flashes a one-line hint naming what is
   * targetable, then it fades on its own. */
  invalidKey?: number;
}) {
  const inst = game.buffs?.players[myColor].buffs[targeting.buffIndex];
  const name = (inst && BUFF_BY_ID[inst.id]?.name) ?? "Buff";
  const empty = targeting.target.kind === "square" && targeting.target.squares.length === 0;
  const finishable = targeting.target.kind === "square" && !!targeting.target.finishable;
  const picked = targeting.picks.length;
  // Transient invalid-tap hint: each bump of invalidKey shows the line
  // immediately (derived during render), and a timer marks that bump as
  // expired ~2.2s later so it fades on its own.
  const [expiredInvalidKey, setExpiredInvalidKey] = useState(0);
  useEffect(() => {
    if (!invalidKey) return;
    const t = window.setTimeout(() => setExpiredInvalidKey(invalidKey), 2200);
    return () => window.clearTimeout(t);
  }, [invalidKey]);
  const showInvalid = !!invalidKey && expiredInvalidKey !== invalidKey;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-full z-30 mt-1.5 flex flex-col items-center gap-1 px-2">
      {/* Your card is mid-use: a frosted glass chip with the card name, the
          current step, a picked-so-far counter, and clear Done / Cancel. Sits
          just BELOW the board's bottom edge so it never hides the squares the
          player is aiming at. Blue marks the active card (yours — your buff),
          coral the back-out. */}
      <div className="glass-chip pointer-events-auto flex max-w-full items-center gap-2.5 border border-mode-buff/40 px-3.5 py-2">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-mode-buffGlow" />
        <span className="min-w-0 truncate font-display text-xs font-semibold text-parchment">
          <span className="text-mode-buffGlow">{name}</span>
          <span className="text-parchment-400"> · </span>
          {empty ? "no valid targets right now" : targeting.target.label}
        </span>
        {picked > 0 && (
          <span
            className="shrink-0 rounded-[1px] border border-[color:var(--edge-strong)] bg-white/[0.08] px-2 py-0.5 font-mono text-[12px] tabular-nums text-parchment-200"
            title={`${picked} target${picked === 1 ? "" : "s"} picked so far`}
          >
            {picked} picked
          </span>
        )}
        {finishable && onFinish && (
          <button
            onClick={onFinish}
            className="shrink-0 touch-manipulation inline-flex items-center justify-center min-h-[44px] sm:min-h-0 rounded-[1px] border border-mode-buff/60 bg-mode-buff/20 px-3 py-1 font-display text-[14px] sm:text-[13px] font-bold tracking-wide text-mode-buffGlow transition hover:bg-mode-buff/30"
            title="Fire now with the targets picked so far (the rest are forfeited)"
          >
            Done
          </button>
        )}
        <button
          onClick={onCancel}
          className="shrink-0 touch-manipulation inline-flex items-center justify-center min-h-[44px] sm:min-h-0 rounded-[1px] border border-coral/40 bg-coral/10 px-3 py-1 font-display text-[14px] sm:text-[13px] font-semibold tracking-wide text-coral-glow transition hover:bg-coral/20"
        >
          Cancel <span className="text-coral-glow/60">Esc</span>
        </button>
      </div>
      {/* Invalid-tap hint: one line naming what IS targetable, flashed after
          a tap on a non-eligible square, self-fading. Oxblood alert accent. */}
      {showInvalid && (
        <div
          role="status"
          className="glass-chip max-w-full border border-oxblood-glow/50 px-3 py-1 text-xs font-display font-semibold text-oxblood-glow"
        >
          {empty
            ? "No valid targets right now"
            : `Not a valid target · ${targeting.target.label}`}
        </div>
      )}
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
  // Hooks must run before any early return.
  useModalChrome(true, onCancel);
  if (target.kind !== "enemy-buff") return null;
  const inst = game.buffs?.players[myColor].buffs[targeting.buffIndex];
  const buffName = (inst && BUFF_BY_ID[inst.id]?.name) ?? "Buff";
  return (
    // Scroll-locked while the target picker is up (see useModalChrome); it has
    // no backdrop dismissal of its own, so only the lock and Escape apply.
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm px-4 py-6">
      <div className="plate w-full max-w-md p-5 max-h-[90dvh] overflow-y-auto">
        <div className="smallcaps text-[12px] text-parchment-400">{buffName}</div>
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
                    <span className="flex items-center justify-between border border-[color:var(--edge)] bg-white/[0.03] px-3 py-2 text-sm text-parchment">
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
          className="mt-4 w-full rounded-[1px] border border-coral/40 bg-coral/10 px-3 py-2 font-display text-[14px] sm:text-[13px] font-semibold tracking-wide text-coral-glow transition hover:bg-coral/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Each dock section carries its own colour identity so the eye sorts them
// without reading: your arsenal (your buffs) is BLUE — the semantic power/boon
// colour — the opponent's is coral (theirs, a distinct non-reserved hue), and
// the "against you" constraints stay in the Nerf-red alert family. (Green is
// reserved for online / wins / rating, so your arsenal reads blue, not mint.)
// The tint rides a small icon chip and the label; the count chip stays neutral
// so it never competes for attention. Class strings are literal (not built from
// variables) so Tailwind's JIT keeps them.
type SectionAccent = "mine" | "opponent" | "against";

const SECTION_ACCENT: Record<SectionAccent, { chip: string; label: string }> = {
  mine: { chip: "border-mode-buff/45 bg-mode-buff/10 text-mode-buffGlow", label: "text-mode-buffGlow" },
  opponent: { chip: "border-coral/45 bg-coral/10 text-coral-glow", label: "text-coral-glow" },
  against: { chip: "border-oxblood-glow/45 bg-oxblood/15 text-oxblood-glow", label: "text-oxblood-glow" },
};

/** Dock section header: a small colored icon chip, the section label in that
 * section's accent, and a neutral count chip pushed to the right edge. One
 * shared shape so every section reads alike while each keeps its own hue. */
function DockSectionHeader({
  icon: Icon,
  label,
  count,
  accent,
  open,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  accent?: SectionAccent;
  /** When onToggle is given, the whole header becomes a toggle button for its
   * section body (chevron driven by `open`). Session-only state, upstream. */
  open?: boolean;
  onToggle?: () => void;
}) {
  const a = accent ? SECTION_ACCENT[accent] : null;
  const inner = (
    <>
      {onToggle && (
        <ChevronRight
          aria-hidden
          size={12}
          strokeWidth={2.4}
          className={"shrink-0 text-parchment-400 transition-transform duration-150 " + (open ? "rotate-90" : "")}
        />
      )}
      <span
        aria-hidden
        className={
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[1px] border " +
          (a ? a.chip : "border-[color:var(--edge)] bg-white/[0.05] text-parchment-400")
        }
      >
        <Icon size={11} strokeWidth={2.4} />
      </span>
      <span className={"smallcaps min-w-0 truncate text-[12px] " + (a ? a.label : "text-parchment-400")}>
        {label}
      </span>
      <span className="ml-auto shrink-0 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.05] px-1.5 py-px font-mono text-[12px] tabular-nums text-parchment-300">
        {count}
      </span>
    </>
  );
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {inner}
      </button>
    );
  }
  return <div className="flex items-center gap-1.5">{inner}</div>;
}

/** Hoverable card name for the Latest pocket: mousing over (or tapping, on
 * touch) the newest card's name raises a small popover with the full rule
 * text, so "what did Grand Dominion do again?" is answered in place instead
 * of hunting the row below. */
function LatestHoverName({
  name,
  tier,
  description,
  className,
}: {
  name: string;
  tier: Tier;
  description?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  if (!description) return <span className={className}>{name}</span>;
  return (
    <span
      className="relative min-w-0 flex-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={
          className +
          " block w-full text-left underline decoration-dotted decoration-1 underline-offset-2 decoration-parchment-500/60"
        }
      >
        {name}
      </button>
      {open && (
        <span
          role="tooltip"
          className="plate dropdown absolute left-0 top-full z-30 mt-1.5 block w-64 max-w-[70vw] p-2.5 shadow-2xl"
        >
          <span className={`block font-display text-[12px] font-bold tier-${tier}`}>
            {name}
            <span className="ml-1.5 text-parchment-400">{TIER_ROMAN[tier]}</span>
          </span>
          <span className="mt-1 block text-[12px] font-normal normal-case leading-snug tracking-normal text-parchment-300">
            {description}
          </span>
        </span>
      )}
    </span>
  );
}

/** Unmistakable state stamp for a spent or nullified card, sized to read
 * without a hover. Nullified wears the oxblood alert colour; a plain "Used"
 * stays quiet but crisp. Kept at full strength (the row dims its name and
 * copy instead) so the mark always beats the dimming. */
function UsedBadge({ nullified }: { nullified: boolean }) {
  return nullified ? (
    <span className="smallcaps shrink-0 rounded-[1px] border border-oxblood-glow/50 bg-oxblood/15 px-1 py-px text-[12px] font-semibold text-oxblood-glow">
      Nullified
    </span>
  ) : (
    <span className="smallcaps shrink-0 rounded-[1px] border border-parchment-500/50 bg-white/[0.06] px-1 py-px text-[12px] font-semibold text-parchment-200">
      Used
    </span>
  );
}

/** Textual passive marker: names the state outright where only the gold dot
 * hinted at it before. Same quiet gold family as the dot it replaces. */
function PassiveChip() {
  return (
    <span
      title="Passive: always in effect"
      className="smallcaps shrink-0 rounded-[1px] border border-gold/40 bg-gold/10 px-1 py-px text-[11px] font-semibold text-gold-leaf/90"
    >
      Passive
    </span>
  );
}

/** Compact status chip for a COLLAPSED row so remaining time reads without
 * expanding: a countdown status renders as "Temp · N turns" with the little
 * clock, any other live status (e.g. "bound to e4") shows its own text. The
 * full status line still lives in the expanded body. */
function StatusChip({ status }: { status: string }) {
  const m = /(\d+)\s*turn/i.exec(status);
  const text = m ? `Temp · ${m[1]} turn${m[1] === "1" ? "" : "s"}` : status;
  return (
    <span
      title={pliesTitle(status) ?? status}
      // Shrinkable (not shrink-0): a long status must squeeze itself, never
      // the card name sitting in the same row.
      className="smallcaps inline-flex min-w-0 max-w-[8rem] shrink items-center gap-1 rounded-[1px] border border-gold/40 bg-gold/10 px-1 py-px text-[11px] font-semibold text-gold-leaf/90"
    >
      {m && <Clock aria-hidden size={9} strokeWidth={2.4} className="shrink-0" />}
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}

/** Thin rule that brackets the spent cards at the foot of an arsenal, so the
 * cards still in play read first and the used ones settle below their own
 * label. Rendered once per side (yours and the opponent's), never merged
 * across the two. */
function UsedDivider() {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="smallcaps text-[12px] font-semibold text-parchment-500">Used</span>
      <span aria-hidden className="divider-gilt" />
    </div>
  );
}

/** Small elegant progress ring for the "next draft in N moves" chip: fills
 * gold toward the draft (oxblood while your draft is blocked). Decorative
 * twin of the countdown text next to it; the fraction comes straight from
 * the same draftFrac the old bar used, no timing logic of its own. */
function DraftProgressRing({ fraction, blocked }: { fraction: number; blocked: boolean }) {
  const R = 7;
  const CIRC = 2 * Math.PI * R;
  return (
    <span aria-hidden className="ml-auto shrink-0">
      <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90 block">
        <circle cx="9" cy="9" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        {/* Blocked stroke mirrors the --accent-nerf token (#e05252); the gilt gold is decorative draft progress. */}
        <circle
          cx="9"
          cy="9"
          r={R}
          fill="none"
          stroke={blocked ? "rgb(224 82 82 / 0.85)" : "rgb(216 181 110 / 0.9)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - Math.max(0, Math.min(1, fraction)))}
          style={{ transition: "stroke-dashoffset 300ms ease, stroke 300ms ease" }}
        />
      </svg>
    </span>
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

export interface AgainstRow {
  key: string;
  name: string;
  detail: string;
  left: string;
  /** True when the effect is time-limited (a finite countdown or a pending
   * skip), so the row carries the small "temporary" clock. Permanent effects
   * ("until it ends") do not. */
  temporary: boolean;
  /** The source card's difficulty tier, when the constraint is a face-up
   * opponent curse. Board-derived constraints (freeze, barred, halted pawns...)
   * keep no tier: the serialized effect record does not retain which card and
   * tier produced them, so those rows stay on the neutral alert accent. */
  tier?: Tier;
}

const sqName = (sq: number) => "abcdefgh"[sq % 8] + (Math.floor(sq / 8) + 1);
const turnsLeft = (turns: number | null) =>
  turns == null ? "Until it ends" : `${turns} turn${turns === 1 ? "" : "s"} left`;
/** Hover detail for a "N turns left" chip: effect timers tick once per the
 *  affected side's move, so N turns ≈ 2N half-moves (plies) of game time. */
const pliesTitle = (left: string): string | undefined => {
  const m = /(\d+)\s*turn/i.exec(left);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return `${left}, about ${n * 2} half-move${n * 2 === 1 ? "" : "s"} (plies) of game time`;
};

// Exported: the game surfaces also feed these rows to the board-wide splash
// (BoardSplash), so a new constraint lands with one big announcement plus its
// permanent row here in the dock.
export function againstYouRows(game: NerfGame, myColor: Color): AgainstRow[] {
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
        temporary: e.turns != null,
      });
    } else if (e.kind === "walnut" && e.owner === myColor) {
      rows.push({
        key: `fx-walnut-${e.sq}-${idx}`,
        name: "Walnut hex",
        detail: `Your piece on ${sqName(e.sq)} is a walnut and cannot move.`,
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
      });
    } else if (e.kind === "barred" && e.against === myColor) {
      rows.push({
        key: `fx-barred-${idx}`,
        name: "Barred squares",
        detail: `You cannot move onto ${e.squares.map(sqName).join(", ")}.`,
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
      });
    } else if (e.kind === "no_pawn_advance" && e.against === myColor) {
      rows.push({
        key: `fx-pawns-${idx}`,
        name: "Pawns halted",
        detail: "Your pawns cannot advance.",
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
      });
    } else if (e.kind === "king_only" && e.against === myColor) {
      rows.push({
        key: `fx-kingonly-${idx}`,
        name: "King only",
        detail: "Only your king may move.",
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
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
      // A pending skip clears once it is consumed, so it is time-limited too.
      temporary: true,
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
    // Face-up curse: its status line reads "N turns left" while it is timed,
    // so a turns mention is a reliable "temporary" tell; a curse that runs for
    // the rest of the game says no such thing and stays permanent.
    rows.push({
      key: `hex-${inst.id}-${i}`,
      name: def.name,
      detail: def.description,
      left: status,
      tier: inst.tier,
      temporary: /turn/i.test(status),
    });
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
  const finePointer = useFinePointer();
  // Per-card expand/collapse, remembered for the whole game. Every row now
  // starts collapsed to a one-line summary (name + state chips) so the rail
  // stays lean as cards accumulate; the full description is one tap away.
  // Keyed by owner + index, both stable (used cards are marked spent, never
  // removed, so indices never shift).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  const reduceMotion = useReducedMotion();

  // One tab, replacing three independent whole-section collapses (your
  // arsenal, their arsenal, their play log) plus a fourth for "Against you".
  // Four things that could each be open or shut meant sixteen possible dock
  // heights in a fixed-height column, and the player got no say in which of
  // them they were looking at — only in how much of everything to hide. A tab
  // set answers the actual question ("whose stuff am I looking at?") and caps
  // the column height by construction rather than by folding.
  const [tab, setTab] = useState<"yours" | "theirs" | "log">("yours");

  // The Latest pocket used to auto-fold to a one-line strip ~5s after a card
  // landed, with a "pinned" flag so a manual toggle could out-argue the timer,
  // and a render-phase reset keyed to the hand sizes. That was three pieces of
  // state and a timer to save one row — and it moved the dock under the
  // player's cursor five seconds after they last touched it, which is the one
  // thing a status surface must not do. The pocket is just a row now.

  const bs = game.buffs;
  if (!bs) return null;
  const noun = draftCardNoun(bs.mode);
  // Nerf mode's dock holds a mix (hexes, boons, items); "hexes" is the
  // umbrella noun the mode drafts under.
  const nounPlural = noun === "hex" ? "hexes" : `${noun}s`;
  const oppColor: Color = myColor === "w" ? "b" : "w";
  const mine = bs.players[myColor].buffs;
  const theirs = bs.players[oppColor].buffs;

  // Every drafted card stays in the dock for the whole game, used or not, so
  // nothing a player spent silently disappears. Each entry collapses to a
  // name + tier header and expands to the full card on click.
  const mineAll = mine.map((inst, i) => ({ inst, i }));
  const theirsAll = theirs.map((inst, i) => ({ inst, i }));

  // Hidden opponent cards do not render as face-down tier minis (owner call:
  // the little tier tiles were noise). Revealed and used cards keep their full
  // rows; everything still hidden collapses into one small "N hidden" sign.
  const isHiddenOpp = (inst: (typeof theirs)[number]) =>
    !BUFF_BY_ID[inst.id] || (hideOpponentCards && !inst.spent && !inst.nullified);
  const theirsShown = theirsAll.filter(({ inst }) => !isHiddenOpp(inst));

  // A card counts as "used" once it is spent, nullified, or an activation that
  // has already fired. Split each arsenal so the cards still in play sit at the
  // top and the used ones gather under a "Used" rule at the foot of THAT side's
  // section, tier descending. Kept separate for your list and the opponent's,
  // never merged into one shared pile: "used" stays owned.
  const isDead = (inst: (typeof mine)[number]) =>
    !!(inst.spent || inst.nullified || inst.usedActivation);
  const byTierDesc = (
    a: { inst: (typeof mine)[number] },
    b: { inst: (typeof mine)[number] },
  ) => b.inst.tier - a.inst.tier;
  const mineLive = mineAll.filter(({ inst }) => !isDead(inst));
  const mineDead = mineAll.filter(({ inst }) => isDead(inst)).sort(byTierDesc);
  const theirsLive = theirsShown.filter(({ inst }) => !isDead(inst));
  const theirsDead = theirsShown.filter(({ inst }) => isDead(inst)).sort(byTierDesc);

  // Fold duplicates: the same card id in the same state (same spent/nullified/
  // used flags and the same live status line) renders as ONE row wearing a
  // "×N" count chip instead of N identical plates. The representative keeps
  // the first copy's index, so Use fires that copy; the next copy surfaces on
  // the same row once the first is spent (its state, and so its group, changes).
  const groupRows = <T extends { inst: (typeof mine)[number]; i: number }>(entries: T[]) => {
    const seen = new Map<string, T & { count: number }>();
    const out: (T & { count: number })[] = [];
    for (const e of entries) {
      const def = BUFF_BY_ID[e.inst.id];
      const k = [
        e.inst.id,
        e.inst.tier,
        e.inst.spent ? 1 : 0,
        e.inst.nullified ? 1 : 0,
        e.inst.usedActivation ? 1 : 0,
        def?.status?.(e.inst) ?? "",
      ].join("|");
      const g = seen.get(k);
      if (g) g.count += 1;
      else {
        const fresh = { ...e, count: 1 };
        seen.set(k, fresh);
        out.push(fresh);
      }
    }
    return out;
  };
  const mineLiveRows = groupRows(mineLive);
  const mineDeadRows = groupRows(mineDead);
  const theirsLiveRows = groupRows(theirsLive);
  const theirsDeadRows = groupRows(theirsDead);

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
  const takeBoth = (bs.players[myColor].flags.takeBoth ?? 0) > 0;

  // The one "Now" line. The LABEL always answers the question the player
  // actually has — when is my next draft — and the two side facts ride as
  // trailing chips rather than replacing it. Only a blocked draft takes the
  // label over, because then there is no "when" to report.
  const draftStatus = myDraftBlocked
    ? {
        label: "Next draft blocked",
        frame: "border-oxblood-glow/40 bg-oxblood/10",
        ink: "text-oxblood-glow",
        Icon: Ban,
      }
    : draftMovesLeft == null
      ? takeBoth
        ? {
            label: "Next draft: take BOTH cards",
            frame: "border-gold/50 bg-gold/10",
            ink: "text-gold-leaf",
            Icon: Layers,
          }
        : null
      : {
          label:
            draftMovesLeft === 0
              ? "Draft now"
              : `Next draft in ${draftMovesLeft} move${draftMovesLeft === 1 ? "" : "s"}`,
          frame: takeBoth || draftMovesLeft === 0 ? "border-gold/50 bg-gold/10" : "border-[color:var(--edge)] bg-white/[0.03]",
          ink: takeBoth || draftMovesLeft === 0 ? "text-gold-leaf" : "text-parchment-400",
          Icon: Hourglass,
        };

  // Constraints currently running against me (see againstYouRows above).
  const againstRows = againstYouRows(game, myColor);

  const myRow = ({ inst, i, count }: { inst: (typeof mine)[number]; i: number; count: number }) => {
    const def = BUFF_BY_ID[inst.id];
    if (!def) return null;
    // usedActivation retires an activated card the same as spent for the Use
    // button and the "Used" stamp, but a spendOnUse:false card is NOT spent, so
    // it stays in the list running its rider. Keep its live status line visible
    // (only spent/nullified cards truly go silent) so "Used" + "bound to e4" /
    // "fades in 3 of your turns" both read at once.
    const dead = inst.spent || inst.nullified || inst.usedActivation;
    const activatable = def.kind === "activated" && !dead;
    const usable = canAct && activatable;
    const status = inst.spent || inst.nullified ? null : def.status?.(inst) ?? null;
    const key = `mine-${i}`;
    // Every row starts collapsed to its one-line summary; tap to open the
    // full description (and the Use button for activated cards).
    const open = expanded[key] ?? false;
    return (
      <motion.div
        key={key}
        // Gated like the rows further down this same file, which already did
        // this. Ungated, every dock row slid in from x:-20 under OS reduced
        // motion (and, before the hook swap, under Settings > Animations: Off).
        initial={reduceMotion ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        className={
          "dock-card relative overflow-hidden rounded-[1px] border transition-transform duration-100 " +
          (dead
            ? "border-[color:var(--edge)] bg-white/[0.012] "
            : usable
            ? "border-verdigris-glow/40 bg-verdigris/[0.06] "
            : "border-[color:var(--edge)] bg-white/[0.02] ")
        }
      >
        {/* Usable accent: a solid left edge marks the rows you can act on
            right now (edge, not glow). Spent rows get a muted grey edge in the
            same spot so "used" reads from the same anchor as "usable". */}
        {usable && (
          <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-verdigris-glow/80" />
        )}
        {dead && <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-white/15" />}
        {/* Live-but-not-usable cards wear their tier color on the same left
            edge anchor (tier-bg-N supplies --tier-rgb to the gradient). */}
        {!usable && !dead && (
          <span aria-hidden className={`dock-tier-edge tier-bg-${inst.tier}`} />
        )}
        {/* Idle foil shimmer on high-tier holdings (tier 6+), the dock's quiet
            echo of the draft cards' holo finish. */}
        {!dead && inst.tier >= 6 && <span aria-hidden className="dock-shimmer" />}
        {/* Collapsed header: name + tier only, click to toggle. The Use button
            and description live in the expanded body, so a button never nests
            inside this toggle button. */}
        <button
          type="button"
          onClick={() => toggle(key)}
          aria-expanded={open}
          title={open ? undefined : def.description}
          className={"flex w-full items-center gap-1.5 px-2 py-1.5 text-left " + (usable ? "pl-3" : "")}
        >
          <ChevronRight
            aria-hidden
            size={12}
            strokeWidth={2.4}
            className={"shrink-0 text-parchment-400 transition-transform duration-150 " + (open ? "rotate-90" : "")}
          />
          <span
            className={
              "min-w-[3.5rem] flex-1 truncate font-display text-[12px] font-semibold leading-tight " +
              (dead
                ? "text-parchment-200 line-through decoration-1 decoration-parchment-400/70"
                : `tier-${inst.tier}`)
            }
          >
            {def.name}
          </span>
          {count > 1 && (
            <span
              title={`${count} copies, same state`}
              className="shrink-0 rounded-[1px] border border-[color:var(--edge-strong)] bg-white/[0.08] px-1 py-px font-mono text-[11px] tabular-nums text-parchment-200"
            >
              ×{count}
            </span>
          )}
          {/* Textual passive marker (was a bare gold dot). Hidden once the
              card is spent/nullified. */}
          {def.kind === "passive" && !dead && <PassiveChip />}
          {/* Collapsed rows carry the live countdown/status right on the
              one-liner; the expanded body repeats it in full. */}
          {!open && status && <StatusChip status={status} />}
          <TurnCostBadge cost={turnCost(def)} short />
          {usable && (
            <span className="smallcaps shrink-0 rounded-[1px] border border-verdigris-glow/50 bg-verdigris/15 px-1 py-px text-[12px] font-semibold text-verdigris-glow">
              Usable
            </span>
          )}
          {dead && <UsedBadge nullified={!!inst.nullified} />}
          <span
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
          >
            {TIER_ROMAN[inst.tier]}
          </span>
        </button>
        {open && (
          <div className="px-2 pb-1.5">
            {count > 1 && (
              <div className="smallcaps mb-1 text-[11px] text-parchment-400">
                {count} identical copies · Use plays one at a time
              </div>
            )}
            {status && (
              <div title={pliesTitle(status)} className="smallcaps mb-1 truncate text-[12px] text-gold/80">
                {status}
              </div>
            )}
            {/* Full description, always readable without hovering; spent cards
                fade their copy so the live rows carry the eye. */}
            <p className={"text-[12px] leading-snug text-parchment-300"}>
              {def.description}
            </p>
            {activatable &&
              (usable ? (
                <Button
                  tone="leaf"
                  size="xs"
                  // Second input path (additive): drag the usable card onto a
                  // highlighted board square to pick it. Native HTML5 drag is
                  // separate from the board's pointer-drag, so the click flow is
                  // untouched. The custom dataTransfer type lets the Board react
                  // to card drags only.
                  // Drag-to-board is a desktop affordance: on touch browsers
                  // a draggable element swallows taps (held as a potential
                  // drag), which blocked this button on mobile entirely.
                  draggable={finePointer}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-nerf-card", String(i));
                    e.dataTransfer.effectAllowed = "move";
                    onStartUse(i);
                  }}
                  onClick={() => onStartUse(i)}
                  // Thumb-sized below sm (44px is the touch floor); compact on
                  // desktop where the pointer is precise. btn-leaf, not the
                  // frosted btn-glass: this Use control rests in the dock for the
                  // whole game, and resting glass is reserved for the draft
                  // lock-in peak only (design system §5).
                  className="mt-1.5 touch-manipulation px-2.5 py-1 text-[13px] font-semibold tracking-wide max-sm:min-h-[44px] max-sm:w-full max-sm:px-4 max-sm:text-[14px] sm:cursor-grab sm:active:cursor-grabbing"
                >
                  Use
                </Button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Your turn only"
                  className="mt-1.5 cursor-not-allowed rounded-[1px] border border-[color:var(--edge)] bg-white/[0.03] px-2.5 py-1 font-display text-[13px] tracking-wide text-parchment-400 max-sm:min-h-[44px] max-sm:w-full max-sm:px-4 max-sm:text-[14px]"
                >
                  Use
                </button>
              ))}
          </div>
        )}
      </motion.div>
    );
  };

  const oppEntry = ({ inst, i, count }: { inst: (typeof theirs)[number]; i: number; count: number }) => {
    const def = BUFF_BY_ID[inst.id];
    const dead = inst.spent || inst.nullified || inst.usedActivation;
    // Hidden identities render nothing here; the aggregate "N hidden" sign
    // below the revealed rows carries them.
    if (!def || (hideOpponentCards && !dead)) return null;
    const key = `opp-${i}`;
    // The opponent's cards start collapsed; click to reveal the rule text.
    const open = expanded[key] ?? false;
    const status = inst.spent || inst.nullified ? null : def.status?.(inst) ?? null;
    return (
      <motion.div
        key={key}
        initial={reduceMotion ? false : { opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        className={
          "dock-card relative w-full overflow-hidden rounded-[1px] border border-[color:var(--edge)] " +
          (dead ? "bg-white/[0.012]" : "bg-white/[0.02]")
        }
      >
        {/* Tier-tinted left edge + high-tier idle shimmer, mirroring your own
            arsenal rows so both hands read on the same visual language. */}
        {!dead && <span aria-hidden className={`dock-tier-edge tier-bg-${inst.tier}`} />}
        {dead && <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-white/15" />}
        {!dead && inst.tier >= 6 && <span aria-hidden className="dock-shimmer" />}
        <button
          type="button"
          onClick={() => toggle(key)}
          aria-expanded={open}
          title={open ? undefined : def.description}
          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left"
        >
          <ChevronRight
            aria-hidden
            size={14}
            strokeWidth={2.4}
            className={"shrink-0 text-parchment-400 transition-transform duration-150 " + (open ? "rotate-90" : "")}
          />
          {/* The opponent's held cards read a notch LARGER than your own arsenal:
              what threatens you is the thing worth seeing clearly at a glance. */}
          <span
            className={
              "min-w-[3.5rem] flex-1 truncate font-display text-[13px] font-semibold leading-tight " +
              (dead
                ? "text-parchment-200 line-through decoration-1 decoration-parchment-400/70"
                : `tier-${inst.tier}`)
            }
          >
            {def.name}
          </span>
          {count > 1 && (
            <span
              title={`${count} copies, same state`}
              className="shrink-0 rounded-[1px] border border-[color:var(--edge-strong)] bg-white/[0.08] px-1 py-px font-mono text-[11px] tabular-nums text-parchment-200"
            >
              ×{count}
            </span>
          )}
          {def.kind === "passive" && !dead && <PassiveChip />}
          {!open && status && <StatusChip status={status} />}
          <TurnCostBadge cost={turnCost(def)} short />
          {dead && <UsedBadge nullified={!!inst.nullified} />}
          <span
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
          >
            {TIER_ROMAN[inst.tier]}
          </span>
        </button>
        {open && (
          /* Rule text on demand: what a revealed card does is one click away. */
          <div className="px-2 pb-1.5">
            {count > 1 && (
              <div className="smallcaps mb-1 text-[11px] text-parchment-400">
                {count} identical copies
              </div>
            )}
            {status && (
              <div title={pliesTitle(status)} className="smallcaps mb-1 truncate text-[12px] text-gold/80">
                {status}
              </div>
            )}
            <p className={"text-[12px] leading-snug text-parchment-300"}>{def.description}</p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div data-buff-dock className="plate flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-inherit px-3 pb-2">
        {/* ZONE A — "Now": ONE status line about the next draft.
            This was three separate stacked rows (the countdown chip, a
            take-both banner, and an opponent-blocked banner) that could all be
            on screen at once, pushing the actual card lists below the fold in a
            320px column. They are all facts about the same event, so they are
            one row: the countdown states rank by urgency, and the two side
            facts ride as trailing chips instead of owning a row each. */}
        {draftStatus && (
          <div
            role="status"
            className={
              "mt-2 flex items-center gap-2 rounded-[1px] border px-2 py-1.5 " + draftStatus.frame
            }
          >
            <draftStatus.Icon
              aria-hidden
              size={11}
              strokeWidth={2.2}
              className={"shrink-0 " + draftStatus.ink}
            />
            <span className={"smallcaps min-w-0 flex-1 truncate text-[12px] " + draftStatus.ink}>
              {draftStatus.label}
            </span>
            {/* The next offer is taken whole. A chip, not a banner: it changes
                what the draft is, but the player still needs the countdown. */}
            {takeBoth && draftMovesLeft != null && !myDraftBlocked && (
              <span
                title="Your next draft takes BOTH cards"
                className="smallcaps flex shrink-0 items-center gap-1 rounded-[1px] border border-gold/50 bg-gold/10 px-1 py-px text-[12px] font-semibold text-gold-leaf"
              >
                <Layers aria-hidden size={10} strokeWidth={2.4} />
                Both
              </span>
            )}
            {/* Your hex sealed their draft: their problem, not yours, so it is a
                chip on this row rather than an alert of its own. */}
            {oppDraftBlocked > 0 && !game.result && (
              <span
                title={
                  oppDraftBlocked === 1
                    ? "Opponent's next draft is blocked"
                    : `Opponent's next ${oppDraftBlocked} drafts are blocked`
                }
                className="smallcaps flex shrink-0 items-center gap-1 rounded-[1px] border border-oxblood-glow/40 bg-oxblood/15 px-1 py-px text-[12px] font-semibold text-oxblood-glow"
              >
                <Ban aria-hidden size={10} strokeWidth={2.4} />
                {oppDraftBlocked > 1 ? oppDraftBlocked : ""}
              </span>
            )}
            {draftMovesLeft != null && !myDraftBlocked && (
              <DraftProgressRing fraction={draftFrac} blocked={false} />
            )}
          </div>
        )}

        {/* Latest pick slot: your newest card stays visible here; the
            opponent's side shows a face-down card while hidden. */}
        {(lastMine || lastTheirs) && (
          <div className="sticky top-0 z-10 -mx-3 border-b border-[color:var(--edge)] bg-inherit px-3 pb-2 pt-2">
            {/* The pocket: a slot that flashes a brief mint/sun glow whenever a
                fresh card lands (keying by the card counts remounts it,
                replaying the one-shot CSS animation). */}
            <div
              key={`pocket-${mine.length}-${theirs.length}`}
              className="dock-pocket-flash flex items-center gap-2 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.03] px-2 py-1.5"
            >
              <span className="flex shrink-0 items-center gap-2">
                <Inbox aria-hidden size={12} strokeWidth={2.2} className="shrink-0 text-sun" />
                <span className="smallcaps shrink-0 text-[12px] text-sun/90">Latest</span>
              </span>
            {lastMine && (
              <motion.span
                key={`m${mine.length}`}
                initial={reduceMotion ? false : { opacity: 0, x: -18, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="flex min-w-0 flex-1"
              >
                <LatestHoverName
                  name={lastMineDef?.name ?? "Banked"}
                  tier={lastMine.tier}
                  description={lastMineDef?.description}
                  className={`truncate font-display text-[12px] font-semibold tier-${lastMine.tier}`}
                />
              </motion.span>
            )}
            {!lastMine && <span className="min-w-0 flex-1" />}
            {lastTheirs && !lastTheirsHidden && (
              <motion.span
                key={`t${theirs.length}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="flex max-w-[45%] shrink-0"
              >
                <LatestHoverName
                  name={BUFF_BY_ID[lastTheirs.id]?.name ?? "Hidden"}
                  tier={lastTheirs.tier}
                  description={BUFF_BY_ID[lastTheirs.id]?.description}
                  className={`truncate font-display text-[12px] tier-${lastTheirs.tier}`}
                />
              </motion.span>
            )}
            </div>
          </div>
        )}

        {/* ZONE C — one tab set. "Against you" lives under Theirs rather than
            in a section of its own: a constraint running against you and the
            card that cast it are the same story told from two ends, and they
            were two unbounded lists stacked in a 320px column. */}
        <div role="tablist" aria-label="Dock contents" className="flex gap-1 pt-1">
          {(
            [
              { id: "yours", label: "Yours", n: mine.length },
              { id: "theirs", label: "Theirs", n: theirsShown.length + againstRows.length },
              { id: "log", label: "Log", n: plays?.length ?? 0 },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-1.5 font-display text-[12px] transition " +
                (tab === t.id
                  ? "border-[color:var(--accent)] text-parchment-50"
                  : "border-transparent text-parchment-300 hover:text-parchment-100")
              }
            >
              {t.label}
              {t.n > 0 && (
                <span className="tabular text-[11px] text-parchment-400">{t.n}</span>
              )}
            </button>
          ))}
        </div>

        {/* Their play ledger. */}
        {tab === "log" &&
          (plays && plays.length > 0 ? (
            <OppPlaysDockSection plays={plays} />
          ) : (
            <p className="text-[12px] text-parchment-400">Nothing played yet.</p>
          ))}

        {/* "Against you": every constraint currently limiting your play, with
            remaining duration. New rows flash in once when a constraint
            lands (row keys are stable while an effect holds). */}
        {tab === "theirs" && againstRows.length > 0 && (
          <>
            <DockSectionHeader icon={ShieldAlert} label="Against you" count={againstRows.length} accent="against" />
            <div className="space-y-1">
              {againstRows.map((row) => {
                // A constraint from a face-up opponent curse is painted in that
                // card's difficulty colour (the same tier scale used everywhere
                // else) with its tier numeral, so a tier-8 curse reads hot and a
                // tier-1 mild at a glance. Anonymous board constraints have no
                // source tier and stay on the neutral oxblood alert accent.
                const t = row.tier;
                return (
                  <motion.div
                    key={row.key}
                    initial={reduceMotion ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className={
                      "dock-card dock-pocket-flash rounded-[1px] border px-2 py-1.5 " +
                      (t ? `tier-bg-${t}` : "border-oxblood-glow/35 bg-oxblood/[0.07]")
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "min-w-[3.5rem] flex-1 truncate font-display text-[12px] font-semibold leading-tight " +
                          (t ? `tier-${t}` : "text-oxblood-glow")
                        }
                      >
                        {row.name}
                      </span>
                      {/* Time-limited effect: a small hoverable clock so
                          "this wears off" reads at a glance. Permanent
                          constraints carry no clock. */}
                      {row.temporary && (
                        <span
                          title="temporary effect"
                          aria-label="temporary effect"
                          className="shrink-0 text-parchment-400"
                        >
                          <Clock aria-hidden size={11} strokeWidth={2.2} />
                        </span>
                      )}
                      {t ? (
                        <span
                          title={pliesTitle(row.left)}
                          className="smallcaps shrink-0 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.05] px-1.5 py-px text-[12px] font-semibold text-parchment-300"
                        >
                          {row.left}
                        </span>
                      ) : (
                        <span
                          title={pliesTitle(row.left)}
                          className="smallcaps shrink-0 rounded-[1px] border border-oxblood-glow/40 bg-oxblood/15 px-1.5 py-px text-[12px] font-semibold text-oxblood-glow"
                        >
                          {row.left}
                        </span>
                      )}
                      {t && (
                        <span
                          className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${t} tier-${t}`}
                        >
                          {TIER_ROMAN[t]}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-parchment-300">{row.detail}</p>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* The next-draft chip above already says when cards arrive; repeating
            it here went stale after banks ("your first draft" forever). An
            empty section costs one quiet line, never a tall blank plate. */}
        {tab === "yours" && mine.length === 0 && (
          <p className="text-[12px] text-parchment-400">None yet.</p>
        )}
        {/* A thin blue spine brackets your arsenal so "these are mine" is
            unmistakable next to the opponent's coral rows (blue = your buffs).
            Live cards sit up top; your spent ones gather under a "Used" rule at
            the foot of the same section (tier descending), so used cards stay
            clearly YOURS. */}
        {tab === "yours" && mine.length > 0 && (
          <div className="space-y-1 border-l border-mode-buff/30 pl-2">
            {mineLiveRows.map(myRow)}
            {mineDeadRows.length > 0 && (
              <>
                <UsedDivider />
                {mineDeadRows.map(myRow)}
              </>
            )}
          </div>
        )}

        {tab === "theirs" && theirsShown.length > 0 && (
          <>
            <DockSectionHeader
              icon={Swords}
              label={`Their ${nounPlural}`}
              count={theirsShown.length}
              accent="opponent"
            />
            {/* Opponent's cards mirror yours: live rows first, then their used
                ones under the same "Used" rule, kept in the opponent's own
                section rather than blended into a shared pile. */}
            <div className="space-y-1">
              {theirsLiveRows.map(oppEntry)}
              {theirsDeadRows.length > 0 && (
                <>
                  <UsedDivider />
                  {theirsDeadRows.map(oppEntry)}
                </>
              )}
            </div>
            {/* Opponent hidden cards render nothing at all: no face-down minis
                and no "N hidden" count. Cards summoned via the owner god panel
                (and any still-masked card) stay fully invisible to the
                opponent, on the left side included. */}
          </>
        )}

      </div>
    </div>
  );
}
