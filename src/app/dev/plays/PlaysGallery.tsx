"use client";

// Dev gallery for PLAY signatures (the flagship cast animations), the sibling
// of /dev/effects (which covers the passive layer). Renders any card's
// signature visual on a lone demo square so designers can review and compare
// flagship animations across tiers — and spot two cards that read the same.
// Plugin cards route through the merged registry ("x:<id>" visuals); core
// cards render their SIGNATURES visual key. Board-context choreography
// (orderings, per-square staggers, canvas VFX, sounds) is out of scope here:
// this reviews the per-square scene art itself.

import * as React from "react";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { TIER_ROMAN } from "@/lib/tiers";
import {
  SIGNATURES,
  SignatureOverlay,
  prefetchSignatureVisuals,
  type SigVisual,
} from "@/components/effects/BoardEffects";
import { PLUGIN_ID_SET } from "@/components/effects/sigPlugins";

interface Row {
  id: string;
  name: string;
  tier: number;
  category: string;
  visual: string; // SigVisual key ("x:<id>" for plugin cards)
  kind: "core" | "plugin";
}

function rows(): Row[] {
  const out: Row[] = [];
  for (const b of ALL_BUFFS) {
    if (!b.implemented || b.tier < 1 || b.tier > 8) continue;
    const core = SIGNATURES[b.id];
    if (core) {
      out.push({ id: b.id, name: b.name, tier: b.tier, category: b.category, visual: core.visual, kind: "core" });
    } else if (PLUGIN_ID_SET.has(b.id)) {
      out.push({ id: b.id, name: b.name, tier: b.tier, category: b.category, visual: `x:${b.id}`, kind: "plugin" });
    }
  }
  return out.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
}

function Cell({ row }: { row: Row }) {
  // Remount key replays the one-shot scene.
  const [runKey, setRunKey] = React.useState(0);
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => setRunKey((k) => k + 1)}
        title={`${row.id} — click to replay`}
        className="relative h-36 w-36 overflow-hidden border border-white/15 bg-[#3f3a33]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.06) 75%)",
          backgroundSize: "50% 50%",
        }}
      >
        <SignatureOverlay key={runKey} visual={row.visual as SigVisual} role="lead" delayMs={0} />
      </button>
      <div className="max-w-36 truncate text-center text-[11px] text-parchment-200" title={row.name}>
        {row.name}
      </div>
      <div className="text-[10px] text-parchment-400">
        {TIER_ROMAN[row.tier]} · {row.kind} · {row.category}
      </div>
    </div>
  );
}

export function PlaysGallery() {
  const all = React.useMemo(() => rows(), []);
  const [q, setQ] = React.useState("");
  const [tier, setTier] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    prefetchSignatureVisuals();
    // The lazy chunk lands quickly; a short delay is enough for a dev page.
    const t = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(t);
  }, []);
  const shown = all.filter(
    (r) =>
      (tier === 0 || r.tier === tier) &&
      (q === "" || r.id.includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-xl font-bold text-parchment-100">Play signatures</h1>
      <p className="mt-1 text-sm text-parchment-300">
        Flagship cast art per card (square-local scene, lead role). Click a tile to replay. See{" "}
        <code>/dev/effects</code> for the passive layer.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter by id or name"
          className="rounded-sm border border-white/15 bg-ink-900/60 px-2 py-1 text-sm text-parchment-100"
        />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`rounded-sm border px-2 py-1 text-xs ${
              tier === t ? "border-gold/60 bg-gold/15 text-parchment-100" : "border-white/15 text-parchment-300"
            }`}
          >
            {t === 0 ? "All" : `T${t}`}
          </button>
        ))}
        <span className="text-xs text-parchment-400">{shown.length} cards</span>
      </div>
      {ready && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {shown.slice(0, 120).map((r) => (
            <Cell key={r.id} row={r} />
          ))}
        </div>
      )}
      {shown.length > 120 && (
        <p className="mt-3 text-xs text-parchment-400">Showing the first 120 — narrow the filter for more.</p>
      )}
    </main>
  );
}
