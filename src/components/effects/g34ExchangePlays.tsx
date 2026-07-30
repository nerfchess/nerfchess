// Bespoke plugin signatures for the swap / exchange / teleport batch
// (g34_swapHelix). See sigPlugins.tsx for the contract. Self-contained: own
// inline SVG + own g34ExchangePlays.css, transform/opacity only, no import
// from BoardEffects.tsx (cycle hazard), only the SigPlugin TYPE imported.
//
// FICTION: TWO THINGS CHANGING PLACES, AND THE MOMENT THEY PASS. Every card is
// a different MECHANISM of exchange rather than a different colour of the same
// swirl: a canal lock whose two chambers fill and empty so the boats trade
// levels, a paternoster lift whose cars pass mid-shaft, two buckets on one
// rope over a well, a revolving stage bringing the next set round, a railway
// passing loop where two trains meet and part, a double-helix stair where two
// people never meet, a hand-over-hand rope ferry, a turntable spinning a
// locomotive end for end, a shell-and-tube exchanger running counterflow, two
// dancers' allemande turn, an escapement letting one tooth go as it catches
// the next, a sliding tile falling into the gap, an auctioneer's counter, a
// balance beam, a thimblerig cross, two plugs of turf, an exchequer table, a
// coat-check conveyor and a priest hole's turning panel.
//
// An exchange has a DIRECTION, so this batch lives on the geometry contract:
//
//   <AimStage>  every card stages inside it. Art is authored pointing RIGHT
//               (+x) and aims itself down the real source -> target vector, so
//               the two things cross the real distance between the real
//               squares instead of trading places in the abstract.
//   --fx-len    a layer sized to ONE CELL travels the true gap with
//               translateX(calc(var(--fx-len) * 100%)); the ways, rails,
//               hawsers and shafts are sized calc(var(--fx-len) * 7.142857%),
//               which IS that distance; the pass layers sit at half of it,
//               on the real midpoint of the real leg.
//   --fx-index  stalls, rungs and courses arrive in the REAL victim order.
//   --fx-side   sawdust, steam and motes drift away from the caster, whichever
//               end of the screen that is.
//   <BoardFrame> everything that means THE BOARD (the wash, the swell). Never
//               a fixed percentage of the stage.
//
// Every scene handles all three roles: "lead" (the board-scale flourish on the
// cast square), "target" (the per-square hit) and "entrance" (the card arriving
// in a hand, ~56% of the crop, so no board takeover and no oversized stage).
// Every scene runs tell -> strike -> settle. Class prefix `g34-`.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import "./g34ExchangePlays.css";

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

/** The caller's stagger plus this layer's own beat. The beat rides --fx-dur so
 *  the whole scene compresses and stretches with the Settings animation speed. */
const d = (base: number, off: number): CSSProperties => ({
  animationDelay: `calc(${base}ms + ${off}ms * var(--fx-dur, 1))`,
});

/** The same, plus this square's place in the real victim order. */
const dIndex = (base: number, off: number, step: number): CSSProperties => ({
  animationDelay: `calc(${base}ms + ${off}ms * var(--fx-dur, 1) + var(--fx-index, 0) * ${step}ms * var(--fx-dur, 1))`,
});

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS centred on the CAST SQUARE (the stage's 50%/50%),
 * optionally offset `dx`/`dy` cells. A one-cell box here can travel exactly
 * --fx-len cells, which is what the travel pairs in the stylesheet do.
 */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${50 + (dx - w / 2) * CELL}%`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/** The same box, parked on the FAR square: the real end of the real leg. */
const far = (w: number, h: number, dy = 0): CSSProperties => ({
  left: `calc(${50 - (w / 2) * CELL}% + var(--fx-len, 3) * ${CELL}%)`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/** The same box, parked HALFWAY: where the two of them pass. */
const mid = (w: number, h: number, dy = 0): CSSProperties => ({
  left: `calc(${50 - (w / 2) * CELL}% + var(--fx-len, 3) * ${(CELL / 2).toFixed(6)}%)`,
  top: `${50 + (dy - h / 2) * CELL}%`,
  width: cells(w),
  height: cells(h),
});

/** A way running from the cast square to the far square, `thick` cells thick.
 *  Authored pointing right; <AimStage> lays it on the real vector. */
const way = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${50 + (dy - thick / 2) * CELL}%`,
  width: `calc(var(--fx-len, 3) * ${CELL}%)`,
  height: cells(thick),
});

