// Bespoke plugin signatures for the eight implemented "stub" cards
// (the rewind / undo / nerf-meta family). Self-contained in the sigPlugins.tsx
// mould: own inline SVG art + own stubPlays.css, transform/opacity only,
// animations-off safe (a local html[data-anim="off"] guard flattens the motion,
// and the caller's animations-off layer gates it too). No imports from
// BoardEffects.tsx (cycle hazard); only the SigPlugin TYPE is imported.
//
// NOTE: this module IS registered: sigPluginsMerged.tsx spreads its PLAYS into
// the merged registry, and its keys are mirrored in PLUGIN_IDS in
// sigPlugins.tsx (drift-guarded by scripts/check-sig-plugins.cjs).
//
// Each card plays its own mini-scene built from the card's fiction, following
// the design brief's three-beat structure (tell -> strike -> settle). All
// durations ride --fx-dur; the caller's stagger (delayMs) rides the --sp-d CSS
// var so per-beat offsets stay in stubPlays.css. Class prefix `sp-`.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import "./stubPlays.css";
import { LaserStrike, PieceShatter, Shockwave, impactVars } from "./impact/impact";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** Root style: the caller's stagger delay rides a CSS var so every keyframe
 * offset can stay in the stylesheet (`calc(var(--sp-d) + beat)`). */
const rootStyle = (delayMs: number): CSSProperties =>
  ({ "--sp-d": `${delayMs}ms` }) as CSSProperties;

/** Inline animation-delay for indexed elements: stagger + a --fx-dur-scaled beat. */
const beat = (s: number): string => `calc(var(--sp-d, 0ms) + ${s}s * var(--fx-dur, 1))`;

const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** Shared pawn silhouette (0 0 24 24), the "piece" actor in several scenes. */
const PAWN =
  "M12 3.2a2.9 2.9 0 0 1 2.9 2.9c0 1.2-.6 2.2-1.5 2.8l1.9 7.2H8.7l1.9-7.2c-.9-.6-1.5-1.6-1.5-2.8A2.9 2.9 0 0 1 12 3.2zM7.2 17.6h9.6V20H7.2z";

/* =============================================================================
   The shared beats. Every scene in this module is composed inside ONE cell
   (`inset: 0`), so it carries no board-scale layer at all and nothing has to
   move into a BoardFrame when a card stops being board-centred. Six of the
   eight land on one piece and declare anchor "cast"; the two nerf-relief cards
   suspend a rule for your whole army, which has no square, so they stay
   "board" and Board re-centres them.

   The tell is a fast inhaling ring that lands before the strike; the settle is
   a decaying mote that drifts toward the CASTER'S own edge rather than "down",
   which is what makes the beat directional: --fx-side is +1 when the caster
   sits at the bottom of the screen and -1 when it sits at the top, so the tail
   falls back the way the play came from for both players. (The drift itself
   lives in @keyframes sp-settle-kf.)
   ========================================================================== */

/** The anticipation beat: a ring inhales onto the square before the strike. */
function Tell({ at, tone }: { at: string; tone: string }) {
  return (
    <span
      className="sp-tell absolute block"
      style={{
        left: "50%",
        top: "50%",
        width: "78%",
        height: "78%",
        borderRadius: "9999px",
        border: `2px solid ${tone}`,
        animationDelay: at,
      }}
    />
  );
}

/** The settle beat: a soft mote decaying away toward the caster's own edge. */
function Settle({ at, tone }: { at: string; tone: string }) {
  return (
    <span
      className="sp-settle absolute block"
      style={{
        left: "50%",
        top: "54%",
        width: "34%",
        height: "34%",
        borderRadius: "9999px",
        background: `radial-gradient(circle, ${tone} 0%, transparent 70%)`,
        animationDelay: at,
      }}
    />
  );
}

/** The entrance cut: the card arriving in a hand. Same palette and same
 * central object as the play, at ~56% of the crop, no board takeover: a ring
 * opens, the mark rises in from the caster's side, one mote settles off it. */
