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

import "./boonPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";

/* =============================================================================
   Shared bits (module-local — deliberately NOT imported from other modules)
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  delayMs: number;
  /** Per-card structural flourish key: every card on a shared template MUST
   * pass one, and every key below has its own dressing block. */
  flourish?: string;
}

interface SceneProps {
  lead: boolean;
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
 * this canvas is ~14 squares wide (the board is the central ~57%). */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** Full-board colour wash. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="bwp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />;
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

/** Board-edge glow — reserved for the tier 7-8 bespoke scenes' grandeur. */
function EdgeGlow({ delayMs, color }: { delayMs: number; color: string }) {
  return (
    <span
      className="bwp-edge absolute block"
      style={{ left: "28%", top: "28%", width: "44%", height: "44%", boxShadow: `inset 0 0 26px 9px ${color}`, animationDelay: `${delayMs}ms` }}
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

/* =============================================================================
   Template 1: DawnHalo — a dawn sun-disc settles over the board centre, eight
   rays wheel out, and the card's device burns in the disc (miracles / wards).
   ========================================================================== */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
function DawnHalo({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
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
    </Stage>
  );
}

/* =============================================================================
   Template 2: Reliquary — a reliquary chest slides up mid-board, its lid
   swings back, and a column of light carries the card's device out of it.
   ========================================================================== */
function Reliquary({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
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
    </Stage>
  );
}

/* =============================================================================
   Template 3: AstralAnvil — the alchemist's anvil rises mid-board, the hammer
   falls once, and the work is remade inside the strike flash.
   ========================================================================== */
function AstralAnvil({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
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
    </Stage>
  );
}

/* =============================================================================
   Template 4: PactScroll — a great pact unrolls across the board, the quill
   flashes its signature, and the wax seal thumps down beside the device.
   ========================================================================== */
function PactScroll({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
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
    </Stage>
  );
}

/* =============================================================================
   Template 5: FalconDash — speed lines rake the crop and a falcon-comet
   streaks through, the card's device flaring at the strike point.
   ========================================================================== */
function FalconDash({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.2)} delayMs={delayMs} />
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
    </Stage>
  );
}

/* =============================================================================
   Tier 7-8 bespoke scenes — one Render per card, larger presentation: wash,
   double shock ring, board-edge glow, no shared template machinery.
   ========================================================================== */

/** Kingmaker's Pact — the unseen hand lowers an outsized crown onto a throne
 * built of dealt cards while the tier-pips climb and gold rains. */
function KingmakerScene({ lead, delayMs }: SceneProps) {
  if (!lead) return <TargetHit palette={["#c9a84c", "#ffd76a", "#2a1c08"]} glyph={GLYPH.bw2_kingmakers_pact} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(42,28,8,0.34)" delayMs={delayMs} />
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
function BoltHoleScene({ lead, delayMs }: SceneProps) {
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
function CarnivalScene({ lead, delayMs }: SceneProps) {
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
function RestitutionScene({ lead, delayMs }: SceneProps) {
  if (!lead) return <TargetHit palette={["#c9b89a", "#ffd76a", "#3a3026"]} glyph={GLYPH.bw2_restitution} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(58,48,38,0.34)" delayMs={delayMs} />
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
function LongTruceScene({ lead, delayMs }: SceneProps) {
  if (!lead) return <TargetHit palette={["#5fc9b0", "#e8fff7", "#1c3a32"]} glyph={GLYPH.bw2_long_truce} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color="rgba(28,58,50,0.34)" delayMs={delayMs} />
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
function GreatReturnScene({ lead, delayMs }: SceneProps) {
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
function ShadowReserveScene({ lead, delayMs }: SceneProps) {
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
function EternalKeepScene({ lead, delayMs }: SceneProps) {
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
  return {
    config,
    Render: function BoonPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} flourish={flourish} />;
    },
  };
}

/** Bind a bespoke scene (tier 7-8 flagships) into a SigPlugin entry. */
function S(Scene: ComponentType<SceneProps>, config: SigPlugin["config"]): SigPlugin {
  return {
    config,
    Render: function BoonSceneRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Scene lead={lead} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- FalconDash (raids / escapes / duels) ------------------------------- */
  bw2_ancient_custom: G(FalconDash, ["#8a6a3a", "#e8dcc0", "#4a3a22"], GLYPH.bw2_ancient_custom, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz",
  }, "passant"),
  bw2_hit_and_run: G(FalconDash, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.bw2_hit_and_run, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
  }, "raid"),
  bw2_cornered_king: G(FalconDash, ["#5a6b8f", "#6fe3ff", "#1c1c2a"], GLYPH.bw2_cornered_king, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
  }, "cornered"),
  bw2_blood_duel: G(FalconDash, ["#c94a3a", "#ffb454", "#2b1218"], GLYPH.bw2_blood_duel, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "siege",
  }, "duel"),

  /* --- DawnHalo (miracles / wards / oaths) -------------------------------- */
  bw2_divine_right: G(DawnHalo, ["#ffd76a", "#ffe9b0", "#4a3a22"], GLYPH.bw2_divine_right, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral",
  }, "edict"),
  bw2_pioneers_banner: G(DawnHalo, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.bw2_pioneers_banner, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
  }, "banner"),
  bw2_diplomatic_immunity: G(DawnHalo, ["#5a8fc0", "#dfe8ff", "#2c3e6b"], GLYPH.bw2_diplomatic_immunity, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
  }, "laissez"),
  bw2_deathless_oath: G(DawnHalo, ["#ffb454", "#ffe9b0", "#5a4a36"], GLYPH.bw2_deathless_oath, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
  }, "rebirth"),

  /* --- Reliquary (spoils / exchanges / inheritances) ---------------------- */
  bw2_spoils_of_war: G(Reliquary, ["#8a6a3a", "#ffd76a", "#3a3026"], GLYPH.bw2_spoils_of_war, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "summon",
  }, "defector"),
  bw2_prisoner_exchange: G(Reliquary, ["#c9b89a", "#ffe9b0", "#4a3a2a"], GLYPH.bw2_prisoner_exchange, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
  }, "exchange"),
  bw2_highwaymans_toll: G(Reliquary, ["#c9a84c", "#ffd76a", "#2a1c08"], GLYPH.bw2_highwaymans_toll, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation",
  }, "toll"),
  bw2_queens_testament: G(Reliquary, ["#8f2bbf", "#e3d0ff", "#2a1030"], GLYPH.bw2_queens_testament, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", source: "summon",
  }, "testament"),

  /* --- AstralAnvil (makings and remakings) -------------------------------- */
  bw2_scarecrow: G(AstralAnvil, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.bw2_scarecrow, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
  }, "strawman"),
  bw2_masquerade: G(AstralAnvil, ["#6b4a8f", "#b98cff", "#1c0f18"], GLYPH.bw2_masquerade, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "shades",
  }, "masks"),
  bw2_alchemists_trade: G(AstralAnvil, ["#c9a84c", "#ffd76a", "#4a3a22"], GLYPH.bw2_alchemists_trade, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "coronation",
  }, "transmute"),
  bw2_early_coronation: G(AstralAnvil, ["#ffd76a", "#ffe9b0", "#8a6a3a"], GLYPH.bw2_early_coronation, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coronation",
  }, "coronet"),
  bw2_standard_bearer: G(AstralAnvil, ["#c94ad1", "#e3d0ff", "#5b2b8f"], GLYPH.bw2_standard_bearer, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall",
  }, "standard"),

  /* --- PactScroll (bargains / vows / court rules) ------------------------- */
  bw2_ascetics_bargain: G(PactScroll, ["#8a7a63", "#e8dcc0", "#3a3026"], GLYPH.bw2_ascetics_bargain, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }, "fasting"),
  bw2_jesters_rule: G(PactScroll, ["#c94ad1", "#ffd76a", "#2a1030"], GLYPH.bw2_jesters_rule, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "motley"),
  bw2_blood_price: G(PactScroll, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.bw2_blood_price, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }, "bloodseal"),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  bw2_kingmakers_pact: S(KingmakerScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain",
  }),
  bw2_bolt_hole: S(BoltHoleScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
  }),
  bw2_carnival_of_masks: S(CarnivalScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "nova",
  }),
  bw2_restitution: S(RestitutionScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "colossus", source: "summon",
  }),
  bw2_long_truce: S(LongTruceScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
  }),
  bw2_great_return: S(GreatReturnScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
  }),
  bw2_shadow_reserve: S(ShadowReserveScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  bw2_eternal_keep: S(EternalKeepScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall",
  }),
};
