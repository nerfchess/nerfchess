"use client";

// The "First Game" guided tour route: a REAL local bot game with coach marks.
//
// Composition, not duplication: this page renders the existing /game page
// component (which configures itself from the query string — weakest bot, no
// clock, buff mode) and layers the FirstGameTour controller on top. The game
// page's only tour awareness is the ?tour=1 state-broadcast hook.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GamePageWrapper from "@/app/game/page";
import { FirstGameTour } from "@/components/tutorial/FirstGameTour";
import { clearSavedAiGame, loadSavedAiGame } from "@/lib/gamePersistence";
import { FIRST_GAME_TOUR_HREF } from "@/components/tutorial/tourState";

export default function FirstGameTourPage() {
  return (
    <Suspense fallback={null}>
      <FirstGameTourRoute />
    </Suspense>
  );
}

function FirstGameTourRoute() {
  const router = useRouter();
  const params = useSearchParams();
  // The guided game is always the same fixed configuration. A bare or
  // hand-edited URL normalizes to it BEFORE the game page mounts (the game
  // bootstraps once, from the params it first sees).
  const configured = params.get("tour") === "1" && params.get("mode") === "buff";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured) {
      router.replace(FIRST_GAME_TOUR_HREF);
      return;
    }
    // A FINISHED tour game left in storage would resume straight onto its end
    // screen; clear it so re-taking the tour deals a fresh game. A live
    // mid-tour game (page refresh) still resumes normally. The ready flip is
    // deferred a microtask so the effect body never sets state synchronously.
    const saved = loadSavedAiGame(params.toString());
    if (saved?.game.result) clearSavedAiGame();
    queueMicrotask(() => setReady(true));
  }, [configured, params, router]);

  if (!configured || !ready) return null;
  return (
    <>
      <GamePageWrapper />
      <FirstGameTour />
    </>
  );
}
