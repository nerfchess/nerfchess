// Overhaul roster, Tier 2 (cards 26-50 of docs/overhaul-roster.md): modest
// utility with a grin. Every mechanic resolves through existing engine
// primitives; every random draw uses api.rng (deterministic, replay-safe)
// and only inside init/effect/onMovePlayed.

import {
  Buff,
  BuffApi,
  buffRegistry,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  advancePawn,
  attackersOf,
  augment,
  card,
  captureSquare,
  flashSquares,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  kingSquare,
  leapMoves,
  mySquares,
  pawnRankOk,
  pinCosmetic,
  teleportMoves,
  tickTurns,
  turnsLeft,
  undefendedPieces,
} from "./shared";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Square directly behind an enemy pawn (toward its own back rank), or null. */
function retreatSquare(api: BuffApi, sq: Square): Square | null {
  const back = sq - fwdOf(api.opp);
  if (back < 0 || back > 63) return null;
  if (api.board.pieces[back] || !pawnRankOk(back)) return null;
  return back;
}

/** Current squares of enemy pieces that have moved at least once, tracked
 * through board.history (a real read: follows each mover to where it stands
 * now and drops the ones that were captured along the way). */
function movedEnemySquares(api: BuffApi): Square[] {
  const moved = new Set<Square>();
  for (const m of api.board.history) {
    if (m.color === api.opp) {
      moved.delete(m.from);
      moved.add(m.to);
    } else {
      const cap = captureSquare(m);
      if (cap != null) moved.delete(cap);
      moved.delete(m.to);
    }
  }
  return [...moved].filter((sq) => api.board.pieces[sq]?.color === api.opp);
}

