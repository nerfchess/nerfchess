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

/**
 * Card-fx motif for one square. Constraints (jail / muzzle / anchor / slow)
 * are small badges in the square's top-right corner; blindfold is a band
 * across the piece base; empower is a regalia roundel bestowed with a
 * knighting rise; ward is a thin ring at the piece base; rally is a one-shot
 * banner flourish over the rallied army's king. All persistent variants end
 * in a calm static pose (reduced motion shows that state directly); rally is
 * transient and hides under reduced motion, matching the stun precedent.
 *
 * Per-card distinctness: every badge is tinted by the card's TIER color and
 * co-stamped with its CATEGORY glyph (CategoryChip), and a NAME-seeded accent
 * pip (see nameHash / AccentPip) breaks ties between cards that also share tier
 * and category, so no two different active cards ever look identical.
 */
export const MotifBadge = React.memo(function MotifBadge({
  motif,
  tier,
  category,
  moveAs,
  name,
}: {
  motif: CardFx["motif"];
  tier: number;
  category: BuffCategory;
  moveAs?: PieceType;
  /** Card name: seeds the deterministic per-card accent pip. Optional and
   * backward compatible: when Board does not forward it the badge simply omits
   * the accent (the tier tint + category glyph still apply). Board has it in
   * hand at the MotifBadge call site (motifMark.name, already used for the
   * React key), so wiring it through is a one-line change. */
  name?: string;
}) {
  const color = TIER_COLOR[tier] ?? TIER_COLOR[3];
  const accent = name ? nameHash(name) : null;
  const accentAngle = accent != null ? accent % 360 : null;
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
            {accent != null && <AccentPip cx={6 + (accent % 48)} cy={6} r={0} angleDeg={0} />}
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
            {accent != null && <AccentPip cx={6 + (accent % 48)} cy={6} r={0} angleDeg={0} />}
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
            {accentAngle != null && <AccentPip cx={10} cy={10} r={8.8} angleDeg={accentAngle} />}
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
          {accentAngle != null && <AccentPip cx={10} cy={10} r={9} angleDeg={accentAngle} />}
        </svg>
      </span>
      <CategoryChip category={category} color={color} className="right-[3%] top-[33%] h-[15%] w-[15%]" />
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
  | "chronosteal"
  | "blink"
  | "portal"
  | "borderward"
  | "banana"
  | "minefield"
  | "vortex";
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
 * DEFERRED (HOOK): atomic_captures / atomic_captures_small are passive
 * on-capture augments (captureExplosion in the engine): their octagon of
 * cleared squares IS derivable from the diff, but a plain capture move emits
 * NO card-play event to key the signature to, so they need a capture-trigger
 * hook and belong in a later batch. The "octagon" ordering, AtomicBurst
 * visual, and playAtomic voice below are left in place, ready for that hook.
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
export const SIGNATURES: Record<string, SignatureConfig> = {
  nova: { ordering: "file", staggerMs: 130, victims: "all", visual: "nova", hasLead: true, sound: "nova" },
  cataclysm: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "trapdoor", hasLead: false, sound: "cataclysm" },
  extinction: { ordering: "sweep", staggerMs: 65, victims: ["p", "n", "b"], visual: "stone", hasLead: false, sound: "extinction" },
  lightning_strike: { ordering: "sweep", staggerMs: 165, victims: "all", visual: "strike", hasLead: false, sound: "lightning" },
  queens_rampage: { ordering: "line", staggerMs: 105, victims: "all", mover: "q", visual: "pin", hasLead: false, sound: "rampage" },
  queens_wrath: { ordering: "line", staggerMs: 110, victims: "all", mover: "q", visual: "pin", hasLead: false, sound: "rampage" },
  siege_rook: { ordering: "line", staggerMs: 85, victims: "all", mover: "r", visual: "siege", hasLead: true, sound: "siege" },

  // --- Batch 2: movement / coronation grants (empower motif zone) ---
  amazon_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  god_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  double_amazon: { ordering: "sweep", staggerMs: 110, victims: ["n"], visual: "crownrain", hasLead: false, sound: "crownrain", source: "empower" },
  triple_amazon: { ordering: "sweep", staggerMs: 100, victims: ["n"], visual: "crownrain", hasLead: false, sound: "crownrain", source: "empower" },
  amazon_army: { ordering: "sweep", staggerMs: 90, victims: ["n", "b"], visual: "crownrain", hasLead: false, sound: "crownrain", source: "empower" },
  colossus: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "colossus", hasLead: true, sound: "colossus", source: "empower" },
  titan: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "colossus", hasLead: true, sound: "colossus", source: "empower" },

  // --- Batch 2: time / tempo (skip -> stun zone; blitz -> rally zone) ---
  time_skip: { ordering: "radial", staggerMs: 0, victims: "all", visual: "snooze", hasLead: true, sound: "snooze", source: "stun" },
  time_prison: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockcage", hasLead: true, sound: "clockcage", source: "stun" },
  time_freeze: { ordering: "radial", staggerMs: 0, victims: "all", visual: "clockice", hasLead: true, sound: "clockice", source: "stun" },
  blitzkrieg: { ordering: "radial", staggerMs: 70, victims: "all", visual: "blitz", hasLead: true, sound: "blitz", source: "rally" },

  // --- Batch 2: freeze spectacles (frozen zone) --- now each its own read:
  // a quick spike-frost snap, a slab of deep glacier, an eternal ice shatter.
  mass_freeze: { ordering: "radial", staggerMs: 45, victims: ["p", "n", "b", "r", "q"], visual: "snapfrost", hasLead: false, sound: "massfreeze", source: "frozen" },
  deep_freeze: { ordering: "radial", staggerMs: 55, victims: ["p", "n", "b", "r", "q"], visual: "deepglacier", hasLead: true, sound: "massfreeze", source: "frozen" },
  eternal_freeze: { ordering: "radial", staggerMs: 65, victims: ["p", "n", "b", "r", "q"], visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },

  // --- Batch 2: petrify / curse (walnut zone) --- gorgon beam vs snake-hair
  // wash, so the two Medusa cards no longer read the same.
  medusas_stare: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "gorgonstare", hasLead: true, sound: "petrify", source: "walnut" },
  medusa_stare: { ordering: "radial", staggerMs: 40, victims: "all", visual: "medusagaze", hasLead: true, sound: "petrify", source: "walnut" },
  petrified_forest: { ordering: "sweep", staggerMs: 70, victims: ["n", "b"], visual: "petrifiedforest", hasLead: false, sound: "petrifiedforest", source: "walnut" },

  // --- Batch 2: protection ---
  aegis: { ordering: "radial", staggerMs: 35, victims: "all", visual: "aegis", hasLead: true, sound: "aegis", source: "shield" },
  immortal_king: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "shades", hasLead: true, sound: "shades", source: "kingSafe" },
  divine_fortress: { ordering: "radial", staggerMs: 40, victims: "all", visual: "cathedral", hasLead: true, sound: "cathedral", source: "shield" },
  rampart: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "wallbuild", hasLead: false, sound: "wall", source: "summon" },
  great_wall: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "greatwall", hasLead: false, sound: "wall", source: "blindfold" },

  // --- Batch 3: FANTASY set (src/engine/buffs/fantasy/*). Each entry reuses an
  // existing SigSoundKey and an already-wired source zone; the visual is a new
  // key matched to the card's actual effect so every one reads distinctly. ---

  // Beasts / attack line sweeps + smites (removal diff, the default source).
  dragons_breath: { ordering: "line", staggerMs: 80, victims: "all", mover: "r", visual: "dragonfire", hasLead: true, sound: "atomic" },
  wyverns_dive: { ordering: "line", staggerMs: 90, victims: "all", mover: "n", visual: "dive", hasLead: false, sound: "rampage" },
  soul_harvest: { ordering: "line", staggerMs: 95, victims: "all", mover: "q", visual: "scythe", hasLead: false, sound: "rampage" },
  chain_lightning: { ordering: "line", staggerMs: 110, victims: "all", mover: "b", visual: "arclight", hasLead: false, sound: "lightning" },
  judgment_day: { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], visual: "smite", hasLead: true, sound: "lightning" },
  heavens_wrath: { ordering: "sweep", staggerMs: 150, victims: ["n", "b", "r", "q"], visual: "smite", hasLead: true, sound: "lightning" },

  // Freeze / stasis (frozen zone).
  staff_of_stasis: { ordering: "radial", staggerMs: 0, victims: "all", visual: "chainfreeze", hasLead: true, sound: "massfreeze", source: "frozen" },
  evil_eye: { ordering: "radial", staggerMs: 0, victims: "all", visual: "frostsweep", hasLead: false, sound: "massfreeze", source: "frozen" },

  // Petrify / stone (walnut zone).
  basilisk_stare: { ordering: "radial", staggerMs: 0, victims: "all", visual: "gorgonstare", hasLead: true, sound: "petrify", source: "walnut" },
  serpent_brood: { ordering: "sweep", staggerMs: 60, victims: ["b"], visual: "serpentstone", hasLead: false, sound: "petrify", source: "walnut" },
  withering_touch: { ordering: "radial", staggerMs: 0, victims: "all", visual: "wither", hasLead: true, sound: "petrify", source: "walnut" },
  chains_of_binding: { ordering: "sweep", staggerMs: 70, victims: ["r"], visual: "stonechain", hasLead: false, sound: "petrify", source: "walnut" },
  hex_of_stone: { ordering: "sweep", staggerMs: 55, victims: ["n", "b"], visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },

  // Divine / protection (shield + kingSafe zones).
  aegis_of_ages: { ordering: "radial", staggerMs: 35, victims: "all", visual: "aegis", hasLead: true, sound: "aegis", source: "shield" },
  divine_intervention: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "holylight", hasLead: true, sound: "shades", source: "kingSafe" },

  // Court decree (stun zone).
  divine_reckoning: { ordering: "radial", staggerMs: 0, victims: "all", visual: "decree", hasLead: true, sound: "snooze", source: "stun" },

  // Regalia / movement grants (empower zone).
  excalibur: { ordering: "radial", staggerMs: 0, victims: ["b"], visual: "bladegift", hasLead: true, sound: "coronation", source: "empower" },
  dragon_form: { ordering: "radial", staggerMs: 0, victims: ["r"], visual: "wings", hasLead: true, sound: "colossus", source: "empower" },
  celestial_ascension: { ordering: "sweep", staggerMs: 80, victims: ["b"], visual: "wings", hasLead: false, sound: "colossus", source: "empower" },
  god_king: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  banner_of_war: { ordering: "radial", staggerMs: 60, victims: ["n"], visual: "warhorn", hasLead: true, sound: "blitz", source: "empower" },

  // Barred walls (blindfold zone).
  frost_wall: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "icewall", hasLead: false, sound: "wall", source: "blindfold" },
  wall_of_thorns: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "thornwall", hasLead: false, sound: "wall", source: "blindfold" },

  // Summons / reinforcements / graves (summon zone).
  summon_dragon: { ordering: "radial", staggerMs: 0, victims: "all", visual: "dragonrise", hasLead: true, sound: "wall", source: "summon" },
  starfall: { ordering: "radial", staggerMs: 0, victims: "all", visual: "meteor", hasLead: true, sound: "wall", source: "summon" },
  army_of_the_dead: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "gravehands", hasLead: false, sound: "wall", source: "summon" },
  raise_dead: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "gravehands", hasLead: false, sound: "wall", source: "summon" },
  undying_thrall: { ordering: "radial", staggerMs: 0, victims: "all", visual: "gravehands", hasLead: false, sound: "wall", source: "summon" },
  hallowed_return: { ordering: "radial", staggerMs: 0, victims: "all", visual: "holylight", hasLead: true, sound: "wall", source: "summon" },
  imp_familiar: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  summoning_circle: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  horn_of_summoning: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  roost_of_rocs: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  phantom_guardian: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  stone_golem: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  direwolf_pack: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },

  // --- Batch 4: WILD set (wild/elemental|warfare|arcane|chaos) + Computer
  // Virus. Removal-sourced entries (fire / storm / siege charges /
  // disintegration / wrecking ball) render off the detonation diff today; the
  // effect-data-sourced ones (freeze / walnut / wall / summon / shield / stun
  // zones) join the inert-until-wired Batch 2/3 set. Every entry reuses an
  // existing SigSoundKey and SigZone; transforms are left to the crown morph
  // flourish (they carry no detonation and already read as a coronation). ---

  // FIRE (wild/elemental): big removals and a queen's hellfire beam.
  we_immolation: { ordering: "radial", staggerMs: 0, victims: ["r", "q"], visual: "inferno", hasLead: false, sound: "atomic" },
  we_conflagration: { ordering: "sweep", staggerMs: 120, victims: ["p", "n", "b"], visual: "inferno", hasLead: false, sound: "cataclysm" },
  we_flame_lance: { ordering: "line", staggerMs: 95, victims: "all", mover: "r", visual: "dragonfire", hasLead: true, sound: "atomic" },
  we_hellfire_beam: { ordering: "line", staggerMs: 70, victims: "all", mover: "q", visual: "hellfire", hasLead: true, sound: "cataclysm" },

  // ICE (wild/elemental): mass freezes, an ice wall, a whiteout blizzard.
  we_hailstorm: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "hailstorm", hasLead: false, sound: "massfreeze", source: "frozen" },
  we_flash_freeze: { ordering: "radial", staggerMs: 40, victims: "all", visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },
  we_glacier_wall: { ordering: "sweep", staggerMs: 50, victims: "all", visual: "icewall", hasLead: false, sound: "wall", source: "blindfold" },
  we_whiteout: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blizzard", hasLead: true, sound: "clockice", source: "stun" },

  // EARTH (wild/elemental): petrify, summon, rock walls, a landslide.
  we_petrify_ranks: { ordering: "sweep", staggerMs: 60, victims: ["n", "b"], visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },
  we_stone_soldiers: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "stonerise", hasLead: false, sound: "wall", source: "summon" },
  we_mountain_range: { ordering: "sweep", staggerMs: 65, victims: "all", visual: "mountainwall", hasLead: false, sound: "wall", source: "blindfold" },
  we_landslide: { ordering: "sweep", staggerMs: 100, victims: ["r", "q"], visual: "rockfall", hasLead: false, sound: "cataclysm" },
  we_thorn_barrier: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "thornwall", hasLead: false, sound: "wall", source: "blindfold" },

  // STORM (wild/elemental): targeted bolts and a summoned thunderhead.
  we_lightning_bolt: { ordering: "line", staggerMs: 0, victims: "all", mover: "q", visual: "strike", hasLead: false, sound: "lightning" },
  we_arc_lightning: { ordering: "line", staggerMs: 100, victims: "all", mover: "r", visual: "arclight", hasLead: false, sound: "lightning" },
  we_thunderhead: { ordering: "radial", staggerMs: 0, victims: "all", visual: "stormcloud", hasLead: false, sound: "wall", source: "summon" },

  // WARFARE (wild/warfare): charges, bombardment, reinforcement, siege lines.
  ww_bayonet_charge: { ordering: "line", staggerMs: 85, victims: "all", mover: "b", visual: "spearcharge", hasLead: false, sound: "rampage" },
  ww_spearhead: { ordering: "line", staggerMs: 90, victims: "all", mover: "r", visual: "spearcharge", hasLead: true, sound: "siege" },
  ww_armored_breakthrough: { ordering: "line", staggerMs: 80, victims: "all", mover: "q", visual: "tankroll", hasLead: false, sound: "rampage" },
  ww_bombardment: { ordering: "sweep", staggerMs: 110, victims: ["p"], visual: "artillery", hasLead: false, sound: "siege" },
  ww_counter_battery: { ordering: "radial", staggerMs: 0, victims: ["r", "b"], visual: "artillery", hasLead: false, sound: "siege" },
  ww_combined_arms: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  ww_muster_the_ranks: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  ww_forward_outpost: { ordering: "radial", staggerMs: 0, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  ww_paratroopers: { ordering: "sweep", staggerMs: 100, victims: "all", visual: "paradrop", hasLead: false, sound: "wall", source: "summon" },
  ww_suppressive_fire: { ordering: "radial", staggerMs: 45, victims: ["n"], visual: "suppress", hasLead: false, sound: "massfreeze", source: "frozen" },
  ww_double_trench: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "trench", hasLead: false, sound: "wall", source: "blindfold" },
  ww_dug_in_defense: { ordering: "radial", staggerMs: 30, victims: "all", visual: "aegis", hasLead: true, sound: "aegis", source: "shield" },

  // ARCANE (wild/arcane): time stop, mass freeze/petrify, disintegration, conjure.
  wa_time_stop: { ordering: "radial", staggerMs: 0, victims: "all", visual: "timestop", hasLead: true, sound: "clockcage", source: "walnut" },
  wa_frozen_moment: { ordering: "radial", staggerMs: 50, victims: ["r", "q"], visual: "chainfreeze", hasLead: true, sound: "massfreeze", source: "frozen" },
  wa_stone_pawns: { ordering: "sweep", staggerMs: 55, victims: ["p"], visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },
  wa_unmake: { ordering: "line", staggerMs: 90, victims: "all", mover: "b", visual: "unmake", hasLead: false, sound: "extinction" },
  wa_banish: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b"], visual: "unmake", hasLead: false, sound: "extinction" },
  wa_spectral_minors: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },

  // CHAOS (wild/chaos): wrecking ball, pinata, genie, hot seat.
  wc_wrecking_ball: { ordering: "line", staggerMs: 85, victims: "all", mover: "q", visual: "wreckingball", hasLead: true, sound: "rampage" },
  wc_pinata: { ordering: "radial", staggerMs: 0, victims: "all", visual: "pinata", hasLead: true, sound: "rampage" },
  wc_genie_wish: { ordering: "radial", staggerMs: 0, victims: "all", visual: "geniepoof", hasLead: false, sound: "wall", source: "summon" },
  wc_hot_seat: { ordering: "radial", staggerMs: 0, victims: "all", visual: "decree", hasLead: true, sound: "snooze", source: "stun" },

  // FUNNY (funny/clock): the Computer Virus corrupts the opponent's clock. No
  // board removal / zone effect, so like the Batch 2/3 stun-zone entries it is
  // registered here and renders once Board feeds it the opponent clock-area
  // squares; the glitch art + voice are complete.
  computer_virus: { ordering: "radial", staggerMs: 0, victims: "all", visual: "glitch", hasLead: true, sound: "clockcage", source: "stun" },

  // --- Batch 5: SECOND SPECTACLE PASS (library core + wild + funny). The next
  // tier of impactful cards that still fell back to the generic family effect.
  // Removal-sourced entries render off the detonation diff; the effect-data
  // ones join the inert-until-wired zone set (frozen / walnut / shield /
  // kingSafe / stun / empower / summon / blindfold / rally). Every entry reuses
  // an existing SigSoundKey and SigZone; the new visuals are flat-SVG one-shots
  // added with the Batch 5 art below (coral / mint / sun + tier colours). ---

  // Core removals (detonation diff): a piece is unmade in a crumble of motes.
  purge: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r"], visual: "disintegrate", hasLead: false, sound: "extinction" },
  annihilate: { ordering: "radial", staggerMs: 40, victims: ["p", "n", "b", "r"], visual: "disintegrate", hasLead: false, sound: "extinction" },
  shatter: { ordering: "radial", staggerMs: 55, victims: ["r", "b", "n"], visual: "disintegrate", hasLead: true, sound: "rampage" },
  purge_two: { ordering: "sweep", staggerMs: 90, victims: ["p"], visual: "disintegrate", hasLead: false, sound: "cataclysm" },
  we_scorch: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], visual: "inferno", hasLead: false, sound: "atomic" },
  wc_sacrificial_bishop: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], visual: "inferno", hasLead: false, sound: "atomic" },
  cavalry_charge: { ordering: "line", staggerMs: 95, victims: "all", mover: "n", visual: "cavalrycharge", hasLead: true, sound: "rampage" },

  // Freezes (frozen zone): each ice card its own read, varied stagger.
  wc_tar_pit: { ordering: "radial", staggerMs: 55, victims: ["b"], visual: "chainfreeze", hasLead: false, sound: "massfreeze", source: "frozen" },
  wc_double_trouble: { ordering: "radial", staggerMs: 60, victims: "all", visual: "iceshatter", hasLead: true, sound: "massfreeze", source: "frozen" },
  ww_pincer_movement: { ordering: "radial", staggerMs: 50, victims: "all", visual: "snapfrost", hasLead: false, sound: "massfreeze", source: "frozen" },
  wa_arrest_time: { ordering: "radial", staggerMs: 50, victims: ["r", "q"], visual: "deepglacier", hasLead: true, sound: "massfreeze", source: "frozen" },

  // Petrify (walnut zone): concrete shoes clamp the heavy pieces.
  wc_concrete_shoes: { ordering: "radial", staggerMs: 40, victims: ["r", "q"], visual: "stonechain", hasLead: false, sound: "petrify", source: "walnut" },
  we_stone_grip: { ordering: "radial", staggerMs: 0, victims: "all", visual: "greyhex", hasLead: false, sound: "petrify", source: "walnut" },

  // Shields / wards (shield zone): stone shells, bark canopies, rune pulses.
  we_stoneskin: { ordering: "radial", staggerMs: 45, victims: "all", visual: "stonehide", hasLead: true, sound: "aegis", source: "shield" },
  ww_form_square: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "wardpulse", hasLead: true, sound: "aegis", source: "shield" },
  we_verdant_shield: { ordering: "sweep", staggerMs: 70, victims: ["p"], visual: "canopy", hasLead: false, sound: "aegis", source: "shield" },
  wa_royal_aegis: { ordering: "radial", staggerMs: 0, victims: ["k", "q"], visual: "wardpulse", hasLead: true, sound: "aegis", source: "shield" },
  borrowed_time: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "wardpulse", hasLead: false, sound: "aegis", source: "shield" },

  // King wards (kingSafe zone).
  we_frost_ward: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "wardpulse", hasLead: true, sound: "shades", source: "kingSafe" },
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
  ww_relentless_assault: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "blitz", hasLead: false, sound: "blitz", source: "rally" },
  wc_juggling_act: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "warhorn", hasLead: true, sound: "blitz", source: "rally" },
  berserker: { ordering: "sweep", staggerMs: 75, victims: "all", visual: "warhorn", hasLead: true, sound: "blitz", source: "rally" },

  // Movement grants / veteran upgrades (empower zone).
  ww_command_tent: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "coronation", hasLead: true, sound: "coronation", source: "empower" },
  ww_flanking_knights: { ordering: "sweep", staggerMs: 100, victims: ["n"], visual: "warhorn", hasLead: true, sound: "blitz", source: "empower" },
  ww_dragoons: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "warhorn", hasLead: true, sound: "coronation", source: "empower" },
  glass_cannon: { ordering: "radial", staggerMs: 0, victims: ["b"], visual: "bladegift", hasLead: true, sound: "coronation", source: "empower" },

  // Summons / reinforcements (summon zone).
  grand_summon: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  kings_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  ww_mercenary_queen: { ordering: "radial", staggerMs: 0, victims: "all", visual: "summonrift", hasLead: false, sound: "wall", source: "summon" },
  second_army: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  clone_army: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "reinforce", hasLead: false, sound: "wall", source: "summon" },
  wc_conga_line: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "paradrop", hasLead: false, sound: "wall", source: "summon" },
  pizza_delivery: { ordering: "radial", staggerMs: 0, victims: "all", visual: "portal", hasLead: false, sound: "wall", source: "summon" },
  wc_clown_car: { ordering: "radial", staggerMs: 60, victims: "all", visual: "portal", hasLead: false, sound: "wall", source: "summon" },
  wc_rubber_duck_squad: { ordering: "radial", staggerMs: 60, victims: "all", visual: "portal", hasLead: false, sound: "wall", source: "summon" },
  wc_attack_goose: { ordering: "radial", staggerMs: 0, victims: "all", visual: "portal", hasLead: false, sound: "wall", source: "summon" },

  // Teleports / relocations (summon zone: the landing squares gain a piece).
  wa_far_step: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  wa_twin_blink: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  wc_yeet: { ordering: "radial", staggerMs: 0, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  warp_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },
  warp_storm: { ordering: "sweep", staggerMs: 75, victims: "all", visual: "blink", hasLead: false, sound: "wall", source: "summon" },

  // Walls / voids / traps (blindfold zone).
  fault_line: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "trench", hasLead: false, sound: "wall", source: "blindfold" },
  fissure: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "trench", hasLead: false, sound: "wall", source: "blindfold" },
  wa_glyph_seal: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "borderward", hasLead: false, sound: "wall", source: "blindfold" },
  wa_border_ward: { ordering: "sweep", staggerMs: 50, victims: "all", visual: "borderward", hasLead: false, sound: "wall", source: "blindfold" },
  wc_banana_peel_trail: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "banana", hasLead: false, sound: "wall", source: "blindfold" },
  ww_claymore_line: { ordering: "sweep", staggerMs: 60, victims: "all", visual: "minefield", hasLead: false, sound: "siege", source: "blindfold" },
  wc_black_hole: { ordering: "radial", staggerMs: 0, victims: "all", visual: "vortex", hasLead: true, sound: "wall", source: "blindfold" },
  wc_haunted_house: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "vortex", hasLead: false, sound: "wall", source: "blindfold" },
  wa_void_rift: { ordering: "radial", staggerMs: 0, victims: "all", visual: "vortex", hasLead: true, sound: "wall", source: "blindfold" },
};

