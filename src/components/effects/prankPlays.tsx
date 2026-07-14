// Funny/pranks plugin signatures: bespoke play animations for the "sent to
// your opponent" prank cards (pranks.ts). See sigPlugins.tsx for the contract.
// Self-contained: own SVG, own CSS (prankPlays.css), transform/opacity only.
// Do NOT import from BoardEffects.tsx (cycle hazard) and do NOT register this
// module anywhere - integration happens later.
//
// Design brief: each animation ACTS OUT the junk the card mails to the
// opponent. A fake antivirus sweeps the board and quarantines pieces; a Blue
// Screen crashes and reboots; a Forced Update progress bar crawls; a phishing
// hook yanks their secrets out of an inbox; pop-up ads rain across their half;
// a captcha modal fails verification and padlocks a piece; a chain letter
// forwards itself piece to piece; a raid alert showers hype; a ratio arrow
// bonks a piece back toward home. Leads take over the whole visible board
// (oversized-clipped stage); the two freeze cards also carry a per-square hit.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";
import "./prankPlays.css";

/* ------------------------------------------------------------------------- */
/* Shared staging (rebuilt locally to avoid the BoardEffects import cycle)    */
/* ------------------------------------------------------------------------- */

const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** Square-local stage (small leads and per-target hits). */
function Stage({ children, inset = "0" }: { children: ReactNode; inset?: string }) {
  return (
    <span className="prk pointer-events-none absolute z-20 block" style={{ inset }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for wide leads: oversized around the lead square so the
 * skit takes over the whole visible board (the caller's crop clips it). */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="prk pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="prk-wash absolute inset-0 block" style={{ background: color, ...d(delayMs) }} />;
}

function Boom({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="prk-boom absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "68%", width: "68%", marginLeft: "-34%", marginTop: "-34%", border: `3px solid ${color}`, ...d(delayMs) }}
    />
  );
}

/** Centered prop box inside a Wide stage (values in % of the 14x14 box). */
function Prop({
  children,
  left = "34%",
  top = "34%",
  width = "32%",
  height = "32%",
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

/** Reusable OS-window chrome (title bar + traffic-light buttons). */
function WindowFrame({
  title,
  bar,
  body,
  children,
  w = 100,
  h = 66,
  accent = "#e84d5b",
}: {
  title: string;
  bar: string;
  body: string;
  children?: ReactNode;
  w?: number;
  h?: number;
  accent?: string;
}) {
  return (
    <>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={3.5} fill={body} stroke="rgba(20,24,34,0.9)" strokeWidth={1.6} />
      <path d={`M1 12 v-7.5 a3.5 3.5 0 0 1 3.5 -3.5 h${w - 9} a3.5 3.5 0 0 1 3.5 3.5 V12 Z`} fill={bar} />
      <text x={6} y={9.2} fontSize={6} fontWeight={700} fill="#f5f7fb" style={{ letterSpacing: "0.4px" }}>
        {title}
      </text>
      <rect x={w - 27} y={4} width={6} height={5.5} rx={1.2} fill="rgba(245,247,251,0.35)" />
      <rect x={w - 19} y={4} width={6} height={5.5} rx={1.2} fill="rgba(245,247,251,0.35)" />
      <rect x={w - 11} y={4} width={7} height={5.5} rx={1.2} fill={accent} />
      <path d={`M${w - 9.4} 5.2 l3.8 3.1 m0 -3.1 l-3.8 3.1`} stroke="#fff" strokeWidth={1.1} strokeLinecap="round" />
      {children}
    </>
  );
}

function ClockChip({ x, y, label, tone = "bad" }: { x: number; y: number; label: string; tone?: "bad" | "good" }) {
  const fill = tone === "bad" ? "#e84d5b" : "#8fd0a0";
  const stroke = tone === "bad" ? "#a5303b" : "#3f7a52";
  const text = tone === "bad" ? "#fff" : "#1f4a2e";
  return (
    <g>
      <rect x={x} y={y} width={34} height={13} rx={6.5} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <circle cx={x + 8} cy={y + 6.5} r={3.6} fill="none" stroke={text} strokeWidth={1.4} />
      <path d={`M${x + 8} ${y + 4.4} v2.1 l1.6 1`} stroke={text} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <text x={x + 22} y={y + 9.4} fontSize={7} fontWeight={800} fill={text} textAnchor="middle">{label}</text>
    </g>
  );
}

function Sparkle({ x, y, s = 1, fill = "#ffd76a" }: { x: number; y: number; s?: number; fill?: string }) {
  return <path d={`M${x} ${y} l${1.8 * s} ${5 * s} ${5 * s} ${1.8 * s} ${-5 * s} ${1.8 * s} ${-1.8 * s} ${5 * s} ${-1.8 * s} ${-5 * s} ${-5 * s} ${-1.8 * s} ${5 * s} ${-1.8 * s} Z`} fill={fill} />;
}

/* ------------------------------------------------------------------------- */
/* 1. Phishing Email - a hook yanks a secret card out of their inbox          */
/* ------------------------------------------------------------------------- */

function Envelope({ x, y, s = 1, flap = false }: { x: number; y: number; s?: number; flap?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={-9} width={28} height={18} rx={2} fill="#eef2f9" stroke="#8895b0" strokeWidth={1.4} />
      {flap ? (
        <path d="M-14 -9 L0 -1 L14 -9" fill="none" stroke="#8895b0" strokeWidth={1.4} />
      ) : (
        <path d="M-14 -9 L0 3 L14 -9 Z" fill="#dbe3f2" stroke="#8895b0" strokeWidth={1.4} strokeLinejoin="round" />
      )}
    </g>
  );
}

function PhishingPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-linger" style={d(delayMs)}><Envelope x={20} y={24} s={0.72} /></g>
          <g className="prk-hook" style={d(delayMs + 200)}>
            <path d="M20 2 V16 a5 5 0 0 0 8 0" fill="none" stroke="#7c88a4" strokeWidth={2} strokeLinecap="round" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(70,84,116,0.2)" delayMs={delayMs} />
      <Prop left="31%" top="33%" width="38%" height="30%">
        <svg viewBox="0 0 110 78" className="h-full w-full">
          {/* their inbox */}
          <g className="prk-window" style={d(delayMs)}>
            <WindowFrame title="INBOX (1)" bar="#39445c" body="#eef2f9" w={110} h={60}>
              <rect x={7} y={16} width={96} height={9} rx={2} fill="#dce3f0" />
              <rect x={7} y={27} width={96} height={9} rx={2} fill="#e6ebf5" />
              <rect x={7} y={38} width={96} height={9} rx={2} fill="#dce3f0" />
              <circle cx={12} cy={20.5} r={1.6} fill="#e84d5b" />
              <text x={18} y={22.6} fontSize={4.6} fontWeight={700} fill="#4a5878">Re: Your account (urgent!!)</text>
            </WindowFrame>
          </g>
          {/* the phishing hook dips in and yanks a card out */}
          <g className="prk-hook" style={d(delayMs + 350)}>
            <path d="M55 -12 V26 a7 7 0 0 0 11 0" fill="none" stroke="#7c88a4" strokeWidth={2.4} strokeLinecap="round" />
            <path d="M66 26 l4 2.4 -1 -4.6 Z" fill="#7c88a4" />
          </g>
          {/* the stolen secret: a red nerf card flips face-up */}
          <g className="prk-flip" style={d(delayMs + 780)}>
            <rect x={44} y={50} width={22} height={28} rx={2.6} fill="#e84d5b" stroke="#a5303b" strokeWidth={1.6} />
            <circle cx={55} cy={60} r={4.6} fill="#fff" opacity={0.9} />
            <path d="M52.4 60 h5.2 M55 57.4 v5.2" stroke="#e84d5b" strokeWidth={1.6} strokeLinecap="round" />
            <rect x={47} y={69} width={16} height={2.6} rx={1.3} fill="rgba(255,255,255,0.75)" />
          </g>
          <g className="prk-star" style={d(delayMs + 1150)}><Sparkle x={55} y={48} s={1.1} fill="#ffd76a" /></g>
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.7)" delayMs={delayMs + 900} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Subscriber Raid - a donation banner drops, hype rains, +20 / -10        */
/* ------------------------------------------------------------------------- */

function RaidPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-pop" style={d(delayMs)}>
            <rect x={7} y={15} width={26} height={11} rx={5.5} fill="#9147ff" />
            <text x={20} y={23} fontSize={6.4} fontWeight={900} fill="#fff" textAnchor="middle">RAID</text>
          </g>
          <g className="prk-rise" style={d(delayMs + 260)}><circle cx={13} cy={30} r={2.4} fill="#ffd76a" /></g>
          <g className="prk-rise" style={d(delayMs + 380)}><circle cx={27} cy={30} r={2} fill="#8fd0a0" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(145,71,255,0.2)" delayMs={delayMs} />
      <Prop left="28%" top="30%" width="44%" height="20%">
        <svg viewBox="0 0 130 58" className="h-full w-full">
          {/* the donation alert banner slides down */}
          <g className="prk-window" style={d(delayMs)}>
            <rect x={4} y={8} width={122} height={30} rx={7} fill="#2a2140" stroke="#9147ff" strokeWidth={2.4} />
            <circle cx={22} cy={23} r={9} fill="#9147ff" />
            <path d="M22 18 v10 M17 23 h10" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
            <text x={38} y={20} fontSize={7.4} fontWeight={900} fill="#e7d8ff">SUBSCRIBER RAID</text>
            <text x={38} y={31} fontSize={5.6} fontWeight={700} fill="#b79aff">ChessLord420 + 4,120 raiders</text>
          </g>
          {/* the swing: +20s to you, -10s off them */}
          <g className="prk-rise" style={d(delayMs + 620)}><ClockChip x={20} y={44} label="+20s" tone="good" /></g>
          <g className="prk-rise" style={d(delayMs + 780)}><ClockChip x={78} y={44} label="-10s" tone="bad" /></g>
        </svg>
      </Prop>
      {/* hype confetti raining across the board */}
      {[
        { x: "-70%", y: "-80%", c: "#ffd76a", cx: 30 },
        { x: "45%", y: "-100%", c: "#9147ff", cx: 70 },
        { x: "85%", y: "-55%", c: "#8fd0a0", cx: 100 },
        { x: "-95%", y: "-40%", c: "#5aa0e8", cx: 46 },
        { x: "20%", y: "-70%", c: "#f2778f", cx: 84 },
      ].map((p, i) => (
        <Prop key={i} left="45%" top="46%" width="10%" height="10%" className="prk-puff" style={dv(delayMs + 700 + i * 70, { "--prk-x": p.x, "--prk-y": p.y })}>
          <svg viewBox="0 0 120 40" className="h-full w-full"><rect x={p.cx} y={16} width={5} height={3.2} rx={1} fill={p.c} /></svg>
        </Prop>
      ))}
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Blue Screen of Death - the board crashes, collects error info, reboots  */
/* ------------------------------------------------------------------------- */

function BsodPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-glitch" style={d(delayMs)}>
            <rect x={5} y={7} width={30} height={26} rx={2} fill="#1247c8" />
            <text x={10} y={26} fontSize={16} fontWeight={800} fill="#dbe7ff">:(</text>
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      {/* the whole board goes BSOD blue */}
      <span className="prk-glitch absolute inset-0 block" style={{ background: "#1247c8", ...d(delayMs) }} />
      <Prop left="26%" top="28%" width="48%" height="40%">
        <svg viewBox="0 0 140 116" className="h-full w-full">
          <g className="prk-glitch" style={d(delayMs)}>
            <text x={4} y={30} fontSize={30} fontWeight={800} fill="#dbe7ff">:(</text>
            <text x={4} y={50} fontSize={7} fontWeight={600} fill="#cfe0ff">A problem has been detected and NerfChess</text>
            <text x={4} y={60} fontSize={7} fontWeight={600} fill="#cfe0ff">has been shut down to avoid a good move.</text>
            <text x={4} y={78} fontSize={6} fontWeight={600} fill="#9fc0ff">STOP CODE: OPPONENT_BLUNDER_IMMINENT</text>
            {/* reboot progress crawling */}
            <rect x={4} y={88} width={132} height={7} rx={3.5} fill="rgba(255,255,255,0.2)" />
            <g className="prk-fill" style={d(delayMs + 250)}>
              <rect x={4} y={88} width={132} height={7} rx={3.5} fill="#dbe7ff" />
            </g>
            <text x={4} y={108} fontSize={6.2} fontWeight={700} fill="#dbe7ff">Collecting error info... restarting</text>
            {/* a QR square, because of course */}
            <rect x={112} y={4} width={24} height={24} rx={1.5} fill="#dbe7ff" />
            <path d="M116 8 h6 v6 h-6 Z M126 8 h6 v6 h-6 Z M116 18 h6 v6 h-6 Z M128 20 h4 v4 h-4 Z" fill="#1247c8" />
          </g>
        </svg>
      </Prop>
      <Prop left="42%" top="70%" width="16%" height="8%" className="prk-rise" style={d(delayMs + 900)}>
        <svg viewBox="0 0 34 13" className="h-full w-full"><ClockChip x={0} y={0} label="-35s" tone="bad" /></svg>
      </Prop>
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Forced Update - installing update 1 of 3, the bar crawls, clock bleeds  */
/* ------------------------------------------------------------------------- */

function Gear({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const teeth = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    teeth.push(<rect key={i} x={-1.6} y={-9.4} width={3.2} height={3.4} rx={0.8} fill="#5aa0e8" transform={`rotate(${(a * 180) / Math.PI})`} />);
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {teeth}
      <circle r={6.4} fill="#5aa0e8" />
      <circle r={2.6} fill="#eef2f9" />
    </g>
  );
}

function ForcedUpdatePlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-spin" style={d(delayMs)}><Gear x={20} y={16} s={1} /></g>
          <rect x={7} y={28} width={26} height={5} rx={2.5} fill="#c3cddd" />
          <g className="prk-fill" style={d(delayMs + 150)}><rect x={7} y={28} width={26} height={5} rx={2.5} fill="#5aa0e8" /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(70,84,116,0.18)" delayMs={delayMs} />
      <Prop left="30%" top="34%" width="40%" height="28%">
        <svg viewBox="0 0 116 74" className="h-full w-full">
          <g className="prk-window" style={d(delayMs)}>
            <WindowFrame title="SYSTEM UPDATE" bar="#39445c" body="#eef2f9" w={116} h={60}>
              <g transform="translate(20 30)"><g className="prk-spin" style={d(delayMs + 100)}><Gear x={0} y={0} s={1.1} /></g></g>
              <text x={36} y={24} fontSize={6.6} fontWeight={800} fill="#39435c">Installing update 1 of 3</text>
              <text x={36} y={33} fontSize={5.2} fontWeight={600} fill="#7c88a4">Do not turn off your opponent.</text>
              <rect x={36} y={40} width={72} height={7} rx={3.5} fill="#c3cddd" />
              <g className="prk-fill" style={d(delayMs + 250)}><rect x={36} y={40} width={72} height={7} rx={3.5} fill="#5aa0e8" /></g>
              <text x={104} y={54} fontSize={5} fontWeight={700} fill="#7c88a4" textAnchor="end">33%</text>
            </WindowFrame>
          </g>
          {/* their clock bleeds -8s per crawl */}
          <g className="prk-rise" style={d(delayMs + 950)}><ClockChip x={41} y={-2} label="-8s" tone="bad" /></g>
        </svg>
      </Prop>
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. NerfChess Defender - antivirus scan sweeps, threat found, quarantines   */
/* ------------------------------------------------------------------------- */

function QuarantineBubble({ vb = 40 }: { vb?: number }) {
  const c = vb / 2;
  return (
    <g>
      <circle cx={c} cy={c} r={vb * 0.42} fill="rgba(90,160,232,0.16)" stroke="#5aa0e8" strokeWidth={2.2} strokeDasharray="5 3.5" />
      <circle cx={c} cy={c} r={vb * 0.42} fill="none" stroke="rgba(219,231,255,0.8)" strokeWidth={0.9} />
      <g transform={`translate(${c + vb * 0.24} ${c - vb * 0.3})`}>
        <rect x={-4} y={-3} width={8} height={7} rx={1.4} fill="#e8a24d" />
        <path d="M-2.4 -3 a2.4 2.4 0 0 1 4.8 0" fill="none" stroke="#e8a24d" strokeWidth={1.4} />
      </g>
    </g>
  );
}

function DefenderPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    // Per-quarantined-piece hit: a bubble seals over the frozen piece.
    return (
      <Stage inset="-6%">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-bubble" style={d(delayMs)}><QuarantineBubble vb={40} /></g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(90,160,232,0.16)" delayMs={delayMs} />
      <Prop left="29%" top="31%" width="42%" height="34%">
        <svg viewBox="0 0 116 92" className="h-full w-full">
          <g className="prk-window" style={d(delayMs)}>
            <WindowFrame title="NERFCHESS DEFENDER" bar="#1f6f43" body="#eef6ef" w={116} h={80} accent="#3f7a52">
              {/* the shield being scanned */}
              <path d="M58 20 l16 5 v14 q0 14 -16 20 q-16 -6 -16 -20 V25 Z" fill="#8fd0a0" stroke="#3f7a52" strokeWidth={1.8} strokeLinejoin="round" />
              <path d="M50 40 l6 6 12 -13" fill="none" stroke="#1f6f43" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              {/* the green scan line sweeping down the shield region */}
              <g className="prk-scan" style={d(delayMs + 150)}>
                <rect x={40} y={22} width={36} height={2.6} rx={1.3} fill="#4be08a" />
                <rect x={40} y={22} width={36} height={12} fill="rgba(75,224,138,0.22)" />
              </g>
            </WindowFrame>
          </g>
          {/* THREAT DETECTED toast */}
          <g className="prk-pop" style={d(delayMs + 780)}>
            <rect x={16} y={2} width={84} height={16} rx={4} fill="#e84d5b" />
            <path d="M24 6 l4 8 h-8 Z" fill="#fff" /><circle cx={24} cy={12.6} r={0.9} fill="#e84d5b" />
            <text x={34} y={13} fontSize={7} fontWeight={900} fill="#fff">THREAT DETECTED</text>
          </g>
          <g className="prk-star" style={d(delayMs + 1150)}><Sparkle x={58} y={16} s={1} fill="#4be08a" /></g>
        </svg>
      </Prop>
      <Boom color="rgba(75,224,138,0.7)" delayMs={delayMs + 950} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Captcha Check - select all the horsies, verification fails, padlock     */
/* ------------------------------------------------------------------------- */

function CaptchaPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  if (!lead) {
    return (
      <Stage>
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-pop" style={d(delayMs)}>
            <rect x={9} y={9} width={22} height={26} rx={3} fill="#e8edf6" stroke="#7c88a4" strokeWidth={1.6} />
            <path d="M14 20 v-3 a6 6 0 0 1 12 0 v3" fill="none" stroke="#39435c" strokeWidth={2} />
            <rect x={13} y={20} width={14} height={11} rx={2} fill="#e8a24d" stroke="#a86a1e" strokeWidth={1.4} />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(70,84,116,0.2)" delayMs={delayMs} />
      <Prop left="32%" top="30%" width="36%" height="36%">
        <svg viewBox="0 0 96 100" className="h-full w-full">
          <g className="prk-window" style={d(delayMs)}>
            <rect x={2} y={2} width={92} height={96} rx={4} fill="#eef2f9" stroke="#8895b0" strokeWidth={1.6} />
            <rect x={2} y={2} width={92} height={20} rx={4} fill="#4a76c8" />
            <text x={8} y={11} fontSize={5.4} fontWeight={700} fill="#dbe7ff">Select all squares</text>
            <text x={8} y={18} fontSize={6.6} fontWeight={900} fill="#fff">with a HORSEY</text>
            {/* 3x3 image grid, some ticked */}
            {tiles.map((i) => {
              const gx = 8 + (i % 3) * 27;
              const gy = 27 + Math.floor(i / 3) * 22;
              const horse = i === 1 || i === 3 || i === 8;
              return (
                <g key={i}>
                  <rect x={gx} y={gy} width={24} height={19} rx={2} fill={horse ? "#cfe0f5" : "#dce3f0"} stroke="#9aa8c4" strokeWidth={1} />
                  {horse ? <path d={`M${gx + 7} ${gy + 15} q-1 -8 4 -10 q-2 -2 0 -4 q3 -2 5 1 q3 0 3 4 l-1 9 Z`} fill="#5c6b8c" /> : null}
                  {horse ? (
                    <g className="prk-pop" style={d(delayMs + 300 + i * 90)}>
                      <circle cx={gx + 19} cy={gy + 4.5} r={3.6} fill="#4a76c8" />
                      <path d={`M${gx + 17} ${gy + 4.5} l1.4 1.6 2.6 -3`} stroke="#fff" strokeWidth={1.2} strokeLinecap="round" fill="none" />
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>
          {/* verification fails, a padlock slams on */}
          <g className="prk-stamp" style={d(delayMs + 900)}>
            <rect x={24} y={40} width={48} height={16} rx={3} fill="#e84d5b" />
            <text x={48} y={51.5} fontSize={7.2} fontWeight={900} fill="#fff" textAnchor="middle">FAILED</text>
          </g>
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.65)" delayMs={delayMs + 1050} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. Pop-up Storm - HOT DEALS windows cascade across their half              */
/* ------------------------------------------------------------------------- */

function AdWindow({ tint, label }: { tint: string; label: string }) {
  return (
    <svg viewBox="0 0 74 52" className="h-full w-full">
      <WindowFrame title="AD" bar={tint} body="#fff7ea" w={74} h={52}>
        <text x={37} y={26} fontSize={8} fontWeight={900} fill={tint} textAnchor="middle">{label}</text>
        <text x={37} y={37} fontSize={4.6} fontWeight={700} fill="#b5661f" textAnchor="middle">CLICK HERE NOW!!!</text>
        <rect x={22} y={41} width={30} height={7} rx={3.5} fill="#e8a24d" />
      </WindowFrame>
    </svg>
  );
}

function PopupStormPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage inset="-20%">
        <svg viewBox="0 0 56 56" className="h-full w-full">
          <g className="prk-cascade" style={d(delayMs)}>
            <rect x={10} y={12} width={36} height={26} rx={2.6} fill="#fff7ea" stroke="#a86a1e" strokeWidth={1.6} />
            <rect x={10} y={12} width={36} height={7} rx={2.6} fill="#e8a24d" />
            <text x={28} y={31} fontSize={8} fontWeight={900} fill="#e84d5b" textAnchor="middle">50% OFF</text>
          </g>
        </svg>
      </Stage>
    );
  }
  const ads = [
    { left: "26%", top: "26%", tint: "#e84d5b", label: "FREE!", delay: 0 },
    { left: "50%", top: "30%", tint: "#9147ff", label: "WINNER", delay: 160 },
    { left: "34%", top: "48%", tint: "#e8a24d", label: "HOT", delay: 300 },
    { left: "56%", top: "52%", tint: "#3f7a52", label: "CLAIM", delay: 440 },
    { left: "44%", top: "38%", tint: "#4a76c8", label: "50% OFF", delay: 600 },
  ];
  return (
    <Wide>
      <Wash color="rgba(168,106,30,0.16)" delayMs={delayMs} />
      {ads.map((a, i) => (
        <Prop key={i} left={a.left} top={a.top} width="22%" height="16%" className="prk-cascade" style={d(delayMs + a.delay)}>
          <AdWindow tint={a.tint} label={a.label} />
        </Prop>
      ))}
      <Boom color="rgba(232,77,91,0.6)" delayMs={delayMs + 900} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. Chain Letter - FWD: FWD: FWD: an envelope hops piece to piece           */
/* ------------------------------------------------------------------------- */

function ChainLetterPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    // Per-frozen-piece hit: a forwarded envelope lands and a petal-freeze sets.
    return (
      <Stage inset="-8%">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <g className="prk-hop" style={d(delayMs)}><Envelope x={20} y={20} s={0.8} flap /></g>
          <g className="prk-bubble" style={d(delayMs + 260)}>
            <circle cx={20} cy={20} r={13} fill="rgba(242,144,159,0.16)" stroke="#f2909f" strokeWidth={2} strokeDasharray="4 3" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(242,119,143,0.18)" delayMs={delayMs} />
      <Prop left="28%" top="34%" width="44%" height="26%">
        <svg viewBox="0 0 130 70" className="h-full w-full">
          <g className="prk-window" style={d(delayMs)}>
            <WindowFrame title="MAIL - grandma" bar="#c25b74" body="#fff2f5" w={130} h={40} accent="#a5303b">
              <text x={8} y={24} fontSize={6.6} fontWeight={800} fill="#8a3b52">FWD: FWD: FWD: send to 10 friends</text>
              <text x={8} y={33} fontSize={5.2} fontWeight={600} fill="#b77b8c">...or your knight has bad luck 4ever</text>
            </WindowFrame>
          </g>
          {/* three envelopes hop forward along a chain of arrows */}
          {[0, 1, 2].map((i) => (
            <g key={i} className="prk-hop" style={d(delayMs + 500 + i * 240)}>
              <g transform={`translate(${28 + i * 38} 58)`}><Envelope x={0} y={0} s={0.72} flap /></g>
            </g>
          ))}
          {[0, 1].map((i) => (
            <g key={i} className="prk-linger" style={d(delayMs + 620 + i * 240)}>
              <path d={`M${44 + i * 38} 58 h14`} stroke="#c25b74" strokeWidth={2} strokeLinecap="round" strokeDasharray="3 2.4" />
              <path d={`M${58 + i * 38} 58 l-4 -2.4 v4.8 Z`} fill="#c25b74" />
            </g>
          ))}
        </svg>
      </Prop>
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* 9. Ratio'd - the reply count buries the likes, an arrow bonks it home      */
/* ------------------------------------------------------------------------- */

function RatioPlay({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (!lead) {
    return (
      <Stage inset="-10%">
        <svg viewBox="0 0 48 48" className="h-full w-full">
          <g className="prk-bonk" style={d(delayMs)}>
            <path d="M40 24 H14 M22 15 l-9 9 9 9" fill="none" stroke="#e84d5b" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="prk-star" style={d(delayMs + 380)}>
            <path d="M12 24 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z" fill="#ffd23f" />
          </g>
        </svg>
      </Stage>
    );
  }
  return (
    <Wide>
      <Wash color="rgba(232,77,91,0.18)" delayMs={delayMs} />
      <Prop left="30%" top="30%" width="40%" height="26%">
        <svg viewBox="0 0 120 70" className="h-full w-full">
          {/* the quote-tweet: replies dwarf the likes */}
          <g className="prk-window" style={d(delayMs)}>
            <rect x={4} y={6} width={112} height={44} rx={5} fill="#eef2f9" stroke="#8895b0" strokeWidth={1.6} />
            <circle cx={16} cy={18} r={5} fill="#9aa8c4" />
            <rect x={25} y={13} width={40} height={4} rx={2} fill="#c3cddd" />
            <rect x={25} y={20} width={80} height={4} rx={2} fill="#dce3f0" />
            {/* reply / like counters */}
            <g className="prk-pop" style={d(delayMs + 350)}>
              <path d="M12 40 a4 4 0 0 1 4 -4 h6 a4 4 0 0 1 4 4 v2 l-4 3 v-3 h-6 a4 4 0 0 1 -4 -4 Z" fill="#4a76c8" />
              <text x={30} y={44} fontSize={7} fontWeight={900} fill="#4a76c8">14.2K</text>
            </g>
            <g className="prk-pop" style={d(delayMs + 700)}>
              <path d="M78 38 c-1.4 -2 -4.6 -1.2 -4.6 1 c0 1.7 2.6 3.2 4.6 4.6 c2 -1.4 4.6 -2.9 4.6 -4.6 c0 -2.2 -3.2 -3 -4.6 -1 Z" fill="#c3cddd" />
              <text x={86} y={44} fontSize={6} fontWeight={700} fill="#9aa8c4">102</text>
            </g>
          </g>
          {/* RATIO stamp */}
          <g className="prk-stamp" style={d(delayMs + 950)}>
            <rect x={34} y={52} width={52} height={16} rx={3} fill="#e84d5b" />
            <text x={60} y={63.5} fontSize={8} fontWeight={900} fill="#fff" textAnchor="middle">{"RATIO'D"}</text>
          </g>
        </svg>
      </Prop>
      {/* the bonk-back arrow shoves a piece toward its own side */}
      <Prop left="40%" top="60%" width="20%" height="16%" className="prk-bonk" style={d(delayMs + 500)}>
        <svg viewBox="0 0 60 40" className="h-full w-full">
          <path d="M52 20 H14 M24 9 l-11 11 11 11" fill="none" stroke="#e84d5b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Prop>
      <Boom color="rgba(232,77,91,0.66)" delayMs={delayMs + 1050} />
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

// Zone sources mirror the funnyPlays / core-table conventions: real freeze
// effects read the "frozen" zone; opponent clock hits read "stun"; the flag /
// clock / trap / filter tricks with no mapped board zone are lead-only plays.
// Every `sound` is an existing SigSoundKey.
export const PLAYS: Record<string, SigPlugin> = {
  pr_phishing: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" },
    Render: PhishingPlay,
  },
  pr_donation_alert: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation" },
    Render: RaidPlay,
  },
  pr_bsod: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "stun" },
    Render: BsodPlay,
  },
  pr_forced_update: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", source: "stun" },
    Render: ForcedUpdatePlay,
  },
  pr_defender_scan: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen" },
    Render: DefenderPlay,
  },
  pr_captcha: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze" },
    Render: CaptchaPlay,
  },
  pr_popup_storm: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall" },
    Render: PopupStormPlay,
  },
  pr_chain_letter: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen" },
    Render: ChainLetterPlay,
  },
  pr_ratiod: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege" },
    Render: RatioPlay,
  },
};
