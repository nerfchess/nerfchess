// Bespoke plugin signatures for the rook / fortification / siege batch
// (g20_rookRampart1). See sigPlugins.tsx for the contract. Self-contained:
// own inline SVG + own g20RampartPlays.css, transform/opacity only, no import
// from BoardEffects.tsx (cycle hazard), only the SigPlugin TYPE imported.
//
// FICTION: siege engineering along a line. Every card is a different piece of
// siege or fortification work happening ALONG the rank or file it affects —
// a battering ram running the file, a trench opening square by square, a chain
// boom drawn taut across a rank, an ivory siege tower dropping its ramp, a
// consecrated wall course laid stone by stone, a bent ballista bolt skewering
// a line, a drawbridge slamming down, a fuse drowning halfway along.
//
// This is the DIRECTIONAL batch, so the art leans on the geometry contract
// rather than on screen directions:
//
//   <AimStage>  ten of the 24 cards stage inside it: art is authored pointing
//               RIGHT (+x) and aims itself down the real source -> target
//               vector, so a ram cast on a1 attacking a8 runs up the a-file.
//   --fx-len    a layer sized to ONE CELL travels the real length of the line
//               with translateX(calc(var(--fx-len) * 100%)); a lane layer is
//               sized calc(var(--fx-len) * 7.142857%) wide, which IS the
//               distance to the victim.
//   --fx-index  courses, stakes, rungs and platters arrive in the REAL victim
//               order, not in a decorative sweep.
//   --fx-side   dust drifts away from the caster and the curtain wall rises on
//               the caster's own second rank, whichever end of the screen that
//               is. Nothing here says "the bottom of the board".
//   <BoardFrame> everything that means THE BOARD — washes, the wrap-around
//               chain boom leaving one board edge and re-entering at the other,
//               the rank-wide curtain wall, the drawbridge span. Never a fixed
//               percentage of the stage.
//
// Every scene handles all three roles: "lead" (the board-scale flourish on the
// cast square), "target" (the per-square hit) and "entrance" (the card arriving
// in a hand, ~56% of the crop, so no board takeover and no oversized stage).
// Every scene runs tell -> strike -> settle. Class prefix `g20-`.

import type { CSSProperties } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import "./g20RampartPlays.css";

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
 * The width is the geometry contract in one expression.
 */
