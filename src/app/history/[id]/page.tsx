"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { BoardEvalStrip, matchRulePhrases } from "@/components/EvalBar";
import { Logo } from "@/components/Logo";
import { MoveList } from "@/components/MoveList";
import { boardAtPly, replayUci } from "@/lib/gameReview";
import { CompletedGame, loadGameHistory, timeControlLabel } from "@/lib/gameHistory";
import { gameToPGN } from "@/lib/pgn";
import { TIER_LABEL } from "@/lib/tiers";
import { useZenHotkey } from "@/lib/useZenMode";
import { Button } from "@/components/ui/Button";
import { NotFoundPanel } from "@/app/_components/NotFoundPanel";
import { NOT_FOUND_COPY } from "@/app/_components/notFoundCopy";
import Loading from "./loading";

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "no-moves"; game: CompletedGame }
  | { kind: "replay"; game: CompletedGame };

// Local replay of a game from this device's history. Entries recorded since
// replays shipped carry their UCI move list; older online games fall back to
// the server archive at /game/{id} when we know the match id.
export default function HistoryReplayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entryId = String(params.id ?? "");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    queueMicrotask(() => {
      const game = loadGameHistory().find((g) => g.id === entryId);
      if (!game) {
        setState({ kind: "missing" });
      } else if (game.moves && game.moves.length > 0) {
        setState({ kind: "replay", game });
      } else if (game.serverGameId) {
        router.replace(`/game/${game.serverGameId}`);
      } else {
        setState({ kind: "no-moves", game });
      }
    });
  }, [entryId, router]);

  if (state.kind === "replay") return <Replay game={state.game} />;

  // Until the stored entry is read (one microtask after mount), the route
  // skeleton holds the replay's geometry; a bare "Loading..." line used a
  // different nav padding and swapped for a board (F024).
  if (state.kind === "loading") return <Loading />;

  // Both dead ends use the shared panel, so they read like every other
  // missing-thing state on the site (F040).
  if (state.kind === "missing") {
    const copy = NOT_FOUND_COPY.historyGame;
    return (
      <NotFoundPanel title={copy.title} detail={copy.detail} action={copy.action} secondary={copy.secondary} />
    );
  }

  const copy = NOT_FOUND_COPY.historyNoMoves;
  return (
    <NotFoundPanel
      eyebrow="Replay unavailable"
      title={copy.title}
      detail={copy.detail}
      action={copy.action}
      secondary={copy.secondary}
    />
  );
}

