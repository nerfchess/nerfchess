// Curse-wave plugin signatures — flagships for the hex expansion batch
// (src/engine/buffs/hexes/wave2.ts). Same registry contract as the other
// plugin modules (see sigPlugins.tsx): self-contained render art, own CSS
// (cursePlays.css), transform/opacity only, no imports from
// BoardEffects.tsx. Every entry must be a bespoke scene or a template +
// per-card flourish with real per-flourish dressing — the animation audit
// (npm run test:animations) fails shared flagships that grow the committed
// baseline.
//
// FIVE TEMPLATES, each parameterised by { palette, glyph } and dressed by a
// per-card flourish key:
//   HexBrand     — a smoking witch-seal slams flat onto the board and sears
//                  a scorch ring outward (marks, contracts, tallies)
//   OmenBell     — a spectral bell descends and rocks; toll ripples wash out
//                  from its mouth (countdowns, rhythms, delayed dooms)
//   BlightGarden — rot spreads tile by tile from a struck point while weeds
//                  sprout from the seams (cursed and remembering ground)
//   ChainWeb     — spectral chains whip across the board and cinch to a
//                  shackle ring (binds, compulsions, ransoms)
//   MidasVeil    — a gilded veil sweeps the ranks and figures gild one by
//                  one where it passes (transferring / accumulating marks)
// plus SIX fully bespoke scenes for the tier 7–8 flagships (Death Knell,
// The Hollow Crown, Tide of Ash, Crown of Thorns, Pauper's Crown, Beacon of
// Woe). The CARD -> TEMPLATE / PALETTE / GLYPH table is the PLAYS registry
// at the bottom of this file.

import "./cursePlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  delayMs: number;
  /** Per-card structural flourish key: every card using a shared template
   * carries one, and every key has a dedicated dressing block below. */
  flourish?: string;
}

/** hex "#rrggbb" -> rgba() at the given alpha (glow fills, gradients). */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The oversized-clipped board-wide stage (the overlay mounts inside ONE
 * square; this canvas is ~14 squares wide — the board is the central ~57%). */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** Full-board curse-light wash. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="cwp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />;
}

/** Tell: stray curse-light gathering onto the point the working will claim. */
function Tell({ color, delayMs, left = 40, top = 36 }: { color: string; delayMs: number; left?: number; top?: number }) {
  return (
    <>
      <span
        className="cwp-tellglow absolute block rounded-full"
        style={{ left: `${left}%`, top: `${top}%`, width: "20%", height: "18%", background: color, animationDelay: `${delayMs}ms` }}
      />
      {[
        { dx: "160%", dy: "-40%" },
        { dx: "-150%", dy: "60%" },
        { dx: "40%", dy: "150%" },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-tellray absolute block"
          style={
            {
              left: `${left + 8}%`,
              top: `${top + 7}%`,
              width: "7%",
              height: "0.7%",
              background: color,
              "--dx": v.dx,
              "--dy": v.dy,
              animationDelay: `${delayMs + i * 30}ms`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

/** Soft round settle fleck. */
function Mote({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="3.4" fill={color} />
    </svg>
  );
}

/** Two settle flecks sifting off the scene as it decays. */
function SettlePair({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <>
      {[
        { l: 40, t: 44, dx: "-60%", dy: "120%", rot: "-110deg", d: 0 },
        { l: 57, t: 40, dx: "70%", dy: "140%", rot: "120deg", d: 90 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "1.6%",
              height: "1.6%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={color} />
        </span>
      ))}
    </>
  );
}

/** Tiny flat chessman silhouettes — the supporting actors of the flourishes. */
const CHESSMAN = {
  p: "M5 1.2 C6.2 1.2 7 2 7 3 C7 3.7 6.6 4.3 6 4.6 L7 8 H3 L4 4.6 C3.4 4.3 3 3.7 3 3 C3 2 3.8 1.2 5 1.2 Z M2.4 8.6 H7.6 V9.6 H2.4 Z",
  r: "M2.6 1.4 H3.8 V2.6 H4.6 V1.4 H5.4 V2.6 H6.2 V1.4 H7.4 V3.8 H6.8 L7.2 7.6 H2.8 L3.2 3.8 H2.6 Z M2.2 8.4 H7.8 V9.6 H2.2 Z",
  n: "M2.8 8.2 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 L7.2 2.4 C7.9 3 8.1 4 7.7 4.9 L6.6 4.6 L6.2 4 C6.5 5.6 6.4 7 7 8.2 Z M2.4 8.8 H7.6 V9.8 H2.4 Z",
  b: "M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3.4 3.6 2 5 1 Z M3.4 7.2 H6.6 L7.2 8.2 H2.8 Z M2.2 8.8 H7.8 V9.8 H2.2 Z",
  q: "M2.4 3.2 L3.4 5 L4.2 2.6 L5 4.6 L5.8 2.6 L6.6 5 L7.6 3.2 L7 7.4 H3 Z M2.6 8 H7.4 V9.2 H2.6 Z",
  k: "M4.6 1 H5.4 V2 H6.4 V2.8 H5.4 V3.8 H4.6 V2.8 H3.6 V2 H4.6 Z M3.4 4.4 H6.6 L7.2 8 H2.8 Z M2.4 8.6 H7.6 V9.8 H2.4 Z",
} as const;
function Man({ kind, fill, stroke }: { kind: keyof typeof CHESSMAN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={CHESSMAN[kind]} fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ} />
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders: a curse-rune flash,
 * the card's glyph, a closing ring and two flecks. Zone-fed cards mount one
 * overlay per affected square, so this must NOT be board-wide. */
function CurseHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="cwp-tellglow absolute block rounded-full"
        style={{ left: "22%", top: "22%", width: "56%", height: "56%", background: tint(p1, 0.4), animationDelay: `${delayMs}ms` }}
      />
      <span
        className="cwp-tflash absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.45), animationDelay: `${delayMs + 140}ms` }}
      />
      <span className="cwp-pop absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%", animationDelay: `${delayMs + 200}ms` }}>
        {glyph}
      </span>
      <span
        className="cwp-tring absolute block rounded-full"
        style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 260}ms` }}
      />
      {[
        { l: 36, t: 40, dx: "-60%", dy: "120%", rot: "-100deg", d: 0 },
        { l: 58, t: 36, dx: "60%", dy: "140%", rot: "120deg", d: 80 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "12%",
              height: "12%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 520 + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={tint(p2, 0.8)} />
        </span>
      ))}
    </span>
  );
}

/* =============================================================================
   Template 1: HexBrand — a smoking witch-seal slams down flat over the board
   and SEARS: the scorch ring (the template's signature beat) runs outward
   from the wax while the card's glyph burns in the seal's heart.
   Flourishes: veto, longroad, bloodprice, tarnish, rations, stacked.
   ========================================================================== */
function HexBrand({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} />
      {/* the seal, stamped down like hot wax */}
      <span className="cwp-stamp absolute block" style={{ left: "31%", top: "27%", width: "38%", height: "38%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16.5" fill={tint(p0, 0.55)} stroke={tint(p1, 0.9)} strokeWidth="1.4" />
          <circle cx="20" cy="20" r="12.6" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="2.4 1.7" />
          {/* wax drips at the rim */}
          <path d="M6 24 C5 26.5 5.6 28 7 28.4 C7.8 26.8 7.4 25.4 6 24 Z" fill={tint(p1, 0.7)} />
          <path d="M33 13 C34.4 14.6 34.4 16.2 33.2 17 C32.2 15.6 32.2 14.4 33 13 Z" fill={tint(p1, 0.7)} />
          {/* rune ticks */}
          <path d="M20 2.4 V4.8 M20 35.2 V37.6 M2.4 20 H4.8 M35.2 20 H37.6 M8 8 L9.6 9.6 M32 8 L30.4 9.6 M8 32 L9.6 30.4 M32 32 L30.4 30.4" stroke={tint(p2, 0.85)} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
        <span className="cwp-facein absolute block" style={{ left: "33%", top: "33%", width: "34%", height: "34%", animationDelay: `${delayMs + 560}ms` }}>{glyph}</span>
      </span>
      {/* SIGNATURE: the scorch ring searing outward from the brand */}
      <span
        className="cwp-scorch absolute block rounded-full"
        style={{ left: "26%", top: "22%", width: "48%", height: "48%", border: `3px solid ${tint(p1, 0.85)}`, animationDelay: `${delayMs + 620}ms` }}
      />
      {/* smoke curls off the hot wax */}
      {[
        { l: 38, t: 26, dx: "-40%", d: 0 },
        { l: 60, t: 24, dx: "50%", d: 120 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-cinder absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", "--dx": v.dx, animationDelay: `${delayMs + 640 + v.d}ms` } as CSSProperties}
        >
          <Mote color={tint(p2, 0.6)} />
        </span>
      ))}
      {/* bespoke: Witch's Veto — the warded pawn under a raised gauntlet, and
          a striking knight yanked up short of it */}
      {flourish === "veto" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "56%", top: "44%", width: "5%", height: "7.5%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-pop absolute block" style={{ left: "54.4%", top: "37%", width: "8%", height: "6%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 6.2 C1.5 3 8.5 3 8.5 6.2" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M3.4 3.6 V1.2 M4.6 3.3 V0.8 M5.8 3.3 V1 M7 3.8 V1.8" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-snapback absolute block" style={{ left: "36%", top: "45%", width: "5.5%", height: "8%", "--dx": "220%", "--dy": "-8%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
          </span>
        </>
      )}
      {/* bespoke: The Long Road Home — a dotted road home, and the marked
          knight tugged down it in reluctant jerks */}
      {flourish === "longroad" && (
        <>
          <span className="absolute block" style={{ left: "34%", top: "56.5%", width: "32%", height: "0.9%", rotate: "8deg" }}>
            <span
              className="cwp-beam absolute inset-0 block"
              style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.85)} 0 6px, transparent 6px 11px)`, animationDelay: `${delayMs + 560}ms` }}
            />
          </span>
          <span className="cwp-tug absolute block" style={{ left: "36%", top: "48%", width: "5.5%", height: "8%", "--dx": "420%", "--dy": "55%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "64%", top: "58%", width: "3.4%", height: "3.4%", animationDelay: `${delayMs + 1240}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Blood Price — the collector's coin drops onto an open ledger
          and a red droplet marks the debt line */}
      {flourish === "bloodprice" && (
        <>
          <span className="cwp-facein absolute block" style={{ left: "42%", top: "60%", width: "16%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 16 9" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1.6 C4 0.6 6.5 0.8 8 2 C9.5 0.8 12 0.6 15 1.6 V7.4 C12 6.6 9.5 6.8 8 7.8 C6.5 6.8 4 6.6 1 7.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
              <path d="M2.6 3.2 H6.4 M2.6 4.6 H6.4 M9.6 3.2 H13.4 M9.6 4.6 H13.4" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-settle absolute block" style={{ left: "48.6%", top: "48%", width: "2.8%", height: "2.8%", "--dx": "8%", "--dy": "380%", "--rot": "260deg", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.7" />
              <path d="M5 2.6 V7.4 M3.4 4 H6.6" stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "52%", top: "62.5%", width: "2.2%", height: "2.6%", animationDelay: `${delayMs + 1120}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Tarnished Crown — a fresh crown blackens: tarnish drips run
          down it while rust flecks sift off */}
      {flourish === "tarnish" && (
        <>
          <span className="cwp-pop absolute block" style={{ left: "45%", top: "16%", width: "10%", height: "7.5%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
              <path d="M3 6.6 C3 5 2.6 4.2 2.2 3.6 M6 6.6 C6 4.8 5.8 3.4 6 2.2 M9 6.6 C9 5.2 9.2 4.4 9.6 3.6" stroke={tint(p2, 0.85)} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 46, t: 24, d: 0 },
            { l: 52, t: 25, d: 140 },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-settle absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": "20%", "--dy": "220%", "--rot": "80deg", animationDelay: `${delayMs + 760 + v.d}ms` } as CSSProperties}
            >
              <Mote color="#8a5a3a" />
            </span>
          ))}
        </>
      )}
      {/* bespoke: War Rations — two requisition chits are stamped out; the
          third is struck through, refused */}
      {flourish === "rations" && (
        <>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-pop absolute block" style={{ left: `${37 + i * 10}%`, top: "62%", width: "8%", height: "5.5%", animationDelay: `${delayMs + 620 + i * 150}ms` }}>
              <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.8" width="8.8" height="5.4" rx="0.8" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
                <circle cx="5" cy="3.5" r="1.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" />
                <path d="M4.2 3.5 L4.9 4.2 L6 2.9" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" {...SJ} />
              </svg>
            </span>
          ))}
          <span className="cwp-pop absolute block" style={{ left: "57%", top: "62%", width: "8%", height: "5.5%", animationDelay: `${delayMs + 920}ms` }}>
            <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.8" width="8.8" height="5.4" rx="0.8" fill={tint(p0, 0.7)} stroke="#8a6a3a" strokeWidth="0.4" />
              <path d="M2 1.6 L8 5.4 M8 1.6 L2 5.4" stroke="#c94a5a" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Compounding Misery — the seal answers the board's other
          curses: extra rings stack outward, one pip lighting per ring */}
      {flourish === "stacked" && (
        <>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="cwp-scorch absolute block rounded-full"
              style={{
                left: `${24 - i * 3}%`,
                top: `${20 - i * 3}%`,
                width: `${52 + i * 6}%`,
                height: `${52 + i * 6}%`,
                border: `2px solid ${tint(i % 2 ? p2 : p1, 0.7)}`,
                animationDelay: `${delayMs + 740 + i * 130}ms`,
              }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <span key={`p${i}`} className="cwp-glint absolute block" style={{ left: `${41 + i * 5}%`, top: "70%", width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 780 + i * 130}ms` }}>
              <Mote color={tint(p1, 0.95)} />
            </span>
          ))}
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1150} />
    </Stage>
  );
}