const lane = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${50 + (dy - thick / 2) * CELL}%`,
  width: "calc(var(--fx-len, 3) * 7.142857%)",
  height: cells(thick),
});

/** Crenellated rook silhouette, the recurring actor of the batch. */
const ROOK = "M5 4h3v2.3h2.5V4h3v2.3H16V4h3v5.1l-1.7 1.4v6.9L19 20H5l1.7-2.6v-6.9L5 9.1z";

/* =============================================================================
   1. The Duke's Patent (t8) — the letters patent are drawn up on the drafting
   table: a straightedge snaps down the line, the patent unrolls along it, the
   compass swings the new diagonal spur off the straight rook line, the wax
   seal thunks on, and graphite dust drifts off the sheet.
   Palette: #e8c56a / #fff4d6 / #3a2a10.
   ========================================================================== */
function PatentDraft(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span
          className="g20-ent2 absolute block"
          style={st({ ...d(delayMs, 60), left: "8%", top: "56%", height: "3%", width: "84%", background: "#e8c56a" })}
        />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 190), left: "12%", top: "24%", width: "76%", height: "48%" })}>
          <rect x="3.5" y="7" width="17" height="10" fill="#3a2a10" stroke="#e8c56a" strokeWidth="1.1" />
          <path d="M3.5 7v10M20.5 7v10" stroke="#fff4d6" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 10.5h11M6.5 13.5h7" stroke="#e8c56a" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "52%", width: "30%", height: "30%" })}>
          <circle cx="12" cy="12" r="7" fill="#e8c56a" stroke="#3a2a10" strokeWidth="1.3" />
          <path d="M8.6 12h6.8M12 8.6v6.8" stroke="#3a2a10" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "62%", height: "6%", width: "88%", background: "#fff4d6" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 210), left: "22%", top: "22%", width: "56%", height: "56%" })}>
          <circle cx="12" cy="12" r="8" fill="#e8c56a" stroke="#3a2a10" strokeWidth="1.4" />
          <path d="M12 6.5l4 5.5-4 5.5-4-5.5z" fill="#3a2a10" />
        </svg>
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 400), ...box(1.4, 1.4), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })}
        />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span
            className="g20-wash absolute inset-0 block"
            style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(232,197,106,0.3), transparent 68%)" })}
          />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the straightedge is snapped down the whole line */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.14), background: "#fff4d6" })} />
        {/* strike: the patent unrolls along that line, rolled ends and all */}
        <span
          className="g20-pat-scroll absolute block"
          style={st({ ...d(delayMs, 250), ...lane(1.5), background: "linear-gradient(180deg, #3a2a10, #6a4f1c 40%, #3a2a10)", border: "1px solid #e8c56a" })}
        />
        {/* the compass scribes the new diagonal spur off the straight line */}
        <svg viewBox="0 0 24 24" className="g20-pat-spur absolute block" style={st({ ...d(delayMs, 380), ...box(3.4, 3.4, 1.4, -1.4) })}>
          <path d="M2 22L20 4" stroke="#e8c56a" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 2.4" />
          <path d="M20 4l-5.4 0.8 1.6 4.6z" fill="#fff4d6" />
        </svg>
        {/* the wax seal thunks onto the far end of the sheet, where the line ends */}
        <svg
          viewBox="0 0 24 24"
          className="g20-drop absolute block"
          style={st({ ...d(delayMs, 520), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 9.29%)", top: `${50 - 0.1 * CELL}%`, width: cells(2.6), height: cells(2.6) })}
        >
          <circle cx="12" cy="12" r="9" fill="#e8c56a" stroke="#3a2a10" strokeWidth="1.6" />
          <path d={ROOK} fill="#3a2a10" transform="translate(4.8 4.8) scale(0.6)" />
        </svg>
        {/* settle: graphite dust off the drawing */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 660), ...box(4, 2.2, 1, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.55), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   2. Wall of Faith (t8) — a consecrated course laid stone by stone, each block
   dropping in the real victim order with a lit chapel window in its face.
   Palette: #ffd9a0 / #fff4d6 / #2b2416.
   ========================================================================== */
const FAITH_STONES = [0, 1, 2, 3, 4, 5];

function FaithCourse(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "70%", height: "5%", width: "80%", background: "#2b2416" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "20%", width: "56%", height: "56%" })}>
          <rect x="3" y="6" width="18" height="13" fill="#2b2416" stroke="#ffd9a0" strokeWidth="1.2" />
          <path d="M12 8.4a3 3 0 0 1 3 3V17H9v-5.6a3 3 0 0 1 3-3z" fill="#fff4d6" />
        </svg>
        <span
          className="g20-ent3 absolute block"
          style={st({ ...d(delayMs, 440), left: "34%", top: "30%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })}
        />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "74%", height: "7%", width: "84%", background: "#ffd9a0" })} />
        <svg
          viewBox="0 0 24 24"
          className="g20-hit absolute block"
          style={st({ animationDelay: `calc(${delayMs + 200}ms + var(--fx-index, 0) * 26ms)`, left: "18%", top: "20%", width: "64%", height: "64%" })}
        >
          <rect x="2.5" y="5" width="19" height="14" fill="#2b2416" stroke="#ffd9a0" strokeWidth="1.3" />
          <path d="M12 8a3.2 3.2 0 0 1 3.2 3.2V17H8.8v-5.8A3.2 3.2 0 0 1 12 8z" fill="#fff4d6" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0, -0.4), borderRadius: "50%", background: "#fff4d6" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span
          className="g20-wash absolute inset-0 block"
          style={st({ ...d(delayMs, 60), background: "linear-gradient(180deg, rgba(255,217,160,0.32), transparent 60%)" })}
        />
      </BoardFrame>
      {/* tell: the course is chalked out before a stone is laid */}
      <span className="g20-tell absolute block" style={st({ ...d(delayMs, 120), ...box(6.4, 0.6, 0, 0.9), background: "#2b2416" })} />
      {/* strike: six consecrated blocks land in the real victim order */}
      {FAITH_STONES.map((i) => (
        <span
          key={i}
          className="g20-faith-stone absolute block"
          style={st({
            animationDelay: `calc(${delayMs + 260}ms + var(--fx-index, 0) * 18ms + ${i * 72}ms)`,
            ...box(1, 0.9, i - 2.5, 0.4),
            background: "linear-gradient(180deg, #6a5a38, #2b2416)",
            border: "1px solid #ffd9a0",
          })}
        />
      ))}
      {/* each block's window lights as it is set */}
      <svg viewBox="0 0 48 12" className="g20-faith-arch absolute block" style={st({ ...d(delayMs, 470), ...box(6, 0.9, 0, 0.4) })}>
        {FAITH_STONES.map((i) => (
          <path key={i} d={`M${3 + i * 8} 11V6.6a2.4 2.4 0 0 1 4.8 0V11z`} fill="#fff4d6" opacity="0.9" />
        ))}
      </svg>
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 560), ...box(1.6, 1.6, 0, -0.6), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
      {/* settle: censer smoke off the fresh mortar */}
      <span
        className="g20-dust absolute block"
        style={st({ ...d(delayMs, 700), ...box(6, 2.4, 0, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,217,160,0.5), transparent 70%)" })}
      />
    </BoardWideStage>
  );
}

/* =============================================================================
   3. Dead March (t8) — muffled drums set down the file. The drumline forms on
   the chalk, the sticks come down on the second beat, black crepe unfurls
   behind, and the heads breathe dust.
   Palette: #8d93a8 / #efe6d2 / #171a24.
   ========================================================================== */
const DRUMS = [0, 1, 2];

function DeadDrums(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "72%", height: "4%", width: "88%", background: "#171a24" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "26%", width: "60%", height: "48%" })}>
          <ellipse cx="12" cy="8.4" rx="8.4" ry="3.2" fill="#efe6d2" stroke="#171a24" strokeWidth="1.1" />
          <path d="M3.6 8.4v6.4c0 1.8 3.8 3.2 8.4 3.2s8.4-1.4 8.4-3.2V8.4" fill="#8d93a8" stroke="#171a24" strokeWidth="1.1" />
          <path d="M5 9.6l3.4 5.6M11 10.2v5.8M17.6 9.6l-3.4 5.6" stroke="#171a24" strokeWidth="0.9" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "6%", width: "40%", height: "40%" })}>
          <path d="M4 20L20 4" stroke="#efe6d2" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "48%", height: "10%", width: "92%", background: "linear-gradient(90deg, transparent, #8d93a8, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "24%", width: "60%", height: "52%" })}>
          <ellipse cx="12" cy="9" rx="8" ry="3" fill="#efe6d2" stroke="#171a24" strokeWidth="1.2" />
          <path d="M4 9v5.6c0 1.7 3.6 3 8 3s8-1.3 8-3V9" fill="#8d93a8" stroke="#171a24" strokeWidth="1.2" />
        </svg>
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(239,230,210,0.6), transparent 70%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(23,26,36,0.55), rgba(23,26,36,0.12) 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the column falls in along the line */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.16, 0.9), background: "#8d93a8" })} />
        {/* strike: three muffled drums, struck in order down the file */}
        {DRUMS.map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="g20-drum-head absolute block"
            style={st({ animationDelay: `calc(${delayMs + 280}ms + var(--fx-index, 0) * 22ms + ${i * 90}ms)`, ...box(1.7, 1.7, i * 1.5 + 0.7, 0) })}
          >
            <ellipse cx="12" cy="8.6" rx="8.6" ry="3.2" fill="#efe6d2" stroke="#171a24" strokeWidth="1.2" />
            <path d="M3.4 8.6v6c0 1.8 3.9 3.2 8.6 3.2s8.6-1.4 8.6-3.2v-6" fill="#8d93a8" stroke="#171a24" strokeWidth="1.2" />
            <path d="M5.2 9.8l3.4 5.4M12 10.4v5.6M18.8 9.8l-3.4 5.4" stroke="#171a24" strokeWidth="0.8" />
          </svg>
        ))}
        {/* the sticks come down */}
        <svg viewBox="0 0 24 24" className="g20-drum-stick absolute block" style={st({ ...d(delayMs, 400), ...box(2.4, 2.4, 0.9, -1.1) })}>
          <path d="M3 21L21 3" stroke="#efe6d2" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="3.4" cy="20.6" r="2" fill="#8d93a8" />
        </svg>
        {/* black crepe unfurls behind the march */}
        <span
          className="g20-crepe absolute block"
          style={st({ ...d(delayMs, 520), ...lane(1.1, -1.5), background: "linear-gradient(180deg, #171a24, rgba(23,26,36,0.1))" })}
        />
        {/* settle: dust off the heads */}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 660), ...box(5, 2.4, 1.6, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(239,230,210,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   4. The Long Siege (t8) — circumvallation. The trench opens the whole length
   of the line, palisade stakes are driven along it one after another, and the
   spoil is heaped on the near lip.
   Palette: #b08a52 / #ffeec6 / #241a0e.
   ========================================================================== */
const STAKES = [0, 1, 2, 3, 4];

function Circumvallation(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "60%", height: "12%", width: "88%", background: "#241a0e" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "22%", width: "84%", height: "42%" })}>
          {STAKES.map((i) => (
            <path key={i} d={`M${5 + i * 9.6} 22V7l2.6 3 2.6-3v15z`} fill="#b08a52" stroke="#241a0e" strokeWidth="0.9" />
          ))}
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 450), left: "24%", top: "62%", width: "52%", height: "16%", borderRadius: "999px", background: "radial-gradient(circle, #ffeec6, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "64%", height: "14%", width: "92%", background: "#241a0e" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 210), left: "26%", top: "16%", width: "48%", height: "62%" })}>
          <path d="M8 24V6l4 4 4-4v18z" fill="#b08a52" stroke="#241a0e" strokeWidth="1.2" />
        </svg>
        <span className="g20-spoil absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 0.8, 0, 1.1), borderRadius: "999px", background: "#b08a52" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 70), background: "radial-gradient(circle at 50% 50%, rgba(176,138,82,0.28), transparent 66%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the line of works is pegged out first */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.14, 0.4), background: "#ffeec6" })} />
        {/* strike: the ditch opens the real length of the line */}
        <span
          className="g20-trench absolute block"
          style={st({ ...d(delayMs, 240), ...lane(1.1, 0.5), background: "linear-gradient(180deg, #241a0e, #4a3418 70%, #241a0e)", border: "1px solid #b08a52" })}
        />
        {/* spoil heaped on the near lip */}
        <span className="g20-spoil absolute block" style={st({ ...d(delayMs, 360), ...lane(0.5, 1.2), borderRadius: "999px", background: "#b08a52" })} />
        {/* palisade stakes driven along it, one after another */}
        {STAKES.map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="g20-stake absolute block"
            style={st({ animationDelay: `calc(${delayMs + 420}ms + var(--fx-index, 0) * 20ms + ${i * 68}ms)`, ...box(0.8, 1.7, i * 1.05 + 0.6, -0.3) })}
          >
            <path d="M8 24V5l4 4.4 4-4.4v19z" fill="#ffeec6" stroke="#241a0e" strokeWidth="1.4" />
          </svg>
        ))}
        {/* settle: turned earth drifting off the cut */}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 640), ...box(5, 2.2, 1.6, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,198,0.45), transparent 72%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   5. World Serpent (t8) — the chain boom bites its own tail: the chain is
   drawn taut across the whole BOARD, the head slides out past one board edge
   and the tail comes back in at the other. The wrap is the point, so the whole
   layer lives inside <BoardFrame>.
   Palette: #6fd0a8 / #e8fff2 / #0e2a22.
   ========================================================================== */
function BoomChain(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "47%", height: "6%", width: "88%", borderRadius: "999px", background: "#0e2a22" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "30%", width: "88%", height: "40%" })}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={3 + i * 8.8} y="7" width="7.4" height="10" rx="2" fill="none" stroke="#6fd0a8" strokeWidth="2" />
          ))}
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "62%", top: "28%", width: "34%", height: "34%" })}>
          <path d="M4 12c0-4 4-7 8-7s8 3 8 7-4 7-8 7" fill="none" stroke="#e8fff2" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="17" cy="9.4" r="1.4" fill="#0e2a22" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "44%", height: "12%", width: "96%", background: "linear-gradient(90deg, transparent, #6fd0a8, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 210), left: "20%", top: "28%", width: "60%", height: "44%" })}>
          <rect x="3" y="6" width="8" height="12" rx="2" fill="none" stroke="#6fd0a8" strokeWidth="2.4" />
          <rect x="13" y="6" width="8" height="12" rx="2" fill="none" stroke="#e8fff2" strokeWidth="2.4" />
        </svg>
        <span className="g20-ring absolute block" style={st({ ...d(delayMs, 400), ...box(2.2, 2.2), borderRadius: "50%", border: "2px solid #6fd0a8" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(111,208,168,0.26), transparent 70%)" })} />
        {/* tell: the boom's own rank darkens across the whole board */}
        <span
          className="g20-tell absolute block"
          style={st({ ...d(delayMs, 130), left: "0%", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 5%)", height: "10%", width: "100%", background: "rgba(14,42,34,0.75)" })}
        />
        {/* strike: the chain drawn taut edge to edge */}
        <span
          className="g20-boom-chain absolute block"
          style={st({ ...d(delayMs, 260), left: "0%", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 3%)", height: "6%", width: "100%", borderRadius: "999px", background: "repeating-linear-gradient(90deg, #6fd0a8 0 5%, #0e2a22 5% 8%)" })}
        />
        {/* the head leaves by the far board edge... */}
        <svg viewBox="0 0 24 24" className="g20-boom-head absolute block" style={st({ ...d(delayMs, 380), left: "76%", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 8%)", width: "16%", height: "16%" })}>
          <path d="M2 12c3-5 8-7 13-7 4 0 7 2.6 7 6s-3 6-6.6 6" fill="none" stroke="#e8fff2" strokeWidth="3" strokeLinecap="round" />
          <circle cx="17.4" cy="8.6" r="1.6" fill="#0e2a22" />
        </svg>
        {/* ...and the tail arrives back in at the near one */}
        <svg viewBox="0 0 24 24" className="g20-boom-tail absolute block" style={st({ ...d(delayMs, 470), left: "6%", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 7%)", width: "14%", height: "14%" })}>
          <path d="M22 12c-4 0-7 2-9 5-1.6 2.4-4 3-6.6 2.2" fill="none" stroke="#6fd0a8" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* settle: the wake the boom leaves on the water */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 640), left: "12%", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 9%)", height: "18%", width: "76%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,255,242,0.4), transparent 72%)" })}
        />
      </BoardFrame>
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 560), ...box(1.8, 1.8), borderRadius: "50%", background: "radial-gradient(circle, #e8fff2, transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   6. Clay Colossus (t7) — the kiln: the two halves of the mould are drawn
   apart, the fired clay rook shoulders up out of them still glowing, crazing
   spreads over the shell, and ash lifts off it.
   Palette: #d2703a / #ffe2b8 / #2c1408.
   ========================================================================== */
function ClayKiln(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "76%", height: "6%", width: "76%", background: "#2c1408" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "18%", width: "48%", height: "62%" })}>
          <path d={ROOK} fill="#d2703a" stroke="#2c1408" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "28%", top: "24%", width: "44%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,184,0.85), transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "10%", width: "88%", background: "#d2703a" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "18%", width: "52%", height: "64%" })}>
          <path d={ROOK} fill="#ffe2b8" stroke="#2c1408" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.4, 0, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(210,112,58,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(210,112,58,0.32), transparent 66%)" })} />
      </BoardFrame>
      {/* tell: the kiln floor scorches under the mould */}
      <span className="g20-tell absolute block" style={st({ ...d(delayMs, 130), ...box(4.4, 1, 0, 1.5), borderRadius: "999px", background: "#2c1408" })} />
      {/* strike: the two halves of the mould are drawn apart */}
      <span
        className="g20-mould absolute block"
        style={st({ ...d(delayMs, 250), ...box(1.5, 3.4, -1.5, 0.1), "--mx": "-46%", "--mr": "-10deg", background: "linear-gradient(90deg, #2c1408, #6b3a1c)", border: "1px solid #d2703a" })}
      />
      <span
        className="g20-mould absolute block"
        style={st({ ...d(delayMs, 250), ...box(1.5, 3.4, 1.5, 0.1), "--mx": "46%", "--mr": "10deg", background: "linear-gradient(270deg, #2c1408, #6b3a1c)", border: "1px solid #d2703a" })}
      />
      {/* the fired rook shoulders up, still glowing */}
      <svg viewBox="0 0 24 24" className="g20-raise absolute block" style={st({ ...d(delayMs, 400), ...box(3, 3.6, 0, -0.1), filter: "drop-shadow(0 0 5px #d2703a)" })}>
        <path d={ROOK} fill="#d2703a" stroke="#ffe2b8" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
      {/* crazing spreads over the cooling shell */}
      <svg viewBox="0 0 24 24" className="g20-craze absolute block" style={st({ ...d(delayMs, 560), ...box(2.6, 3, 0, -0.1) })}>
        <path
          d="M12 3v6l-3 2.4 3 2.6-2 5M12 9l3.4 2.2-1.6 3.2 2.6 2.6M8.6 6.4L12 9M15.6 6L12 9"
          fill="none"
          stroke="#2c1408"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 620), ...box(1.3, 1.3, 0.9, -1.2), borderRadius: "50%", background: "#ffe2b8" })} />
      {/* settle: kiln ash lifting away from the caster's own side */}
      <span
        className="g20-dust absolute block"
        style={st({ ...d(delayMs, 700), left: `${50 - 2.2 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -15.7%)", width: cells(4.4), height: cells(2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,184,0.5), transparent 72%)" })}
      />
    </BoardWideStage>
  );
}

