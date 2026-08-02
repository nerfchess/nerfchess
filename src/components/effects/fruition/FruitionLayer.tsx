// FruitionLayer: board art for the moment a rule or effect actually bites.
//
// Consumes the engine's per-cycle fx-event log (game.fx, src/engine/fxEvents.ts)
// and renders small one-shot pulses inside the board crop:
//   - nerf-constrained  -> clamp bars on the squares whose pieces lost every
//                          move (the handicap made itself felt);
//   - nerf-relaxed      -> a gold frame release (the safety net loosened it);
//   - effect-applied    -> the victim-side receive beat on the affected
//                          squares (hostile ring seating on) or a ward rising
//                          on the viewer's own protected squares; square-less
//                          constraints breathe the whole frame once;
//   - effect-expired    -> the seat ring loosening and drifting off.
//
// Mounted next to PassiveLayer in the crop's one-shot band; measures itself
// the same way. Every item is removed by React on its animationend, with a
// timeout backstop so a missed end event can never leave art stuck on the
// board (the fx-one-shot lesson). First observation seeds silently: a
// reconnect or replica rebuild regenerates the LAST cycle's events, and
// replaying them as fresh art is exactly the stuck-flash bug class this
// layer must never reintroduce.

"use client";

import * as React from "react";
import type { ActiveEffect } from "@/engine/buff";
import { effectIsCosmetic, effectVictim, type FxEvent } from "@/engine/fxEvents";
import type { Color } from "@/engine/types";
import "./fruition.css";

export interface FruitionLayerProps {
  /** The engine's transient fx log for the latest apply cycle (game.fx). */
  fx?: FxEvent[] | null;
  /** The local player (victim-side receives are theirs). Spectators pass the
   *  bottom-of-board side so hostile art still reads coherently. */
  viewerColor: Color;
  /** Side shown at the board bottom. */
  orientation: Color;
  /** History review: suppress everything (scrubbing never fires fruition). */
  reviewing?: boolean;
  /** fx-hidden pref stands the whole layer down. */
  fxHidden?: boolean;
}

type ItemKind = "clamp" | "receive" | "ward" | "expire" | "frame" | "frame-release";

interface Item {
  uid: number;
  kind: ItemKind;
  squares: number[];
}

const MAX_SQUARES = 8;
const MAX_ITEMS = 6;
/** Backstop removal: past every family's longest run at the slowest dial. */
const CLEANUP_MS = 3000;

function effectSquares(e: ActiveEffect): number[] {
  switch (e.kind) {
    case "freeze":
    case "walnut":
    case "timed_loss":
    case "cosmetic":
      return [e.sq];
    case "shield":
      return e.squares ?? [];
    case "barred":
    case "strike":
    case "bonk":
      return e.squares;
    default:
      return [];
  }
}

/** Fold one engine event into zero or more render items, viewer-relative. */
function itemsForEvent(ev: FxEvent, viewer: Color, next: () => number): Item[] {
  switch (ev.kind) {
    case "nerf-constrained": {
      if (ev.fromSquares.length === 0) return [];
      return [{ uid: next(), kind: "clamp", squares: ev.fromSquares.slice(0, MAX_SQUARES) }];
    }
    case "nerf-relaxed":
      return ev.color === viewer ? [{ uid: next(), kind: "frame-release", squares: [] }] : [];
    case "effect-applied": {
      const e = ev.effect;
      if (effectIsCosmetic(e)) return [];
      const squares = effectSquares(e).slice(0, MAX_SQUARES);
      const victim = effectVictim(e);
      const benefit = e.kind === "shield" || e.kind === "king_safe" || e.kind === "nerf_suspended";
      if (benefit) {
        // A protection rising over the viewer's own squares; square-less
        // benefits (king-safe, a suspended nerf) breathe the frame in gold.
        if (e.kind === "nerf_suspended" || victim !== viewer) {
          if ("owner" in e && e.owner === viewer) {
            return squares.length > 0
              ? [{ uid: next(), kind: "ward", squares }]
              : [{ uid: next(), kind: "frame-release", squares: [] }];
          }
        }
        return [];
      }
      // Hostile landing: the victim-side receive beat. The caster's own cast
      // art already tells their side of the story.
      if (victim !== viewer) return [];
      return squares.length > 0
        ? [{ uid: next(), kind: "receive", squares }]
        : [{ uid: next(), kind: "frame", squares: [] }];
    }
    case "effect-expired": {
      const e = ev.effect;
      if (effectIsCosmetic(e)) return [];
      const squares = effectSquares(e).slice(0, MAX_SQUARES);
      const victim = effectVictim(e);
      const mine = victim === viewer || ("owner" in e && e.owner === viewer);
      if (!mine) return [];
      if (squares.length > 0) return [{ uid: next(), kind: "expire", squares }];
      // A square-less shackle lifting off the viewer is a release.
      return victim === viewer ? [{ uid: next(), kind: "frame-release", squares: [] }] : [];
    }
    default:
      return [];
  }
}