function Entrance({
  delayMs,
  tone,
  glow,
  children,
}: {
  delayMs: number;
  tone: string;
  glow: string;
  children: ReactNode;
}) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      <span
        className="sp-ent-ring absolute block"
        style={{
          left: "50%",
          top: "50%",
          width: "56%",
          height: "56%",
          borderRadius: "9999px",
          border: `2px solid ${glow}`,
          animationDelay: beat(0.04),
        }}
      />
      <svg
        viewBox="0 0 24 24"
        className="sp-ent absolute block"
        style={{ left: "50%", top: "50%", width: "56%", height: "56%", animationDelay: beat(0.16) }}
      >
        {children}
      </svg>
      <Settle at={beat(0.62)} tone={tone} />
    </span>
  );
}

/* =============================================================================
   Free Retreat — the piece moon-walks back: an undo-swirl arrow wraps it, a
   translucent ghost slides back along a short trail, and a clock hand
   counter-rotates one tick. Palette: #7fd4c2 / #d9fff5 / #123a33.
   ========================================================================== */
function FreeRetreat({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#7fd4c2" glow="#d9fff5">
        <g fill="none" stroke="#7fd4c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12a7 7 0 1 1-3.3-5.95" />
          <path d="M16.6 2.9l-.9 3.2 3.2.9" />
        </g>
        <path d={PAWN} fill="#d9fff5" opacity="0.7" transform="translate(6 6) scale(0.5)" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.07)} tone="#7fd4c2" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #d9fff5 0%, transparent 66%)" }}
        />
      )}
      {/* tell: one counter-clockwise clock tick */}
      <svg
        viewBox="0 0 24 24"
        className="sp-fr-tick absolute block"
        style={{ left: "50%", top: "50%", width: "84%", height: "84%" }}
      >
        <line x1="12" y1="12" x2="12" y2="5.6" stroke="#123a33" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.1" fill="#123a33" />
      </svg>
      {/* strike: the undo-swirl arrow wraps the square counter-clockwise */}
      <svg
        viewBox="0 0 24 24"
        className="sp-fr-swirl absolute block"
        style={{ left: "50%", top: "50%", width: "90%", height: "90%" }}
      >
        <g fill="none" stroke="#7fd4c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12a7 7 0 1 1-3.3-5.95" />
          <path d="M16.6 2.9l-.9 3.2 3.2.9" />
        </g>
      </svg>
      {/* settle: trail dashes the ghost leaves behind as it slides back */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sp-fr-dash absolute block"
          style={{
            left: `${52 + i * 12}%`,
            top: "60%",
            width: "9%",
            height: "3.4%",
            borderRadius: "9999px",
            background: "#7fd4c2",
            animationDelay: beat(0.34 + i * 0.09),
          }}
        />
      ))}
      <svg
        viewBox="0 0 24 24"
        className="sp-fr-ghost absolute block"
        style={{ left: "50%", top: "48%", width: "46%", height: "46%", filter: "drop-shadow(0 0 3px #d9fff5)" }}
      >
        <path d={PAWN} fill="#d9fff5" opacity="0.75" />
      </svg>
      <Settle at={beat(0.82)} tone="#7fd4c2" />
    </span>
  );
}

/* =============================================================================
   Rewind One — VHS rewind: two scanline bars sweep down the square, both
   ghosts chop backwards in steps, and a chunky "rewind" glyph blinks twice.
   Palette: #8fb4ff / #e6efff / #14243f.
   ========================================================================== */
