"use client";

import { useEffect } from "react";

/**
 * Tiny client helper for the glossary page: entries render as native
 * <details> (server-rendered, crawlable), but a closed <details> targeted by
 * a #fragment would scroll into view without revealing its body. This opens
 * the targeted entry on load and on every in-page hash change, then lets the
 * browser's normal anchor scrolling do the rest. Renders nothing.
 */
export function GlossaryHashJump() {
  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        // Re-run the scroll after opening: expanding earlier entries above the
        // target can shift it, and initial navigation may have scrolled before
        // hydration opened anything.
        el.scrollIntoView({ block: "start" });
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return null;
}
