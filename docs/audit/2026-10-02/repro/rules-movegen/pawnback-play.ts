// Play one forward-unpromoted buff move per card and report what stands on the
// promotion square afterwards, plus whether that pawn has any legal move later.
import { newGame, enableDraftMode, acquireBuff, legalMoves, playMove, UNRESTRICTED_NERF, makeBuffApi, activateBuff } from "../../../../../src/engine/game";
import { moveToUCI, generateMoves } from "../../../../../src/engine/board";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { fenToBoard, boardToFen } from "../../../../../src/lib/fen";
import type { Color } from "../../../../../src/engine/types";
const CASES: [string, string, string][] = [
  ["full_planche", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", "b6b8"],
  ["living_god", "4k3/1P4P1/8/8/8/8/8/4K3 w - - 0 1", "b7c8"],
  ["titan_legion", "4k3/8/8/8/8/8/PPPPPPPP/4K3 w - - 0 1", "a2a8"],
  ["berserker", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", ""],
  ["warp_step", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", ""],
  ["reposition", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", ""],
  ["titan", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", ""],
  ["dragon_pawn", "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1", ""],
];
for (const [id, fen, want] of CASES) {
  const color = fen.split(" ")[1] as Color;
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
  enableDraftMode(g, 3, { mode: "buff" });
  g.board = fenToBoard(fen)!;
  for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null;
  acquireBuff(g, color, id, BUFF_BY_ID[id].tier);
  const def = BUFF_BY_ID[id];
  const inst = g.buffs!.players[color].buffs.find((b) => b.id === id)!;
  let act = "n/a";
  if (def.kind === "activated") {
    const picks: any[] = [];
    for (let s = 0; s < 6; s++) {
      const t = def.targets?.(inst, makeBuffApi(g, color), picks) ?? null;
      if (!t) break;
      if (t.kind === "square") { if (!t.squares.length) break; picks.push({ square: t.squares[0] }); } else { if (!t.options.length) break; picks.push({ buffIndex: t.options[0].index }); }
    }
    act = String(activateBuff(g, color, g.buffs!.players[color].buffs.indexOf(inst), picks));
    g.board.turn = color;
  }
  const ms = legalMoves(g);
  const m = ms.find((x) => (want ? moveToUCI(x) === want : x.piece === "p" && !x.promotion && (x.to >> 3) === 7));
  if (!m) { console.log(`${id}: no forward-unpromoted move found (activated=${act})`); continue; }
  playMove(g, m);
  const p = g.board.pieces[m.to];
  g.board.turn = color;
  const pawnMoves = generateMoves(g.board).filter((x) => x.from === m.to);
  console.log(`${id} (${def.kind}, activated=${act}): played ${moveToUCI(m)} via=${m.via} -> ${JSON.stringify(p)} on ${moveToUCI(m).slice(2, 4)}; its standard moves afterwards: ${pawnMoves.length}; fen ${boardToFen(g.board)}; result=${JSON.stringify(g.result)}`);
}
