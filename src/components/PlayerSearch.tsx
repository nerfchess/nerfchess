"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fetchTopStandings, placementTitle, type TopStandings } from "@/lib/laurels";
import { fetchMe } from "@/lib/authClient";
import { isAllowedFlair } from "@/lib/flair";
import { useLobbyFeed, derivePresence } from "@/lib/presence";
import { LaurelBadge } from "./LaurelBadge";
import { PlayerAvatar } from "./PlayerAvatar";
import { PresenceBadge } from "./PresenceBadge";

interface Hit {
  username: string;
  rating: number;
  games: number;
  avatar: string | null;
  flair: string | null;
}

// A previously opened profile, remembered so an empty search box offers a
// "Recent" list. We keep only what a row needs to render (laurels and presence
// are re-derived live from the standings/lobby feeds, not stored).
interface RecentItem {
  username: string;
  rating: number;
  avatar: string | null;
  flair: string | null;
}

const RECENT_KEY = "nerfchess.recentSearches";
const RECENT_MAX = 5;

function readRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Tolerate older/partial shapes: keep only entries with a username.
    return parsed
      .filter((e): e is RecentItem => !!e && typeof (e as RecentItem).username === "string")
      .slice(0, RECENT_MAX)
      .map((e) => ({
        username: e.username,
        rating: typeof e.rating === "number" ? e.rating : 0,
        avatar: typeof e.avatar === "string" ? e.avatar : null,
        flair: typeof e.flair === "string" ? e.flair : null,
      }));
  } catch {
    return [];
  }
}

function writeRecent(items: RecentItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX)));
  } catch {
    /* storage full or unavailable: recent list is a convenience, never fatal */
  }
}

