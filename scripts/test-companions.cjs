// Zero-dependency harness for I Love Cami (the one remaining companion
// piece) and the five reverted NewJeans cards (minji / hanni / danielle /
// haerin / hyein), which are simple one-shot / passive cards again (owner
// request: placing companions was too confusing). Run after
// `npm run server:build`:
//
//   node scripts/test-companions.cjs
//
// Asserts, in real buff-mode games:
//   - Cami places as a queen in the caster's half, moves like an amazon
//     (knight leaps via the parent card), and her card tracks her square as
//     she moves;
//   - the multi-ability kit is GONE: no cami_sweep / cami_leap cards exist
//     and placing her seats nothing extra in the hand;
//   - Devotion: allies beside Cami cannot be captured, with the never-strand
//     fallback (an opponent whose ONLY move is such a capture keeps it);
//   - Vengeance: capturing Cami spends the card and freezes the capturer for
//     2 of their turns;
//   - Minji (activated): shields every ally beside the king for 5 turns;
//   - Hyein (passive): pawns stride to the 1st/2nd empty square ahead,
//     springing over blockers;
//   - Haerin (activated): pounce snatches an enemy a knight's leap away and
//     lands on its square;
//   - Hanni (activated): spotlight charm-freezes the target and its enemy
//     neighbors for 2 turns (kings shrug it off);
//   - Danielle (activated): grows two shielded pawns in the caster's half;
//   - all six pass the god-panel summon classification (implemented, not
//     instant, not an opponent-filtering passive — mirrors worker adminGrant);
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

/** Activate a held buff by id with explicit picks. */
function act(game, color, id, picks) {
  const idx = buffIndex(game, color, id);
  if (idx < 0) throw new Error(`no held card "${id}"`);
  return activateBuff(game, color, idx, picks);
}

/** Place Cami at `at` and hand the turn back to white. */
function deploy(game, id, at) {
  ok(act(game, "w", id, [{ square: sq(at) }]), `${id} deploy activation refused`);
  game.board.turn = "w";
}

// --- 0. The ability kit is gone -----------------------------------------------
{
  ok(!BUFF_BY_ID.cami_sweep, "cami_sweep still exists in the library");
  ok(!BUFF_BY_ID.cami_leap, "cami_leap still exists in the library");
}

// --- 1. Cami places as a queen and moves like an amazon ------------------------
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
  const handBefore = game.buffs.players.w.buffs.length;
  deploy(game, "i_love_cam", "c3");
  const cami = game.board.pieces[sq("c3")];
  ok(cami && cami.type === "q" && cami.color === "w", "Cami did not place as a white queen");
  ok(inst(game, "w", "i_love_cam").state.sq === sq("c3"), "parent card did not track her square");
  ok(
    game.buffs.players.w.buffs.length === handBefore,
    "placing Cami seated extra cards in the hand (the ability kit should be gone)",
  );
  // Amazon movement: queen slides come from her body; the knight leaps ride
  // the parent card's augment. c3 -> b5 is a pure knight leap.
  const leaps = legalMoves(game).filter((m) => m.via === "i_love_cam" && m.from === sq("c3"));
  ok(leaps.some((m) => m.to === sq("b5")), "Cami gained no knight leap to b5");
  ok(leaps.every((m) => m.captured !== "k"), "an augmented leap captures a king");
  // Re-placement is refused: the card is her anchor now.
  ok(buffNextTarget(game, "w", idx, []) === null, "placed Cami still offers placement targets");
  // Her card follows her as she moves (trackBoundPiece).
  const slide = legalMoves(game).find((m) => m.from === sq("c3") && m.to === sq("c6"));
  ok(!!slide, "setup broken: Cami should be able to slide up the c-file");
  playMove(game, slide);
  ok(
    inst(game, "w", "i_love_cam").state.sq === sq("c6"),
    "the card lost track of Cami after she moved",
  );
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

// --- 3. Vengeance: her fall freezes the capturer and spends the card ----------
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

// --- 4. The five NewJeans cards (reverted, simple + strong) -------------------

// Minji (activated): every ally beside the king is shielded for 5 turns.
{
  const game = fresh(21);
  acquireBuff(game, "w", "minji", 5);
  ok(act(game, "w", "minji", []), "Minji refused to fire");
  const shield = game.buffs.effects.find(
    (e) => e.kind === "shield" && e.owner === "w" && Array.isArray(e.squares),
  );
  ok(!!shield, "Minji raised no shield");
  for (const s of ["d1", "f1", "d2", "e2", "f2"]) {
    ok(shield && shield.squares.includes(sq(s)), `Minji's guard misses the king-adjacent ally on ${s}`);
  }
  ok(shield && !shield.squares.includes(sq("e1")), "Minji's guard covers the king itself");
  // The record reads 6: activateBuff adds +1 to self-protection timers from a
  // turn-consuming activation so "5 turns" means 5 turns AFTER this turn.
  ok(shield && shield.turns === 6, `Minji's guard should record 5+1 turns, records ${shield?.turns}`);
  // A rook staring straight down the e-file cannot take the shielded e2 pawn.
  clear(game, "e7");
  put(game, "e5", "r", "b");
  game.board.turn = "b";
  ok(
    !legalMoves(game).some((m) => m.to === sq("e2") && m.captured),
    "a Linked Arms ally was still capturable",
  );
}

