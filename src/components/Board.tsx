"use client";

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, type LucideIcon } from "lucide-react";
import { CardEntrance } from "./effects/cardEntrance";
import { cardFaceIcon } from "@/lib/cardIcon";
import {
  Piece,
  WalnutPiece,
  BananaPeel,
  WhoopeeCushionMark,
  MineMark,
  TrapdoorMark,
  SinkholeMark,
  BearTrapMark,
  LandlordClaimMark,
} from "./Pieces";
import {
  type BadgeCorner,
  BarrierStakes,
  BoltGlyph,
  BoundBuffMark,
  CastSpectacle,
  castIntensity,
  ChainJail,
  DetonationBurst,
  DuckGlyph,
  MotifBadge,
  PawnFence,
  prefetchSignatureVisuals,
  ShieldMark,
  SIGNATURES,
  type SignatureConfig,
  SignatureOverlay,
  RootClaws,
  SnowflakeGlyph,
  StunSwirl,
  SummonPoof,
  TransformFlourish,
} from "./effects/BoardEffects";
import { PLUGIN_ID_SET, PLUGIN_SIGNATURES } from "./effects/sigPlugins";
import { BRAINROT_MASCOT_IDS, SidelineMascot } from "./effects/SidelineMascot";
import { ExpansionZone } from "./effects/ExpansionZone";
import {
  GenBurst,
  genSignatureConfig,
  runGenSelfCheck,
  type GenConfig,
} from "./effects/genSignature";

// Companion pieces (I Love Cami): the card binds a placed piece whose square
// rides on the instance's state.sq (trackBoundPiece pattern), and the board
// renders bespoke portrait art at that square instead of the standard sprite.
// Art lives in public/; the id set here must match the companion cards in
// engine/buffs/personal.ts, and each entry names the piece class the card
// places so the art can follow her across optimistic overlays.
const COMPANION_ART: Record<string, { art: string; piece: PieceType }> = {
  i_love_cam: { art: "/companions/cami.svg", piece: "q" },
};

// Signature resolution: bespoke entries win; every other card falls back to
// its deterministic generated choreography (see genSignature.tsx), so no card
// is ever left without a play animation. Generated configs are cached: the
// generator is pure, so one build per card id per session is plenty.
const genConfigCache = new Map<string, GenConfig>();
// Bespoke lookup spanning the core table AND the plug-in registry
// (sigPlugins.tsx: god-tier / funny-meta modules). Core entries win.
const sigOf = (id: string): SignatureConfig | undefined => SIGNATURES[id] ?? PLUGIN_SIGNATURES[id];
function resolveSignature(id: string): SignatureConfig | GenConfig | undefined {
  const bespoke = sigOf(id);
  if (bespoke) return bespoke;
  // Plugin-covered card whose entry has not been published yet (the lazy
  // signature-visuals chunk is still loading): treat it as PENDING bespoke.
  // Falling through to the generated config here played the wrong,
  // default-looking art for a card that has a customized play — no art beats
  // wrong art, and the chunk is prefetched on mount so the window is tiny.
  if (PLUGIN_ID_SET.has(id)) return undefined;
  const def = BUFF_BY_ID[id];
  if (!def) return undefined;
  let cfg = genConfigCache.get(id);
  if (!cfg) {
    cfg = genSignatureConfig(id, def.category, def.tier);
    genConfigCache.set(id, cfg);
  }
  return cfg;
}
const isGenConfig = (cfg: SignatureConfig | GenConfig): cfg is GenConfig =>
  (cfg.visual as { gen?: boolean }).gen === true;
// Dev-only: prove the generated assignments stay collision-free next to the
// bespoke table.
if (process.env.NODE_ENV !== "production") {
  try {
    runGenSelfCheck(new Set(Object.keys(SIGNATURES)));
  } catch {}
}
import { EdgeAura, EmpowerShine, NerfAura, tierRgb } from "./effects/EmpowerAura";
import type { MotifMark } from "./effects/fxZones";
import { EffectPopover, type EffectPopoverContent } from "./EffectPopover";
import { FX_LEVELS, useFxHidden, useFxLevel } from "@/lib/fxToggle";
import { fxDurationScale, motionOff } from "@/lib/settings";
import { VfxLayer } from "./effects/vfx/VfxLayer";
import { vfxPlay } from "./effects/vfx/vfxBus";
import type { VfxPlay, VfxPoint } from "./effects/vfx/types";
import { resolveCardVfx } from "./effects/vfxSpecs";
import { findKing } from "@/engine/board";

// Rendered board-fraction center of a square (orientation-resolved), the
// coordinate space the canvas VFX layer draws in.
function sqToFrac(sq: Square, orientation: Color): VfxPoint {
  const col = orientation === "w" ? FILE(sq) : 7 - FILE(sq);
  const rowFromTop = orientation === "w" ? 7 - RANK(sq) : RANK(sq);
  return { x: (col + 0.5) / 8, y: (rowFromTop + 0.5) / 8 };
}
import type { BuffCategory, BuffMatchState } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { TIER_ROMAN } from "@/lib/tiers";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square } from "@/engine/types";
import {
  playAegis,
  playAtomic,
  playBlitz,
  playBonk,
  playCataclysm,
  playCathedral,
  playChains,
  playClockCage,
  playClockIce,
  playColossus,
  playCoronation,
  playCrownRain,
  playDraftChime,
  playDrop,
  playExplosion,
  playExtinction,
  playFreeze,
  playLightning,
  playMassFreeze,
  playNova,
  playPetrifiedForest,
  playPetrify,
  playRampage,
  playSelect,
  playShades,
  playShieldUp,
  playSiege,
  playSlip,
  playSnooze,
  playStun,
  playSummon,
  playTransform,
  playWall,
} from "@/lib/sounds";

interface Visual {
  fogged?: boolean;
  waterRank?: number;
  duckSquare?: number;
  bannedSquares?: number[];
  highlightSquares?: number[];
  // Draft-mode zone effects (all public information):
  /** Squares holding a frozen piece (icy tint + snowflake). */
  frozenSquares?: number[];
  /** Per-frozen-square visual theme (glue, stun, sleep, tar...). The mechanic
   * is identical; only the paint and hover text change so two "stuck" cards
   * never look the same. Missing = the default "ice" frost. */
  frozenSkins?: Record<number, string>;
  /** Per-square remaining turns for the active effect there (null = permanent).
   * Shown in the hover so a player can read how long an effect lasts. */
  effectTurns?: Record<number, number | null>;
  /** Shielded / sanctuary squares — pieces there can't be captured. */
  shieldedSquares?: number[];
  /** Squares your buffs bar the opponent from entering. */
  wardSquares?: number[];
  /** Squares just hit by Lightning Strike: a brief one-shot flash. */
  strikeSquares?: number[];
  /** Pieces hexed into walnuts: frozen solid, marked with the nut. */
  walnutSquares?: number[];
  /** Pieces shackled by a king-only or no-pawn-advance hex: chained in place. */
  lockedSquares?: number[];
  /** Squares where the viewer has tossed a banana peel (owner-only trap). */
  bananaSquares?: number[];
  /** Every other placed trap (mine, sinkhole, trapdoor, whoopee cushion,
   * landlord claim), each drawn with its own realistic animated marker. */
  trapSquares?: { sq: number; kind: string; name: string }[];
  /** Doomed pieces (timed_loss effects): badge with the death countdown. */
  doomSquares?: { sq: number; turns: number }[];
  /** Squares the opponent's buffs bar YOU from entering (stakes + rope; the
   * same squares also flow into bannedSquares for the flat tint). */
  barredSquares?: number[];
  /** Kings guarded by a king_safe ward: a heater shield leans on the square. */
  kingSafeSquares?: number[];
  /** Pawns halted by a no_pawn_advance hex: a fence hairline boards up their
   * forward edge (these squares get the fence instead of the chain jail). */
  pawnClampSquares?: number[];
  /** Kings of players with pending turn skips; `n` is the remaining count so
   * each new application or consumed skip replays the one-shot stun swirl. */
  stunSquares?: { sq: number; n: number }[];
  /** Card-fx motifs (CardFx): per-card constraint badges on cursed pieces
   * and empowerment marks on the owner's pieces, one mark per square with
   * the strongest motif already chosen upstream (see fxZones). */
  motifSquares?: MotifMark[];
}

// The look each freeze skin wears. The MECHANIC is identical for all of them
// (the piece cannot move while the timer runs); the skin only changes the tint,
// the little corner marker, and the hover label, so two "stuck" cards never
// look the same. Add a skin here and in engine/buff.ts FreezeSkin together.
type FreezeGlyphKind = "frost" | "drip" | "stars" | "zzz" | "web" | "chain" | "cracks";
const FREEZE_SKINS: Record<string, { tint: string; glyph: FreezeGlyphKind; label: string }> = {
  ice: { tint: "bg-cyan-300/25", glyph: "frost", label: "Frozen: iced in place" },
  glue: { tint: "bg-amber-300/30", glyph: "drip", label: "Glued down: stuck fast" },
  gum: { tint: "bg-pink-300/30", glyph: "drip", label: "Gummed up: stuck in bubblegum" },
  honey: { tint: "bg-yellow-400/25", glyph: "drip", label: "Honeyed: mired in syrup" },
  tar: { tint: "bg-neutral-700/40", glyph: "drip", label: "Tarred: sunk in pitch" },
  slime: { tint: "bg-lime-400/25", glyph: "drip", label: "Slimed: held in ooze" },
  stun: { tint: "bg-yellow-300/30", glyph: "stars", label: "Stunned: seeing stars" },
  shock: { tint: "bg-sky-400/30", glyph: "stars", label: "Shocked: jolted stiff" },
  sleep: { tint: "bg-indigo-400/25", glyph: "zzz", label: "Asleep: out cold" },
  charm: { tint: "bg-pink-400/25", glyph: "zzz", label: "Charmed: lost in a daze" },
  petal: { tint: "bg-rose-300/25", glyph: "zzz", label: "Becalmed: drifting in petals" },
  web: { tint: "bg-slate-200/25", glyph: "web", label: "Webbed: bound in silk" },
  vines: { tint: "bg-green-500/25", glyph: "web", label: "Entangled: gripped by vines" },
  roots: { tint: "bg-emerald-700/30", glyph: "web", label: "Rooted: pinned by roots" },
  chains: { tint: "bg-zinc-400/25", glyph: "chain", label: "Chained: shackled in place" },
  rust: { tint: "bg-orange-800/30", glyph: "chain", label: "Rusted: seized solid" },
  cement: { tint: "bg-stone-400/35", glyph: "cracks", label: "Set in cement" },
  stone: { tint: "bg-stone-500/35", glyph: "cracks", label: "Petrified: turned to stone" },
  quicksand: { tint: "bg-amber-600/30", glyph: "cracks", label: "Sinking: caught in quicksand" },
  bubble: { tint: "bg-sky-200/30", glyph: "frost", label: "Wrapped: sealed in bubble wrap" },
  // Rendered with the full BearTrapMark jaws under the piece (see the frozen
  // block in the square loop), not just the corner glyph.
  beartrap: { tint: "bg-zinc-500/25", glyph: "chain", label: "Trapped: jaws locked around it" },
};
function freezeSkinOf(skin: string | undefined) {
  return FREEZE_SKINS[skin ?? "ice"] ?? FREEZE_SKINS.ice;
}
// Stable empty refs so a board with no skin/turn data does not churn renders.
const EMPTY_SKINS: Record<string, string> = {};
const EMPTY_TURNS: Record<number, number | null> = {};

// Number words for the extra-turns banner headline ("TWO EXTRA TURNS").
const EXTRA_WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];

/** HUGE board-wide notification for an extra-turns grant (owner request),
 * spelling out the total ("TWO EXTRA TURNS - opponent plays 3 moves in a
 * row"). One shot ~2.8s, pointer-transparent, FUNCTIONAL: never gated by the
 * effects dial or low-clock calm. Gold when it is the viewer's own gain,
 * oxblood alarm when it is against them. */
function ExtraTurnsBanner({ mine, gained, total }: { mine: boolean; gained: number; total: number }) {
  const word = gained < EXTRA_WORDS.length ? EXTRA_WORDS[gained] : `+${gained}`;
  return (
    <div aria-live="assertive" className="pointer-events-none absolute inset-0 z-[45] grid place-items-center">
      <div
        className={
          "extra-turns-banner mx-4 border-2 px-6 py-4 text-center shadow-plate " +
          (mine
            ? "border-gold/70 bg-ink-950/90 text-gold-leaf"
            : "border-oxblood-glow/70 bg-ink-950/90 text-oxblood-glow")
        }
      >
        <div className="font-display text-3xl font-bold tracking-wide sm:text-4xl">
          {word} EXTRA {gained === 1 ? "TURN" : "TURNS"}
        </div>
        <div className="mt-1 font-display text-base font-semibold text-parchment-100 sm:text-lg">
          {mine ? "You play" : "Opponent plays"} {total} moves in a row
        </div>
      </div>
    </div>
  );
}

/** Card-name label riding EVERY play's animation (owner request: "show what
 * powerup your opponent used, beside or beneath the animation"). Name + tier
 * chip only - the full description stays in the top-right play feed. Softer
 * than the first cut (owner: too contrasting): translucent ink, hairline
 * border, tier-colored name. Scales with tier - a quiet pill for 1-4, larger
 * from 5, headline-sized at 7+. FUNCTIONAL (never gated by the effects dial);
 * sits in the board's upper area so it coexists with the centered
 * extra-turns banner when one card triggers both. */
function PlayAnnouncement({ name, tier, outcome }: { name: string; tier: number; outcome?: string }) {
  const big = tier >= 7;
  const mid = tier >= 5 && tier < 7;
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[6%] z-[45] flex justify-center">
      <div
        className={
          "extra-turns-banner mx-4 flex max-w-[min(92%,30rem)] flex-col items-center gap-1 border border-white/25 bg-ink-950/70 text-center shadow-plate backdrop-blur-[2px] " +
          (big ? "px-5 py-2.5" : mid ? "px-4 py-2" : "px-3 py-1.5")
        }
      >
        <div className="flex items-center gap-2">
          <span
            className={
              `font-display font-bold tracking-wide tier-${tier} ` +
              (big ? "text-2xl sm:text-3xl" : mid ? "text-lg sm:text-xl" : "text-sm")
            }
          >
            {name}
          </span>
          <span
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display font-bold tier-bg-${tier} tier-${tier} ${big ? "text-[11px]" : "text-[9px]"}`}
          >
            {TIER_ROMAN[tier]}
          </span>
        </div>
        {/* Random-branch result: what the spin/flip actually gave you. */}
        {outcome && (
          <span className="max-w-full font-display text-[12px] font-semibold leading-snug text-gold-leaf sm:text-sm">
            {outcome}
          </span>
        )}
      </div>
    </div>
  );
}

/** One-shot "the rule descends" splash for a newly-known nerf: a brief ink
 * wash over the crop, the rule's name stamped big (the PlayAnnouncement
 * banner family), and a pulse of the hostile NerfAura styling on every square
 * the rule affects, all over ~2.5s. Decorative but informative; the caller
 * gates it behind the fx-hidden switch and the CSS drops every animation
 * when animations are off in Settings (the elements then hold at opacity 0). */
function NerfRevealSplash({
  name,
  tier,
  mine,
  squares,
  orientation,
}: {
  name: string;
  tier: number;
  mine: boolean;
  squares: number[];
  orientation: Color;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[44]"
      style={{ "--tier-rgb": tierRgb(tier) } as CSSProperties}
    >
      {/* the ink wash: the board darkens for a beat while the rule lands */}
      <div className="nerf-reveal-wash absolute inset-0" />
      {/* hostile-aura pulse on every affected square */}
      {squares.map((sq) => {
        if (sq < 0 || sq > 63) return null;
        const col = orientation === "w" ? FILE(sq) : 7 - FILE(sq);
        const row = orientation === "w" ? 7 - RANK(sq) : RANK(sq);
        return (
          <div
            key={sq}
            className="nerf-reveal-cell absolute"
            style={{ left: `${col * 12.5}%`, top: `${row * 12.5}%`, width: "12.5%", height: "12.5%" }}
          >
            <NerfAura tier={tier} />
          </div>
        );
      })}
      {/* the rule stamps in big (PlayAnnouncement styling family) */}
      <div className="absolute inset-x-0 top-[9%] flex justify-center">
        <div className="nerf-reveal-stamp mx-4 flex max-w-[min(92%,30rem)] flex-col items-center gap-1 border-2 border-white/25 bg-ink-950/85 px-6 py-3 text-center shadow-plate backdrop-blur-[2px]">
          <div className="flex items-center gap-2">
            <span className={`font-display text-2xl font-bold tracking-wide sm:text-3xl tier-${tier}`}>
              {name}
            </span>
            <span
              className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[11px] font-bold tier-bg-${tier} tier-${tier}`}
            >
              {TIER_ROMAN[tier as 1]}
            </span>
          </div>
          <span className="smallcaps text-[11px] font-semibold tracking-wider text-parchment-300">
            {mine ? "your rule takes the board" : "opponent's rule revealed"}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Per-square corner allocation (overlap fix) ------------------------------
