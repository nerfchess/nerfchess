// g08CrowdPlays — bespoke plays for the 27 pawn cards that used to share the
// generated `pawnTide` family (one tide, 27 hue shifts).
//
// MODULE FICTION: THE CROWD TURNS. Every card is a mass of people changing
// their mind at once, and the point of each scene is that the change SPREADS.
// A rout starts at one end and runs the line. A cheer is taken up and carried.
// A mutineer's cap goes into the air and the ranks come apart behind it. A hush
// falls square by square. A stampede pushes a dust front ahead of itself. Tools
// are set down in sequence. Knees hit the road in order. One man looks back and
// then all of them do. A ragged clap finds its beat. A queue collapses into a
// scrum. Never a "tide": always people.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g08CrowdPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx (cycle hazard), only the SigPlugin / SigRole TYPES imported.
//
// SEQUENCE IS THE WHOLE SUBJECT, so the geometry contract is not decoration
// here:
//
//   --fx-index  the per-square hit carries its own place in the REAL victim
//               order into its delay (`dseq`), so the change genuinely
//               propagates victim to victim rather than everyone flinching at
//               once. Several keyframes also lean the hit further the later it
//               lands, which is what a wave passing through a crowd looks like.
//   --fx-n      the lead's crest, hairline and lane are sized by how many
//               squares the play actually touches: a two-victim play turns a
//               short stretch of the line, an eight-victim play turns all of it.
//   --fx-side   every arrival, recoil, thrown cap, kneeling drop, flushed bird
//               and drifting settle moves relative to the CASTER's own side of
//               the screen. Nothing here says "the bottom of the board".
//   --fx-len    on the aimed cards the lane, rope, dust front and speed streaks
//               run the real source -> target distance.
//   <BoardFrame> everything that means THE BOARD (washes, edge rims) lives
//               here, never at a fixed percentage of the stage.
//
// Every scene renders all three roles: "lead" (board-scale flourish on the cast
// square), "target" (the per-square hit) and "entrance" (the card arriving in a
// hand at ~56% of the crop). Every scene runs tell -> strike -> settle. Class
// and keyframe prefix `g08-`.

import "./g08CrowdPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, impactVars } from "./impact/impact";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Local machinery. Nothing here draws: it positions, delays and stages.
   ========================================================================== */

/** Scene root for the square-local cuts (target + entrance). */
const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** Style escape hatch: scene styles carry CSS custom properties too. */
type Style = CSSProperties & Record<string, unknown>;
const st = (o: Style): CSSProperties => o as CSSProperties;

/**
 * The caller's stagger plus this layer's own beat, in ms. The optional third
 * argument is a place in a ROW (the crowd), so one call lays a whole rank of
 * figures out in order.
 */
const d = (base: number, off: number, i = 0, step = 55): CSSProperties =>
  i > 0
    ? { animationDelay: `calc(${base + off}ms + ${i} * ${step}ms)` }
    : { animationDelay: `${base + off}ms` };

/**
 * The caller's stagger plus this square's place in the REAL victim order.
 * This is what makes the per-square hits read as one change running through
 * the crowd rather than every square reacting at the same instant.
 */
const dseq = (base: number, off: number, per = 46): CSSProperties => ({
  animationDelay: `calc(${base + off}ms + var(--fx-index, 0) * ${per}ms)`,
});

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS, centred on the cast square (the stage's 50%/50%),
 * optionally offset by `dx`/`dy` cells. Sizing in cells means a layer reads at
 * the same real size on every board.
 */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${50 + (dx - w / 2) * CELL}%`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/**
 * A lane starting AT the cast square and running the real distance to the
 * victim, `thick` cells thick. Authored pointing right; <AimStage> aims it.
 */
const lane = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${50 + (dy - thick / 2) * CELL}%`,
  width: "calc(var(--fx-len, 3) * 7.142857%)",
  height: cells(thick),
});

/**
 * A stretch of the line as long as the play is WIDE: a play that turns two
 * squares turns a short piece of the crowd, one that turns eight turns all of
 * it. Centred on the cast square.
 */
const span = (thick: number, dy = 0): CSSProperties => ({
  left: "calc(50% - var(--fx-n, 4) * 3.571428%)",
  top: `${50 + (dy - thick / 2) * CELL}%`,
  width: "calc(var(--fx-n, 4) * 7.142857%)",
  height: cells(thick),
});

interface RowProps {
  /** the animation class every figure in the rank shares */
  cls: string;
  n: number;
  base: number;
  off: number;
  step?: number;
  w?: number;
  h?: number;
  gap?: number;
  dx?: number;
  dy?: number;
  vb?: string;
  children: ReactNode;
}

/**
 * A rank of identical figures laid along the line and animated IN ORDER: the
 * carrier of the whole module. One class, so the audit counts it as the one
 * thing it is (a crowd doing a thing), and one delay ramp, so the thing runs
 * through the crowd instead of happening to all of it at once.
 */
function Row({ cls, n, base, off, step = 55, w = 1.2, h = 1.6, gap = 1.15, dx = 0, dy = 0, vb = "0 0 24 24", children }: RowProps) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <svg
          key={i}
          viewBox={vb}
          className={`${cls} absolute block`}
          style={st({ ...d(base, off, i, step), ...box(w, h, dx + (i - (n - 1) / 2) * gap, dy) })}
        >
          {children}
        </svg>
      ))}
    </>
  );
}

/** Board-scale atmosphere. Always inside <BoardFrame>: a fixed percentage of
 *  the stage is not the board once the stage is anchored on the cast square. */
function Wash({ base, off, bg, cls = "g08-wash" }: { base: number; off: number; bg: string; cls?: string }) {
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className={`${cls} absolute inset-0 block`} style={st({ ...d(base, off), background: bg })} />
      </BoardFrame>
    </BoardWideStage>
  );
}

/* --- Recurring silhouettes ------------------------------------------------ */

/** A standing figure, arms at its sides, facing the viewer. */
const FIG =
  "M12 2.4a2.3 2.3 0 110 4.6 2.3 2.3 0 010-4.6zM8.6 7.8h6.8l1.3 6.4-1.8.6-.8-3.1-.5 9.9h-1.9l-.7-5.6-.7 5.6H8.4l-.5-9.9-.8 3.1-1.8-.6z";
/** The same body seen from BEHIND: squared shoulders, no face. */
const BACKFIG =
  "M12 2.4a2.3 2.3 0 110 4.6 2.3 2.3 0 010-4.6zM8 8h8l-1 5.8h-1.4l-.6 7.8h-2.6l-.6-7.8H9z";
/** A head in profile with a nose, so a turn actually reads as a turn. */
const HEADP =
  "M12.4 4c3.3 0 5.6 2.2 5.6 5 0 1.2-.4 2.2-1.1 3l1.5 1.4-2.1.7.2 3.1H9.2l.2-3.4C7.7 12.9 6.8 11.4 6.8 9.6 6.8 6.4 9.2 4 12.4 4z";
/** A figure down on one knee. */
const KNEELFIG =
  "M11 2.6a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4zM8 8h5.6l2 4.8-1.7.9-1.2-2.7-.2 4.3 3.6 3.5-1.5 1.6-3.9-3.7H7.2L7 14.6l1.3-.3z";
/** A figure folded at the waist in a bow. */
const BOWFIG =
  "M6.8 5a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2zM8 10.2h6.4l2.6 3.3-1.6 1.3-2.1-2.6-.6 9.2h-1.9l-.5-5.4-1.4 5.4H7l1-8.2z";
/** A figure at a dead run. */
const RUNFIG =
  "M14.8 2.6a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4zM10.4 8.6l4.6-.8 2.6 3.2 2.9.8-.5 1.9-3.7-1-1.3-1.4-.7 3 2.6 2.8-1 6.5h-2l.6-5.5-3.4-3 .5-4-2 1.4-2.5-.6.4-1.9 1.9.4z";
/** A forearm and open hand, raised. */
const ARMUP = "M9.6 22.4V10.2a2.4 2.4 0 014.8 0v12.2zM12 2.2a2.6 2.6 0 110 5.2 2.6 2.6 0 010-5.2z";
/** A bird, wings mid-beat. */
const BIRD = "M2 13.4c3.8.4 6.6-1.4 9.4-5 .9 2.6 1.6 4 2.6 5 2.4-3 5.2-4.6 8-4.8-2 2-3 4.2-3.4 7-3 2.2-6 3-9 2.4-3-.6-5.4-2.2-7.6-4.6z";

/* =============================================================================
   1. Fetch the Flour — WORD DOWN THE LINE. A shout is relayed hand to mouth
   along the rank, each man turning to the next, and a flour-white puff bursts
   where it lands. The whole line steps off together.
   Palette: #f0dfb8 / #fff4d6 / #4a3a1c.
   ========================================================================== */
function WordRelay({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "76%", height: "5%", width: "84%", background: "#4a3a1c" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "56%", height: "56%" })}>
          <path d="M7 9.6c0-2.4 2.2-4 5-4s5 1.6 5 4l1.4 9.6H5.6z" fill="#f0dfb8" stroke="#4a3a1c" strokeWidth="1.2" />
          <path d="M9.4 6.4l2.6-1.8 2.6 1.8" fill="none" stroke="#4a3a1c" strokeWidth="1.2" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "12%", width: "34%", height: "34%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#f0dfb8" })} />
        <svg viewBox="0 0 24 24" className="g08-hitturn absolute block" style={st({ ...dseq(delayMs, 190), left: "22%", top: "16%", width: "56%", height: "68%" })}>
          <path d={HEADP} fill="#fff4d6" />
          <path d="M4.4 15.6c1.6-1.8 3-2.6 4.6-2.6" fill="none" stroke="#f0dfb8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.4, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,223,184,0.65), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(240,223,184,0.3), transparent 68%)" />
      <AimStage>
        {/* tell: the line is still, and a hairline of attention runs it */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 110), ...lane(0.14, 0.2), background: "#fff4d6" })} />
        {/* strike: each man turns and shouts it to the next, in order */}
        <Row cls="g08-flour-relay" n={5} base={delayMs} off={250} step={70} w={1.15} h={1.7} gap={1.1} dx={1.3}>
          <path d={FIG} fill="#f0dfb8" />
          <path d="M17 9.6c1.8-.4 3-.2 4 .8" fill="none" stroke="#fff4d6" strokeWidth="1.6" strokeLinecap="round" />
        </Row>
        {/* the word itself hops along the lane, one puff per relay */}
        <svg viewBox="0 0 60 12" className="g08-flour-word absolute block" style={st({ ...d(delayMs, 330), ...lane(1.1, -0.9) })} preserveAspectRatio="none">
          <path d="M4 6h9M18 6h9M32 6h9M46 6h9" stroke="#fff4d6" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* the flour bursts where the word lands, at the real end of the leg */}
        <span
          className="g08-flour-burst absolute block"
          style={st({ ...d(delayMs, 520), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 10.7%)", top: `${50 - 1.5 * CELL}%`, width: cells(3), height: cells(3), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, rgba(240,223,184,0.4) 55%, transparent 74%)" })}
        />
        {/* settle: flour hangs in the air and drifts off the caster's side */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 680), ...box(5, 2.4, 1.4, -1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.5), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   2. Fresh Footprints — THE LOOK BACK. One man glances over his shoulder at the
   prints he left; then every head in the rank snaps around, one after another,
   and the tracks light behind them.
   Palette: #cfe3ff / #fff4d6 / #16233a.
   ========================================================================== */
