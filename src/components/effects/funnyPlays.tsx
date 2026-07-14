// Funny/meta plugin signatures (bespoke literal card animations). See
// sigPlugins.tsx for the contract. Self-contained: own SVG, own CSS
// (funnyPlays.css), transform/opacity only. Do NOT import from
// BoardEffects.tsx.
//
// Design brief (owner): the animation literally ACTS OUT what the card does,
// readable at a glance — Alt+F4 slams a window shut, Touch Grass grows grass,
// Lag Spike stutters and freezes a connection HUD, Ctrl+Z rewinds a ghost
// piece back onto the board. Prop-comedy realism: chunky silhouettes, 2-4
// beat mini-skits, clean strokes, satisfying easing. Leads stay ~1.2-1.6s
// (tier 1-6). Zone-sourced entries ride the same inert-until-wired path as
// the core Batch 2+ entries; the flag-only cards (draft/clock/info tricks)
// register lead-only configs so they light up with the same wiring.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";
import "./funnyPlays.css";

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
    <span className="fnp pointer-events-none absolute z-20 block" style={{ inset }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for wide leads: oversized around the lead square so the
 * skit takes over the whole visible board (the caller's crop clips it). Same
 * geometry as the core BoardWideStage, rebuilt here to avoid the import
 * cycle. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="fnp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="fnp-wash absolute inset-0 block" style={{ background: color, ...d(delayMs) }} />;
}

function Boom({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="fnp-boom absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "70%", width: "70%", marginLeft: "-35%", marginTop: "-35%", border: `3px solid ${color}`, ...d(delayMs) }}
    />
  );
}

/** Centered prop box inside a Wide stage (values in % of the 14x14 box). */
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

/* --- The reusable "OS window" mini-template (each user re-dresses it) ------ */

function WindowFrame({
  title,
  bar,
  body,
  children,
  w = 100,
  h = 66,
  closeAnim = false,
  accent = "#e84d5b",
}: {
  title: string;
  bar: string;
  body: string;
  children?: ReactNode;
  w?: number;
  h?: number;
  closeAnim?: boolean;
  accent?: string;
}) {
  return (
    <>
      {/* frame + title bar */}
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={3.5} fill={body} stroke="rgba(20,24,34,0.9)" strokeWidth={1.6} />
      <path d={`M1 12 v-7.5 a3.5 3.5 0 0 1 3.5 -3.5 h${w - 9} a3.5 3.5 0 0 1 3.5 3.5 V12 Z`} fill={bar} />
      <text x={6} y={9.2} fontSize={6} fontWeight={700} fill="#f5f7fb" style={{ letterSpacing: "0.4px" }}>
        {title}
      </text>
      {/* window buttons: minimize, maximize, close */}
      <rect x={w - 27} y={4} width={6} height={5.5} rx={1.2} fill="rgba(245,247,251,0.35)" />
      <rect x={w - 19} y={4} width={6} height={5.5} rx={1.2} fill="rgba(245,247,251,0.35)" />
      <g className={closeAnim ? "fnp-deny" : undefined} style={closeAnim ? d(650) : undefined}>
        <rect x={w - 11} y={4} width={7} height={5.5} rx={1.2} fill={accent} />
        <path d={`M${w - 9.4} 5.2 l3.8 3.1 m0 -3.1 l-3.8 3.1`} stroke="#fff" strokeWidth={1.1} strokeLinecap="round" />
      </g>
      {children}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 1. Emotional Support Pawn (t2) — a tiny round friend hops into your pocket */
/* ------------------------------------------------------------------------- */

function PalPawn({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 16 q-2 -8 3.5 -11 q-3.5 -2.5 -1.5 -6 a6 6 0 1 1 10 0 q2 3.5 -1.5 6 q5.5 3 3.5 11 Z" fill="#f2e5c9" stroke="#7a6a4a" strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={-2.2} cy={-4.4} r={0.9} fill="#4a3d28" />
      <circle cx={2.2} cy={-4.4} r={0.9} fill="#4a3d28" />
      <path d="M-2.4 -1.6 q2.4 2 4.8 0" stroke="#4a3d28" strokeWidth={1} strokeLinecap="round" fill="none" />
      <circle cx={-4.2} cy={-2.6} r={1.1} fill="#f5a8b0" opacity={0.8} />
      <circle cx={4.2} cy={-2.6} r={1.1} fill="#f5a8b0" opacity={0.8} />
    </g>
  );
}

function Heart({ x, y, fill = "#f2778f" }: { x: number; y: number; fill?: string }) {
  return <path d={`M${x} ${y} c-1.4 -2.4 -4.6 -1.4 -4.6 0.9 c0 1.9 2.6 3.6 4.6 5 c2 -1.4 4.6 -3.1 4.6 -5 c0 -2.3 -3.2 -3.3 -4.6 -0.9 Z`} fill={fill} />;
}

function EmotionalSupportPawnPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-rise" style={d(delayMs)}><Heart x={13} y={16} /></g>
          <g className="fnp-rise" style={d(delayMs + 260)}><Heart x={27} y={20} fill="#ffb3c1" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-60%">
      <svg viewBox="0 0 80 80" className="h-full w-full">
        {/* pocket: a stitched flap the pal dives into */}
        <g className="fnp-linger" style={d(delayMs)}>
          <path d="M22 54 h36 l-4 16 q-14 6 -28 0 Z" fill="#4d6fa8" stroke="#2c4470" strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M25 58 h30" stroke="#9db8e0" strokeWidth={1.2} strokeDasharray="3 2.4" strokeLinecap="round" />
        </g>
        {/* the pal: hops up, wiggles hello, dives in */}
        <g className="fnp-hop" style={d(delayMs + 80)}>
          <PalPawn x={40} y={40} s={1.35} />
        </g>
        <g className="fnp-rise" style={d(delayMs + 520)}><Heart x={22} y={26} /></g>
        <g className="fnp-rise" style={d(delayMs + 700)}><Heart x={56} y={22} fill="#ffb3c1" /></g>
        <g className="fnp-rise" style={d(delayMs + 880)}><Heart x={40} y={16} fill="#f2909f" /></g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Stream Sniper (t3) — a scope hunts across their stream and locks on     */
/* ------------------------------------------------------------------------- */

function Reticle({ r = 15, color = "#e84d5b" }: { r?: number; color?: string }) {
  return (
    <g>
      <circle r={r} fill="none" stroke={color} strokeWidth={1.8} />
      <circle r={r * 0.45} fill="none" stroke={color} strokeWidth={1.1} opacity={0.85} />
      <path d={`M0 ${-r - 4} V${-r * 0.55} M0 ${r + 4} V${r * 0.55} M${-r - 4} 0 H${-r * 0.55} M${r + 4} 0 H${r * 0.55}`} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <circle r={1.4} fill={color} />
    </g>
  );
}

function StreamSniperPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-scope" style={d(delayMs)}>
            <g transform="translate(20 20)"><Reticle r={11} /></g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-110%">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* their stream: player cam + chat, LIVE badge blinking */}
        <g className="fnp-linger" style={d(delayMs)}>
          <rect x={8} y={18} width={84} height={58} rx={4} fill="#161b26" stroke="#39445c" strokeWidth={2} />
          {/* streamer silhouette in the cam pane */}
          <rect x={13} y={24} width={46} height={46} rx={2.5} fill="#232c3f" />
          <circle cx={36} cy={40} r={8} fill="#5b6b8c" />
          <path d="M22 70 q3 -16 14 -16 q11 0 14 16 Z" fill="#5b6b8c" />
          {/* chat lines popping in */}
          <g className="fnp-pop" style={d(delayMs + 200)}><rect x={64} y={28} width={23} height={4.5} rx={2.2} fill="#3d4a66" /></g>
          <g className="fnp-pop" style={d(delayMs + 380)}><rect x={64} y={37} width={18} height={4.5} rx={2.2} fill="#46577a" /></g>
          <g className="fnp-pop" style={d(delayMs + 560)}><rect x={64} y={46} width={21} height={4.5} rx={2.2} fill="#3d4a66" /></g>
          {/* LIVE badge */}
          <g className="fnp-blink" style={d(delayMs + 100)}>
            <rect x={13} y={10} width={24} height={9} rx={2.5} fill="#e84d5b" />
            <circle cx={18.5} cy={14.5} r={1.8} fill="#fff" />
            <text x={22.5} y={17} fontSize={6.4} fontWeight={800} fill="#fff">LIVE</text>
          </g>
        </g>
        {/* the sniper's scope hunts, then locks on the streamer */}
        <g className="fnp-scope" style={d(delayMs + 250)}>
          <g transform="translate(36 44)"><Reticle r={17} /></g>
        </g>
        <g className="fnp-star" style={d(delayMs + 1350)}>
          <path d="M36 30 l2.4 8.2 8.2 2.4 -8.2 2.4 -2.4 8.2 -2.4 -8.2 -8.2 -2.4 8.2 -2.4 Z" fill="#ffd76a" transform="translate(0 3.4)" />
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Lag Spike (t3) — the signal bars die, the spinner seizes, -25s          */
/* ------------------------------------------------------------------------- */

function LagSpikePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-jitter" style={d(delayMs)}>
            <rect x={10} y={24} width={4.6} height={7} rx={1.2} fill="#8fd0a0" />
            <g className="fnp-bar-out" style={d(delayMs + 150)}><rect x={17} y={19} width={4.6} height={12} rx={1.2} fill="#8fd0a0" /></g>
            <g className="fnp-bar-out" style={d(delayMs + 20)}><rect x={24} y={13} width={4.6} height={18} rx={1.2} fill="#e8a24d" /></g>
          </g>
          <g className="fnp-pop" style={d(delayMs + 620)}>
            <text x={20} y={12} fontSize={9} fontWeight={800} fill="#e84d5b" textAnchor="middle">!</text>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-100%">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* connection HUD: it stutters, drops bars, and hard-freezes */}
        <g className="fnp-jitter" style={d(delayMs)}>
          <rect x={16} y={26} width={68} height={44} rx={5} fill="#141926" stroke="#39445c" strokeWidth={2} />
          <text x={24} y={38} fontSize={6.5} fontWeight={700} fill="#8b99b8">CONNECTION</text>
          {/* signal bars: tallest dies first */}
          <rect x={24} y={54} width={7} height={9} rx={1.6} fill="#8fd0a0" />
          <g className="fnp-bar-out" style={d(delayMs + 420)}><rect x={34} y={49} width={7} height={14} rx={1.6} fill="#8fd0a0" /></g>
          <g className="fnp-bar-out" style={d(delayMs + 260)}><rect x={44} y={44} width={7} height={19} rx={1.6} fill="#e8d24d" /></g>
          <g className="fnp-bar-out" style={d(delayMs + 90)}><rect x={54} y={38} width={7} height={25} rx={1.6} fill="#e8a24d" /></g>
          {/* buffering spinner stuttering in eighth-turns */}
          <g className="fnp-buffer" style={d(delayMs + 180)}>
            <circle cx={72} cy={51} r={7.5} fill="none" stroke="#5c6b8f" strokeWidth={3} strokeDasharray="26 21" strokeLinecap="round" />
          </g>
        </g>
        {/* the damage: -25s rips off their clock */}
        <g className="fnp-rise" style={d(delayMs + 980)}>
          <rect x={33} y={8} width={34} height={13} rx={6.5} fill="#e84d5b" />
          <text x={50} y={17.6} fontSize={8.5} fontWeight={800} fill="#fff" textAnchor="middle">-25s</text>
        </g>
        <g className="fnp-star" style={d(delayMs + 700)}>
          <path d="M50 24 l1.8 5 5 1.8 -5 1.8 -1.8 5 -1.8 -5 -5 -1.8 5 -1.8 Z" fill="#ffd76a" />
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Ctrl+Z (t3) — two keycaps press and a ghost piece rewinds onto the board */
/* ------------------------------------------------------------------------- */

function Keycap({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y + 2} width={w} height={16} rx={3.5} fill="#7c88a4" />
      <rect x={x} y={y} width={w} height={15} rx={3.5} fill="#e8edf6" stroke="#5c6880" strokeWidth={1.4} />
      <text x={x + w / 2} y={y + 10.4} fontSize={7} fontWeight={800} fill="#39435c" textAnchor="middle">{label}</text>
    </g>
  );
}

function GhostPawn({ x, y, s = 1, fill = "#cfe0f5" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 14 q-1.6 -7 3 -10 q-3 -2.4 -1.4 -5.4 a5.4 5.4 0 1 1 9 0 q1.6 3 -1.4 5.4 q4.6 3 3 10 Z" fill={fill} stroke="#6f85a8" strokeWidth={1.3} strokeLinejoin="round" />
    </g>
  );
}

function CtrlZPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-undo" style={d(delayMs)}>
            <path d="M28 13 a10 10 0 1 0 3 9" fill="none" stroke="#5aa0e8" strokeWidth={3} strokeLinecap="round" />
            <path d="M28 6.5 L28.6 14.6 20.8 13.2 Z" fill="#5aa0e8" />
          </g>
          <g className="fnp-ghost-in" style={d(delayMs + 300)}>
            <GhostPawn x={20} y={19} s={0.95} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-100%">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* the shortcut: Ctrl, then Z, pressed in order */}
        <g className="fnp-press" style={d(delayMs)}><Keycap x={16} y={70} w={26} label="Ctrl" /></g>
        <g className="fnp-press" style={d(delayMs + 220)}><Keycap x={47} y={70} w={17} label="Z" /></g>
        <text x={68} y={81} fontSize={8} fontWeight={800} fill="#8b99b8" className="fnp-linger" style={d(delayMs + 250)}>↺</text>
        {/* history arrow wheels backward */}
        <g className="fnp-undo" style={d(delayMs + 380)}>
          <path d="M67 26 a17 17 0 1 0 5.4 15.4" fill="none" stroke="#5aa0e8" strokeWidth={4.4} strokeLinecap="round" />
          <path d="M67.5 14.5 L68.6 28.6 55.4 25.4 Z" fill="#5aa0e8" />
        </g>
        {/* the captured piece rewinds back to its square and solidifies */}
        <g className="fnp-linger" style={d(delayMs + 400)}>
          <rect x={38} y={50.5} width={24} height={4} rx={1.4} fill="#39445c" opacity={0.55} />
        </g>
        <g className="fnp-rewind" style={d(delayMs + 480)}>
          <GhostPawn x={50} y={36} s={1.5} />
        </g>
        <g className="fnp-star" style={d(delayMs + 1450)}>
          <path d="M50 24 l1.8 5 5 1.8 -5 1.8 -1.8 5 -1.8 -5 -5 -1.8 5 -1.8 Z" fill="#bfe0ff" />
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. Rubber Chicken (t3) — the chicken swings down like a war hammer. BONK.  */
/* ------------------------------------------------------------------------- */

function Chicken({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      {/* held by the tail at the pivot; the body flops outward */}
      <ellipse cx={26} cy={-6} rx={13} ry={8.5} fill="#f3c93f" stroke="#a8821c" strokeWidth={1.6} />
      <path d="M13.5 -6 q-6 -1 -8.5 3.5 q4.5 2.5 9.5 0.5 Z" fill="#f3c93f" stroke="#a8821c" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M36 -10 q7 -4 8 -12 q0.5 -3 3.5 -2.5" fill="none" stroke="#a8821c" strokeWidth={1.6} />
      <ellipse cx={49} cy={-26} rx={6.5} ry={5.5} fill="#f3c93f" stroke="#a8821c" strokeWidth={1.6} />
      <path d="M47 -31 q-1 -4 2 -5 q1.5 2 1 4.5 q3 -2 4.5 0 q-1.5 3 -4.5 2.5" fill="#e2554d" stroke="#a83a33" strokeWidth={1} strokeLinejoin="round" />
      <path d="M55 -26.5 l6 1.8 -6 2.2 Z" fill="#ee8f3c" stroke="#b5661f" strokeWidth={1} strokeLinejoin="round" />
      <circle cx={51.5} cy={-27.5} r={1.1} fill="#2d2413" />
      <path d="M24 2 q0 5 -2.5 7 m8 -6.5 q0 4.5 -2 6.5" stroke="#a8821c" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </g>
  );
}

function BonkStar({ x, y, s = 1, label }: { x: number; y: number; s?: number; label?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -13 L3.4 -4.6 12.4 -4 5.6 1.8 8 10.6 0 5.8 -8 10.6 -5.6 1.8 -12.4 -4 -3.4 -4.6 Z" fill="#ffd23f" stroke="#c9931d" strokeWidth={1.4} strokeLinejoin="round" />
      {label ? (
        <text x={0} y={2.6} fontSize={6} fontWeight={900} fill="#8a5a10" textAnchor="middle">{label}</text>
      ) : null}
    </g>
  );
}

function RubberChickenPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage inset="-25%">
        <svg viewBox="0 0 60 60" className="h-full w-full">
          <g className="fnp-bonk" style={d(delayMs)}>
            <g transform="translate(6 46) rotate(-10)"><Chicken s={0.62} /></g>
          </g>
          <g className="fnp-star" style={d(delayMs + 480)}><BonkStar x={42} y={40} s={0.85} /></g>
          <g className="fnp-feather" style={d(delayMs + 650)}>
            <path d="M40 22 q4 -7 1 -14 q-5 6 -1 14 Z" fill="#f3c93f" stroke="#a8821c" strokeWidth={0.8} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-85%">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="fnp-bonk" style={d(delayMs)}>
          <g transform="translate(8 72) rotate(-10)"><Chicken s={1.05} /></g>
        </g>
        <g className="fnp-star" style={d(delayMs + 470)}><BonkStar x={70} y={62} s={1.5} label="BONK" /></g>
        <g className="fnp-puff" style={dv(delayMs + 520, { "--fnp-x": "-26%", "--fnp-y": "-14%" })}><circle cx={58} cy={72} r={3.4} fill="rgba(214,204,178,0.85)" /></g>
        <g className="fnp-puff" style={dv(delayMs + 560, { "--fnp-x": "30%", "--fnp-y": "-20%" })}><circle cx={80} cy={70} r={2.8} fill="rgba(214,204,178,0.8)" /></g>
        {/* the settle: two loose feathers rock down where the chicken hit */}
        <g className="fnp-feather" style={d(delayMs + 720)}>
          <path d="M66 42 q5 -9 1.5 -18 q-6.5 8 -1.5 18 Z" fill="#f3c93f" stroke="#a8821c" strokeWidth={1} />
        </g>
        <g className="fnp-feather" style={d(delayMs + 920)}>
          <path d="M78 38 q4 -7 1 -14 q-5 6 -1 14 Z" fill="#ffe08a" stroke="#a8821c" strokeWidth={0.9} />
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Day One Patch (t4) — the update bar fills and their new card gets nerfed */
/* ------------------------------------------------------------------------- */

function DayOnePatchPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-stamp" style={d(delayMs)}>
            <path d="M20 32 L10 20 h6 V8 h8 v12 h6 Z" fill="#9aa5ba" stroke="#5c6880" strokeWidth={1.6} strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(70,84,116,0.2)" delayMs={delayMs} />
      <Prop left="33%" top="34%" width="34%" height="26%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          <g className="fnp-linger" style={d(delayMs)}>
            <WindowFrame title="UPDATER" bar="#39445c" body="#e8edf6" w={100} h={52}>
              <text x={8} y={24} fontSize={6.6} fontWeight={700} fill="#39435c">Day One Patch</text>
              <text x={8} y={33} fontSize={5.4} fontWeight={600} fill="#7c88a4">v1.0.0 → v1.0.1 (nerfs)</text>
              {/* progress track + fill */}
              <rect x={8} y={38} width={84} height={7.5} rx={3.6} fill="#c3cddd" />
              <g className="fnp-fill" style={d(delayMs + 150)}>
                <rect x={8} y={38} width={84} height={7.5} rx={3.6} fill="#5aa0e8" />
              </g>
            </WindowFrame>
          </g>
          {/* their fresh card gets stamped flat: colored card swaps to grey husk */}
          <g className="fnp-swap-out" style={d(delayMs + 200)}>
            <rect x={38} y={56} width={13} height={17} rx={2} fill="#b98cff" stroke="#6c4bb0" strokeWidth={1.4} />
            <circle cx={44.5} cy={62} r={2.6} fill="#fff" opacity={0.85} />
          </g>
          <g className="fnp-swap-in" style={d(delayMs + 200)}>
            <rect x={38} y={56} width={13} height={17} rx={2} fill="#aab2c2" stroke="#6d7688" strokeWidth={1.4} />
            <path d="M40.5 59 l8 11 m0 -11 l-8 11" stroke="#6d7688" strokeWidth={1.6} strokeLinecap="round" />
          </g>
          <g className="fnp-stamp" style={d(delayMs + 920)}>
            <path d="M60 74 L52 64 h4.6 V54 h6.8 v10 H68 Z" fill="#e8a24d" stroke="#a86a1e" strokeWidth={1.5} strokeLinejoin="round" transform="translate(0 -2)" />
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(154,165,186,0.85)" delayMs={delayMs + 1020} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Battle Pass (t4) — season track tiers ding, the +45s reward drops       */
/* ------------------------------------------------------------------------- */

function BattlePassPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-star" style={d(delayMs)}>
            <path d="M20 8 l3 8.2 8.7 0.4 -6.8 5.4 2.4 8.4 -7.3 -4.9 -7.3 4.9 2.4 -8.4 -6.8 -5.4 8.7 -0.4 Z" fill="#ffd76a" stroke="#c9931d" strokeWidth={1.3} strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(201,147,29,0.16)" delayMs={delayMs} />
      <Prop left="32%" top="36%" width="36%" height="22%">
        <svg viewBox="0 0 110 64" className="h-full w-full">
          {/* the golden season ticket */}
          <g className="fnp-linger" style={d(delayMs)}>
            <rect x={3} y={8} width={104} height={40} rx={5} fill="#2c2a3e" stroke="#ffd76a" strokeWidth={2.2} />
            <text x={12} y={22} fontSize={8} fontWeight={900} fill="#ffd76a" style={{ letterSpacing: "1px" }}>BATTLE PASS</text>
            <text x={97} y={22} fontSize={6} fontWeight={700} fill="#b9a15c" textAnchor="end">S1</text>
            {/* tier track */}
            <rect x={12} y={32} width={86} height={5} rx={2.5} fill="#4a4660" />
            <g className="fnp-fill" style={d(delayMs + 150)}>
              <rect x={12} y={32} width={86} height={5} rx={2.5} fill="#ffd76a" />
            </g>
            {/* tier nodes ding left to right */}
            {[26, 55, 84].map((x, i) => (
              <g key={x} className="fnp-node" style={d(delayMs + 320 + i * 240)}>
                <circle cx={x} cy={34.5} r={5.6} fill="#ffd76a" stroke="#a8821c" strokeWidth={1.5} />
                <text x={x} y={37} fontSize={5.6} fontWeight={800} fill="#5c4708" textAnchor="middle">{i + 1}</text>
              </g>
            ))}
          </g>
          {/* the reward: a +45s clock chip pops off the last tier */}
          <g className="fnp-rise" style={d(delayMs + 1150)}>
            <rect x={66} y={-4} width={36} height={13} rx={6.5} fill="#8fd0a0" stroke="#3f7a52" strokeWidth={1.4} />
            <circle cx={74} cy={2.5} r={3.6} fill="none" stroke="#3f7a52" strokeWidth={1.4} />
            <path d="M74 0.4 v2.1 l1.6 1" stroke="#3f7a52" strokeWidth={1.2} strokeLinecap="round" fill="none" />
            <text x={90} y={5.4} fontSize={7} fontWeight={800} fill="#1f4a2e" textAnchor="middle">+45s</text>
          </g>
          {[
            { x: "-60%", y: "-90%", r: "160deg", c: "#ffd76a", cx: 84 },
            { x: "55%", y: "-110%", r: "-120deg", c: "#f2778f", cx: 88 },
            { x: "95%", y: "-60%", r: "200deg", c: "#5aa0e8", cx: 80 },
            { x: "-95%", y: "-45%", r: "-190deg", c: "#8fd0a0", cx: 90 },
          ].map((p, i) => (
            <g key={i} className="fnp-coin" style={dv(delayMs + 1100 + i * 60, { "--fnp-x": p.x, "--fnp-y": p.y, "--fnp-r": p.r })}>
              <rect x={p.cx} y={30} width={4.6} height={2.8} rx={0.8} fill={p.c} />
            </g>
          ))}
        </svg>
      </Prop>
      <Boom color="rgba(255,215,106,0.85)" delayMs={delayMs + 1200} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. Pop-up Ad (t4) — windows nobody can close bounce onto the board         */
/* ------------------------------------------------------------------------- */

function KnightSilhouette({ x, y, s = 1, fill = "#39435c" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-8 14 h16 l-2 -4 q-1 -6 2 -10 q1 -8 -6 -12 q-2 -3 -5 -3 l1 4 -4 3 q-4 3 -3 7 q2 2 4.5 0.5 l3 -1.5 q0 4 -3.5 7 q-2.5 2.5 -3 9 Z"
      fill={fill}
    />
  );
}

function PopUpAdPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage inset="-12%">
        <svg viewBox="0 0 50 50" className="h-full w-full">
          <g className="fnp-bounce-in" style={d(delayMs)}>
            <rect x={5} y={10} width={40} height={30} rx={3} fill="#ffe9a8" stroke="#c9931d" strokeWidth={1.6} />
            <rect x={5} y={10} width={40} height={8} rx={3} fill="#e8a24d" />
            <rect x={38} y={11.5} width={5} height={5} rx={1.2} fill="#e84d5b" />
            <path d="M39.2 12.7 l2.6 2.6 m0 -2.6 l-2.6 2.6" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" />
            <KnightSilhouette x={25} y={30} s={0.75} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,162,77,0.16)" delayMs={delayMs} />
      {/* second ad sneaks in behind, offset */}
      <Prop left="45%" top="42%" width="22%" height="16%">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <g className="fnp-bounce-in" style={d(delayMs + 760)}>
            <WindowFrame title="HOT SINGLES (PAWNS)" bar="#7c5cd6" body="#efe9ff" w={100} h={56} accent="#e84d5b">
              <text x={50} y={34} fontSize={9} fontWeight={800} fill="#5b47a8" textAnchor="middle">IN YOUR AREA</text>
            </WindowFrame>
          </g>
        </svg>
      </Prop>
      {/* the main ad: YOU WON a free knight; the X refuses to work */}
      <Prop left="33%" top="34%" width="28%" height="22%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          <g className="fnp-bounce-in" style={d(delayMs + 60)}>
            <WindowFrame title="⭐ CONGRATULATIONS!!" bar="#e8a24d" body="#fff3d6" w={100} h={70} closeAnim accent="#e84d5b">
              <text x={38} y={30} fontSize={10} fontWeight={900} fill="#b56a10" textAnchor="middle">YOU WON!</text>
              <KnightSilhouette x={75} y={38} s={1.1} fill="#8a5a10" />
              <rect x={14} y={48} width={48} height={13} rx={6.5} fill="#6abf5f" stroke="#3f7a3a" strokeWidth={1.5} />
              <text x={38} y={57.2} fontSize={7} fontWeight={800} fill="#fff" textAnchor="middle">FREE KNIGHT</text>
            </WindowFrame>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(232,162,77,0.85)" delayMs={delayMs + 350} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 9. Mute Button (t4) — the speaker's waves pop off and the slash stamps down */
/* ------------------------------------------------------------------------- */

function SpeakerCone({ fill = "#39435c" }: { fill?: string }) {
  return <path d="M8 24 h9 l12 -11 v34 l-12 -11 h-9 Z" fill={fill} strokeLinejoin="round" />;
}

function MuteButtonPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 60 60" className="h-full w-full">
          <g className="fnp-sag" style={d(delayMs)}><g transform="translate(6 0)"><SpeakerCone /></g></g>
          <g className="fnp-stamp" style={d(delayMs + 620)}>
            <circle cx={30} cy={30} r={19} fill="none" stroke="#e84d5b" strokeWidth={3.4} />
            <path d="M17 43 L43 17" stroke="#e84d5b" strokeWidth={3.4} strokeLinecap="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,77,91,0.14)" delayMs={delayMs} />
      <Prop left="37%" top="35%" width="26%" height="24%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          {/* the loudest voices: a big speaker at full blast */}
          <g className="fnp-sag" style={d(delayMs)}>
            <g transform="translate(10 6) scale(1.3)"><SpeakerCone /></g>
            <text x={30} y={70} fontSize={7} fontWeight={800} fill="#5c6880" textAnchor="middle">Q + R</text>
          </g>
          {/* its sound waves pop away one by one */}
          {[0, 1, 2].map((i) => (
            <g key={i} className="fnp-wave-off" style={d(delayMs + 120 + i * 170)}>
              <path
                d={`M${56 + i * 10} ${37 - (i + 1) * 6.5} a${(i + 1) * 9} ${(i + 1) * 9} 0 0 1 0 ${(i + 1) * 13}`}
                fill="none"
                stroke="#5aa0e8"
                strokeWidth={3.4}
                strokeLinecap="round"
              />
            </g>
          ))}
          {/* the mute slash slams down */}
          <g className="fnp-stamp" style={d(delayMs + 880)}>
            <circle cx={38} cy={35} r={27} fill="none" stroke="#e84d5b" strokeWidth={5} />
            <path d="M19 54 L57 16" stroke="#e84d5b" strokeWidth={5} strokeLinecap="round" />
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.85)" delayMs={delayMs + 980} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 10. Skill Issue (t4) — the skill gauge flops to rock bottom. diagnosis: L   */
/* ------------------------------------------------------------------------- */

function SkillIssuePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-pop" style={d(delayMs)}>
            <path d="M12 10 l8 8 8 -8" fill="none" stroke="#e8a24d" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="fnp-pop" style={d(delayMs + 220)}>
            <path d="M12 21 l8 8 8 -8" fill="none" stroke="#e84d5b" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,162,77,0.14)" delayMs={delayMs} />
      <Prop left="35%" top="34%" width="30%" height="24%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          {/* the diagnostic gauge */}
          <g className="fnp-linger" style={d(delayMs)}>
            <path d="M14 52 a36 36 0 0 1 72 0" fill="none" stroke="#39445c" strokeWidth={9} strokeLinecap="round" />
            <path d="M14 52 a36 36 0 0 1 21 -32.7" fill="none" stroke="#e84d5b" strokeWidth={9} strokeLinecap="round" />
            <path d="M38 17.5 a36 36 0 0 1 24 0" fill="none" stroke="#e8d24d" strokeWidth={9} />
            <path d="M65 19.3 a36 36 0 0 1 21 32.7" fill="none" stroke="#6abf5f" strokeWidth={9} strokeLinecap="round" />
            <text x={50} y={68} fontSize={8.5} fontWeight={900} fill="#5c6880" textAnchor="middle" style={{ letterSpacing: "1px" }}>SKILL</text>
          </g>
          {/* the needle flops to the red */}
          <g className="fnp-needle" style={d(delayMs + 200)}>
            <path d="M50 52 L24 32" stroke="#e8edf6" strokeWidth={4} strokeLinecap="round" />
            <circle cx={50} cy={52} r={4.6} fill="#e8edf6" stroke="#5c6880" strokeWidth={1.4} />
          </g>
          {/* verdict stamp */}
          <g className="fnp-stamp" style={d(delayMs + 1100)}>
            <rect x={56} y={30} width={38} height={15} rx={3} fill="none" stroke="#e84d5b" strokeWidth={2.6} />
            <text x={75} y={41.2} fontSize={8.4} fontWeight={900} fill="#e84d5b" textAnchor="middle" style={{ letterSpacing: "0.6px" }}>ISSUE</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.8)" delayMs={delayMs + 1150} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 11. Alt+F4 (t5) — Alt, F4, and their draft window slams shut. gg.          */
