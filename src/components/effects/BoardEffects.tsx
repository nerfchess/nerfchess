"use client";

// Board effect overlays: one component per card-effect family, mounted only
// on affected squares by Board.tsx. All SVG inline (no emoji), all animation
// transform/opacity-only, defined in effects.css. Persistent overlays render
// a static end state when animations are off in Settings; one-shot flourishes hide.

import React from "react";
import {
  Castle,
  Eye,
  Layers,
  type LucideIcon,
  Package,
  Shield,
  Skull,
  Swords,
  Timer,
  Unlink,
  Wind,
} from "lucide-react";
import type { BuffCategory, CardFx } from "@/engine/buff";
import { CategoryArrival } from "./cardEntrance";
import { cardFaceIcon } from "@/lib/cardIcon";
import type { PieceType } from "@/engine/types";
import "./effects.css";
// The APEX (tier 9/10) set pieces below compose the gp-* keyframes that live
// in godPlays.css (transform/opacity only, one-shot, hidden under reduced
// motion by that file's guard). Imported here so the classes are always
// loaded with this file; global CSS imports dedupe, so godPlays.tsx importing
// it too is fine.
import "./godPlays.css";

// --- Small inline glyphs (replacements for emoji/dingbat markers) -----------

/** Snowflake marking a frozen piece (replaces the old "snowflake" dingbat). */
export const SnowflakeGlyph = React.memo(function SnowflakeGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <g stroke="#eaf8ff" strokeWidth="1" strokeLinecap="round" fill="none">
        <path d="M6 1v10M1.7 3.5l8.6 5M10.3 3.5l-8.6 5" />
        <path d="M4.6 2l1.4 1.2L7.4 2M4.6 10l1.4-1.2L7.4 10" strokeWidth="0.8" />
      </g>
    </svg>
  );
});

