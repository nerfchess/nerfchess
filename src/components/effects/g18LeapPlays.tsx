// g18LeapPlays — bespoke plays for the 27 knight / leaping-movement cards that
// used to share the generated `knightVault` family (one vault, 27 hue shifts).
//
// MODULE FICTION: THE LEAP ITSELF, IN ITS MANY FORMS. Every card is a
// different way something gets over an obstacle without touching it — a
// founder's horse clearing the ploughed furrow, a pole vault planting and
// bending, a trapeze release and catch, a stone skipping three times, a salmon
// running a weir, a grasshopper's coiled tibia, a cat's stalk-then-pounce, a
// parkour vault off a rail, a ski jumper's take-off table, a flea that simply
// stops being here and starts being there, a toy stunt ramp over a row of
// barrels, and the chess knight's own L drawn as TWO distinct movements and a
// turn rather than as one tidy arc.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g18LeapPlays.css), transform/opacity animations only, no import from
// BoardEffects.tsx (cycle hazard), only the SigPlugin / SigRole TYPES from
// sigPlugins.tsx.
//
// DIRECTIONAL BY CONSTRUCTION. Knight cards are about a specific square being
// reached from a specific square, so most of the batch stages inside
// <AimStage>: the art is authored pointing RIGHT (+x) and aims itself down the
// real source -> target vector.
//
//   --fx-len   the leap covers the REAL distance. A body sized to ONE CELL
//              travels translate(calc(var(--fx-len) * 100%), arc), and a lane
//              (a furrow, an inrun, a lunge rein, a row of barrels) is sized
//              calc(var(--fx-len) * 7.142857%) wide, which IS that distance.
//   --fx-index barrels, hoppers, skips and lit footfalls arrive in the real
//              victim order.
//   --fx-side  dust, spray, down and sand drift AWAY from the caster, and the
//              forbidden forward direction in Reined Back is the caster's own.
//              Nothing in this file says "up" or "down".
//   <BoardFrame> anything that means the whole board: washes, the safety net,
//              the paddock rail, the weir step.
//
// Every scene runs three beats (tell -> strike -> settle) in all three roles,
// "lead", "target" and "entrance". Class prefix `g18-`.

import "./g18LeapPlays.css";

import type { CSSProperties } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Local machinery. Nothing here draws: it positions, sizes and delays.
   ========================================================================== */

/** Scene root for the square-local cuts (target + entrance). */
const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** Style escape hatch: scene styles carry CSS custom properties too. */
type Style = CSSProperties & Record<string, unknown>;
const st = (o: Style): CSSProperties => o as CSSProperties;

/** The caller's stagger plus this layer's own beat, in ms. */
const d = (base: number, off: number): CSSProperties => ({ animationDelay: `${base + off}ms` });

/** The same, ordered by the square's real place in the victim order. */
const idx = (base: number, off: number, per = 34): CSSProperties => ({
  animationDelay: `calc(${base + off}ms + var(--fx-index, 0) * ${per}ms)`,
});

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS centred on the cast square (the stage's 50%/50%),
 * optionally offset `dx`/`dy` cells. A ONE-CELL box can then travel exactly
 * --fx-len cells with translateX(calc(var(--fx-len) * 100%)).
 */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${50 + (dx - w / 2) * CELL}%`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/**
 * A lane starting AT the cast square and running the real distance to the
 * landing square, `thick` cells thick. Authored pointing right; <AimStage>
 * puts it on the real leap vector. `f` shortens it (a leap cut off partway).
 */
const lane = (thick: number, dy = 0, f = 1): CSSProperties => ({
  left: "50%",
  top: `${50 + (dy - thick / 2) * CELL}%`,
  width: `calc(var(--fx-len, 2.4) * ${(CELL * f).toFixed(4)}%)`,
  height: cells(thick),
});

/**
 * A box centred on the LANDING square — `f` of the way along the real leap.
 * This is where the thump, the catcher's hands and the boundary stone go.
 */
const at = (w: number, h: number, f = 1, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 2.4) * ${(CELL * f).toFixed(4)}% - ${((w / 2) * CELL).toFixed(3)}%)`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* =============================================================================
   1. Founding of the City (t8) — the founder ploughs the boundary furrow down
   the vector and puts his horse over it: the wall line is sacred, so nothing
   may touch it. A boundary stone thumps down where he lands.
   Palette: #e0b45c / #fff2cf / #2c2010.
   ========================================================================== */
function FurrowLeap({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "70%", height: "4%", width: "88%", background: "#2c2010" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "16%", width: "60%", height: "60%" })}>
          <path d="M3 20c2.4-7 7-10.6 11.6-10.6" fill="none" stroke="#e0b45c" strokeWidth="2" {...SJ} />
          <path d="M13.6 5.6l5 3.2-4.6 2.6z" fill="#fff2cf" />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "60%", top: "42%", width: "30%", height: "30%" })}>
          <path d="M7 21V9.4L12 5l5 4.4V21z" fill="#e0b45c" stroke="#2c2010" strokeWidth="1.5" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "66%", height: "7%", width: "92%", background: "#2c2010" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "16%", width: "60%", height: "60%" })}>
          <path d="M7 21V9.4L12 5l5 4.4V21z" fill="#e0b45c" stroke="#2c2010" strokeWidth="1.6" />
          <path d="M9.6 13.4h4.8" stroke="#fff2cf" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff2cf, transparent 70%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(224,180,92,0.3), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the plough scribes the sacred boundary down the real vector */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 120), ...lane(0.16), background: "#fff2cf" })} />
        {/* the furrow itself opens along that line, turned earth and all */}
        <span className="g18-fnd-furrow absolute block" style={st({ ...d(delayMs, 240), ...lane(0.72), background: "linear-gradient(180deg, #2c2010, #6a4a1c 55%, #2c2010)" })} />
        {/* strike: the founder puts his horse over the line it is unlawful to touch */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 360), ...box(1.3, 1.3, 0, -0.2), filter: "drop-shadow(0 0 5px rgba(224,180,92,0.7))" })}>
          <path d="M4 20c1.4-6.6 5.2-9.4 9-9.4l1.6-3.4 2.6 2.6 3.4-1.2-1.6 3.6" fill="#e0b45c" stroke="#2c2010" strokeWidth="1.2" {...SJ} />
          <path d="M8.6 20l2-4M13.4 20l2.4-4.6" stroke="#fff2cf" strokeWidth="1.3" {...SJ} />
        </svg>
        {/* the shadow crosses the furrow beneath him and never touches it */}
        <span className="g18-shadow absolute block" style={st({ ...d(delayMs, 380), ...box(1, 0.34, 0, 0.62), borderRadius: "50%", background: "rgba(44,32,16,0.85)" })} />
        {/* the boundary stone thumps in where he lands */}
        <svg viewBox="0 0 24 24" className="g18-fnd-stone absolute block" style={st({ ...d(delayMs, 520), ...at(1.6, 1.6, 1, -0.1) })}>
          <path d="M6 21V9L12 4l6 5v12z" fill="#e0b45c" stroke="#2c2010" strokeWidth="1.6" />
          <path d="M9 13h6M9 16.4h6" stroke="#2c2010" strokeWidth="1.2" {...SJ} />
        </svg>
        {/* settle: turned clods drifting off the fresh cut, away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...box(4.4, 1.8, 1.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(224,180,92,0.5), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   2. Dancing Master (t7) — the knight's L is chalked on the floor as two
   strokes, then a grand jeté sweeps a ribbon straight through the corner and
   the L becomes one long diagonal. Rosin dust settles on the boards.
   Palette: #c9a2e8 / #fdf0d8 / #2a1c3a.
   ========================================================================== */
function GrandJete({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "4%", width: "84%", background: "#c9a2e8" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 210), left: "16%", top: "16%", width: "62%", height: "62%" })}>
          <path d="M2 19l7-6 4 2 9-9" fill="none" stroke="#fdf0d8" strokeWidth="2" {...SJ} />
          <circle cx="12.6" cy="8.2" r="2.2" fill="#c9a2e8" stroke="#2a1c3a" strokeWidth="1.1" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "30%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, #fdf0d8, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "50%", height: "6%", width: "88%", background: "linear-gradient(90deg, transparent, #c9a2e8, #fdf0d8)" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M3 20l6-5.4 3.4 1.6L21 6" fill="none" stroke="#c9a2e8" strokeWidth="2.6" {...SJ} />
          <path d="M17.6 5.2l4-0.8-1 4z" fill="#fdf0d8" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 410), left: "32%", top: "28%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, #fdf0d8, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(201,162,232,0.28), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell, movement one: the long leg of the L is chalked on the boards */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 110), ...lane(0.14, 0, 0.78), background: "#fdf0d8" })} />
        {/* tell, movement two: and the turn, a separate stroke at right angles */}
        <span className="g18-dnc-leg absolute block" style={st({ ...d(delayMs, 190), ...at(0.14, 1.1, 0.78, -0.55), background: "#fdf0d8" })} />
        {/* strike: the ribbon sweeps straight through the corner, one diagonal */}
        <span className="g18-dnc-ribbon absolute block" style={st({ ...d(delayMs, 300), ...lane(0.44, -0.3), background: "linear-gradient(90deg, rgba(201,162,232,0), #c9a2e8, #fdf0d8)" })} />
        {/* the jeté: split legs, both feet off the floor, crossing the whole line */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 380), ...box(1.4, 1.4, 0, -0.3), filter: "drop-shadow(0 0 5px rgba(201,162,232,0.7))" })}>
          <circle cx="12" cy="5.4" r="2.1" fill="#fdf0d8" />
          <path d="M12 7.4v5M12 12.4L3.6 18M12 12.4L20.6 8.6" stroke="#c9a2e8" strokeWidth="2.2" {...SJ} />
          <path d="M9.4 9.4l-6 0.8M14.6 9.4l6-2.2" stroke="#2a1c3a" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* the landing footprint, fifth position, exactly on the far square */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 520), ...at(1.5, 0.5, 1, 0.5), borderRadius: "999px", background: "#c9a2e8" })} />
        {/* settle: rosin dust off the boards */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 660), ...box(3.6, 2, 0.8, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,240,216,0.5), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   3. Griffin's Brood (t7) — the eyrie ledge. Three shells rock, crack and the
   brood fledges: the first flight is all glide, and the wing shadow crosses
   the gap beneath them without ever touching it.
   Palette: #7fd0c0 / #fff3d4 / #14322f.
   ========================================================================== */
const SHELLS = [0, 1, 2];

