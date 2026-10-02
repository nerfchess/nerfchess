// Compare the engine's no-card variant perft (raw generateMoves, king capture
// terminal) against the independent reference generator. On mismatch, divide
// recursively down to the first differing move.
// usage: tsx compare.ts <variant|legal> <depth> [name|all]
import { POSITIONS, perftVariant, perftLegal, divide as edivide } from "./perft";
import { parseFen, perft as rperft, divide as rdivide, gen, make, uci } from "./ref";
import { fenToBoard } from "../../../../../src/lib/fen";
import { generateMoves, makeMove, moveToUCI } from "../../../../../src/engine/board";
import { legalOf } from "./perft";
import type { BoardState } from "../../../../../src/engine/types";

const mode = (process.argv[2] ?? "variant") as "variant" | "legal";
const depth = Number(process.argv[3] ?? 3);
const which = process.argv[4] ?? "all";

function drill(eb: BoardState, rp: ReturnType<typeof parseFen>, d: number, path: string[]) {
  const em = edivide(eb, d, mode);
  const rm = rdivide(rp, d, mode);
  const keys = new Set([...em.keys(), ...rm.keys()]);
  for (const k of keys) {
    if (em.get(k) !== rm.get(k)) {
      console.log(`  at ${path.join(" ") || "(root)"} move ${k}: engine=${em.get(k)} ref=${rm.get(k)}`);
      if (d > 1 && em.has(k) && rm.has(k)) {
        const emv = (mode === "legal" ? legalOf(eb) : generateMoves(eb)).find((m) => moveToUCI(m) === k)!;
        const rmv = gen(rp, mode).find((m) => uci(m) === k)!;
        drill(makeMove(eb, emv), make(rp, rmv), d - 1, [...path, k]);
      }
      return;
    }
  }
}

for (const p of POSITIONS) {
  if (which !== "all" && which !== p.name) continue;
  const eb = fenToBoard(p.fen)!;
  const rp = parseFen(p.fen);
  for (let d = 1; d <= depth; d++) {
    const t0 = performance.now();
    const e = mode === "variant" ? perftVariant(eb, d) : perftLegal(eb, d);
    const t1 = performance.now();
    const r = rperft(rp, d, mode);
    const t2 = performance.now();
    const pub = mode === "legal" ? p.expected[d - 1] : undefined;
    console.log(`${mode} ${p.name} d${d}: engine=${e} ref=${r}${pub !== undefined ? ` published=${pub}` : ""} ${e === r ? "AGREE" : "DIFFER"} (engine ${(t1 - t0).toFixed(0)}ms, ${(e / ((t1 - t0) / 1000)).toFixed(0)} n/s; ref ${(t2 - t1).toFixed(0)}ms)`);
    if (e !== r) { drill(eb, rp, d, []); break; }
  }
}
