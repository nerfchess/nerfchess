// One bot-vs-bot game, run entirely in RAM. Faithful port of the DO's
// startHouseVsHouseGame + armBotAction + playHouseAction + the clock model,
// minus all wire/reveal bookkeeping (no humans, no spectators in M1). The whole
// point: the NerfGame lives in memory and is mutated in place — no O(plies)
// replay between actions.
import {
  NerfGame, UNRESTRICTED_NERF,
  newGame, enableDraftMode, playMove, legalMoves, checkLossConditions, resign,
  activateBuff, pickDraftCard, bankDraft, aiDraftChoice, aiChooseBuffActivation,
} from "../src/engine/game";
import { moveToUCI, positionKey } from "../src/engine/board";
import { fnv1a } from "../src/engine/desync";
import { PLAYABLE_NERFS, openingNerfPool } from "../src/engine/nerfs/library";
import { NERF_MODE_CADENCE, DEFAULT_CADENCE } from "../src/engine/draft";
import { replayToPosition, type EngineMatch } from "../src/engine/replay";
import {
  pickHouseMove, houseThinkMs, houseDraftThinkMs, houseNerfPickIndex, houseSeedRating,
  houseStyle,
  type HousePersona,
} from "../src/lib/server/bots";
import type { Move } from "../src/engine/types";
import { QUEUE_POOLS, firstMoveGraceMs, MAX_PLIES, randomInt, makeSeed, newId } from "./pools";
import type { ArenaSink } from "./sink";
import type { ArenaFinishedRecord, ArenaGameSummary, ArenaSnapshot, Color, ExternalGameMeta, StoredDraftAction } from "./types";
import { other } from "./types";

type Result = { winner: Color | "draw" | null; reason: string };

const tierOf = (id: string): number => PLAYABLE_NERFS.find((n) => n.id === id)?.tier ?? 5;

export class ArenaGame {
  readonly id = newId(8);
  readonly mode: "nerf" | "buff";
  readonly pool: string;
  readonly timeSec: number;
  readonly incrementSec: number;
  readonly seats: Record<Color, HousePersona>;
  readonly ratings: Record<Color, number>;

  private readonly seed = makeSeed();
  private readonly draftSeed = makeSeed();
  private readonly cadence: number;
  private nerf: { w: string; b: string } | null = null;

  private game: NerfGame | null = null;
  private moves: string[] = [];
  private draftActions: StoredDraftAction[] = [];

  private clocks: Record<Color, number>;
  private runningSince = 0;
  private movedOnce: Record<Color, boolean> = { w: false, b: false };
  private startedAt = 0;

  private nerfOptions: Record<Color, string[]> | null = null;
  private nerfPicks: Partial<Record<Color, number>> = {};

  private timer: NodeJS.Timeout | null = null;
  private done = false;

  constructor(
    white: HousePersona,
    black: HousePersona,
    pool: string,
    mode: "nerf" | "buff",
    private readonly sink: ArenaSink,
    private readonly replayVersion: number,
    private readonly onDone: (g: ArenaGame) => void,
    private readonly fastMs = 0,
    // Filler pacing decimation (config.thinkMult), passed INTO houseThinkMs so
    // its clock clamps still apply: slow pacing can never flag a bot.
    private readonly thinkMult = 1,
  ) {
    this.seats = { w: white, b: black };
    this.ratings = { w: houseSeedRating(white), b: houseSeedRating(black) };
    this.pool = pool;
    this.mode = mode;
    const p = QUEUE_POOLS[pool];
    this.timeSec = p.timeSec;
    this.incrementSec = p.incrementSec;
    this.clocks = { w: p.timeSec * 1000, b: p.timeSec * 1000 };
    this.cadence = mode === "nerf" ? NERF_MODE_CADENCE : DEFAULT_CADENCE;
  }

  // ---- lifecycle ----

  start(): void {
    if (this.mode === "buff") {
      this.nerf = { w: UNRESTRICTED_NERF.id, b: UNRESTRICTED_NERF.id };
      this.buildGame();
    } else {
      // Opening nerf draft: deal two options per seat; bots pick after a beat.
      this.nerfOptions = this.dealNerfOptions();
    }
    this.sink.gameOpen(this.summary());
    this.schedule();
  }

