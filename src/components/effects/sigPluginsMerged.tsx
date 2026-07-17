"use client";

// The MERGED plug-in registry — the heavy half of sigPlugins.tsx (code
// split). This module statically imports all six plugin modules (~9k lines of
// render art), so it must only ever be reached through the lazy
// signature-visuals chunk (sigVisuals.tsx imports it; Board prefetches that
// chunk on mount via prefetchSignatureVisuals). Evaluating it publishes every
// plugin's config into the eager PLUGIN_SIGNATURES registry as a load-time
// side effect, after which Board resolves plugin cards exactly as before the
// split.

import { PLUGIN_IDS, PLUGIN_SIGNATURES, type SigPlugin } from "./sigPlugins";
import { PLAYS as GOD_PLAYS } from "./godPlays";
import { PLAYS as FUNNY_PLAYS } from "./funnyPlays";
import { PLAYS as GREAT_PLAYS } from "./greatPlays";
import { PLAYS as BASIC_PLAYS } from "./basicPlays";
import { PLAYS as PERSONAL_PLAYS } from "./personalPlays";
import { PLAYS as MEME_PLAYS } from "./memePlays";
import { PLAYS as STUB_PLAYS } from "./stubPlays";
import { PLAYS as PRANK_PLAYS } from "./prankPlays";
import { PLAYS as CASINO_PLAYS } from "./casinoPlays";
import { PLAYS as BOON_PLAYS } from "./boonPlays";
import { PLAYS as CURSE_PLAYS } from "./cursePlays";

// Later spreads win within plugins; core SIGNATURES always beat plugins at
// the resolve site. Merge order: god-tier set, tier 5-6 set, funny/meta set,
// personal set, meme (brainrot batch 2) set, then the revived-stub, prank,
// and casino sets.
const MERGED: Record<string, SigPlugin> = { ...BASIC_PLAYS, ...GOD_PLAYS, ...GREAT_PLAYS, ...FUNNY_PLAYS, ...PERSONAL_PLAYS, ...MEME_PLAYS, ...STUB_PLAYS, ...PRANK_PLAYS, ...CASINO_PLAYS, ...BOON_PLAYS, ...CURSE_PLAYS };

// Publish the full SignatureConfig per plugin card id into the eager
// registry, visual keyed back to this module. Deterministic: same inputs,
// same merge order, same entries as the pre-split eager build.
for (const [id, p] of Object.entries(MERGED)) {
  PLUGIN_SIGNATURES[id] = { ...p.config, visual: `x:${id}` as const };
}

// Dev-mode invariant: the eager PLUGIN_IDS list (sigPlugins.tsx) must match
// the real merged keys exactly. The list is what suppresses the generated
// fallback before this chunk loads, so drift means either wrong art plays
// pre-load (id missing from the list) or a card renders no art forever (id
// listed but no longer covered).
//
// The AUTHORITATIVE, ship-blocking guard is the build-time check in
// `test:rules` (scripts/check-sig-plugins.cjs), which regenerates PLUGIN_IDS
// from these same PLAYS keys and FAILS CI on any drift. This runtime check is
// the fast local mirror of it: it THROWS in dev/test (not just warns, which
// production stripped and shipped silently) so a drifted registry can never be
// exercised without someone noticing immediately.
if (process.env.NODE_ENV !== "production") {
  const listed = new Set(PLUGIN_IDS);
  const merged = new Set(Object.keys(MERGED));
  const missing = [...merged].filter((id) => !listed.has(id));
  const stale = [...listed].filter((id) => !merged.has(id));
  if (missing.length || stale.length) {
    throw new Error(
      "[sigPlugins] PLUGIN_IDS drifted from the merged plugin registry." +
        (missing.length ? ` Missing from PLUGIN_IDS: ${missing.join(", ")}.` : "") +
        (stale.length ? ` Stale in PLUGIN_IDS: ${stale.join(", ")}.` : "") +
        " Regenerate: node scripts/check-sig-plugins.cjs --write",
    );
  }
}

/** SignatureOverlay's default-case hook: render an `x:<key>` plugin visual. */
export function renderPluginVisual(key: string, role: "lead" | "target", delayMs: number) {
  const p = MERGED[key];
  if (!p) return null;
  const R = p.Render;
  return <R lead={role === "lead"} delayMs={delayMs} />;
}
