"use client";

import { useEffect, useRef, useState } from "react";
import { BoardSplashHost } from "@/components/BoardSplash";
import type { AgainstRow } from "@/components/BuffDock";
import { DraftRevealBanner } from "@/components/DraftOverlay";

// The draft reveal banner under a parent that re-renders like a live game
// does (a clock tick every 250ms), with the inline onDismiss both real
// callers pass.
function TickingBanner({ onDone }: { onDone: () => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(t);
  }, []);
  return (
    <DraftRevealBanner
      mine={{ banked: true, cards: [] }}
      theirs={{ banked: true, cards: [] }}
      onDismiss={() => onDone()}
    />
  );
}

export function SplashHarness() {
  const [rows, setRows] = useState<AgainstRow[]>([]);
  const n = useRef(0);
  const [banner, setBanner] = useState(false);
  const push = (name: string) => {
    n.current += 1;
    setRows((r) => [
      ...r,
      {
        key: `${name}-${n.current}`,
        name,
        detail: "Your piece on e4 cannot move.",
        left: "1 more turn",
        temporary: true,
      },
    ]);
  };
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="font-display text-xl">Board splash harness</h1>
      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-ghost" onClick={() => push("Frozen piece")}>
          Freeze one
        </button>
        <button type="button" className="btn-ghost" onClick={() => push("Turn skipped")}>
          Skip turn
        </button>
        <button type="button" className="btn-ghost" onClick={() => setBanner(true)}>
          Reveal banner
        </button>
      </div>
      {banner && <TickingBanner onDone={() => setBanner(false)} />}
      <div
        data-splash-stage
        className="relative mt-6 aspect-square w-full border border-[color:var(--edge)] bg-[var(--surface-panel)]"
      >
        <BoardSplashHost rows={rows} />
      </div>
    </main>
  );
}
