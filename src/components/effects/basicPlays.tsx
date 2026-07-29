// Tier 1-4 plugin signatures — the "basic" band: every card not already
// covered by the core SIGNATURES table or the god / great / funny plugin sets
// gets a UNIQUE, restrained, name-matched play. See sigPlugins.tsx for the
// registry contract. Self-contained: own SVG, own CSS (basicPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Design brief (owner, third pass: "so many of the current ones are so basic
// and look like basic icons just disguised as animations"): every play is now
// a REAL scene, ~1.4-1.7s. The themed emblem is still the centrepiece (its
// template + palette + face icon keep each card unique), but it arrives on a
// genuine trajectory (slam / hurl / rise / warp, see TRAJ_BY_FX) over a
// full-crop SceneFx choreography themed by mechanic family: a directional
// front crossing the board, themed particle bursts, shock rings, sweeping
// beams (see FX_SPECS). The old "one modest flourish" rule is retired; the
// per-square TargetHit for zone-fed cards is unchanged.
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
/* --- Per-card structural signet ------------------------------------------
   The templates below are shared by design (twenty scenes across hundreds of
   cards), and palette + face icon already make each card's dressing unique.
   What they did NOT differ in was STRUCTURE: 381 cards played a geometrically
   identical scene, which is what makes a draft feel repetitive even when every
   card technically has its own art.

   A signet is a small constellation of marks layered over the lead, and it is
   the structural axis: how many marks, in what arrangement, moving which way.
   Two cards on the same template with different signets no longer trace the
   same shapes. Named `<pattern><count>` (orbit5, arc3, column6...), assigned
   per card in the PLAYS table below so every card in a template group differs.
   Transform/opacity only, and it rides the same bsp- animations-off guard. */
type SignetPattern = "orbit" | "arc" | "column" | "corners" | "spiral" | "cross";

/** Marks laid out for one signet: position (percent of the emblem box), the
 *  animation class, and a per-mark delay so the constellation resolves in
 *  sequence rather than all at once. */
function signetMarks(
  pattern: SignetPattern,
  count: number,
): { left: string; top: string; cls: string; delay: number; rot: number }[] {
  const out: { left: string; top: string; cls: string; delay: number; rot: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const step = i * 42;
    switch (pattern) {
      case "orbit": {
        const a = t * Math.PI * 2;
        out.push({
          left: `${50 + Math.cos(a) * 34}%`,
          top: `${50 + Math.sin(a) * 34}%`,
          cls: "bsp-fl-orbit",
          delay: step,
          rot: (a * 180) / Math.PI,
        });
        break;
      }
      case "arc": {
        const a = Math.PI + t * Math.PI; // a fan across the top
        out.push({
          left: `${50 + Math.cos(a) * 38}%`,
          top: `${44 + Math.sin(a) * 26}%`,
          cls: "bsp-fl-arc",
          delay: step,
          rot: (a * 180) / Math.PI + 90,
        });
        break;
      }
      case "column":
        out.push({
          left: `${50 + (i % 2 === 0 ? -9 : 9)}%`,
          top: `${78 - t * 62}%`,
          cls: "bsp-fl-column",
          delay: step,
          rot: 0,
        });
        break;
      case "corners": {
        const a = Math.PI / 4 + t * Math.PI * 2;
        out.push({
          left: `${50 + Math.cos(a) * 40}%`,
          top: `${50 + Math.sin(a) * 40}%`,
          cls: "bsp-fl-corners",
          delay: step,
          rot: (a * 180) / Math.PI,
        });
        break;
      }
      case "spiral": {
        const a = t * Math.PI * 3;
        const r = 14 + t * 26;
        out.push({
          left: `${50 + Math.cos(a) * r}%`,
          top: `${50 + Math.sin(a) * r}%`,
          cls: "bsp-fl-spiral",
          delay: step,
          rot: (a * 180) / Math.PI,
        });
        break;
      }
      case "cross": {
        const arm = i % 4;
        const reach = 26 + Math.floor(i / 4) * 16;
        out.push({
          left: `${50 + (arm === 0 ? reach : arm === 2 ? -reach : 0)}%`,
          top: `${50 + (arm === 1 ? reach : arm === 3 ? -reach : 0)}%`,
          cls: "bsp-fl-cross",
          delay: step,
          rot: arm * 90,
        });
        break;
      }
    }
  }
  return out;
}

/** Parse a signet name ("orbit5") into its pattern and count. */
function parseSignet(name: string): { pattern: SignetPattern; count: number } | null {
  const m = /^(orbit|arc|column|corners|spiral|cross)([3-8])$/.exec(name);
  return m ? { pattern: m[1] as SignetPattern, count: Number(m[2]) } : null;
}

function Signet({
  name,
  palette,
  delayMs,
}: {
  name: string;
  palette: Palette;
  delayMs: number;
}) {
  const spec = parseSignet(name);
  if (!spec) return null;
  const marks = signetMarks(spec.pattern, spec.count);
  return (
    <span className="pointer-events-none absolute inset-0 block" aria-hidden="true">
      {marks.map((mk, i) => (
        <span
          key={i}
          className={`${mk.cls} absolute block`}
          style={{
            left: mk.left,
            top: mk.top,
            width: "9%",
            height: "9%",
            marginLeft: "-4.5%",
            marginTop: "-4.5%",
            borderRadius: spec.pattern === "corners" || spec.pattern === "cross" ? "0" : "50%",
            background: i % 2 === 0 ? palette[1] : palette[0],
            transform: `rotate(${mk.rot}deg)`,
            animationDelay: `${delayMs + mk.delay}ms`,
          }}
        />
      ))}
    </span>
  );
}

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
/** Which arrival trajectory each fx family rides in on (see bsp-x-* CSS). */
const TRAJ_BY_FX: Record<string, string> = {
  ward: "warpin", curse: "slamdown", chain: "hurl", frost: "warpin",
  stone: "slamdown", glint: "hurl", leap: "riseup", muster: "riseup",
  edict: "hurl", draw: "hurl", gaze: "warpin", lock: "slamdown",
  spirit: "riseup", loot: "slamdown", clock: "warpin", bell: "slamdown",
  grove: "riseup", prism: "slamdown", banner: "riseup", ink: "warpin",
};