/** Lightning bolt for the strike flash (replaces the bolt emoji). */
export const BoltGlyph = React.memo(function BoltGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <polygon
        points="13,1.5 5.5,13.5 10.5,13.5 8.5,22.5 18.5,9.5 12.5,9.5"
        fill="#ffd95e"
        stroke="#8a6414"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/** The duck (variant rule marker; replaces the duck emoji). */
export const DuckGlyph = React.memo(function DuckGlyph() {
  return (
    <svg viewBox="0 0 32 24" width="62%" height="62%" aria-hidden="true">
      <polygon points="6.2,7 1.5,8.4 6.4,9.8" fill="#e8912d" stroke="#8a5311" strokeWidth="0.6" />
      <path
        d="M11 2.5 a5.2 5.2 0 0 1 5.2 5.2 c0 1.6 -0.8 2.8 -1.9 3.6 L15 11.5 h8 c4.2 0 5.4 3.1 3.7 5.8 C24.6 21 20 22.5 14.5 22.5 C8.2 22.5 4.8 19.3 4.8 15.2 c0 -1.6 0.6 -2.8 1.7 -3.7 A5.2 5.2 0 0 1 11 2.5 Z"
        fill="#f2c94c"
        stroke="#8a6414"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="12.6" cy="6.6" r="1" fill="#2b2417" />
    </svg>
  );
});

/** Carved root-claws gripping a walnutted square from all four corners: dark
 * burl wood with a molten-gold seam accent to match WalnutPiece's kintsugi
 * shell. Each corner claw clamps in once (walnut-root in globals.css) and
 * persists as the "held fast" mark while the hex runs. */
export const RootClaws = React.memo(function RootClaws() {
  const claw = (
    <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
      {/* three knuckled root fingers reaching in from the corner */}
      <g stroke="#120a04" strokeWidth="0.8" strokeLinejoin="round">
        <path d="M0 3 C6 3 9.5 5 11.5 9 L9 10.5 C7.5 7.5 4.5 5.8 0 5.6 Z" fill="#3a2415" />
        <path d="M3 0 C3 6 5 9.5 9 11.5 L10.5 9 C7.5 7.5 5.8 4.5 5.6 0 Z" fill="#4a2f1a" />
        <path d="M1 1 C5.5 2.5 8.5 5.5 10 10 L12.5 12.5 C11.5 6.5 7.5 2.5 1 1 Z" fill="#2a1a0e" />
      </g>
      {/* gold seam glint along the longest finger */}
      <path
        d="M1.6 1.6 C5.5 3 8.3 5.8 9.8 9.6"
        fill="none"
        stroke="#ffd76a"
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
  const corners: { pos: string; rot: number; rx: string; ry: string; delay: number }[] = [
    { pos: "left-0 top-0", rot: 0, rx: "-60%", ry: "-60%", delay: 0 },
    { pos: "right-0 top-0", rot: 90, rx: "60%", ry: "-60%", delay: 70 },
    { pos: "right-0 bottom-0", rot: 180, rx: "60%", ry: "60%", delay: 140 },
    { pos: "left-0 bottom-0", rot: 270, rx: "-60%", ry: "60%", delay: 210 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
      {corners.map((c, i) => (
        <span
          key={i}
          className={`walnut-root absolute block h-[38%] w-[38%] ${c.pos}`}
          style={
            {
              rotate: `${c.rot}deg`,
              "--rx": c.rx,
              "--ry": c.ry,
              animationDelay: `${c.delay}ms`,
            } as React.CSSProperties
          }
        >
          {claw}
        </span>
      ))}
    </span>
  );
});

// --- 1. Chain jail -----------------------------------------------------------

const CHAIN_DARK = "#141e2b";
const CHAIN_LIGHT = "#b9c4d6";

function ChainLinks({ points }: { points: { x: number; y: number; a: number; edgeOn?: boolean }[] }) {
  return (
    <>
      {points.map((p, i) => (
        <g key={i} transform={`rotate(${p.a} ${p.x} ${p.y})`}>
          <ellipse cx={p.x} cy={p.y} rx={3.7} ry={p.edgeOn ? 1.3 : 2.5} fill="none" stroke={CHAIN_DARK} strokeWidth={3} />
          <ellipse cx={p.x} cy={p.y} rx={3.7} ry={p.edgeOn ? 1.3 : 2.5} fill="none" stroke={CHAIN_LIGHT} strokeWidth={1.3} />
        </g>
      ))}
    </>
  );
}

/**
 * A chain draped corner to corner across a jailed piece's square, dropping in
 * with a clamp + settle rattle. When the neighbouring square (visually right /
 * below) is jailed too, a short connector chain bridges the shared edge so the
 * whole lockdown reads as one interlinked jail.
 */
export const ChainJail = React.memo(function ChainJail({
  linkRight,
  linkDown,
  delayMs = 0,
}: {
  linkRight: boolean;
  linkDown: boolean;
  delayMs?: number;
}) {
  return (
    <>
      <svg
        viewBox="0 0 45 45"
        className="fx-chain pointer-events-none absolute inset-0 z-10 h-full w-full opacity-90"
        style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
        aria-hidden="true"
      >
        <ChainLinks
          points={[
            { x: 6.5, y: 8.5, a: 49 },
            { x: 13.5, y: 16, a: 46, edgeOn: true },
            { x: 21, y: 23.5, a: 44 },
            { x: 28.5, y: 30.5, a: 40, edgeOn: true },
            { x: 36, y: 37, a: 37 },
          ]}
        />
      </svg>
      {linkRight && (
        <span className="pointer-events-none absolute right-[-15%] top-1/2 z-10 mt-[-8%] h-[16%] w-[30%]">
          <svg
            viewBox="0 0 24 12"
            className="fx-chain-connector h-full w-full opacity-90"
            style={{ animationDelay: `${delayMs + 380}ms` }}
            aria-hidden="true"
          >
            <ChainLinks
              points={[
                { x: 7, y: 6, a: 0 },
                { x: 17, y: 6, a: 0, edgeOn: true },
              ]}
            />
          </svg>
        </span>
      )}
      {linkDown && (
        <span className="pointer-events-none absolute bottom-[-15%] left-1/2 z-10 ml-[-8%] h-[30%] w-[16%]">
          <svg
            viewBox="0 0 12 24"
            className="fx-chain-connector h-full w-full opacity-90"
            style={{ animationDelay: `${delayMs + 380}ms` }}
            aria-hidden="true"
          >
            <ChainLinks
              points={[
                { x: 6, y: 7, a: 90 },
                { x: 6, y: 17, a: 90, edgeOn: true },
              ]}
            />
          </svg>
        </span>
      )}
    </>
  );
});

// --- 2. Shield bearer --------------------------------------------------------

const SHIELD_EDGE = "#7bb52f";
const SHIELD_FILL = "rgba(22, 30, 22, 0.92)";
const SHIELD_TRIM = "rgba(163, 209, 96, 0.9)";

/**
 * A shield leaning against the front of the protected square: a tall heater
 * for the king (king_safe), a small round buckler for shielded pieces. Raises
 * with a quick "hup" on mount, persists while the protection holds.
 */
export const ShieldMark = React.memo(function ShieldMark({ variant }: { variant: "heater" | "buckler" }) {
  if (variant === "heater") {
    return (
      <span className="pointer-events-none absolute bottom-[2%] left-[4%] z-10 h-[44%] w-[38%]">
        <svg viewBox="0 0 24 28" className="fx-shield h-full w-full" aria-hidden="true">
          <path
            d="M12 1 L22 5 V13 C22 20 17.5 25.2 12 27 C6.5 25.2 2 20 2 13 V5 Z"
            fill={SHIELD_FILL}
            stroke={SHIELD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M12 4.5 V23.5 M4.8 9 H19.2" stroke={SHIELD_TRIM} strokeWidth="0.9" fill="none" />
        </svg>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute bottom-[3%] left-[5%] z-10 h-[28%] w-[28%]">
      <svg viewBox="0 0 24 24" className="fx-shield h-full w-full" aria-hidden="true">
        <circle cx="12" cy="12" r="10.4" fill={SHIELD_FILL} stroke={SHIELD_EDGE} strokeWidth="1.4" />
        <circle cx="12" cy="12" r="6.4" fill="none" stroke={SHIELD_TRIM} strokeWidth="0.8" />
        <circle cx="12" cy="12" r="2.4" fill={SHIELD_TRIM} />
      </svg>
    </span>
  );
});

// --- 3. Barred ground --------------------------------------------------------

const STAKE_FILL = "#8a5a38";
const STAKE_EDGE = "rgba(24, 14, 7, 0.65)";
const ROPE_HOSTILE = "rgba(198, 92, 74, 0.95)";
const ROPE_WARD = "rgba(123, 181, 47, 0.95)";

const STAKE_POS: React.CSSProperties[] = [
  { top: "5%", left: "7%" },
  { top: "5%", right: "7%" },
  { bottom: "5%", right: "7%" },
  { bottom: "5%", left: "7%" },
];

/**
 * Stakes-and-rope barrier on a barred square: four corner stakes thunk in one
 * by one, then a rope hairline strings between them. `hostile` = the viewer
 * is barred (rust rope), `ward` = the viewer's own wall (verdigris rope).
 */
export const BarrierStakes = React.memo(function BarrierStakes({ tone }: { tone: "hostile" | "ward" }) {
  const rope = tone === "hostile" ? ROPE_HOSTILE : ROPE_WARD;
  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {STAKE_POS.map((pos, i) => (
        <span key={i} className="absolute h-[19%] w-[6.5%]" style={pos}>
          <span
            className="fx-stake block h-full w-full rounded-[1px]"
            style={{
              background: STAKE_FILL,
              border: `1px solid ${STAKE_EDGE}`,
              animationDelay: `${i * 75}ms`,
            }}
          />
        </span>
      ))}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="fx-rope absolute inset-0 h-full w-full">
        <path
          d="M10 12 Q50 18 90 12 Q86 50 90 88 Q50 94 10 88 Q14 50 10 12 Z"
          fill="none"
          stroke={rope}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
});

// --- 4. Pawn clamp -----------------------------------------------------------

/**
 * A low fence hairline boarding up a halted pawn's forward edge (the cleaner
 * option over a per-pawn boot mark: one quiet directional line instead of
 * another icon on an already-tinted square).
 */
export const PawnFence = React.memo(function PawnFence({ edge }: { edge: "top" | "bottom" }) {
  return (
    <span
      className="pointer-events-none absolute left-[8%] right-[8%] z-10 h-[15%]"
      style={edge === "top" ? { top: "3%" } : { bottom: "3%" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 60 12" preserveAspectRatio="none" className="fx-fence h-full w-full">
        <g fill="none" strokeLinecap="round">
          <g stroke="#1c2733" strokeWidth="2.6">
            <path d="M2 5 H58" />
            <path d="M8 1.5 V10.5 M22 1.5 V10.5 M36 1.5 V10.5 M50 1.5 V10.5" />
          </g>
          <g stroke="#9fb0c4" strokeWidth="1.1">
            <path d="M2 5 H58" />
            <path d="M8 1.5 V10.5 M22 1.5 V10.5 M36 1.5 V10.5 M50 1.5 V10.5" />
          </g>
        </g>
      </svg>
    </span>
  );
});

// --- 5. Skip / stun ----------------------------------------------------------

function StunZ({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g className="fx-stun-z" style={{ animationDelay: `${delay}ms` }}>
      <path
        d={`M${x} ${y} h${s} l${-s} ${s} h${s}`}
        fill="none"
        stroke="#141e2b"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={`M${x} ${y} h${s} l${-s} ${s} h${s}`}
        fill="none"
        stroke="#e8eef6"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * One-shot stun over a skipped player's king: a dazed swirl spins above the
 * piece while three Zs rise and drift off, then everything fades.
 */
export function StunSwirl() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-stun absolute inset-0 block">
        <svg viewBox="0 0 45 45" className="h-full w-full">
          <g className="fx-stun-swirl">
            <circle
              cx="22.5"
              cy="19"
              r="9.5"
              fill="none"
              stroke="#e6bf6a"
              strokeWidth="1.6"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="19" r="1.3" fill="#e6bf6a" />
            <circle cx="13" cy="19" r="1.3" fill="#e6bf6a" />
          </g>
          <StunZ x={25} y={12} s={3.4} delay={0} />
          <StunZ x={30} y={7} s={4.6} delay={150} />
          <StunZ x={35} y={1.8} s={6} delay={300} />
        </svg>
      </span>
    </span>
  );
}

// --- 5b. Bonk impact + injured overlay ---------------------------------------
// The reusable comedic-impact primitive (Coconut Bonk, Tung Tung Tung Sahur,
// and the batch of funny cards to follow). A dropped object bonks a piece:
// BonkImpact is the one-shot flash (drop, squash, star-burst, impact lines, a
// light tile jolt); InjuredOverlay is the persistent "dazed" look worn while
// the paired stun holds (dizzy stars circling the piece). BonkImpact must be
// mounted with a key that changes per application (square + count) so a
// re-render never replays it; InjuredOverlay simply mounts while the square
// carries both a freeze and a recent bonk.

/** A coconut: a fibrous brown husk with three germination pores. Sized to fill
 * its wrapper (pass a sizing className). */
export const CoconutGlyph = React.memo(function CoconutGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10.6" fill="#6f4a2f" stroke="#33210f" strokeWidth="1.1" />
      {/* fibrous streaks */}
      <g stroke="#4b3018" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M8 4.5 Q10 12 9 19.5" />
        <path d="M12 3.6 Q13 12 12.4 20.4" />
        <path d="M16 4.5 Q15 12 16 19.5" />
      </g>
      {/* top-left highlight */}
      <path d="M5.6 9 A8.6 8.6 0 0 1 13.5 3.9" stroke="#a97c52" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* three pores */}
      <circle cx="9.5" cy="15" r="1" fill="#241609" />
      <circle cx="14.5" cy="15" r="1" fill="#241609" />
      <circle cx="12" cy="18" r="1" fill="#241609" />
    </svg>
  );
});

/** A small four-point spark star, the bonk burst and the dizzy injury mark. */
export function SparkStar() {
  return (
    <svg viewBox="0 0 10 10" className="h-full w-full">
      <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}

// Impact sparks fly out from the landing point. Delay puts them a beat after
// the coconut lands (~38% of the 0.72s drop), so the burst reads as the hit.
const BONK_STARS = [
  { dx: "175%", dy: "-155%", rot: "150deg", delay: 0 },
  { dx: "-185%", dy: "-140%", rot: "-140deg", delay: 22 },
  { dx: "205%", dy: "70%", rot: "180deg", delay: 10 },
  { dx: "-195%", dy: "95%", rot: "-160deg", delay: 30 },
  { dx: "25%", dy: "-225%", rot: "70deg", delay: 6 },
];
const BONK_IMPACT_DELAY = 270;

/**
 * One-shot bonk impact: a coconut drops from above onto the piece, squashes on
 * landing and rebounds before fading, throwing a burst of spark stars and a
 * "pow" of short impact lines while the tile takes a light jolt. Pure CSS
 * (see effects.css); hidden entirely under reduced motion like the other
 * transient flourishes, the persistent injured mark carries the readable state.
 */
export function BonkImpact() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* the tile takes the hit: a short jolt with a faint impact bloom */}
      <span
        className="fx-bonk-jolt absolute inset-0 block"
        style={{ background: "radial-gradient(circle at 50% 60%, rgba(120,80,40,0.28), transparent 60%)" }}
      />
      {/* the dropped coconut, squashing on landing */}
      <span className="fx-bonk-drop absolute left-[32%] top-[3%] block h-[44%] w-[36%]">
        <CoconutGlyph className="h-full w-full" />
      </span>
      {/* "pow" impact lines radiating from the landing point */}
      <span
        className="fx-bonk-lines absolute left-[26%] top-[26%] block h-[48%] w-[48%]"
        style={{ animationDelay: `${BONK_IMPACT_DELAY}ms` }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g stroke="#efdcae" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M20 20 L20 3.5" />
            <path d="M20 20 L34 9" />
            <path d="M20 20 L36.5 22" />
            <path d="M20 20 L6 9" />
            <path d="M20 20 L3.5 22" />
          </g>
        </svg>
      </span>
      {/* spark-star burst */}
      {BONK_STARS.map((v, i) => (
        <span
          key={i}
          className="fx-bonk-star absolute left-1/2 top-[48%] ml-[-5%] mt-[-5%] block h-[11%] w-[11%]"
          style={
            {
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${BONK_IMPACT_DELAY + v.delay}ms`,
            } as React.CSSProperties
          }
        >
          <SparkStar />
        </span>
      ))}
    </span>
  );
}

// Three dizzy stars sitting in an arc over the piece's head, spun slowly by
// the orbit group. Placed roughly symmetric around the group's box centre so
// the spin reads as circling rather than lurching.
const INJURED_STARS = [
  { x: 22.5, y: 5.5, r: 2.6 },
  { x: 16.8, y: 13.5, r: 2.1 },
  { x: 28.2, y: 13.5, r: 2.1 },
];

/**
 * Persistent injured overlay: worn while a piece is stunned FROM a bonk (a
 * square carrying both a freeze and a recent bonk). Dizzy stars circle over
 * the piece with a slight wobble; a companion `fx-injured-tilt` class (in
 * effects.css) can be added to the piece itself for the drunken tilt. Under
 * reduced motion the stars hold still as a static dazed mark. All CSS, no
 * per-frame JS: cheap enough to sit on every affected square for the duration.
 */
export const InjuredOverlay = React.memo(function InjuredOverlay() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-injured absolute inset-0 block">
        <svg viewBox="0 0 45 45" className="h-full w-full">
          <g className="fx-injured-orbit">
            {INJURED_STARS.map((s, i) => (
              <path
                key={i}
                d={`M${s.x} ${s.y - s.r} L${s.x + s.r * 0.32} ${s.y - s.r * 0.32} L${s.x + s.r} ${s.y} L${s.x + s.r * 0.32} ${s.y + s.r * 0.32} L${s.x} ${s.y + s.r} L${s.x - s.r * 0.32} ${s.y + s.r * 0.32} L${s.x - s.r} ${s.y} L${s.x - s.r * 0.32} ${s.y - s.r * 0.32} Z`}
                fill="#e6bf6a"
                stroke="#7a5b23"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>
      </span>
    </span>
  );
});

// --- 6. Transform flourish ---------------------------------------------------

const SHARD_VECTORS = [
  { dx: "360%", dy: "-250%", rot: "220deg", delay: 0 },
  { dx: "-330%", dy: "-300%", rot: "-260deg", delay: 24 },
  { dx: "410%", dy: "130%", rot: "300deg", delay: 12 },
  { dx: "-380%", dy: "210%", rot: "-200deg", delay: 36 },
  { dx: "90%", dy: "-430%", rot: "150deg", delay: 8 },
  { dx: "-130%", dy: "390%", rot: "-150deg", delay: 32 },
  { dx: "300%", dy: "340%", rot: "180deg", delay: 18 },
  { dx: "-300%", dy: "-360%", rot: "-190deg", delay: 44 },
];

/**
 * A piece changed type on its square (setPieceType, promotion): the old form
 * bursts into shards while the new piece pops in (Board adds fx-piece-pop to
 * the piece itself). Queen-class arrivals add a crown flash with a restrained
 * radial glow.
 */
export function TransformFlourish({ crown }: { crown?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {crown && (
        <span
          className="fx-glow absolute inset-0 block"
          style={{
            background: "radial-gradient(circle at 50% 45%, rgba(230,191,106,0.5), transparent 62%)",
          }}
        />
      )}
      {SHARD_VECTORS.map((v, i) => (
        <span
          key={i}
          className="fx-shard absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={
            {
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${v.delay}ms`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="h-full w-full">
            <polygon
              points={i % 2 === 0 ? "5,0 10,8 0,8" : "0,2 10,0 6,10"}
              fill="#e6bf6a"
              stroke="#7a5b23"
              strokeWidth="0.6"
            />
          </svg>
        </span>
      ))}
      {crown && (
        <span className="fx-crown absolute left-1/2 top-[6%] ml-[-23%] block h-[30%] w-[46%]">
          <svg viewBox="0 0 24 14" className="h-full w-full">
            <path
              d="M2 12 L2 4.5 L7 8 L12 1.5 L17 8 L22 4.5 L22 12 Z"
              fill="#e6bf6a"
              stroke="#7a5b23"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <circle cx="7" cy="10.5" r="0.9" fill="#7a5b23" />
            <circle cx="12" cy="10.5" r="0.9" fill="#7a5b23" />
            <circle cx="17" cy="10.5" r="0.9" fill="#7a5b23" />
          </svg>
        </span>
      )}
    </span>
  );
}

// --- 7. Summon ---------------------------------------------------------------

const DUST = "rgba(196, 178, 142, 0.9)";
const POOF_VECTORS = [
  { dx: "620%", dy: "-140%" },
  { dx: "-580%", dy: "-260%" },
  { dx: "420%", dy: "480%" },
  { dx: "-460%", dy: "420%" },
  { dx: "120%", dy: "-620%" },
  { dx: "-160%", dy: "600%" },
];

/**
 * A piece summoned onto a previously empty square: a dust ring puffs outward
 * with scattering motes while the piece drops in (fx-piece-drop on the piece).
 */
export function SummonPoof() {
  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <span
        className="fx-poof-ring absolute inset-[16%] block rounded-full"
        style={{ border: `1px solid ${DUST}` }}
      />
      {POOF_VECTORS.map((v, i) => (
        <span
          key={i}
          className="fx-poof-dot absolute left-1/2 top-1/2 block h-[5.5%] w-[5.5%] rounded-full"
          style={
            {
              background: DUST,
              "--dx": v.dx,
              "--dy": v.dy,
              animationDelay: `${i * 12}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

// --- 8. Detonation (attack-card removals) ------------------------------------

const EMBER_FILL = "#d98a4a";
const EMBER_EDGE = "#3a2013";
const DET_VECTORS = [
  { dx: "420%", dy: "-230%", rot: "230deg", delay: 0 },
  { dx: "-390%", dy: "-300%", rot: "-220deg", delay: 16 },
  { dx: "470%", dy: "170%", rot: "280deg", delay: 8 },
  { dx: "-440%", dy: "250%", rot: "-260deg", delay: 24 },
  { dx: "120%", dy: "-460%", rot: "140deg", delay: 4 },
  { dx: "-160%", dy: "420%", rot: "-160deg", delay: 20 },
  { dx: "310%", dy: "370%", rot: "190deg", delay: 12 },
  { dx: "-300%", dy: "-380%", rot: "-200deg", delay: 28 },
  { dx: "-470%", dy: "-40%", rot: "120deg", delay: 6 },
  { dx: "470%", dy: "-30%", rot: "-120deg", delay: 22 },
];

/**
 * A piece removed outright by an attack card (nothing landed on its square,
 * it did not move away): an expanding blast ring, a burst of ember shards,
 * and a scorch mark that lingers a beat before fading. Pure one-shot CSS;
 * hidden entirely under reduced motion like the other transient flourishes.
 */
/** Flame tongues for the firestorm bursts: licks of fire thrown outward and
 *  up, each with its own vector + delay (mirrors the shard pattern). */
const FLAME_VECTORS = [
  { dx: "-135%", dy: "-190%", rot: "-24deg", delay: 30 },
  { dx: "120%", dy: "-210%", rot: "20deg", delay: 0 },
  { dx: "-40%", dy: "-260%", rot: "-6deg", delay: 55 },
  { dx: "195%", dy: "-120%", rot: "38deg", delay: 40 },
  { dx: "-205%", dy: "-95%", rot: "-40deg", delay: 70 },
];

export function FlameLicks({ delayMs = 0, sizePct = 16 }: { delayMs?: number; sizePct?: number }) {
  return (
    <>
      {FLAME_VECTORS.map((v, i) => (
        <span
          key={i}
          className="fx-flame-lick absolute left-1/2 top-1/2 block"
          style={
            {
              width: `${sizePct}%`,
              height: `${sizePct * 1.4}%`,
              marginLeft: `-${sizePct / 2}%`,
              marginTop: `-${sizePct / 2}%`,
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.delay}ms`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 10 14" className="h-full w-full" aria-hidden="true">
            <path
              d="M5 0 C7.5 3 9 5.5 9 8.5 C9 11.5 7.2 14 5 14 C2.8 14 1 11.5 1 8.5 C1 6.5 2 4.5 3.2 3 C3.4 5 4 6 5 6.6 C5.6 4.4 5.4 2 5 0 Z"
              fill="#ff9d3d"
              stroke="#7a2e0e"
              strokeWidth="0.5"
            />
            <path d="M5 4.5 C6.4 6.4 7 8 7 9.6 C7 11.6 6 13 5 13 C4 13 3 11.6 3 9.6 C3 8 3.6 6.4 5 4.5 Z" fill="#ffd166" />
          </svg>
        </span>
      ))}
    </>
  );
}

export function DetonationBurst() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* White-hot core, then the fireball climbs off the square. */}
      <span
        className="fx-sig-flash absolute inset-[10%] block rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,157,61,0.55) 52%, transparent 74%)" }}
      />
      <span
        className="fx-fireball absolute inset-[16%] block rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 62%, rgba(255,240,200,0.95), rgba(255,157,61,0.85) 42%, rgba(230,67,44,0.7) 68%, rgba(58,28,18,0.4) 88%, transparent 100%)",
        }}
      />
      {/* Twin fire shockwaves racing past the square's edges. */}
      <span
        className="fx-sig-shock absolute inset-[8%] block rounded-full"
        style={{ border: "2.5px solid rgba(255,157,61,0.95)" }}
      />
      <span
        className="fx-sig-shock absolute inset-[16%] block rounded-full"
        style={{ border: "1.5px solid rgba(255,209,102,0.9)", animationDelay: "90ms" }}
      />
      <FlameLicks />
      <span className="fx-scorch absolute inset-[12%] block">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <path
            d="M20 6 C26 5 33 9 34 16 C36 22 32 30 25 33 C18 36 9 33 6.5 26 C4 19 7 11 13 8 C15 6.8 17.5 6.3 20 6 Z"
            fill="rgba(16, 12, 8, 0.5)"
          />
          <path
            d="M12 14 C15 12 24 11.4 28 15 C30.6 18 30 25 25.5 27.6 C20 30.4 13 28 11 22.6 C9.8 19.4 10.4 16 12 14 Z"
            fill="rgba(10, 7, 4, 0.55)"
          />
        </svg>
      </span>
      <span
        className="fx-det-ring absolute inset-[14%] block rounded-full"
        style={{ border: "1px solid rgba(230, 168, 92, 0.95)" }}
      />
      {DET_VECTORS.map((v, i) => (
        <span
          key={i}
          className="fx-shard absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={
            {
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${v.delay}ms`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="h-full w-full">
            <polygon
              points={i % 2 === 0 ? "5,0 10,8 0,8" : "0,2 10,0 6,10"}
              fill={EMBER_FILL}
              stroke={EMBER_EDGE}
              strokeWidth="0.6"
            />
          </svg>
        </span>
      ))}
    </span>
  );
}

// --- 9. Card-fx motifs (CardFx: constraints and empowerments) ----------------
// One badge per affected square, painted by Board.tsx from fxZones' motif
// marks. Every badge is tinted by the CARD's tier color and stamped with the
// card's category glyph, so two different cards sharing a motif still read
// differently at a glance; the square's hover tooltip carries the exact card
// name and remaining turns. Entrances are one-shot CSS (mount-only), then a
// calm static pose; the transient rally banner ends fully transparent.

const MOTIF_DARK = "#141e2b";

/** Mirror of globals.css's .tier-N palette, for SVG strokes/fills. */
const TIER_COLOR: Record<number, string> = {
  1: "#7eb59a",
  2: "#8ba9c4",
  3: "#d8b56e",
  4: "#c79468",
  5: "#c66860",
  6: "#c65f8f",
  7: "#a877d8",
  8: "#e05252",
  9: "#f4c430",
  10: "#22d3ee",
};

// Same suit glyphs BuffCard stamps on card faces, shrunk to a micro-chip.
const CATEGORY_ICON: Record<BuffCategory, LucideIcon> = {
  movement: Wind,
  pieces: Castle,
  tempo: Timer,
  protection: Shield,
  attack: Swords,
  info: Eye,
  draft: Layers,
  nerf: Unlink,
  hex: Skull,
  item: Package,
};

/** The card's suit as a micro-chip beside the motif (per-card distinctness:
 * tier tint + suit + motif together identify the card at a glance). */
function CategoryChip({
  category,
  color,
  className,
  icon,
}: {
  category: BuffCategory;
  color: string;
  className: string;
  /** Per-card face icon (cardFaceIcon): when present the chip shows THIS
   * card's own glyph instead of the shared category suit, so every badge on
   * the board is unique to its card (owner request). */
  icon?: LucideIcon;
}) {
  const Icon = icon ?? CATEGORY_ICON[category];
  return (
    <span
      aria-hidden="true"
      className={
        "fx-motif-chip pointer-events-none absolute z-10 flex items-center justify-center rounded-[1px] border " +
        className
      }
      style={{ background: "rgba(20,30,43,0.92)", borderColor: color, color }}
    >
      <Icon size="72%" strokeWidth={2.6} aria-hidden />
    </span>
  );
}

/** Two-pass stroke: a dark understroke for contrast on both square colors,
 * then the tier-tinted line (currentColor) on top. */
function DualStroke({ d, dark = 2.3, light = 1 }: { d: string; dark?: number; light?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={MOTIF_DARK} strokeWidth={dark} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={light} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/** jail: a short run of chain links, the corner-badge cousin of ChainJail. */
function JailGlyph() {
  const links = [
    { x: 5.4, y: 5.6, a: 46, edge: false },
    { x: 10, y: 10.2, a: 44, edge: true },
    { x: 14.6, y: 14.8, a: 41, edge: false },
  ];
  return (
    <>
      {links.map((p, i) => (
        <g key={i} transform={`rotate(${p.a} ${p.x} ${p.y})`}>
          <ellipse cx={p.x} cy={p.y} rx={2.9} ry={p.edge ? 1.1 : 2} fill="none" stroke={MOTIF_DARK} strokeWidth={2.3} />
          <ellipse cx={p.x} cy={p.y} rx={2.9} ry={p.edge ? 1.1 : 2} fill="none" stroke="currentColor" strokeWidth={1} />
        </g>
      ))}
    </>
  );
}

/** muzzle: a padlock clamped over the jaw, harness straps to both sides. */
function MuzzleGlyph() {
  return (
    <>
      <DualStroke d="M0.8 11.5 H4.4 M15.6 11.5 H19.2" dark={2.1} light={0.9} />
      <DualStroke d="M6.8 8.8 V6.6 a3.2 3.2 0 0 1 6.4 0 V8.8" dark={2.4} light={1} />
      <rect x="4.8" y="8.8" width="10.4" height="8" rx="0.5" fill={MOTIF_DARK} stroke="currentColor" strokeWidth="1" />
      <circle cx="10" cy="12" r="1.15" fill="currentColor" />
      <path d="M10 12.6 V14.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

/** anchor: ring, shaft, crossbar, and curved flukes with barbs. */
function AnchorGlyph() {
  return (
    <>
      <circle cx="10" cy="3.6" r="1.7" fill="none" stroke={MOTIF_DARK} strokeWidth={2.2} />
      <circle cx="10" cy="3.6" r="1.7" fill="none" stroke="currentColor" strokeWidth={0.9} />
      <DualStroke d="M10 5.3 V15.8" />
      <DualStroke d="M6.4 8.2 H13.6" dark={2.1} light={1} />
      <DualStroke d="M3.6 11.6 C4.2 15.4 6.8 17.2 10 17.4 C13.2 17.2 15.8 15.4 16.4 11.6" />
      <DualStroke d="M3.6 11.6 L5.7 12.9 M16.4 11.6 L14.3 12.9" dark={2} light={0.9} />
    </>
  );
}

/** slow: an hourglass mid-pour, the sand tinted by the card's tier. */
function SlowGlyph() {
  return (
    <>
      <polygon points="10,12.8 12.6,16.4 7.4,16.4" fill="currentColor" />
      <path d="M10 10.4 V12.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <DualStroke d="M5.4 3 H14.6 M5.4 17 H14.6" dark={2.4} light={1} />
      <DualStroke d="M6.4 3.4 C6.4 7.4 9.4 8.4 9.4 10 C9.4 11.6 6.4 12.6 6.4 16.6" />
      <DualStroke d="M13.6 3.4 C13.6 7.4 10.6 8.4 10.6 10 C10.6 11.6 13.6 12.6 13.6 16.6" />
    </>
  );
}

/** empower: the granted movement's silhouette on the regalia roundel. A
 * rook that moves like a king wears the king mark, amazon-style upgrades a
 * crown; no moveAs falls back to a four-point regalia star. */
function RegaliaSilhouette({ type }: { type?: PieceType }) {
  const outline = { stroke: MOTIF_DARK, strokeWidth: 0.9, strokeLinejoin: "round" as const };
  switch (type) {
    case "k":
      return (
        <>
          <path d="M6.6 16.5 C5.2 12.4 7 9.2 10 9.2 C13 9.2 14.8 12.4 13.4 16.5 Z" fill="currentColor" {...outline} />
          <DualStroke d="M10 3 V7.6 M8.2 4.9 H11.8" dark={2.2} light={1} />
        </>
      );
    case "q":
      return (
        <path
          d="M4.6 15.5 L5.5 7.6 L8.3 10.8 L10 5.4 L11.7 10.8 L14.5 7.6 L15.4 15.5 Z"
          fill="currentColor"
          {...outline}
        />
      );
    case "r":
      return (
        <path
          d="M5.4 16 V10 L4.7 9.2 V4.5 H7.2 V6.4 H8.9 V4.5 H11.1 V6.4 H12.8 V4.5 H15.3 V9.2 L14.6 10 V16 Z"
          fill="currentColor"
          {...outline}
        />
      );
    case "b":
      return (
        <>
          <path
            d="M10 3.6 C12.8 5.8 14 8.4 14 10.8 C14 13.4 12.4 15.6 10 15.6 C7.6 15.6 6 13.4 6 10.8 C6 8.4 7.2 5.8 10 3.6 Z"
            fill="currentColor"
            {...outline}
          />
          <path d="M8.4 9.4 L11.4 6.2" stroke={MOTIF_DARK} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        </>
      );
    case "n":
      return (
        <>
          <path
            d="M5.8 16.4 C5.8 10.8 7.4 8.4 10.4 7 L9.9 3.8 L13.2 6.4 C15.6 8 16.2 11 15.7 16.4 Z"
            fill="currentColor"
            {...outline}
          />
          <circle cx="11.9" cy="7.6" r="0.7" fill={MOTIF_DARK} />
        </>
      );
    case "p":
      return (
        <>
          <circle cx="10" cy="7" r="2.7" fill="currentColor" {...outline} />
          <path d="M6.6 16.4 C7.1 12.6 8.1 11 10 11 C11.9 11 12.9 12.6 13.4 16.4 Z" fill="currentColor" {...outline} />
        </>
      );
    default:
      return (
        <path
          d="M10 3.2 L11.8 8.2 L16.8 10 L11.8 11.8 L10 16.8 L8.2 11.8 L3.2 10 L8.2 8.2 Z"
          fill="currentColor"
          {...outline}
        />
      );
  }
}

// A deterministic per-card accent. The constraint / empower / ward / blindfold
// glyphs are SHARED by many cards, so two cards with the same tier + category +
// motif (+ moveAs) would otherwise render an identical badge on a piece (e.g.
// two tier-6 movement "moves like a queen" empowers, double_amazon vs
// colossus). A small pip placed at an angle hashed from the card NAME breaks
// that tie, so no two DIFFERENT active cards paint the same icon. The tier tint
// and category chip already separate cards of different tier / suit; this only
// distinguishes the residual same-tier + same-category collisions.
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A two-pass tinted pip on a ring at `angleDeg` (dark understroke for contrast
 * on both square colors, then the tier-tinted dot): the per-card accent stamped
 * into a shared motif glyph. */
function AccentPip({ cx, cy, r, angleDeg }: { cx: number; cy: number; r: number; angleDeg: number }) {
  const a = (angleDeg * Math.PI) / 180;
  const x = cx + r * Math.cos(a);
  const y = cy + r * Math.sin(a);
  return (
    <>
      <circle cx={x} cy={y} r={1.9} fill={MOTIF_DARK} />
      <circle cx={x} cy={y} r={1.15} fill="currentColor" />
    </>
  );
}

/** Corner slot Board's per-square corner allocator assigns to a
 * corner-anchored mark (see Board.tsx): tl / tr / bl / br. */
export type BadgeCorner = "tl" | "tr" | "bl" | "br";

// Corner-anchored badge geometry per allocated corner: the badge hugs its
// corner and the category chip sits inboard of it along the same edge, so the
// pair reads as one mark wherever the allocator parks it. Two tables because
// the empower roundel keeps its historic 2%/34% insets while the constraint
// badges keep 3%/33% (the exact top-right look both had before corners were
// allocatable). Full literal class strings so the Tailwind JIT sees them.
const BESTOW_POS: Record<BadgeCorner, { badge: string; chip: string }> = {
  tr: { badge: "right-[2%] top-[2%]", chip: "right-[2%] top-[34%]" },
  tl: { badge: "left-[2%] top-[2%]", chip: "left-[2%] top-[34%]" },
  br: { badge: "right-[2%] bottom-[2%]", chip: "right-[2%] bottom-[34%]" },
  bl: { badge: "left-[2%] bottom-[2%]", chip: "left-[2%] bottom-[34%]" },
};
const MOTIF_POS: Record<BadgeCorner, { badge: string; chip: string }> = {
  tr: { badge: "right-[3%] top-[3%]", chip: "right-[3%] top-[33%]" },
  tl: { badge: "left-[3%] top-[3%]", chip: "left-[3%] top-[33%]" },
  br: { badge: "right-[3%] bottom-[3%]", chip: "right-[3%] bottom-[33%]" },
  bl: { badge: "left-[3%] bottom-[3%]", chip: "left-[3%] bottom-[33%]" },
};

/** Hash-picked badge backplate: the dark plate behind a corner badge's glyph.
 * Five shapes (roundel / heater shield / hexagon / diamond / octagon seal),
 * chosen by the card id, so two cards sharing a motif differ in silhouette as
 * well as tint, icon and accent. Same ink fill + tier-tinted 1px stroke the
 * empower roundel always had, so the glyph on top stays readable. */
function BadgeBackplate({ variant }: { variant: number }) {
  const common = {
    fill: "rgba(20,30,43,0.9)",
    stroke: "currentColor",
    strokeWidth: 1,
    strokeLinejoin: "round" as const,
  };
  switch (variant) {
    case 1: // heater shield
      return <path d="M10 1.2 L17.8 4.2 V9.6 C17.8 14.6 14.6 17.6 10 19 C5.4 17.6 2.2 14.6 2.2 9.6 V4.2 Z" {...common} />;
    case 2: // hexagon
      return <path d="M10 1 L17.8 5.5 V14.5 L10 19 L2.2 14.5 V5.5 Z" {...common} />;
    case 3: // diamond
      return <path d="M10 0.9 L19.1 10 L10 19.1 L0.9 10 Z" {...common} />;
    case 4: // octagon seal
      return <path d="M6.6 1.6 H13.4 L18.4 6.6 V13.4 L13.4 18.4 H6.6 L1.6 13.4 V6.6 Z" {...common} />;
    default: // roundel (also the id-less fallback: the historic look)
      return <circle cx="10" cy="10" r="8.8" {...common} />;
  }
}

/**
 * Card-fx motif for one square. Constraints (jail / muzzle / anchor / slow)
 * are small corner badges; blindfold is a band across the piece base; empower
 * is a regalia roundel bestowed with a knighting rise; ward is a thin ring at
 * the piece base; rally is a one-shot banner flourish over the rallied army's
 * king. All persistent variants end in a calm static pose (reduced motion
 * shows that state directly); rally is transient and hides under reduced
 * motion, matching the stun precedent.
 *
 * Per-card distinctness: every badge is tinted by the card's TIER color,
 * plated on a card-id-hashed BACKPLATE shape (BadgeBackplate), and co-stamped
 * with its CATEGORY glyph (CategoryChip); a NAME-seeded accent pip (see
 * nameHash / AccentPip) breaks any remaining ties, so no two different active
 * cards ever look identical.
 *
 * `corner` is the slot Board's corner allocator assigned on this square (only
 * the corner-anchored motifs — empower and the constraint badges — use it;
 * bands and banners are edge/center-anchored). Defaults to the historic
 * top-right for callers that do not allocate.
 */
export const MotifBadge = React.memo(function MotifBadge({
  motif,
  tier,
  category,
  moveAs,
  name,
  cardId,
  cardIcon,
  corner = "tr",
}: {
  motif: CardFx["motif"];
  tier: number;
  category: BuffCategory;
  moveAs?: PieceType;
  /** Card id + explicit icon name: resolves the card's OWN face icon for the
   * badge chip, so two cards sharing a motif never wear the same mark. */
  cardId?: string;
  cardIcon?: string;
  /** Card name: seeds the deterministic per-card accent pip. Optional and
   * backward compatible: when Board does not forward it the badge simply omits
   * the accent (the tier tint + category glyph still apply). Board has it in
   * hand at the MotifBadge call site (motifMark.name, already used for the
   * React key), so wiring it through is a one-line change. */
  name?: string;
  /** Board-allocated corner for the corner-anchored badges (default tr). */
  corner?: BadgeCorner;
}) {
  const color = TIER_COLOR[tier] ?? TIER_COLOR[3];
  const accent = name ? nameHash(name) : null;
  const accentAngle = accent != null ? accent % 360 : null;
  const faceIcon = cardId ? cardFaceIcon(cardId, category, cardIcon) : undefined;
  // Backplate silhouette, hashed from the card ID (deterministic across
  // clients). Id-less callers keep the historic roundel.
  const plate = cardId ? nameHash(cardId) % 5 : 0;
  if (motif === "rally") {
    return (
      <span
        aria-hidden="true"
        className="fx-rally pointer-events-none absolute left-[24%] top-[-8%] z-20 h-[56%] w-[52%]"
        style={{ color }}
      >
        <svg viewBox="0 0 20 24" className="h-full w-full">
          <path d="M6 22 V3" stroke={MOTIF_DARK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M6 22 V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
          <path
            d="M6 3.5 H17 L14.2 6.8 L17 10 H6 Z"
            fill="currentColor"
            stroke={MOTIF_DARK}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        <CategoryChip category={category} color={color} icon={faceIcon} className="bottom-[6%] left-0 h-[26%] w-[24%]" />
      </span>
    );
  }
  if (motif === "blindfold") {
    return (
      <>
        <span
          aria-hidden="true"
          className="fx-blindfold pointer-events-none absolute bottom-[22%] left-[8%] right-[8%] z-10 h-[15%]"
          style={{ color }}
        >
          <svg viewBox="0 0 60 12" preserveAspectRatio="none" className="h-full w-full">
            <rect x="1" y="2" width="58" height="8" rx="0.6" fill={MOTIF_DARK} stroke="currentColor" strokeWidth="1" />
            <path
              d="M5 6 H55"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 2.6"
              opacity="0.65"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            {accent != null && <AccentPip cx={6 + (accent % 48)} cy={6} r={0} angleDeg={0} />}
          </svg>
        </span>
        <CategoryChip category={category} color={color} icon={faceIcon} className="bottom-[40%] right-[3%] h-[15%] w-[15%]" />
      </>
    );
  }
  if (motif === "ward") {
    return (
      <>
        <span
          aria-hidden="true"
          className="fx-ward pointer-events-none absolute bottom-[3%] left-[10%] right-[10%] z-10 h-[16%]"
          style={{ color }}
        >
          <svg viewBox="0 0 60 12" preserveAspectRatio="none" className="h-full w-full">
            <ellipse cx="30" cy="6" rx="27.5" ry="4.4" fill="none" stroke={MOTIF_DARK} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            <ellipse cx="30" cy="6" rx="27.5" ry="4.4" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {accent != null && <AccentPip cx={6 + (accent % 48)} cy={6} r={0} angleDeg={0} />}
          </svg>
        </span>
        <CategoryChip category={category} color={color} icon={faceIcon} className="bottom-[22%] right-[3%] h-[15%] w-[15%]" />
      </>
    );
  }
  if (motif === "empower") {
    const pos = BESTOW_POS[corner];
    return (
      <>
        <span
          aria-hidden="true"
          className={`fx-bestow pointer-events-none absolute z-10 h-[32%] w-[32%] ${pos.badge}`}
          style={{ color }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <BadgeBackplate variant={plate} />
            <RegaliaSilhouette type={moveAs} />
            {accentAngle != null && <AccentPip cx={10} cy={10} r={8.8} angleDeg={accentAngle} />}
          </svg>
        </span>
        <CategoryChip category={category} color={color} icon={faceIcon} className={`${pos.chip} h-[15%] w-[15%]`} />
      </>
    );
  }
  const pos = MOTIF_POS[corner];
  return (
    <>
      <span
        aria-hidden="true"
        className={`fx-motif pointer-events-none absolute z-10 h-[30%] w-[30%] ${pos.badge}`}
        style={{ color }}
      >
        <svg viewBox="0 0 20 20" className="h-full w-full opacity-90">
          <BadgeBackplate variant={plate} />
          {motif === "jail" ? (
            <JailGlyph />
          ) : motif === "muzzle" ? (
            <MuzzleGlyph />
          ) : motif === "anchor" ? (
            <AnchorGlyph />
          ) : (
            <SlowGlyph />
          )}
          {accentAngle != null && <AccentPip cx={10} cy={10} r={9} angleDeg={accentAngle} />}
        </svg>
      </span>
      <CategoryChip category={category} color={color} icon={faceIcon} className={`${pos.chip} h-[15%] w-[15%]`} />
    </>
  );
});

// --- 9b. Bound-buff marker (Duelist-style piece markers) ---------------------
// A small, subtle corner sigil for a piece carrying a piece-bound ongoing buff
// that declares no CardFx motif (Duelist, a placed phantom rook, and the like).
// Board.tsx derives the marked squares from the public game.buffs and mounts one
// per marked piece, visible to BOTH players, tinted by the card's tier and
// stamped with its category suit so two different bound cards read differently.
// The full card name + rule text live in the hover/focus popover, not here.

export const BoundBuffMark = React.memo(function BoundBuffMark({
  tier,
  category,
}: {
  tier: number;
  category: BuffCategory;
}) {
  const color = TIER_COLOR[tier] ?? TIER_COLOR[3];
  const Icon = CATEGORY_ICON[category];
  return (
    <span aria-hidden="true" className="fx-bound block h-full w-full" style={{ color }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full border"
        style={{ background: "rgba(20,30,43,0.92)", borderColor: color }}
      >
        <Icon size="60%" strokeWidth={2.4} aria-hidden />
      </span>
    </span>
  );
});

// --- 10. Signature animations (marquee attack-card spectacles) ---------------
// A signature is a choreographed, staggered sequence played over the enemy
// squares an attack card just cleared. Board.tsx derives those squares from
// its own prev/next diff (the same detonation pass), orders them per the
// card's ordering rule, and mounts ONE SignatureOverlay per affected square
// with an animation-delay = order * stagger, so the effect rolls across the
// board instead of firing all at once. Every piece is transform/opacity-only
// and one-shot: like the other transient flourishes they are hidden entirely
// under reduced motion (the static end state is simply the cleared squares).
// The registry is keyed by card id; Board looks the card up when a played-card
// event surfaces its id, and both players see the identical sequence.

export type SigVisual =
  // Plug-in visuals (sigPlugins.tsx): `x:<card_id>` routes the overlay's
  // default case to a registered plugin module (godPlays / funnyPlays).
  | `x:${string}`
  | "nova"
  | "trapdoor"
  | "stone"
  | "strike"
  | "atomic"
  | "pin"
  | "siege"
  // --- Batch 2 (effect-data sourced; see SIGNATURES note) ---
  | "coronation"
  | "crownrain"
  | "colossus"
  | "snooze"
  | "clockcage"
  | "clockice"
  | "blitz"
  | "frostsweep"
  | "petrify"
  | "petrifiedforest"
  | "aegis"
  | "cathedral"
  | "shades"
  | "wallbuild"
  // --- Batch 3 (distinctness split + fantasy coverage) ---
  // Freeze family (was all "frostsweep"): each ice card its own read.
  | "snapfrost"
  | "deepglacier"
  | "iceshatter"
  | "chainfreeze"
  // Petrify / stone family (was all "petrify").
  | "gorgonstare"
  | "medusagaze"
  | "serpentstone"
  | "wither"
  | "stonechain"
  | "greyhex"
  // Walls / summons / graves.
  | "greatwall"
  | "summonrift"
  | "dragonrise"
  | "meteor"
  | "gravehands"
  | "holylight"
  | "icewall"
  | "thornwall"
  // Empower / regalia grants.
  | "bladegift"
  | "wings"
  | "warhorn"
  // Fantasy removals (marquee attack cards).
  | "dragonfire"
  | "scythe"
  | "arclight"
  | "dive"
  | "smite"
  // Court decree (skip).
  | "decree"
  // --- Batch 4 (WILD set + Computer Virus) ---
  // Fire / earth / storm removals (detonation diff).
  | "inferno"
  | "hellfire"
  | "rockfall"
  | "unmake"
  | "wreckingball"
  | "pinata"
  | "artillery"
  | "spearcharge"
  | "tankroll"
  // Ice / storm / weather.
  | "hailstorm"
  | "blizzard"
  | "stormcloud"
  // Earth / fortification builds.
  | "stonerise"
  | "mountainwall"
  | "trench"
  // Reinforcements.
  | "reinforce"
  | "paradrop"
  | "geniepoof"
  // Suppression / time / corruption.
  | "suppress"
  | "timestop"
  | "glitch"
  // --- Batch 5 (library core + wild + funny second pass) ---
  // Removals, wards, clock theft, teleports, more walls / voids / summons.
  | "disintegrate"
  | "cavalrycharge"
  | "stonehide"
  | "wardpulse"
  | "canopy"
  | "sistergrove" // ilovemysister (was canopy, shared with we_verdant_shield)
  | "chronosteal"
  | "blink"
  | "portal"
  | "borderward"
  | "banana"
  | "minefield"
  | "vortex"
  // --- Batch 6 (marquee dragon + wizard spectacles for the top tier) ---
  | "dragonlord"
  | "archmage"
  // --- Batch 7 (marquee sea / monster + top-tier boardwide spectacles) ---
  | "kraken"
  | "abyss"
  | "whirlpool"
  | "flood"
  | "frozenmoat"
  | "meteorstorm"
  | "phoenixrise"
  // --- Batch 8 (flavor pass): unregistered removals that render off the
  // detonation diff, plus a set of effect-data spectacles keyed like their
  // shipped peers (empower / frozen / walnut / rally / summon / blindfold).
  // Removal-sourced visuals fire today; the effect-data ones join the same
  // inert-until-wired zone set as banner_of_war and the rest of Batch 2-7. ---
  | "detonate"
  | "cinderstrike"
  | "purgestorm"
  | "roulette"
  | "purgeline"
  | "calldown"
  | "annihilation"
  | "meteorcross"
  | "purgerealm"
  | "ruin"
  | "bannerwar"
  | "iceage"
  | "masspetrify"
  | "walnutcurse"
  | "amazoncrown"
  | "titanlegion"
  | "livinggod"
  | "eternalreign"
  | "godslayer"
  | "onslaught"
  | "resurrection"
  | "ironlegion"
  | "secondcoming"
  | "worldend"
  | "lavafloor"
  | "necromancer"
  | "werewolf"
  | "rustlock"
  | "grandrevive"
  | "lastmeal"
  // --- Batch 9 (thematic character-matched signatures): the Italian-brainrot
  // meme cards + a spread of high-flavor library cards that still fired a reused
  // motif. Each gets its OWN bespoke inline-SVG spectacle (never a shared one).
  | "crocbomber"
  | "sharkdash"
  | "goosebomb"
  | "clockelephant"
  | "coldsnap"
  | "bananape"
  | "tirefrog"
  | "oblivionwipe"
  | "bloodpact"
  | "regicideblade"
  | "divineright"
  | "ascendancy"
  | "mandate"
  | "blackout"
  | "griffoncarry"
  | "grandarmy"
  | "mortgagesign"
  | "reporook"
  | "musicalchairs"
  | "devildeal"
  | "berserkrage"
  | "encase"
  | "snowballsplat"
  | "galephase"
  | "oppositeday"
  // --- Batch 10 (board-wide virus + gambling wheels + brainrot drum-man + a
  // slapstick funny batch). computer_virus is upgraded from the single-square
  // "glitch" to a board-wide corruption spread; the gambling cards get spinning
  // wheels / a slot machine / a coin flip; tung_tung_sahur finally gets its own
  // drum-man bonk; and a spread of comedic library cards each get a bespoke gag.
  | "virusspread"
  | "totalwar"
  | "fortunewheel"
  | "slotmachine"
  | "coinflip"
  | "drumbonk"
  | "rakebonk"
  | "flyswat"
  | "sleepcap"
  | "superglue"
  | "beartrap"
  | "anvildrop"
  | "boxingglove"
  | "bubblewrap"
  | "vertigo"
  | "origami"
  | "gremlins"
  | "homesick"
  | "jetlag"
  | "hillflag"
  | "sugarrush"
  // --- Batch 11 (fantasy & meta spectacles): every FANTASY card that still
  // had no bespoke signature becomes a board-wide statement (oversized lead
  // clipped by the board crop, like the dragon / wizard / brainrot takeovers),
  // and the FUNNY + PT ("meta") sets get full card-for-card coverage.
  // Fantasy earth / artifact / necromancy / transform / curse spectacles.
  | "sinkhole"
  | "fissurefield"
  | "dominionorb"
  | "phylactery"
  | "metamorph"
  | "godhood"
  | "transmute"
  | "queenshackle"
  | "frailty"
  | "doomtide"
  // Funny / PT clock economy.
  | "deadlineclock"
  | "whistleblast"
  | "timeoutflag"
  | "cashclock"
  | "overclock"
  // PT gambling / faustian market.
  | "allin"
  | "mysterybox"
  | "swapmeet"
  | "goldtouch"
  // PT curses & chaos.
  | "outoffice"
  | "sneeze"
  | "tornado"
  | "glassdome"
  | "vhsrewind"
  | "hotpotato"
  | "pinocchionose"
  | "seamonkeys"
  | "snailslow"
  | "snoozebar"
  | "stinkcloud"
  | "whoopee"
  | "springtrap"
  // PT passives.
  | "contagion"
  | "fanclub"
  | "gravitywell"
  | "magnetpull"
  | "photosyn"
  | "termitegnaw"
  | "picketline"
  // Funny slapstick / summons / transforms.
  | "creampie"
  | "photocopy"
  | "umbrella"
  | "spotlight"
  | "internpop"
  | "cratedrop"
  | "rentarook"
  | "pizzarun"
  // --- Batch 14 (tier 7+ name-match pass: every 7+ card unique & distinct) ---
  // Splits of visuals that used to be shared by two-plus tier 7+ cards, so no
  // two of them ever play the same art.
  | "crownlegion" // amazon_army (was crownrain, shared with triple_amazon)
  | "agesward" // aegis_of_ages (was aegis, shared three ways)
  | "dugin" // ww_dug_in_defense (was aegis)
  | "chalkcircle" // summoning_circle (was summonrift)
  | "kingsmuster" // kings_legion (was summonrift)
  | "totalannihilation" // total_annihilation (was dragonlord, shared with queens_apocalypse)
  | "voidrealm" // void_realm (was archmage, shared with grand_reset)
  | "sanctrise" // full_resurrection (was phoenixrise, shared with phoenix_rebirth)
  // --- Gambling wheels (owner add-on: every gambling card spins a wheel) ---
  | "goldwheel" // jackpot: gold coin wheel, pays out on landing
  | "gamblewheel" // gamble: red/gold double-or-nothing wedges
  | "zodiacwheel" // zodiac_wheel: midnight star-chart houses
  | "dicewheel" // wa_high_roll: die-pip wedges
  | "runewheel"; // wa_arcane_reroll: rune-etched reroll wheel
export type SigOrdering = "file" | "sweep" | "octagon" | "line" | "radial";
export type SigSoundKey =
  | "nova"
  | "cataclysm"
  | "extinction"
  | "lightning"
  | "atomic"
  | "rampage"
  | "siege"
  // --- Batch 2 voices ---
  | "coronation"
  | "crownrain"
  | "colossus"
  | "snooze"
  | "clockcage"
  | "clockice"
  | "blitz"
  | "massfreeze"
  | "petrify"
  | "petrifiedforest"
  | "aegis"
  | "cathedral"
  | "shades"
  | "wall";

/**
 * Where Board derives a signature's target squares. Batch 1 signatures read
 * the removal (detonation) diff ("removal", the default). Batch 2 spectacles
 * decorate pieces that STAY on the board (coronations, freezes, petrifies,
 * shields, skips), so their squares come from the fx-effect zones that
 * computeFxVisual/draftZones already paint. Each value below names the zone
 * Board should feed the signature instead of the removal diff:
 *   frozen   -> visual.frozenSquares          (mass/deep/eternal freeze)
 *   walnut   -> visual.walnutSquares          (medusa / basilisk / petrified forest)
 *   shield   -> visual.shieldedSquares        (aegis / divine fortress)
 *   kingSafe -> visual.kingSafeSquares        (immortal king)
 *   stun     -> visual.stunSquares            (time skip / freeze / prison)
 *   empower  -> motifSquares (motif "empower") (amazon / god knight / colossus / titan / army)
 *   slow     -> motifSquares (motif "slow")
 *   blindfold-> motifSquares (motif "blindfold") (great wall)
 *   rally    -> motifSquares (motif "rally")   (blitzkrieg)
 *   summon   -> squares that just gained a piece (rampart wall)
 */
export type SigZone =
  | "removal"
  | "frozen"
  | "walnut"
  | "shield"
  | "kingSafe"
  | "stun"
  | "empower"
  | "slow"
  | "blindfold"
  | "rally"
  | "summon";

export interface SignatureConfig {
  /** How Board sorts the cleared squares into the detonation sequence. */
  ordering: SigOrdering;
  /** Milliseconds between successive squares in the sequence. */
  staggerMs: number;
  /** Which removed piece types this signature owns (others fall back to the
   * plain detonation burst); "all" claims every cleared square. For an
   * effect-data signature (source !== "removal") this is advisory: Board takes
   * the squares from the named zone, but the list still documents which pieces
   * the card touches. */
  victims: PieceType[] | "all";
  /** Line-based signatures (rook / queen charge) anchor their order on the
   * origin square of the piece of this type that moved this turn. */
  mover?: PieceType;
  /** Per-square visual. */
  visual: SigVisual;
  /** True when the signature paints a lead flourish (nova's pop, atomic's
   * central thump, the siege muzzle) as well as the per-target hits. */
  hasLead: boolean;
  /** Voice key (mapped to a sounds.ts function by Board). */
  sound: SigSoundKey;
  /** Target-square source. Omitted / "removal" = the detonation diff (Batch 1).
   * Any other value routes Board to the named fx-effect zone (Batch 2). */
  source?: SigZone;
}

/** The shipped Batch 1 signatures. Every one derives its target squares purely
 * from the board diff AND is played through a surfaced play event (an activated
 * card or a draft instant), so no engine hook is needed. Nova / Siege Rook /
 * Queen's Rampage / Queen's Wrath / Lightning Strike are activated; Cataclysm
 * and Extinction are draft instants (fired at pick time on both surfaces).
 *
 * ON-CAPTURE HOOK (wired): atomic_captures / atomic_captures_small are passive
 * on-capture augments (captureExplosion in the engine). A plain capture emits
 * no card-play event, but the explosion clears enemy pieces via
 * api.removePiece, which bumps the buff mutation counter INSIDE the move's
 * held-buff hook loop (game.ts). playMove records that observable hook fire in
 * buffs.lastHookMutations, and OnlineMatch.reportHookMutations then fires the
 * card's signature — so the octagon of cleared squares (a removal diff) is
 * dressed by the AtomicBurst visual with the playAtomic voice, exactly like a
 * cast card. This is deterministic and part of synced state: playMove runs
 * identically on both clients from the same move, so both animate the blast
 * and neither double-fires (a single fired entry, guarded in
 * reportHookMutations). The signature plays only when the blast actually
 * cleared a piece (an empty-neighbourhood capture bumps nothing, so no stray
 * atomic flash). Their plugin art lives in greatPlays/basicPlays.
 *
 * BATCH 2 (source !== "removal"): the entries below decorate pieces that STAY
 * on the board, so they carry NO detonation diff for orderSignature to key on.
 * Their art (SignatureOverlay cases), config, and voices (sounds.ts) are
 * complete here; two small wiring steps remain in Board.tsx / fxZones.ts (both
 * outside this file), documented per entry via `source`:
 *   1. Feed target squares from the named fx zone instead of the removal diff
 *      (computeBoardFx currently only paints signatures over detSquares).
 *   2. Add one `playSignature` switch case per new SigSoundKey (the switch
 *      lives in Board.tsx; unknown keys fall back to playExplosion today).
 * Registering them here is inert until then (fireSignature marks them active,
 * but with no detSquares nothing renders and no signature voice plays), so it
 * is safe to ship the dispatcher layer ahead of the board wiring. */
// Batch 12 — tier 5+ board-wide guarantee: every SIGNATURES entry whose card is
// tier >= 5 now sets hasLead, and every visual those entries name renders a
// board-wide lead branch (the oversized-clipped BoardWideStage pattern), so no
// high-tier card resolves with only per-square pops.
// Batch 13 — board-wide lead upgrade: the tier 5+ visuals whose existing leads
// were square-local flashes/rings (aegis, smite, blitz, coronation, kraken,
// worldend families and peers) now take over the whole crop via BoardWideLead.
export const SIGNATURES: Record<string, SignatureConfig> = {
  nova: { ordering: "file", staggerMs: 130, victims: "all", visual: "nova", hasLead: true, sound: "nova" },
  cataclysm: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "trapdoor", hasLead: true, sound: "cataclysm" },
  extinction: { ordering: "sweep", staggerMs: 65, victims: ["p", "n", "b"], visual: "stone", hasLead: true, sound: "extinction" },
  lightning_strike: { ordering: "sweep", staggerMs: 165, victims: "all", visual: "strike", hasLead: true, sound: "lightning" },
  queens_rampage: { ordering: "line", staggerMs: 105, victims: "all", mover: "q", visual: "pin", hasLead: true, sound: "rampage" },
  queens_wrath: { ordering: "line", staggerMs: 110, victims: "all", mover: "q", visual: "pin", hasLead: true, sound: "rampage" },
  siege_rook: { ordering: "line", staggerMs: 85, victims: "all", mover: "r", visual: "siege", hasLead: true, sound: "siege" },

  // --- Batch 2: movement / coronation grants (empower motif zone) ---
  amazon_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  god_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  double_amazon: { ordering: "sweep", staggerMs: 110, victims: ["n"], visual: "crownrain", hasLead: true, sound: "crownrain", source: "empower" },
  triple_amazon: { ordering: "sweep", staggerMs: 100, victims: ["n"], visual: "crownrain", hasLead: true, sound: "crownrain", source: "empower" },
  amazon_army: { ordering: "sweep", staggerMs: 90, victims: ["n", "b"], visual: "crownlegion", hasLead: true, sound: "crownrain", source: "empower" },
  colossus: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "colossus", hasLead: true, sound: "colossus", source: "empower" },
  titan: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "colossus", hasLead: true, sound: "colossus", source: "empower" },

  // --- Batch 2: time / tempo (skip -> stun zone; blitz -> rally zone) ---
  time_skip: { ordering: "radial", staggerMs: 0, victims: "all", visual: "snooze", hasLead: true, sound: "snooze", source: "stun" },
  time_prison: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockcage", hasLead: true, sound: "clockcage", source: "stun" },
  time_freeze: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockice", hasLead: true, sound: "clockice", source: "stun" },
  blitzkrieg: { ordering: "radial", staggerMs: 70, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },

  // --- Batch 2: freeze spectacles (frozen zone) --- now each its own read:
  // a quick spike-frost snap, a slab of deep glacier, an eternal ice shatter.
  mass_freeze: { ordering: "radial", staggerMs: 45, victims: ["p", "n", "b", "r", "q"], visual: "snapfrost", hasLead: true, sound: "massfreeze", source: "frozen" },
  deep_freeze: { ordering: "radial", staggerMs: 55, victims: ["p", "n", "b", "r", "q"], visual: "deepglacier", hasLead: true, sound: "massfreeze", source: "frozen" },
  eternal_freeze: { ordering: "radial", staggerMs: 65, victims: ["p", "n", "b", "r", "q"], visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },

  // --- Batch 2: petrify / curse (walnut zone) --- gorgon beam vs snake-hair
  // wash, so the two Medusa cards no longer read the same.
  medusas_stare: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "gorgonstare", hasLead: true, sound: "petrify", source: "walnut" },
  medusa_stare: { ordering: "radial", staggerMs: 40, victims: "all", visual: "medusagaze", hasLead: true, sound: "petrify", source: "walnut" },
  petrified_forest: { ordering: "sweep", staggerMs: 70, victims: ["n", "b"], visual: "petrifiedforest", hasLead: true, sound: "petrifiedforest", source: "walnut" },

  // --- Batch 2: protection ---
  aegis: { ordering: "radial", staggerMs: 35, victims: "all", visual: "aegis", hasLead: true, sound: "aegis", source: "shield" },
  immortal_king: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "shades", hasLead: true, sound: "shades", source: "kingSafe" },
  divine_fortress: { ordering: "radial", staggerMs: 40, victims: "all", visual: "cathedral", hasLead: true, sound: "cathedral", source: "shield" },
  rampart: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "wallbuild", hasLead: true, sound: "wall", source: "summon" },
  great_wall: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "greatwall", hasLead: true, sound: "wall", source: "blindfold" },

  // --- Batch 3: FANTASY set (src/engine/buffs/fantasy/*). Each entry reuses an
  // existing SigSoundKey and an already-wired source zone; the visual is a new
  // key matched to the card's actual effect so every one reads distinctly. ---

  // Beasts / attack line sweeps + smites (removal diff, the default source).
  dragons_breath: { ordering: "line", staggerMs: 80, victims: "all", mover: "r", visual: "dragonfire", hasLead: true, sound: "atomic" },
  wyverns_dive: { ordering: "line", staggerMs: 90, victims: "all", mover: "n", visual: "dive", hasLead: false, sound: "rampage" },
  soul_harvest: { ordering: "line", staggerMs: 95, victims: "all", mover: "q", visual: "scythe", hasLead: true, sound: "rampage" },
  chain_lightning: { ordering: "line", staggerMs: 110, victims: "all", mover: "b", visual: "arclight", hasLead: true, sound: "lightning" },
  judgment_day: { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], visual: "smite", hasLead: true, sound: "lightning" },
  heavens_wrath: { ordering: "sweep", staggerMs: 150, victims: ["n", "b", "r", "q"], visual: "smite", hasLead: true, sound: "lightning" },

  // Freeze / stasis (frozen zone).
  staff_of_stasis: { ordering: "radial", staggerMs: 0, victims: "all", visual: "chainfreeze", hasLead: true, sound: "massfreeze", source: "frozen" },
  evil_eye: { ordering: "radial", staggerMs: 0, victims: "all", visual: "frostsweep", hasLead: false, sound: "massfreeze", source: "frozen" },

  // Petrify / stone (walnut zone).
  basilisk_stare: { ordering: "radial", staggerMs: 0, victims: "all", visual: "gorgonstare", hasLead: true, sound: "petrify", source: "walnut" },
  serpent_brood: { ordering: "sweep", staggerMs: 60, victims: ["b"], visual: "serpentstone", hasLead: false, sound: "petrify", source: "walnut" },
  withering_touch: { ordering: "radial", staggerMs: 0, victims: "all", visual: "wither", hasLead: true, sound: "petrify", source: "walnut" },
  chains_of_binding: { ordering: "sweep", staggerMs: 70, victims: ["r"], visual: "stonechain", hasLead: true, sound: "petrify", source: "walnut" },
  hex_of_stone: { ordering: "sweep", staggerMs: 55, victims: ["n", "b"], visual: "greyhex", hasLead: true, sound: "petrify", source: "walnut" },

  // Divine / protection (shield + kingSafe zones).
  aegis_of_ages: { ordering: "radial", staggerMs: 35, victims: "all", visual: "agesward", hasLead: true, sound: "aegis", source: "shield" },
  divine_intervention: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "holylight", hasLead: true, sound: "shades", source: "kingSafe" },

  // Court decree (stun zone).
  divine_reckoning: { ordering: "radial", staggerMs: 0, victims: "all", visual: "decree", hasLead: true, sound: "snooze", source: "stun" },

  // Regalia / movement grants (empower zone).
  excalibur: { ordering: "radial", staggerMs: 0, victims: ["b"], visual: "bladegift", hasLead: true, sound: "coronation", source: "empower" },
  dragon_form: { ordering: "radial", staggerMs: 0, victims: ["r"], visual: "wings", hasLead: true, sound: "colossus", source: "empower" },
  celestial_ascension: { ordering: "sweep", staggerMs: 80, victims: ["b"], visual: "wings", hasLead: true, sound: "colossus", source: "empower" },
  god_king: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  banner_of_war: { ordering: "radial", staggerMs: 60, victims: ["n"], visual: "bannerwar", hasLead: true, sound: "blitz", source: "empower" },

  // Barred walls (blindfold zone).
  frost_wall: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "icewall", hasLead: true, sound: "wall", source: "blindfold" },
  wall_of_thorns: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "thornwall", hasLead: true, sound: "wall", source: "blindfold" },

  // Summons / reinforcements / graves (summon zone).
  summon_dragon: { ordering: "radial", staggerMs: 0, victims: "all", visual: "dragonrise", hasLead: true, sound: "wall", source: "summon" },
  starfall: { ordering: "radial", staggerMs: 0, victims: "all", visual: "meteor", hasLead: true, sound: "wall", source: "summon" },
  army_of_the_dead: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "gravehands", hasLead: true, sound: "wall", source: "summon" },
  raise_dead: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "gravehands", hasLead: false, sound: "wall", source: "summon" },
  undying_thrall: { ordering: "radial", staggerMs: 0, victims: "all", visual: "gravehands", hasLead: false, sound: "wall", source: "summon" },
  hallowed_return: { ordering: "radial", staggerMs: 0, victims: "all", visual: "holylight", hasLead: true, sound: "wall", source: "summon" },
  imp_familiar: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  summoning_circle: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "chalkcircle", hasLead: true, sound: "wall", source: "summon" },
  horn_of_summoning: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },
  roost_of_rocs: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },
  phantom_guardian: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  stone_golem: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },
  direwolf_pack: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },

  // --- Batch 4: WILD set (wild/elemental|warfare|arcane|chaos) + Computer
  // Virus. Removal-sourced entries (fire / storm / siege charges /
  // disintegration / wrecking ball) render off the detonation diff today; the
  // effect-data-sourced ones (freeze / walnut / wall / summon / shield / stun
  // zones) join the inert-until-wired Batch 2/3 set. Every entry reuses an
  // existing SigSoundKey and SigZone; transforms are left to the crown morph
  // flourish (they carry no detonation and already read as a coronation). ---

  // FIRE (wild/elemental): big removals and a queen's hellfire beam.
  we_immolation: { ordering: "radial", staggerMs: 0, victims: ["r", "q"], visual: "inferno", hasLead: true, sound: "atomic" },
  we_conflagration: { ordering: "sweep", staggerMs: 120, victims: ["p", "n", "b"], visual: "inferno", hasLead: true, sound: "cataclysm" },
  we_flame_lance: { ordering: "line", staggerMs: 95, victims: "all", mover: "r", visual: "dragonfire", hasLead: true, sound: "atomic" },
  we_hellfire_beam: { ordering: "line", staggerMs: 70, victims: "all", mover: "q", visual: "hellfire", hasLead: true, sound: "cataclysm" },

  // ICE (wild/elemental): mass freezes, an ice wall, a whiteout blizzard.
  we_hailstorm: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "hailstorm", hasLead: false, sound: "massfreeze", source: "frozen" },
  we_flash_freeze: { ordering: "radial", staggerMs: 40, victims: "all", visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },
  we_glacier_wall: { ordering: "sweep", staggerMs: 50, victims: "all", visual: "icewall", hasLead: true, sound: "wall", source: "blindfold" },
  we_whiteout: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blizzard", hasLead: true, sound: "clockice", source: "stun" },

  // EARTH (wild/elemental): petrify, summon, rock walls, a landslide.
  we_petrify_ranks: { ordering: "sweep", staggerMs: 60, victims: ["n", "b"], visual: "greyhex", hasLead: true, sound: "petrify", source: "walnut" },
  we_stone_soldiers: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "stonerise", hasLead: false, sound: "wall", source: "summon" },
  we_mountain_range: { ordering: "sweep", staggerMs: 65, victims: "all", visual: "mountainwall", hasLead: true, sound: "wall", source: "blindfold" },
  we_landslide: { ordering: "sweep", staggerMs: 100, victims: ["r", "q"], visual: "rockfall", hasLead: true, sound: "cataclysm" },
  we_thorn_barrier: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "thornwall", hasLead: true, sound: "wall", source: "blindfold" },

  // STORM (wild/elemental): targeted bolts and a summoned thunderhead.
  we_lightning_bolt: { ordering: "line", staggerMs: 0, victims: "all", mover: "q", visual: "strike", hasLead: false, sound: "lightning" },
  we_arc_lightning: { ordering: "line", staggerMs: 100, victims: "all", mover: "r", visual: "arclight", hasLead: true, sound: "lightning" },
  we_thunderhead: { ordering: "radial", staggerMs: 0, victims: "all", visual: "stormcloud", hasLead: false, sound: "wall", source: "summon" },

  // WARFARE (wild/warfare): charges, bombardment, reinforcement, siege lines.
  ww_bayonet_charge: { ordering: "line", staggerMs: 85, victims: "all", mover: "b", visual: "spearcharge", hasLead: false, sound: "rampage" },
  ww_spearhead: { ordering: "line", staggerMs: 90, victims: "all", mover: "r", visual: "spearcharge", hasLead: true, sound: "siege" },
  ww_armored_breakthrough: { ordering: "line", staggerMs: 80, victims: "all", mover: "q", visual: "tankroll", hasLead: true, sound: "rampage" },
  ww_bombardment: { ordering: "sweep", staggerMs: 110, victims: ["p"], visual: "artillery", hasLead: false, sound: "siege" },
  ww_counter_battery: { ordering: "radial", staggerMs: 0, victims: ["r", "b"], visual: "artillery", hasLead: true, sound: "siege" },
  ww_combined_arms: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "reinforce", hasLead: true, sound: "wall", source: "summon" },
  ww_muster_the_ranks: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "reinforce", hasLead: true, sound: "wall", source: "summon" },
  ww_forward_outpost: { ordering: "radial", staggerMs: 0, victims: "all", visual: "reinforce", hasLead: true, sound: "wall", source: "summon" },
  ww_paratroopers: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "paradrop", hasLead: true, sound: "wall", source: "summon" },
  ww_suppressive_fire: { ordering: "radial", staggerMs: 45, victims: ["n"], visual: "suppress", hasLead: false, sound: "massfreeze", source: "frozen" },
  ww_double_trench: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "trench", hasLead: true, sound: "wall", source: "blindfold" },
  ww_dug_in_defense: { ordering: "radial", staggerMs: 30, victims: "all", visual: "dugin", hasLead: true, sound: "aegis", source: "shield" },

  // ARCANE (wild/arcane): time stop, mass freeze/petrify, disintegration, conjure.
  wa_time_stop: { ordering: "radial", staggerMs: 0, victims: "all", visual: "timestop", hasLead: true, sound: "clockcage", source: "walnut" },
  wa_frozen_moment: { ordering: "radial", staggerMs: 50, victims: ["r", "q"], visual: "chainfreeze", hasLead: true, sound: "massfreeze", source: "frozen" },
  wa_stone_pawns: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },
  wa_unmake: { ordering: "line", staggerMs: 90, victims: "all", mover: "b", visual: "unmake", hasLead: true, sound: "extinction" },
  wa_banish: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b"], visual: "unmake", hasLead: false, sound: "extinction" },
  wa_spectral_minors: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },

  // CHAOS (wild/chaos): wrecking ball, pinata, genie, hot seat.
  wc_wrecking_ball: { ordering: "line", staggerMs: 85, victims: "all", mover: "q", visual: "wreckingball", hasLead: true, sound: "rampage" },
  wc_pinata: { ordering: "radial", staggerMs: 0, victims: "all", visual: "pinata", hasLead: true, sound: "rampage" },
  wc_genie_wish: { ordering: "radial", staggerMs: 0, victims: "all", visual: "geniepoof", hasLead: true, sound: "wall", source: "summon" },
  wc_hot_seat: { ordering: "radial", staggerMs: 0, victims: "all", visual: "decree", hasLead: true, sound: "snooze", source: "stun" },

  // FUNNY (funny/clock): the Computer Virus corrupts the opponent's clock. No
  // board removal / zone effect, so like the Batch 2/3 stun-zone entries it is
  // registered here and renders once Board feeds it the opponent clock-area
  // squares; the glitch art + voice are complete.
  // Upgraded to a BOARD-WIDE spectacle: a spreading digital corruption (cascading
  // green code columns, glitch bars sweeping across the whole board crop, a
  // corruption wipe) instead of the old single-square glitch. Rendered from the
  // lead flourish (oversized + clipped by the board crop), like the dragon /
  // wizard marquee spectacles.
  computer_virus: { ordering: "radial", staggerMs: 0, victims: "all", visual: "virusspread", hasLead: true, sound: "clockcage", source: "stun" },

  // --- Batch 5: SECOND SPECTACLE PASS (library core + wild + funny). The next
  // tier of impactful cards that still fell back to the generic family effect.
  // Removal-sourced entries render off the detonation diff; the effect-data
  // ones join the inert-until-wired zone set (frozen / walnut / shield /
  // kingSafe / stun / empower / summon / blindfold / rally). Every entry reuses
  // an existing SigSoundKey and SigZone; the new visuals are flat-SVG one-shots
  // added with the Batch 5 art below (coral / mint / sun + tier colours). ---

  // Core removals (detonation diff): a piece is unmade in a crumble of motes.
  purge: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r"], visual: "disintegrate", hasLead: true, sound: "extinction" },
  annihilate: { ordering: "radial", staggerMs: 40, victims: ["p", "n", "b", "r"], visual: "disintegrate", hasLead: true, sound: "extinction" },
  shatter: { ordering: "radial", staggerMs: 55, victims: ["r", "b", "n"], visual: "disintegrate", hasLead: true, sound: "rampage" },
  purge_two: { ordering: "sweep", staggerMs: 90, victims: ["p"], visual: "disintegrate", hasLead: false, sound: "cataclysm" },
  we_scorch: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], visual: "inferno", hasLead: false, sound: "atomic" },
  wc_sacrificial_bishop: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], visual: "inferno", hasLead: false, sound: "atomic" },
  cavalry_charge: { ordering: "line", staggerMs: 95, victims: "all", mover: "n", visual: "cavalrycharge", hasLead: true, sound: "rampage" },

  // Freezes (frozen zone): each ice card its own read, varied stagger.
  wc_tar_pit: { ordering: "radial", staggerMs: 55, victims: ["b"], visual: "chainfreeze", hasLead: false, sound: "massfreeze", source: "frozen" },
  wc_double_trouble: { ordering: "radial", staggerMs: 60, victims: "all", visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },
  ww_pincer_movement: { ordering: "radial", staggerMs: 50, victims: "all", visual: "snapfrost", hasLead: true, sound: "massfreeze", source: "frozen" },
  wa_arrest_time: { ordering: "radial", staggerMs: 50, victims: ["r", "q"], visual: "deepglacier", hasLead: true, sound: "massfreeze", source: "frozen" },

  // Petrify (walnut zone): concrete shoes clamp the heavy pieces.
  wc_concrete_shoes: { ordering: "radial", staggerMs: 40, victims: ["r", "q"], visual: "stonechain", hasLead: true, sound: "petrify", source: "walnut" },
  we_stone_grip: { ordering: "radial", staggerMs: 0, victims: "all", visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },

  // Shields / wards (shield zone): stone shells, bark canopies, rune pulses.
  we_stoneskin: { ordering: "radial", staggerMs: 45, victims: "all", visual: "stonehide", hasLead: true, sound: "aegis", source: "shield" },
  ww_form_square: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "wardpulse", hasLead: true, sound: "aegis", source: "shield" },
  we_verdant_shield: { ordering: "sweep", staggerMs: 70, victims: ["p"], visual: "canopy", hasLead: false, sound: "aegis", source: "shield" },
  wa_royal_aegis: { ordering: "radial", staggerMs: 0, victims: ["k", "q"], visual: "wardpulse", hasLead: true, sound: "aegis", source: "shield" },
  borrowed_time: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "wardpulse", hasLead: true, sound: "aegis", source: "shield" },

  // King wards (kingSafe zone).
  we_frost_ward: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "frozenmoat", hasLead: true, sound: "shades", source: "kingSafe" },
  wc_panic_button: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "wardpulse", hasLead: true, sound: "shades", source: "kingSafe" },

  // Skips + clock theft (stun zone: opponent's stalled ranks / clock area).
  tempo_theft: { ordering: "radial", staggerMs: 0, victims: "all", visual: "snooze", hasLead: true, sound: "snooze", source: "stun" },
  time_lock: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockcage", hasLead: true, sound: "clockcage", source: "stun" },
  time_thief: { ordering: "radial", staggerMs: 0, victims: "all", visual: "chronosteal", hasLead: true, sound: "clockcage", source: "stun" },
  wa_chrono_siphon: { ordering: "radial", staggerMs: 0, victims: "all", visual: "chronosteal", hasLead: true, sound: "clockcage", source: "stun" },

  // Extra-move rallies (rally zone): lightning strobes and war-banner surges.
  extra_move: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },
  overwhelm: { ordering: "radial", staggerMs: 70, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },
  wa_quicken: { ordering: "radial", staggerMs: 60, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },
  ww_relentless_assault: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },
  wc_juggling_act: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "warhorn", hasLead: true, sound: "blitz", source: "rally" },
  berserker: { ordering: "sweep", staggerMs: 75, victims: "all", visual: "warhorn", hasLead: true, sound: "blitz", source: "rally" },

  // Movement grants / veteran upgrades (empower zone).
  ww_command_tent: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  ww_flanking_knights: { ordering: "sweep", staggerMs: 100, victims: ["n"], visual: "warhorn", hasLead: true, sound: "blitz", source: "empower" },
  ww_dragoons: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "warhorn", hasLead: true, sound: "coronation", source: "empower" },
  glass_cannon: { ordering: "radial", staggerMs: 0, victims: ["b"], visual: "bladegift", hasLead: true, sound: "coronation", source: "empower" },

  // Summons / reinforcements (summon zone).
  grand_summon: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },
  kings_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "kingsmuster", hasLead: true, sound: "wall", source: "summon" },
  ww_mercenary_queen: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: true, sound: "wall", source: "summon" },
  second_army: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  // Batch 11 upgrade: the clone army rolls out of the same photocopier as its
  // sibling card Clone — a board-wide scan-bar lead instead of the generic
  // reinforcement pop.
  clone_army: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "photocopy", hasLead: true, sound: "wall", source: "summon" },
  wc_conga_line: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "paradrop", hasLead: true, sound: "wall", source: "summon" },
  // Batch 11 upgrade: the pizza actually gets DELIVERED — a scooter tears
  // across the whole board trailing steam (was a generic portal pop).
  pizza_delivery: { ordering: "radial", staggerMs: 0, victims: "all", visual: "pizzarun", hasLead: true, sound: "wall", source: "summon" },
  wc_clown_car: { ordering: "radial", staggerMs: 60, victims: "all", visual: "portal", hasLead: true, sound: "wall", source: "summon" },
  wc_rubber_duck_squad: { ordering: "radial", staggerMs: 60, victims: "all", visual: "portal", hasLead: true, sound: "wall", source: "summon" },
  wc_attack_goose: { ordering: "radial", staggerMs: 0, victims: "all", visual: "portal", hasLead: true, sound: "wall", source: "summon" },

  // Teleports / relocations (summon zone: the landing squares gain a piece).
  wa_far_step: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  wa_twin_blink: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "blink", hasLead: true, sound: "wall", source: "summon" },
  wc_yeet: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  warp_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "blink", hasLead: true, sound: "wall", source: "summon" },
  warp_storm: { ordering: "sweep", staggerMs: 75, victims: "all", visual: "blink", hasLead: true, sound: "wall", source: "summon" },

  // Walls / voids / traps (blindfold zone).
  fault_line: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "trench", hasLead: false, sound: "wall", source: "blindfold" },
  fissure: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "trench", hasLead: true, sound: "wall", source: "blindfold" },
  wa_glyph_seal: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "borderward", hasLead: false, sound: "wall", source: "blindfold" },
  wa_border_ward: { ordering: "sweep", staggerMs: 50, victims: "all", visual: "borderward", hasLead: true, sound: "wall", source: "blindfold" },
  wc_banana_peel_trail: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "banana", hasLead: false, sound: "wall", source: "blindfold" },
  ww_claymore_line: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "minefield", hasLead: true, sound: "siege", source: "blindfold" },
  wc_black_hole: { ordering: "radial", staggerMs: 0, victims: "all", visual: "vortex", hasLead: true, sound: "wall", source: "blindfold" },
  wc_haunted_house: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "vortex", hasLead: true, sound: "wall", source: "blindfold" },
  wa_void_rift: { ordering: "radial", staggerMs: 0, victims: "all", visual: "vortex", hasLead: true, sound: "wall", source: "blindfold" },

  // --- Batch 6: MARQUEE spectacles for the top-tier (tier-8) cards. A dragon
  // that sweeps the board breathing fire (removal diff, like Nova), and an
  // archmage who rises and casts (summon / void zones). Every entry reuses an
  // existing SigSoundKey and an already-wired source. ---
  total_annihilation: { ordering: "sweep", staggerMs: 95, victims: ["p", "n", "b", "r"], visual: "totalannihilation", hasLead: true, sound: "atomic" },
  queens_apocalypse: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "dragonlord", hasLead: true, sound: "atomic" },
  grand_reset: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "archmage", hasLead: true, sound: "coronation", source: "summon" },
  void_realm: { ordering: "radial", staggerMs: 55, victims: "all", visual: "voidrealm", hasLead: true, sound: "shades", source: "blindfold" },

  // --- Batch 7: MARQUEE sea / monster cards + two more top-tier boardwide
  // spectacles. The sea beasts get bespoke reads so no two look alike: a kraken
  // tentacle rears up (summon zone), a dark abyss maw swallows (void -> blindfold
  // zone), a whirlpool spirals a pawn under (convert), a flood wave washes across
  // the trap squares (void -> blindfold zone), and the Frost Ward's frozen moat
  // rings the king (kingSafe zone, was the generic ward pulse). Cataclysmic
  // Meteor and the resurrection cards join the dragon / wizard family with a
  // colossal meteor streak (removal diff) and a rising phoenix (summon zone).
  kraken: { ordering: "radial", staggerMs: 60, victims: "all", visual: "kraken", hasLead: true, sound: "wall", source: "summon" },
  abyss: { ordering: "radial", staggerMs: 0, victims: "all", visual: "abyss", hasLead: true, sound: "wall", source: "blindfold" },
  we_whirlpool: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "whirlpool", hasLead: false, sound: "wall", source: "summon" },
  we_flood: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "flood", hasLead: true, sound: "wall", source: "blindfold" },
  cataclysmic_meteor: { ordering: "sweep", staggerMs: 80, victims: ["p", "n", "b", "r", "q"], visual: "meteorstorm", hasLead: true, sound: "atomic" },
  phoenix_rebirth: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "phoenixrise", hasLead: true, sound: "wall", source: "summon" },
  full_resurrection: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "sanctrise", hasLead: true, sound: "wall", source: "summon" },

  // --- Batch 8: flavor pass. A round of dramatically-named cards that still
  // fell back to the plain detonation burst or a shared motif. The REMOVAL
  // entries (source omitted) fire today off the detonation diff; the effect-
  // data entries reuse an already-shipped SigZone + SigSoundKey and join the
  // same inert-until-wired set as the rest of Batch 2-7 (they light up once
  // Board feeds signatures from the named fx zone, the pending wiring shared
  // by every source !== "removal" entry above). Each visual is a new flat-SVG
  // one-shot (coral / mint / sun / gold, no gradients) added with the Batch 8
  // art below and hidden under reduced motion. ---

  // Removals (detonation diff, render today).
  detonate: { ordering: "radial", staggerMs: 40, victims: "all", visual: "detonate", hasLead: true, sound: "atomic" },
  we_cinder_strike: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "cinderstrike", hasLead: false, sound: "atomic" },
  purge_storm: { ordering: "sweep", staggerMs: 60, victims: ["p"], visual: "purgestorm", hasLead: true, sound: "extinction" },
  roulette: { ordering: "radial", staggerMs: 0, victims: "all", visual: "roulette", hasLead: true, sound: "rampage" },
  purge_line: { ordering: "sweep", staggerMs: 55, victims: ["p", "n", "b", "r"], visual: "purgeline", hasLead: true, sound: "extinction" },
  nerf_this: { ordering: "radial", staggerMs: 90, victims: ["p", "n", "b"], visual: "calldown", hasLead: true, sound: "lightning" },
  annihilation: { ordering: "radial", staggerMs: 45, victims: ["p", "n", "b", "r"], visual: "annihilation", hasLead: true, sound: "extinction" },
  meteor: { ordering: "radial", staggerMs: 35, victims: "all", visual: "meteorcross", hasLead: true, sound: "atomic" },
  purge_realm: { ordering: "sweep", staggerMs: 40, victims: ["n", "b"], visual: "purgerealm", hasLead: true, sound: "extinction" },
  ruin: { ordering: "sweep", staggerMs: 60, victims: ["p", "n"], visual: "ruin", hasLead: true, sound: "cataclysm" },

  // Effect-data spectacles (inert-until-wired, like their shipped peers).
  ice_age: { ordering: "radial", staggerMs: 50, victims: "all", visual: "iceage", hasLead: true, sound: "massfreeze", source: "frozen" },
  world_end: { ordering: "radial", staggerMs: 55, victims: "all", visual: "worldend", hasLead: true, sound: "massfreeze", source: "frozen" },
  // Batch 11 upgrade: the corrosion now CREEPS board-wide from the lead square
  // before each piece seizes up.
  rust: { ordering: "radial", staggerMs: 45, victims: "all", visual: "rustlock", hasLead: true, sound: "massfreeze", source: "frozen" },
  mass_petrify: { ordering: "sweep", staggerMs: 55, victims: ["n", "b"], visual: "masspetrify", hasLead: true, sound: "petrify", source: "walnut" },
  walnut_queen: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "walnutcurse", hasLead: true, sound: "petrify", source: "walnut" },
  amazon: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "amazoncrown", hasLead: true, sound: "coronation", source: "empower" },
  titan_legion: { ordering: "radial", staggerMs: 0, victims: "all", visual: "titanlegion", hasLead: true, sound: "colossus", source: "empower" },
  living_god: { ordering: "radial", staggerMs: 0, victims: "all", visual: "livinggod", hasLead: true, sound: "colossus", source: "empower" },
  eternal_reign: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "eternalreign", hasLead: true, sound: "coronation", source: "empower" },
  godslayer_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "godslayer", hasLead: true, sound: "coronation", source: "empower" },
  werewolf: { ordering: "radial", staggerMs: 0, victims: "all", visual: "werewolf", hasLead: true, sound: "colossus", source: "empower" },
  last_meal: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "lastmeal", hasLead: true, sound: "coronation", source: "empower" },
  onslaught: { ordering: "radial", staggerMs: 60, victims: "all", visual: "onslaught", hasLead: true, sound: "blitz", source: "rally" },
  resurrection: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "resurrection", hasLead: true, sound: "wall", source: "summon" },
  grand_resurrection: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "grandrevive", hasLead: true, sound: "wall", source: "summon" },
  iron_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "ironlegion", hasLead: true, sound: "wall", source: "summon" },
  second_coming: { ordering: "radial", staggerMs: 0, victims: "all", visual: "secondcoming", hasLead: true, sound: "wall", source: "summon" },
  necromancer: { ordering: "radial", staggerMs: 0, victims: "all", visual: "necromancer", hasLead: true, sound: "wall", source: "summon" },
  // Batch 11 upgrade: the floor is LAVA everywhere — a magma tide sweeps the
  // whole board crop ahead of the per-square eruptions.
  lava_floor: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "lavafloor", hasLead: true, sound: "wall", source: "blindfold" },

  // --- Batch 9: THEMATIC, character-matched signatures. A round of the most
  // flavorful cards that still fired a GENERIC reused motif instead of their own
  // thematic spectacle (the owner's complaint: e.g. Bombardiro Crocodilo showed
  // a LIGHTNING strike instead of a croc dropping bombs). Every entry gets its
  // OWN bespoke inline-SVG art (no two share a look), transform/opacity only,
  // hidden under reduced motion. The three REMOVAL entries (bombardiro_croc /
  // oblivion / blood_pact, source omitted) render TODAY off the detonation diff;
  // every other entry reuses an already-shipped SigZone + SigSoundKey and joins
  // the same inert-until-wired zone set as the rest of Batch 2-8 (they light up
  // once Board feeds signatures from the named fx zone, the shared pending wiring
  // documented on every source !== "removal" entry above). No new Board.tsx /
  // engine / card-def change is introduced here.

  // Italian brainrot (character-matched, replacing the reused strike / freeze /
  // skip / bonk / anchor motifs each of these fell back to).
  bombardiro_croc: { ordering: "radial", staggerMs: 45, victims: "all", visual: "crocbomber", hasLead: true, sound: "atomic" },
  tralalero_dash: { ordering: "line", staggerMs: 0, victims: "all", visual: "sharkdash", hasLead: true, sound: "rampage", source: "rally" },
  bombombini_gusini: { ordering: "radial", staggerMs: 40, victims: "all", visual: "goosebomb", hasLead: true, sound: "siege", source: "stun" },
  lirili_larila: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockelephant", hasLead: true, sound: "clockcage", source: "stun" },
  brr_brr_patapim: { ordering: "radial", staggerMs: 45, victims: ["p", "n", "b", "r", "q"], visual: "coldsnap", hasLead: true, sound: "massfreeze", source: "frozen" },
  chimpanzini_bananini: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "bananape", hasLead: true, sound: "rampage", source: "empower" },
  // Boneca's card paints an "anchor" motif; the nearest shipped zone is the
  // movement-constraint "slow" one, so it rides the same inert-until-wired path
  // as its peers (it lights up when the slow/anchor zone wiring lands in Board).
  boneca_ambalabu: { ordering: "radial", staggerMs: 50, victims: "all", visual: "tirefrog", hasLead: true, sound: "colossus", source: "slow" },

  // Apex / library flagships (Oblivion + Blood Pact render today off removals).
  // Total War (the tier-10 board-wipe + fresh force) fires off the same
  // removal diff as Oblivion but with its own war-march read: banners, a
  // triple concussion, and per-square battle-standard slashes.
  total_war: { ordering: "sweep", staggerMs: 45, victims: "all", visual: "totalwar", hasLead: true, sound: "atomic" },
  oblivion: { ordering: "radial", staggerMs: 45, victims: "all", visual: "oblivionwipe", hasLead: true, sound: "extinction" },
  blood_pact: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "bloodpact", hasLead: true, sound: "rampage" },
  regicide: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "regicideblade", hasLead: true, sound: "coronation", source: "empower" },
  divine_right: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "divineright", hasLead: true, sound: "coronation", source: "empower" },
  ascendancy: { ordering: "radial", staggerMs: 60, victims: "all", visual: "ascendancy", hasLead: true, sound: "colossus", source: "empower" },
  divine_mandate: { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], visual: "mandate", hasLead: true, sound: "aegis", source: "shield" },
  blackout: { ordering: "radial", staggerMs: 40, victims: "all", visual: "blackout", hasLead: true, sound: "snooze", source: "stun" },

  // Beasts / summons / relocations (summon zone: the landing squares gain a piece).
  griffon_rider: { ordering: "radial", staggerMs: 0, victims: "all", visual: "griffoncarry", hasLead: true, sound: "wall", source: "summon" },
  grand_army: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "grandarmy", hasLead: true, sound: "wall", source: "summon" },
  mortgage: { ordering: "radial", staggerMs: 0, victims: "all", visual: "mortgagesign", hasLead: true, sound: "wall", source: "summon" },
  wc_repo_rook: { ordering: "radial", staggerMs: 0, victims: "all", visual: "reporook", hasLead: true, sound: "wall", source: "summon" },
  wc_musical_chairs: { ordering: "radial", staggerMs: 0, victims: "all", visual: "musicalchairs", hasLead: true, sound: "wall", source: "summon" },

  // Faustian / frenzy / freeze / wind / slow (existing effect zones).
  wc_deal_with_the_devil: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "devildeal", hasLead: true, sound: "coronation", source: "empower" },
  wc_berserk_pawn: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "berserkrage", hasLead: true, sound: "blitz", source: "empower" },
  we_glaciate: { ordering: "radial", staggerMs: 0, victims: "all", visual: "encase", hasLead: false, sound: "massfreeze", source: "frozen" },
  snowball: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "snowballsplat", hasLead: true, sound: "massfreeze", source: "frozen" },
  we_gale: { ordering: "sweep", staggerMs: 50, victims: ["b"], visual: "galephase", hasLead: false, sound: "blitz", source: "empower" },
  // Batch 11 upgrade: the whole board flips — two giant counter-running arrows
  // charge across the crop in opposite directions on the lead square.
  opposite_day: { ordering: "radial", staggerMs: 45, victims: "all", visual: "oppositeday", hasLead: true, sound: "snooze", source: "slow" },

  // --- Batch 10: gambling wheels, the drum-man, and a slapstick funny batch.
  // The gambling cards (Wheel of Fortune / Jackpot / Gamble) join roulette with
  // their own spin-to-a-pointer wheel, a slot machine, and a coin flip; every
  // one reuses an already-shipped SigZone + SigSoundKey. (tung_tung_sahur and
// the four calisthenics-athlete cards (handstand/planche/maltese/one-arm)
// moved to the plugin sets so their figure art wins. (tung_tung_sahur has
  // since moved to memePlays.tsx, where the man himself marches the board.)
  // The rest are comedic library cards that used to fall back to a generic zone
  // overlay; each gets a bespoke gag. Every source !== "removal" entry rides the
  // same zone wiring as the rest of Batch 2-9.

  // Gambling (spin a wheel / pull the lever / flip a coin).
  // Gambling wheels (owner add-on): every gambling card spins its own wheel —
  // fortune = carnival wedges, jackpot = gold payout wheel + coin rain,
  // gamble = red/gold chancer's wheel, zodiac = star-chart houses, high roll =
  // die pips, arcane reroll = rune ticks. Roulette (red/black pockets) keeps
  // its own entry in the removals block above. double_or_nothing stays on
  // "coinflip" — that card IS a coin toss, and it keeps the two distinct.
  wheel_of_fortune: { ordering: "radial", staggerMs: 0, victims: "all", visual: "fortunewheel", hasLead: true, sound: "snooze", source: "stun" },
  jackpot: { ordering: "radial", staggerMs: 0, victims: "all", visual: "goldwheel", hasLead: true, sound: "coronation", source: "summon" },
  gamble: { ordering: "radial", staggerMs: 0, victims: "all", visual: "gamblewheel", hasLead: true, sound: "snooze", source: "stun" },
  zodiac_wheel: { ordering: "radial", staggerMs: 0, victims: "all", visual: "zodiacwheel", hasLead: true, sound: "snooze", source: "stun" },
  wa_high_roll: { ordering: "radial", staggerMs: 0, victims: "all", visual: "dicewheel", hasLead: true, sound: "snooze", source: "stun" },
  wa_arcane_reroll: { ordering: "radial", staggerMs: 0, victims: "all", visual: "runewheel", hasLead: true, sound: "snooze", source: "stun" },

  // tung_tung_sahur moved to the meme plugin set (memePlays.tsx): HE marches
  // the board in person now (his /brainrot portrait), not the generic drum
  // bonk. Core must NOT keep an entry — core beats plugins at the resolve
  // site, so a duplicate here would shadow the portrait play.

  // Slapstick freezes (frozen zone, the snowball precedent): a rake to the face,
  // a fly swatter, a nap, a glue trap, a bear trap.
  // Batch 11 upgrade: the rake is now COLOSSAL — it springs up over the whole
  // board before the per-square bonk lands.
  rake: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "rakebonk", hasLead: true, sound: "siege", source: "frozen" },
  fly_swatter: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "flyswat", hasLead: false, sound: "massfreeze", source: "frozen" },
  napping: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "sleepcap", hasLead: false, sound: "snooze", source: "frozen" },
  super_glue: { ordering: "radial", staggerMs: 45, victims: "all", visual: "superglue", hasLead: true, sound: "massfreeze", source: "frozen" },
  bear_trap: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "beartrap", hasLead: false, sound: "siege", source: "frozen" },

  // Slapstick knockbacks (stun zone: a bonked / stunned piece): the ACME anvil
  // flattens, the spring glove punches back.
  anvil_drop: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "anvildrop", hasLead: true, sound: "atomic", source: "stun" },
  // Batch 11 upgrade: the spring-loaded glove now hauls off across the WHOLE
  // board before the per-square jab connects.
  boxing_glove: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "boxingglove", hasLead: true, sound: "rampage", source: "stun" },

  // Ward (shield zone): the bubble-wrapped piece.
  bubble_wrap: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "bubblewrap", hasLead: true, sound: "aegis", source: "shield" },

  // Movement curses (slow zone: the anchored / hexed enemy pieces): dizzy
  // vertigo, a paper-crane fold, scurrying gremlins, a homeward pull, jet lag.
  vertigo: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "vertigo", hasLead: true, sound: "snooze", source: "slow" },
  origami: { ordering: "radial", staggerMs: 40, victims: ["r"], visual: "origami", hasLead: false, sound: "snooze", source: "slow" },
  gremlins: { ordering: "radial", staggerMs: 40, victims: ["r"], visual: "gremlins", hasLead: false, sound: "snooze", source: "slow" },
  homesick: { ordering: "radial", staggerMs: 45, victims: "all", visual: "homesick", hasLead: true, sound: "snooze", source: "slow" },
  jet_lag: { ordering: "radial", staggerMs: 0, victims: "all", visual: "jetlag", hasLead: true, sound: "clockcage", source: "slow" },

  // Self grants: the king climbs the hill (empower zone), a sugar rush (rally).
  king_of_the_hill: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "hillflag", hasLead: true, sound: "coronation", source: "empower" },
  sugar_rush: { ordering: "radial", staggerMs: 60, victims: "all", visual: "sugarrush", hasLead: true, sound: "blitz", source: "rally" },

  // --- Batch 11: fantasy & meta spectacles (the "dragon-roar" coverage pass).
  // Every FANTASY card that still had NO signature entry gets a board-wide
  // statement (oversized lead clipped by the board crop, hasLead: true), and
  // the FUNNY + PT ("meta") sets are covered card-for-card: bespoke gags for
  // the flavorful ones, shared-but-reflavored reads (chronosteal / coinflip /
  // wings / hillflag / mortgagesign / minefield / paradrop) where a new
  // component would add nothing — each still distinct via ordering / stagger /
  // zone / palette. Every entry reuses an existing SigSoundKey (playSignature
  // needs no new cases) and an already-declared SigZone, so every source !==
  // "removal" entry rides the same inert-until-wired zone wiring as Batch
  // 2-10. No new keyframes: every visual composes shipped fx-sig-* classes.

  // FANTASY earth: the ground itself turns traitor.
  sinkhole: { ordering: "radial", staggerMs: 90, victims: "all", visual: "sinkhole", hasLead: true, sound: "cataclysm", source: "blindfold" },
  fissure_field: { ordering: "sweep", staggerMs: 60, victims: ["p"], visual: "fissurefield", hasLead: true, sound: "cataclysm", source: "slow" },

  // FANTASY artifact / necromancy: dominion and the lich's insurance.
  orb_of_dominion: { ordering: "radial", staggerMs: 0, victims: ["r", "q"], visual: "dominionorb", hasLead: true, sound: "shades", source: "summon" },
  lich_phylactery: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "phylactery", hasLead: true, sound: "shades", source: "shield" },

  // FANTASY transforms: violent reshaping, godhood, and gold.
  metamorphosis: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], visual: "metamorph", hasLead: true, sound: "colossus", source: "empower" },
  apotheosis: { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], visual: "godhood", hasLead: true, sound: "coronation", source: "empower" },
  philosophers_stone: { ordering: "sweep", staggerMs: 140, victims: ["p"], visual: "transmute", hasLead: true, sound: "coronation", source: "empower" },

  // FANTASY curses: iron, decay, and the dread compulsion.
  shackle_the_queen: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "queenshackle", hasLead: true, sound: "clockcage", source: "slow" },
  curse_of_frailty: { ordering: "radial", staggerMs: 45, victims: "all", visual: "frailty", hasLead: true, sound: "petrify", source: "slow" },
  doom_march: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "doomtide", hasLead: true, sound: "extinction", source: "slow" },

  // FUNNY / PT clock economy (stun = the opponent's clock area, rally = ours).
  deadline: { ordering: "radial", staggerMs: 0, victims: "all", visual: "deadlineclock", hasLead: true, sound: "clockcage", source: "stun" },
  buzzer_beater: { ordering: "radial", staggerMs: 0, victims: "all", visual: "chronosteal", hasLead: true, sound: "clockcage", source: "stun" },
  overtime_whistle: { ordering: "radial", staggerMs: 0, victims: "all", visual: "whistleblast", hasLead: true, sound: "blitz", source: "rally" },
  time_out: { ordering: "radial", staggerMs: 0, victims: "all", visual: "timeoutflag", hasLead: true, sound: "snooze", source: "stun" },
  overtime_pay: { ordering: "radial", staggerMs: 0, victims: "all", visual: "cashclock", hasLead: true, sound: "coronation", source: "rally" },
  overclocked: { ordering: "radial", staggerMs: 50, victims: "all", visual: "overclock", hasLead: true, sound: "blitz", source: "rally" },

  // PT gambling / faustian market (rally = a bet on our own tempo).
  all_in: { ordering: "radial", staggerMs: 0, victims: "all", visual: "allin", hasLead: true, sound: "blitz", source: "rally" },
  double_or_nothing: { ordering: "radial", staggerMs: 0, victims: "all", visual: "coinflip", hasLead: true, sound: "snooze", source: "rally" },
  mystery_box: { ordering: "radial", staggerMs: 0, victims: "all", visual: "mysterybox", hasLead: true, sound: "snooze", source: "rally" },
  swap_meet: { ordering: "radial", staggerMs: 0, victims: "all", visual: "swapmeet", hasLead: true, sound: "snooze", source: "rally" },
  golden_touch: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "goldtouch", hasLead: true, sound: "coronation", source: "empower" },

  // PT curses & chaos (slow / stun zones = the hexed enemy pieces).
  understaffed: { ordering: "radial", staggerMs: 0, victims: "all", visual: "outoffice", hasLead: false, sound: "snooze", source: "stun" },
  allergies: { ordering: "radial", staggerMs: 0, victims: "all", visual: "sneeze", hasLead: true, sound: "snooze", source: "slow" },
  chaos_theory: { ordering: "sweep", staggerMs: 70, victims: ["p"], visual: "tornado", hasLead: true, sound: "rampage", source: "summon" },
  greenhouse: { ordering: "file", staggerMs: 80, victims: ["p"], visual: "glassdome", hasLead: true, sound: "aegis", source: "empower" },
  groundhog_day: { ordering: "radial", staggerMs: 0, victims: "all", visual: "vhsrewind", hasLead: true, sound: "clockcage", source: "stun" },
  hot_potato: { ordering: "radial", staggerMs: 0, victims: "all", visual: "hotpotato", hasLead: true, sound: "rampage", source: "slow" },
  pinocchio: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "pinocchionose", hasLead: true, sound: "coronation", source: "empower" },
  sea_monkeys: { ordering: "sweep", staggerMs: 90, victims: ["p"], visual: "seamonkeys", hasLead: true, sound: "wall", source: "summon" },
  slowpoke: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "snailslow", hasLead: true, sound: "snooze", source: "slow" },
  snooze_button: { ordering: "radial", staggerMs: 60, victims: "all", visual: "snoozebar", hasLead: true, sound: "snooze", source: "stun" },
  stinky: { ordering: "radial", staggerMs: 45, victims: "all", visual: "stinkcloud", hasLead: true, sound: "snooze", source: "slow" },
  whoopee_cushion: { ordering: "radial", staggerMs: 0, victims: "all", visual: "whoopee", hasLead: true, sound: "rampage", source: "stun" },
  trapdoor: { ordering: "radial", staggerMs: 0, victims: "all", visual: "springtrap", hasLead: false, sound: "wall", source: "blindfold" },

  // PT passives (the rule changes announce themselves once, on play).
  contagion: { ordering: "radial", staggerMs: 55, victims: "all", visual: "contagion", hasLead: true, sound: "massfreeze", source: "frozen" },
  fan_club: { ordering: "sweep", staggerMs: 70, victims: ["p"], visual: "fanclub", hasLead: true, sound: "aegis", source: "shield" },
  gravity_well: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "gravitywell", hasLead: true, sound: "shades", source: "kingSafe" },
  guardian_angel: { ordering: "radial", staggerMs: 0, victims: "all", visual: "wings", hasLead: true, sound: "aegis", source: "shield" },
  home_field: { ordering: "sweep", staggerMs: 80, victims: ["n", "b", "r"], visual: "hillflag", hasLead: true, sound: "coronation", source: "empower" },
  landlord: { ordering: "radial", staggerMs: 60, victims: "all", visual: "mortgagesign", hasLead: true, sound: "wall", source: "blindfold" },
  magnetism: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "magnetpull", hasLead: true, sound: "colossus", source: "empower" },
  photosynthesis: { ordering: "sweep", staggerMs: 75, victims: ["p"], visual: "photosyn", hasLead: true, sound: "aegis", source: "empower" },
  termites: { ordering: "radial", staggerMs: 50, victims: ["r"], visual: "termitegnaw", hasLead: true, sound: "petrify", source: "slow" },
  union_rules: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "picketline", hasLead: true, sound: "aegis", source: "shield" },

  // FUNNY slapstick / summons / transforms.
  cream_pie: { ordering: "radial", staggerMs: 0, victims: "all", visual: "creampie", hasLead: true, sound: "rampage", source: "stun" },
  minefield: { ordering: "radial", staggerMs: 60, victims: "all", visual: "minefield", hasLead: true, sound: "siege", source: "blindfold" },
  clone: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "photocopy", hasLead: true, sound: "wall", source: "summon" },
  insurance: { ordering: "radial", staggerMs: 0, victims: ["n", "q"], visual: "umbrella", hasLead: false, sound: "aegis", source: "shield" },
  understudy: { ordering: "radial", staggerMs: 0, victims: ["b", "q"], visual: "spotlight", hasLead: true, sound: "coronation", source: "shield" },
  summon_intern: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "internpop", hasLead: false, sound: "wall", source: "summon" },
  reinforcements: { ordering: "sweep", staggerMs: 100, victims: ["p"], visual: "paradrop", hasLead: false, sound: "wall", source: "summon" },
  supply_drop: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "cratedrop", hasLead: true, sound: "wall", source: "summon" },
  rent_a_rook: { ordering: "radial", staggerMs: 0, victims: ["r"], visual: "rentarook", hasLead: true, sound: "wall", source: "summon" },

  // --- Bespoke spectacles for the flagship PERSONAL / NEWJEANS cards (see
  // src/engine/buffs/personal.ts). Each reuses a visual/source/sound combo that
  // already ships and renders, matched to the card's actual mechanic (removal
  // diff, frozen zone, or shield zone), so it lights up the moment those cards
  // land. Cards not listed here still get a procedural genSignature. ---
  // i_love_cam / the NewJeans members (minji, hanni, danielle, haerin, hyein)
  // live in the personal plugin set (personalPlays.tsx) — their plays star the
  // /newjeans and /companions portrait art. No core entries: core beats
  // plugins at the resolve site, so entries here would shadow the portraits.
  fur_elise: { ordering: "line", staggerMs: 90, victims: "all", mover: "b", visual: "arclight", hasLead: true, sound: "lightning" },
  geometry_dash: { ordering: "sweep", staggerMs: 110, victims: "all", visual: "strike", hasLead: true, sound: "lightning" },
  check_out_our_socials: { ordering: "radial", staggerMs: 65, victims: ["p", "n", "b", "r", "q"], visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },
  bayview_secondary_school: { ordering: "radial", staggerMs: 55, victims: "all", visual: "deepglacier", hasLead: true, sound: "massfreeze", source: "frozen" },
  i_love_my_gf: { ordering: "radial", staggerMs: 35, victims: "all", visual: "aegis", hasLead: true, sound: "aegis", source: "shield" },
  uniqlo_warrior: { ordering: "radial", staggerMs: 40, victims: "all", visual: "cathedral", hasLead: true, sound: "cathedral", source: "shield" },
  // Second batch: summon (piece placement), shield, and freeze cards, each on a
  // distinct shipped visual so they do not read the same.
  bee_swarm_simulator: { ordering: "radial", staggerMs: 60, victims: ["p"], visual: "geniepoof", hasLead: true, sound: "wall", source: "summon" },
  onett: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "cratedrop", hasLead: false, sound: "wall", source: "summon" },
  i_love_abs: { ordering: "radial", staggerMs: 30, victims: "all", visual: "dugin", hasLead: true, sound: "aegis", source: "shield" },
  ilovesmellingmygfshoodie: { ordering: "radial", staggerMs: 0, victims: "all", visual: "bubblewrap", hasLead: false, sound: "aegis", source: "shield" },
  ilovemysister: { ordering: "radial", staggerMs: 0, victims: "all", visual: "sistergrove", hasLead: true, sound: "aegis", source: "shield" },
  ihatemyex: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "coldsnap", hasLead: false, sound: "massfreeze", source: "frozen" },
  // Third batch: empower / rally / shield grants. Each of these cards now
  // declares fx.pieces (added alongside), so its empower/rally motif paints a
  // real zone the signature reads, exactly like double_amazon (empower) and
  // blitzkrieg (rally). Cards without a resolvable zone stay on genSignature.
  waist_25: { ordering: "sweep", staggerMs: 70, victims: ["p"], visual: "bladegift", hasLead: true, sound: "coronation", source: "empower" },
  rgb_keyboard: { ordering: "sweep", staggerMs: 90, victims: ["n", "b", "r"], visual: "crownrain", hasLead: true, sound: "crownrain", source: "empower" },
  i_love_newjeans: { ordering: "radial", staggerMs: 40, victims: "all", visual: "bannerwar", hasLead: true, sound: "coronation", source: "empower" },
  white_monster: { ordering: "radial", staggerMs: 70, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },
  joseph_leung: { ordering: "radial", staggerMs: 0, victims: "all", visual: "mandate", hasLead: true, sound: "aegis", source: "shield" },
};

// --- Shared shard/spark kit ---------------------------------------------------
// Kept EAGER (and exported) because both sides of the code split use it: the
// lazy burst art in sigVisuals.tsx and the always-eager CastSpectacle below.

/** A single flat shard (three silhouettes) that fills its wrapper. */
export function SigShard({ fill, stroke, variant }: { fill: string; stroke: string; variant: number }) {
  return (
    <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
      <polygon
        points={variant % 3 === 0 ? "5,0 9,9 1,7" : variant % 3 === 1 ? "1,1 9,3 6,10" : "0,4 8,0 9,9"}
        fill={fill}
        stroke={stroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type BurstVec = { dx: string; dy: string; rot: string; delay: number };

// A big, wide scatter of shards (freeze shatter, ember blast, meteor debris).
export const BURST_BIG: BurstVec[] = [
  { dx: "360%", dy: "-250%", rot: "220deg", delay: 0 },
  { dx: "-340%", dy: "-290%", rot: "-240deg", delay: 16 },
  { dx: "420%", dy: "150%", rot: "300deg", delay: 8 },
  { dx: "-400%", dy: "220%", rot: "-200deg", delay: 24 },
  { dx: "90%", dy: "-440%", rot: "150deg", delay: 4 },
  { dx: "-130%", dy: "400%", rot: "-150deg", delay: 20 },
  { dx: "300%", dy: "350%", rot: "180deg", delay: 12 },
  { dx: "-300%", dy: "-360%", rot: "-190deg", delay: 28 },
];
// A tighter spark burst (sparkle rises, small debris).
export const BURST_MED: BurstVec[] = [
  { dx: "230%", dy: "-260%", rot: "160deg", delay: 0 },
  { dx: "-210%", dy: "-230%", rot: "-150deg", delay: 14 },
  { dx: "260%", dy: "-90%", rot: "200deg", delay: 8 },
  { dx: "-240%", dy: "-120%", rot: "-190deg", delay: 22 },
  { dx: "40%", dy: "-320%", rot: "120deg", delay: 5 },
];

/** A burst of flat shards flying out on the shared fx-sig-star keyframes. */
export function ShardBurst({
  vectors,
  fill,
  stroke,
  delayMs,
  sizePct = 12,
}: {
  vectors: BurstVec[];
  fill: string;
  stroke: string;
  delayMs: number;
  sizePct?: number;
}) {
  return (
    <>
      {vectors.map((v, i) => (
        <span
          key={i}
          className="fx-sig-star absolute left-1/2 top-1/2 block"
          style={
            {
              height: `${sizePct}%`,
              width: `${sizePct}%`,
              marginLeft: `${-sizePct / 2}%`,
              marginTop: `${-sizePct / 2}%`,
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.delay}ms`,
            } as React.CSSProperties
          }
        >
          <SigShard fill={fill} stroke={stroke} variant={i} />
        </span>
      ))}
    </>
  );
}

