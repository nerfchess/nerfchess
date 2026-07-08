// Fantasy set: DRAGONS & BEASTS. Great monsters that either tear a line through
// the enemy (lineSweep, the same primitive as Cavalry Charge), turn a foe to
// stone (petrify/walnut), carry your own pieces across the board (relocate), or
// arrive as reinforcements (placePieces / summonTemp). Nothing here touches a
// king's move legality in a way that could soft-lock; the petrify helpers never
// target a king.

import { Buff } from "./shared";
import {
  card,
  lineSweep,
  relocateAnywhere,
  summonTemp,
  grantInventory,
  instant,
  myHalfZone,
  mySquares,
  addEffect,
  turnsLeft,
  ORTHO_DIRS,
  ALL_DIRS,
  type Square,
} from "./shared";

export const FANTASY_BEASTS: Buff[] = [
  card(
    {
      id: "dragons_breath",
      icon: "FlameKindling",
      name: "Dragon's Breath",
      description:
        "One rook captures every enemy piece in a straight line in a single move, once.",
      tier: 5,
      category: "attack",
      requires: ["r"],
      flavor: "Everything in the corridor turns to ash.",
    },
    lineSweep("r", ORTHO_DIRS, null),
  ),
  card(
    {
      id: "wyverns_dive",
      icon: "Feather",
      name: "Wyvern's Dive",
      description:
        "A wyvern folds its wings and dives: one of your knights streaks in a straight line, snatches the first enemy piece it reaches, and lands just beyond, once.",
      tier: 4,
      category: "attack",
      requires: ["n"],
      flavor: "The shriek comes a heartbeat before the talons.",
    },
    lineSweep("n", ALL_DIRS, 1),
  ),
  card(
    {
      id: "basilisk_stare",
      icon: "Eye",
      name: "Basilisk's Gaze",
      description:
        "Turn one enemy piece to stone: it becomes a walnut that can only shuffle one square at a time for 3 of their turns, and while petrified it cannot capture. Kings cannot be targeted.",
      tier: 3,
      category: "hex",
      flavor: "Do not, under any circumstance, look back.",
      fx: { motif: "jail" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to turn to stone",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
      },
      // While petrified the stone piece may still take its one-square shuffle,
      // but never as a capture: strip its captures from the cursed side's moves.
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => !(m.from === sq && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // The petrified piece was captured or overrun: the gaze ends.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        // Follow it if its owner manages to shuffle it one square.
        if (move.from === sq) inst.state.sq = move.to;
        // Tick on the petrified side's own turns, in step with the walnut.
        if (move.color !== api.opp) return;
        const left = turnsLeft(inst) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to petrify"
          : `petrified, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  card(
    {
      id: "serpent_brood",
      icon: "Worm",
      name: "Serpent Brood",
      description:
        "Venomous stone serpents coil around the enemy clergy: every one of your opponent's bishops turns to a walnut for 3 of their turns, and the venom lingers so no enemy bishop may capture for the rest of the game.",
      tier: 4,
      category: "hex",
      flavor: "Marble scales, and not a single blink.",
      fx: { motif: "muzzle", pieces: ["b"] },
    },
    {
      kind: "passive",
      // Petrify every enemy bishop for 3 turns, once, on the draft.
      init: (_inst, api) => {
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "b") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
          }
        }
      },
      // The lingering venom: enemy bishops can never capture again.
      filterOpponentMoves: (moves) => {
        const kept = moves.filter((m) => !(m.piece === "b" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      status: () => "enemy bishops cannot capture",
    },
  ),
  card(
    {
      id: "griffon_rider",
      icon: "Bird",
      name: "Griffon Rider",
      description:
        "Move one of your pieces to any empty square, once.",
      tier: 5,
      category: "movement",
      flavor: "Hold on tight and mind the updraft.",
    },
    relocateAnywhere(
      "Choose the piece the griffon lifts",
      "Choose the empty square it is carried to",
    ),
  ),
  card(
    {
      id: "direwolf_pack",
      icon: "PawPrint",
      name: "Direwolf Pack",
      description:
        "A spectral direwolf answers your howl and hunts at your side as a knight for 5 of your turns, then melts back into the mist.",
      tier: 4,
      category: "pieces",
      flavor: "The pack always returns to the wild.",
    },
    summonTemp("n", 5, myHalfZone),
  ),
  card(
    {
      id: "roost_of_rocs",
      icon: "Egg",
      name: "Roost of Rocs",
      description:
        "Two titanic rocs descend from the mountain roost and settle into your pocket as knights, then drop them onto empty squares on later turns.",
      tier: 6,
      category: "pieces",
      flavor: "Their shadows blot out the board.",
    },
    instant((_inst, api) => grantInventory(api, "n", 2)),
  ),
];