function RewindOne({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#8fb4ff" glow="#e6efff">
        <path
          d="M11 5l-8 7 8 7zM21 5l-8 7 8 7z"
          fill="#8fb4ff"
          stroke="#14243f"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      </Entrance>
    );
  }
  return (
    <span className={`${ROOT} sp-clip`} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.06)} tone="#8fb4ff" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #e6efff 0%, transparent 66%)" }}
        />
      )}
      {/* tell + texture: two tracking-noise scanline bars sweep top -> bottom */}
      <span
        className="sp-rw-scan absolute block"
        style={{
          left: 0,
          right: 0,
          top: "-12%",
          height: "10%",
          background: "linear-gradient(180deg, transparent, #8fb4ff, transparent)",
        }}
      />
      <span
        className="sp-rw-scan sp-rw-scan2 absolute block"
        style={{
          left: 0,
          right: 0,
          top: "-12%",
          height: "6%",
          background: "linear-gradient(180deg, transparent, #e6efff, transparent)",
        }}
      />
      {/* strike: the piece and its after-image chop backwards, taped in reverse */}
      <svg
        viewBox="0 0 24 24"
        className="sp-rw-ghost2 absolute block"
        style={{ left: "50%", top: "44%", width: "42%", height: "42%" }}
      >
        <path d={PAWN} fill="none" stroke="#e6efff" strokeWidth="1.3" strokeDasharray="2 1.6" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="sp-rw-ghost1 absolute block"
        style={{ left: "50%", top: "44%", width: "42%", height: "42%" }}
      >
        <path d={PAWN} fill="#8fb4ff" opacity="0.85" />
      </svg>
      {/* settle: chunky VHS rewind glyph blinks twice, then holds and cuts */}
      <svg
        viewBox="0 0 24 24"
        className="sp-rw-rr absolute block"
        style={{ left: "50%", top: "74%", width: "44%", height: "26%", filter: "drop-shadow(0 0 3px #8fb4ff)" }}
      >
        <path d="M11 5l-8 7 8 7zM21 5l-8 7 8 7z" fill="#8fb4ff" stroke="#14243f" strokeWidth="0.9" strokeLinejoin="round" />
      </svg>
      <Settle at={beat(0.86)} tone="#8fb4ff" />
    </span>
  );
}

/* =============================================================================
   Shadow Step — the square dips dark, a silhouette splits off the piece,
   holds a beat, re-merges, and a smoke wisp curls up from the join.
   Palette: #9aa6c9 / #e2e7f5 / #161a2b.
   ========================================================================== */