// --- Brainrot character figures ----------------------------------------------
// Each brainrot card's board-wide takeover stars the character itself as a
// looping animated image (owner request: "include a GIF"). The images live in
// public/brainrot/<cardId>.<ext>: the component tries `.gif` FIRST — drop a
// real downloaded GIF in that folder under the card's id and it is picked up
// automatically with no code change — and falls back to the bundled looping
// animated SVG (drawn in-repo; it plays exactly like a GIF inside an <img>).
// The resolved extension is remembered per id so the 404 probe for a missing
// GIF happens once per session, not once per cast.
const brainrotExt = new Map<string, "gif" | "svg">();

export function BrainrotFigure({ id, className = "" }: { id: string; className?: string }) {
  const [ext, setExt] = React.useState<"gif" | "svg">(brainrotExt.get(id) ?? "gif");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brainrot/${id}.${ext}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={"pointer-events-none h-full w-full select-none object-contain " + className}
      onError={() => {
        if (ext === "gif") {
          brainrotExt.set(id, "svg");
          setExt("svg");
        }
      }}
    />
  );
}

// --- Signature play visuals: CODE-SPLIT out of the eager bundle --------------
// The ~11k lines of burst components behind SignatureOverlay's SigVisual
// switch live in sigVisuals.tsx and load as a SEPARATE lazy chunk: game logic
// only needs the SIGNATURES config table above (ordering/victims/sound/zone),
// which stays eager, so parsing the art is deferred off the /game critical
// path. Board calls prefetchSignatureVisuals() on mount, so the chunk is warm
// long before any card can fire; once loaded, SignatureOverlay renders the
// real switch SYNCHRONOUSLY (no Suspense round-trip, no dropped first frame).
// The React.lazy + fallback-null path below only exists as a net for the
// pathological case where the prefetch never resolved (e.g. offline): the
// animation layer stays empty rather than crashing — sounds, zones and every
// other play cue still run off the eager config.

