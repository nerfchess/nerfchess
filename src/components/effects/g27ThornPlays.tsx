// g27ThornPlays — bespoke plays for the 27 hex / curse / punishment cards that
// used to share the generated `thornRing` family (one thorn circle, 27 hue
// shifts).
//
// MODULE FICTION: SOMETHING GROWING WHERE IT IS NOT WANTED. Never a thorn ring.
// Every card is a different unwelcome thing taking root on the boards: a fairy
// ring of toadstools popping up in sequence, rust creeping along a seam, a
// bamboo palisade shooting up a file, turf heaving out of the felt, a wasp nest
// swelling and splitting, bindweed strangling a mast, a nettle bed, bulrushes
// crowding a ford, mould furring a rank, bone fangs pushing up through the
// cloth, a slime mould waking, a puffball bursting, foxglove bells, bramble
// fruit, sword grass, a vine bridge knitting itself, a hedge being laid, gnats
// hatching out of compost, ivy sealing a door, an espalier limb reaching, a
// scarecrow that has taken root, a root heaving a plank, a quickset fence
// sprouting, lichen gluing a scabbard shut, a dandelion splitting the path, and
// a yew hedge growing its own archway.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g27ThornPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin / SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the growth happens on
// the square the card was played on. Layers that mean THE BOARD (washes, edge
// rot, a rank band, a file band, the water line at the midline) live inside
// <BoardFrame>, never at a fixed percentage of the stage. Cards whose fiction
// runs from source to target (the wasp's dart, the fang line, the vine bridge,
// the espalier limb, the kicked plank) use <AimStage> and author their art
// pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every scene carries at least one animated
// layer driven by the geometry vars (--fx-side growth direction, --fx-ox/--fx-oy
// lean, --fx-len run length, --fx-aim-x/y travel). All CSS lives in
// g27ThornPlays.css behind the `g27-` prefix.

import "./g27ThornPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Local machinery. Nothing here draws: it positions, delays and stages.
   ========================================================================== */

const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** The caller's stagger rides a CSS var so beat offsets stay composable. */
const rootStyle = (d: number): CSSProperties => ({ "--g27-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g27-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

interface Box {
  /** animation class (plus any extra classes). */
  c: string;
  l?: number;
  t?: number;
  w?: number;
  h?: number;
  /** beat offset in ms. */
  d?: number;
  st?: CSSProperties;
  children?: ReactNode;
}

/** One animated plain layer. */
function L({ c, l = 0, t = 0, w = 100, h = 100, d = 0, st, children }: Box) {
  return (
    <span
      className={`${c} absolute block`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: b(d), ...st }}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({
  c, l = 0, t = 0, w = 100, h = 100, d = 0, vb = "0 0 24 24", par, st, children,
}: Box & { vb?: string; par?: string }) {
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={par}
      className={`${c} absolute block`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: b(d), ...st }}
    >
      {children}
    </svg>
  );
}

/** Static shell carrying a rotation the animated child must not fight over. */
function P({
  l, t, w, h, rot, children,
}: { l: number; t: number; w: number; h: number; rot?: string; children: ReactNode }) {
  return (
    <span
      className="absolute block"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, rotate: rot }}
    >
      {children}
    </span>
  );
}

/** The local (one-square / one-crop) cut: entrance and per-square target. */
function Cut({ d, children }: { d: number; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      {children}
    </span>
  );
}

/** Cast-anchored lead: the growth on the cast square, `frame` over the board. */
function Lead({ d, frame, children }: { d: number; frame?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {frame ? <BoardFrame>{frame}</BoardFrame> : null}
        {children}
      </BoardWideStage>
    </span>
  );
}

/** Aim-anchored lead: `frame` stays square with the board, the art rotates. */
function AimLead({ d, frame, children }: { d: number; frame?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      {frame ? (
        <BoardWideStage>
          <BoardFrame>{frame}</BoardFrame>
        </BoardWideStage>
      ) : null}
      <AimStage>{children}</AimStage>
    </span>
  );
}

/** Board-wide wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g27-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge rot, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g27-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: the bystanders the growth is happening to. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. Echo Chamber (t8) — THE FAIRY RING REPEATS --------------------------
   The felt bruises, one toadstool shoulders up, and then the same toadstool
   sprouts again a ring further out, and again, until the square is ringed by
   copies of the first. Palette: #e0b070 / #fff2d0 / #2b2015. */
const EC_INNER = [0, 90, 180, 270];
const EC_OUTER = [30, 100, 170, 240, 310];