function ShadowStep({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#9aa6c9" glow="#e2e7f5">
        <path d={PAWN} fill="#161a2b" transform="translate(2.4 1.4)" opacity="0.85" />
        <path d={PAWN} fill="none" stroke="#9aa6c9" strokeWidth="1.8" strokeLinejoin="round" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      {/* tell: the square dips dark, and a ring inhales onto it */}
      <span className="sp-ss-dim absolute inset-0 block" style={{ background: "#161a2b" }} />
      <Tell at={beat(0.05)} tone="#9aa6c9" />
      {/* the piece itself, holding its ground with a small dip as the shadow leaves */}
      <svg
        viewBox="0 0 24 24"
        className="sp-ss-piece absolute block"
        style={{ left: "56%", top: "48%", width: "48%", height: "48%", filter: "drop-shadow(0 0 3px #e2e7f5)" }}
      >
        <path d={PAWN} fill="none" stroke="#9aa6c9" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {/* strike: the silhouette splits out, hangs one beat, re-merges */}
      <svg
        viewBox="0 0 24 24"
        className="sp-ss-shade absolute block"
        style={{ left: "56%", top: "48%", width: "48%", height: "48%" }}
      >
        <path d={PAWN} fill="#161a2b" opacity="0.88" />
      </svg>
      {/* settle: a smoke wisp curls up from the merge point */}
      <svg
        viewBox="0 0 24 24"
        className="sp-ss-wisp absolute block"
        style={{ left: "48%", top: "38%", width: "30%", height: "30%" }}
      >
        <path
          d="M12 20c-3-2 2-4-1-7s2-4 0-7"
          fill="none"
          stroke={lead ? "#e2e7f5" : "#9aa6c9"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <Settle at={beat(0.94)} tone="#9aa6c9" />
    </span>
  );
}

/* =============================================================================
   Pin Breaker — the pinning beam goes taut, SNAPS in the middle, the two
   halves whip away, and the freed knight rears. Palette: #ffb14a / #fff0d6 /
   #3a230a.
   ========================================================================== */
function PinBreaker({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#ffb14a" glow="#fff0d6">
        <path
          d="M8 17v-4c0-4 3-6 5-6l-1-2 3 1c2 1 3 3 3 6v5z"
          fill="#ffb14a"
          stroke="#3a230a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M2 12h5M17 12h5" stroke="#fff0d6" strokeWidth="1.6" strokeLinecap="round" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.05)} tone="#ffb14a" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #fff0d6 0%, transparent 66%)" }}
        />
      )}
      {/* tell: the taut beam quivers... then each half whips away */}
      <span
        className="sp-pb-beam-l absolute block"
        style={{
          left: "2%",
          top: "48%",
          width: "46%",
          height: "3.6%",
          borderRadius: "9999px",
          background: "linear-gradient(90deg, transparent, #ffb14a 40%, #fff0d6)",
        }}
      />
      <span
        className="sp-pb-beam-r absolute block"
        style={{
          right: "2%",
          top: "48%",
          width: "46%",
          height: "3.6%",
          borderRadius: "9999px",
          background: "linear-gradient(270deg, transparent, #ffb14a 40%, #fff0d6)",
        }}
      />
      {/* strike: snap flash at the break point */}
      <svg
        viewBox="0 0 24 24"
        className="sp-pb-flash absolute block"
        style={{ left: "50%", top: "49%", width: "34%", height: "34%" }}
      >
        <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#fff0d6" stroke="#ffb14a" strokeWidth="0.8" />
      </svg>
      {/* settle: the freed knight rears up and shakes it off */}
      <svg
        viewBox="0 0 24 24"
        className="sp-pb-knight absolute block"
        style={{ left: "50%", top: "46%", width: "48%", height: "48%", filter: "drop-shadow(0 0 3px #fff0d6)" }}
      >
        <path
          d="M8 17v-4c0-4 3-6 5-6l-1-2 3 1c2 1 3 3 3 6v5z"
          fill="#ffb14a"
          stroke="#3a230a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <Settle at={beat(0.98)} tone="#ffb14a" />
    </span>
  );
}

/* =============================================================================
   Decoy — a dashed hollow king inflates like a balloon, wobbles as it
   over-fills, then winks (one eye blinks, a glint pops by the crown).
   Palette: #5fc9b0 / #e8fff7 / #0f322b.
   ========================================================================== */
function Decoy({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#5fc9b0" glow="#e8fff7">
        <g fill="none" stroke="#5fc9b0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M7 15.5L6 9l2.6 2.2L12 6.6l3.4 4.6L18 9l-1 6.5c-1.7 1-2.7 2.4-2.7 4H9.7c0-1.6-1-3-2.7-4z"
            strokeDasharray="2.6 2"
          />
          <path d="M12 3.2v2.2M10.9 4.3h2.2" />
        </g>
        <ellipse cx="10.3" cy="13.2" rx="0.85" ry="1" fill="#0f322b" />
        <ellipse cx="13.7" cy="13.2" rx="0.85" ry="1" fill="#0f322b" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.05)} tone="#5fc9b0" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #e8fff7 0%, transparent 66%)" }}
        />
      )}
      {/* tell -> strike: the hollow stand-in king inflates and wobbles */}
      <svg
        viewBox="0 0 24 24"
        className="sp-dc-king absolute block"
        style={{ left: "50%", top: "50%", width: "72%", height: "72%", filter: "drop-shadow(0 0 3px #e8fff7)" }}
      >
        <g fill="none" stroke="#5fc9b0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M7 15.5L6 9l2.6 2.2L12 6.6l3.4 4.6L18 9l-1 6.5c-1.7 1-2.7 2.4-2.7 4H9.7c0-1.6-1-3-2.7-4z"
            strokeDasharray="2.6 2"
          />
          <path d="M12 3.2v2.2M10.9 4.3h2.2" />
        </g>
        <ellipse cx="10.3" cy="13.2" rx="0.85" ry="1" fill="#0f322b" />
        <ellipse className="sp-dc-eye" cx="13.7" cy="13.2" rx="0.85" ry="1" fill="#0f322b" />
      </svg>
      {/* settle: one glint pops beside the crown on the wink */}
      <svg
        viewBox="0 0 24 24"
        className="sp-dc-glint absolute block"
        style={{ left: "72%", top: "26%", width: "20%", height: "20%" }}
      >
        <path d="M12 3l1.6 7.4L21 12l-7.4 1.6L12 21l-1.6-7.4L3 12l7.4-1.6z" fill="#e8fff7" />
      </svg>
      <Settle at={beat(1.16)} tone="#5fc9b0" />
    </span>
  );
}

