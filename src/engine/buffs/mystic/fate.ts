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
  removeEnemies,
} from "./shared";

export const MYSTIC_FATE: Buff[] = [
  card(
    {
      id: "oracles_eye",
      name: "Oracle's Eye",
      description:
        "The oracle inhales the vapors and names a better price: your bank offer improves by one tier.",
      tier: 2,
      category: "draft",
      boon: true,
      flavor: "The future is blurry. The price list is not.",
    },
    instant((_inst, api) => {
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    {
      id: "threads_of_fate",
      name: "Threads of Fate",
      description:
        "The loom repays every cut thread: for your opponent's next 3 captures, you weave an extra move into your reply.",
      tier: 5,
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
      tier: 5,
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
        "You deal your opponent the worst card in the deck: name one enemy rook and it crumbles to rubble where it stands.",
      tier: 4,
      category: "attack",
      flavor: "Upright: ruin. Reversed: also ruin.",
    },
    removeEnemies(1, ["r"]),
  ),
  card(
    {
      id: "death_arcana",
      name: "The Death Arcana",
      description:
        "The thirteenth card turns face up and names its mark: choose one enemy piece except a king. It is doomed: after 4 of their turns it dies, wherever it has run to. Only being captured first spares it the mark.",
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
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 4, then: "remove" });
      },
    ),
  ),
  card(
    {
      id: "grand_conjunction",
      name: "Grand Conjunction",
      description:
        "Every sign, sphere, and spirit aligns at once: all enemy pieces except the king are frozen for 2 of their turns, and none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 9,
      special: true,
      category: "tempo",
      flavor: "The astronomers wept. The astrologers said told you so.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    // freezeAllEnemies(2) and shieldArmy(2) fused into one instant, exactly
    // like Aegis of the Ages fuses an army shield with king_safe.
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
    }),
  ),
];