/** The board-scale atmosphere every lead opens on. */
function Wash({ base, tint }: { base: number; tint: string }) {
  return (
    <BoardWideStage>
      <BoardFrame>
        <span
          className="g34-wash absolute inset-0 block"
          style={st({ ...d(base, 50), background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 66%)` })}
        />
      </BoardFrame>
    </BoardWideStage>
  );
}

/** The one-crop wrapper the entrance and target cuts share. */
function Cut({ children }: { children: ReactNode }) {
  return (
    <span className={ROOT} aria-hidden="true">
      {children}
    </span>
  );
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* =============================================================================
   1. My Cousin From Out of Town (t8) — THE REVOLVING STAGE. The curtain lifts
   off the drum, the revolve turns half a circle, and the enormous visiting
   draught rides on as the old set goes off the other way past it.
   Palette: #d94f4f / #ffe9c0 / #2a1a18.
   ========================================================================== */
function RevolvingStage({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span
          className="g34-ent-turn absolute block"
          style={st({ ...d(delayMs, 70), left: "18%", top: "20%", width: "64%", height: "64%", borderRadius: "50%", border: "2px solid #d94f4f" })}
        />
        <svg viewBox="0 0 24 24" className="g34-ent absolute block" style={st({ ...d(delayMs, 220), left: "26%", top: "22%", width: "48%", height: "56%" })}>
          <ellipse cx="12" cy="18" rx="8" ry="3" fill="#2a1a18" />
          <ellipse cx="12" cy="14.5" rx="8" ry="3" fill="#d94f4f" />
          <ellipse cx="12" cy="11" rx="8" ry="3" fill="#ffe9c0" />
          <ellipse cx="12" cy="7.5" rx="8" ry="3" fill="#d94f4f" />
        </svg>
        <span
          className="g34-ent-back absolute block"
          style={st({ ...d(delayMs, 420), left: "62%", top: "44%", width: "22%", height: "26%", background: "#2a1a18", border: "1px solid #ffe9c0" })}
        />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 40), left: "18%", top: "36%", width: "26%", height: "28%", background: "#d94f4f" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 40), left: "56%", top: "36%", width: "26%", height: "28%", background: "#ffe9c0" })} />
        <span
          className="g34-hit-fade absolute block"
          style={st({ ...d(delayMs, 300), left: "24%", top: "24%", width: "52%", height: "52%", borderRadius: "50%", background: "radial-gradient(circle, rgba(217,79,79,0.6), transparent 70%)" })}
        />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(217,79,79,0.3)" />
      <AimStage>
        {/* tell: the drum's shadow pools on the boards */}
        <span
          className="g34-tellshade absolute block"
          style={st({ ...d(delayMs, 60), ...box(5, 1.2, 0, 1.6), borderRadius: "50%", background: "radial-gradient(ellipse, #2a1a18, transparent 70%)" })}
        />
        {/* the house curtain flies out, uncovering the revolve */}
        <span
          className="g34-curtain absolute block"
          style={st({ ...d(delayMs, 150), ...box(6.4, 3, 0, -1.4), background: "linear-gradient(180deg, #d94f4f, #2a1a18)" })}
        />
        {/* strike: the drum takes half a turn */}
        <svg viewBox="0 0 24 24" className="g34-drum absolute block" style={st({ ...d(delayMs, 250), ...box(4.6, 4.6) })}>
          <circle cx="12" cy="12" r="10.4" fill="none" stroke="#ffe9c0" strokeWidth="1.1" strokeDasharray="2.6 2" />
          <path d="M1.6 12h20.8" stroke="#d94f4f" strokeWidth="1.8" {...SJ} />
          <path d="M6 4.4h5.2v5H6z" fill="#2a1a18" stroke="#ffe9c0" strokeWidth="0.9" />
        </svg>
        {/* the visiting draught rides on from the far square */}
        <svg viewBox="0 0 24 24" className="g34-haul-back absolute block" style={st({ ...d(delayMs, 300), ...far(1.9, 1.9) })}>
          <ellipse cx="12" cy="17" rx="9" ry="3.4" fill="#2a1a18" />
          <ellipse cx="12" cy="13" rx="9" ry="3.4" fill="#d94f4f" />
          <ellipse cx="12" cy="9" rx="9" ry="3.4" fill="#ffe9c0" />
        </svg>
        {/* and the set that was standing goes off the other way */}
        <span
          className="g34-haul-out absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.5, 2.2), background: "linear-gradient(180deg, #2a1a18, #d94f4f)", border: "1px solid #ffe9c0" })}
        />
        {/* the moment they pass, downstage centre */}
        <span
          className="g34-pass absolute block"
          style={st({ ...d(delayMs, 520), ...mid(2.2, 2.2), borderRadius: "50%", background: "radial-gradient(circle, #ffe9c0, transparent 68%)" })}
        />
        {/* settle: sawdust off the boards, leaning away from the caster */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 640), ...box(4.4, 2.4, 0.6, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,192,0.55), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   2. Ratlines (t5) — THE HAND-OVER-HAND ROPE FERRY. One hawser stretched bank
   to bank, the sheave squealing, and two hulls hauled past each other in bites
   of rope, a rope ladder still hanging off the near one.
   Palette: #7fc9d8 / #fff1d4 / #16303a.
   ========================================================================== */
function RopeFerry({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 80), left: "10%", top: "52%", width: "80%", height: "3%", background: "#7fc9d8" })} />
        <svg viewBox="0 0 24 24" className="g34-ent-out absolute block" style={st({ ...d(delayMs, 230), left: "14%", top: "34%", width: "34%", height: "34%" })}>
          <path d="M3 12h18l-3 6H6z" fill="#16303a" stroke="#7fc9d8" strokeWidth="1.1" {...SJ} />
          <path d="M12 12V3M8 6h8M9 9h6" stroke="#fff1d4" strokeWidth="1" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-ent-back absolute block" style={st({ ...d(delayMs, 400), left: "54%", top: "42%", width: "32%", height: "32%" })}>
          <path d="M3 12h18l-3 6H6z" fill="#7fc9d8" stroke="#16303a" strokeWidth="1.1" {...SJ} />
        </svg>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "48%", width: "84%", height: "4%", background: "#7fc9d8" })} />
        <svg viewBox="0 0 24 24" className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "24%", width: "50%", height: "50%" })}>
          <path d="M3 12h18l-3 6H6z" fill="#16303a" stroke="#fff1d4" strokeWidth="1.3" {...SJ} />
        </svg>
        <span
          className="g34-hit-fade absolute block"
          style={st({ ...d(delayMs, 340), left: "26%", top: "40%", width: "48%", height: "34%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(127,201,216,0.6), transparent 70%)" })}
        />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(127,201,216,0.28)" />
      <AimStage>
        {/* tell: both landing stages acknowledge each other */}
        <span
          className="g34-tellpair absolute block"
          style={st({ ...d(delayMs, 60), ...box(0.7, 1.4), background: "#fff1d4" })}
        />
        {/* strike: the hawser comes up taut across the whole crossing */}
        <span className="g34-taut absolute block" style={st({ ...d(delayMs, 180), ...way(0.16, -0.7), background: "#fff1d4" })} />
        {/* the sheave on the near bank runs the rope through */}
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 230), ...box(1.5, 1.5, -0.2, 0.5) })}>
          <circle cx="12" cy="12" r="9" fill="#16303a" stroke="#7fc9d8" strokeWidth="1.6" />
          <path d="M12 3v18M3 12h18" stroke="#fff1d4" strokeWidth="1.2" />
        </svg>
        {/* the two hulls are hauled past each other, bite by bite */}
        <svg viewBox="0 0 24 24" className="g34-jerk-out absolute block" style={st({ ...d(delayMs, 300), ...box(1.8, 1.8, 0, 0.3) })}>
          <path d="M2 12h20l-3.4 6.4H5.4z" fill="#16303a" stroke="#7fc9d8" strokeWidth="1.2" {...SJ} />
          <path d="M12 12V2.5M8 5.5h8M9 8.6h6" stroke="#fff1d4" strokeWidth="1.1" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-jerk-back absolute block" style={st({ ...d(delayMs, 300), ...far(1.8, 1.8, 0.3) })}>
          <path d="M2 12h20l-3.4 6.4H5.4z" fill="#7fc9d8" stroke="#16303a" strokeWidth="1.2" {...SJ} />
          <path d="M12 12V2.5M8 5.5h8" stroke="#fff1d4" strokeWidth="1.1" {...SJ} />
        </svg>
        {/* midstream: the two of them clear each other by a plank */}
        <span className="g34-seam absolute block" style={st({ ...d(delayMs, 520), ...mid(0.2, 2.6, 0.2), background: "#fff1d4" })} />
        {/* settle: the wake spreads off both quarters */}
        <span
          className="g34-ripple absolute block"
          style={st({ ...d(delayMs, 620), ...mid(3.6, 3.6, 0.3), borderRadius: "50%", border: "2px solid rgba(127,201,216,0.7)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   3. Player Trade (t5) — THE CANAL LOCK. Two chambers side by side: one fills
   as the other empties, the gates swing back, and the two boats trade levels
   and pass in the pound between them.
   Palette: #6fa8d6 / #ffefcf / #142a3c.
   ========================================================================== */
function LockStaircase({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "12%", top: "30%", width: "76%", height: "44%", border: "2px solid #6fa8d6" })} />
        <span className="g34-fill absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "34%", width: "34%", height: "38%", background: "#6fa8d6" })} />
        <span className="g34-drain absolute block" style={st({ ...d(delayMs, 200), left: "52%", top: "34%", width: "34%", height: "38%", background: "#142a3c" })} />
        <svg viewBox="0 0 24 24" className="g34-ent-out absolute block" style={st({ ...d(delayMs, 400), left: "18%", top: "38%", width: "26%", height: "26%" })}>
          <path d="M3 11h18l-3 7H6z" fill="#ffefcf" />
        </svg>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "16%", top: "22%", width: "68%", height: "56%", border: "2px solid #6fa8d6" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 180), left: "22%", top: "40%", width: "24%", height: "24%", background: "#ffefcf" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 180), left: "54%", top: "40%", width: "24%", height: "24%", background: "#142a3c" })} />
        <span
          className="g34-hit-fade absolute block"
          style={st({ ...d(delayMs, 330), left: "28%", top: "34%", width: "44%", height: "36%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(111,168,214,0.65), transparent 70%)" })}
        />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(111,168,214,0.3)" />
      <AimStage>
        {/* tell: the cill line scribed the length of the flight */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.16, 1.5), background: "#ffefcf" })} />
        {/* the near chamber fills */}
        <span
          className="g34-fill absolute block"
          style={st({ ...d(delayMs, 200), ...box(2.6, 2.4, -0.1, 0.2), background: "linear-gradient(180deg, #6fa8d6, #142a3c)" })}
        />
        {/* the far chamber empties at the same moment */}
        <span
          className="g34-drain absolute block"
          style={st({ ...d(delayMs, 200), ...far(2.6, 2.4, 0.2), background: "linear-gradient(180deg, #6fa8d6, #142a3c)" })}
        />
        {/* the mitre gates swing back out of the way */}
        <span className="g34-gate absolute block" style={st({ ...d(delayMs, 280), ...mid(0.5, 2.8, 0.1), background: "#142a3c", border: "1px solid #ffefcf" })} />
        {/* the two boats trade levels as they cross the pound */}
        <svg viewBox="0 0 24 24" className="g34-lift-up absolute block" style={st({ ...d(delayMs, 340), ...box(1.8, 1.4, 0, 0.2) })}>
          <path d="M1.5 9h21l-3.6 8H5.1z" fill="#ffefcf" stroke="#142a3c" strokeWidth="1.2" {...SJ} />
          <path d="M12 9V2.4" stroke="#6fa8d6" strokeWidth="1.6" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-lift-down absolute block" style={st({ ...d(delayMs, 340), ...far(1.8, 1.4, 0.2) })}>
          <path d="M1.5 9h21l-3.6 8H5.1z" fill="#6fa8d6" stroke="#142a3c" strokeWidth="1.2" {...SJ} />
          <path d="M12 9V2.4" stroke="#ffefcf" strokeWidth="1.6" {...SJ} />
        </svg>
        {/* settle: the paddles still weeping into the lower pound */}
        <span className="g34-drip absolute block" style={st({ ...d(delayMs, 620), ...mid(1.6, 2, 1.2), background: "linear-gradient(180deg, rgba(255,239,207,0.85), transparent)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   4. Processional (t4) — THE PATERNOSTER LIFT. The endless chain never stops:
   the court steps on at one floor and off at another, and the two cars pass in
   the middle of the shaft, landing by landing in the real victim order.
   Palette: #c9a24a / #fff4d6 / #241d10.
   ========================================================================== */
function Paternoster({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "22%", top: "12%", width: "56%", height: "76%", border: "2px solid #c9a24a" })} />
        <span
          className="g34-ent-out absolute block"
          style={st({ ...d(delayMs, 220), left: "26%", top: "50%", width: "22%", height: "24%", background: "#241d10", border: "1px solid #fff4d6" })}
        />
        <span
          className="g34-ent-back absolute block"
          style={st({ ...d(delayMs, 220), left: "52%", top: "24%", width: "22%", height: "24%", background: "#c9a24a" })}
        />
        <span className="g34-chain absolute block" style={st({ ...d(delayMs, 400), left: "48%", top: "14%", width: "4%", height: "72%", background: "repeating-linear-gradient(180deg, #fff4d6 0 12%, transparent 12% 26%)" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "30%", top: "14%", width: "40%", height: "72%", border: "2px solid #c9a24a" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "32%", top: "50%", width: "22%", height: "24%", background: "#fff4d6" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "46%", top: "24%", width: "22%", height: "24%", background: "#241d10" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "34%", top: "36%", width: "32%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,162,74,0.7), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(201,162,74,0.28)" />
      <AimStage>
        {/* tell: the shaft is scribed from one landing to the other */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.14, -1.1), background: "#fff4d6" })} />
        {/* the landings arrive in the real victim order */}
        <span
          className="g34-rung absolute block"
          style={st({ ...dIndex(delayMs, 150, 55), ...box(1.1, 0.22, 0.6, -1.1), background: "#c9a24a" })}
        />
        {/* strike: the endless chain runs the length of the shaft */}
        <span
          className="g34-chain absolute block"
          style={st({ ...d(delayMs, 220), ...way(0.3, 0), background: "repeating-linear-gradient(90deg, #c9a24a 0 3%, transparent 3% 7%)" })}
        />
        {/* one car up, one car down, and they pass mid-shaft */}
        <span
          className="g34-lift-up absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.3, 1.5, 0, 0), background: "#241d10", border: "1px solid #c9a24a" })}
        />
        <span
          className="g34-lift-down absolute block"
          style={st({ ...d(delayMs, 300), ...far(1.3, 1.5, 0), background: "#fff4d6", border: "1px solid #241d10" })}
        />
        <span
          className="g34-pass absolute block"
          style={st({ ...d(delayMs, 520), ...mid(2, 2), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" })}
        />
        {/* settle: brass dust off the running gear */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 640), ...box(3.2, 2, 0.8, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(201,162,74,0.55), transparent 74%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   5. Priest Hole (t4) — THE TURNING PANEL. The candle gutters, the panelled
   wall pivots on its centre stile, and the face that was inside is outside:
   the king goes in one way and the rook comes out the other.
   Palette: #d99a4e / #ffe6bc / #1d1510.
   ========================================================================== */
function TurningPanel({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "20%", top: "16%", width: "60%", height: "68%", background: "#1d1510", border: "2px solid #d99a4e" })} />
        <span className="g34-panel absolute block" style={st({ ...d(delayMs, 240), left: "30%", top: "22%", width: "40%", height: "56%", background: "linear-gradient(90deg, #d99a4e, #1d1510)" })} />
        <svg viewBox="0 0 24 24" className="g34-ent-turn absolute block" style={st({ ...d(delayMs, 440), left: "42%", top: "34%", width: "16%", height: "30%" })}>
          <path d="M12 3c2 3 3 4.4 3 6a3 3 0 0 1-6 0c0-1.6 1-3 3-6z" fill="#ffe6bc" />
        </svg>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "22%", top: "20%", width: "56%", height: "60%", border: "2px solid #d99a4e" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 180), left: "26%", top: "34%", width: "22%", height: "32%", background: "#1d1510" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 180), left: "52%", top: "34%", width: "22%", height: "32%", background: "#d99a4e" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 330), left: "34%", top: "30%", width: "32%", height: "40%", background: "linear-gradient(90deg, transparent, rgba(255,230,188,0.75), transparent)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(217,154,78,0.26)" />
      <AimStage>
        {/* tell: a hairline crack opens along the panelling */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.12, -1.3), background: "#ffe6bc" })} />
        {/* the wainscot the hide is cut into */}
        <span
          className="g34-tellsquat absolute block"
          style={st({ ...d(delayMs, 130), ...box(4.4, 3.4), background: "linear-gradient(180deg, #1d1510, #3a2716)", border: "1px solid #d99a4e" })}
        />
        {/* strike: the panel turns on its stile and shows its other face */}
        <span
          className="g34-panel absolute block"
          style={st({ ...d(delayMs, 250), ...box(2.4, 3), background: "linear-gradient(90deg, #d99a4e, #1d1510 60%, #d99a4e)" })}
        />
        {/* the two of them change rooms behind it */}
        <span
          className="g34-slide-out absolute block"
          style={st({ ...d(delayMs, 330), ...box(1.1, 1.6, 0, 0.2), background: "#ffe6bc" })}
        />
        <span
          className="g34-slide-back absolute block"
          style={st({ ...d(delayMs, 330), ...far(1.1, 1.6, 0.2), background: "#d99a4e", border: "1px solid #1d1510" })}
        />
        {/* the seam of light where they pass in the dark */}
        <span className="g34-seam absolute block" style={st({ ...d(delayMs, 520), ...mid(0.22, 3, 0.1), background: "#ffe6bc" })} />
        {/* settle: plaster dust out of the joint */}
        <span
          className="g34-dust absolute block"
          style={st({ ...d(delayMs, 640), ...mid(3, 1.6, 1.4), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,230,188,0.55), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   6. Bodyswap Ball (t3) — THE ALLEMANDE TURN. The mirror ball drops, its light
   rakes the floor, two dancers take each other's wrist and orbit half a turn,
   and each finishes standing where the other stood.
   Palette: #e05fb0 / #ffeedd / #241030.
   ========================================================================== */
function Allemande({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <svg viewBox="0 0 24 24" className="g34-ent absolute block" style={st({ ...d(delayMs, 80), left: "32%", top: "10%", width: "36%", height: "40%" })}>
          <circle cx="12" cy="14" r="8" fill="#241030" stroke="#e05fb0" strokeWidth="1.4" />
          <path d="M4 14h16M12 6v16M6.4 8.4l11.2 11.2M17.6 8.4L6.4 19.6" stroke="#ffeedd" strokeWidth="0.8" />
          <path d="M12 6V2" stroke="#e05fb0" strokeWidth="1.4" />
        </svg>
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 260), left: "20%", top: "56%", width: "18%", height: "30%", borderRadius: "999px", background: "#e05fb0" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 260), left: "62%", top: "56%", width: "18%", height: "30%", borderRadius: "999px", background: "#ffeedd" })} />
        <span className="g34-clasp absolute block" style={st({ ...d(delayMs, 440), left: "42%", top: "62%", width: "16%", height: "12%", background: "#ffeedd" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: "#241030", border: "2px solid #e05fb0" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "18%", top: "38%", width: "18%", height: "26%", borderRadius: "999px", background: "#e05fb0" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "64%", top: "38%", width: "18%", height: "26%", borderRadius: "999px", background: "#ffeedd" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 330), left: "26%", top: "26%", width: "48%", height: "48%", borderRadius: "50%", background: "radial-gradient(circle, rgba(224,95,176,0.6), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(224,95,176,0.3)" />
      <AimStage>
        {/* tell: the set marks chalked on the floor, both places at once */}
        <span className="g34-tellpair absolute block" style={st({ ...d(delayMs, 60), ...box(1.2, 1.2), borderRadius: "50%", border: "2px solid #ffeedd" })} />
        {/* the ball drops over the middle of the figure */}
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 170), ...mid(2.2, 2.2, -1.6) })}>
          <circle cx="12" cy="12" r="9" fill="#241030" stroke="#e05fb0" strokeWidth="1.3" />
          <path d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="#ffeedd" strokeWidth="0.8" />
        </svg>
        {/* its light rakes across the floor */}
        <span
          className="g34-rake absolute block"
          style={st({ ...d(delayMs, 240), ...mid(3.6, 3.6, 0.6), background: "linear-gradient(180deg, rgba(255,238,221,0.7), transparent 78%)" })}
        />
        {/* strike: the two dancers take hands and turn each other round */}
        <span
          className="g34-swing-out absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.2, 1.9, 0, 0.4), borderRadius: "999px", background: "linear-gradient(180deg, #ffeedd, #e05fb0)" })}
        />
        <span
          className="g34-swing-back absolute block"
          style={st({ ...d(delayMs, 300), ...far(1.2, 1.9, 0.4), borderRadius: "999px", background: "linear-gradient(180deg, #e05fb0, #241030)" })}
        />
        {/* the clasp, at the centre of the turn */}
        <span className="g34-clasp absolute block" style={st({ ...d(delayMs, 470), ...mid(1.6, 0.7, 0.4), background: "#ffeedd" })} />
        {/* settle: the floor still ringing */}
        <span
          className="g34-ripple absolute block"
          style={st({ ...d(delayMs, 610), ...mid(4, 4, 0.4), borderRadius: "50%", border: "2px solid rgba(224,95,176,0.7)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   7. Identity Crisis (t3) — THE SHELL AND TUBE. Counterflow: the hot side runs
   down the tubes, the cold side back up the shell, and by the far header each
   has taken on the other's character. It reverses when the shell cools.
   Palette: #58c9a8 / #fff2d8 / #102a26.
   ========================================================================== */
function ShellAndTube({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-shell absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "32%", width: "80%", height: "36%", borderRadius: "999px", background: "#102a26", border: "2px solid #58c9a8" })} />
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 240), left: "16%", top: "40%", width: "24%", height: "8%", background: "#fff2d8" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 240), left: "60%", top: "54%", width: "24%", height: "8%", background: "#58c9a8" })} />
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 430), left: "44%", top: "26%", width: "12%", height: "48%", background: "rgba(255,242,216,0.7)" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "34%", width: "72%", height: "32%", borderRadius: "999px", border: "2px solid #58c9a8" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "20%", top: "40%", width: "26%", height: "7%", background: "#fff2d8" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "54%", top: "54%", width: "26%", height: "7%", background: "#102a26" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "32%", top: "28%", width: "36%", height: "44%", borderRadius: "50%", background: "radial-gradient(circle, rgba(88,201,168,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(88,201,168,0.28)" />
      <AimStage>
        {/* tell: the tube bundle is scribed header to header */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.12, -0.5), background: "#fff2d8" })} />
        {/* the shell takes the pressure */}
        <span
          className="g34-shell absolute block"
          style={st({ ...d(delayMs, 170), ...way(2.6, 0), borderRadius: "999px", background: "linear-gradient(180deg, #102a26, #1d4a42)", border: "1px solid #58c9a8" })}
        />
        {/* the tube plates at each header */}
        <span className="g34-tellpair absolute block" style={st({ ...d(delayMs, 210), ...box(0.4, 2.4), background: "#58c9a8" })} />
        {/* strike: hot down the tubes, cold back up the shell */}
        <span className="g34-flow-out absolute block" style={st({ ...d(delayMs, 300), ...box(1.4, 0.4, 0, -0.6), background: "linear-gradient(90deg, transparent, #fff2d8)" })} />
        <span className="g34-flow-back absolute block" style={st({ ...d(delayMs, 300), ...far(1.4, 0.4, 0.6), background: "linear-gradient(270deg, transparent, #58c9a8)" })} />
        {/* they pass through the same wall, halfway along */}
        <svg viewBox="0 0 24 24" className="g34-cross absolute block" style={st({ ...d(delayMs, 500), ...mid(1.8, 1.8) })}>
          <path d="M2 8h13l-3-3M22 16H9l3 3" stroke="#fff2d8" strokeWidth="2" fill="none" {...SJ} />
        </svg>
        {/* settle: condensate off the cold end */}
        <span className="g34-drip absolute block" style={st({ ...d(delayMs, 620), ...mid(1.4, 2.2, 1.5), background: "linear-gradient(180deg, rgba(88,201,168,0.85), transparent)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   8. Exchange Student (t2) — THE DOUBLE-HELIX STAIR. Two flights wound round
   the same well: the visitor climbs one and the host goes down the other, they
   cross at every turn, and they never once meet.
   Palette: #7ea6e8 / #ffeed2 / #17203a.
   ========================================================================== */
function HelixStair({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <svg viewBox="0 0 24 24" className="g34-ent absolute block" style={st({ ...d(delayMs, 80), left: "22%", top: "14%", width: "56%", height: "72%" })}>
          <path d="M6 2c8 4 8 8 0 12s-8 6 0 8" stroke="#7ea6e8" strokeWidth="2" fill="none" {...SJ} />
          <path d="M18 2c-8 4-8 8 0 12s8 6 0 8" stroke="#ffeed2" strokeWidth="2" fill="none" {...SJ} />
        </svg>
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 250), left: "22%", top: "56%", width: "16%", height: "22%", borderRadius: "999px", background: "#7ea6e8" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 250), left: "62%", top: "30%", width: "16%", height: "22%", borderRadius: "999px", background: "#ffeed2" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", border: "2px solid #7ea6e8" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "20%", top: "30%", width: "16%", height: "24%", borderRadius: "999px", background: "#ffeed2" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "64%", top: "46%", width: "16%", height: "24%", borderRadius: "999px", background: "#17203a" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "30%", top: "30%", width: "40%", height: "40%", borderRadius: "50%", background: "radial-gradient(circle, rgba(126,166,232,0.6), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(126,166,232,0.28)" />
      <AimStage>
        {/* tell: the open well of the stair, seen from below */}
        <span className="g34-tellmark absolute block" style={st({ ...d(delayMs, 60), ...mid(1.6, 1.6), borderRadius: "50%", border: "2px solid #ffeed2" })} />
        {/* the two flights, wound the same way round the same well */}
        <span
          className="g34-helix absolute block"
          style={st({ ...d(delayMs, 170), ...way(2.6, -0.6), background: "repeating-linear-gradient(64deg, #7ea6e8 0 6%, transparent 6% 15%)" })}
        />
        <span
          className="g34-taut absolute block"
          style={st({ ...d(delayMs, 230), ...way(2.6, 0.6), background: "repeating-linear-gradient(116deg, #17203a 0 6%, transparent 6% 15%)" })}
        />
        {/* strike: one goes up the outer, one comes down the inner */}
        <span
          className="g34-arc-over absolute block"
          style={st({ ...d(delayMs, 310), ...box(1.1, 1.7), borderRadius: "999px", background: "linear-gradient(180deg, #ffeed2, #7ea6e8)" })}
        />
        <span
          className="g34-arc-under absolute block"
          style={st({ ...d(delayMs, 310), ...far(1.1, 1.7), borderRadius: "999px", background: "linear-gradient(180deg, #7ea6e8, #17203a)" })}
        />
        {/* settle: dust turning in the light of the well */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 600), ...mid(3, 2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,210,0.5), transparent 74%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   9. Side Shuffle (t1) — THE SLIDING TILE. One empty socket in the frame is the
   whole mechanism: the tile beside it shoves across, and the socket has moved
   to where the tile was.
   Palette: #d8a24e / #fff2d6 / #241a10.
   ========================================================================== */
function SlidingTile({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "14%", top: "24%", width: "72%", height: "52%", border: "2px solid #d8a24e" })} />
        <span className="g34-gap absolute block" style={st({ ...d(delayMs, 210), left: "54%", top: "30%", width: "28%", height: "40%", background: "#241a10" })} />
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 380), left: "18%", top: "30%", width: "28%", height: "40%", background: "#fff2d6", border: "1px solid #241a10" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "16%", top: "26%", width: "68%", height: "48%", border: "2px solid #d8a24e" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "32%", width: "24%", height: "36%", background: "#fff2d6" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 330), left: "50%", top: "32%", width: "26%", height: "36%", background: "rgba(216,162,78,0.6)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(216,162,78,0.26)" />
      <AimStage>
        {/* tell: the runner the tile will take */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.14, 1.1), background: "#fff2d6" })} />
        {/* the frame the puzzle sits in */}
        <span
          className="g34-tellsquat absolute block"
          style={st({ ...d(delayMs, 130), ...way(2.4, 0), background: "linear-gradient(180deg, #241a10, #3d2a14)", border: "1px solid #d8a24e" })}
        />
        {/* the empty socket, waiting */}
        <span className="g34-gap absolute block" style={st({ ...d(delayMs, 210), ...far(1.7, 1.7), background: "#241a10", border: "1px solid #d8a24e" })} />
        {/* strike: the tile is shoved the whole way into it */}
        <span
          className="g34-slide-out absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.7, 1.7), background: "linear-gradient(180deg, #fff2d6, #d8a24e)", border: "1px solid #241a10" })}
        />
        {/* and the socket comes back to where the tile stood */}
        <span
          className="g34-slide-back absolute block"
          style={st({ ...d(delayMs, 300), ...far(1.5, 1.5), background: "#241a10" })}
        />
        {/* settle: the click, and grit out of the runner */}
        <span
          className="g34-dust absolute block"
          style={st({ ...d(delayMs, 560), ...mid(2.6, 1.4, 1.1), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,242,214,0.55), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   10. Tiptoe (t1) — THE ESCAPEMENT. The pallet fork rocks once: it lets one
   tooth of the escape wheel go and catches the next, and the wheel has moved
   two teeth without a sound.
   Palette: #b9c8d6 / #fff4d6 / #171d24.
   ========================================================================== */
function Escapement({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <svg viewBox="0 0 24 24" className="g34-ent absolute block" style={st({ ...d(delayMs, 80), left: "18%", top: "24%", width: "48%", height: "56%" })}>
          <circle cx="12" cy="12" r="9.2" fill="none" stroke="#b9c8d6" strokeWidth="1.4" strokeDasharray="2 2.6" />
          <circle cx="12" cy="12" r="2.2" fill="#fff4d6" />
        </svg>
        <span className="g34-pallet absolute block" style={st({ ...d(delayMs, 250), left: "56%", top: "34%", width: "28%", height: "8%", background: "#fff4d6" })} />
        <span className="g34-glint absolute block" style={st({ ...d(delayMs, 430), left: "62%", top: "54%", width: "20%", height: "6%", background: "#b9c8d6" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "28%", top: "28%", width: "44%", height: "44%", borderRadius: "50%", border: "2px dashed #b9c8d6" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "24%", top: "46%", width: "22%", height: "7%", background: "#fff4d6" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "36%", top: "36%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, rgba(185,200,214,0.7), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(185,200,214,0.24)" />
      <AimStage>
        {/* tell: the two teeth that matter are marked */}
        <span className="g34-tellmark absolute block" style={st({ ...d(delayMs, 60), ...mid(1.4, 1.4), border: "2px solid #fff4d6" })} />
        {/* the escape wheel */}
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 160), ...box(3.4, 3.4) })}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="#b9c8d6" strokeWidth="1.3" strokeDasharray="1.6 2.4" />
          <circle cx="12" cy="12" r="2.6" fill="#171d24" stroke="#fff4d6" strokeWidth="1.1" />
        </svg>
        {/* the fork rocks: one let go, one caught */}
        <span
          className="g34-pallet absolute block"
          style={st({ ...d(delayMs, 250), ...mid(2.4, 0.4), background: "#fff4d6" })}
        />
        {/* strike: two teeth trade places along the escaping line */}
        <span className="g34-slide-out absolute block" style={st({ ...d(delayMs, 320), ...box(0.8, 0.8, 0, -0.5), background: "#fff4d6" })} />
        <span className="g34-slide-back absolute block" style={st({ ...d(delayMs, 320), ...far(0.8, 0.8, 0.5), background: "#b9c8d6" })} />
        {/* settle: one silent glint off the jewel */}
        <span
          className="g34-glint absolute block"
          style={st({ ...d(delayMs, 540), ...mid(1.8, 0.3, -0.7), background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.9), transparent)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   11. Wheelbarrow (t1) — TWO BUCKETS ON ONE ROPE. The windlass barrel turns,
   the rope runs over it, and the full bucket comes up exactly as fast as the
   empty one goes down. They pass at the middle of the shaft.
   Palette: #9ab86a / #fff0cc / #1c2412.
   ========================================================================== */
function WellWindlass({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 80), left: "36%", top: "10%", width: "28%", height: "28%" })}>
          <circle cx="12" cy="12" r="9" fill="#1c2412" stroke="#9ab86a" strokeWidth="1.6" />
          <path d="M12 3v18M3 12h18" stroke="#fff0cc" strokeWidth="1.2" />
        </svg>
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 240), left: "22%", top: "52%", width: "20%", height: "22%", background: "#fff0cc" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 240), left: "58%", top: "38%", width: "20%", height: "22%", background: "#9ab86a" })} />
        <span className="g34-drip absolute block" style={st({ ...d(delayMs, 430), left: "30%", top: "74%", width: "6%", height: "18%", background: "rgba(154,184,106,0.85)" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "46%", top: "12%", width: "8%", height: "70%", background: "#fff0cc" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "48%", width: "22%", height: "24%", background: "#9ab86a" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "56%", top: "26%", width: "22%", height: "24%", background: "#1c2412" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "30%", top: "56%", width: "40%", height: "30%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(154,184,106,0.6), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(154,184,106,0.26)" />
      <AimStage>
        {/* tell: both bucket hooks chink against the barrel */}
        <span className="g34-tellpair absolute block" style={st({ ...d(delayMs, 60), ...box(0.8, 0.8, 0, -1.4), borderRadius: "50%", background: "#fff0cc" })} />
        {/* the rope, one span from hook to hook */}
        <span className="g34-taut absolute block" style={st({ ...d(delayMs, 180), ...way(0.16, 0), background: "#fff0cc" })} />
        {/* the barrel turning under it */}
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 230), ...box(1.6, 1.6, 0, -1) })}>
          <circle cx="12" cy="12" r="9.4" fill="#1c2412" stroke="#9ab86a" strokeWidth="1.7" />
          <path d="M12 2.6v18.8M2.6 12h18.8" stroke="#fff0cc" strokeWidth="1.2" />
        </svg>
        {/* strike: full bucket up, empty bucket down, same rope */}
        <span
          className="g34-lift-up absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.3, 1.3, 0, 0.3), background: "linear-gradient(180deg, #9ab86a, #1c2412)", border: "1px solid #fff0cc" })}
        />
        <span
          className="g34-lift-down absolute block"
          style={st({ ...d(delayMs, 300), ...far(1.3, 1.3, 0.3), background: "#1c2412", border: "1px solid #9ab86a" })}
        />
        {/* settle: what slopped over on the way past */}
        <span className="g34-drip absolute block" style={st({ ...d(delayMs, 580), ...mid(0.9, 2, 1.3), background: "linear-gradient(180deg, rgba(255,240,204,0.85), transparent)" })} />
      </AimStage>
    </>
  );
}

/* =============================================================================
   12. Country Auction (t1) — THE ROSTRUM. The hammer comes down on the block
   and the two lot tickets are dragged across the counter past each other, each
   into the other's ledger column.
   Palette: #d3873c / #ffe9c2 / #251706.
   ========================================================================== */
function AuctionBlock({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "12%", top: "58%", width: "76%", height: "8%", background: "#d3873c" })} />
        <svg viewBox="0 0 24 24" className="g34-fall absolute block" style={st({ ...d(delayMs, 230), left: "44%", top: "16%", width: "42%", height: "42%" })}>
          <path d="M4 20L14 10" stroke="#ffe9c2" strokeWidth="2.4" {...SJ} />
          <path d="M12.4 5.6l6 6-3 3-6-6z" fill="#251706" stroke="#ffe9c2" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 420), left: "16%", top: "66%", width: "22%", height: "18%", background: "#ffe9c2" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "56%", width: "76%", height: "7%", background: "#d3873c" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "34%", width: "22%", height: "20%", background: "#ffe9c2" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "56%", top: "34%", width: "22%", height: "20%", background: "#251706" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "34%", top: "40%", width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(circle, rgba(211,135,60,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(211,135,60,0.28)" />
      <AimStage>
        {/* tell: the counter, ruled the length of the sale */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.2, 1), background: "#ffe9c2" })} />
        {/* the block itself */}
        <span
          className="g34-tellsquat absolute block"
          style={st({ ...d(delayMs, 140), ...box(2, 1.1, 0, 0.7), background: "linear-gradient(180deg, #d3873c, #251706)" })}
        />
        {/* strike: the hammer falls, and the lot is sold */}
        <svg viewBox="0 0 24 24" className="g34-fall absolute block" style={st({ ...d(delayMs, 230), ...box(2.6, 2.6, 0, -0.6) })}>
          <path d="M3 21L14.6 9.4" stroke="#ffe9c2" strokeWidth="2.2" {...SJ} />
          <path d="M13 4.6l6.4 6.4-3.2 3.2-6.4-6.4z" fill="#251706" stroke="#ffe9c2" strokeWidth="1.2" {...SJ} />
        </svg>
        {/* the two lot tickets are dragged past each other on the counter */}
        <span
          className="g34-jerk-out absolute block"
          style={st({ ...d(delayMs, 320), ...box(1.4, 1, 0, 0.4), background: "#ffe9c2", border: "1px solid #251706" })}
        />
        <span
          className="g34-jerk-back absolute block"
          style={st({ ...d(delayMs, 320), ...far(1.4, 1, 0.4), background: "#d3873c", border: "1px solid #251706" })}
        />
        {/* settle: chalk dust off the sale board */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 600), ...mid(3, 1.8, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,194,0.5), transparent 74%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   13. Flea Market Find (t1) — THE TWO-PAN BALANCE. The trader drops one find
   into each pan; the beam swings over and the pans trade heights, so what was
   worth less is now the one held high.
   Palette: #c9b26a / #fff4d6 / #221c0e.
   ========================================================================== */
function BalanceScale({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-beam absolute block" style={st({ ...d(delayMs, 80), left: "12%", top: "36%", width: "76%", height: "5%", background: "#c9b26a" })} />
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 250), left: "16%", top: "52%", width: "24%", height: "12%", background: "#fff4d6" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 250), left: "60%", top: "52%", width: "24%", height: "12%", background: "#221c0e" })} />
        <span className="g34-glint absolute block" style={st({ ...d(delayMs, 430), left: "44%", top: "22%", width: "14%", height: "5%", background: "#fff4d6" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "42%", width: "72%", height: "5%", background: "#c9b26a" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "18%", top: "54%", width: "24%", height: "12%", background: "#fff4d6" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "58%", top: "54%", width: "24%", height: "12%", background: "#221c0e" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "36%", top: "26%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,178,106,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(201,178,106,0.26)" />
      <AimStage>
        {/* tell: the pointer settles on the fulcrum before anything is weighed */}
        <span className="g34-tellpair absolute block" style={st({ ...d(delayMs, 60), ...mid(0.5, 1.6, -0.9), background: "#fff4d6" })} />
        {/* the beam, one span end to end */}
        <span className="g34-beam absolute block" style={st({ ...d(delayMs, 180), ...way(0.3, -0.4), background: "#c9b26a" })} />
        {/* the cords down to the pans */}
        <span className="g34-taut absolute block" style={st({ ...d(delayMs, 240), ...way(0.1, 0.3), background: "rgba(255,244,214,0.7)" })} />
        {/* strike: the two finds trade heights */}
        <span
          className="g34-arc-over absolute block"
          style={st({ ...d(delayMs, 310), ...box(1.6, 0.7, 0, 0.8), background: "linear-gradient(180deg, #fff4d6, #c9b26a)" })}
        />
        <span
          className="g34-arc-under absolute block"
          style={st({ ...d(delayMs, 310), ...far(1.6, 0.7, 0.8), background: "linear-gradient(180deg, #c9b26a, #221c0e)" })}
        />
        {/* settle: one glint off the better of the two */}
        <span
          className="g34-glint absolute block"
          style={st({ ...d(delayMs, 560), ...mid(1.6, 0.34, -0.4), background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.95), transparent)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   14. Fresh Sod (t1) — TWO PLUGS OF TURF. Both spades go in, both plugs come
   out clean, and each is dropped into the socket the other one left. The new
   grass is greener than the ground it sits in.
   Palette: #6fbf5a / #fff2cf / #17240f.
   ========================================================================== */
function TurfPlugs({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "56%", width: "80%", height: "28%", background: "#17240f" })} />
        <span className="g34-lift-plug absolute block" style={st({ ...d(delayMs, 220), left: "18%", top: "44%", width: "26%", height: "22%", background: "#6fbf5a" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 400), left: "56%", top: "44%", width: "26%", height: "22%", background: "#fff2cf" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "16%", top: "58%", width: "68%", height: "24%", background: "#17240f" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "36%", width: "24%", height: "24%", background: "#6fbf5a" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "54%", top: "36%", width: "24%", height: "24%", background: "#fff2cf" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "30%", top: "50%", width: "40%", height: "26%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(111,191,90,0.6), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(111,191,90,0.26)" />
      <AimStage>
        {/* tell: the cut is marked between the two sockets */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.16, 0.9), background: "#fff2cf" })} />
        {/* the bed both plugs come out of */}
        <span
          className="g34-tellsquat absolute block"
          style={st({ ...d(delayMs, 130), ...way(1.6, 0.6), background: "linear-gradient(180deg, #17240f, #2c3d18)" })}
        />
        {/* the first plug is lifted clean out */}
        <span
          className="g34-lift-plug absolute block"
          style={st({ ...d(delayMs, 220), ...box(1.6, 1.2, 0, 0.4), background: "linear-gradient(180deg, #6fbf5a, #17240f)" })}
        />
        {/* strike: the two of them go across into each other's socket */}
        <span
          className="g34-haul-out absolute block"
          style={st({ ...d(delayMs, 320), ...box(1.5, 1.1, 0, -0.3), background: "linear-gradient(180deg, #6fbf5a, #17240f)", border: "1px solid #fff2cf" })}
        />
        <span
          className="g34-haul-back absolute block"
          style={st({ ...d(delayMs, 320), ...far(1.5, 1.1, -0.3), background: "linear-gradient(180deg, #fff2cf, #6fbf5a)" })}
        />
        {/* settle: loose soil off both edges */}
        <span
          className="g34-dust absolute block"
          style={st({ ...d(delayMs, 580), ...mid(3.2, 1.4, 1.2), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,242,207,0.5), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   15. Identical Twins (t1) — THE THIMBLERIG CROSS. Two cups, one crossing
   pass, and nothing whatever to tell you which is which afterwards. The pea is
   under both of them and neither.
   Palette: #cf5f4a / #ffe8c8 / #241310.
   ========================================================================== */
function Thimblerig({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "10%", top: "66%", width: "80%", height: "5%", background: "#cf5f4a" })} />
        <svg viewBox="0 0 24 24" className="g34-ent-out absolute block" style={st({ ...d(delayMs, 230), left: "16%", top: "34%", width: "30%", height: "34%" })}>
          <path d="M6 20L9 5h6l3 15z" fill="#241310" stroke="#ffe8c8" strokeWidth="1.2" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-ent-back absolute block" style={st({ ...d(delayMs, 230), left: "54%", top: "34%", width: "30%", height: "34%" })}>
          <path d="M6 20L9 5h6l3 15z" fill="#cf5f4a" stroke="#ffe8c8" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g34-glint absolute block" style={st({ ...d(delayMs, 440), left: "44%", top: "72%", width: "12%", height: "8%", borderRadius: "50%", background: "#ffe8c8" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "64%", width: "72%", height: "5%", background: "#cf5f4a" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "34%", width: "22%", height: "30%", background: "#241310" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "56%", top: "34%", width: "22%", height: "30%", background: "#cf5f4a" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "42%", top: "66%", width: "16%", height: "12%", borderRadius: "50%", background: "rgba(255,232,200,0.85)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(207,95,74,0.26)" />
      <AimStage>
        {/* tell: the pea is shown, once, at the halfway mark */}
        <span className="g34-tellmark absolute block" style={st({ ...d(delayMs, 60), ...mid(0.8, 0.8, 0.9), borderRadius: "50%", background: "#ffe8c8" })} />
        {/* the trestle the game is played on */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 150), ...way(0.24, 1.1), background: "#cf5f4a" })} />
        {/* strike: the cups cross, each turning right over as it goes */}
        <svg viewBox="0 0 24 24" className="g34-swing-out absolute block" style={st({ ...d(delayMs, 260), ...box(1.7, 1.7, 0, 0.2) })}>
          <path d="M5.4 20.4L8.6 4h6.8l3.2 16.4z" fill="#241310" stroke="#ffe8c8" strokeWidth="1.3" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-swing-back absolute block" style={st({ ...d(delayMs, 260), ...far(1.7, 1.7, 0.2) })}>
          <path d="M5.4 20.4L8.6 4h6.8l3.2 16.4z" fill="#cf5f4a" stroke="#ffe8c8" strokeWidth="1.3" {...SJ} />
        </svg>
        {/* the moment of the cross, which is the moment you lose track */}
        <span className="g34-pass absolute block" style={st({ ...d(delayMs, 470), ...mid(1.8, 1.8, 0.2), borderRadius: "50%", background: "radial-gradient(circle, #ffe8c8, transparent 68%)" })} />
        {/* settle: one glint off a cup rim, telling you nothing */}
        <span
          className="g34-glint absolute block"
          style={st({ ...d(delayMs, 580), ...mid(1.4, 0.3, -0.6), background: "linear-gradient(90deg, transparent, rgba(255,232,200,0.9), transparent)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   16. Personal Space (t1) — THE PASSING LOOP. Single track, one loop: the
   points are thrown, the two trains take their own road, meet abreast, and
   part again. They are never on the same rail at the same time.
   Palette: #6fbcd0 / #fff2d6 / #10242c.
   ========================================================================== */
function PassingLoop({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "48%", width: "84%", height: "4%", background: "#6fbcd0" })} />
        <span className="g34-points absolute block" style={st({ ...d(delayMs, 200), left: "30%", top: "38%", width: "40%", height: "4%", background: "#fff2d6" })} />
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 380), left: "14%", top: "54%", width: "26%", height: "16%", background: "#10242c", border: "1px solid #6fbcd0" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 380), left: "58%", top: "28%", width: "26%", height: "16%", background: "#6fbcd0" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "48%", width: "80%", height: "4%", background: "#6fbcd0" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "20%", top: "54%", width: "26%", height: "16%", background: "#fff2d6" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "54%", top: "30%", width: "26%", height: "16%", background: "#10242c" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "36%", top: "36%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle, rgba(111,188,208,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(111,188,208,0.26)" />
      <AimStage>
        {/* tell: the single line, section end to section end */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.16, 0), background: "#fff2d6" })} />
        {/* the points are thrown and the loop opens */}
        <span className="g34-points absolute block" style={st({ ...d(delayMs, 170), ...way(0.14, -0.9), background: "#6fbcd0" })} />
        <span className="g34-taut absolute block" style={st({ ...d(delayMs, 210), ...way(0.14, 0.9), background: "#6fbcd0" })} />
        {/* strike: each train takes its own road and they pass abreast */}
        <span
          className="g34-arc-over absolute block"
          style={st({ ...d(delayMs, 300), ...box(1.9, 0.9, 0, 0), background: "linear-gradient(90deg, #10242c, #6fbcd0)", border: "1px solid #fff2d6" })}
        />
        <span
          className="g34-arc-under absolute block"
          style={st({ ...d(delayMs, 300), ...far(1.9, 0.9, 0), background: "linear-gradient(270deg, #10242c, #fff2d6)" })}
        />
        {/* the gap between them at the loop, which is the whole rule */}
        <span className="g34-seam absolute block" style={st({ ...d(delayMs, 500), ...mid(0.2, 2.6), background: "#fff2d6" })} />
        {/* settle: steam blown away from the caster */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 610), ...mid(2.8, 1.8, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,214,0.5), transparent 74%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   17. Royal Barter (t1) — THE EXCHEQUER TABLE. Two heavy counters are pushed
   across the chequered cloth in opposite directions, and the tally stick is
   split so both halves say the same thing.
   Palette: #c8a24a / #fff4d6 / #1b1830.
   ========================================================================== */
function ExchequerTable({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span
          className="g34-ent absolute block"
          style={st({ ...d(delayMs, 70), left: "10%", top: "28%", width: "80%", height: "46%", background: "repeating-linear-gradient(90deg, #1b1830 0 12%, #2c2748 12% 24%)", border: "2px solid #c8a24a" })}
        />
        <span className="g34-ent-out absolute block" style={st({ ...d(delayMs, 240), left: "16%", top: "40%", width: "18%", height: "22%", borderRadius: "50%", background: "#c8a24a" })} />
        <span className="g34-ent-back absolute block" style={st({ ...d(delayMs, 240), left: "64%", top: "40%", width: "18%", height: "22%", borderRadius: "50%", background: "#fff4d6" })} />
        <span className="g34-flip absolute block" style={st({ ...d(delayMs, 430), left: "40%", top: "76%", width: "22%", height: "8%", background: "#fff4d6" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "14%", top: "30%", width: "72%", height: "40%", background: "repeating-linear-gradient(90deg, #1b1830 0 14%, #2c2748 14% 28%)" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "20%", top: "38%", width: "20%", height: "24%", borderRadius: "50%", background: "#c8a24a" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "60%", top: "38%", width: "20%", height: "24%", borderRadius: "50%", background: "#fff4d6" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,162,74,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(200,162,74,0.26)" />
      <AimStage>
        {/* tell: the cloth is ruled between the two accounts */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.14, -1.2), background: "#fff4d6" })} />
        {/* the chequered cloth itself */}
        <span
          className="g34-tellsquat absolute block"
          style={st({ ...d(delayMs, 140), ...way(2.6, 0), background: "repeating-linear-gradient(90deg, #1b1830 0 6%, #2c2748 6% 12%)", border: "1px solid #c8a24a" })}
        />
        {/* strike: the two counters are pushed past each other */}
        <span
          className="g34-slide-out absolute block"
          style={st({ ...d(delayMs, 260), ...box(1.2, 1.2, 0, -0.4), borderRadius: "50%", background: "linear-gradient(180deg, #fff4d6, #c8a24a)" })}
        />
        <span
          className="g34-slide-back absolute block"
          style={st({ ...d(delayMs, 260), ...far(1.2, 1.2, 0.4), borderRadius: "50%", background: "linear-gradient(180deg, #c8a24a, #1b1830)" })}
        />
        {/* the tally stick is split, halfway down the debt */}
        <span className="g34-flip absolute block" style={st({ ...d(delayMs, 470), ...mid(2.2, 0.5, 1.2), background: "#c8a24a" })} />
        {/* settle: gold light off the counted coin */}
        <span
          className="g34-glint absolute block"
          style={st({ ...d(delayMs, 590), ...mid(1.8, 0.34, 0), background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.95), transparent)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   18. Rummage Sale (t1) — THE COAT-CHECK CONVEYOR. The rail is started, the
   chain drags the whole rack round, and the garment you handed in goes back
   into the dark as somebody else's comes forward on the same hook line.
   Palette: #b06fd4 / #ffeedd / #201434.
   ========================================================================== */
function CoatRail({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "8%", top: "26%", width: "84%", height: "4%", background: "#b06fd4" })} />
        <span className="g34-chain absolute block" style={st({ ...d(delayMs, 210), left: "8%", top: "32%", width: "84%", height: "3%", background: "repeating-linear-gradient(90deg, #ffeedd 0 4%, transparent 4% 9%)" })} />
        <svg viewBox="0 0 24 24" className="g34-ent-out absolute block" style={st({ ...d(delayMs, 390), left: "16%", top: "34%", width: "30%", height: "48%" })}>
          <path d="M12 3a2 2 0 0 1 2 2c0 1.4-2 1.6-2 3l7 10H5l7-10z" fill="#201434" stroke="#ffeedd" strokeWidth="1.1" {...SJ} />
        </svg>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "24%", width: "76%", height: "5%", background: "#b06fd4" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "34%", width: "22%", height: "38%", background: "#ffeedd" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "56%", top: "34%", width: "22%", height: "38%", background: "#201434" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "34%", top: "40%", width: "32%", height: "30%", borderRadius: "50%", background: "radial-gradient(circle, rgba(176,111,212,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(176,111,212,0.26)" />
      <AimStage>
        {/* tell: the rail, hook line to hook line */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.2, -1.5), background: "#ffeedd" })} />
        {/* the drive chain starts to run along it */}
        <span
          className="g34-chain absolute block"
          style={st({ ...d(delayMs, 180), ...way(0.24, -1.1), background: "repeating-linear-gradient(90deg, #b06fd4 0 2.5%, transparent 2.5% 6%)" })}
        />
        {/* the sprocket at the near end */}
        <svg viewBox="0 0 24 24" className="g34-sheave absolute block" style={st({ ...d(delayMs, 230), ...box(1.3, 1.3, 0, -1.3) })}>
          <circle cx="12" cy="12" r="8.6" fill="#201434" stroke="#b06fd4" strokeWidth="1.6" />
          <path d="M12 3.4v17.2M3.4 12h17.2" stroke="#ffeedd" strokeWidth="1.1" />
        </svg>
        {/* strike: one garment out to the dark, one forward to the counter */}
        <svg viewBox="0 0 24 24" className="g34-haul-out absolute block" style={st({ ...d(delayMs, 310), ...box(1.6, 2.2, 0, 0.3) })}>
          <path d="M12 2.6a2.1 2.1 0 0 1 2.1 2.1c0 1.5-2.1 1.7-2.1 3.2l7.4 13.5H4.6L12 7.9z" fill="#201434" stroke="#ffeedd" strokeWidth="1.1" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g34-haul-back absolute block" style={st({ ...d(delayMs, 310), ...far(1.6, 2.2, 0.3) })}>
          <path d="M12 2.6a2.1 2.1 0 0 1 2.1 2.1c0 1.5-2.1 1.7-2.1 3.2l7.4 13.5H4.6L12 7.9z" fill="#b06fd4" stroke="#ffeedd" strokeWidth="1.1" {...SJ} />
        </svg>
        {/* settle: dust off the shoulders as they pass */}
        <span
          className="g34-motes absolute block"
          style={st({ ...d(delayMs, 590), ...mid(3, 2, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,221,0.5), transparent 74%)" })}
        />
      </AimStage>
    </>
  );
}

/* =============================================================================
   19. Stable Swap (t1) — THE ROUNDHOUSE TURNTABLE. The deck takes the engine
   end for end, the stalls come round in order, and the two of them roll off
   into each other's road.
   Palette: #d0733c / #ffe7c4 / #201410.
   ========================================================================== */
function Turntable({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut>
        <span className="g34-ent absolute block" style={st({ ...d(delayMs, 70), left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "50%", border: "2px solid #d0733c" })} />
        <span className="g34-deck absolute block" style={st({ ...d(delayMs, 230), left: "22%", top: "44%", width: "56%", height: "12%", background: "linear-gradient(90deg, #201410, #ffe7c4)" })} />
        <span className="g34-rung absolute block" style={st({ ...d(delayMs, 420), left: "44%", top: "78%", width: "12%", height: "16%", background: "#d0733c" })} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut>
        <span className="g34-hit absolute block" style={st({ ...d(delayMs, 40), left: "24%", top: "24%", width: "52%", height: "52%", borderRadius: "50%", border: "2px solid #d0733c" })} />
        <span className="g34-hit-out absolute block" style={st({ ...d(delayMs, 170), left: "22%", top: "44%", width: "26%", height: "14%", background: "#ffe7c4" })} />
        <span className="g34-hit-back absolute block" style={st({ ...d(delayMs, 170), left: "52%", top: "44%", width: "26%", height: "14%", background: "#201410" })} />
        <span className="g34-hit-fade absolute block" style={st({ ...d(delayMs, 320), left: "32%", top: "32%", width: "36%", height: "36%", borderRadius: "50%", background: "radial-gradient(circle, rgba(208,115,60,0.65), transparent 70%)" })} />
      </Cut>
    );
  }
  return (
    <>
      <Wash base={delayMs} tint="rgba(208,115,60,0.28)" />
      <AimStage>
        {/* tell: the pit is marked, and the road out of it */}
        <span className="g34-tellrail absolute block" style={st({ ...d(delayMs, 60), ...way(0.16, 0), background: "#ffe7c4" })} />
        {/* the stalls of the roundhouse arrive in the real victim order */}
        <span
          className="g34-rung absolute block"
          style={st({ ...dIndex(delayMs, 150, 55), ...box(0.9, 1.4, 0.9, -1.5), background: "#d0733c" })}
        />
        {/* strike: the deck takes the engine end for end */}
        <svg viewBox="0 0 24 24" className="g34-deck absolute block" style={st({ ...d(delayMs, 240), ...box(3.6, 3.6) })}>
          <circle cx="12" cy="12" r="10.6" fill="none" stroke="#d0733c" strokeWidth="1.2" strokeDasharray="2 2.2" />
          <path d="M1.6 10.4h20.8v3.2H1.6z" fill="#201410" stroke="#ffe7c4" strokeWidth="1" />
          <path d="M16 9.2h4v5.6h-4z" fill="#d0733c" />
        </svg>
        {/* the two engines roll off into each other's stall */}
        <span
          className="g34-slide-out absolute block"
          style={st({ ...d(delayMs, 340), ...box(1.9, 0.9, 0, 0.9), background: "linear-gradient(90deg, #201410, #d0733c)", border: "1px solid #ffe7c4" })}
        />
        <span
          className="g34-slide-back absolute block"
          style={st({ ...d(delayMs, 340), ...far(1.9, 0.9, 0.9), background: "linear-gradient(270deg, #201410, #ffe7c4)" })}
        />
        {/* settle: ash and smoke off the pit */}
        <span
          className="g34-dust absolute block"
          style={st({ ...d(delayMs, 600), ...mid(3.4, 1.8, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,231,196,0.5), transparent 72%)" })}
        />
      </AimStage>
    </>
  );
}

/* ===========================================================================
   Registry. Terse per-entry helper, same shape the other batches use, so the
   config stays on one readable line per card. Keys are at exactly two spaces
   of indent at object depth 1: the animation audit parses this table as TEXT.
   ======================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 8: the great exchange ---
  ov_cousin_from_out_of_town: S(RevolvingStage, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wheel", anchor: "aim",
  }),

  // --- Tier 5 ---
  bn4_ratlines: S(RopeFerry, {
    ordering: "line", staggerMs: 60, victims: ["k", "r"], hasLead: true, sound: "wall", anchor: "aim",
  }),
  ov_player_trade: S(LockStaircase, {
    ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "vault", anchor: "aim",
  }),

  // --- Tier 4 ---
  bn4_processional: S(Paternoster, {
    ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  ov_priest_hole: S(TurningPanel, {
    ordering: "line", staggerMs: 55, victims: ["k", "r"], hasLead: true, sound: "vault", anchor: "aim",
  }),

  // --- Tier 3 ---
  ov_bodyswap_ball: S(Allemande, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "gacha", anchor: "aim",
  }),
  ov_identity_crisis: S(ShellAndTube, {
    ordering: "line", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "clockcage", anchor: "aim",
  }),

  // --- Tier 2 ---
  op_exchange_student: S(HelixStair, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", source: "shield", anchor: "aim",
  }),

  // --- Tier 1 ---
  bn4_side_shuffle: S(SlidingTile, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim",
  }),
  bn4_tiptoe: S(Escapement, {
    ordering: "line", staggerMs: 50, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  bn4_wheelbarrow: S(WellWindlass, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "wheel", anchor: "aim",
  }),
  op_country_auction: S(AuctionBlock, {
    ordering: "line", staggerMs: 60, victims: ["r", "n"], hasLead: true, sound: "gacha", anchor: "aim",
  }),
  op_flea_market_find: S(BalanceScale, {
    ordering: "line", staggerMs: 60, victims: ["b", "n"], hasLead: true, sound: "gacha", anchor: "aim",
  }),
  op_fresh_sod: S(TurfPlugs, {
    ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "aim",
  }),
  op_identical_twins: S(Thimblerig, {
    ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "gacha", anchor: "aim",
  }),
  op_personal_space: S(PassingLoop, {
    ordering: "octagon", staggerMs: 50, victims: ["k"], hasLead: true, sound: "blitz", source: "kingSafe", anchor: "aim",
  }),
  op_royal_barter: S(ExchequerTable, {
    ordering: "line", staggerMs: 60, victims: ["q", "b"], hasLead: true, sound: "vault", anchor: "aim",
  }),
  op_rummage_sale: S(CoatRail, {
    ordering: "line", staggerMs: 60, victims: ["b", "n"], hasLead: true, sound: "wheel", anchor: "aim",
  }),
  op_stable_swap: S(Turntable, {
    ordering: "line", staggerMs: 60, victims: ["r", "n"], hasLead: true, sound: "wheel", anchor: "aim",
  }),
};