// Debounced prefix/substring search over account usernames; picking a result
// opens the player's profile. An empty, focused box offers recently opened
// profiles instead.
export function PlayerSearch({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  // In-flight indicator: lets the dropdown open the instant a query is worth
  // running, showing a "Searching…" line rather than sitting blank, so typing
  // always feels answered even before the network responds.
  const [pending, setPending] = useState(false);
  // A non-abort fetch failure: the dropdown shows an error line with Retry
  // instead of a misleading "no players" empty state.
  const [error, setError] = useState(false);
  // Keyboard-highlighted row (arrow keys), indexing whichever list is showing
  // (results or recent). -1 means none selected yet.
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  // Monotonic id for the most recently issued query. A slow older response
  // whose id no longer matches is dropped, so results never flicker backwards.
  const latestReqId = useRef(0);
  // Bumped by Retry to re-run the effect for the current query.
  const [retryTick, setRetryTick] = useState(0);
  // Current top-10 standings, so laurelled players wear their badge in the
  // results. Loaded lazily on the first result set (module-cached, so repeat
  // searches and other surfaces share one fetch); null until then.
  const [standings, setStandings] = useState<TopStandings | null>(null);
  // Recently opened profiles (localStorage), shown when the box is empty.
  const [recent, setRecent] = useState<RecentItem[]>([]);
  // Lowercased usernames of the signed-in viewer's accepted friends, so hits
  // that are friends wear a "Friend" tag. Lazily fetched once per mount for
  // signed-in (non-guest) users; stays null for guests / signed-out / on error.
  const [friends, setFriends] = useState<Set<string> | null>(null);
  const friendsLoaded = useRef(false);

  // Live lobby snapshot for per-row presence (shared, refcounted poll).
  const lobby = useLobbyFeed();

  useEffect(() => {
    // localStorage is client-only, so the recent list must be hydrated after
    // mount (reading it during render would diverge from the server's empty
    // paint). It is never shown until the box is focused, so this one-shot sync
    // is invisible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    if (hits.length === 0 || standings) return;
    let cancelled = false;
    fetchTopStandings()
      .then((map) => {
        if (!cancelled) setStandings(map);
      })
      .catch(() => {
        /* laurels are decoration; search works fine without them */
      });
    return () => {
      cancelled = true;
    };
  }, [hits, standings]);

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [autoFocus]);

  // Lazily learn the viewer's friends the first time the box is used. Guests and
  // signed-out visitors get no friend tags; a failed fetch degrades silently.
  const loadFriends = () => {
    if (friendsLoaded.current) return;
    friendsLoaded.current = true;
    (async () => {
      const me = await fetchMe();
      if (!me || me.isGuest) return;
      try {
        const res = await fetch("/api/friends");
        if (!res.ok) return;
        const data = (await res.json()) as { friends?: { username: string }[] };
        setFriends(new Set((data.friends ?? []).map((f) => f.username.toLowerCase())));
      } catch {
        /* signed-in but the request failed: skip friend tags this session */
      }
    })();
  };

  // React to the query change during render so the panel updates on the same
  // frame as the keystroke (snappy), leaving the effect below to run only the
  // debounced fetch.
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setError(false);
    if (query.trim().length < 2) {
      setHits([]);
      setPending(false);
      // An empty box with recents keeps the dropdown open on the Recent list.
      setActive(query.trim().length === 0 && recent.length > 0 ? 0 : -1);
    } else {
      setPending(true);
      setOpen(true);
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const reqId = ++latestReqId.current;
    // Tight debounce so results feel instant while still coalescing bursts of
    // fast typing (lichess uses a similarly short window).
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`search failed: ${res.status}`);
        const data = (await res.json()) as { players: Hit[] };
        // Guard against out-of-order responses: only the newest query may
        // write results, even if an earlier request resolves late.
        if (reqId !== latestReqId.current) return;
        setHits(data.players);
        setActive(data.players.length > 0 ? 0 : -1);
        setError(false);
        setOpen(true);
      } catch {
        // An aborted request (new keystroke or unmount) is not an error: keep
        // the last good results up and let the superseding request own the UI.
        if (controller.signal.aborted || reqId !== latestReqId.current) return;
        setHits([]);
        setActive(-1);
        setError(true);
        setOpen(true);
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
  }, [query, retryTick]);

  const retry = () => {
    setError(false);
    setPending(true);
    setRetryTick((t) => t + 1);
  };

  const rememberRecent = (item: RecentItem) => {
    const key = item.username.toLowerCase();
    const next = [item, ...recent.filter((r) => r.username.toLowerCase() !== key)].slice(0, RECENT_MAX);
    setRecent(next);
    writeRecent(next);
  };

  const removeRecent = (username: string) => {
    const next = recent.filter((r) => r.username.toLowerCase() !== username.toLowerCase());
    setRecent(next);
    writeRecent(next);
    setActive((i) => (next.length ? Math.min(i, next.length - 1) : -1));
    inputRef.current?.focus();
  };

  const go = (item: RecentItem | Hit | undefined) => {
    if (!item) return;
    rememberRecent({
      username: item.username,
      rating: item.rating,
      avatar: item.avatar,
      flair: item.flair,
    });
    // Hard navigation: router.push from a keydown inside this input proved
    // unreliable in the packaged worker build.
    // Encoded like every other profile link (lobby, leaderboard): a username
    // is server-validated, but the URL must never depend on that.
    window.location.assign(`/u/${encodeURIComponent(item.username)}`);
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const q = query.trim();
  const showingResults = open && q.length >= 2;
  const showingRecent = open && q.length === 0 && recent.length > 0;
  // The list the arrow keys currently traverse.
  const navList: (Hit | RecentItem)[] = showingResults ? hits : showingRecent ? recent : [];

  // One row's inner content, shared by result and recent rows.
  const rowContent = (item: Hit | RecentItem) => {
    const top = standings?.get(item.username.toLowerCase())?.[0];
    const presence = derivePresence(lobby, item.username);
    const isFriend = friends?.has(item.username.toLowerCase()) ?? false;
    return (
      <>
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <PlayerAvatar name={item.username} avatar={item.avatar} size={28} className="rounded-sm" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate font-medium text-parchment-100">{item.username}</span>
              {isAllowedFlair(item.flair) && (
                <span aria-hidden className="shrink-0 text-sm leading-none">
                  {item.flair}
                </span>
              )}
              {top && <LaurelBadge rank={top.rank} title={placementTitle(top)} size={12} className="shrink-0" />}
              {isFriend && (
                <span className="smallcaps shrink-0 rounded-sm border border-gold/40 px-1 py-0.5 text-[9px] leading-none text-gold-leaf">
                  Friend
                </span>
              )}
            </span>
            <PresenceBadge
              state={presence.state}
              mode={presence.state === "in-game" ? presence.game?.mode ?? null : null}
            />
          </span>
        </span>
        <span className="shrink-0 self-center font-mono text-parchment-400">{Math.round(item.rating)}</span>
      </>
    );
  };

  return (
    <div ref={boxRef} className={"relative " + className}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          loadFriends();
          if (hits.length > 0 || pending || error || (query.trim().length === 0 && recent.length > 0)) {
            setOpen(true);
            if (query.trim().length === 0 && recent.length > 0) setActive(0);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (navList.length ? Math.min(i + 1, navList.length - 1) : -1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (navList.length ? Math.max(i - 1, 0) : -1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(navList[active >= 0 ? active : 0]);
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
        aria-activedescendant={open && active >= 0 && navList[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={20}
        className="w-full rounded-sm border border-white/15 bg-ink-900/60 px-4 py-2.5 text-base sm:text-sm text-parchment placeholder:text-parchment-400/50 focus:border-gold/60 focus:outline-none"
      />

      {showingResults && !error && hits.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
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
                "flex w-full min-h-[44px] items-center gap-2 px-4 py-2 text-left text-sm transition-colors " +
                (i === active ? "bg-white/[0.06]" : "hover:bg-white/[0.05]")
              }
            >
              {rowContent(hit)}
            </button>
          ))}
        </div>
      )}

      {showingResults && !error && hits.length === 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 plate dropdown px-4 py-2.5 text-sm text-parchment-400 shadow-2xl">
          {pending ? "Searching…" : `No players match “${q}”.`}
        </div>
      )}

      {showingResults && error && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 plate dropdown flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-parchment-400 shadow-2xl">
          <span>Search failed.</span>
          <button type="button" onClick={retry} className="btn-ghost min-h-[44px] px-3 py-1.5 text-xs">
            Retry
          </button>
        </div>
      )}

      {showingRecent && (
        <div
          id={listId}
          role="listbox"
          aria-label="Recent searches"
          className="absolute inset-x-0 top-full z-30 mt-1 plate dropdown overflow-hidden shadow-2xl"
        >
          <p className="smallcaps px-4 pt-2 pb-1 text-[10px] text-parchment-500">Recent</p>
          <div className="divide-y divide-white/5">
            {recent.map((item, i) => (
              <div key={item.username} className="relative flex items-center">
                <button
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setOpen(false);
                    go(item);
                  }}
                  className={
                    "flex w-full min-h-[44px] items-center gap-2 py-2 pl-4 pr-12 text-left text-sm transition-colors " +
                    (i === active ? "bg-white/[0.06]" : "hover:bg-white/[0.05]")
                  }
                >
                  {rowContent(item)}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.username} from recent searches`}
                  onClick={() => removeRecent(item.username)}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-200"
                >
                  <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
