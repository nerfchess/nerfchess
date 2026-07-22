// Hex wave 4, upper band (tiers 5-8). Imported ONLY by ./wave4.ts, which
// concatenates these into HEX_WAVE4. Also exports the small helper kit the
// whole wave shares (trigger/cadence factories, guarded stings) so wave4.ts
// does not duplicate it. Same authoring rails as tier1-8/wave2/wave3:
//   - every opponent-move filter keeps a non-empty fallback (curse() guards);
//   - kings are never frozen, walnutted or removed;
//   - api.rng only inside init / effect / onMovePlayed;
//   - effects added DURING the victim's own move use turns = N + 1 (the shared
//     post-move pass ticks them once immediately), effects added on the
//     caster's turn use turns = N.

import type { FreezeSkin, CosmeticSkin } from "../../buff";
import type { Buff, BuffApi, BuffInstance, Move, PieceType, Square } from "./shared";
import type { Mech } from "./shared";
import {
  activated,
  addEffect,
  blockDrafts,
  curse,
  emptySquares,
  freezeAllEnemies,
  freezeTarget,
  instant,
  isInCheck,
  mySquares,
  nullifyDrafts,
  relRank,
  skipOpponent,
  suppressDraftCards,
  tickTurns,
  tierHexes,
  turnsLeft,
  walnutAll,
  walnutTarget,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H5 = tierHexes(5);
const H6 = tierHexes(6);
const H7 = tierHexes(7);
const H8 = tierHexes(8);

// ---------------------------------------------------------------------------
// Wave-shared helpers (exported for wave4.ts).
// ---------------------------------------------------------------------------

export const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));
export const moveDist = (m: Move) => cheb(m.from, m.to);
export const sqShade = (sq: Square) => (FILE(sq) + RANK(sq)) & 1; // 0 dark, 1 light
export const capSq = (m: Move): Square | null =>
  m.capturedSquare ?? (m.captured ? m.to : null);

/** The victim's king square (null in degenerate boards). */
export function oppKing(api: BuffApi): Square | null {
  const k = mySquares(api.board, api.opp, "k");
  return k.length ? k[0] : null;
}
/** The caster's king square. */
export function myKing(api: BuffApi): Square | null {
  const k = mySquares(api.board, api.me, "k");
  return k.length ? k[0] : null;
}

/** Freeze a victim piece from INSIDE onMovePlayed (their move is about to be
 * ticked once), biting for exactly `n` of their turns. King-guarded. */
export function sting(api: BuffApi, sq: Square, n: number, skin: FreezeSkin) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: n + 1, skin });
}
/** Walnut a victim piece from inside onMovePlayed for exactly `n`. */
export function nutSting(api: BuffApi, sq: Square, n: number) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: n + 1 });
}
/** Freeze a victim piece on the CASTER'S turn (instant/activated effect). */
export function freezeNow(api: BuffApi, sq: Square, n: number, skin: FreezeSkin) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: n, skin });
}
/** Walnut a victim piece on the caster's turn. */
export function nutNow(api: BuffApi, sq: Square, n: number) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: n });
}
/** Pin a pure-visual cosmetic on a victim piece. */
export function dressUp(
  api: BuffApi,
  sq: Square,
  skin: CosmeticSkin,
  turns: number,
  label?: string,
) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp) return;
  addEffect(api, { kind: "cosmetic", sq, owner: api.opp, turns, skin, ...(label ? { label } : {}) });
}
/** Bar squares against the victim, cast on the caster's turn. */
export function barNow(api: BuffApi, squares: Square[], turns: number) {
  if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns });
}
export function fileSquares(f: number): Square[] {
  return Array.from({ length: 8 }, (_, r) => SQ(f, r));
}
export function rankSquares(r: number): Square[] {
  return Array.from({ length: 8 }, (_, f) => SQ(f, r));
}
export const CENTER4: Square[] = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];

