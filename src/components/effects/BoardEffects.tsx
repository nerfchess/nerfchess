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
  9: "#f4c430",
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
  | "sugarrush";
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
  banner_of_war: { ordering: "radial", staggerMs: 60, victims: ["n"], visual: "bannerwar", hasLead: true, sound: "blitz", source: "empower" },

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

  // --- Batch 6: MARQUEE spectacles for the top-tier (tier-8) cards. A dragon
  // that sweeps the board breathing fire (removal diff, like Nova), and an
  // archmage who rises and casts (summon / void zones). Every entry reuses an
  // existing SigSoundKey and an already-wired source. ---
  total_annihilation: { ordering: "sweep", staggerMs: 95, victims: ["p", "n", "b", "r"], visual: "dragonlord", hasLead: true, sound: "atomic" },
  queens_apocalypse: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "dragonlord", hasLead: true, sound: "atomic" },
  grand_reset: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "archmage", hasLead: true, sound: "coronation", source: "summon" },
  void_realm: { ordering: "radial", staggerMs: 55, victims: "all", visual: "archmage", hasLead: true, sound: "shades", source: "blindfold" },

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
  we_flood: { ordering: "sweep", staggerMs: 70, victims: "all", visual: "flood", hasLead: false, sound: "wall", source: "blindfold" },
  cataclysmic_meteor: { ordering: "sweep", staggerMs: 80, victims: ["p", "n", "b", "r", "q"], visual: "meteorstorm", hasLead: true, sound: "atomic" },
  phoenix_rebirth: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "phoenixrise", hasLead: true, sound: "wall", source: "summon" },
  full_resurrection: { ordering: "sweep", staggerMs: 90, victims: "all", visual: "phoenixrise", hasLead: true, sound: "wall", source: "summon" },

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
  purge_storm: { ordering: "sweep", staggerMs: 60, victims: ["p"], visual: "purgestorm", hasLead: false, sound: "extinction" },
  roulette: { ordering: "radial", staggerMs: 0, victims: "all", visual: "roulette", hasLead: true, sound: "rampage" },
  purge_line: { ordering: "sweep", staggerMs: 55, victims: ["p", "n", "b", "r"], visual: "purgeline", hasLead: false, sound: "extinction" },
  nerf_this: { ordering: "radial", staggerMs: 90, victims: ["p", "n", "b"], visual: "calldown", hasLead: true, sound: "lightning" },
  annihilation: { ordering: "radial", staggerMs: 45, victims: ["p", "n", "b", "r"], visual: "annihilation", hasLead: true, sound: "extinction" },
  meteor: { ordering: "radial", staggerMs: 35, victims: "all", visual: "meteorcross", hasLead: true, sound: "atomic" },
  purge_realm: { ordering: "sweep", staggerMs: 40, victims: ["n", "b"], visual: "purgerealm", hasLead: false, sound: "extinction" },
  ruin: { ordering: "sweep", staggerMs: 60, victims: ["p", "n"], visual: "ruin", hasLead: true, sound: "cataclysm" },

  // Effect-data spectacles (inert-until-wired, like their shipped peers).
  ice_age: { ordering: "radial", staggerMs: 50, victims: "all", visual: "iceage", hasLead: true, sound: "massfreeze", source: "frozen" },
  world_end: { ordering: "radial", staggerMs: 55, victims: "all", visual: "worldend", hasLead: true, sound: "massfreeze", source: "frozen" },
  rust: { ordering: "radial", staggerMs: 45, victims: "all", visual: "rustlock", hasLead: false, sound: "massfreeze", source: "frozen" },
  mass_petrify: { ordering: "sweep", staggerMs: 55, victims: ["n", "b"], visual: "masspetrify", hasLead: false, sound: "petrify", source: "walnut" },
  walnut_queen: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "walnutcurse", hasLead: true, sound: "petrify", source: "walnut" },
  amazon: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "amazoncrown", hasLead: true, sound: "coronation", source: "empower" },
  titan_legion: { ordering: "radial", staggerMs: 0, victims: "all", visual: "titanlegion", hasLead: true, sound: "colossus", source: "empower" },
  living_god: { ordering: "radial", staggerMs: 0, victims: "all", visual: "livinggod", hasLead: true, sound: "colossus", source: "empower" },
  eternal_reign: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "eternalreign", hasLead: true, sound: "coronation", source: "empower" },
  godslayer_knight: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "godslayer", hasLead: true, sound: "coronation", source: "empower" },
  werewolf: { ordering: "radial", staggerMs: 0, victims: "all", visual: "werewolf", hasLead: true, sound: "colossus", source: "empower" },
  last_meal: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "lastmeal", hasLead: false, sound: "coronation", source: "empower" },
  onslaught: { ordering: "radial", staggerMs: 60, victims: "all", visual: "onslaught", hasLead: true, sound: "blitz", source: "rally" },
  resurrection: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "resurrection", hasLead: true, sound: "wall", source: "summon" },
  grand_resurrection: { ordering: "sweep", staggerMs: 85, victims: "all", visual: "grandrevive", hasLead: true, sound: "wall", source: "summon" },
  iron_legion: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "ironlegion", hasLead: false, sound: "wall", source: "summon" },
  second_coming: { ordering: "radial", staggerMs: 0, victims: "all", visual: "secondcoming", hasLead: true, sound: "wall", source: "summon" },
  necromancer: { ordering: "radial", staggerMs: 0, victims: "all", visual: "necromancer", hasLead: true, sound: "wall", source: "summon" },
  lava_floor: { ordering: "sweep", staggerMs: 55, victims: "all", visual: "lavafloor", hasLead: false, sound: "wall", source: "blindfold" },

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
  oblivion: { ordering: "radial", staggerMs: 45, victims: "all", visual: "oblivionwipe", hasLead: true, sound: "extinction" },
  blood_pact: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "bloodpact", hasLead: true, sound: "rampage" },
  regicide: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "regicideblade", hasLead: true, sound: "coronation", source: "empower" },
  divine_right: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "divineright", hasLead: true, sound: "coronation", source: "empower" },
  ascendancy: { ordering: "radial", staggerMs: 60, victims: "all", visual: "ascendancy", hasLead: true, sound: "colossus", source: "empower" },
  divine_mandate: { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], visual: "mandate", hasLead: true, sound: "aegis", source: "shield" },
  blackout: { ordering: "radial", staggerMs: 40, victims: "all", visual: "blackout", hasLead: true, sound: "snooze", source: "stun" },

  // Beasts / summons / relocations (summon zone: the landing squares gain a piece).
  griffon_rider: { ordering: "radial", staggerMs: 0, victims: "all", visual: "griffoncarry", hasLead: false, sound: "wall", source: "summon" },
  grand_army: { ordering: "sweep", staggerMs: 80, victims: "all", visual: "grandarmy", hasLead: true, sound: "wall", source: "summon" },
  mortgage: { ordering: "radial", staggerMs: 0, victims: "all", visual: "mortgagesign", hasLead: false, sound: "wall", source: "summon" },
  wc_repo_rook: { ordering: "radial", staggerMs: 0, victims: "all", visual: "reporook", hasLead: false, sound: "wall", source: "summon" },
  wc_musical_chairs: { ordering: "radial", staggerMs: 0, victims: "all", visual: "musicalchairs", hasLead: false, sound: "wall", source: "summon" },

  // Faustian / frenzy / freeze / wind / slow (existing effect zones).
  wc_deal_with_the_devil: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "devildeal", hasLead: true, sound: "coronation", source: "empower" },
  wc_berserk_pawn: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "berserkrage", hasLead: true, sound: "blitz", source: "empower" },
  we_glaciate: { ordering: "radial", staggerMs: 0, victims: "all", visual: "encase", hasLead: false, sound: "massfreeze", source: "frozen" },
  snowball: { ordering: "radial", staggerMs: 0, victims: ["p"], visual: "snowballsplat", hasLead: true, sound: "massfreeze", source: "frozen" },
  we_gale: { ordering: "sweep", staggerMs: 50, victims: ["b"], visual: "galephase", hasLead: false, sound: "blitz", source: "empower" },
  opposite_day: { ordering: "radial", staggerMs: 45, victims: "all", visual: "oppositeday", hasLead: false, sound: "snooze", source: "slow" },

  // --- Batch 10: gambling wheels, the drum-man, and a slapstick funny batch.
  // The gambling cards (Wheel of Fortune / Jackpot / Gamble) join roulette with
  // their own spin-to-a-pointer wheel, a slot machine, and a coin flip; every
  // one reuses an already-shipped SigZone + SigSoundKey. tung_tung_sahur finally
  // gets its own drum-man bonk (it was the one brainrot card with no signature).
  // The rest are comedic library cards that used to fall back to a generic zone
  // overlay; each gets a bespoke gag. Every source !== "removal" entry rides the
  // same zone wiring as the rest of Batch 2-9.

  // Gambling (spin a wheel / pull the lever / flip a coin).
  wheel_of_fortune: { ordering: "radial", staggerMs: 0, victims: "all", visual: "fortunewheel", hasLead: true, sound: "snooze", source: "stun" },
  jackpot: { ordering: "radial", staggerMs: 0, victims: "all", visual: "slotmachine", hasLead: true, sound: "coronation", source: "summon" },
  gamble: { ordering: "radial", staggerMs: 0, victims: "all", visual: "coinflip", hasLead: true, sound: "snooze", source: "stun" },

  // The one brainrot card still without a signature: the drum-man marches and
  // bonks the nearest enemy (freeze skin "stun" + bonk), so it reads off the
  // stun zone like Bombombini.
  tung_tung_sahur: { ordering: "radial", staggerMs: 60, victims: ["p", "n", "b", "r", "q"], visual: "drumbonk", hasLead: true, sound: "siege", source: "stun" },

  // Slapstick freezes (frozen zone, the snowball precedent): a rake to the face,
  // a fly swatter, a nap, a glue trap, a bear trap.
  rake: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "rakebonk", hasLead: false, sound: "siege", source: "frozen" },
  fly_swatter: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "flyswat", hasLead: false, sound: "massfreeze", source: "frozen" },
  napping: { ordering: "radial", staggerMs: 0, victims: ["n"], visual: "sleepcap", hasLead: false, sound: "snooze", source: "frozen" },
  super_glue: { ordering: "radial", staggerMs: 45, victims: "all", visual: "superglue", hasLead: true, sound: "massfreeze", source: "frozen" },
  bear_trap: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "beartrap", hasLead: false, sound: "siege", source: "frozen" },

  // Slapstick knockbacks (stun zone: a bonked / stunned piece): the ACME anvil
  // flattens, the spring glove punches back.
  anvil_drop: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "anvildrop", hasLead: true, sound: "atomic", source: "stun" },
  boxing_glove: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "boxingglove", hasLead: false, sound: "rampage", source: "stun" },

  // Ward (shield zone): the bubble-wrapped piece.
  bubble_wrap: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], visual: "bubblewrap", hasLead: true, sound: "aegis", source: "shield" },

  // Movement curses (slow zone: the anchored / hexed enemy pieces): dizzy
  // vertigo, a paper-crane fold, scurrying gremlins, a homeward pull, jet lag.
  vertigo: { ordering: "radial", staggerMs: 0, victims: ["q"], visual: "vertigo", hasLead: true, sound: "snooze", source: "slow" },
  origami: { ordering: "radial", staggerMs: 40, victims: ["r"], visual: "origami", hasLead: false, sound: "snooze", source: "slow" },
  gremlins: { ordering: "radial", staggerMs: 40, victims: ["r"], visual: "gremlins", hasLead: false, sound: "snooze", source: "slow" },
  homesick: { ordering: "radial", staggerMs: 45, victims: "all", visual: "homesick", hasLead: false, sound: "snooze", source: "slow" },
  jet_lag: { ordering: "radial", staggerMs: 0, victims: "all", visual: "jetlag", hasLead: true, sound: "clockcage", source: "slow" },

  // Self grants: the king climbs the hill (empower zone), a sugar rush (rally).
  king_of_the_hill: { ordering: "radial", staggerMs: 0, victims: ["k"], visual: "hillflag", hasLead: true, sound: "coronation", source: "empower" },
  sugar_rush: { ordering: "radial", staggerMs: 60, victims: "all", visual: "sugarrush", hasLead: true, sound: "blitz", source: "rally" },
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

