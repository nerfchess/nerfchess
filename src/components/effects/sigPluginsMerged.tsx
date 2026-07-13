"use client";

// The MERGED plug-in registry — the heavy half of sigPlugins.tsx (code
// split). This module statically imports all six plugin modules (~9k lines of
// render art), so it must only ever be reached through the lazy
// signature-visuals chunk (sigVisuals.tsx imports it; Board prefetches that
// chunk on mount via prefetchSignatureVisuals). Evaluating it publishes every
// plugin's config into the eager PLUGIN_SIGNATURES registry as a load-time
// side effect, after which Board resolves plugin cards exactly as before the
// split.

import { PLUGIN_SIGNATURES, type SigPlugin } from "./sigPlugins";
import { PLAYS as GOD_PLAYS } from "./godPlays";
import { PLAYS as FUNNY_PLAYS } from "./funnyPlays";
import { PLAYS as GREAT_PLAYS } from "./greatPlays";
import { PLAYS as BASIC_PLAYS } from "./basicPlays";
import { PLAYS as PERSONAL_PLAYS } from "./personalPlays";
import { PLAYS as MEME_PLAYS } from "./memePlays";

// Later spreads win within plugins; core SIGNATURES always beat plugins at
// the resolve site. Merge order: god-tier set, tier 5-6 set, funny/meta set,
// personal set, meme (brainrot batch 2) set.
const MERGED: Record<string, SigPlugin> = { ...BASIC_PLAYS, ...GOD_PLAYS, ...GREAT_PLAYS, ...FUNNY_PLAYS, ...PERSONAL_PLAYS, ...MEME_PLAYS };

// Publish the full SignatureConfig per plugin card id into the eager
// registry, visual keyed back to this module. Deterministic: same inputs,
// same merge order, same entries as the pre-split eager build.
for (const [id, p] of Object.entries(MERGED)) {
  PLUGIN_SIGNATURES[id] = { ...p.config, visual: `x:${id}` as const };
}

/** SignatureOverlay's default-case hook: render an `x:<key>` plugin visual. */
export function renderPluginVisual(key: string, role: "lead" | "target", delayMs: number) {
  const p = MERGED[key];
  if (!p) return null;
  const R = p.Render;
  return <R lead={role === "lead"} delayMs={delayMs} />;
}
