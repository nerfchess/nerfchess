// Card Laboratory data helpers: card kind derivation, fuzzy search, board
// presets, and the audit-flag lookup (docs/card-audit.json, read-only).

import { isBoon, type Buff } from "../../../engine/buff";
import { NERF_REVEAL } from "../../../engine/draft";
import type { BoardState, PieceType, Color } from "../../../engine/types";
import { parseSquare } from "../../../engine/types";
import cardAudit from "../../../../docs/card-audit.json";

// --- Card kinds ------------------------------------------------------------

export type LabKind = "buff" | "hex" | "boon" | "item" | "apex" | "opener" | "nerf-mode-only";

export const LAB_KINDS: LabKind[] = [
  "buff",
  "hex",
  "boon",
  "item",
  "apex",
  "opener",
  "nerf-mode-only",
];

/** Primary kind of a card, mirroring the audit's buckets. */
export function cardKind(b: Buff): Exclude<LabKind, "nerf-mode-only"> {
  if (b.special || b.tier >= 9) return "apex";
  if (b.opener) return "opener";
  if (b.category === "hex") return "hex";
  if (isBoon(b)) return "boon";
  if (b.category === "item") return "item";
  return "buff";
}

/** True for cards that only ever appear in nerf mode's draft pool: hexes,
 * nerf-relief boons, and the dead-in-buff-mode nerf-reveal cards. */
export function nerfModeOnly(b: Buff): boolean {
  return b.category === "hex" || b.category === "nerf" || NERF_REVEAL.has(b.id);
}

export function matchesKind(b: Buff, kind: LabKind): boolean {
  if (kind === "nerf-mode-only") return nerfModeOnly(b);
  return cardKind(b) === kind;
}

// --- Fuzzy search ----------------------------------------------------------

/** Subsequence fuzzy match: every query character appears in order. */
export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (q.length === 0) return true;
  const t = text.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

// --- Audit flags (docs/card-audit.json) ------------------------------------

interface AuditRow {
  id: string;
  flags: string[];
}

const AUDIT_FLAGS: Map<string, string[]> = new Map(
  ((cardAudit as { rows: AuditRow[] }).rows ?? []).map((r) => [r.id, r.flags ?? []]),
);

export function auditFlags(id: string): string[] {
  return AUDIT_FLAGS.get(id) ?? [];
}

// --- Board presets ----------------------------------------------------------

export interface LabPreset {
  id: string;
  name: string;
  /** Rewrites board.pieces in place. Null = keep the standard opening. */
  place: Record<string, { type: PieceType; color: Color }> | null;
}

function pieces(
  white: Record<string, PieceType>,
  black: Record<string, PieceType>,
): Record<string, { type: PieceType; color: Color }> {
  const out: Record<string, { type: PieceType; color: Color }> = {};
  for (const [sq, type] of Object.entries(white)) out[sq] = { type, color: "w" };
  for (const [sq, type] of Object.entries(black)) out[sq] = { type, color: "b" };
  return out;
}

export const LAB_PRESETS: LabPreset[] = [
  { id: "opening", name: "Opening", place: null },
  {
    id: "sparse-midgame",
    name: "Sparse midgame",
    place: pieces(
      { g1: "k", d1: "r", f3: "n", a2: "p", f2: "p", g2: "p", h2: "p" },
      { g8: "k", d8: "r", c6: "n", a7: "p", f7: "p", g7: "p", h7: "p" },
    ),
  },
  {
    id: "bare-kings",
    name: "Bare kings endgame",
    place: pieces({ e1: "k" }, { e8: "k" }),
  },
  {
    id: "promotion-race",
    name: "Promotion race",
    place: pieces(
      { b1: "k", g7: "p", h6: "p" },
      { g8: "k", b2: "p", a3: "p" },
    ),
  },
];

/** Apply a preset by writing board.pieces directly (lab-only surgery). */
export function applyPreset(board: BoardState, preset: LabPreset): void {
  if (!preset.place) return;
  board.pieces = Array<null>(64).fill(null);
  for (const [name, p] of Object.entries(preset.place)) {
    board.pieces[parseSquare(name)] = { type: p.type, color: p.color };
  }
  board.turn = "w";
  board.castling = { wk: false, wq: false, bk: false, bq: false };
  board.epTarget = null;
  board.halfmove = 0;
}
