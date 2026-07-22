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
  FILE,
  RANK,
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
      tier: 5,
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
        "The maul comes down once: crush one enemy knight, bishop, or rook, and the shock leaves every enemy piece beside it (kings aside) frozen for 1 of their turns.",
      tier: 7,
      category: "attack",
      flavor: "Subtlety is for people who cannot lift the hammer.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the maul comes down",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const p = api.board.pieces[c];
        if (!p || p.color !== api.opp || p.type === "k" || p.type === "q" || p.type === "p") return;
        api.removePiece(c);
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (f < 0 || f > 7 || r < 0 || r > 7) continue;
          const sq = f + r * 8;
          const t = api.board.pieces[sq];
          if (t && t.color === api.opp && t.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1 });
          }
        }
      },
    ),
  ),
  card(
    {
      id: "riddle_game",
      name: "Riddle Game",
      description:
        "You wager the deck itself on a dangerous game: your opponent's next two drafts are skipped, but so is your own next one.",
      tier: 5,
      category: "draft",
      flavor: "What have I got in my pocket?",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 2;
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "valkyrie",
      name: "Valkyrie",
      description:
        "A chooser of the slain rides beside your army: for your opponent's next 3 turns, any knight, bishop, or rook of yours they capture is carried home to your pocket instead of being lost for good. Drop it back onto an empty square on a later turn.",
      tier: 6,
      category: "pieces",
      flavor: "Not this one. This one still has work to do.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (
          move.captured === "n" ||
          move.captured === "b" ||
          move.captured === "r"
        ) {
          grantInventory(api, move.captured, 1);
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "hold_the_bridge",
      name: "Hold the Bridge",
      description:
        "One hero plants their feet: choose one of your knights, bishops, or rooks. It cannot be captured for your opponent's next 3 turns, but it stands its ground and cannot move for those turns either.",
      tier: 4,
      category: "protection",
      requires: ["n", "b", "r"],
      flavor: "The bridge is narrow and so is your chance.",
      fx: { motif: "ward", pieces: ["n", "b", "r"], self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece that holds the bridge",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 3 });
      },
    ),
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
        "The forge mends what war broke: one of your captured knights or bishops is reforged and returns to your pocket. Spend a later turn to drop it onto any empty square.",
      tier: 4,
      category: "pieces",
      flavor: "Iron remembers every shape it has ever worn.",
    },
    {
      ...activated(
        (_inst, api, picks) => {
          if (picks.length > 0) return null;
          const type = (["n", "b"] as const).find(
            (t) => (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0,
          );
          // The single pick is a confirmation beat at the throne: the forge
          // only lights when there is something to reforge.
          return {
            kind: "square",
            label: "Light the forge (choose your king)",
            squares: type == null ? [] : mySquares(api.board, api.me, "k"),
          };
        },
        (_inst, api, picks) => {
          if (picks[0]?.square == null) return;
          const type = (["n", "b"] as const).find(
            (t) => (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0,
          );
          if (type == null) return;
          grantInventory(api, type, 1);
          api.mine.revived[type] = (api.mine.revived[type] ?? 0) + 1;
        },
      ),
    },
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
