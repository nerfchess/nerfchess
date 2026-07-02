"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Hit {
  username: string;
  rating: number;
  games: number;
}

// Debounced prefix search over account usernames; picking a result opens the
// player's profile.
export function PlayerSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { players: Hit[] };
        setHits(data.players);
        setOpen(true);
      } catch {}
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [query]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={boxRef} className={"relative " + className}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) {
            // Hard navigation: router.push from a keydown inside this input
            // proved unreliable in the packaged worker build.
            e.preventDefault();
            window.location.assign(`/u/${hits[0].username}`);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Find a player…"
        aria-label="Search players"
        maxLength={20}
        className="w-full rounded-sm border border-white/15 bg-ink-900/60 px-4 py-2.5 text-sm text-parchment placeholder:text-parchment-400/50 focus:border-gold/60 focus:outline-none"
      />
      {open && hits.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 plate divide-y divide-white/5 overflow-hidden shadow-2xl">
          {hits.map((hit) => (
            <button
              key={hit.username}
              type="button"
              onClick={() => {
                router.push(`/u/${hit.username}`);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.05]"
            >
              <span className="min-w-0 truncate font-medium text-parchment-100">{hit.username}</span>
              <span className="shrink-0 font-mono text-parchment-400">
                {Math.round(hit.rating)} · {hit.games}g
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && hits.length === 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 plate px-4 py-2.5 text-sm text-parchment-400 shadow-2xl">
          No players match “{query.trim()}”.
        </div>
      )}
    </div>
  );
}
