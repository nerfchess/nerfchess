// Sanity probe of src/lib/premoves.ts (no test exists for it in scripts/).
// White premoves while it is Black's turn after 1.e4.
import { newGame, legalMoves, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { premoveOptionsFor, premoveSelfChecks, previewMovesFor } from "../../../../../src/lib/premoves";
import { cloneBoard } from "../../../../../src/engine/board";
const sqName = (s: number) => "abcdefgh"[s % 8] + (Math.floor(s / 8) + 1);
let g = newGame(UNRESTRICTED_NERF as any, UNRESTRICTED_NERF as any, 1);
const e4 = legalMoves(g).find((m) => sqName(m.from) === "e2" && sqName(m.to) === "e4")!;
g = playMove(g, e4);
console.log("turn after 1.e4:", g.board.turn);
const vb = cloneBoard(g.board); vb.turn = "w"; vb.epTarget = null;
const t0 = performance.now();
const opts = premoveOptionsFor(vb, "w", null, null, null, g);
const t1 = performance.now();
const uniq = new Set(opts.map((m) => `${sqName(m.from)}${sqName(m.to)}${m.promotion ?? ""}`));
console.log(`premove options: ${opts.length} raw, ${uniq.size} unique, ${(t1 - t0).toFixed(1)}ms`);
console.log("has Qh5:", uniq.has("d1h5"), " has Nf3:", uniq.has("g1f3"), " has speculative exd5:", uniq.has("e4d5"), " has friendly-target Bxe2? (f1e2 recapture square):", uniq.has("f1e2"));
console.log("duplicates in returned list (filtered base + extras overlap):", opts.length - uniq.size);
const preview = previewMovesFor(g, "w");
console.log("previewMovesFor(w) while black to move:", preview.length);
// premoveSelfChecks: white king walk into nothing (should be false)
const kMove = opts.find((m) => sqName(m.from) === "e1" && sqName(m.to) === "e2");
console.log("Ke2 self-check:", kMove ? premoveSelfChecks(g, kMove, "w") : "n/a");
