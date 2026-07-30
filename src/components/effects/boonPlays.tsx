// Boon-wave plugin signatures — flagships for the boon expansion batch
// (src/engine/buffs/boons2.ts). Same registry contract as the other plugin
// modules (see sigPlugins.tsx): self-contained render art, own CSS
// (boonPlays.css), transform/opacity only, no imports from BoardEffects.tsx.
// Every entry must be a bespoke scene or a template + per-card flourish with
// real per-flourish dressing — the animation audit (npm run test:animations)
// fails shared flagships that grow the committed baseline.
//
// FIVE boon-flavored templates carry the tier 1-6 cards, each parameterised
// by { palette, glyph } and dressed per card by a unique flourish block:
//   DawnHalo    — a dawn sun-disc settles over the board and its rays wheel
//                 out (miracles, wards, oaths)
//   Reliquary   — a reliquary chest slides up, the lid swings, light and
//                 treasure climb out (spoils, exchanges, inheritances)
//   AstralAnvil — the alchemist's anvil rises, the hammer falls, the work
//                 is transmuted in the flash (makings and remakings)
//   PactScroll  — a great pact unrolls, the quill signs, the seal thumps
//                 down (bargains, vows, court rules)
//   FalconDash  — a falcon-comet streaks the crop behind speed lines
//                 (raids, escapes, duels)
// The tier 7-8 flagships are fully bespoke scenes (their own Render, no
// shared machinery): KingmakerScene, BoltHoleScene, CarnivalScene,
// RestitutionScene, LongTruceScene, GreatReturnScene, ShadowReserveScene,
// EternalKeepScene.

// STAGING. Every card declares an anchor, so the scene happens where the card
// was actually played. `Stage` is the shared <BoardWideStage>, which clamps
// itself over the board from --fx-anchor-dx/dy; anything that means THE BOARD
// (the wash, the edge gilt) renders inside <BoardFrame> so it stays exact at
// any anchor. Aim-anchored cards additionally lay a travelling leg down the
// real source -> target vector: <AimLeg> carries AimStage's own `fx-aim`
// rotation and is the ONLY thing that gets it, because an upright subject
// rotated onto the attack vector would lie on its side.
//
// Geometry reaches the art through boonPlays.css: bwp-rise arrives from the
// caster's own edge (--fx-side), bwp-target leans in from it, bwp-glint's
// settle drifts away from the board centre (--fx-ox/--fx-oy), bwp-rain slants
// with it, bwp-beam reaches by --fx-len, and bwp-leg/bwp-legtip are sized by
// --fx-len outright.

import "./boonPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardFrame, BoardWideStage } from "./stage";

/* =============================================================================
   Shared bits (module-local — deliberately NOT imported from other modules)
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  role: SigRole;
  delayMs: number;
  /** Per-card structural flourish key: every card on a shared template MUST
   * pass one, and every key below has its own dressing block. */
  flourish?: string;
  /** Set for `anchor: "aim"` cards: lay the travelling leg down the real
   * source -> target vector as well as playing the template's own beats. */
  aim?: boolean;
}

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** hex "#rrggbb" -> rgba() at the given alpha. */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** Oversized-clipped board-wide stage: the overlay mounts inside ONE square;
 * this canvas is ~14 squares wide, anchored on the cast square and clamping
 * itself over the board (see stage.tsx). */
function Stage({ children }: { children: ReactNode }) {
  return <BoardWideStage>{children}</BoardWideStage>;
}

/** Full-board colour wash. Inside <BoardFrame>, so it is exactly the board at
 * any anchor rather than a fixed slice of a canvas that has moved. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="bwp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />
    </BoardFrame>
  );
}

/** The travelling part of an `anchor: "aim"` play: a lance of light laid from
 * the cast square down the real source -> target leg, its reach driven by
 * --fx-len and its tip riding out to the victim.
 *
 * Authored pointing RIGHT; `fx-aim` (the rotation AimStage applies internally)
 * turns it onto the vector. It is applied HERE rather than by wrapping the leg
 * in <AimStage>, because this already renders inside <Stage>: a second staging
 * box would multiply the 14-cell canvas by 14 again. Nothing upright may go
 * inside it - a subject rotated onto the attack vector lies on its side. */
function AimLeg({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span className="fx-aim absolute inset-0 block" aria-hidden="true">
      <span
        className="bwp-leg absolute block"
        style={{
          left: "50%",
          top: "49.7%",
          width: "7.15%",
          height: "0.7%",
          background: `linear-gradient(90deg, ${color}, transparent)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="bwp-legtip absolute block rounded-full"
        style={{ left: "49.4%", top: "49%", width: "1.2%", height: "1.2%", background: color, animationDelay: `${delayMs + 90}ms` }}
      />
    </span>
  );
}

/** The shockwave ring; tier 7-8 scenes stack a second, later one. */
function Ring({ delayMs, color, size = 66 }: { delayMs: number; color: string; size?: number }) {
  return (
    <span
      className="bwp-ring absolute block rounded-full"
      style={{
        left: `${50 - size / 2}%`,
        top: `${50 - size / 2}%`,
        width: `${size}%`,
        height: `${size}%`,
        border: `3px solid ${color}`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** A small diamond sparkle. */
function Glint({ delayMs, color, left, top, size = 3.2 }: { delayMs: number; color: string; left: number; top: number; size?: number }) {
  return (
    <span className="bwp-glint absolute block" style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%`, animationDelay: `${delayMs}ms` }}>
      <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
        <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z" fill={color} />
        <path d="M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={color} />
      </svg>
    </span>
  );
}

/** A light beam that opens from its left edge (rotate via style). */
function Beam({
  delayMs, color, left, top, w, h = 1, rot = "0deg",
}: { delayMs: number; color: string; left: number; top: number; w: number; h?: number; rot?: string }) {
  return (
    <span
      className="bwp-beam absolute block"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${w}%`,
        height: `${h}%`,
        rotate: rot,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        transformOrigin: "0% 50%",
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** Board-edge glow — reserved for the tier 7-8 bespoke scenes' grandeur. It
 * means the BOARD's edge, so it lives inside <BoardFrame>. */
function EdgeGlow({ delayMs, color }: { delayMs: number; color: string }) {
  return (
    <BoardFrame>
      <span
        className="bwp-edge absolute inset-0 block"
        style={{ boxShadow: `inset 0 0 26px 9px ${color}`, animationDelay: `${delayMs}ms` }}
      />
    </BoardFrame>
  );
}

/** The anticipation beat: light gathers on the point the play is about to
 * claim, one short breath before the strike. Deliberately ONE node — the tier
 * 7-8 scenes that need it are already near the 16-node ceiling. */
function Tell({ color, delayMs, left = 38, top = 36, size = 24 }: { color: string; delayMs: number; left?: number; top?: number; size?: number }) {
  return (
    <span
      className="bwp-tell absolute block rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        height: `${size}%`,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/* Crude chessman silhouettes — tiny stage props, not portraits. */
const CHESSMAN: Record<string, ReactNode> = {
  p: (
    <>
      <circle cx="5" cy="3.4" r="1.7" />
      <path d="M3.2 10.8 L4.1 6 C4.3 5.4 5.7 5.4 5.9 6 L6.8 10.8 Z" />
    </>
  ),
  n: (
    <>
      <path d="M3 10.8 C3 6.6 4.3 4.6 6.4 4.2 L7.6 5.7 L6.6 6.6 C6.6 8.4 5.8 10.8 4.6 10.8 Z" />
    </>
  ),
  b: (
    <>
      <path d="M5 1.4 C6.6 2.9 6.8 4.5 5 6 C3.2 4.5 3.4 2.9 5 1.4 Z" />
      <path d="M3.4 10.8 L4.4 6.6 H5.6 L6.6 10.8 Z" />
    </>
  ),
  r: (
    <>
      <path d="M3 10.8 V5 H2.6 V2.4 H4 V3.4 H4.6 V2.4 H5.4 V3.4 H6 V2.4 H7.4 V5 H7 V10.8 Z" />
    </>
  ),
  q: (
    <>
      <path d="M2.6 4.2 L3.3 1.8 L4.4 3.4 L5 1.3 L5.6 3.4 L6.7 1.8 L7.4 4.2 Z" />
      <path d="M3.2 10.8 L4 4.8 H6 L6.8 10.8 Z" />
    </>
  ),
  k: (
    <>
      <path d="M4.4 1.5 H5.6 M5 0.9 V2.1" fill="none" strokeWidth="0.7" />
      <path d="M3 4.6 L3.6 2.8 H6.4 L7 4.6 Z" />
      <path d="M3.4 10.8 L4 5 H6 L6.6 10.8 Z" />
    </>
  ),
};

function Man({ kind, fill, stroke }: { kind: keyof typeof CHESSMAN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <g fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ}>
        {CHESSMAN[kind]}
      </g>
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders. */
function TargetHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <Ring delayMs={delayMs} color={tint(p1, 0.85)} size={88} />
      <span className="bwp-target absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 80}ms` }}>{glyph}</span>
      <Glint delayMs={delayMs + 200} color={tint(p0, 0.9)} left={12} top={14} size={22} />
    </span>
  );
}

/** The ENTRANCE cut: the card arriving in a hand, at ~56% of the crop. Same
 * palette and the play's own central object, three short beats (the light
 * gathers, the object arrives, two glints settle off it), and no board
 * takeover — nothing here leaves the one square it is mounted on. `mark` is
 * the scene's own central object; without one the card's device stands in. */
function EntranceCut({ palette, glyph, delayMs, mark }: { palette: Palette; glyph: ReactNode; delayMs: number; mark?: ReactNode }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      {/* tell: the light gathers behind the card */}
      <span
        className="bwp-facein absolute block rounded-full"
        style={{ left: "18%", top: "18%", width: "64%", height: "64%", background: `radial-gradient(circle, ${tint(p0, 0.55)}, transparent 70%)`, animationDelay: `${delayMs}ms` }}
      />
      {/* strike: the central object rises into the crop */}
      <span className="bwp-rise absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 150}ms` }}>
        {mark ?? glyph}
      </span>
      {/* settle: two sparks drift off it */}
      <Glint delayMs={delayMs + 430} color={tint(p1, 0.95)} left={64} top={22} size={12} />
      <Glint delayMs={delayMs + 530} color={tint(p2, 0.9)} left={24} top={66} size={9} />
    </span>
  );
}

/** Each shared template's central object, drawn small enough to carry an
 * entrance on its own. Kept beside EntranceCut so the card arriving in a hand
 * and the card being played show the SAME thing. */
const MARK: Record<string, (p: Palette) => ReactNode> = {
  halo: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="6.4" fill={tint(p0, 0.3)} stroke={tint(p1, 0.95)} strokeWidth="0.9" />
      <circle cx="10" cy="10" r="4.4" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.4" strokeDasharray="1.4 1" />
      <path d="M10 0.6 V3 M10 17 V19.4 M0.6 10 H3 M17 10 H19.4" stroke={tint(p1, 0.9)} strokeWidth="0.8" {...SJ} />
    </svg>
  ),
  chest: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M3.4 9.6 C3.4 6 6.4 4 10 4 C13.6 4 16.6 6 16.6 9.6 Z" fill={tint(p1, 0.7)} stroke={p2} strokeWidth="0.7" {...SJ} />
      <rect x="3.4" y="10.2" width="13.2" height="6" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.7" />
      <rect x="9.1" y="10.8" width="1.8" height="2.8" fill={tint(p1, 0.95)} />
    </svg>
  ),
  anvil: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M2.6 7.6 H14.4 C16.6 7.6 17.6 8.6 17.8 10.2 L14.6 10.2 C13.6 12 12 12.6 10.4 12.6 H8 V15.4 H12 V17 H5.4 V15.4 H6.6 V12.6 H4.4 C3 12.6 2.6 11.4 2.6 10 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.7" {...SJ} />
      <path d="M4.6 5 L9 3" stroke={tint(p1, 0.95)} strokeWidth="1.2" {...SJ} />
    </svg>
  ),
  scroll: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <rect x="3" y="5.4" width="14" height="9.2" fill="#f4ead2" stroke={p2} strokeWidth="0.6" />
      <path d="M5.4 8 H14 M5.4 10 H12.6 M5.4 12 H11" stroke={tint(p0, 0.85)} strokeWidth="0.55" strokeLinecap="round" />
      <circle cx="14.6" cy="12.6" r="1.9" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.5" />
    </svg>
  ),
  falcon: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M1.6 12.6 C6.4 13.6 9.8 11.4 11.8 6.6 C13.2 10.4 16.4 12 18.6 11 C15.8 15.6 10.4 18 6 16.8 C3.6 16.2 2 14.8 1.6 12.6 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
      <path d="M2.4 5 H12 M5 7.4 H14.6" stroke={tint(p0, 0.85)} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  ),
};

/* =============================================================================
   Template 1: DawnHalo — a dawn sun-disc settles over the board centre, eight
   rays wheel out, and the card's device burns in the disc (miracles / wards).
   ========================================================================== */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
