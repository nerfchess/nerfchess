// Derivation of live passive visuals from synced game state.
//
// The lifecycle components (PassiveAura / PassiveSpawn / PassivePulse /
// PassiveExit) are presentational; this module is the wiring-layer bridge that
// turns the public BuffMatchState + assigned nerf rules each surface already
// holds into the normalized list PassiveLayer renders. It reads nothing the
// clients do not already have and mirrors computeFxVisual's liveness rules so
// the aura layer agrees with the motif layer.

import type { Buff, BuffInstance, BuffMatchState } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { BoardState, Color } from "@/engine/types";
import { findKing } from "@/engine/board";
import { getPassiveVisual, type CardFamily } from "./registry";
import type { Side } from "./contract";

/** One live passive to render a persistent aura for. Already visibility-filtered
 *  by the surface (a hidden opponent nerf is simply absent until revealed). */
export interface PassiveAuraEntry {
  /** React key + dedupe identity: family:cardId:color:slot. */
  key: string;
  cardId: string;
  cardFamily: CardFamily;
  /** Engine color that owns the passive. */
  color: Color;
  /** Squares the aura attaches to (0..63, rank-major). May be empty for
   *  board/clock/winCondition targets that render one ambient marker. */
  targetSquares: number[];
  /** Stable-ish activation stamp for the spawn dedupe (see PassiveLayer). */
  activationPly: string;
}

/** Contract Side from engine Color. */
export function toSide(c: Color): Side {
  return c === "w" ? "white" : "black";
}

/** Mirror of fxZones.fxRunning, kept local so the aura layer's liveness read
 *  matches the motif layer exactly without a cross-import cycle. */
function fxRunning(def: Buff, inst: BuffInstance): boolean {
  const turns = typeof inst.state.turns === "number" ? inst.state.turns : null;
  if (turns != null && turns <= 0) return false;
  const charges = typeof inst.state.charges === "number" ? inst.state.charges : null;
  if (charges != null && charges <= 0) return false;
  if (def.kind === "activated") {
    const bound = typeof inst.state.sq === "number";
    return bound || turns != null || charges != null;
  }
  if (turns != null || charges != null) return true;
  if (def.status) return def.status(inst) != null;
  return true;
}

/** King square (0..63) for a color, or null. */
function kingSquare(board: BoardState, color: Color): number | null {
  const sq = findKing(board, color);
  return sq != null && sq >= 0 ? sq : null;
}

/** Derive persistent buff-passive auras. Scoped to the QUIET passives: those
 *  that declare no CardFx motif and no piece scope, so they otherwise paint
 *  nothing on the board (the motif'd passives already wear a per-card
 *  EmpowerShine / NerfAura on their affected pieces). Each qualifier now gets
 *  its OWN registry aura at its registry target instead of the one-per-king
 *  stopgap (docs/passive-effect-audit.md R8), anchored on the owner's king as
 *  the standing presence. */
export function buffPassiveAuras(buffs: BuffMatchState | null, board: BoardState): PassiveAuraEntry[] {
  const out: PassiveAuraEntry[] = [];
  if (!buffs) return out;
  for (const color of ["w", "b"] as Color[]) {
    const list = buffs.players[color].buffs;
    for (let i = 0; i < list.length; i++) {
      const inst = list[i];
      if (!inst.id || inst.spent || inst.nullified) continue;
      const def = BUFF_BY_ID[inst.id];
      if (!def || def.kind !== "passive") continue;
      if (def.fx?.motif || def.fx?.pieces) continue; // already paints its own motif aura
      if (!getPassiveVisual(inst.id, "buff")) continue;
      if (!fxRunning(def, inst)) continue;
      const king = kingSquare(board, color);
      out.push({
        key: `buff:${inst.id}:${color}:${i}`,
        cardId: inst.id,
        cardFamily: "buff",
        color,
        targetSquares: king != null ? [king] : [],
        activationPly: `b${i}`,
      });
    }
  }
  return out;
}

/** One assigned nerf rule the surface has resolved to a persistent aura. The
 *  surface supplies the affected squares (its nerf.visual() highlight) and has
 *  already applied the section-9 visibility rules (a hidden opponent nerf is
 *  omitted until revealed). */
export interface NerfAuraInput {
  cardId: string;
  color: Color;
  /** Squares the rule affects now (nerf.visual() highlight); empty falls back
   *  to the owner's king as the standing presence. */
  squares: number[];
}

/** Derive persistent nerf-passive auras from the surface's resolved rules. */
export function nerfPassiveAuras(rules: NerfAuraInput[], board: BoardState): PassiveAuraEntry[] {
  const out: PassiveAuraEntry[] = [];
  for (const r of rules) {
    if (!getPassiveVisual(r.cardId, "nerf")) continue;
    let squares = r.squares.filter((s) => s >= 0 && s <= 63);
    if (squares.length === 0) {
      const king = kingSquare(board, r.color);
      squares = king != null ? [king] : [];
    }
    out.push({
      key: `nerf:${r.cardId}:${r.color}`,
      cardId: r.cardId,
      cardFamily: "nerf",
      color: r.color,
      targetSquares: squares,
      activationPly: "start",
    });
  }
  return out;
}
