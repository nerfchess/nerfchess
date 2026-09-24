// The last-picked game mode, mirrored into a cookie so the server can render
// a page with the right mode preselected (F006). A plain module (no "use
// client") because the root layout reads it on the server; the client side
// lives in src/lib/modeState.ts.

import type { DraftMode } from "@/engine/buff";

export const LAST_MODE_COOKIE = "nc_mode";

export function parseMode(value: string | null | undefined): DraftMode | null {
  return value === "nerf" || value === "buff" ? value : null;
}
