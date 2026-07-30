// Bespoke plugin signatures for the g09 FROST batch: 29 freeze / stasis /
// binding cards that all used to share the generated `frostbloom` family. See
// sigPlugins.tsx for the contract. Self-contained: own inline SVG, own CSS
// (g09FrostPlays.css), transform/opacity only, no import from BoardEffects.tsx
// (cycle hazard), and only the SigPlugin TYPE imported from sigPlugins.tsx.
//
// MODULE FICTION: COLD AS A THING THAT ARRIVES AND TAKES HOLD. Every scene is a
// different way something is STOPPED. A winter sun going under and the snowline
// crossing the board; three ice bollards punched up out of the squares; a
// balance pan glazing over as the price is paid; a curtain of icicles dropped
// like a portcullis over a burning gate; a great dial riming from the twelve; a
// toll chain going taut across the midline and growing an ice sleeve; hoarfrost
// climbing the standing reserves from the boots up; a clear block lowered over a
// piece with its shadow still inside; a glacier front grinding down the attack
// vector; a coffer breathing frost and pressing ice coins; a branding iron so
// cold it burns white; a scythe of ice cutting the front line; a round council
// table splitting into wedges; rime spidering along the seams into a web; a
// squall dropping slabs of hail; a funeral bell cracking on the third toll;
// footprints that never thaw and a boot held fast; a clockwork hand snapping its
// fingers; a puddle skinning over and the skin racing outward; a harbour freezing
// from the far shore inward onto a moored hull; a hearth dying under frost
// flowers; ice tentacles bursting up through the board; sleet driven down like
// nails; a swoon fogged into a crystal heart; a jaw trap springing under the
// snow; a frozen gauntlet closing on a rimed coin; a whistle whose breath catches
// a piece mid-stride; a wheel of ice rolling one file at a time; a shelf calving
// into the water. No two cards share a central object.
//
// Rules kept everywhere: three beats (a tell of at most ~300ms, the strike, then
// a decaying settle); five or more animated layers in every lead cut; three
// palette colours per card (core / glow / deep), warm whites and never pure
// #fff; anything that means THE WHOLE BOARD lives inside <BoardFrame> so it
// stays exactly the board at any anchor; at least one animated layer per scene is
// driven by the geometry vars (--fx-side, --fx-len, --fx-index, --fx-ang); every
// card declares anchor "cast" or "aim"; and every scene answers all three roles,
// entrance included.
//
// Most of these cards decorate pieces that STAY on the board, so they name the
// zone they paint (`source: "frozen"`, `source: "stun"`, `source: "summon"`)
// rather than the removal diff.

import "./g09FrostPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Shared staging. Positioning and beat plumbing only: every card's central
   object, its strike and its settle are its own art. Class names are passed IN
   from each scene so a scene owns the layers it is counted for.
   ========================================================================== */

/** Beat delay: the caller's stagger plus this layer's own offset. */
const dm = (base: number, off: number): CSSProperties => ({ animationDelay: `${base + off}ms` });

/** Beat delay plus custom properties (travel vectors, geometry taps). */
const dv = (base: number, off: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${base + off}ms`, ...vars }) as CSSProperties;

/**
 * A positioned prop inside a stage. `x`/`y` are the prop's CENTRE and `w`/`h`
 * its size, all in stage percent: the stage is 14 cells across, so one board
 * square is 7.142857% and the cast square's centre is 50% / 50%.
 */
function P({
  x,
  y,
  w,
  h,
  cls,
  style,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cls: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      className={`${cls} absolute block`}
      style={{ left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%`, ...style }}
    >
      {children}
    </span>
  );
}

/** Square-local cut: the per-victim hit and the in-hand arrival. */
function Sq({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="block h-full w-full">
        {children}
      </svg>
    </span>
  );
}

/* --- board-wide layers. All of these live inside <BoardFrame>, so they mean
   the BOARD and not a percentage of an anchored stage. --------------------- */

/** The cold light the scene happens under. */
function Wash({ cls, tint, base, off }: { cls: string; tint: string; base: number; off: number }) {
  return (
    <BoardFrame>
      <span
        className={`${cls} absolute inset-0 block`}
        style={{
          background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 74%)`,
          animationDelay: `${base + off}ms`,
        }}
      />
    </BoardFrame>
  );
}

/** A full-board layer the scene styles itself (sheets, blankets, gusts). */
function Frame({ cls, style, children }: { cls: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <BoardFrame>
      <span className={`${cls} absolute inset-0 block`} style={style}>
        {children}
      </span>
    </BoardFrame>
  );
}

/** A band laid all the way across the board: a horizon, a midline, a shoreline. */
function Band({
  cls,
  color,
  y,
  h,
  base,
  off,
  style,
}: {
  cls: string;
  color: string;
  y: number;
  h: number;
  base: number;
  off: number;
  style?: CSSProperties;
}) {
  return (
    <BoardFrame>
      <span
        className={`${cls} absolute block`}
        style={{
          left: 0,
          width: "100%",
          top: `${y - h / 2}%`,
          height: `${h}%`,
          background: color,
          animationDelay: `${base + off}ms`,
          ...style,
        }}
      />
    </BoardFrame>
  );
}

/** Settle motes drifting off across the board. */
function Motes({
  cls,
  color,
  base,
  off,
  n = 3,
}: {
  cls: string;
  color: string;
  base: number;
  off: number;
  n?: number;
}) {
  return (
    <BoardFrame>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`${cls} absolute block`}
          style={{
            left: `${13 + i * 24}%`,
            top: `${26 + (i % 3) * 20}%`,
            width: "2.2%",
            height: "2.2%",
            borderRadius: "50%",
            background: color,
            animationDelay: `${base + i * 95 + off}ms`,
          }}
        />
      ))}
    </BoardFrame>
  );
}

/** The stand-in piece: the thing the cold takes hold of. 40x40 viewBox. */
const FIG = "M20 5.2a5 5 0 0 1 3 9.1L26.4 28H13.6L17 14.3a5 5 0 0 1 3-9.1z";
const FIG_BASE = "M12.6 28.6h14.8v4.2H12.6z";

/* =============================================================================
   1. The Long Winter (t8) — THE SUN GOES UNDER. Tell: the low winter sun sags
   toward a horizon drawn across the board. Strike: the snowline sweeps in from
   the far edge and buries the ranks. Settle: heavy flakes and drifting glints.
   ========================================================================== */

const C_LW = { core: "#8fc6e8", glow: "#f2f8ff", deep: "#0d2136" };
const LW_FLAKES = [12, 34, 58, 82];

function LongWinterScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="13" r="6.5" fill={C_LW.core} />
          <path d="M5 21h30" stroke={C_LW.deep} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 190)}>
          <path d="M4 27q8-6 16-2.5T36 22v13H4z" fill={C_LW.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="15" r="8" fill="none" stroke={C_LW.core} strokeWidth="2.4" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 200)}>
          <path d="M3 28q9-7 17-3t17-3v13H3z" fill={C_LW.glow} stroke={C_LW.deep} strokeWidth="1.5" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 380)}>
          <path d="M20 4v9M16 6l4 4 4-4" fill="none" stroke={C_LW.core} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(143,198,232,0.30)" base={delayMs} off={0} />
      <P cls="g09-lw-sun" x={50} y={41} w={12} h={12} style={dm(delayMs, 120)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <circle cx="20" cy="20" r="16" fill={C_LW.glow} opacity="0.45" />
          <circle cx="20" cy="20" r="9" fill={C_LW.core} />
        </svg>
      </P>
      <Band cls="g09-lw-horizon" color={C_LW.deep} y={50} h={1.4} base={delayMs} off={260} />
      <Frame
        cls="g09-lw-blanket"
        style={{
          ...dv(delayMs, 340, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(180deg, ${C_LW.glow} 0%, rgba(143,198,232,0.62) 46%, transparent 78%)`,
        }}
      />
      {LW_FLAKES.map((x, i) => (
        <BoardFrame key={i}>
          <span
            className="g09-lw-flake absolute block"
            style={{
              left: `${x}%`,
              top: "-8%",
              width: "3%",
              height: "3%",
              borderRadius: "50%",
              background: C_LW.glow,
              animationDelay: `${delayMs + i * 120 + 500}ms`,
            }}
          />
        </BoardFrame>
      ))}
      <Motes cls="g09-mote" color={C_LW.core} base={delayMs} off={760} />
    </BoardWideStage>
  );
}

