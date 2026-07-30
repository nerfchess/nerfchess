// g06GroundPlays — bespoke plays for the 30 pawn cards that used to share the
// generated `pawnTide` family (one wave of motes, thirty hue shifts).
//
// MODULE FICTION: THE GROUND THE INFANTRY CROSSES. Never a wave, never a tide
// of sparks. Every card is a piece of TERRAIN doing something to the advance —
// a ford's stepping stones set one at a time, duckboards laid over mud, a
// corduroy road of logs, a scree slope giving way underfoot, a hedgerow cut
// open with billhooks, a stile set into a field wall, a rope bridge planked, a
// snowfield's crust breaking, stubble that will not catch in a sodden furrow,
// a causeway coming up out of a falling tide.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g06GroundPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx (cycle hazard), only the SigPlugin/SigRole TYPES imported.
//
// DIRECTION. Pawns advance AWAY from their owner's home rank, which is the top
// of the screen for one player and the bottom for the other, so nothing here
// says "up" or "down":
//
//   ahead()      places a layer N cells FORWARD of the cast square, forward
//                being `var(--fx-side) * -1` on the screen. Every scene uses
//                it, so the ford is always laid in front of the advance.
//   <Ground>     the shared board frame: the wash, plus the far margin band
//                the infantry is walking toward, found from --fx-side.
//   --fx-index   stones, planks, logs, bags, flags and bars arrive in the REAL
//                victim order, not in a decorative sweep.
//   --fx-len     work staged inside <AimStage> runs the real distance from the
//                cast square to the victim (lane(), and the far-end props).
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"). CSS lives in g06GroundPlays.css, prefix
// `g06-`.

import "./g06GroundPlays.css";

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

type Style = CSSProperties & Record<string, unknown>;
const sty = (o: Style): CSSProperties => o as CSSProperties;

/** The caller's stagger rides a CSS var so beat offsets stay composable. */
const rootStyle = (d: number): CSSProperties => sty({ "--g06-d": `${d}ms` });