function DawnHalo({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.halo(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* the disc, settling out of the sky */}
      <span className="bwp-drop absolute block" style={{ left: "36%", top: "24%", width: "28%", height: "28%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill={tint(p1, 0.28)} stroke={tint(p1, 0.95)} strokeWidth="0.8" />
          <circle cx="10" cy="10" r="6.2" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.45" strokeDasharray="1.6 1.1" />
        </svg>
        <span className="bwp-facein absolute block" style={{ left: "30%", top: "30%", width: "40%", height: "40%", animationDelay: `${delayMs + 480}ms` }}>{glyph}</span>
      </span>
      {/* the rays wheel out of the disc */}
      {RAYS.map((r, i) => (
        <Beam key={r} delayMs={delayMs + 380 + i * 40} color={tint(p1, 0.75)} left={50} top={37.5} w={17} rot={`${r}deg`} />
      ))}
      <Ring delayMs={delayMs + 620} color={tint(p1, 0.8)} />
      {/* bespoke: Divine Right — the king stands under the disc while two
          peasant pawns rattle at him and the law's red bar stamps them out */}
      {flourish === "edict" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46.5%", top: "52%", width: "7%", height: "10.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[36, 58].map((l, i) => (
            <span key={l} className="absolute block" style={{ left: `${l}%`, top: "56%", width: "5%", height: "7.5%" }}>
              <span className="bwp-shiver absolute inset-0 block" style={{ animationDelay: `${delayMs + 640 + i * 130}ms` }}>
                <Man kind="p" fill={tint(p2, 0.9)} stroke={p0} />
              </span>
              <Beam delayMs={delayMs + 820 + i * 130} color="rgba(214,35,79,0.9)" left={-18} top={44} w={135} h={11} rot="-24deg" />
            </span>
          ))}
        </>
      )}
      {/* bespoke: Pioneer's Banner — the pole plants at the frontier line, the
          pennant snaps open, and a pawn strides across into the far half */}
      {flourish === "banner" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "49.4%", top: "42%", width: "1.2%", height: "16%", background: tint(p2, 0.95), animationDelay: `${delayMs + 560}ms` }} />
          <Beam delayMs={delayMs + 700} color={tint(p1, 0.95)} left={50.6} top={43} w={9} h={4} />
          <span className="bwp-cross absolute block" style={{ left: "38%", top: "50%", width: "5.5%", height: "8%", "--dx": "170%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* bespoke: Diplomatic Immunity — the sealed letter of passage drops
          before the envoy and the border bars slide apart to let him stand */}
      {flourish === "laissez" && (
        <>
          <span className="bwp-drop absolute block" style={{ left: "42%", top: "50%", width: "10%", height: "7%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.8" width="10.8" height="6.4" rx="0.8" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.45" />
              <circle cx="9" cy="5.4" r="1.2" fill="#c94a3a" />
              <path d="M2 2.6 H7.4 M2 4 H6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bwp-cross absolute block" style={{ left: "30%", top: "60.5%", width: "16%", height: "1.2%", background: tint(p2, 0.85), "--dx": "-70%", animationDelay: `${delayMs + 740}ms` } as CSSProperties} />
          <span className="bwp-cross absolute block" style={{ left: "54%", top: "60.5%", width: "16%", height: "1.2%", background: tint(p2, 0.85), "--dx": "70%", animationDelay: `${delayMs + 740}ms` } as CSSProperties} />
          <span className="bwp-hold absolute block" style={{ left: "47%", top: "58%", width: "6%", height: "9%", animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* bespoke: Deathless Oath — the sworn piece sinks into the boards on
          one side and re-rises whole on the other, feathers of light adrift */}
      {flourish === "rebirth" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "36%", top: "54%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="n" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="bwp-rise absolute block" style={{ left: "56%", top: "53%", width: "6%", height: "9%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1000} color={tint(p1, 0.95)} left={55} top={50} />
          <Glint delayMs={delayMs + 1100} color={tint(p1, 0.8)} left={62} top={55} size={2.4} />
        </>
      )}
      {/* wave3 Bishop's Blessing — a knight lunges at the warded bishop and is bounced away */}
      {flourish === "b3ward" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46.5%", top: "54%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-snapdash absolute block" style={{ left: "30%", top: "55%", width: "5.5%", height: "8%", "--dx": "230%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <Glint delayMs={delayMs + 1040} color={tint(p1, 0.95)} left={44} top={52} />
        </>
      )}
      {/* wave3 Shield Wall — two flanking pawns lock edge to edge under one bar */}
      {flourish === "phalanx3" && (
        <>
          {[42, 51].map((l, i) => (
            <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "54%", width: "5%", height: "8%", animationDelay: `${delayMs + 600 + i * 90}ms` }}>
              <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          ))}
          <span className="bwp-beam absolute block" style={{ left: "41%", top: "52.5%", width: "15%", height: "1.4%", background: tint(p1, 0.9), transformOrigin: "0% 50%", animationDelay: `${delayMs + 820}ms` }} />
        </>
      )}
      {/* wave3 King's Shield — a half-shield slides in front of the crown */}
      {flourish === "kingfront" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "47%", top: "56%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-drop absolute block" style={{ left: "45%", top: "48%", width: "10%", height: "8%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1 H11 V4 C11 6.4 8.4 7.6 6 7.6 C3.6 7.6 1 6.4 1 4 Z" fill={tint(p1, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Praetorian — a ring of guards closes around the queen */}
      {flourish === "praetor" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "46.5%", top: "50%", width: "7%", height: "11%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[38, 58].map((l, i) => (
            <span key={l} className="bwp-cross absolute block" style={{ left: `${l}%`, top: "52%", width: "5%", height: "8%", "--dx": i ? "-100%" : "100%", animationDelay: `${delayMs + 720 + i * 90}ms` } as CSSProperties}>
              <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
            </span>
          ))}
        </>
      )}
      {/* wave3 Watchword — a pawn sentry lights up whatever it guards */}
      {flourish === "sentry" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "39%", top: "56%", width: "5%", height: "8%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Beam delayMs={delayMs + 740} color={tint(p1, 0.85)} left={44} top={54} w={12} h={1} rot="-22deg" />
          <span className="bwp-facein absolute block" style={{ left: "54%", top: "48%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 860}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={56} top={46} size={2.6} />
        </>
      )}
      {/* wave3 Vantage Point — pieces on the far ranks gain a mountaintop glint */}
      {flourish === "vantage" && (
        <>
          {[38, 50, 62].map((l, i) => (
            <span key={l} className="bwp-hold absolute block" style={{ left: `${l}%`, top: "36%", width: "5%", height: "8%", animationDelay: `${delayMs + 620 + i * 90}ms` }}>
              <Man kind={(["n", "r", "b"] as const)[i]} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          ))}
          {[40, 52, 64].map((l, i) => (
            <Glint key={l} delayMs={delayMs + 900 + i * 90} color={tint(p1, 0.95)} left={l} top={33} size={2.4} />
          ))}
        </>
      )}
      {/* wave3 Hallowed Ground — a consecration circle burns onto one square, the king blinks into it */}
      {flourish === "hallow" && (
        <>
          <span className="bwp-stamp absolute block" style={{ left: "52%", top: "52%", width: "11%", height: "11%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p1, 0.28)} stroke={tint(p1, 0.95)} strokeWidth="0.7" />
              <circle cx="6" cy="6" r="3.2" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.4" strokeDasharray="1.4 1" />
            </svg>
          </span>
          <span className="bwp-cross absolute block" style={{ left: "34%", top: "54%", width: "6%", height: "9%", "--dx": "260%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={56} top={52} />
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 2: Reliquary — a reliquary chest slides up mid-board, its lid
   swings back, and a column of light carries the card's device out of it.
   ========================================================================== */
function Reliquary({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.chest(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* the chest rises */}
      <span className="bwp-rise absolute block" style={{ left: "40%", top: "50%", width: "20%", height: "13%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 20 13" className="block h-full w-full" aria-hidden="true">
          <rect x="1" y="4.4" width="18" height="8" rx="1.2" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.6" />
          <path d="M1 5.4 H19 M10 5.4 V8.2" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
          <circle cx="10" cy="8.6" r="0.9" fill={tint(p1, 0.95)} />
        </svg>
        {/* the lid, swinging open */}
        <span className="bwp-lid absolute block" style={{ left: "2%", top: "12%", width: "96%", height: "26%", transformOrigin: "0% 100%", animationDelay: `${delayMs + 460}ms` }}>
          <svg viewBox="0 0 19 4" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 3.6 C0.6 0.8 18.4 0.8 18.4 3.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.5" />
          </svg>
        </span>
      </span>
      {/* the light column and the risen device */}
      <span className="bwp-gate absolute block" style={{ left: "45%", top: "30%", width: "10%", height: "22%", transformOrigin: "50% 100%", background: `linear-gradient(180deg, transparent, ${tint(p1, 0.5)})`, animationDelay: `${delayMs + 620}ms` }} />
      <span className="bwp-facein absolute block" style={{ left: "44.5%", top: "27%", width: "11%", height: "11%", animationDelay: `${delayMs + 720}ms` }}>{glyph}</span>
      <Ring delayMs={delayMs + 780} color={tint(p1, 0.8)} />
      {/* bespoke: Spoils of War — the prisoner climbs out in enemy grey and
          the crossfade turns his coat to your colors */}
      {flourish === "defector" && (
        <span className="absolute block" style={{ left: "56%", top: "40%", width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 700}ms` }}>
            <Man kind="r" fill="#8a94a8" stroke="#3a3a40" />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 700}ms` }}>
            <Man kind="r" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
        </span>
      )}
      {/* bespoke: Prisoner Exchange — two prisoners arc over the chest in
          opposite directions, each heading home */}
      {flourish === "exchange" && (
        <>
          <span className="bwp-arc absolute block" style={{ left: "44%", top: "44%", width: "6%", height: "9%", "--dx": "-190%", "--dy": "36%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-arc absolute block" style={{ left: "50%", top: "44%", width: "6%", height: "9%", "--dx": "190%", "--dy": "36%", animationDelay: `${delayMs + 780}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
        </>
      )}
      {/* bespoke: Highwayman's Toll — coins rain into the open chest while
          the little hourglass keels over, robbed */}
      {flourish === "toll" && (
        <>
          {[44, 49, 54].map((l, i) => (
            <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: "40%", width: "2.6%", height: "2.6%", background: tint(p1, 0.95), border: `1px solid ${p2}`, animationDelay: `${delayMs + 640 + i * 110}ms` }} />
          ))}
          <span className="bwp-tip absolute block" style={{ left: "60%", top: "44%", width: "4.5%", height: "7%", transformOrigin: "50% 90%", animationDelay: `${delayMs + 780}ms` }}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <path d="M1 0.8 H5 L3.4 4.5 L5 8.2 H1 L2.6 4.5 Z" fill="none" stroke={tint(p2, 0.95)} strokeWidth="0.55" {...SJ} />
              <path d="M2 1.6 H4 L3 3.8 Z" fill={tint(p1, 0.9)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Queen's Testament — the queen ascends and fades above the
          chest while her two wards rise below, paid out in full */}
      {flourish === "testament" && (
        <>
          <span className="bwp-ascend absolute block" style={{ left: "46.5%", top: "34%", width: "7%", height: "10.5%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-rise absolute block" style={{ left: "36%", top: "52%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="n" fill={tint(p1, 0.92)} stroke={p2} />
          </span>
          <span className="bwp-rise absolute block" style={{ left: "58%", top: "52%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 980}ms` }}>
            <Man kind="b" fill={tint(p1, 0.92)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 First Blood — one red drop falls onto the ticking dial and speeds it */}
      {flourish === "firstblood" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "43%", top: "40%", width: "10%", height: "10%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.7)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.8 M6 6 L8.2 7" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bwp-rain absolute block" style={{ left: "48%", top: "28%", width: "3%", height: "4%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#d6234f" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={53} top={40} size={2.6} />
        </>
      )}
      {/* wave3 Postern Gate — a small side door swings open in the keep wall */}
      {flourish === "postern" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "55%", top: "44%", width: "10%", height: "16%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M1 15 V3 H9 V15" fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
          <span className="bwp-lid absolute block" style={{ left: "56%", top: "48%", width: "4%", height: "11%", transformOrigin: "0% 50%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 4 11" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <rect x="0.4" y="0.4" width="3.2" height="10.2" rx="0.5" fill={tint(p0, 0.9)} stroke={tint(p1, 0.9)} strokeWidth="0.4" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.9)} left={58} top={52} size={2.4} />
        </>
      )}
      {/* wave3 Coronation Bonus — a crown lands and the clock dial jumps forward */}
      {flourish === "coronclock" && (
        <>
          <span className="bwp-rain absolute block" style={{ left: "42%", top: "34%", width: "9%", height: "7%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill={tint(p1, 0.95)} stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <span className="bwp-facein absolute block" style={{ left: "55%", top: "44%", width: "8%", height: "8%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.6 M6 6 L8.4 6" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={58} top={42} size={2.6} />
        </>
      )}
      {/* wave3 Plunderer's Ledger — coins drop into a ledger that flips a reroll die */}
      {flourish === "ledger" && (
        <>
          {[42, 47, 52].map((l, i) => (
            <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: "38%", width: "2.6%", height: "2.6%", background: tint(p1, 0.95), border: `1px solid ${p2}`, animationDelay: `${delayMs + 660 + i * 110}ms` }} />
          ))}
          <span className="bwp-facein absolute block" style={{ left: "57%", top: "44%", width: "7%", height: "7%", animationDelay: `${delayMs + 900}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1.2" fill="#e8dcc0" stroke={p2} strokeWidth="0.5" />
              <circle cx="3.4" cy="3.4" r="0.7" fill={p2} />
              <circle cx="6.6" cy="6.6" r="0.7" fill={p2} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Eleventh Hour — a grave-lantern lifts a fallen piece at the last tick */}
      {flourish === "eleventh" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "37%", top: "40%", width: "7%", height: "12%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
              <path d="M3 2 H7 L6.4 4 H3.6 Z M2.6 4 H7.4 V12 H2.6 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.9)} strokeWidth="0.5" {...SJ} />
              <circle cx="5" cy="8" r="2.2" fill={tint(p1, 0.85)} />
            </svg>
          </span>
          <span className="bwp-rise absolute block" style={{ left: "55%", top: "50%", width: "6%", height: "9%", animationDelay: `${delayMs + 900}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1160} color={tint(p1, 0.95)} left={57} top={48} />
        </>
      )}
      {/* wave3 Deep Position — a flag plants deep in enemy ground, the dial jumps */}
      {flourish === "deeptime" && (
        <>
          <span className="bwp-gate absolute block" style={{ left: "43%", top: "34%", width: "1.2%", height: "16%", transformOrigin: "50% 100%", background: tint(p2, 0.95), animationDelay: `${delayMs + 640}ms` }} />
          <Beam delayMs={delayMs + 800} color={tint(p1, 0.95)} left={44.2} top={35} w={9} h={4} />
          <span className="bwp-facein absolute block" style={{ left: "57%", top: "42%", width: "8%", height: "8%", animationDelay: `${delayMs + 940}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.6 M6 6 L8.2 7.2" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Martyr's Gift — a falling piece scatters reroll motes upward */}
      {flourish === "martyrgift" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "44%", top: "42%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-arc absolute block rounded-full" style={{ left: `${44 + i * 4}%`, top: "48%", width: "1.8%", height: "1.8%", background: tint(p1, 0.95), "--dx": `${(i - 1) * 90}%`, "--dy": "-140%", animationDelay: `${delayMs + 860 + i * 90}ms` } as CSSProperties} />
          ))}
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 3: AstralAnvil — the alchemist's anvil rises mid-board, the hammer
   falls once, and the work is remade inside the strike flash.
   ========================================================================== */
function AstralAnvil({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.anvil(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* the anvil rises */}
      <span className="bwp-rise absolute block" style={{ left: "39%", top: "48%", width: "22%", height: "13%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 22 13" className="block h-full w-full" aria-hidden="true">
          <path d="M2 3 H20 C19 6 15 7.4 12.6 7.4 L13.4 10.6 H8.6 L9.4 7.4 C6 7.4 3 6 2 3 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.6" {...SJ} />
          <path d="M6.4 11 H15.6 V12.4 H6.4 Z" fill={tint(p2, 0.9)} />
        </svg>
      </span>
      {/* the hammer falls */}
      <span className="bwp-hammer absolute block" style={{ left: "46%", top: "28%", width: "9%", height: "13%", transformOrigin: "20% 90%", animationDelay: `${delayMs + 480}ms` }}>
        <svg viewBox="0 0 9 13" className="block h-full w-full" aria-hidden="true">
          <path d="M4.1 4 H4.9 V12.4 H4.1 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.35" />
          <rect x="1.2" y="0.8" width="6.6" height="3.4" rx="0.8" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="0.45" />
        </svg>
      </span>
      {/* the strike flash carries the card's device */}
      <span className="bwp-stamp absolute block" style={{ left: "43.5%", top: "37%", width: "13%", height: "13%", animationDelay: `${delayMs + 760}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4.4" fill={tint(p1, 0.4)} stroke={tint(p1, 0.95)} strokeWidth="0.5" />
        </svg>
        <span className="absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%" }}>{glyph}</span>
      </span>
      <Glint delayMs={delayMs + 820} color={tint(p1, 0.95)} left={41} top={40} />
      <Glint delayMs={delayMs + 900} color={tint(p1, 0.8)} left={57} top={42} size={2.6} />
      <Ring delayMs={delayMs + 840} color={tint(p1, 0.8)} />
      {/* bespoke: Scarecrow — the strawman is hoisted out of the forge smoke
          and roots crook out of the boards at its post */}
      {flourish === "strawman" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "60%", top: "40%", width: "8%", height: "16%", animationDelay: `${delayMs + 860}ms` }}>
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M4 3.4 V14.8 M1 5.6 H7" stroke="#8a6a3a" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M2.4 3.2 L4 1 L5.6 3.2 Z" fill="#c9a84c" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
              <circle cx="4" cy="4" r="1" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" />
            </svg>
          </span>
          <Beam delayMs={delayMs + 1060} color="rgba(63,143,63,0.85)" left={61} top={55.5} w={5} h={1.4} rot="150deg" />
          <Beam delayMs={delayMs + 1140} color="rgba(63,143,63,0.85)" left={66} top={55.5} w={5} h={1.4} rot="30deg" />
        </>
      )}
      {/* bespoke: Masquerade — two masks sail past each other over the anvil,
          each landing where the other rose */}
      {flourish === "masks" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "36%", top: "36%", width: "6%", height: "6%", "--dx": "220%", animationDelay: `${delayMs + 860}ms` } as CSSProperties}>
            <svg viewBox="0 0 8 6" className="block h-full w-full" aria-hidden="true">
              <path d="M0.8 1 C3 0 5 0 7.2 1 C7.2 3.6 5.6 5.4 4 5.4 C2.4 5.4 0.8 3.6 0.8 1 Z" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" {...SJ} />
              <circle cx="2.8" cy="2" r="0.5" fill={p2} />
              <circle cx="5.2" cy="2" r="0.5" fill={p2} />
            </svg>
          </span>
          <span className="bwp-cross absolute block" style={{ left: "58%", top: "42%", width: "6%", height: "6%", "--dx": "-220%", animationDelay: `${delayMs + 940}ms` } as CSSProperties}>
            <svg viewBox="0 0 8 6" className="block h-full w-full" aria-hidden="true">
              <path d="M0.8 1 C3 0 5 0 7.2 1 C7.2 3.6 5.6 5.4 4 5.4 C2.4 5.4 0.8 3.6 0.8 1 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.4" {...SJ} />
              <circle cx="2.8" cy="2" r="0.5" fill={p1} />
              <circle cx="5.2" cy="2" r="0.5" fill={p1} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Alchemist's Trade — on the left a rook flashes into a queen;
          on the right a bishop dwindles to a pawn, the price paid */}
      {flourish === "transmute" && (
        <>
          <span className="absolute block" style={{ left: "33%", top: "38%", width: "6.5%", height: "10%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
              <Man kind="r" fill={tint(p2, 0.92)} stroke={p0} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
              <Man kind="q" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
          <span className="absolute block" style={{ left: "61%", top: "40%", width: "5.5%", height: "8.5%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="b" fill={tint(p1, 0.92)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
            </span>
          </span>
        </>
      )}
      {/* bespoke: Early Coronation — three little crowns drop onto a rank of
          marching pawns well short of the far edge */}
      {flourish === "coronet" && (
        <>
          {[36, 47, 58].map((l, i) => (
            <span key={l} className="absolute block" style={{ left: `${l}%`, top: "36%", width: "5%", height: "7.5%" }}>
              <span className="bwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 820 + i * 90}ms` }}>
                <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
              </span>
              <span className="bwp-rain absolute block" style={{ left: "18%", top: "-46%", width: "64%", height: "46%", animationDelay: `${delayMs + 920 + i * 90}ms` }}>
                <svg viewBox="0 0 6 4" className="block h-full w-full" aria-hidden="true">
                  <path d="M0.8 3.4 L1.2 1 L2.4 2.2 L3 0.6 L3.6 2.2 L4.8 1 L5.2 3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" {...SJ} />
                </svg>
              </span>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Standard Bearer — the pawn hoists a pole twice its height
          and the army's standard unfurls above the anvil */}
      {flourish === "standard" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "59%", top: "45%", width: "5%", height: "8%", animationDelay: `${delayMs + 840}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-gate absolute block" style={{ left: "63.4%", top: "30%", width: "0.9%", height: "16%", transformOrigin: "50% 100%", background: tint(p2, 0.95), animationDelay: `${delayMs + 940}ms` }} />
          <Beam delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={64.3} top={31} w={9} h={4.4} />
        </>
      )}
      {/* wave3 Heir Apparent — a pawn crossfades up into the fallen minor's crest */}
      {flourish === "heir" && (
        <span className="absolute block" style={{ left: "60%", top: "40%", width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
        </span>
      )}
      {/* wave3 Field Knighting — a sword taps a kneeling pawn that rises a knight */}
      {flourish === "knighting" && (
        <>
          <span className="bwp-hammer absolute block" style={{ left: "58%", top: "30%", width: "3%", height: "14%", transformOrigin: "50% 90%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 3 14" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 13 V3 M0.4 3 H2.6 M1.5 3 V0.8" stroke={tint(p2, 0.95)} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="absolute block" style={{ left: "60%", top: "42%", width: "6.5%", height: "10%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 940}ms` }}>
              <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 940}ms` }}>
              <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Battlefield Commission — a field medal pins onto an advancing pawn */}
      {flourish === "commission" && (
        <>
          <span className="bwp-arc absolute block" style={{ left: "58%", top: "52%", width: "6%", height: "9.5%", "--dx": "0%", "--dy": "-70%", animationDelay: `${delayMs + 840}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-stamp absolute block" style={{ left: "60%", top: "42%", width: "4%", height: "4%", animationDelay: `${delayMs + 1020}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="3.4" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" />
              <path d="M5 2 L5.9 4.2 L8 4.4 L6.4 5.9 L6.9 8 L5 6.8 L3.1 8 L3.6 5.9 L2 4.4 L4.1 4.2 Z" fill={p2} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Ironwright's Bargain — a pawn is thrown into the forge, a minor hammered up to a rook */}
      {flourish === "ironwright" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "33%", top: "40%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
          <span className="absolute block" style={{ left: "59%", top: "40%", width: "6.5%", height: "10%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="b" fill={tint(p1, 0.92)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="r" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Second Face — a bishop mask flips to reveal a knight crest beneath */}
      {flourish === "archbishop" && (
        <>
          <span className="absolute block" style={{ left: "44%", top: "40%", width: "7%", height: "11%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 840}ms` }}>
              <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 840}ms` }}>
              <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
          <span className="bwp-cross absolute block" style={{ left: "40%", top: "42%", width: "5%", height: "6%", "--dx": "80%", animationDelay: `${delayMs + 1000}ms` } as CSSProperties}>
            <svg viewBox="0 0 8 6" className="block h-full w-full" aria-hidden="true">
              <path d="M0.8 1 C3 0 5 0 7.2 1 C7.2 3.6 5.6 5.4 4 5.4 C2.4 5.4 0.8 3.6 0.8 1 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 4: PactScroll — a great pact unrolls across the board, the quill
   flashes its signature, and the wax seal thumps down beside the device.
   ========================================================================== */
function PactScroll({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.scroll(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* the scroll unrolls left to right */}
      <span className="bwp-unroll absolute block" style={{ left: "28%", top: "42%", width: "44%", height: "14%", transformOrigin: "0% 50%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 44 14" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1.4" y="1.2" width="41.2" height="11.6" rx="1.6" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.6" />
          <path d="M5 4.6 H27 M5 7 H23 M5 9.4 H18" stroke={tint(p0, 0.75)} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      {/* the device inked on the pact, then the signature flash and the seal */}
      <span className="bwp-facein absolute block" style={{ left: "58%", top: "43.5%", width: "9%", height: "9%", animationDelay: `${delayMs + 620}ms` }}>{glyph}</span>
      <Beam delayMs={delayMs + 720} color={tint(p1, 0.9)} left={33} top={53} w={18} h={0.8} rot="-4deg" />
      <span className="bwp-stamp absolute block" style={{ left: "36%", top: "47%", width: "6%", height: "6%", animationDelay: `${delayMs + 860}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.6" />
          <circle cx="5" cy="5" r="2.1" fill="none" stroke={p2} strokeWidth="0.45" />
        </svg>
      </span>
      <Ring delayMs={delayMs + 900} color={tint(p1, 0.8)} />
      {/* bespoke: Ascetic's Bargain — one dealt card is pushed away off the
          pact, and the richer fan of three rises where it went */}
      {flourish === "fasting" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "44%", top: "30%", width: "6%", height: "9%", "--dx": "-260%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.4" />
              <path d="M1.6 1.8 L4.4 7.2 M4.4 1.8 L1.6 7.2" stroke={tint(p2, 0.9)} strokeWidth="0.45" strokeLinecap="round" />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rise absolute block" style={{ left: `${48 + i * 4.6}%`, top: "27%", width: "5.5%", height: "8.5%", rotate: `${(i - 1) * 14}deg`, animationDelay: `${delayMs + 940 + i * 90}ms` }}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
                <circle cx="3" cy="4.5" r="1.1" fill="none" stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Blood Price — the offered piece dissolves upward into red
          motes that stream down into the hungry seal */}
      {flourish === "bloodseal" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "33%", top: "29%", width: "6%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rain absolute block rounded-full" style={{ left: `${36 + i * 1.6}%`, top: `${38 + i * 2.2}%`, width: "1.6%", height: "1.6%", background: "#d6234f", animationDelay: `${delayMs + 820 + i * 100}ms` }} />
          ))}
          <Glint delayMs={delayMs + 1140} color="#d6234f" left={37.5} top={47.5} />
        </>
      )}
      {/* bespoke: Jester's Rule — the belled cap shakes over the pact while
          the second, identical trophy is struck from the list */}
      {flourish === "motley" && (
        <>
          <span className="bwp-shiver absolute block" style={{ left: "45%", top: "28%", width: "9%", height: "8%", animationDelay: `${delayMs + 680}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 6.8 C1.4 3.6 2.6 1.6 3.4 3.8 C4 1 6 1 6.6 3.8 C7.4 1.6 8.6 3.6 9 6.8 Z" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.45" {...SJ} />
              <circle cx="1.4" cy="6.4" r="0.6" fill="#ffd76a" />
              <circle cx="5" cy="1.6" r="0.6" fill="#ffd76a" />
              <circle cx="8.6" cy="6.4" r="0.6" fill="#ffd76a" />
            </svg>
          </span>
          {[42, 52].map((l, i) => (
            <span key={l} className="bwp-hold absolute block" style={{ left: `${l}%`, top: "56%", width: "4.6%", height: "7%", animationDelay: `${delayMs + 880 + i * 110}ms` }}>
              <Man kind="r" fill={tint(p2, 0.9)} stroke={p0} />
            </span>
          ))}
          <Beam delayMs={delayMs + 1120} color="rgba(214,35,79,0.9)" left={51} top={59.5} w={7} h={1} rot="-22deg" />
        </>
      )}
      {/* wave3 Home Guard — a fence-line seals the whole home rank */}
      {flourish === "homeward" && (
        <>
          <span className="bwp-beam absolute block" style={{ left: "30%", top: "62%", width: "40%", height: "1.6%", background: tint(p2, 0.95), transformOrigin: "0% 50%", animationDelay: `${delayMs + 720}ms` }} />
          {[32, 40, 48, 56, 64].map((l, i) => (
            <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "58%", width: "1.4%", height: "5%", background: tint(p1, 0.9), animationDelay: `${delayMs + 780 + i * 60}ms` }} />
          ))}
        </>
      )}
      {/* wave3 Double Down — three cards fan out and a stack of chips slides in */}
      {flourish === "doubledown" && (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rise absolute block" style={{ left: `${44 + i * 4.6}%`, top: "28%", width: "5.5%", height: "8.5%", rotate: `${(i - 1) * 15}deg`, animationDelay: `${delayMs + 700 + i * 90}ms` }}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
                <circle cx="3" cy="4.5" r="1.1" fill="none" stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          {[40, 44].map((l, i) => (
            <span key={l} className="bwp-cross absolute block rounded-full" style={{ left: `${l}%`, top: "56%", width: "3%", height: "3%", background: tint(p1, 0.95), border: `1px solid ${p2}`, "--dx": "120%", animationDelay: `${delayMs + 900 + i * 100}ms` } as CSSProperties} />
          ))}
        </>
      )}
      {/* wave3 King's Road — a milestone line paints down one file */}
      {flourish === "kingsroad" && (
        <>
          <span className="bwp-gate absolute block" style={{ left: "49.4%", top: "30%", width: "1.6%", height: "34%", transformOrigin: "50% 100%", background: `linear-gradient(180deg, ${tint(p1, 0.9)}, ${tint(p2, 0.5)})`, animationDelay: `${delayMs + 700}ms` }} />
          {[34, 44, 54].map((t, i) => (
            <span key={t} className="bwp-facein absolute block rounded-full" style={{ left: "48.4%", top: `${t}%`, width: "3.4%", height: "2.4%", background: tint(p1, 0.95), animationDelay: `${delayMs + 860 + i * 100}ms` }} />
          ))}
        </>
      )}
      {/* wave3 Futures Market — three cards deal, one glows apex-gold, two burn away */}
      {flourish === "futures" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "47%", top: "26%", width: "6%", height: "9%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="5" height="8" rx="0.8" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" />
              <path d="M3 2 L3.7 3.8 L5.6 3.8 L4.1 5 L4.6 6.9 L3 5.8 L1.4 6.9 L1.9 5 L0.4 3.8 L2.3 3.8 Z" fill="#8a6a3a" />
            </svg>
          </span>
          {[36, 58].map((l, i) => (
            <span key={l} className="bwp-cross absolute block" style={{ left: `${l}%`, top: "30%", width: "5%", height: "7.5%", rotate: `${i ? 14 : -14}deg`, "--dx": i ? "160%" : "-160%", animationDelay: `${delayMs + 940 + i * 90}ms` } as CSSProperties}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          <Glint delayMs={delayMs + 1160} color="#ffd76a" left={49} top={26} />
        </>
      )}
      {/* wave3 Castle in the Storm — king and rook slam into castled rank amid arrows */}
      {flourish === "stormcastle" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "40%", top: "52%", width: "6%", height: "9.5%", "--dx": "70%", animationDelay: `${delayMs + 780}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "56%", top: "52%", width: "5.5%", height: "9%", "--dx": "-80%", animationDelay: `${delayMs + 780}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[30, 66].map((l, i) => (
            <Beam key={l} delayMs={delayMs + 920 + i * 80} color={tint(p2, 0.85)} left={l} top={40 + i * 4} w={14} h={0.9} rot={i ? "150deg" : "26deg"} />
          ))}
        </>
      )}
      {/* wave3 Last Muster — three faint pawns rise from the ground (they will fade) */}
      {flourish === "muster" && (
        <>
          {[40, 50, 60].map((l, i) => (
            <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "50%", width: "5%", height: "8%", opacity: 0.72, animationDelay: `${delayMs + 720 + i * 130}ms` }}>
              <Man kind="p" fill={tint(p1, 0.85)} stroke={p2} />
            </span>
          ))}
          <Glint delayMs={delayMs + 1160} color={tint(p1, 0.9)} left={50} top={46} size={2.4} />
        </>
      )}
      {/* wave3 Funeral Pyre — a chosen piece ignites, a ring blast clears its neighbors */}
      {flourish === "pyre" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "47%", top: "44%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 700}ms` }}>
            <Man kind="b" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="bwp-stamp absolute block rounded-full" style={{ left: "40%", top: "40%", width: "20%", height: "20%", border: `3px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 900}ms` }} />
          {[38, 52, 60].map((l, i) => (
            <span key={l} className="bwp-arc absolute block rounded-full" style={{ left: `${l}%`, top: "48%", width: "2%", height: "2%", background: "#ff9d3d", "--dx": `${(i - 1) * 130}%`, "--dy": "-120%", animationDelay: `${delayMs + 980 + i * 70}ms` } as CSSProperties} />
          ))}
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 5: FalconDash — speed lines rake the crop and a falcon-comet
   streaks through, the card's device flaring at the strike point.
   ========================================================================== */
function FalconDash({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.falcon(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.2)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* speed lines */}
      {[34, 44, 56].map((t, i) => (
        <Beam key={t} delayMs={delayMs + 120 + i * 70} color={tint(p1, 0.55)} left={26} top={t} w={30 - i * 4} h={0.8} />
      ))}
      {/* the comet crosses the crop */}
      <span className="bwp-cross absolute block" style={{ left: "28%", top: "45%", width: "7%", height: "6%", "--dx": "480%", animationDelay: `${delayMs + 320}ms` } as CSSProperties}>
        <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 3 C3 1.4 6 1 9.4 3 C6 5 3 4.6 0.6 3 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.4" {...SJ} />
          <circle cx="7.6" cy="3" r="0.7" fill={p2} />
        </svg>
      </span>
      <span className="bwp-facein absolute block" style={{ left: "44%", top: "34%", width: "12%", height: "12%", animationDelay: `${delayMs + 640}ms` }}>{glyph}</span>
      <Ring delayMs={delayMs + 720} color={tint(p1, 0.8)} />
      {/* bespoke: Hit and Run — the raider darts out, the strike flashes at
          the far end, and he snaps back to the exact square he left */}
      {flourish === "raid" && (
        <>
          <span className="bwp-snapdash absolute block" style={{ left: "34%", top: "52%", width: "6%", height: "9%", "--dx": "300%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 900} color={tint(p1, 0.95)} left={57} top={53} />
          <Glint delayMs={delayMs + 1320} color={tint(p2, 0.9)} left={35} top={52} size={2.6} />
        </>
      )}
      {/* bespoke: Ancient Custom — the pawn slips diagonally PAST its
          neighbour, and the ghost of the bypassed pawn fades where it stood */}
      {flourish === "passant" && (
        <>
          <span className="bwp-arc absolute block" style={{ left: "42%", top: "56%", width: "5.5%", height: "8.5%", "--dx": "130%", "--dy": "-110%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <span className="bwp-sink absolute block" style={{ left: "49%", top: "56%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 860}ms` }}>
            <Man kind="p" fill={tint(p2, 0.75)} stroke={p0} />
          </span>
        </>
      )}
      {/* bespoke: Cornered King — the king backed to the board's corner posts
          lights an L-shaped knight path out of the trap */}
      {flourish === "cornered" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "33%", top: "56%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-gate absolute block" style={{ left: "36%", top: "42%", width: "1.1%", height: "13%", transformOrigin: "50% 100%", background: tint(p1, 0.9), animationDelay: `${delayMs + 800}ms` }} />
          <Beam delayMs={delayMs + 960} color={tint(p1, 0.9)} left={36.5} top={42.5} w={8} h={1.1} />
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={44} top={40} />
        </>
      )}
      {/* bespoke: Blood Duel — the two matched duelists charge from opposite
          wings and meet in one shattering flash */}
      {flourish === "duel" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "32%", top: "52%", width: "6%", height: "9%", "--dx": "220%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "62%", top: "52%", width: "6%", height: "9%", "--dx": "-220%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="bwp-stamp absolute block" style={{ left: "46%", top: "50%", width: "8%", height: "8%", animationDelay: `${delayMs + 980}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill={tint(p1, 0.9)} />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1100} color={tint(p1, 0.9)} left={43} top={47} size={2.8} />
          <Glint delayMs={delayMs + 1160} color={tint(p2, 0.9)} left={55} top={49} size={2.8} />
        </>
      )}
      {/* wave3 Forced March — two pawns spring two ranks forward at once */}
      {flourish === "march2" && (
        <>
          {[40, 56].map((l, i) => (
            <span key={l} className="bwp-arc absolute block" style={{ left: `${l}%`, top: "60%", width: "5%", height: "8%", "--dx": "0%", "--dy": "-150%", animationDelay: `${delayMs + 620 + i * 130}ms` } as CSSProperties}>
              <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          ))}
          <Glint delayMs={delayMs + 1020} color={tint(p1, 0.92)} left={42} top={42} size={2.4} />
          <Glint delayMs={delayMs + 1100} color={tint(p1, 0.85)} left={58} top={42} size={2.4} />
        </>
      )}
      {/* wave3 Royal Caper — a check-ray rakes in, the king vaults away in an L */}
      {flourish === "caper" && (
        <>
          <Beam delayMs={delayMs + 560} color="rgba(214,35,79,0.85)" left={24} top={45} w={22} h={1.2} rot="16deg" />
          <span className="bwp-arc absolute block" style={{ left: "40%", top: "58%", width: "6.5%", height: "10%", "--dx": "120%", "--dy": "-120%", animationDelay: `${delayMs + 660}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={54} top={44} />
        </>
      )}
      {/* wave3 Tunnelers — the rook drills clean through a screen of its own pawns */}
      {flourish === "tunnel" && (
        <>
          {[46, 52, 58].map((l, i) => (
            <span key={l} className="bwp-hold absolute block" style={{ left: `${l}%`, top: "52%", width: "4.5%", height: "7%", animationDelay: `${delayMs + 560 + i * 60}ms` }}>
              <Man kind="p" fill={tint(p2, 0.55)} stroke={p0} />
            </span>
          ))}
          <span className="bwp-cross absolute block" style={{ left: "30%", top: "51%", width: "6%", height: "9%", "--dx": "400%", animationDelay: `${delayMs + 660}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.9)} left={64} top={50} size={2.6} />
        </>
      )}
      {/* wave3 Rally to the King — a piece snaps clear across to the king's side */}
      {flourish === "rally" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "58%", top: "52%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "28%", top: "53%", width: "5.5%", height: "8.5%", "--dx": "380%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={55} top={50} />
        </>
      )}
      {/* wave3 Underdog's Gambit — the scrappy pawn jabs to both sides at once */}
      {flourish === "sidejab" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46%", top: "54%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Beam delayMs={delayMs + 700} color={tint(p1, 0.9)} left={51} top={57} w={8} h={1.4} />
          <Beam delayMs={delayMs + 780} color={tint(p1, 0.8)} left={41} top={57} w={8} h={1.4} rot="180deg" />
          <Glint delayMs={delayMs + 960} color={tint(p1, 0.95)} left={58} top={55} size={2.6} />
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Tier 7-8 bespoke scenes — one Render per card, larger presentation: wash,
   double shock ring, board-edge glow, no shared template machinery.
   ========================================================================== */

/** Kingmaker's Pact — the unseen hand lowers an outsized crown onto a throne
 * built of dealt cards while the tier-pips climb and gold rains. */
function KingmakerScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#c9a84c", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw2_kingmakers_pact} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#c9a84c", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw2_kingmakers_pact} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(42,28,8,0.34)" delayMs={delayMs} />
      {/* tell: the unseen hand's light gathers over the empty table */}
      <Tell color="rgba(255,215,106,0.5)" delayMs={delayMs + 220} left={40} top={40} />
      {/* the card-throne stacks itself */}
      {[0, 1, 2].map((i) => (
        <span key={i} className="bwp-rise absolute block" style={{ left: `${43 - i * 2.4}%`, top: `${56 - i * 5}%`, width: `${14 + i * 4.8}%`, height: "6%", animationDelay: `${delayMs + 160 + (2 - i) * 130}ms` }}>
          <svg viewBox="0 0 16 5" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="15" height="4" rx="0.9" fill="rgba(201,168,76,0.92)" stroke="#2a1c08" strokeWidth="0.4" />
            <path d="M2.4 2.5 H13.6" stroke="#2a1c08" strokeWidth="0.35" strokeDasharray="1.2 0.9" />
          </svg>
        </span>
      ))}
      {/* the crown descends from beyond the top of the world */}
      <span className="bwp-drop absolute block" style={{ left: "42%", top: "30%", width: "16%", height: "12%", animationDelay: `${delayMs + 560}ms` }}>
        <svg viewBox="0 0 16 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 10.4 L1.4 3.4 L5 6.2 L8 2 L11 6.2 L14.6 3.4 L14 10.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.6" {...SJ} />
          <circle cx="8" cy="8" r="1" fill="#d6234f" />
        </svg>
      </span>
      {/* the tier-pips climb — every future deal, one step higher */}
      {[0, 1, 2, 3].map((i) => (
        <Glint key={i} delayMs={delayMs + 760 + i * 110} color="#ffd76a" left={66} top={58 - i * 7} size={2.8 + i * 0.5} />
      ))}
      {/* the forfeited reroll die tumbles away off the pact */}
      <span className="bwp-cross absolute block" style={{ left: "32%", top: "58%", width: "4.6%", height: "4.6%", "--dx": "-240%", animationDelay: `${delayMs + 880}ms` } as CSSProperties}>
        <svg viewBox="0 0 6 6" className="block h-full w-full" aria-hidden="true">
          <rect x="0.6" y="0.6" width="4.8" height="4.8" rx="1" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
          <circle cx="2" cy="2" r="0.5" fill="#4a3a22" />
          <circle cx="4" cy="4" r="0.5" fill="#4a3a22" />
        </svg>
      </span>
      {/* gold rain */}
      {[34, 46, 58, 66].map((l, i) => (
        <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: `${30 + (i % 2) * 6}%`, width: "1.8%", height: "1.8%", background: "#ffd76a", animationDelay: `${delayMs + 1020 + i * 80}ms` }} />
      ))}
      <Ring delayMs={delayMs + 900} color="rgba(255,215,106,0.85)" />
      <Ring delayMs={delayMs + 1120} color="rgba(255,215,106,0.55)" size={84} />
      <EdgeGlow delayMs={delayMs + 980} color="rgba(255,215,106,0.4)" />
    </Stage>
  );
}

/** Bolt Hole — check-rays close on the king, the wall opens its secret door,
 * and the king is simply not there anymore. */
function BoltHoleScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5a6b8f", "#cdd6ff", "#1c1c2a"]} glyph={GLYPH.bw2_bolt_hole} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5a6b8f", "#cdd6ff", "#1c1c2a"]} glyph={GLYPH.bw2_bolt_hole} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(28,28,42,0.36)" delayMs={delayMs} />
      {/* the check-rays converge on the king */}
      {["12deg", "168deg", "-36deg"].map((rot, i) => (
        <Beam key={rot} delayMs={delayMs + 140 + i * 90} color="rgba(214,35,79,0.85)" left={i === 1 ? 66 : 30} top={38 + i * 8} w={20} h={1.2} rot={rot} />
      ))}
      <span className="bwp-shiver absolute block" style={{ left: "43%", top: "44%", width: "7%", height: "11%", animationDelay: `${delayMs + 380}ms` }}>
        <Man kind="k" fill="#cdd6ff" stroke="#1c1c2a" />
      </span>
      {/* the secret door swings out of the masonry */}
      <span className="bwp-rise absolute block" style={{ left: "58%", top: "40%", width: "9%", height: "15%", animationDelay: `${delayMs + 520}ms` }}>
        <svg viewBox="0 0 9 15" className="block h-full w-full" aria-hidden="true">
          <path d="M1 14 V5 C1 1.6 8 1.6 8 5 V14" fill="#12081f" stroke="#8f6bff" strokeWidth="0.6" {...SJ} />
          <path d="M2.4 14 V5.6 C2.4 3.2 6.6 3.2 6.6 5.6 V14" fill="none" stroke="rgba(143,107,255,0.6)" strokeWidth="0.4" />
          <circle cx="6.4" cy="9" r="0.5" fill="#6fe3ff" />
        </svg>
      </span>
      {/* the king bolts through and re-rises far across the stage */}
      <span className="bwp-cross absolute block" style={{ left: "44%", top: "45%", width: "6.5%", height: "10%", "--dx": "260%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
        <Man kind="k" fill="#cdd6ff" stroke="#1c1c2a" />
      </span>
      <span className="bwp-rise absolute block" style={{ left: "30%", top: "30%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 1120}ms` }}>
        <Man kind="k" fill="#e8f0ff" stroke="#5a6b8f" />
      </span>
      <Glint delayMs={delayMs + 1240} color="#6fe3ff" left={29} top={28} />
      <Ring delayMs={delayMs + 940} color="rgba(143,107,255,0.8)" />
      <Ring delayMs={delayMs + 1160} color="rgba(111,227,255,0.55)" size={84} />
      <EdgeGlow delayMs={delayMs + 1000} color="rgba(143,107,255,0.38)" />
    </Stage>
  );
}

/** Carnival of Masks — the carousel spins the whole court and hands every
 * piece back under somebody else's hat. */
function CarnivalScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#c94ad1", "#ffd76a", "#2a1030"]} glyph={GLYPH.bw2_carnival_of_masks} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#c94ad1", "#ffd76a", "#2a1030"]} glyph={GLYPH.bw2_carnival_of_masks} delayMs={delayMs} />;
  const riders: { k: keyof typeof CHESSMAN; swap: keyof typeof CHESSMAN; l: number; t: number }[] = [
    { k: "r", swap: "b", l: 46.75, t: 28 },
    { k: "n", swap: "q", l: 64, t: 45 },
    { k: "b", swap: "n", l: 46.75, t: 62 },
    { k: "q", swap: "r", l: 29.5, t: 45 },
  ];
  return (
    <Stage>
      <Wash color="rgba(42,16,48,0.36)" delayMs={delayMs} />
      {/* confetti */}
      {["#ffd76a", "#6fe3ff", "#c94ad1", "#a8e07f", "#ff9d3d", "#e3d0ff"].map((c, i) => (
        <span key={c} className="bwp-rain absolute block" style={{ left: `${32 + i * 7}%`, top: `${26 + (i % 3) * 4}%`, width: "1.6%", height: "2.4%", rotate: `${i * 50}deg`, background: c, animationDelay: `${delayMs + 160 + i * 90}ms` }} />
      ))}
      {/* the carousel ring turns */}
      <span className="bwp-spin absolute block" style={{ left: "30%", top: "28%", width: "40%", height: "44%", animationDelay: `${delayMs + 320}ms` }}>
        <svg viewBox="0 0 40 44" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="20" cy="22" rx="18" ry="20" fill="none" stroke="rgba(201,74,209,0.8)" strokeWidth="0.9" strokeDasharray="3 2.2" />
        </svg>
      </span>
      {/* the riders: each fades out as itself and back in as another */}
      {riders.map((r, i) => (
        <span key={i} className="absolute block" style={{ left: `${r.l}%`, top: `${r.t}%`, width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 640 + i * 110}ms` }}>
            <Man kind={r.k} fill="#e3d0ff" stroke="#2a1030" />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 640 + i * 110}ms` }}>
            <Man kind={r.swap} fill="#ffd76a" stroke="#5b2b8f" />
          </span>
        </span>
      ))}
      {/* the ringmaster's mask presides */}
      <span className="bwp-facein absolute block" style={{ left: "44%", top: "42%", width: "12%", height: "12%", animationDelay: `${delayMs + 560}ms` }}>{GLYPH.bw2_carnival_of_masks}</span>
      <Ring delayMs={delayMs + 1040} color="rgba(201,74,209,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(255,215,106,0.55)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(201,74,209,0.4)" />
    </Stage>
  );
}

/** Restitution — the great scale descends tilted, the owed pieces march onto
 * the light pan, and the beam levels. */
function RestitutionScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#c9b89a", "#ffd76a", "#3a3026"]} glyph={GLYPH.bw2_restitution} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#c9b89a", "#ffd76a", "#3a3026"]} glyph={GLYPH.bw2_restitution} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(58,48,38,0.34)" delayMs={delayMs} />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(255,215,106,0.85)" delayMs={delayMs + 300} />
      {/* the pillar and the tilted beam */}
      <span className="bwp-gate absolute block" style={{ left: "49.3%", top: "34%", width: "1.4%", height: "24%", transformOrigin: "50% 100%", background: "rgba(201,184,154,0.95)", animationDelay: `${delayMs + 160}ms` }} />
      <span className="bwp-tip absolute block" style={{ left: "32%", top: "33%", width: "36%", height: "3%", transformOrigin: "50% 50%", animationDelay: `${delayMs + 420}ms` }}>
        <svg viewBox="0 0 36 3" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0.5" y="0.9" width="35" height="1.2" rx="0.6" fill="#c9b89a" />
        </svg>
      </span>
      {/* the two pans */}
      {[33, 62].map((l, i) => (
        <span key={l} className="bwp-drop absolute block" style={{ left: `${l}%`, top: "40%", width: "6%", height: "3%", animationDelay: `${delayMs + 520 + i * 90}ms` }}>
          <svg viewBox="0 0 8 4" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 0.6 C2 3.6 6 3.6 7.4 0.6 Z" fill={i === 0 ? "rgba(255,215,106,0.85)" : "rgba(201,184,154,0.8)"} stroke="#3a3026" strokeWidth="0.35" />
          </svg>
        </span>
      ))}
      {/* the owed pieces march to the light pan */}
      {(["p", "n", "r"] as (keyof typeof CHESSMAN)[]).map((k, i) => (
        <span key={k} className="bwp-march absolute block" style={{ left: `${22 + i * 2}%`, top: "50%", width: "5%", height: "8%", "--dx": `${170 - i * 34}%`, animationDelay: `${delayMs + 680 + i * 150}ms` } as CSSProperties}>
          <Man kind={k} fill="#ffe9b0" stroke="#3a3026" />
        </span>
      ))}
      <Glint delayMs={delayMs + 1140} color="#ffd76a" left={34} top={38} />
      <Glint delayMs={delayMs + 1240} color="#ffe9b0" left={30} top={44} size={2.6} />
      <Ring delayMs={delayMs + 1060} color="rgba(255,215,106,0.85)" />
      <Ring delayMs={delayMs + 1260} color="rgba(201,184,154,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1120} color="rgba(255,215,106,0.36)" />
    </Stage>
  );
}

/** The Long Truce — banners dip on both wings, the dove crosses the whole
 * field, and twin domes of quiet settle over the two armies. */
function LongTruceScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5fc9b0", "#e8fff7", "#1c3a32"]} glyph={GLYPH.bw2_long_truce} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5fc9b0", "#e8fff7", "#1c3a32"]} glyph={GLYPH.bw2_long_truce} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(28,58,50,0.34)" delayMs={delayMs} />
      {/* tell: the field draws one breath and the noise drops out of it */}
      <Tell color="rgba(95,201,176,0.5)" delayMs={delayMs + 220} left={40} top={34} size={26} />
      {/* the two war banners dip toward each other */}
      {[
        { l: 30, rot: "18deg", c: "#e8fff7" },
        { l: 66, rot: "-18deg", c: "#9fd8ff" },
      ].map((b, i) => (
        <span key={i} className="bwp-drop absolute block" style={{ left: `${b.l}%`, top: "30%", width: "4.5%", height: "18%", rotate: b.rot, animationDelay: `${delayMs + 160 + i * 120}ms` }}>
          <svg viewBox="0 0 5 18" className="block h-full w-full" aria-hidden="true">
            <path d="M2.5 0.8 V17.2" stroke="#1c3a32" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M2.5 1.2 H4.8 L3.8 3.2 L4.8 5.2 H2.5 Z" fill={b.c} stroke="#1c3a32" strokeWidth="0.35" {...SJ} />
          </svg>
        </span>
      ))}
      {/* the dove crosses the whole field, olive sprig in tow */}
      <span className="bwp-cross absolute block" style={{ left: "30%", top: "34%", width: "9%", height: "6.5%", "--dx": "360%", animationDelay: `${delayMs + 480}ms` } as CSSProperties}>
        <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
          <path d="M1 3.4 C3 1.2 5.4 1 7.4 2.4 L9.2 1.8 L8.2 3.4 C6.2 5 3.2 5 1 3.4 Z" fill="#e8fff7" stroke="#1c3a32" strokeWidth="0.4" {...SJ} />
          <path d="M4.6 2.2 C5.4 0.8 6.6 0.6 7.2 1.2" fill="none" stroke="#5fc9b0" strokeWidth="0.45" strokeLinecap="round" />
        </svg>
      </span>
      {/* twin domes of stillness settle over both halves */}
      {[27, 53].map((l, i) => (
        <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "42%", width: "20%", height: "16%", animationDelay: `${delayMs + 820 + i * 140}ms` }}>
          <svg viewBox="0 0 20 16" className="block h-full w-full" aria-hidden="true">
            <path d="M1 15 C1 2 19 2 19 15" fill="rgba(95,201,176,0.18)" stroke="rgba(232,255,247,0.9)" strokeWidth="0.6" strokeDasharray="2 1.4" />
          </svg>
        </span>
      ))}
      <Glint delayMs={delayMs + 1200} color="#e8fff7" left={48} top={32} />
      <Ring delayMs={delayMs + 1020} color="rgba(95,201,176,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(232,255,247,0.55)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(95,201,176,0.38)" />
    </Stage>
  );
}

/** The Great Return — the underworld gate opens on the horizon and the dead
 * of BOTH armies stream home in one long procession. */
function GreatReturnScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8f6bff", "#e3d0ff", "#12081f"]} glyph={GLYPH.bw2_great_return} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8f6bff", "#e3d0ff", "#12081f"]} glyph={GLYPH.bw2_great_return} delayMs={delayMs} />;
  const procession: { k: keyof typeof CHESSMAN; dx: number; d: number; c: string; s: string }[] = [
    { k: "q", dx: -240, d: 0, c: "#e3d0ff", s: "#5b2b8f" },
    { k: "n", dx: -150, d: 140, c: "#e3d0ff", s: "#5b2b8f" },
    { k: "p", dx: -70, d: 280, c: "#e3d0ff", s: "#5b2b8f" },
    { k: "r", dx: 240, d: 70, c: "#9fd8ff", s: "#2c3e6b" },
    { k: "b", dx: 150, d: 210, c: "#9fd8ff", s: "#2c3e6b" },
  ];
  return (
    <Stage>
      <Wash color="rgba(18,8,31,0.4)" delayMs={delayMs} />
      {/* the gate: twin pillars and the pane of light between them */}
      {[44, 54].map((l, i) => (
        <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "30%", width: "2%", height: "22%", background: "rgba(143,107,255,0.95)", animationDelay: `${delayMs + 160 + i * 90}ms` }} />
      ))}
      <span className="bwp-gate absolute block" style={{ left: "46%", top: "31%", width: "8%", height: "20%", transformOrigin: "50% 100%", background: "linear-gradient(180deg, rgba(227,208,255,0.1), rgba(143,107,255,0.6))", animationDelay: `${delayMs + 420}ms` }} />
      {/* the procession streams out both ways, each shade heading home */}
      {procession.map((p, i) => (
        <span key={i} className="bwp-march absolute block" style={{ left: "47.5%", top: "44%", width: "5.5%", height: "8.5%", "--dx": `${p.dx}%`, animationDelay: `${delayMs + 560 + p.d}ms` } as CSSProperties}>
          <Man kind={p.k} fill={p.c} stroke={p.s} />
        </span>
      ))}
      {/* grave-lights drifting up in their wake */}
      {[36, 50, 62].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 1060 + i * 100} color="#e3d0ff" left={l} top={38 - i * 3} size={2.6} />
      ))}
      <Ring delayMs={delayMs + 1000} color="rgba(143,107,255,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(227,208,255,0.55)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(143,107,255,0.4)" />
    </Stage>
  );
}

/** Shadow Reserve — the smuggler opens the coat: three heavy pieces hang in
 * the lining, and two of your dealt futures burn away as the fee. */
function ShadowReserveScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#3a3a40", "#c9cdd6", "#12081f"]} glyph={GLYPH.bw2_shadow_reserve} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#3a3a40", "#c9cdd6", "#12081f"]} glyph={GLYPH.bw2_shadow_reserve} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(18,8,31,0.42)" delayMs={delayMs} />
      {/* the smuggler rises, hooded */}
      <span className="bwp-rise absolute block" style={{ left: "40%", top: "28%", width: "20%", height: "30%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 30" className="block h-full w-full" aria-hidden="true">
          <path d="M10 1.4 C14 1.4 16 4.6 16 8 L17.4 28.6 H2.6 L4 8 C4 4.6 6 1.4 10 1.4 Z" fill="#26262c" stroke="#8a94a8" strokeWidth="0.6" {...SJ} />
          <path d="M6.6 7.4 C7.6 5 12.4 5 13.4 7.4 C12.4 9 7.6 9 6.6 7.4 Z" fill="#0d0d12" />
        </svg>
      </span>
      {/* the coat flaps swing open */}
      <span className="bwp-flapl absolute block" style={{ left: "41%", top: "36%", width: "9%", height: "20%", transformOrigin: "0% 6%", animationDelay: `${delayMs + 560}ms` }}>
        <svg viewBox="0 0 9 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0.6 0.6 L8.4 3 L8.4 19.4 L0.6 19.4 Z" fill="#31313a" stroke="#8a94a8" strokeWidth="0.45" />
        </svg>
      </span>
      <span className="bwp-flapr absolute block" style={{ left: "50%", top: "36%", width: "9%", height: "20%", transformOrigin: "100% 6%", animationDelay: `${delayMs + 560}ms` }}>
        <svg viewBox="0 0 9 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M8.4 0.6 L0.6 3 L0.6 19.4 L8.4 19.4 Z" fill="#31313a" stroke="#8a94a8" strokeWidth="0.45" />
        </svg>
      </span>
      {/* the merchandise, hanging in the lining */}
      {(["n", "b", "r"] as (keyof typeof CHESSMAN)[]).map((k, i) => (
        <span key={k} className="bwp-facein absolute block" style={{ left: `${43 + i * 5}%`, top: "42%", width: "4.5%", height: "7%", animationDelay: `${delayMs + 820 + i * 130}ms` }}>
          <Man kind={k} fill="#c9cdd6" stroke="#12081f" />
        </span>
      ))}
      {/* the fee: two dealt futures slide away and gutter out */}
      {[0, 1].map((i) => (
        <span key={i} className="bwp-cross absolute block" style={{ left: `${33 - i * 3}%`, top: `${56 + i * 4}%`, width: "5%", height: "7.5%", rotate: `${-10 - i * 8}deg`, "--dx": "-220%", animationDelay: `${delayMs + 1000 + i * 140}ms` } as CSSProperties}>
          <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.4" />
            <path d="M1.6 1.8 L4.4 7.2 M4.4 1.8 L1.6 7.2" stroke="#c94a3a" strokeWidth="0.45" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <Ring delayMs={delayMs + 1060} color="rgba(201,205,214,0.8)" />
      <Ring delayMs={delayMs + 1260} color="rgba(138,148,168,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1120} color="rgba(138,148,168,0.35)" />
    </Stage>
  );
}

/** The Eternal Keep — the home rank itself is raised into rampart and towers,
 * and the gate booms shut on forever. */
function EternalKeepScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8a8478", "#e8dcc0", "#3a3026"]} glyph={GLYPH.bw2_eternal_keep} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8a8478", "#e8dcc0", "#3a3026"]} glyph={GLYPH.bw2_eternal_keep} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(58,48,38,0.34)" delayMs={delayMs} />
      {/* the rampart rises along the home rank */}
      <span className="bwp-rise absolute block" style={{ left: "26%", top: "50%", width: "48%", height: "12%", animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 48 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 11.4 V4 H4 V1.6 H7 V4 H11 V1.6 H14 V4 H18 V1.6 H21 V4 H27 V1.6 H30 V4 H34 V1.6 H37 V4 H41 V1.6 H44 V4 H47 V11.4 Z" fill="#8a8478" stroke="#3a3026" strokeWidth="0.5" {...SJ} />
          <path d="M8 7 H12 M20 8 H24 M32 6.6 H36 M40 8.2 H43" stroke="#3a3026" strokeWidth="0.4" strokeLinecap="round" />
        </svg>
      </span>
      {/* the twin towers */}
      {[24, 68].map((l, i) => (
        <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "38%", width: "8%", height: "24%", animationDelay: `${delayMs + 480 + i * 130}ms` }}>
          <svg viewBox="0 0 8 24" className="block h-full w-full" aria-hidden="true">
            <path d="M1 23.4 V4 H2.4 V1.8 H3.4 V4 H4.6 V1.8 H5.6 V4 H7 V23.4 Z" fill="#9a9488" stroke="#3a3026" strokeWidth="0.5" {...SJ} />
            <path d="M3.2 10 H4.8 V13 H3.2 Z" fill="#3a3026" />
          </svg>
        </span>
      ))}
      {/* the gate booms shut */}
      <span className="bwp-stamp absolute block" style={{ left: "45.5%", top: "52%", width: "9%", height: "9.5%", animationDelay: `${delayMs + 820}ms` }}>
        <svg viewBox="0 0 9 10" className="block h-full w-full" aria-hidden="true">
          <path d="M0.8 9.4 V4 C0.8 1.2 8.2 1.2 8.2 4 V9.4 Z" fill="#4a3a2a" stroke="#e8dcc0" strokeWidth="0.5" {...SJ} />
          <path d="M4.5 2.2 V9.4 M2 4.4 H7 M2 6.8 H7" stroke="#e8dcc0" strokeWidth="0.35" strokeLinecap="round" />
        </svg>
      </span>
      {/* battlement watch-lights */}
      {[30, 42, 56, 66].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 980 + i * 90} color="#ffd76a" left={l} top={47} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 1000} color="rgba(232,220,192,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(255,215,106,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(232,220,192,0.36)" />
    </Stage>
  );
}

/* =============================================================================
   WAVE 3 tier 7-8 bespoke scenes.
   ========================================================================== */

/** Mummers' Dance — the whole minor corps whirls behind carnival masks and
 * every knight trades faces with a bishop. */
function MummersDanceScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#6b4a8f", "#c9b0e8", "#1c0f28"]} glyph={GLYPH.bw3_mummers_dance} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#6b4a8f", "#c9b0e8", "#1c0f28"]} glyph={GLYPH.bw3_mummers_dance} delayMs={delayMs} />;
  const corps: { k: keyof typeof CHESSMAN; swap: keyof typeof CHESSMAN; l: number; t: number }[] = [
    { k: "n", swap: "b", l: 33, t: 34 },
    { k: "b", swap: "n", l: 60, t: 34 },
    { k: "n", swap: "b", l: 33, t: 56 },
    { k: "b", swap: "n", l: 60, t: 56 },
  ];
  return (
    <Stage>
      <Wash color="rgba(28,15,40,0.34)" delayMs={delayMs} />
      <span className="bwp-whirl absolute block" style={{ left: "30%", top: "28%", width: "40%", height: "44%", animationDelay: `${delayMs + 320}ms` }}>
        <svg viewBox="0 0 40 44" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="20" cy="22" rx="18" ry="20" fill="none" stroke="rgba(201,176,232,0.7)" strokeWidth="0.9" strokeDasharray="3 2.2" />
        </svg>
      </span>
      {corps.map((r, i) => (
        <span key={i} className="absolute block" style={{ left: `${r.l}%`, top: `${r.t}%`, width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + i * 120}ms` }}>
            <Man kind={r.k} fill="#e3d0ff" stroke="#2a1030" />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + i * 120}ms` }}>
            <Man kind={r.swap} fill="#c9b0e8" stroke="#5b2b8f" />
          </span>
        </span>
      ))}
      <span className="bwp-facein absolute block" style={{ left: "44%", top: "42%", width: "12%", height: "12%", animationDelay: `${delayMs + 620}ms` }}>{GLYPH.bw3_mummers_dance}</span>
      <Ring delayMs={delayMs + 1040} color="rgba(201,176,232,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(143,74,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(201,176,232,0.38)" />
    </Stage>
  );
}

/** Last Stand — a shield wall snaps up along the whole front and a dome of
 * king-safety settles over the army. */
function LastStandScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5a6b8f", "#ffe9b0", "#1c2438"]} glyph={GLYPH.bw3_last_stand} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5a6b8f", "#ffe9b0", "#1c2438"]} glyph={GLYPH.bw3_last_stand} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(28,36,56,0.34)" delayMs={delayMs} />
      {/* tell: the muster-light gathers along the line before the shields go up */}
      <Tell color="rgba(255,233,176,0.45)" delayMs={delayMs + 220} left={38} top={44} size={26} />
      {[30, 40, 50, 60].map((l, i) => (
        <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "50%", width: "8%", height: "13%", animationDelay: `${delayMs + 200 + i * 100}ms` }}>
          <svg viewBox="0 0 8 13" className="block h-full w-full" aria-hidden="true">
            <path d="M1 1 H7 V7 C7 10 4 12 4 12 C4 12 1 10 1 7 Z" fill="rgba(90,107,143,0.6)" stroke="#ffe9b0" strokeWidth="0.5" {...SJ} />
            <path d="M4 1.6 V11" stroke="#ffe9b0" strokeWidth="0.35" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <span className="bwp-drop absolute block" style={{ left: "26%", top: "34%", width: "48%", height: "24%", animationDelay: `${delayMs + 620}ms` }}>
        <svg viewBox="0 0 48 24" className="block h-full w-full" aria-hidden="true">
          <path d="M1 23 C1 3 47 3 47 23" fill="rgba(90,107,143,0.14)" stroke="rgba(255,233,176,0.9)" strokeWidth="0.6" strokeDasharray="2.4 1.6" />
        </svg>
      </span>
      <span className="bwp-facein absolute block" style={{ left: "45.5%", top: "40%", width: "9%", height: "13%", animationDelay: `${delayMs + 760}ms` }}>
        <Man kind="k" fill="#ffe9b0" stroke="#1c2438" />
      </span>
      {[34, 46, 58].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 980 + i * 90} color="#ffe9b0" left={l} top={38} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 1000} color="rgba(255,233,176,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(90,107,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(255,233,176,0.36)" />
    </Stage>
  );
}

/** High Stakes — the whole offer table is swept toward the holder and the
 * forfeited reroll dice shatter mid-air. */
function HighStakesScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8a5a2a", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw3_high_stakes} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8a5a2a", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw3_high_stakes} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(42,28,8,0.34)" delayMs={delayMs} />
      {/* tell: the table lamp swells over the offer before the sweep */}
      <Tell color="rgba(255,215,106,0.5)" delayMs={delayMs + 240} left={40} top={34} />
      {[30, 42, 54, 64].map((l, i) => (
        <span key={l} className="bwp-cross absolute block" style={{ left: `${l}%`, top: "30%", width: "6%", height: "9%", rotate: `${(i - 1.5) * 8}deg`, "--dx": "0%", "--dy": "160%", animationDelay: `${delayMs + 300 + i * 110}ms` } as CSSProperties}>
          <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill="#ffd76a" stroke="#2a1c08" strokeWidth="0.4" />
            <circle cx="3" cy="4.5" r="1.1" fill="none" stroke="#2a1c08" strokeWidth="0.4" />
          </svg>
        </span>
      ))}
      {[38, 58].map((l, i) => (
        <span key={l} className="bwp-shatter absolute block" style={{ left: `${l}%`, top: "52%", width: "5%", height: "5%", animationDelay: `${delayMs + 760 + i * 120}ms` }}>
          <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="6.8" height="6.8" rx="1.2" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
            <circle cx="2.6" cy="2.6" r="0.7" fill="#4a3a22" />
            <circle cx="5.4" cy="5.4" r="0.7" fill="#4a3a22" />
          </svg>
        </span>
      ))}
      <Glint delayMs={delayMs + 1000} color="#ffd76a" left={40} top={50} />
      <Glint delayMs={delayMs + 1120} color="#ffd76a" left={60} top={50} />
      <Ring delayMs={delayMs + 940} color="rgba(255,215,106,0.85)" />
      <Ring delayMs={delayMs + 1160} color="rgba(138,90,42,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1020} color="rgba(255,215,106,0.36)" />
    </Stage>
  );
}

/** From the Ashes — the fallen re-form up to a level line, embers rising. */
function FromTheAshesScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#7a3a2a", "#ff9d3d", "#2b1208"]} glyph={GLYPH.bw3_from_the_ashes} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#7a3a2a", "#ff9d3d", "#2b1208"]} glyph={GLYPH.bw3_from_the_ashes} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(43,18,8,0.36)" delayMs={delayMs} />
      <span className="bwp-beam absolute block" style={{ left: "28%", top: "40%", width: "44%", height: "0.8%", background: "rgba(255,157,61,0.85)", transformOrigin: "0% 50%", animationDelay: `${delayMs + 320}ms` }} />
      {(["p", "n", "b", "r"] as (keyof typeof CHESSMAN)[]).map((k, i) => (
        <span key={k} className="bwp-rise absolute block" style={{ left: `${34 + i * 9}%`, top: "48%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 480 + i * 150}ms` }}>
          <Man kind={k} fill="#ffb877" stroke="#2b1208" />
        </span>
      ))}
      {[36, 48, 60].map((l, i) => (
        <span key={l} className="bwp-arc absolute block rounded-full" style={{ left: `${l}%`, top: "54%", width: "1.6%", height: "1.6%", background: "#ff9d3d", "--dx": `${(i - 1) * 40}%`, "--dy": "-150%", animationDelay: `${delayMs + 900 + i * 100}ms` } as CSSProperties} />
      ))}
      <Ring delayMs={delayMs + 1020} color="rgba(255,157,61,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(122,58,42,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(255,157,61,0.36)" />
    </Stage>
  );
}

/** Kingsguard Duel — two guards charge from before their kings, meet, and both
 * fall in one flash. */
function KingsguardDuelScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5a6b8f", "#ff9d9d", "#22283a"]} glyph={GLYPH.bw3_kingsguard_duel} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5a6b8f", "#ff9d9d", "#22283a"]} glyph={GLYPH.bw3_kingsguard_duel} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(34,40,58,0.34)" delayMs={delayMs} />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(255,157,157,0.85)" delayMs={delayMs + 300} />
      <span className="bwp-hold absolute block" style={{ left: "26%", top: "44%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 200}ms` }}>
        <Man kind="k" fill="#cdd6ff" stroke="#22283a" />
      </span>
      <span className="bwp-hold absolute block" style={{ left: "67%", top: "44%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 200}ms` }}>
        <Man kind="k" fill="#ffd0d0" stroke="#4a2020" />
      </span>
      <span className="bwp-cross absolute block" style={{ left: "34%", top: "46%", width: "5.5%", height: "8.5%", "--dx": "150%", animationDelay: `${delayMs + 520}ms` } as CSSProperties}>
        <Man kind="n" fill="#9fd8ff" stroke="#22283a" />
      </span>
      <span className="bwp-cross absolute block" style={{ left: "60%", top: "46%", width: "5.5%", height: "8.5%", "--dx": "-150%", animationDelay: `${delayMs + 520}ms` } as CSSProperties}>
        <Man kind="n" fill="#ff9d9d" stroke="#4a2020" />
      </span>
      <span className="bwp-stamp absolute block" style={{ left: "45%", top: "44%", width: "10%", height: "10%", animationDelay: `${delayMs + 900}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill="rgba(255,157,157,0.9)" />
        </svg>
      </span>
      <Glint delayMs={delayMs + 1080} color="#ff9d9d" left={44} top={42} size={2.8} />
      <Glint delayMs={delayMs + 1140} color="#9fd8ff" left={54} top={44} size={2.8} />
      <Ring delayMs={delayMs + 960} color="rgba(255,157,157,0.85)" />
      <Ring delayMs={delayMs + 1180} color="rgba(90,107,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1040} color="rgba(255,157,157,0.34)" />
    </Stage>
  );
}

/** King's Sanctuary — the king streaks to the safest corner, haloed in
 * sanctuary light. */
function KingsSanctuaryScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5a8fc0", "#dfe8ff", "#1c2a44"]} glyph={GLYPH.bw3_kings_sanctuary} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5a8fc0", "#dfe8ff", "#1c2a44"]} glyph={GLYPH.bw3_kings_sanctuary} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(28,42,68,0.34)" delayMs={delayMs} />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(223,232,255,0.85)" delayMs={delayMs + 300} />
      {/* tell: sanctuary light kindles in the far corner before the king runs */}
      <Tell color="rgba(223,232,255,0.45)" delayMs={delayMs + 230} left={56} top={38} size={22} />
      {[36, 46, 56].map((t, i) => (
        <Beam key={t} delayMs={delayMs + 200 + i * 70} color="rgba(223,232,255,0.5)" left={26} top={t} w={34 - i * 4} h={0.8} />
      ))}
      <span className="bwp-cross absolute block" style={{ left: "28%", top: "46%", width: "6.5%", height: "10%", "--dx": "300%", animationDelay: `${delayMs + 460}ms` } as CSSProperties}>
        <Man kind="k" fill="#dfe8ff" stroke="#1c2a44" />
      </span>
      <span className="bwp-drop absolute block" style={{ left: "58%", top: "38%", width: "16%", height: "18%", animationDelay: `${delayMs + 820}ms` }}>
        <svg viewBox="0 0 16 18" className="block h-full w-full" aria-hidden="true">
          <path d="M1 17 C1 3 15 3 15 17" fill="rgba(90,143,192,0.16)" stroke="rgba(223,232,255,0.9)" strokeWidth="0.6" strokeDasharray="2 1.4" />
        </svg>
      </span>
      <Glint delayMs={delayMs + 1080} color="#dfe8ff" left={64} top={44} />
      <Glint delayMs={delayMs + 1180} color="#9fd8ff" left={68} top={50} size={2.4} />
      <Ring delayMs={delayMs + 1000} color="rgba(223,232,255,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(90,143,192,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(223,232,255,0.36)" />
    </Stage>
  );
}

/** Martyrdom — one friendly minor shatters and its light strikes two enemy
 * minors down in answer. */
function MartyrdomScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8a4a5a", "#ffd0d8", "#2b1820"]} glyph={GLYPH.bw3_martyrdom} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8a4a5a", "#ffd0d8", "#2b1820"]} glyph={GLYPH.bw3_martyrdom} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(43,24,32,0.34)" delayMs={delayMs} />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(255,208,216,0.85)" delayMs={delayMs + 300} />
      <span className="bwp-shatter absolute block" style={{ left: "45%", top: "44%", width: "8%", height: "12%", animationDelay: `${delayMs + 360}ms` }}>
        <Man kind="n" fill="#ffd0d8" stroke="#2b1820" />
      </span>
      {[
        { l: 30, dx: "-120%" },
        { l: 62, dx: "120%" },
      ].map((v, i) => (
        <span key={i}>
          <Beam delayMs={delayMs + 640 + i * 90} color="rgba(255,208,216,0.85)" left={48} top={49} w={22} h={1} rot={i ? "8deg" : "172deg"} />
          <span className="bwp-shatter absolute block" style={{ left: `${v.l}%`, top: "42%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 900 + i * 120}ms` }}>
            <Man kind={i ? "b" : "n"} fill="#c98a98" stroke="#2b1820" />
          </span>
        </span>
      ))}
      <Ring delayMs={delayMs + 980} color="rgba(255,208,216,0.85)" />
      <Ring delayMs={delayMs + 1200} color="rgba(138,74,90,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1060} color="rgba(255,208,216,0.34)" />
    </Stage>
  );
}

/** The Reckoning — a single sweep and every knight and bishop of both armies
 * dissolves. */
function ReckoningScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#3a3a40", "#c9c9cf", "#12121a"]} glyph={GLYPH.bw3_the_reckoning} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#3a3a40", "#c9c9cf", "#12121a"]} glyph={GLYPH.bw3_the_reckoning} delayMs={delayMs} />;
  const fallen: { k: keyof typeof CHESSMAN; l: number; t: number; d: number }[] = [
    { k: "n", l: 30, t: 36, d: 0 },
    { k: "b", l: 46, t: 32, d: 120 },
    { k: "n", l: 62, t: 36, d: 240 },
    { k: "b", l: 34, t: 56, d: 180 },
    { k: "n", l: 52, t: 58, d: 300 },
    { k: "b", l: 66, t: 54, d: 360 },
  ];
  return (
    <Stage>
      <Wash color="rgba(18,18,26,0.4)" delayMs={delayMs} />
      <span className="bwp-beam absolute block" style={{ left: "24%", top: "44%", width: "52%", height: "1.4%", background: "linear-gradient(90deg, transparent, rgba(201,201,207,0.9), transparent)", transformOrigin: "0% 50%", animationDelay: `${delayMs + 260}ms` }} />
      {fallen.map((v, i) => (
        <span key={i} className="bwp-shatter absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "9%", animationDelay: `${delayMs + 560 + v.d}ms` }}>
          <Man kind={v.k} fill="#c9c9cf" stroke="#12121a" />
        </span>
      ))}
      {[36, 50, 62].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 1000 + i * 90} color="#c9c9cf" left={l} top={46} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 980} color="rgba(201,201,207,0.85)" />
      <Ring delayMs={delayMs + 1200} color="rgba(58,58,64,0.6)" size={84} />
      <EdgeGlow delayMs={delayMs + 1060} color="rgba(201,201,207,0.34)" />
    </Stage>
  );
}

