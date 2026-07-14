// Tier 1-4 plugin signatures — the "basic" band: every card not already
// covered by the core SIGNATURES table or the god / great / funny plugin sets
// gets a UNIQUE, restrained, name-matched play. See sigPlugins.tsx for the
// registry contract. Self-contained: own SVG, own CSS (basicPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Design brief (owner: "animations for all the tiers 1 to 8, still unique
// animations, maybe they don't need to be as extravagant" — later hyped:
// "you don't need to make the tier 1-4 animations so small, you can hype it
// up a bit more"): ONE clean beat, ~1.2-1.6s, NO shockwaves, NO
// board-darkening washes, NO colossal figures. Each play is a centered
// emblem scene (~44% of the crop; tier-4 bold ~49%) carrying one modest
// built-in flourish (see EmblemFlourish), plus a compact per-square target
// hit for zone-fed cards.
//
// SOLE EXCEPTION: ww_high_ground is a TIER 7 card that lives in this module,
// so its play is a bespoke FULL-BOARD TAKEOVER (HighGroundTakeover, below the
// templates) — board-wide tinted wash, terraced plateaus rising rank by rank,
// a colossal gold/crimson summit and twin shockwaves past the board edges.
// The basic-band restraints above deliberately do NOT apply to it.
//
// UNIQUENESS RECIPE: twenty micro-templates, each parameterised by
// { palette, glyph } — and the glyph is the card's OWN globally unique face
// icon (cardFaceIcon assigns every shipped card a distinct lucide face), so
// template + palette + icon is automatically unique per card. Templates are
// assigned by mechanic family; palettes rotate within each template so
// neighbours differ. Tier 4 entries take the template's fuller "bold" cut.
//
//   SigilRing    — a warding ring settles and its ticks kindle (protections)
//   RuneStamp    — a jagged curse rune stamps down and drips (muzzle hexes)
//   ChainLash    — a chain whips across and pulls taut (jails / anchors / caps)
//   ColdSnap     — frost spokes reach out, icy motes pop (freezes)
//   StoneShell   — two granite half-shells slam shut (walnuts / petrify)
//   GlintArc     — a glint trail arcs over the emblem (slider / step grants)
//   HoofSpring   — a spring coils and launches, dust kicks (leaps / shoves)
//   PennantRaise — a pole shoots up, its pennant snaps out (musters / marches)
//   ScrollSnap   — an edict unrolls, is read, snaps shut (draft denial)
//   CardFlick    — a card flips face-up off the deck (own draft tricks)
//   EyeBlink     — an eye opens, looks, blinks shut (info reveals)
//   KeyTurn      — a key turns in a lock plate (castling bans / sealed gates)
//   LanternLift  — a grave-lantern lifts, motes rise (revives / returns)
//   SatchelDrop  — a satchel plops down, flap pops (pocket grants / items)
//   CogTick      — a gear ring ticks a quarter turn (clock / undo / skips)
//   BellToll     — a small bell swings twice (nerf-relief cards)
//   LeafSpin     — leaves orbit a growing sprout (nature / fae / fruit)
//   PrismFlash   — a prism drops and fans light (teleports / swaps / warps)
//   BannerMuster — a standard drops in and unfurls (summons / deployments)
//   InkSplash    — an ink blot blooms over the mark (conversions / steals)
//
// The CARD -> TEMPLATE / PALETTE table lives in the PLAYS registry at the
// bottom of this file, one entry per still-uncovered card.

import "./basicPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { cardFaceIcon } from "@/lib/cardIcon";
import type { SigPlugin } from "./sigPlugins";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  Icon: LucideIcon | undefined;
  bold: boolean;
  lead: boolean;
  delayMs: number;
}

/** hex "#rrggbb" -> rgba() at the given alpha (glow fills, gradients). */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The oversized-clipped stage every plugin lead uses (the overlay mounts
 * inside ONE square; this canvas is ~14 squares wide — the board is the
 * central ~57%). Same geometry as god/great/funny so all four sets stage
 * their leads identically. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/* --- Built-in hype flourish ---------------------------------------------------
   Owner pass ("you don't need to make the tier 1-4 animations so small — you
   can hype it up a bit more"): every emblem scene now carries ONE modest
   flourish, chosen by its entrance class so it matches the template's motion —
   a ring pulse for settlers/stampers, a shard scatter for droppers/risers, a
   shine sweep for unfurlers/flickers. Neutral warm-white so it reads on every
   palette; still NO shockwave and NO wash (basic-band rules hold). */
type FlourishKind = "pulse" | "shards" | "sweep";
const FLOURISH_BY_CLS: Record<string, FlourishKind> = {
  "bsp-settle": "pulse",
  "bsp-stamp": "pulse",
  "bsp-facein": "pulse",
  "bsp-shudder": "shards",
  "bsp-blot": "pulse",
  "bsp-spoke": "pulse",
  "bsp-turn": "pulse",
  "bsp-drop": "shards",
  "bsp-rise": "shards",
  "bsp-plop": "shards",
  "bsp-grow": "shards",
  "bsp-swing": "shards",
  "bsp-lift": "shards",
  "bsp-unfurl": "sweep",
  "bsp-scroll": "sweep",
  "bsp-taut": "sweep",
  "bsp-flip": "sweep",
  "bsp-blink": "sweep",
};
const FLOURISH_SHARDS = [
  { dx: "170%", dy: "-150%", rot: "140deg", d: 0 },
  { dx: "-165%", dy: "-125%", rot: "-150deg", d: 30 },
  { dx: "150%", dy: "140%", rot: "120deg", d: 60 },
  { dx: "-145%", dy: "155%", rot: "-130deg", d: 90 },
];
const SHINE = "rgba(255,250,235,0.8)";