/* ------------------------------------------------------------------------- */

function AltF4Play({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 50 50" className="h-full w-full">
          <g className="fnp-slam" style={d(delayMs)}>
            <rect x={7} y={12} width={36} height={28} rx={3} fill="#e8edf6" stroke="#39445c" strokeWidth={1.8} />
            <rect x={7} y={12} width={36} height={8} rx={3} fill="#39445c" />
            <rect x={36} y={13.5} width={5.5} height={5} rx={1.2} fill="#e84d5b" />
          </g>
          <g className="fnp-puff" style={dv(delayMs + 850, { "--fnp-x": "-24%", "--fnp-y": "-16%" })}><circle cx={16} cy={38} r={3} fill="rgba(170,178,194,0.8)" /></g>
          <g className="fnp-puff" style={dv(delayMs + 900, { "--fnp-x": "26%", "--fnp-y": "-20%" })}><circle cx={34} cy={38} r={2.6} fill="rgba(170,178,194,0.75)" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(57,68,92,0.22)" delayMs={delayMs} />
      {/* their draft client, mid-draft */}
      <Prop left="34%" top="32%" width="30%" height="24%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          <g className="fnp-slam" style={d(delayMs + 580)}>
            <WindowFrame title="draft.exe — picking..." bar="#39445c" body="#e8edf6" w={100} h={70} accent="#e84d5b">
              {/* the three cards they were about to pick from */}
              {[16, 42, 68].map((x, i) => (
                <g key={x}>
                  <rect x={x} y={22} width={17} height={24} rx={2.4} fill={["#b98cff", "#5aa0e8", "#8fd0a0"][i]} stroke="#39445c" strokeWidth={1.3} />
                  <circle cx={x + 8.5} cy={30} r={3.2} fill="#fff" opacity={0.85} />
                  <rect x={x + 3} y={37} width={11} height={2.4} rx={1.2} fill="#fff" opacity={0.7} />
                </g>
              ))}
              <rect x={16} y={52} width={69} height={9} rx={4.5} fill="#c3cddd" />
              <text x={50} y={58.8} fontSize={5.6} fontWeight={700} fill="#5c6880" textAnchor="middle">choose your card…</text>
            </WindowFrame>
          </g>
          {/* dust where the window hit the floor */}
          <g className="fnp-puff" style={dv(delayMs + 1440, { "--fnp-x": "-30%", "--fnp-y": "-18%" })}><circle cx={30} cy={18} r={4} fill="rgba(170,178,194,0.85)" /></g>
          <g className="fnp-puff" style={dv(delayMs + 1490, { "--fnp-x": "32%", "--fnp-y": "-24%" })}><circle cx={66} cy={18} r={3.4} fill="rgba(170,178,194,0.8)" /></g>
          <g className="fnp-puff" style={dv(delayMs + 1540, { "--fnp-x": "0%", "--fnp-y": "-34%" })}><circle cx={48} cy={16} r={2.8} fill="rgba(170,178,194,0.75)" /></g>
        </svg>
      </Prop>
      {/* the fatal chord */}
      <Prop left="39%" top="57%" width="20%" height="8%">
        <svg viewBox="0 0 100 26" className="h-full w-full">
          <g className="fnp-press" style={d(delayMs)}><Keycap x={12} y={2} w={30} label="Alt" /></g>
          <text x={50} y={15} fontSize={10} fontWeight={800} fill="#e8edf6" textAnchor="middle">+</text>
          <g className="fnp-press" style={d(delayMs + 200)}><Keycap x={58} y={2} w={30} label="F4" /></g>
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.85)" delayMs={delayMs + 1100} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 12. Touch Grass (t5) — a meadow grows across the board; they go outside     */
/* ------------------------------------------------------------------------- */

function GrassTuft({ x, y, s = 1, tone = "#5fae52" }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 q-2.6 -7 -6.5 -9.5 q4.8 0.6 7 5 q-0.4 -8 2.5 -12 q1.6 5 0.6 11 q3 -5.5 7 -6.5 q-3.4 4.6 -4.6 9 q-3 3 -6 3 Z" fill={tone} stroke="#38702f" strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

function Daisy({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx={0} cy={-3.6} rx={1.7} ry={3.4} fill="#fff" stroke="#c9cdd8" strokeWidth={0.5} transform={`rotate(${a})`} />
      ))}
      <circle r={2.2} fill="#ffd23f" stroke="#c9931d" strokeWidth={0.7} />
    </g>
  );
}

function TouchGrassPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-grass" style={d(delayMs)}><GrassTuft x={16} y={34} s={1.1} /></g>
          <g className="fnp-grass" style={d(delayMs + 200)}><GrassTuft x={28} y={35} s={0.8} tone="#6fbf5f" /></g>
          <g className="fnp-pop" style={d(delayMs + 480)}><Daisy x={24} y={26} s={0.9} /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(95,174,82,0.18)" delayMs={delayMs} />
      <Prop left="30%" top="30%" width="40%" height="34%">
        <svg viewBox="0 0 140 120" className="h-full w-full">
          {/* the sun comes up — it's a beautiful day out there */}
          <g className="fnp-sunrise" style={d(delayMs + 150)}>
            <g transform="translate(24 26)">
              <circle r={11} fill="#ffd23f" stroke="#e8a24d" strokeWidth={2} />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <path key={a} d="M0 -15 v-6" stroke="#e8a24d" strokeWidth={3} strokeLinecap="round" transform={`rotate(${a})`} />
              ))}
            </g>
          </g>
          {/* grass sweeps across the board, left to right */}
          {[
            { x: 12, y: 108, s: 1.5, t: "#5fae52", dl: 0 },
            { x: 34, y: 112, s: 1.9, t: "#6fbf5f", dl: 110 },
            { x: 56, y: 107, s: 1.6, t: "#4f9e46", dl: 220 },
            { x: 78, y: 112, s: 2.1, t: "#5fae52", dl: 330 },
            { x: 100, y: 108, s: 1.7, t: "#6fbf5f", dl: 440 },
            { x: 122, y: 112, s: 1.9, t: "#4f9e46", dl: 550 },
          ].map((g2, i) => (
            <g key={i} className="fnp-grass" style={d(delayMs + 200 + g2.dl)}>
              <GrassTuft x={g2.x} y={g2.y} s={g2.s} tone={g2.t} />
            </g>
          ))}
          <g className="fnp-pop" style={d(delayMs + 820)}><Daisy x={47} y={92} s={1.5} /></g>
          <g className="fnp-pop" style={d(delayMs + 980)}><Daisy x={104} y={95} s={1.2} /></g>
          {/* a butterfly crosses; the invitation is clear */}
          <g className="fnp-flit" style={d(delayMs + 350)}>
            <g transform="translate(70 58)">
              <ellipse cx={-3.4} cy={0} rx={4} ry={2.6} fill="#f2778f" transform="rotate(-24 -3.4 0)" />
              <ellipse cx={3.4} cy={0} rx={4} ry={2.6} fill="#f2909f" transform="rotate(24 3.4 0)" />
              <rect x={-0.9} y={-3} width={1.8} height={6} rx={0.9} fill="#5c4708" />
            </g>
          </g>
          {/* the prescription */}
          <g className="fnp-rise" style={d(delayMs + 900)}>
            <rect x={40} y={30} width={60} height={14} rx={7} fill="#2f6b2f" opacity={0.92} />
            <text x={70} y={40} fontSize={8} fontWeight={800} fill="#eaf6e4" textAnchor="middle">GO OUTSIDE</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(111,191,95,0.85)" delayMs={delayMs + 850} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 13. Main Character (t5) — clapperboard, spotlight, plot armor              */
