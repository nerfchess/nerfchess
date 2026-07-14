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

import type { CSSProperties } from "react";
import type { SigPlugin } from "./sigPlugins";
import "./stubPlays.css";

interface SceneProps {
  lead: boolean;
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
   Free Retreat — the piece moon-walks back: an undo-swirl arrow wraps it, a
   translucent ghost slides back along a short trail, and a clock hand
   counter-rotates one tick. Palette: #7fd4c2 / #d9fff5 / #123a33.
   ========================================================================== */
function FreeRetreat({ lead, delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
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
    </span>
  );
}

/* =============================================================================
   Rewind One — VHS rewind: two scanline bars sweep down the square, both
   ghosts chop backwards in steps, and a chunky "rewind" glyph blinks twice.
   Palette: #8fb4ff / #e6efff / #14243f.
   ========================================================================== */
function RewindOne({ lead, delayMs }: SceneProps) {
  return (
    <span className={`${ROOT} sp-clip`} style={rootStyle(delayMs)} aria-hidden="true">
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
    </span>
  );
}

/* =============================================================================
   Shadow Step — the square dips dark, a silhouette splits off the piece,
   holds a beat, re-merges, and a smoke wisp curls up from the join.
   Palette: #9aa6c9 / #e2e7f5 / #161a2b.
   ========================================================================== */
function ShadowStep({ lead, delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      {/* tell: the square dips dark */}
      <span className="sp-ss-dim absolute inset-0 block" style={{ background: "#161a2b" }} />
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
    </span>
  );
}

/* =============================================================================
   Pin Breaker — the pinning beam goes taut, SNAPS in the middle, the two
   halves whip away, and the freed knight rears. Palette: #ffb14a / #fff0d6 /
   #3a230a.
   ========================================================================== */
function PinBreaker({ lead, delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
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
    </span>
  );
}

/* =============================================================================
   Decoy — a dashed hollow king inflates like a balloon, wobbles as it
   over-fills, then winks (one eye blinks, a glint pops by the crown).
   Palette: #5fc9b0 / #e8fff7 / #0f322b.
   ========================================================================== */
function Decoy({ lead, delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
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

function LoosenTheLeash({ lead, delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
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
    </span>
  );
}

/* =============================================================================
   Piece Parole — the jail bars rise up out of frame, a PAROLE seal thunks
   down rubber-stamp style, and an ink ring blots outward.
   Palette: #7fe0a0 / #e6ffef / #0f331d.
   ========================================================================== */
function PieceParole({ lead, delayMs }: SceneProps) {
  return (
    <span className={`${ROOT} sp-clip`} style={rootStyle(delayMs)} aria-hidden="true">
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

function HalfMeasure({ delayMs }: SceneProps) {
  return (
    <span className={ROOT} style={rootStyle(delayMs)} aria-hidden="true">
      {/* tell: the whole circle fades up first */}
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
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze",
  }),
  rewind_one: S(RewindOne, {
    ordering: "radial", staggerMs: 30, victims: "all", hasLead: true, sound: "clockcage",
  }),
  // time_rewind and full_rewind keep their richer bespoke scenes in
  // greatPlays (ClockSpire) and godPlays (ChronoLord); no entries here.

  // --- Movement escapes ---
  shadow_step: S(ShadowStep, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  pin_breaker: S(PinBreaker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),

  // --- Protection ---
  decoy: S(Decoy, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe",
  }),

  // --- Nerf-meta relief ---
  loosen_the_leash: S(LoosenTheLeash, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
  }),
  piece_parole: S(PieceParole, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  half_measure: S(HalfMeasure, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: false, sound: "snooze",
  }),
  // rehab and nerf_reversal keep their richer bespoke scenes in greatPlays
  // (CardRite) and godPlays (CelestialRing); no entries here.
};