// Several small marks anchor to a square's corners: the countdown chip, the
// freeze flake, the bound-buff sigil, the motif badge, plus the shield disc
// and the coordinate labels. Instead of every mark hard-coding a corner (the
// reported "the move counter sits on top of another mark" overlaps), each
// square render runs a tiny deterministic allocator: marks claim corners in a
// fixed priority order (countdown first — the remaining-moves read must stay
// the most legible), each taking its preferred corner when free and the next
// free one from its fallback ring otherwise. Pure function of which marks are
// present, so both players and every reload agree; no state involved.
const CORNER_FALLBACK: Record<BadgeCorner, BadgeCorner[]> = {
  tl: ["tl", "tr", "bl", "br"],
  tr: ["tr", "tl", "br", "bl"],
  bl: ["bl", "br", "tl", "tr"],
  br: ["br", "bl", "tr", "tl"],
};
// Corner-inset position classes for the small chips (countdown, freeze flake).
const CORNER_INSET_POS: Record<BadgeCorner, string> = {
  tl: "top-0.5 left-0.5",
  tr: "top-0.5 right-0.5",
  bl: "bottom-0.5 left-0.5",
  br: "bottom-0.5 right-0.5",
};
// Percent-inset position classes for the bound-buff sigil button.
const BOUND_POS: Record<BadgeCorner, string> = {
  tl: "left-[3%] top-[3%]",
  tr: "right-[3%] top-[3%]",
  bl: "left-[3%] bottom-[3%]",
  br: "right-[3%] bottom-[3%]",
};
// Motifs whose badge is corner-anchored (and thus claims a corner). Bands
// (blindfold, ward) and the rally banner are edge/center-anchored: no claim.
const CORNER_MOTIFS = new Set<MotifMark["motif"]>(["empower", "jail", "muzzle", "anchor", "slow"]);

/** Small corner countdown for any timed piece effect (owner request: every
 * timed effect wears its remaining turns). Doom (timed_loss) renders the
 * oxblood variant with a skull tick; everything else a neutral ink chip.
 * `corner` is the allocator-assigned slot (default: the historic
 * bottom-right). */
function CountdownChip({ n, doom = false, corner = "br" }: { n: number; doom?: boolean; corner?: BadgeCorner }) {
  // Duration ramp: the chip's color IS the urgency read. Plenty of time stays
  // neutral, two turns warms to amber, the last turn burns red (doom is
  // always red — it is a death timer).
  const tone =
    doom || n <= 1
      ? "border-oxblood-glow/70 bg-ink-950/90 text-oxblood-glow"
      : n <= 2
      ? "border-gold/60 bg-ink-950/90 text-gold-leaf"
      : "border-white/25 bg-ink-950/90 text-parchment-100";
  return (
    <span
      aria-hidden
      // The corner allocator hands the chip its slot (it claims FIRST, so it
      // keeps its preferred bottom-right unless something already sat there).
      // z-30 keeps it above any effect art it shares a square with; the solid
      // ink backing + shadow keep it legible.
      className={
        `pointer-events-none absolute ${CORNER_INSET_POS[corner]} z-30 flex h-[15px] min-w-[15px] items-center justify-center rounded-[1px] border px-0.5 font-mono text-[10px] font-bold leading-none shadow-[0_1px_4px_rgba(0,0,0,0.8)] ` +
        tone
      }
    >
      {n}
    </span>
  );
}

// Hover copy for the placed-trap markers (mine, sinkhole, trapdoor...).
const TRAP_HOVER_BODY: Record<string, string> = {
  mine: "The first enemy piece (never a king) to step on this mine is destroyed.",
  sinkhole: "The first enemy piece (never a king) to step here plunges out of the game.",
  trapdoor: "An enemy piece (never a king) landing here is sprung back toward home and stunned.",
  whoopee: "The first enemy piece (never a king) to sit here makes a rude noise and must keep moving.",
  landlord: "An enemy piece (never a king) ending its move here owes rent: stuck for a turn.",
  beartrap: "The first enemy piece (never a king) to step here is snapped up for 4 turns.",
};

/** Tiny corner marker for a frozen square, chosen by the skin's glyph kind.
 * Strokes only (no gradients/glow/emoji), sized to sit unobtrusively. */
function FreezeGlyph({ kind }: { kind: FreezeGlyphKind }) {
  if (kind === "frost") return <SnowflakeGlyph />;
  const common = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "drip")
    return (
      <svg {...common}><path d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10Z" /></svg>
    );
  if (kind === "stars")
    return (
      <svg {...common}><path d="M12 3l1.3 3.2L16.5 7l-2.6 2 1 3.3L12 10.6 9.1 12.3l1-3.3L7.5 7l3.2-.8L12 3Z" /><circle cx="18" cy="17" r="1" /><circle cx="6" cy="16" r="1" /></svg>
    );
  if (kind === "zzz")
    return (
      <svg {...common}><path d="M6 8h5l-5 6h5" /><path d="M14 5h4l-4 4h4" /></svg>
    );
  if (kind === "web")
    return (
      <svg {...common}><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" /></svg>
    );
  if (kind === "chain")
    return (
      <svg {...common}><rect x="4" y="9" width="7" height="6" rx="3" /><rect x="13" y="9" width="7" height="6" rx="3" /></svg>
    );
  // cracks
  return (
    <svg {...common}><path d="M12 3l-2 6 3 3-2 4 2 5M12 9l4-2M11 15l-4 2" /></svg>
  );
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
  // Every checked king's square, tinted red when the check-highlight setting
  // is on. An array because in this variant BOTH kings can be in check at
  // once (a king may legally stand in or move into check), and a checked king
  // stays lit on the opponent's turn too.
  checkSquares?: Square[];
  /** Someone's clock is under the scramble threshold (~15s): board-wide
   * spectacle stands down (cast banners, board-wide leads, shake, canvas
   * travel) while per-piece effects keep playing, so nothing steals
   * attention or frames during a time scramble. */
  fxTimePressure?: boolean;
  // Buff targeting mode: while set, the board is a square picker. Candidate
  // squares glow and clicking one calls onPickSquare; every other pointer
  // interaction (moves, selection, premoves) is suspended.
  pickSquares?: number[];
  onPickSquare?: (sq: Square) => void;
  // A marquee attack card was just played: its id plus a monotonic key. When
  // the key advances, the board's next piece diff is dressed as that card's
  // signature choreography (derived entirely from which enemy squares cleared)
  // instead of plain detonation bursts. Keyed so re-renders never replay it,
  // and absent on the initial mount / a rejoined game (so nothing fires then).
  signatureCard?: { id: string; key: number } | null;
  /** The COMMITTED position for the removal-FX diff. When the rendered
   * `board` is an optimistic overlay (premove preview, move-confirm preview,
   * history review), pass the real game board here so detonation art, canvas
   * VFX, and the explosion voice only ever react to real state changes.
   * Absent = diff the rendered board (the old behavior). */
  fxBoard?: BoardState;
  // The public buff state both surfaces already hold (game.buffs). Used only
  // to derive Duelist-style piece-bound buff markers: a small corner sigil on
  // any piece carrying an active bound buff that draws no CardFx motif, with
  // the full card explanation surfaced through the hover/focus popover.
  // Optional and null-safe: absent (nerf mode, history review) simply paints
  // no markers.
  buffs?: BuffMatchState | null;
  /** The OPPONENT's would-be legal moves, computed by the host on a
   * turn-flipped board (buff-granted movement included). When provided,
   * clicking an enemy piece "inspects" it: slate preview dots mark every
   * square it could reach, visually distinct from your own move hints.
   * Cleared by the next tap, your own selection, or any position change. */
  opponentMoves?: Move[];
  /** Every nerf currently KNOWN to the viewer (their own from game start,
   * the opponent's once revealed). The board plays a one-shot "the rule
   * descends" splash for each entry exactly once, keyed on color+id: a brief
   * ink wash, the rule's name stamped big, and a ~2.5s hostile-aura pulse on
   * the squares the nerf's visual() marks. Reduced-motion and the fx-hidden
   * switch stand the whole splash down. */
  nerfReveals?: NerfRevealInfo[];
}

/** Placeholder rules that must never play the reveal splash: buff mode's
 * no-nerf stub, the single-color internal stub, and the "nerf removed by a
 * buff" replacement (see game.ts UNRESTRICTED_NERF / NOOP_NERF / FREED_NERF).
 * Shared by both hosts so the gate cannot drift between them. */
export const NERF_REVEAL_SKIP: ReadonlySet<string> = new Set(["none", "noop", "nerf_removed"]);

/** One newly-known nerf for the reveal splash (see Props.nerfReveals). */
export interface NerfRevealInfo {
  id: string;
  name: string;
  tier: number;
  /** Whose rule it is; the splash subtitle reads differently for each side. */
  color: Color;
  /** Squares the rule affects right now (the nerf's visual() highlight). */
  highlightSquares?: number[];
}

/** One derived piece-bound buff marker: everything the corner sigil and its
 * popover need, resolved from the public buff instance + its library def. */
interface BoundMark {
  name: string;
  description: string;
  status: string | null;
  flavor: string | null;
  tier: number;
  category: BuffCategory;
  tone: "buff" | "hex";
}

// Map a signature's sound key to its sounds.ts voice, scaled to the number of
// squares it cleared so a small strike does not sound like a full rank.
function playSignature(id: string, count: number) {
  switch (sigOf(id)?.sound) {
    case "nova":
      return playNova(count);
    case "cataclysm":
      return playCataclysm(count);
    case "extinction":
      return playExtinction(count);
    case "lightning":
      return playLightning(count);
    case "atomic":
      return playAtomic(count);
    case "rampage":
      return playRampage(count);
    case "siege":
      return playSiege(count);
    // Batch 2+ voices: every declared SigSoundKey routes to its own sounds.ts
    // voice now, so a coronation no longer explodes.
    case "coronation":
      return playCoronation();
    case "crownrain":
      return playCrownRain();
    case "colossus":
      return playColossus();
    case "snooze":
      return playSnooze();
    case "clockcage":
      return playClockCage();
    case "clockice":
      return playClockIce();
    case "blitz":
      return playBlitz(count);
    case "massfreeze":
      return playMassFreeze();
    case "petrify":
      return playPetrify();
    case "petrifiedforest":
      return playPetrifiedForest();
    case "aegis":
      return playAegis();
    case "cathedral":
      return playCathedral();
    case "shades":
      return playShades();
    case "wall":
      return playWall();
    default:
      return playExplosion();
  }
}

// The category-fallback cast voice: cards with NO bespoke signature entry get
// a themed sound alongside their CastSpectacle, scaled up for marquee-tier
// (8+) casts. Sleek (tier 1-4) casts stay silent here — the dock's card-use
// chime already covers the quiet read.
function playCastVoice(category: BuffCategory, marquee: boolean) {
  switch (category) {
    case "attack":
      return marquee ? playAtomic(8) : playRampage(3);
    case "tempo":
      return marquee ? playClockCage() : playSnooze();
    case "hex":
      return marquee ? playShades() : playPetrify();
    case "item":
      return playBonk();
    case "movement":
      return playBlitz(marquee ? 5 : 3);
    case "pieces":
      return playSummon();
    case "protection":
      return playAegis();
    case "info":
      return playShades();
    case "draft":
      return playDraftChime();
    case "nerf":
      return playChains();
  }
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

// Empowerment marks paint on the owner's pieces; everything else is a
// constraint on the cursed side.
function isEmpowerMotif(motif: MotifMark["motif"]): boolean {
  return motif === "empower" || motif === "ward" || motif === "rally";
}

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
  // TODO(knight-arrow): lichess draws knight moves as a bent "L" (the long leg
  // first, then a right-angle turn into the short leg with the arrowhead on
  // it) instead of the straight diagonal drawn below. To do that here: detect a
  // knight jump via `const knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2)
  // || (Math.abs(dx) === 2 && Math.abs(dy) === 1);`, compute the elbow corner
  // (travel the longer axis from `a`, then the shorter axis to `b`), and render
  // the shaft as a two-segment <polyline> with the arrowhead based on the final
  // segment's direction. Left as a TODO to avoid regressing the arrow geometry
  // without a browser to verify against.
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
): { anims: Map<Square, PieceAnim>; movedFrom: Set<Square> } {
  const anims = new Map<Square, PieceAnim>();
  // Every vanished square matched to an arrival: these pieces MOVED (slide,
  // castle, drag drop), so the detonation pass below must never mistake
  // their empty origin squares for card removals.
  const movedFrom = new Set<Square>();
  const vanished: Square[] = [];
  const appeared: Square[] = [];
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (a && (!b || a.type !== b.type || a.color !== b.color)) vanished.push(sq);
    if (b && (!a || a.type !== b.type || a.color !== b.color)) appeared.push(sq);
  }
  // A flood of changes is a reset (new game, history jump), not a move.
  if (appeared.length === 0 || appeared.length > 6) return { anims, movedFrom };
  for (const to of appeared) {
    const piece = next[to]!;
    let best: Square | null = null;
    let bestDist = Infinity;
    for (const from of vanished) {
      if (movedFrom.has(from)) continue;
      const q = prev[from]!;
      if (q.type !== piece.type || q.color !== piece.color) continue;
      const d = (FILE(from) - FILE(to)) ** 2 + (RANK(from) - RANK(to)) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = from;
      }
    }
    if (best == null) continue;
    movedFrom.add(best);
    if (to === skipSquare) continue; // drag drops land instantly (still a move)
    let dxCells = FILE(best) - FILE(to);
    let dyCells = RANK(to) - RANK(best);
    if (orientation === "b") {
      dxCells = -dxCells;
      dyCells = -dyCells;
    }
    anims.set(to, { dxCells, dyCells });
  }
  return { anims, movedFrom };
}

// --- One-shot square flourishes (transform / summon) ---
// Diffed from the same prev/next pieces pass that drives the slide animation:
// a piece whose TYPE changed plays the transform flourish (shard burst + pop,
// crown flash for queen-class), and a piece that appeared on a previously
// empty square with no matching slide plays the summon dust-poof. Both are
// pure-CSS one-shots keyed by a monotonic counter, so re-renders never replay
// them and no per-frame JS runs.

interface BoardFx {
  kind: "morph" | "summon" | "detonate";
  crown?: boolean;
  key: number;
  // Signature choreography: when a marquee attack card's id is known at play
  // time, its cleared squares carry the card id, their order in the staggered
  // sequence, and whether this square is the one-shot lead flourish. A plain
  // detonation leaves these undefined and renders the generic burst.
  sig?: string;
  sigOrder?: number;
  sigRole?: "lead" | "target";
}

// Order the squares an attack signature just cleared into a staggered
// detonation sequence, purely from the board diff (no engine input). Returns
// the ordered target squares plus an optional lead square (the origin
// flourish) painted separately from the per-victim hits. Everything here is
// derivable client-side: the victims are the removed pieces, the caster is
// their opposite colour, and the mover (for line charges) is whichever
// queen/rook vacated a square this turn.
function orderSignature(
  id: string,
  dets: Square[],
  prev: BoardState["pieces"],
  movedFrom: Set<Square>,
  capturedSquare: Square | null,
  orientation: Color,
): { targets: { sq: Square; order: number; role: "lead" | "target" }[]; leadSq: Square | null } {
  const cfg = resolveSignature(id);
  if (!cfg) return { targets: [], leadSq: null };
  // Claim only the victim types this signature owns; anything else stays a
  // plain detonation (handled by the caller).
  const victims =
    cfg.victims === "all" ? dets.slice() : dets.filter((sq) => prev[sq] && cfg.victims.includes(prev[sq]!.type));
  if (victims.length === 0) return { targets: [], leadSq: null };
  // The enemy is whichever colour was removed most (Nova also sacrifices the
  // caster's own pawn, so the first square is not reliable). The caster is the
  // opposite; its home rank sets the direction the wave rolls.
  let wCleared = 0;
  let bCleared = 0;
  for (const sq of victims) {
    if (prev[sq]!.color === "w") wCleared++;
    else bCleared++;
  }
  const victimColor: Color = bCleared >= wCleared ? "b" : "w";
  const casterColor: Color = victimColor === "w" ? "b" : "w";
  // White pushes toward rank 8, black toward rank 1: the wave rolls away from
  // the caster's home rank.
  const casterUp = casterColor === "w";

  let ordered: Square[];
  let leadSq: Square | null = null;
  if (cfg.ordering === "octagon" && capturedSquare != null) {
    // Radiate out from the capture: sort by angle so the ring pops around.
    const cf = FILE(capturedSquare);
    const cr = RANK(capturedSquare);
    ordered = victims
      .slice()
      .sort((a, b) => Math.atan2(RANK(a) - cr, FILE(a) - cf) - Math.atan2(RANK(b) - cr, FILE(b) - cf));
    if (cfg.hasLead) leadSq = capturedSquare;
  } else if (cfg.ordering === "line" && cfg.mover) {
    // Anchor on the charging piece's origin and sweep down the line it took.
    let anchor: Square | null = null;
    for (const sq of movedFrom) {
      const p = prev[sq];
      if (p && p.type === cfg.mover && p.color === casterColor) {
        anchor = sq;
        break;
      }
    }
    if (anchor != null) {
      const af = FILE(anchor);
      const ar = RANK(anchor);
      ordered = victims
        .slice()
        .sort(
          (a, b) =>
            (FILE(a) - af) ** 2 + (RANK(a) - ar) ** 2 - ((FILE(b) - af) ** 2 + (RANK(b) - ar) ** 2),
        );
      if (cfg.hasLead) leadSq = anchor;
    } else {
      ordered = victims.slice().sort((a, b) => a - b);
    }
  } else {
    // "file" / "sweep": roll up the board away from the caster, rank first.
    ordered = victims.slice().sort((a, b) => {
      const dr = casterUp ? RANK(a) - RANK(b) : RANK(b) - RANK(a);
      if (dr !== 0) return dr;
      // Break ties left-to-right as the viewer sees the board.
      return orientation === "w" ? FILE(a) - FILE(b) : FILE(b) - FILE(a);
    });
  }

  const targets = ordered.map((sq, i) => ({
    sq,
    order: i,
    // Nova's pop leads from the near end of its file; other visuals lead from
    // a separate square (leadSq) or have no lead at all.
    role: (cfg.hasLead && leadSq == null && i === 0 ? "lead" : "target") as "lead" | "target",
  }));
  return { targets, leadSq };
}

