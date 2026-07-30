// Zero-dependency harness for the Expansion Permit (9x9) card. Run after
// `npm run server:build`:
//
//   node scripts/test-expansion.cjs
//
// Asserts, in a real buff-mode game:
//   - acquiring the card grants a rook on the h-file a horizontal WRAP move
//     onto the a-file of the same rank (cylinder-chess re-entry);
//   - on a fully open rank the wrap adds nothing new (every destination is
//     already reachable normally; addNovel dedupes) and never generates a
//     null move back onto its own square;
//   - the wrapped ray respects blockers (friendly stops it, enemy is
//     capturable and stops it);
//   - a wrap move never captures a king;
//   - the permit expires after the number of owner turns its card text
//     promises (read from the description, not hardcoded);
//   - the generator is deterministic (two identical games produce identical
//     move lists — desync safety smoke check).
//
// Loading pattern mirrors scripts/test-apex.cjs. Wired into CI as
// `npm run test:expansion` — it previously sat unreferenced and silently
// rotted to a red state when the permit was rebalanced 4 -> 3 turns.

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  UNRESTRICTED_NERF,
  acquireBuff,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} = load("game.js");
const { moveToUCI } = load("board.js");
const { BUFF_BY_ID } = load("buffs/library.js");

let failures = 0;
function fail(msg) {
  failures += 1;
  console.error("FAIL: " + msg);
}
function ok(cond, msg) {
  if (!cond) fail(msg);
}

const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);

/** Fresh buff-mode game; 1. h4 g5 2. hxg5 h6 3. Rh4 opens the white h-rook on
 * the 4th rank, then black replies with its first quiet move (white to move).
 * If `blockG4`, a white knight is parked on g4 so the rook's normal leftward
 * slide is blocked and every wrap re-entry square is NOVEL. */
function setupGame(seed, blockG4) {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed, { mode: "buff" });
  for (const uci of ["h2h4", "g7g5", "h4g5", "h7h6", "h1h4"]) {
    const mv = legalMoves(game).find((m) => moveToUCI(m) === uci);
    if (!mv) throw new Error("setup move rejected: " + uci);
    playMove(game, mv);
  }
  playMove(game, legalMoves(game)[0]); // black's quiet reply; white to move
  if (blockG4) game.board.pieces[sq("g4")] = { type: "n", color: "w" };
  return game;
}

const wrapsFrom = (game, from) =>
  legalMoves(game).filter((m) => m.via === "expansion_permit" && m.from === from);

// --- 1. The h4 rook gains a wrap move onto the a-file ------------------------
{
  const game = setupGame(42, true);
  acquireBuff(game, "w", "expansion_permit", 5);
  const inst = game.buffs.players.w.buffs.find((b) => b.id === "expansion_permit");
  ok(!!inst, "card did not seat in the hand");
  // The duration is a balance number (PERMIT_TURNS in funny/expansion.ts), so
  // read the promise off the card's own text rather than hardcoding it — that
  // keeps a rebalance from rotting this test AND catches the card text and the
  // implementation drifting apart, which is its own bug class.
  const promised = Number(/next (\d+) turns/.exec(BUFF_BY_ID.expansion_permit.description)?.[1]);
  ok(Number.isFinite(promised), "expansion_permit description no longer states a turn count");
  ok(
    inst && inst.state.turns === promised,
    `permit started at ${inst?.state.turns} turns but the card promises ${promised}`,
  );

  // Normal leftward movement is blocked by the friendly knight on g4, so the
  // rook can only reach a4..f4 by sliding off the h-edge and re-entering.
  const moves = legalMoves(game);
  const wraps = wrapsFrom(game, sq("h4"));
  ok(wraps.length > 0, "h4 rook gained no wrap moves");
  const toA4 = wraps.find((m) => m.to === sq("a4"));
  ok(!!toA4, "h4 rook has no wrap move to a4 (h -> a re-entry)");
  ok(
    ["b4", "c4", "d4", "e4", "f4"].every((n) => wraps.some((m) => m.to === sq(n))),
    "wrap ray stopped short of the friendly blocker",
  );
  ok(!wraps.some((m) => m.to === sq("g4")), "wrap landed on its own friendly blocker");
  ok(!wraps.some((m) => m.to === sq("h4")), "wrap generated a null move onto its own square");
  ok(wraps.every((m) => m.captured !== "k"), "a wrap move captures a king");
  // Dot-highlight parity: every wrap is a real member of the legal move list.
  for (const w of wraps) {
    ok(
      moves.some((m) => m.from === w.from && m.to === w.to && m.via === w.via),
      `wrap ${moveToUCI(w)} missing from the legal move list`,
    );
  }
  // Play the wrap and confirm the rook actually lands on a4 and the timer ticks.
  playMove(game, toA4);
  const landed = game.board.pieces[sq("a4")];
  ok(landed && landed.type === "r" && landed.color === "w", "wrap move did not relocate the rook to a4");
  ok(
    inst.state.turns === promised - 1,
    `permit did not tick after the owner's move (${inst.state.turns}, want ${promised - 1})`,
  );
}