type SignatureVisualProps = { visual: SigVisual; role: "lead" | "target"; delayMs: number };

let LoadedSignatureVisual: React.ComponentType<SignatureVisualProps> | null = null;
const LazySignatureVisual = React.lazy(() => import("./sigVisuals"));

/** Warm the signature-visuals chunk (Board fires this on mount). Safe to call
 * repeatedly; failures are swallowed (the Suspense net covers rendering). */
export function prefetchSignatureVisuals(): void {
  void import("./sigVisuals")
    .then((m) => {
      LoadedSignatureVisual = m.default;
    })
    .catch(() => {});
}

/** One square's slice of a signature sequence. `role` is "lead" for the single
 * origin flourish (nova's pop, atomic's central thump, the siege muzzle) and
 * "target" for every cleared enemy square; `delayMs` is the pre-computed
 * stagger so the sequence rolls across the board. (Thin wrapper: the actual
 * SigVisual switch is code-split into sigVisuals.tsx — see note above.) */
export function SignatureOverlay(props: SignatureVisualProps) {
  const Impl = LoadedSignatureVisual;
  if (Impl) return <Impl {...props} />;
  return (
    <React.Suspense fallback={null}>
      <LazySignatureVisual {...props} />
    </React.Suspense>
  );
}


// --- Cast spectacles: EVERY card play gets a themed read ---------------------
// The category fallback layer (owner request: "no card should ever play
// silently"). Board mounts ONE CastSpectacle over the whole board crop each
// time a card is played, themed by the card's category and scaled by its tier:
//   sleek   (tier 1-4): a quick, elegant edge ring + a diagonal shine sweep +
//           a small emblem pop. Subtle enough to sit under bespoke art.
//   grand   (tier 5-7): a category-tinted radial wash plus the card icon's
//           CategoryArrival choreography (cardEntrance.tsx).
//   marquee (tier 8-10): a board takeover — vignette dim, twin sweeping beams,
//           the arrival at full scale, triple shockwaves (Board adds shake).
// Cards WITH bespoke play art get chrome only (frame pulse + wash + banner):
// their own scene is the spectacle, so a generic face icon is never stamped
// over it. All transform/opacity-only, all one-shot, all hidden when
// animations are off in Settings (see effects.css).