// Order a ZONE-sourced signature's target squares (source !== "removal") into
// its staggered sequence. Unlike orderSignature these squares hold pieces that
// STAY on the board (the frozen / empowered / shielded / summoned squares Board
// already tracks), so there is no removal diff to key on: the order is derived
// purely from the squares' geometry, identically for both players. "radial"
// pops outward from the group's centroid (with an optional central lead);
// everything else rolls up the board rank-first, breaking ties left-to-right as
// the viewer sees it (a cosmetic tie-break only).
function orderZoneSignature(
  cfg: SignatureConfig,
  squares: number[],
  orientation: Color,
): { sq: Square; order: number; role: "lead" | "target" }[] {
  if (squares.length === 0) return [];
  let ordered: number[];
  if (cfg.ordering === "radial") {
    let cf = 0;
    let cr = 0;
    for (const sq of squares) {
      cf += FILE(sq as Square);
      cr += RANK(sq as Square);
    }
    cf /= squares.length;
    cr /= squares.length;
    ordered = squares
      .slice()
      .sort(
        (a, b) =>
          (FILE(a as Square) - cf) ** 2 +
          (RANK(a as Square) - cr) ** 2 -
          ((FILE(b as Square) - cf) ** 2 + (RANK(b as Square) - cr) ** 2),
      );
  } else {
    ordered = squares.slice().sort((a, b) => {
      const dr = RANK(a as Square) - RANK(b as Square);
      if (dr !== 0) return dr;
      return orientation === "w"
        ? FILE(a as Square) - FILE(b as Square)
        : FILE(b as Square) - FILE(a as Square);
    });
  }
  return ordered.map((sq, i) => ({
    sq: sq as Square,
    order: i,
    role: (cfg.hasLead && i === 0 ? "lead" : "target") as "lead" | "target",
  }));
}

function computeBoardFx(
  prev: BoardState["pieces"],
  next: BoardState["pieces"],
  anims: Map<Square, PieceAnim>,
  movedFrom: Set<Square>,
  skipSquare: Square | null,
  capturedSquare: Square | null,
  seq: { current: number },
  signatureId: string | null,
  orientation: Color,
): Map<Square, BoardFx> {
  const fx = new Map<Square, BoardFx>();
  const sig = signatureId ? resolveSignature(signatureId) ?? null : null;
  let appeared = 0;
  let vanishedCount = 0;
  const lostColor: Record<Color, boolean> = { w: false, b: false };
  for (let sq = 0; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (b && (!a || a.type !== b.type || a.color !== b.color)) appeared++;
    if (a && (!b || a.type !== b.type || a.color !== b.color)) {
      lostColor[a.color] = true;
      vanishedCount++;
    }
  }
  // Same reset guard as computeAnims: a flood of changes is a new game or a
  // history jump, not a move, so play nothing. Unlike the slide matcher,
  // appeared can be zero here: an attack card can clear pieces without
  // anything arriving (that is exactly the detonation case). A signature
  // spectacle (Extinction, Cataclysm) can legitimately clear a whole rank of
  // pieces at once, so the vanished cap is relaxed while one is known.
  if (appeared > 6 || vanishedCount > (sig ? 20 : 10)) return fx;
  // Unexplained arrivals per color: a piece that appeared without a matched
  // slide is a transform-in-motion (promotion) or a summon; either way its
  // color's unmatched DEPARTURE is that same piece changing form, never a
  // detonation.
  const gainedColor: Record<Color, boolean> = { w: false, b: false };
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (b && (!a || a.type !== b.type || a.color !== b.color) && !anims.has(sq) && sq !== skipSquare) {
      gainedColor[b.color] = true;
    }
  }
  // An enemy pawn that just landed directly beside the file-forward edge of
  // a vanished pawn is an en-passant-style capture, not a card removal.
  // Real games already exclude these via capturedSquare; this covers the
  // premove preview boards, whose lastMove is still the opponent's.
  const epStyleCapture = (sq: Square, victimColor: Color): boolean => {
    for (const d of [-8, 8]) {
      const n = sq + d;
      if (n < 0 || n > 63) continue;
      const q = next[n];
      if (q && q.type === "p" && q.color !== victimColor && prev[n]?.type !== "p") return true;
    }
    return false;
  };
  let morphUsed = false; // one transform flourish per move, max
  let summons = 0;
  // Detonation squares collected first, then either dressed as a signature
  // sequence (when the played card id is known) or emitted as plain bursts.
  const detSquares: Square[] = [];
  for (let sq = 0 as Square; sq < 64; sq++) {
    const a = prev[sq];
    const b = next[sq];
    if (!b) {
      // Detonation: a piece vanished with nothing landing on its square, no
      // matched move away (movedFrom), no capture recorded there (en
      // passant and skid captures clear a square besides the destination),
      // and no unexplained same-color arrival elsewhere (promotion-style
      // form changes): an attack card removed it outright, so it goes out
      // with a bang instead of silently blinking away.
      if (
        a &&
        !movedFrom.has(sq) &&
        sq !== capturedSquare &&
        !gainedColor[a.color] &&
        !(a.type === "p" && epStyleCapture(sq, a.color))
      ) {
        detSquares.push(sq);
      }
      continue;
    }
    if (a && a.color === b.color && a.type !== b.type) {
      // In-place type change (setPieceType buffs: Amazon-style upgrades).
      if (!morphUsed) {
        fx.set(sq, { kind: "morph", crown: b.type === "q", key: ++seq.current });
        morphUsed = true;
      }
    } else if (a && a.color !== b.color && !anims.has(sq) && sq !== skipSquare) {
      // In-place COLOUR change (setPieceColor buffs: conversion / mind-control):
      // the piece stayed put but switched sides without any slide landing on
      // it. Left alone this is a silent ownership flip; dress it with the same
      // transform flourish + piece pop so the board never quietly re-colours a
      // piece. Guarded by !anims.has(sq): an ordinary capture lands via a slide
      // (that square is in anims), so this never misfires on a normal take. No
      // crown: a conversion is not a promotion.
      if (!morphUsed) {
        fx.set(sq, { kind: "morph", crown: false, key: ++seq.current });
        morphUsed = true;
      }
    } else if (!a && !anims.has(sq) && sq !== skipSquare) {
      if (lostColor[b.color]) {
        // A same-colour piece vanished elsewhere: this is a piece that moved
        // while changing type (promotion-style), not a summon.
        if (!morphUsed) {
          fx.set(sq, { kind: "morph", crown: b.type === "q", key: ++seq.current });
          morphUsed = true;
        }
      } else if (summons < 4) {
        // Nothing of this colour left the board: a genuine summon.
        fx.set(sq, { kind: "summon", key: ++seq.current });
        summons++;
      }
    }
  }
  // Dress the detonations. When the played card's id is a known signature, its
  // owned victim squares roll out as a staggered choreography (with an
  // optional lead flourish); any leftover cleared squares, plus the whole set
  // when no signature is known, fall back to the generic burst (capped so a
  // freak clear never floods the board).
  const claimed = new Set<Square>();
  if (sig) {
    const { targets, leadSq } = orderSignature(
      signatureId!,
      detSquares,
      prev,
      movedFrom,
      capturedSquare,
      orientation,
    );
    for (const t of targets) {
      claimed.add(t.sq);
      fx.set(t.sq, {
        kind: "detonate",
        key: ++seq.current,
        sig: signatureId!,
        sigOrder: t.order,
        sigRole: t.role,
      });
    }
    if (leadSq != null && !fx.has(leadSq)) {
      fx.set(leadSq, {
        kind: "detonate",
        key: ++seq.current,
        sig: signatureId!,
        sigOrder: 0,
        sigRole: "lead",
      });
    }
  }
  let plain = 0;
  for (const sq of detSquares) {
    if (claimed.has(sq)) continue;
    if (plain >= 6) break;
    fx.set(sq, { kind: "detonate", key: ++seq.current });
    plain++;
  }
  return fx;
}

const ORDERED_SQUARES_WHITE: Square[] = [];
for (let r = 7; r >= 0; r--) {
  for (let f = 0; f < 8; f++) {
    ORDERED_SQUARES_WHITE.push(SQ(f, r));
  }
}
const ORDERED_SQUARES_BLACK = [...ORDERED_SQUARES_WHITE].reverse();