function FledgeLedge({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "5%", width: "84%", background: "#14322f" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 210), left: "18%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M12 4c3.4 0 5.6 2.8 5.6 6.4S15 20 12 20s-5.6-5.4-5.6-9.6S8.6 4 12 4z" fill="#7fd0c0" stroke="#14322f" strokeWidth="1.3" />
          <path d="M7.4 11.6l9.2-1.4" stroke="#fff3d4" strokeWidth="1.5" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "54%", top: "18%", width: "34%", height: "34%" })}>
          <path d="M3 16c5-1 9-5 10.6-9.6" fill="none" stroke="#fff3d4" strokeWidth="2.2" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "70%", height: "7%", width: "84%", background: "#7fd0c0" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "16%", width: "64%", height: "64%" })}>
          <path d="M4 17c4.6-0.6 8-3.4 9.6-8.2" fill="none" stroke="#7fd0c0" strokeWidth="2.6" {...SJ} />
          <path d="M13 6l4.4 0.6-2.4 3.8z" fill="#fff3d4" stroke="#14322f" strokeWidth="1" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "28%", top: "24%", width: "44%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, #fff3d4, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "linear-gradient(180deg, rgba(127,208,192,0.3), transparent 62%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ledge of the eyrie, and the brood rocking on it */}
        <span className="g18-grf-nest absolute block" style={st({ ...d(delayMs, 130), ...box(2.6, 0.5, 0, 0.55), background: "linear-gradient(180deg, #14322f, #2f6a62)" })} />
        {/* the three shells split along their seams */}
        {SHELLS.map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="g18-grf-shell absolute block" style={st({ ...idx(delayMs, 250 + i * 70, 22), ...box(0.7, 0.7, i - 1, 0.1) })}>
            <path d="M12 3c3.4 0 6 3.8 6 8s-2.6 7-6 7-6-2.8-6-7 2.6-8 6-8z" fill="#fff3d4" stroke="#14322f" strokeWidth="1.4" />
            <path d="M6.4 11.4l3.2-1.6 2.4 2.2 2.6-1.8 3 1.4" fill="none" stroke="#14322f" strokeWidth="1.4" {...SJ} />
          </svg>
        ))}
        {/* strike: the fledgling launches off the ledge and glides the gap */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 380), ...box(1.5, 1.5, 0, -0.3), filter: "drop-shadow(0 0 5px rgba(127,208,192,0.7))" })}>
          <path d="M2 9.6c5.4 0.6 8.6 2.4 10.4 5.2 1.8-3.4 5-5.4 9.6-6.2-2.6 4.6-6 7.4-9.6 7.4S4.6 13.4 2 9.6z" fill="#7fd0c0" stroke="#14322f" strokeWidth="1.1" />
          <path d="M12.4 14.8l0.6 5" stroke="#fff3d4" strokeWidth="1.6" {...SJ} />
        </svg>
        {/* the wing shadow runs the gap beneath them and touches nothing */}
        <span className="g18-shadow absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 0.3, 0, 0.66), borderRadius: "50%", background: "rgba(20,50,47,0.8)" })} />
        {/* the far crag takes their weight */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 540), ...at(1.7, 0.44, 1, 0.5), background: "#14322f" })} />
        {/* settle: down drifting off the ledge, away from the caster */}
        <span className="g18-grf-down absolute block" style={st({ ...d(delayMs, 660), ...box(3.4, 2.2, 0.6, -0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.55), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   4. Pocket Cavalry (t7) — trapeze. Two bars swing, the flyer lets go at the
   top of the arc with nothing underneath but the net, and the catcher's hands
   close on the wrists exactly where the leap ends.
   Palette: #f0a5b8 / #fff1d8 / #3a1826.
   ========================================================================== */
const BARS = [0, 1];

function TrapezeCatch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "74%", height: "4%", width: "80%", background: "#f0a5b8" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "12%", width: "58%", height: "62%" })}>
          <path d="M6 2v8M18 2v8M5 10h14" stroke="#f0a5b8" strokeWidth="2" {...SJ} />
          <circle cx="12" cy="14.4" r="2.4" fill="#fff1d8" stroke="#3a1826" strokeWidth="1.2" />
          <path d="M12 16.8l-2.6 5M12 16.8l2.6 5" stroke="#fff1d8" strokeWidth="1.8" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, #fff1d8, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "24%", height: "5%", width: "92%", background: "#f0a5b8" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "60%" })}>
          <path d="M4 6c3.4 4 6 6 8 6s4.6-2 8-6" fill="none" stroke="#f0a5b8" strokeWidth="2.4" {...SJ} />
          <circle cx="12" cy="14" r="3" fill="#fff1d8" stroke="#3a1826" strokeWidth="1.3" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff1d8, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(240,165,184,0.28), transparent 70%)" })} />
          {/* the safety net is strung across the whole board, on the caster's side */}
          <span className="g18-horizon absolute block" style={st({ ...d(delayMs, 160), left: "0%", top: "50%", width: "100%", height: "1.4%", background: "repeating-linear-gradient(90deg, #f0a5b8 0 6px, rgba(240,165,184,0.25) 6px 12px)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: both bars swing, one at each end of the flight */}
        {BARS.map((i) => (
          <span key={i} className="g18-pkt-bar absolute block" style={st({ ...d(delayMs, 110 + i * 60), ...at(1.2, 0.18, i, -1.5), background: "#fff1d8" })} />
        ))}
        {/* strike: the release, hands empty over the whole gap */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 300), ...box(1.3, 1.3, 0, -0.6), filter: "drop-shadow(0 0 5px rgba(240,165,184,0.7))" })}>
          <circle cx="12" cy="6" r="2.3" fill="#fff1d8" />
          <path d="M12 8.4c-2.6 1.4-3.4 4-2 6.4 1.4 2.4 4.4 2.6 6 0.6" fill="none" stroke="#f0a5b8" strokeWidth="2.3" {...SJ} />
          <path d="M9.6 6.6L5 3.4M14.4 6.6L19 3.4" stroke="#f0a5b8" strokeWidth="1.8" {...SJ} />
        </svg>
        {/* the catcher's hands close on the wrists, exactly at the far end */}
        <svg viewBox="0 0 24 24" className="g18-pkt-catch absolute block" style={st({ ...d(delayMs, 470), ...at(1.6, 1.6, 1, -0.9) })}>
          <path d="M4 8c2.6 0 4.6 1.4 6 3.6C11.4 9.4 13.4 8 16 8" fill="none" stroke="#f0a5b8" strokeWidth="2.6" {...SJ} />
          <path d="M6 8V3.6M9 7.4V3M15 8V3.6M18 8.6V4.4" stroke="#fff1d8" strokeWidth="1.9" {...SJ} />
        </svg>
        {/* chalk from the grip, knocked loose by the catch */}
        <span className="g18-pkt-chalk absolute block" style={st({ ...d(delayMs, 560), ...at(1.8, 1.2, 1, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,216,0.7), transparent 70%)" })} />
        {/* settle: the net stops trembling */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 680), ...box(4, 1.8, 0.8, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,165,184,0.45), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   5. Summer Levy (t6) — the hay is cut and the whole field springs: five
   grasshoppers unfold their coiled tibiae in the real victim order, and one
   great hind leg straightens across the front of the scene.
   Palette: #b7d861 / #fbf6d2 / #22300f.
   ========================================================================== */
const HOPPERS = [0, 1, 2, 3, 4];

function GrasshopperLevy({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "5%", width: "84%", background: "#22300f" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "62%", height: "58%" })}>
          <path d="M4 15c4.6-1.6 8.6-1.6 13-0.2" fill="none" stroke="#b7d861" strokeWidth="2.4" {...SJ} />
          <path d="M8.4 14L6 6.6 12.6 11" fill="none" stroke="#fbf6d2" strokeWidth="2" {...SJ} />
          <circle cx="17.6" cy="14" r="2" fill="#b7d861" stroke="#22300f" strokeWidth="1.1" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "36%", top: "26%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #fbf6d2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "6%", width: "88%", background: "#b7d861" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M3.6 16c4.4-1.4 8.4-1.4 12.8 0" fill="none" stroke="#b7d861" strokeWidth="2.6" {...SJ} />
          <path d="M8 15L5.4 6.6 12 11.6" fill="none" stroke="#fbf6d2" strokeWidth="2.2" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fbf6d2, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "linear-gradient(180deg, rgba(183,216,97,0.3), transparent 64%)" })} />
      </BoardFrame>
      {/* tell: the stalks bend as every leg in the field folds down to load */}
      <span className="g18-crouch absolute block" style={st({ ...d(delayMs, 120), ...box(4.4, 0.8, 0, 0.7), background: "linear-gradient(180deg, rgba(183,216,97,0.1), #22300f)" })} />
      {/* strike: the levy goes up, one hopper per square in the real order */}
      {HOPPERS.map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="g18-lvy-hop absolute block" style={st({ ...idx(delayMs, 280 + i * 64, 26), ...box(0.9, 0.9, i - 2, -0.2 - (i % 2) * 0.5) })}>
          <path d="M4 16c4.4-1.4 8.6-1.4 13 0" fill="none" stroke="#b7d861" strokeWidth="2.6" {...SJ} />
          <path d="M8.4 15L6 6.4 13 11.4" fill="none" stroke="#fbf6d2" strokeWidth="2.2" {...SJ} />
        </svg>
      ))}
      {/* the coiled tibia straightens: the whole trick, drawn once and large */}
      <svg viewBox="0 0 24 24" className="g18-lvy-tibia absolute block" style={st({ ...d(delayMs, 380), ...box(2.8, 2.8, 0, -0.4), filter: "drop-shadow(0 0 5px rgba(183,216,97,0.7))" })}>
        <path d="M3 21l6.4-3.4L6 8.6l7.4 5.4 6.6-9" fill="none" stroke="#b7d861" strokeWidth="2.8" {...SJ} />
        <circle cx="6" cy="8.6" r="1.9" fill="#fbf6d2" />
      </svg>
      {/* husks and seed heads flicked loose by the launch */}
      <span className="g18-lvy-husk absolute block" style={st({ ...d(delayMs, 520), ...box(3.4, 1.4, 0.4, 0.9), background: "repeating-linear-gradient(74deg, #fbf6d2 0 2px, transparent 2px 9px)" })} />
      {/* settle: chaff drifting away from the caster */}
      <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...box(4.6, 2.2, 0, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(251,246,210,0.5), transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   6. Plush Cavalry (t6) — the leap with no muscle in it. A stitched toy horse
   is lobbed along the vector, tumbles limp, lands face down and coughs
   stuffing. A button eye rolls off across the boards.
   Palette: #f2b8d0 / #fff2e0 / #40202f.
   ========================================================================== */
function PlushFlop({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "74%", height: "4%", width: "80%", background: "#40202f" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "16%", width: "62%", height: "62%" })}>
          <path d="M7 20V12c0-3.6 2.6-6 6-6l2.4-2.6 1.4 3 2.6 1-1.4 2.4c0.6 3.6-0.8 6-3 7.6V20z" fill="#f2b8d0" stroke="#40202f" strokeWidth="1.3" />
          <path d="M9 12.6c1.4 1 3 1.2 4.6 0.4" stroke="#fff2e0" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "56%", top: "56%", width: "22%", height: "22%", borderRadius: "50%", background: "#fff2e0" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "72%", height: "7%", width: "84%", background: "#f2b8d0" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "56%" })}>
          <path d="M3 16c3.4-3 7-4.4 10.6-4l3.4-3.4 1 3.6 3 1.4-2.6 2.6" fill="#f2b8d0" stroke="#40202f" strokeWidth="1.3" />
          <path d="M6 14.4l1.4 2.2M10.4 13.6l1 2.6" stroke="#fff2e0" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff2e0, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(242,184,208,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the seams take the strain and there is nothing behind them */}
        <span className="g18-crouch absolute block" style={st({ ...d(delayMs, 130), ...box(1.6, 0.9, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,184,208,0.8), transparent 72%)" })} />
        {/* the seam line the toy is supposed to travel */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 200), ...lane(0.12, 0.4), background: "repeating-linear-gradient(90deg, #fff2e0 0 5px, transparent 5px 11px)" })} />
        {/* strike: it tumbles down the line with no muscle in it at all */}
        <svg viewBox="0 0 24 24" className="g18-plu-flop absolute block" style={st({ ...d(delayMs, 280), ...box(1.5, 1.5, 0, -0.1), filter: "drop-shadow(0 0 4px rgba(242,184,208,0.6))" })}>
          <path d="M5 19c0-4.4 2.4-7.4 6.4-8L15 7l1.2 3.4 3.2 1.2-2 3c0.4 3-1 5-3.4 6.2" fill="#f2b8d0" stroke="#40202f" strokeWidth="1.3" />
          <path d="M8.4 13.4c1.8 1.2 3.8 1.4 6 0.6" stroke="#fff2e0" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* it lands on its face at the far end and stays there */}
        <span className="g18-plu-face absolute block" style={st({ ...d(delayMs, 470), ...at(1.7, 0.6, 1, 0.4), borderRadius: "999px", background: "linear-gradient(180deg, #f2b8d0, #40202f)" })} />
        {/* the stuffing comes out */}
        <span className="g18-plu-stuff absolute block" style={st({ ...d(delayMs, 560), ...at(2.2, 1.6, 1, -0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,224,0.8), transparent 68%)" })} />
        {/* settle: a button eye rolls off away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 670), ...at(0.6, 0.6, 1, 0.6), borderRadius: "50%", background: "#fff2e0" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   7. Falconer's Glove (t5) — the bird bates off the fist one square and comes
   straight back to it. The jess runs the whole line and the leash never lets
   go; the hood comes off first, the bells ring after.
   Palette: #d8a05a / #fdf0cf / #2e1f10.
   ========================================================================== */
function FalconBate({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "74%", height: "4%", width: "80%", background: "#d8a05a" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "16%", width: "60%", height: "62%" })}>
          <path d="M8 20v-5.4c0-3 2-5 4.6-5L17 6l0.6 3.4 2.4 1.4-2.4 1.6" fill="#d8a05a" stroke="#2e1f10" strokeWidth="1.3" />
          <path d="M4 20h9" stroke="#fdf0cf" strokeWidth="2.2" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "50%", width: "26%", height: "26%" })}>
          <circle cx="12" cy="12" r="6" fill="#fdf0cf" stroke="#2e1f10" strokeWidth="1.4" />
          <path d="M12 6v12" stroke="#2e1f10" strokeWidth="1.3" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "6%", width: "88%", background: "#d8a05a" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M3 8c4.6 1.4 7.4 3.6 9 6.6 1.6-3 4.4-5.2 9-6.6-2.4 5-5.4 7.8-9 7.8S5.4 13 3 8z" fill="#d8a05a" stroke="#2e1f10" strokeWidth="1.2" />
          <path d="M12 15.4v4.2" stroke="#fdf0cf" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "32%", top: "28%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, #fdf0cf, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(216,160,90,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the hood is drawn off and the eye finds the line */}
        <svg viewBox="0 0 24 24" className="g18-fal-hood absolute block" style={st({ ...d(delayMs, 120), ...box(1.1, 1.1, -0.2, -0.5) })}>
          <path d="M12 4c3.4 0 5.6 3 5.6 7s-2.2 6.6-5.6 6.6S6.4 15 6.4 11 8.6 4 12 4z" fill="#2e1f10" stroke="#d8a05a" strokeWidth="1.4" />
          <path d="M12 4.4v3.2" stroke="#fdf0cf" strokeWidth="1.8" {...SJ} />
        </svg>
        {/* the jess and leash run the whole length of the line */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 180), ...lane(0.1, 0.15), background: "#fdf0cf" })} />
        {/* strike: the bird bates out one square and is back on the fist */}
        <svg viewBox="0 0 24 24" className="g18-fal-bate absolute block" style={st({ ...d(delayMs, 300), ...box(1.5, 1.5, 0.3, -0.4), filter: "drop-shadow(0 0 5px rgba(216,160,90,0.7))" })}>
          <path d="M2 7.4c5.6 1 9 3.2 10.4 6.4 1.6-3.4 5-5.6 10-6.6-2.6 5.4-6 8.4-10 8.4S4.6 12.6 2 7.4z" fill="#d8a05a" stroke="#2e1f10" strokeWidth="1.1" />
          <path d="M12.4 14.6l0.4 5.4" stroke="#fdf0cf" strokeWidth="1.6" {...SJ} />
        </svg>
        {/* the glove waits for it and takes the weight back */}
        <svg viewBox="0 0 24 24" className="g18-fal-glove absolute block" style={st({ ...d(delayMs, 420), ...box(1.8, 1.8, -0.5, 0.4) })}>
          <path d="M3 20v-5.6c0-3.4 2.4-5.6 5.6-5.6h3.8l4-3.4 1 3.6 3.2 1.4-3.2 2.4c0.4 4-2 7.2-6 7.2z" fill="#d8a05a" stroke="#2e1f10" strokeWidth="1.4" />
          <path d="M6 14.6h5.4" stroke="#fdf0cf" strokeWidth="1.5" {...SJ} />
        </svg>
        {/* settle: bells and one shed feather, drifting off the caster's line */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 620), ...box(3.2, 2, 0.6, -0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,240,207,0.55), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   8. Pathfinders (t5) — the long leap, three one way and one the other, drawn
   as a stone skipped across flat water: three skips down the line and a fourth
   touch that carries off the axis before it drops.
   Palette: #86c7ea / #fdf3d6 / #12293c.
   ========================================================================== */
