// Overhaul roster, Tier 6 (cards 126-150 of docs/overhaul-roster.md): large
// board events, control steals and payout engines. Every mechanic resolves
// through existing engine primitives; every random draw uses api.rng inside
// init / effect / onMovePlayed only (deterministic, replay-safe).

import {
  ALL_DIRS,
  Buff,
  BuffApi,
  DIAG_DIRS,
  FILE,
  KNIGHT_LEAPS,
  Move,
  ORTHO_DIRS,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  advancePawn,
  buffRegistry,
  captureSquare,
  card,
  emptySquares,
  flashSquares,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  kingSquare,
  leapMoves,
  markRevived,
  mySquares,
  pawnRankOk,
  pinCosmetic,
  relRank,
  slideMoves,
  tickTurns,
  timedAugment,
  timedOppFilter,
  turnsLeft,
} from "./shared";

/** Empty squares a piece could reach by its normal move shape WITHOUT
 * capturing (pawns: pushes only; sliders blocked normally). Kings excluded
 * by every caller. Pure geometry over the live board. */
function quietDests(api: BuffApi, sq: Square): Square[] {
  const p = api.board.pieces[sq];
  if (!p) return [];
  if (p.type === "p") {
    const out: Square[] = [];
    const one = sq + fwdOf(p.color);
    if (one >= 0 && one <= 63 && !api.board.pieces[one] && pawnRankOk(one)) {
      out.push(one);
      const two = one + fwdOf(p.color);
      if (relRank(p.color, sq) === 2 && two >= 0 && two <= 63 && !api.board.pieces[two]) {
        out.push(two);
      }
    }
    return out;
  }
  const ms: Move[] =
    p.type === "n"
      ? leapMoves(api.board, sq, KNIGHT_LEAPS, "geo")
      : slideMoves(
          api.board,
          sq,
          p.type === "b" ? DIAG_DIRS : p.type === "r" ? ORTHO_DIRS : ALL_DIRS,
          "geo",
        );
  return ms.filter((m) => !m.captured).map((m) => m.to);
}

/** Squares of the 2-wide-plus-center file window around file `f`. */
function fileWindow(f: number): (sq: Square) => boolean {
  return (sq) => Math.abs(FILE(sq) - f) <= 1;
}