function Emblem({
  bold,
  cls,
  delayMs,
  children,
  style,
  fx,
  palette,
}: {
  bold: boolean;
  cls: string;
  delayMs: number;
  children: ReactNode;
  style?: CSSProperties;
  /** mechanic-family spectacle staged behind the emblem (with `palette`) */
  fx?: FxKind;
  palette?: Palette;
}) {
  const s = bold ? 33 : 30;
  const traj = (fx && TRAJ_BY_FX[fx]) || "warpin";
  return (
    <>
      {fx && palette ? <SceneFx kind={fx} palette={palette} delayMs={delayMs} /> : null}
      {/* Outer span rides the arrival trajectory; the inner span still plays
          the template's own entrance/settle beat, so the two compose. */}
      <span
        className={`bsp-x-${traj} absolute block`}
        style={{
          left: `${50 - s / 2}%`,
          top: `${47 - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
          animationDelay: `${delayMs}ms`,
        }}
      >
        <span className={`${cls} absolute inset-0 block`} style={{ animationDelay: `${delayMs + 70}ms`, ...style }}>
          {children}
          <EmblemFlourish cls={cls} delayMs={delayMs + 420} />
        </span>
      </span>
    </>
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

/* --- Spectacle layer ----------------------------------------------------------
   Owner pass ("so many of the current ones are so basic and look like basic
   icons just disguised as animations"): every lead now stages a full-crop
   choreography BEHIND its emblem — a directional front crossing the board,
   themed particles bursting outward, shock rings, a sweeping beam — themed by
   the template's mechanic family, and the emblem ARRIVES on a real trajectory
   (slam / hurl / rise / warp) instead of fading in place. The old one-beat
   emblem art is kept as the scene's centrepiece so template + palette + icon
   still guarantees per-card uniqueness. */

type FxKind =
  | "ward" | "curse" | "chain" | "frost" | "stone" | "glint" | "leap"
  | "muster" | "edict" | "draw" | "gaze" | "lock" | "spirit" | "loot"
  | "clock" | "bell" | "grove" | "prism" | "banner" | "ink";

interface FxSpec {
  /** tilted gradient band crossing the crop: band tilt + travel vector (own-size %) */
  front?: { rot: string; fx: string; fy: string; h: number };
  rings?: number;
  /** pivoting light shaft: start/end rotation */
  beam?: [string, string];
  parts: { accent: HitAccent; n: number; spread: number };
  /** ambient motes: signed own-size travel (negative rises) */
  drift?: { dy: string; n: number };
}

const FX_SPECS: Record<FxKind, FxSpec> = {
  ward:   { rings: 3, beam: ["-38deg", "38deg"], parts: { accent: "spark", n: 6, spread: 13 }, drift: { dy: "-620%", n: 5 } },
  curse:  { front: { rot: "0deg", fx: "0%", fy: "140%", h: 7 }, rings: 2, parts: { accent: "stone", n: 8, spread: 15 }, drift: { dy: "520%", n: 5 } },
  chain:  { front: { rot: "-14deg", fx: "115%", fy: "0%", h: 4 }, parts: { accent: "link", n: 8, spread: 16 }, rings: 1 },
  frost:  { front: { rot: "8deg", fx: "125%", fy: "0%", h: 9 }, parts: { accent: "frost", n: 9, spread: 15 }, drift: { dy: "540%", n: 6 } },
  stone:  { rings: 2, parts: { accent: "stone", n: 10, spread: 17 }, drift: { dy: "460%", n: 4 } },
  glint:  { front: { rot: "-24deg", fx: "130%", fy: "-36%", h: 3 }, beam: ["-52deg", "52deg"], parts: { accent: "spark", n: 7, spread: 15 } },
  leap:   { front: { rot: "0deg", fx: "120%", fy: "0%", h: 3 }, rings: 1, parts: { accent: "spark", n: 8, spread: 16 }, drift: { dy: "-380%", n: 4 } },
  muster: { front: { rot: "0deg", fx: "0%", fy: "-120%", h: 6 }, parts: { accent: "spark", n: 7, spread: 14 }, drift: { dy: "-560%", n: 6 } },
  edict:  { front: { rot: "0deg", fx: "125%", fy: "0%", h: 8 }, parts: { accent: "mote", n: 6, spread: 12 }, drift: { dy: "460%", n: 4 } },
  draw:   { front: { rot: "16deg", fx: "115%", fy: "-24%", h: 5 }, parts: { accent: "mote", n: 8, spread: 15 } },
  gaze:   { beam: ["-58deg", "58deg"], rings: 2, parts: { accent: "spark", n: 5, spread: 11 } },
  lock:   { front: { rot: "90deg", fx: "0%", fy: "130%", h: 5 }, rings: 1, parts: { accent: "link", n: 7, spread: 13 }, drift: { dy: "420%", n: 4 } },
  spirit: { beam: ["-20deg", "20deg"], parts: { accent: "mote", n: 7, spread: 12 }, drift: { dy: "-680%", n: 7 } },
  loot:   { rings: 2, parts: { accent: "spark", n: 10, spread: 16 }, drift: { dy: "-420%", n: 5 } },
  clock:  { rings: 3, beam: ["0deg", "300deg"], parts: { accent: "mote", n: 6, spread: 12 } },
  bell:   { rings: 3, parts: { accent: "spark", n: 6, spread: 13 }, drift: { dy: "-460%", n: 4 } },
  grove:  { front: { rot: "4deg", fx: "0%", fy: "-110%", h: 7 }, parts: { accent: "leaf", n: 9, spread: 15 }, drift: { dy: "-520%", n: 6 } },
  prism:  { beam: ["-64deg", "64deg"], rings: 2, parts: { accent: "spark", n: 9, spread: 16 }, drift: { dy: "-380%", n: 4 } },
  banner: { front: { rot: "0deg", fx: "0%", fy: "-130%", h: 6 }, rings: 1, parts: { accent: "spark", n: 8, spread: 15 }, drift: { dy: "-500%", n: 6 } },
  ink:    { front: { rot: "-18deg", fx: "120%", fy: "26%", h: 8 }, parts: { accent: "mote", n: 9, spread: 15 }, drift: { dy: "480%", n: 5 } },
};

/* --- Three-beat upgrade: tell + settle + family layers ------------------------
   Owner pass four (animation-design-brief §6, basicPlays): "keep shared
   machinery, add per-family tell beats". Every lead now opens with a ≤300ms
   anticipation cue BEFORE the emblem strikes (a themed pre-glow, plus
   converging motes for families without their own tell layer), and closes on
   a decaying settle tail (ground afterglow + two rising dust motes) instead
   of a hard cut. The seven biggest families additionally stage one
   distinctive extra layer via FAMILY_LAYERS below:
     ward  (SigilRing)  — two aegis brackets clamp shut around the ring
     curse (RuneStamp)  — a dashed curse circle inscribes counter-clockwise
                          during the tell, before the rune slams into it
     chain (ChainLash)  — two ground-stakes slam down to pin the chain
     frost (ColdSnap)   — hairline frost fingers creep inward FIRST
     glint (GlintArc)   — a comet streak vaults the emblem along the arc
     leap  (HoofSpring) — a rank of chevrons rolls across the ground line
     prism (PrismFlash) — a vertical light seam opens, then snaps shut
   Budget: at most ~6 extra animated elements per play (families whose extra
   layer exists trade their tell motes for it), every track one-shot `both`
   fill, transform/opacity only, all inside the board's central ~57% crop. */

/** How long the anticipation beat holds before the strike phase begins. */
const TELL_MS = 260;

/** Families whose FAMILY_LAYERS entry already reads as (or replaces) the
 * converging-mote tell — they get the pre-glow only, keeping the element
 * budget flat. */
const TELL_GLOW_ONLY = new Set<FxKind>(["ward", "curse", "chain", "frost", "glint", "leap", "prism"]);

/** Converging tell motes: signed own-size offsets they fly IN from. */
const TELL_MOTES = [
  { dx: "-560%", dy: "-340%", d: 0 },
  { dx: "600%", dy: "-260%", d: 45 },
  { dx: "60%", dy: "620%", d: 90 },
];

/** The anticipation beat: a themed pre-glow gathers at the emblem's landing
 * spot and (for families without their own tell layer) three family-accent
 * motes converge on it. Mounted a beat BEFORE the template's strike. */
function TellCue({ kind, palette, delayMs }: { kind: FxKind; palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  const deep = kind === "curse" || kind === "ink" || kind === "lock";
  const glow = kind === "frost" || kind === "prism" || kind === "gaze" ? p0 : deep ? p2 : p1;
  const accent = FX_SPECS[kind].parts.accent;
  return (
    <span className="absolute inset-0 block" aria-hidden="true">
      <span
        className="bsp-t-glow absolute block rounded-full"
        style={{
          left: "41%",
          top: "38%",
          width: "18%",
          height: "18%",
          background: `radial-gradient(circle, ${tint(glow, 0.55)} 0%, ${tint(glow, 0)} 70%)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
      {!TELL_GLOW_ONLY.has(kind) &&
        TELL_MOTES.map((v, i) => (
          <span
            key={i}
            className="bsp-t-mote absolute block"
            style={
              {
                left: "48.75%",
                top: "45.75%",
                width: "2.5%",
                height: "2.5%",
                "--dx": v.dx,
                "--dy": v.dy,
                animationDelay: `${delayMs + v.d}ms`,
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

/** One distinctive extra layer for each of the seven biggest families
 * (rendered inside SceneFx, so leads only). Offsets are relative to the
 * strike start; negative offsets reach back into the tell beat, which is
 * safe because every lead's strike is already TELL_MS after cast. */
function familyLayer(kind: FxKind, palette: Palette, delayMs: number): ReactNode {
  const [p0, p1, p2] = palette;
  switch (kind) {
    case "ward":
      // Aegis clamp: two shield brackets slam shut around the sigil ring.
      return (
        <>
          <span className="bsp-x-clamp-l absolute block" style={{ left: "28.5%", top: "33%", width: "8%", height: "28%", animationDelay: `${delayMs + 60}ms` }}>
            <svg viewBox="0 0 10 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M8.6 2 C2.4 10 2.4 30 8.6 38" fill="none" stroke={tint(p1, 0.9)} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M8.6 2 C4.6 9.6 4.6 30.4 8.6 38" fill="none" stroke={tint(p0, 0.55)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bsp-x-clamp-r absolute block" style={{ left: "63.5%", top: "33%", width: "8%", height: "28%", animationDelay: `${delayMs + 100}ms` }}>
            <svg viewBox="0 0 10 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M1.4 2 C7.6 10 7.6 30 1.4 38" fill="none" stroke={tint(p1, 0.9)} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M1.4 2 C5.4 9.6 5.4 30.4 1.4 38" fill="none" stroke={tint(p0, 0.55)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
        </>
      );
    case "curse":
      // A dashed curse circle inscribes counter-clockwise during the tell.
      return (
        <span className="bsp-x-inscribe absolute block" style={{ left: "33.5%", top: "30.5%", width: "33%", height: "33%", animationDelay: `${delayMs - 240}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17.4" fill="none" stroke={tint(p1, 0.8)} strokeWidth="1.1" strokeDasharray="5 3.4" />
            <circle cx="20" cy="20" r="14.6" fill="none" stroke={tint(p0, 0.45)} strokeWidth="0.6" strokeDasharray="2 2.6" />
          </svg>
        </span>
      );
    case "chain":
      // Two ground-stakes slam down at the flanks, pinning the chain.
      return (
        <>
          {[0, 1].map((i) => (
            <span key={i} className="bsp-x-stake absolute block" style={{ left: i ? "66%" : "30.5%", top: "49%", width: "3.5%", height: "10%", animationDelay: `${delayMs + 120 + i * 110}ms` }}>
              <svg viewBox="0 0 8 22" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 2 V19 L2.4 16.4 M4 19 L5.6 16.4" fill="none" stroke={p1} strokeWidth="1.7" strokeLinecap="round" />
                <path d="M1 4 H7" fill="none" stroke={p0} strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </>
      );
    case "frost":
      // Hairline frost fingers creep inward from both flanks FIRST.
      return (
        <>
          <span className="bsp-x-creep absolute block" style={{ left: "27%", top: "40%", width: "14%", height: "9%", transformOrigin: "0% 50%", animationDelay: `${delayMs - 210}ms` }}>
            <svg viewBox="0 0 40 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0.8 6 H39 M10 6 L15 2.2 M18 6 L23 9.8 M27 6 L31 2.8" fill="none" stroke={tint(p0, 0.9)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bsp-x-creep absolute block" style={{ left: "59%", top: "45%", width: "14%", height: "9%", transformOrigin: "100% 50%", animationDelay: `${delayMs - 150}ms` }}>
            <svg viewBox="0 0 40 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M39.2 6 H1 M30 6 L25 9.8 M22 6 L17 2.2 M13 6 L9 9.2" fill="none" stroke={tint(p0, 0.9)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
        </>
      );
    case "glint":
      // A comet streak vaults the emblem along the movement arc.
      return (
        <span className="bsp-x-comet absolute block" style={{ left: "27%", top: "52%", width: "5%", height: "2%", animationDelay: `${delayMs + 80}ms` }}>
          <span
            className="absolute inset-0 block"
            style={{ background: `linear-gradient(90deg, ${tint(p1, 0)}, ${tint(p1, 0.9)} 70%, ${SHINE})`, borderRadius: "999px" }}
          />
        </span>
      );
    case "leap":
      // A rank of chevrons rolls across the ground line under the emblem.
      return (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bsp-x-chev absolute block" style={{ left: `${36 + i * 7}%`, top: "59.5%", width: "4.5%", height: "3.5%", animationDelay: `${delayMs + 140 + i * 110}ms` }}>
              <svg viewBox="0 0 10 8" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                <path d="M1.4 6.8 L5 1.2 L8.6 6.8" fill="none" stroke={i === 1 ? p0 : p1} strokeWidth="1.8" {...SJ} />
              </svg>
            </span>
          ))}
        </>
      );
    case "prism":
      // A vertical light seam opens during the tell, then snaps shut.
      return (
        <span
          className="bsp-x-seam absolute block"
          style={{
            left: "48.8%",
            top: "29%",
            width: "2.4%",
            height: "36%",
            background: `linear-gradient(180deg, ${tint(p0, 0)}, ${tint(p1, 0.85)}, ${tint(p0, 0)})`,
            borderRadius: "999px",
            animationDelay: `${delayMs - 230}ms`,
          }}
        />
      );
    default:
      return null;
  }
}

/** Deterministic launch directions (degrees + stagger ms) for the burst. */
const FX_DIRS = [
  { a: 12, d: 0 }, { a: 55, d: 35 }, { a: 98, d: 15 }, { a: 141, d: 50 },
  { a: 184, d: 25 }, { a: 227, d: 60 }, { a: 263, d: 8 }, { a: 306, d: 40 },
  { a: 338, d: 70 }, { a: 79, d: 80 },
];

const FX_DRIFT_XS = [31, 38, 45, 52, 59, 66, 35.5];

function SceneFx({ kind, palette, delayMs }: { kind: FxKind; palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  const s = FX_SPECS[kind];
  return (
    <span className="absolute inset-0 block" aria-hidden="true">
      {familyLayer(kind, palette, delayMs)}
      {s.front && (
        <span
          className="bsp-x-front absolute block"
          style={
            {
              left: "27%",
              top: `${47 - s.front.h / 2}%`,
              width: "46%",
              height: `${s.front.h}%`,
              background: `linear-gradient(90deg, transparent, ${tint(p1, 0.5)}, ${tint(p0, 0.32)}, transparent)`,
              "--fx": s.front.fx,
              "--fy": s.front.fy,
              "--frot": s.front.rot,
              animationDelay: `${delayMs}ms`,
            } as CSSProperties
          }
        />
      )}
      {Array.from({ length: s.rings ?? 0 }, (_, i) => (
        <span
          key={`r${i}`}
          className="bsp-x-ring absolute block rounded-full"
          style={{
            left: "29%",
            top: "26%",
            width: "42%",
            height: "42%",
            border: `3px solid ${tint(i % 2 ? p0 : p1, 0.8)}`,
            animationDelay: `${delayMs + 260 + i * 150}ms`,
          }}
        />
      ))}
      {s.beam && (
        <span
          className="bsp-x-beam absolute block"
          style={
            {
              left: "48.6%",
              top: "22%",
              width: "2.8%",
              height: "25%",
              background: `linear-gradient(180deg, ${tint(p1, 0.7)}, transparent)`,
              "--b0": s.beam[0],
              "--b1": s.beam[1],
              animationDelay: `${delayMs + 120}ms`,
            } as CSSProperties
          }
        />
      )}
      {FX_DIRS.slice(0, s.parts.n).map((v, i) => {
        const rad = (v.a * Math.PI) / 180;
        // travel is spec'd in canvas %, converted to own-size % (box is 2.2%)
        const dx = Math.round(((Math.cos(rad) * s.parts.spread) / 2.2) * 100);
        const dy = Math.round(((Math.sin(rad) * s.parts.spread * 0.72) / 2.2) * 100);
        return (
          <span
            key={`p${i}`}
            className="bsp-x-part absolute block"
            style={
              {
                left: "48.9%",
                top: "45.9%",
                width: "2.2%",
                height: "2.2%",
                "--dx": `${dx}%`,
                "--dy": `${dy}%`,
                "--rot": `${(i % 2 ? -1 : 1) * (140 + i * 25)}deg`,
                animationDelay: `${delayMs + 240 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              {shardShape(s.parts.accent, i % 3 === 1 ? p0 : p1, p2)}
            </svg>
          </span>
        );
      })}
      {s.drift &&
        FX_DRIFT_XS.slice(0, s.drift.n).map((x, i) => (
          <span
            key={`d${i}`}
            className="bsp-x-drift absolute block rounded-full"
            style={
              {
                left: `${x}%`,
                top: s.drift!.dy.startsWith("-") ? `${58 - (i % 3) * 4}%` : `${30 + (i % 3) * 4}%`,
                width: "1.4%",
                height: "1.4%",
                background: tint(i % 2 ? p0 : p1, 0.85),
                "--dy": s.drift!.dy,
                animationDelay: `${delayMs + 180 + i * 90}ms`,
              } as CSSProperties
            }
          />
        ))}
      {/* settle tail: a ground afterglow decays under the emblem while two
          dust motes lift away — no more hard cut at the end of the strike. */}
      <span
        className="bsp-x-after absolute block rounded-full"
        style={{
          left: "39%",
          top: "42%",
          width: "22%",
          height: "14%",
          background: `radial-gradient(circle, ${tint(p1, 0.45)} 0%, ${tint(p0, 0)} 70%)`,
          animationDelay: `${delayMs + 820}ms`,
        }}
      />
      {[0, 1].map((i) => (
        <span
          key={`s${i}`}
          className="bsp-x-dust absolute block rounded-full"
          style={{
            left: i ? "54.5%" : "44%",
            top: i ? "58%" : "56%",
            width: "1.5%",
            height: "1.5%",
            background: tint(i ? p0 : p1, 0.85),
            animationDelay: `${delayMs + 880 + i * 130}ms`,
          }}
        />
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
      <Emblem bold={bold} fx="ward" palette={palette} cls="bsp-settle" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="curse" palette={palette} cls="bsp-stamp" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="chain" palette={palette} cls="bsp-drop" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="frost" palette={palette} cls="bsp-spoke" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="stone" palette={palette} cls="bsp-shudder" delayMs={delayMs + 420}>
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
      <Emblem bold={bold} fx="glint" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="leap" palette={palette} cls="bsp-rise" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="muster" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="edict" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="draw" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="gaze" palette={palette} cls="bsp-blink" delayMs={delayMs} style={{ transformOrigin: "50% 50%" }}>
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
      <Emblem bold={bold} fx="lock" palette={palette} cls="bsp-drop" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="spirit" palette={palette} cls="bsp-lift" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="loot" palette={palette} cls="bsp-plop" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="clock" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="bell" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="grove" palette={palette} cls="bsp-facein" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="prism" palette={palette} cls="bsp-drop" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="banner" palette={palette} cls="bsp-drop" delayMs={delayMs}>
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
      <Emblem bold={bold} fx="ink" palette={palette} cls="bsp-blot" delayMs={delayMs}>
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

/** Template -> mechanic family, so B can theme the shared tell beat without
 * touching any template's signature. Mirrors each template's own `fx` prop. */
const FX_BY_TEMPLATE = new Map<ComponentType<TemplateProps>, FxKind>([
  [SigilRing, "ward"], [RuneStamp, "curse"], [ChainLash, "chain"], [ColdSnap, "frost"],
  [StoneShell, "stone"], [GlintArc, "glint"], [HoofSpring, "leap"], [PennantRaise, "muster"],
  [ScrollSnap, "edict"], [CardFlick, "draw"], [EyeBlink, "gaze"], [KeyTurn, "lock"],
  [LanternLift, "spirit"], [SatchelDrop, "loot"], [CogTick, "clock"], [BellToll, "bell"],
  [LeafSpin, "grove"], [PrismFlash, "prism"], [BannerMuster, "banner"], [InkSplash, "ink"],
]);

/** Bind a template + palette + the card's own face icon into a SigPlugin.
 * Leads open on the shared TellCue for TELL_MS, then the template's whole
 * choreography (strike + settle) plays shifted after it — three beats total.
 * Per-square TargetHits stay immediate (zone squares are followers). */
/** `signet` is the per-card STRUCTURAL variation (see Signet above): cards
 *  sharing a template used to trace geometrically identical scenes, and this is
 *  what separates them. It sits before `bold` in the argument list because the
 *  animation registry reads it straight out of this source file. */
function B(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  id: string,
  config: SigPlugin["config"],
  signet?: string,
  bold = false,
): SigPlugin {
  const def = BUFF_BY_ID[id];
  const Icon = def ? cardFaceIcon(id, def.category, def.icon) : undefined;
  return {
    config,
    Render: function BasicPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      if (!lead) return <Template palette={palette} Icon={Icon} bold={bold} lead={lead} delayMs={delayMs} />;
      const fx = FX_BY_TEMPLATE.get(Template) ?? "ward";
      return (
        <>
          <Stage>
            <TellCue kind={fx} palette={palette} delayMs={delayMs} />
          </Stage>
          <Template palette={palette} Icon={Icon} bold={bold} lead={lead} delayMs={delayMs + TELL_MS} />
          {/* Sibling of the emblem, NOT inside Stage: the stage canvas spans
              ~14 squares, so signet radii expressed there would throw the marks
              several squares off the board. Here the percentages are the cast
              square's own box, which is where a constellation around the emblem
              belongs. */}
          {signet && <Signet name={signet} palette={palette} delayMs={delayMs + TELL_MS} />}
        </>
      );
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {

  /* --- SigilRing --------------------------------------------------------- */
  // Cornerstone (t1 protection)
  cornerstone: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "cornerstone", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "aegis" }, "column3"),
  // Firm Footing (t1 protection)
  firm_footing: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "firm_footing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "cross3"),
  // Guarded King (t1 protection)
  guarded_king: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "guarded_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis" }, "column4"),
  // Holy Hell (t1 protection)
  holy_hell: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "holy_hell", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }, "spiral4"),
  // Loose Pawn (t1 protection)
  loose_pawn: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "loose_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }, "arc5"),
  // Pawn Shield (t1 protection)
  pawn_shield: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "pawn_shield", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "column5"),
  // Steady Hand (t1 protection)
  steady_hand: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "steady_hand", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis" }, "corners6"),
  // Bulwark (t2 protection)
  bulwark: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "bulwark", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "orbit3"),
  // Fork Guard (t2 protection)
  fork_guard: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "fork_guard", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "aegis" }, "orbit4"),
  // Reinforce (t2 protection)
  reinforce: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "reinforce", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "spiral5"),
  // Screen (t2 protection)
  screen: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "screen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, "cross5"),
  // Shielded Advance (t2 protection)
  shielded_advance: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "shielded_advance", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis" }, "orbit6"),
  // Sidestep King (t2 protection)
  sidestep_king: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "sidestep_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }, "column6"),
  // Chain Mail (t3 protection)
  chain_mail: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "chain_mail", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "arc3"),
  // Deflect (t3 protection)
  deflect: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "deflect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "corners3"),
  // Fortress (t3 protection)
  fortress: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "fortress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "arc4"),
  // Iron Bishop (t3 protection)
  iron_bishop: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "iron_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, "cross4"),
  // Phalanx (t3 protection)
  phalanx: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "phalanx", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "corners5"),
  // Sigil Ward (t3 protection)
  wa_sigil_ward: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "wa_sigil_ward", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "spiral6"),
  // Duelist (t4 protection)
  duelist: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "duelist", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, "spiral3", true),
  // Hold the Bridge (t4 protection)
  hold_the_bridge: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "hold_the_bridge", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }, "corners4", true),
  // Iron Wall (t4 protection)
  iron_wall: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "iron_wall", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "orbit5", true),
  // Shieldmaiden (t4 protection)
  shieldmaiden: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "shieldmaiden", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "arc6", true),
  // Warding Circle (t4 protection)
  warding_circle: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "warding_circle", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe" }, "cross6", true),
  // Watermelon Rind (t4 protection)
  watermelon_rind: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "watermelon_rind", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield" }, "orbit7", true),
  // High Ground (TIER 7 protection — bespoke full-board takeover, not a template)
  ww_high_ground: { config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis" }, Render: HighGroundTakeover },

  /* --- RuneStamp --------------------------------------------------------- */
  // Butterfingers (t1 hex)
  butterfingers: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades" }, "column3"),
  // Cold Feet (t1 hex)
  cold_feet: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "cold_feet", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }, "corners3"),
  // Crossed Wires (t1 hex)
  crossed_wires: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "crossed_wires", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }, "spiral3"),
  // Foggy Glasses (t1 hex)
  foggy_glasses: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "foggy_glasses", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades" }, "cross3"),
  // Royal Restraint (t1 hex)
  royal_restraint: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "royal_restraint", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades" }, "column4"),
  // Stage Fright (t1 hex)
  stage_fright: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "stage_fright", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", source: "slow" }, "orbit5"),
  // Blunted Lance (t2 hex)
  blunted_lance: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "blunted_lance", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }, "arc3"),
  // Lame Horses (t2 hex)
  lame_horses: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "lame_horses", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades" }, "arc4"),
  // Rusted Hinges (t2 hex)
  rusted_hinges: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "rusted_hinges", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "shades" }, "corners4"),
  // Safe Passage (t2 hex)
  safe_passage: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "safe_passage", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }, "spiral4"),
  // Timid King (t2 hex)
  timid_king: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "timid_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades" }, "arc5"),
  // Sown Salt (t3 hex)
  sown_salt: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "sown_salt", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades" }, "cross4"),
  // Backseat Driver (t3 hex)
  wc_backseat_driver: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "wc_backseat_driver", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", source: "slow" }, "column5"),
  // Atomic Captures (Small) (t4 attack)
  atomic_captures_small: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "atomic_captures_small", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "orbit3", true),
  // Hex Doll (t4 hex)
  hex_doll: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "hex_doll", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "orbit4", true),
  // Butterfingers (t4 hex)
  wc_butterfingers: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "wc_butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades" }, "corners5", true),
  // Backdraft (t4 attack)
  we_backdraft: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "we_backdraft", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "spiral5", true),

  /* --- ChainLash --------------------------------------------------------- */
  // Cold Open (t1 hex)
  cold_open: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "cold_open", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }, "orbit4"),
  // Heavy Boots (t1 hex)
  heavy_boots: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "heavy_boots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, "column4"),
  // Knock Knees (t1 hex)
  knock_knees: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "knock_knees", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }, "spiral4"),
  // Molasses (t1 hex)
  molasses: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "molasses", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }, "column5"),
  // Slippery Grip (t1 hex)
  slippery_grip: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "slippery_grip", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }, "orbit6"),
  // Stiff Joints (t1 hex)
  stiff_joints: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "stiff_joints", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }, "column6"),
  // Anchor (t2 protection)
  anchor: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "anchor", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "wall" }, "arc3"),
  // Butter Bishops (t2 hex)
  butter_bishops: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "butter_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }, "cross3"),
  // Leaden Queen (t2 hex)
  leaden_queen: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "leaden_queen", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }, "orbit5"),
  // Seized Axles (t2 hex)
  seized_axles: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "seized_axles", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }, "spiral5"),
  // Short Leash (t2 hex)
  short_leash: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "short_leash", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }, "cross5"),
  // Trench Line (t2 hex)
  trench_line: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "trench_line", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, "corners6"),
  // Anchored Rooks (t3 hex)
  anchored_rooks: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "anchored_rooks", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall" }, "column3"),
  // Blinkered Bishops (t3 hex)
  blinkered_bishops: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "blinkered_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall" }, "corners3"),
  // Leaden Crown (t3 hex)
  leaden_crown: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "leaden_crown", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall" }, "cross4"),
  // Magnet (t3 item)
  magnet: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "magnet", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "arc5"),
  // Pawn Nerf (t3 hex)
  pawn_nerf: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "pawn_nerf", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, "corners5"),
  // Pin Breaker (t3 movement)
  // Spooked Steeds (t3 hex)
  spooked_steeds: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "spooked_steeds", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }, "arc6"),
  // Static Field (t3 protection)
  we_static_field: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "we_static_field", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall" }, "cross6"),
  // Abandoned Post (t4 hex)
  abandoned_post: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "abandoned_post", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "orbit3", true),
  // Blockade (t4 tempo)
  blockade: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "blockade", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, "spiral3", true),
  // Frozen Furrows (t4 hex)
  frozen_furrows: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "frozen_furrows", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall" }, "arc4", true),
  // Heavy Shackles (t4 hex)
  heavy_shackles: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "heavy_shackles", { ordering: "radial", staggerMs: 0, victims: ["q","r"], hasLead: true, sound: "wall" }, "corners4", true),
  // Quicksand Patch (t4 tempo)
  wc_quicksand_patch: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "wc_quicksand_patch", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "walnut" }, "spiral6", true),

  /* --- ColdSnap ---------------------------------------------------------- */
  // Cold Snap (t1 hex)
  cold_snap: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "cold_snap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "arc3"),
  // Hard Reset (t2 hex)
  hard_reset: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "hard_reset", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "orbit4"),
  // Pinned Down (t2 hex)
  pinned_down: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "pinned_down", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "column4"),
  // Frost Nip (t2 tempo)
  we_frost_nip: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "we_frost_nip", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "cross5"),
  // Frost (t3 tempo)
  frost: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "corners3"),
  // Frostbite (t3 hex)
  frostbite: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "frostbite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "spiral3"),
  // Snap Freeze (t3 tempo)
  snap_freeze: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "snap_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "corners4"),
  // Twist the Knife (t3 hex)
  twist_the_knife: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "twist_the_knife", { ordering: "sweep", staggerMs: 60, victims: ["p","n","b","r","q"], hasLead: true, sound: "clockice", source: "slow" }, "spiral4"),
  // Stasis Field (t3 tempo)
  wa_stasis_field: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "wa_stasis_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "orbit5"),
  // Wall (t3 tempo)
  wall: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "wall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "arc5"),
  // Clumsy Dash (t3 tempo)
  wc_clumsy_dash: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "wc_clumsy_dash", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "column5"),
  // Slip on Ice (t3 tempo)
  wc_slip_on_ice: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "wc_slip_on_ice", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockice", source: "frozen" }, "corners5"),
  // Stage Fright (t3 hex)
  wc_stage_fright: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wc_stage_fright", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice" }, "spiral5"),
  // Cascade Freeze (t4 tempo)
  cascade_freeze: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "cascade_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice" }, "orbit3", true),
  // Cryostasis (t4 hex)
  cryostasis: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "cryostasis", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "column3", true),
  // Hard Frost (t4 hex)
  hard_frost: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "hard_frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "cross3", true),
  // Immobilizer (t4 tempo)
  immobilizer: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "immobilizer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen" }, "arc4", true),
  // Bind the Queen (t4 protection)
  wa_bind_the_queen: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wa_bind_the_queen", { ordering: "sweep", staggerMs: 60, victims: ["q"], hasLead: true, sound: "clockice", source: "frozen" }, "cross4", true),
  // Counter Charge (t4 tempo)
  ww_counter_charge: B(ColdSnap, ["#6fc3e8","#ffffff","#1d4560"], "ww_counter_charge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice" }, "orbit6", true),

  /* --- StoneShell -------------------------------------------------------- */
  // Gargoyles (t2 hex)
  gargoyles: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "gargoyles", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, "orbit3"),
  // Stone Hooves (t2 hex)
  stone_hooves: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "stone_hooves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, "column4"),
  // Gorgon's Glance (t3 hex)
  gorgons_glance: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "gorgons_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, "arc3"),
  // Hobbled Cavalry (t3 hex)
  hobbled_cavalry: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "hobbled_cavalry", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, "corners3"),
  // Petrified Towers (t3 hex)
  petrified_towers: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "petrified_towers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, "cross3"),
  // Granite Towers (t4 hex)
  granite_towers: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "granite_towers", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, "column3", true),
  // Ironbound Rook (t4 hex)
  ironbound_rook: B(StoneShell, ["#b0a68f","#e3ddd0","#4a4336"], "ironbound_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut" }, "spiral3", true),
  // Statue Stable (t4 hex)
  statue_stable: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "statue_stable", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, "orbit4", true),
  // Stone Clergy (t4 hex)
  stone_clergy: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "stone_clergy", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "walnut" }, "arc4", true),

  /* --- GlintArc ---------------------------------------------------------- */
  // Ferz King (t1 movement)
  ferz_king: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "ferz_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }, "arc3"),
  // Half Step (t1 movement)
  half_step: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "half_step", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "spiral3"),
  // Loyal Pawn (t1 pieces)
  loyal_pawn: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "loyal_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "orbit4"),
  // Quiet March (t1 movement)
  quiet_march: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "quiet_march", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "cross4"),
  // Rook Slide (t1 movement)
  rook_slide: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "rook_slide", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "column5"),
  // Sentinel Pawn (t1 attack)
  sentinel_pawn: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "sentinel_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "spiral5"),
  // Sidestep (t1 protection)
  sidestep: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "sidestep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "shield" }, "cross5"),
  // Tempo Shuffle (t1 movement)
  tempo_shuffle: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "tempo_shuffle", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "orbit6"),
  // Ghost Pawn (t2 movement)
  ghost_pawn: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ghost_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "column3"),
  // Pawn Push (t2 movement)
  pawn_push: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "pawn_push", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "arc4"),
  // Phase Rook (t2 movement)
  phase_rook: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "phase_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "column4"),
  // Reposition (t2 movement)
  reposition: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "reposition", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "empower" }, "arc5"),
  // Wazir Rook (t2 movement)
  wazir_rook: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "wazir_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "spiral6"),
  // Thunder Step (t2 movement)
  we_thunder_step: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "we_thunder_step", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "arc7"),
  // Grasshopper (t3 movement)
  grasshopper: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "grasshopper", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "coronation", source: "empower" }, "corners3"),
  // Promote Now (t3 pieces)
  promote_now: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "promote_now", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "corners4"),
  // Queen's Echo (t3 movement)
  queens_echo: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "queens_echo", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "spiral4"),
  // Rank Runner (t3 movement)
  rank_runner: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "rank_runner", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" }, "orbit5"),
  // Vanguard (t3 pieces)
  vanguard: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "vanguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "arc6"),
  // Transmute (t3 pieces)
  wa_transmute: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "wa_transmute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "corners6"),
  // Ball Lightning (t3 attack)
  we_ball_lightning: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "we_ball_lightning", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "cross6"),
  // River Flow (t3 movement)
  we_riverflow: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "we_riverflow", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "orbit7"),
  // Phalanx Advance (t3 movement)
  ww_phalanx_advance: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ww_phalanx_advance", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "column7"),
  // Changeling (t4 pieces)
  changeling: B(GlintArc, ["#6fe3ff","#ffffff","#1c3a4a"], "changeling", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" }, "orbit3", true),
  // Kingslide (t4 movement)
  kingslide: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "kingslide", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }, "cross3", true),
  // Royal Decree (t4 movement)
  royal_decree: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "royal_decree", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower" }, "corners5", true),
  // Arcane Conduit (t4 movement)
  wa_arcane_conduit: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "wa_arcane_conduit", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", source: "empower" }, "column6", true),

  /* --- HoofSpring -------------------------------------------------------- */
  // Bishop Polish (t1 movement)
  bishop_polish: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "bishop_polish", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "arc3"),
  // Diagonal Step (t1 movement)
  diagonal_step: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "diagonal_step", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", source: "empower" }, "cross3"),
  // Little Leap (t1 movement)
  little_leap: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "little_leap", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }, "cross4"),
  // Nudge (t1 attack)
  nudge: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column5"),
  // Camel Knight (t2 movement)
  camel_knight: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "camel_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "corners3"),
  // Long Knight (t2 movement)
  long_knight: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "long_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "orbit5"),
  // Mind Nudge (t2 attack)
  mind_nudge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "mind_nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "arc5"),
  // Rally (t2 movement)
  rally: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "rally", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "cross5"),
  // Spring Pawn (t2 movement)
  spring_pawn: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "spring_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }, "column6"),
  // Teleport Knight (t2 movement)
  teleport_knight: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "teleport_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "corners6"),
  // Vault (t2 movement)
  vault: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "vault", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }, "arc7"),
  // Wazir Bishop (t2 movement)
  wazir_bishop: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "wazir_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "spiral7"),
  // Kangaroo Hop (t2 movement)
  wc_kangaroo_hop: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "wc_kangaroo_hop", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "cross7"),
  // Updraft (t2 movement)
  we_updraft: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "we_updraft", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "orbit8"),
  // Bishop to Archbishop (t3 movement)
  bishop_archbishop: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "bishop_archbishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "orbit3"),
  // Board Quake (t3 attack)
  board_quake: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "board_quake", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column3"),
  // Cannon (t3 movement)
  cannon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "cannon", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }, "spiral3"),
  // Dragon Pawn (t3 movement)
  dragon_pawn: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "dragon_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }, "orbit4"),
  // Hunter Knight (t3 attack)
  hunter_knight: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "hunter_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "corners4"),
  // Knight to Nightrook (t3 movement)
  knight_nightrook: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "knight_nightrook", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "spiral4"),
  // Overclock (t3 movement)
  overclock: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "overclock", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "corners5"),
  // Rook to Chancellor (t3 movement)
  rook_chancellor: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "rook_chancellor", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", source: "empower" }, "orbit6"),
  // Sliding King (t3 movement)
  sliding_king: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "sliding_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", source: "empower" }, "arc6"),
  // Tidal Push (t3 attack)
  tidal_push: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "tidal_push", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "spiral6"),
  // Trampoline (t3 item)
  trampoline: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "trampoline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "cross6"),
  // Ghostwalk (t3 movement)
  wa_ghostwalk_bishop: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "wa_ghostwalk_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "corners7"),
  // Flank March (t3 movement)
  ww_flank_march: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "ww_flank_march", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "arc8"),
  // Forced Retreat (t3 tempo)
  ww_forced_retreat: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "ww_forced_retreat", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column8"),
  // Pontoon Bridge (t3 movement)
  ww_pontoon_bridge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "ww_pontoon_bridge", { ordering: "radial", staggerMs: 0, victims: ["r","b","q"], hasLead: true, sound: "blitz", source: "empower" }, "corners8"),
  // War Wagon (t3 movement)
  ww_war_wagon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "ww_war_wagon", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", source: "empower" }, "spiral8"),
  // Firecracker (t4 item)
  firecracker: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "firecracker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "arc4", true),
  // Giant Slayer (t4 attack)
  giant_slayer: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "giant_slayer", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", source: "empower" }, "column4", true),
  // Overrun (t4 attack)
  overrun: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "overrun", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "spiral5", true),
  // Twin Knights (t4 movement)
  twin_knights: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "twin_knights", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "orbit7", true),
  // Camel Rider (t4 movement)
  wa_camel_rider: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "wa_camel_rider", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", source: "empower" }, "column7", true),

  /* --- PennantRaise ------------------------------------------------------ */
  // Steady March (t1 movement)
  steady_march: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "steady_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, "column4"),
  // Counterstep (t2 tempo)
  counterstep: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "counterstep", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "rally" }, "column3"),
  // Double Step Army (t2 movement)
  double_step_army: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "double_step_army", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "corners3"),
  // Pawn Storm (t2 movement)
  pawn_storm: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "pawn_storm", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, "cross3"),
  // Pikemen (t2 movement)
  ww_pikemen: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "ww_pikemen", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "orbit5"),
  // Berolina Pawns (t3 movement)
  berolina_pawns: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "berolina_pawns", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "arc3"),
  // Momentum (t3 tempo)
  momentum: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "momentum", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "rally" }, "spiral3"),
  // Split March (t3 movement)
  split_march: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "split_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, "arc4"),
  // Moonwalk (t3 movement)
  wc_moonwalk: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "wc_moonwalk", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "spiral4"),
  // Army Reversal (t4 movement)
  army_reversal: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "army_reversal", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "orbit3", true),
  // Solstice (t4 tempo)
  solstice: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "solstice", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, "orbit4", true),
  // Chaos Reigns (t4 tempo)
  wc_chaos_reigns: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "wc_chaos_reigns", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain" }, "corners4", true),
  // Field Fortification (t4 movement)
  ww_field_fortification: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "ww_field_fortification", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", source: "empower" }, "cross4", true),

  /* --- ScrollSnap -------------------------------------------------------- */
  // Cut Purse (t2 hex)
  cut_purse: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "cut_purse", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "column3"),
  // Sealed Orders (t2 hex)
  sealed_orders: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "sealed_orders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "arc4"),
  // Royal Duty (t3 hex)
  royal_duty: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "royal_duty", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "snooze" }, "orbit4"),
  // Suppress Magic (t3 draft)
  wa_suppress_magic: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "wa_suppress_magic", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "cross4"),
  // Red Tape (t3 tempo)
  wc_red_tape: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "wc_red_tape", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", source: "slow" }, "orbit5"),
  // Burned Dispatches (t4 hex)
  burned_dispatches: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "burned_dispatches", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "orbit3", true),
  // Chain Nullify (t4 draft)
  chain_nullify: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "chain_nullify", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "arc3", true),
  // Dead Letter (t4 hex)
  dead_letter: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "dead_letter", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "corners3", true),
  // Mirror (t4 draft)
  mirror: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "mirror", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "spiral3", true),
  // Patch Notes (t4 hex)
  patch_notes: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "patch_notes", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "cross3", true),
  // Suppress (t4 draft)
  suppress: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "suppress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "column4", true),
  // Disrupt Ritual (t4 draft)
  wa_disrupt_ritual: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "wa_disrupt_ritual", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "corners4", true),
  // Jinx (t4 draft)
  wa_jinx: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "wa_jinx", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "spiral4", true),

  /* --- CardFlick --------------------------------------------------------- */
  // Prep (t1 draft)
  prep: B(CardFlick, ["#c9a0ff","#ffe9b0","#301c50"], "prep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "column3"),
  // Trade Up (t2 pieces)
  trade_up: B(CardFlick, ["#9b6bd1","#f2e0ff","#1e1038"], "trade_up", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "spiral3"),
  // Buff Thief (Minor) (t4 draft)
  buff_thief_minor: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "buff_thief_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "orbit3", true),
  // Hero's Journey (t4 draft)
  heros_journey: B(CardFlick, ["#8f6bff","#fff2c9","#22123e"], "heros_journey", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "arc3", true),
  // Recast (t4 draft)
  recast: B(CardFlick, ["#a880e8","#ffd23f","#261644"], "recast", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "corners3", true),
  // Disjunction (t4 draft)
  wa_disjunction: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "wa_disjunction", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "cross3", true),

  /* --- EyeBlink ---------------------------------------------------------- */
  // Extra Glance (t1 info)
  extra_glance: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "extra_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "arc3"),
  // Peek (t1 info)
  peek: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "peek", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "spiral3"),
  // Quick Glance (t1 info)
  quick_glance: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "quick_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "cross3"),
  // Scout (t1 info)
  scout: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "orbit4"),
  // Watchtower (t1 info)
  watchtower: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "watchtower", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "cross4"),
  // Draft Insight (t2 info)
  draft_insight: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "draft_insight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "orbit3"),
  // Oracle's Eye (t2 info)
  oracles_eye: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "oracles_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "corners3"),
  // Third Eye (t2 info)
  third_eye: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "third_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "arc4"),
  // North Star (t3 info)
  north_star: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "north_star", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "column3"),
  // Foresight (t3 info)
  wa_foresight: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "wa_foresight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "column4"),
  // Mind Read (t4 info)
  wa_mind_read: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "wa_mind_read", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "corners4", true),
  // Omniscience (t4 info)
  wa_omniscience: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "wa_omniscience", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" }, "spiral4", true),

  /* --- KeyTurn ----------------------------------------------------------- */
  // Castle Early (t1 movement)
  castle_early: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "castle_early", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "column3"),
  // Drawbridge (t1 hex)
  drawbridge: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "drawbridge", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "slow" }, "corners3"),
  // Toll Gate (t1 hex)
  toll_gate: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "toll_gate", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage" }, "corners4"),
  // Long Castle Anywhere (t2 movement)
  long_castle_anywhere: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "long_castle_anywhere", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "empower" }, "cross3"),
  // No Man's Land (t2 hex)
  no_mans_land: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "no_mans_land", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "orbit4"),
  // Shy Pieces (t2 hex)
  wc_shy_pieces: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "wc_shy_pieces", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "spiral4"),
  // Board Lock (t3 tempo)
  board_lock: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "board_lock", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", source: "slow" }, "orbit3"),
  // Bunker (t3 protection)
  bunker: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "bunker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "arc3"),
  // No Trespass (t3 hex)
  no_trespass: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "no_trespass", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "arc4"),
  // Flypaper File (t4 hex)
  flypaper_file: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "flypaper_file", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "spiral3", true),
  // Sealed Gate (t4 hex)
  sealed_gate: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "sealed_gate", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "column4", true),

  /* --- LanternLift ------------------------------------------------------- */
  // Second Wind (t1 pieces)
  second_wind: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "second_wind", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "spiral3"),
  // Minor Recall (t2 pieces)
  minor_recall: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "minor_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "orbit3"),
  // Regrow (t2 pieces)
  we_regrow: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "we_regrow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "arc4"),
  // Field Hospital (t2 pieces)
  ww_field_hospital: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "ww_field_hospital", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "corners4"),
  // Reclaim the Fallen (t2 pieces)
  ww_reclaim_the_fallen: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "ww_reclaim_the_fallen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "cross4"),
  // Seance (t3 pieces)
  seance: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "seance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "corners3"),
  // Second Wind Major (t3 pieces)
  second_wind_major: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "second_wind_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "cross3"),
  // Will-o'-Wisp (t3 tempo)
  will_o_wisp: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "will_o_wisp", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "frozen" }, "column4"),
  // Last Reserves (t3 pieces)
  ww_last_reserves: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "ww_last_reserves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "spiral4"),
  // Resurrect (t4 pieces)
  resurrect: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "resurrect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "arc3", true),
  // Resurrect Major (t4 pieces)
  resurrect_major: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "resurrect_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "column3", true),
  // Lost and Found (t4 pieces)
  wc_lost_and_found: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "wc_lost_and_found", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "orbit4", true),
  // Recommission (t4 pieces)
  ww_recommission: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "ww_recommission", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon" }, "orbit5", true),

  /* --- SatchelDrop ------------------------------------------------------- */
  // Walnut Shell (t1 item)
  walnut_shell: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "walnut_shell", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "corners4"),
  // Apple (t2 item)
  apple: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "apple", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "shield" }, "orbit3"),
  // Banana Peel (t2 item)
  banana_peel: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "banana_peel", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "arc3"),
  // Coconut Bonk (t2 item)
  coconut_bonk: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "coconut_bonk", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "frozen" }, "corners3"),
  // King's Guard (t2 pieces)
  kings_guard: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "kings_guard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "orbit4"),
  // Bodyguard (t3 pieces)
  bodyguard: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "bodyguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "column3"),
  // Split Bishop (t3 pieces)
  split_bishop: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "split_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "arc4"),
  // Sapper Team (t3 pieces)
  ww_sapper_team: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "ww_sapper_team", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "spiral4"),
  // Coffee (t4 item)
  coffee: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "coffee", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "spiral3", true),
  // Comet Shard (t4 pieces)
  comet_shard: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "comet_shard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "cross3", true),
  // Conjured Bishop (t4 pieces)
  wa_conjure_bishop: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "wa_conjure_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "column4", true),
  // Shieldbearers (t4 pieces)
  ww_shieldbearers: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "ww_shieldbearers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" }, "cross4", true),

  /* --- CogTick ----------------------------------------------------------- */
  // Free Retreat (t1 tempo)
  // Rewind One (t3 tempo)
  // Wasted Hour (t3 hex)
  wasted_hour: B(CogTick, ["#bf9c50","#9fdcf0","#362c1c"], "wasted_hour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", source: "stun" }, "column3"),
  // Lost Weekend (t4 hex)
  lost_weekend: B(CogTick, ["#b5924a","#8fe8ff","#302818"], "lost_weekend", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", source: "slow" }, "orbit3", true),
  // Borrowed Minute (t4 tempo)
  wa_borrowed_minute: B(CogTick, ["#d1aa5a","#7fd8e8","#3c3120"], "wa_borrowed_minute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage" }, "arc3", true),

  /* --- BellToll ---------------------------------------------------------- */
  // Deep Breath (t1 nerf)
  deep_breath: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "deep_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "corners3"),
  // Reprieve (t1 nerf)
  reprieve: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "reprieve", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "column4"),
  // Small Mercies (t1 nerf)
  small_mercies: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "small_mercies", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "cross4"),
  // Defiance (t2 nerf)
  defiance: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "defiance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "spiral3"),
  // Held Breath (t2 nerf)
  held_breath: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "held_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "orbit4"),
  // Hunter's Relief (t2 nerf)
  hunters_relief: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "hunters_relief", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "arc4"),
  // Loosen the Leash (t2 nerf)
  // Slack in the Chain (t2 nerf)
  slack_chain: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "slack_chain", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "spiral4"),
  // Break the Nerf (t3 nerf)
  break_the_nerf: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "break_the_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "arc3"),
  // Grace Period (t3 nerf)
  grace_period: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "grace_period", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "cross3"),
  // Half Measure (t3 nerf)
  // Piece Parole (t3 nerf)
  // Timely Lull (t3 nerf)
  timely_lull: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "timely_lull", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "orbit5"),
  // Underdog's Grit (t3 nerf)
  underdogs_grit: B(BellToll, ["#ffcf4d","#ffffff","#7a5c2e"], "underdogs_grit", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "arc5"),
  // Adrenaline (t4 nerf)
  adrenaline: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "adrenaline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "orbit3", true),
  // Counter-Nerf (t4 nerf)
  counter_nerf: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "counter_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "column3", true),
  // Respite (t4 nerf)
  respite: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "respite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral" }, "corners4", true),

  /* --- LeafSpin ---------------------------------------------------------- */
  // Durian (t3 hex)
  durian: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "durian", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }, "orbit3"),
  // Pixie Dust (t3 movement)
  pixie_dust: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "pixie_dust", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "empower" }, "column3"),
  // Seelie Blessing (t3 protection)
  seelie_blessing: B(LeafSpin, ["#559f55","#c0e57f","#1a3d1a"], "seelie_blessing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "shield" }, "spiral3"),
  // Bramble Wall (t3 protection)
  we_bramble_wall: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "we_bramble_wall", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "frozen" }, "orbit4"),
  // Creeping Roots (t3 protection)
  we_creeping_roots: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "we_creeping_roots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrifiedforest" }, "arc4"),
  // Seedlings (t3 pieces)
  we_seedlings: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "we_seedlings", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }, "column4"),
  // Faerie Ring (t4 hex)
  faerie_ring: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "faerie_ring", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest" }, "arc3", true),
  // Puck's Mischief (t4 hex)
  pucks_mischief: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "pucks_mischief", { ordering: "sweep", staggerMs: 60, victims: ["q","r"], hasLead: true, sound: "petrifiedforest", source: "slow" }, "corners3", true),
  // Ancient Grove (t4 pieces)
  we_ancient_grove: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "we_ancient_grove", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "summon" }, "cross3", true),

  /* --- PrismFlash -------------------------------------------------------- */
  // Escape Hatch (t1 movement)
  escape_hatch: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "escape_hatch", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "arc3"),
  // Piece Swap (t2 movement)
  piece_swap: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "piece_swap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "cross3"),
  // Recall (t2 movement)
  recall: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "orbit4"),
  // Regroup the Lines (t2 movement)
  ww_regroup_lines: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "ww_regroup_lines", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "orbit6"),
  // Guard Rotation (t3 movement)
  guard_rotation: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "guard_rotation", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "corners3"),
  // Blink (t3 movement)
  wa_blink: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "wa_blink", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "corners4"),
  // Warp Home (t3 movement)
  warp_home: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "warp_home", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "orbit5"),
  // Warp Step (t3 movement)
  warp_step: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "warp_step", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "corners5"),
  // Blink Army (t4 movement)
  blink_army: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "blink_army", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "orbit3", true),
  // Grand Recall (t4 movement)
  grand_recall: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "grand_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column3", true),
  // Mass Recall (t4 movement)
  mass_recall: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "mass_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "spiral3", true),
  // Regroup (t4 movement)
  regroup: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "regroup", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "arc4", true),
  // Total Recall (t4 movement)
  total_recall: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "total_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column4", true),
  // Fold Space (t4 movement)
  wa_swap_flanks: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "wa_swap_flanks", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "spiral4", true),
  // Warp Field (t4 movement)
  warp_field: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "warp_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "cross4", true),
  // Warp Reign (t4 protection)
  warp_reign: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "warp_reign", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "shield" }, "arc5", true),
  // Warp Rook (t4 movement)
  warp_rook: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "warp_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "column5", true),
  // Riptide (t4 movement)
  we_riptide: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "we_riptide", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "spiral5", true),
  // Undertow (t4 movement)
  we_undertow: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "we_undertow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" }, "cross5", true),

  /* --- BannerMuster ------------------------------------------------------ */
  // Decoy (t2 protection)
  // Regenerate (t3 pieces)
  regenerate: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "regenerate", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "column3"),
  // Summon Knight (t3 pieces)
  summon_knight: B(BannerMuster, ["#d1583a","#dfe5ee","#3a1a10"], "summon_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "corners3"),
  // Conjured Scout (t3 pieces)
  wa_conjure_scout: B(BannerMuster, ["#c94a3a","#d8dee9","#331410"], "wa_conjure_scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "spiral3"),
  // Outriders (t3 pieces)
  ww_outriders: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "ww_outriders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "orbit4"),
  // Mass Resurrect (t4 pieces)
  mass_resurrect: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "mass_resurrect", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "orbit3", true),
  // Phantom Rook (t4 pieces)
  phantom_rook: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "phantom_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "arc3", true),
  // Forward Observer (t4 pieces)
  ww_forward_observer: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "ww_forward_observer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "cross3", true),
  // Reserve Cavalry (t4 pieces)
  ww_reserve_cavalry: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "ww_reserve_cavalry", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", source: "summon" }, "arc4", true),

  /* --- InkSplash --------------------------------------------------------- */
  // Shadow Step (t2 movement)
  // Glamour (t3 pieces)
  glamour: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "glamour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "orbit3"),
  // Piece Steal (t3 pieces)
  piece_steal: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "piece_steal", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "arc3"),
  // Dominate (t4 pieces)
  wa_dominate_minor: B(InkSplash, ["#5b4a9f","#e8ddff","#0e0c1c"], "wa_dominate_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "column3", true),
  // Body Double (t4 pieces)
  wc_body_double: B(InkSplash, ["#8a70e0","#efe6ff","#181430"], "wc_body_double", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "corners3", true),
  // Defectors (t4 pieces)
  ww_defectors: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "ww_defectors", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "spiral3", true),
  // Mass Defection (t4 pieces)
  ww_mass_defection: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "ww_mass_defection", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" }, "cross3", true),
};
