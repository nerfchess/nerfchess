"use client";

import type { BuffInstance } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { useEffect, useRef, useState } from "react";

interface Notice {
  key: number;
  text: string;
  leaving: boolean;
}

/**
 * Floating notice for draft games: announces the opponent's public draft
 * actions (a new held buff, a banked draft) the moment they happen, then
 * fades after a few seconds. Driven purely by diffing the opponent's buff
 * count and bank flag between renders, so the bot game and the online view
 * can both feed it their opponent's PlayerBuffState fields. Render inside a
 * relatively positioned wrapper near the board.
 */
export function DraftNotice({ buffs, banked }: { buffs: BuffInstance[]; banked: boolean }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextKey = useRef(0);
  const prevCount = useRef(buffs.length);
  const prevBanked = useRef(banked);
  const timers = useRef<number[]>([]);
  const count = buffs.length;

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    const texts: string[] = [];
    if (count > prevCount.current) {
      for (const inst of buffs.slice(prevCount.current)) {
        texts.push(`Opponent drafted ${BUFF_BY_ID[inst.id]?.name ?? "a buff"}`);
      }
    }
    prevCount.current = count;
    if (banked && !prevBanked.current) texts.push("Opponent banked their draft");
    prevBanked.current = banked;
    if (texts.length === 0) return;
    const fresh = texts.map((text) => ({ key: nextKey.current++, text, leaving: false }));
    const keys = new Set(fresh.map((n) => n.key));
    setNotices((cur) => [...cur, ...fresh]);
    timers.current.push(
      window.setTimeout(() => {
        setNotices((cur) => cur.map((n) => (keys.has(n.key) ? { ...n, leaving: true } : n)));
      }, 3200),
      window.setTimeout(() => {
        setNotices((cur) => cur.filter((n) => !keys.has(n.key)));
      }, 3600),
    );
    // The engine mutates the buffs array in place, so its length (not its
    // identity) is the render-to-render signal that the opponent drafted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, banked]);

  if (notices.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-2 z-30 flex flex-col items-center gap-1"
    >
      {notices.map((n) => (
        <div
          key={n.key}
          className={
            "animate-rise border border-gold/40 bg-ink-700/95 px-3 py-1.5 shadow-plate backdrop-blur-sm " +
            "font-display text-xs font-semibold text-parchment transition-opacity duration-300 " +
            (n.leaving ? "opacity-0" : "opacity-100")
          }
        >
          <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 bg-gold-leaf align-middle" />
          {n.text}
        </div>
      ))}
    </div>
  );
}
