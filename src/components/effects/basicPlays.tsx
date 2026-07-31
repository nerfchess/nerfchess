// Tier 1-4 plugin signatures, the "basic" band: every card not already covered
// by the core SIGNATURES table or the god / great / funny plugin sets gets a
// UNIQUE, name-matched play. See sigPlugins.tsx for the registry contract.
// Self-contained: own SVG, own CSS (basicPlays.css), transform/opacity only.
// Do NOT import from BoardEffects.tsx.
//
// THE PROBLEM THIS MODULE HAS TO ANSWER. Twenty micro-templates carry 296
// cards. Palette plus face icon used to be the only thing separating two cards
// on the same template, which is the "one scene in different colours" failure
// the whole animation overhaul exists to fix. Three axes now keep them apart,
// and only the first is shared:
//
//   template  the ACTION: what happens to the square (a ward settles, a rune
//             stamps, a chain pulls taut). Assigned by mechanic family.
//   device    the SUBJECT: the card's OWN object, sitting at the heart of the
//             scene on its own beat and its own motion. An anvil thumps down,
//             a lantern lifts, a weathervane spins, a wax seal presses. There
//             are 46, each declared per card in PLAYS, and a device is never
//             reused inside one template group, so no two cards sharing a
//             template play the same scene.
//   face icon the card's globally unique lucide glyph (cardFaceIcon).
//
// STAGING (docs/animation-design-brief.md sections 0 / 0b / 0c). Every card
// declares an anchor derived from what it actually does (scripts/lib/
// anchor-rule.ts): a card that changes a rule for the whole army is "board", a
// card that lands on one piece or square is "cast", a card that reaches a named
// few is "aim". The action is staged on BoardWideStage, so a cast-anchored play
// happens where it was played; the only board-scale layers in the module (the
// tint wash and the horizon rail) live inside <BoardFrame>, so they stay exact
// at any anchor.
//
// THREE BEATS, THREE ROLES. Every template runs tell -> strike -> settle in
// all three roles ("lead", "target", "entrance"), and at least one layer of
// every scene is driven by the geometry custom properties: the horizon rail
// leans to the caster's side (--fx-side), the reach line runs the play's own
// leg (--fx-len), the per-square hit arrives from the caster's edge.
//
//   SigilRing    a warding ring settles and its ticks kindle (protections)
//   RuneStamp    a jagged curse rune stamps down and drips (muzzle hexes)
//   ChainLash    a chain whips across and pulls taut (jails / anchors / caps)
//   ColdSnap     frost spokes reach out, icy motes pop (freezes)
//   StoneShell   two granite half-shells slam shut (walnuts / petrify)
//   GlintArc     a glint trail arcs over the emblem (slider / step grants)
//   HoofSpring   a spring coils and launches, dust kicks (leaps / shoves)
//   PennantRaise a pole shoots up, its pennant snaps out (musters / marches)
//   ScrollSnap   an edict unrolls, is read, snaps shut (draft denial)
//   CardFlick    a card flips face-up off the deck (own draft tricks)
//   EyeBlink     an eye opens, looks, blinks shut (info reveals)
//   KeyTurn      a key turns in a lock plate (castling bans / sealed gates)
//   LanternLift  a grave-lantern lifts, motes rise (revives / returns)
//   SatchelDrop  a satchel plops down, flap pops (pocket grants / items)
//   CogTick      a gear ring ticks a quarter turn (clock / undo / skips)
//   BellToll     a small bell swings twice (nerf-relief cards)
//   LeafSpin     leaves orbit a growing sprout (nature / fae / fruit)
//   PrismFlash   a prism drops and fans light (teleports / swaps / warps)
//   BannerMuster a standard drops in and unfurls (summons / deployments)
//   InkSplash    an ink blot blooms over the mark (conversions / steals)
//
// SOLE EXCEPTION: ww_high_ground is a TIER 7 card living in this module, so it
// gets a bespoke scene (HighGroundTakeover, below the templates). Its rule
// picks ONE of your pieces, so it is cast-anchored like the rest: the ziggurat
// heaves up under that piece rather than in the middle of the board, and only
// its tint and rim ride the board frame.
//
// The CARD -> TEMPLATE / PALETTE / DEVICE table lives in the PLAYS registry at
// the bottom of this file, one entry per still-uncovered card.

import "./basicPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { cardFaceIcon } from "@/lib/cardIcon";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardFrame, BoardWideStage } from "./stage";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  Icon: LucideIcon | undefined;
  bold: boolean;
  lead: boolean;
  role: SigRole;
  /** The card's own central object (see DEVICES). */
  device: DeviceKind;
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

/** Warm white. Never pure #fff (house rule: whites are warm). */
const SHINE = "rgba(255,247,224,0.85)";

/* --- Staging -----------------------------------------------------------------
   The lead stage: the board's own atmosphere behind action that happens on the
   square the card was cast on.

   The wash and the rail are the module's ONLY board-scale layers, and both sit
   inside <BoardFrame>, whose 0..100% is exactly the board at any anchor. A
   fixed percentage of the canvas would mean "the board" only for a board-
   anchored scene, and 206 of these cards are now cast-anchored.

   The rail is also the module's shared geometry layer: it leans to the CASTER's
   own edge (--fx-side), so the same card played by the two players tips the
   opposite way instead of both reading as "the bottom of the board". */
function Stage({
  palette,
  delayMs,
  children,
}: {
  palette: Palette;
  delayMs: number;
  children: ReactNode;
}) {
  const [p0, p1] = palette;
  return (
    <BoardWideStage>
      <BoardFrame>
        <span
          className="bsp-wash absolute inset-0 block"
          style={{
            background: `radial-gradient(circle at 50% 48%, ${tint(p1, 0.22)} 0%, ${tint(p0, 0.1)} 46%, transparent 70%)`,
            animationDelay: `${delayMs}ms`,
          }}
        />
        <span
          className="bsp-rail absolute block"
          style={{
            left: "0%",
            top: "47%",
            width: "100%",
            height: "1.6%",
            background: `linear-gradient(90deg, transparent, ${tint(p0, 0.7)}, transparent)`,
            animationDelay: `${delayMs + 120}ms`,
          }}
        />
      </BoardFrame>
      {children}
    </BoardWideStage>
  );
}

/** The local (one-square) cut used by the target hit and the hand entrance. */
function Cut({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      {children}
    </span>
  );
}

/* =============================================================================
   Devices: the per-card central object.

   A template says what HAPPENS; a device says what it happens TO. Every card in
   PLAYS names one, no two cards in a template group share one, and the device
   brings its own arrival motion (`m`) so two cards on the same template differ
   in silhouette AND in timing, not only in hue.
   ========================================================================== */

type DeviceMotion = "set" | "rise" | "turn" | "swing" | "pop";

interface DeviceSpec {
  m: DeviceMotion;
  art: (p: Palette) => ReactNode;
}

/** Stroked outline in the deep accent, filled in a palette colour. */
const dv = (d: string, fill: string, stroke: string, w = 1.1): ReactNode => (
  <path d={d} fill={fill} stroke={stroke} strokeWidth={w} {...SJ} />
);
/** A bare stroke (bands, laces, spokes). */
const dl = (d: string, stroke: string, w = 1.2): ReactNode => (
  <path d={d} fill="none" stroke={stroke} strokeWidth={w} {...SJ} />
);

const DEVICES = {
  anvil: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M3 8h18l-3 4h-3l1.4 5H7.6L9 12H6z", a, c)}{dv("M8 17h8v3H8z", b, c)}</>) },
  lantern: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M7 6h10v12H7z", b, c)}{dl("M11 1h2M12 1v3", a, 1.4)}{dv("M6 18h12v2.4H6z", a, c)}</>) },
  helm: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M5 12a7 7 0 0 1 14 0v7H5z", a, c)}{dv("M8 12h8v3.4H8z", c, b)}</>) },
  boot: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M8 3h4.4v11H19v6H8z", a, c)}{dv("M6.6 19h13v2.6h-13z", b, c)}</>) },
  keystone: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M6 20h12L15 4H9z", a, c)}{dl("M9.6 9h4.8M9.2 14h5.6", b)}</>) },
  gauntlet: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M7 8h7l3.4 3.4V20H7z", a, c)}{dl("M9 11.6h6M9 15h6", b)}</>) },
  torch: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M10.8 9h2.4v13h-2.4z", c, a)}{dv("M12 1c2.6 3.6 4 5.4 4 7.2a4 4 0 0 1-8 0C8 6.4 9.4 4.6 12 1z", b, a)}</>) },
  hourglass: { m: "turn", art: ([a, b, c]: Palette) => (<>{dv("M6 3h12l-6 9 6 9H6l6-9z", b, c)}{dl("M5 2.4h14M5 21.6h14", a, 1.6)}</>) },
  anchor: { m: "set", art: ([a, b, c]: Palette) => (<>{dl("M12 5v15M8.4 8h7.2", a, 1.6)}{dl("M4 13.4c0 4.4 4 6.8 8 6.8s8-2.4 8-6.8", b, 1.6)}</>) },
  compass: { m: "turn", art: ([a, b, c]: Palette) => (<><circle cx="12" cy="12" r="9" fill={tint(c, 0.85)} stroke={a} strokeWidth="1.2" />{dv("M12 5.4l3 9.4-3-2.2-3 2.2z", b, a)}</>) },
  quill: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M4 20.6C8 12 14 4.6 20.4 2.6c.4 7.4-5 13.6-12.6 15.8z", b, c)}{dl("M5.6 19L18 5", a)}</>) },
  inkpot: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M5.6 11h12.8v9.4H5.6z", c, a)}{dv("M9 5.4h6V11H9z", a, c)}</>) },
  drum: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M4 8h16v9.6H4z", a, c)}{dl("M4.6 8.4l14.8 8.8M19.4 8.4L4.6 17.2", b)}</>) },
  warhorn: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M3 16.4c5.4 3 12.6 2.2 17.6-7-4.4 1.2-8.6.2-11.6 2.2S4 15.4 3 16.4z", a, c)}{dl("M6.6 14.4c3-1 5.4-2.6 7.4-5", b)}</>) },
  buckler: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M12 2.6l8 3v6.2c0 5.2-4 8.4-8 9.6-4-1.2-8-4.4-8-9.6V5.6z", a, c)}<circle cx="12" cy="11" r="3" fill={b} /></>) },
  spear: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M12 1l3.2 6.4L12 11 8.8 7.4z", b, c)}{dv("M11.1 10h1.8v13h-1.8z", a, c, 0.8)}</>) },
  arrowhead: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M12 2l6.4 13.4L12 12.2 5.6 15.4z", a, c)}{dl("M12 12.6V22", b, 1.4)}</>) },
  caltrop: { m: "set", art: ([a, b, c]: Palette) => (<>{dl("M12 3.4v17M4.6 19.6L19.4 7.4M19.4 19.6L4.6 7.4", a, 1.7)}<circle cx="12" cy="12" r="2.2" fill={b} /></>) },
  brazier: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M5.6 12.4h12.8L16 21H8z", c, a)}{dv("M9 10c1.2-2.2 2-2.4 3-4.6 1 2.2 1.8 2.4 3 4.6z", b, a)}</>) },
  chalice: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M6 3.6h12l-4.4 8.4v5.4h3.4v3H7v-3h3.4V12z", a, c)}{dl("M8 6.6h8", b)}</>) },
  crown: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M3.6 19h16.8l1-11.6-5.4 4.2L12 5.2l-4 6.4-5.4-4.2z", a, c)}<circle cx="12" cy="15" r="1.8" fill={b} /></>) },
  mask: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M5 4.6h14v8.6c0 4.4-4 6.6-7 6.6s-7-2.2-7-6.6z", c, a)}{dl("M8.6 10.4h2M13.4 10.4h2", b, 1.5)}</>) },
  mirror: { m: "turn", art: ([a, b, c]: Palette) => (<><ellipse cx="12" cy="9.6" rx="6.4" ry="7.6" fill={tint(b, 0.7)} stroke={a} strokeWidth="1.3" />{dv("M10.8 16.6h2.4V22h-2.4z", a, c, 0.8)}</>) },
  bellows: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M3.4 12l11.6-6.4v13z", a, c)}{dv("M15 10.6h6v3h-6z", b, c, 0.9)}</>) },
  hammer: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M4.6 4h11v5.4h-11z", a, c)}{dv("M8.8 9.4h2.6V22H8.8z", c, b, 0.9)}</>) },
  sickle: { m: "turn", art: ([a, b, c]: Palette) => (<>{dl("M4 20.6C4 9.4 12 3 21.4 3c-2.2 8.4-8.4 12.6-14.6 12.6", a, 2)}{dv("M3 19.4l4.4-2.2 1.4 2.6L4.4 22z", b, c, 0.9)}</>) },
  acorn: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M6 8.6h12l-1.2-3.4H7.2z", a, c)}{dv("M7 8.6h10c0 7.4-3 11.6-5 11.6s-5-4.2-5-11.6z", b, c)}</>) },
  thorn: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M12 1.6l3 10.4-3 10-3-10z", a, c)}{dl("M9.4 9.4L4 11.4M14.6 9.4L20 11.4", b, 1.4)}</>) },
  toadstool: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M3 12.6C3 8 7 4.6 12 4.6S21 8 21 12.6z", a, c)}{dv("M9.8 12.6h4.4v8.6H9.8z", b, c)}</>) },
  feather: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M6 21.4C10 12.6 15 5 20.4 2.6c1.2 8.2-4 15.6-11.4 17.4z", b, c)}{dl("M6.4 21L19.6 3.4", a)}</>) },
  beehive: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M4 20.4h16c0-9.4-3.2-14.8-8-14.8S4 11 4 20.4z", a, c)}{dl("M6 12.4h12M4.8 16.6h14.4", b)}</>) },
  candle: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M9.2 8.4h5.6V21H9.2z", b, c)}{dv("M12 1.4c1.7 2.6 2.7 3.6 2.7 4.9a2.7 2.7 0 0 1-5.4 0c0-1.3 1-2.3 2.7-4.9z", a, c)}</>) },
  hand_bell: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M5.6 17.4c0-7.4 2.2-11.6 6.4-11.6s6.4 4.2 6.4 11.6z", a, c)}{dv("M4 17.4h16v2.4H4z", b, c, 0.9)}</>) },
  padlock: { m: "set", art: ([a, b, c]: Palette) => (<>{dl("M8 10.4V7.2a4 4 0 0 1 8 0v3.2", a, 1.7)}{dv("M5 10.4h14v10.8H5z", c, b)}</>) },
  cogwheel: { m: "turn", art: ([a, b, c]: Palette) => (<><circle cx="12" cy="12" r="7.4" fill={tint(c, 0.85)} stroke={a} strokeWidth="1.6" />{dl("M12 1.6v3.4M12 19v3.4M1.6 12h3.4M19 12h3.4", a, 1.8)}</>) },
  spool: { m: "turn", art: ([a, b, c]: Palette) => (<>{dv("M5.6 3h12.8v2.6H5.6zM5.6 18.4h12.8V21H5.6z", a, c, 0.9)}{dv("M9.6 5.6h4.8v12.8H9.6z", b, c)}</>) },
  dice: { m: "turn", art: ([a, b, c]: Palette) => (<>{dv("M4.4 4.4h15.2v15.2H4.4z", b, c)}<circle cx="8.6" cy="8.6" r="1.5" fill={a} /><circle cx="15.4" cy="15.4" r="1.5" fill={a} /><circle cx="12" cy="12" r="1.5" fill={a} /></>) },
  coin: { m: "turn", art: ([a, b, c]: Palette) => (<><circle cx="12" cy="12" r="8.6" fill={a} stroke={c} strokeWidth="1.2" /><circle cx="12" cy="12" r="4.6" fill="none" stroke={b} strokeWidth="1.4" /></>) },
  ledger: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M5 3h10.6L19 6.4V21H5z", b, c)}{dl("M8 9.4h8M8 13h8M8 16.6h5", a)}</>) },
  waxseal: { m: "pop", art: ([a, b, c]: Palette) => (<><circle cx="12" cy="10.4" r="6.4" fill={a} stroke={c} strokeWidth="1.2" />{dv("M7.6 15.6L5.4 22 12 19l6.6 3-2.2-6.4z", b, c, 0.9)}</>) },
  pylon: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M12 2l7.4 19.4H4.6z", c, a)}{dl("M8 14.4h8M9.6 9.4h4.8", b, 1.4)}</>) },
  obelisk: { m: "rise", art: ([a, b, c]: Palette) => (<>{dv("M9.6 4h4.8L15.6 21H8.4z", a, c)}{dv("M12 1l2.6 3H9.4z", b, c, 0.9)}</>) },
  cairn: { m: "set", art: ([a, b, c]: Palette) => (<>{dv("M5.4 17h13.2v4.4H5.4z", c, a)}{dv("M7.4 11.4h9.2V17H7.4z", a, c)}{dv("M9.6 5.6h4.8v5.8H9.6z", b, c)}</>) },
  buoy: { m: "pop", art: ([a, b, c]: Palette) => (<>{dv("M12 2.6l5.4 12.4H6.6z", a, c)}{dv("M5.6 15h12.8v3.6H5.6z", b, c, 0.9)}</>) },
  kite: { m: "swing", art: ([a, b, c]: Palette) => (<>{dv("M12 1.6l7 8.4-7 11.4-7-11.4z", a, c)}{dl("M5 10h14M12 1.6V21.4", b)}</>) },
  weathervane: { m: "turn", art: ([a, b, c]: Palette) => (<>{dv("M4 6.4h11.4L12 2.8h5.4L21 6.4l-3.6 3.6H12l3.4-3.6z", a, c, 0.9)}{dv("M11.1 6.4h1.8V22h-1.8z", c, b, 0.8)}</>) },
} satisfies Record<string, DeviceSpec>;

