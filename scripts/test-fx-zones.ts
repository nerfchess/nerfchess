// Card-fx visual scope: a card's board marks must match its mechanic's reach.
//
// The bug that motivated this suite (playtest report: "the visual makes every
// piece look like it has the powerup"): computeFxVisual narrowed a card's
// marks only through the SINGULAR state.sq convention, so a card tracking a
// player-chosen subset in state.sqs (Ascendancy, Titan Legion, Uplifted
// Pawns...) fell through to the army-wide loop and painted every owner piece
// — and Board.tsx derives hybrid piece sprites from those same marks, so the
// entire army rendered as queen-hybrids while the rule correctly empowered
// only the chosen four. fxZones.ts had zero coverage; this suite is that
// coverage.
//
// Run: npx -y tsx scripts/test-fx-zones.ts

import { computeFxVisual } from "../src/components/effects/fxZones";
import { ALL_BUFFS, BUFF_BY_ID } from "../src/engine/buffs/library";
import type { Buff, BuffInstance, BuffMatchState } from "../src/engine/buff";
import type { BoardState, Color, Piece, PieceType } from "../src/engine/types";

let failures = 0;
const fail = (name: string, detail: string) => {
  failures++;
  console.error(`FAIL ${name}: ${detail}`);
};
const ok = (name: string) => console.log(`  ok ${name}`);

function mkBoard(pieces: Record<number, Piece>): BoardState {
  const arr: (Piece | null)[] = new Array(64).fill(null);
  for (const [sq, p] of Object.entries(pieces)) arr[Number(sq)] = p;
  return {
    pieces: arr,
    turn: "w",
    castling: { wk: false, wq: false, bk: false, bq: false },
    epTarget: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
  };
}

function mkGame(pieces: Record<number, Piece>, wBuffs: BuffInstance[], bBuffs: BuffInstance[] = []) {
  const buffs = {
    cadence: 5,
    rngState: 1,
    effects: [],
    extraMoves: { w: 0, b: 0 },
    skips: { w: 0, b: 0 },
    players: {
      w: { buffs: wBuffs },
      b: { buffs: bBuffs },
    },
  } as unknown as BuffMatchState;
  return { board: mkBoard(pieces), buffs };
}

function motifSqs(game: ReturnType<typeof mkGame>): number[] {
  return computeFxVisual(game)
    .motifs.map((m) => m.sq)
    .sort((a, z) => a - z);
}

const W = (type: PieceType): Piece => ({ type, color: "w" });
const B = (type: PieceType): Piece => ({ type, color: "b" });

// --- 1. Ascendancy paints ONLY the chosen squares --------------------------
{
  const game = mkGame(
    { 0: W("q"), 1: W("r"), 2: W("n"), 3: W("p"), 4: W("k"), 60: B("k"), 59: B("q") },
    [{ id: "ascendancy", tier: 10, state: { sqs: [0, 1], turns: 2 } }],
  );
  const got = motifSqs(game);
  if (JSON.stringify(got) !== JSON.stringify([0, 1]))
    fail("ascendancy chosen squares only", `marks at ${JSON.stringify(got)}, wanted [0,1]`);
  else ok("ascendancy chosen squares only");
}

// --- 2. Empty tracked set paints nothing (all chosen pieces captured) ------
{
  const game = mkGame(
    { 0: W("q"), 4: W("k"), 60: B("k") },
    [{ id: "ascendancy", tier: 10, state: { sqs: [], turns: 2 } }],
  );
  const got = motifSqs(game);
  if (got.length !== 0) fail("empty tracked set", `marks at ${JSON.stringify(got)}, wanted none`);
  else ok("empty tracked set");
}

// --- 3. Singular state.sq binding still narrows (bindPiece convention) -----
{
  const game = mkGame(
    { 5: W("r"), 6: W("r"), 4: W("k"), 60: B("k") },
    [{ id: "living_god", tier: 9, state: { sq: 5, turns: 4 } }],
  );
  const got = motifSqs(game);
  if (JSON.stringify(got) !== JSON.stringify([5]))
    fail("singular bound square", `marks at ${JSON.stringify(got)}, wanted [5]`);
  else ok("singular bound square");
}

