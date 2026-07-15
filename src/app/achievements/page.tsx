"use client";

import Link from "next/link";
import { createElement, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Lock, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchMe } from "@/lib/authClient";
import { achievementIcon } from "@/lib/achievementIcons";
import { achievementToastsDisabled, setAchievementToastsDisabled } from "@/components/AchievementToast";
import {
  ACHIEVEMENTS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_TAGLINE,
  RARITY_LABEL,
  type AchievementCategory,
  type AchievementRarity,
} from "@/lib/achievements";

interface AchievementView {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  goal: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: number | null;
}

interface AchievementsResponse {
  username: string;
  unlockedCount: number;
  total: number;
  achievements: AchievementView[];
}

// Rarity is the only differentiator the model actually carries, so it drives a
// quiet chip using the sanctioned tier-bg-* classes (escalating toward gold as
// rarity rises). No global unlock-percentage feed exists today, so "X% of
// players" is deliberately not shown rather than faked.
const RARITY_TIER_BG: Record<AchievementRarity, string> = {
  common: "tier-bg-1",
  rare: "tier-bg-3",
  epic: "tier-bg-7",
  legendary: "tier-bg-9",
};

// Earned trophies read in the reward palette (sun/gold). Kept as literals from
// the palette so both the icon tint and its resting border share one hue.
const SUN = "#eec25e";
const SUN_SOFT_BG = "rgba(238,194,94,0.10)";
const SUN_BORDER = "rgba(238,194,94,0.40)";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// A thin progress bar. Track uses an edge tone; the fill is reward-sun.
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-[1px]"
      style={{ background: "var(--edge)" }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-[1px] transition-[width] duration-300"
        style={{ width: `${pct}%`, background: "var(--sun-glow)" }}
      />
    </div>
  );
}

