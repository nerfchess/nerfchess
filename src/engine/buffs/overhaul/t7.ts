// Overhaul roster, Tier 7 (cards 151-175 of docs/overhaul-roster.md): board
// rewrites, timeline crimes and celestial paperwork. Every mechanic resolves
// through existing engine primitives; every random draw uses api.rng inside
// init / effect / onMovePlayed only (deterministic, replay-safe).

import {
  ALL_DIRS,
  Buff,
  FILE,
  Move,
  PieceType,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  attackersOf,
  card,
  emptySquares,
  flashSquares,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  kingSquare,
  lastMoveBy,
  markRevived,
  mySquares,
  pawnRankOk,
  pinCosmetic,
  relRank,
  slideMoves,
  tickTurns,
  timedAugment,
  turnsLeft,
} from "./shared";

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };

/** The four squares of the 2x2 area anchored (bottom-left) at `a`. */
function plot(a: Square): Square[] {
  return [a, a + 1, a + 8, a + 9];
}

export const OVERHAUL_T7: Buff[] = [
  // 151. Mod Powers -------------------------------------------------------------
  // ADAPTED: activated cards fire once, so instead of one mute per turn for 3
  // turns, the gavel drops once: mute up to 3 enemy non-king pieces for your
  // opponent's next turn.
  card(
    {
      id: "ov_mod_powers",
      name: "Mod Powers",
      description:
        "Mute up to 3 enemy pieces (king excluded): they cannot move on your opponent's next turn.",
      tier: 7,
      category: "tempo",
      icon: "Gavel",
      flavor: "Reason: no reason. Duration: one turn. Appeals: denied.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 3) return null;
        const squares = mySquares(api.board, api.opp).filter(
          (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
        );
        if (squares.length === 0) return picks.length === 0 ? { kind: "square", label: "No one to mute", squares: [] } : null;
        return {
          kind: "square",
          label: `Choose a piece to mute (${picks.length + 1}/3)`,
          squares,
          ...(picks.length > 0 ? { finishable: true } : {}),
        };
      },
      (_inst, api, picks) => {
        for (const k of picks) {
          const p = k.square != null ? api.board.pieces[k.square] : null;
          if (k.square != null && p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: k.square, owner: api.opp, turns: 1, skin: "gum" });
          }
        }
      },
      { freeAction: true },
    ),
  ),
  // 152. The Great Flood ------------------------------------------------------------
  card(
    {
      id: "ov_great_flood",
      name: "The Great Flood",
      description:
        "A wave washes every piece on the central four ranks (kings excluded) one square toward its own back rank, where that square is empty. Blocked pieces stay.",
      tier: 6,
      category: "movement",
      icon: "Droplets",
      flavor: "Nobody built an ark. Everybody built excuses.",
    },
    instant((_inst, api) => {
      const caught: Square[] = [];
      // Deterministic order per the roster pass: whites in descending square
      // order, then blacks ascending; blocked pieces simply stay.
      for (let sq = 63 as Square; sq >= 0; sq--) {
        const p = api.board.pieces[sq];
        if (p && p.color === "w" && p.type !== "k" && RANK(sq) >= 2 && RANK(sq) <= 5) {
          const to = sq - 8;
          if (!api.board.pieces[to]) {
            api.relocate(sq, to);
            caught.push(to);
          }
        }
      }
      for (let sq = 0 as Square; sq < 64; sq++) {
        const p = api.board.pieces[sq];
        if (p && p.color === "b" && p.type !== "k" && RANK(sq) >= 2 && RANK(sq) <= 5) {
          const to = sq + 8;
          if (!api.board.pieces[to]) {
            api.relocate(sq, to);
            caught.push(to);
          }
        }
      }
      flashSquares(api, caught, true);
    }),
  ),
  // 153. Write the Patch Notes ---------------------------------------------------------
  // BALANCE: the reroll ("rolling") is traded for a guaranteed reinforcement.
  // You take a pawn on your second rank instead of a reroll; the tier-up draft
  // (bankBonus, the card's jackpot) is kept as the ceiling. Odds are exact:
  // the tier lift is guaranteed, so the description states it plainly.
  card(
    {
      id: "ov_patch_notes",
      name: "Write the Patch Notes",
      description:
        "Spend your turn: plant a new pawn on an empty square of your second rank, and your next draft is dealt exactly one tier higher.",
      tier: 7,
      category: "draft",
      icon: "PenLine",
      flavor: "Removed: everything you dislike. Buffed: you, specifically.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Plant a pawn on your second rank",
              squares: emptySquares(api.board, (sq) => relRank(api.me, sq) === 2),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq] || relRank(api.me, sq) !== 2) return;
        api.place(sq, "p", api.me);
        api.mine.flags.bankBonus = 1;
        flashSquares(api, [sq], true);
      },
    ),
  ),
  // 154. Puppet Coronation ----------------------------------------------------------------
  card(
    {
      id: "ov_puppet_coronation",
      name: "Puppet Coronation",
      description:
        "Choose the enemy queen and an empty square she could legally reach. After your opponent's next move, the strings pull and she is marched there, if she still stands where you chose and the square is still empty. No captures.",
      tier: 7,
      category: "movement",
      icon: "Drama",
      flavor: "All hail the queen, who walks exactly where she is told.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.armed || picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose the enemy queen",
            squares: mySquares(api.board, api.opp, "q").filter(
              (sq) => slideMoves(api.board, sq, ALL_DIRS, "geo").some((m) => !m.captured),
            ),
          };
        }
        return {
          kind: "square",
          label: "Choose where she is marched",
          squares: slideMoves(api.board, picks[0].square!, ALL_DIRS, "geo")
            .filter((m) => !m.captured)
            .map((m) => m.to),
        };
      },
      effect: (inst, api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || inst.state.armed) return;
        const p = api.board.pieces[from];
        if (!p || p.color !== api.opp || p.type !== "q" || api.board.pieces[to]) return;
        inst.state.from = from;
        inst.state.to = to;
        inst.state.armed = true;
      },
      // Delayed: the strings pull only after the opponent's next move, and only
      // if the queen still stands where she was chosen and the square is free.
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed || inst.spent) return;
        if (move.color !== api.opp) return;
        const from = inst.state.from as Square, to = inst.state.to as Square;
        const p = api.board.pieces[from];
        if (p && p.color === api.opp && p.type === "q" && !api.board.pieces[to]) {
          api.relocate(from, to);
          flashSquares(api, [to], true);
        }
        inst.spent = true;
      },
      status: (inst) =>
        !inst.state.armed
          ? "activate to seize the enemy queen"
          : inst.spent
            ? "the strings have pulled"
            : "the strings pull after your opponent's next move",
    },
  ),
  // 155. Time Heist ---------------------------------------------------------------------------
  // ADAPTED: the roster's opponent-chosen revenge skip cannot be opponent
  // triggered; the cleanest honest version: they skip their next turn now,
  // and 6 of your turns later the timeline pays them back one extra move.
  card(
    {
      id: "ov_time_heist",
      name: "Time Heist",
      description:
        "Your opponent skips their next turn. 6 of your turns later the timeline collects: they take one extra move.",
      tier: 8,
      category: "tempo",
      icon: "Hourglass",
      flavor: "Every stolen minute charges interest.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        api.bs.skips[api.opp] += 1;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.bs.extraMoves[api.opp] += 1;
          inst.spent = true;
        }
      },
      status: (inst) => `the timeline collects in ${turnsLeft(inst)} of your turns`,
    },
  ),
  // 156. Colossal Visitor -----------------------------------------------------------------------
  card(
    {
      id: "ov_colossal_visitor",
      name: "Colossal Visitor",
      description:
        "A colossal lizard crosses a chosen file: every pawn on it is trampled, every other piece (kings excluded) is shoved one file aside where empty, and two random empty squares of the file smolder: your opponent cannot enter them for their next 2 turns.",
      tier: 6,
      category: "attack",
      icon: "Turtle",
      flavor: "It is not angry. It is just very, very wide.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the file it crosses",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
                for (let r = 0; r < 8; r++) {
                  const p = api.board.pieces[SQ(FILE(sq), r)];
                  if (p && p.type !== "k") return true;
                }
                return false;
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const f = FILE(picks[0].square);
        for (let r = 0; r < 8; r++) {
          const sq = SQ(f, r);
          const p = api.board.pieces[sq];
          if (!p || p.type === "k") continue;
          if (p.type === "p") {
            api.removePiece(sq);
            continue;
          }
          // Shove aside: left first, then right (deterministic).
          const left = f > 0 ? SQ(f - 1, r) : null;
          const right = f < 7 ? SQ(f + 1, r) : null;
          if (left != null && !api.board.pieces[left]) api.relocate(sq, left);
          else if (right != null && !api.board.pieces[right]) api.relocate(sq, right);
        }
        const empties = emptySquares(api.board, (s) => FILE(s) === f);
        const prints: Square[] = [];
        for (let i = 0; i < 2 && empties.length > 0; i++) {
          prints.push(empties.splice(api.rng.int(empties.length), 1)[0]);
        }
        if (prints.length) {
          addEffect(api, { kind: "barred", squares: prints, against: api.opp, turns: 2 });
          flashSquares(api, prints, true);
        }
      },
    ),
  ),
  // 157. Prophecy Engine ---------------------------------------------------------------------------
  // ADAPTED: there is no piece-type picker UI, so the prophecy is named by
  // pointing at one enemy piece; its type is the one foretold.
  card(
    {
      id: "ov_prophecy_engine",
      name: "Prophecy Engine",
      description:
        "Point at an enemy piece: for your opponent's next 6 turns, every move they make with that piece type gains you 6 seconds. If they never move one, the engine pays 40 seconds when the prophecy closes.",
      tier: 5,
      category: "info",
      icon: "Orbit",
      flavor: "The gears do not predict the future. They invoice it.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.t != null
          ? null
          : {
              kind: "square",
              label: "Point the orrery at an enemy piece",
              squares: mySquares(api.board, api.opp),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.t != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return;
        inst.state.t = p.type;
        inst.state.turns = 6;
        inst.state.hits = 0;
        flashSquares(api, [sq]);
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.t == null) return;
        if (move.color === api.opp && move.piece === inst.state.t && turnsLeft(inst) > 0) {
          api.adjustClock({ addSelfSec: 6 });
          inst.state.hits = ((inst.state.hits as number) ?? 0) + 1;
        }
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) {
            if (((inst.state.hits as number) ?? 0) === 0) api.adjustClock({ addSelfSec: 40 });
            inst.spent = true;
          }
        }
      },
      status: (inst) =>
        inst.state.t == null
          ? "activate to name the prophecy"
          : `watching their ${inst.state.t}, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  // 158. Speedhack -----------------------------------------------------------------------------------
  // ADAPTED: no per-move think-time hook exists, so instead of free moves
  // under 10 seconds, each of your next 5 moves refunds 6 seconds.
  card(
    {
      id: "ov_speedhack",
      name: "Speedhack",
      description: "Each of your next 5 moves puts 6 seconds back on your clock.",
      tier: 5,
      category: "tempo",
      icon: "Gauge",
      flavor: "The anticheat looked at your rating and shrugged.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        api.adjustClock({ addSelfSec: 6 });
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} refunded moves left`,
    },
  ),
  // 159. Split the Timeline ------------------------------------------------------------------------------
  // ADAPTED: simultaneous secret submission is impossible in this engine; the
  // split resolves as both players immediately gaining one extra move, you
  // first.
  card(
    {
      id: "ov_split_timeline",
      name: "Split the Timeline",
      description:
        "The timeline splits and both of you act at once: you and your opponent each gain one extra move, you first.",
      tier: 8,
      category: "tempo",
      icon: "GitBranch",
      flavor: "Somewhere, a version of you already blundered this.",
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 1;
        api.bs.extraMoves[api.opp] += 1;
      }),
      freeAction: true,
    },
  ),
  // 160. Olympus Voicemail --------------------------------------------------------------------------------
  card(
    {
      id: "ov_olympus_voicemail",
      name: "Olympus Voicemail",
      description:
        "For your next 2 turns, after each of your moves a bolt stuns the enemy piece that moved most recently (kings excluded) for 1 turn.",
      tier: 7,
      category: "attack",
      icon: "CloudLightning",
      flavor: "You have reached Zeus. Leave a target after the thunder.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && turnsLeft(inst) > 0) {
          const last = lastMoveBy(api.board, api.opp);
          if (last) {
            const p = api.board.pieces[last.to];
            if (p && p.color === api.opp && p.type !== "k") {
              addEffect(api, { kind: "freeze", sq: last.to, owner: api.opp, turns: 1, skin: "shock" });
              flashSquares(api, [last.to]);
            }
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} bolts left`,
    },
  ),
  // 161. Patient Grift ----------------------------------------------------------------------------------------
  card(
    {
      id: "ov_patient_grift",
      name: "Patient Grift",
      description:
        "Fold twice to win the pot: your next 2 drafts are skipped, and the draft after them is dealt from tier 8.",
      tier: 7,
      category: "draft",
      icon: "Handshake",
      flavor: "The long con is mostly waiting politely.",
    },
    instant((_inst, api) => {
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 2;
      api.mine.flags.forceTier = 8;
    }),
  ),
  // 162. Grail Quest -------------------------------------------------------------------------------------------
  // ADAPTED: freeze/stun immunity has no engine hook; the returning Grail
  // Knight keeps the knight+king movement but not the immunity.
  card(
    {
      id: "ov_grail_quest",
      name: "Grail Quest",
      description:
        "Send one of your knights away on quest. After 5 of your turns it returns to a random empty square in your half as a Grail Knight, permanently able to also step one square in any direction.",
      tier: 6,
      category: "pieces",
      icon: "Trophy",
      flavor: "He left with a horse and returned with a cup and opinions.",
      requires: ["n"],
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      freeAction: true,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.away != null || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the knight who rides out",
              squares: mySquares(api.board, api.me, "n"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.away != null || inst.state.sq != null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "n") return;
        api.removePiece(sq, { uncounted: true });
        inst.state.away = 5;
      },
      onMovePlayed: (inst, move, api) => {
        const away = inst.state.away as number | undefined;
        if (away != null) {
          if (move.color !== api.me) return;
          const left = away - 1;
          inst.state.away = left;
          if (left > 0) return;
          const spots = emptySquares(api.board, (s) => inHalf(api.me, s));
          if (spots.length === 0) {
            inst.state.away = 1; // No clearing to ride into; circle one more turn.
            return;
          }
          const sq = spots[api.rng.int(spots.length)];
          api.place(sq, "n", api.me);
          pinCosmetic(api, sq, api.me, "gilded", null, "Grail Knight");
          inst.state.sq = sq;
          inst.state.away = undefined;
          flashSquares(api, [sq]);
          return;
        }
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if ((move.capturedSquare === sq || move.to === sq) && move.from !== sq) inst.spent = true;
        else if (move.from === sq) inst.state.sq = move.to;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me) return;
        for (const m of slideMoves(api.board, sq, ALL_DIRS, inst.id, 1)) {
          if (!moves.some((x) => x.from === m.from && x.to === m.to)) moves.push(m);
        }
      },
      status: (inst) => {
        if (inst.state.away != null) return `returns in ${inst.state.away} of your turns`;
        if (inst.state.sq != null) return "the Grail Knight rides";
        return "activate to begin the quest";
      },
    },
  ),
  // 163. World Serpent ---------------------------------------------------------------------------------------------
  // ADAPTED: opponent moves cannot be augmented, so only YOUR rooks and queen
  // ride the serpent-road: for 4 of your turns their horizontal moves wrap
  // around the board edge (the a-file joins the h-file).
  card(
    {
      id: "ov_world_serpent",
      name: "World Serpent",
      description:
        "For 4 of your turns the serpent bites its tail: your rooks' and queen's horizontal moves wrap around the board edge.",
      tier: 8,
      category: "movement",
      icon: "Infinity",
      flavor: "The board was never flat. You just moved like it was.",
      requires: ["r", "q"],
      fx: { motif: "empower", pieces: ["r", "q"], self: true },
    },
    timedAugment(4, (_moves, inst, api) => {
      const out: Move[] = [];
      for (const sq of [...mySquares(api.board, api.me, "r"), ...mySquares(api.board, api.me, "q")]) {
        const p = api.board.pieces[sq]!;
        const f0 = FILE(sq), r0 = RANK(sq);
        for (const dir of [-1, 1]) {
          let crossed = false;
          for (let i = 1; i < 8; i++) {
            const raw = f0 + dir * i;
            if (raw < 0 || raw > 7) crossed = true;
            const f = ((raw % 8) + 8) % 8;
            if (f === f0) break;
            const to = SQ(f, r0);
            const t = api.board.pieces[to];
            if (!t) {
              if (crossed) out.push({ from: sq, to, piece: p.type, color: api.me, via: inst.id });
            } else {
              if (t.color !== api.me && crossed) {
                out.push({
                  from: sq, to, piece: p.type, color: api.me,
                  captured: t.type, capturedSquare: to, via: inst.id,
                });
              }
              break;
            }
          }
        }
      }
      return out;
    }),
  ),
  // 164. Insider Trading --------------------------------------------------------------------------------------------
  // ADAPTED: there is no pick-prediction UI, so the tip is simpler: see both
  // cards of your opponent's next draft and pocket a flat 10 seconds.
  card(
    {
      id: "ov_insider_trading",
      name: "Insider Trading",
      description:
        "See the cards of your opponent's next draft, and pocket 10 seconds for the tip.",
      tier: 5,
      category: "info",
      icon: "TrendingUp",
      flavor: "Allegedly. The briefcase was allegedly open.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.adjustClock({ addSelfSec: 10 });
    }),
  ),
  // 165. Coliseum -----------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_coliseum",
      name: "Coliseum",
      description:
        "Choose one of your pieces and an enemy piece of equal or greater value (kings excluded): both are removed, and you gain 10 seconds per point of value difference.",
      tier: 5,
      category: "attack",
      icon: "Swords",
      flavor: "The sand does not care who was favored.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          const bestEnemy = Math.max(
            0,
            ...mySquares(api.board, api.opp)
              .filter((sq) => api.board.pieces[sq]!.type !== "k")
              .map((sq) => VALUE[api.board.pieces[sq]!.type]),
          );
          return {
            kind: "square",
            label: "Choose your gladiator",
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && VALUE[t] <= bestEnemy;
            }),
          };
        }
        const mine = VALUE[api.board.pieces[picks[0].square!]!.type];
        return {
          kind: "square",
          label: "Choose their champion (equal or greater value)",
          squares: mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return t !== "k" && VALUE[t] >= mine;
          }),
        };
      },
      (_inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null) return;
        const pa = api.board.pieces[a], pb = api.board.pieces[b];
        if (!pa || pa.color !== api.me || pa.type === "k") return;
        if (!pb || pb.color !== api.opp || pb.type === "k" || VALUE[pb.type] < VALUE[pa.type]) return;
        api.removePiece(a);
        api.removePiece(b);
        api.adjustClock({ addSelfSec: (VALUE[pb.type] - VALUE[pa.type]) * 10 });
        flashSquares(api, [a, b]);
      },
    ),
  ),
  // 166. The Big Nap ---------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_big_nap",
      name: "The Big Nap",
      description:
        "Night falls: every knight, bishop, rook and queen on the board (both sides) sleeps and cannot move for 1 turn of its owner. Kings and pawns keep watch.",
      tier: 7,
      category: "tempo",
      icon: "MoonStar",
      flavor: "History's greatest armies, defeated by a warm blanket.",
    },
    instant((_inst, api) => {
      for (let sq = 0 as Square; sq < 64; sq++) {
        const p = api.board.pieces[sq];
        if (!p || p.type === "k" || p.type === "p") continue;
        addEffect(api, { kind: "freeze", sq, owner: p.color, turns: 1, skin: "sleep" });
      }
    }),
  ),
  // 167. Promotion Jubilee ------------------------------------------------------------------------------------------------
  // BALANCE: only the FIRST pawn to reach the seventh rank promotes early, and
  // only to a rook, bishop, or knight (three explicit moves per square, never a
  // queen). Playing any of these promotions sets `used` and ends the jubilee.
  card(
    {
      id: "ov_promotion_jubilee",
      name: "Promotion Jubilee",
      description:
        "For 5 of your turns, the first of your pawns to step or capture onto the seventh rank may promote there, but only to a rook, bishop, or knight. That one early promotion ends the jubilee.",
      tier: 7,
      category: "pieces",
      icon: "PartyPopper",
      flavor: "One rank early, and nobody checked the bunting budget.",
      requires: ["p"],
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
      },
      augmentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || inst.state.used) return;
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "p")) {
          if (relRank(api.me, sq) !== 6) continue;
          const fwd = sq + fwdOf(api.me);
          if (!api.board.pieces[fwd]) {
            for (const promo of ["r", "b", "n"] as PieceType[]) {
              out.push({ from: sq, to: fwd, piece: "p", color: api.me, promotion: promo, via: inst.id });
            }
          }
          for (const df of [-1, 1]) {
            const f = FILE(sq) + df, r = RANK(fwd);
            if (!inBoard(f, r)) continue;
            const cs = SQ(f, r);
            const t = api.board.pieces[cs];
            if (t && t.color === api.opp) {
              for (const promo of ["r", "b", "n"] as PieceType[]) {
                out.push({
                  from: sq, to: cs, piece: "p", color: api.me,
                  captured: t.type, capturedSquare: cs, promotion: promo, via: inst.id,
                });
              }
            }
          }
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move, api) => {
        if (move.via === inst.id && move.promotion) inst.state.used = true;
        tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        inst.state.used
          ? "the jubilee's early promotion is spent"
          : `${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 168. Fourth Wall Repair Crew -------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_fourth_wall_crew",
      name: "Fourth Wall Repair Crew",
      description:
        "For your next 3 turns, every enemy piece you capture is carried off-screen by the crew, gaining you 4 seconds each.",
      tier: 5,
      category: "tempo",
      icon: "HardHat",
      flavor: "Mind the cone. The scene is structural.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && turnsLeft(inst) > 0 && move.captured && move.captured !== "k") {
          api.adjustClock({ addSelfSec: 4 });
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns on the clock`,
    },
  ),
  // 169. Deja Vu ------------------------------------------------------------------------------------------------------------
  // ADAPTED: replaying the exact last move pair is unsafe to force; instead
  // you act again immediately (one extra move) while the enemy piece that
  // moved last is stuck repeating itself for 1 turn.
  card(
    {
      id: "ov_deja_vu",
      name: "Deja Vu",
      description:
        "You take one extra move right away, and the enemy piece that moved last (king excluded) is stuck in the loop and cannot move on your opponent's next turn.",
      tier: 8,
      category: "tempo",
      icon: "RotateCcw",
      flavor: "Haven't we... no. Surely not. Haven't we...",
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 1;
        const last = lastMoveBy(api.board, api.opp);
        if (last) {
          const p = api.board.pieces[last.to];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: last.to, owner: api.opp, turns: 1, skin: "charm" });
          }
        }
      }),
      freeAction: true,
    },
  ),
  // 170. Heavenly Bureaucracy ----------------------------------------------------------------------------------------------------
  // ADAPTED: checkmate cannot be intercepted, so the clerks misfile the first
  // CHECK instead: once within 8 of your turns, when an enemy move leaves your
  // king attacked, your king is relocated to a random safe empty square (no
  // relocation if no safe square exists).
  card(
    {
      id: "ov_heavenly_bureaucracy",
      name: "Heavenly Bureaucracy",
      description:
        "Once within your next 8 turns: when an enemy move puts your king in check, the check is misfiled and your king is relocated to a random empty square that is not attacked. If no safe square exists, the filing stands.",
      tier: 6,
      category: "protection",
      icon: "Stamp",
      flavor: "Form 7-K (Regicide, Attempted) is missing a signature.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 8;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const k = kingSquare(api.board, api.me);
          if (k != null && attackersOf(api.board, api.opp, k).length > 0) {
            const safe = emptySquares(api.board).filter(
              (sq) => attackersOf(api.board, api.opp, sq).length === 0,
            );
            if (safe.length > 0) {
              const to = safe[api.rng.int(safe.length)];
              api.relocate(k, to);
              flashSquares(api, [to]);
              inst.spent = true;
              return;
            }
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns of coverage left`,
    },
  ),
  // 171. Menagerie Stampede ---------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_menagerie_stampede",
      name: "Menagerie Stampede",
      description:
        "The herd thunders up two adjacent files: every pawn on them (both sides) is shoved to the neighboring file away from the stampede, or trampled if that square is blocked or off the board. Every other piece on them (kings excluded) is stunned for 1 turn.",
      tier: 8,
      category: "attack",
      icon: "PawPrint",
      flavor: "Rhinos first, ostriches second, one deeply confused cow.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the left file of the stampede",
              squares: Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
                if (FILE(sq) >= 7) return false;
                for (let r = 0; r < 8; r++) {
                  for (const f of [FILE(sq), FILE(sq) + 1]) {
                    const p = api.board.pieces[SQ(f, r)];
                    if (p && p.type !== "k") return true;
                  }
                }
                return false;
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        const fl = FILE(picks[0].square);
        const hit: Square[] = [];
        for (let sq = 0 as Square; sq < 64; sq++) {
          const f = FILE(sq);
          if (f !== fl && f !== fl + 1) continue;
          const p = api.board.pieces[sq];
          if (!p || p.type === "k") continue;
          if (p.type === "p") {
            const outF = f === fl ? f - 1 : f + 1;
            const dest = inBoard(outF, RANK(sq)) ? SQ(outF, RANK(sq)) : null;
            if (dest != null && !api.board.pieces[dest]) api.relocate(sq, dest);
            else api.removePiece(sq);
            hit.push(sq);
          } else {
            addEffect(api, { kind: "freeze", sq, owner: p.color, turns: 1, skin: "stun" });
          }
        }
        flashSquares(api, hit, true);
      },
    ),
  ),
  // 172. Chess Boxing ----------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_chess_boxing",
      name: "Chess Boxing",
      description:
        "The kings put the gloves on: a 50/50 bout. The winner's player immediately gains one extra move.",
      tier: 7,
      category: "tempo",
      icon: "Hand",
      flavor: "Round two is still chess. Technically.",
    },
    {
      ...activatedSimple((inst, api) => {
        const iWin = api.rng.next() < 0.5;
        api.bs.extraMoves[iWin ? api.me : api.opp] += 1;
        inst.state.result = iWin ? "you won the bout" : "your opponent won the bout";
        const kings = [kingSquare(api.board, api.me), kingSquare(api.board, api.opp)]
          .filter((s): s is Square => s != null);
        flashSquares(api, kings, true);
      }),
      freeAction: true,
    },
  ),
  // 173. Living Board -----------------------------------------------------------------------------------------------------------------
  // ADAPTED: areas containing kings cannot be chosen (no post-swap check-legality
  // solver), and plots keep to ranks 2-7 so no pawn is ever swapped onto a
  // promotion or home-edge rank.
  card(
    {
      id: "ov_living_board",
      name: "Living Board",
      description:
        "Two 2x2 areas (neither containing a king, away from the back ranks) trade their entire contents, square for square. Then one of your pieces that moved may take a free king-step to an empty adjacent square, without capturing.",
      tier: 7,
      category: "movement",
      icon: "Grid3x3",
      flavor: "The tiles lift, cross mid-air, and pretend nothing happened.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length < 2) {
          const anchors = Array.from({ length: 64 }, (_, i) => i as Square).filter((sq) => {
            if (FILE(sq) > 6 || RANK(sq) < 1 || RANK(sq) > 5) return false;
            if (plot(sq).some((s) => api.board.pieces[s]?.type === "k")) return false;
            if (picks.length === 1) {
              const first = plot(picks[0].square!);
              if (plot(sq).some((s) => first.includes(s))) return false;
            }
            return true;
          });
          return {
            kind: "square",
            label:
              picks.length === 0
                ? "Choose the first plot's bottom-left corner"
                : "Choose the second plot's bottom-left corner",
            squares: anchors,
          };
        }
        // After both plots are chosen, one of your moved pieces may take a free
        // king-step. Positions are read post-swap (deterministic from the two
        // plots), so the option is offered before the board actually trades.
        const A = plot(picks[0].square!), B = plot(picks[1].square!);
        const postAt = (s: Square) => {
          const ai = A.indexOf(s);
          if (ai >= 0) return api.board.pieces[B[ai]];
          const bi = B.indexOf(s);
          if (bi >= 0) return api.board.pieces[A[bi]];
          return api.board.pieces[s];
        };
        const kingNeighbors = (s: Square) => {
          const out: Square[] = [];
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(s) + df, r = RANK(s) + dr;
              if (inBoard(f, r)) out.push(SQ(f, r));
            }
          }
          return out;
        };
        if (picks.length === 2) {
          const movers = [...A, ...B].filter((s) => {
            const p = postAt(s);
            return p && p.color === api.me && kingNeighbors(s).some((n) => !postAt(n));
          });
          return {
            kind: "square",
            label: "Optional: choose a moved piece to king-step",
            squares: movers,
            finishable: true,
          };
        }
        const s = picks[2].square!;
        return {
          kind: "square",
          label: "Choose the free king-step (empty adjacent square)",
          squares: kingNeighbors(s).filter((n) => !postAt(n)),
        };
      },
      (_inst, api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null) return;
        const A = plot(a), B = plot(b);
        if ([...A, ...B].some((s) => api.board.pieces[s]?.type === "k")) return;
        if (A.some((s) => B.includes(s))) return;
        const pa = A.map((s) => api.board.pieces[s]);
        const pb = B.map((s) => api.board.pieces[s]);
        for (const s of [...A, ...B]) {
          if (api.board.pieces[s]) api.removePiece(s, { uncounted: true });
        }
        for (let i = 0; i < 4; i++) {
          if (pb[i]) api.place(A[i], pb[i]!.type, pb[i]!.color);
          if (pa[i]) api.place(B[i], pa[i]!.type, pa[i]!.color);
        }
        flashSquares(api, [...A, ...B]);
        // The free king-step for one moved piece (post-swap board == the plan).
        const from = picks[2]?.square, to = picks[3]?.square;
        if (from != null && to != null) {
          const p = api.board.pieces[from];
          const adj =
            from !== to &&
            Math.abs(FILE(from) - FILE(to)) <= 1 &&
            Math.abs(RANK(from) - RANK(to)) <= 1;
          if (p && p.color === api.me && adj && !api.board.pieces[to]) {
            api.relocate(from, to);
            flashSquares(api, [to], true);
          }
        }
      },
    ),
  ),
  // 174. Ancestral Audience -----------------------------------------------------------------------------------------------------------
  card(
    {
      id: "ov_ancestral_audience",
      name: "Ancestral Audience",
      description:
        "Revive your highest-value captured piece onto an empty square in your half. In fairness before the ancestors, your opponent's best captured pawn or minor returns to a random empty square in their half.",
      tier: 6,
      category: "pieces",
      icon: "DoorOpen",
      flavor: "The spirits grant two doors, and dignity demands both open.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const type = (["q", "r", "b", "n", "p"] as PieceType[]).find(
          (t) => (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0,
        );
        return {
          kind: "square",
          label: "Choose where your ancestor returns",
          squares:
            type == null
              ? []
              : emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(
                  (sq) => type !== "p" || pawnRankOk(sq),
                ),
        };
      },
      (_inst, api, picks) => {
        const type = (["q", "r", "b", "n", "p"] as PieceType[]).find(
          (t) => (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0,
        );
        if (type == null || picks[0]?.square == null) return;
        if (type === "p" && !pawnRankOk(picks[0].square)) return;
        api.place(picks[0].square, type, api.me);
        markRevived(api, type);
        // Their side of the audience: best captured pawn or minor, random spot.
        const theirs = (["b", "n", "p"] as PieceType[]).find(
          (t) => (api.capturedByMe[t] ?? 0) - (api.theirs.revived[t] ?? 0) > 0,
        );
        if (theirs == null) return;
        const spots = emptySquares(
          api.board,
          (sq) => inHalf(api.opp, sq) && (theirs !== "p" || pawnRankOk(sq)),
        );
        if (spots.length === 0) return;
        const sq = spots[api.rng.int(spots.length)];
        api.place(sq, theirs, api.opp);
        api.theirs.revived[theirs] = (api.theirs.revived[theirs] ?? 0) + 1;
      },
    ),
  ),
  // 175. Cartographer's Vault ----------------------------------------------------------------------------------------------------------
  // ADAPTED: prepThree is a one-shot flag, so the vault sets it now and rearms
  // it once after your next draft resolves, which delivers the roster's
  // "next 2 drafts each offer 3 cards".
  card(
    {
      id: "ov_cartographers_vault",
      name: "Cartographer's Vault",
      description: "Your next 2 drafts each offer 3 cards.",
      tier: 8,
      category: "draft",
      icon: "Map",
      flavor: "Every shelf is a coastline nobody has drafted yet.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        api.mine.flags.prepThree = true;
        inst.state.base = api.mine.draftsTaken;
      },
      onMovePlayed: (inst, _move, api) => {
        if (api.mine.draftsTaken > ((inst.state.base as number) ?? 0)) {
          api.mine.flags.prepThree = true;
          inst.spent = true;
        }
      },
      status: (inst) =>
        ((inst.state.base as number) ?? 0) >= 0 ? "two charted drafts ahead" : null,
    },
  ),
];