/** A jagged lightning bolt that fills its wrapper (BoltGlyph is fixed-size). */
function JagBolt() {
  return (
    <svg viewBox="0 0 24 40" className="h-full w-full" aria-hidden="true">
      <polygon
        points="14,0 5,20 11,20 8,40 20,16 13,16"
        fill="#fff6c8"
        stroke="#e6b800"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STONE_SHARDS = [
  { left: "28%", top: "22%", w: "20%", c: "#9a9a9f", d: 0 },
  { left: "56%", top: "28%", w: "16%", c: "#7f7f85", d: 40 },
  { left: "36%", top: "48%", w: "22%", c: "#8c8c92", d: 70 },
  { left: "22%", top: "38%", w: "14%", c: "#71717a", d: 30 },
  { left: "62%", top: "52%", w: "15%", c: "#86868c", d: 55 },
  { left: "44%", top: "18%", w: "12%", c: "#6b6b73", d: 22 },
];

const PIN_STARS = [
  { dx: "300%", dy: "-210%", rot: "230deg", delay: 0 },
  { dx: "-280%", dy: "-170%", rot: "-220deg", delay: 14 },
  { dx: "260%", dy: "180%", rot: "270deg", delay: 8 },
  { dx: "-250%", dy: "210%", rot: "-190deg", delay: 22 },
  { dx: "20%", dy: "-320%", rot: "120deg", delay: 5 },
];

function NovaBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span
          className="fx-sig-shock absolute inset-[4%] block rounded-full"
          style={{ border: "2px solid rgba(255,255,255,0.95)", animationDelay: `${delayMs}ms` }}
        />
      )}
      <span
        className="fx-sig-flash absolute inset-[24%] block rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95), rgba(220,235,255,0.4) 60%, transparent 72%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-ring absolute inset-[16%] block rounded-full"
        style={{ border: "1px solid rgba(233,244,255,0.95)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(120,120,130,0.6), transparent 70%)",
          animationDelay: `${delayMs + 90}ms`,
        }}
      />
    </span>
  );
}

function TrapdoorBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-hole absolute inset-[26%] block rounded-[1px]"
        style={{ background: "rgba(10,8,6,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flap-l absolute left-[20%] top-[24%] block h-[52%] w-[30%] rounded-[1px]"
        style={{ background: "#5a3d22", border: "1px solid #2a1a0d", transformOrigin: "left center", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flap-r absolute right-[20%] top-[24%] block h-[52%] w-[30%] rounded-[1px]"
        style={{ background: "#5a3d22", border: "1px solid #2a1a0d", transformOrigin: "right center", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[22%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(196,178,142,0.7), transparent 70%)",
          animationDelay: `${delayMs + 70}ms`,
        }}
      />
    </span>
  );
}

function StoneBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[18%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(150,150,155,0.85), transparent 72%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {STONE_SHARDS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <span
        className="fx-sig-ash absolute inset-x-[26%] bottom-[18%] block h-[16%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(120,116,110,0.6), transparent 70%)",
          animationDelay: `${delayMs + 130}ms`,
        }}
      />
    </span>
  );
}

function StrikeBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-reticle absolute inset-[16%] block rounded-full"
        style={{ border: "1.5px solid rgba(210,225,255,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-bolt absolute left-1/2 top-[1%] ml-[-16%] block h-[66%] w-[32%]" style={{ animationDelay: `${delayMs + 175}ms` }}>
        <JagBolt />
      </span>
      <span
        className="fx-sig-scorch absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(24,18,12,0.75), transparent 72%)",
          animationDelay: `${delayMs + 200}ms`,
        }}
      />
    </span>
  );
}

function AtomicBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-soot absolute block rounded-full"
        style={{
          inset: lead ? "6%" : "22%",
          border: lead ? "3px solid rgba(30,24,20,0.7)" : "2px solid rgba(30,24,20,0.6)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-flash absolute inset-[26%] block rounded-full"
        style={{
          background: lead
            ? "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,180,90,0.5) 55%, transparent 72%)"
            : "radial-gradient(circle, rgba(255,210,140,0.9), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
    </span>
  );
}

function PinBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-spin absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(230,191,106,0.5), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {PIN_STARS.map((v, i) => (
        <span
          key={i}
          className="fx-sig-star absolute left-1/2 top-1/2 ml-[-6%] mt-[-6%] block h-[12%] w-[12%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}
        >
          <SparkStar />
        </span>
      ))}
    </span>
  );
}

function SiegeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // Muzzle flash at the cannon's mouth (the rook's origin square).
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span
          className="fx-sig-muzzle absolute left-[10%] top-[38%] block h-[24%] w-[80%] rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(255,244,200,0.95), rgba(255,170,70,0.5) 60%, transparent)",
            animationDelay: `${delayMs}ms`,
          }}
        />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-splat absolute inset-x-[12%] top-[36%] block h-[28%] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(150,146,140,0.85), transparent 72%)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[26%] block rounded-full"
        style={{ background: "radial-gradient(circle, rgba(120,116,110,0.55), transparent 70%)", animationDelay: `${delayMs + 60}ms` }}
      />
    </span>
  );
}

// --- 10b. Batch 2 signature visuals (effect-data sourced) --------------------
// Each is one square's slice of a Batch 2 spectacle: a keyed one-shot mounted
// only on an affected square, transform/opacity only, hidden under reduced
// motion (see effects.css). All decorate pieces that STAY on the board, so
// Board feeds them squares from an fx zone rather than the removal diff (see
// the SIGNATURES note). A shared crown glyph backs the coronation family.

/** The jeweled crown that descends in the coronation / regalia spectacles. */
function SigCrown() {
  return (
    <svg viewBox="0 0 24 14" className="h-full w-full" aria-hidden="true">
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
  );
}

/** Amazon Knight / God Knight: a shaft of light drops, a crown lowers onto the
 * piece, and a coronation flash blooms (lead). */
function CoronationBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[38%] top-0 block h-[72%] w-[24%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,244,200,0.85), rgba(255,220,130,0.15) 70%, transparent)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[22%] block rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,240,190,0.9), rgba(230,191,106,0.4) 55%, transparent 72%)",
            animationDelay: `${delayMs + 180}ms`,
          }}
        />
      )}
      <span
        className="fx-sig-crown absolute left-[27%] top-[8%] block h-[30%] w-[46%]"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <SigCrown />
      </span>
    </span>
  );
}

const CROWN_RAIN = [
  { left: "14%", w: "30%", d: 0 },
  { left: "50%", w: "26%", d: 90 },
  { left: "32%", w: "34%", d: 180 },
];

/** Double / Triple Amazon, Amazon Army: crowns rain down onto the piece. */
function CrownRainBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {CROWN_RAIN.map((c, i) => (
        <span
          key={i}
          className="fx-sig-crownfall absolute top-0 block h-[26%]"
          style={{ left: c.left, width: c.w, animationDelay: `${delayMs + c.d}ms` }}
        >
          <SigCrown />
        </span>
      ))}
    </span>
  );
}

/** Colossus / Titan: a stone shell grows over the piece and it stomps a ring
 * (lead). */
function ColossusBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-grow absolute inset-[16%] block rounded-full"
        style={{
          border: "2px solid rgba(150,150,158,0.85)",
          background: "radial-gradient(circle, rgba(120,120,128,0.28), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {lead && (
        <span
          className="fx-sig-shock absolute inset-[10%] block rounded-full"
          style={{ border: "2px solid rgba(230,191,106,0.8)", animationDelay: `${delayMs + 220}ms` }}
        />
      )}
    </span>
  );
}

/** Time Skip: a SNOOZE button slams down over the king (lead) and a Z drifts
 * up. */
function SnoozeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span
          className="fx-sig-snooze absolute left-[16%] top-[32%] block h-[34%] w-[68%] rounded-[1px]"
          style={{
            background: "rgba(60,72,92,0.92)",
            border: "1px solid rgba(190,205,225,0.8)",
            animationDelay: `${delayMs}ms`,
          }}
        >
          <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden="true">
            <path d="M12 6 h9 l-9 8 h9" fill="none" stroke="#e8eef6" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M23 8 h5 l-5 5 h5" fill="none" stroke="#e8eef6" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span
        className="fx-sig-zzz absolute left-[54%] top-[4%] block h-[34%] w-[34%]"
        style={{ animationDelay: `${delayMs + 160}ms` }}
      >
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 5 h9 l-9 9 h9" fill="none" stroke="#cdd8e6" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Time Prison: iron clock-hand bars drop into a cage around the king, a clock
 * face stamped on the front (lead). */
function ClockCageBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-cage absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#b9c4d6" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3 V29 M13 3 V29 M19 3 V29 M26 3 V29" />
          </g>
          <g stroke="#8a97ab" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4 H28 M4 28 H28" />
          </g>
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute left-[34%] top-[36%] block h-[28%] w-[32%]"
          style={{ animationDelay: `${delayMs + 200}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="8.4" fill="rgba(20,30,43,0.85)" stroke="#cdd8e6" strokeWidth="1.4" />
            <path d="M10 10 V4 M10 10 L14 12" stroke="#cdd8e6" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Time Freeze: a frost-rimmed clock crashes down and entombs the king in an
 * ice block, its face cracked (lead). */
function ClockIceBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[14%] block rounded-[1px]"
        style={{
          background: "linear-gradient(135deg, rgba(200,235,255,0.45), rgba(150,205,240,0.32))",
          border: "1px solid rgba(220,245,255,0.8)",
          animationDelay: `${delayMs}ms`,
        }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path d="M8 4 L14 14 L9 20 L16 30" fill="none" stroke="rgba(235,250,255,0.75)" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute left-[34%] top-[34%] block h-[30%] w-[32%]"
          style={{ animationDelay: `${delayMs + 120}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="8.4" fill="rgba(30,48,66,0.7)" stroke="#dff2ff" strokeWidth="1.4" />
            <path d="M10 10 V4 M10 10 L13.5 12" stroke="#dff2ff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      )}
    </span>
  );
}

const BLITZ_IMGS = [
  { left: "18%", d: 0 },
  { left: "36%", d: 55 },
  { left: "50%", d: 110 },
  { left: "64%", d: 165 },
];

/** Blitzkrieg: four forked-lightning after-images streak across in sequence,
 * with a combo flash on the lead square. */
function BlitzBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {BLITZ_IMGS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute top-[6%] block h-[70%] w-[22%]"
          style={{ left: b.left, animationDelay: `${delayMs + b.d}ms` }}
        >
          <JagBolt />
        </span>
      ))}
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[26%] block rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,246,200,0.9), rgba(255,200,90,0.4) 55%, transparent 72%)",
            animationDelay: `${delayMs + 200}ms`,
          }}
        />
      )}
    </span>
  );
}

/** Mass / Deep / Eternal Freeze: a flash-frost sweep glazes the square, a rime
 * pop at its heart. */
function FrostSweepBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-frost absolute inset-[6%] block rounded-[1px]"
        style={{
          background: "linear-gradient(90deg, rgba(210,240,255,0.7), rgba(170,215,245,0.4))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-flash absolute inset-[26%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(230,248,255,0.85), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
    </span>
  );
}

