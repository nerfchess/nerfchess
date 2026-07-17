// Hex wave 2 — the 2026-07 nerf-mode expansion's hex batch. Hexes here are
// curse-structured, not recolored nerfs: marks that transfer, delayed
// punishments, spreading ground, condition contracts, stack-morphing dooms.
// Concatenated into NEW_HEXES by ./index.ts; ids must not collide with any
// existing card. Animation flagships live in
// src/components/effects/cursePlays.tsx.
//
// Authoring rules observed throughout (same as the tier1-8 files):
//   - every opponent-move filter keeps a non-empty fallback (never soft-locks);
//   - kings are never frozen, walnutted, or removed;
//   - api.rng is drawn ONLY inside init / effect / onMovePlayed (the replayed
//     paths), never in targets() or status();
//   - effects added DURING the victim's own move are ticked once by the shared
//     post-move pass, so they are written with turns = N + 1 to bite for N;
//   - each card's mechanic is unique against the full existing pool (tier1-8
//     hex files, library.ts hexes, and the themed sets under fantasy/, funny/,
//     mystic/, pt/ and wild/ — see docs/2026-07-17-hex-wave2-design.md for the
//     per-card differentiation notes).

import type { Buff, BuffApi, BuffInstance, Move, Square } from "./shared";
import {
  addEffect,
  curse,
  emptySquares,
  isInCheck,
  mySquares,
  relRank,
  tickTurns,
  tierHexes,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H1 = tierHexes(1);
const H2 = tierHexes(2);
const H3 = tierHexes(3);
const H4 = tierHexes(4);
const H5 = tierHexes(5);
const H6 = tierHexes(6);
const H7 = tierHexes(7);
const H8 = tierHexes(8);

/** Chebyshev (king-step) distance between two squares. */
const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

/** The square a move captures on, if any (handles en passant). */
const capSq = (m: Move): Square | null => m.capturedSquare ?? (m.captured ? m.to : null);

const sqName = (sq: Square) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;

/** The four center squares (d4, e4, d5, e5). */
const CENTER: Square[] = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];

/** Follow a single tracked enemy/friendly square across a move. Returns the
 * updated square, or null when the tracked piece was captured (something else
 * landed on it, or an en-passant style capture removed it). */
function followSq(sq: Square | null, move: Move): Square | null {
  if (sq == null) return null;
  if (move.capturedSquare === sq && move.from !== sq) return null;
  if (move.from === sq && move.to !== sq) return move.to;
  if (move.to === sq && move.from !== sq) return null;
  return sq;
}

