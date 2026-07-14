// Personal-set plugin signatures (bespoke literal card animations for the
// owner's "personal" card set). See sigPlugins.tsx for the contract.
// Self-contained: own SVG, own CSS (personalPlays.css), transform/opacity
// only. Do NOT import from BoardEffects.tsx (cycle hazard).
//
// Design brief (owner): over-the-top yet ELEGANT signature moves — each card
// acts out its own fiction in one sleek, readable beat. The gym cards move
// like lifts (a dead hang that explodes past the bar, a 225 press that
// shoves whole ranks), the focus cards move like their apps (a monkeytype
// caret, a cube face wrenching a quarter turn), the affection cards stay
// soft (lean-ins, charm ribbons), Hyein strides the board in person
// (public/newjeans portrait, the BrainrotFigure pattern), and the named
// cards stage their scene (a silk soundwave wash, a golden part-line, veins
// of light up the files). Leads run ~1.4-1.9s (tier 3-6); the tier-8 charm
// takeover holds ~2.2s. All geometry is percentage-based so every scene
// scales with the board.
//
// Which ids live here: personal-set cards with no core SIGNATURES entry
// (core beats plugins at the resolve site — a duplicate here would be dead
// code). The FLAGSHIPS live here too: all five NewJeans members (minji /
// hanni / danielle / haerin / hyein) star their own /newjeans portrait
// board-wide, and I Love Cami stars /companions/cami.svg with a rank+file
// cross-sweep of light. Their old core entries were removed so these render.
// Zone sources follow each card's CURRENT mechanic: minji shields (shield),
// hanni charm-freezes (frozen), danielle summons pawns (summon), hyein's
// pawn-stride rally paints the rally banner (rally), haerin's pounce is a
// plain removal diff (no source), and Cami is the one remaining companion
// placement (summon).

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";
import "./personalPlays.css";

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
    <span className="pnp pointer-events-none absolute z-20 block" style={{ inset }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for wide leads: oversized around the lead square so the
 * scene takes over the whole visible board (the caller's crop clips it).
 * Same geometry as the core BoardWideStage — a 1400% canvas is ~14 cells, so
 * the 8x8 board is the middle ~57% — rebuilt here to avoid the import cycle. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="pnp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="pnp-wash absolute inset-0 block" style={{ background: color, ...d(delayMs) }} />;
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

/** Closing ring flourish inside a Wide stage. */
function Ring({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="pnp-ring absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "70%", width: "70%", marginLeft: "-35%", marginTop: "-35%", border: `3px solid ${color}`, ...d(delayMs) }}
    />
  );
}

/** Elliptical ambient light inside a Wide stage — the ONLY sanctioned light
 * behind a portrait (design brief §3: radial/elliptical, smaller than the
 * figure's silhouette; never a rectangular wash). */
function Glow({
  left,
  top,
  width,
  height,
  color,
  delayMs,
}: {
  left: string;
  top: string;
  width: string;
  height: string;
  color: string;
  delayMs: number;
}) {
  return (
    <Prop left={left} top={top} width={width} height={height}>
      <span
        className="pnp-glow absolute inset-0 block rounded-full"
        style={{ background: `radial-gradient(closest-side, ${color}, transparent 72%)`, ...d(delayMs) }}
      />
    </Prop>
  );
}

/** Soft elliptical ground shadow a rising character stands over. */
function GroundShadow({
  left,
  top,
  width,
  height = "3.4%",
  delayMs,
}: {
  left: string;
  top: string;
  width: string;
  height?: string;
  delayMs: number;
}) {
  return (
    <Prop left={left} top={top} width={width} height={height}>
      <span
        className="pnp-groundshadow absolute inset-0 block rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(10,12,18,0.42), transparent 70%)", ...d(delayMs) }}
      />
    </Prop>
  );
}

/** A star portrait as a plain <img> (the BrainrotFigure pattern, rebuilt here
 * so nothing imports the core): /newjeans/<id>.svg or /companions/<id>.svg. */