function LookBack({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "78%", height: "5%", width: "76%", background: "#16233a" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "20%", width: "56%", height: "60%" })}>
          <path d={HEADP} fill="#cfe3ff" />
          <circle cx="14.6" cy="9.4" r="1.1" fill="#16233a" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "8%", top: "52%", width: "40%", height: "40%" })}>
          <ellipse cx="9" cy="9" rx="3.4" ry="5" fill="#fff4d6" />
          <ellipse cx="16" cy="16" rx="3.4" ry="5" fill="#fff4d6" opacity="0.7" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "26%", top: "74%", height: "10%", width: "48%", borderRadius: "50%", background: "#cfe3ff" })} />
        <svg viewBox="0 0 24 24" className="g08-hitturn absolute block" style={st({ ...dseq(delayMs, 190), left: "20%", top: "14%", width: "60%", height: "62%" })}>
          <path d={HEADP} fill="#fff4d6" />
          <circle cx="15" cy="9.6" r="1.1" fill="#16233a" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.8), borderRadius: "50%", border: "2px solid rgba(207,227,255,0.75)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(207,227,255,0.28), transparent 66%)" />
      <BoardWideStage>
        {/* tell: one man's shoulders stiffen before anyone else knows */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...box(1.8, 0.8, -2.6, 1.5), borderRadius: "50%", background: "rgba(22,35,58,0.7)" })} />
        {/* strike: the prints behind the rank light in order */}
        <Row cls="g08-look-print" n={5} base={delayMs} off={260} step={58} w={0.75} h={1.1} gap={1.1} dy={1.6}>
          <ellipse cx="12" cy="9" rx="5" ry="7.4" fill="#cfe3ff" />
          <ellipse cx="12" cy="19" rx="3.6" ry="3" fill="#cfe3ff" />
        </Row>
        {/* and then every head turns to look at them, one after another */}
        <Row cls="g08-look-head" n={5} base={delayMs} off={330} step={64} w={1.1} h={1.3} gap={1.1} dy={-0.3}>
          <path d={HEADP} fill="#fff4d6" />
          <circle cx="15" cy="9.6" r="1.2" fill="#16233a" />
        </Row>
        {/* a cold line of attention across the rank the heads turned along */}
        <span className="g08-look-line absolute block" style={st({ ...d(delayMs, 470), ...span(0.12, 0.7), background: "linear-gradient(90deg, transparent, #cfe3ff, transparent)" })} />
        {/* settle: breath in cold air, drifting off the caster's side */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 640), ...box(5.4, 2.2, 0, -1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   3. Gallery Row — THE OVATION. The gallery's tip-up seats snap shut one after
   another as the row comes to its feet, and the clapping catches on behind it.
   Palette: #e8c56a / #fff4d6 / #3a2a10.
   ========================================================================== */
function OvationRow({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "78%", height: "5%", width: "84%", background: "#3a2a10" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <path d="M5 20V9a2.4 2.4 0 012.4-2.4h9.2A2.4 2.4 0 0119 9v11" fill="#3a2a10" stroke="#e8c56a" strokeWidth="1.3" />
          <path d="M5.8 13.6h12.4v3.2H5.8z" fill="#e8c56a" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "54%", top: "8%", width: "38%", height: "38%" })}>
          <path d="M6 18V9.4l3.4-4 1.6 1.2-1.4 3.4h7.6l1.4 1.6-1.6 6.4z" fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "80%", height: "6%", width: "72%", background: "#e8c56a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitside absolute block" style={st({ ...dseq(delayMs, 200), left: "24%", top: "12%", width: "52%", height: "70%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 410), ...box(1.6, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(232,197,106,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(0deg, rgba(232,197,106,0.3), transparent 62%)" />
      <BoardWideStage>
        {/* tell: the brass rail of the gallery catches the house lights */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.2, 1.4), background: "#e8c56a" })} />
        {/* strike: the seats flip shut one by one as the row stands */}
        <Row cls="g08-gal-seat" n={5} base={delayMs} off={250} step={62} w={1} h={1} gap={1.12} dy={1}>
          <path d="M4 19V7.4h16V19z" fill="#3a2a10" stroke="#e8c56a" strokeWidth="1.6" />
        </Row>
        {/* the row itself comes to its feet, in the same order */}
        <Row cls="g08-gal-stand" n={5} base={delayMs} off={320} step={62} w={1.05} h={1.7} gap={1.12} dy={-0.4}>
          <path d={FIG} fill="#fff4d6" />
        </Row>
        {/* the applause catches on behind the standing */}
        <svg viewBox="0 0 72 16" className="g08-gal-clap absolute block" style={st({ ...d(delayMs, 470), ...span(1.1, -1.5) })} preserveAspectRatio="none">
          <path d="M6 8h5M18 8h5M30 8h5M42 8h5M54 8h5M66 8h5" stroke="#e8c56a" strokeWidth="4" strokeLinecap="round" />
        </svg>
        {/* settle: dust shaken out of the plush */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 640), ...box(6, 2.4, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.44), transparent 72%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   4. Goat Track — THE DUST FRONT. The herd bolts, and what arrives first is not
   the animals but the wall of dust they are pushing along the track.
   Palette: #d8c39a / #fff4d6 / #3b2f1c.
   ========================================================================== */
function DustFront({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "76%", height: "6%", width: "88%", background: "#3b2f1c" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "48%" })}>
          <path d="M3 17c1.6-4.6 4.6-7 9-7s7.4 2.4 9 7z" fill="#d8c39a" />
          <path d="M7.6 17V13M12 17v-5.4M16.4 17V13" stroke="#3b2f1c" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "18%", top: "10%", width: "44%", height: "38%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "78%", height: "8%", width: "84%", background: "#d8c39a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitwave absolute block" style={st({ ...dseq(delayMs, 190), left: "16%", top: "18%", width: "68%", height: "62%" })}>
          <path d={RUNFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 420), ...box(2, 1.4, 0, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(216,195,154,0.7), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(216,195,154,0.34), transparent 70%)" />
      <AimStage>
        {/* tell: the track shivers before anything is visible on it */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 110), ...lane(0.5, 1.1), background: "rgba(59,47,28,0.72)" })} />
        {/* strike: the dust front rolls the real length of the run */}
        <span className="g08-goat-front absolute block" style={st({ ...d(delayMs, 250), ...box(2.6, 3.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, #d8c39a, rgba(216,195,154,0.35) 60%, transparent 76%)" })} />
        {/* the herd itself, breaking out of the murk one animal at a time */}
        <Row cls="g08-goat-bolt" n={5} base={delayMs} off={330} step={48} w={1.3} h={1.4} gap={1} dx={0.9} dy={0.3}>
          <path d="M3 15.4c1-3 3.2-4.6 6.6-4.6l3-2.8 2 .6-.8 2.6c2.8.6 4.4 2 5.2 4.2l-1.4 5h-2l-.6-3.4-4.4.4-.4 3H8.6l-.4-3.6-2.4-.6-.6 4.2H3.2z" fill="#3b2f1c" />
        </Row>
        {/* kicked stones skitter clear of the caster's own side */}
        <svg viewBox="0 0 48 20" className="g08-goat-stone absolute block" style={st({ ...d(delayMs, 470), ...lane(1.6, -1.2) })} preserveAspectRatio="none">
          <circle cx="8" cy="12" r="2.6" fill="#fff4d6" />
          <circle cx="21" cy="7" r="2" fill="#fff4d6" />
          <circle cx="35" cy="13" r="2.4" fill="#fff4d6" />
        </svg>
        {/* settle: the front thins and blows off the line */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 660), ...box(6, 3, 1.6, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   5. Harbor Pilot — ARMS LINKED. The quayside crowd closes around one of their
   own: elbow hooks elbow down the line until the cordon is unbroken.
   Palette: #86c8bd / #fff4d6 / #10302c.
   ========================================================================== */
function ArmsLinked({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "78%", height: "5%", width: "80%", background: "#10302c" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "24%", width: "72%", height: "52%" })}>
          <path d="M4 15.6c0-3 1.8-4.6 4-4.6s4 1.6 4 4.6c0-3 1.8-4.6 4-4.6s4 1.6 4 4.6" fill="none" stroke="#86c8bd" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="8" cy="6.4" r="2.4" fill="#fff4d6" />
          <circle cx="16" cy="6.4" r="2.4" fill="#fff4d6" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "32%", top: "30%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "78%", height: "6%", width: "76%", background: "#86c8bd" })} />
        <svg viewBox="0 0 24 24" className="g08-hitpop absolute block" style={st({ ...dseq(delayMs, 200), left: "12%", top: "22%", width: "76%", height: "56%" })}>
          <path d="M2 16c0-3.2 2-5 4.6-5s4.6 1.8 4.6 5c0-3.2 2-5 4.6-5s4.6 1.8 4.6 5" fill="none" stroke="#fff4d6" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 410), ...box(1.9, 1.9), borderRadius: "50%", border: "2px solid rgba(134,200,189,0.8)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(134,200,189,0.3), transparent 66%)" />
      <BoardWideStage>
        {/* tell: the pilot's lamp is raised and the crowd finds its edge */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.14, 0.9), background: "#86c8bd" })} />
        {/* strike: the quayside crowd, shoulder to shoulder */}
        <Row cls="g08-link-fig" n={6} base={delayMs} off={250} step={54} w={1.05} h={1.6} gap={1.08}>
          <path d={BACKFIG} fill="#10302c" stroke="#86c8bd" strokeWidth="1.1" />
        </Row>
        {/* elbow hooks elbow, link by link, until the cordon is unbroken */}
        <Row cls="g08-link-arm" n={5} base={delayMs} off={330} step={62} w={1.1} h={0.7} gap={1.08} dx={0.54} dy={0.1} vb="0 0 24 12">
          <path d="M2 8c0-3.2 2.2-5 5-5s5 1.8 5 5c0-3.2 2.2-5 5-5s5 1.8 5 5" fill="none" stroke="#fff4d6" strokeWidth="2.6" strokeLinecap="round" />
        </Row>
        {/* the pilot's lamp, held over the man they are keeping */}
        <svg viewBox="0 0 24 24" className="g08-link-lamp absolute block" style={st({ ...d(delayMs, 470), ...box(1.6, 1.9, 0, -1.5) })}>
          <path d="M8 8h8l1.4 11H6.6z" fill="#10302c" stroke="#86c8bd" strokeWidth="1.3" />
          <path d="M9.6 8V5.4h4.8V8" fill="none" stroke="#86c8bd" strokeWidth="1.3" />
          <circle cx="12" cy="13.4" r="2.8" fill="#fff4d6" />
        </svg>
        {/* settle: lamplight spreads out over the water */}
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 640), ...box(5.4, 5.4), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.4)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   6. Lighthouse Walk — THE LAMPS COME ON. One lantern is lit from the next all
   the way along the sea wall, and the whole walk turns toward the light.
   Palette: #ffd27a / #fff4d6 / #2a1f10.
   ========================================================================== */
