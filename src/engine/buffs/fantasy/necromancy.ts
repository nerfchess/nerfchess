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
  grantInventory,
  instant,
  lineSweep,
  myHalfZone,
  backRankZone,
  DIAG_DIRS,
  SQ,
  FILE,
  RANK,
  inBoard,
  emptySquares,
  pawnRankOk,
  relRank,
  activated,
  addEffect,
  mySquares,
  type Mech,
  type BuffInstance,
  type BuffApi,
  type BuffPick,
} from "./shared";

// Soul Harvest reuses the queen's diagonal capture sweep (lineSweep, exactly
// like Hellfire Beam and Queen's Rampage) and then reaps those deaths into
// life: for each enemy piece the sweep removes, a fresh friendly pawn rises on
// an empty pawn-legal square in your half, filled from your back rank outward.
// The count is read before the board is cleared and the placement order is
// deterministic, so both clients raise the same pawns on the same squares.
function soulHarvestSweep(): Mech {
  const base = lineSweep("q", DIAG_DIRS, null);
  return {
    ...base,
    effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
      const from = picks[0]?.square;
      const to = picks[1]?.square;
      let reaped = 0;
      if (from != null && to != null && from !== to) {
        const df = Math.sign(FILE(to) - FILE(from));
        const dr = Math.sign(RANK(to) - RANK(from));
        let f = FILE(from) + df;
        let r = RANK(from) + dr;
        while (inBoard(f, r)) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (p && p.color === api.opp && p.type !== "k") reaped++;
          if (sq === to) break;
          f += df;
          r += dr;
        }
      }
      base.effect?.(inst, api, picks);
      if (reaped <= 0) return;
      const spots = emptySquares(api.board, myHalfZone(api))
        .filter((sq) => pawnRankOk(sq))
        .sort((a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b);
      for (let i = 0; i < reaped && i < spots.length; i++) {
        api.place(spots[i], "p", api.me);
      }
    },
  };
}

// Undying Thrall reuses the back-rank revive (reviveOne, like Minor Recall) but
// binds a timed_loss to the raised piece so it fights for 4 of your turns and
// then crumbles to dust. That temporary lifespan is what distinguishes it from
// the permanent recall it used to duplicate.
function undyingThrallRevive(): Mech {
  const base = reviveOne(["n", "b"], backRankZone);
  return {
    ...base,
    effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
      base.effect?.(inst, api, picks);
      const sq = picks[0]?.square;
      if (sq == null) return;
      const p = api.board.pieces[sq];
      // Only when a thrall was actually raised on this square (a captured minor
      // was available): a timed_loss removes it after 4 of your own turns.
      if (p && p.color === api.me && p.type !== "k") {
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 4, then: "remove" });
      }
    },
  };
}

export const FANTASY_NECROMANCY: Buff[] = [
  card(
    {
      id: "undying_thrall",
      icon: "Bone",
      name: "Undying Thrall",
      description:
        "Bind a restless spirit into service: one of your captured knights or bishops claws back onto an empty square of your back rank and fights for 4 of your turns, then crumbles to dust, once.",
      tier: 2,
      category: "pieces",
      flavor: "It does not remember dying, only serving.",
    },
    undyingThrallRevive(),
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
        "Your queen captures every enemy piece along one diagonal in a single move; for each piece reaped, a friendly pawn rises on an empty square in your half, once.",
      tier: 7,
      category: "attack",
      requires: ["q"],
      flavor: "One long, patient stroke; the fallen answer for you now.",
    },
    soulHarvestSweep(),
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
        "Three fresh pawns muster into your pocket, then drop them onto empty squares on later turns.",
      tier: 6,
      category: "pieces",
      flavor: "Roll call is a very long list of names.",
    },
    instant((_inst, api) => grantInventory(api, "p", 3)),
  ),
];
