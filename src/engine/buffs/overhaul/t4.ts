// Overhaul roster, Tier 4 (cards 76-100 of docs/overhaul-roster.md): solid
// mid-game tools. Every mechanic resolves through existing engine primitives;
// every random draw uses api.rng (deterministic, replay-safe) and only inside
// init / effect / onMovePlayed.

import type { BuffInstance } from "../../buff";
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
  addEffect,
  advancePawn,
  advanceablePawns,
  attackersOf,
  bindCandidates,
  bindPiece,
  buffRegistry,
  card,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  flashSquares,
  kingSquare,
  leapMoves,
  mySquares,
  pawnRankOk,
  pinCosmetic,
  relRank,
  slideMoves,
  stunEnemy,
  teleportMoves,
  tickTurns,
  timedAugment,
  turnsLeft,
} from "./shared";

/** All 8 neighbours of a square that are on the board, ascending. */
function neighbors(sq: Square): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of ALL_DIRS) {
    const f = FILE(sq) + df, r = RANK(sq) + dr;
    if (inBoard(f, r)) out.push(SQ(f, r));
  }
  return out.sort((a, b) => a - b);
}

/** Chebyshev adjacency (distinct squares within a king step). */
function adjacent(a: Square, b: Square): boolean {
  return a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;
}

/** Empty destinations of the piece on `sq` by its own slide geometry
 * (bishops on diagonals, rooks on lines); non-capture squares only. */
function emptySlideDests(api: BuffApi, sq: Square): Square[] {
  const p = api.board.pieces[sq];
  if (!p) return [];
  const dirs = p.type === "b" ? DIAG_DIRS : p.type === "r" ? ORTHO_DIRS : null;
  if (!dirs) return [];
  return slideMoves(api.board, sq, dirs, "geom").filter((m) => !m.captured).map((m) => m.to);
}

/** Empty non-capture destinations of an enemy MINOR on `sq` (knight leaps or
 * bishop diagonals), plain geometry over the live board. */
function minorQuietDests(api: BuffApi, sq: Square): Square[] {
  const p = api.board.pieces[sq];
  if (!p) return [];
  if (p.type === "n") {
    return leapMoves(api.board, sq, KNIGHT_LEAPS, "geom").filter((m) => !m.captured).map((m) => m.to);
  }
  if (p.type === "b") return emptySlideDests(api, sq);
  return [];
}

