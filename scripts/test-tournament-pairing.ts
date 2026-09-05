// Tournament Swiss-pairing unit test. Run with:
//   npx -y tsx scripts/test-tournament-pairing.ts
//
// Exercises the pure pairing function (src/lib/tournamentPairing.ts):
//   1. Ranking: score groups first, rating inside a group, user id as the
//      determinism tiebreak; adjacent players meet.
//   2. No-rematch preference: a previous pair is skipped when another
//      opponent exists, but taken when every remaining option is a rematch.
//   3. Bye handling: odd fields sit the lowest-ranked player without a
//      prior bye; once everyone has had one, the bottom player sits again.
//   4. Determinism: identical inputs (in any order) produce identical
//      pairings, boards, and colors.
//   5. Color balance: colors alternate by board.

import { pairKey, pairSwissRound, type PairingEntrant } from "../src/lib/tournamentPairing";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} (${detail})`);
  if (!ok) failures++;
}

const player = (id: string, score: number, rating: number): PairingEntrant => ({
  userId: id,
  username: id,
  score,
  rating,
});

const none = new Set<string>();
const boardKey = (b: { white: PairingEntrant; black: PairingEntrant }) =>
  `${b.white.userId}>${b.black.userId}`;

// --- 1. Ranking and adjacency ---------------------------------------------
{
  const field = [
    player("d", 0, 1500),
    player("a", 2, 1800),
    player("c", 1, 1700),
    player("b", 2, 1600),
    player("f", 0, 1400),
    player("e", 1, 1550),
  ];
  const round = pairSwissRound(field, none, none);
  check("even field has no bye", round.bye === null, `bye=${round.bye?.userId ?? "null"}`);
  check("all players paired", round.boards.length === 3, `${round.boards.length} boards`);
  const keys = round.boards.map(boardKey);
  // Rank order: a(2,1800) b(2,1600) c(1,1700) e(1,1550) d(0,1500) f(0,1400).
  // Adjacent pairing: a-b, c-e, d-f; colors alternate by board.
  check(
    "score groups pair adjacent, colors alternate",
    keys.join(",") === "a>b,e>c,d>f",
    keys.join(","),
  );
}

// --- 2. No-rematch preference ---------------------------------------------
{
  const field = [player("a", 1, 1800), player("b", 1, 1700), player("c", 0, 1600), player("d", 0, 1500)];
  const played = new Set([pairKey("a", "b")]);
  const round = pairSwissRound(field, played, none);
  const keys = round.boards.map(boardKey);
  check(
    "rematch avoided when another opponent exists",
    keys.join(",") === "a>c,d>b",
    keys.join(","),
  );

  // Everyone has played everyone: the rematch is taken rather than leaving
  // players unpaired.
  const all = new Set([
    pairKey("a", "b"),
    pairKey("a", "c"),
    pairKey("a", "d"),
    pairKey("b", "c"),
    pairKey("b", "d"),
    pairKey("c", "d"),
  ]);
  const forced = pairSwissRound(field, all, none);
  check(
    "rematch taken when unavoidable",
    forced.boards.length === 2,
    forced.boards.map(boardKey).join(","),
  );
}

// --- 3. Bye handling -------------------------------------------------------
{
  const field = [
    player("a", 2, 1800),
    player("b", 1, 1700),
    player("c", 1, 1600),
    player("d", 0, 1500),
    player("e", 0, 1400),
  ];
  const r1 = pairSwissRound(field, none, none);
  check("odd field sits the bottom player", r1.bye?.userId === "e", `bye=${r1.bye?.userId}`);
  check("bye player is off the boards", r1.boards.every((b) => boardKey(b).indexOf("e") < 0), r1.boards.map(boardKey).join(","));

  const r2 = pairSwissRound(field, none, new Set(["e"]));
  check("no second bye while others wait", r2.bye?.userId === "d", `bye=${r2.bye?.userId}`);

  const everyone = new Set(["a", "b", "c", "d", "e"]);
  const r3 = pairSwissRound(field, none, everyone);
  check("all byes spent: bottom sits again", r3.bye?.userId === "e", `bye=${r3.bye?.userId}`);
}

// --- 4. Determinism --------------------------------------------------------
{
  const field = [
    player("p1", 1, 1500),
    player("p2", 1, 1500),
    player("p3", 1, 1500),
    player("p4", 1, 1500),
    player("p5", 0, 1500),
  ];
  const shuffled = [field[3], field[0], field[4], field[2], field[1]];
  const a = pairSwissRound(field, none, none);
  const b = pairSwissRound(shuffled, none, none);
  const sig = (r: ReturnType<typeof pairSwissRound>) =>
    `${r.boards.map(boardKey).join(",")}|bye=${r.bye?.userId ?? "-"}`;
  check("input order does not matter", sig(a) === sig(b), `${sig(a)} vs ${sig(b)}`);
  check(
    "equal score and rating tiebreak by user id",
    sig(a) === "p1>p2,p4>p3|bye=p5",
    sig(a),
  );
}

// --- 5. Color alternation --------------------------------------------------
{
  const field = Array.from({ length: 8 }, (_, i) => player(`s${i}`, 0, 2000 - i * 10));
  const round = pairSwissRound(field, none, none);
  const whites = round.boards.map((b) => b.white.userId);
  // Higher seed white on even boards, black on odd boards.
  check("colors alternate by board", whites.join(",") === "s0,s3,s4,s7", whites.join(","));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll tournament pairing checks passed.");