  abort(reason = "aborted"): void {
    if (this.done) return;
    this.done = true;
    if (this.timer) clearTimeout(this.timer);
    // Nothing is archived or rated for an abort (mirrors the DO deleting
    // filler on error), but the sink is still told: a watched game's spectator
    // replica in the DO only ends on an end frame, so a silent abort stranded
    // TV watchers on a board that never moves again. The record is best-effort
    // (an abort can land before the nerf draft resolves, so the nerf ids fall
    // back to unrestricted) with a null winner — the DO ends the replica for
    // its watchers and drops it, and never records a result from it.
    this.sink.gameAbort({
      id: this.id,
      setup: {
        whiteNerfId: this.nerf?.w ?? UNRESTRICTED_NERF.id,
        blackNerfId: this.nerf?.b ?? UNRESTRICTED_NERF.id,
        seed: this.seed,
        timeSec: this.timeSec,
        incrementSec: this.incrementSec,
      },
      mode: this.mode,
      draft: true,
      cadence: this.cadence,
      draftSeed: this.draftSeed,
      moves: [...this.moves],
      draftActions: [...this.draftActions],
      bots: { w: this.seats.w.userId, b: this.seats.b.userId },
      seats: { w: seat(this.seats.w, this.ratings.w), b: seat(this.seats.b, this.ratings.b) },
      result: { winner: null, reason },
      rated: true,
      replayVersion: this.replayVersion,
      startedAt: this.startedAt,
      completedAt: Date.now(),
    });
    this.onDone(this);
  }

  summary(): ArenaGameSummary {
    return {
      id: this.id,
      mode: this.mode,
      pool: this.pool,
      seats: { w: seat(this.seats.w, this.ratings.w), b: seat(this.seats.b, this.ratings.b) },
      ply: this.moves.length,
      clocks: { ...this.clocks },
      startedAt: this.startedAt,
    };
  }

  // Bootstrap state for a spectator's wstart (Tier 2 / M3). Only meaningful for
  // a started game (the DO waits for startedAt > 0 before opening a spectator).
  spectatorSnapshot(): ArenaSnapshot {
    return {
      id: this.id,
      setup: {
        whiteNerfId: this.nerf?.w ?? UNRESTRICTED_NERF.id,
        blackNerfId: this.nerf?.b ?? UNRESTRICTED_NERF.id,
        seed: this.seed,
        timeSec: this.timeSec,
        incrementSec: this.incrementSec,
      },
      mode: this.mode,
      draft: true,
      draftSeed: this.draftSeed,
      cadence: this.cadence,
      moves: [...this.moves],
      draftActions: [...this.draftActions],
      clocks: { ...this.clocks },
      startedAt: this.startedAt,
      seats: {
        w: { userId: this.seats.w.userId, name: this.seats.w.name, rating: this.ratings.w },
        b: { userId: this.seats.b.userId, name: this.seats.b.name, rating: this.ratings.b },
      },
    };
  }

  started(): boolean {
    return this.startedAt > 0 && !this.done;
  }

  // ---- direct spectating (Tier 3 / M3, docs/bot-offload-tier3-direct-arena.md) ----
  // Payload builders for the arena's own spectator WebSocket. Shapes mirror the
  // client protocol (src/lib/multiplayer.ts MPWatchStart / MPDraftState). Draft
  // state ships fully open — the DO itself moved to full transparency
  // (worker.ts draftStateFor), and a bot-vs-bot game has no human secrets.

  /** Display clocks right now: the on-turn side's bank minus elapsed think
   *  time (with the first-move grace), mirroring the DO's currentClocks. */
  liveClocks(): Record<Color, number> {
    const clocks = { w: this.clocks.w, b: this.clocks.b };
    if (this.timeSec > 0 && this.startedAt && this.game && !this.game.result && !this.done) {
      const turn = this.game.board.turn;
      const grace = this.movedOnce[turn] ? 0 : firstMoveGraceMs;
      const elapsed = Math.max(0, Date.now() - this.runningSince - grace);
      clocks[turn] = Math.max(0, clocks[turn] - elapsed);
    }
    return { w: Math.round(clocks.w), b: Math.round(clocks.b) };
  }

  private seatPayload(c: Color): { name: string; rating: number; avatar: string | null } {
    return { name: this.seats[c].name, rating: Math.round(this.ratings[c]), avatar: this.seats[c].avatar ?? null };
  }

