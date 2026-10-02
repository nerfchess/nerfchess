// Detail every buff-granted pawn move that lands on rank 1/8 without promotion:
// forward (onto the promotion rank) vs backward (onto its own back rank), and
// whether a promoting twin with the same from/to exists in the same list.
import { newGame, enableDraftMode, acquireBuff, legalMoves, UNRESTRICTED_NERF, makeBuffApi, activateBuff } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { Color } from "../../../../../src/engine/types";

const FENS: Record<string, string> = {
  // pawns one step from promotion, promotion squares EMPTY (pure pushes) and occupied
  promoEmptyW: "4k3/1P4P1/8/8/8/8/8/4K3 w - - 0 1",
  promoEmptyB: "4k3/8/8/8/8/8/1p4p1/4K3 b - - 0 1",
  promoW: "r1n1k2r/1P4P1/8/3p4/8/8/1p4p1/R1N1K2R w KQkq - 0 1",
  promoB: "r1n1k2r/1P4P1/8/3p4/8/8/1p4p1/R1N1K2R b KQkq - 0 1",
  twoAwayW: "4k3/8/1P4P1/8/8/8/8/4K3 w - - 0 1",
  twoAwayB: "4k3/8/8/8/8/1p4p1/8/4K3 b - - 0 1",
  homeW: "4k3/8/8/8/8/8/PPPPPPPP/4K3 w - - 0 1",
  homeB: "4k3/pppppppp/8/8/8/8/8/4K3 b - - 0 1",
};
const rows: string[] = [];
for (const def of ALL_BUFFS.filter((d) => d.augmentMoves)) {
  for (const [name, fen] of Object.entries(FENS)) {
    const color = fen.split(" ")[1] as Color;
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 3);
    enableDraftMode(g, 3, { mode: "buff" });
    g.board = fenToBoard(fen)!;
    for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = null;
    acquireBuff(g, color, def.id, def.tier);
    const inst = g.buffs!.players[color].buffs.find((b) => b.id === def.id);
    if (!inst) continue;
    if (def.kind === "activated") {
      const picks: any[] = [];
      for (let s = 0; s < 6; s++) {
        const t = def.targets?.(inst, makeBuffApi(g, color), picks) ?? null;
        if (!t) break;
        if (t.kind === "square") { if (!t.squares.length) break; picks.push({ square: t.squares[0] }); }
        else { if (!t.options.length) break; picks.push({ buffIndex: t.options[0].index }); }
      }
      try { activateBuff(g, color, g.buffs!.players[color].buffs.indexOf(inst), picks); } catch {}
      g.board.turn = color;
    }
    if (g.result) continue;
    const ms = legalMoves(g);
    for (const m of ms) {
      if (m.piece !== "p" || m.drop || m.promotion) continue;
      const r = m.to >> 3;
      if (r !== 0 && r !== 7) continue;
      const forward = (color === "w" && r === 7) || (color === "b" && r === 0);
      const twin = ms.some((x) => x !== m && x.from === m.from && x.to === m.to && x.promotion);
      rows.push(`${def.id.padEnd(28)} ${name.padEnd(12)} ${moveToUCI(m).padEnd(6)} ${forward ? "FORWARD-unpromoted" : "backward-to-own-rank"} ${m.captured ? "capture:" + m.captured : "quiet"} ${twin ? "has-promoting-twin" : "NO-promoting-twin"} via=${m.via}`);
    }
  }
}
const uniq = [...new Set(rows)];
console.log(uniq.filter((r) => r.includes("FORWARD")).join("\n"));
console.log("---- backward:");
const back = new Map<string, number>();
for (const r of uniq.filter((r) => r.includes("backward"))) back.set(r.split(" ")[0], (back.get(r.split(" ")[0]) ?? 0) + 1);
console.log([...back.keys()].join(", "));