/** Covenant of Return — an eternal loop sigil turns and the fallen arc back
 * home along it. */
function CovenantScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5b2b8f", "#e3d0ff", "#12081f"]} glyph={GLYPH.bw3_covenant_of_return} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5b2b8f", "#e3d0ff", "#12081f"]} glyph={GLYPH.bw3_covenant_of_return} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(18,8,31,0.38)" delayMs={delayMs} />
      <span className="bwp-spin absolute block" style={{ left: "36%", top: "34%", width: "28%", height: "32%", animationDelay: `${delayMs + 300}ms` }}>
        <svg viewBox="0 0 28 32" className="block h-full w-full" aria-hidden="true">
          <path d="M8 16 C8 8 20 8 20 16 C20 24 8 24 8 16 Z" fill="none" stroke="rgba(227,208,255,0.85)" strokeWidth="1" />
          <path d="M14 8 C6 8 6 24 14 24 C22 24 22 8 14 8 Z" fill="none" stroke="rgba(143,107,255,0.5)" strokeWidth="0.6" strokeDasharray="2 1.4" />
        </svg>
      </span>
      {(["q", "r", "n"] as (keyof typeof CHESSMAN)[]).map((k, i) => (
        <span key={k} className="bwp-arc absolute block" style={{ left: "62%", top: "50%", width: "5.5%", height: "8.5%", "--dx": `${-150 - i * 30}%`, "--dy": "-20%", animationDelay: `${delayMs + 620 + i * 150}ms` } as CSSProperties}>
          <Man kind={k} fill="#e3d0ff" stroke="#5b2b8f" />
        </span>
      ))}
      <span className="bwp-facein absolute block" style={{ left: "45%", top: "42%", width: "10%", height: "12%", animationDelay: `${delayMs + 560}ms` }}>{GLYPH.bw3_covenant_of_return}</span>
      <Ring delayMs={delayMs + 1020} color="rgba(227,208,255,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(91,43,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(143,107,255,0.36)" />
    </Stage>
  );
}