// --- 4. A tracked square whose piece changed hands paints nothing there ----
{
  const game = mkGame(
    { 0: W("q"), 1: B("r"), 4: W("k"), 60: B("k") },
    [{ id: "ascendancy", tier: 10, state: { sqs: [0, 1], turns: 2 } }],
  );
  const got = motifSqs(game);
  if (JSON.stringify(got) !== JSON.stringify([0]))
    fail("bound square must hold an owner piece", `marks at ${JSON.stringify(got)}, wanted [0]`);
  else ok("bound square must hold an owner piece");
}

// --- 5. Library sweep: EVERY fx card with a synthesized chosen subset ------
// For each implemented buff declaring fx.pieces, pretend the player chose
// squares 10 and 11: the fx layer must paint at most those two squares, never
// the decoys at 12/13. This is the regression net for the whole bug class —
// any future chosen-subset card is covered the day it is written.
{
  let swept = 0;
  let bad = 0;
  for (const def of ALL_BUFFS) {
    if (!def.implemented || !def.fx?.pieces) continue;
    const type: PieceType = def.fx.pieces === "all" ? "r" : def.fx.pieces[0];
    const owner: Color = def.fx.self ? "w" : "b";
    const mk = (t: PieceType): Piece => ({ type: t, color: owner });
    const pieces: Record<number, Piece> = {
      10: mk(type),
      11: mk(type),
      12: mk(type),
      13: mk(type),
      4: { type: "k", color: "w" },
      60: { type: "k", color: "b" },
    };
    const inst: BuffInstance = { id: def.id, tier: def.tier, state: { sqs: [10, 11], turns: 2 } };
    const game = mkGame(pieces, [inst]);
    const got = motifSqs(game).filter((sq) => sq >= 10 && sq <= 13);
    swept++;
    if (got.some((sq) => sq === 12 || sq === 13)) {
      bad++;
      fail(`sweep:${def.id}`, `chosen [10,11] but marks leak to ${JSON.stringify(got)}`);
    }
  }
  if (bad === 0) ok(`library sweep: ${swept} fx cards honor a chosen subset`);
}

// --- 6. pieces:"all" excludes the king unless fx.king opts in --------------
// Rally is exempt by design: an army-wide tempo boon plants ONE banner on the
// rallied side's king square instead of tiling the whole army (fxZones's
// special case), so the king square is exactly where its mark belongs.
{
  let swept = 0;
  let bad = 0;
  for (const def of ALL_BUFFS) {
    if (!def.implemented || def.fx?.pieces !== "all" || def.fx.king) continue;
    if (def.fx.motif === "rally") continue;
    const owner: Color = def.fx.self ? "w" : "b";
    const kingSq = owner === "w" ? 4 : 60;
    const pieces: Record<number, Piece> = {
      10: { type: "r", color: owner },
      4: { type: "k", color: "w" },
      60: { type: "k", color: "b" },
    };
    // A running army-wide instance with no bound subset.
    const inst: BuffInstance = { id: def.id, tier: def.tier, state: { turns: 2 } };
    const game = mkGame(pieces, [inst]);
    const got = motifSqs(game);
    swept++;
    if (got.includes(kingSq)) {
      bad++;
      fail(`king-exclusion:${def.id}`, `pieces:"all" marked the king at ${kingSq}`);
    }
  }
  if (bad === 0) ok(`king exclusion: ${swept} army-wide cards leave the king unmarked`);
}

// --- 7. Ascendancy self-retires when its last piece dies -------------------
{
  const def = BUFF_BY_ID["ascendancy"] as Buff;
  const inst: BuffInstance = { id: "ascendancy", tier: 10, state: { sqs: [12], turns: 2 } };
  def.onMovePlayed?.(
    inst,
    { from: 20, to: 12, piece: "r", color: "b", captured: "q", capturedSquare: 12 },
    { me: "w" } as never,
  );
  if (!inst.spent) fail("ascendancy self-retire", "last ascendant captured but card not spent");
  else ok("ascendancy self-retire");
}

// --- 8. Amazon grants declare the amazon badge -----------------------------
{
  for (const id of ["ascendancy", "titan_legion", "living_god"]) {
    const def = BUFF_BY_ID[id];
    if (def?.fx?.moveAs !== "a") fail(`amazon badge:${id}`, `moveAs is ${String(def?.fx?.moveAs)}, wanted "a"`);
    else ok(`amazon badge:${id}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} fx-zones failure(s)`);
  process.exit(1);
}
console.log("\nfx-zones: all checks passed");