/** Medusa / Basilisk: a grey stone wave washes foot-to-head over the piece,
 * with a green stare glint (lead). */
function PetrifyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute bottom-[8%] left-[18%] right-[18%] top-[8%] block rounded-[1px]"
        style={{
          background: "linear-gradient(0deg, rgba(140,140,146,0.78), rgba(170,170,176,0.32))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {lead && (
        <span
          className="fx-sig-flash absolute left-[30%] top-[24%] block h-[18%] w-[40%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(150,220,150,0.85), transparent 70%)",
            animationDelay: `${delayMs + 90}ms`,
          }}
        />
      )}
    </span>
  );
}

/** Petrified Forest: bark creeps up the piece and a stone leaf drifts off. */
function PetrifiedForestBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute bottom-[6%] left-[22%] right-[22%] top-[10%] block rounded-[1px]"
        style={{
          background: "linear-gradient(0deg, rgba(96,72,44,0.82), rgba(130,102,66,0.4))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-ash absolute left-[52%] top-[14%] block h-[18%] w-[18%]"
        style={{ animationDelay: `${delayMs + 120}ms` }}
      >
        <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
          <path d="M6 1 C9 3 9 8 6 11 C3 8 3 3 6 1 Z" fill="#8a8a80" stroke="#4a4a44" strokeWidth="0.6" />
        </svg>
      </span>
    </span>
  );
}

/** Aegis: a board-wide shield flash rings the piece, a shield glyph settling on
 * the lead square. */
function AegisBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[12%] block rounded-full"
        style={{ border: "1.5px solid rgba(123,181,47,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flash absolute inset-[24%] block rounded-full"
        style={{ background: "radial-gradient(circle, rgba(163,209,96,0.65), transparent 70%)", animationDelay: `${delayMs}ms` }}
      />
      {lead && (
        <span
          className="fx-sig-crown absolute left-[32%] top-[20%] block h-[54%] w-[36%]"
          style={{ animationDelay: `${delayMs}ms` }}
        >
          <svg viewBox="0 0 24 28" className="h-full w-full" aria-hidden="true">
            <path
              d="M12 1 L22 5 V13 C22 20 17.5 25.2 12 27 C6.5 25.2 2 20 2 13 V5 Z"
              fill="rgba(22,30,22,0.85)"
              stroke="#7bb52f"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Divine Fortress: a cathedral dome descends over the square, a bright apex
 * glint (lead). */
function CathedralBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-dome absolute left-[14%] right-[14%] top-[10%] block h-[64%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 3 C31 3 36 14 36 26 V38 H4 V26 C4 14 9 3 20 3 Z" fill="rgba(30,40,55,0.35)" stroke="rgba(200,215,235,0.85)" strokeWidth="1.4" />
          <path d="M20 3 V38 M12 8 V38 M28 8 V38" stroke="rgba(200,215,235,0.5)" strokeWidth="0.8" fill="none" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute left-[42%] top-[4%] block h-[16%] w-[16%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,244,210,0.95), transparent 70%)", animationDelay: `${delayMs + 220}ms` }}
        />
      )}
    </span>
  );
}

/** Immortal King: the king returns wreathed in translucent shades. */
function ShadesBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shade absolute left-[24%] top-[14%] block h-[66%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
          <path
            d="M10 1 L10 5 M8 3 H12 M6.5 22 C4.5 15 7 10 10 10 C13 10 15.5 15 13.5 22 Z"
            fill="rgba(210,225,255,0.5)"
            stroke="rgba(180,205,255,0.85)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[16%] block rounded-full"
          style={{ border: "1px solid rgba(200,220,255,0.85)", animationDelay: `${delayMs + 80}ms` }}
        />
      )}
    </span>
  );
}

const WALL_BRICKS = [
  { left: "12%", bottom: "10%", d: 0 },
  { left: "40%", bottom: "10%", d: 60 },
  { left: "66%", bottom: "10%", d: 120 },
  { left: "26%", bottom: "34%", d: 180 },
  { left: "54%", bottom: "34%", d: 240 },
];

/** Rampart / Great Wall: an uncapturable wall builds brick by brick from the
 * ground up. */
function WallBuildBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {WALL_BRICKS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute block h-[22%] w-[24%] rounded-[1px]"
          style={{
            left: b.left,
            bottom: b.bottom,
            background: "rgba(120,86,58,0.9)",
            border: "1px solid rgba(60,40,24,0.8)",
            animationDelay: `${delayMs + b.d}ms`,
          }}
        />
      ))}
    </span>
  );
}

// --- 10c. Batch 3 signature visuals (distinctness split + fantasy set) -------
// Same rules as Batch 1/2: keyed one-shots, transform/opacity only, hidden
// under reduced motion (added to the effects.css block). These split apart the
// families that used to share one visual (freeze, petrify, walls) and cover the
// FANTASY card set, matching each card's real effect. Flat SVG fills and solid
// discs only: no gradients, no glow halos, bolder MOTION and MORE shapes.

/** A single flat shard (three silhouettes) that fills its wrapper. */
function SigShard({ fill, stroke, variant }: { fill: string; stroke: string; variant: number }) {
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

type BurstVec = { dx: string; dy: string; rot: string; delay: number };

// A big, wide scatter of shards (freeze shatter, ember blast, meteor debris).
const BURST_BIG: BurstVec[] = [
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
const BURST_MED: BurstVec[] = [
  { dx: "230%", dy: "-260%", rot: "160deg", delay: 0 },
  { dx: "-210%", dy: "-230%", rot: "-150deg", delay: 14 },
  { dx: "260%", dy: "-90%", rot: "200deg", delay: 8 },
  { dx: "-240%", dy: "-120%", rot: "-190deg", delay: 22 },
  { dx: "40%", dy: "-320%", rot: "120deg", delay: 5 },
];

/** A burst of flat shards flying out on the shared fx-sig-star keyframes. */
function ShardBurst({
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

// --- Freeze family (each ice card its own read) ------------------------------

/** Mass Freeze: a quick spike-frost SNAP, shards flick outward, rime flashes. */
function SnapFrostBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-frost absolute inset-[4%] block rounded-[1px]"
        style={{ background: "rgba(198,234,255,0.5)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs} sizePct={13} />
      <span
        className="fx-sig-flash absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(234,248,255,0.8)", animationDelay: `${delayMs}ms` }}
      />
    </span>
  );
}

/** Deep Freeze: a heavy glacier slab heaves up and slams over the piece, its
 * face veined with cracks; a rime crack flash on the lead square. */
function DeepGlacierBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-slab absolute inset-x-[8%] bottom-[6%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(176,220,245,0.5)", border: "1.5px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path
            d="M8 2 L13 12 L7 18 L14 30 M23 3 L18 11 L25 17 L20 31"
            fill="none"
            stroke="rgba(235,250,255,0.7)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[24%] block rounded-full"
          style={{ background: "rgba(224,246,255,0.75)", animationDelay: `${delayMs + 120}ms` }}
        />
      )}
    </span>
  );
}

/** Eternal Freeze: an ice block sets, then EXPLODES into a wide shard shatter
 * with a shockwave ring: the most violent of the three. */
function IceShatterBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[10%] block rounded-[1px]"
        style={{ background: "rgba(190,230,250,0.42)", border: "1px solid rgba(224,246,255,0.8)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path d="M16 2 L11 14 L18 18 L13 30 M4 12 L14 16 M28 12 L18 16" fill="none" stroke="rgba(235,250,255,0.7)" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e6f6ff" stroke="#82bcdf" delayMs={delayMs + 220} sizePct={13} />
      {lead && (
        <span
          className="fx-sig-shock absolute inset-[8%] block rounded-full"
          style={{ border: "2px solid rgba(210,240,255,0.85)", animationDelay: `${delayMs + 220}ms` }}
        />
      )}
    </span>
  );
}

/** Staff of Stasis: iced chain-links drape and freeze solid over the piece. */
function ChainFreezeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[12%] block rounded-[1px]"
        style={{ background: "rgba(190,230,250,0.4)", border: "1px solid rgba(224,246,255,0.8)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute inset-[10%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#cfe9fa" strokeWidth="2.4" fill="none">
            <ellipse cx="9" cy="9" rx="3.6" ry="2.4" transform="rotate(45 9 9)" />
            <ellipse cx="16" cy="16" rx="3.6" ry="2.4" transform="rotate(45 16 16)" />
            <ellipse cx="23" cy="23" rx="3.6" ry="2.4" transform="rotate(45 23 23)" />
          </g>
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[30%] block rounded-full"
          style={{ background: "rgba(224,246,255,0.72)", animationDelay: `${delayMs}ms` }}
        />
      )}
    </span>
  );
}

// --- Petrify / stone family --------------------------------------------------

/** Gorgon Stare (single champion / basilisk): a green petrifying beam bores in
 * as grey stone climbs the piece; a slit-pupil eye glares on the lead square. */
function GorgonStareBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[16%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(150,150,156,0.7)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-shaft absolute left-[40%] top-0 block h-[70%] w-[20%]"
        style={{ background: "rgba(126,181,154,0.5)", animationDelay: `${delayMs}ms` }}
      />
      {lead && (
        <span className="fx-sig-flash absolute left-[28%] top-[30%] block h-[24%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 24 12" className="h-full w-full" aria-hidden="true">
            <ellipse cx="12" cy="6" rx="11" ry="5" fill="rgba(20,30,24,0.85)" stroke="#8fd694" strokeWidth="1.2" />
            <ellipse cx="12" cy="6" rx="1.7" ry="4.2" fill="#b6f0b8" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Medusa's full gaze: grey stone washes up as snake-hair tendrils whip round
 * a gaze ring; a green glint on the lead square. */
function MedusaGazeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(146,146,152,0.72)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-gaze absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#8fb59a" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M20 6 q4 3 2 8 M34 20 q-3 4 -8 2 M20 34 q-4 -3 -2 -8 M6 20 q3 -4 8 -2" />
            <path d="M30 10 q1 4 -3 6 M30 30 q-4 1 -6 -3 M10 30 q-1 -4 3 -6 M10 10 q4 -1 6 3" />
          </g>
          <circle cx="20" cy="20" r="5.5" fill="none" stroke="#b6f0b8" strokeWidth="1.4" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[34%] block rounded-full"
          style={{ background: "rgba(150,220,150,0.8)", animationDelay: `${delayMs + 90}ms` }}
        />
      )}
    </span>
  );
}

