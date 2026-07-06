"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Castle,
  Crown,
  Flame,
  Footprints,
  Gem,
  Handshake,
  Hourglass,
  Lock,
  Medal,
  Milestone,
  Rocket,
  Scale,
  Shield,
  ShieldOff,
  Skull,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchMe } from "@/lib/authClient";
import { RARITY_LABEL, RARITY_ORDER, type AchievementRarity } from "@/lib/achievements";

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

// The catalog's icon names resolved to real components. Unknown names fall back
// to a medal so a future achievement never renders blank.
const ICONS: Record<string, LucideIcon> = {
  Award,
  Castle,
  Crown,
  Flame,
  Footprints,
  Gem,
  Handshake,
  Hourglass,
  Medal,
  Milestone,
  Rocket,
  Scale,
  Shield,
  ShieldOff,
  Skull,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  Trophy,
};

// Accent per rarity, reused for the icon, the ring, and the rarity label.
const RARITY_ACCENT: Record<AchievementRarity, string> = {
  legendary: "#e0b256",
  epic: "#b78fd6",
  rare: "#4a9fee",
  common: "#7eb59a",
};

function AchievementCard({ a }: { a: AchievementView }) {
  const Icon = ICONS[a.icon] ?? Medal;
  const accent = RARITY_ACCENT[a.rarity];
  const showProgress = !a.unlocked && a.goal > 1 && a.progress > 0;
  return (
    <div
      className={
        "relative plate p-4 overflow-hidden transition " +
        (a.unlocked ? "gilt" : "opacity-70")
      }
      style={a.unlocked ? { borderColor: `${accent}66` } : undefined}
    >
      <div className="flex items-start gap-3">
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
      <p className={"mt-3 text-[13px] leading-relaxed " + (a.unlocked ? "text-parchment/90" : "text-parchment-400")}>
        {a.description}
      </p>
      {a.unlocked && a.unlockedAt != null && (
        <div className="mt-3 smallcaps text-[10px] text-parchment-400">
          Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
        </div>
      )}
      {showProgress && (
        <div className="mt-3">
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

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Achievements</h1>
            <p className="mt-3 text-parchment-200">
              {data
                ? requested
                  ? `What ${data.username} has unlocked across the board.`
                  : "Feats you have unlocked, and the ones still waiting."
                : "Feats to unlock across Nerf and Buff."}
            </p>
          </div>
          {data && (
            <div className="plate px-4 py-2 text-right">
              <div className="font-mono text-2xl text-parchment-50 tabular-nums">
                {data.unlockedCount}
                <span className="text-sm text-parchment-400">/{data.total}</span>
              </div>
              <div className="smallcaps text-[10px] text-parchment-400">Unlocked</div>
            </div>
          )}
        </div>

        {state === "loading" && <div className="mt-8 text-parchment-300/60">Loading…</div>}
        {state === "error" && (
          <div className="mt-8 plate p-6 text-parchment-300">
            Achievements are unavailable right now. Try again in a minute.
          </div>
        )}
        {state === "signin" && (
          <div className="mt-8 plate p-6 text-sm text-parchment-300">
            <Link href="/login?next=/achievements" className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to start unlocking achievements that follow your account everywhere.
          </div>
        )}

        {state === "ready" && data && (
          <div className="mt-8 space-y-10">
            {RARITY_ORDER.map((rarity) => {
              const group = data.achievements.filter((a) => a.rarity === rarity);
              if (!group.length) return null;
              // Unlocked first within each tier so earned feats lead.
              const sorted = [...group].sort(
                (x, y) => Number(y.unlocked) - Number(x.unlocked) || x.name.localeCompare(y.name),
              );
              return (
                <div key={rarity}>
                  <div className="rule-ornament mb-4">
                    <span className="font-display" style={{ color: RARITY_ACCENT[rarity] }}>
                      {RARITY_LABEL[rarity]}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