export type CastIntensity = "sleek" | "grand" | "marquee";

export function castIntensity(tier: number): CastIntensity {
  return tier >= 8 ? "marquee" : tier >= 5 ? "grand" : "sleek";
}

/** Per-category theme: a saturated accent and a soft wash of the same hue. */
export const CAST_THEME: Record<BuffCategory, { color: string; soft: string }> = {
  movement: { color: "#67e8f9", soft: "rgba(103,232,249,0.14)" },
  pieces: { color: "#e6bf6a", soft: "rgba(230,191,106,0.14)" },
  tempo: { color: "#f4c430", soft: "rgba(244,196,48,0.13)" },
  protection: { color: "#7eb59a", soft: "rgba(126,181,154,0.15)" },
  attack: { color: "#e05252", soft: "rgba(224,82,82,0.14)" },
  info: { color: "#8ba9c4", soft: "rgba(139,169,196,0.14)" },
  draft: { color: "#e07ab8", soft: "rgba(224,122,184,0.13)" },
  nerf: { color: "#5eead4", soft: "rgba(94,234,212,0.14)" },
  hex: { color: "#a877d8", soft: "rgba(168,119,216,0.15)" },
  item: { color: "#a3d160", soft: "rgba(163,209,96,0.14)" },
};

const CAST_SPARKS = [
  { dx: "330%", dy: "-140%", rot: "200deg", delay: 0 },
  { dx: "-310%", dy: "-190%", rot: "-230deg", delay: 30 },
  { dx: "290%", dy: "170%", rot: "250deg", delay: 12 },
  { dx: "-280%", dy: "200%", rot: "-210deg", delay: 40 },
  { dx: "10%", dy: "-330%", rot: "140deg", delay: 20 },
  { dx: "-20%", dy: "320%", rot: "-160deg", delay: 48 },
];

