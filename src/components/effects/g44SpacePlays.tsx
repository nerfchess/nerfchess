// g44SpacePlays — bespoke plays for the 43 cards that shared five small
// generated families (arcaneRunes, teleportRift, gravityWell, starChart,
// chainSnap): five stock choreographies, recoloured by a hash of the card id.
//
// MODULE FICTION: THE SHAPE OF SPACE ITSELF BEING ALTERED. Nothing here is a
// glow on a square. Each card is a different way distance or direction stops
// behaving: a folded map with two far marks pinned together, a tape measure
// that will not rewind, dividers locked at two squares, a plumb line hanging
// off true, a compass needle that refuses east, an oar bent at the waterline,
// a knot pulled through itself, twin portal mouths showing the same thing
// twice, a hammock shorter than the gap it spans, a zip meshing two distant
// ranks, a shelf aisle telescoping shorter, a staircase that returns to its
// own foot.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g44SpacePlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx (cycle hazard), only the SigPlugin / SigRole TYPES imported.
//
// DISTANCE IS NEVER GUESSED. "Space altered" is a claim about a real gap, so
// the gap is the real one:
//
//   lane()/seg()  a band starting AT the cast square and running
//                 calc(var(--fx-len) * 7.142857%): literally the distance to
//                 the real target square, on the 14-cell stage.
//   at(f)         a prop parked f of the way down that real run; at(1) is the
//                 target square itself.
//   g44-fold      the module's central motion: a real run collapsing to a
//   g44-cinch     fraction of itself, or to EXACTLY one cell
//                 (scaleX(calc(1 / var(--fx-len)))).
//   g44-run1 /    a one-cell traveller crossing the real gap, or hauling the
//   g44-haul1     far end of it home.
//   --fx-index    stakes, toadstools, stanchions, sheets, sight lines and
//                 leg irons arrive in the REAL victim order.
//   --fx-side     dust, filings, embers and spores drift AWAY from the caster,
//                 and farBand()/nearBand() name a rank by WHOSE it is rather
//                 than by which end of the screen it is drawn at.
//   <BoardFrame>  everything that means THE BOARD: washes, the four corners a
//                 web is strung into, the central 4x4 a choke point pinches,
//                 the two ranks a zip closes.
//
// Every scene runs three beats (tell -> strike -> settle) in all three roles:
// "lead" (the board-scale flourish on the cast square), "target" (the small
// per-square hit) and "entrance" (the card arriving in a hand, ~56% of the
// crop, no board takeover). Class prefix `g44-`.

import "./g44SpacePlays.css";

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

/** Style escape hatch: scene styles carry CSS custom properties too. */
type Style = CSSProperties & Record<string, unknown>;
const st = (o: Style): CSSProperties => o as CSSProperties;

const ROOT = "pointer-events-none absolute inset-0 z-30 block";
const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/** The caller's stagger plus this layer's own beat, on the Settings speed. */
const b = (ms: number): string => `calc(var(--g44-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;
/** The same beat, arriving in the REAL victim order. */
const bx = (ms: number, per: number): string =>
  `calc(var(--g44-d, 0ms) + ${ms}ms * var(--fx-dur, 1) + var(--fx-index, 0) * ${per}ms)`;

/** A percentage box: the one-square cuts, and layers inside <BoardFrame>. */
const pct = (l: number, t: number, w: number, h: number): Style => ({
  left: `${l}%`,
  top: `${t}%`,
  width: `${w}%`,
  height: `${h}%`,
});

/**
 * A box `w` x `h` CELLS centred on the cast square (the stage's 50%/50%),
 * offset `dx`/`dy` cells. On <AimStage> +x is the attack vector, so `dx` is
 * measured DOWN THE RUN and `dy` across it.
 */
const box = (w: number, h: number, dx = 0, dy = 0): Style => ({
  left: `${(50 + (dx - w / 2) * CELL).toFixed(3)}%`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/**
 * The real gap, in cells, with a floor under it.
 *
 * --fx-len is the true source -> target distance, and it is 0 for a play that
 * removed nothing and touched no zone (geometry.ts centreGeo). A fold of a
 * zero-length run is an invisible scene, so the gap never reads as shorter
 * than two cells. Everything below is measured off this one token, and the
 * default (3) still covers the var being absent entirely.
 */
const LEN = "max(var(--fx-len, 3), 2)";

/** A band starting AT the cast square and running the REAL distance to the
 *  target, `thick` cells thick. The geometry contract in one expression. */
const lane = (thick: number, dy = 0): Style => ({
  left: "50%",
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: `calc(${LEN} * 7.142857%)`,
  height: cells(thick),
});

/** The `f0`..`f1` stretch of that same real run (0 = cast, 1 = target). */
const seg = (f0: number, f1: number, thick: number, dy = 0): Style => ({
  left: `calc(50% + ${LEN} * ${(CELL * f0).toFixed(4)}%)`,
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: `calc(${LEN} * ${(CELL * (f1 - f0)).toFixed(4)}%)`,
  height: cells(thick),
});

/** A prop parked `f` of the way down the real run. `at(1, ...)` is the target. */
const at = (f: number, w: number, h: number, dy = 0): Style => ({
  left: `calc(50% + ${LEN} * ${(CELL * f).toFixed(4)}% - ${((w / 2) * CELL).toFixed(3)}%)`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/** A band `h`% tall on the OPPONENT'S end of the board, inside <BoardFrame>.
 *  --fx-side names whose end that is, so no art says "the top of the board". */
const farBand = (h: number): Style => ({
  left: 0,
  width: "100%",
  height: `${h}%`,
  top: `calc(${((100 - h) / 2).toFixed(3)}% - var(--fx-side, 1) * ${((100 - h) / 2).toFixed(3)}%)`,
});

/** A thin band on the opponent's `k`-th rank in from their edge, `h`% tall.
 *  Same trick as farBand: --fx-side names whose rank it is. */
const farRank = (k: number, h: number): Style => ({
  left: 0,
  width: "100%",
  height: `${h}%`,
  top: `calc(${(43.75 + (12.5 - h) / 2).toFixed(3)}% - var(--fx-side, 1) * ${(43.75 - k * 12.5).toFixed(3)}%)`,
});

/** The same band on the CASTER'S end. */
const nearBand = (h: number): Style => ({
  left: 0,
  width: "100%",
  height: `${h}%`,
  top: `calc(${((100 - h) / 2).toFixed(3)}% + var(--fx-side, 1) * ${((100 - h) / 2).toFixed(3)}%)`,
});

/** One animated plain layer. `per` makes it ride the real victim order. */
function L({
  c, d = 0, per, s, children,
}: { c: string; d?: number; per?: number; s?: Style; children?: ReactNode }) {
  return (
    <span
      className={`${c} absolute block`}
      style={st({ animationDelay: per === undefined ? b(d) : bx(d, per), ...s })}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({
  c, d = 0, per, vb = "0 0 24 24", par, s, children,
}: {
  c: string; d?: number; per?: number; vb?: string; par?: string; s?: Style; children?: ReactNode;
}) {
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={par}
      className={`${c} absolute block`}
      style={st({ animationDelay: per === undefined ? b(d) : bx(d, per), ...s })}
    >
      {children}
    </svg>
  );
}

/** The square-local cut: the per-square target hit and the hand entrance. */
function Cut({ d, children }: { d: number; children: ReactNode }) {
  return (
    <span className={ROOT} style={st({ "--g44-d": `${d}ms` })} aria-hidden="true">
      {children}
    </span>
  );
}

/**
 * The board, for a scene whose anchor is "board".
 *
 * <BoardFrame> is the right tool at "cast" and "aim": it finds the board from
 * the cast square. A board-anchored lead has ALREADY been slid so its canvas
 * is centred on the board, so the middle 8 cells of the 14 simply ARE the
 * board, and using BoardFrame there would count the centring twice.
 */
function BoardBox({ children }: { children: ReactNode }) {
  return (
    <span className="absolute block" style={pct(21.429, 21.429, 57.143, 57.143)} aria-hidden="true">
      {children}
    </span>
  );
}

/** Cast-anchored lead: the action on the cast square, `frame` over the board.
 *  The real gap and the caster's side are republished under this module's own
 *  names so the stylesheet can reach them from any depth. `centred` marks the
 *  board-anchored scenes, whose canvas is already centred on the board. */
function Lead({
  d, frame, centred, children,
}: { d: number; frame?: ReactNode; centred?: boolean; children: ReactNode }) {
  const box = centred ? <BoardBox>{frame}</BoardBox> : <BoardFrame>{frame}</BoardFrame>;
  return (
    <span
      className={ROOT}
      style={st({ "--g44-d": `${d}ms`, "--g44-len": LEN, "--g44-side": "var(--fx-side, 1)" })}
      aria-hidden="true"
    >
      <BoardWideStage>
        {frame ? box : null}
        {children}
      </BoardWideStage>
    </span>
  );
}

/** Aimed lead: `frame` stays square with the board, the art rotates onto the
 *  real source -> target vector. Author it pointing RIGHT. `centred` marks the
 *  board-anchored scenes, whose canvas is already centred on the board. */
function AimLead({
  d, frame, centred, children,
}: { d: number; frame?: ReactNode; centred?: boolean; children: ReactNode }) {
  return (
    <span
      className={ROOT}
      style={st({ "--g44-d": `${d}ms`, "--g44-len": LEN, "--g44-side": "var(--fx-side, 1)" })}
      aria-hidden="true"
    >
      {frame ? (
        <BoardWideStage>
          {centred ? <BoardBox>{frame}</BoardBox> : <BoardFrame>{frame}</BoardFrame>}
        </BoardWideStage>
      ) : null}
      <AimStage>{children}</AimStage>
    </span>
  );
}

/** Board-wide wash. Always inside a <BoardFrame>. */
function Wash({ tone, d = 60 }: { tone: string; d?: number }) {
  return (
    <L c="g44-wash" d={d} s={{ ...pct(0, 0, 100, 100), background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 70%)` }} />
  );
}

/** Board-edge glow. Always inside a <BoardFrame>. */
function Rim({ tone, d = 140 }: { tone: string; d?: number }) {
  return <L c="g44-rim" d={d} s={{ ...pct(0, 0, 100, 100), boxShadow: `inset 0 0 26px 8px ${tone}` }} />;
}

const R2 = [0, 1];
const R3 = [0, 1, 2];
const R4 = [0, 1, 2, 3];
const R5 = [0, 1, 2, 3, 4];

/* Bystanders. The travelling piece is never the central object of a card. */
const PAWN = "M12 4.6a2.6 2.6 0 0 1 1.5 4.8l1.7 6.2H8.8l1.7-6.2A2.6 2.6 0 0 1 12 4.6z M7.6 16.8h8.8V19.4H7.6z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";

/* =============================================================================
   FAMILY A — ARCANE RUNES. Seventeen hexes, each one a rule of distance being
   rewritten against the opponent: a fold, a stop, a locked radius, a lean.
   ========================================================================== */

/* -----------------------------------------------------------------------------
   1. Deja Vu (t2) — THE FOLDED MAP.
   The sheet is drawn out the real distance, the two ink marks sit at either
   end of it, then the fold closes and a brass pin is driven through both at
   once: two far points, one hole. Palette: #cbb184 / #fff0cf / #2b2416.
   -------------------------------------------------------------------------- */
