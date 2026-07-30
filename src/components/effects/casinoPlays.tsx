// Casino plugin signatures (bespoke literal card animations). See
// sigPlugins.tsx for the contract. Self-contained: own SVG, own CSS
// (casinoPlays.css), transform/opacity only. Does NOT import from
// BoardEffects.tsx (cycle hazard) and is NOT registered anywhere here.
//
// Design brief: each animation reads like the real casino game the card is
// named for. Slot Machine spins three reels with staggered stops and a payline
// flash; Roulette settles a ball into a spinning wheel; Blackjack deals and
// flips cards face-up; Scratch Card is scraped off with a coin; Let It Ride
// tosses and tumbles a coin onto a growing chip stack; Loot Box jiggles, hinges
// open, and bursts rarity rays; Poker Bluff fans a hand and shoves the pot all
// in. Prop-comedy realism: chunky silhouettes, clean strokes, satisfying
// easing, leads about 1.5s. Every card registers a lead-only Wide scene plus a
// small square-local flourish; the reduced-motion gate lives in the CSS.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardFrame } from "./stage";
import "./casinoPlays.css";

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
/** Delay plus arbitrary CSS custom properties (reel stops, spin durations). */
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** Square-local stage (small non-lead flourishes). */
function Stage({ children, inset = "0" }: { children: ReactNode; inset?: string }) {
  return (
    <span className="csp pointer-events-none absolute z-20 block" style={{ inset }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for a lead that declares `anchor: "board"`: oversized
 * around the lead square so the skit takes over the whole visible board.
 *
 * Board.tsx re-centres the wrapper on the board for a "board" anchor, so this
 * canvas must NOT correct itself a second time. Cast-anchored leads use
 * `Framed` instead. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="csp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** The same 14-cell composition for a lead that declares `anchor: "cast"`,
 * pinned to the BOARD.
 *
 * Every scene in this module is one table-scale prop (a cabinet, a wheel, a
 * felt arc) authored to fill the crop, so it is a board-scale layer in the
 * sense of the design brief and belongs in a `BoardFrame` rather than at a
 * fixed percentage of the anchored canvas. The canvas is 14 cells and the
 * board is the middle 8, so the art is re-expanded to 175% of the frame and
 * offset -37.5%: that reproduces the pre-anchoring composition EXACTLY while
 * making it independent of which square the card was cast on. The cast square
 * then carries the play's own local beats — see `Spot`. */
function Framed({ children }: { children: ReactNode }) {
  return (
    <span className="csp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="fx-stage absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">
        <BoardFrame>
          <span className="absolute left-[-37.5%] top-[-37.5%] block h-[175%] w-[175%]">{children}</span>
        </BoardFrame>
      </span>
    </span>
  );
}

/** The cast square's own three beats, played at one-cell scale on the square
 * the card was actually played on: a ring inhales (tell), the square flashes
 * as the table pays or takes (strike), and a chip-coloured mote drifts off
 * toward the CASTER's rail (settle).
 *
 * The drift is the directional layer: --fx-side is +1 when the caster's home
 * rank is drawn at the bottom of the screen and -1 when it is at the top, so
 * "toward the player who pulled the lever" is right in both seats. */
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
    <span className="csp pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span
        className="csp-spot-tell absolute block"
        style={{ left: "8%", top: "8%", width: "84%", height: "84%", borderRadius: "50%", border: `2px solid ${glow}`, ...tell }}
      />
      <span
        className="csp-spot-hit absolute inset-0 block"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 62%)`, ...hit }}
      />
      <span
        className="csp-spot-drift absolute block"
        style={{ left: "26%", top: "26%", width: "48%", height: "48%", borderRadius: "50%", background: `radial-gradient(circle, ${tone} 0%, transparent 66%)`, ...settle }}
      />
    </span>
  );
}

/** The entrance cut: the card arriving in a hand. The play's own central prop
 * at ~56% of the crop, riding in from the caster's side, one chip settling
 * after it. No board takeover and no table. */
function Arrival({ delayMs, tone, glow, children }: { delayMs: number; tone: string; glow: string; children: ReactNode }) {
  return (
    <span className="csp pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span
        className="csp-arrive-ring absolute block"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", borderRadius: "50%", border: `2px solid ${glow}`, ...d(delayMs + 40) }}
      />
      <span className="csp-arrive absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", ...d(delayMs + 160) }}>
        <svg viewBox="0 0 100 100" className="h-full w-full">{children}</svg>
      </span>
      <span
        className="csp-spot-drift absolute block"
        style={{ left: "34%", top: "34%", width: "32%", height: "32%", borderRadius: "50%", background: `radial-gradient(circle, ${tone} 0%, transparent 66%)`, ...d(delayMs + 620) }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------------- */
/* Reusable casino props (shared across cards)                                */
/* ------------------------------------------------------------------------- */

/** A stacked poker chip (top ellipse + rim), themed by color. */
function Chip({ cx, cy, r = 6, fill = "#d6234f", edge = "#8a1230" }: { cx: number; cy: number; r?: number; fill?: string; edge?: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx={0} cy={r * 0.42} rx={r} ry={r * 0.42} fill={edge} />
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.42} fill={fill} stroke={edge} strokeWidth={0.5} />
      <ellipse cx={0} cy={0} rx={r * 0.6} ry={r * 0.25} fill="none" stroke="#fff4d6" strokeWidth={0.7} strokeDasharray="1.4 1.2" opacity={0.85} />
    </g>
  );
}

/** A playing card outline (rounded rect + border). */
function CardBack({ w = 16, h = 23 }: { w?: number; h?: number }) {
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2.2} fill="#2c4f9e" stroke="#16264d" strokeWidth={1} />
      <rect x={-w / 2 + 1.6} y={-h / 2 + 1.6} width={w - 3.2} height={h - 3.2} rx={1.6} fill="none" stroke="#7fa0e0" strokeWidth={0.7} strokeDasharray="2 1.6" />
    </>
  );
}

function CardFace({ w = 16, h = 23, pip = "#d6234f", label }: { w?: number; h?: number; pip?: string; label?: string }) {
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2.2} fill="#fdfbf4" stroke="#c9c2ac" strokeWidth={1} />
      {label != null && (
        <text x={-w / 2 + 2.6} y={-h / 2 + 6} fontSize={5.4} fontWeight={800} fill={pip} textAnchor="start">{label}</text>
      )}
      {/* center suit pip (a diamond) */}
      <path d={`M0 ${-4.6} l3.4 4.6 -3.4 4.6 -3.4 -4.6 Z`} fill={pip} />
    </>
  );
}

/** Sparkle star (jackpot / big win). */
function Star({ x, y, s = 1, fill = "#ffd76a" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5 l1.5 3.4 3.7 0.4 -2.8 2.5 0.8 3.6 -3.2 -1.9 -3.2 1.9 0.8 -3.6 -2.8 -2.5 3.7 -0.4 Z"
      fill={fill}
    />
  );
}

/** Winnings pay out TOWARD the bottom edge (the player's side): a small
 * fountain of gold coins that arcs down and off the board's near rail. */
function Payout({ x, y, delayMs, n = 5 }: { x: number; y: number; delayMs: number; n?: number }) {
  const lanes = [
    { px: "-190%", py: "420%" },
    { px: "-90%", py: "540%" },
    { px: "10%", py: "460%" },
    { px: "110%", py: "560%" },
    { px: "200%", py: "440%" },
  ];
  return (
    <>
      {lanes.slice(0, n).map((p, i) => (
        <g key={i} className="csp-payout" style={dv(delayMs + i * 90, { "--px": p.px, "--py": p.py })}>
          <Chip cx={x} cy={y} r={3.6} fill="#ffd76a" edge="#b98a1e" />
        </g>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 1. Slot Machine (t5) - three reels spin, stagger to a stop, payline flash  */
/* ------------------------------------------------------------------------- */

const SLOT_SYMS = ["7", "★", "◆", "♣"]; // 7, star, diamond, club
const SLOT_COLORS = ["#d6234f", "#ffd76a", "#5fc9b0", "#7fa0e0"];

/** A tall reel strip of stacked symbols; the group is clipped by its window and
 * translated (csp-reel) so it reads as a spinning wheel of icons. */
function Reel({ x, delayMs, spinMs, stop }: { x: number; delayMs: number; spinMs: number; stop: string }) {
  // Ten symbol rows so the long eased travel always passes several icons.
  const rows = Array.from({ length: 10 }, (_, i) => i);
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="csp-reel" style={dv(delayMs, { "--spin": `${spinMs}ms`, "--stop": stop })}>
        {rows.map((i) => {
          const s = i % SLOT_SYMS.length;
          return (
            <text key={i} x={0} y={-58 + i * 13} fontSize={10} fontWeight={800} fill={SLOT_COLORS[s]} textAnchor="middle">
              {SLOT_SYMS[s]}
            </text>
          );
        })}
      </g>
    </g>
  );
}

function SlotMachinePlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#ffd76a" glow="#ff4d6d">
        <rect x={18} y={12} width={64} height={76} rx={6} fill="#3a1524" stroke="#ffd76a" strokeWidth={3} />
        <rect x={24} y={30} width={52} height={30} rx={3} fill="#0c1420" stroke="#5a6b8f" strokeWidth={2} />
        <text x={50} y={52} fontSize={18} fontWeight={800} fill="#ffd76a" textAnchor="middle">777</text>
        <rect x={24} y={68} width={52} height={12} rx={2} fill="#12070d" />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <rect x={7} y={12} width={26} height={16} rx={2} fill="#1b2333" stroke="#3a475f" strokeWidth={1.4} />
          <clipPath id="csp-slotmini"><rect x={8} y={13} width={24} height={14} rx={1.6} /></clipPath>
          <g clipPath="url(#csp-slotmini)">
            <g transform="translate(0 20)">
              <Reel x={13} delayMs={delayMs} spinMs={780} stop="-40%" />
              <Reel x={20} delayMs={delayMs + 140} spinMs={980} stop="-53%" />
              <Reel x={27} delayMs={delayMs + 300} spinMs={1160} stop="-27%" />
            </g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(30,10,20,0.55)" /></g>
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          {/* whole cabinet recoils when the lever is yanked */}
          <g className="csp-recoil" style={d(delayMs + 330)}>
          {/* cabinet */}
          <rect x={24} y={20} width={52} height={62} rx={5} fill="#3a1524" stroke="#ffd76a" strokeWidth={2} />
          <rect x={28} y={24} width={44} height={9} rx={2} fill="#12070d" />
          <text x={50} y={31} fontSize={6} fontWeight={800} fill="#ffd76a" textAnchor="middle" style={{ letterSpacing: "1px" }}>JACKPOT</text>
          {/* three reel windows */}
          <rect x={29} y={38} width={42} height={26} rx={2.5} fill="#0c1420" stroke="#5a6b8f" strokeWidth={1.6} />
          <clipPath id="csp-slotwin"><rect x={30} y={39} width={40} height={24} rx={2} /></clipPath>
          <g clipPath="url(#csp-slotwin)">
            <g transform="translate(0 51)">
              <Reel x={40} delayMs={delayMs + 120} spinMs={900} stop="-40%" />
              <Reel x={50} delayMs={delayMs + 320} spinMs={1120} stop="-53%" />
              <Reel x={60} delayMs={delayMs + 560} spinMs={1360} stop="-27%" />
            </g>
            {/* speed blur lines while spinning */}
            <g className="csp-speed" style={dv(delayMs + 120, { "--spin": "1000ms" })}>
              <path d="M31 44 H69 M31 51 H69 M31 58 H69" stroke="#fff4d6" strokeWidth={0.6} opacity={0.4} />
            </g>
          </g>
          {/* payline */}
          <g className="csp-payline" style={d(delayMs + 600)}>
            <rect x={29} y={50} width={42} height={2} rx={1} fill="#ff4d6d" />
          </g>
          {/* coin slot + lever: the tell — yank down, spring back, arm recoil */}
          <rect x={30} y={68} width={40} height={10} rx={2} fill="#12070d" />
          <circle cx={50} cy={73} r={2.4} fill="#ffd76a" />
          <g className="csp-lever" style={d(delayMs + 80)}>
            <rect x={75} y={40} width={2.4} height={20} rx={1.2} fill="#8a94a8" />
            <circle cx={76.2} cy={39} r={3.2} fill="#d6234f" stroke="#8a1230" strokeWidth={0.8} />
          </g>
          </g>
        </g>
        {/* jackpot sparkle on the win (after the third reel stops) */}
        <g className="csp-flash" style={d(delayMs + 1000)}><rect x={29} y={38} width={42} height={26} rx={2.5} fill="#ffef9f" opacity={0.6} /></g>
        <g className="csp-star" style={d(delayMs + 1950)}><Star x={38} y={44} s={1.4} /></g>
        <g className="csp-star" style={d(delayMs + 2090)}><Star x={62} y={44} s={1.2} /></g>
        <g className="csp-star" style={d(delayMs + 2210)}><Star x={50} y={40} s={1.6} /></g>
        {/* the jackpot pays out toward the player's rail */}
        <Payout x={50} y={76} delayMs={delayMs + 2000} />
      </svg>
      </Framed>
      {/* ...and the square that actually pulled the lever keeps its own beats */}
      <Spot tone="#ffd76a" glow="#ff4d6d" tell={d(delayMs + 90)} hit={d(delayMs + 1000)} settle={d(delayMs + 2100)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Roulette (t5) - the wheel spins, the ball settles into a pocket          */
/* ------------------------------------------------------------------------- */

function WheelDisk({ r = 26 }: { r?: number }) {
  const pockets = Array.from({ length: 18 }, (_, i) => i);
  return (
    <g>
      <circle r={r} fill="#3a1c12" stroke="#ffd76a" strokeWidth={2} />
      <circle r={r * 0.66} fill="#12070d" stroke="#8a5a2a" strokeWidth={1.2} />
      {pockets.map((i) => {
        const a = (i / 18) * Math.PI * 2;
        const c = Math.cos(a) * r * 0.82;
        const s = Math.sin(a) * r * 0.82;
        return <rect key={i} x={c - 2} y={s - 2} width={4} height={4} transform={`rotate(${(i / 18) * 360} ${c} ${s})`} fill={i % 2 ? "#111" : "#d6234f"} />;
      })}
      {/* hub */}
      <circle r={r * 0.22} fill="#8a5a2a" />
      <path d={`M0 ${-r * 0.6} V${r * 0.6} M${-r * 0.6} 0 H${r * 0.6}`} stroke="#ffd76a" strokeWidth={1} />
    </g>
  );
}

function RoulettePlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#ffd76a" glow="#e04b63">
        <g transform="translate(50 50)">
          <WheelDisk r={38} />
          <circle cx={0} cy={-34} r={4} fill="#fff4d6" stroke="#c9c2ac" strokeWidth={0.8} />
        </g>
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g transform="translate(20 20)">
            <g className="csp-wheel" style={d(delayMs)}><WheelDisk r={13} /></g>
            <g className="csp-ball-track" style={d(delayMs)}>
              <g className="csp-ball-drop" style={d(delayMs)}><circle cx={0} cy={-11} r={1.7} fill="#fff4d6" /></g>
            </g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(8,26,16,0.55)" /></g>
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          {/* felt + red bet chip */}
          <rect x={12} y={70} width={76} height={20} rx={3} fill="#0d3a24" stroke="#1f6b44" strokeWidth={1.6} />
          <rect x={16} y={74} width="14" height="12" rx={1.6} fill="none" stroke="#e04b63" strokeWidth={1.2} />
          <text x={23} y={83} fontSize={6} fontWeight={800} fill="#e04b63" textAnchor="middle">RED</text>
          <g style={d(delayMs)}><Chip cx={23} cy={80} r={4.4} /></g>
        </g>
        {/* the wheel + settling ball */}
        <g transform="translate(50 42)">
          <g className="csp-wheel" style={d(delayMs)}><WheelDisk r={26} /></g>
          <g className="csp-ball-track" style={d(delayMs)}>
            <g className="csp-ball-drop" style={d(delayMs)}>
              <circle cx={0} cy={-23} r={2.8} fill="#fff4d6" stroke="#c9c2ac" strokeWidth={0.6} />
            </g>
          </g>
          {/* rim */}
          <circle r={29} fill="none" stroke="#5a3a1a" strokeWidth={2.4} />
        </g>
        <g className="csp-star" style={d(delayMs + 1650)}><Star x={50} y={42} s={1.6} /></g>
        {/* red hits: the house pays the bet, toward the player's rail */}
        <Payout x={23} y={82} delayMs={delayMs + 1700} n={4} />
      </svg>
      </Wide>
      <Spot tone="#ffd76a" glow="#e04b63" tell={d(delayMs + 120)} hit={d(delayMs + 900)} settle={d(delayMs + 1900)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Blackjack (t6) - deal two cards, flip them face-up, hit or bust         */
/* ------------------------------------------------------------------------- */

/** A card that deals in, then flips from back to face. */
function FlipCard({ x, y, tilt, dealMs, flipMs, label }: { x: number; y: number; tilt: number; dealMs: number; flipMs: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="csp-deal" style={dv(dealMs, { "--tilt": `${tilt}deg` })}>
        <g transform={`rotate(${tilt})`}>
          <g className="csp-flip-back" style={d(flipMs)}><CardBack /></g>
          <g className="csp-flip-face" style={d(flipMs)}><CardFace label={label} /></g>
        </g>
      </g>
    </g>
  );
}

function BlackjackPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#ffd76a" glow="#1f6b44">
        <g transform="translate(38 52) rotate(-12) scale(2)"><CardFace label="10" /></g>
        <g transform="translate(60 50) rotate(8) scale(2)"><CardFace label="A" /></g>
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g transform="translate(20 22) scale(0.7)">
            <g className="csp-flip-back" style={d(delayMs)}><CardBack /></g>
            <g className="csp-flip-face" style={d(delayMs)}><CardFace label="A" /></g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        {/* felt table arc */}
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          <path d="M8 88 Q50 58 92 88" fill="none" stroke="#1f6b44" strokeWidth={2.4} />
          <text x={50} y={30} fontSize={6.4} fontWeight={800} fill="#e8dcc0" textAnchor="middle" style={{ letterSpacing: "1px" }}>BLACKJACK PAYS 3:2</text>
          <text x={50} y={38} fontSize={4.6} fill="#9db8a8" textAnchor="middle">dealer stands on 17</text>
        </g>
        {/* the hand: cards dealt then flipped, values climbing to 21 */}
        <g className="csp-hold" style={d(delayMs)}>
          <FlipCard x={38} y={62} tilt={-10} dealMs={delayMs + 60} flipMs={delayMs + 520} label="10" />
          <FlipCard x={50} y={60} tilt={-2} dealMs={delayMs + 320} flipMs={delayMs + 820} label="7" />
          <FlipCard x={62} y={62} tilt={9} dealMs={delayMs + 620} flipMs={delayMs + 1140} label="4" />
        </g>
        {/* running total pops on the win (after the last snap-flip lands) */}
        <g className="csp-pop" style={d(delayMs + 2050)}>
          <rect x={41} y={78} width={18} height={11} rx={2.4} fill="#12070d" stroke="#ffd76a" strokeWidth={1} />
          <text x={50} y={86} fontSize={7} fontWeight={800} fill="#ffd76a" textAnchor="middle">21</text>
        </g>
        <g className="csp-star" style={d(delayMs + 2180)}><Star x={68} y={50} s={1.3} /></g>
        {/* 3:2 pays toward the player's rail */}
        <Payout x={50} y={86} delayMs={delayMs + 2200} n={4} />
      </svg>
      </Framed>
      <Spot tone="#ffd76a" glow="#1f6b44" tell={d(delayMs + 100)} hit={d(delayMs + 1180)} settle={d(delayMs + 2400)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Scratch Card (t3) - coin scrapes the foil off, symbols revealed         */
/* ------------------------------------------------------------------------- */

function ScratchCardPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#ffd76a" glow="#c2a24a">
        <rect x={10} y={28} width={80} height={46} rx={4} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={2.4} />
        <rect x={20} y={44} width={18} height={18} rx={2} fill="#b9bec9" stroke="#8a94a8" strokeWidth={1} />
        <text x={56} y={60} fontSize={18} fontWeight={800} fill="#ffd76a" textAnchor="middle">★★</text>
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <rect x={8} y={14} width={24} height={12} rx={2} fill="#ffd76a" />
          <g className="csp-scratch" style={d(delayMs)}><rect x={8} y={14} width={24} height={12} rx={2} fill="#b9bec9" /></g>
        </svg>
      </Stage>
    );
  }
  const panels = [
    { x: 34, sym: "★", col: "#ffd76a" },
    { x: 50, sym: "★", col: "#ffd76a" },
    { x: 66, sym: "★", col: "#ffd76a" },
  ];
  return (
    <>
      <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          {/* ticket */}
          <rect x={22} y={34} width={56} height={34} rx={3} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={1.6} />
          <text x={50} y={44} fontSize={5} fontWeight={800} fill="#c2372f" textAnchor="middle" style={{ letterSpacing: "1px" }}>MATCH 3 TO WIN</text>
          {/* revealed panels beneath the foil */}
          {panels.map((p, i) => (
            <g key={i}>
              <rect x={p.x - 6} y={50} width={12} height={12} rx={1.6} fill="#fffbe9" stroke="#d8c58a" strokeWidth={0.8} />
              <text x={p.x} y={60} fontSize={9} fontWeight={800} fill={p.col} textAnchor="middle">{p.sym}</text>
            </g>
          ))}
          {/* foil scrubbed away one panel at a time, on the coin's strokes */}
          {panels.map((p, i) => (
            <g key={`f${i}`} className="csp-scratch" style={d(delayMs + 300 + i * 420)}>
              <rect x={p.x - 6.4} y={49.6} width={12.8} height={12.8} rx={1.6} fill="#b9bec9" stroke="#8a94a8" strokeWidth={0.6} />
              <path d={`M${p.x - 5} 52 h9 M${p.x - 5} 56 h9 M${p.x - 5} 60 h9`} stroke="#9098a6" strokeWidth={0.6} />
            </g>
          ))}
        </g>
        {/* the coin scrubs edge-on: back-and-forth strokes per panel */}
        <g className="csp-scrape" style={d(delayMs + 120)}>
          <g transform="translate(28 56)">
            <Chip cx={0} cy={0} r={5} fill="#ffd76a" edge="#b98a1e" />
            {/* dust flecks flicked off each stroke */}
            <g className="csp-dust" style={dv(delayMs + 450, { "--dx": "40%", "--dy": "-70%" })}><circle cx={4} cy={-2} r={0.8} fill="#c9c2ac" /></g>
            <g className="csp-dust" style={dv(delayMs + 700, { "--dx": "60%", "--dy": "-40%" })}><circle cx={5} cy={1} r={0.7} fill="#c9c2ac" /></g>
            <g className="csp-dust" style={dv(delayMs + 1050, { "--dx": "50%", "--dy": "-80%" })}><circle cx={4} cy={-1} r={0.8} fill="#c9c2ac" /></g>
            <g className="csp-dust" style={dv(delayMs + 1400, { "--dx": "70%", "--dy": "-50%" })}><circle cx={5} cy={0} r={0.7} fill="#c9c2ac" /></g>
          </g>
        </g>
        <g className="csp-star" style={d(delayMs + 1600)}><Star x={50} y={40} s={1.3} /></g>
        {/* match 3: the ticket pays toward the player's rail */}
        <Payout x={50} y={64} delayMs={delayMs + 1700} n={4} />
      </svg>
      </Wide>
      <Spot tone="#ffd76a" glow="#c2a24a" tell={d(delayMs + 90)} hit={d(delayMs + 1120)} settle={d(delayMs + 1900)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. Let It Ride (t4) - toss and tumble a coin, chips stack up on heads       */
/* ------------------------------------------------------------------------- */

function LetItRidePlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#ffd76a" glow="#5fc9b0">
        <circle cx={44} cy={40} r={22} fill="#ffd76a" stroke="#b98a1e" strokeWidth={3} />
        <text x={44} y={48} fontSize={22} fontWeight={800} fill="#8a5a10" textAnchor="middle">H</text>
        <Chip cx={66} cy={72} r={16} />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="csp-toss" style={d(delayMs)}>
            <g className="csp-tumble" style={d(delayMs)} transform="translate(20 22)">
              <Chip cx={0} cy={0} r={6} fill="#ffd76a" edge="#b98a1e" />
            </g>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          <rect x={14} y={78} width={72} height={12} rx={3} fill="#0d3a24" stroke="#1f6b44" strokeWidth={1.4} />
          <text x={50} y={30} fontSize={6} fontWeight={800} fill="#ffd76a" textAnchor="middle" style={{ letterSpacing: "1px" }}>LET IT RIDE</text>
        </g>
        {/* the tossed coin: arcs up, tumbles edge-over-edge, lands heads */}
        <g className="csp-toss" style={d(delayMs + 80)}>
          <g className="csp-tumble" style={d(delayMs + 80)} transform="translate(40 60)">
            <circle r={9} fill="#ffd76a" stroke="#b98a1e" strokeWidth={1.4} />
            <text x={0} y={3.4} fontSize={9} fontWeight={800} fill="#8a5a10" textAnchor="middle">H</text>
          </g>
        </g>
        {/* chip stack building higher as the streak rides — then the whole
            tower wobbles, nearly topples, and holds */}
        <g className="csp-tower" style={d(delayMs + 1280)}>
          <g className="csp-chip" style={d(delayMs + 300)}><Chip cx={64} cy={82} r={7} /></g>
          <g className="csp-chip" style={d(delayMs + 560)}><Chip cx={64} cy={77} r={7} fill="#5fc9b0" edge="#2a7a68" /></g>
          <g className="csp-chip" style={d(delayMs + 820)}><Chip cx={64} cy={72} r={7} fill="#7fa0e0" edge="#2c4f9e" /></g>
          <g className="csp-chip" style={d(delayMs + 1080)}><Chip cx={64} cy={67} r={7} fill="#ffd76a" edge="#b98a1e" /></g>
        </g>
        <g className="csp-star" style={d(delayMs + 1750)}><Star x={40} y={40} s={1.4} /></g>
        {/* the ride pays toward the player's rail */}
        <Payout x={64} y={80} delayMs={delayMs + 1800} n={4} />
      </svg>
      </Framed>
      <Spot tone="#ffd76a" glow="#5fc9b0" tell={d(delayMs + 80)} hit={d(delayMs + 1300)} settle={d(delayMs + 2000)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Loot Box (t7) - the crate jiggles, hinges open, bursts a rare drop       */
/* ------------------------------------------------------------------------- */

function Gem({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M0 -8 l6 4 -2 8 -8 0 -2 -8 Z" fill="#b98cff" stroke="#e3d0ff" strokeWidth={0.8} />
      <path d="M-6 -4 h12 M0 -8 v16 M-2 4 l2 -8 2 8" stroke="#e3d0ff" strokeWidth={0.5} opacity={0.8} />
    </g>
  );
}

function LootBoxPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#b98cff" glow="#ffd76a">
        <rect x={22} y={44} width={56} height={40} rx={4} fill="#8a5a2a" stroke="#4a2f14" strokeWidth={3} />
        <rect x={22} y={32} width={56} height={14} rx={3} fill="#a06a34" stroke="#4a2f14" strokeWidth={3} />
        <g transform="translate(50 28) scale(2.4)"><Gem /></g>
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="csp-jiggle" style={d(delayMs)}>
            <rect x={11} y={18} width={18} height={13} rx={1.6} fill="#8a5a2a" stroke="#5a3a1a" strokeWidth={1.2} />
          </g>
          <g className="csp-lid" style={d(delayMs)} transform="translate(11 18)">
            <rect x={0} y={-4} width={18} height={5} rx={1.4} fill="#a06a34" stroke="#5a3a1a" strokeWidth={1.1} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(18,10,30,0.55)" /></g>
        {/* rarity rays behind the crate */}
        <g className="csp-rays" style={d(delayMs)}>
          <g transform="translate(50 52)">
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={-1.4} y={-40} width={2.8} height={26} rx={1.4} fill="#b98cff" transform={`rotate(${i * 30})`} opacity={0.85} />
            ))}
          </g>
        </g>
        {/* the crate: base jiggles, lid hinges open */}
        <g className="csp-jiggle" style={d(delayMs)}>
          <rect x={34} y={46} width={32} height={24} rx={2.4} fill="#8a5a2a" stroke="#4a2f14" strokeWidth={2} />
          <rect x={34} y={46} width={32} height={24} rx={2.4} fill="none" stroke="#ffd76a" strokeWidth={0.9} strokeDasharray="3 2.4" />
          <path d="M50 46 V70" stroke="#4a2f14" strokeWidth={1.4} />
          <rect x={46} y={54} width={8} height={7} rx={1} fill="#ffd76a" stroke="#b98a1e" strokeWidth={0.8} />
        </g>
        <g className="csp-lid" style={d(delayMs)} transform="translate(34 46)">
          <rect x={0} y={-8} width={32} height={9} rx={2.4} fill="#a06a34" stroke="#4a2f14" strokeWidth={2} />
          <rect x={2} y={-6} width={28} height={4.4} rx={1.4} fill="none" stroke="#ffd76a" strokeWidth={0.8} strokeDasharray="3 2.2" />
        </g>
        {/* the legendary drop floats out */}
        <g className="csp-loot" style={d(delayMs)}>
          <g transform="translate(50 48)"><Gem s={1.6} /></g>
        </g>
        <g className="csp-star" style={d(delayMs + 1500)}><Star x={40} y={40} s={1.4} /></g>
        <g className="csp-star" style={d(delayMs + 1650)}><Star x={62} y={42} s={1.2} /></g>
        {/* the drop spills loose coins toward the player's rail */}
        <Payout x={50} y={58} delayMs={delayMs + 1350} n={4} />
      </svg>
      </Framed>
      <Spot tone="#b98cff" glow="#ffd76a" tell={d(delayMs + 110)} hit={d(delayMs + 980)} settle={d(delayMs + 1800)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Poker Bluff (t6) - fan a stone-cold hand, shove the pot all in          */
/* ------------------------------------------------------------------------- */

function PokerBluffPlay({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} tone="#d6234f" glow="#e8dcc0">
        <g transform="translate(36 46) rotate(-16) scale(2)"><CardBack /></g>
        <g transform="translate(54 44) rotate(6) scale(2)"><CardBack /></g>
        <Chip cx={50} cy={80} r={14} />
      </Arrival>
    );
  }
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="csp-shove" style={d(delayMs)}>
            <Chip cx={14} cy={26} r={4.4} />
            <Chip cx={20} cy={26} r={4.4} fill="#5fc9b0" edge="#2a7a68" />
            <Chip cx={26} cy={26} r={4.4} fill="#7fa0e0" edge="#2c4f9e" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <>
      <Framed>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="csp-wash"><rect x={0} y={0} width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="csp-linger csp-linger--long" style={d(delayMs)}>
          <path d="M8 84 Q50 56 92 84" fill="none" stroke="#1f6b44" strokeWidth={2.4} />
          <text x={50} y={26} fontSize={6.4} fontWeight={800} fill="#e8dcc0" textAnchor="middle" style={{ letterSpacing: "1px" }}>ALL IN</text>
        </g>
        {/* the tell: a too-long stare — eyes narrow and just... hold */}
        <g className="csp-stare" style={d(delayMs + 150)}>
          <rect x={42} y={33} width={7} height={3.2} rx={1.6} fill="#e8dcc0" />
          <rect x={52} y={33} width={7} height={3.2} rx={1.6} fill="#e8dcc0" />
        </g>
        <g className="csp-sweat" style={d(delayMs + 750)}>
          <path d="M62.5 32 q1.8 2.8 0 4.4 q-1.8 -1.6 0 -4.4 Z" fill="#7fd0e8" />
        </g>
        {/* a fanned hand dealt into the corner; the 7-2 sags once it's seen */}
        <g className="csp-hold" style={d(delayMs)}>
          <g className="csp-deflate" style={d(delayMs + 1900)}>
            <FlipCard x={26} y={44} tilt={-18} dealMs={delayMs + 60} flipMs={delayMs + 560} label="2" />
            <FlipCard x={34} y={42} tilt={-6} dealMs={delayMs + 300} flipMs={delayMs + 820} label="7" />
          </g>
          {/* the sigh */}
          <g className="csp-sigh" style={d(delayMs + 2050)}>
            <circle cx={30} cy={30} r={2.2} fill="rgba(232,220,192,0.7)" />
          </g>
        </g>
        {/* ...then the chips get shoved all-in anyway */}
        <g className="csp-shove" style={d(delayMs + 900)}>
          <g style={d(delayMs)}>
            <g className="csp-chip" style={d(delayMs + 1300)}><Chip cx={54} cy={76} r={8} /></g>
            <g className="csp-chip" style={d(delayMs + 1440)}><Chip cx={66} cy={78} r={8} fill="#5fc9b0" edge="#2a7a68" /></g>
            <g className="csp-chip" style={d(delayMs + 1580)}><Chip cx={60} cy={70} r={8} fill="#7fa0e0" edge="#2c4f9e" /></g>
            <g className="csp-chip" style={d(delayMs + 1720)}><Chip cx={60} cy={64} r={8} fill="#ffd76a" edge="#b98a1e" /></g>
          </g>
        </g>
        <g className="csp-star" style={d(delayMs + 2100)}><Star x={60} y={56} s={1.5} /></g>
      </svg>
      </Framed>
      <Spot tone="#d6234f" glow="#e8dcc0" tell={d(delayMs + 150)} hit={d(delayMs + 1300)} settle={d(delayMs + 2300)} />
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

export const PLAYS: Record<string, SigPlugin> = {
  cs_slot_machine: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" },
    Render: SlotMachinePlay,
  },
  cs_roulette: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" },
    Render: RoulettePlay,
  },
  cs_blackjack: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast" },
    Render: BlackjackPlay,
  },
  cs_scratch_card: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" },
    Render: ScratchCardPlay,
  },
  cs_let_it_ride: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" },
    Render: LetItRidePlay,
  },
  cs_loot_box: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "cast" },
    Render: LootBoxPlay,
  },
  cs_poker_bluff: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" },
    Render: PokerBluffPlay,
  },
};