function LampsCatch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#2a1f10" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "66%" })}>
          <path d="M7.6 9h8.8l1.4 11H6.2z" fill="#2a1f10" stroke="#ffd27a" strokeWidth="1.3" />
          <path d="M9.4 9V4.6h5.2V9" fill="none" stroke="#ffd27a" strokeWidth="1.3" />
          <path d="M12 11.2c1.8 1.6 2.6 2.8 2.6 4.2a2.6 2.6 0 11-5.2 0c0-1.4.8-2.6 2.6-4.2z" fill="#fff4d6" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "24%", top: "26%", width: "52%", height: "52%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,210,122,0.85), transparent 68%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "18%", top: "80%", height: "6%", width: "64%", background: "#ffd27a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitpop absolute block" style={st({ ...dseq(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "64%" })}>
          <path d="M7.6 9h8.8l1.4 11H6.2z" fill="#2a1f10" stroke="#ffd27a" strokeWidth="1.4" />
          <path d="M12 11.4c1.7 1.5 2.4 2.7 2.4 4a2.4 2.4 0 11-4.8 0c0-1.3.7-2.5 2.4-4z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 410), ...box(2, 2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,210,122,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(255,210,122,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the unlit walk, a dark parapet across the crowd */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.5, 1.2), background: "rgba(42,31,16,0.8)" })} />
        {/* strike: the lantern holders, each waiting on the one before */}
        <Row cls="g08-lamp-fig" n={5} base={delayMs} off={250} step={60} w={1.05} h={1.7} gap={1.14} dy={0.1}>
          <path d={BACKFIG} fill="#2a1f10" stroke="#ffd27a" strokeWidth="1.1" />
        </Row>
        {/* and the flame is passed, one from the next, along the wall */}
        <Row cls="g08-lamp-flame" n={5} base={delayMs} off={340} step={66} w={0.8} h={1} gap={1.14} dy={-0.9}>
          <path d="M12 3.6c3.4 3.4 5 5.8 5 8.4a5 5 0 11-10 0c0-2.6 1.6-5 5-8.4z" fill="#fff4d6" />
        </Row>
        {/* the light finally throws a beam out over the water */}
        <span className="g08-lamp-beam absolute block" style={st({ ...d(delayMs, 490), ...box(7, 1.4, 0, -1.7), background: "linear-gradient(90deg, transparent, rgba(255,210,122,0.75), transparent)" })} />
        {/* settle: sea haze off the wall, drifting from the caster's side */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 650), ...box(6.4, 2.6, 0, -2.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   7. Harborside Rider — THE GAP CLOSES. The crowd shoulders together and every
   opening in the line snaps shut in turn, so there is no lane left to slip
   through.
   Palette: #cfd8e0 / #fff4d6 / #232b33.
   ========================================================================== */
function GapCloses({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "80%", height: "5%", width: "84%", background: "#232b33" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "22%", width: "72%", height: "56%" })}>
          <path d="M2.4 20V10.6a3 3 0 016 0V20zM15.6 20v-9.4a3 3 0 016 0V20z" fill="#cfd8e0" />
          <circle cx="5.4" cy="5.6" r="2.4" fill="#fff4d6" />
          <circle cx="18.6" cy="5.6" r="2.4" fill="#fff4d6" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "42%", top: "34%", width: "16%", height: "44%", background: "#fff4d6" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "44%", top: "12%", height: "76%", width: "12%", background: "#232b33" })} />
        <svg viewBox="0 0 24 24" className="g08-hitside absolute block" style={st({ ...dseq(delayMs, 190), left: "12%", top: "16%", width: "76%", height: "66%" })}>
          <path d="M2.6 20v-8.4a2.8 2.8 0 015.6 0V20zM15.8 20v-8.4a2.8 2.8 0 015.6 0V20z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 410), ...box(1.8, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(207,216,224,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(90deg, rgba(207,216,224,0.26), transparent 70%)" />
      <BoardWideStage>
        {/* tell: the lane through the crowd, chalked and still open */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.16, 1.3), background: "#cfd8e0" })} />
        {/* strike: the crowd slides shoulder to shoulder, in order */}
        <Row cls="g08-gap-fig" n={6} base={delayMs} off={250} step={52} w={1} h={1.7} gap={1.02}>
          <path d={BACKFIG} fill="#232b33" stroke="#cfd8e0" strokeWidth="1.1" />
        </Row>
        {/* the gaps between them collapse one at a time */}
        <Row cls="g08-gap-shut" n={5} base={delayMs} off={320} step={58} w={0.36} h={1.5} gap={1.02} dx={0.51} vb="0 0 8 24">
          <rect x="1.6" y="0" width="4.8" height="24" fill="#232b33" />
        </Row>
        {/* and a bar is drawn across the closed line */}
        <span className="g08-gap-bar absolute block" style={st({ ...d(delayMs, 480), ...span(0.3, -1.3), background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" })} />
        {/* settle: the crowd breathes out */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 640), ...box(6.4, 2.2, 0, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   8. Homesick Private — THE RANKS BREAK. A cap goes into the air away from the
   caster's own side, and behind it the parade line comes apart man by man.
   Palette: #e2a05a / #fff4d6 / #33200f.
   ========================================================================== */
function RanksBreak({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#33200f" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "48%" })}>
          <path d="M3.4 16.4c0-1.2 1.2-2 3.4-2.4l1-4.4c.3-1.4 1.6-2.4 3.2-2.4h2c1.6 0 2.9 1 3.2 2.4l1 4.4c2.2.4 3.4 1.2 3.4 2.4z" fill="#e2a05a" stroke="#33200f" strokeWidth="1.2" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "12%", top: "10%", width: "34%", height: "34%" })}>
          <path d="M4 20L20 4M20 4l-5.4.6M20 4l-.6 5.4" fill="none" stroke="#fff4d6" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "78%", height: "6%", width: "76%", background: "#e2a05a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitturn absolute block" style={st({ ...dseq(delayMs, 190), left: "22%", top: "14%", width: "56%", height: "68%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.4, 0, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(226,160,90,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(226,160,90,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the parade line, dressed and about to stop being a line */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.22, 1.4), background: "rgba(51,32,15,0.8)" })} />
        {/* strike: the cap is thrown, and it goes away from the caster */}
        <svg viewBox="0 0 24 24" className="g08-break-cap absolute block" style={st({ ...d(delayMs, 240), ...box(1.7, 1.2, -1.8, -0.6) })}>
          <path d="M3.4 16.4c0-1.2 1.2-2 3.4-2.4l1-4.4c.3-1.4 1.6-2.4 3.2-2.4h2c1.6 0 2.9 1 3.2 2.4l1 4.4c2.2.4 3.4 1.2 3.4 2.4z" fill="#e2a05a" stroke="#33200f" strokeWidth="1.2" />
        </svg>
        {/* the ranks peel out of line behind it, one man at a time */}
        <Row cls="g08-break-rank" n={6} base={delayMs} off={340} step={64} w={1.05} h={1.7} gap={1.12} dy={0.2}>
          <path d={FIG} fill="#fff4d6" />
        </Row>
        {/* the dressing line itself snaps and springs open */}
        <span className="g08-break-line absolute block" style={st({ ...d(delayMs, 470), ...span(0.14, 1.05), background: "#e2a05a" })} />
        {/* settle: kicked parade dust, drifting off the caster's side */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 650), ...box(6.6, 2.4, 0, 1.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   9. Homing Pigeon — THE FLOCK LIFTS. Birds flush off the crowd in sections,
   then the whole flock wheels as one thing down the line.
   Palette: #cdd6e6 / #fff4d6 / #1b2230.
   ========================================================================== */
function FlockLifts({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#1b2230" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "26%", width: "76%", height: "48%" })}>
          <path d={BIRD} fill="#cdd6e6" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "54%", top: "8%", width: "38%", height: "38%" })}>
          <path d={BIRD} fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "22%", top: "76%", height: "8%", width: "56%", borderRadius: "50%", background: "#cdd6e6" })} />
        <svg viewBox="0 0 24 24" className="g08-hitside absolute block" style={st({ ...dseq(delayMs, 190), left: "10%", top: "14%", width: "80%", height: "58%" })}>
          <path d={BIRD} fill="#fff4d6" />
        </svg>
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.4, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(205,214,230,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(0deg, rgba(27,34,48,0.4), rgba(205,214,230,0.16) 70%)" />
      <AimStage>
        {/* tell: the flock is still on the ground, all facing one way */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...lane(0.6, 1.2), background: "rgba(27,34,48,0.75)" })} />
        {/* strike: they flush in sections, away from the caster's own side */}
        <Row cls="g08-flock-bird" n={6} base={delayMs} off={250} step={52} w={1.5} h={1} gap={1.08} dx={0.7} dy={0.2}>
          <path d={BIRD} fill="#cdd6e6" />
        </Row>
        {/* the flock finds one mind and wheels along the leg */}
        <svg viewBox="0 0 64 24" className="g08-flock-wheel absolute block" style={st({ ...d(delayMs, 400), ...lane(2.6, -1.2) })} preserveAspectRatio="none">
          <path d="M2 20c10-12 22-16 36-14 10 1.4 18 5 24 10" fill="none" stroke="#fff4d6" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="5 4" />
        </svg>
        {/* one feather is left behind by the whole business */}
        <svg viewBox="0 0 24 24" className="g08-flock-feather absolute block" style={st({ ...d(delayMs, 520), ...box(1.2, 2, -1.2, 0.8) })}>
          <path d="M12 2.4c3.4 3.6 4.6 7.4 3.6 11.4-.8 3.2-2.4 5.6-4.8 7.6l-.4-6.6c-2.6-1.6-3.8-4-3.6-7 .2-2.4 2-4.2 5.2-5.4z" fill="#fff4d6" />
        </svg>
        {/* settle: down and dust hanging where they were */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 660), ...box(6, 2.6, 1, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(205,214,230,0.44), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   10. Parade Route — THE WAVE. Arms go into the air in sequence along the rank
   and the crest runs the whole width the play touches.
   Palette: #7fc6e8 / #fff4d6 / #0f2a3a.
   ========================================================================== */
function CrowdWave({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "80%", height: "5%", width: "84%", background: "#0f2a3a" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "16%", width: "44%", height: "68%" })}>
          <path d={ARMUP} fill="#7fc6e8" />
        </svg>
        <svg viewBox="0 0 48 16" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "6%", top: "48%", width: "88%", height: "26%" })} preserveAspectRatio="none">
          <path d="M2 14c8-11 16-11 23 0 7-11 14-11 21 0" fill="none" stroke="#fff4d6" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "80%", height: "6%", width: "72%", background: "#7fc6e8" })} />
        <svg viewBox="0 0 24 24" className="g08-hitwave absolute block" style={st({ ...dseq(delayMs, 190), left: "28%", top: "12%", width: "44%", height: "72%" })}>
          <path d={ARMUP} fill="#fff4d6" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.8), borderRadius: "50%", border: "2px solid rgba(127,198,232,0.75)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(127,198,232,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the seated rank, elbows on knees, waiting for it to reach them */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.16, 1.5), background: "#7fc6e8" })} />
        <Row cls="g08-wave-fig" n={5} base={delayMs} off={220} step={44} w={0.9} h={1.2} gap={1.06} dy={0.9}>
          <path d={BACKFIG} fill="#0f2a3a" stroke="#7fc6e8" strokeWidth="1.1" />
        </Row>
        {/* strike: the arms go into the air in order and the wave passes */}
        <Row cls="g08-wave-arm" n={6} base={delayMs} off={300} step={56} w={0.8} h={1.7} gap={1.06} dy={-0.5}>
          <path d={ARMUP} fill="#fff4d6" />
        </Row>
        {/* the crest itself, as wide as the play actually reaches */}
        <svg viewBox="0 0 96 16" className="g08-wave-crest absolute block" style={st({ ...d(delayMs, 460), ...span(1.5, -1.6) })} preserveAspectRatio="none">
          <path d="M2 14C14 0 26 0 38 14 50 0 62 0 74 14c6-7 12-10 20-9" fill="none" stroke="#7fc6e8" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* settle: paper streamers coming back to earth */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 640), ...box(6.6, 2.6, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.44), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   11. Piggyback — THE QUEUE BECOMES A SCRUM. An orderly line loses its shape
   from one end, folds into a heap, and spits one man out over the top of it.
   Palette: #d99a6c / #fff4d6 / #2e1a10.
   ========================================================================== */
