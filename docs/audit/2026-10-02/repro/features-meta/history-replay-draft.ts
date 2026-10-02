// Does /history/[id]'s replay (replayUci + boardAtPly from gameReview) show the real
// board for a draft (Buff mode) game? The history entry stores only the UCI list.
import { UNRESTRICTED_NERF, acquireBuff, activateBuff, enableDraftMode, legalMoves, newGame, playMove } from "../../../../../src/engine/game";
import { moveFromUCI, moveToUCI } from "../../../../../src/engine/board";
import { replayUci, boardAtPly } from "../../../../../src/lib/gameReview";
const sq = (n: string) => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);
const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 8642);
enableDraftMode(g, 8642, { mode: "buff" });
const mv = (u: string) => { const m = legalMoves(g).find(x => moveToUCI(x) === u) ?? moveFromUCI(g.board, u); if (!m) throw new Error("bad " + u); playMove(g, m); };
mv("e2e4"); mv("e7e5"); mv("d2d3"); mv("d7d6");
acquireBuff(g, "w", "detonate", 4);
const ok = activateBuff(g, "w", g.buffs!.players.w.buffs.length - 1, [{ square: sq("e5") }]);
mv("b1c3"); mv("g8f6");
const uci = g.board.history.map(moveToUCI); // exactly what recordCompletedGame stores
const { history } = replayUci(uci);
const shown = boardAtPly(history, history.length);
const diff: string[] = [];
for (let i = 0; i < 64; i++) { const a = JSON.stringify(g.board.pieces[i] ?? null), b = JSON.stringify(shown.pieces[i] ?? null); if (a !== b) diff.push(`${String.fromCharCode(97 + (i % 8))}${1 + (i >> 3)} live=${a} replay=${b}`); }
console.log("detonate fired:", ok, "| plies:", uci.length, "| squares that differ live vs /history replay:", diff.length);
for (const d of diff) console.log("  " + d);
