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
import { moveToUCI } from "../src/engine/board";
import { PLAYABLE_NERFS, openingNerfPool } from "../src/engine/nerfs/library";
import { NERF_MODE_CADENCE, DEFAULT_CADENCE } from "../src/engine/draft";
import { replayToPosition, type EngineMatch } from "../src/engine/replay";
import {
  pickHouseMove, houseThinkMs, houseDraftThinkMs, houseNerfPickIndex, houseSeedRating,
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
    // No record emitted for an abort (mirrors the DO deleting filler on error).
    void reason;
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
    return houseThinkMs(randomInt, clock, this.timeSec > 0);
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

    // 3. Sometimes fire a held buff instead of moving (40% coin, draft games).
    if (g.buffs && randomInt(100) < 40) {
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
      move = pickHouseMove(this.game!, this.seats[turn].skill, randomInt, this.timeSec > 0 ? this.clocks[turn] : undefined);
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