/** Wall-clock fallback for input timing when an event carries no timeStamp. */
function nowMs(): number {
  return Date.now();
}

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
  checkSquares,
  fxTimePressure,
  pickSquares,
  onPickSquare,
  signatureCard,
  fxBoard,
  buffs,
  opponentMoves,
  nerfReveals,
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
  // Enemy piece under inspection (its would-be moves preview as slate dots).
  const [inspectSq, setInspectSq] = useState<Square | null>(null);
  const [promotionMove, setPromotionMove] = useState<Move[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverSq, setHoverSq] = useState<Square | null>(null);
  // The player's "hide effects/animations" switch (the small eye button in
  // the game rails). Decorative layers stand down; functional reads stay.
  const fxHiddenPref = useFxHidden();
  // The effects dial (Off/Calm/Normal/Epic/Max): scales canvas particle
  // counts and gates/upsizes the board shake. Mirrored into a ref for the
  // stable callbacks (vfxShake) that must read the current value.
  const fxLevel = useFxLevel();
  const fxLevelRef = useRef(fxLevel);
  // Low-clock auto-calm (owner request): under time pressure the board-wide
  // show stands down automatically, independent of the dial.
  const fxCalmClock = !!fxTimePressure;
  const fxCalmClockRef = useRef(fxCalmClock);
  // Mirror both dials into refs so the stable callbacks (vfxShake) read current
  // values; written in an effect, never during render.
  useEffect(() => {
    fxLevelRef.current = fxLevel;
    fxCalmClockRef.current = fxCalmClock;
  });
  // Warm the code-split signature-visuals chunk (SignatureOverlay's burst art
  // + the merged plugin registry) the moment the board mounts, so it is loaded
  // long before any card can fire mid-game. See prefetchSignatureVisuals in
  // effects/BoardEffects.tsx.
  useEffect(() => {
    prefetchSignatureVisuals();
  }, []);
  // Canvas VFX plays staged during render (the diff/zone claims happen in the
  // render pass) and flushed to the bus after commit, so render stays pure.
  const pendingVfxRef = useRef<VfxPlay[]>([]);
  useEffect(() => {
    if (pendingVfxRef.current.length === 0) return;
    const plays = pendingVfxRef.current;
    pendingVfxRef.current = [];
    if (fxHiddenPref) return;
    for (const p of plays) vfxPlay(p);
  });
  // The VFX layer's shake request rides the existing marquee board thump.
  const vfxShake = useCallback(() => {
    if (fxCalmClockRef.current) return; // time scramble: never shake
    const shake = FX_LEVELS[fxLevelRef.current].shake;
    if (shake === "none") return; // Calm and Off never thump the board
    const el = cropRef.current;
    if (el && !motionOff()) {
      el.classList.remove("fx-board-shake", "fx-board-shake--big");
      void el.offsetWidth;
      el.classList.add("fx-board-shake");
      if (shake === "big") el.classList.add("fx-board-shake--big");
    }
     
  }, []);
  // Square whose effect-explanation popover is currently open (hover, focus,
  // or tap). One at a time; the Board owns open/close, EffectPopover just
  // renders the card. Null = nothing open.
  const [effectPopoverSq, setEffectPopoverSq] = useState<Square | null>(null);
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
  // The last dead-tap (square + timestamp) for the mobile double-tap gesture
  // that cancels the whole premove queue (touch has no right-click).
  const lastTapRef = useRef<{ sq: Square; t: number } | null>(null);
  // The destination of a just-dropped drag: that piece must not animate.
  const dropSkipRef = useRef<Square | null>(null);
  const prevPiecesRef = useRef<BoardState["pieces"] | null>(null);
  // Committed-position ref for the removal-FX diff (see the twin diffs below).
  const prevFxPiecesRef = useRef<BoardState["pieces"] | null>(null);
  const fxPieces = fxBoard?.pieces ?? board.pieces;
  const animsRef = useRef<Map<Square, PieceAnim>>(new Map());
  // One-shot flourishes (transform / summon) keyed monotonically so React
  // remounts them exactly once per detected change; see computeBoardFx.
  const fxSeqRef = useRef(0);
  const fxRef = useRef<Map<Square, BoardFx>>(new Map());
  // Highest signature key already consumed. A signature is claimed by the very
  // next piece diff after its key advances (the play event and the resulting
  // board update batch into one render), so it fires exactly once and never on
  // the initial mount (starts at 0, no card ever carries key 0).
  const sigSeenKeyRef = useRef(0);
  // The same one-shot play-key guard for ZONE-sourced signatures (source !==
  // "removal") wired below: coronations, freezes, petrifies, shields, stuns,
  // summons and the rest that decorate pieces which STAY on the board. Kept
  // separate from sigSeenKeyRef so the removal path and the zone path each
  // consume the play key independently. zoneSigRef holds the staged overlays,
  // one per affected square, and persists (invisible after they play) exactly
  // like fxRef so an unrelated re-render never remounts and replays them.
  const zoneSigSeenKeyRef = useRef(0);
  // Play keys whose zone-sourced signature actually claimed one or more
  // squares. A zone-sourced card whose zone came up EMPTY on this play (a
  // rework changed what it paints, or the effect simply hit nothing) falls
  // back to the diff-less cast lead below instead of playing silently.
  const zoneLeadClaimKeyRef = useRef(0);
  // Extra-turns grant banner (owner request: a HUGE board-wide notification
  // naming the total). FUNCTIONAL, so it is never gated by the effects dial
  // or the low-clock calm: knowing the opponent moves three times in a row
  // is rules information, not decoration. Values are diffed (not object
  // identity) because server frames rebuild the extraMoves object each merge.
  const prevExtraMovesRef = useRef<{ w: number; b: number } | null>(null);
  const extraBannerRef = useRef<{ color: Color; gained: number; total: number; key: number } | null>(null);
  const extraBannerKeyRef = useRef(0);
  const zoneSigRef = useRef<
    Map<number, { sig: string; order: number; role: "lead" | "target"; key: number }>
  >(new Map());
  // --- Cast spectacles: EVERY played card gets a board-level themed read ----
  // The category fallback layer (see CastSpectacle in BoardEffects): one
  // overlay per card play, themed by the card's category and scaled by its
  // tier. Runs for bespoke-signature cards too (their square art plays on
  // top); its per-play sound only fires for cards with NO bespoke entry so
  // nothing double-voices. Marquee-tier casts (8+) also thump the whole board
  // crop with a transform-only shake, skipped when animations are off in Settings.
  const cropRef = useRef<HTMLDivElement | null>(null);
  const [cast, setCast] = useState<{
    key: number;
    id: string;
    category: BuffCategory;
    tier: number;
    /** Random-branch cards (Gamble, Jackpot, Wheel of Fortune...) stash a
     * short result line in their instance state; the announcement banner shows
     * it after the play so "what did I get?" is answered on the board. */
    outcome?: string;
  } | null>(null);
  // Latest buffs, read inside the cast effect (which only deps on
  // signatureCard) to pull the just-played card's outcome without re-running
  // on every buff change.
  const buffsRef = useRef(buffs);
  // Mirror latest buffs into a ref (written in an effect, never during render)
  // so the cast effect below can read the just-played card's outcome without
  // depending on buffs and re-running on every buff change.
  useEffect(() => {
    buffsRef.current = buffs;
  });
  const castSeenKeyRef = useRef(0);
  // Play keys whose lead art already rendered through the piece-diff path;
  // the cast-level generated lead only fires for diff-less plays (clock,
  // draft, info cards...) so a card never leads twice.
  const castLeadSuppressKeyRef = useRef(0);
  // --- Acquire entrance: one shot the moment a card ENTERS a hand -----------
  // Diffs the public buff lists (both sides) by per-card instance count, so
  // draft picks, steals and grants each announce themselves the moment they
  // exist — including pure passives (clock drains, draft locks) that never
  // observably mutate the board and so never fire a play. Masked opponent
  // picks have an empty id and stay silent until revealed; an instance that
  // arrives already spent/nullified (an instant resolved at pick) is the
  // play's job, not an acquisition. The first non-null snapshot only seeds
  // the counts: a mid-game reload must not replay every held card.
  const entranceKeyRef = useRef(0);
  const entranceSeenRef = useRef<Map<string, number> | null>(null);
  const [entrance, setEntrance] = useState<{
    key: number;
    category: BuffCategory;
    tier: number;
    icon: LucideIcon;
    name: string;
    mine: boolean;
  } | null>(null);
  useEffect(() => {
    if (!buffs) return;
    const counts = new Map<string, number>();
    const liveArrival = new Map<string, { tier: number; mine: boolean }>();
    for (const color of ["w", "b"] as Color[]) {
      for (const inst of buffs.players[color].buffs) {
        if (!inst.id) continue;
        const k = `${color}:${inst.id}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
        if (!inst.spent && !inst.nullified) {
          liveArrival.set(k, { tier: inst.tier, mine: color === myColor });
        }
      }
    }
    const prev = entranceSeenRef.current;
    entranceSeenRef.current = counts;
    if (!prev) return;
    let fresh: { id: string; tier: number; mine: boolean } | null = null;
    for (const [k, n] of counts) {
      if (n <= (prev.get(k) ?? 0)) continue;
      const live = liveArrival.get(k);
      if (!live) continue; // arrived spent: the cast layer already told it
      fresh = { id: k.slice(2), ...live };
    }
    if (!fresh) return;
    const def = BUFF_BY_ID[fresh.id];
    if (!def) return;
    entranceKeyRef.current += 1;
    setEntrance({
      key: entranceKeyRef.current,
      category: def.category,
      tier: fresh.tier,
      icon: cardFaceIcon(def.id, def.category, def.icon) ?? Sparkles,
      name: def.name,
      mine: fresh.mine,
    });
  }, [buffs, myColor]);
  // --- Nerf reveal splash: one shot per newly-known rule --------------------
  // Keys already played (color:id), so a reveal fires exactly once no matter
  // how often the host re-derives the prop array. The latest unseen entry
  // wins the mount (two reveals in the same commit are vanishingly rare and
  // the banner would fully overlap anyway).
  const nerfRevealSeenRef = useRef<Set<string>>(new Set());
  const nerfRevealKeyRef = useRef(0);
  const [nerfReveal, setNerfReveal] = useState<{
    key: number;
    name: string;
    tier: number;
    mine: boolean;
    squares: number[];
  } | null>(null);
  useEffect(() => {
    if (!nerfReveals || nerfReveals.length === 0) return;
    let fresh: NerfRevealInfo | null = null;
    for (const r of nerfReveals) {
      const k = `${r.color}:${r.id}`;
      if (nerfRevealSeenRef.current.has(k)) continue;
      nerfRevealSeenRef.current.add(k);
      fresh = r;
    }
    if (!fresh) return;
    // Animations off in Settings: mark it seen (above) but never stage the
    // splash. The rule text lives in the corner nerf card either way.
    if (motionOff()) return;
    nerfRevealKeyRef.current += 1;
    setNerfReveal({
      key: nerfRevealKeyRef.current,
      name: fresh.name,
      tier: fresh.tier,
      mine: fresh.color === myColor,
      squares: fresh.highlightSquares ?? [],
    });
  }, [nerfReveals, myColor]);
  useEffect(() => {
    if (!signatureCard || signatureCard.key <= castSeenKeyRef.current) return;
    castSeenKeyRef.current = signatureCard.key;
    const def = BUFF_BY_ID[signatureCard.id];
    if (!def) return;
    // Pull the played card's result line, if it recorded one (last matching
    // instance wins, so a repeat play shows its own freshest outcome).
    let outcome: string | undefined;
    const bs = buffsRef.current;
    if (bs) {
      for (const color of ["w", "b"] as Color[]) {
        for (const inst of bs.players[color].buffs) {
          if (inst.id === signatureCard.id && typeof inst.state.outcome === "string") {
            outcome = inst.state.outcome as string;
          }
        }
      }
    }
    queueMicrotask(() =>
      setCast({ key: signatureCard.key, id: signatureCard.id, category: def.category, tier: def.tier, outcome }),
    );
    const intensity = castIntensity(def.tier);
    if (!sigOf(signatureCard.id) && intensity !== "sleek") {
      playCastVoice(def.category, intensity === "marquee");
    }
    if (intensity === "marquee" && !fxCalmClockRef.current && FX_LEVELS[fxLevelRef.current].shake !== "none") {
      const el = cropRef.current;
      if (el && !motionOff()) {
        el.classList.remove("fx-board-shake", "fx-board-shake--big");
        // Force a reflow so removing and re-adding the class restarts the
        // animation even when two marquee casts land back to back.
        void el.offsetWidth;
        el.classList.add("fx-board-shake");
        if (FX_LEVELS[fxLevelRef.current].shake === "big") el.classList.add("fx-board-shake--big");
      }
    }
  }, [signatureCard]);

  // Diff against the previous position during render (reference equality
  // guards against re-runs) so animated squares can be tagged in this pass.
  // Two diffs on purpose:
  //  - Piece SLIDES follow the rendered board (premove previews included, so
  //    a queued premove still glides).
  //  - Removal FX (detonations, signature choreography, canvas VFX, the
  //    explosion voice) diff the COMMITTED position only (fxPieces). The
  //    premove overlay adds/drops a "held" piece as pure UI artifact, and
  //    diffing it here read as a card removal — the "atomic explosion when
  //    you premove" bug. History review boards also route through here and
  //    now stay silent for free.
  //
  // This animation pipeline deliberately reads and writes refs during render:
  // the derived transforms are applied imperatively in the layout effect below
  // so React never re-renders them, which is what stops an unrelated re-render
  // (hover, selection) from snapping a piece mid-flight. Routing this through
  // state would reintroduce that snapping, so react-hooks/refs is intentionally
  // suppressed for this block rather than rewritten.
  /* eslint-disable react-hooks/refs */
  if (prevPiecesRef.current && prevPiecesRef.current !== board.pieces) {
    animsRef.current = computeAnims(
      prevPiecesRef.current,
      board.pieces,
      orientation,
      dropSkipRef.current,
    ).anims;
  }
  prevPiecesRef.current = board.pieces;

  if (prevFxPiecesRef.current && prevFxPiecesRef.current !== fxPieces) {
    const { anims, movedFrom } = computeAnims(
      prevFxPiecesRef.current,
      fxPieces,
      orientation,
      dropSkipRef.current,
    );
    const activeSig =
      signatureCard && signatureCard.key > sigSeenKeyRef.current && resolveSignature(signatureCard.id)
        ? signatureCard.id
        : null;
    // A diff claimed this play key: the cast-level generated lead stands down
    // (the diff path renders the lead on its own lead square).
    if (activeSig && signatureCard) castLeadSuppressKeyRef.current = signatureCard.key;
    if (signatureCard) sigSeenKeyRef.current = signatureCard.key;
    fxRef.current = computeBoardFx(
      prevFxPiecesRef.current,
      fxPieces,
      anims,
      movedFrom,
      dropSkipRef.current,
      lastMove?.capturedSquare ?? null,
      fxSeqRef,
      activeSig,
      orientation,
    );
    // Canvas VFX for the claimed play: the card's fiction-matched spec
    // (vfxSpecs) travels from its true source square to the exact squares the
    // effect landed on, staggered in choreography order. Staged into a ref
    // here (render must stay pure) and flushed to the bus after commit.
    if (activeSig) {
      const sigCfg = resolveSignature(activeSig);
      const def = BUFF_BY_ID[activeSig];
      const spec =
        sigCfg && def
          ? resolveCardVfx(
              activeSig,
              def.tier,
              isGenConfig(sigCfg) ? (sigCfg.visual as { family?: string }).family : undefined,
            )
          : null;
      if (spec && sigCfg && def) {
        const hits: { sq: Square; order: number; role: "lead" | "target" }[] = [];
        for (const [sq, fx] of fxRef.current) {
          if (fx.kind === "detonate" && fx.sig === activeSig) {
            hits.push({ sq, order: fx.sigOrder ?? 0, role: fx.sigRole ?? "target" });
          }
        }
        if (hits.length > 0) {
          hits.sort((a, b) => a.order - b.order);
          const leadSq = hits.find((h) => h.role === "lead")?.sq ?? hits[0].sq;
          // The caster is whichever side lost FEWER pieces in this diff (the
          // same majority read orderSignature uses).
          let wLost = 0;
          let bLost = 0;
          for (const h of hits) {
            const p = prevFxPiecesRef.current?.[h.sq];
            if (p?.color === "w") wLost++;
            else if (p?.color === "b") bLost++;
          }
          const casterColor: Color = bLost >= wLost ? "w" : "b";
          let source: VfxPoint;
          switch (spec.source) {
            case "mover":
              source = lastMove ? sqToFrac(lastMove.from, orientation) : sqToFrac(leadSq, orientation);
              break;
            case "caster": {
              const k = findKing(board, casterColor);
              source = k != null ? sqToFrac(k, orientation) : { x: 0.5, y: 0.5 };
              break;
            }
            case "sky":
              source = { x: 0.5, y: -0.06 };
              break;
            case "center":
              source = { x: 0.5, y: 0.5 };
              break;
            default:
              source = sqToFrac(leadSq, orientation);
          }
          pendingVfxRef.current.push({
            tier: def.tier,
            palette: spec.palette,
            source,
            targets: hits.map((h) => ({
              p: sqToFrac(h.sq, orientation),
              delayMs: h.order * sigCfg.staggerMs,
            })),
            travel: fxCalmClock ? "none" : spec.travel,
            impact: spec.impact,
            aftermath: fxCalmClock ? "none" : spec.aftermath,
            shake: spec.shake && !fxCalmClock && FX_LEVELS[fxLevel].shake !== "none",
            intensity: fxCalmClock ? Math.min(0.6, FX_LEVELS[fxLevel].vfx) : FX_LEVELS[fxLevel].vfx,
            durationScale: fxDurationScale(),
          });
        }
      }
    }
    dropSkipRef.current = null;
  }
  prevFxPiecesRef.current = fxPieces;
  /* eslint-enable react-hooks/refs */

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

  // Effect voices for the board flourishes diffed above (transform, summon,
  // detonation). Keyed by the same monotonic fx counter as the visuals, so
  // re-renders can never replay a sound, and the first render computes no fx
  // at all, so a restored or rejoined game mounts silently.
  const fxSoundKeyRef = useRef(0);
  useEffect(() => {
    let morph = false;
    let summon = false;
    let detonate = false;
    let sigId: string | null = null;
    let sigCount = 0;
    for (const fx of fxRef.current.values()) {
      if (fx.key <= fxSoundKeyRef.current) continue;
      if (fx.kind === "morph") morph = true;
      else if (fx.kind === "summon") summon = true;
      else {
        if (fx.sig) {
          sigId = fx.sig;
          if (fx.sigRole !== "lead") sigCount++;
        } else {
          detonate = true;
        }
      }
    }
    fxSoundKeyRef.current = fxSeqRef.current;
    // A signature plays its own choreographed voice (scaled to how many
    // squares it cleared) and suppresses the generic explosion for its own
    // hits; any un-dressed detonation this turn still cracks normally.
    // Bespoke signatures voice themselves; generated ones stay quiet here
    // because the category cast voice (playCastVoice) already covered the
    // play, and double-voicing reads as a bug.
    if (sigId && sigOf(sigId)) playSignature(sigId, Math.max(1, sigCount));
    if (detonate) playExplosion();
    if (morph) playTransform();
    if (summon) playSummon();
     
  }, [fxPieces]);

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

  // Opponent inspection: their moves grouped by origin, and the preview
  // squares (with capture flags) for the piece currently under inspection.
  const oppMovesFrom = useMemo(() => {
    const m = new Map<Square, Move[]>();
    for (const mv of opponentMoves ?? []) {
      let list = m.get(mv.from);
      if (!list) {
        list = [];
        m.set(mv.from, list);
      }
      list.push(mv);
    }
    return m;
  }, [opponentMoves]);
  const inspectTargets = useMemo(() => {
    const dots = new Map<Square, boolean>(); // sq -> is a capture
    if (inspectSq != null) {
      for (const m of oppMovesFrom.get(inspectSq) ?? []) {
        dots.set(m.to, dots.get(m.to) || !!m.captured);
      }
    }
    return dots;
  }, [inspectSq, oppMovesFrom]);
  // Any position change invalidates the inspected preview. Render-time state
  // adjustment (the react.dev "adjusting state when props change" pattern),
  // so the stale preview never paints even for one frame.
  const [inspectedPieces, setInspectedPieces] = useState(board.pieces);
  if (inspectedPieces !== board.pieces) {
    setInspectedPieces(board.pieces);
    setInspectSq(null);
  }

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
  // Green shield tint squares. Recompute from the LIVE effect state every
  // render so a stale square can never keep the tint lit: a shield square is
  // painted only while its effect is live (its timer has not run out) AND the
  // owner's own piece still stands on it, so the instant the shielded piece
  // moves off, is captured, or the effect expires the square drops. A
  // whole-army shield (squares null) tracks every current owner piece. This
  // reads only the shared board and the public effect list, so both players
  // resolve the identical set. Falls back to the parent-provided list when the
  // live buff state is not in hand (history review, nerf mode, or a surface
  // that omits buffs) so nothing regresses there.
  const shieldedSquares = useMemo(() => {
    if (visual && buffs) {
      const s = new Set<number>();
      for (const e of buffs.effects) {
        if (e.kind !== "shield") continue;
        if (e.turns != null && e.turns <= 0) continue;
        if (e.squares) {
          for (const sq of e.squares) {
            const p = board.pieces[sq];
            if (p && p.color === e.owner) s.add(sq);
          }
        } else {
          for (let sq = 0; sq < 64; sq++) {
            const p = board.pieces[sq];
            if (p && p.color === e.owner) s.add(sq);
          }
        }
      }
      return s;
    }
    return new Set(visual?.shieldedSquares ?? []);
  }, [visual, buffs, board.pieces]);
  // Green ward tint squares. Like the shield / royal-guard tints above,
  // recompute from the LIVE buff state every render instead of trusting the
  // parent-provided list, so a ward whose backing effect has ENDED can never
  // keep the green tint lit: a void / flypaper trap you own drops the instant
  // the card is spent or its window closes, and a barred zone you cast against
  // the opponent drops the instant its timer runs out. Mirrors draftZones'
  // ward derivation with the same owner/against split and the same turns /
  // spent liveness guards, reading only the shared board and the public buff
  // state so both players resolve the identical set. Falls back to the
  // parent-provided list when the live buff state is not in hand.
  const wardSquares = useMemo(() => {
    if (visual && buffs) {
      const s = new Set<number>();
      // Traps you own paint as YOUR ward (the same squares read as a hostile
      // barrier to the opponent). Guard on the live instance state so a spent
      // void or a closed flypaper window drops the tint at once.
      for (const inst of buffs.players[myColor].buffs) {
        if (inst.spent || inst.nullified) continue;
        if (inst.id === "void" || inst.id === "abyss" || inst.id === "void_realm") {
          for (const sq of (inst.state.squares as number[] | undefined) ?? []) s.add(sq);
        } else if (inst.id === "flypaper_file") {
          const sq = inst.state.sq as number | undefined;
          const turns = (inst.state.turns as number | undefined) ?? 0;
          if (sq != null && turns > 0) {
            const file = sq % 8;
            for (let r = 0; r < 8; r++) s.add(r * 8 + file);
          }
        }
      }
      // A barred zone you cast against the opponent also reads as your ward; its
      // turns guard clears it the instant it expires.
      for (const e of buffs.effects) {
        if (e.kind !== "barred" || e.against === myColor) continue;
        if (e.turns != null && e.turns <= 0) continue;
        for (const sq of e.squares) s.add(sq);
      }
      return s;
    }
    return new Set(visual?.wardSquares ?? []);
  }, [visual, buffs, myColor]);
  // Amazon queens: the "Amazon" card crowns one of your queens so she also moves
  // like a knight (the queen + knight fairy piece). It is a piece-bound upgrade,
  // so the crowned queen's square rides on the card instance's state.sq and
  // follows her as she moves; she stops being an amazon the moment she is
  // captured or promotes (the card is spent). Collect those squares from the
  // public buff state (both sides; masked opponent cards carry an empty id, so
  // nothing hidden surfaces, and the square must still hold that owner's queen)
  // so the board can render the merged queen+knight sprite there. Only the
  // queen-based "amazon" card is marked: knight / bishop amazons keep their own
  // base silhouette.
  const amazonSquares = useMemo(() => {
    const s = new Set<number>();
    if (!buffs) return s;
    for (const color of ["w", "b"] as Color[]) {
      for (const inst of buffs.players[color].buffs) {
        if (inst.id !== "amazon" || inst.spent || inst.nullified) continue;
        const sq = inst.state.sq as number | undefined;
        if (typeof sq !== "number" || sq < 0 || sq > 63) continue;
        const p = board.pieces[sq];
        if (p && p.color === color && p.type === "q") s.add(sq);
      }
    }
    return s;
  }, [buffs, board.pieces]);
  // Companion pieces: bespoke portrait art on the square each companion card
  // tracks (state.sq, kept current by trackBoundPiece). Derived from the
  // public buff state for BOTH sides so the opponent sees the same companion;
  // the square must still hold the owner's piece (a captured companion's card
  // is spent, so nothing stale can paint). Masked instances carry an empty
  // id and never match.
  //
  // The tracked square only updates on COMMITTED state, but `board` here is
  // the DISPLAYED board — during the optimistic-move / server-ack window and
  // under a queued-premove preview she has already been drawn on a different
  // square. Follow her along the displayed board instead of dropping the art
  // (the "Cami flickers to a plain queen when she moves" bug): if the tracked
  // square no longer holds the expected friendly piece, chase it through the
  // displayed lastMove and then the queued premove chain, and only paint once
  // the resolved square really shows her piece class in her color.
  const companionSquares = useMemo(() => {
    const m = new Map<number, { art: string }>();
    if (!buffs) return m;
    for (const color of ["w", "b"] as Color[]) {
      for (const inst of buffs.players[color].buffs) {
        const spec = COMPANION_ART[inst.id];
        if (!spec || inst.spent || inst.nullified) continue;
        let sq = inst.state.sq as number | undefined;
        if (typeof sq !== "number" || sq < 0 || sq > 63) continue;
        const holds = (s: number) => {
          const p = board.pieces[s];
          return !!p && p.color === color && p.type === spec.piece;
        };
        if (!holds(sq)) {
          // The displayed board is ahead of the committed card state. A move
          // she made (optimistic, pending ack, or the committed move a premove
          // preview builds on) shows as lastMove; queued premoves stack on top.
          if (lastMove && lastMove.from === sq && lastMove.to != null) sq = lastMove.to;
          for (const pm of premoves ?? []) if (pm.from === sq) sq = pm.to;
        }
        if (holds(sq)) m.set(sq, { art: spec.art });
      }
    }
    return m;
  }, [buffs, board.pieces, lastMove, premoves]);
  // Movement-grant HYBRID sprites (owner request: an empowered piece should
  // look like a genuinely new piece). Every running card that declares a
  // movement grant (CardFx motif "empower" with moveAs) already paints a
  // motif mark on each affected square — piece-bound cards on their one
  // tracked piece, army-wide grants on every matching piece — so the granted
  // type per square is a pure read of those marks. The Piece sprite then
  // renders the fused hybrid (or the bespoke Amazon for queen+knight). The
  // marks derive from public card state on both surfaces, so both players see
  // the same new piece.
  const moveAsSquares = useMemo(() => {
    const m = new Map<number, PieceType>();
    for (const mk of visual?.motifSquares ?? []) {
      if (mk.motif !== "empower" || !mk.moveAs) continue;
      const p = board.pieces[mk.sq];
      if (p && mk.moveAs !== p.type) m.set(mk.sq, mk.moveAs);
    }
    return m;
  }, [visual?.motifSquares, board.pieces]);
  const strikeSquares = useMemo(() => new Set(visual?.strikeSquares ?? []), [visual?.strikeSquares]);
  const walnutSquares = useMemo(() => new Set(visual?.walnutSquares ?? []), [visual?.walnutSquares]);
  const frozenSkins = visual?.frozenSkins ?? EMPTY_SKINS;
  const effectTurns = visual?.effectTurns ?? EMPTY_TURNS;
  // Duration status line for a square's active effect (null = permanent or
  // none). Spelled out precisely (owner request): the timer ticks once each
  // time the AFFECTED side completes a move, so "2 turns" means two more of
  // their moves — up to four half-moves of the game — not two full rounds.
  const effectStatusLine = (sq: number): string | null => {
    const t = effectTurns[sq];
    if (t == null) return null;
    return `${t} turn${t === 1 ? "" : "s"} left: ${t} more move${t === 1 ? "" : "s"} by the affected side (up to ${t * 2} half-moves)`;
  };
  const lockedSquares = useMemo(() => new Set(visual?.lockedSquares ?? []), [visual?.lockedSquares]);
  const bananaSquares = useMemo(() => new Set(visual?.bananaSquares ?? []), [visual?.bananaSquares]);
  const trapMarks = useMemo(() => {
    const m = new Map<number, { kind: string; name: string }>();
    for (const t of visual?.trapSquares ?? []) m.set(t.sq, { kind: t.kind, name: t.name });
    return m;
  }, [visual?.trapSquares]);
  const doomMarks = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of visual?.doomSquares ?? []) m.set(d.sq, d.turns);
    return m;
  }, [visual?.doomSquares]);
  const barredSquares = useMemo(() => new Set(visual?.barredSquares ?? []), [visual?.barredSquares]);
  // Royal-guard (king_safe) tint. Recompute from live state as well: it always
  // sits on the owner's CURRENT king square and clears the instant the ward
  // expires, so the tint can never stick to a square the king has left behind.
  const kingSafeSquares = useMemo(() => {
    if (visual && buffs) {
      const s = new Set<number>();
      let wKing = -1;
      let bKing = -1;
      for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (!p || p.type !== "k") continue;
        if (p.color === "w") wKing = sq;
        else bKing = sq;
      }
      for (const e of buffs.effects) {
        if (e.kind !== "king_safe") continue;
        if (e.turns != null && e.turns <= 0) continue;
        const k = e.owner === "w" ? wKing : bKing;
        if (k >= 0) s.add(k);
      }
      return s;
    }
    return new Set(visual?.kingSafeSquares ?? []);
  }, [visual, buffs, board.pieces]);
  const pawnClampSquares = useMemo(
    () => new Set(visual?.pawnClampSquares ?? []),
    [visual?.pawnClampSquares],
  );
  // Pending-skip stun markers by king square (n = remaining skips, part of
  // the overlay key so each application/consumption replays the one-shot).
  const stunBySquare = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of visual?.stunSquares ?? []) m.set(s.sq, s.n);
    return m;
  }, [visual?.stunSquares]);
  // Card-fx motif per square (fxZones already resolved strongest-wins).
  const motifBySquare = useMemo(() => {
    const m = new Map<number, MotifMark>();
    for (const mk of visual?.motifSquares ?? []) m.set(mk.sq, mk);
    return m;
  }, [visual?.motifSquares]);
  // Duelist-style piece-bound buff markers, derived from the public game.buffs.
  // A card counts when it is held (not spent / nullified), is a genuinely
  // BOUND upgrade (the engine's own rule: an activated, spend-on-use:false card
  // whose state points at the owner's square(s); see library.ts boundUpgrade),
  // declares NO CardFx motif (fx cards already paint a motif badge), and its
  // bound square currently holds one of the owner's own pieces. That is the set
  // of ongoing piece marks the board otherwise shows nothing for (Duelist, a
  // placed phantom rook, bound upgrades without fx). A recorded countdown /
  // charge pool that reached zero leaves the card inert, so it is skipped, and
  // masked opponent instances carry an empty id so nothing hidden can surface.
  // First live mark wins a square.
  const boundMarks = useMemo(() => {
    const m = new Map<number, BoundMark>();
    if (!buffs) return m;
    for (const color of ["w", "b"] as Color[]) {
      for (const inst of buffs.players[color].buffs) {
        if (!inst.id || inst.spent || inst.nullified) continue;
        const def = BUFF_BY_ID[inst.id];
        if (!def) continue;
        if (def.kind !== "activated" || def.spendOnUse !== false) continue; // bound upgrades only
        if (def.fx?.pieces) continue; // fx cards already draw a motif badge
        const turns = typeof inst.state.turns === "number" ? inst.state.turns : null;
        if (turns != null && turns <= 0) continue;
        const charges = typeof inst.state.charges === "number" ? inst.state.charges : null;
        if (charges != null && charges <= 0) continue;
        const sqs: number[] = [];
        if (typeof inst.state.sq === "number") sqs.push(inst.state.sq);
        if (Array.isArray(inst.state.sqs)) {
          for (const s of inst.state.sqs) if (typeof s === "number") sqs.push(s);
        }
        for (const sq of sqs) {
          if (sq < 0 || sq > 63 || m.has(sq)) continue;
          const p = board.pieces[sq];
          if (!p || p.color !== color) continue; // must mark the owner's own piece
          m.set(sq, {
            name: def.name,
            description: def.description,
            status: def.status ? def.status(inst) : null,
            flavor: def.flavor ?? null,
            tier: inst.tier,
            category: def.category,
            tone: def.category === "hex" ? "hex" : "buff",
          });
        }
      }
    }
    return m;
  }, [buffs, board.pieces]);
  // Chain-jailed squares: shackled pieces minus the pawn-clamp family (those
  // get the fence instead). Sorted order drives the clamp-in stagger so the
  // links read as dropping in one after another.
  const jailSquares = useMemo(() => {
    const s = new Set<number>();
    for (const sq of lockedSquares) if (!pawnClampSquares.has(sq)) s.add(sq);
    return s;
  }, [lockedSquares, pawnClampSquares]);
  const jailDelays = useMemo(() => {
    const m = new Map<number, number>();
    let i = 0;
    for (const sq of [...jailSquares].sort((a, b) => a - b)) m.set(sq, Math.min(i++, 7) * 55);
    return m;
  }, [jailSquares]);
  const highlightSquares = useMemo(
    () => new Set(visual?.highlightSquares ?? []),
    [visual?.highlightSquares],
  );

  // --- Sideline mascots (brainrot pets) --------------------------------------
  // Any brainrot card in a side's public buff list — held OR already played
  // (spent instants stay in the list for the record) — summons that character
  // as an ambient pet loitering at that side's board edge for the rest of the
  // game. Nullified copies never activated, so they summon nothing. First
  // matching card wins (deterministic). Limitation: a masked opponent card
  // (empty id, only if a server build re-enables draft masking) cannot summon
  // its mascot until its identity is revealed.
  const mascotIds = useMemo(() => {
    if (!buffs) return null;
    const pick = (color: Color): string | null => {
      for (const inst of buffs.players[color].buffs) {
        if (inst.id && !inst.nullified && BRAINROT_MASCOT_IDS.has(inst.id)) return inst.id;
      }
      return null;
    };
    const mine = pick(myColor);
    const theirs = pick(myColor === "w" ? "b" : "w");
    return mine || theirs ? { mine, theirs } : null;
  }, [buffs, myColor]);
  // Mascot reactions ride the same committed-position signal the removal FX
  // diff uses (fxPieces): when a side's piece count drops, that owner's pet
  // slumps and the other pet celebrates. Count-diffed in an effect (not the
  // render-phase fx diff, which stays untouched) so premove overlays and
  // history review never trigger a reaction, matching the fxPieces rationale.
  const mascotPrevCountsRef = useRef<{ w: number; b: number } | null>(null);
  const [mascotEvent, setMascotEvent] = useState<{ key: number; loser: Color } | null>(null);
  useEffect(() => {
    if (!mascotIds) return;
    const counts = { w: 0, b: 0 };
    for (const p of fxPieces) if (p) counts[p.color] += 1;
    const prev = mascotPrevCountsRef.current;
    mascotPrevCountsRef.current = counts;
    if (!prev) return;
    const wLost = prev.w - counts.w;
    const bLost = prev.b - counts.b;
    if (wLost <= 0 && bLost <= 0) return;
    // A multi-removal card can cost both sides pieces; the bigger loser mopes.
    const loser: Color = wLost >= bLost ? "w" : "b";
    setMascotEvent((e) => ({ key: (e?.key ?? 0) + 1, loser }));
  }, [fxPieces, mascotIds]);

  // Expansion Permit (9x9): while either side's permit is live (unspent, not
  // nullified, turns remaining), the board wears its under-construction ring
  // (ExpansionZone). The wrap moves themselves are real legal moves, so their
  // destinations already highlight as normal move dots.
  const expansionActive = useMemo(() => {
    if (!buffs) return false;
    for (const color of ["w", "b"] as Color[]) {
      for (const inst of buffs.players[color].buffs) {
        if (
          inst.id === "expansion_permit" &&
          !inst.spent &&
          !inst.nullified &&
          ((inst.state.turns as number) ?? 0) > 0
        ) {
          return true;
        }
      }
    }
    return false;
  }, [buffs]);

  // --- Zone-sourced signatures (source !== "removal") ------------------------
  // computeBoardFx above dresses ONLY squares a piece was REMOVED from, so a
  // signature whose art decorates a piece that STAYS on the board (an empower
  // coronation, a mass-freeze, a walnut petrify, an aegis shield, a summon
  // rise, a stun snooze, a rally banner...) had its registry entry but never
  // rendered. Fire those here from the very fx-effect zones Board already
  // computes for its tints: when the played-card key advances, read the target
  // squares from the zone the card's `source` names, order them, and stage one
  // SignatureOverlay per square. Both the play key and the zone squares are
  // public, so both players build the identical sequence (never gated on the
  // viewer), and it is keyed to the play key via zoneSigSeenKeyRef so it fires
  // exactly once and an unrelated re-render (hover, resize) never replays it.
  // Same deliberate render-phase ref pattern as the piece-diff above (staged
  // once per play key, consumed imperatively), so react-hooks/refs is suppressed
  // rather than rewritten.
  /* eslint-disable react-hooks/refs */
  {
    const ex = buffs?.extraMoves;
    if (ex) {
      const prev = prevExtraMovesRef.current;
      if (prev) {
        for (const c of ["w", "b"] as Color[]) {
          const gained = ex[c] - prev[c];
          // A grant (increase) fires the banner; consumption (decrease) never
          // does. total = remaining extras + the normal turn.
          if (gained > 0) {
            extraBannerRef.current = { color: c, gained, total: ex[c] + 1, key: ++extraBannerKeyRef.current };
          }
        }
      }
      prevExtraMovesRef.current = { w: ex.w, b: ex.b };
    } else {
      prevExtraMovesRef.current = null;
    }
  }
  if (signatureCard && signatureCard.key > zoneSigSeenKeyRef.current) {
    zoneSigSeenKeyRef.current = signatureCard.key;
    const cfg = sigOf(signatureCard.id);
    const marks = new Map<
      number,
      { sig: string; order: number; role: "lead" | "target"; key: number }
    >();
    if (cfg && cfg.source && cfg.source !== "removal") {
      let squares: number[] = [];
      switch (cfg.source) {
        case "frozen":
          squares = [...frozenSquares];
          break;
        case "walnut":
          squares = [...walnutSquares];
          break;
        case "shield":
          squares = [...shieldedSquares];
          break;
        case "kingSafe":
          squares = [...kingSafeSquares];
          break;
        case "stun":
          squares = [...stunBySquare.keys()];
          break;
        case "empower":
        case "rally":
        case "slow":
        case "blindfold":
          // Motif marks whose motif matches the source name (fxZones already
          // resolved strongest-wins, one mark per square).
          for (const [sq, mk] of motifBySquare) if (mk.motif === cfg.source) squares.push(sq);
          break;
        case "summon":
          // Squares that just gained a piece this play, already detected by
          // computeBoardFx and tagged as summon flourishes.
          for (const [sq, fx] of fxRef.current) if (fx.kind === "summon") squares.push(sq);
          break;
      }
      for (const t of orderZoneSignature(cfg, squares, orientation)) {
        marks.set(t.sq, {
          sig: signatureCard.id,
          order: t.order,
          role: t.role,
          key: signatureCard.key,
        });
      }
      if (marks.size > 0) zoneLeadClaimKeyRef.current = signatureCard.key;
      // Canvas VFX over the zone squares: the same fiction-matched spec the
      // removal path uses, travelling to the pieces the card actually touched
      // (frozen, shielded, empowered...). Staged into the ref; flushed after
      // commit.
      if (marks.size > 0) {
        const def = BUFF_BY_ID[signatureCard.id];
        const spec = def ? resolveCardVfx(signatureCard.id, def.tier) : null;
        if (spec && def) {
          const ordered = [...marks.entries()].sort((a, b) => a[1].order - b[1].order);
          const leadSq = ordered.find(([, m]) => m.role === "lead")?.[0] ?? ordered[0][0];
          // Zone effects land on the AFFECTED side's pieces; the caster is
          // the other side's king.
          const affected = board.pieces[leadSq]?.color;
          const casterColor: Color = affected === "w" ? "b" : "w";
          let source: VfxPoint;
          switch (spec.source) {
            case "caster":
            case "mover": {
              const k = findKing(board, casterColor);
              source = k != null ? sqToFrac(k, orientation) : { x: 0.5, y: 0.5 };
              break;
            }
            case "sky":
              source = { x: 0.5, y: -0.06 };
              break;
            case "center":
              source = { x: 0.5, y: 0.5 };
              break;
            default:
              source = sqToFrac(leadSq, orientation);
          }
          pendingVfxRef.current.push({
            tier: def.tier,
            palette: spec.palette,
            source,
            targets: ordered.map(([sq, m]) => ({
              p: sqToFrac(sq, orientation),
              delayMs: m.order * cfg.staggerMs,
            })),
            travel: fxCalmClock ? "none" : spec.travel,
            impact: spec.impact,
            aftermath: fxCalmClock ? "none" : spec.aftermath,
            shake: spec.shake && !fxCalmClock && FX_LEVELS[fxLevel].shake !== "none",
            intensity: fxCalmClock ? Math.min(0.6, FX_LEVELS[fxLevel].vfx) : FX_LEVELS[fxLevel].vfx,
            durationScale: fxDurationScale(),
          });
        }
      }
    }
    // Replace (even when empty: a removal signature or a card with no zone
    // source clears here) so the previous zone signature's overlays drop the
    // instant the next card is played.
    zoneSigRef.current = marks;
  }
  /* eslint-enable react-hooks/refs */

  // Entrance voices for the persistent square effects: each family sounds
  // exactly once, when a square first gains the effect, matching the visual
  // one-shot entrances. Diffed against the previous sets; a null visual
  // (initial mount, restored game, history review) resets the baseline
  // SILENTLY, so only effects appearing after the first live render ever
  // sound, and leaving review never replays a wall of entrances.
  const prevZoneSoundsRef = useRef<{
    jail: Set<number>;
    shield: Set<number>;
    freeze: Set<number>;
    banana: Set<number>;
    stun: Map<number, number>;
  } | null>(null);
  useEffect(() => {
    if (!visual) {
      prevZoneSoundsRef.current = null;
      return;
    }
    const jail = new Set<number>(jailSquares);
    const shield = new Set<number>([...shieldedSquares, ...kingSafeSquares]);
    const freeze = new Set<number>([...frozenSquares, ...walnutSquares]);
    for (const mk of visual.motifSquares ?? []) {
      if (mk.motif === "jail") jail.add(mk.sq);
      else if (mk.motif === "ward") shield.add(mk.sq);
    }
    const banana = new Set<number>(bananaSquares);
    const stun = new Map(stunBySquare);
    const prev = prevZoneSoundsRef.current;
    prevZoneSoundsRef.current = { jail, shield, freeze, banana, stun };
    if (!prev) return; // baseline snapshot: pre-existing effects stay silent
    const gained = (now: Set<number>, before: Set<number>) => {
      for (const sq of now) if (!before.has(sq)) return true;
      return false;
    };
    if (gained(jail, prev.jail)) playChains();
    if (gained(shield, prev.shield)) playShieldUp();
    if (gained(freeze, prev.freeze)) playFreeze();
    // A peel vanishing mid-game means the trap fired: somebody slipped.
    for (const sq of prev.banana) {
      if (!banana.has(sq)) {
        playSlip();
        break;
      }
    }
    // The stun swirl replays on every application AND every consumed skip
    // (the visual keys on the remaining count); the voice matches it.
    for (const [sq, n] of stun) {
      const before = prev.stun.get(sq);
      if (before == null || n !== before) {
        playStun();
        break;
      }
    }
  }, [
    visual,
    jailSquares,
    shieldedSquares,
    kingSafeSquares,
    frozenSquares,
    walnutSquares,
    bananaSquares,
    stunBySquare,
  ]);

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

  // Wipe drawn arrows / square marks. Called whenever a move interaction
  // begins so a rejected or illegal attempt can't leave them stuck on the
  // board (the board.pieces effect only fires when a move actually lands).
  const clearAnnotations = () => {
    setArrows((a) => (a.length ? [] : a));
    setRightClickMarks((m) => (Object.keys(m).length ? {} : m));
  };

  const tryPlay = (sq: Square): boolean => {
    if (selected != null && targets[sq]) {
      clearAnnotations();
      const candidates = targets[sq];
      if (candidates.length > 1 && candidates[0].promotion) {
        // premoves always auto-queen (the user can't be asked mid-opponent-turn);
        // the Settings auto-queen toggle does the same for normal moves. A
        // promotion that CAPTURES THE KING never asks either — the game is
        // over the moment it lands, so the picker is pure friction.
        const capturesKing = candidates.some(
          (c) => c.captured === "k" || (c.capturedSquare != null && board.pieces[c.capturedSquare]?.type === "k"),
        );
        if (premoveMode || autoQueen || capturesKing) {
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
  const targetsRef = useRef(targets);
  useEffect(() => {
    tryPlayRef.current = tryPlay;
    targetsRef.current = targets;
  });

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
    // Drawn arrows and marks are cleared the moment a move interaction begins
    // (see onPointerDownPiece / tryPlay) and also by a plain left-click that
    // plays no move and grabs no piece (handled at the end of this function):
    // lichess-style "click the board to clear your shapes". A move that
    // actually lands also wipes them via the board.pieces effect below.
    // Targeting mode swallows the pointer entirely: a candidate square picks,
    // anything else is a no-op (Escape or the cancel chip exits the mode).
    if (pickingSquares) {
      if (pickSquareSet.has(sq)) {
        // A crazyhouse pocket drop lands through this same pick path: the parent
        // arms a pocket piece and feeds the legal drop squares in as pickSquares.
        // Give placing a banked piece its own set-down voice. Buff-target picks
        // (no drop move to this square) stay silent here and sound when their
        // effect actually lands. One shot per drop.
        if (legalMoves.some((m) => m.drop != null && m.to === sq)) playDrop();
        onPickSquare?.(sq);
      }
      return;
    }
    // While the board is not interactive (not your turn, move review, an open
    // draft offer), a touch tap on a special square still inspects it: mobile
    // has no hover, so this is the phone counterpart of the desktop popover.
    if (disabled) {
      if (e.pointerType === "touch" && effectInfoFor(sq)) {
        e.stopPropagation();
        setEffectPopoverSq(sq);
      }
      return;
    }
    if (tryPlay(sq)) return;
    const piece = board.pieces[sq];
    if (piece && piece.color === myColor && movesFrom.has(sq)) {
      pressRef.current = { sq, wasSelected: selected === sq };
      onPointerDownPiece(e, sq);
      return;
    }
    // Inspect an enemy piece: slate dots preview every square it could reach
    // (turn-flipped legal moves from the host). A second tap on the same
    // piece toggles the preview off; a frozen piece has no moves and falls
    // through to the effect popover instead.
    if (piece && piece.color !== myColor && oppMovesFrom.has(sq)) {
      clearAnnotations();
      setSelected(null);
      setInspectSq((cur) => (cur === sq ? null : sq));
      playSelect();
      return;
    }
    // A tap that plays no move and grabs no piece, landing on a special square
    // (a frozen/locked/warded/hexed piece or square, an opponent's bound card),
    // inspects it: the same effect popover desktop shows on hover. Touch only,
    // so desktop's click-to-clear-shapes stays untouched. A legal move onto a
    // special square already fired via tryPlay above, so capturing a hexed
    // enemy piece still captures. Clear the selection and shapes first, exactly
    // like the dead-tap path below, so inspecting never leaves a move armed
    // under the popover (a later tap must not fire a stale target).
    if (e.pointerType === "touch" && effectInfoFor(sq)) {
      clearAnnotations();
      setSelected(null);
      lastTapRef.current = null;
      e.stopPropagation();
      setEffectPopoverSq(sq);
      return;
    }
    // A plain left-click / tap on the board that neither plays a move nor picks
    // up a piece wipes every drawn arrow and square mark, lichess-style ("click
    // the board to clear your shapes"). It must NOT cancel a queued premove:
    // clearing shapes and canceling a premove are separate concerns. A premove
    // is still canceled the normal way (a different premove, the right-click
    // context menu, or the dedicated cancel control), never by a stray click.
    const hadSelection = selected != null;
    clearAnnotations();
    if (hadSelection) {
      setSelected(null);
    }
    setInspectSq(null);
    // Touch has no right-click, which is how desktop cancels a queued premove
    // (handleSquareContextMenu). On mobile, a double-tap on the same empty
    // square cancels the whole premove queue. Only a "pure" dead tap counts (one
    // that did not just deselect a piece), so retrying a mis-tapped premove
    // never nukes the queue. We only reach here on a tap that played no move and
    // grabbed no piece, so this can never disturb tap-to-move or premove making.
    if (e.pointerType === "touch" && premoves && premoves.length > 0 && onCancelPremove) {
      const now = e.timeStamp || nowMs();
      const prev = lastTapRef.current;
      if (!hadSelection && prev && prev.sq === sq && now - prev.t < 320) {
        lastTapRef.current = null;
        onCancelPremove();
        return;
      }
      lastTapRef.current = hadSelection ? null : { sq, t: now };
    }
  };

  // Clicking anywhere outside the board also clears the selection (and any
  // enemy-piece inspection preview).
  useEffect(() => {
    if (selected == null && inspectSq == null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (boardRef.current && !boardRef.current.contains(e.target)) {
        setSelected(null);
        setInspectSq(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selected, inspectSq]);

  // Back out of the promotion picker instead of being forced to complete a
  // promotion. The move is committed only when a promotion piece is chosen, so
  // canceling just drops the pending picker and clears the selection: no move
  // was played yet, nothing to undo.
  const cancelPromotion = () => {
    setPromotionMove(null);
    setSelected(null);
  };
  useEffect(() => {
    if (!promotionMove) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelPromotion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [promotionMove]);

  // --- Drag & drop via pointer events ---
  const onPointerDownPiece = (e: React.PointerEvent, sq: Square) => {
    clearAnnotations();
    const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    gridRectRef.current = rect;
    const cell = rect.width / 8;

    setSelected(sq);
    setInspectSq(null);
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
      // Clear every scrap of in-progress interaction state so a cancelled drag
      // (e.g. an aborted illegal move) can't leave a stale press/skip square
      // that corrupts the next interaction.
      pressRef.current = null;
      dropSkipRef.current = null;
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

  // Keep the JS-measured pixel cache tracking the board's real size. The board
  // itself is responsive via CSS, but drag targeting reads a cached grid rect
  // (gridRectRef) captured at pointer-down; fullscreen, a window resize, or any
  // layout change that resizes the board mid-drag would otherwise leave that
  // rect stale and make drops land on the wrong square. A ResizeObserver on the
  // grid (plus window resize / fullscreenchange, which don't always resize the
  // element synchronously) re-measures it. We only refresh while the rect is in
  // use (mid-drag); when idle it stays null so squareAtClient measures fresh,
  // which also keeps it correct across scrolling. Piece-slide animations already
  // re-measure the cell size on each run, so they track resizes for free.
  useEffect(() => {
    const grid = boardRef.current?.querySelector("[data-board-grid]") as HTMLElement | null;
    if (!grid) return;
    const refresh = () => {
      if (gridRectRef.current) gridRectRef.current = grid.getBoundingClientRect();
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(grid);
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    document.addEventListener("fullscreenchange", refresh);
    // visualViewport tracks the on-screen viewport (mobile URL bar, pinch
    // zoom, virtual keyboard) that a plain window "resize" can miss.
    window.visualViewport?.addEventListener("resize", refresh);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      document.removeEventListener("fullscreenchange", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
    };
  }, []);

  const draggedPiece = drag ? board.pieces[drag.from] : null;

  // Any *real* move wipes the scratchpad, like Lichess. A rejected/illegal move
  // attempt leaves the position untouched (the engine no-ops it), so drawn
  // arrows and marks must survive it. We diff the placement slot-by-slot rather
  // than trusting board.pieces identity: makeMove returns the same array on a
  // no-op (unchanged reference), and cloneBoard only shallow-copies pieces, so a
  // parent re-render that hands us a fresh-but-identical pieces array (an
  // illegal move that got no-oped, or unrelated churn) compares equal and does
  // NOT erase the annotations. A genuine move changes at least two slots.
  const wipePrevPiecesRef = useRef<BoardState["pieces"] | null>(null);
  useEffect(() => {
    const prev = wipePrevPiecesRef.current;
    wipePrevPiecesRef.current = board.pieces;
    if (!prev || prev === board.pieces) return;
    let moved = prev.length !== board.pieces.length;
    if (!moved) {
      for (let i = 0; i < board.pieces.length; i++) {
        if (prev[i] !== board.pieces[i]) {
          moved = true;
          break;
        }
      }
    }
    if (!moved) return;
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
    // Tearing the gesture down on cancel / blur / Escape stops a half-drawn
    // preview arrow from getting stuck when the pointerup never arrives (the
    // window loses focus, another element captures the pointer, or the release
    // reports a non-right button).
    const onCancel = () => setRightDrag(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRightDrag(null);
    };
    window.addEventListener("pointermove", onMovePointer);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onMovePointer);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("keydown", onKeyDown);
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
    // Drop any rect cached by an interrupted left-drag so the arrow's target is
    // measured fresh for the whole draw (squareAtClient re-measures when null).
    // Prevents a stale-rect left over from a rejected/illegal move attempt from
    // making the next right-click-drag arrow point at the wrong square.
    gridRectRef.current = null;
    setRightDrag({ from: sq, mark: markFromModifiers(e), hover: sq });
  };

  // Whether the strongest card-fx motif on a square is actually shown there
  // (same rule the render uses to decide the MotifBadge). Factored out so the
  // popover text below reports exactly what the board paints, never drifting.
  const motifShownFor = (sq: Square): boolean => {
    const mark = motifBySquare.get(sq);
    if (!mark) return false;
    const p = board.pieces[sq];
    if (!p) return false;
    if (walnutSquares.has(sq) || frozenSquares.has(sq)) return false;
    if (!isEmpowerMotif(mark.motif) && (jailSquares.has(sq) || pawnClampSquares.has(sq))) return false;
    if (mark.motif === "ward" && (shieldedSquares.has(sq) || kingSafeSquares.has(sq))) return false;
    return true;
  };

  // Every active effect on a square, each as its OWN individualized entry: a
  // specific title (Walnut / Frozen / Sanctuary / Warded / the card's name...),
  // its own tone (buff boon, hex curse, or a neutral board effect), its own
  // body, and its own remaining-turns status. Replaces a single generic
  // "Active effect" label that read identically for every effect. Public
  // information, so it is safe to spell out.
  type ZoneEffectEntry = {
    title: string;
    body: string;
    status: string | null;
    tone: "buff" | "hex" | "neutral";
  };
  const zoneEffectsFor = (sq: Square): ZoneEffectEntry[] => {
    const out: ZoneEffectEntry[] = [];
    const status = effectStatusLine(sq);
    if (walnutSquares.has(sq))
      out.push({
        title: "Walnut",
        tone: "hex",
        status,
        body: "A squirrel buried this piece under a heavy nut, so it can only shuffle one square at a time until the shell cracks.",
      });
    if (frozenSquares.has(sq)) {
      // The skin label reads "Frozen: iced in place": split into a specific
      // title (the state) and a body, so glue, stun, sleep and ice each read
      // as their own effect instead of one shared "frozen" line.
      const label = freezeSkinOf(frozenSkins[sq]).label;
      const ci = label.indexOf(":");
      const title = ci >= 0 ? label.slice(0, ci).trim() : label;
      const detail = ci >= 0 ? label.slice(ci + 1).trim() : "";
      out.push({
        title,
        tone: "hex",
        status,
        body: detail
          ? `${detail.charAt(0).toUpperCase()}${detail.slice(1)}: this piece cannot move while it holds.`
          : "This piece cannot move while it holds.",
      });
    }
    if (pawnClampSquares.has(sq))
      out.push({
        title: "Pawn halted",
        tone: "hex",
        status,
        body: "A hex has fenced this pawn's path; it cannot advance.",
      });
    if (lockedSquares.has(sq) && !pawnClampSquares.has(sq))
      out.push({
        title: "Shackled",
        tone: "hex",
        status,
        body: "A hex has chained this piece in place.",
      });
    if (shieldedSquares.has(sq))
      out.push({
        title: "Shielded",
        tone: "buff",
        status,
        body: "This piece cannot be captured while the shield holds - and while it cannot be captured, it may not capture the king itself (you must expose a piece to win). Kings are never shielded.",
      });
    if (kingSafeSquares.has(sq))
      out.push({
        title: "Royal guard",
        tone: "buff",
        status,
        body: "This king cannot be captured while the ward holds.",
      });
    if (wardSquares.has(sq))
      out.push({
        title: "Warded",
        tone: "buff",
        status,
        body: "Your opponent cannot move a piece onto this square.",
      });
    if (bananaSquares.has(sq))
      out.push({
        title: "Banana peel",
        tone: "neutral",
        status: null,
        body: "The next enemy piece to step here slips and skids off course.",
      });
    if (trapMarks.has(sq)) {
      const t = trapMarks.get(sq)!;
      out.push({
        title: t.name,
        tone: "neutral",
        status: null,
        body: TRAP_HOVER_BODY[t.kind] ?? "A placed trap waits on this square.",
      });
    }
    if (doomMarks.has(sq)) {
      const n = doomMarks.get(sq)!;
      out.push({
        title: "Doomed",
        tone: "hex",
        status: null,
        body: `This piece dies in ${n} of its owner's turns unless it is captured first.`,
      });
    }
    if (strikeSquares.has(sq))
      out.push({
        title: "Lightning",
        tone: "neutral",
        status: null,
        body: "This square was just struck.",
      });
    if (motifShownFor(sq)) {
      const motifMark = motifBySquare.get(sq);
      if (motifMark)
        out.push({
          title: motifMark.name,
          tone: isEmpowerMotif(motifMark.motif) ? "buff" : "hex",
          status:
            motifMark.turns != null
              ? `${motifMark.turns} turn${motifMark.turns === 1 ? "" : "s"} left`
              : null,
          body: motifMark.description,
        });
    }
    return out;
  };

  // Resolve a square's popover content: a bound buff (Duelist and friends)
  // names its card and rule text; otherwise the zone-effect explanation. Null
  // when the square carries neither, so hovering a plain square opens nothing.
  const effectInfoFor = (sq: Square): EffectPopoverContent | null => {
    // The bound-buff sigil is suppressed where a motif badge already stamps
    // the piece; keep the popover in step so hover reports what is drawn.
    const bound = motifShownFor(sq) ? undefined : boundMarks.get(sq);
    if (bound) {
      return {
        title: bound.name,
        body: bound.description,
        status: bound.status,
        flavor: bound.flavor,
        tier: bound.tier,
        tone: bound.tone,
      };
    }
    const effects = zoneEffectsFor(sq);
    if (effects.length === 0) return null;
    // The most salient effect (list order) names the popover and sets its
    // tone/status; any others on the same square append their sentence so a
    // stacked square loses nothing, but the header is now the effect's own
    // name instead of the old generic "Active effect" shared by everything.
    const primary = effects[0];
    return {
      title: primary.title,
      body: effects.map((e) => e.body).join(" "),
      status: primary.status,
      tone: primary.tone,
    };
  };

  // Open the popover for a square only when it actually explains something and
  // no drag is in flight (a drag over a square must not raise cards).
  const openEffectPopover = (sq: Square) => {
    if (drag) return;
    if (effectInfoFor(sq)) setEffectPopoverSq(sq);
  };
  const closeEffectPopover = (sq: Square) => {
    setEffectPopoverSq((cur) => (cur === sq ? null : cur));
  };

  // Tap-away / interaction dismiss: once a popover is open, the next pointer
  // press anywhere that is not a bound-buff trigger closes it (the trigger's
  // own handler stops propagation, so tapping it keeps it open). Covers touch,
  // where there is no pointer-leave, and closes on any board interaction.
  useEffect(() => {
    if (effectPopoverSq == null) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" && t.closest("[data-effect-keep]")) return;
      setEffectPopoverSq(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [effectPopoverSq]);

  return (
    <div ref={boardRef} className="relative w-full max-w-[min(92vw,720px)] aspect-square mx-auto">
      <div ref={cropRef} className="absolute inset-2 sm:inset-3 rounded-sm overflow-hidden border border-black/40">
        {/* Canvas VFX layer: particles, projectiles, beams and cinematics for
            card plays, drawn over the squares but under floating UI. The
            engine sleeps whenever nothing is animating. */}
        <VfxLayer onShake={vfxShake} />
        <div
          data-board-grid
          // touch-action: none is what makes drag work on mobile — without it
          // the browser claims the touch for scrolling and fires pointercancel
          // mid-drag. Tap-to-move keeps working either way.
          className="grid grid-cols-8 grid-rows-8 w-full h-full select-none [touch-action:none]"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Per-square render reads the staged animation refs (fx, zone
              signature, piece anims) — the same deliberate imperative pipeline
              documented above, so react-hooks/refs is suppressed here too. */}
          {/* eslint-disable-next-line react-hooks/refs */}
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
            const boardFx = fxRef.current.get(sq);
            // A zone-sourced signature staged for this square (empower / freeze
            // / walnut / shield / stun / summon...), one-shot per play. It plays
            // over the piece that stays, unlike a removal detonation.
            const zoneSig = zoneSigRef.current.get(sq);
            // Chain jail: link into the visually-right / visually-below
            // neighbour when it is jailed too, so adjacent shackled pieces
            // read as one interlinked lockdown (each pair drawn once).
            const jailed = jailSquares.has(sq);
            let jailLinkRight = false;
            let jailLinkDown = false;
            if (jailed) {
              const visRight = orientation === "w" ? (f < 7 ? sq + 1 : null) : f > 0 ? sq - 1 : null;
              const visDown = orientation === "w" ? (r > 0 ? sq - 8 : null) : r < 7 ? sq + 8 : null;
              jailLinkRight = visRight != null && jailSquares.has(visRight);
              jailLinkDown = visDown != null && jailSquares.has(visDown);
            }
            // The pawn-clamp fence sits on the pawn's forward edge: visually
            // the top edge when the pawn advances up the screen.
            const fenceEdge: "top" | "bottom" =
              piece && (piece.color === "w") === (orientation === "w") ? "top" : "bottom";

            // Card-fx motif for this square. Same-concept dedupe: a square
            // that already carries the full-square treatment of the same
            // idea keeps it and skips the badge. Chain jail and pawn fence
            // outrank constraint badges, freeze and walnut silence every
            // motif (the piece is out of action), and the buckler/heater
            // shield covers what a ward ring would say.
            const motifMark = motifBySquare.get(sq);
            const motifShown = motifShownFor(sq);
            // Duelist-style bound-buff marker for this square (skipped where a
            // motif badge already stamps the piece, so the two never stack).
            const boundMark = !motifShown ? boundMarks.get(sq) : undefined;
            // Whether this square explains anything on hover / focus (drives
            // the popover triggers below): a bound buff or any zone effect.
            const hasEffectInfo = !!effectInfoFor(sq);

            // Corner claims for this square (see CORNER_FALLBACK above).
            // Fixed priority: countdown chip > freeze flake > bound sigil >
            // motif badge. The shield disc keeps its fixed bottom-left art, so
            // its corner is seeded as taken; the walnut root-claws are thin
            // decorative corner slivers badges may sit over, so they claim
            // nothing.
            const shieldShown = !!piece && (shieldedSquares.has(sq) || kingSafeSquares.has(sq));
            const claimedCorners = new Set<BadgeCorner>();
            if (shieldShown) claimedCorners.add("bl");
            const claimCorner = (pref: BadgeCorner): BadgeCorner => {
              for (const c of CORNER_FALLBACK[pref]) {
                if (!claimedCorners.has(c)) {
                  claimedCorners.add(c);
                  return c;
                }
              }
              return pref; // all four taken: overlap is unavoidable, keep preference
            };
            const countdownShown = !!piece && (doomMarks.has(sq) || effectTurns[sq] != null);
            const countdownCorner = countdownShown ? claimCorner("br") : "br";
            const flakeCorner = frozenSquares.has(sq) ? claimCorner("tr") : "tr";
            const boundCorner = boundMark ? claimCorner("tl") : "tl";
            const motifCorner =
              !fxHiddenPref && motifShown && motifMark && CORNER_MOTIFS.has(motifMark.motif)
                ? claimCorner("tr")
                : "tr";

            const fogHide =
              !!visual?.fogged && piece && piece.color !== myColor && !lastTo;

            const classes = [
              "relative flex items-center justify-center",
              isLight ? "sq-light" : "sq-dark",
              isSelected ? "sq-sel" : "",
              highlightLastMove && (lastFrom || lastTo) ? "sq-last" : "",
              checkSquares?.includes(sq) ? "sq-check" : "",
              isHover && (isTarget || isCastleHint) ? "sq-hover" : "",
            ].join(" ");

            return (
              <div
                key={sq}
                onContextMenu={handleSquareContextMenu}
                onPointerDown={(e) => handleSquarePointerDown(e, sq)}
                // Additive drag-to-pick path: a card chip dragged from the dock
                // (marked with the custom dataTransfer type) can be dropped on a
                // highlighted candidate square. Only pick targets react, and
                // only to card drags, so normal play and other drags are
                // unaffected. The click flow (handleSquarePointerDown) is
                // untouched.
                onDragOver={
                  isPickTarget
                    ? (e) => {
                        if (e.dataTransfer.types.includes("application/x-nerf-card")) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      }
                    : undefined
                }
                onDrop={
                  isPickTarget
                    ? (e) => {
                        if (e.dataTransfer.types.includes("application/x-nerf-card")) {
                          e.preventDefault();
                          onPickSquare?.(sq);
                        }
                      }
                    : undefined
                }
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
                // Desktop hover raises the styled effect popover in place of the
                // old browser title (only when the square explains something and
                // no drag is in flight). Pointer-leave dismisses it; pointerdown
                // move handling is untouched.
                onPointerEnter={hasEffectInfo ? () => openEffectPopover(sq) : undefined}
                onPointerLeave={hasEffectInfo ? () => closeEffectPopover(sq) : undefined}
              >
                {underwater && (
                  <div className="absolute inset-0 bg-cyan-500/25 mix-blend-screen pointer-events-none" />
                )}
                {banned && (
                  <>
                    <div className="absolute inset-0 bg-red-900/45 pointer-events-none" />
                    {/* Glowing aura: the nerf is ACTING here, not just tinting.
                        Decorative, so it stands down when effects are hidden or
                        the clock is calming FX (the red tint is the functional
                        read and always stays). */}
                    {!fxHiddenPref && !fxCalmClock && <NerfAura />}
                  </>
                )}
                {wardSquares.has(sq) && (
                  <>
                    <div className="absolute inset-0 bg-verdigris/20 pointer-events-none" />
                    <BarrierStakes tone="ward" />
                  </>
                )}
                {barredSquares.has(sq) && <BarrierStakes tone="hostile" />}
                {frozenSquares.has(sq) && (
                  /* Immobilized: the MECHANIC is always the same (the piece
                     cannot move), but the skin picks the tint + corner marker so
                     glue, stun, sleep, web... never look like plain ice. */
                  <>
                    <div
                      className={`absolute inset-0 pointer-events-none sq-freeze ${freezeSkinOf(frozenSkins[sq]).tint}`}
                    />
                    {frozenSkins[sq] === "beartrap" && (
                      /* Bear Trap: the whole steel-jaw marker clamps around
                         the held piece (which renders above it). */
                      <div className="absolute inset-0 grid place-items-center pointer-events-none">
                        <div style={{ width: "84%", height: "84%" }}>
                          <BearTrapMark />
                        </div>
                      </div>
                    )}
                    <span
                      className={`absolute ${CORNER_INSET_POS[flakeCorner]} z-10 leading-none pointer-events-none drop-shadow sq-freeze-flake`}
                    >
                      <FreezeGlyph kind={freezeSkinOf(frozenSkins[sq]).glyph} />
                    </span>
                  </>
                )}
                {walnutSquares.has(sq) && (
                  /* Hexed into a walnut: the piece is entombed in the kintsugi
                     shell (WalnutPiece) while carved root-claws clamp in from
                     the square's corners and hold it fast for the duration. */
                  <>
                    <div className="absolute inset-0 bg-amber-700/20 pointer-events-none sq-walnut" />
                    <RootClaws />
                  </>
                )}
                {bananaSquares.has(sq) && (
                  /* A banana peel the viewer tossed here (owner-only trap). The
                     peel sits on the empty square with a jaunty spin until an
                     enemy piece slips on it. */
                  <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
                    <div className="banana-peel" style={{ width: "60%", height: "60%" }}>
                      <BananaPeel />
                    </div>
                  </div>
                )}
                {doomMarks.has(sq) && piece && (
                  /* Doomed piece (Death Arcana style): the countdown to its
                     death rides the square, skull-tagged. */
                  <CountdownChip n={doomMarks.get(sq)!} doom corner={countdownCorner} />
                )}
                {!doomMarks.has(sq) && piece && effectTurns[sq] != null && (
                  /* Any other timed piece effect (freeze, walnut, shield,
                     ward...): the remaining turns ride the corner. */
                  <CountdownChip n={effectTurns[sq]!} corner={countdownCorner} />
                )}
                {trapMarks.has(sq) && (
                  /* Any other placed trap: a realistic animated marker per
                     kind (SMIL idle loops inside the SVGs; reduced-motion
                     aware). Same publicity rule as the peel. */
                  <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
                    <div style={{ width: "68%", height: "68%" }}>
                      {(() => {
                        switch (trapMarks.get(sq)!.kind) {
                          case "mine": return <MineMark />;
                          case "sinkhole": return <SinkholeMark />;
                          case "trapdoor": return <TrapdoorMark />;
                          case "whoopee": return <WhoopeeCushionMark />;
                          case "landlord": return <LandlordClaimMark />;
                          case "beartrap": return <BearTrapMark />;
                          default: return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
                {lockedSquares.has(sq) && (
                  /* Shackled by a king-only or no-pawn-advance hex: a grey
                     pall (one soft pulse on mount), then either the chain
                     jail (piece lockdowns) or the pawn fence below. */
                  <div className="absolute inset-0 bg-slate-800/35 pointer-events-none sq-locked" />
                )}
                {jailed && (
                  /* Chain jail: links clamp down across the piece and hook
                     into adjacent jailed squares, staggered square by square. */
                  <ChainJail
                    linkRight={jailLinkRight}
                    linkDown={jailLinkDown}
                    delayMs={jailDelays.get(sq) ?? 0}
                  />
                )}
                {pawnClampSquares.has(sq) && piece && (
                  /* Pawn clamp: a low fence hairline boards up the forward
                     edge; the path ahead is closed. */
                  <PawnFence edge={fenceEdge} />
                )}
                {!fxHiddenPref && motifShown && motifMark && isEmpowerMotif(motifMark.motif) && (
                  /* Empowered-piece shine: a soft breathing halo under a piece
                     carrying a self-grant (empower/ward/rally), in the CARD's
                     own tint and hash-picked shape (EmpowerAura aura identity),
                     so two different grants never wear the same aura. Rides
                     the same motifShown gate as the badge, so frozen / walnut
                     constraints silence it and it never paints where the motif
                     itself is suppressed. Rendered before the piece div, so
                     the piece always stays on top. */
                  <EmpowerShine tier={motifMark.tier} cardId={motifMark.id} />
                )}
                {!fxHiddenPref &&
                  motifShown &&
                  motifMark &&
                  !isEmpowerMotif(motifMark.motif) &&
                  !banned &&
                  !isForced && (
                    /* Hostile twin for constraint cards (jail / muzzle / anchor
                       / blindfold / slow): the same per-card aura identity on
                       the ember base, so every curse also reads as ITS card.
                       Skipped where the square already smolders (banned /
                       forced mounts an id-less NerfAura below) so the glow
                       never doubles up. */
                    <NerfAura cardId={motifMark.id} tier={motifMark.tier} />
                  )}
                {!fxHiddenPref && motifShown && motifMark && (
                  /* Card-fx motif badge, tinted by the card's tier and
                     stamped with its category glyph, parked in the corner the
                     allocator assigned. Keyed by motif + card name so
                     re-renders never replay the entrance; only a genuinely
                     different card (or motif) remounts it. */
                  <MotifBadge
                    key={`motif-${motifMark.motif}-${motifMark.name}`}
                    motif={motifMark.motif}
                    tier={motifMark.tier}
                    category={motifMark.category}
                    moveAs={motifMark.moveAs}
                    name={motifMark.name}
                    cardId={motifMark.id}
                    cardIcon={motifMark.icon}
                    corner={motifCorner}
                  />
                )}
                {boundMark && (
                  /* Duelist-style bound-buff sigil: a small tinted corner glyph
                     on a piece carrying an active piece-bound buff, visible to
                     both players. A real focusable button so hover, keyboard
                     focus, and tap all raise the card popover; its pointerdown
                     is swallowed (data-effect-keep + stopPropagation) so tapping
                     the glyph never grabs the piece or triggers a move. Keyed by
                     name so a genuinely different card replays the entrance. */
                  <button
                    key={`bound-${boundMark.name}`}
                    type="button"
                    data-effect-keep
                    aria-label={`${boundMark.name}: ${boundMark.description}`}
                    className={`absolute ${BOUND_POS[boundCorner]} z-30 h-[26%] w-[26%] rounded-full p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70`}
                    onPointerEnter={() => openEffectPopover(sq)}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openEffectPopover(sq);
                    }}
                    onFocus={() => setEffectPopoverSq(sq)}
                    onBlur={() => closeEffectPopover(sq)}
                  >
                    <BoundBuffMark tier={boundMark.tier} category={boundMark.category} />
                  </button>
                )}
                {piece && (shieldedSquares.has(sq) || kingSafeSquares.has(sq)) && (
                  <>
                    <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-verdigris-glow/80 shadow-[inset_0_0_18px_-4px_rgba(123,181,47,0.6)] sq-shield-in" />
                    {/* Shield bearer: a heater shield leans against the
                        king's square-front; other pieces get a buckler. */}
                    <ShieldMark
                      variant={piece?.type === "k" || kingSafeSquares.has(sq) ? "heater" : "buckler"}
                    />
                  </>
                )}
                {strikeSquares.has(sq) && !boardFx?.sig && !zoneSig && (
                  /* The plain lightning bolt is suppressed on any square already
                     showing a signature this tick (bombardiro_croc's strike
                     effect otherwise double-draws under the croc-bomber
                     signature; the same guard de-dupes lightning_strike). */
                  <div className="absolute inset-0 pointer-events-none z-10 sq-strike">
                    <span className="absolute inset-0 flex items-center justify-center drop-shadow">
                      <BoltGlyph />
                    </span>
                  </div>
                )}
                {rightClickMark && (
                  <div className={`absolute inset-0 pointer-events-none sq-rmb-mark sq-rmb-mark-${rightClickMark}`} />
                )}
                {isDuck && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <DuckGlyph />
                  </div>
                )}
                {stunBySquare.has(sq) && (
                  /* One-shot stun: a dazed swirl + Zs rise over the skipped
                     player's king, then fade. Keyed by the remaining skip
                     count so every application/consumption replays it. */
                  <StunSwirl key={`stun-${sq}-${stunBySquare.get(sq)}`} />
                )}
                {boardFx?.kind === "morph" && (
                  <TransformFlourish key={`fx-${boardFx.key}`} crown={boardFx.crown} />
                )}
                {boardFx?.kind === "summon" && <SummonPoof key={`fx-${boardFx.key}`} />}
                {boardFx?.kind === "detonate" &&
                  !fxHiddenPref &&
                  (() => {
                    const sigCfg = boardFx.sig ? resolveSignature(boardFx.sig) : undefined;
                    // Every branch mounts inside the fx-one-shot guard: art
                    // that fails to fade itself out (see effects.css) is
                    // taken off the board by the wrapper instead of sitting
                    // there until the next play.
                    if (!sigCfg)
                      return (
                        <span
                          key={`fx-${boardFx.key}`}
                          className="fx-one-shot pointer-events-none absolute inset-0 z-30 block"
                        >
                          <DetonationBurst />
                        </span>
                      );
                    const delay = (boardFx.sigOrder ?? 0) * sigCfg.staggerMs;
                    const sigRole = fxCalmClock ? "target" : boardFx.sigRole ?? "target";
                    // A board-wide LEAD flourish is painted in an oversized
                    // canvas centred on THIS square. When the lead square sits
                    // off-centre (an edge or corner cast) that canvas clips to a
                    // fraction, which is the "only 1/4 of the animation shows"
                    // report. Slide the lead so its canvas re-centres on the
                    // board: sqToFrac gives the square centre as a 0..1 board
                    // fraction (orientation-resolved), and 800% is one board
                    // width (8 cells) of this one-cell wrapper, so the shift
                    // lands the canvas centre on the board centre wherever it
                    // was cast. Per-square target pops carry no shift and stay
                    // on their own squares. Covers bespoke (SignatureOverlay ->
                    // BoardWideStage) and generated (GenBurst -> GenLead) leads
                    // alike, so neither renderer needs to know about centring.
                    const leadShift =
                      sigRole === "lead"
                        ? (() => {
                            const f = sqToFrac(sq, orientation);
                            return {
                              transform: `translate(${(0.5 - f.x) * 800}%, ${(0.5 - f.y) * 800}%)`,
                            };
                          })()
                        : undefined;
                    // Generated configs carry their own renderer; bespoke ones
                    // go through the classic SignatureOverlay switch.
                    // The z-30 on BOTH wrappers below is LOAD-BEARING: the
                    // fx-one-shot guard animates opacity and the lead shift
                    // applies a transform, and each of those makes its span a
                    // STACKING CONTEXT that traps the art's own z-30 inside.
                    // Without z-indexes of their own the wrappers paint in DOM
                    // order, so every LATER square's opaque background covers
                    // the overflowing board-wide scene — the "animation cut
                    // off by an invisible wall" bug. Lifting the wrappers
                    // keeps the whole stage above sibling squares.
                    return (
                      <span
                        key={`fx-${boardFx.key}`}
                        className="fx-one-shot pointer-events-none absolute inset-0 z-30 block"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <span className="absolute inset-0 z-30 block" style={leadShift}>
                          {isGenConfig(sigCfg) ? (
                            <GenBurst config={sigCfg} role={sigRole} delayMs={delay} />
                          ) : (
                            <SignatureOverlay visual={sigCfg.visual} role={sigRole} delayMs={delay} />
                          )}
                        </span>
                      </span>
                    );
                  })()}
                {!fxHiddenPref && zoneSig && sigOf(zoneSig.sig) &&
                  (() => {
                    /* Zone-sourced signature (source !== "removal"): the same
                       SignatureOverlay art, but staged over a piece that STAYS
                       on the board and sourced from the fx-effect zone the card
                       names, not the removal diff. Its board-wide lead clips the
                       same way an off-centre removal lead does, so re-centre it
                       on the board with the identical shift. */
                    const zRole = fxCalmClock ? "target" : zoneSig.role;
                    const zShift =
                      zRole === "lead"
                        ? (() => {
                            const f = sqToFrac(sq, orientation);
                            return {
                              transform: `translate(${(0.5 - f.x) * 800}%, ${(0.5 - f.y) * 800}%)`,
                            };
                          })()
                        : undefined;
                    // Same load-bearing z-30 as the removal path above: the
                    // shift transform creates a stacking context, so without
                    // its own z-index the lead scene is painted over by every
                    // later square's opaque background.
                    return (
                      <span
                        key={`zsig-${zoneSig.key}`}
                        className="absolute inset-0 z-30 block"
                        style={zShift}
                      >
                        <SignatureOverlay
                          visual={sigOf(zoneSig.sig)!.visual}
                          role={zRole}
                          delayMs={zoneSig.order * sigOf(zoneSig.sig)!.staggerMs}
                        />
                      </span>
                    );
                  })()}
                {isForced && !isDragging && (
                  <>
                    <div className="absolute inset-0 pointer-events-none rounded-sm ring-2 ring-inset ring-gold-leaf/80 shadow-[inset_0_0_24px_-4px_rgba(230,191,106,0.55)] animate-flicker" />
                    {/* The nerf's grip on this piece glows, matching the
                        banned-square aura. Decorative: hidden when FX are off,
                        while the gold ring stays as the read. */}
                    {!fxHiddenPref && !fxCalmClock && <NerfAura />}
                  </>
                )}
                {isPickTarget && (
                  <div className="sq-pickable absolute inset-0 pointer-events-none rounded-sm" />
                )}
                {fogHide ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-700/85 to-stone-900/95 backdrop-blur-sm pointer-events-none" />
                ) : piece ? (
                  <div
                    // The fx key remounts the piece when a morph/summon fires so
                    // the pop/drop entrance replays even on back-to-back
                    // transforms of the same square. Detonations (including a
                    // signature lead painted over a surviving capturer) never
                    // touch the piece, so they must not remount it.
                    key={
                      boardFx && (boardFx.kind === "morph" || boardFx.kind === "summon")
                        ? `piece-fx-${boardFx.key}`
                        : undefined
                    }
                    className={
                      "pointer-events-none " +
                      (isDragging ? "opacity-30 " : "") +
                      // The piece itself wears its live effect (owner: "a mark
                      // should actually change the piece"): frostbitten when
                      // frozen, gilded when shielded, deathly when doomed.
                      (frozenSquares.has(sq)
                        ? "piece-frozen "
                        : doomMarks.has(sq)
                        ? "piece-doomed "
                        : shieldedSquares.has(sq)
                        ? "piece-shielded "
                        : "") +
                      (boardFx?.kind === "morph"
                        ? "fx-piece-pop"
                        : boardFx?.kind === "summon"
                        ? "fx-piece-drop"
                        : "")
                    }
                    data-anim-piece={animsRef.current.has(sq) ? sq : undefined}
                    style={{ width: "var(--piece-fit, 88%)", height: "var(--piece-fit, 88%)" }}
                  >
                    {walnutSquares.has(sq) ? (
                      <WalnutPiece type={piece.type} color={piece.color} size="100%" />
                    ) : companionSquares.has(sq) ? (
                      // Companion piece: bespoke portrait art in place of the
                      // standard sprite (mechanics stay the underlying piece).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={companionSquares.get(sq)!.art}
                        alt=""
                        draggable={false}
                        className="h-full w-full select-none object-contain drop-shadow"
                      />
                    ) : (
                      <Piece
                        type={piece.type}
                        color={piece.color}
                        size="100%"
                        amazon={amazonSquares.has(sq)}
                        moveAs={moveAsSquares.get(sq)}
                      />
                    )}
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
                {/* Opponent inspection preview: slate dots on every square the
                    inspected enemy piece could reach, plus a ring on the piece
                    itself. Distinct styling so it never reads as YOUR hints. */}
                {inspectSq === sq && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-[rgba(120,160,190,0.65)] rounded-sm" />
                )}
                {inspectTargets.has(sq) &&
                  (inspectTargets.get(sq) ? (
                    <div className="dot-inspect-capture pointer-events-none" />
                  ) : (
                    <div className="dot-inspect-target pointer-events-none" />
                  ))}
                {isPremoveSquare && (
                  <div className="absolute inset-0 pointer-events-none bg-oxblood/45" />
                )}

                {/* Coordinate labels: when a mark claimed the label's home
                    corner, the label slides along its edge past the mark's
                    footprint and gains a subtle ink backing so it stays
                    legible over whatever art now owns the corner. */}
                {showCoordinates && f === (orientation === "w" ? 0 : 7) && (
                  <span
                    className={
                      "absolute text-[10px] font-mono font-semibold pointer-events-none " +
                      (claimedCorners.has("tl")
                        ? "top-0.5 left-[36%] z-20 rounded-[2px] bg-ink-950/60 px-0.5 text-parchment-100/90"
                        : "top-0.5 left-1 " + (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85"))
                    }
                  >
                    {r + 1}
                  </span>
                )}
                {showCoordinates && r === (orientation === "w" ? 0 : 7) && (
                  <span
                    className={
                      "absolute text-[10px] font-mono font-semibold pointer-events-none " +
                      (claimedCorners.has("br")
                        ? "bottom-0.5 right-[36%] z-20 rounded-[2px] bg-ink-950/60 px-0.5 text-parchment-100/90"
                        : "bottom-0.5 right-1 " + (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85"))
                    }
                  >
                    {"abcdefgh"[f]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Passive-grant edge aura: while any of the VIEWER's own pieces
            carries a live self-grant motif (empower / ward / rally), a very
            faint tinted glow breathes along the viewer's edge of the crop —
            "you have a perk running". The strongest (highest-tier) grant
            picks the tint; orientation decides which edge is the viewer's. */}
        {!fxHiddenPref &&
          (() => {
            let bestTier = 0;
            for (const mk of motifBySquare.values()) {
              if (!isEmpowerMotif(mk.motif)) continue;
              const p = board.pieces[mk.sq];
              if (!p || p.color !== myColor) continue;
              if (mk.tier > bestTier) bestTier = mk.tier;
            }
            return bestTier > 0 ? (
              <EdgeAura color={myColor} orientation={orientation} tint={tierRgb(bestTier)} />
            ) : null;
          })()}

        {/* Cast spectacle: the board-level themed read every played card gets
            (category fallback layer). One-shot, keyed to the play so React
            mounts it exactly once per cast; the finished overlay ends at
            opacity 0 and simply waits to be replaced by the next cast. */}
        {!fxHiddenPref && !fxCalmClock && cast && (
          <CastSpectacle
            key={`cast-${cast.key}`}
            category={cast.category}
            tier={cast.tier}
            id={cast.id}
            name={BUFF_BY_ID[cast.id]?.name}
            description={BUFF_BY_ID[cast.id]?.description}
            cardIcon={BUFF_BY_ID[cast.id]?.icon}
            bespoke={!!sigOf(cast.id) || PLUGIN_ID_SET.has(cast.id)}
          />
        )}
        {/* Acquire entrance: a card just ENTERED a hand (draft pick, steal,
            grant). Fired from the buff-list diff above; passives and
            off-board cards (clock drains, draft locks) announce themselves
            here even though they never mutate the board. */}
        {!fxHiddenPref && !fxCalmClock && entrance && (
          <CardEntrance
            key={`ent-${entrance.key}`}
            category={entrance.category}
            tier={entrance.tier}
            icon={entrance.icon}
            name={entrance.name}
            mine={entrance.mine}
          />
        )}
        {/* extraBannerRef is staged during render by the extra-moves block
            above and consumed imperatively, same deliberate ref pattern. */}
        {/* eslint-disable react-hooks/refs */}
        {extraBannerRef.current && (
          <ExtraTurnsBanner
            key={`exb-${extraBannerRef.current.key}`}
            mine={extraBannerRef.current.color === myColor}
            gained={extraBannerRef.current.gained}
            total={extraBannerRef.current.total}
          />
        )}
        {/* eslint-enable react-hooks/refs */}
        {cast && BUFF_BY_ID[cast.id] && (
          <PlayAnnouncement key={`ann-${cast.key}`} name={BUFF_BY_ID[cast.id]!.name} tier={cast.tier} outcome={cast.outcome} />
        )}
        {/* Nerf reveal: "the rule descends" — plays once per newly-known rule
            (the viewer's own at game start, the opponent's when revealed).
            Decorative layer, so the fx-hidden switch stands it down; the CSS
            drops it entirely when animations are off in Settings. */}
        {!fxHiddenPref && nerfReveal && (
          <NerfRevealSplash
            key={`nerfrev-${nerfReveal.key}`}
            name={nerfReveal.name}
            tier={nerfReveal.tier}
            mine={nerfReveal.mine}
            squares={nerfReveal.squares}
            orientation={orientation}
          />
        )}
        {/* Diff-less lead: a played card that removes nothing and leaves no
            zone (clock steals, draft tricks, info peeks...) still gets its
            unique board-wide flourish here — the generated burst for gen
            configs, the SignatureOverlay art for bespoke/plugin configs whose
            source is unset (zone-sourced bespoke plays render through the
            zone-signature path instead, so they are skipped to avoid a double
            lead). Suppressed whenever the piece-diff path already led this
            play key. */}
        {/* Both the lead-suppression and the zone-claim checks below read
            play-key refs the animation blocks staked during render (deliberate
            render-phase reads, see those blocks above). */}
        {/* eslint-disable react-hooks/refs */}
        {!fxHiddenPref &&
          !fxCalmClock &&
          cast &&
          cast.key !== castLeadSuppressKeyRef.current &&
          (() => {
            const cfg = resolveSignature(cast.id);
            if (!cfg || !cfg.hasLead) return null;
            // Lead art (BoardWideStage & friends) is calibrated for a ONE-CELL
            // parent: its 1400% canvas equals ~14 cells, blanketing the 8x8
            // board with margin. Mounting it on the full crop (inset-0)
            // multiplied every dimension by 8 — the "way too zoomed in"
            // fragment bug — so both branches stage inside a single centered
            // cell (12.5% = 1/8 of the board; already centered, no leadShift
            // needed). This keeps board-wide effects the same real size on
            // every screen the board itself renders on.
            const cellStage =
              "fx-one-shot pointer-events-none absolute left-[43.75%] top-[43.75%] h-[12.5%] w-[12.5%] z-30";
            if (isGenConfig(cfg)) {
              return (
                <div key={`genlead-${cast.key}`} aria-hidden className={cellStage}>
                  <GenBurst config={cfg} role="lead" delayMs={0} />
                </div>
              );
            }
            if (
              cfg.source &&
              cfg.source !== "removal" &&
              cast.key === zoneLeadClaimKeyRef.current
            ) {
              return null; // the zone path is playing this card's art
            }
            return (
              <div key={`siglead-${cast.key}`} aria-hidden className={cellStage}>
                <SignatureOverlay visual={cfg.visual} role="lead" delayMs={0} />
              </div>
            );
          })()}
        {/* eslint-enable react-hooks/refs */}

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

      {/* Expansion Permit construction ring: the ninth file / ninth rank
          being bolted on, mounted on the outer board box (outside the
          overflow-hidden crop, same area as the mascots) so it hangs off the
          right and top edges. Pure decoration; the wrap moves highlight as
          normal dots inside the crop. */}
      {!fxHiddenPref && expansionActive && <ExpansionZone />}

      {/* Sideline mascots: each side's brainrot pet loiters at that side's
          outer board edge (mine = bottom rim, theirs = top rim) for the rest
          of the game. Ambient only: pointer-events-none, outside the crop,
          reacting to the committed capture diff via mascotEvent. */}
      {!fxHiddenPref && mascotIds?.mine && (
        <SidelineMascot
          side="mine"
          id={mascotIds.mine}
          mood={mascotEvent ? (mascotEvent.loser === myColor ? "sad" : "cheer") : null}
          moodKey={mascotEvent?.key ?? 0}
        />
      )}
      {!fxHiddenPref && mascotIds?.theirs && (
        <SidelineMascot
          side="theirs"
          id={mascotIds.theirs}
          mood={mascotEvent ? (mascotEvent.loser === myColor ? "cheer" : "sad") : null}
          moodKey={mascotEvent?.key ?? 0}
        />
      )}

      {/* Effect-explanation popover: one styled card for any active-effect
          square (bound buffs and zone effects). Mounted on the outer board
          box (outside the inner overflow-hidden crop) so it is never clipped,
          positioned in board-percent coordinates by EffectPopover, and
          suppressed under the promotion picker. */}
      {effectPopoverSq != null &&
        !promotionMove &&
        !fxHiddenPref &&
        (() => {
          const info = effectInfoFor(effectPopoverSq);
          if (!info) return null;
          return (
            <EffectPopover sq={effectPopoverSq} orientation={orientation} content={info} />
          );
        })()}

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
          {companionSquares.has(drag.from) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companionSquares.get(drag.from)!.art}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-contain drop-shadow"
            />
          ) : (
            <Piece type={draggedPiece.type} color={draggedPiece.color} size="100%" />
          )}
        </div>
      )}

      <AnimatePresence>
        {promotionMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Click the dark backdrop (outside the picker) to cancel. The inner
            // panel stops propagation so choosing a piece never counts as a
            // click-away.
            onClick={cancelPromotion}
            role="dialog"
            aria-label="Choose a promotion piece"
            className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md z-20"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="plate gilt flex flex-col items-center gap-2 p-3 sm:p-4"
            >
              <div className="flex gap-2">
                {promotionMove.map((m) => (
                  <button
                    key={m.promotion}
                    onClick={() => {
                      onMove(m);
                      setPromotionMove(null);
                      setSelected(null);
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-sm bg-ink-800 hover:bg-ink-700 flex items-center justify-center border border-gold/30"
                  >
                    <Piece type={m.promotion!} color={m.color} size={50} className="sm:hidden" />
                    <Piece type={m.promotion!} color={m.color} size={56} className="hidden sm:inline-grid" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={cancelPromotion}
                className="rounded-[1px] border border-coral/40 bg-coral/10 px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-coral-glow transition hover:bg-coral/20"
              >
                Cancel <span className="text-coral-glow/60">Esc</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
