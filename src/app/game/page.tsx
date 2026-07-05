"use client";

import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { ClockPill } from "@/components/ClockPill";
import { GameOver } from "@/components/GameOver";
import { MobileActionsMenu } from "@/components/MobileActionsMenu";
import { MobileMoveDrawer } from "@/components/MobileMoveDrawer";
import { MoveList } from "@/components/MoveList";
import { PlayerNerfCard } from "@/components/PlayerNerfCard";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { AILevel, aiBudgetMs, pickAIMove } from "@/engine/ai";
import { Nerf, type GameContext } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID, openingNerfPool } from "@/engine/nerfs/library";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { BuffUsedToast } from "@/components/BuffUsedToast";
import {
  aiActivateBuffs,
  aiResolveDraft,
  applyTurnStart,
  bankDraft,
  currentHint,
  enableDraftMode,
  NerfGame,
  UNRESTRICTED_NERF,
  legalMoves,
  makeContext,
  newGame,
  pickDraftCard,
  playMove,
  resign,
} from "@/engine/game";
import { BuffDock, EnemyBuffModal, TargetingBanner, useBuffTargeting } from "@/components/BuffDock";
import { draftCardNoun } from "@/engine/buff";
import { draftZones } from "@/lib/draftOnline";
import { MobileBuffDrawer } from "@/components/MobileBuffDrawer";
import { DraftNotice } from "@/components/DraftNotice";
import { DraftOverlay, LockInCountdown } from "@/components/DraftOverlay";
import { NerfCard } from "@/components/NerfCard";
import { makeSeed } from "@/engine/rng";
import { BoardState, Color, Move } from "@/engine/types";
import { cloneBoard, findKing, isInCheck, makeMove, moveToUCI } from "@/engine/board";
import { computeMoveRisks } from "@/engine/moveSafety";
import { loadSettings } from "@/lib/settings";
import type { QueuedPremove } from "@/components/Board";
import { buildCustomNerf, CustomNerf } from "@/engine/nerfs/custom";
import { isMuted, playCapture, playCheck, playNerf, playMove as playMoveSfx, setMuted } from "@/lib/sounds";
import { nerfSummary, outcomeFor, recordCompletedGame } from "@/lib/gameHistory";
import { applyResult, loadRatingFor, saveRatingFor } from "@/lib/rating";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadSavedAiGame, restoreSavedAiGame, saveAiGame, snapshotGame } from "@/lib/gamePersistence";
import { boardAtPly } from "@/lib/gameReview";
import { premoveOptionsFor } from "@/lib/premoves";
import { categoryForTimeControl } from "@/lib/ratingCategories";
import type { AIWorkerRequest, AIWorkerResponse } from "@/workers/aiWorker";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

function pickRandomNerf(): Nerf {
  // Random rolls respect the temporary opening cap (tiers 1-2 only).
  const playable = openingNerfPool();
  return playable[Math.floor(Math.random() * playable.length)];
}

/** Deal the opening nerf draft: four distinct nerfs sharing one tier pairing,
 * the scheme the online worker uses (dealNerfDraftOptions). Pick an anchor
 * tier and a partner tier within one of it (possibly the same), then give
 * each side (options 0-1 and 2-3) one card of the anchor tier and one of the
 * partner tier, so both players always draft from the same tier pair. */
function dealNerfOptions(exclude: Set<string>): Nerf[] {
  // The deal draws from the capped opening pool (see MAX_OPENING_NERF_TIER).
  const pool = openingNerfPool().filter((d) => !exclude.has(d.id));
  const ofTier = (tier: number) => pool.filter((d) => d.tier === tier);
  const takeOne = (tier: number, taken: Set<string>): Nerf => {
    const candidates = ofTier(tier).filter((d) => !taken.has(d.id));
    const card = candidates[Math.floor(Math.random() * candidates.length)];
    taken.add(card.id);
    return card;
  };
  // A tier pairing is feasible only if the pool supplies the four distinct
  // cards: four of the anchor tier when the partner tier matches it,
  // otherwise two of each.
  const feasible = (anchor: number, partner: number) =>
    partner === anchor
      ? ofTier(anchor).length >= 4
      : ofTier(anchor).length >= 2 && ofTier(partner).length >= 2;
  const tiers = [...new Set(pool.map((d) => d.tier))];
  const anchorTiers = tiers.filter((anchor) =>
    tiers.some((partner) => Math.abs(partner - anchor) <= 1 && feasible(anchor, partner)),
  );
  const anchorTier = anchorTiers[Math.floor(Math.random() * anchorTiers.length)];
  const partnerTiers = tiers.filter(
    (partner) => Math.abs(partner - anchorTier) <= 1 && feasible(anchorTier, partner),
  );
  const partnerTier = partnerTiers[Math.floor(Math.random() * partnerTiers.length)];
  const taken = new Set<string>();
  const first = [takeOne(anchorTier, taken), takeOne(partnerTier, taken)];
  const second = [takeOne(anchorTier, taken), takeOne(partnerTier, taken)];
  // Randomize each side's card order and which side gets which hand, so
  // neither the anchor card nor a specific hand always lands on one player.
  if (Math.random() < 0.5) first.reverse();
  if (Math.random() < 0.5) second.reverse();
  return Math.random() < 0.5 ? [...first, ...second] : [...second, ...first];
}

const BOT_ELO: Record<AILevel, number> = {
  easy: 1100,
  medium: 1500,
  hard: 1900,
};

export default function GamePageWrapper() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <GamePage />
    </Suspense>
  );
}

function LoadingPanel() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="relative flex flex-col items-center">
        <div className="flex gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-gold-leaf animate-bob" />
          <span className="w-2 h-2 rounded-full bg-verdigris-glow animate-bob" style={{ animationDelay: "0.15s" }} />
          <span className="w-2 h-2 rounded-full bg-bruise-glow animate-bob" style={{ animationDelay: "0.3s" }} />
        </div>
        <div className="font-display text-xl text-parchment animate-flicker">
          Dealing the cards
        </div>
      </div>
    </main>
  );
}

