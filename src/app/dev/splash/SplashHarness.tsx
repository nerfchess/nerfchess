"use client";

import { useRef, useState } from "react";
import { BoardSplashHost } from "@/components/BoardSplash";
import type { AgainstRow } from "@/components/BuffDock";

export function SplashHarness() {
  const [rows, setRows] = useState<AgainstRow[]>([]);
  const n = useRef(0);
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
      </div>
      <div
        data-splash-stage
        className="relative mt-6 aspect-square w-full border border-[color:var(--edge)] bg-[var(--surface-panel)]"
      >
        <BoardSplashHost rows={rows} />
      </div>
    </main>
  );
}
