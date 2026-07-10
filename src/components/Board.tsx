"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ShieldMark,
  SIGNATURES,
  type SignatureConfig,
  SignatureOverlay,
  SnowflakeGlyph,
  SquirrelGlyph,
  StunSwirl,
  SummonPoof,
  TransformFlourish,
} from "./effects/BoardEffects";
import {
  GenBurst,
  genSignatureConfig,
  runGenSelfCheck,
  type GenConfig,
} from "./effects/genSignature";

// Signature resolution: bespoke entries win; every other card falls back to
// its deterministic generated choreography (see genSignature.tsx), so no card
// is ever left without a play animation. Generated configs are cached: the
// generator is pure, so one build per card id per session is plenty.
const genConfigCache = new Map<string, GenConfig>();
function resolveSignature(id: string): SignatureConfig | GenConfig | undefined {
  const bespoke = SIGNATURES[id];
  if (bespoke) return bespoke;
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
import { EdgeAura, EmpowerShine, tierRgb } from "./effects/EmpowerAura";
import type { MotifMark } from "./effects/fxZones";
import { EffectPopover, type EffectPopoverContent } from "./EffectPopover";
import { useFxHidden } from "@/lib/fxToggle";
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

// Hover copy for the placed-trap markers (mine, sinkhole, trapdoor...).
const TRAP_HOVER_BODY: Record<string, string> = {
  mine: "The first enemy piece (never a king) to step on this mine is destroyed.",
  sinkhole: "The first enemy piece (never a king) to step here plunges out of the game.",
  trapdoor: "An enemy piece (never a king) landing here is sprung back toward home and stunned.",
  whoopee: "The first enemy piece (never a king) to sit here makes a rude noise and must keep moving.",
  landlord: "An enemy piece (never a king) ending its move here owes rent: stuck for a turn.",
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
  // The public buff state both surfaces already hold (game.buffs). Used only
  // to derive Duelist-style piece-bound buff markers: a small corner sigil on
  // any piece carrying an active bound buff that draws no CardFx motif, with
  // the full card explanation surfaced through the hover/focus popover.
  // Optional and null-safe: absent (nerf mode, history review) simply paints
  // no markers.
  buffs?: BuffMatchState | null;
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
  switch (SIGNATURES[id]?.sound) {
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
  pickSquares,
  onPickSquare,
  signatureCard,
  buffs,
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
  // The player's "hide effects/animations" switch (the small eye button in
  // the game rails). Decorative layers stand down; functional reads stay.
  const fxHiddenPref = useFxHidden();
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
    const el = cropRef.current;
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.remove("fx-board-shake");
      void el.offsetWidth;
      el.classList.add("fx-board-shake");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const zoneSigRef = useRef<
    Map<number, { sig: string; order: number; role: "lead" | "target"; key: number }>
  >(new Map());
  // --- Cast spectacles: EVERY played card gets a board-level themed read ----
  // The category fallback layer (see CastSpectacle in BoardEffects): one
  // overlay per card play, themed by the card's category and scaled by its
  // tier. Runs for bespoke-signature cards too (their square art plays on
  // top); its per-play sound only fires for cards with NO bespoke entry so
  // nothing double-voices. Marquee-tier casts (8+) also thump the whole board
  // crop with a transform-only shake, skipped under prefers-reduced-motion.
  const cropRef = useRef<HTMLDivElement | null>(null);
  const [cast, setCast] = useState<{
    key: number;
    id: string;
    category: BuffCategory;
    tier: number;
  } | null>(null);
  const castSeenKeyRef = useRef(0);
  // Play keys whose lead art already rendered through the piece-diff path;
  // the cast-level generated lead only fires for diff-less plays (clock,
  // draft, info cards...) so a card never leads twice.
  const castLeadSuppressKeyRef = useRef(0);
  useEffect(() => {
    if (!signatureCard || signatureCard.key <= castSeenKeyRef.current) return;
    castSeenKeyRef.current = signatureCard.key;
    const def = BUFF_BY_ID[signatureCard.id];
    if (!def) return;
    setCast({ key: signatureCard.key, id: signatureCard.id, category: def.category, tier: def.tier });
    const intensity = castIntensity(def.tier);
    if (!SIGNATURES[signatureCard.id] && intensity !== "sleek") {
      playCastVoice(def.category, intensity === "marquee");
    }
    if (intensity === "marquee") {
      const el = cropRef.current;
      if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.classList.remove("fx-board-shake");
        // Force a reflow so removing and re-adding the class restarts the
        // animation even when two marquee casts land back to back.
        void el.offsetWidth;
        el.classList.add("fx-board-shake");
      }
    }
  }, [signatureCard]);

  // Diff against the previous position during render (reference equality
  // guards against re-runs) so animated squares can be tagged in this pass.
  if (prevPiecesRef.current && prevPiecesRef.current !== board.pieces) {
    const { anims, movedFrom } = computeAnims(
      prevPiecesRef.current,
      board.pieces,
      orientation,
      dropSkipRef.current,
    );
    animsRef.current = anims;
    const activeSig =
      signatureCard && signatureCard.key > sigSeenKeyRef.current && resolveSignature(signatureCard.id)
        ? signatureCard.id
        : null;
    // A diff claimed this play key: the cast-level generated lead stands down
    // (the diff path renders the lead on its own lead square).
    if (activeSig && signatureCard) castLeadSuppressKeyRef.current = signatureCard.key;
    if (signatureCard) sigSeenKeyRef.current = signatureCard.key;
    fxRef.current = computeBoardFx(
      prevPiecesRef.current,
      board.pieces,
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
            const p = prevPiecesRef.current?.[h.sq];
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
            travel: spec.travel,
            impact: spec.impact,
            aftermath: spec.aftermath,
            shake: spec.shake,
          });
        }
      }
    }
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
    if (sigId && SIGNATURES[sigId]) playSignature(sigId, Math.max(1, sigCount));
    if (detonate) playExplosion();
    if (morph) playTransform();
    if (summon) playSummon();
  }, [board.pieces]);

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
  if (signatureCard && signatureCard.key > zoneSigSeenKeyRef.current) {
    zoneSigSeenKeyRef.current = signatureCard.key;
    const cfg = SIGNATURES[signatureCard.id];
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
            travel: spec.travel,
            impact: spec.impact,
            aftermath: spec.aftermath,
            shake: spec.shake,
          });
        }
      }
    }
    // Replace (even when empty: a removal signature or a card with no zone
    // source clears here) so the previous zone signature's overlays drop the
    // instant the next card is played.
    zoneSigRef.current = marks;
  }

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
    // Touch has no right-click, which is how desktop cancels a queued premove
    // (handleSquareContextMenu). On mobile, a double-tap on the same empty
    // square cancels the whole premove queue. Only a "pure" dead tap counts (one
    // that did not just deselect a piece), so retrying a mis-tapped premove
    // never nukes the queue. We only reach here on a tap that played no move and
    // grabbed no piece, so this can never disturb tap-to-move or premove making.
    if (e.pointerType === "touch" && premoves && premoves.length > 0 && onCancelPremove) {
      const now = e.timeStamp || Date.now();
      const prev = lastTapRef.current;
      if (!hadSelection && prev && prev.sq === sq && now - prev.t < 320) {
        lastTapRef.current = null;
        onCancelPremove();
        return;
      }
      lastTapRef.current = hadSelection ? null : { sq, t: now };
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
        title: "Sanctuary",
        tone: "buff",
        status,
        body: "This piece cannot be captured while the shield holds. Kings are never shielded.",
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
                  <div className="absolute inset-0 bg-red-900/45 pointer-events-none" />
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
                    <span className="absolute top-0.5 right-0.5 z-10 leading-none pointer-events-none drop-shadow sq-freeze-flake">
                      <FreezeGlyph kind={freezeSkinOf(frozenSkins[sq]).glyph} />
                    </span>
                  </>
                )}
                {walnutSquares.has(sq) && (
                  /* Hexed into a walnut: a heavy nut that can only shuffle one
                     square. It sinks into the board (sq-walnut-sink) and a big
                     squirrel scurries in once to bury it (one-shot on mount;
                     hidden for reduced-motion). */
                  <>
                    <div className="absolute inset-0 bg-amber-700/20 pointer-events-none sq-walnut" />
                    <span
                      aria-hidden
                      className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 leading-none pointer-events-none walnut-squirrel"
                    >
                      <SquirrelGlyph size={28} />
                    </span>
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
                  /* Empowered-piece shine: a soft breathing halo + tier ring
                     under a piece carrying a self-grant (empower/ward/rally).
                     Rides the same motifShown gate as the badge, so frozen /
                     walnut constraints silence it and it never paints where
                     the motif itself is suppressed. Rendered before the piece
                     div, so the piece always stays on top. */
                  <EmpowerShine tier={motifMark.tier} />
                )}
                {!fxHiddenPref && motifShown && motifMark && (
                  /* Card-fx motif badge, tinted by the card's tier and
                     stamped with its category glyph. Keyed by motif + card
                     name so re-renders never replay the entrance; only a
                     genuinely different card (or motif) remounts it. */
                  <MotifBadge
                    key={`motif-${motifMark.motif}-${motifMark.name}`}
                    motif={motifMark.motif}
                    tier={motifMark.tier}
                    category={motifMark.category}
                    moveAs={motifMark.moveAs}
                    name={motifMark.name}
                    cardId={motifMark.id}
                    cardIcon={motifMark.icon}
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
                    className="absolute left-[3%] top-[3%] z-30 h-[26%] w-[26%] rounded-full p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
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
                    if (!sigCfg) return <DetonationBurst key={`fx-${boardFx.key}`} />;
                    const delay = (boardFx.sigOrder ?? 0) * sigCfg.staggerMs;
                    // Generated configs carry their own renderer; bespoke ones
                    // go through the classic SignatureOverlay switch.
                    return isGenConfig(sigCfg) ? (
                      <GenBurst
                        key={`fx-${boardFx.key}`}
                        config={sigCfg}
                        role={boardFx.sigRole ?? "target"}
                        delayMs={delay}
                      />
                    ) : (
                      <SignatureOverlay
                        key={`fx-${boardFx.key}`}
                        visual={sigCfg.visual}
                        role={boardFx.sigRole ?? "target"}
                        delayMs={delay}
                      />
                    );
                  })()}
                {!fxHiddenPref && zoneSig && SIGNATURES[zoneSig.sig] && (
                  /* Zone-sourced signature (source !== "removal"): the same
                     SignatureOverlay art, but staged over a piece that STAYS on
                     the board and sourced from the fx-effect zone the card
                     names, not the removal diff. Keyed by the play key so it
                     mounts and plays exactly once per play. */
                  <SignatureOverlay
                    key={`zsig-${zoneSig.key}`}
                    visual={SIGNATURES[zoneSig.sig].visual}
                    role={zoneSig.role}
                    delayMs={zoneSig.order * SIGNATURES[zoneSig.sig].staggerMs}
                  />
                )}
                {isForced && !isDragging && (
                  <div className="absolute inset-0 pointer-events-none rounded-sm ring-2 ring-inset ring-gold-leaf/80 shadow-[inset_0_0_24px_-4px_rgba(230,191,106,0.55)] animate-flicker" />
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
        {!fxHiddenPref && cast && (
          <CastSpectacle key={`cast-${cast.key}`} category={cast.category} tier={cast.tier} />
        )}
        {/* Diff-less generated lead: a played card that removes nothing and
            leaves no zone (clock steals, draft tricks, info peeks...) still
            gets its unique board-wide flourish here. Suppressed whenever the
            piece-diff path already led this play key. */}
        {!fxHiddenPref &&
          cast &&
          cast.key !== castLeadSuppressKeyRef.current &&
          (() => {
            const cfg = resolveSignature(cast.id);
            if (!cfg || !isGenConfig(cfg) || !cfg.hasLead) return null;
            return (
              <div
                key={`genlead-${cast.key}`}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30"
              >
                <GenBurst config={cfg} role="lead" delayMs={0} />
              </div>
            );
          })()}

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
          <Piece type={draggedPiece.type} color={draggedPiece.color} size="100%" />
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
              className="plate gilt flex flex-col items-center gap-2 p-4"
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
                    className="w-16 h-16 rounded-sm bg-ink-800 hover:bg-ink-700 flex items-center justify-center border border-gold/30"
                  >
                    <Piece type={m.promotion!} color={m.color} size={56} />
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
