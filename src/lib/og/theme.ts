// The link-preview palette. next/og renders outside the page, so CSS custom
// properties do not reach it: every value here is the literal of a token in
// src/app/globals.css (dark theme), named after it, and nothing else. No new
// colours (docs/design-system.md section 2).

/** --bg-base, the page. */
export const PAGE = "#161512";
/** --bg-panel, a box. */
export const PANEL = "#262421";
/** --bg-raised, a raised box. */
export const RAISED = "#302e2c";
/** --border-subtle, every hairline. */
export const BORDER = "#404040";
/** --text-heading. */
export const HEADING = "#dedede";
/** --text-primary, body. */
export const TEXT = "#c6c6c6";
/** --text-secondary. */
export const SECONDARY = "#979797";
/** --accent-gold (its value is Lichess blue): links and the one primary action. */
export const ACCENT = "#3692e7";
/** --text-on-accent. */
export const ON_ACCENT = "#ffffff";
/** --accent-buff: Buff mode identity, borders and labels only. */
export const BUFF = "#5b9bd5";
/** --accent-nerf: Nerf mode identity, borders and labels only. */
export const NERF = "#e05252";
/** --accent-positive: "Live", wins, rating up. */
export const POSITIVE = "#629924";
/** --brag: rank and reward highlights. */
export const BRAG = "#bf811d";

/** The default board (BOARD_THEMES.midnight in src/lib/settings.ts), the
 *  one sanctioned palette exception: it is the player's board. */
export const BOARD_LIGHT = "#9fa6b2";
export const BOARD_DARK = "#3a3f4b";
/** --board-highlight at --board-highlight-a: the last-move square. */
export const BOARD_HIGHLIGHT = "rgba(155, 199, 0, 0.4)";

/** --tier-ink-1..10 (dark theme), the card tier ramp. */
export const TIER_INK: Record<number, string> = {
  1: "#7eb59a",
  2: "#8ba9c4",
  3: "#d8b56e",
  4: "#cd9a6d",
  5: "#e9877e",
  6: "#ea80b0",
  7: "#c08ef2",
  8: "#ff7a75",
  9: "#f4c430",
  10: "#22d3ee",
};

export function tierInk(tier: number): string {
  return TIER_INK[Math.max(1, Math.min(10, Math.round(tier)))] ?? TEXT;
}

export function modeInk(mode: "buff" | "nerf" | null | undefined): string {
  return mode === "nerf" ? NERF : mode === "buff" ? BUFF : SECONDARY;
}
