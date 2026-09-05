"use client";

// The dock moved to src/components/dock/ (DockNow, DockAgainstYou, DockRow,
// targeting, bits) as part of the progressive-disclosure redesign. This shim
// preserves the historical import surface — OnlineMatch, the game pages,
// BoardSplash, and MobileBuffDrawer all keep importing from "./BuffDock".

export {
  BuffDock,
  EnemyBuffModal,
  TargetingBanner,
  againstYouRows,
  useBuffTargeting,
  type AgainstRow,
  type BuffTargeting,
} from "./dock";
