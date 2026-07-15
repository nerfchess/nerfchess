"use client";

// Shared "tune in to a featured live game" controller for the TV surfaces
// (src/app/tv/page.tsx and src/components/HeroTv.tsx). Both used to carry their
// own copy of the watch/retry logic, which drifted: /tv retried a single broken
// id forever on a fixed 8s timer, and HeroTv silently re-dialed games[0] with no
// failover at all. This hook is the SINGLE source of truth for featured
// selection + health-checked failover, so every surface behaves the same.
//
// Selection + failover rules (mirrored from the approved design):
//   - A candidate is eligible only if the caller passes it in `candidates`
//     (already filtered by mode + "has both players / started / not over").
//     Purely-by-viewer-count selection is the caller's ordering concern; this
//     hook only ever features the FIRST healthy candidate (or a still-eligible
//     pinned one).
//   - HEALTH CHECK: tuning is a real MPSession.watch(). A watch that rejects
//     (not_found / incompatible-version / disconnect / timeout) OR resolves with
//     a structured `unavailable` payload OR an unsupported schemaVersion is a
//     FAILED health check.
//   - RECOVERY: on failure, one immediate fresh-snapshot resync, then a bounded
//     exponential backoff (2s, 4s, 8s). After the retries are exhausted the
//     candidate is marked temporarily unhealthy (added to `failedIds`) and the
//     hook auto-selects the next healthy candidate. It never infinite-retries one
//     broken game.
//   - A candidate that drops out of `candidates` (gone from the lobby) is cleared
//     from `failedIds`, so a transiently-stale game that recovers becomes
//     eligible again on its next appearance.
//   - MANUAL SELECTION uses the identical path: a pinned id runs the same health
//     check + bounded backoff + failover. `clearFailed(id)` lets the caller give a
//     user-picked (or re-picked) game a fresh set of retries.
//   - `resetKey` (the mode channel) fully resets selection + retry state on a
//     switch so nothing from another pool leaks across.

import { useEffect, useMemo, useRef, useState } from "react";
import { arenaSocketUrl, isArenaGameId, isArenaGameLive } from "@/lib/arenaLobby";
import { MPPlayers, MPSession, type MPEvent, type SpectatorEnvelope } from "@/lib/multiplayer";
import {
  appendFeaturedDraftAction,
  featuredDraftFromWatchStart,
  FeaturedDraft,
  NOT_A_DRAFT,
  withFeaturedDraftState,
} from "@/lib/spectate/featuredBoard";
import {
  beginWatch,
  createSpectatorSync,
  routeSpectatorBaseline,
  routeSpectatorLiveFrame,
  spectatorBaselineEnvelope,
  sweepSpectatorSync,
} from "@/lib/spectate/spectatorSync";
import {
  isWatchStartHealthy,
  nextFailoverCandidate,
  pruneFailedIds,
  selectFeaturedTarget,
  watchStartHealth,
} from "@/lib/spectate/featuredSelection";
import { emitTv, type TvSurface, type TvTelemetryFields } from "@/lib/telemetry/tv";

/** The featured tune-in lifecycle a consumer renders from.
 *  idle   - nothing selected yet (initial, before candidates resolve).
 *  tuning - actively health-checking / streaming a candidate.
 *  live   - successfully watching the featured game.
 *  failed - every candidate has failed its health check (bounded backoff done).
 *  empty  - no candidates at all (nothing live in this pool). */
export type TuneState = "idle" | "tuning" | "live" | "failed" | "empty";

// One immediate resync, then a capped exponential backoff. After these the
// candidate is marked unhealthy and we fail over. Deliberately bounded so a dead
// id is never retried forever.
const RETRY_DELAYS_MS = [0, 2000, 4000, 8000];
// Short loading threshold: if a tune has not gone live within this window, the
// caller should show its fallback board (recent replay) instead of spinning.
const SLOW_TUNE_MS = 4000;

export interface FeaturedTune {
  /** The game currently being tuned (or kept on screen while it finishes). */
  streamId: string | null;
  /** True once we hold a live watch-start for `streamId`. */
  live: boolean;
  tuneState: TuneState;
  /** True after SLOW_TUNE_MS of tuning without going live -- the caller shows a
   *  fallback board rather than an eternal spinner. */
  slowTune: boolean;
  moves: string[];
  players: MPPlayers | null;
  over: boolean;
  draft: FeaturedDraft;
  /** Candidates currently marked temporarily unhealthy. */
  failedIds: ReadonlySet<string>;
  /** Give a candidate (e.g. a user's manual pick) a fresh set of retries. */
  clearFailed: (id: string) => void;
}

