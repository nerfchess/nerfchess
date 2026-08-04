"use client";

import { useReducedMotion } from "@/lib/useReducedMotion";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";

import { ChevronRight, History, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// The feed of cards/hexes the opponent has played.
//
// Two homes, one record:
//  - Top-right feed (OppPlaysLog): every play lands here with its full rule
//    text and stays for FEED_TTL_MS (10 seconds). When its time is up it
//    FLIES DOWN into the left dock (shrinking toward [data-buff-dock], the
//    same measurement pattern as the draft overlay's pocket flight).
//  - Left dock (OppPlaysDockSection): the play's permanent home for the rest
//    of the game. The newest few rows arrive with their full rule text
//    expanded; older rows collapse to name + tier and expand on tap.

export interface OppPlay {
  /** Stable, monotonic key for React (a counter, not the card id). */
  key: number;
  card: { id: string; tier: number };
  label: string;
  /** When the play landed (ms epoch). Drives the top-right 10-second TTL. */
  at: number;
}

/** How long a play stays in the top-right feed before it flies down to the
 * dock's permanent ledger. */
const FEED_TTL_MS = 10_000;
/** Duration of the departing entry's flight toward the dock. */
const FLY_MS = 450;
/** The feed never shows more than this many plays at once. */
const FEED_MAX = 5;
/** How many of the newest ledger rows show their rule text expanded. */
const AUTO_EXPAND_COUNT = 3;

/** Where a departing feed entry flies: the buff dock if it is visible,
 * otherwise off toward the bottom-left where the mobile drawer lives.
 * Mirrors the draft overlay's pocketDelta measurement pattern. */
function dockDelta(el: HTMLElement | null): { dx: number; dy: number } {
  const fallback = { dx: -260, dy: 320 };
  if (!el) return fallback;
  const c = el.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;
  const dock = document.querySelector("[data-buff-dock]");
  if (dock) {
    const d = (dock as HTMLElement).getBoundingClientRect();
    // A hidden dock (mobile: it lives in a closed drawer) measures ~0.
    if (d.width > 40 && d.height > 40) {
      return {
        dx: d.left + d.width / 2 - cx,
        dy: d.top + Math.min(d.height / 2, 160) - cy,
      };
    }
  }
  // Mobile: the buff drawer handle sits along the bottom edge.
  return { dx: -cx + 48, dy: window.innerHeight - cy - 24 };
}

export function OppPlaysLog({ plays }: { plays: OppPlay[] }) {
  // Re-render on a tick so entries age through their phases (fresh, flying,
  // gone) without any parent state change. The tick carries the current time so
  // rendering stays pure (no Date.now() during render).
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();
  const itemRefs = useRef(new Map<number, HTMLDivElement | null>());
  // Flight vector per departing entry, measured once when it crosses the TTL.
  const [flights, setFlights] = useState<Record<number, { dx: number; dy: number }>>({});
  // Entries the player clicked away early. The play still lands in the dock
  // ledger as usual; only its feed time is cut short.
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  // Only tick while something is actually aging in the feed (fresh play within
  // its TTL + flight). An idle match used to re-render this 2.5x/second for the
  // whole game for nothing.
  const hasActive = plays.some((p) => now - p.at < FEED_TTL_MS + FLY_MS);
  useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [hasActive]);

  // Measure the flight for entries that just crossed the TTL (an effect, not
  // render: reading layout during render would thrash it). The guard keeps
  // this from looping: it only ever writes when an unmeasured entry exists.
  // Intentionally runs every render (no dep array) to catch entries the moment
  // they cross the TTL; the write is self-guarded against loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reduceMotion) return;
    const t = Date.now();
    const missing = plays.filter((p) => {
      const age = t - p.at;
      return age >= FEED_TTL_MS && age < FEED_TTL_MS + FLY_MS && flights[p.key] === undefined;
    });
    if (!missing.length) return;
    const live = new Set(plays.map((p) => p.key));
    setFlights((prev) => {
      // Rebuild from the LIVE plays only: keeping departed entries made this
      // object grow for the whole match, and it is spread on every departure.
      const next: Record<number, { dx: number; dy: number }> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (live.has(Number(k))) next[Number(k)] = v;
      }
      for (const p of missing) next[p.key] = dockDelta(itemRefs.current.get(p.key) ?? null);
      return next;
    });
  });

  // Prune per-play bookkeeping once an entry can never be shown again.
  //
  // All three collections were keyed per play and never cleaned: `itemRefs`
  // kept the key (the unmount callback sets the value to null, it does not
  // delete), and `flights` / `dismissed` only ever grew. Over a long match that
  // is unbounded, and the un-dep'd effect above copies the whole `flights`
  // object on every new departure, so the copy cost grew with it too.
  const liveKeys = plays.map((p) => p.key).join(",");
  useEffect(() => {
    // Refs only — no setState, so this stays a pure external-cleanup effect.
    // The unmount callback below sets the map VALUE to null but leaves the key,
    // so without this the map grew for the whole match. `flights` and
    // `dismissed` are pruned by their own writers instead (see below), which
    // keeps every setState on a path React already expects one.
    const keep = new Set(liveKeys ? liveKeys.split(",").map(Number) : []);
    for (const key of itemRefs.current.keys()) {
      if (!keep.has(key)) itemRefs.current.delete(key);
    }
  }, [liveKeys]);

  // Reduced motion skips the flight: entries simply leave at the TTL.
  const visibleFor = reduceMotion ? FEED_TTL_MS : FEED_TTL_MS + FLY_MS;
  const shown = plays
    .filter((p) => now - p.at < visibleFor && !dismissed.has(p.key))
    .slice(-FEED_MAX)
    .reverse();
  if (!shown.length) return null;
  return (
    // Lane below the abort notice, which owns top-16 and is rarer and more
    // important. Both used to sit at exactly `right-3 top-16 z-40` with no
    // offset, so an opponent card played during an abort warning rendered the
    // two directly on top of each other and neither was readable.
    <div className="pointer-events-none fixed right-3 top-[var(--opp-plays-top,4rem)] z-[39] flex w-[min(80vw,20rem)] flex-col gap-1">
      {shown.map((p, i) => {
        const def = BUFF_BY_ID[p.card.id];
        if (!def) return null;
        const tier = p.card.tier as Tier;
        const departing = !reduceMotion && now - p.at >= FEED_TTL_MS;
        const flight = departing ? flights[p.key] : undefined;
        const newest = i === 0 && !departing;
        return (
          <div
            key={p.key}
            ref={(el) => {
              itemRefs.current.set(p.key, el);
            }}
            role={newest ? "status" : undefined}
            aria-live={newest ? "polite" : undefined}
            style={
              flight
                ? {
                    // Fly down into the dock: shrink and translate toward the
                    // measured target, fading out just before landing.
                    transform: `translate(${flight.dx}px, ${flight.dy}px) scale(0.15)`,
                    opacity: 0,
                    transition: `transform ${FLY_MS}ms cubic-bezier(0.3, 0.05, 0.2, 1), opacity ${FLY_MS}ms ease-in`,
                  }
                : undefined
            }
            // NOT pointer-events-auto. This panel is up for 10s after every
            // opponent card and, at 80vw from `right-3`, it covers the top
            // rank-and-a-half of the board on a phone — making the whole card
            // tappable meant those squares were dead for ten seconds, which in
            // a bullet game is a lost move. The card is inert; only the small
            // dismiss button below takes pointer events.
            className={
              "relative rounded-[1px] border bg-ink-700/95 px-3 shadow-plate " +
              (newest ? "border-gold/40 py-2.5 animate-rise" : "border-[color:var(--edge)] py-1.5 opacity-85")
            }
          >
            <button
              type="button"
              onClick={() =>
                // Prune to the live feed while adding, so this set cannot grow
                // past the handful of plays currently on screen.
                setDismissed((st) => {
                  const live = new Set(plays.map((q) => q.key));
                  const next = new Set([...st].filter((k) => live.has(k)));
                  next.add(p.key);
                  return next;
                })
              }
              title="Dismiss"
              aria-label={`Dismiss ${def.name}`}
              className="pointer-events-auto absolute right-1 top-1 grid h-7 w-7 place-items-center text-parchment-400 hover:text-parchment-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <X size={13} aria-hidden />
            </button>
            <div className="flex items-center justify-between gap-3 pr-7">
              <span className={`min-w-0 truncate font-display ${newest ? "text-lg" : "text-[12px]"} font-semibold leading-tight tier-${tier}`}>
                {def.name}
              </span>
              <span
                className={`shrink-0 rounded-[1px] border px-2 py-0.5 font-display text-[12px] font-bold tier-bg-${tier} tier-${tier}`}
              >
                {TIER_ROMAN[tier]}
              </span>
            </div>
            {newest && (
              <>
                <div className="smallcaps mt-0.5 text-[12px] text-parchment-400">{p.label}</div>
                <p className="mt-1 text-xs leading-snug text-parchment-300">{def.description}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The permanent home of the same plays, rendered inside the left dock: a
 * compact, newest-first ledger of everything the opponent has played this
 * game. Plays only land here once their feed time is up (they fly down from
 * the top-right). The newest AUTO_EXPAND_COUNT rows arrive with their full
 * rule text expanded so the recent line of play reads at a glance; older rows
 * collapse to name + tier, one tap to expand (or collapse an expanded one). */
export function OppPlaysDockSection({ plays }: { plays: OppPlay[] }) {
  // Manual expand/collapse taps override the newest-N default per row.
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  // The ledger is an archive: every fresh play already gets its 10s in the
  // top-right feed, so the permanent dock list starts collapsed to a count-only
  // header and opens on tap. Keeps the dock (and the mobile drawer) uncluttered.
  const [open, setOpen] = useState(false);
  // The tick carries the current time so rendering stays pure.
  const [now, setNow] = useState(() => Date.now());
  // Tick only while something is still upstairs in the feed, so its row
  // appears here the moment it lands; a quiet ledger costs nothing.
  const pending = plays.some((p) => now - p.at < FEED_TTL_MS);
  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pending]);
  // Only plays whose card is still in the library render a row, so filter the
  // same set the count chip reports: the header number always matches the list.
  const landed = plays.filter((p) => now - p.at >= FEED_TTL_MS && BUFF_BY_ID[p.card.id]);
  if (!landed.length) return null;
  const newestFirst = [...landed].reverse();
  return (
    <div className="border-t border-[color:var(--edge)] pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <ChevronRight
          aria-hidden
          size={12}
          strokeWidth={2.4}
          className={"shrink-0 text-parchment-400 transition-transform duration-150 " + (open ? "rotate-90" : "")}
        />
        <History aria-hidden size={12} strokeWidth={2.2} className="shrink-0 text-parchment-400" />
        <span className="smallcaps min-w-0 truncate text-[12px] text-parchment-400">Opponent played</span>
        <span className="ml-auto shrink-0 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.05] px-1.5 py-px font-mono text-[12px] tabular-nums text-parchment-300">
          {landed.length}
        </span>
      </button>
      {open && (
      <ul className="mt-1 space-y-0.5">
        {newestFirst.map((p, idx) => {
          const def = BUFF_BY_ID[p.card.id];
          if (!def) return null;
          const tier = p.card.tier as Tier;
          const expanded = overrides[p.key] ?? idx < AUTO_EXPAND_COUNT;
          // One-shot arrival flash (shares the dock pocket keyframes loaded
          // by BuffDock; dropped when animations are off in Settings by that CSS).
          const justLanded = now - p.at < FEED_TTL_MS + 1600;
          return (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setOverrides((o) => ({ ...o, [p.key]: !expanded }))}
                aria-expanded={expanded}
                className={
                  "dock-card w-full rounded-[1px] border border-[color:var(--edge)] bg-white/[0.02] px-2 py-1 text-left transition hover:border-[color:var(--edge-strong)] active:translate-y-px" +
                  (justLanded ? " dock-pocket-flash" : "")
                }
              >
                <span className="flex items-center gap-1.5">
                  <span className={`min-w-0 flex-1 truncate font-display text-[12px] font-semibold tier-${tier}`}>
                    {def.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${tier} tier-${tier}`}
                  >
                    {TIER_ROMAN[tier]}
                  </span>
                </span>
                {expanded && (
                  <>
                    <span className="smallcaps mt-0.5 block text-[12px] text-parchment-400">{p.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-parchment-300">
                      {def.description}
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