function GamePage() {
  const router = useRouter();
  const params = useSearchParams();
  const querySignature = params.toString();
  const difficulty = (params.get("difficulty") ?? "medium") as AILevel;
  const myColorParam = params.get("color") ?? "random";
  const myNerfId = params.get("nerf") ?? "random";
  // Section split: mode=nerf (nerf pick, hidden until the end, nerf-modifier
  // buffs every ~10 moves) or mode=buff (no nerfs, normal buff drafts).
  // Old links with draft=1 and no mode keep the legacy merged rules.
  const modeParam = params.get("mode");
  const gameMode: "nerf" | "buff" | null =
    modeParam === "nerf" || modeParam === "buff" ? modeParam : null;
  // Draft mode: buff drafts on a cadence (plus a nerf draft outside buff mode).
  const draftMode = params.get("draft") === "1" || gameMode != null;
  // Games vs bots are casual by default; only rated games touch your rating.
  // Draft games are always casual until a separate Draft rating exists.
  const rated = params.get("rated") === "1" && !draftMode;
  // t = seconds per side; 0 (or missing) disables the clock entirely.
  const initialTimeMs = useMemo(() => {
    const t = parseInt(params.get("t") ?? "0", 10);
    return Number.isFinite(t) && t > 0 ? t * 1000 : 0;
  }, [params]);
  const incrementMs = useMemo(() => {
    const inc = parseInt(params.get("inc") ?? "0", 10);
    return Number.isFinite(inc) && inc > 0 ? inc * 1000 : 0;
  }, [params]);
  const clockEnabled = initialTimeMs > 0;
  // Which independent rating bucket a rated result counts toward — derived
  // from the chosen time control, exactly like online games.
  const ratingCategory = categoryForTimeControl(initialTimeMs / 1000, incrementMs / 1000);

  const [myColor, setMyColor] = useState<Color>(() => {
    if (myColorParam === "w") return "w";
    if (myColorParam === "b") return "b";
    return Math.random() < 0.5 ? "w" : "b";
  });

  const [game, setGame] = useState<NerfGame | null>(null);
  // Draft mode's opening nerf draft: both players see two nerf cards and pick
  // one. The game object isn't created until the player commits.
  const [nerfDraft, setNerfDraft] = useState<{ myOptions: Nerf[]; aiOptions: Nerf[] } | null>(null);
  // Two-step nerf pick: the first click only selects; Confirm (or a second
  // click on the same card) commits it.
  const [nerfSelected, setNerfSelected] = useState<number | null>(null);
  // Lock-in deadlines (15s), mirroring the online rules: the nerf pick and
  // every buff offer auto-resolve when the timer runs out, and the game
  // clock is paused while an offer is open.
  const [nerfDeadline, setNerfDeadline] = useState<number | null>(null);
  const [offerDeadline, setOfferDeadline] = useState<number | null>(null);
  const [offerPausedAt, setOfferPausedAt] = useState<number | null>(null);
  // Offer index whose free lock-in window has expired: the draft panel moves
  // aside, the board comes back into view, and the clock resumes — the rest
  // of the deliberation costs the player's own time.
  const [offerOnClockIndex, setOfferOnClockIndex] = useState<number | null>(null);
  const [, force] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [premoves, setPremoves] = useState<QueuedPremove[]>([]);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [confirmingDraw, setConfirmingDraw] = useState(false);
  // A move held for confirmation (Settings > Gameplay > Move confirmation).
  const [confirmMovePending, setConfirmMovePending] = useState<Move | null>(null);
  const [showResult, setShowResult] = useState(true);
  const [drawOfferStatus, setDrawOfferStatus] = useState<"idle" | "offering" | "declined">("idle");
  const [whiteMs, setWhiteMs] = useState(initialTimeMs);
  const [blackMs, setBlackMs] = useState(initialTimeMs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(() => loadSettings());
  const [historyPly, setHistoryPly] = useState<number | null>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const [playerElo, setPlayerElo] = useState<number | null>(null);
  // Reveal controls: peek at the opponent's rule mid-game, and offer to show
  // your own rule to the opponent.
  const [oppPeek, setOppPeek] = useState(false);
  const [sharedMine, setSharedMine] = useState(false);
  const aiThinking = useRef(false);
  const gameRef = useRef<NerfGame | null>(null);
  const aiWorkerRef = useRef<Worker | null>(null);
  const aiRequestId = useRef(0);
  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const whiteCustomSpec = useRef<CustomNerf | null>(null);
  const blackCustomSpec = useRef<CustomNerf | null>(null);
  const turnStartedAtRef = useRef(Date.now());

  // whiteMs/blackMs are the single source of truth for remaining time: the
  // banked milliseconds each side had when their last turn ended. While a
  // side is on move, their live remaining time is banked minus the time since
  // the turn started; nothing else ever writes these values, so time only
  // decreases (plus increments) and never resets.
  const remainingClock = useCallback(
    (color: Color) => {
      const base = color === "w" ? whiteMs : blackMs;
      if (!clockEnabled || !game || game.result || game.board.turn !== color) return base;
      // Clock paused for a buff lock-in window: freeze the drain at the
      // moment the offer opened (turnStartedAtRef is shifted on resolve).
      const until = offerPausedAt ?? Date.now();
      return Math.max(0, base - Math.max(0, until - turnStartedAtRef.current));
    },
    [blackMs, clockEnabled, game, whiteMs, offerPausedAt]
  );

  // Bank the mover's clock at the moment their move is committed: subtract
  // the time spent this turn, add the increment, and start the opponent's
  // turn timer. Uses functional updates and no game state, so it is immune
  // to `playMove` mutating the game (the turn has already flipped by the
  // time any post-move code runs) and to stale closures.
  const commitClock = useCallback(
    (mover: Color) => {
      if (!clockEnabled) return;
      const now = Date.now();
      const spent = Math.max(0, now - turnStartedAtRef.current);
      turnStartedAtRef.current = now;
      const bank = (prev: number) => Math.max(0, prev - spent) + incrementMs;
      if (mover === "w") setWhiteMs(bank);
      else setBlackMs(bank);
    },
    [clockEnabled, incrementMs]
  );

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    return () => {
      aiWorkerRef.current?.terminate();
      aiWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setMutedState(isMuted());
    setPlayerElo(loadRatingFor(ratingCategory).rating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const saved = loadSavedAiGame(querySignature);
      if (saved) {
        const restored = restoreSavedAiGame(saved);
        if (restored) {
          setMyColor(saved.myColor);
          setGame(restored);
          setWhiteMs(saved.whiteMs);
          setBlackMs(saved.blackMs);
          setPremoves([]);
          whiteCustomSpec.current =
            saved.game.white.nerf.kind === "custom" ? saved.game.white.nerf.spec : null;
          blackCustomSpec.current =
            saved.game.black.nerf.kind === "custom" ? saved.game.black.nerf.spec : null;
          lastSeenMoveCount.current = restored.board.history.length;
          sawResult.current = !!restored.result;
          return;
        }
      }
    } catch {
      // Ignore incompatible saved games and deal a fresh one below.
    }

    if (draftMode) {
      // Buff mode: no nerfs at all, so the game starts immediately.
      if (gameMode === "buff") {
        const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, makeSeed());
        enableDraftMode(g, makeSeed(), { mode: "buff" });
        setHistoryPly(null);
        setGame(g);
        return;
      }
      // Deal both players' nerf options; the game starts when the player
      // picks, or when the 15s lock-in window auto-picks the first option.
      const dealt = dealNerfOptions(new Set());
      setNerfDraft({ myOptions: dealt.slice(0, 2), aiOptions: dealt.slice(2, 4) });
      setNerfDeadline(Date.now() + 15_000);
      return;
    }

    let myDb: Nerf;
    let myCustomSpec: CustomNerf | null = null;
    if (myNerfId === "__custom__") {
      try {
        const raw = sessionStorage.getItem("dc:active-custom");
        const spec = raw ? (JSON.parse(raw) as CustomNerf) : null;
        myCustomSpec = spec;
        myDb = spec ? buildCustomNerf(spec) : pickRandomNerf();
      } catch {
        myDb = pickRandomNerf();
      }
    } else if (myNerfId === "random") {
      myDb = pickRandomNerf();
    } else {
      myDb = IMPLEMENTED_BY_ID[myNerfId] ?? pickRandomNerf();
    }
    const aiDb = pickRandomNerf();
    const wDb = myColor === "w" ? myDb : aiDb;
    const bDb = myColor === "w" ? aiDb : myDb;
    whiteCustomSpec.current = myColor === "w" ? myCustomSpec : null;
    blackCustomSpec.current = myColor === "w" ? null : myCustomSpec;
    setHistoryPly(null);
    setGame(newGame(wDb, bDb, makeSeed()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft mode: the player picked their nerf; the bot picks one of its two
  // options at random and the game begins.
  const startDraftGame = (picked: Nerf) => {
    if (!nerfDraft) return;
    setNerfSelected(null);
    const aiDb = nerfDraft.aiOptions[Math.floor(Math.random() * nerfDraft.aiOptions.length)];
    const wDb = myColor === "w" ? picked : aiDb;
    const bDb = myColor === "w" ? aiDb : picked;
    const g = newGame(wDb, bDb, makeSeed());
    enableDraftMode(g, makeSeed(), { mode: gameMode ?? undefined });
    g.buffs!.players[myColor].nerfOptions = nerfDraft.myOptions.map((n) => n.id);
    g.buffs!.players[myColor === "w" ? "b" : "w"].nerfOptions = nerfDraft.aiOptions.map((n) => n.id);
    setNerfDraft(null);
    setNerfDeadline(null);
    setHistoryPly(null);
    setGame(g);
  };

  // Transient toast naming and explaining a card the bot just played, so its
  // effect on the board is never a mystery.
  const [oppUsedCard, setOppUsedCard] = useState<{
    card: { id: string; tier: number };
    label: string;
  } | null>(null);
  const oppUsedTimerRef = useRef<number | null>(null);
  const showOppUsedCard = (card: { id: string; tier: number }, label: string) => {
    setOppUsedCard({ card, label });
    if (oppUsedTimerRef.current) window.clearTimeout(oppUsedTimerRef.current);
    oppUsedTimerRef.current = window.setTimeout(() => setOppUsedCard(null), 7000);
  };

  // Draft mode: the bot resolves its pending buff drafts immediately.
  useEffect(() => {
    if (!game?.buffs || game.result) return;
    const botColor: Color = myColor === "w" ? "b" : "w";
    if (game.buffs.players[botColor].offer) {
      const before = game.buffs.players[botColor].buffs.length;
      aiResolveDraft(game, botColor);
      // Instants show on the board the moment the bot picks them; surface
      // what the card did, matching the online reveal-at-pick rule.
      const gained = game.buffs.players[botColor].buffs.slice(before);
      const instant = gained.find((b) => BUFF_BY_ID[b.id]?.kind === "instant" && !b.nullified);
      if (instant) {
        showOppUsedCard(
          { id: instant.id, tier: instant.tier },
          `Bot played a ${draftCardNoun(game.buffs.mode)}`,
        );
      }
      setGame({ ...game });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, myColor]);

  // Lock-in window and clock pause for my buff offers: a fresh offer arms
  // the 15s deadline and freezes the clock; resolving it shifts the turn
  // start forward by the paused span so the pick cost no time. Once the free
  // window has expired for an offer (offerOnClockIndex), the clock stays
  // live: the panel sits at the side and thinking runs on the player's time.
  useEffect(() => {
    const offer = game?.buffs?.players[myColor].offer ?? null;
    if (offer && offerPausedAt == null && offerOnClockIndex !== offer.index) {
      setOfferPausedAt(Date.now());
      setOfferDeadline(Date.now() + 15_000);
    } else if (!offer && offerPausedAt != null) {
      turnStartedAtRef.current += Date.now() - Math.max(offerPausedAt, turnStartedAtRef.current);
      setOfferPausedAt(null);
      setOfferDeadline(null);
    }
  }, [game, myColor, offerPausedAt, offerOnClockIndex]);

  useEffect(() => {
    if (!game) return;
    const persist = () =>
      saveAiGame({
        query: querySignature,
        myColor,
        game,
        whiteMs: remainingClock("w"),
        blackMs: remainingClock("b"),
        premoves,
        whiteCustomSpec: whiteCustomSpec.current,
        blackCustomSpec: blackCustomSpec.current,
      });
    persist();
    if (!clockEnabled || game.result) return;
    // The active side's clock keeps draining between renders, so re-save it
    // periodically and on page hide — a refresh must restore the live
    // remaining time, not the time as of the last move.
    window.addEventListener("pagehide", persist);
    const id = window.setInterval(persist, 3000);
    return () => {
      window.removeEventListener("pagehide", persist);
      window.clearInterval(id);
    };
  }, [game, querySignature, myColor, premoves, remainingClock, clockEnabled]);

  useEffect(() => {
    if (!game || historyPly == null) return;
    // A buff mutated the board outside move history (summon, removal,
    // teleport): replay can no longer reproduce the position, so snap any
    // in-progress review back to the live board.
    if (game.buffs?.historyDiverged) {
      setHistoryPly(null);
      return;
    }
    if (historyPly > game.board.history.length) {
      setHistoryPly(game.board.history.length);
    }
  }, [game, historyPly]);

  const moves = useMemo(() => (game ? legalMoves(game) : []), [game]);
  const moveRisks = useMemo(
    () =>
      uiSettings.moveRiskWarnings && game && game.board.turn === myColor
        ? computeMoveRisks(game, moves)
        : undefined,
    [game, moves, myColor, uiSettings.moveRiskWarnings]
  );

  useEffect(() => {
    if (!game) return;
    const shell = boardShellRef.current;
    const boardEl = shell?.querySelector("[data-board-measure]");
    if (!boardEl) return;
    const syncHeight = () => setBoardHeight(boardEl.getBoundingClientRect().height);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(boardEl);
    return () => observer.disconnect();
  }, [game]);

  // Build a "virtual" board that reflects the current actual board with every
  // queued premove applied in sequence. Pseudo-legal options for further
  // premoves are generated against this virtual board, so chained premoves
  // (move A then move B with A already applied) work naturally.
  //
  // We also synthesize "friendly-target" moves: moves that would land on one
  // of our own pieces. The user can premove these in anticipation of the
  // opponent capturing first; at execute time, if the friendly piece is still
  // there the real legal-move list won't include the move and the premove is
  // discarded.
  const myNerfForPremove = game ? (myColor === "w" ? game.white.nerf : game.black.nerf) : null;
  const myStateForPremove = game ? (myColor === "w" ? game.white.state : game.black.state) : null;

  const { virtualBoard, validPremoves } = useMemo(() => {
    if (!game || game.result || (game.board.turn === myColor && premoves.length === 0)) {
      return { virtualBoard: null as BoardState | null, validPremoves: [] as QueuedPremove[] };
    }
    let board = cloneBoard(game.board);
    board.turn = myColor;
    board.epTarget = null;
    const valid: QueuedPremove[] = [];
    for (const pm of premoves) {
      const ctx: GameContext = {
        board,
        me: myColor,
        opponentLastMove: [...board.history].reverse().find((m) => m.color !== myColor) ?? null,
        myLastMove: [...board.history].reverse().find((m) => m.color === myColor) ?? null,
        moveNumber: board.history.filter((m) => m.color === myColor).length,
        capturedByMe: game.captured[myColor],
        capturedFromMe: game.captured[myColor === "w" ? "b" : "w"],
      };
      const options = premoveOptionsFor(board, myColor, myNerfForPremove, myStateForPremove, ctx);
      const match = options.find(
        (c) =>
          c.from === pm.from &&
          c.to === pm.to &&
          (c.promotion ?? undefined) === (pm.promotion ?? undefined) &&
          (!pm.capture || !!c.captured),
      );
      if (!match) break;
      board = makeMove(board, match);
      board.turn = myColor;
      board.epTarget = null;
      valid.push(pm);
    }
    return { virtualBoard: board, validPremoves: valid };
  }, [game, myColor, premoves, myNerfForPremove, myStateForPremove]);

  const premoveOptions = useMemo<Move[]>(() => {
    if (!virtualBoard || !game) return [];
    const ctx: GameContext = {
      board: virtualBoard,
      me: myColor,
      opponentLastMove: [...virtualBoard.history].reverse().find((m) => m.color !== myColor) ?? null,
      myLastMove: [...virtualBoard.history].reverse().find((m) => m.color === myColor) ?? null,
      moveNumber: virtualBoard.history.filter((m) => m.color === myColor).length,
      capturedByMe: game.captured[myColor],
      capturedFromMe: game.captured[myColor === "w" ? "b" : "w"],
    };
    return premoveOptionsFor(virtualBoard, myColor, myNerfForPremove, myStateForPremove, ctx);
  }, [virtualBoard, myColor, game, myNerfForPremove, myStateForPremove]);

  // The board is in true premove mode only when it's the opponent's turn. When
  // it's our turn and premoves are still pending, the head is about to commit;
  // we keep showing the virtual board so the piece doesn't flicker back to its
  // original square between the AI move landing and our queued move firing.
  const premoveMode =
    uiSettings.premovesEnabled && !!game && !game.result && game.board.turn !== myColor && !!virtualBoard;
  const premovePending = !!game && !game.result && game.board.turn === myColor && validPremoves.length > 0;

  // Played-move sound effects: react to history change.
  const lastSeenMoveCount = useRef(0);
  useEffect(() => {
    if (!game) return;
    const hist = game.board.history;
    if (hist.length === lastSeenMoveCount.current) return;
    const last = hist[hist.length - 1];
    if (last) {
      if (last.captured) playCapture();
      else playMoveSfx();
      if (isInCheck(game.board, game.board.turn)) {
        setTimeout(playCheck, 80);
      }
    }
    lastSeenMoveCount.current = hist.length;
  }, [game]);

  // Game-ended hook: play the nerf sound, apply the rating, and record the
  // finished game into the local history. Runs exactly once per game;
  // restoring an already-finished saved game pre-sets sawResult so a refresh
  // never double-records.
  const sawResult = useRef(false);
  const [ratingChange, setRatingChange] = useState<{ before: number; after: number } | null>(null);
  useEffect(() => {
    if (!game?.result || sawResult.current) return;
    sawResult.current = true;
    if (game.result.reason && game.result.reason.includes(":")) {
      playNerf();
    }
    // Casual games don't affect your rating.
    let change: { before: number; after: number } | null = null;
    if (rated) {
      const before = loadRatingFor(ratingCategory);
      const score: 0 | 0.5 | 1 =
        game.result.winner === "draw" ? 0.5 : game.result.winner === myColor ? 1 : 0;
      const after = applyResult(before, difficulty, score);
      saveRatingFor(ratingCategory, after, score === 1 ? "win" : score === 0 ? "loss" : "draw");
      setPlayerElo(after.rating);
      change = { before: before.rating, after: after.rating };
      setRatingChange(change);
    }
    setShowResult(true);
    recordCompletedGame({
      mode: "ai",
      opponent: `${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`,
      myColor,
      outcome: outcomeFor(game.result.winner, myColor),
      reason: game.result.reason,
      rated,
      moveCount: game.board.history.length,
      baseSec: initialTimeMs / 1000,
      incSec: incrementMs / 1000,
      ratingChange: change,
      myNerf: nerfSummary(myColor === "w" ? game.white.nerf : game.black.nerf),
      opponentNerf: nerfSummary(myColor === "w" ? game.black.nerf : game.white.nerf),
      moves: game.board.history.map(moveToUCI),
      serverGameId: null,
    });
    // Bot games never touch the game server, so tell the site counter about
    // this one; the home "games played" stat includes bot games.
    fetch("/api/games/bot", { method: "POST" }).catch(() => {});
  }, [game, myColor, difficulty, rated, initialTimeMs, incrementMs, ratingCategory]);

  // Execute the head of the premove queue when our turn returns. If the head
  // is no longer playable (target ran away, piece pinned, friendly target
  // still standing) we clear the whole queue (subsequent links assumed the
  // head would land, so they can't be salvaged.
  useEffect(() => {
    if (premoves.length === 0 || !game || game.result) return;
    if (game.board.turn !== myColor) return;
    // A pending buff draft must be resolved before any move fires.
    if (game.buffs?.players[myColor].offer) return;
    const head = premoves[0];
    const m = moves.find(
      (lm) =>
        lm.from === head.from &&
        lm.to === head.to &&
        (lm.promotion ?? undefined) === (head.promotion ?? undefined) &&
        // If the user premoved a capture (real or friendly-target), the
        // matching legal move must also be a capture, otherwise a planned
        // Nxe5 silently downgrades to a quiet Ne5 when the target ran away,
        // and a friendly-target premove fires only when the opponent
        // actually took our piece.
        (!head.capture || !!lm.captured),
    );
    if (!m) {
      setPremoves([]);
      return;
    }
    const tid = setTimeout(() => {
      commitClock(myColor);
      const next = playMove(game, m);
      setGame({ ...next });
      // If makeMove rejected the move (no-op: turn didn't flip), cancel the
      // entire queue (subsequent premoves assumed this one landed).
      if (next.board.turn === myColor) {
        setPremoves([]);
      } else {
        setPremoves((q) => q.slice(1));
      }
    }, 90);
    return () => clearTimeout(tid);
  }, [game, premoves, moves, myColor, commitClock]);

  useEffect(() => {
    turnStartedAtRef.current = Date.now();
  }, [game?.board.history.length]);

  // Timeout: schedule one wake-up for the active side instead of repainting the
  // whole game view every clock tick. ClockPill handles the visual countdown.
  useEffect(() => {
    if (!clockEnabled || !game || game.result) return;
    // Clock paused for a buff lock-in window: no flag can fall due.
    if (offerPausedAt != null) return;
    const active = game.board.turn;
    const remaining = remainingClock(active);
    if (remaining <= 0) {
      game.result = {
        winner: active === "w" ? "b" : "w",
        reason: `${active === "w" ? "white" : "black"} ran out of time`,
      };
      setGame({ ...game });
      return;
    }
    const id = window.setTimeout(() => {
      game.result = {
        winner: active === "w" ? "b" : "w",
        reason: `${active === "w" ? "white" : "black"} ran out of time`,
      };
      setGame({ ...game });
    }, remaining + 20);
    return () => window.clearTimeout(id);
  }, [clockEnabled, game, remainingClock]);

  // AI move. The search runs in a web worker so the main thread (board,
  // clocks, input) never blocks while the bot thinks, and the bot's clock
  // keeps counting down exactly like a human player's: its time is spent
  // from the moment its turn starts until its move is committed.
  useEffect(() => {
    if (!game || game.result) return;
    if (game.board.turn === myColor) return;
    if (aiThinking.current) return;
    aiThinking.current = true;
    const botColor: Color = myColor === "w" ? "b" : "w";

    // Draft mode: fire an activated buff (auto-picked targets) before the
    // search, so the engine looks at the post-activation board. Activation
    // can decide the game on the spot (a removal ends it via loss checks).
    if (game.buffs) {
      try {
        const usedCard = aiActivateBuffs(game, botColor);
        if (usedCard) {
          showOppUsedCard(usedCard, `Bot used a ${draftCardNoun(game.buffs.mode)}`);
          setGame({ ...game });
          if (game.result) {
            aiThinking.current = false;
            return;
          }
          // Buff use consumes the turn unless the card was a free action:
          // bank the bot's clock and hand the move back to the player.
          if (game.board.turn !== botColor) {
            commitClock(botColor);
            aiThinking.current = false;
            return;
          }
        }
      } catch {
        // A buff that fails to resolve must never stall the bot's turn.
      }
    }

    const expectedPly = game.board.history.length;
    const thinkStart = Date.now();

    // Pacing (how long the move takes to appear) and search budget are both
    // clamped by the bot's remaining clock, so the bot spends its time like a
    // human and can never think past its flag or ignore the time control.
    const paceBase = difficulty === "easy" ? 600 : difficulty === "medium" ? 1200 : 2000;
    const remaining = clockEnabled ? remainingClock(botColor) : undefined;
    const pace = remaining !== undefined ? Math.min(paceBase, Math.max(150, remaining / 20)) : paceBase;
    const budget = aiBudgetMs(difficulty, remaining);

    let cancelled = false;
    let watchdog = 0;
    let applyTimer = 0;

    // Apply the chosen move once the pacing window has elapsed. A null uci
    // (worker unavailable/errored/out of sync) falls back to a quick
    // synchronous pick so the game always continues.
    const finish = (uci: string | null) => {
      if (cancelled) return;
      window.clearTimeout(watchdog);
      const applyIn = Math.max(0, pace - (Date.now() - thinkStart));
      applyTimer = window.setTimeout(() => {
        if (cancelled) return;
        aiThinking.current = false;
        try {
          const current = gameRef.current;
          if (!current || current.result || current.board.turn === myColor || current.board.history.length !== expectedPly) {
            return;
          }
          let m = uci ? legalMoves(current).find((c) => moveToUCI(c) === uci) ?? null : null;
          if (!m) m = pickAIMove(current, difficulty, 150);
          if (m) {
            commitClock(botColor);
            const next = playMove(current, m);
            setGame({ ...next });
          } else {
            current.result = { winner: myColor, reason: "AI has no legal moves" };
            setGame({ ...current });
          }
        } catch {
          const current = gameRef.current;
          if (current && !current.result) {
            current.result = { winner: myColor, reason: "AI move failed" };
            setGame({ ...current });
          }
        } finally {
          force((x) => x + 1);
        }
      }, applyIn);
    };

    const snapshot = snapshotGame(game, whiteCustomSpec.current, blackCustomSpec.current);
    let worker: Worker | null = null;
    if (snapshot && typeof Worker !== "undefined") {
      try {
        if (!aiWorkerRef.current) {
          aiWorkerRef.current = new Worker(new URL("../../workers/aiWorker", import.meta.url));
        }
        worker = aiWorkerRef.current;
      } catch {
        worker = null;
      }
    }

    if (worker && snapshot) {
      const id = ++aiRequestId.current;
      const activeWorker = worker;
      const onMessage = (event: MessageEvent<AIWorkerResponse>) => {
        if (event.data.id !== id) return;
        activeWorker.removeEventListener("message", onMessage);
        finish(event.data.uci ?? null);
      };
      activeWorker.addEventListener("message", onMessage);
      // Watchdog: a wedged worker must never freeze the game or let the bot
      // think indefinitely — terminate it and fall back to a quick sync pick.
      watchdog = window.setTimeout(() => {
        activeWorker.removeEventListener("message", onMessage);
        aiWorkerRef.current?.terminate();
        aiWorkerRef.current = null;
        finish(null);
      }, budget * 2 + 4000);
      activeWorker.postMessage({ id, snapshot, level: difficulty, budgetMs: budget } satisfies AIWorkerRequest);
      return () => {
        cancelled = true;
        activeWorker.removeEventListener("message", onMessage);
        window.clearTimeout(watchdog);
        window.clearTimeout(applyTimer);
        aiThinking.current = false;
      };
    }

    // No worker available (or non-serializable game): search synchronously
    // after the pacing delay, accepting a short UI stall.
    const syncTimer = window.setTimeout(() => {
      if (cancelled) return;
      const current = gameRef.current;
      let uci: string | null = null;
      try {
        const m = current && !current.result ? pickAIMove(current, difficulty, budget) : null;
        uci = m ? moveToUCI(m) : null;
      } catch {
        uci = null;
      }
      finish(uci);
    }, pace);
    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
      window.clearTimeout(applyTimer);
      aiThinking.current = false;
    };
    // The handlers read the latest game through gameRef; depending on the
    // whole object would cancel a bot turn on unrelated state refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.board.history.length, game?.board.turn, game?.result, myColor, difficulty]);

  const reviewBoard = useMemo(() => {
    if (!game || historyPly == null || game.buffs?.historyDiverged) return null;
    return boardAtPly(game.board.history, historyPly);
  }, [game, historyPly]);
  const currentHistoryPly = historyPly ?? game?.board.history.length ?? 0;
  const isReviewingHistory = historyPly != null;
  const handleHistoryPlyChange = (ply: number) => {
    // Once a buff has mutated the board outside history, stepping is
    // disabled: arrow keys and move-list clicks stay clamped to the live
    // board instead of replaying a history that can't be reproduced.
    if (game?.buffs?.historyDiverged) {
      setHistoryPly(null);
      return;
    }
    const max = game?.board.history.length ?? 0;
    if (ply >= max) {
      setHistoryPly(null);
    } else {
      setHistoryPly(Math.max(0, ply));
      setPremoves([]);
    }
  };

  // Activated buffs target on the real board: candidate squares highlight on
  // the live position and clicking one advances the pick chain. Enemy-buff
  // targets fall back to the modal list.
  const buffTargeting = useBuffTargeting({
    game,
    myColor,
    active:
      !!game?.buffs &&
      !game.result &&
      game.board.turn === myColor &&
      !game.buffs.players[myColor].offer &&
      historyPly == null,
    onChanged: () => {
      if (!game) return;
      // A buff use can consume the turn: bank my clock like a move.
      if (game.board.turn !== myColor) commitClock(myColor);
      setGame({ ...game });
    },
  });

  if (!game) {
    if (draftMode && nerfDraft) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="smallcaps text-[11px] text-parchment-400 text-center">Nerf draft</div>
            <h1 className="font-display text-4xl text-parchment text-center mt-1">
              Choose your handicap
            </h1>
            <p className="mt-2 text-sm text-parchment-300 text-center">
              {gameMode === "nerf"
                ? "Pick one of two nerfs. Every six moves you draft a card: a hex that curses your opponent, or a boon or item that helps you."
                : "Every game opens weak: pick one of two nerfs, then draft buffs every few moves to claw your way back to power."}
            </p>
            {nerfDeadline != null && (
              <div className="mx-auto mt-4 max-w-sm">
                {/* Lock-in window: an unconfirmed selection commits at the
                    deadline; with nothing selected the first option is
                    picked automatically. */}
                <LockInCountdown
                  deadline={nerfDeadline}
                  onExpire={() => startDraftGame(nerfDraft.myOptions[nerfSelected ?? 0])}
                />
              </div>
            )}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {nerfDraft.myOptions.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => (nerfSelected === i ? startDraftGame(n) : setNerfSelected(i))}
                  className={
                    "mx-auto block w-full max-w-md sm:max-w-none text-left transition hover:-translate-y-1" +
                    (nerfSelected === i
                      ? " -translate-y-1 ring-2 ring-gold shadow-leaf"
                      : nerfSelected != null
                      ? " opacity-60"
                      : "")
                  }
                >
                  <NerfCard nerf={n} ownerLabel={nerfSelected === i ? "Selected" : "Pick this nerf"} />
                </button>
              ))}
            </div>
            {nerfSelected != null && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => startDraftGame(nerfDraft.myOptions[nerfSelected])}
                  className="btn-leaf px-6 py-2.5 font-display text-sm font-semibold tracking-wide"
                >
                  Confirm pick
                </button>
                <p className="mt-1.5 text-[11px] text-parchment-400">
                  Clicking the card again also confirms.
                </p>
              </div>
            )}
            {/* Nerf mode: the opponent's rule is completely hidden until the
                game ends, so their options never show either. */}
            {gameMode === "nerf" ? (
              <p className="mt-5 text-center text-[11px] text-parchment-400">
                Your opponent picks a nerf too. You will see their rule when the game ends.
              </p>
            ) : (
              <div className="mt-5 plate p-3 text-center">
                <span className="smallcaps text-[10px] text-parchment-400">
                  Your opponent is choosing between
                </span>
                <div className="mt-1 text-sm text-parchment-200 font-display">
                  {nerfDraft.aiOptions.map((n) => n.name).join("  ·  ")}
                </div>
                <div className="mt-0.5 text-[11px] text-parchment-400">
                  Which one they take stays hidden, unless you draft a reveal.
                </div>
              </div>
            )}
          </div>
        </main>
      );
    }
    return <LoadingPanel />;
  }

  const myNerf = myColor === "w" ? game.white.nerf : game.black.nerf;
  const myState = myColor === "w" ? game.white.state : game.black.state;
  const myCtx = makeContext(game, myColor);
  const visual = myNerf.visual?.(myState, myCtx);
  // Draft-mode zone effects are public information: paint frozen pieces
  // (Immobilizer auras included), shielded (sanctuary) squares, and barred
  // squares for both sides — the same painting the online match uses.
  const zone = draftZones(game, myColor);
  const opponentNerf = myColor === "w" ? game.black.nerf : game.white.nerf;
  const bsMine = game.buffs?.players[myColor];
  const bsTheirs = game.buffs?.players[myColor === "w" ? "b" : "w"];
  const myOffer = bsMine?.offer ?? null;
  // The opponent's rule shows if you peeked, once the game ends, or when a
  // reveal buff (Extra Glance / Watchtower) was drafted.
  const oppRevealed =
    (!uiSettings.hideOpponentReveal && (oppPeek || !!game.result)) || !!bsMine?.oppNerfRevealed;
  // Section games never show a "hidden rule" placeholder: the opponent card
  // carries only the player header until the rule reveals (game end). Buff
  // mode hides both rule sections entirely, there are no nerfs at all.
  const hideOppNerfCard = gameMode === "buff" || (draftMode && !oppRevealed);
  const hideMyNerfCard = gameMode === "buff";
  // Nerf mode: held boons ride in the same corner card as the nerf, so the
  // handicap and its reliefs read together at a glance.
  const myHeldBoons =
    game.buffs?.mode === "nerf"
      ? game.buffs.players[myColor].buffs
          .filter((b) => !b.spent && !b.nullified)
          .flatMap((b) => {
            const def = BUFF_BY_ID[b.id];
            return def ? [{ name: def.name, tier: b.tier, status: def.status?.(b) ?? null }] : [];
          })
      : undefined;
  const lastMove = game.board.history[game.board.history.length - 1] ?? null;
  // A held move (confirmation setting) previews on the board before playing.
  const confirmPreviewBoard = confirmMovePending
    ? makeMove(cloneBoard(game.board), confirmMovePending)
    : null;
  const boardForDisplay = reviewBoard ?? confirmPreviewBoard ?? virtualBoard ?? game.board;
  const lastMoveForDisplay = isReviewingHistory
    ? game.board.history[currentHistoryPly - 1] ?? null
    : confirmMovePending ?? lastMove;
  const orientation: Color = uiSettings.flipBoard ? (myColor === "w" ? "b" : "w") : myColor;
  const checkedBoard = reviewBoard ?? game.board;
  const checkSquare =
    uiSettings.checkHighlight && isInCheck(checkedBoard, checkedBoard.turn)
      ? findKing(checkedBoard, checkedBoard.turn)
      : null;
  const hint = currentHint(game, myColor);
  const forcedSquares = hint?.squares ?? [];
  const railHeightStyle = boardHeight
    ? ({ "--board-height": `${boardHeight}px` } as CSSProperties)
    : undefined;
  const boardFitClass = hint
    ? "w-[min(92vw,var(--board-cap,720px),calc(100dvh-11rem))] max-w-full"
    : "w-[min(92vw,var(--board-cap,720px),calc(100dvh-8rem))] max-w-full";

  const handleMove = (m: Move) => {
    if (game.result || isReviewingHistory) return;
    // Resolve the pending buff draft before moving.
    if (myOffer) return;
    if (game.board.turn !== myColor) {
      if (!uiSettings.premovesEnabled) return;
      // append to the premove queue; chained premoves are evaluated against
      // the virtual board derived from any prior queued moves
      setPremoves((q) => [
        ...q,
        { from: m.from, to: m.to, promotion: m.promotion, capture: !!m.captured },
      ]);
      return;
    }
    if (uiSettings.confirmMove) {
      // Hold the move for an explicit confirm tap; the board previews it.
      setConfirmMovePending(m);
      return;
    }
    playHeldMove(m);
  };

  const playHeldMove = (m: Move) => {
    commitClock(myColor);
    const next = playMove(game, m);
    setGame({ ...next });
  };

  const confirmHeldMove = () => {
    const held = confirmMovePending;
    setConfirmMovePending(null);
    if (held) playHeldMove(held);
  };

  const cancelPremove = () => setPremoves([]);

  const handleRematch = () => router.push("/play");

  const onResign = () => {
    if (!game.result) {
      resign(game, myColor);
      setGame({ ...game });
      setPremoves([]);
    }
  };

  const requestResign = () => {
    if (uiSettings.confirmResign) setConfirmingResign(true);
    else onResign();
  };

  const onOfferDraw = () => {
    if (game.result || drawOfferStatus !== "idle") return;
    if (uiSettings.confirmDrawOffer && !confirmingDraw) {
      setConfirmingDraw(true);
      return;
    }
    setConfirmingDraw(false);
    setDrawOfferStatus("offering");
    // Simple AI policy: accept if its material isn't ahead. Otherwise decline.
    const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let mine = 0, theirs = 0;
    for (const p of game.board.pieces) {
      if (!p) continue;
      const v = vals[p.type] ?? 0;
      if (p.color === myColor) mine += v;
      else theirs += v;
    }
    // AI accepts if it isn't ahead by more than 2.
    const aiAhead = theirs - mine;
    window.setTimeout(() => {
      if (aiAhead <= 2) {
        game.result = { winner: "draw", reason: "draw by agreement" };
        setGame({ ...game });
        setPremoves([]);
        setDrawOfferStatus("idle");
      } else {
        setDrawOfferStatus("declined");
        window.setTimeout(() => setDrawOfferStatus("idle"), 2500);
      }
    }, 800);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const reviewLocked = !!game.buffs?.historyDiverged;

  const historyActions = game.result ? null : confirmMovePending ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Play this move?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={confirmHeldMove}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirmMovePending(null)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : confirmingDraw ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Offer a draw?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOfferDraw}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Offer draw
        </button>
        <button
          onClick={() => setConfirmingDraw(false)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : confirmingResign ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Resign the game?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { onResign(); setConfirmingResign(false); }}
          className="min-w-0 px-3 py-2 border border-oxblood/70 bg-oxblood/25 text-oxblood-glow hover:bg-oxblood/40 transition text-xs font-display font-semibold tracking-wide"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmingResign(false)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      {drawOfferStatus === "declined" && (
        <div className="smallcaps text-[10px] text-parchment-300">Draw declined.</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOfferDraw}
          disabled={drawOfferStatus !== "idle"}
          title="Offer a draw"
          aria-label="Offer a draw"
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {drawOfferStatus === "offering" ? "Offering..." : "Draw"}
        </button>
        <button
          onClick={requestResign}
          title="Resign the game"
          aria-label="Resign the game"
          className="min-w-0 px-3 py-2 border border-oxblood/40 bg-oxblood/10 text-oxblood-glow hover:bg-oxblood/20 hover:border-oxblood/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Resign
        </button>
      </div>
    </div>
  );

  const moveListFooter =
    reviewLocked || historyActions ? (
      <div className="space-y-2">
        {reviewLocked && (
          <p className="text-[10px] leading-snug text-parchment-400">
            Review is unavailable: a buff changed the board outside the move list.
          </p>
        )}
        {historyActions}
      </div>
    ) : null;

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <nav className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="smallcaps text-[11px] text-parchment-400 hidden sm:block">
            playing {myColor === "w" ? "White" : "Black"} ·{" "}
            {gameMode && (
              <>
                <span className={gameMode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
                  {gameMode} mode
                </span>
                {" · "}
              </>
            )}
            bot on {difficulty} · {rated ? "rated" : "casual"}
          </div>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Sound off" : "Sound on"}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full btn-ghost"
          >
            {muted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full btn-ghost"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-[1360px] flex-1 min-h-0 flex-col gap-2 overflow-hidden px-3 pb-14 sm:px-6 sm:pb-6 xl:max-w-[1680px]">
        {hint && (
          <div
            role="status"
            aria-live="polite"
            className={
              "plate shrink-0 p-2 px-3 flex items-center gap-2 " +
              (hint.tone === "warn"
                ? "border-oxblood-glow/60 bg-oxblood/15"
                : "border-gold/40 bg-gold/10")
            }
          >
            <span aria-hidden="true" className="text-gold-leaf font-display font-bold text-lg leading-none">!</span>
            <span className="font-display text-sm text-parchment">
              {hint.text}
            </span>
          </div>
        )}
        <div
          className="grid min-h-0 flex-1 gap-y-2 lg:grid-cols-[380px_auto] lg:justify-center lg:gap-x-4 xl:grid-cols-[420px_auto]"
          style={railHeightStyle}
        >
          <aside className="hidden min-h-0 gap-3 overflow-hidden lg:grid lg:min-h-[var(--board-height)] lg:max-h-full lg:grid-rows-[auto_minmax(8rem,1fr)_auto] lg:self-start">
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={myColor === "w" ? "b" : "w"}
              myColor={myColor}
              name={`${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`}
              elo={BOT_ELO[difficulty]}
              nerf={opponentNerf}
              revealed={oppRevealed}
              hideNerf={hideOppNerfCard}
              ownerLabel=""
              compact
              action={
                // Section games: the opponent's rule stays fully hidden until
                // the game ends, so there is no self-peek.
                gameMode == null && !oppRevealed && !uiSettings.hideOpponentReveal ? (
                  <button
                    onClick={() => setOppPeek(true)}
                    className="w-full px-3 py-2 border border-white/15 bg-white/[0.03] text-parchment-200 hover:border-white/30 hover:bg-white/[0.06] transition text-xs font-semibold"
                  >
                    Reveal their rule
                  </button>
                ) : null
              }
            />
            {game.buffs ? (
              <BuffDock
                game={game}
                myColor={myColor}
                canAct={
                  !game.result && game.board.turn === myColor && !myOffer && !isReviewingHistory
                }
                onStartUse={buffTargeting.start}
                hideOpponentCards
              />
            ) : (
              <div className="hidden lg:block" />
            )}
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={myColor}
              myColor={myColor}
              name="You"
              elo={playerElo}
              nerf={myNerf}
              hideNerf={hideMyNerfCard}
              ownerLabel=""
              compact
              progress={myNerf.progress?.(myState, myCtx) ?? null}
              boons={myHeldBoons}
              action={
                gameMode === "buff" ? null : (
                  <button
                    onClick={() => setSharedMine((v) => !v)}
                    className={
                      "w-full px-3 py-2 border transition text-xs font-semibold " +
                      (sharedMine
                        ? "border-gold/50 bg-gold/10 text-gold-leaf"
                        : "border-white/15 bg-white/[0.03] text-parchment-200 hover:border-white/30 hover:bg-white/[0.06]")
                    }
                  >
                    {sharedMine ? "Rule shared with opponent" : "Reveal my rule to opponent"}
                  </button>
                )
              }
            />
          </aside>
          <div className="flex min-h-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-start">
            <div ref={boardShellRef} className="min-h-0 min-w-0 sm:flex-none">
              {/* Mobile-only player strips: the side rails (clocks, cards,
                  actions) are hidden below the sm breakpoint. */}
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={myColor === "w" ? "b" : "w"}
                  myColor={myColor}
                  name={`${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`}
                  elo={BOT_ELO[difficulty]}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? blackMs : whiteMs}
                    active={!game.result && offerPausedAt == null && game.board.turn !== myColor}
                    compact
                  />
                )}
              </div>
              <div data-board-measure className={`relative mx-auto sm:mx-0 ${boardFitClass}`}>
                <Board
                  board={boardForDisplay}
                  legalMoves={
                    isReviewingHistory || buffTargeting.targeting
                      ? []
                      : game.board.turn === myColor && !premovePending
                      ? moves
                      : premoveOptions
                  }
                  orientation={orientation}
                  onMove={handleMove}
                  myColor={myColor}
                  visual={
                    isReviewingHistory
                      ? undefined
                      : {
                          ...(visual ?? {}),
                          highlightSquares: forcedSquares,
                          bannedSquares: [...(visual?.bannedSquares ?? []), ...zone.barred],
                          frozenSquares: zone.frozen,
                          shieldedSquares: zone.shielded,
                          wardSquares: zone.ward,
                          strikeSquares: zone.strike,
                          walnutSquares: zone.walnut,
                          lockedSquares: zone.locked,
                        }
                  }
                  lastMove={lastMoveForDisplay}
                  disabled={!!game.result || premovePending || isReviewingHistory || !!confirmMovePending || !!myOffer}
                  premoveMode={!isReviewingHistory && premoveMode}
                  premoves={isReviewingHistory ? [] : validPremoves}
                  onCancelPremove={cancelPremove}
                  moveRisks={isReviewingHistory || premovePending ? undefined : moveRisks}
                  autoQueen={uiSettings.autoQueen}
                  showCoordinates={uiSettings.showCoordinates}
                  highlightLastMove={uiSettings.highlightLastMove}
                  showLegalMoves={uiSettings.showLegalMoves}
                  checkSquare={isReviewingHistory ? null : checkSquare}
                  pickSquares={
                    buffTargeting.targeting?.target.kind === "square"
                      ? buffTargeting.targeting.target.squares
                      : undefined
                  }
                  onPickSquare={
                    buffTargeting.targeting?.target.kind === "square"
                      ? (sq) => buffTargeting.pick({ square: sq })
                      : undefined
                  }
                />
                {bsTheirs && (
                  <DraftNotice
                    buffs={bsTheirs.buffs}
                    banked={!!bsTheirs.flags.bankBonus}
                    hidden
                    cardNoun={draftCardNoun(game.buffs?.mode)}
                  />
                )}
                {buffTargeting.targeting && buffTargeting.targeting.target.kind === "square" && (
                  <TargetingBanner
                    game={game}
                    myColor={myColor}
                    targeting={buffTargeting.targeting}
                    onCancel={buffTargeting.cancel}
                    onFinish={buffTargeting.finish}
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={myColor}
                  myColor={myColor}
                  name="You"
                  elo={playerElo}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? whiteMs : blackMs}
                    active={!game.result && offerPausedAt == null && game.board.turn === myColor}
                    warnLowTime={uiSettings.lowTimeWarning}
                    compact
                  />
                )}
              </div>
              {gameMode !== "buff" && (
                <div className="plate mt-1 p-2 px-3 sm:hidden">
                  <div className="flex items-center gap-2">
                    <span className={`min-w-0 truncate font-display text-sm font-semibold tier-${myNerf.tier}`}>
                      {myNerf.name}
                    </span>
                    <span
                      className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tier-bg-${myNerf.tier} tier-${myNerf.tier}`}
                      title={`Tier ${myNerf.tier}: ${TIER_LABEL[myNerf.tier]}`}
                    >
                      {TIER_ROMAN[myNerf.tier]} · {TIER_LABEL[myNerf.tier]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-parchment-300">{myNerf.description}</p>
                </div>
              )}
              {historyActions && (
                <div className="mt-1 sm:hidden">
                  <MobileActionsMenu>{historyActions}</MobileActionsMenu>
                </div>
              )}
            </div>
            <div
              className={
                "hidden min-h-0 overflow-hidden gap-3 sm:grid sm:h-[var(--board-height)] sm:w-72 sm:shrink-0 " +
                (clockEnabled ? "sm:grid-rows-[auto_minmax(0,1fr)_auto]" : "sm:grid-rows-[minmax(0,1fr)]")
              }
              style={railHeightStyle}
            >
              {clockEnabled && (
                <ClockPill
                  ms={myColor === "w" ? blackMs : whiteMs}
                  active={!game.result && offerPausedAt == null && game.board.turn !== myColor}
                />
              )}
              <MoveList
                moves={game.board.history}
                currentPly={currentHistoryPly}
                onPlyChange={handleHistoryPlyChange}
                compact
                showHeader={false}
                footer={moveListFooter}
              />
              {clockEnabled && (
                <ClockPill
                  ms={myColor === "w" ? whiteMs : blackMs}
                  active={!game.result && offerPausedAt == null && game.board.turn === myColor}
                  warnLowTime={uiSettings.lowTimeWarning}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileMoveDrawer
        moves={game.board.history}
        currentPly={currentHistoryPly}
        onPlyChange={handleHistoryPlyChange}
        footer={moveListFooter}
      />

      {game.buffs && (
        <MobileBuffDrawer
          label={draftCardNoun(game.buffs.mode) === "hex" ? "Hexes & boons" : "Buffs"}
          held={game.buffs.players[myColor].buffs.length}
          usable={
            game.result || game.board.turn !== myColor || myOffer || isReviewingHistory
              ? 0
              : game.buffs.players[myColor].buffs.filter((inst) => {
                  const def = BUFF_BY_ID[inst.id];
                  return def?.kind === "activated" && !inst.spent && !inst.nullified;
                }).length
          }
          autoCloseWhen={!!buffTargeting.targeting}
        >
          <BuffDock
            game={game}
            myColor={myColor}
            canAct={!game.result && game.board.turn === myColor && !myOffer && !isReviewingHistory}
            onStartUse={buffTargeting.start}
            hideOpponentCards
          />
        </MobileBuffDrawer>
      )}

      {buffTargeting.targeting && buffTargeting.targeting.target.kind === "enemy-buff" && (
        <EnemyBuffModal
          game={game}
          myColor={myColor}
          targeting={buffTargeting.targeting}
          onPick={buffTargeting.pick}
          onCancel={buffTargeting.cancel}
        />
      )}

      {oppUsedCard && <BuffUsedToast card={oppUsedCard.card} label={oppUsedCard.label} />}

      {myOffer && !game.result && (
        <DraftOverlay
          offer={myOffer}
          takeBoth={(bsMine?.flags.takeBoth ?? 0) > 0}
          bankedBonus={!!myOffer.banked}
          deadline={offerDeadline}
          minimized={offerOnClockIndex === myOffer.index}
          cardNoun={draftCardNoun(game.buffs?.mode)}
          onExpire={() => {
            // Free window over: keep the offer open, slide the panel aside,
            // and resume the clock — the pick now costs the player's time.
            const offer = game.buffs?.players[myColor].offer;
            if (!offer) return;
            if (offerPausedAt != null) {
              turnStartedAtRef.current +=
                Date.now() - Math.max(offerPausedAt, turnStartedAtRef.current);
            }
            setOfferPausedAt(null);
            setOfferDeadline(null);
            setOfferOnClockIndex(offer.index);
          }}
          onPick={(i) => {
            pickDraftCard(game, myColor, i);
            setGame({ ...game });
          }}
          onBank={() => {
            bankDraft(game, myColor);
            setGame({ ...game });
          }}
          opponent={{
            offer: bsTheirs?.offer ?? null,
            showCards: !!bsMine?.flags.seeOppCards,
            showTier: !!bsMine?.flags.seeOppTier,
            reveal: bsMine?.oppReveal ?? null,
            // Hidden model: never name the bot's held cards in the overlay.
            lastPick: null,
          }}
        />
      )}

      {game.result && !showResult && (
        <button
          type="button"
          onClick={() => setShowResult(true)}
          className="btn-leaf fixed bottom-14 right-3 z-40 px-4 py-2 font-display text-sm font-semibold shadow-xl sm:bottom-4"
        >
          Show result
        </button>
      )}
      {game.result && showResult && (
        <GameOver
          onDismiss={() => setShowResult(false)}
          result={game.result}
          myColor={myColor}
          myNerf={gameMode === "buff" ? undefined : myNerf}
          opponentNerf={gameMode === "buff" ? undefined : opponentNerf}
          opponentHidden={uiSettings.hideOpponentReveal && !oppPeek}
          ratingChange={ratingChange}
          onRematch={handleRematch}
          onNewGame={handleRematch}
          onReview={() => handleHistoryPlyChange(0)}
          moves={game.board.history}
          playerNames={{
            w: myColor === "w" ? "You" : `${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`,
            b: myColor === "b" ? "You" : `${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`,
          }}
          startedAt={game.startedAt}
          myBuffs={game.buffs?.players[myColor].buffs}
        />
      )}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setUiSettings(loadSettings());
        }}
      />
    </main>
  );
}

