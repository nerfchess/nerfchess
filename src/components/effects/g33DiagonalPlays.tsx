// g33DiagonalPlays — bespoke plays for the 19 bishop / diagonal cards that
// used to share the generated `bishopCross` family (one cross, 19 hue shifts).
//
// MODULE FICTION: THE DIAGONAL AS A LINE OF SIGHT. Never a cross, never a
// glowing X. Every card is a real thing that TRAVELS or REACHES along a slant:
// a sunbeam through a clerestory window laying a bar of light across the floor,
// shears closing on a rope tensioned corner to corner, a scaffold brace pinned
// across an empty bay, a mitre joint closing to a hairline, a marionette's
// strings, a notch split through a ridge, a cracked rangefinder, a ladder taken
// away, soot sliding down a flue onto the board's own long diagonals, a thrown
// blade caught in a mailed glove, a jettied alley, a sweep's rods, a cloister
// arcade, a floor tile flipping colour, a ratchet rack, a cushion ricochet, a
// silk curtain on its rail, a coal chute, a window washer's squeegee.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g33DiagonalPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx (cycle hazard), only the SigPlugin / SigRole TYPES imported.
//
// THE DIAGONAL IS REAL. Every card declares anchor "aim", so the scene is
// staged on the cast square AND rotated onto the true source -> target vector
// by <AimStage>. Art is authored pointing RIGHT (+x) and aims itself. Distance
// is never guessed:
//
//   lane()/seg()  a band that starts AT the cast square and runs
//                 `calc(var(--fx-len) * 7.142857%)` — literally the distance to
//                 the real target square, on the 14-cell stage.
//   at(f)         a prop parked f of the way down that real run; at(1) is the
//                 target square itself.
//   SQ1 / SQ2     a diagonal step of one or two SQUARES is sqrt(2) / 2*sqrt(2)
//                 cells of distance, so the cards that clip a slide at "1" or
//                 "2" squares put their stop mark exactly there.
//   --fx-index    arches, rungs, pins, curtain rings and graticule marks arrive
//                 in the REAL victim order, not in a decorative sweep.
//   --fx-side     soot, sawdust, chalk and glass drift AWAY from the caster,
//                 whichever end of the screen that is.
//   <BoardFrame>  everything that means THE BOARD: washes, and Soot Fall's two
//                 long diagonals, which are the board's own corner-to-corner
//                 lines rather than a fixed percentage of the stage.
//
// Every scene runs three beats (tell -> strike -> settle) in all three roles:
// "lead" (the board-scale flourish on the cast square), "target" (the small
// per-square hit) and "entrance" (the card arriving in a hand, ~56% of the
// crop, no board takeover). Class prefix `g33-`.

import "./g33DiagonalPlays.css";

import type { CSSProperties } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

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

/** The caller's stagger plus this layer's own beat, in ms. */
const d = (base: number, off: number): CSSProperties => ({ animationDelay: `${base + off}ms` });

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/** A diagonal step of ONE square is sqrt(2) cells of straight-line distance. */
const SQ1 = 1.414;
/** ...and of TWO squares, 2*sqrt(2). The clip cards stop exactly here. */
const SQ2 = 2.828;

/**
 * A box `w` x `h` CELLS centred on the cast square (the stage's 50%/50%),
 * optionally offset `dx`/`dy` cells. On <AimStage> +x is the attack vector, so
 * `dx` is measured DOWN THE DIAGONAL and `dy` across it.
 */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${(50 + (dx - w / 2) * CELL).toFixed(3)}%`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/**
 * A band starting AT the cast square and running the REAL distance to the
 * target, `thick` cells thick. This is the geometry contract in one expression.
 */
const lane = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: "calc(var(--fx-len, 3) * 7.142857%)",
  height: cells(thick),
});

/** The `f0`..`f1` stretch of that same real run (0 = cast, 1 = target). */
const seg = (f0: number, f1: number, thick: number, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 3) * ${(CELL * f0).toFixed(4)}%)`,
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: `calc(var(--fx-len, 3) * ${(CELL * (f1 - f0)).toFixed(4)}%)`,
  height: cells(thick),
});

