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
  curse,
  freezeTarget,
  instant,
  mySquares,
  oppFilter,
  relRank,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
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
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
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
      description: "Cast a nerf on your opponent: they cannot capture for their next 2 turns, and their next drafted card arrives nullified.",
      tier: 5,
      flavor: "If you cannot beat them, nerf them.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        // Nerf their hand as well as their army: the next card they draft
        // arrives inert.
        api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
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
      description: "Nerf your opponent's pawns: their two-square double step is removed for the rest of the game. Every enemy pawn crawls one square at a time.",
      tier: 3,
      flavor: "Patch notes: pawn movement speed reduced by 50%.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (_inst, api) => {
        const pawns = mySquares(api.board, api.opp, "p");
        if (pawns.length) {
          addEffect(api, { kind: "strike", squares: pawns, owner: api.me, turns: 1 });
        }
      },
      filterOpponentMoves: (moves) => {
        const kept = moves.filter((m) => !(m.piece === "p" && m.isDoublePawn));
        return kept.length > 0 ? kept : moves;
      },
    },
  ),

  // The heaviest nerf: reduce the opponent to a king-only game for one turn.
  // Lightning strikes the crown that has to answer alone.
  hex(
    {
      id: "royal_handicap",
      name: "Royal Handicap",
      description: "Nerf the crown itself: the patch removes diagonal movement from your opponent's king for their next 4 turns.",
      tier: 5,
      flavor: "Please look forward to the royal rework in a future season.",
      fx: { motif: "anchor", pieces: ["k"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 4;
        const k = mySquares(api.board, api.opp, "k")[0];
        if (k != null) {
          addEffect(api, { kind: "strike", squares: [k], owner: api.me, turns: 1 });
        }
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter(
          (m) =>
            m.piece !== "k" ||
            FILE(m.to) === FILE(m.from) ||
            RANK(m.to) === RANK(m.from),
        );
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // Easter egg (gaming): the classic "turn it off and on again". Reboots the
  // opponent's most advanced pawn back to its factory settings.
  hex(
    {
      id: "hard_reset",
      name: "Hard Reset",
      description: "Turn it off and on again: your opponent's most advanced pawn is sent back to its starting square, if that square is free. Ties reboot the pawn nearest the a-file.",
      tier: 2,
      flavor: "Have you tried turning it off and on again?",
    },
    instant((_inst, api) => {
      let best: Square | null = null, bestRank = -1;
      for (const sq of mySquares(api.board, api.opp, "p")) {
        const rr = relRank(api.opp, sq);
        if (rr > bestRank) { bestRank = rr; best = sq; }
      }
      if (best == null) return;
      const home = SQ(FILE(best), api.opp === "w" ? 1 : 6);
      if (home !== best && !api.board.pieces[home]) {
        api.relocate(best, home);
        addEffect(api, { kind: "strike", squares: [home], owner: api.me, turns: 1 });
      }
    }),
  ),

  // Nerf the enemy queen down to a short-range slider. Timed filter with the
  // safe non-empty fallback baked into curse().
  hex(
    {
      id: "queens_handicap",
      name: "Queen's Handicap",
      description: "Nerf your opponent's queen: for their next 4 turns her every move must end beside another of their own pieces. No escort, no move.",
      tier: 5,
      flavor: "She now requires a party to queue.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "q") return true;
        for (const df of [-1, 0, 1]) {
          for (const dr of [-1, 0, 1]) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(m.to) + df, r = RANK(m.to) + dr;
            if (!inBoard(f, r)) continue;
            if (SQ(f, r) === m.from) continue;
            const p = api.board.pieces[SQ(f, r)];
            if (p && p.color === api.opp) return true;
          }
        }
        return false;
      }),
    ),
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
      description: "The balance team finally answers: one enemy queen you point at is patched down to a bishop where she stands.",
      tier: 6,
      flavor: "Nerf THIS.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Point at the queen to nerf",
              squares: mySquares(api.board, api.opp, "q"),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type === "q") {
          api.setPieceType(sq, "b");
          addEffect(api, { kind: "strike", squares: [sq], owner: api.me, turns: 1 });
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
      description: "The balance patch lands: your opponent's next draft is skipped, and you gain one draft reroll.",
      tier: 4,
      flavor: "See the changelog. You were the change.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),

  // -------------------------------------------------------------------------
  // Boons: shrug the nerf off. Category "nerf" cards join nerf mode's boon
  // (self-relief) pool automatically.
  // -------------------------------------------------------------------------
  card(
    {
      id: "break_the_nerf",
      name: "Break the Nerf",
      description: "Free action: break your nerf, suspending it for your next 3 turns, and take one extra move the moment it breaks.",
      tier: 3,
      category: "nerf",
      flavor: "The handicap was a suggestion. You declined.",
    },
    {
      ...activatedSimple((_inst, api) => {
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 3 });
        api.bs.extraMoves[api.me] += 1;
      }),
      freeAction: true,
    },
  ),

  card(
    {
      id: "defiance",
      name: "Defiance",
      description: "Free action: suspend your nerf until your opponent's next capture, used at the moment you choose.",
      tier: 2,
      category: "nerf",
      flavor: "Not today.",
    },
    {
      // No-target free action that arms a triggered suspension: the nerf stays
      // off (permanent nerf_suspended) until the opponent's next capture, then
      // the effect is lifted and the card is spent. spendOnUse:false keeps the
      // instance alive to run onMovePlayed; state.active guards re-activation.
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      effect: (inst, api) => {
        if (inst.state.active) return;
        inst.state.active = true;
        addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: null });
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.active) return;
        if (move.color === api.opp && move.captured && move.captured !== "k") {
          const idx = api.bs.effects.findIndex(
            (e) => e.kind === "nerf_suspended" && e.owner === api.me && e.turns == null,
          );
          if (idx >= 0) api.bs.effects.splice(idx, 1);
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.active
          ? "suspended until your opponent's next capture"
          : "free action: suspend your nerf",
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

  // Italian brainrot: the beaver bandit swings his log. Bonk one enemy piece
  // and it is stunned (frozen) for 2 of its turns, with an impact flash.
  hex(
    {
      id: "sahur",
      name: "Bobrito Bandito",
      description: "Bonk one enemy piece with the log: it is stunned and cannot move for its next 2 turns. Kings are too stubborn to bonk.",
      tier: 5,
      flavor: "The beaver bandit collects his toll, one bonk at a time.",
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

  // Fruit: the king of fruits. Not a pawn clone (Pawn Nerf owns that): the
  // durian is a stench field. Lob it onto a square and for 3 of the opponent's
  // turns no enemy piece may step into the ring around it. Reuses the same
  // no-approach filter as pt's Stinky, with the standard non-empty fallback so
  // it can never soft-lock a turn (dist === 1 is the king-step ring).
  hex(
    {
      id: "durian",
      name: "Durian",
      description: "Lob the king of fruits onto an empty square: for your opponent's next 3 turns no enemy piece may move onto a square next to it. The stench clears after that.",
      tier: 3,
      flavor: "Banned on public transit for a reason.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an empty square to lob the durian onto",
              squares: Array.from({ length: 64 }, (_, i) => i).filter(
                (sq) => !api.board.pieces[sq],
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        const kept = moves.filter((m) => dist(sq, m.to) !== 1);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) =>
        inst.state.sq == null
          ? "activate to lob the durian"
          : `stench: ${turnsLeft(inst)} of their turns left`,
    },
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
