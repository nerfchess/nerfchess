// Bespoke plugin signatures for the twelve newly implemented "stub" cards
// (the rewind / undo / nerf-meta family). Self-contained in the sigPlugins.tsx
// mould: own inline SVG glyphs + own stubPlays.css, transform/opacity only,
// animations-off safe (a local html[data-anim="off"] guard flattens the motion,
// and the caller's animations-off layer gates it too). No imports from
// BoardEffects.tsx (cycle hazard); only the SigPlugin TYPE is imported.
//
// NOTE: this module is intentionally NOT registered anywhere (it is absent from
// sigPlugins/sigPluginsMerged and from PLUGIN_IDS). Wiring it into the resolver
// is a later integration step; here it only has to compile and render.
//
// Every entry uses one shared compact burst (StubBurst): a themed glyph pop, a
// ring (two on the lead flourish), a board-wash on the lead, and a fan of
// radial sparks. Each card supplies its own three-color palette and a distinct
// hand-drawn glyph, so no two plays read alike.

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";
import "./stubPlays.css";

/** [core stroke, glow / secondary, deep accent]. */
type Palette = [string, string, string];

interface BurstProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  delayMs: number;
}

/** One self-contained per-signature burst. Layout is inline (no utility-class
 * dependency beyond absolute positioning); motion lives entirely in the
 * `sp-*` CSS classes, which animate transform/opacity only. */
function StubBurst({ palette, glyph, lead, delayMs }: BurstProps) {
  const [core, glow] = palette;
  const sparkCount = lead ? 8 : 5;
  return (
    <span className="pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      {lead && (
        <span
          className="sp-wash absolute inset-0 block"
          style={{
            background: `radial-gradient(circle, ${glow} 0%, transparent 68%)`,
            animationDelay: `${delayMs}ms`,
          }}
        />
      )}
      <span
        className="sp-ring absolute block"
        style={{
          left: "50%",
          top: "50%",
          width: "72%",
          height: "72%",
          borderRadius: "9999px",
          border: `2px solid ${core}`,
          animationDelay: `${delayMs}ms`,
        }}
      />
      {lead && (
        <span
          className="sp-ring absolute block"
          style={{
            left: "50%",
            top: "50%",
            width: "46%",
            height: "46%",
            borderRadius: "9999px",
            border: `2px solid ${glow}`,
            animationDelay: `${delayMs + 90}ms`,
          }}
        />
      )}
      {Array.from({ length: sparkCount }).map((_, i) => {
        const ang = (i / sparkCount) * Math.PI * 2;
        const rad = 27;
        const x = 50 + Math.cos(ang) * rad;
        const y = 50 + Math.sin(ang) * rad;
        return (
          <span
            key={i}
            className="sp-spark absolute block"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "5.5%",
              height: "5.5%",
              borderRadius: "9999px",
              background: i % 2 ? glow : core,
              animationDelay: `${delayMs + 70 + i * 26}ms`,
            }}
          />
        );
      })}
      <span
        className="sp-pop absolute block"
        style={{
          left: "50%",
          top: "50%",
          width: "42%",
          height: "42%",
          filter: `drop-shadow(0 0 4px ${glow})`,
          animationDelay: `${delayMs + 40}ms`,
        }}
      >
        {glyph}
      </span>
    </span>
  );
}

/* =============================================================================
   Glyphs — one distinct hand-drawn SVG per card, colored from its palette.
   All share a 0 0 24 24 viewBox and stroke-based art so they scale crisply.
   ========================================================================== */

const svg = (children: ReactNode): ReactNode => (
  <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    {children}
  </svg>
);

type GlyphFn = (core: string, glow: string, dark: string) => ReactNode;