function FoldedMap({ role, delayMs }: SceneProps) {
  const pin = (
    <>
      <path d="M12 2.6v13.8" stroke="#2b2416" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="4.6" r="3" fill="#cbb184" stroke="#2b2416" strokeWidth="1.1" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 46, 84, 16), background: "linear-gradient(90deg, #cbb184, #fff0cf, #cbb184)" }} />
        <V c="g44-ent" d={200} s={pct(30, 16, 40, 62)}>{pin}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(38, 38, 24, 24), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,207,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 48, 92, 9), background: "#cbb184" }} />
        <V c="g44-hit" d={200} s={pct(26, 14, 48, 66)}>{pin}</V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 52, 40, 30), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,207,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(203,177,132,0.28)" d={70} />}>
      {/* tell: the crease is scored down the real run before anything folds */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.13), background: "#fff0cf" }} />
      {/* the sheet itself, drawn the true distance between the two squares */}
      <L c="g44-map-sheet" d={200} s={{ ...lane(2.4), background: "linear-gradient(180deg, #cbb184, #fff0cf 46%, #8f7a4c)", border: "1px solid #2b2416" }} />
      {/* the two ink marks: one on the cast square, one on the far one */}
      {R2.map((i) => (
        <L key={i} c="g44-map-mark" d={280 + i * 70} per={30} s={{ ...at(i, 0.6, 0.6), borderRadius: "50%", background: "#2b2416" }} />
      ))}
      {/* strike: the fold closes and the gap between them stops existing */}
      <L c="g44-fold" d={380} s={{ ...lane(2.4), background: "linear-gradient(180deg, rgba(43,36,22,0.9), rgba(203,177,132,0.2))" }} />
      {/* the pin driven through both marks at once */}
      <V c="g44-map-pin" d={540} s={{ ...box(1.2, 2.2, 0.3, -0.5), filter: "drop-shadow(0 0 4px #fff0cf)" }}>{pin}</V>
      {/* settle: paper dust off the crease, away from the caster */}
      <L c="g44-dust" d={670} s={{ ...box(3.6, 2, 0.6, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,207,0.45), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   2. No Full Retreat (t2) — THE TAPE THAT WILL NOT REWIND.
   The blade pays out the whole real distance, the return spring takes it back
   and the ratchet stop slams at two cells. The tape whips and holds there.
   Palette: #b9c6d2 / #fff2dc / #1b2430.
   -------------------------------------------------------------------------- */
function RatchetTape({ role, delayMs }: SceneProps) {
  const drum = (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1" fill="#1b2430" stroke="#b9c6d2" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff2dc" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.4" fill="#b9c6d2" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(10, 50, 80, 8), background: "linear-gradient(90deg, #fff2dc, #b9c6d2)" }} />
        <V c="g44-ent" d={200} s={pct(24, 26, 52, 46)}>{drum}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(60, 44, 22, 12), background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 52, 92, 7), background: "#b9c6d2" }} />
        <V c="g44-hit" d={200} s={pct(22, 24, 56, 50)}>{drum}</V>
        <L c="g44-grit" d={400} s={{ ...pct(46, 46, 10, 5), background: "#fff2dc", "--sx": "150%", "--sy": "-120%" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,198,210,0.26)" d={70} />}>
      {/* tell: the hook mark scratched where the blade will run */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.12), background: "#fff2dc" }} />
      {/* the blade pays out the whole real distance */}
      <L c="g44-tape-blade" d={210} s={{ ...lane(0.7), background: "linear-gradient(180deg, #fff2dc, #b9c6d2 60%, #6d7c8c)", border: "1px solid #1b2430" }} />
      {/* graduations, arriving in the real victim order */}
      {R4.map((i) => (
        <L key={i} c="g44-tape-tick" d={280 + i * 40} per={26} s={{ ...at(0.2 + i * 0.2, 0.1, 0.9), background: "#1b2430" }} />
      ))}
      {/* strike: the ratchet stop slams down at exactly two cells */}
      <L c="g44-tape-stop" d={420} s={{ ...box(0.42, 2.2, 2), background: "linear-gradient(180deg, #1b2430, #b9c6d2, #1b2430)", border: "1px solid #fff2dc" }} />
      {/* the recoil runs back and dies against it */}
      <L c="g44-tape-snap" d={470} s={{ ...seg(0, 1, 0.5), background: "linear-gradient(90deg, rgba(255,242,220,0.9), rgba(185,198,210,0))" }} />
      <V c="g44-tape-drum" d={520} s={box(2.2, 2.2, -0.4)}>{drum}</V>
      {/* settle: steel grit shaken off the stop */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={640 + i * 45} s={{ ...box(0.3, 0.14, 2 + [0.2, -0.2, 0.4][i], [-0.3, 0.35, 0.1][i]), background: "#fff2dc", "--sx": ["140%", "-130%", "170%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   3. Tea Break (t2) — THE DIVIDERS LOCKED AT TWO SQUARES.
   The legs open, the scribing point walks a two-cell circle round the king,
   and the knurled screw is tightened so the radius cannot grow again.
   Palette: #8fc7bd / #fff3d9 / #14312e.
   -------------------------------------------------------------------------- */
function LockedDividers({ role, delayMs }: SceneProps) {
  const legs = (
    <>
      <path d="M12 3.4L7 20M12 3.4L17 20" stroke="#8fc7bd" strokeWidth="2" {...SJ} fill="none" />
      <circle cx="12" cy="3.4" r="1.8" fill="#fff3d9" stroke="#14312e" strokeWidth="1" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(14, 76, 72, 6), background: "#14312e" }} />
        <V c="g44-ent" d={200} s={pct(24, 12, 52, 68)}>{legs}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(28, 52, 44, 30), borderRadius: "50%", border: "2px solid #fff3d9" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(26, 26, 48, 48), borderRadius: "50%", border: "2px solid #8fc7bd" }} />
        <V c="g44-hit" d={200} s={pct(22, 10, 56, 70)}>{legs}</V>
        <L c="g44-dust" d={400} s={{ ...pct(32, 60, 36, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,217,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,199,189,0.26)" d={70} />}>
      {/* tell: the pencil dot where the point will stand */}
      <L c="g44-tell" d={90} s={{ ...box(0.7, 0.7), borderRadius: "50%", background: "#14312e" }} />
      {/* the king the radius is measured from */}
      <V c="g44-raise" d={190} s={box(1.8, 1.8)}>
        <path d={KING} fill="#fff3d9" stroke="#14312e" strokeWidth="1.1" {...SJ} />
      </V>
      {/* strike: the legs open to two cells and the arc is scribed */}
      <V c="g44-div-legs" d={280} s={box(3.4, 4.2, 0, -1.2)}>{legs}</V>
      <L c="g44-div-arc" d={360} s={{ ...box(4.6, 4.6), borderRadius: "50%", border: "2px dashed #8fc7bd" }} />
      {/* the knurled screw tightens: the radius cannot grow back */}
      <V c="g44-div-screw" d={500} s={box(1.1, 1.1, 0, -1.9)}>
        <circle cx="12" cy="12" r="8" fill="#14312e" stroke="#fff3d9" strokeWidth="1.6" strokeDasharray="2 1.4" />
      </V>
      {/* the pieces outside the arc, shoved back in the real victim order */}
      {R3.map((i) => (
        <L key={i} c="g44-div-shove" d={560 + i * 40} per={28} s={{ ...box(0.8, 0.24, 3.1, [-1.6, 0, 1.6][i]), borderRadius: "999px", background: "#fff3d9" }} />
      ))}
      {/* settle: graphite dust off the scribed line */}
      <L c="g44-dust" d={680} s={{ ...box(4.4, 2.4, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,217,0.4), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   4. Winded Monarch (t2) — THE PLUMB LINE OFF TRUE.
   The bob is dropped from its hook, swings once, and then hangs at a visible
   lean beside the dashed true vertical: the king's rest is not level any more.
   Palette: #b9a7e8 / #fff1e0 / #211a35.
   -------------------------------------------------------------------------- */
function PlumbLine({ role, delayMs }: SceneProps) {
  const bob = <path d="M12 2.4l4 12.6-4 6.6-4-6.6z" fill="#b9a7e8" stroke="#211a35" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(46, 6, 8, 34), background: "#fff1e0" }} />
        <V c="g44-ent" d={200} s={pct(34, 34, 32, 52)}>{bob}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 74, 40, 16), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,167,232,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(48, 2, 4, 42), background: "#fff1e0" }} />
        <V c="g44-hit" d={200} s={pct(32, 32, 36, 56)}>{bob}</V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 68, 40, 24), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,224,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(185,167,232,0.26)" d={70} />}>
      {/* tell: the hook takes the weight */}
      <L c="g44-tell" d={90} s={{ ...box(1.2, 0.34, 0, -2.6), borderRadius: "999px", background: "#211a35" }} />
      {/* the true vertical, dashed, so the error is visible against something */}
      <L c="g44-plumb-true" d={190} s={{ ...box(0.1, 4.6, 0, -0.3), background: "repeating-linear-gradient(180deg, #fff1e0 0 14%, transparent 14% 28%)" }} />
      {/* strike: the cord drops and hangs at a lean, leaning by --fx-side */}
      <L c="g44-plumb-cord" d={280} s={{ ...box(0.09, 3.4, 0, -0.9), background: "#fff1e0" }} />
      <V c="g44-plumb-bob" d={330} s={{ ...box(1.4, 2, 0, 1.3), filter: "drop-shadow(0 0 4px #b9a7e8)" }}>{bob}</V>
      {/* the king sits down under it: one turn of rest */}
      <V c="g44-plumb-sag" d={470} s={box(1.8, 1.8, 1.9, 0.8)}>
        <path d={KING} fill="#fff1e0" stroke="#211a35" strokeWidth="1.1" {...SJ} />
      </V>
      {/* settle: the lean measured off, motes drifting away from the caster */}
      <L c="g44-motes" d={640} s={{ ...box(3.8, 2.2, 0.4, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,224,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   5. Cobweb Corners (t3) — THE WEB STRUNG INTO THE REAL CORNERS.
   Four quadrants of web are spun into the BOARD'S own corners (BoardFrame, so
   they are the corners wherever the card was cast), a spider drops on its
   thread, and one radial is hauled taut until two far corners touch.
   Palette: #cfd8e6 / #fff4dd / #171d2a.
   -------------------------------------------------------------------------- */
const WEB_Q = "M0 0h24v24C24 10.7 13.3 0 0 0z M0 5.6C10.2 5.6 18.4 13.8 18.4 24 M0 11.4c7 0 12.6 5.6 12.6 12.6";
function CobwebCorners({ role, delayMs }: SceneProps) {
  const corners: Array<{ s: Style; r: string }> = [
    { s: pct(0, 0, 26, 26), r: "0deg" },
    { s: pct(74, 0, 26, 26), r: "90deg" },
    { s: pct(74, 74, 26, 26), r: "180deg" },
    { s: pct(0, 74, 26, 26), r: "270deg" },
  ];
  const spider = (
    <>
      <ellipse cx="12" cy="13" rx="4.4" ry="5" fill="#171d2a" stroke="#cfd8e6" strokeWidth="1" />
      <path d="M8 9L3 5M8 13H2.6M8 17l-5 4M16 9l5-4M16 13h5.4M16 17l5 4" stroke="#cfd8e6" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(46, 0, 6, 40), background: "#cfd8e6" }} />
        <V c="g44-ent" d={200} s={pct(30, 30, 40, 46)}>{spider}</V>
        <V c="g44-ent3" d={430} s={pct(0, 0, 40, 40)}>
          <path d={WEB_Q} fill="none" stroke="#fff4dd" strokeWidth="1.1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g44-hit2" d={40} s={pct(0, 0, 46, 46)}>
          <path d={WEB_Q} fill="none" stroke="#cfd8e6" strokeWidth="1.3" />
        </V>
        <V c="g44-hit" d={200} s={pct(28, 28, 44, 48)}>{spider}</V>
        <L c="g44-motes" d={400} s={{ ...pct(34, 40, 32, 30), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,221,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      centred
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(207,216,230,0.24)" d={70} />
          {corners.map((cn, i) => (
            <V key={i} c="g44-web-corner" d={200} per={44} s={{ ...cn.s, rotate: cn.r }}>
              <path d={WEB_Q} fill="rgba(23,29,42,0.35)" stroke="#cfd8e6" strokeWidth="1.2" />
            </V>
          ))}
        </>
      }
    >
      {/* tell: the first strand tested */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.11), background: "#fff4dd" }} />
      {/* the spider drops on its thread onto the cast square */}
      <L c="g44-web-thread" d={230} s={{ ...box(0.08, 3.2, 0, -1.8), background: "#fff4dd" }} />
      <V c="g44-web-spider" d={300} s={{ ...box(1.6, 1.6), filter: "drop-shadow(0 0 4px #cfd8e6)" }}>{spider}</V>
      {/* strike: one radial hauled taut until the far corner is not far */}
      <L c="g44-fold" d={430} s={{ ...lane(0.24), background: "repeating-linear-gradient(90deg, #fff4dd 0 12%, transparent 12% 26%)" }} />
      {/* settle: dust shaken out of the web */}
      <L c="g44-motes" d={620} s={{ ...box(4.4, 2.6, 0.8, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,221,0.4), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   6. Cracked Bell (t3) — THE BELL WHOSE RINGS COME BACK IN.
   The clapper swings, the crack opens up the waist, and the sound rings travel
   INWARD instead of out: the truce arrives from the far edge of the board.
   Palette: #e0b45f / #fff2cc / #2b2010.
   -------------------------------------------------------------------------- */
function CrackedBell({ role, delayMs }: SceneProps) {
  const bell = (
    <>
      <path d="M5 18c0-7 2.6-9.6 7-11.4 4.4 1.8 7 4.4 7 11.4z" fill="#e0b45f" stroke="#2b2010" strokeWidth="1.2" {...SJ} />
      <path d="M3.6 18h16.8v2.2H3.6z" fill="#2b2010" />
      <circle cx="12" cy="5.4" r="1.5" fill="#fff2cc" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(12, 78, 76, 6), background: "#2b2010" }} />
        <V c="g44-ent" d={200} s={pct(24, 16, 52, 62)}>{bell}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 24, 40, 44), borderRadius: "50%", border: "2px solid #fff2cc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(22, 22, 56, 56), borderRadius: "50%", border: "2px solid #e0b45f" }} />
        <V c="g44-hit" d={200} s={pct(22, 14, 56, 64)}>{bell}</V>
        <L c="g44-glint" d={400} s={{ ...pct(44, 38, 12, 12), borderRadius: "50%", background: "#fff2cc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,180,95,0.26)" d={70} /><Rim tone="rgba(255,242,204,0.3)" d={150} /></>}>
      {/* tell: the clapper's shadow crosses the mouth */}
      <L c="g44-tell" d={90} s={{ ...box(1.4, 0.6, 0, 1.4), borderRadius: "999px", background: "#2b2010" }} />
      {/* the bell swings once */}
      <V c="g44-bell-swing" d={200} s={{ ...box(3.4, 3.4), filter: "drop-shadow(0 0 5px #e0b45f)" }}>{bell}</V>
      {/* strike: the crack opens up the waist */}
      <L c="g44-bell-crack" d={330} s={{ ...box(0.16, 2.4, 0.5, -0.3), background: "#2b2010" }} />
      {/* the rings arrive from OUTSIDE and close on the bell */}
      {R3.map((i) => (
        <L key={i} c="g44-bell-inring" d={400 + i * 90} per={40} s={{ ...box(7 - i * 1.6, 7 - i * 1.6), borderRadius: "50%", border: "2px solid #fff2cc" }} />
      ))}
      {/* settle: one glint on the crack, then brass dust */}
      <L c="g44-glint" d={620} s={{ ...box(1.1, 1.1, 0.5, -0.3), borderRadius: "50%", background: "radial-gradient(circle, #fff2cc, transparent 72%)" }} />
      <L c="g44-dust" d={700} s={{ ...box(4, 2.2, 0, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,204,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   7. No Sidling (t3) — THE LODESTONE AND THE NEEDLE.
   A lodestone surfaces under the card square; the compass needle spins, tries
   east, tries west, and is thrown off both. Sideways stops being a direction.
   Palette: #7fb3e8 / #fff0d8 / #10233a.
   -------------------------------------------------------------------------- */
function LodestoneNeedle({ role, delayMs }: SceneProps) {
  const needle = (
    <>
      <path d="M12 3l2.4 9H9.6z" fill="#7fb3e8" />
      <path d="M12 21l-2.4-9h4.8z" fill="#fff0d8" />
      <circle cx="12" cy="12" r="1.5" fill="#10233a" stroke="#fff0d8" strokeWidth="0.9" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(20, 20, 60, 60), borderRadius: "50%", border: "2px solid #7fb3e8" }} />
        <V c="g44-ent" d={200} s={pct(28, 14, 44, 72)}>{needle}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(34, 62, 32, 22), borderRadius: "50%", background: "radial-gradient(circle, rgba(16,35,58,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(18, 18, 64, 64), borderRadius: "50%", border: "2px solid #7fb3e8" }} />
        <V c="g44-hit" d={200} s={pct(26, 10, 48, 80)}>{needle}</V>
        <L c="g44-grit" d={400} s={{ ...pct(46, 46, 8, 4), background: "#fff0d8", "--sx": "-160%", "--sy": "130%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(127,179,232,0.26)" d={70} />}>
      {/* tell: the lodestone's dark pool rises under the square */}
      <L c="g44-tell" d={90} s={{ ...box(2.6, 1.4, 0, 1.2), borderRadius: "50%", background: "#10233a" }} />
      {/* the compass card, its cardinal ticks in the real victim order */}
      <L c="g44-lode-card" d={200} s={{ ...box(5, 5), borderRadius: "50%", border: "2px solid #7fb3e8", background: "radial-gradient(circle, rgba(16,35,58,0.7), transparent 74%)" }} />
      {R4.map((i) => (
        <L key={i} c="g44-lode-tick" d={260 + i * 45} per={30} s={{ ...box(0.9, 0.18, [2.1, 0, -2.1, 0][i], [0, 2.1, 0, -2.1][i]), background: "#fff0d8", rotate: `${i * 90}deg` }} />
      ))}
      {/* strike: the needle spins and refuses to settle across the ranks */}
      <V c="g44-lode-needle" d={360} s={{ ...box(4.2, 4.2), filter: "drop-shadow(0 0 5px #7fb3e8)" }}>{needle}</V>
      {/* the stone itself, humming, a blister in the floor */}
      <L c="g44-lode-stone" d={500} s={{ ...box(1.8, 1.1, 0, 1.4), borderRadius: "50%", background: "linear-gradient(180deg, #7fb3e8, #10233a)" }} />
      {/* settle: iron filings thrown clear */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={640 + i * 50} s={{ ...box(0.3, 0.14, [1.6, -1.7, 0.4][i], [0.7, 0.4, 1.5][i]), background: "#fff0d8", "--sx": ["170%", "-150%", "120%"][i], "--sy": "calc(var(--fx-side, 1) * -150%)" }} />
      ))}
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   8. Rusty Visor (t3) — THE IRIS CLOSING ON THE FAR TARGET.
   A sight line opens down the real run, the rich target rings at the end of it,
   and then four rusted iris blades wind shut across the view.
   Palette: #b08a5a / #ffeccf / #241a10.
   -------------------------------------------------------------------------- */
function IrisVisor({ role, delayMs }: SceneProps) {
  const blade = "M12 12L2 6.2A11.6 11.6 0 0 1 12 0.4z";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 48, 88, 5), background: "#b08a5a" }} />
        <V c="g44-ent" d={200} s={pct(22, 22, 56, 56)}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="#b08a5a" strokeWidth="2.2" />
          <path d={blade} fill="#ffeccf" />
          <path d={blade} fill="#ffeccf" transform="rotate(180 12 12)" />
        </V>
        <L c="g44-ent3" d={430} s={{ ...pct(40, 40, 20, 20), borderRadius: "50%", background: "#241a10" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 50, 96, 6), background: "#b08a5a" }} />
        <V c="g44-hit" d={200} s={pct(20, 20, 60, 60)}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="#ffeccf" strokeWidth="2" />
          {R4.map((i) => <path key={i} d={blade} fill="#b08a5a" stroke="#241a10" strokeWidth="0.7" transform={`rotate(${i * 90} 12 12)`} />)}
        </V>
        <L c="g44-grit" d={400} s={{ ...pct(44, 44, 10, 6), background: "#ffeccf", "--sx": "140%", "--sy": "-140%" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(176,138,90,0.26)" d={70} />}>
      {/* tell: the sight line down the real distance to the richer piece */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.12), background: "#ffeccf" }} />
      {/* the far target rings, exactly where it stands */}
      <L c="g44-iris-mark" d={210} s={{ ...at(1, 2, 2), borderRadius: "50%", border: "2px solid #ffeccf" }} />
      {/* strike: four rusted blades wind shut across the view */}
      {R4.map((i) => (
        <V key={i} c="g44-iris-blade" d={320 + i * 40} per={26} s={{ ...box(3.6, 3.6), rotate: `${i * 90}deg` }}>
          <path d={blade} fill="#b08a5a" stroke="#241a10" strokeWidth="0.8" {...SJ} />
        </V>
      ))}
      {/* everything past the blades goes dark for the rest of the run */}
      <L c="g44-iris-dark" d={470} s={{ ...seg(0.3, 1, 2.6), background: "linear-gradient(90deg, rgba(36,26,16,0.1), rgba(36,26,16,0.85))" }} />
      {/* settle: rust flaking off the hinge */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={620 + i * 45} s={{ ...box(0.32, 0.16, [0.3, -0.2, 0.6][i], [-0.5, 0.5, 0.2][i]), background: "#b08a5a", "--sx": ["130%", "-140%", "160%"][i], "--sy": "calc(var(--fx-side, 1) * -170%)" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   9. Stunned Grief (t3) — THE SHADOW THAT FALLS TOWARD THE LIGHT.
   A candle is lit over the square where the piece fell, and its shadow runs the
   wrong way: back INTO the flame, so the way home is the way away.
   Palette: #8ea2c4 / #fff0da / #141a26.
   -------------------------------------------------------------------------- */
function GriefShadow({ role, delayMs }: SceneProps) {
  const candle = (
    <>
      <path d="M9.4 10h5.2v10H9.4z" fill="#fff0da" stroke="#141a26" strokeWidth="1" />
      <path d="M7.8 20h8.4v2.2H7.8z" fill="#141a26" />
      <path d="M12 3.2c1.9 1.9 2.8 3.2 2.8 4.4a2.8 2.8 0 0 1-5.6 0c0-1.2.9-2.5 2.8-4.4z" fill="#8ea2c4" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(10, 76, 80, 7), background: "#141a26" }} />
        <V c="g44-ent" d={200} s={pct(32, 14, 36, 66)}>{candle}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(20, 66, 34, 8), background: "linear-gradient(90deg, transparent, #141a26)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(12, 70, 76, 8), background: "linear-gradient(90deg, #141a26, transparent)" }} />
        <V c="g44-hit" d={200} s={pct(30, 10, 40, 70)}>{candle}</V>
        <L c="g44-motes" d={400} s={{ ...pct(34, 20, 32, 30), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,218,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(142,162,196,0.24)" d={70} />}>
      {/* tell: the wick catches */}
      <L c="g44-tell" d={90} s={{ ...box(0.9, 0.9, 0, -1.4), borderRadius: "50%", background: "#fff0da" }} />
      {/* the candle standing over the square the piece was taken on */}
      <V c="g44-grief-candle" d={200} s={{ ...box(2, 3.4, 0, -0.6), filter: "drop-shadow(0 0 5px #8ea2c4)" }}>{candle}</V>
      {/* strike: the shadow lays itself the wrong way, back into the flame */}
      <L c="g44-grief-shadow" d={330} s={{ ...box(4.6, 1.2, -2.3, 1.5), background: "linear-gradient(90deg, rgba(20,26,38,0), rgba(20,26,38,0.9))" }} />
      {/* the square itself refuses to be stood on again */}
      <L c="g44-grief-seal" d={450} s={{ ...box(1, 1, 0, 1.5), border: "2px solid #8ea2c4", background: "rgba(20,26,38,0.6)" }} />
      {/* settle: one wisp of smoke, then motes off the flame */}
      <V c="g44-grief-wisp" d={590} s={box(1.4, 2.4, 0, -2.6)}>
        <path d="M12 22c-3-2.4 2-4.6-1-7.6s2-4.4 0-7.4" fill="none" stroke="#fff0da" strokeWidth="1.5" strokeLinecap="round" />
      </V>
      <L c="g44-motes" d={690} s={{ ...box(3.6, 2.4, 0, -1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,218,0.4), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   10. Broken Oars (t4) — THE OAR BENT AT THE WATERLINE.
   The blade goes in straight and comes out crooked: below the surface the shaft
   sits at a different angle, and the wake leaves at an angle of its own. No
   stroke can be rowed twice. Palette: #7fbfd4 / #fff3d6 / #123240.
   -------------------------------------------------------------------------- */
function BentOar({ role, delayMs }: SceneProps) {
  const oar = (
    <>
      <path d="M2 12h13" stroke="#fff3d6" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 8.4c4 .6 6.6 2 6.6 3.6s-2.6 3-6.6 3.6z" fill="#7fbfd4" stroke="#123240" strokeWidth="1.1" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 56, 92, 5), background: "#7fbfd4" }} />
        <V c="g44-ent" d={200} s={pct(12, 24, 76, 40)}>{oar}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(26, 60, 48, 22), borderRadius: "50%", border: "2px solid #fff3d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 52, 96, 5), background: "#7fbfd4" }} />
        <V c="g44-hit" d={200} s={{ ...pct(8, 22, 84, 44), rotate: "-14deg" }}>{oar}</V>
        <L c="g44-drip" d={400} s={{ ...pct(46, 62, 8, 14), borderRadius: "999px", background: "#fff3d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(127,191,212,0.26)" d={70} />}>
      {/* tell: the waterline drawn across the whole run */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.14, 0.2), background: "#fff3d6" }} />
      {/* the shaft above the water, straight and honest */}
      <V c="g44-oar-shaft" d={210} s={{ ...box(3.6, 1.2, 0.4, -1), rotate: "-18deg" }}>{oar}</V>
      {/* strike: below the line the same shaft sits at another angle */}
      <V c="g44-oar-bend" d={330} s={{ ...box(3.4, 1.2, 1.5, 1.1), rotate: "16deg" }}>{oar}</V>
      {/* the wake leaves down a vector of its own, the real run's length */}
      <L c="g44-oar-wake" d={430} s={{ ...seg(0.15, 1, 0.8, 0.9), background: "linear-gradient(90deg, rgba(255,243,214,0.75), rgba(127,191,212,0))" }} />
      {/* the surface ring where the blade broke it */}
      <L c="g44-oar-ring" d={500} s={{ ...box(2.4, 1.1, 1.3, 0.2), borderRadius: "50%", border: "2px solid #fff3d6" }} />
      {/* settle: water off the blade, thrown away from the caster */}
      {R3.map((i) => (
        <L key={i} c="g44-drip" d={620 + i * 55} s={{ ...box(0.28, 0.6, 0.8 + i * 0.7, 1.2), borderRadius: "999px", background: "#fff3d6" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   11. Crime Scene (t4) — THE CORDON THAT CLOSES ON ITSELF.
   Four stakes are driven around the square in the real victim order, the tape
   is run between them, and the last span comes up impossibly short: the far
   stake was never that far. Palette: #e8c451 / #fff4d0 / #241d08.
   -------------------------------------------------------------------------- */
function TapeCordon({ role, delayMs }: SceneProps) {
  const TAPE = "repeating-linear-gradient(56deg, #e8c451 0 16%, #241d08 16% 30%)";
  const stake = (
    <>
      <path d="M11 4h2v17h-2z" fill="#241d08" stroke="#e8c451" strokeWidth="0.9" />
      <path d="M8.6 3.2h6.8v2.6H8.6z" fill="#fff4d0" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 46, 92, 12), background: TAPE }} />
        <V c="g44-ent" d={200} s={pct(36, 18, 28, 64)}>{stake}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 62, 40, 20), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,208,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 44, 100, 13), background: TAPE }} />
        <V c="g44-hit" d={200} s={pct(34, 12, 32, 70)}>{stake}</V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 66, 40, 24), borderRadius: "50%", background: "radial-gradient(circle, rgba(232,196,81,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,196,81,0.26)" d={70} />}>
      {/* tell: the chalk tick on the flagstone */}
      <L c="g44-tell" d={90} s={{ ...box(1.1, 0.2), borderRadius: "999px", background: "#fff4d0" }} />
      {/* four stakes driven in, in the real victim order */}
      {R4.map((i) => (
        <V key={i} c="g44-cord-stake" d={200 + i * 55} per={28} s={box(0.7, 2, [-2.2, 2.2, 2.2, -2.2][i], [-1.6, -1.6, 1.6, 1.6][i])}>{stake}</V>
      ))}
      {/* strike: the tape runs the whole real distance between them */}
      <L c="g44-cord-tape" d={420} s={{ ...lane(0.5, -1.6), background: TAPE }} />
      {/* and the return span closes far shorter than it was measured */}
      <L c="g44-fold" d={500} s={{ ...lane(0.5, 1.6), background: TAPE }} />
      {/* the seal plate thunks down in the middle of the roped square */}
      <V c="g44-cord-seal" d={580} s={{ ...box(1.8, 1.8), filter: "drop-shadow(0 0 4px #fff4d0)" }}>
        <circle cx="12" cy="12" r="9" fill="#241d08" stroke="#e8c451" strokeWidth="1.6" />
        <path d="M7 12h10M12 7v10" stroke="#fff4d0" strokeWidth="1.5" strokeLinecap="round" />
      </V>
      {/* settle: chalk dust off the flagstone */}
      <L c="g44-dust" d={690} s={{ ...box(4.6, 2.4, 0, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,208,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   12. Tangled Marionettes (t4) — THE KNOT PULLED THROUGH ITSELF.
   Two slack strings cross, the bight is fed back through its own loop, and the
   knot comes out on the other side of itself: every neighbour twitches.
   Palette: #c39ae8 / #fff0e2 / #241633.
   -------------------------------------------------------------------------- */
function KnotThroughItself({ role, delayMs }: SceneProps) {
  const knot = (
    <>
      <path d="M3 18c5-1 6-9 9-9s4 8 9 9" fill="none" stroke="#c39ae8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 8c5 1 6 9 9 9s4-8 9-9" fill="none" stroke="#fff0e2" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 24, 88, 4), background: "#c39ae8" }} />
        <V c="g44-ent" d={200} s={pct(16, 22, 68, 56)}>{knot}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(40, 40, 20, 20), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,226,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(44, 0, 4, 44), background: "#fff0e2" }} />
        <V c="g44-hit" d={200} s={pct(12, 20, 76, 60)}>{knot}</V>
        <L c="g44-motes" d={400} s={{ ...pct(34, 46, 32, 28), borderRadius: "50%", background: "radial-gradient(circle, rgba(195,154,232,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead centred d={delayMs} frame={<Wash tone="rgba(195,154,232,0.26)" d={70} />}>
      {/* tell: two strings hang slack from the bar overhead */}
      <L c="g44-tell" d={90} s={{ ...box(3.6, 0.2, 0, -2.4), borderRadius: "999px", background: "#241633" }} />
      {R2.map((i) => (
        <L key={i} c="g44-knot-string" d={170 + i * 60} s={{ ...box(0.09, 3, [-0.8, 0.8][i], -0.9), background: "#fff0e2" }} />
      ))}
      {/* strike: the bight is fed back through its own loop */}
      <V c="g44-knot-body" d={320} s={{ ...box(3.6, 3.6), filter: "drop-shadow(0 0 5px #c39ae8)" }}>{knot}</V>
      <L c="g44-knot-through" d={430} s={{ ...box(1.6, 1.6), borderRadius: "50%", border: "2px solid #fff0e2" }} />
      {/* every neighbour jerks, in the real victim order */}
      {R4.map((i) => (
        <L key={i} c="g44-knot-jerk" d={520 + i * 45} per={26} s={{ ...box(0.9, 0.24, [1.9, -1.9, 0, 0][i], [0, 0, 1.9, -1.9][i]), borderRadius: "999px", background: "#c39ae8", rotate: i > 1 ? "90deg" : "0deg" }} />
      ))}
      {/* settle: fibre picked out of the knot, drifting off the caster's side */}
      <L c="g44-motes" d={690} s={{ ...box(4, 2.4, 0, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,226,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   13. Change of Step (t5) — THE DANCE FLOOR THAT TURNS UNDER THE FEET.
   The step diagram is chalked on the boards, the pair of prints lands on it,
   and the floor rotates a quarter turn: the next step is somewhere else.
   Palette: #dba6c8 / #fff2e4 / #2a1626.
   -------------------------------------------------------------------------- */
const SOLE = "M12 2.6c3 0 4.6 2.6 4.6 6.4 0 3-1.6 4.6-1.6 7.4 0 3.2-1.2 5-3 5s-3-1.8-3-5c0-2.8-1.6-4.4-1.6-7.4C7.4 5.2 9 2.6 12 2.6z";
function StepFloor({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 8, 84, 84), border: "2px dashed #dba6c8" }} />
        <V c="g44-ent" d={200} s={pct(30, 18, 24, 50)}>
          <path d={SOLE} fill="#fff2e4" stroke="#2a1626" strokeWidth="1.1" />
        </V>
        <V c="g44-ent3" d={430} s={pct(50, 36, 24, 50)}>
          <path d={SOLE} fill="#dba6c8" stroke="#2a1626" strokeWidth="1.1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(10, 10, 80, 80), border: "2px dashed #dba6c8" }} />
        <V c="g44-hit" d={200} s={pct(26, 16, 26, 56)}>
          <path d={SOLE} fill="#fff2e4" stroke="#2a1626" strokeWidth="1.1" />
        </V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 58, 40, 30), borderRadius: "50%", background: "radial-gradient(circle, rgba(219,166,200,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(219,166,200,0.26)" d={70} />}>
      {/* tell: the chalk diagram is scuffed onto the boards */}
      <L c="g44-tell" d={90} s={{ ...box(4.4, 4.4), border: "2px dashed #2a1626" }} />
      {/* the pair of prints lands on the figure */}
      {R2.map((i) => (
        <V key={i} c="g44-step-sole" d={200 + i * 90} s={box(1.1, 2.2, [-0.9, 0.9][i], [0.3, -0.3][i])}>
          <path d={SOLE} fill={i === 0 ? "#fff2e4" : "#dba6c8"} stroke="#2a1626" strokeWidth="1.1" />
        </V>
      ))}
      {/* strike: the whole floor turns a quarter under them */}
      <L c="g44-step-turn" d={380} s={{ ...box(5.4, 5.4), borderRadius: "50%", border: "2px solid #dba6c8", background: "conic-gradient(from 0deg, rgba(219,166,200,0.28), transparent 42%, rgba(255,242,228,0.22))" }} />
      {/* the arrows renumber themselves in the real victim order */}
      {R3.map((i) => (
        <L key={i} c="g44-step-arrow" d={480 + i * 50} per={28} s={{ ...box(1.2, 0.24, [2.3, -1.2, -1.2][i], [0, 2, -2][i]), borderRadius: "999px", background: "#fff2e4", rotate: `${[0, 120, -120][i]}deg` }} />
      ))}
      {/* the next print lands off the figure entirely */}
      <V c="g44-step-off" d={600} s={box(1.1, 2.2, 2.6, 1.3)}>
        <path d={SOLE} fill="#dba6c8" stroke="#2a1626" strokeWidth="1.1" opacity="0.8" />
      </V>
      {/* settle: chalk dust kicked off the boards */}
      <L c="g44-dust" d={700} s={{ ...box(4.6, 2.6, 0.6, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,228,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   14. Leaden Boots (t5) — THE GRID THAT CROWDS.
   The floor is ruled out the whole real distance, the boot comes down, and past
   two cells the rules crowd together until there is no room to stride into.
   Palette: #9aa7b8 / #fff1d9 / #161c26.
   -------------------------------------------------------------------------- */
function CrowdedGrid({ role, delayMs }: SceneProps) {
  const boot = (
    <>
      <path d="M8 3h5v10l6 3.4V20H8z" fill="#9aa7b8" stroke="#161c26" strokeWidth="1.2" {...SJ} />
      <path d="M7.2 20h12.6v2.2H7.2z" fill="#161c26" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 72, 92, 10), background: "repeating-linear-gradient(90deg, #9aa7b8 0 8%, transparent 8% 22%)" }} />
        <V c="g44-ent" d={200} s={pct(28, 14, 44, 62)}>{boot}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(26, 70, 48, 16), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,217,0.7), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 74, 96, 9), background: "repeating-linear-gradient(90deg, #fff1d9 0 6%, transparent 6% 20%)" }} />
        <V c="g44-hit" d={200} s={pct(26, 10, 48, 68)}>{boot}</V>
        <L c="g44-dust" d={400} s={{ ...pct(28, 66, 44, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(154,167,184,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(154,167,184,0.26)" d={70} />}>
      {/* tell: the floor is ruled out to the real target square */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.12, 1.4), background: "#fff1d9" }} />
      {/* the rules themselves, the whole distance */}
      <L c="g44-grid-rules" d={200} s={{ ...lane(2.6), background: "repeating-linear-gradient(90deg, rgba(154,167,184,0.9) 0 3%, transparent 3% 14%)" }} />
      {/* the boot comes down on the cast square */}
      <V c="g44-grid-boot" d={300} s={{ ...box(2.2, 2.6, -0.3, -0.4), filter: "drop-shadow(0 0 5px #9aa7b8)" }}>{boot}</V>
      {/* strike: past two cells the rules crowd into a wall of lines */}
      <L c="g44-fold" d={400} s={{ ...seg(0.15, 1, 2.6), background: "repeating-linear-gradient(90deg, #fff1d9 0 4%, transparent 4% 16%)" }} />
      {/* and a stop bar stands at exactly two cells out */}
      <L c="g44-grid-stop" d={500} s={{ ...box(0.4, 3, 2), background: "linear-gradient(180deg, #161c26, #9aa7b8, #161c26)", border: "1px solid #fff1d9" }} />
      {/* settle: dust off the sole, drifting away from the caster */}
      <L c="g44-dust" d={660} s={{ ...box(4, 2.2, 0.6, 1.1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,217,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   15. Wizard Duel (t6) — THE TWO MIRRORS FACING.
   A mirror stands on each square and the corridor between them fills with a
   receding file of frames. One of the two reflections never comes back out.
   Palette: #a8d8ff / #fff2df / #101f33.
   -------------------------------------------------------------------------- */
function FacingMirrors({ role, delayMs }: SceneProps) {
  const glass = (
    <>
      <rect x="5" y="2" width="14" height="20" rx="1" fill="rgba(16,31,51,0.85)" stroke="#a8d8ff" strokeWidth="1.4" />
      <path d="M7 19L17 5" stroke="#fff2df" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 48, 88, 4), background: "#a8d8ff" }} />
        <V c="g44-ent" d={200} s={pct(14, 18, 30, 64)}>{glass}</V>
        <V c="g44-ent3" d={430} s={{ ...pct(56, 18, 30, 64), scale: "-1 1" }}>{glass}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 46, 96, 6), background: "#a8d8ff" }} />
        <V c="g44-hit" d={200} s={pct(28, 12, 44, 74)}>{glass}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 40, 16, 16), borderRadius: "50%", background: "#fff2df" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(168,216,255,0.26)" d={70} />}>
      {/* tell: the spark struck between the two duellists */}
      <L c="g44-tell" d={90} s={{ ...box(0.9, 0.9), borderRadius: "50%", background: "#fff2df" }} />
      {/* a mirror on the cast square, and one on the real far square */}
      {R2.map((i) => (
        <V key={i} c="g44-mirror-face" d={190 + i * 70} s={{ ...at(i, 1.5, 3.2), scale: i === 0 ? "1 1" : "-1 1" }}>{glass}</V>
      ))}
      {/* strike: the corridor of reflections opens down the real gap */}
      {R3.map((i) => (
        <L key={i} c="g44-mirror-echo" d={340 + i * 70} per={30} s={{ ...at(0.28 + i * 0.22, 1.1 - i * 0.22, 2.4 - i * 0.5), border: "2px solid #a8d8ff", background: "rgba(16,31,51,0.35)" }} />
      ))}
      {/* the duel flash in the middle of the file */}
      <L c="g44-mirror-flash" d={520} s={{ ...seg(0, 1, 0.4), background: "linear-gradient(90deg, rgba(255,242,223,0.1), #fff2df, rgba(255,242,223,0.1))" }} />
      {/* one reflection walks away and does not come back */}
      <V c="g44-mirror-lost" d={600} s={at(0.62, 1.2, 2.2)}>
        <path d={PAWN} fill="#101f33" stroke="#a8d8ff" strokeWidth="1.1" />
      </V>
      {/* settle: silvering dust off the glass */}
      <L c="g44-motes" d={700} s={{ ...box(4.4, 2.6, 1.2, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,223,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   16. Lantern Out (t6) — THE SHUTTER AND THE COLLAPSING CONE.
   The lantern's shutters wind down, its cone of light retracts to the wick, and
   the opponent's own half of the board (whichever end that is) loses its
   distances entirely. Palette: #f0c46a / #fff3cf / #1d1708.
   -------------------------------------------------------------------------- */
function LanternShutter({ role, delayMs }: SceneProps) {
  const lantern = (
    <>
      <path d="M8 6h8v12H8z" fill="rgba(29,23,8,0.8)" stroke="#f0c46a" strokeWidth="1.3" />
      <path d="M6.6 4.4h10.8v2H6.6zM6.6 18h10.8v2H6.6z" fill="#f0c46a" />
      <path d="M12 1.6v2.8" stroke="#f0c46a" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="12" cy="12" rx="2.2" ry="3" fill="#fff3cf" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(24, 62, 52, 26), background: "radial-gradient(circle at 50% 0%, rgba(240,196,106,0.8), transparent 72%)" }} />
        <V c="g44-ent" d={200} s={pct(30, 14, 40, 60)}>{lantern}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(38, 34, 24, 24), borderRadius: "50%", background: "#1d1708" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(20, 58, 60, 30), background: "radial-gradient(circle at 50% 0%, rgba(255,243,207,0.8), transparent 70%)" }} />
        <V c="g44-hit" d={200} s={pct(28, 10, 44, 66)}>{lantern}</V>
        <L c="g44-motes" d={400} s={{ ...pct(34, 20, 32, 28), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,196,106,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      centred
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(240,196,106,0.24)" d={70} />
          {/* their own half goes dark, whichever end of the screen it is */}
          <L c="g44-lantern-half" d={330} s={{ ...farBand(50), background: "linear-gradient(180deg, rgba(29,23,8,0.88), rgba(29,23,8,0.2))" }} />
        </>
      }
    >
      {/* tell: the flame gutters once */}
      <L c="g44-tell" d={90} s={{ ...box(0.9, 1.2, 0, -0.2), borderRadius: "50%", background: "#fff3cf" }} />
      {/* the lantern on its hook over the cast square */}
      <V c="g44-lantern-body" d={200} s={{ ...box(2.4, 3.2, 0, -0.6), filter: "drop-shadow(0 0 6px #f0c46a)" }}>{lantern}</V>
      {/* strike: the cone of light retracts to the wick */}
      <L c="g44-lantern-cone" d={320} s={{ ...box(6, 4.4, 0, 1.6), background: "radial-gradient(ellipse at 50% 0%, rgba(255,243,207,0.7), transparent 72%)" }} />
      {/* the two shutters wind shut across the glass */}
      {R2.map((i) => (
        <L key={i} c="g44-lantern-shut" d={400 + i * 60} s={{ ...box(2.4, 0.9, 0, -0.6 + (i === 0 ? -0.8 : 0.8)), background: "linear-gradient(180deg, #f0c46a, #1d1708)", "--sy": i === 0 ? "90%" : "-90%" }} />
      ))}
      {/* settle: one ember falls, then the motes go out */}
      <L c="g44-drip" d={600} s={{ ...box(0.3, 0.5, 0.2, 1.4), borderRadius: "999px", background: "#fff3cf" }} />
      <L c="g44-motes" d={690} s={{ ...box(3.6, 2.4, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,196,106,0.4), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   17. Crossbow Curfew (t7) — THE BUTT THAT WALKS IN.
   The range is scribed out to the real target, the bolt runs it once, and then
   the straw butt is hauled all the way in and re-pegged at one square: there is
   no long shot left to take. Palette: #d98b4a / #fff0d4 / #2a1508.
   -------------------------------------------------------------------------- */
function ArcheryButt({ role, delayMs }: SceneProps) {
  const butt = (
    <>
      <circle cx="12" cy="12" r="10" fill="#d98b4a" stroke="#2a1508" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="6.2" fill="#fff0d4" />
      <circle cx="12" cy="12" r="2.6" fill="#2a1508" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 50, 92, 4), background: "#d98b4a" }} />
        <V c="g44-ent" d={200} s={pct(28, 20, 44, 60)}>{butt}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(16, 46, 22, 8), borderRadius: "999px", background: "#fff0d4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 48, 100, 5), background: "#d98b4a" }} />
        <V c="g44-hit" d={200} s={pct(24, 16, 52, 68)}>{butt}</V>
        <L c="g44-grit" d={400} s={{ ...pct(44, 44, 12, 5), background: "#fff0d4", "--sx": "-170%", "--sy": "-120%" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<><Wash tone="rgba(217,139,74,0.26)" d={70} /><Rim tone="rgba(255,240,212,0.28)" d={150} /></>}>
      {/* tell: the range scribed out to where the shot could have gone */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.13), background: "#fff0d4" }} />
      {/* the stock on the cast square */}
      <V c="g44-bow-stock" d={190} s={box(2.4, 1.6, -0.2)}>
        <path d="M3 11h13l5-3v8l-5-3H3z" fill="#2a1508" stroke="#d98b4a" strokeWidth="1.2" {...SJ} />
        <path d="M16 4v16" stroke="#d98b4a" strokeWidth="1.4" strokeLinecap="round" />
      </V>
      {/* the bolt runs the real distance, once, before the rule lands */}
      <L c="g44-run1" d={280} s={{ ...box(1, 0.22, 0.5), borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff0d4)" }} />
      {/* strike: the butt is hauled the whole way in from the far square */}
      <V c="g44-haul1" d={400} s={{ ...box(1, 1, 0.5), filter: "drop-shadow(0 0 5px #d98b4a)" }}>{butt}</V>
      {/* and re-pegged at exactly one square out */}
      <L c="g44-bow-peg" d={560} s={{ ...box(0.34, 1.6, 1), background: "linear-gradient(180deg, #2a1508, #d98b4a)", border: "1px solid #fff0d4" }} />
      {/* everything past the peg is struck off the range */}
      <L c="g44-bow-strike" d={620} s={{ ...seg(0.25, 1, 0.22), background: "repeating-linear-gradient(90deg, #2a1508 0 10%, transparent 10% 24%)" }} />
      {/* settle: straw off the butt, thrown away from the caster */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={700 + i * 45} s={{ ...box(0.34, 0.14, 1 + [0.2, -0.2, 0.5][i], [-0.4, 0.5, 0.1][i]), background: "#fff0d4", "--sx": ["150%", "-140%", "180%"][i], "--sy": "calc(var(--fx-side, 1) * -170%)" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   FAMILY B — TELEPORT RIFT. Ten cards where two places are the same place, or
   a place stops being reachable at all.
   ========================================================================== */

/* -----------------------------------------------------------------------------
   18. Portal Pair (t2) — THE TWO MOUTHS THAT SHOW THE SAME THING.
   A mouth is cut on the cast square and another on the real far square, and
   both show the identical view. A token dropped in one rises out of the other.
   Palette: #7fe0d0 / #fff2e6 / #10302e.
   -------------------------------------------------------------------------- */
function TwinMouths({ role, delayMs }: SceneProps) {
  const mouth = (
    <>
      <ellipse cx="12" cy="12" rx="7.6" ry="10.4" fill="rgba(16,48,46,0.8)" stroke="#7fe0d0" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="3.4" ry="5.6" fill="none" stroke="#fff2e6" strokeWidth="1.1" />
      <path d="M12 7.4v9.2" stroke="#fff2e6" strokeWidth="1.1" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 48, 88, 4), background: "#7fe0d0" }} />
        <V c="g44-ent" d={200} s={pct(8, 16, 34, 68)}>{mouth}</V>
        <V c="g44-ent3" d={430} s={pct(58, 16, 34, 68)}>{mouth}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(26, 26, 48, 48), borderRadius: "50%", border: "2px solid #7fe0d0" }} />
        <V c="g44-hit" d={200} s={pct(26, 8, 48, 84)}>{mouth}</V>
        <L c="g44-motes" d={400} s={{ ...pct(34, 34, 32, 32), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,230,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(127,224,208,0.26)" d={70} />}>
      <L c="g44-tellline" d={90} s={{ ...lane(0.12), background: "#fff2e6" }} />
      {/* the pair, one on each real square, showing the identical view */}
      {R2.map((i) => (
        <V key={i} c="g44-portal-mouth" d={200 + i * 80} s={{ ...at(i, 1.6, 2.4), filter: "drop-shadow(0 0 5px #7fe0d0)" }}>{mouth}</V>
      ))}
      {/* strike: the gap between them is pulled out of existence */}
      <L c="g44-fold" d={380} s={{ ...lane(0.5), background: "linear-gradient(90deg, rgba(127,224,208,0.85), rgba(255,242,230,0.25))" }} />
      {/* a piece drops into the near mouth... */}
      <V c="g44-portal-in" d={460} s={at(0, 1.1, 1.5)}>
        <path d={PAWN} fill="#fff2e6" stroke="#10302e" strokeWidth="1.1" />
      </V>
      {/* ...and rises out of the far one */}
      <V c="g44-portal-out" d={560} s={{ ...at(1, 1.1, 1.5), filter: "drop-shadow(0 0 4px #fff2e6)" }}>
        <path d={PAWN} fill="#7fe0d0" stroke="#10302e" strokeWidth="1.1" />
      </V>
      <L c="g44-motes" d={690} s={{ ...box(3.6, 2.4, 0.4, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,230,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   19. Ghost Walk (t4) — THE STRIDE THAT IS TOO LONG.
   Prints appear along the floor in the real victim order, then the middle of
   the line simply is not there, and the last print lands the whole distance
   away. Palette: #b9d8ff / #fff1e2 / #16203a.
   -------------------------------------------------------------------------- */
function GhostSteps({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 74, 88, 5), background: "#16203a" }} />
        <V c="g44-ent" d={200} s={pct(16, 26, 22, 46)}>
          <path d={SOLE} fill="#b9d8ff" stroke="#16203a" strokeWidth="1" />
        </V>
        <V c="g44-ent3" d={430} s={pct(62, 30, 22, 46)}>
          <path d={SOLE} fill="#fff1e2" stroke="#16203a" strokeWidth="1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 70, 92, 6), background: "#b9d8ff" }} />
        <V c="g44-hit" d={200} s={pct(30, 18, 26, 56)}>
          <path d={SOLE} fill="#fff1e2" stroke="#16203a" strokeWidth="1.1" />
        </V>
        <L c="g44-motes" d={400} s={{ ...pct(32, 34, 36, 34), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,216,255,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,216,255,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1, 1.6, -0.4), borderRadius: "50%", background: "#16203a" }} />
      {/* the first prints, arriving in the real victim order */}
      {R3.map((i) => (
        <V key={i} c="g44-ghost-print" d={200 + i * 60} per={28} s={{ ...at(i * 0.1, 0.8, 1.5, i % 2 ? 0.4 : -0.4), rotate: "90deg" }}>
          <path d={SOLE} fill="#b9d8ff" stroke="#16203a" strokeWidth="1" />
        </V>
      ))}
      {/* strike: the middle of the walk is not there at all */}
      <L c="g44-ghost-gap" d={400} s={{ ...seg(0.3, 0.85, 1.8), background: "linear-gradient(90deg, rgba(22,32,58,0.85), rgba(22,32,58,0.1))" }} />
      {/* and the stride finishes the whole real distance away */}
      <V c="g44-ghost-far" d={520} s={{ ...at(1, 0.9, 1.7), rotate: "90deg", filter: "drop-shadow(0 0 5px #b9d8ff)" }}>
        <path d={SOLE} fill="#fff1e2" stroke="#16203a" strokeWidth="1.1" />
      </V>
      {/* the hem of the coat, still travelling */}
      <L c="g44-ghost-hem" d={600} s={{ ...seg(0.55, 1, 1), background: "linear-gradient(90deg, rgba(255,241,226,0), rgba(255,241,226,0.65))" }} />
      <L c="g44-motes" d={700} s={{ ...box(4, 2.6, 1, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,226,0.4), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   20. Faerie Door (t5) — THE RING OF TOADSTOOLS.
   Caps push up in a circle on the cast square, the grass inside turns into
   somewhere else, and a second ring opens the whole real distance away.
   Palette: #9ee0a6 / #fff3d8 / #14301c.
   -------------------------------------------------------------------------- */
function FaerieRing({ role, delayMs }: SceneProps) {
  const cap = (
    <>
      <path d="M4 13c0-4.4 3.6-8 8-8s8 3.6 8 8z" fill="#9ee0a6" stroke="#14301c" strokeWidth="1.2" {...SJ} />
      <path d="M10 13h4v7h-4z" fill="#fff3d8" stroke="#14301c" strokeWidth="1" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(18, 56, 64, 30), borderRadius: "50%", border: "2px solid #9ee0a6" }} />
        <V c="g44-ent" d={200} s={pct(32, 16, 36, 52)}>{cap}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(34, 34, 32, 32), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,216,0.85), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(16, 50, 68, 34), borderRadius: "50%", border: "2px solid #9ee0a6" }} />
        <V c="g44-hit" d={200} s={pct(30, 12, 40, 56)}>{cap}</V>
        <L c="g44-motes" d={400} s={{ ...pct(30, 30, 40, 40), borderRadius: "50%", background: "radial-gradient(circle, rgba(158,224,166,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(158,224,166,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(3.4, 3.4), borderRadius: "50%", border: "2px solid #14301c" }} />
      {/* the caps push up round the ring, in the real victim order */}
      {R5.map((i) => (
        <V key={i} c="g44-faerie-cap" d={190 + i * 50} per={26} s={box(0.9, 0.9, 1.6 * Math.cos((i / 5) * 6.283), 1.6 * Math.sin((i / 5) * 6.283))}>{cap}</V>
      ))}
      {/* strike: the grass inside the ring is somewhere else entirely */}
      <L c="g44-faerie-floor" d={420} s={{ ...box(2.8, 2.8), borderRadius: "50%", background: "radial-gradient(circle, #fff3d8, rgba(20,48,28,0.9) 72%)" }} />
      {/* and the far ring opens the whole real distance away */}
      <L c="g44-faerie-far" d={520} s={{ ...at(1, 2.6, 2.6), borderRadius: "50%", border: "2px dashed #fff3d8" }} />
      {/* the piece leaves by the near ring */}
      <V c="g44-portal-in" d={580} s={box(1, 1.4)}>
        <path d={PAWN} fill="#fff3d8" stroke="#14301c" strokeWidth="1.1" />
      </V>
      {/* settle: spores lifting off the caps, away from the caster */}
      <L c="g44-motes" d={690} s={{ ...box(4.2, 2.6, 0.6, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,216,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   21. Archmage's Sabbatical (t5) — THE HAMMOCK SHORTER THAN ITS OWN SPAN.
   Two posts are set the real distance apart and a short hammock is slung
   between them anyway: the gap gives in, not the cloth.
   Palette: #e3c07f / #fff2d4 / #2a2113.
   -------------------------------------------------------------------------- */
function ShortHammock({ role, delayMs }: SceneProps) {
  const sag = <path d="M0 2C22 2 34 22 50 22s28-20 50-20" fill="none" stroke="#e3c07f" strokeWidth="4" strokeLinecap="round" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(10, 22, 8, 60), background: "#2a2113" }} />
        <V c="g44-ent" d={200} vb="0 0 100 24" par="none" s={pct(10, 32, 80, 34)}>{sag}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(82, 22, 8, 60), background: "#2a2113" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(6, 44, 88, 5), background: "#fff2d4" }} />
        <V c="g44-hit" d={200} vb="0 0 100 24" par="none" s={pct(6, 36, 88, 40)}>{sag}</V>
        <L c="g44-dust" d={400} s={{ ...pct(32, 62, 36, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,212,0.5), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(227,192,127,0.26)" d={70} />}>
      <L c="g44-tellline" d={90} s={{ ...lane(0.12), background: "#fff2d4" }} />
      {/* the two posts, planted the REAL distance apart */}
      {R2.map((i) => (
        <L key={i} c="g44-hammock-post" d={180 + i * 70} s={{ ...at(i, 0.34, 3.2, -0.6), background: "linear-gradient(180deg, #e3c07f, #2a2113)" }} />
      ))}
      {/* strike: the short cloth is slung the whole way across regardless */}
      <V c="g44-hammock-cloth" d={330} vb="0 0 100 24" par="none" s={{ ...lane(2.2, 0.2), filter: "drop-shadow(0 0 4px #e3c07f)" }}>{sag}</V>
      {/* the gap gives in and closes around the sleeper */}
      <L c="g44-fold" d={450} s={{ ...lane(0.3, 1.3), background: "linear-gradient(90deg, rgba(227,192,127,0.9), rgba(255,242,212,0.2))" }} />
      {/* the archmage's hat, at rest on the sag */}
      <V c="g44-hammock-hat" d={540} s={at(0.5, 1.6, 1.4, 0.5)}>
        <path d="M12 3l4.4 11H7.6zM4 14h16v2.4H4z" fill="#fff2d4" stroke="#2a2113" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g44-motes" d={680} s={{ ...box(4, 2.4, 1, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,212,0.4), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   22. Heavenly Bureaucracy (t6) — THE PIGEONHOLES THAT CONNECT.
   A docket is posted into a slot on the cast square and drops out of a rack the
   whole real distance away, stamped and refiled. The check is mislaid in
   transit. Palette: #a9b8e8 / #fff2e2 / #1a1c33.
   -------------------------------------------------------------------------- */
function Pigeonholes({ role, delayMs }: SceneProps) {
  const rack = (
    <>
      <rect x="2" y="3" width="20" height="18" rx="1" fill="rgba(26,28,51,0.85)" stroke="#a9b8e8" strokeWidth="1.3" />
      <path d="M2 9h20M2 15h20M8.6 3v18M15.4 3v18" stroke="#a9b8e8" strokeWidth="0.9" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 48, 84, 5), background: "#a9b8e8" }} />
        <V c="g44-ent" d={200} s={pct(20, 16, 60, 62)}>{rack}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(40, 40, 20, 16), background: "#fff2e2" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 50, 92, 6), background: "#a9b8e8" }} />
        <V c="g44-hit" d={200} s={pct(16, 12, 68, 68)}>{rack}</V>
        <L c="g44-drip" d={400} s={{ ...pct(44, 56, 14, 16), background: "#fff2e2" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(169,184,232,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1.4, 1.4, 0, -0.2), borderRadius: "50%", background: "#1a1c33" }} />
      {/* a rack on the cast square and its twin at the real far square */}
      {R2.map((i) => (
        <V key={i} c="g44-file-rack" d={190 + i * 70} s={at(i, 2.4, 2.6)}>{rack}</V>
      ))}
      {/* strike: the docket goes in one slot and comes out of the other rack */}
      <L c="g44-file-post" d={340} s={{ ...at(0.08, 0.8, 0.55, -0.6), background: "#fff2e2", border: "1px solid #1a1c33" }} />
      <L c="g44-run1" d={420} s={{ ...box(1, 0.5, 0.5, -0.6), background: "linear-gradient(90deg, rgba(255,242,226,0.1), #fff2e2)", border: "1px solid #1a1c33" }} />
      {/* the misfiling stamp lands over the join */}
      <V c="g44-file-stamp" d={560} s={{ ...at(0.5, 1.8, 1.8, 0.6), filter: "drop-shadow(0 0 4px #a9b8e8)" }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="#fff2e2" strokeWidth="1.7" />
        <path d="M6 16L18 8" stroke="#a9b8e8" strokeWidth="2" strokeLinecap="round" />
      </V>
      {/* settle: loose slips fluttering off the rack */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={660 + i * 45} s={{ ...box(0.34, 0.24, [0.4, 1.2, 0.8][i], [0.8, 1, 1.3][i]), background: "#fff2e2", "--sx": ["140%", "-120%", "160%"][i], "--sy": "calc(var(--fx-side, 1) * -150%)" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   23. Marshal's Baton (t7) — THE SAND TABLE DRAGGED.
   The marshal's cloth is hauled in so the far end of the field arrives under
   his hand, three flags are lifted and replanted in the real victim order, and
   the baton sweeps the new line. Palette: #d8b56a / #fff3d2 / #2b2210.
   -------------------------------------------------------------------------- */
function SandTable({ role, delayMs }: SceneProps) {
  const flag = (
    <>
      <path d="M9 3v18" stroke="#2b2210" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.8 3.6h9.4l-2.6 3.4 2.6 3.4H9.8z" fill="#d8b56a" stroke="#2b2210" strokeWidth="1" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 66, 84, 16), background: "linear-gradient(180deg, #d8b56a, #2b2210)" }} />
        <V c="g44-ent" d={200} s={pct(30, 14, 40, 58)}>{flag}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(24, 58, 52, 16), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.75), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 70, 92, 12), background: "linear-gradient(180deg, #fff3d2, #d8b56a)" }} />
        <V c="g44-hit" d={200} s={pct(28, 10, 44, 64)}>{flag}</V>
        <L c="g44-dust" d={400} s={{ ...pct(28, 62, 44, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(216,181,106,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,181,106,0.26)" d={70} /><Rim tone="rgba(255,243,210,0.28)" d={150} /></>}>
      {/* tell: the baton taps the edge of the table */}
      <L c="g44-tell" d={90} s={{ ...box(1.6, 0.3, -1.8, 1.9), borderRadius: "999px", background: "#2b2210" }} />
      {/* the sand bed itself */}
      <L c="g44-sand-bed" d={190} s={{ ...box(6.4, 3.6, 0, 0.6), background: "linear-gradient(180deg, #d8b56a, #8a6f36)", border: "1px solid #2b2210" }} />
      {/* strike: the cloth is dragged so the far end arrives under his hand */}
      <L c="g44-sand-drag" d={320} s={{ ...box(6.4, 1, 0, -0.6), background: "repeating-linear-gradient(90deg, rgba(255,243,210,0.85) 0 6%, transparent 6% 18%)" }} />
      {/* three flags lifted and replanted, in the real victim order */}
      {R3.map((i) => (
        <V key={i} c="g44-sand-flag" d={420 + i * 70} per={30} s={box(1.4, 2, -1.8 + i * 1.8, -0.4)}>{flag}</V>
      ))}
      {/* the baton sweeps the redrawn line */}
      <L c="g44-sand-baton" d={600} s={{ ...box(4.4, 0.34, 0.4, 0.2), borderRadius: "999px", background: "linear-gradient(90deg, #2b2210, #fff3d2)" }} />
      {/* the first piece is marked untouchable for a turn */}
      <L c="g44-sand-mark" d={660} s={{ ...box(1.4, 1.4, -1.8, -0.4), borderRadius: "50%", border: "2px solid #fff3d2" }} />
      <L c="g44-dust" d={730} s={{ ...box(5, 2.6, 0.4, 1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   24. Velvet Rope (t7) — THE ROPE THAT IS SHORTER THAN THE GAP.
   Stanchions are set along the caster's own back rank (BoardFrame, so it is the
   real rank), and one swag of velvet closes a span far wider than its length.
   Palette: #d1607e / #fff0e0 / #2a0f1a.
   -------------------------------------------------------------------------- */
function VelvetRope({ role, delayMs }: SceneProps) {
  const post = (
    <>
      <path d="M10.6 5h2.8v15h-2.8z" fill="#d1607e" stroke="#2a0f1a" strokeWidth="1" />
      <ellipse cx="12" cy="4" rx="3" ry="2.2" fill="#fff0e0" stroke="#2a0f1a" strokeWidth="1" />
      <path d="M7 20h10v2.4H7z" fill="#2a0f1a" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(10, 30, 80, 8), borderRadius: "999px", background: "linear-gradient(180deg, #d1607e, #2a0f1a)" }} />
        <V c="g44-ent" d={200} s={pct(12, 22, 26, 62)}>{post}</V>
        <V c="g44-ent3" d={430} s={pct(62, 22, 26, 62)}>{post}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 34, 96, 9), borderRadius: "999px", background: "linear-gradient(180deg, #fff0e0, #d1607e)" }} />
        <V c="g44-hit" d={200} s={pct(30, 18, 40, 68)}>{post}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 24, 16, 16), borderRadius: "50%", background: "#fff0e0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(209,96,126,0.24)" d={70} />
          {/* the rank being roped off, named by whose it is */}
          <L c="g44-rope-rank" d={220} s={{ ...nearBand(12.5), background: "linear-gradient(180deg, rgba(209,96,126,0.7), rgba(42,15,26,0.2))" }} />
          {R4.map((i) => (
            <V key={i} c="g44-rope-post" d={280 + i * 60} per={28} s={{ ...nearBand(12.5), left: `${8 + i * 26}%`, width: "8%", height: "13%" }}>{post}</V>
          ))}
        </>
      }
    >
      {/* tell: the brass eye takes the clip */}
      <L c="g44-tell" d={90} s={{ ...box(1, 0.5, 0, -1.6), borderRadius: "999px", background: "#2a0f1a" }} />
      {/* strike: the swag of velvet closes a span far wider than its length */}
      <L c="g44-rope-swag" d={380} s={{ ...box(5.6, 0.6, 0, -0.8), borderRadius: "999px", background: "linear-gradient(180deg, #fff0e0, #d1607e 60%, #2a0f1a)" }} />
      <L c="g44-fold" d={460} s={{ ...lane(0.4, 0.6), background: "linear-gradient(90deg, #d1607e, rgba(255,240,224,0.2))" }} />
      {/* the turned-away piece backs off the rank */}
      <V c="g44-rope-turn" d={560} s={box(1.4, 1.8, 1.9, 0.9)}>
        <path d={PAWN} fill="#2a0f1a" stroke="#fff0e0" strokeWidth="1.2" />
      </V>
      <L c="g44-glint" d={640} s={{ ...box(1.2, 1.2, 0, -1.6), borderRadius: "50%", background: "radial-gradient(circle, #fff0e0, transparent 72%)" }} />
      <L c="g44-motes" d={710} s={{ ...box(4.4, 2.4, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,224,0.4), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   25. Worldgate (t8) — THE GREAT DOOR.
   Two leaves swing off the threshold and what is behind them is not the next
   square but the far one: three pieces walk the whole real distance in one
   step. Palette: #8fd8ff / #fff2de / #101a33.
   -------------------------------------------------------------------------- */
function Worldgate({ role, delayMs }: SceneProps) {
  const leaf = (
    <>
      <path d="M3 22V7.4C3 4.4 6.6 2 12 2v20z" fill="rgba(16,26,51,0.9)" stroke="#8fd8ff" strokeWidth="1.5" {...SJ} />
      <path d="M8.6 11.4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="#fff2de" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(20, 22, 60, 62), borderRadius: "2px", background: "radial-gradient(circle, rgba(143,216,255,0.7), transparent 72%)" }} />
        <V c="g44-ent" d={200} s={pct(14, 16, 36, 70)}>{leaf}</V>
        <V c="g44-ent3" d={430} s={{ ...pct(50, 16, 36, 70), scale: "-1 1" }}>{leaf}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(24, 16, 52, 70), background: "radial-gradient(circle, rgba(255,242,222,0.7), transparent 70%)" }} />
        <V c="g44-hit" d={200} s={pct(26, 12, 48, 76)}>{leaf}</V>
        <L c="g44-motes" d={400} s={{ ...pct(30, 30, 40, 40), borderRadius: "50%", background: "radial-gradient(circle, rgba(143,216,255,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(143,216,255,0.28)" d={70} /><Rim tone="rgba(255,242,222,0.34)" d={150} /></>}>
      {/* tell: the threshold is scribed across the run */}
      <L c="g44-tellline" d={90} s={{ ...lane(0.14), background: "#fff2de" }} />
      {/* the two leaves swing off the threshold */}
      {R2.map((i) => (
        <V key={i} c="g44-gate-leaf" d={200 + i * 60} s={{ ...box(2.4, 4.6, 0, i === 0 ? -2.3 : 2.3), scale: i === 0 ? "1 1" : "1 -1", "--gr": i === 0 ? "-64deg" : "64deg" }}>{leaf}</V>
      ))}
      {/* strike: what is behind the door is the far end of the board */}
      <L c="g44-gate-beyond" d={360} s={{ ...box(3.2, 4.4), borderRadius: "2px", background: "radial-gradient(circle, #fff2de, rgba(16,26,51,0.95) 74%)" }} />
      {/* the gap itself is walked out of the way */}
      <L c="g44-fold" d={430} s={{ ...lane(0.5), background: "linear-gradient(90deg, rgba(143,216,255,0.9), rgba(255,242,222,0.15))" }} />
      {/* three pieces cross the whole real distance at once */}
      {R3.map((i) => (
        <V key={i} c="g44-run1" d={500 + i * 60} per={30} s={{ ...box(1, 1.4, 0.5, [-1.2, 0, 1.2][i]) }}>
          <path d={PAWN} fill="#8fd8ff" stroke="#101a33" strokeWidth="1.1" />
        </V>
      ))}
      {/* the far side lights where they land */}
      <L c="g44-gate-land" d={620} s={{ ...at(1, 2.4, 2.4), borderRadius: "50%", border: "2px solid #fff2de" }} />
      <L c="g44-motes" d={720} s={{ ...box(4.6, 2.8, 1.4, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,222,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   26. Choke Point (t8) — THE WAIST OF THE HOURGLASS.
   The centre four by four of the real board is pinched between two funnel
   walls until the throat will not pass a piece, and the caltrops jam in it.
   Palette: #d9a15c / #fff2d2 / #2a1c0c.
   -------------------------------------------------------------------------- */
function HourglassWaist({ role, delayMs }: SceneProps) {
  const caltrop = <path d="M12 3l3 8 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#d9a15c" stroke="#2a1c0c" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(20, 20, 60, 60), border: "2px dashed #d9a15c" }} />
        <V c="g44-ent" d={200} s={pct(30, 30, 40, 40)}>{caltrop}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(36, 36, 28, 28), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.85), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(14, 14, 72, 72), border: "2px solid #d9a15c" }} />
        <V c="g44-hit" d={200} s={pct(24, 24, 52, 52)}>{caltrop}</V>
        <L c="g44-dust" d={400} s={{ ...pct(28, 56, 44, 30), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(217,161,92,0.26)" d={70} />
          {/* the real central four by four, exact at any anchor */}
          <L c="g44-choke-field" d={200} s={{ ...pct(25, 25, 50, 50), border: "2px dashed #fff2d2", background: "rgba(42,28,12,0.35)" }} />
          {/* the two funnel walls pinch it from either side */}
          {R2.map((i) => (
            <L key={i} c="g44-choke-wall" d={320 + i * 60} s={{ ...pct(i === 0 ? 12 : 63, 25, 25, 50), background: i === 0 ? "linear-gradient(90deg, rgba(42,28,12,0.1), #d9a15c)" : "linear-gradient(270deg, rgba(42,28,12,0.1), #d9a15c)", "--cx": i === 0 ? "58%" : "-58%" }} />
          ))}
        </>
      }
    >
      {/* tell: the ground is scratched where the throat will be */}
      <L c="g44-tell" d={90} s={{ ...box(2.6, 0.3), borderRadius: "999px", background: "#2a1c0c" }} />
      {/* strike: the throat itself narrows to nothing passable */}
      <L c="g44-choke-throat" d={420} s={{ ...box(3.4, 1.4), background: "linear-gradient(90deg, rgba(217,161,92,0.2), #fff2d2, rgba(217,161,92,0.2))" }} />
      {/* caltrops jam in the neck, in the real victim order */}
      {R4.map((i) => (
        <V key={i} c="g44-choke-spike" d={480 + i * 50} per={26} s={box(1, 1, [-1.1, 0.2, 1.3, -0.2][i], [-0.5, 0.6, -0.4, -1.3][i])}>{caltrop}</V>
      ))}
      {/* the piece that tried is turned back */}
      <V c="g44-choke-turn" d={640} s={box(1.4, 1.8, -2.2, 0.4)}>
        <path d={PAWN} fill="#2a1c0c" stroke="#fff2d2" strokeWidth="1.2" />
      </V>
      <L c="g44-dust" d={720} s={{ ...box(5, 2.6, 0, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   27. Wall of Teeth (t8) — THE ZIP THAT CLOSES TWO RANKS.
   Two rows of teeth are laid along the opponent's two far ranks and the slider
   runs the length of the board, meshing them: two edges that were apart are one
   seam. Palette: #cfd8e2 / #fff1dc / #191f2a.
   -------------------------------------------------------------------------- */
function ZipTeeth({ role, delayMs }: SceneProps) {
  const TOOTH = "repeating-linear-gradient(90deg, #cfd8e2 0 4%, transparent 4% 9%)";
  const slider = (
    <>
      <path d="M6 4h12l-2 9v7H8v-7z" fill="#cfd8e2" stroke="#191f2a" strokeWidth="1.2" {...SJ} />
      <path d="M10.6 20h2.8v3.4h-2.8z" fill="#fff1dc" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 36, 88, 8), background: TOOTH }} />
        <V c="g44-ent" d={200} s={pct(34, 34, 32, 52)}>{slider}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(6, 56, 88, 8), background: TOOTH }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 30, 96, 9), background: TOOTH }} />
        <V c="g44-hit" d={200} s={pct(32, 26, 36, 58)}>{slider}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 60, 16, 16), borderRadius: "50%", background: "#fff1dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(207,216,226,0.24)" d={70} />
          {/* their two far ranks, named by whose they are */}
          <L c="g44-zip-band" d={200} s={{ ...farBand(25), background: "linear-gradient(180deg, rgba(25,31,42,0.8), rgba(207,216,226,0.15))" }} />
          {R2.map((i) => (
            <L key={i} c="g44-zip-row" d={280 + i * 70} per={26} s={{ ...farRank(i, 3), background: TOOTH }} />
          ))}
          {/* the slider runs the whole width of the real board */}
          <L c="g44-zip-slide" d={420} s={{ ...farBand(25), left: "-6%", width: "12%", height: "25%", background: "linear-gradient(180deg, rgba(255,241,220,0.9), rgba(207,216,226,0.1))" }} />
        </>
      }
    >
      {/* tell: the seam line is laid down first */}
      <L c="g44-tell" d={90} s={{ ...box(3.6, 0.24), borderRadius: "999px", background: "#191f2a" }} />
      {/* the slider itself, up close on the cast square */}
      <V c="g44-zip-body" d={330} s={{ ...box(2, 2.8), filter: "drop-shadow(0 0 5px #cfd8e2)" }}>{slider}</V>
      {/* strike: the two edges are dragged together across the real gap */}
      <L c="g44-fold" d={450} s={{ ...lane(0.4, -0.7), background: TOOTH }} />
      <L c="g44-fold" d={500} s={{ ...lane(0.4, 0.7), background: TOOTH }} />
      <L c="g44-glint" d={620} s={{ ...box(1.4, 1.4, 1.2), borderRadius: "50%", background: "radial-gradient(circle, #fff1dc, transparent 72%)" }} />
      {/* settle: filings shaken out of the teeth */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={680 + i * 45} s={{ ...box(0.3, 0.14, [0.6, -0.4, 1.1][i], [-0.5, 0.6, 0.2][i]), background: "#cfd8e2", "--sx": ["150%", "-150%", "170%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   FAMILY C — GRAVITY WELL. Eight cards where the floor itself has an opinion:
   things are hauled in, bent round, lifted out of reach, or poured uphill.
   ========================================================================== */

/* -----------------------------------------------------------------------------
   28. Mismatched Livery (t1) — THE ANAMORPHIC SMEAR.
   The rook's colours are painted as a long smear down the real run, and only
   when the run collapses does the smear resolve: a draughts crown, not a rook.
   Palette: #d9546b / #fff0dc / #2a121c.
   -------------------------------------------------------------------------- */
function AnamorphicLivery({ role, delayMs }: SceneProps) {
  const draught = (
    <>
      <ellipse cx="12" cy="14" rx="9" ry="5" fill="#d9546b" stroke="#2a121c" strokeWidth="1.2" />
      <ellipse cx="12" cy="11" rx="9" ry="5" fill="#fff0dc" stroke="#2a121c" strokeWidth="1.2" />
      <path d="M7.6 11l2 2.4 2.4-3 2.4 3 2-2.4" fill="none" stroke="#d9546b" strokeWidth="1.2" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 44, 92, 14), background: "linear-gradient(90deg, transparent, #d9546b, transparent)" }} />
        <V c="g44-ent" d={200} s={pct(24, 26, 52, 48)}>{draught}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(36, 34, 28, 28), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,220,0.85), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 46, 100, 12), background: "linear-gradient(90deg, #2a121c, #d9546b, #2a121c)" }} />
        <V c="g44-hit" d={200} s={pct(20, 24, 60, 52)}>{draught}</V>
        <L c="g44-drip" d={400} s={{ ...pct(46, 62, 10, 16), borderRadius: "999px", background: "#d9546b" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(217,84,107,0.26)" d={70} />}>
      <L c="g44-tellline" d={90} s={{ ...lane(0.13), background: "#fff0dc" }} />
      {/* the rook, still itself for one more beat */}
      <V c="g44-livery-rook" d={190} s={box(1.8, 1.8)}>
        <path d={ROOK} fill="#fff0dc" stroke="#2a121c" strokeWidth="1.1" {...SJ} />
      </V>
      {/* strike: the livery is laid on as a smear the whole real distance */}
      <L c="g44-livery-smear" d={300} s={{ ...lane(1.8), background: "linear-gradient(90deg, rgba(217,84,107,0.9), rgba(255,240,220,0.18))" }} />
      {/* the run collapses and the smear resolves into a draughts piece */}
      <L c="g44-fold" d={420} s={{ ...lane(1.8), background: "repeating-linear-gradient(90deg, #d9546b 0 8%, #2a121c 8% 16%)" }} />
      <V c="g44-livery-resolve" d={540} s={{ ...box(2.2, 2.2), filter: "drop-shadow(0 0 5px #d9546b)" }}>{draught}</V>
      {/* settle: wet paint running off the piece */}
      {R3.map((i) => (
        <L key={i} c="g44-drip" d={640 + i * 55} s={{ ...box(0.26, 0.6, [-0.7, 0.1, 0.8][i], 1.2), borderRadius: "999px", background: "#d9546b" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   29. Grappling Hook (t2) — THE ROPE THAT REELS IN MORE THAN IT PULLS.
   The line is thrown the real distance, bites, and one turn of the drum brings
   the far anchor a whole square closer than the rope came in.
   Palette: #b0b8c4 / #fff0d2 / #1a212b.
   -------------------------------------------------------------------------- */
function GrappleWinch({ role, delayMs }: SceneProps) {
  const hook = (
    <>
      <path d="M12 2v9" stroke="#fff0d2" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11c-4 0-6 2.4-6 5s2 5 4.4 5" fill="none" stroke="#b0b8c4" strokeWidth="2.2" {...SJ} />
      <path d="M12 11c4 0 6 2.4 6 5s-2 5-4.4 5" fill="none" stroke="#b0b8c4" strokeWidth="2.2" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(46, 4, 6, 44), background: "#fff0d2" }} />
        <V c="g44-ent" d={200} s={pct(28, 22, 44, 62)}>{hook}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(32, 62, 36, 24), borderRadius: "50%", background: "radial-gradient(circle, rgba(176,184,196,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 48, 100, 5), background: "#b0b8c4" }} />
        <V c="g44-hit" d={200} s={pct(26, 16, 48, 68)}>{hook}</V>
        <L c="g44-grit" d={400} s={{ ...pct(44, 46, 12, 6), background: "#fff0d2", "--sx": "-160%", "--sy": "-130%" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(176,184,196,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1.6, 0.7, 1), borderRadius: "999px", background: "#1a212b" }} />
      {/* the line thrown the whole real distance */}
      <L c="g44-grap-rope" d={200} s={{ ...lane(0.2), background: "repeating-linear-gradient(80deg, #b0b8c4 0 26%, #1a212b 26% 40%)" }} />
      {/* the hook bites on the real far square */}
      <V c="g44-grap-bite" d={330} s={{ ...at(1, 1.4, 1.8), filter: "drop-shadow(0 0 4px #fff0d2)" }}>{hook}</V>
      {/* strike: one turn of the drum, and the anchor comes a square in */}
      <V c="g44-grap-drum" d={430} s={box(1.8, 1.8, -0.6)}>
        <circle cx="12" cy="12" r="9" fill="#1a212b" stroke="#b0b8c4" strokeWidth="1.4" />
        <path d="M12 3v18M3 12h18" stroke="#fff0d2" strokeWidth="1.2" />
      </V>
      <V c="g44-haul-one" d={520} s={{ ...box(1, 1.4, 0.5) }}>
        <path d={PAWN} fill="#fff0d2" stroke="#1a212b" strokeWidth="1.1" />
      </V>
      {/* settle: grit off the bitten stone */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={640 + i * 45} s={{ ...box(0.3, 0.14, [1.4, 1.9, 1.1][i], [-0.4, 0.5, 0.2][i]), background: "#fff0d2", "--sx": ["-150%", "-120%", "-170%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   30. Overdue Library Book (t2) — THE AISLE THAT TELESCOPES.
   The shelf run is drawn out to the real distance, the gap in the spines is
   found, and the aisle shortens until the book is back in its slot.
   Palette: #cf9a63 / #fff1d6 / #2a1a0e.
   -------------------------------------------------------------------------- */
function ShelfGap({ role, delayMs }: SceneProps) {
  const SPINES = "repeating-linear-gradient(90deg, #cf9a63 0 3%, #2a1a0e 3% 4%, #fff1d6 4% 6%, #2a1a0e 6% 7%)";
  const book = (
    <>
      <path d="M4 4h7.4v16H4z" fill="#cf9a63" stroke="#2a1a0e" strokeWidth="1.1" />
      <path d="M12.6 4H20v16h-7.4z" fill="#fff1d6" stroke="#2a1a0e" strokeWidth="1.1" />
      <path d="M12 3.4v17.2" stroke="#2a1a0e" strokeWidth="1.3" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 62, 92, 18), background: SPINES }} />
        <V c="g44-ent" d={200} s={pct(28, 16, 44, 50)}>{book}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(44, 60, 12, 22), background: "#2a1a0e" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 58, 100, 22), background: SPINES }} />
        <V c="g44-hit" d={200} s={pct(26, 10, 48, 56)}>{book}</V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 56, 40, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,214,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(207,154,99,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1.2, 1.2, 0, -0.2), border: "2px solid #fff1d6" }} />
      {/* the shelf, running the real distance back to where the book lives */}
      <L c="g44-shelf-run" d={200} s={{ ...lane(2), background: SPINES, border: "1px solid #2a1a0e" }} />
      {/* the gap in the spines, on the real far square */}
      <L c="g44-shelf-slot" d={310} s={{ ...at(1, 0.5, 2.2), background: "#2a1a0e" }} />
      {/* strike: the aisle telescopes shorter and the book goes home */}
      <L c="g44-fold" d={400} s={{ ...lane(2), background: "linear-gradient(90deg, rgba(42,26,14,0.75), rgba(207,154,99,0.2))" }} />
      <V c="g44-run1" d={480} s={{ ...box(1, 1.4, 0.5), filter: "drop-shadow(0 0 4px #fff1d6)" }}>{book}</V>
      {/* the date stamp lands on the boards */}
      <V c="g44-shelf-stamp" d={600} s={at(0.55, 1.6, 1.6, 1.2)}>
        <rect x="3" y="7" width="18" height="10" rx="1" fill="none" stroke="#fff1d6" strokeWidth="1.6" />
        <path d="M6 12h12" stroke="#cf9a63" strokeWidth="1.8" strokeLinecap="round" />
      </V>
      <L c="g44-dust" d={700} s={{ ...box(4.4, 2.4, 0.8, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,214,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   31. Hearth Ring (t3) — THE HEARTHSTONES DRAWN IN.
   The fire is banked on the king's square, the hearthstones are laid round it
   in the real victim order, and then the whole circle is drawn tight so every
   neighbour is standing at the fire. Palette: #f0a95a / #fff3d0 / #2a1408.
   -------------------------------------------------------------------------- */
function HearthRing({ role, delayMs }: SceneProps) {
  const fire = (
    <>
      <path d="M12 3c3.4 4 5.6 6.4 5.6 9.6a5.6 5.6 0 0 1-11.2 0C6.4 9.4 8.6 7 12 3z" fill="#f0a95a" stroke="#2a1408" strokeWidth="1.1" {...SJ} />
      <path d="M12 10.4c1.7 2.2 2.6 3.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.2.9-2.4 2.6-4.6z" fill="#fff3d0" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(22, 62, 56, 24), borderRadius: "50%", border: "2px solid #f0a95a" }} />
        <V c="g44-ent" d={200} s={pct(32, 16, 36, 58)}>{fire}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 30, 40, 40), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,208,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(18, 56, 64, 30), borderRadius: "50%", border: "2px solid #f0a95a" }} />
        <V c="g44-hit" d={200} s={pct(30, 12, 40, 62)}>{fire}</V>
        <L c="g44-motes" d={400} s={{ ...pct(32, 18, 36, 34), borderRadius: "50%", background: "radial-gradient(circle, rgba(240,169,90,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,169,90,0.26)" d={70} /><Rim tone="rgba(255,243,208,0.26)" d={150} /></>}>
      <L c="g44-tell" d={90} s={{ ...box(1.2, 0.6, 0, 0.8), borderRadius: "50%", background: "#2a1408" }} />
      {/* the fire banked on the king's own square */}
      <V c="g44-hearth-fire" d={200} s={{ ...box(2.2, 2.6, 0, -0.3), filter: "drop-shadow(0 0 6px #f0a95a)" }}>{fire}</V>
      {/* the stones laid round it, in the real victim order */}
      {R5.map((i) => (
        <L key={i} c="g44-hearth-stone" d={280 + i * 50} per={26} s={{ ...box(0.8, 0.5, 2.2 * Math.cos((i / 5) * 6.283), 2.2 * Math.sin((i / 5) * 6.283)), borderRadius: "50%", background: "linear-gradient(180deg, #fff3d0, #2a1408)" }} />
      ))}
      {/* strike: the whole circle is drawn tight round the hearth */}
      <L c="g44-hearth-draw" d={470} s={{ ...box(5.4, 5.4), borderRadius: "50%", border: "2px solid #fff3d0" }} />
      {/* the neighbours end up standing at the fire, shoulder to shoulder */}
      {R2.map((i) => (
        <V key={i} c="g44-hearth-near" d={560 + i * 60} s={box(1.2, 1.6, [-1.4, 1.4][i], 0.9)}>
          <path d={PAWN} fill="#fff3d0" stroke="#2a1408" strokeWidth="1.1" />
        </V>
      ))}
      {/* settle: sparks lifting off the fire, away from the caster */}
      <L c="g44-motes" d={700} s={{ ...box(3.6, 2.6, 0, -0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,208,0.45), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   32. Wagon Circle (t4) — THE RANK BENT INTO A RING.
   The caster's own home rank is a straight line, so the wagons roll onto it and
   then the line itself is bent round until both ends meet.
   Palette: #c8a06a / #fff2d6 / #241a0c.
   -------------------------------------------------------------------------- */
function WagonCircle({ role, delayMs }: SceneProps) {
  const wagon = (
    <>
      <path d="M4 9c3-3.4 13-3.4 16 0v7H4z" fill="#fff2d6" stroke="#241a0c" strokeWidth="1.2" {...SJ} />
      <circle cx="7.4" cy="18.4" r="2.6" fill="none" stroke="#c8a06a" strokeWidth="1.6" />
      <circle cx="16.6" cy="18.4" r="2.6" fill="none" stroke="#c8a06a" strokeWidth="1.6" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 76, 88, 6), background: "#241a0c" }} />
        <V c="g44-ent" d={200} s={pct(26, 22, 48, 56)}>{wagon}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(20, 18, 60, 60), borderRadius: "50%", border: "2px dashed #c8a06a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(14, 14, 72, 72), borderRadius: "50%", border: "2px solid #c8a06a" }} />
        <V c="g44-hit" d={200} s={pct(22, 20, 56, 60)}>{wagon}</V>
        <L c="g44-dust" d={400} s={{ ...pct(28, 62, 44, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,214,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      centred
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(200,160,106,0.26)" d={70} />
          {/* the caster's own home rank, named by whose it is */}
          <L c="g44-wagon-rank" d={200} s={{ ...nearBand(12.5), background: "linear-gradient(180deg, rgba(200,160,106,0.75), rgba(36,26,12,0.15))" }} />
        </>
      }
    >
      <L c="g44-tell" d={90} s={{ ...box(4, 0.3, 0, 1.8), borderRadius: "999px", background: "#241a0c" }} />
      {/* the wagons roll up along the line, in the real victim order */}
      {R4.map((i) => (
        <V key={i} c="g44-wagon-roll" d={220 + i * 60} per={28} s={box(1.6, 1.4, -2.4 + i * 1.6, 1.4)}>{wagon}</V>
      ))}
      {/* strike: the straight rank is bent until its two ends meet */}
      <L c="g44-wagon-bend" d={440} s={{ ...box(5.6, 5.6), borderRadius: "50%", border: "2px solid #fff2d6" }} />
      <L c="g44-fold" d={510} s={{ ...lane(0.36, 1.4), background: "linear-gradient(90deg, #c8a06a, rgba(255,242,214,0.2))" }} />
      {/* the ring closes round the pieces standing inside it */}
      <V c="g44-wagon-hold" d={600} s={box(1.3, 1.7)}>
        <path d={PAWN} fill="#fff2d6" stroke="#241a0c" strokeWidth="1.2" />
      </V>
      <L c="g44-dust" d={710} s={{ ...box(5, 2.6, 0, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,214,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   33. Herald's Truce (t5) — THE BLISTER IN THE FLOOR.
   The flagstones under one piece swell into a dome and lift it a little way out
   of the plane everyone else is standing on. Nothing can reach across that.
   Palette: #86cbb4 / #fff2dc / #103028.
   -------------------------------------------------------------------------- */
function FloorBlister({ role, delayMs }: SceneProps) {
  const GRIDLINES = "repeating-linear-gradient(90deg, rgba(134,203,180,0.9) 0 2%, transparent 2% 16%), repeating-linear-gradient(180deg, rgba(134,203,180,0.9) 0 2%, transparent 2% 16%)";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 40, 84, 46), background: GRIDLINES }} />
        <L c="g44-ent" d={200} s={{ ...pct(28, 34, 44, 34), borderRadius: "50%", background: "linear-gradient(180deg, #fff2dc, #86cbb4)" }} />
        <V c="g44-ent3" d={430} s={pct(38, 14, 24, 40)}>
          <path d={PAWN} fill="#fff2dc" stroke="#103028" strokeWidth="1.2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(4, 44, 92, 44), background: GRIDLINES }} />
        <L c="g44-hit" d={200} s={{ ...pct(24, 38, 52, 38), borderRadius: "50%", background: "linear-gradient(180deg, #fff2dc, #86cbb4)" }} />
        <L c="g44-motes" d={400} s={{ ...pct(32, 22, 36, 32), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(134,203,180,0.26)" d={70} />}>
      {/* tell: a hairline circle opens in the flagstones */}
      <L c="g44-tell" d={90} s={{ ...box(2.2, 2.2), borderRadius: "50%", border: "2px solid #103028" }} />
      {/* the floor plane itself, ruled */}
      <L c="g44-blist-floor" d={190} s={{ ...box(6.4, 4.4, 0, 0.6), background: GRIDLINES }} />
      {/* strike: the plane swells into a dome under the chosen piece */}
      <L c="g44-blist-dome" d={320} s={{ ...box(3.6, 2.6, 0, 0.2), borderRadius: "50%", background: "linear-gradient(180deg, #fff2dc, #86cbb4 62%, rgba(16,48,40,0.9))" }} />
      {/* the ruled lines bulge around it */}
      <L c="g44-blist-bulge" d={400} s={{ ...box(4.6, 3.4, 0, 0.3), borderRadius: "50%", border: "2px solid rgba(134,203,180,0.85)" }} />
      {/* the piece rides up out of everyone else's reach */}
      <V c="g44-blist-lift" d={500} s={{ ...box(1.5, 2, 0, -0.8), filter: "drop-shadow(0 0 5px #86cbb4)" }}>
        <path d={PAWN} fill="#fff2dc" stroke="#103028" strokeWidth="1.2" />
      </V>
      {/* the herald's ribbon snaps out along the real run */}
      <L c="g44-blist-ribbon" d={580} s={{ ...lane(0.4, -1.4), background: "linear-gradient(90deg, #fff2dc, rgba(134,203,180,0))" }} />
      <L c="g44-motes" d={700} s={{ ...box(4, 2.4, 0, -1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   34. Gravity Flip (t6) — THE POUR THAT RUNS UPHILL.
   The cup on the caster's side tips, and the stream climbs back into the jug it
   came from. Down is now a matter of opinion, and pawns take the hint.
   Palette: #7fc9e8 / #fff1e0 / #10283a.
   -------------------------------------------------------------------------- */
function UphillPour({ role, delayMs }: SceneProps) {
  const jug = (
    <>
      <path d="M6 6h10v14H6z" fill="rgba(16,40,58,0.85)" stroke="#7fc9e8" strokeWidth="1.3" {...SJ} />
      <path d="M16 9h3.4a2.6 2.6 0 0 1 0 5.2H16z" fill="none" stroke="#7fc9e8" strokeWidth="1.3" />
      <path d="M6.8 14h8.4v5.2H6.8z" fill="#fff1e0" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(46, 18, 8, 56), background: "linear-gradient(180deg, #fff1e0, #7fc9e8)" }} />
        <V c="g44-ent" d={200} s={pct(30, 12, 40, 46)}>{jug}</V>
        <V c="g44-ent3" d={430} s={{ ...pct(34, 54, 32, 38), rotate: "180deg" }}>{jug}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(44, 10, 10, 70), background: "linear-gradient(180deg, #7fc9e8, #fff1e0)" }} />
        <V c="g44-hit" d={200} s={pct(28, 8, 44, 50)}>{jug}</V>
        <L c="g44-drip" d={400} s={{ ...pct(46, 62, 8, 16), borderRadius: "999px", background: "#fff1e0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(127,201,232,0.26)" d={70} />}>
      {/* tell: a bead gathers at the lip, on the wrong side of it */}
      <L c="g44-tell" d={90} s={{ ...box(0.5, 0.5, 0.2, 0.9), borderRadius: "50%", background: "#fff1e0" }} />
      {/* the cup, on the caster's own side of the square */}
      <V c="g44-pour-cup" d={190} s={{ ...box(1.6, 1.6, 0.2, 1.5), rotate: "22deg" }}>{jug}</V>
      {/* the jug it left, standing above */}
      <V c="g44-pour-jug" d={260} s={{ ...box(2.2, 2.4, -0.4, -1.6), filter: "drop-shadow(0 0 5px #7fc9e8)" }}>{jug}</V>
      {/* strike: the stream climbs back the way it came, leaning by --fx-side */}
      <L c="g44-pour-stream" d={360} s={{ ...box(0.4, 3.2, 0, -0.1), borderRadius: "999px", background: "linear-gradient(180deg, rgba(255,241,224,0.2), #7fc9e8)" }} />
      {/* the pawn takes the hint and steps backward down its own file */}
      <V c="g44-pour-back" d={500} s={box(1.3, 1.7, 1.8, 0.4)}>
        <path d={PAWN} fill="#fff1e0" stroke="#10283a" strokeWidth="1.2" />
      </V>
      {/* settle: drops falling the wrong way, away from the caster */}
      {R3.map((i) => (
        <L key={i} c="g44-motes" d={620 + i * 55} s={{ ...box(0.5, 0.5, [-0.6, 0.3, 0.9][i], -0.6 - i * 0.4), borderRadius: "50%", background: "#7fc9e8" }} />
      ))}
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   35. Paperwork Avalanche (t6) — THE CEILING THAT IS TOO NEAR.
   Forms drop into the tray in the real victim order and the stack meets the
   ceiling five sheets in: the room was never that tall.
   Palette: #ccc0a0 / #fff4dd / #2a2418.
   -------------------------------------------------------------------------- */
function InTray({ role, delayMs }: SceneProps) {
  const tray = (
    <>
      <path d="M3 14h18v6H3z" fill="rgba(42,36,24,0.9)" stroke="#ccc0a0" strokeWidth="1.3" {...SJ} />
      <path d="M5.4 11h13.2v3H5.4z" fill="#fff4dd" stroke="#2a2418" strokeWidth="1" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(20, 18, 60, 6), background: "#ccc0a0" }} />
        <V c="g44-ent" d={200} s={pct(24, 44, 52, 44)}>{tray}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 30, 40, 10), background: "#fff4dd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(14, 12, 72, 7), background: "#2a2418" }} />
        <V c="g44-hit" d={200} s={pct(20, 46, 60, 46)}>{tray}</V>
        <L c="g44-dust" d={400} s={{ ...pct(26, 60, 48, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,221,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(204,192,160,0.26)" d={70} />}>
      {/* tell: the first docket flutters down */}
      <L c="g44-tell" d={90} s={{ ...box(1.4, 0.3, 0, -1.6), background: "#fff4dd" }} />
      {/* the tray on the desk */}
      <V c="g44-tray-body" d={190} s={{ ...box(2.8, 1.8, 0, 1.5), filter: "drop-shadow(0 0 4px #ccc0a0)" }}>{tray}</V>
      {/* the stack builds, sheet by sheet, in the real victim order */}
      {R5.map((i) => (
        <L key={i} c="g44-tray-sheet" d={260 + i * 60} per={26} s={{ ...box(2.4, 0.34, (i % 2 ? 0.16 : -0.16), 0.9 - i * 0.42), background: i % 2 ? "#fff4dd" : "#ccc0a0", border: "1px solid #2a2418" }} />
      ))}
      {/* strike: the ceiling comes down to meet it far too soon */}
      <L c="g44-tray-ceiling" d={520} s={{ ...box(5.4, 0.5, 0, -1.6), background: "linear-gradient(180deg, #2a2418, #ccc0a0)", border: "1px solid #fff4dd" }} />
      {/* the clerk underneath stops moving */}
      <V c="g44-tray-buried" d={600} s={box(1.3, 1.7, -2, 1.1)}>
        <path d={PAWN} fill="#2a2418" stroke="#fff4dd" strokeWidth="1.2" />
      </V>
      <L c="g44-dust" d={700} s={{ ...box(4.6, 2.4, 0, 1.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,221,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* =============================================================================
   FAMILY D — STAR CHART. Four cards about sighting: what is far is brought
   near, or measured, or dropped on from a great height.
   ========================================================================== */

/* -----------------------------------------------------------------------------
   36. Field Glasses (t1) — THE FAR HALF HAULED IN.
   Two circular fields open, the graticule crosses them, and the far end of the
   run is dragged bodily up the tubes until it is a square away.
   Palette: #7fd4ff / #fff2e0 / #10202f.
   -------------------------------------------------------------------------- */
function FieldGlasses({ role, delayMs }: SceneProps) {
  const eyes = (
    <>
      <circle cx="8" cy="12" r="6.4" fill="rgba(16,32,47,0.85)" stroke="#7fd4ff" strokeWidth="1.5" />
      <circle cx="16" cy="12" r="6.4" fill="rgba(16,32,47,0.85)" stroke="#7fd4ff" strokeWidth="1.5" />
      <path d="M10.4 12h3.2" stroke="#fff2e0" strokeWidth="1.6" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(6, 48, 88, 4), background: "#7fd4ff" }} />
        <V c="g44-ent" d={200} s={pct(16, 24, 68, 52)}>{eyes}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(40, 40, 20, 20), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,224,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(20, 20, 60, 60), borderRadius: "50%", border: "2px solid #7fd4ff" }} />
        <V c="g44-hit" d={200} s={pct(12, 22, 76, 56)}>{eyes}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 42, 16, 16), borderRadius: "50%", background: "#fff2e0" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(127,212,255,0.26)" d={70} />}>
      <L c="g44-tellline" d={90} s={{ ...lane(0.12), background: "#fff2e0" }} />
      {/* the twin fields open on the cast square */}
      <V c="g44-glass-eyes" d={200} s={{ ...box(3.6, 2, -0.2), filter: "drop-shadow(0 0 5px #7fd4ff)" }}>{eyes}</V>
      {/* the graticule crosses them */}
      <L c="g44-glass-cross" d={300} s={{ ...box(3.6, 0.14, -0.2), background: "#fff2e0" }} />
      {/* strike: the far end of the run is dragged up the tubes */}
      <L c="g44-haul1" d={390} s={{ ...box(1, 1.6, 0.5), border: "2px solid #fff2e0", background: "rgba(127,212,255,0.28)" }} />
      {/* the enemy pips light where they really stand, in victim order */}
      {R3.map((i) => (
        <L key={i} c="g44-glass-pip" d={470 + i * 60} per={30} s={{ ...at(0.5 + i * 0.24, 0.7, 0.7, [-0.9, 0.7, -0.3][i]), borderRadius: "50%", background: "#7fd4ff" }} />
      ))}
      <L c="g44-glint" d={620} s={{ ...box(1.4, 1.4, 0.6), borderRadius: "50%", background: "radial-gradient(circle, #fff2e0, transparent 72%)" }} />
      <L c="g44-motes" d={700} s={{ ...box(4, 2.4, 1, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,224,0.4), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   37. Star Dressing Room (t1) — THE COSTUME RAIL.
   The rail runs the real distance, the hangers are hung along it, and the gown
   slides exactly two squares while the rail telescopes in behind it.
   Palette: #e0a6c8 / #fff2e6 / #2a1424.
   -------------------------------------------------------------------------- */
function CostumeRail({ role, delayMs }: SceneProps) {
  const gown = (
    <>
      <path d="M12 4.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" fill="#fff2e6" />
      <path d="M12 7.2L7 21h10z" fill="#e0a6c8" stroke="#2a1424" strokeWidth="1.1" {...SJ} />
      <path d="M8.6 2.6h6.8" stroke="#fff2e6" strokeWidth="1.3" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 20, 92, 4), borderRadius: "999px", background: "#fff2e6" }} />
        <V c="g44-ent" d={200} s={pct(32, 18, 36, 64)}>{gown}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(30, 30, 40, 40), borderRadius: "50%", background: "radial-gradient(circle, rgba(224,166,200,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 18, 100, 5), borderRadius: "999px", background: "#e0a6c8" }} />
        <V c="g44-hit" d={200} s={pct(28, 14, 44, 72)}>{gown}</V>
        <L c="g44-glint" d={400} s={{ ...pct(44, 22, 12, 12), borderRadius: "50%", background: "#fff2e6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(224,166,200,0.26)" d={70} />}>
      <L c="g44-tellline" d={90} s={{ ...lane(0.12, -1.8), background: "#fff2e6" }} />
      {/* the rail, hung the whole real distance along the back wall */}
      <L c="g44-rail-bar" d={200} s={{ ...lane(0.3, -1.8), borderRadius: "999px", background: "linear-gradient(180deg, #fff2e6, #2a1424)" }} />
      {/* the hangers, in the real victim order */}
      {R4.map((i) => (
        <L key={i} c="g44-rail-hanger" d={270 + i * 50} per={26} s={{ ...at(0.1 + i * 0.26, 0.12, 1, -1.2), background: "#e0a6c8" }} />
      ))}
      {/* strike: the gown slides exactly two squares along the rail */}
      <V c="g44-rail-slide" d={430} s={{ ...box(1, 2.2, 0.5, -0.6), filter: "drop-shadow(0 0 5px #e0a6c8)" }}>{gown}</V>
      {/* and the rail behind her telescopes in */}
      <L c="g44-fold" d={520} s={{ ...lane(0.36, -1.8), background: "linear-gradient(90deg, #e0a6c8, rgba(255,242,230,0.2))" }} />
      {/* the dressing-room bulb pops on over the new spot */}
      <L c="g44-glint" d={620} s={{ ...box(1.4, 1.4, 2, -2.2), borderRadius: "50%", background: "radial-gradient(circle, #fff2e6, transparent 72%)" }} />
      <L c="g44-motes" d={700} s={{ ...box(4, 2.4, 1.2, 0.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(224,166,200,0.4), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   38. Scout's Report (t3) — THE THEODOLITE.
   The instrument is levelled on the cast square and takes a bearing on every
   piece that is aiming at yours: each sight line is the real length of the run.
   Palette: #8fd8b0 / #fff2dc / #10302a.
   -------------------------------------------------------------------------- */
function Theodolite({ role, delayMs }: SceneProps) {
  const scope = (
    <>
      <path d="M4 8h13l3 2-3 2H4z" fill="#8fd8b0" stroke="#10302a" strokeWidth="1.1" {...SJ} />
      <path d="M12 12v6M7.6 21.4L12 17.6l4.4 3.8" fill="none" stroke="#fff2dc" strokeWidth="1.4" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 74, 84, 5), background: "#10302a" }} />
        <V c="g44-ent" d={200} s={pct(20, 18, 60, 62)}>{scope}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(62, 26, 30, 5), borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 40, 100, 4), background: "#8fd8b0" }} />
        <V c="g44-hit" d={200} s={pct(16, 14, 68, 68)}>{scope}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 34, 16, 16), borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(143,216,176,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1.8, 0.5, 0, 1.4), borderRadius: "999px", background: "#10302a" }} />
      {/* the instrument, levelled on the cast square */}
      <V c="g44-theo-body" d={200} s={{ ...box(2.6, 2.6, -0.2), filter: "drop-shadow(0 0 5px #8fd8b0)" }}>{scope}</V>
      {/* strike: sight lines fan out, each the real length of its run */}
      {R3.map((i) => (
        <L key={i} c="g44-theo-sight" d={320 + i * 70} per={30} s={{ ...lane(0.12, [-1.5, 0, 1.5][i]), background: "linear-gradient(90deg, #fff2dc, rgba(143,216,176,0.15))", rotate: `${[-9, 0, 9][i]}deg` }} />
      ))}
      {/* the marks light where the enemies really stand */}
      {R2.map((i) => (
        <L key={i} c="g44-theo-mark" d={520 + i * 60} per={28} s={{ ...at(1, 1.4, 1.4, i === 0 ? -1.2 : 1.2), borderRadius: "50%", border: "2px solid #fff2dc" }} />
      ))}
      {/* the bearing arc is read off */}
      <L c="g44-theo-arc" d={620} s={{ ...box(3.4, 3.4, -0.2), borderRadius: "50%", border: "2px dashed #8fd8b0" }} />
      <L c="g44-motes" d={700} s={{ ...box(3.8, 2.4, 0.4, 1), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.4), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   39. Meteor Golf (t6) — THE FAIRWAY THAT SHORTENS.
   The pin is planted on the real target square, the yardage is measured out,
   and then the fairway folds under the ball so a full-distance shot lands short
   and hot. Palette: #ff9a5a / #fff0cf / #2a1206.
   -------------------------------------------------------------------------- */
function MeteorGolf({ role, delayMs }: SceneProps) {
  const pin = (
    <>
      <path d="M8 2v20" stroke="#fff0cf" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.8 2.6h11l-3 3.4 3 3.4h-11z" fill="#ff9a5a" stroke="#2a1206" strokeWidth="1" {...SJ} />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(10, 78, 80, 6), background: "#2a1206" }} />
        <V c="g44-ent" d={200} s={pct(26, 14, 48, 66)}>{pin}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(20, 30, 26, 26), borderRadius: "50%", background: "radial-gradient(circle, #fff0cf, transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(18, 18, 64, 64), borderRadius: "50%", border: "2px dashed #ff9a5a" }} />
        <V c="g44-hit" d={200} s={pct(24, 10, 52, 72)}>{pin}</V>
        <L c="g44-grit" d={400} s={{ ...pct(44, 46, 12, 6), background: "#fff0cf", "--sx": "160%", "--sy": "-150%" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,154,90,0.28)" d={70} /><Rim tone="rgba(255,240,207,0.3)" d={150} /></>}>
      {/* tell: the tee peg and the shadow of what is coming */}
      <L c="g44-tell" d={90} s={{ ...box(1.6, 0.8, 0, 0.6), borderRadius: "50%", background: "#2a1206" }} />
      {/* the yardage measured out to the real target square */}
      <L c="g44-tellline" d={160} s={{ ...lane(0.12), background: "#fff0cf" }} />
      {/* the pin, planted exactly where the meteor is called */}
      <V c="g44-golf-pin" d={260} s={at(1, 1.6, 3)}>{pin}</V>
      {/* the seal round the target and its neighbours */}
      <L c="g44-golf-seal" d={340} s={{ ...at(1, 3, 3), borderRadius: "50%", border: "2px dashed #ff9a5a" }} />
      {/* strike: the fairway folds under the ball as it flies */}
      <L c="g44-fold" d={420} s={{ ...lane(1.2), background: "linear-gradient(90deg, rgba(255,154,90,0.85), rgba(255,240,207,0.15))" }} />
      <L c="g44-run1" d={480} s={{ ...box(1, 0.8, 0.5, -0.3), borderRadius: "50%", background: "radial-gradient(circle, #fff0cf, #ff9a5a 60%, transparent 74%)" }} />
      {/* the strike itself, on the square it was called on */}
      <L c="g44-golf-hit" d={620} s={{ ...at(1, 2.4, 2.4), borderRadius: "50%", background: "radial-gradient(circle, #fff0cf, rgba(255,154,90,0.2) 70%)" }} />
      {/* settle: embers off the crater, away from the caster */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={700 + i * 45} s={{ ...at(1, 0.3, 0.16, [-0.4, 0.5, 0.1][i]), background: "#fff0cf", "--sx": ["140%", "-150%", "170%"][i], "--sy": "calc(var(--fx-side, 1) * -170%)" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   FAMILY E — CHAIN SNAP. Four cards where the leash is the geometry: a stride
   cinched to one cell, four rings pulled into one place, a staircase that eats
   its own climb.
   ========================================================================== */

/* -----------------------------------------------------------------------------
   40. Hobble Strap (t3) — THE STRIDE CINCHED TO ONE SQUARE.
   The full stride is laid out and measured, then the strap wraps it and the
   buckle takes it in to exactly one cell: scaleX(1 / --fx-len), no guessing.
   Palette: #b98a5a / #fff0d4 / #24170c.
   -------------------------------------------------------------------------- */
function HobbleStrap({ role, delayMs }: SceneProps) {
  const buckle = (
    <>
      <rect x="4" y="7" width="16" height="10" rx="1" fill="none" stroke="#b98a5a" strokeWidth="2.2" />
      <path d="M12 5v14" stroke="#fff0d4" strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 46, 92, 10), background: "#b98a5a" }} />
        <V c="g44-ent" d={200} s={pct(28, 24, 44, 52)}>{buckle}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(36, 62, 28, 20), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,212,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 48, 100, 9), background: "#b98a5a" }} />
        <V c="g44-hit" d={200} s={pct(24, 20, 52, 58)}>{buckle}</V>
        <L c="g44-dust" d={400} s={{ ...pct(30, 60, 40, 26), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,138,90,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(185,138,90,0.26)" d={70} />}>
      {/* tell: the buckle's shadow crosses the stride */}
      <L c="g44-tell" d={90} s={{ ...box(1.6, 0.7, 1.2, 0.6), borderRadius: "999px", background: "#24170c" }} />
      {/* the stride the piece HAD, measured out in full */}
      <L c="g44-hobble-stride" d={200} s={{ ...lane(0.4), background: "repeating-linear-gradient(90deg, #fff0d4 0 8%, transparent 8% 20%)" }} />
      {/* the strap itself, laid the same real distance */}
      <L c="g44-hobble-strap" d={300} s={{ ...lane(0.8), background: "linear-gradient(180deg, #b98a5a, #24170c)", border: "1px solid #fff0d4" }} />
      {/* strike: cinched to exactly one square, whatever the stride was */}
      <L c="g44-cinch" d={420} s={{ ...lane(0.8), background: "linear-gradient(180deg, #fff0d4, #b98a5a)" }} />
      <V c="g44-hobble-buckle" d={520} s={{ ...box(1.4, 1.4, 1), filter: "drop-shadow(0 0 4px #fff0d4)" }}>{buckle}</V>
      {/* the short hop that is left */}
      <V c="g44-hobble-hop" d={600} s={box(1.2, 1.6, 0.6, -0.7)}>
        <path d={PAWN} fill="#fff0d4" stroke="#24170c" strokeWidth="1.2" />
      </V>
      <L c="g44-dust" d={700} s={{ ...box(3.8, 2.2, 0.8, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,212,0.42), transparent 72%)" }} />
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   41. Quartermaster's Lock (t5) — THE SHACKLE THROUGH FOUR FAR RINGS.
   Four rings sit far apart, the lock draws them into one place, and a single
   shackle passes through all four at once. Palette: #cfd4dc / #fff1d8 / #1a1f28.
   -------------------------------------------------------------------------- */
function QuartermasterLock({ role, delayMs }: SceneProps) {
  const body = (
    <>
      <path d="M8 3.6a4 4 0 0 1 8 0V9h-2.4V3.6a1.6 1.6 0 0 0-3.2 0V9H8z" fill="#cfd4dc" stroke="#1a1f28" strokeWidth="1" {...SJ} />
      <rect x="4.6" y="9" width="14.8" height="11.4" rx="1" fill="#1a1f28" stroke="#cfd4dc" strokeWidth="1.3" />
      <circle cx="12" cy="14.4" r="1.9" fill="#fff1d8" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(24, 24, 52, 52), borderRadius: "50%", border: "2px solid #cfd4dc" }} />
        <V c="g44-ent" d={200} s={pct(30, 16, 40, 66)}>{body}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(38, 38, 24, 24), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,216,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(20, 20, 60, 60), borderRadius: "50%", border: "2px solid #cfd4dc" }} />
        <V c="g44-hit" d={200} s={pct(28, 12, 44, 72)}>{body}</V>
        <L c="g44-glint" d={400} s={{ ...pct(42, 44, 16, 16), borderRadius: "50%", background: "#fff1d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,212,220,0.26)" d={70} />}>
      {/* tell: the keyway catches the light */}
      <L c="g44-tell" d={90} s={{ ...box(0.7, 0.7, 0, 0.3), borderRadius: "50%", background: "#fff1d8" }} />
      {/* four rings, scattered as far apart as the pieces they belong to */}
      {R4.map((i) => (
        <L key={i} c="g44-lock-ring" d={200 + i * 55} per={28} s={{ ...box(1.1, 1.1, [-2.6, 2.6, -2.6, 2.6][i], [-2.2, -2.2, 2.2, 2.2][i]), borderRadius: "50%", border: "2px solid #cfd4dc", "--rx": `${[2.6, -2.6, 2.6, -2.6][i] * 34}%`, "--ry": `${[2.2, 2.2, -2.2, -2.2][i] * 34}%` }} />
      ))}
      {/* strike: the shackle passes through all four at once */}
      <L c="g44-lock-shackle" d={450} s={{ ...box(2.4, 2.4, 0, -0.6), borderRadius: "50%", border: "3px solid #fff1d8", borderBottomColor: "transparent" }} />
      <V c="g44-lock-body" d={530} s={{ ...box(2.2, 2.6, 0, 0.4), filter: "drop-shadow(0 0 5px #cfd4dc)" }}>{body}</V>
      {/* the bolt thrown, along the real run */}
      <L c="g44-lock-bolt" d={610} s={{ ...lane(0.3, 1.6), background: "linear-gradient(90deg, #fff1d8, rgba(207,212,220,0.1))" }} />
      {/* settle: filings off the shackle, away from the caster */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={690 + i * 45} s={{ ...box(0.3, 0.14, [-0.5, 0.4, 0.9][i], [0.9, 1.1, 0.7][i]), background: "#cfd4dc", "--sx": ["-140%", "150%", "170%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)" }} />
      ))}
    </Lead>
  );
}

/* -----------------------------------------------------------------------------
   42. Chain Gang (t6) — EVERY LINK TAKEN IN TO ONE.
   The chain is run out the real distance, the leg irons snap on in the real
   victim order, and the whole run is taken in to one cell. One link at the far
   end is left long: the chains spare it. Palette: #a8b0bc / #fff0d6 / #171c24.
   -------------------------------------------------------------------------- */
function ChainGang({ role, delayMs }: SceneProps) {
  const LINKS = "repeating-linear-gradient(90deg, #a8b0bc 0 9%, #171c24 9% 12%, #fff0d6 12% 14%, #171c24 14% 18%)";
  const iron = (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="#a8b0bc" strokeWidth="2.6" />
      <path d="M12 6v12" stroke="#fff0d6" strokeWidth="1.5" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(4, 46, 92, 10), background: LINKS }} />
        <V c="g44-ent" d={200} s={pct(28, 26, 44, 48)}>{iron}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(36, 60, 28, 22), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,214,0.8), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(0, 48, 100, 9), background: LINKS }} />
        <V c="g44-hit" d={200} s={pct(24, 22, 52, 54)}>{iron}</V>
        <L c="g44-grit" d={400} s={{ ...pct(44, 46, 12, 6), background: "#a8b0bc", "--sx": "-150%", "--sy": "140%" }} />
      </Cut>
    );
  }
  return (
    <AimLead centred d={delayMs} frame={<Wash tone="rgba(168,176,188,0.26)" d={70} />}>
      <L c="g44-tell" d={90} s={{ ...box(1.2, 0.5, 0.6, 0.5), borderRadius: "999px", background: "#171c24" }} />
      {/* the chain run out the whole real distance */}
      <L c="g44-chain-run" d={200} s={{ ...lane(0.7), background: LINKS, border: "1px solid #171c24" }} />
      {/* the leg irons snap on in the real victim order */}
      {R3.map((i) => (
        <V key={i} c="g44-chain-iron" d={290 + i * 60} per={28} s={at(0.2 + i * 0.24, 1.2, 1, 0.9)}>{iron}</V>
      ))}
      {/* strike: the whole run is taken in to exactly one cell */}
      <L c="g44-cinch" d={450} s={{ ...lane(0.7), background: LINKS }} />
      {/* the one link the chains spare stays out at full length */}
      <L c="g44-chain-spared" d={560} s={{ ...at(1, 1.4, 1.4), borderRadius: "50%", border: "2px solid #fff0d6" }} />
      {/* settle: rust off the irons */}
      {R3.map((i) => (
        <L key={i} c="g44-grit" d={660 + i * 45} s={{ ...box(0.3, 0.14, [0.4, 0.9, 1.4][i], [-0.4, 0.6, 0.2][i]), background: "#fff0d6", "--sx": ["140%", "-140%", "160%"][i], "--sy": "calc(var(--fx-side, 1) * -160%)" }} />
      ))}
    </AimLead>
  );
}

/* -----------------------------------------------------------------------------
   43. Puppet Court (t8) — THE STAIR THAT RETURNS TO ITS OWN FOOT.
   Four flights are laid round the dais, each one climbing, and the officer who
   walks them arrives back where he started with the throne no higher than the
   floor. Only the pawns, who never climbed, get anywhere.
   Palette: #b9a2d8 / #fff1e2 / #1d1630.
   -------------------------------------------------------------------------- */
const TREADS = "repeating-linear-gradient(90deg, #b9a2d8 0 22%, #1d1630 22% 26%)";
function LoopStair({ role, delayMs }: SceneProps) {
  const flight = (
    <>
      <path d="M2 20h4v-4h4v-4h4V8h6" fill="none" stroke="#b9a2d8" strokeWidth="2.4" {...SJ} />
      <path d="M2 22h20" stroke="#1d1630" strokeWidth="2" strokeLinecap="round" />
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g44-ent2" d={60} s={{ ...pct(8, 70, 84, 8), background: TREADS }} />
        <V c="g44-ent" d={200} s={pct(18, 20, 64, 56)}>{flight}</V>
        <L c="g44-ent3" d={430} s={{ ...pct(34, 30, 32, 32), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,226,0.85), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g44-hit2" d={40} s={{ ...pct(2, 72, 96, 9), background: TREADS }} />
        <V c="g44-hit" d={200} s={pct(14, 16, 72, 60)}>{flight}</V>
        <L c="g44-dust" d={400} s={{ ...pct(28, 60, 44, 28), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,162,216,0.6), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead centred d={delayMs} frame={<><Wash tone="rgba(185,162,216,0.26)" d={70} /><Rim tone="rgba(255,241,226,0.28)" d={150} /></>}>
      {/* tell: the first tread lights, and the strings above go slack */}
      <L c="g44-tell" d={90} s={{ ...box(1.6, 0.3, -1.6, 1.6), borderRadius: "999px", background: "#1d1630" }} />
      {/* four flights round the dais, each one climbing, in victim order */}
      {R4.map((i) => (
        <V key={i} c="g44-stair-flight" d={190 + i * 70} per={30} s={{ ...box(3.4, 1.6, 2.2 * Math.cos((i / 4) * 6.283), 2.2 * Math.sin((i / 4) * 6.283)), rotate: `${i * 90}deg` }}>{flight}</V>
      ))}
      {/* strike: the climber walks all four and is back at the bottom */}
      <V c="g44-stair-climb" d={470} s={{ ...box(1.2, 1.6), filter: "drop-shadow(0 0 5px #b9a2d8)" }}>
        <path d={KING} fill="#fff1e2" stroke="#1d1630" strokeWidth="1.1" {...SJ} />
      </V>
      {/* the throne, level with the foot of its own stair */}
      <L c="g44-stair-level" d={570} s={{ ...box(5.6, 0.24, 0, -0.2), borderRadius: "999px", background: "linear-gradient(90deg, rgba(255,241,226,0.1), #fff1e2, rgba(255,241,226,0.1))" }} />
      {/* the cut string falls past it all */}
      <L c="g44-stair-string" d={640} s={{ ...box(0.1, 3.4, -0.9, -1.4), background: "#fff1e2" }} />
      <L c="g44-dust" d={720} s={{ ...box(5, 2.6, 0, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,226,0.42), transparent 72%)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Two spaces of indent at object depth 1: the animation audit and
   check-sig-plugins.cjs parse this table as TEXT.
   ========================================================================== */

export const PLAYS: Record<string, SigPlugin> = {
  hx4_deja_vu: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "aim" },
    Render: FoldedMap,
  },
  hx4_no_full_retreat: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim" },
    Render: RatchetTape,
  },
  hx4_tea_break: {
    config: { ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" },
    Render: LockedDividers,
  },
  hx4_winded_monarch: {
    config: { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "snooze", anchor: "cast" },
    Render: PlumbLine,
  },
  hx4_cobweb_corners: {
    config: { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board" },
    Render: CobwebCorners,
  },
  hx4_cracked_bell: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" },
    Render: CrackedBell,
  },
  hx4_no_sidling: {
    config: { ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" },
    Render: LodestoneNeedle,
  },
  hx4_rusty_visor: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" },
    Render: IrisVisor,
  },
  hx4_stunned_grief: {
    config: { ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "shades", anchor: "cast" },
    Render: GriefShadow,
  },
  hx4_broken_oars: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "board" },
    Render: BentOar,
  },
  hx4_crime_scene: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "cast" },
    Render: TapeCordon,
  },
  hx4_tangled_marionettes: {
    config: { ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "blitz", anchor: "board" },
    Render: KnotThroughItself,
  },
  hx4_change_of_step: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" },
    Render: StepFloor,
  },
  hx4_leaden_boots: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "colossus", anchor: "board" },
    Render: CrowdedGrid,
  },
  ov_wizard_duel: {
    config: { ordering: "line", staggerMs: 60, victims: ["b"], hasLead: true, sound: "lightning", anchor: "aim" },
    Render: FacingMirrors,
  },
  hx4_lantern_out: {
    config: { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "board" },
    Render: LanternShutter,
  },
  hx4_crossbow_curfew: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "board" },
    Render: ArcheryButt,
  },
  ov_portal_pair: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" },
    Render: TwinMouths,
  },
  bn4_ghost_walk: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" },
    Render: GhostSteps,
  },
  bn4_faerie_door: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "gacha", anchor: "aim" },
    Render: FaerieRing,
  },
  ov_archmage_sabbatical: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" },
    Render: ShortHammock,
  },
  ov_heavenly_bureaucracy: {
    config: { ordering: "line", staggerMs: 55, victims: ["k"], hasLead: true, sound: "vault", anchor: "aim" },
    Render: Pigeonholes,
  },
  bn4_marshals_baton: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" },
    Render: SandTable,
  },
  hx4_velvet_rope: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "cast" },
    Render: VelvetRope,
  },
  bn4_worldgate: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "nova", anchor: "aim" },
    Render: Worldgate,
  },
  hx4_choke_point: {
    config: { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "cast" },
    Render: HourglassWaist,
  },
  hx4_wall_of_teeth: {
    config: { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" },
    Render: ZipTeeth,
  },
  hx4_mismatched_livery: {
    config: { ordering: "line", staggerMs: 55, victims: ["r"], hasLead: true, sound: "gacha", anchor: "board" },
    Render: AnamorphicLivery,
  },
  ov_grappling_hook: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "aim" },
    Render: GrappleWinch,
  },
  ov_overdue_library_book: {
    config: { ordering: "line", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "vault", anchor: "aim" },
    Render: ShelfGap,
  },
  bn4_hearth_ring: {
    config: { ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast" },
    Render: HearthRing,
  },
  bn4_wagon_circle: {
    config: { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "colossus", source: "shield", anchor: "board" },
    Render: WagonCircle,
  },
  bn4_heralds_truce: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast" },
    Render: FloorBlister,
  },
  ov_gravity_flip: {
    config: { ordering: "radial", staggerMs: 55, victims: ["p"], hasLead: true, sound: "colossus", anchor: "cast" },
    Render: UphillPour,
  },
  ov_paperwork_avalanche: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "vault", anchor: "cast" },
    Render: InTray,
  },
  bn4_field_glasses: {
    config: { ordering: "line", staggerMs: 50, victims: "all", hasLead: true, sound: "nova", anchor: "board" },
    Render: FieldGlasses,
  },
  op_star_dressing_room: {
    config: { ordering: "line", staggerMs: 50, victims: ["q"], hasLead: true, sound: "coronation", anchor: "aim" },
    Render: CostumeRail,
  },
  bn4_scouts_report: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "nova", anchor: "board" },
    Render: Theodolite,
  },
  ov_meteor_golf: {
    config: { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "crashrocket", anchor: "aim" },
    Render: MeteorGolf,
  },
  hx4_hobble_strap: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "board" },
    Render: HobbleStrap,
  },
  bn4_quartermasters_lock: {
    config: { ordering: "radial", staggerMs: 55, victims: ["r", "q"], hasLead: true, sound: "vault", source: "shield", anchor: "cast" },
    Render: QuartermasterLock,
  },
  hx4_chain_gang: {
    config: { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "board" },
    Render: ChainGang,
  },
  hx4_puppet_court: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "board" },
    Render: LoopStair,
  },
};
