// Hex wave 4 (overhaul): 300 new hexes, tiers 38/38/38/38/37/37/37/37.
// Ids hx4_*, category "hex". Tiers 1-4 live here; tiers 5-8 live in
// ./wave4b.ts (imported below) together with the wave-shared helper kit.
//
// Authoring rails (same as tier1-8 / wave2 / wave3):
//   - every opponent-move filter keeps a non-empty fallback (curse() and the
//     hand-rolled passives all guard), so no card can soft-lock a turn;
//   - kings are never frozen, walnutted or removed; king-scoped constraints
//     are partial (a single banned move class, never a full lock);
//   - api.rng is drawn only inside init / effect / onMovePlayed;
//   - effects added DURING the victim's own move use turns = N + 1 (the
//     shared post-move pass ticks them once immediately); effects added on
//     the caster's turn use turns = N;
//   - each card is a distinct axis combination (piece class x constraint x
//     zone x trigger x duration x punishment) within the wave.

import type { Buff, BuffApi, Mech, Move, Square } from "./shared";
import {
  activated,
  addEffect,
  curse,
  emptySquares,
  hex,
  instant,
  isInCheck,
  mySquares,
  relRank,
  suppressDraftCards,
  tickTurns,
  tierHexes,
  turnsLeft,
  walnutTarget,
  FILE,
  RANK,
  SQ,
} from "./shared";
import {
  HEX_WAVE4B,
  attacks,
  barNow,
  cadenceCurse,
  capSq,
  cheb,
  drawRandom,
  dressUp,
  followSq,
  freezeNow,
  moveDist,
  myKing,
  nutNow,
  nutSting,
  onTheirMove,
  oppKing,
  sqShade,
  sting,
  PIECE_VAL,
} from "./wave4b";

const H1 = tierHexes(1);
const H2 = tierHexes(2);
const H3 = tierHexes(3);
const H4 = tierHexes(4);

// A curse that grants the first affected piece one escape: while the escape is
// unused the restriction is off, so the first otherwise-forbidden move they play
// slips through; from then on `pred` (a per-move KEEP test) is enforced for the
// rest of the duration. The timer still ticks every one of their turns, so the
// duration is preserved. `pred` must read only move fields (no board lookups)
// since it is re-checked in onMovePlayed, after the move is applied.
function escapeCurse(turns: number, pred: (m: Move, api: BuffApi) => boolean): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.escaped = false;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      if (!inst.state.escaped) return moves;
      const kept = moves.filter((m) => pred(m, api));
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && turnsLeft(inst) > 0 && !inst.state.escaped && !pred(move, api)) {
        inst.state.escaped = true;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      !inst.state.escaped ? "one escape move remains" : `${turnsLeft(inst)} of their turns left`,
  };
}

// A curse whose restriction starts one opponent move late: the first of their
// moves passes unrestricted, then `filter` runs for the next `turns` of their
// turns (the duration is preserved, just shifted).
function delayedCurse(turns: number, filter: (moves: Move[], api: BuffApi) => Move[]): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.delay = 1;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if ((inst.state.delay as number) > 0 || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && (inst.state.delay as number) > 0) {
        inst.state.delay = (inst.state.delay as number) - 1;
        return;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      (inst.state.delay as number) > 0 ? "not yet in effect" : `${turnsLeft(inst)} of their turns left`,
  };
}

// ------------------------------- TIER 1 ------------------------------------
// Pinpricks: one pawn inconvenienced, one-turn quirks, cosmetic jabs.