/** The Homecoming — under a mustering tent-banner, a veteran major and minor
 * march back to the home rank. */
function HomecomingScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#6a5a3a", "#ffe9b0", "#2a2216"]} glyph={GLYPH.bw3_the_homecoming} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#6a5a3a", "#ffe9b0", "#2a2216"]} glyph={GLYPH.bw3_the_homecoming} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(42,34,22,0.34)" delayMs={delayMs} />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(255,233,176,0.85)" delayMs={delayMs + 300} />
      <span className="bwp-drop absolute block" style={{ left: "36%", top: "26%", width: "28%", height: "14%", animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 28 14" className="block h-full w-full" aria-hidden="true">
          <path d="M2 13 L14 2 L26 13 Z" fill="rgba(106,90,58,0.55)" stroke="#ffe9b0" strokeWidth="0.6" {...SJ} />
          <path d="M14 2 V13" stroke="#ffe9b0" strokeWidth="0.4" strokeLinecap="round" />
        </svg>
      </span>
      {(["r", "n"] as (keyof typeof CHESSMAN)[]).map((k, i) => (
        <span key={k} className="bwp-march absolute block" style={{ left: "34%", top: "52%", width: "5.5%", height: "8.5%", "--dx": `${120 + i * 40}%`, animationDelay: `${delayMs + 620 + i * 160}ms` } as CSSProperties}>
          <Man kind={k} fill="#ffe9b0" stroke="#2a2216" />
        </span>
      ))}
      <span className="bwp-beam absolute block" style={{ left: "30%", top: "62%", width: "40%", height: "1.2%", background: "rgba(255,233,176,0.9)", transformOrigin: "0% 50%", animationDelay: `${delayMs + 760}ms` }} />
      {[40, 54].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 1080 + i * 100} color="#ffe9b0" left={l} top={40} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 1020} color="rgba(255,233,176,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(106,90,58,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(255,233,176,0.36)" />
    </Stage>
  );
}