export const OVERHAUL_T2: Buff[] = [
  // 26. Broom Sweep -----------------------------------------------------------
  card(
    {
      id: "ov_broom_sweep",
      name: "Broom Sweep",
      description:
        "Pick a rank. After your opponent's next move, every enemy pawn on it is swept one square back toward its own side, wherever the square behind it is empty.",
      tier: 2,
      category: "attack",
      icon: "Brush",
      flavor: "This board was filthy with pawns.",
    },
    // Delayed: you pick the rank now, but the broom only sweeps once the
    // opponent has replied (it sweeps whichever enemy pawns sit on that rank
    // at that moment).
    activated(
      (inst, api, picks) => {
        if (picks.length > 0 || inst.state.rank != null) return null;
        const ranks = new Set<number>();
        for (const sq of mySquares(api.board, api.opp, "p")) {
          if (retreatSquare(api, sq) != null) ranks.add(RANK(sq));
        }
        const squares: Square[] = [];
        for (let sq = 0; sq < 64; sq++) if (ranks.has(RANK(sq))) squares.push(sq);
        return { kind: "square", label: "Pick any square on the rank to sweep", squares };
      },
      (inst, _api, picks) => {
        if (picks[0]?.square == null || inst.state.rank != null) return;
        inst.state.rank = RANK(picks[0].square);
      },
      {
        freeAction: true,
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (inst.state.rank == null || move.color !== api.opp) return;
          const rank = inst.state.rank as number;
          for (const sq of mySquares(api.board, api.opp, "p")) {
            if (RANK(sq) !== rank) continue;
            const back = retreatSquare(api, sq);
            if (back != null) api.relocate(sq, back);
          }
          inst.spent = true;
        },
        status: (inst) =>
          inst.state.rank != null ? "sweeping after their reply" : "pick a rank to sweep",
      },
    ),
  ),
  // 27. Grappling Hook --------------------------------------------------------
  card(
    {
      id: "ov_grappling_hook",
      name: "Grappling Hook",
      description:
        "Mark one enemy piece (not the king). After your opponent's next move, pull it one square toward you along its file, if it is still there and the square behind it is empty.",
      tier: 2,
      category: "attack",
      icon: "Anchor",
      flavor: "Get over here. Slightly.",
    },
    // Nothing here counts, ranges, or lasts more than one (one piece, one
    // square), so the balance pass delays the whole effect instead: you aim
    // the hook now and it reels in only after the opponent has replied, which
    // gives the target a chance to slip away.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Hook an enemy piece",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const p = api.board.pieces[sq]!;
                if (p.type === "k") return false;
                const dest = sq - fwdOf(api.me);
                if (dest < 0 || dest > 63 || api.board.pieces[dest]) return false;
                return p.type !== "p" || pawnRankOk(dest);
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        flashSquares(api, [sq], true);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.opp) return;
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp && p.type !== "k") {
          const dest = sq - fwdOf(api.me);
          if (dest >= 0 && dest <= 63 && !api.board.pieces[dest] && (p.type !== "p" || pawnRankOk(dest))) {
            api.relocate(sq, dest);
          }
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.sq != null ? "reeling in after their reply" : "activate to hook a piece",
    },
  ),
  // 28. Moat Digger -----------------------------------------------------------
  card(
    {
      id: "ov_moat_digger",
      name: "Moat Digger",
      description:
        "Dig a moat on two adjacent empty squares in your half: enemy pieces cannot end a move on them for your opponent's next 3 turns. Use it before your next move, or the charge is spent unused.",
      tier: 2,
      category: "protection",
      icon: "Shovel",
      flavor: "The duck is included at no extra cost.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Dig the first moat square",
            squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
              if (api.board.pieces[sq] || !inHalf(api.me, sq)) return false;
              const f = FILE(sq), r = RANK(sq);
              const near: [number, number][] = [[f + 1, r], [f - 1, r], [f, r + 1], [f, r - 1]];
              return near.some(
                ([nf, nr]) =>
                  inBoard(nf, nr) && !api.board.pieces[SQ(nf, nr)] && inHalf(api.me, SQ(nf, nr)),
              );
            }),
          };
        }
        const first = picks[0].square!;
        const f = FILE(first), r = RANK(first);
        const near: [number, number][] = [[f + 1, r], [f - 1, r], [f, r + 1], [f, r - 1]];
        return {
          kind: "square",
          label: "Dig the second moat square",
          squares: near
            .filter(([nf, nr]) => inBoard(nf, nr))
            .map(([nf, nr]) => SQ(nf, nr))
            .filter((sq) => !api.board.pieces[sq] && inHalf(api.me, sq)),
        };
      },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
      },
      {
        // The activation is only offered when the moat can be dug, so a failed
        // attempt cannot occur; instead the charge expires the moment you next
        // move without having used it (glossary: a failed or illegal attempt
        // still spends the charge).
        onMovePlayed: (inst, move, api) => {
          if (move.color === api.me && !inst.usedActivation) inst.spent = true;
        },
      },
    ),
  ),
  // 29. Mirror Shield ---------------------------------------------------------
  // ADAPTED: the roster says "remove one enemy pawn of your choice", but a
  // passive trigger cannot collect a target mid-turn, so the reflected beam
  // picks a seeded-random enemy pawn instead (api.rng, replay-safe). The
  // description tells the truth.
  card(
    {
      id: "ov_mirror_shield",
      name: "Mirror Shield",
      description:
        "The next time one of your knights or bishops is captured, the shield flashes back and removes a random enemy pawn. If they have no pawns, it keeps waiting.",
      tier: 1,
      category: "protection",
      icon: "Shield",
      flavor: "Reflect on what you have done.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || (move.captured !== "n" && move.captured !== "b")) return;
        const pawns = mySquares(api.board, api.opp, "p");
        if (pawns.length === 0) return;
        const target = pawns[api.rng.int(pawns.length)];
        flashSquares(api, [target]);
        api.removePiece(target);
        inst.spent = true;
      },
      status: () => "polished and waiting",
    },
  ),
  // 30. Loose Floorboard ------------------------------------------------------
  card(
    {
      id: "ov_loose_floorboard",
      name: "Loose Floorboard",
      description:
        "Rig one empty square: the first enemy piece that ends a move there is bounced straight back to the square it came from. One use.",
      tier: 2,
      category: "protection",
      icon: "Undo2",
      flavor: "Every castle has that one plank.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Rig an empty square",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => !api.board.pieces[sq],
              ),
            },
      effect: (inst, api, picks) => {
        if (picks[0]?.square == null || inst.state.sq != null) return;
        inst.state.sq = picks[0].square;
        flashSquares(api, [picks[0].square], true);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || move.color !== api.opp || move.to !== sq) return;
        if (move.from !== move.to && !api.board.pieces[move.from]) {
          api.relocate(move.to, move.from);
          flashSquares(api, [sq], true);
        }
        inst.spent = true;
      },
      status: (inst) => (inst.state.sq != null ? "board creaks softly" : "pick a square to rig"),
    },
  ),
  // 31. Second Breakfast ------------------------------------------------------
  // ADAPTED: the engine plays one move per turn, so the "two separate
  // one-square advances" resolve as a single composite two-step march (both
  // squares must be empty, no captures), which is the same board result.
  card(
    {
      id: "ov_second_breakfast",
      name: "Second Breakfast",
      description:
        "One of your pawns may march two single steps forward as your very next move: both squares must be empty, no capturing. Whether or not you take it, the charge is spent the moment you next move.",
      tier: 2,
      category: "movement",
      icon: "Croissant",
      flavor: "An army marches on its stomach. Twice, ideally.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    // The granted march is only ever offered when legal, so a failed attempt
    // cannot occur; instead the charge expires the moment you next move, taken
    // or not (glossary: a failed or illegal attempt still spends the charge).
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        const fwd = fwdOf(api.me);
        for (const sq of mySquares(api.board, api.me, "p")) {
          const mid = sq + fwd, to = sq + fwd * 2;
          if (to < 0 || to > 63 || !pawnRankOk(to)) continue;
          if (!api.board.pieces[mid] && !api.board.pieces[to]) {
            out.push(...teleportMoves(api.board, sq, [to], inst.id));
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || ((inst.state.charges as number) ?? 0) <= 0) return;
        inst.state.charges = 0;
        inst.spent = true;
      },
    },
  ),
  // 32. Loading Screen Tip ----------------------------------------------------
  card(
    {
      id: "ov_loading_screen_tip",
      name: "Loading Screen Tip",
      description:
        "A parody loading tip plays. After your opponent's next move, the spotlight lands on the cheapest undefended enemy piece; if everything is defended, it highlights their cheapest piece anyway.",
      tier: 2,
      category: "info",
      icon: "Loader",
      flavor: "Tip: pieces cannot be captured if you never move them. This tip is a lie.",
    },
    // Delayed: the tip plays on use, but the spotlight only lands once the
    // opponent has replied (it reads the board at that moment).
    {
      kind: "activated",
      freeAction: true,
      spendOnUse: false,
      effect: (inst) => {
        inst.state.armed = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed || move.color !== api.opp) return;
        const own = mySquares(api.board, api.opp);
        const undefended = undefendedPieces(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k",
        );
        const pool = undefended.length
          ? undefended
          : own.filter((sq) => api.board.pieces[sq]!.type !== "k");
        const final = pool.length ? pool : own;
        if (final.length) {
          let best = final[0];
          for (const sq of final) {
            if (VALUE[api.board.pieces[sq]!.type] < VALUE[api.board.pieces[best]!.type]) best = sq;
          }
          flashSquares(api, [best]);
        }
        inst.spent = true;
      },
      status: (inst) => (inst.state.armed ? "spotlight warming up" : "activate to play the tip"),
    },
  ),
  // 33. Sandbags --------------------------------------------------------------
  card(
    {
      id: "ov_sandbags",
      name: "Sandbags",
      description: "Stack sandbags on up to 2 of your pawns: they cannot be captured during your opponent's next turn.",
      tier: 3,
      category: "protection",
      icon: "Layers",
      flavor: "Sand: nature's bureaucracy against progress.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose a pawn to sandbag (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.me, "p").filter(
                (sq) => !picks.some((k) => k.square === sq),
              ),
              ...(picks.length === 1 ? { finishable: true } : {}),
            },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (squares.length) addEffect(api, { kind: "shield", owner: api.me, squares, turns: 1 });
      },
      { freeAction: true },
    ),
  ),
  // 34. Slingshot -------------------------------------------------------------
  card(
    {
      id: "ov_slingshot",
      name: "Slingshot",
      description:
        "One of your pawns shoots down an enemy pawn up to 2 squares directly ahead of it. The shooter stays put. Using it consumes your next unused draft reroll, if any.",
      tier: 2,
      category: "attack",
      icon: "Target",
      flavor: "Davids 1, Goliaths 0.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const fwd = fwdOf(api.me);
        const targetsOf = (sq: Square) =>
          [sq + fwd, sq + fwd * 2].filter(
            (t) =>
              t >= 0 &&
              t <= 63 &&
              api.board.pieces[t]?.color === api.opp &&
              api.board.pieces[t]?.type === "p",
          );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the shooter pawn",
            squares: mySquares(api.board, api.me, "p").filter((sq) => targetsOf(sq).length > 0),
          };
        }
        return { kind: "square", label: "Choose the enemy pawn to shoot", squares: targetsOf(picks[0].square!) };
      },
      (_inst, api, picks) => {
        const target = picks[1]?.square;
        if (target != null && api.board.pieces[target]?.color === api.opp) {
          flashSquares(api, [target], true);
          api.removePiece(target);
        }
        if (api.mine.rerollsLeft > 0) api.mine.rerollsLeft -= 1;
      },
    ),
  ),
  // 35. Molting Season --------------------------------------------------------
  card(
    {
      id: "ov_molting_season",
      name: "Molting Season",
      description:
        "One of your bishops sheds its robes and permanently becomes a knight. Using it consumes your next unused draft reroll, if any.",
      tier: 2,
      category: "pieces",
      icon: "Feather",
      flavor: "Under every cassock, a horse was waiting.",
      requires: ["b"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the molting bishop",
              squares: mySquares(api.board, api.me, "b"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.setPieceType(picks[0].square, "n");
        if (api.mine.rerollsLeft > 0) api.mine.rerollsLeft -= 1;
      },
      { freeAction: true },
    ),
  ),
  // 36. Traffic Cone ----------------------------------------------------------
  card(
    {
      id: "ov_traffic_cone",
      name: "Traffic Cone",
      description:
        "Drop cones on up to 3 squares of one file in your half: enemy pieces may pass over them but cannot end a move on them for your opponent's next 2 turns.",
      tier: 2,
      category: "protection",
      icon: "Cone",
      flavor: "Respected by knights, feared by rooks, ignored by pigeons.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 3) return null;
        const myHalf = Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) =>
          inHalf(api.me, sq),
        );
        if (picks.length === 0) {
          return { kind: "square", label: "Drop the first cone", squares: myHalf };
        }
        const file = FILE(picks[0].square!);
        return {
          kind: "square",
          label: `Drop another cone on the same file (${picks.length + 1}/3)`,
          squares: myHalf.filter((sq) => FILE(sq) === file && !picks.some((k) => k.square === sq)),
          finishable: true,
        };
      },
      (_inst, api, picks) => {
        const squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
        if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
      },
    ),
  ),
  // 37. Group Photo -----------------------------------------------------------
  card(
    {
      id: "ov_group_photo",
      name: "Group Photo",
      description:
        "Snap a photo: every enemy piece that has moved at least once this game is marked, once.",
      tier: 1,
      category: "info",
      icon: "Camera",
      flavor: "Say cheese. The unmoved ones did not get the memo.",
    },
    {
      ...activatedSimple((_inst, api) => {
        flashSquares(api, movedEnemySquares(api));
      }),
      freeAction: true,
    },
  ),
  // 38. Sugar Glider ----------------------------------------------------------
  card(
    {
      id: "ov_sugar_glider",
      name: "Sugar Glider",
      description: "One knight's next move may be a (2,2) diagonal glide instead.",
      tier: 1,
      category: "movement",
      icon: "Squirrel",
      flavor: "Technically flying, legally falling.",
      requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], self: true },
    },
    augment((_moves, inst, api) => {
      const GLIDE = [[2, 2], [2, -2], [-2, 2], [-2, -2]] as const;
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "n")) {
        out.push(...leapMoves(api.board, sq, GLIDE, inst.id));
      }
      return out;
    }),
  ),
  // 39. Overdue Library Book --------------------------------------------------
  // ADAPTED: the engine does not track a piece's original game-start square,
  // so the book is returned to an empty home square of its type on the enemy
  // back rank (knights b/g, bishops c/f), falling back to any empty back-rank
  // square; if the whole back rank is full the loan quietly expires. The
  // description tells the truth about where it lands.
  card(
    {
      id: "ov_overdue_library_book",
      name: "Overdue Library Book",
      description:
        "Stamp an enemy knight or bishop. In 6 of your turns, if it still lives, then after your opponent's next move the librarian drags it back to an empty home square of its type on the enemy back rank (or any free back-rank square).",
      tier: 2,
      category: "attack",
      icon: "BookOpen",
      flavor: "The fines are measured in tempo.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Stamp an enemy minor piece",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 6;
        flashSquares(api, [sq], true);
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the book while the opponent shelves it around; the loan ends
        // if the piece is captured.
        if (move.color === api.me && captureSquare(move) === sq) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && move.from === sq) inst.state.sq = move.to;
        // Delayed payoff: once the countdown elapses the drag does not fire on
        // your move, it waits for the opponent's next move and lands then.
        if (inst.state.pending) {
          if (move.color !== api.opp) return;
          const cur = inst.state.sq as Square;
          const p = api.board.pieces[cur];
          if (p && p.color === api.opp && (p.type === "n" || p.type === "b")) {
            const backRank = api.opp === "w" ? 0 : 7;
            const homeFiles = p.type === "n" ? [1, 6] : [2, 5];
            const homes = homeFiles
              .map((f) => SQ(f, backRank))
              .filter((s) => !api.board.pieces[s]);
            const fallback = Array.from({ length: 8 }, (_, f) => SQ(f, backRank)).filter(
              (s) => !api.board.pieces[s],
            );
            const options = homes.length ? homes : fallback;
            if (options.length) {
              const dest = options[api.rng.int(options.length)];
              api.relocate(cur, dest);
              flashSquares(api, [dest], true);
            }
          }
          inst.spent = true;
          return;
        }
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        // Countdown done: arm the delayed drag for after the opponent replies.
        inst.state.pending = true;
      },
      status: (inst) =>
        inst.state.sq == null
          ? "pick a book"
          : inst.state.pending
            ? "overdue, returning after their reply"
            : `due back in ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 40. Wheelbarrow ------------------------------------------------------------
  card(
    {
      id: "ov_wheelbarrow",
      name: "Wheelbarrow",
      description: "One of your pawns may trundle to any adjacent empty square, once.",
      tier: 2,
      category: "movement",
      icon: "Truck",
      flavor: "Logistics wins wars. Squeakily.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const tos: Square[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (inBoard(f, r) && pawnRankOk(SQ(f, r))) tos.push(SQ(f, r));
          }
        }
        out.push(...teleportMoves(api.board, sq, tos, inst.id));
      }
      return out;
    }),
  ),
  // 41. Loot Filter ------------------------------------------------------------
  card(
    {
      id: "ov_loot_filter",
      name: "Loot Filter",
      description:
        "Gain a draft reroll. Filter bonus: the first time an offer deals you two cards of the same category, the filter flags the dupes and refunds another reroll.",
      tier: 2,
      category: "draft",
      icon: "Filter",
      flavor: "Vendor trash is a state of mind.",
    },
    // Overhaul duplicate-resolution: a flat reroll duplicated Peek (T1); the
    // filter now also pays out on same-category offers, a real T2 rider.
    {
      kind: "passive",
      init: (inst, api) => {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        void inst;
      },
      onMovePlayed: (inst, _move, api) => {
        const offer = api.mine.offer;
        if (!offer || offer.cards.length < 2) return;
        const cats = offer.cards.map((c) => buffRegistry.byId[c.id]?.category);
        if (cats[0] != null && cats.every((c) => c === cats[0])) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          inst.spent = true;
        }
      },
      status: (inst) => (inst.spent ? null : "filter armed: watching for a same-category offer"),
    },
  ),
  // 42. Encore -----------------------------------------------------------------
  // ADAPTED: the roster's "extra pawn move" reward is granted through the
  // engine's extra-move counter (the only extra-action primitive), so the
  // bonus action is a full extra move rather than pawn-only. The engine owns
  // chainKingGuard for chained moves; this card only bumps extraMoves.
  card(
    {
      id: "ov_encore",
      name: "Encore",
      description: "If your next move puts the enemy king in danger, you immediately move again.",
      tier: 2,
      category: "tempo",
      icon: "Drama",
      flavor: "The crowd demands a second act.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const k = kingSquare(api.board, api.opp);
        if (k != null && attackersOf(api.board, api.me, k).length > 0) {
          api.bs.extraMoves[api.me] += 1;
        }
        inst.spent = true;
      },
      status: () => "watching your next move",
    },
  ),
  // 43. Compost Heap -----------------------------------------------------------
  card(
    {
      id: "ov_compost_heap",
      name: "Compost Heap",
      description: "For your next 5 turns, gain 8 seconds whenever one of your pawns is captured.",
      tier: 2,
      category: "tempo",
      icon: "Recycle",
      flavor: "Nothing is wasted. Especially not the pawns.",
      requires: ["p"],
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && move.captured === "p") {
          api.adjustClock({ addSelfSec: 8 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of composting left`,
    },
  ),
  // 44. Velcro Gloves ----------------------------------------------------------
  // ADAPTED: the roster's "may return" choice cannot be offered after a move
  // resolves, so the spring-back is automatic on your next capture (skipped on
  // promotions so a fresh queen is never yanked backwards). The description
  // says what actually happens.
  card(
    {
      id: "ov_velcro_gloves",
      name: "Velcro Gloves",
      description:
        "On your next capture, the capturing piece rips free and snaps back to the square it came from. Promotions keep their new square.",
      tier: 2,
      category: "movement",
      icon: "Hand",
      flavor: "The grip is temporary. The rip is forever.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me || !move.captured) return;
        if (!move.promotion && move.from !== move.to && !api.board.pieces[move.from]) {
          api.relocate(move.to, move.from);
        }
        inst.spent = true;
      },
      status: () => "gloves on, awaiting your next capture",
    },
  ),
  // 45. Smoke Ring ---------------------------------------------------------------
  // ADAPTED: the engine has no fog-of-war rendering, so instead of silhouettes
  // the smoke turns enemy pieces away: a barred zone means they cannot END a
  // move inside the 2x2 area for the opponent's next 2 turns. The description
  // tells the truth about the mechanic.
  card(
    {
      id: "ov_smoke_ring",
      name: "Smoke Ring",
      description:
        "Blow a smoke ring over a 2x2 area. The smoke turns enemy pieces away: they cannot end a move inside it for your opponent's next 2 turns.",
      tier: 2,
      category: "protection",
      icon: "Cloud",
      flavor: "Nothing to see here. Literally.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the bottom-left corner of the smoke",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => FILE(sq) < 7 && RANK(sq) < 7,
              ),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        addEffect(api, {
          kind: "barred",
          squares: [c, c + 1, c + 8, c + 9],
          against: api.opp,
          turns: 2,
        });
      },
    ),
  ),
  // 46. Tandem Bike --------------------------------------------------------------
  card(
    {
      id: "ov_tandem_bike",
      name: "Tandem Bike",
      description:
        "Two of your pawns standing side by side advance one square together, as your move for this turn. Both squares ahead must be empty.",
      tier: 2,
      category: "movement",
      icon: "Bike",
      flavor: "Pedal in sync or fall over in sync.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const fwd = fwdOf(api.me);
        const canRide = (sq: Square) => {
          const to = sq + fwd;
          return to >= 0 && to <= 63 && !api.board.pieces[to] && pawnRankOk(to);
        };
        const partnerOf = (sq: Square) =>
          [sq - 1, sq + 1].filter(
            (n) =>
              Math.abs(FILE(n) - FILE(sq)) === 1 &&
              RANK(n) === RANK(sq) &&
              api.board.pieces[n]?.color === api.me &&
              api.board.pieces[n]?.type === "p" &&
              canRide(n),
          );
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the front seat pawn",
            squares: mySquares(api.board, api.me, "p").filter(
              (sq) => canRide(sq) && partnerOf(sq).length > 0,
            ),
          };
        }
        return { kind: "square", label: "Choose the back seat pawn", squares: partnerOf(picks[0].square!) };
      },
      (_inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null) return;
        advancePawn(api, a);
        advancePawn(api, b);
      },
    ),
  ),
  // 47. Rubber Stamp ---------------------------------------------------------------
  card(
    {
      id: "ov_rubber_stamp",
      name: "Rubber Stamp",
      description: "For your next 3 turns, every pawn move you make refunds 3 seconds.",
      tier: 2,
      category: "tempo",
      icon: "Stamp",
      flavor: "APPROVED. APPROVED. APPROVED.",
      requires: ["p"],
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.piece === "p") {
          api.adjustClock({ addSelfSec: 3 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of stamping left`,
    },
  ),
  // 48. Speedrun Timer ---------------------------------------------------------------
  // ADAPTED: the engine never learns how long a move took to think about, so
  // the splits pay on the moves themselves: every move in the window refunds
  // 4 seconds, and a capture counts as a gold split worth 8. The description
  // matches the real payout.
  card(
    {
      id: "ov_speedrun_timer",
      name: "Speedrun Timer",
      description:
        "For your next 3 turns, each move you make refunds 4 seconds. A capture counts as a gold split and refunds 8 instead.",
      tier: 2,
      category: "tempo",
      icon: "Timer",
      flavor: "Personal best, pending verification.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me) {
          api.adjustClock({ addSelfSec: move.captured ? 8 : 4 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} splits left`,
    },
  ),
  // 49. Left on Read -----------------------------------------------------------------
  // ADAPTED: there is no dedicated typing-bubble cosmetic skin, so the
  // indicator is a pinned name tag reading "typing..." over their king. Pure
  // cosmetics either way, exactly as the roster intends.
  card(
    {
      id: "ov_left_on_read",
      name: "Left on Read",
      description:
        "For your opponent's next 3 turns, a typing indicator hangs over their king. It does nothing. It is devastating.",
      tier: 2,
      category: "item",
      icon: "MessageSquare",
      flavor: "Delivered. Seen. Ignored.",
    },
    instant((_inst, api) => {
      const k = kingSquare(api.board, api.opp);
      if (k != null) pinCosmetic(api, k, api.opp, "nametag", 3, "typing...");
    }),
  ),
  // 50. Barn Door ----------------------------------------------------------------------
  card(
    {
      id: "ov_barn_door",
      name: "Barn Door",
      description:
        "Slam the barn door on one file: enemy pieces cannot end a move on that file's square of your back rank for your opponent's next 3 turns.",
      tier: 2,
      category: "protection",
      icon: "DoorClosed",
      flavor: "Closed well before any horses left.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick any square on the file to bar",
              squares: Array.from({ length: 64 }, (_, i) => i as Square),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const backRank = api.me === "w" ? 0 : 7;
        addEffect(api, {
          kind: "barred",
          squares: [SQ(FILE(picks[0].square), backRank)],
          against: api.opp,
          turns: 3,
        });
      },
      { freeAction: true },
    ),
  ),
];