/* =============================================================================
   2. Winter Garrison (t8) — THREE BOLLARDS OF ICE. Tell: three shadows pool on
   empty squares. Strike: the posts punch up out of the board, away from the
   caster. Settle: a packed-snow rampart runs across their heads and the first
   post takes a rime ward.
   ========================================================================== */

const C_WG = { core: "#a8d8e6", glow: "#eef9ff", deep: "#12303f" };
const WG_POSTS = [36, 50, 64];

function WinterGarrisonScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M14 34V16l6-6 6 6v18z" fill={C_WG.core} stroke={C_WG.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M8 17h24" stroke={C_WG.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M13 35V15l7-7 7 7v20z" fill={C_WG.deep} stroke={C_WG.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 200)}>
          <path d="M13 21h14" stroke={C_WG.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 390)}>
          <circle cx="20" cy="20" r="14" fill="none" stroke={C_WG.core} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(168,216,230,0.28)" base={delayMs} off={0} />
      {WG_POSTS.map((x, i) => (
        <P
          key={`s${i}`}
          cls="g09-wg-shadow"
          x={x}
          y={58}
          w={7}
          h={2.2}
          style={{ background: C_WG.deep, borderRadius: "50%", animationDelay: `${delayMs + i * 60}ms` }}
        />
      ))}
      {WG_POSTS.map((x, i) => (
        <P
          key={`p${i}`}
          cls="g09-wg-post"
          x={x}
          y={50}
          w={6.4}
          h={15}
          style={dv(delayMs, 160 + i * 110, { "--g09-side": "var(--fx-side, 1)" })}
        >
          <svg viewBox="0 0 40 100" className="block h-full w-full">
            <path d="M8 100V26l12-16 12 16v74z" fill={C_WG.core} stroke={C_WG.deep} strokeWidth="5" strokeLinejoin="round" />
            <path d="M14 44h12M14 60h12" stroke={C_WG.glow} strokeWidth="4" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P
        cls="g09-wg-cap"
        x={50}
        y={43}
        w={30}
        h={3.4}
        style={{ ...dm(delayMs, 470), background: C_WG.glow, borderRadius: "2px" }}
      />
      <P
        cls="g09-wg-ward"
        x={36}
        y={48}
        w={13}
        h={13}
        style={{ ...dm(delayMs, 600), border: `2px solid ${C_WG.glow}`, borderRadius: "50%" }}
      />
      <Motes cls="g09-mote" color={C_WG.core} base={delayMs} off={740} />
    </BoardWideStage>
  );
}

/* =============================================================================
   3. Blood Price (t8) — THE PAN THAT GLAZES. Tell: the balance beam quivers
   under a weight that has not landed yet. Strike: a dark drop falls into the
   near pan and the pan skins over on contact. Settle: a frost bar seizes the
   pivot so the beam can never swing back.
   ========================================================================== */

const C_BP = { core: "#b8d8ee", glow: "#f4f0ea", deep: "#3a1220" };

function BloodPriceScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M20 7v22M9 13h22" stroke={C_BP.core} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 13l-4 8h8z" fill={C_BP.glow} />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M28 13l-4 8h8z" fill={C_BP.deep} stroke={C_BP.core} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M20 6v24M8 12h24" stroke={C_BP.core} strokeWidth="2.8" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M20 8l3 5h-6z" fill={C_BP.deep} />
          <circle cx="20" cy="20" r="3" fill={C_BP.deep} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M10 32h20" stroke={C_BP.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(184,216,238,0.26)" base={delayMs} off={0} />
      <P cls="g09-bp-beam" x={50} y={45} w={30} h={12} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 120 48" className="block h-full w-full">
          <path d="M60 6v34M14 14h92" stroke={C_BP.core} strokeWidth="6" strokeLinecap="round" />
          <path d="M14 14l-9 18h18z" fill="none" stroke={C_BP.core} strokeWidth="5" strokeLinejoin="round" />
          <path d="M106 14l-9 18h18z" fill="none" stroke={C_BP.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <P
        cls="g09-bp-drip"
        x={42.5}
        y={38}
        w={2.4}
        h={3.4}
        style={{ ...dv(delayMs, 190, { "--g09-side": "var(--fx-side, 1)" }), background: C_BP.deep, borderRadius: "50%" }}
      />
      <P cls="g09-bp-pan" x={42.5} y={50} w={11} h={6} style={dm(delayMs, 360)}>
        <svg viewBox="0 0 60 32" className="block h-full w-full">
          <path d="M4 4h52l-10 24H14z" fill={C_BP.glow} stroke={C_BP.core} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <P cls="g09-bp-lock" x={50} y={41} w={9} h={9} style={dm(delayMs, 520)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M6 20h28M20 6v28M10 10l20 20M30 10L10 30" stroke={C_BP.glow} strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_BP.core} base={delayMs} off={700} />
    </BoardWideStage>
  );
}

/* =============================================================================
   4. The Burned Keep (t8) — THE PORTCULLIS OF ICICLES. Tell: the gate arch
   glows and steam gouts off the burning keep. Strike: the quench comes down as
   a curtain of icicles and lands like a portcullis. Settle: the seam flashes
   along the threshold and the steam goes to glitter.
   ========================================================================== */

const C_BK = { core: "#9fd4e8", glow: "#fff1de", deep: "#1a2c3a" };
const BK_STEAM = [40, 50, 60];
const BK_SPIKES = [-24, -12, 0, 12, 24];

function BurnedKeepScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M8 6h24v6H8z" fill={C_BK.core} />
          <path d="M11 12l3 9 3-9M20 12l3 11 3-11M29 12l2 8" stroke={C_BK.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 210)}>
          <path d="M7 31h26" stroke={C_BK.deep} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M10 34V17a10 10 0 0 1 20 0v17z" fill={C_BK.deep} stroke={C_BK.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 200)}>
          <path d="M13 15l2 9 2-9M20 15l2 11 2-11M27 16l1 7" stroke={C_BK.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 390)}>
          <path d="M9 8q5-5 11-2t11 1" fill="none" stroke={C_BK.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(255,241,222,0.24)" base={delayMs} off={0} />
      <P cls="g09-bk-gate" x={50} y={54} w={24} h={22} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 92" className="block h-full w-full">
          <path d="M14 90V40a36 36 0 0 1 72 0v50z" fill={C_BK.deep} stroke={C_BK.core} strokeWidth="6" strokeLinejoin="round" />
          <path d="M32 90V50a18 18 0 0 1 36 0v40z" fill={C_BK.glow} opacity="0.35" />
        </svg>
      </P>
      {BK_STEAM.map((x, i) => (
        <P
          key={i}
          cls="g09-bk-steam"
          x={x}
          y={38}
          w={5}
          h={12}
          style={{ ...dm(delayMs, 150), background: C_BK.glow, borderRadius: "999px", animationDelay: `${delayMs + i * 90 + 150}ms` }}
        />
      ))}
      <P
        cls="g09-bk-curtain"
        x={50}
        y={47}
        w={26}
        h={16}
        style={dv(delayMs, 330, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 104 64" className="block h-full w-full">
          <rect x="0" y="0" width="104" height="9" fill={C_BK.core} />
          {BK_SPIKES.map((o, i) => (
            <path key={i} d={`M${52 + o - 6} 9h12l-6 ${34 + (i % 2) * 16}z`} fill={C_BK.glow} stroke={C_BK.core} strokeWidth="2.5" strokeLinejoin="round" />
          ))}
        </svg>
      </P>
      <P
        cls="g09-bk-seam"
        x={50}
        y={64}
        w={28}
        h={1.6}
        style={{ ...dm(delayMs, 540), background: C_BK.glow, borderRadius: "999px" }}
      />
      <Motes cls="g09-mote" color={C_BK.core} base={delayMs} off={700} />
    </BoardWideStage>
  );
}

/* =============================================================================
   5. Doomsday Clock (t8) — THE DIAL RIMES OVER. Tell: the dial fades up and the
   case ticks once. Strike: the hand walks three heavy ticks while frost creeps
   down from the twelve. Settle: the glass crazes and cold dust falls off it.
   ========================================================================== */

const C_DC = { core: "#a9c8e4", glow: "#f6f1e2", deep: "#10203a" };
const DC_CRAZE = ["M20 20l-9-7", "M20 20l11-4", "M20 20l-4 12"];

function DoomsdayClockScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_DC.core} strokeWidth="2.6" />
          <path d="M20 20V11" stroke={C_DC.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M20 20l8 5" stroke={C_DC.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="13" fill={C_DC.deep} stroke={C_DC.core} strokeWidth="2.6" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M20 20V10M20 20l7 4" stroke={C_DC.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 4v4M36 20h-4M20 36v-4M4 20h4" stroke={C_DC.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(169,200,228,0.28)" base={delayMs} off={0} />
      <P cls="g09-dc-dial" x={50} y={50} w={26} h={26} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <circle cx="20" cy="20" r="18" fill={C_DC.deep} stroke={C_DC.core} strokeWidth="2.4" />
          <path d="M20 3v4M37 20h-4M20 37v-4M3 20h4" stroke={C_DC.core} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </P>
      <P
        cls="g09-dc-hand"
        x={50}
        y={50}
        w={26}
        h={26}
        style={dv(delayMs, 170, { "--g09-i": "var(--fx-index, 0)" })}
      >
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M20 20V6" stroke={C_DC.glow} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.2" fill={C_DC.glow} />
        </svg>
      </P>
      <P
        cls="g09-dc-rime"
        x={50}
        y={50}
        w={26}
        h={26}
        style={{
          ...dm(delayMs, 360),
          background: `linear-gradient(180deg, ${C_DC.glow} 0%, rgba(169,200,228,0.5) 52%, transparent 84%)`,
          borderRadius: "50%",
        }}
      />
      <P cls="g09-dc-craze" x={50} y={50} w={26} h={26} style={dm(delayMs, 540)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          {DC_CRAZE.map((p, i) => (
            <path key={i} d={p} stroke={C_DC.glow} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          ))}
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_DC.core} base={delayMs} off={700} />
    </BoardWideStage>
  );
}