/* =============================================================================
   7. Palace Walls (t7) — a curtain wall goes up along the caster's OWN second
   rank, edge to edge of the board: the footing is struck, the wall course
   rises out of it, then the merlons pop up one bay at a time.
   Palette: #cfd6e0 / #fff4d6 / #232a38.
   ========================================================================== */
const BAYS = [0, 1, 2, 3, 4, 5, 6, 7];

function CurtainWall(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "70%", height: "6%", width: "88%", background: "#232a38" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "30%", width: "88%", height: "44%" })}>
          <path d="M2 10h4V6h4v4h4V6h4v4h4V6h4v4h4V6h4v4h4v12H2z" fill="#cfd6e0" stroke="#232a38" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "22%", top: "24%", width: "56%", height: "26%", borderRadius: "999px", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "72%", height: "10%", width: "92%", background: "#cfd6e0" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "26%", width: "72%", height: "52%" })}>
          <path d="M2 9h4V5h4v4h4V5h4v4h4v12H2z" fill="#fff4d6" stroke="#232a38" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0, -0.6), borderRadius: "50%", background: "#fff4d6" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(207,214,224,0.24), transparent 70%)" })} />
        {/* tell: the footing is struck along the caster's own second rank */}
        <span
          className="g20-tell absolute block"
          style={st({ ...d(delayMs, 130), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% + 3%)", height: "5%", width: "100%", background: "#232a38" })}
        />
        {/* strike: the wall course rises out of the footing, edge to edge */}
        <span
          className="g20-wall-band absolute block"
          style={st({ ...d(delayMs, 260), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 4%)", height: "8%", width: "100%", background: "linear-gradient(180deg, #cfd6e0, #6d7688 70%, #232a38)" })}
        />
        {/* the merlons pop up bay by bay along the finished course */}
        {BAYS.map((i) => (
          <span
            key={i}
            className="g20-merlon absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 420}ms + var(--fx-index, 0) * 16ms + ${i * 52}ms)`,
              left: `${i * 12.5 + 2.5}%`,
              top: "calc(50% + var(--fx-side, 1) * 31.25% - 9%)",
              height: "6%",
              width: "7.5%",
              background: "#fff4d6",
              border: "1px solid #232a38",
            })}
          />
        ))}
        {/* settle: mortar dust off the fresh course */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 640), left: "8%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 14%)", height: "22%", width: "84%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.4), transparent 74%)" })}
        />
      </BoardFrame>
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 560), ...box(1.8, 1.8), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   8. Castle Ditch (t6) — the ring ditch. Sappers scribe the circuit, the ditch
   is cut all the way round the king, spoil is thrown to the outer lip, and the
   water comes in behind it.
   Palette: #5ba7c9 / #dff4ff / #0f2733.
   ========================================================================== */
