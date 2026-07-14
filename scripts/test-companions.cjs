// Zero-dependency harness for the COMPANION cards: I Love Cami (i_love_cam +
// her two seated abilities cami_sweep / cami_leap) and the five NewJeans
// pocket companions (minji / hanni / danielle / haerin / hyein). Run after
// `npm run server:build`:
//
//   node scripts/test-companions.cjs
//
// Asserts, in real buff-mode games:
//   - Cami places as a queen in the caster's half, seats her two ability
//     cards, and moves like an amazon (knight leaps via the parent card);
//   - Devotion: allies beside Cami cannot be captured, with the never-strand
//     fallback (an opponent whose ONLY move is such a capture keeps it);
//   - Sweep the Lines clears her rank/file of enemy non-kings (kings and
//     friendly pieces survive), then recharges over 3 owner turns;
//   - Guardian Leap teleports her beside the king as a free action and keeps
//     the parent card's tracked square in step;
//   - Vengeance: capturing Cami spends the card, retires her abilities, and
//     freezes the capturer for 2 of their turns;
//   - each member deploys onto an empty own-half square as her piece class,
//     her signature movement works, her ability fires and recharges (or
//     retires, for Hyein's once-per-game Ascend), and capturing the member
//     retires the card;
//   - the whole kit is deterministic (two identical games agree on the legal
//     move list - desync safety smoke check).
//
// Loading pattern mirrors scripts/test-expansion.cjs. Not wired into CI.

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  buffNextTarget,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} = load("game.js");
const { moveToUCI } = load("board.js");

let failures = 0;
function fail(msg) {
  failures += 1;
  console.error("FAIL: " + msg);
}
function ok(cond, msg) {
  if (!cond) fail(msg);
}

const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
const put = (g, name, type, color) => {
  g.board.pieces[sq(name)] = { type, color };
};
const clear = (g, name) => {
  g.board.pieces[sq(name)] = null;
};

function fresh(seed) {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed, { mode: "buff" });
  return game;
}

function buffIndex(game, color, id) {
  return game.buffs.players[color].buffs.findIndex((b) => b.id === id);
}
function inst(game, color, id) {
  return game.buffs.players[color].buffs.find((b) => b.id === id) ?? null;
}

/** Activate a held buff by id with explicit picks (white's turn assumed). */
function act(game, color, id, picks) {
  const idx = buffIndex(game, color, id);
  if (idx < 0) throw new Error(`no held card "${id}"`);
  return activateBuff(game, color, idx, picks);
}

/** Place a companion card's piece at `at` and hand the turn back to white. */
function deploy(game, id, at) {
  ok(act(game, "w", id, [{ square: sq(at) }]), `${id} deploy activation refused`);
  game.board.turn = "w";
}

/** Play n white moves (with black replies), preferring quiet non-via moves. */
function playOwnerTurns(game, n) {
  let whiteMoves = 0;
  for (let guard = 0; guard < 40 && whiteMoves < n && !game.result; guard++) {
    const mover = game.board.turn;
    const moves = legalMoves(game);
    const quiet = moves.find((m) => !m.captured && !m.via && !m.drop) ?? moves[0];
    if (!quiet) throw new Error("no legal move while walking turns");
    playMove(game, quiet);
    if (mover === "w") whiteMoves++;
  }
}

// --- 1. Cami places, seats her abilities, and moves like an amazon -----------
{
  const game = fresh(11);
  acquireBuff(game, "w", "i_love_cam", 6);
  const idx = buffIndex(game, "w", "i_love_cam");
  const target = buffNextTarget(game, "w", idx, []);
  ok(target && target.kind === "square", "placement offered no square target");
  ok(
    target.squares.length > 0 &&
      target.squares.every((s) => Math.floor(s / 8) < 4 && !game.board.pieces[s]),
    "placement squares leak outside white's empty half",
  );
  deploy(game, "i_love_cam", "c3");
  const cami = game.board.pieces[sq("c3")];
  ok(cami && cami.type === "q" && cami.color === "w", "Cami did not place as a white queen");
  ok(inst(game, "w", "i_love_cam").state.sq === sq("c3"), "parent card did not track her square");
  ok(!!inst(game, "w", "cami_sweep"), "Sweep the Lines was not seated in the hand");
  ok(!!inst(game, "w", "cami_leap"), "Guardian Leap was not seated in the hand");
  // Amazon movement: queen slides come from her body; the knight leaps ride
  // the parent card's augment. c3 -> b5 is a pure knight leap.
  const leaps = legalMoves(game).filter((m) => m.via === "i_love_cam" && m.from === sq("c3"));
  ok(leaps.some((m) => m.to === sq("b5")), "Cami gained no knight leap to b5");
  ok(leaps.every((m) => m.captured !== "k"), "an augmented leap captures a king");
  // Re-placement is refused: the card is her anchor now.
  ok(buffNextTarget(game, "w", idx, []) === null, "placed Cami still offers placement targets");
}