export const OVERHAUL_T4: Buff[] = [
  // 76. Puppet Practice --------------------------------------------------------
  card(
    {
      id: "ov_puppet_practice",
      name: "Puppet Practice",
      description:
        "Once: move an enemy bishop or rook yourself, along its normal lines, onto an empty square. No captures.",
      tier: 5,
      category: "movement",
      icon: "Hand",
      flavor: "Strings drop from nowhere and the marionette jerks to attention.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy bishop or rook to puppet",
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return (t === "b" || t === "r") && emptySlideDests(api, sq).length > 0;
            }),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose where it is walked to",
            squares: emptySlideDests(api, picks[0].square!),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.opp || (p.type !== "b" && p.type !== "r")) return;
        if (api.board.pieces[to]) return;
        api.relocate(from, to);
        flashSquares(api, [to], true);
      },
    ),
  ),
  // 77. Dragon Egg -------------------------------------------------------------
  // ADAPTED: the roster's egg marker is implemented as a friendly pawn that is
  // frozen (cannot be commanded) until it hatches, and the "opponent gains 15
  // seconds if captured" clock rider is dropped (ClockRequest cannot credit the
  // opponent): the egg being a real capturable pawn is the counterplay.
  card(
    {
      id: "ov_dragon_egg",
      name: "Dragon Egg",
      description:
        "Place an egg (an immobile pawn) on an empty square in your half. After 6 of your turns it hatches into a queen; every 3 of your turns after hatching, the wyrm devours one random enemy pawn adjacent to it. If the egg is captured first, nothing hatches.",
      tier: 3,
      category: "pieces",
      icon: "Egg",
      flavor: "It wobbles once per turn. That is not reassuring.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the egg is laid",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => !api.board.pieces[sq] && inHalf(api.me, sq) && pawnRankOk(sq),
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.place(sq, "p", api.me);
        pinCosmetic(api, sq, api.me, "wooden", 6, "Dragon Egg");
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 6, skin: "stone" });
        inst.state.sq = sq;
        inst.state.hatch = 6;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // The egg (or wyrm) dying ends the card.
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color !== api.me) return;
        const cur = inst.state.sq as Square;
        if (!inst.state.hatched) {
          const h = ((inst.state.hatch as number) ?? 0) - 1;
          inst.state.hatch = h;
          if (h <= 0) {
            api.setPieceType(cur, "q");
            inst.state.hatched = true;
            inst.state.feed = 3;
            flashSquares(api, [cur]);
          }
          return;
        }
        const f = ((inst.state.feed as number) ?? 3) - 1;
        inst.state.feed = f;
        if (f <= 0) {
          inst.state.feed = 3;
          const prey = neighbors(cur).filter((n) => {
            const p = api.board.pieces[n];
            return !!p && p.color === api.opp && p.type === "p";
          });
          if (prey.length > 0) {
            const bite = prey[api.rng.int(prey.length)];
            api.removePiece(bite);
            flashSquares(api, [bite]);
          }
        }
      },
      status: (inst) => {
        if (inst.state.sq == null) return "activate to lay the egg";
        if (!inst.state.hatched) return `hatches in ${(inst.state.hatch as number) ?? 0} of your turns`;
        return `wyrm feeds in ${(inst.state.feed as number) ?? 0} of your turns`;
      },
    },
  ),
  // 78. Thunderstorm -----------------------------------------------------------
  card(
    {
      id: "ov_thunderstorm",
      name: "Thunderstorm",
      description:
        "For your opponent's next 3 turns, lightning strikes a random square in their half after each of their moves, destroying any enemy pawn standing there.",
      tier: 3,
      category: "attack",
      icon: "CloudLightning",
      flavor: "The forecast said scattered pawns.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || turnsLeft(inst) <= 0) return;
        const half = Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) =>
          inHalf(api.opp, sq),
        );
        const hit = half[api.rng.int(half.length)];
        const p = api.board.pieces[hit];
        if (p && p.color === api.opp && p.type === "p") api.removePiece(hit);
        flashSquares(api, [hit]);
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} strikes left`,
    },
  ),
  // 79. Glass Bridge -----------------------------------------------------------
  card(
    {
      id: "ov_glass_bridge",
      name: "Glass Bridge",
      description:
        "Choose one of the four central ranks: it turns to glass for 4 of your turns. Any piece of either side that ends a move there has a 50% chance to fall through and be removed. Kings are exempt.",
      tier: 3,
      category: "attack",
      icon: "GlassWater",
      flavor: "Step lightly. Or heavily, once.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.rank != null
          ? null
          : {
              kind: "square",
              label: "Choose the rank that turns to glass",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => RANK(sq) >= 2 && RANK(sq) <= 5,
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.rank != null) return;
        inst.state.rank = RANK(sq);
        inst.state.turns = 4;
        flashSquares(
          api,
          Array.from({ length: 8 }, (_, f) => SQ(f, RANK(sq))),
        );
      },
      onMovePlayed: (inst, move, api) => {
        const rank = inst.state.rank as number | undefined;
        if (rank == null || turnsLeft(inst) <= 0) return;
        const p = api.board.pieces[move.to];
        if (RANK(move.to) === rank && p && p.type !== "k" && api.rng.next() < 0.5) {
          api.removePiece(move.to);
          flashSquares(api, [move.to]);
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.rank == null ? "pick a rank" : `${turnsLeft(inst)} of your turns of glass left`,
    },
  ),
  // 80. Royal Food Taster ------------------------------------------------------
  card(
    {
      id: "ov_royal_food_taster",
      name: "Royal Food Taster",
      description:
        "Place a Taster pawn on an empty square next to your queen. The next time your queen is captured, the Taster dies in her place and your queen returns on the Taster's square.",
      tier: 6,
      category: "protection",
      icon: "Utensils",
      flavor: "A slow-motion leap, then a posthumous medal.",
      requires: ["q"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (picks.length > 0 || inst.state.sq != null) return null;
        const queens = mySquares(api.board, api.me, "q");
        const spots = Array.from({ length: 64 }, (_, i) => i as Square).filter(
          (sq) =>
            !api.board.pieces[sq] && pawnRankOk(sq) && queens.some((q) => adjacent(q, sq)),
        );
        return { kind: "square", label: "Seat the Taster beside your queen", squares: spots };
      },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.place(sq, "p", api.me);
        pinCosmetic(api, sq, api.me, "hat", null, "Royal Food Taster");
        inst.state.sq = sq;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Queen captured: the Taster takes the fall, the queen shifts over.
        if (move.color === api.opp && move.captured === "q") {
          const p = api.board.pieces[sq];
          if (p && p.color === api.me && p.type === "p") {
            api.removePiece(sq, { uncounted: true });
            api.place(sq, "q", api.me);
            flashSquares(api, [sq], true);
          }
          inst.spent = true;
          return;
        }
        // Taster killed or promoted on its own: the vigil ends.
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          if (move.promotion) inst.spent = true;
          else inst.state.sq = move.to;
        }
      },
      status: (inst) => (inst.state.sq == null ? "seat the Taster" : "the Taster watches"),
    },
  ),
  // 81. Mole Tunnels -----------------------------------------------------------
  card(
    {
      id: "ov_mole_tunnels",
      name: "Mole Tunnels",
      description:
        "The tunnels do not open until after your opponent's next move. Then, for 5 of your turns, up to twice: one of your pawns may tunnel to the empty square directly behind an enemy pawn on its own file.",
      tier: 4,
      category: "movement",
      icon: "Shovel",
      flavor: "Hard hats on. Mind the traveling dirt mound.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
        inst.state.turns = 5;
        inst.state.armed = false;
      },
      augmentMoves: (moves, inst, api) => {
        if (!inst.state.armed) return;
        if (((inst.state.charges as number) ?? 0) <= 0 || turnsLeft(inst) <= 0) return;
        for (const sq of mySquares(api.board, api.me, "p")) {
          const enemies = mySquares(api.board, api.opp, "p").filter((e) => FILE(e) === FILE(sq));
          const tos = enemies
            .map((e) => e + fwdOf(api.me))
            .filter((to) => to >= 0 && to <= 63 && pawnRankOk(to) && !api.board.pieces[to]);
          for (const m of teleportMoves(api.board, sq, tos, inst.id)) moves.push(m);
        }
      },
      onMovePlayed: (inst, move, api) => {
        // Delay the first trigger: the tunnels stay shut, and the 5-turn window
        // does not start ticking, until the opponent has played one move.
        if (!inst.state.armed) {
          if (move.color === api.opp) inst.state.armed = true;
          return;
        }
        if (move.via === inst.id) {
          const c = ((inst.state.charges as number) ?? 1) - 1;
          inst.state.charges = c;
          if (c <= 0) {
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        !inst.state.armed
          ? "tunnels open after their next move"
          : `${(inst.state.charges as number) ?? 0} tunnels, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 82. Weather Balloon --------------------------------------------------------
  // ADAPTED: the roster's heatmap overlay is client UX; implemented as a real
  // read: after each enemy move (your turn start) every square any enemy piece
  // could reach with its next move (plain movement geometry: pawn pushes and
  // captures, leaps, slides) is flashed, for 3 of your turns.
  card(
    {
      id: "ov_weather_balloon",
      name: "Weather Balloon",
      description:
        "Three scans, one after each of your opponent's moves: every square the opponent could reach with their next move is highlighted. Each scan spends one of the three even if it lights up nothing.",
      tier: 4,
      category: "info",
      icon: "Radar",
      flavor: "It sees everything. It reports most of it.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        // Charge model: each opponent reply triggers one scan, and a scan that
        // finds nothing (a failed read) still spends its charge.
        if (move.color === api.opp && ((inst.state.charges as number) ?? 0) > 0) {
          const reach = new Set<Square>();
          for (const sq of mySquares(api.board, api.opp)) {
            const p = api.board.pieces[sq]!;
            if (p.type === "p") {
              const fwd = fwdOf(api.opp);
              const one = sq + fwd;
              if (one >= 0 && one <= 63 && !api.board.pieces[one]) {
                reach.add(one);
                const two = sq + fwd * 2;
                if (relRank(api.opp, sq) === 2 && two >= 0 && two <= 63 && !api.board.pieces[two]) {
                  reach.add(two);
                }
              }
              for (const df of [-1, 1]) {
                const f = FILE(sq) + df, r = RANK(sq) + (api.opp === "w" ? 1 : -1);
                if (!inBoard(f, r)) continue;
                const t = api.board.pieces[SQ(f, r)];
                if (t && t.color === api.me) reach.add(SQ(f, r));
              }
            } else if (p.type === "n") {
              for (const m of leapMoves(api.board, sq, KNIGHT_LEAPS, "geom")) reach.add(m.to);
            } else if (p.type === "k") {
              for (const m of slideMoves(api.board, sq, ALL_DIRS, "geom", 1)) reach.add(m.to);
            } else {
              const dirs = p.type === "b" ? DIAG_DIRS : p.type === "r" ? ORTHO_DIRS : ALL_DIRS;
              for (const m of slideMoves(api.board, sq, dirs, "geom")) reach.add(m.to);
            }
          }
          flashSquares(api, [...reach].sort((a, b) => a - b));
          const c = ((inst.state.charges as number) ?? 0) - 1;
          inst.state.charges = c;
          if (c <= 0) inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.charges as number) ?? 0} scans of radar left`,
    },
  ),
  // 83. Petting Zoo ------------------------------------------------------------
  // ADAPTED: the roster's per-turn random drift is dropped (a frozen piece's
  // marker cannot follow card-driven drift safely); the animals are placed,
  // frozen blockers that wander home after 8 of your turns.
  card(
    {
      id: "ov_petting_zoo",
      name: "Petting Zoo",
      description:
        "A Goat, a Duck, and a Sheep (a pawn each) appear on random empty squares in your half for 8 of your turns. They cannot move or capture, they just block, then they wander home.",
      tier: 3,
      category: "pieces",
      icon: "PawPrint",
      flavor: "The gate opens and professionalism leaves the board.",
    },
    instant((_inst, api) => {
      const spots = Array.from({ length: 64 }, (_, i) => i as Square).filter(
        (sq) => !api.board.pieces[sq] && inHalf(api.me, sq) && pawnRankOk(sq),
      );
      const names = ["Goat", "Duck", "Sheep"];
      for (const name of names) {
        if (spots.length === 0) break;
        const sq = spots.splice(api.rng.int(spots.length), 1)[0];
        api.place(sq, "p", api.me);
        pinCosmetic(api, sq, api.me, "plush", 8, name);
        addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 8, skin: "sleep" });
        addEffect(api, { kind: "timed_loss", owner: api.me, sq, turns: 8, then: "remove" });
      }
    }),
  ),
  // 84. Ivy Crown --------------------------------------------------------------
  card(
    {
      id: "ov_ivy_crown",
      name: "Ivy Crown",
      description:
        "Your king may lunge two squares in a straight line onto an empty square (the square between must also be empty). After each lunge the ivy rests for 3 of your turns.",
      tier: 4,
      category: "movement",
      icon: "Crown",
      flavor: "The ivy winds the crown, blooms, and points the way.",
      fx: { motif: "empower", pieces: ["k"], self: true },
    },
    {
      kind: "passive",
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.cd as number) ?? 0) > 0) return;
        for (const sq of mySquares(api.board, api.me, "k")) {
          for (const [df, dr] of ALL_DIRS) {
            const f1 = FILE(sq) + df, r1 = RANK(sq) + dr;
            const f2 = FILE(sq) + df * 2, r2 = RANK(sq) + dr * 2;
            if (!inBoard(f1, r1) || !inBoard(f2, r2)) continue;
            if (api.board.pieces[SQ(f1, r1)] || api.board.pieces[SQ(f2, r2)]) continue;
            for (const m of teleportMoves(api.board, sq, [SQ(f2, r2)], inst.id)) moves.push(m);
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        // Balance pass: the largest knob above one (the 4-turn rest, the biggest
        // of range 2 / cooldown 4) drops by one, to 3.
        if (move.via === inst.id && move.color === api.me) {
          inst.state.cd = 3;
        } else if (move.color === api.me && ((inst.state.cd as number) ?? 0) > 0) {
          inst.state.cd = ((inst.state.cd as number) ?? 0) - 1;
        }
      },
      status: (inst) =>
        ((inst.state.cd as number) ?? 0) > 0
          ? `ivy rests ${inst.state.cd as number} more of your turns`
          : "lunge ready",
    },
  ),
  // 85. Fireworks Barge --------------------------------------------------------
  card(
    {
      id: "ov_fireworks_barge",
      name: "Fireworks Barge",
      description:
        "Choose a 2x2 area: at the end of your opponent's next turn the rockets go off. Enemy pawns inside are destroyed; every other piece inside except kings is pushed one square outward if the square is free.",
      tier: 5,
      category: "attack",
      icon: "PartyPopper",
      flavor: "The barge slides in humming. Everyone should worry.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.anchor != null
          ? null
          : {
              kind: "square",
              label: "Choose the bottom-left square of the 2x2 target",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter(
                (sq) => FILE(sq) <= 6 && RANK(sq) <= 6,
              ),
            },
      effect: (inst, api, picks) => {
        const a = picks[0]?.square;
        if (a == null || inst.state.anchor != null) return;
        inst.state.anchor = a;
        flashSquares(api, [a, a + 1, a + 8, a + 9], true);
      },
      onMovePlayed: (inst, move, api) => {
        const a = inst.state.anchor as Square | undefined;
        if (a == null || move.color !== api.opp) return;
        const area = [a, a + 1, a + 8, a + 9];
        const cf = FILE(a) + 0.5, cr = RANK(a) + 0.5;
        for (const sq of area) {
          const p = api.board.pieces[sq];
          if (!p) continue;
          if (p.color === api.opp && p.type === "p") {
            api.removePiece(sq);
            continue;
          }
          if (p.type === "k") continue;
          const df = FILE(sq) < cf ? -1 : 1;
          const dr = RANK(sq) < cr ? -1 : 1;
          const f = FILE(sq) + df, r = RANK(sq) + dr;
          if (!inBoard(f, r)) continue;
          const to = SQ(f, r);
          if (!api.board.pieces[to] && (p.type !== "p" || pawnRankOk(to))) api.relocate(sq, to);
        }
        flashSquares(api, area);
        inst.spent = true;
      },
      status: (inst) => (inst.state.anchor == null ? "aim the barge" : "fuse lit, detonates on their move"),
    },
  ),
  // 86. Bodyswap Ball ----------------------------------------------------------
  card(
    {
      id: "ov_bodyswap_ball",
      name: "Bodyswap Ball",
      description:
        "The disco ball drops: two random pieces in your army swap squares, and two random pieces in your opponent's army swap squares. Kings sit the dance out.",
      tier: 3,
      category: "pieces",
      icon: "Disc3",
      flavor: "Everyone swears they were someone else when it happened.",
    },
    instant((_inst, api) => {
      for (const color of [api.me, api.opp]) {
        const own = mySquares(api.board, color).filter((sq) => api.board.pieces[sq]!.type !== "k");
        const pairs: [Square, Square][] = [];
        for (let i = 0; i < own.length; i++) {
          for (let j = i + 1; j < own.length; j++) {
            const a = own[i], b = own[j];
            const ta = api.board.pieces[a]!.type, tb = api.board.pieces[b]!.type;
            if (ta === tb) continue;
            if (ta === "p" && !pawnRankOk(b)) continue;
            if (tb === "p" && !pawnRankOk(a)) continue;
            pairs.push([a, b]);
          }
        }
        if (pairs.length === 0) continue;
        const [a, b] = pairs[api.rng.int(pairs.length)];
        const ta = api.board.pieces[a]!.type, tb = api.board.pieces[b]!.type;
        api.setPieceType(a, tb);
        api.setPieceType(b, ta);
        flashSquares(api, [a, b], true);
      }
    }),
  ),
  // 87. Templar Vows -----------------------------------------------------------
  card(
    {
      id: "ov_templar_vows",
      name: "Templar Vows",
      description:
        "Choose one of your bishops: for 6 of your turns it is a Templar and may also make knight leaps onto empty squares. These leaps cannot capture.",
      tier: 4,
      category: "movement",
      icon: "Cross",
      flavor: "The armor assembles plate by plate, mid-prayer.",
      requires: ["b"],
      fx: { motif: "empower", pieces: ["b"], moveAs: "n", self: true },
    },
    // Balance pass: the special move cannot capture. The Templar's knight leaps
    // are now quiet only (drop any that would capture); its bishop lines still
    // capture normally.
    bindPiece("Choose the bishop taking the vows", bindCandidates(["b"]), {
      turns: 6,
      gen: (board, sq, via) => leapMoves(board, sq, KNIGHT_LEAPS, via).filter((m) => !m.captured),
    }),
  ),
  // 88. Alt Account ------------------------------------------------------------
  card(
    {
      id: "ov_alt_account",
      name: "Alt Account",
      description:
        "Go incognito for 5 of your turns: your king wears sunglasses, and your first capture while disguised earns 15 seconds.",
      tier: 2,
      category: "tempo",
      icon: "Glasses",
      flavor: "Definitely a guest account. Definitely not you.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 5;
        const k = kingSquare(api.board, api.me);
        if (k != null) pinCosmetic(api, k, api.me, "sunglasses", 5);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.captured && turnsLeft(inst) > 0) {
          api.adjustClock({ addSelfSec: 15 });
          flashSquares(api, [move.to], true);
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of disguise left`,
    },
  ),
  // 89. Hall of Mirrors --------------------------------------------------------
  card(
    {
      id: "ov_hall_of_mirrors",
      name: "Hall of Mirrors",
      description:
        "For 3 of your turns, your rooks' horizontal moves wrap around the board edge, reappearing on the far file of the same rank. The wrap-around move cannot capture: it only lands on an empty square, and stops at the first piece it meets.",
      tier: 4,
      category: "movement",
      icon: "FlipHorizontal",
      flavor: "The a-file has heard wonderful things about the h-file.",
      requires: ["r"],
      fx: { motif: "empower", pieces: ["r"], self: true },
    },
    timedAugment(3, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of mySquares(api.board, api.me, "r")) {
        for (const dir of [1, -1]) {
          for (let i = 1; i < 8; i++) {
            const f = (FILE(sq) + dir * i + 8) % 8;
            const to = SQ(f, RANK(sq));
            if (to === sq) break;
            const t = api.board.pieces[to];
            if (!t) {
              out.push({ from: sq, to, piece: "r", color: api.me, via: inst.id });
            } else {
              // The special move cannot capture: stop at the first piece met,
              // whether friend or foe, and never land on it.
              break;
            }
          }
        }
      }
      return out;
    }),
  ),
  // 90. Loan Shark -------------------------------------------------------------
  // ADAPTED: the roster's "lose 90 seconds" collection is unsupported
  // (ClockRequest has no way to charge the caster or credit the opponent), so
  // the shark collects in board and draft currency instead: the opponent gains
  // a free reroll and your next draft is skipped.
  card(
    {
      id: "ov_loan_shark",
      name: "Loan Shark",
      description:
        "Gain 60 seconds now. In 8 of your turns the shark collects: unless you have captured 3 or more pieces by then, your next draft is skipped and your opponent pockets a free reroll.",
      tier: 2,
      category: "tempo",
      icon: "Banknote",
      flavor: "Great rates. Unbelievable rates. Rates you will not believe.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 8;
        inst.state.caps = 0;
        api.adjustClock({ addSelfSec: 60 });
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        if (move.captured) inst.state.caps = ((inst.state.caps as number) ?? 0) + 1;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        if (((inst.state.caps as number) ?? 0) < 3) {
          api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
          api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
        }
        inst.spent = true;
      },
      status: (inst) =>
        `collects in ${turnsLeft(inst)} of your turns (${(inst.state.caps as number) ?? 0}/3 captures)`,
    },
  ),
  // 91. Sponsored Segment ------------------------------------------------------
  // ADAPTED: the parody ad overlay with paused clocks is client UX the engine
  // cannot host; the card is implemented as its payout, the 20 seconds.
  card(
    {
      id: "ov_sponsored_segment",
      name: "Sponsored Segment",
      description: "Roll the sponsor banner: gain 20 seconds.",
      tier: 2,
      category: "tempo",
      icon: "Megaphone",
      flavor: "This blunder was brought to you by RAID: Shadow Pawns.",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 20 });
    }),
  ),
  // 92. Sleeping Draught -------------------------------------------------------
  card(
    {
      id: "ov_sleeping_draught",
      name: "Sleeping Draught",
      description:
        "Dose one enemy knight or bishop. After your opponent's next move it falls asleep for their following 3 turns. It wakes early if any piece adjacent to it is captured.",
      tier: 4,
      category: "tempo",
      icon: "FlaskConical",
      flavor: "Tastes like chamomile and lost tempo.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null || inst.state.pending != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy minor to dose",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      effect: (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null || inst.state.pending != null) return;
        // Delay the first trigger: park the dose. The sleep is applied on YOUR
        // move after the opponent replies (so its timer is not ticked on the
        // reply itself and the full 3 turns survive).
        inst.state.pending = sq;
      },
      onMovePlayed: (inst, move, api) => {
        const pending = inst.state.pending as Square | undefined;
        if (pending != null) {
          if (!inst.state.armed) {
            if (move.color === api.opp) inst.state.armed = true;
            return;
          }
          if (move.color !== api.me) return;
          const p = api.board.pieces[pending];
          if (p && p.color === api.opp && (p.type === "n" || p.type === "b")) {
            addEffect(api, { kind: "freeze", sq: pending, owner: api.opp, turns: 3, skin: "sleep" });
            inst.state.sq = pending;
            inst.state.watch = 3;
            flashSquares(api, [pending], true);
          } else {
            // The dosed minor slipped away on the reply: the draught is wasted.
            inst.spent = true;
          }
          inst.state.pending = undefined;
          inst.state.armed = undefined;
          return;
        }
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        const cap = move.capturedSquare ?? (move.captured ? move.to : null);
        if (cap != null && adjacent(cap, sq)) {
          for (const e of api.bs.effects) {
            if (e.kind === "freeze" && e.sq === sq && e.owner === api.opp && e.skin === "sleep") {
              e.turns = 0;
            }
          }
          flashSquares(api, [sq], true);
          inst.spent = true;
          return;
        }
        if (move.color === api.opp) {
          const w = ((inst.state.watch as number) ?? 0) - 1;
          inst.state.watch = w;
          if (w <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq != null
          ? `asleep for ${(inst.state.watch as number) ?? 0} of their turns`
          : inst.state.pending != null
            ? "sleep takes hold after their next move"
            : "pick a minor to dose",
    },
  ),
  // 93. Wallhack Goggles -------------------------------------------------------
  card(
    {
      id: "ov_wallhack_goggles",
      name: "Wallhack Goggles",
      description:
        "Three scans, one after each of your opponent's moves: every piece of yours standing on an enemy slider's line, even behind blockers, is highlighted. Each scan spends one of the three even if it finds nothing.",
      tier: 4,
      category: "info",
      icon: "ScanEye",
      flavor: "Green wireframes never lie. They just flicker.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 3;
      },
      onMovePlayed: (inst, move, api) => {
        // Charge model: each opponent reply triggers one scan, and a scan that
        // finds nothing (a failed read) still spends its charge.
        if (move.color === api.opp && ((inst.state.charges as number) ?? 0) > 0) {
          const marks = new Set<Square>();
          for (const sq of mySquares(api.board, api.opp)) {
            const p = api.board.pieces[sq]!;
            const dirs =
              p.type === "b" ? DIAG_DIRS : p.type === "r" ? ORTHO_DIRS : p.type === "q" ? ALL_DIRS : null;
            if (!dirs) continue;
            for (const [df, dr] of dirs) {
              let f = FILE(sq) + df, r = RANK(sq) + dr;
              while (inBoard(f, r)) {
                const t = api.board.pieces[SQ(f, r)];
                if (t && t.color === api.me) marks.add(SQ(f, r));
                f += df;
                r += dr;
              }
            }
          }
          flashSquares(api, [...marks].sort((a, b) => a - b));
          const c = ((inst.state.charges as number) ?? 0) - 1;
          inst.state.charges = c;
          if (c <= 0) inst.spent = true;
        }
      },
      status: (inst) => `${(inst.state.charges as number) ?? 0} scans of x-ray left`,
    },
  ),
  // 94. Prank Call -------------------------------------------------------------
  // ADAPTED: the fake-call overlay pausing the opponent's draft is client UX;
  // implemented as the distraction itself, a small time loss for the opponent.
  card(
    {
      id: "ov_prank_call",
      name: "Prank Call",
      description: "Ring ring: your opponent takes a very important call and loses 5 seconds.",
      tier: 2,
      category: "tempo",
      icon: "Phone",
      flavor: "Caller ID says: Your Rook.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 5 });
      const k = kingSquare(api.board, api.opp);
      if (k != null) flashSquares(api, [k], true);
    }),
  ),
  // 95. Growth Potion ----------------------------------------------------------
  card(
    {
      id: "ov_growth_potion",
      name: "Growth Potion",
      description:
        "Choose one of your knights: it is a Warhorse for 5 of your turns. Each time it captures a pawn, you immediately move again, but that bonus move cannot capture.",
      tier: 4,
      category: "movement",
      icon: "Beaker",
      flavor: "One gulp, one muscle pop, one very startled farrier.",
      requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], self: true },
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
              label: "Choose the knight that drinks",
              squares: mySquares(api.board, api.me, "n"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
        pinCosmetic(api, sq, api.me, "giant", 5, "Warhorse");
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
          if (move.color === api.me && move.captured === "p" && turnsLeft(inst) > 0) {
            api.bs.extraMoves[api.me] += 1;
            // The special move cannot capture: bar every square an enemy piece
            // now holds against me for that one bonus move. turns:2 so the wall
            // survives this capturing move's own tick and lapses right after the
            // bonus move (the same guard Momentum uses); if it would leave only
            // captures, the engine's no-move relax hands the turn back instead.
            const enemySquares = mySquares(api.board, api.opp);
            if (enemySquares.length) {
              addEffect(api, { kind: "barred", squares: enemySquares, against: api.me, turns: 2 });
            }
            flashSquares(api, [move.to], true);
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.sq == null
          ? "choose the knight"
          : `Warhorse for ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 96. Priest Hole ------------------------------------------------------------
  card(
    {
      id: "ov_priest_hole",
      name: "Priest Hole",
      description:
        "Once within 5 of your turns, while your king is in check: swap your king with one of your rooks standing on a square that is not currently attacked. Using this consumes your next unused reroll, if you have one.",
      tier: 4,
      category: "protection",
      icon: "DoorClosed",
      flavor: "The bookshelf spins. The king dusts himself off elsewhere.",
      requires: ["r"],
    },
    {
      kind: "activated",
      init: (inst) => {
        inst.state.turns = 5;
      },
      targets: (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const k = kingSquare(api.board, api.me);
        const inCheck = k != null && attackersOf(api.board, api.opp, k).length > 0;
        return {
          kind: "square",
          label: "Choose the rook hiding the king",
          squares: !inCheck
            ? []
            : mySquares(api.board, api.me, "r").filter(
                (sq) => attackersOf(api.board, api.opp, sq).length === 0,
              ),
        };
      },
      effect: (_inst, api, picks) => {
        const rookSq = picks[0]?.square;
        const k = kingSquare(api.board, api.me);
        if (rookSq == null || k == null) return;
        const r = api.board.pieces[rookSq];
        if (!r || r.color !== api.me || r.type !== "r") return;
        api.removePiece(rookSq, { uncounted: true });
        api.relocate(k, rookSq);
        api.place(k, "r", api.me);
        flashSquares(api, [k, rookSq], true);
        // Balance pass: the escape spends your next unused reroll, if any.
        if (api.mine.rerollsLeft > 0) api.mine.rerollsLeft -= 1;
      },
      onMovePlayed: (inst, move, api) => {
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `usable in check, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 97. Rube Goldberg ----------------------------------------------------------
  card(
    {
      id: "ov_rube_goldberg",
      name: "Rube Goldberg",
      description:
        "Advance one of your pawns one square. If it lands beside an enemy pawn, that pawn is pushed back one square; if the push is blocked, the enemy blocker is stunned for 1 turn; and if that blocker is a rook, you also gain 10 seconds.",
      tier: 2,
      category: "attack",
      icon: "Cog",
      flavor: "Domino, marble, see-saw, boot on a stick, checkmate eventually.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn that starts the machine",
              squares: advanceablePawns(api),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || !advancePawn(api, sq)) return;
        const to = sq + fwdOf(api.me);
        flashSquares(api, [to], true);
        const target = neighbors(to).find((n) => {
          const p = api.board.pieces[n];
          return !!p && p.color === api.opp && p.type === "p";
        });
        if (target == null) return;
        const pushTo = target + fwdOf(api.me);
        if (pushTo < 0 || pushTo > 63) return;
        if (!api.board.pieces[pushTo] && pawnRankOk(pushTo)) {
          api.relocate(target, pushTo);
          flashSquares(api, [pushTo], true);
          return;
        }
        const blocker = api.board.pieces[pushTo];
        if (!blocker) return;
        stunEnemy(api, pushTo, 1);
        if (blocker.color === api.opp && blocker.type === "r") {
          api.adjustClock({ addSelfSec: 10 });
        }
        flashSquares(api, [pushTo], true);
      },
    ),
  ),
  // 98. Rules Lawyer -----------------------------------------------------------
  card(
    {
      id: "ov_rules_lawyer",
      name: "Rules Lawyer",
      description:
        "Once within 6 of your turns, when your opponent gives check: the check stands, but they lose 10 seconds and you gain 10.",
      tier: 2,
      category: "tempo",
      icon: "Scale",
      flavor: "OBJECTION! Sustained, technically. Fined anyway.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const k = kingSquare(api.board, api.me);
          if (k != null && attackersOf(api.board, api.opp, k).length > 0) {
            api.adjustClock({ addSelfSec: 10, subOppSec: 10 });
            flashSquares(api, [move.to], true);
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `retainer runs ${turnsLeft(inst)} more of your turns`,
    },
  ),
  // 99. Booster Pack -----------------------------------------------------------
  // ADAPTED: "your current draft tier's pool" is a draft-engine concept the
  // card cannot read; the pack deals a random implemented tier-4 buff instead
  // (this card's own tier), seated exactly the way acquireBuff seats a card.
  card(
    {
      id: "ov_booster_pack",
      name: "Booster Pack",
      description: "Tear the foil: immediately receive one random tier-4 card, fair odds.",
      tier: 3,
      category: "draft",
      icon: "Package",
      flavor: "The rainbow light means nothing. It is always the rainbow light.",
    },
    instant((_inst, api) => {
      const pool = Object.values(buffRegistry.byId).filter(
        (b) =>
          b.implemented &&
          !b.special &&
          b.tier === 4 &&
          b.category !== "hex" &&
          b.category !== "nerf" &&
          b.id !== "ov_booster_pack",
      );
      if (pool.length === 0) return;
      const def = pool[api.rng.int(pool.length)];
      const inst2: BuffInstance = { id: def.id, tier: def.tier, state: {} };
      def.init?.(inst2, api);
      api.mine.buffs.push(inst2);
      if (def.kind === "instant") {
        def.effect?.(inst2, api, []);
        inst2.spent = true;
      }
    }),
  ),
  // 100. Identity Crisis -------------------------------------------------------
  card(
    {
      id: "ov_identity_crisis",
      name: "Identity Crisis",
      description:
        "One random minor piece of yours and one random enemy minor swap sides. After 4 of your turns, each one still on the board swaps back.",
      tier: 3,
      category: "pieces",
      icon: "Shuffle",
      flavor: "Two question marks appear, and a repainting happens mid-air.",
      requires: ["n", "b"],
      fx: { motif: "empower", pieces: ["n", "b"], self: true },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        const minorsOf = (c: typeof api.me) =>
          mySquares(api.board, c).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return t === "n" || t === "b";
          });
        const mine = minorsOf(api.me);
        const theirs = minorsOf(api.opp);
        if (mine.length === 0 || theirs.length === 0) {
          inst.spent = true;
          return;
        }
        const a = mine[api.rng.int(mine.length)];
        const b = theirs[api.rng.int(theirs.length)];
        api.setPieceColor(a, api.opp);
        api.setPieceColor(b, api.me);
        flashSquares(api, [a, b], true);
        inst.state.gaveSq = a;
        inst.state.gotSq = b;
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        for (const key of ["gaveSq", "gotSq"] as const) {
          const sq = inst.state[key] as Square | null | undefined;
          if (sq == null) continue;
          if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) {
            inst.state[key] = null;
          } else if (move.from === sq) {
            inst.state[key] = move.to;
          }
        }
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        const gave = inst.state.gaveSq as Square | null;
        const got = inst.state.gotSq as Square | null;
        if (gave != null && api.board.pieces[gave]?.color === api.opp) {
          api.setPieceColor(gave, api.me);
          flashSquares(api, [gave], true);
        }
        if (got != null && api.board.pieces[got]?.color === api.me) {
          api.setPieceColor(got, api.opp);
          flashSquares(api, [got], true);
        }
        inst.spent = true;
      },
      status: (inst) => `identities settle in ${turnsLeft(inst)} of your turns`,
    },
  ),
];

export { minorQuietDests };