// Hyein (passive): pawns stride to the 1st/2nd empty square ahead, springing
// over blockers.
{
  const game = fresh(22);
  acquireBuff(game, "w", "hyein", 5);
  // Block c3 with a friendly knight: the normal double-push is dead, but the
  // stride springs over to the first EMPTY square ahead (c4).
  put(game, "c3", "n", "w");
  const strides = legalMoves(game).filter((m) => m.via === "hyein" && m.from === sq("c2"));
  ok(strides.some((m) => m.to === sq("c4")), "Hyein's stride cannot spring over the blocker to c4");
  // A pawn past its home rank (no normal double-push left) regains the
  // two-square reach through the stride. (From the home rank the double push
  // already exists, so no NOVEL via move is added there — that is by design.)
  clear(game, "h7");
  put(game, "h5", "p", "w");
  ok(
    legalMoves(game).some((m) => m.via === "hyein" && m.from === sq("h5") && m.to === sq("h7")),
    "a moved pawn did not gain the second-square stride",
  );
}

// Haerin (activated): pounce snatches an enemy a knight's leap away and lands
// on its square.
{
  const game = fresh(23);
  acquireBuff(game, "w", "haerin", 5);
  put(game, "c3", "b", "w");
  put(game, "d5", "p", "b");
  const idx = buffIndex(game, "w", "haerin");
  const first = buffNextTarget(game, "w", idx, []);
  ok(
    first && first.kind === "square" && first.squares.includes(sq("c3")),
    "Pounce did not offer the piece with prey in leap range",
  );
  const second = buffNextTarget(game, "w", idx, [{ square: sq("c3") }]);
  ok(
    second && second.kind === "square" && second.squares.includes(sq("d5")),
    "Pounce did not offer the enemy a knight's leap away",
  );
  ok(act(game, "w", "haerin", [{ square: sq("c3") }, { square: sq("d5") }]), "Pounce refused to fire");
  ok(
    game.board.pieces[sq("d5")]?.type === "b" && game.board.pieces[sq("d5")]?.color === "w",
    "the pouncer did not land on the prey's square",
  );
  ok(!game.board.pieces[sq("c3")], "the pouncer left a copy behind");
}

// Hanni (activated): spotlight charm-freezes the target and its enemy
// neighbors for 2 turns; kings shrug it off.
{
  const game = fresh(24);
  acquireBuff(game, "w", "hanni", 5);
  put(game, "e4", "n", "b");
  put(game, "d4", "p", "b");
  const idx = buffIndex(game, "w", "hanni");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target && target.kind === "square" && target.squares.includes(sq("e4")),
    "Spotlight did not offer the enemy piece",
  );
  ok(!target.squares.includes(sq("e8")), "Spotlight offered a king");
  ok(act(game, "w", "hanni", [{ square: sq("e4") }]), "Spotlight refused to fire");
  for (const s of ["e4", "d4"]) {
    const f = game.buffs.effects.find(
      (e) => e.kind === "freeze" && e.sq === sq(s) && e.owner === "b" && e.skin === "charm",
    );
    ok(!!f && f.turns === 2, `Spotlight did not charm-freeze ${s} for 2 turns`);
  }
  game.board.turn = "b";
  ok(
    legalMoves(game).every((m) => m.from !== sq("e4") && m.from !== sq("d4")),
    "a charmed piece can still move",
  );
}

// Danielle (activated): grows two pawns in the caster's half, each shielded
// for 2 turns.
{
  const game = fresh(25);
  acquireBuff(game, "w", "danielle", 5);
  const idx = buffIndex(game, "w", "danielle");
  const target = buffNextTarget(game, "w", idx, []);
  ok(
    target &&
      target.kind === "square" &&
      target.squares.length > 0 &&
      target.squares.every((s) => Math.floor(s / 8) < 4 && !game.board.pieces[s]),
    "Sunshine placement squares leak outside white's empty half",
  );
  ok(
    act(game, "w", "danielle", [{ square: sq("a3") }, { square: sq("b3") }]),
    "Sunshine refused to fire",
  );
  for (const s of ["a3", "b3"]) {
    const p = game.board.pieces[sq(s)];
    ok(p && p.type === "p" && p.color === "w", `Sunshine grew no pawn on ${s}`);
  }
  const shield = game.buffs.effects.find(
    (e) =>
      e.kind === "shield" &&
      e.owner === "w" &&
      Array.isArray(e.squares) &&
      e.squares.includes(sq("a3")) &&
      e.squares.includes(sq("b3")),
  );
  // Records 3 (= 2 + the activation-turn compensation, see the Minji note).
  ok(!!shield && shield.turns === 3, "Sunshine's pawns did not arrive shielded for 2 turns");
}

// --- 5. God-panel summon classification (mirrors worker.ts adminGrant) --------
{
  for (const id of ["i_love_cam", "minji", "hanni", "danielle", "haerin", "hyein"]) {
    const def = BUFF_BY_ID[id];
    ok(!!def && def.implemented, `${id} is missing or unimplemented`);
    if (!def) continue;
    ok(def.kind !== "instant", `${id} is an instant, so the god panel cannot summon it`);
    ok(
      !(def.kind === "passive" && def.filterOpponentMoves),
      `${id} is an opponent-filtering passive, so the god panel cannot summon it`,
    );
  }
}

// --- 6. Determinism: identical games agree on the move list -------------------
{
  const run = (seed) => {
    const game = fresh(seed);
    acquireBuff(game, "w", "i_love_cam", 6);
    deploy(game, "i_love_cam", "c3");
    acquireBuff(game, "w", "hyein", 5);
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
  "OK: Cami verified (places/amazon-moves/tracks/devotion-guards/never-strands/vengeance-freezes, no ability kit) " +
    "and the five reverted NewJeans cards fire their simple effects; all six pass the god-panel summon rule; deterministic",
);