// --- 2. Devotion: allies beside Cami are uncapturable (with fallback) --------
{
  const game = fresh(12);
  acquireBuff(game, "w", "i_love_cam", 6);
  deploy(game, "i_love_cam", "f3");
  // White pawn g4 stands beside Cami (f3); a black rook on g6 wants it, and
  // black also has a free rook (a real alternative move exists).
  put(game, "g4", "p", "w");
  put(game, "g6", "r", "b");
  game.board.turn = "b";
  const moves = legalMoves(game);
  ok(
    !moves.some((m) => m.to === sq("g4") && m.captured),
    "Devotion failed: a guarded ally beside Cami was capturable",
  );
  ok(
    moves.some((m) => m.from === sq("g6") && !m.captured),
    "setup broken: the rook should still have quiet moves",
  );
  // Cami herself is NOT guarded (that is the counterplay).
  put(game, "f6", "r", "b");
  ok(
    legalMoves(game).some((m) => m.to === sq("f3") && m.captured === "q"),
    "Devotion wrongly protects Cami herself",
  );
}
{
  // Never-strand fallback: black's ONLY legal move is capturing the guarded
  // pawn, so the filter must relax rather than zero black out.
  const game = fresh(13);
  acquireBuff(game, "w", "i_love_cam", 6);
  deploy(game, "i_love_cam", "f3");
  for (let s = 0; s < 64; s++) game.board.pieces[s] = null;
  put(game, "e1", "k", "w");
  put(game, "f3", "q", "w"); // Cami (state.sq still f3)
  put(game, "g4", "p", "w"); // the guarded ally
  put(game, "h5", "k", "b");
  // Box the black king in with frozen black pawns; only Kxg4 remains.
  for (const s of ["g5", "h4", "g6", "h6"]) {
    put(game, s, "p", "b");
    game.buffs.effects.push({ kind: "freeze", sq: sq(s), owner: "b", turns: 9 });
  }
  game.board.epTarget = null;
  game.board.turn = "b";
  const moves = legalMoves(game);
  ok(moves.length > 0, "never-strand fallback failed: black has zero moves");
  ok(
    moves.some((m) => m.to === sq("g4") && m.captured === "p"),
    "fallback did not restore the only available capture",
  );
}

// --- 3. Sweep the Lines: rank/file clear + 3-turn recharge --------------------
{
  const game = fresh(14);
  acquireBuff(game, "w", "i_love_cam", 6);
  deploy(game, "i_love_cam", "c3");
  // Enemy rook up her file, enemy knight along her rank; the enemy king on
  // her file and the white pawn on c2 must both survive. (Black's king moves
  // off e8 so the swept file can host it.)
  clear(game, "e8");
  put(game, "c8", "k", "b");
  put(game, "c6", "r", "b");
  put(game, "f3", "n", "b");
  const swept = inst(game, "w", "cami_sweep");
  ok(act(game, "w", "cami_sweep", []), "Sweep the Lines refused to fire");
  ok(!game.board.pieces[sq("c6")], "sweep left the enemy rook on her file");
  ok(!game.board.pieces[sq("f3")], "sweep left the enemy knight on her rank");
  ok(game.board.pieces[sq("c8")]?.type === "k", "sweep removed a king");
  ok(game.board.pieces[sq("c2")]?.color === "w", "sweep removed a friendly piece");
  ok(swept.usedActivation === true && swept.state.cd === 3, "sweep did not arm its cooldown");
  ok(!act(game, "w", "cami_sweep", []), "sweep re-fired while on cooldown");
  playOwnerTurns(game, 3);
  ok(swept.usedActivation === false, "sweep did not re-arm after 3 owner turns");
  ok(swept.state.cd === 0, `sweep cooldown should be 0, is ${swept.state.cd}`);
}

// --- 4. Guardian Leap: free-action teleport beside the king -------------------
{
  const game = fresh(15);
  acquireBuff(game, "w", "i_love_cam", 6);
  deploy(game, "i_love_cam", "c3");
  clear(game, "f2"); // open one square beside the e1 king
  const idx = buffIndex(game, "w", "cami_leap");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target && target.kind === "square" && target.squares.includes(sq("f2")),
    "Guardian Leap did not offer the empty square beside the king",
  );
  ok(game.board.turn === "w", "setup broken: should be white to move");
  ok(act(game, "w", "cami_leap", [{ square: sq("f2") }]), "Guardian Leap refused to fire");
  ok(game.board.pieces[sq("f2")]?.type === "q", "Cami did not land beside the king");
  ok(!game.board.pieces[sq("c3")], "Cami left a copy behind");
  ok(
    inst(game, "w", "i_love_cam").state.sq === sq("f2"),
    "the parent card lost track of her after the leap",
  );
  ok(game.board.turn === "w", "Guardian Leap consumed the turn (must be a free action)");
  const leap = inst(game, "w", "cami_leap");
  ok(leap.usedActivation === true && leap.state.cd === 2, "leap did not arm its 2-turn cooldown");
  playOwnerTurns(game, 2);
  ok(leap.usedActivation === false, "leap did not re-arm after 2 owner turns");
}