function QueueScrum({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#2e1a10" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "22%", width: "68%", height: "58%" })}>
          <path d="M2.6 20c0-4 2.6-6.4 6-6.4s6 2.4 6 6.4zM9.4 20c0-4 2.6-6.4 6-6.4s6 2.4 6 6.4z" fill="#d99a6c" />
          <circle cx="8.6" cy="9" r="2.6" fill="#fff4d6" />
          <circle cx="15.4" cy="9" r="2.6" fill="#fff4d6" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "2%", width: "36%", height: "36%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "78%", height: "7%", width: "76%", background: "#d99a6c" })} />
        <svg viewBox="0 0 24 24" className="g08-hitpop absolute block" style={st({ ...dseq(delayMs, 190), left: "12%", top: "20%", width: "76%", height: "58%" })}>
          <path d="M2 20c0-4.4 2.8-7 6.4-7s6.4 2.6 6.4 7zM9 20c0-4.4 2.8-7 6.4-7s6.4 2.6 6.4 7z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(2, 1.4, 0, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(217,154,108,0.62), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(217,154,108,0.3), transparent 68%)" />
      <AimStage>
        {/* tell: the queue, still neat, ruled out along the leg */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 110), ...lane(0.14, 0.9), background: "#fff4d6" })} />
        {/* strike: the line loses its shape from one end inward */}
        <Row cls="g08-scrum-fig" n={6} base={delayMs} off={250} step={56} w={1.05} h={1.6} gap={1.1} dx={0.6}>
          <path d={BACKFIG} fill="#2e1a10" stroke="#d99a6c" strokeWidth="1.1" />
        </Row>
        {/* and packs into a heap that bulges where they all meet */}
        <span className="g08-scrum-heap absolute block" style={st({ ...d(delayMs, 400), ...box(3.4, 2.2, 0.9, 0.3), borderRadius: "50%", background: "radial-gradient(circle, #d99a6c, rgba(46,26,16,0.7) 68%, transparent 78%)" })} />
        {/* one man is squeezed clean over the top and along the leg */}
        <svg viewBox="0 0 24 24" className="g08-scrum-pop absolute block" style={st({ ...d(delayMs, 520), ...box(1.4, 2, 0.9, -0.8) })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        {/* settle: trampled dust where the queue used to be */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 670), ...box(5.4, 2.4, 0.6, 1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   12. Pilgrim Road — THE WAVE OF KNEELING. Knees hit the road in sequence all
   the way along it, staffs tipping as they go, and then the road is walked on.
   Palette: #cbb894 / #fff4d6 / #2b2417.
   ========================================================================== */
function KneelWave({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#2b2417" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "62%" })}>
          <path d={KNEELFIG} fill="#cbb894" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "58%", top: "10%", width: "26%", height: "72%" })}>
          <path d="M12 2v20" stroke="#fff4d6" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#cbb894" })} />
        <svg viewBox="0 0 24 24" className="g08-hitdrop absolute block" style={st({ ...dseq(delayMs, 190), left: "20%", top: "16%", width: "60%", height: "66%" })}>
          <path d={KNEELFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.1, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(203,184,148,0.65), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(203,184,148,0.3), transparent 68%)" />
      <AimStage>
        {/* tell: the road itself, running the true distance to be walked */}
        <span className="g08-kneel-road absolute block" style={st({ ...d(delayMs, 110), ...lane(1.1, 1), background: "linear-gradient(180deg, rgba(203,184,148,0.75), rgba(43,36,23,0.85))" })} />
        {/* strike: the staffs tip forward first, one after another */}
        <Row cls="g08-kneel-staff" n={5} base={delayMs} off={250} step={68} w={0.5} h={2.2} gap={1.2} dx={0.9} dy={-0.4} vb="0 0 8 24">
          <path d="M4 1v22" stroke="#cbb894" strokeWidth="2.4" strokeLinecap="round" />
        </Row>
        {/* then the knees come down, in the same order, along the road */}
        <Row cls="g08-kneel-fig" n={5} base={delayMs} off={340} step={68} w={1.35} h={1.6} gap={1.2} dx={0.9} dy={0.1}>
          <path d={KNEELFIG} fill="#fff4d6" />
        </Row>
        {/* a low band of road dust knocked loose by the whole line */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 500), ...lane(0.7, 1.5), background: "linear-gradient(90deg, rgba(255,244,214,0.6), transparent)" })} />
        {/* settle: incense and grit hanging over the road */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 670), ...box(5.6, 2.4, 1.4, -1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   13. Regroup at Camp — THE TOOLS GO DOWN. A strike passes along the working
   line: hammer, spade, hammer, spade, each set on the ground in turn, and every
   pair of arms folds.
   Palette: #b9c6a0 / #fff4d6 / #23281a.
   ========================================================================== */
function ToolsDown({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#23281a" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "64%" })}>
          <path d="M11 8h2v14h-2z" fill="#b9c6a0" />
          <path d="M6.4 3.6h11.2v4.2H6.4z" fill="#fff4d6" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "8%", top: "50%", width: "40%", height: "40%" })}>
          <path d="M3 18h18" stroke="#b9c6a0" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "82%", height: "6%", width: "80%", background: "#b9c6a0" })} />
        <svg viewBox="0 0 24 24" className="g08-hitdrop absolute block" style={st({ ...dseq(delayMs, 190), left: "18%", top: "14%", width: "64%", height: "70%" })}>
          <path d="M11 7h2v15h-2z" fill="#fff4d6" />
          <path d="M6 2.6h12v4.2H6z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.1, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,198,160,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(0deg, rgba(185,198,160,0.28), transparent 64%)" />
      <BoardWideStage>
        {/* tell: the working line, still swinging */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.3, 1.5), background: "rgba(35,40,26,0.8)" })} />
        {/* strike: tool after tool is set on the ground, in order */}
        <Row cls="g08-tool-drop" n={5} base={delayMs} off={250} step={64} w={0.9} h={1.8} gap={1.14} dy={-0.1}>
          <path d="M11 6h2v16h-2z" fill="#b9c6a0" />
          <path d="M6.4 2h11.2v4.4H6.4z" fill="#fff4d6" />
        </Row>
        {/* and the arms fold, in the same order, behind them */}
        <Row cls="g08-tool-fig" n={5} base={delayMs} off={330} step={64} w={1} h={1.6} gap={1.14} dy={0.15}>
          <path d={BACKFIG} fill="#23281a" stroke="#b9c6a0" strokeWidth="1.1" />
        </Row>
        {/* a bar of folded arms across the whole stretch that stopped */}
        <span className="g08-tool-arm absolute block" style={st({ ...d(delayMs, 480), ...span(0.28, 0.15), background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" })} />
        {/* settle: the dust the work was making, finally settling */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 650), ...box(6.4, 2.4, 0, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   14. Revolving Door — THE TURNSTILE. The drum takes a quarter-turn for each
   body in the queue, and the whole crowd is carried round with it.
   Palette: #b9a2d8 / #fff4d6 / #1e1630.
   ========================================================================== */
function Turnstile({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#1e1630" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="#b9a2d8" strokeWidth="1.6" />
          <path d="M12 2.6v18.8M2.6 12h18.8" stroke="#fff4d6" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "36%", top: "36%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "16%", top: "78%", height: "8%", width: "68%", borderRadius: "50%", background: "#b9a2d8" })} />
        <svg viewBox="0 0 24 24" className="g08-hitspin absolute block" style={st({ ...dseq(delayMs, 190), left: "16%", top: "14%", width: "68%", height: "68%" })}>
          <path d="M12 2.8v18.4M2.8 12h18.4" stroke="#fff4d6" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.9), borderRadius: "50%", border: "2px solid rgba(185,162,216,0.75)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(185,162,216,0.3), transparent 66%)" />
      <BoardWideStage>
        {/* tell: the drum of the door, standing still */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...box(4.6, 4.6), borderRadius: "50%", background: "rgba(30,22,48,0.72)" })} />
        <span className="g08-rev-drum absolute block" style={st({ ...d(delayMs, 230), ...box(4.8, 4.8), borderRadius: "50%", border: "2px solid #b9a2d8" })} />
        {/* strike: the vanes take a quarter-turn per body */}
        <svg viewBox="0 0 24 24" className="g08-rev-vane absolute block" style={st({ ...d(delayMs, 320), ...box(4.4, 4.4) })}>
          <path d="M12 1.6v20.8M1.6 12h20.8" stroke="#fff4d6" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {/* the queue is carried round with it, one body per quarter */}
        <Row cls="g08-rev-fig" n={5} base={delayMs} off={420} step={62} w={1} h={1.5} gap={1.2} dy={2.1}>
          <path d={BACKFIG} fill="#b9a2d8" />
        </Row>
        {/* settle: the door coasts to a stop and the light steadies */}
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 640), ...box(6, 6), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.42)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   15. Run for Eggs — THE SCRAMBLE. The queue breaks into a sprint one body at a
   time; the order is gone before the last man knows why he is running.
   Palette: #f0c96b / #fff4d6 / #3a2a10.
   ========================================================================== */
function Scramble({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "80%", height: "5%", width: "84%", background: "#3a2a10" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "64%" })}>
          <path d={RUNFIG} fill="#f0c96b" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "6%", top: "54%", width: "38%", height: "38%" })}>
          <ellipse cx="12" cy="13" rx="6" ry="7.6" fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "62%", height: "6%", width: "88%", background: "#f0c96b" })} />
        <svg viewBox="0 0 24 24" className="g08-hitwave absolute block" style={st({ ...dseq(delayMs, 190), left: "18%", top: "16%", width: "64%", height: "66%" })}>
          <path d={RUNFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,201,107,0.62), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(240,201,107,0.3), transparent 68%)" />
      <AimStage>
        {/* tell: the queue is still a queue, ruled along the leg */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 110), ...lane(0.14, 1), background: "#fff4d6" })} />
        {/* strike: one after another they break into a run */}
        <Row cls="g08-scr-fig" n={6} base={delayMs} off={250} step={54} w={1.25} h={1.6} gap={1.06} dx={0.7}>
          <path d={RUNFIG} fill="#f0c96b" />
        </Row>
        {/* speed streaks that reach exactly as far as the run does */}
        <svg viewBox="0 0 60 14" className="g08-scr-streak absolute block" style={st({ ...d(delayMs, 380), ...lane(1.3, -0.9) })} preserveAspectRatio="none">
          <path d="M2 4h22M10 8h26M4 12h18" stroke="#fff4d6" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {/* the basket is dropped and the eggs go everywhere */}
        <svg viewBox="0 0 24 24" className="g08-scr-egg absolute block" style={st({ ...d(delayMs, 500), ...box(2.2, 1.6, -1.6, 1.1) })}>
          <ellipse cx="6" cy="14" rx="3.4" ry="4.2" fill="#fff4d6" />
          <ellipse cx="14" cy="17" rx="2.8" ry="3.6" fill="#fff4d6" />
          <ellipse cx="20" cy="11" rx="2.4" ry="3" fill="#f0c96b" />
        </svg>
        {/* settle: kicked straw and dust off the run */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 660), ...box(5.6, 2.4, 1.2, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   16. Salt from the Coast — BACKS TO THE SPRAY. The sheet comes over the wall,
   and the whole line turns its back to it in order, coats flapping.
   Palette: #9ec9d6 / #fff4d6 / #14262e.
   ========================================================================== */
function BacksToSpray({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "80%", height: "5%", width: "84%", background: "#14262e" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "64%" })}>
          <path d={BACKFIG} fill="#9ec9d6" />
        </svg>
        <svg viewBox="0 0 48 20" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "4%", top: "12%", width: "92%", height: "36%" })} preserveAspectRatio="none">
          <path d="M2 18C10 4 20 2 30 6c8 3 12 7 16 12" fill="none" stroke="#fff4d6" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#9ec9d6" })} />
        <svg viewBox="0 0 24 24" className="g08-hitturn absolute block" style={st({ ...dseq(delayMs, 190), left: "24%", top: "14%", width: "52%", height: "68%" })}>
          <path d={BACKFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.4, 0, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(158,201,214,0.62), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(0deg, rgba(158,201,214,0.3), transparent 66%)" />
      <BoardWideStage>
        {/* tell: the sea wall coping, dark and dry for one more second */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.4, 1.3), background: "rgba(20,38,46,0.82)" })} />
        {/* strike: the spray sheet comes over from the caster's own side */}
        <svg viewBox="0 0 96 28" className="g08-salt-spray absolute block" style={st({ ...d(delayMs, 250), ...span(3, -0.9) })} preserveAspectRatio="none">
          <path d="M2 26C14 2 30 0 46 8c14 7 26 6 48 18" fill="none" stroke="#9ec9d6" strokeWidth="4" strokeLinecap="round" />
          <path d="M14 26c8-12 18-14 30-8" fill="none" stroke="#fff4d6" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {/* the line turns its back to it, one shoulder at a time */}
        <Row cls="g08-salt-turn" n={6} base={delayMs} off={340} step={62} w={1.05} h={1.7} gap={1.14} dy={0.4}>
          <path d={BACKFIG} fill="#fff4d6" />
        </Row>
        {/* salt crusts on the stone where the sheet landed */}
        <svg viewBox="0 0 72 12" className="g08-salt-crust absolute block" style={st({ ...d(delayMs, 500), ...span(0.9, 1.5) })} preserveAspectRatio="none">
          <path d="M6 9l3-5 3 5zM22 9l3-5 3 5zM40 9l3-5 3 5zM58 9l3-5 3 5z" fill="#fff4d6" />
        </svg>
        {/* settle: brine haze blowing off the wall */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 660), ...box(6.6, 2.6, 0, -1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   17. Second Thoughts — THE LINE ROCKS BACK. A rank leans into the advance,
   then one man's doubt spreads and every body rocks onto its heels.
   Palette: #d7c2e8 / #fff4d6 / #241a33.
   ========================================================================== */
function RockBack({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#241a33" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "20%", width: "52%", height: "62%" })}>
          <path d={FIG} fill="#d7c2e8" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "4%", width: "36%", height: "36%" })}>
          <path d="M8 8.4a4 4 0 117.4 2.2c-1.2 1.6-2.4 2.2-2.4 4h-2c0-2.6 1.2-3.4 2.2-4.6a2 2 0 10-3.4-1.6z" fill="#fff4d6" />
          <circle cx="12" cy="19" r="1.6" fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "82%", height: "6%", width: "76%", background: "#d7c2e8" })} />
        <svg viewBox="0 0 24 24" className="g08-hitrock absolute block" style={st({ ...dseq(delayMs, 190), left: "24%", top: "14%", width: "52%", height: "70%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.1, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(215,194,232,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(215,194,232,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: a question blooms over the one who thinks first */}
        <svg viewBox="0 0 24 24" className="g08-2nd-mark absolute block" style={st({ ...d(delayMs, 130), ...box(1.4, 1.6, -2.3, -1.6) })}>
          <path d="M8 8.4a4 4 0 117.4 2.2c-1.2 1.6-2.4 2.2-2.4 4h-2c0-2.6 1.2-3.4 2.2-4.6a2 2 0 10-3.4-1.6z" fill="#fff4d6" />
          <circle cx="12" cy="19" r="1.6" fill="#fff4d6" />
        </svg>
        {/* strike: the doubt spreads and the rank rocks onto its heels */}
        <Row cls="g08-2nd-fig" n={5} base={delayMs} off={260} step={66} w={1.05} h={1.7} gap={1.14}>
          <path d={FIG} fill="#d7c2e8" />
        </Row>
        {/* the tracks they made are walked back over */}
        <Row cls="g08-2nd-track" n={5} base={delayMs} off={380} step={66} w={0.6} h={0.9} gap={1.14} dy={1.5}>
          <ellipse cx="12" cy="9" rx="5" ry="7.4" fill="#fff4d6" />
        </Row>
        {/* the whole stretch that changed its mind, underlined */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 500), ...span(0.16, 1.05), background: "#d7c2e8" })} />
        {/* settle: the rank breathes and the dust drops behind it */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 660), ...box(6.4, 2.4, 0, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   18. Servants' Entrance — THE CROWD PARTS. A packed press is pushed aside from
   one end to the other and a clean lane opens where nobody was standing.
   Palette: #c8b48a / #fff4d6 / #2a2318.
   ========================================================================== */
function CrowdParts({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "42%", top: "16%", height: "68%", width: "16%", background: "#fff4d6" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "22%", width: "34%", height: "60%" })}>
          <path d={BACKFIG} fill="#c8b48a" stroke="#2a2318" strokeWidth="1.1" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "60%", top: "22%", width: "34%", height: "60%" })}>
          <path d={BACKFIG} fill="#c8b48a" stroke="#2a2318" strokeWidth="1.1" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#c8b48a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitpart absolute block" style={st({ ...dseq(delayMs, 190), left: "10%", top: "16%", width: "80%", height: "66%" })}>
          <path d="M2.4 20v-8a2.8 2.8 0 015.6 0v8zM16 20v-8a2.8 2.8 0 015.6 0v8z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(200,180,138,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(200,180,138,0.28), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the press, packed solid, with no way through it */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...box(6.4, 2.4), background: "rgba(42,35,24,0.72)" })} />
        {/* strike: one half is pressed clear, from one end to the other */}
        <Row cls="g08-part-a" n={5} base={delayMs} off={250} step={60} w={1} h={1.6} gap={1.16} dy={-0.85}>
          <path d={BACKFIG} fill="#c8b48a" stroke="#2a2318" strokeWidth="1.1" />
        </Row>
        {/* the other half goes the other way, on the same count */}
        <Row cls="g08-part-b" n={5} base={delayMs} off={300} step={60} w={1} h={1.6} gap={1.16} dy={0.85}>
          <path d={BACKFIG} fill="#c8b48a" />
        </Row>
        {/* and the lane opens, exactly as wide as the play reaches */}
        <span className="g08-part-lane absolute block" style={st({ ...d(delayMs, 460), ...span(0.5), background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" })} />
        {/* settle: dust off the flagstones nobody is standing on */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 640), ...box(6.4, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   19. Sidestep and Bow — THE WAVE OF BOWS. Hats come off and backs fold in
   sequence along the line, each bow a beat behind the one before it.
   Palette: #e0b978 / #fff4d6 / #2f2210.
   ========================================================================== */
function BowWave({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#2f2210" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "22%", width: "64%", height: "58%" })}>
          <path d={BOWFIG} fill="#e0b978" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "52%", top: "6%", width: "42%", height: "42%" })}>
          <path d="M3 17c0-1.4 1.6-2.2 4.4-2.6l1-3.6C8.8 9.2 10.2 8 12 8s3.2 1.2 3.6 2.8l1 3.6c2.8.4 4.4 1.2 4.4 2.6z" fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "82%", height: "6%", width: "76%", background: "#e0b978" })} />
        <svg viewBox="0 0 24 24" className="g08-hitbow absolute block" style={st({ ...dseq(delayMs, 190), left: "18%", top: "16%", width: "64%", height: "66%" })}>
          <path d={BOWFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(224,185,120,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(224,185,120,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the receiving line, dressed and upright */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.16, 1.4), background: "#e0b978" })} />
        {/* strike: the hats come off along the line, one at a time */}
        <Row cls="g08-bow-hat" n={5} base={delayMs} off={250} step={64} w={0.95} h={0.8} gap={1.14} dy={-1.1} vb="0 0 24 14">
          <path d="M2 12c0-1.2 1.6-2 4.4-2.4l1-3.4C7.8 4.6 9.2 3.4 11 3.4h2c1.8 0 3.2 1.2 3.6 2.8l1 3.4c2.8.4 4.4 1.2 4.4 2.4z" fill="#fff4d6" />
        </Row>
        {/* and the backs fold, in the same order, a beat behind */}
        <Row cls="g08-bow-fig" n={5} base={delayMs} off={330} step={64} w={1.2} h={1.6} gap={1.14} dy={0.25}>
          <path d={BOWFIG} fill="#e0b978" />
        </Row>
        {/* the plume on the first hat dips lowest of all */}
        <svg viewBox="0 0 24 24" className="g08-bow-plume absolute block" style={st({ ...d(delayMs, 480), ...box(1.4, 2, -2.6, -1.4) })}>
          <path d="M12 2.4c3.2 3.8 4.2 7.6 3 11.6-.8 2.8-2.4 5-4.6 6.8l-.2-6.2c-2.4-1.6-3.4-3.9-3-6.8.3-2.4 2-4.2 4.8-5.4z" fill="#fff4d6" />
        </svg>
        {/* settle: powder shaken out of the wigs */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 650), ...box(6.4, 2.4, 0, -1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.44), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   20. Smugglers' Lane — THE HUSH. The noise of the lane is flattened square by
   square: a finger goes to lips, the bars go flat, the shutter is closed.
   Palette: #7f93a8 / #fff4d6 / #101820.
   ========================================================================== */