function RingDitch(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "72%", height: "6%", width: "84%", background: "#0f2733" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="#0f2733" strokeWidth="3.4" />
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="#5ba7c9" strokeWidth="1.6" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "30%", width: "40%", height: "40%" })}>
          <path d="M4 14c2.4-2 4-2 6 0s3.6 2 6 0 4-2 4 0" fill="none" stroke="#dff4ff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "56%", height: "14%", width: "92%", background: "#0f2733" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "22%", width: "68%", height: "56%" })}>
          <ellipse cx="12" cy="12" rx="10" ry="6.4" fill="#0f2733" stroke="#5ba7c9" strokeWidth="1.4" />
          <path d="M4 13c2-1.4 3.4-1.4 5 0s3 1.4 5 0 3.4-1.4 5 0" fill="none" stroke="#dff4ff" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="g20-water absolute block" style={st({ ...d(delayMs, 400), ...box(2.4, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(91,167,201,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(91,167,201,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the circuit is scribed on the ground */}
      <span
        className="g20-tell absolute block"
        style={st({ ...d(delayMs, 130), ...box(4.6, 1.1, 0, 1.7), borderRadius: "999px", background: "#0f2733" })}
      />
      {/* strike: the ditch is cut the whole way round the king */}
      <span
        className="g20-ditch-ring absolute block"
        style={st({ ...d(delayMs, 260), ...box(4.4, 4.4), borderRadius: "50%", border: `${cells(0.42)} solid #0f2733`, boxShadow: "0 0 6px rgba(15,39,51,0.9)" })}
      />
      {/* spoil thrown to the outer lip, leaning away from the caster */}
      <span
        className="g20-spoil absolute block"
        style={st({ ...d(delayMs, 380), ...box(4.9, 0.7, 0, 2.1), borderRadius: "999px", background: "#5ba7c9" })}
      />
      {/* the water comes in behind the diggers */}
      <span
        className="g20-water absolute block"
        style={st({ ...d(delayMs, 470), ...box(4.2, 4.2), borderRadius: "50%", border: `${cells(0.3)} solid #5ba7c9`, background: "radial-gradient(circle, transparent 58%, rgba(223,244,255,0.35) 70%, transparent 78%)" })}
      />
      {/* settle: chips of turned ground flung clear of the cut */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="g20-grit absolute block"
          style={st({
            ...d(delayMs, 600 + i * 40),
            ...box(0.42, 0.42, [-2.1, 2.1, -1.4, 1.4][i], [-2, -1.5, 2, 1.9][i]),
            "--sx": ["-150%", "170%", "-120%", "140%"][i],
            "--sy": "calc(var(--fx-side, 1) * -160%)",
            borderRadius: "1px",
            background: "#dff4ff",
          })}
        />
      ))}
    </BoardWideStage>
  );
}

/* =============================================================================
   9. Dowry (t6) — the dowry chest is carried in on poles, set down on the home
   rank, its lid swings open, the returned rook is lifted out of it, and the
   coin overflow spills off the rim.
   Palette: #e0b45c / #fff2cf / #2e2210.
   ========================================================================== */
const COINS = [0, 1, 2, 3];

function DowryChest(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "74%", height: "6%", width: "80%", background: "#2e2210" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "26%", width: "64%", height: "52%" })}>
          <path d="M3 11a9 5 0 0 1 18 0v8H3z" fill="#e0b45c" stroke="#2e2210" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M3 13h18M11 13h2v4h-2z" fill="#2e2210" stroke="#2e2210" strokeWidth="0.9" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "10%", width: "32%", height: "32%" })}>
          <circle cx="12" cy="12" r="7" fill="#fff2cf" stroke="#2e2210" strokeWidth="1.2" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "70%", height: "10%", width: "88%", background: "#e0b45c" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "66%" })}>
          <path d={ROOK} fill="#fff2cf" stroke="#2e2210" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.3, 1.3, 0.4, -0.8), borderRadius: "50%", background: "#fff2cf" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(224,180,92,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the bearers' shadow arrives from the caster's own home rank */}
      <span
        className="g20-tell absolute block"
        style={st({ ...d(delayMs, 120), left: `${50 - 2.5 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * 12.9%)", width: cells(5), height: cells(0.9), borderRadius: "999px", background: "#2e2210" })}
      />
      {/* strike: the chest is carried in on its poles */}
      <span
        className="g20-pole absolute block"
        style={st({ ...d(delayMs, 240), ...box(6.4, 0.34, 0, -0.4), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #e0b45c 18%, #e0b45c 82%, transparent)" })}
      />
      <svg viewBox="0 0 24 24" className="g20-drop absolute block" style={st({ ...d(delayMs, 330), ...box(3.4, 2.6, 0, 0.9) })}>
        <path d="M2 8h20v13H2z" fill="#6b4f1e" stroke="#2e2210" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M2 12h20M11 12h2v5h-2z" fill="#2e2210" stroke="#2e2210" strokeWidth="1" />
      </svg>
      {/* the lid swings open on its hinge */}
      <svg viewBox="0 0 24 12" className="g20-swing absolute block" style={st({ ...d(delayMs, 430), ...box(3.4, 1.3, 0, -0.4) })}>
        <path d="M1 11a11 8 0 0 1 22 0z" fill="#e0b45c" stroke="#2e2210" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      {/* the returned rook is lifted out */}
      <svg viewBox="0 0 24 24" className="g20-raise absolute block" style={st({ ...d(delayMs, 520), ...box(2.2, 2.8, 0, -0.4), filter: "drop-shadow(0 0 4px #fff2cf)" })}>
        <path d={ROOK} fill="#fff2cf" stroke="#2e2210" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      {/* settle: the coin overflow spills off the rim */}
      {COINS.map((i) => (
        <span
          key={i}
          className="g20-coin absolute block"
          style={st({
            ...d(delayMs, 620 + i * 45),
            ...box(0.5, 0.5, [-1.5, -0.6, 0.7, 1.6][i], 0.6),
            "--sx": ["-190%", "-90%", "110%", "200%"][i],
            borderRadius: "50%",
            background: "#e0b45c",
            border: "1px solid #2e2210",
          })}
        />
      ))}
    </BoardWideStage>
  );
}

/* =============================================================================
   10. Banquet of Dust (t6) — the long table is set down the line, a platter
   lands at every place in the real victim order, the cloches lift together,
   and there is nothing under them but a rising plume of dust.
   Palette: #a89877 / #f2e6cc / #241d12.
   ========================================================================== */
const PLACES = [0, 1, 2, 3];

function DustBanquet(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "64%", height: "8%", width: "88%", background: "#241d12" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "26%", width: "52%", height: "44%" })}>
          <path d="M3 16a9 8 0 0 1 18 0z" fill="#a89877" stroke="#241d12" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="12" cy="6.6" r="1.5" fill="#f2e6cc" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "30%", top: "22%", width: "40%", height: "34%", borderRadius: "50%", background: "radial-gradient(circle, rgba(242,230,204,0.7), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "66%", height: "9%", width: "88%", background: "#a89877" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "28%", width: "64%", height: "44%" })}>
          <ellipse cx="12" cy="17" rx="10" ry="3" fill="#f2e6cc" stroke="#241d12" strokeWidth="1.1" />
          <path d="M3.4 16a8.6 8 0 0 1 17.2 0z" fill="#a89877" stroke="#241d12" strokeWidth="1.2" />
        </svg>
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.6, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,230,204,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(168,152,119,0.3), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the cloth is drawn the length of the table */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.9, 0.5), background: "#241d12" })} />
        {/* strike: a platter at every place, in the real victim order */}
        {PLACES.map((i) => (
          <span
            key={i}
            className="g20-platter absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 250}ms + var(--fx-index, 0) * 24ms + ${i * 78}ms)`,
              ...box(1.1, 0.44, i * 1.25 + 0.7, 0.35),
              borderRadius: "999px",
              background: "#f2e6cc",
            })}
          />
        ))}
        {/* the cloches lift together on nothing at all */}
        {PLACES.map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 16"
            className="g20-cloche absolute block"
            style={st({ ...d(delayMs, 400 + i * 40), ...box(1.05, 0.75, i * 1.25 + 0.7, 0.05) })}
          >
            <path d="M1.5 15a10.5 12 0 0 1 21 0z" fill="#a89877" stroke="#241d12" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="12" cy="2.6" r="1.6" fill="#f2e6cc" />
          </svg>
        ))}
        {/* settle: the feast itself, drifting off the plates */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 590), ...lane(2.6, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,230,204,0.5), transparent 72%)" })}
        />
        <span className="g20-grit absolute block" style={st({ ...d(delayMs, 660), ...box(0.42, 0.42, 1.4, -0.4), "--sx": "180%", "--sy": "calc(var(--fx-side, 1) * -170%)", borderRadius: "50%", background: "#f2e6cc" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   11. Ivory Tower (t6) — an ivory siege tower rolls up and rises, but its ramp
   only ever falls HOMEWARD: an ivory bar drops across the forward direction,
   so the king can go sideways or back and never on.
   Palette: #eadfc6 / #fff6e2 / #38301f.
   ========================================================================== */
function IvoryTower(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "16%", top: "78%", height: "6%", width: "68%", background: "#38301f" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "12%", width: "44%", height: "70%" })}>
          <path d="M6 23V5h3V2h6v3h3v18z" fill="#eadfc6" stroke="#38301f" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M10 10h4v5h-4z" fill="#38301f" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "26%", top: "40%", width: "48%", height: "12%", borderRadius: "999px", background: "#fff6e2" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "74%", height: "8%", width: "88%", background: "#eadfc6" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "12%", width: "44%", height: "70%" })}>
          <path d="M6 23V5h3V2h6v3h3v18z" fill="#fff6e2" stroke="#38301f" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span
          className="g20-bar absolute block"
          style={st({ ...d(delayMs, 400), left: "10%", top: "calc(50% + var(--fx-side, 1) * -26%)", height: "9%", width: "80%", borderRadius: "999px", background: "#eadfc6" })}
        />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(234,223,198,0.26), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the tower's shadow rolls up before the tower does */}
      <span className="g20-tell absolute block" style={st({ ...d(delayMs, 130), ...box(3.6, 0.9, 0, 2), borderRadius: "999px", background: "#38301f" })} />
      {/* strike: the ivory tower rises on the cast square */}
      <svg viewBox="0 0 24 24" className="g20-ivory absolute block" style={st({ ...d(delayMs, 250), ...box(3, 4.6, 0, -0.4), filter: "drop-shadow(0 0 5px #fff6e2)" })}>
        <path d="M6 23V5h3V1.6h6V5h3v18z" fill="#eadfc6" stroke="#38301f" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M10 9.4h4v5.2h-4zM6 18.6h12" fill="#38301f" stroke="#38301f" strokeWidth="1" />
      </svg>
      {/* the ramp falls, and only ever homeward */}
      <span
        className="g20-swing absolute block"
        style={st({ ...d(delayMs, 420), left: "50%", top: "calc(50% + var(--fx-side, 1) * 10.7% - 1.6%)", height: cells(0.45), width: cells(2.4), background: "linear-gradient(90deg, #eadfc6, #38301f)" })}
      />
      {/* the bar comes down across the forward direction */}
      <span
        className="g20-bar absolute block"
        style={st({ ...d(delayMs, 520), left: `${50 - 2.2 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * -17.9%)", height: cells(0.5), width: cells(4.4), borderRadius: "999px", background: "#fff6e2", boxShadow: "0 0 6px rgba(234,223,198,0.9)" })}
      />
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 600), ...box(1.4, 1.4, 1, -2), borderRadius: "50%", background: "#fff6e2" })} />
      {/* settle: ivory dust off the fresh cut stone */}
      <span className="g20-dust absolute block" style={st({ ...d(delayMs, 680), ...box(4, 2.2, 0, -2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,246,226,0.45), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   12. Moat Diggers (t6) — sappers at work: the spade bites, four pits open in
   the real victim order, one of them gets planked over as the defenders' one
   bridge, and the spoil flies clear.
   Palette: #8a6b45 / #ffe6bc / #1d1409.
   ========================================================================== */
const PITS: Array<[number, number]> = [
  [-1.9, -1.4],
  [1.7, -1.9],
  [-1.5, 1.7],
  [2, 1.3],
];

function SapperPits(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "72%", height: "8%", width: "80%", background: "#1d1409" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "12%", width: "44%", height: "70%" })}>
          <path d="M11 1h2v13h-2z" fill="#8a6b45" stroke="#1d1409" strokeWidth="1" />
          <path d="M7.5 13h9v4.5a4.5 4.5 0 0 1-9 0z" fill="#ffe6bc" stroke="#1d1409" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "26%", top: "66%", width: "48%", height: "18%", borderRadius: "50%", background: "#1d1409" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "58%", height: "12%", width: "92%", background: "#8a6b45" })} />
        <span
          className="g20-hit absolute block"
          style={st({ animationDelay: `calc(${delayMs + 200}ms + var(--fx-index, 0) * 30ms)`, ...box(2.6, 1.8), borderRadius: "50%", background: "radial-gradient(circle, #1d1409 55%, #8a6b45 78%, transparent)" })}
        />
        <span className="g20-grit absolute block" style={st({ ...d(delayMs, 400), ...box(0.5, 0.5, 0.6, -0.4), "--sx": "160%", "--sy": "calc(var(--fx-side, 1) * -180%)", borderRadius: "1px", background: "#ffe6bc" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(138,107,69,0.3), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: the spade bites the turf */}
      <svg viewBox="0 0 24 24" className="g20-spade absolute block" style={st({ ...d(delayMs, 120), ...box(2.2, 3.2, -0.4, -1) })}>
        <path d="M11 1.5h2V13h-2z" fill="#8a6b45" stroke="#1d1409" strokeWidth="1" />
        <path d="M7.4 12.6h9.2v4.8a4.6 4.6 0 0 1-9.2 0z" fill="#ffe6bc" stroke="#1d1409" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      {/* strike: four pits open in the real victim order */}
      {PITS.map(([x, y], i) => (
        <span
          key={i}
          className="g20-pit absolute block"
          style={st({
            animationDelay: `calc(${delayMs + 260}ms + var(--fx-index, 0) * 22ms + ${i * 86}ms)`,
            ...box(1.7, 1.15, x, y),
            borderRadius: "50%",
            background: "radial-gradient(circle, #1d1409 58%, #4a3418 80%, transparent)",
          })}
        />
      ))}
      {/* one pit is planked over: the defenders' single bridge */}
      <span
        className="g20-plank absolute block"
        style={st({ ...d(delayMs, 470), ...box(2, 0.42, PITS[3][0], PITS[3][1]), background: "repeating-linear-gradient(90deg, #8a6b45 0 22%, #1d1409 22% 26%)" })}
      />
      {/* settle: spoil flung clear of the cuts, away from the caster */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="g20-grit absolute block"
          style={st({
            ...d(delayMs, 580 + i * 55),
            ...box(0.5, 0.5, [-1.6, 1.5, 0][i], [-1, -1.5, 1.4][i]),
            "--sx": ["-170%", "180%", "60%"][i],
            "--sy": "calc(var(--fx-side, 1) * -190%)",
            borderRadius: "1px",
            background: "#ffe6bc",
          })}
        />
      ))}
      <span className="g20-dust absolute block" style={st({ ...d(delayMs, 700), ...box(5.2, 3, 0, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,230,188,0.35), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   13. Rusted Battlements (t6) — the strap hinge of the wall gate. Damp gets
   in, rust blooms out of the bolt, the hinge tries its swing and seizes half
   open, and scale sheds off it.
   Palette: #b06a35 / #ffd9a8 / #2a1608.
   ========================================================================== */
const FLAKES = [0, 1, 2, 3];

function RustHinge(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "48%", height: "8%", width: "84%", background: "#2a1608" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "48%" })}>
          <path d="M2 8h20l-3 4 3 4H2z" fill="#b06a35" stroke="#2a1608" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="6" cy="12" r="2" fill="#ffd9a8" stroke="#2a1608" strokeWidth="1" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "56%", width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(176,106,53,0.85), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "46%", height: "10%", width: "88%", background: "#b06a35" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "64%", height: "52%" })}>
          <path d="M2 7h20l-3.4 5 3.4 5H2z" fill="#ffd9a8" stroke="#2a1608" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="6.4" cy="12" r="2.2" fill="#b06a35" stroke="#2a1608" strokeWidth="1" />
        </svg>
        <span className="g20-flake absolute block" style={st({ ...d(delayMs, 400), ...box(0.5, 0.34, 0.4, 0.2), borderRadius: "1px", background: "#b06a35" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(176,106,53,0.28), transparent 68%)" })} />
      </BoardFrame>
      {/* tell: damp creeping along the jamb */}
      <span className="g20-tell absolute block" style={st({ ...d(delayMs, 120), ...box(1, 4, -2.1, 0), background: "#2a1608" })} />
      {/* strike: rust blooms out of the bolt */}
      <span
        className="g20-rustbloom absolute block"
        style={st({ ...d(delayMs, 250), ...box(4.4, 4.4, -0.4, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(176,106,53,0.9) 10%, rgba(176,106,53,0.35) 46%, transparent 72%)" })}
      />
      {/* the hinge tries its swing and seizes half open */}
      <svg viewBox="0 0 24 24" className="g20-hinge absolute block" style={st({ ...d(delayMs, 340), ...box(5, 2.6, 0.2, 0), filter: "drop-shadow(0 0 4px #2a1608)" })}>
        <path d="M1.5 6h21l-4 6 4 6h-21z" fill="#b06a35" stroke="#2a1608" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M8 6v12M14 6v12" stroke="#2a1608" strokeWidth="0.9" />
        <circle cx="4.4" cy="12" r="2.2" fill="#ffd9a8" stroke="#2a1608" strokeWidth="1" />
      </svg>
      <span className="g20-shudder absolute block" style={st({ ...d(delayMs, 470), ...box(5.2, 0.3, 0.2, 1.5), background: "#2a1608" })} />
      {/* settle: scale sheds off the seized iron */}
      {FLAKES.map((i) => (
        <span
          key={i}
          className="g20-flake absolute block"
          style={st({ ...d(delayMs, 580 + i * 60), ...box(0.44, 0.3, [-1.4, -0.2, 1, 2][i], 0.9), borderRadius: "1px", background: i % 2 ? "#b06a35" : "#ffd9a8" })}
        />
      ))}
      <span
        className="g20-dust absolute block"
        style={st({ ...d(delayMs, 700), left: `${50 - 2.1 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * 5% + 3%)", width: cells(4.6), height: cells(2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,217,168,0.35), transparent 74%)" })}
      />
    </BoardWideStage>
  );
}