/** Timed passive that watches the victim's moves for `turns` of their turns.
 * `fire` runs BEFORE the tick, so effects it adds use the +1 convention
 * (sting/nutSting already do). */
export function onTheirMove(
  turns: number,
  fire: (move: Move, api: BuffApi, inst: BuffInstance) => void,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && turnsLeft(inst) > 0) fire(move, api, inst);
      tickTurns(inst, move, api.opp);
    },
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Cadence curse: a timed opponent filter that only bites on the turns where
 * `activeOn(elapsed)` is true (elapsed = 0 on their first cursed turn). */
export function cadenceCurse(
  turns: number,
  activeOn: (elapsed: number) => boolean,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    filterOpponentMoves: (moves, inst, api) => {
      const left = turnsLeft(inst);
      if (left <= 0 || moves.length === 0) return moves;
      if (!activeOn(turns - left)) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Squares the caster's pawns currently attack (their capture diagonals). */
export function myPawnThreats(api: BuffApi): Set<Square> {
  const out = new Set<Square>();
  const dr = api.me === "w" ? 1 : -1;
  for (const sq of mySquares(api.board, api.me, "p")) {
    for (const df of [-1, 1]) {
      const f = FILE(sq) + df;
      const r = RANK(sq) + dr;
      if (inBoard(f, r)) out.add(SQ(f, r));
    }
  }
  return out;
}

/** Pure-geometry attack test (mirrors overhaul/shared.ts, kept local so the
 * hex barrel stays self-contained). */
export function attacks(api: BuffApi, from: Square, target: Square): boolean {
  const board = api.board;
  const p = board.pieces[from];
  if (!p || from === target) return false;
  const df = FILE(target) - FILE(from);
  const dr = RANK(target) - RANK(from);
  const adf = Math.abs(df);
  const adr = Math.abs(dr);
  switch (p.type) {
    case "p": {
      const dir = p.color === "w" ? 1 : -1;
      return dr === dir && adf === 1;
    }
    case "n":
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case "k":
      return adf <= 1 && adr <= 1;
    case "b":
      if (adf !== adr) return false;
      break;
    case "r":
      if (df !== 0 && dr !== 0) return false;
      break;
    case "q":
      if (adf !== adr && df !== 0 && dr !== 0) return false;
      break;
  }
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  let f = FILE(from) + sf;
  let r = RANK(from) + sr;
  while (inBoard(f, r) && SQ(f, r) !== target) {
    if (board.pieces[SQ(f, r)]) return false;
    f += sf;
    r += sr;
  }
  return true;
}

/** Piece rough value for "strongest piece" picks. */
export const PIECE_VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 4, q: 5, k: 100 };

/** The victim's non-king squares, strongest first, ties by lowest square. */
export function victimByValue(api: BuffApi): Square[] {
  return mySquares(api.board, api.opp)
    .filter((sq) => api.board.pieces[sq]!.type !== "k")
    .sort((a, b) => {
      const dv = PIECE_VAL[api.board.pieces[b]!.type] - PIECE_VAL[api.board.pieces[a]!.type];
      return dv !== 0 ? dv : a - b;
    });
}

/** Draw `n` distinct random entries from `pool` via api.rng (effect paths only). */
export function drawRandom(api: BuffApi, pool: Square[], n: number): Square[] {
  const rest = pool.slice();
  const out: Square[] = [];
  while (rest.length > 0 && out.length < n) {
    out.push(rest.splice(api.rng.int(rest.length), 1)[0]);
  }
  return out;
}

// ------------------------------- TIER 5 ------------------------------------
// Solid curses: multi-turn class locks, first zone seals, telegraphed traps.

const T5: Buff[] = [
  H5(
    { id: "hx4_glacier_gate", name: "Glacier Gate", description: "A wall of ice fills the four center squares: your opponent's pieces cannot stop on d4, e4, d5 or e5 for their next 2 turns.", flavor: "The crossroads froze overnight.", icon: "Snowflake", fx: { motif: "blindfold" } },
    instant((_inst, api) => barNow(api, CENTER4, 2)),
  ),
  H5(
    { id: "hx4_honey_spill", name: "Honey Spill", description: "A barrel of honey bursts over the stables: all of your opponent's knights are stuck fast and cannot move for 2 of their turns.", flavor: "Sweetest trap ever set.", icon: "Droplet", fx: { motif: "jail", pieces: ["n"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "n")) freezeNow(api, sq, 2, "honey");
    }),
  ),
  H5(
    { id: "hx4_drawn_curtain", name: "Drawn Curtain", description: "Seal one rank of your choice for your opponent's next turn: none of their pieces may stop on it or cross it. Your pieces pass freely.", flavor: "The stage is closed between acts.", icon: "Theater", fx: { motif: "blindfold" } },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick any square on the rank to seal", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) barNow(api, rankSquares(RANK(picks[0].square)), 1);
      },
    ),
  ),
  H5(
    { id: "hx4_leaden_boots", name: "Leaden Boots", description: "For your opponent's next 4 turns, none of their pieces may move more than 2 squares. Their king is exempt.", flavor: "Every step rings like an anvil.", icon: "Footprints", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves) => moves.filter((m) => m.piece === "k" || moveDist(m) <= 2)),
  ),
  H5(
    { id: "hx4_tithe_of_blood", name: "Tithe of Blood", description: "For your opponent's next 4 turns, any piece of theirs that captures is frozen for 1 of their turns immediately after the kill. Kings never freeze.", flavor: "The altar takes its cut of every kill.", icon: "Droplets", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (move.captured && move.piece !== "k") sting(api, move.to, 1, "rust");
    }),
  ),
  H5(
    { id: "hx4_river_watch", name: "River Watch", description: "For your opponent's next 3 turns, their rooks may not cross the midline into your half of the board.", flavor: "The ferry does not take siege towers.", icon: "Waves", fx: { motif: "anchor", pieces: ["r"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "r" || relRank(api.opp, m.to) <= 4)),
  ),
  H5(
    { id: "hx4_sandstorm", name: "Sandstorm", description: "Grit chokes every sightline: for your opponent's next 3 turns, their bishops, rooks and queen may slide at most 3 squares.", flavor: "You cannot aim at what you cannot see.", icon: "Wind", fx: { motif: "anchor", pieces: ["b", "r", "q"] } },
    curse(3, (moves) => moves.filter((m) => !["b", "r", "q"].includes(m.piece) || moveDist(m) <= 3)),
  ),
  H5(
    { id: "hx4_royal_escort", name: "Royal Escort", description: "For your opponent's next 4 turns, their queen may not end a move more than 2 squares from their king. She is chained to the escort detail.", flavor: "Her Majesty does not travel without the guard.", icon: "Link", fx: { motif: "anchor", pieces: ["q"] } },
    curse(4, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece !== "q" || cheb(m.to, k) <= 2);
    }),
  ),
  H5(
    { id: "hx4_night_watch_rota", name: "Night Watch Rota", description: "For your opponent's next 4 turns, their knights and bishops are on watch duty every other turn (the 1st and 3rd) and cannot move on those turns.", flavor: "Half the officers are always asleep on the wall.", icon: "Moon", fx: { motif: "slow", pieces: ["n", "b"] } },
    cadenceCurse(4, (e) => e % 2 === 0, (moves) => moves.filter((m) => m.piece !== "n" && m.piece !== "b")),
  ),
  H5(
    { id: "hx4_tar_pits", name: "Tar Pits", description: "Choose 3 empty squares: they become bubbling tar for 3 of your opponent's turns, and none of their pieces may stop on them.", flavor: "The ground remembers everything that steps in it.", icon: "CircleDot", fx: { motif: "blindfold" } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : { kind: "square", label: `Choose a tar square (${picks.length + 1}/3)`, squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)) },
      (_inst, api, picks) => {
        barNow(api, picks.map((k) => k.square).filter((s): s is number => s != null), 3);
      },
    ),
  ),
  H5(
    { id: "hx4_walnut_pinch", name: "Walnut Pinch", description: "Your opponent's queen turns into a walnut for 1 of their turns: a heavy nut that can only shuffle one square.", flavor: "Just a taste of the shell.", icon: "Nut", fx: { motif: "anchor", pieces: ["q"] } },
    walnutAll(["q"], 1),
  ),
  H5(
    { id: "hx4_cold_reception", name: "Cold Reception", description: "For your opponent's next 3 turns, any pawn of theirs that enters your half of the board is frozen for 1 of their turns on arrival.", flavor: "No fire, no bread, no welcome.", icon: "ThermometerSnowflake", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(3, (move, api) => {
      if (move.piece === "p" && relRank(api.opp, move.to) >= 5) sting(api, move.to, 1, "ice");
    }),
  ),
  H5(
    { id: "hx4_dead_letter", name: "Dead Letter", description: "Your opponent's next drafted card arrives nullified: they still pick it, but it does nothing.", flavor: "Signed, sealed, and utterly worthless.", icon: "MailX" },
    nullifyDrafts(1),
  ),
  H5(
    { id: "hx4_no_homecoming", name: "No Homecoming", description: "For your opponent's next 4 turns, none of their pieces may stop on their own back rank. Their king is exempt.", flavor: "The doors of the keep are shut from inside.", icon: "DoorClosed", fx: { motif: "blindfold", pieces: "all" } },
    curse(4, (moves, api) => moves.filter((m) => m.piece === "k" || relRank(api.opp, m.to) !== 1)),
  ),
  H5(
    { id: "hx4_undertow", name: "Undertow", description: "For your opponent's next 3 turns, any piece of theirs that moves backward, toward its own back rank, is frozen for 1 of their turns on arrival. Kings never freeze.", flavor: "The current only pulls one way.", icon: "ArrowDownToLine", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(3, (move, api) => {
      if (move.piece !== "k" && relRank(api.opp, move.to) < relRank(api.opp, move.from)) sting(api, move.to, 1, "quicksand");
    }),
  ),
  H5(
    { id: "hx4_change_of_step", name: "Change of Step", description: "For your opponent's next 4 turns, each move they make must use a different piece type than their previous move. Their king is always allowed.", flavor: "The drillmaster forbids repetition.", icon: "Repeat2", fx: { motif: "slow", pieces: "all" } },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const last = hist[i].piece;
          return moves.filter((m) => m.piece === "k" || m.piece !== last);
        }
      }
      return moves;
    }),
  ),
  H5(
    { id: "hx4_frost_heave", name: "Frost Heave", description: "The ground in your half buckles with frost: every enemy pawn currently standing in your half of the board is frozen for 2 of their turns.", flavor: "The invasion is welded to the road.", icon: "Mountain", fx: { motif: "jail", pieces: ["p"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "p")) {
        if (relRank(api.opp, sq) >= 5) freezeNow(api, sq, 2, "ice");
      }
    }),
  ),
  H5(
    { id: "hx4_white_flag_hour", name: "White Flag Hour", description: "A truce is called: your opponent cannot capture anything for their next 2 turns.", flavor: "One hour of peace, signed under protest.", icon: "Flag", fx: { motif: "muzzle", pieces: "all" } },
    curse(2, (moves) => moves.filter((m) => !m.captured)),
  ),
  H5(
    { id: "hx4_high_water", name: "High Water", description: "For your opponent's next 4 turns, their rooks and queen may not enter your half of the board.", flavor: "Heavy wagons wait for the flood to pass.", icon: "CloudRain", fx: { motif: "anchor", pieces: ["r", "q"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => (m.piece !== "r" && m.piece !== "q") || relRank(api.opp, m.to) <= 4),
    ),
  ),
  H5(
    { id: "hx4_gargoyle_perch", name: "Gargoyle Perch", description: "Turn one enemy rook you target into a walnut for 2 of their turns: it can only shuffle one square at a time.", flavor: "Towers make excellent roosts.", icon: "Castle", fx: { motif: "anchor", pieces: ["r"] } },
    walnutTarget(2, ["r"]),
  ),
  H5(
    { id: "hx4_silk_cocoon", name: "Silk Cocoon", description: "Wrap one enemy knight or bishop you target in silk: it is frozen for 3 of their turns.", flavor: "It will emerge exactly the same, only later.", icon: "Bug", fx: { motif: "jail", pieces: ["n", "b"] } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight or bishop to wrap",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) freezeNow(api, picks[0].square, 3, "web");
      },
    ),
  ),
  H5(
    { id: "hx4_quicksand_quarter", name: "Quicksand Quarter", description: "The queenside quarter of your half (files a to d) turns to quicksand: your opponent's pieces may not stop there for their next 3 turns. Their king is exempt.", flavor: "The map says meadow. The meadow disagrees.", icon: "MapPinOff", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => m.piece === "k" || !(FILE(m.to) <= 3 && relRank(api.opp, m.to) >= 5)),
    ),
  ),
  H5(
    { id: "hx4_echo_of_bells", name: "Echo of Bells", description: "For your opponent's next 6 turns, every second turn (the 2nd, 4th and 6th) the bells toll and they may only move a pawn or their king.", flavor: "You cannot plan over that ringing.", icon: "Bell", fx: { motif: "slow", pieces: ["n", "b", "r", "q"] } },
    cadenceCurse(6, (e) => e % 2 === 1, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),
  H5(
    { id: "hx4_grooms_leash", name: "Groom's Leash", description: "For your opponent's next 3 turns, their knights may only land on squares adjacent to another of their own pieces. Stray leaps are forbidden.", flavor: "No horse rides out without a handler.", icon: "Grip", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece !== "n" ||
          mySquares(api.board, api.opp).some((s) => s !== m.from && s !== m.to && cheb(s, m.to) === 1),
      ),
    ),
  ),
  H5(
    { id: "hx4_mitred_blinders", name: "Mitred Blinders", description: "For your opponent's next 4 turns, their bishops may slide at most 2 squares.", flavor: "Faith is no substitute for eyesight.", icon: "EyeOff", fx: { motif: "anchor", pieces: ["b"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "b" || moveDist(m) <= 2)),
  ),
  H5(
    { id: "hx4_court_in_session", name: "Court in Session", description: "For your opponent's next 3 turns, any of their pieces standing adjacent to their own king may not move. The king itself is free to go.", flavor: "Nobody leaves while the king is speaking.", icon: "Gavel", fx: { motif: "jail", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || cheb(m.from, k) > 1);
    }),
  ),
  H5(
    { id: "hx4_ford_crossing", name: "Ford Crossing", description: "For your opponent's next 4 turns, any move that crosses the midline into your half must stop on the first rank of your half. Deeper landings are forbidden. Their king is exempt.", flavor: "Everyone wades. Nobody swims.", icon: "Footprints", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "k" ||
          relRank(api.opp, m.from) >= 5 ||
          relRank(api.opp, m.to) <= 5,
      ),
    ),
  ),
  H5(
    { id: "hx4_hollow_fanfare", name: "Hollow Fanfare", description: "For your opponent's next 8 turns, any pawn they promote arrives as a walnut for 2 of their turns: crowned, celebrated, and unable to do more than shuffle.", flavor: "The trumpets were rented. The crown is a shell.", icon: "Trophy", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(8, (move, api) => {
      if (move.promotion) nutSting(api, move.to, 2);
    }),
  ),
  H5(
    { id: "hx4_beartrap_cache", name: "Beartrap Cache", description: "Hide traps on 2 empty squares you choose: the first enemy piece to stop on each is caught and frozen for 2 of their turns. Kings step over traps.", flavor: "The forest floor is patient.", icon: "Cross", fx: { motif: "blindfold" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.traps != null
          ? null
          : { kind: "square", label: `Hide a trap (${picks.length + 1}/2)`, squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)) },
      effect: (inst, _api, picks) => {
        if (inst.state.traps != null) return;
        inst.state.traps = picks.map((k) => k.square).filter((s): s is number => s != null);
      },
      onMovePlayed: (inst, move, api) => {
        const traps = inst.state.traps as Square[] | undefined;
        if (!traps?.length) return;
        if (move.color === api.opp && move.piece !== "k" && traps.includes(move.to)) {
          sting(api, move.to, 2, "beartrap");
          inst.state.traps = traps.filter((t) => t !== move.to);
          if ((inst.state.traps as Square[]).length === 0) inst.spent = true;
        }
      },
      status: (inst) => {
        const traps = inst.state.traps as Square[] | undefined;
        return traps == null ? "activate to hide the traps" : `${traps.length} trap(s) still set`;
      },
    },
  ),
  H5(
    { id: "hx4_ash_veil", name: "Ash Veil", description: "A veil of ash hides your minor pieces: your opponent cannot capture your knights or bishops for their next 3 turns.", flavor: "Strike the shadow, miss the shape.", icon: "CloudFog", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        if (c == null) return true;
        const t = api.board.pieces[c]?.type;
        return t !== "n" && t !== "b";
      }),
    ),
  ),
  H5(
    { id: "hx4_gilded_cage", name: "Gilded Cage", description: "For your opponent's next 3 turns, their queen may only move to squares on their own back two ranks. The palace doors are locked from outside.", flavor: "Every luxury except a key.", icon: "Lock", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "q" || relRank(api.opp, m.to) <= 2)),
  ),
  H5(
    { id: "hx4_summons_to_court", name: "Summons to Court", description: "On your opponent's next turn they may move only their king. The crown answers alone.", flavor: "The letter bore every seal but mercy.", icon: "ScrollText", fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] } },
    instant((_inst, api) => addEffect(api, { kind: "king_only", against: api.opp, turns: 1 })),
  ),
  H5(
    { id: "hx4_wagon_ruts", name: "Wagon Ruts", description: "For your opponent's next 5 turns, their rooks may only move along files, never sideways along ranks.", flavor: "The road decides where the wheels go.", icon: "TrainTrack", fx: { motif: "anchor", pieces: ["r"] } },
    curse(5, (moves) => moves.filter((m) => m.piece !== "r" || FILE(m.from) === FILE(m.to))),
  ),
  H5(
    { id: "hx4_paddock_fence", name: "Paddock Fence", description: "For your opponent's next 3 turns, their knights may not land in your half of the board.", flavor: "The gate is horse-high and grudge-deep.", icon: "Fence", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "n" || relRank(api.opp, m.to) <= 4)),
  ),
  H5(
    { id: "hx4_widows_veil", name: "Widow's Veil", description: "For your opponent's next 3 turns, their queen cannot capture anything. She is in mourning.", flavor: "Black lace, sheathed blade.", icon: "HeartCrack", fx: { motif: "muzzle", pieces: ["q"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || !m.captured)),
  ),
  H5(
    { id: "hx4_grasping_ivy", name: "Grasping Ivy", description: "Ivy coils around your king's court: for your opponent's next 4 turns, any piece of theirs that ends a move adjacent to your king is seized by vines and frozen for 1 of their turns.", flavor: "The garden defends the gardener.", icon: "Leaf", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      const k = myKing(api);
      if (k != null && move.piece !== "k" && cheb(move.to, k) <= 1) sting(api, move.to, 1, "vines");
    }),
  ),
  H5(
    { id: "hx4_paper_orders", name: "Paper Orders", description: "Your opponent's next 2 draft offers exclude draft manipulation cards. The couriers were paid to lose that satchel.", flavor: "Bureaucracy is the quietest siege engine.", icon: "FileX" },
    suppressDraftCards(2),
  ),
];
