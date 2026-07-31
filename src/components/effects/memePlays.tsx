// Meme-pack plugin signatures (bespoke literal card animations for the second
// brainrot batch). See sigPlugins.tsx for the contract. Self-contained: own
// SVG + CSS (memePlays.css), transform/opacity only. Do NOT import from
// BoardEffects.tsx (cycle hazard) — the character portraits reuse the
// public/brainrot/<id>.svg assets directly with a plain <img>, the same
// pattern BrainrotFigure uses for the first batch.
//
// Design brief (owner): every card gets an over-the-top FUNNY signature that
// acts out the meme — the assassin blurs across in a blade flurry with a
// coffee splash, the ballerina pirouettes inside a ribbon spiral, Saturn's
// rings sweep the whole board while the cow cruises an orbit, the fridge door
// swings open and cold fog rolls out, the shrimp-cat glitches like a corrupted
// video, the chill guy just... slowly slides across the bottom while nothing
// else happens (the joke IS the anticlimax), the moai drops with a dust THUD
// and a screen-wide deadpan pause, and the flush pulls ghost pieces around a
// giant vortex. Board-wide leads for the tier 5+ cards (and the moai + chill
// guy, whose jokes need the room). All geometry is percentage-based so every
// scene scales with the board; reduced motion hides the layer outright.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame } from "./stage";
import "./memePlays.css";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* ------------------------------------------------------------------------- */
/* Shared staging                                                             */
/* ------------------------------------------------------------------------- */