// --- Board-wide takeover stage (brainrot lead spectacles) --------------------
// The brainrot lead flourishes escape their one square: painted inside an
// oversized canvas centred on the (arbitrary) signature square, big enough to
// blanket the whole 8x8 board wherever that square lands, clipped to the board
// by its overflow-hidden frame. The computer-virus cascade uses the same trick.
// Children lay out in the canvas's 0..100% space (its centre is the caster
// square), so a full-canvas wash covers the board and a central-band particle
// field / sweeping character reads as board-wide.
function BoardWideStage({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

// A full-board colour wash (freeze glaze, time-grey, banana-gold, honk-flash).
function BoardWash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="fx-sig-bwash absolute inset-0 block"
      style={{ background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

// A scatter of objects raining down the central board band, each tumbling from
// above the board through it and out the bottom, staggered and spinning.
// `render(i)` draws one faller (sized to its column). Left values sit in the
// canvas's central ~40% so they concentrate over the board, not the wide margin.
const RAIN_COLS = [
  { l: "31%", d: 0, s: "300deg", sz: 8 }, { l: "37%", d: 150, s: "-260deg", sz: 6 },
  { l: "43%", d: 60, s: "340deg", sz: 9 }, { l: "49%", d: 210, s: "-300deg", sz: 7 },
  { l: "55%", d: 30, s: "280deg", sz: 8 }, { l: "61%", d: 175, s: "-330deg", sz: 6 },
  { l: "67%", d: 95, s: "310deg", sz: 9 }, { l: "34%", d: 250, s: "-280deg", sz: 6 },
  { l: "64%", d: 320, s: "360deg", sz: 8 }, { l: "50%", d: 380, s: "-320deg", sz: 7 },
];
function BoardRain({ delayMs, render }: { delayMs: number; render: (i: number) => React.ReactNode }) {
  return (
    <>
      {RAIN_COLS.map((c, i) => (
        <span
          key={i}
          className="fx-sig-rain absolute top-[30%] block"
          style={
            { left: c.l, height: `${c.sz}%`, width: `${c.sz}%`, "--spin": c.s, animationDelay: `${delayMs + c.d}ms` } as React.CSSProperties
          }
        >
          {render(i)}
        </span>
      ))}
    </>
  );
}

// A colossal shockwave ring bloomed from the board centre (goose HONK, ape
// chest-thump). Sized as a fraction of the canvas so it sweeps well past the
// board edges as it expands.
function BoardBoom({ delayMs, color, thickness = 3 }: { delayMs: number; color: string; thickness?: number }) {
  return (
    <span
      className="fx-sig-boom absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "70%", width: "70%", marginLeft: "-35%", marginTop: "-35%", border: `${thickness}px solid ${color}`, animationDelay: `${delayMs}ms` }}
    />
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

// --- Batch 6: marquee DRAGON + WIZARD spectacles (top-tier cards) ------------
// Two board-wide signatures for the highest-tier marquee cards, wired like Nova.
// Solid fills only (no gradients / glow / box-shadow), transform/opacity
// animation, one-shot, hidden entirely under reduced motion. New motions
// (dragon fly / wingbeat / fire breath / wizard rise) live in effects.css; the
// per-square hits reuse the shared fx-sig-flash / -rise / -swirl / -scorch /
// -star classes.

/** Marquee DRAGON (Total Annihilation / Queen's Apocalypse): on the lead square
 * a great wyrm sweeps across the board, banking and beating its wing as it
 * breathes a cone of fire; every cleared square erupts in a fireball, a rising
 * flame lick, an ember shatter, and a scorch. */
function DragonLordBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <span
          className="fx-sig-dragon-fly absolute left-[-42%] top-[2%] block h-[62%] w-[150%]"
          style={{ animationDelay: `${delayMs}ms` }}
        >
          <svg viewBox="0 0 96 40" className="h-full w-full" aria-hidden="true">
            {/* tail + serpentine body */}
            <path
              d="M4 30 C14 25 20 31 28 26 C36 21 42 25 52 19 C58 15 64 17 70 15 L73 20 C67 22 61 22 55 26 C47 31 41 28 33 33 C25 38 14 36 6 34 Z"
              fill="#7a2f28"
              stroke="#3a1512"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* belly ridges */}
            <path d="M20 30 L24 30 M30 28 L34 28 M42 26 L46 26" stroke="#e0776b" strokeWidth="1.2" strokeLinecap="round" />
            {/* beating wing */}
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs}ms` }}>
              <path d="M40 24 L30 4 L36 12 L42 3 L46 13 L54 6 L50 20 Z" fill="#5a1f1a" stroke="#2a0f0c" strokeWidth="1.1" strokeLinejoin="round" />
              <path d="M40 22 L36 11 M42 20 L44 9 M46 18 L50 10" stroke="#2a0f0c" strokeWidth="0.7" />
            </g>
            {/* head + jaw */}
            <path d="M68 14 L84 10 L78 16 L88 17 L77 21 L70 20 Z" fill="#8a3630" stroke="#3a1512" strokeWidth="1.1" strokeLinejoin="round" />
            {/* horn */}
            <path d="M72 12 L69 6 L75 11 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" strokeLinejoin="round" />
            {/* eye */}
            <circle cx="75" cy="14.5" r="1" fill="#e6bf6a" />
          </svg>
          {/* fire breath from the jaws */}
          <span
            className="fx-sig-firebreath absolute right-[-2%] top-[24%] block h-[40%] w-[34%]"
            style={{ animationDelay: `${delayMs + 120}ms` }}
          >
            <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 12 C14 3 30 4 48 1 C40 8 42 16 48 23 C30 20 14 21 0 12 Z" fill="rgba(224,119,107,0.9)" />
              <path d="M2 12 C14 7 26 8 40 6 C34 10 35 14 40 18 C26 16 14 17 2 12 Z" fill="rgba(230,191,106,0.95)" />
            </svg>
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-rise absolute inset-x-[28%] bottom-[8%] block h-[66%]"
        style={{ animationDelay: `${delayMs + 70}ms` }}
      >
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C9 31 12 20 19 13 C18 21 24 21 23 27 C28 23 27 16 25 10 C33 18 34 30 26 38 Z" fill="rgba(224,119,107,0.92)" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M20 40 C15 33 16 25 21 20 C21 25 25 25 24 30 C27 26 26 22 25 18 C30 24 29 33 24 39 Z" fill="rgba(230,191,106,0.95)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e0776b" stroke="#7a2f28" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[28%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 190}ms` }}
      />
    </span>
  );
}

/** Marquee WIZARD (Grand Reset / The Void Realm): on the lead square an archmage
 * rises out of the board and casts - his staff-orb flares while twin arcane
 * rings spin out and sparks scatter; every affected square gets an arcane ring,
 * a rising rune sigil, and a spark burst. */
function ArchmageBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        {/* arcane rings cast outward */}
        <span className="fx-sig-swirl absolute inset-[8%] block" style={{ animationDelay: `${delayMs + 220}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeDasharray="5 4" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="#7eb59a" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </span>
        {/* the rising archmage */}
        <span className="fx-sig-wizard-rise absolute left-[26%] bottom-[2%] block h-[92%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 48" className="h-full w-full" aria-hidden="true">
            {/* staff */}
            <path d="M31 12 L28 47" stroke="#6b4a2a" strokeWidth="1.8" strokeLinecap="round" />
            {/* robe */}
            <path d="M20 17 L32 47 L8 47 Z" fill="#7a5cc0" stroke="#3a2a63" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M12 41 H28" stroke="#a877d8" strokeWidth="1" />
            {/* head */}
            <circle cx="20" cy="15" r="4" fill="#e8d3b0" stroke="#3a2a63" strokeWidth="0.8" />
            {/* beard */}
            <path d="M16 16 C17 25 23 25 24 16 C23 20 17 20 16 16 Z" fill="#e6e6ee" stroke="#8a8aa0" strokeWidth="0.5" strokeLinejoin="round" />
            {/* pointed hat */}
            <path d="M20 1 L28 14 L12 14 Z" fill="#5a3fa0" stroke="#3a2a63" strokeWidth="1.1" strokeLinejoin="round" />
            {/* hat star */}
            <path d="M20 4.5 L21 7 L23.5 7 L21.5 8.6 L22.3 11 L20 9.5 L17.7 11 L18.5 8.6 L16.5 7 L19 7 Z" fill="#e6bf6a" />
            {/* staff orb */}
            <circle cx="31.5" cy="10" r="3.2" fill="#7eb59a" stroke="#2e5f4a" strokeWidth="0.8" />
          </svg>
        </span>
        {/* orb flare */}
        <span
          className="fx-sig-flash absolute left-[62%] top-[10%] block h-[22%] w-[22%] rounded-full"
          style={{ background: "rgba(126,181,154,0.85)", animationDelay: `${delayMs + 180}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#a877d8" stroke="#4a3070" delayMs={delayMs + 220} sizePct={10} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeDasharray="5 4" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[30%] bottom-[16%] block h-[46%] w-[40%]" style={{ animationDelay: `${delayMs + 90}ms` }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#a877d8" strokeWidth="1.3" strokeDasharray="3 2.4" />
          <path d="M12 4 L13.6 10.4 L20 11 L14.6 14.4 L16.4 21 L12 16.8 L7.6 21 L9.4 14.4 L4 11 L10.4 10.4 Z" fill="none" stroke="#7eb59a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#a877d8" stroke="#4a3070" delayMs={delayMs} sizePct={10} />
    </span>
  );
}

// --- Batch 7: marquee sea / monster + top-tier boardwide spectacles ----------
// Bespoke reads for the big sea beasts (Kraken, Abyss, Whirlpool, Flood, the
// Frost Ward frozen moat) and two more end-game boardwide spectacles in the
// dragon / wizard family (a colossal meteor, a rising phoenix). Solid fills
// only (no gradients / glow / box-shadow), transform/opacity animation, one-
// shot, hidden entirely under reduced motion. New motions (tentacle / maw /
// whirl / wave / moat / meteor / phoenix) live in effects.css; the per-square
// hits reuse the shared fx-sig-flash / -ring / -rise / -scorch / -star /
// -implode / -wingbeat classes and the ShardBurst helper.

const KRAKEN_WATER = "#4f7d68";
const KRAKEN_SUCKER = "#a3d196";

/** Kraken: a suckered tentacle rears up out of the square and sways; the lead
 * square raises a second coil with a green splash flash. Sea-green (mint). */
function KrakenBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-x-[14%] bottom-[8%] block h-[26%] rounded-full"
        style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-tentacle absolute left-[34%] bottom-[4%] block h-[88%] w-[34%]"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 24 60" className="h-full w-full" aria-hidden="true">
          <path
            d="M8 60 C6 46 4 38 10 28 C14 20 12 12 18 6 C15 12 18 18 15 24 C12 30 14 40 12 60 Z"
            fill={KRAKEN_WATER}
            stroke="#2f4a3c"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <g fill={KRAKEN_SUCKER}>
            <circle cx="10.5" cy="30" r="1.3" />
            <circle cx="12.5" cy="22" r="1.2" />
            <circle cx="14.5" cy="15" r="1.1" />
            <circle cx="16" cy="9.5" r="1" />
          </g>
        </svg>
      </span>
      {lead && (
        <>
          <span
            className="fx-sig-tentacle absolute left-[54%] bottom-[6%] block h-[70%] w-[26%]"
            style={{ animationDelay: `${delayMs + 90}ms` }}
          >
            <svg viewBox="0 0 20 48" className="h-full w-full" aria-hidden="true">
              <path
                d="M7 48 C5 34 10 28 6 18 C4 12 8 6 12 2 C10 8 13 12 10 20 C7 28 11 36 10 48 Z"
                fill="#3f6a58"
                stroke="#274035"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className="fx-sig-flash absolute inset-x-[24%] bottom-[6%] block h-[22%] rounded-full"
            style={{ background: "rgba(163,209,150,0.6)", animationDelay: `${delayMs}ms` }}
          />
        </>
      )}
      <ShardBurst vectors={BURST_MED} fill={KRAKEN_SUCKER} stroke="#2f4a3c" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Abyss / Void: a dark maw yawns open and pieces are pulled down into it; the
 * lead square adds an event-horizon ring. Reuses VORTEX_VEC for the in-pull. */
function AbyssBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-maw absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="rgba(12,16,22,0.92)" stroke="rgba(126,181,154,0.85)" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="11" fill="rgba(6,9,13,0.95)" stroke="rgba(90,140,120,0.7)" strokeWidth="1" />
        </svg>
      </span>
      {VORTEX_VEC.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.d}ms` } as React.CSSProperties}
        >
          <SigShard fill="#5a8c78" stroke="#243a30" variant={i} />
        </span>
      ))}
      {lead && (
        <span
          className="fx-sig-ring absolute inset-[10%] block rounded-full"
          style={{ border: "1.5px solid rgba(126,181,154,0.85)", animationDelay: `${delayMs}ms` }}
        />
      )}
    </span>
  );
}

/** Whirlpool: concentric water spirals inward and drags a mote down with it. */
function WhirlpoolBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-whirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path
            d="M20 3 C31 3 37 12 37 20 C37 29 30 34 22 34 C15 34 11 29 11 23 C11 18 15 14 20 14 C24 14 27 17 27 21 C27 24 25 26 22 26"
            fill="none"
            stroke="rgba(126,181,154,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 8 C28 8 32 14 32 20 C32 26 27 29 22 29"
            fill="none"
            stroke="rgba(163,209,150,0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill={KRAKEN_SUCKER} stroke="#2f4a3c" delayMs={delayMs + 80} sizePct={8} />
    </span>
  );
}

/** Flood: a crested wave washes across the trap square and drains off, throwing
 * a couple of foam flecks. */
function FloodBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[2%] bottom-[10%] block h-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M0 12 C8 4 14 4 22 10 C30 16 38 16 48 8 L48 24 L0 24 Z"
            fill="rgba(126,181,154,0.55)"
            stroke="rgba(163,209,150,0.85)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M0 16 C10 10 16 12 24 16 C32 20 40 18 48 14" fill="none" stroke="rgba(230,246,255,0.8)" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-star absolute left-[30%] top-[46%] block h-[7%] w-[7%]"
        style={{ "--dx": "60%", "--dy": "-120%", "--rot": "120deg", animationDelay: `${delayMs + 140}ms` } as React.CSSProperties}
      >
        <SigShard fill="#e6f6ff" stroke="#7fb8dd" variant={0} />
      </span>
      <span
        className="fx-sig-star absolute left-[60%] top-[42%] block h-[7%] w-[7%]"
        style={{ "--dx": "-50%", "--dy": "-140%", "--rot": "-100deg", animationDelay: `${delayMs + 180}ms` } as React.CSSProperties}
      >
        <SigShard fill="#e6f6ff" stroke="#7fb8dd" variant={1} />
      </span>
    </span>
  );
}

/** Frost Ward frozen moat: a spiked ring of ice locks in around the king; lead
 * adds a frost flash. Ice palette, distinct from the generic ward pulse. */
function FrozenMoatBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-moat absolute inset-[8%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(224,246,255,0.9)" strokeWidth="2" />
          <circle cx="20" cy="20" r="13" fill="none" stroke="rgba(127,184,221,0.8)" strokeWidth="1" />
          <g fill="rgba(230,246,255,0.9)" stroke="#7fb8dd" strokeWidth="0.6" strokeLinejoin="round">
            <path d="M20 1 L22 6 L18 6 Z" />
            <path d="M39 20 L34 22 L34 18 Z" />
            <path d="M20 39 L18 34 L22 34 Z" />
            <path d="M1 20 L6 18 L6 22 Z" />
            <path d="M33 7 L31 11 L28 8 Z" />
            <path d="M7 33 L9 29 L12 32 Z" />
            <path d="M33 33 L29 31 L32 28 Z" />
            <path d="M7 7 L11 9 L8 12 Z" />
          </g>
        </svg>
      </span>
      {lead && (
        <span
          className="fx-sig-flash absolute inset-[28%] block rounded-full"
          style={{ background: "rgba(224,246,255,0.7)", animationDelay: `${delayMs}ms` }}
        />
      )}
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Cataclysmic Meteor: on the lead square a colossal meteor streaks in from the
 * corner trailing fire; every cleared square erupts in a fireball, a flame lick,
 * an ember shatter, and a scorch. A nova-class boardwide (removal diff). */
function MeteorStormBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <span
          className="fx-sig-meteor absolute left-[-30%] top-[-30%] block h-[150%] w-[150%]"
          style={{ animationDelay: `${delayMs}ms` }}
        >
          <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
            <path d="M2 2 L46 46" stroke="#e6bf6a" strokeWidth="4" strokeLinecap="round" />
            <path d="M10 4 L46 40" stroke="#ffd95e" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 10 L40 46" stroke="#e0776b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="9" fill="#c66860" stroke="#7a2410" strokeWidth="1.4" />
            <circle cx="50" cy="50" r="4.5" fill="#ffd95e" />
          </svg>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-rise absolute inset-x-[28%] bottom-[8%] block h-[64%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M20 40 C10 31 13 20 20 13 C19 21 25 21 24 27 C29 23 28 16 26 10 C34 18 34 30 26 38 Z"
            fill="rgba(224,119,107,0.92)"
            stroke="#7a2f28"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 190}ms` }}
      />
    </span>
  );
}

