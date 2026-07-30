"use client";

// The plug-in play registry, loaded ONE MODULE AT A TIME.
//
// This file used to statically import every plugin module, so evaluating it
// pulled the whole art library into one chunk. That was fine at thirteen
// modules and ~2.6MB of source. It is not fine at the coverage this branch is
// heading for: bespoke art for every card projects to ~9.6MB of source in a
// single blob that Board prefetches on mount, which on a phone is a worse
// experience than the generated fallback it replaces.
//
// So the modules sit behind dynamic imports now, and Board loads only the ones
// holding cards that can actually be played this game (it knows both hands).
// The rest are never fetched.
//
// WHAT DID NOT CHANGE, deliberately: the resolution contract. A card whose
// module has not loaded resolves to no bespoke entry, and Board's
// PLUGIN_ID_SET check turns that into "no art rather than wrong art" — exactly
// the behaviour that already existed for the window before the single chunk
// landed. The window is now shorter and per-module rather than global.
//
// GENERATED: the MODULE_LOADERS map below is machine-written by
// scripts/check-sig-plugins.cjs from the modules on disk. Do not hand-edit it;
// regenerate with `node scripts/check-sig-plugins.cjs --write`.

import * as React from "react";
import { CARD_TO_MODULE, PLUGIN_SIGNATURES, type SigPlugin, type SigRole } from "./sigPlugins";

// <plugin-modules:generated>
export const MODULE_LOADERS: Record<string, () => Promise<{ PLAYS: Record<string, SigPlugin> }>> = {
  basicPlays: () => import("./basicPlays"),
  godPlays: () => import("./godPlays"),
  greatPlays: () => import("./greatPlays"),
  funnyPlays: () => import("./funnyPlays"),
  personalPlays: () => import("./personalPlays"),
  memePlays: () => import("./memePlays"),
  stubPlays: () => import("./stubPlays"),
  prankPlays: () => import("./prankPlays"),
  casinoPlays: () => import("./casinoPlays"),
  gamblingPlays: () => import("./gamblingPlays"),
  boonPlays: () => import("./boonPlays"),
  cursePlays: () => import("./cursePlays"),
  creatorPlays: () => import("./creatorPlays"),
  g01HourglassPlays: () => import("./g01HourglassPlays"),
  g02SchedulePlays: () => import("./g02SchedulePlays"),
  g03CelestialPlays: () => import("./g03CelestialPlays"),
  g04PatinaPlays: () => import("./g04PatinaPlays"),
  g05PawnTidePlays: () => import("./g05PawnTidePlays"),
  g06GroundPlays: () => import("./g06GroundPlays"),
  g07SupplyPlays: () => import("./g07SupplyPlays"),
  g08CrowdPlays: () => import("./g08CrowdPlays"),
  g09FrostPlays: () => import("./g09FrostPlays"),
  g10ThawPlays: () => import("./g10ThawPlays"),
  g11BrittlePlays: () => import("./g11BrittlePlays"),
  g12ClockworkPlays: () => import("./g12ClockworkPlays"),
  g13GaugePlays: () => import("./g13GaugePlays"),
  g14BreakdownPlays: () => import("./g14BreakdownPlays"),
  g15SealPlays: () => import("./g15SealPlays"),
  g16ArchivePlays: () => import("./g16ArchivePlays"),
  g17HeraldPlays: () => import("./g17HeraldPlays"),
  g18LeapPlays: () => import("./g18LeapPlays"),
  g19HorsePlays: () => import("./g19HorsePlays"),
  g20RampartPlays: () => import("./g20RampartPlays"),
  g21KeepPlays: () => import("./g21KeepPlays"),
  g22VeilPlays: () => import("./g22VeilPlays"),
  g23ConjurorPlays: () => import("./g23ConjurorPlays"),
  g24RegaliaPlays: () => import("./g24RegaliaPlays"),
  g25CourtPlays: () => import("./g25CourtPlays"),
  g26ShieldPlays: () => import("./g26ShieldPlays"),
  g27ThornPlays: () => import("./g27ThornPlays"),
  g28MasonPlays: () => import("./g28MasonPlays"),
  g29RallyPlays: () => import("./g29RallyPlays"),
  g30ReachPlays: () => import("./g30ReachPlays"),
  g31ChancePlays: () => import("./g31ChancePlays"),
  g32FairnessPlays: () => import("./g32FairnessPlays"),
  g33DiagonalPlays: () => import("./g33DiagonalPlays"),
  g34ExchangePlays: () => import("./g34ExchangePlays"),
  g41PrismPlays: () => import("./g41PrismPlays"),
  g42ChainPlays: () => import("./g42ChainPlays"),
  g43WaterPlays: () => import("./g43WaterPlays"),
};
// </plugin-modules:generated>

