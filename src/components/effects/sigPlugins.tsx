// Plug-in signatures: extra card play-animations registered OUTSIDE
// BoardEffects.tsx, so several workstreams can add spectacle art in their own
// modules without touching the (very large) core file. Board resolves a card's
// signature as SIGNATURES[id] ?? PLUGIN_SIGNATURES[id] ?? generated, and
// SignatureOverlay's default case routes any `x:<key>` visual back here.
//
// Contract for a plugin module (see godPlays.tsx / funnyPlays.tsx):
//   export const PLAYS: Record<string, SigPlugin> = {
//     card_id: {
//       config: { ordering, staggerMs, victims, hasLead, sound, source? },
//       Render: ({ lead, delayMs }) => <YourBurst .../>,
//     },
//   };
// Rules:
//   - Key by CARD id. A key already present in SIGNATURES is ignored (the
//     bespoke core entry wins) — do not shadow core entries; edit them there.
//   - `sound` must be an EXISTING SigSoundKey (Board's playSignature switch);
//     pick the closest voice, no new sound plumbing from plugins.
//   - Render must be fully self-contained (own SVG + its own CSS file):
//     transform/opacity animations only, reduced-motion gated by the caller's
//     layer, no imports from BoardEffects.tsx (cycle hazard).

import type { ComponentType } from "react";
import type { SignatureConfig } from "./BoardEffects";
import { PLAYS as GOD_PLAYS } from "./godPlays";
import { PLAYS as FUNNY_PLAYS } from "./funnyPlays";
import { PLAYS as GREAT_PLAYS } from "./greatPlays";

export interface SigPlugin {
  config: Omit<SignatureConfig, "visual">;
  Render: ComponentType<{ lead: boolean; delayMs: number }>;
}

// Later spreads win within plugins; core SIGNATURES always beat plugins at
// the resolve site. Merge order: god-tier set, tier 5-6 set, funny/meta set.
const MERGED: Record<string, SigPlugin> = { ...GOD_PLAYS, ...GREAT_PLAYS, ...FUNNY_PLAYS };

/** Full SignatureConfig per plugin card id, visual keyed back to this module. */
export const PLUGIN_SIGNATURES: Record<string, SignatureConfig> = Object.fromEntries(
  Object.entries(MERGED).map(([id, p]) => [id, { ...p.config, visual: `x:${id}` as const }]),
);

/** SignatureOverlay's default-case hook: render an `x:<key>` plugin visual. */
export function renderPluginVisual(key: string, role: "lead" | "target", delayMs: number) {
  const p = MERGED[key];
  if (!p) return null;
  const R = p.Render;
  return <R lead={role === "lead"} delayMs={delayMs} />;
}
