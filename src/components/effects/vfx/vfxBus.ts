// Tiny pub/sub bridging game logic to whatever VfxLayer is mounted.
// Plays fired with no subscriber are dropped silently.

import type { VfxPlay } from "./types";

type VfxListener = (spec: VfxPlay) => void;

const listeners = new Set<VfxListener>();

/** Fire a VFX play. No-op (silent drop) when nothing is subscribed. */
export function vfxPlay(spec: VfxPlay): void {
  if (listeners.size === 0) return;
  for (const cb of Array.from(listeners)) {
    try {
      cb(spec);
    } catch {
      // one bad subscriber must never break the others
    }
  }
}

/** Subscribe to VFX plays. Returns an unsubscribe function. */
export function onVfx(cb: VfxListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
