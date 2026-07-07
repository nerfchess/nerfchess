// PT set: PASSIVE / PERMANENT AURAS. Held cards that always do something while
// they sit in your hand. Every one reuses primitives that already exist in the
// engine (the funny/shared `card` factory and the movement / effect helpers),
// so the whole batch stays typecheck-clean and cannot introduce a new engine
// surface.
//
// Safety rails followed here, matching the rest of the buff library:
//   - Counters live in inst.state and are updated inside onMovePlayed, which
//     fires after EVERY move by either side. Each hook gates on move.color so it
//     runs deterministically for both players (no RNG in any hook).
//   - A move filter is only ever partial: it always keeps a non-empty fallback
//     (return kept.length ? kept : moves) so it can never strand a side with
//     zero legal moves. filterOpponentMoves has NO built-in guard (unlike
//     timedOppFilter / curse), so every permanent filter below guards itself.
//   - Kings are never frozen, removed, or restricted: every filter keeps king
//     moves, every freeze / relocate / removal skips the king.
//   - Board changes made from a hook go through the api (place / removePiece /
//     relocate) or addEffect, so the reveal path keeps replicas in sync.
//
// SKIPPED from the requested list: Stubborn (#49). It needs to suppress a
// king_only effect aimed at its own owner, but king_only is applied by the
// central legal-move pipeline (game.ts) and there is no "filter my own moves"
// hook a held card can use, nor a king_only-immunity effect kind. Building it
// safely would require a new effect kind + pipeline branch (a subsystem that
// does not exist), which is out of scope for a single additive card file.