function HushFalls({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#101820" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "16%", width: "52%", height: "68%" })}>
          <path d={HEADP} fill="#7f93a8" />
          <path d="M15.6 12.6V6.2" stroke="#fff4d6" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 40 12" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "8%", top: "62%", width: "84%", height: "22%" })} preserveAspectRatio="none">
          <path d="M2 6h36" stroke="#fff4d6" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "80%", height: "6%", width: "76%", background: "#7f93a8" })} />
        <svg viewBox="0 0 24 24" className="g08-hitflat absolute block" style={st({ ...dseq(delayMs, 190), left: "12%", top: "22%", width: "76%", height: "56%" })}>
          <path d="M3 20V9h2.6v11zM8.4 20V4H11v16zM13.8 20V7h2.6v13zM19.2 20v-8h2.6v8z" fill="#fff4d6" />
        </svg>
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(127,147,168,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(16,24,32,0.5), rgba(127,147,168,0.12) 70%)" />
      <AimStage>
        {/* tell: a finger goes to the lips at the head of the lane */}
        <svg viewBox="0 0 24 24" className="g08-hush-fin absolute block" style={st({ ...d(delayMs, 120), ...box(1.6, 1.9, 0.2, -1.3) })}>
          <path d={HEADP} fill="#7f93a8" />
          <path d="M15.8 12.8V6.4" stroke="#fff4d6" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {/* strike: the noise is flattened square by square down the lane */}
        <Row cls="g08-hush-bar" n={7} base={delayMs} off={260} step={62} w={0.4} h={1.9} gap={0.86} dx={1.1} dy={0.3} vb="0 0 8 24">
          <rect x="2" y="0" width="4" height="24" fill="#7f93a8" />
        </Row>
        {/* the lantern shutter comes across and takes the last of it */}
        <svg viewBox="0 0 24 24" className="g08-hush-shut absolute block" style={st({ ...d(delayMs, 460), ...box(1.9, 1.9, -1.8, 0.6) })}>
          <rect x="4" y="4" width="16" height="16" fill="#101820" stroke="#7f93a8" strokeWidth="1.4" />
          <path d="M6 8h12M6 12h12M6 16h12" stroke="#fff4d6" strokeWidth="1.2" />
        </svg>
        {/* the lane itself goes quiet along its real length */}
        <span className="g08-hush-lane absolute block" style={st({ ...d(delayMs, 560), ...lane(0.16, 1.5), background: "linear-gradient(90deg, #fff4d6, transparent)" })} />
        {/* settle: the silence drifts off the caster's own side */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 690), ...box(5.6, 2.6, 1.2, -1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.36), transparent 76%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   21. Soup's On — THE BELL AND THE TURN. A hand bell is swung and every body in
   the yard pivots to face it, one after another, backs becoming faces.
   Palette: #e9b45c / #fff4d6 / #33230f.
   ========================================================================== */
