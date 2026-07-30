// Bespoke plugin signatures for the rook / fortification / line batch
// (g21_rookRampart2). See sigPlugins.tsx for the contract. Self-contained:
// own inline SVG + own g21KeepPlays.css, transform/opacity only, no import
// from BoardEffects.tsx (cycle hazard), only the SigPlugin TYPE imported.
//
// FICTION: THE FORTRESS AS A BUILDING PEOPLE LIVE IN. Its sibling module
// (g20RampartPlays) owns the siege: rams, trenches, booms, ballistae, mines,
// gabions, ladders. Nothing here is siege engineering. Every card is domestic
// or civic life going on INSIDE the walls: a well winch bringing up a bucket,
// a spiral stair whose treads light as someone climbs, shutters thrown open
// along a hall wall, a chimney drawing, the kitchen spit turning, a laundry
// chute, a dovecote's nest boxes, a lock plate changed, a key filed at the
// vise, tally sticks split in the guild counting house, the trestles reset
// after dinner, gold leaf laid on a door ring.
//
// STAGING. Seven of the 24 cards run along a rank or file, so they stage in
// <AimStage> with the art authored pointing RIGHT (+x) and travel the REAL
// distance with --fx-len: the laundry bundle falls the length of the shaft it
// actually falls down, the curtain rings run the rail as far as the rook
// really goes, the pulley basket crosses to the far window. --fx-index makes
// shutters, hatches, treads, nest boxes and ratchet teeth happen in the real
// victim order, and --fx-side leans every plume of smoke, every falling flake
// and every dropped bar away from (or toward) the caster's own side, so no
// layer ever says "the bottom of the board". Everything meaning THE BOARD
// lives inside <BoardFrame>, never at a fixed percentage of the stage.
//
// Every scene handles all three roles: "lead" (the board-scale flourish on the
// cast square), "target" (the per-square hit) and "entrance" (the card arriving
// in a hand, ~56% of the crop, so no board takeover). Every scene runs
// tell -> strike -> settle. Class prefix `g21-`.

import type { CSSProperties } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import "./g21KeepPlays.css";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** Scene root for the square-local cuts (target + entrance). */
const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** Style escape hatch: scene styles carry CSS custom properties too. */
type Style = CSSProperties & Record<string, unknown>;
const st = (o: Style): CSSProperties => o as CSSProperties;

/** The caller's stagger plus this layer's own beat, in ms. */
const d = (base: number, off: number): CSSProperties => ({ animationDelay: `${base + off}ms` });

/** The caller's stagger, this layer's beat, and the square's own place in the
 *  victim order: hatches, treads and nest boxes happen in the REAL order. */
const dq = (base: number, off: number, step: number): CSSProperties => ({
  animationDelay: `calc(${base + off}ms + var(--fx-index, 0) * 20ms + ${step}ms)`,
});

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS, centred on the cast square (the stage's 50%/50%),
 * optionally offset by `dx`/`dy` cells. Layers sized in cells read at the same
 * real size on every board, and a one-cell box can travel in --fx-len units.
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

/** A `w` x `h` cell box parked at the FAR end of the line, wherever that is. */
const farBox = (w: number, h: number, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 3) * 7.142857% - ${(w / 2) * CELL}%)`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/** Rounded strokes read as household ironwork rather than diagram lines. */
const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* =============================================================================
   1. Guild Insurance (t3) — the masons' guild counting house. A hazel tally
   stick is laid on the bench, notched once per covered rook in the real victim
   order, then split along its length so both halves match: the guild keeps the
   foil, the household keeps the stock.
   Palette: #c9a15a / #fff2d2 / #2a2114.
   ========================================================================== */
const NOTCHES = [0, 1, 2, 3, 4];

function TallySticks({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "70%", height: "5%", width: "84%", background: "#2a2114" })} />
        <svg viewBox="0 0 48 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "34%", width: "84%", height: "34%" })}>
          <rect x="2" y="8" width="44" height="8" fill="#c9a15a" stroke="#2a2114" strokeWidth="1.2" />
          <path d="M9 8v4M17 8v4M25 8v4M33 8v4" stroke="#2a2114" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "18%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #fff2d2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "66%", height: "6%", width: "88%", background: "#c9a15a" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "10%", top: "30%", width: "80%", height: "40%" })}>
          <rect x="1.5" y="9" width="21" height="6" fill="#fff2d2" stroke="#2a2114" strokeWidth="1.2" />
          <path d="M7 9v3.4M13 9v3.4" stroke="#2a2114" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.5, 1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(201,161,90,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the clerk's shadow falls across the bench */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(5.4, 1, 0, 1.4), borderRadius: "999px", background: "#2a2114" })} />
      {/* strike: the stick is laid down */}
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 250), ...box(5.6, 0.9, 0, 0.1), background: "linear-gradient(180deg, #c9a15a, #6b5227)", border: "1px solid #2a2114" })} />
      {/* one notch cut per covered rook, in the real victim order */}
      <svg viewBox="0 0 60 12" className="g21-notch absolute block" style={st({ ...dq(delayMs, 380, 0), ...box(5.6, 0.9, 0, 0.1) })}>
        {NOTCHES.map((i) => (
          <path key={i} d={`M${8 + i * 11} 1l2.6 4.6h-5.2z`} fill="#2a2114" />
        ))}
      </svg>
      {/* the stick splits along its length: foil and stock */}
      <span className="g21-split absolute block" style={st({ ...d(delayMs, 500), ...box(5.6, 0.4, 0, -0.2), "--sy": "-140%", background: "#fff2d2" })} />
      <span className="g21-split absolute block" style={st({ ...d(delayMs, 540), ...box(5.6, 0.4, 0, 0.4), "--sy": "140%", background: "#c9a15a" })} />
      {/* settle: hazel shavings off the bench */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 680), ...box(5, 2.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.45), transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   2. Gate Key (t2) — the wicket, the little door cut into the great gate. The
   ring of keys is lifted off its nail, the wicket swings in, and the lamplight
   behind it falls diagonally across the threshold onto the corner square.
   Palette: #b9902f / #ffeab8 / #241a10.
   ========================================================================== */
function WicketDoor({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "76%", height: "5%", width: "76%", background: "#241a10" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "60%" })}>
          <rect x="3" y="2.5" width="18" height="19" fill="#241a10" stroke="#b9902f" strokeWidth="1.3" />
          <rect x="8" y="8" width="8" height="13.5" fill="#b9902f" stroke="#ffeab8" strokeWidth="1" />
          <circle cx="14.4" cy="15" r="1" fill="#241a10" />
        </svg>
        <svg viewBox="0 0 24 24" className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "58%", top: "8%", width: "30%", height: "30%" })}>
          <circle cx="9" cy="9" r="5" fill="none" stroke="#ffeab8" strokeWidth="2.2" />
          <path d="M12.6 12.6L21 21M18 18l2.6-2.6M20.4 20.4l2-2" stroke="#b9902f" strokeWidth="2.2" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "72%", height: "8%", width: "84%", background: "#b9902f" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "18%", width: "48%", height: "62%" })}>
          <rect x="4" y="2" width="16" height="20" fill="#241a10" stroke="#ffeab8" strokeWidth="1.3" />
          <circle cx="16.6" cy="12" r="1.3" fill="#b9902f" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.4, -0.4), borderRadius: "50%", background: "#ffeab8" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(185,144,47,0.26), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the doorstep shadow, right where someone is about to stand */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(4.2, 0.9, 0, 1.8), borderRadius: "999px", background: "#241a10" })} />
      {/* strike: the ring of keys comes off its nail and swings */}
      <svg viewBox="0 0 24 24" className="g21-keyring absolute block" style={st({ ...d(delayMs, 240), ...box(1.7, 1.7, -2.1, -1.5) })}>
        <circle cx="9" cy="9" r="5.4" fill="none" stroke="#b9902f" strokeWidth="2.4" />
        <path d="M13 13l8 8M18.4 18.4l2.4-2.4" stroke="#ffeab8" strokeWidth="2.2" {...SJ} />
      </svg>
      {/* the great gate, with the wicket cut into it */}
      <span className="g21-raise absolute block" style={st({ ...d(delayMs, 320), ...box(4, 4, 0, 0.2), background: "linear-gradient(90deg, #241a10, #4a3618 55%, #241a10)", border: `${cells(0.14)} solid #b9902f` })} />
      {/* the wicket swings in on its hinge */}
      <span className="g21-wicket absolute block" style={st({ ...d(delayMs, 430), ...box(1.5, 2.4, -0.5, 0.6), background: "#241a10", border: "1px solid #ffeab8" })} />
      {/* lamplight falls diagonally out across the threshold */}
      <span className="g21-spill absolute block" style={st({ ...d(delayMs, 540), ...box(2.6, 2.6, 1.1, 1.4), background: "linear-gradient(135deg, rgba(255,234,184,0.75), transparent 72%)" })} />
      {/* settle: motes turning over in the doorway light */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 680), ...box(3, 2.2, 1, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,234,184,0.5), transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   3. Cold Barracks (t2) — the fire in the men's hall goes out. The flames sink,
   the curfew cover is clamped down over what is left of the embers, frost ferns
   run out across the hearthstone, and the room breathes fog.
   Palette: #7f8fa6 / #ffeccb / #16202c.
   ========================================================================== */
const FERNS = [0, 1, 2, 3];