import { Buff, Square } from "../funny/shared";
import {
  card,
  permanentAugment,
  mySquares,
  leapMoves,
  emptySquares,
  addEffect,
  inHalf,
  pawnRankOk,
  relRank,
  dist,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "../funny/shared";

export const PT_PASSIVE_CARDS: Buff[] = [
  // #40 Home Field ----------------------------------------------------------
  card(
    {
      id: "home_field",
      name: "Home Field",
      description:
        "Home advantage: while standing in your own half of the board, each of your knights, bishops, and rooks may also step one square in any direction.",
      tier: 5,
      category: "movement",
      requires: ["n", "b", "r"],
      flavor: "The crowd, the turf, the extra step.",
      fx: { motif: "empower", pieces: ["n", "b", "r"], moveAs: "k", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me)
        .filter((sq) => {
          const t = api.board.pieces[sq]!.type;
          return (t === "n" || t === "b" || t === "r") && inHalf(api.me, sq);
        })
        .flatMap((sq) => leapMoves(api.board, sq, ALL_DIRS, inst.id)),
    ),
  ),

  // #41 Gravity Well ---------------------------------------------------------
  card(
    {
      id: "gravity_well",
      name: "Gravity Well",
      description:
        "Your king bends space around it: enemy pieces standing next to your king are caught in orbit and cannot move to a square farther from it. Enemy kings are not affected.",
      tier: 6,
      category: "tempo",
      flavor: "What goes near, stays near.",
      fx: { motif: "anchor" },
    },
    {
      kind: "passive",
      filterOpponentMoves: (moves, _inst, api) => {
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null) return moves;
        const kept = moves.filter((m) => {
          if (m.piece === "k") return true; // never trap the enemy king
          if (dist(m.from, k) !== 1) return true; // only pieces already in orbit
          return dist(m.to, k) <= dist(m.from, k); // may not drift outward
        });
        return kept.length > 0 ? kept : moves;
      },
      status: () => "warping the space by your king",
    },
  ),

  // #42 Rust -----------------------------------------------------------------
  card(
    {
      id: "rust",
      name: "Rust",
      description:
        "Idle enemy pieces seize up: any enemy piece (never a king) that has stood still for 3 of your opponent's turns rusts solid and may only move if the move is a capture, until it finally moves.",
      tier: 5,
      category: "hex",
      flavor: "Rome was not oxidized in a day.",
      fx: { motif: "jail" },
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        const idle = (inst.state.idle as Record<number, number>) ?? {};
        // Rebuild the idle map against the enemy pieces that exist right now so
        // captured / moved-away entries fall out and cannot go stale.
        const next: Record<number, number> = {};
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          if (move.color === api.opp) {
            // The piece the opponent just moved is fresh; every other enemy
            // piece stood still for one more of their turns.
            next[sq] = sq === move.to ? 0 : (idle[sq] ?? 0) + 1;
          } else {
            next[sq] = idle[sq] ?? 0; // my move: enemy idle counts are unchanged
          }
        }
        inst.state.idle = next;
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const idle = (inst.state.idle as Record<number, number>) ?? {};
        const kept = moves.filter(
          (m) => m.piece === "k" || (idle[m.from] ?? 0) < 3 || !!m.captured,
        );
        return kept.length > 0 ? kept : moves;
      },
      status: () => "rust creeping over idle pieces",
    },
  ),

  // #43 Photosynthesis -------------------------------------------------------
  card(
    {
      id: "photosynthesis",
      name: "Photosynthesis",
      description:
        "Your pawns grow toward the light: after every 4 of your turns, one of your pawns advances one square on its own (the pawn nearest promotion that has an empty square ahead). It never auto-advances onto the promotion rank.",
      tier: 4,
      category: "tempo",
      flavor: "Just add sunlight.",
      fx: { motif: "rally", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const n = ((inst.state.turns as number) ?? 0) + 1;
        inst.state.turns = n;
        if (n % 4 !== 0) return;
        const dir = api.me === "w" ? 1 : -1;
        const opts: { sq: Square; to: Square }[] = [];
        for (const sq of mySquares(api.board, api.me, "p")) {
          const f = FILE(sq),
            r = RANK(sq) + dir;
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          if (api.board.pieces[to] || !pawnRankOk(to)) continue; // blocked or would promote
          opts.push({ sq, to });
        }
        if (opts.length === 0) return;
        // Deterministic pick: the pawn closest to promotion, then lowest square.
        opts.sort((a, b) => relRank(api.me, b.sq) - relRank(api.me, a.sq) || a.sq - b.sq);
        api.relocate(opts[0].sq, opts[0].to);
      },
      status: () => "soaking up the sun",
    },
  ),

  // #44 Union Rules ----------------------------------------------------------
  card(
    {
      id: "union_rules",
      name: "Union Rules",
      description:
        "Your pieces will not be captured two turns running: on any turn right after your opponent captured one of your pieces, they cannot make a capture. If capturing is their only legal option, the rule is waived for that turn.",
      tier: 5,
      category: "protection",
      flavor: "You cannot work them to the bone every shift.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        // Did the opponent just take one of my pieces? (A king capture ends the
        // game, so it never matters here.)
        inst.state.blockNext = !!move.captured && move.captured !== "k";
      },
      filterOpponentMoves: (moves, inst, _api) => {
        if (!inst.state.blockNext) return moves;
        const kept = moves.filter((m) => !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      status: (inst) => (inst.state.blockNext ? "grievance filed, no captures" : "union on watch"),
    },
  ),

  // #45 Landlord -------------------------------------------------------------
  card(
    {
      id: "landlord",
      icon: "Building",
      name: "Landlord",
      description:
        "Claim three empty squares as your property. Any enemy piece (never a king) that ends its move on one of them owes rent: it is stuck fast for 1 of their turns.",
      tier: 6,
      category: "tempo",
      flavor: "First, last, and a security deposit.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // Placement is a one-time activation; after that the card is a permanent
      // passive that never re-aims (mirrors voidSquares).
      targets: (inst, api, picks) =>
        picks.length >= 3 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: `Claim a square you own (${picks.length + 1}/3)`,
              squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.squares != null) return;
        inst.state.squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color === api.opp && move.piece !== "k" && squares.includes(move.to)) {
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 1, skin: "cement" });
        }
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return "activate to claim your squares";
        return `collecting rent on ${squares
          .map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`)
          .join(", ")}`;
      },
    },
  ),

  // #46 Magnetism ------------------------------------------------------------
  card(
    {
      id: "magnetism",
      icon: "Magnet",
      name: "Magnetism",
      description:
        "Your knights are magnetized: after each knight move, the nearest enemy piece (never a king) is dragged one square toward that knight, if the square between them is empty.",
      tier: 6,
      category: "tempo",
      flavor: "Opposites attract, and so does the cavalry.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || move.piece !== "n") return;
        const knight = move.to;
        // Nearest enemy non-king piece, tie-broken by lowest square for
        // determinism.
        let best: Square | null = null;
        let bestD = Infinity;
        for (const sq of mySquares(api.board, api.opp)) {
          if (api.board.pieces[sq]!.type === "k") continue;
          const d = dist(sq, knight);
          if (d < bestD || (d === bestD && (best == null || sq < best))) {
            bestD = d;
            best = sq;
          }
        }
        if (best == null) return;
        const f = FILE(best) + Math.sign(FILE(knight) - FILE(best));
        const r = RANK(best) + Math.sign(RANK(knight) - RANK(best));
        if (!inBoard(f, r)) return;
        const to = SQ(f, r);
        if (to === knight || api.board.pieces[to]) return; // no room to slide it
        if (api.board.pieces[best]!.type === "p" && !pawnRankOk(to)) return; // never a bad pawn rank
        api.relocate(best, to);
      },
      status: () => "knights pulling the enemy in",
    },
  ),

  // #50 Contagion ------------------------------------------------------------
  card(
    {
      id: "contagion",
      icon: "Radiation",
      name: "Contagion",
      description:
        "Freezes are catching: whenever one of your opponent's pieces is newly frozen, one adjacent enemy piece (never a king) catches it and is frozen for 1 of their turns. Each fresh freeze spreads at most one square, so it never runs away.",
      tier: 7,
      category: "hex",
      flavor: "Cover your cough.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        const known = new Set<number>((inst.state.frozen as number[]) ?? []);
        // Enemy squares currently under an active freeze.
        const cur = new Set<number>();
        for (const e of api.bs.effects) {
          if (e.kind === "freeze" && e.owner === api.opp && e.turns > 0) cur.add(e.sq);
        }
        const caught = new Set<number>();
        for (const sq of cur) {
          if (known.has(sq)) continue; // only a NEWLY frozen piece spreads
          for (const [df, dr] of ALL_DIRS) {
            const f = FILE(sq) + df,
              r = RANK(sq) + dr;
            if (!inBoard(f, r)) continue;
            const nb = SQ(f, r);
            const p = api.board.pieces[nb];
            if (!p || p.color !== api.opp || p.type === "k") continue;
            if (cur.has(nb) || caught.has(nb)) continue; // already frozen / already caught
            addEffect(api, { kind: "freeze", sq: nb, owner: api.opp, turns: 1, skin: "slime" });
            caught.add(nb);
            break; // one hop per fresh freeze
          }
        }
        // Remember everything frozen now (originals + newly caught) so caught
        // pieces do not themselves spread next turn.
        const persist: number[] = [];
        for (const sq of cur) persist.push(sq);
        for (const sq of caught) persist.push(sq);
        inst.state.frozen = persist;
      },
      status: () => "spores drifting between pieces",
    },
  ),

  // #52 Guardian Angel -------------------------------------------------------
  card(
    {
      id: "guardian_angel",
      icon: "HandHeart",
      name: "Guardian Angel",
      description:
        "Once per game, the first time your opponent captures one of your pieces (not your king), that piece is spirited to safety instead: an identical piece reappears on an empty square deep in your own half.",
      tier: 6,
      category: "protection",
      flavor: "Someone up there is watching.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || !move.captured || move.captured === "k") return;
        const type = move.captured;
        const safe = emptySquares(
          api.board,
          (sq) => inHalf(api.me, sq) && (type !== "p" || pawnRankOk(sq)),
        ).sort((a, b) => relRank(api.me, a) - relRank(api.me, b) || a - b)[0];
        if (safe == null) return; // nowhere safe right now: keep the save for later
        api.place(safe, type, api.me);
        inst.spent = true;
      },
      status: (inst) => (inst.spent ? "the save was spent" : "watching over your army"),
    },
  ),

  // #53 Termites -------------------------------------------------------------
  card(
    {
      id: "termites",
      name: "Termites",
      description:
        "Termites gnaw at your opponent's towers: every 3 of their turns, their rooks lose one more square of reach. The decay stops at a reach of 1, so a rook can always shuffle a single square.",
      tier: 6,
      category: "hex",
      flavor: "You can hear them chewing.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.cap = 7;
        inst.state.tick = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const tick = ((inst.state.tick as number) ?? 0) + 1;
        inst.state.tick = tick;
        if (tick % 3 === 0) {
          inst.state.cap = Math.max(1, ((inst.state.cap as number) ?? 7) - 1);
        }
      },
      filterOpponentMoves: (moves, inst, _api) => {
        const cap = (inst.state.cap as number) ?? 7;
        if (cap >= 7) return moves;
        const kept = moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= cap);
        return kept.length > 0 ? kept : moves;
      },
      status: (inst) => `enemy rooks gnawed down to reach ${(inst.state.cap as number) ?? 7}`,
    },
  ),

  // #54 Fan Club -------------------------------------------------------------
  card(
    {
      id: "fan_club",
      icon: "Megaphone",
      name: "Fan Club",
      description:
        "The home crowd guards your bench: while you have as many or more pieces as your opponent, your pawns on your back two ranks cannot be captured. Fall behind on material and the cheering stops.",
      tier: 4,
      category: "protection",
      requires: ["p"],
      flavor: "Row after row of very small foam fingers.",
      fx: { motif: "rally", pieces: ["p"], self: true },
    },
    {
      // Conditional shield: a morale save that only holds while you are level on
      // material or ahead. The filter recomputes both piece counts straight from
      // the board (a pure function of state, so it replays identically), and
      // stays partial with a non-empty fallback so the opponent is never stranded
      // with zero legal moves. onMovePlayed only mirrors the live condition into
      // state so the status line can read it (status has no api).
      kind: "passive",
      onMovePlayed: (inst, _move, api) => {
        inst.state.holding =
          mySquares(api.board, api.me).length >= mySquares(api.board, api.opp).length;
      },
      filterOpponentMoves: (moves, _inst, api) => {
        if (mySquares(api.board, api.me).length < mySquares(api.board, api.opp).length) {
          return moves; // outnumbered: the crowd cannot protect anyone
        }
        const kept = moves.filter((m) => {
          const capSq = m.capturedSquare ?? m.to;
          const victim = api.board.pieces[capSq];
          // Block only captures of your OWN pawns sitting on your back two ranks.
          return !(
            m.captured != null &&
            victim != null &&
            victim.color === api.me &&
            victim.type === "p" &&
            relRank(api.me, capSq) <= 2
          );
        });
        return kept.length > 0 ? kept : moves;
      },
      status: (inst) =>
        inst.state.holding === false
          ? "outnumbered: the crowd falls quiet"
          : "the crowd shields your back ranks",
    },
  ),
];