function BellTurn({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#33230f" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "14%", width: "48%", height: "70%" })}>
          <path d="M12 3.4a1.8 1.8 0 011.8 1.8v.8c2.8 1 4.6 3.6 4.6 7V17H5.6v-4c0-3.4 1.8-6 4.6-7v-.8A1.8 1.8 0 0112 3.4z" fill="#e9b45c" stroke="#33230f" strokeWidth="1.1" />
          <circle cx="12" cy="19.4" r="2" fill="#fff4d6" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "22%", top: "16%", width: "56%", height: "56%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 68%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "80%", height: "6%", width: "76%", background: "#e9b45c" })} />
        <svg viewBox="0 0 24 24" className="g08-hitturn absolute block" style={st({ ...dseq(delayMs, 190), left: "24%", top: "14%", width: "52%", height: "68%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.9), borderRadius: "50%", border: "2px solid rgba(233,180,92,0.8)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(233,180,92,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the yard, all backs, nobody looking at anything */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.34, 1.5), background: "rgba(51,35,15,0.78)" })} />
        {/* strike: the bell is swung */}
        <svg viewBox="0 0 24 24" className="g08-bell-body absolute block" style={st({ ...d(delayMs, 240), ...box(2, 2.4, 0, -1.5) })}>
          <path d="M12 3.4a1.8 1.8 0 011.8 1.8v.8c2.8 1 4.6 3.6 4.6 7V17H5.6v-4c0-3.4 1.8-6 4.6-7v-.8A1.8 1.8 0 0112 3.4z" fill="#e9b45c" stroke="#33230f" strokeWidth="1.2" />
          <circle cx="12" cy="19.4" r="2" fill="#fff4d6" />
        </svg>
        {/* the sound goes out across the yard */}
        <span className="g08-bell-ring absolute block" style={st({ ...d(delayMs, 340), ...box(4.6, 4.6, 0, -1.2), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.7)" })} />
        {/* and every body pivots to face it, one after another */}
        <Row cls="g08-bell-turn" n={6} base={delayMs} off={420} step={62} w={1.05} h={1.7} gap={1.14} dy={0.5}>
          <path d={FIG} fill="#fff4d6" />
        </Row>
        {/* settle: yard dust kicked by the turn */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 660), ...box(6.4, 2.2, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   22. Spice Run — THE CHANT FINDS ITS BEAT. Ragged clapping, out of time, pulls
   itself together hand by hand until the whole crowd is on one beat.
   Palette: #e07a4f / #fff4d6 / #2c1408.
   ========================================================================== */
function ChantBeat({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#2c1408" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "60%" })}>
          <path d="M4 18V9.6a1.8 1.8 0 013.6 0V13l1.6-6.8a1.8 1.8 0 013.5.8L11.6 13h1.2l1.6-5.4a1.8 1.8 0 013.5.9L16.4 14c-.4 3-2.2 4.6-5.4 4.6z" fill="#e07a4f" />
        </svg>
        <svg viewBox="0 0 40 12" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "8%", top: "62%", width: "84%", height: "22%" })} preserveAspectRatio="none">
          <path d="M4 6h4M14 6h4M24 6h4M34 6h4" stroke="#fff4d6" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "80%", height: "6%", width: "72%", background: "#e07a4f" })} />
        <svg viewBox="0 0 24 24" className="g08-hitclap absolute block" style={st({ ...dseq(delayMs, 190), left: "16%", top: "16%", width: "68%", height: "64%" })}>
          <path d="M3 20V9.2a1.9 1.9 0 013.8 0v3.6l1.7-7.2a1.9 1.9 0 013.7.9L10.9 13h1.2l1.7-5.7a1.9 1.9 0 013.7.9L15.8 14.4c-.4 3.2-2.4 5-5.8 5.6z" fill="#fff4d6" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.8), borderRadius: "50%", border: "2px solid rgba(224,122,79,0.8)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(224,122,79,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: open mouths, all saying different things */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...span(0.36, -1.4), background: "rgba(44,20,8,0.75)" })} />
        <Row cls="g08-chant-mouth" n={5} base={delayMs} off={210} step={38} w={0.5} h={0.6} gap={1.02} dy={-1.4} vb="0 0 12 12">
          <ellipse cx="6" cy="6" rx="3.4" ry="4.4" fill="#fff4d6" />
        </Row>
        {/* strike: the clapping hands pull into one beat, hand by hand */}
        <Row cls="g08-chant-hand" n={6} base={delayMs} off={290} step={52} w={1} h={1.4} gap={1.02} dy={0.2}>
          <path d="M4 19V9.4a1.8 1.8 0 013.6 0v3.4l1.6-7a1.8 1.8 0 013.5.9L11.6 13h1.2l1.6-5.6a1.8 1.8 0 013.5.9L16.4 14.4c-.4 3.1-2.3 4.8-5.6 5.2z" fill="#e07a4f" />
        </Row>
        {/* the beat itself, once they have it, across the whole stretch */}
        <svg viewBox="0 0 84 14" className="g08-chant-beat absolute block" style={st({ ...d(delayMs, 470), ...span(1.1, 1.4) })} preserveAspectRatio="none">
          <path d="M5 7h6M25 7h6M45 7h6M65 7h6" stroke="#fff4d6" strokeWidth="6" strokeLinecap="round" />
        </svg>
        {/* settle: the ring of sound going out past the crowd */}
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 640), ...box(6.4, 6.4), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.4)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   23. Tactical Withdrawal — THE ROUT. It starts at one end: a banner goes over,
   and the line folds away from the caster's side man by man until there is no
   line left.
   Palette: #b8523f / #fff4d6 / #2a1008.
   ========================================================================== */