/** Turn the Tide — the whole pawn front surges forward one rank as a single
 * wave. */
function TurnTheTideScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#3a6b7a", "#a8e0e8", "#16303a"]} glyph={GLYPH.bw3_turn_the_tide} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#3a6b7a", "#a8e0e8", "#16303a"]} glyph={GLYPH.bw3_turn_the_tide} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(22,48,58,0.34)" delayMs={delayMs} />
      <span className="bwp-surge absolute block" style={{ left: "24%", top: "50%", width: "52%", height: "12%", borderRadius: "45%", background: "linear-gradient(180deg, rgba(168,224,232,0.5), transparent)", animationDelay: `${delayMs + 260}ms` }} />
      {[30, 40, 50, 60, 70].map((l, i) => (
        <span key={l} className="bwp-surge absolute block" style={{ left: `${l}%`, top: "56%", width: "5%", height: "8%", animationDelay: `${delayMs + 420 + i * 70}ms` }}>
          <Man kind="p" fill="#a8e0e8" stroke="#16303a" />
        </span>
      ))}
      {[36, 52, 66].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 1000 + i * 80} color="#a8e0e8" left={l} top={44} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 980} color="rgba(168,224,232,0.85)" />
      <Ring delayMs={delayMs + 1200} color="rgba(58,107,122,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1060} color="rgba(168,224,232,0.36)" />
    </Stage>
  );
}

