"use client";

import { turnCost, type TurnCost } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { NerfGame } from "@/engine/game";
import type { Color } from "@/engine/types";
import { cardFaceIcon } from "@/lib/cardIcon";
import { TIER_ROMAN } from "@/lib/tiers";
import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Ability bar: the quick-cast surface.
//
// A compact strip of circular icon buttons listing every ACTIVATABLE thing
// the player currently holds: plain activated cards plus companion abilities
// (Cami's Sweep the Lines / Guardian Leap, the NewJeans members' orders),
// which are ordinary activated buffs with a recharging cooldown. Clicking a
// button starts the exact same targeting flow the BuffDock's Use button does
// (the parent threads the same onStartUse through useBuffTargeting), so the
// bar adds no new activation path: the dock stays the inventory/ledger, this
// is the one-click cast row.
//
// Docked vertically beside the board on desktop; the parent renders a second,
// horizontal instance above the mobile drawer. Everything here is a pure read
// of public state (defs + instance state), keyboard reachable (buttons stay
// focusable while unusable, aria-disabled, tooltip on focus), and static
// enough to be reduced-motion safe (the only animation is a color/ring
// transition).
// ---------------------------------------------------------------------------

const COST_LABEL: Record<TurnCost, string> = {
  turn: "Costs your turn",
  free: "Free action",
  instant: "Instant",
  passive: "Passive",
};

interface Entry {
  index: number;
  id: string;
  name: string;
  description: string;
  tier: number;
  cost: TurnCost;
  status: string | null;
  /** Recharging ability: turns left + full length for the ring. */
  cooldown: { left: number; total: number } | null;
  /** Ready to cast right now (canAct is layered on top by the button). */
  ready: boolean;
  Icon: ReturnType<typeof cardFaceIcon>;
}

/** Everything castable (now or after a recharge) in `color`'s hand. */
export function abilityEntries(game: NerfGame, color: Color): Entry[] {
  const bs = game.buffs;
  if (!bs) return [];
  const out: Entry[] = [];
  bs.players[color].buffs.forEach((inst, index) => {
    const def = BUFF_BY_ID[inst.id];
    if (!def || def.kind !== "activated" || inst.spent || inst.nullified) return;
    const cooldown = def.cooldown?.(inst) ?? null;
    const coolingDown = !!inst.usedActivation && cooldown != null && cooldown.left > 0;
    // A fired one-shot (or a spent once-per-game ability) leaves the bar; the
    // dock's Used pile keeps its record. Recharging abilities stay, ringed.
    if (inst.usedActivation && !coolingDown) return;
    out.push({
      index,
      id: inst.id,
      name: def.name,
      description: def.description,
      tier: inst.tier,
      cost: turnCost(def),
      status: def.status?.(inst) ?? null,
      cooldown,
      ready: !coolingDown,
      Icon: cardFaceIcon(def.id, def.category, def.icon),
    });
  });
  return out;
}

/** Cooldown ring around a button: fills gold as the ability recharges, full
 * (and quietly verdigris) when ready. Decorative twin of the turns-left
 * number in the corner badge; aria-hidden throughout. */
