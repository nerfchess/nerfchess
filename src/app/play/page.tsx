"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSavedAiGame } from "@/lib/gamePersistence";
import { loadRating } from "@/lib/rating";
import { fetchMe, type AccountUser } from "@/lib/authClient";
import { MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { AccountChip } from "@/components/AccountChip";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { Logo } from "@/components/Logo";
import { QueueButton } from "@/components/QueueButton";
import { useSharedMode } from "@/lib/modeState";
import {
  FIRST_GAME_TOUR_HREF,
  TUTORIAL_DONE_KEY,
  TUTORIAL_NUDGE_DISMISSED_KEY,
} from "@/components/tutorial/tourState";

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

// Rough Elo of each bot level, mirroring BOT_ELO in the game view so the
// strength pills carry the same estimates the board header shows.
const BOT_ELO: Record<"easy" | "medium" | "hard", number> = {
  easy: 1100,
  medium: 1500,
  hard: 1900,
};

export default function PlayPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  // Time control in seconds; base = 0 means unlimited (no clock).
  const [baseSec, setBaseSec] = useState<number>(10 * 60);
  const [incrementSec, setIncrementSec] = useState<number>(0);
  // One shared mode for the whole page (Buff default, ?mode= override, last
  // choice remembered): the top selector, the online queue, the friend link,
  // and the bot game all read it, so no two sections can disagree.
  const [gameMode, setSharedMode] = useSharedMode();
  // Plain chess (no nerfs, no buffs) only exists against the bot; it is a
  // deliberate bot-only override of the shared mode, never a page mode.
  const [plainBot, setPlainBot] = useState(false);
  const botMode: "nerf" | "buff" | "plain" = plainBot ? "plain" : gameMode;
  const [rating, setRating] = useState<number | null>(null);
  const [games, setGames] = useState<number>(0);
  // Signed-in account (null while unknown / signed out). Buff and Nerf bot
  // games route to a REAL rated house bot for a signed-in account so wins move
  // the account/leaderboard rating; everything else stays a local casual game.
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [starting, setStarting] = useState(false);
  // "New here? Take the tour" chip: shown only to players who have neither
  // finished (or skipped) the first-game tour nor dismissed the chip itself.
  const [tourNudge, setTourNudge] = useState(false);
  useEffect(() => {
    // loadRating() reads localStorage (client-only); defer the paint off the
    // synchronous effect body so it doesn't cascade a render inline.
    queueMicrotask(() => {
      const r = loadRating();
      setRating(Math.round(r.rating));
      setGames(r.games);
      try {
        if (
          window.localStorage.getItem(TUTORIAL_DONE_KEY) == null &&
          window.localStorage.getItem(TUTORIAL_NUDGE_DISMISSED_KEY) == null
        ) {
          setTourNudge(true);
        }
      } catch {
        // Storage unavailable: never nag.
      }
    });
    fetchMe()
      .then((me) => setAccount(me ?? null))
      .catch(() => {});
  }, []);

  // Selecting a mode anywhere on the page updates the one shared mode: the
  // online queue, friend link, and bot ruleset all follow. Picking Buff or
  // Nerf also clears a Plain-chess bot override.
  const selectMode = (m: "nerf" | "buff") => {
    setSharedMode(m);
    setPlainBot(false);
  };

  // Local, offline AI game (Plain chess, signed-out play, or a fallback when
  // the bot server is unreachable). Casual: local games can't be cheat-proof,
  // so they never touch the account/leaderboard rating.
  const startLocal = () => {
    const params = new URLSearchParams({
      difficulty,
      color,
      t: String(baseSec),
      inc: String(incrementSec),
      rated: "0",
      // buff | nerf | plain. Plain is a normal no-nerf, no-buff game vs the bot.
      mode: botMode,
    });
    router.push(`/game?${params.toString()}`);
  };

  const start = async () => {
    clearSavedAiGame();
    // Plain chess has no ranked bucket, and rating only moves for real
    // accounts, so those stay local + casual. A signed-in Buff/Nerf game plays
    // a REAL house bot on the server so a win moves the account rating, exactly
    // like a queue game.
    if (botMode === "plain" || !account || account.isGuest) {
      startLocal();
      return;
    }
    setStarting(true);
    const session = new MPSession();
    session.persistFriendSession = false;
    try {
      const paired = await session.playBot(difficulty, botMode, baseSec, incrementSec, color);
      saveOnlineSeat(paired.id, { color: paired.color, token: paired.token });
      session.destroy();
      router.push(`/game/${paired.id}`);
    } catch {
      // Bots busy/paused or the server is unreachable: fall back to a local
      // casual game so Start always does something.
      session.destroy();
      setStarting(false);
      startLocal();
    }
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

        {tourNudge && (
          <div
            role="note"
            className="mt-4 flex items-center gap-3 plate border-gold/30 bg-gold/5 px-4 py-2.5"
          >
            <span className="min-w-0 text-[13px] text-parchment-200">
              New here?{" "}
              <Link
                href={FIRST_GAME_TOUR_HREF}
                className="font-semibold text-gold-leaf underline decoration-gold/50 underline-offset-2 hover:decoration-gold"
              >
                Take the tour
              </Link>
              <span className="hidden sm:inline">: a guided first game, about 3 minutes.</span>
            </span>
            <button
              type="button"
              aria-label="Dismiss tour suggestion"
              onClick={() => {
                setTourNudge(false);
                try {
                  window.localStorage.setItem(TUTORIAL_NUDGE_DISMISSED_KEY, "1");
                } catch {
                  // Storage unavailable: it just hides for this visit.
                }
              }}
              className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-parchment-400 transition hover:bg-white/10 hover:text-parchment-100"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ModeCard
            mode="buff"
            selected={gameMode === "buff"}
            onClick={() => selectMode("buff")}
            title="Buff mode"
            tagline="Power-ups"
            body="Start with normal chess. Draft powers for your own army."
            recommended
          />
          <ModeCard
            mode="nerf"
            selected={gameMode === "nerf"}
            onClick={() => selectMode("nerf")}
            title="Nerf mode"
            tagline="Handicaps"
            body="Start with a secret handicap. Draft curses for your opponent."
          />
        </div>

        <div className="mt-6">
          <QueueButton mode={gameMode} onModeChange={selectMode} showModeCards={false} />
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
          <div>
            <Group label="Game type">
              <Pill selected={botMode === "buff"} onClick={() => selectMode("buff")}>Buff</Pill>
              <Pill selected={botMode === "nerf"} onClick={() => selectMode("nerf")}>Nerf</Pill>
              <Pill selected={botMode === "plain"} onClick={() => setPlainBot(true)}>Plain chess</Pill>
            </Group>
            <p className="mt-2 text-[11px] text-parchment-400">
              {botMode === "plain"
                ? "Ordinary chess. No cards."
                : botMode === "buff"
                  ? "Draft buffs to outbuild the bot."
                  : "A secret nerf, revealed when the game ends."}
            </p>
          </div>

          <Group label="Bot strength">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Pill key={d} selected={difficulty === d} onClick={() => setDifficulty(d)}>
                {d[0].toUpperCase() + d.slice(1)}
                <span className="ml-1.5 font-mono text-[10px] opacity-60">~{BOT_ELO[d]}</span>
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
            disabled={starting}
            className="w-full py-3.5 rounded-full btn-leaf font-display text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
          >
            {starting ? "Finding a bot…" : "Start game"}
            {!starting && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
          {botMode !== "plain" && (
            <p className="mt-2 text-center text-[11px] text-parchment-400">
              {account && !account.isGuest
                ? "Rated: a win moves your account rating."
                : "Casual. Sign in to play rated bot games."}
            </p>
          )}
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

// Each mode card wears its color identity (Nerf slightly red, Buff blue) at
// all times; selecting it deepens the border, wash, and glow.
function ModeCard({
  mode,
  selected,
  onClick,
  title,
  tagline,
  body,
  recommended = false,
}: {
  mode: "nerf" | "buff";
  selected: boolean;
  onClick: () => void;
  title: string;
  tagline: string;
  body: string;
  recommended?: boolean;
}) {
  const identity =
    mode === "nerf"
      ? {
          card: selected
            ? "border-mode-nerf/70 bg-mode-nerf/10 shadow-nerf"
            : "border-mode-nerf/25 hover:border-mode-nerf/50 hover:bg-mode-nerf/5",
          title: "text-mode-nerfGlow",
        }
      : {
          card: selected
            ? "border-mode-buff/70 bg-mode-buff/10 shadow-buff"
            : "border-mode-buff/25 hover:border-mode-buff/50 hover:bg-mode-buff/5",
          title: "text-mode-buffGlow",
        };
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={"plate p-4 text-left transition " + identity.card}
    >
      <div className="flex items-center gap-2">
        <div className={"font-display text-xl font-semibold " + identity.title}>
          {title}
        </div>
        {recommended && (
          <span className="smallcaps border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[8px] text-gold-leaf">
            Recommended
          </span>
        )}
      </div>
      <div className={"mt-0.5 smallcaps text-[9px] " + identity.title}>{tagline}</div>
      <p className="mt-1.5 text-[12px] leading-snug text-parchment-300">{body}</p>
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
      aria-pressed={selected}
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