/** Pretender to the Throne — a new queen is crowned out of a pillar of light,
 * gold raining. */
function PretenderScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8a6a2a", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw3_pretender} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8a6a2a", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw3_pretender} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(42,28,8,0.36)" delayMs={delayMs} />
      <span className="bwp-gate absolute block" style={{ left: "45%", top: "26%", width: "10%", height: "34%", transformOrigin: "50% 100%", background: "linear-gradient(180deg, rgba(255,215,106,0.1), rgba(255,215,106,0.55))", animationDelay: `${delayMs + 240}ms` }} />
      <span className="bwp-rise absolute block" style={{ left: "45.5%", top: "42%", width: "9%", height: "14%", animationDelay: `${delayMs + 620}ms` }}>
        <Man kind="q" fill="#ffe9b0" stroke="#2a1c08" />
      </span>
      <span className="bwp-drop absolute block" style={{ left: "45.5%", top: "32%", width: "9%", height: "7%", animationDelay: `${delayMs + 860}ms` }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {[38, 48, 58, 66].map((l, i) => (
        <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: `${30 + (i % 2) * 6}%`, width: "1.8%", height: "1.8%", background: "#ffd76a", animationDelay: `${delayMs + 1000 + i * 80}ms` }} />
      ))}
      <Ring delayMs={delayMs + 940} color="rgba(255,215,106,0.85)" />
      <Ring delayMs={delayMs + 1160} color="rgba(138,106,42,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1020} color="rgba(255,215,106,0.4)" />
    </Stage>
  );
}

/** Drive Them Out — a river-line splits the board and two sweeps clear the
 * invaders from either half. */
function DriveThemOutScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#3a5a6a", "#bfe0e8", "#16282e"]} glyph={GLYPH.bw3_drive_them_out} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#3a5a6a", "#bfe0e8", "#16282e"]} glyph={GLYPH.bw3_drive_them_out} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(22,40,46,0.34)" delayMs={delayMs} />
      <span className="bwp-gate absolute block" style={{ left: "49.2%", top: "28%", width: "1.6%", height: "36%", transformOrigin: "50% 0%", background: "linear-gradient(180deg, rgba(191,224,232,0.9), rgba(58,90,106,0.4))", animationDelay: `${delayMs + 240}ms` }} />
      <span className="bwp-cross absolute block" style={{ left: "40%", top: "38%", width: "6%", height: "9%", "--dx": "-160%", animationDelay: `${delayMs + 560}ms` } as CSSProperties}>
        <Man kind="n" fill="#8fb0c0" stroke="#16282e" />
      </span>
      <span className="bwp-cross absolute block" style={{ left: "54%", top: "54%", width: "6%", height: "9%", "--dx": "160%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
        <Man kind="b" fill="#8fb0c0" stroke="#16282e" />
      </span>
      {[30, 66].map((l, i) => (
        <Beam key={l} delayMs={delayMs + 820 + i * 90} color="rgba(191,224,232,0.8)" left={l} top={44 + i * 6} w={18} h={1} rot={i ? "184deg" : "4deg"} />
      ))}
      <Glint delayMs={delayMs + 1080} color="#bfe0e8" left={30} top={38} size={2.4} />
      <Glint delayMs={delayMs + 1160} color="#bfe0e8" left={68} top={56} size={2.4} />
      <Ring delayMs={delayMs + 1000} color="rgba(191,224,232,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(58,90,106,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(191,224,232,0.36)" />
    </Stage>
  );
}

/* =============================================================================
   Card devices (glyphs) — one per card, drawn tiny inside the templates.
   ========================================================================== */