/* =============================================================================
   Loosen the Leash — a collar chain stretches taut, one link glows white-hot
   and POPS open, and the loose links scatter along little arcs.
   Palette: #ffd76a / #fff4c9 / #3a2e0a.
   ========================================================================== */
const LEASH_SCATTER: Array<{ sx: string; sy: string; sr: string }> = [
  { sx: "-260%", sy: "110%", sr: "-160deg" },
  { sx: "-150%", sy: "150%", sr: "-90deg" },
  { sx: "0%", sy: "0%", sr: "0deg" }, // middle link pops instead of scattering
  { sx: "150%", sy: "150%", sr: "90deg" },
  { sx: "260%", sy: "110%", sr: "160deg" },
];

function LoosenTheLeash({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#ffd76a" glow="#fff4c9">
        <g fill="none" stroke="#ffd76a" strokeWidth="1.8" strokeLinecap="round">
          <ellipse cx="6.5" cy="12" rx="3.6" ry="2.6" />
          <ellipse cx="17.5" cy="12" rx="3.6" ry="2.6" />
        </g>
        <ellipse cx="12" cy="12" rx="3.6" ry="2.6" fill="none" stroke="#fff4c9" strokeWidth="1.8" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.05)} tone="#ffd76a" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #fff4c9 0%, transparent 66%)" }}
        />
      )}
      {/* the chain: five links; the container stretches taut (the tell) */}
      <span className="sp-ll-chain absolute inset-0 block">
        {LEASH_SCATTER.map((v, i) =>
          i === 2 ? (
            <span
              key={i}
              className="sp-ll-pop absolute block"
              style={{
                left: "44%",
                top: "45.5%",
                width: "12%",
                height: "9%",
                borderRadius: "9999px",
                border: "2px solid #fff4c9",
                boxShadow: "0 0 6px #ffd76a",
              }}
            />
          ) : (
            <span
              key={i}
              className="sp-ll-link absolute block"
              style={
                {
                  left: `${20 + i * 12}%`,
                  top: "45.5%",
                  width: "12%",
                  height: "9%",
                  borderRadius: "9999px",
                  border: "2px solid #ffd76a",
                  "--sx": v.sx,
                  "--sy": v.sy,
                  "--sr": v.sr,
                } as CSSProperties
              }
            />
          ),
        )}
      </span>
      {/* strike: the glow building on the middle link before the POP */}
      <span
        className="sp-ll-glow absolute block"
        style={{
          left: "44%",
          top: "45.5%",
          width: "12%",
          height: "9%",
          borderRadius: "9999px",
          background: "#fff4c9",
          boxShadow: "0 0 8px #ffd76a",
        }}
      />
      <Settle at={beat(0.9)} tone="#ffd76a" />
    </span>
  );
}