/** Serpent Brood: stone-scaled serpents coil round the clergy and set solid. */
function SerpentStoneBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[20%] bottom-[8%] top-[10%] block rounded-[1px]"
        style={{ background: "rgba(138,138,146,0.72)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-gaze absolute inset-[16%] block" style={{ animationDelay: `${delayMs + 40}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 30 C8 20 20 24 20 16 C20 8 30 12 32 8" fill="none" stroke="#a6a6ac" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 30 C8 20 20 24 20 16 C20 8 30 12 32 8" fill="none" stroke="#6e6e76" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="32" cy="8" r="1.1" fill="#3a3a40" />
        </svg>
      </span>
    </span>
  );
}

const WITHER_MOTES = [
  { left: "30%", top: "24%", w: "13%", c: "#5f584e", d: 0 },
  { left: "52%", top: "30%", w: "11%", c: "#6b6358", d: 40 },
  { left: "38%", top: "48%", w: "15%", c: "#544e46", d: 70 },
  { left: "58%", top: "50%", w: "10%", c: "#726a5e", d: 55 },
];

/** Withering Touch: a grey pall drains up the piece as flesh crumbles to dust. */
function WitherBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(108,102,92,0.7)", animationDelay: `${delayMs}ms` }}
      />
      {WITHER_MOTES.map((m, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: m.left, top: m.top, width: m.w, height: m.w, background: m.c, animationDelay: `${delayMs + m.d}ms` }}
        />
      ))}
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[30%] block rounded-full"
          style={{ background: "rgba(96,110,90,0.7)", animationDelay: `${delayMs + 60}ms` }}
        />
      )}
    </span>
  );
}

/** Chains of Binding: spectral chain-bars drop over the towers as they turn to
 * dead stone. */
function StoneChainBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(140,140,146,0.7)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#141e2b" strokeWidth="3" fill="none">
            <ellipse cx="11" cy="7" rx="2.4" ry="4" />
            <ellipse cx="11" cy="16" rx="2.4" ry="4" />
            <ellipse cx="11" cy="25" rx="2.4" ry="4" />
            <ellipse cx="21" cy="7" rx="2.4" ry="4" />
            <ellipse cx="21" cy="16" rx="2.4" ry="4" />
            <ellipse cx="21" cy="25" rx="2.4" ry="4" />
          </g>
          <g stroke="#b9c4d6" strokeWidth="1.2" fill="none">
            <ellipse cx="11" cy="7" rx="2.4" ry="4" />
            <ellipse cx="11" cy="16" rx="2.4" ry="4" />
            <ellipse cx="11" cy="25" rx="2.4" ry="4" />
            <ellipse cx="21" cy="7" rx="2.4" ry="4" />
            <ellipse cx="21" cy="16" rx="2.4" ry="4" />
            <ellipse cx="21" cy="25" rx="2.4" ry="4" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Hex of Stone: a creeping grey hex crawls a stone hexagon over the flanks. */
function GreyHexBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[20%] bottom-[8%] top-[10%] block rounded-[1px]"
        style={{ background: "rgba(134,134,140,0.68)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="rgba(120,120,128,0.28)" stroke="rgba(168,168,176,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="20,12 28,16 28,24 20,28 12,24 12,16" fill="none" stroke="rgba(150,150,158,0.7)" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

// --- Walls / summons / graves ------------------------------------------------

const GREATWALL_MERLONS = [
  { left: "8%", d: 0 },
  { left: "30%", d: 70 },
  { left: "52%", d: 140 },
  { left: "74%", d: 210 },
];

/** Great Wall: a battlement course rises across the square and merlons rise on
 * top of it. */
function GreatWallBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-brick absolute inset-x-[4%] bottom-[22%] block h-[26%] rounded-[1px]"
        style={{ background: "rgba(120,86,58,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs}ms` }}
      />
      {GREATWALL_MERLONS.map((m, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute bottom-[46%] block h-[16%] w-[16%] rounded-[1px]"
          style={{ left: m.left, background: "rgba(132,96,64,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + m.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Generic conjuring: an arcane summoning circle draws and spins as a shaft of
 * light rises from its centre (imps, guardians, golems, warbands). */
function SummonRiftBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#7eb59a" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#e6bf6a" strokeWidth="1" strokeDasharray="3 3" />
          <polygon points="20,6 32,27 8,27" fill="none" stroke="#7eb59a" strokeWidth="1" />
          <polygon points="20,34 8,13 32,13" fill="none" stroke="#7eb59a" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-rise absolute left-[40%] bottom-[16%] block h-[54%] w-[20%] rounded-[1px]"
        style={{ background: "rgba(180,224,204,0.5)", animationDelay: `${delayMs + 90}ms` }}
      />
    </span>
  );
}

/** Wings unfurling from the piece: dragon membrane (dragon tone) or celestial
 * feathers (feather tone). */
function WingsBurst({ tone, lead, delayMs }: { tone: "dragon" | "feather"; lead: boolean; delayMs: number }) {
  const fill = tone === "dragon" ? "rgba(120,86,58,0.85)" : "rgba(206,226,240,0.7)";
  const stroke = tone === "dragon" ? "#3c2818" : "#8fb7d6";
  const path =
    tone === "dragon"
      ? "M22 20 L4 6 L8 14 L2 13 L9 20 L3 22 L11 24 L7 30 Z"
      : "M22 20 C12 6 4 8 3 20 C7 16 12 17 15 21 C10 20 7 23 6 28 C11 23 16 22 22 22 Z";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wing-l absolute left-[4%] top-[22%] block h-[50%] w-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[4%] top-[22%] block h-[50%] w-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
          <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[32%] block rounded-full"
          style={{ background: tone === "dragon" ? "rgba(230,168,92,0.6)" : "rgba(214,232,246,0.7)", animationDelay: `${delayMs + 140}ms` }}
        />
      )}
    </span>
  );
}

/** Summon Dragon: dragon wings sweep open with a burst of scale-shards. */
function DragonRiseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <>
      <WingsBurst tone="dragon" lead={lead} delayMs={delayMs} />
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <ShardBurst vectors={BURST_MED} fill="#8a5a38" stroke="#3c2818" delayMs={delayMs + 120} sizePct={11} />
      </span>
    </>
  );
}

/** Starfall: a meteor streaks in from the corner, cracks down, throws embers. */
function MeteorBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-6%] block h-[68%] w-[68%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L26 26" stroke="#e6a85c" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 4 L26 22" stroke="#ffd95e" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="28" cy="28" r="5" fill="#d98a4a" stroke="#7a3a12" strokeWidth="1.2" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 260} sizePct={11} />
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[18%] block rounded-full"
          style={{ border: "1.5px solid rgba(230,168,92,0.9)", animationDelay: `${delayMs + 260}ms` }}
        />
      )}
    </span>
  );
}

/** Raise Dead / Army of the Dead: bony hands and grave dirt heave up. */
function GraveHandsBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[22%] bottom-[6%] block h-[56%] w-[56%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g fill="rgba(206,216,200,0.85)" stroke="#5a6155" strokeWidth="0.8" strokeLinejoin="round">
            <path d="M10 40 L10 22 L8 22 L8 30 M13 40 L13 18 L11 18 L11 28 M16 40 L16 20 L14 20 L14 30" />
            <path d="M26 40 L26 20 L24 20 L24 30 M29 40 L29 22 L27 22 L27 30 M32 40 L32 24 L30 24 L30 32" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[24%] bottom-[8%] block h-[16%] rounded-full" style={{ background: "rgba(90,84,72,0.55)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

/** Hallowed Return / Divine Intervention: a shaft of holy light and a halo. */
function HolyLightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[36%] top-0 block h-[82%] w-[28%]"
        style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }}
      />
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[20%] block rounded-full"
          style={{ border: "1.5px solid rgba(255,224,140,0.9)", animationDelay: `${delayMs + 120}ms` }}
        />
      )}
      <ShardBurst vectors={BURST_MED} fill="#fff2c0" stroke="#c9a244" delayMs={delayMs + 120} sizePct={10} />
    </span>
  );
}

const ICEWALL_BLOCKS = [
  { bottom: "8%", d: 0 },
  { bottom: "30%", d: 70 },
  { bottom: "52%", d: 140 },
  { bottom: "74%", d: 210 },
];

/** Frost Wall: a column of blue ice blocks erupts up the file. */
function IceWallBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {ICEWALL_BLOCKS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute inset-x-[24%] block h-[22%] rounded-[1px]"
          style={{ bottom: b.bottom, background: "rgba(176,220,245,0.5)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs + b.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Wall of Thorns: a bramble of barbed thorns bursts up from the ground. */
function ThornWallBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[12%] bottom-[6%] block h-[66%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <g stroke="#4a6b3a" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M8 40 L12 6 M20 40 L18 4 M32 40 L28 8" />
          </g>
          <g fill="#6b8a4a" stroke="#33481f" strokeWidth="0.6" strokeLinejoin="round">
            <polygon points="12,10 8,14 14,14" />
            <polygon points="18,8 14,12 22,12" />
            <polygon points="28,12 24,16 31,15" />
            <polygon points="12,20 7,23 14,24" />
            <polygon points="18,18 22,22 15,23" />
          </g>
        </svg>
      </span>
    </span>
  );
}

// --- Regalia / movement grants -----------------------------------------------

/** Excalibur: a radiant blade descends point-down and plants on the bishop. */
function BladeGiftBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[42%] top-0 block h-[62%] w-[16%]"
        style={{ background: "rgba(200,224,240,0.5)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute left-[38%] top-[8%] block h-[64%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 34" className="h-full w-full" aria-hidden="true">
          <polygon points="6,0 8,20 6,26 4,20" fill="#e3edf5" stroke="#7a8b98" strokeWidth="0.8" strokeLinejoin="round" />
          <rect x="1" y="19.5" width="10" height="2.4" rx="0.5" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
          <rect x="5" y="22" width="2" height="8" fill="#8a6a3a" />
          <circle cx="6" cy="31" r="1.6" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[30%] block rounded-full"
          style={{ background: "rgba(214,232,246,0.7)", animationDelay: `${delayMs + 160}ms` }}
        />
      )}
    </span>
  );
}

const WARHORN_DASHES = [
  { top: "34%", d: 0 },
  { top: "50%", d: 70 },
  { top: "66%", d: 140 },
];

/** Banner of War: the war banner runs up its pole with speed-dashes trailing. */
function WarhornBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[34%] top-[4%] block h-[68%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M6 32 V2" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {WARHORN_DASHES.map((s, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute left-[10%] block h-[6%] w-[36%] rounded-[1px]"
          style={{ top: s.top, background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[36%] block rounded-full"
          style={{ background: "rgba(224,119,107,0.55)", animationDelay: `${delayMs + 120}ms` }}
        />
      )}
    </span>
  );
}

// --- Fantasy removals (marquee attack cards) ---------------------------------

/** Dragon's Breath: a corridor of flame. Lead flashes at the rook's mouth; each
 * victim is a fireball flash, ember shatter, and scorch. */
function DragonFireBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span
          className="fx-sig-muzzle absolute left-[8%] top-[34%] block h-[32%] w-[84%] rounded-full"
          style={{ background: "rgba(255,150,60,0.9)", animationDelay: `${delayMs}ms` }}
        />
        <span
          className="fx-sig-muzzle absolute left-[14%] top-[42%] block h-[16%] w-[70%] rounded-full"
          style={{ background: "rgba(255,224,150,0.95)", animationDelay: `${delayMs + 30}ms` }}
        />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <ShardBurst vectors={BURST_BIG} fill="#ffb454" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 180}ms` }}
      />
    </span>
  );
}

/** Soul Harvest: a great scythe blade sweeps the diagonal; each reaped square
 * gives up a rising soul wisp. */
function ScytheBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[2%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 C6 14 22 4 36 8 C24 10 14 20 14 34 Z" fill="#c9d2dc" stroke="#5b6672" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M12 34 L12 30" stroke="#5b6672" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="fx-sig-ash absolute left-[40%] top-[22%] block h-[26%] w-[20%] rounded-full"
        style={{ background: "rgba(168,119,216,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

/** Chain Lightning: a forked bolt leaps down the diagonal in strobed
 * after-images, throwing sparks at each arc point. */
function ArcLightBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[8%] top-[6%] block h-[80%] w-[80%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <polygon points="6,4 18,14 12,16 26,26 20,26 34,38 22,30 27,29 13,19 19,18 6,8" fill="#fff6c8" stroke="#e6b800" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffe98a" stroke="#8a6414" delayMs={delayMs + 120} sizePct={10} />
    </span>
  );
}

/** Wyvern's Dive: a talon strike streaks in from above with slash lines. */
function DiveBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-8%] block h-[70%] w-[70%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 C16 8 24 16 30 30 L26 24 L28 30 L22 27" fill="none" stroke="#5a4636" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-afterimage absolute left-[26%] top-[26%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#e3ecf4" strokeWidth="2" strokeLinecap="round">
            <path d="M6 12 L30 20 M4 22 L26 32 M14 6 L26 28" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#5b6672" delayMs={delayMs + 180} sizePct={10} />
    </span>
  );
}

/** Judgment Day / Heaven's Wrath: a pillar of holy light slams a named piece
 * off the board with a radiant shock and scorch. */
function SmiteBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[34%] top-0 block h-[94%] w-[32%]"
        style={{ background: "rgba(255,246,200,0.68)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ring absolute inset-[22%] block rounded-full"
        style={{ border: "1.5px solid rgba(255,232,150,0.9)", animationDelay: `${delayMs + 120}ms` }}
      />
      <span
        className="fx-sig-scorch absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(30,22,10,0.6)", animationDelay: `${delayMs + 180}ms` }}
      />
      {lead && (
        <span
          className="fx-sig-shock absolute inset-[10%] block rounded-full"
          style={{ border: "2px solid rgba(255,244,200,0.85)", animationDelay: `${delayMs + 120}ms` }}
        />
      )}
    </span>
  );
}

/** Divine Reckoning: a gilded court decree stamps down over the enemy ranks. */
function DecreeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-snooze absolute left-[18%] top-[22%] block h-[54%] w-[64%] rounded-full"
        style={{ background: "rgba(40,52,72,0.9)", border: "1.5px solid rgba(226,196,106,0.9)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 8 V32 M12 14 H28 M14 32 H26" stroke="#e6bf6a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M12 14 L9 22 H15 Z M28 14 L25 22 H31 Z" fill="rgba(226,196,106,0.5)" stroke="#e6bf6a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[14%] block rounded-full"
          style={{ border: "1.5px solid rgba(226,196,106,0.85)", animationDelay: `${delayMs + 120}ms` }}
        />
      )}
    </span>
  );
}

// --- 10d. Batch 4 signature visuals (WILD set + Computer Virus) --------------
// Same rules as Batch 1-3: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow halos, 1px corners), hidden
// under reduced motion. Removal-sourced spectacles render off the detonation
// diff; the effect-data-sourced ones join the inert-until-wired Batch 2/3 set.
// Almost everything composes existing fx-sig-* classes; only fx-sig-glitch is
// genuinely new. Coral / mint / sun accents plus theme colours.

/** Immolation / Conflagration: flame tongues leap up, an ember shatter, scorch. */
function InfernoBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[16%] bottom-[6%] top-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C9 30 15 22 12 11 C18 17 17 7 20 2 C23 9 25 16 28 11 C25 22 31 30 20 40 Z" fill="rgba(230,110,60,0.85)" stroke="#7a3a12" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 40 C15 32 18 24 20 15 C22 24 25 32 20 40 Z" fill="rgba(255,214,120,0.9)" />
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(255,168,80,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={11} />
      <span className="fx-sig-scorch absolute inset-[28%] block rounded-full" style={{ background: "rgba(26,16,8,0.7)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Hellfire Beam: the fiercest fire spectacle. Lead double-flashes at the
 * queen's mouth; each victim is a red-gold fireball, a wide ember shatter, and
 * a deep scorch. */
function HellfireBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-flash absolute inset-[16%] block rounded-full" style={{ background: "rgba(226,60,40,0.85)", animationDelay: `${delayMs}ms` }} />
        <span className="fx-sig-ring absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(255,150,60,0.9)", animationDelay: `${delayMs}ms` }} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[12%] block rounded-full" style={{ background: "rgba(226,72,44,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,214,120,0.9)", animationDelay: `${delayMs + 40}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#ff8a3c" stroke="#7a2410" delayMs={delayMs} sizePct={13} />
      <span className="fx-sig-scorch absolute inset-[24%] block rounded-full" style={{ background: "rgba(24,10,6,0.75)", animationDelay: `${delayMs + 180}ms` }} />
    </span>
  );
}