type DeviceKind = keyof typeof DEVICES;

/** The card's own object, arriving on its own motion at its own beat. */
function Device({
  kind,
  palette,
  delayMs,
  l = 38,
  t = 36,
  s = 26,
}: {
  kind: DeviceKind;
  palette: Palette;
  delayMs: number;
  l?: number;
  t?: number;
  s?: number;
}) {
  const spec = DEVICES[kind];
  return (
    <span
      className={`bsp-dv-${spec.m} absolute block`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${s}%`, height: `${s}%`, animationDelay: `${delayMs}ms` }}
    >
      <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
        {spec.art(palette)}
      </svg>
    </span>
  );
}

/* --- The card's face icon -------------------------------------------------- */

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
   square-local and cheap: an under-glow arriving from the CASTER's own edge
   (--fx-side, via bsp-hitside), the card's glyph popping, a small ring, and
   two template-flavoured shards on the settle. */

type HitAccent = "spark" | "frost" | "stone" | "leaf" | "mote" | "link";

const HIT_SHARDS = [
  { dx: "150%", dy: "-130%", rot: "130deg", d: 0 },
  { dx: "-145%", dy: "-105%", rot: "-150deg", d: 40 },
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
    <Cut>
      <span
        className="bsp-hitside absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.4), animationDelay: `${delayMs}ms` }}
      />
      <span
        className="bsp-pop absolute block"
        style={{ left: "22%", top: "20%", width: "56%", height: "56%", animationDelay: `${delayMs + 120}ms` }}
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
        style={{ left: "11%", top: "11%", width: "78%", height: "78%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: `${delayMs + 220}ms` }}
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
              animationDelay: `${delayMs + 380 + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            {shardShape(accent, i === 1 ? p0 : p1, p2)}
          </svg>
        </span>
      ))}
    </Cut>
  );
}

/* --- The hand entrance -------------------------------------------------------
   The card ARRIVING in a hand (draft pick, steal, grant), at ~56% of the crop:
   same palette and same central object as the play, no board takeover, its own
   short arrival beat. The device is what carries the identity across, which is
   exactly what it is for. */

