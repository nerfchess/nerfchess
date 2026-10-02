// Extract computeAnims + computeBoardFx VERBATIM from Board.tsx (read-only) into
// a scratch module, with stubs for the signature path (unused when no card id).
import fs from "node:fs";
const src = fs.readFileSync("./src/components/Board.tsx", "utf8").split("\n");
const slice = (a, b) => src.slice(a - 1, b).join("\n");
const out = `
import { FILE, RANK, type BoardState, type Color, type Square } from "../../../../../src/engine/types.ts";
type PieceAnim = { dxCells: number; dyCells: number };
interface BoardFx { kind: "morph" | "summon" | "detonate"; crown?: boolean; key: number; sig?: string; sigOrder?: number; sigRole?: "lead" | "target"; sigGeo?: unknown }
const resolveSignature = (_id: string): any => undefined;
function orderSignature(..._a: any[]): any { return { targets: [], leadSq: null, legs: [], casterColor: null }; }
export ${slice(948, 995)}
export ${slice(1288, 1451)}
`;
fs.writeFileSync(process.argv[2], out);
