"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import { getNerf } from "@/engine/nerfs/library";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { DraftMode } from "@/engine/buff";

// Wire names must match QUEUE_POOLS in worker.ts.
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
const LAST_MODE_KEY = "dc:last-mode";

// A few of the rules, previewed under the two queue buttons so a new player
// knows what each pool plays like. Static picks of well-known implemented
// rules; name and description come from the engine libraries so they can
// never drift from the real cards.
const EXAMPLE_NERF_IDS = ["skittish", "horse_tranquilizer", "shadow_queen"];
const EXAMPLE_BUFF_IDS = ["pawn_push", "ferz_king", "pawn_shield"];

// Quick-pairing entry point: the two rated queue pools, Nerf and Buff. A
// player picks a mode card (nothing queues yet), picks a time control, and
// the Play button at the bottom starts the search; each pool stakes its own
// rating. The last mode choice is remembered, and a `?mode=` query param
// (e.g. from the home page links) preselects one. Signed-in players are sent
// to the game URL when paired; signed-out visitors get a sign-in link.
export function QueueButton() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [modeRatings, setModeRatings] = useState<Partial<Record<DraftMode, number>>>({});
  const [state, setState] = useState<"idle" | "searching" | "paired">("idle");
  const [mode, setMode] = useState<DraftMode | null>(null);
  const [pool, setPool] = useState("3+2");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me) return;
      // Each pool shows the rating it stakes. The profile API returns every
      // rating bucket; a bucket the account has never touched falls back to
      // the legacy shared rating, which is exactly what would seed it.
      fetch(`/api/users/${encodeURIComponent(me.username)}`)
        .then((res) => (res.ok ? res.json() : null) as Promise<{ ratings?: Record<string, { rating: number }> } | null>)
        .then((data) => {
          if (cancelled || !data?.ratings) return;
          setModeRatings({
            nerf: data.ratings.nerf ? Math.round(data.ratings.nerf.rating) : undefined,
            buff: data.ratings.buff ? Math.round(data.ratings.buff.rating) : undefined,
          });
        })
        .catch(() => {});
    });
    try {
      const saved = window.localStorage.getItem(LAST_POOL_KEY);
      if (saved && QUEUE_POOL_OPTIONS.some((o) => o.pool === saved)) setPool(saved);
    } catch {}
    // Preselect a mode: an explicit ?mode= query param (home page links)
    // wins; otherwise the last choice this browser made.
    try {
      const fromQuery = new URLSearchParams(window.location.search).get("mode");
      const saved = window.localStorage.getItem(LAST_MODE_KEY);
      const preset = fromQuery === "nerf" || fromQuery === "buff" ? fromQuery : saved;
      if (preset === "nerf" || preset === "buff") setMode(preset);
    } catch {}
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

  const pickMode = (m: DraftMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(LAST_MODE_KEY, m);
    } catch {}
  };

  const startSearch = async (mode: DraftMode) => {
    setError(null);
    setState("searching");
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;
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
  };

  const selected = QUEUE_POOL_OPTIONS.find((o) => o.pool === pool) ?? QUEUE_POOL_OPTIONS[4];
  const ratingFor = (mode: DraftMode) =>
    modeRatings[mode] ?? (user ? Math.round(user.rating) : null);

  return (
    <div className="plate gilt p-5 sm:p-6">
      <div className="font-display text-2xl text-parchment">Play online</div>

      {user === undefined ? (
        <div className="mt-4 px-2 py-6 text-center text-parchment-400 text-sm">…</div>
      ) : !user ? (
        <div className="mt-4 flex flex-col items-start gap-2">
          <Link
            href="/login?next=/lobby"
            className="inline-block px-6 py-3 rounded-full btn-leaf font-display text-base"
          >
            Sign in to play online
          </Link>
          <p className="text-xs text-parchment-400">
            Queue games are rated: Nerf and Buff each keep their own rating.
          </p>
        </div>
      ) : state === "searching" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-parchment-200">
            <span className="w-2 h-2 rounded-full bg-verdigris animate-flicker" />
            Finding a{" "}
            <span className={mode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
              {mode === "nerf" ? "Nerf" : "Buff"}
            </span>{" "}
            opponent… ({selected.label})
          </span>
          <button onClick={cancelSearch} className="px-4 py-2 rounded-full btn-ghost text-sm font-display">
            Cancel
          </button>
        </div>
      ) : state === "paired" ? (
        <div className="mt-4 text-sm text-gold-leaf">Opponent found. Starting…</div>
      ) : (
        <>
          {/* Step 1: pick a mode. The two cards are a selection, color-coded
              (Nerf rose, Buff blue), each wearing the rating it stakes.
              Nothing queues until the Play button below. */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ModeCard
              mode="nerf"
              rating={ratingFor("nerf")}
              selected={mode === "nerf"}
              onClick={() => pickMode("nerf")}
            />
            <ModeCard
              mode="buff"
              rating={ratingFor("buff")}
              selected={mode === "buff"}
              onClick={() => pickMode("buff")}
            />
          </div>

          <div className="mt-4">
            <div className="smallcaps text-[10px] text-parchment-400">Time control</div>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {QUEUE_POOL_OPTIONS.map((option) => {
                const category = getCategory(option.speed);
                const Icon = category.icon;
                const isSelected = option.pool === pool;
                return (
                  <button
                    key={option.pool}
                    type="button"
                    onClick={() => pickPool(option.pool)}
                    title={`${category.label} · ${option.label}`}
                    aria-pressed={isSelected}
                    className={
                      "flex flex-col items-center gap-0.5 border px-1 py-2 transition " +
                      (isSelected
                        ? "border-gold bg-gold/15 text-gold-leaf"
                        : "border-white/10 text-parchment-200 hover:border-white/30 hover:bg-white/5")
                    }
                  >
                    <Icon size={14} style={{ color: category.accent }} aria-hidden />
                    <span className="font-mono text-sm tabular-nums">{option.label}</span>
                    <span className="smallcaps text-[8px] text-parchment-400">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <RulePreviews />

          {/* The one button that actually queues, at the bottom so the flow
              reads mode, clock, play. Disabled until a mode is chosen. */}
          <button
            onClick={() => mode && startSearch(mode)}
            disabled={!mode}
            className={
              "mt-4 w-full border px-8 py-4 font-display text-xl sm:text-2xl font-semibold transition " +
              (mode === "nerf"
                ? "border-mode-nerf/70 bg-mode-nerf/20 text-mode-nerfGlow shadow-nerf hover:border-mode-nerf hover:bg-mode-nerf/30"
                : mode === "buff"
                  ? "border-mode-buff/70 bg-mode-buff/20 text-mode-buffGlow shadow-buff hover:border-mode-buff hover:bg-mode-buff/30"
                  : "cursor-not-allowed border-white/10 bg-white/5 text-parchment-400")
            }
          >
            {mode === "nerf" ? "Play Nerf" : mode === "buff" ? "Play Buff" : "Pick a mode to play"}
          </button>
        </>
      )}

      {error && (
        <div className="mt-3 p-3 border border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// One of the two mode selection cards. Each wears its color identity at all
// times (Nerf rose, Buff blue), deepens when selected, and shows the
// caller's rating in that pool. Selecting a card does not queue; the Play
// button below does.
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
  const identity =
    mode === "nerf"
      ? {
          card: selected
            ? "border-mode-nerf bg-mode-nerf/15 shadow-nerf"
            : "border-mode-nerf/30 bg-mode-nerf/5 hover:border-mode-nerf/60 hover:bg-mode-nerf/10",
          title: "text-mode-nerfGlow",
        }
      : {
          card: selected
            ? "border-mode-buff bg-mode-buff/15 shadow-buff"
            : "border-mode-buff/30 bg-mode-buff/5 hover:border-mode-buff/60 hover:bg-mode-buff/10",
          title: "text-mode-buffGlow",
        };
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={"plate p-4 sm:p-5 text-left transition border " + identity.card}
    >
      <div className={"font-display text-2xl sm:text-3xl font-semibold " + identity.title}>
        {mode === "nerf" ? "Nerf" : "Buff"}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-parchment-300">
        {mode === "nerf"
          ? "Secret handicaps, revealed when the game ends. Boon drafts soften yours."
          : "No handicaps. Draft buffs and build the strongest army."}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="smallcaps text-[9px] text-parchment-400">
          Your {mode === "nerf" ? "Nerf" : "Buff"} rating
        </span>
        <span className={"font-mono text-base tabular-nums " + identity.title}>
          {rating ?? "?"}
        </span>
      </div>
    </button>
  );
}

// "A few of the rules": three example nerfs and three example buffs, tinted
// with their pool's color, so the two buttons above explain themselves.
function RulePreviews() {
  const nerfs = EXAMPLE_NERF_IDS.map((id) => getNerf(id)).filter(
    (n): n is NonNullable<ReturnType<typeof getNerf>> => !!n,
  );
  const buffs = EXAMPLE_BUFF_IDS.map((id) => BUFF_BY_ID[id]).filter(Boolean);
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="border border-mode-nerf/25 bg-mode-nerf/5 p-3">
        <div className="smallcaps text-[9px] text-mode-nerfGlow">A few of the nerfs</div>
        <ul className="mt-1.5 space-y-1.5">
          {nerfs.map((nerf) => (
            <li key={nerf.id} className="text-[11px] leading-snug text-parchment-300">
              <span className="font-semibold text-parchment-100">{nerf.name}.</span>{" "}
              {nerf.description}
            </li>
          ))}
        </ul>
      </div>
      <div className="border border-mode-buff/25 bg-mode-buff/5 p-3">
        <div className="smallcaps text-[9px] text-mode-buffGlow">A few of the buffs</div>
        <ul className="mt-1.5 space-y-1.5">
          {buffs.map((buff) => (
            <li key={buff.id} className="text-[11px] leading-snug text-parchment-300">
              <span className="font-semibold text-parchment-100">{buff.name}.</span>{" "}
              {buff.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