/* =============================================================================
   14. Wagon Ruts (t5) — the battering ram's carriage runs the REAL length of
   the file it attacks: the track is scored ahead of it, the carriage rolls the
   whole line, the iron head recoils off the far end, and a pair of ruts is
   left cut into the ground behind it.
   Palette: #9a7248 / #ffe8c0 / #201509.
   ========================================================================== */
function RamCarriage(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "4%", top: "66%", height: "7%", width: "92%", background: "#201509" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "28%", width: "88%", height: "40%" })}>
          <rect x="4" y="9" width="34" height="5" rx="2" fill="#9a7248" stroke="#201509" strokeWidth="1.1" />
          <path d="M38 7.6h6v7.8h-6z" fill="#ffe8c0" stroke="#201509" strokeWidth="1.1" />
          <circle cx="12" cy="18" r="3.4" fill="none" stroke="#201509" strokeWidth="2" />
          <circle cx="28" cy="18" r="3.4" fill="none" stroke="#201509" strokeWidth="2" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "72%", top: "34%", width: "24%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, #ffe8c0, transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "48%", height: "12%", width: "96%", background: "linear-gradient(90deg, transparent, #9a7248, #ffe8c0)" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "26%", width: "56%", height: "48%" })}>
          <path d="M2 10h14v4H2z" fill="#9a7248" stroke="#201509" strokeWidth="1.1" />
          <path d="M16 8h6v8h-6z" fill="#ffe8c0" stroke="#201509" strokeWidth="1.2" />
        </svg>
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 400), ...box(2, 1.4, 0.4, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,232,192,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(154,114,72,0.3), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the track is scored ahead of the carriage */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.12, 0.5), background: "#ffe8c0" })} />
        {/* strike: the carriage runs the real length of the file */}
        <svg viewBox="0 0 48 24" className="g20-run absolute block" style={st({ ...d(delayMs, 240), ...box(1, 1, 0, 0) })}>
          <rect x="2" y="9" width="34" height="5.4" rx="2" fill="#9a7248" stroke="#201509" strokeWidth="1.2" />
          <path d="M8 14.4h22v3.4H8z" fill="#201509" />
          <circle cx="11" cy="19.4" r="3.2" fill="none" stroke="#201509" strokeWidth="2" />
          <circle cx="27" cy="19.4" r="3.2" fill="none" stroke="#201509" strokeWidth="2" />
        </svg>
        {/* the iron head hits and recoils off the far end of the run */}
        <svg viewBox="0 0 48 24" className="g20-ram-head absolute block" style={st({ ...d(delayMs, 260), ...box(1, 1, 0, 0), filter: "drop-shadow(0 0 4px #ffe8c0)" })}>
          <path d="M36 7.4h9.4v9.2H36z" fill="#ffe8c0" stroke="#201509" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M39 9.4h4v5.2h-4z" fill="#201509" />
        </svg>
        {/* a pair of ruts cut the whole way down the line */}
        <span className="g20-rut absolute block" style={st({ ...d(delayMs, 380), ...lane(0.18, 0.95), background: "#201509" })} />
        <span className="g20-rut absolute block" style={st({ ...d(delayMs, 420), ...lane(0.18, 1.35), background: "#201509" })} />
        {/* the gate takes it, at the real far end of the run */}
        <span
          className="g20-shudder absolute block"
          style={st({ ...d(delayMs, 540), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 6.43%)", top: `${50 - 1.3 * CELL}%`, width: cells(1.8), height: cells(2.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,232,192,0.5), transparent 70%)" })}
        />
        {/* settle: the dust the wheels raise, drifting off the caster's line */}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 640), ...lane(3, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(154,114,72,0.45), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   15. Charm Bracelet (t4) — the bracelet: the chain arc swings closed, two
   charms drop onto it and settle, and the clasp catches with a glint.
   Palette: #e2a6b8 / #fff2e0 / #2c1a22.
   ========================================================================== */
function CharmClasp(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "46%", height: "5%", width: "76%", borderRadius: "999px", background: "#e2a6b8" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <circle cx="12" cy="12" r="8.4" fill="none" stroke="#e2a6b8" strokeWidth="2.4" strokeDasharray="3 2" />
          <path d="M9 19.4l1.6 3.2M15 19.4l-1.6 3.2" stroke="#fff2e0" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "40%", top: "12%", width: "20%", height: "20%", borderRadius: "50%", background: "#fff2e0" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "50%", height: "8%", width: "84%", borderRadius: "999px", background: "#e2a6b8" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "22%", width: "52%", height: "56%" })}>
          <path d="M12 21S3.6 15.4 3.6 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.4 2.6C20.4 15.4 12 21 12 21z" fill="#fff2e0" stroke="#2c1a22" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.1, 1.1, 0.5, -0.6), borderRadius: "50%", background: "#fff2e0" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(226,166,184,0.26), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the two wrists the bracelet will claim */}
      <span className="g20-tell absolute block" style={st({ ...d(delayMs, 120), ...box(4.6, 0.8, 0, 1.9), borderRadius: "999px", background: "#2c1a22" })} />
      {/* strike: the chain arc swings closed around the cast square */}
      <span
        className="g20-bracelet absolute block"
        style={st({ ...d(delayMs, 250), ...box(4.2, 4.2), borderRadius: "50%", border: `${cells(0.26)} dashed #e2a6b8`, boxShadow: "0 0 6px rgba(226,166,184,0.8)" })}
      />
      {/* two charms drop onto it and settle */}
      <svg viewBox="0 0 24 24" className="g20-charm absolute block" style={st({ ...d(delayMs, 380), ...box(1.5, 1.5, -1.3, 1.5) })}>
        <path d="M12 21.5S3.4 15.6 3.4 9.6A4.7 4.7 0 0 1 12 6.9a4.7 4.7 0 0 1 8.6 2.7c0 6-8.6 11.9-8.6 11.9z" fill="#fff2e0" stroke="#2c1a22" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 24 24" className="g20-charm absolute block" style={st({ ...d(delayMs, 450), ...box(1.5, 1.5, 1.3, 1.5) })}>
        <path d={ROOK} fill="#e2a6b8" stroke="#2c1a22" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      {/* the clasp catches */}
      <span
        className="g20-glint absolute block"
        style={st({ ...d(delayMs, 540), left: "50%", top: "calc(50% + var(--fx-side, 1) * -15%)", height: cells(1.2), width: cells(1.2), borderRadius: "50%", background: "radial-gradient(circle, #fff2e0, transparent 70%)" })}
      />
      <span className="g20-ring absolute block" style={st({ ...d(delayMs, 620), ...box(5.4, 5.4), borderRadius: "50%", border: "2px solid #e2a6b8" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   16. Pawn Bulwark (t4) — gabions. Wicker baskets are set in a row across the
   board a rank ahead of the caster's pawns, then filled with earth until the
   line is solid.
   Palette: #a8a06a / #f6efd0 / #22200f.
   ========================================================================== */
function GabionLine(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "6%", width: "84%", background: "#22200f" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "28%", width: "84%", height: "46%" })}>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={4 + i * 15} y="5" width="12" height="17" fill="#a8a06a" stroke="#22200f" strokeWidth="1.2" />
              <path d={`M${4 + i * 15} 10h12M${4 + i * 15} 15h12M${10 + i * 15} 5v17`} stroke="#22200f" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "20%", top: "20%", width: "60%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, #f6efd0, transparent 74%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "76%", height: "8%", width: "88%", background: "#a8a06a" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "22%", width: "48%", height: "60%" })}>
          <rect x="3" y="4" width="18" height="18" fill="#f6efd0" stroke="#22200f" strokeWidth="1.4" />
          <path d="M3 10h18M3 16h18M12 4v18" stroke="#22200f" strokeWidth="1" />
        </svg>
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 400), ...box(1.8, 1.2, 0, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,239,208,0.55), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(168,160,106,0.26), transparent 70%)" })} />
        {/* tell: the ground is levelled a rank ahead of the caster's pawns */}
        <span
          className="g20-tell absolute block"
          style={st({ ...d(delayMs, 130), left: "0%", top: "calc(50% + var(--fx-side, 1) * 18.75% + 4%)", height: "4%", width: "100%", background: "#22200f" })}
        />
        {/* strike: the baskets are set in a row, one bay at a time */}
        {BAYS.map((i) => (
          <span
            key={i}
            className="g20-gabion absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 250}ms + var(--fx-index, 0) * 18ms + ${i * 54}ms)`,
              left: `${i * 12.5 + 1.5}%`,
              top: "calc(50% + var(--fx-side, 1) * 18.75% - 5%)",
              height: "9%",
              width: "9.5%",
              background: "repeating-linear-gradient(90deg, #a8a06a 0 30%, #22200f 30% 36%)",
              border: "1px solid #22200f",
            })}
          />
        ))}
        {/* then they are filled until the line is solid */}
        <span
          className="g20-fill absolute block"
          style={st({ ...d(delayMs, 470), left: "1.5%", top: "calc(50% + var(--fx-side, 1) * 18.75% - 4%)", height: "8%", width: "97%", background: "linear-gradient(180deg, #f6efd0, #6d6836)" })}
        />
        {/* settle: earth dust drifting off the fill, away from the caster */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 620), left: "6%", top: "calc(50% + var(--fx-side, 1) * 18.75% - 12%)", height: "20%", width: "88%", borderRadius: "50%", background: "radial-gradient(circle, rgba(246,239,208,0.38), transparent 74%)" })}
        />
      </BoardFrame>
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 560), ...box(1.6, 1.6), borderRadius: "50%", background: "radial-gradient(circle, #f6efd0, transparent 72%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   17. Town Walls (t4) — the drawbridge. The gatehouse braces, the chains snap
   taut, and the deck slams down across the caster's second rank, shaking the
   whole span.
   Palette: #c9a06a / #ffeccb / #241a0d.
   ========================================================================== */