function AchievementCard({ a }: { a: AchievementView }) {
  const icon = achievementIcon(a.icon);
  const showProgress = !a.unlocked && a.goal > 1;
  return (
    <div
      className="plate plate-hover relative flex flex-col gap-2.5 p-3 transition-colors"
      style={a.unlocked ? { borderColor: SUN_BORDER } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[1px] border"
          style={{
            borderColor: a.unlocked ? SUN_BORDER : "var(--edge)",
            background: a.unlocked ? SUN_SOFT_BG : "var(--surface-hover)",
          }}
        >
          {createElement(icon, {
            className: "h-6 w-6" + (a.unlocked ? "" : " opacity-40"),
            style: { color: a.unlocked ? SUN : "var(--paper-dim)" },
            strokeWidth: 2,
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-display text-[15px] leading-tight"
            style={{ color: a.unlocked ? "#f0e6cf" : undefined }}
          >
            {a.name}
          </div>
          <span
            className={
              "mt-1 inline-block rounded-[1px] border px-1.5 py-0.5 text-[12px] leading-none " +
              RARITY_TIER_BG[a.rarity]
            }
            style={{ color: "rgb(var(--tier-rgb))" }}
          >
            {RARITY_LABEL[a.rarity]}
          </span>
        </div>
      </div>

      <p
        className={
          "text-[12px] leading-snug " +
          (a.unlocked ? "text-parchment-200" : "text-parchment-400")
        }
      >
        {a.description}
      </p>

      {a.unlocked && a.unlockedAt != null && (
        <div className="mt-auto flex items-center gap-1.5 text-[12px] text-sun-glow/90">
          <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="tabular-nums">Earned {fmtDate(a.unlockedAt)}</span>
        </div>
      )}

      {showProgress && (
        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-between text-[12px] text-parchment-400">
            <span>Progress</span>
            <span className="font-mono tabular-nums text-parchment-300">
              {a.progress}/{a.goal}
            </span>
          </div>
          <ProgressBar value={a.progress} max={a.goal} />
        </div>
      )}

      {!a.unlocked && !showProgress && (
        <div className="mt-auto flex items-center gap-1.5 text-[12px] text-parchment-500">
          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Locked</span>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  items,
}: {
  category: AchievementCategory;
  items: AchievementView[];
}) {
  const [open, setOpen] = useState(true);
  const earned = items.filter((a) => a.unlocked).length;
  // Earned lead within each section; catalog order (easy to hard) is otherwise
  // preserved by the stable input order.
  const sorted = useMemo(
    () => [...items].sort((x, y) => Number(y.unlocked) - Number(x.unlocked)),
    [items],
  );
  const panelId = `cat-${category}`;
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="press flex w-full items-center justify-between gap-3 border-b py-2 text-left"
        style={{ borderColor: "var(--edge)" }}
      >
        <div className="min-w-0">
          <h2 className="font-display text-[19px] leading-tight text-parchment-50">
            {CATEGORY_LABEL[category]}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-parchment-400">
            {CATEGORY_TAGLINE[category]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="font-mono text-[13px] tabular-nums">
            <span className={earned > 0 ? "text-sun-glow" : "text-parchment-300"}>{earned}</span>
            <span className="text-parchment-500">/{items.length}</span>
          </span>
          <ChevronDown
            className={"h-4 w-4 text-parchment-400 transition-transform " + (open ? "" : "-rotate-90")}
            strokeWidth={2}
          />
        </div>
      </button>
      {open && (
        <div
          id={panelId}
          className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4"
        >
          {sorted.map((a) => (
            <AchievementCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}

// The full catalog with everything locked: what signed-out visitors (and error
// states) see, so the trophy wall is always browsable.
function lockedWall(): AchievementView[] {
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    rarity: a.rarity,
    category: a.category,
    goal: a.goal,
    progress: 0,
    unlocked: false,
    unlockedAt: null,
  }));
}

function CardSkeleton() {
  return <div className="plate h-[132px] animate-pulse p-3" aria-hidden />;
}

function AchievementsContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("u");
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "signin" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let username = requested;
      if (!username) {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          setState("signin");
          return;
        }
        username = me.username;
      }
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/achievements`);
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          return;
        }
        const body = (await res.json()) as AchievementsResponse;
        if (cancelled) return;
        setData(body);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requested]);

  // The wall always renders the whole catalog in catalog order; signed-in data
  // overlays progress and unlocks by id.
  const wall = useMemo<AchievementView[]>(() => {
    if (state !== "ready" || !data) return lockedWall();
    const byId = new Map(data.achievements.map((a) => [a.id, a]));
    return ACHIEVEMENTS.map((a) => {
      const fetched = byId.get(a.id);
      return fetched
        ? { ...fetched, category: a.category }
        : {
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            rarity: a.rarity,
            category: a.category,
            goal: a.goal,
            progress: 0,
            unlocked: false,
            unlockedAt: null,
          };
    });
  }, [state, data]);

  const byId = useMemo(() => new Map(wall.map((a) => [a.id, a])), [wall]);
  const total = ACHIEVEMENTS.length;
  const earnedCount = wall.filter((a) => a.unlocked).length;



  const viewingOther = state === "ready" && !!requested && !!data;

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Compact header with overall progress. */}
        <header>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="eyebrow">Trophy wall</div>
              <h1 className="mt-1 font-display text-[26px] leading-none sm:text-[32px]">
                {viewingOther && data ? `${data.username}'s achievements` : "Achievements"}
              </h1>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-2 font-mono text-2xl tabular-nums text-parchment-50">
                <Trophy className="h-5 w-5 text-sun-glow" strokeWidth={2} />
                {state === "ready" ? earnedCount : 0}
                <span className="text-base text-parchment-400">/{total}</span>
              </div>
              <div className="text-[12px] text-parchment-400">Earned</div>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={state === "ready" ? earnedCount : 0} max={total} />
          </div>
          <p className="mt-3 text-[13px] text-parchment-300">
            {viewingOther
              ? "What they have unlocked across the board."
              : "Feats you unlock across Nerf and Buff, from first steps to the top of the ladder."}
          </p>
        </header>

        {/* Guest, error, and popup-toggle states. */}
        {state === "signin" && (
          <div className="mt-5 plate flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-parchment-300">
              Every game you play unlocks milestones: wins, comebacks, king captures, and rating
              climbs. Browse the full wall below, then start your own.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/lobby" className="btn-leaf press whitespace-nowrap px-4 py-2 text-[13px]">
                Find a match
              </Link>
              <Link
                href="/login?next=/achievements"
                className="text-[13px] text-gold-leaf hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="mt-5 plate flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-parchment-300">
              Your progress could not load, so the wall shows everything locked.
            </p>
            <button
              type="button"
              onClick={() => {
                setState("loading");
                setData(null);
                // Re-run the fetch effect by nudging the requested key is not
                // possible here; a full reload is the simplest recovery.
                window.location.reload();
              }}
              className="btn-ghost press shrink-0 px-4 py-2 text-[13px]"
            >
              Retry
            </button>
          </div>
        )}

        {state === "loading" ? (
          <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-9">
            {/* Category sections. */}
            {CATEGORY_ORDER.map((category) => {
              const items = wall.filter((a) => a.category === category);
              if (!items.length) return null;
              return (
                <CategorySection key={category} category={category} items={items} />
              );
            })}

            {!viewingOther && <UnlockPopupToggle />}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <AchievementsContent />
    </Suspense>
  );
}

// Desktop unlock popups (bottom-right toasts) on/off. The toast's "Disable
// these popups" button lands people here to turn them back on.
function UnlockPopupToggle() {
  const [off, setOff] = useState(false);
  // Read the stored preference after mount (deferred so the state write does
  // not land synchronously inside the effect); the server render stays at the
  // default to avoid a hydration mismatch.
  useEffect(() => {
    queueMicrotask(() => setOff(achievementToastsDisabled()));
  }, []);
  return (
    <div className="plate flex flex-wrap items-center justify-between gap-3 p-3">
      <span className="text-[13px] text-parchment-300">
        Unlock popups{" "}
        <span className="text-parchment-500">
          (a small card in the corner when you earn one, desktop only)
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          setAchievementToastsDisabled(!off);
          setOff(!off);
        }}
        aria-pressed={!off}
        className={
          "press min-h-[36px] rounded-[1px] border px-3 py-1 text-[12px] transition-colors " +
          (off
            ? "border-[color:var(--edge)] text-parchment-400 hover:border-[color:var(--edge-strong)]"
            : "border-verdigris-glow/50 bg-verdigris/10 text-verdigris-glow")
        }
      >
        {off ? "Off, turn on" : "On, turn off"}
      </button>
    </div>
  );
}
