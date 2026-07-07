// Fantasy set: NECROMANCY & UNDEATH. Death is a doorway: raise your fallen as
// thralls (reviveOne), march a fresh host of skeletons onto the field
// (placePieces), reap a diagonal with a scythe (lineSweep), wither a foe to a
// husk of stone (petrify/walnut), or bind a lich's soul so its queen rises
// again (a conditional passive modeled on the library's Understudy / Insurance
// cards). Nothing raises or petrifies a king.

import { Buff } from "./shared";
import {
  card,
  reviveOne,
  placePieces,
  lineSweep,
  myHalfZone,
  backRankZone,
  DIAG_DIRS,
  SQ,
  activated,
  addEffect,
  mySquares,
} from "./shared";

export const FANTASY_NECROMANCY: Buff[] = [
  card(
    {
      id: "undying_thrall",
      icon: "Bone",
      name: "Undying Thrall",
      description:
        "Bind a restless spirit into service: one of your captured knights or bishops claws its way back onto an empty square of your back rank, once.",
      tier: 2,
      category: "pieces",
      flavor: "It does not remember dying, only serving.",
    },
    reviveOne(["n", "b"], backRankZone),
  ),
  card(
    {
      id: "raise_dead",
      icon: "Ghost",
      name: "Raise Dead",
      description:
        "Speak the words of unmaking: one of your fallen pawns, knights, or bishops rises again on an empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "The grave was only ever a suggestion.",
    },
    reviveOne(["p", "n", "b"], myHalfZone),
  ),
  card(
    {
      id: "withering_touch",
      icon: "HeartCrack",
      name: "Withering Touch",
      description:
        "One enemy piece freezes solid for 2 of their turns, then withers to a walnut that can only shuffle one square at a time for the rest of the game. Kings cannot be targeted.",
      tier: 5,
      category: "hex",
      flavor: "Flesh remembers how to be dust.",
      fx: { motif: "jail" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to wither",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        // Two decay stages: hold it frozen for 2 turns, then leave it a heavy
        // walnut (a one-square shuffle) for the rest of the game. The long
        // walnut timer stands in for "permanent"; a walnut has no null option.
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stone" });
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 99 });
      },
    ),
  ),
  card(
    {
      id: "soul_harvest",
      icon: "Wheat",
      name: "Soul Harvest",
      description:
        "Your queen captures every enemy piece along one diagonal in a single move, once.",
      tier: 7,
      category: "attack",
      requires: ["q"],
      flavor: "One long, patient stroke.",
    },
    lineSweep("q", DIAG_DIRS, null),
  ),
  card(
    {
      id: "lich_phylactery",
      icon: "FlaskRound",
      name: "Lich Phylactery",
      description:
        "The first time your queen is captured, a new queen appears on her home square if it is empty.",
      tier: 6,
      category: "pieces",
      flavor: "You cannot kill what refuses to stay dead.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || move.captured !== "q") return;
        const home = SQ(3, api.me === "w" ? 0 : 7);
        if (!api.board.pieces[home]) api.place(home, "q", api.me);
        inst.spent = true;
      },
      status: () => "phylactery intact",
    },
  ),
  card(
    {
      id: "army_of_the_dead",
      icon: "Skull",
      name: "Army of the Dead",
      description:
        "Place three new pawns on empty squares in your half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Roll call is a very long list of names.",
    },
    placePieces(["p", "p", "p"], myHalfZone),
  ),
];