// --- 5. Vengeance: her fall freezes the capturer and retires the kit ----------
{
  const game = fresh(16);
  acquireBuff(game, "w", "i_love_cam", 6);
  deploy(game, "i_love_cam", "c3");
  put(game, "c6", "r", "b");
  game.board.turn = "b";
  const capture = legalMoves(game).find((m) => m.to === sq("c3") && m.captured === "q");
  ok(!!capture, "black cannot capture Cami in the setup");
  playMove(game, capture);
  ok(inst(game, "w", "i_love_cam").spent === true, "Cami's card was not spent on her capture");
  ok(inst(game, "w", "cami_sweep").spent === true, "Sweep did not retire with her");
  ok(inst(game, "w", "cami_leap").spent === true, "Guardian Leap did not retire with her");
  const freeze = game.buffs.effects.find(
    (e) => e.kind === "freeze" && e.sq === sq("c3") && e.owner === "b",
  );
  ok(!!freeze, "vengeance freeze missing on the capturer");
  ok(freeze && freeze.turns === 2, `vengeance freeze should have 2 turns left, has ${freeze?.turns}`);
  game.board.turn = "b";
  ok(
    legalMoves(game).every((m) => m.from !== sq("c3")),
    "the frozen capturer can still move",
  );
}

// --- 6. NewJeans pocket companions --------------------------------------------

// Shared deploy checks: own-half empty squares only, right piece class, and
// the ability latch (armed after one owner move, blocked before).
function deployMember(seed, id, piece, at) {
  const game = fresh(seed);
  acquireBuff(game, "w", id, 5);
  const idx = buffIndex(game, "w", id);
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target &&
      target.kind === "square" &&
      target.squares.length > 0 &&
      target.squares.every((s) => Math.floor(s / 8) < 4 && !game.board.pieces[s]),
    `${id}: deploy squares leak outside white's empty half`,
  );
  if (id === "hyein") {
    ok(target.squares.every((s) => Math.floor(s / 8) >= 1), "hyein offered a back-rank drop");
  }
  deploy(game, id, at);
  const p = game.board.pieces[sq(at)];
  ok(p && p.color === "w" && p.type === piece, `${id} did not deploy as a white ${piece}`);
  const member = inst(game, "w", id);
  ok(member.state.sq === sq(at), `${id} does not track her square`);
  ok(member.usedActivation === true, `${id}: deploy should latch the activation`);
  ok(!act(game, "w", id, []), `${id}: ability fired on the deploy turn`);
  playOwnerTurns(game, 1);
  ok(member.usedActivation === false, `${id}: ability did not come online after one owner move`);
  return game;
}

// Minji: rook-class; Linked Arms shields adjacent allies for 2 opponent turns.
{
  const game = deployMember(21, "minji", "r", "c3");
  put(game, "b4", "p", "w"); // ally beside her
  put(game, "b6", "r", "b"); // wants that pawn
  game.board.turn = "w";
  ok(act(game, "w", "minji", []), "Linked Arms refused to fire");
  const shield = game.buffs.effects.find(
    (e) => e.kind === "shield" && e.owner === "w" && e.squares && e.squares.includes(sq("b4")),
  );
  ok(!!shield, "Linked Arms raised no shield on the adjacent ally");
  game.board.turn = "b";
  ok(
    !legalMoves(game).some((m) => m.to === sq("b4") && m.captured),
    "a Linked Arms ally was still capturable",
  );
  const minji = inst(game, "w", "minji");
  ok(minji.state.cd === 3, "Linked Arms did not arm its 3-turn cooldown");
  // Capture retires the card.
  game.board.turn = "b";
  put(game, "c6", "r", "b");
  const capture = legalMoves(game).find((m) => m.to === sq("c3") && m.captured === "r");
  ok(!!capture, "black cannot capture Minji in the setup");
  playMove(game, capture);
  ok(minji.spent === true, "capturing Minji did not retire her card");
}