/* ------------------------------------------------------------------------- */

function MainCharacterPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage inset="-15%">
        <svg viewBox="0 0 50 50" className="h-full w-full">
          {/* the spotlight finds this piece */}
          <g className="fnp-spot" style={d(delayMs)}>
            <path d="M25 -2 L10 44 a24 9 0 0 0 30 0 Z" fill="rgba(255,232,150,0.5)" />
          </g>
          <g className="fnp-pop" style={d(delayMs + 550)}>
            <path d="M25 26 l1.9 5.2 5.6 0.3 -4.4 3.5 1.5 5.4 -4.6 -3.1 -4.6 3.1 1.5 -5.4 -4.4 -3.5 5.6 -0.3 Z" fill="#ffd76a" stroke="#c9931d" strokeWidth={1} strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(30,26,48,0.3)" delayMs={delayMs} />
      <Prop left="35%" top="31%" width="30%" height="27%">
        <svg viewBox="0 0 100 90" className="h-full w-full">
          {/* the spotlight swings down onto the star */}
          <g className="fnp-spot" style={d(delayMs + 320)}>
            <path d="M50 -2 L28 74 a22 8 0 0 0 44 0 Z" fill="rgba(255,232,150,0.45)" />
            <ellipse cx={50} cy={74} rx={22} ry={8} fill="rgba(255,232,150,0.35)" />
          </g>
          {/* ACTION! the clapperboard snaps */}
          <g className="fnp-linger" style={d(delayMs)}>
            <g transform="translate(8 14)">
              <g className="fnp-clap" style={d(delayMs + 80)}>
                <path d="M0 6 L30 0 l1.6 7 -30 6 Z" fill="#22242e" stroke="#0e0f15" strokeWidth={1} />
                {[3, 10, 17, 24].map((x) => (
                  <path key={x} d={`M${x} ${6 - x * 0.19} l4 -0.8 1.4 6.2 -4 0.9 Z`} fill="#e8edf6" />
                ))}
              </g>
              <rect x={0} y={12} width={32} height={20} rx={1.6} fill="#22242e" stroke="#0e0f15" strokeWidth={1} />
              <text x={16} y={25} fontSize={6} fontWeight={800} fill="#e8edf6" textAnchor="middle">TAKE 1</text>
            </g>
          </g>
          {/* the star piece with its plot-armor badge */}
          <g className="fnp-pop" style={d(delayMs + 700)}>
            <path d="M50 46 l3.4 9.4 10 0.5 -7.8 6.2 2.7 9.7 -8.3 -5.6 -8.3 5.6 2.7 -9.7 -7.8 -6.2 10 -0.5 Z" fill="#ffd76a" stroke="#c9931d" strokeWidth={1.6} strokeLinejoin="round" />
          </g>
          {[
            { x: 30, y: 44, dl: 850 },
            { x: 72, y: 40, dl: 990 },
            { x: 64, y: 66, dl: 1130 },
          ].map((s2, i) => (
            <g key={i} className="fnp-star" style={d(delayMs + s2.dl)}>
              <path d={`M${s2.x} ${s2.y - 4} l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 Z`} fill="#fff2c9" />
            </g>
          ))}
          <g className="fnp-rise" style={d(delayMs + 1100)}>
            <text x={50} y={14} fontSize={8.4} fontWeight={900} fill="#ffd76a" textAnchor="middle" style={{ letterSpacing: "1.6px" }}>STARRING</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(255,215,106,0.85)" delayMs={delayMs + 1000} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 14. Smurf Account (t6) — "new player" joins. rating: 2750. sure buddy.     */
