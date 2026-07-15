// Replay & spectate reconstruction harness. Run after `npm run server:build`.
//
//   npm run test:replay-spectate
//
// Proves the fix for two owner-reported bugs:
//
//   1. HISTORY REVIEW PAST DIVERGENCE: navigating to any past ply must show the
//      board that was actually on screen then, EVEN after a card rewrote the
//      board mid-game (summon / removal / teleport / drop / timed loss set
//      buffs.historyDiverged, which used to hard-disable review). We play a
//      scripted buff game, capture the live board at every ply, and assert
//      boardAtPlyFromRecord(record, N) reproduces it for EVERY N — including the
//      plies at and after the rewrite that plain move-replay cannot rebuild.
//
//   2. SPECTATOR / TV LATE-JOIN: a spectator (or the TV featured board) tuning
//      in mid-game reconstructs from the authoritative move + draft-action
//      record, so its board equals the live board — it must NOT miss the
//      rewrite. We simulate a late-join at every ply (full reconstruction from
//      the record) and assert it matches the live board there, and that a
//      moves-ONLY reconstruction (the old TV path) genuinely DIVERGES after the
//      rewrite (guarding that the scenario actually exercises the bug).

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} = load("game.js");
const { moveFromUCI, moveToUCI, initialBoard, makeMove } = load("board.js");
const { replayToPosition, boardAtPlyFromRecord } = load("replay.js");

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}
const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
const boardKey = (b) => JSON.stringify(b.pieces) + "|" + b.turn + "|" + JSON.stringify(b.castling) + "|" + b.epTarget;

// Plain move-replay to ply N (the OLD history-review / TV path): the baseline
// that CANNOT reproduce a board rewrite. Mirrors gameReview.boardAtPly.
function movesOnlyBoardAt(uciMoves, ply) {
  let board = initialBoard();
  const end = Math.max(0, Math.min(ply, uciMoves.length));
  for (let i = 0; i < end; i++) {
    const uci = uciMoves[i];
    const parsed = moveFromUCI(board, uci);
    if (!parsed) break;
    try {
      board = makeMove(board, parsed);
    } catch {
      break;
    }
  }
  return board;
}

// Run a scripted buff game, recording (a) the EngineMatch record the server
// stores and (b) the live board after each half-move, plus the ply at which the
// board first diverged from move history.
function runScenario(label, seed, ops) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g, seed, { mode: "buff" });

  const moves = [];
  const draftActions = [];
  const liveBoardAtPly = new Map(); // ply -> board key
  let divergedAtPly = null;
  liveBoardAtPly.set(0, boardKey(g.board));

  for (const op of ops) {
    if (op.t === "pick") {
      // Seat a known card directly into the hand (a public "pick"): record it as
      // a draft action so the reconstruction re-acquires the same card. Uses the
      // engine's acquireBuff, exactly like replayToPosition's grant path.
      const before = g.buffs.players[op.c].buffs.length;
      acquireBuff(g, op.c, op.id, op.tier);
      const added = g.buffs.players[op.c].buffs.length - before;
      check(added > 0, `${label}: pick ${op.id} did not enter the hand`);
      draftActions.push({ ply: moves.length, color: op.c, a: "grant", id: op.id });
    } else if (op.t === "use") {
      const ok = activateBuff(g, op.c, op.idx, op.picks);
      check(ok, `${label}: use ${op.c}#${op.idx} failed`);
      draftActions.push({ ply: moves.length, color: op.c, a: "use", buffIndex: op.idx, picks: op.picks });
    } else if (op.t === "move") {
      const m = legalMoves(g).find((x) => moveToUCI(x) === op.u) || moveFromUCI(g.board, op.u);
      check(!!m, `${label}: move ${op.u} not playable`);
      if (!m) break;
      playMove(g, m);
      moves.push(moveToUCI(m));
    }
    if (g.buffs && g.buffs.historyDiverged && divergedAtPly == null) {
      divergedAtPly = moves.length;
    }
    liveBoardAtPly.set(moves.length, boardKey(g.board));
  }

  const record = {
    setup: { whiteNerfId: UNRESTRICTED_NERF.id, blackNerfId: UNRESTRICTED_NERF.id, seed },
    mode: "buff",
    draft: true,
    draftSeed: seed,
    moves,
    draftActions,
  };
  return { g, record, moves, liveBoardAtPly, divergedAtPly };
}

function verify(label, seed, ops) {
  const { g, record, moves, liveBoardAtPly, divergedAtPly } = runScenario(label, seed, ops);

  check(
    divergedAtPly != null,
    `${label}: scenario never set historyDiverged — it does not exercise a board rewrite`,
  );

  // (1) HISTORY REVIEW: every ply reconstructs to the exact live board.
  for (let ply = 0; ply <= moves.length; ply++) {
    const rebuilt = boardAtPlyFromRecord(record, ply);
    check(rebuilt != null, `${label}: boardAtPlyFromRecord(${ply}) returned null`);
    if (rebuilt) {
      check(
        boardKey(rebuilt.board) === liveBoardAtPly.get(ply),
        `${label}: reconstructed board at ply ${ply} != live board` +
          (divergedAtPly != null && ply >= divergedAtPly ? " (PAST the rewrite)" : ""),
      );
    }
  }

  // (2) SPECTATOR LATE-JOIN: full reconstruction from the record == live head.
  const head = replayToPosition(record);
  check(head != null, `${label}: full replayToPosition returned null`);
  if (head) {
    check(
      boardKey(head.board) === boardKey(g.board),
      `${label}: spectator late-join board != live board (missed the rewrite)`,
    );
  }

  // (3) GUARD: the OLD moves-only path must actually diverge after the rewrite,
  // proving the scenario is a real regression test and not a no-op.
  if (divergedAtPly != null) {
    const movesOnly = movesOnlyBoardAt(moves, moves.length);
    check(
      boardKey(movesOnly) !== boardKey(g.board),
      `${label}: moves-only replay unexpectedly matched — scenario has no true divergence`,
    );
  }
}

// --- Scenario A: activated board removal (Detonate blows up a square) --------
verify("detonate", 101, [
  { t: "pick", c: "w", id: "detonate", tier: 4 },
  { t: "move", u: "e2e4" },
  { t: "move", u: "e7e5" },
  { t: "move", u: "g1f3" },
  { t: "move", u: "b8c6" },
  { t: "use", c: "w", idx: 0, picks: [{ square: sq("e5") }] }, // rewrite: remove e5 pawn
  { t: "move", u: "d7d6" },
  { t: "move", u: "f1c4" },
  { t: "move", u: "c8g4" },
]);

// --- Scenario B: summon a knight out of nowhere (a piece move history lacks) --
verify("summon_knight", 303, [
  { t: "pick", c: "w", id: "summon_knight", tier: 3 },
  { t: "move", u: "e2e4" },
  { t: "move", u: "e7e5" },
  { t: "use", c: "w", idx: 0, picks: [{ square: sq("d4") }] }, // rewrite: spawn Nd4
  { t: "move", u: "b8c6" },
  { t: "move", u: "g1f3" },
  { t: "move", u: "g8f6" },
]);

if (errors.length) {
  console.error("replay-spectate harness FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "OK: replay-spectate harness passed — every historical ply reconstructs past a " +
    "board rewrite, and a spectator late-join matches the live board (2 scenarios: " +
    "detonate, summon_knight; moves-only baseline confirmed to diverge).",
);