/** Every play whose module has been loaded so far. */
const MERGED: Record<string, SigPlugin> = {};

/** In-flight / settled loads, so N cards in one module cause ONE import. */
const loads = new Map<string, Promise<void>>();

/** Bumped whenever a module lands, so mounted visuals waiting on one re-render. */
let generation = 0;
const listeners = new Set<() => void>();

function publish(plays: Record<string, SigPlugin>): void {
  for (const [id, p] of Object.entries(plays)) {
    MERGED[id] = p;
    // The same shape the eager build published: the visual key routes back here.
    PLUGIN_SIGNATURES[id] = { ...p.config, visual: `x:${id}` as const };
  }
  generation++;
  for (const l of listeners) l();
}

/** Load one module by name. Safe and cheap to call repeatedly. */
export function loadPluginModule(name: string): Promise<void> {
  const existing = loads.get(name);
  if (existing) return existing;
  const loader = MODULE_LOADERS[name];
  if (!loader) return Promise.resolve();
  const p = loader()
    .then((m) => publish(m.PLAYS))
    .catch((err: unknown) => {
      // A failed module means those cards fall back to the generated burst,
      // which is the same outcome as never having had bespoke art. Logged once
      // per module rather than swallowed.
      console.warn(`[nerfchess] play module "${name}" failed to load`, err);
    });
  loads.set(name, p);
  return p;
}

/**
 * Load exactly the modules holding these card ids.
 *
 * This is the point of the split: Board knows both hands, so it can warm the
 * handful of modules whose art can actually appear this game instead of the
 * whole library.
 */
export function loadPluginModulesForCards(ids: Iterable<string>): Promise<void> {
  const names = new Set<string>();
  for (const id of ids) {
    const mod = CARD_TO_MODULE[id];
    if (mod && !loads.has(mod)) names.add(mod);
  }
  if (names.size === 0) return Promise.resolve();
  return Promise.all([...names].map(loadPluginModule)).then(() => undefined);
}

/** Load everything. For the dev galleries, which review the whole library. */
export function loadAllPluginModules(): Promise<void> {
  return Promise.all(Object.keys(MODULE_LOADERS).map(loadPluginModule)).then(() => undefined);
}

/** True when this card's art is resolvable right now. */
export function hasPluginVisual(key: string): boolean {
  return MERGED[key] != null;
}

/**
 * SignatureOverlay's default-case hook: render an `x:<key>` plugin visual.
 *
 * If the card's module is not loaded yet this kicks the load off and renders
 * nothing until it lands. A one-shot scene that starts a beat late still
 * plays; the alternative (falling through to the generated burst) would be the
 * wrong art, which the pre-load suppression exists specifically to avoid.
 */
export function renderPluginVisual(key: string, role: SigRole, delayMs: number) {
  return <PluginVisual pkey={key} role={role} delayMs={delayMs} />;
}

function PluginVisual({ pkey, role, delayMs }: { pkey: string; role: SigRole; delayMs: number }) {
  // Subscribe to module arrivals rather than polling: `generation` changes only
  // when a module publishes, so a mounted scene waiting on its own module
  // re-renders exactly once, when it can finally draw.
  const gen = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => generation,
    () => generation,
  );
  const p = MERGED[pkey];
  React.useEffect(() => {
    if (!p) void loadPluginModule(CARD_TO_MODULE[pkey] ?? "");
    // `gen` is a dependency on purpose: a re-render after another module lands
    // re-checks whether this one is now resolvable.
  }, [pkey, p, gen]);
  if (!p) return null;
  const R = p.Render;
  return <R lead={role === "lead"} role={role} delayMs={delayMs} />;
}