  /** Fully-open live draft state (MPDraftState shape, both seats face-up). */
  dtStatePublic(): Record<string, unknown> | null {
    const bs = this.game?.buffs;
    if (!bs) return null;
    const playerState = (color: Color) => {
      const ps = bs.players[color];
      return {
        buffs: ps.buffs,
        draftsTaken: ps.draftsTaken,
        nextDraftAt: ps.nextDraftAt,
        rerollsLeft: ps.rerollsLeft,
        offer: ps.offer,
        flags: ps.flags,
        ...(ps.nerfRemoved ? { nerfRemoved: true } : {}),
        revived: ps.revived,
        ...(ps.inventory ? { inventory: ps.inventory } : {}),
      };
    };
    return {
      cadence: bs.cadence,
      effects: bs.effects,
      extraMoves: bs.extraMoves,
      skips: bs.skips,
      ...(bs.chainKingGuard ? { chainKingGuard: bs.chainKingGuard } : {}),
      ...(bs.historyDiverged ? { historyDiverged: true } : {}),
      players: { w: playerState("w"), b: playerState("b") },
    };
  }

  /** The spectator bootstrap frame (MPWatchStart shape, minus watcher counts —
   *  the hub owns those). Only meaningful once started(). */
  wstartPayload(): Record<string, unknown> {
    const clocks = this.liveClocks();
    const result = this.game?.result ?? null;
    return {
      id: this.id,
      timeSec: this.timeSec,
      incrementSec: this.incrementSec,
      wc: clocks.w,
      bc: clocks.b,
      moves: [...this.moves],
      players: { w: this.seatPayload("w"), b: this.seatPayload("b") },
      rated: true,
      started: this.startedAt > 0,
      result,
      spectatorChat: [],
      ...(result ? { nerfs: { w: this.nerf!.w, b: this.nerf!.b } } : {}),
      draft: true,
      mode: this.mode,
      // Already public-shaped: arena records only pick/bank/use, picks carry
      // their real card faces (mirrors the DO's fully-open publicDraftActions).
      dtActions: [...this.draftActions],
      ...(this.dtStatePublic() ? { dtState: this.dtStatePublic() } : {}),
    };
  }

  /** Post-move position hash for the client's desync self-check (MPAcceptedMove.f). */
  boardHash(): string | null {
    return this.game ? fnv1a(positionKey(this.game.board)) : null;
  }

  /** Both sides' held buffs for the end frame's reveal (MPEnd.draftBuffs). */
  heldBuffsPublic(): Record<Color, { id: string; tier: number; spent?: boolean; nullified?: boolean }[]> | null {
    const bs = this.game?.buffs;
    if (!bs) return null;
    const held = (color: Color) =>
      bs.players[color].buffs.map((b) => ({
        id: b.id,
        tier: b.tier as number,
        ...(b.spent ? { spent: true } : {}),
        ...(b.nullified ? { nullified: true } : {}),
      }));
    return { w: held("w"), b: held("b") };
  }

  nerfIds(): Record<Color, string> {
    return { w: this.nerf?.w ?? UNRESTRICTED_NERF.id, b: this.nerf?.b ?? UNRESTRICTED_NERF.id };
  }

  // Registry entry the DO shows in the lobby/TV (Tier 2 / M2).
  externalMeta(): ExternalGameMeta {
    return {
      id: this.id,
      mode: this.mode,
      timeSec: this.timeSec,
      incrementSec: this.incrementSec,
      moves: this.moves.length,
      seats: {
        w: { userId: this.seats.w.userId, name: this.seats.w.name, rating: this.ratings.w },
        b: { userId: this.seats.b.userId, name: this.seats.b.name, rating: this.ratings.b },
      },
    };
  }

  // ---- scheduling (port of armBotAction: pacing only, no engine work) ----

  private schedule(): void {
    if (this.done) return;
    if (this.timer) clearTimeout(this.timer);
    const delay = this.computeDelay();
    this.timer = setTimeout(() => this.step(), Math.max(0, delay));
  }

  private computeDelay(): number {
    if (this.fastMs > 0) return 1 + randomInt(this.fastMs); // test/load pacing override
    if (!this.startedAt) return houseDraftThinkMs(randomInt); // opening nerf pick
    const g = this.game!;
    if (g.buffs && (["w", "b"] as Color[]).some((c) => g.buffs!.players[c].offer)) {
      return houseDraftThinkMs(randomInt); // pending buff offer resolve
    }
    const turn = g.board.turn;
    const grace = this.movedOnce[turn] ? 0 : firstMoveGraceMs;
    const clock = this.timeSec > 0 ? this.clocks[turn] + grace : 0;
    return houseThinkMs(randomInt, clock, this.timeSec, this.thinkMult, houseStyle(this.seats[turn]).tempo);
  }