function Replay({ game }: { game: CompletedGame }) {
  const { history } = useMemo(() => replayUci(game.moves ?? []), [game.moves]);
  const [ply, setPly] = useState(history.length);
  const displayBoard = useMemo(() => boardAtPly(history, ply), [history, ply]);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;

  // `z` works on the other two replay surfaces and on both game pages; a
  // saved game is read the same way, so it works here too. The exit control
  // is already global (HeaderSettingsMenu renders it), so this is only the
  // key binding plus marking this page's own chrome as hideable.
  useZenHotkey();

  const oppColor = game.myColor === "w" ? "b" : "w";
  const outcomeLabel =
    game.outcome === "win" ? "You won" : game.outcome === "loss" ? "You lost" : "Draw";

  // The eval bar, and everything it cannot see. A saved game records both
  // players' handicaps by name, so the caption can name them instead of waving
  // at "rules"; a line containing a pocket drop is flagged separately, because
  // that is a position plain chess could not have reached at all.
  const evalRules = useMemo(
    () =>
      matchRulePhrases({
        whiteNerf: game.myColor === "w" ? game.myNerf?.name : game.opponentNerf?.name,
        blackNerf: game.myColor === "w" ? game.opponentNerf?.name : game.myNerf?.name,
        hasDrops: history.some((m) => m.drop),
      }),
    [game.myColor, game.myNerf, game.opponentNerf, history],
  );

  // Export the replayed game. The analysis board and the result screen both
  // offer PGN and this surface did not, which made a saved game the one place
  // where the moves were visible but not takeable. Nerfs ride along as
  // WhiteNerf and BlackNerf tags: a reader that does not know them ignores
  // them, and one that does can say why a legal-looking move never happened.
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
    },
    [],
  );
  const copyPgn = async () => {
    const pgn = gameToPGN({
      moves: history,
      result: null,
      white: game.myColor === "w" ? "You" : game.opponent,
      black: game.myColor === "w" ? game.opponent : "You",
      whiteNerf: game.myColor === "w" ? game.myNerf?.name : game.opponentNerf?.name,
      blackNerf: game.myColor === "w" ? game.opponentNerf?.name : game.myNerf?.name,
      startedAt: game.endedAt,
    });
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be refused (an insecure origin, or a permission
      // the user declined). Fall back to a download rather than failing
      // silently, which would look like a dead button.
      const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nerfchess-${game.id}.pgn`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <main className="min-h-screen">
      <nav className="zen-hide flex items-center justify-between px-5 sm:px-10 py-5">
        <Logo />
        <Link href="/history" className="px-3 py-1.5 text-sm hover:bg-[color:var(--bg-raised)] text-parchment-100">
          Back to history
        </Link>
      </nav>
      <div className="mx-auto w-full max-w-[1100px] px-3 pb-10 sm:px-6">
        {/* The page had no h1 (F132). The visible summary line below already
            says what this is, so the heading is for assistive tech and the
            document outline only; the layout does not change. */}
        <h1 className="sr-only">
          Replay: {outcomeLabel} against {game.opponent}
        </h1>
        <div className="zen-hide mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-parchment-400">
          <span>
            {outcomeLabel} · {game.reason} · {timeControlLabel(game.baseSec, game.incSec)} ·{" "}
            {new Date(game.endedAt).toLocaleDateString()}
          </span>
          <Button size="sm" onClick={copyPgn} aria-live="polite">
            {copied ? "PGN copied" : "Copy PGN"}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <BoardPlayerRow
              board={displayBoard}
              playerColor={oppColor}
              myColor={game.myColor}
              name={game.opponent}
              className="min-w-0 !px-0 !py-1"
            />
            <div className="w-full max-w-[720px]">
              <Board
                board={displayBoard}
                legalMoves={[]}
                orientation={game.myColor}
                onMove={() => {}}
                myColor={game.myColor}
                lastMove={lastMove}
                disabled
              />
            </div>
            <BoardPlayerRow
              board={displayBoard}
              playerColor={game.myColor}
              myColor={game.myColor}
              name="You"
              className="min-w-0 !px-0 !py-1"
            />
            <BoardEvalStrip board={displayBoard} rules={evalRules} className="w-full max-w-[720px]" />
            <div className="mt-2 space-y-1.5">
              {game.myNerf && <RuleLine label="Your rule" nerf={game.myNerf} />}
              {game.opponentNerf && <RuleLine label="Opponent rule" nerf={game.opponentNerf} />}
            </div>
          </div>
          <div className="sm:w-56 sm:shrink-0">
            <MoveList
              moves={history}
              currentPly={ply}
              onPlyChange={(p) => setPly(Math.max(0, Math.min(p, history.length)))}
              compact
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function RuleLine({
  label,
  nerf,
}: {
  label: string;
  nerf: NonNullable<CompletedGame["myNerf"]>;
}) {
  return (
    <div className="plate p-2 px-3">
      <span className="text-[12px] text-parchment-400">{label} </span>
      <span className={`font-display text-sm font-semibold tier-${nerf.tier}`}>{nerf.name}</span>
      {/* Rule text is content, so the 13px body floor (text-xs is 10.5px on
          the 14px root). */}
      <span className="text-[13px] leading-snug text-parchment-300">
        : {nerf.description} <span className="text-parchment-400">({TIER_LABEL[nerf.tier] ?? ""})</span>
      </span>
    </div>
  );
}
