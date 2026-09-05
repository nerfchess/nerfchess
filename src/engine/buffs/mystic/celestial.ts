// Mystic set: CELESTIAL SIGNS. What the sky writes, the board obeys: a comet
// shard falling into your pocket (grantInventory), the north star revealing
// their burden (info flag), a solstice that lengthens your day (extraMoves),
// the zodiac wheel widening your next draft (draft flags), a ward of starlight
// (shieldArmy), a lunar eclipse that stills the enemy majors (walnutAll), and
// the grand alignment that transfixes the whole enemy court (freezeAllEnemies).
// Every card reuses an existing primitive and respects the rails: kings are
// never frozen or petrified, and no filter here can strand a player.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  activated,
  emptySquares,
  inHalf,
  instant,
  mySquares,
  slideMoves,
  timedAugment,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
} from "./shared";

export const MYSTIC_CELESTIAL: Buff[] = [
  card(
    {
      id: "north_star",
      name: "North Star",
      description:
        "The fixed star steadies your hand: your next draft is fated to offer tier 4 cards.",
      tier: 3,
      category: "draft",
      boon: true,
      flavor: "Every traveler lies except the one that never moves.",
    },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 4;
    }),
  ),
  card(
    {
      id: "comet_shard",
      name: "Comet Shard",
      description:
        "A shard of a passing comet crashes onto the board as a bishop: place it on any empty square in your half. It lands still glowing, and its light also shields up to three other pieces you choose: those four cannot be captured for your opponent's next turn.",
      tier: 5,
      category: "pieces",
      flavor: "Wishes granted while supplies last.",
    },
    // Balance pass: the comet's glow protects four chosen pieces, no more. The
    // landed bishop is always one; the caster names up to three others.
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose where the comet shard lands",
            squares: emptySquares(api.board, (sq) => inHalf(api.me, sq)),
          };
        }
        if (picks.length >= 4) return null;
        return {
          kind: "square",
          label: "Choose a piece the comet's glow also shields",
          squares: mySquares(api.board, api.me).filter(
            (sq) => !picks.some((k) => k.square === sq),
          ),
          finishable: true,
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.place(sq, "b", api.me);
        const squares = [
          sq,
          ...picks
            .slice(1)
            .map((k) => k.square)
            .filter((s): s is number => s != null),
        ];
        addEffect(api, { kind: "shield", owner: api.me, squares, turns: 1 });
      },
    ),
  ),
  card(
    {
      id: "solstice",
      name: "Solstice",
      description:
        "The longest day gives everyone one more step: for your next turn, every one of your knights, bishops, rooks, and queens can also step one square in any direction.",
      tier: 4,
      category: "movement",
      flavor: "The sun lingers. So may you.",
      fx: { motif: "rally", pieces: ["n", "b", "r", "q"], self: true },
    },
    timedAugment(1, (_m, inst, api) =>
      mySquares(api.board, api.me).flatMap((sq) => {
        const t = api.board.pieces[sq]!.type;
        return t === "k" || t === "p" ? [] : slideMoves(api.board, sq, ALL_DIRS, inst.id, 1);
      }),
    ),
  ),
  card(
    {
      id: "zodiac_wheel",
      name: "Zodiac Wheel",
      description:
        "You read all twelve houses at once: your next draft shows three cards to pick from, all fated to tier 4.",
      tier: 5,
      category: "draft",
      flavor: "Mercury is in retrograde. Your rooks are in ascension.",
    },
    // Reworked for the full-transparency era (opponent offers are public): the
    // wheel now fixes where your widened draft is dealt from. Unique combo of
    // prepThree + forceTier (North Star is the forceTier alone, Prep the
    // three-card offer alone).
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.forceTier = 4;
    }),
  ),
  card(
    {
      id: "starlight_ward",
      name: "Starlight Ward",
      description:
        "Starlight pools around the crown: your pieces standing on the squares beside your king cannot be captured for your opponent's next 3 turns.",
      tier: 3,
      category: "protection",
      flavor: "Light that left its star a thousand years ago, arriving exactly on time.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    instant((_inst, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return;
      const squares: number[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(k) + df, r = RANK(k) + dr;
        if (f >= 0 && f <= 7 && r >= 0 && r <= 7) squares.push(SQ(f, r));
      }
      addEffect(api, { kind: "shield", owner: api.me, squares, turns: 3 });
    }),
  ),
  card(
    {
      id: "lunar_eclipse",
      name: "Lunar Eclipse",
      description:
        "The moon slides into shadow and the enemy's great powers still with it: your opponent's rooks and queen cannot move for 3 of their turns, though the first of them may slip away with one move before the shadow takes it.",
      tier: 6,
      category: "hex",
      flavor: "Even the tide holds its breath.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    // Balance pass: the first affected major keeps one legal escape move. Every
    // other rook and the queen are stilled at once; the escapee is stilled only
    // once it has spent that move (chosen deterministically as the lowest-index
    // affected square so replicas agree).
    {
      kind: "passive",
      init: (inst, api) => {
        const affected = mySquares(api.board, api.opp).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return t === "r" || t === "q";
        });
        const escapee = affected.length > 0 ? affected[0] : null;
        for (const sq of affected) {
          if (sq === escapee) continue;
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
        }
        inst.state.escapee = escapee ?? undefined;
        if (escapee == null) inst.spent = true;
      },
      onMovePlayed: (inst, move, api) => {
        const escapee = inst.state.escapee as number | undefined;
        if (escapee == null) return;
        // Captured before it could be stilled: nothing left to hold.
        if (move.to === escapee && move.from !== escapee) {
          inst.spent = true;
          return;
        }
        // It spent its one escape move; the shadow stills it for 3 turns.
        if (move.from === escapee && move.color === api.opp) {
          addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 3 });
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.escapee == null
          ? "the eclipse holds"
          : "one major may still slip away",
    },
  ),
  card(
    {
      id: "celestial_alignment",
      name: "Celestial Alignment",
      description:
        "The stars chart the light squares and hold everything found there: every enemy piece except the king standing on a light square is frozen for 2 of their turns.",
      tier: 8,
      category: "tempo",
      flavor: "Once a century, the sky agrees with you.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        if ((FILE(sq) + RANK(sq)) % 2 !== 1) continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),
];
