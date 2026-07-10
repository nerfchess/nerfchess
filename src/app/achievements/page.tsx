"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Trophy } from "lucide-react";
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
  type AchievementRarity,
} from "@/lib/achievements";

interface AchievementView {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
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

// Accent per rarity, reused for the icon, the ring, and the rarity label.
const RARITY_ACCENT: Record<AchievementRarity, string> = {
  legendary: "#e0b256",
  epic: "#b78fd6",
  rare: "#4a9fee",
  common: "#7eb59a",
};

function AchievementCard({ a }: { a: AchievementView }) {
  const Icon = achievementIcon(a.icon);
  const accent = RARITY_ACCENT[a.rarity];
  const showProgress = !a.unlocked && a.goal > 1 && a.progress > 0;
  return (
    <div
      className={
        "relative plate p-4 overflow-hidden transition " +
        (a.unlocked ? "card-juicy gilt" : "opacity-60")
      }
      style={a.unlocked ? { borderColor: `${accent}66` } : undefined}
    >
      {a.unlocked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ background: `linear-gradient(180deg, ${accent}1f, transparent)` }}
        />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border"
          style={{
            borderColor: a.unlocked ? `${accent}80` : "rgba(255,255,255,0.10)",
            background: a.unlocked ? `${accent}1a` : "rgba(255,255,255,0.03)",
          }}
        >
          {a.unlocked ? (
            <Icon className="h-6 w-6" style={{ color: accent }} strokeWidth={2} />
          ) : (
            <Lock className="h-5 w-5 text-parchment-500" strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0">
          <div
            className="font-display text-lg leading-tight"
            style={{ color: a.unlocked ? accent : undefined }}
          >
            {a.name}
          </div>
          <div className="smallcaps text-[10px]" style={{ color: a.unlocked ? `${accent}cc` : "#8a8577" }}>
            {RARITY_LABEL[a.rarity]}
          </div>
        </div>
      </div>
      <p className={"relative mt-3 text-[13px] leading-relaxed " + (a.unlocked ? "text-parchment/90" : "text-parchment-400")}>
        {a.description}
      </p>
      {a.unlocked && a.unlockedAt != null && (
        <div className="relative mt-3 smallcaps text-[10px] text-sun-glow/80">
          Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
        </div>
      )}
      {showProgress && (
        <div className="relative mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="smallcaps text-[10px] text-parchment-400">Progress</span>
            <span className="font-mono text-[10px] text-parchment-300">
              {a.progress}/{a.goal}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden bg-white/5">
            <div
              className="h-full"
              style={{ width: `${Math.min(100, (a.progress / a.goal) * 100)}%`, background: accent }}
            />
          </div>
        </div>
      )}
    </div>
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
    goal: a.goal,
    progress: 0,
    unlocked: false,
    unlockedAt: null,
  }));
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
  const wall = useMemo(() => {
    if (state !== "ready" || !data) return lockedWall();
    const byId = new Map(data.achievements.map((a) => [a.id, a]));
    return ACHIEVEMENTS.map((a) => {
      const fetched = byId.get(a.id);
      return (
        fetched ?? {
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          rarity: a.rarity,
          goal: a.goal,
          progress: 0,
          unlocked: false,
          unlockedAt: null,
        }
      );
    });
  }, [state, data]);

  const unlockedCount = data?.unlockedCount ?? 0;
  const total = ACHIEVEMENTS.length;

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Achievements</h1>
            <p className="mt-3 text-parchment-200">
              {state === "ready" && data
                ? requested
                  ? `What ${data.username} has unlocked across the board.`
                  : "Feats you have unlocked, and the ones still waiting."
                : "Feats to unlock across Nerf and Buff."}
            </p>
          </div>
          <div className="plate px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-2 font-mono text-2xl text-parchment-50 tabular-nums">
              <Trophy className="h-5 w-5 text-sun-glow" strokeWidth={2} />
              {state === "ready" ? unlockedCount : 0}
              <span className="text-sm text-parchment-400">/{total}</span>
            </div>
            <div className="smallcaps text-[10px] text-parchment-400">Unlocked</div>
          </div>
        </div>

        <UnlockPopupToggle />

        {state === "signin" && (
          <div className="mt-6 plate p-4 text-sm text-parchment-300">
            <Link href="/login?next=/achievements" className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to start unlocking these. Every trophy below is waiting for you.
          </div>
        )}
        {state === "error" && (
          <div className="mt-6 plate p-4 text-sm text-parchment-300">
            Your progress is unavailable right now, so the wall shows everything locked. Try
            again in a minute.
          </div>
        )}

        {state === "loading" ? (
          <div className="mt-8 text-parchment-300/60">Loading…</div>
        ) : (
          <div className="mt-8 space-y-12">
            {CATEGORY_ORDER.map((category) => {
              const ids = new Set(
                ACHIEVEMENTS.filter((a) => a.category === category).map((a) => a.id),
              );
              const group = wall.filter((a) => ids.has(a.id));
              if (!group.length) return null;
              // Unlocked first within each section so earned trophies lead;
              // catalog order (easy to hard) is preserved otherwise.
              const sorted = [...group].sort((x, y) => Number(y.unlocked) - Number(x.unlocked));
              const earned = group.filter((a) => a.unlocked).length;
              return (
                <div key={category}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="font-display text-2xl text-parchment-50">
                        {CATEGORY_LABEL[category]}
                      </h2>
                      <p className="mt-0.5 text-xs text-parchment-400">
                        {CATEGORY_TAGLINE[category]}
                      </p>
                    </div>
                    <span className="font-mono text-sm tabular-nums text-parchment-300">
                      <span className={earned > 0 ? "text-sun-glow" : ""}>{earned}</span>
                      <span className="text-parchment-500">/{group.length}</span>
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sorted.map((a) => (
                      <AchievementCard key={a.id} a={a} />
                    ))}
                  </div>
                </div>
              );
            })}
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
  useEffect(() => setOff(achievementToastsDisabled()), []);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-4 py-2.5">
      <span className="text-sm text-parchment-300">
        Unlock popups{" "}
        <span className="text-parchment-500">(a small card in the corner when you earn one, desktop only)</span>
      </span>
      <button
        type="button"
        onClick={() => {
          setAchievementToastsDisabled(!off);
          setOff(!off);
        }}
        aria-pressed={!off}
        className={
          "smallcaps border px-3 py-1 text-[10px] transition-colors " +
          (off
            ? "border-white/15 bg-white/[0.03] text-parchment-400 hover:border-white/30"
            : "border-verdigris-glow/50 bg-verdigris/10 text-verdigris-glow")
        }
      >
        {off ? "Off · turn on" : "On · turn off"}
      </button>
    </div>
  );
}