const HAIL_DROPS = [
  { left: "18%", w: "16%", d: 0 },
  { left: "44%", w: "13%", d: 80 },
  { left: "64%", w: "15%", d: 150 },
  { left: "34%", w: "12%", d: 210 },
];

/** Hailstorm: ice pellets rain down through the square and a frost glaze sets. */
function HailstormBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {HAIL_DROPS.map((h, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[22%]" style={{ left: h.left, width: h.w, animationDelay: `${delayMs + h.d}ms` }}>
          <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
            <polygon points="6,0 11,7 6,16 1,7" fill="rgba(224,246,255,0.85)" stroke="#7fb8dd" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-frost absolute inset-x-[8%] bottom-[8%] block h-[26%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

const BLIZ_FLAKES = [
  { left: "16%", w: "12%", d: 0 },
  { left: "40%", w: "10%", d: 70 },
  { left: "60%", w: "13%", d: 40 },
  { left: "30%", w: "9%", d: 130 },
  { left: "70%", w: "10%", d: 100 },
];

/** Whiteout: a blizzard swirls and whites out the king, snow driving past. */
function BlizzardBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[10%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 C30 8 32 20 20 24 C10 27 8 16 18 14 C24 13 25 19 20 20" fill="none" stroke="rgba(224,244,255,0.8)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {BLIZ_FLAKES.map((f, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[16%]" style={{ left: f.left, width: f.w, animationDelay: `${delayMs + f.d}ms` }}>
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.4" fill="rgba(234,248,255,0.9)" />
          </svg>
        </span>
      ))}
      {lead && (
        <span className="fx-sig-flash absolute inset-[20%] block rounded-full" style={{ background: "rgba(240,250,255,0.8)", animationDelay: `${delayMs}ms` }} />
      )}
    </span>
  );
}

/** Stone Soldiers: a carved stone figure heaves up out of the bedrock. */
function StoneRiseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[26%] bottom-[6%] block h-[64%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <g fill="rgba(140,140,146,0.9)" stroke="#5a5a60" strokeWidth="0.8" strokeLinejoin="round">
            <rect x="8" y="2" width="8" height="8" rx="0.5" />
            <rect x="5" y="11" width="14" height="12" rx="0.5" />
            <rect x="6" y="24" width="5" height="8" rx="0.5" />
            <rect x="13" y="24" width="5" height="8" rx="0.5" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[20%] bottom-[6%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.55)", animationDelay: `${delayMs + 90}ms` }} />
    </span>
  );
}

/** Mountain Range: a ridge of jagged, snow-capped rock heaves up. */
function MountainWallBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[4%] bottom-[8%] block h-[66%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <polygon points="0,30 8,10 14,18 22,4 30,16 40,8 40,30" fill="rgba(120,110,98,0.9)" stroke="#4a443c" strokeWidth="1" strokeLinejoin="round" />
          <polygon points="22,4 18,12 26,12" fill="rgba(224,236,240,0.7)" />
          <polygon points="8,10 5,16 12,16" fill="rgba(224,236,240,0.6)" />
        </svg>
      </span>
    </span>
  );
}

const ROCK_DROPS = [
  { left: "22%", w: "26%", d: 0 },
  { left: "52%", w: "20%", d: 90 },
  { left: "38%", w: "16%", d: 170 },
];

/** Landslide: boulders crash down and burst into rubble with a dust cloud. */
function RockfallBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {ROCK_DROPS.map((r, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[28%]" style={{ left: r.left, width: r.w, animationDelay: `${delayMs + r.d}ms` }}>
          <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
            <polygon points="6,0 11,3 10,9 4,11 1,6 2,2" fill="rgba(128,122,112,0.9)" stroke="#4a443c" strokeWidth="0.7" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#4a443c" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-ash absolute inset-x-[20%] bottom-[8%] block h-[18%] rounded-full" style={{ background: "rgba(120,112,102,0.55)", animationDelay: `${delayMs + 200}ms` }} />
    </span>
  );
}

/** Thunderhead: a charged storm cloud forms and cracks a small bolt. */
function StormCloudBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[10%] top-[16%] block h-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 24" className="h-full w-full" aria-hidden="true">
          <path d="M8 20 C2 20 2 12 9 12 C9 5 20 4 22 10 C30 6 38 12 33 18 C36 22 30 20 28 20 Z" fill="rgba(90,96,110,0.9)" stroke="#2f3540" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-afterimage absolute left-[42%] top-[46%] block h-[42%] w-[24%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <JagBolt />
      </span>
      <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(255,246,200,0.7)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Bayonet Charge / Spearhead: a lance drives in with an impact splat. Lead
 * cries out with a war-shout muzzle flash. */
function SpearChargeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-muzzle absolute left-[10%] top-[38%] block h-[24%] w-[80%] rounded-full" style={{ background: "rgba(226,196,106,0.9)", animationDelay: `${delayMs}ms` }} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-4%] top-[-4%] block h-[72%] w-[72%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L28 28" stroke="#8a7048" strokeWidth="2.6" strokeLinecap="round" />
          <polygon points="24,20 34,34 20,24" fill="#c9d2dc" stroke="#5b6672" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#5b6672" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-splat absolute inset-x-[24%] top-[40%] block h-[26%] rounded-full" style={{ background: "rgba(150,146,140,0.8)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

/** Armored Breakthrough: an armored hull rolls through with treads and debris. */
function TankRollBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[6%] top-[26%] block h-[48%] w-[84%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden="true">
          <rect x="4" y="8" width="30" height="7" rx="1" fill="rgba(96,104,88,0.9)" stroke="#33402b" strokeWidth="1" />
          <rect x="12" y="3" width="14" height="5" rx="1" fill="rgba(112,120,100,0.9)" stroke="#33402b" strokeWidth="1" />
          <rect x="24" y="4" width="14" height="2" rx="1" fill="rgba(112,120,100,0.9)" />
          <g fill="#2a3323">
            <circle cx="9" cy="16" r="2.4" />
            <circle cx="17" cy="16" r="2.4" />
            <circle cx="25" cy="16" r="2.4" />
            <circle cx="32" cy="16" r="2.4" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#33402b" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-scorch absolute inset-x-[16%] bottom-[16%] block h-[16%] rounded-[1px]" style={{ background: "rgba(30,26,18,0.6)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

const SHELL_DROPS = [
  { left: "30%", w: "16%", d: 0 },
  { left: "54%", w: "13%", d: 120 },
];

/** Bombardment / Counter Battery: a shell whistles down and cracks a crater. */
function ArtilleryBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {SHELL_DROPS.map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[24%]" style={{ left: s.left, width: s.w, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 C8 3 8 6 8 10 L8 14 L2 14 L2 10 C2 6 2 3 5 0 Z" fill="rgba(90,96,88,0.9)" stroke="#2f3530" strokeWidth="0.7" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,200,120,0.8)", animationDelay: `${delayMs + 130}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#9a948a" stroke="#3a352c" delayMs={delayMs + 150} sizePct={10} />
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(24,18,12,0.65)", animationDelay: `${delayMs + 210}ms` }} />
    </span>
  );
}

/** Combined Arms / Muster / Forward Outpost: a war banner plants with dust as
 * fresh troops arrive. */
function ReinforceBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[32%] bottom-[8%] block h-[70%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M6 32 V2" stroke="#5a4a2a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="rgba(126,181,154,0.9)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[22%] bottom-[6%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 90}ms` }} />
    </span>
  );
}

const CHUTE_DROPS = [
  { left: "20%", w: "30%", d: 0 },
  { left: "50%", w: "26%", d: 120 },
];

/** Paratroopers: parachutes descend behind the lines. */
function ParadropBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {CHUTE_DROPS.map((c, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[40%]" style={{ left: c.left, width: c.w, animationDelay: `${delayMs + c.d}ms` }}>
          <svg viewBox="0 0 20 24" className="h-full w-full" aria-hidden="true">
            <path d="M1 9 A9 9 0 0 1 19 9 Z" fill="rgba(126,181,154,0.85)" stroke="#2f4a3c" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M1 9 L10 16 L19 9 M7 9 L10 16 M13 9 L10 16" stroke="#2f4a3c" strokeWidth="0.7" fill="none" />
            <circle cx="10" cy="19" r="2.2" fill="rgba(96,104,88,0.95)" stroke="#2f3530" strokeWidth="0.6" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const SUPPRESS_TRACERS = [
  { top: "30%", d: 0 },
  { top: "50%", d: 60 },
  { top: "68%", d: 120 },
];

/** Suppressive Fire: tracer streaks rake across and pin the target down. */
function SuppressBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {SUPPRESS_TRACERS.map((t, i) => (
        <span key={i} className="fx-sig-afterimage absolute left-[6%] block h-[5%] w-[80%] rounded-[1px]" style={{ top: t.top, background: "rgba(226,196,106,0.85)", animationDelay: `${delayMs + t.d}ms` }} />
      ))}
      <span className="fx-sig-flash absolute left-[4%] top-[42%] block h-[18%] w-[22%] rounded-full" style={{ background: "rgba(255,214,120,0.8)", animationDelay: `${delayMs}ms` }} />
    </span>
  );
}

/** Double Trench: a sandbag parapet stacks up and barbed wire strings across. */
function TrenchBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-brick absolute inset-x-[8%] bottom-[16%] block h-[24%] rounded-[1px]" style={{ background: "rgba(150,132,90,0.9)", border: "1px solid rgba(80,66,38,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute inset-x-[6%] bottom-[36%] block h-[26%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 40 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 8 L40 8 M8 4 L12 12 M20 4 L24 12 M32 4 L36 12" stroke="#8a8478" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <g fill="#8a8478">
            <polygon points="6,8 8,6 10,8 8,10" />
            <polygon points="18,8 20,6 22,8 20,10" />
            <polygon points="30,8 32,6 34,8 32,10" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Time Stop: a clock entombs the piece, its hands halted, a temporal ripple. */
function TimeStopBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="rgba(40,52,72,0.55)" stroke="#b9c4d6" strokeWidth="1.6" />
          <path d="M16 16 V6 M16 16 L23 19" stroke="#e8eef6" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="1.4" fill="#e8eef6" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[10%] block rounded-full" style={{ border: "1.5px solid rgba(185,196,214,0.85)", animationDelay: `${delayMs + 120}ms` }} />
      {lead && (
        <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(210,224,244,0.7)", animationDelay: `${delayMs}ms` }} />
      )}
    </span>
  );
}

const UNMAKE_VOXELS = [
  { left: "30%", top: "24%", w: "13%", c: "rgba(168,119,216,0.85)", d: 0 },
  { left: "54%", top: "30%", w: "11%", c: "rgba(140,96,200,0.8)", d: 50 },
  { left: "36%", top: "50%", w: "14%", c: "rgba(150,110,205,0.82)", d: 90 },
  { left: "56%", top: "52%", w: "10%", c: "rgba(120,86,180,0.8)", d: 40 },
  { left: "44%", top: "20%", w: "9%", c: "rgba(180,140,224,0.8)", d: 70 },
];

/** Unmake / Banish: reality unravels: the square dissolves into voxels that
 * scatter apart with an arcane flash. */
function UnmakeBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(168,119,216,0.7)", animationDelay: `${delayMs}ms` }} />
      {UNMAKE_VOXELS.map((v, i) => (
        <span key={i} className="fx-sig-crumble absolute block rounded-[1px]" style={{ left: v.left, top: v.top, width: v.w, height: v.w, background: v.c, animationDelay: `${delayMs + v.d}ms` }} />
      ))}
      <ShardBurst vectors={BURST_MED} fill="#b48ce0" stroke="#5a3a86" delayMs={delayMs + 60} sizePct={10} />
    </span>
  );
}