function TheRout({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#2a1008" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "12%", width: "56%", height: "74%" })}>
          <path d="M7 2v20" stroke="#fff4d6" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8.2 3.4h11l-2.4 4 2.4 4h-11z" fill="#b8523f" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "6%", top: "50%", width: "40%", height: "40%" })}>
          <path d={RUNFIG} fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#b8523f" })} />
        <svg viewBox="0 0 24 24" className="g08-hitfold absolute block" style={st({ ...dseq(delayMs, 190), left: "20%", top: "14%", width: "60%", height: "70%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.3, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(184,82,63,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(184,82,63,0.32), transparent 68%)" />
      <BoardWideStage>
        {/* tell: the line, still holding, ruled across the whole stretch */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 120), ...span(0.2, 1.2), background: "#b8523f" })} />
        {/* strike: the line folds from one end, man after man */}
        <Row cls="g08-rout-fig" n={6} base={delayMs} off={250} step={58} w={1} h={1.7} gap={1.06}>
          <path d={FIG} fill="#fff4d6" />
        </Row>
        {/* the banner goes over first and stays over */}
        <svg viewBox="0 0 24 24" className="g08-rout-banner absolute block" style={st({ ...d(delayMs, 350), ...box(2, 2.8, -2.4, -1) })}>
          <path d="M7 2v20" stroke="#fff4d6" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8.2 3.4h11l-2.4 4 2.4 4h-11z" fill="#b8523f" />
        </svg>
        {/* and gaps blow open where whole sections were standing */}
        <Row cls="g08-rout-gap" n={5} base={delayMs} off={480} step={52} w={0.7} h={1.5} gap={1.42} dx={0.53} vb="0 0 12 24">
          <rect x="2" y="0" width="8" height="24" fill="#2a1008" />
        </Row>
        {/* settle: the ground the line was on, smoking */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 660), ...box(6.6, 2.4, 0, 1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   24. Towpath — THE ROPE TAKES UP. Slack rope, then the line leans into it one
   hauler at a time as the take-up travels along the path.
   Palette: #c9a86a / #fff4d6 / #2c2312.
   ========================================================================== */
function RopeTakesUp({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "82%", height: "5%", width: "84%", background: "#2c2312" })} />
        <svg viewBox="0 0 48 20" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "34%", width: "88%", height: "34%" })} preserveAspectRatio="none">
          <path d="M2 4c10 12 22 14 44 6" fill="none" stroke="#c9a86a" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "18%", top: "22%", width: "40%", height: "60%" })}>
          <path d={BOWFIG} fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "58%", height: "7%", width: "88%", background: "#c9a86a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitlean absolute block" style={st({ ...dseq(delayMs, 190), left: "20%", top: "16%", width: "60%", height: "66%" })}>
          <path d={BOWFIG} fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.1, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,106,0.62), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="linear-gradient(0deg, rgba(201,168,106,0.28), transparent 66%)" />
      <AimStage>
        {/* tell: the rope lies slack the whole real length of the haul */}
        <svg viewBox="0 0 96 24" className="g08-tow-rope absolute block" style={st({ ...d(delayMs, 120), ...lane(2, 0.4) })} preserveAspectRatio="none">
          <path d="M2 6c20 18 50 18 92 2" fill="none" stroke="#c9a86a" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
        {/* strike: the take-up runs the line, hauler by hauler */}
        <Row cls="g08-tow-fig" n={6} base={delayMs} off={260} step={62} w={1.3} h={1.6} gap={1.12} dx={0.8} dy={-0.4}>
          <path d={BOWFIG} fill="#fff4d6" />
        </Row>
        {/* and the boat finally comes off the mud */}
        <svg viewBox="0 0 32 16" className="g08-tow-boat absolute block" style={st({ ...d(delayMs, 460), ...box(3.4, 1.7, -2.4, 1.4) })}>
          <path d="M2 8h28l-4 6H6z" fill="#2c2312" stroke="#c9a86a" strokeWidth="1.2" />
          <path d="M16 8V1.4l7 3.2L16 8z" fill="#fff4d6" />
        </svg>
        {/* a low band of towpath grit under the whole haul */}
        <span className="g08-drift absolute block" style={st({ ...d(delayMs, 560), ...lane(0.6, 1.4), background: "linear-gradient(90deg, rgba(255,244,214,0.55), transparent)" })} />
        {/* settle: canal haze over the path */}
        <span className="g08-motes absolute block" style={st({ ...d(delayMs, 690), ...box(5.6, 2.4, 1.2, -1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   25. Growth Spurt — THE CROWD LOOKS. One pawn swells to an absurd size and the
   heads tip back along the rank in order, jaw after jaw coming loose.
   Palette: #9ad48a / #fff4d6 / #14260f.
   ========================================================================== */
function CrowdLooks({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "82%", height: "5%", width: "80%", background: "#14260f" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "10%", width: "48%", height: "74%" })}>
          <circle cx="12" cy="6" r="3.6" fill="#9ad48a" />
          <path d="M8.4 10.4h7.2l-1 3.4h1.8l1.6 7.2H6l1.6-7.2h1.8z" fill="#9ad48a" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "22%", top: "16%", width: "56%", height: "56%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "82%", height: "6%", width: "72%", background: "#9ad48a" })} />
        <svg viewBox="0 0 24 24" className="g08-hittilt absolute block" style={st({ ...dseq(delayMs, 190), left: "22%", top: "14%", width: "56%", height: "68%" })}>
          <path d={HEADP} fill="#fff4d6" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.9), borderRadius: "50%", border: "2px solid rgba(154,212,138,0.75)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(154,212,138,0.3), transparent 68%)" />
      <BoardWideStage>
        {/* tell: a shadow pools under something that is about to be large */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.4, 1.2, 0, 2), borderRadius: "50%", background: "rgba(20,38,15,0.75)" })} />
        {/* strike: the pawn goes up out of all proportion */}
        <svg viewBox="0 0 24 24" className="g08-huge-fig absolute block" style={st({ ...d(delayMs, 250), ...box(4.6, 5.6, 0, -0.9) })}>
          <circle cx="12" cy="5.6" r="3.6" fill="#9ad48a" stroke="#14260f" strokeWidth="1" />
          <path d="M8.4 10h7.2l-1 3.4h1.8l1.8 8H5.8l1.8-8h1.8z" fill="#9ad48a" stroke="#14260f" strokeWidth="1" />
        </svg>
        {/* the heads tip back along the rank, one after another */}
        <Row cls="g08-huge-head" n={5} base={delayMs} off={380} step={56} w={0.85} h={1} gap={1.06} dy={2}>
          <path d={HEADP} fill="#fff4d6" />
        </Row>
        {/* and the jaws come loose behind them */}
        <Row cls="g08-huge-jaw" n={5} base={delayMs} off={470} step={56} w={0.4} h={0.5} gap={1.06} dy={2.55} vb="0 0 12 12">
          <ellipse cx="6" cy="6" rx="3.2" ry="4.4" fill="#14260f" />
        </Row>
        {/* settle: the crowd's held breath going out as one ring */}
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 660), ...box(6.6, 6.6), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.4)" })} />
      </BoardWideStage>
    </>
  );
}

/* =============================================================================
   26. Pebble Toss — THE FLINCH RUNS. One small stone lands, one man flinches,
   and the flinch travels the rank faster than the stone ever did.
   Palette: #a9b6c2 / #fff4d6 / #1a2129.
   ========================================================================== */
