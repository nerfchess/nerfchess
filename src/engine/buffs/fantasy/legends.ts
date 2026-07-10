// Fantasy set: HEROES & LEGENDS. Songs of named champions: a dragonslayer's
// single killing stroke (removeEnemies), the knights of the round table riding
// to your banner (grantInventory), a shieldmaiden's guard (shield), the call to
// adventure that widens your next draft (draft flags), a giant's maul swung
// down a file (lineSweep), a riddle in the dark that wastes the enemy's turn
// (skipOpponent), a valkyrie carrying your fallen champion home (reviveOne),
// the hero who holds the bridge (king_safe), a pawn with a sling (charged
// augment), a dragon broken to the saddle (pieceBound), the legendary forge
// (transformOwn), and a closing age of heroes (timedAugment). Every card
// reuses an existing primitive; kings are never removed or frozen, and
// movement grants only ever widen a move list, so nothing can soft-lock.

import { Buff } from "./shared";
import {
  card,
  activated,
  addEffect,
  augment,
  grantInventory,
  instant,
  lineSweep,
  mySquares,
  myHalfZone,
  pawnRankOk,
  pieceBound,
  removeEnemies,
  reviveOne,
  skipOpponent,
  slideMoves,
  timedAugment,
  transformOwn,
  ALL_DIRS,
  DIAG_DIRS,
  ORTHO_DIRS,
} from "./shared";

export const FANTASY_LEGENDS: Buff[] = [
  card(
    {
      id: "dragonslayer",
      name: "Dragonslayer",
      description:
        "The old blade remembers its work: name one enemy rook or queen and it is slain where it stands.",
      tier: 7,
      category: "attack",
      flavor: "Every scale has a seam. The sword knows where.",
    },
    removeEnemies(1, ["r", "q"]),
  ),
  card(
    {
      id: "round_table",
      name: "The Round Table",
      description:
        "Two sworn knights answer your call and wait in your pocket: spend a later turn to drop each onto any empty square.",
      tier: 5,
      category: "pieces",
      flavor: "No head of the table, no end to the oath.",
    },
    instant((_inst, api) => {
      grantInventory(api, "n", 2);
    }),
  ),
  card(
    {
      id: "shieldmaiden",
      name: "Shieldmaiden",
      description:
        "A shieldmaiden plants herself before one of your pieces: it cannot be captured for your opponent's next 3 turns.",
      tier: 4,
      category: "protection",
      flavor: "Her shield arm has never once come back empty.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece she guards",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 3 });
        }
      },
    ),
  ),
  card(
    {
      id: "heros_journey",
      name: "Hero's Journey",
      description:
        "The call to adventure rings out: your next draft shows three cards to pick from, and your bank offer improves by one tier.",
      tier: 4,
      category: "draft",
      flavor: "Refuse the call once, and the story sends a bigger horn.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    {
      id: "giants_maul",
      name: "Giant's Maul",
      description:
        "One of your rooks swings a maul the size of a wagon: it charges along a rank or file, smashing up to two enemy pieces on the way, and stops where the swing ends. Friendly pieces and kings block the charge.",
      tier: 6,
      category: "attack",
      requires: ["r"],
      flavor: "Subtlety is for people who cannot lift the hammer.",
    },
    lineSweep("r", ORTHO_DIRS, 2),
  ),
  card(
    {
      id: "riddle_game",
      name: "Riddle Game",
      description:
        "You pose a riddle with no good answer and the enemy camp argues all night: your opponent skips their next turn.",
      tier: 5,
      category: "tempo",
      flavor: "What have I got in my pocket?",
    },
    skipOpponent(1),
  ),
  card(
    {
      id: "valkyrie",
      name: "Valkyrie",
      description:
        "A chooser of the slain descends and carries one of your captured queens or rooks back to the field: it returns to an empty square in your half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Not this one. This one still has work to do.",
    },
    reviveOne(["q", "r"], myHalfZone),
  ),
  card(
    {
      id: "hold_the_bridge",
      name: "Hold the Bridge",
      description:
        "A lone hero plants their feet before your throne: your king cannot be captured for your opponent's next 2 turns.",
      tier: 4,
      category: "protection",
      flavor: "The bridge is narrow and so is your chance.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  card(
    {
      id: "giant_slayer",
      name: "Giant Slayer",
      description:
        "Your pawns carry slings and know the soft spots: twice this game, one of your pawns may capture an enemy piece on any square directly beside it.",
      tier: 4,
      category: "attack",
      requires: ["p"],
      flavor: "The bigger they come, the better the target.",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    augment(
      (_m, inst, api) =>
        mySquares(api.board, api.me, "p").flatMap((sq) =>
          slideMoves(api.board, sq, ALL_DIRS, inst.id, 1).filter(
            (mv) => mv.captured && pawnRankOk(mv.to),
          ),
        ),
      2,
    ),
  ),
  card(
    {
      id: "dragon_mount",
      name: "Dragon Mount",
      description:
        "One of your knights breaks a young dragon to the saddle: for the game it may also slide any distance diagonally.",
      tier: 6,
      category: "movement",
      requires: ["n"],
      flavor: "The hard part is not the taming. It is the dismount.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true },
    },
    pieceBound("n", "Choose the knight that takes the saddle", (board, sq, via) =>
      slideMoves(board, sq, DIAG_DIRS, via),
    ),
  ),
  card(
    {
      id: "legendary_forge",
      name: "Legendary Forge",
      description:
        "The forge of the old kings burns one night only: one of your knights or bishops is reforged into a rook where it stands.",
      tier: 5,
      category: "pieces",
      requires: ["n", "b"],
      flavor: "Iron remembers every shape it has ever worn.",
    },
    transformOwn(1, ["n", "b"], "r", "Choose the piece to reforge into a rook"),
  ),
  card(
    {
      id: "age_of_heroes",
      name: "Age of Heroes",
      description:
        "For your next 2 turns the old songs come true: each of your knights, bishops, and rooks may also move like a queen.",
      tier: 8,
      category: "movement",
      flavor: "For one bright hour, everyone is the chosen one.",
      fx: { motif: "rally", pieces: ["n", "b", "r"], self: true },
    },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => {
        const t = api.board.pieces[sq]!.type;
        if (t !== "n" && t !== "b" && t !== "r") return [];
        return slideMoves(api.board, sq, ALL_DIRS, inst.id);
      }),
    ),
  ),
];
