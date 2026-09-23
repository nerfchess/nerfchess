// The match rail's width limits and storage key, in a plain module so the
// server layout's pre-paint stamp (src/lib/session/prePaint.ts) and the
// client hook (src/components/RailResizeHandle.tsx) share one definition.

export const RAIL_WIDTH_MIN = 240;
export const RAIL_WIDTH_MAX = 440;
export const RAIL_WIDTH_DEFAULT = 320;
export const RAIL_WIDTH_KEY = "dc:rail-width";

export const clampRailWidth = (w: number) => Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, Math.round(w)));
