// PassiveLayer: the mounted passive lifecycle for a live board surface.
//
// Given the normalized live-passive list the surface derives (both families,
// already visibility-filtered), this layer renders the full lifecycle from
// docs/passive-effect-language.md section 7 inside the board's overflow clip:
//   - PassiveAura for every live passive at its registry target (stage 3);
//   - PassiveSpawn once per stable activation (stage 1), for buff acquisitions
//     (client-observed diff) and nerf reveals (reveal variant), queued FIFO
//     250ms apart so simultaneous activations never overwrite one slot (R9);
//   - PassivePulse when a passive alters (lastHookMutations) or rejects (the
//     invalid-input path) an action (stage 4);
//   - PassiveExit when a passive leaves the list (spent / nullified / removed,
//     stage 5).
//
// It measures its own container for board metrics, so it needs no page layout
// knowledge. Z-order: mounted inside the crop, above the squares, below the
// drag layer and HUD (BoardEffects z-band). Auras are information and remain
// under reduced motion; only intros/pulses collapse to the static fallback.

"use client";

import * as React from "react";
import type { BuffMatchState } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { Color } from "@/engine/types";
import type { BoardMetrics } from "./contract";
import { toSide, type PassiveAuraEntry } from "./derive";
import { getPassiveVisual } from "./registry";
import { activationId, hasPlayedActivation } from "./runtime";
import { PassiveAura } from "./PassiveAura";
import { PassiveSpawn } from "./PassiveSpawn";
import { PassivePulse } from "./PassivePulse";
import { PassiveExit } from "./PassiveExit";

/** The reveal-moment shape PassiveLayer needs (Board.NerfRevealInfo is a
 *  structural superset). */
export interface RevealSignal {
  id: string;
  color: Color;
  highlightSquares?: number[];
}

export interface PassiveLayerProps {
  /** Persistent auras (both families), visibility-filtered by the surface. */
  auras: PassiveAuraEntry[];
  /** Side shown at the board bottom (engine color). */
  orientation: Color;
  /** History review is active: keep auras, suppress live spawns/pulses/exits.
   *  Replay-crossing spawns are driven by `auras` changes as plies advance. */
  reviewing?: boolean;
  /** Reveal-moment events: fire a reveal-variant spawn once per color:id. */
  nerfReveals?: RevealSignal[];
  /** buffs.lastHookMutations for the current move; drives alteration pulses. */
  hookMutations?: { color: Color; index: number }[] | null;
  /** Bumps whenever a new ply's hook mutations arrive (so a repeat card at a
   *  new ply re-pulses). */
  hookPlyKey?: number;
  /** Resolve hook indices to card ids. */
  buffs?: BuffMatchState | null;
  /** Rejected-input feedback: {sq,key}. Pulses the passive owning that square. */
  invalid?: { sq: number; key: number } | null;
  /** fx-hidden pref stands the whole layer down. */
  fxHidden?: boolean;
}

interface SpawnItem {
  uid: number;
  cardId: string;
  cardFamily: "buff" | "nerf";
  color: Color;
  targetSquares: number[];
  activationPly: string;
  reveal: boolean;
}

interface PulseState {
  uid: number;
  cardId: string;
  cardFamily: "buff" | "nerf";
  color: Color;
  squares: number[];
  nonce: number;
}

interface ExitItem {
  uid: number;
  cardId: string;
  cardFamily: "buff" | "nerf";
  color: Color;
  targetSquares: number[];
}

const SPAWN_GAP_MS = 250;
const REVEAL_FLIP_MS = 300;