/* ------------------------------------------------------------------------- */

function Sunglasses({ w = 26 }: { w?: number }) {
  const lens = w * 0.36;
  return (
    <g>
      <rect x={-w / 2} y={-2} width={lens} height={7.5} rx={2.4} fill="#181b22" stroke="#0a0c10" strokeWidth={1} />
      <rect x={w / 2 - lens} y={-2} width={lens} height={7.5} rx={2.4} fill="#181b22" stroke="#0a0c10" strokeWidth={1} />
      <path d={`M${-w / 2 + lens} 1 h${w - 2 * lens}`} stroke="#0a0c10" strokeWidth={1.8} />
    </g>
  );
}

function SmurfAccountPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="fnp-drop" style={d(delayMs)}>
            <g transform="translate(20 17)"><Sunglasses w={22} /></g>
          </g>
          <g className="fnp-rise" style={d(delayMs + 600)}>
            <text x={20} y={34} fontSize={7.5} fontWeight={900} fill="#5aa0e8" textAnchor="middle">gg ez</text>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(90,160,232,0.16)" delayMs={delayMs} />
      <Prop left="34%" top="33%" width="30%" height="24%">
        <svg viewBox="0 0 100 74" className="h-full w-full">
          <g className="fnp-linger" style={d(delayMs)}>
            <WindowFrame title="player joined" bar="#4577b8" body="#eaf1fb" w={100} h={70} accent="#e84d5b">
              {/* the innocent newborn account */}
              <circle cx={26} cy={36} r={12.5} fill="#ffe1c4" stroke="#b98a5e" strokeWidth={1.5} />
              <path d="M20 25 q6 -6 12 0" fill="none" stroke="#b98a5e" strokeWidth={1.5} strokeLinecap="round" />
              <circle cx={21.5} cy={34} r={1.3} fill="#4a3d28" />
              <circle cx={30.5} cy={34} r={1.3} fill="#4a3d28" />
              <path d="M23 41 q3 2.4 6 0" fill="none" stroke="#4a3d28" strokeWidth={1.2} strokeLinecap="round" />
              <text x={44} y={31} fontSize={6.4} fontWeight={800} fill="#39435c">xX_Beginner_Xx</text>
              <text x={44} y={41} fontSize={5.4} fontWeight={600} fill="#7c88a4">first game! be nice</text>
              {/* the rating tell: 400 flips to 2750?! */}
              <g className="fnp-swap-out" style={d(delayMs + 200)}>
                <rect x={44} y={47} width={26} height={12} rx={3} fill="#c3cddd" />
                <text x={57} y={55.8} fontSize={6.6} fontWeight={800} fill="#5c6880" textAnchor="middle">400</text>
              </g>
              <g className="fnp-swap-in" style={d(delayMs + 200)}>
                <rect x={44} y={47} width={40} height={12} rx={3} fill="#ffd76a" stroke="#c9931d" strokeWidth={1.3} />
                <text x={64} y={55.8} fontSize={7} fontWeight={900} fill="#7a5708" textAnchor="middle">2750?!</text>
              </g>
              {/* the shades drop. everyone knows. */}
              <g className="fnp-drop" style={d(delayMs + 1050)}>
                <g transform="translate(26 34)"><Sunglasses w={24} /></g>
              </g>
            </WindowFrame>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(90,160,232,0.85)" delayMs={delayMs + 1200} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 15. Pay to Win (t6) — card swipes, register dings, BOTH cards fan out      */