const T1: Buff[] = [
  H1(
    { id: "hx4_pebble_in_the_shoe", name: "Pebble in the Shoe", description: "One enemy pawn you target stops to shake out a pebble: it is frozen for 1 of their turns.", flavor: "Small stone, long sigh.", icon: "Footprints", fx: { motif: "jail", pieces: ["p"] } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose an enemy pawn", squares: mySquares(api.board, api.opp, "p") },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) freezeNow(api, picks[0].square, 1, "glue");
      },
    ),
  ),
  H1(
    { id: "hx4_wet_matches", name: "Wet Matches", description: "Your opponent's pawns cannot capture on their next turn.", flavor: "Strike all you like.", icon: "Flame", fx: { motif: "muzzle", pieces: ["p"] } },
    curse(1, (moves) => moves.filter((m) => m.piece !== "p" || !m.captured)),
  ),
  hex(
    { id: "hx4_blunted_horseshoes", name: "Blunted Horseshoes", description: "For your opponent's next 3 turns, a knight of theirs that moved on their previous turn is too winded to capture.", flavor: "All trot, no trample.", icon: "Origami", fx: { motif: "muzzle", pieces: ["n"] }, tier: 2 },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const last = hist[i];
          if (last.piece !== "n") return moves;
          return moves.filter((m) => m.piece !== "n" || m.from !== last.to || !m.captured);
        }
      }
      return moves;
    }),
  ),
  H1(
    { id: "hx4_buttoned_scabbard", name: "Buttoned Scabbard", description: "Your opponent's king cannot capture anything for their next 2 turns, except its first capture slips through as one escape, then the restriction holds.", flavor: "The royal sword is ceremonial this week.", icon: "Shield", fx: { motif: "muzzle" } },
    escapeCurse(2, (m) => m.piece !== "k" || !m.captured),
  ),
  H1(
    { id: "hx4_dusty_boots", name: "Dusty Boots", description: "One of your opponent's pawns, chosen at random, becomes a walnut for 1 of their turns: it can only shuffle a single square.", flavor: "March enough miles and you become the road.", icon: "Nut", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp, "p");
      for (const sq of drawRandom(api, pool, 1)) nutNow(api, sq, 1);
    }),
  ),
  H1(
    { id: "hx4_left_glove", name: "The Left Glove", description: "Your opponent's bishops cannot capture for their next 2 turns.", flavor: "Try holding a sword in mittens.", icon: "Hand", fx: { motif: "muzzle", pieces: ["b"] } },
    curse(2, (moves) => moves.filter((m) => m.piece !== "b" || !m.captured)),
  ),
  H1(
    { id: "hx4_tangled_reins", name: "Tangled Reins", description: "For your opponent's next 3 turns, their knights may not land on any edge square of the board.", flavor: "A knight on the rim is dim. Now it is also forbidden.", icon: "Cable", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "n") return true;
        const f = FILE(m.to);
        const r = RANK(m.to);
        return f !== 0 && f !== 7 && r !== 0 && r !== 7;
      }),
    ),
  ),
  H1(
    { id: "hx4_dunce_detail", name: "Dunce Detail", description: "After your opponent's next move, one of their knights or bishops, chosen at random, is sent to remedial training: it wears the dunce cap for 4 of their turns and is frozen for 1.", flavor: "Report to the little desk in the corner.", icon: "GraduationCap", fx: { motif: "jail", pieces: ["n", "b"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 1;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const pool = mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return t === "n" || t === "b";
          });
          for (const sq of drawRandom(api, pool, 1)) {
            dressUp(api, sq, "dunce", 5);
            sting(api, sq, 1, "stun");
          }
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => (turnsLeft(inst) > 0 ? "the summons is in the post" : null),
    },
  ),
  H1(
    { id: "hx4_heavy_pockets", name: "Heavy Pockets", description: "Starting after your opponent's next move, for their following 3 turns their pawns cannot make two square advances. Single steps only.", flavor: "Someone filled their coats with gravel.", icon: "Weight", fx: { motif: "slow", pieces: ["p"] } },
    delayedCurse(3, (moves) =>
      moves.filter((m) => m.piece !== "p" || Math.abs(RANK(m.to) - RANK(m.from)) !== 2),
    ),
  ),
  H1(
    { id: "hx4_creaky_axles", name: "Creaky Axles", description: "On your opponent's next turn, their rooks may slide at most 4 squares.", flavor: "You can hear the tower coming three streets away.", icon: "Cog", fx: { motif: "anchor", pieces: ["r"] } },
    curse(1, (moves) => moves.filter((m) => m.piece !== "r" || moveDist(m) <= 4)),
  ),
  hex(
    { id: "hx4_homesick_queen", name: "Homesick Queen", description: "For your opponent's next 3 turns, their queen may not move into your half of the board.", flavor: "She misses the curtains, apparently.", icon: "House", fx: { motif: "anchor", pieces: ["q"] }, tier: 2 },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "q" || relRank(api.opp, m.to) <= 4)),
  ),
  hex(
    { id: "hx4_gnat_cloud", name: "Gnat Cloud", description: "For your opponent's next 3 turns, they may not move the same piece they moved on their previous turn. Their king is exempt.", flavor: "It followed the horse. Now it follows everyone.", icon: "Bug", fx: { motif: "slow", pieces: "all" }, tier: 2 },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const last = hist[i].to;
          return moves.filter((m) => m.piece === "k" || m.from !== last);
        }
      }
      return moves;
    }),
  ),
  H1(
    { id: "hx4_polite_infantry", name: "Polite Infantry", description: "For your opponent's next 4 turns, their pawns may not capture toward the a side of the board. Captures toward the h side are still allowed.", flavor: "After you. No, after YOU.", icon: "HandHeart", fx: { motif: "muzzle", pieces: ["p"] } },
    curse(4, (moves) =>
      moves.filter((m) => m.piece !== "p" || !m.captured || FILE(m.to) > FILE(m.from)),
    ),
  ),
  H1(
    { id: "hx4_loose_horseshoe", name: "Loose Horseshoe", description: "One enemy knight you target loses a shoe after your opponent's next move and becomes a walnut for 1 of their turns: no leaping, only a one square hobble.", flavor: "For want of a nail, the leap was lost.", icon: "Magnet", fx: { motif: "anchor", pieces: ["n"] } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : { kind: "square", label: "Choose an enemy knight", squares: mySquares(api.board, api.opp, "n") },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.delay = 1;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        sq = followSq(sq, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        if (move.color === api.opp && (inst.state.delay as number) > 0) {
          inst.state.delay = (inst.state.delay as number) - 1;
          if ((inst.state.delay as number) <= 0) {
            nutSting(api, sq, 1);
            inst.spent = true;
          }
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to target a knight" : "the shoe is working loose",
    },
  ),
  H1(
    { id: "hx4_puddle", name: "The Puddle", description: "Choose an empty square: it becomes a deep puddle for 2 of your opponent's turns, and none of their pieces will stop in it.", flavor: "It looks shallow. It is not.", icon: "Droplet", fx: { motif: "blindfold" } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the puddle square", squares: emptySquares(api.board) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) barNow(api, [picks[0].square], 2);
      },
    ),
  ),
  H1(
    { id: "hx4_hiccups", name: "Hiccups", description: "On your opponent's next turn, they may only move pieces standing in their own half of the board. The first piece from your half slips through as one escape, then the restriction holds.", flavor: "Hic. Sorry. Hic. As you were.", icon: "MessageCircleWarning", fx: { motif: "slow", pieces: "all" } },
    escapeCurse(1, (m, api) => relRank(api.opp, m.from) <= 4),
  ),
  H1(
    { id: "hx4_royal_nametag", name: "Royal Name Tag", description: "Their queen is issued a conference name tag reading SUSAN for 5 of their turns, and the indignity shows: she cannot capture on their next turn.", flavor: "HELLO my name is regicide, apparently not today.", icon: "Tag", fx: { motif: "muzzle", pieces: ["q"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 1;
        for (const sq of mySquares(api.board, api.opp, "q")) {
          addEffect(api, { kind: "cosmetic", sq, owner: api.opp, turns: 5, skin: "nametag", label: "SUSAN" });
        }
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "q" || !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => (turnsLeft(inst) > 0 ? "the tag still stings" : null),
    },
  ),
  H1(
    { id: "hx4_sleepy_sentry", name: "Sleepy Sentry", description: "One of your opponent's pawns on the a or h file, chosen at random, falls asleep at its post and is frozen for 2 of their turns. If no edge pawn remains, nothing happens.", flavor: "The wall watches itself, probably.", icon: "Moon", fx: { motif: "jail", pieces: ["p"] } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp, "p").filter((sq) => FILE(sq) === 0 || FILE(sq) === 7);
      for (const sq of drawRandom(api, pool, 1)) freezeNow(api, sq, 2, "sleep");
    }),
  ),
  H1(
    { id: "hx4_cold_porridge", name: "Cold Porridge", description: "Starting after your opponent's next move, for their following 4 turns the infantry refuses breakfast every other morning: on the 1st and 3rd of those turns their pawns cannot move.", flavor: "An army marches on its stomach, alternately.", icon: "Soup", fx: { motif: "slow", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.delay = 1;
      },
      filterOpponentMoves: (moves, inst) => {
        if ((inst.state.delay as number) > 0 || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        if ((4 - turnsLeft(inst)) % 2 !== 0) return moves;
        const kept = moves.filter((m) => m.piece !== "p");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && (inst.state.delay as number) > 0) {
          inst.state.delay = (inst.state.delay as number) - 1;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        (inst.state.delay as number) > 0 ? "not yet in effect" : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H1(
    { id: "hx4_slow_clap", name: "Slow Clap", description: "For your opponent's next 6 turns, castling draws sarcastic applause: if they castle in that window, on their following turn they may only move a pawn or their king.", flavor: "Bravo. Truly. A door, closed.", icon: "Hand", fx: { motif: "slow" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.tax = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.tax as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.tax = move.castle ? 1 : 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        ((inst.state.tax as number) ?? 0) > 0
          ? "the applause echoes next turn"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H1(
    { id: "hx4_thin_ice_patch", name: "Thin Ice Patch", description: "The two central squares on your side of the midline (your d and e entry squares) turn to thin ice: your opponent's pieces may not stop on them for their next 2 turns. Their king is exempt.", flavor: "Listen for the crack before you commit.", icon: "Snowflake", fx: { motif: "blindfold", pieces: "all" } },
    curse(2, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "k" ||
          !(relRank(api.opp, m.to) === 5 && (FILE(m.to) === 3 || FILE(m.to) === 4)),
      ),
    ),
  ),
  H1(
    { id: "hx4_mismatched_livery", name: "Mismatched Livery", description: "Their rooks are repainted as checkers pieces for 4 of their turns, and the embarrassment lingers: on their next turn their rooks may only move sideways along ranks.", flavor: "Wrong game, gentlemen.", icon: "Palette", fx: { motif: "anchor", pieces: ["r"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 1;
        for (const sq of mySquares(api.board, api.opp, "r")) dressUp(api, sq, "checkers", 4);
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "r" || RANK(m.from) === RANK(m.to));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => (turnsLeft(inst) > 0 ? "the paint is still wet" : null),
    },
  ),
  H1(
    { id: "hx4_red_tape", name: "Red Tape", description: "Your opponent's next draft offer excludes draft manipulation cards. The paperwork was misfiled.", flavor: "Form 7B requires form 7A, which does not exist.", icon: "FileText" },
    suppressDraftCards(1),
  ),
  H1(
    { id: "hx4_pigeon_perch", name: "Pigeon Perch", description: "A pigeon lands on their king and refuses to leave for 4 of their turns. Not wishing to disturb it, their king does not move on their next turn.", flavor: "It has nested. There are bylaws about nests.", icon: "Bird", fx: { motif: "jail" } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 1;
        const k = oppKing(api);
        if (k != null) addEffect(api, { kind: "cosmetic", sq: k, owner: api.opp, turns: 4, skin: "pigeon" });
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => (turnsLeft(inst) > 0 ? "the pigeon is settling in" : null),
    },
  ),
  H1(
    { id: "hx4_no_mans_reach", name: "No Man's Reach", description: "For your opponent's next 3 turns, their knights may not land on your two back ranks.", flavor: "The deep raid is cancelled due to fences.", icon: "Ruler", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "n" || relRank(api.opp, m.to) <= 6)),
  ),
  H1(
    { id: "hx4_one_way_cloister", name: "One Way Cloister", description: "For your opponent's next 2 turns, their bishops may only move toward the a side of the board.", flavor: "The corridor only runs west.", icon: "ArrowLeft", fx: { motif: "anchor", pieces: ["b"] } },
    curse(2, (moves) => moves.filter((m) => m.piece !== "b" || FILE(m.to) < FILE(m.from))),
  ),
  H1(
    { id: "hx4_matins_bell", name: "Matins Bell", description: "On your opponent's next turn, their pieces standing on the queenside files (a to d) may not capture: they are at morning prayers. The first such capture slips through as one escape, then the restriction holds.", flavor: "Violence resumes after the second hymn.", icon: "Church", fx: { motif: "muzzle", pieces: "all" } },
    escapeCurse(1, (m) => !m.captured || FILE(m.from) > 3),
  ),
  H1(
    { id: "hx4_borrowed_boots", name: "Borrowed Boots", description: "For your opponent's next 3 turns, their king cannot step diagonally, straight steps only. The first diagonal step slips through as one escape, then the restriction holds.", flavor: "Two sizes too big and pointed the wrong way.", icon: "Footprints", fx: { motif: "anchor" } },
    escapeCurse(
      3,
      (m) => m.piece !== "k" || FILE(m.from) === FILE(m.to) || RANK(m.from) === RANK(m.to),
    ),
  ),
  H1(
    { id: "hx4_curfew_horn", name: "Curfew Horn", description: "For your opponent's next 3 turns, none of their pieces may move onto your back rank. The first piece to try slips through as one escape, then the restriction holds.", flavor: "The horn sounds and the deep streets empty.", icon: "Megaphone", fx: { motif: "blindfold", pieces: "all" } },
    escapeCurse(3, (m, api) => relRank(api.opp, m.to) !== 8),
  ),
  H1(
    { id: "hx4_mild_sting", name: "Mild Sting", description: "A wasp circles their camp, in plain sight: after 3 of your opponent's turns, one of their pawns, chosen at random, is stung and frozen for 1 of their turns.", flavor: "You always hear it long before it lands.", icon: "Bug", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(3, (_move, api, inst) => {
      if (turnsLeft(inst) === 1) {
        const pool = mySquares(api.board, api.opp, "p");
        for (const sq of drawRandom(api, pool, 1)) sting(api, sq, 1, "glue");
      }
    }),
  ),
  H1(
    { id: "hx4_squeaky_wheel", name: "Squeaky Wheel", description: "Your opponent's rooks cannot capture for their next 2 turns.", flavor: "Hard to ambush anyone at that volume.", icon: "Volume2", fx: { motif: "muzzle", pieces: ["r"] } },
    curse(2, (moves) => moves.filter((m) => m.piece !== "r" || !m.captured)),
  ),
  H1(
    { id: "hx4_hopscotch", name: "Hopscotch", description: "On your opponent's next turn, their pawns standing on light squares are busy playing hopscotch and cannot move. The first such pawn slips through as one escape, then the restriction holds.", flavor: "Rules are rules. She threw the stone.", icon: "Grid2x2", fx: { motif: "slow", pieces: ["p"] } },
    escapeCurse(1, (m) => m.piece !== "p" || sqShade(m.from) !== 1),
  ),
  H1(
    { id: "hx4_overslept_officers", name: "Overslept Officers", description: "On your opponent's next turn, their knights and bishops cannot move. The officers overslept.", flavor: "The trumpeter also overslept. It compounds.", icon: "AlarmClockOff", fx: { motif: "slow", pieces: ["n", "b"] } },
    curse(1, (moves) => moves.filter((m) => m.piece !== "n" && m.piece !== "b")),
  ),
  H1(
    { id: "hx4_narrow_lane", name: "Narrow Lane", description: "On your opponent's next turn, their bishops, rooks and queen may slide at most 2 squares.", flavor: "The parade does not fit down Tanner Street.", icon: "AlignJustify", fx: { motif: "anchor", pieces: ["b", "r", "q"] } },
    curse(1, (moves) => moves.filter((m) => !["b", "r", "q"].includes(m.piece) || moveDist(m) <= 2)),
  ),
  H1(
    { id: "hx4_second_thoughts", name: "Second Thoughts", description: "For your opponent's next 4 turns, they cannot castle. The king keeps re reading the paperwork.", flavor: "Clause four is troubling, said the king, again.", icon: "FileQuestion", fx: { motif: "slow" } },
    curse(4, (moves) => moves.filter((m) => !m.castle)),
  ),
  H1(
    { id: "hx4_beneath_her_dignity", name: "Beneath Her Dignity", description: "For your opponent's next 3 turns, their queen refuses to capture pawns.", flavor: "One does not fence with the help.", icon: "Crown", fx: { motif: "muzzle", pieces: ["q"] } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "q") return true;
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "p";
      }),
    ),
  ),
  H1(
    { id: "hx4_court_jester", name: "Court Jester", description: "After your opponent's next move, one of their pieces, chosen at random (never the king), is appointed court jester: it wears the hat for 5 of their turns and, mid bow, is frozen for 1.", flavor: "The bells are load bearing.", icon: "Sparkles", fx: { motif: "jail" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 1;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
          for (const sq of drawRandom(api, pool, 1)) {
            dressUp(api, sq, "hat", 6);
            sting(api, sq, 1, "charm");
          }
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => (turnsLeft(inst) > 0 ? "the jester waits in the wings" : null),
    },
  ),
  H1(
    { id: "hx4_early_frost", name: "Early Frost", description: "Your opponent's pawns cannot advance on their next turn. Diagonal captures still work. The first pawn to try advancing slips through as one escape, then the restriction holds.", flavor: "The furrows froze overnight.", icon: "Leaf", fx: { motif: "anchor", pieces: ["p"] } },
    escapeCurse(1, (m) => m.piece !== "p" || FILE(m.from) !== FILE(m.to)),
  ),
];

// ------------------------------- TIER 2 ------------------------------------
// Light curses: two-turn class quirks, first traps and cooldowns.

const T2: Buff[] = [
  H2(
    { id: "hx4_dim_torches", name: "Dim Torches", description: "For your opponent's next 2 turns, they may not capture anything more than 3 squares away from their own king. The dark swallows distant targets.", flavor: "Past the torchlight, everything is a guess.", icon: "Lamp", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => {
        const c = capSq(m);
        return c == null || cheb(c, k) <= 3;
      });
    }),
  ),
  H2(
    { id: "hx4_bramble_patch", name: "Bramble Patch", description: "Choose 2 empty squares: brambles cover them for 2 of your opponent's turns, and none of their pieces may stop there.", flavor: "Every path has a plant with opinions.", icon: "Flower2", fx: { motif: "blindfold" } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : { kind: "square", label: `Choose a bramble square (${picks.length + 1}/2)`, squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)) },
      (_inst, api, picks) => {
        barNow(api, picks.map((k) => k.square).filter((s): s is Square => s != null), 2);
      },
    ),
  ),
  H2(
    { id: "hx4_no_trampling", name: "No Trampling", description: "For your opponent's next 4 turns, their knights may not capture pawns. The cavalry has been sued before.", flavor: "The last settlement bought the plaintiff a farm.", icon: "Scale", fx: { motif: "muzzle", pieces: ["n"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "n") return true;
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "p";
      }),
    ),
  ),
  H2(
    { id: "hx4_moths_in_the_banner", name: "Moths in the Banner", description: "Your opponent's rooks cannot move on their next turn: the regimental colors are being mended.", flavor: "You cannot advance without the flag. It is a whole thing.", icon: "Flag", fx: { motif: "jail", pieces: ["r"] } },
    curse(1, (moves) => moves.filter((m) => m.piece !== "r")),
  ),
  H2(
    { id: "hx4_muddy_moat", name: "Muddy Moat", description: "For your opponent's next 3 turns, their pawns on the d and e files cannot advance. The center is a soup.", flavor: "The engineers blame the rain. The rain blames the engineers.", icon: "CloudRain", fx: { motif: "anchor", pieces: ["p"] } },
    curse(3, (moves) =>
      moves.filter(
        (m) =>
          m.piece !== "p" ||
          FILE(m.from) !== FILE(m.to) ||
          (FILE(m.from) !== 3 && FILE(m.from) !== 4),
      ),
    ),
  ),
  H2(
    { id: "hx4_winded_monarch", name: "Winded Monarch", description: "For your opponent's next 4 turns, their king cannot move on two consecutive turns: after any king move, it must rest a turn.", flavor: "Stairs were involved.", icon: "HeartPulse", fx: { motif: "slow" } },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          if (hist[i].piece === "k") return moves.filter((m) => m.piece !== "k");
          return moves;
        }
      }
      return moves;
    }),
  ),
  H2(
    { id: "hx4_sticky_floorboards", name: "Sticky Floorboards", description: "On your opponent's next turn, their pieces standing on their own back rank cannot move. Someone waxed the throne room.", flavor: "The varnish was advertised as quick drying.", icon: "Paintbrush", fx: { motif: "jail", pieces: "all" } },
    curse(1, (moves, api) => moves.filter((m) => m.piece === "k" || relRank(api.opp, m.from) !== 1)),
  ),
  H2(
    { id: "hx4_shrunken_shoes", name: "Shrunken Shoes", description: "For your opponent's next 2 turns, none of their pieces may move more than 3 squares.", flavor: "The quartermaster washed everything on hot.", icon: "Shrink", fx: { motif: "anchor", pieces: "all" } },
    curse(2, (moves) => moves.filter((m) => m.piece === "k" || moveDist(m) <= 3)),
  ),
  H2(
    { id: "hx4_flinching_blades", name: "Flinching Blades", description: "For your opponent's next 2 turns, they may not capture from an adjacent square: every kill must come from at least 2 squares away. Kings are exempt.", flavor: "Hard to stab someone who is making eye contact.", icon: "Eye", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves) => moves.filter((m) => m.piece === "k" || !m.captured || moveDist(m) >= 2)),
  ),
  H2(
    { id: "hx4_borrowed_lantern", name: "Borrowed Lantern", description: "For your opponent's next 2 turns, they cannot capture anything standing on a dark square. The lantern only lights half the world.", flavor: "Cheap oil, cheap light, expensive mistakes.", icon: "Lightbulb", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves) => {
      return moves.filter((m) => {
        const c = capSq(m);
        return c == null || sqShade(c) === 1;
      });
    }),
  ),
  H2(
    { id: "hx4_elbow_room", name: "Elbow Room", description: "For your opponent's next 2 turns, none of their pieces may end a move adjacent to another of their own pieces. The army demands personal space. Their king is exempt.", flavor: "Formation is a strong word for what this is.", icon: "Expand", fx: { motif: "anchor", pieces: "all" } },
    curse(2, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "k" ||
          !mySquares(api.board, api.opp).some((s) => s !== m.from && s !== m.to && cheb(s, m.to) === 1),
      ),
    ),
  ),
  H2(
    { id: "hx4_cold_start", name: "Cold Start", description: "For your opponent's next 4 turns, the first knight of theirs to move pulls a muscle and is frozen for 1 of their turns immediately after.", flavor: "Always stretch before leaping. Always.", icon: "Activity", fx: { motif: "slow", pieces: ["n"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.piece === "n") {
          sting(api, move.to, 1, "stun");
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `waiting for a knight, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H2(
    { id: "hx4_tilted_crown", name: "Tilted Crown", description: "For your opponent's next 3 turns, their queen may only move diagonally. The crown slid over one eye.", flavor: "She can see the corners perfectly, thank you.", icon: "Crown", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves) =>
      moves.filter(
        (m) => m.piece !== "q" || Math.abs(FILE(m.to) - FILE(m.from)) === Math.abs(RANK(m.to) - RANK(m.from)),
      ),
    ),
  ),
  H2(
    { id: "hx4_pawn_snob", name: "Pawn Snob", description: "For your opponent's next 4 turns, their pawns will not capture other pawns. Beneath them, apparently.", flavor: "We only duel officers, sniffed the smallest soldier.", icon: "ThumbsDown", fx: { motif: "muzzle", pieces: ["p"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "p") return true;
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "p";
      }),
    ),
  ),
  H2(
    { id: "hx4_cold_barracks", name: "Cold Barracks", description: "For your opponent's next 3 turns, their rooks may not stop on their own back rank. The barracks heating failed.", flavor: "The towers would rather sleep outside.", icon: "Building2", fx: { motif: "blindfold", pieces: ["r"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "r" || relRank(api.opp, m.to) !== 1)),
  ),
  H2(
    { id: "hx4_two_step", name: "Two Step", description: "For your opponent's next 3 turns, no move may cover the same distance as their previous move. The dance master insists on variety.", flavor: "One long, one short. Feel the rhythm.", icon: "AudioLines", fx: { motif: "slow", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const d = Math.max(
            Math.abs(FILE(hist[i].to) - FILE(hist[i].from)),
            Math.abs(RANK(hist[i].to) - RANK(hist[i].from)),
          );
          return moves.filter((m) => m.piece === "k" || moveDist(m) !== d);
        }
      }
      return moves;
    }),
  ),
  H2(
    { id: "hx4_guild_insurance", name: "Guild Insurance", description: "Your rooks are insured by the masons' guild: your opponent cannot capture them for their next 3 turns.", flavor: "Nobody wants to owe the masons a tower.", icon: "ShieldCheck", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "r";
      }),
    ),
  ),
  H2(
    { id: "hx4_shadowed_meadow", name: "Shadowed Meadow", description: "For your opponent's next 2 turns, their pieces may not stop on dark squares in your half of the board. Their king is exempt.", flavor: "The shade on that side bites.", icon: "TreeDeciduous", fx: { motif: "blindfold", pieces: "all" } },
    curse(2, (moves, api) =>
      moves.filter((m) => m.piece === "k" || !(relRank(api.opp, m.to) >= 5 && sqShade(m.to) === 0)),
    ),
  ),
  H2(
    { id: "hx4_hand_cramp", name: "Hand Cramp", description: "For your opponent's next 2 turns, any rook they move seizes up afterward and is frozen for 1 of their turns.", flavor: "Too much penmanship, not enough siegecraft.", icon: "PenOff", fx: { motif: "slow", pieces: ["r"] } },
    onTheirMove(2, (move, api) => {
      if (move.piece === "r") sting(api, move.to, 1, "rust");
    }),
  ),
  H2(
    { id: "hx4_deja_vu", name: "Deja Vu", description: "For your opponent's next 3 turns, they may not move any piece standing on the same file as the piece they moved last turn. Their king is exempt.", flavor: "Have we not done this exact thing before?", icon: "RotateCcw", fx: { motif: "slow", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const f = FILE(hist[i].to);
          return moves.filter((m) => m.piece === "k" || FILE(m.from) !== f);
        }
      }
      return moves;
    }),
  ),
  H2(
    { id: "hx4_gum_wrapper", name: "Gum Wrapper", description: "One enemy pawn you target is wrapped up like a sweet: it becomes a walnut for 2 of their turns, shuffling one square at best.", flavor: "Collectible wrapper. Non collectible pawn.", icon: "Candy", fx: { motif: "anchor", pieces: ["p"] } },
    walnutTarget(2, ["p"]),
  ),
  H2(
    { id: "hx4_tea_break", name: "Tea Break", description: "On your opponent's next turn, only pieces within 2 squares of their king may move. Everyone else is at tea.", flavor: "The kettle outranks the general.", icon: "Coffee", fx: { motif: "slow", pieces: "all" } },
    curse(1, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => cheb(m.from, k) <= 2);
    }),
  ),
  H2(
    { id: "hx4_no_full_retreat", name: "No Full Retreat", description: "For your opponent's next 3 turns, no piece may retreat more than 2 squares toward its own back rank in a single move.", flavor: "Walk backwards with dignity, or not at all.", icon: "Undo2", fx: { motif: "anchor", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) => m.piece === "k" || relRank(api.opp, m.to) >= relRank(api.opp, m.from) || moveDist(m) <= 2,
      ),
    ),
  ),
  H2(
    { id: "hx4_plumed_helmets", name: "Plumed Helmets", description: "Their knights are issued enormous ceremonial wings for 5 of their turns, and preening takes time: their knights cannot move on their next turn.", flavor: "Aerodynamic? No. Magnificent? Extremely.", icon: "Feather", fx: { motif: "slow", pieces: ["n"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 1;
        for (const sq of mySquares(api.board, api.opp, "n")) dressUp(api, sq, "wings", 5);
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "n");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => (turnsLeft(inst) > 0 ? "still preening" : null),
    },
  ),
  H2(
    { id: "hx4_short_stirrups", name: "Short Stirrups", description: "For your opponent's next 4 turns, their knights may not land adjacent to your king. The horses refuse the last stretch.", flavor: "Even a warhorse knows a bad idea when it smells one.", icon: "OctagonAlert", fx: { motif: "anchor", pieces: ["n"] } },
    curse(4, (moves, api) => {
      const k = myKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece !== "n" || cheb(m.to, k) > 1);
    }),
  ),
  H2(
    { id: "hx4_soggy_invaders", name: "Soggy Invaders", description: "For your opponent's next 2 turns, their pieces standing in your half of the board cannot capture. Wet powder, wetter morale.", flavor: "The river crossing seemed clever at the time.", icon: "Umbrella", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves, api) => moves.filter((m) => !m.captured || relRank(api.opp, m.from) <= 4)),
  ),
  H2(
    { id: "hx4_vegetarian_vows", name: "Vegetarian Vows", description: "For your opponent's next 4 turns, their bishops will not capture pawns. A dietary matter of conscience.", flavor: "The order forbids anything that once held a farm tool.", icon: "Salad", fx: { motif: "muzzle", pieces: ["b"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "b") return true;
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "p";
      }),
    ),
  ),
  H2(
    { id: "hx4_winded_destrier", name: "Winded Destrier", description: "For your opponent's next 3 turns, any knight of theirs that captures must catch its breath and is frozen for 1 of their turns.", flavor: "The charge was glorious. The wheeze, less so.", icon: "Wind", fx: { motif: "muzzle", pieces: ["n"] } },
    onTheirMove(3, (move, api) => {
      if (move.piece === "n" && move.captured) sting(api, move.to, 1, "gum");
    }),
  ),
  H2(
    { id: "hx4_leaky_quiver", name: "Leaky Quiver", description: "For your opponent's next 3 turns, their queen may slide at most 4 squares.", flavor: "Half her arrows are somewhere on the road.", icon: "Target", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || moveDist(m) <= 4)),
  ),
  H2(
    { id: "hx4_frost_footprints", name: "Frost Footprints", description: "For your opponent's next 2 turns, every square one of their pieces leaves ices over behind it: no piece of theirs may stop there on their following turn.", flavor: "You cannot go home by the road you froze.", icon: "Snowflake", fx: { motif: "blindfold", pieces: "all" } },
    onTheirMove(2, (move, api) => {
      if (move.from !== move.to) {
        addEffect(api, { kind: "barred", squares: [move.from], against: api.opp, turns: 2 });
      }
    }),
  ),
  H2(
    { id: "hx4_bridge_toll", name: "Bridge Toll", description: "For your opponent's next 3 turns, only their pawns and king may cross the midline into your half. The bridge keeper distrusts officers.", flavor: "Boots pay a penny. Horses pay in paperwork.", icon: "Landmark", fx: { motif: "anchor", pieces: ["n", "b", "r", "q"] } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "p" ||
          m.piece === "k" ||
          relRank(api.opp, m.from) >= 5 ||
          relRank(api.opp, m.to) <= 4,
      ),
    ),
  ),
  H2(
    { id: "hx4_halo_of_the_crown", name: "Halo of the Crown", description: "A faint halo guards your court: for your opponent's next 3 turns, they cannot capture any piece standing adjacent to your king.", flavor: "Some borders are drawn in light.", icon: "Sun", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = myKing(api);
      if (k == null) return moves;
      return moves.filter((m) => {
        const c = capSq(m);
        return c == null || cheb(c, k) > 1;
      });
    }),
  ),
  H2(
    { id: "hx4_house_arrest", name: "House Arrest", description: "For your opponent's next 4 turns, their king may not move beyond their own second rank.", flavor: "The charges are vague. The locks are not.", icon: "Lock", fx: { motif: "anchor" } },
    curse(4, (moves, api) => moves.filter((m) => m.piece !== "k" || relRank(api.opp, m.to) <= 2)),
  ),
  H2(
    { id: "hx4_slippery_scepter", name: "Slippery Scepter", description: "For your opponent's next 3 turns, their queen cannot move on two consecutive turns: after she moves, she must rest a turn to regrip the scepter.", flavor: "Gilded, jeweled, and impossible to hold.", icon: "Wand", fx: { motif: "slow", pieces: ["q"] } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          if (hist[i].piece === "q") return moves.filter((m) => m.piece !== "q");
          return moves;
        }
      }
      return moves;
    }),
  ),
  H2(
    { id: "hx4_mirror_manners", name: "Mirror Manners", description: "For your opponent's next 2 turns, they may not capture with the same type of piece you moved on your previous turn.", flavor: "Copying is rude. Especially with swords.", icon: "Copy", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.me) {
          const t = hist[i].piece;
          return moves.filter((m) => !m.captured || m.piece !== t);
        }
      }
      return moves;
    }),
  ),
  H2(
    { id: "hx4_heavy_dew", name: "Heavy Dew", description: "A freezing dew settles at dawn: every enemy piece standing on its owner's fourth rank is frozen for 1 of their turns.", flavor: "The forward camp woke up crunchy.", icon: "Droplets", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (relRank(api.opp, sq) === 4) freezeNow(api, sq, 1, "ice");
      }
    }),
  ),
  H2(
    { id: "hx4_borrowed_crown", name: "Borrowed Crown", description: "One of your opponent's pawns, chosen at random, finds a crown and gets ideas: it is gilded for 6 of their turns and, weighed down by delusion, becomes a walnut for 1.", flavor: "Heavy is the head that found it in a ditch.", icon: "Crown", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp, "p");
      for (const sq of drawRandom(api, pool, 1)) {
        dressUp(api, sq, "gilded", 6);
        nutNow(api, sq, 1);
      }
    }),
  ),
  H2(
    { id: "hx4_clumsy_heralds", name: "Clumsy Heralds", description: "For your opponent's next 3 turns, every check they give is followed by apologies: on their following turn they may only move a pawn or their king.", flavor: "The herald announced the attack to the wrong tent.", icon: "Megaphone", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.tax = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.tax as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.tax = isInCheck(api.board, api.me) ? 1 : 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        ((inst.state.tax as number) ?? 0) > 0
          ? "apologies due next turn"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

// ------------------------------- TIER 3 ------------------------------------
// Real curses: bounded single constraints, first geometry distortions.

const T3: Buff[] = [
  H3(
    { id: "hx4_hobble_strap", name: "Hobble Strap", description: "Buckle a hobble onto one enemy piece (never the king): for your opponent's next 3 turns it may move at most 1 square at a time.", flavor: "It can still walk. It just cannot be dramatic about it.", icon: "Link", fx: { motif: "anchor" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : { kind: "square", label: "Choose the piece to hobble", squares: mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k") },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.from !== sq || moveDist(m) <= 1);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let sq = (inst.state.sq as Square | null | undefined) ?? null;
        if (sq == null) return;
        if (move.capturedSquare === sq && move.from !== sq) sq = null;
        else if (move.from === sq && move.to !== sq) sq = move.to;
        else if (move.to === sq && move.from !== sq) sq = null;
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to hobble a piece" : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_carrion_crows", name: "Carrion Crows", description: "For your opponent's next 3 turns, any piece of theirs that captures inside your half of the board is mobbed by crows and frozen for 1 of their turns.", flavor: "The flock takes its share of every foreign kill.", icon: "Bird", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(3, (move, api) => {
      const c = capSq(move);
      if (c != null && move.piece !== "k" && relRank(api.opp, c) >= 5) sting(api, move.to, 1, "tar");
    }),
  ),
  H3(
    { id: "hx4_toad_pond", name: "Toad Pond", description: "Choose an empty square: for your opponent's next 6 turns it is a cursed pond, and the first piece of theirs to stop in it becomes a walnut for 1 of their turns. Kings do not fit in ponds.", flavor: "Everything that touches the water comes out rounder.", icon: "Droplet", fx: { motif: "blindfold" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.trap != null
          ? null
          : { kind: "square", label: "Choose the pond square", squares: emptySquares(api.board) },
      effect: (inst, _api, picks) => {
        if (inst.state.trap != null) return;
        inst.state.trap = picks[0]?.square ?? null;
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        const trap = inst.state.trap as Square | null | undefined;
        if (trap == null) return;
        if (move.color === api.opp && move.to === trap && move.piece !== "k") {
          const p = api.board.pieces[trap];
          if (p && p.color === api.opp) {
            addEffect(api, { kind: "walnut", sq: trap, owner: api.opp, turns: 2 });
          }
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.trap == null ? "activate to curse a square" : `pond set, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_one_ladle_each", name: "One Ladle Each", description: "For your opponent's next 4 turns, the mess line is strict: after any pawn move, their pawns cannot move on the following turn.", flavor: "Seconds are a court martial offence.", icon: "Soup", fx: { motif: "slow", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.rest = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.rest as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "p");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.rest = move.piece === "p" ? 1 : 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_crooked_arrow", name: "Crooked Arrow", description: "For your opponent's next 4 turns, their rooks may only move an odd number of squares: 1, 3, 5 or 7.", flavor: "The fletcher was drunk. The rook is coping.", icon: "MoveDiagonal", fx: { motif: "anchor", pieces: ["r"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || moveDist(m) % 2 === 1)),
  ),
  H3(
    { id: "hx4_night_soil", name: "Night Soil", description: "The first rank of your half of the board is freshly manured: your opponent's pieces cannot stop anywhere on it for their next 2 turns.", flavor: "Strategically vital. Nasally unbearable.", icon: "Tractor", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const rank = api.opp === "w" ? 4 : 3;
      barNow(api, Array.from({ length: 8 }, (_, f) => SQ(f, rank)), 2);
    }),
  ),
  H3(
    { id: "hx4_glass_ceiling", name: "Glass Ceiling", description: "For your opponent's next 5 turns, their pawns may not promote. The final step simply is not there.", flavor: "You can see the crown from here. That is the cruelty.", icon: "PanelTop", fx: { motif: "anchor", pieces: ["p"] } },
    curse(5, (moves) => moves.filter((m) => !m.promotion)),
  ),
  H3(
    { id: "hx4_rope_bridge", name: "Rope Bridge", description: "For your opponent's next 3 turns, pieces may cross the midline into your half only on the central files (c to f). The flanks have no bridge.", flavor: "It sways. It creaks. It is the only way over.", icon: "Cable", fx: { motif: "anchor", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          relRank(api.opp, m.from) >= 5 ||
          relRank(api.opp, m.to) <= 4 ||
          (FILE(m.to) >= 2 && FILE(m.to) <= 5),
      ),
    ),
  ),
  H3(
    { id: "hx4_the_ides", name: "The Ides", description: "A dreadful date circled on their calendar: on your opponent's 3rd turn from now, whichever piece they move is frozen for 1 of their turns immediately after. Kings shrug off omens.", flavor: "Beware. You know the rest.", icon: "CalendarX", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(3, (move, api, inst) => {
      if (turnsLeft(inst) === 1 && move.piece !== "k") sting(api, move.to, 1, "stun");
    }),
  ),
  H3(
    { id: "hx4_cracked_bell", name: "Cracked Bell", description: "For your opponent's next 5 turns, the truce bell rings on their 2nd and 4th turns: on those turns they cannot capture.", flavor: "It rings when it likes. The law is the law.", icon: "Bell", fx: { motif: "muzzle", pieces: "all" } },
    cadenceCurse(5, (e) => e === 1 || e === 3, (moves) => moves.filter((m) => !m.captured)),
  ),
  H3(
    { id: "hx4_moth_eaten_gloves", name: "Moth Eaten Gloves", description: "For your opponent's next 4 turns, their queen may only capture on light squares. Her dark glove is full of holes.", flavor: "One cannot strangle anyone in THESE.", icon: "Hand", fx: { motif: "muzzle", pieces: ["q"] } },
    curse(4, (moves) => {
      return moves.filter((m) => {
        if (m.piece !== "q" || !m.captured) return true;
        const c = capSq(m);
        return c != null && sqShade(c) === 1;
      });
    }),
  ),
  H3(
    { id: "hx4_doting_retinue", name: "Doting Retinue", description: "For your opponent's next 3 turns, pieces standing adjacent to their queen may not move: the retinue will not leave her side. The queen herself moves freely.", flavor: "Yes, Majesty. At once, Majesty. We stay, Majesty.", icon: "Users", fx: { motif: "jail", pieces: "all" } },
    curse(3, (moves, api) => {
      const queens = mySquares(api.board, api.opp, "q");
      if (queens.length === 0) return moves;
      return moves.filter(
        (m) => m.piece === "q" || m.piece === "k" || !queens.some((q) => cheb(m.from, q) === 1),
      );
    }),
  ),
  H3(
    { id: "hx4_wrong_map", name: "Wrong Map", description: "For your opponent's next 3 turns, their knights may only land on dark squares. Someone printed the map inverted.", flavor: "According to this, the tavern is a lake.", icon: "Map", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "n" || sqShade(m.to) === 0)),
  ),
  H3(
    { id: "hx4_fresh_crater", name: "Fresh Crater", description: "For your opponent's next 2 turns, pieces standing adjacent to the piece you last moved cannot move: everyone is staring at the crater. Their king is exempt.", flavor: "It is still smoking. Give it a minute.", icon: "CircleDot", fx: { motif: "jail", pieces: "all" } },
    curse(2, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.me) {
          const L = hist[i].to;
          return moves.filter((m) => m.piece === "k" || cheb(m.from, L) > 1);
        }
      }
      return moves;
    }),
  ),
  H3(
    { id: "hx4_cold_shoulder", name: "Cold Shoulder", description: "For your opponent's next 4 turns, their king may not end a move adjacent to any of your pieces.", flavor: "Royalty does not mingle with the enemy. Officially.", icon: "UserX", fx: { motif: "anchor" } },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "k" || !mySquares(api.board, api.me).some((s) => cheb(s, m.to) <= 1),
      ),
    ),
  ),
  H3(
    { id: "hx4_creaking_gallows", name: "Creaking Gallows", description: "The gallows creak for 2 of your opponent's turns, then the rope drops: their most advanced piece at that moment (never the king) is frozen for 2 of their turns.", flavor: "Every head in the front row keeps very still.", icon: "TriangleAlert", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(2, (_move, api, inst) => {
      if (turnsLeft(inst) === 1) {
        const front = mySquares(api.board, api.opp)
          .filter((sq) => api.board.pieces[sq]!.type !== "k")
          .sort((a, b) => relRank(api.opp, b) - relRank(api.opp, a) || a - b);
        if (front.length > 0) sting(api, front[0], 2, "stone");
      }
    }),
  ),
  H3(
    { id: "hx4_pawnbrokers_lien", name: "Pawnbroker's Lien", description: "For your opponent's next 4 turns, every pawn they move is seized as collateral: it is frozen for the remainder of the window.", flavor: "Read the ticket. It is all in the ticket.", icon: "Receipt", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(4, (move, api, inst) => {
      if (move.piece === "p" && !move.promotion) {
        const n = turnsLeft(inst) - 1;
        if (n > 0) sting(api, move.to, n, "chains");
      }
    }),
  ),
  H3(
    { id: "hx4_skittish_mounts", name: "Skittish Mounts", description: "For your opponent's next 2 turns, their knights may not land adjacent to any of your pieces. The horses smell trouble.", flavor: "A horse's veto is absolute.", icon: "AlertTriangle", fx: { motif: "anchor", pieces: ["n"] } },
    curse(2, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "n" || !mySquares(api.board, api.me).some((s) => cheb(s, m.to) <= 1),
      ),
    ),
  ),
  H3(
    { id: "hx4_loyal_hound", name: "Loyal Hound", description: "A spectral hound sits directly in front of their king (on the square toward your side) and follows him for 3 of your opponent's turns: they cannot stop on that square.", flavor: "Good boy. Terrible omen.", icon: "Dog", fx: { motif: "blindfold" } },
    {
      kind: "instant",
      init: (inst, api) => {
        inst.state.turns = 3;
        const k = oppKing(api);
        if (k == null) {
          inst.spent = true;
          return;
        }
        const front = k + (api.opp === "w" ? 8 : -8);
        if (front >= 0 && front <= 63) {
          addEffect(api, { kind: "barred", squares: [front], against: api.opp, turns: 1 });
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 1) {
          const k = oppKing(api);
          if (k != null) {
            const front = k + (api.opp === "w" ? 8 : -8);
            if (front >= 0 && front <= 63) {
              addEffect(api, { kind: "barred", squares: [front], against: api.opp, turns: 2 });
            }
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `the hound follows, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_restless_blades", name: "Restless Blades", description: "For your opponent's next 4 turns, their swords demand rhythm: if their previous move was quiet and a capture is available, they must capture.", flavor: "A blade left dry too long starts making decisions.", icon: "Sword", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.quiet = false;
      },
      filterOpponentMoves: (moves, inst) => {
        if (!inst.state.quiet || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const caps = moves.filter((m) => m.captured);
        return caps.length > 0 ? caps : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.quiet = !move.captured;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_wet_powder", name: "Wet Powder", description: "For your opponent's next 3 turns, their rooks may not capture along files: straight ahead kills misfire, only sideways captures along ranks work.", flavor: "The barrels face the rain. The rain wins.", icon: "CloudRain", fx: { motif: "muzzle", pieces: ["r"] } },
    curse(3, (moves) =>
      moves.filter((m) => m.piece !== "r" || !m.captured || RANK(m.from) === RANK(m.to)),
    ),
  ),
  H3(
    { id: "hx4_jam_on_the_row", name: "Jam on the Row", description: "Pick any square: every enemy piece on that rank (never the king) is stuck in spilled jam and frozen for 1 of their turns.", flavor: "The whole row is sticky and nobody is confessing.", icon: "Cherry", fx: { motif: "jail" } },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick any square on the rank to jam", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        for (const s of mySquares(api.board, api.opp)) {
          if (RANK(s) === RANK(sq)) freezeNow(api, s, 1, "honey");
        }
      },
    ),
  ),
  H3(
    { id: "hx4_no_sidling", name: "No Sidling", description: "For your opponent's next 3 turns, purely horizontal moves are forbidden: every move must change rank. Their king is exempt.", flavor: "Approach or retreat. The crab act fools no one.", icon: "MoveVertical", fx: { motif: "anchor", pieces: "all" } },
    curse(3, (moves) => moves.filter((m) => m.piece === "k" || RANK(m.from) !== RANK(m.to))),
  ),
  H3(
    { id: "hx4_know_your_place", name: "Know Your Place", description: "For your opponent's next 4 turns, their knights and bishops may not capture rooks or queens. Rank has its privileges.", flavor: "File a complaint with the heralds, corporal.", icon: "Scale", fx: { motif: "muzzle", pieces: ["n", "b"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "n" && m.piece !== "b") return true;
        const c = capSq(m);
        if (c == null) return true;
        const t = api.board.pieces[c]?.type;
        return t !== "r" && t !== "q";
      }),
    ),
  ),
  H3(
    { id: "hx4_borrowed_ladder", name: "Borrowed Ladder", description: "For your opponent's next 4 turns, their bishops may not move backward toward their own back rank.", flavor: "Ladders go up. Ask anyone.", icon: "ArrowUp", fx: { motif: "anchor", pieces: ["b"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => m.piece !== "b" || relRank(api.opp, m.to) >= relRank(api.opp, m.from)),
    ),
  ),
  H3(
    { id: "hx4_shifting_floor", name: "Shifting Floor", description: "For your opponent's next 3 turns, none of their pieces may end a move on the rank your king stands on. The floor there will not hold them. Their king is exempt.", flavor: "The architect owed the crown a favor.", icon: "Rows3", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = myKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || RANK(m.to) !== RANK(k));
    }),
  ),
  H3(
    { id: "hx4_the_quarrel", name: "The Quarrel", description: "The royal couple is not speaking: for your opponent's next 4 turns, their queen may not end a move adjacent to their king.", flavor: "The argument was about curtains. It is always curtains.", icon: "HeartCrack", fx: { motif: "anchor", pieces: ["q"] } },
    curse(4, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece !== "q" || cheb(m.to, k) > 1);
    }),
  ),
  H3(
    { id: "hx4_soot_fall", name: "Soot Fall", description: "Soot blankets both long diagonals: for your opponent's next 3 turns, their bishops may not stop on any square of the a1 to h8 or h1 to a8 diagonals.", flavor: "The chimneys of war are terrible neighbors.", icon: "Factory", fx: { motif: "blindfold", pieces: ["b"] } },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "b") return true;
        const f = FILE(m.to);
        const r = RANK(m.to);
        return f !== r && f + r !== 7;
      }),
    ),
  ),
  H3(
    { id: "hx4_fear_of_open_ground", name: "Fear of Open Ground", description: "For your opponent's next 4 turns, their rooks may not stop on a file that holds no pawns of either color. Open ground makes them itch.", flavor: "A tower without walls is just a target.", icon: "Binoculars", fx: { motif: "anchor", pieces: ["r"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "r") return true;
        const f = FILE(m.to);
        for (let r = 0; r < 8; r++) {
          if (api.board.pieces[SQ(f, r)]?.type === "p") return true;
        }
        return false;
      }),
    ),
  ),
  H3(
    { id: "hx4_cobweb_corners", name: "Cobweb Corners", description: "Great webs fill all four corners: for your opponent's next 3 turns, their pieces may not stop on the corner squares or the diagonal squares beside them (b2, g2, b7, g7).", flavor: "Something with eight legs pays the rent there now.", icon: "Webhook", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      barNow(api, [SQ(0, 0), SQ(7, 0), SQ(0, 7), SQ(7, 7), SQ(1, 1), SQ(6, 1), SQ(1, 6), SQ(6, 6)], 3);
    }),
  ),
  H3(
    { id: "hx4_leaking_boats", name: "Leaking Boats", description: "For your opponent's next 4 turns, their pieces standing on the a and h files are too busy bailing water to fight: they cannot capture.", flavor: "The flank fleet is mostly bucket.", icon: "Sailboat", fx: { motif: "muzzle", pieces: "all" } },
    curse(4, (moves) =>
      moves.filter((m) => !m.captured || (FILE(m.from) !== 0 && FILE(m.from) !== 7)),
    ),
  ),
  H3(
    { id: "hx4_stunned_grief", name: "Stunned Grief", description: "For your opponent's next 4 turns, grief slows their revenge: after you capture one of their pieces, they may not recapture on that square on their very next turn.", flavor: "Stand there a moment. Then do something rash.", icon: "HeartOff", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.grief = null;
      },
      filterOpponentMoves: (moves, inst) => {
        const g = inst.state.grief as Square | null | undefined;
        if (g == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => capSq(m) !== g);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && move.captured) {
          inst.state.grief = capSq(move);
          return;
        }
        if (move.color === api.opp) {
          inst.state.grief = null;
          tickTurns(inst, move, api.opp);
        }
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H3(
    { id: "hx4_circling_vultures", name: "Circling Vultures", description: "For your opponent's next 3 turns, any piece of theirs with no friendly piece adjacent to it is watched too closely to fight: isolated pieces cannot capture.", flavor: "The birds can tell who is alone.", icon: "Bird", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          !m.captured ||
          m.piece === "k" ||
          mySquares(api.board, api.opp).some((s) => s !== m.from && cheb(s, m.from) === 1),
      ),
    ),
  ),
  H3(
    { id: "hx4_soft_shells", name: "Soft Shells", description: "Two of your opponent's pawns, chosen at random, molt into walnuts for 2 of their turns: one square shuffles only.", flavor: "Between armors, everything is tender.", icon: "Shell", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp, "p");
      for (const sq of drawRandom(api, pool, 2)) nutNow(api, sq, 2);
    }),
  ),
  H3(
    { id: "hx4_caught_mid_stride", name: "Caught Mid Stride", description: "Time hiccups: the piece your opponent moved on their last turn is frozen for 1 of their turns, exactly where it stands. Kings are never caught.", flavor: "The world blinked and one soldier forgot to.", icon: "Camera", fx: { motif: "jail" } },
    instant((_inst, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          freezeNow(api, hist[i].to, 1, "stun");
          return;
        }
      }
    }),
  ),
  H3(
    { id: "hx4_rusty_visor", name: "Rusty Visor", description: "For your opponent's next 3 turns, their visors stick shut: no piece may capture an enemy piece more valuable than itself. Capturing the king is always allowed.", flavor: "Swing at what you can see. Which is your own nose.", icon: "EyeOff", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        if (!m.captured || m.captured === "k") return true;
        const c = capSq(m);
        if (c == null) return true;
        const victim = api.board.pieces[c]?.type;
        return victim == null || PIECE_VAL[victim] <= PIECE_VAL[m.piece];
      }),
    ),
  ),
  H3(
    { id: "hx4_will_o_wisps", name: "Will o' Wisps", description: "For your opponent's next 3 turns, wisp lights dance through their camp: each of their turns, one random empty square in their half becomes briefly impassable to them.", flavor: "Follow the light, lose the war.", icon: "Sparkles", fx: { motif: "blindfold" } },
    onTheirMove(3, (_move, api) => {
      const pool = emptySquares(api.board, (sq) => relRank(api.opp, sq) <= 4);
      for (const sq of drawRandom(api, pool, 1)) {
        addEffect(api, { kind: "barred", squares: [sq], against: api.opp, turns: 2 });
      }
    }),
  ),
  H3(
    { id: "hx4_court_gossip", name: "Court Gossip", description: "For your opponent's next 2 turns, none of their pieces may end a move adjacent to your queen: everyone is terrified of being mentioned.", flavor: "She keeps a list. Everyone has seen the list.", icon: "MessageCircle", fx: { motif: "anchor", pieces: "all" } },
    curse(2, (moves, api) => {
      const queens = mySquares(api.board, api.me, "q");
      if (queens.length === 0) return moves;
      return moves.filter((m) => m.piece === "k" || !queens.some((q) => cheb(m.to, q) <= 1));
    }),
  ),
];

// ------------------------------- TIER 4 ------------------------------------
// Firm curses: dynamic zones, mirror rules, first attack-aware constraints.

/** Board quadrant index (0..3) for Broken Compass. */
const quadOf = (sq: Square) => (FILE(sq) >= 4 ? 1 : 0) + (RANK(sq) >= 4 ? 2 : 0);

const T4: Buff[] = [
  H4(
    { id: "hx4_bounty_posted", name: "Bounty Posted", description: "Post a bounty for 6 of your opponent's turns: whenever YOU capture one of their pieces in that window, panic spreads and another of their pieces, chosen at random, is frozen for 1 of their turns.", flavor: "The poster does not even name a crime.", icon: "ScrollText", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me && turnsLeft(inst) > 0 && move.captured && move.captured !== "k") {
          const pool = mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type !== "k",
          );
          for (const sq of drawRandom(api, pool, 1)) freezeNow(api, sq, 1, "stun");
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H4(
    { id: "hx4_sagging_shelves", name: "Sagging Shelves", description: "Their undeveloped officers are shelved: every enemy knight and bishop still standing on its own back rank is frozen for 2 of their turns.", flavor: "Use it or dust it.", icon: "Library", fx: { motif: "jail", pieces: ["n", "b"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if ((t === "n" || t === "b") && relRank(api.opp, sq) === 1) freezeNow(api, sq, 2, "cement");
      }
    }),
  ),
  H4(
    { id: "hx4_lockstep", name: "Lockstep", description: "For your opponent's next 3 turns, every move they make must cover exactly the same distance as the move you made just before it. Their king is exempt, and if nothing matches they move freely.", flavor: "Left. Left. Left, curse you.", icon: "Footprints", fx: { motif: "slow", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.me) {
          const d = Math.max(
            Math.abs(FILE(hist[i].to) - FILE(hist[i].from)),
            Math.abs(RANK(hist[i].to) - RANK(hist[i].from)),
          );
          return moves.filter((m) => m.piece === "k" || moveDist(m) === d);
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_rogue_river", name: "Rogue River", description: "A river jumps its banks along one random file: your opponent's pieces cannot stop anywhere on that file for their next 2 turns.", flavor: "Rivers keep no treaties.", icon: "Waves", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const f = api.rng.int(8);
      barNow(api, Array.from({ length: 8 }, (_, r) => SQ(f, r)), 2);
    }),
  ),
  H4(
    { id: "hx4_reined_back", name: "Reined Back", description: "For your opponent's next 3 turns, their knights may not leap toward your side of the board: sideways and backward leaps only.", flavor: "The reins are held by someone very cautious and very far away.", icon: "ArrowDown", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves, api) =>
      moves.filter((m) => m.piece !== "n" || relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
  ),
  H4(
    { id: "hx4_broken_compass", name: "Broken Compass", description: "For your opponent's next 3 turns, every move must end in a different quadrant of the board than it started in. The needle spins and nobody trusts a short walk. Their king is exempt.", flavor: "North is a matter of opinion now.", icon: "Compass", fx: { motif: "anchor", pieces: "all" } },
    curse(3, (moves) => moves.filter((m) => m.piece === "k" || quadOf(m.from) !== quadOf(m.to))),
  ),
  H4(
    { id: "hx4_tin_soldiers", name: "Tin Soldiers", description: "Their knights and bishops are recast as toy soldiers: wooden for 6 of their turns, and stiff jointed for the first 2, during which they may move at most 2 squares.", flavor: "Painted smiles, glued elbows.", icon: "ToyBrick", fx: { motif: "anchor", pieces: ["n", "b"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t === "n" || t === "b") dressUp(api, sq, "wooden", 6);
        }
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) => (m.piece !== "n" && m.piece !== "b") || moveDist(m) <= 2,
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H4(
    { id: "hx4_smoke_line", name: "Smoke Line", description: "Signal smoke streams from your king's tower: for your opponent's next 3 turns, none of their pieces may end a move on a diagonal your king stands on. Their king is exempt.", flavor: "Where there is smoke, there is a very specific no.", icon: "Cloudy", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = myKing(api);
      if (k == null) return moves;
      return moves.filter(
        (m) =>
          m.piece === "k" ||
          Math.abs(FILE(m.to) - FILE(k)) !== Math.abs(RANK(m.to) - RANK(k)),
      );
    }),
  ),
  H4(
    { id: "hx4_crime_scene", name: "Crime Scene", description: "For your opponent's next 4 turns, every capture they make gets roped off: the square where the capture happened is sealed against them for 2 of their turns after the deed.", flavor: "Nothing to see here. Legally, nothing to stand on either.", icon: "SearchX", fx: { motif: "blindfold", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      const c = capSq(move);
      if (c != null) addEffect(api, { kind: "barred", squares: [c], against: api.opp, turns: 3 });
    }),
  ),
  H4(
    { id: "hx4_slack_bowstrings", name: "Slack Bowstrings", description: "For your opponent's next 3 turns, the piece they moved on their previous turn is too winded to fight: it cannot capture this turn.", flavor: "Draw, breathe, loose. They keep skipping the middle one.", icon: "Target", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const last = hist[i].to;
          return moves.filter((m) => !m.captured || m.from !== last);
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_ferrymans_coin", name: "Ferryman's Coin", description: "For your opponent's next 4 turns, crossing into your half costs the road home: when a piece of theirs crosses the midline, the square it left is sealed against them for 3 of their turns.", flavor: "One coin, one way.", icon: "Coins", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (relRank(api.opp, move.from) <= 4 && relRank(api.opp, move.to) >= 5) {
        addEffect(api, { kind: "barred", squares: [move.from], against: api.opp, turns: 4 });
      }
    }),
  ),
  H4(
    { id: "hx4_dead_mans_boots", name: "Dead Man's Boots", description: "For your opponent's next 3 turns, their pieces refuse to stand where anyone has died: they may not end a move on any square where a piece has been captured this game. Their king is exempt.", flavor: "The board remembers every square that went quiet.", icon: "Skull", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) => {
      const graves = new Set<Square>();
      for (const h of api.board.history) {
        if (h.captured) graves.add(h.capturedSquare ?? h.to);
      }
      if (graves.size === 0) return moves;
      return moves.filter((m) => m.piece === "k" || !graves.has(m.to));
    }),
  ),
  H4(
    { id: "hx4_no_easy_pickings", name: "No Easy Pickings", description: "A code of honor is imposed for your opponent's next 4 turns: they may only capture your pieces that are defended by another of your pieces. Undefended stragglers are off limits.", flavor: "There is no glory in an unguarded purse.", icon: "Handshake", fx: { motif: "muzzle", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        if (c == null) return true;
        if (api.board.pieces[c]?.type === "k") return true;
        return mySquares(api.board, api.me).some((s) => s !== c && attacks(api, s, c));
      }),
    ),
  ),
  H4(
    { id: "hx4_iron_quota", name: "Iron Quota", description: "For your opponent's next 6 turns, the royal smithy only stocks battlements: any pawn they promote must become a rook.", flavor: "The queen molds are being cleaned. Indefinitely.", icon: "Anvil", fx: { motif: "slow", pieces: ["p"] } },
    curse(6, (moves) => moves.filter((m) => !m.promotion || m.promotion === "r")),
  ),
  H4(
    { id: "hx4_clay_hooves", name: "Clay Hooves", description: "Every enemy knight that has left its starting square hardens into clay and is frozen for 2 of their turns. Knights still at home are spared.", flavor: "Adventure has a firing temperature.", icon: "Amphora", fx: { motif: "jail", pieces: ["n"] } },
    instant((_inst, api) => {
      const home =
        api.opp === "w" ? [SQ(1, 0), SQ(6, 0)] : [SQ(1, 7), SQ(6, 7)];
      for (const sq of mySquares(api.board, api.opp, "n")) {
        if (!home.includes(sq)) freezeNow(api, sq, 2, "cement");
      }
    }),
  ),
  H4(
    { id: "hx4_ashen_bread", name: "Ashen Bread", description: "For your opponent's next 4 turns, killing the little ones curdles the stomach: any piece of theirs that captures one of your pawns is frozen for 2 of their turns.", flavor: "It tastes like the field it came from.", icon: "Wheat", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (move.captured === "p" && move.piece !== "k") sting(api, move.to, 2, "tar");
    }),
  ),
  H4(
    { id: "hx4_food_taster", name: "The Food Taster", description: "Paranoia grips the throne: for your opponent's next 3 turns, their queen may not end a move on any square one of your pieces attacks.", flavor: "Every square is poisoned until proven otherwise.", icon: "Wine", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "q" || !mySquares(api.board, api.me).some((s) => attacks(api, s, m.to)),
      ),
    ),
  ),
  H4(
    { id: "hx4_understudy_rule", name: "Understudy Rule", description: "For your opponent's next 4 turns, no two officer moves in a row: after moving a knight, bishop, rook or queen, their next move must be a pawn or king move.", flavor: "The stars rest. The chorus sweats.", icon: "Drama", fx: { motif: "slow", pieces: ["n", "b", "r", "q"] } },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const wasOfficer = ["n", "b", "r", "q"].includes(hist[i].piece);
          return wasOfficer ? moves.filter((m) => m.piece === "p" || m.piece === "k") : moves;
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_cracked_lens", name: "Cracked Lens", description: "For your opponent's next 3 turns, their bishops cannot judge distance: they may only capture within 2 squares.", flavor: "Faith moves mountains. Optics hit them.", icon: "Glasses", fx: { motif: "muzzle", pieces: ["b"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "b" || !m.captured || moveDist(m) <= 2)),
  ),
  H4(
    { id: "hx4_haunted_gallery", name: "Haunted Gallery", description: "Ghosts walk the great dark diagonal (a1 to h8): every enemy piece standing on it is frozen in dread for 1 of their turns. Their king is spared.", flavor: "The portraits follow you. The floor holds you.", icon: "Ghost", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      for (let i = 0; i < 8; i++) {
        const sq = SQ(i, i);
        const p = api.board.pieces[sq];
        if (p && p.color === api.opp) freezeNow(api, sq, 1, "sleep");
      }
    }),
  ),
  H4(
    { id: "hx4_prowlers_bell", name: "Prowler's Bell", description: "A bell is tied to every gate in your half: for your opponent's next 4 turns, their pieces may not end a move on an EMPTY square in your half. They may enter only by capturing. Their king is exempt.", flavor: "Come in swinging or do not come in.", icon: "BellRing", fx: { motif: "blindfold", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter((m) => m.piece === "k" || m.captured != null || relRank(api.opp, m.to) <= 4),
    ),
  ),
  H4(
    { id: "hx4_bell_jar", name: "Bell Jar", description: "Drop a bell jar over one enemy piece you target: it and every enemy piece adjacent to it become walnuts for 1 of their turns. Kings never fit under glass.", flavor: "Science requires the whole cluster.", icon: "FlaskRound", fx: { motif: "anchor" } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the center of the jar", squares: mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k") },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (const sq of mySquares(api.board, api.opp)) {
          if (cheb(sq, c) <= 1) nutNow(api, sq, 1);
        }
      },
    ),
  ),
  H4(
    { id: "hx4_night_ledger", name: "Night Ledger", description: "For your opponent's next 2 turns, their rooks and queen answer to the accountants: they may only move if the move is a capture. Quiet heavy moves are struck from the ledger.", flavor: "Movement without acquisition is a cost center.", icon: "BookOpen", fx: { motif: "jail", pieces: ["r", "q"] } },
    curse(2, (moves) => moves.filter((m) => (m.piece !== "r" && m.piece !== "q") || m.captured != null)),
  ),
  H4(
    { id: "hx4_no_doubling", name: "No Doubling", description: "For your opponent's next 4 turns, their pawns refuse to share a file: a pawn may not capture onto a file that already holds another of their pawns.", flavor: "Union rules. One pawn per lane.", icon: "Columns2", fx: { motif: "muzzle", pieces: ["p"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "p" || !m.captured || FILE(m.from) === FILE(m.to)) return true;
        const f = FILE(m.to);
        for (let r = 0; r < 8; r++) {
          const sq = SQ(f, r);
          if (sq !== m.from) {
            const p = api.board.pieces[sq];
            if (p && p.color === api.opp && p.type === "p") return false;
          }
        }
        return true;
      }),
    ),
  ),
  H4(
    { id: "hx4_wilted_garland", name: "Wilted Garland", description: "Their queen is crowned with a nesting doll shell for 6 of their turns, and the humiliation keeps her at arm's length: for their next 3 turns she may not end a move within 2 squares of your king.", flavor: "There is a smaller queen inside. And a smaller grudge.", icon: "Flower", fx: { motif: "anchor", pieces: ["q"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        for (const sq of mySquares(api.board, api.opp, "q")) dressUp(api, sq, "matryoshka", 6);
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const k = myKing(api);
        if (k == null) return moves;
        const kept = moves.filter((m) => m.piece !== "q" || cheb(m.to, k) > 2);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H4(
    { id: "hx4_censors_ink", name: "Censor's Ink", description: "For your opponent's next 4 turns, the censor blacks out your latest position: they may not end a move on the file where your last moved piece stands. Their king is exempt.", flavor: "That column has been redacted for their protection.", icon: "PenTool", fx: { motif: "blindfold", pieces: "all" } },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.me) {
          const f = FILE(hist[i].to);
          return moves.filter((m) => m.piece === "k" || FILE(m.to) !== f);
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_thistle_crown", name: "Thistle Crown", description: "For your opponent's next 4 turns, when your pieces give check, only their king may answer: they cannot block the check or capture the checker with another piece. The king must move itself.", flavor: "A crown of thistles concentrates the mind wonderfully.", icon: "Crown", fx: { motif: "slow" } },
    curse(4, (moves, api) => {
      if (!isInCheck(api.board, api.opp)) return moves;
      return moves.filter((m) => m.piece === "k");
    }),
  ),
  H4(
    { id: "hx4_tangled_marionettes", name: "Tangled Marionettes", description: "For your opponent's next 3 turns, the strings cross: they may not move any piece standing adjacent to the piece they moved last turn. That piece itself may move on. Their king is exempt.", flavor: "Pull one string, three puppets bow.", icon: "Spline", fx: { motif: "slow", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const L = hist[i].to;
          return moves.filter((m) => m.piece === "k" || m.from === L || cheb(m.from, L) > 1);
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_no_return", name: "No Return", description: "For your opponent's next 4 turns, the border runs one way: pieces of theirs standing in your half may not move back across the midline into their own half.", flavor: "The gate reads ENTRANCE on both sides. From their side.", icon: "LogIn", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece === "k" || relRank(api.opp, m.from) <= 4 || relRank(api.opp, m.to) >= 5,
      ),
    ),
  ),
  H4(
    { id: "hx4_candle_curfew", name: "Candle Curfew", description: "The candles are rationed, and everyone knows the schedule: on the 5th and 6th of your opponent's next 6 turns, they may only move a pawn or their king.", flavor: "Wax today, war tomorrow.", icon: "Lamp", fx: { motif: "slow", pieces: ["n", "b", "r", "q"] } },
    cadenceCurse(6, (e) => e >= 4, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),
  H4(
    { id: "hx4_feuding_towers", name: "Feuding Towers", description: "Their rooks are not speaking to each other: for your opponent's next 4 turns, a rook may not end a move on the same rank or file as another of their rooks.", flavor: "It began over a bishop. It always begins over a bishop.", icon: "Castle", fx: { motif: "anchor", pieces: ["r"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "r") return true;
        return !mySquares(api.board, api.opp, "r").some(
          (s) => s !== m.from && (FILE(s) === FILE(m.to) || RANK(s) === RANK(m.to)),
        );
      }),
    ),
  ),
  H4(
    { id: "hx4_solstice_shadow", name: "Solstice Shadow", description: "For your opponent's next 3 turns, the solstice shadow falls on their king's square color: pieces of theirs standing on that color cannot capture.", flavor: "Half the world is in the king's shadow today.", icon: "SunDim", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      const shade = sqShade(k);
      return moves.filter((m) => m.piece === "k" || !m.captured || sqShade(m.from) !== shade);
    }),
  ),
  H4(
    { id: "hx4_broken_oars", name: "Broken Oars", description: "For your opponent's next 3 turns, no move may travel in the same direction as their previous move. The crew cannot row the same stroke twice. Their king is exempt.", flavor: "Port! No, the OTHER port!", icon: "Ship", fx: { motif: "slow", pieces: "all" } },
    curse(3, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const df = Math.sign(FILE(hist[i].to) - FILE(hist[i].from));
          const dr = Math.sign(RANK(hist[i].to) - RANK(hist[i].from));
          return moves.filter(
            (m) =>
              m.piece === "k" ||
              Math.sign(FILE(m.to) - FILE(m.from)) !== df ||
              Math.sign(RANK(m.to) - RANK(m.from)) !== dr,
          );
        }
      }
      return moves;
    }),
  ),
  H4(
    { id: "hx4_waste_not", name: "Waste Not", description: "Thrift is enforced for your opponent's next 3 turns: when they capture, they must use the least valuable piece that can capture that turn. Quiet moves stay free.", flavor: "Why send a queen when a pawn holds a grudge for less?", icon: "PiggyBank", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves) => {
      const caps = moves.filter((m) => m.captured);
      if (caps.length === 0) return moves;
      const min = Math.min(...caps.map((m) => PIECE_VAL[m.piece]));
      return moves.filter((m) => !m.captured || PIECE_VAL[m.piece] <= min);
    }),
  ),
  H4(
    { id: "hx4_moth_plague", name: "Moth Plague", description: "A plague of very judgemental pigeons descends: 3 of your opponent's pieces, chosen at random (never the king), are dressed as pigeons for 6 of their turns and stunned for 1.", flavor: "They coo in disapproval. Constantly.", icon: "Bird", fx: { motif: "jail" } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      for (const sq of drawRandom(api, pool, 3)) {
        dressUp(api, sq, "pigeon", 6);
        freezeNow(api, sq, 1, "stun");
      }
    }),
  ),
  H4(
    { id: "hx4_ironglass_mirror", name: "Ironglass Mirror", description: "Your threats harden into glass: for your opponent's next 2 turns, any piece of theirs standing on a square one of your pieces attacks cannot move. Their king is exempt.", flavor: "Held by nothing but being seen.", icon: "Scan", fx: { motif: "jail", pieces: "all" } },
    curse(2, (moves, api) =>
      moves.filter(
        (m) => m.piece === "k" || !mySquares(api.board, api.me).some((s) => attacks(api, s, m.from)),
      ),
    ),
  ),
  H4(
    { id: "hx4_second_frost", name: "Second Frost", description: "The cold doubles down: every freeze and every walnut currently gripping your opponent's pieces lasts 1 of their turns longer.", flavor: "Just when the thaw was in sight.", icon: "Snowflake", fx: { motif: "slow" } },
    instant((_inst, api) => {
      for (const e of api.bs.effects) {
        if ((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.opp && e.turns > 0) {
          e.turns += 1;
        }
      }
    }),
  ),
  H4(
    { id: "hx4_coronation_bill", name: "Coronation Bill", description: "For your opponent's next 6 turns, promotions come with an itemized invoice: the first pawn they promote costs them their following turn, skipped outright while they settle the bill.", flavor: "Line 14: one crown, ceremonial, non refundable.", icon: "ReceiptText", fx: { motif: "slow", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.promotion) {
          api.bs.skips[api.opp] += 1;
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];

export const HEX_WAVE4: Buff[] = [...T1, ...T2, ...T3, ...T4, ...HEX_WAVE4B];