function DeadHearth({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "74%", height: "6%", width: "80%", background: "#16202c" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <path d="M2 21V8a10 6 0 0 1 20 0v13z" fill="#16202c" stroke="#7f8fa6" strokeWidth="1.3" {...SJ} />
          <path d="M12 19c-2.4 0-4-1.6-4-3.4 0-2 2-2.6 2.4-4.6.8 1 3.6 2.2 3.6 4.6 0 1-0.6 1.4-0.6 1.4s2.6-0.6 2.6 2c0 1.4-1.6 2-4 2z" fill="#ffeccb" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "22%", width: "40%", height: "34%", borderRadius: "50%", background: "radial-gradient(circle, rgba(127,143,166,0.75), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "8%", width: "88%", background: "#7f8fa6" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "26%", width: "56%", height: "52%" })}>
          <path d="M2.5 20a9.5 6 0 0 1 19 0z" fill="#16202c" stroke="#7f8fa6" strokeWidth="1.3" {...SJ} />
          <path d="M8 20c0-2.6 1.8-3.4 2.4-5.6 1.2 1.6 3.6 2.4 3.6 5.6z" fill="#ffeccb" opacity="0.7" />
        </svg>
        <span className="g21-smoke absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.5, 0, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,203,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(22,32,44,0.5), rgba(127,143,166,0.1) 72%)" })} />
      </BoardFrame>
      {/* tell: the firelight pool on the floor shrinks in */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(5, 2, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,203,0.6), transparent 72%)" })} />
      {/* strike: the hearth arch, and the flame sinking inside it */}
      <svg viewBox="0 0 24 24" className="g21-raise absolute block" style={st({ ...d(delayMs, 250), ...box(4.6, 3.6, 0, 0.2) })}>
        <path d="M1.5 22V9.5A10.5 7 0 0 1 22.5 9.5V22z" fill="#16202c" stroke="#7f8fa6" strokeWidth="1.4" {...SJ} />
      </svg>
      <svg viewBox="0 0 24 24" className="g21-emberdie absolute block" style={st({ ...d(delayMs, 360), ...box(1.9, 2, 0, 0.7) })}>
        <path d="M12 21c-3 0-5-2-5-4.4 0-2.6 2.6-3.4 3.2-6 1 1.4 4.4 3 4.4 6 0 1.2-0.7 1.7-0.7 1.7s3.1-0.7 3.1 2.4c0 1.4-2 2.3-5 2.3z" fill="#ffeccb" />
      </svg>
      {/* the curfew cover is clamped down over what is left */}
      <svg viewBox="0 0 24 12" className="g21-curfew absolute block" style={st({ ...d(delayMs, 470), ...box(2.8, 1.5, 0, 0.3) })}>
        <path d="M1 11a11 9.4 0 0 1 22 0z" fill="#7f8fa6" stroke="#16202c" strokeWidth="1.4" {...SJ} />
        <path d="M12 1.6V0.2" stroke="#16202c" strokeWidth="1.6" {...SJ} />
      </svg>
      {/* frost ferns run out across the cold hearthstone, in victim order */}
      <svg viewBox="0 0 48 12" className="g21-frost absolute block" style={st({ ...dq(delayMs, 560, 0), ...box(5.2, 1.3, 0, 1.6) })}>
        {FERNS.map((i) => (
          <path key={i} d={`M${6 + i * 12} 11V3M${6 + i * 12} 7l-3-2.4M${6 + i * 12} 7l3-2.4M${6 + i * 12} 4.6l-2.2-2`} stroke="#7f8fa6" strokeWidth="1.1" fill="none" {...SJ} />
        ))}
      </svg>
      {/* settle: the room's own breath, drifting off the caster's side */}
      <span className="g21-smoke absolute block" style={st({ ...d(delayMs, 700), left: `${50 - 2.4 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -14%)", width: cells(4.8), height: cells(2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,203,0.4), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   4. Muddy Moat (t2) — the scullery drain. The sink spout runs, the grate at
   the bottom of the yard chokes on it, the floor goes under, and the duckboards
   float off in the middle of the centre files.
   Palette: #6b7a4a / #f4e9c4 / #1b1a10.
   ========================================================================== */
const BOARDS = [0, 1, 2];

function SculleryDrain({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "72%", height: "9%", width: "80%", background: "#1b1a10" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "20%", width: "52%", height: "52%" })}>
          <rect x="3" y="10" width="18" height="11" fill="#6b7a4a" stroke="#1b1a10" strokeWidth="1.2" />
          <path d="M7 10V6h10v4M7 13h10M7 16h10M7 19h10" stroke="#1b1a10" strokeWidth="1.1" fill="none" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "56%", width: "40%", height: "20%", borderRadius: "999px", background: "radial-gradient(circle, #f4e9c4, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "60%", height: "14%", width: "92%", background: "#1b1a10" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "26%", width: "64%", height: "48%" })}>
          <rect x="2" y="6" width="20" height="12" fill="#1b1a10" stroke="#6b7a4a" strokeWidth="1.3" />
          <path d="M2 10h20M2 14h20M8 6v12M16 6v12" stroke="#6b7a4a" strokeWidth="1.1" {...SJ} />
        </svg>
        <span className="g21-slop absolute block" style={st({ ...d(delayMs, 400), ...box(2.4, 1.3, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(107,122,74,0.7), transparent 74%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(107,122,74,0.3), transparent 66%)" })} />
      </BoardFrame>
      {/* tell: the wet patch under the spout, spreading before anything spills */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(3.4, 1.2, 0, 1.5), borderRadius: "50%", background: "#1b1a10" })} />
      {/* strike: the spout runs */}
      <span className="g21-pour absolute block" style={st({ ...d(delayMs, 240), ...box(0.5, 3, -1.4, -0.4), background: "linear-gradient(180deg, #f4e9c4, rgba(107,122,74,0.2))" })} />
      {/* the yard grate chokes on it */}
      <svg viewBox="0 0 24 16" className="g21-grate absolute block" style={st({ ...d(delayMs, 350), ...box(3.2, 2, 0.4, 1) })}>
        <rect x="1" y="1" width="22" height="14" fill="#1b1a10" stroke="#6b7a4a" strokeWidth="1.4" />
        <path d="M1 6h22M1 11h22M8 1v14M16 1v14" stroke="#6b7a4a" strokeWidth="1.1" {...SJ} />
      </svg>
      {/* the floor goes under, the soup leaning off the caster's own side */}
      <span className="g21-slop absolute block" style={st({ ...d(delayMs, 460), left: `${50 - 3 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * 3.5%)", width: cells(6), height: cells(3), borderRadius: "50%", background: "radial-gradient(circle, rgba(107,122,74,0.65), transparent 74%)" })} />
      {/* the duckboards float off one after another */}
      {BOARDS.map((i) => (
        <span
          key={i}
          className="g21-float absolute block"
          style={st({ ...dq(delayMs, 560, i * 70), ...box(1.6, 0.35, i * 1.5 - 1.4, 1.3), "--sx": `${(i - 1) * 90}%`, background: "#f4e9c4" })}
        />
      ))}
      {/* settle: the bubbles that come up after */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 690), ...box(4.4, 2, 0.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(244,233,196,0.45), transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   5. Slow Clap (t2) — the minstrels' gallery over the great hall. The rail
   runs the length of the line, the household leans on it, and the hands come
   together one pair at a time in the real victim order. Somebody drops a glove.
   Palette: #d0a24a / #fff2d0 / #2b1e2c.
   ========================================================================== */
const CLAPS = [0, 1, 2, 3];

function GalleryClap({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "62%", height: "6%", width: "88%", background: "#2b1e2c" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "22%", width: "56%", height: "44%" })}>
          <path d="M4 20V11c0-2 1.4-3 2.6-3S9 9 9 11v3" fill="none" stroke="#d0a24a" strokeWidth="2.4" {...SJ} />
          <path d="M20 20V11c0-2-1.4-3-2.6-3S15 9 15 11v3" fill="none" stroke="#fff2d0" strokeWidth="2.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "18%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #fff2d0, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "58%", height: "8%", width: "92%", background: "#d0a24a" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "64%", height: "52%" })}>
          <path d="M6 19V10c0-1.8 1.2-2.8 2.4-2.8S11 8.2 11 10v3.6" fill="none" stroke="#fff2d0" strokeWidth="2.6" {...SJ} />
          <path d="M18 19V10c0-1.8-1.2-2.8-2.4-2.8S13 8.2 13 10v3.6" fill="none" stroke="#d0a24a" strokeWidth="2.6" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.2, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,208,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(208,162,74,0.24), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the gallery rail scribed the whole length of the hall */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.16, -0.9), background: "#fff2d0" })} />
        {/* strike: the rail and its balusters */}
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 230), ...lane(0.5, -0.7), background: "linear-gradient(180deg, #d0a24a, #6b4f22)", border: "1px solid #2b1e2c" })} />
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 290), ...lane(1.1, 0.2), background: "repeating-linear-gradient(90deg, #2b1e2c 0 22%, transparent 22% 50%)" })} />
        {/* the hands come together, one pair at a time, in the real order */}
        {CLAPS.map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="g21-clap absolute block"
            style={st({ ...dq(delayMs, 400, i * 110), ...box(1.5, 1.5, i * 1.3 + 0.7, -1.5) })}
          >
            <path d="M7 20V9.5C7 8 8 7 9.2 7s2 1 2 2.5V14" fill="none" stroke="#fff2d0" strokeWidth="2.6" {...SJ} />
            <path d="M17 20V9.5C17 8 16 7 14.8 7s-2 1-2 2.5V14" fill="none" stroke="#d0a24a" strokeWidth="2.6" {...SJ} />
          </svg>
        ))}
        {/* settle: somebody drops a glove over the rail */}
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 640), ...box(0.5, 0.7, 1.9, 0.4), borderRadius: "1px", background: "#d0a24a" })} />
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 700), ...box(4.6, 2, 2, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,208,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   6. New Locks (t2) — the locksmith comes after the household moves in. The
   old escutcheon is lifted off, the new plate is set on the marked holes, the
   wards drop into the keyhole one by one, and the bolt shoots home.
   Palette: #9fb0c4 / #ffeec6 / #1a1f28.
   ========================================================================== */
const WARDS = [0, 1, 2];

function NewLockPlate({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "76%", height: "5%", width: "76%", background: "#1a1f28" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "64%" })}>
          <rect x="3" y="2" width="18" height="20" fill="#9fb0c4" stroke="#1a1f28" strokeWidth="1.4" />
          <circle cx="12" cy="10" r="2.6" fill="#1a1f28" />
          <path d="M12 12.4V17" stroke="#1a1f28" strokeWidth="2.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "32%", top: "20%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,198,0.8), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "50%", height: "9%", width: "88%", background: "#9fb0c4" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "62%" })}>
          <rect x="4" y="3" width="16" height="18" fill="#ffeec6" stroke="#1a1f28" strokeWidth="1.4" />
          <circle cx="12" cy="10.5" r="2.4" fill="#1a1f28" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.5, -0.6), borderRadius: "50%", background: "#ffeec6" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(159,176,196,0.26), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the four screw holes are pricked out first */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.2, 3.2, 0, 0.2), border: `${cells(0.12)} dashed #1a1f28` })} />
      {/* strike: the old plate is lifted away and dropped */}
      <span className="g21-plateoff absolute block" style={st({ ...d(delayMs, 240), ...box(2.6, 3, -0.2, 0.1), background: "linear-gradient(180deg, #4a5464, #1a1f28)", border: "1px solid #9fb0c4" })} />
      {/* the new escutcheon goes on */}
      <svg viewBox="0 0 24 24" className="g21-drop absolute block" style={st({ ...d(delayMs, 380), ...box(2.8, 3.2, 0, 0.1) })}>
        <rect x="2.5" y="1.5" width="19" height="21" fill="#9fb0c4" stroke="#1a1f28" strokeWidth="1.5" />
        <circle cx="12" cy="9.5" r="2.8" fill="#1a1f28" />
        <path d="M12 12V17.5" stroke="#1a1f28" strokeWidth="2.6" {...SJ} />
      </svg>
      {/* the wards drop into the keyway, one after another */}
      {WARDS.map((i) => (
        <span key={i} className="g21-tick absolute block" style={st({ ...dq(delayMs, 490, i * 70), ...box(0.4, 0.8, i * 0.55 - 0.55, -0.5), background: "#ffeec6" })} />
      ))}
      {/* the bolt shoots home across the jamb, away from the caster's side */}
      <span className="g21-boltshoot absolute block" style={st({ ...d(delayMs, 580), ...box(2.4, 0.5, 1.4, 0.9), background: "linear-gradient(90deg, #9fb0c4, #ffeec6)", border: "1px solid #1a1f28" })} />
      {/* settle: bright filings off the new brass */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 680), ...box(3.6, 2, 0.4, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,198,0.45), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   7. Siege Wagon (t2) — not a wagon at all: the laundry chute. A bundle is
   posted in at the top, falls the REAL length of the shaft past every closed
   floor hatch between, and thumps into the basket at the bottom.
   Palette: #cfd8e0 / #fff4d6 / #23282e.
   ========================================================================== */