/** Small deterministic hash so a card's cast styling (sweep direction, tilt,
 *  glint ring phase) is ITS OWN and stable across plays — two same-category
 *  tier-2 cards no longer produce pixel-identical casts. */
function castHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Centered card announcement riding the cast: the card's name in its tier
 *  color over a one-line rule summary, so what just happened is readable ON
 *  the board (the top-right feed keeps the permanent record). */
function CastBanner({
  name,
  description,
  tier,
  color,
}: {
  name: string;
  description?: string;
  tier: number;
  color: string;
}) {
  return (
    <span className="fx-cast-banner absolute inset-x-0 top-[9%] flex flex-col items-center px-[6%] text-center">
      {/* Soft elliptical scrim for legibility — no plate, no border: the
          cinematic title treatment (ce-title-*, cardEntrance.css). */}
      <span
        className="pointer-events-none absolute inset-x-[4%] -inset-y-[30%]"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(8,10,15,0.78), transparent 72%)" }}
      />
      <span className="relative block max-w-full overflow-hidden">
        <span
          className={`ce-title-name block font-display text-base font-bold leading-tight tier-${tier}`}
          style={{ textShadow: `0 2px 10px rgba(0,0,0,0.95), 0 0 20px ${color}44` }}
        >
          {name}
        </span>
        <span
          className="ce-title-sweep absolute inset-y-0 w-[18%]"
          style={{
            animationDelay: "260ms",
            background: "linear-gradient(100deg, transparent, rgba(255,250,235,0.45), transparent)",
          }}
        />
      </span>
      <span
        className="ce-title-rule mt-0.5 block h-[2px] w-[30%] rounded-full"
        style={{ animationDelay: "180ms", background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      {description && (
        <span
          className="ce-title-tag relative mt-0.5 block max-h-[2.6em] max-w-[86%] overflow-hidden text-[10.5px] leading-snug text-parchment-200"
          style={{ animationDelay: "240ms", textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}
        >
          {description}
        </span>
      )}
    </span>
  );
}

export function CastSpectacle({
  category,
  tier,
  id,
  name,
  description,
  cardIcon,
  bespoke = false,
}: {
  category: BuffCategory;
  tier: number;
  /** Card id: keys the per-card emblem + deterministic cast variation. */
  id?: string;
  /** Card name + rule text for the on-board announcement banner. */
  name?: string;
  description?: string;
  /** The card's own icon field (BUFF_BY_ID[id].icon), when it has one. */
  cardIcon?: string;
  /** True when the card has hand-made play art (core or plugin). The bespoke
   * scene IS the spectacle then: this layer stands down to banner + frame so
   * a face icon is never stamped over it (the Jackpot-wheel-cherry / Total
   * War red-swords bug). */
  bespoke?: boolean;
}) {
  const theme = CAST_THEME[category];
  // The card's UNIQUE face icon (the same one on its card face and in the
  // dock) — a goose card casts a goose, not a generic category glyph.
  const Icon = (id ? cardFaceIcon(id, category, cardIcon) : undefined) ?? CATEGORY_ICON[category];
  const intensity = castIntensity(tier);
  const banner = name ? (
    <CastBanner name={name} description={description} tier={tier} color={theme.color} />
  ) : null;
  if (bespoke) {
    // Chrome only: tier-tinted frame pulse + wash + the announcement banner.
    // Everything center-stage belongs to the card's own art.
    return (
      <span className="fx-cast pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
        {intensity !== "sleek" && (
          <span
            className="fx-cast-wash absolute inset-0 block"
            style={{ background: `radial-gradient(circle, ${theme.soft}, transparent 74%)` }}
          />
        )}
        <span
          className="fx-cast-ring absolute inset-[1%] block rounded-sm"
          style={{
            border: `${intensity === "marquee" ? 2.5 : 1.5}px solid ${theme.color}`,
            boxShadow: `inset 0 0 ${intensity === "marquee" ? 34 : 18}px ${theme.soft}`,
          }}
        />
        {banner}
      </span>
    );
  }
  if (intensity === "sleek") {
    // Per-card variation: sweep direction + tilt + emblem anchor derive from
    // the id hash, so every low-tier card owns a recognizably distinct cast.
    const h = id ? castHash(id) : 0;
    const fromRight = (h & 1) === 1;
    const tilt = `${(fromRight ? -1 : 1) * (10 + (h % 12))}deg`;
    const emblemLeft = 8 + ((h >>> 4) % 3) * 42; // 8% / 50% / 92% across the top
    return (
      <span className="fx-cast pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
        <span
          className="fx-cast-ring absolute inset-[1.5%] block rounded-sm"
          style={{ border: `1.5px solid ${theme.color}`, boxShadow: `inset 0 0 18px ${theme.soft}` }}
        />
        <span className="absolute inset-0 block overflow-hidden">
          <span
            className={(fromRight ? "fx-cast-sweep-rev" : "fx-cast-sweep") + " absolute top-[-40%] block h-[180%] w-[10%]"}
            style={{
              [fromRight ? "right" : "left"]: "-25%",
              background: `linear-gradient(90deg, transparent, ${theme.soft}, transparent)`,
              "--tilt": tilt,
            } as React.CSSProperties}
          />
        </span>
        {/* A pair of counter-orbiting glints so the sleek band reads as a
            crafted moment, not just a border blink. */}
        <span className="fx-cast-orbit absolute left-1/2 top-1/2 block h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2">
          <span
            className="absolute left-1/2 top-0 h-[6%] w-[6%] -translate-x-1/2 rounded-full"
            style={{ background: theme.color, boxShadow: `0 0 8px 2px ${theme.soft}` }}
          />
        </span>
        <span className="fx-cast-orbit-rev absolute left-1/2 top-1/2 block h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2">
          <span
            className="absolute bottom-0 left-1/2 h-[4.5%] w-[4.5%] -translate-x-1/2 rounded-full"
            style={{ background: theme.color, boxShadow: `0 0 6px 1px ${theme.soft}` }}
          />
        </span>
        <span
          className="fx-cast-emblem absolute top-[6%] flex h-[10%] w-[10%] items-center justify-center"
          style={{ color: theme.color, left: `${emblemLeft}%`, marginLeft: "-5%" }}
        >
          {React.createElement(Icon, { className: "h-full w-full", strokeWidth: 2 })}
        </span>
        {banner}
      </span>
    );
  }
  if (intensity === "grand") {
    return (
      <span className="fx-cast pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
        <span
          className="fx-cast-wash absolute inset-0 block"
          style={{ background: `radial-gradient(circle, ${theme.soft}, transparent 74%)` }}
        />
        <span
          className="fx-cast-ring absolute inset-[1%] block rounded-sm"
          style={{ border: `2px solid ${theme.color}`, boxShadow: `inset 0 0 26px ${theme.soft}` }}
        />
        {/* the card's icon ARRIVES in its category's choreography (comet /
            curse circle / clock sweep / crate drop...) instead of being
            stamped flat over the board */}
        <span className="absolute left-[28%] top-[22%] block h-[44%] w-[44%]">
          <CategoryArrival category={category} icon={Icon} delayMs={90} />
        </span>
        {banner}
      </span>
    );
  }
  return (
    <span className="fx-cast pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
      <span className="fx-cast-dim absolute inset-0 block" style={{ background: "rgba(6,10,16,0.5)" }} />
      <span className="absolute inset-0 block overflow-hidden">
        <span
          className="fx-cast-beam absolute top-[-40%] left-[-30%] block h-[180%] w-[16%]"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.soft}, ${theme.color}22, transparent)`,
            "--tilt": "16deg",
          } as React.CSSProperties}
        />
        <span
          className="fx-cast-beam-back absolute top-[-40%] right-[-30%] block h-[180%] w-[16%]"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.soft}, ${theme.color}22, transparent)`,
            "--tilt": "-16deg",
          } as React.CSSProperties}
        />
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="fx-cast-shock absolute left-1/2 top-1/2 ml-[-16%] mt-[-16%] block h-[32%] w-[32%] rounded-full"
          style={{ border: `3px solid ${theme.color}`, animationDelay: `${140 + i * 190}ms` }}
        />
      ))}
      {/* marquee: the same category arrival at board-takeover scale */}
      <span className="absolute left-[16%] top-[10%] block h-[64%] w-[64%]">
        <CategoryArrival category={category} icon={Icon} delayMs={140} />
      </span>
      <span
        className="fx-cast-ring absolute inset-[0.5%] block rounded-sm"
        style={{ border: `2.5px solid ${theme.color}`, boxShadow: `inset 0 0 40px ${theme.soft}`, animationDelay: "120ms" }}
      />
      <span className="absolute left-1/2 top-1/2 ml-[-6%] mt-[-6%] block h-[12%] w-[12%]">
        <ShardBurst vectors={CAST_SPARKS} fill={theme.color} stroke="#1a222e" delayMs={420} sizePct={85} />
      </span>
      {banner}
    </span>
  );
}