function EmblemFlourish({ cls, delayMs }: { cls: string; delayMs: number }) {
  const kind = FLOURISH_BY_CLS[cls] ?? "pulse";
  if (kind === "sweep") {
    return (
      <span
        className="bsp-sweep absolute block"
        style={{
          left: "8%",
          top: "10%",
          width: "30%",
          height: "80%",
          background: `linear-gradient(90deg, transparent, ${SHINE}, transparent)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
    );
  }
  if (kind === "shards") {
    return (
      <>
        {FLOURISH_SHARDS.map((v, i) => (
          <span
            key={i}
            className="bsp-shard absolute block"
            style={
              {
                left: "44%",
                top: "44%",
                width: "12%",
                height: "12%",
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": v.rot,
                animationDelay: `${delayMs + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={SHINE} />
            </svg>
          </span>
        ))}
      </>
    );
  }
  return (
    <span
      className="bsp-ring absolute block rounded-full"
      style={{ left: "-9%", top: "-9%", width: "118%", height: "118%", border: `2px solid ${SHINE}`, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** The centered emblem box: the whole scene lives inside this. Hyped-up scale
 * (owner size pass: "animations are too small in general"): ~25% of the
 * canvas base / 28% bold — the crop is the canvas's central ~57%, so that
 * reads as ~44% of the visible crop, ~49% for tier-4 bold cuts (was 22/26 =
 * ~38%/~45%). `cls` picks the entrance keyframe and also selects the scene's
 * built-in flourish. */
function Emblem({
  bold,
  cls,
  delayMs,
  children,
  style,
}: {
  bold: boolean;
  cls: string;
  delayMs: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const s = bold ? 28 : 25;
  return (
    <span
      className={`${cls} absolute block`}
      style={{
        left: `${50 - s / 2}%`,
        top: `${47 - s / 2}%`,
        width: `${s}%`,
        height: `${s}%`,
        animationDelay: `${delayMs}ms`,
        ...style,
      }}
    >
      {children}
      <EmblemFlourish cls={cls} delayMs={delayMs + 380} />
    </span>
  );
}

/** The card's own face icon (globally unique per card), drawn in the palette.
 * Position/size in % of the parent box. */
function Face({
  Icon,
  color,
  delayMs,
  left = 36,
  top = 36,
  size = 28,
  strokeWidth = 1.7,
}: {
  Icon: LucideIcon | undefined;
  color: string;
  delayMs: number;
  left?: number;
  top?: number;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <span
      className="bsp-facein absolute block"
      style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%`, animationDelay: `${delayMs}ms` }}
    >
      {Icon ? (
        <Icon className="block h-full w-full" color={color} strokeWidth={strokeWidth} aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={color} />
        </svg>
      )}
    </span>
  );
}

/* --- Compact per-square target hit ------------------------------------------
   Zone-fed cards mount one overlay per affected square, so this must stay
   square-local and cheap: an under-glow, the card's glyph popping, a small
   ring, and three template-flavoured shards. */

type HitAccent = "spark" | "frost" | "stone" | "leaf" | "mote" | "link";

const HIT_SHARDS = [
  { dx: "150%", dy: "-130%", rot: "130deg", d: 0 },
  { dx: "-145%", dy: "-105%", rot: "-150deg", d: 20 },
  { dx: "25%", dy: "170%", rot: "80deg", d: 40 },
];

function shardShape(accent: HitAccent, fill: string, stroke: string): ReactNode {
  switch (accent) {
    case "frost":
      return <path d="M5 0.6 V9.4 M1.2 2.8 L8.8 7.2 M8.8 2.8 L1.2 7.2" fill="none" stroke={fill} strokeWidth="1.1" strokeLinecap="round" />;
    case "stone":
      return <path d="M2 3.4 L5.4 1.2 L8.6 3.8 L7.4 8 L3 8.4 Z" fill={fill} stroke={stroke} strokeWidth="0.7" {...SJ} />;
    case "leaf":
      return <path d="M5 0.8 C8.4 2.6 8.8 6.4 5 9.2 C1.2 6.4 1.6 2.6 5 0.8 Z" fill={fill} stroke={stroke} strokeWidth="0.6" {...SJ} />;
    case "mote":
      return <circle cx="5" cy="5" r="3.4" fill={fill} stroke={stroke} strokeWidth="0.6" />;
    case "link":
      return <rect x="1.6" y="3" width="6.8" height="4" rx="2" fill="none" stroke={fill} strokeWidth="1.2" />;
    default:
      return <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={fill} stroke={stroke} strokeWidth="0.7" {...SJ} />;
  }
}

function TargetHit({
  palette,
  Icon,
  delayMs,
  accent,
}: {
  palette: Palette;
  Icon: LucideIcon | undefined;
  delayMs: number;
  accent: HitAccent;
}) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="bsp-flash absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.4), animationDelay: `${delayMs}ms` }}
      />
      <span
        className="bsp-pop absolute block"
        style={{ left: "22%", top: "20%", width: "56%", height: "56%", animationDelay: `${delayMs + 60}ms` }}
      >
        {Icon ? (
          <Icon className="block h-full w-full" color={p1} strokeWidth={2} aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={p1} />
          </svg>
        )}
      </span>
      <span
        className="bsp-ring absolute block rounded-full"
        style={{ left: "11%", top: "11%", width: "78%", height: "78%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: `${delayMs + 120}ms` }}
      />
      {HIT_SHARDS.map((v, i) => (
        <span
          key={i}
          className="bsp-shard absolute block"
          style={
            {
              left: "40%",
              top: "40%",
              width: "20%",
              height: "20%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 100 + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            {shardShape(accent, i === 1 ? p0 : p1, p2)}
          </svg>
        </span>
      ))}
    </span>
  );
}

/* =============================================================================
   Template 1: SigilRing — a warding ring settles over the centre, its compass
   ticks kindle one by one, and the card's face glows at its heart.
   (protections, wards, uncapturable grants)
   ========================================================================== */
const RING_TICKS = [
  { x: 20, y: 2.4, r: 0 },
  { x: 37.6, y: 20, r: 90 },
  { x: 20, y: 37.6, r: 180 },
  { x: 2.4, y: 20, r: 270 },
];
function SigilRing({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-settle" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16.4" fill={tint(p0, 0.1)} stroke={tint(p1, 0.9)} strokeWidth="1.3" />
          <circle cx="20" cy="20" r="12.6" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.6" strokeDasharray="2.4 1.7" />
        </svg>
        {RING_TICKS.map((t, i) => (
          <span
            key={i}
            className="bsp-glint absolute block"
            style={{ left: `${(t.x / 40) * 100 - 5}%`, top: `${(t.y / 40) * 100 - 5}%`, width: "10%", height: "10%", animationDelay: `${delayMs + 320 + i * 90}ms` }}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill={p1} />
            </svg>
          </span>
        ))}
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={34} top={34} size={32} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 2: RuneStamp — a jagged curse rune stamps down over the mark and
   drips; the card's face is scorched into the tile. (muzzle / soft hexes)
   ========================================================================== */
const RUNE_DRIPS = [
  { l: 30, dx: "-30%", dy: "220%", d: 0 },
  { l: 52, dx: "10%", dy: "260%", d: 90 },
  { l: 68, dx: "35%", dy: "200%", d: 160 },
];
function RuneStamp({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-stamp" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <path d="M20 2 L34 9 L37 24 L27 37 L13 37 L3 24 L6 9 Z" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="1.4" {...SJ} />
          <path d="M20 6.5 L30.5 11.7 L32.8 23 L25 32.8 L15 32.8 L7.2 23 L9.5 11.7 Z" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.7" strokeDasharray="3 2" />
        </svg>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 260} left={34} top={33} size={32} />
        {RUNE_DRIPS.map((v, i) => (
          <span
            key={i}
            className="bsp-drift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: "86%",
                width: "6%",
                height: "8%",
                background: tint(p0, 0.85),
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": "0deg",
                animationDelay: `${delayMs + 380 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 3: ChainLash — a chain whips across the emblem and pulls taut
   around the card's face; a shackle ring locks. (jails / anchors / slide caps)
   ========================================================================== */
function ChainLash({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-drop" delayMs={delayMs}>
        <span className="bsp-taut absolute block" style={{ left: "-6%", top: "40%", width: "112%", height: "20%", animationDelay: `${delayMs + 180}ms` }}>
          <svg viewBox="0 0 56 10" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={1.5 + i * 8} y={2.6} width={6.4} height={4.8} rx={2.4} fill="none" stroke={i % 2 ? p0 : p1} strokeWidth="1.2" />
            ))}
          </svg>
        </span>
        <span className="bsp-settle absolute block" style={{ left: "26%", top: "22%", width: "48%", height: "56%", animationDelay: `${delayMs + 340}ms` }}>
          <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
            <path d="M6 9 V6.4 a4 4 0 0 1 8 0 V9" fill="none" stroke={p1} strokeWidth="1.5" strokeLinecap="round" />
            <rect x="3.4" y="9" width="13.2" height="11.4" rx="2.4" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="1.1" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 480} left={38} top={45} size={24} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 4: ColdSnap — six frost spokes reach out of the centre, icy motes
   pop around the rim, and the card's face frosts over. (freezes)
   ========================================================================== */
const COLD_MOTES = [
  { l: 16, t: 20, d: 0 },
  { l: 76, t: 16, d: 70 },
  { l: 82, t: 62, d: 140 },
  { l: 12, t: 66, d: 210 },
];
function ColdSnap({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="frost" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-spoke" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 20 20)`}>
              <path d="M20 3 V37 M20 8 L16.6 4.8 M20 8 L23.4 4.8 M20 32 L16.6 35.2 M20 32 L23.4 35.2" fill="none" stroke={r === 0 ? p1 : tint(p1, 0.75)} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ))}
          <circle cx="20" cy="20" r="7.6" fill={tint(p2, 0.5)} stroke={tint(p0, 0.9)} strokeWidth="0.9" />
        </svg>
        <Face Icon={Icon} color={p0} delayMs={delayMs + 300} left={36} top={35} size={28} />
        {COLD_MOTES.map((v, i) => (
          <span key={i} className="bsp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "9%", height: "9%", animationDelay: `${delayMs + 360 + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 V9.2 M0.8 5 H9.2 M2 2 L8 8 M8 2 L2 8" fill="none" stroke={tint(p0, 0.9)} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 5: StoneShell — two granite half-shells slam shut over the card's
   face and shudder; chips fly off the seam. (walnuts / petrify)
   ========================================================================== */
const STONE_CHIPS = [
  { dx: "170%", dy: "-150%", rot: "160deg", d: 0 },
  { dx: "-160%", dy: "-120%", rot: "-140deg", d: 30 },
  { dx: "60%", dy: "-200%", rot: "80deg", d: 60 },
];
function StoneShell({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="stone" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-shudder" delayMs={delayMs + 420}>
        <Face Icon={Icon} color={p1} delayMs={delayMs} left={32} top={30} size={36} />
        <span className="bsp-close-l absolute block" style={{ left: "8%", top: "12%", width: "42%", height: "76%", animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 20 36" className="block h-full w-full" aria-hidden="true">
            <path d="M19.5 1 C6 4 1 12 1 18 C1 24 6 32 19.5 35 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <path d="M13 8 C9 11 7.4 14.6 7.4 18" fill="none" stroke={tint(p1, 0.5)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bsp-close-r absolute block" style={{ left: "50%", top: "12%", width: "42%", height: "76%", animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 20 36" className="block h-full w-full" aria-hidden="true">
            <path d="M0.5 1 C14 4 19 12 19 18 C19 24 14 32 0.5 35 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <path d="M7 8 C11 11 12.6 14.6 12.6 18" fill="none" stroke={tint(p1, 0.5)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        {STONE_CHIPS.map((v, i) => (
          <span
            key={i}
            className="bsp-shard absolute block"
            style={
              {
                left: "46%",
                top: "20%",
                width: "9%",
                height: "9%",
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": v.rot,
                animationDelay: `${delayMs + 460 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 3.4 L5.4 1.2 L8.6 3.8 L7.4 8 L3 8.4 Z" fill={p2} stroke={p0} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 6: GlintArc — a trail of glints arcs over the emblem and the card's
   face lights up where it lands. (slider / step movement grants)
   ========================================================================== */
const ARC_GLINTS = [
  { l: 4, t: 62, s: 8, d: 0 },
  { l: 20, t: 34, s: 10, d: 90 },
  { l: 42, t: 18, s: 12, d: 180 },
  { l: 66, t: 30, s: 10, d: 270 },
  { l: 82, t: 54, s: 9, d: 360 },
];
function GlintArc({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <path d="M3 27 C10 12 30 12 37 25" fill="none" stroke={tint(p2, 0.55)} strokeWidth="1" strokeDasharray="2.6 2" strokeLinecap="round" />
        </svg>
        {ARC_GLINTS.map((v, i) => (
          <span key={i} className="bsp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s}%`, animationDelay: `${delayMs + 120 + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.3 3.7 L9.4 5 L6.3 6.3 L5 9.4 L3.7 6.3 L0.6 5 L3.7 3.7 Z" fill={i === 2 ? p0 : p1} />
            </svg>
          </span>
        ))}
        <Face Icon={Icon} color={p1} delayMs={delayMs + 480} left={35} top={48} size={30} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 7: HoofSpring — a spring coils down and launches; the card's face
   vaults off it while dust kicks below. (leaps / bounces / shoves)
   ========================================================================== */
const DUST_PUFFS = [
  { l: 30, dx: "-90%", dy: "30%", d: 0 },
  { l: 52, dx: "20%", dy: "60%", d: 60 },
  { l: 66, dx: "100%", dy: "20%", d: 120 },
];
function HoofSpring({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-rise" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "30%", top: "52%", width: "40%", height: "40%", animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M3 18.6 H17 M4 15.4 H16 M5 12.2 H15 M6 9 H14" fill="none" stroke={p0} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6 5.8 H14" fill="none" stroke={p1} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bsp-lift absolute block" style={{ left: "28%", top: "2%", width: "44%", height: "44%", animationDelay: `${delayMs + 340}ms` }}>
          {Icon ? (
            <Icon className="block h-full w-full" color={p1} strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={p1} />
            </svg>
          )}
        </span>
        {DUST_PUFFS.map((v, i) => (
          <span
            key={i}
            className="bsp-drift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: "84%",
                width: "8%",
                height: "6%",
                background: tint(p2, 0.7),
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": "0deg",
                animationDelay: `${delayMs + 380 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 8: PennantRaise — a pole shoots up and its pennant snaps out with
   the card's face on the cloth; two confetti sparks pop. (musters / marches)
   ========================================================================== */
function PennantRaise({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "24%", top: "4%", width: "7%", height: "92%", animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 4 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1.1" y="1.5" width="1.8" height="38" rx="0.9" fill={p2} />
            <circle cx="2" cy="1.6" r="1.5" fill={p1} />
          </svg>
        </span>
        <span className="bsp-unfurl absolute block" style={{ left: "31%", top: "10%", width: "62%", height: "38%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 30 16" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.6 0.8 H29 L22.5 8 L29 15.2 H0.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 420} left={37} top={17} size={22} strokeWidth={2} />
        {[0, 1].map((i) => (
          <span key={i} className="bsp-glint absolute block" style={{ left: i ? "74%" : "10%", top: i ? "56%" : "48%", width: "9%", height: "9%", animationDelay: `${delayMs + 520 + i * 110}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 9: ScrollSnap — a sealed edict unrolls, its terms flash, and it
   snaps shut again. (draft denial / orders served on the opponent)
   ========================================================================== */
function ScrollSnap({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-scroll absolute block" style={{ left: "16%", top: "6%", width: "68%", height: "82%", animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 28 34" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1.4" y="3.4" width="25.2" height="27.4" rx="2" fill={tint(p0, 0.96)} stroke={p2} strokeWidth="0.9" />
            <rect x="0.6" y="0.8" width="26.8" height="3.6" rx="1.8" fill={p2} />
            <rect x="0.6" y="29.6" width="26.8" height="3.6" rx="1.8" fill={p2} />
            <path d="M5 10 H23 M5 14 H23 M5 18 H17" fill="none" stroke={tint(p1, 0.75)} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 340} left={36} top={52} size={26} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 10: CardFlick — a card flips face-up off a small deck, wearing the
   card's own face; a glint pops at its corner. (your own draft tricks)
   ========================================================================== */
function CardFlick({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="absolute block" style={{ left: "18%", top: "26%", width: "38%", height: "58%" }}>
          <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
            <rect x="2.4" y="2.6" width="12" height="18.6" rx="2" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="0.8" transform="rotate(-7 8 12)" />
            <rect x="1.6" y="1.6" width="12" height="18.6" rx="2" fill={tint(p2, 0.98)} stroke={p0} strokeWidth="0.8" />
            <path d="M4.4 6 L11 16.4 M11 6 L4.4 16.4" stroke={tint(p1, 0.35)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bsp-flip absolute block" style={{ left: "44%", top: "14%", width: "40%", height: "64%", animationDelay: `${delayMs + 220}ms` }}>
          <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="14" height="22" rx="2.2" fill={tint(p0, 0.97)} stroke={p2} strokeWidth="0.9" />
          </svg>
          <Face Icon={Icon} color={p1} delayMs={delayMs + 420} left={22} top={26} size={54} strokeWidth={2} />
        </span>
        <span className="bsp-glint absolute block" style={{ left: "80%", top: "8%", width: "11%", height: "11%", animationDelay: `${delayMs + 560}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L6.3 3.7 L9.4 5 L6.3 6.3 L5 9.4 L3.7 6.3 L0.6 5 L3.7 3.7 Z" fill={p1} />
          </svg>
        </span>
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 11: EyeBlink — an almond eye opens, its iris ringed in the palette
   with the card's face as the pupil-glint, then blinks shut. (info reveals)
   ========================================================================== */
function EyeBlink({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-blink" delayMs={delayMs} style={{ transformOrigin: "50% 50%" }}>
        <svg viewBox="0 0 40 24" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 12 C10 2.5 30 2.5 38 12 C30 21.5 10 21.5 2 12 Z" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="1.1" {...SJ} />
          <circle cx="20" cy="12" r="7.6" fill={tint(p0, 0.35)} stroke={p1} strokeWidth="1.1" />
          <circle cx="20" cy="12" r="3" fill={p2} />
        </svg>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 260} left={41} top={34} size={18} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 12: KeyTurn — a heavy key turns a hard quarter-turn in a lock
   plate stamped with the card's face. (castling bans / sealed gates / locks)
   ========================================================================== */
function KeyTurn({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-drop" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <rect x="6" y="6" width="28" height="28" rx="4" fill={tint(p2, 0.92)} stroke={p0} strokeWidth="1.2" />
          <circle cx="20" cy="20" r="8.4" fill="none" stroke={tint(p1, 0.6)} strokeWidth="0.8" strokeDasharray="2 1.6" />
        </svg>
        <span className="bsp-turn absolute block" style={{ left: "26%", top: "26%", width: "48%", height: "48%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="6.4" r="3.4" fill="none" stroke={p1} strokeWidth="1.6" />
            <path d="M10 9.8 V17 M10 14 H13 M10 17 H12" fill="none" stroke={p1} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 640} left={64} top={64} size={22} strokeWidth={2} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 13: LanternLift — a grave-lantern lifts away, its glass glowing
   with the card's face while motes rise around it. (revives / returns)
   ========================================================================== */
const LANTERN_MOTES = [
  { l: 16, t: 66, dx: "30%", dy: "-240%", d: 0 },
  { l: 76, t: 58, dx: "-20%", dy: "-260%", d: 120 },
  { l: 48, t: 78, dx: "10%", dy: "-220%", d: 240 },
];
function LanternLift({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-lift" delayMs={delayMs}>
        <span className="bsp-breathe absolute block rounded-full" style={{ left: "22%", top: "16%", width: "56%", height: "60%", background: tint(p1, 0.3), animationDelay: `${delayMs + 200}ms` }} />
        <svg viewBox="0 0 24 34" className="absolute block h-full w-full" aria-hidden="true">
          <path d="M9 3.4 H15 M12 1 V3.4" fill="none" stroke={p2} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 6 H17 L18.6 22 H5.4 Z" fill={tint(p2, 0.35)} stroke={p0} strokeWidth="1.1" {...SJ} />
          <path d="M6 25 H18" fill="none" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 300} left={34} top={24} size={32} />
        {LANTERN_MOTES.map((v, i) => (
          <span
            key={i}
            className="bsp-drift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: `${v.t}%`,
                width: "6%",
                height: "6%",
                background: tint(p1, 0.85),
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": "0deg",
                animationDelay: `${delayMs + 320 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 14: SatchelDrop — a field satchel plops down, its flap pops open
   and the card's face springs out. (pocket grants / carried items)
   ========================================================================== */
function SatchelDrop({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-plop" delayMs={delayMs}>
        <svg viewBox="0 0 32 30" className="absolute block h-full w-full" aria-hidden="true">
          <path d="M4 12 H28 V25 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
          <path d="M4 12 C4 7 9 4 16 4 C23 4 28 7 28 12 L26 15 H6 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
          <rect x="13.4" y="13" width="5.2" height="4.6" rx="1.2" fill={p1} />
        </svg>
        <span className="bsp-lift absolute block" style={{ left: "32%", top: "-14%", width: "36%", height: "36%", animationDelay: `${delayMs + 460}ms` }}>
          {Icon ? (
            <Icon className="block h-full w-full" color={p1} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={p1} />
            </svg>
          )}
        </span>
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 15: CogTick — a gear ring ticks a hard quarter turn against a
   smaller counter-gear; the card's face holds the hub. (clock / undo / skips)
   ========================================================================== */
function cogPath(cx: number, cy: number, r: number): string {
  // 8-tooth gear outline as a simple star-ish polygon.
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (Math.PI / 8) * i;
    pts.push(`${(cx + rr * Math.sin(a)).toFixed(2)} ${(cy - rr * Math.cos(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}
function CogTick({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-turn absolute block" style={{ left: "8%", top: "12%", width: "64%", height: "64%", animationDelay: `${delayMs + 120}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <path d={cogPath(20, 20, 17)} fill={tint(p2, 0.9)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <circle cx="20" cy="20" r="9" fill={tint(p0, 0.25)} stroke={tint(p1, 0.8)} strokeWidth="1" />
          </svg>
        </span>
        <span className="bsp-tickback absolute block" style={{ left: "58%", top: "56%", width: "36%", height: "36%", animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <path d={cogPath(20, 20, 16)} fill={tint(p0, 0.65)} stroke={p2} strokeWidth="1.4" {...SJ} />
            <circle cx="20" cy="20" r="5" fill={tint(p2, 0.8)} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={26} top={30} size={28} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 16: BellToll — a small chapel bell swings twice over the card's
   face; two soft ripples ride out from the mouth. (nerf-relief cards)
   ========================================================================== */
function BellToll({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-swing absolute block" style={{ left: "24%", top: "0%", width: "52%", height: "62%", animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 24 28" className="block h-full w-full" aria-hidden="true">
            <path d="M11 1.6 H13 V4 H11 Z" fill={p2} />
            <path d="M5 20 C5 10 7 4.6 12 4.6 C17 4.6 19 10 19 20 L21 23 H3 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="1.1" {...SJ} />
            <circle cx="12" cy="25.2" r="1.8" fill={p1} />
          </svg>
        </span>
        {[0, 1].map((i) => (
          <span
            key={i}
            className="bsp-ring absolute block rounded-full"
            style={{ left: "28%", top: "48%", width: "44%", height: "34%", border: `2px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 480 + i * 200}ms` }}
          />
        ))}
        <Face Icon={Icon} color={p1} delayMs={delayMs + 420} left={38} top={68} size={24} strokeWidth={2} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 17: LeafSpin — leaves orbit a sprout growing under the card's
   face. (nature / fae / roots / fruit)
   ========================================================================== */
const ORBIT_LEAVES = [0, 120, 240];
function LeafSpin({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="leaf" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "38%", top: "48%", width: "24%", height: "46%", animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 10 20" className="block h-full w-full" aria-hidden="true">
            <path d="M5 19 V6" fill="none" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M5 10 C2 9 1 6.6 1.6 4.4 C4 5 5.2 7 5 10 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            <path d="M5 13 C8 12 9 9.6 8.4 7.4 C6 8 4.8 10 5 13 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        <span className="bsp-orbit absolute block" style={{ left: "10%", top: "6%", width: "80%", height: "80%", animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            {ORBIT_LEAVES.map((r) => (
              <g key={r} transform={`rotate(${r} 20 20)`}>
                <path d="M20 2 C23 4.4 23.4 7.6 20 10 C16.6 7.6 17 4.4 20 2 Z" fill={r === 120 ? p0 : p1} stroke={p2} strokeWidth="0.5" {...SJ} />
              </g>
            ))}
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 420} left={36} top={16} size={28} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 18: PrismFlash — a prism drops in and fans three light beams; the
   card's face refracts out of the bright one. (teleports / swaps / warps)
   ========================================================================== */
const PRISM_BEAMS = [
  { top: 34, rot: -18, w: 46, d: 0 },
  { top: 44, rot: 0, w: 52, d: 90 },
  { top: 54, rot: 16, w: 44, d: 180 },
];
function PrismFlash({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-drop" delayMs={delayMs}>
        <span className="absolute block" style={{ left: "10%", top: "26%", width: "38%", height: "48%" }}>
          <svg viewBox="0 0 16 20" className="block h-full w-full" aria-hidden="true">
            <path d="M8 1.6 L15 18.4 H1 Z" fill={tint(p2, 0.55)} stroke={p0} strokeWidth="1" {...SJ} />
            <path d="M8 6 L11.6 16.4 H4.4 Z" fill="none" stroke={tint(p1, 0.6)} strokeWidth="0.7" />
          </svg>
        </span>
        {PRISM_BEAMS.map((b, i) => (
          <span
            key={i}
            className="bsp-beam absolute block"
            style={{
              left: "44%",
              top: `${b.top}%`,
              width: `${b.w}%`,
              height: "7%",
              background: `linear-gradient(90deg, ${tint(i === 1 ? p1 : p0, 0.9)}, ${tint(i === 1 ? p1 : p0, 0)})`,
              transform: `rotate(${b.rot}deg)`,
              borderRadius: "999px",
              animationDelay: `${delayMs + 300 + b.d}ms`,
            }}
          />
        ))}
        <Face Icon={Icon} color={p1} delayMs={delayMs + 520} left={62} top={30} size={28} />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 19: BannerMuster — a standard drops in, its cloth unfurls with the
   card's face as the device, and a dust poof marks the plant. (summons)
   ========================================================================== */
function BannerMuster({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-drop" delayMs={delayMs}>
        <svg viewBox="0 0 30 40" className="absolute block h-full w-full" aria-hidden="true">
          <rect x="13.9" y="2" width="2.2" height="36" rx="1.1" fill={p2} />
          <path d="M8 2.6 H22" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="bsp-grow absolute block" style={{ left: "28%", top: "9%", width: "44%", height: "58%", animationDelay: `${delayMs + 240}ms`, transformOrigin: "50% 0%" }}>
          <svg viewBox="0 0 14 24" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.8 0.8 H13.2 V19 L7 23.2 L0.8 19 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 440} left={37} top={22} size={26} strokeWidth={2} />
        <span
          className="bsp-flash absolute block rounded-full"
          style={{ left: "30%", top: "86%", width: "40%", height: "12%", background: tint(p2, 0.55), animationDelay: `${delayMs + 300}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Template 20: InkSplash — an ink blot blooms over the mark, droplets fly,
   and the card's face surfaces reversed-out of the ink. (conversions / steals)
   ========================================================================== */
const INK_DROPS = [
  { l: 12, t: 22, dx: "-120%", dy: "-90%", d: 0 },
  { l: 78, t: 16, dx: "110%", dy: "-120%", d: 60 },
  { l: 84, t: 62, dx: "130%", dy: "60%", d: 120 },
];
function InkSplash({ palette, Icon, bold, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage>
      <Emblem bold={bold} cls="bsp-blot" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="absolute block h-full w-full" aria-hidden="true">
          <path
            d="M20 3 C27 3 33 6 35.5 12 C38 18 36 26 30 31 C24 36 14 36.5 8.5 31.5 C3 26.5 2.5 17 6.5 11 C10 5.5 14 3 20 3 Z"
            fill={tint(p2, 0.92)}
            stroke={p0}
            strokeWidth="1"
            {...SJ}
          />
          <circle cx="33" cy="8" r="2" fill={tint(p2, 0.9)} />
          <circle cx="6.4" cy="30.6" r="1.6" fill={tint(p2, 0.85)} />
        </svg>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 280} left={33} top={32} size={34} />
        {INK_DROPS.map((v, i) => (
          <span
            key={i}
            className="bsp-drift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: `${v.t}%`,
                width: "6%",
                height: "6%",
                background: tint(p2, 0.9),
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": "0deg",
                animationDelay: `${delayMs + 180 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* =============================================================================
   Bespoke: HighGroundTakeover — ww_high_ground is TIER 7, the only card of
   that tier in this module, so it breaks the basic-band rules on purpose:
   a FULL-BOARD TAKEOVER. A gold-over-crimson wash rolls across the whole
   crop, terraced high-ground plateaus rise rank by rank into a ziggurat, a
   colossal summit (~32% of the canvas ≈ ~56% of the visible board) heaves up
   wearing a sunburst crown and a snapping war-pennant, flanking banners plant
   on the lower terraces, and TWIN shockwave rings sweep out past the board
   edges. Gold/crimson tier colours throughout; whole play ~2.1s. Per-square
   victims still get the compact TargetHit.
   ========================================================================== */

const HG_GOLD = "#ffd76a";
const HG_GOLD_DEEP = "#c9931d";
const HG_CRIMSON = "#c9314b";
const HG_CRIMSON_DEEP = "#5a1220";
const HG_SNOW = "#fff2c9";
const HG_PALETTE: Palette = [HG_GOLD, HG_SNOW, HG_CRIMSON];
const HG_DEF = BUFF_BY_ID["ww_high_ground"];
const HG_ICON = HG_DEF ? cardFaceIcon("ww_high_ground", HG_DEF.category, HG_DEF.icon) : undefined;

/** Terraced plateaus, board-spanning, rising rank by rank toward the summit
 * (positions in % of the 14x14 canvas; the visible board is ~22%..78%). */
const HG_TERRACES = [
  { l: 22, t: 67.5, w: 56, d: 0 },
  { l: 28, t: 58.5, w: 44, d: 120 },
  { l: 34, t: 49.5, w: 32, d: 240 },
  { l: 39, t: 40.5, w: 22, d: 360 },
];
const HG_FLAGS = [
  { l: 27, t: 47, d: 520 },
  { l: 68.5, t: 47, d: 640 },
];
const HG_GLINTS = [
  { l: 30, t: 30, s: 5, d: 0 },
  { l: 66, t: 26, s: 6, d: 90 },
  { l: 25, t: 52, s: 5, d: 180 },
  { l: 70, t: 49, s: 5, d: 270 },
];

function HighGroundTakeover({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) return <TargetHit palette={HG_PALETTE} Icon={HG_ICON} delayMs={delayMs} accent="spark" />;
  return (
    <Stage>
      {/* the board-wide tinted wash: gold light over crimson ground */}
      <span
        className="bsp-hg-wash absolute inset-0 block"
        style={{
          background: `radial-gradient(circle at 50% 46%, ${tint(HG_GOLD, 0.3)} 0%, ${tint(HG_CRIMSON, 0.26)} 55%, ${tint(HG_CRIMSON_DEEP, 0.34)} 100%)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
      {/* the sunburst crowning the summit */}
      <span className="bsp-hg-rays absolute block" style={{ left: "29%", top: "17%", width: "42%", height: "42%", animationDelay: `${delayMs + 420}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M20 2.5 L21.4 8.6 H18.6 Z" fill={tint(HG_GOLD, 0.85)} transform={`rotate(${i * 30} 20 20)`} />
          ))}
        </svg>
      </span>
      {/* terraced plateaus rising rank by rank into the ziggurat */}
      {HG_TERRACES.map((t, i) => (
        <span key={i} className="bsp-hg-terrace absolute block" style={{ left: `${t.l}%`, top: `${t.t}%`, width: `${t.w}%`, height: "9%", animationDelay: `${delayMs + 120 + t.d}ms` }}>
          <svg viewBox="0 0 56 9" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M2.5 9 L8 1.5 H48 L53.5 9 Z" fill={tint(HG_CRIMSON_DEEP, 0.82)} stroke={tint(HG_GOLD_DEEP, 0.9)} strokeWidth="0.7" {...SJ} />
            <path d="M8 1.5 H48" stroke={tint(HG_GOLD, 0.95)} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* the colossal summit: mountain, snow cap, glyph and peak pennant */}
      <span className="bsp-hg-summit absolute block" style={{ left: "34%", top: "24%", width: "32%", height: "32%", animationDelay: `${delayMs + 300}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <path d="M20 3 L34 36 H6 Z" fill={tint(HG_CRIMSON, 0.9)} stroke={HG_GOLD} strokeWidth="1.2" {...SJ} />
          <path d="M20 3 L27.5 36 H34 Z" fill={tint(HG_CRIMSON_DEEP, 0.6)} />
          <path d="M20 3 L25.4 15.6 L22.6 13.9 L20 16.2 L17.4 13.9 L14.6 15.6 Z" fill={HG_SNOW} stroke={HG_GOLD_DEEP} strokeWidth="0.7" {...SJ} />
          <path d="M6 36 H34" stroke={tint(HG_GOLD, 0.9)} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="bsp-hg-banner absolute block" style={{ left: "50%", top: "-8%", width: "32%", height: "20%", animationDelay: `${delayMs + 820}ms` }}>
          <svg viewBox="0 0 20 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0.4" y="0.4" width="1.2" height="11.2" rx="0.6" fill={HG_GOLD_DEEP} />
            <path d="M1.6 1 H19 L14 4.8 L19 8.6 H1.6 Z" fill={tint(HG_CRIMSON, 0.95)} stroke={HG_GOLD} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        <Face Icon={HG_ICON} color={HG_GOLD} delayMs={delayMs + 700} left={38} top={46} size={24} strokeWidth={2} />
      </span>
      {/* war-banners planted on the flanking terraces */}
      {HG_FLAGS.map((b, i) => (
        <span key={i} className="bsp-grow absolute block" style={{ left: `${b.l}%`, top: `${b.t}%`, width: "4.5%", height: "21%", animationDelay: `${delayMs + b.d}ms` }}>
          <svg viewBox="0 0 6 28" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1" y="1" width="1.1" height="26.5" rx="0.55" fill={HG_GOLD_DEEP} />
            <path d="M2.1 1.6 H5.8 L4.4 4 L5.8 6.4 H2.1 Z" fill={tint(HG_CRIMSON, 0.95)} stroke={tint(HG_GOLD, 0.9)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      ))}
      {/* TWIN shockwave rings, sweeping out past the board edges */}
      <span
        className="bsp-hg-shock absolute block rounded-full"
        style={{ left: "8%", top: "5%", width: "84%", height: "84%", border: `4px solid ${tint(HG_GOLD, 0.9)}`, animationDelay: `${delayMs + 880}ms` }}
      />
      <span
        className="bsp-hg-shock absolute block rounded-full"
        style={{ left: "8%", top: "5%", width: "84%", height: "84%", border: `3px solid ${tint(HG_CRIMSON, 0.85)}`, animationDelay: `${delayMs + 1080}ms` }}
      />
      {/* victory glints around the summit */}
      {HG_GLINTS.map((g, i) => (
        <span key={i} className="bsp-glint absolute block" style={{ left: `${g.l}%`, top: `${g.t}%`, width: `${g.s}%`, height: `${g.s}%`, animationDelay: `${delayMs + 1100 + g.d}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L6.3 3.7 L9.4 5 L6.3 6.3 L5 9.4 L3.7 6.3 L0.6 5 L3.7 3.7 Z" fill={HG_GOLD} />
          </svg>
        </span>
      ))}
    </Stage>
  );
}

/* =============================================================================
   Registry — CARD -> TEMPLATE / PALETTE, one entry per still-uncovered card.
   The glyph is always the card's own globally unique face icon (cardFaceIcon),
   so template + palette + icon is unique per card by construction. `source`
   names an fx zone ONLY where the card reliably paints it at cast time
   (frozen / walnut / stun / shield / kingSafe / summon / motif zones);
   everything else rides the removal diff or Board's diff-less lead branch.
   ========================================================================== */

/** Bind a template + palette + the card's own face icon into a SigPlugin. */
function B(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  id: string,
  config: SigPlugin["config"],
  bold = false,
): SigPlugin {
  const def = BUFF_BY_ID[id];
  const Icon = def ? cardFaceIcon(id, def.category, def.icon) : undefined;
  return {
    config,
    Render: function BasicPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} Icon={Icon} bold={bold} lead={lead} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {

  /* --- SigilRing --------------------------------------------------------- */
  // Cornerstone (t1 protection)
  cornerstone: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "cornerstone", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "aegis" }),
  // Firm Footing (t1 protection)
  firm_footing: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "firm_footing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Guarded King (t1 protection)
  guarded_king: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "guarded_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis" }),
  // Holy Hell (t1 protection)
  holy_hell: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "holy_hell", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }),
  // Loose Pawn (t1 protection)
  loose_pawn: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "loose_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }),
  // Pawn Shield (t1 protection)
  pawn_shield: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "pawn_shield", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Steady Hand (t1 protection)
  steady_hand: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "steady_hand", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis" }),
  // Bulwark (t2 protection)
  bulwark: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "bulwark", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Fork Guard (t2 protection)
  fork_guard: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "fork_guard", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "aegis" }),
  // Reinforce (t2 protection)
  reinforce: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "reinforce", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Screen (t2 protection)
  screen: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "screen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }),
  // Shielded Advance (t2 protection)
  shielded_advance: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "shielded_advance", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }),
  // Sidestep King (t2 protection)
  sidestep_king: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "sidestep_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }),
  // Chain Mail (t3 protection)
  chain_mail: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "chain_mail", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Deflect (t3 protection)
  deflect: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "deflect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Fortress (t3 protection)
  fortress: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "fortress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Iron Bishop (t3 protection)
  iron_bishop: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "iron_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }),
  // Phalanx (t3 protection)
  phalanx: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "phalanx", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Sigil Ward (t3 protection)
  wa_sigil_ward: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "wa_sigil_ward", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }),
  // Duelist (t4 protection)
  duelist: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "duelist", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, true),
  // Hold the Bridge (t4 protection)
  hold_the_bridge: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "hold_the_bridge", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }, true),
  // Iron Wall (t4 protection)
  iron_wall: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "iron_wall", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, true),
  // Shieldmaiden (t4 protection)
  shieldmaiden: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "shieldmaiden", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, true),
  // Warding Circle (t4 protection)
  warding_circle: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "warding_circle", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }, true),
  // Watermelon Rind (t4 protection)
  watermelon_rind: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "watermelon_rind", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, true),
  // High Ground (TIER 7 protection — bespoke full-board takeover, not a template)
  ww_high_ground: { config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, Render: HighGroundTakeover },

  /* --- RuneStamp --------------------------------------------------------- */
  // Butterfingers (t1 hex)
  butterfingers: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades" }),
  // Cold Feet (t1 hex)
  cold_feet: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "cold_feet", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }),
  // Crossed Wires (t1 hex)
  crossed_wires: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "crossed_wires", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }),
  // Foggy Glasses (t1 hex)
  foggy_glasses: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "foggy_glasses", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades" }),
  // Royal Restraint (t1 hex)
  royal_restraint: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "royal_restraint", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades" }),
  // Stage Fright (t1 hex)
  stage_fright: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "stage_fright", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", source: "slow" }),
  // Blunted Lance (t2 hex)
  blunted_lance: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "blunted_lance", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }),
  // Lame Horses (t2 hex)
  lame_horses: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "lame_horses", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }),
  // Rusted Hinges (t2 hex)
  rusted_hinges: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "rusted_hinges", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "shades" }),
  // Safe Passage (t2 hex)
  safe_passage: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "safe_passage", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }),
  // Timid King (t2 hex)
  timid_king: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "timid_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades" }),
  // Sown Salt (t3 hex)
  sown_salt: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "sown_salt", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }),
  // Backseat Driver (t3 hex)
  wc_backseat_driver: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "wc_backseat_driver", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", source: "slow" }),
  // Atomic Captures (Small) (t4 attack)
  atomic_captures_small: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "atomic_captures_small", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Hex Doll (t4 hex)
  hex_doll: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "hex_doll", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Butterfingers (t4 hex)
  wc_butterfingers: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "wc_butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades" }, true),
  // Backdraft (t4 attack)
  we_backdraft: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "we_backdraft", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),

  /* --- ChainLash --------------------------------------------------------- */
  // Cold Open (t1 hex)
  cold_open: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "cold_open", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }),
  // Heavy Boots (t1 hex)
  heavy_boots: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "heavy_boots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }),
  // Knock Knees (t1 hex)
  knock_knees: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "knock_knees", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }),
  // Molasses (t1 hex)
  molasses: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "molasses", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }),
  // Slippery Grip (t1 hex)
  slippery_grip: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "slippery_grip", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }),
  // Stiff Joints (t1 hex)
  stiff_joints: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "stiff_joints", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }),
  // Anchor (t2 protection)
  anchor: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "anchor", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "wall" }),
  // Butter Bishops (t2 hex)
  butter_bishops: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "butter_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }),
  // Leaden Queen (t2 hex)
  leaden_queen: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "leaden_queen", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }),
  // Seized Axles (t2 hex)
  seized_axles: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "seized_axles", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }),
  // Short Leash (t2 hex)
  short_leash: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "short_leash", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }),
  // Trench Line (t2 hex)
  trench_line: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "trench_line", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }),
  // Anchored Rooks (t3 hex)
  anchored_rooks: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "anchored_rooks", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }),
  // Blinkered Bishops (t3 hex)
  blinkered_bishops: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "blinkered_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }),
  // Leaden Crown (t3 hex)
  leaden_crown: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "leaden_crown", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }),
  // Magnet (t3 item)
  magnet: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "magnet", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Pawn Nerf (t3 hex)
  pawn_nerf: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "pawn_nerf", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }),
  // Pin Breaker (t3 movement)
  pin_breaker: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "pin_breaker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Spooked Steeds (t3 hex)
  spooked_steeds: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "spooked_steeds", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }),
  // Static Field (t3 protection)
  we_static_field: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "we_static_field", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }),
  // Abandoned Post (t4 hex)
  abandoned_post: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "abandoned_post", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, true),
  // Blockade (t4 tempo)
  blockade: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "blockade", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, true),
  // Frozen Furrows (t4 hex)
  frozen_furrows: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "frozen_furrows", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, true),
  // Heavy Shackles (t4 hex)
  heavy_shackles: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "heavy_shackles", { ordering: "radial", staggerMs: 0, victims: ["q","r"], hasLead: true, sound: "wall" }, true),
  // Quicksand Patch (t4 tempo)
  wc_quicksand_patch: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "wc_quicksand_patch", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "walnut" }, true),

  /* --- ColdSnap ---------------------------------------------------------- */
  // Cold Snap (t1 hex)
  cold_snap: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "cold_snap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Hard Reset (t2 hex)
  hard_reset: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "hard_reset", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Pinned Down (t2 hex)
  pinned_down: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "pinned_down", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Frost Nip (t2 tempo)
  we_frost_nip: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "we_frost_nip", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Frost (t3 tempo)
  frost: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Frostbite (t3 hex)
  frostbite: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "frostbite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Snap Freeze (t3 tempo)
  snap_freeze: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "snap_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Twist the Knife (t3 hex)
  twist_the_knife: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "twist_the_knife", { ordering: "sweep", staggerMs: 60, victims: ["p","n","b","r","q"], hasLead: true, sound: "clockice", source: "slow" }),
  // Stasis Field (t3 tempo)
  wa_stasis_field: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "wa_stasis_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Wall (t3 tempo)
  wall: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "wall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Clumsy Dash (t3 tempo)
  wc_clumsy_dash: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "wc_clumsy_dash", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }),
  // Slip on Ice (t3 tempo)
  wc_slip_on_ice: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "wc_slip_on_ice", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockice", source: "frozen" }),
  // Stage Fright (t3 hex)
  wc_stage_fright: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wc_stage_fright", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice" }),
  // Cascade Freeze (t4 tempo)
  cascade_freeze: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "cascade_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice" }, true),
  // Cryostasis (t4 hex)
  cryostasis: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "cryostasis", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, true),
  // Hard Frost (t4 hex)
  hard_frost: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "hard_frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, true),
  // Immobilizer (t4 tempo)
  immobilizer: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "immobilizer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, true),
  // Bind the Queen (t4 protection)
  wa_bind_the_queen: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wa_bind_the_queen", { ordering: "sweep", staggerMs: 60, victims: ["q"], hasLead: true, sound: "clockice", source: "frozen" }, true),
  // Counter Charge (t4 tempo)
  ww_counter_charge: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "ww_counter_charge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice" }, true),

  /* --- StoneShell -------------------------------------------------------- */
  // Gargoyles (t2 hex)
  gargoyles: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "gargoyles", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }),
  // Stone Hooves (t2 hex)
  stone_hooves: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "stone_hooves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }),
  // Gorgon's Glance (t3 hex)
  gorgons_glance: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "gorgons_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }),
  // Hobbled Cavalry (t3 hex)
  hobbled_cavalry: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "hobbled_cavalry", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut" }),
  // Petrified Towers (t3 hex)
  petrified_towers: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "petrified_towers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }),
  // Granite Towers (t4 hex)
  granite_towers: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "granite_towers", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, true),
  // Ironbound Rook (t4 hex)
  ironbound_rook: B(StoneShell, ["#b0a68f","#e3ddd0","#4a4336"], "ironbound_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, true),
  // Statue Stable (t4 hex)
  statue_stable: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "statue_stable", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, true),
  // Stone Clergy (t4 hex)
  stone_clergy: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "stone_clergy", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, true),

  /* --- GlintArc ---------------------------------------------------------- */
  // Ferz King (t1 movement)
  ferz_king: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "ferz_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }),
  // Half Step (t1 movement)
  half_step: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "half_step", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Loyal Pawn (t1 pieces)
  loyal_pawn: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "loyal_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // Quiet March (t1 movement)
  quiet_march: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "quiet_march", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Rook Slide (t1 movement)
  rook_slide: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "rook_slide", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Sentinel Pawn (t1 attack)
  sentinel_pawn: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "sentinel_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // Sidestep (t1 protection)
  sidestep: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "sidestep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "shield" }),
  // Tempo Shuffle (t1 movement)
  tempo_shuffle: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "tempo_shuffle", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Ghost Pawn (t2 movement)
  ghost_pawn: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ghost_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Pawn Push (t2 movement)
  pawn_push: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "pawn_push", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Phase Rook (t2 movement)
  phase_rook: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "phase_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Reposition (t2 movement)
  reposition: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "reposition", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "empower" }),
  // Wazir Rook (t2 movement)
  wazir_rook: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "wazir_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Thunder Step (t2 movement)
  we_thunder_step: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "we_thunder_step", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Grasshopper (t3 movement)
  grasshopper: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "grasshopper", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "coronation", source: "empower" }),
  // Promote Now (t3 pieces)
  promote_now: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "promote_now", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // Queen's Echo (t3 movement)
  queens_echo: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "queens_echo", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Rank Runner (t3 movement)
  rank_runner: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "rank_runner", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }),
  // Vanguard (t3 pieces)
  vanguard: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "vanguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // Transmute (t3 pieces)
  wa_transmute: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "wa_transmute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // Ball Lightning (t3 attack)
  we_ball_lightning: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "we_ball_lightning", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }),
  // River Flow (t3 movement)
  we_riverflow: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "we_riverflow", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Phalanx Advance (t3 movement)
  ww_phalanx_advance: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ww_phalanx_advance", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }),
  // Changeling (t4 pieces)
  changeling: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "changeling", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, true),
  // Kingslide (t4 movement)
  kingslide: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "kingslide", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }, true),
  // Royal Decree (t4 movement)
  royal_decree: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "royal_decree", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }, true),
  // Arcane Conduit (t4 movement)
  wa_arcane_conduit: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "wa_arcane_conduit", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, true),

  /* --- HoofSpring -------------------------------------------------------- */
  // Bishop Polish (t1 movement)
  bishop_polish: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "bishop_polish", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Diagonal Step (t1 movement)
  diagonal_step: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "diagonal_step", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", source: "empower" }),
  // Little Leap (t1 movement)
  little_leap: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "little_leap", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }),
  // Nudge (t1 attack)
  nudge: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Camel Knight (t2 movement)
  camel_knight: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "camel_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Long Knight (t2 movement)
  long_knight: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "long_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Mind Nudge (t2 attack)
  mind_nudge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "mind_nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Rally (t2 movement)
  rally: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "rally", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Spring Pawn (t2 movement)
  spring_pawn: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "spring_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }),
  // Teleport Knight (t2 movement)
  teleport_knight: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "teleport_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Vault (t2 movement)
  vault: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "vault", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }),
  // Wazir Bishop (t2 movement)
  wazir_bishop: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "wazir_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Kangaroo Hop (t2 movement)
  wc_kangaroo_hop: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "wc_kangaroo_hop", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Updraft (t2 movement)
  we_updraft: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "we_updraft", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Bishop to Archbishop (t3 movement)
  bishop_archbishop: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "bishop_archbishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Board Quake (t3 attack)
  board_quake: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "board_quake", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Cannon (t3 movement)
  cannon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "cannon", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }),
  // Dragon Pawn (t3 movement)
  dragon_pawn: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "dragon_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }),
  // Hunter Knight (t3 attack)
  hunter_knight: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "hunter_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Knight to Nightrook (t3 movement)
  knight_nightrook: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "knight_nightrook", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Overclock (t3 movement)
  overclock: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "overclock", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }),
  // Rook to Chancellor (t3 movement)
  rook_chancellor: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "rook_chancellor", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }),
  // Sliding King (t3 movement)
  sliding_king: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "sliding_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", source: "empower" }),
  // Tidal Push (t3 attack)
  tidal_push: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "tidal_push", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Trampoline (t3 item)
  trampoline: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "trampoline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Ghostwalk (t3 movement)
  wa_ghostwalk_bishop: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "wa_ghostwalk_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Flank March (t3 movement)
  ww_flank_march: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "ww_flank_march", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Forced Retreat (t3 tempo)
  ww_forced_retreat: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "ww_forced_retreat", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Pontoon Bridge (t3 movement)
  ww_pontoon_bridge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "ww_pontoon_bridge", { ordering: "radial", staggerMs: 0, victims: ["r","b","q"], hasLead: true, sound: "blitz", source: "empower" }),
  // War Wagon (t3 movement)
  ww_war_wagon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "ww_war_wagon", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }),
  // Firecracker (t4 item)
  firecracker: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "firecracker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Giant Slayer (t4 attack)
  giant_slayer: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "giant_slayer", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }, true),
  // Overrun (t4 attack)
  overrun: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "overrun", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Twin Knights (t4 movement)
  twin_knights: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "twin_knights", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, true),
  // Camel Rider (t4 movement)
  wa_camel_rider: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "wa_camel_rider", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, true),

  /* --- PennantRaise ------------------------------------------------------ */
  // Steady March (t1 movement)
  steady_march: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "steady_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }),
  // Counterstep (t2 tempo)
  counterstep: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "counterstep", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "rally" }),
  // Double Step Army (t2 movement)
  double_step_army: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "double_step_army", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }),
  // Pawn Storm (t2 movement)
  pawn_storm: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "pawn_storm", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }),
  // Pikemen (t2 movement)
  ww_pikemen: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "ww_pikemen", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }),
  // Berolina Pawns (t3 movement)
  berolina_pawns: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "berolina_pawns", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }),
  // Momentum (t3 tempo)
  momentum: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "momentum", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "rally" }),
  // Split March (t3 movement)
  split_march: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "split_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }),
  // Moonwalk (t3 movement)
  wc_moonwalk: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "wc_moonwalk", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }),
  // Army Reversal (t4 movement)
  army_reversal: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "army_reversal", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, true),
  // Solstice (t4 tempo)
  solstice: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "solstice", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, true),
  // Chaos Reigns (t4 tempo)
  wc_chaos_reigns: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "wc_chaos_reigns", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, true),
  // Field Fortification (t4 movement)
  ww_field_fortification: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "ww_field_fortification", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, true),

  /* --- ScrollSnap -------------------------------------------------------- */
  // Cut Purse (t2 hex)
  cut_purse: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "cut_purse", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Sealed Orders (t2 hex)
  sealed_orders: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "sealed_orders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Royal Duty (t3 hex)
  royal_duty: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "royal_duty", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "snooze" }),
  // Suppress Magic (t3 draft)
  wa_suppress_magic: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "wa_suppress_magic", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Red Tape (t3 tempo)
  wc_red_tape: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "wc_red_tape", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", source: "slow" }),
  // Burned Dispatches (t4 hex)
  burned_dispatches: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "burned_dispatches", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Chain Nullify (t4 draft)
  chain_nullify: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "chain_nullify", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Dead Letter (t4 hex)
  dead_letter: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "dead_letter", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Mirror (t4 draft)
  mirror: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "mirror", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Patch Notes (t4 hex)
  patch_notes: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "patch_notes", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Suppress (t4 draft)
  suppress: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "suppress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Disrupt Ritual (t4 draft)
  wa_disrupt_ritual: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "wa_disrupt_ritual", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Jinx (t4 draft)
  wa_jinx: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "wa_jinx", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),

  /* --- CardFlick --------------------------------------------------------- */
  // Prep (t1 draft)
  prep: B(CardFlick, ["#c9a0ff","#ffe9b0","#301c50"], "prep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }),
  // Trade Up (t2 pieces)
  trade_up: B(CardFlick, ["#9b6bd1","#f2e0ff","#1e1038"], "trade_up", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }),
  // Buff Thief (Minor) (t4 draft)
  buff_thief_minor: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "buff_thief_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Hero's Journey (t4 draft)
  heros_journey: B(CardFlick, ["#8f6bff","#fff2c9","#22123e"], "heros_journey", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Recast (t4 draft)
  recast: B(CardFlick, ["#a880e8","#ffd23f","#261644"], "recast", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Disjunction (t4 draft)
  wa_disjunction: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "wa_disjunction", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),

  /* --- EyeBlink ---------------------------------------------------------- */
  // Extra Glance (t1 info)
  extra_glance: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "extra_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Peek (t1 info)
  peek: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "peek", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Quick Glance (t1 info)
  quick_glance: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "quick_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Scout (t1 info)
  scout: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Watchtower (t1 info)
  watchtower: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "watchtower", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Draft Insight (t2 info)
  draft_insight: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "draft_insight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Oracle's Eye (t2 info)
  oracles_eye: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "oracles_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Third Eye (t2 info)
  third_eye: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "third_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // North Star (t3 info)
  north_star: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "north_star", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Foresight (t3 info)
  wa_foresight: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "wa_foresight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }),
  // Mind Read (t4 info)
  wa_mind_read: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "wa_mind_read", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),
  // Omniscience (t4 info)
  wa_omniscience: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "wa_omniscience", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, true),

  /* --- KeyTurn ----------------------------------------------------------- */
  // Castle Early (t1 movement)
  castle_early: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "castle_early", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Drawbridge (t1 hex)
  drawbridge: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "drawbridge", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "slow" }),
  // Toll Gate (t1 hex)
  toll_gate: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "toll_gate", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage" }),
  // Long Castle Anywhere (t2 movement)
  long_castle_anywhere: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "long_castle_anywhere", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "empower" }),
  // No Man's Land (t2 hex)
  no_mans_land: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "no_mans_land", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Shy Pieces (t2 hex)
  wc_shy_pieces: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "wc_shy_pieces", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Board Lock (t3 tempo)
  board_lock: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "board_lock", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "slow" }),
  // Bunker (t3 protection)
  bunker: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "bunker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // No Trespass (t3 hex)
  no_trespass: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "no_trespass", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Flypaper File (t4 hex)
  flypaper_file: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "flypaper_file", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, true),
  // Sealed Gate (t4 hex)
  sealed_gate: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "sealed_gate", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, true),

  /* --- LanternLift ------------------------------------------------------- */
  // Second Wind (t1 pieces)
  second_wind: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "second_wind", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Minor Recall (t2 pieces)
  minor_recall: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "minor_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Regrow (t2 pieces)
  we_regrow: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "we_regrow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Field Hospital (t2 pieces)
  ww_field_hospital: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "ww_field_hospital", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Reclaim the Fallen (t2 pieces)
  ww_reclaim_the_fallen: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "ww_reclaim_the_fallen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Seance (t3 pieces)
  seance: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "seance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Second Wind Major (t3 pieces)
  second_wind_major: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "second_wind_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Will-o'-Wisp (t3 tempo)
  will_o_wisp: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "will_o_wisp", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "frozen" }),
  // Last Reserves (t3 pieces)
  ww_last_reserves: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "ww_last_reserves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }),
  // Resurrect (t4 pieces)
  resurrect: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "resurrect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, true),
  // Resurrect Major (t4 pieces)
  resurrect_major: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "resurrect_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, true),
  // Lost and Found (t4 pieces)
  wc_lost_and_found: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "wc_lost_and_found", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, true),
  // Recommission (t4 pieces)
  ww_recommission: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "ww_recommission", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, true),

  /* --- SatchelDrop ------------------------------------------------------- */
  // Walnut Shell (t1 item)
  walnut_shell: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "walnut_shell", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Apple (t2 item)
  apple: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "apple", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "shield" }),
  // Banana Peel (t2 item)
  banana_peel: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "banana_peel", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Coconut Bonk (t2 item)
  coconut_bonk: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "coconut_bonk", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "frozen" }),
  // King's Guard (t2 pieces)
  kings_guard: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "kings_guard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Bodyguard (t3 pieces)
  bodyguard: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "bodyguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Split Bishop (t3 pieces)
  split_bishop: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "split_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Sapper Team (t3 pieces)
  ww_sapper_team: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "ww_sapper_team", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }),
  // Coffee (t4 item)
  coffee: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "coffee", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, true),
  // Comet Shard (t4 pieces)
  comet_shard: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "comet_shard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, true),
  // Conjured Bishop (t4 pieces)
  wa_conjure_bishop: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "wa_conjure_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, true),
  // Shieldbearers (t4 pieces)
  ww_shieldbearers: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "ww_shieldbearers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, true),

  /* --- CogTick ----------------------------------------------------------- */
  // Free Retreat (t1 tempo)
  free_retreat: B(CogTick, ["#c9a84c","#6fe3ff","#3a3026"], "free_retreat", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Rewind One (t3 tempo)
  rewind_one: B(CogTick, ["#a8925a","#aee2ff","#33291a"], "rewind_one", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }),
  // Wasted Hour (t3 hex)
  wasted_hour: B(CogTick, ["#bf9c50","#9fdcf0","#362c1c"], "wasted_hour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", source: "stun" }),
  // Lost Weekend (t4 hex)
  lost_weekend: B(CogTick, ["#b5924a","#8fe8ff","#302818"], "lost_weekend", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", source: "slow" }, true),
  // Borrowed Minute (t4 tempo)
  wa_borrowed_minute: B(CogTick, ["#d1aa5a","#7fd8e8","#3c3120"], "wa_borrowed_minute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, true),

  /* --- BellToll ---------------------------------------------------------- */
  // Deep Breath (t1 nerf)
  deep_breath: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "deep_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Reprieve (t1 nerf)
  reprieve: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "reprieve", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Small Mercies (t1 nerf)
  small_mercies: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "small_mercies", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Defiance (t2 nerf)
  defiance: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "defiance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Held Breath (t2 nerf)
  held_breath: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "held_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Hunter's Relief (t2 nerf)
  hunters_relief: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "hunters_relief", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Loosen the Leash (t2 nerf)
  loosen_the_leash: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "loosen_the_leash", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Slack in the Chain (t2 nerf)
  slack_chain: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "slack_chain", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Break the Nerf (t3 nerf)
  break_the_nerf: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "break_the_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Grace Period (t3 nerf)
  grace_period: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "grace_period", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Half Measure (t3 nerf)
  half_measure: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "half_measure", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Piece Parole (t3 nerf)
  piece_parole: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "piece_parole", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Timely Lull (t3 nerf)
  timely_lull: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "timely_lull", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Underdog's Grit (t3 nerf)
  underdogs_grit: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "underdogs_grit", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }),
  // Adrenaline (t4 nerf)
  adrenaline: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "adrenaline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, true),
  // Counter-Nerf (t4 nerf)
  counter_nerf: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "counter_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, true),
  // Respite (t4 nerf)
  respite: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "respite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, true),

  /* --- LeafSpin ---------------------------------------------------------- */
  // Durian (t3 hex)
  durian: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "durian", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }),
  // Pixie Dust (t3 movement)
  pixie_dust: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "pixie_dust", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "empower" }),
  // Seelie Blessing (t3 protection)
  seelie_blessing: B(LeafSpin, ["#559f55","#c0e57f","#1a3d1a"], "seelie_blessing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "shield" }),
  // Bramble Wall (t3 protection)
  we_bramble_wall: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "we_bramble_wall", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "frozen" }),
  // Creeping Roots (t3 protection)
  we_creeping_roots: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "we_creeping_roots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrifiedforest" }),
  // Seedlings (t3 pieces)
  we_seedlings: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "we_seedlings", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }),
  // Faerie Ring (t4 hex)
  faerie_ring: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "faerie_ring", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }, true),
  // Puck's Mischief (t4 hex)
  pucks_mischief: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "pucks_mischief", { ordering: "sweep", staggerMs: 60, victims: ["q","r"], hasLead: true, sound: "petrifiedforest", source: "slow" }, true),
  // Ancient Grove (t4 pieces)
  we_ancient_grove: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "we_ancient_grove", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "summon" }, true),

  /* --- PrismFlash -------------------------------------------------------- */
  // Escape Hatch (t1 movement)
  escape_hatch: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "escape_hatch", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Piece Swap (t2 movement)
  piece_swap: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "piece_swap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Recall (t2 movement)
  recall: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Regroup the Lines (t2 movement)
  ww_regroup_lines: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "ww_regroup_lines", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Guard Rotation (t3 movement)
  guard_rotation: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "guard_rotation", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Blink (t3 movement)
  wa_blink: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "wa_blink", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Warp Home (t3 movement)
  warp_home: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "warp_home", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Warp Step (t3 movement)
  warp_step: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "warp_step", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }),
  // Blink Army (t4 movement)
  blink_army: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "blink_army", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Grand Recall (t4 movement)
  grand_recall: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "grand_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Mass Recall (t4 movement)
  mass_recall: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "mass_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Regroup (t4 movement)
  regroup: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "regroup", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Total Recall (t4 movement)
  total_recall: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "total_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Fold Space (t4 movement)
  wa_swap_flanks: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "wa_swap_flanks", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Warp Field (t4 movement)
  warp_field: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "warp_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Warp Reign (t4 protection)
  warp_reign: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "warp_reign", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "shield" }, true),
  // Warp Rook (t4 movement)
  warp_rook: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "warp_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Riptide (t4 movement)
  we_riptide: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "we_riptide", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),
  // Undertow (t4 movement)
  we_undertow: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "we_undertow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, true),

  /* --- BannerMuster ------------------------------------------------------ */
  // Decoy (t2 protection)
  decoy: B(BannerMuster, ["#c94a3a","#d8dee9","#331410"], "decoy", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege" }),
  // Regenerate (t3 pieces)
  regenerate: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "regenerate", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", source: "summon" }),
  // Summon Knight (t3 pieces)
  summon_knight: B(BannerMuster, ["#d1583a","#dfe5ee","#3a1a10"], "summon_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }),
  // Conjured Scout (t3 pieces)
  wa_conjure_scout: B(BannerMuster, ["#c94a3a","#d8dee9","#331410"], "wa_conjure_scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }),
  // Outriders (t3 pieces)
  ww_outriders: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "ww_outriders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }),
  // Mass Resurrect (t4 pieces)
  mass_resurrect: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "mass_resurrect", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", source: "summon" }, true),
  // Phantom Rook (t4 pieces)
  phantom_rook: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "phantom_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, true),
  // Forward Observer (t4 pieces)
  ww_forward_observer: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "ww_forward_observer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, true),
  // Reserve Cavalry (t4 pieces)
  ww_reserve_cavalry: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "ww_reserve_cavalry", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, true),

  /* --- InkSplash --------------------------------------------------------- */
  // Shadow Step (t2 movement)
  shadow_step: B(InkSplash, ["#7b6bd1","#d6c9f0","#16142a"], "shadow_step", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }),
  // Glamour (t3 pieces)
  glamour: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "glamour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }),
  // Piece Steal (t3 pieces)
  piece_steal: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "piece_steal", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }),
  // Dominate (t4 pieces)
  wa_dominate_minor: B(InkSplash, ["#5b4a9f","#e8ddff","#0e0c1c"], "wa_dominate_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Body Double (t4 pieces)
  wc_body_double: B(InkSplash, ["#8a70e0","#efe6ff","#181430"], "wc_body_double", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Defectors (t4 pieces)
  ww_defectors: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "ww_defectors", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
  // Mass Defection (t4 pieces)
  ww_mass_defection: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "ww_mass_defection", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, true),
};