function Drawbridge(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "72%", height: "7%", width: "88%", background: "#241a0d" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "60%" })}>
          <path d="M3 22V8l4-4h10l4 4v14z" fill="#c9a06a" stroke="#241a0d" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M9 22v-7a3 3 0 0 1 6 0v7z" fill="#241a0d" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "26%", top: "60%", width: "48%", height: "12%", borderRadius: "999px", background: "#ffeccb" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "70%", height: "10%", width: "92%", background: "#c9a06a" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "50%" })}>
          <rect x="2" y="8" width="20" height="8" fill="#ffeccb" stroke="#241a0d" strokeWidth="1.3" />
          <path d="M6 8v8M12 8v8M18 8v8" stroke="#241a0d" strokeWidth="1" />
        </svg>
        <span className="g20-shudder absolute block" style={st({ ...d(delayMs, 400), ...box(2.4, 0.3, 0, 1), background: "#241a0d" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(201,160,106,0.28), transparent 70%)" })} />
        {/* tell: the chains snap taut over the gate */}
        <span
          className="g20-chain-taut absolute block"
          style={st({ ...d(delayMs, 120), left: "24%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 16%)", height: "16%", width: "3%", background: "repeating-linear-gradient(180deg, #241a0d 0 26%, #c9a06a 26% 40%)" })}
        />
        <span
          className="g20-chain-taut absolute block"
          style={st({ ...d(delayMs, 150), left: "73%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 16%)", height: "16%", width: "3%", background: "repeating-linear-gradient(180deg, #241a0d 0 26%, #c9a06a 26% 40%)" })}
        />
        {/* strike: the deck slams down across the whole rank */}
        <span
          className="g20-swing absolute block"
          style={st({ ...d(delayMs, 280), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 4.5%)", height: "9%", width: "100%", background: "repeating-linear-gradient(90deg, #c9a06a 0 5%, #241a0d 5% 6.4%)" })}
        />
        {/* the span takes the shock */}
        <span
          className="g20-shudder absolute block"
          style={st({ ...d(delayMs, 430), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% + 5%)", height: "3%", width: "100%", background: "#ffeccb" })}
        />
        {/* settle: dust jumps off the roadway */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 600), left: "5%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 13%)", height: "22%", width: "90%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,203,0.4), transparent 74%)" })}
        />
      </BoardFrame>
      {/* the gatehouse the bridge hangs from, on the cast square */}
      <svg viewBox="0 0 24 24" className="g20-raise absolute block" style={st({ ...d(delayMs, 350), ...box(3, 3.4, 0, -0.7), filter: "drop-shadow(0 0 4px #ffeccb)" })}>
        <path d="M3 22V7.4L7 3.4h10l4 4V22z" fill="#c9a06a" stroke="#241a0d" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9.2 22v-6.6a2.8 2.8 0 0 1 5.6 0V22z" fill="#241a0d" />
      </svg>
    </BoardWideStage>
  );
}

/* =============================================================================
   18. Feuding Towers (t4) — the surveyor's cord. Two towers stand at either
   end of the line, the cord is strung dead straight between them, then it is
   cut and both towers turn their backs.
   Palette: #d1605a / #ffe3cf / #2a1210.
   ========================================================================== */
function SurveyorLine(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "48%", height: "4%", width: "80%", background: "#ffe3cf" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "22%", width: "88%", height: "56%" })}>
          <path d="M4 23V7h3V4h6v3h3v16z" fill="#d1605a" stroke="#2a1210" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M32 23V7h3V4h6v3h3v16z" fill="#d1605a" stroke="#2a1210" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "38%", top: "34%", width: "24%", height: "24%" })}>
          <path d="M5 5l14 14M19 5L5 19" stroke="#ffe3cf" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "48%", height: "5%", width: "96%", background: "#ffe3cf" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "30%", top: "14%", width: "40%", height: "68%" })}>
          <path d="M5 23V6h3.4V2.6h7.2V6H19v17z" fill="#d1605a" stroke="#2a1210" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-glint absolute block" style={st({ ...d(delayMs, 400), left: "32%", top: "32%", width: "36%", height: "36%" })}>
          <path d="M5 5l14 14M19 5L5 19" stroke="#ffe3cf" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(209,96,90,0.24), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the sight swings along the line before the cord goes up */}
        <span className="g20-sweep absolute block" style={st({ ...d(delayMs, 110), ...lane(0.1, 0), background: "linear-gradient(90deg, #ffe3cf, transparent)" })} />
        {/* strike: the cord is strung dead straight, then cut */}
        <span className="g20-cord absolute block" style={st({ ...d(delayMs, 260), ...lane(0.16, 0), background: "#ffe3cf", boxShadow: "0 0 5px rgba(255,227,207,0.9)" })} />
        {/* the two towers, one at each end of the real line */}
        <svg viewBox="0 0 24 24" className="g20-twr absolute block" style={st({ ...d(delayMs, 190), ...box(1.6, 2.6, 0, -0.5), "--tw": "-7deg" })}>
          <path d="M5 23V6h3.4V2.6h7.2V6H19v17z" fill="#d1605a" stroke="#2a1210" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M10 12h4v5h-4z" fill="#2a1210" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="g20-twr absolute block"
          style={st({ ...d(delayMs, 230), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 5.714%)", top: `${50 - 1.8 * CELL}%`, width: cells(1.6), height: cells(2.6), "--tw": "7deg" })}
        >
          <path d="M5 23V6h3.4V2.6h7.2V6H19v17z" fill="#d1605a" stroke="#2a1210" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M10 12h4v5h-4z" fill="#2a1210" />
        </svg>
        {/* settle: the cut ends whip apart */}
        <span className="g20-grit absolute block" style={st({ ...d(delayMs, 560), ...box(0.5, 0.5, 1, 0), "--sx": "-120%", "--sy": "calc(var(--fx-side, 1) * -180%)", borderRadius: "1px", background: "#ffe3cf" })} />
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 660), ...lane(2.2, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(209,96,90,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   19. Wet Powder (t4) — the powder train. The barrel is set at the head of the
   file, the fuse is run down the line, and it drowns most of the way along:
   one damp sputter, wet smoke, and no shot at all.
   Palette: #6f8f7a / #e6f2e2 / #14201a.
   ========================================================================== */
function WetFuse(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "58%", height: "5%", width: "84%", background: "#14201a" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "24%", width: "56%", height: "56%" })}>
          <path d="M6 5h12v14H6z" fill="#6f8f7a" stroke="#14201a" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6 9h12M6 15h12" stroke="#14201a" strokeWidth="1" />
          <path d="M12 5c0-2.4 3-2 3-4" fill="none" stroke="#e6f2e2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "54%", top: "6%", width: "30%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, rgba(230,242,226,0.75), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "56%", height: "7%", width: "92%", background: "#6f8f7a" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "22%", width: "48%", height: "56%" })}>
          <path d="M5.5 4h13v16h-13z" fill="#e6f2e2" stroke="#14201a" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5.5 9h13M5.5 15h13" stroke="#14201a" strokeWidth="1.1" />
        </svg>
        <span className="g20-fizz absolute block" style={st({ ...d(delayMs, 400), ...box(1.6, 1.6, 0, -0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(230,242,226,0.7), transparent 70%)" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(111,143,122,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the damp ground the train has to cross */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.5, 0.6), background: "#14201a" })} />
        {/* strike: the barrel is set, the fuse runs down the file... */}
        <svg viewBox="0 0 24 24" className="g20-barrel absolute block" style={st({ ...d(delayMs, 240), ...box(2, 2.4, 0, -0.2) })}>
          <path d="M5 4h14v16H5z" fill="#6f8f7a" stroke="#14201a" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M5 8.4h14M5 15.6h14" stroke="#14201a" strokeWidth="1.1" />
          <path d="M12 4c0-2.6 3.4-2.2 3.4-4.4" fill="none" stroke="#e6f2e2" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="g20-fuse absolute block" style={st({ ...d(delayMs, 330), ...lane(0.16, 0.2), background: "linear-gradient(90deg, #e6f2e2, #6f8f7a 70%, #14201a)" })} />
        {/* ...and drowns, one damp sputter short of the far end */}
        <span
          className="g20-fizz absolute block"
          style={st({ ...d(delayMs, 470), left: "calc(50% + var(--fx-len, 3) * 6.4%)", top: `${50 - 0.75 * CELL}%`, width: cells(1.5), height: cells(1.5), borderRadius: "50%", background: "radial-gradient(circle, #e6f2e2, rgba(111,143,122,0.4) 55%, transparent 74%)" })}
        />
        {/* settle: wet smoke rolling off the drowned train */}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 620), ...lane(2.6, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(230,242,226,0.42), transparent 74%)" })} />
        <span className="g20-grit absolute block" style={st({ ...d(delayMs, 690), ...box(0.44, 0.44, 1.2, 0), "--sx": "150%", "--sy": "calc(var(--fx-side, 1) * -160%)", borderRadius: "50%", background: "#6f8f7a" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   20. Siege Ladder (t4) — ladders on one file. The rails are slapped up the
   whole length of the line, the rungs land in the real square order, and the
   grapple hook bites at the far end.
   Palette: #c08b4a / #ffe7bd / #241703.
   ========================================================================== */
const RUNGS = [0, 1, 2, 3, 4, 5];

function ScalingLadder(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "40%", height: "5%", width: "88%", background: "#c08b4a" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "24%", width: "88%", height: "48%" })}>
          <path d="M2 7h44M2 17h44" stroke="#c08b4a" strokeWidth="2.6" strokeLinecap="round" />
          {RUNGS.map((i) => (
            <path key={i} d={`M${7 + i * 7} 7v10`} stroke="#ffe7bd" strokeWidth="2.2" strokeLinecap="round" />
          ))}
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "70%", top: "10%", width: "26%", height: "26%" })}>
          <path d="M12 3v10M12 13c-4 0-6 3-6 5M12 13c4 0 6 3 6 5" fill="none" stroke="#ffe7bd" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "44%", height: "12%", width: "96%", background: "linear-gradient(90deg, transparent, #c08b4a, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "26%", width: "76%", height: "48%" })}>
          <path d="M1 6h22M1 18h22" stroke="#c08b4a" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M6 6v12M12 6v12M18 6v12" stroke="#ffe7bd" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span
          className="g20-rung absolute block"
          style={st({ animationDelay: `calc(${delayMs + 400}ms + var(--fx-index, 0) * 26ms)`, ...box(0.24, 1.2), background: "#ffe7bd" })}
        />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(192,139,74,0.28), transparent 68%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the file is marked for the ladders */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.12, 0), background: "#ffe7bd" })} />
        {/* strike: both rails are slapped on the whole length of the file */}
        <span className="g20-ladder absolute block" style={st({ ...d(delayMs, 240), ...lane(0.2, -0.55), borderRadius: "999px", background: "#c08b4a" })} />
        <span className="g20-ladder absolute block" style={st({ ...d(delayMs, 270), ...lane(0.2, 0.55), borderRadius: "999px", background: "#c08b4a" })} />
        {/* the rungs land in the real square order */}
        {RUNGS.map((i) => (
          <span
            key={i}
            className="g20-rung absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 360}ms + var(--fx-index, 0) * 20ms + ${i * 58}ms)`,
              ...box(0.18, 1.25, i * 0.85 + 0.55, 0),
              background: "#ffe7bd",
            })}
          />
        ))}
        {/* the grapple hook bites over the far end of the run */}
        <svg
          viewBox="0 0 24 24"
          className="g20-hook absolute block"
          style={st({ ...d(delayMs, 520), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 5%)", top: `${50 - 1.4 * CELL}%`, width: cells(1.4), height: cells(1.4), filter: "drop-shadow(0 0 4px #ffe7bd)" })}
        >
          <path d="M12 2v11M12 13c-4.4 0-6.6 3-6.6 5.6M12 13c4.4 0 6.6 3 6.6 5.6" fill="none" stroke="#ffe7bd" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        {/* settle: grit knocked off the parapet by the hook */}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 640), ...lane(2.4, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,231,189,0.4), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   21. Causeway (t3) — the marsh is boarded over. The water parts along the
   line, planks go down one after another the whole distance, and the finished
   road glints.
   Palette: #a3854f / #ffeecb / #1b2416.
   ========================================================================== */
const BOARDS = [0, 1, 2, 3, 4, 5];

function PlankCauseway(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "4%", top: "58%", height: "10%", width: "92%", background: "#1b2416" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "30%", width: "88%", height: "36%" })}>
          {BOARDS.map((i) => (
            <rect key={i} x={3 + i * 7.4} y="6" width="6" height="12" fill="#a3854f" stroke="#1b2416" strokeWidth="0.9" />
          ))}
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "26%", top: "26%", width: "48%", height: "22%", borderRadius: "999px", background: "radial-gradient(circle, #ffeecb, transparent 74%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "58%", height: "12%", width: "92%", background: "#1b2416" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "12%", top: "30%", width: "76%", height: "40%" })}>
          <rect x="1" y="6" width="22" height="12" fill="#ffeecb" stroke="#1b2416" strokeWidth="1.3" />
          <path d="M7 6v12M13 6v12M19 6v12" stroke="#1b2416" strokeWidth="1" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(1.2, 1.2, 0.4, -0.4), borderRadius: "50%", background: "#ffeecb" })} />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(163,133,79,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the marsh water shivers along the intended road */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 90), ...lane(0.14, 0), background: "#ffeecb" })} />
        <span className="g20-marsh absolute block" style={st({ ...d(delayMs, 180), ...lane(1.8, 0), borderRadius: "999px", background: "linear-gradient(180deg, rgba(27,36,22,0.85), rgba(163,133,79,0.35))" })} />
        {/* strike: the boards go down the whole distance, one by one */}
        {BOARDS.map((i) => (
          <span
            key={i}
            className="g20-plank absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 300}ms + var(--fx-index, 0) * 22ms + ${i * 62}ms)`,
              ...box(0.9, 1.1, i * 0.95 + 0.55, 0),
              background: "linear-gradient(180deg, #ffeecb, #a3854f 60%, #1b2416)",
              border: "1px solid #1b2416",
            })}
          />
        ))}
        {/* settle: the finished road catches the light and the marsh closes */}
        <span
          className="g20-glint absolute block"
          style={st({ ...d(delayMs, 600), left: "calc(50% + var(--fx-len, 3) * 3.6%)", top: `${50 - 0.8 * CELL}%`, width: cells(1.6), height: cells(1.6), borderRadius: "50%", background: "radial-gradient(circle, #ffeecb, transparent 72%)" })}
        />
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 680), ...lane(2.4, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,203,0.35), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   22. Rampart Watch (t3) — the night watch. The wall walk lights section by
   section across the caster's own second rank as the lantern is carried along
   it, and the lantern's beam sweeps out over the ground below.
   Palette: #ffc978 / #fff3d4 / #2a1e0c.
   ========================================================================== */
