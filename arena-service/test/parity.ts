// Arena parity checks (slice HB3: P20, P19, and the house draft and card
// policy in filler). Bundled and run by test/parity.test.mjs, so the engine
// is one module instance exactly as in the deployed arena.
import { UNRESTRICTED_NERF, newGame, enableDraftMode } from "../../src/engine/game";
import { rollOffer, type DraftPoolOverrides } from "../../src/engine/draft";
import { BUFF_BY_ID } from "../../src/engine/buffs/library";
import { HOUSE_ROSTER } from "../../src/lib/server/bots";
import type { Tier } from "../../src/engine/nerf";
import { ArenaGame, arenaFillerOverrides, withDraftPool } from "../game";
import { freeFillerPersonas } from "../arena";
import { parseSyncReply } from "../ingest";
import { randomInt } from "../pools";
import type { ArenaSink } from "../sink";
import type { ArenaFinishedRecord, StoredDraftAction } from "../types";

const results: Record<string, { pass: boolean; detail: string }> = {};
function check(name: string, pass: boolean, detail = ""): void {
  results[name] = { pass, detail };
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const CHESS_DIFF = "chess_diff";
const SEEDS = 4000;

// 1. Offer rolls at Chess Diff's own tier, both modes, through the same
// wrapper ArenaGame.step uses.
function chessDiffOffers(overrides: DraftPoolOverrides | null): number {
  const tier = (BUFF_BY_ID[CHESS_DIFF]?.tier ?? 4) as Tier;
  let seen = 0;
  for (const mode of ["buff", "nerf"] as const) {
    for (let s = 0; s < SEEDS; s++) {
      const hit = withDraftPool(overrides, () => {
        const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
        enableDraftMode(game, 0x51d1ff + s * 2654435761, { mode });
        game.buffs!.rngState = ((0x9e3779b9 ^ Math.imul(s, 2246822519)) >>> 0) || 1;
        const offer = rollOffer(game.buffs!, "w", [tier, tier], game.board);
        return !!offer?.cards.some((c) => c.id === CHESS_DIFF);
      });
      if (hit) seen++;
    }
  }
  return seen;
}

// 2. Live filler games with the exclusion on: no offer ever shows Chess Diff,
// every record carries the overrides and round-trips through the replay.
class CaptureSink implements ArenaSink {
  offers: { id: string }[][] = [];
  uses = 0;
  picks = 0;
  banks = 0;
  ends: { rec: ArenaFinishedRecord; replayOk: boolean }[] = [];
  gameOpen(): void {}
  move(): void {}
  draft(_id: string, action: StoredDraftAction): void {
    if (action.a === "pick") {
      this.picks++;
      this.offers.push(action.cards);
    } else if (action.a === "bank") this.banks++;
    else this.uses++;
  }
  gameEnd(rec: ArenaFinishedRecord, replayOk: boolean): void {
    this.ends.push({ rec, replayOk });
  }
  gameAbort(): void {}
}

async function liveGames(n: number, limitMs: number): Promise<CaptureSink> {
  const sink = new CaptureSink();
  const games: ArenaGame[] = [];
  let open = n;
  await new Promise<void>((done) => {
    for (let i = 0; i < n; i++) {
      const free = [...HOUSE_ROSTER];
      const a = free.splice(randomInt(free.length), 1)[0];
      const b = free.splice(randomInt(free.length), 1)[0];
      const g = new ArenaGame(a, b, "3+0", i % 2 ? "buff" : "nerf", sink, 3, () => {
        open--;
        if (open === 0) done();
      }, 1, 1, 15, true);
      games.push(g);
      g.start();
    }
    setTimeout(() => {
      for (const g of games) g.abort("test window");
    }, limitMs).unref();
  });
  return sink;
}

// 3. The DO's seated personas are never seated by the arena.
function exclusionTrials(trials: number): { picked: number; clash: number } {
  const doSeated = new Set(HOUSE_ROSTER.filter((_, i) => i % 3 === 0).map((p) => p.userId));
  const busy = new Set(HOUSE_ROSTER.filter((_, i) => i % 7 === 1).map((p) => p.userId));
  let clash = 0;
  let picked = 0;
  for (let t = 0; t < trials; t++) {
    const free = freeFillerPersonas(HOUSE_ROSTER, busy, doSeated);
    const a = free.splice(randomInt(free.length), 1)[0];
    const b = free.splice(randomInt(free.length), 1)[0];
    for (const p of [a, b]) {
      picked++;
      if (doSeated.has(p.userId) || busy.has(p.userId)) clash++;
    }
  }
  return { picked, clash };
}

async function main(): Promise<void> {
  const control = chessDiffOffers(null);
  const excluded = chessDiffOffers(arenaFillerOverrides(true));
  check("control: Chess Diff is offered with no exclusion", control > 0, `${control} of ${SEEDS * 2} rolls at its tier`);
  check("exclusion: Chess Diff never offered in arena drafts", excluded === 0, `${excluded} of ${SEEDS * 2} rolls at its tier`);
  check("exclusion off by default", arenaFillerOverrides(false) === null);

  const sink = await liveGames(8, 90_000);
  const diffOffers = sink.offers.filter((cards) => cards.some((c) => c.id === CHESS_DIFF)).length;
  const finished = sink.ends.length;
  const replayFails = sink.ends.filter((e) => !e.replayOk).length;
  const carried = sink.ends.filter((e) => e.rec.cardOverrides?.off?.includes(CHESS_DIFF)).length;
  check(
    "live filler games: no Chess Diff offer, records carry the overrides and replay",
    finished >= 1 && diffOffers === 0 && replayFails === 0 && carried === finished,
    `${finished} finished, ${sink.picks} picks (${diffOffers} offers with Chess Diff), ${sink.banks} banks, ${sink.uses} cards fired, ${replayFails} replay failures`,
  );

  const ex = exclusionTrials(10_000);
  check("DO-seated personas are never seated by the arena", ex.clash === 0, `${ex.picked} seats over 10000 spawns, ${ex.clash} clashes`);
  const r1 = parseSyncReply({ enabled: true, watch: ["A"], seated: ["house_1", 5, null] });
  const r2 = parseSyncReply({ enabled: true, watch: ["A"] });
  check(
    "sync reply: seated read when present, empty from an older DO",
    r1.seated.length === 1 && r1.seated[0] === "house_1" && r2.seated.length === 0 && r2.enabled,
  );

  const failed = Object.values(results).filter((r) => !r.pass).length;
  console.log(failed ? `\nRESULT: FAIL (${failed})` : `\nRESULT: PASS (${Object.keys(results).length} checks)`);
  process.exit(failed ? 1 : 0);
}

void main();
