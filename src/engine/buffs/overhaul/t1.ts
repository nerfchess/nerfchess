// Overhaul roster, Tier 1 (cards 1-25 of docs/overhaul-roster.md): small,
// cheap, frequently silly. Every mechanic resolves through existing engine
// primitives; every random draw uses api.rng (deterministic, replay-safe).

import {
  Buff,
  Move,
  SQ,
  FILE,
  RANK,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  advancePawn,
  advanceablePawns,
  attackersOf,
  augment,
  card,
  flashSquares,
  fwdOf,
  instant,
  kingSquare,
  lastMoveBy,
  leapMoves,
  mySquares,
  ownRank,
  pinCosmetic,
  relRank,
  slideMoves,
  spendOnVia,
  teleportMoves,
  tickTurns,
  timedOppFilter,
  turnsLeft,
  undefendedPieces,
} from "./shared";

export const OVERHAUL_T1: Buff[] = [
  // 1. Pigeon Post -----------------------------------------------------------
  card(
    {
      id: "ov_pigeon_post",
      name: "Pigeon Post",
      description:
        "For your next 3 turns, every enemy piece attacking your queen is marked by a landing pigeon and loses any temporary shield covering it.",
      tier: 1,
      category: "info",
      icon: "Bird",
      flavor: "The mail always gets through. Usually onto someone's head.",
      requires: ["q"],
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) {
          const q = mySquares(api.board, api.me, "q")[0];
          if (q != null) {
            const marked = attackersOf(api.board, api.opp, q);
            flashSquares(api, marked, true);
            // Strip any temporary (non-permanent) enemy shield from the marked
            // attackers. Whole-army shields (squares === null) cannot exempt a
            // single piece, so they are left untouched.
            for (const e of api.bs.effects) {
              if (e.kind === "shield" && e.owner === api.opp && e.turns != null && e.squares != null) {
                e.squares = e.squares.filter((s) => !marked.includes(s));
              }
            }
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 2. Pebble Toss -----------------------------------------------------------
  card(
    {
      id: "ov_pebble_toss",
      name: "Pebble Toss",
      description:
        "Choose an unmoved enemy pawn; it loses its two-square first move on your opponent's next turn. The pebble is spent after that turn even if the pawn stays put.",
      tier: 1,
      category: "attack",
      icon: "Mountain",
      flavor: "A very small rock with very large opinions.",
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
              label: "Bonk an unmoved enemy pawn",
              squares: mySquares(api.board, api.opp, "p").filter(
                (sq) => relRank(api.opp, sq) === 1,
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        flashSquares(api, [sq], true);
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return moves;
        return moves.filter((m) => !(m.from === sq && m.isDoublePawn));
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // The pebble denies the double-step for the opponent's very next move
        // only: any opponent move spends the charge, whether or not they moved
        // (or ignored) the bonked pawn. A failed or illegal attempt still counts.
        if (move.color === api.opp) inst.spent = true;
      },
      status: (inst) => (inst.state.sq != null ? "pebble delivered" : "pick a pawn"),
    },
  ),
  // 3. Sock Slide --------------------------------------------------------------
  card(
    {
      id: "ov_sock_slide",
      name: "Sock Slide",
      description: "One of your pawns may slide one square sideways, once. The destination must be empty.",
      tier: 2,
      category: "movement",
      icon: "Footprints",
      flavor: "Hardwood floors were the real opening innovation.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    augment((_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "p")) {
        const f = FILE(sq);
        const tos: Square[] = [];
        if (f > 0) tos.push(sq - 1);
        if (f < 7) tos.push(sq + 1);
        out.push(...teleportMoves(api.board, sq, tos, inst.id));
      }
      return out;
    }),
  ),
  // 4. Warm-Up Stretch -----------------------------------------------------------
  card(
    {
      id: "ov_warmup_stretch",
      name: "Warm-Up Stretch",
      description:
        "One knight's next move may be a long camel leap (3,1) instead. When it makes the leap, gain one draft reroll.",
      tier: 1,
      category: "movement",
      icon: "Dumbbell",
      flavor: "Always stretch before vaulting a battlefield.",
      requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], self: true },
    },
    {
      ...augment((_moves, inst, api) => {
        const CAMEL = [
          [1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1],
        ] as const;
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "n")) {
          out.push(...leapMoves(api.board, sq, CAMEL, inst.id));
        }
        return out;
      }),
      onMovePlayed: (inst, move, api) => {
        if (move.via === inst.id && move.color === api.me) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        }
        spendOnVia(inst, move);
      },
    },
  ),
  // 5. Free Sample ---------------------------------------------------------------
  card(
    {
      id: "ov_free_sample",
      name: "Free Sample",
      description: "The next shared draft round arrives one full turn sooner for both players.",
      tier: 2,
      category: "draft",
      icon: "Gift",
      flavor: "The first taste is always free.",
    },
    instant((_inst, api) => {
      if (api.bs.nextDraftAtPly != null) {
        api.bs.nextDraftAtPly = Math.max(api.board.history.length + 1, api.bs.nextDraftAtPly - 2);
      }
    }),
  ),
  // 6. Lucky Penny -----------------------------------------------------------------
  card(
    {
      id: "ov_lucky_penny",
      name: "Lucky Penny",
      description:
        "Pick a pawn and flip the coin: 50% heads, the pawn advances one square now (the jackpot); tails, it stays put and the failed flip is banked as two draft rerolls.",
      tier: 1,
      category: "movement",
      icon: "Coins",
      flavor: "Heads you march. Tails you pretend that was the plan.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn betting on the flip",
              squares: advanceablePawns(api),
            },
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const heads = api.rng.next() < 0.5;
        inst.state.result = heads ? "heads" : "tails";
        if (heads) {
          advancePawn(api, sq);
        } else {
          flashSquares(api, [sq], true);
          // Bank the failed flip: two draft rerolls as consolation (works in
          // both timed and untimed play, unlike a clock payout).
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
        }
      },
      { freeAction: true },
    ),
  ),
  // 7. Wet Paint ----------------------------------------------------------------------
  card(
    {
      id: "ov_wet_paint",
      name: "Wet Paint",
      description: "Choose a square; enemy pieces cannot end their move on it for your opponent's next 2 turns.",
      tier: 1,
      category: "protection",
      icon: "Paintbrush",
      flavor: "The sign is the trap. The paint is also the trap.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Paint a square",
              squares: Array.from({ length: 64 }, (_, i) => i as Square),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        addEffect(api, { kind: "barred", squares: [picks[0].square], against: api.opp, turns: 2 });
      },
    ),
  ),
  // 8. Polite Cough ----------------------------------------------------------------------
  card(
    {
      id: "ov_polite_cough",
      name: "Polite Cough",
      description:
        "Ahem. Steal 10 seconds from your opponent's clock, flag the enemy piece that moved last until your opponent replies, and gain one draft reroll. In untimed games only the flag and the reroll apply.",
      tier: 1,
      category: "tempo",
      icon: "MessageCircle",
      flavor: "Devastating in libraries.",
    },
    {
      ...instant((_inst, api) => {
        api.adjustClock({ stealFlatSec: 10, stealCapSec: 10 });
        // The clock steal is a no-op in an untimed game, so always land two
        // effects that need no clock: mark the last enemy mover (clears once
        // they reply) and hand back a draft reroll.
        const last = lastMoveBy(api.board, api.opp);
        if (last) flashSquares(api, [last.to], true);
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      }),
    },
  ),
  // 9. Pet Rock -------------------------------------------------------------------------------
  card(
    {
      id: "ov_pet_rock",
      name: "Pet Rock",
      description: "One of your pawns cannot be captured during your opponent's next turn. The rock is watching.",
      tier: 2,
      category: "protection",
      icon: "Gem",
      flavor: "Loyal. Vigilant. Geological.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn the rock guards",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 1 });
      },
      { freeAction: true },
    ),
  ),
  // 10. Backwards Hat -----------------------------------------------------------------------------
  card(
    {
      id: "ov_backwards_hat",
      name: "Backwards Hat",
      description: "One pawn may capture straight ahead on its next move, and you gain 5 seconds when it does.",
      tier: 1,
      category: "movement",
      icon: "GraduationCap",
      flavor: "Instant plus two to confidence.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      ...augment((_moves, inst, api) => {
        const out: Move[] = [];
        const dir: readonly [number, number] = api.me === "w" ? [0, 1] : [0, -1];
        for (const sq of mySquares(api.board, api.me, "p")) {
          for (const m of slideMoves(api.board, sq, [dir], inst.id, 1)) {
            if (m.captured) out.push(m);
          }
        }
        return out;
      }),
      onMovePlayed: (inst, move, api) => {
        if (move.via === inst.id && move.color === api.me) {
          api.adjustClock({ addSelfSec: 5 });
        }
        spendOnVia(inst, move);
      },
    },
  ),
  // 11. Squeaky Shoes ----------------------------------------------------------------------------------
  card(
    {
      id: "ov_squeaky_shoes",
      name: "Squeaky Shoes",
      description:
        "For 5 of your turns, any enemy piece that ends a move next to your king squeaks and is marked. The first time one squeaks, gain one draft reroll.",
      tier: 1,
      category: "info",
      icon: "Footprints",
      flavor: "You cannot sneak up on a man who buys discount footwear for his enemies.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) {
          const k = kingSquare(api.board, api.me);
          if (k != null) {
            const df = Math.abs(FILE(move.to) - FILE(k));
            const dr = Math.abs(RANK(move.to) - RANK(k));
            if (df <= 1 && dr <= 1) {
              flashSquares(api, [move.to], true);
              // Reroll paid once, the first time the shoes squeak.
              if (!inst.state.rewarded) {
                api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
                inst.state.rewarded = true;
              }
            }
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 12. Second Opinion ---------------------------------------------------------------------------------
  card(
    {
      id: "ov_second_opinion",
      name: "Second Opinion",
      description: "A consulting monocle highlights every currently undefended enemy piece, once.",
      tier: 2,
      category: "info",
      icon: "Search",
      flavor: "Yes, yes. That one is definitely hanging.",
    },
    {
      ...activatedSimple((_inst, api) => {
        flashSquares(api, undefendedPieces(api.board, api.opp));
      }),
      freeAction: true,
    },
  ),
  // 13. Window Shopping ---------------------------------------------------------------------------------
  card(
    {
      id: "ov_window_shopping",
      name: "Window Shopping",
      description: "You know exactly which shelf you want: your next draft is dealt from tier 2.",
      tier: 1,
      category: "draft",
      icon: "Store",
      flavor: "Just browsing. Aggressively.",
    },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 2;
    }),
  ),
  // 14. Growth Spurt -------------------------------------------------------------------------------------
  card(
    {
      id: "ov_growth_spurt",
      name: "Growth Spurt",
      description: "One of your pawns becomes visibly enormous. This changes nothing at all.",
      tier: 1,
      category: "item",
      icon: "Maximize2",
      flavor: "They grow up so fast. Sideways, mostly.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn destined for greatness",
              squares: mySquares(api.board, api.me, "p"),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        pinCosmetic(api, picks[0].square, api.me, "giant", null);
      },
      { freeAction: true },
    ),
  ),
  // 15. Coupon --------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_coupon",
      name: "Coupon",
      description:
        "Clip it: gain one draft reroll. Thrifty shopper bonus: if you still hold an unused reroll when your third draft arrives, gain another.",
      tier: 1,
      category: "draft",
      icon: "Scissors",
      flavor: "Expires never. Void nowhere.",
    },
    // (Distinct from Peek, tier 1 flat reroll: the coupon pays a patience
    // dividend. Overhaul duplicate-resolution.)
    {
      kind: "passive",
      init: (inst, api) => {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        void inst;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        if ((api.mine.rerollsLeft ?? 0) <= 0) {
          inst.spent = true; // spent the rerolls: no dividend
          return;
        }
        if ((api.mine.draftsTaken ?? 0) >= 3) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          inst.spent = true;
        }
      },
      status: (inst) => (inst.spent ? null : "dividend pending: hold a reroll until draft 3"),
    },
  ),
  // 16. Nightlight ---------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_nightlight",
      name: "Nightlight",
      description:
        "A little lamp clicks on: enemy knights cannot end a move next to your king for your opponent's next turn.",
      tier: 1,
      category: "protection",
      icon: "Lamp",
      flavor: "Knights are basically monsters under the bed.",
    },
    timedOppFilter(1, (moves, _inst, api) => {
      const k = kingSquare(api.board, api.me);
      if (k == null) return moves;
      return moves.filter((m) => {
        if (m.piece !== "n") return true;
        const df = Math.abs(FILE(m.to) - FILE(k));
        const dr = Math.abs(RANK(m.to) - RANK(k));
        return df > 1 || dr > 1;
      });
    }),
  ),
  // 17. Whittle -----------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_whittle",
      name: "Whittle",
      description: "Carve one unmoved enemy pawn on the a-file or h-file into shavings. It is removed.",
      tier: 2,
      category: "attack",
      icon: "Axe",
      flavor: "Every masterpiece starts as someone else's rook pawn.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the rim pawn to whittle",
              squares: mySquares(api.board, api.opp, "p").filter(
                (sq) => (FILE(sq) === 0 || FILE(sq) === 7) && relRank(api.opp, sq) === 1,
              ),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) api.removePiece(picks[0].square);
      },
    ),
  ),
  // 18. Static Cling ----------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_static_cling",
      name: "Static Cling",
      description: "The enemy piece that moved last is stuck fast and cannot move on your opponent's next turn.",
      tier: 1,
      category: "attack",
      icon: "Zap",
      flavor: "Fresh from the dryer of fate.",
    },
    instant((_inst, api) => {
      const last = lastMoveBy(api.board, api.opp);
      if (!last) return;
      const p = api.board.pieces[last.to];
      if (p && p.color === api.opp && p.type !== "k") {
        addEffect(api, { kind: "freeze", sq: last.to, owner: api.opp, turns: 1, skin: "shock" });
      }
    }),
  ),
  // 19. Rain Check -----------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_rain_check",
      name: "Rain Check",
      description:
        "In 5 of your turns, the cloud pays out: gain 20 seconds on your clock, one draft reroll, and a look at the tier of your opponent's next draft. In untimed games only the reroll and the reveal arrive.",
      tier: 1,
      category: "tempo",
      icon: "CloudRain",
      flavor: "Redeemable for one (1) drizzle of time.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.adjustClock({ addSelfSec: 20 });
          // The clock payout is a no-op in an untimed game, so always land the
          // reroll and the tier reveal too.
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          api.mine.flags.seeOppTier = true;
          inst.spent = true;
        }
      },
      status: (inst) => `pays out in ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 20. Kazoo Fanfare ---------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_kazoo_fanfare",
      name: "Kazoo Fanfare",
      description: "Your next capture is celebrated with a triumphant kazoo solo and confetti. Nothing else happens.",
      tier: 1,
      category: "item",
      icon: "Music",
      flavor: "Morale is a resource. Probably.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.captured) {
          flashSquares(api, [move.to], true);
          inst.spent = true;
        }
      },
      status: () => "awaiting your next capture",
    },
  ),
  // 21. Left Foot First ----------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_left_foot_first",
      name: "Left Foot First",
      description:
        "Once, your king may lunge two squares toward the queenside if both squares are empty. Making the lunge spends your next unused draft reroll, if you have one.",
      tier: 1,
      category: "movement",
      icon: "Footprints",
      flavor: "The queenside was closer anyway.",
      fx: { motif: "empower", pieces: ["k"], self: true },
    },
    {
      ...augment((_moves, inst, api) => {
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "k")) {
          const f = FILE(sq);
          if (f < 2) continue;
          const mid = sq - 1, to = sq - 2;
          if (!api.board.pieces[mid] && !api.board.pieces[to]) {
            out.push(...teleportMoves(api.board, sq, [to], inst.id));
          }
        }
        return out;
      }),
      onMovePlayed: (inst, move, api) => {
        if (move.via === inst.id && move.color === api.me) {
          if ((api.mine.rerollsLeft ?? 0) > 0) api.mine.rerollsLeft -= 1;
        }
        spendOnVia(inst, move);
      },
    },
  ),
  // 22. Spare Button ---------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_spare_button",
      name: "Spare Button",
      description:
        "For your next 3 turns, if you lose a pawn, a fresh one is stitched onto its file's home square if that square is empty, and you gain 5 seconds. One use.",
      tier: 1,
      category: "pieces",
      icon: "CircleDot",
      flavor: "Grandma sews faster than armies march.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && move.captured === "p") {
          const capSq = move.capturedSquare ?? move.to;
          const home = SQ(FILE(capSq), ownRank(api.me, 1));
          // Only my own pawns count (the capture square held my pawn).
          if (!api.board.pieces[home]) {
            api.place(home, "p", api.me);
            api.adjustClock({ addSelfSec: 5 });
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of cover left`,
    },
  ),
  // 23. Tiny Trebuchet ---------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_tiny_trebuchet",
      name: "Tiny Trebuchet",
      description:
        "Launch one of your pawns two squares straight ahead, once. Both squares must be empty; no capturing on landing. It arms only after your opponent's next move.",
      tier: 1,
      category: "movement",
      icon: "Landmark",
      flavor: "The counterweight is a slightly larger pebble.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
        inst.state.armed = false;
      },
      augmentMoves: (moves, inst, api) => {
        if (!inst.state.armed) return;
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        const out: Move[] = [];
        const fwd = fwdOf(api.me);
        for (const sq of mySquares(api.board, api.me, "p")) {
          const mid = sq + fwd, to = sq + fwd * 2;
          if (to < 0 || to > 63) continue;
          if (RANK(to) === 0 || RANK(to) === 7) continue;
          if (!api.board.pieces[mid] && !api.board.pieces[to]) {
            out.push(...teleportMoves(api.board, sq, [to], inst.id));
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        // Delay the launch: it arms only after the opponent has moved once.
        if (!inst.state.armed && move.color === api.opp) inst.state.armed = true;
        spendOnVia(inst, move);
      },
      status: (inst) => (inst.state.armed ? null : "arms after your opponent moves"),
    },
  ),
  // 24. Name Tag --------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_name_tag",
      name: "Name Tag",
      description: "Stick a name tag on one enemy piece. It is Gary now. Capture Gary and gain 10 seconds.",
      tier: 1,
      category: "info",
      icon: "Tag",
      flavor: "It is much harder to blunder into a piece you have named.",
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
              label: "Choose who becomes Gary",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        pinCosmetic(api, sq, api.opp, "nametag", null, "Gary");
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.color === api.me && (move.capturedSquare === sq || move.to === sq) && move.captured) {
          api.adjustClock({ addSelfSec: 10 });
          inst.spent = true;
          return;
        }
        // Follow Gary when the opponent moves him; he stays Gary.
        if (move.color === api.opp && move.from === sq) inst.state.sq = move.to;
      },
      status: (inst) => (inst.state.sq != null ? "Gary lives, for now" : "pick a Gary"),
    },
  ),
  // 25. Fresh Socks -----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_fresh_socks",
      name: "Fresh Socks",
      description:
        "Your next move puts 13 seconds back on your clock, flags the enemy piece that moved last until your opponent replies, and gives you one draft reroll. In untimed games only the flag and the reroll apply. New socks, new you.",
      tier: 1,
      category: "tempo",
      icon: "Sparkles",
      flavor: "Peak athletic performance begins at the ankles.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        api.adjustClock({ addSelfSec: 13 });
        // The clock gain is a no-op in an untimed game, so always land two
        // effects that need no clock: mark the last enemy mover (clears once
        // they reply) and hand back a draft reroll.
        const last = lastMoveBy(api.board, api.opp);
        if (last) flashSquares(api, [last.to], true);
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        inst.spent = true;
      },
      status: () => "active on your next move",
    },
  ),
];