const HATCHES = [0, 1, 2];

function LaundryChute({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "14%", top: "78%", height: "5%", width: "72%", background: "#23282e" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "60%" })}>
          <path d="M5 2h14v6l-4 3v11H9V11L5 8z" fill="#23282e" stroke="#cfd8e0" strokeWidth="1.3" {...SJ} />
          <path d="M9 12.6c2 1.4 4 1.4 6 0" stroke="#fff4d6" strokeWidth="1.4" fill="none" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "56%", width: "28%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "9%", width: "88%", background: "#cfd8e0" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "20%", width: "52%", height: "58%" })}>
          <path d="M4 8a8 6 0 0 1 16 0c0 4-2 6-8 6S4 12 4 8z" fill="#fff4d6" stroke="#23282e" strokeWidth="1.3" {...SJ} />
          <path d="M7 8.4c2.4 2 7 2 10 0" stroke="#23282e" strokeWidth="1.1" fill="none" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.3, 0, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(207,216,224,0.22), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the draught down the empty shaft */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.16), background: "#fff4d6" })} />
        {/* strike: the shaft itself, the real length of the drop */}
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 230), ...lane(1.6), background: "linear-gradient(180deg, #23282e, #454e57 45%, #23282e)", border: "1px solid #cfd8e0" })} />
        {/* the floor hatches it passes without stopping */}
        {HATCHES.map((i) => (
          <span key={i} className="g21-tick absolute block" style={st({ ...dq(delayMs, 330, i * 60), ...box(0.24, 1.6, i * 1.3 + 1, 0), background: "#cfd8e0" })} />
        ))}
        {/* the bundle falls the whole real distance */}
        <svg viewBox="0 0 24 24" className="g21-run absolute block" style={st({ ...d(delayMs, 420), ...box(1, 1, 0.3, 0) })}>
          <path d="M3 9a9 7 0 0 1 18 0c0 4.6-2.4 7-9 7S3 13.6 3 9z" fill="#fff4d6" stroke="#23282e" strokeWidth="1.4" {...SJ} />
          <path d="M6.4 9.4c3 2.2 8.2 2.2 11.2 0" stroke="#23282e" strokeWidth="1.2" fill="none" {...SJ} />
        </svg>
        {/* the basket takes it at the bottom of the run */}
        <svg viewBox="0 0 24 16" className="g21-basket absolute block" style={st({ ...d(delayMs, 560), ...farBox(2.2, 1.6, 0.8) })}>
          <path d="M2 3h20l-2.6 12H4.6z" fill="#23282e" stroke="#cfd8e0" strokeWidth="1.4" {...SJ} />
          <path d="M4 7h16M5 11h14" stroke="#cfd8e0" strokeWidth="1" {...SJ} />
        </svg>
        {/* settle: lint turning over in the shaft light */}
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 680), ...box(4.6, 2.2, 2, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   8. Tower Warden (t2) — the porter's lodge. Three knocks on the boards, the
   judas hatch slides across, the warden's lamp fills it, then the hatch snaps
   shut and the drawbar drops into its keeper.
   Palette: #8a6a3c / #ffe2a8 / #191410.
   ========================================================================== */
function JudasHatch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "78%", height: "5%", width: "76%", background: "#191410" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "16%", width: "56%", height: "64%" })}>
          <rect x="2.5" y="2" width="19" height="20" fill="#8a6a3c" stroke="#191410" strokeWidth="1.3" />
          <rect x="7" y="7" width="10" height="5" fill="#191410" />
          <path d="M2.5 17h19" stroke="#191410" strokeWidth="2" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "26%", width: "28%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, #ffe2a8, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "68%", height: "8%", width: "88%", background: "#8a6a3c" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "56%" })}>
          <rect x="2" y="4" width="20" height="16" fill="#191410" stroke="#8a6a3c" strokeWidth="1.4" />
          <ellipse cx="12" cy="12" rx="5" ry="3" fill="#ffe2a8" />
          <circle cx="12" cy="12" r="1.3" fill="#191410" />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,168,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(138,106,60,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: three knocks land on the boards before anything opens */}
      <span className="g21-knock absolute block" style={st({ ...d(delayMs, 110), ...box(2, 2, 0, -0.4), borderRadius: "50%", border: `${cells(0.14)} solid #ffe2a8` })} />
      {/* strike: the lodge door */}
      <span className="g21-raise absolute block" style={st({ ...d(delayMs, 250), ...box(4.2, 4, 0, 0.2), background: "repeating-linear-gradient(90deg, #8a6a3c 0 14%, #5c4526 14% 16%)", border: `${cells(0.16)} solid #191410` })} />
      {/* the judas hatch slides across */}
      <span className="g21-hatch absolute block" style={st({ ...d(delayMs, 360), ...box(1.8, 1, -0.1, -0.5), background: "#191410", border: "1px solid #ffe2a8" })} />
      {/* the warden's lamp fills the opening */}
      <span className="g21-lamplight absolute block" style={st({ ...d(delayMs, 450), ...box(1.4, 0.8, 0.2, -0.5), borderRadius: "999px", background: "radial-gradient(circle, #ffe2a8, transparent 72%)" })} />
      {/* the drawbar drops into its keeper, on the caster's own side */}
      <span className="g21-bardrop absolute block" style={st({ ...d(delayMs, 560), ...box(4.6, 0.55, 0, 0.9), background: "linear-gradient(180deg, #8a6a3c, #191410)", border: "1px solid #ffe2a8" })} />
      {/* settle: dust knocked out of the old boards */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 690), ...box(4.4, 2.2, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,168,0.42), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   9. Chariot Lessons (t2) — the undercroft, where the household's wheelwright
   works. The wheel is offered up to the axle stub, the linchpin is driven, and
   the whole thing is spun once to see it run true.
   Palette: #a8763c / #ffe6b4 / #1e1409.
   ========================================================================== */
function Wheelwright({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "76%", height: "5%", width: "80%", background: "#1e1409" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "56%" })}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="#a8763c" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="2.4" fill="#ffe6b4" />
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2" stroke="#a8763c" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "34%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #ffe6b4, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "74%", height: "7%", width: "88%", background: "#a8763c" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="#ffe6b4" strokeWidth="2.6" />
          <path d="M12 3.4v17.2M3.4 12h17.2" stroke="#a8763c" strokeWidth="1.6" {...SJ} />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2), borderRadius: "50%", background: "#ffe6b4" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(168,118,60,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the axle stub's shadow on the undercroft floor */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(4.6, 1, 0, 1.6), borderRadius: "999px", background: "#1e1409" })} />
      {/* strike: the axle bar, laid across the trestles */}
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 240), ...box(5, 0.4, 0, 0.1), borderRadius: "999px", background: "linear-gradient(90deg, #1e1409, #a8763c 40%, #1e1409)" })} />
      {/* the wheel is offered up and slid onto the stub */}
      <svg viewBox="0 0 24 24" className="g21-wheelset absolute block" style={st({ ...d(delayMs, 340), ...box(3.6, 3.6, 0, 0.1) })}>
        <circle cx="12" cy="12" r="10.4" fill="none" stroke="#a8763c" strokeWidth="2.6" />
        <circle cx="12" cy="12" r="2.6" fill="#1e1409" stroke="#ffe6b4" strokeWidth="1.2" />
        <path d="M12 1.6v8M12 14.4v8M1.6 12h8M14.4 12h8" stroke="#a8763c" strokeWidth="1.5" {...SJ} />
      </svg>
      {/* the linchpin is driven through */}
      <span className="g21-tick absolute block" style={st({ ...d(delayMs, 470), ...box(0.34, 1.1, 0, -0.5), background: "#ffe6b4" })} />
      {/* and it is spun once to see it run true */}
      <svg viewBox="0 0 24 24" className="g21-wheelspin absolute block" style={st({ ...d(delayMs, 540), ...box(3, 3, 0, 0.1) })}>
        <path d="M12 2.4v19.2M2.4 12h19.2M5.2 5.2l13.6 13.6M18.8 5.2L5.2 18.8" stroke="#ffe6b4" strokeWidth="1.3" fill="none" {...SJ} />
      </svg>
      {/* settle: cart grease and shavings flung off the rim */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 690), ...box(4.4, 2.2, 0, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,230,180,0.45), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   10. Creaky Axles (t1) — the well in the inner bailey. The handle turns, the
   pawl clacks over the ratchet, and the rope comes up exactly as far as it is
   going to before the drum judders and holds. The bucket never reaches the rim.
   Palette: #6f8ea0 / #ffeeca / #12202a.
   ========================================================================== */
