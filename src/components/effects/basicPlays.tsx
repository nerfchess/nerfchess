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
// RULE SCENES (slice TC-basic, owner directive 2026-09-23). Every tier 5 and 6
// card and every tier 1 card (the ones seen in round one of nearly every game)
// has left the templates for its own scene, registered with `S` in PLAYS: the
// play draws the pieces and squares the card's rule touches (the rank it
// opens, the move it grants, the capture it forbids, the turn count) and the
// object its name is about, with no shared wash, rail or spectacle layer. See
// "Rule scenes" above the registry for the two coordinate frames they use.
// Tier 2 to 4 cards still ride the templates below.
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
import { LaserStrike, PieceShatter, Shockwave, QUAKE_CLASS, impactVars } from "./impact/impact";

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

/** hex "#rrggbb" -> the space-separated "r g b" triple the shared impact
 * vocabulary tints with (--imp-rgb). */
function rgbOf(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
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
  quakeMs,
  children,
}: {
  palette: Palette;
  delayMs: number;
  /** FLAGSHIP WAVE: when the stage jolts. Defaults to the device-thump beat
   * (+300ms into the strike phase) so every lead lands with physical contact;
   * the shared imp-quake wrapper is in-scene only - the real board crop never
   * shakes. The quake rides an inner wrapper because BoardWideStage's own
   * `.fx-stage` transform is the anchor clamp and must not be overridden. */
  quakeMs?: number;
  children: ReactNode;
}) {
  const [p0, p1] = palette;
  return (
    <BoardWideStage>
      <span
        className={`${QUAKE_CLASS} absolute inset-0 block`}
        style={impactVars(undefined, (quakeMs ?? delayMs + 300) / 1000)}
      >
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
      </span>
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

/* --- FLAGSHIP WAVE: the family impact beat -----------------------------------
   Every lead now lands one moment of REAL contact from the shared impact
   vocabulary (impact/impact.tsx): an optional laser column hammering the cast
   square, an optional pre-clipped shatter (the family's own shard splits in
   half and sprays chips), and an optional ground shockwave, all tinted with
   the play's palette. Two axes keep 296 cards from reading alike:

     family  each FxKind names its own combination and base beat below (a ward
             booms, a curse is lasered down, ice cracks apart, a gaze beam
             spikes...), so the KIND of violence matches the mechanic;
     device  the card's own device motion shifts the beat (DEVICE_SYNC), so
             two siblings on one template land their hit on different counts -
             an anvil card thumps early, a swinging card connects late.

   The stage quake (Stage's quakeMs, wired per template) rides the same family
   beat so the jolt and the hit read as one contact. */
const DEVICE_SYNC: Record<DeviceMotion, number> = { set: 0, pop: 40, rise: 80, turn: 120, swing: 160 };

interface ImpSpec {
  laser?: boolean;
  shock?: boolean;
  /** Shatter glyph accent (the family's own shard, split in half), or none. */
  shatter?: HitAccent;
  /** Base impact beat, ms after the strike phase starts. */
  at: number;
}

const IMP_BY_FX: Record<FxKind, ImpSpec> = {
  ward:   { shock: true, at: 300 },                       // the aegis clamp BOOMS shut
  curse:  { laser: true, shock: true, at: 420 },          // the hex is lasered into the tile
  chain:  { shock: true, shatter: "link", at: 360 },      // the yanked link snaps in half
  frost:  { shatter: "frost", at: 400 },                  // the ice sheet cracks apart, no blast
  stone:  { shock: true, shatter: "stone", at: 380 },     // the granite shell splits open
  glint:  { laser: true, at: 300 },                       // the grant descends as a light column
  leap:   { shock: true, at: 360 },                       // the landing thump
  muster: { shock: true, at: 300 },                       // the pole strikes bedrock
  edict:  { laser: true, at: 440 },                       // the edict comes down from on high
  draw:   { shock: true, at: 380 },                       // the card slaps the table
  gaze:   { laser: true, shock: true, at: 360 },          // the gaze spikes down where it looks
  lock:   { shock: true, at: 420 },                       // the bolt clunks home
  spirit: { laser: true, at: 340 },                       // the soul column
  loot:   { shock: true, shatter: "spark", at: 340 },     // the crate cracks open
  clock:  { shock: true, at: 400 },                       // the tick lands
  bell:   { shock: true, at: 300 },                       // the toll ring
  grove:  { shock: true, at: 380 },                       // roots heave the flagstones
  prism:  { laser: true, shock: true, at: 320 },          // the light column grounds itself
  banner: { shock: true, at: 320 },                       // the standard slams in
  ink:    { shatter: "mote", at: 440 },                   // the blot is split mid-bloom
};

/** The impact composite itself, mounted over the emblem's landing spot. Laser
 * 2 nodes, shatter 6, shockwave 1 - the family combos stay well inside the
 * scene node budget. */
function ImpactBeat({
  kind,
  palette,
  device,
  delayMs,
}: {
  kind: FxKind;
  palette: Palette;
  device?: DeviceKind;
  delayMs: number;
}) {
  const [, p1, p2] = palette;
  const im = IMP_BY_FX[kind];
  const at = delayMs + im.at + (device ? DEVICE_SYNC[DEVICES[device].m] : 0);
  return (
    <span
      className="absolute block"
      style={{ left: "39%", top: "36%", width: "22%", height: "22%", ...impactVars(rgbOf(p1), at / 1000) }}
    >
      {im.laser && <LaserStrike />}
      {im.shatter && (
        <PieceShatter
          glyph={
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              {shardShape(im.shatter, p1, p2)}
            </svg>
          }
        />
      )}
      {im.shock && <Shockwave />}
    </span>
  );
}

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

function SceneFx({
  kind,
  palette,
  device,
  delayMs,
}: {
  kind: FxKind;
  palette: Palette;
  device?: DeviceKind;
  delayMs: number;
}) {
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
      {/* FLAGSHIP WAVE: the family's moment of real contact (laser / shatter /
          shockwave per IMP_BY_FX), synced to the card's own device motion and
          to the stage quake. */}
      <ImpactBeat kind={kind} palette={palette} device={device} delayMs={delayMs} />
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
  device,
}: {
  bold: boolean;
  cls: string;
  delayMs: number;
  children: ReactNode;
  style?: CSSProperties;
  /** mechanic-family spectacle staged behind the emblem (with `palette`) */
  fx?: FxKind;
  palette?: Palette;
  /** the card's own device, so the impact beat lands on ITS rhythm */
  device?: DeviceKind;
}) {
  const s = bold ? 27 : 24;
  const traj = (fx && TRAJ_BY_FX[fx]) || "warpin";
  return (
    <>
      {fx && palette ? <SceneFx kind={fx} palette={palette} device={device} delayMs={delayMs} /> : null}
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 300}>
      <Emblem bold={bold} fx="ward" palette={palette} device={device} cls="bsp-settle" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 420}>
      <Emblem bold={bold} fx="curse" palette={palette} device={device} cls="bsp-stamp" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 360}>
      <Emblem bold={bold} fx="chain" palette={palette} device={device} cls="bsp-drop" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 400}>
      <Emblem bold={bold} fx="frost" palette={palette} device={device} cls="bsp-spoke" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 780}>
      <Emblem bold={bold} fx="stone" palette={palette} device={device} cls="bsp-shudder" delayMs={delayMs + 400}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 300}>
      <Emblem bold={bold} fx="glint" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 360}>
      <Emblem bold={bold} fx="leap" palette={palette} device={device} cls="bsp-rise" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 300}>
      <Emblem bold={bold} fx="muster" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 440}>
      <Emblem bold={bold} fx="edict" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 380}>
      <Emblem bold={bold} fx="draw" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 360}>
      <Emblem bold={bold} fx="gaze" palette={palette} device={device} cls="bsp-blink" delayMs={delayMs} style={{ transformOrigin: "50% 50%" }}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 420}>
      <Emblem bold={bold} fx="lock" palette={palette} device={device} cls="bsp-drop" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 340}>
      <Emblem bold={bold} fx="spirit" palette={palette} device={device} cls="bsp-lift" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 340}>
      <Emblem bold={bold} fx="loot" palette={palette} device={device} cls="bsp-plop" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 400}>
      <Emblem bold={bold} fx="clock" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 300}>
      <Emblem bold={bold} fx="bell" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 380}>
      <Emblem bold={bold} fx="grove" palette={palette} device={device} cls="bsp-facein" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 320}>
      <Emblem bold={bold} fx="prism" palette={palette} device={device} cls="bsp-drop" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 320}>
      <Emblem bold={bold} fx="banner" palette={palette} device={device} cls="bsp-drop" delayMs={delayMs}>
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
    <Stage palette={palette} delayMs={delayMs} quakeMs={delayMs + 440}>
      <Emblem bold={bold} fx="ink" palette={palette} device={device} cls="bsp-blot" delayMs={delayMs}>
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
      {/* FLAGSHIP "Summit Strike": the tier-7 marquee earns the full impact
          vocabulary - a golden column lasers the summit as the last terrace
          locks in, a ground shockwave rolls off the chosen square, and the
          whole ziggurat jolts on the same beat (in-scene quake only). */}
      <span className={`${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, (delayMs + 880) / 1000)}>
      <span
        className="absolute block"
        style={{ left: "39%", top: "33%", width: "22%", height: "22%", ...impactVars(rgbOf(HG_GOLD), (delayMs + 880) / 1000) }}
      >
        <LaserStrike />
        <Shockwave />
      </span>
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
      </span>
    </BoardWideStage>
  );
}

/* =============================================================================
   Rule scenes (slice TC-basic, owner directive 2026-09-23: card effects are
   card specific). A card on a rule scene no longer rides a template; its play
   draws the pieces and squares its rule touches and the object its name is
   about, and nothing else. Generic rings, sparks and board washes are gone
   from these scenes.

   Two coordinate frames, one per kind of rule:
   - BOARD rules (a rank, a half, a class of piece): <BoardFrame>, whose 0..100%
     is exactly the board at any anchor. `sq(file, rank)` counts ranks from the
     CASTER's side through --fx-side, so either player sees the right ranks.
   - PIECE rules (the chosen piece, the cast square): the 14-cell stage centred
     on the cast square. `cell(dx, dy)` counts dy forward, away from the caster,
     through --fx-side the same way.

   Every layer box is one square, so the bsp-r-* motion tracks move in whole
   squares (--mx files, --my ranks forward). Every beat offset goes through
   `dm(delayMs, off)`, which scales it by --fx-dur like the tracks themselves.
   The target and entrance roles keep the card's own palette, device and face
   icon through <RuleCut>.
   ========================================================================== */

interface RuleProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** Absolute start plus a --fx-dur scaled offset. */
function dm(delayMs: number, off: number): string {
  return `calc(${delayMs}ms + ${off}ms * var(--fx-dur, 1))`;
}

/** A track length scaled by --fx-dur. */
function dur(ms: number): string {
  return `calc(${ms}ms * var(--fx-dur, 1))`;
}

/** Top edge of the caster's rank `r` (1 = their home rank), BoardFrame %. */
function rankTop(r: number): string {
  return `calc(43.75% + var(--fx-side, 1) * ${43.75 - (r - 1) * 12.5}%)`;
}

/** One square: screen file `f` (0-7) of the caster's rank `r`, BoardFrame %. */
function sq(f: number, r: number, w = 1): CSSProperties {
  return { left: `${f * 12.5}%`, top: rankTop(r), width: `${12.5 * w}%`, height: "12.5%" };
}

/** The band over the caster's ranks `lo`..`hi`, BoardFrame %. */
function band(lo: number, hi: number): CSSProperties {
  const c = (8 - hi + (lo - 1)) * 6.25;
  const d = (8 - hi - (lo - 1)) * 6.25;
  return { left: 0, width: "100%", top: `calc(${c}% + var(--fx-side, 1) * ${d}%)`, height: `${(hi - lo + 1) * 12.5}%` };
}

/** A block of squares: `w` files from screen file `f`, over the caster's
 *  ranks `lo`..`hi`, BoardFrame %. */
function area(f: number, lo: number, w: number, hi: number): CSSProperties {
  return { ...band(lo, hi), left: `${f * 12.5}%`, width: `${w * 12.5}%` };
}

/** Top edge of a box `h`% tall centred on the line between the caster's ranks
 *  `r` and `r + 1`, BoardFrame %. */
function lineTop(r: number, h: number): string {
  return `calc(50% + var(--fx-side, 1) * ${50 - r * 12.5}% - ${h / 2}%)`;
}

/** One board cell on the 14-cell stage. */
const CELL = 100 / 14;

/** A square `dx` files right of and `dy` ranks forward of the cast square
 *  (forward = away from the caster), scaled by `s` about its centre. */
function cell(dx: number, dy: number, s = 1): CSSProperties {
  const size = CELL * s;
  const inset = (CELL - size) / 2;
  return {
    left: `${6.5 * CELL + dx * CELL + inset}%`,
    top: `calc(${6.5 * CELL + inset}% - var(--fx-side, 1) * ${dy * CELL}%)`,
    width: `${size}%`,
    height: `${size}%`,
  };
}

/** Static mirror for art authored pointing away from the caster. Never on an
 *  animated node. */
const FLIP: CSSProperties = { scale: "1 var(--fx-side, 1)" };

/** One animated layer. `c` is its bsp-* track; `at` its start (from dm). */
function Ly({
  c,
  at,
  box,
  len,
  v,
  children,
}: {
  c: string;
  at: string;
  box: CSSProperties;
  len?: string;
  v?: Record<string, string | number>;
  children?: ReactNode;
}) {
  return (
    <span className={`${c} absolute block`} style={{ ...box, ...(v as CSSProperties), animationDelay: at, ...(len ? { animationDuration: len } : null) }}>
      {children}
    </span>
  );
}

/** A plain wrapper for a static rotation or mirror around an animated layer. */
function Pin({ box, children }: { box: CSSProperties; children: ReactNode }) {
  return <span className="absolute block" style={box}>{children}</span>;
}

type ManKind = "p" | "n" | "b" | "r" | "q" | "k";

const MEN: Record<ManKind, ReactNode> = {
  p: (<><circle cx="5" cy="3.4" r="1.7" /><path d="M3.2 10.8 L4.1 6 C4.3 5.4 5.7 5.4 5.9 6 L6.8 10.8 Z" /></>),
  n: <path d="M3 10.8 C3 6.6 4.3 4.6 6.4 4.2 L7.6 5.7 L6.6 6.6 C6.6 8.4 5.8 10.8 4.6 10.8 Z" />,
  b: (<><path d="M5 1.4 C6.6 2.9 6.8 4.5 5 6 C3.2 4.5 3.4 2.9 5 1.4 Z" /><path d="M3.4 10.8 L4.4 6.6 H5.6 L6.6 10.8 Z" /></>),
  r: <path d="M3 10.8 V5 H2.6 V2.4 H4 V3.4 H4.6 V2.4 H5.4 V3.4 H6 V2.4 H7.4 V5 H7 V10.8 Z" />,
  q: (<><path d="M2.6 4.2 L3.3 1.8 L4.4 3.4 L5 1.3 L5.6 3.4 L6.7 1.8 L7.4 4.2 Z" /><path d="M3.2 10.8 L4 4.8 H6 L6.8 10.8 Z" /></>),
  k: (<><path d="M4.4 1.5 H5.6 M5 0.9 V2.1" fill="none" strokeWidth="0.7" /><path d="M3 4.6 L3.6 2.8 H6.4 L7 4.6 Z" /><path d="M3.4 10.8 L4 5 H6 L6.6 10.8 Z" /></>),
};

/** A chessman filling one square: the caster's pieces in the glow colour, the
 *  opponent's (`foe`) in the deep accent, `ghost` as a dashed outline only. */
function Man({ k, pal, foe, ghost }: { k: ManKind; pal: Palette; foe?: boolean; ghost?: boolean }) {
  const [p0, p1, p2] = pal;
  return (
    <svg viewBox="-2 -0.6 14 13" className="block h-full w-full" aria-hidden="true">
      <g
        fill={ghost ? "none" : foe ? p2 : p1}
        stroke={ghost ? p1 : foe ? p1 : p2}
        strokeWidth={ghost ? 0.5 : 0.55}
        strokeDasharray={ghost ? "1.1 0.8" : undefined}
        {...SJ}
      >
        {MEN[k]}
      </g>
      {foe && !ghost ? <path d="M3.4 10.8 H6.6" stroke={p0} strokeWidth="0.5" /> : null}
    </svg>
  );
}

const HEATER = "M5 0.8 L9 2.2 V5.4 C9 8 7.2 9.5 5 10.3 C2.8 9.5 1 8 1 5.4 V2.2 Z";
const CROWN = "M1.6 8 V3.4 L3.8 5.4 L5 2.2 L6.2 5.4 L8.4 3.4 V8 Z";

/** A ward (cannot be captured) in one square. */
function Ward({ pal, broken }: { pal: Palette; broken?: boolean }) {
  const [p0, p1] = pal;
  return (
    <svg viewBox="-1 -0.5 12 12" className="block h-full w-full" aria-hidden="true">
      <path d={HEATER} fill={broken ? "none" : tint(p0, 0.28)} stroke={p1} strokeWidth="0.6" strokeDasharray={broken ? "1.3 0.9" : undefined} {...SJ} />
      {broken ? <path d="M5.4 1.6 L4.4 4.6 L5.8 6.4 L4.6 9.4" fill="none" stroke={p1} strokeWidth="0.55" {...SJ} /> : null}
    </svg>
  );
}

/** A struck-out mark: the move or target the rule forbids. */
function Nope({ color, w = 1 }: { color: string; w?: number }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2.2 2.2 L7.8 7.8 M7.8 2.2 L2.2 7.8" stroke={color} strokeWidth={w} strokeLinecap="round" />
    </svg>
  );
}

/** A row of `n` turn pips: how many turns the rule lasts. */
function Pips({ n, fill, stroke }: { n: number; fill: string; stroke: string }) {
  return (
    <svg viewBox={`0 0 ${n * 4} 4`} className="block h-full w-full" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={2 + i * 4} cy="2" r="1.35" fill={fill} stroke={stroke} strokeWidth="0.35" />
      ))}
    </svg>
  );
}

/** A pips row `n` wide, centred on the caster's rank line `r` edge (BoardFrame). */
function pipsBox(n: number, left: number, r: number): CSSProperties {
  return { left: `${left}%`, top: `calc(${rankTop(r)} + 4.5%)`, width: `${n * 3.2}%`, height: "3.2%" };
}

/** The target and entrance roles of a rule scene: the card's own palette,
 *  device and face icon, as on the templates. */
function RuleCut({ id, pal, dev, fx, role, delayMs }: { id: string; pal: Palette; dev: DeviceKind; fx: FxKind; role: SigRole; delayMs: number }) {
  const def = BUFF_BY_ID[id];
  const Icon = def ? cardFaceIcon(id, def.category, def.icon) : undefined;
  if (role === "entrance") return <Entrance fx={fx} palette={pal} Icon={Icon} device={dev} delayMs={delayMs} />;
  return <TargetHit palette={pal} Icon={Icon} delayMs={delayMs} accent={FX_SPECS[fx].parts.accent} />;
}

/** Bind a rule scene into a SigPlugin (the scene runs all three roles). */
function S(Scene: ComponentType<RuleProps>, config: SigPlugin["config"]): SigPlugin {
  return { config, Render: Scene };
}

/* --- Tier 5 and 6 rule scenes (F225: these cards left the tier 1-4 templates) */

/** Changeling: the chosen enemy knight was a changeling. Its fae mask cracks
 *  and falls away in two halves, the knight shrinks out and the pawn it always
 *  was stands in the square; the cradle it was swapped from rocks under it. */
const CHANGELING: Palette = ["#6fe3ff", "#fff4d6", "#1c3a4a"];
function ChangelingScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="changeling" pal={CHANGELING} dev="brazier" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CHANGELING;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the chosen square, the knight standing in it */}
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0)} len={dur(2000)} v={{ border: `2px dashed ${p0}`, background: tint(p0, 0.16) }} />
      <Ly c="bsp-r-gone" at={d(40)} box={cell(0, 0)} len={dur(1200)}>
        <Man k="n" pal={CHANGELING} foe />
      </Ly>
      {/* strike: the glamour's mask cracks down the middle ... */}
      <Ly c="bsp-stamp" at={d(300)} box={cell(0, 0.42, 0.62)} len={dur(700)}>
        <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1 1.6 C3 0.6 7 0.6 9 1.6 C9 5 7 7.4 5 7.4 C3 7.4 1 5 1 1.6 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.45" {...SJ} />
          <path d="M3 3.2 H4.2 M5.8 3.2 H7" stroke={p2} strokeWidth="0.7" strokeLinecap="round" />
          <path d="M5 0.9 L4.4 3 L5.6 4.4 L4.6 7.4" fill="none" stroke={p0} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      {/* ... and its two halves fall away to either side */}
      {[-1, 1].map((s) => (
        <Ly key={s} c="bsp-r-move" at={d(620)} box={cell(s * 0.16, 0.42, 0.34)} len={dur(900)} v={{ "--mx": s * 1.6, "--my": -1.4 }}>
          <svg viewBox="0 0 5 8" className="block h-full w-full" aria-hidden="true" style={s < 0 ? undefined : { scale: "-1 1" }}>
            <path d="M5 0.9 C3.4 0.9 1.8 1.1 0.6 1.6 C0.6 5 2.6 7.4 5 7.4 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.4" {...SJ} />
          </svg>
        </Ly>
      ))}
      {/* the pawn it always was */}
      <Ly c="bsp-facein" at={d(760)} box={cell(0, 0)} len={dur(1400)}>
        <Man k="p" pal={CHANGELING} foe />
      </Ly>
      {/* settle: the cradle it was swapped from rocks once beneath it */}
      <Ly c="bsp-swing" at={d(980)} box={cell(0, -0.62, 0.8)} len={dur(1300)}>
        <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 1.2 H10.6 L9.4 4 H2.6 Z" fill={tint(p0, 0.6)} stroke={p1} strokeWidth="0.45" {...SJ} />
          <path d="M0.6 4.4 C3.6 5.8 8.4 5.8 11.4 4.4" fill="none" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Loyal Pawn: the caster's 7th rank becomes a promotion rank for one pawn.
 *  The 8th is struck through, a pawn steps onto the 7th, the crown comes down
 *  there and it stands as a queen, warded for the opponent's next turn. */
const LOYAL: Palette = ["#6fe3ff", "#fff4d6", "#1c3a4a"];
function LoyalPawnScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="loyal_pawn" pal={LOYAL} dev="arrowhead" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LOYAL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the 7th rank is marked as the new last rank */}
        <Ly c="bsp-r-hold" at={d(0)} box={band(7, 7)} len={dur(2000)} v={{ background: tint(p0, 0.22), border: `2px dashed ${p0}` }} />
        {/* the 8th is not needed: a line is drawn through it */}
        <Ly c="bsp-taut" at={d(160)} box={{ ...band(8, 8), height: "1.2%", marginTop: "5.6%", background: tint(p1, 0.85) }} len={dur(1700)} />
        {/* strike: the loyal pawn steps from the 6th onto the 7th */}
        <Ly c="bsp-r-move" at={d(300)} box={sq(3, 6)} len={dur(1000)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="p" pal={LOYAL} />
        </Ly>
        {/* the crown comes down on it there ... */}
        <Ly c="bsp-drop" at={d(560)} box={{ ...sq(3, 7), height: "7%" }} len={dur(900)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={CROWN} fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </Ly>
        {/* ... and it stands as a queen */}
        <Ly c="bsp-facein" at={d(820)} box={sq(3, 7)} len={dur(1300)}>
          <Man k="q" pal={LOYAL} />
        </Ly>
        {/* settle: the new piece is warded for the opponent's next turn */}
        <Ly c="bsp-stamp" at={d(1080)} box={sq(3, 7)} len={dur(1200)}>
          <Ward pal={LOYAL} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Mass Resurrect: four headstones stand on the caster's 2nd rank, crumble,
 *  and four pawns rise out of them; a banner counts the four. */
const MASSRES: Palette = ["#a83a2a", "#e3e9f2", "#2c100c"];
const MASSRES_FILES = [
  { f: 1, d: 300 },
  { f: 3, d: 380 },
  { f: 4, d: 460 },
  { f: 6, d: 540 },
];
function MassResurrectScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="mass_resurrect" pal={MASSRES} dev="kite" fx="banner" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MASSRES;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the caster's 2nd rank is marked */}
        <Ly c="bsp-r-hold" at={d(60)} box={band(2, 2)} len={dur(2000)} v={{ background: tint(p0, 0.2), border: `2px dashed ${tint(p1, 0.8)}` }} />
        {/* four headstones stand in it and crumble ... */}
        {MASSRES_FILES.map((s) => (
          <Ly key={`h${s.f}`} c="bsp-r-gone" at={d(s.d - 240)} box={sq(s.f, 2)} len={dur(1000)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2.6 9.4 V4 C2.6 1.6 7.4 1.6 7.4 4 V9.4 Z" fill={tint(p2, 0.85)} stroke={p1} strokeWidth="0.45" {...SJ} />
              <path d="M5 3.4 V6.6 M3.8 4.6 H6.2" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </Ly>
        ))}
        {/* ... and four pawns rise from them */}
        {MASSRES_FILES.map((s) => (
          <Ly key={`p${s.f}`} c="bsp-rise" at={d(s.d + 260)} box={sq(s.f, 2)} len={dur(1400)}>
            <Man k="p" pal={MASSRES} />
          </Ly>
        ))}
        {/* soil thrown up at the first grave */}
        <Ly c="bsp-drift" at={d(560)} box={{ ...sq(1, 2), width: "3%", height: "3%" }} v={{ "--dx": "-160%", "--dy": "calc(var(--fx-side, 1) * -260%)", "--rot": "40deg", background: p2 }} />
        {/* settle: a banner counts the four */}
        <Ly c="bsp-unfurl" at={d(1100)} box={{ left: "30%", top: `calc(${rankTop(3)} + 3%)`, width: "40%", height: "6.5%" }} len={dur(1200)}>
          <svg viewBox="0 0 40 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0.4 0.4 H39.6 L37.6 3 L39.6 5.6 H0.4 Z" fill={p0} stroke={p1} strokeWidth="0.4" {...SJ} />
            <path d="M14 1.4 V4.6 M18 1.4 V4.6 M22 1.4 V4.6 M26 1.4 V4.6" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Shieldbearers: two pawns step in beside the caster's king and raise their
 *  shields; an enemy blade driving at the king glances off while they stand
 *  there, and the king's ward is sealed for the rest of the game. */
const SHIELDB: Palette = ["#a87a4a", "#a8e07f", "#3a2c1c"];
function ShieldbearersScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_shieldbearers" pal={SHIELDB} dev="hammer" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SHIELDB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the squares beside the king are marked */}
        <Ly c="bsp-r-hold" at={d(0)} box={area(3, 1, 3, 2)} len={dur(2100)} v={{ border: `2px dashed ${p1}`, background: tint(p0, 0.16) }} />
        {/* the king at home */}
        <Ly c="bsp-r-hold" at={d(40)} box={sq(4, 1)} len={dur(2000)}>
          <Man k="k" pal={SHIELDB} />
        </Ly>
        {/* strike: two pawns step in beside him ... */}
        {[3, 5].map((f, i) => (
          <Ly key={`p${f}`} c="bsp-r-move" at={d(280 + i * 90)} box={sq(f, 3)} len={dur(1700)} v={{ "--mx": 0, "--my": -1 }}>
            <Man k="p" pal={SHIELDB} />
          </Ly>
        ))}
        {/* ... and raise their shields */}
        {[3, 5].map((f, i) => (
          <Ly key={`s${f}`} c="bsp-grow" at={d(620 + i * 90)} box={sq(f, 2)} len={dur(1300)}>
            <Ward pal={SHIELDB} />
          </Ly>
        ))}
        {/* an enemy blade drives at the king and glances off */}
        <Ly c="bsp-r-balk" at={d(820)} box={sq(4, 3)} len={dur(1000)} v={{ "--mx": 0, "--my": -1.4 }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true" style={FLIP}>
            <path d="M5 9.4 L5.9 7.4 V1.4 H4.1 V7.4 Z" fill={p2} stroke={p1} strokeWidth="0.35" {...SJ} />
            <path d="M3 2.2 H7" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* settle: the king's ward, with no count: for the rest of the game */}
        <Ly c="bsp-stamp" at={d(1120)} box={sq(4, 1)} len={dur(1200)}>
          <svg viewBox="-1 -0.5 12 12" className="block h-full w-full" aria-hidden="true">
            <path d={HEATER} fill={tint(p0, 0.3)} stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M5 5.6 C4.3 4.5 3 4.5 3 5.6 C3 6.7 4.3 6.7 5 5.6 C5.7 4.5 7 4.5 7 5.6 C7 6.7 5.7 6.7 5 5.6 Z" fill="none" stroke={p1} strokeWidth="0.5" {...SJ} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Comet Shard: a shard of a comet streaks down onto an empty square in the
 *  caster's half and stands as a bishop; its light reaches three pieces of
 *  theirs, and all four are warded for the opponent's next turn. */
const COMET: Palette = ["#8a6a3a", "#ffd23f", "#33261a"];
const COMET_RAYS = [
  { dx: -1, dy: 1, k: "n" as ManKind, rot: -135, len: 1.41, d: 700 },
  { dx: 1, dy: 1, k: "r" as ManKind, rot: -45, len: 1.41, d: 760 },
  { dx: -1, dy: -1, k: "p" as ManKind, rot: 135, len: 1.41, d: 820 },
];
function CometShardScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="comet_shard" pal={COMET} dev="acorn" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COMET;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* the three pieces its light will reach stand by */}
      {COMET_RAYS.map((r) => (
        <Ly key={`m${r.rot}`} c="bsp-r-hold" at={d(0)} box={cell(r.dx, r.dy)} len={dur(2100)}>
          <Man k={r.k} pal={COMET} />
        </Ly>
      ))}
      {/* tell and strike: the shard streaks in from the far side and lands */}
      <Ly c="bsp-r-fall" at={d(80)} box={cell(0, 0, 0.8)} len={dur(900)} v={{ "--mx": 3 }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 2.6 L7.4 5 L5 7.4 L2.6 5 Z" fill={p1} stroke={p2} strokeWidth="0.4" {...SJ} />
          <path d="M6.6 3.4 L9.6 0.4 M7.4 4.2 L9.8 1.8" stroke={tint(p1, 0.7)} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* it lands as a bishop, still glowing */}
      <Ly c="bsp-facein" at={d(460)} box={cell(0, 0)} len={dur(1600)}>
        <Man k="b" pal={COMET} />
      </Ly>
      {/* its light reaches the three pieces */}
      {COMET_RAYS.map((r) => (
        <Pin key={`r${r.rot}`} box={{ ...cell(0, 0), transform: `rotate(calc(${r.rot}deg * var(--fx-side, 1)))` }}>
          <Ly c="bsp-taut" at={d(r.d - 100)} box={{ left: "50%", top: "46%", width: `${r.len * 100 - 40}%`, height: "8%", background: tint(p1, 0.75) }} len={dur(900)} />
        </Pin>
      ))}
      {/* settle: four wards, the bishop's and the three it reached */}
      <Ly c="bsp-stamp" at={d(760)} box={cell(0, 0)} len={dur(1200)}>
        <Ward pal={COMET} />
      </Ly>
      {COMET_RAYS.map((r) => (
        <Ly key={`w${r.rot}`} c="bsp-stamp" at={d(r.d + 160)} box={cell(r.dx, r.dy)} len={dur(1200)}>
          <Ward pal={COMET} />
        </Ly>
      ))}
    </BoardWideStage>
  );
}

/** Duelist: a gauntlet is thrown down before the chosen piece; the first enemy
 *  to take it lunges in, the blades cross and the attacker breaks instead,
 *  and the piece stands with its one duel spent. */
const DUELIST: Palette = ["#8fb5e8", "#ffd76a", "#22304a"];
function DuelistScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="duelist" pal={DUELIST} dev="compass" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DUELIST;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the chosen piece, and the gauntlet thrown down before it */}
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0)} len={dur(2100)} v={{ border: `2px solid ${tint(p0, 0.8)}` }}>
        <Man k="n" pal={DUELIST} />
      </Ly>
      <Ly c="bsp-drop" at={d(120)} box={cell(0, 0.62, 0.5)} len={dur(900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.4 3 H6.6 L8.6 5 V8.8 H2.4 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M3.6 5.2 H7.2 M3.6 7 H7.2" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* strike: an enemy bishop lunges in to capture ... */}
      <Ly c="bsp-r-move" at={d(360)} box={cell(1, 1)} len={dur(760)} v={{ "--mx": -1, "--my": -1 }}>
        <Man k="b" pal={DUELIST} foe />
      </Ly>
      {/* ... the blades cross ... */}
      <Ly c="bsp-stamp" at={d(640)} box={cell(0.5, 0.5, 0.7)} len={dur(900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 1.4 L8.2 8.2 M8.6 1.4 L1.8 8.2" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M6.6 8.6 L8.8 6.4 M3.4 8.6 L1.2 6.4" stroke={p0} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* ... and the attacker breaks instead */}
      {[{ dx: "150%", dy: "-120%", rot: "140deg" }, { dx: "-130%", dy: "-150%", rot: "-120deg" }].map((s) => (
        <Ly key={s.rot} c="bsp-drift" at={d(780)} box={cell(0.2, 0.1, 0.3)} v={{ "--dx": s.dx, "--dy": s.dy, "--rot": s.rot }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 3 L6 1 L9 7 L3 9 Z" fill={p2} stroke={p1} strokeWidth="0.6" {...SJ} />
          </svg>
        </Ly>
      ))}
      {/* settle: the duel is spent, once */}
      <Ly c="bsp-facein" at={d(1100)} box={cell(0.62, -0.1, 0.4)} len={dur(1100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4.2" fill={p2} stroke={p1} strokeWidth="0.6" />
          <path d="M5 2.6 V7.4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Hard Frost: two enemy pieces are sealed in ice blocks where they stand
 *  and strain against them; the frost stops short of their king, who cannot
 *  be targeted; two frost pips for the two turns. */
const HARDFROST: Palette = ["#9fd8ff", "#e8f8ff", "#2c5a80"];
const HARDFROST_T = [
  { dx: 0, dy: 0, k: "r" as ManKind, d: 300 },
  { dx: -1, dy: 1, k: "n" as ManKind, d: 420 },
];
function HardFrostScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="hard_frost" pal={HARDFROST} dev="helm" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HARDFROST;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the two targets, straining once the ice is on them */}
      {HARDFROST_T.map((t) => (
        <Ly key={`m${t.k}`} c="bsp-r-strain" at={d(0)} box={cell(t.dx, t.dy)} len={dur(2000)}>
          <Man k={t.k} pal={HARDFROST} foe />
        </Ly>
      ))}
      {/* strike: two halves of an ice block close on each */}
      {HARDFROST_T.map((t) => (
        <Ly key={`l${t.k}`} c="bsp-close-l" at={d(t.d)} box={{ ...cell(t.dx, t.dy), width: `${CELL / 2}%` }} len={dur(1500)} v={{ background: tint(p0, 0.42), borderLeft: `2px solid ${p1}` }} />
      ))}
      {HARDFROST_T.map((t) => (
        <Ly key={`r${t.k}`} c="bsp-close-r" at={d(t.d)} box={{ ...cell(t.dx + 0.5, t.dy), width: `${CELL / 2}%` }} len={dur(1500)} v={{ background: tint(p1, 0.36), borderRight: `2px solid ${p1}` }} />
      ))}
      {/* their king beside them cannot be targeted: the frost stops short */}
      <Ly c="bsp-r-hold" at={d(260)} box={cell(1, 1)} len={dur(1700)}>
        <Man k="k" pal={HARDFROST} foe />
      </Ly>
      <Ly c="bsp-r-balk" at={d(420)} box={cell(0, 0, 0.5)} len={dur(900)} v={{ "--mx": 1.4, "--my": 1.4 }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.6 L6.2 5 L5 9.4 L3.8 5 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-facein" at={d(700)} box={cell(1, 1, 0.8)} len={dur(1100)}>
        <Nope color={p1} w={1.1} />
      </Ly>
      {/* settle: two pips, two of their turns */}
      <Ly c="bsp-stamp" at={d(1000)} box={{ ...cell(-0.5, -0.62), width: `${CELL * 1.2}%`, height: `${CELL * 0.3}%` }} len={dur(1100)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Hero's Journey: the road runs out from the caster's side, the horn calls,
 *  and at the road's end the next draft deals three cards (the third flips
 *  into the empty slot) while the bank coin climbs a tier. */
const HEROJ: Palette = ["#8f6bff", "#fff2c9", "#22123e"];
const HEROJ_CARDS = [
  { l: 30, rot: -12, d: 520 },
  { l: 44, rot: 0, d: 600 },
];
function HerosJourneyScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="heros_journey" pal={HEROJ} dev="mirror" fx="draw" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HEROJ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the road winds out from the caster's side toward the middle */}
        <Pin box={{ ...band(2, 4), left: "36%", width: "28%", scale: "1 var(--fx-side, 1)" }}>
          <Ly c="bsp-grow" at={d(0)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1900)}>
            <svg viewBox="0 0 20 30" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M10 29 C2 23 18 16 9 10 C4 7 8 3 10 1" fill="none" stroke={tint(p1, 0.8)} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M10 29 C2 23 18 16 9 10 C4 7 8 3 10 1" fill="none" stroke={p2} strokeWidth="0.6" strokeDasharray="1.6 1.4" strokeLinecap="round" />
            </svg>
          </Ly>
        </Pin>
        {/* the call to adventure: a horn at the road's start */}
        <Ly c="bsp-swing" at={d(140)} box={{ ...sq(2, 2), width: "10%", height: "10%" }} len={dur(1200)}>
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M3 16.4c5.4 3 12.6 2.2 17.6-7-4.4 1.2-8.6.2-11.6 2.2S4 15.4 3 16.4z" fill={p0} stroke={p2} strokeWidth="1.1" {...SJ} />
          </svg>
        </Ly>
        {/* strike: at the road's end, the draft deals ... */}
        {HEROJ_CARDS.map((c) => (
          <Pin key={c.l} box={{ left: `${c.l}%`, top: "36%", width: "11%", height: "16%", transform: `rotate(${c.rot}deg)` }}>
            <Ly c="bsp-flip" at={d(c.d)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1500)} v={{ background: p2, border: `2px solid ${p1}` }} />
          </Pin>
        ))}
        {/* ... three cards, not two: the third flips into a fresh slot */}
        <Pin box={{ left: "58%", top: "36%", width: "11%", height: "16%", transform: "rotate(12deg)" }}>
          <Ly c="bsp-facein" at={d(760)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1400)} v={{ background: p0, border: `2px solid ${p1}` }} />
        </Pin>
        {/* settle: the bank coin climbs one tier */}
        <Ly c="bsp-rise" at={d(1000)} box={{ left: "45%", top: "20%", width: "10%", height: "10%" }} len={dur(1300)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5.6" r="3.8" fill={p1} stroke={p2} strokeWidth="0.5" />
            <path d="M3 6.4 L5 4.2 L7 6.4" fill="none" stroke={p2} strokeWidth="0.9" {...SJ} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Lost Weekend: the opponent's side goes quiet, the weekend's two calendar
 *  pages tear away (their turn is skipped), and their clock hand is wound
 *  back as twenty seconds come off it. */
const LOSTWK: Palette = ["#b5924a", "#8fe8ff", "#302818"];
function LostWeekendScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="lost_weekend" pal={LOSTWK} dev="hourglass" fx="clock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LOSTWK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the opponent's half goes still */}
        <Ly c="bsp-r-hold" at={d(0)} box={band(5, 8)} len={dur(2000)} v={{ background: tint(p2, 0.34) }} />
        {/* their side sleeps through it */}
        <Ly c="bsp-lift" at={d(240)} box={{ ...sq(5, 7), width: "9%", height: "8%" }} len={dur(1500)}>
          <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 4 H4.6 L1 8 H4.6 M6.4 1 H10.6 L6.4 6 H10.6" fill="none" stroke={p1} strokeWidth="0.9" {...SJ} />
          </svg>
        </Ly>
        {/* the calendar: two weekend pages over a weekday */}
        <Ly c="bsp-r-hold" at={d(80)} box={{ left: "30%", top: "38%", width: "16%", height: "20%" }} len={dur(1900)} v={{ background: p1, border: `2px solid ${p2}` }} />
        {/* strike: Saturday, then Sunday, tear off and blow away */}
        {[0, 1].map((i) => (
          <Ly key={i} c="bsp-r-move" at={d(340 + i * 220)} box={{ left: "30%", top: "38%", width: "16%", height: "20%" }} len={dur(900)} v={{ "--mx": 1.4 - i * 0.5, "--my": 1.2, background: i ? p0 : tint(p0, 0.9), border: `2px solid ${p2}` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M1 2.4 H9" stroke={p2} strokeWidth="0.8" />
              <path d={i ? "M3 5 H7 M3 7.4 H6" : "M3 5 H6 M3 7.4 H7"} stroke={p2} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </Ly>
        ))}
        {/* their clock: the face ... */}
        <Ly c="bsp-r-hold" at={d(200)} box={{ left: "56%", top: "37%", width: "18%", height: "18%" }} len={dur(1800)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="0.6" />
            <path d="M5 5 L5 0.8 A4.2 4.2 0 0 1 8.6 2.9 Z" fill={tint(p1, 0.55)} />
          </svg>
        </Ly>
        {/* ... and its hand wound back twenty seconds */}
        <Ly c="bsp-tickback" at={d(700)} box={{ left: "56%", top: "37%", width: "18%", height: "18%" }} len={dur(1300)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 5 L7.8 2" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
            <circle cx="5" cy="5" r="0.6" fill={p1} />
          </svg>
        </Ly>
        {/* settle: minus twenty */}
        <Ly c="bsp-facein" at={d(1040)} box={{ left: "58%", top: "56%", width: "14%", height: "7%" }} len={dur(1100)}>
          <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true">
            <text x="10" y="8" textAnchor="middle" fontSize="8.6" fontWeight="700" fill={p1} stroke={p2} strokeWidth="0.4">-20</text>
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Promote Now: the chosen pawn is marked; the hourglass turns while the
 *  opponent makes their next move, then the crown comes down and the pawn
 *  stands as a queen. */
const PROMOTENOW: Palette = ["#7fc9e8", "#e3f6ff", "#1c3644"];
function PromoteNowScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="promote_now" pal={PROMOTENOW} dev="hourglass" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PROMOTENOW;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the pawn on the 6th, marked */}
      <Ly c="bsp-r-gone" at={d(0)} box={cell(0, 0)} len={dur(1500)} v={{ border: `2px dashed ${p0}` }}>
        <Man k="p" pal={PROMOTENOW} />
      </Ly>
      {/* the hourglass turns: after their next move ... */}
      <Ly c="bsp-turn" at={d(160)} box={cell(-1, 0, 0.66)} len={dur(1300)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M3.6 8.2 H6.4 L5 6.8 Z" fill={p0} />
        </svg>
      </Ly>
      {/* ... which they make, somewhere on their side */}
      <Ly c="bsp-r-move" at={d(360)} box={cell(1, 2)} len={dur(800)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="p" pal={PROMOTENOW} foe />
      </Ly>
      {/* strike: then the crown comes down on the pawn ... */}
      <Ly c="bsp-drop" at={d(700)} box={cell(0, 0.22, 0.62)} len={dur(900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d={CROWN} fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      {/* settle: ... and it stands as a queen */}
      <Ly c="bsp-facein" at={d(980)} box={cell(0, 0)} len={dur(1400)}>
        <Man k="q" pal={PROMOTENOW} />
      </Ly>
    </BoardWideStage>
  );
}

/** Puck's Mischief: the opponent's queen and rooks have their laces tied
 *  together. They strain, the queen gets one square and no further (the rest
 *  of her line is struck out), for three of their turns. */
const PUCK: Palette = ["#6fae4a", "#e8fff7", "#243f14"];
function PucksMischiefScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="pucks_mischief" pal={PUCK} dev="chalice" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PUCK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the two rooks on their back rank, straining once tied */}
        {[0, 7].map((f) => (
          <Ly key={f} c="bsp-r-strain" at={d(0)} box={sq(f, 8)} len={dur(1900)}>
            <Man k="r" pal={PUCK} foe />
          </Ly>
        ))}
        {/* the lace, looped from rook to queen to rook */}
        <Ly c="bsp-taut" at={d(200)} box={{ left: "6%", width: "88%", top: `calc(${rankTop(8)} + 8%)`, height: "5%" }} len={dur(1500)}>
          <svg viewBox="0 0 88 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 2.5 C8 5 14 0 22 2.5 S34 5 38 2.5 C42 0 46 5 50 2.5 S66 0 72 2.5 S82 5 88 2.5" fill="none" stroke={p0} strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* strike: the queen steps out, one square and no further */}
        <Ly c="bsp-r-move" at={d(420)} box={sq(3, 8)} len={dur(1400)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="q" pal={PUCK} foe />
        </Ly>
        {/* the rest of her line is struck out */}
        <Ly c="bsp-facein" at={d(760)} box={area(3, 5, 1, 6)} len={dur(1200)} v={{ borderLeft: `2px dashed ${tint(p1, 0.7)}`, borderRight: `2px dashed ${tint(p1, 0.7)}` }}>
          <Nope color={p1} w={0.9} />
        </Ly>
        {/* settle: three leaf pips, three of their turns */}
        <Ly c="bsp-stamp" at={d(1080)} box={pipsBox(3, 44, 7)} len={dur(1100)}>
          <Pips n={3} fill={p0} stroke={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Queen's Echo: the rook's own lines stand, a queen's silhouette echoes over
 *  it and its diagonals open; the rook steps one of them, for two turns. */
const QECHO: Palette = ["#9fdcf0", "#ffe9b0", "#254452"];
const QECHO_DIAG = [45, 135, 225, 315];
function QueensEchoScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="queens_echo" pal={QECHO} dev="anchor" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = QECHO;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the rook */}
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0)} len={dur(1200)}>
        <Man k="r" pal={QECHO} />
      </Ly>
      {/* strike: the queen's echo over it ... */}
      <Ly c="bsp-facein" at={d(260)} box={cell(0, 0, 1.25)} len={dur(1100)}>
        <Man k="q" pal={QECHO} ghost />
      </Ly>
      {/* ... and the diagonals open from its square */}
      {QECHO_DIAG.map((a, i) => (
        <Pin key={a} box={{ ...cell(0, 0), transform: `rotate(${a}deg)` }}>
          <Ly c="bsp-beam" at={d(420 + i * 40)} box={{ left: "50%", top: "47%", width: "260%", height: "6%", background: `linear-gradient(90deg, ${tint(p1, 0.8)}, transparent)` }} len={dur(1200)} />
        </Pin>
      ))}
      {/* the rook takes one of them */}
      <Ly c="bsp-r-move" at={d(760)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 1, "--my": 1 }}>
        <Man k="r" pal={QECHO} />
      </Ly>
      {/* settle: two pips, two turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={{ ...cell(-0.1, -0.64), width: `${CELL * 1.2}%`, height: `${CELL * 0.3}%` }} len={dur(1000)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Resurrect: a grave opens on the square, the tolling bell answers, and the
 *  strongest fallen piece (a queen) rises; a reroll die is spent for it. */
const RESURRECT: Palette = ["#5fae7f", "#ffd76a", "#16301f"];
function ResurrectScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="resurrect" pal={RESURRECT} dev="hand_bell" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RESURRECT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the grave mound on the square */}
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0)} len={dur(1600)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 9 C1.6 6.2 8.4 6.2 9 9 Z" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      {/* the bell tolls for it */}
      <Ly c="bsp-swing" at={d(120)} box={cell(-1, 0.4, 0.62)} len={dur(1300)}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M5.6 17.4c0-7.4 2.2-11.6 6.4-11.6s6.4 4.2 6.4 11.6z" fill={p1} stroke={p2} strokeWidth="1.1" {...SJ} />
          <path d="M4 17.4h16v2.4H4z" fill={p0} stroke={p2} strokeWidth="0.9" {...SJ} />
        </svg>
      </Ly>
      {/* strike: the queen rises out of it */}
      <Ly c="bsp-rise" at={d(420)} box={cell(0, 0)} len={dur(1600)}>
        <Man k="q" pal={RESURRECT} />
      </Ly>
      {/* earth thrown off the mound */}
      <Ly c="bsp-drift" at={d(460)} box={cell(0.3, -0.2, 0.22)} v={{ "--dx": "220%", "--dy": "calc(var(--fx-side, 1) * -160%)", "--rot": "60deg", background: p2 }} />
      {/* settle: the reroll die is spent for it */}
      <Ly c="bsp-r-gone" at={d(820)} box={cell(1, -0.3, 0.55)} len={dur(1100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
          <circle cx="3.4" cy="3.4" r="0.8" fill={p2} /><circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Resurrect Major: a tomb's lid slides off on an empty square and a rook
 *  rises from it; the bishop it might have been waits as an outline; the
 *  cairn is set once. */
const RESMAJ: Palette = ["#8fd1b0", "#ffe9c9", "#22422e"];
function ResurrectMajorScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="resurrect_major" pal={RESMAJ} dev="cairn" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RESMAJ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the tomb on the empty square */}
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0, 0.9)} len={dur(1700)} v={{ background: tint(p2, 0.85), border: `2px solid ${p0}` }} />
      {/* the lid slides off */}
      <Ly c="bsp-r-move" at={d(200)} box={cell(0, 0, 0.9)} len={dur(900)} v={{ "--mx": 1, "--my": 0, background: p0, border: `2px solid ${p1}` }} />
      {/* strike: a rook rises */}
      <Ly c="bsp-rise" at={d(460)} box={cell(0, 0)} len={dur(1600)}>
        <Man k="r" pal={RESMAJ} />
      </Ly>
      {/* the other choice, a bishop, stands by as an outline */}
      <Ly c="bsp-facein" at={d(560)} box={cell(-1, 0)} len={dur(1200)}>
        <Man k="b" pal={RESMAJ} ghost />
      </Ly>
      {/* settle: the cairn is set beside it, once */}
      <Ly c="bsp-stamp" at={d(1000)} box={cell(0.66, -0.5, 0.5)} len={dur(1100)}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M5.4 17h13.2v4.4H5.4z" fill={p2} stroke={p0} strokeWidth="1" {...SJ} />
          <path d="M7.4 11.4h9.2V17H7.4z" fill={p0} stroke={p2} strokeWidth="1" {...SJ} />
          <path d="M9.6 5.6h4.8v5.8H9.6z" fill={p1} stroke={p2} strokeWidth="1" {...SJ} />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Second Wind (major): the caster's back rank is marked, a gust blows in
 *  from the side carrying a fallen rook home to an empty back-rank square,
 *  and a reroll die is spent for it. */
const SECONDWIND: Palette = ["#7fd8a8", "#fff2c9", "#1c3a2a"];
function SecondWindMajorScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="second_wind_major" pal={SECONDWIND} dev="hourglass" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SECONDWIND;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the back rank */}
        <Ly c="bsp-r-hold" at={d(60)} box={band(1, 1)} len={dur(2000)} v={{ background: tint(p0, 0.2), border: `2px dashed ${p0}` }} />
        {/* the gust: two wind strokes sweep in along it */}
        {[0, 1].map((i) => (
          <Ly key={i} c="bsp-r-move" at={d(i ? 240 : 160)} box={{ ...sq(3, 1, 2), height: "4%", marginTop: `${3 + i * 5}%` }} len={dur(900)} v={{ "--mx": -1.2, "--my": 0 }}>
            <svg viewBox="0 0 20 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 2 C6 0.4 10 3.6 14 2 C16 1.2 18 1.2 19.4 2.2" fill="none" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </Ly>
        ))}
        {/* strike: the rook is carried in on it to the empty corner */}
        <Ly c="bsp-r-hop" at={d(380)} box={sq(3, 1)} len={dur(1500)} v={{ "--mx": -3, "--my": 0 }}>
          <Man k="r" pal={SECONDWIND} />
        </Ly>
        {/* dust where it lands */}
        <Ly c="bsp-drift" at={d(840)} box={{ ...sq(0, 1), width: "3%", height: "3%" }} v={{ "--dx": "240%", "--dy": "-80%", "--rot": "30deg", background: tint(p1, 0.8) }} />
        {/* settle: a reroll die is spent */}
        <Ly c="bsp-r-gone" at={d(1000)} box={{ ...sq(2, 2), width: "7%", height: "7%" }} len={dur(1100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
            <circle cx="3.4" cy="3.4" r="0.8" fill={p2} /><circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Statue Stable: the opponent's knights are shut in walnut shells, the
 *  caster's knights harden on stone plinths (they cannot be captured), both
 *  for two of the opponent's turns. */
const STATUE: Palette = ["#8a8478", "#e8dcc0", "#3c362c"];
function StatueStableScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="statue_stable" pal={STATUE} dev="buckler" fx="stone" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = STATUE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: their two knights */}
        {[1, 6].map((f) => (
          <Ly key={`e${f}`} c="bsp-r-hold" at={d(80)} box={sq(f, 8)} len={dur(1300)}>
            <Man k="n" pal={STATUE} foe />
          </Ly>
        ))}
        {/* strike: walnut shells close on them */}
        {[1, 6].map((f, i) => (
          <Ly key={`l${f}`} c="bsp-close-l" at={d(i ? 380 : 300)} box={{ ...sq(f, 8), width: "6.25%" }} len={dur(1500)}>
            <svg viewBox="0 0 5 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 C1.6 0.8 0.6 3.4 0.6 5 C0.6 6.6 1.6 9.2 5 9.2 Z" fill={p0} stroke={p2} strokeWidth="0.45" {...SJ} />
              <path d="M3.4 2.4 C2.4 3.6 2.4 6.4 3.4 7.6" fill="none" stroke={p2} strokeWidth="0.35" />
            </svg>
          </Ly>
        ))}
        {[1, 6].map((f, i) => (
          <Ly key={`r${f}`} c="bsp-close-r" at={d(i ? 380 : 300)} box={{ ...sq(f, 8), left: `${f * 12.5 + 6.25}%`, width: "6.25%" }} len={dur(1500)}>
            <svg viewBox="0 0 5 10" className="block h-full w-full" aria-hidden="true" style={{ scale: "-1 1" }}>
              <path d="M5 0.8 C1.6 0.8 0.6 3.4 0.6 5 C0.6 6.6 1.6 9.2 5 9.2 Z" fill={p0} stroke={p2} strokeWidth="0.45" {...SJ} />
              <path d="M3.4 2.4 C2.4 3.6 2.4 6.4 3.4 7.6" fill="none" stroke={p2} strokeWidth="0.35" />
            </svg>
          </Ly>
        ))}
        {/* the caster's knights: plinths rise under them ... */}
        {[1, 6].map((f, i) => (
          <Ly key={`b${f}`} c="bsp-grow" at={d(i ? 580 : 500)} box={{ ...sq(f, 1), height: "4%", marginTop: "8.5%" }} len={dur(1500)} v={{ background: p0, border: `1px solid ${p2}` }} />
        ))}
        {/* ... and they harden into statues */}
        {[1, 6].map((f, i) => (
          <Ly key={`s${f}`} c="bsp-facein" at={d(i ? 720 : 640)} box={sq(f, 1)} len={dur(1400)}>
            <Man k="n" pal={[p0, p0, p2]} />
          </Ly>
        ))}
        {/* an enemy pawn reaches for a statue and rebounds: it cannot be taken */}
        <Ly c="bsp-r-balk" at={d(860)} box={sq(2, 2)} len={dur(1000)} v={{ "--mx": -1, "--my": -1 }}>
          <Man k="p" pal={STATUE} foe />
        </Ly>
        {/* settle: two pips, two of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 46.8, 4)} len={dur(1000)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Disjunction: the opponent's pocket opens at their edge and the strongest
 *  waiting pieces, a queen and then a rook, wink out one after the other as
 *  the conjuring sigil splits apart. */
const DISJ: Palette = ["#b98cff", "#ffd76a", "#2a1a4a"];
function DisjunctionScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_disjunction" pal={DISJ} dev="quill" fx="draw" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DISJ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: their pocket, held open at their side */}
        <Ly c="bsp-r-hold" at={d(0)} box={{ ...sq(2, 7, 4), height: "18%", top: `calc(${rankTop(7)} - 2%)` }} len={dur(1900)}>
          <svg viewBox="0 0 40 18" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M2 3 H38 L35 15 C30 17.4 10 17.4 5 15 Z" fill={tint(p2, 0.85)} stroke={p0} strokeWidth="0.7" {...SJ} />
          </svg>
        </Ly>
        {/* strike: strongest first, the queen winks out ... */}
        <Ly c="bsp-r-gone" at={d(300)} box={sq(3, 7)} len={dur(1000)}>
          <Man k="q" pal={DISJ} foe />
        </Ly>
        {/* ... then the rook */}
        <Ly c="bsp-r-gone" at={d(520)} box={sq(4, 7)} len={dur(1000)}>
          <Man k="r" pal={DISJ} foe />
        </Ly>
        {/* a spark where the queen winks out */}
        <Ly c="bsp-glint" at={d(760)} box={{ ...sq(3, 7), width: "5%", height: "5%", marginLeft: "3.75%", marginTop: "3.75%" }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.4 5 L5 10 L3.6 5 Z M0 5 L5 3.6 L10 5 L5 6.4 Z" fill={p1} />
          </svg>
        </Ly>
        {/* the order: 1 and 2 */}
        {[3, 4].map((f, i) => (
          <Ly key={f} c="bsp-stamp" at={d(560 + i * 220)} box={{ ...sq(f, 6), width: "5%", height: "5%", marginLeft: "3.75%" }} len={dur(900)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.2" fill={p2} stroke={p1} strokeWidth="0.6" />
              <text x="5" y="7.2" textAnchor="middle" fontSize="6" fontWeight="700" fill={p1}>{i + 1}</text>
            </svg>
          </Ly>
        ))}
        {/* settle: the conjuring sigil splits in two */}
        {[-1, 1].map((s) => (
          <Ly key={s} c="bsp-r-move" at={d(900)} box={{ left: "43.75%", top: "43.75%", width: "12.5%", height: "12.5%" }} len={dur(1000)} v={{ "--mx": s * 0.6, "--my": 0 }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={s < 0 ? "M5 1 A4 4 0 0 0 5 9" : "M5 1 A4 4 0 0 1 5 9"} fill="none" stroke={p0} strokeWidth="0.8" />
              <path d={s < 0 ? "M5 3 L3.2 5 L5 7" : "M5 3 L6.8 5 L5 7"} fill="none" stroke={p1} strokeWidth="0.6" {...SJ} />
            </svg>
          </Ly>
        ))}
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Jinx: the squares around an enemy knight go sour, and the enemy bishop
 *  that tries to end its move beside it is thrown back; the link between the
 *  two friends snaps, for two of their turns. */
const JINX: Palette = ["#e8dcc0", "#8a6a3a", "#2c3e6b"];
function JinxScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_jinx" pal={JINX} dev="crown" fx="edict" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = JINX;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the ring of squares around their knight goes sour */}
        <Ly c="bsp-r-hold" at={d(0)} box={area(4, 4, 3, 6)} len={dur(2000)} v={{ border: `2px dashed ${p2}`, background: tint(p2, 0.22) }} />
        <Ly c="bsp-r-hold" at={d(60)} box={sq(5, 5)} len={dur(1900)}>
          <Man k="n" pal={JINX} foe />
        </Ly>
        {/* strike: their bishop slides in to end beside it and is thrown back */}
        <Ly c="bsp-r-balk" at={d(340)} box={sq(2, 7)} len={dur(1200)} v={{ "--mx": 2, "--my": -2 }}>
          <Man k="b" pal={JINX} foe />
        </Ly>
        {/* the link between the two friends snaps */}
        <Ly c="bsp-stamp" at={d(640)} box={{ ...sq(3, 6), width: "8%", height: "8%", marginLeft: "2.25%", marginTop: "2.25%" }} len={dur(1000)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 6.4 L3.4 4.6 C4.2 3.8 5.2 3.8 5.4 4.6 M8.4 3.6 L6.6 5.4 C5.8 6.2 4.8 6.2 4.6 5.4" fill="none" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M4.6 2 L5.4 3.4 M5.4 8 L4.6 6.6" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </Ly>
        <Ly c="bsp-glint" at={d(700)} box={{ ...sq(4, 6), width: "4%", height: "4%", marginLeft: "4%", marginTop: "4%" }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.4 5 L5 10 L3.6 5 Z M0 5 L5 3.6 L10 5 L5 6.4 Z" fill={p0} />
          </svg>
        </Ly>
        {/* settle: two pips, two of their turns */}
        <Ly c="bsp-facein" at={d(1060)} box={pipsBox(2, 46.8, 4)} len={dur(1000)}>
          <Pips n={2} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Watermelon Rind: a rind shell closes over the caster's back two ranks and
 *  the pieces inside are warded; an enemy blade bounces off the rind, and the
 *  pawn standing further forward, outside the shell, is not covered. Two
 *  seeds for the two turns. */
const RIND: Palette = ["#3f8f3f", "#fff4d6", "#b0402e"];
function WatermelonRindScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="watermelon_rind" pal={RIND} dev="spear" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RIND;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the flesh, the caster's back two ranks */}
        <Ly c="bsp-r-hold" at={d(0)} box={band(1, 2)} len={dur(2000)} v={{ background: tint(p2, 0.22) }} />
        {/* strike: the rind grows up over their front edge */}
        <Pin box={{ left: 0, width: "100%", top: lineTop(2, 7), height: "7%", ...FLIP }}>
          <Ly c="bsp-grow" at={d(240)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1700)}>
            <svg viewBox="0 0 80 7" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 7 C14 1 66 1 80 7 Z" fill={p0} stroke={p1} strokeWidth="0.5" {...SJ} />
              <path d="M4 6.4 C18 2.6 62 2.6 76 6.4" fill="none" stroke={tint(p1, 0.7)} strokeWidth="0.5" strokeDasharray="3 2" />
            </svg>
          </Ly>
        </Pin>
        {/* the pieces inside are warded */}
        {[{ f: 2, r: 2 }, { f: 5, r: 1 }].map((s, i) => (
          <Ly key={s.f} c="bsp-stamp" at={d(560 + i * 90)} box={sq(s.f, s.r)} len={dur(1300)}>
            <Ward pal={RIND} />
          </Ly>
        ))}
        {/* an enemy blade drives at the shell and bounces off */}
        <Ly c="bsp-r-balk" at={d(700)} box={sq(1, 4)} len={dur(1000)} v={{ "--mx": 0, "--my": -1 }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true" style={FLIP}>
            <path d="M5 9.4 L5.9 7.4 V1.4 H4.1 V7.4 Z" fill={p2} stroke={p1} strokeWidth="0.35" {...SJ} />
          </svg>
        </Ly>
        {/* a pawn further forward is outside the shell */}
        <Ly c="bsp-r-gone" at={d(860)} box={sq(4, 3)} len={dur(1000)}>
          <Ward pal={RIND} broken />
        </Ly>
        {/* settle: two seeds, two of their turns */}
        <Ly c="bsp-facein" at={d(1120)} box={pipsBox(2, 46.8, 1)} len={dur(1000)}>
          <Pips n={2} fill={p2} stroke={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Butterfingers (the buttered army): butter drops on the caster's pieces,
 *  and an enemy pawn and knight reaching to take them lose their grip and
 *  slide off; two pips for two of their turns. */
const BUTTER: Palette = ["#a07fd1", "#ffd76a", "#2a1a3a"];
function ButteredArmyScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wc_butterfingers" pal={BUTTER} dev="lantern" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BUTTER;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the caster's rook and bishop */}
        {[{ f: 3, k: "r" as ManKind }, { f: 5, k: "b" as ManKind }].map((m) => (
          <Ly key={m.f} c="bsp-r-hold" at={d(80)} box={sq(m.f, 3)} len={dur(2000)}>
            <Man k={m.k} pal={BUTTER} />
          </Ly>
        ))}
        {/* butter pats land on them */}
        {[3, 5].map((f, i) => (
          <Ly key={`b${f}`} c="bsp-plop" at={d(200 + i * 90)} box={{ ...sq(f, 3), height: "5%", width: "7%", marginLeft: "2.75%", marginTop: "0.6%" }} len={dur(1500)} v={{ background: p1, border: `1px solid ${p2}` }} />
        ))}
        {/* strike: an enemy pawn and knight reach to take them and slip off */}
        <Ly c="bsp-r-balk" at={d(520)} box={sq(4, 4)} len={dur(1100)} v={{ "--mx": -1, "--my": -1 }}>
          <Man k="p" pal={BUTTER} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(640)} box={sq(6, 5)} len={dur(1100)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={BUTTER} foe />
        </Ly>
        {/* a drip of butter flicked off by the slip */}
        <Ly c="bsp-drift" at={d(820)} box={{ ...sq(3, 3), width: "2.6%", height: "2.6%", marginLeft: "8%" }} v={{ "--dx": "260%", "--dy": "180%", "--rot": "0deg", background: p1 }} />
        {/* settle: two pips, two of their turns */}
        <Ly c="bsp-facein" at={d(1100)} box={pipsBox(2, 46.8, 2)} len={dur(1000)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Shy Pieces: a velvet rope is drawn across the squares touching the
 *  caster's king; the enemy queen and knight come toward him, blush and turn
 *  back, for two of their turns. */
const SHY: Palette = ["#c9a84c", "#ffd76a", "#3a3026"];
function ShyPiecesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wc_shy_pieces" pal={SHY} dev="ledger" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SHY;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the king and the squares touching him */}
        <Ly c="bsp-r-hold" at={d(0)} box={area(3, 1, 3, 2)} len={dur(2000)} v={{ border: `2px dashed ${p0}`, background: tint(p0, 0.14) }} />
        <Ly c="bsp-r-hold" at={d(40)} box={sq(4, 1)} len={dur(1950)}>
          <Man k="k" pal={SHY} />
        </Ly>
        {/* the velvet rope across the front of them */}
        <Ly c="bsp-unfurl" at={d(220)} box={{ left: "37.5%", width: "37.5%", top: lineTop(2, 3), height: "3%" }} len={dur(1700)}>
          <svg viewBox="0 0 30 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M1 0.8 C8 3 22 3 29 0.8" fill="none" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
            <circle cx="1" cy="1" r="0.9" fill={p1} /><circle cx="29" cy="1" r="0.9" fill={p1} />
          </svg>
        </Ly>
        {/* strike: the queen and a knight come close, and turn back */}
        <Ly c="bsp-r-balk" at={d(460)} box={sq(4, 5)} len={dur(1200)} v={{ "--mx": 0, "--my": -1.6 }}>
          <Man k="q" pal={SHY} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(600)} box={sq(7, 4)} len={dur(1200)} v={{ "--mx": -1.4, "--my": -1 }}>
          <Man k="n" pal={SHY} foe />
        </Ly>
        {/* the blush */}
        <Ly c="bsp-facein" at={d(760)} box={{ ...sq(4, 4), width: "8%", height: "4%", marginLeft: "2.25%", marginTop: "4.5%" }} len={dur(900)}>
          <svg viewBox="0 0 10 4" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="2.2" cy="2" rx="1.8" ry="1.1" fill={tint(p1, 0.8)} /><ellipse cx="7.8" cy="2" rx="1.8" ry="1.1" fill={tint(p1, 0.8)} />
          </svg>
        </Ly>
        {/* settle: two pips, two of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 80, 2)} len={dur(1000)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Ball Lightning: a capture lands on the square and the lightning forks to
 *  the squares immediately left and right: the enemy pawn there is destroyed,
 *  the enemy king on the other side is spared. Two pips for two captures. */
const BALL: Palette = ["#6fd8e8", "#f2fcff", "#173842"];
function BallLightningScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_ball_lightning" pal={BALL} dev="warhorn" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BALL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the capture: a knight leaps onto the enemy's square ... */}
      <Ly c="bsp-r-hop" at={d(0)} box={cell(-1, -2)} len={dur(1600)} v={{ "--mx": 1, "--my": 2 }}>
        <Man k="n" pal={BALL} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(0)} box={cell(0, 0)} len={dur(1000)}>
        <Man k="b" pal={BALL} foe />
      </Ly>
      {/* strike: the lightning forks left and right */}
      <Ly c="bsp-taut" at={d(560)} box={{ ...cell(0.5, 0), height: `${CELL * 0.4}%`, marginTop: `${CELL * 0.3}%` }} len={dur(900)}>
        <svg viewBox="0 0 10 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0 2 L3 0.6 L5 3.2 L7.6 1 L10 2" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
        </svg>
      </Ly>
      <Pin box={{ ...cell(-0.5, 0), scale: "-1 1" }}>
        <Ly c="bsp-taut" at={d(560)} box={{ left: 0, top: "30%", width: "100%", height: "40%" }} len={dur(900)}>
          <svg viewBox="0 0 10 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 2 L3 3.4 L5 0.8 L7.6 3 L10 2" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
          </svg>
        </Ly>
      </Pin>
      {/* the pawn on the left is destroyed ... */}
      <Ly c="bsp-r-gone" at={d(320)} box={cell(-1, 0)} len={dur(1000)}>
        <Man k="p" pal={BALL} foe />
      </Ly>
      {/* ... the king on the right is never touched */}
      <Ly c="bsp-r-hold" at={d(300)} box={cell(1, 0)} len={dur(1500)}>
        <Man k="k" pal={BALL} foe />
      </Ly>
      <Ly c="bsp-facein" at={d(760)} box={cell(0.62, 0, 0.5)} len={dur(1000)}>
        <Nope color={p0} w={1.2} />
      </Ly>
      {/* settle: two pips, the next two captures */}
      <Ly c="bsp-stamp" at={d(1080)} box={{ ...cell(-0.1, -0.64), width: `${CELL * 1.2}%`, height: `${CELL * 0.3}%` }} len={dur(1000)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Riptide: a current runs through the two middle ranks; an enemy knight
 *  that lands in it is dragged one square back toward its own side; three
 *  pips for three of their turns. */
const RIPTIDE: Palette = ["#7b5fe8", "#aef0ff", "#170c2e"];
function RiptideScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_riptide" pal={RIPTIDE} dev="feather" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RIPTIDE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the 4th and 5th ranks run as water */}
        <Ly c="bsp-r-hold" at={d(0)} box={band(4, 5)} len={dur(2000)} v={{ background: tint(p0, 0.26) }} />
        {/* the current: two swells run along it */}
        {[0, 1].map((i) => (
          <Ly key={i} c="bsp-r-move" at={d(100 + i * 160)} box={{ left: `${10 + i * 30}%`, width: "25%", top: i ? "54%" : "42%", height: "4%" }} len={dur(1400)} v={{ "--mx": 1.3, "--my": 0 }}>
            <svg viewBox="0 0 20 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 2 C3 0 5 0 7 2 S11 4 13 2 S17 0 20 2" fill="none" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </Ly>
        ))}
        {/* strike: an enemy knight lands in it ... */}
        <Ly c="bsp-r-hop" at={d(320)} box={sq(5, 7)} len={dur(700)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={RIPTIDE} foe />
        </Ly>
        {/* ... and is dragged one square back toward its own side */}
        <Ly c="bsp-r-move" at={d(760)} box={sq(4, 5)} len={dur(1200)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="n" pal={RIPTIDE} foe />
        </Ly>
        {/* foam where it was pulled from */}
        <Ly c="bsp-drift" at={d(860)} box={{ ...sq(4, 5), width: "3%", height: "3%", marginLeft: "4.75%", marginTop: "6%" }} v={{ "--dx": "-200%", "--dy": "120%", "--rot": "0deg", background: p1 }} />
        {/* settle: three pips, three of their turns */}
        <Ly c="bsp-stamp" at={d(1120)} box={pipsBox(3, 45.2, 3)} len={dur(1000)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Mass Defection: two enemy pawns are marked; the hourglass turns through the
 *  opponent's next move, the turncoat's cloak flips, and both pawns stand on
 *  the caster's side. */
const DEFECT: Palette = ["#6f5fd1", "#f0e8ff", "#100f1e"];
function MassDefectionScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_mass_defection" pal={DEFECT} dev="mirror" fx="ink" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DEFECT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the two marked pawns */}
      {[0, 1].map((x) => (
        <Ly key={`e${x}`} c="bsp-r-gone" at={d(0)} box={cell(x, 0)} len={dur(1400)} v={{ border: `2px dashed ${p0}` }}>
          <Man k="p" pal={DEFECT} foe />
        </Ly>
      ))}
      {/* the hourglass: after the opponent's next move */}
      <Ly c="bsp-turn" at={d(120)} box={cell(-1, 0, 0.62)} len={dur(1200)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      {/* strike: the turncoat's cloak flips over them */}
      <Ly c="bsp-flip" at={d(500)} box={{ ...cell(0.5, 0, 1.1), width: `${CELL * 1.9}%`, marginLeft: `-${CELL * 0.4}%`, translate: `0 calc(var(--fx-side, 1) * -18%)` }} len={dur(900)}>
        <svg viewBox="0 0 20 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M2 1 H18 L16 9 H4 Z" fill={tint(p0, 0.7)} stroke={p1} strokeWidth="0.4" {...SJ} />
          <path d="M10 1 V9" stroke={p1} strokeWidth="0.4" />
        </svg>
      </Ly>
      {/* the cloak's ink marks each of them */}
      {[0, 1].map((x) => (
        <Ly key={`m${x}`} c="bsp-stamp" at={d(x ? 840 : 760)} box={cell(x, 0, 0.4)} len={dur(800)} v={{ background: tint(p0, 0.8) }} />
      ))}
      {/* settle: both stand as the caster's pawns */}
      {[0, 1].map((x) => (
        <Ly key={`o${x}`} c="bsp-facein" at={d(x ? 980 : 900)} box={cell(x, 0)} len={dur(1400)}>
          <Man k="p" pal={DEFECT} />
        </Ly>
      ))}
    </BoardWideStage>
  );
}

/** Outriders: a knight is set down on an empty square in the caster's half,
 *  its pennant snaps out, and two pawns behind it each advance one square in
 *  its wake. */
const OUTRIDERS: Palette = ["#bf5a3a", "#cdd6e0", "#361812"];
function OutridersScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_outriders" pal={OUTRIDERS} dev="crown" fx="banner" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = OUTRIDERS;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {/* tell: the empty square it will take */}
      <Ly c="bsp-r-hold" at={d(60)} box={cell(0, 0)} len={dur(1000)} v={{ border: `2px dashed ${p0}` }} />
      {/* strike: the knight is set down there */}
      <Ly c="bsp-drop" at={d(240)} box={cell(0, 0)} len={dur(1700)}>
        <Man k="n" pal={OUTRIDERS} />
      </Ly>
      {/* its pennant snaps out */}
      <Ly c="bsp-unfurl" at={d(520)} box={cell(0.55, 0.3, 0.5)} len={dur(1300)}>
        <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
          <path d="M0.4 0.6 H9.4 L7 3 L9.4 5.4 H0.4 Z" fill={p0} stroke={p1} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      {/* two pawns behind it each advance one square */}
      {[-1, 1].map((x, i) => (
        <Ly key={x} c="bsp-r-move" at={d(i ? 760 : 640)} box={cell(x, -2)} len={dur(1400)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="p" pal={OUTRIDERS} />
        </Ly>
      ))}
      {/* settle: dust kicked up behind them */}
      {[-1, 1].map((x, i) => (
        <Ly key={`u${x}`} c="bsp-drift" at={d(i ? 1020 : 900)} box={cell(x, -1.4, 0.3)} v={{ "--dx": `${x * 120}%`, "--dy": "60%", "--rot": "0deg", background: tint(p2, 0.7) }} />
      ))}
    </BoardWideStage>
  );
}

/** Recommission: a fallen rook comes back to an empty back-rank square and is
 *  refitted under the hammer; then it shows its new move, passing straight
 *  through a friendly pawn to land on an empty square beyond. */
const RECOMM: Palette = ["#8fd1b0", "#ffe9c9", "#22422e"];
function RecommissionScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_recommission" pal={RECOMM} dev="waxseal" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RECOMM;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the back rank, and the rook back on it */}
        <Ly c="bsp-r-hold" at={d(0)} box={band(1, 1)} len={dur(1600)} v={{ background: tint(p0, 0.18), border: `2px dashed ${p0}` }} />
        <Ly c="bsp-rise" at={d(120)} box={sq(0, 1)} len={dur(900)}>
          <Man k="r" pal={RECOMM} />
        </Ly>
        {/* the hammer refits it */}
        <Ly c="bsp-swing" at={d(260)} box={{ ...sq(1, 1), width: "9%", height: "9%" }} len={dur(900)}>
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M4.6 4h11v5.4h-11z" fill={p0} stroke={p2} strokeWidth="1.1" {...SJ} />
            <path d="M8.8 9.4h2.6V22H8.8z" fill={p2} stroke={p1} strokeWidth="0.9" {...SJ} />
          </svg>
        </Ly>
        <Ly c="bsp-glint" at={d(520)} box={{ ...sq(0, 1), width: "4%", height: "4%", marginLeft: "9%" }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.4 5 L5 10 L3.6 5 Z M0 5 L5 3.6 L10 5 L5 6.4 Z" fill={p1} />
          </svg>
        </Ly>
        {/* strike: its new move, straight through its own pawn ... */}
        <Ly c="bsp-r-hold" at={d(560)} box={sq(0, 2)} len={dur(1400)}>
          <Man k="p" pal={RECOMM} />
        </Ly>
        <Ly c="bsp-r-move" at={d(700)} box={sq(0, 1)} len={dur(1500)} v={{ "--mx": 0, "--my": 3 }}>
          <Man k="r" pal={[p0, tint(p1, 0.7), p2]} />
        </Ly>
        {/* settle: ... landing only on an empty square */}
        <Ly c="bsp-stamp" at={d(1120)} box={sq(0, 4)} len={dur(1000)} v={{ border: `2px solid ${p1}` }} />
      </BoardFrame>
    </BoardWideStage>
  );
}

/* --- Tier 1 rule scenes: seen in round one of nearly every game, so each is
   short (about 1.3s) and draws only the move or the ban it grants. ------------ */

/** A pips row `n` wide on the stage, its left edge on cell (dx, dy). */
function pipsAt(n: number, dx: number, dy: number): CSSProperties {
  const b = cell(dx, dy);
  return { left: b.left, top: `calc(${b.top} + ${CELL * 0.7}%)`, width: `${CELL * 0.3 * n}%`, height: `${CELL * 0.3}%` };
}

/** The dashed landing square of a granted move. */
function landing(color: string): Record<string, string> {
  return { border: `2px dashed ${color}` };
}

/** Bishop Polish: a polished bishop hops clean over the one piece in its way,
 *  two charges. */
const POLISH: Palette = ["#c9a84c", "#fff2c9", "#4a3a22"];
function BishopPolishScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="bishop_polish" pal={POLISH} dev="boot" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = POLISH;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(1, 1)} len={dur(1300)}>
        <Man k="p" pal={POLISH} foe />
      </Ly>
      <Ly c="bsp-glint" at={d(80)} box={cell(0.3, 0.3, 0.4)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.4 5 L5 10 L3.6 5 Z M0 5 L5 3.6 L10 5 L5 6.4 Z" fill={p1} />
        </svg>
      </Ly>
      <Ly c="bsp-r-hop" at={d(200)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 2, "--my": 2 }}>
        <Man k="b" pal={POLISH} />
      </Ly>
      <Ly c="bsp-stamp" at={d(700)} box={pipsAt(2, -0.3, 0)} len={dur(800)}>
        <Pips n={2} fill={p0} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Butterfingers: a pat of butter lands on the enemy queen; she reaches for a
 *  capture, it slips, and nothing is taken, for two of their turns. */
const BUTTERQ: Palette = ["#8f6bff", "#8faf4a", "#1c1030"];
function ButterfingersScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="butterfingers" pal={BUTTERQ} dev="waxseal" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BUTTERQ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, -1)} len={dur(1400)}>
        <Man k="n" pal={BUTTERQ} />
      </Ly>
      <Ly c="bsp-r-balk" at={d(0)} box={cell(0, 0)} len={dur(1300)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="q" pal={BUTTERQ} foe />
      </Ly>
      <Ly c="bsp-plop" at={d(120)} box={cell(0, 0.36, 0.42)} len={dur(900)} v={{ background: p1, border: `1px solid ${p2}` }} />
      <Ly c="bsp-facein" at={d(560)} box={cell(0, -1, 0.7)} len={dur(800)}>
        <Nope color={p1} />
      </Ly>
      <Ly c="bsp-stamp" at={d(760)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Cold Feet: after their next move, frost creeps under the enemy pawns; one
 *  that reaches diagonally to capture is pulled back, three of their turns. */
const COLDFEET: Palette = ["#a07fd1", "#ffd76a", "#2a1a3a"];
function ColdFeetScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="cold_feet" pal={COLDFEET} dev="mask" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COLDFEET;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-turn" at={d(60)} box={cell(-1, 0, 0.6)} len={dur(900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(-1, -1)} len={dur(1300)}>
        <Man k="b" pal={COLDFEET} />
      </Ly>
      {[0, 1].map((x) => (
        <Ly key={`f${x}`} c="bsp-grow" at={d(x ? 280 : 220)} box={{ ...cell(x, 0), height: `${CELL * 0.22}%`, marginTop: `${CELL * 0.78}%` }} len={dur(1100)} v={{ background: tint(p0, 0.6) }} />
      ))}
      <Ly c="bsp-r-balk" at={d(380)} box={cell(0, 0)} len={dur(1000)} v={{ "--mx": -1, "--my": -1 }}>
        <Man k="p" pal={COLDFEET} foe />
      </Ly>
      <Ly c="bsp-r-strain" at={d(380)} box={cell(1, 0)} len={dur(1000)}>
        <Man k="p" pal={COLDFEET} foe />
      </Ly>
      <Ly c="bsp-stamp" at={d(820)} box={pipsAt(3, -0.2, 1)} len={dur(700)}>
        <Pips n={3} fill={p0} stroke={p1} />
      </Ly>
    </BoardWideStage>
  );
}

/** Cold Open: the clapper snaps shut over the enemy queen on their back rank
 *  and she cannot go, for their next turn. */
const COLDOPEN: Palette = ["#a8763a", "#e8dcc0", "#3a2a1a"];
function ColdOpenScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="cold_open" pal={COLDOPEN} dev="anchor" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COLDOPEN;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-balk" at={d(0)} box={sq(3, 8)} len={dur(1300)} v={{ "--mx": 0, "--my": -0.5 }}>
          <Man k="q" pal={COLDOPEN} foe />
        </Ly>
        <Ly c="bsp-r-hold" at={d(120)} box={{ ...sq(3, 7), height: "6%" }} len={dur(1200)} v={{ background: p2, border: `1px solid ${p1}` }} />
        <Ly c="bsp-drop" at={d(300)} box={{ ...sq(3, 7), height: "3.4%", marginTop: "-3.8%" }} len={dur(900)}>
          <svg viewBox="0 0 20 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 0 H20 V3 H0 Z" fill={p1} />
            <path d="M2 3 L5 0 M7 3 L10 0 M12 3 L15 0 M17 3 L20 0" stroke={p2} strokeWidth="1.4" />
          </svg>
        </Ly>
        <Ly c="bsp-stamp" at={d(720)} box={pipsBox(1, 44.3, 6)} len={dur(700)}>
          <Pips n={1} fill={p0} stroke={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Cold Snap: frost spokes snap out round one enemy knight and hold it for a
 *  turn; their queen, the most valuable piece, is out of reach. */
const COLDSNAP: Palette = ["#7fd8d8", "#eef8ff", "#1c4a52"];
function ColdSnapScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="cold_snap" pal={COLDSNAP} dev="hourglass" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COLDSNAP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-strain" at={d(0)} box={cell(0, 0)} len={dur(1300)}>
        <Man k="n" pal={COLDSNAP} foe />
      </Ly>
      <Ly c="bsp-spoke" at={d(200)} box={cell(0, 0, 1.3)} len={dur(1000)}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M10 1 V19 M1 10 H19 M3.6 3.6 L16.4 16.4 M16.4 3.6 L3.6 16.4" stroke={tint(p1, 0.9)} strokeWidth="1" strokeLinecap="round" />
          <path d="M8.4 2.6 L10 4.2 L11.6 2.6 M8.4 17.4 L10 15.8 L11.6 17.4 M2.6 8.4 L4.2 10 L2.6 11.6 M17.4 8.4 L15.8 10 L17.4 11.6" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-r-hold" at={d(260)} box={cell(1, 1)} len={dur(1000)}>
        <Man k="q" pal={COLDSNAP} foe />
      </Ly>
      <Ly c="bsp-r-balk" at={d(300)} box={cell(0, 0, 0.5)} len={dur(800)} v={{ "--mx": 1.4, "--my": 1.4 }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.6 L6.2 5 L5 9.4 L3.8 5 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-facein" at={d(520)} box={cell(1, 1, 0.7)} len={dur(800)}>
        <Nope color={p1} />
      </Ly>
      <Ly c="bsp-stamp" at={d(760)} box={pipsAt(1, -0.3, 0)} len={dur(700)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Deep Breath: a breath rises from the caster's side and the nerf's shackle
 *  opens for one move, after the opponent's reply. */
const BREATH: Palette = ["#ffe08a", "#fffbef", "#8a7038"];
function DeepBreathScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="deep_breath" pal={BREATH} dev="hand_bell" fx="bell" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BREATH;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(60)} box={band(1, 2)} len={dur(1300)} v={{ background: tint(p0, 0.18) }} />
        {[0, 1].map((i) => (
          <Ly key={i} c="bsp-r-move" at={d(i ? 200 : 80)} box={{ ...sq(3 + i, 2), height: "8%" }} len={dur(1000)} v={{ "--mx": 0, "--my": 1.6 }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M2 6 C0.6 4 3 2.6 4.6 3.4 C5 1.2 8.6 1.4 8.2 4 C9.6 4.6 8.6 6.6 7 6 Z" fill={tint(p1, 0.85)} stroke={p0} strokeWidth="0.4" {...SJ} />
            </svg>
          </Ly>
        ))}
        <Ly c="bsp-r-gone" at={d(360)} box={{ ...sq(3, 1, 2), height: "10%" }} len={dur(900)}>
          <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true">
            <path d="M6 8 V4.6 C6 1 14 1 14 4.6" fill="none" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
            <rect x="4" y="5.4" width="12" height="4.2" fill={p0} stroke={p2} strokeWidth="0.6" />
          </svg>
        </Ly>
        <Ly c="bsp-stamp" at={d(760)} box={pipsBox(1, 48.4, 3)} len={dur(700)}>
          <Pips n={1} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Diagonal Step: the king's diagonal opens and he glides down it like a
 *  bishop, once; the charge is spent. */
const DIAGSTEP: Palette = ["#b58a5a", "#e8dcc0", "#4a3a26"];
function DiagonalStepScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="diagonal_step" pal={DIAGSTEP} dev="spear" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DIAGSTEP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Pin box={{ ...cell(0, 0), transform: "rotate(calc(-45deg * var(--fx-side, 1)))" }}>
        <Ly c="bsp-beam" at={d(60)} box={{ left: "50%", top: "46%", width: "380%", height: "8%", background: `linear-gradient(90deg, ${tint(p1, 0.85)}, transparent)` }} len={dur(1100)} />
      </Pin>
      <Ly c="bsp-r-move" at={d(180)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 3, "--my": 3 }}>
        <Man k="k" pal={DIAGSTEP} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(420)} box={pipsAt(1, -0.3, 0)} len={dur(900)}>
        <Pips n={1} fill={p0} stroke={p2} />
      </Ly>
      <Ly c="bsp-r-hold" at={d(300)} box={cell(3, 3)} len={dur(1000)} v={landing(p0)} />
    </BoardWideStage>
  );
}

/** Drawbridge: the bridge between the enemy king and his rook is raised; the
 *  king starts to castle and is turned back, for six of their turns (the
 *  first try slips through: one hollow pip). */
const DRAWB: Palette = ["#d1a85a", "#fff2c9", "#3d3220"];
function DrawbridgeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="drawbridge" pal={DRAWB} dev="cogwheel" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DRAWB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(0)} box={sq(7, 8)} len={dur(1400)}>
          <Man k="r" pal={DRAWB} foe />
        </Ly>
        <Pin box={{ ...sq(5, 8, 2), ...FLIP }}>
          <Ly c="bsp-grow" at={d(160)} box={{ left: "4%", top: "10%", width: "92%", height: "80%" }} len={dur(1200)}>
            <svg viewBox="0 0 20 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M1 10 V3 H19 V10" fill={tint(p0, 0.7)} stroke={p2} strokeWidth="0.6" {...SJ} />
              <path d="M5 3 V10 M10 3 V10 M15 3 V10" stroke={p2} strokeWidth="0.5" />
              <path d="M1 3 L3 0.4 M19 3 L17 0.4" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </Ly>
        </Pin>
        <Ly c="bsp-r-balk" at={d(420)} box={sq(4, 8)} len={dur(1000)} v={{ "--mx": 1.6, "--my": 0 }}>
          <Man k="k" pal={DRAWB} foe />
        </Ly>
        <Ly c="bsp-stamp" at={d(820)} box={pipsBox(6, 30.8, 6)} len={dur(700)}>
          <svg viewBox="0 0 24 4" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <circle key={i} cx={2 + i * 4} cy="2" r="1.35" fill={i ? p0 : "none"} stroke={p1} strokeWidth="0.35" />
            ))}
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Escape Hatch: a hatch opens under the chosen pawn, the hourglass turns
 *  through the opponent's move, and king and pawn trade places. */
const HATCH: Palette = ["#7b5fe8", "#aef0ff", "#170c2e"];
function EscapeHatchScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="escape_hatch" pal={HATCH} dev="mirror" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HATCH;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(60)} box={cell(-2, -1)} len={dur(1300)} v={{ border: `2px dashed ${p1}` }} />
      <Ly c="bsp-flip" at={d(0)} box={cell(0, 0, 0.9)} len={dur(1300)} v={{ background: tint(p2, 0.85), border: `2px solid ${p0}` }} />
      <Ly c="bsp-turn" at={d(120)} box={cell(1, 0.3, 0.55)} len={dur(800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-r-move" at={d(420)} box={cell(0, 0)} len={dur(1000)} v={{ "--mx": -2, "--my": -1 }}>
        <Man k="p" pal={HATCH} />
      </Ly>
      <Ly c="bsp-r-move" at={d(420)} box={cell(-2, -1)} len={dur(1000)} v={{ "--mx": 2, "--my": 1 }}>
        <Man k="k" pal={HATCH} />
      </Ly>
    </BoardWideStage>
  );
}

/** Extra Glance: an eye opens over the opponent's side and their hidden nerf
 *  card turns face up for good; a reroll die is added. */
const GLANCE: Palette = ["#5a6b8f", "#cdd6ff", "#161e33"];
function ExtraGlanceScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="extra_glance" pal={GLANCE} dev="mirror" fx="gaze" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GLANCE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-blink" at={d(0)} box={{ left: "38%", top: "44%", width: "24%", height: "12%" }} len={dur(1300)}>
          <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 5 C5 0.4 15 0.4 19 5 C15 9.6 5 9.6 1 5 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.6" {...SJ} />
            <circle cx="10" cy="5" r="2.6" fill={p0} /><circle cx="10" cy="5" r="1.1" fill={p2} />
          </svg>
        </Ly>
        <Ly c="bsp-r-hold" at={d(120)} box={{ ...sq(3, 7), width: "10%", height: "14%", marginLeft: "7.5%" }} len={dur(1200)} v={{ background: p2, border: `2px solid ${p0}` }} />
        <Ly c="bsp-flip" at={d(420)} box={{ ...sq(3, 7), width: "10%", height: "14%", marginLeft: "7.5%" }} len={dur(1000)} v={{ background: p1, border: `2px solid ${p0}` }}>
          <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
            <path d="M2.6 4 L7.4 9 M7.4 4 L2.6 9" stroke={p2} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </Ly>
        <Ly c="bsp-r-move" at={d(720)} box={{ ...sq(4, 1), width: "7%", height: "7%", marginLeft: "2.75%" }} len={dur(900)} v={{ "--mx": 0, "--my": 1.4 }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
            <circle cx="3.4" cy="3.4" r="0.8" fill={p2} /><circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Ferz King: the king takes a two-square diagonal jump to an empty square,
 *  twice a game; the diagonal with an enemy on it is not his to take. */
const FERZ: Palette = ["#8fd1ff", "#ffd76a", "#22405c"];
function FerzKingScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ferz_king" pal={FERZ} dev="kite" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = FERZ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(2, 2)} len={dur(1200)} v={landing(p1)} />
      <Ly c="bsp-r-hop" at={d(160)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 2, "--my": 2 }}>
        <Man k="k" pal={FERZ} />
      </Ly>
      <Ly c="bsp-facein" at={d(300)} box={cell(-2, 2)} len={dur(900)}>
        <svg viewBox="-2 -0.6 14 13" className="block h-full w-full" aria-hidden="true">
          <g fill={p2} stroke={p1} strokeWidth="0.55" {...SJ}>{MEN.r}</g>
          <path d="M0 1 L10 11" stroke={p1} strokeWidth="1" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-stamp" at={d(760)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Ghost Pawn: the pawn goes pale and walks two squares straight through the
 *  enemy piece in front of it, which is left untouched. */
const GHOSTP: Palette = ["#a8e0e8", "#fff7de", "#274048"];
function GhostPawnScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ghost_pawn" pal={GHOSTP} dev="torch" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GHOSTP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 1)} len={dur(1300)}>
        <Man k="n" pal={GHOSTP} foe />
      </Ly>
      <Ly c="bsp-r-move" at={d(200)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 0, "--my": 2 }}>
        <Man k="p" pal={GHOSTP} ghost />
      </Ly>
      <Ly c="bsp-facein" at={d(640)} box={cell(0, 2)} len={dur(800)}>
        <Man k="p" pal={GHOSTP} />
      </Ly>
      <Ly c="bsp-stamp" at={d(760)} box={cell(0, 2)} len={dur(700)} v={landing(p0)} />
      <Ly c="bsp-glint" at={d(420)} box={cell(0, 1, 0.4)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.4 5 L5 10 L3.6 5 Z M0 5 L5 3.6 L10 5 L5 6.4 Z" fill={p1} stroke={p2} strokeWidth="0.3" />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Half Step: the pawn steps diagonally forward onto an empty square, with no
 *  capture (the enemy on the other diagonal is not taken); two charges. */
const HALFSTEP: Palette = ["#9fdcf0", "#ffe9b0", "#254452"];
function HalfStepScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="half_step" pal={HALFSTEP} dev="feather" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HALFSTEP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(1, 1)} len={dur(1200)} v={landing(p1)} />
      <Ly c="bsp-r-move" at={d(160)} box={cell(0, 0)} len={dur(1100)} v={{ "--mx": 1, "--my": 1 }}>
        <Man k="p" pal={HALFSTEP} />
      </Ly>
      <Ly c="bsp-facein" at={d(360)} box={cell(-1, 1, 0.7)} len={dur(800)}>
        <Nope color={p1} />
      </Ly>
      <Ly c="bsp-stamp" at={d(720)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Knock Knees: the rim of the board is fenced off; an enemy knight's leap to
 *  the edge buckles and it is thrown back, three of their turns. */
const KNEES: Palette = ["#8a94a8", "#c9cdd6", "#2e3440"];
function KnockKneesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="knock_knees" pal={KNEES} dev="caltrop" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = KNEES;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(0)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1300)}>
          <svg viewBox="0 0 80 80" className="block h-full w-full" aria-hidden="true">
            <path d="M0 0 H80 V80 H0 Z M10 10 V70 H70 V10 Z" fillRule="evenodd" fill={tint(p0, 0.34)} />
            <path d="M10 10 H70 V70 H10 Z" fill="none" stroke={p1} strokeWidth="0.8" strokeDasharray="2.4 1.8" />
          </svg>
        </Ly>
        <Ly c="bsp-r-balk" at={d(260)} box={sq(5, 6)} len={dur(1000)} v={{ "--mx": 2, "--my": -1 }}>
          <Man k="n" pal={KNEES} foe />
        </Ly>
        <Ly c="bsp-r-strain" at={d(260)} box={sq(2, 6)} len={dur(1000)}>
          <Man k="n" pal={KNEES} foe />
        </Ly>
        <Ly c="bsp-stamp" at={d(760)} box={pipsBox(3, 45.2, 4)} len={dur(700)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Little Leap: the pawn springs over the single piece blocking it and lands
 *  on the square beyond; two charges. */
const LEAP: Palette = ["#c9a84c", "#fff2c9", "#4a3a22"];
function LittleLeapScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="little_leap" pal={LEAP} dev="arrowhead" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LEAP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 1)} len={dur(1300)}>
        <Man k="b" pal={LEAP} foe />
      </Ly>
      <Ly c="bsp-r-hop" at={d(160)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 0, "--my": 2 }}>
        <Man k="p" pal={LEAP} />
      </Ly>
      <Ly c="bsp-drift" at={d(220)} box={cell(0, -0.3, 0.3)} v={{ "--dx": "-120%", "--dy": "40%", "--rot": "0deg", background: tint(p0, 0.8) }} />
      <Ly c="bsp-stamp" at={d(700)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p0} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Long Knight: one knight makes two knight leaps in a single move; the first
 *  landing is only a stepping stone. */
const LONGK: Palette = ["#a8763a", "#ffd76a", "#3a2a18"];
function LongKnightScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="long_knight" pal={LONGK} dev="kite" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LONGK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hop" at={d(0)} box={cell(0, 0)} len={dur(700)} v={{ "--mx": 1, "--my": 2 }}>
        <Man k="n" pal={LONGK} />
      </Ly>
      <Ly c="bsp-r-hold" at={d(260)} box={cell(1, 2)} len={dur(900)} v={{ border: `2px dotted ${p0}` }} />
      <Ly c="bsp-r-hop" at={d(420)} box={cell(1, 2)} len={dur(1000)} v={{ "--mx": 1, "--my": 2 }}>
        <Man k="n" pal={LONGK} />
      </Ly>
      <Ly c="bsp-drift" at={d(360)} box={cell(1, 2, 0.28)} v={{ "--dx": "120%", "--dy": "calc(var(--fx-side, 1) * 90%)", "--rot": "0deg", background: tint(p0, 0.7) }} />
      <Ly c="bsp-stamp" at={d(760)} box={cell(2, 4)} len={dur(700)} v={landing(p1)} />
    </BoardWideStage>
  );
}

/** Molasses: the enemy queen wades three squares through a spill of molasses
 *  and sticks there; the rest of her line is struck out, three of their turns. */
const MOLASSES: Palette = ["#7d8aa0", "#e3e9f2", "#1f2734"];
function MolassesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="molasses" pal={MOLASSES} dev="gauntlet" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MOLASSES;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(0)} box={area(3, 5, 1, 7)} len={dur(1400)} v={{ background: tint(p2, 0.5), border: `1px solid ${p0}` }} />
        <Ly c="bsp-r-move" at={d(140)} box={sq(3, 8)} len={dur(1300)} v={{ "--mx": 0, "--my": -3 }}>
          <Man k="q" pal={MOLASSES} foe />
        </Ly>
        <Ly c="bsp-facein" at={d(600)} box={area(3, 3, 1, 4)} len={dur(800)} v={{ borderLeft: `2px dashed ${p1}`, borderRight: `2px dashed ${p1}` }}>
          <Nope color={p1} w={0.8} />
        </Ly>
        <Ly c="bsp-stamp" at={d(820)} box={pipsBox(3, 60, 6)} len={dur(700)}>
          <Pips n={3} fill={p0} stroke={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Nudge: a shove pushes one enemy pawn a square back toward its own side,
 *  onto the empty square behind it; once. */
const NUDGE: Palette = ["#9a7a4a", "#e0d0b0", "#332918"];
function NudgeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="nudge" pal={NUDGE} dev="drum" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = NUDGE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 1)} len={dur(1200)} v={landing(p1)} />
      <Ly c="bsp-r-balk" at={d(120)} box={cell(0, -0.7, 0.6)} len={dur(800)} v={{ "--mx": 0, "--my": 0.6 }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true" style={FLIP}>
          <path d="M2.4 9.4 V4 C2.4 3 3.8 3 3.8 4 V2.2 C3.8 1.2 5.2 1.2 5.2 2.2 V2 C5.2 1 6.6 1 6.6 2 V3 C6.6 2 8 2 8 3 V7 C8 8.6 7 9.4 5.6 9.4 Z" fill={p1} stroke={p2} strokeWidth="0.45" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-r-move" at={d(260)} box={cell(0, 0)} len={dur(1100)} v={{ "--mx": 0, "--my": 1 }}>
        <Man k="p" pal={NUDGE} foe />
      </Ly>
      <Ly c="bsp-stamp" at={d(720)} box={pipsAt(1, -0.3, 1)} len={dur(700)}>
        <Pips n={1} fill={p0} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Quiet March: the pawn tiptoes one square backward, and is warded where it
 *  lands for the opponent's next turn; once. */
const QUIETM: Palette = ["#6fd8e8", "#f2fcff", "#173842"];
function QuietMarchScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="quiet_march" pal={QUIETM} dev="spear" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = QUIETM;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, -1)} len={dur(1200)} v={landing(p0)} />
      <Ly c="bsp-r-move" at={d(140)} box={cell(0, 0)} len={dur(1200)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="p" pal={QUIETM} />
      </Ly>
      <Ly c="bsp-facein" at={d(260)} box={cell(0.62, 0.1, 0.4)} len={dur(800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 5 C3.4 3.6 3.4 6.4 5 5 C6.6 3.6 6.6 6.4 8 5" fill="none" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-stamp" at={d(720)} box={cell(0, -1)} len={dur(800)}>
        <Ward pal={QUIETM} />
      </Ly>
    </BoardWideStage>
  );
}

/** Reprieve: a pardon scroll unrolls on the caster's side and the nerf's
 *  shackle comes off, for two turns after the opponent's next move. */
const REPRIEVE: Palette = ["#ffcf4d", "#fff4d6", "#7a5c2e"];
function ReprieveScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="reprieve" pal={REPRIEVE} dev="warhorn" fx="bell" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = REPRIEVE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-scroll" at={d(60)} box={{ left: "36%", top: rankTop(3), width: "28%", height: "18%" }} len={dur(1300)}>
          <svg viewBox="0 0 20 13" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M1 1 H19 V12 H1 Z" fill={p1} stroke={p2} strokeWidth="0.5" />
            <path d="M4 4 H16 M4 6.6 H14 M4 9.2 H11" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </Ly>
        <Ly c="bsp-r-move" at={d(360)} box={{ ...sq(3, 1, 2), height: "10%" }} len={dur(900)} v={{ "--mx": 0, "--my": -0.8 }}>
          <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true">
            <path d="M6 8 V4.6 C6 1 14 1 14 4.6" fill="none" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
            <rect x="4" y="5.4" width="12" height="4.2" fill={p0} stroke={p2} strokeWidth="0.6" />
          </svg>
        </Ly>
        <Ly c="bsp-drop" at={d(560)} box={{ ...sq(4, 3), width: "7%", height: "7%", marginLeft: "2.75%" }} len={dur(800)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill={p0} stroke={p2} strokeWidth="0.6" />
            <path d="M3.2 5.2 L4.6 6.6 L7 3.6" fill="none" stroke={p2} strokeWidth="0.9" {...SJ} />
          </svg>
        </Ly>
        <Ly c="bsp-stamp" at={d(820)} box={pipsBox(2, 46.8, 2)} len={dur(700)}>
          <Pips n={2} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Rook Slide: the rook slips one square diagonally, a move rooks never
 *  make; two charges. */
const ROOKSLIDE: Palette = ["#a8e0e8", "#fff7de", "#274048"];
function RookSlideScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="rook_slide" pal={ROOKSLIDE} dev="compass" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = ROOKSLIDE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(-1, 1)} len={dur(1200)} v={landing(p0)} />
      <Pin box={{ ...cell(0, 0), transform: "rotate(calc(-135deg * var(--fx-side, 1)))" }}>
        <Ly c="bsp-taut" at={d(120)} box={{ left: "50%", top: "44%", width: "141%", height: "12%", background: tint(p1, 0.7) }} len={dur(900)} />
      </Pin>
      <Ly c="bsp-r-move" at={d(220)} box={cell(0, 0)} len={dur(1100)} v={{ "--mx": -1, "--my": 1 }}>
        <Man k="r" pal={ROOKSLIDE} />
      </Ly>
      <Ly c="bsp-stamp" at={d(720)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Royal Restraint: a sash binds the enemy king's arms; he lunges at a pawn
 *  beside him and is held back, for four of their turns (one escape capture
 *  stays open: a hollow pip). */
const RESTRAINT: Palette = ["#8f6bff", "#8faf4a", "#1c1030"];
function RoyalRestraintScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="royal_restraint" pal={RESTRAINT} dev="toadstool" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RESTRAINT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(1, -1)} len={dur(1300)}>
        <Man k="p" pal={RESTRAINT} />
      </Ly>
      <Ly c="bsp-r-balk" at={d(0)} box={cell(0, 0)} len={dur(1300)} v={{ "--mx": 1, "--my": -1 }}>
        <Man k="k" pal={RESTRAINT} foe />
      </Ly>
      <Ly c="bsp-unfurl" at={d(160)} box={{ ...cell(0, 0.08), height: `${CELL * 0.22}%` }} len={dur(1000)}>
        <svg viewBox="0 0 10 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0.4 0.4 H9.6 V1.6 H0.4 Z" fill={p1} stroke={p2} strokeWidth="0.25" />
        </svg>
      </Ly>
      <Ly c="bsp-stamp" at={d(780)} box={pipsAt(4, -0.6, 1)} len={dur(700)}>
        <svg viewBox="0 0 16 4" className="block h-full w-full" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <circle key={i} cx={2 + i * 4} cy="2" r="1.35" fill={i < 3 ? p1 : "none"} stroke={p1} strokeWidth="0.35" />
          ))}
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Sentinel Pawn: the pawn on watch sights down its long diagonal and takes
 *  the enemy two squares away; two charges. */
const SENTINEL: Palette = ["#9fdcf0", "#ffe9b0", "#254452"];
function SentinelPawnScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="sentinel_pawn" pal={SENTINEL} dev="weathervane" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SENTINEL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Pin box={{ ...sq(3, 3), transform: "rotate(calc(-45deg * var(--fx-side, 1)))" }}>
          <Ly c="bsp-beam" at={d(0)} box={{ left: "50%", top: "44%", width: "283%", height: "12%", background: `linear-gradient(90deg, ${tint(p1, 0.85)}, ${tint(p0, 0.3)})` }} len={dur(900)} />
        </Pin>
        <Ly c="bsp-r-gone" at={d(0)} box={sq(5, 5)} len={dur(900)}>
          <Man k="n" pal={SENTINEL} foe />
        </Ly>
        <Ly c="bsp-r-hop" at={d(200)} box={sq(3, 3)} len={dur(1100)} v={{ "--mx": 2, "--my": 2 }}>
          <Man k="p" pal={SENTINEL} />
        </Ly>
        <Ly c="bsp-stamp" at={d(720)} box={pipsBox(2, 40.6, 2)} len={dur(700)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Slippery Grip: after their next move, the enemy rooks lose their grip:
 *  one slides three squares and skids to a stop; the rest of its line is
 *  struck out, for four of their turns. */
const SLIPGRIP: Palette = ["#7d8aa0", "#e3e9f2", "#1f2734"];
function SlipperyGripScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="slippery_grip" pal={SLIPGRIP} dev="spool" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SLIPGRIP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-turn" at={d(0)} box={{ ...sq(1, 8), width: "7%", height: "7%", marginLeft: "2.75%", marginTop: "2.75%" }} len={dur(800)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </Ly>
        <Ly c="bsp-r-hold" at={d(120)} box={area(0, 5, 1, 7)} len={dur(1300)} v={{ background: `linear-gradient(90deg, ${tint(p1, 0.3)}, ${tint(p0, 0.18)})` }} />
        <Ly c="bsp-r-move" at={d(200)} box={sq(0, 8)} len={dur(1200)} v={{ "--mx": 0, "--my": -3 }}>
          <Man k="r" pal={SLIPGRIP} foe />
        </Ly>
        <Ly c="bsp-facein" at={d(620)} box={area(0, 3, 1, 4)} len={dur(800)} v={{ borderLeft: `2px dashed ${p1}`, borderRight: `2px dashed ${p1}` }}>
          <Nope color={p1} w={0.8} />
        </Ly>
        <Ly c="bsp-stamp" at={d(840)} box={pipsBox(4, 14, 6)} len={dur(700)}>
          <Pips n={4} fill={p0} stroke={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Snap Freeze: the piece that just moved arrives and the ice snaps shut on
 *  it where it landed, for one of its turns. */
const SNAPFRZ: Palette = ["#aee2ff", "#cdeaff", "#2a5070"];
function SnapFreezeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="snap_freeze" pal={SNAPFRZ} dev="acorn" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SNAPFRZ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-move" at={d(60)} box={cell(1, 2)} len={dur(1300)} v={{ "--mx": -1, "--my": -2 }}>
        <Man k="n" pal={SNAPFRZ} foe />
      </Ly>
      <Ly c="bsp-close-l" at={d(380)} box={{ ...cell(0, 0), width: `${CELL / 2}%` }} len={dur(900)} v={{ background: tint(p0, 0.45), borderLeft: `2px solid ${p1}` }} />
      <Ly c="bsp-close-r" at={d(380)} box={{ ...cell(0.5, 0), width: `${CELL / 2}%` }} len={dur(900)} v={{ background: tint(p1, 0.38), borderRight: `2px solid ${p1}` }} />
      <Ly c="bsp-stamp" at={d(780)} box={pipsAt(1, -0.3, 0)} len={dur(700)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Stage Fright: the enemy pawn on its seventh steps up to promote, the
 *  curtain drops across the promotion square and it freezes where it is; the
 *  crown is held back a turn. Four pips for the four-turn window. */
const FRIGHT: Palette = ["#8faf4a", "#c9b0e8", "#2f3a26"];
function StageFrightScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="stage_fright" pal={FRIGHT} dev="caltrop" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = FRIGHT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-balk" at={d(0)} box={cell(0, 0)} len={dur(1300)} v={{ "--mx": 0, "--my": -0.8 }}>
        <Man k="p" pal={FRIGHT} foe />
      </Ly>
      <Ly c="bsp-close-l" at={d(260)} box={{ ...cell(0, -1), width: `${CELL / 2}%` }} len={dur(1000)} v={{ background: p2, borderRight: `1px solid ${p1}` }} />
      <Ly c="bsp-close-r" at={d(260)} box={{ ...cell(0.5, -1), width: `${CELL / 2}%` }} len={dur(1000)} v={{ background: p2, borderLeft: `1px solid ${p1}` }} />
      <Ly c="bsp-facein" at={d(560)} box={cell(0, -1, 0.7)} len={dur(800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d={CROWN} fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M1.6 1.6 L8.4 8.4" stroke={p0} strokeWidth="1" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-stamp" at={d(800)} box={pipsAt(4, -0.6, 1)} len={dur(700)}>
        <Pips n={4} fill={p0} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Steady March: the drum beats and two pawns each step forward one square,
 *  at once. */
const MARCH: Palette = ["#a83a4a", "#ffd76a", "#2e1218"];
function SteadyMarchScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="steady_march" pal={MARCH} dev="warhorn" fx="muster" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MARCH;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-stamp" at={d(0)} box={cell(-1, -0.2, 0.6)} len={dur(700)}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M4 8h16v9.6H4z" fill={p0} stroke={p2} strokeWidth="1.1" {...SJ} />
          <path d="M4.6 8.4l14.8 8.8M19.4 8.4L4.6 17.2" fill="none" stroke={p1} strokeWidth="1.2" />
        </svg>
      </Ly>
      {[0, 1].map((x) => (
        <Ly key={`l${x}`} c="bsp-r-hold" at={d(60)} box={cell(x, 1)} len={dur(1100)} v={landing(p1)} />
      ))}
      {[0, 1].map((x) => (
        <Ly key={`p${x}`} c="bsp-r-move" at={d(220)} box={cell(x, 0)} len={dur(1100)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="p" pal={MARCH} />
        </Ly>
      ))}
      <Ly c="bsp-drift" at={d(600)} box={cell(0.5, 0.2, 0.26)} v={{ "--dx": "0%", "--dy": "120%", "--rot": "0deg", background: tint(p1, 0.7) }} />
    </BoardWideStage>
  );
}

/** Stiff Joints: the enemy queen's diagonal locks up; she starts along it,
 *  seizes and is set back, for three of their turns (one hollow pip: the one
 *  diagonal escape). */
const STIFF: Palette = ["#a8763a", "#e8dcc0", "#3a2a1a"];
function StiffJointsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="stiff_joints" pal={STIFF} dev="hammer" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = STIFF;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Pin box={{ ...sq(3, 8), transform: "rotate(calc(45deg * var(--fx-side, 1)))" }}>
          <Ly c="bsp-beam" at={d(0)} box={{ left: "50%", top: "45%", width: "283%", height: "10%", background: tint(p0, 0.6) }} len={dur(1000)} />
        </Pin>
        <Ly c="bsp-r-balk" at={d(160)} box={sq(3, 8)} len={dur(1100)} v={{ "--mx": 1, "--my": -1 }}>
          <Man k="q" pal={STIFF} foe />
        </Ly>
        <Ly c="bsp-facein" at={d(520)} box={sq(4, 7)} len={dur(800)}>
          <Nope color={p1} />
        </Ly>
        <Ly c="bsp-stamp" at={d(780)} box={pipsBox(3, 45.2, 6)} len={dur(700)}>
          <svg viewBox="0 0 12 4" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <circle key={i} cx={2 + i * 4} cy="2" r="1.35" fill={i < 2 ? p0 : "none"} stroke={p1} strokeWidth="0.35" />
            ))}
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Teleport Knight: the 3x3 box round the knight is marked; it blinks out and
 *  reappears on an empty square inside it, with no capture; once. */
const TELEK: Palette = ["#c9a84c", "#fff2c9", "#4a3a22"];
function TeleportKnightScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="teleport_knight" pal={TELEK} dev="caltrop" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TELEK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 0, 3)} len={dur(1300)} v={{ border: `2px dashed ${p0}`, background: tint(p0, 0.12) }} />
      <Ly c="bsp-r-gone" at={d(120)} box={cell(0, 0)} len={dur(700)}>
        <Man k="n" pal={TELEK} />
      </Ly>
      <Pin box={{ ...cell(0, 0), transform: "rotate(calc(45deg * var(--fx-side, 1)))" }}>
        <Ly c="bsp-taut" at={d(300)} box={{ left: "50%", top: "46%", width: "141%", height: "8%", background: `repeating-linear-gradient(90deg, ${p1} 0 8%, transparent 8% 16%)` }} len={dur(700)} />
      </Pin>
      <Ly c="bsp-facein" at={d(460)} box={cell(1, -1)} len={dur(900)}>
        <Man k="n" pal={TELEK} />
      </Ly>
      <Ly c="bsp-stamp" at={d(740)} box={pipsAt(1, -0.3, 0)} len={dur(700)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Tempo Shuffle: one pawn sidesteps a file; when it lands a reroll die pops
 *  up. */
const TEMPO: Palette = ["#6fe3ff", "#fff4d6", "#1c3a4a"];
function TempoShuffleScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="tempo_shuffle" pal={TEMPO} dev="buoy" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TEMPO;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(0)} box={sq(4, 3)} len={dur(1200)} v={landing(p0)} />
        <Ly c="bsp-r-move" at={d(140)} box={sq(3, 3)} len={dur(1100)} v={{ "--mx": 1, "--my": 0 }}>
          <Man k="p" pal={TEMPO} />
        </Ly>
        <Ly c="bsp-rise" at={d(560)} box={{ ...sq(4, 4), width: "7%", height: "7%", marginLeft: "2.75%", marginTop: "2.75%" }} len={dur(800)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
            <circle cx="3.4" cy="3.4" r="0.8" fill={p2} /><circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
          </svg>
        </Ly>
        <Ly c="bsp-stamp" at={d(760)} box={pipsBox(1, 36.6, 3)} len={dur(700)}>
          <Pips n={1} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Toll Gate: a pawn double-steps past an enemy pawn; the enemy tries to take
 *  it en passant and the toll gate bar drops across the square behind it,
 *  for five of their turns. */
const TOLL: Palette = ["#bfa050", "#efe0b8", "#36301e"];
function TollGateScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="toll_gate" pal={TOLL} dev="spool" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TOLL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-move" at={d(60)} box={sq(4, 2)} len={dur(1400)} v={{ "--mx": 0, "--my": 2 }}>
          <Man k="p" pal={TOLL} />
        </Ly>
        <Ly c="bsp-drop" at={d(300)} box={{ ...sq(4, 3), height: "3%", marginTop: "4.75%" }} len={dur(1000)}>
          <svg viewBox="0 0 20 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 0 H20 V3 H0 Z" fill={p1} stroke={p2} strokeWidth="0.3" />
            <path d="M4 0 V3 M8 0 V3 M12 0 V3 M16 0 V3" stroke={p0} strokeWidth="1.6" />
          </svg>
        </Ly>
        <Ly c="bsp-r-balk" at={d(480)} box={sq(3, 4)} len={dur(900)} v={{ "--mx": 1, "--my": -1 }}>
          <Man k="p" pal={TOLL} foe />
        </Ly>
        <Ly c="bsp-stamp" at={d(820)} box={pipsBox(5, 58, 3)} len={dur(700)}>
          <Pips n={5} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Vault: the rook plants its pole and vaults its own pawn to the far side;
 *  two charges. */
const VAULT: Palette = ["#b58a5a", "#e8dcc0", "#4a3a26"];
function VaultScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="vault" pal={VAULT} dev="anvil" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = VAULT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(0)} box={cell(0, 1)} len={dur(1300)}>
        <Man k="p" pal={VAULT} />
      </Ly>
      <Ly c="bsp-swing" at={d(80)} box={{ ...cell(0.3, 0.8), width: `${CELL * 0.2}%`, height: `${CELL * 1.2}%` }} len={dur(900)}>
        <svg viewBox="0 0 2 12" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M1 0.4 V11.6" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-r-hop" at={d(220)} box={cell(0, 0)} len={dur(1100)} v={{ "--mx": 0, "--my": 2 }}>
        <Man k="r" pal={VAULT} />
      </Ly>
      <Ly c="bsp-stamp" at={d(720)} box={pipsAt(2, -0.3, 0)} len={dur(700)}>
        <Pips n={2} fill={p0} stroke={p2} />
      </Ly>
    </BoardWideStage>
  );
}

/** Walnut Shell: the walnut shut round one of the caster's pieces cracks and
 *  its halves fall away; the piece is free. */
const WALNUT: Palette = ["#b0824a", "#ffe9b0", "#3e2f1c"];
function WalnutShellScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="walnut_shell" pal={WALNUT} dev="coin" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = WALNUT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <Ly c="bsp-r-hold" at={d(60)} box={cell(0, 0, 0.9)} len={dur(500)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="5" cy="5" rx="4.4" ry="4.2" fill={p0} stroke={p2} strokeWidth="0.45" />
          <path d="M5 0.8 V9.2" stroke={p2} strokeWidth="0.45" />
        </svg>
      </Ly>
      {[-1, 1].map((s) => (
        <Ly key={s} c="bsp-r-move" at={d(320)} box={{ ...cell(s > 0 ? 0.5 : 0, 0), width: `${CELL / 2}%` }} len={dur(1100)} v={{ "--mx": s * 1.2, "--my": -0.4 }}>
          <svg viewBox="0 0 5 10" className="block h-full w-full" aria-hidden="true" style={s > 0 ? { scale: "-1 1" } : undefined}>
            <path d="M5 0.8 C1.6 0.8 0.6 3.4 0.6 5 C0.6 6.6 1.6 9.2 5 9.2 Z" fill={p0} stroke={p2} strokeWidth="0.45" {...SJ} />
            <path d="M3.4 2.4 C2.4 3.6 2.4 6.4 3.4 7.6" fill="none" stroke={p2} strokeWidth="0.35" />
          </svg>
        </Ly>
      ))}
      <Ly c="bsp-stamp" at={d(220)} box={cell(0, 0, 0.8)} len={dur(600)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.6 L4.2 3 L5.8 4.6 L4.4 7 L5.4 9.4" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-facein" at={d(560)} box={cell(0, 0)} len={dur(900)}>
        <Man k="b" pal={WALNUT} />
      </Ly>
    </BoardWideStage>
  );
}

/** Watchtower: a tower goes up on the border of the caster's half; an enemy
 *  knight galloping into it is spotted and turned back, for three of their
 *  turns. */
const TOWER: Palette = ["#5a6b8f", "#cdd6ff", "#161e33"];
function WatchtowerScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="watchtower" pal={TOWER} dev="hourglass" fx="gaze" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TOWER;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-taut" at={d(0)} box={{ left: 0, width: "100%", top: "49.4%", height: "1.2%", background: p1 }} len={dur(1300)} />
        <Pin box={area(0, 4, 1, 5)}>
          <Ly c="bsp-grow" at={d(120)} box={{ left: "10%", top: 0, width: "80%", height: "100%" }} len={dur(1200)}>
            <svg viewBox="0 0 10 16" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M3 16 L3.6 5 H6.4 L7 16 Z" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />
              <path d="M2 5 H8 V2.6 H7 V1.4 H6 V2.6 H4 V1.4 H3 V2.6 H2 Z" fill={p1} stroke={p2} strokeWidth="0.4" {...SJ} />
            </svg>
          </Ly>
        </Pin>
        <Ly c="bsp-r-balk" at={d(380)} box={sq(4, 6)} len={dur(1000)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={TOWER} foe />
        </Ly>
        <Ly c="bsp-stamp" at={d(820)} box={pipsBox(3, 45.2, 3)} len={dur(700)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Quicksand Patch: quicksand swirls where the enemy pawns would land on a
 *  double step; a pawn that tries it sinks back to where it stood, for two of
 *  their turns. */
const QSAND: Palette = ["#95a0b5", "#d6a25a", "#2a3140"];
function QuicksandPatchScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wc_quicksand_patch" pal={QSAND} dev="arrowhead" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = QSAND;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(0)} box={area(2, 5, 4, 5)} len={dur(1300)} v={{ background: tint(p1, 0.4) }} />
        <Ly c="bsp-turn" at={d(120)} box={{ ...sq(3, 5), width: "12.5%", marginLeft: "6.25%" }} len={dur(1100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 5 C5 4 6.4 4 6.4 5 C6.4 6.6 3.6 6.6 3.6 5 C3.6 2.6 7.8 2.6 7.8 5 C7.8 8.2 2.2 8.2 2.2 5" fill="none" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </Ly>
        <Ly c="bsp-r-balk" at={d(300)} box={sq(4, 7)} len={dur(1000)} v={{ "--mx": 0, "--my": -2 }}>
          <Man k="p" pal={QSAND} foe />
        </Ly>
        <Ly c="bsp-drift" at={d(560)} box={{ ...sq(4, 6), width: "3%", height: "3%", marginLeft: "4.75%", marginTop: "8%" }} v={{ "--dx": "-160%", "--dy": "calc(var(--fx-side, 1) * 120%)", "--rot": "0deg", background: p1 }} />
        <Ly c="bsp-stamp" at={d(780)} box={pipsBox(2, 46.8, 6)} len={dur(700)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Updraft: wind lifts the knight into a long three-by-one leap; when it
 *  lands a reroll die pops up; once. */
const UPDRAFT: Palette = ["#b58a5a", "#e8dcc0", "#4a3a26"];
function UpdraftScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_updraft" pal={UPDRAFT} dev="thorn" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = UPDRAFT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      {[0, 1].map((i) => (
        <Ly key={i} c="bsp-lift" at={d(i * 90)} box={{ ...cell(i ? 0.25 : -0.25, 0.4), width: `${CELL * 0.5}%` }} len={dur(1000)}>
          <svg viewBox="0 0 5 10" className="block h-full w-full" aria-hidden="true" style={FLIP}>
            <path d="M2.5 9.6 C0.6 7.4 4.4 5.6 2.5 3.4 C1.6 2.4 2 1.2 2.5 0.4" fill="none" stroke={tint(p1, 0.85)} strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </Ly>
      ))}
      <Ly c="bsp-r-hold" at={d(100)} box={cell(1, 3)} len={dur(1100)} v={landing(p0)} />
      <Ly c="bsp-r-hop" at={d(220)} box={cell(0, 0)} len={dur(1100)} v={{ "--mx": 1, "--my": 3 }}>
        <Man k="n" pal={UPDRAFT} />
      </Ly>
      <Ly c="bsp-rise" at={d(700)} box={cell(1.6, 3, 0.5)} len={dur(800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
          <circle cx="3.4" cy="3.4" r="0.8" fill={p2} /><circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
        </svg>
      </Ly>
    </BoardWideStage>
  );
}

/** Heavy Boots (a hex, tier 1): an iron boot drops onto an enemy pawn on its
 *  home rank; weighed down, it plods ONE square, and the two-square step it
 *  would have made is a dashed ghost that gets struck out; three pips for the
 *  opponent's next three turns. Quicksand Patch bans the same step with a
 *  swirl that swallows the landing square; here the weight is on the pawn. */
const BOOTS: Palette = ["#95a0b5", "#d6a25a", "#2a3140"];
function HeavyBootsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="heavy_boots" pal={BOOTS} dev="padlock" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BOOTS;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        <Ly c="bsp-r-hold" at={d(260)} box={sq(3, 6)} len={dur(1300)} v={{ background: tint(p0, 0.35) }} />
        <Ly c="bsp-r-hold" at={d(520)} box={sq(3, 5)} len={dur(1100)} v={{ border: `2px dashed ${p1}` }}>
          <Man k="p" pal={BOOTS} foe ghost />
        </Ly>
        <Ly c="bsp-r-move" at={d(0)} box={sq(3, 7)} len={dur(1700)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="p" pal={BOOTS} foe />
          <Ly c="bsp-drop" at={d(80)} box={{ left: "14%", top: "60%", width: "72%", height: "36%" }} len={dur(1500)}>
            <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true">
              <path d="M2 1h6v6h5v4H2z M13 1h6v6h4v4H13z" fill={p0} stroke={p2} strokeWidth="1" {...SJ} />
              <path d="M2 4h6 M13 4h6" stroke={p1} strokeWidth="0.9" />
            </svg>
          </Ly>
        </Ly>
        {[-1, 1].map((s) => (
          <Ly key={s} c="bsp-drift" at={d(800)} len={dur(700)} box={{ ...sq(3, 6), width: "2.4%", height: "2.4%", marginLeft: "5%", marginTop: "9%" }} v={{ "--dx": `${s * 180}%`, "--dy": "0%", "--rot": "0deg", background: tint(p1, 0.8) }} />
        ))}
        <Ly c="bsp-stamp" at={d(760)} box={sq(3, 5)} len={dur(900)}>
          <Nope color={p1} w={0.9} />
        </Ly>
        <Ly c="bsp-stamp" at={d(960)} box={pipsBox(3, 58, 5)} len={dur(900)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/* --- Tier 4 rule scenes (round 2: these cards left the tier 1-4 templates) - */

/** A square of the BoardFrame scaled by `s` about its centre (screen file
 *  `f`, caster's rank `r`; `f` may be fractional). */
function sqs(f: number, r: number, s: number): CSSProperties {
  const size = 12.5 * s;
  const inset = (12.5 - size) / 2;
  return { left: `${f * 12.5 + inset}%`, top: `calc(${rankTop(r)} + ${inset}%)`, width: `${size}%`, height: `${size}%` };
}

/** Which way a cast scene leans across the board: +1 when the cast square is
 *  on the left half (files a-d from the viewer), -1 on the right half, read
 *  from the stage's own --fx-board-dx. Art laid out with `cellh` and moved
 *  with `hx` mirrors toward the middle of the board, so a scene cast on the
 *  a- or h-file stays on the board instead of running off its edge. */
const HX = "clamp(-1, calc((3.4 + var(--fx-board-dx, -3.5)) * 1000), 1)";

/** BoardWideStage with --bsp-hx set for the scene inside it. */
function HStage({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <span className="absolute inset-0 block" style={{ "--bsp-hx": HX } as CSSProperties}>
        {children}
      </span>
    </BoardWideStage>
  );
}

/** `cell`, with the file offset mirrored by --bsp-hx. */
function cellh(dx: number, dy: number, s = 1): CSSProperties {
  const b = cell(0, dy, s);
  return dx ? { ...b, left: `calc(${b.left} + var(--bsp-hx, 1) * ${dx * CELL}%)` } : b;
}

/** A --mx track offset mirrored by --bsp-hx. */
function hx(n: number): string {
  return `calc(var(--bsp-hx, 1) * ${n})`;
}

/** `pipsAt`, mirrored by --bsp-hx. */
function pipsAth(n: number, dx: number, dy: number): CSSProperties {
  const b = pipsAt(n, 0, dy);
  return dx ? { ...b, left: `calc(${b.left} + var(--bsp-hx, 1) * ${dx * CELL}%)` } : b;
}

/** The hourglass that stands for "after your opponent's next move". */
function Glass({ pal }: { pal: Palette }) {
  const [, p1, p2] = pal;
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2.4 1.2 H7.6 L5 5 L7.6 8.8 H2.4 L5 5 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
    </svg>
  );
}

/** A reroll die. */
function Die({ pal }: { pal: Palette }) {
  const [, p1, p2] = pal;
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="1.2" y="1.2" width="7.6" height="7.6" fill={p1} stroke={p2} strokeWidth="0.5" />
      <circle cx="3.4" cy="3.4" r="0.8" fill={p2} />
      <circle cx="6.6" cy="6.6" r="0.8" fill={p2} />
    </svg>
  );
}

/** "For the game": a small endless knot stamped once the rule is set. */
function Ever({ color, fill }: { color: string; fill: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 5 C4.2 2.8 1.4 2.8 1.4 5 C1.4 7.2 4.2 7.2 5 5 C5.8 2.8 8.6 2.8 8.6 5 C8.6 7.2 5.8 7.2 5 5 Z" fill={fill} stroke={color} strokeWidth="0.8" {...SJ} />
    </svg>
  );
}

/** The nerf's shackle, shut or sprung open. */
function Shackle({ pal, open }: { pal: Palette; open?: boolean }) {
  const [p0, , p2] = pal;
  return (
    <svg viewBox="0 0 20 12" className="block h-full w-full" aria-hidden="true">
      <path d={open ? "M6 6.4 V3.4 C6 -0.2 13 -0.4 13.6 2.6" : "M6 7 V4.6 C6 1 14 1 14 4.6 V7"} fill="none" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4" y="6.4" width="12" height="5" fill={p0} stroke={p2} strokeWidth="0.6" />
    </svg>
  );
}

/** A draft card: `tier` pips along its foot, blank or locked in. */
function DraftCard({ pal, tier = 1, blank, lock }: { pal: Palette; tier?: number; blank?: boolean; lock?: boolean }) {
  const [p0, p1, p2] = pal;
  return (
    <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="0.8" width="8" height="12.4" rx="0.8" fill={blank ? tint(p2, 0.9) : p1} stroke={p2} strokeWidth="0.6" />
      {blank ? <path d="M2.4 11.6 L7.6 2.4" stroke={p1} strokeWidth="0.8" strokeLinecap="round" /> : <path d="M5 3 L6.6 5.6 L5 8.2 L3.4 5.6 Z" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />}
      {Array.from({ length: tier }, (_, i) => (
        <circle key={i} cx={5 - (tier - 1) * 0.9 + i * 1.8} cy="10.6" r="0.6" fill={blank ? p1 : p2} />
      ))}
      {lock ? <path d="M3.6 6.6 V5.6 C3.6 3.6 6.4 3.6 6.4 5.6 V6.6 M3 6.6 H7 V9.4 H3 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.5" {...SJ} /> : null}
    </svg>
  );
}

/** Abandoned Post: after their next move, for three of their turns, a move
 *  toward the caster's side covers at most two squares. The sentry box on the
 *  border stands empty with its door open, the enemy rook charging down its
 *  file gets two squares and stops, the rest of the charge is struck out, and
 *  their queen's sideways slide keeps its full range. */
const ABANDON: Palette = ["#8a94a8", "#c9cdd6", "#2e3440"];
function AbandonedPostScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="abandoned_post" pal={ABANDON} dev="inkpot" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = ABANDON;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the empty sentry box on the border, its door hanging open */}
        <Pin box={sq(0, 5)}>
          <Ly c="bsp-grow" at={d(0)} box={{ left: "14%", top: "4%", width: "72%", height: "92%" }} len={dur(2100)}>
            <svg viewBox="0 0 10 12" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 12 V3.4 L5 0.8 L8.6 3.4 V12 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
              <path d="M3.2 12 V5.6 H6.8 V12" fill={p2} stroke={p1} strokeWidth="0.4" {...SJ} />
              <path d="M6.8 5.6 L8.6 6.8 V12" fill="none" stroke={p1} strokeWidth="0.5" {...SJ} />
            </svg>
          </Ly>
        </Pin>
        {/* the hourglass: it starts after their next move */}
        <Ly c="bsp-turn" at={d(80)} box={sqs(1, 5, 0.5)} len={dur(1000)}>
          <Glass pal={ABANDON} />
        </Ly>
        {/* strike: their rook charges down the file, two squares and no further */}
        <Ly c="bsp-r-move" at={d(300)} box={sq(4, 8)} len={dur(1700)} v={{ "--mx": 0, "--my": -2 }}>
          <Man k="r" pal={ABANDON} foe />
        </Ly>
        {[5, 4, 3].map((r, i) => (
          <Ly key={r} c="bsp-facein" at={d(820 + i * 90)} box={sqs(4, r, 0.6)} len={dur(1100)}>
            <Nope color={p1} w={0.9} />
          </Ly>
        ))}
        {/* a sideways slide keeps its full range */}
        <Ly c="bsp-r-move" at={d(520)} box={sq(7, 7)} len={dur(1500)} v={{ "--mx": -4, "--my": 0 }}>
          <Man k="q" pal={ABANDON} foe />
        </Ly>
        {/* settle: three of their turns */}
        <Ly c="bsp-stamp" at={d(1080)} box={pipsBox(3, 58, 6)} len={dur(900)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Berolina Pawns: the pawn's arrow turns an eighth, so it steps diagonally
 *  forward onto an empty square, and another pawn captures straight ahead;
 *  for the game. */
const BEROLINA: Palette = ["#b5533a", "#fff2c9", "#33170f"];
const ARROW_UP = "M5 9.2 V1.8 M2.6 4.2 L5 1.6 L7.4 4.2";
function BerolinaPawnsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="berolina_pawns" pal={BEROLINA} dev="weathervane" fx="muster" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BEROLINA;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the pawn's straight arrow goes, a diagonal one takes its place */}
      <Pin box={{ ...cellh(0, 1, 0.8), ...FLIP }}>
        <Ly c="bsp-r-gone" at={d(0)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(700)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={ARROW_UP} fill="none" stroke={p1} strokeWidth="1" {...SJ} />
          </svg>
        </Ly>
      </Pin>
      <Pin box={{ ...cellh(0.55, 0.55, 0.8), scale: "var(--bsp-hx, 1) var(--fx-side, 1)" }}>
        <Pin box={{ left: 0, top: 0, width: "100%", height: "100%", transform: "rotate(45deg)" }}>
          <Ly c="bsp-facein" at={d(260)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1100)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={ARROW_UP} fill="none" stroke={p0} strokeWidth="1.1" {...SJ} />
            </svg>
          </Ly>
        </Pin>
      </Pin>
      {/* strike: it steps diagonally onto the empty square */}
      <Ly c="bsp-r-hold" at={d(300)} box={cellh(1, 1)} len={dur(1300)} v={landing(p0)} />
      <Ly c="bsp-r-move" at={d(360)} box={cellh(0, 0)} len={dur(1500)} v={{ "--mx": hx(1), "--my": 1 }}>
        <Man k="p" pal={BEROLINA} />
      </Ly>
      {/* and another pawn takes the one straight in front of it */}
      <Ly c="bsp-r-gone" at={d(300)} box={cellh(3, 1)} len={dur(1000)}>
        <Man k="p" pal={BEROLINA} foe />
      </Ly>
      <Ly c="bsp-r-move" at={d(520)} box={cellh(3, 0)} len={dur(1400)} v={{ "--mx": 0, "--my": 1 }}>
        <Man k="p" pal={BEROLINA} />
      </Ly>
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1060)} box={cellh(2, -0.7, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p1} />
      </Ly>
    </HStage>
  );
}

/** Bishop to Archbishop: the crozier is raised, a knight's head joins the
 *  bishop, and it leaps a knight's L while its own diagonal still stands; for
 *  the game. */
const ARCHB: Palette = ["#b58a5a", "#e8dcc0", "#4a3a26"];
function ArchbishopScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="bishop_archbishop" pal={ARCHB} dev="pylon" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = ARCHB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the crozier rises beside the bishop */}
      <Ly c="bsp-grow" at={d(0)} box={cellh(-0.7, 0.1, 0.9)} len={dur(1800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 9.6 V3.4 C5 1 8.2 1 8.2 3.2 C8.2 4.6 6.6 4.8 6.2 3.8" fill="none" stroke={p0} strokeWidth="0.9" {...SJ} />
        </svg>
      </Ly>
      {/* its bishop's diagonal stays open */}
      <Pin box={{ ...cellh(0, 0), transform: "scaleX(var(--bsp-hx, 1)) rotate(calc(-45deg * var(--fx-side, 1)))" }}>
        <Ly c="bsp-beam" at={d(60)} box={{ left: "50%", top: "46%", width: "300%", height: "8%", background: `linear-gradient(90deg, ${tint(p1, 0.7)}, transparent)` }} len={dur(1200)} />
      </Pin>
      {/* a knight's head settles on it */}
      <Ly c="bsp-facein" at={d(200)} box={cellh(0, 0)} len={dur(700)}>
        <Man k="n" pal={ARCHB} ghost />
      </Ly>
      {/* strike: the L leap */}
      <Ly c="bsp-r-hold" at={d(320)} box={cellh(1, 2)} len={dur(1300)} v={landing(p0)} />
      <Ly c="bsp-r-hop" at={d(480)} box={cellh(0, 0)} len={dur(1400)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="b" pal={ARCHB} />
      </Ly>
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(0.2, -0.7, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p1} />
      </Ly>
    </HStage>
  );
}

/** Blockade: a palisade is driven in across the front of the enemy pawns;
 *  one tries to advance and one tries to capture, both are stopped, for their
 *  next turn. */
const BLOCKADE: Palette = ["#7d8aa0", "#e3e9f2", "#1f2734"];
function BlockadeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="blockade" pal={BLOCKADE} dev="warhorn" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BLOCKADE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: their pawn front and the caster's knight in reach */}
        {[2, 5].map((f) => (
          <Ly key={f} c="bsp-r-hold" at={d(0)} box={sq(f, 7)} len={dur(2000)}>
            <Man k="p" pal={BLOCKADE} foe />
          </Ly>
        ))}
        <Ly c="bsp-r-hold" at={d(40)} box={sq(5, 6)} len={dur(1960)}>
          <Man k="n" pal={BLOCKADE} />
        </Ly>
        {/* the palisade driven in along their front */}
        <Ly c="bsp-grow" at={d(180)} box={{ left: "12.5%", width: "75%", top: lineTop(6, 5), height: "5%" }} len={dur(1800)}>
          <svg viewBox="0 0 60 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 2.2 H60" stroke={p2} strokeWidth="0.8" />
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d={`M${2.5 + i * 5} 4 V0.8 L${3.3 + i * 5} 0 L${4.1 + i * 5} 0.8 V4 Z`} fill={p0} stroke={p2} strokeWidth="0.3" />
            ))}
          </svg>
        </Ly>
        {/* strike: one pawn tries to advance, one to capture the knight */}
        <Ly c="bsp-r-balk" at={d(520)} box={sq(3, 7)} len={dur(1300)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="p" pal={BLOCKADE} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(660)} box={sq(4, 7)} len={dur(1300)} v={{ "--mx": 1, "--my": -1 }}>
          <Man k="p" pal={BLOCKADE} foe />
        </Ly>
        {[{ f: 3, r: 6 }, { f: 5, r: 6 }].map((n, i) => (
          <Ly key={`x${n.f}`} c="bsp-facein" at={d(880 + i * 90)} box={sqs(n.f, n.r, 0.5)} len={dur(1000)}>
            <Nope color={p1} w={1} />
          </Ly>
        ))}
        {/* settle: one of their turns */}
        <Ly c="bsp-stamp" at={d(1080)} box={pipsBox(1, 48.4, 5)} len={dur(900)}>
          <Pips n={1} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Board Lock: the key turns in the board's edge; the enemy queen sliding
 *  down her file travels three squares, the bolt shoots across the fourth and
 *  the rest is struck out, for three of their turns. */
const BOARDLOCK: Palette = ["#c9a84c", "#ffd76a", "#3a3026"];
function BoardLockScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="board_lock" pal={BOARDLOCK} dev="waxseal" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BOARDLOCK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the lock plate on the board's edge, its key turning */}
        <Ly c="bsp-r-hold" at={d(0)} box={sqs(0, 5, 0.7)} len={dur(2000)} v={{ background: p2, border: `2px solid ${p0}` }} />
        <Ly c="bsp-turn" at={d(60)} box={sqs(0, 5, 0.6)} len={dur(1100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="3" r="1.8" fill="none" stroke={p1} strokeWidth="0.8" />
            <path d="M5 4.8 V9 M5 7.2 H6.6 M5 8.6 H6.2" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* strike: the queen slides three squares and no further */}
        <Ly c="bsp-r-move" at={d(280)} box={sq(3, 8)} len={dur(1700)} v={{ "--mx": 0, "--my": -3 }}>
          <Man k="q" pal={BOARDLOCK} foe />
        </Ly>
        {[7, 6, 5].map((r, i) => (
          <Ly key={r} c="bsp-glint" at={d(420 + i * 110)} box={sqs(2.6, r, 0.3)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="3" fill={p1} stroke={p2} strokeWidth="0.6" />
            </svg>
          </Ly>
        ))}
        {/* the bolt shoots across her fourth square */}
        <Ly c="bsp-taut" at={d(820)} box={{ ...sq(2, 4, 3), height: "2.6%", marginTop: "4.95%" }} len={dur(1200)} v={{ background: p0, border: `1px solid ${p2}` }} />
        <Ly c="bsp-facein" at={d(900)} box={sqs(3, 3, 0.6)} len={dur(1000)}>
          <Nope color={p1} w={0.9} />
        </Ly>
        {/* settle: three of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(3, 58, 6)} len={dur(900)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Bodyguard: a knight drops into the caster's pocket; on a later turn it is
 *  set down beside the king, shades on. */
const BODYG: Palette = ["#96703f", "#ff9d3d", "#362818"];
function BodyguardScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="bodyguard" pal={BODYG} dev="dice" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BODYG;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the pocket, and the knight going into it */}
      <Ly c="bsp-plop" at={d(0)} box={cellh(-1, 0, 0.9)} len={dur(1300)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 3.4 H8.6 L8 9 H2 Z" fill={tint(p0, 0.8)} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M1.4 3.4 C3 5.4 7 5.4 8.6 3.4" fill="none" stroke={p1} strokeWidth="0.5" />
        </svg>
      </Ly>
      <Ly c="bsp-facein" at={d(160)} box={cellh(-1, 0.1, 0.6)} len={dur(900)}>
        <Man k="n" pal={BODYG} />
      </Ly>
      {/* the king it will stand beside */}
      <Ly c="bsp-r-hold" at={d(60)} box={cellh(1, 1)} len={dur(2000)}>
        <Man k="k" pal={BODYG} />
      </Ly>
      {/* a later turn */}
      <Ly c="bsp-turn" at={d(300)} box={cellh(-1.9, 0.5, 0.45)} len={dur(900)}>
        <Glass pal={BODYG} />
      </Ly>
      {/* strike: it is dropped onto the empty square beside the king */}
      <Ly c="bsp-r-hop" at={d(560)} box={cellh(-1, 0)} len={dur(1500)} v={{ "--mx": hx(2), "--my": 0 }}>
        <Man k="n" pal={BODYG} />
      </Ly>
      {/* settle: the shades go on */}
      <Ly c="bsp-drop" at={d(1080)} box={{ ...cellh(1.1, 0.2, 0.44) }} len={dur(1000)}>
        <svg viewBox="0 0 10 4" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 1 H9.4 M1 1 C1 3.4 4 3.4 4.4 1 M5.6 1 C6 3.4 9 3.4 9 1" fill={p2} stroke={p2} strokeWidth="0.6" {...SJ} />
        </svg>
      </Ly>
    </HStage>
  );
}

/** Buff Thief (Minor): a hook drops onto the opponent's tier 1 card and hauls
 *  it across to the caster; the locked-in upgrade beside it stays put. */
const THIEF: Palette = ["#b98cff", "#ffd76a", "#2a1a4a"];
function BuffThiefScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="buff_thief_minor" pal={THIEF} dev="ledger" fx="draw" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = THIEF;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the thief's line reaching across the board */}
        <Ly c="bsp-r-hold" at={d(0)} box={{ ...area(2, 2, 1, 8), left: "31%", width: "0.8%" }} len={dur(1100)} v={{ background: tint(p0, 0.8) }} />
        {/* their two cards: a tier 1 buff and a locked-in upgrade */}
        <Ly c="bsp-r-move" at={d(0)} box={sqs(2, 8, 0.9)} len={dur(2000)} v={{ "--mx": 0, "--my": -6.6 }}>
          <DraftCard pal={THIEF} tier={1} />
        </Ly>
        <Ly c="bsp-r-balk" at={d(40)} box={sqs(5, 8, 0.9)} len={dur(1960)} v={{ "--mx": 0, "--my": -0.5 }}>
          <DraftCard pal={THIEF} tier={1} lock />
        </Ly>
        {/* strike: the hook drops onto the first card */}
        <Ly c="bsp-drop" at={d(120)} box={sqs(2.3, 8, 0.5)} len={dur(700)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 V6 C5 9 1.6 9 1.6 6.4" fill="none" stroke={p0} strokeWidth="1.1" {...SJ} />
          </svg>
        </Ly>
        {/* a second hook tugs at the locked-in card, which does not come */}
        <Ly c="bsp-drop" at={d(260)} box={sqs(5.3, 8, 0.5)} len={dur(900)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 V6 C5 9 1.6 9 1.6 6.4" fill="none" stroke={tint(p0, 0.6)} strokeWidth="1.1" {...SJ} />
          </svg>
        </Ly>
        {/* settle: it lands on the caster's side */}
        <Ly c="bsp-glint" at={d(1000)} box={sqs(2.3, 2, 0.5)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Cascade Freeze: the caster's knight captures, and the frost cascades from
 *  the capture square to the nearest enemy piece, which is iced in for a
 *  turn; the one further off is left alone. Two captures' worth. */
const CASCADE: Palette = ["#9fd8ff", "#e8f8ff", "#2c5a80"];
function CascadeFreezeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="cascade_freeze" pal={CASCADE} dev="lantern" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CASCADE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the capture */}
        <Ly c="bsp-r-gone" at={d(0)} box={sq(3, 5)} len={dur(1000)}>
          <Man k="p" pal={CASCADE} foe />
        </Ly>
        <Ly c="bsp-r-hop" at={d(60)} box={sq(2, 3)} len={dur(1500)} v={{ "--mx": 1, "--my": 2 }}>
          <Man k="n" pal={CASCADE} />
        </Ly>
        {/* the far enemy rook is not the nearest */}
        <Ly c="bsp-r-hold" at={d(120)} box={sq(6, 7)} len={dur(1900)}>
          <Man k="r" pal={CASCADE} foe />
        </Ly>
        {/* strike: frost cascades one step to the nearest enemy */}
        {[0, 1, 2].map((i) => (
          <Ly key={i} c="bsp-r-move" at={d(600 + i * 80)} box={sqs(3, 5, 0.34)} len={dur(800)} v={{ "--mx": 2.9, "--my": 2.9 }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.2 5 L5 9.4 L3.8 5 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.5" {...SJ} />
            </svg>
          </Ly>
        ))}
        <Ly c="bsp-r-strain" at={d(200)} box={sq(4, 6)} len={dur(1800)}>
          <Man k="b" pal={CASCADE} foe />
        </Ly>
        <Ly c="bsp-close-l" at={d(820)} box={{ ...sq(4, 6), width: "6.25%" }} len={dur(1200)} v={{ background: tint(p0, 0.42), borderLeft: `2px solid ${p1}` }} />
        <Ly c="bsp-close-r" at={d(820)} box={{ ...sq(4, 6), left: "56.25%", width: "6.25%" }} len={dur(1200)} v={{ background: tint(p1, 0.36), borderRight: `2px solid ${p1}` }} />
        {/* settle: two captures' worth */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 22, 4)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Chain Mail: mail shirts drop over the caster's knights and bishops; the
 *  enemy knight leaping at a bishop is thrown back, for two turns. */
const MAIL: Palette = ["#4fa3d1", "#dff7ff", "#173a52"];
const MAIL_MEN = [
  { f: 1, k: "n" as ManKind },
  { f: 2, k: "b" as ManKind },
  { f: 5, k: "b" as ManKind },
  { f: 6, k: "n" as ManKind },
];
function ChainMailScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="chain_mail" pal={MAIL} dev="pylon" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MAIL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the minor pieces on the back rank */}
        {MAIL_MEN.map((m) => (
          <Ly key={m.f} c="bsp-r-hold" at={d(60)} box={sq(m.f, 1)} len={dur(2040)}>
            <Man k={m.k} pal={MAIL} />
          </Ly>
        ))}
        {/* strike: a mail shirt drops over each */}
        {MAIL_MEN.map((m, i) => (
          <Ly key={`m${m.f}`} c="bsp-drop" at={d(180 + i * 70)} box={sqs(m.f, 1, 0.84)} len={dur(1700)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2.2 2.6 L4 1.4 H6 L7.8 2.6 L9 5 L7.6 5.6 V9.2 H2.4 V5.6 L1 5 Z" fill={tint(p0, 0.5)} stroke={p1} strokeWidth="0.45" {...SJ} />
              <path d="M3 4 H7 M3 5.6 H7 M3 7.2 H7" stroke={p2} strokeWidth="0.55" strokeDasharray="0.6 0.5" />
            </svg>
          </Ly>
        ))}
        {/* the enemy knight leaps at a bishop and is thrown back */}
        <Ly c="bsp-r-balk" at={d(640)} box={sq(3, 3)} len={dur(1300)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={MAIL} foe />
        </Ly>
        <Ly c="bsp-glint" at={d(880)} box={sqs(2.4, 1.6, 0.4)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
        {/* settle: two turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 46.8, 2)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Coffee: the cup steams, and the caster's knight makes two moves in a row;
 *  then the jitters: the cup rattles and the opponent gets a move of their
 *  own on the reply. */
const COFFEE: Palette = ["#b0824a", "#ffe9b0", "#3e2f1c"];
function CoffeeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="coffee" pal={COFFEE} dev="compass" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COFFEE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the cup, steaming, then rattling */}
      <Ly c="bsp-r-strain" at={d(0)} box={cellh(-1, 0, 0.8)} len={dur(2000)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 3.6 H7.4 V7 C7.4 8.6 6.2 9.4 4.5 9.4 C2.8 9.4 1.6 8.6 1.6 7 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M7.4 4.6 C9.2 4.6 9.2 7 7.4 7" fill="none" stroke={p2} strokeWidth="0.5" />
          <path d="M2.4 4.6 H6.6" stroke={p0} strokeWidth="0.9" />
        </svg>
      </Ly>
      <Ly c="bsp-lift" at={d(120)} box={cellh(-1, 0.7, 0.7)} len={dur(1300)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M3.4 9 C2.4 7 4.4 6 3.4 4 M6 9 C5 7 7 6 6 4" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* strike: two moves at once */}
      <Ly c="bsp-r-hop" at={d(300)} box={cellh(0, 0)} len={dur(900)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="n" pal={COFFEE} />
      </Ly>
      <Ly c="bsp-r-hop" at={d(700)} box={cellh(1, 2)} len={dur(1200)} v={{ "--mx": hx(2), "--my": 1 }}>
        <Man k="n" pal={COFFEE} />
      </Ly>
      <Ly c="bsp-stamp" at={d(300)} box={pipsAth(2, -0.6, -0.4)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
      {/* settle: the jitters hand them a move back */}
      <Ly c="bsp-r-move" at={d(980)} box={cellh(3, 5)} len={dur(1100)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="p" pal={COFFEE} foe />
      </Ly>
      <Ly c="bsp-stamp" at={d(1140)} box={pipsAth(1, 3.3, 3.6)} len={dur(800)}>
        <Pips n={1} fill={p2} stroke={p1} />
      </Ly>
    </HStage>
  );
}

/** Counter-Nerf: the tally counter is set at three; the opponent takes one of
 *  the caster's pieces, the counter clicks one off, and after their next move
 *  the nerf's shackle springs open for a turn. */
const COUNTERN: Palette = ["#f7c95a", "#fff2c9", "#6e5528"];
function CounterNerfScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="counter_nerf" pal={COUNTERN} dev="torch" fx="bell" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = COUNTERN;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the counter, three full */}
      <Ly c="bsp-r-hold" at={d(0)} box={{ ...cellh(-1.4, 0.4), width: `${CELL * 1.1}%`, height: `${CELL * 0.5}%` }} len={dur(2100)} v={{ background: p2, border: `1px solid ${p0}` }}>
        <Pips n={3} fill={p1} stroke={p0} />
      </Ly>
      {/* strike: their bishop takes the caster's pawn */}
      <Ly c="bsp-r-gone" at={d(120)} box={cellh(0, 0)} len={dur(900)}>
        <Man k="p" pal={COUNTERN} />
      </Ly>
      <Ly c="bsp-r-move" at={d(140)} box={cellh(2, 2)} len={dur(1700)} v={{ "--mx": hx(-2), "--my": -2 }}>
        <Man k="b" pal={COUNTERN} foe />
      </Ly>
      {/* the counter clicks one off */}
      <Ly c="bsp-stamp" at={d(640)} box={{ ...cellh(-1.4, 0.4, 0.34), marginLeft: `${CELL * -0.25}%` }} len={dur(1000)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="3.4" fill={p2} stroke={p1} strokeWidth="0.8" />
        </svg>
      </Ly>
      {/* after their next move */}
      <Ly c="bsp-turn" at={d(560)} box={cellh(1, -0.7, 0.45)} len={dur(900)}>
        <Glass pal={COUNTERN} />
      </Ly>
      {/* settle: the nerf's shackle springs open for one turn */}
      <Ly c="bsp-r-gone" at={d(700)} box={{ ...cellh(-1.2, -0.6), height: `${CELL * 0.6}%` }} len={dur(700)}>
        <Shackle pal={COUNTERN} />
      </Ly>
      <Ly c="bsp-facein" at={d(1000)} box={{ ...cellh(-1.2, -0.6), height: `${CELL * 0.6}%` }} len={dur(1000)}>
        <Shackle pal={COUNTERN} open />
      </Ly>
    </HStage>
  );
}

/** Cryostasis: the targeted enemy knight flash-freezes and the ice reaches
 *  every enemy piece beside it; their queen, the most valuable piece caught,
 *  cracks her ice off and stays free, and their king is never touched. One of
 *  their turns. */
const CRYO: Palette = ["#8fb5e8", "#dff7ff", "#22304a"];
const CRYO_ICED = [
  { f: 3, r: 6, k: "n" as ManKind, t: 300 },
  { f: 2, r: 7, k: "p" as ManKind, t: 420 },
  { f: 4, r: 6, k: "b" as ManKind, t: 480 },
];
function CryostasisScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="cryostasis" pal={CRYO} dev="anvil" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CRYO;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the frost bursts out of the target over the squares beside it */}
        <Ly c="bsp-spoke" at={d(0)} box={area(2, 5, 3, 7)} len={dur(1300)}>
          <svg viewBox="0 0 30 30" className="block h-full w-full" aria-hidden="true">
            <path d="M15 3 V27 M3 15 H27 M6.5 6.5 L23.5 23.5 M23.5 6.5 L6.5 23.5" stroke={tint(p1, 0.8)} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M13 5 L15 7 L17 5 M13 25 L15 23 L17 25 M5 13 L7 15 L5 17 M25 13 L23 15 L25 17" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
          </svg>
        </Ly>
        {/* strike: the target and its neighbours are sealed in */}
        {CRYO_ICED.map((t) => (
          <Ly key={`m${t.f}${t.r}`} c="bsp-r-strain" at={d(80)} box={sq(t.f, t.r)} len={dur(2000)}>
            <Man k={t.k} pal={CRYO} foe />
          </Ly>
        ))}
        {CRYO_ICED.map((t) => (
          <Ly key={`i${t.f}${t.r}`} c="bsp-settle" at={d(t.t)} box={sqs(t.f, t.r, 0.96)} len={dur(1500)} v={{ background: tint(p0, 0.4), border: `2px solid ${p1}` }} />
        ))}
        {/* the queen shrugs her ice off: the defender keeps her free */}
        <Ly c="bsp-r-hold" at={d(80)} box={sq(4, 7)} len={dur(2000)}>
          <Man k="q" pal={CRYO} foe />
        </Ly>
        <Ly c="bsp-r-gone" at={d(360)} box={sqs(4, 7, 0.96)} len={dur(900)} v={{ background: tint(p0, 0.4), border: `2px dashed ${p1}` }} />
        {[-1, 1].map((s) => (
          <Ly key={`c${s}`} c="bsp-drift" at={d(520)} box={sqs(4 + s * 0.2, 7, 0.24)} len={dur(900)} v={{ "--dx": `${s * 200}%`, "--dy": "calc(var(--fx-side, 1) * -160%)", "--rot": `${s * 80}deg`, background: tint(p1, 0.85) }} />
        ))}
        {/* and the king beside them is never frozen */}
        <Ly c="bsp-r-hold" at={d(120)} box={sq(3, 7)} len={dur(1960)}>
          <Man k="k" pal={CRYO} foe />
        </Ly>
        {/* settle: one of their turns */}
        <Ly c="bsp-stamp" at={d(1080)} box={pipsBox(1, 23.4, 4)} len={dur(900)}>
          <Pips n={1} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Dragon Pawn: the pawn grows wings; it may still take its pawn's step, but
 *  it leaps a knight's L instead, and it keeps the wings until it promotes. */
const DRAGONP: Palette = ["#c9a84c", "#fff2c9", "#4a3a22"];
const WING = "M0 6 C2 2 6 0.6 9.6 1.4 C8 2.6 8.4 3.6 9.4 4 C7.6 4.2 7.4 5.4 8.2 6.2 C6 5.8 3.4 6.8 0 8 Z";
function DragonPawnScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="dragon_pawn" pal={DRAGONP} dev="keystone" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DRAGONP;
  const d = (n: number) => dm(delayMs, n);
  const wing = (
    <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
      <path d={WING} fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.4" {...SJ} />
    </svg>
  );
  return (
    <HStage>
      {/* tell: the pawn's own step stays, drawn as an outline */}
      <Ly c="bsp-facein" at={d(120)} box={cellh(0, 1)} len={dur(1100)}>
        <Man k="p" pal={DRAGONP} ghost />
      </Ly>
      <Ly c="bsp-r-hold" at={d(260)} box={cellh(1, 2)} len={dur(1400)} v={landing(p0)} />
      {/* strike: wings open and it leaps the knight's L */}
      <Ly c="bsp-r-hop" at={d(0)} box={cellh(0, 0)} len={dur(2000)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="p" pal={DRAGONP} />
        <Ly c="bsp-unfurl" at={d(60)} box={{ left: "56%", top: "12%", width: "62%", height: "50%" }} len={dur(1900)}>
          {wing}
        </Ly>
        <Pin box={{ left: "-18%", top: "12%", width: "62%", height: "50%", transform: "scaleX(-1)" }}>
          <Ly c="bsp-unfurl" at={d(60)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1900)}>
            {wing}
          </Ly>
        </Pin>
      </Ly>
      {/* settle: until it promotes, the crown far up its file */}
      <Ly c="bsp-stamp" at={d(1000)} box={cellh(1, 4, 0.55)} len={dur(1000)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d={CROWN} fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.1 0.7" {...SJ} />
        </svg>
      </Ly>
    </HStage>
  );
}

/** Faerie Ring: pale mushrooms spring up on the eight squares round the
 *  chosen one; the enemy knight trying to land on one is turned away, for
 *  two of their turns. */
const FAERIE: Palette = ["#5faf5f", "#ff9dd6", "#1c4a2c"];
const FAERIE_RING = [
  [3, 5], [4, 5], [4, 4], [4, 3], [3, 3], [2, 3], [2, 4], [2, 5],
];
function FaerieRingScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="faerie_ring" pal={FAERIE} dev="brazier" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = FAERIE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the chosen square */}
        <Ly c="bsp-r-hold" at={d(60)} box={sq(3, 4)} len={dur(2040)} v={{ background: tint(p0, 0.18) }} />
        {/* strike: a mushroom springs up on each of the eight, round the ring */}
        {FAERIE_RING.map(([f, r], i) => (
          <Ly key={`${f}${r}`} c="bsp-grow" at={d(120 + i * 55)} box={sqs(f, r, 0.72)} len={dur(1900 - i * 55)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4.2 9.4 V5.6 H5.8 V9.4 Z" fill={SHINE} stroke={p2} strokeWidth="0.4" {...SJ} />
              <path d="M1 5.8 C1 2 9 2 9 5.8 Z" fill={SHINE} stroke={p2} strokeWidth="0.5" {...SJ} />
              <circle cx="3.6" cy="4.4" r="0.6" fill={p1} />
              <circle cx="6.2" cy="3.8" r="0.5" fill={p1} />
            </svg>
          </Ly>
        ))}
        {/* the enemy knight tries to land inside the ring and is turned away */}
        <Ly c="bsp-r-balk" at={d(640)} box={sq(4, 6)} len={dur(1300)} v={{ "--mx": -2, "--my": -1 }}>
          <Man k="n" pal={FAERIE} foe />
        </Ly>
        <Ly c="bsp-facein" at={d(900)} box={sqs(2, 5, 0.5)} len={dur(1000)}>
          <Nope color={p2} w={1.1} />
        </Ly>
        {/* settle: two of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 34.3, 5)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Flypaper File: a strip of flypaper unrolls down one file for the caster's
 *  next six turns; an enemy rook that slides onto it sticks fast and strains
 *  there for two of its turns. */
const FLYP: Palette = ["#bfa050", "#efe0b8", "#36301e"];
function FlypaperFileScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="flypaper_file" pal={FLYP} dev="anchor" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = FLYP;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the strip unrolls down the whole file */}
        <Ly c="bsp-scroll" at={d(0)} box={{ left: "38%", width: "11%", top: 0, height: "100%" }} len={dur(2300)} v={{ background: tint(p1, 0.45), borderLeft: `2px solid ${p0}`, borderRight: `2px solid ${p0}` }} />
        {/* a fly already stuck to it */}
        <Ly c="bsp-r-strain" at={d(160)} box={sqs(3, 3, 0.4)} len={dur(1900)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="5" cy="5.6" rx="1.6" ry="2.4" fill={p2} />
            <ellipse cx="3" cy="3.6" rx="2" ry="1.2" fill={tint(p1, 0.8)} stroke={p2} strokeWidth="0.3" />
            <ellipse cx="7" cy="3.6" rx="2" ry="1.2" fill={tint(p1, 0.8)} stroke={p2} strokeWidth="0.3" />
          </svg>
        </Ly>
        {/* strike: an enemy rook slides onto the file and sticks */}
        <Ly c="bsp-r-move" at={d(360)} box={sq(6, 6)} len={dur(1000)} v={{ "--mx": -3, "--my": 0 }}>
          <Man k="r" pal={FLYP} foe />
        </Ly>
        <Ly c="bsp-r-strain" at={d(1000)} box={sq(3, 6)} len={dur(1300)}>
          <Man k="r" pal={FLYP} foe />
        </Ly>
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 40.3, 6)} len={dur(900)}>
          <Pips n={2} fill={p2} stroke={p0} />
        </Ly>
        {/* settle: the strip stays for the caster's next six turns */}
        <Ly c="bsp-facein" at={d(900)} box={pipsBox(6, 34, 1)} len={dur(1200)}>
          <Pips n={6} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Giant Slayer: the pawn whirls its sling; the stone flies sideways into the
 *  enemy rook standing right beside it, the giant falls, the pawn steps into
 *  its square and a reroll die is spent. Twice a game. */
const GIANTS: Palette = ["#bf9a68", "#f2e6d0", "#46381f"];
function GiantSlayerScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="giant_slayer" pal={GIANTS} dev="acorn" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GIANTS;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the sling whirls over the pawn */}
        <Ly c="bsp-orbit" at={d(0)} box={sqs(3, 4, 1.2)} len={dur(900)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 5 L5 1.2" stroke={p2} strokeWidth="0.4" />
            <circle cx="5" cy="1.2" r="0.9" fill={p1} stroke={p2} strokeWidth="0.3" />
          </svg>
        </Ly>
        {/* the giant beside it */}
        <Ly c="bsp-r-gone" at={d(80)} box={sq(4, 4)} len={dur(1200)}>
          <Man k="r" pal={GIANTS} foe />
        </Ly>
        {/* strike: the stone flies straight sideways into it */}
        <Ly c="bsp-r-move" at={d(420)} box={sqs(3, 4, 0.3)} len={dur(500)} v={{ "--mx": 3.3, "--my": 0, background: p1, border: `1px solid ${p2}` }} />
        <Ly c="bsp-drift" at={d(680)} box={sqs(4, 4, 0.22)} len={dur(800)} v={{ "--dx": "180%", "--dy": "calc(var(--fx-side, 1) * -120%)", "--rot": "90deg", background: p2 }} />
        {/* the pawn takes the square beside it */}
        <Ly c="bsp-r-move" at={d(360)} box={sq(3, 4)} len={dur(1800)} v={{ "--mx": 1, "--my": 0 }}>
          <Man k="p" pal={GIANTS} />
        </Ly>
        {/* settle: a reroll die is spent, one of two uses gone */}
        <Ly c="bsp-r-gone" at={d(900)} box={sqs(2, 3, 0.5)} len={dur(1000)}>
          <Die pal={GIANTS} />
        </Ly>
        <Ly c="bsp-stamp" at={d(1080)} box={pipsBox(2, 40, 3)} len={dur(900)}>
          <svg viewBox="0 0 8 4" className="block h-full w-full" aria-hidden="true">
            <circle cx="2" cy="2" r="1.35" fill="none" stroke={p1} strokeWidth="0.35" />
            <circle cx="6" cy="2" r="1.35" fill={p0} stroke={p1} strokeWidth="0.35" />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Grace Period: the nerf card on the caster's side is lifted off and hung on
 *  a peg, its chain dropping away, for four turns. */
const GRACE: Palette = ["#ffd76a", "#fff7de", "#8a6a3a"];
function GracePeriodScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="grace_period" pal={GRACE} dev="crown" fx="bell" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GRACE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the peg is set above the nerf card */}
        <Ly c="bsp-drop" at={d(0)} box={sqs(3.5, 3, 0.3)} len={dur(2000)} v={{ background: p2, border: `1px solid ${p0}` }} />
        {/* strike: the nerf card is lifted up onto it */}
        <Ly c="bsp-r-move" at={d(80)} box={sqs(3.5, 1, 0.95)} len={dur(2000)} v={{ "--mx": 0, "--my": 1.2 }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.4 L1.6 3 M5 0.4 L8.4 3" stroke={p2} strokeWidth="0.4" />
            <rect x="1.2" y="3" width="7.6" height="8.6" rx="0.6" fill={p1} stroke={p2} strokeWidth="0.5" />
            <path d="M3.4 6 V5.2 C3.4 3.8 6.6 3.8 6.6 5.2 V6 M2.8 6 H7.2 V9.4 H2.8 Z" fill={p0} stroke={p2} strokeWidth="0.45" {...SJ} />
          </svg>
        </Ly>
        {/* its chain drops away */}
        {[-1, 1].map((s) => (
          <Ly key={s} c="bsp-drift" at={d(440)} box={sqs(3.5 + s * 0.25, 1.4, 0.3)} len={dur(1100)} v={{ "--dx": `${s * 120}%`, "--dy": "calc(var(--fx-side, 1) * 220%)", "--rot": `${s * 50}deg` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="3.4" cy="5" rx="2.6" ry="1.6" fill="none" stroke={p2} strokeWidth="0.9" />
              <ellipse cx="6.6" cy="5" rx="2.6" ry="1.6" fill="none" stroke={p0} strokeWidth="0.9" />
            </svg>
          </Ly>
        ))}
        <Ly c="bsp-facein" at={d(640)} box={{ ...sqs(5.2, 1.3, 0.8), height: "6%" }} len={dur(1300)}>
          <Shackle pal={GRACE} open />
        </Ly>
        {/* settle: four turns */}
        <Ly c="bsp-stamp" at={d(1000)} box={pipsBox(4, 57, 2)} len={dur(1000)}>
          <Pips n={4} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Guard Rotation: the changing of the guard. The rook, in its tall
 *  bearskin, and the king march past each other and trade squares; once. */
const GUARDROT: Palette = ["#8468f0", "#c9f4ff", "#1a0f38"];
function GuardRotationScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="guard_rotation" pal={GUARDROT} dev="hourglass" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GUARDROT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the two posts */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(0, 0)} len={dur(900)} v={landing(p1)} />
      <Ly c="bsp-r-hold" at={d(60)} box={cellh(4, 0)} len={dur(900)} v={landing(p1)} />
      {/* strike: they march past each other, the rook stepping over */}
      <Ly c="bsp-r-move" at={d(260)} box={cellh(4, 0)} len={dur(1700)} v={{ "--mx": hx(-4), "--my": 0 }}>
        <Man k="k" pal={GUARDROT} />
      </Ly>
      <Ly c="bsp-r-hop" at={d(260)} box={cellh(0, 0)} len={dur(1700)} v={{ "--mx": hx(4), "--my": 0 }}>
        <Man k="r" pal={GUARDROT} />
        <svg viewBox="0 0 10 10" className="absolute block" style={{ left: "30%", top: "-18%", width: "40%", height: "40%" }} aria-hidden="true">
          <path d="M2 10 C1 4 3 0.6 5 0.6 C7 0.6 9 4 8 10 Z" fill={p2} stroke={p1} strokeWidth="0.5" {...SJ} />
        </svg>
      </Ly>
      {/* the rotation between them */}
      <Ly c="bsp-turn" at={d(200)} box={cellh(2, 0.9, 0.7)} len={dur(1200)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M8.2 4 A3.4 3.4 0 0 0 2 3.2 M1.8 6 A3.4 3.4 0 0 0 8 6.8" fill="none" stroke={p0} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M1 1.8 L2 3.4 L3.6 2.6 M9 8.2 L8 6.6 L6.4 7.4" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
        </svg>
      </Ly>
      {[[0, 0], [4, 0]].map(([x, y]) => (
        <Ly key={`g${x}`} c="bsp-glint" at={d(880)} box={cellh(x + 0.3, y + 0.3, 0.4)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
      ))}
      {/* settle: the one charge is spent */}
      <Ly c="bsp-r-gone" at={d(1000)} box={pipsAth(1, -0.3, -0.3)} len={dur(1000)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Heavy Shackles: iron balls are chained to the enemy queen and both rooks.
 *  The queen, the first to move, slips her shackle for that one move; after
 *  it the rooks strain against theirs, for two of their turns. */
const SHACKLES: Palette = ["#7d8aa0", "#e3e9f2", "#1f2734"];
const HEAVY = [-2, 0, 2];
function HeavyShacklesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="heavy_shackles" pal={SHACKLES} dev="spear" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SHACKLES;
  const d = (n: number) => dm(delayMs, n);
  const ball = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1.4 2 C3 3.4 4 3.4 5.4 5" fill="none" stroke={p1} strokeWidth="0.6" strokeDasharray="0.9 0.5" />
      <circle cx="6.6" cy="6.6" r="2.4" fill={p2} stroke={p0} strokeWidth="0.5" />
    </svg>
  );
  return (
    <HStage>
      {/* tell: the rooks, and the balls dropping beside all three */}
      {[-2, 2].map((x) => (
        <Ly key={`r${x}`} c="bsp-r-strain" at={d(0)} box={cellh(x, 0)} len={dur(2200)}>
          <Man k="r" pal={SHACKLES} foe />
        </Ly>
      ))}
      {HEAVY.map((x, i) => (
        <Ly key={`b${x}`} c={x ? "bsp-drop" : "bsp-r-gone"} at={d(100 + i * 60)} box={cellh(x + 0.35, -0.3, 0.6)} len={dur(x ? 1900 : 1000)}>
          {ball}
        </Ly>
      ))}
      {/* strike: the queen, first to move, slips free for that one move */}
      <Ly c="bsp-r-move" at={d(360)} box={cellh(0, 0)} len={dur(1700)} v={{ "--mx": hx(1), "--my": -1 }}>
        <Man k="q" pal={SHACKLES} foe />
      </Ly>
      <Ly c="bsp-facein" at={d(560)} box={cellh(0, 0, 0.6)} len={dur(900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 6 V4 C2 1.6 5.4 1.4 6 3.2 M2 6 H8 V9 H2 Z" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1 0.6" {...SJ} />
        </svg>
      </Ly>
      {/* settle: two of their turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(2, -0.3, -1)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Hex Doll: a cloth doll with a lock of horsehair is bound to the enemy
 *  knight. It captures within their next two turns, the pin goes into the
 *  doll, and the knight is destroyed where it landed. */
const HEXDOLL: Palette = ["#8faf4a", "#c9b0e8", "#2f3a26"];
function HexDollScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="hex_doll" pal={HEXDOLL} dev="anvil" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HEXDOLL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the doll with its lock of horsehair */}
      <Ly c="bsp-drop" at={d(0)} box={cellh(-1.2, 0.2, 0.9)} len={dur(2100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="2.6" r="1.8" fill={p1} stroke={p2} strokeWidth="0.45" />
          <path d="M3.6 4.4 H6.4 L7.8 5.4 L6.6 6 V9.4 H5.6 V7.4 H4.4 V9.4 H3.4 V6 L2.2 5.4 Z" fill={p1} stroke={p2} strokeWidth="0.45" {...SJ} />
          <path d="M4.2 5.6 L5.8 6.2 M4.2 6.6 L5.8 5.6" stroke={p0} strokeWidth="0.4" />
          <path d="M6.4 1.4 C7.8 0.4 8.8 1.6 9.4 0.8" fill="none" stroke={p2} strokeWidth="0.5" />
        </svg>
      </Ly>
      {/* the capture */}
      <Ly c="bsp-r-gone" at={d(200)} box={cellh(1, -2)} len={dur(900)}>
        <Man k="p" pal={HEXDOLL} />
      </Ly>
      <Ly c="bsp-r-hop" at={d(240)} box={cellh(0, 0)} len={dur(1000)} v={{ "--mx": hx(1), "--my": -2 }}>
        <Man k="n" pal={HEXDOLL} foe />
      </Ly>
      {/* strike: the pin goes in */}
      <Ly c="bsp-r-move" at={d(620)} box={cellh(-1.05, 1, 0.55)} len={dur(900)} v={{ "--mx": 0, "--my": -0.9 }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 1.6 V9.6" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          <circle cx="5" cy="1.6" r="1.2" fill={p0} stroke={p2} strokeWidth="0.4" />
        </svg>
      </Ly>
      {/* and the knight is destroyed where it landed */}
      <Ly c="bsp-r-gone" at={d(760)} box={cellh(1, -2)} len={dur(1100)}>
        <Man k="n" pal={HEXDOLL} foe />
      </Ly>
      {/* settle: the doll holds for two of their turns */}
      <Ly c="bsp-stamp" at={d(1080)} box={pipsAth(2, -1.5, -0.6)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Hunter Knight: the sights settle on the prey, the knight leaps onto it,
 *  takes it and bounds a second leap beyond; once. */
const HUNTER: Palette = ["#9a7a4a", "#e0d0b0", "#332918"];
function HunterKnightScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="hunter_knight" pal={HUNTER} dev="torch" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = HUNTER;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the sights on the prey */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(1, 2)} len={dur(1200)}>
        <Man k="b" pal={HUNTER} foe />
      </Ly>
      <Ly c="bsp-settle" at={d(0)} box={cellh(1, 2, 1.1)} len={dur(1000)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="3.6" fill="none" stroke={p1} strokeWidth="0.5" />
          <path d="M5 0.4 V2.6 M5 7.4 V9.6 M0.4 5 H2.6 M7.4 5 H9.6" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* strike: the first leap takes it */}
      <Ly c="bsp-r-hop" at={d(260)} box={cellh(0, 0)} len={dur(900)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="n" pal={HUNTER} />
      </Ly>
      <Ly c="bsp-glint" at={d(560)} box={cellh(1.3, 2.3, 0.4)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
        </svg>
      </Ly>
      {/* the second leap lands beyond */}
      <Ly c="bsp-r-hold" at={d(560)} box={cellh(3, 3)} len={dur(1200)} v={landing(p0)} />
      <Ly c="bsp-r-hop" at={d(680)} box={cellh(1, 2)} len={dur(1300)} v={{ "--mx": hx(2), "--my": 1 }}>
        <Man k="n" pal={HUNTER} />
      </Ly>
      {/* settle: once */}
      <Ly c="bsp-r-gone" at={d(1000)} box={pipsAth(1, -0.3, -0.3)} len={dur(1000)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Immobilizer: the caster's piece is staked into its square; the enemy
 *  pieces beside it are pinned where they stand while it stays, their king
 *  steps away untouched, and a reroll die is spent. */
const IMMOB: Palette = ["#8fb5e8", "#dff7ff", "#22304a"];
const IMMOB_HELD = [
  { f: 2, r: 5, k: "p" as ManKind },
  { f: 4, r: 4, k: "n" as ManKind },
  { f: 4, r: 3, k: "b" as ManKind },
];
function ImmobilizerScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="immobilizer" pal={IMMOB} dev="boot" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = IMMOB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the piece and the squares that touch it */}
        <Ly c="bsp-r-hold" at={d(0)} box={sq(3, 4)} len={dur(2200)}>
          <Man k="r" pal={IMMOB} />
        </Ly>
        <Ly c="bsp-r-hold" at={d(80)} box={area(2, 3, 3, 5)} len={dur(2000)} v={{ border: `2px dashed ${tint(p1, 0.7)}` }} />
        {/* strike: a stake drives down beside each enemy piece there */}
        {IMMOB_HELD.map((m) => (
          <Ly key={`m${m.f}${m.r}`} c="bsp-r-strain" at={d(120)} box={sq(m.f, m.r)} len={dur(2000)}>
            <Man k={m.k} pal={IMMOB} foe />
          </Ly>
        ))}
        {IMMOB_HELD.map((m, i) => (
          <Ly key={`s${m.f}${m.r}`} c="bsp-drop" at={d(360 + i * 80)} box={{ ...sqs(m.f, m.r, 0.5), marginLeft: "4.5%" }} len={dur(1600)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.6 H6 V7 L5 9.6 L4 7 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </Ly>
        ))}
        {/* their king beside it walks away: kings are never held */}
        <Ly c="bsp-r-move" at={d(640)} box={sq(2, 3)} len={dur(1500)} v={{ "--mx": -1, "--my": 0 }}>
          <Man k="k" pal={IMMOB} foe />
        </Ly>
        {/* settle: a reroll die is spent */}
        <Ly c="bsp-r-gone" at={d(1000)} box={sqs(5.6, 2, 0.5)} len={dur(1000)}>
          <Die pal={IMMOB} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Iron Bishop: the bishop is plated in riveted iron; an enemy pawn's
 *  diagonal capture and an enemy knight's leap both clang off it. For the
 *  game. */
const IRONB: Palette = ["#5fc9b0", "#e3d0ff", "#1c3a40"];
function IronBishopScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="iron_bishop" pal={IRONB} dev="lantern" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = IRONB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the bishop, and the iron plate riveted on */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(0, 0)} len={dur(2200)}>
        <Man k="b" pal={IRONB} />
      </Ly>
      <Ly c="bsp-stamp" at={d(120)} box={cellh(0, -0.05, 0.62)} len={dur(2000)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 1.4 H8 V6.4 C8 8.4 6.4 9.4 5 9.8 C3.6 9.4 2 8.4 2 6.4 Z" fill={tint(p2, 0.72)} stroke={p0} strokeWidth="0.6" {...SJ} />
          <circle cx="3.2" cy="2.6" r="0.5" fill={p1} /><circle cx="6.8" cy="2.6" r="0.5" fill={p1} />
          <circle cx="3.2" cy="6.2" r="0.5" fill={p1} /><circle cx="6.8" cy="6.2" r="0.5" fill={p1} />
        </svg>
      </Ly>
      {/* strike: the pawn's capture clangs off */}
      <Ly c="bsp-r-balk" at={d(420)} box={cellh(1, 1)} len={dur(1200)} v={{ "--mx": hx(-1), "--my": -1 }}>
        <Man k="p" pal={IRONB} foe />
      </Ly>
      {/* and so does the knight's */}
      <Ly c="bsp-r-balk" at={d(640)} box={cellh(-1, 2)} len={dur(1200)} v={{ "--mx": hx(1), "--my": -2 }}>
        <Man k="n" pal={IRONB} foe />
      </Ly>
      <Ly c="bsp-glint" at={d(760)} box={cellh(0.3, 0.35, 0.4)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
        </svg>
      </Ly>
      <Ly c="bsp-drift" at={d(800)} box={cellh(0.4, 0.4, 0.16)} len={dur(800)} v={{ "--dx": "220%", "--dy": "calc(var(--fx-side, 1) * -200%)", "--rot": "90deg", background: p0 }} />
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(0, -0.72, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p1} />
      </Ly>
    </HStage>
  );
}

/** Iron Wall: iron plates rise over every piece on the caster's back rank,
 *  the king's square left bare; an enemy rook driving down at them bounces
 *  off, for two turns. */
const IRONW: Palette = ["#5fc9b0", "#ffd76a", "#1c4a3a"];
const BACK_RANK: ManKind[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
function IronWallScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="iron_wall" pal={IRONW} dev="inkpot" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = IRONW;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the back rank */}
        {BACK_RANK.map((k, f) => (
          <Ly key={f} c="bsp-r-hold" at={d(60)} box={sq(f, 1)} len={dur(2140)}>
            <Man k={k} pal={IRONW} />
          </Ly>
        ))}
        {/* strike: a plate rises over each, the king aside */}
        {[0, 1, 2, 3, 5, 6, 7].map((f, i) => (
          <Ly key={`w${f}`} c="bsp-grow" at={d(160 + i * 45)} box={sqs(f, 1, 0.92)} len={dur(1900 - i * 45)} v={{ background: tint(p0, 0.34), border: `2px solid ${p1}` }} />
        ))}
        {/* an enemy rook drives down the file and bounces off */}
        <Ly c="bsp-r-balk" at={d(560)} box={sq(2, 5)} len={dur(1300)} v={{ "--mx": 0, "--my": -3.4 }}>
          <Man k="r" pal={IRONW} foe />
        </Ly>
        <Ly c="bsp-glint" at={d(820)} box={sqs(2, 1.6, 0.45)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
        {/* settle: two turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 46.8, 2)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Kingslide: the king slides four squares down an open line on a pair of
 *  skates, its track behind it, and stops short of the enemy knight it may
 *  not take; once. */
const KSLIDE: Palette = ["#6fd8e8", "#f2fcff", "#173842"];
function KingslideScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="kingslide" pal={KSLIDE} dev="chalice" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = KSLIDE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the enemy knight at the end of the line */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(5, 0)} len={dur(2100)}>
        <Man k="n" pal={KSLIDE} foe />
      </Ly>
      <Ly c="bsp-r-hold" at={d(120)} box={cellh(4, 0)} len={dur(1500)} v={landing(p0)} />
      {/* strike: the skate track and the slide */}
      <Pin box={{ ...cell(0, 0), transform: "scaleX(var(--bsp-hx, 1))" }}>
        <Ly c="bsp-taut" at={d(320)} box={{ left: "50%", top: "86%", width: "400%", height: "10%" }} len={dur(1400)} v={{ background: tint(p1, 0.8) }} />
      </Pin>
      <Ly c="bsp-r-move" at={d(260)} box={cellh(0, 0)} len={dur(1800)} v={{ "--mx": hx(4), "--my": 0 }}>
        <Man k="k" pal={KSLIDE} />
        <svg viewBox="0 0 10 2" className="absolute block" style={{ left: "18%", top: "88%", width: "64%", height: "12%" }} aria-hidden="true">
          <path d="M0.6 1 H8.4 C9.4 1 9.6 0.2 9.2 0" fill="none" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* it cannot take the knight */}
      <Ly c="bsp-facein" at={d(880)} box={cellh(5, 0, 0.7)} len={dur(1000)}>
        <Nope color={p1} />
      </Ly>
      {/* settle: once */}
      <Ly c="bsp-r-gone" at={d(1000)} box={pipsAth(1, -0.3, -0.3)} len={dur(1000)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Mass Recall: lines drop from two empty back-rank squares to two of the
 *  caster's forward pieces and reel them home; a reroll die is spent. */
const MASSREC: Palette = ["#a88cff", "#8fe8ff", "#281a48"];
const MASSREC_P = [
  { f: 1, r: 5, k: "n" as ManKind, to: 1 },
  { f: 5, r: 6, k: "b" as ManKind, to: 1 },
];
function MassRecallScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="mass_recall" pal={MASSREC} dev="torch" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MASSREC;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the empty home squares */}
        {MASSREC_P.map((m) => (
          <Ly key={`h${m.f}`} c="bsp-r-hold" at={d(60)} box={sq(m.f, 1)} len={dur(1940)} v={landing(p1)} />
        ))}
        {/* the recall lines run from home to each piece */}
        {MASSREC_P.map((m) => (
          <Ly key={`l${m.f}`} c="bsp-grow" at={d(160)} box={{ ...area(m.f, 1, 1, m.r), left: `${m.f * 12.5 + 5.9}%`, width: "0.7%" }} len={dur(1000)} v={{ background: tint(p0, 0.8) }} />
        ))}
        {/* strike: both are reeled back */}
        {MASSREC_P.map((m) => (
          <Ly key={`m${m.f}`} c="bsp-r-move" at={d(380)} box={sq(m.f, m.r)} len={dur(1600)} v={{ "--mx": 0, "--my": m.to - m.r }}>
            <Man k={m.k} pal={MASSREC} />
          </Ly>
        ))}
        {MASSREC_P.map((m) => (
          <Ly key={`g${m.f}`} c="bsp-glint" at={d(860)} box={sqs(m.f + 0.25, 1.3, 0.4)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
            </svg>
          </Ly>
        ))}
        {/* settle: a reroll die is spent */}
        <Ly c="bsp-r-gone" at={d(1000)} box={sqs(3, 2, 0.5)} len={dur(1000)}>
          <Die pal={MASSREC} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Minor Recall: from the tray of captured pieces the knight is lifted and set
 *  on the caster's back rank; the rook in the tray is not a minor piece and
 *  stays; once. */
const MINORREC: Palette = ["#7fd8a8", "#fff2c9", "#1c3a2a"];
function MinorRecallScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="minor_recall" pal={MINORREC} dev="candle" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MINORREC;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the captured-pieces tray */}
        <Ly c="bsp-r-hold" at={d(0)} box={{ ...sq(0, 3, 2), height: "12.5%" }} len={dur(2100)} v={{ background: tint(p2, 0.75), border: `2px solid ${p0}` }} />
        <Ly c="bsp-r-hold" at={d(60)} box={sq(1, 3)} len={dur(2040)}>
          <Man k="r" pal={MINORREC} />
        </Ly>
        {/* the rook is not a minor piece */}
        <Ly c="bsp-facein" at={d(760)} box={sqs(1, 3, 0.7)} len={dur(1100)}>
          <Nope color={p1} w={0.9} />
        </Ly>
        {/* strike: the knight is lifted out and set on the back rank */}
        <Ly c="bsp-r-hold" at={d(240)} box={sq(1, 1)} len={dur(1500)} v={landing(p0)} />
        <Ly c="bsp-r-hop" at={d(300)} box={sq(0, 3)} len={dur(1700)} v={{ "--mx": 1, "--my": -2 }}>
          <Man k="n" pal={MINORREC} />
        </Ly>
        <Ly c="bsp-drift" at={d(860)} box={sqs(1, 1, 0.2)} len={dur(800)} v={{ "--dx": "200%", "--dy": "calc(var(--fx-side, 1) * -80%)", "--rot": "0deg", background: tint(p1, 0.8) }} />
        {/* settle: once */}
        <Ly c="bsp-r-gone" at={d(1000)} box={pipsBox(1, 26, 1)} len={dur(1000)}>
          <Pips n={1} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Patch Notes: the notes unroll over the opponent's side, their draft line
 *  is struck out, the three cards they would have seen are pulled, and once
 *  that draft has passed a reroll die comes to the caster. */
const PATCH: Palette = ["#e8dcc0", "#8a6a3a", "#2c3e6b"];
function PatchNotesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="patch_notes" pal={PATCH} dev="coin" fx="edict" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PATCH;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the patch notes unroll */}
        <Ly c="bsp-scroll" at={d(0)} box={area(2, 6, 4, 8)} len={dur(2000)}>
          <svg viewBox="0 0 40 30" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="38" height="28" fill={p0} stroke={p2} strokeWidth="0.8" />
            <rect x="1" y="1" width="38" height="5" fill={p2} />
            <path d="M5 11 H30 M5 17 H34 M5 23 H26" stroke={p1} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* strike: the draft line is struck through */}
        <Ly c="bsp-taut" at={d(320)} box={{ ...area(2, 7, 4, 7), left: "27%", width: "38%", height: "1.4%", marginTop: "5.5%" }} len={dur(1500)} v={{ background: p2 }} />
        {/* their three cards are pulled */}
        {[2.6, 3.6, 4.6].map((f, i) => (
          <Ly key={f} c="bsp-r-move" at={d(360 + i * 60)} box={sqs(f, 5, 0.8)} len={dur(1200)} v={{ "--mx": 0, "--my": 1.2 }}>
            <DraftCard pal={PATCH} tier={i + 1} />
          </Ly>
        ))}
        {/* settle: once it has passed, a reroll for the caster */}
        <Ly c="bsp-turn" at={d(760)} box={sqs(2.5, 2, 0.5)} len={dur(900)}>
          <Glass pal={PATCH} />
        </Ly>
        <Ly c="bsp-rise" at={d(1000)} box={sqs(4, 2, 0.55)} len={dur(1100)}>
          <Die pal={PATCH} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Pawn Nerf: each enemy pawn's two-square arrow snaps in half and only the
 *  one-square stub is left; a pawn crawls its one square. For the game. */
const PAWNNERF: Palette = ["#8a94a8", "#c9cdd6", "#2e3440"];
const DOWN2 = "M5 0.6 V19 M2.6 16.6 L5 19.2 L7.4 16.6";
const DOWN1 = "M5 0.6 V9 M2.6 6.6 L5 9.2 L7.4 6.6";
function PawnNerfScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="pawn_nerf" pal={PAWNNERF} dev="hourglass" fx="chain" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PAWNNERF;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: their pawns and the double steps they had */}
      {[-1, 1].map((x) => (
        <Ly key={`p${x}`} c="bsp-r-hold" at={d(0)} box={cellh(x, 0)} len={dur(2200)}>
          <Man k="p" pal={PAWNNERF} foe />
        </Ly>
      ))}
      {[-1, 0, 1].map((x) => (
        <Pin key={`a${x}`} box={{ ...cellh(x, -1.5, 1), height: `${CELL * 2}%`, top: `calc(${6 * CELL}% + var(--fx-side, 1) * ${1.5 * CELL}%)`, ...FLIP }}>
          <Ly c="bsp-r-gone" at={d(60)} box={{ left: "25%", top: 0, width: "50%", height: "100%" }} len={dur(900)}>
            <svg viewBox="0 0 10 20" className="block h-full w-full" aria-hidden="true">
              <path d={DOWN2} fill="none" stroke={p1} strokeWidth="0.8" {...SJ} />
            </svg>
          </Ly>
        </Pin>
      ))}
      {/* strike: the nerf stamp, and only a one-square stub is left */}
      <Ly c="bsp-stamp" at={d(300)} box={cellh(2, 0.2, 0.55)} len={dur(1300)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={p2} stroke={p1} strokeWidth="0.6" />
          <path d="M2.8 5 H7.2" stroke={p1} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </Ly>
      {[-1, 0, 1].map((x) => (
        <Pin key={`s${x}`} box={{ ...cellh(x, -1), ...FLIP }}>
          <Ly c="bsp-facein" at={d(560)} box={{ left: "25%", top: "-50%", width: "50%", height: "100%" }} len={dur(1200)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={DOWN1} fill="none" stroke={p0} strokeWidth="0.9" {...SJ} />
            </svg>
          </Ly>
        </Pin>
      ))}
      {/* the middle pawn crawls its one square */}
      <Ly c="bsp-r-move" at={d(160)} box={cellh(0, 0)} len={dur(2100)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="p" pal={PAWNNERF} foe />
      </Ly>
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(2, -0.6, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p1} />
      </Ly>
    </HStage>
  );
}

/** Phalanx: round shields lock edge to edge along the caster's pawn line; an
 *  enemy knight leaping at the line is thrown back, for two turns. */
const PHALANX: Palette = ["#c9a84c", "#e8fff7", "#3a3026"];
function PhalanxScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="phalanx" pal={PHALANX} dev="torch" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PHALANX;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the pawn line */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((f) => (
          <Ly key={f} c="bsp-r-hold" at={d(60)} box={sq(f, 2)} len={dur(2140)}>
            <Man k="p" pal={PHALANX} />
          </Ly>
        ))}
        {/* strike: the round shields lock in, left to right, overlapping */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((f) => (
          <Ly key={`s${f}`} c="bsp-close-l" at={d(160 + f * 50)} box={{ ...sqs(f, 2, 0.8), marginTop: "2.6%" }} len={dur(1900 - f * 50)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.2" fill={tint(p0, 0.7)} stroke={p2} strokeWidth="0.6" />
              <circle cx="5" cy="5" r="1.2" fill={p1} stroke={p2} strokeWidth="0.4" />
            </svg>
          </Ly>
        ))}
        {/* an enemy knight leaps at the line and is thrown back */}
        <Ly c="bsp-r-balk" at={d(720)} box={sq(4, 4)} len={dur(1200)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={PHALANX} foe />
        </Ly>
        <Ly c="bsp-glint" at={d(900)} box={sqs(3.3, 2.5, 0.45)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
        {/* settle: two turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 46.8, 3)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Phantom Rook: the chosen empty square waits through the opponent's move,
 *  then a spectral rook fades up there, its outline first; it will be gone
 *  after four of the caster's turns. */
const PHANTOM: Palette = ["#bf5a3a", "#cdd6e0", "#361812"];
function PhantomRookScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="phantom_rook" pal={PHANTOM} dev="weathervane" fx="banner" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PHANTOM;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the chosen square, then the opponent's move */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(0, 0)} len={dur(2000)} v={landing(p1)} />
      <Ly c="bsp-turn" at={d(80)} box={cellh(1, 0.4, 0.45)} len={dur(900)}>
        <Glass pal={PHANTOM} />
      </Ly>
      {/* strike: the outline, then the rook */}
      <Ly c="bsp-facein" at={d(420)} box={cellh(0, 0)} len={dur(900)}>
        <Man k="r" pal={PHANTOM} ghost />
      </Ly>
      <Ly c="bsp-rise" at={d(620)} box={cellh(0, 0)} len={dur(1500)}>
        <Man k="r" pal={PHANTOM} />
      </Ly>
      {[-1, 1].map((s) => (
        <Ly key={s} c="bsp-drift" at={d(720)} box={cellh(0.3 * s, 0.3, 0.2)} len={dur(1100)} v={{ "--dx": `${s * 140}%`, "--dy": "calc(var(--fx-side, 1) * -260%)", "--rot": "0deg", background: tint(p1, 0.7) }} />
      ))}
      {/* settle: four of the caster's turns, then it is gone */}
      <Ly c="bsp-stamp" at={d(1060)} box={pipsAth(4, -0.6, -0.4)} len={dur(900)}>
        <svg viewBox="0 0 16 4" className="block h-full w-full" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={2 + i * 4} cy="2" r="1.35" fill={i === 3 ? "none" : p0} stroke={p1} strokeWidth="0.35" strokeDasharray={i === 3 ? "0.8 0.5" : undefined} />
          ))}
        </svg>
      </Ly>
    </HStage>
  );
}

/** Recast: the caster's next draft card goes back into the mould; the metal
 *  is poured, it comes out a tier higher, and a reroll die is added (it
 *  keeps for two drafts). */
const RECAST: Palette = ["#a880e8", "#ffd23f", "#261644"];
function RecastScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="recast" pal={RECAST} dev="spool" fx="draw" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RECAST;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the mould on the caster's side, and the card at its tier */}
        <Ly c="bsp-r-hold" at={d(0)} box={{ ...sqs(3, 2, 1.1), height: "8%" }} len={dur(2100)} v={{ background: p2, border: `2px solid ${p0}` }} />
        <Ly c="bsp-r-gone" at={d(60)} box={sqs(3, 2, 0.9)} len={dur(900)}>
          <DraftCard pal={RECAST} tier={2} />
        </Ly>
        {/* strike: the ladle pours */}
        <Ly c="bsp-swing" at={d(280)} box={sqs(3.7, 3, 0.7)} len={dur(1100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 3 H6 C6 6 1 6 1 3 Z M6 3.4 L9.4 1" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </Ly>
        {[0, 1, 2].map((i) => (
          <Ly key={i} c="bsp-drift" at={d(420 + i * 70)} box={sqs(3.3, 2.7, 0.18)} len={dur(700)} v={{ "--dx": "0%", "--dy": "calc(var(--fx-side, 1) * 260%)", "--rot": "0deg", background: p1 }} />
        ))}
        {/* it comes out a tier higher */}
        <Ly c="bsp-flip" at={d(700)} box={sqs(3, 2, 0.9)} len={dur(1400)}>
          <DraftCard pal={RECAST} tier={3} />
        </Ly>
        {/* settle: a reroll die, good for two drafts */}
        <Ly c="bsp-rise" at={d(1000)} box={sqs(4.3, 2, 0.5)} len={dur(1100)}>
          <Die pal={RECAST} />
        </Ly>
        <Ly c="bsp-facein" at={d(1100)} box={pipsBox(2, 54.6, 2)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Royal Decree: the decree unrolls under its seal, a queen's crown settles
 *  on the king, and he slides three squares down his file like a queen, for
 *  up to two of his turns. */
const DECREE: Palette = ["#7fc9e8", "#e3f6ff", "#1c3644"];
function RoyalDecreeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="royal_decree" pal={DECREE} dev="crown" fx="glint" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DECREE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the decree unrolls beside the king */}
      <Ly c="bsp-scroll" at={d(0)} box={cellh(-1, 0.6, 0.9)} len={dur(1700)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <rect x="1.6" y="0.6" width="6.8" height="8" fill={p1} stroke={p2} strokeWidth="0.5" />
          <path d="M3 3 H7 M3 4.6 H7 M3 6.2 H5.6" stroke={p2} strokeWidth="0.45" />
          <circle cx="6.8" cy="8.2" r="1.3" fill={p0} stroke={p2} strokeWidth="0.4" />
        </svg>
      </Ly>
      {/* the queen's crown on the king */}
      <Ly c="bsp-facein" at={d(200)} box={cellh(0, 0)} len={dur(800)}>
        <Man k="q" pal={DECREE} ghost />
      </Ly>
      {/* strike: he slides like a queen */}
      <Ly c="bsp-r-hold" at={d(360)} box={cellh(0, 3)} len={dur(1300)} v={landing(p0)} />
      <Ly c="bsp-r-move" at={d(420)} box={cellh(0, 0)} len={dur(1600)} v={{ "--mx": 0, "--my": 3 }}>
        <Man k="k" pal={DECREE} />
      </Ly>
      {/* settle: up to two of his turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(2, 0.4, -0.3)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Royal Duty: a red carpet unrolls from the enemy king's square; only he
 *  may move on their next turn, so he steps down it while their pawn and
 *  knight start and are held. */
const RDUTY: Palette = ["#e0d0a8", "#c94a3a", "#2a3450"];
function RoyalDutyScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="royal_duty" pal={RDUTY} dev="waxseal" fx="edict" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RDUTY;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the carpet unrolls toward the caster from the king */}
        <Ly c="bsp-scroll" at={d(0)} box={{ ...area(4, 6, 1, 8), left: "51.5%", width: "10%" }} len={dur(2200)} v={{ background: tint(p1, 0.7), borderLeft: `2px solid ${p0}`, borderRight: `2px solid ${p0}` }} />
        {/* strike: the king alone steps down it */}
        <Ly c="bsp-r-move" at={d(260)} box={sq(4, 8)} len={dur(1800)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="k" pal={RDUTY} foe />
        </Ly>
        {/* their pawn and knight are held */}
        <Ly c="bsp-r-balk" at={d(520)} box={sq(2, 7)} len={dur(1200)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="p" pal={RDUTY} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(640)} box={sq(6, 8)} len={dur(1200)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={RDUTY} foe />
        </Ly>
        {[{ f: 2, r: 6 }, { f: 5, r: 6 }].map((s, i) => (
          <Ly key={s.f} c="bsp-facein" at={d(840 + i * 80)} box={sqs(s.f, s.r, 0.6)} len={dur(1000)}>
            <Nope color={p1} w={0.9} />
          </Ly>
        ))}
        {/* settle: their next turn */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(1, 48.4, 5)} len={dur(900)}>
          <Pips n={1} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Scout: the spyglass draws out toward the next draft; both offered cards
 *  come back to the caster instead of one, and a reroll die is spent. */
const SCOUT: Palette = ["#5a6b8f", "#cdd6ff", "#161e33"];
function ScoutScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="scout" pal={SCOUT} dev="lantern" fx="gaze" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SCOUT;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the spyglass draws out */}
      <Pin box={{ ...cell(0, 0.4), transform: "scaleX(var(--bsp-hx, 1))" }}>
      <Ly c="bsp-unfurl" at={d(0)} box={{ left: 0, top: "25%", width: "220%", height: "50%" }} len={dur(1600)}>
        <svg viewBox="0 0 22 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 1.6 H7 V3.4 H0.6 Z" fill={p0} stroke={p2} strokeWidth="0.4" />
          <path d="M7 1.1 H14 V3.9 H7 Z" fill={p1} stroke={p2} strokeWidth="0.4" />
          <path d="M14 0.5 H21.4 V4.5 H14 Z" fill={p0} stroke={p2} strokeWidth="0.4" />
        </svg>
      </Ly>
      </Pin>
      {/* the two cards of the offer */}
      <Ly c="bsp-r-move" at={d(300)} box={{ ...cellh(2.6, 1.5), width: `${CELL * 0.7}%` }} len={dur(1700)} v={{ "--mx": hx(-3.6), "--my": -1.4 }}>
        <DraftCard pal={SCOUT} tier={1} />
      </Ly>
      <Ly c="bsp-r-move" at={d(380)} box={{ ...cellh(3.4, 1.5), width: `${CELL * 0.7}%` }} len={dur(1700)} v={{ "--mx": hx(-3.6), "--my": -1.4 }}>
        <DraftCard pal={SCOUT} tier={2} />
      </Ly>
      {/* strike: both come in, a glint where they land */}
      <Ly c="bsp-glint" at={d(900)} box={cellh(-0.6, 0.1, 0.5)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
        </svg>
      </Ly>
      {/* settle: a reroll die is spent; the offer keeps for two drafts */}
      <Ly c="bsp-r-gone" at={d(1000)} box={cellh(1, -0.6, 0.5)} len={dur(1000)}>
        <Die pal={SCOUT} />
      </Ly>
      <Ly c="bsp-facein" at={d(1060)} box={pipsAth(2, -1.1, -0.6)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Sealed Gate: an arch stands on the chosen square. The first enemy knight
 *  to reach its file goes through freely; the instant it does, bricks close
 *  the whole file and the enemy rook behind it is turned back, for three of
 *  their turns. */
const SEALG: Palette = ["#d1a85a", "#fff2c9", "#3d3220"];
function SealedGateScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="sealed_gate" pal={SEALG} dev="hourglass" fx="lock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SEALG;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the arch on the chosen square */}
      <Ly c="bsp-grow" at={d(0)} box={cellh(0, 0)} len={dur(2100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 10 V3.6 C0.6 -0.4 9.4 -0.4 9.4 3.6 V10 H7.4 V4.4 C7.4 1.6 2.6 1.6 2.6 4.4 V10 Z" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      {/* the first enemy onto the file passes freely */}
      <Ly c="bsp-r-hop" at={d(200)} box={cellh(1, 2)} len={dur(1200)} v={{ "--mx": hx(-1), "--my": -2 }}>
        <Man k="n" pal={SEALG} foe />
      </Ly>
      {/* strike: bricks close the whole file */}
      <Ly c="bsp-grow" at={d(720)} box={{ left: `${6.5 * CELL + CELL * 0.1}%`, width: `${CELL * 0.8}%`, top: `${3.5 * CELL}%`, height: `${7 * CELL}%` }} len={dur(1500)}>
        <svg viewBox="0 0 8 70" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <rect x="0.4" y="0" width="7.2" height="70" fill={tint(p0, 0.5)} stroke={p2} strokeWidth="0.4" />
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d={`M0.4 ${5 + i * 5} H7.6 M${i % 2 ? 2.4 : 5.2} ${i * 5} V${5 + i * 5}`} stroke={p2} strokeWidth="0.35" />
          ))}
        </svg>
      </Ly>
      {/* the rook behind it is turned back */}
      <Ly c="bsp-r-balk" at={d(900)} box={cellh(2, 1)} len={dur(1100)} v={{ "--mx": hx(-2), "--my": 0 }}>
        <Man k="r" pal={SEALG} foe />
      </Ly>
      <Ly c="bsp-facein" at={d(1000)} box={cellh(0, 1, 0.6)} len={dur(900)}>
        <Nope color={p1} />
      </Ly>
      {/* settle: three of their turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, 1, -0.6)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Seelie Blessing: the ice on the caster's piece melts and runs off, a
 *  circlet of blossoms settles on it, and the enemy pawn reaching to take it
 *  is turned away, for three of their turns. */
const SEELIE: Palette = ["#559f55", "#c0e57f", "#1a3d1a"];
function SeelieBlessingScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="seelie_blessing" pal={SEELIE} dev="thorn" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SEELIE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the piece, still iced over */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(0, 0)} len={dur(2200)}>
        <Man k="n" pal={SEELIE} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0, 0.96)} len={dur(900)} v={{ background: tint(p1, 0.3), border: `2px solid ${tint(p1, 0.8)}` }} />
      {[-1, 1].map((s) => (
        <Ly key={s} c="bsp-drift" at={d(360)} box={cellh(0.25 * s, -0.3, 0.16)} len={dur(900)} v={{ "--dx": `${s * 60}%`, "--dy": "calc(var(--fx-side, 1) * 300%)", "--rot": "0deg", background: tint(p1, 0.8) }} />
      ))}
      {/* strike: the circlet of blossoms settles on it */}
      <Ly c="bsp-drop" at={d(380)} box={cellh(0, 0.34, 0.72)} len={dur(1700)}>
        <svg viewBox="0 0 10 5" className="block h-full w-full" aria-hidden="true">
          <path d="M1 3 C3 4.6 7 4.6 9 3" fill="none" stroke={p0} strokeWidth="0.6" />
          {[1.4, 3.2, 5, 6.8, 8.6].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 3.9 : 3.1} r="0.8" fill={i % 2 ? p1 : SHINE} stroke={p2} strokeWidth="0.25" />
          ))}
        </svg>
      </Ly>
      {/* the enemy pawn reaching for it is turned away */}
      <Ly c="bsp-r-balk" at={d(700)} box={cellh(1, 1)} len={dur(1200)} v={{ "--mx": hx(-1), "--my": -1 }}>
        <Man k="p" pal={SEELIE} foe />
      </Ly>
      {/* settle: three of their turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, -0.6, -0.6)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Solstice: the midsummer sun stands over the caster's side, and on the
 *  longest day every piece takes one step it never could: the bishop steps
 *  straight, the rook steps diagonally, the knight steps one square aside.
 *  For the caster's next turn. */
const SOLSTICE: Palette = ["#b5533a", "#fff2c9", "#33170f"];
function SolsticeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="solstice" pal={SOLSTICE} dev="helm" fx="muster" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SOLSTICE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the sun at its height */}
      <Ly c="bsp-rise" at={d(0)} box={cellh(1.5, 2.4, 1.1)} len={dur(2100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="2.2" fill={p1} stroke={p0} strokeWidth="0.5" />
          <path d="M5 0.6 V1.8 M5 8.2 V9.4 M0.6 5 H1.8 M8.2 5 H9.4 M1.9 1.9 L2.7 2.7 M7.3 7.3 L8.1 8.1 M8.1 1.9 L7.3 2.7 M2.7 7.3 L1.9 8.1" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* strike: the bishop steps straight */}
      <Ly c="bsp-r-move" at={d(340)} box={cellh(2, 0)} len={dur(1600)} v={{ "--mx": 0, "--my": 1 }}>
        <Man k="b" pal={SOLSTICE} />
      </Ly>
      {/* the rook steps diagonally */}
      <Ly c="bsp-r-move" at={d(440)} box={cellh(0, 0)} len={dur(1600)} v={{ "--mx": hx(1), "--my": 1 }}>
        <Man k="r" pal={SOLSTICE} />
      </Ly>
      {/* the knight steps one square aside */}
      <Ly c="bsp-r-move" at={d(540)} box={cellh(3, 0)} len={dur(1600)} v={{ "--mx": hx(1), "--my": 0 }}>
        <Man k="n" pal={SOLSTICE} />
      </Ly>
      {[[2, 1], [1, 1], [4, 0]].map(([x, y]) => (
        <Ly key={`l${x}`} c="bsp-r-hold" at={d(260)} box={cellh(x, y)} len={dur(1500)} v={landing(p0)} />
      ))}
      {[-1, 1].map((s) => (
        <Ly key={`m${s}`} c="bsp-drift" at={d(200)} box={cellh(1.5 + s * 0.3, 2.4, 0.16)} len={dur(1200)} v={{ "--dx": `${s * 260}%`, "--dy": "calc(var(--fx-side, 1) * 400%)", "--rot": "0deg", background: tint(p1, 0.9) }} />
      ))}
      {/* settle: for the caster's next turn */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(1, -0.3, -0.6)} len={dur(900)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Stone Clergy: the enemy bishops turn to walnuts. The first keeps one free
 *  move and slides its long diagonal before its shell closes; the other,
 *  already a walnut, can only shuffle one square. Three of their turns. */
const CLERGY: Palette = ["#9a8f8a", "#c9b89a", "#3a322c"];
function StoneClergyScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="stone_clergy" pal={CLERGY} dev="waxseal" fx="stone" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CLERGY;
  const d = (n: number) => dm(delayMs, n);
  const shell = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 0.8 C8.4 0.8 9.4 4 9.4 5.6 C9.4 8 7.4 9.4 5 9.4 C2.6 9.4 0.6 8 0.6 5.6 C0.6 4 1.6 0.8 5 0.8 Z" fill={tint(p0, 0.5)} stroke={p2} strokeWidth="0.5" />
      <path d="M5 1 V9.2 M3 3 C4 4 3 5 4 6.4 M7 3 C6 4 7 5 6 6.4" fill="none" stroke={p2} strokeWidth="0.4" />
    </svg>
  );
  return (
    <HStage>
      {/* tell: the first bishop's one free move */}
      <Ly c="bsp-r-move" at={d(0)} box={cellh(1, 0)} len={dur(1300)} v={{ "--mx": hx(2), "--my": -2 }}>
        <Man k="b" pal={CLERGY} foe />
      </Ly>
      {/* strike: its shell closes where it stops */}
      <Ly c="bsp-r-strain" at={d(820)} box={cellh(3, -2)} len={dur(1400)}>
        <Man k="b" pal={CLERGY} foe />
      </Ly>
      <Ly c="bsp-settle" at={d(700)} box={cellh(3, -2, 1.05)} len={dur(1500)}>
        {shell}
      </Ly>
      {/* the other, in its walnut, shuffles a single square */}
      <Ly c="bsp-r-move" at={d(300)} box={cellh(0, 2)} len={dur(1900)} v={{ "--mx": hx(1), "--my": -1 }}>
        <Man k="b" pal={CLERGY} foe />
        <span className="absolute inset-0 block">{shell}</span>
      </Ly>
      <Ly c="bsp-facein" at={d(600)} box={cellh(2, 0, 0.6)} len={dur(1000)}>
        <Nope color={p1} w={0.9} />
      </Ly>
      {/* settle: three of their turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, 0.6, 1.3)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Summon Knight: the horn sounds and a new knight gallops in from the edge
 *  to the chosen empty square, kicking up dust; once. */
const SUMMONK: Palette = ["#d1583a", "#dfe5ee", "#3a1a10"];
function SummonKnightScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="summon_knight" pal={SUMMONK} dev="warhorn" fx="banner" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SUMMONK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the horn, and the chosen square */}
      <Ly c="bsp-swing" at={d(0)} box={cellh(-1.2, 1, 0.8)} len={dur(1300)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 7 C3 7 6 5 8.6 1.6 L9.4 3.2 C8 6.4 5 8.6 1 8.6 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M0.6 6.8 V8.8" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-r-hold" at={d(100)} box={cellh(0, 0)} len={dur(1500)} v={landing(p0)} />
      {/* strike: the knight gallops in from the edge */}
      <Ly c="bsp-r-move" at={d(300)} box={cellh(-3, 0)} len={dur(1800)} v={{ "--mx": hx(3), "--my": 0 }}>
        <Man k="n" pal={SUMMONK} />
      </Ly>
      {[0, 1].map((i) => (
        <Ly key={i} c="bsp-drift" at={d(780 + i * 60)} box={cellh(-0.3, -0.35, 0.2)} len={dur(900)} v={{ "--dx": `${-160 - i * 80}%`, "--dy": `${-60 - i * 40}%`, "--rot": "40deg", background: tint(p1, 0.8) }} />
      ))}
      {/* settle: once */}
      <Ly c="bsp-r-gone" at={d(1000)} box={pipsAth(1, -0.3, -0.6)} len={dur(1000)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Timely Lull: a crescent moon hangs over the board and both sides' nerf
 *  shackles spring open together, for three turns each; it costs the caster
 *  no move. */
const LULL: Palette = ["#ffd76a", "#fff7de", "#8a6a3a"];
function TimelyLullScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="timely_lull" pal={LULL} dev="beehive" fx="bell" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LULL;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the lull, a crescent and its drowsy z's */}
        <Ly c="bsp-facein" at={d(0)} box={sqs(6.2, 4.5, 0.9)} len={dur(2100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M6.6 1 C3 1.4 1.4 4 1.8 6.4 C2.4 9 5.6 9.8 8 8.4 C5.2 8.2 3.6 5.8 4.4 3.4 C4.8 2.2 5.6 1.4 6.6 1 Z" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />
          </svg>
        </Ly>
        <Ly c="bsp-lift" at={d(160)} box={sqs(5.4, 5.2, 0.5)} len={dur(1600)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 2 H6 L2 6 H6 M6 5 H9 L6 8 H9" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
          </svg>
        </Ly>
        {/* strike: both shackles spring open */}
        {[2, 7].map((r) => (
          <Ly key={`c${r}`} c="bsp-r-gone" at={d(300)} box={{ ...sqs(3.5, r, 0.9), height: "6%" }} len={dur(800)}>
            <Shackle pal={LULL} />
          </Ly>
        ))}
        {[2, 7].map((r) => (
          <Ly key={`o${r}`} c="bsp-facein" at={d(640)} box={{ ...sqs(3.5, r, 0.9), height: "6%" }} len={dur(1300)}>
            <Shackle pal={LULL} open />
          </Ly>
        ))}
        {/* both sides' nerfed pieces move freely again */}
        <Ly c="bsp-r-move" at={d(760)} box={sq(0, 1)} len={dur(1300)} v={{ "--mx": 0, "--my": 2 }}>
          <Man k="r" pal={LULL} />
        </Ly>
        <Ly c="bsp-r-move" at={d(820)} box={sq(7, 8)} len={dur(1300)} v={{ "--mx": 0, "--my": -2 }}>
          <Man k="r" pal={LULL} foe />
        </Ly>
        {/* settle: three turns on each side */}
        {[2, 7].map((r) => (
          <Ly key={`p${r}`} c="bsp-stamp" at={d(1000)} box={pipsBox(3, 45.2, r - 1)} len={dur(900)}>
            <Pips n={3} fill={p0} stroke={p2} />
          </Ly>
        ))}
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Total Recall: a magnet at the caster's home edge pulls every piece past
 *  the 4th rank back to the 3rd; the one whose 3rd-rank square is taken stays
 *  where it is; a reroll die is spent. */
const TOTALREC: Palette = ["#8468f0", "#c9f4ff", "#1a0f38"];
const TOTALREC_P = [
  { f: 1, r: 6, k: "n" as ManKind },
  { f: 3, r: 7, k: "q" as ManKind },
  { f: 5, r: 5, k: "b" as ManKind },
];
function TotalRecallScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="total_recall" pal={TOTALREC} dev="spool" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TOTALREC;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the magnet, and the 4th-rank line */}
        <Ly c="bsp-rise" at={d(0)} box={sqs(3.5, 1, 0.9)} len={dur(2000)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 1 V5.4 C1.6 10 8.4 10 8.4 5.4 V1 H6 V5.4 C6 7 4 7 4 5.4 V1 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            <path d="M1.6 1 H4 V2.6 H1.6 Z M6 1 H8.4 V2.6 H6 Z" fill={p1} />
          </svg>
        </Ly>
        <Ly c="bsp-r-hold" at={d(60)} box={{ left: 0, width: "100%", top: lineTop(4, 0.8), height: "0.8%" }} len={dur(1900)} v={{ background: tint(p1, 0.7) }} />
        {/* strike: each is pulled back to the 3rd rank */}
        {TOTALREC_P.map((m, i) => (
          <Ly key={m.f} c="bsp-r-move" at={d(280 + i * 60)} box={sq(m.f, m.r)} len={dur(1700)} v={{ "--mx": 0, "--my": 3 - m.r }}>
            <Man k={m.k} pal={TOTALREC} />
          </Ly>
        ))}
        {/* the rook whose 3rd-rank square is taken stays put */}
        <Ly c="bsp-r-hold" at={d(100)} box={sq(6, 3)} len={dur(1900)}>
          <Man k="p" pal={TOTALREC} />
        </Ly>
        <Ly c="bsp-r-balk" at={d(340)} box={sq(6, 6)} len={dur(1600)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="r" pal={TOTALREC} />
        </Ly>
        {/* settle: a reroll die is spent */}
        <Ly c="bsp-r-gone" at={d(1000)} box={sqs(0.5, 2, 0.5)} len={dur(1000)}>
          <Die pal={TOTALREC} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Twin Knights: under the crescent both knights become nightriders, each
 *  carrying its leap on in the same direction for a second jump in one move;
 *  for the game. */
const TWINK: Palette = ["#9a7a4a", "#e0d0b0", "#332918"];
function TwinKnightsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="twin_knights" pal={TWINK} dev="beehive" fx="leap" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TWINK;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the crescent over the pair */}
      <Ly c="bsp-facein" at={d(0)} box={cellh(0, 2, 0.7)} len={dur(1900)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M6.6 1 C3 1.4 1.4 4 1.8 6.4 C2.4 9 5.6 9.8 8 8.4 C5.2 8.2 3.6 5.8 4.4 3.4 C4.8 2.2 5.6 1.4 6.6 1 Z" fill={p1} stroke={p2} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      {/* strike: each knight leaps, and leaps again the same way */}
      <Ly c="bsp-r-hop" at={d(260)} box={cellh(-1, 0)} len={dur(900)} v={{ "--mx": hx(-1), "--my": 2 }}>
        <Man k="n" pal={TWINK} />
      </Ly>
      <Ly c="bsp-r-hop" at={d(320)} box={cellh(1, 0)} len={dur(900)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="n" pal={TWINK} />
      </Ly>
      {[-1, 1].map((s, i) => (
        <Ly key={`b${s}`} c="bsp-r-hop" at={d(660 + i * 60)} box={cellh(2 * s, 2)} len={dur(1300)} v={{ "--mx": hx(s), "--my": 2 }}>
          <Man k="n" pal={TWINK} />
        </Ly>
      ))}
      {[-1, 1].map((s) => (
        <Ly key={`l${s}`} c="bsp-r-hold" at={d(500)} box={cellh(3 * s, 4)} len={dur(1300)} v={landing(p0)} />
      ))}
      {[-1, 1].map((s) => (
        <Ly key={`d${s}`} c="bsp-drift" at={d(1000)} box={cellh(3 * s, 3.6, 0.2)} len={dur(800)} v={{ "--dx": `${s * 160}%`, "--dy": "calc(var(--fx-side, 1) * 60%)", "--rot": "0deg", background: tint(p1, 0.8) }} />
      ))}
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(0, -0.6, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p1} />
      </Ly>
    </HStage>
  );
}

/** Twist the Knife: the enemy bishop takes the caster's pawn; a knife drives
 *  in beside it and twists, and the capturer is frozen for a turn. Three of
 *  their captures' worth. */
const TWIST: Palette = ["#9fd8ff", "#e8f8ff", "#2c5a80"];
function TwistTheKnifeScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="twist_the_knife" pal={TWIST} dev="hand_bell" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = TWIST;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: their capture */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(900)}>
        <Man k="p" pal={TWIST} />
      </Ly>
      <Ly c="bsp-r-move" at={d(40)} box={cellh(2, 2)} len={dur(900)} v={{ "--mx": hx(-2), "--my": -2 }}>
        <Man k="b" pal={TWIST} foe />
      </Ly>
      <Ly c="bsp-r-strain" at={d(700)} box={cellh(0, 0)} len={dur(1500)}>
        <Man k="b" pal={TWIST} foe />
      </Ly>
      {/* strike: the knife drives in and twists */}
      <Pin box={{ ...cellh(0.5, 0.35, 0.7), transform: "rotate(-30deg)" }}>
        <Ly c="bsp-turn" at={d(520)} box={{ left: 0, top: 0, width: "100%", height: "100%" }} len={dur(1400)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L6.2 2.4 V6.4 H3.8 V2.4 Z" fill={SHINE} stroke={p2} strokeWidth="0.4" {...SJ} />
            <path d="M2.6 6.4 H7.4 M5 6.6 V9.4" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </Ly>
      </Pin>
      {/* the capturer freezes */}
      <Ly c="bsp-close-l" at={d(820)} box={{ ...cellh(0, 0), width: `${CELL / 2}%` }} len={dur(1300)} v={{ background: tint(p0, 0.42), borderLeft: `2px solid ${p1}` }} />
      <Ly c="bsp-close-r" at={d(820)} box={{ ...cellh(0.5, 0), width: `${CELL / 2}%` }} len={dur(1300)} v={{ background: tint(p1, 0.36), borderRight: `2px solid ${p1}` }} />
      {/* settle: three of their captures */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, -0.5, -0.6)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Bind the Queen: a runed chain loops round the enemy queen and every piece
 *  beside her; the three of them strain in it, while their bishop outside the
 *  loop moves freely. Two of their turns. */
const BINDQ: Palette = ["#7fd8d8", "#eef8ff", "#1c4a52"];
const BINDQ_HELD = [
  { f: 3, r: 7, k: "q" as ManKind },
  { f: 2, r: 7, k: "n" as ManKind },
  { f: 4, r: 6, k: "p" as ManKind },
];
function BindTheQueenScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_bind_the_queen" pal={BINDQ} dev="keystone" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BINDQ;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the queen and her neighbours */}
        {BINDQ_HELD.map((m) => (
          <Ly key={`${m.f}${m.r}`} c="bsp-r-strain" at={d(0)} box={sq(m.f, m.r)} len={dur(2200)}>
            <Man k={m.k} pal={BINDQ} foe />
          </Ly>
        ))}
        {/* strike: the runed chain closes round all of them */}
        <Ly c="bsp-spoke" at={d(240)} box={area(2, 6, 3, 8)} len={dur(1800)}>
          <svg viewBox="0 0 30 30" className="block h-full w-full" aria-hidden="true">
            <rect x="1.6" y="1.6" width="26.8" height="26.8" rx="4" fill="none" stroke={p1} strokeWidth="1.3" strokeDasharray="2.2 1.2" />
            <path d="M15 0.4 L16.6 2.4 L15 4.4 L13.4 2.4 Z M15 25.6 L16.6 27.6 L15 29.6 L13.4 27.6 Z M0.4 15 L2.4 13.4 L4.4 15 L2.4 16.6 Z M25.6 15 L27.6 13.4 L29.6 15 L27.6 16.6 Z" fill={p0} stroke={p2} strokeWidth="0.4" />
          </svg>
        </Ly>
        {/* the bishop outside the loop goes free */}
        <Ly c="bsp-r-move" at={d(560)} box={sq(6, 7)} len={dur(1600)} v={{ "--mx": 1, "--my": -1 }}>
          <Man k="b" pal={BINDQ} foe />
        </Ly>
        <Ly c="bsp-facein" at={d(800)} box={sqs(3, 5, 0.6)} len={dur(1000)}>
          <Nope color={p1} w={0.9} />
        </Ly>
        {/* settle: two of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 34.3, 5)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Blink: an eye opens over the king and over his bishop, and in the blink
 *  they have traded squares; once. */
const BLINK: Palette = ["#a88cff", "#8fe8ff", "#281a48"];
function BlinkScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_blink" pal={BLINK} dev="coin" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BLINK;
  const d = (n: number) => dm(delayMs, n);
  const eye = (
    <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
      <path d="M0.6 3 C3 -0.4 7 -0.4 9.4 3 C7 6.4 3 6.4 0.6 3 Z" fill={p2} stroke={p1} strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="3" r="1.3" fill={p0} />
    </svg>
  );
  return (
    <HStage>
      {/* tell: the king and the bishop he will trade with */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(900)}>
        <Man k="k" pal={BLINK} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(2, 1)} len={dur(900)}>
        <Man k="b" pal={BLINK} />
      </Ly>
      {/* strike: the blink over each */}
      {[[0, 0], [2, 1]].map(([x, y]) => (
        <Ly key={`e${x}`} c="bsp-blink" at={d(220)} box={{ ...cellh(x, y + 0.5, 0.7), height: `${CELL * 0.42}%` }} len={dur(1000)}>
          {eye}
        </Ly>
      ))}
      {[[0, 0], [2, 1]].map(([x, y]) => (
        <Ly key={`g${x}`} c="bsp-glint" at={d(560)} box={cellh(x + 0.3, y + 0.3, 0.4)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
      ))}
      <Ly c="bsp-drift" at={d(600)} box={cellh(1, 0.5, 0.16)} len={dur(800)} v={{ "--dx": "0%", "--dy": "calc(var(--fx-side, 1) * -200%)", "--rot": "0deg", background: tint(p0, 0.8) }} />
      {/* and they stand on each other's squares */}
      <Ly c="bsp-facein" at={d(640)} box={cellh(2, 1)} len={dur(1500)}>
        <Man k="k" pal={BLINK} />
      </Ly>
      <Ly c="bsp-facein" at={d(640)} box={cellh(0, 0)} len={dur(1500)}>
        <Man k="b" pal={BLINK} />
      </Ly>
      {/* settle: once */}
      <Ly c="bsp-r-gone" at={d(1000)} box={pipsAth(1, -0.3, -0.6)} len={dur(1000)}>
        <Pips n={1} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Borrowed Minute: the pocket watch opens and a loan tag is tied to the enemy
 *  knight; it turns to the caster's side and fights for two turns, then walks
 *  back to where it came from. */
const BORROW: Palette = ["#d1aa5a", "#7fd8e8", "#3c3120"];
function BorrowedMinuteScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_borrowed_minute" pal={BORROW} dev="compass" fx="clock" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BORROW;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the watch, its minute hand going round */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(-1.3, 0.3, 0.8)} len={dur(2200)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5.6" r="3.8" fill={p1} stroke={p2} strokeWidth="0.6" />
          <path d="M5 1.8 V0.6 M4 0.6 H6" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      <Ly c="bsp-turn" at={d(80)} box={{ ...cellh(-1.3, 0.3, 0.8), marginTop: `${CELL * 0.05}%` }} len={dur(1500)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5.6 V2.6" stroke={p2} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* the enemy knight turns, a loan tag on it */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(800)}>
        <Man k="n" pal={BORROW} foe />
      </Ly>
      {/* strike: it fights for the caster */}
      <Ly c="bsp-r-hop" at={d(380)} box={cellh(0, 0)} len={dur(1500)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="n" pal={BORROW} />
        <svg viewBox="0 0 10 10" className="absolute block" style={{ left: "58%", top: "8%", width: "38%", height: "38%" }} aria-hidden="true">
          <path d="M0.6 4 L3.4 1 H9.4 V7 H3.4 Z" fill={p0} stroke={p2} strokeWidth="0.6" {...SJ} />
          <circle cx="3.2" cy="4" r="0.8" fill={p2} />
        </svg>
      </Ly>
      <Ly c="bsp-stamp" at={d(700)} box={pipsAth(2, 0.8, 1.4)} len={dur(900)}>
        <Pips n={2} fill={p0} stroke={p2} />
      </Ly>
      {/* settle: where it walks back to */}
      <Ly c="bsp-facein" at={d(1040)} box={cellh(0, 0)} len={dur(1000)}>
        <Man k="n" pal={BORROW} foe ghost />
      </Ly>
    </HStage>
  );
}

/** Conjured Bishop: a mirror line runs down the middle of the board, the
 *  bishop's reflection crosses it along the rank, and a new bishop stands on
 *  the mirror square. */
const CONJUREB: Palette = ["#8a6a3a", "#ff9dd6", "#2e2214"];
function ConjureBishopScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_conjure_bishop" pal={CONJUREB} dev="beehive" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CONJUREB;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the bishop and the mirror line down the middle */}
        <Ly c="bsp-r-hold" at={d(0)} box={sq(2, 1)} len={dur(2200)}>
          <Man k="b" pal={CONJUREB} />
        </Ly>
        <Ly c="bsp-grow" at={d(60)} box={{ left: "49.5%", width: "1%", top: 0, height: "100%" }} len={dur(1900)} v={{ background: tint(p1, 0.8) }} />
        {/* strike: the reflection crosses along the rank */}
        <Ly c="bsp-taut" at={d(300)} box={{ ...sq(2.5, 1, 3), height: "1%", marginTop: "5.75%" }} len={dur(1200)} v={{ background: `repeating-linear-gradient(90deg, ${p1} 0 6px, transparent 6px 10px)` }} />
        <Ly c="bsp-r-move" at={d(320)} box={sq(2, 1)} len={dur(1000)} v={{ "--mx": 3, "--my": 0 }}>
          <Man k="b" pal={CONJUREB} ghost />
        </Ly>
        {/* and stands there as a new bishop */}
        <Ly c="bsp-rise" at={d(720)} box={sq(5, 1)} len={dur(1500)}>
          <Man k="b" pal={CONJUREB} />
        </Ly>
        {/* settle: a glint off the glass */}
        <Ly c="bsp-glint" at={d(1000)} box={sqs(3.5, 2, 0.4)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p0} stroke={p2} strokeWidth="0.3" />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Dominate: a puppeteer's cross comes down over the enemy bishop, its
 *  strings take hold, the bishop turns and moves for the caster, for two of
 *  the caster's turns. */
const DOMINATE: Palette = ["#5b4a9f", "#e8ddff", "#0e0c1c"];
function DominateScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_dominate_minor" pal={DOMINATE} dev="ledger" fx="ink" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DOMINATE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the enemy bishop */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(900)}>
        <Man k="b" pal={DOMINATE} foe />
      </Ly>
      {/* strike: the cross and strings come down and it turns */}
      <Ly c="bsp-drop" at={d(80)} box={{ ...cellh(0, 0), top: `calc(${cellh(0, 0).top} - ${CELL * 1.1}%)`, height: `${CELL * 1.3}%` }} len={dur(900)}>
        <svg viewBox="0 0 10 13" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 1.6 H8.6 M5 0.4 V3" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M1.8 1.6 L3.6 10 M8.2 1.6 L6.4 10 M5 3 V8" stroke={tint(p1, 0.7)} strokeWidth="0.3" />
        </svg>
      </Ly>
      {/* it moves for the caster, strings and all */}
      <Ly c="bsp-r-move" at={d(460)} box={cellh(0, 0)} len={dur(1700)} v={{ "--mx": hx(2), "--my": -2 }}>
        <Man k="b" pal={DOMINATE} />
        <svg viewBox="0 0 10 13" className="absolute block" style={{ left: 0, top: "-110%", width: "100%", height: "130%" }} aria-hidden="true">
          <path d="M1.4 1.6 H8.6 M5 0.4 V3" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M1.8 1.6 L3.6 10 M8.2 1.6 L6.4 10 M5 3 V8" stroke={tint(p1, 0.7)} strokeWidth="0.3" />
        </svg>
      </Ly>
      <Ly c="bsp-r-hold" at={d(520)} box={cellh(2, -2)} len={dur(1300)} v={landing(p0)} />
      {/* settle: two of the caster's turns, then it goes back */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(2, 1.8, -2.6)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Mind Read: an eye opens over the opponent's side and reads their next
 *  pick; the buff they draft arrives blank, and their reroll die slides off
 *  the board. */
const MINDREAD: Palette = ["#7b8fd1", "#f0f4ff", "#232e52"];
function MindReadScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_mind_read" pal={MINDREAD} dev="quill" fx="gaze" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = MINDREAD;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the eye opens over their side */}
        <Ly c="bsp-blink" at={d(0)} box={{ ...sqs(3.5, 6, 1.3), height: "9%" }} len={dur(1500)}>
          <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 3 C3 -0.4 7 -0.4 9.4 3 C7 6.4 3 6.4 0.6 3 Z" fill={p2} stroke={p1} strokeWidth="0.5" {...SJ} />
            <circle cx="5" cy="3" r="1.4" fill={p0} />
          </svg>
        </Ly>
        {/* strike: the card they draft comes in and turns blank */}
        <Ly c="bsp-r-move" at={d(300)} box={sqs(3.5, 8, 0.9)} len={dur(900)} v={{ "--mx": 0, "--my": -0.6 }}>
          <DraftCard pal={MINDREAD} tier={2} />
        </Ly>
        <Ly c="bsp-flip" at={d(760)} box={sqs(3.5, 7.4, 0.9)} len={dur(1400)}>
          <DraftCard pal={MINDREAD} tier={2} blank />
        </Ly>
        {/* their reroll die slides off the edge */}
        <Ly c="bsp-r-move" at={d(520)} box={sqs(6.6, 8, 0.5)} len={dur(1300)} v={{ "--mx": 3, "--my": 0 }}>
          <Die pal={MINDREAD} />
        </Ly>
        <Ly c="bsp-lift" at={d(420)} box={sqs(3.5, 6.6, 0.6)} len={dur(1100)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 8 C3 6 1 5 2 3 M5 8 C6 6 4 5 5 3 M8 8 C9 6 7 5 8 3" fill="none" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* settle: a glint where the pick was read */}
        <Ly c="bsp-glint" at={d(1000)} box={sqs(3.5, 7, 0.4)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Sigil Ward: a six-pointed sigil is drawn under the caster's piece and it
 *  is warded; the first enemy knight to land beside it is caught in ice for
 *  two of its turns. The ward holds three of their turns. */
const SIGILW: Palette = ["#5fc9b0", "#e3d0ff", "#1c3a40"];
function SigilWardScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_sigil_ward" pal={SIGILW} dev="hourglass" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SIGILW;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the sigil drawn under the piece */}
      <Ly c="bsp-settle" at={d(0)} box={cellh(0, 0, 1.3)} len={dur(2100)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L8.6 7.1 H1.4 Z M5 9.2 L1.4 2.9 H8.6 Z" fill="none" stroke={p0} strokeWidth="0.45" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-r-hold" at={d(60)} box={cellh(0, 0)} len={dur(2100)}>
        <Man k="b" pal={SIGILW} />
      </Ly>
      <Ly c="bsp-facein" at={d(240)} box={cellh(-0.4, 0.3, 0.45)} len={dur(1600)}>
        <Ward pal={SIGILW} />
      </Ly>
      {/* strike: an enemy knight lands beside it */}
      <Ly c="bsp-r-hop" at={d(440)} box={cellh(2, 3)} len={dur(900)} v={{ "--mx": hx(-1), "--my": -2 }}>
        <Man k="n" pal={SIGILW} foe />
      </Ly>
      <Ly c="bsp-r-strain" at={d(900)} box={cellh(1, 1)} len={dur(1300)}>
        <Man k="n" pal={SIGILW} foe />
      </Ly>
      <Ly c="bsp-close-l" at={d(900)} box={{ ...cellh(1, 1), width: `${CELL / 2}%` }} len={dur(1300)} v={{ background: tint(p1, 0.4), borderLeft: `2px solid ${p1}` }} />
      <Ly c="bsp-close-r" at={d(900)} box={{ ...cellh(1.5, 1), width: `${CELL / 2}%` }} len={dur(1300)} v={{ background: tint(p0, 0.3), borderRight: `2px solid ${p1}` }} />
      {/* settle: three of their turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, -0.5, -0.6)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Phase Field: the bishop slips half out of the world and glides down its
 *  diagonal straight through the pawn in its way, which shivers but stays;
 *  it comes back solid beyond. For the game. */
const PHASE: Palette = ["#8fb5e8", "#dff7ff", "#22304a"];
function PhaseFieldScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wa_stasis_field" pal={PHASE} dev="feather" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = PHASE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the pawn in the way */}
      <Ly c="bsp-r-strain" at={d(0)} box={cellh(1, 1)} len={dur(2100)}>
        <Man k="p" pal={PHASE} />
      </Ly>
      {/* strike: the bishop goes half out of the world and passes through */}
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(700)}>
        <Man k="b" pal={PHASE} />
      </Ly>
      <Ly c="bsp-r-move" at={d(280)} box={cellh(0, 0)} len={dur(1300)} v={{ "--mx": hx(3), "--my": 3 }}>
        <Man k="b" pal={PHASE} ghost />
      </Ly>
      <Ly c="bsp-facein" at={d(480)} box={cellh(1, 1, 0.9)} len={dur(800)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 3 C3 2 4 4 6 3 C7.4 2.4 8.4 2.6 9 3 M1 5 C3 4 4 6 6 5 C7.4 4.4 8.4 4.6 9 5 M1 7 C3 6 4 8 6 7 C7.4 6.4 8.4 6.6 9 7" fill="none" stroke={p1} strokeWidth="0.45" />
        </svg>
      </Ly>
      {/* it comes back solid beyond */}
      <Ly c="bsp-rise" at={d(880)} box={cellh(3, 3)} len={dur(1300)}>
        <Man k="b" pal={PHASE} />
      </Ly>
      {/* settle: for the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(0, -0.6, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p0} />
      </Ly>
    </HStage>
  );
}

/** Warding Circle: a chalk circle of old names is drawn round the caster's
 *  king; no enemy may end a move inside it, so their queen and knight are
 *  turned back at its edge, for two of their turns. */
const WARDC: Palette = ["#5fc9b0", "#ffd76a", "#1c4a3a"];
function WardingCircleScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="warding_circle" pal={WARDC} dev="warhorn" fx="ward" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = WARDC;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the king */}
        <Ly c="bsp-r-hold" at={d(0)} box={sq(4, 2)} len={dur(2200)}>
          <Man k="k" pal={WARDC} />
        </Ly>
        {/* strike: the chalk circle of names round his squares */}
        <Ly c="bsp-spoke" at={d(120)} box={area(3, 1, 3, 3)} len={dur(2000)}>
          <svg viewBox="0 0 30 30" className="block h-full w-full" aria-hidden="true">
            <circle cx="15" cy="15" r="14" fill="none" stroke={SHINE} strokeWidth="0.9" strokeDasharray="3 0.6 0.6 0.6" />
            <circle cx="15" cy="15" r="12.4" fill="none" stroke={tint(p0, 0.8)} strokeWidth="0.4" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              return <path key={i} d={`M${15 + Math.cos(a) * 12.6} ${15 + Math.sin(a) * 12.6} l${Math.cos(a + 1) * 1.2} ${Math.sin(a + 1) * 1.2}`} stroke={p1} strokeWidth="0.6" strokeLinecap="round" />;
            })}
          </svg>
        </Ly>
        {/* the queen and a knight try to end inside it and are turned back */}
        <Ly c="bsp-r-balk" at={d(560)} box={sq(4, 6)} len={dur(1300)} v={{ "--mx": 0, "--my": -3 }}>
          <Man k="q" pal={WARDC} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(700)} box={sq(7, 3)} len={dur(1300)} v={{ "--mx": -2, "--my": -1 }}>
          <Man k="n" pal={WARDC} foe />
        </Ly>
        {[{ f: 4, r: 3 }, { f: 5, r: 2 }].map((n, i) => (
          <Ly key={`x${n.f}`} c="bsp-facein" at={d(880 + i * 80)} box={sqs(n.f, n.r, 0.5)} len={dur(1000)}>
            <Nope color={p1} w={1} />
          </Ly>
        ))}
        {/* settle: two of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(2, 22, 3)} len={dur(900)}>
          <Pips n={2} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Warp Reign: a warp opens under the king and under the queen, they trade
 *  squares through it, and both are warded for three of the opponent's
 *  turns; a reroll die is spent. */
const WARPR: Palette = ["#8468f0", "#c9f4ff", "#1a0f38"];
function WarpReignScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="warp_reign" pal={WARPR} dev="pylon" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = WARPR;
  const d = (n: number) => dm(delayMs, n);
  const spiral = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 5 C5 4 6.2 4 6.2 5 C6.2 6.4 4 6.6 3.6 5 C3.2 3 6 2.4 7.2 4 C8.6 6 6.6 8.4 4.2 7.8 C1.4 7 1.4 3 3.6 2 C5.6 1 8.6 1.8 9 4.4" fill="none" stroke={p0} strokeWidth="0.55" strokeLinecap="round" />
    </svg>
  );
  return (
    <HStage>
      {/* tell: the warps open under both */}
      {[0, -1].map((x) => (
        <Ly key={`w${x}`} c="bsp-orbit" at={d(0)} box={cellh(-x, 0, 1.1)} len={dur(1400)}>
          {spiral}
        </Ly>
      ))}
      <Ly c="bsp-r-gone" at={d(60)} box={cellh(0, 0)} len={dur(800)}>
        <Man k="k" pal={WARPR} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(60)} box={cellh(1, 0)} len={dur(800)}>
        <Man k="q" pal={WARPR} />
      </Ly>
      {/* strike: they come out on each other's squares */}
      <Ly c="bsp-facein" at={d(620)} box={cellh(1, 0)} len={dur(1500)}>
        <Man k="k" pal={WARPR} />
      </Ly>
      <Ly c="bsp-facein" at={d(620)} box={cellh(0, 0)} len={dur(1500)}>
        <Man k="q" pal={WARPR} />
      </Ly>
      {[0, -1].map((x) => (
        <Ly key={`p${x}`} c="bsp-drift" at={d(420)} box={cellh(-x, 0.2, 0.16)} len={dur(800)} v={{ "--dx": `${x ? 140 : -140}%`, "--dy": "calc(var(--fx-side, 1) * -220%)", "--rot": "0deg", background: tint(p1, 0.85) }} />
      ))}
      {/* both warded */}
      {[0, -1].map((x) => (
        <Ly key={`s${x}`} c="bsp-stamp" at={d(880)} box={cellh(0.3 - x, 0.3, 0.42)} len={dur(1200)}>
          <Ward pal={WARPR} />
        </Ly>
      ))}
      {/* settle: three of their turns, and a reroll die spent */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(3, 0.2, -0.6)} len={dur(900)}>
        <Pips n={3} fill={p1} stroke={p2} />
      </Ly>
      <Ly c="bsp-r-gone" at={d(1000)} box={cellh(2.2, 0.2, 0.5)} len={dur(1000)}>
        <Die pal={WARPR} />
      </Ly>
    </HStage>
  );
}

/** Clumsy Dash: the knight bolts for an extra move, and in the rush a pawn is
 *  knocked over, where it lies frozen for the caster's next two turns. */
const CLUMSY: Palette = ["#aee2ff", "#cdeaff", "#2a5070"];
function ClumsyDashScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wc_clumsy_dash" pal={CLUMSY} dev="kite" fx="frost" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = CLUMSY;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the dash, an extra move now */}
      <Ly c="bsp-r-hop" at={d(0)} box={cellh(0, 0)} len={dur(1300)} v={{ "--mx": hx(1), "--my": 2 }}>
        <Man k="n" pal={CLUMSY} />
      </Ly>
      {/* strike: a pawn is knocked over in the rush */}
      <Ly c="bsp-r-tip" at={d(240)} box={cellh(1, 0)} len={dur(2000)}>
        <Man k="p" pal={CLUMSY} />
      </Ly>
      {[-1, 1].map((s) => (
        <Ly key={s} c="bsp-drift" at={d(560)} box={cellh(1 + 0.3 * s, -0.35, 0.18)} len={dur(800)} v={{ "--dx": `${s * 200}%`, "--dy": "-60%", "--rot": "0deg", background: tint(p1, 0.8) }} />
      ))}
      {/* it freezes where it lies */}
      <Ly c="bsp-close-l" at={d(760)} box={{ ...cellh(1, 0), width: `${CELL / 2}%` }} len={dur(1400)} v={{ background: tint(p0, 0.42), borderLeft: `2px solid ${p1}` }} />
      <Ly c="bsp-close-r" at={d(760)} box={{ ...cellh(1.5, 0), width: `${CELL / 2}%` }} len={dur(1400)} v={{ background: tint(p1, 0.36), borderRight: `2px solid ${p1}` }} />
      {/* settle: two of the caster's turns */}
      <Ly c="bsp-stamp" at={d(1100)} box={pipsAth(2, 0.7, -0.6)} len={dur(900)}>
        <Pips n={2} fill={p1} stroke={p2} />
      </Ly>
    </HStage>
  );
}

/** Lost and Found: the lost-property crate is set on the chosen empty square;
 *  after the opponent's move its lid lifts and the heaviest lost piece, a
 *  rook, comes out; the queen is never in the box. */
const LOSTF: Palette = ["#5fae7f", "#ffd76a", "#16301f"];
function LostAndFoundScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="wc_lost_and_found" pal={LOSTF} dev="obelisk" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = LOSTF;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the crate with its tag */}
      <Ly c="bsp-plop" at={d(0)} box={cellh(0, 0, 0.9)} len={dur(1500)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <rect x="1" y="3.4" width="8" height="6" fill={tint(p0, 0.8)} stroke={p2} strokeWidth="0.5" />
          <path d="M1 5.4 H9 M3.6 3.4 V9.4 M6.4 3.4 V9.4" stroke={p2} strokeWidth="0.35" />
          <path d="M7.4 5.8 L9.4 4.8 V7.4 L7.4 7.8 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-turn" at={d(120)} box={cellh(1, 0.4, 0.45)} len={dur(900)}>
        <Glass pal={LOSTF} />
      </Ly>
      {/* strike: the lid lifts off and the rook comes out */}
      <Ly c="bsp-r-move" at={d(420)} box={{ ...cellh(0, 0, 0.9), height: `${CELL * 0.22}%`, marginTop: `${CELL * 0.26}%` }} len={dur(900)} v={{ "--mx": hx(-0.6), "--my": 0.6, background: p0, border: `1px solid ${p2}` }} />
      <Ly c="bsp-rise" at={d(560)} box={cellh(0, 0)} len={dur(1600)}>
        <Man k="r" pal={LOSTF} />
      </Ly>
      {/* the queen is never in the box */}
      <Ly c="bsp-facein" at={d(700)} box={cellh(1.2, 0)} len={dur(1200)}>
        <Man k="q" pal={LOSTF} ghost />
      </Ly>
      {/* settle */}
      <Ly c="bsp-stamp" at={d(1000)} box={cellh(1.2, 0, 0.7)} len={dur(900)}>
        <Nope color={p1} />
      </Ly>
    </HStage>
  );
}

/** Ancient Grove: roots run along the caster's back rank to an empty square,
 *  an old tree grows there through the opponent's move, and a bishop steps
 *  out of its trunk; once. */
const GROVE: Palette = ["#3f8f3f", "#a8e07f", "#1c4a1c"];
function AncientGroveScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_ancient_grove" pal={GROVE} dev="cairn" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = GROVE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: roots run along the back rank */}
        <Ly c="bsp-taut" at={d(0)} box={{ ...band(1, 1), height: "2%", top: `calc(${rankTop(1)} + 9%)` }} len={dur(1900)}>
          <svg viewBox="0 0 80 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 1 C10 0 14 2 24 1 C34 0 40 2 52 1 C62 0 70 2 80 1" fill="none" stroke={p2} strokeWidth="1" />
          </svg>
        </Ly>
        <Ly c="bsp-turn" at={d(160)} box={sqs(2.3, 2, 0.5)} len={dur(900)}>
          <Glass pal={GROVE} />
        </Ly>
        {/* strike: the tree grows on the empty square */}
        <Ly c="bsp-grow" at={d(240)} box={sq(1, 1)} len={dur(1300)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M4 10 V6 H6 V10 Z" fill={p2} stroke={p0} strokeWidth="0.4" />
            <circle cx="5" cy="4" r="3.4" fill={p0} stroke={p2} strokeWidth="0.5" />
            <circle cx="3.6" cy="3.4" r="1" fill={p1} />
          </svg>
        </Ly>
        {/* a bishop steps out of it */}
        <Ly c="bsp-rise" at={d(760)} box={sq(1, 1)} len={dur(1500)}>
          <Man k="b" pal={GROVE} />
        </Ly>
        {/* settle: leaves falling, once */}
        {[0, 1].map((i) => (
          <Ly key={i} c="bsp-drift" at={d(900 + i * 80)} box={sqs(1.3 - i * 0.5, 1.6, 0.18)} len={dur(900)} v={{ "--dx": `${80 - i * 160}%`, "--dy": "calc(var(--fx-side, 1) * 200%)", "--rot": "120deg", background: p1 }} />
        ))}
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Backdraft: the enemy knight takes a caster's pawn, and fire blows back out
 *  of the square into every square around it: the enemy bishop and rook there
 *  burn, the pawn and the knight itself are spared. Three of their
 *  captures' worth. */
const BACKD: Palette = ["#7a9440", "#e3d0ff", "#28301c"];
const BACKD_FLAMES = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];
function BackdraftScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_backdraft" pal={BACKD} dev="helm" fx="curse" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BACKD;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: their capture */}
        <Ly c="bsp-r-gone" at={d(0)} box={sq(3, 4)} len={dur(800)}>
          <Man k="p" pal={BACKD} />
        </Ly>
        <Ly c="bsp-r-hop" at={d(40)} box={sq(4, 6)} len={dur(2000)} v={{ "--mx": -1, "--my": -2 }}>
          <Man k="n" pal={BACKD} foe />
        </Ly>
        {/* strike: the fire blows back into every square around */}
        {BACKD_FLAMES.map(([x, y], i) => (
          <Ly key={i} c="bsp-r-move" at={d(620 + i * 12)} box={sqs(3, 4, 0.5)} len={dur(900)} v={{ "--mx": x * 2, "--my": y * 2 }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 C7 3 8.6 4.6 8 7 C7.6 8.8 6.2 9.6 5 9.6 C3.4 9.6 2 8.4 2.2 6.6 C2.4 5 3.6 4.6 3.6 3 C4.4 3.6 4.8 4.4 4.8 5.2 C5.8 4 5.6 2.2 5 0.6 Z" fill={p1} stroke={p0} strokeWidth="0.5" {...SJ} />
            </svg>
          </Ly>
        ))}
        {/* the bishop and rook beside it burn */}
        <Ly c="bsp-r-gone" at={d(400)} box={sq(2, 5)} len={dur(1200)}>
          <Man k="b" pal={BACKD} foe />
        </Ly>
        <Ly c="bsp-r-gone" at={d(400)} box={sq(4, 3)} len={dur(1200)}>
          <Man k="r" pal={BACKD} foe />
        </Ly>
        {/* their pawn is spared */}
        <Ly c="bsp-r-hold" at={d(60)} box={sq(2, 3)} len={dur(1940)}>
          <Man k="p" pal={BACKD} foe />
        </Ly>
        {/* settle: three captures' worth */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(3, 58, 3)} len={dur(900)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Bramble Wall: thorny briars coil up round both enemy bishops, flowering as
 *  they close; one bishop starts down its diagonal and is caught back. Three
 *  of their turns. */
const BRAMBLE: Palette = ["#5faf5f", "#ff9dd6", "#1c4a2c"];
function BrambleWallScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_bramble_wall" pal={BRAMBLE} dev="beehive" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = BRAMBLE;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the bishops */}
        <Ly c="bsp-r-strain" at={d(60)} box={sq(2, 8)} len={dur(2140)}>
          <Man k="b" pal={BRAMBLE} foe />
        </Ly>
        <Ly c="bsp-r-balk" at={d(560)} box={sq(5, 8)} len={dur(1600)} v={{ "--mx": 1, "--my": -1 }}>
          <Man k="b" pal={BRAMBLE} foe />
        </Ly>
        {/* strike: the briars coil up round both */}
        {[2, 5].map((f, i) => (
          <Ly key={f} c="bsp-grow" at={d(i ? 290 : 200)} box={sq(f, 8)} len={dur(1900)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 10 C0.6 7 8.8 7.4 8.2 5 C7.6 2.6 1.8 4 2.2 1.6" fill="none" stroke={p0} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M1.6 7.6 L0.6 7 M8.4 6 L9.4 5.6 M5 6.8 L5.4 5.8 M3.8 3.8 L3.2 2.8 M7.4 3.4 L8.2 2.6" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </Ly>
        ))}
        {/* flowers open as they close */}
        {[2, 5].map((f, i) => (
          <Ly key={`b${f}`} c="bsp-glint" at={d(700 + i * 90)} box={sqs(f + 0.28, 8.2, 0.3)}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 1 C6.4 1 6.4 3.6 5 5 C6.4 3.6 9 3.6 9 5 C9 6.4 6.4 6.4 5 5 C6.4 6.4 6.4 9 5 9 C3.6 9 3.6 6.4 5 5 C3.6 6.4 1 6.4 1 5 C1 3.6 3.6 3.6 5 5 C3.6 3.6 3.6 1 5 1 Z" fill={p1} stroke={p2} strokeWidth="0.3" />
            </svg>
          </Ly>
        ))}
        {/* settle: three of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(3, 45.2, 6)} len={dur(900)}>
          <Pips n={3} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Creeping Roots: roots creep along the border of the caster's half; an
 *  enemy pawn stepping across is caught at the ankle and pulled back, for
 *  four of their turns. */
const ROOTS: Palette = ["#4a8f5f", "#ffd76a", "#173a24"];
function CreepingRootsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_creeping_roots" pal={ROOTS} dev="feather" fx="grove" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = ROOTS;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the roots creep along the border */}
        <Ly c="bsp-taut" at={d(0)} box={{ left: 0, width: "100%", top: lineTop(4, 3), height: "3%" }} len={dur(2100)}>
          <svg viewBox="0 0 80 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 1.5 C6 0.2 10 2.8 16 1.5 C22 0.2 26 2.8 32 1.5 C38 0.2 42 2.8 48 1.5 C54 0.2 58 2.8 64 1.5 C70 0.2 74 2.8 80 1.5" fill="none" stroke={p0} strokeWidth="1.1" />
            <path d="M0 2 C8 3 12 0.6 20 2 C28 3 34 0.6 44 2 C52 3 60 0.6 70 2 C74 2.6 78 2 80 2" fill="none" stroke={p2} strokeWidth="0.6" />
          </svg>
        </Ly>
        {/* their pawns on the edge of it */}
        {[2, 5].map((f) => (
          <Ly key={f} c="bsp-r-hold" at={d(100)} box={sq(f, 5)} len={dur(2000)}>
            <Man k="p" pal={ROOTS} foe />
          </Ly>
        ))}
        {/* strike: one steps across and is pulled back */}
        <Ly c="bsp-r-balk" at={d(460)} box={sq(3, 5)} len={dur(1400)} v={{ "--mx": 0, "--my": -1 }}>
          <Man k="p" pal={ROOTS} foe />
        </Ly>
        <Ly c="bsp-grow" at={d(620)} box={{ ...sqs(3, 4.6, 0.6) }} len={dur(1200)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 10 C5 7 2 6 3 3.4 C3.6 2 5.6 2.4 5.4 3.8" fill="none" stroke={p0} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </Ly>
        {/* settle: four of their turns */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(4, 57, 4)} len={dur(900)}>
          <Pips n={4} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Undertow: a current sweeps the caster's bishop to an empty square far
 *  off; where it lands the water swirls, and the nearest enemy knight is
 *  dragged one square toward it. */
const UNDERTOW: Palette = ["#9d7fff", "#7fd8d8", "#221440"];
function UndertowScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="we_undertow" pal={UNDERTOW} dev="arrowhead" fx="prism" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = UNDERTOW;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the current runs out ahead of the bishop */}
      {[0, 1].map((i) => (
        <Ly key={i} c="bsp-r-move" at={d(i * 90)} box={{ ...cellh(0.4, 0.2 + i * 0.5), height: `${CELL * 0.3}%` }} len={dur(1000)} v={{ "--mx": hx(2.2), "--my": 1.5 }}>
          <svg viewBox="0 0 10 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 1.5 C2 0 3 3 5 1.5 C7 0 8 3 10 1.5" fill="none" stroke={p1} strokeWidth="0.6" />
          </svg>
        </Ly>
      ))}
      {/* strike: the bishop is swept to the empty square */}
      <Ly c="bsp-r-move" at={d(200)} box={cellh(0, 0)} len={dur(1700)} v={{ "--mx": hx(3), "--my": 1 }}>
        <Man k="b" pal={UNDERTOW} />
      </Ly>
      <Ly c="bsp-orbit" at={d(560)} box={cellh(3, 1, 1.2)} len={dur(1200)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 1 C8 1 9 4 7.6 6 M5 9 C2 9 1 6 2.4 4" fill="none" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </Ly>
      {/* the nearest enemy is dragged one square toward it */}
      <Ly c="bsp-r-move" at={d(760)} box={cellh(4, 3)} len={dur(1300)} v={{ "--mx": 0, "--my": -1 }}>
        <Man k="n" pal={UNDERTOW} foe />
      </Ly>
      {/* the one further off stays */}
      <Ly c="bsp-r-hold" at={d(100)} box={cellh(6, 4)} len={dur(1900)}>
        <Man k="r" pal={UNDERTOW} foe />
      </Ly>
      <Ly c="bsp-glint" at={d(860)} box={cellh(3.3, 1.3, 0.4)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
        </svg>
      </Ly>
      {/* settle: the spray where it lands */}
      <Ly c="bsp-drift" at={d(1000)} box={cellh(4, 2.3, 0.2)} len={dur(800)} v={{ "--dx": "120%", "--dy": "-120%", "--rot": "0deg", background: tint(p0, 0.7) }} />
    </HStage>
  );
}

/** Defectors: the marked enemy knight waits out the opponent's move, runs up
 *  a white flag and turns to the caster's side for the rest of the game; the
 *  king beside it cannot be swayed. */
const DEFECTR: Palette = ["#8f6bff", "#e3d0ff", "#141322"];
function DefectorsScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_defectors" pal={DEFECTR} dev="mask" fx="ink" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = DEFECTR;
  const d = (n: number) => dm(delayMs, n);
  return (
    <HStage>
      {/* tell: the mark, then the opponent's move */}
      <Ly c="bsp-r-hold" at={d(0)} box={cellh(0, 0)} len={dur(1100)} v={landing(p1)} />
      <Ly c="bsp-r-gone" at={d(0)} box={cellh(0, 0)} len={dur(1100)}>
        <Man k="n" pal={DEFECTR} foe />
      </Ly>
      <Ly c="bsp-turn" at={d(100)} box={cellh(-1, 0.4, 0.45)} len={dur(900)}>
        <Glass pal={DEFECTR} />
      </Ly>
      {/* strike: the white flag goes up and it turns */}
      <Ly c="bsp-grow" at={d(420)} box={cellh(0.35, 0.55, 0.8)} len={dur(1500)}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 10 V0.8" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          <path d="M2 1 C4 0 6 2 8.6 1 V5.4 C6 6.4 4 4.4 2 5.4 Z" fill={SHINE} stroke={p2} strokeWidth="0.4" {...SJ} />
        </svg>
      </Ly>
      <Ly c="bsp-facein" at={d(760)} box={cellh(0, 0)} len={dur(1400)}>
        <Man k="n" pal={DEFECTR} />
      </Ly>
      <Ly c="bsp-drift" at={d(700)} box={cellh(-0.2, 0.2, 0.22)} len={dur(900)} v={{ "--dx": "-160%", "--dy": "calc(var(--fx-side, 1) * 180%)", "--rot": "140deg", background: p2 }} />
      {/* the king beside it is not swayed */}
      <Ly c="bsp-r-hold" at={d(60)} box={cellh(1, 1)} len={dur(2000)}>
        <Man k="k" pal={DEFECTR} foe />
      </Ly>
      {/* settle: for the rest of the game */}
      <Ly c="bsp-stamp" at={d(1100)} box={cellh(-0.9, -0.6, 0.45)} len={dur(900)}>
        <Ever color={p2} fill={p0} />
      </Ly>
    </HStage>
  );
}

/** Field Fortification: sandbags are stacked in front of the caster's pawns;
 *  after the opponent's move, a pawn takes the enemy knight straight ahead of
 *  it, for the rest of the game. */
const FIELDF: Palette = ["#b5533a", "#fff2c9", "#33170f"];
function FieldFortificationScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_field_fortification" pal={FIELDF} dev="hand_bell" fx="muster" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = FIELDF;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the pawn line and the sandbags stacked in front */}
        {[2, 4, 5].map((f) => (
          <Ly key={f} c="bsp-r-hold" at={d(0)} box={sq(f, 3)} len={dur(2200)}>
            <Man k="p" pal={FIELDF} />
          </Ly>
        ))}
        <Ly c="bsp-grow" at={d(100)} box={{ left: "25%", width: "50%", top: lineTop(3, 4), height: "4%" }} len={dur(2000)}>
          <svg viewBox="0 0 40 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={0.4 + i * 5} y={i % 2 ? 0.4 : 1.6} width="4.6" height="2" rx="0.9" fill={p0} stroke={p2} strokeWidth="0.3" />
            ))}
          </svg>
        </Ly>
        <Ly c="bsp-turn" at={d(160)} box={sqs(0.5, 3, 0.5)} len={dur(900)}>
          <Glass pal={FIELDF} />
        </Ly>
        {/* strike: the pawn takes the piece straight ahead */}
        <Ly c="bsp-r-gone" at={d(360)} box={sq(3, 4)} len={dur(1000)}>
          <Man k="n" pal={FIELDF} foe />
        </Ly>
        <Ly c="bsp-r-move" at={d(420)} box={sq(3, 3)} len={dur(1800)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="p" pal={FIELDF} />
        </Ly>
        {/* settle: for the rest of the game */}
        <Ly c="bsp-stamp" at={d(1100)} box={sqs(7, 3, 0.45)} len={dur(900)}>
          <Ever color={p2} fill={p1} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Forward Observer: the observer's binoculars spot the target down the
 *  file; the rook fires over its own pawn, which is unharmed, and lands on
 *  the enemy bishop. For the caster's next turn. */
const OBSERVER: Palette = ["#a83a2a", "#e3e9f2", "#2c100c"];
function ForwardObserverScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_forward_observer" pal={OBSERVER} dev="pylon" fx="banner" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = OBSERVER;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the observer's binoculars, and the sight line */}
        <Ly c="bsp-facein" at={d(0)} box={sqs(1, 4, 0.6)} len={dur(1600)}>
          <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="1" width="3.6" height="4.4" rx="1" fill={p2} stroke={p1} strokeWidth="0.4" />
            <rect x="5.8" y="1" width="3.6" height="4.4" rx="1" fill={p2} stroke={p1} strokeWidth="0.4" />
            <path d="M4.2 2.6 H5.8" stroke={p1} strokeWidth="0.6" />
          </svg>
        </Ly>
        <Ly c="bsp-r-hold" at={d(120)} box={{ ...area(0, 2, 1, 6), left: "5.9%", width: "0.7%" }} len={dur(1000)} v={{ background: `repeating-linear-gradient(0deg, ${tint(p1, 0.8)} 0 5px, transparent 5px 9px)` }} />
        {/* the pawn in the way, and the target */}
        <Ly c="bsp-r-hold" at={d(60)} box={sq(0, 3)} len={dur(2100)}>
          <Man k="p" pal={OBSERVER} />
        </Ly>
        <Ly c="bsp-r-gone" at={d(80)} box={sq(0, 6)} len={dur(1300)}>
          <Man k="b" pal={OBSERVER} foe />
        </Ly>
        {/* strike: the rook fires over its pawn and lands on the target */}
        <Ly c="bsp-r-hop" at={d(300)} box={sq(0, 1)} len={dur(1800)} v={{ "--mx": 0, "--my": 5 }}>
          <Man k="r" pal={OBSERVER} />
        </Ly>
        {/* settle: for the caster's next turn */}
        <Ly c="bsp-stamp" at={d(1100)} box={pipsBox(1, 14, 5)} len={dur(900)}>
          <Pips n={1} fill={p0} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Last Reserves: two empty back-rank squares are marked; after the
 *  opponent's move the last knight and bishop march in from behind the lines
 *  to stand there; once. */
const RESERVES: Palette = ["#7fd8a8", "#fff2c9", "#1c3a2a"];
function LastReservesScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_last_reserves" pal={RESERVES} dev="acorn" fx="spirit" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = RESERVES;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the two empty squares, then the opponent's move */}
        {[1, 5].map((f) => (
          <Ly key={f} c="bsp-r-hold" at={d(0)} box={sq(f, 1)} len={dur(1600)} v={landing(p0)} />
        ))}
        <Ly c="bsp-turn" at={d(100)} box={sqs(3, 2, 0.5)} len={dur(900)}>
          <Glass pal={RESERVES} />
        </Ly>
        {/* strike: they march in from behind the lines */}
        <Ly c="bsp-r-move" at={d(420)} box={sq(1, 0)} len={dur(1800)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="n" pal={RESERVES} />
        </Ly>
        <Ly c="bsp-r-move" at={d(520)} box={sq(5, 0)} len={dur(1700)} v={{ "--mx": 0, "--my": 1 }}>
          <Man k="b" pal={RESERVES} />
        </Ly>
        {[1, 5].map((f, i) => (
          <Ly key={`d${f}`} c="bsp-drift" at={d(880 + i * 90)} box={sqs(f, 1, 0.2)} len={dur(800)} v={{ "--dx": "160%", "--dy": "calc(var(--fx-side, 1) * 160%)", "--rot": "0deg", background: tint(p1, 0.8) }} />
        ))}
        {/* settle: once */}
        <Ly c="bsp-r-gone" at={d(1000)} box={pipsBox(1, 48.4, 2)} len={dur(1000)}>
          <Pips n={1} fill={p1} stroke={p2} />
        </Ly>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Sapper Team: a tunnel runs under the board into the opponent's half, the
 *  ground heaves on an empty square there, and a new pawn climbs out with its
 *  lamp lit. */
const SAPPER: Palette = ["#8a6a3a", "#ffd23f", "#33261a"];
function SapperTeamScene({ lead, role, delayMs }: RuleProps) {
  if (role === "entrance" || !lead) return <RuleCut id="ww_sapper_team" pal={SAPPER} dev="hand_bell" fx="loot" role={role} delayMs={delayMs} />;
  const [p0, p1, p2] = SAPPER;
  const d = (n: number) => dm(delayMs, n);
  return (
    <BoardWideStage>
      <BoardFrame>
        {/* tell: the tunnel runs forward under the board */}
        <Ly c="bsp-r-hold" at={d(0)} box={{ ...area(4, 1, 1, 6), left: "55.9%", width: "0.7%" }} len={dur(1200)} v={{ background: `repeating-linear-gradient(0deg, ${tint(p0, 0.9)} 0 6px, transparent 6px 10px)` }} />
        {/* strike: the ground heaves on the square in their half */}
        <Ly c="bsp-plop" at={d(300)} box={sq(4, 6)} len={dur(1700)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 9.6 C1.4 6.4 3.4 5.6 5 5.6 C6.6 5.6 8.6 6.4 9.4 9.6 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            <ellipse cx="5" cy="7.4" rx="2.2" ry="1" fill={p2} />
          </svg>
        </Ly>
        {[-1, 1].map((s) => (
          <Ly key={s} c="bsp-drift" at={d(520)} box={sqs(4, 6, 0.2)} len={dur(900)} v={{ "--dx": `${s * 220}%`, "--dy": "calc(var(--fx-side, 1) * -180%)", "--rot": "70deg", background: p0 }} />
        ))}
        {/* the pawn climbs out, lamp lit */}
        <Ly c="bsp-rise" at={d(620)} box={sq(4, 6)} len={dur(1600)}>
          <Man k="p" pal={SAPPER} />
          <svg viewBox="0 0 10 10" className="absolute inset-0 block h-full w-full" aria-hidden="true">
            <circle cx="5.9" cy="2.8" r="0.7" fill={p1} stroke={p2} strokeWidth="0.3" />
          </svg>
        </Ly>
        {/* settle: a glint off the lamp */}
        <Ly c="bsp-glint" at={d(1000)} box={sqs(4.2, 6.3, 0.34)}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={p1} />
          </svg>
        </Ly>
      </BoardFrame>
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
  chain_mail: S(ChainMailScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "board", source: "shield" }),
  // Deflect (t3 protection)
  deflect: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "deflect", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "candle"),
  // Fortress (t3 protection)
  fortress: B(SigilRing, ["#4fa3d1","#dff7ff","#173a52"], "fortress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "anvil"),
  // Iron Bishop (t3 protection)
  iron_bishop: S(IronBishopScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  // Phalanx (t3 protection)
  phalanx: S(PhalanxScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }),
  // Sigil Ward (t3 protection)
  wa_sigil_ward: S(SigilWardScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }),
  // Duelist (t4 protection)
  duelist: S(DuelistScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  // Hold the Bridge (t4 protection)
  hold_the_bridge: B(SigilRing, ["#c9a84c","#e8fff7","#3a3026"], "hold_the_bridge", { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "cast", source: "kingSafe" }, "quill", true),
  // Iron Wall (t4 protection)
  iron_wall: S(IronWallScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }),
  // Shieldmaiden (t4 protection)
  shieldmaiden: B(SigilRing, ["#7fd8a8","#fff2c9","#1c4a2c"], "shieldmaiden", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }, "drum", true),
  // Warding Circle (t4 protection)
  warding_circle: S(WardingCircleScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "board", source: "kingSafe" }),
  // Watermelon Rind (t4 protection)
  watermelon_rind: S(WatermelonRindScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast", source: "shield" }),
  // High Ground (TIER 7 protection — bespoke full-board takeover, not a template)
  ww_high_ground: { config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }, Render: HighGroundTakeover },

  /* --- RuneStamp --------------------------------------------------------- */
  // Butterfingers (t1 hex)
  butterfingers: S(ButterfingersScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "cast" }),
  // Cold Feet (t1 hex)
  cold_feet: S(ColdFeetScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }),
  // Crossed Wires (t1 hex)
  crossed_wires: B(RuneStamp, ["#7a9440","#e3d0ff","#28301c"], "crossed_wires", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades", anchor: "board" }, "inkpot"),
  // Foggy Glasses (t1 hex)
  foggy_glasses: B(RuneStamp, ["#9b59b6","#c0e57f","#221033"], "foggy_glasses", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades", anchor: "cast" }, "thorn"),
  // Royal Restraint (t1 hex)
  royal_restraint: S(RoyalRestraintScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", anchor: "cast" }),
  // Stage Fright (t1 hex)
  stage_fright: S(StageFrightScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast", source: "slow" }),
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
  hex_doll: S(HexDollScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "aim" }),
  // Butterfingers (t4 hex)
  wc_butterfingers: S(ButteredArmyScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "board" }),
  // Backdraft (t4 attack)
  we_backdraft: S(BackdraftScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),

  /* --- ChainLash --------------------------------------------------------- */
  // Cold Open (t1 hex)
  cold_open: S(ColdOpenScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }),
  // Heavy Boots (t1 hex)
  heavy_boots: S(HeavyBootsScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board" }),
  // Knock Knees (t1 hex)
  knock_knees: S(KnockKneesScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "board" }),
  // Molasses (t1 hex)
  molasses: S(MolassesScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }),
  // Slippery Grip (t1 hex)
  slippery_grip: S(SlipperyGripScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", anchor: "board" }),
  // Stiff Joints (t1 hex)
  stiff_joints: S(StiffJointsScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }),
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
  pawn_nerf: S(PawnNerfScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  // Pin Breaker (t3 movement)
  // Spooked Steeds (t3 hex)
  spooked_steeds: B(ChainLash, ["#8a94a8","#c9cdd6","#2e3440"], "spooked_steeds", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "board" }, "compass"),
  // Static Field (t3 protection)
  we_static_field: B(ChainLash, ["#7d8aa0","#e3e9f2","#1f2734"], "we_static_field", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", anchor: "cast" }, "quill"),
  // Abandoned Post (t4 hex)
  abandoned_post: S(AbandonedPostScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  // Blockade (t4 tempo)
  blockade: S(BlockadeScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board" }),
  // Frozen Furrows (t4 hex)
  frozen_furrows: B(ChainLash, ["#6e7b8f","#ffd76a","#242c38"], "frozen_furrows", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }, "buckler", true),
  // Heavy Shackles (t4 hex)
  heavy_shackles: S(HeavyShacklesScene, { ordering: "radial", staggerMs: 0, victims: ["q","r"], hasLead: true, sound: "wall", anchor: "cast" }),
  // Quicksand Patch (t4 tempo)
  wc_quicksand_patch: S(QuicksandPatchScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "board", source: "walnut" }),

  /* --- ColdSnap ---------------------------------------------------------- */
  // Cold Snap (t1 hex)
  cold_snap: S(ColdSnapScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }),
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
  snap_freeze: S(SnapFreezeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }),
  // Twist the Knife (t3 hex)
  twist_the_knife: S(TwistTheKnifeScene, { ordering: "sweep", staggerMs: 60, victims: ["p","n","b","r","q"], hasLead: true, sound: "clockice", anchor: "aim", source: "slow" }),
  // Stasis Field (t3 tempo)
  wa_stasis_field: S(PhaseFieldScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }),
  // Wall (t3 tempo)
  wall: B(ColdSnap, ["#6fc3e8","#fff4d6","#1d4560"], "wall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }, "spear"),
  // Clumsy Dash (t3 tempo)
  wc_clumsy_dash: S(ClumsyDashScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }),
  // Slip on Ice (t3 tempo)
  wc_slip_on_ice: B(ColdSnap, ["#9fd8ff","#e8f8ff","#2c5a80"], "wc_slip_on_ice", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockice", anchor: "cast", source: "frozen" }, "dice"),
  // Stage Fright (t3 hex)
  wc_stage_fright: B(ColdSnap, ["#7fd8d8","#eef8ff","#1c4a52"], "wc_stage_fright", { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice", anchor: "cast" }, "coin"),
  // Cascade Freeze (t4 tempo)
  cascade_freeze: S(CascadeFreezeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  // Cryostasis (t4 hex)
  cryostasis: S(CryostasisScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }),
  // Hard Frost (t4 hex)
  hard_frost: S(HardFrostScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "aim", source: "frozen" }),
  // Immobilizer (t4 tempo)
  immobilizer: S(ImmobilizerScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }),
  // Bind the Queen (t4 protection)
  wa_bind_the_queen: S(BindTheQueenScene, { ordering: "sweep", staggerMs: 60, victims: ["q"], hasLead: true, sound: "clockice", anchor: "board", source: "frozen" }),
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
  statue_stable: S(StatueStableScene, { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }),
  // Stone Clergy (t4 hex)
  stone_clergy: S(StoneClergyScene, { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "walnut" }),

  /* --- GlintArc ---------------------------------------------------------- */
  // Ferz King (t1 movement)
  ferz_king: S(FerzKingScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
  // Half Step (t1 movement)
  half_step: S(HalfStepScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }),
  // Loyal Pawn (t1 pieces)
  loyal_pawn: S(LoyalPawnScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  // Quiet March (t1 movement)
  quiet_march: S(QuietMarchScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
  // Rook Slide (t1 movement)
  rook_slide: S(RookSlideScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
  // Sentinel Pawn (t1 attack)
  sentinel_pawn: S(SentinelPawnScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }),
  // Sidestep (t1 protection)
  sidestep: B(GlintArc, ["#6fd8e8","#f2fcff","#173842"], "sidestep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast", source: "shield" }, "coin"),
  // Tempo Shuffle (t1 movement)
  tempo_shuffle: S(TempoShuffleScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "board", source: "empower" }),
  // Ghost Pawn (t2 movement)
  ghost_pawn: S(GhostPawnScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
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
  promote_now: S(PromoteNowScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  // Queen's Echo (t3 movement)
  queens_echo: S(QueensEchoScene, { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
  // Rank Runner (t3 movement)
  rank_runner: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "rank_runner", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "quill"),
  // Vanguard (t3 pieces)
  vanguard: B(GlintArc, ["#8fd1ff","#ffd76a","#22405c"], "vanguard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }, "inkpot"),
  // Transmute (t3 pieces)
  wa_transmute: B(GlintArc, ["#7fc9e8","#e3f6ff","#1c3644"], "wa_transmute", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }, "drum"),
  // Ball Lightning (t3 attack)
  we_ball_lightning: S(BallLightningScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }),
  // River Flow (t3 movement)
  we_riverflow: B(GlintArc, ["#6fe3ff","#fff4d6","#1c3a4a"], "we_riverflow", { ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "buckler"),
  // Phalanx Advance (t3 movement)
  ww_phalanx_advance: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "ww_phalanx_advance", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }, "caltrop"),
  // Changeling (t4 pieces)
  changeling: S(ChangelingScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "aim" }),
  // Kingslide (t4 movement)
  kingslide: S(KingslideScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "cast", source: "empower" }),
  // Royal Decree (t4 movement)
  royal_decree: S(RoyalDecreeScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }),
  // Arcane Conduit (t4 movement)
  wa_arcane_conduit: B(GlintArc, ["#a8e0e8","#fff7de","#274048"], "wa_arcane_conduit", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim", source: "empower" }, "mask", true),

  /* --- HoofSpring -------------------------------------------------------- */
  // Bishop Polish (t1 movement)
  bishop_polish: S(BishopPolishScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }),
  // Diagonal Step (t1 movement)
  diagonal_step: S(DiagonalStepScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }),
  // Little Leap (t1 movement)
  little_leap: S(LittleLeapScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }),
  // Nudge (t1 attack)
  nudge: S(NudgeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Camel Knight (t2 movement)
  camel_knight: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "camel_knight", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }, "bellows"),
  // Long Knight (t2 movement)
  long_knight: S(LongKnightScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }),
  // Mind Nudge (t2 attack)
  mind_nudge: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "mind_nudge", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "hammer"),
  // Rally (t2 movement)
  rally: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "rally", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "buoy"),
  // Spring Pawn (t2 movement)
  spring_pawn: B(HoofSpring, ["#b58a5a","#e8dcc0","#4a3a26"], "spring_pawn", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "warhorn"),
  // Teleport Knight (t2 movement)
  teleport_knight: S(TeleportKnightScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }),
  // Vault (t2 movement)
  vault: S(VaultScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }),
  // Wazir Bishop (t2 movement)
  wazir_bishop: B(HoofSpring, ["#bf9a68","#f2e6d0","#46381f"], "wazir_bishop", { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "gauntlet"),
  // Kangaroo Hop (t2 movement)
  wc_kangaroo_hop: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "wc_kangaroo_hop", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "toadstool"),
  // Updraft (t2 movement)
  we_updraft: S(UpdraftScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }),
  // Bishop to Archbishop (t3 movement)
  bishop_archbishop: S(ArchbishopScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }),
  // Board Quake (t3 attack)
  board_quake: B(HoofSpring, ["#a8763a","#ffd76a","#3a2a18"], "board_quake", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "lantern"),
  // Cannon (t3 movement)
  cannon: B(HoofSpring, ["#9a7a4a","#e0d0b0","#332918"], "cannon", { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "helm"),
  // Dragon Pawn (t3 movement)
  dragon_pawn: S(DragonPawnScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }),
  // Hunter Knight (t3 attack)
  hunter_knight: S(HunterKnightScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
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
  giant_slayer: S(GiantSlayerScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "board", source: "empower" }),
  // Overrun (t4 attack)
  overrun: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "overrun", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, "feather", true),
  // Twin Knights (t4 movement)
  twin_knights: S(TwinKnightsScene, { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast", source: "empower" }),
  // Camel Rider (t4 movement)
  wa_camel_rider: B(HoofSpring, ["#c9a84c","#fff2c9","#4a3a22"], "wa_camel_rider", { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim", source: "empower" }, "candle", true),

  /* --- PennantRaise ------------------------------------------------------ */
  // Steady March (t1 movement)
  steady_march: S(SteadyMarchScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }),
  // Counterstep (t2 tempo)
  counterstep: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "counterstep", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim", source: "rally" }, "drum"),
  // Double Step Army (t2 movement)
  double_step_army: B(PennantRaise, ["#a83a4a","#ffd76a","#2e1218"], "double_step_army", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board", source: "empower" }, "spear"),
  // Pawn Storm (t2 movement)
  pawn_storm: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "pawn_storm", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "crown"),
  // Pikemen (t2 movement)
  ww_pikemen: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "ww_pikemen", { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "kite"),
  // Berolina Pawns (t3 movement)
  berolina_pawns: S(BerolinaPawnsScene, { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }),
  // Momentum (t3 tempo)
  momentum: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "momentum", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim", source: "rally" }, "torch"),
  // Split March (t3 movement)
  split_march: B(PennantRaise, ["#d1663a","#ffe9b0","#3d2012"], "split_march", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "buoy"),
  // Moonwalk (t3 movement)
  wc_moonwalk: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "wc_moonwalk", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "obelisk"),
  // Army Reversal (t4 movement)
  army_reversal: B(PennantRaise, ["#c94a3a","#ffd76a","#3a1c16"], "army_reversal", { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim", source: "empower" }, "pylon", true),
  // Solstice (t4 tempo)
  solstice: S(SolsticeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }),
  // Chaos Reigns (t4 tempo)
  wc_chaos_reigns: B(PennantRaise, ["#c05a2a","#f7e3b0","#361a0c"], "wc_chaos_reigns", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "aim" }, "buckler", true),
  // Field Fortification (t4 movement)
  ww_field_fortification: S(FieldFortificationScene, { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board", source: "empower" }),

  /* --- ScrollSnap -------------------------------------------------------- */
  // Cut Purse (t2 hex)
  cut_purse: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "cut_purse", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "ledger"),
  // Sealed Orders (t2 hex)
  sealed_orders: B(ScrollSnap, ["#ead9b8","#5a6b8f","#33261a"], "sealed_orders", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "quill"),
  // Royal Duty (t3 hex)
  royal_duty: S(RoyalDutyScene, { ordering: "radial", staggerMs: 0, victims: ["p","n","b","r","q"], hasLead: true, sound: "snooze", anchor: "board" }),
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
  patch_notes: S(PatchNotesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  // Suppress (t4 draft)
  suppress: B(ScrollSnap, ["#e8dcc0","#8f2bbf","#241a3a"], "suppress", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mirror", true),
  // Disrupt Ritual (t4 draft)
  wa_disrupt_ritual: B(ScrollSnap, ["#f0e2c4","#4a7a5f","#2c2416"], "wa_disrupt_ritual", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "chalice", true),
  // Jinx (t4 draft)
  wa_jinx: S(JinxScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),

  /* --- CardFlick --------------------------------------------------------- */
  // Prep (t1 draft)
  prep: B(CardFlick, ["#c9a0ff","#ffe9b0","#301c50"], "prep", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "dice"),
  // Trade Up (t2 pieces)
  trade_up: B(CardFlick, ["#9b6bd1","#f2e0ff","#1e1038"], "trade_up", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "coin"),
  // Buff Thief (Minor) (t4 draft)
  buff_thief_minor: S(BuffThiefScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  // Hero's Journey (t4 draft)
  heros_journey: S(HerosJourneyScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  // Recast (t4 draft)
  recast: S(RecastScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  // Disjunction (t4 draft)
  wa_disjunction: S(DisjunctionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),

  /* --- EyeBlink ---------------------------------------------------------- */
  // Extra Glance (t1 info)
  extra_glance: S(ExtraGlanceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  // Peek (t1 info)
  peek: B(EyeBlink, ["#7b8fd1","#f0f4ff","#232e52"], "peek", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "compass"),
  // Quick Glance (t1 info)
  quick_glance: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "quick_glance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "mask"),
  // Scout (t1 info)
  scout: S(ScoutScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }),
  // Watchtower (t1 info)
  watchtower: S(WatchtowerScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
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
  wa_mind_read: S(MindReadScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  // Omniscience (t4 info)
  wa_omniscience: B(EyeBlink, ["#4fa3d1","#dfe8ff","#1c2c44"], "wa_omniscience", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }, "ledger", true),

  /* --- KeyTurn ----------------------------------------------------------- */
  // Castle Early (t1 movement)
  castle_early: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "castle_early", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "padlock"),
  // Drawbridge (t1 hex)
  drawbridge: S(DrawbridgeScene, { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "aim", source: "slow" }),
  // Toll Gate (t1 hex)
  toll_gate: S(TollGateScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "board" }),
  // Long Castle Anywhere (t2 movement)
  long_castle_anywhere: B(KeyTurn, ["#c9a84c","#ffd76a","#3a3026"], "long_castle_anywhere", { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "board", source: "empower" }, "anvil"),
  // No Man's Land (t2 hex)
  no_mans_land: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "no_mans_land", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "hammer"),
  // Shy Pieces (t2 hex)
  wc_shy_pieces: S(ShyPiecesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  // Board Lock (t3 tempo)
  board_lock: S(BoardLockScene, { ordering: "sweep", staggerMs: 60, victims: ["k","r"], hasLead: true, sound: "clockcage", anchor: "board", source: "slow" }),
  // Bunker (t3 protection)
  bunker: B(KeyTurn, ["#b5924a","#f7e3b0","#332a1c"], "bunker", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, "keystone"),
  // No Trespass (t3 hex)
  no_trespass: B(KeyTurn, ["#a88a3a","#ffe9b0","#2c2416"], "no_trespass", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, "gauntlet"),
  // Flypaper File (t4 hex)
  flypaper_file: S(FlypaperFileScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  // Sealed Gate (t4 hex)
  sealed_gate: S(SealedGateScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim" }),

  /* --- LanternLift ------------------------------------------------------- */
  // Second Wind (t1 pieces)
  second_wind: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "second_wind", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "lantern"),
  // Minor Recall (t2 pieces)
  minor_recall: S(MinorRecallScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),
  // Regrow (t2 pieces)
  we_regrow: B(LanternLift, ["#8fd1b0","#ffe9c9","#22422e"], "we_regrow", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "torch"),
  // Field Hospital (t2 pieces)
  ww_field_hospital: B(LanternLift, ["#98dcb8","#ffedd0","#264a34"], "ww_field_hospital", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }, "brazier"),
  // Reclaim the Fallen (t2 pieces)
  ww_reclaim_the_fallen: B(LanternLift, ["#5fae7f","#ffd76a","#16301f"], "ww_reclaim_the_fallen", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }, "chalice"),
  // Seance (t3 pieces)
  seance: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "seance", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim", source: "summon" }, "feather"),
  // Second Wind Major (t3 pieces)
  second_wind_major: S(SecondWindMajorScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board", source: "summon" }),
  // Will-o'-Wisp (t3 tempo)
  will_o_wisp: B(LanternLift, ["#6fc494","#fff7de","#1a3826"], "will_o_wisp", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board", source: "frozen" }, "mirror"),
  // Last Reserves (t3 pieces)
  ww_last_reserves: S(LastReservesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),
  // Resurrect (t4 pieces)
  resurrect: S(ResurrectScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),
  // Resurrect Major (t4 pieces)
  resurrect_major: S(ResurrectMajorScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),
  // Lost and Found (t4 pieces)
  wc_lost_and_found: S(LostAndFoundScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),
  // Recommission (t4 pieces)
  ww_recommission: S(RecommissionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast", source: "summon" }),

  /* --- SatchelDrop ------------------------------------------------------- */
  // Walnut Shell (t1 item)
  walnut_shell: S(WalnutShellScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),
  // Apple (t2 item)
  apple: B(SatchelDrop, ["#8a6a3a","#ffd23f","#33261a"], "apple", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast", source: "shield" }, "chalice"),
  // Banana Peel (t2 item)
  banana_peel: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "banana_peel", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "inkpot"),
  // Coconut Bonk (t2 item)
  coconut_bonk: B(SatchelDrop, ["#8a6a3a","#ff9dd6","#2e2214"], "coconut_bonk", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast", source: "frozen" }, "bellows"),
  // King's Guard (t2 pieces)
  kings_guard: B(SatchelDrop, ["#a87a4a","#a8e07f","#3a2c1c"], "kings_guard", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "spool"),
  // Bodyguard (t3 pieces)
  bodyguard: S(BodyguardScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),
  // Split Bishop (t3 pieces)
  split_bishop: B(SatchelDrop, ["#96703f","#ff9d3d","#362818"], "split_bishop", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, "ledger"),
  // Sapper Team (t3 pieces)
  ww_sapper_team: S(SapperTeamScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),
  // Coffee (t4 item)
  coffee: S(CoffeeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  // Comet Shard (t4 pieces)
  comet_shard: S(CometShardScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  // Conjured Bishop (t4 pieces)
  wa_conjure_bishop: S(ConjureBishopScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),
  // Shieldbearers (t4 pieces)
  ww_shieldbearers: S(ShieldbearersScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),

  /* --- CogTick ----------------------------------------------------------- */
  // Free Retreat (t1 tempo)
  // Rewind One (t3 tempo)
  // Wasted Hour (t3 hex)
  wasted_hour: B(CogTick, ["#bf9c50","#9fdcf0","#362c1c"], "wasted_hour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board", source: "stun" }, "cogwheel"),
  // Lost Weekend (t4 hex)
  lost_weekend: S(LostWeekendScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board", source: "slow" }),
  // Borrowed Minute (t4 tempo)
  wa_borrowed_minute: S(BorrowedMinuteScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),

  /* --- BellToll ---------------------------------------------------------- */
  // Deep Breath (t1 nerf)
  deep_breath: S(DeepBreathScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  // Reprieve (t1 nerf)
  reprieve: S(ReprieveScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
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
  grace_period: S(GracePeriodScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  // Half Measure (t3 nerf)
  // Piece Parole (t3 nerf)
  // Timely Lull (t3 nerf)
  timely_lull: S(TimelyLullScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  // Underdog's Grit (t3 nerf)
  underdogs_grit: B(BellToll, ["#ffcf4d","#fff4d6","#7a5c2e"], "underdogs_grit", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "obelisk"),
  // Adrenaline (t4 nerf)
  adrenaline: B(BellToll, ["#ffd76a","#fff7de","#8a6a3a"], "adrenaline", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "cairn", true),
  // Counter-Nerf (t4 nerf)
  counter_nerf: S(CounterNerfScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" }),
  // Respite (t4 nerf)
  respite: B(BellToll, ["#f7c95a","#fff2c9","#6e5528"], "respite", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, "buoy", true),

  /* --- LeafSpin ---------------------------------------------------------- */
  // Durian (t3 hex)
  durian: B(LeafSpin, ["#3f8f3f","#a8e07f","#1c4a1c"], "durian", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }, "acorn"),
  // Pixie Dust (t3 movement)
  pixie_dust: B(LeafSpin, ["#4a8f5f","#ffd76a","#173a24"], "pixie_dust", { ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", anchor: "aim", source: "empower" }, "toadstool"),
  // Seelie Blessing (t3 protection)
  seelie_blessing: S(SeelieBlessingScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "shield" }),
  // Bramble Wall (t3 protection)
  we_bramble_wall: S(BrambleWallScene, { ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", anchor: "board", source: "frozen" }),
  // Creeping Roots (t3 protection)
  we_creeping_roots: S(CreepingRootsScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  // Seedlings (t3 pieces)
  we_seedlings: B(LeafSpin, ["#6fae4a","#e8fff7","#243f14"], "we_seedlings", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast" }, "sickle"),
  // Faerie Ring (t4 hex)
  faerie_ring: S(FaerieRingScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  // Puck's Mischief (t4 hex)
  pucks_mischief: S(PucksMischiefScene, { ordering: "sweep", staggerMs: 60, victims: ["q","r"], hasLead: true, sound: "petrifiedforest", anchor: "board", source: "slow" }),
  // Ancient Grove (t4 pieces)
  we_ancient_grove: S(AncientGroveScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast", source: "summon" }),

  /* --- PrismFlash -------------------------------------------------------- */
  // Escape Hatch (t1 movement)
  escape_hatch: S(EscapeHatchScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Piece Swap (t2 movement)
  piece_swap: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "piece_swap", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "compass"),
  // Recall (t2 movement)
  recall: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "kite"),
  // Regroup the Lines (t2 movement)
  ww_regroup_lines: B(PrismFlash, ["#8468f0","#c9f4ff","#1a0f38"], "ww_regroup_lines", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "weathervane"),
  // Guard Rotation (t3 movement)
  guard_rotation: S(GuardRotationScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Blink (t3 movement)
  wa_blink: S(BlinkScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Warp Home (t3 movement)
  warp_home: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "warp_home", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "dice"),
  // Warp Step (t3 movement)
  warp_step: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "warp_step", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "obelisk"),
  // Blink Army (t4 movement)
  blink_army: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "blink_army", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "candle", true),
  // Grand Recall (t4 movement)
  grand_recall: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "grand_recall", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "buoy", true),
  // Mass Recall (t4 movement)
  mass_recall: S(MassRecallScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  // Regroup (t4 movement)
  regroup: B(PrismFlash, ["#9d7fff","#7fd8d8","#221440"], "regroup", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, "crown", true),
  // Total Recall (t4 movement)
  total_recall: S(TotalRecallScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Fold Space (t4 movement)
  wa_swap_flanks: B(PrismFlash, ["#8f6bff","#6fe3ff","#1c1030"], "wa_swap_flanks", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "waxseal", true),
  // Warp Field (t4 movement)
  warp_field: B(PrismFlash, ["#7b5fe8","#aef0ff","#170c2e"], "warp_field", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, "lantern", true),
  // Warp Reign (t4 protection)
  warp_reign: S(WarpReignScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim", source: "shield" }),
  // Warp Rook (t4 movement)
  warp_rook: B(PrismFlash, ["#a88cff","#8fe8ff","#281a48"], "warp_rook", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, "mask", true),
  // Riptide (t4 movement)
  we_riptide: S(RiptideScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  // Undertow (t4 movement)
  we_undertow: S(UndertowScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),

  /* --- BannerMuster ------------------------------------------------------ */
  // Decoy (t2 protection)
  // Regenerate (t3 pieces)
  regenerate: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "regenerate", { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "drum"),
  // Summon Knight (t3 pieces)
  summon_knight: S(SummonKnightScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }),
  // Conjured Scout (t3 pieces)
  wa_conjure_scout: B(BannerMuster, ["#c94a3a","#d8dee9","#331410"], "wa_conjure_scout", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "spear"),
  // Outriders (t3 pieces)
  ww_outriders: S(OutridersScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }),
  // Mass Resurrect (t4 pieces)
  mass_resurrect: S(MassResurrectScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }),
  // Phantom Rook (t4 pieces)
  phantom_rook: S(PhantomRookScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "aim", source: "summon" }),
  // Forward Observer (t4 pieces)
  ww_forward_observer: S(ForwardObserverScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "board", source: "summon" }),
  // Reserve Cavalry (t4 pieces)
  ww_reserve_cavalry: B(BannerMuster, ["#b0402e","#e8eef7","#2e120e"], "ww_reserve_cavalry", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast", source: "summon" }, "buckler", true),

  /* --- InkSplash --------------------------------------------------------- */
  // Shadow Step (t2 movement)
  // Glamour (t3 pieces)
  glamour: B(InkSplash, ["#8f6bff","#e3d0ff","#141322"], "glamour", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, "inkpot"),
  // Piece Steal (t3 pieces)
  piece_steal: B(InkSplash, ["#6f5fd1","#f0e8ff","#100f1e"], "piece_steal", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "quill"),
  // Dominate (t4 pieces)
  wa_dominate_minor: S(DominateScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  // Body Double (t4 pieces)
  wc_body_double: B(InkSplash, ["#8a70e0","#efe6ff","#181430"], "wc_body_double", { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }, "waxseal", true),
  // Defectors (t4 pieces)
  ww_defectors: S(DefectorsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  // Mass Defection (t4 pieces)
  ww_mass_defection: S(MassDefectionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
};
