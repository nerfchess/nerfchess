// Creator card set: one signature rule per chess creator, plus the format card.
//
// WHY THESE MECHANICS. A card named after somebody that plays like a generic
// freeze is worth nothing to them, so each one is built to be recognisably that
// person: Rosen's card is a bait piece that punishes whoever takes it (never
// take the bait), Levy's is a rook that gets to be THE ROOK for two glorious
// turns, Anna's is a family truce with everything face up on the table,
// Danya's is forced forward pressure that pays the clock better the longer it
// holds, and the chat card lets chat roll a penalty onto its own creator. The
// research behind the picks is in docs/creator-outreach-research-2026-07.md.
//
// ART. The portraits at public/creators/<slug>.svg are ORIGINAL, drawn in the
// game's own visual language. No channel logo or likeness is copied in: a logo is
// a third-party trademark and shipping one exposes the site. That path is a
// drop-in slot — when a creator sends artwork (or grants use of their logo),
// replacing the one file is the whole change, no code edit. Same pattern as the
// named-person set (personalPlays.tsx renders public/newjeans/*.svg).
//
// REMOVABILITY. Each card must be retractable in one commit: delete its entry
// here and its key from creatorPlays and the card is gone. If a creator objects,
// that is the entire conversation.
//
// SAFETY. Every mechanic reuses primitives that already ship (shield, freeze,
// cosmetic tags, clock adjust, timed opponent filters, draft flags, own-move
// splices with the forced-pass net underneath), so none of them can soft-lock
// a game or freeze a king, and all of them are a pure function of the synced
// board. The one random card (Chat Picks) draws only from api.rng, which is
// seeded from the synced public state, so every replica rolls the same result.

import { Buff, BuffApi, BuffCategory, BuffInstance, CardFx } from "../buff";
import { Tier } from "../nerf";
import { Color, FILE, Move, PieceType, RANK, Square } from "../types";
import {
  DIAG_DIRS,
  activated,
  addEffect,
  addNovel,
  captureSquare,
  mySquares,
  slideMoves,
  squareStep,
  steps,
  timedOppFilter,
  turnsLeft,
} from "./helpers";
import { attackersOf, kingSquare } from "./overhaul/shared";
import { makeMove } from "../board";

type Mech = Partial<Buff> & Pick<Buff, "kind">;

type CreatorMeta = {
  id: string;
  name: string;
  description: string;
  tip?: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  icon?: string;
  requires?: PieceType[];
  fx?: CardFx;
};

function card(meta: CreatorMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

/** Every enemy piece that is not a king. Kings are excluded everywhere in this
 * file: no creator card may freeze, petrify or immobilise one. */
function enemyNonKingSquares(api: BuffApi): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = api.board.pieces[sq];
    if (p && p.color === api.opp && p.type !== "k") out.push(sq);
  }
  return out;
}

