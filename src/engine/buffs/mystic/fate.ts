// Mystic set: FATE & PROPHECY. The cards that read the cards: an oracle's eye
// on the enemy draft (info flag), snipped threads that steal a turn
// (skipOpponent), stars fixing your next draft's tier (forceTier), the Tower
// toppling their next draft outright (blockedDrafts), the Death arcana claiming
// one piece (removeEnemies), and the Grand Conjunction, a once-an-age apex
// alignment (freezeAllEnemies + shieldArmy) flagged special so it never enters
// a normal draft. Every card reuses an existing primitive; kings are never
// removed or frozen, and nothing here can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  activated,
  addEffect,
  instant,
  mySquares,
} from "./shared";

export const MYSTIC_FATE: Buff[] = [
  card(
    {
      id: "oracles_eye",
      name: "Oracle's Eye",
      description:
        "The oracle inhales the vapors and names a better price: your bank offer improves by one tier, unless your opponent's next draft is already skipped, in which case the oracle offers nothing.",
      tier: 2,
      category: "draft",
      boon: true,
      flavor: "The future is blurry. The price list is not.",
    },
    // Balance pass: the bank improvement never combines with a skipped enemy
    // draft. If the opponent's next draft is already blocked, it offers nothing.
    instant((_inst, api) => {
      if ((api.theirs.flags.blockedDrafts ?? 0) > 0) return;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    {
      id: "threads_of_fate",
      name: "Threads of Fate",
      description:
        "The loom repays every cut thread: for your opponent's next 3 captures, you weave an extra move into your reply.",
      tier: 6,
      category: "tempo",
      flavor: "The Fates do not take requests. You did not ask.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured) return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
        api.bs.extraMoves[api.me] += 1;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} of their captures left`,
    },
  ),
  card(
    {
      id: "favorable_stars",
      name: "Favorable Stars",
      description:
        "You cast your chart and the houses agree: your next draft is fated to offer tier 6 cards.",
      tier: 6,
      category: "draft",
      flavor: "Born under a good sign, drafting under a better one.",
    },
    // Overhaul balance pass: forcing tier 5 was strictly dominated by High
    // Roll (tier 4, also forces tier 5), so the stars point one house higher:
    // a guaranteed tier-6 offer, priced at tier 5.
    instant((_inst, api) => {
      api.mine.flags.forceTier = 6;
    }),
  ),
  card(
    {
      id: "the_tower",
      name: "The Tower",
      description:
        "You deal your opponent the worst card in the deck: name one enemy rook. After your opponent's next move, it crumbles to rubble wherever it then stands.",
      tier: 4,
      category: "attack",
      flavor: "Upright: ruin. Reversed: also ruin.",
    },
    // Balance pass: the tower does not fall at once. Naming a rook arms the
    // ruin; it crumbles only after the opponent has replied once.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.armed) return null;
        if (picks.length > 0) return null;
        return {
          kind: "square",
          label: "Name the enemy rook",
          squares: mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type === "r",
          ),
        };
      },
      effect: (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.armed) return;
        inst.state.sq = sq;
        inst.state.armed = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed) return;
        let sq = inst.state.sq as number | undefined;
        // Already captured before the tower falls: nothing left to topple.
        if (sq != null && move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        // The rook may flee; the ruin follows it wherever it runs.
        if (sq != null && move.from === sq) {
          sq = move.to;
          inst.state.sq = sq;
        }
        if (move.color !== api.opp) return;
        if (sq != null) {
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type === "r") api.removePiece(sq);
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.armed
          ? "the tower falls after their next move"
          : "activate to name a rook",
    },
  ),
  card(
    {
      id: "death_arcana",
      name: "The Death Arcana",
      description:
        "The thirteenth card turns face up and names its mark: choose one enemy piece except a king. It is doomed: after 3 of their turns it dies, wherever it has run to. Only being captured first spares it the mark.",
      tier: 6,
      category: "attack",
      flavor: "It does not mean change this time. It means exactly what it shows.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece the arcana marks",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 3, then: "remove" });
      },
    ),
  ),
  card(
    {
      id: "grand_conjunction",
      name: "Grand Conjunction",
      description:
        "Every sign, sphere, and spirit aligns at once: all enemy pieces except the king are frozen for 2 of their turns, save their single most valuable piece, which slips free; and none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 9,
      special: true,
      category: "tempo",
      flavor: "The astronomers wept. The astrologers said told you so.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    // freezeAllEnemies(2) and shieldArmy(2) fused into one instant, exactly
    // like Aegis of the Ages fuses an army shield with king_safe.
    instant((_inst, api) => {
      const enemies = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      // Balance pass: one enemy piece slips the freeze, the most valuable,
      // chosen deterministically (highest value, lowest square breaks ties) so
      // every replica spares the same square.
      const VALUE: Record<string, number> = { q: 5, r: 4, b: 3, n: 3, p: 1 };
      let spared: number | null = null;
      for (const sq of enemies) {
        if (spared == null) {
          spared = sq;
        } else if (
          (VALUE[api.board.pieces[sq]!.type] ?? 0) >
          (VALUE[api.board.pieces[spared]!.type] ?? 0)
        ) {
          spared = sq;
        }
      }
      for (const sq of enemies) {
        if (sq === spared) continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
    }),
  ),
];