function LanternWatch(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "74%", height: "6%", width: "84%", background: "#2a1e0c" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "30%", top: "14%", width: "40%", height: "62%" })}>
          <path d="M9 2h6v2.6H9z" fill="#2a1e0c" />
          <path d="M7 5h10l1.6 14H5.4z" fill="#ffc978" stroke="#2a1e0c" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3.2" fill="#fff3d4" />
        </svg>
        <span className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "20%", top: "34%", width: "60%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.6), transparent 72%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "72%", height: "8%", width: "88%", background: "#ffc978" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "30%", top: "18%", width: "40%", height: "62%" })}>
          <path d="M9 2h6v2.4H9z" fill="#2a1e0c" />
          <path d="M7 4.8h10L18.6 19H5.4z" fill="#fff3d4" stroke="#2a1e0c" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" fill="#ffc978" />
        </svg>
        <span className="g20-glint absolute block" style={st({ ...d(delayMs, 400), ...box(2, 2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.6), transparent 70%)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(42,30,12,0.5), rgba(42,30,12,0.1) 70%)" })} />
        {/* tell: the walk is dark before the lantern reaches it */}
        <span
          className="g20-tell absolute block"
          style={st({ ...d(delayMs, 130), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 3%)", height: "6%", width: "100%", background: "#2a1e0c" })}
        />
        {/* strike: the wall walk lights section by section */}
        <span
          className="g20-walk absolute block"
          style={st({ ...d(delayMs, 280), left: "0%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 2.5%)", height: "5%", width: "100%", background: "linear-gradient(90deg, #ffc978, #fff3d4 50%, #ffc978)" })}
        />
        {/* settle: the light spills off the walk onto the ground below */}
        <span
          className="g20-dust absolute block"
          style={st({ ...d(delayMs, 620), left: "8%", top: "calc(50% + var(--fx-side, 1) * 31.25% - 14%)", height: "24%", width: "84%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,201,120,0.4), transparent 74%)" })}
        />
      </BoardFrame>
      {/* the lantern itself, carried along the walk */}
      <svg viewBox="0 0 24 24" className="g20-lantern absolute block" style={st({ ...d(delayMs, 380), ...box(1.8, 2.4, 0, 0), filter: "drop-shadow(0 0 5px #ffc978)" })}>
        <path d="M9 1.6h6V4H9z" fill="#2a1e0c" />
        <path d="M6.8 4.4h10.4L19 19.4H5z" fill="#ffc978" stroke="#2a1e0c" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3.2" fill="#fff3d4" />
      </svg>
      {/* the beam sweeps out over the ground */}
      <span
        className="g20-sweep absolute block"
        style={st({ ...d(delayMs, 470), left: "50%", top: `${50 - 0.35 * CELL}%`, height: cells(0.7), width: cells(4.6), background: "linear-gradient(90deg, rgba(255,243,212,0.85), transparent)" })}
      />
    </BoardWideStage>
  );
}

/* =============================================================================
   23. Rook's Nest (t3) — sticks everywhere. A twig bowl is built on the tower
   top, the rook settles into it, and folds a wing over the whole nest.
   Palette: #a9713f / #ffe9c4 / #241407.
   ========================================================================== */
function TwigNest(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "14%", top: "68%", height: "8%", width: "72%", borderRadius: "999px", background: "#241407" })} />
        <svg viewBox="0 0 24 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "24%", width: "64%", height: "56%" })}>
          <path d="M2 13c2-3 18-3 20 0-1 5-4.4 7.6-10 7.6S3 18 2 13z" fill="#a9713f" stroke="#241407" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M3.4 11.4l17.2 3M3.4 14.4l17.2-3" stroke="#241407" strokeWidth="0.9" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "34%", top: "8%", width: "32%", height: "32%" })}>
          <path d={ROOK} fill="#ffe9c4" stroke="#241407" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "66%", height: "10%", width: "84%", borderRadius: "999px", background: "#a9713f" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "26%", top: "16%", width: "48%", height: "64%" })}>
          <path d={ROOK} fill="#ffe9c4" stroke="#241407" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span className="g20-wing absolute block" style={st({ ...d(delayMs, 400), ...box(2.6, 1.2, 0, 0.2), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #a9713f, transparent)" })} />
      </span>
    );
  }
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(169,113,63,0.26), transparent 70%)" })} />
      </BoardFrame>
      {/* tell: the tower top the nest will claim */}
      <span
        className="g20-tell absolute block"
        style={st({ ...d(delayMs, 120), left: `${50 - 1.9 * CELL}%`, top: "calc(50% + var(--fx-side, 1) * 3.5% + 6%)", height: cells(0.7), width: cells(3.8), borderRadius: "999px", background: "#241407" })}
      />
      {/* strike: the twig bowl is built */}
      <svg viewBox="0 0 24 24" className="g20-nest absolute block" style={st({ ...d(delayMs, 250), ...box(4.4, 2.6, 0, 1) })}>
        <path d="M1.4 12c2.2-3.4 19-3.4 21.2 0-1.1 5.6-4.8 8.2-10.6 8.2S2.5 17.6 1.4 12z" fill="#a9713f" stroke="#241407" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2.6 10.2l18.8 3.4M2.6 13.8l18.8-3.4M6 8.6l12 8M18 8.6l-12 8" stroke="#241407" strokeWidth="0.8" />
      </svg>
      {/* the rook settles into it */}
      <svg viewBox="0 0 24 24" className="g20-raise absolute block" style={st({ ...d(delayMs, 380), ...box(2.4, 3, 0, -0.5), filter: "drop-shadow(0 0 4px #ffe9c4)" })}>
        <path d={ROOK} fill="#ffe9c4" stroke="#241407" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      {/* and folds a wing over the whole nest */}
      <span
        className="g20-wing absolute block"
        style={st({ ...d(delayMs, 500), ...box(5.2, 1.8, 0, 0.4), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #a9713f 30%, #ffe9c4 50%, #a9713f 70%, transparent)" })}
      />
      <span className="g20-glint absolute block" style={st({ ...d(delayMs, 580), ...box(1.3, 1.3, 1.1, -1.3), borderRadius: "50%", background: "#ffe9c4" })} />
      <span className="g20-dust absolute block" style={st({ ...d(delayMs, 660), ...box(4.6, 2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,196,0.35), transparent 74%)" })} />
    </BoardWideStage>
  );
}

/* =============================================================================
   24. Crooked Arrow (t3) — the ballista shoots a bolt with a warped shaft: it
   flies the real length of the line, wanders off true on the way, and lands
   leaning over. A tally of odd notches is cut beside it.
   Palette: #cbb089 / #fff1cd / #201a0d.
   ========================================================================== */
const NOTCHES = [0, 1, 2, 3];

function BentBolt(props: SceneProps) {
  const { role, delayMs } = props;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g20-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "70%", height: "5%", width: "88%", background: "#201a0d" })} />
        <svg viewBox="0 0 48 24" className="g20-ent absolute block" style={st({ ...d(delayMs, 200), left: "6%", top: "26%", width: "88%", height: "40%" })}>
          <path d="M6 13c8-3 16 3 24-1" fill="none" stroke="#cbb089" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 12l12 1-12 4z" fill="#fff1cd" stroke="#201a0d" strokeWidth="1" strokeLinejoin="round" />
          <path d="M6 9l-4 4 4 4" fill="none" stroke="#201a0d" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="g20-ent3 absolute block" style={st({ ...d(delayMs, 440), left: "36%", top: "58%", width: "28%", height: "28%" })}>
          <path d="M6 20V8M12 20V4M18 20v-9" stroke="#fff1cd" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g20-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "46%", height: "8%", width: "96%", background: "linear-gradient(90deg, transparent, #cbb089, #fff1cd)" })} />
        <svg viewBox="0 0 24 24" className="g20-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M3 18c4-2 8-6 12-12" fill="none" stroke="#cbb089" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M15 6l6-3-2 6z" fill="#fff1cd" stroke="#201a0d" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        <span
          className="g20-notch absolute block"
          style={st({ animationDelay: `calc(${delayMs + 400}ms + var(--fx-index, 0) * 30ms)`, ...box(0.24, 1), background: "#fff1cd" })}
        />
      </span>
    );
  }
  return (
    <>
      <BoardWideStage>
        <BoardFrame>
          <span className="g20-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(203,176,137,0.26), transparent 70%)" })} />
        </BoardFrame>
      </BoardWideStage>
      <AimStage>
        {/* tell: the aiming line the bolt is supposed to keep to */}
        <span className="g20-tellline absolute block" style={st({ ...d(delayMs, 100), ...lane(0.1, 0), background: "#fff1cd" })} />
        {/* strike: the bolt flies the real length of the line, out of true */}
        <svg viewBox="0 0 48 24" className="g20-bolt absolute block" style={st({ ...d(delayMs, 250), ...box(1, 1, 0, 0), filter: "drop-shadow(0 0 4px #fff1cd)" })}>
          <path d="M2 12c10-4 22 4 32-1" fill="none" stroke="#cbb089" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M33 9.4l12 2-12 4.2z" fill="#fff1cd" stroke="#201a0d" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        {/* it lands leaning over, and stays leaning */}
        <svg
          viewBox="0 0 24 24"
          className="g20-tilt absolute block"
          style={st({ ...d(delayMs, 480), left: "calc(50% + var(--fx-len, 3) * 7.142857% - 5.714%)", top: `${50 - 1.2 * CELL}%`, width: cells(1.6), height: cells(1.6) })}
        >
          <path d="M4 22c4-4 10-10 16-19" fill="none" stroke="#cbb089" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 3l3.4 5.4-6-1z" fill="#fff1cd" stroke="#201a0d" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        {/* settle: the odd tally cut beside the mark, 1 3 5 7 */}
        {NOTCHES.map((i) => (
          <span
            key={i}
            className="g20-notch absolute block"
            style={st({
              animationDelay: `calc(${delayMs + 580}ms + var(--fx-index, 0) * 18ms + ${i * 56}ms)`,
              ...box(0.16, 0.5 + i * 0.24, i * 0.4 + 0.6, 1.6),
              background: "#fff1cd",
            })}
          />
        ))}
        <span className="g20-dust absolute block" style={st({ ...d(delayMs, 700), ...lane(2, 0), borderRadius: "50%", background: "radial-gradient(circle, rgba(203,176,137,0.35), transparent 74%)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   Registry — scene + config per card id. Every `sound` is an existing
   SigSoundKey, every `source` an existing SigZone (named only where the card
   really does decorate pieces that STAY on the board: the four shield-zone
   protection cards), and every card declares its anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 8: the great works ---
  bn4_dukes_patent: S(PatentDraft, {
    ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "coronation", anchor: "aim",
  }),
  bn4_wall_of_faith: S(FaithCourse, {
    ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  hx4_dead_march: S(DeadDrums, {
    ordering: "line", staggerMs: 65, victims: ["r", "q"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  hx4_the_long_siege: S(Circumvallation, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  ov_world_serpent: S(BoomChain, {
    ordering: "sweep", staggerMs: 50, victims: ["r", "q"], hasLead: true, sound: "cataclysm", anchor: "cast",
  }),

  // --- Tier 7 ---
  bn4_clay_colossus: S(ClayKiln, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "colossus", anchor: "cast",
  }),
  bn4_palace_walls: S(CurtainWall, {
    ordering: "file", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "cast",
  }),

  // --- Tier 6 ---
  bn4_castle_ditch: S(RingDitch, {
    ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true, sound: "wall", anchor: "cast",
  }),
  bn4_dowry: S(DowryChest, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "vault", anchor: "cast",
  }),
  hx4_banquet_of_dust: S(DustBanquet, {
    ordering: "line", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  hx4_ivory_tower: S(IvoryTower, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  hx4_moat_diggers: S(SapperPits, {
    ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "cast",
  }),
  hx4_rusted_battlements: S(RustHinge, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", anchor: "cast",
  }),

  // --- Tier 5 ---
  hx4_wagon_ruts: S(RamCarriage, {
    ordering: "line", staggerMs: 50, victims: ["r"], hasLead: true, sound: "rampage", anchor: "aim",
  }),

  // --- Tier 4 ---
  bn4_charm_bracelet: S(CharmClasp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  bn4_pawn_bulwark: S(GabionLine, {
    ordering: "file", staggerMs: 50, victims: ["p"], hasLead: true, sound: "wall", source: "shield", anchor: "cast",
  }),
  bn4_town_walls: S(Drawbridge, {
    ordering: "file", staggerMs: 45, victims: "all", hasLead: true, sound: "wall", anchor: "cast",
  }),
  hx4_feuding_towers: S(SurveyorLine, {
    ordering: "line", staggerMs: 60, victims: ["r"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  hx4_wet_powder: S(WetFuse, {
    ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "bust", anchor: "aim",
  }),
  ov_siege_ladder: S(ScalingLadder, {
    ordering: "line", staggerMs: 50, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim",
  }),

  // --- Tier 3 ---
  bn4_causeway: S(PlankCauseway, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "aim",
  }),
  bn4_rampart_watch: S(LanternWatch, {
    ordering: "file", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  bn4_rook_nest: S(TwigNest, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  hx4_crooked_arrow: S(BentBolt, {
    ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "siege", anchor: "aim",
  }),
};
