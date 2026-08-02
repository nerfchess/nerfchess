// g10ThawPlays — bespoke plays for the 29 freeze / winter cards that used to
// share the generated `frostbloom` family (one crystal fan, 29 hue shifts).
//
// MODULE FICTION: HEAT LOSING. Nothing here draws cold directly. Cold is drawn
// as what WARMTH does while it fails: a brazier falls to a single red eye and
// then to grey ash, a kettle's whistle drops in pitch and stops, a forge is
// quenched with a hiss and a shock of steam, a thaw drip refreezes halfway
// down, a storm lantern shrinks to a bead, a hot spring crusts over from the
// rim, a candle's pool of wax sets mid-run, frost flowers open on the INSIDE
// of the glass, and dust sheets in a shut gallery lose their drape and set
// rigid. Two cards in this batch never share a central object.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g10ThawPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Board-scale layers (washes, edge gilt)
// live inside <BoardFrame>, never at a fixed percentage of the stage. The
// cards that travel (the wyrm down a rank, the flung pail, the ghost ship down
// a file) use <AimStage> and author their art pointing RIGHT. A card that
// REACHES for its victims while its subject stays upright (the winter palace
// stair) keeps the upright <Lead> and rotates one run-out layer only, via
// <Reach>.
//
// Every scene runs three beats — tell, strike, settle — in all three roles,
// and every lead carries at least one layer driven by the geometry vars
// (--fx-side warmth withdrawing toward the caster, --fx-ox/oy lean, --fx-len
// run length), which is what makes the play directional rather than
// decorative. All CSS lives in g10ThawPlays.css behind the `g10-` prefix.

import "./g10ThawPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, impactVars } from "./impact/impact";

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
const rootStyle = (d: number): CSSProperties => ({ "--g10-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g10-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
      {frame ? (
        <BoardWideStage>
          <BoardFrame>{frame}</BoardFrame>
        </BoardWideStage>
      ) : null}
      <AimStage>{children}</AimStage>
    </span>
  );
}

/**
 * ONE reaching layer inside a cast-anchored <Lead>.
 *
 * `fx-aim` is the same rotation <AimStage> applies internally, so art authored
 * pointing RIGHT is turned onto the real source -> target vector and can run
 * out to the victim by --fx-len. It is applied to a single layer rather than
 * by swapping the whole scene to <AimLead> because everything upright in the
 * scene — a stair, a mirror, a lamp — would otherwise be laid on its side.
 * The rotation pivots on the stage centre, which IS the cast square, so the
 * run starts where the card was played. Only ONE of these per scene: a second
 * staging box would multiply the 14-cell canvas by 14 again.
 */
