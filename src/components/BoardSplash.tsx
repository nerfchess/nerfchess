"use client";

import { useEffect, useRef, useState } from "react";
import type { AgainstRow } from "./BuffDock";

// Board-wide event splash: when something lands ON you (a turn skip, halted
// pawns, a king-only shackle, a frozen piece...), a big announcement flares
// across the board for about two seconds, then hands off to the permanent
// "Against you" row in the dock. Pointer-events-none throughout: the splash
// never blocks a move.

export type SplashEvent = { key: string; title: string; sub?: string };

/** Watches the "Against you" rows and turns each NEW row into one splash.
 * The first observation seeds silently (joining or reloading a game must not
 * replay every standing constraint), and events queue so simultaneous
 * constraints announce one after another. */
export function useBoardSplash(rows: AgainstRow[]): {
  current: SplashEvent | null;
  dismiss: () => void;
} {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<SplashEvent[]>([]);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(rows.map((r) => r.key));
      return;
    }
    const fresh = rows.filter((r) => !seen.current!.has(r.key));
    if (fresh.length === 0) return;
    for (const r of fresh) seen.current!.add(r.key);
    // Coalesce a BATCH of same-named constraints into ONE splash: a mass
    // freeze (Ice Age locks a whole army) used to enqueue a separate "Frozen
    // piece" splash per square — a dozen pops playing back-to-back for 2.3s
    // each ("the frozen piece things start spamming"). Group this batch by
    // constraint name and announce each group once, with a count when it hit
    // more than one piece.
    const groups = new Map<string, AgainstRow[]>();
    for (const r of fresh) {
      const g = groups.get(r.name);
      if (g) g.push(r);
      else groups.set(r.name, [r]);
    }
    const events = [...groups.values()].map((g) => {
      const first = g[0];
      const durable = first.left !== "Pending" && first.left !== "Until it ends";
      if (g.length === 1) {
        return {
          title: first.name,
          sub: durable ? `${first.detail} ${first.left}.` : first.detail,
        };
      }
      return {
        title: `${first.name} ×${g.length}`,
        sub: durable
          ? `${g.length} of your pieces are affected. ${first.left}.`
          : `${g.length} of your pieces are affected.`,
      };
    });
    setQueue((q) =>
      [...q, ...events.map((e, i) => ({ key: `${e.title}:${q.length + i}`, ...e }))].slice(0, 5),
    );
  }, [rows]);
  return {
    current: queue[0] ?? null,
    dismiss: () => setQueue((q) => q.slice(1)),
  };
}

/** Drop-in host: mount once inside the board's relative wrapper and feed it
 * the current "Against you" rows. Owns the watcher + queue hooks itself, so
 * callers with early returns above their JSX never violate hook order. */
export function BoardSplashHost({ rows }: { rows: AgainstRow[] }) {
  const { current, dismiss } = useBoardSplash(rows);
  if (!current) return null;
  return <BoardSplash event={current} onDone={dismiss} />;
}

export function BoardSplash({ event, onDone }: { event: SplashEvent; onDone: () => void }) {
  // Self-expiring: the pop animation runs ~2.2s; unmount right after so the
  // next queued event (if any) replays the animation from zero.
  useEffect(() => {
    const t = window.setTimeout(onDone, 2300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.key]);
  return (
    <div
      key={event.key}
      role="status"
      aria-live="assertive"
      className="board-splash pointer-events-none absolute inset-0 z-40 grid place-items-center"
    >
      <div className="board-splash-card px-4 text-center">
        <div className="board-splash-title font-display">{event.title}</div>
        {event.sub && <div className="board-splash-sub mt-1.5">{event.sub}</div>}
      </div>
    </div>
  );
}
