"use client";

// Client gallery for the passive visual engine. Renders every registry entry on
// a small local demo board (no engine, no game state) so designers can review
// spawn / aura / pulse / exit across every card and family. Chrome follows the
// design system (docs/design-system.md): plate surfaces, parchment text, one
// accent-colored selection, styled form controls.

import * as React from "react";
import {
  PASSIVE_FAMILIES,
  PASSIVE_VISUALS,
  resetPassiveActivations,
  type PassiveFamily,
  type PassiveTargetType,
  type PassiveVisual,
} from "@/components/effects/passive";
import type { BoardMetrics } from "@/components/effects/passive/contract";
import { PassiveAura } from "@/components/effects/passive/PassiveAura";
import { PassiveSpawn } from "@/components/effects/passive/PassiveSpawn";
import { PassivePulse } from "@/components/effects/passive/PassivePulse";
import { PassiveExit } from "@/components/effects/passive/PassiveExit";

type Stage = "spawn" | "aura" | "pulse" | "exit";

const SQUARE_PX = 26;
const METRICS: BoardMetrics = { squarePx: SQUARE_PX, originX: 0, originY: 0, orientation: "white" };

// Demo target squares (0..63, rank-major) per target type, kept small so a mini
// board stays legible and node budgets are visible.
function demoSquares(target: PassiveTargetType): number[] {
  switch (target) {
    case "piece":
      return [28];
    case "pieceClass":
      return [26, 28, 30];
    case "square":
      return [28];
    case "movement":
    case "capture":
      return [28];
    case "file":
      return [3, 11, 19, 27, 35, 43, 51, 59]; // d-file
    case "rank":
      return [24, 25, 26, 27, 28, 29, 30, 31]; // rank 4
    case "zone":
      return [8, 9, 10, 11, 16, 17, 18, 19]; // a 4x2 block
    case "board":
    case "clock":
    case "winCondition":
    case "hidden":
      return [];
  }
}

function MiniBoard({ squarePx = SQUARE_PX, children }: { squarePx?: number; children: React.ReactNode }) {
  const size = squarePx * 8;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flex: "0 0 auto",
        background:
          "repeating-conic-gradient(#2b2620 0% 25%, #38312a 0% 50%) 0 0 / " +
          `${squarePx * 2}px ${squarePx * 2}px`,
        boxShadow: "inset 0 0 0 1px var(--edge)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardTile({
  v,
  stage,
  reduced,
  nonce,
}: {
  v: PassiveVisual;
  stage: Stage;
  reduced: boolean;
  nonce: number;
}) {
  const squares = demoSquares(v.targetType);
  const common = {
    cardId: v.cardId,
    cardFamily: v.cardFamily,
    color: "white" as const,
    targetSquares: squares,
    boardMetrics: METRICS,
    reduced,
  };
  return (
    <div className="plate" style={{ display: "flex", gap: 12, alignItems: "center", padding: 10 }}>
      <MiniBoard>
        {/* Aura shown beneath the active stage for context, except during aura
            stage itself (where it is the subject). */}
        {stage !== "aura" && <PassiveAura {...common} />}
        {stage === "spawn" && <PassiveSpawn {...common} activationPly={nonce} />}
        {stage === "aura" && <PassiveAura {...common} />}
        {stage === "pulse" && <PassivePulse {...common} nonce={nonce} />}
        {stage === "exit" && <PassiveExit key={nonce} {...common} />}
      </MiniBoard>
      <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 600, color: "var(--paper)", wordBreak: "break-word" }}>{v.cardId}</div>
        <div style={{ color: "var(--paper-dim)" }}>
          {v.cardFamily} - tier {v.tier} - {v.targetType}
        </div>
        <div style={{ color: "var(--paper-dim)" }}>{v.composition.join(" + ")}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: v.color, display: "inline-block" }} />
          <span style={{ color: "var(--paper-dim)" }}>
            {v.paletteRole} - {v.sigilIcon}
          </span>
        </div>
      </div>
    </div>
  );
}

// Side-by-side aura comparison: three cards with different aura keys and
// palette roles rendered simultaneously on ONE board, so distinguishability at
// board scale is directly reviewable.
const COMPARE: Array<{ cardId: string; cardFamily: "nerf" | "buff"; squares: number[]; note: string }> = [
  // rankWash, lava red, rank 6
  { cardId: "wn_floor_is_lava", cardFamily: "nerf", squares: [40, 41, 42, 43, 44, 45, 46, 47], note: "rank wash (lava)" },
  // pieceRing, gold, three rank-2 pawns
  { cardId: "hoarder", cardFamily: "nerf", squares: [9, 11, 13], note: "piece rings (gold)" },
  // pieceRing, lightning cyan, king square e4
  { cardId: "bottled_lightning", cardFamily: "nerf", squares: [28], note: "piece ring (lightning)" },
];