function Reach({ children }: { children: ReactNode }) {
  return (
    <span className="fx-aim absolute inset-0 block" aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-wide wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return (
    <L c="g10-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />
  );
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g10-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: the bystanders the cold is happening to. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";

/** A tongue of flame, the module's most reused warm shape. */
const FLAME = "M12 2.4c2.2 3.8 4.4 5.8 4.4 8.7a4.4 4.4 0 0 1-8.8 0c0-2.9 2.2-4.9 4.4-8.7z";

/* --- 1. Winter Orders (t6) — THE ORDERS BRAZIER -----------------------------
   Two order slips are nailed up over the camp brazier; the coals fall from a
   full orange bed to one red eye, the eye winks out, and grey ash sifts down
   the tripod. Palette: #e2905a / #ffeccb / #1d2430. */
function WinterOrdersScene({ role, delayMs }: SceneProps) {
  const slip = (
    <g {...SJ}>
      <path d="M5 3h10l4 4v14H5z" fill="#ffeccb" stroke="#1d2430" strokeWidth="1.1" />
      <path d="M8 10h8M8 13.4h8M8 16.8h5" stroke="#1d2430" strokeWidth="0.9" />
    </g>
  );
  const bowl = (
    <g {...SJ}>
      <path d="M3.4 8h17.2l-3 7.4H6.4z" fill="#1d2430" stroke="#e2905a" strokeWidth="1.2" />
      <path d="M7 15.4L5 22M17 15.4L19 22M12 15.4V22" stroke="#e2905a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={20} t={6} w={40} h={44} d={40}>{slip}</V>
        <V c="g10-wo-bowl" l={12} t={44} w={72} h={48} d={260}>{bowl}</V>
        <V c="g10-wo-eye" l={40} t={48} w={20} h={20} d={470}><circle cx="12" cy="12" r="6" fill="#e2905a" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={16} t={8} w={48} h={54} d={0}>{slip}</V>
        <V c="g10-hit" l={20} t={44} w={60} h={44} d={140}>{bowl}</V>
        <L c="g10-hit2" l={44} t={56} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#e2905a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(226,144,90,0.26)" /><Rim tone="rgba(29,36,48,0.42)" d={520} /></>}>
      <V c="g10-wo-slip" l={39} t={28} w={11} h={14} d={90}>{slip}</V>
      <V c="g10-wo-slip" l={50} t={29} w={11} h={14} d={200}>{slip}</V>
      <V c="g10-wo-bowl" l={41} t={42} w={18} h={18} d={300}>{bowl}</V>
      <L c="g10-wo-coal" l={44} t={45.5} w={12} h={5} d={400} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #e2905a, #ffeccb, #e2905a)" }} />
      <L c="g10-wo-eye" l={48.6} t={46.4} w={2.8} h={2.8} d={620} st={{ borderRadius: "50%", background: "#e2905a" }} />
      <L c="g10-drawdown" l={43} t={40} w={14} h={10} d={660} st={{ background: "linear-gradient(180deg, rgba(255,236,203,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={44 + i * 4} t={49} w={1.5} h={1.5} d={740 + i * 110} st={{ borderRadius: "50%", background: "#ffeccb" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Winter Palace (t6) — FROST FLOWERS ON THE INSIDE OF THE GLASS -------
   A lit mullioned window; the warm light behind it cools, and fern-shaped
   frost flowers open across the pane from its corners INWARD, sealing the
   hall. Palette: #9fd0e8 / #fff2d8 / #16283a. */
const WP_FERN = "M12 22V6M12 18c-3-1-4.6-3-5-6M12 18c3-1 4.6-3 5-6M12 13c-2.4-.8-3.6-2.4-3.8-4.6M12 13c2.4-.8 3.6-2.4 3.8-4.6";

function WinterPalaceBnScene({ role, delayMs }: SceneProps) {
  const pane = (
    <g {...SJ}>
      <path d="M4 3h16v18H4z" fill="rgba(22,40,58,0.62)" stroke="#9fd0e8" strokeWidth="1.3" />
      <path d="M12 3v18M4 12h16" stroke="#9fd0e8" strokeWidth="1" />
    </g>
  );
  const fern = <path d={WP_FERN} fill="none" stroke="#fff2d8" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={12} t={10} w={76} h={78} d={40}>{pane}</V>
        <V c="g10-wp-fern" l={16} t={14} w={34} h={34} d={280} st={{ transformOrigin: "50% 100%" }}>{fern}</V>
        <V c="g10-ent-dim" l={50} t={50} w={34} h={34} d={470} st={{ transformOrigin: "50% 100%", rotate: "180deg" }}>{fern}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={14} t={12} w={72} h={72} d={0}>{pane}</V>
        <V c="g10-hit" l={20} t={16} w={30} h={30} d={150} st={{ transformOrigin: "50% 100%" }}>{fern}</V>
        <L c="g10-hit2" l={30} t={34} w={40} h={30} d={260} st={{ background: "radial-gradient(circle, rgba(255,242,216,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,208,232,0.26)" /><Rim tone="rgba(255,242,216,0.3)" d={480} /></>}>
      <L c="g10-wp-glow" l={40} t={38} w={20} h={24} d={70} st={{ background: "linear-gradient(180deg, rgba(255,242,216,0.7), rgba(159,208,232,0.16))" }} />
      <V c="g10-wp-pane" l={40} t={37} w={20} h={26} d={200}>{pane}</V>
      {[[40.6, 37.6, "0deg"], [53.4, 37.6, "90deg"], [40.6, 50.4, "270deg"], [53.4, 50.4, "180deg"]].map(
        ([l, t, r], i) => (
          <P key={i} l={l as number} t={t as number} w={6} h={12} rot={r as string}>
            <V c="g10-wp-fern" w={100} h={100} d={340 + i * 110} st={{ transformOrigin: "50% 100%" }}>{fern}</V>
          </P>
        ),
      )}
      <L c="g10-drawdown" l={42} t={40} w={16} h={20} d={720} st={{ background: "linear-gradient(180deg, rgba(255,242,216,0.42), transparent)" }} />
      <L c="g10-wp-seal" l={39} t={36} w={22} h={28} d={800} st={{ border: "2px solid #9fd0e8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-glint" l={42 + i * 7} t={41 + (i % 2) * 12} w={2} h={2} d={820 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Avalanche Pass (t6) — THE ROAD FIRE SMOTHERED -----------------------
   A snow load slumps off the shoulder onto the pass fire; the smoke column
   bends, breaks off at the fold and drifts away, and two marker stakes lean
   out of a fresh grey drift. Palette: #cfe2ee / #ffe9c4 / #202a33. */
function AvalanchePassScene({ role, delayMs }: SceneProps) {
  const drift = <path d="M1 22c3-6 6-8 8-4.6C11 13 14 11 16 14.4 18 12 22 15 23 22z" fill="#cfe2ee" stroke="#202a33" strokeWidth="1" {...SJ} />;
  const stake = <path d="M12 2v20M12 6l5-2M12 11l-4-2" fill="none" stroke="#202a33" strokeWidth="1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ap-slump" l={4} t={10} w={92} h={56} d={40}>{drift}</V>
        <V c="g10-ap-smoke" l={38} t={12} w={24} h={44} d={260}><path d="M12 22c-4-4 4-6 0-10s3-6 1-9" fill="none" stroke="#ffe9c4" strokeWidth="1.6" {...SJ} /></V>
        <V c="g10-ent-pop" l={26} t={44} w={48} h={48} d={470}>{stake}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={6} t={30} w={88} h={56} d={0}>{drift}</V>
        <V c="g10-hit" l={38} t={8} w={24} h={54} d={140}>{stake}</V>
        <L c="g10-hit2" l={34} t={22} w={32} h={20} d={250} st={{ background: "radial-gradient(circle, rgba(255,233,196,0.62), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,226,238,0.28)" /><Rim tone="rgba(32,42,51,0.36)" d={560} /></>}>
      <V c="g10-ap-smoke" l={45} t={30} w={10} h={18} d={80}><path d="M12 22c-4-4 4-6 0-10s3-6 1-9" fill="none" stroke="#ffe9c4" strokeWidth="1.8" {...SJ} /></V>
      <L c="g10-ap-fire" l={46.6} t={46} w={7} h={6} d={140} st={{ borderRadius: "999px", background: "radial-gradient(circle, #ffe9c4, rgba(207,226,238,0))" }} />
      <V c="g10-ap-slump" l={34} t={34} w={32} h={22} d={280}>{drift}</V>
      <L c="g10-ap-hiss" l={42} t={43} w={16} h={9} d={420} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,233,196,0.85), transparent 70%)" }} />
      <L c="g10-creep" l={38} t={49} w={24} h={5} d={540} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cfe2ee, transparent)" }} />
      <V c="g10-ap-stake" l={43} t={41} w={5} h={11} d={640} st={{ transformOrigin: "50% 100%" }}>{stake}</V>
      <V c="g10-ap-stake" l={53} t={41} w={5} h={11} d={740} st={{ transformOrigin: "50% 100%" }}>{stake}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-mote" l={44 + i * 5} t={40} w={1.6} h={1.6} d={780 + i * 100} st={{ borderRadius: "50%", background: "#cfe2ee" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Beartrap Cache (t6) — TWO EMBER POTS BURIED -------------------------
   Two lidded ember pots are pressed down into the snow; their glow retreats to
   a dot behind the vent holes, the lids frost shut and one late wisp escapes.
   Palette: #d99a4e / #ffeeca / #1e2226. */
function BeartrapCacheScene({ role, delayMs }: SceneProps) {
  const pot = (
    <g {...SJ}>
      <path d="M5 9h14v9c0 2.4-2 4-7 4s-7-1.6-7-4z" fill="#1e2226" stroke="#d99a4e" strokeWidth="1.2" />
      <path d="M3.6 6.4h16.8v2.8H3.6z" fill="#d99a4e" stroke="#1e2226" strokeWidth="0.9" />
      <path d="M9 13h1.6M13.4 13H15" stroke="#d99a4e" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={6} t={20} w={44} h={50} d={40}>{pot}</V>
        <V c="g10-bc-press" l={50} t={26} w={44} h={50} d={250}>{pot}</V>
        <L c="g10-ent-mote" l={44} t={12} w={4} h={12} d={460} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #ffeeca, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={20} t={20} w={60} h={58} d={0}>{pot}</V>
        <L c="g10-hit2" l={40} t={44} w={20} h={8} d={150} st={{ borderRadius: "999px", background: "#d99a4e" }} />
        <L c="g10-hit" l={30} t={62} w={40} h={10} d={260} st={{ borderRadius: "999px", background: "rgba(255,238,202,0.6)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(217,154,78,0.24)" />}>
      <L c="g10-bc-dig" l={39} t={46} w={10} h={4} d={80} st={{ borderRadius: "999px", background: "rgba(30,34,38,0.7)" }} />
      <L c="g10-bc-dig" l={53} t={48} w={10} h={4} d={190} st={{ borderRadius: "999px", background: "rgba(30,34,38,0.7)" }} />
      <V c="g10-bc-press" l={39.5} t={40} w={9} h={11} d={300}>{pot}</V>
      <V c="g10-bc-press" l={53.5} t={42} w={9} h={11} d={420}>{pot}</V>
      <L c="g10-bc-fade" l={42} t={44} w={4} h={2.4} d={560} st={{ borderRadius: "999px", background: "#d99a4e" }} />
      <L c="g10-bc-fade" l={56} t={46} w={4} h={2.4} d={640} st={{ borderRadius: "999px", background: "#d99a4e" }} />
      <L c="g10-drawdown" l={42} t={38} w={18} h={10} d={700} st={{ background: "linear-gradient(180deg, rgba(255,238,202,0.44), transparent)" }} />
      <L c="g10-mote" l={45} t={40} w={1.8} h={4} d={800} st={{ borderRadius: "999px", background: "#ffeeca" }} />
    </Lead>
  );
}

/* --- 5. Black Lotus (t6) — THE FIVE-WICK CANDELABRA -------------------------
   A lotus-shaped candelabra of five candles; the flames pinch out petal by
   petal and each running bead of wax sets solid halfway down its candle.
   Palette: #f0b46a / #fff1d2 / #241831. */
const BL_WICKS: Array<[number, number]> = [[41, 42], [45.4, 39.4], [49.5, 38.4], [53.6, 39.4], [58, 42]];

function BlackLotusScene({ role, delayMs }: SceneProps) {
  const candle = (
    <g {...SJ}>
      <path d="M9 8h6v14H9z" fill="#fff1d2" stroke="#241831" strokeWidth="1" />
      <path d="M12 5.4v2.6" stroke="#241831" strokeWidth="1.2" />
    </g>
  );
  const flame = <path d={FLAME} fill="#f0b46a" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={30} t={30} w={40} h={62} d={40}>{candle}</V>
        <V c="g10-bl-pinch" l={36} t={4} w={28} h={34} d={280}>{flame}</V>
        <L c="g10-bl-wax" l={44} t={52} w={5} h={18} d={470} st={{ borderRadius: "999px", background: "#fff1d2", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={32} t={28} w={36} h={58} d={0}>{candle}</V>
        <V c="g10-hit" l={36} t={4} w={28} h={30} d={140}>{flame}</V>
        <L c="g10-hit2" l={44} t={48} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,180,106,0.28)" /><Rim tone="rgba(36,24,49,0.4)" d={620} /></>}>
      <V c="g10-bl-bloom" l={38} t={44} w={24} h={14} d={90}>
        <path d="M2 20c2-6 5-9 10-10 5 1 8 4 10 10z" fill="none" stroke="#241831" strokeWidth="1.4" {...SJ} />
      </V>
      {BL_WICKS.map(([l, t], i) => (
        <V key={i} c="g10-bl-candle" l={l} t={t} w={4} h={10} d={180 + i * 70}>{candle}</V>
      ))}
      {BL_WICKS.map(([l, t], i) => (
        <V key={`f${i}`} c="g10-bl-pinch" l={l + 0.6} t={t - 3.4} w={2.8} h={4.4} d={400 + i * 110}>{flame}</V>
      ))}
      <L c="g10-bl-wax" l={44.4} t={49} w={1.6} h={5} d={760} st={{ borderRadius: "999px", background: "#fff1d2", transformOrigin: "50% 0%" }} />
      <L c="g10-bl-wax" l={54.6} t={49} w={1.6} h={5} d={830} st={{ borderRadius: "999px", background: "#fff1d2", transformOrigin: "50% 0%" }} />
      <L c="g10-drawdown" l={42} t={36} w={16} h={12} d={860} st={{ background: "linear-gradient(180deg, rgba(255,241,210,0.44), transparent)" }} />
    </Lead>
  );
}

/* --- 6. Gale Warning (t6) — THE STORM LANTERN AT THE RIM --------------------
   A storm lantern swings on its post at the board's edge; the wind lays the
   flame flat, pinches it to a bead and takes it, and the glass rimes over.
   Palette: #ffc978 / #fff0d0 / #1b2836. */
function GaleWarningScene({ role, delayMs }: SceneProps) {
  const lantern = (
    <g {...SJ}>
      <path d="M8 2h8M12 2v3" stroke="#1b2836" strokeWidth="1.3" />
      <path d="M6.4 5h11.2v3H6.4zM7.4 8h9.2v9H7.4zM6.4 17h11.2v3H6.4z" fill="rgba(27,40,54,0.7)" stroke="#ffc978" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-gw-swing" l={26} t={8} w={48} h={72} d={40} st={{ transformOrigin: "50% 0%" }}>{lantern}</V>
        <V c="g10-gw-flat" l={40} t={34} w={20} h={26} d={280}><path d={FLAME} fill="#ffc978" /></V>
        <L c="g10-ent-dim" l={44} t={44} w={12} h={12} d={470} st={{ borderRadius: "50%", background: "#fff0d0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={28} t={10} w={44} h={68} d={0}>{lantern}</V>
        <V c="g10-hit" l={40} t={34} w={20} h={24} d={150}><path d={FLAME} fill="#ffc978" /></V>
        <L c="g10-hit2" l={46} t={44} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#fff0d0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><Rim tone="rgba(255,201,120,0.34)" d={90} /><Wash tone="rgba(27,40,54,0.3)" d={420} /></>}
    >
      <L c="g10-gw-gust" l={30} t={42} w={44} h={4} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff0d0, transparent)" }} />
      <V c="g10-gw-swing" l={44} t={34} w={12} h={20} d={200} st={{ transformOrigin: "50% 0%" }}>{lantern}</V>
      <V c="g10-gw-flat" l={47.6} t={41} w={4.6} h={6} d={340}><path d={FLAME} fill="#ffc978" /></V>
      <L c="g10-gw-bead" l={48.9} t={43.4} w={2.2} h={2.2} d={560} st={{ borderRadius: "50%", background: "#fff0d0" }} />
      <L c="g10-leanshadow" l={44} t={54} w={12} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(27,40,54,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={45 + i * 4} t={46} w={1.5} h={1.5} d={720 + i * 110} st={{ borderRadius: "50%", background: "#fff0d0" }} />
      ))}
    </Lead>
  );
}

/* --- 7. Glacier Gate (t6) — THE FOUR GRATES STOP BREATHING ------------------
   Four warm-air grates at the crossroads vent steam; each plume thins, snaps
   off at the grate and a white lid closes over the bars. Palette: #b7dced /
   #ffeecb / #17242e. */
const GG_GRATES: Array<[number, number]> = [[41, 40], [53, 40], [41, 52], [53, 52]];

function GlacierGateScene({ role, delayMs }: SceneProps) {
  const grate = (
    <g {...SJ}>
      <path d="M3 5h18v14H3z" fill="rgba(23,36,46,0.72)" stroke="#b7dced" strokeWidth="1.2" />
      <path d="M7 5v14M12 5v14M17 5v14" stroke="#b7dced" strokeWidth="1" />
    </g>
  );
  const plume = <path d="M12 22c-3.4-3.6 3.4-5.6 0-9.2s3-5.4 1.2-8.4" fill="none" stroke="#ffeecb" strokeWidth="1.7" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={18} t={44} w={64} h={44} d={40}>{grate}</V>
        <V c="g10-gg-cut" l={34} t={4} w={32} h={46} d={270}>{plume}</V>
        <L c="g10-gg-lid" l={18} t={44} w={64} h={10} d={470} st={{ background: "#b7dced" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={20} t={40} w={60} h={44} d={0}>{grate}</V>
        <V c="g10-hit" l={36} t={6} w={28} h={40} d={140}>{plume}</V>
        <L c="g10-hit2" l={20} t={38} w={60} h={8} d={260} st={{ background: "#ffeecb" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(183,220,237,0.26)" /><Rim tone="rgba(23,36,46,0.4)" d={640} /></>}>
      {GG_GRATES.map(([l, t], i) => (
        <V key={i} c="g10-gg-grate" l={l} t={t} w={6} h={6} d={80 + i * 70}>{grate}</V>
      ))}
      {GG_GRATES.map(([l, t], i) => (
        <V key={`p${i}`} c="g10-gg-cut" l={l + 0.6} t={t - 7} w={4.8} h={8} d={320 + i * 100}>{plume}</V>
      ))}
      <L c="g10-gg-lid" l={40.4} t={39.4} w={19.2} h={19.2} d={700} st={{ background: "linear-gradient(160deg, rgba(255,238,203,0.72), rgba(183,220,237,0.2))" }} />
      <L c="g10-creep" l={38} t={48} w={24} h={3} d={760} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #b7dced, transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-mote" l={43 + i * 7} t={41} w={1.6} h={1.6} d={800 + i * 100} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      ))}
    </Lead>
  );
}

/* --- 8. Grave Chill (t6) — BREATH OUT OF THE SLAB ---------------------------
   Warm vapour lifts out of a cracked grave slab, hangs, turns to a single
   hanging crystal and comes apart into grit on the dark squares. Palette:
   #c8e6ea / #ffefcc / #1a1f24. */
function GraveChillScene({ role, delayMs }: SceneProps) {
  const slab = (
    <g {...SJ}>
      <path d="M4 8h16v13H4z" fill="rgba(26,31,36,0.8)" stroke="#c8e6ea" strokeWidth="1.2" />
      <path d="M9 8.4l2.4 6.4-1 6.2M15 8.4l-1.6 5" stroke="#c8e6ea" strokeWidth="0.9" fill="none" />
    </g>
  );
  const shard = <path d="M12 2l4.4 8.4L12 22 7.6 10.4z" fill="#ffefcc" stroke="#1a1f24" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={12} t={44} w={76} h={48} d={40}>{slab}</V>
        <V c="g10-gc-breath" l={34} t={10} w={32} h={40} d={280}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffefcc" strokeWidth="1.8" {...SJ} /></V>
        <V c="g10-gc-shard" l={40} t={14} w={20} h={34} d={470}>{shard}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={14} t={42} w={72} h={46} d={0}>{slab}</V>
        <V c="g10-hit" l={40} t={8} w={20} h={38} d={150}>{shard}</V>
        <L c="g10-hit2" l={36} t={30} w={28} h={20} d={260} st={{ background: "radial-gradient(circle, rgba(255,239,204,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(200,230,234,0.24)" /><Rim tone="rgba(26,31,36,0.44)" d={520} /></>}>
      <V c="g10-gc-slab" l={40} t={44} w={20} h={16} d={80}>{slab}</V>
      <L c="g10-gc-crack" l={44} t={46} w={12} h={1.6} d={220} st={{ borderRadius: "999px", background: "#ffefcc" }} />
      <V c="g10-gc-breath" l={45} t={32} w={10} h={14} d={330}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffefcc" strokeWidth="2" {...SJ} /></V>
      <V c="g10-gc-shard" l={46.4} t={31} w={7.2} h={13} d={560}>{shard}</V>
      <L c="g10-leanshadow" l={42} t={57} w={16} h={3.4} d={640} st={{ borderRadius: "999px", background: "rgba(26,31,36,0.68)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={44 + i * 4} t={40} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#c8e6ea" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Hundred Year Nap (t6) — THE KETTLE STOPS SINGING --------------------
   A kettle on the hob; its whistle plume carries three sound arcs that fall in
   pitch and shorten to nothing, then the spout crusts over and the house is
   quiet. Palette: #e8b56e / #fff1d4 / #202a2e. */
const HN_ARCS = [0, 1, 2];

function HundredYearNapScene({ role, delayMs }: SceneProps) {
  const kettle = (
    <g {...SJ}>
      <path d="M5 10h11v8c0 2.2-2 3.6-5.5 3.6S5 20.2 5 18z" fill="rgba(32,42,46,0.82)" stroke="#e8b56e" strokeWidth="1.2" />
      <path d="M16 12l4-4.4M6.6 10c0-2.4 1.6-3.6 3.9-3.6" fill="none" stroke="#e8b56e" strokeWidth="1.3" />
    </g>
  );
  const arc = <path d="M4 20C4 12 8 6 14 3" fill="none" stroke="#fff1d4" strokeWidth="1.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={14} t={34} w={66} h={56} d={40}>{kettle}</V>
        <V c="g10-hn-arc" l={54} t={6} w={38} h={40} d={280}>{arc}</V>
        <L c="g10-ent-dim" l={62} t={22} w={16} h={16} d={470} st={{ borderRadius: "50%", background: "#e8b56e" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={16} t={34} w={62} h={52} d={0}>{kettle}</V>
        <V c="g10-hit" l={56} t={10} w={34} h={34} d={140}>{arc}</V>
        <L c="g10-hit2" l={52} t={30} w={14} h={6} d={260} st={{ borderRadius: "999px", background: "#fff1d4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,181,110,0.26)" />}>
      <L c="g10-hn-hob" l={40} t={52} w={20} h={4} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #e8b56e, transparent)" }} />
      <V c="g10-hn-kettle" l={41} t={41} w={16} h={13} d={190}>{kettle}</V>
      {HN_ARCS.map((i) => (
        <V key={i} c="g10-hn-arc" l={55 + i * 1.6} t={34 - i * 1.4} w={8 - i * 1.4} h={9 - i * 1.6} d={330 + i * 140}>{arc}</V>
      ))}
      <L c="g10-hn-crust" l={55.4} t={38.4} w={4.4} h={4.4} d={760} st={{ borderRadius: "50%", background: "#fff1d4" }} />
      <L c="g10-drawdown" l={44} t={38} w={14} h={10} d={800} st={{ background: "linear-gradient(180deg, rgba(255,241,212,0.46), transparent)" }} />
      <L c="g10-mote" l={47} t={39} w={1.8} h={1.8} d={860} st={{ borderRadius: "50%", background: "#fff1d4" }} />
    </Lead>
  );
}

/* --- 10. Iron Maiden (t6) — THE QUENCH -------------------------------------
   A red-hot iron clamp is lifted off the fire and driven into the trough: one
   hiss line, a shock of steam, and the iron comes up black with rime blooming
   along its ribs. Palette: #ff8f5a / #ffeac4 / #14181d. */
function IronMaidenScene({ role, delayMs }: SceneProps) {
  const clamp = (
    <g {...SJ}>
      <path d="M6 3h12v14l-6 5-6-5z" fill="rgba(20,24,29,0.86)" stroke="#ff8f5a" strokeWidth="1.3" />
      <path d="M12 4v13M8.6 7h6.8M8.6 11h6.8" stroke="#ff8f5a" strokeWidth="1" />
    </g>
  );
  const trough = <path d="M2 12h20v6c0 1.6-1 2.4-3 2.4H5c-2 0-3-.8-3-2.4z" fill="rgba(20,24,29,0.8)" stroke="#ffeac4" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={26} t={4} w={48} h={58} d={40}>{clamp}</V>
        <V c="g10-ent-rise" l={8} t={52} w={84} h={40} d={250}>{trough}</V>
        <L c="g10-im-burst" l={22} t={30} w={56} h={40} d={460} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,234,196,0.85), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={28} t={8} w={44} h={56} d={0}>{clamp}</V>
        <L c="g10-hit2" l={18} t={54} w={64} h={4} d={150} st={{ borderRadius: "999px", background: "#ffeac4" }} />
        <L c="g10-hit" l={26} t={40} w={48} h={30} d={260} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,143,90,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,143,90,0.3)" /><Rim tone="rgba(20,24,29,0.44)" d={600} /></>}>
      <L c="g10-im-glow" l={44} t={32} w={12} h={12} d={70} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ff8f5a, transparent 70%)" }} />
      <V c="g10-im-plunge" l={45} t={33} w={10} h={14} d={200}>{clamp}</V>
      <V c="g10-im-trough" l={40} t={46} w={20} h={10} d={140}>{trough}</V>
      <L c="g10-im-hiss" l={41} t={47.6} w={18} h={1.8} d={430} st={{ borderRadius: "999px", background: "#ffeac4" }} />
      <L c="g10-im-burst" l={38} t={36} w={24} h={16} d={470} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,234,196,0.85), transparent 70%)" }} />
      <L c="g10-drawdown" l={43} t={34} w={14} h={12} d={700} st={{ background: "linear-gradient(180deg, rgba(255,234,196,0.42), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-mote" l={43 + i * 6} t={38} w={1.8} h={1.8} d={760 + i * 110} st={{ borderRadius: "50%", background: "#ffeac4" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Narcolepsy (t6) — THE HOT SPRING CRUSTS OVER -----------------------
   Steam stands off a hot pool, thins to threads, and a crust closes across the
   water from the rim inward while two ripple rings slow and stop. Palette:
   #a8dce0 / #fff0cf / #17262a. */
function NarcolepsyScene({ role, delayMs }: SceneProps) {
  const pool = <path d="M2 12c0-4 4.4-6.6 10-6.6S22 8 22 12s-4.4 6.6-10 6.6S2 16 2 12z" fill="rgba(23,38,42,0.7)" stroke="#a8dce0" strokeWidth="1.3" {...SJ} />;
  const curl = <path d="M12 21c-3.6-3.4 3.6-5.4 0-8.8s3-5.2 1-8" fill="none" stroke="#fff0cf" strokeWidth="1.7" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={8} t={48} w={84} h={40} d={40}>{pool}</V>
        <V c="g10-nc-thin" l={34} t={4} w={32} h={48} d={270}>{curl}</V>
        <L c="g10-nc-crust" l={12} t={50} w={76} h={34} d={470} st={{ borderRadius: "50%", background: "rgba(255,240,207,0.6)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={10} t={44} w={80} h={40} d={0}>{pool}</V>
        <V c="g10-hit" l={36} t={8} w={28} h={40} d={140}>{curl}</V>
        <L c="g10-hit2" l={16} t={46} w={68} h={34} d={260} st={{ borderRadius: "50%", background: "rgba(255,240,207,0.55)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,220,224,0.26)" />}>
      <V c="g10-nc-pool" l={38} t={43} w={24} h={14} d={70}>{pool}</V>
      <V c="g10-nc-thin" l={44} t={31} w={5} h={13} d={210}>{curl}</V>
      <V c="g10-nc-thin" l={51} t={32} w={5} h={12} d={310}>{curl}</V>
      <L c="g10-nc-ring" l={42} t={45} w={16} h={9} d={420} st={{ borderRadius: "50%", border: "1.5px solid #fff0cf" }} />
      <L c="g10-nc-ring" l={44} t={46.4} w={12} h={6.6} d={540} st={{ borderRadius: "50%", border: "1.5px solid #fff0cf" }} />
      <L c="g10-nc-crust" l={38.6} t={43.6} w={22.8} h={12.8} d={680} st={{ borderRadius: "50%", background: "linear-gradient(160deg, rgba(255,240,207,0.78), rgba(168,220,224,0.24))" }} />
      <L c="g10-drawdown" l={43} t={38} w={14} h={10} d={780} st={{ background: "linear-gradient(180deg, rgba(255,240,207,0.4), transparent)" }} />
    </Lead>
  );
}

/* --- 12. Pillory (t6) — THE STOCKS AND THE FRUIT THAT NEVER LANDED WET -----
   The plank drops shut on the neck, a lobbed fruit arcs in, and it shatters
   like glass on the wood because it froze on the way. Palette: #d8c07a /
   #ffeecb / #1f2429. */
function PilloryScene({ role, delayMs }: SceneProps) {
  const stocks = (
    <g {...SJ}>
      <path d="M2 9h20v6H2z" fill="rgba(31,36,41,0.86)" stroke="#d8c07a" strokeWidth="1.2" />
      <circle cx="8" cy="12" r="2.4" fill="none" stroke="#ffeecb" strokeWidth="1.1" />
      <circle cx="16" cy="12" r="2.4" fill="none" stroke="#ffeecb" strokeWidth="1.1" />
      <path d="M4 15v7M20 15v7" stroke="#d8c07a" strokeWidth="1.4" />
    </g>
  );
  const fruit = <circle cx="12" cy="12" r="7.4" fill="#d8c07a" stroke="#1f2429" strokeWidth="1.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={8} t={30} w={84} h={44} d={40}>{stocks}</V>
        <V c="g10-pl-lob" l={54} t={12} w={26} h={26} d={270}>{fruit}</V>
        <L c="g10-pl-shatter" l={30} t={30} w={40} h={40} d={470} st={{ borderRadius: "50%", border: "2px solid #ffeecb" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={10} t={30} w={80} h={44} d={0}>{stocks}</V>
        <V c="g10-hit" l={38} t={6} w={24} h={26} d={150}>{fruit}</V>
        <L c="g10-hit2" l={30} t={26} w={40} h={40} d={260} st={{ borderRadius: "50%", border: "2px solid #ffeecb" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,192,122,0.24)" /><Rim tone="rgba(31,36,41,0.4)" d={560} /></>}>
      <V c="g10-pl-slam" l={38} t={43} w={24} h={13} d={90} st={{ transformOrigin: "50% 20%" }}>{stocks}</V>
      <V c="g10-pl-caught" l={46.4} t={44.6} w={7.2} h={9} d={260}><path d={PAWN} fill="#ffeecb" /></V>
      <V c="g10-pl-lob" l={58} t={34} w={6} h={6} d={420}>{fruit}</V>
      <L c="g10-pl-shatter" l={44} t={44} w={12} h={12} d={620} st={{ borderRadius: "50%", border: "2px solid #ffeecb" }} />
      <L c="g10-leanshadow" l={42} t={55} w={16} h={3.4} d={660} st={{ borderRadius: "999px", background: "rgba(31,36,41,0.7)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={43 + i * 4.5} t={47} w={1.6} h={1.6} d={720 + i * 90} st={{ borderRadius: "50%", background: "#d8c07a" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Silken Net (t6) — THE PINCHED PLUMES -------------------------------
   The net is thrown and lands open; three threads of warm air rising through
   the mesh are pinched off one by one as the cord whitens and the water beads
   on it set hard. Palette: #cfe0d8 / #fff1d2 / #1b2b2a. */
function SilkenNetScene({ role, delayMs }: SceneProps) {
  const mesh = (
    <g fill="none" stroke="#cfe0d8" strokeWidth="1.1" {...SJ}>
      <path d="M2 12L12 2l10 10-10 10z" />
      <path d="M7 7l10 10M17 7L7 17" />
      <path d="M2 12h20M12 2v20" />
    </g>
  );
  const thread = <path d="M12 22c-2.8-3.4 2.8-5.4 0-8.8s2.4-5 .8-7.6" fill="none" stroke="#fff1d2" strokeWidth="1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-sn-cast" l={10} t={16} w={80} h={70} d={40}>{mesh}</V>
        <V c="g10-sn-pinch" l={38} t={4} w={24} h={38} d={280}>{thread}</V>
        <L c="g10-ent-mote" l={44} t={44} w={12} h={12} d={470} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={12} t={12} w={76} h={76} d={0}>{mesh}</V>
        <V c="g10-hit" l={38} t={4} w={24} h={36} d={140}>{thread}</V>
        <L c="g10-hit2" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,224,216,0.26)" />}>
      <L c="g10-runout" l={44} t={45.6} w={26} h={1.8} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff1d2, rgba(207,224,216,0))", transformOrigin: "0% 50%" }} />
      <V c="g10-sn-cast" l={38} t={38} w={24} h={24} d={190}>{mesh}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g10-sn-pinch" l={42 + i * 6} t={33} w={4} h={8} d={340 + i * 130}>{thread}</V>
      ))}
      <L c="g10-sn-bead" l={45} t={44} w={2} h={2} d={700} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      <L c="g10-sn-bead" l={53} t={47} w={2} h={2} d={780} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      <L c="g10-drawdown" l={42} t={36} w={16} h={10} d={820} st={{ background: "linear-gradient(180deg, rgba(255,241,210,0.4), transparent)" }} />
    </Lead>
  );
}

/* --- 14. Thunderhead (t6) — THE COLD BOLT ----------------------------------
   The head gathers over the throne and drops its bolt, and where the fire
   should be there is one shock of steam that turns to crystal grit in the air
   and a white scar on the boards. Palette: #bcd4f0 / #ffeec8 / #161b2c. */
function ThunderheadScene({ role, delayMs }: SceneProps) {
  const cloud = <path d="M4 17c-2 0-3-1.4-3-3.2 0-1.9 1.5-3.2 3.4-3.2C4.8 7.4 7.2 5.4 10 5.4c3 0 5.2 1.9 5.9 4.6h.7c2.4 0 4.4 1.7 4.4 3.6S19 17 16.6 17z" fill="rgba(22,27,44,0.84)" stroke="#bcd4f0" strokeWidth="1.2" {...SJ} />;
  const bolt = <path d="M13.6 2L6 13.4h4.6L9.4 22 18 10h-4.8z" fill="#ffeec8" stroke="#161b2c" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={10} t={8} w={80} h={46} d={40}>{cloud}</V>
        <V c="g10-th-bolt" l={38} t={34} w={26} h={56} d={280}>{bolt}</V>
        <L c="g10-th-scar" l={26} t={78} w={48} h={4} d={470} st={{ borderRadius: "999px", background: "#ffeec8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={16} t={4} w={68} h={40} d={0}>{cloud}</V>
        <V c="g10-hit" l={38} t={28} w={24} h={52} d={140}>{bolt}</V>
        <L c="g10-hit2" l={30} t={74} w={40} h={4} d={250} st={{ borderRadius: "999px", background: "#ffeec8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(22,27,44,0.34)" /><Rim tone="rgba(188,212,240,0.3)" d={540} /></>}>
      <V c="g10-th-gather" l={38} t={26} w={24} h={14} d={80}>{cloud}</V>
      <V c="g10-th-king" l={46} t={45} w={8} h={11} d={200}><path d={KING} fill="none" stroke="#bcd4f0" strokeWidth="1.4" {...SJ} /></V>
      <V c="g10-th-bolt" l={45.4} t={36} w={9} h={14} d={380}>{bolt}</V>
      <L c="g10-th-steam" l={42} t={42} w={16} h={12} d={470} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,238,200,0.86), transparent 70%)" }} />
      <L c="g10-th-scar" l={41} t={53} w={18} h={2} d={620} st={{ borderRadius: "999px", background: "#ffeec8" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={43 + i * 4.5} t={44} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#bcd4f0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Frost Wyrm (t6) — THE WYRM QUENCHES THE WATCHFIRES -----------------
   Aim-staged: the wyrm runs the chosen rank at head height and every watchfire
   it passes is pinched to a bead and gone, leaving a cold wake along the run.
   Palette: #8fd4ea / #ffe9c2 / #12242f. */
const FW_FIRES = [0, 1, 2, 3];

function FrostWyrmScene({ role, delayMs }: SceneProps) {
  const wyrm = (
    <g {...SJ}>
      <path d="M1 15c5 1.5 9-1 12-5 1.6-2.1 4-3 6.6-2.4L23 6l-1.6 3.6c1 2 .6 4.2-1.4 5.4-3.6 2.2-8.2 3.6-13 3.4z" fill="#8fd4ea" stroke="#12242f" strokeWidth="1.1" />
      <path d="M19.2 8.6h.02" stroke="#12242f" strokeWidth="2" />
      <path d="M9 10.6l2.4-3.2M13.6 8.2l1.4-3.4" stroke="#ffe9c2" strokeWidth="1.2" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-fw-run" l={4} t={22} w={90} h={54} d={40}>{wyrm}</V>
        <V c="g10-fw-douse" l={62} t={54} w={24} h={30} d={280}><path d={FLAME} fill="#ffe9c2" /></V>
        <L c="g10-ent-mote" l={22} t={56} w={5} h={5} d={470} st={{ borderRadius: "50%", background: "#8fd4ea" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={38} t={30} w={26} h={40} d={0}><path d={FLAME} fill="#ffe9c2" /></V>
        <V c="g10-hit" l={6} t={26} w={88} h={46} d={140}>{wyrm}</V>
        <L c="g10-hit2" l={44} t={54} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#8fd4ea" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(143,212,234,0.28)" /><Rim tone="rgba(18,36,47,0.4)" d={620} /></>}>
      <L c="g10-runout" l={44} t={48.4} w={30} h={2.4} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffe9c2, rgba(143,212,234,0))", transformOrigin: "0% 50%" }} />
      {FW_FIRES.map((i) => (
        <V key={i} c="g10-fw-douse" l={45 + i * 5.4} t={45} w={3.4} h={5} d={260 + i * 120}>
          <path d={FLAME} fill="#ffe9c2" />
        </V>
      ))}
      <V c="g10-fw-run" l={38} t={40} w={26} h={16} d={200}>{wyrm}</V>
      <L c="g10-fw-wake" l={44} t={49.6} w={26} h={1.6} d={700} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #8fd4ea, transparent)", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={46 + i * 6} t={46} w={1.6} h={1.6} d={760 + i * 100} st={{ borderRadius: "50%", background: "#ffe9c2" }} />
      ))}
    </AimLead>
  );
}

/* --- 16. Flash Frost (t5) — THE FLUNG PAIL ---------------------------------
   Aim-staged: a pail of boiling water is thrown down the vector, the arc turns
   to a white comb in mid-air, and the whole sheet drops and breaks. Palette:
   #b8e2f0 / #ffedc9 / #172530. */
function FlashFrostScene({ role, delayMs }: SceneProps) {
  const pail = (
    <g {...SJ}>
      <path d="M6 8h12l-1.6 12H7.6z" fill="rgba(23,37,48,0.84)" stroke="#b8e2f0" strokeWidth="1.2" />
      <path d="M6.6 8c0-3 2.4-4.6 5.4-4.6S17.4 5 17.4 8" fill="none" stroke="#b8e2f0" strokeWidth="1.2" />
    </g>
  );
  const comb = (
    <g fill="none" stroke="#ffedc9" strokeWidth="1.4" {...SJ}>
      <path d="M1 6C7 3 15 4 23 9" />
      <path d="M4 5.4l-1 6M8 4.4l-.6 6.6M12.4 5l.4 6.8M17 6.6l1.2 6.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ff-throw" l={6} t={30} w={44} h={52} d={40} st={{ transformOrigin: "70% 80%" }}>{pail}</V>
        <V c="g10-ff-comb" l={30} t={10} w={66} h={46} d={280}>{comb}</V>
        <L c="g10-ff-break" l={40} t={54} w={44} h={30} d={470} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,237,201,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={16} t={18} w={68} h={44} d={0}>{comb}</V>
        <V c="g10-hit" l={34} t={38} w={32} h={46} d={140}>{pail}</V>
        <L c="g10-hit2" l={30} t={64} w={40} h={20} d={260} st={{ borderRadius: "999px", background: "rgba(184,226,240,0.6)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(184,226,240,0.26)" /><Rim tone="rgba(23,37,48,0.36)" d={580} /></>}>
      <V c="g10-ff-throw" l={40} t={42} w={9} h={12} d={80} st={{ transformOrigin: "70% 80%" }}>{pail}</V>
      <L c="g10-runout" l={45} t={45} w={26} h={2} d={200} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffedc9, rgba(184,226,240,0))", transformOrigin: "0% 50%" }} />
      <V c="g10-ff-comb" l={46} t={38} w={22} h={12} d={330}>{comb}</V>
      <L c="g10-ff-break" l={50} t={45} w={16} h={8} d={560} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,237,201,0.8), transparent 70%)" }} />
      <L c="g10-leanshadow" l={48} t={53} w={16} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(23,37,48,0.68)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={48 + i * 4.5} t={46} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#b8e2f0" }} />
      ))}
    </AimLead>
  );
}

/* --- 17. Grandma's Cookies (t5) — THE OVEN DOOR OPENS -----------------------
   The one card in the batch where warmth WINS: the oven door swings down, a
   slab of hot air rolls out over the boards, the tray comes out steaming and
   the rime retreats off the piece. Palette: #e5a35c / #fff2d6 / #2b1d14. */
function GrandmasCookiesScene({ role, delayMs }: SceneProps) {
  const oven = (
    <g {...SJ}>
      <path d="M3 4h18v16H3z" fill="rgba(43,29,20,0.88)" stroke="#e5a35c" strokeWidth="1.3" />
      <path d="M5.4 7.4h13.2v9H5.4z" fill="rgba(229,163,92,0.5)" stroke="#fff2d6" strokeWidth="1" />
      <path d="M8 18.4h8" stroke="#fff2d6" strokeWidth="1.2" />
    </g>
  );
  const tray = (
    <g {...SJ}>
      <path d="M2 13h20v5H2z" fill="#2b1d14" stroke="#e5a35c" strokeWidth="1.1" />
      <circle cx="7" cy="10.4" r="2.6" fill="#e5a35c" />
      <circle cx="12.6" cy="10" r="2.6" fill="#fff2d6" />
      <circle cx="18" cy="10.4" r="2.6" fill="#e5a35c" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={14} t={12} w={72} h={62} d={40}>{oven}</V>
        <V c="g10-gk-tray" l={12} t={54} w={76} h={34} d={280}>{tray}</V>
        <L c="g10-gk-waft" l={22} t={26} w={56} h={30} d={470} st={{ background: "radial-gradient(circle, rgba(255,242,214,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={14} t={40} w={72} h={40} d={0}>{tray}</V>
        <L c="g10-hit2" l={24} t={18} w={52} h={30} d={150} st={{ background: "radial-gradient(circle, rgba(255,242,214,0.7), transparent 70%)" }} />
        <V c="g10-hit" l={40} t={22} w={20} h={30} d={260}><path d={PAWN} fill="#e5a35c" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(229,163,92,0.3)" /><Rim tone="rgba(255,242,214,0.3)" d={520} /></>}>
      <V c="g10-gk-oven" l={40} t={38} w={20} h={20} d={80}>{oven}</V>
      <L c="g10-gk-door" l={40} t={53} w={20} h={7} d={230} st={{ background: "linear-gradient(180deg, #e5a35c, rgba(43,29,20,0.9))", transformOrigin: "50% 0%" }} />
      <L c="g10-gk-waft" l={34} t={40} w={32} h={18} d={340} st={{ background: "radial-gradient(circle, rgba(255,242,214,0.72), transparent 70%)" }} />
      <V c="g10-gk-tray" l={41} t={46} w={18} h={9} d={460}>{tray}</V>
      <V c="g10-gk-thaw" l={46} t={44} w={8} h={11} d={640}><path d={PAWN} fill="none" stroke="#fff2d6" strokeWidth="1.5" {...SJ} /></V>
      <L c="g10-drawdown" l={43} t={36} w={14} h={10} d={720} st={{ background: "linear-gradient(180deg, rgba(255,242,214,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-mote" l={44 + i * 5} t={40} w={1.8} h={1.8} d={780 + i * 100} st={{ borderRadius: "50%", background: "#fff2d6" }} />
      ))}
    </Lead>
  );
}

/* --- 18. Prison Break (t5) — THE HOT BAR ON THE FROZEN LOCK -----------------
   A bar out of the fire is laid against a padlock caked white; it hisses, the
   frost lifts off as steam and the shackle springs. Palette: #ff9a5c /
   #ffeec9 / #1a1e26. */
function PrisonBreakScene({ role, delayMs }: SceneProps) {
  const lock = (
    <g {...SJ}>
      <path d="M6 11h12v10H6z" fill="rgba(26,30,38,0.88)" stroke="#ff9a5c" strokeWidth="1.2" />
      <path d="M8.4 11V8a3.6 3.6 0 0 1 7.2 0v3" fill="none" stroke="#ffeec9" strokeWidth="1.5" />
    </g>
  );
  const bar = <path d="M2 14h20" fill="none" stroke="#ff9a5c" strokeWidth="3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={24} t={20} w={52} h={64} d={40}>{lock}</V>
        <V c="g10-pb-bar" l={2} t={34} w={70} h={30} d={280}>{bar}</V>
        <L c="g10-pb-lift" l={30} t={12} w={40} h={34} d={470} st={{ background: "radial-gradient(circle, rgba(255,238,201,0.75), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={26} t={22} w={48} h={60} d={0}>{lock}</V>
        <L c="g10-hit2" l={10} t={44} w={80} h={4} d={150} st={{ borderRadius: "999px", background: "#ff9a5c" }} />
        <L c="g10-hit" l={30} t={14} w={40} h={30} d={260} st={{ background: "radial-gradient(circle, rgba(255,238,201,0.72), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,154,92,0.3)" /><Rim tone="rgba(26,30,38,0.4)" d={560} /></>}>
      <V c="g10-pb-lock" l={44} t={42} w={12} h={16} d={80}>{lock}</V>
      <L c="g10-pb-crust" l={43.4} t={41.4} w={13.2} h={9} d={190} st={{ background: "linear-gradient(180deg, rgba(255,238,201,0.8), transparent)" }} />
      <V c="g10-pb-bar" l={34} t={44} w={22} h={8} d={340}>{bar}</V>
      <L c="g10-pb-hiss" l={42} t={45.6} w={16} h={1.6} d={470} st={{ borderRadius: "999px", background: "#ffeec9" }} />
      <L c="g10-pb-lift" l={40} t={34} w={20} h={14} d={560} st={{ background: "radial-gradient(circle, rgba(255,238,201,0.78), transparent 70%)" }} />
      <L c="g10-drawdown" l={44} t={33} w={12} h={10} d={720} st={{ background: "linear-gradient(180deg, rgba(255,154,92,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-mote" l={44 + i * 5} t={38} w={1.8} h={1.8} d={780 + i * 100} st={{ borderRadius: "50%", background: "#ffeec9" }} />
      ))}
    </Lead>
  );
}

/* --- 19. Ashen Bread (t5) — THE LOAF GOES GREY ------------------------------
   A loaf is broken open and its steam rises, stalls, and sinks back into the
   crumb; the bread greys from the tear outward and drops ash flakes.
   Palette: #c8b48e / #ffeecb / #23201c. */
function AshenBreadScene({ role, delayMs }: SceneProps) {
  const loaf = (
    <g {...SJ}>
      <path d="M2.6 15c0-5 4-8.4 9.4-8.4S21.4 10 21.4 15c0 2.6-1.4 4-4.4 4H7c-3 0-4.4-1.4-4.4-4z" fill="#c8b48e" stroke="#23201c" strokeWidth="1.2" />
      <path d="M7.4 9.4l1.4 3.4M12 8.4v3.6M16.6 9.4l-1.4 3.4" stroke="#23201c" strokeWidth="1" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={8} t={30} w={84} h={48} d={40}>{loaf}</V>
        <V c="g10-ab-steam" l={36} t={4} w={28} h={38} d={280}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffeecb" strokeWidth="1.8" {...SJ} /></V>
        <L c="g10-ab-grey" l={20} t={34} w={60} h={40} d={470} st={{ background: "linear-gradient(90deg, transparent, rgba(200,180,142,0.85), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={10} t={30} w={80} h={46} d={0}>{loaf}</V>
        <L c="g10-hit2" l={46} t={26} w={8} h={40} d={150} st={{ background: "#23201c" }} />
        <L c="g10-hit" l={26} t={68} w={48} h={12} d={260} st={{ borderRadius: "999px", background: "rgba(255,238,203,0.55)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,180,142,0.26)" />}>
      <V c="g10-ab-loaf" l={39} t={43} w={22} h={13} d={80}>{loaf}</V>
      <L c="g10-ab-tear" l={49.4} t={43} w={1.4} h={12} d={220} st={{ background: "#23201c" }} />
      <V c="g10-ab-steam" l={46} t={33} w={8} h={11} d={330}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffeecb" strokeWidth="2" {...SJ} /></V>
      <L c="g10-ab-grey" l={39} t={43} w={22} h={13} d={520} st={{ background: "linear-gradient(90deg, transparent, rgba(255,238,203,0.7), transparent)" }} />
      <L c="g10-leanshadow" l={41} t={55} w={18} h={3.4} d={620} st={{ borderRadius: "999px", background: "rgba(35,32,28,0.66)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={42 + i * 4.5} t={47} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#c8b48e" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Clay Hooves (t5) — THE KILN EYE CLOSES -----------------------------
   A clay-shod hoof stands on the drying shelf; the kiln's spy-hole eye dims
   from orange to nothing and the clay crazes over with hairlines and lets go
   a dust of dry grit. Palette: #d08a56 / #ffeaca / #241c18. */
function ClayHoovesScene({ role, delayMs }: SceneProps) {
  const hoof = (
    <g {...SJ}>
      <path d="M7.4 3.6h9.2l1.6 9c.5 2.9-1.6 5-3.4 6.2l-2.8 2-2.8-2c-1.8-1.2-3.9-3.3-3.4-6.2z" fill="#d08a56" stroke="#241c18" strokeWidth="1.2" />
      <path d="M9.4 7h5.2M9 11h6" stroke="#241c18" strokeWidth="1" />
    </g>
  );
  const craze = <path d="M4 6l5 5-2 6M20 5l-5 6 3 7M9 11h6" fill="none" stroke="#ffeaca" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={22} t={12} w={54} h={70} d={40}>{hoof}</V>
        <L c="g10-ch-eye" l={70} t={16} w={18} h={18} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #d08a56, transparent 70%)" }} />
        <V c="g10-ch-craze" l={26} t={20} w={48} h={56} d={470}>{craze}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={26} t={12} w={48} h={66} d={0}><path d={KNIGHT} fill="#d08a56" /></V>
        <V c="g10-hit" l={28} t={18} w={44} h={56} d={150}>{craze}</V>
        <L c="g10-hit2" l={36} t={76} w={28} h={4} d={260} st={{ borderRadius: "999px", background: "#241c18" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(208,138,86,0.26)" /><Rim tone="rgba(36,28,24,0.38)" d={580} /></>}>
      <L c="g10-ch-shelf" l={38} t={54} w={24} h={2.4} d={70} st={{ borderRadius: "999px", background: "#241c18" }} />
      <V c="g10-ch-knight" l={45} t={41} w={10} h={13} d={190}><path d={KNIGHT} fill="none" stroke="#ffeaca" strokeWidth="1.4" {...SJ} /></V>
      <V c="g10-ch-set" l={45.4} t={44} w={9.2} h={11} d={330}>{hoof}</V>
      <L c="g10-ch-eye" l={57} t={38} w={6} h={6} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #d08a56, transparent 70%)" }} />
      <V c="g10-ch-craze" l={45.4} t={44} w={9.2} h={11} d={640}>{craze}</V>
      <L c="g10-drawdown" l={44} t={37} w={12} h={10} d={720} st={{ background: "linear-gradient(180deg, rgba(255,234,202,0.44), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={45 + i * 4} t={50} w={1.5} h={1.5} d={780 + i * 100} st={{ borderRadius: "50%", background: "#ffeaca" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Cold Reception (t5) — THE DOOR WITH NO FIRE ------------------------
   The door swings for the arrival and the wedge of light on the sill goes from
   warm to blue and narrows away to nothing; cold rolls out over the step
   instead of welcome. Palette: #f2c583 / #fff1d1 / #1a222e. */
function ColdReceptionScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <path d="M5 2h14v20H5z" fill="rgba(26,34,46,0.88)" stroke="#f2c583" strokeWidth="1.3" />
      <path d="M8 2v20" stroke="#f2c583" strokeWidth="1" />
      <circle cx="16" cy="12.4" r="1.1" fill="#fff1d1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-cr-swing" l={16} t={8} w={54} h={78} d={40} st={{ transformOrigin: "12% 50%" }}>{door}</V>
        <L c="g10-cr-wedge" l={54} t={30} w={40} h={44} d={280} st={{ background: "linear-gradient(90deg, rgba(242,197,131,0.8), transparent)", transformOrigin: "0% 50%" }} />
        <L c="g10-cr-spill" l={16} t={76} w={72} h={8} d={470} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff1d1, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={20} t={10} w={48} h={72} d={0}>{door}</V>
        <L c="g10-hit2" l={58} t={30} w={34} h={40} d={150} st={{ background: "linear-gradient(90deg, rgba(242,197,131,0.75), transparent)" }} />
        <L c="g10-hit" l={18} t={74} w={64} h={8} d={260} st={{ borderRadius: "999px", background: "#fff1d1" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(26,34,46,0.3)" /><Rim tone="rgba(242,197,131,0.28)" d={540} /></>}>
      <V c="g10-cr-swing" l={39} t={38} w={13} h={20} d={80} st={{ transformOrigin: "12% 50%" }}>{door}</V>
      <L c="g10-cr-wedge" l={51} t={42} w={16} h={13} d={230} st={{ background: "linear-gradient(90deg, rgba(242,197,131,0.85), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g10-cr-cool" l={51} t={42} w={16} h={13} d={420} st={{ background: "linear-gradient(90deg, rgba(255,241,209,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g10-cr-pawn" l={57} t={44} w={7} h={10} d={520}><path d={PAWN} fill="none" stroke="#fff1d1" strokeWidth="1.4" {...SJ} /></V>
      <L c="g10-cr-spill" l={44} t={55} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #f2c583, transparent)" }} />
      <L c="g10-drawdown" l={44} t={38} w={14} h={10} d={720} st={{ background: "linear-gradient(180deg, rgba(255,241,209,0.4), transparent)" }} />
    </Lead>
  );
}

/* --- 22. Frost Heave (t5) — THE GROUND EXHALES ONCE -------------------------
   Needle ice lifts a flagstone off its bed; the last of the ground's warmth
   escapes through the crack as one puff, crystallises above it and the needles
   are left standing. Palette: #b6cfd6 / #ffeec9 / #1e2622. */
function FrostHeaveScene({ role, delayMs }: SceneProps) {
  const flag = <path d="M2 8h20l-2 9H4z" fill="rgba(30,38,34,0.86)" stroke="#b6cfd6" strokeWidth="1.3" {...SJ} />;
  const needles = (
    <g fill="none" stroke="#ffeec9" strokeWidth="1.3" {...SJ}>
      <path d="M4 22V9M8.4 22V6M12.8 22V10M17 22V7M21 22V11" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-fh-lift" l={8} t={22} w={84} h={40} d={40} st={{ transformOrigin: "20% 100%" }}>{flag}</V>
        <V c="g10-fh-needle" l={12} t={50} w={76} h={40} d={280} st={{ transformOrigin: "50% 100%" }}>{needles}</V>
        <L c="g10-fh-puff" l={34} t={16} w={34} h={26} d={470} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,238,201,0.75), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={10} t={30} w={80} h={34} d={0} st={{ transformOrigin: "20% 100%" }}>{flag}</V>
        <V c="g10-hit" l={14} t={54} w={72} h={34} d={150} st={{ transformOrigin: "50% 100%" }}>{needles}</V>
        <L c="g10-hit2" l={34} t={20} w={32} h={24} d={260} st={{ borderRadius: "999px", background: "rgba(255,238,201,0.6)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(182,207,214,0.26)" />}>
      <L c="g10-fh-crack" l={41} t={49} w={18} h={1.6} d={80} st={{ borderRadius: "999px", background: "#ffeec9" }} />
      <V c="g10-fh-lift" l={40} t={43} w={20} h={9} d={220} st={{ transformOrigin: "20% 100%" }}>{flag}</V>
      <L c="g10-fh-puff" l={44} t={38} w={12} h={9} d={370} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,238,201,0.82), transparent 70%)" }} />
      <V c="g10-fh-needle" l={41} t={48} w={18} h={9} d={480} st={{ transformOrigin: "50% 100%" }}>{needles}</V>
      <L c="g10-creep" l={38} t={53} w={24} h={2.6} d={620} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #b6cfd6, transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g10-grit" l={43 + i * 4.5} t={41} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#ffeec9" }} />
      ))}
    </Lead>
  );
}

/* --- 23. Grasping Ivy (t5) — THE GLASSHOUSE STOVE DIES ----------------------
   The stove pipe in the corner of the glasshouse greys out; the ivy that was
   growing warm and loose curls around the nearest piece and sets rigid, its
   leaf edges going silver. Palette: #9fc48a / #ffeec6 / #16241a. */
function GraspingIvyScene({ role, delayMs }: SceneProps) {
  const vine = (
    <g fill="none" stroke="#9fc48a" strokeWidth="1.6" {...SJ}>
      <path d="M12 22c0-6 4-8 4-13M12 22c0-5-4-7-4-12" />
      <path d="M15 13c2.4-.6 3.4-2 3-4M9.4 12c-2.4-.6-3.4-2-3-4" />
    </g>
  );
  const pipe = (
    <g {...SJ}>
      <path d="M8 22V9c0-2.6 1.6-4 4-4h6" fill="none" stroke="#ffeec6" strokeWidth="2.2" />
      <path d="M5.4 22h5.2" stroke="#16241a" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-gi-pipe" l={8} t={14} w={44} h={70} d={40}>{pipe}</V>
        <V c="g10-gi-curl" l={40} t={22} w={52} h={64} d={280} st={{ transformOrigin: "50% 100%" }}>{vine}</V>
        <L c="g10-gi-silver" l={46} t={30} w={40} h={4} d={470} st={{ borderRadius: "999px", background: "#ffeec6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={24} t={16} w={52} h={66} d={0} st={{ transformOrigin: "50% 100%" }}>{vine}</V>
        <V c="g10-hit" l={34} t={30} w={32} h={48} d={150}><path d={ROOK} fill="#9fc48a" /></V>
        <L c="g10-hit2" l={30} t={26} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#ffeec6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,196,138,0.26)" /><Rim tone="rgba(22,36,26,0.4)" d={560} /></>}>
      <V c="g10-gi-pipe" l={36} t={36} w={10} h={20} d={80}>{pipe}</V>
      <V c="g10-gi-king" l={48} t={44} w={8} h={11} d={200}><path d={KING} fill="none" stroke="#ffeec6" strokeWidth="1.4" {...SJ} /></V>
      <V c="g10-gi-curl" l={45} t={40} w={14} h={17} d={340} st={{ transformOrigin: "50% 100%" }}>{vine}</V>
      <L c="g10-gi-silver" l={45} t={44} w={14} h={1.6} d={560} st={{ borderRadius: "999px", background: "#ffeec6" }} />
      <L c="g10-leanshadow" l={44} t={55} w={16} h={3.2} d={640} st={{ borderRadius: "999px", background: "rgba(22,36,26,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={44 + i * 5} t={46} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#9fc48a" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Haunted Gallery (t5) — THE DUST SHEETS GO STIFF --------------------
   Three draped sheets hang soft over the gallery furniture; a draught comes
   down the long diagonal and each one loses its drape and sets rigid, a board
   rather than a cloth. Palette: #dfe4d8 / #fff1d0 / #1c1e22. */
const HG_SHEETS: Array<[number, number]> = [[38, 38], [45.5, 44], [53, 50]];

function HauntedGalleryScene({ role, delayMs }: SceneProps) {
  const soft = <path d="M3 21V9c0-4 3.6-6.6 9-6.6S21 5 21 9v12c-2-1.6-3.6-1.6-5.4 0-1.8-1.6-3.4-1.6-5.2 0-1.8-1.6-3.6-1.6-5.4 0z" fill="#dfe4d8" stroke="#1c1e22" strokeWidth="1.1" {...SJ} />;
  const rigid = <path d="M4 21V8c0-3.4 3.4-5.6 8-5.6S20 4.6 20 8v13z" fill="none" stroke="#fff1d0" strokeWidth="1.4" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={20} t={14} w={58} h={70} d={40}>{soft}</V>
        <V c="g10-hg-stiff" l={22} t={16} w={54} h={66} d={280}>{rigid}</V>
        <L c="g10-ent-mote" l={44} t={12} w={12} h={12} d={470} st={{ borderRadius: "50%", background: "#fff1d0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={22} t={14} w={56} h={70} d={0}>{soft}</V>
        <V c="g10-hit" l={24} t={16} w={52} h={66} d={150}>{rigid}</V>
        <L c="g10-hit2" l={34} t={82} w={32} h={4} d={260} st={{ borderRadius: "999px", background: "#1c1e22" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(223,228,216,0.24)" /><Rim tone="rgba(28,30,34,0.42)" d={580} /></>}>
      <L c="g10-hg-draught" l={36} t={40} w={30} h={2} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff1d0, transparent)", rotate: "36deg" }} />
      {HG_SHEETS.map(([l, t], i) => (
        <V key={i} c="g10-hg-drape" l={l} t={t} w={9} h={12} d={180 + i * 120}>{soft}</V>
      ))}
      {HG_SHEETS.map(([l, t], i) => (
        <V key={`r${i}`} c="g10-hg-stiff" l={l} t={t} w={9} h={12} d={460 + i * 120}>{rigid}</V>
      ))}
      <L c="g10-drawdown" l={43} t={36} w={16} h={12} d={780} st={{ background: "linear-gradient(180deg, rgba(255,241,208,0.42), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={41 + i * 7} t={44 + i * 5} w={1.5} h={1.5} d={820 + i * 90} st={{ borderRadius: "50%", background: "#dfe4d8" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Silk Cocoon (t5) — THE SPINDLE AND THE DYING GLOW ------------------
   A spindle spins thread around the piece, wrap on wrap; the amber glow inside
   the wrap goes thin, goes blue and goes out, and the silk sets to a shell.
   Palette: #e2c9a0 / #fff1d2 / #1e2126. */
function SilkCocoonScene({ role, delayMs }: SceneProps) {
  const spindle = (
    <g {...SJ}>
      <path d="M12 1.6v20.8" stroke="#1e2126" strokeWidth="1.4" />
      <path d="M7 8c0-2.6 2.2-4.4 5-4.4S17 5.4 17 8c0 4-2.2 8-5 8s-5-4-5-8z" fill="#e2c9a0" stroke="#1e2126" strokeWidth="1.1" />
    </g>
  );
  const wrap = (
    <g fill="none" stroke="#fff1d2" strokeWidth="1.2" {...SJ}>
      <path d="M5 9c4-3 10-3 14 0M4.6 13c4.4-3 10.4-3 14.8 0M6 17c3.4-2.4 8.6-2.4 12 0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-sc-spin" l={26} t={8} w={48} h={76} d={40}>{spindle}</V>
        <V c="g10-sc-wrap" l={20} t={26} w={60} h={50} d={280}>{wrap}</V>
        <L c="g10-sc-glow" l={40} t={40} w={20} h={20} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, #e2c9a0, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={30} t={20} w={40} h={58} d={0}><path d={KNIGHT} fill="#e2c9a0" /></V>
        <V c="g10-hit" l={22} t={26} w={56} h={48} d={150}>{wrap}</V>
        <L c="g10-hit2" l={42} t={42} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "rgba(255,241,210,0.68)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(226,201,160,0.26)" />}>
      <V c="g10-sc-spin" l={36} t={35} w={10} h={20} d={80}>{spindle}</V>
      <V c="g10-sc-piece" l={46} t={43} w={8} h={12} d={210}><path d={KNIGHT} fill="none" stroke="#fff1d2" strokeWidth="1.4" {...SJ} /></V>
      <V c="g10-sc-wrap" l={44} t={42} w={12} h={13} d={350}>{wrap}</V>
      <L c="g10-sc-glow" l={47.6} t={45.4} w={4.8} h={4.8} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, #e2c9a0, transparent 70%)" }} />
      <L c="g10-sc-shell" l={44} t={42} w={12} h={13} d={700} st={{ borderRadius: "50%", border: "2px solid #fff1d2" }} />
      <L c="g10-drawdown" l={44} t={36} w={12} h={10} d={760} st={{ background: "linear-gradient(180deg, rgba(255,241,210,0.42), transparent)" }} />
    </Lead>
  );
}

/* --- 26. Tithe of Blood (t5) — THE DRIP THAT NEVER LANDED -------------------
   The blade steams once after the kill; the steam is cut off, and the drip
   that leaves its tip stops dead halfway down and hangs there.
   Palette: #d4707a / #ffeac6 / #1b1418. */
function TitheOfBloodScene({ role, delayMs }: SceneProps) {
  const blade = (
    <g {...SJ}>
      <path d="M12 1.6l2.6 4.4-1.2 11.4h-2.8L9.4 6z" fill="#ffeac6" stroke="#1b1418" strokeWidth="1" />
      <path d="M8.6 17.4h6.8v2.2H8.6zM11.4 19.6h1.2V23h-1.2z" fill="#d4707a" stroke="#1b1418" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-drop" l={30} t={4} w={40} h={72} d={40} st={{ rotate: "180deg" }}>{blade}</V>
        <V c="g10-tb-steam" l={50} t={10} w={26} h={34} d={280}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffeac6" strokeWidth="1.8" {...SJ} /></V>
        <L c="g10-tb-drip" l={46} t={56} w={7} h={11} d={470} st={{ borderRadius: "50%", background: "#d4707a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={32} t={4} w={36} h={64} d={0} st={{ rotate: "180deg" }}>{blade}</V>
        <L c="g10-hit2" l={46} t={62} w={8} h={12} d={150} st={{ borderRadius: "50%", background: "#d4707a" }} />
        <L c="g10-hit" l={34} t={20} w={32} h={26} d={260} st={{ background: "radial-gradient(circle, rgba(255,234,198,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(212,112,122,0.26)" /><Rim tone="rgba(27,20,24,0.44)" d={560} /></>}>
      <V c="g10-tb-blade" l={45} t={34} w={10} h={20} d={80} st={{ rotate: "180deg" }}>{blade}</V>
      <V c="g10-tb-steam" l={52} t={34} w={7} h={10} d={220}><path d="M12 22c-3-3.6 3-5.6 0-9" fill="none" stroke="#ffeac6" strokeWidth="2" {...SJ} /></V>
      <L c="g10-tb-cut" l={50} t={38} w={10} h={1.4} d={400} st={{ borderRadius: "999px", background: "#ffeac6" }} />
      <L c="g10-tb-drip" l={48.8} t={49} w={2.4} h={3.4} d={520} st={{ borderRadius: "50%", background: "#d4707a" }} />
      <L c="g10-leanshadow" l={44} t={57} w={14} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(27,20,24,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={45 + i * 4} t={45} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffeac6" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Undertow (t5) — THE WET TRAIL GOES WHITE ---------------------------
   A wave line draws back toward the caster's own edge; the wet strip it leaves
   steams for a moment, then the steam stops and the whole trail goes white
   from the far end in. Palette: #9fc9d8 / #ffeec9 / #16232b. */
function UndertowScene({ role, delayMs }: SceneProps) {
  const wave = <path d="M1 14c3.4-4 7-4 10.4 0 3.4 4 8.2 4 11.6-1" fill="none" stroke="#9fc9d8" strokeWidth="2" {...SJ} />;
  const slush = <path d="M2 18c4-2.6 7.4-2.6 10 0 2.6 2.6 7 2 11-1.6" fill="none" stroke="#ffeec9" strokeWidth="1.6" strokeDasharray="2.4 1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ut-pull" l={4} t={26} w={92} h={40} d={40}>{wave}</V>
        <V c="g10-ut-white" l={6} t={48} w={88} h={36} d={280}>{slush}</V>
        <L c="g10-ent-mote" l={44} t={18} w={4} h={12} d={470} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #ffeec9, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={6} t={28} w={88} h={38} d={0}>{wave}</V>
        <V c="g10-hit" l={8} t={50} w={84} h={32} d={150}>{slush}</V>
        <L c="g10-hit2" l={44} t={14} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#ffeec9" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,201,216,0.26)" />}>
      <V c="g10-ut-pull" l={36} t={41} w={28} h={12} d={80}>{wave}</V>
      <L c="g10-ut-wet" l={38} t={47} w={24} h={4} d={220} st={{ borderRadius: "999px", background: "linear-gradient(90deg, rgba(159,201,216,0.85), transparent)" }} />
      <L c="g10-ut-steam" l={44} t={41} w={2.4} h={7} d={340} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #ffeec9, transparent)" }} />
      <L c="g10-ut-steam" l={52} t={42} w={2.4} h={6} d={430} st={{ borderRadius: "999px", background: "linear-gradient(180deg, #ffeec9, transparent)" }} />
      <V c="g10-ut-white" l={37} t={46} w={26} h={10} d={600}>{slush}</V>
      <L c="g10-drawdown" l={43} t={38} w={14} h={10} d={720} st={{ background: "linear-gradient(180deg, rgba(255,238,201,0.42), transparent)" }} />
    </Lead>
  );
}

/* --- 28. Ghost Ship (t5) — THE COLD LANTERN AT THE MAST ---------------------
   Aim-staged down the file: the hull carries no smoke off its galley, only a
   fog that falls instead of rising, one blue-white lantern at the mast, and a
   wake that sets solid behind the rudder. Palette: #a8c4d0 / #ffeec8 /
   #131c26. */
function GhostShipScene({ role, delayMs }: SceneProps) {
  const hull = (
    <g {...SJ}>
      <path d="M1.6 15h20.8l-3 5.4H4.6z" fill="rgba(19,28,38,0.88)" stroke="#a8c4d0" strokeWidth="1.2" />
      <path d="M12 15V3" stroke="#a8c4d0" strokeWidth="1.3" />
      <path d="M12.8 4.4h7l-2.4 3.4 2.4 3.4h-7z" fill="#a8c4d0" stroke="#131c26" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-gs-sail" l={8} t={16} w={80} h={66} d={40}>{hull}</V>
        <L c="g10-gs-lamp" l={44} t={16} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffeec8, transparent 70%)" }} />
        <L c="g10-gs-fog" l={10} t={64} w={76} h={16} d={470} st={{ background: "linear-gradient(180deg, rgba(168,196,208,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={12} t={18} w={76} h={62} d={0}>{hull}</V>
        <L c="g10-hit2" l={44} t={18} w={12} h={12} d={150} st={{ borderRadius: "50%", background: "#ffeec8" }} />
        <L c="g10-hit" l={16} t={66} w={68} h={5} d={260} st={{ borderRadius: "999px", background: "#a8c4d0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(19,28,38,0.32)" /><Rim tone="rgba(168,196,208,0.3)" d={600} /></>}>
      <L c="g10-runout" l={44} t={49} w={28} h={2} d={70} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #a8c4d0, rgba(168,196,208,0))", transformOrigin: "0% 50%" }} />
      <V c="g10-gs-sail" l={41} t={38} w={18} h={18} d={200}>{hull}</V>
      <L c="g10-gs-lamp" l={48.6} t={39.6} w={3.4} h={3.4} d={380} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffeec8, transparent 70%)" }} />
      <L c="g10-gs-fog" l={40} t={50} w={20} h={6} d={500} st={{ background: "linear-gradient(180deg, rgba(168,196,208,0.72), transparent)" }} />
      <L c="g10-gs-wake" l={38} t={52} w={16} h={1.8} d={660} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #ffeec8)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-grit" l={41 + i * 5} t={49} w={1.5} h={1.5} d={740 + i * 100} st={{ borderRadius: "50%", background: "#ffeec8" }} />
      ))}
    </AimLead>
  );
}

/* --- 29. Winter Palace (t5) — THE LIGHT WITHDRAWS UP THE STAIRS -------------
   The warm rectangle lying across the two lowest flights of the palace stair
   shortens and climbs away toward the caster's own end, and the treads it
   leaves behind take frost. Palette: #e8c081 / #fff1d1 / #1a2230.

   AIM. The ward seizes whatever ENDS ITS MOVE on the back ranks, so the play
   is a reach, not a bloom: a rime-run leaves the cast square and runs out to
   the victim by --fx-len inside <Reach>, which carries the --fx-ang rotation
   alone. The stair itself stays in the upright <Lead> stage — a staircase
   rotated onto the attack vector would lie on its side — and the wash and rim
   stay inside <BoardFrame>, so they remain exactly the board at any anchor. */
const OW_TREADS = [0, 1, 2, 3];

function WinterPalaceOvScene({ role, delayMs }: SceneProps) {
  const stair = (
    <g fill="none" stroke="#e8c081" strokeWidth="1.3" {...SJ}>
      <path d="M2 21h5v-4h5v-4h5V9h5" />
      <path d="M7 21v-4M12 17v-4M17 13V9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g10-ent-rise" l={10} t={16} w={80} h={68} d={40}>{stair}</V>
        <L c="g10-ow-light" l={14} t={54} w={54} h={16} d={280} st={{ background: "linear-gradient(90deg, rgba(232,192,129,0.85), transparent)", transformOrigin: "100% 50%" }} />
        <L c="g10-ow-rime" l={12} t={70} w={70} h={5} d={470} st={{ borderRadius: "999px", background: "#fff1d1" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g10-hitside" l={12} t={18} w={76} h={64} d={0}>{stair}</V>
        <L c="g10-hit2" l={16} t={56} w={50} h={12} d={150} st={{ background: "linear-gradient(90deg, rgba(232,192,129,0.8), transparent)" }} />
        <L c="g10-hit" l={14} t={72} w={64} h={5} d={260} st={{ borderRadius: "999px", background: "#fff1d1" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,192,129,0.26)" /><Rim tone="rgba(26,34,48,0.42)" d={620} /></>}>
      <Reach>
        <L c="g10-runout" l={50} t={49.3} w={26} h={1.4} d={60} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff1d1, rgba(255,241,209,0))", transformOrigin: "0% 50%" }} />
      </Reach>
      <V c="g10-ow-stair" l={38} t={40} w={24} h={18} d={80}>{stair}</V>
      <L c="g10-ow-light" l={39} t={46} w={20} h={8} d={230} st={{ background: "linear-gradient(90deg, rgba(232,192,129,0.85), transparent)", transformOrigin: "100% 50%" }} />
      <L c="g10-drawdown" l={42} t={40} w={16} h={12} d={400} st={{ background: "linear-gradient(180deg, rgba(255,241,209,0.5), transparent)" }} />
      {OW_TREADS.map((i) => (
        <L key={i} c="g10-ow-rime" l={40 + i * 4.6} t={54 - i * 2.4} w={4.4} h={1.6} d={520 + i * 110} st={{ borderRadius: "999px", background: "#fff1d1" }} />
      ))}
      <V c="g10-ow-guard" l={53} t={43} w={7} h={10} d={760}><path d={QUEEN} fill="none" stroke="#e8c081" strokeWidth="1.4" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g10-glint" l={42 + i * 6} t={48 - i * 2} w={2} h={2} d={800 + i * 90} st={{ borderRadius: "50%", background: "#fff1d1" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Two-space indent at depth 1 is a parsing contract of
   scripts/audit-animations.ts and scripts/check-sig-plugins.cjs.
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   Every lead now lands one physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: the melt bursts WET: a warm shaft breaks through, the ice shell sloughs off in halves, and the release lands as a spreading ring of meltwater.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g10ThawPlays.css.
   ========================================================================== */

interface G10Imp {
  /** impact beat, ms after the lead's own delayMs */
  at: number;
  /** the card's core color as an "r g b" triple (drives --imp-rgb) */
  rgb: string;
  laser?: boolean;
  shock?: boolean;
  /** which of the module's shatter glyphs is split in half */
  g?: number;
  /** stage jolt on the beat: "s" soft, "h" hard */
  q?: "s" | "h";
  /** impact centre on the 14-cell stage, in percent (cast square = 50/50) */
  x?: number;
  y?: number;
  /** composite box size, in stage percent (9 is ~1.26 cells) */
  s?: number;
}

const IMP_TINT = "rgb(var(--imp-rgb, 216 181 110) / 0.95)";
const IMP_EDGE = "rgba(247, 241, 227, 0.9)";

/** The module's shatter victims: a cracked ice shell, a fat meltdrop, a slumping floe. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M4.8 18.6a7.6 7.6 0 0 1 14.4 0z" fill={IMP_TINT} /><path d="M12 11.6l-1.6 3 2.4 1.6-1 2.4" stroke={IMP_EDGE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M12 3.4c3.6 4.8 5.8 8.2 5.8 11.2a5.8 5.8 0 0 1-11.6 0c0-3 2.2-6.4 5.8-11.2z" fill={IMP_TINT} /><circle cx="9.8" cy="14.4" r="1.4" fill={IMP_EDGE} />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M4.4 12.8l4-4.4h7.2l4 4.4-1.2 5.8H5.6z" fill={IMP_TINT} /><path d="M8.6 8.8l1.6 4-1 5.4M15 9l-1 4.2" stroke={IMP_EDGE} strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </svg>,
];

const IMPACT: Record<string, G10Imp> = {
  bn4_winter_orders: { at: 420, rgb: "226 144 90", shock: true, g: 0, q: "s" },
  bn4_winter_palace: { at: 520, rgb: "159 208 232", laser: true, shock: true, q: "s" },
  hx4_avalanche_pass: { at: 540, rgb: "207 226 238", shock: true, g: 1, q: "s" },
  hx4_beartrap_cache: { at: 630, rgb: "217 154 78", laser: true, g: 0, q: "s" },
  hx4_black_lotus: { at: 720, rgb: "240 180 106", shock: true, g: 2, q: "s" },
  hx4_gale_warning: { at: 465, rgb: "255 201 120", laser: true, shock: true, g: 1, q: "h" },
  hx4_glacier_gate: { at: 500, rgb: "183 220 237", shock: true, g: 0, q: "s" },
  hx4_grave_chill: { at: 480, rgb: "200 230 234", laser: true, shock: true, q: "s" },
  hx4_hundred_year_nap: { at: 660, rgb: "232 181 110", shock: true, g: 1, q: "s" },
  hx4_iron_maiden: { at: 675, rgb: "255 143 90", laser: true, g: 0, q: "s" },
  hx4_narcolepsy: { at: 450, rgb: "168 220 224", shock: true, g: 2, q: "s" },
  hx4_pillory: { at: 440, rgb: "216 192 122", laser: true, shock: true, g: 1, q: "h" },
  hx4_silken_net: { at: 590, rgb: "207 224 216", shock: true, g: 0, q: "s" },
  hx4_thunderhead: { at: 565, rgb: "188 212 240", laser: true, shock: true, q: "s" },
  ov_frost_wyrm: { at: 720, rgb: "143 212 234", shock: true, g: 1, q: "s" },
  bn4_flash_frost: { at: 510, rgb: "184 226 240", laser: true, g: 0, q: "s" },
  bn4_grandmas_cookies: { at: 470, rgb: "229 163 92", shock: true, g: 2, q: "s" },
  bn4_prison_break: { at: 530, rgb: "255 154 92", laser: true, shock: true, g: 1, q: "h" },
  hx4_ashen_bread: { at: 610, rgb: "200 180 142", shock: true, g: 0, q: "s" },
  hx4_clay_hooves: { at: 640, rgb: "208 138 86", laser: true, shock: true, q: "s" },
  hx4_cold_reception: { at: 555, rgb: "242 197 131", shock: true, g: 1, q: "s" },
  hx4_frost_heave: { at: 600, rgb: "182 207 214", laser: true, g: 0, q: "s" },
  hx4_grasping_ivy: { at: 525, rgb: "159 196 138", shock: true, g: 2, q: "s" },
  hx4_haunted_gallery: { at: 620, rgb: "223 228 216", laser: true, shock: true, g: 1, q: "h" },
  hx4_silk_cocoon: { at: 705, rgb: "226 201 160", shock: true, g: 0, q: "s" },
  hx4_tithe_of_blood: { at: 645, rgb: "212 112 122", laser: true, shock: true, q: "s" },
  hx4_undertow: { at: 515, rgb: "159 201 216", shock: true, g: 1, q: "s" },
  ov_ghost_ship: { at: 490, rgb: "168 196 208", laser: true, g: 0, q: "s" },
  ov_winter_palace: { at: 610, rgb: "232 192 129", shock: true, g: 2, q: "s" },
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G10Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g10-imprig absolute block"
        style={{
          left: `${(imp.x ?? 50) - s / 2}%`,
          top: `${(imp.y ?? 50) - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
          ...impactVars(imp.rgb, (delayMs + imp.at) / 1000),
        }}
      >
        {imp.laser ? <LaserStrike /> : null}
        {imp.g != null ? <PieceShatter glyph={IMP_GLYPHS[imp.g]} /> : null}
        {imp.shock ? <Shockwave /> : null}
      </span>
    </BoardWideStage>
  );
}

/** Leads render inside a quake wrapper (the whole stage jolts on the impact
 *  beat) with the rig mounted beside them; target/entrance cuts pass through
 *  untouched. */
function withImpact(Base: SigPlugin["Render"], imp: G10Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g10-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
            style={impactVars(imp.rgb, (props.delayMs + imp.at) / 1000)}
          >
            {scene}
          </span>
        ) : (
          scene
        )}
        <ImpactRig imp={imp} delayMs={props.delayMs} />
      </>
    );
  }
  return ImpactLead;
}

export const PLAYS: Record<string, SigPlugin> = {
  bn4_winter_orders: {
    config: { ordering: "radial", staggerMs: 90, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast" },
    Render: WinterOrdersScene,
  },
  bn4_winter_palace: {
    config: { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", source: "shield", anchor: "cast" },
    Render: WinterPalaceBnScene,
  },
  hx4_avalanche_pass: {
    config: { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "massfreeze", anchor: "cast" },
    Render: AvalanchePassScene,
  },
  hx4_beartrap_cache: {
    config: { ordering: "file", staggerMs: 110, victims: "all", hasLead: true, sound: "snooze", anchor: "board" },
    Render: BeartrapCacheScene,
  },
  hx4_black_lotus: {
    config: { ordering: "radial", staggerMs: 80, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board" },
    Render: BlackLotusScene,
  },
  hx4_gale_warning: {
    config: { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", source: "slow", anchor: "cast" },
    Render: GaleWarningScene,
  },
  hx4_glacier_gate: {
    config: { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "massfreeze", anchor: "cast" },
    Render: GlacierGateScene,
  },
  hx4_grave_chill: {
    config: { ordering: "radial", staggerMs: 55, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "petrify", source: "frozen", anchor: "board" },
    Render: GraveChillScene,
  },
  hx4_hundred_year_nap: {
    config: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "snooze", source: "frozen", anchor: "cast" },
    Render: HundredYearNapScene,
  },
  hx4_iron_maiden: {
    config: { ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "petrify", anchor: "cast" },
    Render: IronMaidenScene,
  },
  hx4_narcolepsy: {
    config: { ordering: "radial", staggerMs: 120, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "snooze", source: "frozen", anchor: "board" },
    Render: NarcolepsyScene,
  },
  hx4_pillory: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast" },
    Render: PilloryScene,
  },
  hx4_silken_net: {
    config: { ordering: "radial", staggerMs: 60, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board" },
    Render: SilkenNetScene,
  },
  hx4_thunderhead: {
    config: { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", source: "slow", anchor: "board" },
    Render: ThunderheadScene,
  },
  ov_frost_wyrm: {
    config: { ordering: "sweep", staggerMs: 80, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board" },
    Render: FrostWyrmScene,
  },
  bn4_flash_frost: {
    config: { ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "aim" },
    Render: FlashFrostScene,
  },
  bn4_grandmas_cookies: {
    config: { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "snooze", source: "shield", anchor: "board" },
    Render: GrandmasCookiesScene,
  },
  bn4_prison_break: {
    config: { ordering: "radial", staggerMs: 80, victims: "all", hasLead: true, sound: "wall", anchor: "board" },
    Render: PrisonBreakScene,
  },
  hx4_ashen_bread: {
    config: { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "petrify", anchor: "cast" },
    Render: AshenBreadScene,
  },
  hx4_clay_hooves: {
    config: { ordering: "radial", staggerMs: 90, victims: ["n"], hasLead: true, sound: "petrify", source: "frozen", anchor: "board" },
    Render: ClayHoovesScene,
  },
  hx4_cold_reception: {
    config: { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", source: "slow", anchor: "board" },
    Render: ColdReceptionScene,
  },
  hx4_frost_heave: {
    config: { ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board" },
    Render: FrostHeaveScene,
  },
  hx4_grasping_ivy: {
    config: { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", source: "slow", anchor: "cast" },
    Render: GraspingIvyScene,
  },
  hx4_haunted_gallery: {
    config: { ordering: "line", staggerMs: 85, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "snooze", source: "frozen", anchor: "board" },
    Render: HauntedGalleryScene,
  },
  hx4_silk_cocoon: {
    config: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "snooze", source: "frozen", anchor: "cast" },
    Render: SilkCocoonScene,
  },
  hx4_tithe_of_blood: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board" },
    Render: TitheOfBloodScene,
  },
  hx4_undertow: {
    config: { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "massfreeze", anchor: "cast" },
    Render: UndertowScene,
  },
  ov_ghost_ship: {
    config: { ordering: "line", staggerMs: 90, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "wall", anchor: "aim" },
    Render: GhostShipScene,
  },
  // The ice seizes named enemy pieces the moment they end a move in the back
  // ranks, so the play reaches for them: see WinterPalaceOvScene's <Reach>.
  ov_winter_palace: {
    config: { ordering: "sweep", staggerMs: 75, victims: "all", hasLead: true, sound: "massfreeze", anchor: "aim" },
    Render: WinterPalaceOvScene,
  },
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