/* =============================================================================
   Piece Parole — the jail bars rise up out of frame, a PAROLE seal thunks
   down rubber-stamp style, and an ink ring blots outward.
   Palette: #7fe0a0 / #e6ffef / #0f331d.
   ========================================================================== */
function PieceParole({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#7fe0a0" glow="#e6ffef">
        <g transform="rotate(-12 12 12)">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#7fe0a0" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="6.7" fill="none" stroke="#e6ffef" strokeWidth="0.7" strokeDasharray="1.6 1.1" />
          <text x="12" y="13.4" textAnchor="middle" fontSize="3.6" fontWeight="700" letterSpacing="0.5" fill="#7fe0a0">
            PAROLE
          </text>
        </g>
      </Entrance>
    );
  }
  return (
    <span className={`${ROOT} sp-clip`} style={rootStyle(delayMs)} aria-hidden="true">
      <Tell at={beat(0.05)} tone="#7fe0a0" />
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{ background: "radial-gradient(circle, #e6ffef 0%, transparent 66%)" }}
        />
      )}
      {/* tell: the bars appear, then rise out of frame one after another */}
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="sp-pp-bar absolute block"
          style={{
            left: `${15 + i * 15}%`,
            top: "4%",
            width: "4.5%",
            height: "92%",
            borderRadius: "9999px",
            background: "linear-gradient(90deg, #0f331d, #7fe0a0 55%, #0f331d)",
            animationDelay: beat(0.06 * i),
          }}
        />
      ))}
      {/* strike: the PAROLE seal thunks down */}
      <svg
        viewBox="0 0 24 24"
        className="sp-pp-seal absolute block"
        style={{ left: "50%", top: "50%", width: "72%", height: "72%", filter: "drop-shadow(0 0 3px #e6ffef)" }}
      >
        <g transform="rotate(-12 12 12)">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#7fe0a0" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="6.7" fill="none" stroke="#7fe0a0" strokeWidth="0.7" strokeDasharray="1.6 1.1" />
          <text x="12" y="13.4" textAnchor="middle" fontSize="3.6" fontWeight="700" letterSpacing="0.5" fill="#7fe0a0">
            PAROLE
          </text>
        </g>
      </svg>
      {/* settle: the ink ring blots outward from the stamp */}
      <span
        className="sp-pp-ring absolute block"
        style={{
          left: "50%",
          top: "50%",
          width: "68%",
          height: "68%",
          borderRadius: "9999px",
          border: "2.5px solid #0f331d",
        }}
      />
      <Settle at={beat(1.02)} tone="#7fe0a0" />
    </span>
  );
}

/* =============================================================================
   Half Measure — a sweeping line slices a circle in half; the right half
   dissolves into drifting motes, the left half settles where it stands.
   Palette: #c9d2e0 / #f2f5fb / #1a2130.
   ========================================================================== */
const HM_MOTES: Array<{ x: number; y: number; sx: string; sy: string }> = [
  { x: 60, y: 30, sx: "160%", sy: "-260%" },
  { x: 68, y: 42, sx: "240%", sy: "-180%" },
  { x: 63, y: 54, sx: "200%", sy: "-240%" },
  { x: 70, y: 62, sx: "260%", sy: "-140%" },
];