function sqName(sq: Square): string {
  return `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
}

// --- Cramling Family Night: the "biggest piece on the menu" tag ---------------

const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Every tag this card manages carries this label prefix, so cleanup can never
 * remove a cosmetic some other card pinned. */
const MENU_TAG = "Family night:";

/** The most valuable non-king piece `by` is currently attacking, or null.
 * Deterministic tie-break (lowest square) so replicas always tag the same
 * piece. A pure read of the synced board. */
function biggestAttacked(api: BuffApi, by: Color): Square | null {
  let best: Square | null = null;
  let bestValue = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = api.board.pieces[sq];
    if (!p || p.color === by || p.type === "k") continue;
    if (PIECE_VALUE[p.type] <= bestValue) continue;
    if (attackersOf(api.board, by, sq).length === 0) continue;
    best = sq;
    bestValue = PIECE_VALUE[p.type];
  }
  return best;
}

/** Re-pin the two menu tags to wherever they belong right now. Only touches
 * effects whose label starts with MENU_TAG, and only mutates when a tag
 * actually moved, so quiet moves stay quiet. */
function refreshMenuTags(api: BuffApi) {
  const want = new Map<Square, string>();
  for (const by of ["w", "b"] as Color[]) {
    const sq = biggestAttacked(api, by);
    if (sq != null) {
      want.set(sq, `${MENU_TAG} ${by === "w" ? "White" : "Black"} is eyeing this`);
    }
  }
  for (let i = api.bs.effects.length - 1; i >= 0; i--) {
    const e = api.bs.effects[i];
    if (e.kind !== "cosmetic" || !e.label?.startsWith(MENU_TAG)) continue;
    if (want.get(e.sq) === e.label) want.delete(e.sq);
    else api.bs.effects.splice(i, 1);
  }
  for (const [sq, label] of want) {
    const p = api.board.pieces[sq];
    if (!p) continue;
    addEffect(api, { kind: "cosmetic", sq, owner: p.color, turns: null, skin: "nametag", label });
  }
}

/** Drop every menu tag this card pinned (the truce is over). */
function clearMenuTags(api: BuffApi) {
  for (let i = api.bs.effects.length - 1; i >= 0; i--) {
    const e = api.bs.effects[i];
    if (e.kind === "cosmetic" && e.label?.startsWith(MENU_TAG)) api.bs.effects.splice(i, 1);
  }
}

// --- Chat Picks: chat's penalty list ------------------------------------------

/** The four penalties chat can roll. Each is a pure predicate over the
 * carrier's own moves; matching moves are spliced out (king captures are always
 * exempt, so the card can never block the winning move, and the forced-pass
 * rule catches the rare zero-move turn). */
const CHAT_PENALTIES: { label: string; drop: (m: Move) => boolean }[] = [
  {
    label: "no move longer than two squares",
    drop: (m) =>
      Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) > 2,
  },
  {
    label: "your queen and rooks cannot capture",
    drop: (m) => !!m.captured && (m.piece === "q" || m.piece === "r"),
  },
  {
    label: "your pieces cannot move backward",
    drop: (m) => (m.color === "w" ? RANK(m.to) < RANK(m.from) : RANK(m.to) > RANK(m.from)),
  },
  {
    label: "your knights cannot capture",
    drop: (m) => !!m.captured && m.piece === "n",
  },
];

export const CREATOR_CARDS: Buff[] = [
  // Eric Rosen. The Stafford Gambit identity: a piece that is obviously free,
  // is not free, and the calm little "oh no" while the trap closes.
  card(
    {
      id: "cr_stalling_bishop",
      name: "Rosen's Stafford Trap",
      description:
        "Mark one of your knights or bishops as bait. If an enemy piece takes it within their next 3 turns, that piece is trapped in place for 2 of their turns and you gain 20 seconds. If nobody bites, the bait cannot be captured for 2 turns.",
      tip: "Their king can never be trapped, so a king taking the bait only pays you the time. Hang the bait somewhere tempting.",
      tier: 7,
      category: "protection",
      requires: ["n", "b"],
      icon: "Church",
      flavor: "Oh no... my knight. Anyway.",
      fx: { motif: "ward", pieces: ["n", "b"], self: true },
    },
    activated(
      steps(
        squareStep("Choose the knight or bishop to dangle", (api) =>
          mySquares(api.board, api.me).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return t === "n" || t === "b";
          }),
        ),
      ),
      (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.oppTurns = 3;
      },
      {
        // The card lingers after activation to watch for the bite, so it must
        // not be pruned on use; it marks itself spent when the trap resolves.
        spendOnUse: false,
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          // Follow the bait when its owner moves it: the trap stays on the
          // piece, not the square.
          if (move.color === api.me) {
            if (move.from === sq) inst.state.sq = move.to;
            return;
          }
          if (move.color !== api.opp) return;
          const left = (inst.state.oppTurns as number) ?? 0;
          if (left <= 0) return;
          if (captureSquare(move) === sq) {
            // They took the bait. The capturer is standing on the bait square
            // now (knights and bishops are never captured en passant); kings
            // are never frozen, so a king bite only pays the clock. Created
            // inside the biter's OWN completed move, so the handover tick that
            // follows this hook burns one turn immediately: 3 here delivers
            // the promised 2 full turns of their being stuck.
            if (api.board.pieces[move.to]?.type !== "k") {
              addEffect(api, {
                kind: "freeze",
                sq: move.to,
                owner: api.opp,
                turns: 3,
                skin: "beartrap",
              });
            }
            api.adjustClock({ addSelfSec: 20 });
            inst.spent = true;
            return;
          }
          // The bait died some other way (a blast, a removal): the trap
          // fizzles rather than rewarding a bite that never happened.
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) {
            inst.spent = true;
            return;
          }
          const next = left - 1;
          inst.state.oppTurns = next;
          if (next <= 0) {
            // They resisted for 3 turns: the bait springs upright and becomes
            // untouchable for a while. Same handover-tick accounting as the
            // freeze above (this shield ticks on THEIR moves, and it is born
            // inside one): 3 delivers the promised 2 turns of protection.
            addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
            inst.spent = true;
          }
        },
        status: (inst: BuffInstance) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return "activate to set the bait";
          return `bait at ${sqName(sq)}, ${(inst.state.oppTurns as number) ?? 0} of their turns to bite`;
        },
      },
    ),
  ),

  // GothamChess. The catchphrase is the mechanic: for two turns one rook is
  // THE ROOK, and every capture it announces pays the clock.
  card(
    {
      id: "cr_oh_no_my_queen",
      name: "Gotham's THE ROOK!!",
      description:
        "Pick one of your rooks. For your next 2 turns it moves like a queen, and every capture it makes gains you 10 seconds.",
      tip: "Open a diagonal for it before you play this: two turns go fast, and a boxed-in rook is still a boxed-in rook.",
      tier: 8,
      category: "movement",
      requires: ["r"],
      icon: "Crown",
      flavor: "He cannot take the rook. He CANNOT take the... THE ROOOOOK!!!",
      fx: { motif: "empower", pieces: ["r"], moveAs: "q", self: true },
    },
    activated(
      steps(squareStep("Choose the rook", (api) => mySquares(api.board, api.me, "r"))),
      (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 2;
      },
      {
        // Lingers for the two empowered turns, then marks itself spent.
        spendOnUse: false,
        augmentMoves: (moves: Move[], inst: BuffInstance, api: BuffApi) => {
          if (turnsLeft(inst) <= 0) return;
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me || p.type !== "r") return;
          // A rook plus diagonals is a queen; the straight lines are already
          // its own.
          addNovel(moves, slideMoves(api.board, sq, DIAG_DIRS, inst.id));
        },
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          if (turnsLeft(inst) <= 0) return;
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return;
          if (move.color === api.me) {
            if (move.from === sq) {
              inst.state.sq = move.to;
              if (move.captured) api.adjustClock({ addSelfSec: 10 });
            }
            const t = turnsLeft(inst) - 1;
            inst.state.turns = t;
            if (t <= 0) inst.spent = true;
          } else if (captureSquare(move) === sq || move.to === sq) {
            // THE ROOK has been taken. The bit is over.
            inst.spent = true;
          }
        },
        status: (inst: BuffInstance) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return "activate to crown a rook";
          return `THE ROOK at ${sqName(sq)}, ${turnsLeft(inst)} of your turns left`;
        },
      },
    ),
  ),

  // Anna Cramling. Family chess on camera: a truce piece nobody may take,
  // nothing hidden, and everyone can see exactly what everyone is eyeing.
  card(
    {
      id: "cr_family_game_night",
      name: "Cramling Family Night",
      description:
        "Choose one enemy piece. For 4 turns nobody may capture it, each player sees the cards in the other's next draft, and the biggest piece each side is attacking wears a name tag.",
      tip: "Kings are family, they never get tagged. The reveal cuts both ways, so play it when reading their next draft helps you more.",
      tier: 7,
      category: "info",
      icon: "Users",
      flavor: "Nobody is out to get anybody. We can all see you eyeing the queen, dear.",
      fx: { motif: "blindfold", pieces: "all" },
    },
    activated(
      steps(squareStep("Choose the piece nobody may take", (api) => enemyNonKingSquares(api))),
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        // Uncapturable for BOTH sides: a shield owned by the piece's own colour
        // stops us taking it, and the filter below stops them trading it off.
        addEffect(api, { kind: "shield", owner: api.opp, squares: [sq], turns: 4 });
        // Mutual openness. Both flags, deliberately: the card's whole character
        // is that it is not an advantage, it is a truce.
        api.mine.flags.seeOppCards = true;
        api.theirs.flags.seeOppCards = true;
        // First pass of the menu tags, so the lamp comes on immediately.
        refreshMenuTags(api);
      },
      {
        // Lingers through the truce to keep the tags honest, then cleans up.
        spendOnUse: false,
        filterOpponentMoves: (moves: Move[], inst: BuffInstance) =>
          turnsLeft(inst) <= 0
            ? moves
            : moves.filter((m) => m.to !== (inst.state.sq as number | undefined)),
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          if (turnsLeft(inst) <= 0) return;
          // The truce piece never moves colour, but it can move square.
          if (move.from === (inst.state.sq as number | undefined)) inst.state.sq = move.to;
          refreshMenuTags(api);
          if (move.color === api.me) {
            const t = turnsLeft(inst) - 1;
            inst.state.turns = t;
            if (t <= 0) {
              clearMenuTags(api);
              inst.spent = true;
            }
          }
        },
        status: (inst: BuffInstance) => {
          const sq = inst.state.sq as Square | undefined;
          if (sq == null) return "activate to call family night";
          return `truce on ${sqName(sq)}, ${turnsLeft(inst)} turns left`;
        },
      },
    ),
  ),

  // Daniel Naroditsky. The speedrun identity: relentless forward pressure, and
  // the splits pay better the longer the run keeps going.
  card(
    {
      id: "cr_speedrun_protocol",
      name: "Danya's Speedrun",
      description:
        "For your opponent's next 6 turns they may only play a capture, a check, or a pawn move. Each held turn pays you more time: 2 seconds, then 3, then 4, and so on.",
      tip: "It forces them forward, which is exactly wrong for a defensive setup, and the escalating splits reward letting it run its full length.",
      tier: 8,
      category: "tempo",
      icon: "Gauge",
      flavor: "We take, we push, the splits are green. Speedrun continues.",
      fx: { motif: "slow", pieces: "all" },
    },
    (() => {
      const base = timedOppFilter(6, (moves, _inst, api) =>
        moves.filter((m) => {
          if (m.captured || m.piece === "p") return true;
          // Does it give check? Play it on a copy and look at my own king. This
          // runs on the opponent's whole move list, so it is deliberately the
          // last test, after the two cheap ones above.
          const k = kingSquare(api.board, api.me);
          if (k == null) return false;
          try {
            const after = makeMove(api.board, m);
            const myKing = kingSquare(after, api.me);
            return myKing != null && attackersOf(after, api.opp, myKing).length > 0;
          } catch {
            return false;
          }
        }),
      );
      return {
        ...base,
        // The splits ride the same turn counter as the filter, and each one
        // pays a second more than the last: 2, 3, 4, 5, 6, 7. The window is
        // read BEFORE the base tick so the final held turn still pays.
        onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
          const active = turnsLeft(inst) > 0;
          base.onMovePlayed?.(inst, move, api);
          if (move.color === api.opp && active) {
            const paid = (inst.state.paid as number) ?? 0;
            api.adjustClock({ addSelfSec: 2 + paid });
            inst.state.paid = paid + 1;
          }
        },
      } as Mech;
    })(),
  ),

  // The format card: creator versus chat, which docs/marketing-plan.md names as
  // the specific hook to sell. Chat gets the wheel; the creator gets paid.
  card(
    {
      id: "cr_chat_picks",
      name: "Chat Picks: Creator vs Chat",
      description:
        "Chat rolls two of its four penalties and pins one on you at random for your next 10 turns. In exchange, you take both cards in your next draft.",
      tip: "A card you play against yourself for content. The status line shows what chat rolled, and both cards next draft are the payoff.",
      tier: 7,
      category: "draft",
      icon: "MessageSquare",
      flavor: "Chat, what do we do here. ...No. No, not that. Chat. CHAT.",
      fx: { motif: "anchor", pieces: "all", self: true },
    },
    {
      kind: "activated",
      // Lingers to enforce the rolled penalty for 10 of the carrier's turns.
      spendOnUse: false,
      effect: (inst, api) => {
        if (inst.state.pick != null) return;
        // All three draws come from api.rng (seeded from the synced public
        // state), so every replica rolls the identical pair and pick.
        const a = api.rng.int(CHAT_PENALTIES.length);
        let b = api.rng.int(CHAT_PENALTIES.length - 1);
        if (b >= a) b += 1;
        inst.state.optA = a;
        inst.state.optB = b;
        inst.state.pick = api.rng.next() < 0.5 ? a : b;
        inst.state.turns = 10;
        // The compensation: your next offer, you keep both cards.
        api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      },
      augmentMoves: (moves: Move[], inst: BuffInstance) => {
        if (turnsLeft(inst) <= 0) return;
        const pen = CHAT_PENALTIES[(inst.state.pick as number) ?? -1];
        if (!pen) return;
        // Remove in place: augmentMoves owns the array. King captures are
        // always exempt (the card may never block the winning move), and the
        // forced-pass rule catches the rare turn this leaves empty, so it can
        // never lose the game on its own.
        for (let i = moves.length - 1; i >= 0; i--) {
          const m = moves[i];
          if (m.captured === "k") continue;
          if (pen.drop(m)) moves.splice(i, 1);
        }
      },
      onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
        if (move.color === api.me && turnsLeft(inst) > 0) {
          const t = turnsLeft(inst) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst: BuffInstance) => {
        const pick = inst.state.pick as number | undefined;
        if (pick == null) return "activate to hand chat the wheel";
        const a = inst.state.optA as number;
        const b = inst.state.optB as number;
        const off = pick === a ? b : a;
        return `chat picked "${CHAT_PENALTIES[pick].label}" over "${CHAT_PENALTIES[off].label}", ${turnsLeft(inst)} of your turns left`;
      },
    },
  ),
];
