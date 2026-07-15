// Archived-draft-record replay harness. Run headless (no server, no DB) with:
//   npx -y tsx scripts/test-archive-replay.ts
//   npm run test:archive-replay
//
// Proves the fix for "an archived draft game replays only the first N of M
// half-moves": once GET /api/games/[id] serves the stored draft record, the
// public-filtered stream must rebuild EVERY ply of the live board through the
// EXACT draftOnline client path a live spectator uses
// (buildSpectatorDraftGame / buildSpectatorDraftGameAtPly), reproducing the
// board rewrites move-history alone cannot.
//
// It also proves the SECURITY contract of the public filter
// (publicDraftReplayFromColumn, the archive analogue of worker.ts
// publicDraftActions): raw owner-only `grant` actions and server-only `reroll`
// actions are NEVER exposed, while an INSTANT grant is surfaced as a public
// pick (so a replaying replica reproduces its on-acquire board effect; that
// instant-as-pick reproduction is itself covered by the CARD-PARITY matrix in
// test-tv-spectator). Both the D1 (JSON string) and Postgres (jsonb object)
// storage shapes are covered.

import {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
  type NerfGame,
} from "@/engine/game";
import { moveFromUCI, moveToUCI } from "@/engine/board";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { buildSpectatorDraftGame, buildSpectatorDraftGameAtPly } from "@/lib/draftOnline";
import { publicDraftReplayFromColumn } from "@/lib/server/publicDraftRecord";
import type { DraftRecord, ArchivedDraftAction } from "@/lib/server/games";
import type { BuffPick } from "@/engine/buff";
import type { Tier } from "@/engine/nerf";
import type { Color } from "@/engine/types";

let failures = 0;
let checks = 0;
function check(cond: boolean, label: string) {
  checks++;
  if (!cond) {
    failures++;
    console.log("FAIL  " + label);
  }
}

const sq = (name: string) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
const boardKey = (b: NerfGame["board"]) =>
  JSON.stringify(b.pieces) + "|" + b.turn + "|" + JSON.stringify(b.castling) + "|" + b.epTarget;

// ===========================================================================
// PLY RECONSTRUCTION: a draft game with TWO board rewrites (a summon and a
// removal), plus a server-only reroll and an unused hideable grant in the
// stream. The public-filtered record must rebuild every ply of the live board.
// ===========================================================================
const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 8642);
enableDraftMode(game, 8642, { mode: "buff" });
const moves: string[] = [];
const draftActions: ArchivedDraftAction[] = [];
const liveBoardAt = new Map<number, string>();
liveBoardAt.set(0, boardKey(game.board));

const move = (u: string) => {
  const m = legalMoves(game).find((x) => moveToUCI(x) === u) ?? moveFromUCI(game.board, u);
  check(!!m, `move ${u} is playable`);
  if (!m) return;
  playMove(game, m);
  moves.push(u);
  liveBoardAt.set(moves.length, boardKey(game.board));
};
const pick = (color: Color, id: string, tier: Tier): number => {
  const before = game.buffs!.players[color].buffs.length;
  acquireBuff(game, color, id, tier);
  check(game.buffs!.players[color].buffs.length > before, `pick ${id} entered the hand`);
  draftActions.push({ ply: moves.length, color, a: "pick", cards: [{ id, tier }] });
  liveBoardAt.set(moves.length, boardKey(game.board));
  return game.buffs!.players[color].buffs.length - 1;
};
const fireUse = (color: Color, idx: number, picks: BuffPick[]) => {
  check(activateBuff(game, color, idx, picks), `use ${color}#${idx} fired`);
  draftActions.push({ ply: moves.length, color, a: "use", buffIndex: idx, picks });
  liveBoardAt.set(moves.length, boardKey(game.board));
};

move("e2e4");
move("e7e5");
const summonIdx = pick("w", "summon_knight", 3); // index 0
move("g1f3");
move("b8c6");
fireUse("w", summonIdx, [{ square: sq("d4") }]); // rewrite #1: a knight appears on d4
// A server-only reroll opcode in the stream: MUST be dropped by the filter.
draftActions.push({ ply: moves.length, color: "w", a: "reroll" });
move("f1c4");
move("f8c5");
const detonateIdx = pick("w", "detonate", 4); // index 1
move("d2d3");
move("d7d6");
fireUse("w", detonateIdx, [{ square: sq("e5") }]); // rewrite #2: the e5 pawn is removed
// A hideable god-panel grant of an activated card, left UNUSED: dropped by the
// filter, and (unused) it does not change the board, so replay still matches.
draftActions.push({ ply: moves.length, color: "b", a: "grant", id: "detonate", tier: 4 });
move("b1c3");
move("g8f6");

