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
import type { SigPlugin } from "./sigPlugins";
import "./memePlays.css";

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

/** Board-crop stage for wide leads: oversized around the lead square so the
 * scene takes over the whole visible board (the caller's crop clips it).
 * Same geometry as the core BoardWideStage — a 1400% canvas is ~14 cells, so
 * the 8x8 board is the middle ~57% — rebuilt here to avoid the import cycle. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="mnp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
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

function CappuccinoAssassinoPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Wide>
      <Wash color="rgba(78,45,21,0.2)" delayMs={delayMs} />
      {/* the assassin blurs clean across the board */}
      <Prop left="40%" top="34%" width="20%" height="24%" className="mnp-assassin" style={d(delayMs)}>
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
    </Wide>
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

function BallerinaCappuccinaPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Wide>
      <Wash color="rgba(245,168,192,0.16)" delayMs={delayMs} />
      {/* the ribbon spiral winds around her, spinning the other way */}
      <Prop left="29%" top="26%" width="42%" height="46%" className="mnp-ribbonspin" style={d(delayMs + 150)}>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <RibbonSpiral color="rgba(245,168,192,0.9)" />
          <g transform="rotate(180 50 50)"><RibbonSpiral color="rgba(255,217,228,0.7)" /></g>
        </svg>
      </Prop>
      {/* the ballerina pirouettes dead center */}
      <Prop left="41%" top="32%" width="18%" height="30%" className="mnp-pirouette" style={d(delayMs)}>
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
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. La Vaca Saturno Saturnita (t7) — rings sweep the board, cow in orbit    */
/* ------------------------------------------------------------------------- */

function LaVacaPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Wide>
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
        <span className="absolute left-[38%] top-[-14%] block h-[36%] w-[24%]">
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
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Frigo Camelo (t5) — the door swings open, cold fog rolls out            */
/* ------------------------------------------------------------------------- */

function FrigoCameloPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Wide>
      <Wash color="rgba(79,168,204,0.16)" delayMs={delayMs} />
      {/* the fridge-camel backs in from the left */}
      <Prop left="27%" top="30%" width="20%" height="28%" className="mnp-slidein" style={d(delayMs)}>
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
  );
}

/* ------------------------------------------------------------------------- */
/* 5. Trippi Troppi (t3) — corrupted-video glitch jitter                      */
/* ------------------------------------------------------------------------- */

function TrippiTroppiPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Stage inset="-110%">
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
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Chill Guy (t2) — he just slides across the bottom. that's it. that's the joke */
/* ------------------------------------------------------------------------- */

function ChillGuyPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
          <g className="mnp-deadpan" style={d(delayMs + 900)}>
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
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Moai Head (t4) — descends, THUDS, then holds the longest deadpan pause  */
/* ------------------------------------------------------------------------- */

function MoaiHeadPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
    <Wide>
      {/* the impact flash-wash: one hard pulse when it lands */}
      <Wash color="rgba(78,88,98,0.24)" delayMs={delayMs + 480} />
      {/* the moai descends. gravity means it. */}
      <Prop left="41%" top="30%" width="18%" height="30%" className="mnp-moaidrop" style={d(delayMs)}>
        <Figure id="moai_head" />
      </Prop>
      {/* THUD: dust ring + debris at the base */}
      <Prop left="36%" top="52%" width="28%" height="10%">
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
          <g className="mnp-deadpan mnp-deadpan--long" style={d(delayMs + 950)}>
            <text x={25} y={22} fontSize={22} textAnchor="middle">🗿</text>
          </g>
        </svg>
      </Prop>
      <Prop left="34%" top="40%" width="8%" height="5%">
        <svg viewBox="0 0 50 24" className="h-full w-full">
          <g className="mnp-deadpan mnp-deadpan--long" style={d(delayMs + 1350)}>
            <text x={25} y={16} fontSize={10} fontWeight={800} fill="#b4bcc4" textAnchor="middle">. . .</text>
          </g>
        </svg>
      </Prop>
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. Skibidi Flush (t5) — a giant vortex drags ghost pieces home             */
/* ------------------------------------------------------------------------- */

function SkibidiFlushPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
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
      <Prop left="43%" top="56%" width="14%" height="20%" className="mnp-surface" style={d(delayMs + 1050)}>
        <Figure id="skibidi_flush" />
      </Prop>
      <Ring color="rgba(143,212,245,0.85)" delayMs={delayMs + 1250} />
    </Wide>
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
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz" },
    Render: CappuccinoAssassinoPlay,
  },
  ballerina_cappuccina: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" },
    Render: BallerinaCappuccinaPlay,
  },
  la_vaca_saturno_saturnita: {
    config: { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "colossus", source: "summon" },
    Render: LaVacaPlay,
  },
  frigo_camelo: {
    config: { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "clockice", source: "shield" },
    Render: FrigoCameloPlay,
  },
  trippi_troppi: {
    config: { ordering: "radial", staggerMs: 55, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "petrify", source: "walnut" },
    Render: TrippiTroppiPlay,
  },
  chill_guy: {
    config: { ordering: "sweep", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" },
    Render: ChillGuyPlay,
  },
  moai_head: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege" },
    Render: MoaiHeadPlay,
  },
  skibidi_flush: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" },
    Render: SkibidiFlushPlay,
  },
};