/** A prop parked `f` of the way down the real run. `at(1, ...)` is the target. */
const at = (f: number, w: number, h: number, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 3) * ${(CELL * f).toFixed(4)}% - ${((w / 2) * CELL).toFixed(3)}%)`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/** Index-ordered beat: this square's real place in the victim order. */
const idx = (base: number, off: number, per: number, i = 0, step = 0): CSSProperties => ({
  animationDelay: `calc(${base + off}ms + var(--fx-index, 0) * ${per}ms + ${i * step}ms)`,
});

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* The recurring actor of the batch: the mitre. Drawn once, dressed per card. */
const MITRE = "M12 3a1.7 1.7 0 0 1 1.1 3c1.8 1.3 3 3.3 3 5.5 0 1.7-.7 3.2-1.9 4.3H9.8A5.9 5.9 0 0 1 7.9 11.5c0-2.2 1.2-4.2 3-5.5A1.7 1.7 0 0 1 12 3z";
const MITRE_BASE = "M7.8 17.4h8.4v2.4H7.8z";
const MITRE_SLIT = "M12 7.4v4.8";

const R2 = [0, 1];
const R3 = [0, 1, 2];
const R4 = [0, 1, 2, 3];

/* =============================================================================
   1. Cathedral Choir (t7) — THE CLERESTORY SUNBEAM.
   A sight line is scribed from the high window, the bar of light opens down it,
   the tracery lights at the far end, three choir stalls fill in the real victim
   order, the new mitre rises inside the beam and the motes drift off it.
   Palette: #f4d488 / #fff2cf / #2a2138.
   ========================================================================== */
function ChoirBeam({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "4%", top: "62%", height: "9%", width: "92%", background: "linear-gradient(100deg, transparent, #f4d488, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "16%", width: "52%", height: "62%" })}>
          <path d="M12 2.6l6 5.4v13H6v-13z" fill="#2a2138" stroke="#f4d488" strokeWidth="1.2" {...SJ} />
          <path d="M12 7.4a2.6 2.6 0 0 1 2.6 2.6V17H9.4v-7A2.6 2.6 0 0 1 12 7.4z" fill="#fff2cf" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,207,0.9), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "54%", height: "12%", width: "96%", background: "linear-gradient(100deg, transparent, #fff2cf, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 210), left: "24%", top: "18%", width: "52%", height: "64%" })}>
          <path d={MITRE} fill="#f4d488" stroke="#2a2138" strokeWidth="1.2" {...SJ} />
          <path d={MITRE_BASE} fill="#2a2138" />
        </svg>
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.4, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,207,0.7), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(244,212,136,0.32), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the sight line from the window is scribed down the slant */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.13), background: "#fff2cf" })} />
        {/* strike: the bar of light opens the real length of the run */}
        <span className="g33-choir-beam absolute block" style={st({ ...d(delayMs, 250), ...lane(2.1), background: "linear-gradient(180deg, rgba(244,212,136,0), rgba(255,242,207,0.85) 45%, rgba(244,212,136,0.1))" })} />
        {/* the clerestory tracery lights where the beam lands */}
        <svg viewBox="0 0 24 24" className="g33-choir-window absolute block" style={st({ ...d(delayMs, 340), ...at(1, 2.6, 3.2) })}>
          <path d="M12 1.8l6.4 6.2V22H5.6V8z" fill="#2a2138" stroke="#f4d488" strokeWidth="1.3" {...SJ} />
          <path d="M12 6.2a2.4 2.4 0 0 1 2.4 2.4V19H9.6V8.6A2.4 2.4 0 0 1 12 6.2z" fill="#fff2cf" />
          <path d="M12 6.4V19M9.6 12.4h4.8" stroke="#2a2138" strokeWidth="0.9" />
        </svg>
        {/* three choir stalls fill in, in the real victim order */}
        {R3.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g33-choir-stall absolute block" style={st({ ...idx(delayMs, 420, 26, i, 78), ...at(0.26 + i * 0.22, 1.2, 1.6, 1.15) })}>
            <path d="M4 21V9a8 8 0 0 1 16 0v12z" fill="#2a2138" stroke="#f4d488" strokeWidth="1.4" {...SJ} />
          </svg>
        ))}
        {/* the new mitre rises inside the beam, on the square it was granted */}
        <svg viewBox="0 0 24 24" className="g33-raise absolute block" style={st({ ...d(delayMs, 540), ...at(1, 2, 2.6), filter: "drop-shadow(0 0 5px #f4d488)" })}>
          <path d={MITRE} fill="#fff2cf" stroke="#2a2138" strokeWidth="1.1" {...SJ} />
          <path d={MITRE_SLIT} stroke="#2a2138" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        {/* settle: motes turning over in the shaft */}
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 680), ...box(4.6, 2.4, 1.6, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,207,0.5), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   2. Clipped Diagonals (t7) — SHEARS ON THE TAUT ROPE.
   The rope is drawn corner to corner, the shears' shadow crosses it, the jaws
   close exactly two squares out, and everything past the cut goes slack and
   drops. Severed fibre and one glint at the bite.
   Palette: #9fb4c8 / #ffeed0 / #17202c.
   ========================================================================== */
function ClippedShears({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "52%", height: "5%", width: "88%", background: "#9fb4c8" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M4 4l13 13M20 4L7 17" stroke="#ffeed0" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="5.4" cy="19" r="2.6" fill="none" stroke="#9fb4c8" strokeWidth="1.8" />
          <circle cx="18.6" cy="19" r="2.6" fill="none" stroke="#9fb4c8" strokeWidth="1.8" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "38%", top: "34%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #ffeed0, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "50%", height: "7%", width: "92%", background: "#9fb4c8" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M3 5l9 9M21 5l-9 9" stroke="#ffeed0" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 14l-4 7M12 14l4 7" stroke="#17202c" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2), borderRadius: "50%", background: "#ffeed0" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(159,180,200,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the shears' shadow crosses the line before the jaws do */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...box(1.9, 0.8, SQ2, 0.7), borderRadius: "999px", background: "#17202c" })} />
        {/* strike: the rope is drawn taut the whole real run */}
        <span className="g33-clip-rope absolute block" style={st({ ...d(delayMs, 230), ...lane(0.26), borderRadius: "999px", background: "repeating-linear-gradient(72deg, #9fb4c8 0 22%, #17202c 22% 34%)" })} />
        {/* the jaws close exactly two squares out */}
        {R2.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g33-clip-jaw absolute block" style={st({ ...d(delayMs, 360), ...box(2.4, 1.5, SQ2, i === 0 ? -0.75 : 0.75), "--jr": i === 0 ? "26deg" : "-26deg" })}>
            <path d="M1 12h20l2 1.4-2 1.4H1z" fill="#9fb4c8" stroke="#17202c" strokeWidth="1.2" {...SJ} />
          </svg>
        ))}
        {/* everything past the bite goes slack and drops away */}
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="g33-clip-slack absolute block" style={st({ ...d(delayMs, 480), ...seg(0.62, 1, 2.6, 0.9) })}>
          <path d="M0 3C26 3 42 19 100 21" fill="none" stroke="#9fb4c8" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 560), ...box(1.5, 1.5, SQ2), borderRadius: "50%", background: "radial-gradient(circle, #ffeed0, transparent 72%)" })} />
        {/* settle: cut fibre flying off the bite */}
        {R3.map((i) => (
          <span key={i} className="g33-grit absolute block" style={st({ ...d(delayMs, 620 + i * 45), ...box(0.4, 0.16, SQ2 + [0.2, -0.3, 0.5][i], [-0.3, 0.4, 0.1][i]), "--sx": ["150%", "-120%", "190%"][i], "--sy": "calc(var(--fx-side, 1) * -170%)", background: "#ffeed0" })} />
        ))}
      </AimStage>
    </>
  );
}

/* =============================================================================
   3. Regency Council (t6) — THE SCAFFOLD BRACE PINNED.
   The queen's bay stands empty, so a diagonal brace is swung in corner to
   corner and pinned home, pin by pin in the real victim order. Sawdust settles.
   Palette: #d9b46a / #fff3d4 / #2b2413.
   ========================================================================== */
function CouncilBrace({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "6%", width: "84%", background: "#2b2413" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "68%", height: "62%" })}>
          <path d="M4 3v18M20 3v18" stroke="#2b2413" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M4.6 20.4L19.4 4.6" stroke="#d9b46a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="12" cy="12.5" r="1.7" fill="#fff3d4" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "32%", top: "56%", width: "36%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, rgba(255,243,212,0.8), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "66%", height: "8%", width: "88%", background: "#d9b46a" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <path d="M3 21L21 3" stroke="#d9b46a" strokeWidth="4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.6" fill="#fff3d4" stroke="#2b2413" strokeWidth="1.2" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(217,180,106,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the empty bay the queen used to hold, marked out */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 110), ...box(3.4, 1, 1.4, 1.5), borderRadius: "999px", background: "#2b2413" })} />
        {/* the two standards the brace will be pinned between */}
        {R2.map((i) => (
          <span key={i} className="g33-brace-post absolute block" style={st({ ...d(delayMs, 200 + i * 60), ...box(0.34, 3.6, i === 0 ? 0 : 2.9), background: "linear-gradient(180deg, #6b5a2c, #2b2413)", border: "1px solid #d9b46a" })} />
        ))}
        {/* strike: the diagonal brace swings in across the empty bay */}
        <span className="g33-brace-arm absolute block" style={st({ ...d(delayMs, 320), ...lane(0.6), background: "linear-gradient(180deg, #d9b46a, #6b5a2c)", border: "1px solid #2b2413" })} />
        {/* pins driven home, in the real victim order */}
        {R3.map((i) => (
          <span key={i} className="g33-brace-pin absolute block" style={st({ ...idx(delayMs, 450, 24, i, 76), ...at(0.2 + i * 0.3, 0.62, 0.62), borderRadius: "50%", background: "#fff3d4", border: "1px solid #2b2413" })} />
        ))}
        {/* settle: sawdust off the pin holes, away from the caster */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...box(4.4, 2.2, 1.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   4. Mitred Blinders (t5) — THE MITRE JOINT CLOSING.
   The joint is marked at one square out, the two mitred cheeks swing together
   until the line closes to a hairline, the clamp bites and glue beads out.
   Palette: #c9a26a / #fff1d8 / #241a12.
   ========================================================================== */
function MitreJoint({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "70%", height: "7%", width: "84%", background: "#241a12" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "24%", width: "72%", height: "52%" })}>
          <path d="M1 8h10l4 8H1z" fill="#c9a26a" stroke="#241a12" strokeWidth="1.2" {...SJ} />
          <path d="M23 8H13l-4 8h14z" fill="#fff1d8" stroke="#241a12" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "44%", top: "26%", width: "12%", height: "48%", background: "#fff1d8" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "62%", height: "9%", width: "92%", background: "#c9a26a" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "20%", width: "68%", height: "60%" })}>
          <path d="M2 6h9l5 12H2z" fill="#c9a26a" stroke="#241a12" strokeWidth="1.3" {...SJ} />
          <path d="M22 6h-8l5 12h3z" fill="#fff1d8" stroke="#241a12" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,216,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(201,162,106,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the joint is marked one square down the slide */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...seg(0, 1, 0.14), background: "#fff1d8" })} />
        {/* strike: the two mitred cheeks swing together on the mark */}
        {R2.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g33-mitre-cheek absolute block" style={st({ ...d(delayMs, 250 + i * 50), ...box(2.9, 1.7, SQ1 + (i === 0 ? -1.45 : 1.45)), "--mx": i === 0 ? "-64%" : "64%" })}>
            <path d={i === 0 ? "M0 4h17l6 16H0z" : "M24 4H7L1 20h23z"} fill={i === 0 ? "#c9a26a" : "#8c6c40"} stroke="#241a12" strokeWidth="1.2" {...SJ} />
          </svg>
        ))}
        {/* the clamp bar bites across the closed joint */}
        <span className="g33-mitre-clamp absolute block" style={st({ ...d(delayMs, 420), ...box(0.5, 3.2, SQ1), background: "linear-gradient(180deg, #241a12, #6b5230, #241a12)", border: "1px solid #c9a26a" })} />
        {/* glue beads out along the hairline */}
        <span className="g33-mitre-squeeze absolute block" style={st({ ...d(delayMs, 520), ...box(0.2, 2.4, SQ1), borderRadius: "999px", background: "#fff1d8" })} />
        {/* settle: shavings drifting away from the caster */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 650), ...box(4, 2.2, SQ1, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,216,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   5. Puppet Practice (t5) — THE MARIONETTE CONTROL BAR.
   The control bar tilts overhead, three strings run down on the slant, and the
   borrowed piece is walked the whole real length of the line before the strings
   go slack again.
   Palette: #c6a2e8 / #fff0dd / #241833.
   ========================================================================== */
function PuppetStrings({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "20%", height: "5%", width: "76%", background: "#c6a2e8" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "22%", width: "56%", height: "62%" })}>
          <path d="M4 1v7M12 1v6M20 1v7" stroke="#fff0dd" strokeWidth="1.1" strokeLinecap="round" />
          <path d={MITRE} fill="#c6a2e8" stroke="#241833" strokeWidth="1.2" {...SJ} transform="translate(0 3) scale(0.86)" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "60%", width: "32%", height: "20%", borderRadius: "999px", background: "radial-gradient(circle, rgba(255,240,221,0.75), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "16%", height: "6%", width: "88%", background: "#c6a2e8" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "20%", width: "52%", height: "62%" })}>
          <path d="M6 0v6M18 0v6" stroke="#fff0dd" strokeWidth="1.2" strokeLinecap="round" />
          <path d={MITRE} fill="#fff0dd" stroke="#241833" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.3, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(198,162,232,0.7), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(198,162,232,0.3), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the hand's shadow falls on the line first */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...box(2.6, 0.9, 1.2, 1.4), borderRadius: "999px", background: "#241833" })} />
        {/* strike: the control bar tilts above the whole run */}
        <span className="g33-pup-bar absolute block" style={st({ ...d(delayMs, 240), ...lane(0.34, -2.6), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #c6a2e8 14%, #c6a2e8 86%, transparent)" })} />
        {/* strings drop on the slant, one per station down the line */}
        {R3.map((i) => (
          <span key={i} className="g33-pup-string absolute block" style={st({ ...idx(delayMs, 340, 22, i, 64), ...at(0.24 + i * 0.3, 0.09, 2.4, -1.4), background: "#fff0dd" })} />
        ))}
        {/* the borrowed piece is walked the real length of the line */}
        <svg viewBox="0 0 24 24" className="g33-pup-walk absolute block" style={st({ ...d(delayMs, 460), ...box(2, 2.4), filter: "drop-shadow(0 0 4px #c6a2e8)" })}>
          <path d={MITRE} fill="#c6a2e8" stroke="#241833" strokeWidth="1.1" {...SJ} />
          <path d={MITRE_BASE} fill="#241833" />
        </svg>
        {/* settle: the strings go slack and the chalk dust lifts */}
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 660), ...box(4.4, 2.4, 1.6, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,221,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   6. Mountain Pass (t4) — THE NOTCH.
   A ridge of rock stands across the line, a wedge is driven into it, the ridge
   splits in two and the slanted path runs on through the gap to the far side.
   Palette: #8fa6b8 / #ffeccd / #1b2430.
   ========================================================================== */
function MountainNotch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "76%", height: "6%", width: "88%", background: "#1b2430" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "24%", width: "76%", height: "54%" })}>
          <path d="M0 22L7 6l4 7 2-3 4 5 7 7z" fill="#8fa6b8" stroke="#1b2430" strokeWidth="1.2" {...SJ} />
          <path d="M9.6 22l2.6-6 2.4 6z" fill="#ffeccd" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "40%", top: "52%", width: "20%", height: "26%", borderRadius: "999px", background: "radial-gradient(circle, #ffeccd, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "70%", height: "10%", width: "92%", background: "#8fa6b8" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "20%", width: "72%", height: "60%" })}>
          <path d="M1 22L8 5l3.4 8L14 9l3 6 6 7z" fill="#1b2430" stroke="#8fa6b8" strokeWidth="1.3" {...SJ} />
          <path d="M10 22l2-5 2 5z" fill="#ffeccd" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2, 0, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,205,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(143,166,184,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ridge's shadow lies across the line */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...box(1.5, 3.2, SQ1, 0.5), background: "#1b2430" })} />
        {/* the wedge is set against it */}
        <svg viewBox="0 0 24 24" className="g33-pass-wedge absolute block" style={st({ ...d(delayMs, 250), ...box(1.5, 1.5, SQ1 - 1.1) })}>
          <path d="M2 4l18 8-18 8z" fill="#ffeccd" stroke="#1b2430" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* strike: the ridge splits, one half either side of the line */}
        {R2.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g33-pass-split absolute block" style={st({ ...d(delayMs, 360), ...box(2.2, 2.4, SQ1, i === 0 ? -1.3 : 1.3), "--mx": i === 0 ? "-18%" : "18%", "--my": i === 0 ? "-58%" : "58%" })}>
            <path d={i === 0 ? "M0 24L6 2l6 9 5-5 7 18z" : "M0 0l6 22 6-9 5 5 7-18z"} fill="#8fa6b8" stroke="#1b2430" strokeWidth="1.3" {...SJ} />
          </svg>
        ))}
        {/* the path runs on through the gap, the real distance to the far side */}
        <span className="g33-pass-path absolute block" style={st({ ...d(delayMs, 480), ...lane(0.75), background: "linear-gradient(90deg, rgba(255,236,205,0.15), #ffeccd 60%, rgba(255,236,205,0.3))" })} />
        {/* the waymark cairn on the far side lights */}
        <svg viewBox="0 0 24 24" className="g33-glint absolute block" style={st({ ...d(delayMs, 580), ...at(1, 1.3, 1.6) })}>
          <path d="M8 22h8l-2-5h-4zM9 15h6l-1.6-4h-2.8zM10.4 9h3.2L12 4z" fill="#ffeccd" stroke="#1b2430" strokeWidth="1.1" {...SJ} />
        </svg>
        {/* settle: scree drifting off the new cut */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 680), ...box(4.4, 2.4, SQ1 + 0.6, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,205,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   7. Cracked Lens (t4) — THE CRACKED RANGEFINDER.
   The reticle is laid down the line, the objective glass sits at two squares,
   a crack forks across it and every graticule mark BEYOND two squares goes out.
   Palette: #79c8e0 / #fff3d9 / #10222c.
   ========================================================================== */
function CrackedLens({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "48%", height: "4%", width: "84%", background: "#79c8e0" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <circle cx="12" cy="12" r="9.4" fill="#10222c" stroke="#79c8e0" strokeWidth="1.6" />
          <path d="M12 2.6v18.8M2.6 12h18.8" stroke="#79c8e0" strokeWidth="0.9" />
          <path d="M5 6l5 6-3 3 8 6" fill="none" stroke="#fff3d9" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,217,0.75), transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "48%", height: "5%", width: "96%", background: "#79c8e0" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#fff3d9" strokeWidth="1.6" />
          <path d="M6 5l4.4 6.6-2.6 2.6L15 20" fill="none" stroke="#10222c" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="g33-grit absolute block" style={st({ ...d(delayMs, 400), ...box(0.5, 0.5, 0.4, -0.4), "--sx": "160%", "--sy": "calc(var(--fx-side, 1) * -150%)", borderRadius: "1px", background: "#fff3d9" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(121,200,224,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the reticle is laid down the whole sight line */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.1), background: "#fff3d9" })} />
        {/* graticule marks the length of the run, in the real victim order */}
        {R4.map((i) => (
          <span key={i} className="g33-lens-graticule absolute block" style={st({ ...idx(delayMs, 220, 22, i, 58), ...at(0.24 + i * 0.24, 0.11, 1.1 - i * 0.16), background: i > 1 ? "#10222c" : "#79c8e0" })} />
        ))}
        {/* strike: the objective glass, two squares out */}
        <span className="g33-lens-glass absolute block" style={st({ ...d(delayMs, 340), ...box(3, 3, SQ2), borderRadius: "50%", border: `${cells(0.24)} solid #10222c`, background: "radial-gradient(circle, rgba(121,200,224,0.5), rgba(16,34,44,0.15) 70%)" })} />
        {/* the crack forks across it */}
        <svg viewBox="0 0 24 24" className="g33-lens-crack absolute block" style={st({ ...d(delayMs, 470), ...box(2.9, 2.9, SQ2) })}>
          <path d="M2 9l6 2.4-2 2.6 6 1.6 3-3.6 2.4 4.4M8 11.4l1.4-6.4M14 12l5-3" fill="none" stroke="#fff3d9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {/* settle: glass flaking off, away from the caster */}
        {R3.map((i) => (
          <span key={i} className="g33-grit absolute block" style={st({ ...d(delayMs, 600 + i * 46), ...box(0.42, 0.42, SQ2 + [0.4, -0.5, 0.1][i], [-0.6, 0.5, 0.9][i]), "--sx": ["170%", "-140%", "120%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)", borderRadius: "1px", background: "#79c8e0" })} />
        ))}
      </AimStage>
    </>
  );
}