function Entrance({
  fx,
  palette,
  Icon,
  device,
  delayMs,
}: {
  fx: FxKind;
  palette: Palette;
  Icon: LucideIcon | undefined;
  device: DeviceKind;
  delayMs: number;
}) {
  const [p0, p1, p2] = palette;
  const s = FX_SPECS[fx];
  return (
    <Cut>
      <span
        className="bsp-ent-glow absolute block rounded-full"
        style={{
          left: "22%",
          top: "22%",
          width: "56%",
          height: "56%",
          background: `radial-gradient(circle, ${tint(p1, 0.5)} 0%, ${tint(p2, 0)} 70%)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
      <Device kind={device} palette={palette} delayMs={delayMs + 140} l={22} t={20} s={56} />
      <Face Icon={Icon} color={p1} delayMs={delayMs + 420} left={38} top={38} size={24} strokeWidth={2.2} />
      <span
        className="bsp-ent-mote absolute block"
        style={{ left: "62%", top: "22%", width: "12%", height: "12%", animationDelay: `${delayMs + 640}ms` }}
      >
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          {shardShape(s.parts.accent, p0, p2)}
        </svg>
      </span>
    </Cut>
  );
}

/* --- Spectacle layer ----------------------------------------------------------
   The choreography staged BEHIND the emblem, themed by the template's mechanic
   family: a pre-glow tell, the family's own distinctive layer, a shock ring or
   a directional front or a reach line, a short particle burst, and a decaying
   settle tail.

   Node budget: a lead scene runs 14-18 animated nodes. The old cut fired up to
   ten burst particles plus seven ambient motes per play, which was most of the
   count and none of the character, so the particles are capped at three and the
   ambient drift is gone; the family layer and the card's device do the work
   those motes were pretending to do. */

type FxKind =
  | "ward" | "curse" | "chain" | "frost" | "stone" | "glint" | "leap"
  | "muster" | "edict" | "draw" | "gaze" | "lock" | "spirit" | "loot"
  | "clock" | "bell" | "grove" | "prism" | "banner" | "ink";

interface FxSpec {
  /** tilted gradient band crossing the crop: band tilt + travel vector */
  front?: { rot: string; fx: string; fy: string; h: number };
  /** shock rings (0-2) */
  rings?: number;
  /** pivoting light shaft: start/end rotation */
  beam?: [string, string];
  parts: { accent: HitAccent; spread: number };
}

const FX_SPECS: Record<FxKind, FxSpec> = {
  ward:   { parts: { accent: "spark", spread: 11 } },
  curse:  { front: { rot: "0deg", fx: "0%", fy: "140%", h: 6 }, parts: { accent: "stone", spread: 12 } },
  chain:  { parts: { accent: "link", spread: 12 } },
  frost:  { parts: { accent: "frost", spread: 12 } },
  stone:  { rings: 1, parts: { accent: "stone", spread: 13 } },
  glint:  { parts: { accent: "spark", spread: 12 } },
  leap:   { parts: { accent: "spark", spread: 12 } },
  muster: { front: { rot: "0deg", fx: "0%", fy: "-120%", h: 5 }, rings: 1, parts: { accent: "spark", spread: 11 } },
  edict:  { front: { rot: "0deg", fx: "125%", fy: "0%", h: 7 }, rings: 1, parts: { accent: "mote", spread: 10 } },
  draw:   { front: { rot: "16deg", fx: "115%", fy: "-24%", h: 4 }, rings: 1, parts: { accent: "mote", spread: 12 } },
  gaze:   { beam: ["-58deg", "58deg"], rings: 1, parts: { accent: "spark", spread: 10 } },
  lock:   { front: { rot: "90deg", fx: "0%", fy: "130%", h: 4 }, rings: 1, parts: { accent: "link", spread: 11 } },
  spirit: { beam: ["-20deg", "20deg"], rings: 1, parts: { accent: "mote", spread: 10 } },
  loot:   { rings: 1, parts: { accent: "spark", spread: 13 } },
  clock:  { beam: ["0deg", "300deg"], rings: 1, parts: { accent: "mote", spread: 10 } },
  bell:   { rings: 1, parts: { accent: "spark", spread: 11 } },
  grove:  { front: { rot: "4deg", fx: "0%", fy: "-110%", h: 6 }, rings: 1, parts: { accent: "leaf", spread: 12 } },
  prism:  { beam: ["-64deg", "64deg"], parts: { accent: "spark", spread: 13 } },
  banner: { front: { rot: "0deg", fx: "0%", fy: "-130%", h: 5 }, rings: 1, parts: { accent: "spark", spread: 12 } },
  ink:    { front: { rot: "-18deg", fx: "120%", fy: "26%", h: 7 }, rings: 1, parts: { accent: "mote", spread: 12 } },
};

/** How long the anticipation beat holds before the strike phase begins. */
const TELL_MS = 240;

/** One distinctive extra layer for each of the seven biggest families
 * (rendered inside SceneFx, so leads only). Offsets are relative to the
 * strike start; negative offsets reach back into the tell beat. */
function familyLayer(kind: FxKind, palette: Palette, delayMs: number): ReactNode {
  const [p0, p1, p2] = palette;
  switch (kind) {
    case "ward":
      // Aegis clamp: two shield brackets slam shut around the sigil ring.
      return (
        <>
          <span className="bsp-x-clamp-l absolute block" style={{ left: "32%", top: "36%", width: "6%", height: "22%", animationDelay: `${delayMs + 60}ms` }}>
            <svg viewBox="0 0 10 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M8.6 2 C2.4 10 2.4 30 8.6 38" fill="none" stroke={tint(p1, 0.9)} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M8.6 2 C4.6 9.6 4.6 30.4 8.6 38" fill="none" stroke={tint(p0, 0.55)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bsp-x-clamp-r absolute block" style={{ left: "62%", top: "36%", width: "6%", height: "22%", animationDelay: `${delayMs + 100}ms` }}>
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
        <span className="bsp-x-inscribe absolute block" style={{ left: "36.5%", top: "33.5%", width: "27%", height: "27%", animationDelay: `${delayMs - 220}ms` }}>
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
            <span key={i} className="bsp-x-stake absolute block" style={{ left: i ? "63%" : "34%", top: "49%", width: "3%", height: "9%", animationDelay: `${delayMs + 120 + i * 110}ms` }}>
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
          <span className="bsp-x-creep absolute block" style={{ left: "31%", top: "41%", width: "11%", height: "8%", transformOrigin: "0% 50%", animationDelay: `${delayMs - 200}ms` }}>
            <svg viewBox="0 0 40 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0.8 6 H39 M10 6 L15 2.2 M18 6 L23 9.8 M27 6 L31 2.8" fill="none" stroke={tint(p0, 0.9)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bsp-x-creep absolute block" style={{ left: "58%", top: "45%", width: "11%", height: "8%", transformOrigin: "100% 50%", animationDelay: `${delayMs - 140}ms` }}>
            <svg viewBox="0 0 40 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M39.2 6 H1 M30 6 L25 9.8 M22 6 L17 2.2 M13 6 L9 9.2" fill="none" stroke={tint(p0, 0.9)} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
        </>
      );
    case "glint":
      // A comet streak vaults the emblem along the movement arc.
      return (
        <span className="bsp-x-comet absolute block" style={{ left: "33%", top: "52%", width: "4%", height: "1.6%", animationDelay: `${delayMs + 80}ms` }}>
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
          {[0, 1].map((i) => (
            <span key={i} className="bsp-x-chev absolute block" style={{ left: `${41 + i * 7}%`, top: "58.5%", width: "4%", height: "3%", animationDelay: `${delayMs + 140 + i * 120}ms` }}>
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
            left: "49%",
            top: "33%",
            width: "2%",
            height: "28%",
            background: `linear-gradient(180deg, ${tint(p0, 0)}, ${tint(p1, 0.85)}, ${tint(p0, 0)})`,
            borderRadius: "999px",
            animationDelay: `${delayMs - 210}ms`,
          }}
        />
      );
    default:
      return null;
  }
}

/** Deterministic launch directions (degrees + stagger ms) for the burst. */
const FX_DIRS = [
  { a: 24, d: 0 }, { a: 196, d: 60 },
];

function SceneFx({ kind, palette, delayMs }: { kind: FxKind; palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  const s = FX_SPECS[kind];
  const deep = kind === "curse" || kind === "ink" || kind === "lock";
  const glow = kind === "frost" || kind === "prism" || kind === "gaze" ? p0 : deep ? p2 : p1;
  return (
    <span className="absolute inset-0 block" aria-hidden="true">
      {/* tell: the themed pre-glow gathering where the emblem will land */}
      <span
        className="bsp-t-glow absolute block rounded-full"
        style={{
          left: "42%",
          top: "39%",
          width: "16%",
          height: "16%",
          background: `radial-gradient(circle, ${tint(glow, 0.55)} 0%, ${tint(glow, 0)} 70%)`,
          animationDelay: `${delayMs - TELL_MS}ms`,
        }}
      />
      {familyLayer(kind, palette, delayMs)}
      {/* The leg: every scene runs a line out along its OWN source -> target
          vector, rotated by --fx-ang and stretched by --fx-len, so an aim-
          anchored card visibly reaches the victim it names and a cast- or
          board-anchored one keeps the short stub the floor value gives it. */}
      <span
        className="bsp-reach absolute block"
        style={{
          left: "50%",
          top: "46.6%",
          width: "18%",
          height: "1.4%",
          background: `linear-gradient(90deg, ${tint(p1, 0.85)}, ${tint(p0, 0)})`,
          borderRadius: "999px",
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs + 60}ms`,
        }}
      />
      {s.front && (
        <span
          className="bsp-x-front absolute block"
          style={
            {
              left: "31%",
              top: `${47 - s.front.h / 2}%`,
              width: "38%",
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
            left: "33%",
            top: "31%",
            width: "34%",
            height: "34%",
            border: `3px solid ${tint(i % 2 ? p0 : p1, 0.8)}`,
            animationDelay: `${delayMs + 260 + i * 160}ms`,
          }}
        />
      ))}
      {s.beam && (
        <span
          className="bsp-x-beam absolute block"
          style={
            {
              left: "49%",
              top: "28%",
              width: "2.2%",
              height: "19%",
              background: `linear-gradient(180deg, ${tint(p1, 0.7)}, transparent)`,
              "--b0": s.beam[0],
              "--b1": s.beam[1],
              animationDelay: `${delayMs + 120}ms`,
            } as CSSProperties
          }
        />
      )}
      {FX_DIRS.map((v, i) => {
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
              {shardShape(s.parts.accent, i === 1 ? p0 : p1, p2)}
            </svg>
          </span>
        );
      })}
      {/* settle tail: a ground afterglow decays under the emblem while one
          dust mote lifts away, so the scene cools instead of cutting. */}
      <span
        className="bsp-x-after absolute block rounded-full"
        style={{
          left: "41%",
          top: "43%",
          width: "18%",
          height: "12%",
          background: `radial-gradient(circle, ${tint(p1, 0.45)} 0%, ${tint(p0, 0)} 70%)`,
          animationDelay: `${delayMs + 760}ms`,
        }}
      />
    </span>
  );
}

/* --- The emblem --------------------------------------------------------------
   The template's own art, arriving on a family trajectory over the spectacle
   layer. Sized for a CAST-anchored scene: ~24% of the 14-cell canvas is about
   3.4 squares, so the action reads as happening on the square the card was
   played on rather than filling the board. */

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
  const s = bold ? 27 : 24;
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
        </span>
      </span>
    </>
  );
}

/* =============================================================================
   The twenty templates.

   Every one runs the same three beats in its own body so the shape is legible
   at a glance and gradable from source:

     tell    +140ms  the template's own anticipation mark
     strike  +260ms  the card's DEVICE lands, then +380ms its face
     settle  +700ms  a decaying mark under the action

   and every one branches on `role`, so a card arriving in a hand gets its own
   short cut instead of borrowing the per-square hit.
   ========================================================================== */

/* --- Template 1: SigilRing ---------------------------------------------------
   A warding ring settles over the square, its compass ticks kindle one by one,
   and the card's own object sits warded at its heart.
   (protections, wards, uncapturable grants) */