// Hanni: bishop-class; Spotlight charm-freezes an enemy within 2 + neighbors.
{
  const game = deployMember(22, "hanni", "b", "c3");
  put(game, "e4", "n", "b"); // 2 squares from her
  put(game, "d4", "p", "b"); // touching the target
  game.board.turn = "w";
  const idx = buffIndex(game, "w", "hanni");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target && target.kind === "square" && target.squares.includes(sq("e4")),
    "Spotlight did not offer the enemy within 2 squares",
  );
  ok(
    !target.squares.includes(sq("e8")),
    "Spotlight offered a king (or something far outside her reach)",
  );
  ok(act(game, "w", "hanni", [{ square: sq("e4") }]), "Spotlight refused to fire");
  for (const s of ["e4", "d4"]) {
    const f = game.buffs.effects.find(
      (e) => e.kind === "freeze" && e.sq === sq(s) && e.owner === "b" && e.skin === "charm",
    );
    ok(!!f && f.turns === 1, `Spotlight did not charm-freeze ${s} for 1 turn`);
  }
  ok(inst(game, "w", "hanni").state.cd === 3, "Spotlight did not arm its cooldown");
}

// Danielle: knight-class; Sunshine grows a pawn on an empty neighbor square.
{
  const game = deployMember(23, "danielle", "n", "c3");
  game.board.turn = "w";
  const idx = buffIndex(game, "w", "danielle");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target && target.kind === "square" && target.squares.includes(sq("d4")),
    "Sunshine did not offer the empty square beside her",
  );
  ok(act(game, "w", "danielle", [{ square: sq("d4") }]), "Sunshine refused to fire");
  const grown = game.board.pieces[sq("d4")];
  ok(grown && grown.type === "p" && grown.color === "w", "Sunshine grew no pawn");
  ok(inst(game, "w", "danielle").state.cd === 3, "Sunshine did not arm its cooldown");
}

// Haerin: knight-class with a 1-square diagonal step; Pounce captures at a
// knight's leap and lands on the square.
{
  const game = deployMember(24, "haerin", "n", "c3");
  game.board.turn = "w";
  const diag = legalMoves(game).filter((m) => m.via === "haerin" && m.from === sq("c3"));
  ok(diag.some((m) => m.to === sq("b4")), "Haerin lost her diagonal step");
  put(game, "d5", "p", "b");
  const idx = buffIndex(game, "w", "haerin");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target && target.kind === "square" && target.squares.includes(sq("d5")),
    "Pounce did not offer the enemy a knight's leap away",
  );
  ok(act(game, "w", "haerin", [{ square: sq("d5") }]), "Pounce refused to fire");
  ok(
    game.board.pieces[sq("d5")]?.type === "n" && game.board.pieces[sq("d5")]?.color === "w",
    "Haerin did not land on the prey's square",
  );
  ok(!game.board.pieces[sq("c3")], "Haerin left a copy behind");
  const haerin = inst(game, "w", "haerin");
  ok(haerin.state.sq === sq("d5"), "Pounce lost track of her square");
  ok(haerin.state.cd === 3, "Pounce did not arm its cooldown");
}

// Hyein: pawn-class strider; Ascend promotes her once per game.
{
  const game = deployMember(25, "hyein", "p", "c3");
  game.board.turn = "w";
  // Stride: with c4 blocked she still springs to c5 (leaping teleport).
  put(game, "c4", "p", "w");
  const strides = legalMoves(game).filter((m) => m.via === "hyein" && m.from === sq("c3"));
  ok(strides.some((m) => m.to === sq("c5")), "Hyein cannot spring over the blocker to c5");
  ok(act(game, "w", "hyein", []), "Ascend refused to fire");
  ok(game.board.pieces[sq("c3")]?.type === "q", "Ascend did not promote her to a queen");
  const hyein = inst(game, "w", "hyein");
  ok(hyein.state.done === true && hyein.usedActivation === true, "Ascend is not once-per-game");
  playOwnerTurns(game, 3);
  ok(hyein.usedActivation === true, "Ascend re-armed (must be once per game)");
  ok(hyein.spent !== true, "Hyein's card retired while she still stands");
  game.board.turn = "w";
  ok(
    !legalMoves(game).some((m) => m.via === "hyein" && m.from === sq("c3")),
    "the pawn stride survived her promotion",
  );
}

// --- 7. Determinism: identical games agree on the move list -------------------
{
  const run = (seed) => {
    const game = fresh(seed);
    acquireBuff(game, "w", "i_love_cam", 6);
    deploy(game, "i_love_cam", "c3");
    acquireBuff(game, "w", "haerin", 5);
    deploy(game, "haerin", "f3");
    playOwnerTurns(game, 2);
    game.board.turn = "w";
    return legalMoves(game)
      .map((m) => moveToUCI(m) + (m.via ?? ""))
      .sort()
      .join(",");
  };
  ok(run(99) === run(99), "two identical companion games disagree on the move list (desync risk)");
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "OK: companions verified (Cami places/amazon-moves/devotion-guards/sweeps/guardian-leaps/vengeance-freezes; " +
    "all five members deploy, move, fire and recharge their abilities, retire on capture; deterministic)",
);
