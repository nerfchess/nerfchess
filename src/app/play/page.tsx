"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSavedAiGame } from "@/lib/gamePersistence";
import { loadRating } from "@/lib/rating";
import { AccountChip } from "@/components/AccountChip";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { Logo } from "@/components/Logo";
import { QueueButton } from "@/components/QueueButton";

const TIME_STEPS_SEC = [
  30,
  45,
  60,
  90,
  120,
  150,
  180,
  ...range(5 * 60, 10 * 60, 60),
  ...range(12 * 60, 30 * 60, 2 * 60),
  ...range(35 * 60, 2 * 60 * 60, 5 * 60),
];

export default function PlayPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  // Time control in seconds; base = 0 means unlimited (no clock).
  const [baseSec, setBaseSec] = useState<number>(10 * 60);
  const [incrementSec, setIncrementSec] = useState<number>(0);
  // The two sections of the game: Buff mode (no nerfs, pure buff drafting)
  // and Nerf mode (secret handicaps, revealed only when the game ends).
  const [gameMode, setGameMode] = useState<"nerf" | "buff">("buff");
  const [rating, setRating] = useState<number | null>(null);
  const [games, setGames] = useState<number>(0);
  useEffect(() => {
    const r = loadRating();
    setRating(Math.round(r.rating));
    setGames(r.games);
  }, []);

  const start = () => {
    clearSavedAiGame();
    const params = new URLSearchParams({
      difficulty,
      color,
      nerf: "random",
      t: String(baseSec),
      inc: String(incrementSec),
      // Draft games are casual until a separate Draft rating exists.
      rated: "0",
      mode: gameMode,
    });
    router.push(`/game?${params.toString()}`);
  };

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-3">
          {rating != null && (
            <Link
              href="/leaderboard"
              className="hidden sm:flex px-3 py-1.5 border border-gold/30 bg-gold/5 hover:border-gold/50 transition items-center gap-2 text-xs"
            >
              <span className="smallcaps text-[10px] text-parchment-400">Rating</span>
              <span className="font-mono text-sm text-parchment-100">{rating}</span>
              <span className="font-mono text-[10px] text-parchment-400">·</span>
              <span className="font-mono text-[10px] text-parchment-400">{games}g</span>
            </Link>
          )}
          <Link href="/lobby" className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium hover:bg-white/5 text-gold-leaf">Lobby</Link>
          <Link href="/leaderboard" className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium hover:bg-white/5 text-parchment-100">Leaderboard</Link>
          <Link href="/profile" className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium hover:bg-white/5 text-parchment-100">Profile</Link>
          <Link href="/codex" className="hidden sm:inline-block px-3 py-1.5 text-sm font-medium hover:bg-white/5 text-parchment-100">Rules</Link>
          <span className="hidden sm:block"><AccountChip /></span>
          <MobileNavMenu />
        </div>
      </nav>

      <section className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display text-5xl">New game</h1>
        <p className="mt-3 text-parchment-200">
          Two ways to play. Buff mode: no handicaps, draft buffs and outplay your
          opponent. Nerf mode: secret handicaps you draft cards to escape, revealed
          only when the game ends.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ModeCard
            selected={gameMode === "buff"}
            onClick={() => setGameMode("buff")}
            title="Buff mode"
            body="No nerfs at all. Every few moves both players draft a buff; the strongest build wins."
          />
          <ModeCard
            selected={gameMode === "nerf"}
            onClick={() => setGameMode("nerf")}
            title="Nerf mode"
            body="Pick a secret nerf your opponent never sees until the end. Rare drafts can soften or break it."
          />
        </div>

        <div className="mt-6">
          <QueueButton />
          <p className="mt-1.5 text-[11px] text-parchment-400">
            Quick pairing runs Buff mode.
          </p>
        </div>

        <div className="mt-4">
          <Link
            href={`/friend?mode=${gameMode}`}
            className="btn-leaf btn-cta w-full flex items-center justify-center gap-3 px-6 py-4 font-display text-lg font-semibold"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Play a Friend
          </Link>
          <div className="rule-ornament mt-6">
            <span>or set up a bot game</span>
          </div>
        </div>

        <div className="mt-8 plate p-6 sm:p-7 space-y-6">
          <Group label="Bot strength">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Pill key={d} selected={difficulty === d} onClick={() => setDifficulty(d)}>
                {d[0].toUpperCase() + d.slice(1)}
              </Pill>
            ))}
          </Group>

          <Group label="Your color">
            <Pill selected={color === "w"} onClick={() => setColor("w")}>White</Pill>
            <Pill selected={color === "random"} onClick={() => setColor("random")}>Random</Pill>
            <Pill selected={color === "b"} onClick={() => setColor("b")}>Black</Pill>
          </Group>

          <div className="space-y-4">
            <TimeSlider
              label="Time per Side"
              value={baseSec}
              values={[0, ...TIME_STEPS_SEC]}
              display={baseSec === 0 ? "Unlimited" : formatTimeControl(baseSec)}
              formatEdgeLabel={formatTimeControl}
              onChange={setBaseSec}
            />
            <TimeSlider
              label="Increment (Seconds)"
              value={incrementSec}
              values={range(0, 30, 1)}
              display={String(incrementSec)}
              disabled={baseSec === 0}
              onChange={setIncrementSec}
            />
          </div>

          <button
            onClick={start}
            className="w-full py-3.5 rounded-full btn-leaf font-display text-lg flex items-center justify-center gap-2"
          >
            Start game
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}

function range(start: number, end: number, step: number) {
  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

function formatTimeControl(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}:${remainingSec.toString().padStart(2, "0")}`;
}

function TimeSlider({
  label,
  value,
  values,
  display,
  disabled = false,
  formatEdgeLabel = String,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  display: string;
  disabled?: boolean;
  formatEdgeLabel?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const index = Math.max(0, values.indexOf(value));

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between mb-2">
        <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
        <div className="font-mono text-sm text-gold-leaf tabular-nums">{display}</div>
      </div>
      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        className="w-full accent-gold-leaf disabled:cursor-not-allowed"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-parchment-400">
        <span>{formatEdgeLabel(values[0])}</span>
        <span>{formatEdgeLabel(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={
        "plate p-4 text-left transition " +
        (selected
          ? "border-gold/60 bg-gold/10 shadow-leaf"
          : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]")
      }
    >
      <div className={"font-display text-xl font-semibold " + (selected ? "text-gold-leaf" : "text-parchment")}>
        {title}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-parchment-300">{body}</p>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="smallcaps text-[11px] text-parchment-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-2 rounded-full border font-display transition " +
        (selected
          ? "bg-gold/20 border-gold text-gold-leaf shadow-leaf"
          : "border-white/15 text-parchment-200 hover:border-white/30 hover:bg-white/5")
      }
    >
      {children}
    </button>
  );
}