export const HEX_WAVE2: Buff[] = [
  // =========================================================================
  // TIER 1 — small, fully readable curses with a twist of structure.
  // =========================================================================

  // --- rolling protection framed as a curse: revenge is forbidden ----------
  // Not another "X cannot capture" rung: the ban follows YOUR OWN latest move,
  // so which piece is untouchable changes every turn and is chosen by you.
  H1(
    {
      id: "hw2_witchs_veto",
      name: "Witch's Veto",
      description:
        "The witch forbids revenge: for your opponent's next 4 turns, they cannot capture the piece you moved on your previous turn. Everything else is fair game — they can attack other pieces or simply wait a turn for the veto to move on.",
      flavor: "You may not strike back. Those are the rules of the feud.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        // The piece I moved last: my most recent history entry's destination.
        const hist = api.board.history;
        let veto: Square | null = null;
        for (let i = hist.length - 1; i >= 0; i--) {
          if (hist[i].color === api.me) {
            veto = hist[i].to;
            break;
          }
        }
        if (veto == null) return moves;
        const kept = moves.filter((m) => capSq(m) !== veto);
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- countdown trigger in its simplest readable form ----------------------
  // Not a second Wasted Hour (T3's immediate pawn-or-king turn): the same
  // one-turn seizure, but DELAYED on a visible three-turn fuse the opponent
  // can plan around — the wave's smallest "triggers after a certain move".
  H1(
    {
      id: "hw2_bad_omen",
      name: "Bad Omen",
      description:
        "A dark omen is read over their camp: on your opponent's 3rd turn from now, it strikes — that one turn, they may move only a pawn or their king. They can see it coming and set up around it.",
      flavor: "The crows circled the tent three whole days.",
      fx: { motif: "slow", pieces: ["n", "b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        // The omen only bites on its final turn of the fuse.
        if (turnsLeft(inst) !== 1 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) =>
        turnsLeft(inst) > 1
          ? `the omen strikes in ${turnsLeft(inst)} of their turns`
          : "the omen strikes this turn",
    },
  ),

  // --- cursed trail: the ground remembers where they stood ------------------
  // Dynamic, self-inflicted terrain (unlike the static Landlord traps or the
  // fixed barred zones): each square they LEAVE is sealed for one turn, so
  // shuffling a piece back and forth is quietly punished.
  H1(
    {
      id: "hw2_cold_footprints",
      name: "Cold Footprints",
      description:
        "The ground remembers their tread: for your opponent's next 5 turns, whenever they move a piece, the square it left is frozen over for their following turn — no enemy piece may step onto it. Retracing their own steps is what the curse hates most.",
      flavor: "Walk away and the door ices shut behind you.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.from !== move.to) {
          // Added during their own move, so the shared post-move tick eats one
          // turn immediately: 2 here seals the square for exactly 1 turn.
          addEffect(api, { kind: "barred", squares: [move.from], against: api.opp, turns: 2 });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // =========================================================================
  // TIER 2 — one mark, one delayed price, one contract.
  // =========================================================================

  // --- compulsion mark, cleansed by obedience -------------------------------
  // Not funny/curses' Homesick (whole army may only retreat, timed): a single
  // marked piece is CALLED home, and reaching its own back rank lifts the
  // curse at once — the wave's simplest "cleansable through an action".
  H2(
    {
      id: "hw2_long_road_home",
      name: "The Long Road Home",
      description:
        "Lay a calling on one enemy knight, bishop or rook: every move it makes must bring it closer to its own back rank. The curse lifts the moment it stands on that rank; otherwise it fades after 6 of their turns. Their other pieces are free — the victim can simply obey, stand still, or be played around.",
      flavor: "Its name is spoken at the hearth, and its feet must answer.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece called home",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) => m.from !== sq || relRank(api.opp, m.to) < relRank(api.opp, m.from),
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const next = followSq(sq, move);
        if (next == null) {
          // The marked piece is gone; the calling dies with it.
          inst.spent = true;
          return;
        }
        inst.state.sq = next;
        if (move.color === api.opp && move.from === sq && relRank(api.opp, next) === 1) {
          // It answered the call and stands at home: the curse lifts.
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to lay the calling"
          : `calling ${sqName(sq)} home, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // --- a delayed price on their next kill -----------------------------------
  // Not Twist the Knife / Walnut Curse (which bind the capturing PIECE) and
  // not Union Rules (a capture cooldown): the price is a whole stolen TURN,
  // paid once, and the opponent chooses when — or whether — to pay it.
  H2(
    {
      id: "hw2_blood_price",
      name: "Blood Price",
      description:
        "A price is set on your blood: the next time your opponent captures one of your pieces within their next 6 turns, they must skip their following turn while the debt is collected. If they hold their blades for 6 turns, the price expires unpaid.",
      flavor: "Take what you like. The collector calls the same evening.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          api.bs.skips[api.opp] += 1;
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `awaiting their next capture, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- a tax on coronations, not a ban --------------------------------------
  // Not Stage Fright (which forbids promotion outright): promotion stays
  // legal, but the new-crowned piece arrives exhausted — a condition trigger
  // the opponent can defer or knowingly pay.
  H2(
    {
      id: "hw2_tarnished_crown",
      name: "Tarnished Crown",
      description:
        "Their coronations are cursed: for your opponent's next 6 turns, any pawn they promote arrives exhausted — the new piece is frozen for 2 of their turns the moment it is crowned. They can wait the curse out or pay the price knowingly.",
      flavor: "The crown fits. It just weighs like a gravestone.",
      fx: { motif: "slow", pieces: ["p"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.promotion) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type !== "k") {
            // Added during their own move: 3 leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "rust" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // =========================================================================
  // TIER 3 — rhythms, recoil, momentum, rations.
  // =========================================================================

  // --- a player-attached rhythm: the bell tolls every other turn ------------
  // No existing card restricts on an ALTERNATING cadence; the victim plans
  // slider moves for the quiet turns and minor/pawn play for the loud ones.
  H3(
    {
      id: "hw2_tolling_bell",
      name: "Tolling Bell",
      description:
        "A cracked bell hangs over their army: starting with your opponent's next turn and on every second turn after (their 1st, 3rd and 5th), its toll deafens the long arms — their bishops, rooks and queen cannot move on tolling turns. On the quiet turns in between, everything moves freely. Fades after their 6th turn.",
      flavor: "You learn to march between the tolls.",
      fx: { motif: "slow", pieces: ["b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst) => {
        // Tolling turns are those with an EVEN count remaining (6, 4, 2):
        // their 1st, 3rd and 5th turns under the curse.
        if (turnsLeft(inst) <= 0 || turnsLeft(inst) % 2 !== 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "b" && m.piece !== "r" && m.piece !== "q");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) =>
        turnsLeft(inst) % 2 === 0
          ? `the bell tolls this turn — ${turnsLeft(inst)} of their turns left`
          : `quiet turn — ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- every kill kicks the killer back where it came from ------------------
  // Not Trapdoor / Riptide / Lava Floor (knockback from PLACES): the recoil
  // is triggered by the act of CAPTURING, anywhere — the capture stands, but
  // the piece never keeps the square it won.
  H3(
    {
      id: "hw2_curse_of_recoil",
      name: "Curse of Recoil",
      description:
        "Their weapons kick like cannons: for your opponent's next 3 turns, any piece of theirs that captures is flung straight back to the square it attacked from (the victim is still taken, but the ground is not). Captures that promote are too heavy to throw back.",
      flavor: "The blow lands. The armsman does not.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.captured &&
          !move.promotion &&
          move.from !== move.to
        ) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && !api.board.pieces[move.from]) {
            api.relocate(move.to, move.from);
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- momentum curse: slides cannot stop short -----------------------------
  // A rule DISTORTION, not a clamp (Molasses & co. shorten reach; this card
  // removes the option to stop): every slide must run to the end of its line.
  H3(
    {
      id: "hw2_no_reins",
      name: "No Reins",
      description:
        "Their long pieces bolt: for your opponent's next 4 turns, every bishop, rook or queen slide must run as far as the line allows — to the board's edge, into a capture, or right up against one of their own pieces. No stopping halfway. Knights, pawns and the king keep their footing.",
      flavor: "The horses took the bits in their teeth.",
      fx: { motif: "anchor", pieces: ["b", "r", "q"] },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if ((m.piece !== "b" && m.piece !== "r" && m.piece !== "q") || m.castle) return true;
        const adf = Math.abs(FILE(m.to) - FILE(m.from));
        const adr = Math.abs(RANK(m.to) - RANK(m.from));
        // Non-slide shapes (buff-granted leaps) are not runaway lines.
        if (adf !== 0 && adr !== 0 && adf !== adr) return true;
        if (m.captured) return true; // a capture IS the end of the line
        const df = Math.sign(FILE(m.to) - FILE(m.from));
        const dr = Math.sign(RANK(m.to) - RANK(m.from));
        const f = FILE(m.to) + df;
        const r = RANK(m.to) + dr;
        if (!inBoard(f, r)) return true; // ran out of board
        const next = api.board.pieces[SQ(f, r)];
        // Stopped against their own piece: the line truly ends here. Stopping
        // one short of an enemy piece is refusing the capture — forbidden.
        return !!next && next.color === api.opp;
      }),
    ),
  ),

  // --- a capture budget, spent however they like -----------------------------
  // Not Palsied Hands (no two captures in a row) or Cream Pie (a flat ban):
  // the opponent gets exactly two kills to spend across the whole window and
  // chooses which fights are worth them.
  H3(
    {
      id: "hw2_war_rations",
      name: "War Rations",
      description:
        "Their war chest is sealed to two requisitions: across your opponent's next 5 turns they may make at most 2 captures. Once both are spent, their army cannot capture at all until the curse ends. They pick which battles are worth the ration.",
      flavor: "The quartermaster stamps two chits. The rest is on credit.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
        inst.state.caps = 2;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        if (((inst.state.caps as number) ?? 0) > 0) return moves;
        const kept = moves.filter((m) => !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          inst.state.caps = Math.max(0, ((inst.state.caps as number) ?? 0) - 1);
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `${(inst.state.caps as number) ?? 0} captures left, ${turnsLeft(inst)} of their turns`,
    },
  ),

  // =========================================================================
  // TIER 4 — multi-move influence: countdowns, tallies, bonds.
  // =========================================================================

  // --- the hour approaches, and it remembers who moved ----------------------
  // Not Doom March (an immediate stay-where-you-are filter) and not Celestial
  // Alignment (frozen by square color): the freeze lands ONLY on pieces the
  // opponent chose to move during the countdown, so playing narrow is the
  // whole defense.
  H4(
    {
      id: "hw2_witching_hour",
      name: "The Witching Hour",
      description:
        "Midnight creeps up on their army: for your opponent's next 4 turns, every piece they move is touched by the hour. When midnight strikes at the end of those 4 turns, all touched pieces freeze for 2 of their turns. Moving few pieces — or only ones they can spare — keeps the damage down.",
      flavor: "Whatever stirred after dark, the hour keeps.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.touched = [] as Square[];
      },
      onMovePlayed: (inst, move, api) => {
        let touched = (inst.state.touched as Square[] | undefined) ?? [];
        // Follow every touched square across the move (captures drop marks).
        touched = touched
          .map((sq) => followSq(sq, move))
          .filter((sq): sq is Square => sq != null);
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.from !== move.to) {
          if (!touched.includes(move.to)) touched.push(move.to);
          if (turnsLeft(inst) === 1) {
            // Midnight. Freeze every touched piece still on the board.
            for (const sq of touched) {
              const p = api.board.pieces[sq];
              if (p && p.color === api.opp && p.type !== "k") {
                // Added during their own move: 3 leaves exactly 2 turns.
                addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 3 });
              }
            }
          }
        }
        inst.state.touched = touched;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `${((inst.state.touched as Square[] | undefined) ?? []).length} pieces touched, midnight in ${turnsLeft(inst)} of their turns`,
    },
  ),

  // --- overwork collapses the workhorse -------------------------------------
  // Not Ball and Chain / Groundhog Day (which FORCE or FORBID repetition) and
  // not Rust (which punishes idleness): the third move of any single piece
  // inside the window drops it — riding one strong piece is what breaks.
  H4(
    {
      id: "hw2_weight_of_toil",
      name: "Weight of Toil",
      description:
        "The curse counts every errand: for your opponent's next 6 turns, any single piece that makes its third move in that time collapses under the toil and becomes a walnut for 2 of their turns (shuffling one square at a time). Spreading the work across the army avoids it entirely. Kings never collapse.",
      flavor: "The willing horse is the one that founders.",
      fx: { motif: "slow", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.counts = {} as Record<number, number>;
      },
      onMovePlayed: (inst, move, api) => {
        const counts = (inst.state.counts as Record<number, number> | undefined) ?? {};
        // A tracked piece captured by me (or landed on) loses its tally.
        const gone = capSq(move);
        if (move.color === api.me && gone != null && counts[gone] != null) delete counts[gone];
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.from !== move.to) {
          const c = (counts[move.from] ?? 0) + 1;
          delete counts[move.from];
          if (c >= 3 && move.piece !== "k") {
            const p = api.board.pieces[move.to];
            if (p && p.color === api.opp) {
              // Added during their own move: 3 leaves exactly 2 turns.
              addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 3 });
            }
            counts[move.to] = 0;
          } else {
            counts[move.to] = c;
          }
        }
        inst.state.counts = counts;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- the curse feeds on curses: scales with active afflictions ------------
  // The wave's "changes when stacked" card: alone it is a 1-turn freeze; on a
  // board already groaning under seals and stone it holds up to 4 turns. The
  // count reads only synced effect state, so it can never desync.
  H4(
    {
      id: "hw2_compounding_misery",
      name: "Compounding Misery",
      description:
        "Misery multiplies: freeze one enemy piece you target for 1 of their turns, plus 1 more turn for every other curse-effect already afflicting your opponent (each frozen or petrified piece, sealed ground, or royal edict), up to 4 turns total. Cast onto a clean board it is a small chill; stacked on other hexes it bites deep. Kings cannot be targeted.",
      flavor: "One leech is a nuisance. The third one finds the vein.",
    },
    {
      kind: "activated",
      targets: (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to freeze",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        let count = 0;
        for (const e of api.bs.effects) {
          if (!(e.turns == null || e.turns > 0)) continue;
          if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.opp) count++;
          else if (e.kind === "short_leash" && e.owner === api.opp) count++;
          else if (
            (e.kind === "barred" || e.kind === "king_only" || e.kind === "no_pawn_advance") &&
            e.against === api.opp
          )
            count++;
        }
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: Math.min(4, 1 + count) });
      },
    },
  ),

  // --- sympathetic magic: two pieces, one fate ------------------------------
  // Not Chains of Binding (rooks tethered by DISTANCE): the bond transmits
  // MOTION — using either of the pair stuns the other, so the opponent must
  // bench one of two pieces of your choosing.
  H4(
    {
      id: "hw2_twinned_torment",
      name: "Twinned Torment",
      description:
        "Stitch two enemy pieces into one fate: for your opponent's next 6 turns, whenever one of the bound pair moves, the other seizes up and is frozen for 1 turn. They can still use one of the two freely — but only by leaving its twin nailed down. A captured twin slips the bond and frees the other. Kings cannot be bound.",
      flavor: "Two dolls, one thread. Pull either arm.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.a != null
          ? null
          : {
              kind: "square",
              label: picks.length === 0 ? "Choose the first piece to bind" : "Choose its twin",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.a != null) return;
        const a = picks[0]?.square;
        const b = picks[1]?.square;
        if (a == null || b == null) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        let a = (inst.state.a as Square | null | undefined) ?? null;
        let b = (inst.state.b as Square | null | undefined) ?? null;
        if (a == null && b == null) return;
        const movedA = a != null && move.from === a && move.to !== a;
        const movedB = b != null && move.from === b && move.to !== b;
        a = followSq(a, move);
        b = followSq(b, move);
        inst.state.a = a;
        inst.state.b = b;
        if (a == null && b == null) {
          // Both twins are gone; the thread is cut.
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) > 0 && (movedA || movedB)) {
          const twin = movedA ? b : a;
          if (twin != null) {
            const p = api.board.pieces[twin];
            if (p && p.color === api.opp && p.type !== "k") {
              // Added during their own move: 2 leaves exactly 1 turn.
              addEffect(api, { kind: "freeze", sq: twin, owner: api.opp, turns: 2 });
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const a = inst.state.a as Square | null | undefined;
        const b = inst.state.b as Square | null | undefined;
        if (a == null && b == null) return "activate to bind two pieces";
        return `bound ${a != null ? sqName(a) : "—"} & ${b != null ? sqName(b) : "—"}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // =========================================================================
  // TIER 5 — curses that MOVE: a coin that passes, ground that spreads,
  //          a ransom on the crown, a court that can be freed.
  // =========================================================================

  // --- the mark that transfers between pieces --------------------------------
  // The wave's "transfers between pieces" card. Not Hot Potato (a compulsion
  // to move a fixed piece): the coin hobbles its holder AND leaps to any
  // piece that comes within arm's reach, so the whole army must keep its
  // distance from its own cursed comrade.
  H5(
    {
      id: "hw2_cursed_coin",
      name: "Cursed Coin",
      description:
        "Press a cursed coin into one enemy piece's hand: for your opponent's next 8 turns the holder cannot capture and can move at most 2 squares. The coin is eager to be passed — whenever the holder ends a move beside another of their pieces, or one of their pieces ends a move beside the holder, the coin jumps to that piece. Quarantining the holder away from the army contains it; capturing the holder yourself destroys the coin. Kings never take the coin.",
      flavor: "Everyone swears they will not hold it long.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece that takes the coin",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 8;
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) => m.from !== sq || (!m.captured && cheb(m.from, m.to) <= 2),
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        const heldMoved = move.from === sq && move.to !== sq;
        sq = followSq(sq, move);
        if (sq == null) {
          // The holder was captured: the coin is destroyed with it.
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const isCatcher = (s: Square) => {
            const p = api.board.pieces[s];
            return !!p && p.color === api.opp && p.type !== "k";
          };
          if (heldMoved) {
            // The holder sidled up to a comrade: the coin changes hands.
            const near = mySquares(api.board, api.opp).filter(
              (s) => s !== sq && cheb(s, sq!) === 1 && isCatcher(s),
            );
            if (near.length) sq = near[api.rng.int(near.length)];
          } else if (move.to !== sq && cheb(move.to, sq) === 1 && isCatcher(move.to)) {
            // A comrade wandered too close: the coin leaps to it.
            sq = move.to;
          }
        }
        inst.state.sq = sq;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | null | undefined;
        return sq == null
          ? "activate to press the coin"
          : `coin held at ${sqName(sq)}, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // --- ground-rot that spreads across tiles ---------------------------------
  // The wave's "spreads across tiles" card. Not Sinkhole / Black Hole (static
  // traps that swallow) and not the fixed barred zones: the blight seals its
  // square and CREEPS one adjacent square per turn through their half, so the
  // opponent watches their own ground close up and routes around it.
  H5(
    {
      id: "hw2_creeping_blight",
      name: "Creeping Blight",
      description:
        "Blight one square in your opponent's half of the board: no enemy piece may move onto blighted ground (pieces already standing there may still leave). On each of their next turns the blight creeps to one more adjacent square in their half, for 5 of their turns, then the whole patch withers away. Play around the spread — or stay out of its half entirely.",
      flavor: "First one flagstone went grey. By Friday, the courtyard.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: "Choose the square where the blight takes root",
              squares: emptySquares(api.board, (sq) => relRank(api.opp, sq) <= 4),
            },
      effect: (inst, api, picks) => {
        if (inst.state.squares != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.squares = [sq] as Square[];
        inst.state.turns = 5;
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 5 });
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const frontier: Square[] = [];
          for (let sq = 0; sq < 64; sq++) {
            if (relRank(api.opp, sq) > 4 || squares.includes(sq)) continue;
            if (squares.some((b) => cheb(b, sq) === 1)) frontier.push(sq);
          }
          if (frontier.length) {
            const next = frontier[api.rng.int(frontier.length)];
            squares.push(next);
            // Added during their move (ticked once immediately), so the fresh
            // patch expires together with the original blight.
            addEffect(api, {
              kind: "barred",
              squares: [next],
              against: api.opp,
              turns: turnsLeft(inst),
            });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        return !squares?.length
          ? "activate to plant the blight"
          : `${squares.length} squares blighted, ${turnsLeft(inst)} of their turns left`;
      },
    },
  ),

  // --- a contract on the crown: she may move, but the court pays ------------
  // Not Cold Open / Shackle the Queen (queen bans) or Throne Bound (a leash):
  // the queen stays fully legal, and every use of her freezes two of her own
  // court — a price the opponent weighs move by move.
  H5(
    {
      id: "hw2_queens_ransom",
      name: "Queen's Ransom",
      description:
        "A ransom is set on her majesty's steps: for your opponent's next 5 turns, each time they move their queen, two other pieces of theirs (chosen by the curse) are seized as surety and frozen for 1 turn. The queen herself is never restrained — benching her costs nothing, using her taxes the court.",
      flavor: "Her majesty may walk wherever she pleases. The escort is billed.",
      fx: { motif: "slow", pieces: ["q"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.piece === "q") {
          const pool = mySquares(api.board, api.opp).filter(
            (sq) => sq !== move.to && api.board.pieces[sq]!.type !== "k",
          );
          for (let n = 0; n < 2 && pool.length > 0; n++) {
            const i = api.rng.int(pool.length);
            const sq = pool.splice(i, 1)[0];
            // Added during their own move: 2 leaves exactly 1 turn.
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- a mass petrify with a stated, difficult cure -------------------------
  // Not Statue Garden / Hex of Stone (fixed-length minor petrifies): the
  // court can be FREED early, but only by marching the king to the center of
  // the board — a real, risky cleansing action the opponent must weigh.
  H5(
    {
      id: "hw2_bound_court",
      name: "Chains of the Court",
      description:
        "Your opponent's knights and bishops are chained into stone for 4 of their turns (walnuts that shuffle one square at a time). The chains have a lock: if their KING steps onto one of the four center squares (d4, e4, d5, e5) while the curse holds, every petrified courtier is freed at once. Wait it out in safety, or walk the king into the open to break it early.",
      flavor: "The key was hung in the middle of the battlefield. Of course it was.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 4;
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t === "n" || t === "b") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.piece === "k" &&
          CENTER.includes(move.to)
        ) {
          // The king turned the key: free every petrified minor.
          for (let i = api.bs.effects.length - 1; i >= 0; i--) {
            const e = api.bs.effects[i];
            if (e.kind !== "walnut" || e.owner !== api.opp || e.turns <= 0) continue;
            const p = api.board.pieces[e.sq];
            if (p && p.color === api.opp && (p.type === "n" || p.type === "b")) {
              api.bs.effects.splice(i, 1);
            }
          }
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left — their king can unlock it at the center`,
    },
  ),

  // =========================================================================
  // TIER 6 — flagship-rare: a storm that mounts, ground that remembers
  //          killings, gold that spreads by touch.
  // =========================================================================

  // --- the curse that grows stronger over time ------------------------------
  // The wave's escalation card. Unlike every fixed-strength filter in the
  // pool, the storm WORSENS in stages the opponent can read off the card:
  // striking early, before it peaks, is the counterplay.
  H6(
    {
      id: "hw2_gathering_storm",
      name: "Gathering Storm",
      description:
        "A storm gathers over their army and worsens every two turns, for your opponent's next 6 turns. Turns 1–2: their pawns cannot advance (captures still allowed). Turns 3–4: their knights and bishops also cannot cross into your half. Turns 5–6: their bishops, rooks and queen are also capped at 2 squares per move. Then it breaks all at once. The early turns are the time to act.",
      flavor: "You could see it coming for miles. That was the point.",
      fx: { motif: "anchor", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      filterOpponentMoves: (moves, inst, api) => {
        const left = turnsLeft(inst);
        if (left <= 0 || moves.length === 0) return moves;
        const stage = left >= 5 ? 1 : left >= 3 ? 2 : 3;
        const kept = moves.filter((m) => {
          if (m.piece === "p" && !m.captured) return false;
          if (stage >= 2 && (m.piece === "n" || m.piece === "b") && relRank(api.opp, m.to) >= 5)
            return false;
          if (
            stage >= 3 &&
            (m.piece === "b" || m.piece === "r" || m.piece === "q") &&
            cheb(m.from, m.to) > 2
          )
            return false;
          return true;
        });
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => {
        const left = turnsLeft(inst);
        const stage = left >= 5 ? 1 : left >= 3 ? 2 : 3;
        return `storm stage ${stage} of 3, ${left} of their turns left`;
      },
    },
  ),

  // --- the ground remembers every killing ------------------------------------
  // Dynamic cursed terrain created by THEIR OWN actions (unlike every fixed
  // barred zone, and unlike Cold Footprints' one-turn trail): each capture
  // they make seals its square for 3 turns, so a killing spree walls their
  // own lines apart.
  H6(
    {
      id: "hw2_gravebloom",
      name: "Gravebloom",
      description:
        "Flowers with long memories: for your opponent's next 6 turns, every square where they capture becomes a grave-garden for 3 of their turns — the capturing piece may leave, but no enemy piece may move onto that square while it blooms. Each kill costs them the ground it was won on; capturing less, or only on squares they don't need, is the way through.",
      flavor: "The garden takes root where the blood went in.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          const sq = capSq(move) ?? move.to;
          // Added during their own move: 4 leaves exactly 3 of their turns.
          addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 4 });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- gold that spreads by touch, and gilded hands cannot kill --------------
  // The accumulating-mark curse: every piece they use is claimed for the rest
  // of the window. The inverse of Weight of Toil (which punishes overusing
  // ONE piece): this punishes breadth, and rewards riding a narrow set of
  // already-gilded pieces or capturing BEFORE a piece is touched.
  H6(
    {
      id: "hw2_gilded_rot",
      name: "Gilded Rot",
      description:
        "Whatever they touch turns to gold: for your opponent's next 5 turns, each piece they move is gilded, and gilded pieces cannot capture for the rest of the curse. Unmoved pieces keep their teeth — so they must choose between developing their game and keeping their army dangerous. When the curse ends the gold flakes off everything at once.",
      flavor: "The blessing of Midas, distributed fairly.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
        inst.state.marked = [] as Square[];
      },
      filterOpponentMoves: (moves, inst) => {
        const marked = (inst.state.marked as Square[] | undefined) ?? [];
        if (turnsLeft(inst) <= 0 || marked.length === 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !marked.includes(m.from) || !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let marked = (inst.state.marked as Square[] | undefined) ?? [];
        marked = marked.map((sq) => followSq(sq, move)).filter((sq): sq is Square => sq != null);
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.from !== move.to &&
          !marked.includes(move.to)
        ) {
          marked.push(move.to);
        }
        inst.state.marked = marked;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `${((inst.state.marked as Square[] | undefined) ?? []).length} pieces gilded, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // =========================================================================
  // TIER 7 — grand workings with a stated cure or cost.
  // =========================================================================

  // --- a death sentence with a bribe clause ---------------------------------
  // The wave's timed_loss hex (no existing hex uses the trade-off timer), and
  // the mirror of the occult Hex Doll (which kills a piece IF it captures):
  // here the piece dies UNLESS it captures. The victim reads the exact count
  // on the board and chooses: feed the bell, trade the piece off, or lose it.
  H7(
    {
      id: "hw2_death_knell",
      name: "Death Knell",
      description:
        "Toll the knell over one enemy piece you target: in 4 of their turns it crumbles to dust and is removed. The bell accepts one bribe — if the doomed piece captures anything before the last toll, the curse breaks and it lives. Your opponent sees the count the whole time: they can feed the bell a pawn, spend the piece in a trade, or gamble on saving it. Kings cannot be tolled.",
      flavor: "Four strokes. Blood on its hands buys the fifth never ringing.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece the bell tolls for",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 4, then: "remove" });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        // Captured by me before the bell finished: the debt is settled.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && move.from === sq) {
          if (move.captured) {
            // The bribe: it drew blood, so the sentence is annulled. Hooks run
            // before the engine's timer-follow, so the effect still sits on
            // move.from at this point; match either square to be safe.
            const idx = api.bs.effects.findIndex(
              (e) =>
                e.kind === "timed_loss" &&
                e.owner === api.opp &&
                e.then === "remove" &&
                (e.sq === move.from || e.sq === move.to),
            );
            if (idx >= 0) api.bs.effects.splice(idx, 1);
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
        }
        // Mirror the engine timer so status() can narrate the countdown; when
        // it hits zero the engine has already collected the piece.
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to toll the bell";
        return `${sqName(sq)} crumbles in ${turnsLeft(inst)} of their turns — a capture by it breaks the curse`;
      },
    },
  ),

  // --- a permanent contract on the crown itself ------------------------------
  // Not Royal Summons (which FORCES king moves): the inverse contract, for
  // the rest of the game — every king move (castling included) costs them the
  // following turn's court. Keeping the king still keeps the curse asleep,
  // which is itself a bind late in the game.
  H7(
    {
      id: "hw2_hollow_crown",
      name: "The Hollow Crown",
      description:
        "The crown itself is cursed, for the rest of the game: whenever your opponent's king moves (castling included), the court mourns — on their FOLLOWING turn they may move only pawns or the king. The curse sleeps as long as the king holds still, so they must choose between a frozen throne and a stumbling court every time the king needs to act.",
      flavor: "Uneasy sits the head. Unbearable, the morning after it stirs.",
      fx: { motif: "slow", pieces: ["k"] },
    },
    {
      kind: "passive",
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.mourn as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (move.piece === "k") inst.state.mourn = 1;
        else if (((inst.state.mourn as number) ?? 0) > 0) inst.state.mourn = 0;
      },
      status: (inst) =>
        ((inst.state.mourn as number) ?? 0) > 0
          ? "the court mourns their next turn"
          : "watching their king",
    },
  ),

  // --- an advancing wall of cursed ground -----------------------------------
  // Not Fissure Field (their back rank sealed, statically) or Scorched Earth
  // (a fixed mid-board band): the ash ADVANCES one rank per turn from their
  // board edge to their 4th rank, evicting the army from its own homeland on
  // a visible schedule before blowing away.
  H7(
    {
      id: "hw2_tide_of_ash",
      name: "Tide of Ash",
      description:
        "Ash rolls in over their homeland: their 1st rank is buried at once, and the tide swallows one more of their home ranks on each of their next 3 turns, up to their 4th rank. Buried ground cannot be moved ONTO by your opponent (pieces standing in the ash may still climb out), so their army is herded forward rank by rank. The whole tide blows away after their 6th turn.",
      flavor: "The mountain did not erupt at the army. It erupted at the address.",
      fx: { motif: "blindfold" },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 6;
        inst.state.front = 1;
        const squares: Square[] = [];
        for (let sq = 0; sq < 64; sq++) if (relRank(api.opp, sq) === 1) squares.push(sq);
        addEffect(api, { kind: "barred", squares, against: api.opp, turns: 6 });
      },
      onMovePlayed: (inst, move, api) => {
        const front = (inst.state.front as number) ?? 1;
        if (move.color === api.opp && turnsLeft(inst) > 0 && front < 4) {
          inst.state.front = front + 1;
          const squares: Square[] = [];
          for (let sq = 0; sq < 64; sq++) if (relRank(api.opp, sq) === front + 1) squares.push(sq);
          // Added during their move (ticked once immediately), so every band
          // of ash expires together after their 6th turn.
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: turnsLeft(inst) });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `ash covers their ranks 1–${(inst.state.front as number) ?? 1}, ${turnsLeft(inst)} of their turns left`,
    },
  ),

  // =========================================================================
  // TIER 8 — legendary contracts. Always avoidable: each states exactly the
  //          action that triggers, cures, or snuffs it.
  // =========================================================================

  // --- the briar that answers every threat to your king ----------------------
  // A condition-broken contract at army scale: nothing is restricted until
  // they CHECK your king; the checking piece is then rooted where it stands.
  // The check itself still lands — the curse punishes the attacker without
  // ever undoing the attack, so it pressures their plan, never their clock.
  H8(
    {
      id: "hw2_crown_of_thorns",
      name: "Crown of Thorns",
      description:
        "A briar is woven around your king, in full view: for your opponent's next 6 turns, any enemy piece whose move leaves your king in check is seized by the thorns and frozen for 2 of their turns where it stands. The check still counts — but the attacker is rooted, and the follow-up must come from somewhere else. Attacking anything BUT your king costs them nothing.",
      flavor: "By all means, reach for the crown.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && isInCheck(api.board, api.me)) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type !== "k") {
            // Added during their own move: 3 leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 3, skin: "vines" });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),

  // --- the queen humbled into a rook, with a bloody way back ------------------
  // The wave's transformation curse (no existing hex touches setPieceType,
  // and the engine's demote timer restores her automatically): a temporary
  // rule distortion on one piece with a stated cure — capture, and the crown
  // comes back at once.
  H8(
    {
      id: "hw2_pauper_crown",
      name: "Pauper's Crown",
      description:
        "Strip the crown from their queen: she is humbled into a ROOK for 4 of their turns, then restored. Blood restores pride sooner — the moment she captures anything while humbled, she becomes a queen again on the spot. She still fights as a full rook the whole time, and if she is captured while humbled she is simply lost as a rook. Requires an enemy queen on the board.",
      flavor: "Walk a mile in a tower's boots, your majesty.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the queen to humble",
              squares: mySquares(api.board, api.opp, "q"),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type !== "q") return;
        inst.state.sq = sq;
        inst.state.turns = 4;
        api.setPieceType(sq, "r");
        // The engine's trade-off timer follows her and restores the crown
        // when it expires; capture prunes it automatically.
        addEffect(api, { kind: "timed_loss", owner: api.opp, sq, turns: 4, then: "demote", into: "q" });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || inst.spent) return;
        // Humbled queen captured: she is gone (as a rook); nothing to restore.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && move.from === sq) {
          if (move.captured) {
            // Blood restores pride: crown her again at once and end the timer.
            // Hooks run before the engine's timer-follow, so the effect still
            // sits on move.from; match either square to be safe.
            const idx = api.bs.effects.findIndex(
              (e) =>
                e.kind === "timed_loss" &&
                e.owner === api.opp &&
                e.then === "demote" &&
                e.into === "q" &&
                (e.sq === move.from || e.sq === move.to),
            );
            if (idx >= 0) api.bs.effects.splice(idx, 1);
            const p = api.board.pieces[move.to];
            if (p && p.color === api.opp && p.type === "r") api.setPieceType(move.to, "q");
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
        }
        // Mirror the engine timer for the status line; at zero the engine has
        // already restored her crown.
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to humble their queen";
        return `humbled at ${sqName(sq)}, crowned again in ${turnsLeft(inst)} of their turns — or on her next capture`;
      },
    },
  ),

  // --- a doomsday beacon carried by one of YOUR pieces -----------------------
  // A countdown the victim can HUNT: the strike is huge but the cure is fully
  // in their hands — kill the bearer and the whole curse dies. Turns six of
  // their turns into a chase across the board, which is the card.
  H8(
    {
      id: "hw2_beacon_of_woe",
      name: "Beacon of Woe",
      description:
        "Light a doom-beacon on one of your OWN pieces, in full view of both players: when your opponent's 6th turn from now ends, every enemy knight, bishop, rook and queen is frozen for 2 of their turns. Snuffing the flame is the only cure — if they capture the beacon-bearer before it strikes, the curse dies with it. You must keep the bearer alive for six turns; they must decide whether to spend those turns hunting it.",
      flavor: "The pyre was lit on the hill where everyone could see. That was a promise.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose your piece that carries the beacon",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null || inst.spent) return;
        sq = followSq(sq, move);
        if (sq == null) {
          // The bearer fell: the beacon is snuffed and the doom dies with it.
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        inst.state.sq = sq;
        if (move.color === api.opp && turnsLeft(inst) === 1) {
          // The sixth turn ends: the beacon strikes.
          for (const s of mySquares(api.board, api.opp)) {
            const t = api.board.pieces[s]!.type;
            if (t === "p" || t === "k") continue;
            // Added during their own move: 3 leaves exactly 2 of their turns.
            addEffect(api, { kind: "freeze", sq: s, owner: api.opp, turns: 3 });
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | null | undefined;
        if (sq == null) return "activate to light the beacon";
        return `beacon at ${sqName(sq)}, strikes in ${turnsLeft(inst)} of their turns — dies if the bearer falls`;
      },
    },
  ),
];
