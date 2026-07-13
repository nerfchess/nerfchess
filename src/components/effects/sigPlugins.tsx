// Plug-in signatures: extra card play-animations registered OUTSIDE
// BoardEffects.tsx, so several workstreams can add spectacle art in their own
// modules without touching the (very large) core file. Board resolves a card's
// signature as SIGNATURES[id] ?? PLUGIN_SIGNATURES[id] ?? generated, and
// SignatureOverlay's default case routes any `x:<key>` visual back to the
// merged registry (sigPluginsMerged.tsx).
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
//
// CODE SPLIT: this module is the EAGER facade only — it must stay tiny and
// must NOT import the plugin modules (their ~9k lines of render art ride in
// the lazy signature-visuals chunk; see sigPluginsMerged.tsx / sigVisuals.tsx
// and the prefetchSignatureVisuals note in BoardEffects.tsx). Plugin modules
// import only the SigPlugin TYPE from here, which is erased at compile time.

import type { ComponentType } from "react";
import type { SignatureConfig } from "./BoardEffects";

export interface SigPlugin {
  config: Omit<SignatureConfig, "visual">;
  Render: ComponentType<{ lead: boolean; delayMs: number }>;
}

/** Full SignatureConfig per plugin card id, visual keyed back to the merged
 * registry (`x:<card_id>`). Starts EMPTY and is populated (in place) the
 * moment sigPluginsMerged.tsx evaluates inside the lazy signature-visuals
 * chunk — Board prefetches that chunk on mount, so the registry is complete
 * long before a card can be played. Until then Board's resolveSignature
 * simply finds no bespoke entry and falls back to the deterministic generated
 * signature, which needs no chunk at all. Reads happen at card-fire time
 * (never cached across the fill), so late population is always picked up. */
export const PLUGIN_SIGNATURES: Record<string, SignatureConfig> = {};