/* =============================================================================
   8. Borrowed Ladder (t3) — THE LADDER TAKEN AWAY.
   A ladder leans the whole length of the line, its rungs light in the real
   victim order, then the foot is hooked and dragged and the ladder swings clear
   so there is no way back down.
   Palette: #cf9d5a / #fff0ce / #241a0f.
   ========================================================================== */
function BorrowedLadder({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "78%", height: "5%", width: "84%", background: "#241a0f" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <path d="M3 22L16 2M9 24L22 4" stroke="#cf9d5a" strokeWidth="2" strokeLinecap="round" />
          <path d="M5.4 18.4l6 4M8 13.4l6 4M10.6 8.4l6 4M13.2 3.4l6 4" stroke="#fff0ce" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "58%", width: "40%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, rgba(255,240,206,0.7), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "72%", height: "8%", width: "92%", background: "#cf9d5a" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <path d="M2 21L15 1M9 23L22 3" stroke="#fff0ce" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M6 15l6.4 4M9 10l6.4 4" stroke="#241a0f" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,206,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(207,157,90,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ladder's shadow is set against the wall first */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.16, 0.9), background: "#241a0f" })} />
        {/* strike: both stiles slap up the whole real run */}
        {R2.map((i) => (
          <span key={i} className="g33-lad-rail absolute block" style={st({ ...d(delayMs, 240 + i * 60), ...lane(0.2, i === 0 ? -0.6 : 0.6), borderRadius: "999px", background: "#cf9d5a" })} />
        ))}
        {/* rungs land in the real victim order */}
        {R4.map((i) => (
          <span key={i} className="g33-lad-rung absolute block" style={st({ ...idx(delayMs, 380, 24, i, 66), ...at(0.2 + i * 0.22, 0.16, 1.4), background: "#fff0ce" })} />
        ))}
        {/* the foot is hooked and the whole ladder swings clear */}
        <svg viewBox="0 0 24 24" className="g33-lad-pull absolute block" style={st({ ...d(delayMs, 520), ...box(1.6, 1.6, 0.2, 0.9) })}>
          <path d="M20 3c0 7-4 10-8 10s-6-1.6-6-4 2-3.4 3.6-2.4" fill="none" stroke="#fff0ce" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {/* settle: grit off the footings */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 650), ...box(4, 2.2, 1.2, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,206,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   9. Soot Fall (t3) — SOOT DOWN THE FLUE, ONTO BOTH LONG DIAGONALS.
   The damper drops and soot slides down the slant. The two blackened bands are
   the BOARD's own corner-to-corner diagonals, so they live inside <BoardFrame>
   and are right wherever the card was cast.
   Palette: #6b6f78 / #ffeed2 / #0d0f14.
   ========================================================================== */
function SootFall({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "24%", height: "7%", width: "80%", background: "#0d0f14" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "60%" })}>
          <path d="M5 2h14v4H5z" fill="#6b6f78" stroke="#0d0f14" strokeWidth="1.2" />
          <path d="M7 6c0 6-3 8-3 12h16c0-4-3-6-3-12z" fill="#0d0f14" stroke="#6b6f78" strokeWidth="1.2" {...SJ} />
          <path d="M9.6 11.4l4.8 6M14.4 11.4l-4.8 6" stroke="#ffeed2" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "56%", width: "48%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(107,111,120,0.9), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "20%", height: "10%", width: "96%", background: "#0d0f14" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M2 2l20 20M22 2L2 22" stroke="#0d0f14" strokeWidth="4" strokeLinecap="round" />
          <path d="M2 2l20 20M22 2L2 22" stroke="#6b6f78" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.9, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,210,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(13,15,20,0.5), rgba(13,15,20,0.12) 72%)" })} />
          {/* the board's own long diagonals, blackened corner to corner */}
          {R2.map((i) => (
            <span key={i} className="g33-soot-band absolute block" style={st({ ...d(delayMs, 300 + i * 90), left: "-21%", top: "44.5%", width: "142%", height: "11%", rotate: i === 0 ? "45deg" : "-45deg", background: "linear-gradient(90deg, transparent, #0d0f14 18%, #0d0f14 82%, transparent)" })} />
          ))}
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the damper's shadow drops across the flue */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 110), ...box(2.4, 0.8, 0.6, -1.4), background: "#0d0f14" })} />
        {/* strike: soot slides the real length of the slant */}
        <span className="g33-soot-chute absolute block" style={st({ ...d(delayMs, 250), ...lane(1.5), background: "linear-gradient(90deg, #0d0f14, rgba(107,111,120,0.85) 55%, rgba(13,15,20,0.2))" })} />
        {/* settle: the fall smokes off away from the caster */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 620), ...box(5, 2.6, 1.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,210,0.4), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   10. The Left Glove (t2) — THE CAUGHT BLADE.
   The thrower's blade runs the slant and a mailed left glove closes on it in
   flight: it stops short, hangs, and the point never reaches the mark.
   Palette: #d8dee8 / #fff2d6 / #1a1520.
   ========================================================================== */
function CaughtBlade({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "56%", height: "4%", width: "88%", background: "#d8dee8" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "60%" })}>
          <path d="M1 14l12-8 3 2-12 8z" fill="#d8dee8" stroke="#1a1520" strokeWidth="1.1" {...SJ} />
          <path d="M14 5.6l6-3.6-2.4 6z" fill="#fff2d6" />
          <path d="M8 20c-2.4-1-3-4-1.6-5.6l4-2 3 3.4-2.4 4.6z" fill="#1a1520" stroke="#d8dee8" strokeWidth="1.1" {...SJ} />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "16%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #fff2d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "52%", height: "6%", width: "92%", background: "#fff2d6" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M2 16L16 4l4 2-14 12z" fill="#d8dee8" stroke="#1a1520" strokeWidth="1.2" {...SJ} />
          <path d="M13 19c-3-1-4-4.6-2-6.6l4.6 4z" fill="#1a1520" stroke="#fff2d6" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.3, -0.3), borderRadius: "50%", background: "#fff2d6" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(216,222,232,0.26), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the throw line, sighted the whole way to the mark */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.12), background: "#d8dee8" })} />
        {/* strike: the blade flies the slant and stops short */}
        <svg viewBox="0 0 24 24" className="g33-blade-fly absolute block" style={st({ ...d(delayMs, 250), ...box(2.2, 1.1) })}>
          <path d="M0 15L15 5l4 2L4 17z" fill="#d8dee8" stroke="#1a1520" strokeWidth="1.1" {...SJ} />
          <path d="M17 5.6l7-3.6-3 7z" fill="#fff2d6" />
        </svg>
        {/* the left glove closes on it in flight */}
        <svg viewBox="0 0 24 24" className="g33-glove-grip absolute block" style={st({ ...d(delayMs, 430), ...at(0.62, 2.4, 2.4, 0.5) })}>
          <path d="M4 20c-3-2-3.6-7-1-9.6l7-3.4 4 4.6-3.4 8z" fill="#1a1520" stroke="#d8dee8" strokeWidth="1.3" {...SJ} />
          <path d="M6.4 12.6l4.4 4M9.4 10.6l4.4 4" stroke="#d8dee8" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 520), ...at(0.62, 1.6, 1.6), borderRadius: "50%", background: "radial-gradient(circle, #fff2d6, transparent 72%)" })} />
        {/* settle: the mark it never reached, and the dust off the catch */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...at(0.66, 4, 2.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,214,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   11. Narrow Lane (t2) — THE JETTIED ALLEY.
   Two overhanging house fronts lean in over the slanted lane until only a
   shoulder's width is left, and a chain is hung across it two squares along.
   Palette: #b8a17c / #fff0cf / #201a12.
   ========================================================================== */
function NarrowLane({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "80%", height: "5%", width: "80%", background: "#201a12" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "16%", width: "76%", height: "66%" })}>
          <path d="M0 2h9v8l-2 12H0z" fill="#b8a17c" stroke="#201a12" strokeWidth="1.2" {...SJ} />
          <path d="M24 2h-9v8l2 12h7z" fill="#8c7754" stroke="#201a12" strokeWidth="1.2" {...SJ} />
          <path d="M10.6 22l1.4-9 1.4 9z" fill="#fff0cf" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "42%", top: "22%", width: "16%", height: "16%", borderRadius: "50%", background: "radial-gradient(circle, #fff0cf, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "76%", height: "8%", width: "92%", background: "#b8a17c" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "10%", top: "16%", width: "80%", height: "66%" })}>
          <path d="M0 1h8v7l-2 15H0z" fill="#201a12" stroke="#b8a17c" strokeWidth="1.3" {...SJ} />
          <path d="M24 1h-8v7l2 15h6z" fill="#201a12" stroke="#b8a17c" strokeWidth="1.3" {...SJ} />
          <path d="M10.8 23L12 12l1.2 11z" fill="#fff0cf" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.5, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,207,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(184,161,124,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the gutter line scribed down the middle of the lane */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.12), background: "#fff0cf" })} />
        {/* strike: the jettied storeys lean in over the slant */}
        {R2.map((i) => (
          <span key={i} className="g33-lane-wall absolute block" style={st({ ...d(delayMs, 250 + i * 60), ...seg(0, 1, 1.5, i === 0 ? -1.3 : 1.3), "--lr": i === 0 ? "7deg" : "-7deg", background: i === 0 ? "linear-gradient(180deg, #201a12, #b8a17c)" : "linear-gradient(0deg, #201a12, #8c7754)", border: "1px solid #201a12" })} />
        ))}
        {/* the chain across the lane, exactly two squares along */}
        <span className="g33-lane-chain absolute block" style={st({ ...d(delayMs, 430), ...box(0.2, 2.6, SQ2), background: "repeating-linear-gradient(180deg, #fff0cf 0 22%, #201a12 22% 34%)" })} />
        {/* the lantern hung over it */}
        <svg viewBox="0 0 24 24" className="g33-lane-lamp absolute block" style={st({ ...d(delayMs, 520), ...box(1.2, 1.4, SQ2, -1.5) })}>
          <path d="M12 1v4M7 5h10l-1.4 14H8.4z" fill="#201a12" stroke="#b8a17c" strokeWidth="1.3" {...SJ} />
          <path d="M9.6 8h4.8v8H9.6z" fill="#fff0cf" />
        </svg>
        {/* settle: straw and grit lifting off the cobbles */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...box(4, 2, 1.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,207,0.4), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   12. Chimney Sweep (t2) — THE SWEEP'S RODS.
   The flue is opened along the slant, the screwed-together rods drive up it the
   real distance, and the brush head bursts out at the far end.
   Palette: #8e8577 / #ffeed0 / #14110d.
   ========================================================================== */
function SweepRods({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "72%", height: "6%", width: "84%", background: "#14110d" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "68%", height: "64%" })}>
          <path d="M2 22L14 8" stroke="#8e8577" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M13 9l4-5M15 11l4-5M11 7l6 1M13 5l6 1" stroke="#ffeed0" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="16" cy="7" r="4.6" fill="none" stroke="#ffeed0" strokeWidth="1.4" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "52%", top: "8%", width: "34%", height: "34%", borderRadius: "50%", background: "radial-gradient(circle, rgba(142,133,119,0.85), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "66%", height: "8%", width: "92%", background: "#8e8577" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <path d="M1 23L12 12" stroke="#8e8577" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="15" cy="9" r="6" fill="none" stroke="#ffeed0" strokeWidth="2" />
          <path d="M15 3v12M9 9h12" stroke="#ffeed0" strokeWidth="1.2" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.4, 0.3, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(20,17,13,0.75), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(142,133,119,0.26), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the flue is opened along the slant */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...box(2, 1, 0.8, 1.2), borderRadius: "999px", background: "#14110d" })} />
        <span className="g33-flue absolute block" style={st({ ...d(delayMs, 230), ...lane(2.2), background: "linear-gradient(180deg, #14110d, rgba(20,17,13,0.35) 45%, #14110d)", border: "1px solid #8e8577" })} />
        {/* strike: the rods drive the real length of the flue */}
        <span className="g33-rod absolute block" style={st({ ...d(delayMs, 340), ...box(1, 0.22), borderRadius: "999px", background: "repeating-linear-gradient(90deg, #8e8577 0 62%, #ffeed0 62% 78%)" })} />
        {/* the brush head bursts out at the top */}
        <svg viewBox="0 0 24 24" className="g33-brush absolute block" style={st({ ...d(delayMs, 500), ...at(1, 2.4, 2.4) })}>
          <circle cx="12" cy="12" r="5.4" fill="#14110d" stroke="#8e8577" strokeWidth="1.3" />
          <path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.2 4.2l3.6 3.6M16.2 16.2l3.6 3.6M19.8 4.2l-3.6 3.6M7.8 16.2l-3.6 3.6" stroke="#ffeed0" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {/* settle: the soot puff drifting away from the caster */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...at(1, 4, 2.6, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(20,17,13,0.6), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   13. Quiet Cloister (t2) — THE ARCADE AND THE SCREEN.
   The cloister arcade recedes down the slant, arch by arch in the real victim
   order, and a grille drops across the middle of the run: no one gets past it.
   Palette: #cbb98d / #fff4dc / #241f16.
   ========================================================================== */
