// Repro: a read-only check probe (gameInCheck -> buffAugmentedAttacks) runs the
// opponent's augmentMoves on the LIVE BuffInstance. lossyAugment writes
// inst.state.armed = true there, so a probe made on the opponent's turn arms a
// "use it or lose it" card; when the real position no longer offers the move,
// the holder's next move forfeits the charge. Two replicas that differ only in
// whether they called gameInCheck end in different card states.
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { acquireBuff, enableDraftMode, gameInCheck, legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { pickHouseMove } from "../../../../../src/lib/server/bots";
import { desyncFingerprint } from "../../../../../src/engine/desync";

const id = Object.keys(BUFF_BY_ID).find((k) => /bridle_path$/.test(k))!;
console.log("card id:", id, BUFF_BY_ID[id].kind, "tier", BUFF_BY_ID[id].tier);

function run(probe: "none" | "gameInCheck" | "houseBot") {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 7);
  enableDraftMode(g, 7, { mode: "buff" });
  const clearOffers = () => { for (const c of ["w", "b"] as const) if (g.buffs!.players[c].offer) g.buffs!.players[c].offer = null; };
  clearOffers();
  acquireBuff(g, "w", id, BUFF_BY_ID[id].tier);
  const play = (u: string) => {
    clearOffers();
    const m = legalMoves(g).find((x) => moveToUCI(x) === u);
    if (!m) throw new Error(`illegal ${u}`);
    playMove(g, m);
  };
  play("g1f3"); play("e7e6"); play("b2b3");
  // Black to move. b4 and b5 are empty, so from White's side the canter b3-b5 is on offer.
  if (probe === "gameInCheck") gameInCheck(g, "b"); // what any check indicator / leavesKingCapturable does
  if (probe === "houseBot") { let s = 1; pickHouseMove(g, 1350, (n) => (s = (s * 48271) % 2147483647) % n); }
  play("f8b4"); // the bishop blocks b4: the canter is no longer on offer
  const inst = g.buffs!.players.w.buffs.find((b) => b.id === id)!;
  const armedAtWhiteTurn = inst.state.armed;
  const offered = legalMoves(g).some((m) => m.via === id);
  play("e2e3"); // White plays something else
  return { probe, armedAtWhiteTurn, offeredAtWhiteTurn: offered, charges: inst.state.charges, spent: !!inst.spent, fp: desyncFingerprint(g as any) };
}
const a = run("none"), b = run("gameInCheck"), c = run("houseBot");
for (const r of [a, b, c]) console.log(JSON.stringify({ ...r, fp: undefined }));
console.log("serialized states equal (none vs gameInCheck):", a.fp === b.fp ? "fingerprint same" : "FINGERPRINT DIFFERS");