  // ---- the one-action step (port of playHouseAction) ----

  private step(): void {
    if (this.done) return;
    try {
      if (!this.startedAt) return this.stepNerfDraft();
      return this.stepPlay();
    } catch (err) {
      // A game that throws while acting must never wedge the roster: drop it
      // (nobody is watching a filler game's rating). Mirrors worker.ts retire.
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ event: "arena_game_error", id: this.id, err: String(err) }));
      this.abort("error");
    }
  }

  private stepNerfDraft(): void {
    for (const c of ["w", "b"] as Color[]) {
      if (this.nerfPicks[c] != null) continue;
      const opts = this.nerfOptions![c];
      this.nerfPicks[c] = houseNerfPickIndex([tierOf(opts[0]), tierOf(opts[1])], randomInt);
    }
    if (this.nerfPicks.w != null && this.nerfPicks.b != null) {
      this.nerf = {
        w: this.nerfOptions!.w[this.nerfPicks.w],
        b: this.nerfOptions!.b[this.nerfPicks.b],
      };
      this.buildGame();
    }
    this.schedule();
  }

  private stepPlay(): void {
    const g = this.game!;

    // 1. Flag check before acting (a bot that took too long has run out).
    if (this.timeSec > 0) {
      const turn = g.board.turn;
      const grace = this.movedOnce[turn] ? 0 : firstMoveGraceMs;
      const elapsed = Math.max(0, Date.now() - this.runningSince - grace);
      if (this.clocks[turn] - elapsed <= 0) {
        return this.finish({ winner: other(turn), reason: "time" });
      }
    }

    // 2. A pending buff offer on either seat resolves first (may not be our turn).
    if (g.buffs) {
      for (const c of ["w", "b"] as Color[]) {
        const offer = g.buffs.players[c].offer;
        if (!offer) continue;
        const cards = offer.cards.map((card) => ({ id: card.id, tier: card.tier as number }));
        const choice = aiDraftChoice(g, c);
        if (choice?.action === "pick") {
          pickDraftCard(g, c, choice.index);
          this.record({ ply: this.moves.length, color: c, a: "pick", index: choice.index, cards });
        } else {
          bankDraft(g, c);
          this.record({ ply: this.moves.length, color: c, a: "bank" });
        }
        return this.schedule();
      }
    }

    const turn = g.board.turn;

    // 3. Sometimes fire a held buff instead of moving (persona-styled coin,
    // draft games): each bot has its own stable activation appetite.
    if (g.buffs && randomInt(100) < Math.round(houseStyle(this.seats[turn]).activationChance * 100)) {
      try {
        const act = aiChooseBuffActivation(g, turn);
        if (act) {
          // Capture the card face BEFORE activation mutates/spends it — a fired
          // buff is public, so spectators get its identity to render the effect.
          const held = g.buffs.players[turn].buffs[act.buffIndex];
          const card = held ? { id: held.id, tier: held.tier as number } : undefined;
          if (activateBuff(g, turn, act.buffIndex, act.picks)) {
            this.record({ ply: this.moves.length, color: turn, a: "use", buffIndex: act.buffIndex, picks: act.picks }, card);
            if (this.endIfTerminal()) return;
            return this.schedule();
          }
        }
      } catch {
        // A card that threw mid-activation may have half-mutated the live game.
        // Rebuild a clean pre-activation position from the record (the failed
        // "use" was never appended), exactly like the DO, then play a move.
        const rebuilt = replayToPosition(this.toEngineMatch());
        if (rebuilt) this.game = rebuilt;
      }
    }

    // 4. The move.
    let move: Move | null = null;
    try {
      move = pickHouseMove(
        this.game!,
        this.seats[turn].skill,
        randomInt,
        this.timeSec > 0 ? this.clocks[turn] : undefined,
        undefined,
        undefined,
        this.seats[turn],
      );
    } catch {
      /* fall through to a legal fallback */
    }
    if (!move) {
      const legal = legalMoves(this.game!);
      if (legal.length) move = legal[randomInt(legal.length)];
      else return this.finish(resign(this.game!, turn).result ?? { winner: other(turn), reason: "no moves" });
    }

    this.applyClock(turn);
    this.game = playMove(this.game!, move);
    this.moves.push(moveToUCI(move));
    this.sink.move(this.id, this.moves.length, moveToUCI(move), { ...this.clocks });

    if (this.endIfTerminal()) return;
    if (this.moves.length >= MAX_PLIES) return this.finish({ winner: "draw", reason: "max length" });
    this.schedule();
  }

  // ---- helpers ----

  private buildGame(): void {
    const nerfById = (id: string) =>
      this.mode === "buff" ? UNRESTRICTED_NERF : PLAYABLE_NERFS.find((n) => n.id === id)!;
    const g = newGame(nerfById(this.nerf!.w), nerfById(this.nerf!.b), this.seed);
    enableDraftMode(g, this.draftSeed, { mode: this.mode, cadence: this.cadence });
    this.game = g;
    this.startedAt = Date.now();
    this.runningSince = this.startedAt;
  }

  private dealNerfOptions(): Record<Color, string[]> {
    const pool = openingNerfPool();
    const twoDistinct = (): string[] => {
      const a = pool[randomInt(pool.length)];
      let b = pool[randomInt(pool.length)];
      for (let i = 0; i < 10 && b.id === a.id; i++) b = pool[randomInt(pool.length)];
      return [a.id, b.id];
    };
    return { w: twoDistinct(), b: twoDistinct() };
  }

  private applyClock(turn: Color): void {
    if (this.timeSec <= 0) return;
    const now = Date.now();
    const grace = this.movedOnce[turn] ? 0 : firstMoveGraceMs;
    const elapsed = Math.max(0, now - this.runningSince - grace);
    this.clocks[turn] = Math.max(0, this.clocks[turn] - elapsed) + this.incrementSec * 1000;
    this.movedOnce[turn] = true;
    this.runningSince = now; // the next side's clock starts counting now
  }

  private endIfTerminal(): boolean {
    const g = this.game!;
    if (g.result) {
      this.finish(g.result);
      return true;
    }
    const loss = checkLossConditions(g);
    if (loss) {
      g.result = loss;
      this.finish(loss);
      return true;
    }
    return false;
  }

  private record(action: StoredDraftAction, card?: { id: string; tier: number }): void {
    this.draftActions.push(action);
    this.sink.draft(this.id, action, card);
  }

  private toEngineMatch(): EngineMatch {
    return {
      setup: { whiteNerfId: this.nerf!.w, blackNerfId: this.nerf!.b, seed: this.seed },
      mode: this.mode,
      draft: true,
      draftSeed: this.draftSeed,
      cadence: this.cadence,
      moves: this.moves,
      draftActions: this.draftActions,
    };
  }

  private finish(result: Result): void {
    if (this.done) return;
    this.done = true;
    if (this.timer) clearTimeout(this.timer);

    const record: ArenaFinishedRecord = {
      id: this.id,
      setup: {
        whiteNerfId: this.nerf!.w,
        blackNerfId: this.nerf!.b,
        seed: this.seed,
        timeSec: this.timeSec,
        incrementSec: this.incrementSec,
      },
      mode: this.mode,
      draft: true,
      cadence: this.cadence,
      draftSeed: this.draftSeed,
      moves: this.moves,
      draftActions: this.draftActions,
      bots: { w: this.seats.w.userId, b: this.seats.b.userId },
      seats: { w: seat(this.seats.w, this.ratings.w), b: seat(this.seats.b, this.ratings.b) },
      result,
      rated: true,
      replayVersion: this.replayVersion,
      startedAt: this.startedAt,
      completedAt: Date.now(),
    };

    // Self-validation: the recorded stream must reconstruct the in-RAM board.
    // This is the M1 acceptance gate — proves the archive will replay in M2.
    let replayOk = false;
    try {
      const replayed = replayToPosition(this.toEngineMatch());
      replayOk = replayed != null && this.game != null && boardEq(replayed, this.game);
    } catch {
      replayOk = false;
    }

    this.sink.gameEnd(record, replayOk);
    this.onDone(this);
  }
}

function seat(p: HousePersona, rating: number): { name: string; rating: number } {
  return { name: p.name, rating };
}

// Board equality: the reconstructed position must match the live one. The board
// is pure data (piece array, turn, castling, en-passant, move history) — no
// functions or RNG — so a JSON compare is sound and catches any recording bug
// (missing/mis-ordered action, wrong seed).
function boardEq(a: NerfGame, b: NerfGame): boolean {
  return a.board.turn === b.board.turn && JSON.stringify(a.board) === JSON.stringify(b.board);
}