function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  // the old statute, arrow slipping diagonally past
  bw2_ancient_custom: (
    <Gl>
      <rect x="1.6" y="2" width="6.8" height="6" rx="0.8" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M3 6.8 L6.6 3.4 M6.6 3.4 L5 3.6 M6.6 3.4 L6.4 5" fill="none" stroke="#c94a3a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // the crown above, the pitchfork barred below
  bw2_divine_right: (
    <Gl>
      <path d="M2.6 4.4 L2.2 1.8 L3.6 3 L5 1.2 L6.4 3 L7.8 1.8 L7.4 4.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M5 6 V8.8 M3.6 6 V7.2 M6.4 6 V7.2 M3.6 6 H6.4" fill="none" stroke="#8a94a8" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M2.6 9 L7.4 5.6" stroke="#d6234f" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // pole, crossbar, straw hat
  bw2_scarecrow: (
    <Gl>
      <path d="M5 2.8 V9.4 M2.6 4.6 H7.4" stroke="#8a6a3a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.4 2.8 L5 0.8 L6.6 2.8 Z" fill="#c9a84c" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
      <path d="M3.2 9.4 L2.4 8.2 M6.8 9.4 L7.6 8.2" stroke="#3f8f3f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the planted pennant
  bw2_pioneers_banner: (
    <Gl>
      <path d="M3.4 1 V9.2" stroke="#4a3a22" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.4 1.6 H7.8 L6.4 3.2 L7.8 4.8 H3.4 Z" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" {...SJ} />
      <path d="M2 9.2 H4.8" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the empty bowl, one refused card
  bw2_ascetics_bargain: (
    <Gl>
      <path d="M1.6 5.6 H8.4 C8.2 7.6 6.8 8.8 5 8.8 C3.2 8.8 1.8 7.6 1.6 5.6 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <rect x="3.6" y="1" width="2.8" height="3.6" rx="0.5" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
      <path d="M4.2 1.8 L5.8 3.8 M5.8 1.8 L4.2 3.8" stroke="#c94a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the belled cap
  bw2_jesters_rule: (
    <Gl>
      <path d="M1.6 8 C2 4.4 3.2 2.4 4 4.8 C4.6 1.8 5.4 1.8 6 4.8 C6.8 2.4 8 4.4 8.4 8 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.45" {...SJ} />
      <circle cx="1.9" cy="7.6" r="0.6" fill="#ffd76a" />
      <circle cx="5" cy="2.4" r="0.6" fill="#ffd76a" />
      <circle cx="8.1" cy="7.6" r="0.6" fill="#ffd76a" />
    </Gl>
  ),
  // strike out, snap back
  bw2_hit_and_run: (
    <Gl>
      <path d="M1.6 3.4 H7.4 M7.4 3.4 L5.8 2 M7.4 3.4 L5.8 4.8" fill="none" stroke="#ff9d3d" strokeWidth="0.7" {...SJ} />
      <path d="M8.4 6.6 H2.6 M2.6 6.6 L4.2 5.2 M2.6 6.6 L4.2 8" fill="none" stroke="#6fe3ff" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // crown cornered, knight-path out
  bw2_cornered_king: (
    <Gl>
      <path d="M1.4 8.6 L1 6.2 L2.2 7.2 L3 5.8 L3.8 7.2 L5 6.2 L4.6 8.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 7.6 V3.4 H8.2 M8.2 3.4 L7 2.4 M8.2 3.4 L7 4.4" fill="none" stroke="#6fe3ff" strokeWidth="0.65" {...SJ} />
    </Gl>
  ),
  // the two traded masks
  bw2_masquerade: (
    <Gl>
      <path d="M0.8 2.4 C2.2 1.6 3.8 1.6 5.2 2.4 C5.2 4.6 4 6 3 6 C2 6 0.8 4.6 0.8 2.4 Z" fill="#b98cff" stroke="#5b2b8f" strokeWidth="0.4" {...SJ} />
      <path d="M4.8 5.4 C6.2 4.6 7.8 4.6 9.2 5.4 C9.2 7.6 8 9 7 9 C6 9 4.8 7.6 4.8 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M2 3.4 H2.8 M3.4 3.4 H4.2 M6 6.4 H6.8 M7.4 6.4 H8.2" stroke="#12081f" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // the quill over her crown
  bw2_queens_testament: (
    <Gl>
      <path d="M2.4 8.8 L2 6.2 L3.4 7.4 L4.2 5.8 L5 7.4 L6.4 6.2 L6 8.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M8.6 1.2 C6.8 2 5.8 3.4 5.6 5.2 L6.4 5 C6.8 3.4 7.6 2.2 8.6 1.2 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.35" {...SJ} />
      <path d="M5.4 5.4 L5 6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // two flags, one changing hands
  bw2_spoils_of_war: (
    <Gl>
      <path d="M2.4 9 V2 L4.6 2.8 L2.4 3.6" fill="none" stroke="#8a94a8" strokeWidth="0.6" {...SJ} />
      <path d="M7.6 9 V2 L5.4 2.8 L7.6 3.6" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
      <path d="M3.6 6.4 H6.4 M6.4 6.4 L5.4 5.6 M6.4 6.4 L5.4 7.2" fill="none" stroke="#a8e07f" strokeWidth="0.55" {...SJ} />
    </Gl>
  ),
  // the alembic, fed a drop of blood
  bw2_blood_price: (
    <Gl>
      <path d="M4 1.4 H6 V3.4 C7.6 4.4 8.4 6 8.2 7.6 C8 8.8 6.8 9.4 5 9.4 C3.2 9.4 2 8.8 1.8 7.6 C1.6 6 2.4 4.4 4 3.4 Z" fill="none" stroke="#b98cff" strokeWidth="0.55" {...SJ} />
      <path d="M5 5.2 C5.9 6.2 6 7 5 7.8 C4 7 4.1 6.2 5 5.2 Z" fill="#d6234f" />
    </Gl>
  ),
  // the letter of passage, sealed
  bw2_diplomatic_immunity: (
    <Gl>
      <rect x="1.6" y="2.4" width="6.8" height="5.2" rx="0.7" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M2.8 4 H6 M2.8 5.4 H5" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="7.2" cy="6.2" r="1.1" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.3" />
    </Gl>
  ),
  // the sun that comes back over the line
  bw2_deathless_oath: (
    <Gl>
      <path d="M1.4 6.8 H8.6" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.6 6.6 C2.6 4.4 7.4 4.4 7.4 6.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" />
      <path d="M5 2 V3.2 M2.4 3.2 L3.2 4 M7.6 3.2 L6.8 4" stroke="#ffd76a" strokeWidth="0.55" strokeLinecap="round" />
    </Gl>
  ),
  // the crossed duelling axes
  bw2_blood_duel: (
    <Gl>
      <path d="M2.2 1.8 L7.8 8.2 M7.8 1.8 L2.2 8.2" stroke="#8a6a3a" strokeWidth="0.65" strokeLinecap="round" />
      <path d="M2.2 1.8 C3.4 1.4 4.2 1.8 4.6 2.8 L3.2 3.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.35" {...SJ} />
      <path d="M7.8 1.8 C6.6 1.4 5.8 1.8 5.4 2.8 L6.8 3.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // the coin purse takes the minutes
  bw2_highwaymans_toll: (
    <Gl>
      <circle cx="3.4" cy="6.6" r="2.2" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" />
      <circle cx="6" cy="7.2" r="1.7" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M6.4 1.2 H8.8 L7.9 3 L8.8 4.8 H6.4 L7.3 3 Z" fill="none" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the level scale
  bw2_prisoner_exchange: (
    <Gl>
      <path d="M5 1.4 V8.6 M2 2.6 H8 M3.4 8.6 H6.6" stroke="#c9b89a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M1 4.6 C1.4 5.8 2.6 5.8 3 4.6 M2 2.6 V4.6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
      <path d="M7 4.6 C7.4 5.8 8.6 5.8 9 4.6 M8 2.6 V4.6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the crown come early to the pawn
  bw2_early_coronation: (
    <Gl>
      <path d="M3 3.4 L2.6 1.2 L3.8 2.2 L5 0.8 L6.2 2.2 L7.4 1.2 L7 3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="5.4" r="1.2" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
      <path d="M3.6 9.4 L4.3 6.6 H5.7 L6.4 9.4 Z" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // lead and gold trading places
  bw2_alchemists_trade: (
    <Gl>
      <circle cx="3" cy="3" r="1.7" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" />
      <rect x="5.6" y="5.6" width="3" height="3" rx="0.5" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.4" />
      <path d="M6.4 2.4 C7.6 2.8 8.2 3.6 8.2 4.6 M8.2 4.6 L7.4 4 M8.2 4.6 L8.8 3.8" fill="none" stroke="#a8e07f" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 7.6 C2.4 7.2 1.8 6.4 1.8 5.4 M1.8 5.4 L2.6 6 M1.8 5.4 L1.2 6.2" fill="none" stroke="#a8e07f" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the standard, taller than its bearer
  bw2_standard_bearer: (
    <Gl>
      <path d="M3.2 0.8 V9.4" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.2 1.4 H8.2 V4 H3.2 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.4" />
      <circle cx="5.4" cy="7.6" r="1" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" />
      <path d="M4.4 9.6 L4.9 8.4 H5.9 L6.4 9.6 Z" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // the crown held by the hand behind it
  bw2_kingmakers_pact: (
    <Gl>
      <path d="M2.6 5.4 L2.2 2.6 L3.6 3.8 L5 2 L6.4 3.8 L7.8 2.6 L7.4 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M3 9 C3.4 7.4 4 6.6 5 6.6 C6 6.6 6.6 7.4 7 9 M4 7 V6 M5 6.8 V5.8 M6 7 V6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the door in the wall nobody was told about
  bw2_bolt_hole: (
    <Gl>
      <path d="M1.4 9 V2.2 H8.6 V9" fill="none" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 9 V5.4 C3.6 3.4 6.4 3.4 6.4 5.4 V9 Z" fill="#12081f" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <circle cx="5.8" cy="6.8" r="0.4" fill="#6fe3ff" />
    </Gl>
  ),
  // the ringmaster's mask, confetti falling
  bw2_carnival_of_masks: (
    <Gl>
      <path d="M1.8 3.2 C3.8 2 6.2 2 8.2 3.2 C8.2 6.4 6.4 8.4 5 8.4 C3.6 8.4 1.8 6.4 1.8 3.2 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.45" {...SJ} />
      <circle cx="3.6" cy="4.4" r="0.6" fill="#12081f" />
      <circle cx="6.4" cy="4.4" r="0.6" fill="#12081f" />
      <path d="M1 1 L1.4 1.8 M9 1.2 L8.6 2 M5 0.4 V1.2" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the scale tipped toward the wronged side
  bw2_restitution: (
    <Gl>
      <path d="M5 1.6 V8.8 M3.4 8.8 H6.6" stroke="#c9b89a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.2 2.2 L7.8 3.4" stroke="#c9b89a" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M1.2 4.2 C1.6 5.4 2.8 5.4 3.2 4.2 M2.2 2.2 V4.2" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
      <path d="M6.8 5.4 C7.2 6.6 8.4 6.6 8.8 5.4 M7.8 3.4 V5.4" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the dove with the olive sprig
  bw2_long_truce: (
    <Gl>
      <path d="M1.4 5.4 C3.4 3 6 2.8 7.8 4.2 L9 3.6 L8.4 5.2 C6.4 7.2 3.6 7.2 1.4 5.4 Z" fill="#e8fff7" stroke="#1c3a32" strokeWidth="0.45" {...SJ} />
      <path d="M4.6 4 C5.4 2.6 6.6 2.4 7.2 3" fill="none" stroke="#5fc9b0" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3 8.4 H7" stroke="#5fc9b0" strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round" />
    </Gl>
  ),
  // the gate standing open both ways
  bw2_great_return: (
    <Gl>
      <path d="M2 9 V3.4 C2 0.8 8 0.8 8 3.4 V9" fill="none" stroke="#8f6bff" strokeWidth="0.6" {...SJ} />
      <path d="M5 9 V2.6" stroke="#e3d0ff" strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round" />
      <path d="M3.2 6.6 L1.4 6.6 M6.8 6.6 L8.6 6.6 M3.2 6.6 L4 5.8 M3.2 6.6 L4 7.4 M6.8 6.6 L6 5.8 M6.8 6.6 L6 7.4" stroke="#6fe3ff" strokeWidth="0.5" {...SJ} fill="none" />
    </Gl>
  ),
  // the coat, merchandise inside
  bw2_shadow_reserve: (
    <Gl>
      <path d="M2 9.2 L2.8 2.6 C3.4 1.4 6.6 1.4 7.2 2.6 L8 9.2 H6 L5.8 4.6 H4.2 L4 9.2 Z" fill="#26262c" stroke="#8a94a8" strokeWidth="0.45" {...SJ} />
      <circle cx="3.2" cy="6" r="0.5" fill="#c9cdd6" />
      <circle cx="6.8" cy="6" r="0.5" fill="#c9cdd6" />
      <circle cx="3.2" cy="7.8" r="0.5" fill="#c9cdd6" />
    </Gl>
  ),
  // the wall that never falls
  bw2_eternal_keep: (
    <Gl>
      <path d="M1.2 9 V4 H2.6 V2.6 H3.8 V4 H4.4 V2.6 H5.6 V4 H6.2 V2.6 H7.4 V4 H8.8 V9 Z" fill="#8a8478" stroke="#3a3026" strokeWidth="0.5" {...SJ} />
      <path d="M4.4 9 V6.6 C4.4 5.6 5.6 5.6 5.6 6.6 V9 Z" fill="#3a3026" />
      <circle cx="5" cy="1.2" r="0.5" fill="#ffd76a" />
    </Gl>
  ),

  /* --- WAVE 3 boon devices ------------------------------------------------- */
  // a bishop under a warding arc
  bw3_bishops_blessing: (
    <Gl>
      <path d="M1.4 3.4 C3.2 1.6 6.8 1.6 8.6 3.4" fill="none" stroke="#dfe8ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 4 C6.2 5 6.6 6 5 7 C3.4 6 3.8 5 5 4 Z" fill="#5a8fc0" stroke="#22406b" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 9 H6.4 L5.8 7.4 H4.2 Z" fill="#5a8fc0" stroke="#22406b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a red drop over a ticking dial
  bw3_first_blood: (
    <Gl>
      <circle cx="5" cy="6.4" r="2.8" fill="#2b1218" stroke="#ff9d9d" strokeWidth="0.5" />
      <path d="M5 6.4 V4.4 M5 6.4 L6.4 7" stroke="#ff9d9d" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 0.8 C6.2 2.4 6.7 3.2 6.7 3.9 A1.7 1.7 0 1 1 3.3 3.9 C3.3 3.2 3.8 2.4 5 0.8 Z" fill="#d6234f" />
    </Gl>
  ),
  // a small door open in a wall
  bw3_postern_gate: (
    <Gl>
      <path d="M1.2 9 V2.4 H8.8 V9" fill="none" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <path d="M4 9 V4.4 H7 V9 Z" fill="#1c1c2a" stroke="#cdd6ff" strokeWidth="0.5" {...SJ} />
      <circle cx="6.4" cy="6.8" r="0.4" fill="#6fe3ff" />
    </Gl>
  ),
  // a pawn with a rising knight crest
  bw3_heir_apparent: (
    <Gl>
      <circle cx="3.2" cy="6.4" r="1.3" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M2 9.4 L2.7 7 H3.7 L4.4 9.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5.4 5.4 C5.4 3 6.6 2 8 1.6 L8.8 2.6 L8 3.4 C8 4.6 7.4 5.4 6.8 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // two shields locked edge to edge
  bw3_shield_wall: (
    <Gl>
      <path d="M1.2 2 H4.6 V5 C4.6 7 2.9 8.4 2.9 8.4 C2.9 8.4 1.2 7 1.2 5 Z" fill="#bfe6c8" stroke="#1c3a2a" strokeWidth="0.45" {...SJ} />
      <path d="M5.4 2 H8.8 V5 C8.8 7 7.1 8.4 7.1 8.4 C7.1 8.4 5.4 7 5.4 5 Z" fill="#4a7a5a" stroke="#1c3a2a" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // a fence line sealing the home rank
  bw3_home_guard: (
    <Gl>
      <path d="M1 6.6 H9" stroke="#e8dcc0" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2 8.4 V4.6 M4 8.4 V4 M6 8.4 V4 M8 8.4 V4.6" stroke="#6a5a3a" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // a shield before a crown
  bw3_kings_shield: (
    <Gl>
      <path d="M3 1.6 L2.6 0.4 M5 1.4 L5 0.2 M7 1.6 L7.4 0.4" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2.8 3.2 L2.4 1.6 L3.8 2.4 L5 1 L6.2 2.4 L7.6 1.6 L7.2 3.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3 4.4 H7 V6.6 C7 8.4 5 9.4 5 9.4 C5 9.4 3 8.4 3 6.6 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // two pawns and a double-step arrow
  bw3_forced_march: (
    <Gl>
      <path d="M3.4 9 L3.4 3 M3.4 3 L2.2 4.4 M3.4 3 L4.6 4.4" fill="none" stroke="#ffd166" strokeWidth="0.7" {...SJ} />
      <path d="M6.6 9 L6.6 3 M6.6 3 L5.4 4.4 M6.6 3 L7.8 4.4" fill="none" stroke="#7c8a4a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // two fanned cards and a chip
  bw3_double_down: (
    <Gl>
      <rect x="1.6" y="2.4" width="4" height="5.6" rx="0.6" fill="#ffd76a" stroke="#2a1c0e" strokeWidth="0.4" transform="rotate(-12 3.6 5.2)" />
      <rect x="4.4" y="2.4" width="4" height="5.6" rx="0.6" fill="#e8c86a" stroke="#2a1c0e" strokeWidth="0.4" transform="rotate(12 6.4 5.2)" />
      <circle cx="5" cy="8.4" r="1.2" fill="#8a5a2a" stroke="#2a1c0e" strokeWidth="0.4" />
    </Gl>
  ),
  // a pawn jabbing to both sides
  bw3_underdogs_gambit: (
    <Gl>
      <circle cx="5" cy="3.4" r="1.4" fill="#ff9d3d" stroke="#2b1410" strokeWidth="0.4" />
      <path d="M4.4 9 L5 5 H5 L5.6 9 Z" fill="#ff9d3d" stroke="#2b1410" strokeWidth="0.4" {...SJ} />
      <path d="M6 6 H8.4 M8.4 6 L7.4 5.2 M8.4 6 L7.4 6.8 M4 6 H1.6 M1.6 6 L2.6 5.2 M1.6 6 L2.6 6.8" fill="none" stroke="#ff9d3d" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a sword tapping a knight's shoulder
  bw3_field_knighting: (
    <Gl>
      <path d="M2.8 8 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 C7.1 3.2 7.3 4.2 6.9 5.1 L5.8 4.8 C6.1 6.4 6 7 6.6 8 Z" fill="#cdd6ff" stroke="#22304a" strokeWidth="0.4" {...SJ} />
      <path d="M8.6 1 L4.6 5" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M8.6 1 L7.6 1.4 L8.2 2 Z" fill="#e8dcc0" stroke="#5a6b8f" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // a queen ringed by escort dots
  bw3_praetorian: (
    <Gl>
      <path d="M3.2 7.6 L2.6 4 L3.9 5.2 L5 3.2 L6.1 5.2 L7.4 4 L6.8 7.6 Z" fill="#e3d0ff" stroke="#2a1030" strokeWidth="0.4" {...SJ} />
      <circle cx="1.4" cy="5" r="0.7" fill="#8f2bbf" />
      <circle cx="8.6" cy="5" r="0.7" fill="#8f2bbf" />
      <circle cx="5" cy="9.2" r="0.7" fill="#8f2bbf" />
    </Gl>
  ),
  // a field medal star
  bw3_battlefield_commission: (
    <Gl>
      <path d="M3.6 1.4 H6.4 L5.6 4 H4.4 Z" fill="#6a7a3a" stroke="#2a3016" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 L6 6 L8.4 6 L6.5 7.6 L7.2 10 L5 8.6 L2.8 10 L3.5 7.6 L1.6 6 L4 6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a crown with a knight's L escape path
  bw3_royal_caper: (
    <Gl>
      <path d="M2 4.6 L1.6 2 L3 3.2 L4.2 1.2 L5.4 3.2 L6.8 2 L6.4 4.6 Z" fill="#6fe3ff" stroke="#1c1c2a" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 5.2 V8 H8 M8 8 L6.8 7 M8 8 L6.8 9" fill="none" stroke="#6fe3ff" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // coins dropping into a ledger
  bw3_plunderers_ledger: (
    <Gl>
      <rect x="1.4" y="4.4" width="7.2" height="4.8" rx="0.6" fill="#e8dcc0" stroke="#3a2a16" strokeWidth="0.45" />
      <path d="M2.6 6 H7.4 M2.6 7.4 H6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="4" cy="2.2" r="1.2" fill="#ffd76a" stroke="#3a2a16" strokeWidth="0.4" />
      <circle cx="6.4" cy="2.8" r="1" fill="#ffe9b0" stroke="#3a2a16" strokeWidth="0.35" />
    </Gl>
  ),
  // a crown landing over a leaping dial
  bw3_coronation_bonus: (
    <Gl>
      <path d="M2.4 3.6 L2 1.4 L3.2 2.4 L4.4 0.8 L5.6 2.4 L6.8 1.4 L6.4 3.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="6.4" cy="6.6" r="2.6" fill="#2a1c08" stroke="#ffd76a" strokeWidth="0.5" />
      <path d="M6.4 6.6 V4.6 M6.4 6.6 L8 6.6" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a grave-lantern lifted at the last tick
  bw3_eleventh_hour: (
    <Gl>
      <path d="M3.4 2.4 H6.6 L6 4 H4 Z M3 4 H7 V9 H3 Z" fill="#1c0f18" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="6.4" r="1.8" fill="#e3d0ff" />
      <path d="M5 0.8 V2.2" stroke="#e3d0ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a milestone line painted down a file
  bw3_kings_road: (
    <Gl>
      <path d="M5 1 V9" stroke="#ffe9b0" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.6 1.2" />
      <rect x="6.6" y="3.4" width="2.2" height="1.8" rx="0.3" fill="#8a7a4a" stroke="#3a3222" strokeWidth="0.3" />
    </Gl>
  ),
  // a minor hammered up to a rook on the anvil
  bw3_ironwrights_bargain: (
    <Gl>
      <path d="M2 6 H8 C7.4 7.4 5.6 8 4.6 8 L5 9.4 H3 L3.4 8 C2.4 8 2.6 7.4 2 6 Z" fill="#4a3a22" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 5 H4.6 V3.8 H5.4 V5 H6.2 V3.8 H7 V5 H6.6 L6.4 1.6 H3.8 L3.6 5 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a rook drilling through a tunnel arch
  bw3_tunnelers: (
    <Gl>
      <path d="M1 9 V4.4 C1 1.8 9 1.8 9 4.4 V9" fill="none" stroke="#9fd8ff" strokeWidth="0.6" {...SJ} />
      <path d="M3.6 9 V4.6 H3.2 V3.2 H4 V3.9 H4.6 V3.2 H5.4 V3.9 H6 V3.2 H6.8 V4.6 H6.4 V9 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a flag planted deep, a jumping dial
  bw3_deep_position: (
    <Gl>
      <path d="M3 1 V9" stroke="#16302a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3 1.4 H7 L6 2.8 L7 4.2 H3 Z" fill="#a8e0c0" stroke="#16302a" strokeWidth="0.4" {...SJ} />
      <circle cx="6.6" cy="7" r="2" fill="#16302a" stroke="#a8e0c0" strokeWidth="0.4" />
      <path d="M6.6 7 V5.6 M6.6 7 L7.8 7" stroke="#a8e0c0" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a falling piece scattering reroll motes upward
  bw3_martyrs_gift: (
    <Gl>
      <path d="M3.4 9 C3.4 6.6 4.2 5.6 5 5.6 C5.8 5.6 6.6 6.6 6.6 9 Z" fill="#ffd0d8" stroke="#2b1820" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="4.6" r="1.1" fill="#ffd0d8" stroke="#2b1820" strokeWidth="0.35" />
      <path d="M2 4 L2.6 2.4 M5 2.6 L5 1 M8 4 L7.4 2.4" stroke="#ff9d9d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a pawn sentry with a signal light
  bw3_watchword: (
    <Gl>
      <circle cx="4" cy="5" r="1.4" fill="#cde8a8" stroke="#22301a" strokeWidth="0.4" />
      <path d="M2.6 9 L3.3 6.4 H4.7 L5.4 9 Z" fill="#cde8a8" stroke="#22301a" strokeWidth="0.4" {...SJ} />
      <path d="M6 3.4 L8.4 2 M6.4 5 L8.8 4.6 M6.2 6.6 L8.4 7.4" stroke="#a8d878" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a consecration circle with a cross
  bw3_hallowed_ground: (
    <Gl>
      <circle cx="5" cy="5.4" r="3.6" fill="#fff2c0" stroke="#4a3a1a" strokeWidth="0.45" />
      <circle cx="5" cy="5.4" r="2.2" fill="none" stroke="#c9b84c" strokeWidth="0.4" strokeDasharray="1.2 0.9" />
      <path d="M5 3.2 V7.6 M2.8 5.4 H7.2" stroke="#c9b84c" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // half bishop, half knight
  bw3_second_face: (
    <Gl>
      <path d="M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 V1 Z" fill="#c9b0e8" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3 4 2 5 1 Z" fill="#6b4a8f" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M3.4 9 H6.6 L6 7.2 H4 Z" fill="#8f6bc0" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a piece arrow rushing to the crown
  bw3_rally_royal: (
    <Gl>
      <path d="M6.2 2.2 L5.8 0.4 L6.8 1.2 L7.6 0 L8.4 1.2 L9.4 0.4 L9 2.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" transform="translate(-1.6 1.2)" {...SJ} />
      <path d="M1 6.4 H6.4 M6.4 6.4 L5 5.2 M6.4 6.4 L5 7.6" fill="none" stroke="#ffd76a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // three cards, one starred apex
  bw3_futures_market: (
    <Gl>
      <rect x="1" y="3" width="2.6" height="4.6" rx="0.5" fill="#2a1c08" stroke="#8a6a2a" strokeWidth="0.35" transform="rotate(-12 2.3 5.3)" />
      <rect x="6.4" y="3" width="2.6" height="4.6" rx="0.5" fill="#2a1c08" stroke="#8a6a2a" strokeWidth="0.35" transform="rotate(12 7.7 5.3)" />
      <rect x="3.6" y="2.4" width="2.8" height="5" rx="0.5" fill="#ffd76a" stroke="#8a6a2a" strokeWidth="0.4" />
      <path d="M5 3.6 L5.5 4.9 L6.9 4.9 L5.8 5.8 L6.2 7.1 L5 6.3 L3.8 7.1 L4.2 5.8 L3.1 4.9 L4.5 4.9 Z" fill="#8a6a2a" />
    </Gl>
  ),
  // a tower under crossing arrows
  bw3_castle_in_the_storm: (
    <Gl>
      <path d="M3.6 9 L4.2 4 H5.8 L6.4 9 Z M3.4 4 H6.6 M4 4 V2.4 H4.8 V3.2 H5.2 V2.4 H6 V4" fill="none" stroke="#cdd6ff" strokeWidth="0.5" {...SJ} />
      <path d="M1 1 L3.2 3.2 M9 1 L6.8 3.2" stroke="#4a5a7a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // three faint mustered pawns
  bw3_last_muster: (
    <Gl>
      {[2.4, 5, 7.6].map((cx, i) => (
        <g key={cx} opacity={0.8 - i * 0.12}>
          <circle cx={cx} cy="3.6" r="1.1" fill="#e8dcc0" stroke="#2a2216" strokeWidth="0.35" />
          <path d={`M${cx - 1.2} 9 L${cx - 0.5} 5.6 H${cx + 0.5} L${cx + 1.2} 9 Z`} fill="#e8dcc0" stroke="#2a2216" strokeWidth="0.35" {...SJ} />
        </g>
      ))}
    </Gl>
  ),
  // a pyre flame ringed by a blast
  bw3_funeral_pyre: (
    <Gl>
      <circle cx="5" cy="5.4" r="4.2" fill="none" stroke="#ff9d3d" strokeWidth="0.5" strokeDasharray="1.6 1.1" />
      <path d="M5 1.4 C7 3.8 7.4 5.6 5 8.4 C2.6 5.6 3 3.8 5 1.4 Z" fill="#ff9d3d" stroke="#8a3a1a" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 C6 4.8 6 6 5 7.2 C4 6 4 4.8 5 3.6 Z" fill="#ffe9b0" />
    </Gl>
  ),
  // a mountaintop with a claimed flag
  bw3_vantage_point: (
    <Gl>
      <path d="M1 8.6 L4 3.4 L5.6 6 L7 3.8 L9 8.6 Z" fill="#5a7a8f" stroke="#1c2a34" strokeWidth="0.45" {...SJ} />
      <path d="M4 3.4 V1 M4 1.4 H6.4 L5.6 2.4 L6.4 3.4 H4" fill="none" stroke="#cde8ff" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // a carnival mask, two halves
  bw3_mummers_dance: (
    <Gl>
      <path d="M1.4 3 C3 2 5 2 5 3.6 C5 6 3.4 8 2.6 8 C1.8 8 1.4 5.6 1.4 3 Z" fill="#c9b0e8" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 C5 2 7 2 8.6 3 C8.6 5.6 8.2 8 7.4 8 C6.6 8 5 6 5 3.6 Z" fill="#6b4a8f" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <circle cx="2.8" cy="3.8" r="0.5" fill="#1c0f28" />
      <circle cx="7.2" cy="3.8" r="0.5" fill="#e3d0ff" />
    </Gl>
  ),
  // a shield under a dome of safety
  bw3_last_stand: (
    <Gl>
      <path d="M1.4 3.6 C1.4 1.2 8.6 1.2 8.6 3.6" fill="none" stroke="#ffe9b0" strokeWidth="0.5" strokeDasharray="1.2 0.9" />
      <path d="M3 3.8 H7 V6.4 C7 8.4 5 9.4 5 9.4 C5 9.4 3 8.4 3 6.4 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.45" {...SJ} />
      <path d="M5 4.4 V8.8" stroke="#ffe9b0" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // a die and a card, all on the table
  bw3_high_stakes: (
    <Gl>
      <rect x="1.4" y="2.6" width="4.4" height="5.6" rx="0.6" fill="#ffd76a" stroke="#2a1c08" strokeWidth="0.4" transform="rotate(-10 3.6 5.4)" />
      <rect x="5" y="4.4" width="3.6" height="3.6" rx="0.8" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" transform="rotate(14 6.8 6.2)" />
      <circle cx="6.4" cy="5.8" r="0.5" fill="#4a3a22" />
      <circle cx="7.6" cy="7" r="0.5" fill="#4a3a22" />
    </Gl>
  ),
  // a piece rising from a phoenix flame
  bw3_from_the_ashes: (
    <Gl>
      <path d="M2 8.8 C1.4 5.4 3 2.8 5 2.8 C7 2.8 8.6 5.4 8 8.8 C6 7.6 4 7.6 2 8.8 Z" fill="#7a3a2a" stroke="#ff9d3d" strokeWidth="0.4" {...SJ} />
      <path d="M5 6.4 C6 5 6 3.4 5 1.4 C4 3.4 4 5 5 6.4 Z" fill="#ff9d3d" />
      <path d="M3.4 4 L2.6 2.8 M6.6 4 L7.4 2.8" stroke="#ffb877" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // crossed guards between two crowns
  bw3_kingsguard_duel: (
    <Gl>
      <path d="M1.2 1.6 L3.6 1.2 L3.2 2.8 Z M8.8 1.6 L6.4 1.2 L6.8 2.8 Z" fill="#5a6b8f" stroke="#22283a" strokeWidth="0.3" {...SJ} />
      <path d="M2.4 4 L7.6 9 M7.6 4 L2.4 9" stroke="#ff9d9d" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // a crown safe inside a dome
  bw3_kings_sanctuary: (
    <Gl>
      <path d="M1 8.6 C1 3.6 9 3.6 9 8.6" fill="rgba(90,143,192,0.2)" stroke="#dfe8ff" strokeWidth="0.5" {...SJ} />
      <path d="M3 8.6 L2.6 5.4 L3.9 6.6 L5 4.6 L6.1 6.6 L7.4 5.4 L7 8.6 Z" fill="#dfe8ff" stroke="#1c2a44" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // one minor shattering into two answering strikes
  bw3_martyrdom: (
    <Gl>
      <path d="M5 2 L4 4.6 L5 6 L4.4 8.4" fill="none" stroke="#ffd0d8" strokeWidth="0.7" {...SJ} />
      <path d="M1.4 5 L3.4 4.4 M1.6 6.6 L3.6 6.2 M8.6 5 L6.6 4.4 M8.4 6.6 L6.4 6.2" stroke="#c98a98" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a knight and bishop struck through
  bw3_the_reckoning: (
    <Gl>
      <path d="M1.6 7.4 C1.6 5.2 2.4 4.2 3.6 3.6 L3.2 2.4 L4.4 3.2 C4.9 3.7 5 4.4 4.7 5 L3.8 4.8 C4 6 4 6.6 4.4 7.4 Z" fill="#c9c9cf" stroke="#12121a" strokeWidth="0.35" {...SJ} />
      <path d="M7 2.4 C8 3.4 8.4 4.4 8.4 5.2 C8.4 6.2 7.8 6.8 7 6.8 C6.2 6.8 5.6 6.2 5.6 5.2 C5.6 4.4 6 3.4 7 2.4 Z" fill="#c9c9cf" stroke="#12121a" strokeWidth="0.35" {...SJ} />
      <path d="M1 9 L9 2" stroke="#ff5a5a" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // an eternal return loop
  bw3_covenant_of_return: (
    <Gl>
      <path d="M3.4 5 C3.4 3 6.6 3 6.6 5 C6.6 7 3.4 7 3.4 5 Z" fill="none" stroke="#e3d0ff" strokeWidth="0.8" />
      <path d="M5 3 C1.6 3 1.6 7 5 7 C8.4 7 8.4 3 5 3 Z" fill="none" stroke="#8f6bff" strokeWidth="0.5" strokeDasharray="1.4 1" />
      <path d="M6.6 4.6 L7.4 4 L7.6 5" fill="none" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // veterans marching home under a tent-banner
  bw3_the_homecoming: (
    <Gl>
      <path d="M1.4 4 L5 1 L8.6 4 Z" fill="#6a5a3a" stroke="#ffe9b0" strokeWidth="0.4" {...SJ} />
      <path d="M2 8.4 H8 M8 8.4 L6.8 7.6 M8 8.4 L6.8 9.2" fill="none" stroke="#ffe9b0" strokeWidth="0.6" {...SJ} />
      <path d="M3 8 L3.4 5.8 H4.4 L4.8 8 Z" fill="#ffe9b0" stroke="#2a2216" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // a wave surging with an up arrow
  bw3_turn_the_tide: (
    <Gl>
      <path d="M1 7 C2.2 5.8 3 5.8 4.2 7 C5.4 8.2 6.2 8.2 7.4 7 C8 6.4 8.6 6.4 9 6.8" fill="none" stroke="#a8e0e8" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 5.6 V1 M5 1 L3.4 2.6 M5 1 L6.6 2.6" fill="none" stroke="#a8e0e8" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // a queen crowned in a pillar of light
  bw3_pretender: (
    <Gl>
      <path d="M3.4 1 H6.6 L6 9 H4 Z" fill="rgba(255,215,106,0.35)" stroke="#ffd76a" strokeWidth="0.35" {...SJ} />
      <path d="M3.6 6 L3 3 L4.1 4.2 L5 2.4 L5.9 4.2 L7 3 L6.4 6 Z" fill="#ffd76a" stroke="#8a6a2a" strokeWidth="0.4" {...SJ} />
      <path d="M4 6.4 H6 L6.2 8.6 H3.8 Z" fill="#ffe9b0" stroke="#8a6a2a" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // a river line splitting the board, two eviction arrows
  bw3_drive_them_out: (
    <Gl>
      <path d="M5 0.8 V9.2" stroke="#bfe0e8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4 3 H1.4 M1.4 3 L2.6 2.2 M1.4 3 L2.6 3.8" fill="none" stroke="#3a5a6a" strokeWidth="0.6" {...SJ} />
      <path d="M6 7 H8.6 M8.6 7 L7.4 6.2 M8.6 7 L7.4 7.8" fill="none" stroke="#3a5a6a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
};

/* =============================================================================
   Registry — one entry per wave-2 boon. Templates carry a unique flourish per
   card; the tier 7-8 flagships are bespoke scenes.
   ========================================================================== */

/** Bind a template + palette + glyph + config into a SigPlugin entry; the
 * trailing `flourish` keys the card's own dressing block in the template. */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  const aim = config.anchor === "aim";
  return {
    config,
    Render: function BoonPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      return (
        <Template
          palette={palette}
          glyph={glyph}
          lead={lead}
          role={role}
          delayMs={delayMs}
          flourish={flourish}
          aim={aim}
        />
      );
    },
  };
}

/** Bind a bespoke scene (tier 7-8 flagships) into a SigPlugin entry. */
function S(Scene: ComponentType<SceneProps>, config: SigPlugin["config"]): SigPlugin {
  return {
    config,
    Render: function BoonSceneRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      return <Scene lead={lead} role={role} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- FalconDash (raids / escapes / duels) ------------------------------- */
  bw2_ancient_custom: G(FalconDash, ["#8a6a3a", "#e8dcc0", "#4a3a22"], GLYPH.bw2_ancient_custom, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "passant"),
  bw2_hit_and_run: G(FalconDash, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.bw2_hit_and_run, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "raid"),
  bw2_cornered_king: G(FalconDash, ["#5a6b8f", "#6fe3ff", "#1c1c2a"], GLYPH.bw2_cornered_king, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "cornered"),
  bw2_blood_duel: G(FalconDash, ["#c94a3a", "#ffb454", "#2b1218"], GLYPH.bw2_blood_duel, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "siege",
    anchor: "board",
  }, "duel"),

  /* --- DawnHalo (miracles / wards / oaths) -------------------------------- */
  bw2_divine_right: G(DawnHalo, ["#ffd76a", "#ffe9b0", "#4a3a22"], GLYPH.bw2_divine_right, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral",
    anchor: "board",
  }, "edict"),
  // The banner plants where a piece CROSSES, one piece at a time, so the scene
  // belongs on that square rather than in the middle of the board. Safe to
  // anchor: DawnHalo's only board-scale layer is <Wash>, which is inside
  // <BoardFrame>, and the "banner" flourish is composed about the stage centre.
  bw2_pioneers_banner: G(DawnHalo, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.bw2_pioneers_banner, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "cast",
  }, "banner"),
  bw2_diplomatic_immunity: G(DawnHalo, ["#5a8fc0", "#dfe8ff", "#2c3e6b"], GLYPH.bw2_diplomatic_immunity, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "cast",
  }, "laissez"),
  bw2_deathless_oath: G(DawnHalo, ["#ffb454", "#ffe9b0", "#5a4a36"], GLYPH.bw2_deathless_oath, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
    anchor: "cast",
  }, "rebirth"),

  /* --- Reliquary (spoils / exchanges / inheritances) ---------------------- */
  bw2_spoils_of_war: G(Reliquary, ["#8a6a3a", "#ffd76a", "#3a3026"], GLYPH.bw2_spoils_of_war, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "summon",
    anchor: "cast",
  }, "defector"),
  bw2_prisoner_exchange: G(Reliquary, ["#c9b89a", "#ffe9b0", "#4a3a2a"], GLYPH.bw2_prisoner_exchange, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "cast",
  }, "exchange"),
  bw2_highwaymans_toll: G(Reliquary, ["#c9a84c", "#ffd76a", "#2a1c08"], GLYPH.bw2_highwaymans_toll, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation",
    anchor: "board",
  }, "toll"),
  bw2_queens_testament: G(Reliquary, ["#8f2bbf", "#e3d0ff", "#2a1030"], GLYPH.bw2_queens_testament, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", source: "summon",
    anchor: "aim",
  }, "testament"),

  /* --- AstralAnvil (makings and remakings) -------------------------------- */
  bw2_scarecrow: G(AstralAnvil, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.bw2_scarecrow, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
    anchor: "cast",
  }, "strawman"),
  bw2_masquerade: G(AstralAnvil, ["#6b4a8f", "#b98cff", "#1c0f18"], GLYPH.bw2_masquerade, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "shades",
    anchor: "aim",
  }, "masks"),
  bw2_alchemists_trade: G(AstralAnvil, ["#c9a84c", "#ffd76a", "#4a3a22"], GLYPH.bw2_alchemists_trade, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "coronation",
    anchor: "aim",
  }, "transmute"),
  bw2_early_coronation: G(AstralAnvil, ["#ffd76a", "#ffe9b0", "#8a6a3a"], GLYPH.bw2_early_coronation, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coronation",
    anchor: "cast",
  }, "coronet"),
  bw2_standard_bearer: G(AstralAnvil, ["#c94ad1", "#e3d0ff", "#5b2b8f"], GLYPH.bw2_standard_bearer, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall",
    anchor: "board",
  }, "standard"),

  /* --- PactScroll (bargains / vows / court rules) ------------------------- */
  bw2_ascetics_bargain: G(PactScroll, ["#8a7a63", "#e8dcc0", "#3a3026"], GLYPH.bw2_ascetics_bargain, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "fasting"),
  bw2_jesters_rule: G(PactScroll, ["#c94ad1", "#ffd76a", "#2a1030"], GLYPH.bw2_jesters_rule, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "motley"),
  bw2_blood_price: G(PactScroll, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.bw2_blood_price, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "cast",
  }, "bloodseal"),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  bw2_kingmakers_pact: S(KingmakerScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain",
    anchor: "board",
  }),
  bw2_bolt_hole: S(BoltHoleScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }),
  bw2_carnival_of_masks: S(CarnivalScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "nova",
    anchor: "board",
  }),
  bw2_restitution: S(RestitutionScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "colossus", source: "summon",
    anchor: "aim",
  }),
  bw2_long_truce: S(LongTruceScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
    anchor: "board",
  }),
  bw2_great_return: S(GreatReturnScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "board",
  }),
  bw2_shadow_reserve: S(ShadowReserveScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "cast",
  }),
  bw2_eternal_keep: S(EternalKeepScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }),

  /* === WAVE 3 ============================================================== */

  /* --- FalconDash (movement / relocation / footwork) ---------------------- */
  bw3_forced_march: G(FalconDash, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.bw3_forced_march, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "blitz",
    anchor: "board",
  }, "march2"),
  bw3_royal_caper: G(FalconDash, ["#5a6b8f", "#6fe3ff", "#1c1c2a"], GLYPH.bw3_royal_caper, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "caper"),
  bw3_tunnelers: G(FalconDash, ["#5a6b8f", "#9fd8ff", "#1c2438"], GLYPH.bw3_tunnelers, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "tunnel"),
  bw3_rally_royal: G(FalconDash, ["#5a6b8f", "#ffd76a", "#22304a"], GLYPH.bw3_rally_royal, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "aim",
  }, "rally"),
  bw3_underdogs_gambit: G(FalconDash, ["#8a3a2a", "#ff9d3d", "#2b1410"], GLYPH.bw3_underdogs_gambit, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "siege",
    anchor: "board",
  }, "sidejab"),

  /* --- DawnHalo (relational wards / protection) --------------------------- */
  bw3_bishops_blessing: G(DawnHalo, ["#5a8fc0", "#dfe8ff", "#22406b"], GLYPH.bw3_bishops_blessing, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }, "b3ward"),
  bw3_shield_wall: G(DawnHalo, ["#4a7a5a", "#bfe6c8", "#1c3a2a"], GLYPH.bw3_shield_wall, {
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }, "phalanx3"),
  bw3_kings_shield: G(DawnHalo, ["#5a6b8f", "#ffd76a", "#1c2438"], GLYPH.bw3_kings_shield, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "cast",
  }, "kingfront"),
  bw3_praetorian: G(DawnHalo, ["#8f2bbf", "#e3d0ff", "#2a1030"], GLYPH.bw3_praetorian, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "cast",
  }, "praetor"),
  bw3_watchword: G(DawnHalo, ["#5a7a4a", "#cde8a8", "#22301a"], GLYPH.bw3_watchword, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield",
    anchor: "aim",
  }, "sentry"),
  bw3_vantage_point: G(DawnHalo, ["#5a7a8f", "#cde8ff", "#1c2a34"], GLYPH.bw3_vantage_point, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }, "vantage"),
  bw3_hallowed_ground: G(DawnHalo, ["#c9b84c", "#fff2c0", "#4a3a1a"], GLYPH.bw3_hallowed_ground, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral", source: "kingSafe",
    anchor: "cast",
  }, "hallow"),

  /* --- Reliquary (grants / economy / self-clock payouts) ------------------ */
  bw3_first_blood: G(Reliquary, ["#7a2030", "#ff9d9d", "#2b1218"], GLYPH.bw3_first_blood, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }, "firstblood"),
  bw3_postern_gate: G(Reliquary, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.bw3_postern_gate, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "board",
  }, "postern"),
  bw3_coronation_bonus: G(Reliquary, ["#c9a84c", "#ffd76a", "#2a1c08"], GLYPH.bw3_coronation_bonus, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation",
    anchor: "board",
  }, "coronclock"),
  bw3_plunderers_ledger: G(Reliquary, ["#8a6a3a", "#e8dcc0", "#3a2a16"], GLYPH.bw3_plunderers_ledger, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "ledger"),
  bw3_eleventh_hour: G(Reliquary, ["#5b2b8f", "#e3d0ff", "#1c0f18"], GLYPH.bw3_eleventh_hour, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "cast",
  }, "eleventh"),
  bw3_deep_position: G(Reliquary, ["#3a6b5a", "#a8e0c0", "#16302a"], GLYPH.bw3_deep_position, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }, "deeptime"),
  bw3_martyrs_gift: G(Reliquary, ["#8a4a5a", "#ffd0d8", "#2b1820"], GLYPH.bw3_martyrs_gift, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "martyrgift"),

  /* --- AstralAnvil (transformations / promotions in place) ---------------- */
  bw3_heir_apparent: G(AstralAnvil, ["#8a6a3a", "#ffd76a", "#3a2a16"], GLYPH.bw3_heir_apparent, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "heir"),
  bw3_field_knighting: G(AstralAnvil, ["#5a6b8f", "#cdd6ff", "#22304a"], GLYPH.bw3_field_knighting, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "knighting"),
  bw3_battlefield_commission: G(AstralAnvil, ["#6a7a3a", "#ffd76a", "#2a3016"], GLYPH.bw3_battlefield_commission, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "commission"),
  bw3_ironwrights_bargain: G(AstralAnvil, ["#c9a84c", "#ffd76a", "#4a3a22"], GLYPH.bw3_ironwrights_bargain, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "board",
  }, "ironwright"),
  bw3_second_face: G(AstralAnvil, ["#6b4a8f", "#c9b0e8", "#1c0f28"], GLYPH.bw3_second_face, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "archbishop"),

  /* --- PactScroll (draft bets / decrees / terrain / summons) -------------- */
  bw3_home_guard: G(PactScroll, ["#6a5a3a", "#e8dcc0", "#2a2216"], GLYPH.bw3_home_guard, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }, "homeward"),
  bw3_double_down: G(PactScroll, ["#8a5a2a", "#ffd76a", "#2a1c0e"], GLYPH.bw3_double_down, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "doubledown"),
  bw3_kings_road: G(PactScroll, ["#8a7a4a", "#ffe9b0", "#3a3222"], GLYPH.bw3_kings_road, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }, "kingsroad"),
  bw3_futures_market: G(PactScroll, ["#8a6a2a", "#ffd76a", "#2a1c08"], GLYPH.bw3_futures_market, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain",
    anchor: "board",
  }, "futures"),
  bw3_castle_in_the_storm: G(PactScroll, ["#4a5a7a", "#cdd6ff", "#1c2436"], GLYPH.bw3_castle_in_the_storm, {
    ordering: "radial", staggerMs: 0, victims: ["k", "r"], hasLead: true, sound: "wall",
    anchor: "aim",
  }, "stormcastle"),
  bw3_last_muster: G(PactScroll, ["#7a6a4a", "#e8dcc0", "#2a2216"], GLYPH.bw3_last_muster, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
    anchor: "aim",
  }, "muster"),
  bw3_funeral_pyre: G(PactScroll, ["#8a3a1a", "#ff9d3d", "#2b1208"], GLYPH.bw3_funeral_pyre, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "atomic",
    anchor: "board",
  }, "pyre"),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  bw3_mummers_dance: S(MummersDanceScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "shades", source: "empower",
    anchor: "board",
  }),
  bw3_last_stand: S(LastStandScene, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
    anchor: "board",
  }),
  bw3_high_stakes: S(HighStakesScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }),
  bw3_from_the_ashes: S(FromTheAshesScene, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "board",
  }),
  bw3_kingsguard_duel: S(KingsguardDuelScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "p"], hasLead: true, sound: "siege",
    anchor: "aim",
  }),
  bw3_kings_sanctuary: S(KingsSanctuaryScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "kingSafe",
    anchor: "aim",
  }),
  bw3_martyrdom: S(MartyrdomScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "siege",
    anchor: "aim",
  }),
  bw3_the_reckoning: S(ReckoningScene, {
    ordering: "sweep", staggerMs: 65, victims: ["n", "b"], hasLead: true, sound: "extinction",
    anchor: "board",
  }),
  bw3_covenant_of_return: S(CovenantScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "board",
  }),
  bw3_the_homecoming: S(HomecomingScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "board",
  }),
  bw3_turn_the_tide: S(TurnTheTideScene, {
    ordering: "sweep", staggerMs: 45, victims: ["p"], hasLead: true, sound: "siege",
    anchor: "board",
  }),
  bw3_pretender: S(PretenderScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "summon",
    anchor: "cast",
  }),
  bw3_drive_them_out: S(DriveThemOutScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "rampage",
    anchor: "board",
  }),
};