/** Wrecking Ball: a great iron ball swings across on its chain, smashing the
 * piece to rubble. Lead is the impact flash. */
function WreckingBallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[2%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 2 L20 22" stroke="#5b6672" strokeWidth="1.6" strokeDasharray="2 2" fill="none" />
          <circle cx="20" cy="28" r="8" fill="rgba(70,76,86,0.92)" stroke="#23282f" strokeWidth="1.2" />
          <circle cx="17" cy="25" r="2" fill="rgba(150,158,168,0.6)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#3a352c" delayMs={delayMs + 140} sizePct={11} />
      {lead && (
        <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(150,146,140,0.7)", animationDelay: `${delayMs + 160}ms` }} />
      )}
    </span>
  );
}

/** Pinata: a burst of confetti and candy in coral, mint, and sun. */
function PinataBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,246,200,0.75)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e0776b" stroke="#7a2f28" delayMs={delayMs} sizePct={11} />
      <ShardBurst vectors={BURST_MED} fill="#7eb59a" stroke="#2f4a3c" delayMs={delayMs + 40} sizePct={10} />
      {lead && (
        <span
          className="fx-sig-star absolute left-1/2 top-1/2 block h-[16%] w-[16%]"
          style={{ marginLeft: "-8%", marginTop: "-8%", "--dx": "0%", "--dy": "-40%", "--rot": "40deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
        >
          <SparkStar />
        </span>
      )}
    </span>
  );
}

/** Genie Wish: a plume of smoke swirls up and a wish-sparkle pops as the queen
 * appears. */
function GeniePoofBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 36 C12 34 14 26 20 26 C26 26 24 20 18 20 C12 20 14 12 22 12 C30 12 30 6 24 4" fill="none" stroke="rgba(168,180,196,0.7)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 120} sizePct={9} />
      <span className="fx-sig-ash absolute inset-x-[26%] bottom-[10%] block h-[16%] rounded-full" style={{ background: "rgba(150,158,170,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

const GLITCH_BLOCKS = [
  { left: "14%", top: "28%", w: "34%", h: "10%", c: "rgba(126,181,154,0.85)", d: 0 },
  { left: "40%", top: "44%", w: "44%", h: "9%", c: "rgba(224,119,107,0.85)", d: 60 },
  { left: "20%", top: "58%", w: "30%", h: "8%", c: "rgba(230,191,106,0.85)", d: 120 },
  { left: "50%", top: "20%", w: "24%", h: "8%", c: "rgba(139,169,196,0.8)", d: 30 },
];

/** Computer Virus: the opponent's clock corrupts: glitch bars jitter and
 * flicker over scanlines, with a corruption flash on the lead square. */
function GlitchBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {GLITCH_BLOCKS.map((g, i) => (
        <span key={i} className="fx-sig-glitch absolute block rounded-[1px]" style={{ left: g.left, top: g.top, width: g.w, height: g.h, background: g.c, animationDelay: `${delayMs + g.d}ms` }} />
      ))}
      <span className="fx-sig-glitch absolute left-[10%] top-[10%] block h-[80%] w-[80%]" style={{ animationDelay: `${delayMs + 20}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="rgba(126,181,154,0.7)" strokeWidth="1" fill="none">
            <path d="M2 12 H38 M2 20 H38 M2 28 H38" />
          </g>
        </svg>
      </span>
      {lead && (
        <span className="fx-sig-flash absolute inset-[22%] block rounded-[1px]" style={{ background: "rgba(224,119,107,0.55)", animationDelay: `${delayMs}ms` }} />
      )}
    </span>
  );
}

// --- 10e. Batch 5 signature visuals (library core + wild + funny 2nd pass) ---
// Same rules as Batch 1-4: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow halos, 1px corners), hidden
// under reduced motion. Removal-sourced ones render off the detonation diff;
// the effect-data ones join the inert-until-wired zone set. Everything composes
// existing fx-sig-* classes except the two genuinely new motions (fx-sig-rewind
// for the backward clock, fx-sig-implode for the collapsing vortex).

/** Purge / Annihilate / Shatter: a doomed piece is unmade in a puff of grey
 * motes and a thin dissolve ring; lead adds a wider shock. */
function DisintegrateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[16%] block rounded-full"
        style={{ border: "1px solid rgba(150,146,158,0.85)", animationDelay: `${delayMs}ms` }}
      />
      {STONE_SHARDS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <ShardBurst vectors={BURST_MED} fill="#b6b0be" stroke="#5a5560" delayMs={delayMs} sizePct={10} />
      <span
        className="fx-sig-ash absolute inset-x-[26%] bottom-[18%] block h-[16%] rounded-full"
        style={{ background: "rgba(120,116,124,0.55)", animationDelay: `${delayMs + 130}ms` }}
      />
      {lead && (
        <span
          className="fx-sig-shock absolute inset-[10%] block rounded-full"
          style={{ border: "2px solid rgba(170,166,178,0.8)", animationDelay: `${delayMs}ms` }}
        />
      )}
    </span>
  );
}

/** Cavalry Charge: a knight thunders down a line. Lead kicks up a dust burst at
 * the origin; each cleared square takes a hoof-slash and a dust splat. */
function CavalryChargeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span
          className="fx-sig-ash absolute inset-[18%] block rounded-full"
          style={{ background: "rgba(150,132,98,0.6)", animationDelay: `${delayMs}ms` }}
        />
        <span
          className="fx-sig-muzzle absolute left-[12%] top-[40%] block h-[20%] w-[76%] rounded-full"
          style={{ background: "rgba(180,160,120,0.7)", animationDelay: `${delayMs}ms` }}
        />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[6%] block h-[64%] w-[76%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 26 C10 18 16 20 22 12 L18 20 L26 16 L20 26 L30 24" fill="none" stroke="#8a7048" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-arc absolute inset-[10%] block" style={{ animationDelay: `${delayMs + 90}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 C10 18 24 8 36 10 C24 14 16 22 16 34 Z" fill="rgba(201,210,220,0.6)" stroke="#5b6672" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span
        className="fx-sig-splat absolute inset-x-[22%] bottom-[16%] block h-[22%] rounded-full"
        style={{ background: "rgba(150,132,98,0.6)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

const STONEHIDE_PLATES = [
  { left: "10%", bottom: "12%", d: 0 },
  { left: "56%", bottom: "12%", d: 60 },
  { left: "32%", bottom: "44%", d: 120 },
];

/** Stoneskin / Form Square: slate plates lock over the piece as a stone shell
 * grows; lead thumps a stone ring. */
function StonehideBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[16%] block rounded-[2px]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 36 C4 22 8 6 20 4 C32 6 36 22 32 36 Z" fill="rgba(140,140,146,0.32)" stroke="rgba(168,168,176,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M20 5 V35 M9 20 H31" stroke="rgba(150,150,158,0.7)" strokeWidth="0.9" fill="none" />
        </svg>
      </span>
      {STONEHIDE_PLATES.map((p, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute block h-[26%] w-[28%] rounded-[1px]"
          style={{ left: p.left, bottom: p.bottom, background: "rgba(128,128,134,0.9)", border: "1px solid rgba(70,70,76,0.85)", animationDelay: `${delayMs + p.d}ms` }}
        />
      ))}
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[10%] block rounded-full"
          style={{ border: "1.5px solid rgba(168,168,176,0.85)", animationDelay: `${delayMs + 160}ms` }}
        />
      )}
    </span>
  );
}

/** Royal Aegis / Frost Ward / Panic Button / Borrowed Time: a rune ward ring
 * snaps in and pulses; lead stamps a sigil hexagon at its heart. */
function WardPulseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[12%] block rounded-full"
        style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flash absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(126,181,154,0.45)", animationDelay: `${delayMs}ms` }}
      />
      {lead && (
        <span className="fx-sig-grow absolute inset-[24%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="rgba(20,30,26,0.6)" stroke="rgba(163,209,150,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M20 12 V28 M13 16 H27 M13 24 H27" stroke="rgba(163,209,150,0.8)" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Verdant Shield: a canopy of bark and leaves unfurls over the pawns. */
function CanopyBurst({ delayMs }: { delayMs: number }) {
  const leaf = "M22 20 C12 6 4 8 3 20 C7 16 12 17 15 21 C10 20 7 23 6 28 C11 23 16 22 22 22 Z";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[44%] bottom-[8%] block h-[54%] w-[12%] rounded-[1px]" style={{ background: "rgba(90,68,44,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-wing-l absolute left-[6%] top-[16%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d={leaf} fill="rgba(126,181,154,0.75)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[6%] top-[16%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
          <path d={leaf} fill="rgba(126,181,154,0.75)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Time Thief / Chrono Siphon: a clock face spins its hands backward while
 * stolen seconds bleed off to the side; lead flashes as time is siphoned. */
function ChronoStealBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="rgba(40,44,58,0.5)" stroke="#d8b56e" strokeWidth="1.6" />
          <g className="fx-sig-rewind">
            <path d="M16 16 V6 M16 16 L22 20" stroke="#f0dca8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
          <circle cx="16" cy="16" r="1.5" fill="#f0dca8" />
        </svg>
      </span>
      <span
        className="fx-sig-ash absolute right-[14%] top-[16%] block h-[24%] w-[22%] rounded-full"
        style={{ background: "rgba(216,181,110,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[30%] block rounded-full"
          style={{ background: "rgba(240,220,168,0.7)", animationDelay: `${delayMs}ms` }}
        />
      )}
    </span>
  );
}

/** Blink / Far Step / Yeet / Warp: a piece teleports in on a rune ring with a
 * pop of arcane light and a scatter of sparks. */
function BlinkBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(168,119,216,0.85)" strokeWidth="1.4" strokeDasharray="4 3" />
          <polygon points="20,7 31,26 9,26" fill="none" stroke="rgba(190,150,230,0.8)" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-flash absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(190,150,230,0.6)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ring absolute inset-[18%] block rounded-full"
        style={{ border: "1px solid rgba(168,119,216,0.85)", animationDelay: `${delayMs + 60}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#c9a6ec" stroke="#5a3a86" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

/** Pizza / Clown Car / Ducks / Goose: a coral summoning portal swirls open and
 * a shaft of light lifts the new arrival in, sparks popping. */
function PortalBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e0776b" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#f0b0a6" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="20" cy="20" r="5" fill="none" stroke="#e0776b" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-rise absolute left-[40%] bottom-[16%] block h-[52%] w-[20%] rounded-[1px]"
        style={{ background: "rgba(240,176,166,0.5)", animationDelay: `${delayMs + 90}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#f0b0a6" stroke="#7a2f28" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

const BORDERWARD_RUNES = [
  { left: "16%", d: 0 },
  { left: "44%", d: 70 },
  { left: "70%", d: 140 },
];

/** Glyph Seal / Border Ward: a translucent curtain of warding runes rises to
 * seal the ground. */
function BorderWardBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-brick absolute inset-x-[8%] bottom-[8%] block h-[74%] rounded-[1px]"
        style={{ background: "rgba(126,181,154,0.22)", border: "1px solid rgba(163,209,150,0.7)", animationDelay: `${delayMs}ms` }}
      />
      {BORDERWARD_RUNES.map((r, i) => (
        <span
          key={i}
          className="fx-sig-rise absolute bottom-[24%] block h-[30%] w-[18%]"
          style={{ left: r.left, animationDelay: `${delayMs + 120 + r.d}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M10 2 V18 M4 7 H16 M4 13 H16" stroke="rgba(163,209,150,0.8)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const BANANA_PEELS = [
  { left: "12%", w: "30%", rot: -18, d: 0 },
  { left: "46%", w: "26%", rot: 22, d: 90 },
  { left: "30%", w: "32%", rot: -8, d: 180 },
];

/** Banana Peel Trail: a scatter of banana peels drops and slides across the
 * file. Flat SVG peels, no emoji. */
function BananaBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {BANANA_PEELS.map((p, i) => (
        <span
          key={i}
          className="fx-sig-crownfall absolute top-0 block h-[26%]"
          style={{ left: p.left, width: p.w, transform: `rotate(${p.rot}deg)`, animationDelay: `${delayMs + p.d}ms` }}
        >
          <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
            <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            <path d="M8 4 C10 8 16 9 20 6" fill="none" stroke="#c79a3a" strokeWidth="0.7" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const MINE_POS = [
  { left: "16%", d: 0 },
  { left: "44%", d: 90 },
  { left: "70%", d: 180 },
];

/** Claymore Line: a row of mines clicks up out of the ground and arms. */
function MinefieldBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {MINE_POS.map((m, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute bottom-[16%] block h-[24%] w-[18%]"
          style={{ left: m.left, animationDelay: `${delayMs + m.d}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M3 16 C3 10 17 10 17 16 Z" fill="rgba(96,104,72,0.92)" stroke="#33402b" strokeWidth="1" strokeLinejoin="round" />
            <path d="M6 20 L6 15 M14 20 L14 15" stroke="#33402b" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M10 10 V4" stroke="#8a8478" strokeWidth="1" strokeLinecap="round" />
            <circle cx="10" cy="3.5" r="1.4" fill="#e0776b" />
          </svg>
        </span>
      ))}
      <span
        className="fx-sig-ash absolute inset-x-[20%] bottom-[12%] block h-[14%] rounded-full"
        style={{ background: "rgba(110,104,84,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

// Shards fly IN toward the centre of the collapsing vortex (fx-sig-implode
// starts them out at --dx/--dy and pulls them to the core).
const VORTEX_VEC = [
  { dx: "300%", dy: "-230%", rot: "220deg", d: 0 },
  { dx: "-280%", dy: "-250%", rot: "-210deg", d: 20 },
  { dx: "320%", dy: "170%", rot: "260deg", d: 10 },
  { dx: "-300%", dy: "200%", rot: "-190deg", d: 26 },
  { dx: "40%", dy: "-320%", rot: "150deg", d: 6 },
  { dx: "-60%", dy: "300%", rot: "-150deg", d: 30 },
];

/** Void Rift / Black Hole / Haunted House: a dark maw opens and everything is
 * pulled inward as it collapses to a point; lead adds an event-horizon ring. */
function VortexBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-24%] mt-[-24%] block h-[48%] w-[48%] rounded-full"
        style={{ background: "rgba(18,14,24,0.92)", border: "1.5px solid rgba(122,91,154,0.9)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
      />
      {VORTEX_VEC.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.d}ms` } as React.CSSProperties}
        >
          <SigShard fill="#a48cc4" stroke="#463357" variant={i} />
        </span>
      ))}
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[14%] block rounded-full"
          style={{ border: "1.5px solid rgba(150,120,186,0.85)", animationDelay: `${delayMs}ms` }}
        />
      )}
    </span>
  );
}

/** One square's slice of a signature sequence. `role` is "lead" for the single
 * origin flourish (nova's pop, atomic's central thump, the siege muzzle) and
 * "target" for every cleared enemy square; `delayMs` is the pre-computed
 * stagger so the sequence rolls across the board. */
export function SignatureOverlay({
  visual,
  role,
  delayMs,
}: {
  visual: SigVisual;
  role: "lead" | "target";
  delayMs: number;
}) {
  const lead = role === "lead";
  switch (visual) {
    case "nova":
      return <NovaBurst lead={lead} delayMs={delayMs} />;
    case "trapdoor":
      return <TrapdoorBurst delayMs={delayMs} />;
    case "stone":
      return <StoneBurst delayMs={delayMs} />;
    case "strike":
      return <StrikeBurst delayMs={delayMs} />;
    case "atomic":
      return <AtomicBurst lead={lead} delayMs={delayMs} />;
    case "pin":
      return <PinBurst delayMs={delayMs} />;
    case "siege":
      return <SiegeBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 2 (effect-data sourced) ---
    case "coronation":
      return <CoronationBurst lead={lead} delayMs={delayMs} />;
    case "crownrain":
      return <CrownRainBurst delayMs={delayMs} />;
    case "colossus":
      return <ColossusBurst lead={lead} delayMs={delayMs} />;
    case "snooze":
      return <SnoozeBurst lead={lead} delayMs={delayMs} />;
    case "clockcage":
      return <ClockCageBurst lead={lead} delayMs={delayMs} />;
    case "clockice":
      return <ClockIceBurst lead={lead} delayMs={delayMs} />;
    case "blitz":
      return <BlitzBurst lead={lead} delayMs={delayMs} />;
    case "frostsweep":
      return <FrostSweepBurst delayMs={delayMs} />;
    case "petrify":
      return <PetrifyBurst lead={lead} delayMs={delayMs} />;
    case "petrifiedforest":
      return <PetrifiedForestBurst delayMs={delayMs} />;
    case "aegis":
      return <AegisBurst lead={lead} delayMs={delayMs} />;
    case "cathedral":
      return <CathedralBurst lead={lead} delayMs={delayMs} />;
    case "shades":
      return <ShadesBurst lead={lead} delayMs={delayMs} />;
    case "wallbuild":
      return <WallBuildBurst delayMs={delayMs} />;
    // --- Batch 3 (distinctness split + fantasy set) ---
    case "snapfrost":
      return <SnapFrostBurst delayMs={delayMs} />;
    case "deepglacier":
      return <DeepGlacierBurst lead={lead} delayMs={delayMs} />;
    case "iceshatter":
      return <IceShatterBurst lead={lead} delayMs={delayMs} />;
    case "chainfreeze":
      return <ChainFreezeBurst lead={lead} delayMs={delayMs} />;
    case "gorgonstare":
      return <GorgonStareBurst lead={lead} delayMs={delayMs} />;
    case "medusagaze":
      return <MedusaGazeBurst lead={lead} delayMs={delayMs} />;
    case "serpentstone":
      return <SerpentStoneBurst delayMs={delayMs} />;
    case "wither":
      return <WitherBurst lead={lead} delayMs={delayMs} />;
    case "stonechain":
      return <StoneChainBurst delayMs={delayMs} />;
    case "greyhex":
      return <GreyHexBurst delayMs={delayMs} />;
    case "greatwall":
      return <GreatWallBurst delayMs={delayMs} />;
    case "summonrift":
      return <SummonRiftBurst delayMs={delayMs} />;
    case "dragonrise":
      return <DragonRiseBurst lead={lead} delayMs={delayMs} />;
    case "meteor":
      return <MeteorBurst lead={lead} delayMs={delayMs} />;
    case "gravehands":
      return <GraveHandsBurst delayMs={delayMs} />;
    case "holylight":
      return <HolyLightBurst lead={lead} delayMs={delayMs} />;
    case "icewall":
      return <IceWallBurst delayMs={delayMs} />;
    case "thornwall":
      return <ThornWallBurst delayMs={delayMs} />;
    case "bladegift":
      return <BladeGiftBurst lead={lead} delayMs={delayMs} />;
    case "wings":
      return <WingsBurst tone="feather" lead={lead} delayMs={delayMs} />;
    case "warhorn":
      return <WarhornBurst lead={lead} delayMs={delayMs} />;
    case "dragonfire":
      return <DragonFireBurst lead={lead} delayMs={delayMs} />;
    case "scythe":
      return <ScytheBurst delayMs={delayMs} />;
    case "arclight":
      return <ArcLightBurst delayMs={delayMs} />;
    case "dive":
      return <DiveBurst delayMs={delayMs} />;
    case "smite":
      return <SmiteBurst lead={lead} delayMs={delayMs} />;
    case "decree":
      return <DecreeBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 4 (WILD set + Computer Virus) ---
    case "inferno":
      return <InfernoBurst delayMs={delayMs} />;
    case "hellfire":
      return <HellfireBurst lead={lead} delayMs={delayMs} />;
    case "rockfall":
      return <RockfallBurst delayMs={delayMs} />;
    case "unmake":
      return <UnmakeBurst delayMs={delayMs} />;
    case "wreckingball":
      return <WreckingBallBurst lead={lead} delayMs={delayMs} />;
    case "pinata":
      return <PinataBurst lead={lead} delayMs={delayMs} />;
    case "artillery":
      return <ArtilleryBurst delayMs={delayMs} />;
    case "spearcharge":
      return <SpearChargeBurst lead={lead} delayMs={delayMs} />;
    case "tankroll":
      return <TankRollBurst delayMs={delayMs} />;
    case "hailstorm":
      return <HailstormBurst delayMs={delayMs} />;
    case "blizzard":
      return <BlizzardBurst lead={lead} delayMs={delayMs} />;
    case "stormcloud":
      return <StormCloudBurst delayMs={delayMs} />;
    case "stonerise":
      return <StoneRiseBurst delayMs={delayMs} />;
    case "mountainwall":
      return <MountainWallBurst delayMs={delayMs} />;
    case "trench":
      return <TrenchBurst delayMs={delayMs} />;
    case "reinforce":
      return <ReinforceBurst delayMs={delayMs} />;
    case "paradrop":
      return <ParadropBurst delayMs={delayMs} />;
    case "geniepoof":
      return <GeniePoofBurst delayMs={delayMs} />;
    case "suppress":
      return <SuppressBurst delayMs={delayMs} />;
    case "timestop":
      return <TimeStopBurst lead={lead} delayMs={delayMs} />;
    case "glitch":
      return <GlitchBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 5 (library core + wild + funny second pass) ---
    case "disintegrate":
      return <DisintegrateBurst lead={lead} delayMs={delayMs} />;
    case "cavalrycharge":
      return <CavalryChargeBurst lead={lead} delayMs={delayMs} />;
    case "stonehide":
      return <StonehideBurst lead={lead} delayMs={delayMs} />;
    case "wardpulse":
      return <WardPulseBurst lead={lead} delayMs={delayMs} />;
    case "canopy":
      return <CanopyBurst delayMs={delayMs} />;
    case "chronosteal":
      return <ChronoStealBurst lead={lead} delayMs={delayMs} />;
    case "blink":
      return <BlinkBurst delayMs={delayMs} />;
    case "portal":
      return <PortalBurst delayMs={delayMs} />;
    case "borderward":
      return <BorderWardBurst delayMs={delayMs} />;
    case "banana":
      return <BananaBurst delayMs={delayMs} />;
    case "minefield":
      return <MinefieldBurst delayMs={delayMs} />;
    case "vortex":
      return <VortexBurst lead={lead} delayMs={delayMs} />;
    default:
      return null;
  }
}