function CooldownRing({ cooldown, ready }: { cooldown: Entry["cooldown"]; ready: boolean }) {
  const R = 19;
  const CIRC = 2 * Math.PI * R;
  const frac =
    cooldown == null || cooldown.total <= 0
      ? 1
      : Math.max(0, Math.min(1, (cooldown.total - cooldown.left) / cooldown.total));
  return (
    <svg
      aria-hidden
      viewBox="0 0 44 44"
      className="pointer-events-none absolute inset-0 -rotate-90 h-full w-full"
    >
      <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <circle
        cx="22"
        cy="22"
        r={R}
        fill="none"
        stroke={ready ? "rgb(122 178 153 / 0.9)" : "rgb(216 181 110 / 0.9)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - frac)}
        style={{ transition: "stroke-dashoffset 300ms ease, stroke 300ms ease" }}
      />
    </svg>
  );
}

interface Props {
  game: NerfGame;
  myColor: Color;
  /** Activation is only allowed on your turn while the game is live. */
  canAct: boolean;
  /** Same handler the BuffDock's Use button calls (useBuffTargeting.start,
   * plus whatever the page wraps around it). */
  onStartUse: (index: number) => void;
  /** The buff index currently mid-targeting, to mark its button. */
  activeIndex?: number | null;
  /** "vertical" docks beside the board (desktop); "horizontal" is the strip
   * above the mobile drawer. */
  orientation: "vertical" | "horizontal";
  className?: string;
  style?: CSSProperties;
}

export function AbilityBar({
  game,
  myColor,
  canAct,
  onStartUse,
  activeIndex,
  orientation,
  className,
  style,
}: Props) {
  const entries = abilityEntries(game, myColor);
  if (entries.length === 0) return null;
  const vertical = orientation === "vertical";
  return (
    <div
      role="toolbar"
      aria-label="Abilities"
      aria-orientation={orientation}
      style={style}
      className={
        "plate flex items-center gap-1.5 rounded-[1px] p-1.5 " +
        (vertical
          ? "max-h-full flex-col overflow-y-auto "
          : "max-w-full flex-row overflow-x-auto ") +
        (className ?? "")
      }
    >
      <span
        className={
          "smallcaps shrink-0 text-[8px] font-semibold tracking-wider text-parchment-500 " +
          (vertical ? "py-0.5 [writing-mode:vertical-rl]" : "px-0.5")
        }
      >
        Abilities
      </span>
      {entries.map((e) => {
        const usable = canAct && e.ready;
        const active = activeIndex === e.index;
        const Icon = e.Icon ?? Sparkles;
        const cdText =
          e.cooldown && e.cooldown.left > 0
            ? `Recharging: ready in ${e.cooldown.left} of your turns.`
            : null;
        return (
          <span key={e.index} className="group relative shrink-0">
            <button
              type="button"
              aria-disabled={!usable}
              aria-label={
                `${e.name}, tier ${TIER_ROMAN[e.tier as 1]}. ${COST_LABEL[e.cost]}.` +
                (cdText ? ` ${cdText}` : usable ? " Ready." : " Not usable right now.")
              }
              onClick={() => {
                if (usable) onStartUse(e.index);
              }}
              className={
                "relative grid h-11 w-11 place-items-center rounded-full border transition-colors duration-150 " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 " +
                (active
                  ? "border-mint/70 bg-mint/15 text-mint-glow "
                  : usable
                  ? "cursor-pointer border-gold/45 bg-gold/[0.08] text-gold-leaf hover:border-gold/80 hover:bg-gold/15 "
                  : "cursor-not-allowed border-white/12 bg-white/[0.03] text-parchment-400 ")
              }
            >
              <CooldownRing cooldown={e.cooldown} ready={e.ready} />
              <Icon aria-hidden size={18} strokeWidth={2.1} />
              {/* Turns-left numeral while recharging; the ring is decorative. */}
              {e.cooldown && e.cooldown.left > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] rounded-full border border-gold/50 bg-ink-950 px-0.5 text-center font-mono text-[9px] font-bold tabular-nums text-gold-leaf">
                  {e.cooldown.left}
                </span>
              )}
            </button>
            {/* Tooltip: name, tier, live status, rule text, cost. Shown on
                hover and on keyboard focus; pointer-events off so it never
                traps the cursor. */}
            <span
              role="tooltip"
              className={
                "plate dropdown pointer-events-none absolute z-40 hidden w-56 p-2.5 shadow-2xl group-hover:block group-focus-within:block " +
                (vertical ? "right-full top-0 mr-2" : "bottom-full left-1/2 mb-2 -translate-x-1/2")
              }
            >
              <span className={`block font-display text-[12px] font-bold tier-${e.tier}`}>
                {e.name}
                <span className="ml-1.5 text-parchment-400">{TIER_ROMAN[e.tier as 1]}</span>
              </span>
              {(cdText ?? e.status) && (
                <span className="smallcaps mt-0.5 block text-[9px] text-gold/85">
                  {cdText ?? e.status}
                </span>
              )}
              <span className="mt-1 block text-[10px] leading-snug text-parchment-300">
                {e.description}
              </span>
              <span className="smallcaps mt-1 block text-[9px] text-parchment-400">
                {COST_LABEL[e.cost]}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