function Portrait({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
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

/** Chunky pawn silhouette (the personal set's everyman athlete). */
function Pawn({ x = 0, y = 0, s = 1, fill = "#f2e5c9", stroke = "#7a6a4a" }: { x?: number; y?: number; s?: number; fill?: string; stroke?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-7 14 q-1.6 -7 3 -10 q-3 -2.4 -1.4 -5.4 a5.4 5.4 0 1 1 9 0 q1.6 3 -1.4 5.4 q4.6 3 3 10 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={1.4}
      strokeLinejoin="round"
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

function KissMark({ x, y, s = 1, fill = "#e8506e" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* upper lip: two lobes; lower lip: one full curve */}
      <path d="M-5 -1.4 q2 -3.4 5 -1 q3 -2.4 5 1 q-2.4 1.6 -5 1.2 q-2.6 0.4 -5 -1.2 Z" fill={fill} />
      <path d="M-5 0.6 q5 4.4 10 0 q-2.2 3.8 -5 3.8 q-2.8 0 -5 -3.8 Z" fill={fill} opacity={0.9} />
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* Athlete scenes — the calisthenics cards star an actual figure DOING the   */
/* skill (owner request): SMIL-animated chalk athletes from public/gym/,     */
/* staged huge board-wide with a wash, gold honor ring, and chalk puffs.     */
/* ------------------------------------------------------------------------- */

function AthleteScene({
  id,
  lead,
  delayMs,
  wash = "rgba(232,237,246,0.14)",
}: {
  id: string;
  lead: boolean;
  delayMs: number;
  wash?: string;
}) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-puff" style={dv(delayMs, { "--pnp-x": "-20%", "--pnp-y": "-24%" })}>
            <circle cx={15} cy={25} r={3.2} fill="rgba(232,237,246,0.9)" />
          </g>
          <g className="pnp-puff" style={dv(delayMs + 110, { "--pnp-x": "22%", "--pnp-y": "-28%" })}>
            <circle cx={25} cy={24} r={2.7} fill="rgba(232,237,246,0.85)" />
          </g>
          <circle cx={20} cy={20} r={11} fill="none" stroke="#ffd76a" strokeWidth={2} className="pnp-rise" style={d(delayMs + 160)} />
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color={wash} delayMs={delayMs} />
      {/* TELL: the chalk clap, before anyone appears */}
      <Prop left="40%" top="40%" width="10%" height="10%">
        <svg viewBox="0 0 30 30" className="h-full w-full">
          <g className="pnp-puff" style={dv(delayMs, { "--pnp-x": "-26%", "--pnp-y": "-20%" })}>
            <circle cx={15} cy={15} r={7} fill="rgba(232,237,246,0.85)" />
          </g>
        </svg>
      </Prop>
      <Prop left="50%" top="39%" width="10%" height="10%">
        <svg viewBox="0 0 30 30" className="h-full w-full">
          <g className="pnp-puff" style={dv(delayMs + 90, { "--pnp-x": "28%", "--pnp-y": "-24%" })}>
            <circle cx={15} cy={15} r={6} fill="rgba(232,237,246,0.8)" />
          </g>
        </svg>
      </Prop>
      {/* honor ring pulsing behind the athlete */}
      <Prop left="30%" top="22%" width="40%" height="40%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx={50} cy={54} r={40} fill="none" stroke="rgba(255,215,106,0.5)" strokeWidth={1.6} className="pnp-linger" style={d(delayMs + 260)} />
        </svg>
      </Prop>
      {/* ground shadow the athlete rises over */}
      <GroundShadow left="38%" top="62%" width="24%" delayMs={delayMs + 200} />
      {/* STRIKE: THE GUY, doing the actual skill, huge (the SVG loops its own
          reps); he rises out of the chalk cloud rather than fading in */}
      <Prop left="26%" top="18%" width="48%" height="48%">
        <span className="pnp-heroup block h-full w-full" style={d(delayMs + 240)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/gym/${id}.svg`} alt="" aria-hidden draggable={false} className="h-full w-full select-none object-contain" />
        </span>
      </Prop>
      {/* SETTLE: loose chalk specks drift back down */}
      {[
        { l: "39%", t: "38%", dl: 1050 },
        { l: "58%", t: "36%", dl: 1180 },
        { l: "48%", t: "42%", dl: 1310 },
      ].map((s, i) => (
        <Prop key={i} left={s.l} top={s.t} width="3%" height="4%">
          <svg viewBox="0 0 10 14" className="h-full w-full">
            <g className="pnp-speck" style={d(delayMs + s.dl)}>
              <circle cx={5} cy={5} r={2.1} fill="rgba(232,237,246,0.8)" />
            </g>
          </svg>
        </Prop>
      ))}
    </Wide>
  );
}

const HandstandPushupPlay = ({ lead, delayMs }: { lead: boolean; delayMs: number }) => (
  <AthleteScene id="handstand_pushup" lead={lead} delayMs={delayMs} />
);
const FullPlanchePlay = ({ lead, delayMs }: { lead: boolean; delayMs: number }) => (
  <AthleteScene id="full_planche" lead={lead} delayMs={delayMs} wash="rgba(255,215,106,0.12)" />
);
const FingertipMaltesePlay = ({ lead, delayMs }: { lead: boolean; delayMs: number }) => (
  <AthleteScene id="fingertip_maltese" lead={lead} delayMs={delayMs} wash="rgba(159,208,234,0.13)" />
);
const OneArmDreamPlay = ({ lead, delayMs }: { lead: boolean; delayMs: number }) => (
  <AthleteScene id="onearmmuscleupismydream" lead={lead} delayMs={delayMs} wash="rgba(255,215,106,0.10)" />
);

/* ------------------------------------------------------------------------- */
/* 1. Muscle Up (t4) — chalk hits the bar, dead hang, EXPLOSIVE rise          */
/* ------------------------------------------------------------------------- */

function MuscleUpPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-puff" style={dv(delayMs, { "--pnp-x": "-22%", "--pnp-y": "-26%" })}>
            <circle cx={14} cy={26} r={3.4} fill="rgba(232,237,246,0.9)" />
          </g>
          <g className="pnp-puff" style={dv(delayMs + 90, { "--pnp-x": "24%", "--pnp-y": "-30%" })}>
            <circle cx={26} cy={25} r={2.9} fill="rgba(232,237,246,0.85)" />
          </g>
          <g className="pnp-rise" style={d(delayMs + 200)}>
            <path d="M20 28 V15 M14.5 20.5 L20 15 L25.5 20.5" fill="none" stroke="#ffd76a" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,237,246,0.14)" delayMs={delayMs} />
      <Prop left="29%" top="25%" width="42%" height="42%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* the bar: two uprights, one knurled crossbar */}
          <g className="pnp-linger" style={d(delayMs)}>
            <rect x={13} y={26} width={4.5} height={62} rx={2.2} fill="#5c6880" />
            <rect x={82.5} y={26} width={4.5} height={62} rx={2.2} fill="#5c6880" />
            {/* the crossbar FLEXES under the dead hang — the tell before the pull */}
            <g className="pnp-barflex" style={d(delayMs + 420)}>
              <rect x={10} y={30} width={80} height={5} rx={2.5} fill="#aab6c8" stroke="#5c6880" strokeWidth={1.4} />
              <path d="M38 32.5 h24" stroke="#7c88a4" strokeWidth={1.6} strokeDasharray="2 2.4" strokeLinecap="round" />
            </g>
          </g>
          {/* chalk clap before the pull */}
          <g className="pnp-puff" style={dv(delayMs + 120, { "--pnp-x": "-30%", "--pnp-y": "-18%" })}>
            <circle cx={38} cy={44} r={5} fill="rgba(232,237,246,0.9)" />
          </g>
          <g className="pnp-puff" style={dv(delayMs + 180, { "--pnp-x": "32%", "--pnp-y": "-22%" })}>
            <circle cx={62} cy={44} r={4.4} fill="rgba(232,237,246,0.85)" />
          </g>
          {/* the athlete: dead hang under the bar, then the explosive rise
              past it (arms drawn up to the grip) */}
          <g className="pnp-pullup" style={d(delayMs + 150)}>
            <path d="M40 46 q3 -8 8 -11 m12 11 q-3 -8 -8 -11" fill="none" stroke="#7a6a4a" strokeWidth={2.6} strokeLinecap="round" />
            <Pawn x={50} y={52} s={1.7} />
          </g>
          {/* speed zips left behind by the blast */}
          <g className="pnp-zip" style={d(delayMs + 850)}><rect x={34} y={48} width={2.6} height={16} rx={1.3} fill="rgba(255,215,106,0.9)" /></g>
          <g className="pnp-zip" style={d(delayMs + 910)}><rect x={50} y={52} width={2.6} height={20} rx={1.3} fill="rgba(232,237,246,0.9)" /></g>
          <g className="pnp-zip" style={d(delayMs + 970)}><rect x={64} y={48} width={2.6} height={16} rx={1.3} fill="rgba(255,215,106,0.85)" /></g>
          {/* lock-out star over the bar */}
          <g className="pnp-star" style={d(delayMs + 1080)}><SparkStar x={50} y={16} s={1.4} /></g>
          {/* SETTLE: chalk shaken off the grip drifts back down */}
          <g className="pnp-speck" style={d(delayMs + 1150)}><circle cx={42} cy={36} r={1.7} fill="rgba(232,237,246,0.85)" /></g>
          <g className="pnp-speck" style={d(delayMs + 1260)}><circle cx={58} cy={35} r={1.4} fill="rgba(232,237,246,0.8)" /></g>
        </svg>
      </Prop>
      <Ring color="rgba(255,215,106,0.85)" delayMs={delayMs + 1050} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. 225 Bench (t6) — the loaded barbell presses across the board            */
/* ------------------------------------------------------------------------- */

function Bench225Play({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* one shoved piece: a chevron pair knocked back a square */}
          <g className="pnp-shove" style={d(delayMs)}>
            <path d="M12 26 L20 18 L28 26 M12 33 L20 25 L28 33" fill="none" stroke="#e84d5b" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(57,68,92,0.2)" delayMs={delayMs} />
      {/* the bar spans the whole visible board */}
      <Prop left="17%" top="39%" width="66%" height="21%">
        <svg viewBox="0 0 200 64" className="h-full w-full">
          {/* TELL: the loaded bar rattles out of the rack before the descent */}
          <g className="pnp-rattle" style={d(delayMs)}>
          <g className="pnp-benchpress" style={d(delayMs)}>
            {/* bar + collars */}
            <rect x={4} y={29} width={192} height={6} rx={3} fill="#aab6c8" stroke="#5c6880" strokeWidth={1.6} />
            <rect x={38} y={26} width={7} height={12} rx={2} fill="#7c88a4" />
            <rect x={155} y={26} width={7} height={12} rx={2} fill="#7c88a4" />
            {/* two big plates a side, 45s */}
            <g className="pnp-plate-wobble" style={d(delayMs)}>
              <circle cx={26} cy={32} r={22} fill="#39445c" stroke="#232a38" strokeWidth={2.2} />
              <circle cx={26} cy={32} r={7} fill="#5c6880" />
              <text x={26} y={17.5} fontSize={7} fontWeight={800} fill="#c9d6e8" textAnchor="middle">45</text>
              <circle cx={13} cy={32} r={16} fill="#e84d5b" stroke="#8f2231" strokeWidth={2} opacity={0.95} />
            </g>
            <g className="pnp-plate-wobble" style={d(delayMs + 60)}>
              <circle cx={174} cy={32} r={22} fill="#39445c" stroke="#232a38" strokeWidth={2.2} />
              <circle cx={174} cy={32} r={7} fill="#5c6880" />
              <text x={174} y={17.5} fontSize={7} fontWeight={800} fill="#c9d6e8" textAnchor="middle">45</text>
              <circle cx={187} cy={32} r={16} fill="#e84d5b" stroke="#8f2231" strokeWidth={2} opacity={0.95} />
            </g>
          </g>
          </g>
          {/* SETTLE: chalk knocked off the knurling at lockout */}
          <g className="pnp-puff" style={dv(delayMs + 1150, { "--pnp-x": "-14%", "--pnp-y": "-30%" })}>
            <circle cx={62} cy={26} r={4} fill="rgba(232,237,246,0.75)" />
          </g>
          <g className="pnp-puff" style={dv(delayMs + 1240, { "--pnp-x": "16%", "--pnp-y": "-26%" })}>
            <circle cx={138} cy={26} r={3.5} fill="rgba(232,237,246,0.7)" />
          </g>
        </svg>
      </Prop>
      {/* ranks of shoved chevrons driven back by the press */}
      {[
        { left: "30%", top: "30%", dl: 620 },
        { left: "46%", top: "27%", dl: 720 },
        { left: "62%", top: "30%", dl: 820 },
      ].map((p, i) => (
        <Prop key={i} left={p.left} top={p.top} width="8%" height="8%">
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g className="pnp-shove" style={d(delayMs + p.dl)}>
              <path d="M10 26 L20 16 L30 26 M10 34 L20 24 L30 34" fill="none" stroke="#e84d5b" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </Prop>
      ))}
      {/* the plate math, stamped proudly */}
      <Prop left="43%" top="59%" width="14%" height="6%">
        <svg viewBox="0 0 100 24" className="h-full w-full">
          <g className="pnp-rise" style={d(delayMs + 900)}>
            <rect x={18} y={2} width={64} height={18} rx={9} fill="#e84d5b" />
            <text x={50} y={15.4} fontSize={11} fontWeight={900} fill="#fff" textAnchor="middle" style={{ letterSpacing: "1px" }}>225</text>
          </g>
        </svg>
      </Prop>
      <Ring color="rgba(232,77,91,0.85)" delayMs={delayMs + 700} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Monkeytype (t3) — caret, word stream, WPM climbing, keycaps raining     */
/* ------------------------------------------------------------------------- */

function MonkeytypePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-keypress" style={d(delayMs)}>
            <rect x={11} y={16} width={18} height={4} rx={2} fill="#7c88a4" transform="translate(0 12)" />
            <rect x={10} y={12} width={20} height={15} rx={3.5} fill="#e8edf6" stroke="#5c6880" strokeWidth={1.5} />
            <text x={20} y={22.4} fontSize={7.5} fontWeight={800} fill="#39435c" textAnchor="middle">E</text>
          </g>
          <g className="pnp-star" style={d(delayMs + 420)}><SparkStar x={31} y={10} s={0.7} fill="#e8d24d" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Stage inset="-150%">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {/* the test line: a calm dark card, monkeytype-style; the card takes a
            focus breath (two soft pulses) before the first keystroke — the tell */}
        <g className="pnp-linger" style={d(delayMs)}>
          <g className="pnp-focus" style={d(delayMs)}>
            <rect x={10} y={30} width={80} height={34} rx={5} fill="#1c212e" stroke="#39445c" strokeWidth={2} />
            {/* untyped words: dim blanks waiting on the second row */}
            <rect x={18} y={52} width={15} height={4.5} rx={2.2} fill="#3d4a66" />
            <rect x={37} y={52} width={11} height={4.5} rx={2.2} fill="#3d4a66" />
            <rect x={52} y={52} width={17} height={4.5} rx={2.2} fill="#3d4a66" />
            <rect x={73} y={52} width={9} height={4.5} rx={2.2} fill="#3d4a66" />
          </g>
        </g>
        {/* typed words snap in left to right on the live row (after the breath) */}
        <g className="pnp-type" style={d(delayMs + 420)}><rect x={18} y={40} width={13} height={4.5} rx={2.2} fill="#e8d24d" /></g>
        <g className="pnp-type" style={d(delayMs + 590)}><rect x={35} y={40} width={16} height={4.5} rx={2.2} fill="#e8edf6" /></g>
        <g className="pnp-type" style={d(delayMs + 760)}><rect x={55} y={40} width={10} height={4.5} rx={2.2} fill="#e8edf6" /></g>
        <g className="pnp-type" style={d(delayMs + 930)}><rect x={69} y={40} width={13} height={4.5} rx={2.2} fill="#e8d24d" /></g>
        {/* the caret blinks alone through the tell, then rides ahead of the words */}
        <g className="pnp-caret" style={d(delayMs + 120)}>
          <rect x={16.4} y={38.5} width={1.8} height={8} rx={0.9} fill="#e8d24d" />
        </g>
        {/* wpm counter climbing: 72 -> 109 -> 148 */}
        <g className="pnp-linger" style={d(delayMs + 150)}>
          <text x={82} y={25} fontSize={6} fontWeight={700} fill="#8b99b8" textAnchor="end">WPM</text>
        </g>
        <g className="pnp-flash" style={d(delayMs + 540)}><text x={90} y={26} fontSize={8.5} fontWeight={800} fill="#e8d24d" textAnchor="middle">72</text></g>
        <g className="pnp-flash" style={d(delayMs + 940)}><text x={90} y={26} fontSize={8.5} fontWeight={800} fill="#e8d24d" textAnchor="middle">109</text></g>
        <g className="pnp-flash-hold" style={d(delayMs + 1340)}><text x={90} y={26} fontSize={8.5} fontWeight={800} fill="#e8d24d" textAnchor="middle">148</text></g>
        {/* SETTLE: personal-best star winks by the final count */}
        <g className="pnp-star" style={d(delayMs + 1560)}><SparkStar x={80} y={22} s={0.8} fill="#e8d24d" /></g>
        {/* keycaps shaken loose, tumbling down the file */}
        {[
          { x: 22, y: 66, l: "M", r: "26deg", dl: 700 },
          { x: 48, y: 70, l: "K", r: "-20deg", dl: 880 },
          { x: 72, y: 66, l: "T", r: "32deg", dl: 1060 },
        ].map((k, i) => (
          <g key={i} className="pnp-keyfall" style={dv(delayMs + k.dl, { "--pnp-r": k.r })}>
            <rect x={k.x} y={k.y + 1.6} width={11} height={9} rx={2.2} fill="#7c88a4" />
            <rect x={k.x} y={k.y} width={11} height={8.5} rx={2.2} fill="#e8edf6" stroke="#5c6880" strokeWidth={1.1} />
            <text x={k.x + 5.5} y={k.y + 6.2} fontSize={5.4} fontWeight={800} fill="#39435c" textAnchor="middle">{k.l}</text>
          </g>
        ))}
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Rubik's Cube (t5) — the face wrenches a quarter turn, stickers scatter  */
/* ------------------------------------------------------------------------- */

const CUBE_COLS = ["#e6432c", "#ffd23f", "#4fa3d1", "#6abf5f", "#ff9d3d", "#f5f7fb", "#e6432c", "#4fa3d1", "#ffd23f"];

function RubiksCubePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the swap: two stickers cross paths */}
          <g className="pnp-swap" style={dv(delayMs, { "--pnp-x": "150%" })}>
            <rect x={9} y={16} width={8} height={8} rx={1.8} fill="#e6432c" stroke="#232a38" strokeWidth={1.2} />
          </g>
          <g className="pnp-swap" style={dv(delayMs + 60, { "--pnp-x": "-150%" })}>
            <rect x={23} y={16} width={8} height={8} rx={1.8} fill="#4fa3d1" stroke="#232a38" strokeWidth={1.2} />
          </g>
          <g className="pnp-star" style={d(delayMs + 700)}><SparkStar x={20} y={9} s={0.7} fill="#ffd23f" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(35,42,56,0.18)" delayMs={delayMs} />
      <Prop left="31%" top="28%" width="38%" height="38%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* the face: black frame, 3x3 stickers; a frantic scramble-blur
              jitter (the tell) before the face wrenches its quarter turn */}
          <g className="pnp-twist" style={d(delayMs)}>
            <g className="pnp-scramble" style={d(delayMs + 280)}>
              <rect x={18} y={18} width={64} height={64} rx={8} fill="#232a38" stroke="#12161f" strokeWidth={2.4} />
              {CUBE_COLS.map((c, i) => (
                <rect
                  key={i}
                  x={23 + (i % 3) * 18.5}
                  y={23 + Math.floor(i / 3) * 18.5}
                  width={17}
                  height={17}
                  rx={3.2}
                  fill={c}
                />
              ))}
            </g>
          </g>
          {/* the twist rips stickers loose */}
          {[
            { x: "-190%", y: "-120%", r: "220deg", c: "#e6432c", dl: 1190 },
            { x: "170%", y: "-150%", r: "-190deg", c: "#ffd23f", dl: 1240 },
            { x: "-150%", y: "150%", r: "170deg", c: "#6abf5f", dl: 1290 },
            { x: "200%", y: "110%", r: "-240deg", c: "#4fa3d1", dl: 1340 },
            { x: "20%", y: "-200%", r: "200deg", c: "#ff9d3d", dl: 1390 },
          ].map((s, i) => (
            <g key={i} className="pnp-sticker" style={dv(delayMs + s.dl, { "--pnp-x": s.x, "--pnp-y": s.y, "--pnp-r": s.r })}>
              <rect x={45} y={45} width={11} height={11} rx={2.4} fill={s.c} stroke="#232a38" strokeWidth={1.2} />
            </g>
          ))}
          {/* SETTLE: the solved wink over the locked face */}
          <g className="pnp-star" style={d(delayMs + 1420)}><SparkStar x={50} y={12} s={1.2} fill="#ffd23f" /></g>
        </svg>
      </Prop>
      <Ring color="rgba(255,210,63,0.85)" delayMs={delayMs + 1260} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. I Love Whimpering Audios (t8) — the headphone halo charms the board     */
/* ------------------------------------------------------------------------- */

function RibbonWave({ y, color, w = 3.2 }: { y: number; color: string; w?: number }) {
  // one sinuous soundwave ribbon spanning the visible board
  return (
    <path
      d={`M4 ${y} q6 -8 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0`}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
    />
  );
}

function WhimperingAudiosPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the charm lands: a heart and a tiny waveform */}
          <g className="pnp-pop" style={d(delayMs)}>
            <path d="M20 14 c-2.4 -4 -8 -2.4 -8 1.6 c0 3.2 4.4 6 8 8.4 c3.6 -2.4 8 -5.2 8 -8.4 c0 -4 -5.6 -5.6 -8 -1.6 Z" fill="#f2778f" stroke="#b34760" strokeWidth={1.2} strokeLinejoin="round" />
          </g>
          <g className="pnp-rise" style={d(delayMs + 300)}>
            <path d="M11 32 v-3 m4.5 3 v-6 m4.5 6 v-4 m4.5 4 v-7 m4.5 7 v-3" stroke="#c9b0e8" strokeWidth={2} strokeLinecap="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(242,119,143,0.16)" delayMs={delayMs} />
      {/* TELL: a soft charm glow breathes where the halo will settle */}
      <Glow left="40%" top="37%" width="20%" height="18%" color="rgba(242,119,143,0.4)" delayMs={delayMs} />
      {/* soundwave ribbons wash the whole board, layer by layer */}
      <Prop left="21%" top="24%" width="58%" height="52%">
        <svg viewBox="0 0 104 100" className="h-full w-full">
          <g className="pnp-ribbon" style={d(delayMs + 150)}><RibbonWave y={18} color="rgba(242,119,143,0.85)" /></g>
          <g className="pnp-ribbon" style={d(delayMs + 420)}><RibbonWave y={50} color="rgba(201,176,232,0.85)" /></g>
          <g className="pnp-ribbon" style={d(delayMs + 690)}><RibbonWave y={82} color="rgba(255,215,224,0.9)" w={2.6} /></g>
        </svg>
      </Prop>
      {/* the headphone halo descends like a crown */}
      <Prop left="33%" top="29%" width="34%" height="34%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <g className="pnp-halopulse" style={d(delayMs + 550)}>
            <circle cx={50} cy={56} r={34} fill="rgba(242,119,143,0.18)" />
          </g>
          <g className="pnp-halodrop" style={d(delayMs + 200)}>
            {/* headband */}
            <path d="M18 58 a32 32 0 0 1 64 0" fill="none" stroke="#b34760" strokeWidth={6} strokeLinecap="round" />
            <path d="M22 56 a28 28 0 0 1 56 0" fill="none" stroke="#f2a0b4" strokeWidth={2.2} strokeLinecap="round" />
            {/* ear cups */}
            <rect x={10} y={52} width={14} height={22} rx={6.5} fill="#f2778f" stroke="#b34760" strokeWidth={2} />
            <rect x={76} y={52} width={14} height={22} rx={6.5} fill="#f2778f" stroke="#b34760" strokeWidth={2} />
            <rect x={13.4} y={56} width={7} height={14} rx={3.4} fill="#ffd7e0" opacity={0.9} />
            <rect x={79.4} y={56} width={7} height={14} rx={3.4} fill="#ffd7e0" opacity={0.9} />
          </g>
          {/* charmed hearts take one full orbit of the halo */}
          <g className="pnp-orbit" style={d(delayMs + 700)}>
            {[0, 120, 240].map((a) => (
              <g key={a} transform={`rotate(${a} 50 56)`}>
                <path d="M50 16 c-1.8 -3 -6 -1.8 -6 1.2 c0 2.4 3.4 4.6 6 6.4 c2.6 -1.8 6 -4 6 -6.4 c0 -3 -4.2 -4.2 -6 -1.2 Z" fill={a === 120 ? "#c9b0e8" : "#f2778f"} />
              </g>
            ))}
          </g>
          {/* whimper notes escape upward */}
          <g className="pnp-rise" style={d(delayMs + 1000)}>
            <path d="M36 36 v-9 q0 -2.6 2.6 -2.2 l4 0.8 v8" fill="none" stroke="#ffd7e0" strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={34} cy={36.6} r={2.6} fill="#ffd7e0" />
            <circle cx={40.6} cy={34.6} r={2.6} fill="#ffd7e0" />
          </g>
          <g className="pnp-rise" style={d(delayMs + 1250)}>
            <path d="M66 34 v-8" stroke="#f2a0b4" strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={64} cy={34.6} r={2.4} fill="#f2a0b4" />
          </g>
        </svg>
      </Prop>
      <Ring color="rgba(242,119,143,0.85)" delayMs={delayMs + 1500} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. I Love Making Out (t6) — two pieces lean together, kiss-mark confetti   */
/* ------------------------------------------------------------------------- */

function ILoveMakingOutPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-pop" style={d(delayMs)}>
            <g transform="rotate(-12 20 20)"><KissMark x={20} y={20} s={1.5} /></g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,80,110,0.14)" delayMs={delayMs} />
      <Prop left="32%" top="28%" width="36%" height="38%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* the pair: they tip toward each other and touch crowns */}
          <g className="pnp-lean-l" style={d(delayMs)}>
            <Pawn x={34} y={64} s={2.1} fill="#f5f7fb" stroke="#5c6880" />
          </g>
          <g className="pnp-lean-r" style={d(delayMs + 80)}>
            <Pawn x={66} y={64} s={2.1} fill="#39435c" stroke="#1c212e" />
          </g>
          {/* the meet: kiss-mark confetti bursts from the point of contact */}
          {[
            { x: "-180%", y: "-90%", r: "24deg", s: 1, dl: 1020 },
            { x: "160%", y: "-130%", r: "-30deg", s: 0.85, dl: 1070 },
            { x: "-120%", y: "-190%", r: "18deg", s: 0.75, dl: 1120 },
            { x: "200%", y: "-40%", r: "-16deg", s: 0.9, dl: 1170 },
            { x: "-220%", y: "10%", r: "30deg", s: 0.7, dl: 1220 },
            { x: "90%", y: "-220%", r: "-24deg", s: 0.8, dl: 1270 },
          ].map((k, i) => (
            <g key={i} className="pnp-kissfetti" style={dv(delayMs + k.dl, { "--pnp-x": k.x, "--pnp-y": k.y, "--pnp-r": k.r })}>
              <KissMark x={50} y={38} s={k.s} fill={i % 2 ? "#ffb3c1" : "#e8506e"} />
            </g>
          ))}
          {/* one big heart floats off the couple */}
          <g className="pnp-rise" style={d(delayMs + 1150)}>
            <path d="M50 26 c-2.8 -4.6 -9.2 -2.8 -9.2 1.8 c0 3.8 5.2 7 9.2 9.8 c4 -2.8 9.2 -6 9.2 -9.8 c0 -4.6 -6.4 -6.4 -9.2 -1.8 Z" fill="#e8506e" stroke="#b33450" strokeWidth={1.4} strokeLinejoin="round" />
          </g>
        </svg>
      </Prop>
      <Ring color="rgba(255,179,193,0.9)" delayMs={delayMs + 1250} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Hyein (t5) — the maknae's stride: growing footsteps up the board        */
/* ------------------------------------------------------------------------- */

function Footprints({ s = 1 }: { s?: number }) {
  // a landed step: two small soles angled mid-stride
  return (
    <g transform={`scale(${s})`}>
      <g transform="rotate(-14)">
        <ellipse cx={-5} cy={0} rx={3} ry={5.2} fill="#5fae52" />
        <ellipse cx={-5} cy={-6.4} rx={2} ry={1.6} fill="#5fae52" />
      </g>
      <g transform="rotate(10)">
        <ellipse cx={5} cy={-2} rx={3} ry={5.2} fill="#7fd68a" />
        <ellipse cx={5} cy={-8.4} rx={2} ry={1.6} fill="#7fd68a" />
      </g>
    </g>
  );
}

function HyeinPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-foot" style={d(delayMs)}>
            <g transform="translate(20 22)"><Footprints s={1.15} /></g>
          </g>
          <g className="pnp-star" style={d(delayMs + 450)}><SparkStar x={30} y={10} s={0.7} fill="#a8e063" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a spring-green ellipse along her diagonal, smaller than her
          silhouette (no rectangular washes behind portraits — brief §3) */}
      <Glow left="39%" top="36%" width="22%" height="22%" color="rgba(127,214,138,0.32)" delayMs={delayMs + 300} />
      {/* TELL: the first two footsteps land before she's even in frame —
          someone BIG is coming — then the trail keeps growing under her */}
      {[
        { left: "30.5%", top: "62%", s: 0.55, dl: 0 },
        { left: "37%", top: "55%", s: 0.75, dl: 200 },
        { left: "45%", top: "46%", s: 1.0, dl: 640 },
        { left: "53%", top: "37%", s: 1.3, dl: 900 },
        { left: "61%", top: "29%", s: 1.65, dl: 1160 },
      ].map((f, i) => (
        <Prop key={i} left={f.left} top={f.top} width="8%" height="8%">
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g className="pnp-foot" style={d(delayMs + f.dl)}>
              <g transform="translate(20 20)"><Footprints s={f.s * 1.5} /></g>
            </g>
          </svg>
        </Prop>
      ))}
      {/* two stride after-images ghost in behind her along the diagonal */}
      <Prop left="30%" top="42%" width="28%" height="31%">
        <span className="pnp-ghost block h-full w-full" style={dv(delayMs + 640, { "--pnp-x": "-14%", "--pnp-y": "12%" })}>
          <Portrait src="/newjeans/hyein.svg" />
        </span>
      </Prop>
      <Prop left="32.5%" top="37%" width="30%" height="33%">
        <span className="pnp-ghost block h-full w-full" style={dv(delayMs + 740, { "--pnp-x": "-10%", "--pnp-y": "9%" })}>
          <Portrait src="/newjeans/hyein.svg" />
        </span>
      </Prop>
      {/* Hyein herself strides the same diagonal (public portrait asset),
          board-dominating: ~32% of the 14x14 canvas is ~56% of the board */}
      <Prop left="34%" top="30%" width="32%" height="36%" className="pnp-stride" style={d(delayMs + 420)}>
        <Portrait src="/newjeans/hyein.svg" />
      </Prop>
      {/* SETTLE: spring-green sparkles kicked up by the stride */}
      <Prop left="34%" top="52%" width="6%" height="6%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 900)}><SparkStar x={10} y={10} s={0.9} fill="#a8e063" /></g>
        </svg>
      </Prop>
      <Prop left="56%" top="32%" width="6%" height="6%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 1400)}><SparkStar x={10} y={10} s={1.1} fill="#7fd68a" /></g>
        </svg>
      </Prop>
      <Ring color="rgba(168,224,99,0.85)" delayMs={delayMs + 1500} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. Daniel Caesar (t4) — smooth blue soundwaves; the fight just leaves them */
/* ------------------------------------------------------------------------- */

function MuteBadge({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <circle r={9} fill="#1c2c52" stroke="#4a7fd6" strokeWidth={1.6} />
      <path d="M-4.6 -1.6 h2.6 l3.4 -3.2 v9.6 l-3.4 -3.2 h-2.6 Z" fill="#9fc4ff" strokeLinejoin="round" />
      <path d="M-5.4 5.4 L5.4 -5.4" stroke="#e86a7a" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function DanielCaesarPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-driftdown" style={dv(delayMs, { "--pnp-r": "-12deg" })}>
            <g transform="translate(20 14)"><MuteBadge s={0.9} /></g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(28,44,82,0.22)" delayMs={delayMs} />
      {/* silk soundwaves glide over the whole board — only AFTER the needle */}
      <Prop left="21%" top="30%" width="58%" height="40%">
        <svg viewBox="0 0 104 80" className="h-full w-full">
          <g className="pnp-smoothwave" style={d(delayMs + 520)}>
            <path d="M2 16 q13 -12 26 0 t26 0 t26 0 t26 0" fill="none" stroke="rgba(74,127,214,0.9)" strokeWidth={3.6} strokeLinecap="round" />
          </g>
          <g className="pnp-smoothwave" style={d(delayMs + 760)}>
            <path d="M2 40 q13 -10 26 0 t26 0 t26 0 t26 0" fill="none" stroke="rgba(159,196,255,0.85)" strokeWidth={2.8} strokeLinecap="round" />
          </g>
          <g className="pnp-smoothwave" style={d(delayMs + 1000)}>
            <path d="M2 64 q13 -12 26 0 t26 0 t26 0 t26 0" fill="none" stroke="rgba(103,155,235,0.75)" strokeWidth={3.2} strokeLinecap="round" />
          </g>
        </svg>
      </Prop>
      {/* TELL: the record spins up and the tonearm drops onto the groove */}
      <Prop left="28%" top="32%" width="16%" height="16%">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-spin" style={d(delayMs)}>
            <circle cx={20} cy={20} r={15} fill="#12182a" stroke="#4a7fd6" strokeWidth={1.8} />
            <circle cx={20} cy={20} r={9.5} fill="none" stroke="#2c3e6b" strokeWidth={1} />
            <circle cx={20} cy={20} r={4.6} fill="#4a7fd6" />
            <circle cx={20} cy={12.4} r={1.3} fill="#9fc4ff" />
          </g>
          <g className="pnp-needledrop" style={d(delayMs + 180)}>
            <path d="M36.5 4.5 L27 15.5" stroke="#9fc4ff" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx={36.5} cy={4.5} r={1.9} fill="#4a7fd6" />
            <path d="M27 15.5 l-1.6 2.4" stroke="#9fc4ff" strokeWidth={2.6} strokeLinecap="round" />
          </g>
        </svg>
      </Prop>
      {/* SETTLE: the low blue afterglow of a room gone quiet */}
      <Glow left="41%" top="40%" width="18%" height="16%" color="rgba(74,127,214,0.35)" delayMs={delayMs + 1250} />
      {/* mute badges drift down: nobody swings for 3 turns */}
      {[
        { left: "48%", top: "36%", r: "-14deg", s: 1, dl: 780 },
        { left: "60%", top: "40%", r: "10deg", s: 0.8, dl: 980 },
        { left: "54%", top: "33%", r: "-8deg", s: 0.65, dl: 1180 },
      ].map((m, i) => (
        <Prop key={i} left={m.left} top={m.top} width="8%" height="8%">
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g className="pnp-driftdown" style={dv(delayMs + m.dl, { "--pnp-r": m.r })}>
              <g transform="translate(20 12)"><MuteBadge s={m.s * 1.3} /></g>
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(159,196,255,0.8)" delayMs={delayMs + 1350} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 9. Middle Part (t5) — a golden comb draws the part; both halves shimmer    */
/* ------------------------------------------------------------------------- */

function MiddlePartPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the mirror seam + the copy shimmering in back-to-back */}
          <g className="pnp-partline" style={d(delayMs)}>
            <rect x={19} y={6} width={2} height={28} rx={1} fill="#ffd76a" />
          </g>
          <g className="pnp-pop" style={d(delayMs + 260)}>
            <g transform="translate(-6 0)"><Pawn x={20} y={22} s={0.9} fill="#fff2c9" stroke="#c9931d" /></g>
            {/* the copy, file-reflected across the seam (mirror of x=14 about x=20) */}
            <g transform="translate(46 0) scale(-1 1)">
              <Pawn x={20} y={22} s={0.9} fill="#fff2c9" stroke="#c9931d" />
            </g>
          </g>
          <g className="pnp-star" style={d(delayMs + 650)}><SparkStar x={20} y={8} s={0.7} /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(255,215,106,0.12)" delayMs={delayMs} />
      {/* the part: a gold seam revealed straight down the center file */}
      <Prop left="49.4%" top="24%" width="1.2%" height="52%">
        <span className="pnp-partline absolute inset-0 block rounded-full" style={{ background: "linear-gradient(180deg, #fff2c9, #ffd76a 30%, #e8b04b)", ...d(delayMs + 150) }} />
      </Prop>
      {/* TELL: the comb glints at the crown before it draws */}
      <Prop left="50.5%" top="21%" width="5%" height="5%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 60)}><SparkStar x={10} y={10} s={1} fill="#fff2c9" /></g>
        </svg>
      </Prop>
      {/* the comb travels the seam, drawing it */}
      <Prop left="46.5%" top="22%" width="7%" height="16%" className="pnp-comb" style={d(delayMs + 100)}>
        <svg viewBox="0 0 30 70" className="h-full w-full">
          {/* spine + teeth pointing down the line of travel */}
          <rect x={9} y={4} width={12} height={34} rx={5} fill="#ffd76a" stroke="#a8821c" strokeWidth={1.8} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={10.4 + i * 2.6} y={38} width={1.7} height={16} rx={0.85} fill="#e8b04b" stroke="#a8821c" strokeWidth={0.6} />
          ))}
          <circle cx={15} cy={12} r={2.2} fill="#fff2c9" opacity={0.9} />
        </svg>
      </Prop>
      {/* symmetric sheen sweeps each half outward from the part */}
      <Prop left="42%" top="26%" width="7%" height="48%">
        <span className="pnp-shimmer absolute inset-0 block" style={{ background: "linear-gradient(90deg, transparent, rgba(255,242,201,0.55), transparent)", ...dv(delayMs + 450, { "--pnp-x": "-260%" }) }} />
      </Prop>
      <Prop left="51%" top="26%" width="7%" height="48%">
        <span className="pnp-shimmer absolute inset-0 block" style={{ background: "linear-gradient(90deg, transparent, rgba(255,242,201,0.55), transparent)", ...dv(delayMs + 450, { "--pnp-x": "260%" }) }} />
      </Prop>
      {/* mirrored sparkles land on twin squares, perfectly symmetric */}
      {[
        { l: "38%", t: "36%", dl: 800 },
        { l: "60%", t: "36%", dl: 800 },
        { l: "42%", t: "58%", dl: 1000 },
        { l: "56%", t: "58%", dl: 1000 },
      ].map((p, i) => (
        <Prop key={i} left={p.l} top={p.t} width="5%" height="5%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="pnp-star" style={d(delayMs + p.dl)}><SparkStar x={10} y={10} s={0.9} /></g>
          </svg>
        </Prop>
      ))}
      {/* SETTLE: loose gold dust drifts down off the fresh part */}
      {[
        { l: "48%", t: "34%", dl: 1200 },
        { l: "51.4%", t: "44%", dl: 1320 },
      ].map((s, i) => (
        <Prop key={"gd" + i} left={s.l} top={s.t} width="2.4%" height="4%">
          <svg viewBox="0 0 10 14" className="h-full w-full">
            <g className="pnp-speck" style={d(delayMs + s.dl)}>
              <circle cx={5} cy={5} r={1.9} fill="rgba(255,215,106,0.9)" />
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(255,215,106,0.85)" delayMs={delayMs + 1100} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 10. Forearm Veins (t4) — veins of light surge up the files, grip-crush     */
/* ------------------------------------------------------------------------- */

function VeinStreak({ color = "#ff8a7a" }: { color?: string }) {
  // a vertical vein with two small branches, drawn once, surged via transform
  return (
    <g>
      <path d="M10 64 q-2 -12 1 -22 q3 -10 -1 -20 q-2 -8 1 -16" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M10.5 40 q5 -3 7 -9 M9.5 22 q-5 -3 -6.5 -9" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

function ForearmVeinsPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-vein" style={d(delayMs)}>
            <g transform="translate(10 -12) scale(0.62)"><VeinStreak /></g>
          </g>
          <g className="pnp-ring absolute" style={d(delayMs + 350)}>
            <circle cx={20} cy={20} r={12} fill="none" stroke="#d6234f" strokeWidth={2.4} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(214,35,79,0.13)" delayMs={delayMs} />
      {/* veins of light surge straight up five files — AFTER the clench tell */}
      {[
        { left: "27%", top: "30%", dl: 480, c: "#ff8a7a" },
        { left: "38%", top: "28%", dl: 620, c: "#d6234f" },
        { left: "49%", top: "26%", dl: 760, c: "#ff8a7a" },
        { left: "60%", top: "28%", dl: 900, c: "#d6234f" },
        { left: "71%", top: "30%", dl: 1040, c: "#ff8a7a" },
      ].map((v, i) => (
        <Prop key={i} left={v.left} top={v.top} width="6%" height="40%">
          <svg viewBox="0 0 20 70" className="h-full w-full">
            <g className="pnp-vein" style={d(delayMs + v.dl)}>
              <VeinStreak color={v.c} />
            </g>
          </svg>
        </Prop>
      ))}
      {/* TELL then STRIKE: the fist arrives first, gives two testing squeezes
          (the pnp-grip keyframe carries both pulses), then the crush lands */}
      <Prop left="39%" top="37%" width="22%" height="22%">
        <svg viewBox="0 0 60 60" className="h-full w-full">
          <g className="pnp-grip" style={d(delayMs + 60)}>
            {/* forearm */}
            <path d="M26 56 q-3 -12 1 -20 l14 3 q2 9 -1 17 Z" fill="#e8b08f" stroke="#8f5a3a" strokeWidth={1.8} strokeLinejoin="round" />
            {/* fist: knuckle block + thumb wrap */}
            <rect x={20} y={20} width={24} height={18} rx={7} fill="#e8b08f" stroke="#8f5a3a" strokeWidth={1.8} />
            <path d="M22 30 q-5 1 -4 6 q4 3 8 0" fill="#e8b08f" stroke="#8f5a3a" strokeWidth={1.6} strokeLinejoin="round" />
            <path d="M26 20 v6 m6 -6 v6 m6 -6 v6" stroke="#8f5a3a" strokeWidth={1.4} strokeLinecap="round" />
            {/* the vein on the forearm itself */}
            <path d="M30 52 q-1.6 -6 0.8 -12" fill="none" stroke="#d6234f" strokeWidth={1.8} strokeLinecap="round" />
          </g>
          <g className="pnp-star" style={d(delayMs + 1400)}><SparkStar x={48} y={14} s={1} fill="#ff8a7a" /></g>
        </svg>
      </Prop>
      {/* SETTLE: the pump's crimson afterglow lingers over the crush */}
      <Glow left="42%" top="41%" width="16%" height="14%" color="rgba(214,35,79,0.35)" delayMs={delayMs + 1300} />
      <Ring color="rgba(214,35,79,0.85)" delayMs={delayMs + 1450} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 11. Minji (leader) — the guardian descends, shield panes snap in           */
/* ------------------------------------------------------------------------- */

function HexPane({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 44" className="h-full w-full">
      <polygon points="20,2 37,12 37,32 20,42 3,32 3,12" fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <polygon points="20,9 31,15.5 31,28.5 20,35 9,28.5 9,15.5" fill={color} opacity={0.22} />
    </svg>
  );
}

function MinjiPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-pane" style={d(delayMs)}>
            <polygon points="20,5 33,12.5 33,27.5 20,35 7,27.5 7,12.5" fill="rgba(90,127,214,0.25)" stroke="#5a7fd6" strokeWidth={2.6} strokeLinejoin="round" />
          </g>
          <g className="pnp-star" style={d(delayMs + 420)}><SparkStar x={30} y={9} s={0.8} fill="#9fc4ff" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a cool blue ellipse behind her, smaller than her silhouette
          (no rectangular washes behind portraits — brief §3) */}
      <Glow left="39%" top="34%" width="22%" height="24%" color="rgba(90,127,214,0.35)" delayMs={delayMs + 160} />
      {/* the ground shadow she rises out of */}
      <GroundShadow left="41%" top="60.8%" width="18%" delayMs={delayMs} />
      {/* the leader RISES into frame, board-dominating (~32% canvas = ~56% board) */}
      <Prop left="34%" top="29%" width="32%" height="34%" className="pnp-heroup" style={d(delayMs + 80)}>
        <Portrait src="/newjeans/minji.svg" />
      </Prop>
      {/* signature beat: three pairs of shield panes CLAMP SHUT in sequence
          (top guard, mid guard, low guard), each meeting on a seam flash */}
      {[
        { left: "31%", top: "33%", x: "-170%", dl: 560 },
        { left: "61%", top: "33%", x: "170%", dl: 560 },
        { left: "29%", top: "44.5%", x: "-190%", dl: 760 },
        { left: "63%", top: "44.5%", x: "190%", dl: 760 },
        { left: "31%", top: "56%", x: "-170%", dl: 960 },
        { left: "61%", top: "56%", x: "170%", dl: 960 },
      ].map((p, i) => (
        <Prop key={i} left={p.left} top={p.top} width="8%" height="9%" className="pnp-clamp" style={dv(delayMs + p.dl, { "--pnp-x": p.x })}>
          <HexPane color={i % 2 ? "#9fc4ff" : "#5a7fd6"} />
        </Prop>
      ))}
      {/* the seam flash where each pair slams shut */}
      {[
        { top: "33.5%", dl: 940 },
        { top: "45%", dl: 1140 },
        { top: "56.5%", dl: 1340 },
      ].map((s, i) => (
        <Prop key={"seam" + i} left="49.6%" top={s.top} width="0.8%" height="8%">
          <span
            className="pnp-seamflash absolute inset-0 block rounded-full"
            style={{ background: "linear-gradient(180deg, transparent, rgba(233,242,255,0.98), transparent)", ...d(delayMs + s.dl) }}
          />
        </Prop>
      ))}
      {/* the picket of light along the home ranks */}
      {[30, 40.5, 51, 61.5].map((l, i) => (
        <Prop key={i} left={`${l}%`} top="63%" width="2%" height="9%">
          <span className="pnp-partline absolute inset-0 block rounded-full" style={{ background: "linear-gradient(180deg, rgba(233,242,255,0.95), rgba(90,127,214,0.6))", ...d(delayMs + 760 + i * 90) }} />
        </Prop>
      ))}
      <Ring color="rgba(159,196,255,0.9)" delayMs={delayMs + 1450} />
      <Ring color="rgba(90,127,214,0.75)" delayMs={delayMs + 1600} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 12. Hanni (frost charm) — crystal bloom behind her, butterflies rise       */
/* ------------------------------------------------------------------------- */

function FrostArm({ color }: { color: string }) {
  return (
    <g>
      <path d="M0 0 v-34 M0 -12 l-7 -7 M0 -12 l7 -7 M0 -23 l-5 -5 M0 -23 l5 -5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
}

function HanniPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-pane" style={d(delayMs)}>
            <path d="M20 6 v28 M8 13 l24 14 M32 13 l-24 14" stroke="#bfe6a8" strokeWidth={2.8} strokeLinecap="round" />
          </g>
          <g className="pnp-star" style={d(delayMs + 430)}><SparkStar x={31} y={10} s={0.8} fill="#e8f7d8" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a pale green ellipse behind her, smaller than her silhouette
          (no rectangular washes behind portraits — brief §3) */}
      <Glow left="39.5%" top="35%" width="21%" height="23%" color="rgba(191,230,168,0.35)" delayMs={delayMs + 160} />
      {/* the ground shadow she rises out of */}
      <GroundShadow left="41.5%" top="60.4%" width="17%" delayMs={delayMs} />
      {/* signature beat: the crystal bloom GROWS arm by arm behind her, each
          spar shooting out from the core in sequence */}
      <Prop left="30%" top="26%" width="40%" height="40%">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <g className="pnp-pop" style={d(delayMs + 360)}>
            <circle cx={50} cy={50} r={6} fill="rgba(232,247,216,0.9)" />
          </g>
          {[0, 60, 120, 180, 240, 300].map((a, i) => (
            <g key={a} transform={`translate(50 50) rotate(${a})`}>
              <g className="pnp-frostgrow" style={d(delayMs + 460 + i * 110)}>
                <FrostArm color={a % 120 ? "rgba(191,230,168,0.9)" : "rgba(232,247,216,0.95)"} />
              </g>
            </g>
          ))}
        </svg>
      </Prop>
      {/* Hanni RISES front and center, board-dominating */}
      <Prop left="34.5%" top="30%" width="31%" height="33%" className="pnp-heroup" style={d(delayMs + 60)}>
        <Portrait src="/newjeans/hanni.svg" />
      </Prop>
      {/* her butterflies loop lazy figure-8s as they climb away */}
      {[
        { l: "31%", t: "42%", dl: 760, f: "#f2e27a" },
        { l: "64%", t: "36%", dl: 960, f: "#bfe6a8" },
        { l: "58%", t: "56%", dl: 1160, f: "#f2e27a" },
      ].map((b, i) => (
        <Prop key={i} left={b.l} top={b.t} width="5%" height="5%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="pnp-fig8" style={d(delayMs + b.dl)}>
              <path d="M10 10 q-6 -7 -8 -1 q-1 5 8 3 q9 2 8 -3 q-2 -6 -8 1 Z" fill={b.f} stroke="#7a8a4a" strokeWidth={0.8} strokeLinejoin="round" />
              <path d="M10 8.5 v4" stroke="#5a4632" strokeWidth={1.2} strokeLinecap="round" />
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(191,230,168,0.9)" delayMs={delayMs + 1400} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 13. Danielle (sunshine) — dawn rays fan out, parachute pawns drift in      */
/* ------------------------------------------------------------------------- */

function DaniellePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="pnp-driftdown" style={dv(delayMs, { "--pnp-r": "-8deg" })}>
            <path d="M11 12 a9 9 0 0 1 18 0 Z" fill="#f6cf9d" stroke="#c98d4b" strokeWidth={1.4} />
            <path d="M12 12 L18 22 M28 12 L22 22" stroke="#c98d4b" strokeWidth={1.1} />
            <Pawn x={20} y={27} s={0.75} fill="#fdf3dd" stroke="#c98d4b" />
          </g>
          <g className="pnp-star" style={d(delayMs + 500)}><SparkStar x={31} y={9} s={0.8} fill="#ffd76a" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a warm dawn ellipse behind her, smaller than her silhouette
          (no rectangular washes behind portraits — brief §3) */}
      <Glow left="39%" top="34%" width="22%" height="24%" color="rgba(255,215,106,0.35)" delayMs={delayMs + 160} />
      {/* the ground shadow she rises out of */}
      <GroundShadow left="41%" top="60.8%" width="18%" delayMs={delayMs} />
      {/* signature beat: ONE lighthouse beam sweeps the dawn across the board,
          pivoting from behind her crown, left horizon to right */}
      <Prop left="48.4%" top="17%" width="3.2%" height="38%" className="pnp-lighthouse" style={d(delayMs + 260)}>
        <span
          className="absolute inset-0 block rounded-full"
          style={{ background: "linear-gradient(0deg, rgba(255,215,106,0.75), rgba(255,242,201,0.85) 55%, transparent)" }}
        />
      </Prop>
      {/* the dawn the beam leaves behind: two soft residual rays */}
      {[-22, 22].map((a, i) => (
        <Prop key={"ray" + i} left="48.75%" top="20%" width="2.5%" height="36%" style={{ transform: `rotate(${a}deg)`, transformOrigin: "50% 95%" }}>
          <span className="pnp-ray absolute inset-0 block rounded-full" style={{ background: "linear-gradient(0deg, transparent, rgba(255,215,106,0.45), rgba(255,242,201,0.65))", ...d(delayMs + 1050 + i * 120) }} />
        </Prop>
      ))}
      {/* Danielle RISES, beaming at board scale */}
      <Prop left="34%" top="30%" width="32%" height="34%" className="pnp-heroup" style={d(delayMs + 80)}>
        <Portrait src="/newjeans/danielle.svg" />
      </Prop>
      {/* her reinforcements parachute down the files */}
      {[
        { l: "27%", t: "30%", r: "-10deg", dl: 620 },
        { l: "67%", t: "26%", r: "8deg", dl: 780 },
        { l: "63%", t: "52%", r: "-6deg", dl: 940 },
        { l: "30%", t: "54%", r: "10deg", dl: 1100 },
      ].map((p, i) => (
        <Prop key={i} left={p.l} top={p.t} width="7%" height="8%">
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g className="pnp-driftdown" style={dv(delayMs + p.dl, { "--pnp-r": p.r })}>
              <path d="M9 12 a11 11 0 0 1 22 0 Z" fill="#f6cf9d" stroke="#c98d4b" strokeWidth={1.6} />
              <path d="M10 12 L17 24 M30 12 L23 24" stroke="#c98d4b" strokeWidth={1.2} />
              <Pawn x={20} y={30} s={0.9} fill="#fdf3dd" stroke="#c98d4b" />
            </g>
          </svg>
        </Prop>
      ))}
      <Ring color="rgba(255,215,106,0.9)" delayMs={delayMs + 1250} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 14. Haerin (the cat) — ink slashes rake the board, she pounces through     */
/* ------------------------------------------------------------------------- */

function HaerinPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the claw swipe: three quick raking lines */}
          <g className="pnp-slashsweep" style={d(delayMs)}>
            <path d="M9 10 L31 24" stroke="#eceff1" strokeWidth={3} strokeLinecap="round" />
          </g>
          <g className="pnp-slashsweep" style={d(delayMs + 110)}>
            <path d="M8 17 L32 31" stroke="#c5ccd3" strokeWidth={3} strokeLinecap="round" />
          </g>
          <g className="pnp-slashsweep" style={d(delayMs + 220)}>
            <path d="M7 24 L29 37" stroke="#8b95a0" strokeWidth={3} strokeLinecap="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a moody elliptical night pool under the hunt — radial, never
          a rectangular wash (brief §3) */}
      <Glow left="34%" top="34%" width="32%" height="30%" color="rgba(18,20,25,0.45)" delayMs={delayMs} />
      {/* signature beat: she CROUCHES first (butt-wiggle coil, in the pounce
          keyframe), and the claw streaks rip open in her wake as she passes */}
      {[
        { top: "54%", dl: 820 },
        { top: "42%", dl: 940 },
        { top: "30%", dl: 1060 },
      ].map((s, i) => (
        <Prop key={i} left="22%" top={s.top} width="56%" height="2.4%" style={{ transform: "rotate(-16deg)", transformOrigin: "50% 50%" }}>
          <span className="pnp-slashsweep absolute inset-0 block rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(236,239,241,0.95), transparent)", ...d(delayMs + s.dl) }} />
        </Prop>
      ))}
      {/* two pounce after-images ghost along the arc behind her */}
      <Prop left="31%" top="37%" width="28%" height="30%">
        <span className="pnp-ghost block h-full w-full" style={dv(delayMs + 720, { "--pnp-x": "-13%", "--pnp-y": "10%" })}>
          <Portrait src="/newjeans/haerin.svg" />
        </span>
      </Prop>
      <Prop left="35%" top="32%" width="29%" height="31%">
        <span className="pnp-ghost block h-full w-full" style={dv(delayMs + 810, { "--pnp-x": "-9%", "--pnp-y": "7%" })}>
          <Portrait src="/newjeans/haerin.svg" />
        </span>
      </Prop>
      {/* Haerin steps in low, coils, then pounces clean across the board */}
      <Prop left="35%" top="30%" width="30%" height="32%" className="pnp-pounce" style={d(delayMs + 60)}>
        <Portrait src="/newjeans/haerin.svg" />
      </Prop>
      {/* paw prints land where she passed */}
      {[
        { l: "33%", t: "58%", s: 0.9, dl: 900 },
        { l: "47%", t: "48%", s: 1.1, dl: 1060 },
        { l: "61%", t: "38%", s: 1.3, dl: 1220 },
      ].map((p, i) => (
        <Prop key={i} left={p.l} top={p.t} width="6%" height="6%">
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g className="pnp-foot" style={d(delayMs + p.dl)}>
              <g transform={`translate(20 22) scale(${p.s})`}>
                <ellipse cx={0} cy={2} rx={6} ry={5} fill="#eceff1" />
                <circle cx={-6.5} cy={-5} r={2.4} fill="#eceff1" />
                <circle cx={-2} cy={-7.5} r={2.4} fill="#eceff1" />
                <circle cx={2.8} cy={-7.5} r={2.4} fill="#eceff1" />
                <circle cx={7} cy={-5} r={2.4} fill="#eceff1" />
              </g>
            </g>
          </svg>
        </Prop>
      ))}
      {/* SETTLE: a whisker glint where she vanished */}
      <Prop left="63%" top="34%" width="5%" height="5%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 1500)}><SparkStar x={10} y={10} s={1} fill="#eceff1" /></g>
        </svg>
      </Prop>
      <Ring color="rgba(236,239,241,0.85)" delayMs={delayMs + 1450} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 15. I Love Cami (t6) — Cami arrives; a rank+file cross-sweep of light      */
/* ------------------------------------------------------------------------- */

function ILoveCamPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          {/* the cross of light snaps over the swept square */}
          <g className="pnp-pane" style={d(delayMs)}>
            <path d="M20 5 V35 M5 20 H35" stroke="#ff8fb1" strokeWidth={3.4} strokeLinecap="round" />
          </g>
          <g className="pnp-rise" style={d(delayMs + 320)}>
            <path d="M20 16 c-2 -3.4 -6.8 -2 -6.8 1.4 c0 2.7 3.7 5 6.8 7 c3.1 -2 6.8 -4.3 6.8 -7 c0 -3.4 -4.8 -4.8 -6.8 -1.4 Z" fill="#ff8fb1" stroke="#c2557d" strokeWidth={1.1} strokeLinejoin="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* ambient: a pink ellipse behind her, smaller than her silhouette
          (portraits are free-standing characters — brief §3) */}
      <Glow left="40%" top="34%" width="20%" height="26%" color="rgba(255,143,177,0.35)" delayMs={delayMs + 160} />
      {/* the ground shadow she rises out of */}
      <GroundShadow left="42%" top="65%" width="16%" delayMs={delayMs} />
      {/* TELL: the cross point winks before the blades fire */}
      <Prop left="47.5%" top="45%" width="5%" height="5%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 80)}><SparkStar x={10} y={10} s={0.9} fill="#ffd6e7" /></g>
        </svg>
      </Prop>
      {/* the FILE sweep: a vertical blade of light crosses every rank */}
      <Prop left="47%" top="21.5%" width="6%" height="57%">
        <span className="pnp-sweepx absolute inset-0 block rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,214,231,0.95), rgba(255,143,177,0.7), transparent)", ...d(delayMs + 350) }} />
      </Prop>
      {/* the RANK sweep: a horizontal blade crosses every file */}
      <Prop left="21.5%" top="47%" width="57%" height="6%">
        <span className="pnp-sweepy absolute inset-0 block rounded-full" style={{ background: "linear-gradient(180deg, transparent, rgba(255,242,201,0.95), rgba(255,199,106,0.7), transparent)", ...d(delayMs + 650) }} />
      </Prop>
      {/* Cami herself RISES — the anime companion, board-dominating */}
      <Prop left="35.5%" top="26%" width="29%" height="42%" className="pnp-heroup" style={d(delayMs + 60)}>
        <Portrait src="/companions/cami.svg" />
      </Prop>
      {/* charm hearts burst off the cross point */}
      {[
        { x: "-190%", y: "-110%", r: "22deg", s: 1, dl: 950 },
        { x: "180%", y: "-140%", r: "-26deg", s: 0.85, dl: 1010 },
        { x: "-140%", y: "150%", r: "18deg", s: 0.8, dl: 1070 },
        { x: "200%", y: "100%", r: "-18deg", s: 0.9, dl: 1130 },
      ].map((k, i) => (
        <Prop key={i} left="47%" top="44%" width="6%" height="6%">
          <svg viewBox="0 0 20 20" className="h-full w-full">
            <g className="pnp-kissfetti" style={dv(delayMs + k.dl, { "--pnp-x": k.x, "--pnp-y": k.y, "--pnp-r": k.r })}>
              <path transform={`translate(10 10) scale(${k.s})`} d="M0 -2 c-1.6 -2.8 -5.6 -1.6 -5.6 1.2 c0 2.2 3 4.1 5.6 5.8 c2.6 -1.7 5.6 -3.6 5.6 -5.8 c0 -2.8 -4 -4 -5.6 -1.2 Z" fill={i % 2 ? "#ffd76a" : "#ff8fb1"} />
            </g>
          </svg>
        </Prop>
      ))}
      {/* gold star winks where the sweeps crossed */}
      <Prop left="46.5%" top="46.5%" width="7%" height="7%">
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <g className="pnp-star" style={d(delayMs + 880)}><SparkStar x={10} y={10} s={1.4} fill="#ffd76a" /></g>
        </svg>
      </Prop>
      <Ring color="rgba(255,143,177,0.9)" delayMs={delayMs + 1200} />
      <Ring color="rgba(255,215,106,0.75)" delayMs={delayMs + 1350} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* I Love Chaewon — LE SSERAFIM "Fearless" choreography: a feather drifts down  */
/* and three pieces glide gracefully into a new formation (repositions).       */
/* ------------------------------------------------------------------------- */

/** A single elegant feather, centered on its own origin. */
function Feather({ fill, vein }: { fill: string; vein: string }) {
  return (
    <g>
      <path d="M0 -15 C6 -7 6 7 1 15 C-6 7 -6 -7 0 -15 Z" fill={fill} opacity={0.95} />
      <path d="M0 -13 L0.4 14" stroke={vein} strokeWidth={1} fill="none" />
      {[-10, -6, -2, 2, 6].map((y, i) => (
        <path key={i} d={`M0.3 ${y} L${3.2 - i * 0.2} ${y - 3}`} stroke={vein} strokeWidth={0.6} opacity={0.5} />
      ))}
      {[-10, -6, -2, 2, 6].map((y, i) => (
        <path key={"l" + i} d={`M-0.3 ${y} L${-3.2 + i * 0.2} ${y - 3}`} stroke={vein} strokeWidth={0.6} opacity={0.5} />
      ))}
    </g>
  );
}

function ILoveChaewonPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    // Square-local: a feather settles with a soft sparkle.
    return (
      <Stage inset="14%">
        <span className="pnp-cw-settle absolute inset-0 block" style={d(delayMs)}>
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <g transform="translate(20 20) rotate(18)">
              <Feather fill="#ffd9ea" vein="#c76f9c" />
            </g>
            <g className="pnp-cw-spark" style={d(delayMs + 220)}><SparkStar x={28} y={12} s={0.9} fill="#fff2f6" /></g>
          </svg>
        </span>
      </Stage>
    );
  }
  // Three pieces glide from their old spots to a neat diagonal formation.
  // Each carries a CSS var start-offset (--gx,--gy) that the glide keyframe
  // eases back to zero, so they arrive together at their landing slot.
  const dancers = [
    { left: "40%", top: "52%", gx: "-120%", gy: "38%", delay: 260 },
    { left: "48%", top: "45%", gx: "10%", gy: "80%", delay: 400 },
    { left: "56%", top: "38%", gx: "130%", gy: "34%", delay: 540 },
  ];
  return (
    <Wide>
      <Wash color="rgba(255,157,192,0.16)" delayMs={delayMs} />
      {/* TELL: a soft stage light warms the floor before the feather falls */}
      <Glow left="42%" top="36%" width="16%" height="14%" color="rgba(255,157,192,0.4)" delayMs={delayMs} />
      {/* the hero feather drifts down and sways, trailing grace */}
      <Prop left="45%" top="20%" width="10%" height="16%">
        <svg viewBox="0 0 40 60" className="h-full w-full">
          <g className="pnp-cw-feather" style={d(delayMs)}>
            <g transform="translate(20 18)"><Feather fill="#ffe4f0" vein="#c76f9c" /></g>
          </g>
        </svg>
      </Prop>

      {/* three dancers glide into formation, each leaving a light ribbon */}
      {dancers.map((p, i) => (
        <Prop key={i} left={p.left} top={p.top} width="8%" height="8%">
          <svg viewBox="0 0 28 28" className="h-full w-full">
            <g className="pnp-cw-glide" style={dv(delayMs + p.delay, { "--gx": p.gx, "--gy": p.gy })}>
              <g className="pnp-cw-ribbon" style={d(delayMs + p.delay)}>
                <ellipse cx={14} cy={16} rx={11} ry={3.4} fill="rgba(255,182,214,0.35)" />
              </g>
              <Pawn x={14} y={12} s={0.92} fill="#fff2f6" stroke="#c76f9c" />
            </g>
          </svg>
        </Prop>
      ))}

      {/* the formation locks: three aligned sparkles shimmer into place */}
      <Prop left="38%" top="34%" width="26%" height="24%">
        <svg viewBox="0 0 100 90" className="h-full w-full">
          {[[24, 66], [50, 46], [76, 26]].map(([x, y], i) => (
            <g key={i} className="pnp-cw-lock" style={d(delayMs + 900 + i * 90)}>
              <SparkStar x={x} y={y} s={1.5} fill="#fff2f6" />
            </g>
          ))}
        </svg>
      </Prop>

      {/* drifting feather-down petals for grace */}
      {[
        { x: "-40%", y: "-30%", r: "-24deg", dl: 500 },
        { x: "36%", y: "-46%", r: "20deg", dl: 640 },
        { x: "-10%", y: "-58%", r: "-8deg", dl: 780 },
      ].map((p, i) => (
        <Prop key={"pt" + i} left="47%" top="46%" width="5%" height="7%">
          <svg viewBox="0 0 20 28" className="h-full w-full">
            <g className="pnp-cw-petal" style={dv(delayMs + p.dl, { "--px": p.x, "--py": p.y, "--pr": p.r })}>
              <g transform="translate(10 12) scale(0.5)"><Feather fill="#ffd9ea" vein="#d98cb4" /></g>
            </g>
          </svg>
        </Prop>
      ))}

      <Ring color="rgba(255,157,192,0.9)" delayMs={delayMs + 1160} />
      <Ring color="rgba(255,242,246,0.7)" delayMs={delayMs + 1300} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

// `source` zones name fx zones these cards RELIABLY paint (checked against
// engine/buffs/personal.ts + fxZones.ts): forearm_veins declares
// fx {motif:"empower", pieces:["p"], self} (empower marks on every own pawn),
// hyein declares fx {motif:"rally", pieces:["p"], self} (the rally banner on
// the own king square), and middle_part PLACES a mirror piece (a "summon"
// square). Everything else either moves/binds pieces without painting a zone
// or changes nothing on the board at cast, so those entries ride the
// diff-less board-wide lead path. `sound` keys are all existing SigSoundKeys.
export const PLAYS: Record<string, SigPlugin> = {
  muscle_up: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz" },
    Render: ({ lead, delayMs }) => <AthleteScene id="muscle_up" lead={lead} delayMs={delayMs} />,
  },
  bench_225: {
    config: { ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "colossus" },
    Render: ({ lead, delayMs }) => <AthleteScene id="bench_225" lead={lead} delayMs={delayMs} />,
  },
  // Calisthenics athletes (owner request: show a GUY actually doing the
  // skill). Configs copied from the retired core entries; the athlete SVG
  // loops its own reps via SMIL.
  handstand_pushup: {
    config: { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" },
    Render: HandstandPushupPlay,
  },
  full_planche: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield" },
    Render: FullPlanchePlay,
  },
  fingertip_maltese: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen" },
    Render: FingertipMaltesePlay,
  },
  onearmmuscleupismydream: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "empower" },
    Render: OneArmDreamPlay,
  },
  monkeytype: {
    config: { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz" },
    Render: MonkeytypePlay,
  },
  rubiks_cube: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall" },
    Render: RubiksCubePlay,
  },
  ilovewhimperingaudios: {
    config: { ordering: "radial", staggerMs: 45, victims: ["q", "r", "b", "n"], hasLead: true, sound: "shades" },
    Render: WhimperingAudiosPlay,
  },
  ilovemakingout: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" },
    Render: ILoveMakingOutPlay,
  },
  // I Love Chaewon (t6 movement): repositions up to 3 pieces to empty squares
  // (relocations register as morph/summon flourishes, not a removal diff, and
  // paint no fx zone), so a lead-only config riding the diff-less board-wide
  // lead path. "coronation" is an elegant chime for the graceful choreography.
  ilovechaewon: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" },
    Render: ILoveChaewonPlay,
  },
  // The five members are simple one-shot / passive cards again; each entry's
  // source names the zone its reverted mechanic actually paints (see the
  // header note). Only i_love_cam is still a companion placement (summon).
  hyein: {
    // Permanent pawn-stride grant: fx {motif:"rally", pieces:["p"], self}
    // paints the rally banner zone.
    config: { ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "blitz", source: "rally" },
    Render: HyeinPlay,
  },
  minji: {
    // Linked-arms guard: shields every ally beside the king (shield zone).
    config: { ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "aegis", source: "shield" },
    Render: MinjiPlay,
  },
  hanni: {
    // Spotlight charm: freezes the target and its neighbors (frozen zone).
    config: { ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen" },
    Render: HanniPlay,
  },
  danielle: {
    // Sunshine: places two shielded pawns (summon zone).
    config: { ordering: "sweep", staggerMs: 80, victims: ["p"], hasLead: true, sound: "wall", source: "summon" },
    Render: DaniellePlay,
  },
  haerin: {
    // Pounce: snatches an enemy off the board — a plain removal diff, so no
    // zone source; the lead plays through the piece-diff path.
    config: { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage" },
    Render: HaerinPlay,
  },
  i_love_cam: {
    config: { ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "lightning", source: "summon" },
    Render: ILoveCamPlay,
  },
  daniel_caesar: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" },
    Render: DanielCaesarPlay,
  },
  middle_part: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon" },
    Render: MiddlePartPlay,
  },
  forearm_veins: {
    config: { ordering: "sweep", staggerMs: 45, victims: ["p"], hasLead: true, sound: "coronation", source: "empower" },
    Render: ForearmVeinsPlay,
  },
};