/* ------------------------------------------------------------------------- */

function PayToWinPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {[
            { x: "-55%", y: "-80%", r: "160deg", cx: 16 },
            { x: "60%", y: "-95%", r: "-140deg", cx: 24 },
            { x: "10%", y: "-115%", r: "200deg", cx: 20 },
          ].map((p, i) => (
            <g key={i} className="fnp-coin" style={dv(delayMs + i * 90, { "--fnp-x": p.x, "--fnp-y": p.y, "--fnp-r": p.r })}>
              <circle cx={p.cx} cy={26} r={3.6} fill="#ffd76a" stroke="#c9931d" strokeWidth={1} />
              <text x={p.cx} y={28.4} fontSize={5.4} fontWeight={800} fill="#8a5a10" textAnchor="middle">$</text>
            </g>
          ))}
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(201,147,29,0.18)" delayMs={delayMs} />
      <Prop left="34%" top="32%" width="30%" height="26%">
        <svg viewBox="0 0 100 88" className="h-full w-full">
          {/* the terminal */}
          <g className="fnp-linger" style={d(delayMs)}>
            <rect x={26} y={18} width={48} height={26} rx={4} fill="#39445c" stroke="#232a38" strokeWidth={1.8} />
            <rect x={32} y={23} width={36} height={10} rx={2} fill="#141926" />
            <g className="fnp-swap-in" style={d(delayMs)}>
              <text x={50} y={30.6} fontSize={6} fontWeight={800} fill="#8fd0a0" textAnchor="middle">APPROVED</text>
            </g>
            {/* the swipe slot */}
            <rect x={22} y={44} width={56} height={5} rx={2.5} fill="#232a38" />
          </g>
          {/* the golden card swipes through */}
          <g className="fnp-swipe" style={d(delayMs + 120)}>
            <g transform="translate(50 41)">
              <rect x={-16} y={-10} width={32} height={20} rx={3} fill="#ffd76a" stroke="#c9931d" strokeWidth={1.6} />
              <rect x={-16} y={-5.5} width={32} height={4.4} fill="#8a5a10" />
              <rect x={-12} y={2.5} width={13} height={2.6} rx={1.3} fill="#fff2c9" />
            </g>
          </g>
          {/* the payout: coins + BOTH draft cards fan into the hand */}
          {[
            { x: "-70%", y: "-95%", r: "170deg", cx: 38 },
            { x: "70%", y: "-110%", r: "-150deg", cx: 62 },
            { x: "-30%", y: "-130%", r: "220deg", cx: 46 },
            { x: "35%", y: "-125%", r: "-200deg", cx: 56 },
          ].map((p, i) => (
            <g key={i} className="fnp-coin" style={dv(delayMs + 620 + i * 70, { "--fnp-x": p.x, "--fnp-y": p.y, "--fnp-r": p.r })}>
              <circle cx={p.cx} cy={46} r={3.4} fill="#ffd76a" stroke="#c9931d" strokeWidth={0.9} />
              <text x={p.cx} y={48.3} fontSize={5} fontWeight={800} fill="#8a5a10" textAnchor="middle">$</text>
            </g>
          ))}
          <g className="fnp-fan" style={dv(delayMs + 1000, { "--fnp-r": "-13deg" })}>
            <rect x={30} y={56} width={17} height={25} rx={2.6} fill="#b98cff" stroke="#ffd76a" strokeWidth={1.8} />
            <circle cx={38.5} cy={64} r={3.2} fill="#fff" opacity={0.85} />
          </g>
          <g className="fnp-fan" style={dv(delayMs + 1100, { "--fnp-r": "13deg" })}>
            <rect x={53} y={56} width={17} height={25} rx={2.6} fill="#5aa0e8" stroke="#ffd76a" strokeWidth={1.8} />
            <circle cx={61.5} cy={64} r={3.2} fill="#fff" opacity={0.85} />
          </g>
          <g className="fnp-rise" style={d(delayMs + 1250)}>
            <text x={50} y={12} fontSize={8.4} fontWeight={900} fill="#ffd76a" textAnchor="middle">TAKE BOTH</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(255,215,106,0.85)" delayMs={delayMs + 1050} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* Expansion Permit — the construction crew bolts a NINTH file onto the board  */