export const OVERHAUL_T6: Buff[] = [
  // 126. Hostile Takeover ------------------------------------------------------
  // ADAPTED: the roster's "make the opponent's next move for them" is scoped to
  // relocating one enemy non-king piece along its own legal non-capture
  // geometry, spending your turn (no engine hook exists to hijack their turn).
  card(
    {
      id: "ov_hostile_takeover",
      name: "Hostile Takeover",
      description:
        "Spend your turn moving one enemy piece for them: any square it could legally reach without capturing. Their king is not for sale.",
      tier: 6,
      category: "movement",
      icon: "Briefcase",
      flavor: "The board of directors has some exciting news for you.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy piece you now manage",
            squares: mySquares(api.board, api.opp).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && quietDests(api, sq).length > 0,
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose where it is reassigned",
          squares: quietDests(api, picks[0].square!),
        };
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        if (p && p.color === api.opp && p.type !== "k" && !api.board.pieces[to]) {
          api.relocate(from, to);
          flashSquares(api, [to], true);
        }
      },
    ),
  ),
  // 127. Frost Wyrm ------------------------------------------------------------
  card(
    {
      id: "ov_frost_wyrm",
      name: "Frost Wyrm",
      description:
        "An ice dragon sweeps a chosen rank: every enemy piece on it (king excluded) is frozen for 2 turns, and its empty squares become ice walls your opponent cannot enter for their next 2 turns.",
      tier: 6,
      category: "tempo",
      icon: "Snowflake",
      flavor: "It exhales, and the whole latitude files a complaint.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the rank the wyrm sweeps",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
                const r = RANK(sq);
                for (let f = 0; f < 8; f++) {
                  const p = api.board.pieces[SQ(f, r)];
                  if (!p || (p.color === api.opp && p.type !== "k")) return true;
                }
                return false;
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const r = RANK(picks[0].square);
        const walls: Square[] = [];
        for (let f = 0; f < 8; f++) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (!p) walls.push(sq);
          else if (p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "ice" });
          }
        }
        if (walls.length) addEffect(api, { kind: "barred", squares: walls, against: api.opp, turns: 2 });
      },
    ),
  ),
  // 128. Stack Overflow ----------------------------------------------------------
  // ADAPTED: no per-move think-time hook exists, so instead of taxing slow
  // moves, every NON-capture the opponent plays for their next 3 turns costs
  // them 4 seconds (every quiet answer gets nitpicked).
  card(
    {
      id: "ov_stack_overflow",
      name: "Stack Overflow",
      description:
        "For your opponent's next 3 turns, every move they make that is not a capture costs them 4 seconds. Closed as duplicate.",
      tier: 6,
      category: "tempo",
      icon: "Layers",
      flavor: "Have you tried searching before moving?",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && !move.captured) {
          api.adjustClock({ subOppSec: 4 });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  // 129. Midas Gauntlet ------------------------------------------------------------
  // ADAPTED: the roster's push/pull immunity on gilded squares has no engine
  // hook; instead each trophy pays 10 seconds and the capturer is gilded
  // (a permanent cosmetic).
  card(
    {
      id: "ov_midas_gauntlet",
      name: "Midas Gauntlet",
      description:
        "Your next 3 captures each gain you 10 seconds, and the capturing piece is gilded for the trophy cabinet.",
      tier: 6,
      category: "tempo",
      icon: "HandCoins",
      flavor: "Everything he takes turns to gold. Mostly the clock.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured || move.captured === "k") return;
        const left = ((inst.state.charges as number) ?? 0) - 1;
        inst.state.charges = left;
        api.adjustClock({ addSelfSec: 10 });
        pinCosmetic(api, move.to, api.me, "gilded", null);
        if (left <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.charges as number) ?? 3} captures left to gild`,
    },
  ),
  // 130. Tornado --------------------------------------------------------------------
  card(
    {
      id: "ov_tornado",
      name: "Tornado",
      description:
        "A funnel travels a chosen file: every piece within one file of it (kings excluded) is flung to a random empty square in its own half.",
      tier: 6,
      category: "attack",
      icon: "Tornado",
      flavor: "Forecast: scattered rooks, with a chance of knights.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the file the funnel travels",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
                const win = fileWindow(FILE(sq));
                for (let s = 0 as Square; s < 64; s++) {
                  const p = api.board.pieces[s];
                  if (p && p.type !== "k" && win(s)) return true;
                }
                return false;
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const win = fileWindow(FILE(picks[0].square));
        // Deterministic ascending iteration; the RNG draws replay identically.
        const caught: Square[] = [];
        for (let sq = 0 as Square; sq < 64; sq++) {
          const p = api.board.pieces[sq];
          if (p && p.type !== "k" && win(sq)) caught.push(sq);
        }
        for (const sq of caught) {
          const p = api.board.pieces[sq];
          if (!p) continue;
          const dests = emptySquares(
            api.board,
            (s) => inHalf(p.color, s) && (p.type !== "p" || pawnRankOk(s)),
          );
          if (dests.length === 0) continue;
          api.relocate(sq, dests[api.rng.int(dests.length)]);
        }
        flashSquares(api, caught, true);
      },
    ),
  ),
  // 131. Duplicate Glitch --------------------------------------------------------------
  // ADAPTED: the engine cannot pre-duplicate a future draft pick, so the
  // glitch copies a random unspent card you already hold (fresh instance of
  // the same card); if you hold none, you get 2 rerolls instead.
  card(
    {
      id: "ov_duplicate_glitch",
      name: "Duplicate Glitch",
      description:
        "Dupe glitch: gain a second copy of a random unspent card you hold. If your hand is empty, gain 2 draft rerolls instead.",
      tier: 6,
      category: "draft",
      icon: "Copy",
      flavor: "Do not patch this. Do NOT patch this.",
    },
    instant((inst, api) => {
      const pool = api.mine.buffs.filter(
        (b) =>
          b !== inst && !b.spent && !b.nullified && !b.usedActivation && buffRegistry.byId[b.id],
      );
      if (pool.length === 0) {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
        inst.state.result = "rerolls";
        return;
      }
      const src = pool[api.rng.int(pool.length)];
      const def = buffRegistry.byId[src.id];
      const copy = { id: src.id, tier: src.tier, state: {} };
      def.init?.(copy, api);
      api.mine.buffs.push(copy);
      inst.state.result = src.id;
    }),
  ),
  // 132. Archmage's Sabbatical -------------------------------------------------------------
  // ADAPTED: kings are excluded from the tower's beam (a teleporting king
  // trivializes every attack); the roster's "one of your pieces" otherwise
  // resolves as a granted teleport move each turn.
  card(
    {
      id: "ov_archmage_sabbatical",
      name: "Archmage's Sabbatical",
      description:
        "For 4 of your turns, instead of a normal move you may teleport one of your pieces (king excluded) to any empty square in your half.",
      tier: 6,
      category: "movement",
      icon: "Wand2",
      flavor: "He is technically on leave. The tower disagrees.",
      fx: { motif: "empower", pieces: "all", self: true },
    },
    timedAugment(4, (_moves, inst, api) => {
      const dests = emptySquares(api.board, (s) => inHalf(api.me, s));
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me)) {
        const p = api.board.pieces[sq]!;
        if (p.type === "k") continue;
        const tos = p.type === "p" ? dests.filter(pawnRankOk) : dests;
        for (const to of tos) {
          out.push({ from: sq, to, piece: p.type, color: api.me, via: inst.id });
        }
      }
      return out;
    }),
  ),
  // 133. Rage Bait -----------------------------------------------------------------------
  card(
    {
      id: "ov_rage_bait",
      name: "Rage Bait",
      description:
        "For your opponent's next 4 turns, every capture they make costs them 6 seconds while the taunt plays.",
      tier: 6,
      category: "tempo",
      icon: "Angry",
      flavor: "EZ. Absolutely EZ. Would you like to hear the airhorn again?",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          api.adjustClock({ subOppSec: 6 });
          flashSquares(api, [captureSquare(move) ?? move.to], true);
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  // 134. High Water Mark ---------------------------------------------------------------------
  // ADAPTED: the roster floods both sides; only the opponent's moves can be
  // filtered, so the flood slows THEIR sliders only: for their next 4 turns
  // enemy bishops, rooks and queens cannot pass THROUGH the two middle ranks
  // (they may still land on them).
  card(
    {
      id: "ov_high_water_mark",
      name: "High Water Mark",
      description:
        "The middle two ranks flood: for your opponent's next 4 turns their bishops, rooks and queens cannot move through them, only into them.",
      tier: 6,
      category: "protection",
      icon: "Waves",
      flavor: "The river remembers where it used to run.",
      fx: { motif: "anchor", pieces: ["b", "r", "q"] },
    },
    timedOppFilter(4, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "b" && m.piece !== "r" && m.piece !== "q") return true;
        const tr = RANK(m.to);
        if (tr === 3 || tr === 4) return true;
        // Drop the move when any strictly-intermediate square lies in the band.
        const df = Math.sign(FILE(m.to) - FILE(m.from)), dr = Math.sign(RANK(m.to) - RANK(m.from));
        let f = FILE(m.from) + df, r = RANK(m.from) + dr;
        while (inBoard(f, r) && SQ(f, r) !== m.to) {
          if (r === 3 || r === 4) return false;
          f += df; r += dr;
        }
        return true;
      }),
    ),
  ),
  // 135. Golden Goose ---------------------------------------------------------------------------
  // ADAPTED: the clock API cannot credit the opponent, so the roster's
  // 40-second bounty is replaced by the payout simply dying with the goose;
  // the goose is a placed pawn stuck in place (honey) so it never fights.
  card(
    {
      id: "ov_golden_goose",
      name: "Golden Goose",
      description:
        "Place a goose (a pawn stuck fast in golden honey) on an empty square in your half. For your next 8 turns it lays 6 seconds onto your clock after each of your moves. If it is captured, the gold stops.",
      tier: 6,
      category: "pieces",
      icon: "Egg",
      flavor: "Do not ask where the eggs come from. Bank them.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the goose nests",
              squares: emptySquares(api.board, (s) => inHalf(api.me, s) && pawnRankOk(s)),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.place(sq, "p", api.me);
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 8, skin: "honey" });
        pinCosmetic(api, sq, api.me, "plush", null, "Golden Goose");
        inst.state.sq = sq;
        inst.state.turns = 8;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.to === sq || move.capturedSquare === sq) {
          // The goose is gone; so is the gold.
          inst.spent = true;
          return;
        }
        if (move.color !== api.me) return;
        api.adjustClock({ addSelfSec: 6 });
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          if (api.board.pieces[sq]?.color === api.me) api.removePiece(sq, { uncounted: true });
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to place the goose" : `laying for ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 136. Grand Illusionist ---------------------------------------------------------------------------
  // ADAPTED: per-viewer piece disguises are impossible client-side; the
  // confusion resolves as the opponent being unable to capture your minor
  // pieces (they cannot tell which is which) for their next 2 turns.
  card(
    {
      id: "ov_grand_illusionist",
      name: "Grand Illusionist",
      description:
        "For your opponent's next 2 turns, they cannot capture your knights or bishops. Which one was the real one again?",
      tier: 6,
      category: "protection",
      icon: "VenetianMask",
      flavor: "For my next trick, the entire minor piece section.",
      requires: ["n", "b"],
      fx: { motif: "muzzle" },
    },
    timedOppFilter(2, (moves) =>
      moves.filter((m) => m.captured !== "n" && m.captured !== "b"),
    ),
  ),
  // 137. Emergency Patch --------------------------------------------------------------------------------
  card(
    {
      id: "ov_emergency_patch",
      name: "Emergency Patch",
      description:
        "For your opponent's next 5 turns, one randomly chosen enemy slider type (bishop, rook or queen) is limited to moves of 2 squares that turn.",
      tier: 6,
      category: "protection",
      icon: "Wrench",
      flavor: "Known issue: your rooks. Fix ETA: five turns.",
      fx: { motif: "anchor", pieces: ["b", "r", "q"] },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 5;
        inst.state.t = (["b", "r", "q"] as const)[api.rng.int(3)];
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        const t = inst.state.t as string;
        const kept = moves.filter(
          (m) =>
            m.piece !== t ||
            Math.max(Math.abs(FILE(m.to) - FILE(m.from)), Math.abs(RANK(m.to) - RANK(m.from))) <= 2,
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        // Re-roll the patched type after each of their turns.
        if (move.color === api.opp) inst.state.t = (["b", "r", "q"] as const)[api.rng.int(3)];
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        `patching ${{ b: "bishops", r: "rooks", q: "queens" }[inst.state.t as "b" | "r" | "q"]}, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  // 138. Regency Council -----------------------------------------------------------------------------------
  card(
    {
      id: "ov_regency_council",
      name: "Regency Council",
      description:
        "For 5 of your turns, while your queen is off the board your rooks and bishops may also step one square in any direction.",
      tier: 6,
      category: "movement",
      icon: "Scale",
      flavor: "In the queen's absence, the council votes to move diagonally.",
      requires: ["r", "b"],
      fx: { motif: "empower", pieces: ["r", "b"], moveAs: "k", self: true },
    },
    timedAugment(5, (_moves, inst, api) => {
      if (mySquares(api.board, api.me, "q").length > 0) return [];
      const out: Move[] = [];
      for (const sq of [...mySquares(api.board, api.me, "r"), ...mySquares(api.board, api.me, "b")]) {
        out.push(...slideMoves(api.board, sq, ALL_DIRS, inst.id, 1));
      }
      return out;
    }),
  ),
  // 139. Meteor Golf ------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_meteor_golf",
      name: "Meteor Golf",
      description:
        "Tee off at any square, in plain sight of both players. After your opponent's next move the meteor lands: any piece there (kings excluded) is destroyed and adjacent pieces are knocked one square outward onto empty squares.",
      tier: 6,
      category: "attack",
      icon: "Target",
      flavor: "FORE. Also, duck.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the meteor lands",
              squares: Array.from({ length: 64 }, (_, i) => i as Square),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.opp) return;
        const center = api.board.pieces[sq];
        if (center && center.type !== "k") api.removePiece(sq);
        // Knock neighbours outward, ascending square order (deterministic).
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (!inBoard(f, r)) continue;
            const nsq = SQ(f, r);
            const p = api.board.pieces[nsq];
            if (!p) continue;
            const of = f + df, orr = r + dr;
            if (!inBoard(of, orr)) continue;
            const out = SQ(of, orr);
            if (api.board.pieces[out]) continue;
            if (p.type === "p" && !pawnRankOk(out)) continue;
            api.relocate(nsq, out);
          }
        }
        flashSquares(api, [sq]);
        inst.spent = true;
      },
      status: (inst) => (inst.state.sq == null ? "activate to aim" : "impact after their next move"),
    },
  ),
  // 140. Vampire Court -----------------------------------------------------------------------------------------
  card(
    {
      id: "ov_vampire_court",
      name: "Vampire Court",
      description:
        "Up to 2 of your knights or bishops become vampires: each of their captures gains you 6 seconds, and the first time one is killed it returns 3 of your turns later on a square next to where it fell.",
      tier: 6,
      category: "pieces",
      icon: "Moon",
      flavor: "The court convenes at dusk and bills by the neck.",
      requires: ["n", "b"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) => {
        if (inst.state.vamps != null || picks.length >= 2) return null;
        const taken = picks.map((k) => k.square);
        const squares = [
          ...mySquares(api.board, api.me, "n"),
          ...mySquares(api.board, api.me, "b"),
        ].filter((sq) => !taken.includes(sq));
        if (squares.length === 0) {
          // No candidates at all: report "no valid use" rather than resolving
          // into a silent no-op activation.
          return picks.length === 0
            ? { kind: "square", label: "No minor pieces to embrace", squares: [] }
            : null;
        }
        return {
          kind: "square",
          label: `Choose a minor piece to embrace (${picks.length + 1}/2)`,
          squares,
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      effect: (inst, api, picks) => {
        if (inst.state.vamps != null) return;
        const vamps: { sq: Square | null; type: string; revived: boolean; deadIn: number | null; deathSq: Square | null }[] = [];
        for (const k of picks) {
          const sq = k.square;
          const p = sq != null ? api.board.pieces[sq] : null;
          if (sq == null || !p || p.color !== api.me || (p.type !== "n" && p.type !== "b")) continue;
          pinCosmetic(api, sq, api.me, "vampire", null);
          vamps.push({ sq, type: p.type, revived: false, deadIn: null, deathSq: null });
        }
        inst.state.vamps = vamps;
        if (vamps.length === 0) inst.spent = true;
      },
      onMovePlayed: (inst, move, api) => {
        const vamps = inst.state.vamps as
          | { sq: Square | null; type: string; revived: boolean; deadIn: number | null; deathSq: Square | null }[]
          | undefined;
        if (!vamps?.length) return;
        for (const v of vamps) {
          if (v.sq != null) {
            if ((move.capturedSquare === v.sq || move.to === v.sq) && move.from !== v.sq) {
              if (!v.revived) {
                v.deadIn = 3;
                v.deathSq = v.sq;
              }
              v.sq = null;
            } else if (move.from === v.sq) {
              v.sq = move.to;
              if (move.color === api.me && move.captured && move.captured !== "k") {
                api.adjustClock({ addSelfSec: 6 });
              }
            }
          }
          if (v.deadIn != null && move.color === api.me) {
            v.deadIn -= 1;
            if (v.deadIn <= 0) {
              // First empty square around the grave, ascending (deterministic).
              const spots: Square[] = [];
              for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                  if (df === 0 && dr === 0) continue;
                  const f = FILE(v.deathSq!) + df, r = RANK(v.deathSq!) + dr;
                  if (inBoard(f, r) && !api.board.pieces[SQ(f, r)]) spots.push(SQ(f, r));
                }
              }
              spots.sort((a, b) => a - b);
              if (spots.length === 0) {
                v.deadIn = 1; // Grave is crowded; the bats circle one more turn.
                continue;
              }
              const sq = spots[0];
              api.place(sq, v.type as "n" | "b", api.me);
              markRevived(api, v.type as "n" | "b");
              pinCosmetic(api, sq, api.me, "vampire", null);
              v.sq = sq;
              v.revived = true;
              v.deadIn = null;
            }
          }
        }
        if (vamps.every((v) => v.sq == null && v.deadIn == null)) inst.spent = true;
      },
      status: (inst) => {
        const vamps = inst.state.vamps as { sq: Square | null; deadIn: number | null }[] | undefined;
        if (!vamps) return "activate to embrace up to 2 minors";
        const alive = vamps.filter((v) => v.sq != null).length;
        const rising = vamps.filter((v) => v.deadIn != null).length;
        return rising > 0 ? `${alive} prowling, ${rising} rising from the grave` : `${alive} prowling`;
      },
    },
  ),
  // 141. Great Migration ---------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_great_migration",
      name: "Great Migration",
      description:
        "As your move, every one of your pawns with an empty square ahead advances one square. Blocked pawns hold their ground.",
      tier: 6,
      category: "movement",
      icon: "Route",
      flavor: "The herd does not ask the fence for permission.",
      requires: ["p"],
    },
    {
      ...activatedSimple((_inst, api) => {
        // Front-most pawns first so no pawn double-steps through a square a
        // herd-mate just vacated.
        const pawns = mySquares(api.board, api.me, "p");
        if (api.me === "w") pawns.reverse();
        for (const sq of pawns) advancePawn(api, sq);
      }),
    },
  ),
  // 142. Wish Fish --------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_wish_fish",
      name: "Wish Fish",
      description:
        "Reel it in and take the wish it grants: 30 seconds on your clock, a new pawn beside your king, or 2 draft rerolls. The fish decides.",
      tier: 6,
      category: "item",
      icon: "Fish",
      flavor: "It grants exactly one wish and it is not taking requests.",
    },
    instant((inst, api) => {
      let roll = api.rng.int(3);
      if (roll === 1) {
        const k = kingSquare(api.board, api.me);
        const spots: Square[] = [];
        if (k != null) {
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(k) + df, r = RANK(k) + dr;
              if (inBoard(f, r) && !api.board.pieces[SQ(f, r)] && pawnRankOk(SQ(f, r))) {
                spots.push(SQ(f, r));
              }
            }
          }
        }
        if (spots.length === 0) roll = 0; // No room by the king: the fish pays time.
        else {
          api.place(spots[api.rng.int(spots.length)], "p", api.me);
          inst.state.result = "pawn";
        }
      }
      if (roll === 0) {
        api.adjustClock({ addSelfSec: 30 });
        inst.state.result = "time";
      } else if (roll === 2) {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
        inst.state.result = "rerolls";
      }
    }),
  ),
  // 143. Season Pass ------------------------------------------------------------------------------------------------------------
  // ADAPTED: rerolls are a shared pool, not per-draft coupons, so "1 free
  // reroll in each of your next 3 drafts" is granted as 3 rerolls up front.
  card(
    {
      id: "ov_season_pass",
      name: "Season Pass",
      description: "Swipe the gold card: gain 3 draft rerolls.",
      tier: 6,
      category: "draft",
      icon: "Ticket",
      flavor: "Tier 6 of the battle pass is just more battle pass.",
    },
    instant((_inst, api) => {
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 3;
    }),
  ),
  // 144. Coup d'Etat ---------------------------------------------------------------------------------------------------------------
  // ADAPTED: the checkmate target cannot be reassigned without engine surgery;
  // instead the queen takes the throne's protection (her square is shielded for
  // your opponent's next 6 turns) while the king campaigns with queen movement
  // for 6 of your turns.
  card(
    {
      id: "ov_coup_detat",
      name: "Coup d'Etat",
      description:
        "The queen takes the throne: she cannot be captured for your opponent's next 6 turns, and for 6 of your turns your king moves like a queen.",
      tier: 6,
      category: "movement",
      icon: "Crown",
      flavor: "The paperwork simply says 'restructuring'.",
      requires: ["q"],
      fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 6;
        const q = mySquares(api.board, api.me, "q")[0];
        if (q != null) addEffect(api, { kind: "shield", owner: api.me, squares: [q], turns: 6 });
      },
      augmentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0) return;
        for (const sq of mySquares(api.board, api.me, "k")) {
          for (const m of slideMoves(api.board, sq, ALL_DIRS, inst.id)) {
            if (!moves.some((x) => x.from === m.from && x.to === m.to)) moves.push(m);
          }
        }
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.me),
      status: (inst) => `${turnsLeft(inst)} of your turns of regency left`,
    },
  ),
  // 145. Plot Armor -------------------------------------------------------------------------------------------------------------------
  // ADAPTED: captures cannot be intercepted mid-move (no bounce-the-attacker
  // hook), so the armor is a 6-turn shield: the chosen piece simply cannot be
  // captured at all during your opponent's next 6 turns.
  card(
    {
      id: "ov_plot_armor",
      name: "Plot Armor",
      description:
        "Choose one of your pieces (king excluded): it cannot be captured during your opponent's next 6 turns. The script insists.",
      tier: 6,
      category: "protection",
      icon: "ScrollText",
      flavor: "Sorry, this character is contracted for two more acts.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the protagonist",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 6 });
      },
      { freeAction: true },
    ),
  ),
  // 146. Feng Shui Plot ----------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_feng_shui_plot",
      name: "Feng Shui Plot",
      description:
        "Claim a 2x2 plot for 6 of your turns: your pieces standing inside it may also step one square in any direction.",
      tier: 6,
      category: "movement",
      icon: "Home",
      flavor: "Excellent chi. Terrible neighbours.",
      fx: { motif: "empower", pieces: "all", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.squares != null
          ? null
          : {
              kind: "square",
              label: "Choose the plot's bottom-left corner",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => FILE(sq) < 7 && RANK(sq) < 7,
              ),
            },
      effect: (inst, api, picks) => {
        const a = picks[0]?.square;
        if (a == null || inst.state.squares != null) return;
        inst.state.squares = [a, a + 1, a + 8, a + 9];
        inst.state.turns = 6;
        flashSquares(api, inst.state.squares as Square[]);
      },
      augmentMoves: (moves, inst, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares || turnsLeft(inst) <= 0) return;
        for (const sq of squares) {
          const p = api.board.pieces[sq];
          if (!p || p.color !== api.me) continue;
          for (const m of slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)) {
            if (p.type === "p" && !pawnRankOk(m.to)) continue;
            if (!moves.some((x) => x.from === m.from && x.to === m.to)) moves.push(m);
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.squares != null) tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.squares == null
          ? "activate to claim a plot"
          : `${turnsLeft(inst)} of your turns on the lease`,
    },
  ),
  // 147. Private Gallery ----------------------------------------------------------------------------------------------------------------
  // ADAPTED: the draft can offer at most 3 cards (prepThree), not the roster's
  // 4; the missing easel is paid out as the 10 seconds up front.
  card(
    {
      id: "ov_private_gallery",
      name: "Private Gallery",
      description: "Your next draft offers 3 cards, and you pocket 10 seconds at the door.",
      tier: 6,
      category: "draft",
      icon: "Image",
      flavor: "The velvet rope is load-bearing.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.adjustClock({ addSelfSec: 10 });
    }),
  ),
  // 148. Rolling Boulder ------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_rolling_boulder",
      name: "Rolling Boulder",
      description:
        "Roll a boulder down a chosen file from your side: the first enemy pawn in its path is flattened, the next piece beyond (kings excluded) is shoved one square onward, and the crater cannot be entered by your opponent for their next 3 turns.",
      tier: 6,
      category: "attack",
      icon: "Weight",
      flavor: "It gathers no moss and takes no questions.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the file the boulder rolls down",
              squares: Array.from({ length: 8 }, (_, f) => SQ(f, api.me === "w" ? 0 : 7)).filter((sq) => {
                const f = FILE(sq);
                for (let r = 0; r < 8; r++) {
                  const p = api.board.pieces[SQ(f, r)];
                  if (p && p.color === api.opp && p.type === "p") return true;
                }
                return false;
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const f = FILE(picks[0].square);
        const ranks = api.me === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
        let crater: Square | null = null;
        for (let i = 0; i < ranks.length; i++) {
          const sq = SQ(f, ranks[i]);
          const p = api.board.pieces[sq];
          if (crater == null) {
            if (p && p.color === api.opp && p.type === "p") {
              api.removePiece(sq);
              crater = sq;
            }
            continue;
          }
          // Past the crater: shove the next piece one square onward.
          if (!p) continue;
          if (p.type !== "k" && i + 1 < ranks.length) {
            const behind = SQ(f, ranks[i + 1]);
            if (!api.board.pieces[behind] && (p.type !== "p" || pawnRankOk(behind))) {
              api.relocate(sq, behind);
            }
          }
          break;
        }
        if (crater != null) {
          addEffect(api, { kind: "barred", squares: [crater], against: api.opp, turns: 3 });
          flashSquares(api, [crater], true);
        }
      },
    ),
  ),
  // 149. Lantern Festival ------------------------------------------------------------------------------------------------------------------
  // ADAPTED: wisp rules (no captures, block-only) have no self-move filter;
  // the revived pawns are ordinary pawns that fade after 6 of your turns.
  card(
    {
      id: "ov_lantern_festival",
      name: "Lantern Festival",
      description:
        "Revive up to 4 of your captured pawns onto empty squares of your second rank as lantern wisps. Any still on the board after 6 of your turns drift away.",
      tier: 6,
      category: "pieces",
      icon: "Flame",
      flavor: "Every light on the water is a soldier walking home.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.squares != null) return null;
        const max = Math.min(4, (api.capturedFromMe.p ?? 0) - (api.mine.revived.p ?? 0));
        if (picks.length === 0 && max <= 0) {
          return { kind: "square", label: "No captured pawns to revive", squares: [] };
        }
        if (picks.length >= max) return null;
        const rank = api.me === "w" ? 1 : 6;
        const squares = emptySquares(api.board, (sq) => RANK(sq) === rank).filter(
          (sq) => !picks.some((k) => k.square === sq),
        );
        if (squares.length === 0) return picks.length === 0 ? { kind: "square", label: "No room", squares: [] } : null;
        return {
          kind: "square",
          label: `Choose a wisp's square (${picks.length + 1}/${max})`,
          squares,
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      effect: (inst, api, picks) => {
        if (inst.state.squares != null) return;
        const placed: Square[] = [];
        for (const k of picks) {
          if (k.square == null || api.board.pieces[k.square]) continue;
          api.place(k.square, "p", api.me);
          markRevived(api, "p");
          pinCosmetic(api, k.square, api.me, "wings", null);
          placed.push(k.square);
        }
        inst.state.squares = placed;
        inst.state.turns = 6;
        if (placed.length === 0) inst.spent = true;
      },
      onMovePlayed: (inst, move, api) => {
        let squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        squares = squares
          .filter((sq) => !((move.capturedSquare === sq || move.to === sq) && move.from !== sq))
          .map((sq) => (move.from === sq ? move.to : sq));
        inst.state.squares = squares;
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          for (const sq of squares) {
            const p = api.board.pieces[sq];
            if (p && p.color === api.me && p.type === "p") api.removePiece(sq, { uncounted: true });
          }
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.squares == null
          ? "activate to float the lanterns"
          : `${(inst.state.squares as Square[]).length} wisps aloft, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 150. Paperwork Avalanche ------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_paperwork_avalanche",
      name: "Paperwork Avalanche",
      description:
        "For your opponent's next 3 turns, any enemy piece that captures is buried in forms and cannot move on their following turn.",
      tier: 6,
      category: "protection",
      icon: "FileStack",
      flavor: "Please fill out the capture in triplicate.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured && move.piece !== "k") {
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 1, skin: "glue" });
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];