const GLYPH: Record<string, GlyphFn> = {
  // Free Retreat — a single U-turn arrow doubling back on itself.
  free_retreat: (core, glow) =>
    svg(
      <g fill="none" stroke={core} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6 a6 6 0 1 0 0 12 H8" />
        <path d="M11 14 l-4 4 l4 4" stroke={glow} />
      </g>,
    ),
  // Decoy — a hollow crowned stand-in (dashed), a false king.
  decoy: (core, glow) =>
    svg(
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9 l3 3 l4-5 l4 5 l3-3 v7 h-14 z" stroke={core} strokeWidth="2" strokeDasharray="2.4 2" />
        <circle cx="12" cy="4.5" r="1.6" fill={glow} stroke="none" />
      </g>,
    ),
  // Shadow Step — a solid mark and its offset ghost, a blink trail.
  shadow_step: (core, glow) =>
    svg(
      <g strokeLinejoin="round">
        <circle cx="9" cy="12" r="4" fill="none" stroke={glow} strokeWidth="1.6" strokeDasharray="2 2" opacity="0.8" />
        <circle cx="15" cy="12" r="4.4" fill="none" stroke={core} strokeWidth="2" />
        <path d="M12 12 h4" stroke={core} strokeWidth="1.4" strokeLinecap="round" />
      </g>,
    ),
  // Loosen the Leash — a chain with one link snapped open.
  loosen_the_leash: (core, glow) =>
    svg(
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <rect x="3.5" y="9" width="7" height="6" rx="3" stroke={core} />
        <path d="M13.5 9 a3 3 0 0 1 3 0 M13.5 15 a3 3 0 0 0 3 0" stroke={glow} />
        <path d="M17.5 8.5 l3-2 M17.5 15.5 l3 2" stroke={glow} />
      </g>,
    ),
  // Pin Breaker — a knight silhouette above a snapped line.
  pin_breaker: (core, glow) =>
    svg(
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M8 17 v-4 c0-4 3-6 5-6 l-1-2 l3 1 c2 1 3 3 3 6 v5 z" fill={core} stroke={core} strokeWidth="1.4" />
        <path d="M3 20 h7 M14 20 h7" stroke={glow} strokeWidth="2" strokeDasharray="0.1 3" />
      </g>,
    ),
  // Rewind One — a counter-clockwise arc with a bold single tick.
  rewind_one: (core, glow) =>
    svg(
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M6 8 a7 7 0 1 1 -1.5 6" stroke={core} />
        <path d="M6 3 v5 h5" stroke={core} />
        <path d="M12 9 v4" stroke={glow} strokeWidth="2.4" />
      </g>,
    ),
  // Piece Parole — a key: a paroled piece set free.
  piece_parole: (core, glow) =>
    svg(
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="4" fill="none" stroke={core} strokeWidth="2" />
        <path d="M11 11 l7 7" stroke={core} strokeWidth="2" />
        <path d="M15.5 15.5 l2 2 M17.5 13.5 l2 2" stroke={glow} strokeWidth="2" />
      </g>,
    ),
  // Half Measure — a circle, one half filled: the nerf cut to half.
  half_measure: (core, glow) =>
    svg(
      <g>
        <circle cx="12" cy="12" r="8" fill="none" stroke={core} strokeWidth="2" />
        <path d="M12 4 a8 8 0 0 1 0 16 z" fill={glow} stroke="none" />
      </g>,
    ),
  // Rehab — a rising sun over a horizon, renewal.
  rehab: (core, glow) =>
    svg(
      <g strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="2">
        <path d="M4 17 h16" stroke={core} />
        <path d="M8 17 a4 4 0 0 1 8 0" fill={glow} stroke={core} />
        <path d="M12 5 v3 M6 9 l2 1.6 M18 9 l-2 1.6" stroke={core} />
      </g>,
    ),
  // Time Rewind — an hourglass with a back-arrow around it.
  time_rewind: (core, glow) =>
    svg(
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        <path d="M9 5 h6 l-3 5 z M9 19 h6 l-3 -5 z" fill={core} stroke={core} />
        <path d="M5 12 a7 7 0 0 1 3-6" stroke={glow} />
        <path d="M8 3 l0 3 l3 0" stroke={glow} />
      </g>,
    ),
  // Full Rewind — concentric circular arrows sweeping many pieces home.
  full_rewind: (core, glow) =>
    svg(
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M6 7 a8 8 0 1 1 -2 7" stroke={core} />
        <path d="M6 2.5 v5 h5" stroke={core} />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill={glow} stroke="none" />
      </g>,
    ),
  // Nerf Reversal — a flip loop wrapping a small shield.
  nerf_reversal: (core, glow) =>
    svg(
      <g strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="2">
        <path d="M6 8 a7 7 0 0 1 12 -1" stroke={core} />
        <path d="M18 3 v4 h-4" stroke={core} />
        <path d="M18 16 a7 7 0 0 1 -12 1" stroke={core} />
        <path d="M6 21 v-4 h4" stroke={core} />
        <path d="M12 9 l3 1.5 v2.5 c0 1.6 -1.4 2.6 -3 3.2 c-1.6 -0.6 -3 -1.6 -3 -3.2 v-2.5 z" fill={glow} stroke="none" />
      </g>,
    ),
};

/* =============================================================================
   Registry — bind palette + glyph + config into a SigPlugin per card. Every
   `sound` is an existing SigSoundKey; every `source` an existing SigZone.
   ========================================================================== */

function S(
  palette: Palette,
  glyphFn: GlyphFn,
  config: SigPlugin["config"],
): SigPlugin {
  const glyph = glyphFn(palette[0], palette[1], palette[2]);
  return {
    config,
    Render: function StubPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <StubBurst palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Rewind / undo family (tempo) ---
  free_retreat: S(["#7fd4c2", "#d9fff5", "#123a33"], GLYPH.free_retreat, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze",
  }),
  rewind_one: S(["#8fb4ff", "#e6efff", "#14243f"], GLYPH.rewind_one, {
    ordering: "radial", staggerMs: 30, victims: "all", hasLead: true, sound: "clockcage",
  }),
  // time_rewind and full_rewind keep their richer bespoke scenes in
  // greatPlays (ClockSpire) and godPlays (ChronoLord); no entries here.

  // --- Movement escapes ---
  shadow_step: S(["#9aa6c9", "#e2e7f5", "#161a2b"], GLYPH.shadow_step, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  pin_breaker: S(["#ffb14a", "#fff0d6", "#3a230a"], GLYPH.pin_breaker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),

  // --- Protection ---
  decoy: S(["#5fc9b0", "#e8fff7", "#0f322b"], GLYPH.decoy, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe",
  }),

  // --- Nerf-meta relief ---
  loosen_the_leash: S(["#ffd76a", "#fff4c9", "#3a2e0a"], GLYPH.loosen_the_leash, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
  }),
  piece_parole: S(["#7fe0a0", "#e6ffef", "#0f331d"], GLYPH.piece_parole, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  half_measure: S(["#c9d2e0", "#f2f5fb", "#1a2130"], GLYPH.half_measure, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: false, sound: "snooze",
  }),
  // rehab and nerf_reversal keep their richer bespoke scenes in greatPlays
  // (CardRite) and godPlays (CelestialRing); no entries here.
};