// --- 2. Open rank: the wrap duplicates normal moves and dedupes to nothing ----
{
  const game = setupGame(43, false);
  acquireBuff(game, "w", "expansion_permit", 5);
  const wraps = wrapsFrom(game, sq("h4"));
  ok(wraps.length === 0, "open-rank wrap produced moves addNovel should have deduped");
  // ...but a4 is still reachable (as the plain leftward slide).
  ok(
    legalMoves(game).some((m) => m.from === sq("h4") && m.to === sq("a4")),
    "open-rank rook lost its plain slide to a4",
  );
}

// --- 3. Blockers on the wrapped path ------------------------------------------
{
  // Friendly on b4: the wrap must offer a4 only (never b4/c4).
  const g2 = setupGame(44, true);
  acquireBuff(g2, "w", "expansion_permit", 5);
  g2.board.pieces[sq("b4")] = { type: "n", color: "w" };
  const wraps2 = wrapsFrom(g2, sq("h4"));
  ok(wraps2.some((m) => m.to === sq("a4")), "blocked wrap lost its clear a4 stop");
  ok(!wraps2.some((m) => m.to === sq("b4")), "wrap slid onto a friendly blocker");
  ok(!wraps2.some((m) => m.to === sq("c4")), "wrap slid THROUGH a friendly blocker");

  // Enemy on b4: capturable, and the ray stops there.
  const g3 = setupGame(45, true);
  acquireBuff(g3, "w", "expansion_permit", 5);
  g3.board.pieces[sq("b4")] = { type: "n", color: "b" };
  const wraps3 = wrapsFrom(g3, sq("h4"));
  const capB4 = wraps3.find((m) => m.to === sq("b4"));
  ok(capB4 && capB4.captured === "n", "wrap cannot capture an enemy blocker on the re-entry path");
  ok(!wraps3.some((m) => m.to === sq("c4")), "wrap slid through an enemy blocker");

  // Enemy KING on b4: the ray stops with NO capture move generated.
  const g4 = setupGame(46, true);
  acquireBuff(g4, "w", "expansion_permit", 5);
  g4.board.pieces[sq("b4")] = { type: "k", color: "b" };
  const wraps4 = wrapsFrom(g4, sq("h4"));
  ok(!wraps4.some((m) => m.to === sq("b4")), "wrap generated a king capture");
  ok(wraps4.some((m) => m.to === sq("a4")), "king blocker erased the clear squares before it");

  // Piece between the rook and the edge: no wrap at all (path off the board
  // must be clear). Knight on g4 blocks LEFT; block the right by moving the
  // rook to g4's left... simpler: a piece cannot stand right of h4, so test
  // the other direction with a rook mid-rank: put a white rook on d4 and a
  // blocker on f4; the rightward run d4->e4->f4 hits the blocker before the
  // edge, so no rightward wrap exists (leftward run a4.. is open and re-enters
  // from the h side).
  const g5 = setupGame(47, false);
  acquireBuff(g5, "w", "expansion_permit", 5);
  g5.board.pieces[sq("d4")] = { type: "r", color: "w" };
  g5.board.pieces[sq("f4")] = { type: "p", color: "w" };
  const wraps5 = wrapsFrom(g5, sq("d4"));
  // Rightward wrap is impossible (f4 blocks the run to the h-edge). The
  // leftward run (c4, b4, a4) is clear, wraps in at h4 — the friendly rook —
  // so the leftward wrap also yields nothing novel. Net: no wrap moves.
  ok(wraps5.length === 0, "wrap ignored a blocker between the slider and the board edge");
}

// --- 4. The permit expires after its promised number of owner turns ----------
{
  const game = setupGame(48, true);
  acquireBuff(game, "w", "expansion_permit", 5);
  const inst = game.buffs.players.w.buffs.find((b) => b.id === "expansion_permit");
  for (let i = 0; i < 8 && !game.result; i++) {
    const moves = legalMoves(game);
    const quiet = moves.find((m) => !m.captured && !m.via) ?? moves[0];
    playMove(game, quiet);
  }
  ok(inst.spent === true, "permit not spent after its promised owner turns");
  ok(
    legalMoves(game).every((m) => m.via !== "expansion_permit"),
    "wrap moves still offered after expiry",
  );
}

// --- 5. Determinism: identical games generate identical move lists -----------
{
  const sig = (g) => legalMoves(g).map((m) => moveToUCI(m) + (m.via ?? "")).sort().join(",");
  const a = setupGame(99, true);
  const b = setupGame(99, true);
  acquireBuff(a, "w", "expansion_permit", 5);
  acquireBuff(b, "w", "expansion_permit", 5);
  ok(sig(a) === sig(b), "two identical games disagree on the wrap move list (desync risk)");
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "OK: Expansion Permit verified (h->a wrap re-entry, open-rank dedupe, blockers, no king capture, expiry matches the card text, deterministic)",
);