/* =============================================================================
   Template 2: OmenBell — a spectral bell lowers over the board and ROCKS;
   toll ripples (the signature beat) wash out from its mouth while the card's
   glyph glows beneath it.
   Flourishes: omen, halfmeasure, midnight, toil.
   ========================================================================== */
function OmenBell({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={24} />
      {/* the bell, descending on its phantom rope, then rocking */}
      <span className="cwp-drop absolute block" style={{ left: "38%", top: "18%", width: "24%", height: "30%", animationDelay: `${delayMs + 140}ms` }}>
        <span className="cwp-swing absolute inset-0 block" style={{ animationDelay: `${delayMs + 620}ms` }}>
          <svg viewBox="0 0 24 30" className="block h-full w-full" aria-hidden="true">
            <path d="M12 1 V4" stroke={tint(p2, 0.8)} strokeWidth="1" strokeLinecap="round" />
            <path d="M6 22 C6 12 8 6 12 4.6 C16 6 18 12 18 22 Z" fill={tint(p0, 0.75)} stroke={tint(p1, 0.95)} strokeWidth="1.1" {...SJ} />
            <path d="M4.6 22 H19.4 L18.6 24.6 H5.4 Z" fill={tint(p1, 0.85)} stroke={tint(p2, 0.6)} strokeWidth="0.5" {...SJ} />
            <circle cx="12" cy="26.6" r="1.5" fill={tint(p2, 0.9)} />
            {/* the crack every curse-bell carries */}
            <path d="M12.6 10 L11.6 13 L12.8 15.5 L11.8 18.5" fill="none" stroke={tint(p2, 0.75)} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      </span>
      {/* SIGNATURE: toll ripples washing out of the bell mouth */}
      {[0, 1].map((i) => (
        <span
          key={i}
          className="cwp-ring absolute block rounded-full"
          style={{ left: "34%", top: "36%", width: "32%", height: "22%", border: `2.5px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 700 + i * 180}ms` }}
        />
      ))}
      {/* the card's glyph, lit under the bell */}
      <span className="cwp-facein absolute block" style={{ left: "44.5%", top: "52%", width: "11%", height: "11%", animationDelay: `${delayMs + 760}ms` }}>{glyph}</span>
      {/* bespoke: Bad Omen — three crows burst from the belfry */}
      {flourish === "omen" && (
        <>
          {[
            { l: 40, t: 22, dx: "-260%", dy: "-160%", rot: "-30deg", d: 0 },
            { l: 52, t: 20, dx: "240%", dy: "-190%", rot: "24deg", d: 90 },
            { l: 46, t: 24, dx: "60%", dy: "-260%", rot: "8deg", d: 180 },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-spark absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.5%", height: "3%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 680 + v.d}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
                <path d="M1 3 C3 0.6 5 0.6 6 2.6 C7 0.6 9 0.6 11 3 C9 2.4 7.4 2.8 6 4.4 C4.6 2.8 3 2.4 1 3 Z" fill="#1c1c24" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Tolling Bell — the metronome of loud and quiet turns: an
          alternating dark/bright ripple pair and a ticking beat-bar */}
      {flourish === "halfmeasure" && (
        <>
          <span
            className="cwp-ring absolute block rounded-full"
            style={{ left: "30%", top: "33%", width: "40%", height: "28%", border: `2px dashed ${tint(p2, 0.8)}`, animationDelay: `${delayMs + 1020}ms` }}
          />
          <span className="cwp-hand absolute block" style={{ left: "49.4%", top: "62%", width: "1.2%", height: "9%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 3 20" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 19 V2" stroke={tint(p1, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="1.5" cy="2.4" r="1.3" fill={tint(p2, 0.95)} />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${42 + i * 7}%`, top: "72%", width: "2%", height: "2%", animationDelay: `${delayMs + 760 + i * 170}ms` }}>
              <Mote color={i % 2 ? tint(p2, 0.9) : tint(p1, 0.9)} />
            </span>
          ))}
        </>
      )}
      {/* bespoke: The Witching Hour — a moon-pale clock face; its hand sweeps
          up to midnight and a cold glint strikes at XII */}
      {flourish === "midnight" && (
        <>
          <span className="cwp-facein absolute block" style={{ left: "62%", top: "26%", width: "13%", height: "13%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
              <circle cx="10" cy="10" r="8.6" fill={tint(p0, 0.7)} stroke={tint(p1, 0.9)} strokeWidth="0.9" />
              <path d="M10 2.2 V3.8 M10 16.2 V17.8 M2.2 10 H3.8 M16.2 10 H17.8" stroke={tint(p2, 0.85)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-hand absolute block" style={{ left: "68%", top: "28.5%", width: "1%", height: "5%", animationDelay: `${delayMs + 720}ms` }}>
            <svg viewBox="0 0 3 12" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 11 V1.5" stroke={tint(p1, 1)} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "67.2%", top: "23.6%", width: "2.6%", height: "2.6%", animationDelay: `${delayMs + 1260}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Weight of Toil — the overworked rook staggers under a grain
          sack while sweat-glints fly off it */}
      {flourish === "toil" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "63%", top: "56%", width: "6%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-facein absolute block" style={{ left: "62.4%", top: "50%", width: "7.5%", height: "6%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.8 C1 3.4 3 1 5 1 C7 1 9 3.4 8.6 6.8 C6.4 5.8 3.6 5.8 1.4 6.8 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
              <path d="M3.6 3.4 H6.4" stroke="#4a3a22" strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 61, t: 55, dx: "-140%", dy: "-60%", rot: "-40deg" },
            { l: 70, t: 56, dx: "150%", dy: "-70%", rot: "40deg" },
          ].map((v, i) => (
            <span key={i} className="cwp-spark absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 820 + i * 120}ms` } as CSSProperties}>
              <Mote color="#bfe6ff" />
            </span>
          ))}
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1200} />
    </Stage>
  );
}

/* =============================================================================
   Template 3: BlightGarden — rot takes the ground: dark tiles SPREAD one by
   one from the struck point (the signature beat) while weeds sprout from the
   seams and the card's glyph rises at the heart of the patch.
   Flourishes: footprints, creep, gravebloom, stormwall.
   ========================================================================== */
const BLIGHT_TILES = [
  { l: 45, t: 43, d: 0, s: 10 },
  { l: 38, t: 47, d: 130, s: 8.5 },
  { l: 52.5, t: 39, d: 220, s: 8 },
  { l: 47, t: 51.5, d: 310, s: 8.5 },
  { l: 40.5, t: 37, d: 400, s: 7 },
];
function BlightGarden({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={41} top={41} />
      {/* SIGNATURE: the rot spreading tile to tile */}
      {BLIGHT_TILES.map((v, i) => (
        <span key={i} className="cwp-spreadtile absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s * 0.72}%`, animationDelay: `${delayMs + 260 + v.d}ms` }}>
          <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
            <path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.75)} stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
            <path d="M4.5 5 H6 M7.6 3.4 L8.8 4.4 M6.4 6.6 L8 6" stroke={tint(p2, 0.7)} strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* weeds prying up through the seams */}
      {[
        { l: 42, t: 39, d: 0 },
        { l: 55, t: 43, d: 160 },
        { l: 45, t: 50, d: 320 },
      ].map((v, i) => (
        <span key={`w${i}`} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3.4%", height: "6%", animationDelay: `${delayMs + 620 + v.d}ms` }}>
          <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
            <path d="M3 9.6 C3 6 2 4.6 1 3.4 M3 9.6 C3 5.4 4.2 4 5 2.4 M3 9.6 C3 6.6 3 4 3 1.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <span className="cwp-pop absolute block" style={{ left: "45.5%", top: "41%", width: "9%", height: "9%", animationDelay: `${delayMs + 700}ms` }}>{glyph}</span>
      {/* bespoke: Cold Footprints — a pawn hurries off and its frozen prints
          ice shut one by one behind it */}
      {flourish === "footprints" && (
        <>
          <span className="cwp-flee absolute block" style={{ left: "30%", top: "60%", width: "4.5%", height: "6.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-pop absolute block" style={{ left: `${31 + i * 8}%`, top: "66.5%", width: "3%", height: "2.2%", animationDelay: `${delayMs + 760 + i * 200}ms` }}>
              <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
                <ellipse cx="3" cy="3.6" rx="1.7" ry="2" fill={tint(p2, 0.85)} />
                <ellipse cx="7" cy="2.4" rx="1.7" ry="2" fill={tint(p2, 0.65)} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Creeping Blight — the rot reaches further: an outrider tile
          crawls beyond the patch on a stretching tendril */}
      {flourish === "creep" && (
        <>
          <span className="absolute block" style={{ left: "53%", top: "46%", width: "12%", height: "0.8%", rotate: "18deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p1, 0.9)}, ${tint(p2, 0.4)})`, animationDelay: `${delayMs + 820}ms` }} />
          </span>
          <span className="cwp-spreadtile absolute block" style={{ left: "62%", top: "48%", width: "7.5%", height: "5.4%", animationDelay: `${delayMs + 1020}ms` }}>
            <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
              <path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.8)} stroke={tint(p1, 0.9)} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
          <span className="cwp-sprout absolute block" style={{ left: "64.6%", top: "43%", width: "2.6%", height: "5%", animationDelay: `${delayMs + 1180}ms` }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3 9.6 C3 5.4 4.2 4 5 2.4 M3 9.6 C3 6.6 2.2 4.6 1.4 3.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Gravebloom — a burial mound rises off-patch and two long-
          memoried flowers open over it */}
      {flourish === "gravebloom" && (
        <>
          <span className="cwp-rise absolute block" style={{ left: "58%", top: "56%", width: "12%", height: "8%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 9.4 C1 4.6 4 2 8 2 C12 2 15 4.6 15 9.4 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
              <path d="M8 5.8 V3 M6.8 4 H9.2" stroke={tint(p2, 0.85)} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 59.5, t: 51, d: 0 },
            { l: 65, t: 52, d: 180 },
          ].map((v, i) => (
            <span key={i} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "6.5%", animationDelay: `${delayMs + 860 + v.d}ms` }}>
              <svg viewBox="0 0 6 12" className="block h-full w-full" aria-hidden="true">
                <path d="M3 11.4 V4.6" stroke={tint(p1, 0.85)} strokeWidth="0.6" strokeLinecap="round" />
                <circle cx="3" cy="3" r="1.9" fill="#c94a5a" stroke={tint(p2, 0.8)} strokeWidth="0.4" />
                <circle cx="3" cy="3" r="0.6" fill="#ffd76a" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Gathering Storm — three storm bands sweep in above the rot,
          each darker than the last, with one lightning glint at the crest */}
      {flourish === "stormwall" && (
        <>
          {[
            { t: 22, a: 0.35, d: 0, tx: "34%" },
            { t: 27, a: 0.5, d: 170, tx: "28%" },
            { t: 32, a: 0.65, d: 340, tx: "22%" },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-sweep absolute block"
              style={{ left: "20%", top: `${v.t}%`, width: "44%", height: "4.5%", borderRadius: "40%", background: tint(p0, v.a), "--tx": v.tx, animationDelay: `${delayMs + 560 + v.d}ms` } as CSSProperties}
            />
          ))}
          <span className="cwp-glint absolute block" style={{ left: "58%", top: "25%", width: "3.2%", height: "4.5%", animationDelay: `${delayMs + 1080}ms` }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3.6 0.6 L1.4 5 H2.8 L1.8 9.4 L4.8 4.4 H3.2 L4.6 0.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" {...SJ} />
            </svg>
          </span>
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1150} />
    </Stage>
  );
}

/* =============================================================================
   Template 4: ChainWeb — two spectral chains WHIP across the board (the lash
   overshoot is the signature beat) and cinch into a shackle ring holding the
   card's glyph.
   Flourishes: twin, noreins, recoil, ransom, courtlock.
   ========================================================================== */
function ChainWeb({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const chain = (alpha: number) => `repeating-linear-gradient(90deg, ${tint(p1, alpha)} 0 7px, transparent 7px 12px)`;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={42} top={40} />
      {/* SIGNATURE: the two chain lashes, whipped across with overshoot */}
      <span className="absolute block" style={{ left: "22%", top: "38%", width: "56%", height: "1.2%", rotate: "14deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: chain(0.9), animationDelay: `${delayMs + 260}ms` }} />
      </span>
      <span className="absolute block" style={{ left: "24%", top: "58%", width: "54%", height: "1.2%", rotate: "-12deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: chain(0.75), animationDelay: `${delayMs + 400}ms` }} />
      </span>
      {/* the shackle cinching shut where the chains cross */}
      <span className="cwp-pop absolute block" style={{ left: "39%", top: "36%", width: "22%", height: "22%", animationDelay: `${delayMs + 620}ms` }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <circle cx="12" cy="13.4" r="8.6" fill={tint(p0, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="1.6" />
          <path d="M7.6 6.4 C7.6 1.8 16.4 1.8 16.4 6.4" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="13.4" r="5.4" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.5" strokeDasharray="1.8 1.4" />
        </svg>
        <span className="cwp-facein absolute block" style={{ left: "31%", top: "37%", width: "38%", height: "38%", animationDelay: `${delayMs + 780}ms` }}>{glyph}</span>
      </span>
      <span className="cwp-glint absolute block" style={{ left: "48.4%", top: "34%", width: "3.2%", height: "3.2%", animationDelay: `${delayMs + 860}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p2, 0.95)} />
        </svg>
      </span>
      {/* bespoke: Twinned Torment — knight and bishop stitched by one thread;
          the knight jerks and the bishop shudders in sympathy */}
      {flourish === "twin" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "28%", top: "63%", width: "5.5%", height: "8%", "--dx": "90%", "--dy": "-10%", animationDelay: `${delayMs + 720}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "34%", top: "66%", width: "30%", height: "0.7%", rotate: "2deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p2, 0.9)} 0 4px, transparent 4px 7px)`, animationDelay: `${delayMs + 800}ms` }} />
          </span>
          <span className="cwp-hold absolute block" style={{ left: "64%", top: "62.5%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="b" fill={tint(p2, 0.95)} stroke={p1} />
          </span>
        </>
      )}
      {/* bespoke: No Reins — the snapped rein whips loose while the runaway
          rook bolts clean across the field */}
      {flourish === "noreins" && (
        <>
          <span className="absolute block" style={{ left: "30%", top: "24%", width: "18%", height: "0.9%", rotate: "-24deg" }}>
            <span className="cwp-lash absolute inset-0 block" style={{ background: `linear-gradient(90deg, #8a6a3a, ${tint(p1, 0.4)})`, animationDelay: `${delayMs + 620}ms` }} />
          </span>
          <span className="cwp-tug absolute block" style={{ left: "27%", top: "27%", width: "6%", height: "8.5%", "--dx": "560%", "--dy": "0%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${46 + i * 12}%`, top: "31%", width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 900 + i * 150}ms` }}>
              <Mote color={tint(p2, 0.85)} />
            </span>
          ))}
        </>
      )}
      {/* bespoke: Curse of Recoil — the bishop lunges, strikes, and is flung
          straight back to where it started, impact glint left behind */}
      {flourish === "recoil" && (
        <>
          <span className="cwp-snapback absolute block" style={{ left: "30%", top: "64%", width: "5.5%", height: "8%", "--dx": "300%", "--dy": "-6%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "48%", top: "63%", width: "3.6%", height: "3.6%", animationDelay: `${delayMs + 900}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.2 3.8 L9.4 5 L6.2 6.2 L5 9.4 L3.8 6.2 L0.6 5 L3.8 3.8 Z" fill="#ffd76a" />
            </svg>
          </span>
          <span className="cwp-settle absolute block" style={{ left: "50%", top: "66%", width: "1.4%", height: "1.4%", "--dx": "40%", "--dy": "120%", "--rot": "90deg", animationDelay: `${delayMs + 1060}ms` } as CSSProperties}>
            <Mote color={tint(p2, 0.8)} />
          </span>
        </>
      )}
      {/* bespoke: Queen's Ransom — her majesty strides free while two pawns of
          her escort are chained down as surety */}
      {flourish === "ransom" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "44%", top: "62%", width: "6.5%", height: "9.5%", "--dx": "140%", "--dy": "0%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="q" fill={tint(p2, 0.98)} stroke={p1} />
          </span>
          {[
            { l: 30, t: 66 },
            { l: 37, t: 68 },
          ].map((v, i) => (
            <span key={i}>
              <span className="cwp-hold absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.2%", height: "6%", animationDelay: `${delayMs + 760 + i * 120}ms` }}>
                <Man kind="p" fill={tint(p1, 0.9)} stroke={p2} />
              </span>
              <span className="absolute block" style={{ left: `${v.l + 3}%`, top: `${v.t + 5.4}%`, width: "6%", height: "0.6%", rotate: `${i ? -10 : 12}deg` }}>
                <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.85)} 0 4px, transparent 4px 7px)`, animationDelay: `${delayMs + 840 + i * 120}ms` }} />
              </span>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Chains of the Court — the minors are locked under one
          padlock, and the key glints far away at the board's center */}
      {flourish === "courtlock" && (
        <>
          {[
            { k: "n" as const, l: 29, t: 64 },
            { k: "b" as const, l: 36, t: 65 },
          ].map((v, i) => (
            <span key={i} className="cwp-hold absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5%", height: "7%", animationDelay: `${delayMs + 700 + i * 110}ms` }}>
              <Man kind={v.k} fill={tint(p1, 0.9)} stroke={p2} />
            </span>
          ))}
          <span className="cwp-pop absolute block" style={{ left: "31.5%", top: "57%", width: "5.5%", height: "6.5%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M3 5 V3.4 C3 0.8 7 0.8 7 3.4 V5" fill="none" stroke={tint(p2, 0.95)} strokeWidth="0.9" strokeLinecap="round" />
              <rect x="1.8" y="5" width="6.4" height="5.6" rx="1" fill={tint(p0, 0.9)} stroke={tint(p2, 0.95)} strokeWidth="0.7" />
              <circle cx="5" cy="7.6" r="0.9" fill={tint(p2, 0.95)} />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "60%", top: "48%", width: "3.4%", height: "3%", animationDelay: `${delayMs + 1080}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <circle cx="3" cy="4" r="2.2" fill="none" stroke="#ffd76a" strokeWidth="0.9" />
              <path d="M5.2 4 H10.6 M8.6 4 V6 M10.2 4 V5.6" stroke="#ffd76a" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1180} />
    </Stage>
  );
}

/* =============================================================================
   Template 5: MidasVeil — a gilded veil sweeps the ranks; the figures it
   crosses GILD one after another (the signature beat) and the card's glyph
   glows in the veil's wake.
   Flourishes: coin, gilded.
   ========================================================================== */
const VEIL_MEN = [
  { k: "p" as const, l: 34, t: 47, d: 0 },
  { k: "n" as const, l: 44, t: 45, d: 170 },
  { k: "r" as const, l: 54, t: 46, d: 340 },
];
function MidasVeil({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={30} top={42} />
      {/* the veil itself, a soft gold curtain crossing the ranks */}
      <span
        className="cwp-sweep absolute block"
        style={{ left: "24%", top: "38%", width: "18%", height: "24%", borderRadius: "45%", background: `linear-gradient(90deg, transparent, ${tint(p1, 0.55)}, transparent)`, "--tx": "180%", animationDelay: `${delayMs + 240}ms` } as CSSProperties}
      />
      {/* SIGNATURE: the rank gilds figure by figure as the veil passes */}
      {VEIL_MEN.map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 420 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p1, 0.95)} stroke={p0} />
          </span>
        </span>
      ))}
      <span className="cwp-pop absolute block" style={{ left: "44.5%", top: "58%", width: "10%", height: "10%", animationDelay: `${delayMs + 880}ms` }}>{glyph}</span>
      {/* bespoke: Cursed Coin — the coin itself arcs from the gilded holder to
          the comrade who strayed too close, who shivers as it lands */}
      {flourish === "coin" && (
        <>
          <span className="cwp-spark absolute block" style={{ left: "37%", top: "42%", width: "2.8%", height: "2.8%", "--dx": "700%", "--dy": "-90%", "--rot": "540deg", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.2" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.6" />
              <path d="M5 2.4 C6.6 3.6 6.6 6.4 5 7.6 C3.4 6.4 3.4 3.6 5 2.4 Z" fill="none" stroke="#8a6a3a" strokeWidth="0.5" />
            </svg>
          </span>
          <span className="cwp-hold absolute block" style={{ left: "62%", top: "38%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 1060}ms` }}>
            <Man kind="b" fill={tint(p2, 0.95)} stroke={p0} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "63.6%", top: "35%", width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 1180}ms` }}>
            <Mote color="#e8b04b" />
          </span>
        </>
      )}
      {/* bespoke: Gilded Rot — the gold is a sickness: rot-flecks bloom on the
          gilded figures and flake off in a golden drizzle */}
      {flourish === "gilded" && (
        <>
          {[
            { l: 36, t: 45, d: 0 },
            { l: 46, t: 43.6, d: 160 },
            { l: 56, t: 45, d: 320 },
          ].map((v, i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 900 + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <circle cx="5" cy="5" r="3.6" fill="#6b4a2a" stroke="#e8b04b" strokeWidth="0.8" />
              </svg>
            </span>
          ))}
          {[
            { l: 38, t: 52, dx: "-40%" },
            { l: 50, t: 51, dx: "30%" },
            { l: 58, t: 52.5, dx: "60%" },
          ].map((v, i) => (
            <span key={`f${i}`} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.3%", height: "1.3%", "--dx": v.dx, "--dy": "160%", "--rot": "120deg", animationDelay: `${delayMs + 1040 + i * 130}ms` } as CSSProperties}>
              <Mote color="#e8b04b" />
            </span>
          ))}
        </>
      )}
      <SettlePair color={tint(p1, 0.75)} delayMs={delayMs + 1240} />
    </Stage>
  );
}

/* =============================================================================
   Bespoke scenes — tier 7–8 flagships, one component per card.
   ========================================================================== */

interface SceneProps {
  lead: boolean;
  delayMs: number;
}

/* --- Death Knell: the great cracked bell descends over the doomed piece,
   tolls four counted strokes, and the numeral IV burns down to I. ---------- */
const KNELL: Palette = ["#2a1030", "#c9b0e8", "#8a94a8"];
function DeathKnellScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = KNELL;
  if (!lead) return <CurseHit palette={KNELL} glyph={GLYPH.hw2_death_knell} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={41} top={22} />
      {/* the doomed one, shivering under the bell's shadow */}
      <span className="cwp-hold absolute block" style={{ left: "46.5%", top: "56%", width: "7%", height: "10%", animationDelay: `${delayMs + 480}ms` }}>
        <Man kind="q" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      {/* the great bell, filling the sky over the board */}
      <span className="cwp-drop absolute block" style={{ left: "33%", top: "12%", width: "34%", height: "40%", animationDelay: `${delayMs + 140}ms` }}>
        <span className="cwp-swing absolute inset-0 block" style={{ animationDelay: `${delayMs + 640}ms` }}>
          <svg viewBox="0 0 34 40" className="block h-full w-full" aria-hidden="true">
            <path d="M17 1 V5" stroke={tint(p2, 0.85)} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8 30 C8 15 11 7.5 17 5.6 C23 7.5 26 15 26 30 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.95)} strokeWidth="1.4" {...SJ} />
            <path d="M6 30 H28 L26.8 33.6 H7.2 Z" fill={tint(p1, 0.85)} stroke={tint(p2, 0.6)} strokeWidth="0.6" {...SJ} />
            <circle cx="17" cy="36.4" r="2" fill={tint(p2, 0.95)} />
            {/* the long crack that gives the knell its voice */}
            <path d="M18.4 10 L16.6 15 L18.8 19.5 L16.8 25 L18.2 29" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      </span>
      {/* four counted strokes: toll rings, one per remaining turn */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="cwp-ring absolute block rounded-full"
          style={{ left: "31%", top: "40%", width: "38%", height: "26%", border: `2.5px solid ${tint(p1, 0.85 - i * 0.12)}`, animationDelay: `${delayMs + 700 + i * 190}ms` }}
        />
      ))}
      {/* the numeral counts down: IV flickers, then I burns */}
      <span className="cwp-facein absolute block" style={{ left: "63%", top: "30%", width: "9%", height: "8%", animationDelay: `${delayMs + 760}ms` }}>
        <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.5 1.5 V8.5 M5.5 1.5 L7.5 8.5 L9.5 1.5" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.2" {...SJ} />
        </svg>
      </span>
      <span className="cwp-pop absolute block" style={{ left: "64.6%", top: "40%", width: "4%", height: "7%", animationDelay: `${delayMs + 1120}ms` }}>
        <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
          <path d="M3 1.2 V8.8" stroke="#c94a5a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the bribe clause: a red droplet glints at the bell's lip */}
      <span className="cwp-glint absolute block" style={{ left: "48.8%", top: "48%", width: "2.4%", height: "3%", animationDelay: `${delayMs + 1300}ms` }}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
        </svg>
      </span>
      {/* dust shaken off the boards by the tolling */}
      {[
        { l: 36, t: 62, dx: "-70%", d: 0 },
        { l: 60, t: 63, dx: "80%", d: 130 },
        { l: 48, t: 66, dx: "10%", d: 260 },
      ].map((v, i) => (
        <span key={i} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.6%", height: "1.6%", "--dx": v.dx, "--dy": "130%", "--rot": "100deg", animationDelay: `${delayMs + 900 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.7)} />
        </span>
      ))}
    </Stage>
  );
}

/* --- The Hollow Crown: a throne rises, the great crown lowers onto it and
   hollows to a shell, and the whole court bows into mourning. -------------- */
const HOLLOW: Palette = ["#2b1218", "#e8b04b", "#8a94a8"];
function HollowCrownScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = HOLLOW;
  if (!lead) return <CurseHit palette={HOLLOW} glyph={GLYPH.hw2_hollow_crown} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={42} top={30} />
      {/* the throne, shouldering up mid-board */}
      <span className="cwp-rise absolute block" style={{ left: "39%", top: "30%", width: "22%", height: "34%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 22 34" className="block h-full w-full" aria-hidden="true">
          <path d="M4 32 V6 L7 9.5 V15 H15 V9.5 L18 6 V32 Z" fill={tint(p0, 0.9)} stroke={tint(p1, 0.85)} strokeWidth="1" {...SJ} />
          <path d="M2 32 H20" stroke={tint(p1, 0.85)} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 20 H15 M7 24 H15" stroke={tint(p2, 0.5)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the crown lowers onto the empty seat... */}
      <span className="cwp-drop absolute block" style={{ left: "43.5%", top: "22%", width: "13%", height: "10%", animationDelay: `${delayMs + 520}ms` }}>
        <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 8.4 V2.4 L4.4 4.8 L7 1 L9.6 4.8 L12.4 2.4 V8.4 Z" fill={tint(p1, 0.95)} stroke="#8a6a3a" strokeWidth="0.6" {...SJ} />
          <circle cx="7" cy="6" r="0.9" fill="#c94a5a" />
        </svg>
      </span>
      {/* ...and HOLLOWS: the solid crown gives way to a bare outline */}
      <span className="cwp-facein absolute block" style={{ left: "43.5%", top: "31.5%", width: "13%", height: "10%", animationDelay: `${delayMs + 1040}ms` }}>
        <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 8.4 V2.4 L4.4 4.8 L7 1 L9.6 4.8 L12.4 2.4 V8.4 Z" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.7" strokeDasharray="1.6 1.1" {...SJ} />
        </svg>
      </span>
      {/* the court bows low on either side of the throne */}
      {[
        { k: "q" as const, l: 29, t: 52, d: 0, flip: false },
        { k: "b" as const, l: 35, t: 55, d: 130, flip: false },
        { k: "n" as const, l: 62, t: 54, d: 260, flip: true },
        { k: "r" as const, l: 68, t: 52, d: 390, flip: true },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-bow absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%", animationDelay: `${delayMs + 820 + v.d}ms`, ...(v.flip ? { scale: "-1 1" } : {}) }}
        >
          <Man kind={v.k} fill={tint(p2, 0.85)} stroke={p0} />
        </span>
      ))}
      {/* mourning veils drift across the hall */}
      {[
        { t: 44, a: 0.3, d: 0, tx: "30%" },
        { t: 50, a: 0.45, d: 220, tx: "24%" },
      ].map((v, i) => (
        <span
          key={`v${i}`}
          className="cwp-sweep absolute block"
          style={{ left: "24%", top: `${v.t}%`, width: "50%", height: "3.5%", borderRadius: "40%", background: tint(p0, v.a), "--tx": v.tx, animationDelay: `${delayMs + 900 + v.d}ms` } as CSSProperties}
        />
      ))}
      <SettlePair color={tint(p1, 0.65)} delayMs={delayMs + 1350} />
    </Stage>
  );
}

/* --- Tide of Ash: the ash wall rolls in from the victim's board edge,
   swallowing rank-bands one by one while a pawn scrambles ahead of it. ----- */
const ASHTIDE: Palette = ["#3a3a40", "#c9c9cf", "#ff9d3d"];
function TideOfAshScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = ASHTIDE;
  if (!lead) return <CurseHit palette={ASHTIDE} glyph={GLYPH.hw2_tide_of_ash} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      {/* the wall itself: a towering ash front rolling in from the left edge */}
      <span
        className="cwp-tidewall absolute block"
        style={{ left: "18%", top: "24%", width: "16%", height: "52%", borderRadius: "0 45% 45% 0", background: `linear-gradient(90deg, ${tint(p0, 0.95)}, ${tint(p0, 0.55)})`, boxShadow: `0 0 0 2px ${tint(p1, 0.35)}`, "--from": "-60%", animationDelay: `${delayMs + 160}ms` } as CSSProperties}
      />
      {/* rank-bands swallowed in order, 1st to 4th */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="cwp-spreadtile absolute block"
          style={{ left: `${23 + i * 8}%`, top: "28%", width: "7.5%", height: "44%", borderRadius: "12%", background: tint(p0, 0.72 - i * 0.1), animationDelay: `${delayMs + 520 + i * 230}ms` }}
        />
      ))}
      {/* embers riding the front */}
      {[
        { l: 30, t: 34, dx: "60%", d: 0 },
        { l: 34, t: 52, dx: "80%", d: 140 },
        { l: 28, t: 62, dx: "40%", d: 280 },
      ].map((v, i) => (
        <span key={i} className="cwp-cinder absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.6%", height: "1.6%", "--dx": v.dx, animationDelay: `${delayMs + 600 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.9)} />
        </span>
      ))}
      {/* the evicted pawn, scrambling ahead of the tide */}
      <span className="cwp-flee absolute block" style={{ left: "38%", top: "56%", width: "5%", height: "7.5%", animationDelay: `${delayMs + 620}ms` }}>
        <Man kind="p" fill={tint(p1, 0.95)} stroke={p0} />
      </span>
      {/* and a rook that waited too long, held in the ash */}
      <span className="cwp-hold absolute block" style={{ left: "27%", top: "44%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 900}ms` }}>
        <Man kind="r" fill={tint(p0, 0.95)} stroke={p1} />
      </span>
      {/* the receding promise: a far glint where the tide will stop */}
      <span className="cwp-glint absolute block" style={{ left: "56%", top: "48%", width: "3%", height: "3%", animationDelay: `${delayMs + 1320}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.9)} />
        </svg>
      </span>
      <SettlePair color={tint(p1, 0.6)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* --- Crown of Thorns: the briar closes around your king; a reaching enemy
   blade is caught mid-strike and wrapped where it stands. ------------------ */
const THORNS: Palette = ["#2f3a26", "#8faf4a", "#c94a5a"];
function CrownOfThornsScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = THORNS;
  if (!lead) return <CurseHit palette={THORNS} glyph={GLYPH.hw2_crown_of_thorns} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={42} top={40} />
      {/* your king, the warded heart of the scene */}
      <span className="cwp-facein absolute block" style={{ left: "45%", top: "42%", width: "10%", height: "15%", animationDelay: `${delayMs + 220}ms` }}>
        <Man kind="k" fill={tint(p1, 0.95)} stroke={p0} />
      </span>
      {/* the briar ring, sprouting up around him from both sides */}
      {[
        { l: 36, t: 38, rot: "-14deg", d: 0, flip: false },
        { l: 56, t: 37, rot: "12deg", d: 150, flip: true },
        { l: 40, t: 55, rot: "-5deg", d: 300, flip: false },
        { l: 53, t: 56, rot: "8deg", d: 450, flip: true },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-sprout absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "8%", height: "13%", rotate: v.rot, animationDelay: `${delayMs + 420 + v.d}ms`, ...(v.flip ? { scale: "-1 1" } : {}) }}
        >
          <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
            <path d="M5 15.4 C3 11 6.6 9 4.6 5.4 C3.4 3.4 4.4 1.8 5.6 0.8" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1" strokeLinecap="round" />
            <path d="M4.6 12 L2.8 11.4 M5.2 8.4 L7 8 M4.4 4.6 L2.8 4 M5.4 2.4 L7 2" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* one red rose opens at the crown of the briar */}
      <span className="cwp-pop absolute block" style={{ left: "47.6%", top: "34%", width: "4.5%", height: "4.5%", animationDelay: `${delayMs + 1020}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="3.6" fill={p2} stroke={tint(p0, 0.9)} strokeWidth="0.5" />
          <path d="M5 2.4 C6.8 3.4 6.8 6.6 5 7.6 C3.2 6.6 3.2 3.4 5 2.4 Z" fill="none" stroke={tint(p0, 0.7)} strokeWidth="0.5" />
        </svg>
      </span>
      {/* the checking blade lunges in — and the thorns CATCH it */}
      <span className="cwp-snapback absolute block" style={{ left: "66%", top: "44%", width: "6%", height: "9%", "--dx": "-140%", "--dy": "2%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
        <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
      </span>
      <span className="absolute block" style={{ left: "60%", top: "49%", width: "9%", height: "0.8%", rotate: "-6deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.95)} 0 5px, transparent 5px 8px)`, animationDelay: `${delayMs + 1000}ms` }} />
      </span>
      <span className="cwp-glint absolute block" style={{ left: "64%", top: "42%", width: "2.6%", height: "2.6%", animationDelay: `${delayMs + 1180}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill="#bfe6ff" />
        </svg>
      </span>
      {/* fallen petals */}
      {[
        { l: 46, t: 40, dx: "-60%", d: 0 },
        { l: 52, t: 39, dx: "70%", d: 160 },
      ].map((v, i) => (
        <span key={i} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": v.dx, "--dy": "170%", "--rot": "140deg", animationDelay: `${delayMs + 1150 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.85)} />
        </span>
      ))}
    </Stage>
  );
}

/* --- Pauper's Crown: the queen's crown lifts off, shatters to shards, and
   rook battlements are stamped onto her brow in its place. ----------------- */
const PAUPER: Palette = ["#1c1c2a", "#c94ad1", "#c9b89a"];
function PauperCrownScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = PAUPER;
  if (!lead) return <CurseHit palette={PAUPER} glyph={GLYPH.hw2_pauper_crown} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={30} />
      {/* her majesty, center stage and about to be greatly humbled */}
      <span className="cwp-facein absolute block" style={{ left: "42%", top: "36%", width: "16%", height: "24%", animationDelay: `${delayMs + 200}ms` }}>
        <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
      </span>
      {/* the crown lifts away from her brow... */}
      <span className="cwp-lift absolute block" style={{ left: "45%", top: "33%", width: "10%", height: "7%", animationDelay: `${delayMs + 560}ms` }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* ...and shatters into three golden shards */}
      {[
        { l: 47, t: 26, dx: "-220%", dy: "-120%", rot: "-160deg", d: 0 },
        { l: 50, t: 25, dx: "40%", dy: "-220%", rot: "80deg", d: 70 },
        { l: 53, t: 26, dx: "240%", dy: "-100%", rot: "200deg", d: 140 },
      ].map((v, i) => (
        <span key={i} className="cwp-spark absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.2%", height: "2.2%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 940 + v.d}ms` } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 8 L5 1 L8 8 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      {/* the battlements stamp down where the crown sat */}
      <span className="cwp-stamp absolute block" style={{ left: "45.5%", top: "33.5%", width: "9%", height: "6%", animationDelay: `${delayMs + 1120}ms` }}>
        <svg viewBox="0 0 12 7" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 6.4 V1.2 H3.4 V2.8 H4.8 V1.2 H7.2 V2.8 H8.6 V1.2 H10.4 V6.4 Z" fill={tint(p2, 0.95)} stroke="#4a4036" strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* patched rags: humble stitches fade onto her gown */}
      <span className="cwp-facein absolute block" style={{ left: "45%", top: "48%", width: "10%", height: "7%", animationDelay: `${delayMs + 1220}ms` }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <rect x="1.5" y="1.5" width="4" height="3.4" rx="0.6" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.5" strokeDasharray="1 0.7" />
          <rect x="6.8" y="3.4" width="3.6" height="3" rx="0.6" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.5" strokeDasharray="1 0.7" />
        </svg>
      </span>
      {/* the way back: one red glint — blood buys the crown again */}
      <span className="cwp-glint absolute block" style={{ left: "58%", top: "42%", width: "2.8%", height: "3.2%", animationDelay: `${delayMs + 1380}ms` }}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
        </svg>
      </span>
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1380} />
    </Stage>
  );
}

/* --- Beacon of Woe: the watchtower rises, the doom-flame catches, six
   count-runes ring it, and frost-light plays over the distant army. -------- */
const BEACON: Palette = ["#1c1c24", "#ff9d3d", "#9fd8ff"];
function BeaconOfWoeScene({ lead, delayMs }: SceneProps) {
  const [p0, p1, p2] = BEACON;
  if (!lead) return <CurseHit palette={BEACON} glyph={GLYPH.hw2_beacon_of_woe} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={34} />
      {/* the watchtower, rising on the hill where everyone can see it */}
      <span className="cwp-rise absolute block" style={{ left: "42%", top: "30%", width: "16%", height: "36%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 16 36" className="block h-full w-full" aria-hidden="true">
          <path d="M4 34 L5 10 H11 L12 34 Z" fill={tint(p0, 0.95)} stroke={tint(p2, 0.6)} strokeWidth="0.8" {...SJ} />
          <path d="M3 10 H13 M4.5 6 H11.5 V10 M6.5 6 V3.4 M9.5 6 V3.4" stroke={tint(p2, 0.75)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M6.5 3.4 H9.5" stroke={tint(p2, 0.75)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M2 34 H14" stroke={tint(p2, 0.6)} strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
      {/* the doom-flame catches and gutters at the top */}
      <span className="cwp-flame absolute block" style={{ left: "45.6%", top: "24%", width: "9%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 C7.4 3.4 7.8 5.4 5 9.2 C2.2 5.4 2.6 3.4 5 0.8 Z" fill={p1} stroke="#7a4a10" strokeWidth="0.5" {...SJ} />
          <path d="M5 3.4 C6.2 4.8 6.2 6.2 5 7.8 C3.8 6.2 3.8 4.8 5 3.4 Z" fill="#ffd76a" />
        </svg>
      </span>
      {/* six count-runes light around the tower: the six turns of the fuse */}
      {[
        { l: 34, t: 30 },
        { l: 30, t: 42 },
        { l: 34, t: 54 },
        { l: 63, t: 30 },
        { l: 67, t: 42 },
        { l: 63, t: 54 },
      ].map((v, i) => (
        <span key={i} className="cwp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 760 + i * 110}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
          </svg>
        </span>
      ))}
      {/* the promise at the fuse's end: frost-light crosses the far army */}
      {[
        { k: "n" as const, l: 68, t: 62, d: 0 },
        { k: "r" as const, l: 74, t: 61, d: 160 },
      ].map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.5%", height: "6.5%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 1060 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p0, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1180 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p2, 0.75)} stroke={p0} />
          </span>
        </span>
      ))}
      {/* embers off the beacon */}
      {[
        { l: 47, t: 26, dx: "-50%", d: 0 },
        { l: 52, t: 25, dx: "60%", d: 140 },
      ].map((v, i) => (
        <span key={`e${i}`} className="cwp-cinder absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.5%", height: "1.5%", "--dx": v.dx, animationDelay: `${delayMs + 800 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p1, 0.9)} />
        </span>
      ))}
    </Stage>
  );
}

/* =============================================================================
   Glyphs — one 10x10 mini-emblem per card, drawn flat.
   ========================================================================== */

function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  // a warding open hand over a small pawn
  hw2_witchs_veto: (
    <Gl>
      <path d="M3 8.8 V5.4 M4.2 8.6 V4.4 M5.4 8.6 V4 M6.6 8.8 V4.8 M3 8.8 C4.4 9.6 5.8 9.6 6.6 8.8" fill="none" stroke="#c9b0e8" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="5" cy="2.2" r="1.3" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
    </Gl>
  ),
  // three crows over a cracked moon
  hw2_bad_omen: (
    <Gl>
      <circle cx="5" cy="6" r="3" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M5 3.2 L4.4 5 L5.6 6.4 L4.8 8.4" fill="none" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M1.4 2.4 C2.2 1.4 3 1.4 3.4 2.2 C3.8 1.4 4.6 1.4 5.4 2.4 M5.6 1.6 C6.4 0.6 7.2 0.6 7.6 1.4 C8 0.6 8.8 0.6 9.6 1.6" fill="none" stroke="#1c1c24" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a frozen footprint pair
  hw2_cold_footprints: (
    <Gl>
      <ellipse cx="3.4" cy="6.6" rx="1.6" ry="2.2" fill="#9fd8ff" stroke="#3f7fb5" strokeWidth="0.4" />
      <ellipse cx="6.8" cy="3.6" rx="1.6" ry="2.2" fill="#bfe6ff" stroke="#3f7fb5" strokeWidth="0.4" />
      <path d="M2 2 L3 3 M1.4 3.4 H2.8" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a road dwindling to a doorway
  hw2_long_road_home: (
    <Gl>
      <path d="M1 9 C3.4 7 5.4 4.6 6.4 1.6 M2.6 9.2 C4.8 7.2 6.6 5 7.6 2.2" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="1.2 0.9" />
      <path d="M6.6 1.4 H9 V4 H6.6 Z M7.8 1.4 V4" fill="none" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a coin over a blood drop
  hw2_blood_price: (
    <Gl>
      <circle cx="5" cy="3.4" r="2.6" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M5 1.8 V5 M3.8 2.8 H6.2" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 6 C6.2 7.4 6.7 8.2 6.7 8.9 A1.7 1.7 0 1 1 3.3 8.9 C3.3 8.2 3.8 7.4 5 6 Z" fill="#c94a5a" />
    </Gl>
  ),
  // a crown weeping tarnish
  hw2_tarnished_crown: (
    <Gl>
      <path d="M1.6 6.2 V2 L3.8 3.8 L5 1.2 L6.2 3.8 L8.4 2 V6.2 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M3 6.2 C3 7.4 2.8 8.2 2.4 9 M5 6.2 C5 7.6 5 8.4 5 9.2 M7 6.2 C7 7.4 7.2 8.2 7.6 9" stroke="#3a3a40" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // the cracked bell, mid-toll
  hw2_tolling_bell: (
    <Gl>
      <path d="M3 7 C3 3.6 3.8 2 5 1.6 C6.2 2 7 3.6 7 7 Z" fill="#6b4a8f" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M2.4 7 H7.6 L7.2 8.2 H2.8 Z" fill="#c9b0e8" />
      <circle cx="5" cy="9" r="0.6" fill="#c9b0e8" />
      <path d="M1 4.6 C1.6 4 1.6 3 1 2.4 M9 4.6 C8.4 4 8.4 3 9 2.4" fill="none" stroke="#c9b0e8" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a curled spring under an arrow bent back on itself
  hw2_curse_of_recoil: (
    <Gl>
      <path d="M2 8.6 C4.6 8.6 4.6 6.6 2.6 6.6 C4.6 6.6 4.6 4.6 2.6 4.6 C4.6 4.6 4.6 2.6 2.6 2.6" fill="none" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 2 H8.4 V5.4 M8.4 2 L5.6 4.8 M5.6 3 V4.8 H7.4" fill="none" stroke="#c94a5a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // snapped reins
  hw2_no_reins: (
    <Gl>
      <path d="M1.2 7.8 C3 6.6 4 5.2 4.4 3.4" fill="none" stroke="#8a6a3a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M5.6 3 C6.4 4.6 7.6 5.8 9 6.6" fill="none" stroke="#8a6a3a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4.6 2.6 L5.4 2.2 M4.4 1.6 L5 1 M5.8 2.2 L6.2 1.4" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // two ration chits
  hw2_war_rations: (
    <Gl>
      <rect x="1" y="2" width="5.4" height="3.4" rx="0.6" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <rect x="3.6" y="4.8" width="5.4" height="3.4" rx="0.6" fill="#c9b89a" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M2.4 3.7 H5 M5 6.5 H7.6" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a clock face at one to midnight
  hw2_witching_hour: (
    <Gl>
      <circle cx="5" cy="5" r="4" fill="#2c3e6b" stroke="#cdd6ff" strokeWidth="0.5" />
      <path d="M5 5 V1.8 M5 5 L3.4 3" stroke="#cdd6ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 0.8 V1.4 M5 8.6 V9.2 M0.8 5 H1.4 M8.6 5 H9.2" stroke="#cdd6ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a sagging grain sack
  hw2_weight_of_toil: (
    <Gl>
      <path d="M2 8.4 C1.6 4.6 3.4 2.4 5 2.4 C6.6 2.4 8.4 4.6 8 8.4 C6 7.4 4 7.4 2 8.4 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M4 2.6 C4.2 1.6 5.8 1.6 6 2.6" fill="none" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.4 5 H6.6" stroke="#4a3a22" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // three leeches stacked
  hw2_compounding_misery: (
    <Gl>
      <path d="M1.6 3 C3.6 1.6 6.4 1.6 8.4 3" fill="none" stroke="#8f6bff" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 5.4 C3.6 4 6.4 4 8.4 5.4" fill="none" stroke="#c9b0e8" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 7.8 C3.6 6.4 6.4 6.4 8.4 7.8" fill="none" stroke="#e3d0ff" strokeWidth="0.9" strokeLinecap="round" />
    </Gl>
  ),
  // two dolls joined by a thread
  hw2_twinned_torment: (
    <Gl>
      <circle cx="2.8" cy="3" r="1.2" fill="#c9b0e8" />
      <path d="M2 4.4 H3.6 L3.9 7.6 H1.7 Z" fill="#c9b0e8" />
      <circle cx="7.2" cy="3" r="1.2" fill="#8a94a8" />
      <path d="M6.4 4.4 H8 L8.3 7.6 H6.1 Z" fill="#8a94a8" />
      <path d="M3.8 5.6 C5 5 5 5 6.2 5.6" fill="none" stroke="#c94a5a" strokeWidth="0.5" strokeDasharray="0.9 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the cursed coin, marked with its own hex
  hw2_cursed_coin: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.6" />
      <path d="M5 1.8 L5.8 4.2 L8.2 4.2 L6.2 5.8 L7 8.2 L5 6.8 L3 8.2 L3.8 5.8 L1.8 4.2 L4.2 4.2 Z" fill="none" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a withered tile sprouting one weed
  hw2_creeping_blight: (
    <Gl>
      <path d="M5 3.4 L8.8 6 L5 8.6 L1.2 6 Z" fill="#3a3a40" stroke="#8faf4a" strokeWidth="0.5" {...SJ} />
      <path d="M5 5.8 C5 3.6 4.2 2.6 3.4 1.8 M5 5.8 C5 3.8 5.8 2.8 6.4 1.4" fill="none" stroke="#8faf4a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a crown above two shackled pawns
  hw2_queens_ransom: (
    <Gl>
      <path d="M2.6 3.4 V1.4 L4 2.4 L5 0.8 L6 2.4 L7.4 1.4 V3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="3" cy="6" r="1" fill="#c9b0e8" />
      <circle cx="7" cy="6" r="1" fill="#c9b0e8" />
      <path d="M2.2 8.6 C3.4 7.8 4.4 7.8 5 8.4 C5.6 7.8 6.6 7.8 7.8 8.6" fill="none" stroke="#8a94a8" strokeWidth="0.6" strokeDasharray="0.9 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a padlock with a centered keyhole
  hw2_bound_court: (
    <Gl>
      <path d="M3.2 4.4 V3 C3.2 0.8 6.8 0.8 6.8 3 V4.4" fill="none" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="2" y="4.4" width="6" height="4.8" rx="0.9" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.6" />
      <circle cx="5" cy="6.4" r="0.9" fill="#ffd76a" />
      <path d="M5 6.8 V8.2" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a storm cloud over a shrinking army row
  hw2_gathering_storm: (
    <Gl>
      <path d="M2 4.4 C1 4.4 0.8 3 1.8 2.6 C1.8 1.2 3.6 0.8 4.2 1.8 C4.8 0.8 6.8 1 6.8 2.4 C8 2.2 8.6 3.8 7.4 4.4 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
      <path d="M4.4 5 L3.4 7 H4.6 L3.8 9" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
      <path d="M6.2 5.4 L6.2 6.8 M7.6 5.2 L7.6 6.2 M8.8 5 L8.8 5.8" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a flower rising from a grave mound
  hw2_gravebloom: (
    <Gl>
      <path d="M1.4 9 C1.4 6.4 3 5 5 5 C7 5 8.6 6.4 8.6 9 Z" fill="#3a3a40" stroke="#8faf4a" strokeWidth="0.4" {...SJ} />
      <path d="M5 5.6 V2.6" stroke="#8faf4a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="1.8" r="1.3" fill="#c94a5a" stroke="#8a2a3a" strokeWidth="0.4" />
      <circle cx="5" cy="1.8" r="0.4" fill="#ffd76a" />
    </Gl>
  ),
  // a gilded hand, fingers dripping gold
  hw2_gilded_rot: (
    <Gl>
      <path d="M3 7.6 V4.2 M4.2 7.4 V3.2 M5.4 7.4 V2.8 M6.6 7.6 V3.6 M3 7.6 C4.4 8.4 5.8 8.4 6.6 7.6" fill="none" stroke="#e8b04b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M3 8.8 C3 9.4 3.8 9.4 3.8 8.8 M5.8 9 C5.8 9.6 6.6 9.6 6.6 9" fill="none" stroke="#e8b04b" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the bell with a IV countdown
  hw2_death_knell: (
    <Gl>
      <path d="M2.6 6.4 C2.6 3.2 3.6 1.6 5 1.2 C6.4 1.6 7.4 3.2 7.4 6.4 Z" fill="#2a1030" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M2 6.4 H8 L7.6 7.6 H2.4 Z" fill="#c9b0e8" />
      <path d="M3.4 8.4 V9.6 M4.6 8.4 L5.2 9.6 L5.8 8.4" fill="none" stroke="#c94a5a" strokeWidth="0.5" {...SJ} />
      <path d="M5.4 3 L4.8 4.4 L5.6 5.6" fill="none" stroke="#8a94a8" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the hollow crown: an outline only, over a mourning band
  hw2_hollow_crown: (
    <Gl>
      <path d="M1.6 6 V1.8 L3.8 3.6 L5 1 L6.2 3.6 L8.4 1.8 V6 Z" fill="none" stroke="#e8b04b" strokeWidth="0.6" strokeDasharray="1.3 0.9" {...SJ} />
      <path d="M1.6 7.6 H8.4 V8.8 H1.6 Z" fill="#2b1218" stroke="#8a94a8" strokeWidth="0.4" />
    </Gl>
  ),
  // an ash wave curling over a small tower
  hw2_tide_of_ash: (
    <Gl>
      <path d="M1 8.8 C1 5 2.6 2.6 5.4 2.2 C4 3.6 4.4 5.2 6 5.6 C4.8 6.4 4.8 7.6 6.2 8.8 Z" fill="#3a3a40" stroke="#c9c9cf" strokeWidth="0.5" {...SJ} />
      <path d="M7 8.8 L7.3 5.6 H8.7 L9 8.8 Z M6.8 5.6 H9.2 M7.3 4.4 H8.7 V5.6" fill="none" stroke="#c9c9cf" strokeWidth="0.5" {...SJ} />
      <circle cx="7.4" cy="2.6" r="0.5" fill="#ff9d3d" />
    </Gl>
  ),
  // a crown wrapped in briars
  hw2_crown_of_thorns: (
    <Gl>
      <path d="M4.6 2.2 H5.4 V3 H6.2 V3.8 H5.4 V4.6 H4.6 V3.8 H3.8 V3 H4.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" />
      <path d="M1.2 6.6 C3.6 5 6.4 5 8.8 6.6" fill="none" stroke="#8faf4a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2.6 5.8 L2.2 4.8 M4.4 5.3 L4.2 4.2 M6 5.3 L6.2 4.2 M7.6 5.9 L8 4.9" stroke="#8faf4a" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="5" cy="8.2" r="0.9" fill="#c94a5a" />
    </Gl>
  ),
  // a queen's gown wearing a rook's head
  hw2_pauper_crown: (
    <Gl>
      <path d="M2.8 2.8 H3.8 V1.6 H4.5 V2.8 H5.5 V1.6 H6.2 V2.8 H7.2 V4.4 H2.8 Z" fill="#c9b89a" stroke="#4a4036" strokeWidth="0.4" {...SJ} />
      <path d="M3 5 H7 L7.8 8.8 H2.2 Z" fill="#c94ad1" stroke="#6b1a5e" strokeWidth="0.5" {...SJ} />
      <path d="M4 6.2 L6 7.6 M6 6.2 L4 7.6" stroke="#e3d0ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the lit beacon tower
  hw2_beacon_of_woe: (
    <Gl>
      <path d="M3.6 9.2 L4.2 4 H5.8 L6.4 9.2 Z" fill="#1c1c24" stroke="#9fd8ff" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 4 H6.6" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 0.6 C6.2 1.8 6.3 2.8 5 3.6 C3.7 2.8 3.8 1.8 5 0.6 Z" fill="#ff9d3d" stroke="#7a4a10" strokeWidth="0.4" {...SJ} />
      <path d="M1.6 2.6 L2.6 3.2 M8.4 2.6 L7.4 3.2" stroke="#ff9d3d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
};

/* =============================================================================
   Registry — CARD -> TEMPLATE / PALETTE / GLYPH (+ flourish), or a bespoke
   scene for the tier 7–8 flagships. `source` names an fx zone only where the
   card reliably paints it at play time.
   ========================================================================== */

/** Bind a template + palette + glyph + config into a SigPlugin entry. The
 * trailing `flourish` keys that card's dedicated dressing block inside the
 * template (rendering only — the config object is untouched). */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  return {
    config,
    Render: function CursePlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} flourish={flourish} />;
    },
  };
}

/** Bind a fully bespoke scene component into a SigPlugin entry. */
function S(Scene: ComponentType<SceneProps>, config: SigPlugin["config"]): SigPlugin {
  return {
    config,
    Render: function CurseSceneRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Scene lead={lead} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- HexBrand (marks, contracts, tallies) ------------------------------- */
  hw2_witchs_veto: G(HexBrand, ["#6b4a8f", "#c9b0e8", "#2a1030"], GLYPH.hw2_witchs_veto, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "veto"),
  hw2_long_road_home: G(HexBrand, ["#5a6b8f", "#c9a84c", "#2b2218"], GLYPH.hw2_long_road_home, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "shades",
  }, "longroad"),
  hw2_blood_price: G(HexBrand, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.hw2_blood_price, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "bloodprice"),
  hw2_tarnished_crown: G(HexBrand, ["#4a3a22", "#e8b04b", "#2a2a30"], GLYPH.hw2_tarnished_crown, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "clockice",
  }, "tarnish"),
  hw2_war_rations: G(HexBrand, ["#8a7a63", "#e8dcc0", "#3a3026"], GLYPH.hw2_war_rations, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "rations"),
  hw2_compounding_misery: G(HexBrand, ["#5b2b8f", "#8f6bff", "#12081f"], GLYPH.hw2_compounding_misery, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }, "stacked"),

  /* --- OmenBell (countdowns, rhythms, delayed dooms) ----------------------- */
  hw2_bad_omen: G(OmenBell, ["#2c3e6b", "#cdd6ff", "#0d1326"], GLYPH.hw2_bad_omen, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "omen"),
  hw2_tolling_bell: G(OmenBell, ["#6b4a8f", "#c9b0e8", "#1c0f18"], GLYPH.hw2_tolling_bell, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "cathedral",
  }, "halfmeasure"),
  hw2_witching_hour: G(OmenBell, ["#1c1c2a", "#9fd8ff", "#2c3e6b"], GLYPH.hw2_witching_hour, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "midnight"),
  hw2_weight_of_toil: G(OmenBell, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.hw2_weight_of_toil, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify",
  }, "toil"),

  /* --- BlightGarden (cursed and remembering ground) ------------------------ */
  hw2_cold_footprints: G(BlightGarden, ["#2c3e6b", "#9fd8ff", "#e8f8ff"], GLYPH.hw2_cold_footprints, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice",
  }, "footprints"),
  hw2_creeping_blight: G(BlightGarden, ["#2f3a26", "#8faf4a", "#c9d69a"], GLYPH.hw2_creeping_blight, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "creep"),
  hw2_gravebloom: G(BlightGarden, ["#1c241c", "#7fae5a", "#c94a5a"], GLYPH.hw2_gravebloom, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest",
  }, "gravebloom"),
  hw2_gathering_storm: G(BlightGarden, ["#2c3e6b", "#5a6b8f", "#9fd8ff"], GLYPH.hw2_gathering_storm, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "shades",
  }, "stormwall"),

  /* --- ChainWeb (binds, compulsions, ransoms) ------------------------------ */
  hw2_twinned_torment: G(ChainWeb, ["#5b2b8f", "#c9b0e8", "#c94a5a"], GLYPH.hw2_twinned_torment, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice",
  }, "twin"),
  hw2_no_reins: G(ChainWeb, ["#3a3026", "#c9a84c", "#8a6a3a"], GLYPH.hw2_no_reins, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "blitz",
  }, "noreins"),
  hw2_curse_of_recoil: G(ChainWeb, ["#4a3a2a", "#ff9d3d", "#c9cdd6"], GLYPH.hw2_curse_of_recoil, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege",
  }, "recoil"),
  hw2_queens_ransom: G(ChainWeb, ["#5b2b8f", "#ffd76a", "#1c0f18"], GLYPH.hw2_queens_ransom, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice",
  }, "ransom"),
  hw2_bound_court: G(ChainWeb, ["#3a3a40", "#8a94a8", "#ffd76a"], GLYPH.hw2_bound_court, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut",
  }, "courtlock"),

  /* --- MidasVeil (transferring / accumulating marks) ----------------------- */
  hw2_cursed_coin: G(MidasVeil, ["#3a3026", "#e8b04b", "#c9cdd6"], GLYPH.hw2_cursed_coin, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }, "coin"),
  hw2_gilded_rot: G(MidasVeil, ["#2a2a30", "#e8b04b", "#c9b89a"], GLYPH.hw2_gilded_rot, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "coronation",
  }, "gilded"),

  /* --- Bespoke scenes (tier 7–8 flagships) --------------------------------- */
  hw2_death_knell: S(DeathKnellScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
  }),
  hw2_hollow_crown: S(HollowCrownScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation",
  }),
  hw2_tide_of_ash: S(TideOfAshScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "cataclysm",
  }),
  hw2_crown_of_thorns: S(CrownOfThornsScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis",
  }),
  hw2_pauper_crown: S(PauperCrownScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "crownrain",
  }),
  hw2_beacon_of_woe: S(BeaconOfWoeScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "nova",
  }),
};