/** Phoenix Rebirth / Full Resurrection: on the lead square a great firebird
 * heaves up out of the board with beating wings and a fiery crest; every
 * affected square sends up a rising ember feather and a spark burst. A dragon /
 * wizard-family boardwide (summon zone). */
function PhoenixRiseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <span className="fx-sig-phoenix absolute left-[6%] bottom-[2%] block h-[96%] w-[88%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 64 48" className="h-full w-full" aria-hidden="true">
            <path d="M32 46 C28 38 30 30 32 22 C34 30 36 38 32 46 Z" fill="#c66860" stroke="#7a2410" strokeWidth="1" strokeLinejoin="round" />
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs}ms` }}>
              <path d="M32 22 C22 10 12 8 2 12 C10 14 12 20 8 26 C16 22 24 24 32 26 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            </g>
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs + 40}ms` }}>
              <path d="M32 22 C42 10 52 8 62 12 C54 14 52 20 56 26 C48 22 40 24 32 26 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            </g>
            <circle cx="32" cy="18" r="3.4" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
            <path d="M32 14 L34 9 L35 14 Z" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" strokeLinejoin="round" />
          </svg>
        </span>
        <span
          className="fx-sig-flash absolute inset-x-[34%] bottom-[10%] block h-[24%] rounded-full"
          style={{ background: "rgba(255,168,80,0.7)", animationDelay: `${delayMs + 120}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 200} sizePct={10} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[30%] bottom-[10%] block h-[58%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M12 32 C7 24 9 14 12 4 C15 14 17 24 12 32 Z" fill="rgba(224,119,107,0.9)" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M12 26 C10 20 11 14 12 9 C13 14 14 20 12 26 Z" fill="rgba(230,191,106,0.95)" />
        </svg>
      </span>
      <span
        className="fx-sig-flash absolute inset-[32%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.6)", animationDelay: `${delayMs + 60}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

// --- 10h. Batch 8 signature visuals (flavor pass) ---------------------------
// Same rules as Batch 1-7: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow), 1px corners, coral / mint /
// sun / gold accents, hidden under reduced motion. Everything composes the
// shared fx-sig-* classes; only fx-sig-gallop (a cavalry lunge) and fx-sig-quake
// (a ground shudder) are genuinely new. Removal visuals render off the
// detonation diff; the effect-data ones join the inert-until-wired zone set.

// -- Removals (render off the detonation diff) --

/** Detonate: a sacrificed pawn goes off like a bomb, blasting its neighbours.
 * Lead is the central thump; each cleared square gets a fireball and scorch. */
function DetonateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[18%] block rounded-full" style={{ background: "rgba(255,196,120,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(255,168,80,0.95)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span className="fx-sig-scorch absolute inset-[26%] block rounded-full" style={{ background: "rgba(24,14,8,0.72)", animationDelay: `${delayMs + 180}ms` }} />
      {lead && <span className="fx-sig-shock absolute inset-[8%] block rounded-full" style={{ border: "2px solid rgba(255,214,120,0.9)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** Cinder Strike: a single ember slams one pawn to ash. */
function CinderStrikeBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(255,150,60,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#ff8a3c" stroke="#7a3a12" delayMs={delayMs} sizePct={10} />
      <span className="fx-sig-ash absolute left-[40%] top-[16%] block h-[24%] w-[20%] rounded-full" style={{ background: "rgba(230,110,60,0.5)", animationDelay: `${delayMs + 120}ms` }} />
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(26,16,8,0.68)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Purge Storm: pawns disintegrate into motes while a rime line glazes the
 * survivors that freeze. */
function PurgeStormBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[6%] top-[44%] block h-[10%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.55)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#dbe7f2" stroke="#8aa0b4" delayMs={delayMs} sizePct={9} />
      <span className="fx-sig-ash absolute inset-[26%] block rounded-full" style={{ background: "rgba(210,224,236,0.5)", animationDelay: `${delayMs + 80}ms` }} />
    </span>
  );
}

/** Roulette: a wheel spins and a piece is flicked off with a shower of chips. */
function RouletteBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e0776b" strokeWidth="2" />
          <g stroke="#7a2f28" strokeWidth="1.4" fill="none"><path d="M20 3 V37 M3 20 H37 M8 8 L32 32 M32 8 L8 32" /></g>
          <circle cx="20" cy="20" r="3" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-spin absolute inset-[32%] block" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <SigShard fill="#e6bf6a" stroke="#7a5b23" variant={1} />
      </span>
      {lead && <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 200} sizePct={9} />}
    </span>
  );
}

/** Purge Line: a rank-wide bar of light sweeps across, unmaking the pieces. */
function PurgeLineBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[2%] top-[40%] block h-[18%] rounded-[1px]" style={{ background: "rgba(255,244,200,0.6)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#f0e2b0" stroke="#a88a3a" delayMs={delayMs + 60} sizePct={9} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(255,240,190,0.7)", animationDelay: `${delayMs + 40}ms` }} />
    </span>
  );
}

/** Nerf This: lightning is called down onto the marked pieces. Reticle locks,
 * the bolt cracks, a scorch flashes; lead adds a shock ring. */
function CalldownBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-reticle absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,214,94,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-bolt absolute left-[38%] top-[-4%] block h-[74%] w-[24%]" style={{ animationDelay: `${delayMs + 80}ms` }}><JagBolt /></span>
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(30,22,10,0.6)", animationDelay: `${delayMs + 200}ms` }} />
      {lead && <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(255,232,150,0.85)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Annihilation: pieces are pulled into a void core and collapse to nothing. */
function AnnihilationBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-20%] mt-[-20%] block h-[40%] w-[40%] rounded-full"
        style={{ background: "rgba(16,12,20,0.9)", border: "1.5px solid rgba(160,140,196,0.9)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
      />
      {BURST_BIG.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}
        >
          <SigShard fill="#a48cc4" stroke="#463357" variant={i} />
        </span>
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[28%] block rounded-full" style={{ background: "rgba(180,160,214,0.6)", animationDelay: `${delayMs + 260}ms` }} />}
    </span>
  );
}

/** Meteor: a meteor slams the crossing square and a plus-shaped shock rolls
 * out along the struck rank and file. */
function MeteorCrossBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-6%] block h-[64%] w-[64%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L26 26" stroke="#e6a85c" strokeWidth="3" strokeLinecap="round" />
          <circle cx="28" cy="28" r="5" fill="#d98a4a" stroke="#7a3a12" strokeWidth="1.2" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[6%] block" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 2 V38 M2 20 H38" stroke="rgba(255,168,80,0.9)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 160} sizePct={11} />
      {lead && <span className="fx-sig-scorch absolute inset-[26%] block rounded-full" style={{ background: "rgba(24,14,8,0.7)", animationDelay: `${delayMs + 220}ms` }} />}
    </span>
  );
}

/** Purge Realm: enemy minors are banished in a purple arcane shimmer. */
function PurgeRealmBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[20%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#a48cc4" strokeWidth="1.4" strokeDasharray="4 4" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="#c9b6e0" strokeWidth="1" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9b6e0" stroke="#463357" delayMs={delayMs + 80} sizePct={9} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(180,160,214,0.55)", animationDelay: `${delayMs}ms` }} />
    </span>
  );
}

const RUIN_CHUNKS = [
  { left: "30%", top: "26%", w: "20%", c: "#8c8c92", d: 0 },
  { left: "52%", top: "32%", w: "16%", c: "#71717a", d: 50 },
  { left: "36%", top: "46%", w: "22%", c: "#9a9a9f", d: 90 },
];

/** Ruin: the piece crumbles into a heap of rubble with a puff of dust. */
function RuinBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {RUIN_CHUNKS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, border: "1px solid rgba(40,40,46,0.8)", animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <span className="fx-sig-ash absolute inset-x-[24%] bottom-[10%] block h-[20%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 120}ms` }} />
      {lead && <span className="fx-sig-scorch absolute inset-[28%] block rounded-full" style={{ background: "rgba(30,26,20,0.5)", animationDelay: `${delayMs + 180}ms` }} />}
    </span>
  );
}

// -- Effect-data spectacles (inert-until-wired, keyed like their peers) --

const CAVALRY_DASHES = [
  { top: "58%", d: 0 },
  { top: "70%", d: 80 },
  { top: "82%", d: 160 },
];

/** Banner of War: the war banner runs up its pole and the cavalry surges past,
 * a charging horse lunging forward under a trail of speed-dashes. */
function BannerWarBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[36%] top-[2%] block h-[54%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 V2" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-gallop absolute left-[8%] bottom-[10%] block h-[36%] w-[46%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden="true">
          <path d="M2 26 C6 18 10 16 16 16 L20 10 L24 12 L22 16 C30 16 36 20 38 26 L30 24 L32 27 L26 25 L20 26 L14 24 L16 27 L10 25 Z" fill="#c66860" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {CAVALRY_DASHES.map((s, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute left-[8%] block h-[5%] w-[40%] rounded-[1px]"
          style={{ top: s.top, background: "rgba(224,119,107,0.75)", animationDelay: `${delayMs + 120 + s.d}ms` }}
        />
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(224,119,107,0.5)", animationDelay: `${delayMs + 160}ms` }} />}
    </span>
  );
}

/** Ice Age: a heavy glacier slab heaves up and slams the square, shedding
 * frost shards; lead flashes a boardwide rime. */
function IceAgeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-slab absolute inset-x-[10%] bottom-[8%] top-[16%] block rounded-[1px]" style={{ background: "rgba(198,234,255,0.42)", border: "1.5px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 80} sizePct={11} />
      {lead && <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(234,248,255,0.75)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** World End: the whole army seizes under an apocalyptic frost that shudders
 * the ground; lead flashes the wave. */
function WorldEndBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-quake absolute inset-[8%] block rounded-[1px]" style={{ background: "rgba(198,220,240,0.4)", border: "1.5px solid rgba(210,232,248,0.85)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#dbe9f5" stroke="#7f93a8" delayMs={delayMs + 80} sizePct={10} />
      {lead && <span className="fx-sig-flash absolute inset-[28%] block rounded-full" style={{ background: "rgba(228,240,250,0.7)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** Rust: idle pieces seize up under a bloom of corrosion. */
function RustLockBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-[16%] block rounded-[1px]" style={{ background: "rgba(150,90,50,0.42)", border: "1px solid rgba(120,70,40,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#a86a3a" stroke="#5a3418" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

/** Mass Petrify: a wave of stone climbs the minors, shedding grey chips. */
function MassPetrifyBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-petrify absolute bottom-[8%] left-[18%] right-[18%] top-[10%] block rounded-[1px]" style={{ background: "rgba(150,150,158,0.66)", border: "1px solid rgba(120,120,128,0.7)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#9a9a9f" stroke="#5b6672" delayMs={delayMs + 100} sizePct={9} />
    </span>
  );
}

/** Walnut Queen: a walnut shell closes over the queen, a stone leaf drifting
 * off; lead is a small settle. */
function WalnutCurseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 C31 4 36 13 36 22 C36 32 29 38 20 38 C11 38 4 32 4 22 C4 13 9 4 20 4 Z" fill="rgba(150,110,66,0.85)" stroke="#5d3a1e" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M20 5 V37 M8 16 C16 20 24 20 32 16 M8 28 C16 24 24 24 32 28" stroke="#5d3a1e" strokeWidth="1" fill="none" />
        </svg>
      </span>
      {lead && (
        <span className="fx-sig-ash absolute left-[54%] top-[12%] block h-[16%] w-[16%]" style={{ animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
            <path d="M6 1 C9 3 9 8 6 11 C3 8 3 3 6 1 Z" fill="#8a5230" stroke="#4a2e18" strokeWidth="0.6" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Amazon: the queen is crowned an Amazon, a knight-jump arc tracing over the
 * lowered crown. */
function AmazonCrownBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[28%] top-[8%] block h-[30%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}><SigCrown /></span>
      <span className="fx-sig-arc absolute inset-[18%] block" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M10 32 C10 18 18 12 26 12 L24 8 L30 10 L28 16" fill="none" stroke="#a877d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(230,191,106,0.55)", animationDelay: `${delayMs + 160}ms` }} />}
    </span>
  );
}

/** Titan Legion: stone shells grow over the chosen pieces, each stomping a
 * ring; lead adds a gold shock. */
function TitanLegionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const rings = [
    { i: "26%", d: 0 },
    { i: "16%", d: 80 },
    { i: "8%", d: 160 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {rings.map((r, k) => (
        <span key={k} className="fx-sig-grow absolute block rounded-full" style={{ top: r.i, left: r.i, right: r.i, bottom: r.i, border: "2px solid rgba(150,150,158,0.85)", animationDelay: `${delayMs + r.d}ms` }} />
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[6%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.8)", animationDelay: `${delayMs + 220}ms` }} />}
    </span>
  );
}

/** Living God: a shaft of light, a lowered crown, and a divine shock ring. */
function LivingGodBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[36%] top-0 block h-[80%] w-[28%]" style={{ background: "rgba(255,244,200,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crown absolute left-[30%] top-[10%] block h-[26%] w-[40%]" style={{ animationDelay: `${delayMs + 120}ms` }}><SigCrown /></span>
      {lead && <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(255,232,150,0.85)", animationDelay: `${delayMs + 200}ms` }} />}
    </span>
  );
}

/** Eternal Reign: a crown lowers inside an enduring ward ring; lead glints. */
function EternalReignBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(230,191,106,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crown absolute left-[28%] top-[8%] block h-[30%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}><SigCrown /></span>
      {lead && <span className="fx-sig-flash absolute inset-[28%] block rounded-full" style={{ background: "rgba(255,240,190,0.6)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Godslayer Knight: a great smiting blade drops through the knight, throwing
 * gilded sparks; lead flashes silver. */
function GodslayerBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[6%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 36 L18 12 L20 4 L22 12 Z" fill="#e3ecf4" stroke="#5b6672" strokeWidth="1" strokeLinejoin="round" />
          <path d="M14 14 H26" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 140} sizePct={9} />
      {lead && <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(214,232,246,0.6)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Onslaught: three war-charge lunges roll forward in sequence; lead flashes. */
function OnslaughtBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const dashes = [
    { top: "32%", d: 0 },
    { top: "50%", d: 70 },
    { top: "68%", d: 140 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {dashes.map((s, i) => (
        <span key={i} className="fx-sig-gallop absolute left-[6%] block h-[8%] w-[52%] rounded-[1px]" style={{ top: s.top, background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + s.d}ms` }} />
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(224,119,107,0.5)", animationDelay: `${delayMs + 140}ms` }} />}
    </span>
  );
}

/** Resurrection: a shaft of holy light and the fallen rise back in glory; lead
 * rings the halo. */
function ResurrectionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[36%] top-0 block h-[80%] w-[28%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute left-[32%] bottom-[10%] block h-[54%] w-[36%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <circle cx="12" cy="8" r="4.4" fill="rgba(255,246,210,0.85)" stroke="#c9a244" strokeWidth="1" />
          <path d="M5 30 C6 20 8 15 12 15 C16 15 18 20 19 30 Z" fill="rgba(255,246,210,0.85)" stroke="#c9a244" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#fff2c0" stroke="#c9a244" delayMs={delayMs + 140} sizePct={9} />
      {lead && <span className="fx-sig-ring absolute inset-[18%] block rounded-full" style={{ border: "1.5px solid rgba(255,224,140,0.9)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Grand Resurrection: twin light shafts and a crown descend as the queen and a
 * minor return; lead rings. */
function GrandReviveBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[26%] top-0 block h-[76%] w-[20%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-shaft absolute left-[54%] top-0 block h-[76%] w-[20%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs + 90}ms` }} />
      <span className="fx-sig-crownfall absolute top-0 left-[34%] block h-[26%] w-[32%]" style={{ animationDelay: `${delayMs + 60}ms` }}><SigCrown /></span>
      {lead && <span className="fx-sig-ring absolute inset-[20%] block rounded-full" style={{ border: "1.5px solid rgba(255,224,140,0.85)", animationDelay: `${delayMs + 160}ms` }} />}
    </span>
  );
}

/** Iron Legion: a relief force rises from the ground in a haze of dust. */
function IronLegionBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[30%] bottom-[10%] block h-[56%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M5 30 V14 L4 13 V7 H8 V9 H11 V7 H13 V9 H16 V7 H20 V13 L19 14 V30 Z" fill="rgba(140,150,160,0.9)" stroke="#4a525c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[26%] bottom-[8%] block h-[16%] rounded-full" style={{ background: "rgba(120,124,130,0.5)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

/** Second Coming: a crown of light descends inside a protective ward ring;
 * lead flashes mint. */
function SecondComingBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crownfall absolute top-0 left-[32%] block h-[28%] w-[36%]" style={{ animationDelay: `${delayMs}ms` }}><SigCrown /></span>
      {lead && <span className="fx-sig-flash absolute inset-[28%] block rounded-full" style={{ background: "rgba(163,209,150,0.55)", animationDelay: `${delayMs + 140}ms` }} />}
    </span>
  );
}

/** Lava Floor: a rank erupts, tongues of flame licking up from the ground. */
function LavaFloorBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[14%] bottom-[6%] top-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C10 30 15 22 12 12 C18 18 17 8 20 3 C23 9 25 16 28 12 C25 22 30 30 20 40 Z" fill="rgba(230,110,60,0.82)" stroke="#7a3a12" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 40 C16 32 18 24 20 16 C22 24 24 32 20 40 Z" fill="rgba(255,214,120,0.9)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Necromancer: a spectre heaves up out of the grave in a wisp of soul-fire;
 * lead flashes pale violet. */
function NecromancerBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[26%] bottom-[8%] block h-[58%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 30" className="h-full w-full" aria-hidden="true">
          <path d="M6 30 C4 20 8 10 12 10 C16 10 20 20 18 30 C15 26 9 26 6 30 Z" fill="rgba(180,160,200,0.55)" stroke="rgba(150,120,180,0.85)" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="3.2" fill="rgba(200,186,224,0.6)" stroke="rgba(150,120,180,0.85)" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute left-[44%] top-[12%] block h-[22%] w-[18%] rounded-full" style={{ background: "rgba(150,120,180,0.5)", animationDelay: `${delayMs + 120}ms` }} />
      {lead && <span className="fx-sig-flash absolute inset-[32%] block rounded-full" style={{ background: "rgba(180,160,200,0.5)", animationDelay: `${delayMs + 140}ms` }} />}
    </span>
  );
}

/** Werewolf: a raking claw-slash and a feral beast lunge; lead flashes. */
function WerewolfBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[16%] top-[14%] block h-[60%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#c9d2dc" strokeWidth="2.4" strokeLinecap="round" fill="none"><path d="M6 8 L30 22 M4 18 L26 30 M12 4 L30 26" /></g>
        </svg>
      </span>
      <span className="fx-sig-gallop absolute left-[10%] bottom-[12%] block h-[34%] w-[46%]" style={{ animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden="true">
          <path d="M2 24 C8 18 12 10 18 8 L22 2 L24 8 C30 10 36 16 38 24 L30 22 L26 25 L20 22 L12 25 Z" fill="#8a7a6a" stroke="#3c3228" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && <span className="fx-sig-flash absolute inset-[32%] block rounded-full" style={{ background: "rgba(200,190,180,0.5)", animationDelay: `${delayMs + 140}ms` }} />}
    </span>
  );
}

/** Last Meal: the king ties on a napkin and a fork and plate clatter down. */
function LastMealBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M12 6 V16 M12 6 V13 M16 6 V16 M12 16 V34" stroke="#e6bf6a" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="26" cy="20" r="8" fill="none" stroke="#e0776b" strokeWidth="2.2" />
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(230,191,106,0.5)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

// --- 10i. Batch 9 visuals (thematic character-matched signatures) -----------
// Bespoke inline-SVG spectacles for the Italian-brainrot meme cards plus a
// spread of high-flavor library cards that used to fire a reused motif. Flat SVG
// fills and solid discs (no gradients / glow / box-shadow), 1px corners, coral /
// mint / sun / gold. Every motion is transform/opacity only and composes the
// shared fx-sig-* classes; only fx-sig-bombdrop (a whistling bomb) and
// fx-sig-dart (a fast horizontal streak) are new keyframes. All hidden under
// reduced motion. No two share a look.

/** A falling aerial bomb: teardrop shell, tail fins, a mint fuse ridge. */
function AeroBomb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 24" className={className} aria-hidden="true">
      <path d="M8 23 C3.2 18.5 3.2 11.5 8 4 C12.8 11.5 12.8 18.5 8 23 Z" fill="#33403a" stroke="#141e2b" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 4 V1 M5.4 2.4 H10.6 M6.4 1.4 V4 M9.6 1.4 V4" stroke="#8a8478" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M6.6 10 C7 13.6 7 16.6 7.4 19" stroke="#7eb59a" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The bomber-croc: a stubby crocodile fitted with little plane wings, jaws
 * open over its payload. */
function CrocPlane() {
  return (
    <svg viewBox="0 0 48 26" className="h-full w-full" aria-hidden="true">
      <path d="M2 13 L10 8.5 L10 17.5 Z" fill="#4f7a5e" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 10 C16 6.6 30 6.6 40 11 C44 12.5 44 14 40 15.5 C30 19.4 16 19.4 8 16 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 15.6 C22 17.8 34 17.4 40.5 15.2 C34 16.4 22 16.4 12 15.6 Z" fill="#cfe8d8" />
      <path d="M40 11 L47.5 9.6 L44.4 13 L47.5 15.8 L40 15.5 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M41 12 L42.6 13 L44.2 12 M41 14.4 L42.6 13.4 L44.2 14.4" stroke="#f4f7f2" strokeWidth="0.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M22 8.5 L28 1.5 L30.5 10 Z" fill="#5f927a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="38" cy="10.6" r="1" fill="#141e2b" />
      <path d="M16 8.2 L21 7.8 M25 7.9 L30 8.4" stroke="#4f7a5e" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/** Bombardiro Crocodilo: the bomber-croc banks across the board (lead), then on
 * each struck square a bomb whistles down and detonates in a burst of embers. A
 * crocodile dropping bombs, NOT the reused lightning strike. */
function CrocBomberBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a strafing bombing run. The board darkens under the bomber's
    // shadow, the croc-plane banks clean across the board, and a carpet of bombs
    // whistles down and detonates in a wash of embers.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(18,24,18,0.36)" delayMs={delayMs} />
        <BoardRain delayMs={delayMs + 120} render={() => <AeroBomb className="h-full w-full" />} />
        <span className="fx-sig-cross absolute left-[37%] top-[40%] block h-[15%] w-[26%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-wingbeat block h-full w-full">
            <CrocPlane />
          </span>
        </span>
        <span className="fx-sig-flash absolute left-[35%] top-[40%] block h-[30%] w-[30%] rounded-full" style={{ background: "rgba(255,178,84,0.45)", animationDelay: `${delayMs + 640}ms` }} />
        <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 660} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-bombdrop absolute left-[39%] top-[1%] block h-[42%] w-[22%]" style={{ animationDelay: `${delayMs}ms` }}>
        <AeroBomb className="h-full w-full" />
      </span>
      {/* a bouncier carpet run: two cluster bomblets whistle down alongside */}
      {[{ l: "15%", d: 110 }, { l: "66%", d: 50 }].map((b, i) => (
        <span key={i} className="fx-sig-bombdrop absolute top-[4%] block h-[27%] w-[13%]" style={{ left: b.l, animationDelay: `${delayMs + b.d}ms` }}>
          <AeroBomb className="h-full w-full" />
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[20%] block rounded-full" style={{ background: "rgba(255,196,120,0.85)", animationDelay: `${delayMs + 380}ms` }} />
      <span className="fx-sig-ring absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,168,80,0.95)", animationDelay: `${delayMs + 380}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 380} sizePct={11} />
      {[{ l: "16%", d: 470 }, { l: "64%", d: 430 }].map((b, i) => (
        <span key={`p${i}`} className="fx-sig-flash absolute top-[40%] block h-[16%] w-[16%] rounded-full" style={{ left: b.l, background: "rgba(255,196,120,0.7)", animationDelay: `${delayMs + b.d}ms` }} />
      ))}
      <span className="fx-sig-scorch absolute inset-[28%] block rounded-full" style={{ background: "rgba(24,14,8,0.7)", animationDelay: `${delayMs + 540}ms` }} />
    </span>
  );
}

/** Tralalero Tralala: the shark in Nike sneakers blurs across the board (lead),
 * throwing a spray of water on the square it dashed through. */
function SharkSneaker() {
  return (
    <svg viewBox="0 0 48 22" className="h-full w-full" aria-hidden="true">
      <path d="M4 11 C11 4.5 30 3.6 42 8.6 C46 10.4 46 11.6 42 13.2 C34 16.4 13 17 4 11 Z" fill="#8aa0b4" stroke="#3f4b57" strokeWidth="1" strokeLinejoin="round" />
      <path d="M9 12 C19 15 32 14.4 40 12 C32 13.4 19 13.6 9 12 Z" fill="#dbe7f2" />
      <path d="M19 6 L26 0 L28.5 7 Z" fill="#6f8496" stroke="#3f4b57" strokeWidth="1" strokeLinejoin="round" />
      <path d="M2 11 L9 6.5 L9 15.5 Z" fill="#6f8496" stroke="#3f4b57" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="37" cy="9.6" r="1" fill="#141e2b" />
      <path d="M40 11.4 L45.4 10.6 M40 12.6 L44.6 13.2" stroke="#3f4b57" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M30 8.4 L30 13 M27 8.4 L27 13 M24 9 L24 13" stroke="#3f4b57" strokeWidth="0.7" />
      <rect x="13" y="15" width="8" height="4" rx="1.6" fill="#f4f7f2" stroke="#e0776b" strokeWidth="0.9" />
      <rect x="25" y="15" width="8" height="4" rx="1.6" fill="#f4f7f2" stroke="#e0776b" strokeWidth="0.9" />
      <path d="M14 17 L19.6 16 M26 17 L31.6 16" stroke="#e0776b" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}
function SharkDashBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the shark sprints the full length of the board, a speed-blur
    // after-image trailing it, water spray kicked up across the wake, and a
    // sonic-boom ring where it screeches to a stop.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,196,224,0.22)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[36%] top-[46%] block h-[13%] w-[30%]" style={{ animationDelay: `${delayMs + 90}ms`, opacity: 0.5 }}>
          <SharkSneaker />
        </span>
        <span className="fx-sig-cross absolute left-[36%] top-[42%] block h-[15%] w-[32%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-wiggle block h-full w-full">
            <SharkSneaker />
          </span>
        </span>
        <BoardRain
          delayMs={delayMs + 260}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill="rgba(201,234,255,0.85)" stroke="#5b7d94" strokeWidth="0.8" />
            </svg>
          )}
        />
        <span className="fx-sig-boom absolute left-[62%] top-[36%] block h-[36%] w-[36%] rounded-full" style={{ border: "2px solid rgba(198,234,255,0.85)", animationDelay: `${delayMs + 560}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[8%] bottom-[24%] block h-[26%] rounded-full" style={{ background: "rgba(150,196,224,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-wave absolute inset-x-[16%] bottom-[40%] block h-[16%] rounded-full" style={{ background: "rgba(198,234,255,0.45)", animationDelay: `${delayMs + 130}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#c9eaff" stroke="#5b7d94" delayMs={delayMs + 60} sizePct={8} />
    </span>
  );
}

/** Bombombini Gusini: the bomber-goose waddles in (lead) and lobs a stun grenade
 * that pops with a HONK ring of stars. */
function HonkGoose() {
  return (
    <svg viewBox="0 0 34 30" className="h-full w-full" aria-hidden="true">
      <path d="M8 28 C4 22 6 14 12 13 L12 7 C12 3 18 3 18 7 L18 13 C24 15 26 22 22 28 Z" fill="#f4f7f2" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
      <path d="M18 8 L26 9 L18 11 Z" fill="#e8912d" stroke="#8a5311" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="15" cy="8" r="1" fill="#141e2b" />
      <path d="M11 6.6 a6 6 0 0 1 8 0 L18 4.4 H12 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}
function GooseBombBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a giant HONK. The goose thumps down centre-board and a
    // colossal double shockwave rolls out over the whole board, feathers raining
    // in its wake.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.2)" delayMs={delayMs + 220} />
        <span className="fx-sig-grow absolute left-[38%] top-[34%] block h-[28%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-hop block h-full w-full">
            <HonkGoose />
          </span>
        </span>
        <BoardBoom delayMs={delayMs + 240} color="rgba(230,191,106,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 360} color="rgba(126,181,154,0.85)" thickness={3} />
        <BoardRain
          delayMs={delayMs + 280}
          render={() => (
            <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 C8 5 8 11 5 16 C2 11 2 5 5 0 Z" fill="#f4f7f2" stroke="#8aa0b4" strokeWidth="0.7" />
            </svg>
          )}
        />
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[40%] top-0 block h-[34%] w-[22%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 16 18" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="11" r="6" fill="#5f6b52" stroke="#2f3826" strokeWidth="1" />
          <path d="M8 5 V1 M6 2.4 H10" stroke="#8a8478" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[12%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.85)", animationDelay: `${delayMs + 260}ms` }} />
      <span className="fx-sig-shock absolute inset-[24%] block rounded-full" style={{ border: "1.5px solid rgba(126,181,154,0.8)", animationDelay: `${delayMs + 340}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={10} />
    </span>
  );
}

/** Lirili Larila: the clock-elephant plants its clock (lead); on the struck
 * squares the hands sweep backward and a Z of stopped time drifts off. */
function ClockElephant() {
  return (
    <svg viewBox="0 0 34 30" className="h-full w-full" aria-hidden="true">
      <path d="M6 28 C2 22 3 12 10 10 C11 6 20 6 22 10 C29 12 30 22 26 28 L22 28 L21 20 L20 28 L14 28 L13 20 L12 28 Z" fill="#9aa6b0" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
      <path d="M22 12 C27 12 28 18 24 22 C22 24 20 22 20 19 C20 15 21 12 22 12 Z" fill="#9aa6b0" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="14" cy="16" r="6.4" fill="#f4f7f2" stroke="#8a6414" strokeWidth="1.2" />
      <circle cx="8" cy="9" r="1" fill="#141e2b" />
    </svg>
  );
}
function ClockElephantBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: time stops. The whole board greys out, a giant ghost clock
    // face sweeps its hands backward over it, the cactus-elephant grows in, and
    // Zs of stopped time drift up.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(108,114,118,0.5)" delayMs={delayMs} />
        <span className="absolute left-[30%] top-[30%] block h-[40%] w-[40%]" style={{ opacity: 0.85 }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="rgba(244,247,242,0.28)" stroke="#8a6414" strokeWidth="1.6" />
            <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
              <path d="M20 20 L20 7" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 20 L30 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </span>
        <span className="fx-sig-grow absolute left-[40%] top-[42%] block h-[24%] w-[22%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
          <span className="fx-sig-wiggle block h-full w-full">
            <ClockElephant />
          </span>
        </span>
        {[{ l: "26%", t: "30%", d: 220 }, { l: "66%", t: "36%", d: 360 }, { l: "46%", t: "22%", d: 480 }].map((z, i) => (
          <span key={i} className="fx-sig-zzz absolute block h-[8%] w-[8%]" style={{ left: z.l, top: z.t, animationDelay: `${delayMs + z.d}ms` }}>
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[30%] top-[24%] block h-[40%] w-[40%]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="#f4f7f2" stroke="#8a6414" strokeWidth="2" />
          <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
            <path d="M20 20 L20 8" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 20 L28 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[54%] top-[14%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[64%] top-[4%] block h-[18%] w-[18%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Brr Brr Patapim: a sudden cold snap gusts through and icicles spike down over
 * the frozen ranks. */
function ColdSnapBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a blizzard sweeps the whole board. A blue whiteout washes in,
    // frost creeps across, and a curtain of icicles descends board-wide.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,200,235,0.34)" delayMs={delayMs} />
        <span className="fx-sig-frost absolute inset-x-[24%] top-[26%] block h-[8%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.6)", animationDelay: `${delayMs}ms` }} />
        <span className="fx-sig-frost absolute inset-x-[24%] top-[64%] block h-[8%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs + 160}ms` }} />
        <BoardRain
          delayMs={delayMs + 120}
          render={() => (
            <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 L7 5 L5 10 L3 5 Z" fill="#dbe7f2" stroke="#8aa0b4" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
        <ShardBurst vectors={BURST_MED} fill="#eaf8ff" stroke="#8aa0b4" delayMs={delayMs + 220} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[6%] top-[10%] block h-[20%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-frost absolute inset-x-[10%] top-[70%] block h-[14%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.4)", animationDelay: `${delayMs + 140}ms` }} />
      {[{ l: "14%", d: 0, h: "34%" }, { l: "30%", d: 80, h: "28%" }, { l: "46%", d: 40, h: "38%" }, { l: "62%", d: 120, h: "26%" }, { l: "78%", d: 20, h: "32%" }].map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-[6%] block w-[9%]" style={{ left: s.l, height: s.h, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 8 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M1 0 H7 L4 24 Z" fill="#dbe7f2" stroke="#8aa0b4" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[16%] block rounded-full" style={{ border: "2px solid rgba(198,234,255,0.8)", animationDelay: `${delayMs}ms` }} />}
      <ShardBurst vectors={BURST_MED} fill="#eaf8ff" stroke="#8aa0b4" delayMs={delayMs + 120} sizePct={7} />
    </span>
  );
}

/** Chimpanzini Bananini: the banana-monkey thumps in (lead) and banana peels
 * spin off the empowered knight. */
function ChestApe() {
  return (
    <svg viewBox="0 0 30 28" className="h-full w-full" aria-hidden="true">
      <path d="M4 26 C1 18 4 10 9 9 C10 4 20 4 21 9 C26 10 29 18 26 26 Z" fill="#6b4a34" stroke="#33210f" strokeWidth="1" strokeLinejoin="round" />
      <path d="M9 24 C8 18 10 15 15 15 C20 15 22 18 21 24 Z" fill="#caa580" />
      <circle cx="15" cy="9" r="6" fill="#6b4a34" stroke="#33210f" strokeWidth="1" />
      <ellipse cx="15" cy="10" rx="4" ry="3.4" fill="#caa580" />
      <circle cx="13" cy="9" r="0.9" fill="#141e2b" />
      <circle cx="17" cy="9" r="0.9" fill="#141e2b" />
    </svg>
  );
}
function BananApeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the ape goes King-Kong. A colossal ape heaves up over the
    // board beating its chest, a thump shockwave rolls out, and a barrage of
    // spinning banana peels rains across every file.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(242,201,76,0.2)" delayMs={delayMs + 280} />
        <span className="fx-sig-phoenix absolute left-1/2 top-[20%] block h-[62%] w-[56%]" style={{ marginLeft: "-28%", animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-chomp block h-full w-full">
            <ChestApe />
          </span>
        </span>
        <BoardBoom delayMs={delayMs + 320} color="rgba(242,201,76,0.85)" thickness={4} />
        <BoardRain
          delayMs={delayMs + 180}
          render={() => (
            <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
              <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {PIN_STARS.map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-1/2 ml-[-7%] mt-[-7%] block h-[14%] w-[14%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
            <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(242,201,76,0.7)", animationDelay: `${delayMs + 40}ms` }} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(242,201,76,0.5)", animationDelay: `${delayMs + 80}ms` }} />
    </span>
  );
}

/** Boneca Ambalabu: the tire-frog drops its heavy tractor tire over the piece
 * and settles, weighing it down. Frog eyes peek over the rim. */
function TireFrogBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a giant tractor tire steamrolls the full width of the board,
    // frog eyes peeking over the rim, pressing tracks across the board and
    // kicking up dust.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(43,43,47,0.26)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[36%] top-[34%] block h-[30%] w-[30%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-spin block h-full w-full">
            <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="#2b2b2f" stroke="#141416" strokeWidth="1.6" />
              <circle cx="20" cy="20" r="8.5" fill="#3d5a48" stroke="#141416" strokeWidth="1.4" />
              <g stroke="#4a4a50" strokeWidth="1.8"><path d="M20 3 V8 M20 32 V37 M3 20 H8 M32 20 H37 M8 8 L12 12 M32 8 L28 12 M8 32 L12 28 M32 32 L28 28" /></g>
              <circle cx="16" cy="17" r="3" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
              <circle cx="24" cy="17" r="3" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
            </svg>
          </span>
        </span>
        <span className="fx-sig-wave absolute inset-x-[22%] top-[62%] block h-[6%] rounded-[1px]" style={{ background: "rgba(74,74,80,0.7)", animationDelay: `${delayMs + 120}ms` }} />
        {[{ l: "12%" }, { l: "82%" }].map((s, i) => (
          <span key={i} className="fx-sig-ash absolute top-[58%] block h-[9%] w-[9%] rounded-full" style={{ left: s.l, background: "rgba(120,116,110,0.6)", animationDelay: `${delayMs + 320}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[20%] top-[18%] block h-[62%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="24" r="15" fill="#2b2b2f" stroke="#141416" strokeWidth="1.4" />
          <circle cx="20" cy="24" r="7.5" fill="#3d5a48" stroke="#141416" strokeWidth="1.2" />
          <g stroke="#4a4a50" strokeWidth="1.6"><path d="M20 9 V13 M20 35 V39 M5 24 H9 M31 24 H35 M9 13 L12 16 M31 13 L28 16 M9 35 L12 32 M31 35 L28 32" /></g>
          <circle cx="16" cy="20" r="2.4" fill="#7eb59a" stroke="#2c473a" strokeWidth="0.8" />
          <circle cx="24" cy="20" r="2.4" fill="#7eb59a" stroke="#2c473a" strokeWidth="0.8" />
          <circle cx="16" cy="20" r="0.9" fill="#141e2b" />
          <circle cx="24" cy="20" r="0.9" fill="#141e2b" />
        </svg>
      </span>
      {/* a heavier landing: a settle ring and dust kicked out both sides */}
      <span className="fx-sig-shock absolute inset-x-[10%] bottom-[8%] block h-[22%] rounded-full" style={{ border: "2px solid rgba(120,116,110,0.6)", animationDelay: `${delayMs + 260}ms` }} />
      {[{ l: "8%" }, { l: "82%" }].map((s, i) => (
        <span key={i} className="fx-sig-ash absolute bottom-[12%] block h-[16%] w-[16%] rounded-full" style={{ left: s.l, background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 300}ms` }} />
      ))}
      <span className="fx-sig-ash absolute inset-x-[18%] bottom-[12%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 180}ms` }} />
    </span>
  );
}

/** Oblivion: the mythic board-wipe. Each piece is torn into a swallowing void
 * that collapses to a point; lead adds a stark event-horizon shock ring. A
 * monochrome unmaking, distinct from the violet Annihilation / Vortex. */
function OblivionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-21%] mt-[-21%] block h-[42%] w-[42%] rounded-full" style={{ background: "rgba(8,8,10,0.95)", border: "1.5px solid rgba(232,238,246,0.95)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties} />
      {BURST_BIG.map((v, i) => (
        <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <SigShard fill="#c9d2dc" stroke="#3f4b57" variant={i} />
        </span>
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[6%] block rounded-full" style={{ border: "2px solid rgba(232,238,246,0.9)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** Blood Pact: a wax seal presses down (lead) and the sacrificed pawn bursts in
 * a dark-crimson spatter. */
function BloodPactBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span className="fx-sig-grow absolute inset-[24%] block" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="15" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.4" />
            <path d="M20 11 L23 18 L30 18 L24.5 22.5 L26.5 30 L20 25.5 L13.5 30 L15.5 22.5 L10 18 L17 18 Z" fill="#c25248" stroke="#3a1512" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(160,44,40,0.7)", animationDelay: `${delayMs + 120}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#a52c28" stroke="#3a1512" delayMs={delayMs + 120} sizePct={11} />
    </span>
  );
}

/** Regicide: an executioner's crown-and-cleaver drops beside the throne as the
 * queen takes station over the enemy king. */
function RegicideBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[30%] top-0 block h-[54%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 30 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 4 L10 10 L15 2 L20 10 L24 4 L24 13 L6 13 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
          <path d="M15 13 L15 30 M9 34 C9 26 21 26 21 34 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && <span className="fx-sig-flash absolute inset-[28%] block rounded-full" style={{ background: "rgba(230,191,106,0.55)", animationDelay: `${delayMs + 220}ms` }} />}
    </span>
  );
}

/** Divine Right: a shaft of heaven-light falls and a crown settles on the king,
 * who rules with a queen's reach. */
function DivineRightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[34%] top-0 block h-[92%] w-[32%]" style={{ background: "rgba(255,246,200,0.6)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crown absolute left-1/2 top-[10%] ml-[-22%] block h-[34%] w-[44%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 14" className="h-full w-full" aria-hidden="true">
          <path d="M2 12 L2 4.5 L7 8 L12 1.5 L17 8 L22 4.5 L22 12 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && <span className="fx-sig-ring absolute inset-[20%] block rounded-full" style={{ border: "1.5px solid rgba(255,232,150,0.85)", animationDelay: `${delayMs + 200}ms` }} />}
    </span>
  );
}

/** Ascendancy: every piece is haloed and lifts as it ascends to a queen's
 * reach; motes of gold light rise around it. */
function AscendancyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[34%] bottom-[10%] block h-[52%] w-[32%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 30" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 L5 12 L8 16 L10 8 L12 16 L15 12 L16 28 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute left-[28%] top-[6%] block h-[26%] w-[44%] rounded-full" style={{ border: "1.5px solid rgba(244,196,64,0.9)", animationDelay: `${delayMs + 80}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 120} sizePct={8} />
      {lead && <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(244,196,64,0.5)", animationDelay: `${delayMs + 60}ms` }} />}
    </span>
  );
}

/** Divine Mandate: a sealed decree stamps down and a heaven-ward halo falls over
 * the enemy piece that defects to your side. */
function MandateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[24%] top-[16%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <rect x="9" y="7" width="22" height="26" rx="1" fill="#f2e7c8" stroke="#8a6414" strokeWidth="1.2" />
          <path d="M13 13 H27 M13 18 H27 M13 23 H23" stroke="#b79a5a" strokeWidth="1" strokeLinecap="round" />
          <circle cx="20" cy="30" r="4" fill="#c25248" stroke="#7a2f28" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,232,150,0.85)", animationDelay: `${delayMs + 160}ms` }} />
      {lead && <span className="fx-sig-shaft absolute left-[40%] top-0 block h-[40%] w-[20%]" style={{ background: "rgba(255,246,200,0.5)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Blackout: the lights cut out on the enemy court. A breaker panel slams to OFF
 * and a dark curtain wipes across the square. */
function BlackoutBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-[6%] block rounded-[1px]" style={{ background: "rgba(12,14,20,0.72)", animationDelay: `${delayMs + 120}ms`, transformOrigin: "50% 50%" }} />
      <span className="fx-sig-snooze absolute left-[36%] top-[22%] block h-[42%] w-[28%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 28" className="h-full w-full" aria-hidden="true">
          <rect x="4" y="2" width="12" height="24" rx="1" fill="#3a4450" stroke="#141e2b" strokeWidth="1" />
          <rect x="8" y="14" width="4" height="9" rx="1" fill="#c9d2dc" stroke="#141e2b" strokeWidth="0.8" />
          <circle cx="10" cy="8" r="1.6" fill="#e0776b" />
        </svg>
      </span>
      {lead && (
        <span className="fx-sig-zzz absolute left-[54%] top-[14%] block h-[22%] w-[22%]" style={{ animationDelay: `${delayMs + 240}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Griffon Rider: a griffon swoops in on beating wings and sets a carried piece
 * down on the empty square. */
function GriffonCarryBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-4%] top-[-6%] block h-[62%] w-[62%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M12 22 C8 16 11 10 17 9 C18 5 24 5 25 9 C30 11 31 18 27 24 Z" fill="#caa15a" stroke="#6e5321" strokeWidth="1" strokeLinejoin="round" />
          <path d="M28 8 L36 6 L31 10 Z" fill="#e8912d" stroke="#8a5311" strokeWidth="0.7" strokeLinejoin="round" />
          <circle cx="26" cy="8" r="0.9" fill="#141e2b" />
        </svg>
      </span>
      <span className="fx-sig-wingbeat absolute left-[6%] top-[4%] block h-[34%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M20 20 L2 6 L10 20 L2 22 Z" fill="#e8e2d2" stroke="#6e5321" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[40%] bottom-[14%] block h-[40%] w-[26%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="6" r="3.2" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
          <path d="M3 22 C3.6 14 5 12 8 12 C11 12 12.4 14 13 22 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[36%] bottom-[10%] block h-[14%] rounded-full" style={{ background: "rgba(196,178,142,0.5)", animationDelay: `${delayMs + 300}ms` }} />
    </span>
  );
}

/** Grand Army: a fresh force answers the call. A rank of banner-topped spears
 * heaves up out of the ground. */
function GrandArmyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {[{ l: "16%", d: 0 }, { l: "40%", d: 70 }, { l: "64%", d: 35 }].map((s, i) => (
        <span key={i} className="fx-sig-brick absolute bottom-[10%] block h-[64%] w-[16%]" style={{ left: s.l, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 16 40" className="h-full w-full" aria-hidden="true">
            <path d="M8 40 L8 6" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 6 L15 8 L8 12 Z" fill={i % 2 === 0 ? "#e0776b" : "#7eb59a"} stroke="#3a2a1a" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M8 4 L8 8" stroke="#e6bf6a" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[14%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.8)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** Mortgage: a loan is drawn against the home. A SOLD sign plants and a
 * mortgaged rook rises behind it; a few gold coins scatter. */
function MortgageBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[42%] bottom-[12%] block h-[46%] w-[26%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-brick absolute left-[18%] bottom-[16%] block h-[40%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 30 24" className="h-full w-full" aria-hidden="true">
          <path d="M4 24 L4 4" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="3" width="22" height="12" rx="1" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
          <path d="M8 9 H22 M8 12 H18" stroke="#f4f7f2" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 220} sizePct={8} />
    </span>
  );
}

/** Repo Rook: a repo man's tow-hook lowers a rook behind enemy lines on a chain,
 * a REPO tag swinging from it. */
function RepoRookBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[52%] top-0 block h-[26%] w-[8%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 6 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 0 V16 C3 20 6 20 6 16" fill="none" stroke="#5b6672" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[36%] bottom-[14%] block h-[46%] w-[28%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[56%] top-[24%] block h-[18%] w-[26%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
        <svg viewBox="0 0 24 12" className="h-full w-full" aria-hidden="true">
          <rect x="1" y="2" width="22" height="8" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
        </svg>
      </span>
    </span>
  );
}

/** Musical Chairs: the music stops and two pieces scramble to swap seats, a
 * chair spinning in on the beat. */
function MusicalChairsBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M12 34 V16 M12 16 H24 M24 14 V34 M12 24 H24" fill="none" stroke="#8a6a4a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 8 a5 5 0 1 1 -0.1 0" fill="none" stroke="#e0776b" strokeWidth="2" />
          <circle cx="26" cy="18" r="2" fill="#e6bf6a" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#7eb59a" stroke="#2c473a" delayMs={delayMs + 120} sizePct={8} />
    </span>
  );
}

/** Deal with the Devil: a smoking contract is signed and stamped with a red
 * sigil; the pawn is crowned in brimstone (and the devil collects). */
function DevilDealBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[26%] top-[18%] block h-[48%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <rect x="10" y="8" width="20" height="24" rx="1" fill="#f2e7c8" stroke="#7a2f28" strokeWidth="1.2" />
          <path d="M20 12 L22 17 L27 17 L23 20 L24.5 25 L20 22 L15.5 25 L17 20 L13 17 L18 17 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="0.7" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute left-[44%] top-[10%] block h-[24%] w-[20%] rounded-full" style={{ background: "rgba(90,70,80,0.5)", animationDelay: `${delayMs + 140}ms` }} />
      {lead && <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(194,82,72,0.55)", animationDelay: `${delayMs + 120}ms` }} />}
    </span>
  );
}

/** Berserk Pawn: a pawn flies into a red frenzy, a snarl of rage streaks flaring
 * around it (before it burns out). */
function BerserkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[16%] top-[16%] block h-[58%] w-[58%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#e0776b" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M6 10 L30 20 M4 22 L26 30 M12 6 L28 26" /></g>
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(224,90,82,0.6)", animationDelay: `${delayMs + 60}ms` }} />
      {lead && <ShardBurst vectors={PIN_STARS} fill="#e05252" stroke="#7a2f28" delayMs={delayMs + 120} sizePct={9} />}
    </span>
  );
}

/** Glaciate: one enemy piece is encased solid in a block of blue ice that forms
 * with a shiver and holds. */
function EncaseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 8 L30 6 L34 32 L10 34 Z" fill="rgba(198,234,255,0.5)" stroke="#8aa0b4" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12 10 L20 30 M26 9 L18 33" stroke="rgba(244,250,255,0.8)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#dbe7f2" stroke="#8aa0b4" delayMs={delayMs + 120} sizePct={7} />
    </span>
  );
}

/** Snowball: a snowball is hurled in from the corner and splats over the pawn in
 * a glaze of frost. */
function SnowballBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span className="fx-sig-streak absolute left-[-6%] top-[-8%] block h-[54%] w-[54%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="30" cy="30" r="7" fill="#f4faff" stroke="#8aa0b4" strokeWidth="1.2" />
            <path d="M2 2 L22 22" stroke="rgba(198,234,255,0.7)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className="fx-sig-frost absolute inset-x-[16%] top-[38%] block h-[24%] rounded-full" style={{ background: "rgba(244,250,255,0.7)", animationDelay: `${delayMs + 200}ms`, transformOrigin: "50% 50%" }} />
      <ShardBurst vectors={BURST_MED} fill="#f4faff" stroke="#8aa0b4" delayMs={delayMs + 220} sizePct={8} />
    </span>
  );
}

/** Gale: a driving wind opens gaps; a bishop shimmers and phases as the gust
 * sweeps through. */
function GalePhaseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[4%] top-[36%] block h-[26%] rounded-full" style={{ background: "rgba(158,206,178,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-afterimage absolute left-[30%] top-[16%] block h-[52%] w-[40%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 6 C26 12 28 20 28 26 C28 31 24 34 20 34 C16 34 12 31 12 26 C12 20 14 12 20 6 Z" fill="rgba(126,181,154,0.4)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wave absolute inset-x-[10%] top-[54%] block h-[16%] rounded-full" style={{ background: "rgba(158,206,178,0.4)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

/** Opposite Day: everything runs backwards. Two arrows counter-rotate as the
 * enemy is forbidden to close on your king. */
function OppositeDayBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 14 A13 13 0 0 1 32 14" fill="none" stroke="#e0776b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 14 L6 8 L13 10 Z" fill="#e0776b" />
          <path d="M32 26 A13 13 0 0 1 8 26" fill="none" stroke="#7eb59a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M32 26 L34 32 L27 30 Z" fill="#7eb59a" />
        </svg>
      </span>
    </span>
  );
}

// --- 10j. Batch 10 visuals (board-wide virus + gambling wheels + a livelier
// brainrot drum-man + a slapstick funny batch) -------------------------------
// Same rules as every signature: flat SVG fills / solid discs (no gradients /
// glow / box-shadow / blur), 1px corners, coral / mint / sun / gold, transform +
// opacity only, one-shot, hidden entirely under reduced motion. Most compose the
// shared fx-sig-* classes; the genuinely new motions (codefall / sweepbar /
// wheelspin / tick / reel / coinflip / punch, plus the hop / wiggle / chomp
// personality loops) live in effects.css.

// COMPUTER VIRUS: a spreading digital corruption over the WHOLE board. The lead
// paints an oversized layer (clipped by the board crop, like the dragon / wizard
// marquee leads) with cascading green code columns, sweeping glitch bars, and a
// corruption flash; every target square gets a compact code / glitch hit.
const VIRUS_COLS = [
  { left: "2%", d: 0 }, { left: "9%", d: 150 }, { left: "16%", d: 70 },
  { left: "23%", d: 240 }, { left: "30%", d: 30 }, { left: "37%", d: 180 },
  { left: "44%", d: 100 }, { left: "51%", d: 300 }, { left: "58%", d: 50 },
  { left: "65%", d: 210 }, { left: "72%", d: 130 }, { left: "79%", d: 20 },
  { left: "86%", d: 260 }, { left: "93%", d: 90 },
];
const VIRUS_BARS = [
  { top: "12%", d: 0, c: "rgba(126,181,154,0.55)" },
  { top: "30%", d: 160, c: "rgba(224,119,107,0.5)" },
  { top: "48%", d: 60, c: "rgba(126,181,154,0.5)" },
  { top: "64%", d: 220, c: "rgba(230,191,106,0.45)" },
  { top: "82%", d: 120, c: "rgba(224,119,107,0.45)" },
];
function CodeColumn() {
  return (
    <svg viewBox="0 0 10 64" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <g fill="#7eb59a">
        <rect x="2" y="1" width="6" height="2.4" opacity="0.3" />
        <rect x="1" y="7" width="7" height="2.4" opacity="0.45" />
        <rect x="3" y="13" width="5" height="2.4" opacity="0.35" />
        <rect x="1" y="19" width="6" height="2.4" opacity="0.5" />
        <rect x="2" y="25" width="7" height="2.4" opacity="0.4" />
        <rect x="1" y="31" width="5" height="2.4" opacity="0.55" />
        <rect x="3" y="37" width="6" height="2.4" opacity="0.6" />
        <rect x="1" y="43" width="7" height="2.4" opacity="0.7" />
        <rect x="2" y="49" width="6" height="2.4" opacity="0.85" />
      </g>
      <rect x="1" y="55" width="8" height="4" fill="#cfe8d8" />
    </svg>
  );
}
function VirusSpreadBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <span className="absolute left-[-750%] top-[-750%] block h-[1600%] w-[1600%]">
          <span className="fx-sig-glitch absolute inset-0 block" style={{ background: "rgba(126,181,154,0.12)", animationDelay: `${delayMs}ms` }} />
          {VIRUS_COLS.map((c, i) => (
            <span key={i} className="fx-sig-codefall absolute top-[-28%] block h-[64%] w-[2.4%]" style={{ left: c.left, animationDelay: `${delayMs + c.d}ms` }}>
              <CodeColumn />
            </span>
          ))}
          {VIRUS_BARS.map((b, i) => (
            <span key={`b${i}`} className="fx-sig-sweepbar absolute left-[-30%] block h-[2.6%] w-[160%] rounded-[1px]" style={{ top: b.top, background: b.c, animationDelay: `${delayMs + b.d}ms` }} />
          ))}
          <span className="fx-sig-flash absolute inset-[42%] block rounded-[1px]" style={{ background: "rgba(224,119,107,0.4)", animationDelay: `${delayMs + 120}ms` }} />
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-codefall absolute left-[38%] top-[-10%] block h-[70%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>
        <CodeColumn />
      </span>
      <span className="fx-sig-glitch absolute left-[10%] top-[42%] block h-[10%] w-[80%] rounded-[1px]" style={{ background: "rgba(224,119,107,0.7)", animationDelay: `${delayMs + 40}ms` }} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-[1px]" style={{ background: "rgba(126,181,154,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

// GAMBLING: a spinning segmented wheel (Wheel of Fortune), a slot machine
// (Jackpot), and a coin flip (Gamble). Roulette keeps its own wheel.
const WHEEL_WEDGES = [
  { d: "M20 20 L20 2 A18 18 0 0 1 32.73 7.27 Z", c: "#e0776b" },
  { d: "M20 20 L32.73 7.27 A18 18 0 0 1 38 20 Z", c: "#f4c430" },
  { d: "M20 20 L38 20 A18 18 0 0 1 32.73 32.73 Z", c: "#7eb59a" },
  { d: "M20 20 L32.73 32.73 A18 18 0 0 1 20 38 Z", c: "#e6bf6a" },
  { d: "M20 20 L20 38 A18 18 0 0 1 7.27 32.73 Z", c: "#e0776b" },
  { d: "M20 20 L7.27 32.73 A18 18 0 0 1 2 20 Z", c: "#f4c430" },
  { d: "M20 20 L2 20 A18 18 0 0 1 7.27 7.27 Z", c: "#7eb59a" },
  { d: "M20 20 L7.27 7.27 A18 18 0 0 1 20 2 Z", c: "#e6bf6a" },
];
function SegmentedWheel() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      {WHEEL_WEDGES.map((w, i) => (
        <path key={i} d={w.d} fill={w.c} stroke="#3a2a1a" strokeWidth="0.7" strokeLinejoin="round" />
      ))}
      <circle cx="20" cy="20" r="18" fill="none" stroke="#3a2a1a" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="3" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
    </svg>
  );
}
function FortuneWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-wheelspin absolute inset-[10%] block" style={{ animationDelay: `${delayMs}ms` }}>
          <SegmentedWheel />
        </span>
        <span className="fx-sig-tick absolute left-[44%] top-[2%] block h-[18%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 12 18" className="h-full w-full" aria-hidden="true">
            <path d="M1 1 H11 L6 16 Z" fill="#f4f7f2" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 900} sizePct={9} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wheelspin absolute inset-[22%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <SegmentedWheel />
      </span>
    </span>
  );
}
function SlotSymbol({ variant }: { variant: number }) {
  if (variant % 4 === 0)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <path d="M10 3 C12 6 15 7 15 7 M10 3 C8 6 6 8 6 8" fill="none" stroke="#5f927a" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6" cy="12" r="4" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
        <circle cx="14" cy="13" r="4" fill="#c25248" stroke="#7a2f28" strokeWidth="1" />
      </svg>
    );
  if (variant % 4 === 1)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <path d="M5 4 H15 L9 18 H12" fill="none" stroke="#e0776b" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  if (variant % 4 === 2)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <rect x="3" y="8" width="14" height="5" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
      <path d="M6 14 C6 8 8 5 10 5 C12 5 14 8 14 14 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="10" cy="16" r="1.4" fill="#7a5b23" />
    </svg>
  );
}
function SlotReel({ delayMs, start }: { delayMs: number; start: number }) {
  return (
    <span className="absolute inset-0 block overflow-hidden">
      <span className="fx-sig-reel absolute left-0 top-0 block w-full" style={{ height: "400%", animationDelay: `${delayMs}ms` }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className="block h-[20%] w-full p-[8%]">
            <SlotSymbol variant={start + k} />
          </span>
        ))}
      </span>
    </span>
  );
}
function SlotMachineBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-grow absolute inset-[8%] block" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <rect x="4" y="4" width="32" height="32" rx="2" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.4" />
            <rect x="7" y="8" width="26" height="14" rx="1" fill="#141e2b" />
            <rect x="9" y="26" width="22" height="6" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
          </svg>
        </span>
        <span className="absolute left-[20%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs} start={1} /></span>
        <span className="absolute left-[41%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs + 140} start={0} /></span>
        <span className="absolute left-[62%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs + 280} start={1} /></span>
        <span className="fx-sig-snooze absolute right-[4%] top-[20%] block h-[26%] w-[10%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 8 26" className="h-full w-full" aria-hidden="true">
            <path d="M4 26 V6" stroke="#8aa0b4" strokeWidth="2" strokeLinecap="round" />
            <circle cx="4" cy="4" r="3" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
          </svg>
        </span>
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 620} sizePct={9} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[30%] top-[24%] block h-[42%] w-[40%]">
        <span className="absolute inset-0 block rounded-[1px]" style={{ border: "1.5px solid #7a5b23", background: "#141e2b" }} />
        <span className="absolute inset-[10%] block"><SlotReel delayMs={delayMs} start={1} /></span>
      </span>
    </span>
  );
}
function GambleCoin() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f4c430" stroke="#8a6414" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#c79a2a" strokeWidth="0.8" />
      <path d="M12 6 C15 9 16 12 12 17 C8 12 9 9 12 6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M12 15 L12 19 M9.5 19 H14.5" stroke="#7a2f28" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function CoinFlipBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const size = lead ? "58%" : "40%";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-coinflip absolute left-1/2 bottom-[14%] block" style={{ height: size, width: size, marginLeft: lead ? "-29%" : "-20%", animationDelay: `${delayMs}ms` }}>
        <GambleCoin />
      </span>
      {lead && <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 820} sizePct={8} />}
    </span>
  );
}

// BRAINROT: the drum-man (tung_tung_sahur) finally gets his own signature: he
// marches in bobbing (lead), then a drumstick bonks each nearest enemy.
function DrumMan() {
  return (
    <svg viewBox="0 0 34 34" className="h-full w-full" aria-hidden="true">
      <rect x="6" y="14" width="22" height="16" rx="2" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" />
      <path d="M6 18 H28 M6 26 H28" stroke="#f4f7f2" strokeWidth="1" />
      <path d="M8 14 L12 30 M26 14 L22 30" stroke="#e6bf6a" strokeWidth="1" />
      <circle cx="17" cy="8" r="4" fill="#caa580" stroke="#6b4a34" strokeWidth="1" />
      <path d="M10 11 L2 4 M24 11 L32 4" stroke="#6b4a34" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="2" cy="4" r="1.6" fill="#8a6a4a" />
      <circle cx="32" cy="4" r="1.6" fill="#8a6a4a" />
    </svg>
  );
}
function DrumBonkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the drum-man marches the full width of the board, and three
    // drumbeat shockwaves pulse out across it - tung, tung, tung.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(224,119,107,0.16)" delayMs={delayMs + 220} />
        <span className="fx-sig-cross absolute left-[36%] top-[34%] block h-[30%] w-[26%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-hop block h-full w-full">
            <DrumMan />
          </span>
        </span>
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 180 + i * 240} color="rgba(224,119,107,0.8)" thickness={3} />
        ))}
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[40%] top-[2%] block h-[46%] w-[20%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 28" className="h-full w-full" aria-hidden="true">
          <path d="M6 27 L6 8" stroke="#6b4a34" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="6" cy="6" r="4.5" fill="#8a6a4a" stroke="#4a3320" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[16%] block rounded-full" style={{ border: "2px solid rgba(224,119,107,0.85)", animationDelay: `${delayMs + 300}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}

// SLAPSTICK FUNNY BATCH: a rake, a fly swatter, a nap, super glue, a bear trap,
// an anvil, a boxing glove, bubble wrap, vertigo, origami, gremlins, homesick,
// jet lag, king-of-the-hill, and a sugar rush.
function RakeBonkBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute left-[30%] bottom-[6%] block h-[80%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 40" className="h-full w-full" aria-hidden="true">
          <path d="M10 40 L10 12" stroke="#8a6a4a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M3 12 H17" stroke="#6b4a34" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M4 12 L4 6 M8 12 L8 6 M12 12 L12 6 M16 12 L16 6" stroke="#6b4a34" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.8)", animationDelay: `${delayMs + 260}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={9} />
    </span>
  );
}
function FlySwatBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-star absolute left-1/2 top-1/2 ml-[-8%] mt-[-8%] block h-[16%] w-[16%]" style={{ "--dx": "40%", "--dy": "-30%", "--rot": "40deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}>
        <svg viewBox="0 0 20 16" className="h-full w-full" aria-hidden="true">
          <ellipse cx="10" cy="9" rx="3.4" ry="4.4" fill="#2b2b2f" stroke="#141416" strokeWidth="0.8" />
          <path d="M8 6 C2 2 1 7 6 8 Z M12 6 C18 2 19 7 14 8 Z" fill="rgba(126,181,154,0.55)" stroke="#5f927a" strokeWidth="0.7" />
        </svg>
      </span>
      <span className="fx-sig-snooze absolute left-[26%] top-[2%] block h-[70%] w-[48%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 56" className="h-full w-full" aria-hidden="true">
          <path d="M20 56 L20 26" stroke="#4a5560" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="6" y="4" width="28" height="24" rx="4" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.4" />
          <path d="M12 8 V24 M20 6 V26 M28 8 V24 M8 12 H32 M8 18 H32" stroke="#7a2f28" strokeWidth="0.9" />
        </svg>
      </span>
      <span className="fx-sig-splat absolute inset-x-[30%] top-[52%] block h-[16%] rounded-full" style={{ background: "rgba(74,85,96,0.5)", animationDelay: `${delayMs + 360}ms` }} />
    </span>
  );
}
function SleepCapBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[20%] top-[16%] block h-[52%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 C6 12 20 6 34 10 C30 16 30 22 32 28 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M4 28 H34" stroke="#cfe8d8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="9" r="3" fill="#f4f7f2" stroke="#8aa0b4" strokeWidth="1" />
        </svg>
      </span>
      {[{ l: "56%", t: "10%", d: 0 }, { l: "66%", t: "2%", d: 220 }].map((z, i) => (
        <span key={i} className="fx-sig-zzz absolute block h-[22%] w-[22%]" style={{ left: z.l, top: z.t, animationDelay: `${delayMs + z.d}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </span>
  );
}
function SuperGlueBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[52%] top-[-2%] block h-[36%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 24" className="h-full w-full" aria-hidden="true">
          <rect x="3" y="4" width="6" height="16" rx="2" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
          <path d="M5 4 L5 1 H7 L7 4 Z" fill="#4a5560" />
        </svg>
      </span>
      <span className="fx-sig-grow absolute left-[24%] top-[28%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 18 C8 10 16 8 20 10 C24 6 34 10 32 18 C36 22 34 32 26 32 C22 38 12 36 12 30 C6 28 4 20 8 18 Z" fill="rgba(126,181,154,0.6)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M14 20 C16 22 16 26 14 28 M26 20 C24 24 26 28 28 30" stroke="rgba(244,250,242,0.7)" strokeWidth="1" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      {[{ l: "30%", d: 220 }, { l: "60%", d: 320 }].map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-[60%] block h-[24%] w-[8%]" style={{ left: s.l, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 8 24" className="h-full w-full" aria-hidden="true">
            <path d="M4 0 C1 10 1 16 4 20 C7 16 7 10 4 0 Z" fill="rgba(126,181,154,0.6)" stroke="#5f927a" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[32%] block rounded-full" style={{ background: "rgba(126,181,154,0.4)", animationDelay: `${delayMs + 180}ms` }} />}
    </span>
  );
}
function BearTrapBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[16%] top-[24%] block h-[52%] w-[68%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 30" className="h-full w-full" aria-hidden="true">
          <ellipse cx="24" cy="24" rx="18" ry="5" fill="#5b6672" stroke="#2f3640" strokeWidth="1.2" />
          <path d="M8 24 C10 8 20 6 24 6 C28 6 38 8 40 24" fill="none" stroke="#8aa0b4" strokeWidth="2.2" />
          <path d="M8 24 L11 18 L14 24 L17 18 L20 24 L24 18 L28 24 L31 18 L34 24 L37 18 L40 24 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-star absolute left-[6%] top-[62%] block h-[10%] w-[10%]" style={{ "--dx": "-120%", "--dy": "40%", "--rot": "20deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}>
        <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" stroke="#5b6672" strokeWidth="1.6" /></svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#4a5560" delayMs={delayMs + 180} sizePct={8} />
    </span>
  );
}
function AcmeAnvil() {
  return (
    <svg viewBox="0 0 32 26" className="h-full w-full" aria-hidden="true">
      <path d="M2 8 H30 L26 14 H14 L12 18 H24 L22 24 H8 L10 14 H4 Z" fill="#3a4450" stroke="#141e2b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 8 H12 L10 12 H4 Z" fill="#4a5560" />
      <path d="M9 4 H23" stroke="#c25248" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function AnvilDropBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-bombdrop absolute left-[24%] top-[-4%] block h-[54%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
          <AcmeAnvil />
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[24%] top-[6%] block h-[48%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <AcmeAnvil />
      </span>
      <span className="fx-sig-splat absolute inset-x-[20%] top-[58%] block h-[16%] rounded-full" style={{ background: "rgba(20,30,43,0.5)", animationDelay: `${delayMs + 300}ms` }} />
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(140,160,180,0.7)", animationDelay: `${delayMs + 300}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}
function BoxingGloveBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-punch absolute left-[2%] top-[30%] block h-[40%] w-[76%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 24" className="h-full w-full" aria-hidden="true">
          <path d="M2 12 L8 6 L12 18 L18 6 L22 18 L28 8" fill="none" stroke="#8aa0b4" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 4 C40 2 46 8 46 12 C46 16 40 22 28 20 C24 19 24 16 26 15 C22 15 22 9 26 9 C24 8 24 5 28 4 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M30 12 H42" stroke="#7a2f28" strokeWidth="0.9" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}
const WRAP_BUBBLES = [
  { l: "22%", t: "26%", d: 120 }, { l: "44%", t: "20%", d: 260 },
  { l: "62%", t: "30%", d: 60 }, { l: "30%", t: "52%", d: 320 },
  { l: "56%", t: "56%", d: 200 },
];
function BubbleWrapBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ward absolute inset-[14%] block rounded-[2px]" style={{ border: "1.5px solid rgba(126,181,154,0.7)", background: "rgba(126,181,154,0.14)", animationDelay: `${delayMs}ms` }} />
      {WRAP_BUBBLES.map((b, i) => (
        <span key={i} className="fx-sig-flash absolute block h-[14%] w-[14%] rounded-full" style={{ left: b.l, top: b.t, border: "1px solid rgba(126,181,154,0.8)", background: "rgba(207,232,216,0.5)", animationDelay: `${delayMs + b.d}ms` }} />
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(126,181,154,0.7)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}
function VertigoBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 20 C20 14 26 14 26 20 C26 28 16 28 16 20 C16 10 28 10 28 20 C28 32 12 32 12 20 C12 8 30 8 30 20" fill="none" stroke="#e0776b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {PIN_STARS.slice(0, 4).map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-[20%] ml-[-6%] block h-[12%] w-[12%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
            <path d="M6 1 L7.4 4.6 L11 6 L7.4 7.4 L6 11 L4.6 7.4 L1 6 L4.6 4.6 Z" fill="#e6bf6a" stroke="#8a6414" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(224,119,107,0.4)", animationDelay: `${delayMs + 80}ms` }} />}
    </span>
  );
}
function OrigamiBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 26 L24 20 L20 30 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          <path d="M24 20 L34 8 L30 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          <path d="M6 12 L24 20 L10 22 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-l absolute left-[14%] top-[24%] block h-[30%] w-[34%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 24" className="h-full w-full" aria-hidden="true"><path d="M34 20 L2 4 L14 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" /></svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[14%] top-[24%] block h-[30%] w-[34%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 24" className="h-full w-full" aria-hidden="true"><path d="M0 20 L32 4 L20 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" /></svg>
      </span>
    </span>
  );
}
function Gremlin() {
  return (
    <svg viewBox="0 0 18 18" className="h-full w-full" aria-hidden="true">
      <path d="M9 16 C4 16 3 10 5 7 C4 3 7 4 8 6 C8 3 10 3 10 6 C11 4 14 3 13 7 C15 10 14 16 9 16 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="7" cy="9" r="1.2" fill="#141e2b" />
      <circle cx="11" cy="9" r="1.2" fill="#141e2b" />
      <path d="M6.5 12 H11.5" stroke="#2c473a" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
const GREMLIN_POS = [
  { dx: "-230%", dy: "-120%", rot: "-30deg", delay: 0 },
  { dx: "220%", dy: "-150%", rot: "30deg", delay: 90 },
  { dx: "-190%", dy: "150%", rot: "-20deg", delay: 160 },
  { dx: "240%", dy: "120%", rot: "24deg", delay: 60 },
];
function GremlinsBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {GREMLIN_POS.map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-1/2 ml-[-11%] mt-[-11%] block h-[22%] w-[22%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <span className="fx-sig-hop block h-full w-full"><Gremlin /></span>
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(126,181,154,0.4)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}
function HomesickBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[26%] top-[24%] block h-[50%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 20 L20 8 L34 20 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="10" y="20" width="20" height="14" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1.2" />
          <rect x="17" y="26" width="6" height="8" fill="#7a2f28" />
        </svg>
      </span>
      <span className="fx-sig-crownfall absolute left-[46%] top-[6%] block h-[22%] w-[20%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M10 18 C2 12 3 4 8 5 C9.5 5.4 10 7 10 7 C10 7 10.5 5.4 12 5 C17 4 18 12 10 18 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
function JetLagBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-streak absolute left-[-6%] top-[2%] block h-[46%] w-[56%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 24" className="h-full w-full" aria-hidden="true">
            <path d="M2 14 L26 10 L38 6 L30 14 L38 15 L24 16 L14 22 L16 15 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="fx-sig-grow absolute left-[30%] bottom-[10%] block h-[44%] w-[40%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden="true">
            <rect x="6" y="10" width="18" height="16" rx="2" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.2" />
            <path d="M12 10 V6 H18 V10" fill="none" stroke="#3a1512" strokeWidth="1.4" />
            <path d="M15 12 V24 M9 18 H21" stroke="#e6bf6a" strokeWidth="1" />
          </svg>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[28%] top-[22%] block h-[42%] w-[42%]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="#f4f7f2" stroke="#8a6414" strokeWidth="2" />
          <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
            <path d="M20 20 L20 9" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 20 L27 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[54%] top-[12%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
function HillFlagBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[10%] bottom-[6%] block h-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 20 C10 6 30 6 40 20 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-brick absolute left-[46%] bottom-[24%] block h-[54%] w-[8%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 6 40" className="h-full w-full" aria-hidden="true"><path d="M3 40 V2" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
      <span className="fx-sig-wave absolute left-[50%] top-[14%] block h-[20%] w-[26%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 26 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 1 H24 L20 8 L24 15 H0 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {lead && <span className="fx-sig-flash absolute left-[40%] top-[2%] block h-[18%] w-[20%] rounded-full" style={{ background: "rgba(244,196,64,0.55)", animationDelay: `${delayMs + 200}ms` }} />}
    </span>
  );
}
function SugarRushBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[26%] top-[14%] block h-[54%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <span className="fx-sig-hop block h-full w-full">
          <svg viewBox="0 0 30 40" className="h-full w-full" aria-hidden="true">
            <path d="M15 40 V16" stroke="#f4f7f2" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="15" cy="12" r="10" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" />
            <path d="M15 12 C15 8 19 8 19 12 C19 17 11 17 11 12 C11 6 23 6 23 12" fill="none" stroke="#f4f7f2" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </span>
      {lead && (
        <span className="fx-sig-zzz absolute left-[56%] top-[8%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 520}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <ShardBurst vectors={PIN_STARS} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 60} sizePct={8} />
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
    // --- Batch 6 (marquee dragon + wizard) ---
    case "dragonlord":
      return <DragonLordBurst lead={lead} delayMs={delayMs} />;
    case "archmage":
      return <ArchmageBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 7 (marquee sea / monster + top-tier boardwide) ---
    case "kraken":
      return <KrakenBurst lead={lead} delayMs={delayMs} />;
    case "abyss":
      return <AbyssBurst lead={lead} delayMs={delayMs} />;
    case "whirlpool":
      return <WhirlpoolBurst delayMs={delayMs} />;
    case "flood":
      return <FloodBurst delayMs={delayMs} />;
    case "frozenmoat":
      return <FrozenMoatBurst lead={lead} delayMs={delayMs} />;
    case "meteorstorm":
      return <MeteorStormBurst lead={lead} delayMs={delayMs} />;
    case "phoenixrise":
      return <PhoenixRiseBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 8 (flavor pass) ---
    case "detonate":
      return <DetonateBurst lead={lead} delayMs={delayMs} />;
    case "cinderstrike":
      return <CinderStrikeBurst delayMs={delayMs} />;
    case "purgestorm":
      return <PurgeStormBurst delayMs={delayMs} />;
    case "roulette":
      return <RouletteBurst lead={lead} delayMs={delayMs} />;
    case "purgeline":
      return <PurgeLineBurst delayMs={delayMs} />;
    case "calldown":
      return <CalldownBurst lead={lead} delayMs={delayMs} />;
    case "annihilation":
      return <AnnihilationBurst lead={lead} delayMs={delayMs} />;
    case "meteorcross":
      return <MeteorCrossBurst lead={lead} delayMs={delayMs} />;
    case "purgerealm":
      return <PurgeRealmBurst delayMs={delayMs} />;
    case "ruin":
      return <RuinBurst lead={lead} delayMs={delayMs} />;
    case "bannerwar":
      return <BannerWarBurst lead={lead} delayMs={delayMs} />;
    case "iceage":
      return <IceAgeBurst lead={lead} delayMs={delayMs} />;
    case "worldend":
      return <WorldEndBurst lead={lead} delayMs={delayMs} />;
    case "rustlock":
      return <RustLockBurst delayMs={delayMs} />;
    case "masspetrify":
      return <MassPetrifyBurst delayMs={delayMs} />;
    case "walnutcurse":
      return <WalnutCurseBurst lead={lead} delayMs={delayMs} />;
    case "amazoncrown":
      return <AmazonCrownBurst lead={lead} delayMs={delayMs} />;
    case "titanlegion":
      return <TitanLegionBurst lead={lead} delayMs={delayMs} />;
    case "livinggod":
      return <LivingGodBurst lead={lead} delayMs={delayMs} />;
    case "eternalreign":
      return <EternalReignBurst lead={lead} delayMs={delayMs} />;
    case "godslayer":
      return <GodslayerBurst lead={lead} delayMs={delayMs} />;
    case "onslaught":
      return <OnslaughtBurst lead={lead} delayMs={delayMs} />;
    case "resurrection":
      return <ResurrectionBurst lead={lead} delayMs={delayMs} />;
    case "grandrevive":
      return <GrandReviveBurst lead={lead} delayMs={delayMs} />;
    case "ironlegion":
      return <IronLegionBurst delayMs={delayMs} />;
    case "secondcoming":
      return <SecondComingBurst lead={lead} delayMs={delayMs} />;
    case "lavafloor":
      return <LavaFloorBurst delayMs={delayMs} />;
    case "necromancer":
      return <NecromancerBurst lead={lead} delayMs={delayMs} />;
    case "werewolf":
      return <WerewolfBurst lead={lead} delayMs={delayMs} />;
    case "lastmeal":
      return <LastMealBurst delayMs={delayMs} />;
    // --- Batch 9 (thematic character-matched signatures) ---
    case "crocbomber":
      return <CrocBomberBurst lead={lead} delayMs={delayMs} />;
    case "sharkdash":
      return <SharkDashBurst lead={lead} delayMs={delayMs} />;
    case "goosebomb":
      return <GooseBombBurst lead={lead} delayMs={delayMs} />;
    case "clockelephant":
      return <ClockElephantBurst lead={lead} delayMs={delayMs} />;
    case "coldsnap":
      return <ColdSnapBurst lead={lead} delayMs={delayMs} />;
    case "bananape":
      return <BananApeBurst lead={lead} delayMs={delayMs} />;
    case "tirefrog":
      return <TireFrogBurst lead={lead} delayMs={delayMs} />;
    case "oblivionwipe":
      return <OblivionBurst lead={lead} delayMs={delayMs} />;
    case "bloodpact":
      return <BloodPactBurst lead={lead} delayMs={delayMs} />;
    case "regicideblade":
      return <RegicideBurst lead={lead} delayMs={delayMs} />;
    case "divineright":
      return <DivineRightBurst lead={lead} delayMs={delayMs} />;
    case "ascendancy":
      return <AscendancyBurst lead={lead} delayMs={delayMs} />;
    case "mandate":
      return <MandateBurst lead={lead} delayMs={delayMs} />;
    case "blackout":
      return <BlackoutBurst lead={lead} delayMs={delayMs} />;
    case "griffoncarry":
      return <GriffonCarryBurst delayMs={delayMs} />;
    case "grandarmy":
      return <GrandArmyBurst lead={lead} delayMs={delayMs} />;
    case "mortgagesign":
      return <MortgageBurst delayMs={delayMs} />;
    case "reporook":
      return <RepoRookBurst delayMs={delayMs} />;
    case "musicalchairs":
      return <MusicalChairsBurst delayMs={delayMs} />;
    case "devildeal":
      return <DevilDealBurst lead={lead} delayMs={delayMs} />;
    case "berserkrage":
      return <BerserkBurst lead={lead} delayMs={delayMs} />;
    case "encase":
      return <EncaseBurst delayMs={delayMs} />;
    case "snowballsplat":
      return <SnowballBurst lead={lead} delayMs={delayMs} />;
    case "galephase":
      return <GalePhaseBurst delayMs={delayMs} />;
    case "oppositeday":
      return <OppositeDayBurst delayMs={delayMs} />;
    // --- Batch 10 (board-wide virus + gambling wheels + drum-man + funnies) ---
    case "virusspread":
      return <VirusSpreadBurst lead={lead} delayMs={delayMs} />;
    case "fortunewheel":
      return <FortuneWheelBurst lead={lead} delayMs={delayMs} />;
    case "slotmachine":
      return <SlotMachineBurst lead={lead} delayMs={delayMs} />;
    case "coinflip":
      return <CoinFlipBurst lead={lead} delayMs={delayMs} />;
    case "drumbonk":
      return <DrumBonkBurst lead={lead} delayMs={delayMs} />;
    case "rakebonk":
      return <RakeBonkBurst delayMs={delayMs} />;
    case "flyswat":
      return <FlySwatBurst delayMs={delayMs} />;
    case "sleepcap":
      return <SleepCapBurst delayMs={delayMs} />;
    case "superglue":
      return <SuperGlueBurst lead={lead} delayMs={delayMs} />;
    case "beartrap":
      return <BearTrapBurst delayMs={delayMs} />;
    case "anvildrop":
      return <AnvilDropBurst lead={lead} delayMs={delayMs} />;
    case "boxingglove":
      return <BoxingGloveBurst delayMs={delayMs} />;
    case "bubblewrap":
      return <BubbleWrapBurst lead={lead} delayMs={delayMs} />;
    case "vertigo":
      return <VertigoBurst lead={lead} delayMs={delayMs} />;
    case "origami":
      return <OrigamiBurst delayMs={delayMs} />;
    case "gremlins":
      return <GremlinsBurst delayMs={delayMs} />;
    case "homesick":
      return <HomesickBurst delayMs={delayMs} />;
    case "jetlag":
      return <JetLagBurst lead={lead} delayMs={delayMs} />;
    case "hillflag":
      return <HillFlagBurst lead={lead} delayMs={delayMs} />;
    case "sugarrush":
      return <SugarRushBurst lead={lead} delayMs={delayMs} />;
    default:
      return null;
  }
}
