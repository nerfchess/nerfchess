"use client";

// The three other ways into a game, under Quick pairing: Lichess's lobby
// buttons, icon left, label flush left. Each opens its existing flow (the
// challenges fold, the friends fold, bot practice).
//
// Shared by the lobby and its skeleton so the skeleton has the row's real
// geometry (the labels wrap to two lines at some widths, which no bar can
// predict). Without handlers, as in the skeleton, the two in-page buttons are
// disabled; the bot practice link works either way.

import { Cpu, Swords, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

export function LobbyWaysIn({
  onCustomGame,
  onChallengeFriend,
}: {
  onCustomGame?: () => void;
  onChallengeFriend?: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Button tone="default" size="lg" align="start" disabled={!onCustomGame} onClick={onCustomGame}>
        <Swords size={22} strokeWidth={1.6} aria-hidden className="shrink-0 text-parchment-300" />
        Custom game
      </Button>
      <Button tone="default" size="lg" align="start" disabled={!onChallengeFriend} onClick={onChallengeFriend}>
        <Users size={22} strokeWidth={1.6} aria-hidden className="shrink-0 text-parchment-300" />
        Challenge a friend
      </Button>
      <LinkButton tone="default" size="lg" align="start" href="/play">
        <Cpu size={22} strokeWidth={1.6} aria-hidden className="shrink-0 text-parchment-300" />
        Play against computer
      </LinkButton>
    </div>
  );
}