/** stagger + this layer's beat, scaled by the Settings animation-speed var. */
const bt = (ms: number): string => `calc(var(--g06-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

/** The same, plus this square's place in the REAL victim order. */
const bx = (ms: number, per: number): string =>
  `calc(var(--g06-d, 0ms) + ${ms}ms * var(--fx-dur, 1) + var(--fx-index, 0) * ${per}ms)`;

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const pc = (n: number): string => `${n.toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS on the stage, `fw` cells FORWARD of the cast square
 * (away from the caster, whichever end of the screen that is) and `sx` cells to
 * the viewer's right. This is the directional primitive of the whole module.
 */
function ahead(w: number, h: number, fw = 0, sx = 0): CSSProperties {
  return {
    left: pc(50 + (sx - w / 2) * CELL),
    top: `calc(${pc(50 - (h / 2) * CELL)} + var(--fx-side, 1) * ${pc(-fw * CELL)})`,
    width: pc(w * CELL),
    height: pc(h * CELL),
  };
}

/** A box `w` x `h` CELLS centred on the cast square, offset in plain cells. */
function box(w: number, h: number, dx = 0, dy = 0): CSSProperties {
  return {
    left: pc(50 + (dx - w / 2) * CELL),
    top: pc(50 + (dy - h / 2) * CELL),
    width: pc(w * CELL),
    height: pc(h * CELL),
  };
}

/**
 * A lane starting AT the cast square and running the real distance to the
 * victim, `thick` cells thick. Authored pointing right; <AimStage> aims it.
 */
function lane(thick: number, dy = 0): CSSProperties {
  return {
    left: "50%",
    top: pc(50 + (dy - thick / 2) * CELL),
    width: "calc(var(--fx-len, 3) * 7.142857%)",
    height: pc(thick * CELL),
  };
}

/** A point at the far end of the run, `w` x `h` cells. */
function farEnd(w: number, h: number, dy = 0): CSSProperties {
  return {
    left: `calc(50% + var(--fx-len, 3) * 7.142857% - ${pc((w / 2) * CELL)})`,
    top: pc(50 + (dy - h / 2) * CELL),
    width: pc(w * CELL),
    height: pc(h * CELL),
  };
}

interface Box {
  /** animation class (plus any extra classes). */
  c: string;
  l?: number;
  t?: number;
  w?: number;
  h?: number;
  /** beat offset in ms. */
  d?: number;
  /** ms per --fx-index step, when this layer waits its turn in victim order. */
  ix?: number;
  st?: CSSProperties;
  children?: ReactNode;
}

/** One animated plain layer. */
function L({ c, l = 0, t = 0, w = 100, h = 100, d = 0, ix, st, children }: Box) {
  return (
    <span
      className={`${c} absolute block`}
      style={{
        left: `${l}%`,
        top: `${t}%`,
        width: `${w}%`,
        height: `${h}%`,
        animationDelay: ix === undefined ? bt(d) : bx(d, ix),
        ...st,
      }}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({ c, l = 0, t = 0, w = 100, h = 100, d = 0, ix, vb = "0 0 24 24", par, st, children }: Box & { vb?: string; par?: string }) {
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={par}
      className={`${c} absolute block`}
      style={{
        left: `${l}%`,
        top: `${t}%`,
        width: `${w}%`,
        height: `${h}%`,
        animationDelay: ix === undefined ? bt(d) : bx(d, ix),
        ...st,
      }}
    >
      {children}
    </svg>
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

/** Cast-anchored lead: action on the cast square, `frame` over the board. */
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
      <BoardWideStage>
        <BoardFrame>{frame}</BoardFrame>
      </BoardWideStage>
      <AimStage>{children}</AimStage>
    </span>
  );
}

/**
 * The board itself, under every lead: the ground colour of the field, and the
 * far margin the advance is walking toward — found from --fx-side, so it is
 * the enemy's home rank for whichever player cast the card.
 */
function Ground({ tone, deep, d = 80 }: { tone: string; deep: string; d?: number }) {
  return (
    <>
      <L c="g06-wash" d={d} st={{ background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 68%)` }} />
      <L
        c="g06-verge"
        d={d + 60}
        h={11}
        st={{
          top: "calc(50% - var(--fx-side, 1) * 44.5%)",
          background: `radial-gradient(ellipse at 50% 50%, ${deep}, transparent 74%)`,
        }}
      />
    </>
  );
}

/** A pawn silhouette, the only figure the module ever draws. */
const PAWN = "M12 4.6a2.6 2.6 0 0 1 1.5 4.7l1.7 6.2H8.8l1.7-6.2A2.6 2.6 0 0 1 12 4.6z M7.6 16.6h8.8V19H7.6z";

/* =============================================================================
   1. Growth Ring (t4) — THE COPPICE STOOL. A stool cut flush with the ground
   opens its annual rings out of the cast square, one ring a year, the bark rim
   closes round the neighbours and sap beads on the cut face.
   Palette: #c8a24e / #ffeec2 / #2a1f0e.
   ========================================================================== */
function GrowthRingScene({ role, delayMs }: SceneProps) {
  const face = <circle cx="12" cy="12" r="10" fill="#2a1f0e" stroke="#c8a24e" strokeWidth="1.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={12} t={72} w={76} h={5} d={40} st={{ background: "#2a1f0e" }} />
        <V c="g06-ent" l={22} t={20} w={56} h={56} d={220}>
          {face}
          <circle cx="12" cy="12" r="6.4" fill="none" stroke="#c8a24e" strokeWidth="1.1" />
          <circle cx="12" cy="12" r="3" fill="#ffeec2" />
        </V>
        <L c="g06-ent3" l={44} t={26} w={12} h={12} d={430} st={{ borderRadius: "50%", background: "#ffeec2" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={8} t={70} w={84} h={7} d={0} st={{ background: "#c8a24e" }} />
        <V c="g06-hit" l={18} t={18} w={64} h={64} d={140}>
          {face}
          <circle cx="12" cy="12" r="5.6" fill="none" stroke="#ffeec2" strokeWidth="1.2" />
        </V>
        <L c="g06-glint" l={44} t={40} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#ffeec2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(200,162,78,0.3)" deep="rgba(42,31,14,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...box(4.6, 1.2, 0, 1.4), borderRadius: "999px", background: "#2a1f0e" }} />
      <V c="g06-gr-face" d={260} st={box(3.4, 3.4)}>
        {face}
      </V>
      {[0, 1, 2].map((i) => (
        <L
          key={i}
          c="g06-gr-ring"
          d={360 + i * 110}
          ix={22}
          st={{ ...box(1.6 + i * 1.1, 1.6 + i * 1.1), borderRadius: "50%", border: "2px solid #c8a24e" }}
        />
      ))}
      <L c="g06-gr-bark" d={620} st={{ ...box(4.2, 4.2), borderRadius: "50%", border: `${pc(0.34 * CELL)} solid #2a1f0e` }} />
      <L c="g06-glint" d={680} st={{ ...box(1.2, 1.2), borderRadius: "50%", background: "#ffeec2" }} />
      <L c="g06-dust" d={740} st={{ ...ahead(4.4, 2.2, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,194,0.5), transparent 72%)" }} />
    </Lead>
  );
}

/* =============================================================================
   2. Mole Tunnels (t4) — THE MOLEHILL RUN. The turf lifts in a travelling
   ridge down the real vector, hills erupt one after another along it, and a
   dark tunnel mouth opens at the far end. Aim-staged.
   Palette: #7a5a3a / #f3dcb4 / #1d1408.
   ========================================================================== */
const MO_HILL = "M2 21c2-7 5.4-11 10-11s8 4 10 11z";

function MoleTunnelScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={74} w={84} h={5} d={40} st={{ background: "#1d1408" }} />
        <V c="g06-ent" l={20} t={34} w={60} h={44} d={220}>
          <path d={MO_HILL} fill="#7a5a3a" stroke="#1d1408" strokeWidth="1.2" {...SJ} />
        </V>
        <V c="g06-ent3" l={38} t={44} w={24} h={24} d={430}>
          <ellipse cx="12" cy="14" rx="6" ry="4.4" fill="#1d1408" stroke="#f3dcb4" strokeWidth="1.2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#7a5a3a" }} />
        <V c="g06-hit" l={16} t={30} w={68} h={50} d={140}>
          <path d={MO_HILL} fill="#f3dcb4" stroke="#1d1408" strokeWidth="1.3" {...SJ} />
        </V>
        <L c="g06-dust" l={30} t={30} w={40} h={30} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(243,220,180,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(122,90,58,0.3)" deep="rgba(29,20,8,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, 0.2), background: "#f3dcb4" }} />
      <L c="g06-mo-ridge" d={250} st={{ ...lane(0.8, 0.2), borderRadius: "999px", background: "linear-gradient(180deg, #7a5a3a, #1d1408)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g06-mo-hill" d={330 + i * 95} ix={26} st={box(1.5, 1.1, i * 1.25 + 0.8, 0.05)}>
          <path d={MO_HILL} fill="#7a5a3a" stroke="#1d1408" strokeWidth="1.3" {...SJ} />
        </V>
      ))}
      <V c="g06-mo-mouth" d={660} st={farEnd(1.8, 1.4, 0.2)}>
        <ellipse cx="12" cy="14" rx="8" ry="5.4" fill="#1d1408" stroke="#f3dcb4" strokeWidth="1.3" />
      </V>
      <L c="g06-dust" d={720} st={{ ...box(4.6, 2, 2, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(243,220,180,0.45), transparent 72%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   3. Cobbler's Bench (t3) — THE HOBNAIL PRINT. The clay softens, a hobnailed
   sole is pressed back into the path stud by stud, the squeezed rim rises
   round it and water seeps into the hollow.
   Palette: #9a7248 / #ffe9c0 / #241a0f.
   ========================================================================== */
const CB_STUDS: Array<[number, number]> = [[-0.35, -0.7], [0.35, -0.7], [-0.4, 0], [0.4, 0], [0, 0.75]];

function HobnailPrintScene({ role, delayMs }: SceneProps) {
  const sole = <path d="M8 2.4h8c1.4 3.4 1.4 7 .6 10.4-.8 3.2-.8 6.6.4 8.8H7c1.2-2.2 1.2-5.6.4-8.8C6.6 9.4 6.6 5.8 8 2.4z" fill="#241a0f" stroke="#9a7248" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={14} t={78} w={72} h={5} d={40} st={{ background: "#241a0f" }} />
        <V c="g06-ent" l={32} t={14} w={36} h={68} d={220}>
          {sole}
        </V>
        <L c="g06-ent3" l={42} t={38} w={16} h={16} d={430} st={{ borderRadius: "50%", background: "#ffe9c0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={8} t={76} w={84} h={7} d={0} st={{ background: "#9a7248" }} />
        <V c="g06-hit" l={30} t={12} w={40} h={72} d={140}>
          {sole}
        </V>
        <L c="g06-soak" l={32} t={34} w={36} h={30} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,192,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(154,114,72,0.3)" deep="rgba(36,26,15,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.2, 1.1, 0.1), borderRadius: "999px", background: "#241a0f" }} />
      <V c="g06-hn-press" d={250} st={ahead(2.2, 3.2, 0.1)}>
        {sole}
      </V>
      {CB_STUDS.map(([x, y], i) => (
        <L key={i} c="g06-hn-stud" d={380 + i * 70} ix={20} st={{ ...ahead(0.34, 0.34, 0.1 - y, x), borderRadius: "50%", background: "#ffe9c0" }} />
      ))}
      <L c="g06-hn-rim" d={620} st={{ ...ahead(2.8, 3.8, 0.1), borderRadius: "50%", border: "2px solid #9a7248" }} />
      <L c="g06-soak" d={690} st={{ ...ahead(1.8, 2.4, 0.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,192,0.55), transparent 70%)" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(3.6, 1.8, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,192,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   4. Coffee Break (t3) — THE QUAKING BOG. The way ahead turns to peat: the
   whole surface shivers, tussocks tremble on it, water lenses up in every
   print and the ground refuses to be walked on.
   Palette: #6f6a44 / #e9e2bc / #1a1a10.
   ========================================================================== */
function QuakingBogScene({ role, delayMs }: SceneProps) {
  const tussock = <path d="M4 21c0-5 2-8 8-8s8 3 8 8zM7 13l-1-5M12 12.4V6M17 13l1-5" fill="#6f6a44" stroke="#1a1a10" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={76} w={80} h={6} d={40} st={{ background: "#1a1a10" }} />
        <V c="g06-ent" l={24} t={28} w={52} h={52} d={220}>
          {tussock}
        </V>
        <L c="g06-ent3" l={34} t={60} w={32} h={14} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #e9e2bc, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={74} w={88} h={8} d={0} st={{ background: "#6f6a44" }} />
        <V c="g06-hit" l={22} t={24} w={56} h={56} d={140}>
          {tussock}
        </V>
        <L c="g06-soak" l={28} t={54} w={44} h={22} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(233,226,188,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(111,106,68,0.32)" deep="rgba(26,26,16,0.55)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.4, 1.1, 0.6), borderRadius: "999px", background: "#1a1a10" }} />
      <L c="g06-bg-quake" d={250} st={{ ...ahead(5.4, 3, 0.6), borderRadius: "999px", background: "linear-gradient(180deg, #6f6a44, #1a1a10)" }} />
      {[-1.5, 0, 1.5].map((x, i) => (
        <V key={i} c="g06-bg-tussock" d={380 + i * 100} ix={24} st={ahead(1.5, 1.5, 0.7, x)}>
          {tussock}
        </V>
      ))}
      <L c="g06-bg-lens" d={640} st={{ ...ahead(2.6, 1.2, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(233,226,188,0.75), transparent 70%)" }} />
      <L c="g06-dust" d={720} st={{ ...ahead(4, 2, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(233,226,188,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   5. Ferry Ticket (t3) — THE FORD. The safe line is read off the current, then
   stepping stones are dropped into it one at a time all the way across, and
   the water breaks white round the last one. Aim-staged: the ford is as long
   as the crossing really is.
   Palette: #6aa8c4 / #e6f4ff / #123040.
   ========================================================================== */
function FordStonesScene({ role, delayMs }: SceneProps) {
  const stone = (fill: string) => <path d="M3 17c1-5 4-8 9-8s9 3 9 8c0 2.2-4 3.4-9 3.4S3 19.2 3 17z" fill={fill} stroke="#123040" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={68} w={88} h={7} d={40} st={{ background: "#123040" }} />
        <V c="g06-ent" l={12} t={34} w={40} h={40} d={220}>
          {stone("#6aa8c4")}
        </V>
        <V c="g06-ent3" l={50} t={40} w={38} h={38} d={430}>
          {stone("#e6f4ff")}
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={62} w={92} h={9} d={0} st={{ background: "linear-gradient(90deg, transparent, #6aa8c4, transparent)" }} />
        <V c="g06-hit" l={22} t={26} w={56} h={50} d={140}>
          {stone("#e6f4ff")}
        </V>
        <L c="g06-ring" l={26} t={40} w={48} h={34} d={260} st={{ borderRadius: "50%", border: "2px solid #6aa8c4" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(106,168,196,0.3)" deep="rgba(18,48,64,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, -0.5), background: "#e6f4ff" }} />
      <L c="g06-fd-current" d={250} st={{ ...lane(1.9), background: "repeating-linear-gradient(90deg, rgba(106,168,196,0.65) 0 6%, rgba(18,48,64,0.5) 6% 11%)" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <V key={i} c="g06-fd-stone" d={330 + i * 85} ix={24} st={box(1.1, 0.9, i * 1.05 + 0.7, i % 2 === 0 ? -0.16 : 0.16)}>
          {stone("#e6f4ff")}
        </V>
      ))}
      <L c="g06-fd-wake" d={680} st={{ ...farEnd(1.6, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(230,244,255,0.85), transparent 68%)" }} />
      <L c="g06-dust" d={740} st={{ ...box(4.4, 2, 1.8, -0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(230,244,255,0.42), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   6. Militia Call (t3) — THE MUSTER GROUND. Grass parts on the caster's own
   home ground, a ring of turf is tramped bare by feet that were not there a
   moment ago, and divots fly off the edge of it.
   Palette: #8e9a5c / #f2ecc4 / #21260f.
   ========================================================================== */
const MC_DIVOTS: Array<[number, number, string, string]> = [
  [-1.7, -0.6, "-160%", "-120%"],
  [1.7, -0.5, "170%", "-130%"],
  [-1.2, 1.2, "-130%", "140%"],
  [1.3, 1.1, "150%", "150%"],
];

function MusterRingScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={74} w={80} h={6} d={40} st={{ background: "#21260f" }} />
        <L c="g06-ent" l={20} t={28} w={60} h={44} d={220} st={{ borderRadius: "50%", border: "4px solid #8e9a5c", background: "rgba(33,38,15,0.6)" }} />
        <V c="g06-ent3" l={40} t={26} w={20} h={44} d={430}>
          <path d={PAWN} fill="#f2ecc4" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#8e9a5c" }} />
        <L c="g06-hit" l={16} t={26} w={68} h={48} d={140} st={{ borderRadius: "50%", border: "4px solid #f2ecc4" }} />
        <L c="g06-glint" l={44} t={42} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#f2ecc4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(142,154,92,0.3)" deep="rgba(33,38,15,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1.1, -1.4), borderRadius: "999px", background: "#21260f" }} />
      <L c="g06-ms-grass" d={240} st={{ ...ahead(5, 2.6, -1.4), borderRadius: "999px", background: "repeating-linear-gradient(90deg, #8e9a5c 0 3%, rgba(33,38,15,0.6) 3% 6%)" }} />
      <L c="g06-ms-bare" d={370} st={{ ...ahead(4, 3, -1.4), borderRadius: "50%", border: `${pc(0.3 * CELL)} solid #21260f`, background: "radial-gradient(circle, rgba(242,236,196,0.3), transparent 72%)" }} />
      {MC_DIVOTS.map(([x, y, sx, sy], i) => (
        <L key={i} c="g06-grit" d={520 + i * 55} st={sty({ ...ahead(0.42, 0.34, -1.4 - y, x), "--sx": sx, "--sy": sy, borderRadius: "1px", background: "#8e9a5c" })} />
      ))}
      <V c="g06-ms-figure" d={640} st={ahead(1.1, 1.7, -1.3)}>
        <path d={PAWN} fill="#f2ecc4" stroke="#21260f" strokeWidth="1.1" />
      </V>
      <L c="g06-dust" d={730} st={{ ...ahead(4.4, 2, -0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,236,196,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   7. Over the Hedge (t3) — THE HEDGEROW GAP. A billhook's shadow falls across
   the quickset, the hedge parts in the middle, brash flies out of the cut and
   the gap stands open on the far field.
   Palette: #4f8a46 / #e8f2c8 / #12240f.
   ========================================================================== */
function HedgeGapScene({ role, delayMs }: SceneProps) {
  const hook = <path d="M4 20l9-9c2-2 5-2 6.6 0 1.4 1.8.6 4-1.6 4.6" fill="none" stroke="#e8f2c8" strokeWidth="2.4" {...SJ} />;
  const brush = "repeating-linear-gradient(78deg, #4f8a46 0 8%, #12240f 8% 15%)";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={54} w={88} h={22} d={40} st={{ background: brush }} />
        <V c="g06-ent" l={24} t={18} w={52} h={52} d={220}>
          {hook}
        </V>
        <L c="g06-ent3" l={42} t={50} w={16} h={26} d={430} st={{ background: "#e8f2c8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={48} w={92} h={20} d={0} st={{ background: brush }} />
        <V c="g06-hit" l={22} t={16} w={56} h={56} d={140}>
          {hook}
        </V>
        <L c="g06-grit" l={44} t={44} w={10} h={8} d={260} st={sty({ "--sx": "150%", "--sy": "-140%", borderRadius: "1px", background: "#4f8a46" })} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(79,138,70,0.3)" deep="rgba(18,36,15,0.55)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.4, 1, 1.4), borderRadius: "999px", background: "#12240f" }} />
      <L c="g06-hg-hedge" d={230} st={{ ...ahead(6.4, 1.5, 1), background: brush }} />
      <L c="g06-hg-cut" d={360} st={{ ...ahead(3, 1.7, 1, -1.6), background: brush, transformOrigin: "0% 50%" }} />
      <L c="g06-hg-cut" d={360} st={{ ...ahead(3, 1.7, 1, 1.6), background: brush, transformOrigin: "100% 50%" }} />
      <V c="g06-hg-hook" d={480} st={ahead(2.2, 2.2, 1.8, 0.6)}>
        {hook}
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-grit" d={600 + i * 60} ix={18} st={sty({ ...ahead(0.4, 0.3, 1, [-0.8, 0.2, 0.9][i]), "--sx": ["-150%", "60%", "170%"][i], "--sy": "calc(var(--fx-side, 1) * -170%)", borderRadius: "1px", background: "#4f8a46" })} />
      ))}
      <L c="g06-dust" d={730} st={{ ...ahead(4.4, 2, 1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(232,242,200,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   8. Stowaway (t3) — THE CULVERT UNDER THE ROAD. A stone arch is found in the
   bank, water threads out of it, and after a while something that has been
   sleeping in the dark comes out into the daylight.
   Palette: #6b7a80 / #e3eee8 / #101a1c.
   ========================================================================== */
function CulvertScene({ role, delayMs }: SceneProps) {
  const arch = <path d="M3 21V13a9 9 0 0 1 18 0v8z" fill="#101a1c" stroke="#6b7a80" strokeWidth="1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={76} w={84} h={6} d={40} st={{ background: "#6b7a80" }} />
        <V c="g06-ent" l={22} t={26} w={56} h={52} d={220}>
          {arch}
        </V>
        <V c="g06-ent3" l={40} t={42} w={20} h={36} d={430}>
          <path d={PAWN} fill="#e3eee8" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={74} w={88} h={8} d={0} st={{ background: "#6b7a80" }} />
        <V c="g06-hit" l={18} t={22} w={64} h={58} d={140}>
          {arch}
        </V>
        <L c="g06-soak" l={36} t={62} w={28} h={16} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(227,238,232,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(107,122,128,0.3)" deep="rgba(16,26,28,0.55)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.2, 1, 0.9), borderRadius: "999px", background: "#101a1c" }} />
      <L c="g06-cu-bank" d={240} st={{ ...ahead(5.6, 2.2, 1.3), background: "linear-gradient(180deg, #6b7a80, #101a1c)" }} />
      <V c="g06-cu-arch" d={370} st={ahead(2.2, 1.8, 0.9)}>
        {arch}
      </V>
      <L c="g06-cu-trickle" d={500} st={{ ...ahead(0.36, 2.4, -0.1), borderRadius: "999px", background: "linear-gradient(180deg, #e3eee8, transparent)" }} />
      <V c="g06-cu-creep" d={630} st={ahead(1, 1.5, 0.4)}>
        <path d={PAWN} fill="#e3eee8" stroke="#101a1c" strokeWidth="1.1" />
      </V>
      <L c="g06-dust" d={730} st={{ ...ahead(3.8, 1.8, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(227,238,232,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   9. Fear of Open Ground (t3) — THE PARED HEATH. The turf is pared off the
   file in strips and stacked away; what is left is bare pale ground with one
   marker post on it and nowhere at all to stand unseen.
   Palette: #cbbf9a / #fff2d4 / #3a3524.
   ========================================================================== */
function ParedHeathScene({ role, delayMs }: SceneProps) {
  const post = (
    <>
      <path d="M11 22V4h2v18z" fill="#3a3524" />
      <path d="M13 5h7l-2.4 2.6L20 10h-7z" fill="#cbbf9a" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={76} w={80} h={6} d={40} st={{ background: "#3a3524" }} />
        <V c="g06-ent" l={32} t={16} w={36} h={64} d={220}>
          {post}
        </V>
        <L c="g06-ent3" l={16} t={58} w={68} h={14} d={430} st={{ borderRadius: "999px", background: "#cbbf9a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={9} d={0} st={{ background: "#cbbf9a" }} />
        <V c="g06-hit" l={30} t={14} w={40} h={68} d={140}>
          {post}
        </V>
        <L c="g06-dust" l={22} t={40} w={56} h={34} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,212,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(203,191,154,0.3)" deep="rgba(58,53,36,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1, 0.4), borderRadius: "999px", background: "#3a3524" }} />
      <L c="g06-op-bare" d={250} st={{ ...ahead(5, 3.4, 0.4), background: "radial-gradient(ellipse at 50% 50%, #cbbf9a, rgba(203,191,154,0.15) 72%)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g06-op-turf" d={360 + i * 90} ix={26} st={{ ...ahead(4.6, 0.5, 1.4 - i * 0.72), background: "#3a3524", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g06-op-post" d={640} st={ahead(0.9, 2.2, 0.4, 1.5)}>
        {post}
      </V>
      <L c="g06-dust" d={730} st={{ ...ahead(4.6, 2, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,212,0.45), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   10. Pillow Fort (t3) — THE STOOKED SHEAVES. The field's own crop is cut and
   stood up in stooks all round the square: a lance will not come through
   straw, though a boot walks straight in.
   Palette: #d8b567 / #fff0c6 / #2f2412.
   ========================================================================== */
const PF_STOOKS: Array<[number, number]> = [[-1.7, -0.9], [0, -1.5], [1.7, -0.9], [-1.6, 0.9], [1.6, 0.9]];
const PF_SHEAF = "M12 2l4.4 9.6L20 21H4l3.6-9.4z M7 12.6h10";

function StookedSheavesScene({ role, delayMs }: SceneProps) {
  const sheaf = <path d={PF_SHEAF} fill="#d8b567" stroke="#2f2412" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={78} w={80} h={5} d={40} st={{ background: "#2f2412" }} />
        <V c="g06-ent" l={26} t={18} w={48} h={62} d={220}>
          {sheaf}
        </V>
        <L c="g06-ent3" l={34} t={30} w={32} h={32} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff0c6, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={76} w={88} h={7} d={0} st={{ background: "#d8b567" }} />
        <V c="g06-hit" l={24} t={14} w={52} h={68} d={140}>
          {sheaf}
        </V>
        <L c="g06-glint" l={42} t={36} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "#fff0c6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(216,181,103,0.3)" deep="rgba(47,36,18,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...box(5, 1.2, 0, 1.5), borderRadius: "999px", background: "#2f2412" }} />
      {PF_STOOKS.map(([x, y], i) => (
        <V key={i} c="g06-pf-stook" d={260 + i * 85} ix={22} st={box(1.5, 2, x, y)}>
          {sheaf}
        </V>
      ))}
      <L c="g06-pf-straw" d={620} st={{ ...box(5.4, 0.7, 0, 1.2), borderRadius: "999px", background: "repeating-linear-gradient(74deg, #d8b567 0 8%, rgba(47,36,18,0.5) 8% 14%)" }} />
      <L c="g06-glint" d={680} st={{ ...box(1.4, 1.4), borderRadius: "50%", background: "radial-gradient(circle, #fff0c6, transparent 72%)" }} />
      <L c="g06-dust" d={740} st={{ ...ahead(4.6, 2.2, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,198,0.45), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   11. Sandbags (t3) — THE EARTH PUT IN SACKS. A spade cuts a slot in the turf,
   the ground goes into bags, and the bags are laid in a course across the way
   and rammed flat.
   Palette: #b39366 / #f6e4bd / #2b2314.
   ========================================================================== */
function SandbagScene({ role, delayMs }: SceneProps) {
  const bag = (fill: string) => <path d="M4 9c0-2.4 3.6-4 8-4s8 1.6 8 4v8c0 2.4-3.6 4-8 4s-8-1.6-8-4z" fill={fill} stroke="#2b2314" strokeWidth="1.3" {...SJ} />;
  const spade = <path d="M12 2v11M8 13h8l-4 8z" fill="#f6e4bd" stroke="#2b2314" strokeWidth="1.4" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={78} w={80} h={5} d={40} st={{ background: "#2b2314" }} />
        <V c="g06-ent" l={20} t={44} w={60} h={34} d={220}>
          {bag("#b39366")}
        </V>
        <V c="g06-ent3" l={34} t={8} w={32} h={44} d={430}>
          {spade}
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={76} w={88} h={7} d={0} st={{ background: "#b39366" }} />
        <V c="g06-hit" l={16} t={34} w={68} h={44} d={140}>
          {bag("#f6e4bd")}
        </V>
        <L c="g06-glint" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#f6e4bd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(179,147,102,0.3)" deep="rgba(43,35,20,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.6, 0.9, -0.9), borderRadius: "999px", background: "#2b2314" }} />
      <V c="g06-sb-spade" d={240} st={ahead(1.4, 2.2, -0.6, -1.9)}>
        {spade}
      </V>
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g06-sb-bag" d={360 + i * 85} ix={24} st={ahead(1.4, 0.9, 0.4, i * 1.3 - 1.95)}>
          {bag(i % 2 === 0 ? "#b39366" : "#f6e4bd")}
        </V>
      ))}
      <L c="g06-sb-ram" d={660} st={{ ...ahead(5.4, 0.34, 0.95), borderRadius: "999px", background: "#f6e4bd" }} />
      <L c="g06-dust" d={730} st={{ ...ahead(5, 2, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,228,189,0.45), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   12. Day Laborer (t2) — THE DUCKBOARDS. Mud all the way, and a hired hand
   laying duckboards over it board by board for as long as the wage lasts.
   Aim-staged: the boards run the real distance.
   Palette: #8a6b46 / #f0dcb2 / #1c150c.
   ========================================================================== */
function DuckboardScene({ role, delayMs }: SceneProps) {
  const board = (
    <g stroke="#1c150c" strokeWidth="1.2">
      <rect x="2" y="6" width="20" height="12" fill="#8a6b46" />
      <path d="M6 6v12M10 6v12M14 6v12M18 6v12" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={72} w={84} h={9} d={40} st={{ background: "#1c150c" }} />
        <V c="g06-ent" l={16} t={30} w={68} h={42} d={220} vb="0 0 24 24">
          {board}
        </V>
        <L c="g06-ent3" l={38} t={62} w={24} h={12} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f0dcb2, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={70} w={92} h={10} d={0} st={{ background: "#8a6b46" }} />
        <V c="g06-hit" l={12} t={28} w={76} h={44} d={140}>
          {board}
        </V>
        <L c="g06-soak" l={30} t={58} w={40} h={18} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,220,178,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(138,107,70,0.3)" deep="rgba(28,21,12,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, 0.5), background: "#f0dcb2" }} />
      <L c="g06-dl-mud" d={240} st={{ ...lane(1.7, 0.1), background: "linear-gradient(180deg, #1c150c, #4a3a22 60%, #1c150c)" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <V key={i} c="g06-dl-board" d={340 + i * 80} ix={22} st={box(1.1, 1.3, i * 1.05 + 0.7, 0)}>
          {board}
        </V>
      ))}
      <L c="g06-dl-splash" d={660} st={{ ...farEnd(1.5, 0.9, 0.55), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,220,178,0.7), transparent 70%)" }} />
      <L c="g06-dust" d={730} st={{ ...box(4.2, 1.8, 1.6, -0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,220,178,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   13. Field Stitches (t2) — THE DIVOT PUT BACK. A hole in the caster's own
   second rank has the missing turf dropped back into it, the seam is stitched
   across and the whole patch is trodden level.
   Palette: #7f9a52 / #eef3c6 / #1d2610.
   ========================================================================== */
function FieldStitchScene({ role, delayMs }: SceneProps) {
  const turf = <path d="M2.5 8h19v10c0 1.6-4.2 2.6-9.5 2.6S2.5 19.6 2.5 18z" fill="#7f9a52" stroke="#1d2610" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={74} w={80} h={7} d={40} st={{ background: "#1d2610" }} />
        <V c="g06-ent" l={18} t={28} w={64} h={48} d={220}>
          {turf}
        </V>
        <L c="g06-ent3" l={26} t={48} w={48} h={5} d={430} st={{ background: "#eef3c6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#7f9a52" }} />
        <V c="g06-hit" l={14} t={24} w={72} h={52} d={140}>
          {turf}
        </V>
        <L c="g06-fs-stitch" l={24} t={46} w={52} h={5} d={260} st={{ background: "#eef3c6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(127,154,82,0.3)" deep="rgba(29,38,16,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.2, 2.2, -1.4), background: "#1d2610" }} />
      <V c="g06-fs-divot" d={250} st={ahead(3, 2, -1.4)}>
        {turf}
      </V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g06-fs-stitch" d={370 + i * 80} ix={24} st={{ ...ahead(0.24, 1.1, -1.4, i * 0.8 - 1.2), background: "#eef3c6" }} />
      ))}
      <L c="g06-fs-tread" d={640} st={{ ...ahead(3.6, 0.4, -2.3), borderRadius: "999px", background: "#7f9a52" }} />
      <L c="g06-dust" d={720} st={{ ...ahead(3.8, 1.8, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(238,243,198,0.45), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   14. Half Step Back (t2) — THE STEP CUT BACK. A riser is cut into the bank
   one square BEHIND the advance, spoil thrown forward off the blade, and the
   ground now allows exactly one pace the wrong way.
   Palette: #a08658 / #f4e3bb / #241b0e.
   ========================================================================== */
function StepCutScene({ role, delayMs }: SceneProps) {
  const step = <path d="M2 21V13h7V7h6V3h7v18z" fill="#a08658" stroke="#241b0e" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={78} w={80} h={5} d={40} st={{ background: "#241b0e" }} />
        <V c="g06-ent" l={18} t={24} w={64} h={56} d={220}>
          {step}
        </V>
        <L c="g06-ent3" l={20} t={40} w={22} h={8} d={430} st={{ borderRadius: "999px", background: "#f4e3bb" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={76} w={88} h={7} d={0} st={{ background: "#a08658" }} />
        <V c="g06-hit" l={14} t={20} w={72} h={60} d={140}>
          {step}
        </V>
        <L c="g06-grit" l={20} t={40} w={9} h={7} d={260} st={sty({ "--sx": "-140%", "--sy": "calc(var(--fx-side, 1) * -150%)", borderRadius: "1px", background: "#f4e3bb" })} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(160,134,88,0.3)" deep="rgba(36,27,14,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.8, 0.9, -0.6), borderRadius: "999px", background: "#241b0e" }} />
      <L c="g06-hs-bank" d={240} st={{ ...ahead(4.6, 2.4, -1.1), background: "linear-gradient(180deg, #a08658, #241b0e)" }} />
      <V c="g06-hs-riser" d={380} st={ahead(2.6, 1.9, -1.1)}>
        {step}
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-grit" d={520 + i * 60} ix={20} st={sty({ ...ahead(0.4, 0.32, -0.4, [-0.9, 0.1, 1][i]), "--sx": ["-130%", "40%", "150%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)", borderRadius: "1px", background: "#f4e3bb" })} />
      ))}
      <L c="g06-glint" d={660} st={{ ...ahead(1.1, 1.1, -1.1), borderRadius: "50%", background: "#f4e3bb" }} />
      <L c="g06-dust" d={730} st={{ ...ahead(4, 1.8, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(244,227,187,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   15. Slow Doors (t2) — THE SNOW CRUST. A wind-hardened crust lies over the
   whole way forward. It holds for exactly one step, then cracks run out of the
   print and a leg goes through to the knee.
   Palette: #a9c6d6 / #f2fbff / #24333c.
   ========================================================================== */
const SD_CRACKS = ["M12 12L2 3", "M12 12l10-8", "M12 12L3 21", "M12 12l9 8"];

function SnowCrustScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={74} w={80} h={7} d={40} st={{ background: "#24333c" }} />
        <L c="g06-ent" l={18} t={30} w={64} h={40} d={220} st={{ borderRadius: "2px", background: "linear-gradient(180deg, #f2fbff, #a9c6d6)" }} />
        <V c="g06-ent3" l={26} t={30} w={48} h={40} d={430}>
          <g stroke="#24333c" strokeWidth="1.4" fill="none">
            {SD_CRACKS.map((p, i) => (
              <path key={i} d={p} />
            ))}
          </g>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#a9c6d6" }} />
        <L c="g06-hit" l={16} t={26} w={68} h={44} d={140} st={{ borderRadius: "2px", background: "linear-gradient(180deg, #f2fbff, #a9c6d6)" }} />
        <L c="g06-sd-punch" l={40} t={40} w={20} h={22} d={260} st={{ borderRadius: "50%", background: "#24333c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(169,198,214,0.3)" deep="rgba(36,51,60,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1, 1), borderRadius: "999px", background: "#24333c" }} />
      <L c="g06-sd-crust" d={250} st={{ ...ahead(5, 3.2, 0.7), borderRadius: "2px", background: "linear-gradient(180deg, #f2fbff, #a9c6d6 70%, #24333c)" }} />
      <V c="g06-sd-crack" d={400} st={ahead(4.4, 3, 0.7)}>
        <g stroke="#24333c" strokeWidth="1" fill="none">
          {SD_CRACKS.map((p, i) => (
            <path key={i} d={p} />
          ))}
        </g>
      </V>
      <L c="g06-sd-punch" d={560} st={{ ...ahead(1.1, 1.3, 0.7), borderRadius: "50%", background: "#24333c" }} />
      <L c="g06-glint" d={640} st={{ ...ahead(1.3, 1.3, 1.6, 1.2), borderRadius: "50%", background: "#f2fbff" }} />
      <L c="g06-dust" d={730} st={{ ...ahead(5, 2, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,251,255,0.5), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   16. Spare Button (t2) — THE PEBBLE IN THE GRAVEL. Frost works one rounded
   pebble up out of the road metal until it stands proud of the surface, ready
   to be picked out and pocketed.
   Palette: #a9a196 / #f4ecdc / #2a2620.
   ========================================================================== */
function PebbleScene({ role, delayMs }: SceneProps) {
  const gravel = "repeating-radial-gradient(circle at 20% 40%, #a9a196 0 2%, rgba(42,38,32,0.8) 2% 4%)";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={64} w={84} h={18} d={40} st={{ background: gravel }} />
        <L c="g06-ent" l={38} t={34} w={24} h={22} d={220} st={{ borderRadius: "50%", background: "#f4ecdc" }} />
        <L c="g06-ent3" l={34} t={30} w={32} h={30} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(244,236,220,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={62} w={88} h={20} d={0} st={{ background: gravel }} />
        <L c="g06-hit" l={36} t={30} w={28} h={26} d={140} st={{ borderRadius: "50%", background: "#f4ecdc" }} />
        <L c="g06-glint" l={44} t={34} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#f4ecdc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(169,161,150,0.3)" deep="rgba(42,38,32,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(3.6, 1, 0.5), borderRadius: "999px", background: "#2a2620" }} />
      <L c="g06-pb-bed" d={240} st={{ ...ahead(4.6, 2.4, 0.5), background: gravel }} />
      <L c="g06-pb-work" d={390} st={{ ...ahead(1.2, 1.1, 0.5), borderRadius: "50%", background: "#f4ecdc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-grit" d={520 + i * 60} ix={18} st={sty({ ...ahead(0.34, 0.3, 0.5, [-1, 0.2, 1.1][i]), "--sx": ["-140%", "50%", "160%"][i], "--sy": "calc(var(--fx-side, 1) * -140%)", borderRadius: "50%", background: "#a9a196" })} />
      ))}
      <L c="g06-glint" d={660} st={{ ...ahead(1.6, 1.6, 0.5), borderRadius: "50%", background: "radial-gradient(circle, #f4ecdc, transparent 70%)" }} />
      <L c="g06-dust" d={730} st={{ ...ahead(3.6, 1.6, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(244,236,220,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   17. Vaulting Pole (t2) — THE DYKE AND THE LEAPING POLE. A drainage dyke
   opens across the way, the pole goes into the mud at the near lip and bends,
   and a landing print appears on the far bank. Aim-staged.
   Palette: #5f8f7a / #e6f6e6 / #14261f.
   ========================================================================== */
function VaultingDykeScene({ role, delayMs }: SceneProps) {
  const pole = <path d="M20 2L5 22" stroke="#e6f6e6" strokeWidth="2.4" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={62} w={88} h={16} d={40} st={{ background: "#14261f" }} />
        <V c="g06-ent" l={22} t={12} w={56} h={64} d={220}>
          {pole}
        </V>
        <L c="g06-ent3" l={58} t={58} w={26} h={12} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #5f8f7a, transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={58} w={92} h={18} d={0} st={{ background: "#14261f" }} />
        <V c="g06-hit" l={20} t={10} w={60} h={68} d={140}>
          {pole}
        </V>
        <L c="g06-soak" l={30} t={56} w={40} h={18} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(230,246,230,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(95,143,122,0.3)" deep="rgba(20,38,31,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, -0.6), background: "#e6f6e6" }} />
      <L c="g06-vp-dyke" d={250} st={{ ...lane(1.6, 0.1), background: "linear-gradient(180deg, #14261f, #2f5c4c 55%, #14261f)", border: "1px solid #5f8f7a" }} />
      <V c="g06-vp-pole" d={390} st={box(2.6, 3.4, 0.8, -1)}>
        {pole}
      </V>
      <L c="g06-vp-print" d={560} st={{ ...farEnd(1.2, 0.9, -0.05), borderRadius: "50%", background: "#e6f6e6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-grit" d={620 + i * 55} ix={18} st={sty({ ...box(0.36, 0.3, 0.8 + i * 0.5, 0.6), "--sx": ["-120%", "60%", "150%"][i], "--sy": "calc(var(--fx-side, 1) * -150%)", borderRadius: "1px", background: "#5f8f7a" })} />
      ))}
      <L c="g06-dust" d={740} st={{ ...box(4, 1.8, 1.8, -1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(230,246,230,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   18. Bridge Toll (t2) — THE ROPE BRIDGE PLANKED. Two ropes are drawn taut
   over the gap, planks are laid along them one at a time, and then a toll bar
   drops across the near end and everything above a certain rank stops.
   Palette: #ab8a5c / #f6e6c0 / #221a10.
   ========================================================================== */
function RopeBridgeScene({ role, delayMs }: SceneProps) {
  const ropes = (
    <g stroke="#ab8a5c" strokeWidth="1.8" fill="none" {...SJ}>
      <path d="M1 5c8 6 14 6 22 0" />
      <path d="M1 19c8-6 14-6 22 0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={76} w={88} h={5} d={40} st={{ background: "#221a10" }} />
        <V c="g06-ent" l={8} t={26} w={84} h={48} d={220} vb="0 0 24 24">
          {ropes}
        </V>
        <L c="g06-ent3" l={38} t={40} w={24} h={9} d={430} st={{ background: "#f6e6c0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={70} w={92} h={7} d={0} st={{ background: "#ab8a5c" }} />
        <V c="g06-hit" l={6} t={24} w={88} h={52} d={140}>
          {ropes}
        </V>
        <L c="g06-bt-bar" l={20} t={44} w={60} h={8} d={260} st={{ background: "#f6e6c0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(171,138,92,0.3)" deep="rgba(34,26,16,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, -0.55), background: "#f6e6c0" }} />
      <L c="g06-bt-rope" d={240} st={{ ...lane(0.16, -0.45), borderRadius: "999px", background: "#ab8a5c" }} />
      <L c="g06-bt-rope" d={280} st={{ ...lane(0.16, 0.45), borderRadius: "999px", background: "#ab8a5c" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <L key={i} c="g06-bt-plank" d={370 + i * 78} ix={22} st={{ ...box(0.4, 1.1, i * 1.05 + 0.7, 0), background: "#f6e6c0", border: "1px solid #221a10" }} />
      ))}
      <L c="g06-bt-bar" d={670} st={{ ...box(0.34, 2.2, 0.35, 0), background: "#221a10", border: "1px solid #f6e6c0" }} />
      <L c="g06-dust" d={740} st={{ ...box(4.4, 2, 2, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,230,192,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   19. Clumsy Heralds (t2) — THE SCREE SLOPE. The whole slope is loose. One
   step starts it, the stones run away downhill in a long tongue, and whoever
   was crossing arrives at the bottom apologising. Aim-staged.
   Palette: #9b9186 / #f0e6d4 / #262019.
   ========================================================================== */
const CH_STONE = "M4 15c0-4 3.4-7 8-7s8 3 8 7c0 2-3.6 3.4-8 3.4S4 17 4 15z";

function ScreeSlopeScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={70} w={84} h={12} d={40} st={{ background: "#262019" }} />
        <V c="g06-ent" l={22} t={28} w={56} h={44} d={220}>
          <path d={CH_STONE} fill="#9b9186" stroke="#262019" strokeWidth="1.3" {...SJ} />
        </V>
        <V c="g06-ent3" l={48} t={44} w={36} h={30} d={430}>
          <path d={CH_STONE} fill="#f0e6d4" stroke="#262019" strokeWidth="1.3" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={68} w={92} h={14} d={0} st={{ background: "#9b9186" }} />
        <V c="g06-hit" l={20} t={24} w={60} h={48} d={140}>
          <path d={CH_STONE} fill="#f0e6d4" stroke="#262019" strokeWidth="1.3" {...SJ} />
        </V>
        <L c="g06-dust" l={24} t={44} w={52} h={30} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,230,212,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(155,145,134,0.3)" deep="rgba(38,32,25,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, -0.5), background: "#f0e6d4" }} />
      <L c="g06-ch-slope" d={240} st={{ ...lane(2.2, 0.1), background: "linear-gradient(180deg, rgba(155,145,134,0.85), rgba(38,32,25,0.9))" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <V key={i} c="g06-ch-slide" d={340 + i * 72} ix={20} st={box(0.9, 0.7, i * 0.95 + 0.6, i % 2 === 0 ? -0.35 : 0.4)}>
          <path d={CH_STONE} fill={i % 2 === 0 ? "#9b9186" : "#f0e6d4"} stroke="#262019" strokeWidth="1.4" {...SJ} />
        </V>
      ))}
      <L c="g06-ch-skid" d={660} st={{ ...box(2.2, 0.3, 1.1, 0.75), borderRadius: "999px", background: "#f0e6d4", transformOrigin: "0% 50%" }} />
      <L c="g06-dust" d={740} st={{ ...box(4.6, 2.2, 2, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,230,212,0.45), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   20. No Trampling (t2) — THE CATTLE GRID. A pit is opened across the way and
   iron bars are dropped over it one by one. Boots cross it without a thought.
   Hooves will not go near it.
   Palette: #7d848c / #e8eef2 / #1a1f24.
   ========================================================================== */
function CattleGridScene({ role, delayMs }: SceneProps) {
  const grid = (
    <g stroke="#7d848c" strokeWidth="2.2" fill="none">
      <path d="M2 6h20M2 12h20M2 18h20" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={30} w={80} h={44} d={40} st={{ background: "#1a1f24" }} />
        <V c="g06-ent" l={12} t={30} w={76} h={44} d={220}>
          {grid}
        </V>
        <L c="g06-ent3" l={34} t={72} w={32} h={10} d={430} st={{ borderRadius: "999px", background: "#e8eef2" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={26} w={88} h={50} d={0} st={{ background: "#1a1f24" }} />
        <V c="g06-hit" l={8} t={26} w={84} h={50} d={140}>
          {grid}
        </V>
        <L c="g06-glint" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#e8eef2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(125,132,140,0.3)" deep="rgba(26,31,36,0.55)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1, 0.8), borderRadius: "999px", background: "#1a1f24" }} />
      <L c="g06-ng-pit" d={240} st={{ ...ahead(4.4, 2.2, 0.8), background: "linear-gradient(180deg, #1a1f24, rgba(26,31,36,0.85))", border: "1px solid #7d848c" }} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <L key={i} c="g06-ng-bar" d={340 + i * 70} ix={20} st={{ ...ahead(4.4, 0.2, 0.8 + (i - 2.5) * 0.36), borderRadius: "999px", background: "#7d848c" }} />
      ))}
      <L c="g06-glint" d={680} st={{ ...ahead(1.4, 1.4, 0.8, 1.3), borderRadius: "50%", background: "radial-gradient(circle, #e8eef2, transparent 70%)" }} />
      <L c="g06-dust" d={740} st={{ ...ahead(4.4, 1.8, 1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(232,238,242,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   21. Pawn Snob (t2) — THE FLAGGED FOOTWAY. Mud is not to be walked in. Flags
   are laid over it, a dressed kerb is set along the edge, and after that a
   pawn will simply not step off the pavement.
   Palette: #b8b2a4 / #f7efdc / #2d2a22.
   ========================================================================== */
function FlaggedWayScene({ role, delayMs }: SceneProps) {
  const flag = (fill: string) => <rect x="2" y="4" width="20" height="16" fill={fill} stroke="#2d2a22" strokeWidth="1.3" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={74} w={84} h={7} d={40} st={{ background: "#2d2a22" }} />
        <V c="g06-ent" l={18} t={30} w={64} h={44} d={220}>
          {flag("#b8b2a4")}
        </V>
        <L c="g06-ent3" l={16} t={66} w={68} h={7} d={430} st={{ background: "#f7efdc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#b8b2a4" }} />
        <V c="g06-hit" l={14} t={26} w={72} h={48} d={140}>
          {flag("#f7efdc")}
        </V>
        <L c="g06-glint" l={44} t={40} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#f7efdc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(184,178,164,0.3)" deep="rgba(45,42,34,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1.6, 0.7), borderRadius: "999px", background: "#2d2a22" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <L
          key={i}
          c="g06-ps-flag"
          d={260 + i * 84}
          ix={22}
          st={{ ...ahead(1.05, 1.4, 0.7, i * 1.1 - 2.2), background: i % 2 === 0 ? "#b8b2a4" : "#f7efdc", border: "1px solid #2d2a22" }}
        />
      ))}
      <L c="g06-ps-kerb" d={660} st={{ ...ahead(5.6, 0.34, 1.45), background: "#f7efdc" }} />
      <L c="g06-glint" d={700} st={{ ...ahead(1.2, 1.2, 0.7, 1.9), borderRadius: "50%", background: "#f7efdc" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(4.6, 1.8, 1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(247,239,220,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   22. Vegetarian Vows (t2) — THE MOWN WINDROWS. A swathe goes through the
   standing grass, the cut hay is raked into windrows, and a band of clover is
   deliberately left standing where the blade could have gone.
   Palette: #b9b45c / #f6f2c0 / #2a2a10.
   ========================================================================== */
function WindrowScene({ role, delayMs }: SceneProps) {
  const clover = (
    <g fill="#b9b45c" stroke="#2a2a10" strokeWidth="1">
      <circle cx="9" cy="9" r="3.4" />
      <circle cx="15" cy="9" r="3.4" />
      <circle cx="12" cy="14" r="3.4" />
      <path d="M12 17v5" stroke="#2a2a10" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={76} w={84} h={6} d={40} st={{ background: "#2a2a10" }} />
        <V c="g06-ent" l={28} t={18} w={44} h={60} d={220}>
          {clover}
        </V>
        <L c="g06-ent3" l={12} t={60} w={76} h={8} d={430} st={{ borderRadius: "999px", background: "#f6f2c0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={74} w={88} h={8} d={0} st={{ background: "#b9b45c" }} />
        <V c="g06-hit" l={26} t={14} w={48} h={64} d={140}>
          {clover}
        </V>
        <L c="g06-vv-row" l={12} t={58} w={76} h={7} d={260} st={{ borderRadius: "999px", background: "#f6f2c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(185,180,92,0.3)" deep="rgba(42,42,16,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(5, 1, 1.2), borderRadius: "999px", background: "#2a2a10" }} />
      <L c="g06-vv-swathe" d={240} st={{ ...ahead(5.6, 2.6, 0.8), background: "repeating-linear-gradient(90deg, #b9b45c 0 4%, rgba(42,42,16,0.55) 4% 8%)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g06-vv-row" d={360 + i * 82} ix={22} st={{ ...ahead(5.2, 0.34, 1.7 - i * 0.62), borderRadius: "999px", background: "#f6f2c0" }} />
      ))}
      <V c="g06-vv-clover" d={650} st={ahead(1.3, 1.6, 0.5, -1.9)}>
        {clover}
      </V>
      <L c="g06-dust" d={740} st={{ ...ahead(5, 1.8, 2), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,242,192,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   23. Wet Matches (t2) — THE STUBBLE THAT WILL NOT CATCH. Fire is set in the
   stubble ahead of the line. It crawls two feet forward, meets the sodden
   furrow, and goes out in steam.
   Palette: #8a6a52 / #f0d9b4 / #1e1610.
   ========================================================================== */
function WetStubbleScene({ role, delayMs }: SceneProps) {
  const stubble = "repeating-linear-gradient(90deg, #8a6a52 0 3%, rgba(30,22,16,0.7) 3% 7%)";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={64} w={84} h={18} d={40} st={{ background: stubble }} />
        <L c="g06-ent" l={34} t={34} w={32} h={28} d={220} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f0d9b4, transparent 68%)" }} />
        <L c="g06-ent3" l={30} t={18} w={40} h={30} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(138,106,82,0.75), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={62} w={88} h={20} d={0} st={{ background: stubble }} />
        <L c="g06-hit" l={32} t={32} w={36} h={30} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f0d9b4, transparent 66%)" }} />
        <L c="g06-wm-smoke" l={28} t={12} w={44} h={38} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,217,180,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(138,106,82,0.3)" deep="rgba(30,22,16,0.55)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(1.2, 1.2, 0.2), borderRadius: "50%", background: "#f0d9b4" }} />
      <L c="g06-wm-field" d={240} st={{ ...ahead(5.4, 2.6, 0.9), background: stubble }} />
      <L c="g06-wm-line" d={360} st={{ ...ahead(4.4, 0.4, 0.6), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #f0d9b4, transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-wm-smoke" d={520 + i * 70} ix={20} st={{ ...ahead(1.5, 1.5, 1.2, [-1.4, 0.1, 1.4][i]), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,217,180,0.55), transparent 70%)" }} />
      ))}
      <L c="g06-wm-drown" d={680} st={{ ...ahead(5, 0.6, 1.5), borderRadius: "999px", background: "#1e1610" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(4.6, 2, 2.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,217,180,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   24. Back to Barracks (t2) — THE STILE. A field wall runs across the near
   ground. Steps are set into its face on the caster's own side, and the way
   back over it opens for exactly two people.
   Palette: #9d8a63 / #f2e6c2 / #221c10.
   ========================================================================== */
function StileScene({ role, delayMs }: SceneProps) {
  const wall = "repeating-linear-gradient(90deg, #9d8a63 0 9%, #221c10 9% 11%)";
  const step = (fill: string) => <rect x="2" y="8" width="20" height="8" fill={fill} stroke="#221c10" strokeWidth="1.3" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={44} w={88} h={28} d={40} st={{ background: wall }} />
        <V c="g06-ent" l={30} t={36} w={40} h={18} d={220}>
          {step("#f2e6c2")}
        </V>
        <V c="g06-ent3" l={34} t={12} w={32} h={30} d={430}>
          <path d={PAWN} fill="#f2e6c2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={42} w={92} h={30} d={0} st={{ background: wall }} />
        <V c="g06-hit" l={26} t={34} w={48} h={20} d={140}>
          {step("#f2e6c2")}
        </V>
        <L c="g06-glint" l={44} t={30} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#f2e6c2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(157,138,99,0.3)" deep="rgba(34,28,16,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(5, 0.9, -0.2), borderRadius: "999px", background: "#221c10" }} />
      <L c="g06-bb-wall" d={240} st={{ ...ahead(6, 1.5, -0.6), background: wall }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g06-bb-step" d={370 + i * 95} ix={24} st={ahead(1.5, 0.5, -0.2 - i * 0.55, i % 2 === 0 ? -0.2 : 0.2)}>
          {step(i === 1 ? "#f2e6c2" : "#9d8a63")}
        </V>
      ))}
      <V c="g06-bb-over" d={650} st={ahead(1.1, 1.6, -1.7)}>
        <path d={PAWN} fill="#f2e6c2" stroke="#221c10" strokeWidth="1.1" />
      </V>
      <L c="g06-dust" d={740} st={{ ...ahead(4.4, 1.8, -1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(242,230,194,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   25. Chapel Warden (t2) — THE HOLY WELL. Water finds a way up through the
   ground beside the chapel path; a capstone is set over the eye of it and rim
   stones are laid round, and the spring is kept.
   Palette: #6fa8a0 / #e4f7f2 / #14282a.
   ========================================================================== */
const CW_RIM: Array<[number, number]> = [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.9], [1.5, 0.9]];

function HolyWellScene({ role, delayMs }: SceneProps) {
  const cap = <path d="M4 9l8-5 8 5-8 5z" fill="#e4f7f2" stroke="#14282a" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={12} t={74} w={76} h={6} d={40} st={{ background: "#14282a" }} />
        <L c="g06-ent" l={28} t={40} w={44} h={34} d={220} st={{ borderRadius: "50%", background: "radial-gradient(circle, #6fa8a0, transparent 70%)" }} />
        <V c="g06-ent3" l={26} t={14} w={48} h={40} d={430}>
          {cap}
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={8} t={72} w={84} h={8} d={0} st={{ background: "#6fa8a0" }} />
        <V c="g06-hit" l={22} t={22} w={56} h={48} d={140}>
          {cap}
        </V>
        <L c="g06-ring" l={26} t={44} w={48} h={34} d={260} st={{ borderRadius: "50%", border: "2px solid #e4f7f2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(111,168,160,0.3)" deep="rgba(20,40,42,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...box(3.4, 1.1, 0, 1.2), borderRadius: "999px", background: "#14282a" }} />
      <L c="g06-cw-spring" d={250} st={{ ...box(2.4, 2.4), borderRadius: "50%", background: "radial-gradient(circle, #e4f7f2, rgba(111,168,160,0.35) 60%, transparent 74%)" }} />
      {CW_RIM.map(([x, y], i) => (
        <L key={i} c="g06-cw-rim" d={370 + i * 78} ix={22} st={{ ...box(1, 0.8, x, y), borderRadius: "999px", background: "#6fa8a0", border: "1px solid #14282a" }} />
      ))}
      <V c="g06-cw-cap" d={640} st={box(2.6, 2)}>
        {cap}
      </V>
      <L c="g06-ring" d={690} st={{ ...box(3.6, 3.6), borderRadius: "50%", border: "2px solid #e4f7f2" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(3.8, 1.8, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(228,247,242,0.45), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   26. Corduroy Road (t2) — THE CORDUROY ROAD. Logs are laid crosswise over the
   soft going, butt to butt, and pegged down with a binder pole, so that two
   squares of bog become two squares of road. Aim-staged.
   Palette: #8b6238 / #f0d7a8 / #1f1408.
   ========================================================================== */
function CorduroyScene({ role, delayMs }: SceneProps) {
  const log = (fill: string) => (
    <g stroke="#1f1408" strokeWidth="1.3">
      <rect x="2" y="7" width="20" height="10" rx="2" fill={fill} />
      <ellipse cx="21" cy="12" rx="1.6" ry="5" fill="#1f1408" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={74} w={84} h={8} d={40} st={{ background: "#1f1408" }} />
        <V c="g06-ent" l={14} t={34} w={72} h={38} d={220}>
          {log("#8b6238")}
        </V>
        <V c="g06-ent3" l={14} t={16} w={72} h={34} d={430}>
          {log("#f0d7a8")}
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={72} w={92} h={9} d={0} st={{ background: "#8b6238" }} />
        <V c="g06-hit" l={10} t={30} w={80} h={42} d={140}>
          {log("#f0d7a8")}
        </V>
        <L c="g06-cr-bind" l={44} t={16} w={8} h={62} d={260} st={{ background: "#1f1408" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Ground tone="rgba(139,98,56,0.3)" deep="rgba(31,20,8,0.55)" />}>
      <L c="g06-tellline" d={110} st={{ ...lane(0.14, 0.7), background: "#f0d7a8" }} />
      <L c="g06-cr-mire" d={240} st={{ ...lane(2, 0.05), background: "linear-gradient(180deg, #1f1408, #4a3018 60%, #1f1408)" }} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <V key={i} c="g06-cr-log" d={330 + i * 68} ix={20} st={box(0.42, 1.8, i * 0.85 + 0.5, 0)} vb="0 0 24 24" par="none">
          {log(i % 2 === 0 ? "#8b6238" : "#f0d7a8")}
        </V>
      ))}
      <L c="g06-cr-bind" d={670} st={{ ...lane(0.2, -0.7), borderRadius: "999px", background: "#f0d7a8" }} />
      <L c="g06-dust" d={740} st={{ ...box(4.6, 2, 2, 1), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,215,168,0.42), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   27. Downtown Premium (t2) — THE METALLED WAY. Broken stone is spread down
   the middle of the board and a stone roller goes over it until the surface is
   hard enough that nothing can be taken out of it in passing.
   Palette: #93998f / #ece9d8 / #24261f.
   ========================================================================== */
function RolledRoadScene({ role, delayMs }: SceneProps) {
  const roller = (
    <g stroke="#24261f" strokeWidth="1.3">
      <rect x="3" y="7" width="18" height="11" rx="2" fill="#93998f" />
      <ellipse cx="21" cy="12.5" rx="2" ry="5.5" fill="#ece9d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={8} t={72} w={84} h={9} d={40} st={{ background: "#24261f" }} />
        <V c="g06-ent" l={16} t={30} w={68} h={42} d={220}>
          {roller}
        </V>
        <L c="g06-ent3" l={12} t={62} w={76} h={8} d={430} st={{ borderRadius: "999px", background: "#ece9d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={70} w={92} h={10} d={0} st={{ background: "#93998f" }} />
        <V c="g06-hit" l={12} t={26} w={76} h={46} d={140}>
          {roller}
        </V>
        <L c="g06-dp-smooth" l={10} t={62} w={80} h={7} d={260} st={{ borderRadius: "999px", background: "#ece9d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Ground tone="rgba(147,153,143,0.3)" deep="rgba(36,38,31,0.5)" />}>
      <L c="g06-tell" d={110} st={{ ...ahead(5.4, 1, 0.8), borderRadius: "999px", background: "#24261f" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g06-dp-chip" d={250 + i * 70} ix={20} st={{ ...ahead(1.2, 0.5, 0.8, i * 1.3 - 1.95), borderRadius: "1px", background: "#93998f" }} />
      ))}
      <V c="g06-dp-roll" d={470} st={ahead(2.2, 1.6, 0.8, -2.4)}>
        {roller}
      </V>
      <L c="g06-dp-smooth" d={640} st={{ ...ahead(5.6, 0.9, 0.8), borderRadius: "999px", background: "linear-gradient(180deg, #ece9d8, #93998f)" }} />
      <L c="g06-glint" d={690} st={{ ...ahead(1.3, 1.3, 0.8, 2), borderRadius: "50%", background: "#ece9d8" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(5, 1.8, 1.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(236,233,216,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   28. Frontier Waiver (t2) — THE MARCH BANK AND DITCH. Along both outer
   margins of the board a boundary bank is thrown up out of its own ditch and
   marker stones are set into the crest.
   Palette: #8a7a52 / #efe2b8 / #201c0e.
   ========================================================================== */
function MarchBankScene({ role, delayMs }: SceneProps) {
  const margin = (side: "left" | "right"): CSSProperties => ({
    [side]: "0%",
    top: "0%",
    width: "12.5%",
    height: "100%",
    background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, rgba(138,122,82,0.75), transparent)`,
  });
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={74} w={80} h={7} d={40} st={{ background: "#201c0e" }} />
        <L c="g06-ent" l={16} t={40} w={68} h={26} d={220} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #8a7a52, #201c0e)" }} />
        <V c="g06-ent3" l={40} t={14} w={20} h={38} d={430}>
          <path d="M9 22V6l3-3 3 3v16z" fill="#efe2b8" stroke="#201c0e" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={72} w={88} h={8} d={0} st={{ background: "#8a7a52" }} />
        <L c="g06-hit" l={12} t={38} w={76} h={28} d={140} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #efe2b8, #201c0e)" }} />
        <L c="g06-glint" l={44} t={40} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#efe2b8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Ground tone="rgba(138,122,82,0.28)" deep="rgba(32,28,14,0.5)" />
          <L c="g06-fw-margin" d={200} st={margin("left")} />
          <L c="g06-fw-margin" d={240} st={margin("right")} />
        </>
      }
    >
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1, 0.4), borderRadius: "999px", background: "#201c0e" }} />
      <L c="g06-fw-ditch" d={300} st={{ ...ahead(4.6, 0.8, 1.1), background: "#201c0e" }} />
      <L c="g06-fw-bank" d={420} st={{ ...ahead(4.6, 1.4, 0.3), borderRadius: "999px", background: "linear-gradient(180deg, #8a7a52, #201c0e)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g06-fw-stone" d={560 + i * 78} ix={22} st={ahead(0.8, 1.1, 0.5, i * 1.5 - 1.5)}>
          <path d="M9 22V6l3-3 3 3v16z" fill="#efe2b8" stroke="#201c0e" strokeWidth="1.2" {...SJ} />
        </V>
      ))}
      <L c="g06-dust" d={750} st={{ ...ahead(4.6, 1.8, 1.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(239,226,184,0.4), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   29. Full Coverage (t2) — THE FIELD PUT DOWN TO TURF. Turf rolls are run out
   across the whole board, edge to edge, and the seams between them are closed
   until there is no bare earth anywhere for anything to be taken from.
   Palette: #6f9c4e / #eaf5c4 / #17240f.
   ========================================================================== */
function TurfRollScene({ role, delayMs }: SceneProps) {
  const roll = <path d="M2 8h20v9H2zM4 8a2 4 0 0 1 0-5h18a2 4 0 0 0 0 5" fill="#6f9c4e" stroke="#17240f" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={10} t={76} w={80} h={6} d={40} st={{ background: "#17240f" }} />
        <V c="g06-ent" l={16} t={30} w={68} h={46} d={220}>
          {roll}
        </V>
        <L c="g06-ent3" l={18} t={64} w={64} h={6} d={430} st={{ background: "#eaf5c4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={6} t={74} w={88} h={8} d={0} st={{ background: "#6f9c4e" }} />
        <V c="g06-hit" l={12} t={26} w={76} h={50} d={140}>
          {roll}
        </V>
        <L c="g06-fc-seam" l={14} t={62} w={72} h={5} d={260} st={{ background: "#eaf5c4" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Ground tone="rgba(111,156,78,0.3)" deep="rgba(23,36,15,0.5)" />
          {[0, 1, 2, 3].map((i) => (
            <L
              key={i}
              c="g06-fc-roll"
              d={280 + i * 90}
              ix={22}
              st={{ left: "0%", top: `${12.5 + i * 20}%`, width: "100%", height: "18%", background: "repeating-linear-gradient(90deg, rgba(111,156,78,0.85) 0 5%, rgba(23,36,15,0.6) 5% 9%)", transformOrigin: "0% 50%" }}
            />
          ))}
        </>
      }
    >
      <L c="g06-tell" d={110} st={{ ...ahead(4.6, 1, 0.5), borderRadius: "999px", background: "#17240f" }} />
      <V c="g06-fc-barrow" d={250} st={ahead(2.4, 1.8, 0.5, -2.2)}>
        {roll}
      </V>
      <L c="g06-fc-seam" d={640} st={{ ...ahead(5.6, 0.24, 0.9), background: "#eaf5c4" }} />
      <L c="g06-glint" d={690} st={{ ...ahead(1.3, 1.3, 0.5, 1.8), borderRadius: "50%", background: "#eaf5c4" }} />
      <L c="g06-dust" d={750} st={{ ...ahead(4.8, 1.8, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(234,245,196,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   30. Harbor Gull (t2) — THE FALLING TIDE. The water goes off the harbour
   causeway toward the caster's own shore, the wet cobbles and the weed come up
   out of it, and a gull drops onto the bar the moment it is dry.
   Palette: #7fa3a8 / #eef6f2 / #16262a.
   ========================================================================== */
function FallingTideScene({ role, delayMs }: SceneProps) {
  const gull = <path d="M2 13c4.4 1 7.6-1 9.6-5.2 1.4 3.4 4.6 5 9.4 4-3 4.2-8 6.8-12.8 5.6C4.8 16.6 2.6 15.2 2 13z" fill="#eef6f2" stroke="#16262a" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g06-ent2" l={6} t={66} w={88} h={14} d={40} st={{ background: "#16262a" }} />
        <V c="g06-ent" l={22} t={26} w={56} h={40} d={220}>
          {gull}
        </V>
        <L c="g06-ent3" l={16} t={58} w={68} h={9} d={430} st={{ borderRadius: "999px", background: "#7fa3a8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g06-hit2" l={4} t={64} w={92} h={16} d={0} st={{ background: "#7fa3a8" }} />
        <V c="g06-hit" l={20} t={22} w={60} h={44} d={140}>
          {gull}
        </V>
        <L c="g06-hb-weed" l={26} t={58} w={48} h={7} d={260} st={{ borderRadius: "999px", background: "#16262a" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Ground tone="rgba(127,163,168,0.3)" deep="rgba(22,38,42,0.55)" />
          <L c="g06-hb-tide" d={220} st={{ left: "0%", top: "calc(50% + var(--fx-side, 1) * 20%)", width: "100%", height: "56%", background: "linear-gradient(180deg, rgba(127,163,168,0.75), rgba(22,38,42,0.7))" }} />
        </>
      }
    >
      <L c="g06-tell" d={110} st={{ ...ahead(5, 1, 0.6), borderRadius: "999px", background: "#16262a" }} />
      <L c="g06-hb-way" d={340} st={{ ...ahead(5.4, 1.5, 0.6), background: "repeating-linear-gradient(90deg, #7fa3a8 0 4%, #16262a 4% 7%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g06-hb-weed" d={480 + i * 74} ix={20} st={{ ...ahead(1.1, 0.28, 0.6, [-1.7, 0, 1.7][i]), borderRadius: "999px", background: "#16262a" }} />
      ))}
      <V c="g06-hb-gull" d={680} st={ahead(1.8, 1.2, 1.2, 1.1)}>
        {gull}
      </V>
      <L c="g06-dust" d={750} st={{ ...ahead(4.8, 1.8, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(238,246,242,0.42), transparent 74%)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor and an existing SigSoundKey.
   `source` is deliberately omitted throughout: these cards carry no removal
   diff, so the play is the cast lead on the square they were played on.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  ov_growth_ring: S(GrowthRingScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_mole_tunnels: S(MoleTunnelScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim" }),
  bn4_cobblers_bench: S(HobnailPrintScene, { ordering: "file", staggerMs: 60, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }),
  bn4_coffee_break: S(QuakingBogScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_ferry_ticket: S(FordStonesScene, { ordering: "line", staggerMs: 65, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  bn4_militia_call: S(MusterRingScene, { ordering: "file", staggerMs: 60, victims: ["p"], hasLead: true, sound: "siege", anchor: "cast" }),
  bn4_over_the_hedge: S(HedgeGapScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "rampage", anchor: "cast" }),
  bn4_stowaway: S(CulvertScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "cast" }),
  hx4_fear_of_open_ground: S(ParedHeathScene, { ordering: "file", staggerMs: 75, victims: ["r"], hasLead: true, sound: "shades", anchor: "cast" }),
  ov_pillow_fort: S(StookedSheavesScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_sandbags: S(SandbagScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }),
  bn4_day_laborer: S(DuckboardScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  bn4_field_stitches: S(FieldStitchScene, { ordering: "file", staggerMs: 60, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }),
  bn4_half_step_back: S(StepCutScene, { ordering: "file", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "cast" }),
  bn4_slow_doors: S(SnowCrustScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "massfreeze", anchor: "cast" }),
  bn4_spare_button: S(PebbleScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "chips", anchor: "cast" }),
  bn4_vaulting_pole: S(VaultingDykeScene, { ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim" }),
  hx4_bridge_toll: S(RopeBridgeScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim" }),
  hx4_clumsy_heralds: S(ScreeSlopeScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "rampage", anchor: "aim" }),
  hx4_no_trampling: S(CattleGridScene, { ordering: "octagon", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrify", anchor: "cast" }),
  hx4_pawn_snob: S(FlaggedWayScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "slots", anchor: "cast" }),
  hx4_vegetarian_vows: S(WindrowScene, { ordering: "radial", staggerMs: 60, victims: ["b"], hasLead: true, sound: "snooze", anchor: "cast" }),
  hx4_wet_matches: S(WetStubbleScene, { ordering: "file", staggerMs: 65, victims: ["p"], hasLead: true, sound: "bust", anchor: "cast" }),
  op_back_to_barracks: S(StileScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }),
  op_chapel_warden: S(HolyWellScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  op_corduroy_road: S(CorduroyScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim" }),
  op_downtown_premium: S(RolledRoadScene, { ordering: "file", staggerMs: 65, victims: ["p"], hasLead: true, sound: "colossus", anchor: "cast" }),
  op_frontier_waiver: S(MarchBankScene, { ordering: "file", staggerMs: 65, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }),
  op_full_coverage: S(TurfRollScene, { ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }),
  op_harbor_gull: S(FallingTideScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "cast" }),
};