/* and a rook wraps off the right edge back onto the left (toroidal files).    */
/* ------------------------------------------------------------------------- */

/** Blocky rook silhouette, centered on its own origin. */
function RookGlyph({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <path
      d="M-7 9 L-7 5 L-5 3 L-5 -3 L-7 -3 L-7 -6 L-4.5 -6 L-4.5 -4 L-1.5 -4 L-1.5 -6 L1.5 -6 L1.5 -4 L4.5 -4 L4.5 -6 L7 -6 L7 -3 L5 -3 L5 3 L7 5 L7 9 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  );
}

function ExpansionPermitPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    // Square-local: a permit stamp thunks down.
    return (
      <Stage inset="12%">
        <span className="fnp-permit-stamp absolute inset-0 block" style={d(delayMs)}>
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <rect x={18} y={26} width={64} height={48} rx={5} fill="#ffd76a" stroke="#c9931d" strokeWidth={3} />
            <rect x={18} y={26} width={64} height={11} fill="#2a2018" opacity={0.85} />
            <text x={50} y={58} fontSize={15} fontWeight={900} fill="#8a5a10" textAnchor="middle">+1</text>
          </svg>
        </span>
      </Stage>
    );
  }
  const caution = "#ffb454";
  return (
    <Wide>
      <Wash color="rgba(201,147,29,0.16)" delayMs={delayMs} />
      <Prop left="30%" top="30%" width="40%" height="34%">
        <svg viewBox="0 0 120 88" className="h-full w-full">
          {/* the existing board edge (a few files sketched at the left) */}
          <g className="fnp-linger" style={d(delayMs)} opacity={0.8}>
            {[0, 1, 2].map((i) => (
              <rect key={i} x={10 + i * 16} y={22} width={16} height={44} fill="none" stroke="#5c5348" strokeWidth={1} strokeDasharray="2 2" />
            ))}
          </g>

          {/* the NINTH file bolts on at the right: a striped panel slides in */}
          <g className="fnp-file-bolt" style={d(delayMs + 120)}>
            <rect x={82} y={20} width={20} height={48} rx={2} fill="#3a3128" stroke={caution} strokeWidth={2} />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={83} y={22 + i * 9} width={18} height={4.5} fill={caution} opacity={0.55} />
            ))}
            {[[85, 23], [99, 23], [85, 65], [99, 65]].map(([cx, cy], i) => (
              <circle key={i} className="fnp-bolt-pop" style={d(delayMs + 360 + i * 60)} cx={cx} cy={cy} r={2.2} fill="#ffe9a8" stroke="#8a5a10" strokeWidth={0.8} />
            ))}
          </g>

          {/* seams on BOTH edges glow: the wrap portal is open */}
          <rect className="fnp-seam-glow" style={d(delayMs + 520)} x={8.5} y={20} width={2.4} height={48} fill="#ffe9a8" />
          <rect className="fnp-seam-glow" style={d(delayMs + 560)} x={100} y={20} width={2.4} height={48} fill="#ffe9a8" />

          {/* the rook glides right, EXITS at the right seam... */}
          <g className="fnp-rook-exit" style={d(delayMs + 560)} transform="translate(58 44)">
            <RookGlyph fill="#e8dcc0" stroke="#7a6a4a" />
          </g>
          {/* ...and WRAPS back in from the left seam */}
          <g className="fnp-rook-enter" style={d(delayMs + 900)} transform="translate(16 44)">
            <RookGlyph fill="#e8dcc0" stroke="#7a6a4a" />
          </g>
          {/* a wrap-arrow traveller arcs over the top: right edge -> left edge */}
          <g className="fnp-wrap-dot" style={d(delayMs + 620)}>
            <circle cx={0} cy={0} r={2.4} fill="#ffd76a" />
          </g>

          {/* PERMIT APPROVED stamp thunks in */}
          <g className="fnp-permit-thunk" style={d(delayMs + 960)}>
            <rect x={34} y={72} width={52} height={13} rx={2} fill="none" stroke="#8fd0a0" strokeWidth={2} />
            <text x={60} y={82} fontSize={8} fontWeight={900} fill="#8fd0a0" textAnchor="middle">APPROVED</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(255,215,106,0.85)" delayMs={delayMs + 1180} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

// Zone sources mirror the core-table conventions (Batch 2-11): summons /
// revives / placements read the "summon" zone, shields read "shield", the
// walnut bonk reads "walnut", skips + opponent-clock hits read "stun",
// own-tempo reads "rally", movement curses read "slow". Flag-only draft /
// info tricks (no board change, no zone) are lead-only plays. All sounds are
// existing SigSoundKeys.
export const PLAYS: Record<string, SigPlugin> = {
  emotional_support_pawn: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" },
    Render: EmotionalSupportPawnPlay,
  },
  stream_sniper: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" },
    Render: StreamSniperPlay,
  },
  lag_spike: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", source: "stun" },
    Render: LagSpikePlay,
  },
  ctrl_z: {
    config: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b"], hasLead: true, sound: "wall", source: "summon" },
    Render: CtrlZPlay,
  },
  rubber_chicken: {
    config: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "siege", source: "walnut" },
    Render: RubberChickenPlay,
  },
  day_one_patch: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" },
    Render: DayOnePatchPlay,
  },
  battle_pass: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "rally" },
    Render: BattlePassPlay,
  },
  pop_up_ad: {
    config: { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", source: "summon" },
    Render: PopUpAdPlay,
  },
  mute_button: {
    config: { ordering: "radial", staggerMs: 0, victims: ["q", "r"], hasLead: true, sound: "snooze" },
    Render: MuteButtonPlay,
  },
  skill_issue: {
    config: { ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "snooze", source: "slow" },
    Render: SkillIssuePlay,
  },
  alt_f4: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege" },
    Render: AltF4Play,
  },
  touch_grass: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", source: "stun" },
    Render: TouchGrassPlay,
  },
  main_character: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" },
    Render: MainCharacterPlay,
  },
  smurf_account: {
    config: { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "wall", source: "summon" },
    Render: SmurfAccountPlay,
  },
  pay_to_win: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" },
    Render: PayToWinPlay,
  },
  // Expansion Permit (t5 movement): self-buff, no removal diff, so a lead-only
  // config — the diff-less board-wide lead path (Board.tsx) plays the scene
  // when the card is cast. "wall" is the closest voice for the construction
  // bolt-on.
  expansion_permit: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" },
    Render: ExpansionPermitPlay,
  },
};