/* =============================================================================
   6. Eternal Toll (t8) — THE CHAIN ACROSS THE BORDER. Tell: two boundary posts
   rise on the midline. Strike: the toll chain snaps taut all the way across the
   board. Settle: an ice sleeve thickens along it and icicles hang off the
   links.
   ========================================================================== */

const C_ET = { core: "#86c2d6", glow: "#eef7fb", deep: "#10222e" };
const ET_ICICLES = [26, 44, 62, 80];

function EternalTollScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M4 18h32" stroke={C_ET.core} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="20" cy="18" r="4" fill="none" stroke={C_ET.glow} strokeWidth="2.4" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 210)}>
          <path d="M12 20l-2 9M28 20l2 9" stroke={C_ET.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M9 12v18M31 12v18" stroke={C_ET.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 200)}>
          <path d="M9 17h22" stroke={C_ET.glow} strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="17" r="3.4" fill="none" stroke={C_ET.deep} strokeWidth="2" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 390)}>
          <path d="M14 20l-1.5 7M26 20l1.5 7" stroke={C_ET.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(134,194,214,0.26)" base={delayMs} off={0} />
      <BoardFrame>
        <span className="g09-et-post absolute block" style={{ left: "1%", top: "38%", width: "4%", height: "24%", background: C_ET.deep, animationDelay: `${delayMs}ms` }} />
      </BoardFrame>
      <BoardFrame>
        <span className="g09-et-post absolute block" style={{ left: "95%", top: "38%", width: "4%", height: "24%", background: C_ET.deep, animationDelay: `${delayMs + 80}ms` }} />
      </BoardFrame>
      <Band
        cls="g09-et-chain"
        color={C_ET.core}
        y={50}
        h={2.6}
        base={delayMs}
        off={220}
        style={dv(delayMs, 220, { "--g09-side": "var(--fx-side, 1)" })}
      />
      <Band cls="g09-et-sleeve" color={C_ET.glow} y={50} h={5} base={delayMs} off={420} />
      {ET_ICICLES.map((x, i) => (
        <BoardFrame key={i}>
          <span
            className="g09-et-icicle absolute block"
            style={{
              left: `${x}%`,
              top: "52%",
              width: "2.4%",
              height: "9%",
              background: `linear-gradient(180deg, ${C_ET.glow}, transparent)`,
              animationDelay: `${delayMs + i * 90 + 560}ms`,
            }}
          />
        </BoardFrame>
      ))}
      <Motes cls="g09-mote" color={C_ET.core} base={delayMs} off={760} />
    </BoardWideStage>
  );
}

/* =============================================================================
   7. Frozen Reserves (t8) — HOARFROST FROM THE BOOTS UP. Tell: the rack of
   standing reserves is drawn, kit still shouldered. Strike: hoarfrost climbs
   them from the feet, away from the caster, and stops them where they stand.
   Settle: rime spikes sprout off the shoulders and an ice bar drops across the
   rack.
   ========================================================================== */

const C_FR = { core: "#9ec6d8", glow: "#f0f6fa", deep: "#16283a" };
const FR_STAND = [40, 50, 60];
const FR_SPIKES = [-16, -4, 8, 20];

function FrozenReservesScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d={FIG} fill={C_FR.core} stroke={C_FR.deep} strokeWidth="1.8" strokeLinejoin="round" />
          <path d={FIG_BASE} fill={C_FR.deep} />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M11 33h18v-8H11z" fill={C_FR.glow} opacity="0.9" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d={FIG} fill="none" stroke={C_FR.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M11 34h18v-10H11z" fill={C_FR.glow} opacity="0.85" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M8 22l-4-3M32 22l4-3" stroke={C_FR.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(158,198,216,0.26)" base={delayMs} off={0} />
      <P cls="g09-fr-rack" x={50} y={52} w={28} h={20} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 120 84" className="block h-full w-full">
          <path d="M6 78h108" stroke={C_FR.deep} strokeWidth="6" strokeLinecap="round" />
          {FR_STAND.map((_, i) => (
            <g key={i} transform={`translate(${18 + i * 34} 0)`}>
              <path d="M12 78V30a10 10 0 0 1 20 0v48z" fill={C_FR.deep} stroke={C_FR.core} strokeWidth="5" strokeLinejoin="round" />
              <path d="M22 30V10" stroke={C_FR.core} strokeWidth="5" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      </P>
      <P
        cls="g09-fr-climb"
        x={50}
        y={57}
        w={28}
        h={16}
        style={{
          ...dv(delayMs, 220, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(0deg, ${C_FR.glow} 0%, rgba(158,198,216,0.55) 58%, transparent 92%)`,
        }}
      />
      <P cls="g09-fr-spike" x={50} y={45} w={28} h={7} style={dm(delayMs, 430)}>
        <svg viewBox="0 0 120 30" className="block h-full w-full">
          {FR_SPIKES.map((o, i) => (
            <path key={i} d={`M${52 + o} 28l4-${16 + (i % 2) * 8} 4 ${16 + (i % 2) * 8}z`} fill={C_FR.glow} />
          ))}
        </svg>
      </P>
      <P cls="g09-fr-bar" x={50} y={49} w={30} h={2.2} style={{ ...dm(delayMs, 570), background: C_FR.core, borderRadius: "2px" }} />
      <Motes cls="g09-mote" color={C_FR.glow} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   8. Glass Prison (t8) — SEALED WITH THE SHADOW STILL INSIDE. Tell: the piece's
   shadow pools and darkens on its square. Strike: a clear block comes down over
   it and lands. Settle: the piece dims inside, facet highlights sweep the
   faces, and the seal frosts at the base.
   ========================================================================== */

const C_GP = { core: "#b6e0ef", glow: "#f3fbff", deep: "#123243" };
const GP_FACETS = [-8, 2, 12];

function GlassPrisonScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <rect x="7" y="6" width="26" height="28" fill={C_GP.glow} opacity="0.42" stroke={C_GP.core} strokeWidth="2" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d={FIG} fill={C_GP.deep} opacity="0.8" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d={FIG} fill={C_GP.core} />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <rect x="6" y="5" width="28" height="30" fill="none" stroke={C_GP.glow} strokeWidth="2.6" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M9 9l6 6M31 9l-6 6" stroke={C_GP.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(182,224,239,0.26)" base={delayMs} off={0} />
      <P
        cls="g09-gp-shadow"
        x={50}
        y={57}
        w={11}
        h={3.4}
        style={{ ...dm(delayMs, 0), background: C_GP.deep, borderRadius: "50%" }}
      />
      <P
        cls="g09-gp-block"
        x={50}
        y={49}
        w={15}
        h={17}
        style={dv(delayMs, 180, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 60 68" className="block h-full w-full">
          <rect x="4" y="4" width="52" height="60" fill={C_GP.glow} opacity="0.3" stroke={C_GP.core} strokeWidth="4" />
          <path d="M12 10v52M48 10v52" stroke={C_GP.glow} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-gp-piece" x={50} y={50} w={9} h={11} style={dm(delayMs, 380)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d={FIG} fill={C_GP.deep} />
          <path d={FIG_BASE} fill={C_GP.deep} />
        </svg>
      </P>
      {GP_FACETS.map((o, i) => (
        <P
          key={i}
          cls="g09-gp-facet"
          x={50 + o * 0.5}
          y={49}
          w={2.6}
          h={17}
          style={{ background: C_GP.glow, animationDelay: `${delayMs + i * 110 + 500}ms` }}
        />
      ))}
      <Motes cls="g09-mote" color={C_GP.core} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   9. The Great Glacier (t8) — THE FRONT GRINDS THROUGH. Tell: the board shudders
   along a rumble line. Strike: a glacier face grinds down the attack vector,
   its travel scaled by the real leg length. Settle: scour grooves stay behind
   it and two bergs calve off the face.
   ========================================================================== */

const C_GG = { core: "#8ec9e0", glow: "#eef8ff", deep: "#0e2740" };
const GG_GROOVES = [44, 50, 56];

function GreatGlacierScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M2 30l7-14 6 8 6-12 7 12 6-6 4 12z" fill={C_GG.core} stroke={C_GG.deep} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M4 34h32" stroke={C_GG.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M4 32l8-16 7 9 6-13 8 14 3-5v11z" fill={C_GG.deep} stroke={C_GG.core} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M12 16l3 16M25 12l2 20" stroke={C_GG.glow} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M5 36h30" stroke={C_GG.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <AimStage>
      <Wash cls="g09-wash" tint="rgba(142,201,224,0.28)" base={delayMs} off={0} />
      <P cls="g09-gg-rumble" x={50} y={57} w={40} h={1.6} style={{ ...dm(delayMs, 0), background: C_GG.deep, borderRadius: "999px" }} />
      <P
        cls="g09-gg-front"
        x={44}
        y={50}
        w={16}
        h={20}
        style={dv(delayMs, 180, { "--g09-len": "var(--fx-len, 3)" })}
      >
        <svg viewBox="0 0 64 80" className="block h-full w-full">
          <path d="M2 78V26l14-18 10 22 12-24 12 26 12-10v56z" fill={C_GG.glow} stroke={C_GG.core} strokeWidth="5" strokeLinejoin="round" />
          <path d="M18 24v54M40 26v52" stroke={C_GG.core} strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </P>
      {GG_GROOVES.map((y, i) => (
        <P
          key={i}
          cls="g09-gg-scour"
          x={56}
          y={y}
          w={26}
          h={1.2}
          style={{ background: C_GG.deep, borderRadius: "999px", animationDelay: `${delayMs + i * 90 + 380}ms` }}
        />
      ))}
      <P cls="g09-gg-berg" x={58} y={44} w={6} h={6} style={{ ...dm(delayMs, 520), background: C_GG.glow }} />
      <P cls="g09-gg-berg" x={62} y={57} w={4.4} h={4.4} style={{ ...dm(delayMs, 610), background: C_GG.core }} />
      <Motes cls="g09-mote" color={C_GG.glow} base={delayMs} off={740} />
    </AimStage>
  );
}

/* =============================================================================
   10. King's Ransom (t8) — THE COFFER PAYS IN ICE. Tell: the coffer lid creaks
   against its hasp. Strike: frost pours over the lip and two coins are pressed
   out of it. Settle: a clasp snaps shut over each coin and the fog thins.
   ========================================================================== */

const C_KR = { core: "#a6cfe2", glow: "#f6efdc", deep: "#14283c" };
const KR_COINS = [43, 57];

function KingsRansomScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="10" fill={C_KR.glow} stroke={C_KR.deep} strokeWidth="2.2" />
          <path d="M16 20h8M20 16v8" stroke={C_KR.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M8 30q12 6 24 0" fill="none" stroke={C_KR.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <rect x="7" y="17" width="26" height="16" fill={C_KR.deep} stroke={C_KR.core} strokeWidth="2.4" />
          <rect x="17" y="21" width="6" height="8" fill={C_KR.core} />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M7 17V13a13 13 0 0 1 26 0v4z" fill={C_KR.core} stroke={C_KR.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="9" r="4" fill={C_KR.glow} />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(166,207,226,0.26)" base={delayMs} off={0} />
      <P cls="g09-kr-coffer" x={50} y={56} w={22} h={14} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 64" className="block h-full w-full">
          <rect x="6" y="20" width="88" height="40" fill={C_KR.deep} stroke={C_KR.core} strokeWidth="5" />
          <path d="M6 20V16a44 22 0 0 1 88 0v4z" fill={C_KR.core} stroke={C_KR.deep} strokeWidth="4" strokeLinejoin="round" />
          <rect x="42" y="26" width="16" height="20" fill={C_KR.glow} />
        </svg>
      </P>
      <P
        cls="g09-kr-breath"
        x={50}
        y={62}
        w={30}
        h={9}
        style={{
          ...dv(delayMs, 200, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(180deg, rgba(246,239,220,0.85), transparent)`,
        }}
      />
      {KR_COINS.map((x, i) => (
        <P
          key={i}
          cls="g09-kr-coin"
          x={x}
          y={48}
          w={7}
          h={7}
          style={{ animationDelay: `${delayMs + i * 120 + 380}ms` }}
        >
          <svg viewBox="0 0 40 40" className="block h-full w-full">
            <circle cx="20" cy="20" r="17" fill={C_KR.glow} stroke={C_KR.core} strokeWidth="4" />
            <path d="M13 20h14M20 13v14" stroke={C_KR.deep} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P cls="g09-kr-clasp" x={50} y={48} w={22} h={9} style={dm(delayMs, 590)}>
        <svg viewBox="0 0 100 40" className="block h-full w-full">
          <path d="M6 6v28M94 6v28M6 20h88" stroke={C_KR.core} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_KR.glow} base={delayMs} off={730} />
    </BoardWideStage>
  );
}

/* =============================================================================
   11. Oathbreaker's Brand (t8) — THE IRON THAT BURNS COLD. Tell: the castle gate
   is drawn and the iron hangs over it. Strike: the brand swings down and
   presses, white-frost instead of fire. Settle: the sigil holds, frost hisses
   off the contact, and the gate seizes on its hinge.
   ========================================================================== */

const C_OB = { core: "#9fd0dd", glow: "#f2f7f2", deep: "#17303a" };
const OB_HISS = [-10, 0, 10];

function OathbreakersBrandScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="11" fill="none" stroke={C_OB.core} strokeWidth="2.6" />
          <path d="M14 26L26 14M14 14l12 12" stroke={C_OB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M20 4v6" stroke={C_OB.deep} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <rect x="18" y="3" width="4" height="16" fill={C_OB.deep} />
          <circle cx="20" cy="26" r="9" fill="none" stroke={C_OB.core} strokeWidth="3" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M15 26h10M20 21v10" stroke={C_OB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M9 34q11 4 22 0" fill="none" stroke={C_OB.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(159,208,221,0.26)" base={delayMs} off={0} />
      <P cls="g09-ob-gate" x={50} y={57} w={24} h={20} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 84" className="block h-full w-full">
          <path d="M16 82V36a34 34 0 0 1 68 0v46z" fill={C_OB.deep} stroke={C_OB.core} strokeWidth="6" strokeLinejoin="round" />
          <path d="M50 12v70" stroke={C_OB.core} strokeWidth="4" />
        </svg>
      </P>
      <P
        cls="g09-ob-iron"
        x={50}
        y={40}
        w={9}
        h={20}
        style={dv(delayMs, 180, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 40 90" className="block h-full w-full">
          <rect x="16" y="0" width="8" height="52" fill={C_OB.deep} />
          <circle cx="20" cy="68" r="17" fill="none" stroke={C_OB.core} strokeWidth="7" />
          <path d="M12 60l16 16M28 60L12 76" stroke={C_OB.core} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-ob-sigil" x={50} y={55} w={13} h={13} style={dm(delayMs, 420)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <circle cx="20" cy="20" r="16" fill="none" stroke={C_OB.glow} strokeWidth="4" />
          <path d="M10 10l20 20M30 10L10 30" stroke={C_OB.glow} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      {OB_HISS.map((o, i) => (
        <P
          key={i}
          cls="g09-ob-hiss"
          x={50 + o * 0.55}
          y={50}
          w={3}
          h={9}
          style={{ background: `linear-gradient(0deg, ${C_OB.glow}, transparent)`, animationDelay: `${delayMs + i * 90 + 540}ms` }}
        />
      ))}
      <Motes cls="g09-mote" color={C_OB.core} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   12. Reaper's Due (t8) — THE SCYTHE OF ICE. Tell: the cutting arc is scribed
   ahead of the blade. Strike: an ice scythe sweeps down the attack vector.
   Settle: three stalks of frozen breath stand cut but upright, and crystal
   chaff is thrown off the edge.
   ========================================================================== */

const C_RD = { core: "#8fc0c6", glow: "#eef8f5", deep: "#12262c" };
const RD_STALKS = [54, 60, 66];
const RD_CHAFF = [-6, 4, 14];

function ReapersDueScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M4 10q18-2 30 12" fill="none" stroke={C_RD.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M12 34V20M20 34V17M28 34v-12" stroke={C_RD.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M26 6v28" stroke={C_RD.deep} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M26 9q-16 0-20 14" fill="none" stroke={C_RD.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M9 30l-3 5M15 32l-2 5" stroke={C_RD.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <AimStage>
      <Wash cls="g09-wash" tint="rgba(143,192,198,0.26)" base={delayMs} off={0} />
      <P cls="g09-rd-arc" x={54} y={50} w={26} h={20} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 80" className="block h-full w-full">
          <path d="M6 66q40-58 90-16" fill="none" stroke={C_RD.deep} strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
        </svg>
      </P>
      <P
        cls="g09-rd-blade"
        x={50}
        y={49}
        w={26}
        h={22}
        style={dv(delayMs, 190, { "--g09-len": "var(--fx-len, 3)" })}
      >
        <svg viewBox="0 0 100 88" className="block h-full w-full">
          <path d="M10 82V12" stroke={C_RD.deep} strokeWidth="7" strokeLinecap="round" />
          <path d="M10 16q52-4 82 40" fill="none" stroke={C_RD.glow} strokeWidth="9" strokeLinecap="round" />
          <path d="M10 22q46 0 72 34" fill="none" stroke={C_RD.core} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      {RD_STALKS.map((x, i) => (
        <P
          key={i}
          cls="g09-rd-stalk"
          x={x}
          y={54}
          w={2}
          h={11}
          style={{ background: `linear-gradient(0deg, ${C_RD.core}, ${C_RD.glow})`, animationDelay: `${delayMs + i * 90 + 410}ms` }}
        />
      ))}
      {RD_CHAFF.map((o, i) => (
        <P
          key={i}
          cls="g09-rd-chaff"
          x={56 + o * 0.5}
          y={46}
          w={2.2}
          h={2.2}
          style={{ background: C_RD.glow, borderRadius: "50%", animationDelay: `${delayMs + i * 80 + 560}ms` }}
        />
      ))}
      <Motes cls="g09-mote" color={C_RD.core} base={delayMs} off={730} />
    </AimStage>
  );
}

/* =============================================================================
   13. Shattered Council (t8) — THE TABLE SPLITS. Tell: a hairline crack shows
   in the round ice table. Strike: the crack races the full width and the table
   parts into wedges. Settle: two chairs frost over where the councillors sat.
   ========================================================================== */

const C_SC = { core: "#a3c9dd", glow: "#f4f7fb", deep: "#17263a" };
const SC_WEDGES = [-130, -10, 110];
const SC_CHAIRS = [36, 64];

function ShatteredCouncilScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill={C_SC.core} stroke={C_SC.deep} strokeWidth="2.2" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M20 8v24M9 15l22 10" stroke={C_SC.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="21" rx="14" ry="8" fill={C_SC.deep} stroke={C_SC.core} strokeWidth="2.4" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M7 21h26" stroke={C_SC.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M11 30v6M29 30v6" stroke={C_SC.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(163,201,221,0.26)" base={delayMs} off={0} />
      <P cls="g09-sc-table" x={50} y={51} w={26} h={17} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 66" className="block h-full w-full">
          <ellipse cx="50" cy="33" rx="46" ry="29" fill={C_SC.deep} stroke={C_SC.core} strokeWidth="5" />
        </svg>
      </P>
      <P
        cls="g09-sc-crack"
        x={50}
        y={51}
        w={27}
        h={1.4}
        style={{ ...dv(delayMs, 170, { "--g09-ang": "var(--fx-ang, 0)" }), background: C_SC.glow, borderRadius: "999px" }}
      />
      {SC_WEDGES.map((r, i) => (
        <P
          key={i}
          cls="g09-sc-wedge"
          x={50}
          y={51}
          w={26}
          h={17}
          style={{ transformOrigin: "50% 50%", animationDelay: `${delayMs + i * 90 + 380}ms`, "--g09-r": `${r}deg` } as CSSProperties}
        >
          <svg viewBox="0 0 100 66" className="block h-full w-full">
            <path d="M50 33L96 22a46 29 0 0 1-10 30z" fill={C_SC.core} stroke={C_SC.glow} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      {SC_CHAIRS.map((x, i) => (
        <P
          key={i}
          cls="g09-sc-chair"
          x={x}
          y={64}
          w={6}
          h={9}
          style={{ animationDelay: `${delayMs + i * 120 + 540}ms` }}
        >
          <svg viewBox="0 0 40 60" className="block h-full w-full">
            <path d="M8 58V22h24v36M8 40h24" stroke={C_SC.glow} strokeWidth="6" fill="none" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <Motes cls="g09-mote" color={C_SC.core} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   14. Spider's Parlor (t8) — RIME ALONG THE SEAMS. Tell: two anchor threads
   stretch between the armies. Strike: the web inscribes itself, rime spidering
   out along every seam. Settle: a hoar-spider drops on a thread and one strand
   snaps rigid.
   ========================================================================== */

const C_SP = { core: "#b0d6e4", glow: "#f1f9fc", deep: "#142634" };
const SP_THREADS = [-34, 34];

function SpidersParlorScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M20 20L4 6M20 20l16-14M20 20L6 34M20 20l14 14" stroke={C_SP.core} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M11 13q9 5 18 0M9 27q11-6 22 0" fill="none" stroke={C_SP.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M20 4v32M4 20h32M8 8l24 24M32 8L8 32" stroke={C_SP.core} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <circle cx="20" cy="20" r="9" fill="none" stroke={C_SP.glow} strokeWidth="2.2" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <ellipse cx="20" cy="20" rx="4" ry="3.2" fill={C_SP.deep} />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(176,214,228,0.26)" base={delayMs} off={0} />
      {SP_THREADS.map((o, i) => (
        <P
          key={i}
          cls="g09-sp-thread"
          x={50 + o * 0.5}
          y={50}
          w={34}
          h={1}
          style={{ background: C_SP.core, borderRadius: "999px", transform: `rotate(${o}deg)`, animationDelay: `${delayMs + i * 70}ms` }}
        />
      ))}
      <P
        cls="g09-sp-web"
        x={50}
        y={50}
        w={34}
        h={34}
        style={dv(delayMs, 210, { "--g09-len": "var(--fx-len, 3)" })}
      >
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <g fill="none" stroke={C_SP.glow} strokeWidth="2.4" strokeLinecap="round">
            <path d="M50 4v92M4 50h92M16 16l68 68M84 16L16 84" />
            <path d="M50 16 78 30 84 58 62 82 34 82 14 58 22 28z" />
            <path d="M50 30 68 40 70 58 56 72 40 70 30 54 36 38z" />
          </g>
        </svg>
      </P>
      <P cls="g09-sp-spider" x={57} y={41} w={5.6} h={5.6} style={dm(delayMs, 440)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <ellipse cx="20" cy="22" rx="9" ry="7" fill={C_SP.deep} stroke={C_SP.glow} strokeWidth="2.4" />
          <path d="M11 18L2 10M29 18l9-8M11 26L3 32M29 26l8 6" stroke={C_SP.glow} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-sp-taut" x={50} y={57} w={30} h={1.6} style={{ ...dm(delayMs, 580), background: C_SP.glow, borderRadius: "999px" }} />
      <Motes cls="g09-mote" color={C_SP.core} base={delayMs} off={740} />
    </BoardWideStage>
  );
}

/* =============================================================================
   15. Tempest (t8) — THE SQUALL DROPS ITS WRECKAGE. Tell: a whiteout gust
   curtain crosses the board, leaning away from the caster. Strike: three slabs
   of hail slam down as wreckage. Settle: splinters skate outward and one slab
   keeps its light: the bridge left open.
   ========================================================================== */

const C_TP = { core: "#9cc4dc", glow: "#eff6fd", deep: "#0f2233" };
const TP_SLABS = [
  { x: 40, y: 46, w: 9 },
  { x: 55, y: 57, w: 11 },
  { x: 62, y: 42, w: 8 },
];
const TP_SPLINT = [-14, -4, 8, 18];

function TempestScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M8 10l24 6-6 18-20-8z" fill={C_TP.core} stroke={C_TP.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M4 32q10 5 32-2" fill="none" stroke={C_TP.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M6 14l26 4-4 18-22-6z" fill={C_TP.deep} stroke={C_TP.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M4 8q14-5 30 0M4 14q10-3 20-1" fill="none" stroke={C_TP.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M12 36l-4 3M26 36l4 3" stroke={C_TP.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(156,196,220,0.28)" base={delayMs} off={0} />
      <Frame
        cls="g09-tp-gust"
        style={{
          ...dv(delayMs, 0, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(100deg, transparent 8%, ${C_TP.glow} 48%, transparent 88%)`,
        }}
      />
      {TP_SLABS.map((s, i) => (
        <P
          key={i}
          cls="g09-tp-slab"
          x={s.x}
          y={s.y}
          w={s.w}
          h={s.w * 0.7}
          style={{ animationDelay: `${delayMs + i * 110 + 270}ms` }}
        >
          <svg viewBox="0 0 60 42" className="block h-full w-full">
            <path d="M4 12L34 2l22 12-8 26-34-4z" fill={C_TP.core} stroke={C_TP.deep} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      {TP_SPLINT.map((o, i) => (
        <P
          key={i}
          cls="g09-tp-splint"
          x={52 + o * 0.4}
          y={54}
          w={2.4}
          h={1.2}
          style={{ background: C_TP.glow, borderRadius: "999px", animationDelay: `${delayMs + i * 80 + 520}ms` }}
        />
      ))}
      <P
        cls="g09-tp-bridge"
        x={55}
        y={57}
        w={13}
        h={13}
        style={{ ...dm(delayMs, 640), border: `2px solid ${C_TP.glow}`, borderRadius: "50%" }}
      />
      <Motes cls="g09-mote" color={C_TP.core} base={delayMs} off={760} />
    </BoardWideStage>
  );
}

/* =============================================================================
   16. The Tolling Thirds (t8) — THE THIRD STROKE CRACKS IT. Tell: the ice bell
   swings twice, building. Strike: the clapper lands and a crack opens along the
   lip. Settle: two cold rings roll off the board and the bell hangs still.
   ========================================================================== */

const C_TT = { core: "#a7c4d8", glow: "#f5f1e6", deep: "#16232f" };

function TollingThirdsScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M11 28V19a9 9 0 0 1 18 0v9z" fill={C_TT.core} stroke={C_TT.deep} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M8 28h24" stroke={C_TT.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <circle cx="20" cy="32" r="2.6" fill={C_TT.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M10 29V18a10 10 0 0 1 20 0v11z" fill={C_TT.deep} stroke={C_TT.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M7 29h26" stroke={C_TT.glow} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="20" cy="33" r="2.6" fill={C_TT.core} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 4v5" stroke={C_TT.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(167,196,216,0.26)" base={delayMs} off={0} />
      <P
        cls="g09-tt-bell"
        x={50}
        y={47}
        w={19}
        h={19}
        style={dv(delayMs, 0, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 80 80" className="block h-full w-full">
          <path d="M40 4v10" stroke={C_TT.deep} strokeWidth="5" strokeLinecap="round" />
          <path d="M14 62V40a26 26 0 0 1 52 0v22z" fill={C_TT.core} stroke={C_TT.deep} strokeWidth="5" strokeLinejoin="round" />
          <path d="M8 62h64" stroke={C_TT.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P
        cls="g09-tt-clapper"
        x={50}
        y={58}
        w={3.4}
        h={3.4}
        style={{ ...dm(delayMs, 270), background: C_TT.glow, borderRadius: "50%" }}
      />
      <P cls="g09-tt-crack" x={50} y={54} w={17} h={7} style={dm(delayMs, 450)}>
        <svg viewBox="0 0 80 32" className="block h-full w-full">
          <path d="M6 26l14-14 10 12 12-16 10 18 12-12" fill="none" stroke={C_TT.glow} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </P>
      <P cls="g09-tt-ring" x={50} y={50} w={24} h={24} style={{ ...dm(delayMs, 530), border: `2px solid ${C_TT.core}`, borderRadius: "50%" }} />
      <P cls="g09-tt-ring" x={50} y={50} w={24} h={24} style={{ ...dm(delayMs, 640), border: `2px solid ${C_TT.glow}`, borderRadius: "50%" }} />
      <Motes cls="g09-mote" color={C_TT.core} base={delayMs} off={760} />
    </BoardWideStage>
  );
}

/* =============================================================================
   17. The Winter That Stays (t8) — THE PRINTS THAT NEVER THAW. Tell: the track
   line is scored down the travel vector. Strike: four footprints stamp along
   it, spaced by the real leg length, each crusting as it lands. Settle: a rime
   cuff clamps the last boot and the crust spreads out from it.
   ========================================================================== */

const C_WS = { core: "#9ed2e0", glow: "#f0fafc", deep: "#16303c" };
const WS_PRINTS = [0, 1, 2, 3];

function WinterThatStaysScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <ellipse cx="15" cy="16" rx="5" ry="7.5" fill={C_WS.core} />
          <ellipse cx="26" cy="26" rx="5" ry="7.5" fill={C_WS.core} />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M6 34q14 4 28 0" fill="none" stroke={C_WS.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <ellipse cx="14" cy="14" rx="5" ry="7.5" fill="none" stroke={C_WS.core} strokeWidth="2.4" />
          <ellipse cx="26" cy="25" rx="5" ry="7.5" fill="none" stroke={C_WS.core} strokeWidth="2.4" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <ellipse cx="26" cy="25" rx="5" ry="7.5" fill={C_WS.glow} opacity="0.8" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M8 34h24" stroke={C_WS.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <AimStage>
      <Wash cls="g09-wash" tint="rgba(158,210,224,0.26)" base={delayMs} off={0} />
      <P cls="g09-ws-track" x={58} y={50} w={30} h={1.2} style={{ ...dm(delayMs, 0), background: C_WS.deep, borderRadius: "999px" }} />
      {WS_PRINTS.map((i) => (
        <P
          key={i}
          cls="g09-ws-print"
          x={45 + i * 7}
          y={i % 2 === 0 ? 47 : 53}
          w={4}
          h={5.4}
          style={
            {
              background: C_WS.core,
              borderRadius: "50%",
              animationDelay: `${delayMs + i * 100 + 190}ms`,
              "--g09-len": "var(--fx-len, 3)",
            } as CSSProperties
          }
        />
      ))}
      <P cls="g09-ws-boot" x={73} y={50} w={9} h={9} style={dm(delayMs, 580)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M14 4h9v20l11 6v6H14z" fill={C_WS.deep} stroke={C_WS.core} strokeWidth="3" strokeLinejoin="round" />
          <path d="M8 28h26" stroke={C_WS.glow} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-ws-crust" x={73} y={52} w={17} h={9} style={{ ...dm(delayMs, 690), background: `radial-gradient(circle, ${C_WS.glow}, transparent 70%)` }} />
      <Motes cls="g09-mote" color={C_WS.core} base={delayMs} off={800} />
    </AimStage>
  );
}

/* =============================================================================
   18. Deus Ex Machina (t8) — THE MACHINE SNAPS ITS FINGERS. Tell: two brass
   gears mesh overhead. Strike: a clockwork hand descends and snaps. Settle:
   sheets of frost shear off the army it cleansed, while a shock ring holds.
   ========================================================================== */

const C_DX = { core: "#bcd4e6", glow: "#f7f0d8", deep: "#1a2434" };
const DX_SHEDS = [40, 52, 62];

function DeusExMachinaScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M13 34V17l3-9 3 9v-4l3-6 3 6v3l4 4v14z" fill={C_DX.core} stroke={C_DX.deep} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M6 10l4 4M34 10l-4 4" stroke={C_DX.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="10" fill="none" stroke={C_DX.core} strokeWidth="3" />
          <path d="M20 6v5M20 29v5M6 20h5M29 20h5" stroke={C_DX.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <circle cx="20" cy="20" r="4.4" fill={C_DX.glow} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M10 32q10 4 20 0" fill="none" stroke={C_DX.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(247,240,216,0.24)" base={delayMs} off={0} />
      <P cls="g09-dx-gear" x={43} y={36} w={11} h={11} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_DX.core} strokeWidth="5" />
          <path d="M20 2v6M20 32v6M2 20h6M32 20h6M8 8l4 4M32 8l-4 4M8 32l4-4M32 32l-4-4" stroke={C_DX.core} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-dx-gear" x={57} y={33} w={8} h={8} style={dm(delayMs, 110)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_DX.glow} strokeWidth="5" />
          <path d="M20 2v6M20 32v6M2 20h6M32 20h6" stroke={C_DX.glow} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      <P
        cls="g09-dx-hand"
        x={50}
        y={52}
        w={16}
        h={18}
        style={dv(delayMs, 200, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 64 72" className="block h-full w-full">
          <path d="M12 68V30a6 6 0 0 1 12 0v-8a6 6 0 0 1 12 0v6a6 6 0 0 1 12 0v40z" fill={C_DX.deep} stroke={C_DX.core} strokeWidth="5" strokeLinejoin="round" />
          <path d="M18 46h28" stroke={C_DX.glow} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-dx-snap" x={50} y={52} w={22} h={22} style={{ ...dm(delayMs, 440), border: `3px solid ${C_DX.glow}`, borderRadius: "50%" }} />
      {DX_SHEDS.map((x, i) => (
        <P
          key={i}
          cls="g09-dx-shed"
          x={x}
          y={60}
          w={5}
          h={7}
          style={{ background: C_DX.core, animationDelay: `${delayMs + i * 100 + 560}ms` }}
        />
      ))}
      <Motes cls="g09-mote" color={C_DX.glow} base={delayMs} off={740} />
    </BoardWideStage>
  );
}

/* =============================================================================
   19. Frozen Moat (t7) — THE PUDDLE SKINS OVER. Tell: dark water lies in a band
   across your half, leaning to your side of the board. Strike: the skin forms
   at one point and races outward across it. Settle: freeze veins branch to the
   rim and the rim itself frosts.
   ========================================================================== */

const C_FM = { core: "#86c8dc", glow: "#edf9fd", deep: "#0e2733" };
const FM_VEINS = [-58, -18, 22, 62];

function FrozenMoatScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="22" rx="15" ry="9" fill={C_FM.deep} />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <ellipse cx="20" cy="22" rx="13" ry="7.4" fill={C_FM.glow} opacity="0.85" />
          <path d="M20 15v14M9 22h22" stroke={C_FM.core} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="22" rx="15" ry="9" fill="none" stroke={C_FM.core} strokeWidth="2.4" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <ellipse cx="20" cy="22" rx="10" ry="6" fill={C_FM.glow} opacity="0.8" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 14v16M10 22h20M13 16l14 12" stroke={C_FM.core} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(134,200,220,0.26)" base={delayMs} off={0} />
      <Frame
        cls="g09-fm-water"
        style={{
          ...dv(delayMs, 0, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(180deg, transparent 0%, ${C_FM.deep} 34%, ${C_FM.deep} 66%, transparent 100%)`,
        }}
      />
      <P
        cls="g09-fm-skin"
        x={50}
        y={50}
        w={34}
        h={14}
        style={{ ...dm(delayMs, 220), background: `radial-gradient(ellipse at 50% 50%, ${C_FM.glow}, rgba(134,200,220,0.4) 62%, transparent 88%)` }}
      />
      {FM_VEINS.map((o, i) => (
        <P
          key={i}
          cls="g09-fm-vein"
          x={50}
          y={50}
          w={17}
          h={0.9}
          style={{ background: C_FM.glow, borderRadius: "999px", transform: `rotate(${o}deg)`, transformOrigin: "0% 50%", animationDelay: `${delayMs + i * 80 + 410}ms` }}
        />
      ))}
      <P cls="g09-fm-rim" x={50} y={50} w={36} h={16} style={{ ...dm(delayMs, 570), border: `2px solid ${C_FM.core}`, borderRadius: "50%" }} />
      <Motes cls="g09-mote" color={C_FM.glow} base={delayMs} off={710} />
    </BoardWideStage>
  );
}

/* =============================================================================
   20. Frozen Harbor (t7) — THE FAR SHORE COMES IN. Tell: a moored hull rocks at
   its line. Strike: the pack ice arrives from the far shore, sweeping toward
   the caster until the hull stops rocking. Settle: the ice closes on the
   strakes and the mooring rope lifts, stiff, out of the water.
   ========================================================================== */

const C_FH = { core: "#8fbcd4", glow: "#eef6fa", deep: "#122534" };

function FrozenHarborScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M6 20h28l-5 11H11z" fill={C_FH.core} stroke={C_FH.deep} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 20V7" stroke={C_FH.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M3 34h34" stroke={C_FH.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M5 21h30l-6 12H11z" fill={C_FH.deep} stroke={C_FH.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M20 21V6l9 9z" fill={C_FH.core} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M3 36q9-4 17 0t17 0" fill="none" stroke={C_FH.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(143,188,212,0.26)" base={delayMs} off={0} />
      <P cls="g09-fh-hull" x={50} y={52} w={22} h={14} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 64" className="block h-full w-full">
          <path d="M50 34V4l22 22z" fill={C_FH.core} />
          <path d="M6 34h88l-14 26H20z" fill={C_FH.deep} stroke={C_FH.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <Frame
        cls="g09-fh-sheet"
        style={{
          ...dv(delayMs, 220, { "--g09-side": "var(--fx-side, 1)" }),
          background: `linear-gradient(180deg, ${C_FH.glow} 0%, rgba(143,188,212,0.55) 55%, transparent 86%)`,
        }}
      />
      <P cls="g09-fh-grip" x={50} y={57} w={28} h={5} style={dm(delayMs, 430)}>
        <svg viewBox="0 0 120 22" className="block h-full w-full">
          <path d="M0 18l14-12 14 12 14-12 14 12 14-12 14 12 14-12 14 12" fill="none" stroke={C_FH.glow} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P cls="g09-fh-rope" x={36} y={49} w={16} h={6} style={dm(delayMs, 570)}>
        <svg viewBox="0 0 80 30" className="block h-full w-full">
          <path d="M2 26q38-26 76 0" fill="none" stroke={C_FH.core} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_FH.glow} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   21. Hearth Frost (t7) — THE FIRE GOES OUT FROM THE INSIDE. Tell: the embers
   in the grate pulse once, low. Strike: they grey out and frost flowers open
   across the hearthstone. Settle: the poker freezes to the floor in a rime
   cuff and cold ash drifts off.
   ========================================================================== */

const C_HF = { core: "#9dc8d2", glow: "#f6ecd8", deep: "#2a1c18" };
const HF_FLOWERS = [
  { x: 41, y: 58 },
  { x: 52, y: 62 },
  { x: 61, y: 56 },
];

function HearthFrostScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M8 32h24v4H8z" fill={C_HF.deep} />
          <path d="M14 32q0-8 6-12 6 4 6 12z" fill={C_HF.glow} />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M20 6v12M14 10l6 6 6-6" fill="none" stroke={C_HF.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M7 33V16h26v17z" fill="none" stroke={C_HF.deep} strokeWidth="3" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M14 33q0-9 6-13 6 4 6 13z" fill={C_HF.glow} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 4v8M16 7l4 4 4-4" fill="none" stroke={C_HF.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(246,236,216,0.22)" base={delayMs} off={0} />
      <P cls="g09-hf-grate" x={50} y={57} w={26} h={16} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 110 68" className="block h-full w-full">
          <path d="M8 62V20h94v42z" fill="none" stroke={C_HF.deep} strokeWidth="7" strokeLinejoin="round" />
          <path d="M28 62V38M48 62V38M68 62V38M88 62V38" stroke={C_HF.deep} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P
        cls="g09-hf-ember"
        x={50}
        y={62}
        w={16}
        h={6}
        style={{ ...dm(delayMs, 200), background: `radial-gradient(ellipse, ${C_HF.glow}, transparent 72%)` }}
      />
      {HF_FLOWERS.map((f, i) => (
        <P
          key={i}
          cls="g09-hf-flower"
          x={f.x}
          y={f.y}
          w={8}
          h={8}
          style={{ animationDelay: `${delayMs + i * 110 + 390}ms` }}
        >
          <svg viewBox="0 0 40 40" className="block h-full w-full">
            <path d="M20 3v34M5 11l30 18M35 11L5 29" stroke={C_HF.core} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M20 12l4 4-4 4-4-4z" fill={C_HF.glow} />
          </svg>
        </P>
      ))}
      <P
        cls="g09-hf-poker"
        x={64}
        y={54}
        w={13}
        h={13}
        style={dv(delayMs, 570, { "--g09-side": "var(--fx-side, 1)" })}
      >
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M6 34L32 8M32 8h-7M32 8v7" stroke={C_HF.deep} strokeWidth="4" strokeLinecap="round" />
          <path d="M2 36h14" stroke={C_HF.core} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_HF.core} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   22. Kraken Arms (t7) — THREE ARMS THROUGH THE ICE. Tell: three breaches crack
   open in the board's surface. Strike: the tentacles burst up and curl over,
   rising away from the caster. Settle: the sucker rings clamp shut and shards
   from the breaches skate away.
   ========================================================================== */

const C_KA = { core: "#7fc3c9", glow: "#ecf9f6", deep: "#10282c" };
const KA_ARMS = [
  { x: 40, y: 54 },
  { x: 52, y: 48 },
  { x: 62, y: 56 },
];
const KA_SPRAY = [-12, 0, 12];

function KrakenArmsScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M14 36V18a7 7 0 0 1 14 0q0 10-9 10" fill="none" stroke={C_KA.core} strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <circle cx="19" cy="27" r="2.4" fill={C_KA.glow} />
          <circle cx="16" cy="33" r="2.4" fill={C_KA.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M12 36V16a8 8 0 0 1 16 0q0 12-10 12" fill="none" stroke={C_KA.core} strokeWidth="4.4" strokeLinecap="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <circle cx="19" cy="26" r="2.6" fill={C_KA.glow} />
          <circle cx="15" cy="33" r="2.6" fill={C_KA.glow} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M4 38h32" stroke={C_KA.deep} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(127,195,201,0.26)" base={delayMs} off={0} />
      {KA_ARMS.map((a, i) => (
        <P
          key={`b${i}`}
          cls="g09-ka-breach"
          x={a.x}
          y={a.y + 7}
          w={8}
          h={2.4}
          style={{ background: C_KA.deep, borderRadius: "50%", animationDelay: `${delayMs + i * 60}ms` }}
        />
      ))}
      {KA_ARMS.map((a, i) => (
        <P
          key={`a${i}`}
          cls="g09-ka-arm"
          x={a.x}
          y={a.y}
          w={9}
          h={17}
          style={dv(delayMs, 220 + i * 120, { "--g09-side": "var(--fx-side, 1)" })}
        >
          <svg viewBox="0 0 40 76" className="block h-full w-full">
            <path d="M20 74V26a10 10 0 0 1 20 0q0 18-14 18" fill="none" stroke={C_KA.core} strokeWidth="9" strokeLinecap="round" />
            <path d="M20 74V26a10 10 0 0 1 20 0" fill="none" stroke={C_KA.glow} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P cls="g09-ka-grip" x={52} y={44} w={16} h={16} style={{ ...dm(delayMs, 520), border: `3px solid ${C_KA.glow}`, borderRadius: "50%" }} />
      {KA_SPRAY.map((o, i) => (
        <P
          key={i}
          cls="g09-ka-spray"
          x={52 + o * 0.6}
          y={60}
          w={2.4}
          h={2.4}
          style={{ background: C_KA.glow, borderRadius: "50%", animationDelay: `${delayMs + i * 80 + 630}ms` }}
        />
      ))}
      <Motes cls="g09-mote" color={C_KA.core} base={delayMs} off={760} />
    </BoardWideStage>
  );
}

/* =============================================================================
   23. Lead Rain (t7) — SLEET DRIVEN LIKE NAILS. Tell: a sleet band drags across
   the whole board. Strike: four nails of frozen rain are driven straight down
   and pin what they land on, leaning with the caster. Settle: splash rings and
   a glaze that spreads under the heads.
   ========================================================================== */

const C_LR = { core: "#9fb6c8", glow: "#eff2f6", deep: "#1b2430" };
const LR_NAILS = [38, 46, 55, 63];

function LeadRainScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M20 4v22l-3 8h6l-3-8z" fill={C_LR.core} stroke={C_LR.deep} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 8h14" stroke={C_LR.deep} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M8 34q12 4 24 0" fill="none" stroke={C_LR.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M20 6v20l-4 9h8l-4-9z" fill={C_LR.deep} stroke={C_LR.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M11 9h18" stroke={C_LR.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M8 20l-4 6M32 20l4 6" stroke={C_LR.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(159,182,200,0.26)" base={delayMs} off={0} />
      <Frame
        cls="g09-lr-band"
        style={{
          ...dv(delayMs, 0, { "--g09-side": "var(--fx-side, 1)" }),
          background: `repeating-linear-gradient(104deg, transparent 0 10px, rgba(239,242,246,0.5) 10px 12px)`,
        }}
      />
      {LR_NAILS.map((x, i) => (
        <P
          key={i}
          cls="g09-lr-nail"
          x={x}
          y={49}
          w={3.4}
          h={13}
          style={{ animationDelay: `${delayMs + i * 90 + 240}ms` }}
        >
          <svg viewBox="0 0 20 70" className="block h-full w-full">
            <path d="M10 6v46l-4 14h8L10 52z" fill={C_LR.core} stroke={C_LR.deep} strokeWidth="3" strokeLinejoin="round" />
            <path d="M2 8h16" stroke={C_LR.deep} strokeWidth="6" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P cls="g09-lr-splash" x={46} y={57} w={13} h={5} style={{ ...dm(delayMs, 470), border: `2px solid ${C_LR.glow}`, borderRadius: "50%" }} />
      <P cls="g09-lr-glaze" x={50} y={58} w={28} h={8} style={{ ...dm(delayMs, 580), background: `radial-gradient(ellipse, ${C_LR.glow}, transparent 74%)` }} />
      <Motes cls="g09-mote" color={C_LR.core} base={delayMs} off={720} />
    </BoardWideStage>
  );
}

/* =============================================================================
   24. Lovestruck Majesty (t7) — THE SWOON THAT CRYSTALLISES. Tell: the crown
   tips off true. Strike: a sigh fogs out and sets into a heart of frost.
   Settle: she sways, the sway stops mid-motion, and the fog thins to glints.
   ========================================================================== */

const C_LM = { core: "#d8b0c8", glow: "#fdeef4", deep: "#2b1626" };

function LovestruckMajestyScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g09-hit" style={dm(delayMs, 0)}>
          <path d="M20 33c-8-6-12-10-12-15a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 5-4 9-12 15z" fill={C_LM.core} stroke={C_LM.deep} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
        <g className="g09-hit2" style={dm(delayMs, 200)}>
          <path d="M20 9V4M13 12l-4-3M27 12l4-3" stroke={C_LM.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g09-arrive" style={dm(delayMs, 0)}>
          <path d="M11 16l-2-8 5 4 6-7 6 7 5-4-2 8z" fill={C_LM.core} stroke={C_LM.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g09-arrive2" style={dm(delayMs, 210)}>
          <path d="M20 35c-6-5-9-8-9-12a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c0 4-3 7-9 12z" fill={C_LM.glow} />
        </g>
        <g className="g09-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M7 22l-3-2M33 22l3-2" stroke={C_LM.core} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <BoardWideStage>
      <Wash cls="g09-wash" tint="rgba(216,176,200,0.26)" base={delayMs} off={0} />
      <P cls="g09-lm-crown" x={50} y={40} w={13} h={7} style={dm(delayMs, 0)}>
        <svg viewBox="0 0 80 40" className="block h-full w-full">
          <path d="M8 34L4 8l16 12L40 2l20 18L76 8l-4 26z" fill={C_LM.core} stroke={C_LM.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <P
        cls="g09-lm-breath"
        x={50}
        y={50}
        w={18}
        h={10}
        style={{ ...dv(delayMs, 200, { "--g09-side": "var(--fx-side, 1)" }), background: `radial-gradient(ellipse, ${C_LM.glow}, transparent 74%)` }}
      />
      <P cls="g09-lm-heart" x={50} y={51} w={15} h={14} style={dm(delayMs, 400)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M20 36C8 27 3 22 3 15A9 9 0 0 1 20 10 9 9 0 0 1 37 15c0 7-5 12-17 21z" fill={C_LM.glow} stroke={C_LM.core} strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 12v20M11 18l18 8M29 18l-18 8" stroke={C_LM.core} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </P>
      <P cls="g09-lm-sway" x={50} y={60} w={11} h={13} style={dm(delayMs, 540)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d={FIG} fill={C_LM.deep} stroke={C_LM.core} strokeWidth="2.4" strokeLinejoin="round" />
          <path d={FIG_BASE} fill={C_LM.core} />
        </svg>
      </P>
      <Motes cls="g09-mote" color={C_LM.core} base={delayMs} off={700} />
    </BoardWideStage>
  );
}
