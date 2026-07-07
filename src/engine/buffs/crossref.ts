// Cross-referential cards: a small themed set that ties the Nerf and Buff
// worlds together. Hexes here are flavored as "casting a nerf" on the
// opponent; boons here are flavored as shrugging a nerf off; and a handful of
// one-in-ten easter eggs wink at the other mode or at famous chess rules.
//
// Everything is built from the SAME safety-railed helpers the rest of the
// library uses (curse / timed filters / king_only / no_pawn_advance / freeze /
// walnut / targeted removal), so nothing can soft-lock a game or freeze a king.
// The array is spread into ALL_BUFFS by library.ts, exactly like NEW_HEXES.

import { BuffCategory } from "../buff";
import {
  hex,
  activated,
  activatedSimple,
  addEffect,
  blockDrafts,
  curse,
  freezeTarget,
  instant,
  mySquares,
  oppFilter,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
} from "./hexes/shared";
import type {
  Buff,
  BuffApi,
  BuffInstance,
  CardFx,
  Move,
  Square,
  Tier,
  Mech,
} from "./hexes/shared";

/** Chebyshev (king-step) distance a slide travels. */
const dist = (from: Square, to: Square) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

/** Non-hex card builder (boons and general cards). Spreads meta so a flavor
 * line rides along even though the base Buff type does not declare it, the
 * same way the hex() factory does. */
type XMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  boon?: boolean;
  flavor?: string;
  /** Board motif drawn on the affected pieces while the constraint runs.
   * Display metadata only; never consulted by move generation. */
  fx?: CardFx;
};
function card(meta: XMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

export const CROSSREF_CARDS: Buff[] = [
  // -------------------------------------------------------------------------
  // Marquee hex: cast a nerf on the enemy. Lightning flashes across their
  // whole army as the handicap lands, then captures are forbidden for a bit.
  // Built as a timed opponent-move filter with the standard non-empty
  // fallback, so it can never soft-lock.
  // -------------------------------------------------------------------------
  hex(
    {
      id: "cast_a_nerf",
      name: "Cast a Nerf",
      description: "Cast a nerf on your opponent: they cannot capture for their next 2 turns.",
      tier: 5,
      flavor: "If you cannot beat them, nerf them.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        const squares = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        if (squares.length) {
          addEffect(api, { kind: "strike", squares, owner: api.me, turns: 1 });
        }
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      // Ticks on the cursed side's moves so "their next 2 turns" is exact.
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // Nerf the enemy infantry: pawns cannot advance. Lightning flashes on every
  // enemy pawn as the restriction lands.
  hex(
    {
      id: "pawn_nerf",
      name: "Pawn Nerf",
      description: "Nerf your opponent's pawns: they cannot advance for their next 3 turns. Their pawns may still capture diagonally.",
      tier: 3,
      flavor: "Patch notes: enemy pawns no longer function.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
      const pawns = mySquares(api.board, api.opp, "p");
      if (pawns.length) {
        addEffect(api, { kind: "strike", squares: pawns, owner: api.me, turns: 1 });
      }
    }),
  ),

  // The heaviest nerf: reduce the opponent to a king-only game for one turn.
  // Lightning strikes the crown that has to answer alone.
  hex(
    {
      id: "royal_handicap",
      name: "Royal Handicap",
      description: "Nerf your opponent to a king-only game: on their next turn they may move only their king.",
      tier: 5,
      flavor: "Everyone else has been benched.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
      const k = mySquares(api.board, api.opp, "k")[0];
      if (k != null) {
        addEffect(api, { kind: "strike", squares: [k], owner: api.me, turns: 1 });
      }
    }),
  ),

  // Easter egg (gaming): the classic "turn it off and on again". Freezes one
  // targeted enemy piece; freezeTarget never touches a king.
  hex(
    {
      id: "hard_reset",
      name: "Hard Reset",
      description: "Freeze one enemy piece you target for 2 of their turns. Kings cannot be targeted.",
      tier: 4,
      flavor: "Have you tried turning it off and on again?",
    },
    freezeTarget(2),
  ),

  // Nerf the enemy queen down to a short-range slider. Timed filter with the
  // safe non-empty fallback baked into curse().
  hex(
    {
      id: "queens_handicap",
      name: "Queen's Handicap",
      description: "Nerf your opponent's queen: she slides at most 3 squares for their next 3 turns.",
      tier: 5,
      flavor: "Her range stat took a hit this patch.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 3)),
  ),

  // Easter egg (gaming): THE nerf meme. Petrifies a knight, bishop, or rook
  // into a walnut and flashes lightning on it. Kings are never in range.
  hex(
    {
      id: "nerf_hammer",
      name: "Nerf Hammer",
      description: "Bring down the nerf hammer: turn one enemy knight, bishop, or rook you target into a walnut for 2 of their turns. It can only shuffle one square at a time.",
      tier: 6,
      flavor: "The devs have spoken.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight, bishop, or rook to hammer",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || !(p.type === "n" || p.type === "b" || p.type === "r")) {
          return;
        }
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
        addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
      },
    ),
  ),

  // Easter egg (Overwatch "Nerf this!"): a mini lightning strike that removes
  // up to two enemy minors or pawns. Mirrors Lightning Strike's animation.
  hex(
    {
      id: "nerf_this",
      name: "Nerf This",
      description: "Call lightning on up to two enemy knights, bishops, or pawns, removing them from the board.",
      tier: 6,
      flavor: "Nerf THIS.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const squares = mySquares(api.board, api.opp).filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return (t === "n" || t === "b" || t === "p") && !picks.some((k) => k.square === sq);
        });
        if (!squares.length && picks.length > 0) return null;
        return {
          kind: "square",
          label: `Choose a piece to nerf (${picks.length + 1}/2)`,
          squares,
        };
      },
      (_inst, api, picks) => {
        const struck: Square[] = [];
        for (const k of picks) {
          if (k.square == null) continue;
          const p = api.board.pieces[k.square];
          if (p && p.color === api.opp && (p.type === "n" || p.type === "b" || p.type === "p")) {
            api.removePiece(k.square);
            struck.push(k.square);
          }
        }
        if (struck.length) {
          addEffect(api, { kind: "strike", squares: struck, owner: api.me, turns: 1 });
        }
      },
    ),
  ),

  // Easter egg (gaming): the balance patch that deletes your card. Blocks the
  // opponent's next draft outright.
  hex(
    {
      id: "patch_notes",
      name: "Patch Notes",
      description: "The balance patch lands: your opponent's next draft is skipped outright, giving them no new card.",
      tier: 4,
      flavor: "See the changelog. You were the change.",
    },
    blockDrafts(1),
  ),

  // -------------------------------------------------------------------------
  // Boons: shrug the nerf off. Category "nerf" cards join nerf mode's boon
  // (self-relief) pool automatically.
  // -------------------------------------------------------------------------
  card(
    {
      id: "break_the_nerf",
      name: "Break the Nerf",
      description: "Shrug off your nerf: suspend it for your next 3 turns.",
      tier: 3,
      category: "nerf",
      flavor: "The handicap was a suggestion. You declined.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 3 });
    }),
  ),

  card(
    {
      id: "defiance",
      name: "Defiance",
      description: "Free action: suspend your nerf for your next 2 turns, used at the moment you choose.",
      tier: 2,
      category: "nerf",
      flavor: "Not today.",
    },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
      }),
      freeAction: true,
    },
  ),

  card(
    {
      id: "counter_nerf",
      name: "Counter-Nerf",
      description: "The next 3 times your opponent captures one of your pieces, your nerf is suspended for your next turn.",
      tier: 4,
      category: "nerf",
      flavor: "Every wound you deal me loosens my chains.",
    },
    {
      kind: "passive",
      init: (inst: BuffInstance) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst: BuffInstance) => `${(inst.state.charges as number) ?? 3} counters left`,
    },
  ),

  // Easter egg (chess meme): en passant. "Holy hell." Your pawns can never be
  // taken en passant. Light supportive card, so it joins the boon pool.
  card(
    {
      id: "holy_hell",
      name: "Holy Hell",
      description: "Your pawns can never be captured en passant, for the rest of the game.",
      tier: 1,
      category: "protection",
      boon: true,
      flavor: "New response just dropped.",
      // Guards the pawns without a shield effect; ward is its only paint.
      fx: { motif: "ward", pieces: ["p"], self: true },
    },
    oppFilter((moves) => moves.filter((m) => !m.isEnPassant)),
  ),

  // -------------------------------------------------------------------------
  // Brainrot and funny fruit: a small themed run of meme cards, built on the
  // same safety-railed primitives as everything else (freeze never touches a
  // king, instants resolve once), so none can soft-lock a game.
  // -------------------------------------------------------------------------

  // Italian brainrot: the log-man with the bat. Bonk one enemy piece and it is
  // stunned (frozen) for 2 of its turns, with an impact flash on the square.
  hex(
    {
      id: "sahur",
      name: "Tung Tung Tung Sahur",
      description: "Bonk one enemy piece with the log: it is stunned and cannot move for its next 2 turns. Kings are too stubborn to bonk.",
      tier: 5,
      flavor: "Tung tung tung tung tung tung tung tung tung sahur.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to bonk",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "stun" });
        // Impact flash: the log's bonk, NOT Lightning Strike. A `bonk` effect
        // on the same square the freeze lands on, so the injured overlay can
        // pair the two (freeze + recent bonk = a stunned, dazed piece).
        addEffect(api, { kind: "bonk", squares: [sq], owner: api.me, turns: 1 });
      },
    ),
  ),

  // Fruit: a dropped coconut. A lighter bonk: one enemy piece is stunned for
  // its next turn. A playful item, drafted in both modes.
  card(
    {
      id: "coconut_bonk",
      name: "Coconut Bonk",
      description: "Drop a coconut on one enemy piece: it is stunned and cannot move for its next turn. Kings are too hard-headed.",
      tier: 2,
      category: "item",
      flavor: "Bonk.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to bonk",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stun" });
        // Impact flash: the dropped coconut's bonk, NOT Lightning Strike. A
        // `bonk` effect on the same square the freeze lands on, so the injured
        // overlay can pair the two (freeze + recent bonk = a dazed piece).
        addEffect(api, { kind: "bonk", squares: [sq], owner: api.me, turns: 1 });
      },
    ),
  ),

  // Fruit: the king of fruits. Its stench pins the enemy infantry: their pawns
  // cannot advance for 3 of their turns. Lightning flashes on every enemy pawn.
  hex(
    {
      id: "durian",
      name: "Durian",
      description: "Lob the king of fruits: the stench pins your opponent's pawns, which cannot advance for their next 3 turns. They may still capture diagonally.",
      tier: 3,
      flavor: "Banned on public transit for a reason.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
      const pawns = mySquares(api.board, api.opp, "p");
      if (pawns.length) {
        addEffect(api, { kind: "strike", squares: pawns, owner: api.me, turns: 1 });
      }
    }),
  ),

  // Fruit boon: hide behind the rind. Your whole army cannot be captured for
  // the opponent's next 2 turns. A light supportive card, so it joins the boons.
  card(
    {
      id: "watermelon_rind",
      name: "Watermelon Rind",
      description: "Duck behind the rind: your whole army cannot be captured for your opponent's next 2 turns.",
      tier: 4,
      category: "protection",
      boon: true,
      flavor: "Nature's armor, mostly water.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
    }),
  ),
];