function HalfMeasure({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Entrance delayMs={delayMs} tone="#c9d2e0" glow="#f2f5fb">
        <path d="M12 4a8 8 0 0 0 0 16z" fill="#1a2130" stroke="#c9d2e0" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="#f2f5fb" opacity="0.6" />
      </Entrance>
    );
  }
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      {/* tell: a ring inhales, then the whole circle fades up under it */}
      <Tell at={beat(0.04)} tone="#c9d2e0" />
      <svg
        viewBox="0 0 24 24"
        className="sp-hm-circle absolute block"
        style={{ left: "50%", top: "50%", width: "82%", height: "82%" }}
      >
        <circle cx="12" cy="12" r="8" fill="none" stroke="#c9d2e0" strokeWidth="1.8" />
      </svg>
      {/* strike: the slicing line sweeps across the square */}
      <span
        className="sp-hm-slice absolute inset-0 block"
        style={{ background: "linear-gradient(90deg, transparent 47%, #f2f5fb 50%, transparent 53%)" }}
      />
      {/* settle A: the kept half nudges left and stands its ground */}
      <svg
        viewBox="0 0 24 24"
        className="sp-hm-left absolute block"
        style={{ left: "50%", top: "50%", width: "82%", height: "82%", filter: "drop-shadow(0 0 3px #f2f5fb)" }}
      >
        <path d="M12 4a8 8 0 0 0 0 16z" fill="#1a2130" stroke="#c9d2e0" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {/* settle B: the cut half dissolves into motes */}
      <svg
        viewBox="0 0 24 24"
        className="sp-hm-right absolute block"
        style={{ left: "50%", top: "50%", width: "82%", height: "82%" }}
      >
        <path d="M12 4a8 8 0 0 1 0 16z" fill="#f2f5fb" opacity="0.85" />
      </svg>
      {HM_MOTES.map((m, i) => (
        <span
          key={i}
          className="sp-hm-mote absolute block"
          style={
            {
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: "4.5%",
              height: "4.5%",
              borderRadius: "9999px",
              background: "#f2f5fb",
              animationDelay: beat(0.42 + i * 0.07),
              "--sx": m.sx,
              "--sy": m.sy,
            } as CSSProperties
          }
        />
      ))}
      <Settle at={beat(0.88)} tone="#c9d2e0" />
    </span>
  );
}

/* =============================================================================
   Registry — bind scene + config into a SigPlugin per card. Every `sound` is
   an existing SigSoundKey; every `source` an existing SigZone.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Rewind / undo family (tempo) ---
  free_retreat: S(FreeRetreat, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast",
  }),
  rewind_one: S(RewindOne, {
    ordering: "radial", staggerMs: 30, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast",
  }),
  // time_rewind and full_rewind keep their richer bespoke scenes in
  // greatPlays (ClockSpire) and godPlays (ChronoLord); no entries here.

  // --- Movement escapes ---
  shadow_step: S(ShadowStep, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }),
  pin_breaker: S(PinBreaker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "cast",
  }),

  // --- Protection ---
  decoy: S(Decoy, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe", anchor: "cast",
  }),

  // --- Nerf-meta relief ---
  loosen_the_leash: S(LoosenTheLeash, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board",
  }),
  piece_parole: S(PieceParole, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  half_measure: S(HalfMeasure, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: false, sound: "snooze", anchor: "board",
  }),
  // rehab and nerf_reversal keep their richer bespoke scenes in greatPlays
  // (CardRite) and godPlays (CelestialRing); no entries here.
};

/* =============================================================================
   FLAGSHIP IMPACT WAVE. Every stub card now LANDS: a per-card impact beat
   from the shared violence vocabulary (impact/impact.tsx), composed in this
   module's own one-cell frame (these scenes carry no board-scale canvas, so
   the composite and the quake both live at cell scale). The scene rides a
   quake wrapper (sp-quakecell, stubPlays.css) on the same --imp-delay beat.
   Additive only: the original mini-scenes render unchanged underneath.

   Node cost: quake 1, laser 2, shockwave 1, shatter 6 - every combo stays
   inside the 16-animated-node scene budget.
   ========================================================================== */

interface Imp {
  /** the impact beat, ms after delayMs - synced to the scene's own strike */
  at: number;
  /** "#rrggbb" tint for the impact vocabulary (one of the card's 3 colours) */
  tint: string;
  /** the column of light */
  laser?: boolean;
  /** ground ring on the same beat */
  shock?: boolean;
  /** shatter silhouette: the struck thing splits in half, chips spray */
  glyph?: ReactNode;
  /** placement + size, in percent of the CELL (these scenes are one cell) */
  x?: number;
  y?: number;
  s?: number;
  /** which role carries the hit: half_measure has no lead cut, so its hit
   *  rides every per-victim target beat instead */
  on?: SigRole;
}