/**
 * Drive the featured board for an ordered list of eligible candidate ids.
 *
 * @param candidates Eligible live game ids, already filtered + ranked by the
 *   caller. The first healthy one is featured unless a `pinnedId` is supplied.
 * @param pinnedId   A viewer-pinned id. Honored while still eligible + healthy;
 *   a pinned game that exhausts its retries fails over like any other.
 * @param resetKey   Changes (e.g. the mode channel) fully reset selection/retry
 *   state so no cross-pool leakage survives a channel switch.
 * @param telemetry  Surface + filter labels for the structured tune-in
 *   instrumentation (tv_tune_started / _succeeded / _failed, tv_candidate_skipped,
 *   tv_failover_succeeded, tv_game_switched). Optional so a caller that does not
 *   report stays silent.
 */
export function useFeaturedTune(
  candidates: string[],
  pinnedId: string | null,
  resetKey: string,
  telemetry?: { surface: TvSurface; filter: string },
): FeaturedTune {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);
  const [draft, setDraft] = useState<FeaturedDraft>(NOT_A_DRAFT);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [slowTune, setSlowTune] = useState(false);
  // Bumped to re-run the watch effect for a backoff retry of the same id.
  const [attempt, setAttempt] = useState(0);
  // Applied-move count. The AUTHORITATIVE local move length, advanced only when a
  // move is actually appended -- never stamped from a rejected/out-of-order
  // frame's ply. Draft-action plies read this, so the move/action interleave the
  // featured board replays stays exact even if a frame is dropped.
  const movesLenRef = useRef(0);
  // Deterministic spectator-sync reducer for this hook's stream. Sequenced
  // frames route through it (ordering / dedupe / gap -> resync); frames with no
  // envelope (older server) bypass it, unchanged.
  const syncRef = useRef(createSpectatorSync());
  const retryCountRef = useRef(0);
  // The streamId the retry count currently belongs to. Compared inside the watch
  // effect (never during render) so a NEW candidate starts with a fresh retry
  // budget while a backoff re-run of the SAME candidate keeps counting.
  const retryForRef = useRef<string | null>(null);
  // Telemetry bookkeeping. Kept in refs so emitting never re-runs an effect and
  // the surface/filter labels stay current without being effect dependencies.
  // The refs are written only in effects (never during render) so the reconciler
  // stays the sole owner of render output.
  const teleRef = useRef(telemetry);
  // The last candidate we began tuning, so a change is reported as a switch.
  const lastTunedRef = useRef<string | null>(null);
  // True once any candidate has failed its health check: the next candidate that
  // goes live is then a successful failover, not a first tune.
  const hadFailureRef = useRef(false);
  // Keep the surface/filter labels current for the async emits below. Declared
  // before the watch effect so it commits first on the same render, making the
  // labels available to a synchronous tv_tune_started.
  useEffect(() => {
    teleRef.current = telemetry;
  });

  const emitTune = (
    event: Parameters<typeof emitTv>[0],
    gameId: string,
    extra: Omit<TvTelemetryFields, "gameId" | "filter"> = {},
  ) => {
    const t = teleRef.current;
    if (!t) return;
    emitTv(event, t.surface, { gameId, filter: t.filter, ...extra });
  };

  // A stable key for the candidate set, so effects that only care WHICH ids are
  // eligible do not re-run on every lobby poll that returns the same ids.
  const candidateKey = useMemo(() => candidates.join(","), [candidates]);

  // Channel switch: drop everything so nothing from the previous pool lingers.
  // Tracked with the sanctioned useState compare (not a ref) so the reset is a
  // real state transition the reconciler applies.
  const [prevReset, setPrevReset] = useState(resetKey);
  if (prevReset !== resetKey) {
    setPrevReset(resetKey);
    setStreamId(null);
    setLiveId(null);
    setMoves([]);
    setPlayers(null);
    setOver(false);
    setDraft(NOT_A_DRAFT);
    setFailedIds(new Set());
    setSlowTune(false);
    setAttempt(0);
  }

  // Reset the telemetry bookkeeping on a channel switch, in an effect so no ref
  // is written during render. A fresh channel starts with no prior tuned game
  // (so the first candidate reports a plain start, not a switch) and no
  // outstanding failure.
  useEffect(() => {
    lastTunedRef.current = null;
    hadFailureRef.current = false;
  }, [resetKey]);

  // Selection: an eligible + healthy pinned pick wins; otherwise the first
  // healthy candidate. A failed pinned id falls over like any other (manual
  // selection is not a special unbounded path). The rule lives in the pure
  // selectFeaturedTarget so it can be unit tested without the renderer.
  const target = selectFeaturedTarget(candidates, failedIds, pinnedId);

  // Keep a just-finished game on screen until a replacement is available;
  // otherwise follow the target. Derived during render (no cascading render).
  const nextStream = target ? target : over || !streamId ? target : streamId;
  if (nextStream !== streamId) setStreamId(nextStream);

  // A candidate that left the lobby is no longer "known failing": clear it so a
  // recovered game gets a fresh chance when it reappears.
  useEffect(() => {
    // Prune-only reconciliation of the unhealthy set against the live directory:
    // a functional update that returns the SAME reference when nothing changed,
    // so it cannot cascade. This is the sanctioned "derive from an external list"
    // sync, not a render-driven state loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailedIds((prev) => pruneFailedIds(prev, candidates));
    // candidateKey captures the membership; candidates is the same set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKey]);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    // Fresh retry budget for a new candidate; a backoff re-run of the same id
    // (attempt bumped) keeps the running count so the backoff stays bounded.
    if (retryForRef.current !== streamId) {
      retryForRef.current = streamId;
      retryCountRef.current = 0;
      // A change of featured game (not the first one) is a switch; either way
      // the fresh candidate begins a new tune.
      if (lastTunedRef.current && lastTunedRef.current !== streamId) {
        emitTune("tv_game_switched", streamId, { candidate: lastTunedRef.current });
      }
      lastTunedRef.current = streamId;
      emitTune("tv_tune_started", streamId);
    }
    // Reset the slow-tune flag for this fresh tune; the timer below re-raises it
    // only if this candidate stays un-live past the threshold.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlowTune(false);
    const session = new MPSession();
    session.persistFriendSession = false;
    // Arena-hosted (OCI bot-vs-bot) games stream from the arena socket. The
    // lobby snapshot that produced streamId keeps the arena id cache warm, so
    // this check is synchronous.
    if (isArenaGameId(streamId) && arenaSocketUrl()) session.serverUrl = arenaSocketUrl();

    // Apply one already-ordered event to the featured board. Every mutation of
    // the move list / draft record funnels through here so the reducer path and
    // the legacy bypass path share identical application logic.
    const applyFeaturedEvent = (e: MPEvent) => {
      if (e.type === "move") {
        // Append only the next move; advance the applied-count only when it
        // actually appends (never from a rejected frame). In reducer mode the
        // frames arrive strictly in seq order, so this always advances by one.
        if (e.move.ply === movesLenRef.current + 1) {
          movesLenRef.current = e.move.ply;
          setMoves((m) => [...m, e.move.u]);
        }
      } else if (e.type === "draft-used") {
        setDraft((d) =>
          appendFeaturedDraftAction(d, movesLenRef.current, {
            kind: "used",
            color: e.used.color,
            buffIndex: e.used.buffIndex,
            picks: e.used.picks,
            card: e.used.card,
          }),
        );
      } else if (e.type === "draft-resolved") {
        setDraft((d) =>
          appendFeaturedDraftAction(d, movesLenRef.current, {
            kind: "resolved",
            color: e.resolved.color,
            picked: e.resolved.kind === "picked",
            cards: e.resolved.cards,
          }),
        );
      } else if (e.type === "draft-state") {
        setDraft((d) => withFeaturedDraftState(d, e.state));
      } else if (e.type === "takeback") {
        // Rewind the move list and drop any draft actions recorded past the new
        // head, mirroring the full SpectatorView so the featured board never
        // replays actions off the end of a shortened move list.
        movesLenRef.current = e.moves.length;
        setMoves(e.moves);
        setDraft((d) =>
          d.draft ? { ...d, dtActions: d.dtActions.filter((a) => a.ply <= e.moves.length) } : d,
        );
      } else if (e.type === "end") {
        setOver(true);
      }
    };

    // A gap/overflow/version-drift signal: re-issue the watch (a fresh session
    // via the attempt bump) so a new wstart replaces state wholesale.
    const resyncFeatured = () => {
      if (!cancelled) setAttempt((a) => a + 1);
    };

    const off = session.on((e) => {
      if (cancelled) return;
      if (e.type === "watch-start") {
        // A structured "unavailable" or an unsupported snapshot schema is a
        // failed health check, not a board: leave the board state untouched so
        // no false position renders, and let the watch() resolve path fail over.
        if (!isWatchStartHealthy(e.setup)) {
          // An unsupported snapshot schema is a validation failure the watcher
          // must be able to see, distinct from a plain not_found/timeout.
          if (watchStartHealth(e.setup) === "incompatible_version") {
            emitTune("tv_snapshot_invalid", streamId, {
              reason: "incompatible_version",
            });
          }
          return;
        }
        movesLenRef.current = e.setup.moves.length;
        setMoves(e.setup.moves);
        setPlayers(e.setup.players);
        setOver(!!e.setup.result);
        setDraft(featuredDraftFromWatchStart(e.setup));
        // Adopt the wstart as the ordered-sync baseline when it carries the
        // ordered-protocol fields; later envelopes then route through the
        // reducer. A legacy wstart leaves the sync unbaselined so every frame
        // bypasses it (behavior unchanged).
        const baseEnv = spectatorBaselineEnvelope(e.setup);
        if (baseEnv) {
          beginWatch(syncRef.current, e.setup.id);
          const drained = routeSpectatorBaseline(syncRef.current, baseEnv);
          for (const p of drained.apply) applyFeaturedEvent(p as MPEvent);
        }
        return;
      }
      // Sequenced live frames route through the reducer (dedupe / order / gap ->
      // resync); frames without an envelope bypass it and apply directly.
      const env = (e as { env?: SpectatorEnvelope }).env;
      const route = routeSpectatorLiveFrame(syncRef.current, env, e);
      if (route.resync) {
        resyncFeatured();
        return;
      }
      for (const p of route.apply) applyFeaturedEvent(p as MPEvent);
    });

    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setSlowTune(true);
    }, SLOW_TUNE_MS);
    // A gap that never fills is swept here so one dropped frame can never freeze
    // the featured board forever: the stranded gap resyncs onto a fresh wstart.
    const sweepTimer = window.setInterval(() => {
      if (cancelled) return;
      const swept = sweepSpectatorSync(syncRef.current);
      if (swept?.signal === "resync") resyncFeatured();
    }, 1000);
    let backoffTimer: number | undefined;

    // A failed health check: retry with bounded backoff, then mark the candidate
    // unhealthy so selection fails over to the next healthy one.
    const failHealthCheck = (reason: string) => {
      if (cancelled) return;
      const n = retryCountRef.current;
      if (n < RETRY_DELAYS_MS.length) {
        retryCountRef.current = n + 1;
        backoffTimer = window.setTimeout(() => {
          if (!cancelled) setAttempt((a) => a + 1);
        }, RETRY_DELAYS_MS[n]);
      } else {
        setPlayers(null);
        if (liveId === streamId) setLiveId(null);
        // The candidate exhausted its bounded backoff: it failed, and selection
        // will skip it. Report both, naming the next healthy candidate (if any)
        // so a failover is traceable end to end.
        emitTune("tv_tune_failed", streamId, { reason, retryCount: n });
        hadFailureRef.current = true;
        const nextCandidate = nextFailoverCandidate(candidates, failedIds, streamId);
        emitTune("tv_candidate_skipped", streamId, {
          reason,
          retryCount: n,
          ...(nextCandidate ? { candidate: nextCandidate } : {}),
        });
        setFailedIds((prev) => {
          if (prev.has(streamId)) return prev;
          const next = new Set(prev);
          next.add(streamId);
          return next;
        });
      }
    };

    session
      .watch(streamId)
      .then((setup) => {
        if (cancelled) return;
        if (!isWatchStartHealthy(setup)) {
          failHealthCheck(watchStartHealth(setup));
          return;
        }
        retryCountRef.current = 0;
        setLiveId(streamId);
        emitTune("tv_tune_succeeded", streamId);
        // A candidate that goes live after an earlier one failed is a recovered
        // failover, not a first tune.
        if (hadFailureRef.current) {
          hadFailureRef.current = false;
          emitTune("tv_failover_succeeded", streamId);
        }
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        // A cold/stale arena cache can point the first attempt at the wrong
        // socket; warm it so the backoff retry (a fresh session) dials the right
        // server. The refresh result feeds isArenaGameId on the next attempt.
        await isArenaGameLive(streamId).catch(() => false);
        if (cancelled) return;
        // The watch() reject carries a typed-ish reason (not_found / timeout /
        // disconnect); pass it through for the failure/skip beacon.
        const reason = err instanceof Error ? err.message : "watch_failed";
        failHealthCheck(reason);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearInterval(sweepTimer);
      if (backoffTimer != null) window.clearTimeout(backoffTimer);
      off();
      session.destroy();
    };
    // liveId is read only to avoid a redundant clear; it must not re-run the
    // watch (that would drop a healthy stream). streamId + attempt drive re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, attempt]);

  const live = liveId != null && liveId === streamId && players != null;
  let tuneState: TuneState;
  if (live) tuneState = "live";
  else if (candidates.length === 0) tuneState = "empty";
  else if (target == null) tuneState = "failed";
  else tuneState = "tuning";

  const clearFailed = (id: string) => {
    setFailedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return {
    streamId,
    live,
    tuneState,
    slowTune,
    moves,
    players,
    over,
    draft,
    failedIds,
    clearFailed,
  };
}