export function PassiveLayer({
  auras,
  orientation,
  reviewing = false,
  nerfReveals,
  hookMutations,
  hookPlyKey,
  buffs,
  invalid,
  fxHidden = false,
}: PassiveLayerProps): React.ReactElement | null {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = React.useState<BoardMetrics | null>(null);

  // Measure the layer's own box; it fills the crop, so origin is (0,0) and
  // squarePx is width/8. A ResizeObserver keeps it correct across board resize.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const size = Math.min(w, h);
      if (size > 0) {
        setMetrics({ squarePx: size / 8, originX: 0, originY: 0, orientation: toSide(orientation) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [orientation]);

  // --- Spawn queue (FIFO, 250ms apart via SpawnRunner). --------------------
  // A single queue; the head is queue[0], run by the SpawnRunner child which
  // owns the reveal flip + inter-spawn gap timing and shifts the queue when it
  // completes. Keeping the timing in the child means this component's effects
  // only ever append (functional setState, never a head<->queue cascade).
  const uidRef = React.useRef(0);
  const [queue, setQueue] = React.useState<SpawnItem[]>([]);
  const shiftQueue = React.useCallback(() => setQueue((q) => q.slice(1)), []);

  // --- Buff acquisition detection (client-observed diff). ------------------
  // Seed the seen-set at mount so reconnect / first render never replays intros
  // for already-held passives (docs section 9 reconnect rule). Only genuinely
  // new keys after mount spawn.
  const seenBuffKeysRef = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (reviewing) return;
    const seen = seenBuffKeysRef.current;
    const buffEntries = auras.filter((a) => a.cardFamily === "buff");
    if (seen === null) {
      // First observation: seed, no spawn.
      seenBuffKeysRef.current = new Set(buffEntries.map((a) => a.key));
      return;
    }
    const fresh: SpawnItem[] = [];
    for (const a of buffEntries) {
      if (seen.has(a.key)) continue;
      seen.add(a.key);
      const aid = activationId(a.cardId, toSide(a.color), a.activationPly);
      if (hasPlayedActivation(aid)) continue;
      fresh.push({
        uid: ++uidRef.current,
        cardId: a.cardId,
        cardFamily: "buff",
        color: a.color,
        targetSquares: a.targetSquares,
        activationPly: a.activationPly,
        reveal: false,
      });
    }
    // Drop keys that left so a re-acquire can spawn again.
    const present = new Set(buffEntries.map((a) => a.key));
    for (const k of [...seen]) if (!present.has(k)) seen.delete(k);
    if (fresh.length > 0) queueMicrotask(() => setQueue((q) => [...q, ...fresh]));
  }, [auras, reviewing]);

  // --- Nerf reveal spawns (reveal variant). --------------------------------
  const seenRevealsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (reviewing || !nerfReveals || nerfReveals.length === 0) return;
    const fresh: SpawnItem[] = [];
    for (const r of nerfReveals) {
      const k = `${r.color}:${r.id}`;
      if (seenRevealsRef.current.has(k)) continue;
      seenRevealsRef.current.add(k);
      if (!getPassiveVisual(r.id, "nerf")) continue;
      const aid = activationId(r.id, toSide(r.color), "reveal");
      if (hasPlayedActivation(aid)) continue;
      fresh.push({
        uid: ++uidRef.current,
        cardId: r.id,
        cardFamily: "nerf",
        color: r.color,
        targetSquares: (r.highlightSquares ?? []).filter((s) => s >= 0 && s <= 63),
        activationPly: "reveal",
        reveal: true,
      });
    }
    if (fresh.length > 0) queueMicrotask(() => setQueue((q) => [...q, ...fresh]));
  }, [nerfReveals, reviewing]);

  // --- Trigger pulses (stage 4): alterations + rejections. -----------------
  // A list so several passives altering on ONE ply each pulse (R9), not just
  // the first. Each entry self-clears on its onDone.
  const [pulses, setPulses] = React.useState<PulseState[]>([]);
  const pulseNonceRef = React.useRef(0);
  const removePulse = React.useCallback((uid: number) => {
    setPulses((p) => p.filter((x) => x.uid !== uid));
  }, []);

  // Alteration pulses (lastHookMutations): every fired passive with a board
  // aura pulses its target.
  const lastHookKeyRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (reviewing || fxHidden) return;
    if (hookPlyKey === undefined || hookPlyKey === lastHookKeyRef.current) return;
    lastHookKeyRef.current = hookPlyKey;
    if (!hookMutations || !buffs || auras.length === 0) return;
    const fresh: PulseState[] = [];
    for (const { color, index } of hookMutations) {
      const inst = buffs.players[color].buffs[index];
      if (!inst?.id) continue;
      if (!getPassiveVisual(inst.id, "buff")) continue;
      // Anchor on the passive's own aura squares when it has one on the board
      // (quiet passives -> owner king); skip an unanchored full-board pulse.
      const owner = auras.find((a) => a.cardFamily === "buff" && a.cardId === inst.id && a.color === color);
      if (!owner || owner.targetSquares.length === 0) continue;
      fresh.push({
        uid: ++uidRef.current,
        cardId: inst.id,
        cardFamily: "buff",
        color,
        squares: owner.targetSquares,
        nonce: ++pulseNonceRef.current,
      });
    }
    if (fresh.length > 0) queueMicrotask(() => setPulses((p) => [...p, ...fresh]));
  }, [hookPlyKey, hookMutations, buffs, auras, reviewing, fxHidden]);

  // Rejection pulses (invalid-input path attributable to a rule/card).
  const lastInvalidKeyRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (reviewing || fxHidden || !invalid) return;
    if (invalid.key === lastInvalidKeyRef.current) return;
    lastInvalidKeyRef.current = invalid.key;
    // Attribute only when the rejected square sits inside a live passive's
    // target (a rule/card actually governs that square); generic illegal moves
    // pulse nothing here.
    const owner = auras.find((a) => a.targetSquares.includes(invalid.sq));
    if (!owner) return;
    const entry = {
      uid: ++uidRef.current,
      cardId: owner.cardId,
      cardFamily: owner.cardFamily,
      color: owner.color,
      squares: [invalid.sq],
      nonce: ++pulseNonceRef.current,
    };
    queueMicrotask(() => setPulses((p) => [...p, entry]));
  }, [invalid, auras, reviewing, fxHidden]);

  // --- Exit detection (aura removal diff). ---------------------------------
  const prevAurasRef = React.useRef<Map<string, PassiveAuraEntry>>(new Map());
  const [exits, setExits] = React.useState<ExitItem[]>([]);
  React.useEffect(() => {
    const prev = prevAurasRef.current;
    const next = new Map(auras.map((a) => [a.key, a]));
    if (!reviewing && !fxHidden && prev.size > 0) {
      const gone: ExitItem[] = [];
      for (const [k, a] of prev) {
        if (!next.has(k)) {
          gone.push({
            uid: ++uidRef.current,
            cardId: a.cardId,
            cardFamily: a.cardFamily,
            color: a.color,
            targetSquares: a.targetSquares,
          });
        }
      }
      if (gone.length > 0) queueMicrotask(() => setExits((e) => [...e, ...gone]));
    }
    prevAurasRef.current = next;
  }, [auras, reviewing, fxHidden]);

  const removeExit = React.useCallback((uid: number) => {
    setExits((e) => e.filter((x) => x.uid !== uid));
  }, []);

  if (fxHidden) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
      data-passive-layer
    >
      {metrics && (
        <>
          {/* Persistent auras (stage 3): information, below the one-shots. */}
          <div className="pfx-aura-band absolute inset-0" style={{ zIndex: 6 }}>
            {auras.map((a) => (
              <PassiveAura
                key={a.key}
                cardId={a.cardId}
                cardFamily={a.cardFamily}
                color={toSide(a.color)}
                targetSquares={a.targetSquares}
                boardMetrics={metrics}
              />
            ))}
          </div>

          {/* One-shots (spawn / pulse / exit) above the pieces, below cast. */}
          <div className="pfx-oneshot-band absolute inset-0" style={{ zIndex: 30 }}>
            {queue.length > 0 && (
              <SpawnRunner key={`spawn-${queue[0].uid}`} item={queue[0]} metrics={metrics} onComplete={shiftQueue} />
            )}
            {pulses.map((p) => (
              <PassivePulse
                key={`pulse-${p.uid}`}
                cardId={p.cardId}
                cardFamily={p.cardFamily}
                color={toSide(p.color)}
                targetSquares={p.squares}
                boardMetrics={metrics}
                nonce={p.nonce}
                onDone={() => removePulse(p.uid)}
              />
            ))}
            {exits.map((x) => (
              <PassiveExit
                key={`exit-${x.uid}`}
                cardId={x.cardId}
                cardFamily={x.cardFamily}
                color={toSide(x.color)}
                targetSquares={x.targetSquares}
                boardMetrics={metrics}
                onDone={() => removeExit(x.uid)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Runs ONE queued spawn: an optional 300ms reveal card-flip lead-in, then the
 *  composition, then a 250ms inter-spawn gap before it reports completion so
 *  the parent shifts to the next item. Keying the parent on the item uid gives
 *  each run a fresh mount, so all timing lives here (no parent state cascade). */
function SpawnRunner({
  item,
  metrics,
  onComplete,
}: {
  item: SpawnItem;
  metrics: BoardMetrics;
  onComplete: () => void;
}): React.ReactElement | null {
  const [flipReady, setFlipReady] = React.useState(!item.reveal);
  React.useEffect(() => {
    if (!item.reveal) return;
    const t = window.setTimeout(() => setFlipReady(true), REVEAL_FLIP_MS);
    return () => window.clearTimeout(t);
  }, [item.reveal]);

  const doneRef = React.useRef(onComplete);
  React.useEffect(() => {
    doneRef.current = onComplete;
  });
  const gapTimerRef = React.useRef<number | undefined>(undefined);
  React.useEffect(
    () => () => {
      if (gapTimerRef.current !== undefined) window.clearTimeout(gapTimerRef.current);
    },
    [],
  );
  const handleSpawnDone = React.useCallback(() => {
    gapTimerRef.current = window.setTimeout(() => doneRef.current(), SPAWN_GAP_MS);
  }, []);

  if (!flipReady) return null;
  return (
    <PassiveSpawn
      cardId={item.cardId}
      cardFamily={item.cardFamily}
      color={toSide(item.color)}
      targetSquares={item.targetSquares}
      boardMetrics={metrics}
      activationPly={item.reveal ? "reveal" : item.activationPly}
      onDone={handleSpawnDone}
    />
  );
}

export default PassiveLayer;