function CloisterArcade({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "76%", height: "6%", width: "84%", background: "#241f16" })} />
        <svg viewBox="0 0 48 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "26%", width: "84%", height: "50%" })}>
          {R3.map((i) => (
            <path key={i} d={`M${4 + i * 15} 23V11a5 5 0 0 1 10 0v12z`} fill="#241f16" stroke="#cbb98d" strokeWidth="1.3" {...SJ} />
          ))}
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,220,0.8), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "74%", height: "8%", width: "92%", background: "#cbb98d" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M3 23V11a9 9 0 0 1 18 0v12z" fill="#241f16" stroke="#cbb98d" strokeWidth="1.4" {...SJ} />
          <path d="M9 23v-8a3 3 0 0 1 6 0v8z" fill="#fff4dc" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.1, 1.1, 0, -0.4), borderRadius: "50%", background: "#fff4dc" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(203,185,141,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the string course is scribed the length of the walk */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.14, -1.5), background: "#fff4dc" })} />
        {/* strike: the arcade recedes down the slant, in the real victim order */}
        {R4.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g33-arcade-arch absolute block" style={st({ ...idx(delayMs, 260, 26, i, 74), ...at(0.18 + i * 0.24, 1.5 - i * 0.16, 2.4 - i * 0.28, 0.3) })}>
            <path d="M2 23V10a10 10 0 0 1 20 0v13z" fill="#241f16" stroke="#cbb98d" strokeWidth="1.5" {...SJ} />
          </svg>
        ))}
        {/* the grille drops across the middle of the walk */}
        <svg viewBox="0 0 24 24" className="g33-arcade-screen absolute block" style={st({ ...d(delayMs, 470), ...at(0.5, 0.9, 3) })}>
          <path d="M2 0v24M8 0v24M14 0v24M20 0v24M0 6h24M0 16h24" stroke="#cbb98d" strokeWidth="2" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 560), ...at(0.5, 1.6, 1.6), borderRadius: "50%", background: "radial-gradient(circle, #fff4dc, transparent 72%)" })} />
        {/* settle: candle smoke off the walk */}
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 660), ...box(4.4, 2.2, 1.4, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,220,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   14. Bishop's Stroll (t1) — THE FLIPPED TILE.
   The slanted shadow bar lies across the floor; the tile under the bishop turns
   over from light to dark, and the whole shadow swings onto its new colour.
   Palette: #e0c98f / #fff3d5 / #221c2a.
   ========================================================================== */
function FlippedTile({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "62%", height: "8%", width: "88%", background: "linear-gradient(100deg, transparent, #221c2a, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "62%" })}>
          <path d={MITRE} fill="#e0c98f" stroke="#221c2a" strokeWidth="1.2" {...SJ} />
          <path d={MITRE_SLIT} stroke="#221c2a" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "66%", width: "22%", height: "18%", background: "#fff3d5" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "66%", height: "10%", width: "92%", background: "#e0c98f" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "64%" })}>
          <path d={MITRE} fill="#fff3d5" stroke="#221c2a" strokeWidth="1.2" {...SJ} />
          <path d={MITRE_BASE} fill="#221c2a" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.1, 1.1, 0.3, -0.5), borderRadius: "50%", background: "#fff3d5" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(224,201,143,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the old shadow bar, lying along the slant it used to own */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...lane(0.7, 0.5), background: "#221c2a" })} />
        {/* strike: the light tile turns over... */}
        <span className="g33-tile-light absolute block" style={st({ ...d(delayMs, 250), ...box(1.9, 1.9), background: "linear-gradient(135deg, #fff3d5, #e0c98f)", border: "1px solid #221c2a" })} />
        {/* ...and comes back down dark */}
        <span className="g33-tile-dark absolute block" style={st({ ...d(delayMs, 330), ...box(1.9, 1.9), background: "linear-gradient(135deg, #3a3145, #221c2a)", border: "1px solid #e0c98f" })} />
        {/* the bishop steps one square OFF the diagonal, across the aim axis */}
        <svg viewBox="0 0 24 24" className="g33-stroll-step absolute block" style={st({ ...d(delayMs, 440), ...box(1.8, 2.2), filter: "drop-shadow(0 0 4px #e0c98f)" })}>
          <path d={MITRE} fill="#e0c98f" stroke="#221c2a" strokeWidth="1.1" {...SJ} />
          <path d={MITRE_BASE} fill="#221c2a" />
        </svg>
        {/* settle: chalk motes off the turned tile */}
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 620), ...box(3.6, 2.2, 0.8, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,213,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   15. One Way Cloister (t1) — THE RATCHET RACK.
   A toothed rack is laid the length of the slant and a pawl drops into it: the
   rack runs freely one way and jams solid against the other.
   Palette: #a9b6c4 / #fff1d2 / #161c26.
   ========================================================================== */
function RatchetRack({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "66%", height: "5%", width: "88%", background: "#161c26" })} />
        <svg viewBox="0 0 48 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "30%", width: "84%", height: "44%" })}>
          <path d="M0 18h48v5H0z" fill="#a9b6c4" stroke="#161c26" strokeWidth="1.2" />
          <path d="M2 18l4-7 2 7zM12 18l4-7 2 7zM22 18l4-7 2 7zM32 18l4-7 2 7z" fill="#a9b6c4" stroke="#161c26" strokeWidth="1.1" {...SJ} />
          <path d="M26 2l-4 9h6z" fill="#fff1d2" stroke="#161c26" strokeWidth="1.1" {...SJ} />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "44%", top: "18%", width: "20%", height: "20%", borderRadius: "50%", background: "radial-gradient(circle, #fff1d2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "68%", height: "8%", width: "92%", background: "#a9b6c4" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "24%", width: "72%", height: "52%" })}>
          <path d="M0 16h24v6H0z" fill="#161c26" stroke="#a9b6c4" strokeWidth="1.3" />
          <path d="M2 16l3-6 2 6zM11 16l3-6 2 6z" fill="#a9b6c4" />
          <path d="M17 1l-4 9h7z" fill="#fff1d2" stroke="#161c26" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g33-grit absolute block" style={st({ ...d(delayMs, 400), ...box(0.42, 0.42, 0.4, -0.4), "--sx": "150%", "--sy": "calc(var(--fx-side, 1) * -150%)", borderRadius: "1px", background: "#fff1d2" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(169,182,196,0.26), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the run is chalked out before the ironwork lands */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.12, 0.9), background: "#fff1d2" })} />
        {/* strike: the toothed rack is laid the whole real length of the line */}
        <span className="g33-rack absolute block" style={st({ ...d(delayMs, 240), ...lane(0.9, 0.5), background: "repeating-linear-gradient(114deg, #a9b6c4 0 34%, #161c26 34% 50%)", border: "1px solid #161c26" })} />
        {/* the pawl drops into the teeth */}
        <svg viewBox="0 0 24 24" className="g33-pawl absolute block" style={st({ ...d(delayMs, 390), ...at(0.42, 1.5, 2) })}>
          <path d="M12 2l6 14-6 6-6-6z" fill="#fff1d2" stroke="#161c26" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* the rack tries the wrong way and jams solid */}
        <span className="g33-rack-jam absolute block" style={st({ ...d(delayMs, 500), ...seg(0.42, 1, 1.2, 0.5), background: "linear-gradient(90deg, rgba(22,28,38,0.85), rgba(169,182,196,0.15))" })} />
        {/* settle: iron filings shaken loose */}
        {R3.map((i) => (
          <span key={i} className="g33-grit absolute block" style={st({ ...d(delayMs, 620 + i * 44), ...box(0.4, 0.4, 0.9 + i * 0.5, [-0.5, 0.6, 0][i]), "--sx": ["150%", "-130%", "180%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)", borderRadius: "1px", background: "#a9b6c4" })} />
        ))}
      </AimStage>
    </>
  );
}