export function FruitionLayer({
  fx,
  viewerColor,
  orientation,
  reviewing = false,
  fxHidden = false,
}: FruitionLayerProps): React.ReactElement | null {
  const uidRef = React.useRef(0);
  const [items, setItems] = React.useState<Item[]>([]);
  const timersRef = React.useRef(new Map<number, number>());

  const removeItem = React.useCallback((uid: number) => {
    const t = timersRef.current.get(uid);
    if (t !== undefined) {
      window.clearTimeout(t);
      timersRef.current.delete(uid);
    }
    setItems((cur) => cur.filter((i) => i.uid !== uid));
  }, []);

  // Consume each NEW fx array exactly once (reference identity: the engine
  // builds a fresh array per apply cycle). The first observation seeds
  // silently, covering mount-after-rebuild.
  const lastFxRef = React.useRef<FxEvent[] | null | undefined>(undefined);
  React.useEffect(() => {
    const prev = lastFxRef.current;
    lastFxRef.current = fx;
    if (prev === undefined) return; // seed: never replay a rebuilt cycle
    if (!fx || fx === prev || reviewing || fxHidden) return;
    const next = () => ++uidRef.current;
    const fresh = fx.flatMap((ev) => itemsForEvent(ev, viewerColor, next)).slice(0, MAX_ITEMS);
    if (fresh.length === 0) return;
    for (const item of fresh) {
      timersRef.current.set(
        item.uid,
        window.setTimeout(() => removeItem(item.uid), CLEANUP_MS),
      );
    }
    setItems((cur) => [...cur, ...fresh].slice(-MAX_ITEMS * 2));
  }, [fx, reviewing, fxHidden, viewerColor, removeItem]);

  // All timers die with the layer.
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  if (fxHidden || items.length === 0) return null;

  const cell = (sq: number): React.CSSProperties => {
    const file = sq % 8;
    const rank = Math.floor(sq / 8);
    const col = orientation === "w" ? file : 7 - file;
    const row = orientation === "w" ? 7 - rank : rank;
    return {
      position: "absolute",
      left: `${col * 12.5}%`,
      top: `${row * 12.5}%`,
      width: "12.5%",
      height: "12.5%",
    };
  };

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden data-fruition-layer>
      {items.map((item) => {
        // The LAST-ending child reports the item done; the timeout backstops.
        const done = () => removeItem(item.uid);
        if (item.kind === "frame" || item.kind === "frame-release") {
          return (
            <div
              key={item.uid}
              className={"frx-frame" + (item.kind === "frame-release" ? " frx-frame--release" : "")}
              onAnimationEnd={done}
            />
          );
        }
        return (
          <div key={item.uid} className="absolute inset-0">
            {item.squares.map((sq, i) => (
              <div key={sq} style={cell(sq)}>
                {item.kind === "clamp" && (
                  <>
                    <span className="frx-clamp-bar frx-clamp-bar--l" />
                    <span className="frx-clamp-bar frx-clamp-bar--r" />
                    <span
                      className="frx-clamp-ring"
                      onAnimationEnd={i === item.squares.length - 1 ? done : undefined}
                    />
                  </>
                )}
                {item.kind === "receive" && (
                  <>
                    <span className="frx-receive-ring" />
                    <span
                      className="frx-receive-tick"
                      onAnimationEnd={i === item.squares.length - 1 ? done : undefined}
                    />
                  </>
                )}
                {item.kind === "ward" && (
                  <>
                    <span className="frx-ward-ring" />
                    <span
                      className="frx-ward-glint"
                      onAnimationEnd={i === item.squares.length - 1 ? done : undefined}
                    />
                  </>
                )}
                {item.kind === "expire" && (
                  <span
                    className="frx-expire-ring"
                    onAnimationEnd={i === item.squares.length - 1 ? done : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default FruitionLayer;