const record: DraftRecord = { mode: "buff", draftSeed: 8642, draftActions };

const replay = publicDraftReplayFromColumn(JSON.stringify(record)); // D1: JSON string
check(replay != null, "a stored draft_record parses into a public replay");
if (replay) {
  check(replay.mode === "buff", "the public replay carries the draft mode");
  check(
    replay.dtActions.every((a) => (a.a as string) !== "grant" && (a.a as string) !== "reroll"),
    "no raw grant or reroll action ever reaches the public stream",
  );
  // The Postgres jsonb shape (a plain object) yields the IDENTICAL public stream.
  const replayObj = publicDraftReplayFromColumn(record as unknown);
  check(
    replayObj != null && JSON.stringify(replayObj.dtActions) === JSON.stringify(replay.dtActions),
    "D1 (JSON string) and Postgres (jsonb object) records yield the same public stream",
  );

  // Every ply reconstructs through the draftOnline client path.
  let allPlies = true;
  for (let ply = 0; ply <= moves.length; ply++) {
    const g = buildSpectatorDraftGameAtPly(moves, replay.dtActions, ply, replay.mode);
    if (g.board.history.length !== ply || boardKey(g.board) !== liveBoardAt.get(ply)) {
      allPlies = false;
      check(false, `archived record reconstructs ply ${ply} to the live board`);
    }
  }
  check(allPlies, "every archived ply reconstructs to the live board (past both rewrites)");

  // A full late-join (head reconstruction) equals the live board.
  const head = buildSpectatorDraftGame(moves, replay.dtActions, undefined, replay.mode);
  check(boardKey(head.board) === boardKey(game.board), "full archive reconstruction equals the live head board");

  // GUARD: the moves-only path (the OLD truncated replay) genuinely diverges,
  // proving the record is load-bearing and this is a real regression test.
  const movesOnly = buildSpectatorDraftGame(moves, [], undefined, replay.mode);
  check(boardKey(movesOnly.board) !== boardKey(game.board), "moves-only replay diverges (the record is load-bearing)");
}

// ===========================================================================
// FILTER CONTRACT: an INSTANT grant is surfaced as a public pick carrying its
// identity; a hideable (non-instant) grant is dropped; a reroll is dropped.
// Uses real card ids so the BUFF_BY_ID.kind === "instant" gate is exercised.
// ===========================================================================
{
  const instantDef = ALL_BUFFS.find((b) => b.kind === "instant" && b.implemented);
  const activatedDef = ALL_BUFFS.find((b) => b.kind === "activated" && b.implemented);
  check(!!instantDef && !!activatedDef, "found a real instant and a real activated card to exercise the grant gate");
  if (instantDef && activatedDef) {
    const synthetic: DraftRecord = {
      mode: "buff",
      draftSeed: 1,
      draftActions: [
        { ply: 0, color: "w", a: "grant", id: instantDef.id, tier: (instantDef.tier ?? 5) },
        { ply: 0, color: "w", a: "grant", id: activatedDef.id, tier: (activatedDef.tier ?? 5) },
        { ply: 0, color: "w", a: "reroll" },
      ],
    };
    const out = publicDraftReplayFromColumn(synthetic as unknown);
    check(out != null && out.dtActions.length === 1, "only the instant grant survives (activated grant + reroll dropped)");
    const only = out?.dtActions[0];
    check(
      only?.a === "pick" &&
        Array.isArray(only.cards) &&
        only.cards.some((c) => "id" in c && c.id === instantDef.id),
      "the instant grant is surfaced as a public pick carrying its real identity",
    );
    check(
      !JSON.stringify(out?.dtActions).includes(activatedDef.id),
      "the hideable (non-instant) grant is NEVER surfaced (owner-only god panel stays private)",
    );
  }
}

// A classic (recordless) row yields no public replay, so callers fall back to
// the moves-only replay + truncation notice, unchanged.
check(publicDraftReplayFromColumn(null) === null, "a null draft_record (classic game) yields no public replay");
check(publicDraftReplayFromColumn("not json{") === null, "a corrupt draft_record string yields no public replay (no throw)");

console.log("");
if (failures) {
  console.log(`ARCHIVE-REPLAY: ${failures} FAILURE(S) across ${checks} checks`);
  process.exit(1);
} else {
  console.log(
    `ARCHIVE-REPLAY: all ${checks} checks passed -- the public-filtered archived record ` +
      `rebuilds every ply of the live board via the draftOnline client path (2 board rewrites: ` +
      `summon + removal), raw grant/reroll never leak, instant grants surface as picks, and the ` +
      `moves-only baseline is confirmed to diverge.`,
  );
}