const TEETH = [0, 1, 2, 3];

function WellWinch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "78%", height: "5%", width: "80%", background: "#12202a" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "14%", width: "52%", height: "64%" })}>
          <rect x="3" y="4" width="18" height="4" fill="#6f8ea0" stroke="#12202a" strokeWidth="1.2" />
          <path d="M12 8v7" stroke="#ffeeca" strokeWidth="1.4" {...SJ} />
          <path d="M8 15h8l-1.4 6H9.4z" fill="#12202a" stroke="#6f8ea0" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "60%", width: "32%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #ffeeca, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "40%", height: "8%", width: "84%", background: "#6f8ea0" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "24%", width: "48%", height: "56%" })}>
          <path d="M5 6h14l-2 15H7z" fill="#12202a" stroke="#ffeeca" strokeWidth="1.4" {...SJ} />
          <path d="M5 10h14" stroke="#6f8ea0" strokeWidth="1.4" />
        </svg>
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 400), ...box(0.4, 0.6, 0, 0.9), borderRadius: "50%", background: "#ffeeca" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(111,142,160,0.26), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the black mouth of the shaft opens under the frame */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.4, 1.4, 0, 1.9), borderRadius: "50%", background: "#12202a" })} />
      {/* strike: the winch frame and drum */}
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 240), ...box(4.4, 0.7, 0, -1.6), background: "linear-gradient(180deg, #6f8ea0, #2c4451)", border: "1px solid #12202a" })} />
      {/* the handle cranks round, then catches */}
      <svg viewBox="0 0 24 24" className="g21-crank absolute block" style={st({ ...d(delayMs, 330), ...box(1.8, 1.8, 2, -1.6) })}>
        <circle cx="12" cy="12" r="4.4" fill="#12202a" stroke="#6f8ea0" strokeWidth="1.6" />
        <path d="M12 12l7 4.4M19 16.4l1.6 2.6" stroke="#ffeeca" strokeWidth="2" {...SJ} />
      </svg>
      {/* the pawl clacks over the ratchet teeth, in the real order */}
      {TEETH.map((i) => (
        <span key={i} className="g21-tick absolute block" style={st({ ...dq(delayMs, 400, i * 60), ...box(0.3, 0.5, i * 0.42 - 1.4, -2.2), background: "#ffeeca" })} />
      ))}
      {/* the rope comes up exactly as far as the slide really goes */}
      <span className="g21-hoist absolute block" style={st({ ...d(delayMs, 470), left: `${50 - 0.1 * CELL}%`, top: `${50 - 1.4 * CELL}%`, width: cells(0.2), height: "calc(var(--fx-len, 3) * 7.142857%)", background: "linear-gradient(180deg, #ffeeca, #6f8ea0)" })} />
      {/* the bucket hangs where the rope stopped, and judders */}
      <svg viewBox="0 0 24 24" className="g21-bucket absolute block" style={st({ ...d(delayMs, 580), left: `${50 - 0.7 * CELL}%`, top: "calc(50% - 10% + var(--fx-len, 3) * 7.142857%)", width: cells(1.4), height: cells(1.4) })}>
        <path d="M4 4h16l-2.4 17H6.4z" fill="#12202a" stroke="#6f8ea0" strokeWidth="1.6" {...SJ} />
        <path d="M4 8.6h16" stroke="#ffeeca" strokeWidth="1.4" />
      </svg>
      {/* settle: what slops out of it goes back down the shaft */}
      <span className="g21-drip absolute block" style={st({ ...d(delayMs, 690), ...box(0.42, 0.7, 0.6, 1.6), borderRadius: "50%", background: "#ffeeca" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   11. Second Thoughts (t1) — the newel stair. The treads light one at a time as
   somebody climbs toward the muniment room, the candle stops halfway, and the
   light comes straight back down again.
   Palette: #9a8f7a / #ffeec8 / #1c1a16.
   ========================================================================== */
const TREADS = [0, 1, 2, 3, 4];

function NewelStair({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "78%", height: "5%", width: "80%", background: "#1c1a16" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "20%", width: "56%", height: "58%" })}>
          <path d="M2 22h5v-4h5v-4h5v-4h5" fill="none" stroke="#9a8f7a" strokeWidth="2.4" {...SJ} />
          <path d="M7 22v-4M12 18v-4M17 14v-4" stroke="#1c1a16" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "54%", top: "16%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec8, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "8%", width: "88%", background: "#9a8f7a" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "64%", height: "52%" })}>
          <path d="M2 20h6v-5h6v-5h8" fill="none" stroke="#ffeec8" strokeWidth="2.6" {...SJ} />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.6, -0.5), borderRadius: "50%", background: "#ffeec8" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(154,143,122,0.24), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the well of the stair goes dark first */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(4.4, 4.4), borderRadius: "50%", background: "radial-gradient(circle, #1c1a16, transparent 72%)" })} />
      {/* strike: the newel post the treads are cut into */}
      <span className="g21-raise absolute block" style={st({ ...d(delayMs, 240), ...box(0.7, 4.6, 0, 0), borderRadius: "999px", background: "linear-gradient(180deg, #9a8f7a, #1c1a16)" })} />
      {/* the treads light in the real order as somebody climbs */}
      {TREADS.map((i) => (
        <span
          key={i}
          className="g21-tread absolute block"
          style={st({ ...dq(delayMs, 320, i * 80), ...box(2.4, 0.5, i % 2 ? 0.9 : -0.9, 1.6 - i * 0.85), background: "linear-gradient(90deg, transparent, #ffeec8 40%, #9a8f7a)" })}
        />
      ))}
      {/* the candle glow stops short and comes straight back down */}
      <span className="g21-backdown absolute block" style={st({ ...d(delayMs, 520), ...box(2.2, 2.2, 0, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,200,0.85), transparent 70%)" })} />
      {/* settle: the dropped paper it was carrying */}
      <span className="g21-drip absolute block" style={st({ ...d(delayMs, 660), ...box(0.8, 0.6, 0.7, 1.4), borderRadius: "1px", background: "#ffeec8" })} />
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 700), ...box(4, 2.2, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,200,0.4), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   12. Squeaky Wheel (t1) — the keep's kitchen. The spit crank squeals round,
   the roast turns on the bar, and every drop off it lands in the fire and
   flares. Nobody in this kitchen is capturing anything today.
   Palette: #d4762e / #ffdca6 / #2a1408.
   ========================================================================== */
function KitchenSpit({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "6%", width: "84%", background: "#2a1408" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "44%" })}>
          <path d="M1 12h22" stroke="#ffdca6" strokeWidth="1.8" {...SJ} />
          <ellipse cx="12" cy="12" rx="6.4" ry="4.4" fill="#d4762e" stroke="#2a1408" strokeWidth="1.3" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "56%", width: "32%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #ffdca6, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "50%", height: "7%", width: "92%", background: "#ffdca6" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "26%", width: "60%", height: "48%" })}>
          <ellipse cx="12" cy="12" rx="7.4" ry="5" fill="#d4762e" stroke="#2a1408" strokeWidth="1.4" />
          <path d="M6 10.4c3 1.6 9 1.6 12 0" stroke="#ffdca6" strokeWidth="1.2" fill="none" {...SJ} />
        </svg>
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 400), ...box(0.4, 0.6, 0, 0.9), borderRadius: "50%", background: "#ffdca6" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(212,118,46,0.3), transparent 66%)" })} />
      </BoardFrame>
      {/* tell: the fire under the spit brightens before anything turns */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(4.4, 1.6, 0, 1.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,220,166,0.75), transparent 72%)" })} />
      {/* strike: the spit bar laid across the andirons */}
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 240), ...box(5.6, 0.24, 0, -0.1), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #ffdca6 20%, #ffdca6 80%, transparent)" })} />
      {/* the crank squeals round at the near end */}
      <svg viewBox="0 0 24 24" className="g21-squeal absolute block" style={st({ ...d(delayMs, 330), ...box(1.6, 1.6, -2.4, -0.1) })}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#d4762e" strokeWidth="2.4" />
        <path d="M12 12l6.4 4M12 4v3.4M12 16.6V20" stroke="#ffdca6" strokeWidth="1.8" {...SJ} />
      </svg>
      {/* the roast turns on the bar */}
      <svg viewBox="0 0 24 24" className="g21-spitturn absolute block" style={st({ ...d(delayMs, 420), ...box(3, 2.2, 0.3, -0.1) })}>
        <ellipse cx="12" cy="12" rx="9.4" ry="6" fill="#d4762e" stroke="#2a1408" strokeWidth="1.5" />
        <path d="M4.6 10c4 2.2 11 2.2 15 0" stroke="#ffdca6" strokeWidth="1.3" fill="none" {...SJ} />
      </svg>
      {/* every drop lands in the fire and flares */}
      <span className="g21-drip absolute block" style={st({ ...d(delayMs, 520), ...box(0.4, 0.7, 0.3, 0.9), borderRadius: "50%", background: "#ffdca6" })} />
      <span className="g21-flare absolute block" style={st({ ...d(delayMs, 620), ...box(2.2, 1.4, 0.3, 1.5), borderRadius: "50%", background: "radial-gradient(circle, #ffdca6, transparent 70%)" })} />
      {/* settle: kitchen smoke leaning off the caster's own side */}
      <span className="g21-smoke absolute block" style={st({ ...d(delayMs, 700), left: `${50 - 2.4 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -18%)", width: cells(4.8), height: cells(2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,220,166,0.45), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   13. Change of Address (t1) — the painted name board over the hall door is
   lifted off its two hooks, carried away over the caster's own shoulder, and a
   fresh blank one is hung in its place. It swings a while before it settles.
   Palette: #7a5d3a / #ffe9bd / #1a140c.
   ========================================================================== */
function NameBoard({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "16%", top: "26%", height: "5%", width: "68%", background: "#1a140c" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "30%", width: "64%", height: "44%" })}>
          <path d="M6 2v3M18 2v3" stroke="#ffe9bd" strokeWidth="1.6" {...SJ} />
          <rect x="2" y="5" width="20" height="13" fill="#7a5d3a" stroke="#1a140c" strokeWidth="1.4" />
          <path d="M6 10h12M6 14h8" stroke="#ffe9bd" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "62%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #ffe9bd, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "30%", height: "7%", width: "88%", background: "#7a5d3a" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "28%", width: "68%", height: "46%" })}>
          <rect x="2" y="4" width="20" height="14" fill="#ffe9bd" stroke="#1a140c" strokeWidth="1.4" />
          <path d="M6 9h12M6 13h7" stroke="#7a5d3a" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,189,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(122,93,58,0.26), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the two empty hooks over the door */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.4, 0.34, 0, -1.9), borderRadius: "999px", background: "#ffe9bd" })} />
      {/* strike: the old board comes off one hook and swings */}
      <span className="g21-boardswing absolute block" style={st({ ...d(delayMs, 250), ...box(3.4, 1.5, 0, -1), background: "linear-gradient(180deg, #7a5d3a, #3c2d18)", border: "1px solid #1a140c" })} />
      {/* and is carried off over the caster's own shoulder */}
      <span className="g21-carryoff absolute block" style={st({ ...d(delayMs, 380), ...box(3.2, 1.4, 0, -0.8), background: "#3c2d18", border: "1px solid #ffe9bd" })} />
      {/* the new one is hung, and swings itself level */}
      <span className="g21-newboard absolute block" style={st({ ...d(delayMs, 490), ...box(3.4, 1.5, 0, -1), background: "linear-gradient(180deg, #ffe9bd, #7a5d3a)", border: "1px solid #1a140c" })} />
      {/* settle: a nail drops out and rolls, and the plaster dusts */}
      <span className="g21-drip absolute block" style={st({ ...d(delayMs, 640), ...box(0.3, 0.6, 1.2, 0.2), borderRadius: "1px", background: "#ffe9bd" })} />
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 700), ...box(4, 2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,189,0.42), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   14. Driftwood Tower (t1) — the mantel shelf in the solar. A little carved
   piece of driftwood is set down between the candlesticks. The cobweb behind it
   moves. That is the entire event.
   Palette: #a9a08c / #fff1cf / #221d16.
   ========================================================================== */
function MantelPiece({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "68%", height: "6%", width: "80%", background: "#221d16" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "18%", width: "44%", height: "54%" })}>
          <path d="M5 4h3v2.2h2.5V4h3v2.2H16V4h3v5l-1.7 1.4v6.8L19 20H5l1.7-2.8v-6.8L5 9z" fill="#a9a08c" stroke="#221d16" strokeWidth="1.2" {...SJ} />
          <path d="M9 12c1.4 1.6 4 1.6 6 0" stroke="#fff1cf" strokeWidth="1" fill="none" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "24%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,207,0.7), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "70%", height: "7%", width: "84%", background: "#a9a08c" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "18%", width: "48%", height: "62%" })}>
          <path d="M5 4h3v2.2h2.5V4h3v2.2H16V4h3v5l-1.7 1.4v6.8L19 20H5l1.7-2.8v-6.8L5 9z" fill="#fff1cf" stroke="#221d16" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.2, 0, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,207,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(169,160,140,0.22), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: a hand's shadow crosses the shelf */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(4.6, 1, 0, 1.5), borderRadius: "999px", background: "#221d16" })} />
      {/* strike: the mantel shelf */}
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 250), ...box(5.4, 0.55, 0, 1.1), background: "linear-gradient(180deg, #a9a08c, #221d16)" })} />
      {/* the driftwood is set down on it, and rocks */}
      <svg viewBox="0 0 24 24" className="g21-knick absolute block" style={st({ ...d(delayMs, 350), ...box(2.2, 2.8, 0, -0.2) })}>
        <path d="M5 4h3v2.2h2.5V4h3v2.2H16V4h3v5l-1.7 1.4v6.8L19 20H5l1.7-2.8v-6.8L5 9z" fill="#a9a08c" stroke="#221d16" strokeWidth="1.2" {...SJ} />
        <path d="M8.4 11.4c1.6 1.8 5.6 1.8 7.2 0M9 15c1.4 1.2 4.6 1.2 6 0" stroke="#fff1cf" strokeWidth="0.9" fill="none" {...SJ} />
      </svg>
      {/* the cobweb behind it moves. That is all that happens. */}
      <svg viewBox="0 0 24 24" className="g21-web absolute block" style={st({ ...d(delayMs, 470), ...box(2.4, 2.4, 2, -1.2) })}>
        <path d="M1 1c6 2 10 6 12 12M1 1c2 6 6 10 12 12M1 5.4c4 1.6 7 4.6 8.6 8.6M5.4 1c1.6 4 4.6 7 8.6 8.6" fill="none" stroke="#fff1cf" strokeWidth="0.8" {...SJ} />
      </svg>
      {/* settle: the dust it disturbed, drifting off the caster's own side */}
      <span className="g21-motes absolute block" style={st({ ...d(delayMs, 620), left: `${50 - 2.2 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -12%)", width: cells(4.4), height: cells(2.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,207,0.45), transparent 74%)" })} />
      <span className="g21-glint absolute block" style={st({ ...d(delayMs, 690), ...box(1.1, 1.1, -1.6, -0.6), borderRadius: "50%", background: "#fff1cf" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   15. Gilded Doorknob (t1) — the gilder's afternoon. A leaf of gold is floated
   down over the door ring, pressed into the metal, burnished until it takes,
   and the skewings drift off toward the caster's own side of the room.
   Palette: #e0b23c / #fff3d2 / #2b2008.
   ========================================================================== */
function Gilding({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "14%", top: "76%", height: "5%", width: "72%", background: "#2b2008" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "18%", width: "48%", height: "58%" })}>
          <circle cx="12" cy="14" r="7.4" fill="none" stroke="#e0b23c" strokeWidth="3" />
          <path d="M9.6 6.6h4.8v3h-4.8z" fill="#fff3d2" stroke="#2b2008" strokeWidth="1.1" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "32%", top: "30%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.85), transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "70%", height: "8%", width: "84%", background: "#e0b23c" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "20%", width: "56%", height: "58%" })}>
          <circle cx="12" cy="13.6" r="8" fill="none" stroke="#fff3d2" strokeWidth="3.2" />
          <path d="M9.4 5.6h5.2v3.2H9.4z" fill="#e0b23c" stroke="#2b2008" strokeWidth="1.2" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.3, 1.3, 0.5, -0.5), borderRadius: "50%", background: "#fff3d2" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(224,178,60,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the ring's shadow on the door boards */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.2, 1, 0.3, 1.6), borderRadius: "999px", background: "#2b2008" })} />
      {/* strike: the door ring itself */}
      <svg viewBox="0 0 24 24" className="g21-raise absolute block" style={st({ ...d(delayMs, 250), ...box(3.2, 3.6, 0, 0.2) })}>
        <circle cx="12" cy="15" r="7.6" fill="none" stroke="#e0b23c" strokeWidth="3.2" />
        <path d="M9.4 5h5.2v4.4H9.4z" fill="#2b2008" stroke="#e0b23c" strokeWidth="1.3" />
      </svg>
      {/* the leaf is floated down over it */}
      <span className="g21-leaf absolute block" style={st({ ...d(delayMs, 360), ...box(2.6, 2.6, 0.1, 0.1), background: "linear-gradient(135deg, #fff3d2, #e0b23c)" })} />
      {/* and burnished in with the agate */}
      <span className="g21-burnish absolute block" style={st({ ...d(delayMs, 480), ...box(3.6, 0.6, 0, 0.1), background: "linear-gradient(90deg, transparent, #fff3d2, transparent)" })} />
      <span className="g21-glint absolute block" style={st({ ...d(delayMs, 580), ...box(1.4, 1.4, 0.8, -0.6), borderRadius: "50%", background: "radial-gradient(circle, #fff3d2, transparent 72%)" })} />
      {/* settle: the skewings drift off the caster's own side */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="g21-flake absolute block"
          style={st({ ...d(delayMs, 650 + i * 40), ...box(0.4, 0.4, i * 1.1 - 1.1, -0.9), "--sx": `${(i - 1) * 140}%`, "--sy": "calc(var(--fx-side, 1) * -170%)", borderRadius: "1px", background: "#e0b23c" })}
        />
      ))}
    </BoardWideStage>
  );
}