/* =============================================================================
   16. Prompt Corner (t1) — THE CUSHION RICOCHET.
   The ball runs the slant, kisses the rail cushion at the end of the run and
   comes off it on a new angle, leaving a chalk mark on the baize.
   Palette: #7fbf95 / #fff4d8 / #10221a.
   ========================================================================== */
function CushionRicochet({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "72%", height: "9%", width: "88%", background: "#10221a" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <path d="M1 20L20 4" stroke="#fff4d8" strokeWidth="1.4" strokeDasharray="3 2.4" strokeLinecap="round" />
          <circle cx="19" cy="5" r="4.4" fill="#fff4d8" stroke="#10221a" strokeWidth="1.2" />
          <circle cx="4" cy="18" r="3" fill="#7fbf95" stroke="#10221a" strokeWidth="1.1" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "8%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,216,0.85), transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "70%", height: "10%", width: "92%", background: "#7fbf95" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "22%", width: "56%", height: "56%" })}>
          <circle cx="12" cy="12" r="9" fill="#fff4d8" stroke="#10221a" strokeWidth="1.4" />
          <circle cx="9" cy="9" r="2.6" fill="#7fbf95" />
        </svg>
        <span className="g33-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.4, -0.4), borderRadius: "50%", background: "#fff4d8" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(127,191,149,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the aim line dotted out to the cushion */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.14), background: "#fff4d8" })} />
        {/* the rail cushion at the end of the real run */}
        <span className="g33-cush-rail absolute block" style={st({ ...d(delayMs, 230), ...at(1, 0.8, 4), background: "linear-gradient(90deg, #7fbf95, #10221a)", border: "1px solid #10221a" })} />
        {/* strike: the ball runs the slant and comes off the cushion */}
        <span className="g33-cush-ball absolute block" style={st({ ...d(delayMs, 330), ...box(0.9, 0.9), borderRadius: "50%", background: "radial-gradient(circle at 34% 34%, #fff4d8, #7fbf95 72%)", border: "1px solid #10221a" })} />
        {/* the kiss mark it leaves on the cushion */}
        <span className="g33-cush-mark absolute block" style={st({ ...d(delayMs, 520), ...at(1, 1.4, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,216,0.9), transparent 70%)" })} />
        {/* settle: chalk lifting off the baize */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...at(0.9, 3.6, 2.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,216,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   17. Silk Curtain (t1) — THE RAIL AND THE RINGS.
   A curtain rail is hung the length of the slant, the rings run along it in the
   real victim order, the silk parts and the queen's shadow steps through.
   Palette: #d78fb0 / #fff2dd / #2a1522.
   ========================================================================== */
function SilkCurtain({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "20%", height: "6%", width: "84%", background: "#d78fb0" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "20%", width: "68%", height: "62%" })}>
          <path d="M2 1c2 8 1 14-1 22h9c-1-8-2-14 0-22z" fill="#d78fb0" stroke="#2a1522" strokeWidth="1.1" {...SJ} />
          <path d="M22 1c-2 8-1 14 1 22h-9c1-8 2-14 0-22z" fill="#a85c80" stroke="#2a1522" strokeWidth="1.1" {...SJ} />
          <path d="M12 6v12" stroke="#fff2dd" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "42%", top: "34%", width: "16%", height: "34%", borderRadius: "999px", background: "radial-gradient(circle, rgba(255,242,221,0.85), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "16%", height: "7%", width: "92%", background: "#d78fb0" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "18%", width: "72%", height: "64%" })}>
          <path d="M1 0c2 8 1 15-1 24h8c-1-9-1-16 0-24z" fill="#2a1522" stroke="#d78fb0" strokeWidth="1.3" {...SJ} />
          <path d="M23 0c-2 8-1 15 1 24h-8c1-9 1-16 0-24z" fill="#2a1522" stroke="#d78fb0" strokeWidth="1.3" {...SJ} />
          <path d="M12 3v18" stroke="#fff2dd" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.5, 1.4, 0, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,221,0.65), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(215,143,176,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the rail is hung the whole length of the slant */}
        <span className="g33-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.18, -1.8), background: "#d78fb0" })} />
        {/* the rings run along it in the real victim order */}
        {R4.map((i) => (
          <span key={i} className="g33-silk-ring absolute block" style={st({ ...idx(delayMs, 240, 24, i, 64), ...at(0.16 + i * 0.24, 0.42, 0.42, -1.8), borderRadius: "50%", border: `${cells(0.1)} solid #fff2dd` })} />
        ))}
        {/* strike: the silk parts, one half either side of the run */}
        {R2.map((i) => (
          <span key={i} className="g33-silk-drape absolute block" style={st({ ...d(delayMs, 400 + i * 50), ...seg(0, 1, 2.6, i === 0 ? -1.4 : 1.4), "--dy": i === 0 ? "-52%" : "52%", background: i === 0 ? "linear-gradient(180deg, #d78fb0, rgba(42,21,34,0.85))" : "linear-gradient(0deg, #a85c80, rgba(42,21,34,0.85))" })} />
        ))}
        {/* the shadow that steps through the gap */}
        <svg viewBox="0 0 24 24" className="g33-silk-pass absolute block" style={st({ ...d(delayMs, 540), ...at(0.6, 1.8, 2.4) })}>
          <path d={MITRE} fill="#fff2dd" stroke="#2a1522" strokeWidth="1.1" {...SJ} />
        </svg>
        {/* settle: the nap of the silk still turning over */}
        <span className="g33-motes absolute block" style={st({ ...d(delayMs, 660), ...box(4, 2.4, 1.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,221,0.42), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   18. Bishop's Hatch (t1) — THE COAL CHUTE.
   Two hatch leaves bang open on the slant, the chute board runs down between
   them, and the sack goes down it and out at the far end.
   Palette: #9a8f83 / #ffeecd / #14100c.
   ========================================================================== */
function CoalChute({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "7%", width: "84%", background: "#14100c" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "20%", width: "68%", height: "60%" })}>
          <path d="M2 12l8-8 4 4-8 8z" fill="#9a8f83" stroke="#14100c" strokeWidth="1.2" {...SJ} />
          <path d="M10 20l8-8 4 4-8 8z" fill="#9a8f83" stroke="#14100c" strokeWidth="1.2" {...SJ} />
          <path d="M8 14l6-6" stroke="#ffeecd" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "56%", width: "40%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, rgba(20,16,12,0.9), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "68%", height: "9%", width: "92%", background: "#9a8f83" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <path d="M1 10l9-9 5 5-9 9z" fill="#14100c" stroke="#9a8f83" strokeWidth="1.3" {...SJ} />
          <path d="M9 18l9-9 5 5-9 9z" fill="#14100c" stroke="#9a8f83" strokeWidth="1.3" {...SJ} />
          <path d="M7 13l7-7" stroke="#ffeecd" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.3, 0.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(20,16,12,0.7), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(154,143,131,0.26), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the shadow of the opening, before it opens */}
        <span className="g33-tell absolute block" style={st({ ...d(delayMs, 100), ...box(2.4, 1, 0.6, 1.3), borderRadius: "999px", background: "#14100c" })} />
        {/* strike: the two hatch leaves bang open along the slant */}
        {R2.map((i) => (
          <span key={i} className="g33-hatch-leaf absolute block" style={st({ ...d(delayMs, 230 + i * 50), ...box(1.9, 1.2, 0.6, i === 0 ? -1 : 1), "--hr": i === 0 ? "-64deg" : "64deg", background: "linear-gradient(180deg, #9a8f83, #14100c)", border: "1px solid #ffeecd" })} />
        ))}
        {/* the chute board runs the real distance down the slant */}
        <span className="g33-chute absolute block" style={st({ ...d(delayMs, 350), ...lane(1.3), background: "linear-gradient(180deg, #14100c, #4c443b 55%, #14100c)", border: "1px solid #9a8f83" })} />
        {/* the sack slides down it and out the far end */}
        <svg viewBox="0 0 24 24" className="g33-sack absolute block" style={st({ ...d(delayMs, 470), ...box(1.3, 1.3) })}>
          <path d="M8 4h8l3 16H5z" fill="#9a8f83" stroke="#14100c" strokeWidth="1.4" {...SJ} />
          <path d="M8 4c1.4 2 6.6 2 8 0" fill="none" stroke="#ffeecd" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {/* settle: coal dust off the far end, away from the caster */}
        <span className="g33-dust absolute block" style={st({ ...d(delayMs, 640), ...at(1, 3.6, 2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(20,16,12,0.6), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   19. Window Washer (t1) — THE SQUEEGEE.
   The cradle hangs on its rope along the slant, the glass is soaped over the
   whole run, the squeegee is drawn down it and the cleared streak follows.
   Palette: #86c9d8 / #fff3d9 / #12232b.
   ========================================================================== */
function WindowSqueegee({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g33-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "26%", height: "5%", width: "88%", background: "#86c9d8" })} />
        <svg viewBox="0 0 24 24" className="g33-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "64%", height: "56%" })}>
          <path d="M2 4h20v3H2z" fill="#12232b" stroke="#86c9d8" strokeWidth="1.2" />
          <path d="M4 7h16v3H4z" fill="#fff3d9" />
          <path d="M12 10v11" stroke="#86c9d8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="g33-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "56%", width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,217,0.8), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g33-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "40%", height: "12%", width: "96%", background: "linear-gradient(100deg, transparent, #86c9d8, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g33-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "20%", width: "68%", height: "60%" })}>
          <path d="M1 6h22v4H1z" fill="#12232b" stroke="#86c9d8" strokeWidth="1.3" />
          <path d="M3 10h18v3H3z" fill="#fff3d9" />
          <path d="M12 2v4" stroke="#86c9d8" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="g33-drip absolute block" style={st({ ...d(delayMs, 400), ...box(0.34, 0.6, 0.2, 0.5), borderRadius: "999px", background: "#fff3d9" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g33-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(134,201,216,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the soaped glass fogs the whole run */}
        <span className="g33-suds absolute block" style={st({ ...d(delayMs, 100), ...lane(2.4), background: "linear-gradient(180deg, rgba(134,201,216,0.55), rgba(255,243,217,0.35) 50%, rgba(134,201,216,0.5))" })} />
        {/* the cradle rope, strung the real length of the slant */}
        <span className="g33-cradle absolute block" style={st({ ...d(delayMs, 220), ...lane(0.12, -1.5), background: "#12232b" })} />
        {/* strike: the squeegee is drawn the whole distance */}
        <span className="g33-squeegee absolute block" style={st({ ...d(delayMs, 340), ...box(0.34, 2.6), background: "linear-gradient(180deg, #12232b, #86c9d8, #12232b)", border: "1px solid #fff3d9" })} />
        {/* the cleared streak follows it down the glass */}
        <span className="g33-streak absolute block" style={st({ ...d(delayMs, 400), ...lane(2), background: "linear-gradient(90deg, rgba(255,243,217,0.75), rgba(255,243,217,0.05))" })} />
        {/* settle: the drips run off the sill */}
        {R3.map((i) => (
          <span key={i} className="g33-drip absolute block" style={st({ ...d(delayMs, 600 + i * 55), ...at(0.3 + i * 0.28, 0.3, 0.62, 1.2), borderRadius: "999px", background: "#fff3d9" })} />
        ))}
      </AimStage>
    </>
  );
}

/* =============================================================================
   Registry. Two spaces of indent at object depth 1: the animation audit and
   check-sig-plugins.cjs parse this table as TEXT.
   ========================================================================== */

export const PLAYS: Record<string, SigPlugin> = {
  bn4_cathedral_choir: {
    config: { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" },
    Render: ChoirBeam,
  },
  hx4_clipped_diagonals: {
    config: { ordering: "line", staggerMs: 60, victims: ["b", "q"], hasLead: true, sound: "siege", anchor: "board" },
    Render: ClippedShears,
  },
  ov_regency_council: {
    config: { ordering: "line", staggerMs: 70, victims: ["r", "b"], hasLead: true, sound: "coronation", anchor: "aim" },
    Render: CouncilBrace,
  },
  hx4_mitred_blinders: {
    config: { ordering: "line", staggerMs: 60, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" },
    Render: MitreJoint,
  },
  ov_puppet_practice: {
    config: { ordering: "line", staggerMs: 55, victims: ["b", "r"], hasLead: true, sound: "blitz", anchor: "aim" },
    Render: PuppetStrings,
  },
  bn4_mountain_pass: {
    config: { ordering: "line", staggerMs: 65, victims: ["b"], hasLead: true, sound: "siege", anchor: "aim" },
    Render: MountainNotch,
  },
  hx4_cracked_lens: {
    config: { ordering: "line", staggerMs: 60, victims: ["b"], hasLead: true, sound: "lightning", anchor: "aim" },
    Render: CrackedLens,
  },
  hx4_borrowed_ladder: {
    config: { ordering: "line", staggerMs: 60, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" },
    Render: BorrowedLadder,
  },
  hx4_soot_fall: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "siege", anchor: "board" },
    Render: SootFall,
  },
  hx4_left_glove: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim" },
    Render: CaughtBlade,
  },
  hx4_narrow_lane: {
    config: { ordering: "line", staggerMs: 60, victims: ["b", "r", "q"], hasLead: true, sound: "wall", anchor: "board" },
    Render: NarrowLane,
  },
  op_chimney_sweep: {
    config: { ordering: "line", staggerMs: 60, victims: ["b"], hasLead: true, sound: "siege", anchor: "aim" },
    Render: SweepRods,
  },
  op_quiet_cloister: {
    config: { ordering: "line", staggerMs: 65, victims: ["b"], hasLead: true, sound: "cathedral", anchor: "board" },
    Render: CloisterArcade,
  },
  bn4_bishops_stroll: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "coronation", anchor: "aim" },
    Render: FlippedTile,
  },
  hx4_one_way_cloister: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "wall", anchor: "board" },
    Render: RatchetRack,
  },
  op_prompt_corner: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "blitz", anchor: "aim" },
    Render: CushionRicochet,
  },
  op_silk_curtain: {
    config: { ordering: "line", staggerMs: 60, victims: ["q", "b"], hasLead: true, sound: "cathedral", anchor: "aim" },
    Render: SilkCurtain,
  },
  op_trapdoor_exit: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "siege", anchor: "aim" },
    Render: CoalChute,
  },
  op_window_washer: {
    config: { ordering: "line", staggerMs: 55, victims: ["b"], hasLead: true, sound: "wall", anchor: "aim" },
    Render: WindowSqueegee,
  },
};