function FlinchRuns({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "82%", height: "5%", width: "76%", background: "#1a2129" })} />
        <svg viewBox="0 0 24 24" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "32%", top: "30%", width: "36%", height: "36%" })}>
          <path d="M6 14.4c0-4 2.6-6.6 6.4-6.6 3.4 0 5.6 2.2 5.6 5.4 0 3.4-2.6 5.8-6.2 5.8-3.4 0-5.8-1.8-5.8-4.6z" fill="#a9b6c2" />
        </svg>
        <span className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "50%", border: "2px solid rgba(255,244,214,0.7)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "82%", height: "6%", width: "72%", background: "#a9b6c2" })} />
        <svg viewBox="0 0 24 24" className="g08-hitflinch absolute block" style={st({ ...dseq(delayMs, 190), left: "22%", top: "14%", width: "56%", height: "68%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.8), borderRadius: "50%", border: "2px solid rgba(169,182,194,0.8)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(169,182,194,0.28), transparent 66%)" />
      <AimStage>
        {/* tell: the stone's shadow crosses the ground before it lands */}
        <span className="g08-tell absolute block" style={st({ ...d(delayMs, 110), ...lane(0.5, 1.1), background: "rgba(26,33,41,0.72)" })} />
        {/* strike: the pebble itself, arcing the real distance of the toss */}
        <svg viewBox="0 0 24 24" className="g08-peb-stone absolute block" style={st({ ...d(delayMs, 240), ...box(0.9, 0.9, 0.4, -0.3) })}>
          <path d="M4 14c0-4.4 2.8-7.2 7-7.2 3.6 0 6 2.4 6 5.8 0 3.8-2.8 6.4-6.8 6.4C6.6 19 4 17 4 14z" fill="#a9b6c2" />
        </svg>
        {/* the flinch runs the rank, shoulder after shoulder */}
        <Row cls="g08-peb-flinch" n={6} base={delayMs} off={360} step={50} w={1.1} h={1.7} gap={1.08} dx={0.8} dy={0.2}>
          <path d={FIG} fill="#fff4d6" />
        </Row>
        {/* one ring where the stone actually landed, for scale */}
        <span className="g08-ripple absolute block" style={st({ ...d(delayMs, 470), ...box(2.6, 2.6, 0.4, 0.5), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.65)" })} />
        {/* settle: grit lifted by the flinch, drifting off the caster's side */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 640), ...box(5.4, 2.2, 1.2, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   27. Tiny Trebuchet — PASSED ON PALMS. The crowd puts its hands out in order
   and one small body is carried along the top of them and pitched clear.
   Palette: #d9c27a / #fff4d6 / #2e2510.
   ========================================================================== */
function PassedOnPalms({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g08-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "80%", height: "5%", width: "84%", background: "#2e2510" })} />
        <svg viewBox="0 0 48 20" className="g08-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "48%", width: "88%", height: "34%" })} preserveAspectRatio="none">
          <path d="M4 18v-8a3 3 0 016 0v8zM19 18v-8a3 3 0 016 0v8zM34 18v-8a3 3 0 016 0v8z" fill="#d9c27a" />
        </svg>
        <svg viewBox="0 0 24 24" className="g08-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "6%", width: "40%", height: "44%" })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g08-hitmark absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "6%", width: "80%", background: "#d9c27a" })} />
        <svg viewBox="0 0 24 24" className="g08-hitpalm absolute block" style={st({ ...dseq(delayMs, 190), left: "16%", top: "20%", width: "68%", height: "60%" })}>
          <path d="M3 20v-8.6a3 3 0 016 0V20zM15 20v-8.6a3 3 0 016 0V20z" fill="#fff4d6" />
        </svg>
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(217,194,122,0.62), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <Wash base={delayMs} off={70} bg="radial-gradient(circle at 50% 50%, rgba(217,194,122,0.3), transparent 68%)" />
      <AimStage>
        {/* tell: the packed crowd along the run, hands still at their sides */}
        <span className="g08-tellrun absolute block" style={st({ ...d(delayMs, 110), ...lane(0.16, 1.1), background: "#fff4d6" })} />
        {/* strike: the hands go out in order, making a road of palms */}
        <Row cls="g08-palm-hand" n={7} base={delayMs} off={250} step={46} w={0.9} h={1.2} gap={0.95} dx={1} dy={0.5}>
          <path d="M4 21v-9.4a3.2 3.2 0 016.4 0V21zM13.6 21v-9.4a3.2 3.2 0 016.4 0V21z" fill="#d9c27a" />
        </Row>
        {/* one body travels the real length of the run along the top of them */}
        <svg viewBox="0 0 24 24" className="g08-palm-body absolute block" style={st({ ...d(delayMs, 400), ...box(1.5, 2, 0.6, -0.8) })}>
          <path d={FIG} fill="#fff4d6" />
        </svg>
        {/* and is pitched clear at the far end of the leg */}
        <span
          className="g08-palm-toss absolute block"
          style={st({ ...d(delayMs, 540), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 8.9%)", top: `${50 - 2.2 * CELL}%`, width: cells(2.5), height: cells(2.5), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, rgba(217,194,122,0.4) 55%, transparent 74%)" })}
        />
        {/* settle: the hands come down and the dust with them */}
        <span className="g08-dust absolute block" style={st({ ...d(delayMs, 680), ...box(5.6, 2.4, 1.2, 1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   Registration.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   Every lead now lands one physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: the terraces stomp in unison: every landing is a floor-shock, and what the crowd turns on (a straggler, a standard, the big drum) splits under it.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g08CrowdPlays.css.
   ========================================================================== */

interface G08Imp {
  /** impact beat, ms after the lead's own delayMs */
  at: number;
  /** the card's core color as an "r g b" triple (drives --imp-rgb) */
  rgb: string;
  laser?: boolean;
  shock?: boolean;
  /** which of the module's shatter glyphs is split in half */
  g?: number;
  /** stage jolt on the beat: "s" soft, "h" hard */
  q?: "s" | "h";
  /** impact centre on the 14-cell stage, in percent (cast square = 50/50) */
  x?: number;
  y?: number;
  /** composite box size, in stage percent (9 is ~1.26 cells) */
  s?: number;
}

const IMP_TINT = "rgb(var(--imp-rgb, 216 181 110) / 0.95)";
const IMP_EDGE = "rgba(247, 241, 227, 0.9)";

/** The module's shatter victims: a crowd figure, a rally standard, the big drum. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <circle cx="12" cy="6.6" r="3" fill={IMP_TINT} /><path d="M6.8 20c.4-5.4 2.2-8.2 5.2-8.2s4.8 2.8 5.2 8.2z" fill={IMP_TINT} /><path d="M9.4 15.4h5.2" stroke={IMP_EDGE} strokeWidth="1.3" strokeLinecap="round" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M7.2 3.4h1.8V21H7.2z" fill={IMP_TINT} /><path d="M9.4 4.6h10l-2.6 3.2 2.6 3.2h-10z" fill={IMP_TINT} /><path d="M11 6.4h4.6" stroke={IMP_EDGE} strokeWidth="1.2" strokeLinecap="round" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M4.6 9.4h14.8v9.2H4.6z" fill={IMP_TINT} /><path d="M4.6 9.4c2.4-1.6 12.4-1.6 14.8 0" stroke={IMP_TINT} strokeWidth="2.4" fill="none" /><path d="M7.4 10.2v7.6M12 10.6v7.6M16.6 10.2v7.6" stroke={IMP_EDGE} strokeWidth="1.3" strokeLinecap="round" />
  </svg>,
];

const IMPACT: Record<string, G08Imp> = {
  op_fetch_the_flour: { at: 420, rgb: "240 223 184", shock: true, q: "h" },
  op_fresh_footprints: { at: 430, rgb: "207 227 255", shock: true, g: 0, q: "s" },
  op_gallery_row: { at: 480, rgb: "232 197 106", shock: true, q: "s" },
  op_goat_track: { at: 550, rgb: "216 195 154", shock: true, g: 1, q: "h" },
  op_harbor_pilot: { at: 590, rgb: "134 200 189", g: 2, q: "h" },
  op_harborside_h: { at: 465, rgb: "255 210 122", shock: true, g: 2, q: "s" },
  op_harborside_rider: { at: 475, rgb: "207 216 224", shock: true, q: "h" },
  op_homesick_private: { at: 490, rgb: "226 160 90", shock: true, g: 0, q: "s" },
  op_homing_pigeon: { at: 595, rgb: "205 214 230", shock: true, q: "s" },
  op_parade_route: { at: 635, rgb: "127 198 232", shock: true, g: 1, q: "h" },
  op_piggyback: { at: 510, rgb: "217 154 108", g: 2, q: "h" },
  op_pilgrim_road: { at: 440, rgb: "203 184 148", shock: true, g: 2, q: "s" },
  op_regroup_at_camp: { at: 535, rgb: "185 198 160", shock: true, q: "h" },
  op_revolving_door: { at: 540, rgb: "185 162 216", shock: true, g: 0, q: "s" },
  op_run_for_eggs: { at: 600, rgb: "240 201 107", shock: true, q: "s" },
  op_salt_from_the_coast: { at: 555, rgb: "158 201 214", shock: true, g: 1, q: "h" },
  op_second_thoughts: { at: 485, rgb: "215 194 232", g: 2, q: "h" },
  op_servants_entrance: { at: 525, rgb: "200 180 138", shock: true, g: 2, q: "s" },
  op_sidestep_and_bow: { at: 585, rgb: "224 185 120", shock: true, q: "h" },
  op_smugglers_lane: { at: 620, rgb: "127 147 168", shock: true, g: 0, q: "s" },
  op_soups_on: { at: 600, rgb: "233 180 92", shock: true, q: "s" },
  op_spice_run: { at: 520, rgb: "224 122 79", shock: true, g: 1, q: "h" },
  op_tactical_withdrawal: { at: 580, rgb: "184 82 63", g: 2, q: "h" },
  op_towpath: { at: 570, rgb: "201 168 106", shock: true, g: 2, q: "s" },
  ov_growth_spurt: { at: 645, rgb: "154 212 138", shock: true, q: "h" },
  ov_pebble_toss: { at: 645, rgb: "169 182 194", shock: true, g: 0, q: "s" },
  ov_tiny_trebuchet: { at: 450, rgb: "217 194 122", shock: true, q: "s" },
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G08Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g08-imprig absolute block"
        style={{
          left: `${(imp.x ?? 50) - s / 2}%`,
          top: `${(imp.y ?? 50) - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
          ...impactVars(imp.rgb, (delayMs + imp.at) / 1000),
        }}
      >
        {imp.laser ? <LaserStrike /> : null}
        {imp.g != null ? <PieceShatter glyph={IMP_GLYPHS[imp.g]} /> : null}
        {imp.shock ? <Shockwave /> : null}
      </span>
    </BoardWideStage>
  );
}

/** Leads render inside a quake wrapper (the whole stage jolts on the impact
 *  beat) with the rig mounted beside them; target/entrance cuts pass through
 *  untouched. */
function withImpact(Base: SigPlugin["Render"], imp: G08Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g08-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
            style={impactVars(imp.rgb, (props.delayMs + imp.at) / 1000)}
          >
            {scene}
          </span>
        ) : (
          scene
        )}
        <ImpactRig imp={imp} delayMs={props.delayMs} />
      </>
    );
  }
  return ImpactLead;
}

export const PLAYS: Record<string, SigPlugin> = {
  op_fetch_the_flour: S(WordRelay, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim",
  }),
  op_fresh_footprints: S(LookBack, {
    ordering: "sweep", staggerMs: 50, victims: ["p"], hasLead: true, sound: "shades", anchor: "board",
  }),
  op_gallery_row: S(OvationRow, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  op_goat_track: S(DustFront, {
    ordering: "line", staggerMs: 45, victims: ["p"], hasLead: true, sound: "rampage", anchor: "aim",
  }),
  op_harbor_pilot: S(ArmsLinked, {
    ordering: "octagon", staggerMs: 55, victims: ["p"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  op_harborside_h: S(LampsCatch, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "lightning", anchor: "cast",
  }),
  op_harborside_rider: S(GapCloses, {
    ordering: "file", staggerMs: 50, victims: ["p"], hasLead: true, sound: "wall", source: "shield", anchor: "board",
  }),
  op_homesick_private: S(RanksBreak, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "siege", anchor: "cast",
  }),
  op_homing_pigeon: S(FlockLifts, {
    ordering: "radial", staggerMs: 45, victims: ["p"], hasLead: true, sound: "blitz", anchor: "board",
  }),
  op_parade_route: S(CrowdWave, {
    ordering: "file", staggerMs: 50, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast",
  }),
  op_piggyback: S(QueueScrum, {
    ordering: "radial", staggerMs: 50, victims: ["p"], hasLead: true, sound: "rampage", anchor: "aim",
  }),
  op_pilgrim_road: S(KneelWave, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "aim",
  }),
  op_regroup_at_camp: S(ToolsDown, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "snooze", anchor: "cast",
  }),
  op_revolving_door: S(Turnstile, {
    ordering: "radial", staggerMs: 50, victims: ["p"], hasLead: true, sound: "wheel", anchor: "cast",
  }),
  op_run_for_eggs: S(Scramble, {
    ordering: "sweep", staggerMs: 45, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim",
  }),
  op_salt_from_the_coast: S(BacksToSpray, {
    ordering: "line", staggerMs: 50, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast",
  }),
  op_second_thoughts: S(RockBack, {
    ordering: "radial", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coinflip", anchor: "cast",
  }),
  op_servants_entrance: S(CrowdParts, {
    ordering: "sweep", staggerMs: 50, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast",
  }),
  op_sidestep_and_bow: S(BowWave, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  op_smugglers_lane: S(HushFalls, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  op_soups_on: S(BellTurn, {
    ordering: "sweep", staggerMs: 50, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  op_spice_run: S(ChantBeat, {
    ordering: "file", staggerMs: 45, victims: ["p"], hasLead: true, sound: "chips", anchor: "cast",
  }),
  op_tactical_withdrawal: S(TheRout, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  op_towpath: S(RopeTakesUp, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  ov_growth_spurt: S(CrowdLooks, {
    ordering: "radial", staggerMs: 50, victims: ["p"], hasLead: true, sound: "colossus", source: "empower", anchor: "board",
  }),
  ov_pebble_toss: S(FlinchRuns, {
    ordering: "radial", staggerMs: 55, victims: ["p"], hasLead: true, sound: "dice", anchor: "board",
  }),
  ov_tiny_trebuchet: S(PassedOnPalms, {
    ordering: "line", staggerMs: 50, victims: ["p"], hasLead: true, sound: "crashrocket", anchor: "aim",
  }),
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
