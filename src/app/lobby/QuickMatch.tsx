"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Swords, X } from "lucide-react";
import { AccountUser, ensureAccount, fetchMe } from "@/lib/authClient";
import { clearSnapshot, readSnapshot, writeSnapshot } from "@/lib/snapshotCache";
import { MPConnectionState, MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import { useSharedMode } from "@/lib/modeState";
import type { DraftMode } from "@/engine/buff";
import { DungeonGateButton } from "@/components/DungeonGateButton";
import { EngravedLabel } from "@/components/dungeon/primitives";
import "@/components/dungeon/dungeon-lobby.css";

// The lobby's Quick Match panel: pick a mode (Buff recommended / Nerf), pick a
// time control, and one primary button finds a rated game against a real
// opponent. It owns the matchmaking socket (MPSession) and its searching state,
// and it stays mounted across lobby tab switches so an in-flight search (and
// its Cancel button) survives leaving and returning to Quick Play. This is a
// lobby-local reimplementation of the shared QueueButton, redesigned to the
// route contract: one accent .btn-leaf primary action, a balanced 3x3
// time-control grid, and a mobile sticky action bar with a bottom-sheet picker.
//
// Buff is preselected (it starts from normal chess, the easiest first game);
// the mode preference is shared site-wide (lib/modeState): an explicit ?mode=
// query param wins, then the last choice this browser made, then Buff. Signed
// out visitors queue as a guest (no login wall), nudged to register so their
// rating sticks.

// Wire names must match QUEUE_POOLS in worker.ts. Nine pools lay out as a clean
// 3x3 grid (no orphaned final row).
const QUEUE_POOL_OPTIONS: { pool: string; label: string; speed: RatingCategoryId }[] = [
  { pool: "1+0", label: "1+0", speed: "bullet" },
  { pool: "2+1", label: "2+1", speed: "bullet" },
  { pool: "3+0", label: "3+0", speed: "blitz" },
  { pool: "3+2", label: "3+2", speed: "blitz" },
  { pool: "5+0", label: "5+0", speed: "blitz" },
  { pool: "5+3", label: "5+3", speed: "blitz" },
  { pool: "10+0", label: "10+0", speed: "rapid" },
  { pool: "10+5", label: "10+5", speed: "rapid" },
  { pool: "15+10", label: "15+10", speed: "rapid" },
];

const LAST_POOL_KEY = "dc:last-pool";

export function QuickMatch({ active = true }: { active?: boolean } = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [modeRatings, setModeRatings] = useState<Partial<Record<DraftMode, number>>>({});
  const [state, setState] = useState<"idle" | "searching" | "paired">("idle");
  const [sharedMode, pickSharedMode] = useSharedMode();
  const mode = sharedMode;
  const [pool, setPool] = useState("3+2");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Coarse socket health while searching, so a mid-queue drop shows a calm
  // "Reconnecting" note instead of silently stalling (system state 4).
  const [connection, setConnection] = useState<MPConnectionState>("connected");
  // Mobile time-control bottom sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  // The mobile sticky action bar and the bottom sheet are portalled to
  // document.body: their nearest lobby ancestor carries a CSS transform (the
  // stagger-in entrance), which would otherwise trap position:fixed inside the
  // column instead of pinning it to the viewport. Portalling requires the DOM,
  // so it only runs after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const sessionRef = useRef<MPSession | null>(null);

  // While searching, the panel's own searching UI and the sticky bar must not
  // both show a Cancel at once: an IntersectionObserver on the in-panel
  // searching block suppresses the bar whenever that block is on screen, so
  // exactly one Cancel is visible at a time (the bar returns when the panel
  // scrolls away). Defaults to "in view" so the bar never flashes before the
  // observer's first measurement.
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const [searchPanelInView, setSearchPanelInView] = useState(true);
  useEffect(() => {
    if (state !== "searching") return;
    const node = searchPanelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setSearchPanelInView(entries[0]?.isIntersecting ?? true),
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setSearchPanelInView(true);
    };
  }, [state]);

  // The sticky bar is fixed, so it takes no layout space of its own: mirror
  // its measured height into the document body's bottom padding while it is
  // rendered, so it never overlaps the last of the page content. The bar is
  // display:none from `sm` up, where its height measures 0 and the padding
  // collapses with it.
  const barRef = useRef<HTMLDivElement | null>(null);
  const showBar = mounted && active && (state !== "searching" || !searchPanelInView);
  useEffect(() => {
    if (!showBar) return;
    const node = barRef.current;
    if (!node) return;
    const apply = () => {
      document.body.style.paddingBottom = `${node.offsetHeight}px`;
    };
    apply();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(apply);
      observer.observe(node);
    }
    return () => {
      observer?.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [showBar]);

  useEffect(() => {
    if (state !== "searching") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    // Instant paint from the session cache, corrected by the live fetch below.
    const cached = readSnapshot<{ user: AccountUser | null; ratings: Partial<Record<DraftMode, number>> }>(
      "nerfchess:queue-card",
    );
    if (cached) {
      queueMicrotask(() => {
        setUser(cached.user);
        setModeRatings(cached.ratings ?? {});
      });
    }
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me) {
        clearSnapshot("nerfchess:queue-card");
        return;
      }
      fetch(`/api/users/${encodeURIComponent(me.username)}`)
        .then((res) => (res.ok ? res.json() : null) as Promise<{ ratings?: Record<string, { rating: number }> } | null>)
        .then((data) => {
          if (cancelled || !data?.ratings) return;
          const ratings = {
            nerf: data.ratings.nerf ? Math.round(data.ratings.nerf.rating) : undefined,
            buff: data.ratings.buff ? Math.round(data.ratings.buff.rating) : undefined,
          };
          setModeRatings(ratings);
          writeSnapshot("nerfchess:queue-card", { user: me, ratings });
        })
        .catch(() => {});
    });
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(LAST_POOL_KEY);
        if (saved && QUEUE_POOL_OPTIONS.some((o) => o.pool === saved)) setPool(saved);
      } catch {}
    });
    return () => {
      cancelled = true;
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const pickPool = (p: string) => {
    setPool(p);
    try {
      window.localStorage.setItem(LAST_POOL_KEY, p);
    } catch {}
  };

  const pickMode = (m: DraftMode) => pickSharedMode(m);

  const startSearch = async () => {
    setError(null);
    let me = user;
    if (!me) {
      me = await ensureAccount();
      if (me) setUser(me);
    }
    if (!me) {
      setError("Could not start a guest session. Please try again.");
      return;
    }
    setState("searching");
    setConnection("connected");
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;
    session.onConnectionState((s) => {
      if (sessionRef.current === session) setConnection(s);
    });
    try {
      const paired = await session.queue(pool, mode);
      if (sessionRef.current !== session) return;
      setState("paired");
      saveOnlineSeat(paired.id, { color: paired.color, token: paired.token });
      session.destroy();
      sessionRef.current = null;
      router.push(`/game/${paired.id}`);
    } catch (e) {
      if (sessionRef.current !== session) return;
      session.destroy();
      sessionRef.current = null;
      setState("idle");
      setError(e instanceof Error ? e.message : "Could not reach the game server.");
    }
  };

  const cancelSearch = () => {
    sessionRef.current?.cancelQueue();
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setState("idle");
    setConnection("connected");
  };

  const selected = QUEUE_POOL_OPTIONS.find((o) => o.pool === pool) ?? QUEUE_POOL_OPTIONS[3];
  const selectedCategory = getCategory(selected.speed);
  const ratingFor = (m: DraftMode) => modeRatings[m] ?? (user ? Math.round(user.rating) : null);
  const modeLabel = mode === "nerf" ? "Nerf" : "Buff";
  const findLabel = `Find a ${selected.label} ${modeLabel} game`;

  return (
    <div className="dgn-chamber p-4 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] border border-[rgb(122_96_58_/_0.6)] bg-[rgb(var(--energy-ember-rgb)/0.12)] text-[rgb(var(--energy-ember-rgb))] shadow-[inset_0_1px_0_rgba(255,230,180,0.15)]"
        >
          <Swords size={16} />
        </span>
        <div>
          <div className="font-display text-2xl leading-none text-parchment-50">Quick match</div>
          <EngravedLabel className="mt-1.5" torch={false}>
            The matchmaking chamber
          </EngravedLabel>
        </div>
      </div>

      {state === "searching" ? (
        <SearchingPanel
          rootRef={searchPanelRef}
          mode={mode}
          poolLabel={selected.label}
          elapsed={elapsed}
          connection={connection}
          onCancel={cancelSearch}
        />
      ) : state === "paired" ? (
        <div className="mt-4 text-sm text-gold-leaf" role="status" aria-live="polite">
          Opponent found. Starting your game…
        </div>
      ) : (
        <>
          {/* Step 1: mode. Two dungeon doors, each wearing its mode hue on a
              carved jamb and igniting when chosen (no floating checkbox). Buff
              leads and is preselected. Choosing a door does not queue; the gate
              does. */}
          <div className="mt-5">
            <EngravedLabel>Choose your gate</EngravedLabel>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <ModeCard
                mode="buff"
                rating={ratingFor("buff")}
                selected={mode === "buff"}
                onClick={() => pickMode("buff")}
              />
              <ModeCard
                mode="nerf"
                rating={ratingFor("nerf")}
                selected={mode === "nerf"}
                onClick={() => pickMode("nerf")}
              />
            </div>
          </div>

          {/* Step 2: time control. Desktop shows the balanced 3x3 grid of
              engraved stone tokens inline; mobile collapses it to a summary
              tablet that opens a bottom sheet. */}
          <div className="mt-5">
            <EngravedLabel>Time control</EngravedLabel>
            <div className="mt-2.5 hidden grid-cols-3 gap-2 sm:grid">
              {QUEUE_POOL_OPTIONS.map((option) => (
                <TimeCell
                  key={option.pool}
                  option={option}
                  selected={option.pool === pool}
                  onClick={() => pickPool(option.pool)}
                />
              ))}
            </div>
            {/* Mobile: a single summary tablet opens the picker sheet. */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              data-selected="true"
              className="dgn-token mt-2.5 flex min-h-[48px] w-full items-center justify-between px-3.5 py-2.5 sm:hidden"
            >
              <span className="flex items-center gap-2">
                <Clock size={16} aria-hidden style={{ color: selectedCategory.accent }} />
                <span className="font-mono text-base tabular-nums text-parchment-50">{selected.label}</span>
                <span className="text-sm text-parchment-300">{selectedCategory.label}</span>
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-gold-leaf">Change</span>
            </button>
          </div>

          {/* The one primary action, forged as the same dungeon gate as the
              homepage CTA. Desktop renders it full width in the chamber; on
              mobile it moves to the sticky bottom rail so it is always
              reachable. */}
          <DungeonGateButton
            onClick={startSearch}
            className="dgn-gate--block press mt-5 hidden px-8 py-4 font-display text-lg font-semibold sm:flex"
          >
            {findLabel}
          </DungeonGateButton>

          {user !== undefined && (!user || user.isGuest) && (
            <p className="mt-3 text-center text-[13px] text-parchment-300 sm:text-sm">
              Playing as a guest.{" "}
              <Link href="/login?next=/lobby" className="font-semibold text-gold-leaf hover:underline">
                Sign in
              </Link>{" "}
              to keep your rating.
            </p>
          )}
        </>
      )}

      {error && (
        <div role="alert" className="mt-3 border border-oxblood-glow/60 bg-oxblood/15 p-3 text-sm text-parchment">
          {error}
        </div>
      )}

      {/* The mobile sticky action bar and bottom sheet are portalled to the
          document body (see `mounted` above) and only while this tab is active,
          so they escape the column's transform and pin to the viewport. */}
      {mounted &&
        active &&
        createPortal(
          <>
            {/* --- Mobile sticky action bar (safe-area aware). Hidden while
                the panel's own searching UI is on screen, so only one Cancel
                shows at a time. --- */}
            {showBar && (
              <div
                ref={barRef}
                className="dgn-ctabar fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:hidden"
              >
                {state === "searching" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-parchment-100">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--energy-ember-rgb))] animate-flicker" />
                      <span>Searching</span>
                      <span className="font-mono text-sm tabular-nums text-parchment-200">{formatElapsed(elapsed)}</span>
                    </span>
                    <button
                      onClick={cancelSearch}
                      className="btn-ghost press min-h-[44px] px-5 py-2 font-display text-base"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <DungeonGateButton
                    onClick={startSearch}
                    className="dgn-gate--block press flex min-h-[52px] px-6 py-3 font-display text-lg font-semibold"
                  >
                    {findLabel}
                  </DungeonGateButton>
                )}
              </div>
            )}

            {/* --- Mobile time-control bottom sheet --- */}
            {sheetOpen && (
              <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Choose a time control">
                <button
                  type="button"
                  aria-label="Close time control picker"
                  onClick={() => setSheetOpen(false)}
                  className="absolute inset-0 bg-black/60"
                />
                <div className="dgn-ctabar absolute inset-x-0 bottom-0 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-[1px] bg-[rgb(var(--energy-ember-rgb)/0.5)]" />
                  <div className="mb-3 flex items-center justify-between">
                    <EngravedLabel as="h3" className="text-[13px]">Time control</EngravedLabel>
                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      aria-label="Close"
                      className="grid h-11 w-11 place-items-center text-parchment-300 hover:text-parchment-50"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {QUEUE_POOL_OPTIONS.map((option) => (
                      <TimeCell
                        key={option.pool}
                        option={option}
                        selected={option.pool === pool}
                        onClick={() => {
                          pickPool(option.pool);
                          setSheetOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}

// mm:ss for the search-elapsed counter.
function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// The in-queue state, shown in place of the setup controls: a live indicator,
// the elapsed clock (proof the search is alive), a calm reconnect note if the
// socket drops, and an unmistakable Cancel. Estimated wait is intentionally
// omitted: the lobby snapshot carries no reliable basis to derive it.
function SearchingPanel({
  rootRef,
  mode,
  poolLabel,
  elapsed,
  connection,
  onCancel,
}: {
  rootRef?: React.Ref<HTMLDivElement>;
  mode: DraftMode;
  poolLabel: string;
  elapsed: number;
  connection: MPConnectionState;
  onCancel: () => void;
}) {
  const reconnecting = connection !== "connected";
  return (
    <div
      ref={rootRef}
      className="dgn-token mt-5 p-4"
      data-selected="true"
      style={{ "--energy-gold-rgb": "98 153 36" } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-sm text-parchment-100">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-verdigris animate-flicker" />
          <span>
            Finding a{" "}
            <span className={mode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
              {mode === "nerf" ? "Nerf" : "Buff"}
            </span>{" "}
            opponent ({poolLabel})
          </span>
        </span>
        <button onClick={onCancel} className="btn-ghost press min-h-[44px] px-4 py-2 font-display text-sm">
          Cancel
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-xs text-parchment-400" aria-live="polite">
        <span>Searching</span>
        <span className="font-mono text-sm tabular-nums text-parchment-200">{formatElapsed(elapsed)}</span>
      </div>
      {reconnecting && (
        <div className="mt-2 flex items-center gap-2 text-xs text-sun-glow" role="status" aria-live="polite">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-sun-glow motion-safe:animate-pulse" />
          Reconnecting to the game server. Your place in the queue is held.
        </div>
      )}
    </div>
  );
}

// One time-control cell: speed glyph, clock, and category label. Accessible
// name resolves to "3+2 blitz" (label + category), which the mode-defaults e2e
// spec relies on.
function TimeCell({
  option,
  selected,
  onClick,
}: {
  option: { pool: string; label: string; speed: RatingCategoryId };
  selected: boolean;
  onClick: () => void;
}) {
  const category = getCategory(option.speed);
  const Icon = category.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className="dgn-token press flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-1 py-2"
    >
      <Icon size={15} style={{ color: category.accent }} aria-hidden />
      <span className="font-mono text-base tabular-nums">{option.label}</span>
      <span className="text-xs text-parchment-400">{category.label}</span>
    </button>
  );
}

// One of the two mode cards: equal height, its mode hue on the jamb, and the
// rating it stakes (a "?" when unknown, per the player-identity rule for
// provisional/unrated). Selection is carried entirely by the door's border +
// fill states (dungeon-lobby.css) — no corner checkbox and no "Recommended"
// badge to fight the selected card for attention. Keeps the accessible names
// the mode-defaults e2e spec matches (buff: "…Start with normal chess…";
// nerf: "Start with a secret handicap…").
function ModeCard({
  mode,
  rating,
  selected,
  onClick,
}: {
  mode: DraftMode;
  rating: number | null;
  selected: boolean;
  onClick: () => void;
}) {
  const isNerf = mode === "nerf";
  const title = isNerf ? "text-mode-nerfGlow" : "text-mode-buffGlow";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={
        "dgn-door press p-3.5 text-left sm:p-4 " + (isNerf ? "dgn-door--nerf" : "dgn-door--buff")
      }
    >
      <span className={"font-display text-2xl font-semibold leading-none sm:text-3xl " + title}>
        {isNerf ? "Nerf" : "Buff"}
      </span>
      <p className="mt-2 text-[13px] leading-snug text-parchment-300">
        {isNerf
          ? "Start with a secret handicap. Draft curses for your opponent."
          : "Start with normal chess. Draft powers for your own army."}
      </p>
      {/* The rating this door stakes. flex-wrap: on the narrowest phones the
          number drops to its own line instead of clipping against the door's
          overflow:hidden. */}
      <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-white/[0.06] pt-2.5">
        <span className="text-xs text-parchment-400">Your {isNerf ? "Nerf" : "Buff"} rating</span>
        <span className={"font-mono text-base leading-none tabular-nums " + title}>{rating ?? "?"}</span>
      </div>
    </button>
  );
}