/** Inline animation-delay (all choreography offsets flow through this). */
const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** Square-local stage (target hits and small leads). */
function Stage({ children, inset = "0" }: { children: ReactNode; inset?: string }) {
  return (
    <span className="mnp pointer-events-none absolute z-20 block" style={{ inset }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for a lead that declares `anchor: "board"`: oversized
 * around the lead square so the scene takes over the whole visible board.
 * Same geometry as the core BoardWideStage — a 1400% canvas is ~14 cells, so
 * the 8x8 board is the middle ~57%.
 *
 * Board.tsx already re-centres the wrapper on the board for a "board" anchor,
 * so this canvas must NOT correct itself a second time. Cast- and aim-anchored
 * leads use `Framed`. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="mnp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** The same 14-cell composition for a lead that declares `anchor: "cast"` or
 * `"aim"`, pinned to the BOARD.
 *
 * These scenes carry genuinely board-scale layers — Saturn's rings sweeping
 * the whole board, banks of fridge fog, a ribbon spiral wider than the crop —
 * and the design brief is explicit that anything meaning "the board" goes in a
 * `BoardFrame` rather than at a fixed percentage of an anchored canvas. The
 * canvas is 14 cells and the board is the middle 8, so the art is re-expanded
 * to 175% of the frame and offset -37.5%, which reproduces the old framing
 * exactly at any anchor. The cast square then carries the play's own local
 * beats; see `Spot`. */
function Framed({ children }: { children: ReactNode }) {
  return (
    <span className="mnp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="fx-stage absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">
        <BoardFrame>
          <span className="absolute left-[-37.5%] top-[-37.5%] block h-[175%] w-[175%]">{children}</span>
        </BoardFrame>
      </span>
    </span>
  );
}

/** The cast square's own three beats, at one-cell scale on the square the card
 * was actually played on: a ring inhales (tell), the square thumps (strike),
 * and a mote drifts off it (settle). Deliberately unhurried — these are the
 * comedy cards, and the hold before the punchline is the joke.
 *
 * The drift is the module's directional layer. --fx-side is +1 when the
 * caster's home rank is drawn at the bottom of the screen and -1 when it is at
 * the top, so the mote trails back toward the player who played the card
 * rather than "down", which would be backwards for one of the two seats. */
function Spot({
  tell,
  hit,
  settle,
  tone,
  glow,
}: {
  tell: CSSProperties;
  hit: CSSProperties;
  settle: CSSProperties;
  tone: string;
  glow: string;
}) {
  return (
    <span className="mnp pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span
        className="mnp-spot-tell absolute block"
        style={{ left: "8%", top: "8%", width: "84%", height: "84%", borderRadius: "50%", border: `2px solid ${glow}`, ...tell }}
      />
      <span
        className="mnp-spot-hit absolute inset-0 block"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 62%)`, ...hit }}
      />
      <span
        className="mnp-spot-drift absolute block"
        style={{ left: "26%", top: "26%", width: "48%", height: "48%", borderRadius: "50%", background: `radial-gradient(circle, ${tone} 0%, transparent 66%)`, ...settle }}
      />
    </span>
  );
}

/** The entrance cut: the card arriving in a hand. The play's own character at
 * ~56% of the crop, stepping in from the caster's side over a soft ground
 * shadow — a free-standing figure, never a photo card, and no board takeover.
 * The hold before it settles is a beat longer than feels safe on purpose. */
function Arrival({ delayMs, tone, glow, children }: { delayMs: number; tone: string; glow: string; children: ReactNode }) {
  return (
    <span className="mnp pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span
        className="mnp-arrive-ring absolute block"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", borderRadius: "50%", border: `2px solid ${glow}`, ...d(delayMs + 40) }}
      />
      <span className="mnp-arrive absolute block" style={{ left: "22%", top: "20%", width: "56%", height: "60%", ...d(delayMs + 180) }}>
        {children}
      </span>
      <span
        className="mnp-spot-drift absolute block"
        style={{ left: "32%", top: "62%", width: "36%", height: "16%", borderRadius: "50%", background: `radial-gradient(closest-side, ${tone}, transparent 72%)`, ...d(delayMs + 700) }}
      />
    </span>
  );
}

function Wash({ color, delayMs, slow }: { color: string; delayMs: number; slow?: boolean }) {
  return (
    <span
      className={"mnp-wash absolute inset-0 block" + (slow ? " mnp-wash--slow" : "")}
      style={{ background: color, ...d(delayMs) }}
    />
  );
}

/** Closing ring flourish inside a Wide stage. */
function Ring({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="mnp-ring absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "70%", width: "70%", marginLeft: "-35%", marginTop: "-35%", border: `3px solid ${color}`, ...d(delayMs) }}
    />
  );
}

/** Positioned prop box inside a Wide stage (values in % of the 14x14 box). */
function Prop({
  children,
  left = "36%",
  top = "36%",
  width = "28%",
  height = "28%",
  className,
  style,
}: {
  children: ReactNode;
  left?: string;
  top?: string;
  width?: string;
  height?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={(className ? className + " " : "") + "absolute block"} style={{ left, top, width, height, ...style }}>
      {children}
    </span>
  );
}

/** The meme character itself: the public/brainrot portrait as a plain <img>
 * (the BrainrotFigure pattern, rebuilt here so nothing imports the core). */
function Figure({ id, className }: { id: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brainrot/${id}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={
        (className ? className + " " : "") +
        "pointer-events-none h-full w-full select-none object-contain"
      }
    />
  );
}

/** Ghost pawn silhouette (the vortex's victims are stand-in ghosts). */
function GhostPawn({ x = 0, y = 0, s = 1, fill = "#cfe0f5" }: { x?: number; y?: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-7 14 q-1.6 -7 3 -10 q-3 -2.4 -1.4 -5.4 a5.4 5.4 0 1 1 9 0 q1.6 3 -1.4 5.4 q4.6 3 3 10 Z"
      fill={fill}
      opacity={0.85}
    />
  );
}

function SparkStar({ x, y, s = 1, fill = "#ffd76a" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 Z"
      fill={fill}
    />
  );
}

/* ------------------------------------------------------------------------- */
/* 1. Cappuccino Assassino (t6) — blade flurry, coffee splash, gone           */
/* ------------------------------------------------------------------------- */

function CappuccinoAssassinoPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(125,78,44,0.5)" glow="#c2d2e0">
        <Figure id="cappuccino_assassino" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the hit: a clean X of blade slashes plus one coffee drop */}
          <g className="mnp-slash" style={d(delayMs)}>
            <path d="M8 8 L32 32" stroke="#f4f8fc" strokeWidth={3.4} strokeLinecap="round" />
          </g>
          <g className="mnp-slash" style={d(delayMs + 120)}>
            <path d="M32 8 L8 32" stroke="#c2d2e0" strokeWidth={3.4} strokeLinecap="round" />
          </g>
          <g className="mnp-drop" style={dv(delayMs + 260, { "--mnp-x": "20%", "--mnp-y": "-60%" })}>
            <circle cx={20} cy={22} r={3.2} fill="#7d4e2c" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <Wash color="rgba(78,45,21,0.2)" delayMs={delayMs} />
      {/* the assassin blurs clean across the board */}
      <Prop left="36.5%" top="30%" width="27%" height="32%" className="mnp-assassin" style={d(delayMs)}>
        <Figure id="cappuccino_assassino" />
      </Prop>
      {/* speed blur streaks trail the dash */}
      {[
        { top: "40%", dl: 120 },
        { top: "47%", dl: 190 },
        { top: "54%", dl: 260 },
      ].map((s, i) => (
        <Prop key={i} left="26%" top={s.top} width="48%" height="1.4%">
          <span className="mnp-streak absolute inset-0 block rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(244,248,252,0.85), transparent)", ...d(delayMs + s.dl) }} />
        </Prop>
      ))}
      {/* the flurry: an X of giant slashes snaps over the center */}
      <Prop left="33%" top="30%" width="34%" height="34%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <g className="mnp-slash" style={d(delayMs + 480)}>
            <path d="M12 12 L88 88" stroke="#f4f8fc" strokeWidth={5} strokeLinecap="round" />
          </g>
          <g className="mnp-slash" style={d(delayMs + 620)}>
            <path d="M88 12 L12 88" stroke="#c2d2e0" strokeWidth={5} strokeLinecap="round" />
          </g>
          <g className="mnp-slash" style={d(delayMs + 760)}>
            <path d="M50 6 L50 94" stroke="#f4f8fc" strokeWidth={4} strokeLinecap="round" />
          </g>
          {/* the coffee splash where the blades met */}
          {[
            { x: "-160%", y: "-110%", dl: 860 },
            { x: "150%", y: "-140%", dl: 900 },
            { x: "-110%", y: "150%", dl: 940 },
            { x: "170%", y: "90%", dl: 980 },
            { x: "20%", y: "-190%", dl: 1020 },
          ].map((p, i) => (
            <g key={i} className="mnp-drop" style={dv(delayMs + p.dl, { "--mnp-x": p.x, "--mnp-y": p.y })}>
              <circle cx={50} cy={50} r={i % 2 ? 3 : 4} fill={i % 2 ? "#a8734a" : "#7d4e2c"} />
            </g>
          ))}
          <g className="mnp-drop" style={dv(delayMs + 1060, { "--mnp-x": "-40%", "--mnp-y": "-170%" })}>
            <circle cx={50} cy={50} r={2.6} fill="#fff8ec" />
          </g>
        </svg>
      </Prop>
      <Ring color="rgba(194,210,224,0.85)" delayMs={delayMs + 900} />
      </Framed>
      {/* THE STRIKE ITSELF TRAVELS. The assassin above is an upright character
          and stays square with the board — AimStage would lay him on his side
          — so only the blade run goes in one, authored pointing RIGHT so it
          rotates onto the real source -> victim leg. How far it reaches is
          --fx-len: a kill next door is a flick, one across the board is a
          full lunge. */}
      <AimStage>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="mnp-lunge absolute block"
            style={{
              left: "48%",
              top: `${48.2 + i * 1.1}%`,
              width: "5%",
              height: "0.9%",
              borderRadius: "999px",
              background: i % 2 ? "linear-gradient(90deg, rgba(194,210,224,0), #c2d2e0)" : "linear-gradient(90deg, rgba(244,248,252,0), #f4f8fc)",
              ...dv(delayMs + 420 + i * 90, { "--mnp-run": `${26 + i * 8}` }),
            }}
          />
        ))}
      </AimStage>
      <Spot tone="#7d4e2c" glow="#c2d2e0" tell={d(delayMs + 100)} hit={d(delayMs + 780)} settle={d(delayMs + 1700)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Ballerina Cappuccina (t4) — pirouette inside a ribbon spiral            */
/* ------------------------------------------------------------------------- */

function RibbonSpiral({ color }: { color: string }) {
  // one hand-drawn spiral, spun by the wrapper
  return (
    <path
      d="M50 50 m0 -8 a8 8 0 1 1 -8 8 a12 12 0 1 1 12 -12 a18 18 0 1 1 -18 18 a26 26 0 1 1 26 -26 a36 36 0 1 1 -36 36"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
  );
}

function BallerinaCappuccinaPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(245,168,192,0.5)" glow="#ffd9e4">
        <Figure id="ballerina_cappuccina" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* a target twirls in place: circular arrow + sparkle */}
          <g className="mnp-twirl" style={d(delayMs)}>
            <path d="M29 16 a10 10 0 1 0 2 8" fill="none" stroke="#f5a8c0" strokeWidth={3} strokeLinecap="round" />
            <path d="M29 9.5 L29.8 17.4 22 16 Z" fill="#f5a8c0" />
          </g>
          <g className="mnp-star" style={d(delayMs + 550)}><SparkStar x={20} y={9} s={0.8} fill="#ffd9e4" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <Wash color="rgba(245,168,192,0.16)" delayMs={delayMs} />
      {/* the ribbon spiral winds around her, spinning the other way */}
      <Prop left="25%" top="22%" width="50%" height="54%" className="mnp-ribbonspin" style={d(delayMs + 150)}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <RibbonSpiral color="rgba(245,168,192,0.9)" />
          <g transform="rotate(180 50 50)"><RibbonSpiral color="rgba(255,217,228,0.7)" /></g>
        </svg>
      </Prop>
      {/* the ballerina pirouettes dead center */}
      <Prop left="38%" top="27%" width="24%" height="39%" className="mnp-pirouette" style={d(delayMs)}>
        <Figure id="ballerina_cappuccina" />
      </Prop>
      {/* petals flung off the turn */}
      {[
        { x: "-200%", y: "-60%", r: "170deg", dl: 800 },
        { x: "180%", y: "-100%", r: "-150deg", dl: 870 },
        { x: "-140%", y: "130%", r: "200deg", dl: 940 },
        { x: "210%", y: "80%", r: "-190deg", dl: 1010 },
      ].map((p, i) => (
        <Prop key={i} left="47%" top="44%" width="6%" height="6%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="mnp-petal" style={dv(delayMs + p.dl, { "--mnp-x": p.x, "--mnp-y": p.y, "--mnp-r": p.r })}>
              <ellipse cx={10} cy={10} rx={4.4} ry={2.6} fill={i % 2 ? "#ffd9e4" : "#f5a8c0"} />
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(245,168,192,0.85)" delayMs={delayMs + 1050} />
      </Framed>
      <Spot tone="#f5a8c0" glow="#ffd9e4" tell={d(delayMs + 90)} hit={d(delayMs + 700)} settle={d(delayMs + 1600)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. La Vaca Saturno Saturnita (t7) — rings sweep the board, cow in orbit    */
/* ------------------------------------------------------------------------- */

function LaVacaPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(226,200,242,0.5)" glow="#f2c46a">
        <Figure id="la_vaca_saturno_saturnita" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage inset="-15%">
        <svg viewBox="0 0 50 50" className="h-full w-full">
          {/* a little ring pops around the landing square */}
          <g className="mnp-ringpop" style={d(delayMs)}>
            <ellipse cx={25} cy={27} rx={18} ry={6.5} fill="none" stroke="#f2c46a" strokeWidth={3} />
          </g>
          <g className="mnp-star" style={d(delayMs + 450)}><SparkStar x={38} y={12} s={0.8} fill="#e2c8f2" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <Wash color="rgba(94,58,134,0.22)" delayMs={delayMs} slow />
      {/* Saturn's rings sweep the WHOLE board, twice, tilted */}
      <Prop left="15%" top="25%" width="70%" height="50%" className="mnp-ringsweep" style={d(delayMs + 100)}>
        <svg viewBox="0 0 100 72" className="h-full w-full">
          <g transform="rotate(-9 50 36)">
            <ellipse cx={50} cy={36} rx={47} ry={15} fill="none" stroke="rgba(242,196,106,0.9)" strokeWidth={3.4} />
            <ellipse cx={50} cy={36} rx={38} ry={11.5} fill="none" stroke="rgba(255,233,184,0.75)" strokeWidth={2.2} />
            <ellipse cx={50} cy={36} rx={29} ry={8.5} fill="none" stroke="rgba(200,143,58,0.7)" strokeWidth={2} />
          </g>
        </svg>
      </Prop>
      {/* the cow cruises one full orbit of the board center */}
      <Prop left="26%" top="26%" width="48%" height="48%" className="mnp-orbitpath" style={d(delayMs + 250)}>
        <span className="absolute left-[36%] top-[-18%] block h-[46%] w-[31%]">
          <Figure id="la_vaca_saturno_saturnita" className="mnp-orbitbob" />
        </span>
      </Prop>
      {/* stardust twinkles in her wake */}
      {[
        { l: "24%", t: "30%", dl: 500, f: "#e2c8f2" },
        { l: "70%", t: "36%", dl: 780, f: "#f2c46a" },
        { l: "60%", t: "66%", dl: 1060, f: "#ffe9b8" },
        { l: "30%", t: "62%", dl: 1340, f: "#e2c8f2" },
      ].map((s, i) => (
        <Prop key={i} left={s.l} top={s.t} width="5%" height="5%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="mnp-star" style={d(delayMs + s.dl)}><SparkStar x={10} y={10} s={1} fill={s.f} /></g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(242,196,106,0.85)" delayMs={delayMs + 1500} />
      </Framed>
      {/* the rim square she actually settles onto keeps its own beats */}
      <Spot tone="#f2c46a" glow="#e2c8f2" tell={d(delayMs + 110)} hit={d(delayMs + 1000)} settle={d(delayMs + 1900)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Frigo Camelo (t5) — the door swings open, cold fog rolls out            */
/* ------------------------------------------------------------------------- */

function FrigoCameloPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(143,216,242,0.5)" glow="#dff6ff">
        <Figure id="frigo_camelo" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the chill lands: a frost star and a puff of fridge fog */}
          <g className="mnp-star" style={d(delayMs)}>
            <path d="M20 8 v24 M10 14 l20 12 M30 14 l-20 12" stroke="#8fd8f2" strokeWidth={2.6} strokeLinecap="round" />
          </g>
          <g className="mnp-fogpuff" style={dv(delayMs + 300, { "--mnp-x": "22%" })}>
            <ellipse cx={16} cy={30} rx={9} ry={4.5} fill="rgba(223,246,255,0.9)" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Wide>
      <Wash color="rgba(79,168,204,0.16)" delayMs={delayMs} />
      {/* the fridge-camel backs in from the left */}
      <Prop left="24%" top="25%" width="26%" height="36%" className="mnp-slidein" style={d(delayMs)}>
        <Figure id="frigo_camelo" />
      </Prop>
      {/* the door: swings wide with a cold glow spilling from behind it */}
      <Prop left="46%" top="34%" width="12%" height="20%">
        <span className="mnp-doorglow absolute inset-0 block rounded" style={{ background: "radial-gradient(ellipse at left, rgba(214,244,255,0.95), rgba(143,216,242,0.4) 60%, transparent)", ...d(delayMs + 420) }} />
        <span className="mnp-dooropen absolute inset-y-0 left-0 block w-[46%] rounded-sm border border-[#6e8496]" style={{ background: "linear-gradient(135deg, #eef4f9, #b7c9d8)", ...d(delayMs + 380) }} />
      </Prop>
      {/* cold fog rolls across the whole lower board, bank after bank */}
      {[
        { left: "30%", top: "56%", w: "22%", h: "7%", x: "150%", dl: 620 },
        { left: "40%", top: "62%", w: "26%", h: "8%", x: "120%", dl: 780 },
        { left: "34%", top: "50%", w: "18%", h: "6%", x: "190%", dl: 940 },
      ].map((f, i) => (
        <Prop key={i} left={f.left} top={f.top} width={f.w} height={f.h}>
          <span className="mnp-fogroll absolute inset-0 block rounded-full" style={{ background: "radial-gradient(ellipse, rgba(223,246,255,0.85), rgba(223,246,255,0))", ...dv(delayMs + f.dl, { "--mnp-x": f.x }) }} />
        </Prop>
      ))}
      {/* frost stars crystallize where the fog passed */}
      {[
        { l: "52%", t: "44%", dl: 900 },
        { l: "62%", t: "56%", dl: 1080 },
        { l: "44%", t: "64%", dl: 1260 },
      ].map((s, i) => (
        <Prop key={i} left={s.l} top={s.t} width="5%" height="5%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="mnp-star" style={d(delayMs + s.dl)}>
              <path d="M10 3 v14 M4 6.5 l12 7 M16 6.5 l-12 7" stroke="#8fd8f2" strokeWidth={1.8} strokeLinecap="round" />
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(143,216,242,0.85)" delayMs={delayMs + 1200} />
      </Wide>
      <Spot tone="#8fd8f2" glow="#dff6ff" tell={d(delayMs + 80)} hit={d(delayMs + 900)} settle={d(delayMs + 1800)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. Trippi Troppi (t3) — corrupted-video glitch jitter                      */
/* ------------------------------------------------------------------------- */

function TrippiTroppiPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(242,130,90,0.5)" glow="#5db6e8">
        <Figure id="trippi_troppi" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the hex lands: glitch bars stutter across the square */}
          <g className="mnp-glitchbar" style={d(delayMs)}>
            <rect x={6} y={12} width={28} height={3.4} rx={1.7} fill="#f2825a" opacity={0.9} />
          </g>
          <g className="mnp-glitchbar" style={d(delayMs + 140)}>
            <rect x={10} y={20} width={22} height={3.4} rx={1.7} fill="#5db6e8" opacity={0.85} />
          </g>
          <g className="mnp-glitchbar" style={d(delayMs + 280)}>
            <rect x={4} y={27} width={30} height={3.4} rx={1.7} fill="#cdb9a8" opacity={0.8} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Stage inset="-140%">
      {/* chromatic ghost copies, out of phase */}
      <span className="mnp-glitch absolute left-[8%] top-[6%] block h-[80%] w-[80%] opacity-40" style={d(delayMs + 60)}>
        <Figure id="trippi_troppi" />
      </span>
      <span className="mnp-glitch absolute left-[14%] top-[10%] block h-[80%] w-[80%] opacity-40" style={d(delayMs + 130)}>
        <Figure id="trippi_troppi" />
      </span>
      {/* the abomination itself, seizing */}
      <span className="mnp-glitch absolute left-[11%] top-[8%] block h-[80%] w-[80%]" style={d(delayMs)}>
        <Figure id="trippi_troppi" />
      </span>
      {/* scanline tears sweeping over the whole scene */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <g className="mnp-glitchbar" style={d(delayMs + 220)}>
          <rect x={4} y={26} width={92} height={5} rx={2} fill="#f2825a" opacity={0.65} />
        </g>
        <g className="mnp-glitchbar" style={d(delayMs + 430)}>
          <rect x={2} y={54} width={96} height={6} rx={2} fill="#5db6e8" opacity={0.6} />
        </g>
        <g className="mnp-glitchbar" style={d(delayMs + 640)}>
          <rect x={6} y={78} width={88} height={4.5} rx={2} fill="#e8dcd2" opacity={0.6} />
        </g>
        {/* a confused "?" that also glitches */}
        <g className="mnp-glitchbar" style={d(delayMs + 700)}>
          <text x={84} y={22} fontSize={15} fontWeight={900} fill="#f2825a" textAnchor="middle">?</text>
        </g>
        {/* the settle: one clean spark once the feed dies */}
        <g className="mnp-star" style={d(delayMs + 1250)}><SparkStar x={50} y={12} s={1.4} fill="#f2825a" /></g>
      </svg>
      </Stage>
      <Spot tone="#f2825a" glow="#5db6e8" tell={d(delayMs + 70)} hit={d(delayMs + 620)} settle={d(delayMs + 1700)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Chill Guy (t2) — he just slides across the bottom. that's it. that's the joke */
/* ------------------------------------------------------------------------- */

function ChillGuyPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(139,147,162,0.45)" glow="#c9d2dc">
        <Figure id="chill_guy" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the un-freeze: three dots of pure indifference */}
          <g className="mnp-ellipsis" style={d(delayMs)}><circle cx={12} cy={20} r={2.4} fill="#8b93a2" /></g>
          <g className="mnp-ellipsis" style={d(delayMs + 200)}><circle cx={20} cy={20} r={2.4} fill="#8b93a2" /></g>
          <g className="mnp-ellipsis" style={d(delayMs + 400)}><circle cx={28} cy={20} r={2.4} fill="#8b93a2" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Wide>
      {/* everything calms down. that's the whole effect. */}
      <Wash color="rgba(139,147,162,0.14)" delayMs={delayMs} slow />
      {/* the man himself, sliding across the bottom of the board at a truly
          unbothered pace — no bounce, no spin, no urgency whatsoever */}
      <Prop left="28%" top="52%" width="13%" height="20%" className="mnp-chillslide" style={d(delayMs)}>
        <Figure id="chill_guy" />
      </Prop>
      {/* his complete reaction */}
      <Prop left="46%" top="46%" width="10%" height="5%">
        <svg viewBox="0 0 60 24" className="h-full w-full">
          <g className="mnp-deadpan" style={d(delayMs + 1100)}>
            <rect x={6} y={2} width={48} height={17} rx={8.5} fill="rgba(245,247,251,0.92)" stroke="#8b93a2" strokeWidth={1.4} />
            <circle cx={22} cy={10.5} r={2.2} fill="#5c6472" />
            <circle cx={30} cy={10.5} r={2.2} fill="#5c6472" />
            <circle cx={38} cy={10.5} r={2.2} fill="#5c6472" />
          </g>
        </svg>
      </Prop>
      {/* one (1) sparkle, as a treat */}
      <Prop left="66%" top="56%" width="4%" height="4%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="mnp-star" style={d(delayMs + 1900)}><SparkStar x={10} y={10} s={0.8} fill="#c9d2dc" /></g>
        </svg>
      </Prop>
      </Wide>
      {/* the hold is the joke: the tell is early, the settle is very, very late */}
      <Spot tone="#8b93a2" glow="#c9d2dc" tell={d(delayMs + 120)} hit={d(delayMs + 1100)} settle={d(delayMs + 2400)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Moai Head (t4) — descends, THUDS, then holds the longest deadpan pause  */
/* ------------------------------------------------------------------------- */

function MoaiHeadPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(180,188,196,0.5)" glow="#848e98">
        <Figure id="moai_head" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* dust kicked out by the landing */}
          <g className="mnp-puff" style={dv(delayMs, { "--mnp-x": "-26%", "--mnp-y": "-14%" })}>
            <circle cx={13} cy={30} r={3.6} fill="rgba(180,188,196,0.9)" />
          </g>
          <g className="mnp-puff" style={dv(delayMs + 90, { "--mnp-x": "28%", "--mnp-y": "-18%" })}>
            <circle cx={27} cy={30} r={3} fill="rgba(180,188,196,0.85)" />
          </g>
          <g className="mnp-pebble" style={dv(delayMs + 60, { "--mnp-x": "40%", "--mnp-y": "-90%" })}>
            <rect x={18} y={28} width={4} height={4} rx={1.2} fill="#848e98" transform="rotate(20 20 30)" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      {/* the impact flash-wash: one hard pulse when it lands */}
      <Wash color="rgba(78,88,98,0.24)" delayMs={delayMs + 480} />
      {/* the moai descends. gravity means it. */}
      <Prop left="37.5%" top="27%" width="25%" height="38%" className="mnp-moaidrop" style={d(delayMs)}>
        <Figure id="moai_head" />
      </Prop>
      {/* THUD: dust ring + debris at the base */}
      <Prop left="33%" top="57%" width="35%" height="11%">
        <svg viewBox="0 0 100 36" className="h-full w-full">
          <g className="mnp-dustring" style={d(delayMs + 500)}>
            <ellipse cx={50} cy={22} rx={40} ry={9} fill="none" stroke="rgba(180,188,196,0.85)" strokeWidth={4} />
          </g>
          {[
            { x: "-140%", y: "-60%", dl: 520 },
            { x: "130%", y: "-80%", dl: 560 },
            { x: "-90%", y: "-120%", dl: 600 },
            { x: "100%", y: "-40%", dl: 640 },
          ].map((p, i) => (
            <g key={i} className="mnp-pebble" style={dv(delayMs + p.dl, { "--mnp-x": p.x, "--mnp-y": p.y })}>
              <rect x={47} y={18} width={6} height={6} rx={1.6} fill="#848e98" transform={`rotate(${20 + i * 30} 50 21)`} />
            </g>
          ))}
          <g className="mnp-puff" style={dv(delayMs + 520, { "--mnp-x": "-34%", "--mnp-y": "-30%" })}>
            <circle cx={26} cy={22} r={7} fill="rgba(196,204,210,0.9)" />
          </g>
          <g className="mnp-puff" style={dv(delayMs + 580, { "--mnp-x": "36%", "--mnp-y": "-36%" })}>
            <circle cx={74} cy={22} r={6} fill="rgba(196,204,210,0.85)" />
          </g>
        </svg>
      </Prop>
      {/* ...and then the pause. the screen-wide deadpan. nothing moves. */}
      <Prop left="56%" top="34%" width="9%" height="6%">
        <svg viewBox="0 0 50 30" className="h-full w-full">
          <g className="mnp-deadpan mnp-deadpan--long" style={d(delayMs + 1150)}>
            <text x={25} y={22} fontSize={22} textAnchor="middle">🗿</text>
          </g>
        </svg>
      </Prop>
      <Prop left="34%" top="40%" width="8%" height="5%">
        <svg viewBox="0 0 50 24" className="h-full w-full">
          <g className="mnp-deadpan mnp-deadpan--long" style={d(delayMs + 1550)}>
            <text x={25} y={16} fontSize={10} fontWeight={800} fill="#b4bcc4" textAnchor="middle">. . .</text>
          </g>
        </svg>
      </Prop>
      </Framed>
      {/* he lands on ONE square, and that square is the one that gets the THUD.
          The settle sits out past the deadpan pause on purpose. */}
      <Spot tone="#b4bcc4" glow="#848e98" tell={d(delayMs + 90)} hit={d(delayMs + 520)} settle={d(delayMs + 2100)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. Skibidi Flush (t5) — a giant vortex drags ghost pieces home             */
/* ------------------------------------------------------------------------- */

function SkibidiFlushPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(93,182,232,0.5)" glow="#8fd4f5">
        <Figure id="skibidi_flush" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* a mini whirl opens under the flushed piece */}
          <g className="mnp-miniswirl" style={d(delayMs)}>
            <path d="M20 20 m0 -9 a9 9 0 1 1 -9 9 a13 13 0 1 1 13 -13" fill="none" stroke="#5db6e8" strokeWidth={3} strokeLinecap="round" />
          </g>
          <g className="mnp-drop" style={dv(delayMs + 350, { "--mnp-x": "50%", "--mnp-y": "-80%" })}>
            <circle cx={20} cy={18} r={2.6} fill="#8fd4f5" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Wide>
      <Wash color="rgba(42,110,168,0.2)" delayMs={delayMs} />
      {/* the giant vortex: three nested spirals winding the whole board */}
      <Prop left="22%" top="22%" width="56%" height="56%" className="mnp-vortex" style={d(delayMs)}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path d="M50 50 m0 -12 a12 12 0 1 1 -12 12 a18 18 0 1 1 18 -18 a27 27 0 1 1 -27 27 a38 38 0 1 1 38 -38 a48 48 0 1 1 -48 48" fill="none" stroke="rgba(93,182,232,0.85)" strokeWidth={3.4} strokeLinecap="round" />
          <g transform="rotate(140 50 50)">
            <path d="M50 50 m0 -10 a10 10 0 1 1 -10 10 a16 16 0 1 1 16 -16 a25 25 0 1 1 -25 25 a36 36 0 1 1 36 -36" fill="none" stroke="rgba(191,234,255,0.7)" strokeWidth={2.4} strokeLinecap="round" />
          </g>
        </svg>
      </Prop>
      {/* ghost pieces caught in the pull, spiralling inward */}
      <Prop left="30%" top="30%" width="40%" height="40%" className="mnp-suckspin" style={d(delayMs + 200)}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <g className="mnp-suck" style={d(delayMs + 200)}><GhostPawn x={50} y={10} s={1.6} /></g>
          <g className="mnp-suck" style={d(delayMs + 350)}><GhostPawn x={88} y={62} s={1.3} fill="#bfeaff" /></g>
          <g className="mnp-suck" style={d(delayMs + 500)}><GhostPawn x={16} y={70} s={1.45} fill="#e6f6ff" /></g>
        </svg>
      </Prop>
      {/* the dark drain at dead center */}
      <Prop left="46.5%" top="46.5%" width="7%" height="7%">
        <span className="mnp-drain absolute inset-0 block rounded-full" style={{ background: "radial-gradient(circle, #1c4a74 30%, rgba(28,74,116,0))", ...d(delayMs + 400) }} />
      </Prop>
      {/* droplets flung off the rim */}
      {[
        { l: "28%", t: "30%", x: "-160%", y: "-120%", dl: 700 },
        { l: "68%", t: "32%", x: "170%", y: "-100%", dl: 800 },
        { l: "70%", t: "62%", x: "150%", y: "130%", dl: 900 },
        { l: "28%", t: "64%", x: "-170%", y: "110%", dl: 1000 },
      ].map((p, i) => (
        <Prop key={i} left={p.l} top={p.t} width="4%" height="4%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="mnp-drop" style={dv(delayMs + p.dl, { "--mnp-x": p.x, "--mnp-y": p.y })}>
              <circle cx={10} cy={10} r={3.4} fill="#8fd4f5" />
            </g>
          </svg>
        </Prop>
      ))}
      {/* the porcelain culprit surfaces, delighted */}
      <Prop left="40.5%" top="52%" width="19%" height="27%" className="mnp-surface" style={d(delayMs + 1250)}>
        <Figure id="skibidi_flush" />
      </Prop>
      <Ring color="rgba(143,212,245,0.85)" delayMs={delayMs + 1450} />
      </Wide>
      <Spot tone="#5db6e8" glow="#8fd4f5" tell={d(delayMs + 90)} hit={d(delayMs + 800)} settle={d(delayMs + 1900)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 9. Tung Tung Tung Sahur (t?) — HE marches the board himself, drum thunder  */
/* ------------------------------------------------------------------------- */

function TungTungSahurPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="rgba(217,159,92,0.5)" glow="#ffd76a">
        <Figure id="tung_tung_sahur" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the bat lands: impact burst + a stunned wobble ring */}
          <g className="mnp-ringpop" style={d(delayMs)}>
            <circle cx={20} cy={22} r={13} fill="none" stroke="#d99f5c" strokeWidth={3} />
          </g>
          <g className="mnp-star" style={d(delayMs + 160)}>
            <path d="M20 8 L23 17 L32 17 L25 23 L28 32 L20 26.5 L12 32 L15 23 L8 17 L17 17 Z" fill="#ffd76a" stroke="#a8641c" strokeWidth={1.2} strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Wide>
      <Wash color="rgba(122,74,32,0.22)" delayMs={delayMs} />
      {/* the man himself — the glossy log, board-COLOSSAL, marching across
          (~28% of the 14x14 canvas is ~half the visible board) */}
      <Prop left="36%" top="24%" width="28%" height="44%" className="mnp-march" style={d(delayMs)}>
        <Figure id="tung_tung_sahur" />
      </Prop>
      {/* drumbeat shockwaves ripple out of each stomp, in step */}
      {[
        { l: "24%", t: "56%", dl: 340 },
        { l: "38%", t: "60%", dl: 740 },
        { l: "52%", t: "58%", dl: 1140 },
        { l: "66%", t: "60%", dl: 1540 },
      ].map((sw, i) => (
        <Prop key={i} left={sw.l} top={sw.t} width="16%" height="7%">
          <svg viewBox="0 0 100 40" className="h-full w-full">
            <g className="mnp-stomp" style={d(delayMs + sw.dl)}>
              <ellipse cx={50} cy={20} rx={42} ry={12} fill="none" stroke="rgba(217,159,92,0.9)" strokeWidth={4} />
              <ellipse cx={50} cy={20} rx={26} ry={7} fill="none" stroke="rgba(255,215,106,0.7)" strokeWidth={2.4} />
            </g>
          </svg>
        </Prop>
      ))}
      {/* the chant stamps itself across the sky, beat by beat */}
      {[
        { l: "24%", t: "27%", txt: "TUNG", r: "-8deg", dl: 380 },
        { l: "42%", t: "23%", txt: "TUNG", r: "6deg", dl: 780 },
        { l: "60%", t: "27%", txt: "SAHUR", r: "-5deg", dl: 1180 },
      ].map((st, i) => (
        <Prop key={i} left={st.l} top={st.t} width="16%" height="7%">
          <svg viewBox="0 0 120 40" className="h-full w-full">
            <g className="mnp-stamp" style={dv(delayMs + st.dl, { "--mnp-r": st.r })}>
              <text x={60} y={28} fontSize={24} fontWeight={900} fill="#ffd76a" stroke="#5c3a12" strokeWidth={1.6} textAnchor="middle" style={{ letterSpacing: "2px" }}>{st.txt}</text>
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(217,159,92,0.9)" delayMs={delayMs + 1750} />
      <Ring color="rgba(255,215,106,0.7)" delayMs={delayMs + 1900} />
      </Wide>
      <Spot tone="#d99f5c" glow="#ffd76a" tell={d(delayMs + 100)} hit={d(delayMs + 740)} settle={d(delayMs + 2200)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

// Zone sources mirror the plugin conventions (funnyPlays / personalPlays):
// the orbiting knight is a placement ("summon"), the refrigeration paints
// shields ("shield"), the shrimp legs paint walnuts ("walnut"). The assassin
// removes a piece, so it rides the default removal diff. The relocation /
// cleanup / barred-square cards paint no zone the signature layer reads, so
// they register lead-only plays (their board story is the lead itself). All
// sounds are existing SigSoundKeys — the deadpan cards deliberately get the
// sleepy "snooze" voice; the moai THUD borrows the siege thump.
export const PLAYS: Record<string, SigPlugin> = {
  cappuccino_assassino: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" },
    Render: CappuccinoAssassinoPlay,
  },
  ballerina_cappuccina: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" },
    Render: BallerinaCappuccinaPlay,
  },
  la_vaca_saturno_saturnita: {
    config: { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "colossus", source: "summon", anchor: "cast" },
    Render: LaVacaPlay,
  },
  frigo_camelo: {
    config: { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "clockice", source: "shield", anchor: "board" },
    Render: FrigoCameloPlay,
  },
  trippi_troppi: {
    config: { ordering: "radial", staggerMs: 55, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "petrify", source: "walnut", anchor: "board" },
    Render: TrippiTroppiPlay,
  },
  chill_guy: {
    config: { ordering: "sweep", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" },
    Render: ChillGuyPlay,
  },
  moai_head: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast" },
    Render: MoaiHeadPlay,
  },
  skibidi_flush: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" },
    Render: SkibidiFlushPlay,
  },
  // The drum-man in PERSON (his core "drumbonk" entry was removed so this
  // renders): same stun-zone read and siege thump as before, but the lead is
  // HIM — the glossy /brainrot figure marching the board to his own beat.
  tung_tung_sahur: {
    config: { ordering: "radial", staggerMs: 60, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "siege", source: "stun", anchor: "board" },
    Render: TungTungSahurPlay,
  },
};