function EchoChamberScene({ role, delayMs }: SceneProps) {
  const cap = (fill: string) => (
    <g {...SJ}>
      <path d="M2.6 12.4C2.6 6.8 6.8 3 12 3s9.4 3.8 9.4 9.4z" fill={fill} stroke="#2b2015" strokeWidth="1.1" />
      <path d="M9.7 12.4h4.6l-.8 8.2h-3z" fill="#fff2d0" stroke="#2b2015" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-ec-cap" l={26} t={30} w={48} h={54} d={40}>{cap("#e0b070")}</V>
        <V c="g27-ec-echo" l={6} t={44} w={34} h={40} d={260}>{cap("#fff2d0")}</V>
        <V c="g27-ec-echo" l={62} t={46} w={34} h={40} d={460}>{cap("#e0b070")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={22} t={22} w={56} h={60} d={0}>{cap("#e0b070")}</V>
        <L c="g27-hit2" l={18} t={70} w={64} h={5} d={140} st={{ borderRadius: "999px", background: "#2b2015" }} />
        <L c="g27-hit" l={10} t={10} w={80} h={80} d={250} st={{ borderRadius: "50%", border: "2px solid #fff2d0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,176,112,0.28)" /><Rim tone="rgba(255,242,208,0.26)" /></>}>
      <L c="g27-leanshade" l={40} t={46} w={20} h={7} d={80} st={{ borderRadius: "50%", background: "rgba(43,32,21,0.6)" }} />
      <V c="g27-spike" l={46} t={40} w={8} h={12} d={140}>{cap("#e0b070")}</V>
      {EC_INNER.map((a, i) => (
        <P key={a} l={39} t={39} w={22} h={22} rot={`${a}deg`}>
          <V c="g27-ec-cap" l={38} t={-16} w={24} h={30} d={220 + i * 70}>{cap("#fff2d0")}</V>
        </P>
      ))}
      {EC_OUTER.map((a, i) => (
        <P key={a} l={33} t={33} w={34} h={34} rot={`${a}deg`}>
          <V c="g27-ec-echo" l={41} t={-11} w={18} h={22} d={440 + i * 60}>{cap("#e0b070")}</V>
        </P>
      ))}
      <L c="g27-ec-ripple" l={30} t={30} w={40} h={40} d={640} st={{ borderRadius: "50%", border: "2px solid #fff2d0" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-spore" l={44 + i * 10} t={44} w={1.6} h={1.6} d={720} st={{ borderRadius: "50%", background: "#fff2d0" }} />
      ))}
    </Lead>
  );
}

/* --- 2. The Iron Ring (t8) — RUST CREEPS THE RIM ----------------------------
   A hairline seam opens around the board's rim, orange rot blooms out of it,
   and iron barbs push up through the scale like a crop. Palette: #c06a34 /
   #ffe6bb / #2a1a12. */
const IR_BARB = "M12 22V8l-4-5 4 1.6L16 3l-4 5";

function IronRingScene({ role, delayMs }: SceneProps) {
  const bloom = (
    <g>
      <circle cx="12" cy="12" r="8" fill="rgba(192,106,52,0.55)" />
      <path d="M12 4.4c3 2.4 5.6 4 6 8-3.4-.6-6.6.8-8.6 3.6-1-3.4-3-4.4-5-6 3 .2 5.4-2.2 7.6-5.6z" fill="#c06a34" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-ir-seam" l={4} t={48} w={92} h={2} d={40} st={{ borderRadius: "999px", background: "#c06a34", transformOrigin: "0% 50%" }} />
        <V c="g27-ir-bloom" l={24} t={26} w={52} h={52} d={260}>{bloom}</V>
        <V c="g27-ir-barb" l={38} t={8} w={24} h={44} d={460}><path d={IR_BARB} fill="none" stroke="#ffe6bb" strokeWidth="2" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hit2" l={6} t={50} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#c06a34" }} />
        <V c="g27-hitside" l={26} t={22} w={48} h={48} d={140}>{bloom}</V>
        <V c="g27-hit" l={38} t={6} w={24} h={50} d={250}><path d={IR_BARB} fill="none" stroke="#ffe6bb" strokeWidth="2.2" {...SJ} /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Rim tone="rgba(192,106,52,0.5)" />
          {[[2, 1, 0], [92, 1, 0], [2, 94, 0], [92, 94, 0]].map(([l, t], i) => (
            <V key={i} c="g27-ir-barb" l={l} t={t} w={6} h={6} d={340 + i * 80}>
              <path d={IR_BARB} fill="none" stroke="#ffe6bb" strokeWidth="2.4" {...SJ} />
            </V>
          ))}
        </>
      }
    >
      <L c="g27-ir-seam" l={30} t={49} w={40} h={1.4} d={80} st={{ borderRadius: "999px", background: "#ffe6bb", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-ir-bloom" l={40 + i * 7} t={42 + (i % 2) * 6} w={10} h={10} d={200 + i * 90}>{bloom}</V>
      ))}
      <L c="g27-leanshade" l={41} t={54} w={18} h={4} d={560} st={{ borderRadius: "999px", background: "rgba(42,26,18,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={43 + i * 6} t={48} w={1.6} h={1.6} d={640} st={{ background: "#c06a34" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Maze of Thorns (t8) — THE LABYRINTH CLOSES --------------------------
   Hedge walls shoot up out of the lanes and lock into a grid, briar hooks
   knit the corners, and one knight is left arcing over the top of the whole
   thing. Palette: #5f9a52 / #fff2d0 / #1b2a17. */
const MZ_WALLS: Array<[number, number, number, number, string]> = [
  [34, 38, 32, 4, "0deg"],
  [56, 38, 22, 4, "90deg"],
  [40, 56, 26, 4, "0deg"],
  [36, 40, 18, 4, "90deg"],
  [50, 30, 16, 4, "90deg"],
];

function MazeOfThornsScene({ role, delayMs }: SceneProps) {
  const wall = (
    <g>
      <rect x="0" y="8" width="24" height="9" rx="1" fill="#5f9a52" />
      <path d="M2 8.4l1.6-3 1.6 3M8 8.4l1.6-3 1.6 3M14 8.4l1.6-3 1.6 3M20 8.4l1.6-3 1.6 3" fill="none" stroke="#1b2a17" strokeWidth="1.1" {...SJ} />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-mz-wall" l={6} t={40} w={88} h={26} d={40} par="none">{wall}</V>
        <V c="g27-mz-brier" l={26} t={16} w={48} h={40} d={260}>
          <path d="M3 20C7 12 14 8 21 6M8 15l-3-2M13 11l-2-3M18 8l-1-3.4" fill="none" stroke="#fff2d0" strokeWidth="1.6" {...SJ} />
        </V>
        <V c="g27-mz-leap" l={34} t={40} w={34} h={48} d={460}><path d={KNIGHT} fill="#fff2d0" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={4} t={44} w={92} h={26} d={0} par="none">{wall}</V>
        <V c="g27-hit" l={28} t={16} w={44} h={38} d={140}>
          <path d="M3 20C7 12 14 8 21 6M8 15l-3-2M13 11l-2-3" fill="none" stroke="#fff2d0" strokeWidth="1.8" {...SJ} />
        </V>
        <L c="g27-hit2" l={16} t={72} w={68} h={4} d={250} st={{ borderRadius: "999px", background: "#1b2a17" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(95,154,82,0.3)" />}>
      {MZ_WALLS.map(([l, t, w, h, rot], i) => (
        <P key={i} l={l} t={t} w={w} h={h} rot={rot}>
          <V c="g27-mz-wall" d={120 + i * 90} par="none">{wall}</V>
        </P>
      ))}
      <V c="g27-mz-brier" l={41} t={38} w={18} h={18} d={520}>
        <path d="M3 20C7 12 14 8 21 6M8 15l-3-2M13 11l-2-3M18 8l-1-3.4" fill="none" stroke="#fff2d0" strokeWidth="1.5" {...SJ} />
      </V>
      <V c="g27-mz-leap" l={43} t={34} w={11} h={14} d={600}><path d={KNIGHT} fill="#fff2d0" stroke="#1b2a17" strokeWidth="1" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={42 + i * 7} t={50} w={1.6} h={2.2} d={700} st={{ background: "#5f9a52" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Sealed Meridian (t8) — THE BAMBOO LINE ------------------------------
   A whole file goes green: culms shoot up one after another, the node joints
   pop as they harden, leaves flick out and a bead of sap seals the seam.
   Palette: #a8c25a / #fff4d6 / #26301a. */
const SM_CULMS = [0, 1, 2, 3, 4];

function SealedMeridianScene({ role, delayMs }: SceneProps) {
  const culm = (
    <g {...SJ}>
      <rect x="9" y="1" width="6" height="22" rx="1" fill="#a8c25a" stroke="#26301a" strokeWidth="0.9" />
      <path d="M9 7h6M9 13h6M9 19h6" stroke="#26301a" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-sm-culm" l={20} t={8} w={22} h={84} d={40} st={{ transformOrigin: "50% 100%" }}>{culm}</V>
        <V c="g27-sm-culm" l={54} t={14} w={22} h={78} d={260} st={{ transformOrigin: "50% 100%" }}>{culm}</V>
        <V c="g27-sm-leaf" l={38} t={22} w={38} h={30} d={460}>
          <path d="M2 18C7 9 14 4 22 3c-.6 8-6 14-14 16z" fill="#fff4d6" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={34} t={6} w={32} h={84} d={0} st={{ transformOrigin: "50% 100%" }}>{culm}</V>
        <V c="g27-hit" l={52} t={26} w={40} h={32} d={140}>
          <path d="M2 18C7 9 14 4 22 3c-.6 8-6 14-14 16z" fill="#fff4d6" />
        </V>
        <L c="g27-hit2" l={40} t={44} w={20} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(168,194,90,0.26)" />
          <L c="g27-sm-file" l={44} t={0} w={12} h={100} d={140} st={{ background: "linear-gradient(90deg, rgba(38,48,26,0.1), rgba(168,194,90,0.45), rgba(38,48,26,0.1))", transformOrigin: "50% 100%" }} />
        </>
      }
    >
      <L c="g27-spike" l={47} t={40} w={6} h={14} d={80} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 100%" }} />
      {SM_CULMS.map((i) => (
        <V key={i} c="g27-sm-culm" l={44.5 + (i % 2) * 5} t={34 + i * 3.4} w={5} h={16} d={180 + i * 80} st={{ transformOrigin: "50% 100%" }}>
          {culm}
        </V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-sm-joint" l={44 + i * 5} t={42 + i * 4} w={7} h={1.4} d={520} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g27-sm-leaf" l={49 + i * 5} t={38 + i * 8} w={9} h={7} d={640}>
          <path d="M2 18C7 9 14 4 22 3c-.6 8-6 14-14 16z" fill="#a8c25a" stroke="#26301a" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <L c="g27-leanshade" l={42} t={56} w={18} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(38,48,26,0.68)" }} />
    </Lead>
  );
}

/* --- 5. Terraform (t8) — THE SOD TAKES --------------------------------------
   Slabs of turf heave up out of the boards like a mole run, grass comes
   through the seams, and a claim stake is driven into the middle of it.
   Palette: #7aa64a / #ffeec4 / #33240f. */
const TF_SODS: Array<[number, number]> = [[38, 44], [48, 48], [57, 43]];

function TerraformScene({ role, delayMs }: SceneProps) {
  const sod = (
    <g {...SJ}>
      <path d="M2 16h20v5H2z" fill="#33240f" />
      <path d="M2 16c2-3 5-4 10-4s8 1 10 4z" fill="#7aa64a" stroke="#33240f" strokeWidth="0.9" />
    </g>
  );
  const stake = (
    <g {...SJ}>
      <path d="M11 3v18" stroke="#33240f" strokeWidth="2" />
      <path d="M11.8 4h9l-2.4 3 2.4 3h-9z" fill="#ffeec4" stroke="#33240f" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-tf-sod" l={6} t={50} w={44} h={34} d={40}>{sod}</V>
        <V c="g27-tf-sod" l={48} t={54} w={44} h={34} d={260}>{sod}</V>
        <V c="g27-tf-stake" l={34} t={10} w={34} h={54} d={460}>{stake}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={10} t={48} w={80} h={38} d={0}>{sod}</V>
        <V c="g27-hit" l={34} t={12} w={34} h={54} d={140}>{stake}</V>
        <L c="g27-hit2" l={16} t={80} w={68} h={4} d={250} st={{ borderRadius: "999px", background: "#33240f" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(122,166,74,0.28)" /><Rim tone="rgba(255,238,196,0.22)" /></>}>
      {TF_SODS.map(([l, t], i) => (
        <V key={i} c="g27-tf-sod" l={l} t={t} w={9} h={7} d={140 + i * 110}>{sod}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-sprout" l={41 + i * 8} t={42} w={6} h={10} d={420 + i * 70}>
          <path d="M12 22V9M12 13C9 12 7 9 6.6 5.4 10 6 12 8.6 12 12zM12 13c3-1 5-4 5.4-7.6C14 6 12 8.6 12 12z" fill="#7aa64a" stroke="#33240f" strokeWidth="0.8" {...SJ} />
        </V>
      ))}
      <V c="g27-tf-stake" l={47} t={36} w={9} h={16} d={600}>{stake}</V>
      <L c="g27-leanshade" l={40} t={55} w={22} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(51,36,15,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={42 + i * 7} t={50} w={1.6} h={1.6} d={700} st={{ background: "#33240f" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Sting of the Wasp (t7) — THE NEST SWELLS AND SPLITS ------------------
   Grey paper builds itself into a nest in three swelling layers, the shell
   cracks along its belly, and the wasp goes out down the line like a thrown
   dart. Aim-staged. Palette: #d2b487 / #ffe8a8 / #2e2313. */
const WN_LAYERS = [0, 1, 2];

function StingOfTheWaspScene({ role, delayMs }: SceneProps) {
  const nest = (
    <g {...SJ}>
      <path d="M12 2c5.4 0 9 4 9 9.4 0 5.6-4 10.6-9 10.6S3 17 3 11.4C3 6 6.6 2 12 2z" fill="#d2b487" stroke="#2e2313" strokeWidth="1.1" />
      <path d="M4.4 8.4c4.6 2 10.6 2 15.2 0M3.6 13c5 2.2 11.8 2.2 16.8 0" fill="none" stroke="#2e2313" strokeWidth="0.8" />
    </g>
  );
  const wasp = (
    <g {...SJ}>
      <path d="M2 12h9l4-3 6 3-6 3-4-3z" fill="#ffe8a8" stroke="#2e2313" strokeWidth="1" />
      <path d="M13 9.4l2.6-4M13 14.6l2.6 4" stroke="#d2b487" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-wn-layer" l={22} t={16} w={56} h={62} d={40}>{nest}</V>
        <L c="g27-wn-split" l={48} t={22} w={3} h={52} d={260} st={{ borderRadius: "999px", background: "#2e2313" }} />
        <V c="g27-wn-dart" l={44} t={40} w={48} h={26} d={460}>{wasp}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={24} t={16} w={52} h={58} d={0}>{nest}</V>
        <V c="g27-hit" l={30} t={38} w={44} h={26} d={140}>{wasp}</V>
        <L c="g27-hit2" l={26} t={20} w={48} h={48} d={250} st={{ borderRadius: "50%", border: "2px solid #ffe8a8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(210,180,135,0.28)" />}>
      {WN_LAYERS.map((i) => (
        <V key={i} c="g27-wn-layer" l={44 - i * 1.6} t={41 - i * 1.8} w={12 + i * 3.2} h={14 + i * 3.6} d={100 + i * 90}>{nest}</V>
      ))}
      <L c="g27-wn-split" l={49.4} t={42} w={1.2} h={14} d={420} st={{ borderRadius: "999px", background: "#2e2313" }} />
      <L c="g27-creep" l={50} t={48.6} w={26} h={1.8} d={480} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffe8a8, rgba(210,180,135,0))", transformOrigin: "0% 50%" }} />
      <V c="g27-wn-dart" l={50} t={44} w={14} h={9} d={560}>{wasp}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-spore" l={45 + i * 6} t={45} w={1.6} h={1.6} d={680} st={{ borderRadius: "50%", background: "#ffe8a8" }} />
      ))}
    </AimLead>
  );
}

/* --- 7. Signal Jam (t6) — THE CREEPER TAKES THE MAST ------------------------
   A signal mast stands over the king's file; bindweed spirals up it a turn at
   a time until the insulator shorts out in a green flash and the leaves keep
   opening over the dead wire. Palette: #8fc27a / #fff4d6 / #1d2b1c. */
function SignalJamScene({ role, delayMs }: SceneProps) {
  const mast = (
    <g fill="none" stroke="#1d2b1c" strokeWidth="1.6" {...SJ}>
      <path d="M12 23V3" />
      <path d="M6 7h12M7.4 11h9.2M8.6 15h6.8" />
    </g>
  );
  const twine = (
    <path d="M12 22c-5-2-5-5 0-7s5-5 0-7 5-4 5-6" fill="none" stroke="#8fc27a" strokeWidth="2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-sj-mast" l={30} t={6} w={40} h={84} d={40}>{mast}</V>
        <V c="g27-sj-twine" l={30} t={20} w={40} h={70} d={260} st={{ transformOrigin: "50% 100%" }}>{twine}</V>
        <L c="g27-sj-short" l={34} t={10} w={32} h={32} d={460} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hit" l={32} t={6} w={36} h={82} d={0}>{mast}</V>
        <V c="g27-hitside" l={32} t={24} w={36} h={64} d={140} st={{ transformOrigin: "50% 100%" }}>{twine}</V>
        <L c="g27-hit2" l={36} t={12} w={28} h={28} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(143,194,122,0.26)" />
          <L c="g27-sj-file" l={44} t={0} w={12} h={100} d={160} st={{ background: "linear-gradient(90deg, rgba(29,43,28,0.05), rgba(143,194,122,0.4), rgba(29,43,28,0.05))", transformOrigin: "50% 100%" }} />
        </>
      }
    >
      <V c="g27-sj-mast" l={45} t={34} w={10} h={22} d={80}>{mast}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-sj-twine" l={45} t={40 + i * 4} w={10} h={14} d={220 + i * 100} st={{ transformOrigin: "50% 100%" }}>{twine}</V>
      ))}
      <L c="g27-sj-short" l={44} t={31} w={12} h={12} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-sj-leaf" l={47 + i * 3.4} t={36 + i * 5} w={7} h={6} d={640}>
          <path d="M2 20C4 11 11 4 21 3c.6 9-5.6 16-15 17z" fill="#8fc27a" stroke="#1d2b1c" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <L c="g27-leanshade" l={42} t={56} w={18} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(29,43,28,0.66)" }} />
    </Lead>
  );
}

/* --- 8. Keep Gate (t5) — THE NETTLE BED ------------------------------------
   The three squares in front of the king fill with nettles: stems shoulder up
   out of the caster's own side, the serrated leaves unroll, and the sting
   hairs catch the light. Palette: #6fae5e / #fff0cc / #1e2b16. */
const KG_STEMS = [0, 1, 2];

function KeepGateScene({ role, delayMs }: SceneProps) {
  const nettle = (
    <g {...SJ}>
      <path d="M12 23V6" stroke="#1e2b16" strokeWidth="1.4" />
      <path d="M12 12c-4 0-6-2-7-5 4-.4 6 1.4 7 5zM12 12c4 0 6-2 7-5-4-.4-6 1.4-7 5zM12 18c-3.4 0-5-1.6-6-4 3.4-.4 5 1 6 4z" fill="#6fae5e" stroke="#1e2b16" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-sprout" l={10} t={20} w={38} h={70} d={40}>{nettle}</V>
        <V c="g27-sprout" l={50} t={16} w={38} h={74} d={260}>{nettle}</V>
        <L c="g27-kg-sting" l={40} t={16} w={5} h={5} d={460} st={{ borderRadius: "50%", background: "#fff0cc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={24} t={14} w={52} h={74} d={0}>{nettle}</V>
        <L c="g27-hit2" l={16} t={78} w={68} h={4} d={140} st={{ borderRadius: "999px", background: "#1e2b16" }} />
        <L c="g27-hit" l={44} t={20} w={10} h={10} d={250} st={{ borderRadius: "50%", background: "#fff0cc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(111,174,94,0.28)" />}>
      <L c="g27-kg-gate" l={38} t={39} w={24} h={2} d={80} st={{ borderRadius: "999px", background: "#fff0cc" }} />
      {KG_STEMS.map((i) => (
        <V key={i} c="g27-sprout" l={41 + i * 8} t={38} w={7} h={14} d={200 + i * 90}>{nettle}</V>
      ))}
      {KG_STEMS.map((i) => (
        <V key={i} c="g27-kg-leaf" l={43 + i * 8} t={42} w={6} h={6} d={440 + i * 70}>
          <path d="M2 20C4 11 11 4 21 3c.6 9-5.6 16-15 17z" fill="#6fae5e" stroke="#1e2b16" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g27-kg-king" l={45.5} t={49} w={9} h={12} d={600}><path d={KING} fill="none" stroke="#fff0cc" strokeWidth="1.3" {...SJ} /></V>
      {[0, 1].map((i) => (
        <L key={i} c="g27-kg-sting" l={44 + i * 9} t={40} w={2} h={2} d={680} st={{ borderRadius: "50%", background: "#fff0cc" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Ford Crossing (t5) — THE REEDS CROWD THE FORD -----------------------
   The midline turns to shallow water and bulrushes come up thick in it, heads
   bursting one after another until the crossing is a single step wide.
   Palette: #b9a24e / #ffeec4 / #1f2a24. */
const FC_REEDS = [0, 1, 2, 3, 4];

function FordCrossingScene({ role, delayMs }: SceneProps) {
  const reed = (
    <g {...SJ}>
      <path d="M12 23V4" stroke="#1f2a24" strokeWidth="1.3" />
      <rect x="9.6" y="2" width="4.8" height="8" rx="2" fill="#b9a24e" stroke="#1f2a24" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-fc-water" l={2} t={58} w={96} h={16} d={40} st={{ background: "linear-gradient(180deg, rgba(185,162,78,0.5), rgba(31,42,36,0.2))" }} />
        <V c="g27-sprout" l={16} t={12} w={30} h={70} d={260}>{reed}</V>
        <V c="g27-fc-head" l={54} t={8} w={30} h={74} d={460}>{reed}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hit2" l={4} t={60} w={92} h={10} d={0} st={{ background: "linear-gradient(180deg, rgba(185,162,78,0.55), transparent)" }} />
        <V c="g27-hitside" l={30} t={8} w={40} h={76} d={140}>{reed}</V>
        <L c="g27-hit" l={26} t={54} w={48} h={16} d={250} st={{ borderRadius: "50%", border: "2px solid #ffeec4" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(185,162,78,0.24)" />
          <L c="g27-fc-water" l={0} t={44} w={100} h={12} d={140} st={{ background: "linear-gradient(180deg, rgba(31,42,36,0.15), rgba(185,162,78,0.42), rgba(31,42,36,0.15))", transformOrigin: "50% 50%" }} />
        </>
      }
    >
      {FC_REEDS.map((i) => (
        <V key={i} c="g27-sprout" l={40 + i * 5} t={38 + (i % 2) * 3} w={5} h={15} d={140 + i * 80}>{reed}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-fc-head" l={42 + i * 7} t={36} w={4.4} h={7} d={460 + i * 70}>{reed}</V>
      ))}
      <L c="g27-fc-ripple" l={38} t={49} w={24} h={7} d={620} st={{ borderRadius: "50%", border: "2px solid #ffeec4" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-spore" l={45 + i * 8} t={44} w={1.6} h={1.6} d={700} st={{ borderRadius: "50%", background: "#ffeec4" }} />
      ))}
    </Lead>
  );
}

/* --- 10. No Homecoming (t5) — THE MOULD BLOOM -------------------------------
   A spore lands on the home rank, and grey-green mould goes through it: four
   patches furring outward until the doorway itself is fuzzed shut. Palette:
   #9fae7a / #ffeecb / #241f19. */
const NH_SPOTS: Array<[number, number]> = [[38, 42], [50, 39], [44, 50], [56, 47]];

function NoHomecomingScene({ role, delayMs }: SceneProps) {
  const spot = (
    <g>
      <circle cx="12" cy="12" r="7.6" fill="rgba(159,174,122,0.55)" />
      <circle cx="12" cy="12" r="4" fill="#9fae7a" />
      <path d="M12 4.4v-2M12 21.6v-2M4.4 12h-2M21.6 12h2M6.6 6.6L5 5M17.4 17.4L19 19M17.4 6.6L19 5M6.6 17.4L5 19" stroke="#241f19" strokeWidth="0.9" {...SJ} />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-nh-drift" l={44} t={4} w={5} h={5} d={40} st={{ borderRadius: "50%", background: "#ffeecb" }} />
        <V c="g27-nh-spot" l={22} t={26} w={54} h={54} d={260}>{spot}</V>
        <L c="g27-nh-fur" l={14} t={18} w={72} h={72} d={460} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(159,174,122,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={24} t={24} w={52} h={52} d={0}>{spot}</V>
        <L c="g27-hit2" l={14} t={14} w={72} h={72} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(159,174,122,0.6), transparent 70%)" }} />
        <L c="g27-hit" l={42} t={42} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(159,174,122,0.26)" />
          <L c="g27-nh-rank" l={0} t={86} w={100} h={14} d={160} st={{ background: "linear-gradient(0deg, rgba(159,174,122,0.5), transparent)", transformOrigin: "50% 100%" }} />
        </>
      }
    >
      {[0, 1].map((i) => (
        <L key={i} c="g27-nh-drift" l={44 + i * 8} t={30} w={1.8} h={1.8} d={70} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      ))}
      {NH_SPOTS.map(([l, t], i) => (
        <V key={i} c="g27-nh-spot" l={l} t={t} w={9} h={9} d={200 + i * 90}>{spot}</V>
      ))}
      <L c="g27-nh-fur" l={36} t={34} w={28} h={26} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(159,174,122,0.55), transparent 70%)" }} />
      <V c="g27-nh-door" l={45} t={41} w={10} h={14} d={600}>
        <path d="M4 22V6.6C4 4 6 3 12 3s8 1 8 3.6V22z" fill="rgba(36,31,25,0.8)" stroke="#9fae7a" strokeWidth="1.3" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-spore" l={42 + i * 8} t={46} w={1.6} h={1.6} d={700} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      ))}
    </Lead>
  );
}

/* --- 11. No Return (t5) — THE FANGS COME UP ---------------------------------
   The felt splits along the border and a row of bone teeth pushes through it,
   every one of them raked the same way, so anything trying to come back is
   turned on the points. Aim-staged. Palette: #e2d3a8 / #fff4d6 / #2a2018. */
const NR_FANGS = [0, 1, 2, 3, 4];

function NoReturnScene({ role, delayMs }: SceneProps) {
  const fang = <path d="M4 22C7.4 15 9.6 8 11 1c2.6 7 5.4 14 9 21z" fill="#e2d3a8" stroke="#2a2018" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-nr-crack" l={4} t={62} w={92} h={2} d={40} st={{ borderRadius: "999px", background: "#2a2018", transformOrigin: "0% 50%" }} />
        <V c="g27-nr-fang" l={14} t={18} w={32} h={50} d={260} st={{ transformOrigin: "50% 100%", rotate: "-14deg" }}>{fang}</V>
        <V c="g27-nr-fang" l={52} t={22} w={32} h={46} d={460} st={{ transformOrigin: "50% 100%", rotate: "-14deg" }}>{fang}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hit2" l={6} t={68} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#2a2018" }} />
        <V c="g27-hitside" l={20} t={18} w={38} h={52} d={140} st={{ transformOrigin: "50% 100%", rotate: "-14deg" }}>{fang}</V>
        <V c="g27-hit" l={52} t={22} w={34} h={48} d={250} st={{ transformOrigin: "50% 100%", rotate: "-14deg" }}>{fang}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(226,211,168,0.26)" />}>
      <L c="g27-nr-crack" l={44} t={50} w={28} h={1.4} d={80} st={{ borderRadius: "999px", background: "#2a2018", transformOrigin: "0% 50%" }} />
      {NR_FANGS.map((i) => (
        <V key={i} c="g27-nr-fang" l={44 + i * 5.4} t={42} w={5} h={9} d={180 + i * 80} st={{ transformOrigin: "50% 100%", rotate: "-16deg" }}>
          {fang}
        </V>
      ))}
      <L c="g27-creep" l={46} t={49.4} w={24} h={1.6} d={520} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4d6, rgba(226,211,168,0))", transformOrigin: "0% 50%" }} />
      <V c="g27-nr-turn" l={58} t={40} w={10} h={10} d={620}>
        <path d="M20 4C20 14 14 19 5 19M5 19l5-4M5 19l5 4" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={45 + i * 7} t={48} w={1.6} h={1.6} d={700} st={{ background: "#e2d3a8" }} />
      ))}
    </AimLead>
  );
}

/* --- 12. Tar Pits (t5) — THE SLIME MOULD WAKES ------------------------------
   Something under the boards blisters up, bubbles swell and burst flat, and
   yellow pseudopods crawl out over the squares and take hold of a pawn.
   Palette: #d8b33a / #ffe9a0 / #1a1408. */
const TP_BUBBLES: Array<[number, number]> = [[42, 44], [51, 41], [46, 50], [56, 46]];

function TarPitsScene({ role, delayMs }: SceneProps) {
  const pseudo = (
    <path d="M2 20c4-1 6-4 6-8s2-6 6-6c3.4 0 6 2 8 5" fill="none" stroke="#d8b33a" strokeWidth="2.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-tp-pool" l={14} t={44} w={72} h={40} d={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, #d8b33a, rgba(26,20,8,0.85) 74%)" }} />
        <L c="g27-tp-bubble" l={36} t={44} w={22} h={22} d={260} st={{ borderRadius: "50%", background: "#ffe9a0" }} />
        <V c="g27-tp-pseudo" l={26} t={14} w={52} h={44} d={460}>{pseudo}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hitside" l={16} t={46} w={68} h={36} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, #d8b33a, rgba(26,20,8,0.8) 72%)" }} />
        <L c="g27-hit" l={38} t={46} w={22} h={22} d={140} st={{ borderRadius: "50%", background: "#ffe9a0" }} />
        <V c="g27-hit2" l={28} t={18} w={46} h={40} d={250}>{pseudo}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,179,58,0.26)" />}>
      <L c="g27-tp-pool" l={38} t={42} w={26} h={16} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, #d8b33a, rgba(26,20,8,0.85) 74%)" }} />
      {TP_BUBBLES.map(([l, t], i) => (
        <L key={i} c="g27-tp-bubble" l={l} t={t} w={4} h={4} d={220 + i * 80} st={{ borderRadius: "50%", background: "#ffe9a0" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-tp-pseudo" l={40 + i * 8} t={40 - i * 2} w={10} h={9} d={440 + i * 70}>{pseudo}</V>
      ))}
      <V c="g27-tp-sink" l={46} t={42} w={9} h={12} d={620}><path d={PAWN} fill="#1a1408" stroke="#ffe9a0" strokeWidth="1" {...SJ} /></V>
      {[0, 1].map((i) => (
        <L key={i} c="g27-spore" l={44 + i * 9} t={44} w={1.8} h={1.8} d={720} st={{ borderRadius: "50%", background: "#ffe9a0" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Fresh Crater (t4) — THE PUFFBALL BURSTS ----------------------------
   A pale dome swells under the last piece that moved, splits along the crown,
   and blows a column of spores straight up; the neighbours stand there in the
   fallout staring at the hole. Palette: #d9cca6 / #fff2d0 / #2b2418. */
const FR_STARE: Array<[number, number]> = [[36, 40], [58, 38], [46, 56]];

function FreshCraterScene({ role, delayMs }: SceneProps) {
  const dome = (
    <g {...SJ}>
      <path d="M2.6 20C2.6 11 6.8 4 12 4s9.4 7 9.4 16z" fill="#d9cca6" stroke="#2b2418" strokeWidth="1.1" />
      <path d="M7 12.6c1.6-1 3-1 4.4 0M13.6 9c1.4-.8 2.6-.6 3.6.4" stroke="#2b2418" strokeWidth="0.8" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-fr-dome" l={22} t={30} w={56} h={56} d={40}>{dome}</V>
        <L c="g27-fr-split" l={48} t={30} w={3} h={30} d={260} st={{ borderRadius: "999px", background: "#2b2418" }} />
        <L c="g27-fr-plume" l={36} t={2} w={28} h={54} d={460} st={{ background: "linear-gradient(0deg, rgba(255,242,208,0.75), transparent)", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={24} t={30} w={52} h={54} d={0}>{dome}</V>
        <L c="g27-hit" l={38} t={6} w={24} h={46} d={140} st={{ background: "linear-gradient(0deg, rgba(255,242,208,0.7), transparent)", transformOrigin: "50% 100%" }} />
        <L c="g27-hit2" l={18} t={62} w={64} h={20} d={250} st={{ borderRadius: "50%", border: "2px solid #d9cca6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(217,204,166,0.28)" />}>
      <V c="g27-fr-dome" l={44} t={42} w={12} h={12} d={80}>{dome}</V>
      <L c="g27-fr-split" l={49.4} t={41} w={1.2} h={9} d={340} st={{ borderRadius: "999px", background: "#2b2418" }} />
      <L c="g27-fr-plume" l={45} t={24} w={10} h={22} d={440} st={{ background: "linear-gradient(0deg, rgba(255,242,208,0.8), transparent)", transformOrigin: "50% 100%" }} />
      <L c="g27-fr-ring" l={36} t={44} w={28} h={12} d={520} st={{ borderRadius: "50%", border: "2px solid #d9cca6" }} />
      {FR_STARE.map(([l, t], i) => (
        <V key={i} c="g27-fr-stare" l={l} t={t} w={8} h={11} d={620 + i * 60}>
          <path d={PAWN} fill="none" stroke="#fff2d0" strokeWidth="1.3" {...SJ} />
        </V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-spore" l={43 + i * 7} t={42} w={1.6} h={1.6} d={720} st={{ borderRadius: "50%", background: "#fff2d0" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Prowler's Bell (t4) — THE FOXGLOVE RINGS ---------------------------
   A foxglove spike shoots up at the gate, and its bells open bottom to top,
   each one giving a tug on its own clapper: nothing crosses the garden
   unannounced. Palette: #b06a9e / #ffe4d0 / #2a1830. */
const PB_BELLS = [0, 1, 2, 3];

function ProwlersBellScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M6 6h12c0 8-2.4 13-6 13S6 14 6 6z" fill="#b06a9e" stroke="#2a1830" strokeWidth="1.1" />
      <path d="M12 19v3" stroke="#ffe4d0" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-spike" l={46} t={16} w={6} h={74} d={40} st={{ borderRadius: "999px", background: "#2a1830", transformOrigin: "50% 100%" }} />
        <V c="g27-pb-bell" l={22} t={40} w={34} h={40} d={260} st={{ transformOrigin: "50% 10%" }}>{bell}</V>
        <V c="g27-pb-bell" l={50} t={22} w={34} h={40} d={460} st={{ transformOrigin: "50% 10%" }}>{bell}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hitside" l={46} t={14} w={6} h={74} d={0} st={{ borderRadius: "999px", background: "#2a1830" }} />
        <V c="g27-hit" l={26} t={30} w={44} h={48} d={140} st={{ transformOrigin: "50% 10%" }}>{bell}</V>
        <L c="g27-hit2" l={16} t={22} w={68} h={68} d={250} st={{ borderRadius: "50%", border: "2px solid #ffe4d0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(176,106,158,0.28)" /><Rim tone="rgba(255,228,208,0.22)" /></>}>
      <L c="g27-spike" l={48} t={34} w={2.4} h={22} d={100} st={{ borderRadius: "999px", background: "#2a1830", transformOrigin: "50% 100%" }} />
      {PB_BELLS.map((i) => (
        <V key={i} c="g27-pb-bell" l={i % 2 ? 50 : 43.6} t={49 - i * 4} w={6.6} h={8} d={260 + i * 90} st={{ transformOrigin: "50% 10%" }}>
          {bell}
        </V>
      ))}
      <L c="g27-pb-clapper" l={47.6} t={44} w={3.6} h={3.6} d={560} st={{ borderRadius: "50%", background: "#ffe4d0" }} />
      <L c="g27-pb-ring" l={36} t={36} w={28} h={28} d={620} st={{ borderRadius: "50%", border: "2px solid #ffe4d0" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-spore" l={45 + i * 8} t={40} w={1.8} h={1.8} d={720} st={{ borderRadius: "50%", background: "#ffe4d0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Bramble Patch (t3) — THE BRAMBLE FRUITS ----------------------------
   Two canes arch out over the chosen squares, tip-root themselves on the far
   side, and load up with berries until the fruit starts dropping on the
   boards. Palette: #7d9a4e / #ffe6c2 / #2a1730. */
const BP_CANES = [0, 1, 2];
const BP_BERRIES: Array<[number, number]> = [[42, 44], [49, 41], [54, 46], [46, 49]];

function BramblePatchScene({ role, delayMs }: SceneProps) {
  const cane = (
    <g fill="none" stroke="#7d9a4e" strokeWidth="2.2" {...SJ}>
      <path d="M2 22C3 12 9 5 22 3" />
      <path d="M6 15l-2.6-1.6M11 9.6l-2-2.4M17 5.6l-1.4-2.6" strokeWidth="1.4" />
    </g>
  );
  const berry = (
    <g>
      <circle cx="9" cy="12" r="4" fill="#2a1730" />
      <circle cx="15" cy="12" r="4" fill="#2a1730" />
      <circle cx="12" cy="7.6" r="4" fill="#2a1730" />
      <circle cx="10.4" cy="10.4" r="1.4" fill="#ffe6c2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-bp-cane" l={4} t={16} w={64} h={70} d={40} st={{ transformOrigin: "0% 100%" }}>{cane}</V>
        <V c="g27-bp-berry" l={50} t={18} w={30} h={30} d={260}>{berry}</V>
        <V c="g27-bp-drop" l={30} t={52} w={26} h={26} d={460}>{berry}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={6} t={18} w={62} h={68} d={0} st={{ transformOrigin: "0% 100%" }}>{cane}</V>
        <V c="g27-hit" l={48} t={20} w={34} h={34} d={140}>{berry}</V>
        <L c="g27-hit2" l={20} t={80} w={60} h={4} d={250} st={{ borderRadius: "999px", background: "#2a1730" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(125,154,78,0.28)" />}>
      {BP_CANES.map((i) => (
        <V key={i} c="g27-bp-cane" l={38 + i * 4} t={38 - i * 2} w={18} h={18} d={140 + i * 90} st={{ transformOrigin: "0% 100%", rotate: `${i * 22 - 16}deg` }}>
          {cane}
        </V>
      ))}
      {BP_BERRIES.map(([l, t], i) => (
        <V key={i} c="g27-bp-berry" l={l} t={t} w={5} h={5} d={420 + i * 70}>{berry}</V>
      ))}
      <V c="g27-bp-drop" l={47} t={50} w={4.4} h={4.4} d={640}>{berry}</V>
      <L c="g27-leanshade" l={41} t={56} w={20} h={4} d={600} st={{ borderRadius: "999px", background: "rgba(42,23,48,0.66)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-drop" l={44 + i * 8} t={48} w={1.8} h={1.8} d={720} st={{ background: "#2a1730" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Restless Blades (t3) — THE SWORD GRASS -----------------------------
   A tuft of coarse grass comes up through the seam and keeps coming: five
   blades stiff as knives, quivering, one of them long enough to cut. Palette:
   #8fc06a / #fff4d6 / #1e2a18. */
const RB_BLADES = [0, 1, 2, 3, 4];

function RestlessBladesScene({ role, delayMs }: SceneProps) {
  const blade = <path d="M12 23C10.4 15 10.4 8 12 1c1.6 7 1.6 14 0 22z" fill="#8fc06a" stroke="#1e2a18" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-rb-tuft" l={30} t={62} w={40} h={16} d={40} st={{ borderRadius: "50%", background: "rgba(30,42,24,0.72)" }} />
        <V c="g27-rb-blade" l={22} t={12} w={26} h={64} d={260} st={{ transformOrigin: "50% 100%", rotate: "-12deg" }}>{blade}</V>
        <V c="g27-rb-blade" l={52} t={10} w={26} h={66} d={460} st={{ transformOrigin: "50% 100%", rotate: "10deg" }}>{blade}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hit2" l={30} t={68} w={40} h={12} d={0} st={{ borderRadius: "50%", background: "rgba(30,42,24,0.7)" }} />
        <V c="g27-hitside" l={30} t={10} w={40} h={64} d={140} st={{ transformOrigin: "50% 100%" }}>{blade}</V>
        <L c="g27-hit" l={12} t={40} w={76} h={3} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,192,106,0.26)" />}>
      <L c="g27-rb-tuft" l={42} t={51} w={16} h={5} d={80} st={{ borderRadius: "50%", background: "rgba(30,42,24,0.7)" }} />
      {RB_BLADES.map((i) => (
        <V key={i} c="g27-rb-blade" l={43 + i * 3.4} t={38} w={5} h={16} d={180 + i * 70} st={{ transformOrigin: "50% 100%", rotate: `${i * 9 - 18}deg` }}>
          {blade}
        </V>
      ))}
      <L c="g27-rb-slice" l={36} t={44} w={28} h={1.6} d={520} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <V c="g27-rb-seed" l={49} t={35} w={6} h={8} d={620}>
        <path d="M12 22V8M12 8c-2.6 0-4-2-4-4.6 2.6 0 4 2 4 4.6zM12 8c2.6 0 4-2 4-4.6-2.6 0-4 2-4 4.6z" fill="#fff4d6" stroke="#1e2a18" strokeWidth="0.8" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={43 + i * 6} t={46} w={1.6} h={2.2} d={700} st={{ background: "#8fc06a" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Rope Bridge (t3) — THE VINE BRIDGE KNITS ---------------------------
   Two tendrils grope out from the bank, meet in the middle and twist together,
   and then plank after plank of woven vine drops into place. The flank ropes
   fray and let go. Aim-staged. Palette: #7fae62 / #ffedc6 / #221c12. */
const VB_PLANKS = [0, 1, 2, 3];

function RopeBridgeScene({ role, delayMs }: SceneProps) {
  const tendril = (
    <path d="M1 18c6 0 8-4 11-8s6-6 11-6" fill="none" stroke="#7fae62" strokeWidth="2.4" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-vb-reach" l={2} t={18} w={58} h={50} d={40} st={{ transformOrigin: "0% 50%" }}>{tendril}</V>
        <V c="g27-vb-reach" l={42} t={30} w={58} h={50} d={260} st={{ transformOrigin: "0% 50%", rotate: "180deg" }}>{tendril}</V>
        <L c="g27-vb-plank" l={30} t={54} w={40} h={7} d={460} st={{ borderRadius: "1px", background: "#ffedc6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={4} t={20} w={56} h={48} d={0} st={{ transformOrigin: "0% 50%" }}>{tendril}</V>
        <L c="g27-hit" l={22} t={52} w={56} h={7} d={140} st={{ borderRadius: "1px", background: "#ffedc6" }} />
        <L c="g27-hit2" l={22} t={68} w={56} h={3} d={250} st={{ borderRadius: "999px", background: "#221c12" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(127,174,98,0.26)" />}>
      {[0, 1].map((i) => (
        <V key={i} c="g27-vb-reach" l={45} t={41 + i * 8} w={20} h={9} d={120 + i * 100} st={{ transformOrigin: "0% 50%", rotate: i ? "0deg" : "-6deg" }}>
          {tendril}
        </V>
      ))}
      <L c="g27-creep" l={46} t={47.6} w={26} h={1.8} d={320} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffedc6, rgba(127,174,98,0))", transformOrigin: "0% 50%" }} />
      {VB_PLANKS.map((i) => (
        <L key={i} c="g27-vb-plank" l={47 + i * 5} t={46} w={4} h={5} d={420 + i * 70} st={{ borderRadius: "1px", background: "#ffedc6" }} />
      ))}
      <V c="g27-vb-fray" l={44} t={52} w={9} h={7} d={640}>
        <path d="M2 6c6 2 12 2 20 6M18 12l4 1M18 12l3-3" fill="none" stroke="#221c12" strokeWidth="1.6" {...SJ} />
      </V>
      {[0, 1].map((i) => (
        <L key={i} c="g27-drop" l={49 + i * 7} t={50} w={1.6} h={2} d={720} st={{ background: "#7fae62" }} />
      ))}
    </AimLead>
  );
}

/* --- 18. Thorn Hedge (t2) — THE HEDGE IS LAID ------------------------------
   A billhook comes down, stakes are driven in along the boundary, and the
   half-cut blackthorn stems are bent over and woven between them. No horse is
   getting through that. Palette: #5e8a46 / #ffeec4 / #2a2114. */
const TH_STAKES = [0, 1, 2, 3];

function ThornHedgeScene({ role, delayMs }: SceneProps) {
  const stake = (
    <g {...SJ}>
      <path d="M12 2v18l-2 3h4l-2-3" fill="#2a2114" stroke="#2a2114" strokeWidth="2" />
      <path d="M8 6l-3-2M16 10l3-2" stroke="#5e8a46" strokeWidth="1.4" />
    </g>
  );
  const bill = (
    <path d="M4 20l10-10c2-2 5-2 6 1 1 3-1 5-4 5" fill="none" stroke="#ffeec4" strokeWidth="2.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-th-bill" l={12} t={6} w={54} h={54} d={40} st={{ transformOrigin: "10% 10%" }}>{bill}</V>
        <V c="g27-th-stake" l={20} t={30} w={26} h={62} d={260}>{stake}</V>
        <V c="g27-th-pleach" l={40} t={48} w={54} h={30} d={460}>
          <path d="M2 20C8 8 16 6 22 8" fill="none" stroke="#5e8a46" strokeWidth="2.6" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hit" l={14} t={6} w={50} h={50} d={0} st={{ transformOrigin: "10% 10%" }}>{bill}</V>
        <V c="g27-hitside" l={30} t={26} w={34} h={64} d={140}>{stake}</V>
        <L c="g27-hit2" l={12} t={78} w={76} h={4} d={250} st={{ borderRadius: "999px", background: "#2a2114" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(94,138,70,0.26)" />}>
      <V c="g27-th-bill" l={38} t={30} w={16} h={16} d={100} st={{ transformOrigin: "10% 10%" }}>{bill}</V>
      {TH_STAKES.map((i) => (
        <V key={i} c="g27-th-stake" l={40 + i * 6} t={40} w={5} h={14} d={200 + i * 90}>{stake}</V>
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g27-th-pleach" l={39 + i * 9} t={45 + i * 3} w={18} h={8} d={480 + i * 80} st={{ transformOrigin: "0% 50%" }}>
          <path d="M2 20C8 8 16 6 22 8" fill="none" stroke="#5e8a46" strokeWidth="2.6" {...SJ} />
        </V>
      ))}
      <L c="g27-leanshade" l={40} t={55} w={22} h={4} d={620} st={{ borderRadius: "999px", background: "rgba(42,33,20,0.66)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-drop" l={44 + i * 8} t={48} w={1.6} h={2} d={700} st={{ background: "#ffeec4" }} />
      ))}
    </Lead>
  );
}

/* --- 19. Gnat Cloud (t2) — THE GNATS HATCH ----------------------------------
   A heap of something rotten swells under the square, fizzes once, and lets
   out a cloud of fungus gnats that will not settle on the same piece twice.
   Palette: #9a8a5c / #ffeec4 / #231b12. */
const GC_GNATS: Array<[number, number]> = [[42, 38], [50, 34], [56, 40], [45, 44], [53, 46], [38, 43]];

function GnatCloudScene({ role, delayMs }: SceneProps) {
  const heap = (
    <path d="M2 21c1.6-7 5-11 10-11s8.4 4 10 11z" fill="#9a8a5c" stroke="#231b12" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-gc-heap" l={16} t={48} w={68} h={40} d={40}>{heap}</V>
        <L c="g27-gc-fizz" l={34} t={38} w={32} h={32} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffeec4, transparent 68%)" }} />
        {[0, 1, 2, 3].map((i) => (
          <L key={i} c="g27-gc-gnat" l={26 + i * 14} t={16 + (i % 2) * 12} w={4} h={4} d={460} st={{ borderRadius: "50%", background: "#231b12" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={18} t={50} w={64} h={38} d={0}>{heap}</V>
        <L c="g27-hit" l={34} t={34} w={32} h={32} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffeec4, transparent 66%)" }} />
        {[0, 1, 2].map((i) => (
          <L key={i} c="g27-hit2" l={28 + i * 18} t={16 + (i % 2) * 10} w={5} h={5} d={250} st={{ borderRadius: "50%", background: "#231b12" }} />
        ))}
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(154,138,92,0.26)" />}>
      <V c="g27-gc-heap" l={42} t={46} w={16} h={11} d={80}>{heap}</V>
      <L c="g27-gc-fizz" l={44} t={42} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffeec4, transparent 68%)" }} />
      {GC_GNATS.map(([l, t], i) => (
        <L key={i} c="g27-gc-gnat" l={l} t={t} w={1.4} h={1.4} d={380 + i * 50} st={{ borderRadius: "50%", background: "#231b12" }} />
      ))}
      <L c="g27-gc-swarm" l={38} t={32} w={24} h={18} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(154,138,92,0.6), transparent 70%)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-spore" l={45 + i * 8} t={44} w={1.6} h={1.6} d={700} st={{ borderRadius: "50%", background: "#ffeec4" }} />
      ))}
    </Lead>
  );
}

/* --- 20. House Arrest (t2) — THE IVY SEALS THE DOOR -------------------------
   Ivy comes over the king's own doorway and stitches it shut, aerial roots
   biting into the joints hard enough to shell the mortar out of them.
   Palette: #4f8a58 / #ffefcc / #25231c. */
const HA_TENDRILS = [0, 1, 2, 3];

function HouseArrestScene({ role, delayMs }: SceneProps) {
  const arch = (
    <path d="M3 22V11a9 9 0 0 1 18 0v11" fill="none" stroke="#25231c" strokeWidth="2.4" {...SJ} />
  );
  const ivy = (
    <g {...SJ}>
      <path d="M2 20C8 18 13 13 16 5" fill="none" stroke="#4f8a58" strokeWidth="2" />
      <path d="M8 15c-2.6-1.4-2-4.6.8-4.6 0 2.8-.8 3.8-.8 4.6zM14 8c-2.6-1.4-2-4.6.8-4.6 0 2.8-.8 3.8-.8 4.6z" fill="#4f8a58" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-ha-arch" l={16} t={12} w={68} h={76} d={40}>{arch}</V>
        <V c="g27-ha-tendril" l={8} t={24} w={52} h={52} d={260} st={{ transformOrigin: "0% 100%" }}>{ivy}</V>
        <V c="g27-ha-tendril" l={44} t={30} w={52} h={52} d={460} st={{ transformOrigin: "0% 100%", rotate: "34deg" }}>{ivy}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hit" l={18} t={12} w={64} h={74} d={0}>{arch}</V>
        <V c="g27-hitside" l={12} t={26} w={54} h={54} d={140} st={{ transformOrigin: "0% 100%" }}>{ivy}</V>
        <L c="g27-hit2" l={22} t={80} w={56} h={4} d={250} st={{ borderRadius: "999px", background: "#25231c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(79,138,88,0.28)" />}>
      <V c="g27-ha-arch" l={43} t={36} w={14} h={18} d={80}>{arch}</V>
      {HA_TENDRILS.map((i) => (
        <V key={i} c="g27-ha-tendril" l={40 + i * 4} t={40 + (i % 2) * 4} w={11} h={11} d={200 + i * 90} st={{ transformOrigin: "0% 100%", rotate: `${i * 26 - 30}deg` }}>
          {ivy}
        </V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-ha-sucker" l={44 + i * 5} t={44 + i * 3} w={2.4} h={2.4} d={500 + i * 60} st={{ borderRadius: "50%", background: "#ffefcc" }} />
      ))}
      <L c="g27-ha-mortar" l={42} t={53} w={18} h={3} d={660} st={{ borderRadius: "999px", background: "#25231c" }} />
      <L c="g27-leanshade" l={41} t={56} w={20} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(37,35,28,0.66)" }} />
    </Lead>
  );
}

/* --- 21. Garden Door (t2) — THE ESPALIER REACHES ----------------------------
   A trained fruit tree on the garden wall puts out one new limb on the slant,
   straight through the doorway it was never supposed to cross, and swells an
   apple on the end of it. Aim-staged. Palette: #8aa858 / #ffe0b0 / #2c2013. */
const GD_BUDS = [0, 1, 2];

function GardenDoorScene({ role, delayMs }: SceneProps) {
  const frame = (
    <g fill="none" stroke="#2c2013" strokeWidth="2.2" {...SJ}>
      <path d="M4 22V5h16v17" />
      <path d="M4 5h16" />
    </g>
  );
  const apple = (
    <g>
      <circle cx="12" cy="14" r="7" fill="#ffe0b0" stroke="#2c2013" strokeWidth="1" />
      <path d="M12 7V3.4M12 5c2-1.6 4-1 4.6.6-1.6 1-3.4.8-4.6-.6z" fill="#8aa858" stroke="#2c2013" strokeWidth="0.9" {...SJ} />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-gd-frame" l={8} t={10} w={54} h={80} d={40}>{frame}</V>
        <V c="g27-gd-limb" l={20} t={34} w={64} h={40} d={260} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 20C8 18 13 12 22 4" fill="none" stroke="#8aa858" strokeWidth="2.6" {...SJ} />
        </V>
        <V c="g27-gd-apple" l={58} t={16} w={32} h={32} d={460}>{apple}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hit" l={10} t={10} w={50} h={78} d={0}>{frame}</V>
        <V c="g27-hitside" l={24} t={34} w={58} h={38} d={140} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 20C8 18 13 12 22 4" fill="none" stroke="#8aa858" strokeWidth="2.6" {...SJ} />
        </V>
        <V c="g27-hit2" l={56} t={20} w={30} h={30} d={250}>{apple}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(138,168,88,0.26)" />}>
      <V c="g27-gd-frame" l={42} t={38} w={14} h={18} d={80}>{frame}</V>
      <V c="g27-gd-limb" l={48} t={40} w={20} h={12} d={240} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 20C8 18 13 12 22 4" fill="none" stroke="#8aa858" strokeWidth="2.6" {...SJ} />
      </V>
      <L c="g27-creep" l={49} t={47.4} w={24} h={1.6} d={320} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffe0b0, rgba(138,168,88,0))", transformOrigin: "0% 50%" }} />
      {GD_BUDS.map((i) => (
        <L key={i} c="g27-gd-bud" l={51 + i * 5} t={45 - i * 2} w={2.2} h={2.2} d={440 + i * 70} st={{ borderRadius: "50%", background: "#8aa858" }} />
      ))}
      <V c="g27-gd-apple" l={64} t={38} w={7} h={7} d={620}>{apple}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g27-drop" l={52 + i * 7} t={48} w={1.6} h={1.6} d={720} st={{ background: "#ffe0b0" }} />
      ))}
    </AimLead>
  );
}

/* --- 22. Garden Scarecrow (t2) — THE SCARECROW ROOTS ------------------------
   Nobody told the straw man he was dead: green shoots come out of his sleeves
   and collar, his hat tips, and the crow gets off him in a hurry. Palette:
   #d8b45c / #fff2d0 / #2c2214. */
const GS_STRAW = [0, 1, 2];

function GardenScarecrowScene({ role, delayMs }: SceneProps) {
  const pole = (
    <g {...SJ}>
      <path d="M12 23V4M4 9h16" stroke="#2c2214" strokeWidth="2.2" />
      <circle cx="12" cy="6" r="3.4" fill="#d8b45c" stroke="#2c2214" strokeWidth="1" />
    </g>
  );
  const crow = (
    <path d="M2 14c4 0 6-2 8-5 1.6 3 4.6 4.4 12 3.6-4 4-9 6.4-13.6 5.2C5 17 3 16 2 14z" fill="#2c2214" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-gs-pole" l={28} t={8} w={44} h={80} d={40}>{pole}</V>
        <V c="g27-gs-straw" l={8} t={26} w={34} h={34} d={260}>
          <path d="M12 22V8M12 12C9 11 7 8 7 4.6c3 .8 5 3.4 5 7.4zM12 12c3-1 5-4 5-7.4-3 .8-5 3.4-5 7.4z" fill="#d8b45c" stroke="#2c2214" strokeWidth="0.8" {...SJ} />
        </V>
        <V c="g27-gs-crow" l={50} t={10} w={44} h={34} d={460}>{crow}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={30} t={8} w={40} h={80} d={0}>{pole}</V>
        <V c="g27-hit" l={50} t={8} w={42} h={32} d={140}>{crow}</V>
        <L c="g27-hit2" l={24} t={82} w={52} h={4} d={250} st={{ borderRadius: "999px", background: "#2c2214" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,180,92,0.26)" />}>
      <V c="g27-gs-pole" l={44} t={34} w={12} h={22} d={80}>{pole}</V>
      {GS_STRAW.map((i) => (
        <V key={i} c="g27-gs-straw" l={42 + i * 7} t={38 + (i % 2) * 4} w={6} h={7} d={220 + i * 90}>
          <path d="M12 22V8M12 12C9 11 7 8 7 4.6c3 .8 5 3.4 5 7.4zM12 12c3-1 5-4 5-7.4-3 .8-5 3.4-5 7.4z" fill="#d8b45c" stroke="#2c2214" strokeWidth="0.8" {...SJ} />
        </V>
      ))}
      <V c="g27-gs-hat" l={45} t={32} w={10} h={6} d={520}>
        <path d="M2 18h20M6 18c0-6 2-9 6-9s6 3 6 9z" fill="#fff2d0" stroke="#2c2214" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g27-gs-crow" l={54} t={30} w={12} h={9} d={600}>{crow}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g27-sprout" l={43 + i * 10} t={49} w={5} h={7} d={680}>
          <path d="M12 22V9M12 13C9 12 7 9 6.6 5.4 10 6 12 8.6 12 12z" fill="#d8b45c" stroke="#2c2214" strokeWidth="0.8" {...SJ} />
        </V>
      ))}
    </Lead>
  );
}

/* --- 23. Loose Floorboard (t2) — THE ROOT LIFTS THE PLANK -------------------
   A root has been swelling under that square for weeks. The board lifts, the
   piece that stood on it is flicked straight back the way it came, and the
   plank slaps down again. Aim-staged. Palette: #a9793f / #ffe8bc / #2a1c10. */
function LooseFloorboardScene({ role, delayMs }: SceneProps) {
  const plank = (
    <g {...SJ}>
      <rect x="1" y="8" width="22" height="8" rx="1" fill="#a9793f" stroke="#2a1c10" strokeWidth="1.1" />
      <path d="M5 8v8M18 8v8" stroke="#2a1c10" strokeWidth="0.8" />
    </g>
  );
  const root = (
    <path d="M1 20c5 0 7-3 10-6s7-4 12-3" fill="none" stroke="#2a1c10" strokeWidth="2.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-lf-bulge" l={8} t={54} w={80} h={38} d={40}>{root}</V>
        <V c="g27-lf-plank" l={16} t={30} w={68} h={34} d={260} st={{ transformOrigin: "10% 100%" }}>{plank}</V>
        <V c="g27-lf-kick" l={38} t={8} w={28} h={38} d={460}><path d={PAWN} fill="#ffe8bc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={10} t={56} w={80} h={34} d={0}>{root}</V>
        <V c="g27-hit" l={16} t={32} w={68} h={32} d={140} st={{ transformOrigin: "10% 100%" }}>{plank}</V>
        <L c="g27-hit2" l={20} t={82} w={60} h={4} d={250} st={{ borderRadius: "999px", background: "#2a1c10" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(169,121,63,0.26)" />}>
      <V c="g27-lf-bulge" l={42} t={46} w={20} h={10} d={90}>{root}</V>
      <V c="g27-lf-plank" l={44} t={41} w={18} h={9} d={300} st={{ transformOrigin: "10% 100%" }}>{plank}</V>
      <V c="g27-lf-kick" l={50} t={38} w={9} h={12} d={480}><path d={PAWN} fill="#ffe8bc" stroke="#2a1c10" strokeWidth="1" {...SJ} /></V>
      <L c="g27-lf-snap" l={44} t={49} w={18} h={2.4} d={600} st={{ borderRadius: "999px", background: "#ffe8bc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={45 + i * 6} t={47} w={1.6} h={1.6} d={700} st={{ background: "#a9793f" }} />
      ))}
    </AimLead>
  );
}

/* --- 24. Garden Fence (t1) — THE QUICKSET TAKES ROOT ------------------------
   The pickets were cut green and they have not given up: they root where they
   were driven, put out leaves along the rail, and knit into something no pawn
   is losing sleep over. Palette: #86b060 / #fff2d0 / #3a2a18. */
const GF_PICKETS = [0, 1, 2, 3, 4];

function GardenFenceScene({ role, delayMs }: SceneProps) {
  const picket = (
    <path d="M8 23V7l4-5 4 5v16z" fill="#3a2a18" stroke="#86b060" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-gf-picket" l={12} t={16} w={26} h={72} d={40}>{picket}</V>
        <V c="g27-gf-picket" l={56} t={12} w={26} h={76} d={260}>{picket}</V>
        <L c="g27-gf-rail" l={6} t={54} w={88} h={7} d={460} st={{ borderRadius: "1px", background: "#fff2d0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={20} t={12} w={30} h={76} d={0}>{picket}</V>
        <V c="g27-hit" l={54} t={16} w={30} h={72} d={140}>{picket}</V>
        <L c="g27-hit2" l={10} t={56} w={80} h={5} d={250} st={{ borderRadius: "1px", background: "#fff2d0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(134,176,96,0.26)" />}>
      {GF_PICKETS.map((i) => (
        <V key={i} c="g27-gf-picket" l={40 + i * 5} t={39} w={4.4} h={14} d={120 + i * 80}>{picket}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g27-gf-leaf" l={42 + i * 7} t={43} w={5} h={5} d={460 + i * 70}>
          <path d="M2 20C4 11 11 4 21 3c.6 9-5.6 16-15 17z" fill="#86b060" stroke="#3a2a18" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <L c="g27-creep" l={40} t={46.6} w={24} h={1.8} d={620} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2d0, rgba(134,176,96,0))", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g27-drop" l={44 + i * 8} t={48} w={1.6} h={1.8} d={700} st={{ background: "#86b060" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Buttoned Scabbard (t1) — THE LICHEN SEALS IT -----------------------
   Grey-green lichen has crusted right across the mouth of the king's
   scabbard. He gets a hand to the hilt, he pulls, and nothing at all happens.
   Palette: #9fbf8e / #ffeecb / #22261e. */
const BS_CRUSTS: Array<[number, number]> = [[44, 42], [50, 45], [46, 48]];

function ButtonedScabbardScene({ role, delayMs }: SceneProps) {
  const sword = (
    <g {...SJ}>
      <path d="M12 2v8" stroke="#ffeecb" strokeWidth="2.2" />
      <path d="M8 10h8" stroke="#ffeecb" strokeWidth="2" />
      <path d="M9.4 11h5.2l-1 11h-3.2z" fill="#22261e" stroke="#9fbf8e" strokeWidth="1.1" />
    </g>
  );
  const crust = (
    <g>
      <circle cx="12" cy="12" r="6.6" fill="#9fbf8e" />
      <circle cx="9" cy="10" r="2.6" fill="#ffeecb" />
      <circle cx="15" cy="14" r="2" fill="#ffeecb" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-bs-sword" l={30} t={6} w={40} h={84} d={40}>{sword}</V>
        <V c="g27-bs-crust" l={22} t={38} w={36} h={36} d={260}>{crust}</V>
        <V c="g27-bs-tug" l={44} t={34} w={36} h={36} d={460}>{crust}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={32} t={6} w={36} h={84} d={0}>{sword}</V>
        <V c="g27-hit" l={26} t={36} w={40} h={40} d={140}>{crust}</V>
        <L c="g27-hit2" l={24} t={34} w={52} h={5} d={250} st={{ borderRadius: "999px", background: "#ffeecb" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,191,142,0.26)" />}>
      <V c="g27-bs-sword" l={45} t={34} w={10} h={22} d={80}>{sword}</V>
      {BS_CRUSTS.map(([l, t], i) => (
        <V key={i} c="g27-bs-crust" l={l} t={t} w={6} h={6} d={220 + i * 90}>{crust}</V>
      ))}
      <V c="g27-bs-tug" l={45} t={33} w={10} h={22} d={520}>{sword}</V>
      <L c="g27-leanshade" l={42} t={56} w={18} h={4} d={620} st={{ borderRadius: "999px", background: "rgba(34,38,30,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-spore" l={44 + i * 6} t={46} w={1.6} h={1.6} d={680} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      ))}
    </Lead>
  );
}

/* --- 26. Garden Gate (t1) — THE DANDELION SPLITS THE PATH -------------------
   A crack runs sideways between the flagstones, a rosette forces itself up
   through it, the flower opens gold, and then the whole clock goes over the
   board on the first breath of wind. Palette: #e8c24a / #fff4d6 / #2a2416. */
const GG_SEEDS = [0, 1, 2, 3];

function GardenGateScene({ role, delayMs }: SceneProps) {
  const bloom = (
    <g>
      <circle cx="12" cy="12" r="5" fill="#e8c24a" />
      <path d="M12 3.4l1.6 3.6 3.6-1.6-1.6 3.6 3.6 1.6-3.6 1.6 1.6 3.6-3.6-1.6L12 20.6l-1.6-3.8-3.6 1.6 1.6-3.6L4.4 12l3.6-1.6-1.6-3.6 3.6 1.6z" fill="#e8c24a" />
    </g>
  );
  const clock = (
    <g fill="none" stroke="#fff4d6" strokeWidth="1.1" {...SJ}>
      <circle cx="12" cy="12" r="7.4" strokeDasharray="1.6 1.8" />
      <path d="M12 12v10" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g27-gg-crack" l={4} t={62} w={92} h={2.4} d={40} st={{ borderRadius: "999px", background: "#2a2416", transformOrigin: "0% 50%" }} />
        <V c="g27-gg-bloom" l={22} t={24} w={44} h={44} d={260}>{bloom}</V>
        <V c="g27-gg-clock" l={52} t={18} w={40} h={40} d={460}>{clock}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g27-hit2" l={6} t={64} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#2a2416" }} />
        <V c="g27-hitside" l={26} t={26} w={48} h={48} d={140}>{bloom}</V>
        <V c="g27-hit" l={28} t={24} w={46} h={46} d={250}>{clock}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,194,74,0.26)" />}>
      <L c="g27-gg-crack" l={40} t={50} w={22} h={1.4} d={90} st={{ borderRadius: "999px", background: "#2a2416", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g27-gg-leaf" l={43 + i * 8} t={47} w={6} h={5} d={240 + i * 80}>
          <path d="M2 16C6 10 13 7 22 8c-3 6-11 9-20 8z" fill="#e8c24a" stroke="#2a2416" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g27-gg-bloom" l={46} t={42} w={8} h={8} d={420}>{bloom}</V>
      <V c="g27-gg-clock" l={45} t={40} w={10} h={10} d={560}>{clock}</V>
      {GG_SEEDS.map((i) => (
        <L key={i} c="g27-spore" l={47 + i * 4} t={42} w={1.6} h={1.6} d={680} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Garden Hedge (t1) — THE YEW ARCH OPENS -----------------------------
   The old yew decides, on its own, to grow itself a doorway: the dark mass
   hollows out into an arch, the queen goes through it without breaking step,
   and the clippings are still coming down behind her. Palette: #3f7a4e /
   #ffeec2 / #1c2418. */
function GardenHedgeScene({ role, delayMs }: SceneProps) {
  const block = (
    <g {...SJ}>
      <rect x="1" y="6" width="22" height="16" rx="1" fill="#3f7a4e" stroke="#1c2418" strokeWidth="1.1" />
      <path d="M3 6.4l1.4-2.6 1.4 2.6M9 6.4l1.4-2.6 1.4 2.6M15 6.4l1.4-2.6 1.4 2.6M20.4 6.4l1.2-2.2" fill="none" stroke="#1c2418" strokeWidth="1" />
    </g>
  );
  const archway = (
    <path d="M6 22V13a6 6 0 0 1 12 0v9z" fill="#1c2418" stroke="#ffeec2" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g27-gh-block" l={4} t={30} w={92} h={54} d={40} par="none">{block}</V>
        <V c="g27-gh-arch" l={32} t={34} w={36} h={52} d={260}>{archway}</V>
        <V c="g27-gh-hop" l={30} t={12} w={40} h={48} d={460}><path d={QUEEN} fill="#ffeec2" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g27-hitside" l={4} t={34} w={92} h={50} d={0} par="none">{block}</V>
        <V c="g27-hit" l={32} t={36} w={36} h={50} d={140}>{archway}</V>
        <L c="g27-hit2" l={18} t={84} w={64} h={4} d={250} st={{ borderRadius: "999px", background: "#1c2418" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(63,122,78,0.28)" />}>
      <V c="g27-gh-block" l={36} t={41} w={28} h={14} d={80} par="none">{block}</V>
      <V c="g27-gh-arch" l={45} t={42} w={10} h={13} d={280}>{archway}</V>
      <V c="g27-gh-hop" l={45} t={38} w={10} h={13} d={480}><path d={QUEEN} fill="#ffeec2" stroke="#1c2418" strokeWidth="1" {...SJ} /></V>
      <V c="g27-gh-sprig" l={54} t={38} w={7} h={7} d={620}>
        <path d="M12 22V6M12 12C9 11 7 8 7 4.6c3 .8 5 3.4 5 7.4zM12 12c3-1 5-4 5-7.4-3 .8-5 3.4-5 7.4z" fill="#3f7a4e" stroke="#1c2418" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g27-leanshade" l={40} t={56} w={22} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(28,36,24,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g27-drop" l={42 + i * 7} t={48} w={1.6} h={2} d={700} st={{ background: "#3f7a4e" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards carry
   no removal diff, so their play is the cast lead on the square they were
   played on, exactly as the generated family resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  hx4_echo_chamber: S(EchoChamberScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  hx4_iron_ring: S(IronRingScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  hx4_maze_of_thorns: S(MazeOfThornsScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast" }),
  hx4_sealed_meridian: S(SealedMeridianScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  ov_terraform: S(TerraformScene, { ordering: "radial", staggerMs: 80, victims: "all", hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_sting_of_the_wasp: S(StingOfTheWaspScene, { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  hx4_signal_jam: S(SignalJamScene, { ordering: "file", staggerMs: 65, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  bn4_keep_gate: S(KeepGateScene, { ordering: "line", staggerMs: 75, victims: ["k"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  hx4_ford_crossing: S(FordCrossingScene, { ordering: "sweep", staggerMs: 65, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast" }),
  hx4_no_homecoming: S(NoHomecomingScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  hx4_no_return: S(NoReturnScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "board" }),
  hx4_tar_pits: S(TarPitsScene, { ordering: "radial", staggerMs: 80, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  hx4_fresh_crater: S(FreshCraterScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  hx4_prowlers_bell: S(ProwlersBellScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  hx4_bramble_patch: S(BramblePatchScene, { ordering: "radial", staggerMs: 85, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  hx4_restless_blades: S(RestlessBladesScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  hx4_rope_bridge: S(RopeBridgeScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "aim" }),
  bn4_thorn_hedge: S(ThornHedgeScene, { ordering: "line", staggerMs: 70, victims: ["n"], hasLead: true, sound: "wall", anchor: "cast" }),
  hx4_gnat_cloud: S(GnatCloudScene, { ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  hx4_house_arrest: S(HouseArrestScene, { ordering: "radial", staggerMs: 65, victims: ["k"], hasLead: true, sound: "wall", anchor: "cast" }),
  op_garden_door: S(GardenDoorScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "aim" }),
  op_garden_scarecrow: S(GardenScarecrowScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }),
  ov_loose_floorboard: S(LooseFloorboardScene, { ordering: "line", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  bn4_garden_fence: S(GardenFenceScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  hx4_buttoned_scabbard: S(ButtonedScabbardScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "petrify", anchor: "cast" }),
  op_garden_gate: S(GardenGateScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  op_garden_hedge: S(GardenHedgeScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "petrifiedforest", anchor: "cast" }),
};