function AuraCompareRow() {
  const squarePx = 40;
  const metrics: BoardMetrics = { squarePx, originX: 0, originY: 0, orientation: "white" };
  return (
    <section className="plate" data-testid="aura-compare" style={{ padding: 14, marginBottom: 18 }}>
      <div style={{ marginBottom: 8 }}>
        Aura comparison
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <MiniBoard squarePx={squarePx}>
          {COMPARE.map((c) => (
            <PassiveAura
              key={c.cardId}
              cardId={c.cardId}
              cardFamily={c.cardFamily}
              color="white"
              targetSquares={c.squares}
              boardMetrics={metrics}
            />
          ))}
        </MiniBoard>
        <div style={{ fontSize: 13, color: "var(--paper-dim)", lineHeight: 1.6, maxWidth: 360 }}>
          <p style={{ margin: 0, color: "var(--paper)" }}>
            Three passives live on one board. Each aura must stay identifiable next to the others.
          </p>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {COMPARE.map((c) => (
              <li key={c.cardId}>
                <span style={{ color: "var(--paper)" }}>{c.cardId}</span> - {c.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function EffectsGallery() {
  const [stage, setStage] = React.useState<Stage>("aura");
  const [reduced, setReduced] = React.useState(false);
  const [tierMin, setTierMin] = React.useState(1);
  const [tierMax, setTierMax] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [nonce, setNonce] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // Drive the app-level animations-off switch from the reduced-motion toggle so
  // the CSS gate is exercised exactly as it is in the real app.
  React.useEffect(() => {
    document.documentElement.setAttribute("data-anim", reduced ? "off" : "on");
    return () => {
      document.documentElement.removeAttribute("data-anim");
    };
  }, [reduced]);

  const q = search.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      PASSIVE_VISUALS.filter(
        (v) =>
          v.tier >= tierMin &&
          v.tier <= tierMax &&
          (q === "" ||
            v.cardId.toLowerCase().includes(q) ||
            v.family.includes(q) ||
            v.targetType.includes(q) ||
            v.sigilIcon.toLowerCase().includes(q)),
      ),
    [tierMin, tierMax, q],
  );

  const byFamily = React.useMemo(() => {
    const m = new Map<PassiveFamily, PassiveVisual[]>();
    for (const fam of PASSIVE_FAMILIES) m.set(fam, []);
    for (const v of filtered) m.get(v.family)!.push(v);
    return m;
  }, [filtered]);

  function replay() {
    resetPassiveActivations();
    setNonce((n) => n + 1);
  }

  const controlStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--ink-deep) 60%, transparent)",
    border: "1px solid var(--edge)",
    color: "var(--paper)",
    borderRadius: 1,
    padding: "5px 10px",
    fontSize: 13,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--paper-dim)",
    display: "flex",
    gap: 6,
    alignItems: "center",
  };

  return (
    <div style={{ minHeight: "100vh", color: "var(--paper)", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: "var(--step-3, 20px)", fontWeight: 700, margin: 0, color: "var(--paper)" }}>
          Passive effect gallery
        </h1>
        <p style={{ fontSize: 13, color: "var(--paper-dim)", margin: "4px 0 0" }}>
          {filtered.length} of {PASSIVE_VISUALS.length} passives, grouped by family. Local demo board, no engine.
        </p>
      </header>

      <div
        className="plate"
        style={{
          position: "sticky",
          top: 8,
          zIndex: 5,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          padding: "10px 14px",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(["spawn", "aura", "pulse", "exit"] as Stage[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStage(s);
                replay();
              }}
              className={stage === s ? "btn-leaf press" : "btn-ghost press"}
              style={{ padding: "5px 12px", fontSize: 13, cursor: "pointer" }}
            >
              {s}
            </button>
          ))}
        </div>

        <button onClick={replay} className="btn-ghost press" style={{ padding: "5px 12px", fontSize: 13, cursor: "pointer" }}>
          Replay
        </button>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          reduced motion
        </label>

        <label style={labelStyle}>
          tier
          <select value={tierMin} onChange={(e) => setTierMin(Number(e.target.value))} style={controlStyle}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          to
          <select value={tierMax} onChange={(e) => setTierMax(Number(e.target.value))} style={controlStyle}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <input
          type="search"
          placeholder="search id, family, target, sigil"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...controlStyle, minWidth: 220 }}
        />
      </div>

      <AuraCompareRow />

      {PASSIVE_FAMILIES.map((fam) => {
        const cards = byFamily.get(fam) ?? [];
        if (cards.length === 0) return null;
        const open = expanded[fam] ?? false;
        return (
          <section key={fam} style={{ marginBottom: 12 }}>
            <button
              onClick={() => setExpanded((e) => ({ ...e, [fam]: !open }))}
              data-family-toggle={fam}
              className="plate plate-hover press"
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 14px",
                color: "var(--paper)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span style={{ textTransform: "capitalize" }}>
                <span style={{ color: open ? "var(--accent)" : "var(--paper-dim)", marginRight: 8 }}>
                  {open ? "v" : ">"}
                </span>
                {fam}
              </span>
              <span style={{ color: "var(--paper-dim)", fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>
                {cards.length}
              </span>
            </button>
            {open && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                {cards.map((v) => (
                  <CardTile key={`${v.cardFamily}:${v.cardId}`} v={v} stage={stage} reduced={reduced} nonce={nonce} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