function SigilRing({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="ward" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  const ticks = [
    { x: 20, y: 2.4, d: 640 },
    { x: 20, y: 37.6, d: 740 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="ward" palette={palette} cls="bsp-settle" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16.4" fill={tint(p0, 0.1)} stroke={tint(p1, 0.9)} strokeWidth="1.3" />
          <circle cx="20" cy="20" r="12.6" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.6" strokeDasharray="2.4 1.7" />
        </svg>
        <span
          className="bsp-ring absolute block rounded-full"
          style={{ left: "-6%", top: "-6%", width: "112%", height: "112%", border: `2px solid ${tint(p1, 0.7)}`, animationDelay: `${delayMs + 140}ms` }}
        />
        {ticks.map((t, i) => (
          <span
            key={i}
            className="bsp-glint absolute block"
            style={{ left: `${(t.x / 40) * 100 - 5}%`, top: `${(t.y / 40) * 100 - 5}%`, width: "10%", height: "10%", animationDelay: `${delayMs + t.d}ms` }}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill={p1} />
            </svg>
          </span>
        ))}
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={34} t={24} s={32} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={41} top={62} size={18} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 2: RuneStamp ---------------------------------------------------
   A jagged curse rune stamps down over the mark and drips; the card's object
   is branded into the tile under it. (muzzle / soft hexes) */
function RuneStamp({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="curse" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  const drips = [
    { l: 30, dx: "-30%", dy: "220%", d: 700 },
    { l: 62, dx: "25%", dy: "240%", d: 820 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="curse" palette={palette} cls="bsp-stamp" delayMs={delayMs}>
        <span
          className="bsp-shudder absolute block"
          style={{ left: "8%", top: "8%", width: "84%", height: "84%", animationDelay: `${delayMs + 140}ms` }}
        >
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <path d="M20 2 L34 9 L37 24 L27 37 L13 37 L3 24 L6 9 Z" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="1.4" {...SJ} />
            <path d="M20 6.5 L30.5 11.7 L32.8 23 L25 32.8 L15 32.8 L7.2 23 L9.5 11.7 Z" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.7" strokeDasharray="3 2" />
          </svg>
        </span>
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={36} t={26} s={28} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={40} top={60} size={20} strokeWidth={2.2} />
        {drips.map((v, i) => (
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
                animationDelay: `${delayMs + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* --- Template 3: ChainLash ---------------------------------------------------
   A chain whips across and pulls taut over the card's object; a shackle ring
   locks under it. (jails / anchors / slide caps) */
function ChainLash({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="chain" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="chain" palette={palette} cls="bsp-drop" delayMs={delayMs}>
        <Device kind={device} palette={palette} delayMs={delayMs + 140} l={36} t={4} s={28} />
        <span className="bsp-taut absolute block" style={{ left: "-6%", top: "40%", width: "112%", height: "18%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 56 10" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={1.5 + i * 8} y={2.6} width={6.4} height={4.8} rx={2.4} fill="none" stroke={i % 2 ? p0 : p1} strokeWidth="1.2" />
            ))}
          </svg>
        </span>
        <span className="bsp-settle absolute block" style={{ left: "30%", top: "50%", width: "40%", height: "44%", animationDelay: `${delayMs + 380}ms` }}>
          <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
            <path d="M6 9 V6.4 a4 4 0 0 1 8 0 V9" fill="none" stroke={p1} strokeWidth="1.5" strokeLinecap="round" />
            <rect x="3.4" y="9" width="13.2" height="11.4" rx="2.4" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="1.1" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 700} left={42} top={62} size={16} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 4: ColdSnap ----------------------------------------------------
   Frost spokes reach out of the centre, the card's object frosts over, and icy
   motes pop around the rim. (freezes) */
function ColdSnap({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="frost" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="frost" />;
  const motes = [
    { l: 16, t: 20, d: 700 },
    { l: 82, t: 62, d: 800 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="frost" palette={palette} cls="bsp-spoke" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 20 20)`}>
              <path d="M20 3 V37 M20 8 L16.6 4.8 M20 8 L23.4 4.8 M20 32 L16.6 35.2 M20 32 L23.4 35.2" fill="none" stroke={r === 0 ? p1 : tint(p1, 0.75)} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ))}
          <circle cx="20" cy="20" r="7.6" fill={tint(p2, 0.5)} stroke={tint(p0, 0.9)} strokeWidth="0.9" />
        </svg>
        <span
          className="bsp-breathe absolute block rounded-full"
          style={{ left: "30%", top: "30%", width: "40%", height: "40%", background: tint(p0, 0.3), animationDelay: `${delayMs + 140}ms` }}
        />
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={36} t={28} s={28} />
        <Face Icon={Icon} color={p0} delayMs={delayMs + 380} left={41} top={64} size={18} strokeWidth={2.2} />
        {motes.map((v, i) => (
          <span key={i} className="bsp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "9%", height: "9%", animationDelay: `${delayMs + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 V9.2 M0.8 5 H9.2 M2 2 L8 8 M8 2 L2 8" fill="none" stroke={tint(p0, 0.9)} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </Emblem>
    </Stage>
  );
}

/* --- Template 5: StoneShell --------------------------------------------------
   Two granite half-shells slam shut over the card's object and shudder; chips
   fly off the seam. (walnuts / petrify) */
const STONE_CHIPS = [
  { dx: "170%", dy: "-150%", rot: "160deg", d: 0 },
  { dx: "-160%", dy: "-120%", rot: "-140deg", d: 60 },
];
function StoneShell({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="stone" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="stone" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="stone" palette={palette} cls="bsp-shudder" delayMs={delayMs + 400}>
        <Device kind={device} palette={palette} delayMs={delayMs + 140} l={32} t={22} s={36} />
        <span className="bsp-close-l absolute block" style={{ left: "8%", top: "12%", width: "42%", height: "76%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 20 36" className="block h-full w-full" aria-hidden="true">
            <path d="M19.5 1 C6 4 1 12 1 18 C1 24 6 32 19.5 35 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <path d="M13 8 C9 11 7.4 14.6 7.4 18" fill="none" stroke={tint(p1, 0.5)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bsp-close-r absolute block" style={{ left: "50%", top: "12%", width: "42%", height: "76%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 20 36" className="block h-full w-full" aria-hidden="true">
            <path d="M0.5 1 C14 4 19 12 19 18 C19 24 14 32 0.5 35 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <path d="M7 8 C11 11 12.6 14.6 12.6 18" fill="none" stroke={tint(p1, 0.5)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={42} top={62} size={18} strokeWidth={2.2} />
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
                animationDelay: `${delayMs + 700 + v.d}ms`,
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

/* --- Template 6: GlintArc ----------------------------------------------------
   A trail of glints arcs over the square and the card's object lights up where
   the arc lands. (slider / step movement grants) */
function GlintArc({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="glint" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  const glints = [
    { l: 8, t: 56, s: 9, d: 140 },
    { l: 58, t: 24, s: 12, d: 220 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="glint" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <path d="M3 27 C10 12 30 12 37 25" fill="none" stroke={tint(p2, 0.55)} strokeWidth="1" strokeDasharray="2.6 2" strokeLinecap="round" />
        </svg>
        {glints.map((v, i) => (
          <span key={i} className="bsp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s}%`, animationDelay: `${delayMs + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.3 3.7 L9.4 5 L6.3 6.3 L5 9.4 L3.7 6.3 L0.6 5 L3.7 3.7 Z" fill={i === 1 ? p0 : p1} />
            </svg>
          </span>
        ))}
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={36} t={44} s={28} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={42} top={10} size={18} strokeWidth={2.2} />
        <span
          className="bsp-settlemark absolute block rounded-full"
          style={{ left: "34%", top: "78%", width: "32%", height: "9%", background: tint(p0, 0.4), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 7: HoofSpring --------------------------------------------------
   A spring coils down and launches; the card's object vaults off it while dust
   kicks below. (leaps / bounces / shoves) */
function HoofSpring({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="leap" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  const puffs = [
    { l: 30, dx: "-90%", dy: "30%", d: 700 },
    { l: 62, dx: "100%", dy: "20%", d: 790 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="leap" palette={palette} cls="bsp-rise" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "30%", top: "52%", width: "40%", height: "40%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M3 18.6 H17 M4 15.4 H16 M5 12.2 H15 M6 9 H14" fill="none" stroke={p0} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6 5.8 H14" fill="none" stroke={p1} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={32} t={2} s={36} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={42} top={62} size={16} strokeWidth={2.2} />
        {puffs.map((v, i) => (
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
                animationDelay: `${delayMs + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* --- Template 8: PennantRaise ------------------------------------------------
   A pole shoots up and its pennant snaps out with the card's face on the
   cloth; the card's object is planted at its foot. (musters / marches) */
function PennantRaise({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="muster" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="muster" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "24%", top: "4%", width: "7%", height: "92%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 4 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1.1" y="1.5" width="1.8" height="38" rx="0.9" fill={p2} />
            <circle cx="2" cy="1.6" r="1.5" fill={p1} />
          </svg>
        </span>
        <span className="bsp-unfurl absolute block" style={{ left: "31%", top: "10%", width: "62%", height: "34%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 30 16" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.6 0.8 H29 L22.5 8 L29 15.2 H0.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={40} top={16} size={20} strokeWidth={2} />
        <Device kind={device} palette={palette} delayMs={delayMs + 700} l={50} t={56} s={30} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 9: ScrollSnap --------------------------------------------------
   A sealed edict unrolls, its terms flash over the card's object, and it snaps
   shut again. (draft denial / orders served on the opponent) */
function ScrollSnap({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="edict" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="edict" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-scroll absolute block" style={{ left: "16%", top: "6%", width: "68%", height: "82%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 28 34" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1.4" y="3.4" width="25.2" height="27.4" rx="2" fill={tint(p0, 0.96)} stroke={p2} strokeWidth="0.9" />
            <rect x="0.6" y="0.8" width="26.8" height="3.6" rx="1.8" fill={p2} />
            <rect x="0.6" y="29.6" width="26.8" height="3.6" rx="1.8" fill={p2} />
            <path d="M5 10 H23 M5 14 H23 M5 18 H17" fill="none" stroke={tint(p1, 0.75)} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={36} t={30} s={28} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={40} top={60} size={20} strokeWidth={2.2} />
        <span
          className="bsp-settlemark absolute block rounded-full"
          style={{ left: "30%", top: "88%", width: "40%", height: "8%", background: tint(p2, 0.5), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 10: CardFlick --------------------------------------------------
   A card flips face-up off a small deck wearing the card's own face; the card's
   object rides the flipped face. (your own draft tricks) */
function CardFlick({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="draw" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="draw" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-breathe absolute block" style={{ left: "18%", top: "26%", width: "38%", height: "58%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
            <rect x="2.4" y="2.6" width="12" height="18.6" rx="2" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="0.8" transform="rotate(-7 8 12)" />
            <rect x="1.6" y="1.6" width="12" height="18.6" rx="2" fill={tint(p2, 0.98)} stroke={p0} strokeWidth="0.8" />
            <path d="M4.4 6 L11 16.4 M11 6 L4.4 16.4" stroke={tint(p1, 0.35)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bsp-flip absolute block" style={{ left: "44%", top: "14%", width: "40%", height: "64%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="14" height="22" rx="2.2" fill={tint(p0, 0.97)} stroke={p2} strokeWidth="0.9" />
          </svg>
          <Device kind={device} palette={palette} delayMs={delayMs + 380} l={22} t={16} s={54} />
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 700} left={20} top={62} size={20} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 11: EyeBlink ---------------------------------------------------
   An almond eye opens, the card's object surfaces in the iris, and it blinks
   shut. (info reveals) */
function EyeBlink({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="gaze" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="gaze" palette={palette} cls="bsp-blink" delayMs={delayMs} style={{ transformOrigin: "50% 50%" }}>
        <svg viewBox="0 0 40 24" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 12 C10 2.5 30 2.5 38 12 C30 21.5 10 21.5 2 12 Z" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="1.1" {...SJ} />
          <circle cx="20" cy="12" r="7.6" fill={tint(p0, 0.35)} stroke={p1} strokeWidth="1.1" />
        </svg>
        <span
          className="bsp-breathe absolute block rounded-full"
          style={{ left: "36%", top: "26%", width: "28%", height: "48%", background: tint(p1, 0.35), animationDelay: `${delayMs + 140}ms` }}
        />
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={40} t={26} s={20} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={44} top={56} size={14} strokeWidth={2.4} />
        <span
          className="bsp-settlemark absolute block rounded-full"
          style={{ left: "30%", top: "80%", width: "40%", height: "8%", background: tint(p0, 0.4), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 12: KeyTurn ----------------------------------------------------
   A heavy key turns a hard quarter-turn in a lock plate; the card's object is
   what the plate holds shut. (castling bans / sealed gates / locks) */
function KeyTurn({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="lock" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="lock" palette={palette} cls="bsp-drop" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <rect x="6" y="6" width="28" height="28" rx="4" fill={tint(p2, 0.92)} stroke={p0} strokeWidth="1.2" />
          <circle cx="20" cy="20" r="8.4" fill="none" stroke={tint(p1, 0.6)} strokeWidth="0.8" strokeDasharray="2 1.6" />
        </svg>
        <Device kind={device} palette={palette} delayMs={delayMs + 140} l={36} t={24} s={28} />
        <span className="bsp-turn absolute block" style={{ left: "26%", top: "26%", width: "48%", height: "48%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="6.4" r="3.4" fill="none" stroke={p1} strokeWidth="1.6" />
            <path d="M10 9.8 V17 M10 14 H13 M10 17 H12" fill="none" stroke={p1} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={64} top={64} size={20} strokeWidth={2} />
        <span
          className="bsp-settlemark absolute block rounded-full"
          style={{ left: "32%", top: "86%", width: "36%", height: "8%", background: tint(p1, 0.42), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 13: LanternLift ------------------------------------------------
   A grave-lantern lifts away with the card's object glowing in its glass while
   motes rise around it. (revives / returns) */
function LanternLift({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="spirit" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  const motes = [
    { l: 16, t: 66, dx: "30%", dy: "-240%", d: 700 },
    { l: 76, t: 58, dx: "-20%", dy: "-260%", d: 840 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="spirit" palette={palette} cls="bsp-lift" delayMs={delayMs}>
        <span className="bsp-breathe absolute block rounded-full" style={{ left: "22%", top: "16%", width: "56%", height: "60%", background: tint(p1, 0.3), animationDelay: `${delayMs + 140}ms` }} />
        <svg viewBox="0 0 24 34" className="absolute block h-full w-full" aria-hidden="true">
          <path d="M9 3.4 H15 M12 1 V3.4" fill="none" stroke={p2} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 6 H17 L18.6 22 H5.4 Z" fill={tint(p2, 0.35)} stroke={p0} strokeWidth="1.1" {...SJ} />
          <path d="M6 25 H18" fill="none" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={34} t={20} s={32} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={42} top={72} size={16} strokeWidth={2.2} />
        {motes.map((v, i) => (
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
                animationDelay: `${delayMs + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* --- Template 14: SatchelDrop ------------------------------------------------
   A field satchel plops down, its flap pops open and the card's object springs
   out of it. (pocket grants / carried items) */
function SatchelDrop({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="loot" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="loot" palette={palette} cls="bsp-plop" delayMs={delayMs}>
        <svg viewBox="0 0 32 30" className="absolute block h-full w-full" aria-hidden="true">
          <path d="M4 12 H28 V25 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 Z" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="1.2" {...SJ} />
          <path d="M4 12 C4 7 9 4 16 4 C23 4 28 7 28 12 L26 15 H6 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
          <rect x="13.4" y="13" width="5.2" height="4.6" rx="1.2" fill={p1} />
        </svg>
        <span
          className="bsp-flash absolute block rounded-full"
          style={{ left: "30%", top: "24%", width: "40%", height: "18%", background: tint(p1, 0.5), animationDelay: `${delayMs + 140}ms` }}
        />
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={32} t={-16} s={36} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 260} left={40} top={50} size={20} strokeWidth={2.2} />
        <span
          className="bsp-settlemark absolute block rounded-full"
          style={{ left: "26%", top: "90%", width: "48%", height: "8%", background: tint(p2, 0.5), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 15: CogTick ----------------------------------------------------
   A gear ring ticks a hard quarter turn against a smaller counter-gear; the
   card's object rides the hub. (clock / undo / skips) */
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
function CogTick({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="clock" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="link" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="clock" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-turn absolute block" style={{ left: "8%", top: "12%", width: "64%", height: "64%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <path d={cogPath(20, 20, 17)} fill={tint(p2, 0.9)} stroke={p0} strokeWidth="1.2" {...SJ} />
            <circle cx="20" cy="20" r="9" fill={tint(p0, 0.25)} stroke={tint(p1, 0.8)} strokeWidth="1" />
          </svg>
        </span>
        <span className="bsp-tickback absolute block" style={{ left: "58%", top: "56%", width: "36%", height: "36%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            <path d={cogPath(20, 20, 16)} fill={tint(p0, 0.65)} stroke={p2} strokeWidth="1.4" {...SJ} />
            <circle cx="20" cy="20" r="5" fill={tint(p2, 0.8)} />
          </svg>
        </span>
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={24} t={26} s={30} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 700} left={62} top={10} size={20} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 16: BellToll ---------------------------------------------------
   A small chapel bell swings twice over the card's object; two soft ripples
   ride out from the mouth. (nerf-relief cards) */
function BellToll({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="bell" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="bell" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-swing absolute block" style={{ left: "24%", top: "0%", width: "52%", height: "58%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 24 28" className="block h-full w-full" aria-hidden="true">
            <path d="M11 1.6 H13 V4 H11 Z" fill={p2} />
            <path d="M5 20 C5 10 7 4.6 12 4.6 C17 4.6 19 10 19 20 L21 23 H3 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="1.1" {...SJ} />
            <circle cx="12" cy="25.2" r="1.8" fill={p1} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 260} left={40} top={16} size={20} strokeWidth={2} />
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={36} t={60} s={28} />
        {[{ d: 700 }, { d: 900 }].map((r, i) => (
          <span
            key={i}
            className="bsp-ring absolute block rounded-full"
            style={{ left: "28%", top: "48%", width: "44%", height: "34%", border: `2px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + r.d}ms` }}
          />
        ))}
      </Emblem>
    </Stage>
  );
}

/* --- Template 17: LeafSpin ---------------------------------------------------
   Leaves orbit a sprout growing under the card's object. (nature / fae / roots
   / fruit) */
const ORBIT_LEAVES = [0, 120, 240];
function LeafSpin({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="grove" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="leaf" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="grove" palette={palette} cls="bsp-facein" delayMs={delayMs}>
        <span className="bsp-grow absolute block" style={{ left: "38%", top: "48%", width: "24%", height: "46%", animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 10 20" className="block h-full w-full" aria-hidden="true">
            <path d="M5 19 V6" fill="none" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M5 10 C2 9 1 6.6 1.6 4.4 C4 5 5.2 7 5 10 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            <path d="M5 13 C8 12 9 9.6 8.4 7.4 C6 8 4.8 10 5 13 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        <span className="bsp-orbit absolute block" style={{ left: "10%", top: "6%", width: "80%", height: "80%", animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
            {ORBIT_LEAVES.map((r) => (
              <g key={r} transform={`rotate(${r} 20 20)`}>
                <path d="M20 2 C23 4.4 23.4 7.6 20 10 C16.6 7.6 17 4.4 20 2 Z" fill={r === 120 ? p0 : p1} stroke={p2} strokeWidth="0.5" {...SJ} />
              </g>
            ))}
          </svg>
        </span>
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={36} t={10} s={28} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 700} left={42} top={62} size={16} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 18: PrismFlash -------------------------------------------------
   A prism drops in and fans three light beams; the card's object refracts out
   of the bright one. (teleports / swaps / warps) */
const PRISM_BEAMS = [
  { top: 34, rot: -18, w: 46, d: 0 },
  { top: 44, rot: 0, w: 52, d: 110 },
];
function PrismFlash({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="prism" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="prism" palette={palette} cls="bsp-drop" delayMs={delayMs}>
        <span className="bsp-breathe absolute block" style={{ left: "10%", top: "26%", width: "38%", height: "48%", animationDelay: `${delayMs + 140}ms` }}>
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
              animationDelay: `${delayMs + 260 + b.d}ms`,
            }}
          />
        ))}
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={56} t={24} s={30} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 700} left={20} top={64} size={18} strokeWidth={2.2} />
      </Emblem>
    </Stage>
  );
}

/* --- Template 19: BannerMuster -----------------------------------------------
   A standard drops in, its cloth unfurls with the card's face as the device,
   and the card's own object is planted at the foot. (summons) */
function BannerMuster({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="banner" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="spark" />;
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="banner" palette={palette} cls="bsp-drop" delayMs={delayMs}>
        <svg viewBox="0 0 30 40" className="absolute block h-full w-full" aria-hidden="true">
          <rect x="13.9" y="2" width="2.2" height="36" rx="1.1" fill={p2} />
          <path d="M8 2.6 H22" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="bsp-grow absolute block" style={{ left: "28%", top: "9%", width: "44%", height: "50%", animationDelay: `${delayMs + 140}ms`, transformOrigin: "50% 0%" }}>
          <svg viewBox="0 0 14 24" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.8 0.8 H13.2 V19 L7 23.2 L0.8 19 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        <Face Icon={Icon} color={p1} delayMs={delayMs + 260} left={38} top={18} size={24} strokeWidth={2} />
        <Device kind={device} palette={palette} delayMs={delayMs + 380} l={34} t={58} s={30} />
        <span
          className="bsp-flash absolute block rounded-full"
          style={{ left: "30%", top: "88%", width: "40%", height: "10%", background: tint(p2, 0.55), animationDelay: `${delayMs + 700}ms` }}
        />
      </Emblem>
    </Stage>
  );
}

/* --- Template 20: InkSplash --------------------------------------------------
   An ink blot blooms over the mark, droplets fly, and the card's object
   surfaces reversed-out of the ink. (conversions / steals) */
function InkSplash({ palette, Icon, bold, lead, role, device, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <Entrance fx="ink" palette={palette} Icon={Icon} device={device} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={palette} Icon={Icon} delayMs={delayMs} accent="mote" />;
  const drops = [
    { l: 12, t: 22, dx: "-120%", dy: "-90%", d: 700 },
    { l: 78, t: 16, dx: "110%", dy: "-120%", d: 780 },
  ];
  return (
    <Stage palette={palette} delayMs={delayMs}>
      <Emblem bold={bold} fx="ink" palette={palette} cls="bsp-blot" delayMs={delayMs}>
        <svg viewBox="0 0 40 40" className="absolute block h-full w-full" aria-hidden="true">
          <path
            d="M20 3 C27 3 33 6 35.5 12 C38 18 36 26 30 31 C24 36 14 36.5 8.5 31.5 C3 26.5 2.5 17 6.5 11 C10 5.5 14 3 20 3 Z"
            fill={tint(p2, 0.92)}
            stroke={p0}
            strokeWidth="1"
            {...SJ}
          />
        </svg>
        <span
          className="bsp-flash absolute block rounded-full"
          style={{ left: "28%", top: "28%", width: "44%", height: "44%", background: tint(p0, 0.35), animationDelay: `${delayMs + 140}ms` }}
        />
        <Device kind={device} palette={palette} delayMs={delayMs + 260} l={34} t={22} s={32} />
        <Face Icon={Icon} color={p1} delayMs={delayMs + 380} left={42} top={64} size={16} strokeWidth={2.2} />
        {drops.map((v, i) => (
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
                animationDelay: `${delayMs + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Emblem>
    </Stage>
  );
}
/* =============================================================================
   Bespoke: HighGroundTakeover — ww_high_ground is TIER 7, the only card of that
   tier in this module, so it gets a scene of its own rather than a template.

   ANCHORING. The card reads "choose one of your pieces", so the derived anchor
   rule (scripts/lib/anchor-rule.ts) puts it on "cast", and that is right: the
   ziggurat should heave up under the piece that is taking the high ground, not
   in the middle of a board it says nothing about. The board-scale layers (the
   gold-over-crimson tint and its rim) therefore live inside <BoardFrame>, and
   the terraces, summit and shockwaves are sized in cells around the cast square
   instead of as fixed percentages of the canvas.
   ========================================================================== */

const HG_GOLD = "#ffd76a";
const HG_GOLD_DEEP = "#c9931d";
const HG_CRIMSON = "#c9314b";
const HG_CRIMSON_DEEP = "#5a1220";
const HG_SNOW = "#fff2c9";
const HG_PALETTE: Palette = [HG_GOLD, HG_SNOW, HG_CRIMSON];
const HG_DEF = BUFF_BY_ID["ww_high_ground"];
const HG_ICON = HG_DEF ? cardFaceIcon("ww_high_ground", HG_DEF.category, HG_DEF.icon) : undefined;

/** Terraces stepping up under the chosen piece, rank by rank (percentages of
 *  the 14-cell canvas; one cell is 7.14%, so this spans about three squares). */
const HG_TERRACES = [
  { l: 38, t: 60, w: 24, d: 0 },
  { l: 40.5, t: 54, w: 19, d: 120 },
  { l: 43, t: 48, w: 14, d: 240 },
];
const HG_FLAGS = [
  { l: 36, t: 47, d: 700 },
  { l: 62, t: 47, d: 760 },
];

function HighGroundTakeover({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
  if (role === "entrance") {
    return <Entrance fx="ward" palette={HG_PALETTE} Icon={HG_ICON} device="obelisk" delayMs={delayMs} />;
  }
  if (!lead) return <TargetHit palette={HG_PALETTE} Icon={HG_ICON} delayMs={delayMs} accent="spark" />;
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* the only board-scale layers: gold light over crimson ground, and a
            rim that closes in on the caster's own edge */}
        <span
          className="bsp-wash absolute inset-0 block"
          style={{
            background: `radial-gradient(circle at 50% 46%, ${tint(HG_GOLD, 0.3)} 0%, ${tint(HG_CRIMSON, 0.26)} 55%, ${tint(HG_CRIMSON_DEEP, 0.34)} 100%)`,
            animationDelay: `${delayMs}ms`,
          }}
        />
        <span
          className="bsp-rail absolute block"
          style={{
            left: "0%",
            top: "47%",
            width: "100%",
            height: "1.8%",
            background: `linear-gradient(90deg, transparent, ${tint(HG_GOLD, 0.75)}, transparent)`,
            animationDelay: `${delayMs + 140}ms`,
          }}
        />
      </BoardFrame>
      {/* the sunburst crowning the summit */}
      <span className="bsp-hg-rays absolute block" style={{ left: "36%", top: "28%", width: "28%", height: "28%", animationDelay: `${delayMs + 420}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M20 2.5 L21.4 8.6 H18.6 Z" fill={tint(HG_GOLD, 0.85)} transform={`rotate(${i * 30} 20 20)`} />
          ))}
        </svg>
      </span>
      {/* terraces stepping up under the chosen piece */}
      {HG_TERRACES.map((t, i) => (
        <span key={i} className="bsp-hg-terrace absolute block" style={{ left: `${t.l}%`, top: `${t.t}%`, width: `${t.w}%`, height: "6.5%", animationDelay: `${delayMs + 120 + t.d}ms` }}>
          <svg viewBox="0 0 56 9" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M2.5 9 L8 1.5 H48 L53.5 9 Z" fill={tint(HG_CRIMSON_DEEP, 0.82)} stroke={tint(HG_GOLD_DEEP, 0.9)} strokeWidth="0.7" {...SJ} />
            <path d="M8 1.5 H48" stroke={tint(HG_GOLD, 0.95)} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* the summit: mountain, snow cap, glyph and peak pennant */}
      <span className="bsp-hg-summit absolute block" style={{ left: "40%", top: "31%", width: "20%", height: "20%", animationDelay: `${delayMs + 300}ms` }}>
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
        <span key={i} className="bsp-grow absolute block" style={{ left: `${b.l}%`, top: `${b.t}%`, width: "3%", height: "14%", animationDelay: `${delayMs + b.d}ms` }}>
          <svg viewBox="0 0 6 28" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="1" y="1" width="1.1" height="26.5" rx="0.55" fill={HG_GOLD_DEEP} />
            <path d="M2.1 1.6 H5.8 L4.4 4 L5.8 6.4 H2.1 Z" fill={tint(HG_CRIMSON, 0.95)} stroke={tint(HG_GOLD, 0.9)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      ))}
      {/* twin shockwaves rolling out from the chosen square */}
      <span
        className="bsp-hg-shock absolute block rounded-full"
        style={{ left: "29%", top: "26%", width: "42%", height: "42%", border: `4px solid ${tint(HG_GOLD, 0.9)}`, animationDelay: `${delayMs + 880}ms` }}
      />
      <span
        className="bsp-hg-shock absolute block rounded-full"
        style={{ left: "29%", top: "26%", width: "42%", height: "42%", border: `3px solid ${tint(HG_CRIMSON, 0.85)}`, animationDelay: `${delayMs + 1080}ms` }}
      />
      <Device kind="obelisk" palette={HG_PALETTE} delayMs={delayMs + 560} l={46} t={38} s={9} />
    </BoardWideStage>
  );
}

/* =============================================================================
   Registry — CARD -> TEMPLATE / PALETTE / DEVICE, one entry per still-uncovered
   card.

   Four things separate two cards, and only the first is shared: the template
   (the action), the palette, the DEVICE (the card's own central object, never
   repeated inside a template group), and the card's globally unique face icon.

   `anchor` is derived, not chosen by eye: a card that changes a rule for the
   whole army or has no board location at all is "board", a card that lands on
   one piece or square is "cast", a card that reaches a named few is "aim"
   (scripts/lib/anchor-rule.ts cross-checks every one of these against the
   card's own mechanical category and rule text).

   `source` names an fx zone ONLY where the card reliably paints it at cast time
   (frozen / walnut / stun / shield / kingSafe / summon / motif zones);
   everything else rides the removal diff or Board's diff-less lead branch.
   ========================================================================== */

/** Bind a template + palette + device + the card's own face icon into a
 *  SigPlugin. The template itself runs all three beats and all three roles, so
 *  this is pure wiring.
 *
 *  `device` sits before `bold` in the argument list because the animation
 *  registry reads that positional string straight out of this source file as
 *  the per-card structural key. */
function B(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  id: string,
  config: SigPlugin["config"],
  device: DeviceKind,
  bold = false,
): SigPlugin {
  const def = BUFF_BY_ID[id];
  const Icon = def ? cardFaceIcon(id, def.category, def.icon) : undefined;
  return {
    config,
    Render: function BasicPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      // A lead's whole strike phase sits TELL_MS after the cast so the
      // spectacle layer's anticipation cue (which is authored at `delayMs -
      // TELL_MS`, see SceneFx) still lands at a non-negative delay. A negative
      // animation-delay does not wait, it starts the track part-way through,
      // which would silently eat the tell on every un-staggered play.
      // Per-square hits and hand entrances are followers and stay immediate.
      return (
        <Template
          palette={palette}
          Icon={Icon}
          bold={bold}
          lead={lead}
          role={role}
          device={device}
          delayMs={lead ? delayMs + TELL_MS : delayMs}
        />
      );
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {

  /* --- SigilRing --------------------------------------------------------- */
  // Cornerstone (t1 protection)
  cornerstone: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "cornerstone", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "aegis", anchor: "cast" }, "keystone"),
  // Firm Footing (t1 protection)
  firm_footing: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "firm_footing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "buckler"),
  // Guarded King (t1 protection)
  guarded_king: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "guarded_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "board" }, "helm"),
  // Holy Hell (t1 protection)
  holy_hell: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "holy_hell", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis", anchor: "board" }, "crown"),
  // Loose Pawn (t1 protection)
  loose_pawn: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "loose_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }, "waxseal"),
  // Pawn Shield (t1 protection)
  pawn_shield: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "pawn_shield", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "cairn"),
  // Steady Hand (t1 protection)
  steady_hand: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "steady_hand", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "board" }, "obelisk"),
  // Bulwark (t2 protection)
  bulwark: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "bulwark", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "chalice"),
  // Fork Guard (t2 protection)
  fork_guard: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "fork_guard", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "aegis", anchor: "cast" }, "beehive"),
  // Reinforce (t2 protection)
  reinforce: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "reinforce", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "padlock"),
  // Screen (t2 protection)
  screen: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "screen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }, "anchor"),
  // Shielded Advance (t2 protection)
  shielded_advance: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "shielded_advance", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }, "boot"),
  // Sidestep King (t2 protection)
  sidestep_king: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "sidestep_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "cast", source: "kingSafe" }, "gauntlet"),
  // Chain Mail (t3 protection)
  chain_mail: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "chain_mail", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "board", source: "shield" }, "pylon"),
  // Deflect (t3 protection)
  deflect: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "deflect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "candle"),
  // Fortress (t3 protection)
  fortress: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "fortress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "anvil"),
  // Iron Bishop (t3 protection)
  iron_bishop: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "iron_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }, "lantern"),
  // Phalanx (t3 protection)
  phalanx: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "phalanx", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "torch"),
  // Sigil Ward (t3 protection)
  wa_sigil_ward: B(SigilRing, ["#5fc9b0","#e3d0ff","#1c3a40"], "wa_sigil_ward", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "hourglass"),
  // Duelist (t4 protection)
  duelist: B(SigilRing, ["#8fb5e8","#ffd76a","#22304a"], "duelist", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }, "compass", true),
  // Hold the Bridge (t4 protection)
  hold_the_bridge: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "hold_the_bridge", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "cast", source: "kingSafe" }, "quill", true),
  // Iron Wall (t4 protection)
  iron_wall: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "iron_wall", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "inkpot", true),
  // Shieldmaiden (t4 protection)
  shieldmaiden: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "shieldmaiden", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "drum", true),
  // Warding Circle (t4 protection)
  warding_circle: B(SigilRing, ["#5fc9b0","#ffd76a","#1c4a3a"], "warding_circle", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "board", source: "kingSafe" }, "warhorn", true),
  // Watermelon Rind (t4 protection)
  watermelon_rind: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "watermelon_rind", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "spear", true),
  // High Ground (TIER 7 protection — bespoke full-board takeover, not a template)
  ww_high_ground: { config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }, Render: HighGroundTakeover },

  /* --- RuneStamp --------------------------------------------------------- */
  // Butterfingers (t1 hex)
  butterfingers: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "cast" }, "waxseal"),
  // Cold Feet (t1 hex)
  cold_feet: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "cold_feet", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }, "mask"),
  // Crossed Wires (t1 hex)
  crossed_wires: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "crossed_wires", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades", anchor: "board" }, "inkpot"),
  // Foggy Glasses (t1 hex)
  foggy_glasses: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "foggy_glasses", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades", anchor: "cast" }, "thorn"),
  // Royal Restraint (t1 hex)
  royal_restraint: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "royal_restraint", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", anchor: "cast" }, "toadstool"),
  // Stage Fright (t1 hex)
  stage_fright: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "stage_fright", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast", source: "slow" }, "caltrop"),
  // Blunted Lance (t2 hex)
  blunted_lance: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "blunted_lance", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades", anchor: "board" }, "quill"),
  // Lame Horses (t2 hex)
  lame_horses: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "lame_horses", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades", anchor: "board" }, "ledger"),
  // Rusted Hinges (t2 hex)
  rusted_hinges: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "rusted_hinges", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "shades", anchor: "board" }, "dice"),
  // Safe Passage (t2 hex)
  safe_passage: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "safe_passage", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "board" }, "mirror"),
  // Timid King (t2 hex)
  timid_king: B(RuneStamp, ["#6b4a8f","#a8e07f","#241436"], "timid_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", anchor: "board" }, "brazier"),
  // Sown Salt (t3 hex)
  sown_salt: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "sown_salt", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }, "hourglass"),
  // Backseat Driver (t3 hex)
  wc_backseat_driver: B(RuneStamp, ["#8f6bff","#8faf4a","#1c1030"], "wc_backseat_driver", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "aim", source: "slow" }, "spool"),
  // Atomic Captures (Small) (t4 attack)
  atomic_captures_small: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "atomic_captures_small", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "warhorn", true),
  // Hex Doll (t4 hex)
  hex_doll: B(RuneStamp, ["#8faf4a","#c9b0e8","#2f3a26"], "hex_doll", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "aim" }, "anvil", true),
  // Butterfingers (t4 hex)
  wc_butterfingers: B(RuneStamp, ["#a07fd1","#ffd76a","#2a1a3a"], "wc_butterfingers", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "board" }, "lantern", true),
  // Backdraft (t4 attack)
  we_backdraft: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "we_backdraft", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "helm", true),

  /* --- ChainLash --------------------------------------------------------- */
  // Cold Open (t1 hex)
  cold_open: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "cold_open", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }, "anchor"),
  // Heavy Boots (t1 hex)
  heavy_boots: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "heavy_boots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board" }, "padlock"),
  // Knock Knees (t1 hex)
  knock_knees: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "knock_knees", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "board" }, "caltrop"),
  // Molasses (t1 hex)
  molasses: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "molasses", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }, "gauntlet"),
  // Slippery Grip (t1 hex)
  slippery_grip: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "slippery_grip", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", anchor: "board" }, "spool"),
  // Stiff Joints (t1 hex)
  stiff_joints: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "stiff_joints", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }, "hammer"),
  // Anchor (t2 protection)
  anchor: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "anchor", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "wall", anchor: "aim" }, "anvil"),
  // Butter Bishops (t2 hex)
  butter_bishops: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "butter_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" }, "buoy"),
  // Leaden Queen (t2 hex)
  leaden_queen: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "leaden_queen", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }, "boot"),
  // Seized Axles (t2 hex)
  seized_axles: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "seized_axles", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", anchor: "board" }, "cairn"),
  // Short Leash (t2 hex)
  short_leash: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "short_leash", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" }, "drum"),
  // Trench Line (t2 hex)
  trench_line: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "trench_line", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board" }, "helm"),
  // Anchored Rooks (t3 hex)
  anchored_rooks: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "anchored_rooks", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", anchor: "board" }, "keystone"),
  // Blinkered Bishops (t3 hex)
  blinkered_bishops: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "blinkered_bishops", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" }, "sickle"),
  // Leaden Crown (t3 hex)
  leaden_crown: B(ChainLash, ["#a8763a","#e8dcc0","#3a2a1a"], "leaden_crown", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }, "lantern"),
  // Magnet (t3 item)
  magnet: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "magnet", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }, "torch"),
  // Pawn Nerf (t3 hex)
  pawn_nerf: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "pawn_nerf", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }, "hourglass"),
  // Pin Breaker (t3 movement)
  // Spooked Steeds (t3 hex)
  spooked_steeds: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "spooked_steeds", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "board" }, "compass"),
  // Static Field (t3 protection)
  we_static_field: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "we_static_field", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "cast" }, "quill"),
  // Abandoned Post (t4 hex)
  abandoned_post: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "abandoned_post", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, "inkpot", true),
  // Blockade (t4 tempo)
  blockade: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "blockade", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board" }, "warhorn", true),
  // Frozen Furrows (t4 hex)
  frozen_furrows: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "frozen_furrows", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }, "buckler", true),
  // Heavy Shackles (t4 hex)
  heavy_shackles: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "heavy_shackles", { ordering: "radial", staggerMs: 0, victims: ["q","r"], hasLead: true, sound: "wall", anchor: "cast" }, "spear", true),
  // Quicksand Patch (t4 tempo)
  wc_quicksand_patch: B(ChainLash, ["#95a0b5","#d6a25a","#2a3140"], "wc_quicksand_patch", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board", source: "walnut" }, "arrowhead", true),

  /* --- ColdSnap ---------------------------------------------------------- */
  // Cold Snap (t1 hex)
  cold_snap: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "cold_snap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "hourglass"),
  // Hard Reset (t2 hex)
  hard_reset: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "hard_reset", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }, "mirror"),
  // Pinned Down (t2 hex)
  pinned_down: B(ColdSnap, ["#6fc3e8","#fff4d6","#1d4560"], "pinned_down", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "candle"),
  // Frost Nip (t2 tempo)
  we_frost_nip: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "we_frost_nip", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "thorn"),
  // Frost (t3 tempo)
  frost: B(ColdSnap, ["#6fc3e8","#fff4d6","#1d4560"], "frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }, "obelisk"),
  // Frostbite (t3 hex)
  frostbite: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "frostbite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "chalice"),
  // Snap Freeze (t3 tempo)
  snap_freeze: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "snap_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "acorn"),
  // Twist the Knife (t3 hex)
  twist_the_knife: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "twist_the_knife", { ordering: "sweep", staggerMs: 60, victims: ["p","n","b","r","q"], hasLead: true, sound: "clockice", anchor: "aim", source: "slow" }, "hand_bell"),
  // Stasis Field (t3 tempo)
  wa_stasis_field: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "wa_stasis_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }, "feather"),
  // Wall (t3 tempo)
  wall: B(ColdSnap, ["#6fc3e8","#fff4d6","#1d4560"], "wall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "spear"),
  // Clumsy Dash (t3 tempo)
  wc_clumsy_dash: B(ColdSnap, ["#aee2ff","#cdeaff","#2a5070"], "wc_clumsy_dash", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "kite"),
  // Slip on Ice (t3 tempo)
  wc_slip_on_ice: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "wc_slip_on_ice", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "dice"),
  // Stage Fright (t3 hex)
  wc_stage_fright: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wc_stage_fright", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice", anchor: "cast" }, "coin"),
  // Cascade Freeze (t4 tempo)
  cascade_freeze: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "cascade_freeze", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }, "lantern", true),
  // Cryostasis (t4 hex)
  cryostasis: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "cryostasis", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "anvil", true),
  // Hard Frost (t4 hex)
  hard_frost: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "hard_frost", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }, "helm", true),
  // Immobilizer (t4 tempo)
  immobilizer: B(ColdSnap, ["#8fb5e8","#dff7ff","#22304a"], "immobilizer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "boot", true),
  // Bind the Queen (t4 protection)
  wa_bind_the_queen: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wa_bind_the_queen", { ordering: "sweep", staggerMs: 60, victims: ["q"], hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "keystone", true),
  // Counter Charge (t4 tempo)
  ww_counter_charge: B(ColdSnap, ["#6fc3e8","#fff4d6","#1d4560"], "ww_counter_charge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "aim" }, "gauntlet", true),

  /* --- StoneShell -------------------------------------------------------- */
  // Gargoyles (t2 hex)
  gargoyles: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "gargoyles", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast", source: "walnut" }, "acorn"),
  // Stone Hooves (t2 hex)
  stone_hooves: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "stone_hooves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast", source: "walnut" }, "cairn"),
  // Gorgon's Glance (t3 hex)
  gorgons_glance: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "gorgons_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "board", source: "walnut" }, "keystone"),
  // Hobbled Cavalry (t3 hex)
  hobbled_cavalry: B(StoneShell, ["#7f8a94","#d9d2c0","#2e343a"], "hobbled_cavalry", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }, "anvil"),
  // Petrified Towers (t3 hex)
  petrified_towers: B(StoneShell, ["#8d8d94","#c9c9cf","#3a3a40"], "petrified_towers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast", source: "walnut" }, "beehive"),
  // Granite Towers (t4 hex)
  granite_towers: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "granite_towers", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }, "obelisk", true),
  // Ironbound Rook (t4 hex)
  ironbound_rook: B(StoneShell, ["#b0a68f","#e3ddd0","#4a4336"], "ironbound_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "board", source: "walnut" }, "helm", true),
  // Statue Stable (t4 hex)
  statue_stable: B(StoneShell, ["#8a8478","#e8dcc0","#3c362c"], "statue_stable", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }, "buckler", true),
  // Stone Clergy (t4 hex)
  stone_clergy: B(StoneShell, ["#9a8f8a","#c9b89a","#3a322c"], "stone_clergy", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }, "waxseal", true),

  /* --- GlintArc ---------------------------------------------------------- */
  // Ferz King (t1 movement)
  ferz_king: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "ferz_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "kite"),
  // Half Step (t1 movement)
  half_step: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "half_step", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }, "feather"),
  // Loyal Pawn (t1 pieces)
  loyal_pawn: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "loyal_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }, "arrowhead"),
  // Quiet March (t1 movement)
  quiet_march: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "quiet_march", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "spear"),
  // Rook Slide (t1 movement)
  rook_slide: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "rook_slide", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "compass"),
  // Sentinel Pawn (t1 attack)
  sentinel_pawn: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "sentinel_pawn", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, "weathervane"),
  // Sidestep (t1 protection)
  sidestep: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "sidestep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast", source: "shield" }, "coin"),
  // Tempo Shuffle (t1 movement)
  tempo_shuffle: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "tempo_shuffle", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "board", source: "empower" }, "buoy"),
  // Ghost Pawn (t2 movement)
  ghost_pawn: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ghost_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "torch"),
  // Pawn Push (t2 movement)
  pawn_push: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "pawn_push", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "anvil"),
  // Phase Rook (t2 movement)
  phase_rook: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "phase_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "lantern"),
  // Reposition (t2 movement)
  reposition: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "reposition", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }, "helm"),
  // Wazir Rook (t2 movement)
  wazir_rook: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "wazir_rook", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "boot"),
  // Thunder Step (t2 movement)
  we_thunder_step: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "we_thunder_step", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "keystone"),
  // Grasshopper (t3 movement)
  grasshopper: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "grasshopper", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "gauntlet"),
  // Promote Now (t3 pieces)
  promote_now: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "promote_now", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }, "hourglass"),
  // Queen's Echo (t3 movement)
  queens_echo: B(GlintArc, ["#9fdcf0","#ffe9b0","#254452"], "queens_echo", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "anchor"),
  // Rank Runner (t3 movement)
  rank_runner: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "rank_runner", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "quill"),
  // Vanguard (t3 pieces)
  vanguard: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "vanguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }, "inkpot"),
  // Transmute (t3 pieces)
  wa_transmute: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "wa_transmute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }, "drum"),
  // Ball Lightning (t3 attack)
  we_ball_lightning: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "we_ball_lightning", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }, "warhorn"),
  // River Flow (t3 movement)
  we_riverflow: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "we_riverflow", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "buckler"),
  // Phalanx Advance (t3 movement)
  ww_phalanx_advance: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ww_phalanx_advance", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }, "caltrop"),
  // Changeling (t4 pieces)
  changeling: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "changeling", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }, "brazier", true),
  // Kingslide (t4 movement)
  kingslide: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "kingslide", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }, "chalice", true),
  // Royal Decree (t4 movement)
  royal_decree: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "royal_decree", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "crown", true),
  // Arcane Conduit (t4 movement)
  wa_arcane_conduit: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "wa_arcane_conduit", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "mask", true),

  /* --- HoofSpring -------------------------------------------------------- */
  // Bishop Polish (t1 movement)
  bishop_polish: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "bishop_polish", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "boot"),
  // Diagonal Step (t1 movement)
  diagonal_step: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "diagonal_step", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "spear"),
  // Little Leap (t1 movement)
  little_leap: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "little_leap", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "arrowhead"),
  // Nudge (t1 attack)
  nudge: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "drum"),
  // Camel Knight (t2 movement)
  camel_knight: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "camel_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "bellows"),
  // Long Knight (t2 movement)
  long_knight: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "long_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "kite"),
  // Mind Nudge (t2 attack)
  mind_nudge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "mind_nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "hammer"),
  // Rally (t2 movement)
  rally: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "rally", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "buoy"),
  // Spring Pawn (t2 movement)
  spring_pawn: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "spring_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "warhorn"),
  // Teleport Knight (t2 movement)
  teleport_knight: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "teleport_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "caltrop"),
  // Vault (t2 movement)
  vault: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "vault", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "anvil"),
  // Wazir Bishop (t2 movement)
  wazir_bishop: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "wazir_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "gauntlet"),
  // Kangaroo Hop (t2 movement)
  wc_kangaroo_hop: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "wc_kangaroo_hop", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "toadstool"),
  // Updraft (t2 movement)
  we_updraft: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "we_updraft", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "thorn"),
  // Bishop to Archbishop (t3 movement)
  bishop_archbishop: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "bishop_archbishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "pylon"),
  // Board Quake (t3 attack)
  board_quake: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "board_quake", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "lantern"),
  // Cannon (t3 movement)
  cannon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "cannon", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "helm"),
  // Dragon Pawn (t3 movement)
  dragon_pawn: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "dragon_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "keystone"),
  // Hunter Knight (t3 attack)
  hunter_knight: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "hunter_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "torch"),
  // Knight to Nightrook (t3 movement)
  knight_nightrook: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "knight_nightrook", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "hourglass"),
  // Overclock (t3 movement)
  overclock: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "overclock", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "anchor"),
  // Rook to Chancellor (t3 movement)
  rook_chancellor: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "rook_chancellor", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "compass"),
  // Sliding King (t3 movement)
  sliding_king: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "sliding_king", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "quill"),
  // Tidal Push (t3 attack)
  tidal_push: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "tidal_push", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "inkpot"),
  // Trampoline (t3 item)
  trampoline: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "trampoline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "buckler"),
  // Ghostwalk (t3 movement)
  wa_ghostwalk_bishop: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "wa_ghostwalk_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "brazier"),
  // Flank March (t3 movement)
  ww_flank_march: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "ww_flank_march", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "chalice"),
  // Forced Retreat (t3 tempo)
  ww_forced_retreat: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "ww_forced_retreat", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "crown"),
  // Pontoon Bridge (t3 movement)
  ww_pontoon_bridge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "ww_pontoon_bridge", { ordering: "radial", staggerMs: 0, victims: ["r","b","q"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "mask"),
  // War Wagon (t3 movement)
  ww_war_wagon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "ww_war_wagon", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "mirror"),
  // Firecracker (t4 item)
  firecracker: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "firecracker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "sickle", true),
  // Giant Slayer (t4 attack)
  giant_slayer: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "giant_slayer", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "board", source: "empower" }, "acorn", true),
  // Overrun (t4 attack)
  overrun: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "overrun", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, "feather", true),
  // Twin Knights (t4 movement)
  twin_knights: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "twin_knights", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "beehive", true),
  // Camel Rider (t4 movement)
  wa_camel_rider: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "wa_camel_rider", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "candle", true),

  /* --- PennantRaise ------------------------------------------------------ */
  // Steady March (t1 movement)
  steady_march: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "steady_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "warhorn"),
  // Counterstep (t2 tempo)
  counterstep: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "counterstep", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim", source: "rally" }, "drum"),
  // Double Step Army (t2 movement)
  double_step_army: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "double_step_army", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board", source: "empower" }, "spear"),
  // Pawn Storm (t2 movement)
  pawn_storm: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "pawn_storm", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "crown"),
  // Pikemen (t2 movement)
  ww_pikemen: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "ww_pikemen", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "kite"),
  // Berolina Pawns (t3 movement)
  berolina_pawns: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "berolina_pawns", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "weathervane"),
  // Momentum (t3 tempo)
  momentum: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "momentum", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim", source: "rally" }, "torch"),
  // Split March (t3 movement)
  split_march: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "split_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "buoy"),
  // Moonwalk (t3 movement)
  wc_moonwalk: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "wc_moonwalk", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "obelisk"),
  // Army Reversal (t4 movement)
  army_reversal: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "army_reversal", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "pylon", true),
  // Solstice (t4 tempo)
  solstice: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "solstice", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "helm", true),
  // Chaos Reigns (t4 tempo)
  wc_chaos_reigns: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "wc_chaos_reigns", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "buckler", true),
  // Field Fortification (t4 movement)
  ww_field_fortification: B(PennantRaise, ["#b5533a","#fff2c9","#33170f"], "ww_field_fortification", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board", source: "empower" }, "hand_bell", true),

  /* --- ScrollSnap -------------------------------------------------------- */
  // Cut Purse (t2 hex)
  cut_purse: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "cut_purse", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "ledger"),
  // Sealed Orders (t2 hex)
  sealed_orders: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "sealed_orders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "quill"),
  // Royal Duty (t3 hex)
  royal_duty: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "royal_duty", { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "snooze", anchor: "board" }, "waxseal"),
  // Suppress Magic (t3 draft)
  wa_suppress_magic: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "wa_suppress_magic", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "inkpot"),
  // Red Tape (t3 tempo)
  wc_red_tape: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "wc_red_tape", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", anchor: "board", source: "slow" }, "padlock"),
  // Burned Dispatches (t4 hex)
  burned_dispatches: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "burned_dispatches", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "hourglass", true),
  // Chain Nullify (t4 draft)
  chain_nullify: B(ScrollSnap, ["#e0d0a8","#c94a3a","#2a3450"], "chain_nullify", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "spool", true),
  // Dead Letter (t4 hex)
  dead_letter: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "dead_letter", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mask", true),
  // Mirror (t4 draft)
  mirror: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "mirror", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "dice", true),
  // Patch Notes (t4 hex)
  patch_notes: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "patch_notes", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "coin", true),
  // Suppress (t4 draft)
  suppress: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "suppress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mirror", true),
  // Disrupt Ritual (t4 draft)
  wa_disrupt_ritual: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "wa_disrupt_ritual", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "chalice", true),
  // Jinx (t4 draft)
  wa_jinx: B(ScrollSnap, ["#e8dcc0","#8a6a3a","#2c3e6b"], "wa_jinx", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "crown", true),

  /* --- CardFlick --------------------------------------------------------- */
  // Prep (t1 draft)
  prep: B(CardFlick, ["#c9a0ff","#ffe9b0","#301c50"], "prep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "dice"),
  // Trade Up (t2 pieces)
  trade_up: B(CardFlick, ["#9b6bd1","#f2e0ff","#1e1038"], "trade_up", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "coin"),
  // Buff Thief (Minor) (t4 draft)
  buff_thief_minor: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "buff_thief_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "ledger", true),
  // Hero's Journey (t4 draft)
  heros_journey: B(CardFlick, ["#8f6bff","#fff2c9","#22123e"], "heros_journey", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "mirror", true),
  // Recast (t4 draft)
  recast: B(CardFlick, ["#a880e8","#ffd23f","#261644"], "recast", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "spool", true),
  // Disjunction (t4 draft)
  wa_disjunction: B(CardFlick, ["#b98cff","#ffd76a","#2a1a4a"], "wa_disjunction", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "quill", true),

  /* --- EyeBlink ---------------------------------------------------------- */
  // Extra Glance (t1 info)
  extra_glance: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "extra_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mirror"),
  // Peek (t1 info)
  peek: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "peek", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "compass"),
  // Quick Glance (t1 info)
  quick_glance: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "quick_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mask"),
  // Scout (t1 info)
  scout: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }, "lantern"),
  // Watchtower (t1 info)
  watchtower: B(EyeBlink, ["#5a6b8f","#cdd6ff","#161e33"], "watchtower", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "hourglass"),
  // Draft Insight (t2 info)
  draft_insight: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "draft_insight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "candle"),
  // Oracle's Eye (t2 info)
  oracles_eye: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "oracles_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "coin"),
  // Third Eye (t2 info)
  third_eye: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "third_eye", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "feather"),
  // North Star (t3 info)
  north_star: B(EyeBlink, ["#6f8fd1","#eef1f7","#202b48"], "north_star", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "spool"),
  // Foresight (t3 info)
  wa_foresight: B(EyeBlink, ["#4a7a9f","#d0e8f7","#152636"], "wa_foresight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "dice"),
  // Mind Read (t4 info)
  wa_mind_read: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "wa_mind_read", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "quill", true),
  // Omniscience (t4 info)
  wa_omniscience: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "wa_omniscience", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "ledger", true),

  /* --- KeyTurn ----------------------------------------------------------- */
  // Castle Early (t1 movement)
  castle_early: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "castle_early", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "padlock"),
  // Drawbridge (t1 hex)
  drawbridge: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "drawbridge", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "aim", source: "slow" }, "cogwheel"),
  // Toll Gate (t1 hex)
  toll_gate: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "toll_gate", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "board" }, "spool"),
  // Long Castle Anywhere (t2 movement)
  long_castle_anywhere: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "long_castle_anywhere", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "board", source: "empower" }, "anvil"),
  // No Man's Land (t2 hex)
  no_mans_land: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "no_mans_land", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "hammer"),
  // Shy Pieces (t2 hex)
  wc_shy_pieces: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "wc_shy_pieces", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "ledger"),
  // Board Lock (t3 tempo)
  board_lock: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "board_lock", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "board", source: "slow" }, "waxseal"),
  // Bunker (t3 protection)
  bunker: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "bunker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "keystone"),
  // No Trespass (t3 hex)
  no_trespass: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "no_trespass", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, "gauntlet"),
  // Flypaper File (t4 hex)
  flypaper_file: B(KeyTurn, ["#bfa050","#efe0b8","#36301e"], "flypaper_file", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "anchor", true),
  // Sealed Gate (t4 hex)
  sealed_gate: B(KeyTurn, ["#d1a85a","#fff2c9","#3d3220"], "sealed_gate", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim" }, "hourglass", true),

  /* --- LanternLift ------------------------------------------------------- */
  // Second Wind (t1 pieces)
  second_wind: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "second_wind", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "lantern"),
  // Minor Recall (t2 pieces)
  minor_recall: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "minor_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "candle"),
  // Regrow (t2 pieces)
  we_regrow: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "we_regrow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "torch"),
  // Field Hospital (t2 pieces)
  ww_field_hospital: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "ww_field_hospital", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }, "brazier"),
  // Reclaim the Fallen (t2 pieces)
  ww_reclaim_the_fallen: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "ww_reclaim_the_fallen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "chalice"),
  // Seance (t3 pieces)
  seance: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "seance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim", source: "summon" }, "feather"),
  // Second Wind Major (t3 pieces)
  second_wind_major: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "second_wind_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board", source: "summon" }, "hourglass"),
  // Will-o'-Wisp (t3 tempo)
  will_o_wisp: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "will_o_wisp", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board", source: "frozen" }, "mirror"),
  // Last Reserves (t3 pieces)
  ww_last_reserves: B(LanternLift, ["#7fd8a8","#fff2c9","#1c3a2a"], "ww_last_reserves", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "acorn"),
  // Resurrect (t4 pieces)
  resurrect: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "resurrect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "hand_bell", true),
  // Resurrect Major (t4 pieces)
  resurrect_major: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "resurrect_major", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "cairn", true),
  // Lost and Found (t4 pieces)
  wc_lost_and_found: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "wc_lost_and_found", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "obelisk", true),
  // Recommission (t4 pieces)
  ww_recommission: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "ww_recommission", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "waxseal", true),

  /* --- SatchelDrop ------------------------------------------------------- */
  // Walnut Shell (t1 item)
  walnut_shell: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "walnut_shell", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "coin"),
  // Apple (t2 item)
  apple: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "apple", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast", source: "shield" }, "chalice"),
  // Banana Peel (t2 item)
  banana_peel: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "banana_peel", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "inkpot"),
  // Coconut Bonk (t2 item)
  coconut_bonk: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "coconut_bonk", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast", source: "frozen" }, "bellows"),
  // King's Guard (t2 pieces)
  kings_guard: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "kings_guard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "spool"),
  // Bodyguard (t3 pieces)
  bodyguard: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "bodyguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "dice"),
  // Split Bishop (t3 pieces)
  split_bishop: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "split_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "ledger"),
  // Sapper Team (t3 pieces)
  ww_sapper_team: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "ww_sapper_team", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "hand_bell"),
  // Coffee (t4 item)
  coffee: B(SatchelDrop, ["#b0824a","#ffe9b0","#3e2f1c"], "coffee", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }, "compass", true),
  // Comet Shard (t4 pieces)
  comet_shard: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "comet_shard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }, "acorn", true),
  // Conjured Bishop (t4 pieces)
  wa_conjure_bishop: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "wa_conjure_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "beehive", true),
  // Shieldbearers (t4 pieces)
  ww_shieldbearers: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "ww_shieldbearers", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "hammer", true),

  /* --- CogTick ----------------------------------------------------------- */
  // Free Retreat (t1 tempo)
  // Rewind One (t3 tempo)
  // Wasted Hour (t3 hex)
  wasted_hour: B(CogTick, ["#bf9c50","#9fdcf0","#362c1c"], "wasted_hour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board", source: "stun" }, "cogwheel"),
  // Lost Weekend (t4 hex)
  lost_weekend: B(CogTick, ["#b5924a","#8fe8ff","#302818"], "lost_weekend", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board", source: "slow" }, "hourglass", true),
  // Borrowed Minute (t4 tempo)
  wa_borrowed_minute: B(CogTick, ["#d1aa5a","#7fd8e8","#3c3120"], "wa_borrowed_minute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, "compass", true),

  /* --- BellToll ---------------------------------------------------------- */
  // Deep Breath (t1 nerf)
  deep_breath: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "deep_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "hand_bell"),
  // Reprieve (t1 nerf)
  reprieve: B(BellToll, ["#ffcf4d","#fff4d6","#7a5c2e"], "reprieve", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "warhorn"),
  // Small Mercies (t1 nerf)
  small_mercies: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "small_mercies", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" }, "drum"),
  // Defiance (t2 nerf)
  defiance: B(BellToll, ["#f2c34a","#fdf4dc","#655022"], "defiance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "candle"),
  // Held Breath (t2 nerf)
  held_breath: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "held_breath", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" }, "chalice"),
  // Hunter's Relief (t2 nerf)
  hunters_relief: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "hunters_relief", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "brazier"),
  // Loosen the Leash (t2 nerf)
  // Slack in the Chain (t2 nerf)
  slack_chain: B(BellToll, ["#ffe08a","#fffbef","#8a7038"], "slack_chain", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "feather"),
  // Break the Nerf (t3 nerf)
  break_the_nerf: B(BellToll, ["#ffcf4d","#fff4d6","#7a5c2e"], "break_the_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "mirror"),
  // Grace Period (t3 nerf)
  grace_period: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "grace_period", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "crown"),
  // Half Measure (t3 nerf)
  // Piece Parole (t3 nerf)
  // Timely Lull (t3 nerf)
  timely_lull: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "timely_lull", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "beehive"),
  // Underdog's Grit (t3 nerf)
  underdogs_grit: B(BellToll, ["#ffcf4d","#fff4d6","#7a5c2e"], "underdogs_grit", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "obelisk"),
  // Adrenaline (t4 nerf)
  adrenaline: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "adrenaline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "cairn", true),
  // Counter-Nerf (t4 nerf)
  counter_nerf: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "counter_nerf", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" }, "torch", true),
  // Respite (t4 nerf)
  respite: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "respite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "buoy", true),

  /* --- LeafSpin ---------------------------------------------------------- */
  // Durian (t3 hex)
  durian: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "durian", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }, "acorn"),
  // Pixie Dust (t3 movement)
  pixie_dust: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "pixie_dust", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", anchor: "aim", source: "empower" }, "toadstool"),
  // Seelie Blessing (t3 protection)
  seelie_blessing: B(LeafSpin, ["#559f55","#c0e57f","#1a3d1a"], "seelie_blessing", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "shield" }, "thorn"),
  // Bramble Wall (t3 protection)
  we_bramble_wall: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "we_bramble_wall", { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", anchor: "board", source: "frozen" }, "beehive"),
  // Creeping Roots (t3 protection)
  we_creeping_roots: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "we_creeping_roots", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "board" }, "feather"),
  // Seedlings (t3 pieces)
  we_seedlings: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "we_seedlings", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast" }, "sickle"),
  // Faerie Ring (t4 hex)
  faerie_ring: B(LeafSpin, ["#5faf5f","#ff9dd6","#1c4a2c"], "faerie_ring", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }, "brazier", true),
  // Puck's Mischief (t4 hex)
  pucks_mischief: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "pucks_mischief", { ordering: "sweep", staggerMs: 60, victims: ["q","r"], hasLead: true, sound: "petrifiedforest", anchor: "board", source: "slow" }, "chalice", true),
  // Ancient Grove (t4 pieces)
  we_ancient_grove: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "we_ancient_grove", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "summon" }, "cairn", true),

  /* --- PrismFlash -------------------------------------------------------- */
  // Escape Hatch (t1 movement)
  escape_hatch: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "escape_hatch", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "mirror"),
  // Piece Swap (t2 movement)
  piece_swap: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "piece_swap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "compass"),
  // Recall (t2 movement)
  recall: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "kite"),
  // Regroup the Lines (t2 movement)
  ww_regroup_lines: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "ww_regroup_lines", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "weathervane"),
  // Guard Rotation (t3 movement)
  guard_rotation: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "guard_rotation", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "hourglass"),
  // Blink (t3 movement)
  wa_blink: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "wa_blink", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "coin"),
  // Warp Home (t3 movement)
  warp_home: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "warp_home", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "dice"),
  // Warp Step (t3 movement)
  warp_step: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "warp_step", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "obelisk"),
  // Blink Army (t4 movement)
  blink_army: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "blink_army", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "candle", true),
  // Grand Recall (t4 movement)
  grand_recall: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "grand_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "buoy", true),
  // Mass Recall (t4 movement)
  mass_recall: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "mass_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, "torch", true),
  // Regroup (t4 movement)
  regroup: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "regroup", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, "crown", true),
  // Total Recall (t4 movement)
  total_recall: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "total_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "spool", true),
  // Fold Space (t4 movement)
  wa_swap_flanks: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "wa_swap_flanks", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "waxseal", true),
  // Warp Field (t4 movement)
  warp_field: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "warp_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, "lantern", true),
  // Warp Reign (t4 protection)
  warp_reign: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "warp_reign", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim", source: "shield" }, "pylon", true),
  // Warp Rook (t4 movement)
  warp_rook: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "warp_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "mask", true),
  // Riptide (t4 movement)
  we_riptide: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "we_riptide", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "feather", true),
  // Undertow (t4 movement)
  we_undertow: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "we_undertow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "arrowhead", true),

  /* --- BannerMuster ------------------------------------------------------ */
  // Decoy (t2 protection)
  // Regenerate (t3 pieces)
  regenerate: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "regenerate", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "drum"),
  // Summon Knight (t3 pieces)
  summon_knight: B(BannerMuster, ["#d1583a","#dfe5ee","#3a1a10"], "summon_knight", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "warhorn"),
  // Conjured Scout (t3 pieces)
  wa_conjure_scout: B(BannerMuster, ["#c94a3a","#d8dee9","#331410"], "wa_conjure_scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "spear"),
  // Outriders (t3 pieces)
  ww_outriders: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "ww_outriders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "crown"),
  // Mass Resurrect (t4 pieces)
  mass_resurrect: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "mass_resurrect", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "kite", true),
  // Phantom Rook (t4 pieces)
  phantom_rook: B(BannerMuster, ["#bf5a3a","#cdd6e0","#361812"], "phantom_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "aim", source: "summon" }, "weathervane", true),
  // Forward Observer (t4 pieces)
  ww_forward_observer: B(BannerMuster, ["#a83a2a","#e3e9f2","#2c100c"], "ww_forward_observer", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "board", source: "summon" }, "pylon", true),
  // Reserve Cavalry (t4 pieces)
  ww_reserve_cavalry: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "ww_reserve_cavalry", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "buckler", true),

  /* --- InkSplash --------------------------------------------------------- */
  // Shadow Step (t2 movement)
  // Glamour (t3 pieces)
  glamour: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "glamour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "inkpot"),
  // Piece Steal (t3 pieces)
  piece_steal: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "piece_steal", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "quill"),
  // Dominate (t4 pieces)
  wa_dominate_minor: B(InkSplash, ["#5b4a9f","#e8ddff","#0e0c1c"], "wa_dominate_minor", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "ledger", true),
  // Body Double (t4 pieces)
  wc_body_double: B(InkSplash, ["#8a70e0","#efe6ff","#181430"], "wc_body_double", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "waxseal", true),
  // Defectors (t4 pieces)
  ww_defectors: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "ww_defectors", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "mask", true),
  // Mass Defection (t4 pieces)
  ww_mass_defection: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "ww_mass_defection", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "mirror", true),
};
