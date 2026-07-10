"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Hit {
  username: string;
  rating: number;
  games: number;
}

// Debounced prefix search over account usernames; picking a result opens the
// player's profile.
export function PlayerSearch({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  // In-flight indicator: lets the dropdown open the instant a query is worth
  // running, showing a "Searching…" line rather than sitting blank, so typing
  // always feels answered even before the network responds.
  const [pending, setPending] = useState(false);
  // Keyboard-highlighted result (arrow keys). -1 means none selected yet.
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  // Monotonic id for the most recently issued query. A slow older response
  // whose id no longer matches is dropped, so results never flicker backwards.
  const latestReqId = useRef(0);

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [autoFocus]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setPending(false);
      setActive(-1);
      return;
    }
    // Open and flag pending immediately: the panel reacts on the same frame as
    // the keystroke, so results feel snappy even while the fetch is in flight.
    setPending(true);
    setOpen(true);
    const controller = new AbortController();
    const reqId = ++latestReqId.current;
    // Tight debounce so results feel instant while still coalescing bursts of
    // fast typing (lichess uses a similarly short window).
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { players: Hit[] };
        // Guard against out-of-order responses: only the newest query may
        // write results, even if an earlier request resolves late.
        if (reqId !== latestReqId.current) return;
        setHits(data.players);
        setActive(data.players.length > 0 ? 0 : -1);
        setOpen(true);
      } catch {
        /* aborted or offline: keep the last good results up */
      } finally {
        // Only the newest request may clear the spinner; a late loser leaves it
        // to the request that superseded it.
        if (reqId === latestReqId.current) setPending(false);
      }
    }, 90);
    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [query]);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    // Hard navigation: router.push from a keydown inside this input proved
    // unreliable in the packaged worker build.
    // Encoded like every other profile link (lobby, leaderboard): a username
    // is server-validated, but the URL must never depend on that.
    window.location.assign(`/u/${encodeURIComponent(hit.username)}`);
  };

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
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => (hits.length > 0 || pending) && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (hits.length ? Math.min(i + 1, hits.length - 1) : -1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (hits.length ? Math.max(i - 1, 0) : -1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(hits[active >= 0 ? active : 0]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Find a player…"
        aria-label="Search players"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && hits[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={20}
        className="w-full rounded-sm border border-white/15 bg-ink-900/60 px-4 py-2.5 text-base sm:text-sm text-parchment placeholder:text-parchment-400/50 focus:border-gold/60 focus:outline-none"
      />
      {open && hits.length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 plate dropdown divide-y divide-white/5 overflow-hidden shadow-2xl"
        >
          {hits.map((hit, i) => (
            <button
              key={hit.username}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                // Reuse the same hard navigation the keyboard path uses: plain
                // router.push proved unreliable in the packaged worker build.
                setOpen(false);
                go(hit);
              }}
              className={
                "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors " +
                (i === active ? "bg-white/[0.06]" : "hover:bg-white/[0.05]")
              }
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
        <div className="absolute inset-x-0 top-full z-30 mt-1 plate dropdown px-4 py-2.5 text-sm text-parchment-400 shadow-2xl">
          {pending ? "Searching…" : `No players match “${query.trim()}”.`}
        </div>
      )}
    </div>
  );
}
