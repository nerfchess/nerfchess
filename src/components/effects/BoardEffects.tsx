"use client";

// Board effect overlays: one component per card-effect family, mounted only
// on affected squares by Board.tsx. All SVG inline (no emoji), all animation
// transform/opacity-only, defined in effects.css. Persistent overlays render
// a static end state under prefers-reduced-motion; one-shot flourishes hide.

import React from "react";
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