/* =============================================================================
   16. Home Office (t1) — the window seat in the tower. The shutter is opened,
   the folding desk drops down off the wall on its hinge, the inkwell and the
   candle are set out, and the household's business gets done in the good light.
   Palette: #8fa2b8 / #ffeec6 / #1d2028.
   ========================================================================== */
function WindowDesk({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "76%", height: "5%", width: "76%", background: "#1d2028" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "16%", width: "56%", height: "60%" })}>
          <path d="M3 21V9a9 7 0 0 1 18 0v12z" fill="#1d2028" stroke="#8fa2b8" strokeWidth="1.3" {...SJ} />
          <path d="M12 3v18M3 13h18" stroke="#8fa2b8" strokeWidth="1.2" />
          <path d="M6 21v-5h12v5z" fill="#ffeec6" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "58%", width: "28%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #ffeec6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "8%", width: "88%", background: "#8fa2b8" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "18%", width: "56%", height: "60%" })}>
          <path d="M3 22V10a9 7.4 0 0 1 18 0v12z" fill="#ffeec6" stroke="#1d2028" strokeWidth="1.4" {...SJ} />
          <path d="M12 3.6V22" stroke="#1d2028" strokeWidth="1.3" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0, -0.5), borderRadius: "50%", background: "#ffeec6" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(143,162,184,0.24), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the window's light patch lands on the floor first */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.6, 1.4, 0.4, 1.7), background: "rgba(255,238,198,0.55)" })} />
      {/* strike: the shutter swings back off the embrasure */}
      <span className="g21-swing absolute block" style={st({ ...d(delayMs, 250), ...box(1.6, 3, -1.4, -0.4), background: "linear-gradient(90deg, #1d2028, #46536a)", border: "1px solid #8fa2b8" })} />
      {/* the folding desk drops off the wall on its hinge */}
      <span className="g21-deskfold absolute block" style={st({ ...d(delayMs, 370), ...box(3.4, 1.4, 0.2, 0.7), background: "linear-gradient(180deg, #8fa2b8, #35404f)", border: "1px solid #1d2028" })} />
      {/* the inkwell is set out on it */}
      <span className="g21-tick absolute block" style={st({ ...d(delayMs, 470), ...box(0.7, 0.7, 1.3, 0.2), borderRadius: "999px", background: "#1d2028", border: "1px solid #ffeec6" })} />
      {/* and the candle is lit for the short afternoons */}
      <span className="g21-flick absolute block" style={st({ ...d(delayMs, 560), ...box(0.7, 1.3, -0.9, -0.2), borderRadius: "50%", background: "radial-gradient(circle, #ffeec6, transparent 72%)" })} />
      {/* settle: a barb off the quill, drifting off the caster's side */}
      <span className="g21-flake absolute block" style={st({ ...d(delayMs, 670), ...box(0.5, 0.5, 0.6, -0.4), "--sx": "130%", "--sy": "calc(var(--fx-side, 1) * -180%)", borderRadius: "1px", background: "#ffeec6" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   17. Keys Copied (t1) — somebody's cousin has a bench and a file. The blank
   goes in the vise, the file goes across it, the filings come off, and there
   are two keys on the ring where there was one.
   Palette: #b8a24f / #fff0cc / #1b1710.
   ========================================================================== */
const FILINGS = [0, 1, 2, 3];

function KeyFiling({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "74%", height: "5%", width: "80%", background: "#1b1710" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "44%" })}>
          <circle cx="6" cy="12" r="4" fill="none" stroke="#b8a24f" strokeWidth="2.2" />
          <path d="M10 12h12M18 12v4M21 12v3" stroke="#fff0cc" strokeWidth="2.2" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "56%", width: "26%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #fff0cc, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "68%", height: "7%", width: "88%", background: "#b8a24f" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "30%", width: "76%", height: "40%" })}>
          <circle cx="6" cy="12" r="4.4" fill="none" stroke="#fff0cc" strokeWidth="2.4" />
          <path d="M10.4 12H23M18.4 12v4.4M21.4 12v3.4" stroke="#b8a24f" strokeWidth="2.4" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.1, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,204,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(184,162,79,0.26), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the bench, and the blank's shadow lying on it */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(5, 0.9, 0, 1.5), borderRadius: "999px", background: "#1b1710" })} />
      {/* strike: the vise jaws close on the blank */}
      <span className="g21-vise absolute block" style={st({ ...d(delayMs, 250), ...box(1.2, 1.8, -1.5, 0.3), "--sx": "60%", background: "linear-gradient(90deg, #1b1710, #6a5d2c)", border: "1px solid #b8a24f" })} />
      <span className="g21-vise absolute block" style={st({ ...d(delayMs, 250), ...box(1.2, 1.8, 1.5, 0.3), "--sx": "-60%", background: "linear-gradient(270deg, #1b1710, #6a5d2c)", border: "1px solid #b8a24f" })} />
      {/* the file goes across, and across again */}
      <span className="g21-file absolute block" style={st({ ...d(delayMs, 380), ...box(4.4, 0.5, 0, -0.3), background: "repeating-linear-gradient(90deg, #fff0cc 0 6%, #b8a24f 6% 10%)" })} />
      {/* the filings come off, away from the caster */}
      {FILINGS.map((i) => (
        <span
          key={i}
          className="g21-filing absolute block"
          style={st({ ...dq(delayMs, 500, i * 45), ...box(0.3, 0.3, i * 0.8 - 1.2, 0.6), "--sx": `${(i - 1.5) * 110}%`, "--sy": "calc(var(--fx-side, 1) * -140%)", borderRadius: "1px", background: "#fff0cc" })}
        />
      ))}
      {/* settle: two keys where there was one, hanging on the ring */}
      <svg viewBox="0 0 24 24" className="g21-twokeys absolute block" style={st({ ...d(delayMs, 660), ...box(3, 2.2, 0.4, -1.5) })}>
        <circle cx="5" cy="8" r="3.2" fill="none" stroke="#b8a24f" strokeWidth="2" />
        <path d="M8.2 8h11M15 8v3.4M18 8v2.6" stroke="#b8a24f" strokeWidth="2" {...SJ} />
        <circle cx="5" cy="15" r="3.2" fill="none" stroke="#fff0cc" strokeWidth="2" />
        <path d="M8.2 15h11M15 15v3.4M18 15v2.6" stroke="#fff0cc" strokeWidth="2" {...SJ} />
      </svg>
    </BoardWideStage>
  );
}

