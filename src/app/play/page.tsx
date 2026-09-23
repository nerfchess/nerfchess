"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { clearSavedAiGame } from "@/lib/gamePersistence";
import { SiteHeader } from "@/components/SiteHeader";
import { useSharedMode } from "@/lib/modeState";
import { Button } from "@/components/ui/Button";
import { BotSetupSkeleton } from "./PlaySkeleton";
import { PlayIntro } from "./PlayIntro";
import {
  BotStrengthLabel,
  formatTimeControl,
  Group,
  Pill,
  range,
  TIME_PRESETS,
  TIME_STEPS_SEC,
  TimeSlider,
} from "./setupParts";

export default function PlayPage() {
  // Only the setup card reads useSearchParams (the ?mode= deep link, through
  // useSharedMode), so only the card sits in the Suspense boundary. The
  // header and the intro (title, tour note, Play online door) are static and
  // prerender with the page. The boundary used to wrap all of it with an empty
  // <main> as the fallback, so a hard load painted a blank page, header
  // included, until the JavaScript ran (F019).
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="max-w-2xl mx-auto px-6 py-5">
        <PlayIntro />

        <Suspense fallback={<BotSetupSkeleton />}>
          <BotSetup />
        </Suspense>
      </section>
    </main>
  );
}

function BotSetup() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  // Time control in seconds; base = 0 means unlimited (no clock).
  const [baseSec, setBaseSec] = useState<number>(10 * 60);
  const [incrementSec, setIncrementSec] = useState<number>(0);
  // One shared mode for the whole page (Buff default, ?mode= override, last
  // choice remembered): the top mode cards and the bot setup both read it, so
  // the two selectors can never disagree. This page is bot practice only; the
  // shared mode still persists site-wide so the lobby opens on the same choice.
  const [gameMode, setSharedMode] = useSharedMode();
  // Plain chess (no nerfs, no buffs) only exists against the bot; it is a
  // deliberate bot-only override of the shared mode, never a page mode.
  const [plainBot, setPlainBot] = useState(false);
  const botMode: "nerf" | "buff" | "plain" = plainBot ? "plain" : gameMode;
  // Selecting a mode anywhere on the page updates the one shared mode: the
  // online queue, friend link, and bot ruleset all follow. Picking Buff or
  // Nerf also clears a Plain-chess bot override.
  const selectMode = (m: "nerf" | "buff") => {
    setSharedMode(m);
    setPlainBot(false);
  };

  // Practice against the computer is ALWAYS casual: a local, offline AI game
  // that never touches the account or leaderboard rating (rated:"0"). There is
  // deliberately no rated bot path here anymore -- computer games are practice,
  // so a win or loss against a bot can never move a player's rating.
  const start = () => {
    clearSavedAiGame();
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

  return (
    <div className="mt-6 plate p-6 sm:p-7 space-y-6">
      <div>
        <Group label="Game type">
          <Pill selected={botMode === "buff"} onClick={() => selectMode("buff")}>Buff</Pill>
          <Pill selected={botMode === "nerf"} onClick={() => selectMode("nerf")}>Nerf</Pill>
          <Pill selected={botMode === "plain"} onClick={() => setPlainBot(true)}>Plain chess</Pill>
        </Group>
        <p className="mt-2 text-[13px] text-parchment-400">
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
            <BotStrengthLabel level={d} />
          </Pill>
        ))}
      </Group>

      <Group label="Your color">
        <Pill selected={color === "w"} onClick={() => setColor("w")}>White</Pill>
        <Pill selected={color === "random"} onClick={() => setColor("random")}>Random</Pill>
        <Pill selected={color === "b"} onClick={() => setColor("b")}>Black</Pill>
      </Group>

      <div className="space-y-4">
        <Group label="Time control">
          {TIME_PRESETS.map((p) => (
            <Pill
              key={p.label}
              selected={baseSec === p.baseSec && incrementSec === p.incrementSec}
              onClick={() => {
                setBaseSec(p.baseSec);
                setIncrementSec(p.incrementSec);
              }}
            >
              {p.label}
            </Pill>
          ))}
        </Group>
        <TimeSlider
          label="Time per side"
          value={baseSec}
          values={[0, ...TIME_STEPS_SEC]}
          display={baseSec === 0 ? "Unlimited" : formatTimeControl(baseSec)}
          formatEdgeLabel={formatTimeControl}
          onChange={setBaseSec}
        />
        <TimeSlider
          label="Increment (seconds)"
          value={incrementSec}
          values={range(0, 30, 1)}
          display={String(incrementSec)}
          disabled={baseSec === 0}
          onChange={setIncrementSec}
        />
      </div>

      <Button tone="leaf"
        onClick={start}
        className="w-full py-3.5 text-lg flex">
        Start game
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Button>
    </div>
  );
}
