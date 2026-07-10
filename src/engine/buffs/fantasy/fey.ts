// Fantasy set: THE FEY COURTS. Enchantments from the twilight realm: pixie
// dust that lightens your cavalry (timedAugment), a faerie ring and a thorn
// hedge that seal ground (barNeighbors / barLine), charms that lure or convert
// enemy pieces (freeze / convertEnemies), a changeling swap (transformOwn), a
// seelie ward and a gossamer veil (shield effects), an unseelie bargain paid in
// tempo (extraMoves + skips), a dryad that walks beside you and fades
// (summonTemp), Puck's mischief hobbling the enemy court (curse), a step
// through the hedge (relocateAnywhere), and the Wild Hunt (removeEnemies).
// Every card reuses an existing primitive; kings are never frozen, converted,
// or removed, and every opponent filter is partial so nothing can soft-lock.

import { Buff } from "./shared";
import {
  card,
  curse,
  activated,
  activatedSimple,
  addEffect,
  barLine,
  barNeighbors,
  convertEnemies,
  freezeTarget,
  mySquares,
  myHalfZone,
  relocateAnywhere,
  removeEnemies,
  shieldArmy,
  slideMoves,
  summonTemp,
  timedAugment,
  transformOwn,
  DIAG_DIRS,
  FILE,
  RANK,
} from "./shared";

export const FANTASY_FEY: Buff[] = [
  card(
    {
      id: "pixie_dust",
      name: "Pixie Dust",
      description:
        "A handful of glittering dust settles on your stables: for your next 3 turns each of your knights may also step one square diagonally.",
      tier: 3,
      category: "movement",
      requires: ["n"],
      flavor: "Second star to the right, then hard left at the rook.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "b", self: true },
    },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, DIAG_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "faerie_ring",
      name: "Faerie Ring",
      description:
        "A ring of pale mushrooms springs up around a square you choose: the 8 squares surrounding it are impassable to your opponent for their next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "Step inside and dance a hundred years.",
      fx: { motif: "blindfold" },
    },
    barNeighbors(3, "Choose the center of the faerie ring"),
  ),
  card(
    {
      id: "will_o_wisp",
      name: "Will-o'-Wisp",
      description:
        "A cold flame dances before one enemy piece and it cannot look away: it cannot move for 3 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "tempo",
      flavor: "Follow the light. The light knows a shortcut.",
    },
    freezeTarget(3, "charm"),
  ),
  card(
    {
      id: "glamour",
      name: "Glamour",
      description:
        "You weave a glamour over one enemy pawn and it forgets whose banner it marched under: it joins your army.",
      tier: 3,
      category: "pieces",
      flavor: "It always liked your colors better.",
    },
    convertEnemies(1, ["p"], "Choose the enemy pawn to charm"),
  ),
  card(
    {
      id: "thorn_hedge",
      name: "Thorn Hedge",
      description:
        "A hedge of black thorns erupts across the board: pick any square and its entire rank becomes impassable to your opponent for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "A hundred years of briars in a single heartbeat.",
      fx: { motif: "blindfold" },
    },
    barLine("rank", 3),
  ),
  card(
    {
      id: "changeling",
      name: "Changeling",
      description:
        "One of your pawns was never a pawn at all: it drops the disguise and becomes a knight where it stands.",
      tier: 4,
      category: "pieces",
      requires: ["p"],
      flavor: "The cradle was never empty. It was just not yours.",
    },
    transformOwn(1, ["p"], "n", "Choose the pawn that drops its disguise"),
  ),
  card(
    {
      id: "seelie_blessing",
      name: "Seelie Blessing",
      description:
        "The bright court smiles on one of your pieces: it cannot be captured for your opponent's next 3 turns.",
      tier: 3,
      category: "protection",
      boon: true,
      flavor: "Their favor is warm, brief, and absolutely conditional.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece the bright court favors",
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
      id: "unseelie_bargain",
      name: "Unseelie Bargain",
      description:
        "Free action: strike a bargain with the dark court and take two extra moves right now. The price comes due and you skip your next turn.",
      tier: 6,
      category: "tempo",
      flavor: "Read the contract. The contract reads you back.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 2;
        api.bs.skips[api.me] += 1;
      }),
      freeAction: true,
    },
  ),
  card(
    {
      id: "dryad_grove",
      name: "Dryad Grove",
      description:
        "A dryad steps out of her tree to fight beside you: place a bishop on an empty square in your half. She returns to the grove after 6 of your turns.",
      tier: 5,
      category: "pieces",
      flavor: "Her roots go deeper than your war.",
    },
    summonTemp("b", 6, myHalfZone),
  ),
  card(
    {
      id: "pucks_mischief",
      name: "Puck's Mischief",
      description:
        "A hobgoblin ties every royal shoelace together: for their next 3 turns your opponent's queen and rooks may move only one square at a time.",
      tier: 4,
      category: "hex",
      flavor: "Lord, what fools these monarchs be.",
      fx: { motif: "slow", pieces: ["q", "r"] },
    },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "q" && m.piece !== "r") return true;
        return (
          Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 1
        );
      }),
    ),
  ),
  card(
    {
      id: "fey_step",
      name: "Fey Step",
      description:
        "One of your pieces slips into the hedgerow and out the other side: move it to any empty square on the board, once.",
      tier: 5,
      category: "movement",
      flavor: "The shortest path runs through a country that is not there.",
    },
    relocateAnywhere(
      "Choose the piece that steps through the hedge",
      "Choose where it steps back out",
    ),
  ),
  card(
    {
      id: "gossamer_veil",
      name: "Gossamer Veil",
      description:
        "A shimmering veil of spider-silk settles over your army: none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 6,
      category: "protection",
      flavor: "Softer than moonlight, stronger than mail.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    shieldArmy(2),
  ),
  card(
    {
      id: "wild_hunt",
      name: "The Wild Hunt",
      description:
        "The horns of the twilight court sound and the Hunt rides through: name two enemy knights or bishops and they are carried off the board.",
      tier: 6,
      category: "attack",
      flavor: "Do not look up when the hoofbeats pass overhead.",
    },
    removeEnemies(2, ["n", "b"]),
  ),
];
