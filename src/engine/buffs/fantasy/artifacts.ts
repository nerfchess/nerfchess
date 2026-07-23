// Fantasy set: MYTHIC ARTIFACTS. Relics of a lost age: a blade that lets a
// bishop cut like a queen (pieceBound), a war-horn that calls reinforcements
// (placePieces), an orb that dominates an enemy champion and muzzles the enemy
// queen while you hold it (setPieceColor + a queen no-capture filter), a
// staff that freezes a foe in time (freeze), an ancient aegis that wards your
// whole army and its king from capture (shield + king_safe), and a battle-banner
// that quickens your cavalry (timedAugment). Movement grants only ever widen a
// piece's move list, so none of these can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  permanentAugment,
  timedAugment,
  slideMoves,
  mySquares,
  addEffect,
  instant,
  ORTHO_DIRS,
  DIAG_DIRS,
  ALL_DIRS,
  type Square,
} from "./shared";

export const FANTASY_ARTIFACTS: Buff[] = [
  card(
    {
      id: "excalibur",
      icon: "Sword",
      name: "Excalibur",
      description:
        "Draw the lake's blade: choose one of your bishops. Until it next moves it may also slide like a rook, giving it full queen movement, but the first move it makes, straight or diagonal, spends the blade.",
      tier: 5,
      category: "movement",
      requires: ["b"],
      flavor: "The lake gives up its blade only once.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "q", self: true },
    },
    // Balance pass: the rook-line grant is a single charge, not a permanent
    // upgrade. The engine only ever offers the granted slide when legal, so a
    // failed attempt cannot happen; instead the charge is spent the moment the
    // chosen bishop next moves, taken (a rook slide) or not (a bishop move).
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the bishop to wield Excalibur",
              squares: mySquares(api.board, api.me, "b"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
        inst.state.charges = 1;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || ((inst.state.charges as number) ?? 0) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "b") return;
        for (const e of slideMoves(api.board, sq, ORTHO_DIRS, inst.id)) {
          if (!moves.some((m) => m.from === e.from && m.to === e.to)) moves.push(e);
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Bound bishop captured or overrun: the blade is lost.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        // The bound bishop moved: the single stroke is spent, taken or not.
        if (move.from === sq && move.color === api.me) {
          inst.state.charges = 0;
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to choose a bishop";
        return ((inst.state.charges as number) ?? 0) > 0
          ? "the blade is drawn for one stroke"
          : "the blade is sheathed";
      },
    },
  ),
  card(
    {
      id: "horn_of_summoning",
      icon: "Music",
      name: "Horn of Summoning",
      description:
        "One long note wakes the stone itself: for the rest of the game, your rooks may also step one square diagonally.",
      tier: 7,
      category: "movement",
      requires: ["r"],
      flavor: "One long note, and the towers themselves answer.",
      fx: { motif: "empower", pieces: ["r"], moveAs: "k", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "r").flatMap((sq) =>
        slideMoves(api.board, sq, DIAG_DIRS, inst.id, 1),
      ),
    ),
  ),
  card(
    {
      id: "orb_of_dominion",
      icon: "Orbit",
      name: "Orb of Dominion",
      description:
        "Choose one enemy rook or queen; after your opponent's next move you take control of it for the rest of the game, once. While you still hold the dominated piece, the enemy queen cannot capture. Kings cannot be taken.",
      tier: 7,
      category: "pieces",
      flavor: "Its light pours in through the eyes.",
    },
    {
      kind: "activated",
      // Stays in hand after use (like Excalibur) so its aura keeps running while
      // the dominated piece lives; it is never re-aimed once a piece is taken.
      spendOnUse: false,
      // Balance pass: the orb's only "duration" is permanent (rest of the game),
      // so there is no owner-turn timer to trim. Per the directive's fallback for
      // a duration that cannot be shortened, the seizure instead BEGINS after the
      // opponent replies: you name the target now and the orb takes it (and its
      // queen-muzzle aura starts) only once the opponent has answered the summons.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null || inst.state.pending != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to dominate",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "q" || t === "r";
              }),
            },
      effect: (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null || inst.state.pending != null) return;
        inst.state.pending = sq;
      },
      // The orb's aura muzzles the enemy queen while you hold the dominated
      // piece: strip the queen's capturing moves. A partial filter with the
      // standard never-strand guard, so the opponent always keeps a move.
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return moves;
        const held = api.board.pieces[sq];
        if (!held || held.color !== api.me) return moves;
        const kept = moves.filter((m) => !(m.piece === "q" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        // Follow the dominated piece; if it is captured or overrun the orb goes
        // dark, ending the aura and spending the card.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
        } else if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to dominate" : "the orb holds a champion",
    },
  ),
  card(
    {
      id: "staff_of_stasis",
      icon: "Wand",
      name: "Staff of Stasis",
      description:
        "Bind the staff to one of your pieces: whoever dares capture it is locked in a bubble of frozen time for 3 of their turns. The ward lasts the rest of the game.",
      tier: 5,
      category: "protection",
      flavor: "For whoever touches it, a heartbeat lasts an age.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: the staff is bound to a single bearer.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the piece that bears the staff",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        // The bearer falls: freeze the capturer in the stasis bubble (kings
        // are never frozen), then the staff is spent.
        if (move.to === sq && move.from !== sq && move.color === api.opp) {
          if (move.piece !== "k") {
            // Added during their own move, so the shared post-move tick eats
            // one turn immediately: 4 here leaves 3 of their turns frozen.
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 4, skin: "bubble" });
          }
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to bind the staff" : "the staff stands ready",
    },
  ),
  card(
    {
      id: "aegis_of_ages",
      icon: "ShieldPlus",
      name: "Aegis of the Ages",
      description:
        "Lift the ancient aegis and its ward falls over your whole host, your king included: nothing you own can be captured for your opponent's next 3 turns. Lifting it consumes your next unused reroll, if you have one.",
      tier: 7,
      category: "protection",
      flavor: "Forged before the first war, unbroken since.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    // An unbroken bulwark: the army shield AND a king ward, so unlike the plain
    // army aegis the crown cannot be taken either while it holds.
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 3 });
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
      // Balance pass: lifting the aegis consumes your next unused reroll, if any.
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    }),
  ),
  card(
    {
      id: "banner_of_war",
      icon: "FlagTriangleRight",
      name: "Banner of War",
      description:
        "Raise the banner and your cavalry surges: for your next 3 turns each of your knights may also step one square in any direction like a king.",
      tier: 4,
      category: "movement",
      requires: ["n"],
      flavor: "Follow the colors and do not look back.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    timedAugment(3, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1),
      ),
    ),
  ),
];
