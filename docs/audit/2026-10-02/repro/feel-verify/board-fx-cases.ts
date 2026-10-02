// Runs Board.tsx's own diff functions (extracted verbatim by extract-board-fx.mjs)
// over hand-built before/after positions for the core chess moves, and prints
// what the board would animate: which squares slide (and how far, which the
// duration ignores), and which one-shot flourishes fire.
import { computeAnims, computeBoardFx } from "./boardFx.extracted.ts";
const SQ = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
type P = { type: string; color: "w" | "b" } | null;
function board(spec: Record<string, string>): P[] {
  const b: P[] = Array(64).fill(null);
  for (const [sq, p] of Object.entries(spec)) b[SQ(sq)] = { type: p[1], color: p[0] as "w" | "b" };
  return b;
}
const base = { e1: "wk", h1: "wr", e8: "bk", a8: "br" };
const cases: [string, Record<string, string>, Record<string, string>, string | null, string | null][] = [
  // name, before, after, capturedSquare, dragDropSquare
  ["quiet move Nb1-c3 (1 cell-ish)", { ...base, b1: "wn" }, { ...base, c3: "wn" }, null, null],
  ["long move Qa1-h8-diag (7 cells)", { e1: "wk", e8: "bk", a1: "wq" }, { e1: "wk", e8: "bk", h8: "wq" }, null, null],
  ["capture Bc4xf7", { ...base, c4: "wb", f7: "bp" }, { ...base, f7: "wb" }, "f7", null],
  ["castle O-O", { ...base }, { e8: "bk", a8: "br", g1: "wk", f1: "wr" }, null, null],
  ["quiet promotion e7-e8=Q (click)", { e1: "wk", a8: "bk", e7: "wp" }, { e1: "wk", a8: "bk", e8: "wq" }, null, null],
  ["capture promotion e7xd8=Q (click)", { e1: "wk", a8: "bk", e7: "wp", d8: "br" }, { e1: "wk", a8: "bk", d8: "wq" }, "d8", null],
  ["quiet promotion e7-e8=Q (drag)", { e1: "wk", a8: "bk", e7: "wp" }, { e1: "wk", a8: "bk", e8: "wq" }, null, "e8"],
  ["capture promotion e7xd8=Q (drag)", { e1: "wk", a8: "bk", e7: "wp", d8: "br" }, { e1: "wk", a8: "bk", d8: "wq" }, "d8", "d8"],
];
const name = (sq: number) => String.fromCharCode(97 + (sq & 7)) + ((sq >> 3) + 1);
for (const [label, a, b, cap, drop] of cases) {
  const prev = board(a), next = board(b);
  const skip = drop ? SQ(drop) : null;
  const { anims, movedFrom } = computeAnims(prev as any, next as any, "w", skip as any);
  const fx = computeBoardFx(prev as any, next as any, anims, movedFrom, skip as any, cap ? (SQ(cap) as any) : null, { current: 0 }, null, "w", null);
  const slides = [...anims].map(([sq, an]) => `${name(sq)} from ${Math.hypot(an.dxCells, an.dyCells).toFixed(1)} cells`).join(", ") || "none";
  const flourishes = [...fx].map(([sq, f]) => `${f.kind}${f.crown ? "+crown" : ""}@${name(sq)}`).join(", ") || "none";
  console.log(`${label.padEnd(38)} slides: ${slides.padEnd(40)} flourishes: ${flourishes}`);
}