/** hex "#rrggbb" -> the "r g b" triple --imp-rgb wants. */
function impRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** Shatter silhouettes, painted in the card's own palette. */
function impGlyph(path: string, fill: string, stroke: string, w = 1.4): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
      <path d={path} fill={fill} stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
const IG_LINK = "M8.5 4h7A4.5 4.5 0 0 1 20 8.5v7a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5v-7A4.5 4.5 0 0 1 8.5 4z";

/** The impact composite, inside the one-cell frame. */
function ImpactBeat({ imp }: { imp: Imp }) {
  const s = imp.s ?? 40;
  const x = imp.x ?? 50;
  const y = imp.y ?? 50;
  return (
    <span className="sp-impactbed absolute inset-0 block">
      <span
        className="absolute block"
        style={{ left: `${x - s / 2}%`, top: `${y - s / 2}%`, width: `${s}%`, height: `${s}%` }}
      >
        {imp.laser && <LaserStrike />}
        {imp.glyph != null && <PieceShatter glyph={imp.glyph} />}
        {imp.shock && <Shockwave />}
      </span>
    </span>
  );
}

/** Wrap a card's Render: the chosen role gains the quake + the impact beat. */
function withImpact(Render: SigPlugin["Render"], imp: Imp): SigPlugin["Render"] {
  const on = imp.on ?? "lead";
  function ImpactCut(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== on) return <Render {...props} />;
    return (
      <span
        className="sp-quakecell absolute inset-0 block"
        style={impactVars(impRgb(imp.tint), (props.delayMs + imp.at) / 1000)}
      >
        <Render {...props} />
        <ImpactBeat imp={imp} />
      </span>
    );
  }
  return ImpactCut;
}

/* Per-card cue sheet: each hit lands on ITS mini-scene's strike beat, at ITS
   action point, in ITS palette - no two siblings share a beat + combo. */
const IMPACTS: Record<string, Imp> = {
  // the undo-swirl completes: the retreat step lands with a real thump
  free_retreat: { at: 380, tint: "#7fd4c2", laser: true, shock: true, y: 56 },
  // the tape bangs off the reel head: scanline strike + track ring
  rewind_one: { at: 420, tint: "#8fb4ff", laser: true, shock: true, y: 46, s: 34 },
  // the shadow tears free: the silhouette itself splits in half
  shadow_step: { at: 440, tint: "#9aa6c9", glyph: impGlyph(PAWN, "#161a2b", "#9aa6c9"), shock: true, s: 44 },
  // the pin SNAPS at the break point: flash column + whipcrack ring
  pin_breaker: { at: 400, tint: "#ffb14a", laser: true, shock: true, y: 49, s: 38 },
  // the decoy plants itself: balloon-thump and a stage-light column
  decoy: { at: 520, tint: "#5fc9b0", laser: true, shock: true, y: 52, s: 42 },
  // the white-hot link POPS: the chain link shatters in half
  loosen_the_leash: { at: 480, tint: "#ffd76a", glyph: impGlyph(IG_LINK, "none", "#ffd76a", 2.6), shock: true, y: 47, s: 36 },
  // the PAROLE seal thunks down rubber-stamp style: stamp column + ink ring
  piece_parole: { at: 500, tint: "#7fe0a0", laser: true, shock: true, s: 46 },
  // no lead cut on this card: the halving slice hits EVERY victim square
  half_measure: { at: 460, tint: "#c9d2e0", laser: true, shock: true, s: 34, on: "target" },
};

for (const [id, imp] of Object.entries(IMPACTS)) {
  const play = PLAYS[id];
  if (play) PLAYS[id] = { config: play.config, Render: withImpact(play.Render, imp) };
}