/* =============================================================================
   18. Meet the Neighbors (t1) — the great hall's shutters are thrown open the
   whole length of the wall, in the real victim order, and everybody who lives
   across the way is suddenly lit up and looking back. Someone waves.
   Palette: #c98a3c / #fff2d0 / #201a12.
   ========================================================================== */
const SHUTTERS = [0, 1, 2, 3];

function HallShutters({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "5%", width: "84%", background: "#201a12" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "58%" })}>
          <path d="M3 22V9a9 7 0 0 1 18 0v13z" fill="#fff2d0" stroke="#201a12" strokeWidth="1.4" {...SJ} />
          <path d="M12 2.6V22M3 12h18" stroke="#201a12" strokeWidth="1.2" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "28%", top: "22%", width: "44%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,208,0.8), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "8%", width: "88%", background: "#c98a3c" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "60%" })}>
          <rect x="3" y="3" width="18" height="18" fill="#201a12" stroke="#c98a3c" strokeWidth="1.4" />
          <rect x="6" y="6" width="12" height="12" fill="#fff2d0" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.3, 1.3), borderRadius: "50%", background: "#fff2d0" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(201,138,60,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the string course scribed the length of the neighbours' wall */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.16, 1.2), background: "#fff2d0" })} />
        {/* strike: the wall the windows are cut into */}
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 230), ...lane(2.2, 0), background: "linear-gradient(180deg, #3a2c18, #201a12)", border: "1px solid #c98a3c" })} />
        {/* the shutters bang open in the real victim order */}
        {SHUTTERS.map((i) => (
          <span
            key={i}
            className="g21-shutter absolute block"
            style={st({ ...dq(delayMs, 330, i * 90), ...box(0.8, 1.4, i * 1.3 + 0.8, -0.2), background: "linear-gradient(90deg, #c98a3c, #6b4519)", border: "1px solid #201a12" })}
          />
        ))}
        {/* and the lamplight comes out of every one of them */}
        {SHUTTERS.map((i) => (
          <span
            key={i}
            className="g21-lamplight absolute block"
            style={st({ ...dq(delayMs, 430, i * 90), ...box(1.1, 1.1, i * 1.3 + 1.3, -0.2), borderRadius: "50%", background: "radial-gradient(circle, #fff2d0, transparent 72%)" })}
          />
        ))}
        {/* somebody leans out of the nearest one and waves */}
        <svg viewBox="0 0 24 24" className="g21-wave absolute block" style={st({ ...d(delayMs, 580), ...box(1.2, 1.2, 1.3, -1.4) })}>
          <path d="M8 22v-7c0-2 1-3 2.4-3s2.2 1 2.2 3v-2.6c0-1.6 3-1.6 3 0V15c0-1.4 2.6-1.4 2.6 0.4v4" fill="none" stroke="#fff2d0" strokeWidth="2" {...SJ} />
        </svg>
        {/* settle: hearth smoke off the neighbours' roofs */}
        <span className="g21-smoke absolute block" style={st({ ...d(delayMs, 690), ...box(5, 2.4, 2, -1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,208,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   19. Rolling Gantry (t1) — the bed curtain in the solar. The rings are pushed
   along the rail the real distance the rook travels, dragging the hanging past
   the bedpost in the middle without disturbing it.
   Palette: #a05a4a / #ffe6c2 / #201014.
   ========================================================================== */
const RINGS = [0, 1, 2, 3];

function BedCurtain({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "24%", height: "5%", width: "84%", background: "#ffe6c2" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "26%", width: "60%", height: "52%" })}>
          <path d="M3 2h18v20c-3-2-6-2-9 0s-6 2-9 0z" fill="#a05a4a" stroke="#201014" strokeWidth="1.3" {...SJ} />
          <path d="M8 3v17M16 3v17" stroke="#201014" strokeWidth="1" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "10%", width: "30%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, #ffe6c2, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "24%", height: "7%", width: "92%", background: "#ffe6c2" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "58%" })}>
          <path d="M4 2h16v19c-2.6-1.8-5.4-1.8-8 0s-5.4 1.8-8 0z" fill="#ffe6c2" stroke="#201014" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.2, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,230,194,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(160,90,74,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the rail scribed the real length of the run */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.14, -1.5), background: "#ffe6c2" })} />
        {/* strike: the rail itself */}
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 220), ...lane(0.3, -1.5), borderRadius: "999px", background: "linear-gradient(180deg, #ffe6c2, #6b3a30)" })} />
        {/* the bedpost the hanging has to pass */}
        <span className="g21-raise absolute block" style={st({ ...d(delayMs, 300), left: "calc(50% + var(--fx-len, 3) * 3.571429% - 0.2%)", top: `${50 - 1.5 * CELL}%`, width: cells(0.42), height: cells(3.4), borderRadius: "999px", background: "linear-gradient(180deg, #ffe6c2, #201014)" })} />
        {/* the rings go along the rail, one after another */}
        {RINGS.map((i) => (
          <span
            key={i}
            className="g21-ringslide absolute block"
            style={st({ ...dq(delayMs, 380, i * 60), ...box(0.42, 0.42, 0.3, -1.5), "--rg": `${i * 0.24}`, borderRadius: "50%", border: `${cells(0.1)} solid #ffe6c2` })}
          />
        ))}
        {/* and the hanging drags the whole real distance behind them */}
        <span className="g21-curtain absolute block" style={st({ ...d(delayMs, 470), ...lane(2.8, 0.2), background: "repeating-linear-gradient(90deg, #a05a4a 0 6%, #6b3a30 6% 9%)" })} />
        {/* settle: the dust the fabric knocks out of the tester */}
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 680), ...box(4.6, 2.2, 2, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,230,194,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   20. Set Change (t1) — after dinner the hall is cleared. The board comes off
   the trestles, the trestle itself walks the real distance along the wall, and
   the board goes back down on it two places from where it started.
   Palette: #9c7a44 / #fff1cc / #1d160d.
   ========================================================================== */
function TrestleBoards({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "72%", height: "5%", width: "84%", background: "#1d160d" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "28%", width: "72%", height: "44%" })}>
          <rect x="1" y="6" width="22" height="3.4" fill="#fff1cc" stroke="#1d160d" strokeWidth="1.1" />
          <path d="M5 9.4L3 20M9 9.4L11 20M15 9.4L13 20M19 9.4L21 20" stroke="#9c7a44" strokeWidth="1.8" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "56%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #fff1cc, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "68%", height: "8%", width: "92%", background: "#9c7a44" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "26%", width: "72%", height: "48%" })}>
          <rect x="1" y="5" width="22" height="4" fill="#fff1cc" stroke="#1d160d" strokeWidth="1.2" />
          <path d="M6 9L4 20M18 9l2 11" stroke="#9c7a44" strokeWidth="2.2" {...SJ} />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.7, 1.2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,204,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(156,122,68,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the chalk on the hall floor where the tables go back */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.14, 1.5), background: "#fff1cc" })} />
        {/* strike: the board is lifted clear, up off the caster's own side */}
        <span className="g21-lift absolute block" style={st({ ...d(delayMs, 240), ...box(3.4, 0.5, 0, -0.6), background: "linear-gradient(180deg, #fff1cc, #9c7a44)", border: "1px solid #1d160d" })} />
        {/* the trestle walks the real distance along the wall */}
        <svg viewBox="0 0 24 24" className="g21-trestle absolute block" style={st({ ...d(delayMs, 370), ...box(1.6, 1.6, 0.2, 0.4) })}>
          <path d="M4 3l4 18M20 3l-4 18M6 12h12" stroke="#9c7a44" strokeWidth="2.4" fill="none" {...SJ} />
        </svg>
        {/* and the board goes back down on it, where it now stands */}
        <span className="g21-plankdrop absolute block" style={st({ ...d(delayMs, 520), ...farBox(3.4, 0.5, -0.5), background: "linear-gradient(180deg, #fff1cc, #9c7a44)", border: "1px solid #1d160d" })} />
        {/* settle: the rushes and crumbs it left behind */}
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 640), ...box(0.4, 0.4, 0.6, 1), borderRadius: "1px", background: "#fff1cc" })} />
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 700), ...box(4.6, 2.2, 1.6, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,204,0.42), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   21. Siege Survey (t1) — the dovecote in the gatehouse roof. The ladder is
   turned round the pier and a hand goes into every nest box in turn; each one
   lights as it is counted, and the whole cote goes up at once.
   Palette: #9aa3ae / #ffeeca / #1a1c22.
   ========================================================================== */
