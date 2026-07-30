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
