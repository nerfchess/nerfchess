"use client";

// Board effect overlays: one component per card-effect family, mounted only
// on affected squares by Board.tsx. All SVG inline (no emoji), all animation
// transform/opacity-only, defined in effects.css. Persistent overlays render
// a static end state under prefers-reduced-motion; one-shot flourishes hide.

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
import type { PieceType } from "@/engine/types";
import "./effects.css";

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

/** Squirrel scurrying in to bury a walnut-hexed piece (replaces the emoji). */
export const SquirrelGlyph = React.memo(function SquirrelGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <g stroke="#5d3a1e" strokeWidth="0.7" strokeLinejoin="round">
        {/* tail: big back curl */}
        <path
          d="M12.5 16.5 C18.5 16 20 9 15.5 5.5 C17.6 9.5 15.6 13 12 13.6 Z"
          fill="#8a5230"
        />
        {/* body */}
        <path
          d="M5.2 17 C4 13.6 5.6 10.6 8.6 10.4 C11 10.2 12.4 12 12.4 14 C12.4 16 10.6 17 8.6 17 Z"
          fill="#a1663a"
        />
        {/* head + ear */}
        <path d="M6.6 10.8 L5.9 8.6 L7.8 9.3 Z" fill="#a1663a" />
        <circle cx="6.4" cy="11" r="2.1" fill="#a1663a" />
      </g>
      <circle cx="5.7" cy="10.6" r="0.55" fill="#2b1c10" />
    </svg>
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
function SparkStar() {
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
  { dx: "260%", dy: "-180%", rot: "140deg", delay: 0 },
  { dx: "-240%", dy: "-230%", rot: "-160deg", delay: 30 },
  { dx: "300%", dy: "90%", rot: "200deg", delay: 15 },
  { dx: "-280%", dy: "150%", rot: "-120deg", delay: 45 },
  { dx: "60%", dy: "-310%", rot: "90deg", delay: 10 },
  { dx: "-90%", dy: "280%", rot: "-90deg", delay: 40 },
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
  { dx: "300%", dy: "-160%", rot: "150deg", delay: 0 },
  { dx: "-280%", dy: "-220%", rot: "-140deg", delay: 20 },
  { dx: "340%", dy: "120%", rot: "190deg", delay: 10 },
  { dx: "-320%", dy: "180%", rot: "-170deg", delay: 30 },
  { dx: "90%", dy: "-330%", rot: "80deg", delay: 5 },
  { dx: "-120%", dy: "300%", rot: "-100deg", delay: 25 },
  { dx: "220%", dy: "260%", rot: "120deg", delay: 15 },
];

/**
 * A piece removed outright by an attack card (nothing landed on its square,
 * it did not move away): an expanding blast ring, a burst of ember shards,
 * and a scorch mark that lingers a beat before fading. Pure one-shot CSS;
 * hidden entirely under reduced motion like the other transient flourishes.
 */
export function DetonationBurst() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
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
}: {
  category: BuffCategory;
  color: string;
  className: string;
}) {
  const Icon = CATEGORY_ICON[category];
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

/**
 * Card-fx motif for one square. Constraints (jail / muzzle / anchor / slow)
 * are small badges in the square's top-right corner; blindfold is a band
 * across the piece base; empower is a regalia roundel bestowed with a
 * knighting rise; ward is a thin ring at the piece base; rally is a one-shot
 * banner flourish over the rallied army's king. All persistent variants end
 * in a calm static pose (reduced motion shows that state directly); rally is
 * transient and hides under reduced motion, matching the stun precedent.
 */
export const MotifBadge = React.memo(function MotifBadge({
  motif,
  tier,
  category,
  moveAs,
}: {
  motif: CardFx["motif"];
  tier: number;
  category: BuffCategory;
  moveAs?: PieceType;
}) {
  const color = TIER_COLOR[tier] ?? TIER_COLOR[3];
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
        <CategoryChip category={category} color={color} className="bottom-[6%] left-0 h-[26%] w-[24%]" />
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
          </svg>
        </span>
        <CategoryChip category={category} color={color} className="bottom-[40%] right-[3%] h-[15%] w-[15%]" />
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
          </svg>
        </span>
        <CategoryChip category={category} color={color} className="bottom-[22%] right-[3%] h-[15%] w-[15%]" />
      </>
    );
  }
  if (motif === "empower") {
    return (
      <>
        <span
          aria-hidden="true"
          className="fx-bestow pointer-events-none absolute right-[2%] top-[2%] z-10 h-[32%] w-[32%]"
          style={{ color }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <circle cx="10" cy="10" r="8.8" fill="rgba(20,30,43,0.9)" stroke="currentColor" strokeWidth="1" />
            <RegaliaSilhouette type={moveAs} />
          </svg>
        </span>
        <CategoryChip category={category} color={color} className="right-[2%] top-[34%] h-[15%] w-[15%]" />
      </>
    );
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="fx-motif pointer-events-none absolute right-[3%] top-[3%] z-10 h-[30%] w-[30%]"
        style={{ color }}
      >
        <svg viewBox="0 0 20 20" className="h-full w-full opacity-90">
          {motif === "jail" ? (
            <JailGlyph />
          ) : motif === "muzzle" ? (
            <MuzzleGlyph />
          ) : motif === "anchor" ? (
            <AnchorGlyph />
          ) : (
            <SlowGlyph />
          )}
        </svg>
      </span>
      <CategoryChip category={category} color={color} className="right-[3%] top-[33%] h-[15%] w-[15%]" />
    </>
  );
});