const SKIPS = [0, 1, 2];

function StoneSkip({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "6%", top: "68%", height: "4%", width: "88%", background: "#86c7ea" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "22%", width: "64%", height: "48%" })}>
          <path d="M2 18c2.4-4 4.6-4 6.6 0 2-4.6 4.2-4.6 6.2 0 1.8-4 3.6-4 7.2-0.6" fill="none" stroke="#86c7ea" strokeWidth="2.2" {...SJ} />
          <ellipse cx="4" cy="12.6" rx="2.6" ry="1.6" fill="#fdf3d6" stroke="#12293c" strokeWidth="1.1" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "58%", top: "50%", width: "28%", height: "20%", borderRadius: "50%", border: "2px solid #fdf3d6" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "58%", height: "5%", width: "92%", background: "#86c7ea" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "22%", width: "64%", height: "56%" })}>
          <ellipse cx="12" cy="10" rx="6.4" ry="3.6" fill="#fdf3d6" stroke="#12293c" strokeWidth="1.4" />
          <path d="M4 16.6c2.6 2 13.4 2 16 0" fill="none" stroke="#86c7ea" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g18-ring absolute block" style={st({ ...d(delayMs, 400), left: "22%", top: "30%", width: "56%", height: "40%", borderRadius: "50%", border: "2px solid #fdf3d6" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "linear-gradient(180deg, rgba(134,199,234,0.28), transparent 66%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the arm cocks low and sidearm, thumb along the flat face */}
        <span className="g18-crouch absolute block" style={st({ ...d(delayMs, 120), ...box(1.5, 0.7, -0.3, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(134,199,234,0.85), transparent 74%)" })} />
        {/* the flat water the whole throw has to cross */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 190), ...lane(0.1, 0.42), background: "#fdf3d6" })} />
        {/* strike: the stone runs the real length of the line in three skips */}
        <svg viewBox="0 0 24 24" className="g18-pth-skip absolute block" style={st({ ...d(delayMs, 260), ...box(0.85, 0.85, 0, 0), filter: "drop-shadow(0 0 4px rgba(134,199,234,0.8))" })}>
          <ellipse cx="12" cy="12" rx="9" ry="5" fill="#fdf3d6" stroke="#12293c" strokeWidth="1.6" />
          <path d="M5.4 10.6c3.6-1.6 8-1.6 12 0.4" fill="none" stroke="#12293c" strokeWidth="1.2" {...SJ} />
        </svg>
        {/* one ring opens at each touch, in the real square order */}
        {SKIPS.map((i) => (
          <span key={i} className="g18-ring absolute block" style={st({ ...idx(delayMs, 340 + i * 96, 24), ...at(1.5, 0.9, 0.28 + i * 0.3, 0.42), borderRadius: "50%", border: "2px solid #fdf3d6" })} />
        ))}
        {/* the fourth touch carries off the axis and the stone goes under */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 520), ...at(1.1, 1.1, 1, -0.5), borderRadius: "50%", background: "radial-gradient(circle, #86c7ea, transparent 70%)" })} />
        {/* settle: beads thrown off the last skip, away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...box(3.8, 1.6, 1, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,243,214,0.55), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   9. Reserve Officer (t5) — the ski jumper sits on the gate bar at the top of
   the inrun with his skis crossed, waiting to be called. Then the inrun, the
   take-off table, the lean out over the tips, and the mark in the outrun.
   Palette: #9fd4ea / #fff4d6 / #16283a.
   ========================================================================== */
function SkiTable({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "70%", height: "4%", width: "84%", background: "#9fd4ea" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "62%", height: "58%" })}>
          <path d="M2 18h9l9-11" fill="none" stroke="#9fd4ea" strokeWidth="2.4" {...SJ} />
          <circle cx="14.6" cy="9.4" r="2.1" fill="#fff4d6" stroke="#16283a" strokeWidth="1.1" />
          <path d="M12 12l-6 5.4M13.4 13l-5 5.6" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "36%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "66%", height: "6%", width: "92%", background: "#9fd4ea" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "60%" })}>
          <path d="M3 17l7-3.4 10.4-6" fill="none" stroke="#9fd4ea" strokeWidth="2.6" {...SJ} />
          <path d="M4.6 20l7.4-4.4" stroke="#fff4d6" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "28%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "linear-gradient(180deg, rgba(159,212,234,0.3), transparent 62%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the gate bar, and the reserve sitting on it with skis crossed */}
        <svg viewBox="0 0 24 24" className="g18-rsv-gate absolute block" style={st({ ...d(delayMs, 120), ...box(1.4, 1.4, -0.6, -0.6) })}>
          <path d="M2 12h20" stroke="#9fd4ea" strokeWidth="2.6" {...SJ} />
          <circle cx="12" cy="8" r="2.2" fill="#fff4d6" stroke="#16283a" strokeWidth="1.1" />
          <path d="M6 20l12-6M6 14l12 6" stroke="#fff4d6" strokeWidth="1.8" {...SJ} />
        </svg>
        {/* the inrun and the take-off table run the real length of the line */}
        <span className="g18-rsv-table absolute block" style={st({ ...d(delayMs, 200), ...lane(0.4, 0.6), background: "linear-gradient(90deg, #16283a, #9fd4ea)" })} />
        {/* strike: off the table, leaning out over the ski tips */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 320), ...box(1.5, 1.5, 0, -0.3), filter: "drop-shadow(0 0 5px rgba(159,212,234,0.7))" })}>
          <circle cx="7.4" cy="8" r="2.2" fill="#fff4d6" stroke="#16283a" strokeWidth="1.1" />
          <path d="M9 9.6c3 0.6 5.4 2 7.4 4.4" fill="none" stroke="#9fd4ea" strokeWidth="2.4" {...SJ} />
          <path d="M4 16.6L21 11M4.6 19.4L21.6 14" stroke="#fff4d6" strokeWidth="1.9" {...SJ} />
        </svg>
        {/* the mark in the outrun, exactly on the landing square */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 500), ...at(1.8, 0.4, 1, 0.55), background: "#9fd4ea" })} />
        {/* settle: snow spray thrown away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 640), ...at(2.6, 1.8, 1, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   10. Veteran's Return (t5) — the salmon runs the weir. The step is drawn
   across the whole board, the sheet of water pours over it, and the old fish
   goes up it in one leap that nothing helps him with.
   Palette: #6fb9a4 / #ffeecb / #10302c.
   ========================================================================== */
function SalmonWeir({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "5%", width: "84%", background: "#6fb9a4" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "18%", width: "64%", height: "56%" })}>
          <path d="M3 14c4-6 11-7.6 16-4.6-3.4 4.6-9.6 6.6-16 4.6z" fill="#6fb9a4" stroke="#10302c" strokeWidth="1.3" />
          <path d="M19 9.4l3-3.4 0.4 5.4z" fill="#ffeecb" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "56%", width: "48%", height: "18%", borderRadius: "50%", border: "2px solid #ffeecb" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "64%", height: "6%", width: "92%", background: "#6fb9a4" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "56%" })}>
          <path d="M2.6 13c4-5.6 11-7 15.4-4-3.2 4.4-9 6.2-15.4 4z" fill="#6fb9a4" stroke="#10302c" strokeWidth="1.3" />
          <path d="M17.6 8.6l3.6-3.2 0.4 5.6z" fill="#ffeecb" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "28%", top: "26%", width: "44%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, #ffeecb, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "linear-gradient(180deg, rgba(111,185,164,0.32), transparent 64%)" })} />
          {/* the weir step itself is a board-wide thing, not a stage percentage */}
          <span className="g18-horizon absolute block" style={st({ ...d(delayMs, 130), left: "0%", top: "50%", width: "100%", height: "2.6%", background: "linear-gradient(180deg, #ffeecb, #10302c)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the sheet of water pours off the lip and says how high it is */}
        <span className="g18-vet-fall absolute block" style={st({ ...d(delayMs, 180), ...box(2.4, 1.6, 0.4, 0.2), background: "linear-gradient(90deg, rgba(111,185,164,0.15), rgba(255,238,203,0.85))" })} />
        {/* strike: the old fish goes up it, nose first, in one movement */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 320), ...box(1.5, 1.5, 0, -0.2), filter: "drop-shadow(0 0 5px rgba(111,185,164,0.7))" })}>
          <path d="M2 14.6c4.6-6.6 12.6-8.4 18-4.6-4 5.4-11 7.6-18 4.6z" fill="#6fb9a4" stroke="#10302c" strokeWidth="1.2" />
          <path d="M19.4 9.6l3.6-3.4 0.6 5.8z" fill="#ffeecb" />
          <circle cx="16.6" cy="11.4" r="0.9" fill="#10302c" />
        </svg>
        {/* a second, younger one takes the same line half a beat behind */}
        <svg viewBox="0 0 24 24" className="g18-vet-fish absolute block" style={st({ ...d(delayMs, 420), ...box(1.1, 1.1, -0.3, 0.6) })}>
          <path d="M3 14c4-5.4 10.6-6.8 15-4-3.2 4.2-8.8 6-15 4z" fill="#6fb9a4" stroke="#10302c" strokeWidth="1.2" />
          <path d="M17.4 9.8l3.4-3 0.4 5.2z" fill="#ffeecb" />
        </svg>
        {/* the landing, upstream of the step, on the real square */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 540), ...at(1.6, 0.9, 1, 0.2), borderRadius: "50%", background: "radial-gradient(circle, #ffeecb, transparent 70%)" })} />
        {/* settle: spray blown off the lip away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...box(4, 2, 0.8, -0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,203,0.55), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   11. Ash Veil (t5) — the leap you never see. A flea is here, and then it is
   there, and there is no arc in between: two soft ash prints and a hanging
   veil that closes over the space where the jump should have been drawn.
   Palette: #b6b1a4 / #f6ecd6 / #2a2721.
   ========================================================================== */
const VEILS = [0, 1, 2];

function AshFlea({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "26%", height: "4%", width: "84%", background: "#b6b1a4" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 210), left: "22%", top: "24%", width: "52%", height: "52%" })}>
          <path d="M12 5c4 0 6.4 3.4 6.4 7.6 0 3.6-2.4 6-6.4 6s-6.4-2.4-6.4-6C5.6 8.4 8 5 12 5z" fill="#b6b1a4" stroke="#2a2721" strokeWidth="1.3" />
          <path d="M8.6 17.6l-3.4 3.4M15.4 17.6l3.4 3.4" stroke="#f6ecd6" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "34%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #f6ecd6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "20%", height: "6%", width: "88%", background: "#b6b1a4" })} />
        <span className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "24%", width: "52%", height: "52%", borderRadius: "50%", background: "radial-gradient(circle, #f6ecd6, rgba(182,177,164,0.4) 62%, transparent 74%)" })} />
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "50%", background: "radial-gradient(circle, rgba(42,39,33,0.7), transparent 68%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(182,177,164,0.34), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: three sheets of ash hang and stir over the minor pieces */}
      {VEILS.map((i) => (
        <span key={i} className="g18-ash-veil absolute block" style={st({ ...d(delayMs, 130 + i * 70), ...box(3.2 - i * 0.6, 2.6, 0, -0.2 + i * 0.3), background: "linear-gradient(180deg, rgba(246,236,214,0.5), rgba(42,39,33,0.7))" })} />
      ))}
      {/* strike: it stops being here. A print, and no body over it */}
      <span className="g18-ash-gone absolute block" style={st({ ...d(delayMs, 280), ...box(1.2, 1.2), borderRadius: "50%", background: "radial-gradient(circle, #f6ecd6, transparent 68%)" })} />
      {/* and starts being there, down the aim vector, with nothing in between */}
      <svg viewBox="0 0 24 24" className="g18-ash-back absolute block" style={st({ ...d(delayMs, 420), ...box(1.3, 1.3), filter: "drop-shadow(0 0 4px rgba(182,177,164,0.8))" })}>
        <path d="M12 4.6c3.8 0 6 3.2 6 7.4 0 3.4-2.2 5.8-6 5.8s-6-2.4-6-5.8c0-4.2 2.2-7.4 6-7.4z" fill="#b6b1a4" stroke="#2a2721" strokeWidth="1.3" />
        <path d="M8.4 17l-3.6 4M15.6 17l3.6 4" stroke="#f6ecd6" strokeWidth="1.7" {...SJ} />
      </svg>
      {/* the ash falls back into the shape of the gap */}
      <span className="g18-dust absolute block" style={st({ ...d(delayMs, 560), ...box(3.6, 2.2, 0, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(42,39,33,0.6), transparent 72%)" })} />
      {/* settle: flakes still coming down long after */}
      <span className="g18-motes absolute block" style={st({ ...d(delayMs, 680), ...box(4.2, 2.6, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,236,214,0.45), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   12. Groom's Leash (t5) — the lunge line. A picket ring is driven in on the
   cast square, the rein pays out down the vector, the horse goes up and the
   line comes taut in mid-air: the leap is cut off and swings back.
   Palette: #c98f5e / #ffeec9 / #2f1c10.
   ========================================================================== */
function LungeLine({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "72%", height: "4%", width: "80%", background: "#2f1c10" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "62%", height: "58%" })}>
          <circle cx="5" cy="18" r="3" fill="none" stroke="#c98f5e" strokeWidth="2.2" />
          <path d="M7.6 16.6C12 13 16 10.6 21 9.4" fill="none" stroke="#ffeec9" strokeWidth="2" {...SJ} />
          <path d="M18.6 6.6l3.6 2.8-3.4 2.4z" fill="#c98f5e" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "20%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec9, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "48%", height: "5%", width: "92%", background: "#c98f5e" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <circle cx="12" cy="12" r="7" fill="none" stroke="#c98f5e" strokeWidth="2.6" />
          <path d="M12 5v14" stroke="#ffeec9" strokeWidth="1.8" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec9, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(201,143,94,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the picket ring is driven into the cast square */}
        <span className="g18-lsh-ring absolute block" style={st({ ...d(delayMs, 120), ...box(1.3, 1.3), borderRadius: "50%", border: "3px solid #c98f5e" })} />
        {/* the lunge rein pays out the real length of the leg it is allowed */}
        <span className="g18-lsh-rein absolute block" style={st({ ...d(delayMs, 200), ...lane(0.12, -0.1, 0.72), background: "#ffeec9" })} />
        {/* strike: the horse goes, and the line stops it in the air */}
        <svg viewBox="0 0 24 24" className="g18-lsh-jerk absolute block" style={st({ ...d(delayMs, 320), ...box(1.5, 1.5, 0, -0.4), filter: "drop-shadow(0 0 5px rgba(201,143,94,0.7))" })}>
          <path d="M4 20c0-5.4 3-9 7.6-9.6l2.6-3.8 1.6 3 3.2 1-1.6 3.2c0.4 3.6-1.2 6.2-3.6 7.6" fill="#c98f5e" stroke="#2f1c10" strokeWidth="1.3" />
          <path d="M8 15.4c2 1.4 4.4 1.6 6.8 0.6" stroke="#ffeec9" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* the snatch: the rein whips back down its own length */}
        <span className="g18-lsh-snap absolute block" style={st({ ...d(delayMs, 420), ...lane(0.3, -0.1, 0.72), background: "linear-gradient(90deg, #ffeec9, rgba(255,238,201,0))" })} />
        {/* the hooves come back down where they started */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 500), ...box(1.6, 0.5, 0, 0.6), borderRadius: "999px", background: "#2f1c10" })} />
        {/* settle: scuffed sand, thrown away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 650), ...box(3.4, 1.8, 0.4, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,201,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   13. Honey Spill (t5) — the leap that never leaves the ground. The barrel
   goes over, the sheet spreads square by square, and a hoof comes up trailing
   strings that stretch, thin and hold. One horse gets clear.
   Palette: #e8a93c / #fff0c2 / #3a2408.
   ========================================================================== */
const STRINGS = [0, 1, 2, 3];

function HoneyPour({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "74%", height: "5%", width: "80%", background: "#e8a93c" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "14%", width: "58%", height: "58%" })}>
          <path d="M6 4h12l-1.6 12H7.6z" fill="#e8a93c" stroke="#3a2408" strokeWidth="1.4" />
          <path d="M6.6 8h10.8" stroke="#3a2408" strokeWidth="1.2" />
          <path d="M12 16.4c1.6 2 2.4 3.4 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1 0.8-2.4 2.4-4.4z" fill="#fff0c2" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "62%", width: "40%", height: "18%", borderRadius: "50%", background: "#fff0c2" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "68%", height: "8%", width: "92%", background: "#e8a93c" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M12 3c2.6 4.4 4.4 7.4 4.4 9.8A4.4 4.4 0 0 1 12 17.2a4.4 4.4 0 0 1-4.4-4.4C7.6 10.4 9.4 7.4 12 3z" fill="#e8a93c" stroke="#3a2408" strokeWidth="1.3" />
          <path d="M10.4 11.6c0.6 1.8 1.8 2.6 3.6 2.4" stroke="#fff0c2" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "26%", top: "60%", width: "48%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #fff0c2, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(232,169,60,0.34), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the barrel goes over on the cast square */}
      <svg viewBox="0 0 24 24" className="g18-hny-barrel absolute block" style={st({ ...d(delayMs, 130), ...box(2.2, 2.2, -0.4, -0.9) })}>
        <path d="M5 5h14l-2 12H7z" fill="#e8a93c" stroke="#3a2408" strokeWidth="1.5" />
        <path d="M5.6 9.4h12.8M6.2 13.4h11.6" stroke="#3a2408" strokeWidth="1.2" />
      </svg>
      {/* strike: the sheet spreads over the squares in the real victim order */}
      <span className="g18-hny-pool absolute block" style={st({ ...idx(delayMs, 260, 46), ...box(4.6, 3, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, #e8a93c 30%, rgba(232,169,60,0.35) 66%, transparent 76%)" })} />
      {/* a hoof comes up and the strings come with it */}
      {STRINGS.map((i) => (
        <span key={i} className="g18-hny-string absolute block" style={st({ ...d(delayMs, 400 + i * 46), ...box(0.14, 1.8, i * 0.5 - 0.8, -0.2), background: "linear-gradient(180deg, rgba(255,240,194,0.2), #fff0c2)" })} />
      ))}
      {/* one of them gets clear and hops away down the vector */}
      <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 520), ...box(1.2, 1.2, 0.6, -0.6) })}>
        <path d="M5 20c0-5 2.8-8.4 7-9.2l2.4-3.6 1.6 2.8 3 1-1.6 3c0.4 3.6-1.2 6-3.4 6z" fill="#e8a93c" stroke="#3a2408" strokeWidth="1.3" />
      </svg>
      {/* settle: slow drips off the rim, leaning away from the caster */}
      <span className="g18-dust absolute block" style={st({ ...d(delayMs, 670), ...box(3.8, 2, -0.2, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,194,0.55), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   14. Paddock Fence (t5) — the water jump. Post and rail across the board with
   the ditch in front of it; one horse clears the pair, its shadow crossing the
   water beneath without breaking it, and then the rails lock solid.
   Palette: #7fb2c9 / #fdf4d8 / #1d2a33.
   ========================================================================== */
function WaterJump({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "70%", height: "5%", width: "84%", background: "#7fb2c9" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "20%", width: "66%", height: "52%" })}>
          <path d="M4 6v14M20 6v14M2 10h20M2 15h20" stroke="#fdf4d8" strokeWidth="2.1" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "16%", width: "48%", height: "48%" })}>
          <path d="M3 20c0-6 3.4-10 8.4-10.8l2.8-4.2 1.8 3.4 3.6 1.2-2 3.6c0.6 4.2-1.4 7-4 7" fill="#7fb2c9" stroke="#1d2a33" strokeWidth="1.3" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "70%", height: "8%", width: "92%", background: "#7fb2c9" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "20%", width: "64%", height: "56%" })}>
          <path d="M4 5v14M20 5v14M2 9.4h20M2 14.6h20" stroke="#fdf4d8" strokeWidth="2.3" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "24%", top: "58%", width: "52%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #7fb2c9, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "linear-gradient(180deg, rgba(127,178,201,0.3), transparent 62%)" })} />
          {/* the fence is a board-wide thing: it runs the whole width */}
          <span className="g18-pdk-rail absolute block" style={st({ ...d(delayMs, 120), left: "0%", top: "48%", width: "100%", height: "3.4%", background: "repeating-linear-gradient(90deg, #fdf4d8 0 26px, #1d2a33 26px 32px)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ditch in front of the rails glints and dares them */}
        <span className="g18-pdk-water absolute block" style={st({ ...d(delayMs, 200), ...box(3, 0.8, 0.4, 0.55), borderRadius: "999px", background: "linear-gradient(90deg, rgba(127,178,201,0.2), #7fb2c9, rgba(253,244,216,0.9))" })} />
        {/* strike: one horse takes rail and water together, this once */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 320), ...box(1.6, 1.6, 0, -0.3), filter: "drop-shadow(0 0 5px rgba(127,178,201,0.7))" })}>
          <path d="M2.6 20c0-6.4 3.6-10.6 9-11.4l3-4.6 2 3.6 3.8 1.4-2.2 3.8c0.6 4.6-1.6 7.2-4.4 7.2" fill="#7fb2c9" stroke="#1d2a33" strokeWidth="1.3" />
          <path d="M7.6 13.6c2.4 1.6 5 1.8 8 0.6" stroke="#fdf4d8" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* the shadow crosses the water beneath and never breaks it */}
        <span className="g18-shadow absolute block" style={st({ ...d(delayMs, 340), ...box(1.1, 0.3, 0, 0.56), borderRadius: "50%", background: "rgba(29,42,51,0.85)" })} />
        {/* then the rails go solid and the gate is done with being jumped */}
        <span className="g18-pdk-lock absolute block" style={st({ ...d(delayMs, 520), ...box(4.4, 0.42, 0, -0.15), background: "#fdf4d8" })} />
        {/* settle: water thrown off the far bank, away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...at(2.6, 1.6, 1, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,244,216,0.55), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   15. The Toy Box (t5) — the plastic stunt ramp comes out of the box, the
   barrels get laid out one per square in the real order, and the wind-up rider
   clears the lot while everything else in the box shuffles one square.
   Palette: #f2704f / #fff1cd / #33170e.
   ========================================================================== */
const BARRELS = [0, 1, 2, 3];

function StuntRamp({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "74%", height: "5%", width: "84%", background: "#33170e" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "22%", width: "64%", height: "52%" })}>
          <path d="M2 19h9l8-11v11h3" fill="none" stroke="#f2704f" strokeWidth="2.4" {...SJ} />
          <circle cx="6" cy="14.6" r="2.4" fill="#fff1cd" stroke="#33170e" strokeWidth="1.2" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "60%", top: "50%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #fff1cd, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "7%", width: "88%", background: "#f2704f" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M7 5h10l-1.4 15H8.4z" fill="#f2704f" stroke="#33170e" strokeWidth="1.4" />
          <path d="M7.4 10h9.2M7.8 15h8.4" stroke="#fff1cd" strokeWidth="1.3" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "28%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff1cd, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(242,112,79,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ramp clicks onto the cast square, two tabs and a snap */}
        <svg viewBox="0 0 24 24" className="g18-toy-ramp absolute block" style={st({ ...d(delayMs, 130), ...box(1.8, 1.4, -0.4, 0.1) })}>
          <path d="M2 20h4l14-13v13h2" fill="none" stroke="#f2704f" strokeWidth="2.8" {...SJ} />
          <path d="M6 20L18 8.6" stroke="#fff1cd" strokeWidth="1.6" {...SJ} />
        </svg>
        {/* the barrels are laid out one per square, in the real order */}
        {BARRELS.map((i) => (
          <span key={i} className="g18-tick absolute block" style={st({ ...idx(delayMs, 220 + i * 58, 28), ...at(0.5, 0.9, 0.24 + i * 0.2, 0.35), borderRadius: "2px", background: "linear-gradient(180deg, #f2704f, #33170e)" })} />
        ))}
        {/* strike: the wind-up rider takes the lot in one go */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 340), ...box(1.4, 1.4, 0, -0.4), filter: "drop-shadow(0 0 5px rgba(242,112,79,0.7))" })}>
          <circle cx="5.6" cy="16.6" r="3" fill="none" stroke="#33170e" strokeWidth="1.8" />
          <circle cx="18.4" cy="16.6" r="3" fill="none" stroke="#33170e" strokeWidth="1.8" />
          <path d="M5.6 16.6l4.4-6h6l2.4 6" fill="none" stroke="#f2704f" strokeWidth="2.4" {...SJ} />
          <circle cx="11.6" cy="6.6" r="2.1" fill="#fff1cd" stroke="#33170e" strokeWidth="1.1" />
        </svg>
        {/* the landing ramp takes the wheels on the real far square */}
        <span className="g18-land absolute block" style={st({ ...d(delayMs, 500), ...at(1.6, 0.5, 1, 0.4), background: "#f2704f" })} />
        {/* settle: carpet lint and one loose wheel, drifting off the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 660), ...at(2.4, 1.6, 1, -0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,205,0.55), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   16. Beetle Shell (t4) — the click beetle. On its back, no legs involved: it
   arches, the spine catches, and the CLICK throws the whole body into the air
   so it comes down the right way up somewhere else entirely.
   Palette: #c8763a / #ffeccd / #2a1408.
   ========================================================================== */
function ClickBeetle({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "74%", height: "4%", width: "80%", background: "#2a1408" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "16%", width: "56%", height: "60%" })}>
          <path d="M12 4.6c3.6 0 5.6 3 5.6 7.4S15.4 20 12 20s-5.6-3.6-5.6-8S8.4 4.6 12 4.6z" fill="#c8763a" stroke="#2a1408" strokeWidth="1.4" />
          <path d="M12 6.6V19" stroke="#ffeccd" strokeWidth="1.5" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "36%", top: "30%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #ffeccd, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "72%", height: "6%", width: "84%", background: "#c8763a" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M12 4c3.8 0 6 3.2 6 7.8S15.6 20 12 20s-6-3.6-6-8.2S8.2 4 12 4z" fill="#c8763a" stroke="#2a1408" strokeWidth="1.5" />
          <path d="M12 6V19M7.4 8.4L4 6M16.6 8.4L20 6" stroke="#ffeccd" strokeWidth="1.5" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "28%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #ffeccd, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(200,118,58,0.3), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: on its back, arching, loading the spine against the catch */}
      <svg viewBox="0 0 24 24" className="g18-btl-arch absolute block" style={st({ ...d(delayMs, 140), ...box(2, 2, 0, 0.3) })}>
        <path d="M3 17c3.6-5 6.6-7.4 9-7.4s5.4 2.4 9 7.4" fill="none" stroke="#c8763a" strokeWidth="3" {...SJ} />
        <path d="M7 15.4l-2.6 4M17 15.4l2.6 4" stroke="#2a1408" strokeWidth="1.8" {...SJ} />
      </svg>
      {/* the click: the spine lets go, and nothing touches the ground */}
      <span className="g18-btl-click absolute block" style={st({ ...d(delayMs, 300), ...box(2.6, 0.3, 0, 0.7), background: "linear-gradient(90deg, transparent, #ffeccd, transparent)" })} />
      {/* strike: the whole body is thrown clear and lands the right way up */}
      <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 380), ...box(1.3, 1.3, 0, -0.2), filter: "drop-shadow(0 0 5px rgba(200,118,58,0.7))" })}>
        <path d="M12 3.6c3.8 0 6.2 3.4 6.2 8S15.8 20 12 20s-6.2-3.8-6.2-8.4S8.2 3.6 12 3.6z" fill="#c8763a" stroke="#2a1408" strokeWidth="1.4" />
        <path d="M12 5.6V19.4" stroke="#ffeccd" strokeWidth="1.6" />
      </svg>
      {/* the wing cases snap shut over the whole business */}
      <span className="g18-btl-elytra absolute block" style={st({ ...d(delayMs, 520), ...box(1.9, 1.9), borderRadius: "50%", border: "3px solid #ffeccd" })} />
      {/* settle: grit thrown clear, drifting away from the caster */}
      <span className="g18-motes absolute block" style={st({ ...d(delayMs, 660), ...box(3.4, 2, 0, -0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,205,0.5), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   17. Tangled Reins (t4) — two rein lines run down the vector, cross in the
   middle of the leap and cinch. The horse is in the air when the knot takes,
   and comes down well short of the line it was aiming at.
   Palette: #e3d0a8 / #fff3d6 / #33261a.
   ========================================================================== */
const REINS = [0, 1];

function TangledReins({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "4%", width: "84%", background: "#33261a" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "18%", width: "62%", height: "58%" })}>
          <path d="M3 6c6 3 8 6 6 9M21 6c-6 3-8 6-6 9" fill="none" stroke="#e3d0a8" strokeWidth="2.2" {...SJ} />
          <path d="M8.4 13.4c2.4 2 4.8 2 7.2 0" fill="none" stroke="#fff3d6" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "42%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #fff3d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "46%", height: "5%", width: "92%", background: "#e3d0a8" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M4 4c7 4 9 8 6.4 12M20 4c-7 4-9 8-6.4 12" fill="none" stroke="#e3d0a8" strokeWidth="2.6" {...SJ} />
          <circle cx="12" cy="17" r="2.6" fill="#fff3d6" stroke="#33261a" strokeWidth="1.2" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "28%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff3d6, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(227,208,168,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: both reins run out the real length of the intended leap */}
        {REINS.map((i) => (
          <span key={i} className="g18-tgl-line absolute block" style={st({ ...d(delayMs, 120 + i * 60), ...lane(0.11, i === 0 ? -0.42 : 0.42), background: "#e3d0a8" })} />
        ))}
        {/* strike: they cross, and the knot cinches on itself */}
        <svg viewBox="0 0 24 24" className="g18-tgl-knot absolute block" style={st({ ...d(delayMs, 280), ...box(1.8, 1.8, 0.4, 0) })}>
          <path d="M3 5c8 3.4 10 7.4 7 12M21 5c-8 3.4-10 7.4-7 12" fill="none" stroke="#e3d0a8" strokeWidth="2.8" {...SJ} />
          <circle cx="12" cy="12.6" r="3.2" fill="#33261a" stroke="#fff3d6" strokeWidth="1.6" />
        </svg>
        {/* the horse is in the air when it takes, and is snatched up short */}
        <svg viewBox="0 0 24 24" className="g18-tgl-snag absolute block" style={st({ ...d(delayMs, 380), ...box(1.4, 1.4, 0, -0.4), filter: "drop-shadow(0 0 4px rgba(227,208,168,0.7))" })}>
          <path d="M4.4 20c0-5.6 3-9.4 7.6-10l2.6-4 1.8 3.2 3.2 1.2-1.8 3.4c0.4 3.8-1.4 6.4-3.8 7.8" fill="#e3d0a8" stroke="#33261a" strokeWidth="1.3" />
          <path d="M8.4 15c2 1.4 4.4 1.6 6.8 0.4" stroke="#fff3d6" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* one loop whips clear of the tangle */}
        <span className="g18-ring absolute block" style={st({ ...d(delayMs, 500), ...box(2.2, 2.2, 0.6, 0), borderRadius: "50%", border: "2px solid #fff3d6" })} />
        {/* settle: sand kicked up short of the line, away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 650), ...box(3.4, 1.8, 0.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,214,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   18. Reined Back (t4) — the rail vault, run in reverse. The traceur goes at
   the rail on the caster's side, meets a ward he cannot cross, and turns the
   vault around: hands stay on the rail, the whole body swings back the way it
   came. Only sideways and backward from here.
   Palette: #8fa0c8 / #f2ecd6 / #1c2130.
   ========================================================================== */
function RailVaultBack({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "6%", top: "56%", height: "4%", width: "88%", background: "#8fa0c8" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "16%", width: "60%", height: "58%" })}>
          <circle cx="9" cy="6.4" r="2.2" fill="#f2ecd6" stroke="#1c2130" strokeWidth="1.1" />
          <path d="M9 8.6c3.4 0.4 5.6 2 6.6 4.8" fill="none" stroke="#8fa0c8" strokeWidth="2.3" {...SJ} />
          <path d="M4 15c4-2.6 7.6-2.6 11 0" fill="none" stroke="#f2ecd6" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "58%", top: "48%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #f2ecd6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "56%", height: "6%", width: "92%", background: "#8fa0c8" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "60%" })}>
          <path d="M2 14h20" stroke="#8fa0c8" strokeWidth="2.6" {...SJ} />
          <path d="M17 6l-5 5.6" stroke="#f2ecd6" strokeWidth="2.2" {...SJ} />
          <path d="M6.4 6.6l4.6 4.6M11 6.6l-4.6 4.6" stroke="#f2ecd6" strokeWidth="1.8" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #f2ecd6, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(143,160,200,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the rail, set across the way the caster is pushing */}
        <span className="g18-rnd-rail absolute block" style={st({ ...d(delayMs, 130), ...box(0.32, 3.2, 0.9, 0), background: "linear-gradient(180deg, #f2ecd6, #8fa0c8)" })} />
        {/* strike: the vault goes forward as far as the rail and no further */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 280), ...box(1.3, 1.3, 0, -0.3), filter: "drop-shadow(0 0 4px rgba(143,160,200,0.7))" })}>
          <circle cx="8.4" cy="6" r="2.2" fill="#f2ecd6" stroke="#1c2130" strokeWidth="1.1" />
          <path d="M8.4 8.2c3.6 0.6 5.8 2.6 6.6 6" fill="none" stroke="#8fa0c8" strokeWidth="2.4" {...SJ} />
          <path d="M3.4 16.6c4.6-3 8.6-3 12 0" fill="none" stroke="#f2ecd6" strokeWidth="2.1" {...SJ} />
        </svg>
        {/* the ward stands the far side of the rail and will not be crossed */}
        <span className="g18-rnd-ward absolute block" style={st({ ...d(delayMs, 380), ...box(0.5, 3.6, 1.5, 0), background: "linear-gradient(90deg, rgba(143,160,200,0.9), transparent)" })} />
        {/* so the whole vault comes back over the rail the way it came */}
        <svg viewBox="0 0 24 24" className="g18-rnd-back absolute block" style={st({ ...d(delayMs, 470), ...box(1.2, 1.2, 0.3, -0.2) })}>
          <path d="M20 8c-5 0-8.6 2-11 6" fill="none" stroke="#8fa0c8" strokeWidth="2.6" {...SJ} />
          <path d="M11.6 10.4L8 14.6l5 2.2z" fill="#f2ecd6" />
        </svg>
        {/* settle: chalk knocked off the rail, drifting off the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 640), ...box(3, 2, 0.4, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,236,214,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   19. Skittish Mounts (t4) — what the horses can smell. Two eyeshine slits low
   in the grass, the haunches winding, and then the pounce: a cat crossing the
   whole gap with its feet nowhere near the ground.
   Palette: #9ad6a0 / #fdf1d2 / #18221a.
   ========================================================================== */
function CatPounce({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "72%", height: "5%", width: "84%", background: "#18221a" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "20%", width: "62%", height: "56%" })}>
          <path d="M3 18c0-4.4 3-7 7.6-7.4l3-3.6 1.6 3.4 3.4 1.2-2 3c0.4 3.4-1.4 3.4-3.4 3.4z" fill="#9ad6a0" stroke="#18221a" strokeWidth="1.3" />
          <path d="M6 8.6L4 4.6l4 2.4" fill="none" stroke="#fdf1d2" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "34%", width: "30%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #fdf1d2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "6%", width: "88%", background: "#9ad6a0" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <path d="M4 6.6c2.6 2 4 4.4 4 7.4M12 5c1 3.4 1 6.6 0 9.6M20 6.6c-2.6 2-4 4.4-4 7.4" fill="none" stroke="#9ad6a0" strokeWidth="2.4" {...SJ} />
          <path d="M6 18c4-2.4 8-2.4 12 0" fill="none" stroke="#fdf1d2" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fdf1d2, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(154,214,160,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: two slits of eyeshine low in the grass, and nothing else */}
        <svg viewBox="0 0 24 24" className="g18-skt-eyes absolute block" style={st({ ...d(delayMs, 120), ...box(1.6, 0.8, -0.5, 0.2) })}>
          <path d="M4 12c1.6-2.4 3.4-2.4 5 0-1.6 2.4-3.4 2.4-5 0zM15 12c1.6-2.4 3.4-2.4 5 0-1.6 2.4-3.4 2.4-5 0z" fill="#9ad6a0" />
          <path d="M6.5 9.8v4.4M17.5 9.8v4.4" stroke="#18221a" strokeWidth="1.6" />
        </svg>
        {/* the haunches wind down over the back feet */}
        <span className="g18-crouch absolute block" style={st({ ...d(delayMs, 200), ...box(1.6, 0.8, -0.3, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(24,34,26,0.9), transparent 74%)" })} />
        {/* strike: the pounce crosses the whole gap in one piece */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 320), ...box(1.5, 1.5, 0, -0.3), filter: "drop-shadow(0 0 5px rgba(154,214,160,0.7))" })}>
          <path d="M2 17c1.4-5 5-7.6 9.6-7.6l3.4-4 1.4 3.8 3.6 1.2-2 3.4c0.6 3.6-1 5.6-3.4 6.4" fill="#9ad6a0" stroke="#18221a" strokeWidth="1.3" />
          <path d="M14.4 5.4l-1-3.4 3 2.4" fill="none" stroke="#fdf1d2" strokeWidth="1.5" {...SJ} />
        </svg>
        {/* claws out on the far square, and the grass parts */}
        <svg viewBox="0 0 24 24" className="g18-skt-claw absolute block" style={st({ ...d(delayMs, 470), ...at(1.5, 1.5, 1, 0.1) })}>
          <path d="M4 4c2.6 4.4 4 9 4 16M11 3c1.6 5 1.8 10.4 0.6 16.6M18 4c-1.6 4.6-2.4 9.6-2 16" fill="none" stroke="#fdf1d2" strokeWidth="2.2" {...SJ} />
        </svg>
        {/* settle: the horses go, and the scuffs drift off the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 640), ...box(3.6, 1.8, 0.6, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,241,210,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   20. Tin Soldiers (t4) — a leap made by something that cannot bend. The key
   winds, the joints will not fold, so the figure tips rigidly on the edge of
   its base and falls the whole way across, landing flat with a clack.
   Palette: #b9c2c9 / #fdf0cf / #262c31.
   ========================================================================== */
function TinTip({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "12%", top: "76%", height: "5%", width: "76%", background: "#b9c2c9" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "14%", width: "52%", height: "62%" })}>
          <path d="M9.4 20V13L8 8.6 12 3l4 5.6-1.4 4.4V20z" fill="#b9c2c9" stroke="#262c31" strokeWidth="1.4" />
          <path d="M6 20h12" stroke="#fdf0cf" strokeWidth="2" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "22%", width: "26%", height: "26%" })}>
          <circle cx="12" cy="12" r="5" fill="none" stroke="#fdf0cf" strokeWidth="2.4" />
          <path d="M12 12h8" stroke="#fdf0cf" strokeWidth="2.4" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "74%", height: "6%", width: "84%", background: "#b9c2c9" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "16%", width: "56%", height: "62%" })}>
          <path d="M9.4 20V13L8 8.6 12 3l4 5.6-1.4 4.4V20z" fill="#b9c2c9" stroke="#262c31" strokeWidth="1.5" />
          <path d="M10 9.6h4" stroke="#fdf0cf" strokeWidth="1.5" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fdf0cf, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(185,194,201,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the key winds, and the spring is the only joint it has */}
        <svg viewBox="0 0 24 24" className="g18-tin-key absolute block" style={st({ ...d(delayMs, 130), ...box(1.3, 1.3, -0.6, -0.5) })}>
          <circle cx="9" cy="12" r="5" fill="none" stroke="#b9c2c9" strokeWidth="2.6" />
          <path d="M9 12h11" stroke="#fdf0cf" strokeWidth="2.6" {...SJ} />
        </svg>
        {/* strike: no knees, so it goes over on the edge of its own base */}
        <svg viewBox="0 0 24 24" className="g18-tin-tip absolute block" style={st({ ...d(delayMs, 290), ...box(1.4, 1.8, 0, -0.4), filter: "drop-shadow(0 0 4px rgba(185,194,201,0.7))" })}>
          <path d="M9.4 19V12.6L8 8 12 2.4 16 8l-1.4 4.6V19z" fill="#b9c2c9" stroke="#262c31" strokeWidth="1.4" />
          <path d="M5.4 21.4h13.2" stroke="#fdf0cf" strokeWidth="2.2" {...SJ} />
        </svg>
        {/* it arrives flat on the far square, all in one rigid piece */}
        <span className="g18-tin-clack absolute block" style={st({ ...d(delayMs, 440), ...at(1.9, 0.42, 1, 0.4), background: "linear-gradient(90deg, #262c31, #b9c2c9, #fdf0cf)" })} />
        {/* solder flakes off the seams it never got to bend */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 580), ...at(1.8, 1.4, 1, -0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,240,207,0.6), transparent 72%)" })} />
        {/* settle: paint dust, drifting away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 680), ...box(3.4, 1.8, 0.6, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,194,201,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   21. Templar Vows (t4) — the pole vault. The run-up is chalked, the pole goes
   into the box, and then the part nobody can fake: it BENDS, holds all that
   speed as bend, and gives it back straight up. The bar is left quivering.
   Palette: #e0483c / #fff4d6 / #2a2a30.
   ========================================================================== */
function PoleVault({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "74%", height: "4%", width: "84%", background: "#2a2a30" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "14%", width: "60%", height: "62%" })}>
          <path d="M4 21C8 9 13 3.4 20 2.6" fill="none" stroke="#fff4d6" strokeWidth="2.4" {...SJ} />
          <path d="M12 4h8M16 2v8" stroke="#e0483c" strokeWidth="2.4" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "40%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "34%", height: "6%", width: "88%", background: "#e0483c" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M12 3v18M4 9h16" stroke="#e0483c" strokeWidth="3" {...SJ} />
          <path d="M8 5.4c2.6 1.4 5.4 1.4 8 0" fill="none" stroke="#fff4d6" strokeWidth="1.8" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "28%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(224,72,60,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the run-up is measured out down the real vector */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 120), ...lane(0.12, 0.55), background: "#fff4d6" })} />
        {/* the pole goes into the box and takes the weight of the vow */}
        <span className="g18-tmp-plant absolute block" style={st({ ...d(delayMs, 240), ...box(0.24, 2.6, -0.2, -0.6), background: "linear-gradient(180deg, #fff4d6, #2a2a30)" })} />
        {/* strike: it bends, holds the speed, and hands it back straight up */}
        <svg viewBox="0 0 24 24" className="g18-tmp-bend absolute block" style={st({ ...d(delayMs, 340), ...box(3.4, 3.4, 0.5, -0.6), filter: "drop-shadow(0 0 5px rgba(224,72,60,0.6))" })}>
          <path d="M2 22C6 10 12 3.6 21 2.4" fill="none" stroke="#fff4d6" strokeWidth="2.6" {...SJ} />
          <circle cx="15.4" cy="5.4" r="2.2" fill="#e0483c" stroke="#2a2a30" strokeWidth="1.1" />
          <path d="M14 7.4l-3.4 3.4M16.8 7.6l1.6 3.8" stroke="#e0483c" strokeWidth="1.9" {...SJ} />
        </svg>
        {/* the bar is left quivering on its pegs at the far end */}
        <span className="g18-tmp-bar absolute block" style={st({ ...d(delayMs, 480), ...at(0.3, 3, 1, -0.5), background: "#e0483c" })} />
        {/* settle: chalk off the grip, drifting away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 650), ...box(3.2, 2, 0.8, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.55), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   22. Dressage (t3) — the capriole, the air above the ground. The halt, the
   coil, then all four feet leave together and the hind legs strike out at the
   top. He lands on the square he left, and the diagonal steps light up.
   Palette: #cbb894 / #fff3d2 / #2c2418.
   ========================================================================== */
const STEPS = [0, 1, 2, 3];

function Capriole({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "76%", height: "4%", width: "80%", background: "#2c2418" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "62%", height: "60%" })}>
          <path d="M4 17c0-5.4 3-9 7.6-9.6L14.4 4l1.8 3.2 3.4 1.2-1.8 3.2c0.4 3.6-1.4 6-3.8 7" fill="#cbb894" stroke="#2c2418" strokeWidth="1.3" />
          <path d="M4.4 17.6l-3 3.4M8 18.6l-2.6 3" stroke="#fff3d2" strokeWidth="1.7" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "60%", width: "32%", height: "18%", borderRadius: "50%", background: "radial-gradient(circle, #fff3d2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "74%", height: "6%", width: "84%", background: "#cbb894" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M4 18c0-5.6 3-9.4 7.6-10L14.4 4l1.8 3.4 3.4 1.2-1.8 3.2c0.4 3.8-1.4 6.4-3.8 7.4" fill="#cbb894" stroke="#2c2418" strokeWidth="1.4" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "28%", top: "28%", width: "44%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, #fff3d2, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(203,184,148,0.3), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the halt. Everything gathers back over the hocks */}
      <span className="g18-crouch absolute block" style={st({ ...d(delayMs, 130), ...box(2, 1, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(44,36,24,0.85), transparent 74%)" })} />
      {/* strike: all four feet leave at once and the hind legs strike out */}
      <svg viewBox="0 0 24 24" className="g18-drs-capriole absolute block" style={st({ ...d(delayMs, 280), ...box(2.6, 2.6, 0, -0.4), filter: "drop-shadow(0 0 5px rgba(203,184,148,0.7))" })}>
        <path d="M3.4 15.4c0.6-5.4 4-8.6 8.6-9.2L15 2.4l1.8 3.4 3.6 1.2-2 3.4c0.4 4-1.6 6.4-4 7.2" fill="#cbb894" stroke="#2c2418" strokeWidth="1.3" />
        <path d="M4.6 15.8L0.8 18.8M8 17l-3.6 2.8" stroke="#fff3d2" strokeWidth="1.9" {...SJ} />
      </svg>
      {/* every square the new diagonal step touches lights, in the real order */}
      {STEPS.map((i) => (
        <span key={i} className="g18-tick absolute block" style={st({ ...idx(delayMs, 400 + i * 60, 30), ...box(0.9, 0.9, i - 1.5, i - 1.5), border: "2px solid #fff3d2" })} />
      ))}
      {/* the plaited mane and the tail flick over on the way down */}
      <span className="g18-drs-ribbon absolute block" style={st({ ...d(delayMs, 520), ...box(2.4, 0.22, 0.3, -0.9), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cbb894, #fff3d2)" })} />
      {/* settle: arena sand, kicked away from the caster */}
      <span className="g18-dust absolute block" style={st({ ...d(delayMs, 660), ...box(3.6, 1.8, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.5), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   23. Know Your Place (t3) — the height bar at the door. A bar is set at the
   height of a rook, the leap tops out politely underneath it, the bar says no,
   and exactly one of them is waved through before it holds for good.
   Palette: #a83f52 / #ffe9cf / #2a1219.
   ========================================================================== */
function HeightBar({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "30%", height: "5%", width: "84%", background: "#a83f52" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "26%", width: "58%", height: "56%" })}>
          <path d="M12 21V9.6" stroke="#ffe9cf" strokeWidth="2.4" {...SJ} />
          <path d="M6.6 9.6h10.8l-1.4-4H8z" fill="#a83f52" stroke="#2a1219" strokeWidth="1.3" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "50%", width: "32%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #ffe9cf, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "26%", height: "7%", width: "92%", background: "#a83f52" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "24%", width: "60%", height: "56%" })}>
          <path d="M5 6h14M5 6l3.4 4M19 6l-3.4 4" stroke="#a83f52" strokeWidth="2.4" {...SJ} />
          <path d="M8.4 10h7.2v9H8.4z" fill="#ffe9cf" stroke="#2a1219" strokeWidth="1.3" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "34%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #ffe9cf, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(168,63,82,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the bar goes up at exactly the height of the rank above */}
        <span className="g18-kyp-bar absolute block" style={st({ ...d(delayMs, 130), ...at(0.34, 3.2, 0.8), background: "linear-gradient(180deg, #ffe9cf, #a83f52)" })} />
        {/* strike: the leap tops out very politely underneath it */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 290), ...box(1.2, 1.2, 0, -0.2), filter: "drop-shadow(0 0 4px rgba(168,63,82,0.7))" })}>
          <path d="M4.4 20c0-5.6 3-9.4 7.6-10l2.6-3.8 1.8 3.2 3.2 1.2-1.8 3.2c0.4 3.8-1.4 6.2-3.8 6.2" fill="#a83f52" stroke="#2a1219" strokeWidth="1.3" />
        </svg>
        {/* the bar rings and the answer is no */}
        <span className="g18-kyp-deny absolute block" style={st({ ...d(delayMs, 400), ...at(2, 0.34, 0.8, -1.2), borderRadius: "999px", background: "#ffe9cf" })} />
        {/* one of them is waved through, once, before it holds for good */}
        <span className="g18-kyp-slip absolute block" style={st({ ...d(delayMs, 500), ...at(1.2, 1.2, 1, -0.4), borderRadius: "50%", background: "radial-gradient(circle, #ffe9cf, transparent 68%)" })} />
        {/* settle: velvet dust off the stanchion, away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 650), ...box(3, 1.8, 0.6, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,207,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   24. Plumed Helmets (t3) — the leap that stalls. The plume is fitted, the
   take-off is honest enough, and then all that feather catches the air: the
   arc gives up at two thirds and the whole parade drifts down feather-slow.
   Palette: #8f7fd4 / #fff2d8 / #2a2340.
   ========================================================================== */
function PlumeStall({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "76%", height: "4%", width: "80%", background: "#2a2340" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "14%", width: "60%", height: "62%" })}>
          <path d="M7 21v-6.4C7 11 9.2 9 12 9s5 2 5 5.6V21z" fill="#8f7fd4" stroke="#2a2340" strokeWidth="1.4" />
          <path d="M12 9C12 5 15 2 20 1.6c-1 4-3.4 6.4-8 7.4z" fill="#fff2d8" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "40%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, #fff2d8, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "72%", height: "6%", width: "84%", background: "#8f7fd4" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "16%", width: "60%", height: "64%" })}>
          <path d="M7.4 21v-6.6c0-3.6 2-5.8 4.6-5.8s4.6 2.2 4.6 5.8V21z" fill="#8f7fd4" stroke="#2a2340" strokeWidth="1.4" />
          <path d="M12 8.6C12.4 4.4 15.6 1.6 21 1c-1.4 4.4-4.4 7-9 7.6z" fill="#fff2d8" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff2d8, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(143,127,212,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the ceremonial plume is fitted, and it is enormous */}
        <svg viewBox="0 0 24 24" className="g18-plm-fit absolute block" style={st({ ...d(delayMs, 130), ...box(2, 2, -0.4, -0.5) })}>
          <path d="M7 21v-6.4C7 11 9.2 8.8 12 8.8s5 2.2 5 5.8V21z" fill="#8f7fd4" stroke="#2a2340" strokeWidth="1.4" />
          <path d="M12 8.8C12 4.2 15.6 1 21.4 0.6c-1.4 5-4.8 7.8-9.4 8.2z" fill="#fff2d8" />
        </svg>
        {/* strike: the take-off is honest enough while it lasts */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 280), ...box(1.3, 1.3, 0, -0.3), filter: "drop-shadow(0 0 4px rgba(143,127,212,0.7))" })}>
          <path d="M4.6 20c0-5.6 3-9.4 7.6-10l2.6-3.8 1.8 3.2 3.2 1.2-1.8 3.2c0.4 3.8-1.4 6.2-3.8 6.2" fill="#8f7fd4" stroke="#2a2340" strokeWidth="1.3" />
        </svg>
        {/* then the feather catches the air and the arc gives up on itself */}
        <span className="g18-plm-stall absolute block" style={st({ ...d(delayMs, 380), ...at(2.4, 1.6, 0.66, -0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,216,0.75), transparent 70%)" })} />
        {/* and everybody comes down feather-slow, well short */}
        <span className="g18-plm-drift absolute block" style={st({ ...d(delayMs, 500), ...at(0.9, 2.2, 0.7, 0.2), borderRadius: "999px", background: "linear-gradient(180deg, #fff2d8, rgba(143,127,212,0.2))" })} />
        {/* settle: loose barbs, drifting away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 660), ...box(3.4, 2.2, 0.4, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(143,127,212,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   25. Frog Prince (t3) — the crown comes off first. A lily pad dips under the
   weight, one diagonal hop of exactly one square, a ring on the water, and the
   crown is left floating where a knight used to be.
   Palette: #7fd06a / #fff3cf / #17301a.
   ========================================================================== */
function FrogHop({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "12%", top: "74%", height: "5%", width: "76%", background: "#17301a" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "60%", height: "52%" })}>
          <path d="M4 17c0-4.4 3.6-7.4 8-7.4s8 3 8 7.4z" fill="#7fd06a" stroke="#17301a" strokeWidth="1.4" />
          <circle cx="8.6" cy="9" r="2.2" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
          <circle cx="15.4" cy="9" r="2.2" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
        </svg>
        <svg viewBox="0 0 24 24" className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "12%", width: "32%", height: "32%" })}>
          <path d="M4 18V8l4 4 4-6 4 6 4-4v10z" fill="#fff3cf" stroke="#17301a" strokeWidth="1.4" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "72%", height: "6%", width: "84%", background: "#7fd06a" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <path d="M3.4 18c0-4.6 3.8-8 8.6-8s8.6 3.4 8.6 8z" fill="#7fd06a" stroke="#17301a" strokeWidth="1.4" />
          <circle cx="8.4" cy="9.4" r="2.3" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
          <circle cx="15.6" cy="9.4" r="2.3" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "28%", top: "30%", width: "44%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff3cf, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(127,208,106,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the crown slides off a head that is the wrong shape now */}
        <svg viewBox="0 0 24 24" className="g18-frg-crown absolute block" style={st({ ...d(delayMs, 130), ...box(1.4, 1.4, -0.3, -0.8) })}>
          <path d="M3 19V7l4.5 4.4L12 4l4.5 7.4L21 7v12z" fill="#fff3cf" stroke="#17301a" strokeWidth="1.5" />
        </svg>
        {/* the pad dips under a weight that is suddenly all in one corner */}
        <span className="g18-frg-pad absolute block" style={st({ ...d(delayMs, 220), ...box(2.2, 1.2, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, #7fd06a 40%, rgba(23,48,26,0.7) 78%, transparent)" })} />
        {/* strike: one square, on the diagonal, and that is the whole trick */}
        <svg viewBox="0 0 24 24" className="g18-arc absolute block" style={st({ ...d(delayMs, 320), ...box(1.3, 1.3, 0, -0.2), filter: "drop-shadow(0 0 4px rgba(127,208,106,0.7))" })}>
          <path d="M3 17.6c0-4.8 4-8.4 9-8.4s9 3.6 9 8.4z" fill="#7fd06a" stroke="#17301a" strokeWidth="1.3" />
          <circle cx="8.4" cy="8.6" r="2.2" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
          <circle cx="15.6" cy="8.6" r="2.2" fill="#fff3cf" stroke="#17301a" strokeWidth="1.1" />
        </svg>
        {/* one ring on the water where he was */}
        <span className="g18-ring absolute block" style={st({ ...d(delayMs, 450), ...box(2.4, 1.4, 0, 0.4), borderRadius: "50%", border: "2px solid #fff3cf" })} />
        {/* settle: duckweed closing over, drifting away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 640), ...box(3.2, 1.8, 0.4, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,207,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   26. Knight Court (t3) — the move written out properly. The court measures
   the long leg first, marks the corner, then measures the short leg across it:
   TWO movements and a turn, never one convenient curve.
   Palette: #d9c48e / #fff4d6 / #2b2718.
   ========================================================================== */
function KnightL({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "12%", top: "70%", height: "5%", width: "60%", background: "#d9c48e" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 210), left: "22%", top: "18%", width: "56%", height: "56%" })}>
          <path d="M4 20h12V4" fill="none" stroke="#fff4d6" strokeWidth="2.8" {...SJ} />
          <path d="M16 2.4l3 4.4h-6z" fill="#d9c48e" stroke="#2b2718" strokeWidth="1.2" />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "58%", top: "16%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "72%", height: "6%", width: "56%", background: "#d9c48e" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "60%" })}>
          <path d="M3 20h13V5" fill="none" stroke="#d9c48e" strokeWidth="3" {...SJ} />
          <path d="M16 3l3.4 4.6h-6.8z" fill="#fff4d6" stroke="#2b2718" strokeWidth="1.2" />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "26%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(217,196,142,0.3), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the court's rule is laid along the line before anyone moves */}
        <span className="g18-chalk absolute block" style={st({ ...d(delayMs, 120), ...lane(0.1, 0), background: "repeating-linear-gradient(90deg, #fff4d6 0 6px, transparent 6px 12px)" })} />
        {/* MOVEMENT ONE: the long leg, measured out and stopped */}
        <span className="g18-crt-leg1 absolute block" style={st({ ...d(delayMs, 260), ...lane(0.34, 0, 0.86), background: "linear-gradient(90deg, #2b2718, #d9c48e)" })} />
        {/* THE TURN: the corner is marked. Nothing is curved here */}
        <span className="g18-crt-turn absolute block" style={st({ ...d(delayMs, 380), ...at(0.7, 0.7, 0.86), border: "3px solid #fff4d6" })} />
        {/* MOVEMENT TWO: the short leg, across the first at a right angle */}
        <span className="g18-crt-leg2 absolute block" style={st({ ...d(delayMs, 450), ...at(0.3, 1.5, 0.86, -0.75), background: "linear-gradient(180deg, #fff4d6, #d9c48e)" })} />
        {/* the piece is set down on the far square, and not before */}
        <svg viewBox="0 0 24 24" className="g18-land absolute block" style={st({ ...d(delayMs, 560), ...at(1.5, 1.5, 1, -0.9) })}>
          <path d="M6 20v-3.6c0-4.4 2.6-7.4 6.6-8.2L15 4.6l1.8 3.2 3.2 1.2-1.8 3.2c0.4 4.4-1.6 7.8-4.6 7.8z" fill="#d9c48e" stroke="#2b2718" strokeWidth="1.4" />
        </svg>
        {/* settle: chalk dust off the rule, drifting away from the caster */}
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 680), ...box(3.2, 1.8, 0.8, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   27. Blunted Horseshoes (t2) — the take-off that slips. The caulkins are worn
   round, the hind foot skates on the stone instead of biting, and the leap
   goes up short and lands nowhere near the line. The shoe spins off.
   Palette: #8a7f6e / #ffeec9 / #241f18.
   ========================================================================== */
function WornShoe({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g18-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "76%", height: "4%", width: "80%", background: "#241f18" })} />
        <svg viewBox="0 0 24 24" className="g18-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "58%" })}>
          <path d="M7 21v-6a5 5 0 0 1 10 0v6h-3v-6a2 2 0 0 0-4 0v6z" fill="#8a7f6e" stroke="#241f18" strokeWidth="1.4" />
          <path d="M8.4 8.6h7.2" stroke="#ffeec9" strokeWidth="1.5" {...SJ} />
        </svg>
        <span className="g18-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "36%", top: "56%", width: "28%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec9, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g18-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "74%", height: "6%", width: "88%", background: "#8a7f6e" })} />
        <svg viewBox="0 0 24 24" className="g18-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <path d="M6.6 21v-6.6a5.4 5.4 0 0 1 10.8 0V21h-3.2v-6.6a2.2 2.2 0 0 0-4.4 0V21z" fill="#8a7f6e" stroke="#241f18" strokeWidth="1.5" />
          <path d="M8 9h8" stroke="#ffeec9" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g18-motes absolute block" style={st({ ...d(delayMs, 400), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec9, transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g18-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(138,127,110,0.32), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the shoe, worn round where it should be sharp */}
        <svg viewBox="0 0 24 24" className="g18-hrs-shoe absolute block" style={st({ ...d(delayMs, 130), ...box(1.6, 1.6, -0.5, 0.2) })}>
          <path d="M6.6 21v-6.6a5.4 5.4 0 0 1 10.8 0V21h-3.2v-6.6a2.2 2.2 0 0 0-4.4 0V21z" fill="#8a7f6e" stroke="#241f18" strokeWidth="1.5" />
          <path d="M8.2 8.4h7.6" stroke="#ffeec9" strokeWidth="1.6" {...SJ} />
        </svg>
        {/* strike: the hind foot skates on the stone instead of biting */}
        <span className="g18-hrs-slip absolute block" style={st({ ...d(delayMs, 280), ...lane(0.26, 0.6, 0.5), background: "linear-gradient(90deg, rgba(255,238,201,0), #ffeec9)" })} />
        {/* so the leap goes up short and comes down nowhere near the line */}
        <svg viewBox="0 0 24 24" className="g18-hrs-short absolute block" style={st({ ...d(delayMs, 380), ...box(1.4, 1.4, 0, -0.3), filter: "drop-shadow(0 0 4px rgba(138,127,110,0.7))" })}>
          <path d="M4 20c0-5.4 3-9 7.6-9.6l2.6-3.8 1.8 3.2 3.2 1.2-1.8 3.2c0.4 3.8-1.4 6.4-3.8 7.8" fill="#8a7f6e" stroke="#241f18" strokeWidth="1.3" />
          <path d="M8 15c2 1.4 4.4 1.6 6.8 0.4" stroke="#ffeec9" strokeWidth="1.4" {...SJ} />
        </svg>
        {/* the shoe comes off and spins away */}
        <span className="g18-hrs-spin absolute block" style={st({ ...d(delayMs, 500), ...box(0.8, 0.8, 0.9, 0.4), borderRadius: "50%", border: "3px solid #ffeec9" })} />
        {/* settle: grit off the stone, thrown away from the caster */}
        <span className="g18-dust absolute block" style={st({ ...d(delayMs, 650), ...box(3.2, 1.8, 0.4, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,201,0.5), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   Registry — scene + config per card id. Every `sound` is an existing
   SigSoundKey, every `source` an existing SigZone (named only where the card's
   own fx motif really is one of them: the four `empower` grants and the three
   `slow` hexes), and every card declares its anchor. Most declare "aim": a
   knight card is about a specific square being reached from a specific square,
   so the leap should cover that real distance in that real direction.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 8 ---
  bn4_founding_of_the_city: S(FurrowLeap, {
    ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation", anchor: "aim",
  }),

  // --- Tier 7 ---
  bn4_dancing_master: S(GrandJete, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "coronation", source: "empower", anchor: "aim",
  }),
  bn4_griffins_brood: S(FledgeLedge, {
    ordering: "radial", staggerMs: 65, victims: ["n", "b"], hasLead: true, sound: "coronation", anchor: "aim",
  }),
  bn4_pocket_cavalry: S(TrapezeCatch, {
    ordering: "line", staggerMs: 55, victims: ["n", "p"], hasLead: true, sound: "gacha", anchor: "aim",
  }),

  // --- Tier 6 ---
  bn4_summer_levy: S(GrasshopperLevy, {
    ordering: "radial", staggerMs: 55, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast",
  }),
  hx4_plush_cavalry: S(PlushFlop, {
    ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "gacha", anchor: "aim",
  }),

  // --- Tier 5 ---
  bn4_falconers_glove: S(FalconBate, {
    ordering: "radial", staggerMs: 55, victims: ["n"], hasLead: true, sound: "blitz", source: "empower", anchor: "aim",
  }),
  bn4_pathfinders: S(StoneSkip, {
    ordering: "line", staggerMs: 50, victims: ["n"], hasLead: true, sound: "blitz", source: "empower", anchor: "aim",
  }),
  bn4_reserve_officer: S(SkiTable, {
    ordering: "line", staggerMs: 55, victims: ["n"], hasLead: true, sound: "gacha", anchor: "aim",
  }),
  bn4_veterans_return: S(SalmonWeir, {
    ordering: "line", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "wheel", anchor: "aim",
  }),
  hx4_ash_veil: S(AshFlea, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "blitz", anchor: "cast",
  }),
  hx4_grooms_leash: S(LungeLine, {
    ordering: "sweep", staggerMs: 55, victims: ["n"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  hx4_honey_spill: S(HoneyPour, {
    ordering: "radial", staggerMs: 70, victims: ["n"], hasLead: true, sound: "siege", anchor: "cast",
  }),
  hx4_paddock_fence: S(WaterJump, {
    ordering: "line", staggerMs: 55, victims: ["n"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  hx4_toy_box: S(StuntRamp, {
    ordering: "line", staggerMs: 50, victims: "all", hasLead: true, sound: "gacha", source: "slow", anchor: "aim",
  }),

  // --- Tier 4 ---
  bn4_beetle_shell: S(ClickBeetle, {
    ordering: "radial", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "blitz", anchor: "cast",
  }),
  bn4_tangled_reins: S(TangledReins, {
    ordering: "sweep", staggerMs: 55, victims: ["n"], hasLead: true, sound: "rampage", source: "slow", anchor: "aim",
  }),
  hx4_reined_back: S(RailVaultBack, {
    ordering: "sweep", staggerMs: 55, victims: ["n"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  hx4_skittish_mounts: S(CatPounce, {
    ordering: "radial", staggerMs: 55, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim",
  }),
  hx4_tin_soldiers: S(TinTip, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "gacha", anchor: "aim",
  }),
  ov_templar_vows: S(PoleVault, {
    ordering: "radial", staggerMs: 55, victims: ["b"], hasLead: true, sound: "coronation", anchor: "aim",
  }),

  // --- Tier 3 ---
  bn4_dressage: S(Capriole, {
    ordering: "octagon", staggerMs: 55, victims: ["n"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }),
  hx4_know_your_place: S(HeightBar, {
    ordering: "line", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  hx4_plumed_helmets: S(PlumeStall, {
    ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation", source: "slow", anchor: "aim",
  }),
  ov_frog_prince: S(FrogHop, {
    ordering: "radial", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "wheel", anchor: "aim",
  }),
  ov_knight_court: S(KnightL, {
    ordering: "line", staggerMs: 55, victims: ["n"], hasLead: true, sound: "coronation", anchor: "aim",
  }),

  // --- Tier 2 ---
  hx4_blunted_horseshoes: S(WornShoe, {
    ordering: "sweep", staggerMs: 55, victims: ["n"], hasLead: true, sound: "rampage", anchor: "aim",
  }),
};