const BOXES = [0, 1, 2, 3, 4, 5];

function Dovecote({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "76%", height: "5%", width: "76%", background: "#1a1c22" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "58%" })}>
          <rect x="2" y="3" width="20" height="18" fill="#1a1c22" stroke="#9aa3ae" strokeWidth="1.3" />
          <path d="M6 8.6a2.4 2.4 0 0 1 4.8 0V12H6zM13.2 8.6a2.4 2.4 0 0 1 4.8 0V12h-4.8zM6 15.4a2.4 2.4 0 0 1 4.8 0V18H6zM13.2 15.4a2.4 2.4 0 0 1 4.8 0V18h-4.8z" fill="#ffeeca" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "56%", top: "8%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, #ffeeca, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "7%", width: "88%", background: "#9aa3ae" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "60%" })}>
          <rect x="3" y="3" width="18" height="18" fill="#1a1c22" stroke="#9aa3ae" strokeWidth="1.4" />
          <path d="M8 12.6a4 4 0 0 1 8 0V19H8z" fill="#ffeeca" />
        </svg>
        <span className="g21-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.3, -0.6), borderRadius: "50%", background: "#ffeeca" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(154,163,174,0.24), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the cote's shadow on the loft floor */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 130), ...box(5, 1.1, 0, 1.9), borderRadius: "999px", background: "#1a1c22" })} />
      {/* strike: the wall of nest boxes */}
      <span className="g21-raise absolute block" style={st({ ...d(delayMs, 250), ...box(4.6, 3.6, 0, 0), background: "linear-gradient(180deg, #3b414c, #1a1c22)", border: `${cells(0.14)} solid #9aa3ae` })} />
      {/* each box is counted, and lights as it is, in the real order */}
      {BOXES.map((i) => (
        <span
          key={i}
          className="g21-nestbox absolute block"
          style={st({ ...dq(delayMs, 340, i * 60), ...box(1.1, 1.1, (i % 3) * 1.4 - 1.4, i < 3 ? -0.8 : 0.8), background: "radial-gradient(circle, #ffeeca, rgba(255,238,202,0.15) 72%)" })}
        />
      ))}
      {/* one bird clatters out and away from the caster's own side */}
      <svg viewBox="0 0 24 24" className="g21-bird absolute block" style={st({ ...d(delayMs, 540), ...box(1.8, 1.4, 1.6, -1.6) })}>
        <path d="M2 14c4-1 7-4 9-8 1 3 3 5 6 5.4-2 3-5 5-9 5z" fill="#ffeeca" stroke="#1a1c22" strokeWidth="1.1" {...SJ} />
      </svg>
      {/* settle: one feather, taking its time */}
      <span className="g21-flake absolute block" style={st({ ...d(delayMs, 680), ...box(0.5, 0.8, 1.9, -0.6), "--sx": "90%", "--sy": "calc(var(--fx-side, 1) * -150%)", borderRadius: "999px", background: "#ffeeca" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   22. Tower Bridge (t1) — the washing line strung window to window between the
   two towers, with a pulley basket on it. The basket runs the real distance
   across, over everything in between, and lands at the far sill.
   Palette: #cfd6dd / #fff4d6 / #222831.
   ========================================================================== */
function ClothesLine({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "36%", height: "4%", width: "88%", background: "#cfd6dd" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "34%", width: "44%", height: "44%" })}>
          <circle cx="12" cy="4" r="2.6" fill="none" stroke="#fff4d6" strokeWidth="1.6" />
          <path d="M12 6.6v3" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
          <path d="M4 10h16l-2.4 11H6.4z" fill="#222831" stroke="#cfd6dd" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "58%", width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "34%", height: "6%", width: "92%", background: "#fff4d6" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "26%", width: "48%", height: "54%" })}>
          <path d="M3 6h18l-2.6 15H5.6z" fill="#222831" stroke="#cfd6dd" strokeWidth="1.5" {...SJ} />
          <path d="M3 11h18" stroke="#fff4d6" strokeWidth="1.3" />
        </svg>
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.2, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.5), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(207,214,221,0.22), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the line is thrown across and goes taut */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.12, -0.9), background: "#fff4d6" })} />
        {/* strike: the two window openings, near sill and far sill */}
        <span className="g21-winop absolute block" style={st({ ...d(delayMs, 220), ...box(1.1, 1.8, -0.5, -0.2), background: "#222831", border: "1px solid #cfd6dd" })} />
        <span className="g21-winop absolute block" style={st({ ...d(delayMs, 280), ...farBox(1.1, 1.8, -0.2), background: "#222831", border: "1px solid #cfd6dd" })} />
        {/* the line itself, sagging under what is hung on it */}
        <span className="g21-sag absolute block" style={st({ ...d(delayMs, 340), ...lane(0.16, -0.85), background: "#fff4d6" })} />
        {/* the pulley basket runs the whole real distance across */}
        <svg viewBox="0 0 24 24" className="g21-run absolute block" style={st({ ...d(delayMs, 430), ...box(1, 1, 0.2, -0.2) })}>
          <circle cx="12" cy="3.6" r="2.4" fill="none" stroke="#fff4d6" strokeWidth="1.8" />
          <path d="M12 6v3.2" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
          <path d="M4.4 9.2h15.2l-2.2 11.4H6.6z" fill="#222831" stroke="#cfd6dd" strokeWidth="1.5" {...SJ} />
        </svg>
        {/* settle: a peg shakes loose and drops */}
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 620), ...box(0.3, 0.7, 1.6, -0.5), borderRadius: "1px", background: "#cfd6dd" })} />
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 690), ...box(4.4, 2, 1.8, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   23. Tower Torches (t1) — the tower chimney finally draws. The fire is fed,
   the flue takes, sparks go up it in a stream, and the plume leans off across
   everybody standing near the tower: they will all smell of it for hours.
   Palette: #d4813a / #ffe0a8 / #241a12.
   ========================================================================== */
const SPARKS = [0, 1, 2, 3];

function ChimneyDraw({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "14%", top: "78%", height: "5%", width: "72%", background: "#241a12" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "20%", width: "44%", height: "58%" })}>
          <path d="M5 22V6h14v16z" fill="#241a12" stroke="#d4813a" strokeWidth="1.3" {...SJ} />
          <path d="M3.5 6h17V3h-17z" fill="#d4813a" />
          <path d="M9 22v-5.4a3 3 0 0 1 6 0V22z" fill="#ffe0a8" />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "6%", width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,224,168,0.75), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "74%", height: "7%", width: "84%", background: "#d4813a" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "18%", width: "44%", height: "62%" })}>
          <path d="M5 22V5h14v17z" fill="#241a12" stroke="#ffe0a8" strokeWidth="1.4" {...SJ} />
          <path d="M9.4 22v-6a2.6 2.6 0 0 1 5.2 0v6z" fill="#d4813a" />
        </svg>
        <span className="g21-smoke absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.4, 0, -0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,224,168,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(212,129,58,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the downdraught kicks the ash about before the flue takes */}
      <span className="g21-tell absolute block" style={st({ ...d(delayMs, 120), ...box(3.6, 1.2, 0, 1.7), borderRadius: "50%", background: "#241a12" })} />
      {/* strike: the stack and its cap */}
      <span className="g21-raise absolute block" style={st({ ...d(delayMs, 250), ...box(2.2, 4.2, 0, 0.1), background: "repeating-linear-gradient(180deg, #4a3420 0 12%, #241a12 12% 15%)", border: "1px solid #d4813a" })} />
      <span className="g21-lay absolute block" style={st({ ...d(delayMs, 330), ...box(3, 0.5, 0, -2.1), background: "#d4813a", border: "1px solid #241a12" })} />
      {/* the fire is fed and the flue takes */}
      <span className="g21-flick absolute block" style={st({ ...d(delayMs, 420), ...box(1.4, 1.8, 0, 1.3), borderRadius: "50%", background: "radial-gradient(circle, #ffe0a8, rgba(212,129,58,0.2) 72%)" })} />
      {/* sparks go up the flue in a stream */}
      {SPARKS.map((i) => (
        <span
          key={i}
          className="g21-spark absolute block"
          style={st({ ...dq(delayMs, 500, i * 55), ...box(0.34, 0.34, i * 0.5 - 0.75, -1.4), "--sx": `${(i - 1.5) * 90}%`, "--sy": "calc(var(--fx-side, 1) * -220%)", borderRadius: "50%", background: "#ffe0a8" })}
        />
      ))}
      {/* settle: the plume leans off across whoever is standing near */}
      <span className="g21-plume absolute block" style={st({ ...d(delayMs, 660), left: `${50 - 2 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -30%)", width: cells(4.6), height: cells(2.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,224,168,0.5), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   24. Wall Sentries (t1) — the entry passage under the gatehouse. The hatches
   in its ceiling are lifted one after another the whole length of the passage,
   an eye and a lamp show in each, and then they all drop shut again.
   Palette: #6f7a86 / #ffe9bb / #13181e.
   ========================================================================== */
const HOLES = [0, 1, 2, 3];

function MurderHoles({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g21-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "22%", height: "6%", width: "84%", background: "#13181e" })} />
        <svg viewBox="0 0 24 24" className="g21-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "26%", width: "60%", height: "48%" })}>
          <rect x="2" y="2" width="20" height="8" fill="#6f7a86" stroke="#13181e" strokeWidth="1.3" />
          <path d="M6 10v4M12 10v5M18 10v4" stroke="#ffe9bb" strokeWidth="2" {...SJ} />
        </svg>
        <span className="g21-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "56%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #ffe9bb, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g21-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "22%", height: "8%", width: "92%", background: "#6f7a86" })} />
        <svg viewBox="0 0 24 24" className="g21-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "20%", width: "56%", height: "56%" })}>
          <rect x="2" y="2" width="20" height="7" fill="#13181e" stroke="#6f7a86" strokeWidth="1.4" />
          <ellipse cx="12" cy="14" rx="6" ry="3.4" fill="#ffe9bb" />
          <circle cx="12" cy="14" r="1.4" fill="#13181e" />
        </svg>
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 400), ...box(0.4, 0.7, 0, 0.9), borderRadius: "1px", background: "#ffe9bb" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g21-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(19,24,30,0.5), rgba(111,122,134,0.12) 72%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the passage ceiling line, the whole real length of it */}
        <span className="g21-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.16, -1.2), background: "#ffe9bb" })} />
        {/* strike: the vault over the passage */}
        <span className="g21-stretch absolute block" style={st({ ...d(delayMs, 230), ...lane(1.2, -0.8), background: "linear-gradient(180deg, #6f7a86, #13181e)", border: "1px solid #13181e" })} />
        {/* the hatches lift one after another, in the real victim order */}
        {HOLES.map((i) => (
          <span
            key={i}
            className="g21-mhole absolute block"
            style={st({ ...dq(delayMs, 330, i * 80), ...box(0.9, 0.9, i * 1.3 + 0.8, -0.8), background: "#13181e", border: "1px solid #ffe9bb" })}
          />
        ))}
        {/* an eye and a lamp show in each opening */}
        {HOLES.map((i) => (
          <span
            key={i}
            className="g21-eye absolute block"
            style={st({ ...dq(delayMs, 430, i * 80), ...box(0.6, 0.6, i * 1.3 + 0.8, -0.8), borderRadius: "50%", background: "radial-gradient(circle, #ffe9bb, transparent 72%)" })}
          />
        ))}
        {/* settle: the grit that comes down out of the ceiling after */}
        <span className="g21-drip absolute block" style={st({ ...d(delayMs, 620), ...box(0.3, 0.6, 2.1, 0.4), borderRadius: "1px", background: "#ffe9bb" })} />
        <span className="g21-motes absolute block" style={st({ ...d(delayMs, 690), ...box(4.6, 2, 2, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,187,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   Registry — scene + config per card id. Every `sound` is an existing
   SigSoundKey, every `source` an existing SigZone (named only on the two cards
   that really do decorate a rook which STAYS on the board), and every card
   declares its anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 3 ---
  hx4_guild_insurance: S(TallySticks, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "vault", source: "shield", anchor: "board",
  }),

  // --- Tier 2 ---
  bn4_gate_key: S(WicketDoor, {
    ordering: "radial", staggerMs: 55, victims: ["r"], hasLead: true, sound: "vault", anchor: "cast",
  }),
  hx4_cold_barracks: S(DeadHearth, {
    ordering: "file", staggerMs: 60, victims: ["r"], hasLead: true, sound: "wall", anchor: "cast",
  }),
  hx4_muddy_moat: S(SculleryDrain, {
    ordering: "file", staggerMs: 55, victims: ["p"], hasLead: true, sound: "siege", anchor: "cast",
  }),
  hx4_slow_clap: S(GalleryClap, {
    ordering: "line", staggerMs: 60, victims: ["k", "r"], hasLead: true, sound: "cathedral", anchor: "board",
  }),
  op_new_locks: S(NewLockPlate, {
    ordering: "radial", staggerMs: 55, victims: ["k"], hasLead: true, sound: "vault", anchor: "board",
  }),
  op_siege_wagon: S(LaundryChute, {
    ordering: "line", staggerMs: 50, victims: ["n"], hasLead: true, sound: "wall", anchor: "board",
  }),
  op_tower_warden: S(JudasHatch, {
    ordering: "radial", staggerMs: 55, victims: ["r"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  ov_chariot_lessons: S(Wheelwright, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "clockcage", anchor: "cast",
  }),

  // --- Tier 1 ---
  hx4_creaky_axles: S(WellWinch, {
    ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "clockcage", anchor: "board",
  }),
  hx4_second_thoughts: S(NewelStair, {
    ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "board",
  }),
  hx4_squeaky_wheel: S(KitchenSpit, {
    ordering: "radial", staggerMs: 55, victims: ["r"], hasLead: true, sound: "clockcage", anchor: "cast",
  }),
  op_change_of_address: S(NameBoard, {
    ordering: "radial", staggerMs: 55, victims: ["k", "r"], hasLead: true, sound: "wall", anchor: "board",
  }),
  op_driftwood_tower: S(MantelPiece, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", anchor: "board",
  }),
  op_gilded_doorknob: S(Gilding, {
    ordering: "radial", staggerMs: 55, victims: ["k"], hasLead: true, sound: "vault", anchor: "board",
  }),
  op_home_office: S(WindowDesk, {
    ordering: "radial", staggerMs: 55, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "board",
  }),
  op_keys_copied: S(KeyFiling, {
    ordering: "radial", staggerMs: 55, victims: ["k", "r"], hasLead: true, sound: "vault", anchor: "board",
  }),
  op_meet_the_neighbors: S(HallShutters, {
    ordering: "line", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "cathedral", anchor: "board",
  }),
  op_rolling_gantry: S(BedCurtain, {
    ordering: "line", staggerMs: 50, victims: ["r"], hasLead: true, sound: "wall", anchor: "aim",
  }),
  op_set_change: S(TrestleBoards, {
    ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "wall", anchor: "aim",
  }),
  op_siege_survey: S(Dovecote, {
    ordering: "sweep", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  op_tower_bridge: S(ClothesLine, {
    ordering: "line", staggerMs: 50, victims: ["r"], hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  op_tower_torches: S(ChimneyDraw, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "cast",
  }),
  op_wall_sentries: S(MurderHoles, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", anchor: "board",
  }),
};
