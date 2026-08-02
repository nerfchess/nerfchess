// --- "Against you" transparency rows -----------------------------------------
// Every constraint currently limiting YOUR play, with its remaining duration,
// derived from public state only: board effects whose owner/against side is
// you (frozen or walnutted pieces, barred squares, king-only and pawn-halt
// shackles, pending turn skips) plus the opponent's face-up timed curses
// (identity already public: they appear in the plays ledger; def.status
// supplies the "N turns left" line). Answers "if I have blinkered bishops it
// needs to show them" from the affected side.
//
// Every row now also carries the glossary slug for its effect kind, so the
// dock strip can explain any weird status in one plain sentence on tap.

import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { NerfGame } from "@/engine/game";
import type { Color } from "@/engine/types";
import type { Tier } from "@/engine/nerf";
import { EFFECT_KIND_SLUG, FREEZE_SKIN_SLUG } from "@/lib/glossary";
import { sqName, turnsLeft } from "./bits";

export interface AgainstRow {
  key: string;
  name: string;
  detail: string;
  left: string;
  /** True when the effect is time-limited (a finite countdown or a pending
   * skip), so the row carries the small "temporary" clock. Permanent effects
   * ("until it ends") do not. */
  temporary: boolean;
  /** The source card's difficulty tier, when the constraint is a face-up
   * opponent curse. Board-derived constraints (freeze, barred, halted pawns...)
   * keep no tier: the serialized effect record does not retain which card and
   * tier produced them, so those rows stay on the neutral alert accent. */
  tier?: Tier;
  /** Glossary anchor for the plain-language explanation of this effect kind
   * (skin-aware for freezes). Face-up curses carry their own card text and no
   * slug. */
  slug?: string;
}

// Exported: the game surfaces also feed these rows to the board-wide splash
// (BoardSplash), so a new constraint lands with one big announcement plus its
// permanent row here in the dock.
export function againstYouRows(game: NerfGame, myColor: Color): AgainstRow[] {
  const bs = game.buffs;
  if (!bs || game.result) return [];
  const rows: AgainstRow[] = [];
  bs.effects.forEach((e, idx) => {
    if (e.turns != null && e.turns <= 0) return;
    if (e.kind === "freeze" && e.owner === myColor) {
      rows.push({
        key: `fx-freeze-${e.sq}-${idx}`,
        name: "Frozen piece",
        detail: `Your piece on ${sqName(e.sq)} cannot move.`,
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: e.skin ? FREEZE_SKIN_SLUG[e.skin] : EFFECT_KIND_SLUG.freeze,
      });
    } else if (e.kind === "walnut" && e.owner === myColor) {
      rows.push({
        key: `fx-walnut-${e.sq}-${idx}`,
        name: "Walnut hex",
        detail: `Your piece on ${sqName(e.sq)} is a walnut and cannot move.`,
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: EFFECT_KIND_SLUG.walnut,
      });
    } else if (e.kind === "barred" && e.against === myColor) {
      rows.push({
        key: `fx-barred-${idx}`,
        name: "Barred squares",
        detail: `You cannot move onto ${e.squares.map(sqName).join(", ")}.`,
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: EFFECT_KIND_SLUG.barred,
      });
    } else if (e.kind === "no_pawn_advance" && e.against === myColor) {
      rows.push({
        key: `fx-pawns-${idx}`,
        name: "Pawns halted",
        detail: "Your pawns cannot advance.",
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: EFFECT_KIND_SLUG.no_pawn_advance,
      });
    } else if (e.kind === "king_only" && e.against === myColor) {
      rows.push({
        key: `fx-kingonly-${idx}`,
        name: "King only",
        detail: "Only your king may move.",
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: EFFECT_KIND_SLUG.king_only,
      });
    } else if (e.kind === "short_leash" && e.owner === myColor) {
      rows.push({
        key: `fx-leash-${idx}`,
        name: "Leashed",
        detail: "All of your pieces may only step one square.",
        left: turnsLeft(e.turns),
        temporary: e.turns != null,
        slug: EFFECT_KIND_SLUG.short_leash,
      });
    }
  });
  const skips = bs.skips[myColor];
  if (skips > 0) {
    rows.push({
      key: "fx-skips",
      name: skips === 1 ? "Turn skip" : "Turn skips",
      detail: skips === 1 ? "Your next turn is skipped." : `Your next ${skips} turns are skipped.`,
      left: "Pending",
      // A pending skip clears once it is consumed, so it is time-limited too.
      temporary: true,
      slug: "skip",
    });
  }
  // Opponent-held curses running against you: only face-up cards (masked
  // instances have no def, so nothing hidden can surface here) that expose a
  // live status line. Category "hex" is the curse pool; everything else in
  // their hand either targets themselves or already shows as a board effect.
  const oppColor: Color = myColor === "w" ? "b" : "w";
  bs.players[oppColor].buffs.forEach((inst, i) => {
    if (inst.spent || inst.nullified) return;
    const def = BUFF_BY_ID[inst.id];
    if (!def || def.category !== "hex") return;
    const status = def.status?.(inst);
    if (!status) return;
    // Face-up curse: its status line reads "N turns left" while it is timed,
    // so a turns mention is a reliable "temporary" tell; a curse that runs for
    // the rest of the game says no such thing and stays permanent.
    rows.push({
      key: `hex-${inst.id}-${i}`,
      name: def.name,
      detail: def.description,
      left: status,
      tier: inst.tier,
      temporary: /turn/i.test(status),
    });
  });
  return rows;
}
